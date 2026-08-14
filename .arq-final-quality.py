from pathlib import Path

p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')

start=s.index('  // True facial volume: high cheekbones, long bridge, defined tip, lips and tapered chin.')
end=s.index('\n  const cap = new THREE.Mesh', start)
clean=r'''  // Minimal true-3D profile depth over the painted curved face; avoid cartoon overlays.
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(.012,.070,4,7), flat(0xd28b80));
  bridge.position.set(0,.006,-.203); bridge.scale.set(.9,1,.58); headBone.add(bridge);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.022,10,7), flat(0xd58d82));
  tip.scale.set(.82,.64,.72); tip.position.set(0,-.046,-.218); headBone.add(tip);
  const beauty = new THREE.Mesh(new THREE.SphereGeometry(.0048,6,4), flat(0x251019)); beauty.position.set(.086,-.052,-.205); headBone.add(beauty);
'''
s=s[:start]+clean+s[end:]

# The gap between the two front locks already provides the center part; no skin stripe needed.
line="  const partLine=new THREE.Mesh(new THREE.BoxGeometry(.010,.040,.010),flat(0xdf9d8f)); partLine.position.set(0,.194,-.181); partLine.rotation.x=.18; headBone.add(partLine);\n"
if line not in s: raise SystemExit('hair part anchor missing')
s=s.replace(line,'',1)

p.write_text(s,encoding='utf-8')
print('ARQ_FACE_OVERLAY_CLEANUP=APPLIED')
