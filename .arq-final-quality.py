from pathlib import Path

p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('missing anchor '+label)
    s=s.replace(old,new,1)

# Correct the existing original facial artwork onto the -Z/front of SphereGeometry.
rep("const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;",
    "const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.offset.x = -0.25; tex.anisotropy = 2; return tex;",
    'face texture mapping')

# Use the approved fallback literally: original Moria-like texture mapped to a true 3D head.
start=s.index("  // True 3D head: narrow oval/high cheekbone proportions closer to Moria than the stock mannequin.")
end=s.index("  // Long straight jet-black hair with center part and shoulder-length sheets.", start)
face=r'''  // True 3D head with an original painted Moria-like UV treatment.
  const faceTex = makeMoriaFaceTexture();
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, color: 0xffffff, toneMapped:false });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.205, 28, 22), faceMat);
  face.scale.set(.78,1.20,.82); face.position.set(0,.038,-.014); headBone.add(face);

  // A small real nose bridge/tip adds profile depth; identity does not depend on a 2D card.
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(.014,.062,4,7), flat(0xd28b80));
  bridge.rotation.x = Math.PI/2; bridge.position.set(0,-.002,-.194); headBone.add(bridge);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.023,10,7), flat(0xd58d82));
  tip.scale.set(.84,.68,.72); tip.position.set(0,-.036,-.212); headBone.add(tip);
  const beauty = new THREE.Mesh(new THREE.SphereGeometry(.0055,6,4), flat(0x251019)); beauty.position.set(.087,-.052,-.201); headBone.add(beauty);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.218,20,14,0,Math.PI*2,0,Math.PI*.54), flat(0x020204));
  cap.scale.set(.91,.91,.92); cap.position.set(0,.137,.035); headBone.add(cap);

'''
s=s[:start]+face+s[end:]

# More elegant body read: slightly narrower fitted dress and less tubular fur.
s=s.replace("new THREE.CylinderGeometry(0.265, 0.315, 1.02, 18)","new THREE.CylinderGeometry(0.245, 0.292, 1.04, 20)",1)
s=s.replace("const furGeo = new THREE.CapsuleGeometry(0.052, 0.13, 3, 6);","const furGeo = new THREE.CapsuleGeometry(0.044, 0.105, 3, 6);",1)

# Add side-facing facade helper; these are the walls actually seen while travelling north/south.
anchor="""function facadePlane(w:number,h:number,x:number,z:number,front:number,tex:THREE.Texture){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
  m.position.set(x,h/2,z+front*.03); if(front>0) m.rotation.y=Math.PI; return m;
}
"""
new_anchor=anchor+r'''function facadeSidePlane(d:number,h:number,x:number,z:number,tex:THREE.Texture){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(d,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide}));
  m.position.set(x,h/2,z); m.rotation.y=Math.PI/2; return m;
}
function makeNightSky(){
  const c=document.createElement('canvas');c.width=32;c.height=512;const g=c.getContext('2d')!;
  const q=g.createLinearGradient(0,0,0,512);q.addColorStop(0,'#090313');q.addColorStop(.48,'#160b2b');q.addColorStop(.82,'#34203f');q.addColorStop(1,'#7a3a55');g.fillStyle=q;g.fillRect(0,0,32,512);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
'''
rep(anchor,new_anchor,'facade side helper')

# Sky/horizon gives Buenos Aires a nocturnal city atmosphere rather than an empty purple void.
build_anchor="function buildBaires() {\n"
build_new=build_anchor+r'''  const sky=new THREE.Mesh(new THREE.SphereGeometry(165,24,14),new THREE.MeshBasicMaterial({map:makeNightSky(),side:THREE.BackSide,toneMapped:false})); sky.position.y=18; scene.add(sky);
'''
rep(build_anchor,build_new,'sky')

# Decorate the four inner street walls, which were blank slabs in the previous evidence.
facade_anchor="""  facadeSpecs.forEach(([x,z,w,h,f,tex])=>scene.add(facadePlane(w,h,x,z,f,tex)));
"""
side_facades=facade_anchor+r'''
  const sideFacades = [
    [-21.96,38,30,20,makeFacadeTexture('#3a2d43','#ffc970','#ff2697','TEATROS · CORRIENTES')],
    [9.96,38,30,20,makeFacadeTexture('#29374b','#8fc3ff','#42dcff','LIBROS · CAFÉ')],
    [-21.96,-29,34,22,makeFacadeTexture('#4b303b','#ffd28b','#ff4f73','PIZZERÍA · BAR')],
    [9.96,-29,34,22,makeFacadeTexture('#302d45','#9bbcff','#ffc93f','REVISTAS · 24H')],
  ] as const;
  sideFacades.forEach(([x,z,d,h,tex])=>scene.add(facadeSidePlane(d,h,x,z,tex)));

  // Side-facing neon/shop blades along the route.
  const blades=[
    ['GRAN REX',-21.6,45,'#ff2496'],['ÓPERA',9.6,34,'#50ddff'],['PIZZA',-21.6,27,'#ffd04c'],['LIBROS',9.6,48,'#79b9ff'],
    ['CAFÉ',-21.6,-18,'#ff9c63'],['KIOSCO',9.6,-38,'#5ee59c']
  ] as const;
  blades.forEach(([txt,x,z,a],i)=>{const b=label(txt,4.8,.82,'#100b15','#fff7df',a);b.position.set(x,4.4+(i%2)*1.2,z);b.rotation.y=Math.PI/2;scene.add(b)});
'''
rep(facade_anchor,side_facades,'side facades')

# Replace giant blank magenta poster slabs with varied theatre poster panels.
old="""  const posterTransforms: Array<{ p: THREE.Vector3; s: THREE.Vector3 }> = [];
  for (let x = -55; x <= 53; x += 12) posterTransforms.push({ p: new THREE.Vector3(x, 2.1, 18.54), s: new THREE.Vector3(1.7, 2.7, .05) });
  scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1), flat(0x9d145d), posterTransforms));
"""
new=r'''  const posterColors=[0x99164f,0x14577a,0x8b4b16];
  posterColors.forEach((color,ci)=>{
    const posterTransforms:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[];
    for(let x=-55+ci*4;x<=53;x+=12) posterTransforms.push({p:new THREE.Vector3(x,2.0,18.54),s:new THREE.Vector3(1.55,2.45,.05)});
    scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(color),posterTransforms));
  });
'''
rep(old,new,'poster variation')

p.write_text(s,encoding='utf-8')
print('ARQ_FINAL_LIKENESS_STREETSCAPE=APPLIED')
"}