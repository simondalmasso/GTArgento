from pathlib import Path

p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('missing anchor '+label)
    s=s.replace(old,new,1)

# Software/headless-friendly renderer without changing gameplay content.
rep("scene.fog = new THREE.Fog(0x170d2a, 66, 150);","scene.fog = null;",'fog')
rep("const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });","const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', precision: 'lowp', stencil: false });",'renderer')
rep("renderer.toneMapping = THREE.ACESFilmicToneMapping;\nrenderer.toneMappingExposure = 1.62;","renderer.toneMapping = THREE.NoToneMapping;\nrenderer.toneMappingExposure = 1;",'tone')
# MeshBasic ignores lights; don't maintain light objects in the production scene.
for old in [
"scene.add(new THREE.HemisphereLight(0x9d91c0, 0x221326, 1.8));",
"scene.add(key);",
"scene.add(corrientesGlow);",
"scene.add(coolGlow);",
]: s=s.replace(old,'')
rep("toneMapped: p.toneMapped !== false,","toneMapped: false,",'cheap tone')
rep("sprite.scale.setScalar(scale);","sprite.scale.setScalar(scale * 0.46);",'glow scale')

# Make the animated Moria recognizable with one true-3D textured head, long straight
# black hair, and an instanced shaggy fuchsia coat. This also collapses many draw calls.
a=s.index('function styleMoriaRig(root: THREE.Group) {')
b=s.index('\nfunction playMoria(',a)
new_style=r'''function styleMoriaRig(root: THREE.Group) {
  const bodysuit = flat(0xff1590);
  const jointAccent = flat(0xd51272);
  root.traverse(o => {
    if (o instanceof THREE.SkinnedMesh || o instanceof THREE.Mesh) {
      o.material = (o.name.endsWith('_2') || o.name === 'Mannequin_2') ? jointAccent : bodysuit;
      o.castShadow = false; o.receiveShadow = false;
    }
  });

  const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.39, 0.78, 14), flat(0xff0588));
  dress.position.set(0, 0.81, 0); dress.scale.z = 0.72; root.add(dress);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.272, 0.022, 6, 16), flat(0x210010));
  belt.rotation.x = Math.PI / 2; belt.position.y = 1.08; root.add(belt);

  // Fur coat/sleeves: many tufts in ONE instanced draw call, slimmer than the old shoulder blob.
  const furGeo = new THREE.CapsuleGeometry(0.075, 0.27, 3, 6);
  const fur = new THREE.InstancedMesh(furGeo, flat(0xff62b4), 12);
  const fd = new THREE.Object3D();
  const coat = [
    [-.34,1.31,0,.85,1.1,-.25],[-.22,1.38,.01,.9,1.0,-.12],[-.08,1.41,.02,.9,.9,-.04],
    [.08,1.41,.02,.9,.9,.04],[.22,1.38,.01,.9,1.0,.12],[.34,1.31,0,.85,1.1,.25],
    [-.43,1.20,.01,.82,1.45,-.30],[-.48,1.02,.01,.78,1.35,-.18],[-.48,.84,.02,.70,1.20,-.08],
    [.43,1.20,.01,.82,1.45,.30],[.48,1.02,.01,.78,1.35,.18],[.48,.84,.02,.70,1.20,.08]
  ] as const;
  coat.forEach(([x,y,z,sx,sy,rz],i)=>{ fd.position.set(x,y,z); fd.scale.set(sx,sy,.85); fd.rotation.set(0,0,rz); fd.updateMatrix(); fur.setMatrixAt(i,fd.matrix); });
  fur.instanceMatrix.needsUpdate=true; root.add(fur);

  const headBone = root.getObjectByName('Head');
  if (headBone) {
    // UV-painted original caricature on actual 3D geometry: high brows, smoky eyes,
    // long narrow nose, high cheekbones, fuchsia lips and beauty mark.
    const faceMat = new THREE.MeshBasicMaterial({ map: makeMoriaFaceTexture(), color: 0xffffff, toneMapped:false });
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.205, 20, 16), faceMat);
    face.scale.set(.80,1.18,.78); face.rotation.y=Math.PI/2; face.position.set(0,.035,-.018); headBone.add(face);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.218, 16, 10, 0, Math.PI*2, 0, Math.PI*.61), flat(0x050407));
    cap.scale.set(.94,1.08,.92); cap.position.set(0,.09,.02); headBone.add(cap);

    // Long, straight jet-black hair; 13 strips are a single instanced draw call.
    const hg = new THREE.BoxGeometry(.035,1.28,.055);
    const hair = new THREE.InstancedMesh(hg, flat(0x030305), 13);
    const hd = new THREE.Object3D();
    for(let i=0;i<13;i++){
      const u=(i-6)/6; const front=Math.abs(u)>.72;
      hd.position.set(u*.205,-.54,front ? -.015 : .105 + .035*(1-Math.abs(u)));
      hd.scale.set(front?1.3:1,1 + .10*(1-Math.abs(u)),1); hd.rotation.set(0,0,u*.025); hd.updateMatrix(); hair.setMatrixAt(i,hd.matrix);
    }
    hair.instanceMatrix.needsUpdate=true; headBone.add(hair);

    const ear = new THREE.InstancedMesh(new THREE.TorusGeometry(.038,.008,5,10), flat(0xf3cf66), 2);
    const ed=new THREE.Object3D(); [-1,1].forEach((side,i)=>{ed.position.set(side*.205,-.045,-.005);ed.rotation.set(0,Math.PI/2,0);ed.updateMatrix();ear.setMatrixAt(i,ed.matrix)}); ear.instanceMatrix.needsUpdate=true; headBone.add(ear);
  }
}
'''
s=s[:a]+new_style+s[b:]

# NPC rendering: keep FSM roots, but batch all six visible bodies/heads/props into four calls.
a=s.index('function createNPC(kind: NPCKind, x: number, z: number): NPC {')
b=s.index('\nfunction buildBaires()',a)
new_npc=r'''function createNPC(kind: NPCKind, x: number, z: number): NPC {
  const root = new THREE.Group(); root.position.set(x,0,z);
  return { root, kind, state:'WANDER', home:new THREE.Vector3(x,0,z), target:new THREE.Vector3(x,0,z), speed:kind==='paparazzi'?4.2:kind==='fan'?3:1.7, timer:Math.random()*2, knock:new THREE.Vector3() };
}
'''
s=s[:a]+new_npc+s[b:]

# Replace per-object traffic signals by four instanced calls.
old="""  for (const [x, z] of [[-16, -5], [3, 15], [3, -5]] as const) {\n    scene.add(meshBox(0.16, 4, 0.16, C.black, x, 2, z));\n    scene.add(meshBox(0.7, 1.8, 0.55, C.black, x, 4.25, z));\n    const r = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), hot(0xff1d45, 1.8)); r.position.set(x, 4.7, z - 0.29); scene.add(r);\n    const gr = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), hot(0x46ff93, 1.2)); gr.position.set(x, 3.92, z - 0.29); scene.add(gr);\n  }"""
new="""  const tl = [[-16,-5],[3,15],[3,-5]] as const;\n  const poles=tl.map(([x,z])=>({p:new THREE.Vector3(x,2,z),s:new THREE.Vector3(.16,4,.16)}));\n  const heads=tl.map(([x,z])=>({p:new THREE.Vector3(x,4.25,z),s:new THREE.Vector3(.7,1.8,.55)}));\n  const reds=tl.map(([x,z])=>({p:new THREE.Vector3(x,4.7,z-.29),s:new THREE.Vector3(.34,.34,.34)}));\n  const greens=tl.map(([x,z])=>({p:new THREE.Vector3(x,3.92,z-.29),s:new THREE.Vector3(.34,.34,.34)}));\n  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),C.black,poles));\n  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),C.black,heads));\n  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xff294b),reds));\n  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0x47f58d),greens));"""
rep(old,new,'traffic lights')

# Add low-cost but recognizable Buenos Aires street dressing via instancing.
anchor="  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1), flat(0xe7c8a1), bollards));"
dress=anchor+r'''
  const lane:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(let z=-56;z<56;z+=10) lane.push({p:new THREE.Vector3(-6,.035,z),s:new THREE.Vector3(.13,.025,3.6)}); scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xe9e1c9),lane));
  const awnings:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(const x of [-50,-28,21,44]) awnings.push({p:new THREE.Vector3(x,3.35,18.25),s:new THREE.Vector3(6.8,.14,1.1)}); scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0x98104f),awnings));
  const cornices:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(const x of [-50,-28,21,44]) { cornices.push({p:new THREE.Vector3(x,8.85,18.4),s:new THREE.Vector3(8.2,.18,.55)}); cornices.push({p:new THREE.Vector3(x,4.55,18.35),s:new THREE.Vector3(8.0,.12,.5)}); } scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xc6a2b7),cornices));
  const lamps:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(const x of [-52,-38,-24,-10,8,22,36,50]) lamps.push({p:new THREE.Vector3(x,2.2,13.9),s:new THREE.Vector3(.09,4.4,.09)}); scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0x25202a),lamps));
'''
rep(anchor,dress,'street dressing')

# Batch NPC visuals immediately after logical NPC creation.
anchor="""const npcs: NPC[] = [\n  createNPC('paparazzi', -10, 34), createNPC('paparazzi', -2, 7), createNPC('paparazzi', 31, -25),\n  createNPC('fan', -28, 10), createNPC('fan', 8, -22),\n  createNPC('neutral', 15, 10),\n];"""
insert=anchor+r'''
const npcBodyMat=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,toneMapped:false});
const npcBodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.28,1.18,3,6),npcBodyMat,npcs.length);
const npcHeads=new THREE.InstancedMesh(new THREE.SphereGeometry(.27,8,6),C.skin,npcs.length);
const paparazzi=npcs.filter(n=>n.kind==='paparazzi'), fans=npcs.filter(n=>n.kind==='fan');
const npcCameras=new THREE.InstancedMesh(new THREE.BoxGeometry(.4,.27,.23),C.black,paparazzi.length);
const npcPhones=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.28,.035),flat(0xcbd0db),fans.length);
scene.add(npcBodies,npcHeads,npcCameras,npcPhones);
const npcDummy=new THREE.Object3D();
function syncNPCVisuals(){
  let ci=0,fi=0;
  npcs.forEach((n,i)=>{
    const pos=n.root.position, rot=n.root.rotation.y;
    npcDummy.position.set(pos.x,1.05,pos.z);npcDummy.rotation.set(0,rot,0);npcDummy.scale.set(1,1,1);npcDummy.updateMatrix();npcBodies.setMatrixAt(i,npcDummy.matrix);
    npcBodies.setColorAt(i,new THREE.Color(n.kind==='paparazzi'?0x8d234d:n.kind==='fan'?0x197e9a:0x696570));
    npcDummy.position.set(pos.x,2.05,pos.z);npcDummy.rotation.set(0,rot,0);npcDummy.updateMatrix();npcHeads.setMatrixAt(i,npcDummy.matrix);
    if(n.kind==='paparazzi'){npcDummy.position.set(pos.x,1.72,pos.z-.34);npcDummy.rotation.set(0,rot,0);npcDummy.updateMatrix();npcCameras.setMatrixAt(ci++,npcDummy.matrix)}
    if(n.kind==='fan'){npcDummy.position.set(pos.x+.3,1.78,pos.z-.18);npcDummy.rotation.set(0,rot,-.16);npcDummy.updateMatrix();npcPhones.setMatrixAt(fi++,npcDummy.matrix)}
  });
  npcBodies.instanceMatrix.needsUpdate=true; npcHeads.instanceMatrix.needsUpdate=true; npcCameras.instanceMatrix.needsUpdate=true; npcPhones.instanceMatrix.needsUpdate=true;
  if(npcBodies.instanceColor) npcBodies.instanceColor.needsUpdate=true;
}
syncNPCVisuals();
'''
rep(anchor,insert,'npc instances')

rep("  if (entity >= 100) finish('fail'); updateHud();","  syncNPCVisuals();\n  if (entity >= 100) finish('fail'); updateHud();",'npc sync')
rep("  npcs.forEach((n, i) => { n.root.position.copy(n.home); n.state = 'WANDER'; n.timer = 0.5 + i * 0.1; n.knock.set(0, 0, 0); });","  npcs.forEach((n, i) => { n.root.position.copy(n.home); n.state = 'WANDER'; n.timer = 0.5 + i * 0.1; n.knock.set(0, 0, 0); }); syncNPCVisuals();",'reset sync')

# Conservative quality floor on real browsers; a slightly lower emergency tier is allowed by ORDER-001.
rep("let resolutionScale = isCoarse ? 0.62 : 0.68;","let resolutionScale = isCoarse ? 0.58 : 0.64;",'quality start')
rep("if (fpsAvg < 50 && resolutionScale > 0.40) { resolutionScale = Math.max(0.40, resolutionScale - 0.07);","if (fpsAvg < 50 && resolutionScale > 0.32) { resolutionScale = Math.max(0.32, resolutionScale - 0.06);",'quality floor')

p.write_text(s,encoding='utf-8')
print('ARQ_LIKENESS_BATCH_PATCH=APPLIED')
