import * as THREE from "three";
import type { PlayerId } from "../missions/MissionDirector";

export type SupportingPlayerId = Exclude<PlayerId, "moria">;

type Pivot = { group: THREE.Group };

const material = (color: number, roughness = 0.62, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  position: [number, number, number],
  scale?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(position[0], position[1], position[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function capsule(parent: THREE.Object3D, mat: THREE.Material, radius: number, length: number,
  position: [number, number, number], scale?: [number, number, number]) {
  return addMesh(parent, new THREE.CapsuleGeometry(radius, length, 4, 10), mat, position, scale);
}

export class StylizedAvatar {
  readonly root = new THREE.Group();
  speed = 0;
  private phase = 0;
  private specialTime = 0;
  private readonly leftLeg: Pivot;
  private readonly rightLeg: Pivot;
  private readonly leftArm: Pivot;
  private readonly rightArm: Pivot;

  constructor(readonly id: SupportingPlayerId) {
    this.root.name = "avatar-" + id;
    const skin = material(0xc99577, 0.72);
    const darkHair = material(id === "tini" ? 0x3a211e : 0x17141c, 0.82);
    const shirt = material(id === "franco" ? 0x147dba : id === "tini" ? 0xf52d9b : 0xe8dfd5, 0.48);
    const jacket = material(id === "franco" ? 0x1468a8 : id === "tini" ? 0xc31b78 : 0x20283b, 0.42);
    const trousers = material(id === "tini" ? 0x28243b : id === "franco" ? 0x172f4a : 0x20202a, 0.66);
    const shoes = material(id === "franco" ? 0xe8edf1 : 0x111016, 0.52);
    const metal = material(id === "franco" ? 0xe7edf4 : 0xd8c4a3, 0.28, 0.55);

    // Volumetric body and articulated limbs; no flat portrait/billboard.
    capsule(this.root, id === "tini" ? shirt : jacket, id === "tini" ? 0.18 : 0.22, 0.43, [0, 1.18, 0]);
    addMesh(this.root, new THREE.SphereGeometry(0.19, 16, 12),
      id === "tini" ? trousers : jacket, [0, 0.78, 0], [1.05, 0.8, 0.88]);

    this.leftLeg = { group: new THREE.Group() };
    this.rightLeg = { group: new THREE.Group() };
    this.leftLeg.group.position.set(-0.12, 0.72, 0);
    this.rightLeg.group.position.set(0.12, 0.72, 0);
    this.root.add(this.leftLeg.group, this.rightLeg.group);
    for (const p of [this.leftLeg, this.rightLeg]) {
      capsule(p.group, trousers, 0.085, 0.38, [0, -0.25, 0]);
      addMesh(p.group, new THREE.SphereGeometry(0.105, 12, 8), shoes, [0, -0.52, 0.09], [1, 0.55, 1.5]);
    }

    this.leftArm = { group: new THREE.Group() };
    this.rightArm = { group: new THREE.Group() };
    this.leftArm.group.position.set(-0.29, 1.39, 0);
    this.rightArm.group.position.set(0.29, 1.39, 0);
    this.root.add(this.leftArm.group, this.rightArm.group);
    for (const p of [this.leftArm, this.rightArm]) {
      capsule(p.group, jacket, 0.075, 0.34, [0, -0.2, 0]);
      addMesh(p.group, new THREE.SphereGeometry(0.075, 10, 8), skin, [0, -0.43, 0.02]);
    }

    if (id === "franco") {
      const helmet = material(0xf1f4f8, 0.25, 0.1);
      const visor = material(0x102c45, 0.16, 0.5);
      addMesh(this.root, new THREE.SphereGeometry(0.235, 18, 14), helmet, [0, 1.82, 0], [1.05, 1.12, 1]);
      addMesh(this.root, new THREE.SphereGeometry(0.17, 16, 10), visor, [0, 1.83, 0.16], [1.12, 0.48, 0.5]);
      addMesh(this.root, new THREE.BoxGeometry(0.07, 0.64, 0.025), metal, [-0.09, 1.2, 0.215]);
      addMesh(this.root, new THREE.BoxGeometry(0.07, 0.64, 0.025), metal, [0.09, 1.2, 0.215]);
    } else {
      addMesh(this.root, new THREE.SphereGeometry(0.205, 18, 14), skin, [0, 1.83, 0], [0.9, 1.06, 0.9]);
      addMesh(this.root, new THREE.SphereGeometry(0.025, 8, 6), darkHair, [-0.072, 1.86, 0.177]);
      addMesh(this.root, new THREE.SphereGeometry(0.025, 8, 6), darkHair, [0.072, 1.86, 0.177]);
      addMesh(this.root, new THREE.SphereGeometry(0.035, 8, 6), skin, [0, 1.79, 0.195], [0.8, 1, 0.8]);
      if (id === "facundo") {
        addMesh(this.root, new THREE.SphereGeometry(0.205, 16, 10), darkHair, [0, 1.98, -0.01], [1.02, 0.48, 0.96]);
        addMesh(this.root, new THREE.BoxGeometry(0.06, 0.26, 0.035), material(0x9e2239), [0, 1.2, 0.226]);
      } else {
        addMesh(this.root, new THREE.SphereGeometry(0.225, 16, 12), darkHair, [0, 1.96, -0.025], [1.08, 0.58, 1.05]);
        capsule(this.root, darkHair, 0.045, 0.58, [-0.17, 1.46, -0.09]);
        capsule(this.root, darkHair, 0.045, 0.58, [0.17, 1.46, -0.09]);
        addMesh(this.root, new THREE.TorusGeometry(0.055, 0.012, 6, 12), metal, [-0.22, 1.73, 0.02]);
        addMesh(this.root, new THREE.TorusGeometry(0.055, 0.012, 6, 12), metal, [0.22, 1.73, 0.02]);
        addMesh(this.root, new THREE.CylinderGeometry(0.22, 0.3, 0.24, 12), jacket, [0, 0.76, 0], [1, 1, 0.75]);
        addMesh(this.root, new THREE.BoxGeometry(0.22, 0.05, 0.05), metal, [0, 0.88, 0.19]);
      }
    }
  }

  update(dt: number, speed: number, side = 0) {
    this.speed = speed;
    this.phase += dt * (speed > 0.2 ? 8 : 1.8);
    this.specialTime = Math.max(0, this.specialTime - dt);
    const swing = speed > 0.2 ? Math.sin(this.phase) * Math.min(0.7, speed / 7) : 0;
    this.leftLeg.group.rotation.x = swing;
    this.rightLeg.group.rotation.x = -swing;
    this.leftArm.group.rotation.x = -swing * 0.65;
    this.rightArm.group.rotation.x = swing * 0.65;
    this.root.position.y = speed > 0.2 ? Math.abs(Math.sin(this.phase * 2)) * 0.035 : 0;
    this.root.rotation.z = Math.max(-0.12, Math.min(0.12, side * 0.08));
    if (this.specialTime > 0) {
      this.leftArm.group.rotation.x = -1.05;
      this.rightArm.group.rotation.x = -1.05;
      this.root.rotation.z = Math.sin(this.specialTime * 16) * 0.08;
    }
  }

  setSpecial() {
    this.specialTime = 0.65;
  }
}
