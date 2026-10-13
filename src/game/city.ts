import * as THREE from "three";
import { WORLD } from "./config";
import type { TexBag } from "./textures";

export type Blocker = { minX: number; maxX: number; minZ: number; maxZ: number };

export class City {
  root = new THREE.Group();
  blockers: Blocker[] = [];
  lamps: THREE.Object3D[] = [];

  constructor(tex: TexBag) {
    this.root.name = "Corrientes";
    this.build(tex);
  }

  private build(tex: TexBag) {
    const asphalt = new THREE.MeshStandardMaterial({
      map: tex.asphalt ?? null,
      color: tex.asphalt ? 0x8899aa : 0x1a1a1e,
      roughness: 0.28,
      metalness: 0.18,
    });
    if (tex.asphalt) {
      tex.asphalt.repeat.set(8, 28);
      tex.asphalt.wrapS = tex.asphalt.wrapT = THREE.RepeatWrapping;
    }
    const walkM = new THREE.MeshStandardMaterial({
      map: tex.sidewalk ?? null,
      color: 0x8a8680,
      roughness: 0.55,
      metalness: 0.05,
    });
    if (tex.sidewalk) {
      tex.sidewalk.repeat.set(6, 22);
      tex.sidewalk.wrapS = tex.sidewalk.wrapT = THREE.RepeatWrapping;
    }

    const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadHalf * 2, WORLD.streetLen + 40), asphalt);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -20;
    road.receiveShadow = true;
    this.root.add(road);

    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(6.4, WORLD.streetLen + 40), walkM);
      w.rotation.x = -Math.PI / 2;
      w.position.set(side * (WORLD.roadHalf + 3.2), 0.02, -20);
      w.receiveShadow = true;
      this.root.add(w);
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.12, WORLD.streetLen + 40),
        new THREE.MeshStandardMaterial({ color: 0x9a9590 }),
      );
      curb.position.set(side * WORLD.roadHalf, 0.06, -20);
      this.root.add(curb);
    }

    const lineM = new THREE.MeshBasicMaterial({ color: 0xc8c0a0 });
    for (let z = 70; z > -120; z -= 4.5) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.2), lineM);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.03, z);
      this.root.add(dash);
    }
    for (const x of [-WORLD.roadHalf + 0.3, WORLD.roadHalf - 0.3]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.08, WORLD.streetLen), lineM);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(x, 0.03, -20);
      this.root.add(edge);
    }

    const facades = [tex.apartments, tex.shop, tex.theater, tex.apartments, tex.shop].filter(Boolean) as THREE.Texture[];
    const fallbacks = [tex.fallbackA, tex.fallbackB, tex.fallbackC];
    let zi = 78;
    let n = 0;
    while (zi > -105) {
      const h = 14 + (n % 5) * 2.4;
      const d = 7 + (n % 3);
      const w = 9 + (n % 4) * 1.4;
      for (const side of [-1, 1]) {
        const isRex = side === 1 && zi < -50 && zi > -70;
        const texFront = isRex ? tex.theater ?? facades[0] : facades[n % facades.length] ?? fallbacks[n % 3];
        const b = this.building(w, isRex ? 18 : h, d, texFront, fallbacks[n % 3], isRex);
        b.position.set(side * WORLD.buildingX, 0, zi - w * 0.15);
        b.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
        this.root.add(b);
        this.blockers.push({
          minX: side * WORLD.buildingX - d * 0.55,
          maxX: side * WORLD.buildingX + d * 0.55,
          minZ: zi - w * 0.6,
          maxZ: zi + w * 0.35,
        });
        if (isRex) this.marquee(b, tex);
      }
      const lamp = this.lamp();
      lamp.position.set((n % 2 === 0 ? 1 : -1) * (WORLD.roadHalf + 1.1), 0, zi - 2);
      this.root.add(lamp);
      this.lamps.push(lamp);
      zi -= w + 1.2;
      n++;
    }

    this.root.add(this.obelisco());
    this.root.add(this.billboard(tex));
    this.root.add(this.planters());
    this.root.add(this.crosswalks());
    this.sky(tex);
  }

  private building(w: number, h: number, d: number, front?: THREE.Texture, sideT?: THREE.Texture, hero = false) {
    const g = new THREE.Group();
    const mats = [
      new THREE.MeshStandardMaterial({ map: sideT ?? null, color: 0x2a2622, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: sideT ?? null, color: 0x2a2622, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ map: front ?? null, color: front ? 0xffffff : 0x3a342e, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ map: sideT ?? null, color: 0x26221e, roughness: 0.7 }),
    ];
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.35, 0.28, d + 0.35),
      new THREE.MeshStandardMaterial({ color: 0xcfc3a8, roughness: 0.5 }),
    );
    cornice.position.y = h * 0.78;
    g.add(cornice);
    if (hero) {
      const awn = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.7, 0.12, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x7a0c18, roughness: 0.4 }),
      );
      awn.position.set(0, 3.2, d / 2 + 0.7);
      g.add(awn);
    }
    return g;
  }

  private marquee(parent: THREE.Group, tex: TexBag) {
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.4),
      new THREE.MeshStandardMaterial({
        map: tex.cultura ?? tex.granrex ?? null,
        emissive: new THREE.Color(0xffc978),
        emissiveIntensity: 0.55,
        color: 0xffffff,
      }),
    );
    board.position.set(0, 5.2, 3.7);
    parent.add(board);
    const rex = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 1.1),
      new THREE.MeshStandardMaterial({
        map: tex.granrex ?? null,
        emissive: new THREE.Color(0xffd27a),
        emissiveIntensity: 0.7,
      }),
    );
    rex.position.set(0, 7.2, 3.7);
    parent.add(rex);
  }

  private lamp() {
    const g = new THREE.Group();
    const iron = new THREE.MeshStandardMaterial({ color: 0x1a1814, roughness: 0.5, metalness: 0.6 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.6, 8), iron);
    pole.position.y = 2.3;
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), iron);
    arm.position.set(0, 4.5, 0.3);
    g.add(arm);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc878, emissiveIntensity: 2.4 }),
    );
    lamp.position.set(0, 4.35, 0.7);
    g.add(lamp);
    const light = new THREE.PointLight(0xffc07a, 2.1, 18, 1.7);
    light.position.copy(lamp.position);
    g.add(light);
    return g;
  }

  private obelisco() {
    const g = new THREE.Group();
    g.position.set(WORLD.obelisco.x, 0, WORLD.obelisco.z);
    const stone = new THREE.MeshStandardMaterial({
      color: 0xd8d4e8,
      emissive: 0xb0a4d8,
      emissiveIntensity: 0.22,
      roughness: 0.45,
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.7, 38, 4), stone);
    shaft.position.y = 20;
    shaft.rotation.y = Math.PI / 4;
    g.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.05, 4.2, 4), stone);
    tip.position.y = 41;
    tip.rotation.y = Math.PI / 4;
    g.add(tip);
    const glow = new THREE.PointLight(0xc8b6ff, 3.2, 48);
    glow.position.y = 22;
    g.add(glow);
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(11, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.4 }),
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.03;
    g.add(plaza);
    return g;
  }

  private billboard(tex: TexBag) {
    const g = new THREE.Group();
    g.position.set(-WORLD.roadHalf - 0.2, 8.4, 18);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 8.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x222 }),
    );
    pole.position.y = -4;
    g.add(pole);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 8.4),
      new THREE.MeshStandardMaterial({
        map: tex.billboard ?? tex.portrait ?? null,
        emissive: 0xff66cc,
        emissiveIntensity: 0.18,
        color: 0xffffff,
      }),
    );
    g.add(board);
    const neon = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.4),
      new THREE.MeshStandardMaterial({
        map: tex.diva ?? null,
        emissive: 0xff4ec8,
        emissiveIntensity: 0.8,
        color: 0xffffff,
      }),
    );
    neon.position.set(0, -2.8, 0.04);
    g.add(neon);
    return g;
  }

  private planters() {
    const g = new THREE.Group();
    const boxM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
    const leafM = new THREE.MeshStandardMaterial({ color: 0x1f4a28, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), boxM);
      box.position.y = 0.55;
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), leafM);
      bush.position.y = 1.35;
      bush.scale.set(1, 0.85, 1);
      p.add(box, bush);
      p.position.set(WORLD.roadHalf + 2.6, 0, 40 - i * 12);
      g.add(p);
    }
    return g;
  }

  private crosswalks() {
    const g = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({ color: 0xe8e0d0 });
    for (const z of [8, -40]) {
      for (let i = 0; i < 10; i++) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 3.2), m);
        s.rotation.x = -Math.PI / 2;
        s.position.set(-4.5 + i * 1.0, 0.035, z);
        g.add(s);
      }
    }
    return g;
  }

  private sky(tex: TexBag) {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(220, 24, 16),
      new THREE.MeshBasicMaterial({ map: tex.sky ?? null, color: tex.sky ? 0xffffff : 0x070814, side: THREE.BackSide }),
    );
    this.root.add(sky);
    const fogCol = new THREE.Color(0x070814);
    return fogCol;
  }

  collides(x: number, z: number, r = 0.4) {
    if (Math.abs(x) > WORLD.walkHalf + 0.4) return true;
    if (z > 82 || z < -128) return true;
    for (const b of this.blockers) {
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
    }
    return false;
  }
}
