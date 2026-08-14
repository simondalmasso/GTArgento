from pathlib import Path
p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')
old="const lane:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(let z=-56;z<56;z+=10) lane.push({p:new THREE.Vector3(-6,.035,z),s:new THREE.Vector3(.13,.025,3.6)}); scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xe9e1c9),lane));"
new="const laneDashes:Array<{p:THREE.Vector3;s:THREE.Vector3}>=[]; for(let z=-56;z<56;z+=10) laneDashes.push({p:new THREE.Vector3(-6,.035,z),s:new THREE.Vector3(.13,.025,3.6)}); scene.add(instancedBoxes(new THREE.BoxGeometry(1,1,1),flat(0xe9e1c9),laneDashes));"
if old not in s: raise SystemExit('lane patch anchor missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('ARQ_TYPECHECK_REPAIR=APPLIED')
