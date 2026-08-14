from pathlib import Path

p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('missing anchor '+label)
    s=s.replace(old,new,1)

# Replace the stylized eye-heavy canvas with an adult stage-makeup portrait treatment.
a=s.index('function makeMoriaFaceTexture() {')
b=s.index('\nfunction createMoria()',a)
face_fn=r'''function makeMoriaFaceTexture() {
  const c=document.createElement('canvas'); c.width=1024; c.height=1024; const g=c.getContext('2d')!;
  const skin=g.createRadialGradient(512,430,90,512,500,590); skin.addColorStop(0,'#efb5a5');skin.addColorStop(.58,'#d99a8d');skin.addColorStop(1,'#aa6668');g.fillStyle=skin;g.fillRect(0,0,1024,1024);

  // Mature oval contour / high cheekbones.
  const side=g.createLinearGradient(0,0,1024,0);side.addColorStop(0,'rgba(71,20,41,.32)');side.addColorStop(.18,'rgba(110,48,60,.08)');side.addColorStop(.5,'rgba(255,226,209,.10)');side.addColorStop(.82,'rgba(110,48,60,.08)');side.addColorStop(1,'rgba(71,20,41,.32)');g.fillStyle=side;g.fillRect(0,0,1024,1024);
  for(const [cx,rot] of [[330,-.16],[694,.16]] as const){g.fillStyle='rgba(122,38,65,.16)';g.beginPath();g.ellipse(cx,575,118,57,rot,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,211,196,.27)';g.beginPath();g.ellipse(cx,557,78,29,rot,0,Math.PI*2);g.fill();}

  const eye=(cx:number,sideSign:number)=>{
    const smoke=g.createRadialGradient(cx,405,10,cx,405,105);smoke.addColorStop(0,'rgba(34,13,31,.78)');smoke.addColorStop(.55,'rgba(79,22,66,.44)');smoke.addColorStop(1,'rgba(89,20,69,0)');g.fillStyle=smoke;g.beginPath();g.ellipse(cx,408,113,49,0,0,Math.PI*2);g.fill();
    g.fillStyle='#fff3ef';g.beginPath();g.moveTo(cx-66,420);g.quadraticCurveTo(cx,384,cx+69,418);g.quadraticCurveTo(cx,444,cx-66,420);g.fill();
    g.fillStyle='#6a4330';g.beginPath();g.ellipse(cx,417,18,20,0,0,Math.PI*2);g.fill();g.fillStyle='#100b0d';g.beginPath();g.arc(cx,417,10,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(cx-5,410,4,0,Math.PI*2);g.fill();
    g.strokeStyle='#160914';g.lineWidth=13;g.lineCap='round';g.beginPath();g.moveTo(cx-70,419);g.quadraticCurveTo(cx,379,cx+75,416);g.stroke();g.lineWidth=7;g.beginPath();g.moveTo(cx+sideSign*57,402);g.lineTo(cx+sideSign*100,386);g.stroke();
    g.lineWidth=4;for(let i=-2;i<=2;i++){const x=cx+i*22;g.beginPath();g.moveTo(x,388);g.lineTo(x+i*2,369-Math.abs(i)*2);g.stroke();}
  };
  eye(348,-1);eye(676,1);

  // High arched dark brows.
  g.strokeStyle='#34131f';g.lineWidth=19;g.lineCap='round';g.beginPath();g.moveTo(270,326);g.quadraticCurveTo(350,270,435,317);g.stroke();g.beginPath();g.moveTo(589,317);g.quadraticCurveTo(674,270,754,326);g.stroke();

  // Long narrow nose: side shadows, central highlight, defined nostrils.
  const noseShade=g.createLinearGradient(430,0,594,0);noseShade.addColorStop(0,'rgba(104,43,53,.28)');noseShade.addColorStop(.35,'rgba(151,77,72,.07)');noseShade.addColorStop(.5,'rgba(255,224,207,.32)');noseShade.addColorStop(.65,'rgba(151,77,72,.07)');noseShade.addColorStop(1,'rgba(104,43,53,.28)');g.fillStyle=noseShade;g.beginPath();g.moveTo(464,448);g.quadraticCurveTo(452,620,488,678);g.quadraticCurveTo(512,700,536,678);g.quadraticCurveTo(572,620,560,448);g.closePath();g.fill();
  g.fillStyle='rgba(75,31,39,.48)';g.beginPath();g.ellipse(481,681,15,7,-.15,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(543,681,15,7,.15,0,Math.PI*2);g.fill();

  // Wide glamorous mouth / pronounced cupid's bow.
  g.fillStyle='#9d004e';g.beginPath();g.moveTo(365,758);g.quadraticCurveTo(438,706,512,742);g.quadraticCurveTo(586,706,659,758);g.quadraticCurveTo(586,790,512,783);g.quadraticCurveTo(438,790,365,758);g.fill();
  g.fillStyle='#ef438e';g.beginPath();g.moveTo(378,766);g.quadraticCurveTo(448,748,512,770);g.quadraticCurveTo(576,748,646,766);g.quadraticCurveTo(578,831,512,825);g.quadraticCurveTo(446,831,378,766);g.fill();
  g.strokeStyle='rgba(68,21,36,.46)';g.lineWidth=5;g.beginPath();g.moveTo(390,764);g.quadraticCurveTo(512,784,634,764);g.stroke();

  // Smile lines, forehead/nose highlight, beauty mark.
  g.strokeStyle='rgba(116,55,62,.18)';g.lineWidth=7;g.beginPath();g.moveTo(405,660);g.quadraticCurveTo(382,712,397,744);g.stroke();g.beginPath();g.moveTo(619,660);g.quadraticCurveTo(642,712,627,744);g.stroke();
  g.fillStyle='rgba(255,235,218,.24)';g.beginPath();g.ellipse(512,285,42,94,0,0,Math.PI*2);g.fill();
  g.fillStyle='#28101b';g.beginPath();g.arc(685,724,7,0,Math.PI*2);g.fill();

  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.ClampToEdgeWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;tex.anisotropy=2;return tex;
}
'''
s=s[:a]+face_fn+s[b:]

# Slightly broader adult head after the previous over-narrowing.
rep("headBase.scale.set(.70,1.18,.82);","headBase.scale.set(.74,1.16,.82);",'adult head width')

# Replace the old tiny depth-only nose with visible vertical bridge + tip and add 3D cheek/lip/chin structure.
old_geo="""  // A small real nose bridge/tip adds profile depth; identity does not depend on a 2D card.
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(.014,.062,4,7), flat(0xd28b80));
  bridge.rotation.x = Math.PI/2; bridge.position.set(0,-.002,-.194); headBone.add(bridge);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.023,10,7), flat(0xd58d82));
  tip.scale.set(.84,.68,.72); tip.position.set(0,-.036,-.212); headBone.add(tip);
  const beauty = new THREE.Mesh(new THREE.SphereGeometry(.0055,6,4), flat(0x251019)); beauty.position.set(.087,-.052,-.201); headBone.add(beauty);
"""
new_geo="""  // True facial volume: high cheekbones, long bridge, defined tip, lips and tapered chin.
  const cheekGeo=new THREE.SphereGeometry(.040,10,7); const cheeks=new THREE.InstancedMesh(cheekGeo,flat(0xe8a294),2); const cd=new THREE.Object3D();
  [-1,1].forEach((side,i)=>{cd.position.set(side*.105,-.010,-.176);cd.scale.set(1.15,.55,.38);cd.updateMatrix();cheeks.setMatrixAt(i,cd.matrix)});cheeks.instanceMatrix.needsUpdate=true;headBone.add(cheeks);
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(.014,.075,4,7), flat(0xd28b80)); bridge.position.set(0,.005,-.202); bridge.scale.z=.72; headBone.add(bridge);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.027,10,7), flat(0xd58d82)); tip.scale.set(.86,.68,.76); tip.position.set(0,-.047,-.220); headBone.add(tip);
  const upperLip=new THREE.Mesh(new THREE.SphereGeometry(.032,10,7),flat(0xa60055));upperLip.scale.set(1.62,.25,.23);upperLip.position.set(0,-.098,-.207);headBone.add(upperLip);
  const lowerLip=new THREE.Mesh(new THREE.SphereGeometry(.034,10,7),flat(0xf04491));lowerLip.scale.set(1.68,.28,.23);lowerLip.position.set(0,-.116,-.205);headBone.add(lowerLip);
  const chin=new THREE.Mesh(new THREE.SphereGeometry(.034,10,7),flat(0xda9488));chin.scale.set(1.25,.66,.52);chin.position.set(0,-.174,-.164);headBone.add(chin);
  const beauty = new THREE.Mesh(new THREE.SphereGeometry(.0055,6,4), flat(0x251019)); beauty.position.set(.087,-.052,-.205); headBone.add(beauty);
"""
rep(old_geo,new_geo,'3D adult face volume')

# Fix the center part: subtle short skin line only at the hairline, not a forehead stripe.
rep("new THREE.BoxGeometry(.012,.105,.012)","new THREE.BoxGeometry(.010,.040,.010)",'short hair part')
rep("partLine.position.set(0,.176,-.174);","partLine.position.set(0,.194,-.181);",'hair part position')

p.write_text(s,encoding='utf-8')
print('ARQ_FINAL_ADULT_LIKENESS=APPLIED')
