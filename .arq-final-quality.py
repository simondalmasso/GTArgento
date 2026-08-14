from pathlib import Path

p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('missing anchor '+label)
    s=s.replace(old,new,1)

# Scale the painted facial artwork inward before it is mapped to the curved 3D shell.
old="""  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 2; return tex;
"""
new="""  const refined=document.createElement('canvas'); refined.width=1024; refined.height=1024; const rg=refined.getContext('2d')!;
  rg.fillStyle='#d99a8c'; rg.fillRect(0,0,1024,1024);
  rg.drawImage(c,0,0,1024,1024,143,36,738,936);
  const tex = new THREE.CanvasTexture(refined); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 2; return tex;
"""
rep(old,new,'refined face texture')

# Map that artwork only across the central ~120° of the true 3D front hemisphere.
rep(
  "const faceShellGeo = new THREE.SphereGeometry(0.209, 34, 22, Math.PI, Math.PI, 0.055, Math.PI - 0.11);",
  "const faceShellGeo = new THREE.SphereGeometry(0.210, 34, 22, Math.PI * 7 / 6, Math.PI * 2 / 3, 0.065, Math.PI - 0.13);",
  'narrow front shell'
)
rep("headBase.scale.set(.76,1.20,.82);","headBase.scale.set(.70,1.18,.82);",'narrow adult head')

# Center part and front side locks make the hair read long/straight instead of helmet-like.
hair_anchor="""  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.218,20,14,0,Math.PI*2,0,Math.PI*.54), flat(0x020204));
  cap.scale.set(.91,.91,.92); cap.position.set(0,.137,.035); headBone.add(cap);

  // Long straight jet-black hair with center part and shoulder-length sheets.
"""
hair_new="""  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.218,20,14,0,Math.PI*2,0,Math.PI*.54), flat(0x020204));
  cap.scale.set(.91,.91,.92); cap.position.set(0,.137,.035); headBone.add(cap);
  const partLine=new THREE.Mesh(new THREE.BoxGeometry(.012,.105,.012),flat(0xdf9d8f)); partLine.position.set(0,.176,-.174); partLine.rotation.x=.18; headBone.add(partLine);
  const frontLocks=new THREE.InstancedMesh(new THREE.BoxGeometry(.052,.76,.045),flat(0x020204),2); const ld=new THREE.Object3D();
  [-1,1].forEach((side,i)=>{ld.position.set(side*.176,-.205,-.105);ld.rotation.set(0,side*.06,side*.025);ld.scale.set(1,1,1);ld.updateMatrix();frontLocks.setMatrixAt(i,ld.matrix)}); frontLocks.instanceMatrix.needsUpdate=true; headBone.add(frontLocks);

  // Long straight jet-black hair with center part and shoulder-length sheets.
"""
rep(hair_anchor,hair_new,'center-part hair')

# Shorter fitted dress exposes the leg line; shaggy tapered coat tufts replace bead-like capsules.
rep("new THREE.CylinderGeometry(0.245, 0.292, 1.04, 20)","new THREE.CylinderGeometry(0.238, 0.285, 0.84, 20)",'short fitted dress')
rep("dress.position.set(0, 0.91, 0);","dress.position.set(0, 1.00, 0);",'dress placement')
rep("const furGeo = new THREE.CapsuleGeometry(0.044, 0.105, 3, 6);","const furGeo = new THREE.ConeGeometry(0.070, 0.22, 6);",'shaggy fur geometry')

p.write_text(s,encoding='utf-8')
print('ARQ_ADULT_FACE_SHAGGY_POLISH=APPLIED')
