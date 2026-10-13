import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CAM, MISSION, PLAYER, QUOTES, WORLD } from "./config";
import { Input } from "./input";
import { Mission } from "./mission";
import { Moria } from "./moria";
import { City } from "./city";
import { loadTextures } from "./textures";
import { GameAudio } from "./audio";
import { useHud } from "./store";
import { MissionDirector, LANDMARKS, ROSTER, type LandmarkId, type PlayerId } from "../missions/MissionDirector";
import { missionToWorld, worldToMission } from "./world-map";
import { StylizedAvatar } from "./characters";

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

type Npc = {
  g: THREE.Group;
  x: number;
  z: number;
  yaw: number;
  kind: "ped" | "papa";
  stunned: number;
  photoT: number;
};

export class QuienesSonGame {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.1, 280);
  composer: EffectComposer | null = null;
  input: Input;
  mission = new Mission();
  director = new MissionDirector();
  activePlayer: PlayerId = "moria";
  avatars = new Map<PlayerId, Moria | StylizedAvatar>();
  activeAvatar!: Moria | StylizedAvatar;
  objectiveMarker!: THREE.Group;
  audio = new GameAudio();
  city!: City;
  moria!: Moria;
  taxi!: THREE.Group;
  bus!: THREE.Group;
  npcs: Npc[] = [];
  wave: THREE.Mesh | null = null;
  clock = new THREE.Timer();
  yaw = 0;
  camYaw = 0;
  camPitch = 0.12;
  px = WORLD.spawn.x;
  pz = WORLD.spawn.z;
  inTaxi = false;
  taxiSpeed = 0;
  taxiYaw = 0;
  running = false;
  mobile = false;
  hudT = 0;
  stepT = 0;
  injectedSteer: number | null = null;
  private raf = 0;
  private lastW = 0;
  private lastH = 0;
  private lastVehicleCollision = false;
  private wasVehicleCollision = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.input = new Input(canvas.parentElement ?? canvas);
    this.scene.background = new THREE.Color(0x070814);
    this.scene.fog = new THREE.Fog(0x070814, 38, 160);
  }

  async init() {
    this.resize();
    const tex = await loadTextures();
    this.city = new City(tex);
    this.scene.add(this.city.root);
    this.moria = new Moria(tex);
    this.avatars.set("moria", this.moria);
    this.scene.add(this.moria.root);
    for (const id of ["facundo", "franco", "tini"] as const) {
      const avatar = new StylizedAvatar(id);
      this.avatars.set(id, avatar);
      avatar.root.visible = false;
      this.scene.add(avatar.root);
    }

    const hemi = new THREE.HemisphereLight(0x4a64a8, 0x1a120c, 0.55);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xc4d0ff, 0.35);
    moon.position.set(-20, 40, 10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.far = 80;
    this.scene.add(moon);
    const key = new THREE.SpotLight(0xffc07a, 18, 40, 0.5, 0.4);
    key.position.set(6, 7, 8);
    this.scene.add(key);

    this.taxi = this.makeTaxi();
    this.taxi.position.set(WORLD.taxi.x, 0, WORLD.taxi.z);
    this.taxiYaw = 0;
    this.scene.add(this.taxi);
    this.bus = this.makeBus();
    this.bus.position.set(-2.4, 0, 22);
    this.scene.add(this.bus);

    this.spawnNpcs();
    this.makeWave();
    this.objectiveMarker = this.makeObjectiveMarker();
    this.scene.add(this.objectiveMarker);

    const rp = new RenderPass(this.scene, this.camera);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(rp);
    const bloom = new UnrealBloomPass(new THREE.Vector2(this.lastW, this.lastH), 0.28, 0.7, 0.82);
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());

    this.selectPlayer("moria");
    this.wireProbe();
    await this.audio.load();
    useHud.getState().patch({ loaded: true, loadMsg: "" });
    this.clock.connect(document);
    this.clock.reset();
    this.loop();
  }

  start(player: PlayerId = this.activePlayer) {
    if (player !== this.activePlayer) this.selectPlayer(player);
    if (this.director.phase !== "BRIEFING") this.director.choose(this.activePlayer);
    this.director.start();
    this.audio.unlock();
    this.mission.start();
    this.mission.mode = "playing";
    this.running = true;
    if (!this.raf) {
      this.clock.connect(document);
      this.clock.reset();
      this.loop();
    }
  }

  restart() {
    this.director.choose(this.activePlayer);
    this.director.start();
    this.mission.restart();
    this.mission.mode = "playing";
    this.inTaxi = false;
    this.taxiSpeed = 0;
    const carPoint = missionToWorld(LANDMARKS[this.activePlayer === "franco" ? "F_CAR" : "V"]);
    this.taxi.position.set(carPoint.x, 0, carPoint.z);
    this.npcs.forEach((n) => (n.stunned = 0));
    for (const [id, avatar] of this.avatars) avatar.root.visible = id === this.activePlayer;
    this.resetPose();
    this.audio.setEngine(false);
    this.pushHud();
  }

  selectPlayer(player: PlayerId) {
    if (!this.avatars.has(player)) return;
    this.activePlayer = player;
    this.activeAvatar = this.avatars.get(player)!;
    this.director.choose(player);
    this.mission.mode = "intro";
    this.mission.entity = 0;
    this.mission.specialCd = 0;
    this.mission.stunnedUntil = 0;
    this.mission.money = 100;
    this.mission.clock = 21 * 3600 + 47 * 60;
    this.mission.quoteT = 0;
    this.mission.quoteI = 0;
    this.mission.subtitle = ROSTER[player].displayName + ": " + ROSTER[player].title;
    this.inTaxi = false;
    this.taxiSpeed = 0;
    this.taxiYaw = 0;
    const carPoint = missionToWorld(LANDMARKS[player === "franco" ? "F_CAR" : "V"]);
    this.taxi.position.set(carPoint.x, 0, carPoint.z);
    this.audio.setEngine(false);
    this.npcs.forEach((n) => (n.stunned = 0));
    this.wasVehicleCollision = false;
    for (const [id, avatar] of this.avatars) avatar.root.visible = id === player;
    this.resetPose();
    this.cameraFollow(1);
    this.pushHud();
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private resetPose() {
    const spawn = missionToWorld(ROSTER[this.activePlayer].spawn);
    this.px = spawn.x;
    this.pz = spawn.z;
    this.yaw = 0;
    this.camYaw = 0;
    this.camPitch = 0.12;
    this.activeAvatar.root.visible = true;
    this.placeMoria();
  }

  private placeMoria() {
    this.activeAvatar.root.position.set(this.px, 0, this.pz);
    this.activeAvatar.root.rotation.y = this.yaw;
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.clock.update();
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.resize();
    const a = this.input.sample();
    if (a.pause && this.mission.mode === "playing") {
      this.mission.mode = "paused";
      this.director.pause();
    } else if (a.pause && this.mission.mode === "paused") {
      this.mission.mode = "playing";
      this.director.pause();
    }

    if (this.mission.mode === "playing") this.simulate(dt, a);
    else if (this.mission.mode === "intro") this.activeAvatar.root.rotation.y += dt * 0.18;
    this.cameraFollow(dt);
    this.animateNpcs(dt);
    this.bus.position.z -= 5.5 * dt;
    if (this.bus.position.z < -130) this.bus.position.z = 80;

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);

    this.hudT += dt;
    if (this.hudT > 0.08) {
      this.hudT = 0;
      this.pushHud();
    }
  };

  private simulate(dt: number, a: ReturnType<Input["sample"]>) {
    this.camYaw -= a.lookX * (this.mobile ? CAM.touch : CAM.mouse);
    this.camPitch = Math.max(-0.15, Math.min(0.55, this.camPitch - a.lookY * (this.mobile ? CAM.touch : CAM.mouse)));
    this.lastVehicleCollision = false;

    const before = this.director.snapshot();
    const spec = ROSTER[this.activePlayer];
    const activeObjective = spec.objectives.find((o) => o.id === before.currentObjective);
    const nearTaxi = Math.hypot(this.px - this.taxi.position.x, this.pz - this.taxi.position.z) < MISSION.taxiRadius;
    if (a.interact && nearTaxi) {
      if (!this.inTaxi) {
        this.inTaxi = true;
        this.activeAvatar.root.visible = false;
        this.px = this.taxi.position.x;
        this.pz = this.taxi.position.z;
        this.taxiYaw = this.yaw;
        this.audio.play("ui");
        this.audio.setEngine(true, 0);
      } else {
        this.inTaxi = false;
        this.activeAvatar.root.visible = true;
        this.px = this.taxi.position.x + Math.cos(this.taxiYaw) * 1.6;
        this.pz = this.taxi.position.z + Math.sin(this.taxiYaw) * 1.6;
        this.audio.setEngine(false);
        this.audio.play("ui");
      }
    }

    if (this.inTaxi) this.drive(dt, a);
    else this.walk(dt, a);

    let paparazziPhotos = 0;
    if (this.mission.stunnedUntil <= 0) {
      for (const n of this.npcs) {
        if (n.kind !== "papa") continue;
        if (Math.hypot(n.x - this.px, n.z - this.pz) < 7.5) paparazziPhotos++;
      }
    }

    const target = activeObjective ? missionToWorld(LANDMARKS[activeObjective.targetId]) : null;
    const targetDistance = target ? Math.hypot(this.px - target.x, this.pz - target.z) : Infinity;
    const collectedTarget: LandmarkId | undefined =
      activeObjective?.requiresInteraction && a.interact && target && targetDistance <= activeObjective.radius
        ? activeObjective.targetId
        : undefined;
    const missionPosition = worldToMission(this.px, this.pz);
    this.mission.tick(dt, {
      photographing: false,
      distance: Number.isFinite(targetDistance) ? targetDistance : 0,
      quotes: this.activePlayer === "moria" ? QUOTES : [],
    });
    const collisionEvent = this.lastVehicleCollision && !this.wasVehicleCollision;
    this.wasVehicleCollision = this.lastVehicleCollision;
    this.director.tick(dt, {
      x: missionPosition[0],
      z: missionPosition[1],
      inVehicle: this.inTaxi,
      interacting: collectedTarget !== undefined,
      collectedTarget,
      paparazziPhotos,
      collisions: 0,
      collisionEvent,
      cameraSightings: paparazziPhotos,
      specialPressed: a.special,
      playerHasMoved: Math.hypot(a.moveX, a.moveY) > 0.1,
    });

    const snapshot = this.director.snapshot();
    this.mission.entity = snapshot.pressure / 100;
    this.mission.specialCd = snapshot.specialCooldown;
    for (const event of snapshot.events) {
      if (event.type === "special") {
        this.activeAvatar.setSpecial();
        this.mission.stunnedUntil = event.stunSeconds;
        this.mission.money += 50;
        this.mission.subtitle = spec.displayName + ": " + spec.abilityName;
        this.audio.play("special", 1, 0.7);
        this.shock(event.radius, event.stunSeconds);
      } else if (event.type === "objective-complete") {
        this.mission.subtitle = spec.displayName + ": " + this.objectiveFeedback(event.id);
      } else if (event.type === "won" && this.mission.mode !== "won") {
        this.mission.mode = "won";
        this.mission.subtitle = event.message;
        this.mission.money += 5000;
      } else if (event.type === "lost" && this.mission.mode !== "failed") {
        this.mission.mode = "failed";
        this.mission.subtitle = event.message;
      }
    }
    if (paparazziPhotos > 0 && this.mission.mode === "playing") {
      if (Math.random() < dt * 4) this.audio.play("camera", 0.9 + Math.random() * 0.2, 0.35);
    }
  }

  private objectiveFeedback(id: string) {
    const labels: Record<string, string> = {
      club: "Llegaste al boliche",
      kiosk: "Checkpoint: kiosco",
      crossing: "Checkpoint: Corrientes",
      shortcut: "Atajo completado",
      "deliver-vip-pass": "Pase VIP entregado",
      "enter-car": "Vehículo listo",
      "slalom-1": "Desvío 1 superado",
      "slalom-2": "Desvío 2 superado",
      "slalom-3": "Desvío 3 superado",
      "set-exit": "Llegada al punto seguro",
      contract: "Contrato ficticio recuperado",
      royalties: "Derechos ficticios recuperados",
      rights: "Archivo ficticio recuperado",
      escape: "Ruta de escape completada",
    };
    return labels[id] ?? "Objetivo completado";
  }

  private walk(dt: number, a: ReturnType<Input["sample"]>) {
    const fx = -Math.sin(this.camYaw);
    const fz = -Math.cos(this.camYaw);
    const rx = Math.cos(this.camYaw);
    const rz = -Math.sin(this.camYaw);
    let mx = fx * a.moveY + rx * a.moveX;
    let mz = fz * a.moveY + rz * a.moveX;
    const mag = Math.hypot(mx, mz);
    const speed = (a.run ? PLAYER.run : PLAYER.walk) * (mag > 0.05 ? 1 : 0);
    if (mag > 0.05) {
      mx /= mag;
      mz /= mag;
      const want = Math.atan2(-mx, -mz);
      let dy = want - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, PLAYER.turn * dt);
    }
    const nx = this.px + mx * speed * dt;
    const nz = this.pz + mz * speed * dt;
    if (!this.city.collides(nx, this.pz)) this.px = nx;
    if (!this.city.collides(this.px, nz)) this.pz = nz;
    this.placeMoria();
    this.activeAvatar.update(dt, speed * mag, mag > 0.05 ? a.moveX : 0);
    this.stepT += dt * (speed > 4 ? 2.4 : speed > 0.4 ? 1.6 : 0);
    if (speed > 0.4 && this.stepT > 0.36) {
      this.stepT = 0;
      this.audio.play("step", 0.9 + Math.random() * 0.2, 0.22);
    }
  }

  private drive(dt: number, a: ReturnType<Input["sample"]>) {
    let steer = 0;
    if (this.injectedSteer != null) steer = this.injectedSteer;
    else {
      if (a.moveX < -0.1) steer += 1;
      if (a.moveX > 0.1) steer -= 1;
    }
    const throttle = a.moveY;
    this.taxiSpeed += throttle * 14 * dt;
    this.taxiSpeed *= 1 - 1.6 * dt;
    if (Math.abs(this.taxiSpeed) < 0.05 && Math.abs(throttle) < 0.05) this.taxiSpeed = 0;
    const spf = Math.min(1, Math.abs(this.taxiSpeed) / 4);
    const rev = this.taxiSpeed >= 0 ? 1 : -1;
    this.taxiYaw += steer * 1.8 * spf * rev * dt;
    const fx = -Math.sin(this.taxiYaw);
    const fz = -Math.cos(this.taxiYaw);
    const nx = this.taxi.position.x + fx * this.taxiSpeed * dt;
    const nz = this.taxi.position.z + fz * this.taxiSpeed * dt;
    if (!this.city.collides(nx, nz, 1.3)) {
      this.taxi.position.x = nx;
      this.taxi.position.z = nz;
    } else {
      this.lastVehicleCollision = true;
      this.taxiSpeed *= -0.2;
    }
    this.taxi.rotation.y = this.taxiYaw;
    this.px = this.taxi.position.x;
    this.pz = this.taxi.position.z;
    this.yaw = this.taxiYaw;
    this.audio.setEngine(true, this.taxiSpeed);
  }

  private cameraFollow(dt: number) {
    const dist = this.inTaxi ? 7.2 : CAM.dist;
    const height = this.inTaxi ? 2.4 : CAM.height;
    const fx = -Math.sin(this.camYaw);
    const fz = -Math.cos(this.camYaw);
    const lookY = this.inTaxi ? 1.1 : CAM.lookY;
    const desired = new THREE.Vector3(
      this.px - fx * dist * Math.cos(this.camPitch),
      height + Math.sin(this.camPitch) * 2.2,
      this.pz - fz * dist * Math.cos(this.camPitch),
    );
    if (this.city.collides(desired.x, desired.z, 0.4)) {
      desired.x = this.px - fx * 2.2;
      desired.z = this.pz - fz * 2.2;
    }
    this.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    const look = new THREE.Vector3(this.px, lookY, this.pz);
    this.camera.lookAt(look);
  }

  private shock(radius = 7, stunSeconds = 1.6) {
    if (!this.wave) return;
    this.wave.visible = true;
    this.wave.scale.setScalar(0.2);
    (this.wave.material as THREE.MeshBasicMaterial).opacity = 0.8;
    this.wave.position.set(this.px, 0.1, this.pz);
    for (const n of this.npcs) {
      if (n.kind !== "papa") continue;
      const d = Math.hypot(n.x - this.px, n.z - this.pz);
      if (d < radius) {
        n.stunned = stunSeconds;
        const angle = Math.atan2(n.z - this.pz, n.x - this.px);
        n.x += Math.cos(angle) * 2;
        n.z += Math.sin(angle) * 2;
      }
    }
  }

  private animateNpcs(dt: number) {
    if (this.wave?.visible) {
      this.wave.scale.addScalar(dt * 9);
      const m = this.wave.material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, m.opacity - dt * 1.1);
      if (m.opacity <= 0) this.wave.visible = false;
    }
    for (const n of this.npcs) {
      n.stunned = Math.max(0, n.stunned - dt);
      if (n.stunned > 0) {
        n.g.rotation.z = Math.sin(n.stunned * 12) * 0.2;
      } else if (n.kind === "papa" && this.mission.mode === "playing") {
        const dx = this.px - n.x;
        const dz = this.pz - n.z;
        const d = Math.hypot(dx, dz) || 1;
        if (d < 18) {
          n.x += (dx / d) * 1.7 * dt;
          n.z += (dz / d) * 1.7 * dt;
          n.yaw = Math.atan2(-dx, -dz);
        }
      } else {
        n.z += -Math.cos(n.yaw) * 1.1 * dt;
        n.x += -Math.sin(n.yaw) * 0.05 * dt;
        if (n.z < -120) n.z = 70;
        if (n.z > 75) n.z = -100;
      }
      n.g.position.set(n.x, 0, n.z);
      n.g.rotation.y = n.yaw;
    }
  }

  private spawnNpcs() {
    const colors = [0x222831, 0x3a2a28, 0x1a1a22, 0x8a1a2a, 0x203040];
    for (let i = 0; i < 14; i++) {
      const kind: Npc["kind"] = i < 5 ? "papa" : "ped";
      const g = this.person(colors[i % colors.length], kind === "papa");
      const x = (i % 2 === 0 ? 1 : -1) * (WORLD.roadHalf + 2.4 + (i % 3) * 0.6);
      const z = 50 - i * 9;
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.npcs.push({ g, x, z, yaw: 0, kind, stunned: 0, photoT: 0 });
    }
  }

  private person(color: number, papa: boolean) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc49a78, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.7, 4, 8), mat);
    body.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin);
    head.position.y = 1.52;
    g.add(body, head);
    if (papa) {
      const cam = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.1, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x111, metalness: 0.6 }),
      );
      cam.position.set(0.16, 1.35, 0.16);
      g.add(cam);
    }
    return g;
  }

  private makeTaxi() {
    const g = new THREE.Group();
    g.name = "Taxi";
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.55, 4.1),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35, metalness: 0.4 }),
    );
    body.position.y = 0.55;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.45, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xffd000, roughness: 0.4 }),
    );
    roof.position.set(0, 1.05, -0.15);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.5, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.55 }),
    );
    cabin.position.set(0, 1.05, -0.15);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0xffc400, emissiveIntensity: 0.4 }),
    );
    sign.position.set(0, 1.38, -0.1);
    g.add(body, roof, cabin, sign);
    const tireM = new THREE.MeshStandardMaterial({ color: 0x111 });
    for (const p of [
      [-0.75, 0.28, 1.3],
      [0.75, 0.28, 1.3],
      [-0.75, 0.28, -1.3],
      [0.75, 0.28, -1.3],
    ]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10), tireM);
      w.rotation.z = Math.PI / 2;
      w.position.set(p[0], p[1], p[2]);
      g.add(w);
    }
    const lightM = new THREE.MeshStandardMaterial({ color: 0xffe9aa, emissive: 0xffd27a, emissiveIntensity: 1.5 });
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.08), lightM);
    hl.position.set(0.5, 0.55, 2.08);
    const hr = hl.clone();
    hr.position.x = -0.5;
    g.add(hl, hr);
    return g;
  }

  private makeBus() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.4, 9.2),
      new THREE.MeshStandardMaterial({ color: 0xb31b2c, roughness: 0.5 }),
    );
    body.position.y = 1.3;
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.42, 0.5, 9.22),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }),
    );
    stripe.position.y = 1.5;
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(2.36, 0.7, 8.4),
      new THREE.MeshStandardMaterial({ color: 0x223044, roughness: 0.2, metalness: 0.3 }),
    );
    win.position.y = 2.05;
    g.add(body, stripe, win);
    return g;
  }

  private makeObjectiveMarker() {
    const group = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.09, 3.6, 10),
      new THREE.MeshBasicMaterial({ color: 0xff4ec8, transparent: true, opacity: 0.36 }),
    );
    beam.position.y = 1.8;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.075, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffc4f1, transparent: true, opacity: 0.95 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.16;
    group.add(beam, ring);
    group.visible = false;
    return group;
  }

  private makeWave() {
    const m = new THREE.MeshBasicMaterial({ color: 0xff4ec8, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.7, 32), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    this.scene.add(mesh);
    this.wave = mesh;
  }

  private pushHud() {
    const director = this.director.snapshot();
    const spec = ROSTER[this.activePlayer];
    const objective = spec.objectives.find((o) => o.id === director.currentObjective);
    const target = objective ? missionToWorld(LANDMARKS[objective.targetId]) : null;
    const dist = target ? Math.hypot(this.px - target.x, this.pz - target.z) : 0;
    const nearTaxi = Math.hypot(this.px - this.taxi.position.x, this.pz - this.taxi.position.z) < MISSION.taxiRadius;
    if (target && this.mission.mode === "playing") {
      this.objectiveMarker.visible = true;
      this.objectiveMarker.position.set(target.x, 0.04 + Math.sin(performance.now() * 0.002) * 0.06, target.z);
      const ring = this.objectiveMarker.children[1];
      ring.rotation.y += 0.06;
    } else this.objectiveMarker.visible = false;
    const snap = this.mission.snapshot({
      distance: dist,
      inTaxi: this.inTaxi,
      canInteract: this.inTaxi || nearTaxi || Boolean(objective?.requiresInteraction && target && dist <= objective.radius),
    });
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.mobile = coarse || window.innerWidth < 820;
    this.camera.fov = this.mobile ? CAM.mobileFov : CAM.fov;
    this.camera.updateProjectionMatrix();
    const objectiveLabels: Record<string, string> = {
      club: "Llegá al boliche",
      kiosk: "Alcanzá el kiosco",
      crossing: "Cruzá Corrientes",
      shortcut: "Tomá el atajo",
      "deliver-vip-pass": "Entregá el pase VIP",
      "enter-car": "Subite al auto",
      "slalom-1": "Superá el desvío 1",
      "slalom-2": "Superá el desvío 2",
      "slalom-3": "Superá el desvío 3",
      "set-exit": "Llegá al punto seguro",
      contract: "Recuperá el contrato",
      royalties: "Recuperá los derechos",
      rights: "Recuperá el archivo",
      escape: "Llegá al punto seguro",
    };
    useHud.getState().patch({
      ...snap,
      selectedPlayer: this.activePlayer,
      characterName: spec.displayName,
      missionTitle: spec.title,
      missionObjective: objective ? objectiveLabels[objective.id] ?? objective.id : (director.phase === "WON" ? "Misión completada" : director.phase === "LOST" ? "Misión fallida" : "Preparando objetivo"),
      missionRemaining: director.remaining,
      objectiveX: target?.x ?? null,
      objectiveZ: target?.z ?? null,
      missionPhase: director.phase,
      missionWinText: spec.winText,
      missionFailText: spec.failText,
      isMobile: this.mobile,
      isPortrait: portrait,
      playerX: this.px,
      playerZ: this.pz,
      playerYaw: this.yaw,
    });
  }

  private wireProbe() {
    window.__controlsTest = {
      getYaw: () => (this.inTaxi ? this.taxiYaw : this.yaw),
      getSpeed: () => (this.inTaxi ? this.taxiSpeed : this.activeAvatar.speed),
      setSteer: (v) => {
        this.injectedSteer = v;
      },
      setKeys: (codes) => this.input.setKeys(codes),
    };
  }

  resize() {
    const p = this.canvas.parentElement;
    const w = p?.clientWidth || window.innerWidth;
    const h = p?.clientHeight || window.innerHeight;
    if (w === this.lastW && h === this.lastH) return;
    this.lastW = w;
    this.lastH = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.clock.dispose();
    this.input.dispose();
    this.renderer.dispose();
  }
}
