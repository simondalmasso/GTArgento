import * as THREE from "three";
import type { TexBag } from "./textures";

function lathe(pts: [number, number][], seg = 28) {
  const v = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(v, seg);
  g.computeVertexNormals();
  return g;
}

function sequinMat(tex?: THREE.Texture) {
  const m = new THREE.MeshPhysicalMaterial({
    map: tex ?? null,
    color: tex ? 0xff3355 : 0xe01040,
    roughness: 0.22,
    metalness: 0.42,
    sheen: 1,
    sheenColor: new THREE.Color(0xff78c8),
    sheenRoughness: 0.18,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.2,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      vec2 gs = floor(vUv * 92.0);
      float h = fract(sin(dot(gs, vec2(12.9898,78.233))) * 43758.5453);
      float spark = step(0.86, h) * pow(max(outgoingLight.r, 0.12), 1.4);
      outgoingLight += spark * vec3(1.0, 0.72, 0.88);
      #include <opaque_fragment>
      `,
    );
  };
  m.userData.needsUv = true;
  return m;
}

export class Moria {
  root = new THREE.Group();
  hip = new THREE.Group();
  spine = new THREE.Group();
  chest = new THREE.Group();
  neck = new THREE.Group();
  headG = new THREE.Group();
  lArm = new THREE.Group();
  rArm = new THREE.Group();
  lFore = new THREE.Group();
  rFore = new THREE.Group();
  hair: THREE.Object3D[] = [];
  feathers: THREE.Object3D[] = [];
  t = 0;
  specialT = 0;
  speed = 0;

  constructor(tex: TexBag) {
    this.root.name = "Moria";
    this.build(tex);
  }

  private build(tex: TexBag) {
    const skin = new THREE.MeshStandardMaterial({
      map: tex.face ?? tex.skin,
      color: tex.face ? 0xffffff : 0xc48a6a,
      roughness: 0.48,
      metalness: 0.04,
    });
    const skinPlain = new THREE.MeshStandardMaterial({
      color: 0xc08968,
      roughness: 0.5,
      metalness: 0.03,
    });
    const sequin = sequinMat(tex.sequin);
    const hairMat = new THREE.MeshStandardMaterial({
      map: tex.hair ?? null,
      color: 0x0a0708,
      roughness: 0.38,
      metalness: 0.08,
      side: THREE.DoubleSide,
      transparent: !!tex.hair,
      alphaTest: tex.hair ? 0.2 : 0,
      depthWrite: true,
    });
    const featherMat = new THREE.MeshStandardMaterial({
      map: tex.feather ?? null,
      color: 0xdc1238,
      roughness: 0.42,
      metalness: 0.08,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.12,
    });

    this.hip.position.y = 0.94;
    this.root.add(this.hip);
    this.spine.position.y = 0.16;
    this.hip.add(this.spine);
    this.chest.position.y = 0.22;
    this.spine.add(this.chest);
    this.neck.position.y = 0.28;
    this.chest.add(this.neck);
    this.headG.position.y = 0.16;
    this.neck.add(this.headG);

    const dress = new THREE.Mesh(
      lathe(
        [
          [0.01, -0.94],
          [0.28, -0.92],
          [0.24, -0.78],
          [0.18, -0.52],
          [0.2, -0.28],
          [0.3, -0.02],
          [0.34, 0.12],
          [0.27, 0.26],
          [0.32, 0.48],
          [0.29, 0.62],
          [0.22, 0.74],
        ],
        48,
      ),
      sequin,
    );
    dress.castShadow = true;
    this.hip.add(dress);

    const hips = new THREE.Mesh(lathe([[0.16, -0.02], [0.2, 0.08], [0.14, 0.2]], 20), skinPlain);
    this.hip.add(hips);

    this.lArm.position.set(0.22, 0.2, 0.02);
    this.rArm.position.set(-0.22, 0.2, 0.02);
    this.chest.add(this.lArm, this.rArm);
    const sleeveG = lathe([[0.055, 0], [0.05, -0.16], [0.042, -0.3]], 12);
    const sl = new THREE.Mesh(sleeveG, sequin);
    const sr = sl.clone();
    sl.rotation.z = 0.18;
    sr.rotation.z = -0.18;
    this.lArm.add(sl);
    this.rArm.add(sr);
    this.lFore.position.set(0.04, -0.3, 0);
    this.rFore.position.set(-0.04, -0.3, 0);
    this.lArm.add(this.lFore);
    this.rArm.add(this.rFore);
    const foreG = lathe([[0.042, 0], [0.036, -0.22], [0.03, -0.28]], 10);
    this.lFore.add(new THREE.Mesh(foreG, sequin));
    this.rFore.add(new THREE.Mesh(foreG.clone(), sequin));
    this.lFore.add(this.hand(skinPlain, 1));
    this.rFore.add(this.hand(skinPlain, -1));

    const head = this.makeHead(skin, skinPlain);
    this.headG.add(head);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.145, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
    cap.scale.set(1.02, 1.08, 1.05);
    cap.position.y = 0.04;
    this.headG.add(cap);

    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.042;
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.95), hairMat);
      card.position.set(x, -0.28, -0.1 - Math.abs(x) * 0.15);
      card.rotation.y = x * 1.1;
      card.rotation.x = 0.18;
      this.headG.add(card);
      this.hair.push(card);
    }
    const bangs = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), hairMat);
    bangs.position.set(0, 0.08, 0.12);
    bangs.rotation.x = -0.5;
    this.headG.add(bangs);
    const sideL = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.45), hairMat);
    sideL.position.set(0.12, -0.08, 0.04);
    sideL.rotation.y = 0.6;
    const sideR = sideL.clone();
    sideR.position.x = -0.12;
    sideR.rotation.y = -0.6;
    this.headG.add(sideL, sideR);

    for (let i = 0; i < 70; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.07 + Math.random() * 0.05, 0.22 + Math.random() * 0.12), featherMat);
      const side = i < 35 ? 1 : -1;
      const a = (i % 35) / 35;
      p.position.set(side * (0.16 + a * 0.08), 0.16 + Math.sin(a * 6) * 0.08, 0.02 + Math.cos(a * 8) * 0.08);
      p.rotation.set(Math.random() * 0.8 - 0.2, side * (0.6 + Math.random()), Math.random() * 0.8);
      this.chest.add(p);
      this.feathers.push(p);
    }

    const shoeM = new THREE.MeshStandardMaterial({ color: 0x6a0418, roughness: 0.35, metalness: 0.3 });
    const slShoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.2), shoeM);
    slShoe.position.set(0.08, 0.03, 0.04);
    const srShoe = slShoe.clone();
    srShoe.position.x = -0.08;
    this.root.add(slShoe, srShoe);
  }

  private makeHead(faceMat: THREE.Material, skin: THREE.Material) {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.132, 40, 32);
    geo.scale(0.86, 1.14, 0.9);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.y < -0.03 && v.z > 0) {
        v.x *= 0.78;
        v.z += 0.012;
      }
      if (v.y > 0.0 && v.y < 0.06 && Math.abs(v.x) > 0.04 && v.z > 0.02) {
        v.x *= 1.1;
        v.z += 0.01;
      }
      if (v.y > 0.04 && v.y < 0.09 && v.z > 0.05) v.z += 0.012;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const head = new THREE.Mesh(geo, faceMat);
    head.castShadow = true;
    g.add(head);

    const eyeW = new THREE.MeshStandardMaterial({ color: 0xf4efe8, roughness: 0.25 });
    const iris = new THREE.MeshStandardMaterial({ color: 0x3a2218, roughness: 0.2 });
    const pupil = new THREE.MeshStandardMaterial({ color: 0x090704, roughness: 0.15 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), eyeW);
      e.position.set(s * 0.042, 0.028, 0.1);
      e.scale.set(1, 0.85, 0.7);
      const ir = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), iris);
      ir.position.set(s * 0.042, 0.028, 0.112);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), pupil);
      pu.position.set(s * 0.042, 0.028, 0.118);
      const lid = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1a0c10 }));
      lid.position.set(s * 0.042, 0.038, 0.108);
      lid.rotation.x = 2.2;
      g.add(e, ir, pu, lid);
    }
    const nose = new THREE.Mesh(lathe([[0.002, 0], [0.016, 0.01], [0.012, 0.04], [0.004, 0.055]], 8), skin);
    nose.rotation.x = Math.PI;
    nose.position.set(0, 0.01, 0.11);
    g.add(nose);
    const lipM = new THREE.MeshStandardMaterial({ color: 0xa41e3a, roughness: 0.32, metalness: 0.08 });
    const up = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 8, 12, Math.PI), lipM);
    up.position.set(0, -0.018, 0.112);
    up.rotation.set(0.4, 0, Math.PI);
    up.scale.set(1, 0.55, 1);
    const lo = up.clone();
    lo.position.y = -0.03;
    lo.rotation.x = -0.2;
    g.add(up, lo);
    const earG = new THREE.SphereGeometry(0.022, 8, 8);
    const el = new THREE.Mesh(earG, skin);
    el.position.set(0.115, 0.01, 0.01);
    el.scale.set(0.45, 1, 0.7);
    const er = el.clone();
    er.position.x = -0.115;
    g.add(el, er);
    return g;
  }

  private hand(mat: THREE.Material, side: number) {
    const g = new THREE.Group();
    g.position.set(side * 0.01, -0.28, 0);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.025), mat);
    g.add(palm);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.045, 0.012), mat);
      f.position.set((i - 1.5) * 0.012, -0.05, 0);
      g.add(f);
    }
    return g;
  }

  setSpecial() {
    this.specialT = 1.15;
  }

  update(dt: number, speed: number, turning: number) {
    this.t += dt;
    this.speed = speed;
    const walk = Math.min(1, speed / 2.4);
    const cadence = this.t * (6 + walk * 6);
    this.hip.position.y = 0.94 + Math.abs(Math.sin(cadence)) * 0.03 * walk;
    this.hip.rotation.z = Math.sin(cadence) * 0.045 * walk;
    this.spine.rotation.y = turning * 0.15;
    this.chest.rotation.x = -0.04 + Math.sin(cadence * 0.5) * 0.02 * walk;
    this.lArm.rotation.x = Math.sin(cadence) * 0.55 * walk;
    this.rArm.rotation.x = -Math.sin(cadence) * 0.55 * walk;
    this.lFore.rotation.x = 0.2 * walk;
    this.rFore.rotation.x = 0.2 * walk;
    this.headG.rotation.y = turning * 0.2;
    for (let i = 0; i < this.hair.length; i++) {
      const h = this.hair[i];
      h.rotation.x = 0.18 + Math.sin(cadence + i) * 0.05 * walk;
    }
    for (let i = 0; i < this.feathers.length; i++) {
      this.feathers[i].rotation.z += Math.sin(this.t * 3 + i) * 0.002;
    }
    if (this.specialT > 0) {
      this.specialT -= dt;
      const k = Math.sin((1.15 - this.specialT) * 4.2);
      this.lArm.rotation.z = -1.2 * k;
      this.rArm.rotation.z = 1.2 * k;
      this.lArm.rotation.x = -0.4;
      this.rArm.rotation.x = -0.4;
      this.headG.rotation.x = -0.15;
      this.chest.rotation.x = 0.12;
    }
  }
}
