from pathlib import Path
p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')
old="""  // Long straight jet-black hair with center part and shoulder-length sheets.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.218,18,12,0,Math.PI*2,0,Math.PI*.55), flat(0x030205));
  cap.scale.set(.90,.93,.91); cap.position.set(0,.132,.033); headBone.add(cap);
  const hg = new THREE.BoxGeometry(.028,1.22,.046);
"""
new="""  // Long straight jet-black hair with center part and shoulder-length sheets.
  const hg = new THREE.BoxGeometry(.028,1.22,.046);
"""
if old not in s: raise SystemExit('duplicate cap anchor missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
print('ARQ_DUPLICATE_CAP_REPAIR=APPLIED')
