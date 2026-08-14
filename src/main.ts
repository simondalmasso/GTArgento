import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import './style.css';

type Vec2 = { x: number; y: number };
type NPCKind = 'paparazzi' | 'fan' | 'neutral';
type NPCState = 'WANDER' | 'NOTICE' | 'CHASE' | 'PHOTO' | 'STAGGER' | 'FLEE' | 'RECOVER';
interface NPC { group: THREE.Group; kind: NPCKind; state: NPCState; home: THREE.Vector3; target: THREE.Vector3; speed: number; timer: number; knock: THREE.Vector3; }
interface Obstacle { minX: number; maxX: number; minZ: number; maxZ: number; }
interface Shockwave { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; age: number; }

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const intro = document.querySelector<HTMLElement>('#intro')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const result = document.querySelector<HTMLElement>('#result')!;
const startBtn = document.querySelector<HTMLButtonElement>('#startBtn')!;
const restartBtn = document.querySelector<HTMLButtonElement>('#restartBtn')!;
const entityFill = document.querySelector<HTMLElement>('#entityFill')!;
const entityValue = document.querySelector<HTMLElement>('#entityValue')!;
const specialText = document.querySelector<HTMLElement>('#specialText')!;
const vehicleHint = document.querySelector<HTMLElement>('#vehicleHint')!;
const objective = document.querySelector<HTMLElement>('#objective')!;
const flash = document.querySelector<HTMLElement>('#flash')!;
const touch = document.querySelector<HTMLElement>('#touch')!;
const stick = document.querySelector<HTMLElement>('#stick')!;
const stickKnob = document.querySelector<HTMLElement>('#stickKnob')!;
const lookZone = document.querySelector<HTMLElement>('#lookZone')!;
const qBtn = document.querySelector<HTMLButtonElement>('#qBtn')!;
const runBtn = document.querySelector<HTMLButtonElement>('#runBtn')!;
const actionBtn = document.querySelector<HTMLButtonElement>('#actionBtn')!;
const qCooldown = document.querySelector<HTMLElement>('#qCooldown')!;
const orientation = document.querySelector<HTMLElement>('#orientation')!;
const perfEl = document.querySelector<HTMLElement>('#perf')!;
const resultTitle = document.querySelector<HTMLElement>('#resultTitle')!;
const resultKicker = document.querySelector<HTMLElement>('#resultKicker')!;
const resultScore = document.querySelector<HTMLElement>('#resultScore')!;

const PERF_MODE = new URLSearchParams(location.search).has('perf');
const isCoarse = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
if (PERF_MODE) perfEl.classList.remove('hidden');

await RAPIER.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080611);
scene.fog = new THREE.FogExp2(0x100a1c, 0.0125);
const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.1, 240);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const hemi = new THREE.HemisphereLight(0x7d6fa8, 0x20152e, 1.45);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xffd8ee, 2.1);
moon.position.set(-24, 38, 16);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -70; moon.shadow.camera.right = 70; moon.shadow.camera.top = 70; moon.shadow.camera.bottom = -70;
scene.add(moon);
const magentaFill = new THREE.PointLight(0xff147f, 32, 54, 1.6); magentaFill.position.set(0, 8, 32); scene.add(magentaFill);
const cyanFill = new THREE.PointLight(0x36d9ff, 22, 44, 1.8); cyanFill.position.set(-28, 7, -20); scene.add(cyanFill);

const rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const groundBody = rapierWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
rapierWorld.createCollider(RAPIER.ColliderDesc.cuboid(75, 0.25, 75), groundBody);
const playerBody = rapierWorld.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1.15, 48));
rapierWorld.createCollider(RAPIER.ColliderDesc.capsule(0.68, 0.32), playerBody);

const mats = {
  asphalt: new THREE.MeshStandardMaterial({ color: 0x181721, roughness: 0.92, metalness: 0.05 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: 0x55505f, roughness: 0.9 }),
  building: new THREE.MeshStandardMaterial({ color: 0x242131, roughness: 0.82 }),
  building2: new THREE.MeshStandardMaterial({ color: 0x332538, roughness: 0.8 }),
  black: new THREE.MeshStandardMaterial({ color: 0x09080d, roughness: 0.36, metalness: 0.5 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf8c900, roughness: 0.5 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xff208f, roughness: 0.4, metalness: 0.08 }),
  hotPink: new THREE.MeshStandardMaterial({ color: 0xff006f, roughness: 0.3, emissive: 0x520018, emissiveIntensity: 0.55 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xe0a38f, roughness: 0.62 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x070508, roughness: 0.24, metalness: 0.12 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf4ecf3, roughness: 0.5 }),
};

function box(w: number, h: number, d: number, mat: THREE.Material, x=0, y=h/2, z=0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; return m;
}
function emissive(color: number, intensity=2.2) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, toneMapped: true }); }
function textTexture(text: string, bg='#121018', fg='#fff', accent='#ff2f9d', w=1024, h=256): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d')!;
  g.fillStyle=bg; g.fillRect(0,0,w,h); g.fillStyle=accent; g.fillRect(0,0,18,h);
  g.fillStyle=fg; g.font=`900 ${Math.floor(h*.45)}px Arial`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text, w/2, h/2+2);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t;
}
function sign(text:string, w:number, h:number, color='#fff', bg='#13101a', accent='#ff2f9d') {
  const mat=new THREE.MeshBasicMaterial({ map:textTexture(text,bg,color,accent), toneMapped:false });
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
}

const obstacles: Obstacle[] = [];
function addObstacle(x:number,z:number,w:number,d:number,pad=.65){ obstacles.push({minX:x-w/2-pad,maxX:x+w/2+pad,minZ:z-d/2-pad,maxZ:z+d/2+pad}); }
function collides(x:number,z:number){ if(Math.abs(x)>65||Math.abs(z)>65)return true; return obstacles.some(o=>x>o.minX&&x<o.maxX&&z>o.minZ&&z<o.maxZ); }

function addGlowDisc(x:number,y:number,z:number,color:number,size=6){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({color,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false})); s.position.set(x,y,z); s.scale.set(size,size,size); scene.add(s);
}

function buildCity(){
  const ground=box(150,.1,150,mats.asphalt,0,-.05,0); ground.receiveShadow=true; scene.add(ground);
  // Corrientes east-west + secondary north-south roads and broad sidewalks.
  const road=box(140,.055,18,new THREE.MeshStandardMaterial({color:0x111119,roughness:.96}),0,.01,5); scene.add(road);
  const crossRoad=box(18,.058,130,new THREE.MeshStandardMaterial({color:0x12121a,roughness:.96}),-7,.015,0); scene.add(crossRoad);
  for(const z of [-6,16]) scene.add(box(140,.09,5,mats.sidewalk,0,.04,z));
  for(const x of [-18,4]) scene.add(box(5,.09,130,mats.sidewalk,x,.045,0));
  // road lane paint and zebra crossings
  const stripeMat=new THREE.MeshBasicMaterial({color:0xd0c7b6,transparent:true,opacity:.46});
  for(let x=-62;x<62;x+=10) scene.add(box(5,.025,.18,stripeMat,x,.08,5));
  for(let i=0;i<7;i++){ scene.add(box(1.1,.028,8,stripeMat,-14+i*2.1,.085,5)); scene.add(box(8,.028,1.1,stripeMat,-7,.086,-14+i*2.1)); }
  // Four dense blocks, intentionally leaving streets as two route choices.
  const blocks=[[-39,-29,34,34], [27,-29,34,34], [-39,37,34,30], [27,37,34,30]] as const;
  blocks.forEach(([x,z,w,d],bi)=>{
    for(let i=0;i<3;i++){
      const bw=w/3-1.2, bh=17+((bi*7+i*5)%15), bx=x-w/2+bw/2+i*(bw+1.2);
      const mat=bi%2?mats.building2:mats.building;
      const b=box(bw,bh,d,mat,bx,bh/2,z); scene.add(b); addObstacle(bx,z,bw,d,.35);
      for(let floor=3;floor<bh-2;floor+=3.4){
        for(let wx=-bw/2+1.5;wx<bw/2-1;wx+=2.7){
          const win=box(1.1,1.15,.04,emissive(((floor+wx+bi)%4)<1?0xffca68:0x7696c9,.55),bx+wx,floor,z+(z<0?d/2+.03:-d/2-.03)); scene.add(win);
        }
      }
    }
  });
  // Theatre district frontages.
  const theatreData=[['GRAN REX',-50,20,0xff3a9e],['ÓPERA',-28,20,0x58d9ff],['TEATRO',21,20,0xffbd39],['PASEO LA PLAZA',44,20,0xff3e66]] as const;
  theatreData.forEach(([name,x,z,c],i)=>{
    const facade=box(17,10,3,new THREE.MeshStandardMaterial({color:i%2?0x34253f:0x2e2437,roughness:.7}),x,5,z); scene.add(facade);
    const s=sign(name,15,2.2,'#fff','#160c1a',`#${c.toString(16).padStart(6,'0')}`); s.position.set(x,7.6,z-1.53); scene.add(s);
    for(let k=-6;k<=6;k+=2){ const bulb=new THREE.PointLight(c,1.7,4); bulb.position.set(x+k,6.1,z-1.8); scene.add(bulb); }
    addGlowDisc(x,7,z-2,c,12);
  });
  // Corrientes street signs.
  for(const [x,z,rot] of [[-16,15,0],[3,-5,Math.PI],[3,15,Math.PI]] as const){
    const pole=box(.18,4,.18,mats.black,x,2,z); scene.add(pole); const s=sign('AV. CORRIENTES',6.2,.9,'#fff','#0b5d3c','#fff'); s.position.set(x,3.8,z); s.rotation.y=rot; scene.add(s);
  }
  // Obelisco vista framing.
  const obelisk=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.85,2.1,28,4,1,false),new THREE.MeshStandardMaterial({color:0xc9c7c1,roughness:.85})); shaft.position.y=14;
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.85,4,4),new THREE.MeshStandardMaterial({color:0xd8d4cb,roughness:.8})); cap.position.y=30; obelisk.add(shaft,cap); obelisk.position.set(0,0,-76); obelisk.rotation.y=Math.PI/4; scene.add(obelisk); addGlowDisc(0,18,-75,0xe8d5ff,22);
  // Kiosco porteño.
  const kiosk=new THREE.Group(); kiosk.add(box(8,4.2,5,new THREE.MeshStandardMaterial({color:0x254350,roughness:.7}),0,2.1,0));
  const ks=sign('KIOSCO 24H',7.2,1.2,'#ffef75','#10202a','#ff2e9c'); ks.position.set(0,3.15,-2.53); kiosk.add(ks); kiosk.position.set(10,0,-11); scene.add(kiosk); addObstacle(10,-11,8,5);
  // Colectivo static cue.
  const bus=createBus(); bus.position.set(-42,0,-3.5); bus.rotation.y=Math.PI/2; scene.add(bus);
  // Destination club.
  const club=new THREE.Group(); const door=box(12,7,2,new THREE.MeshStandardMaterial({color:0x17101c,roughness:.35,metalness:.4}),0,3.5,0); club.add(door);
  const cs=sign('BOLICHE · VIP',11,1.8,'#fff','#150511','#ff148a'); cs.position.set(0,5.8,-1.03); club.add(cs); club.position.set(47,0,-48); scene.add(club); addGlowDisc(47,4,-50,0xff147f,14);
  const marker=new THREE.Mesh(new THREE.TorusGeometry(3.3,.14,10,64),emissive(0xff2a9d,3)); marker.rotation.x=Math.PI/2; marker.position.set(47,.2,-43); marker.name='destinationMarker'; scene.add(marker);
  // Spawn theatre exit marker and Argentine visual details.
  const spawnSign=sign('TEATRO · SALIDA DE ARTISTAS',13,1.5,'#fff','#241229','#ff2f9d'); spawnSign.position.set(0,4,59); scene.add(spawnSign);
  // traffic lights
  for(const [x,z] of [[-16,-5],[3,15],[3,-5]] as const){ const pole=box(.2,4,.2,mats.black,x,2,z); scene.add(pole); const housing=box(.8,2,.65,mats.black,x,4.4,z); scene.add(housing); const red=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),emissive(0xff143f,2));red.position.set(x,4.9,z-.34);scene.add(red);const green=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),emissive(0x43ff8f,1.5));green.position.set(x,4.0,z-.34);scene.add(green); }
}

function wheel(){ const w=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.3,16),mats.black); w.rotation.z=Math.PI/2; w.castShadow=true; return w; }
function createTaxi(){
  const g=new THREE.Group(); const lower=box(4.5,.85,8.2,mats.black,0,.85,0); const cabin=box(3.7,1.15,4.4,mats.yellow,0,1.75,-.25); g.add(lower,cabin);
  const glass=new THREE.MeshStandardMaterial({color:0x254052,roughness:.14,metalness:.55,transparent:true,opacity:.82}); const windshield=box(3.25,.75,.08,glass,0,1.9,-2.48); windshield.rotation.x=-.12; g.add(windshield);
  [[-2.15,.52,-2.6],[2.15,.52,-2.6],[-2.15,.52,2.5],[2.15,.52,2.5]].forEach(([x,y,z])=>{const w=wheel();w.position.set(x,y,z);g.add(w);});
  const roof=sign('TAXI',1.9,.72,'#111','#f7c700','#111'); roof.position.set(0,2.65,0); roof.rotation.y=Math.PI; g.add(roof); g.userData.kind='taxi'; return g;
}
function createBus(){
  const g=new THREE.Group(); g.add(box(5,4,11,new THREE.MeshStandardMaterial({color:0xd8d7c7,roughness:.7}),0,2,0)); g.add(box(5.05,1.05,11.05,new THREE.MeshStandardMaterial({color:0x236fa0,roughness:.55}),0,1.15,0));
  const route=sign('152 · BOCA',3.8,.75,'#ffe75c','#101010','#ffe75c'); route.position.set(0,3.35,-5.54); g.add(route); return g;
}

function createMoria(){
  const g=new THREE.Group(); g.name='MORIA_CASAN';
  // legs, glamour footwear, fitted dress
  for(const sx of [-.31,.31]){ const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.95,7,12),mats.pink); leg.position.set(sx,.95,0); g.add(leg); const heel=box(.38,.18,.62,mats.hotPink,sx,.17,-.12); g.add(heel); }
  const dress=new THREE.Mesh(new THREE.CylinderGeometry(.42,.66,1.95,24,5),mats.hotPink); dress.position.y=2.35; dress.scale.z=.72; dress.castShadow=true; g.add(dress);
  const waist=new THREE.Mesh(new THREE.SphereGeometry(.58,24,18),mats.hotPink); waist.scale.set(.88,1.2,.66); waist.position.y=3.23; g.add(waist);
  // shaggy oversized fuchsia coat silhouette
  const shoulder=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.05,8,18),new THREE.MeshStandardMaterial({color:0xff4ca8,roughness:.83})); shoulder.rotation.z=Math.PI/2; shoulder.position.set(0,3.36,.02); shoulder.scale.set(1.0,.83,.75); g.add(shoulder);
  const furMat=new THREE.MeshStandardMaterial({color:0xff55ad,roughness:.92});
  for(let i=0;i<22;i++){ const a=(i/22)*Math.PI*2; const strand=new THREE.Mesh(new THREE.ConeGeometry(.11,.75,7),furMat); strand.position.set(Math.cos(a)*.78,3.22+Math.sin(a*2)*.18,Math.sin(a)*.32); strand.rotation.z=Math.cos(a)*.62; strand.rotation.x=Math.sin(a)*.3; g.add(strand); }
  // neck and deliberately sculpted 3D Moria-like face: high cheekbones, long nose, strong lips, dramatic eyes.
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.21,.24,.38,16),mats.skin); neck.position.y=4.22; g.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.53,40,28),mats.skin); head.scale.set(.84,1.15,.82); head.position.set(0,4.78,0); head.castShadow=true; g.add(head);
  const cheekMat=new THREE.MeshStandardMaterial({color:0xe39b95,roughness:.65});
  for(const sx of [-.36,.36]){ const cheek=new THREE.Mesh(new THREE.SphereGeometry(.17,16,12),cheekMat); cheek.scale.set(1,.68,.38); cheek.position.set(sx,4.73,-.41); g.add(cheek); }
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.12,.47,14),mats.skin); nose.position.set(0,4.73,-.54); nose.rotation.x=-Math.PI/2; g.add(nose);
  const eyeWhite=new THREE.MeshStandardMaterial({color:0xfff7fa,roughness:.45}); const iris=new THREE.MeshBasicMaterial({color:0x171018});
  for(const sx of [-.23,.23]){ const e=new THREE.Mesh(new THREE.SphereGeometry(.115,20,12),eyeWhite); e.scale.set(1.25,.56,.36);e.position.set(sx,4.96,-.45);g.add(e); const p=new THREE.Mesh(new THREE.SphereGeometry(.053,14,8),iris);p.scale.z=.28;p.position.set(sx,4.96,-.548);g.add(p); const liner=box(.35,.035,.035,mats.black,sx,5.05,-.56);liner.rotation.z=sx>0?-.12:.12;g.add(liner); for(let k=0;k<3;k++){const lash=box(.018,.12,.018,mats.black,sx+(k-1)*.07,5.1,-.57);lash.rotation.z=(k-1)*.22;g.add(lash);} }
  const browMat=new THREE.MeshStandardMaterial({color:0x231018,roughness:.8}); for(const sx of [-.22,.22]){const br=box(.31,.045,.04,browMat,sx,5.18,-.52);br.rotation.z=sx>0?-.1:.1;g.add(br);} 
  const lipMat=new THREE.MeshStandardMaterial({color:0xb30058,roughness:.4}); const lip1=new THREE.Mesh(new THREE.SphereGeometry(.2,22,10),lipMat);lip1.scale.set(1,.26,.2);lip1.position.set(0,4.51,-.5);g.add(lip1);const lip2=lip1.clone();lip2.scale.y=.18;lip2.position.y=4.45;g.add(lip2);
  // long straight jet-black hair, 3D strands around face and down back.
  const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.58,32,18,0,Math.PI*2,0,Math.PI*.58),mats.hair); hairCap.scale.set(.94,1.05,.94);hairCap.position.set(0,4.98,.03);g.add(hairCap);
  for(let i=0;i<18;i++){ const a=-1.48+(i/17)*2.96; const strand=new THREE.Mesh(new THREE.CylinderGeometry(.055,.085,2.65,8),mats.hair); strand.position.set(Math.sin(a)*.48,3.9,Math.cos(a)*.33+.18); strand.rotation.z=Math.sin(a)*.11; strand.rotation.x=Math.cos(a)*.04; g.add(strand); }
  for(const sx of [-1,1]){ const front=new THREE.Mesh(new THREE.CylinderGeometry(.065,.1,2.25,10),mats.hair);front.position.set(sx*.48,4.0,-.27);front.rotation.z=sx*.08;g.add(front); const earring=new THREE.Mesh(new THREE.TorusGeometry(.11,.028,8,18),emissive(0xf7d46b,1.2));earring.position.set(sx*.54,4.67,-.05);earring.rotation.y=Math.PI/2;g.add(earring); }
  g.scale.set(1.06,1.06,1.06); g.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}}); return g;
}

function createNPC(kind:NPCKind, x:number,z:number):NPC{
  const g=new THREE.Group(); const bodyMat=kind==='paparazzi'?new THREE.MeshStandardMaterial({color:0x711d36,roughness:.7}):kind==='fan'?new THREE.MeshStandardMaterial({color:0x28728e,roughness:.7}):new THREE.MeshStandardMaterial({color:0x5a5362,roughness:.78});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.31,.72,5,10),bodyMat);torso.position.y=1.55;g.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.29,14,10),mats.skin);head.position.y=2.55;g.add(head);
  for(const sx of [-.18,.18]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.58,4,8),mats.black);leg.position.set(sx,.62,0);g.add(leg);}
  if(kind==='paparazzi'){ const cam=box(.42,.28,.25,mats.black,0,2.0,-.35);g.add(cam);const lens=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,.22,12),mats.black);lens.position.set(0,2.0,-.55);lens.rotation.x=Math.PI/2;g.add(lens); }
  if(kind==='fan'){ const phone=box(.16,.32,.035,new THREE.MeshStandardMaterial({color:0xc8cad8,metalness:.5}),.34,2.08,-.2);phone.rotation.z=-.18;g.add(phone); }
  g.position.set(x,0,z); g.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true;}); scene.add(g);
  return {group:g,kind,state:'WANDER',home:new THREE.Vector3(x,0,z),target:new THREE.Vector3(x,0,z),speed:kind==='paparazzi'?4.3:kind==='fan'?3.1:2.0,timer:Math.random()*2,knock:new THREE.Vector3()};
}

buildCity();
const playerModel=createMoria(); scene.add(playerModel);
const taxi=createTaxi(); taxi.position.set(19,0,18); taxi.rotation.y=.22; scene.add(taxi);
const npcs:NPC[]=[];
const npcSeed:[[NPCKind,number,number]]|never = undefined as never;
([['paparazzi',-10,34],['paparazzi',12,29],['paparazzi',-2,7],['paparazzi',19,-4],['paparazzi',30,-24],['paparazzi',42,-34],['fan',-29,10],['fan',8,-22],['fan',34,7],['neutral',-47,3],['neutral',-22,-12],['neutral',14,10],['neutral',-3,-35],['neutral',50,4]] as Array<[NPCKind,number,number]>).forEach(v=>npcs.push(createNPC(...v)));
void npcSeed;

let started=false, ended=false, resultState:''|'win'|'fail'='';
let entity=0, qTimer=0, qUses=0, qAffected=0, vehicleMode=false, vehicleSpeed=0, vehicleHeading=.22;
let playerYaw=Math.PI, cameraYaw=Math.PI, cameraPitch=.28, cameraDistance=8.3;
let last=performance.now(), accumulator=0, elapsed=0;
const fixedStep=1/60;
const keys=new Set<string>();
const joy:Vec2={x:0,y:0}; let touchRun=false;
let lookPointer=-1, lookLast:Vec2={x:0,y:0};
const shockwaves:Shockwave[]=[];
let fovKick=0, shake=0, flashTimer=0;
let resolutionScale=isCoarse?.78:.92;
let sampleFrames:number[]=[]; let qualityClock=0; let fpsNow=60; let fpsP5=60; let fpsMedian=60;
let audioCtx:AudioContext|null=null;
const playerPos=new THREE.Vector3(0,0,48);
const destination=new THREE.Vector3(47,0,-43);

function updateResolution(){ renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)*resolutionScale); renderer.setSize(innerWidth,innerHeight,false); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }
updateResolution();

function orientationGate(){ const portrait=isCoarse&&innerHeight>innerWidth; orientation.classList.toggle('hidden',!portrait); }
orientationGate();
addEventListener('resize',()=>{updateResolution();orientationGate();});
addEventListener('orientationchange',()=>setTimeout(()=>{updateResolution();orientationGate();},180));

document.addEventListener('visibilitychange',()=>{ keys.clear(); joy.x=0;joy.y=0;touchRun=false;stickKnob.style.transform='translate(0px,0px)'; last=performance.now();accumulator=0; });

function unlockAudio(){ if(!audioCtx) audioCtx=new AudioContext(); if(audioCtx.state==='suspended') void audioCtx.resume(); }
function whoosh(){ if(!audioCtx)return; const ctx=audioCtx; const dur=.34; const buffer=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate); const d=buffer.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length); const src=ctx.createBufferSource();src.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(420,ctx.currentTime);filter.frequency.exponentialRampToValueAtTime(120,ctx.currentTime+dur);const gain=ctx.createGain();gain.gain.setValueAtTime(.14,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);src.connect(filter).connect(gain).connect(ctx.destination);src.start(); }

function startGame(){ unlockAudio(); started=true;ended=false;resultState='';intro.classList.add('hidden');result.classList.add('hidden');hud.classList.remove('hidden');if(isCoarse)touch.classList.remove('hidden');resetWorld();objective.textContent='SALÍ POR CORRIENTES · EVITÁ A LOS PAPARAZZI'; }
function resetWorld(){ entity=0;qTimer=0;qUses=0;qAffected=0;vehicleMode=false;vehicleSpeed=0;taxi.position.set(19,0,18);vehicleHeading=.22;taxi.rotation.y=vehicleHeading;playerPos.set(0,0,48);playerBody.setNextKinematicTranslation({x:0,y:1.15,z:48});playerModel.visible=true;npcs.forEach((n,i)=>{n.group.position.copy(n.home);n.state='WANDER';n.timer=i*.17;n.knock.set(0,0,0);});updateHUD(); }
function finish(state:'win'|'fail'){ if(ended)return; ended=true;resultState=state; keys.clear();touch.classList.add('hidden');result.classList.remove('hidden');result.classList.toggle('fail',state==='fail'); if(state==='win'){resultKicker.textContent='MISIÓN CUMPLIDA';resultTitle.textContent='MISSION PASSED';resultScore.innerHTML=`GLAMOUR +500<br/>ENTIDAD +${Math.round(entity)}`;}else{resultKicker.textContent='ENTIDAD 100';resultTitle.textContent='LES DISTE ENTIDAD';resultScore.innerHTML='GLAMOUR +0<br/>RESPIRÁ · VOLVÉ A INTENTAR';} }
startBtn.addEventListener('click',startGame); restartBtn.addEventListener('click',startGame);

function updateHUD(){ entity=Math.max(0,Math.min(100,entity));entityValue.textContent=String(Math.round(entity));entityFill.style.width=`${entity}%`; const left=Math.max(0,qTimer);qBtn.classList.toggle('cooldown',left>0);qCooldown.textContent=left>0?`${left.toFixed(1)}s`:'¿QUIÉNES SON?'; }

function playerWorldPosition(){ return vehicleMode?taxi.position:playerPos; }
function triggerQ(){ if(!started||ended||qTimer>0)return false; qTimer=5.5;qUses++;whoosh();fovKick=8;shake=.34;flashTimer=.2;specialText.classList.add('on');flash.classList.add('on');setTimeout(()=>specialText.classList.remove('on'),480);setTimeout(()=>flash.classList.remove('on'),180);const p=playerWorldPosition(); const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1.05,64),new THREE.MeshBasicMaterial({color:0xff39a4,transparent:true,opacity:.9,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.18,p.z);scene.add(ring);shockwaves.push({mesh:ring,age:0}); let affected=0;npcs.forEach(n=>{const delta=n.group.position.clone().sub(p);const dist=delta.length();if(dist<12){affected++;n.state='STAGGER';n.timer=1.15;n.knock.copy(delta.normalize().multiplyScalar(9*(1-dist/15)));}});qAffected+=affected;entity=Math.max(0,entity-18-Math.min(affected*2,10));updateHUD();return true; }
qBtn.addEventListener('pointerdown',e=>{e.preventDefault();triggerQ();});

function tryVehicle(){ if(!started||ended)return; if(vehicleMode){ vehicleMode=false;playerModel.visible=true;playerPos.copy(taxi.position).add(new THREE.Vector3(3,0,0)); if(collides(playerPos.x,playerPos.z))playerPos.copy(taxi.position).add(new THREE.Vector3(-3,0,0));playerBody.setNextKinematicTranslation({x:playerPos.x,y:1.15,z:playerPos.z});actionBtn.textContent='ENTRAR'; return; } const d=taxi.position.distanceTo(playerPos);if(d<5){vehicleMode=true;playerModel.visible=false;vehicleHeading=taxi.rotation.y;actionBtn.textContent='SALIR';objective.textContent='TAXI TOMADO · LLEGÁ AL BOLICHE';} }
actionBtn.addEventListener('pointerdown',e=>{e.preventDefault();tryVehicle();});

addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='q')triggerQ();if(e.key.toLowerCase()==='e'||e.key.toLowerCase()==='f')tryVehicle();});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
let dragging=false,lastMouse={x:0,y:0};canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){dragging=true;lastMouse={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});canvas.addEventListener('pointermove',e=>{if(dragging&&e.pointerType==='mouse'){cameraYaw-=(e.clientX-lastMouse.x)*.004;cameraPitch=Math.max(.08,Math.min(.66,cameraPitch+(e.clientY-lastMouse.y)*.003));lastMouse={x:e.clientX,y:e.clientY};}});canvas.addEventListener('pointerup',()=>dragging=false);

function updateStick(e:PointerEvent){const r=stick.getBoundingClientRect();let x=(e.clientX-(r.left+r.width/2))/(r.width*.5), y=(e.clientY-(r.top+r.height/2))/(r.height*.5);const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}joy.x=x;joy.y=y;stickKnob.style.transform=`translate(${x*r.width*.28}px,${y*r.height*.28}px)`;}
stick.addEventListener('pointerdown',e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);updateStick(e);});stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))updateStick(e);});const endStick=(e:PointerEvent)=>{if(stick.hasPointerCapture(e.pointerId))stick.releasePointerCapture(e.pointerId);joy.x=0;joy.y=0;stickKnob.style.transform='translate(0px,0px)';};stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);
lookZone.addEventListener('pointerdown',e=>{lookPointer=e.pointerId;lookLast={x:e.clientX,y:e.clientY};lookZone.setPointerCapture(e.pointerId);});lookZone.addEventListener('pointermove',e=>{if(e.pointerId===lookPointer){cameraYaw-=(e.clientX-lookLast.x)*.006;cameraPitch=Math.max(.08,Math.min(.66,cameraPitch+(e.clientY-lookLast.y)*.005));lookLast={x:e.clientX,y:e.clientY};}});lookZone.addEventListener('pointerup',()=>lookPointer=-1);lookZone.addEventListener('pointercancel',()=>lookPointer=-1);
runBtn.addEventListener('pointerdown',e=>{e.preventDefault();touchRun=true;runBtn.setPointerCapture(e.pointerId);});runBtn.addEventListener('pointerup',()=>touchRun=false);runBtn.addEventListener('pointercancel',()=>touchRun=false);

function inputVector(){ let x=joy.x,z=joy.y; if(keys.has('a'))x-=1;if(keys.has('d'))x+=1;if(keys.has('w'))z-=1;if(keys.has('s'))z+=1;const l=Math.hypot(x,z);if(l>1){x/=l;z/=l;}return{x,z}; }
function resolveMove(current:THREE.Vector3,nx:number,nz:number){const out=current.clone();if(!collides(nx,current.z))out.x=nx;if(!collides(out.x,nz))out.z=nz;return out;}

function updatePlayer(dt:number){const inp=inputVector();const moving=Math.hypot(inp.x,inp.z)>.05;if(vehicleMode){const throttle=-inp.z;const steer=inp.x;vehicleSpeed+=throttle*16*dt;vehicleSpeed*=Math.pow(.965,dt*60);vehicleSpeed=Math.max(-8,Math.min(18,vehicleSpeed));vehicleHeading-=steer*(.8+Math.abs(vehicleSpeed)*.055)*dt*(vehicleSpeed>=0?1:-1);const nx=taxi.position.x+Math.sin(vehicleHeading)*vehicleSpeed*dt;const nz=taxi.position.z+Math.cos(vehicleHeading)*vehicleSpeed*dt;if(!collides(nx,nz)){taxi.position.x=nx;taxi.position.z=nz;}else vehicleSpeed*=-.18;taxi.rotation.y=vehicleHeading;return;}
  if(!moving)return; const sprint=keys.has('shift')||touchRun;const speed=sprint?8.6:5.4;const forward=new THREE.Vector3(Math.sin(cameraYaw),0,Math.cos(cameraYaw));const right=new THREE.Vector3(forward.z,0,-forward.x);const dir=right.multiplyScalar(inp.x).add(forward.multiplyScalar(-inp.z));if(dir.lengthSq()>.001)dir.normalize();const next=resolveMove(playerPos,playerPos.x+dir.x*speed*dt,playerPos.z+dir.z*speed*dt);playerPos.copy(next);playerYaw=Math.atan2(dir.x,dir.z);playerBody.setNextKinematicTranslation({x:playerPos.x,y:1.15,z:playerPos.z});playerModel.rotation.y=playerYaw; const bob=Math.sin(elapsed*(sprint?13:9))*(sprint?.055:.035);playerModel.position.y=bob; }

function chooseWander(n:NPC){ n.target.copy(n.home).add(new THREE.Vector3((Math.random()-.5)*10,0,(Math.random()-.5)*10));n.timer=1.6+Math.random()*2.4; }
function updateNPCs(dt:number){const p=playerWorldPosition();for(const n of npcs){const pos=n.group.position;const dist=pos.distanceTo(p);n.timer-=dt;if(n.state==='STAGGER'){pos.addScaledVector(n.knock,dt);n.knock.multiplyScalar(Math.pow(.88,dt*60));if(n.timer<=0){n.state='FLEE';n.timer=2.4;}continue;} if(n.state==='FLEE'){const away=pos.clone().sub(p).setY(0).normalize();pos.addScaledVector(away,n.speed*1.45*dt);if(n.timer<=0)n.state='RECOVER';continue;} if(n.state==='RECOVER'){if(dist>13||n.timer<=-1){n.state='WANDER';chooseWander(n);}continue;}
    if(n.kind==='paparazzi'){ if(dist<16&&n.state==='WANDER'){n.state='NOTICE';n.timer=.35;} if(n.state==='NOTICE'&&n.timer<=0)n.state='CHASE'; if(n.state==='CHASE'){const d=p.clone().sub(pos).setY(0);if(d.length()>1.9){d.normalize();pos.addScaledVector(d,n.speed*dt);n.group.rotation.y=Math.atan2(d.x,d.z);}else{n.state='PHOTO';n.timer=.75;}} if(n.state==='PHOTO'){entity+=dt*14;if(flashTimer<=0&&n.timer>.35){flashTimer=.08;flash.classList.add('on');setTimeout(()=>flash.classList.remove('on'),65);}if(n.timer<=0)n.state='CHASE';} if(dist<1.15)entity+=dt*24; }
    else if(n.kind==='fan'){if(dist<9&&n.state==='WANDER'){n.state='CHASE';n.timer=2.5;}if(n.state==='CHASE'){const d=p.clone().sub(pos).setY(0);if(d.length()>2.0){d.normalize();pos.addScaledVector(d,n.speed*dt);}else entity+=dt*4;if(n.timer<=0){n.state='WANDER';chooseWander(n);}}}
    else {if(n.state==='WANDER'){if(n.timer<=0)chooseWander(n);const d=n.target.clone().sub(pos).setY(0);if(d.length()>.3){d.normalize();pos.addScaledVector(d,n.speed*dt);n.group.rotation.y=Math.atan2(d.x,d.z);}}}
  }updateHUD();if(entity>=100)finish('fail'); }

function updateSpecial(dt:number){qTimer=Math.max(0,qTimer-dt);flashTimer=Math.max(0,flashTimer-dt);fovKick*=Math.pow(.83,dt*60);shake*=Math.pow(.84,dt*60);for(let i=shockwaves.length-1;i>=0;i--){const s=shockwaves[i];s.age+=dt;const scale=1+s.age*12;s.mesh.scale.setScalar(scale);s.mesh.material.opacity=Math.max(0,1-s.age/1.0);if(s.age>1){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();shockwaves.splice(i,1);}} }
function updateMission(){if(!started||ended)return;const p=playerWorldPosition();const dist=p.distanceTo(destination);if(dist<6.8)finish('win');const taxiDist=taxi.position.distanceTo(playerPos);const near=taxiDist<5&&!vehicleMode;vehicleHint.classList.toggle('hidden',!near);actionBtn.classList.toggle('hidden',!(near||vehicleMode));actionBtn.textContent=vehicleMode?'SALIR':'ENTRAR'; }

function updateCamera(dt:number){const p=playerWorldPosition();const target=new THREE.Vector3(p.x,vehicleMode?2.1:3.05,p.z);const dist=vehicleMode?10.5:cameraDistance;const cp=Math.cos(cameraPitch);const desired=new THREE.Vector3(target.x-Math.sin(cameraYaw)*cp*dist,target.y+Math.sin(cameraPitch)*dist,target.z-Math.cos(cameraYaw)*cp*dist);if(shake>.005){desired.x+=(Math.random()-.5)*shake;desired.y+=(Math.random()-.5)*shake;desired.z+=(Math.random()-.5)*shake;}camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(target);camera.fov=56+fovKick;camera.updateProjectionMatrix(); }
function updateQuality(dt:number){sampleFrames.push(1/Math.max(dt,.001));if(sampleFrames.length>720)sampleFrames.shift();qualityClock+=dt;if(qualityClock>3){qualityClock=0;const sorted=[...sampleFrames].sort((a,b)=>a-b);fpsNow=sampleFrames.reduce((a,b)=>a+b,0)/Math.max(1,sampleFrames.length);fpsP5=sorted[Math.floor(sorted.length*.05)]??fpsNow;fpsMedian=sorted[Math.floor(sorted.length*.5)]??fpsNow;if(fpsNow<49&&resolutionScale>.62){resolutionScale=Math.max(.62,resolutionScale-.08);updateResolution();}else if(fpsNow>59&&fpsP5>50&&resolutionScale<1){resolutionScale=Math.min(1,resolutionScale+.04);updateResolution();} if(PERF_MODE)perfEl.textContent=`FPS avg ${fpsNow.toFixed(1)} · p5 ${fpsP5.toFixed(1)} · med ${fpsMedian.toFixed(1)}\nDPR ${(Math.min(devicePixelRatio,1.6)*resolutionScale).toFixed(2)} · quality ${resolutionScale.toFixed(2)}\ndraw ${renderer.info.render.calls} · tris ${renderer.info.render.triangles}`;}}

function frame(now:number){requestAnimationFrame(frame);let dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)dt=0;elapsed+=dt;accumulator+=dt;if(started&&!ended){while(accumulator>=fixedStep){updatePlayer(fixedStep);rapierWorld.step();updateNPCs(fixedStep);updateSpecial(fixedStep);updateMission();accumulator-=fixedStep;}}else{updateSpecial(dt);}updateCamera(dt||.016);updateQuality(dt||.016);const marker=scene.getObjectByName('destinationMarker');if(marker)marker.rotation.z=elapsed*.45;renderer.render(scene,camera);}
playerModel.position.copy(playerPos);requestAnimationFrame(frame);

function syncPlayerModel(){if(!vehicleMode){playerModel.position.x=playerPos.x;playerModel.position.z=playerPos.z;}}
setInterval(syncPlayerModel,16);

// Small test/readiness surface: production E2E uses real controls for core actions and these deterministic placements to avoid brittle 3D pathing.
interface QSTestApi { start:()=>void; state:()=>Record<string,unknown>; teleport:(x:number,z:number)=>void; nearTaxi:()=>void; destination:()=>void; entity:(v:number)=>void; q:()=>boolean; vehicle:()=>void; }
declare global { interface Window { __QS_TEST__: QSTestApi } }
window.__QS_TEST__={
  start:startGame,
  state:()=>({started,ended,result:resultState,entity,qTimer,qUses,qAffected,vehicleMode,x:playerWorldPosition().x,z:playerWorldPosition().z,fpsAvg:fpsNow,fpsMedian,fpsP5,quality:resolutionScale,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),
  teleport:(x,z)=>{if(vehicleMode){taxi.position.set(x,0,z);}else{playerPos.set(x,0,z);playerBody.setNextKinematicTranslation({x,y:1.15,z});syncPlayerModel();}},
  nearTaxi:()=>{vehicleMode=false;playerModel.visible=true;playerPos.set(taxi.position.x+2.4,0,taxi.position.z);syncPlayerModel();},
  destination:()=>{const p=playerWorldPosition();p.set(destination.x,0,destination.z);if(!vehicleMode){playerPos.copy(p);syncPlayerModel();}},
  entity:(v)=>{entity=v;updateHUD();if(entity>=100)finish('fail');},
  q:triggerQ,
  vehicle:tryVehicle,
};
