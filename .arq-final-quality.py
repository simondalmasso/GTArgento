from pathlib import Path

p = Path('src/game.ts')
s = p.read_text(encoding='utf-8')

def rep(old: str, new: str, label: str):
    global s
    if old not in s:
        raise SystemExit(f'missing anchor: {label}')
    s = s.replace(old, new, 1)

# The face artwork must map once across the curved FRONT of the 3D head, not wrap 360°.
rep(
    "const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.offset.x = -0.25; tex.anisotropy = 2; return tex;",
    "const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 2; return tex;",
    'face texture wrap',
)

old_face = '''  // True 3D head with an original painted Moria-like UV treatment.\n  const faceTex = makeMoriaFaceTexture();\n  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, color: 0xffffff, toneMapped:false });\n  const face = new THREE.Mesh(new THREE.SphereGeometry(0.205, 28, 22), faceMat);\n  face.scale.set(.78,1.20,.82); face.position.set(0,.038,-.014); headBone.add(face);\n\n  // A small real nose bridge/tip adds profile depth; identity does not depend on a 2D card.\n'''
new_face = '''  // True 3D head plus a CURVED front-hemisphere facial shell. The full original\n  // painted face maps once across -Z/front, so eyes/nose/lips keep their proportions.\n  const headBase = new THREE.Mesh(new THREE.SphereGeometry(0.205, 28, 22), flat(0xdf9d8f));\n  headBase.scale.set(.76,1.20,.82); headBase.position.set(0,.038,-.014); headBone.add(headBase);\n  const faceTex = makeMoriaFaceTexture();\n  const faceShellGeo = new THREE.SphereGeometry(0.209, 34, 22, Math.PI, Math.PI, 0.055, Math.PI - 0.11);\n  const faceShell = new THREE.Mesh(faceShellGeo, new THREE.MeshBasicMaterial({ map: faceTex, color:0xffffff, toneMapped:false }));\n  faceShell.scale.copy(headBase.scale); faceShell.position.copy(headBase.position); headBone.add(faceShell);\n\n  // A small real nose bridge/tip adds profile depth; identity does not depend on a 2D card.\n'''
rep(old_face, new_face, 'front hemisphere face')

# Narrow the stock rig subtly in production so the silhouette reads glam/fitted rather than broad mannequin.
rep(
    "  root.scale.setScalar(scale);\n  root.updateMatrixWorld(true);",
    "  if (BASE_PREVIEW) root.scale.setScalar(scale); else root.scale.set(scale * .86, scale, scale * .91);\n  root.updateMatrixWorld(true);",
    'production rig proportions',
)

# Facade planes should face the avenue; never render shop text from the mirrored back side.
old_side = '''function facadeSidePlane(d:number,h:number,x:number,z:number,tex:THREE.Texture){\n  const m=new THREE.Mesh(new THREE.PlaneGeometry(d,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide}));\n  m.position.set(x,h/2,z); m.rotation.y=Math.PI/2; return m;\n}\n'''
new_side = '''function facadeSidePlane(d:number,h:number,x:number,z:number,tex:THREE.Texture){\n  const m=new THREE.Mesh(new THREE.PlaneGeometry(d,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.FrontSide}));\n  m.position.set(x,h/2,z); m.rotation.y=x < 0 ? Math.PI/2 : -Math.PI/2; return m;\n}\n'''
rep(old_side, new_side, 'side facade orientation')

rep(
    "blades.forEach(([txt,x,z,a],i)=>{const b=label(txt,4.8,.82,'#100b15','#fff7df',a);b.position.set(x,4.4+(i%2)*1.2,z);b.rotation.y=Math.PI/2;scene.add(b)});",
    "blades.forEach(([txt,x,z,a],i)=>{const b=label(txt,4.8,.82,'#100b15','#fff7df',a);b.position.set(x,4.4+(i%2)*1.2,z);b.rotation.y=x < 0 ? Math.PI/2 : -Math.PI/2;scene.add(b)});",
    'blade sign orientation',
)

# Final source should not carry the old probe trigger artifact.
Path('.probe-trigger').unlink(missing_ok=True)
p.write_text(s, encoding='utf-8')
print('ARQ_CURVED_FACE_SIGNAGE_FIX=APPLIED')
