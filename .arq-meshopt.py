from pathlib import Path
p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')
old="import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\nimport RAPIER"
new="import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\nimport { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';\nimport RAPIER"
assert old in s
s=s.replace(old,new,1)
old="  new GLTFLoader().load('/assets/moria-base.glb', gltf => {"
new="  const previewLoader = new GLTFLoader();\n  previewLoader.setMeshoptDecoder(MeshoptDecoder);\n  previewLoader.load('/assets/moria-base.glb', gltf => {"
assert old in s
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('meshopt decoder wired')
