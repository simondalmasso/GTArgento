import * as THREE from "three";

export type TexBag = Record<string, THREE.Texture>;

function canvasTex(draw:(g:CanvasRenderingContext2D,w:number,h:number)=>void,w=512,h=512){
 const c=document.createElement("canvas");c.width=w;c.height=h;
 const g=c.getContext("2d");if(!g)throw new Error("Canvas 2D unavailable");
 draw(g,w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.needsUpdate=true;return t;
}
function paintFacade(kind:number){
 return canvasTex((g,w,h)=>{
  const base=kind===0?"#29232b":kind===1?"#17141d":"#24131f";
  g.fillStyle=base;g.fillRect(0,0,w,h);g.fillStyle="#44353a";g.fillRect(0,0,w,22);g.fillRect(0,h*.7,w,14);g.fillStyle="#8a6557";g.fillRect(0,h*.72,w,h*.28);
  for(let col=0;col<5;col++)for(let row=0;row<6;row++){
   const x=24+col*98,y=42+row*78,lit=((col*7+row*3+kind*5)%9)>2;
   g.fillStyle="#080911";g.fillRect(x-5,y-5,70,52);g.fillStyle=lit?(row%2?"#d18d55":"#f0c77b"):"#11121d";g.fillRect(x,y,60,42);
   g.fillStyle="rgba(255,229,170,.3)";g.fillRect(x+4,y+4,4,34);g.fillRect(x+30,y+4,3,34);
   g.strokeStyle="#b7a08c";g.lineWidth=3;g.strokeRect(x-3,y-3,66,48);
   if(kind===0&&row%2===0){g.strokeStyle="#56434b";g.lineWidth=2;g.beginPath();g.moveTo(x-7,y+51);g.lineTo(x+67,y+51);g.stroke();}
  }
  g.fillStyle=kind===2?"#3b071c":kind===1?"#071b27":"#1a1021";g.fillRect(0,h*.79,w,h*.21);
  g.fillStyle=kind===1?"#55d9ee":"#ff4ec8";g.fillRect(0,h*.79,w,6);
  g.textAlign="center";g.fillStyle="#fff0d5";g.font="bold 22px sans-serif";
  g.fillText(kind===2?"TEATRO CORRIENTES":kind===1?"LIBRERÍA AVENIDA":"BUENOS AIRES",w/2,h*.87);
  g.fillStyle="#f0b36b";g.font="bold 13px sans-serif";g.fillText(kind===2?"FUNCIONES · 20:30":kind===1?"LIBROS · REVISTAS":"AVENIDA CORRIENTES",w/2,h*.92);
  g.fillStyle="#c7a98c";g.fillRect(0,h*.97,w,h*.03);
 },512,768);
}
function paintAsphalt(){
 return canvasTex((g,w,h)=>{
  g.fillStyle="#171820";g.fillRect(0,0,w,h);
  for(let i=0;i<1700;i++){const x=(i*73)%w,y=(i*191)%h;g.fillStyle=i%3===0?"rgba(180,180,190,.10)":"rgba(0,0,0,.16)";g.fillRect(x,y,1+(i%3),1+(i%2));}
  g.strokeStyle="rgba(205,190,160,.12)";g.lineWidth=1;
  for(let i=0;i<24;i++){const x=(i*89)%w,y=(i*137)%h;g.beginPath();g.moveTo(x,y);g.lineTo(x+9+(i%7),y+2+(i%4));g.lineTo(x+16+(i%9),y+8);g.stroke();}
 },512,512);
}
function paintSidewalk(){
 return canvasTex((g,w,h)=>{
  g.fillStyle="#69636a";g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=64)for(let x=0;x<w;x+=128){
   g.fillStyle=((x/128+y/64)%2)?"#746d70":"#625d64";g.fillRect(x+2,y+2,124,60);
   g.strokeStyle="#37323b";g.lineWidth=3;g.strokeRect(x+2,y+2,124,60);
   g.strokeStyle="rgba(210,190,180,.12)";g.lineWidth=1;g.beginPath();g.moveTo(x+8,y+10);g.lineTo(x+118,y+10);g.stroke();
  }
  for(let i=0;i<420;i++){const x=(i*47)%w,y=(i*113)%h;g.fillStyle="rgba(20,18,25,.16)";g.fillRect(x,y,2,2);}
 },512,512);
}
function paintSky(){
 return canvasTex((g,w,h)=>{
  const grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,"#080914");grad.addColorStop(.55,"#17152d");grad.addColorStop(1,"#30182c");g.fillStyle=grad;g.fillRect(0,0,w,h);
  for(let i=0;i<190;i++){const x=(i*97)%w,y=(i*173)%h;g.fillStyle=i%4===0?"rgba(255,220,245,.85)":"rgba(170,180,255,.42)";g.fillRect(x,y,i%5===0?2:1,i%5===0?2:1);}
  g.fillStyle="rgba(255,65,175,.08)";g.fillRect(0,h*.72,w,h*.28);
 },512,256);
}
function paintSign(label:string,accent:string){
 return canvasTex((g,w,h)=>{
  g.fillStyle="#100b14";g.fillRect(0,0,w,h);g.strokeStyle=accent;g.lineWidth=8;g.strokeRect(7,7,w-14,h-14);
  g.textAlign="center";g.textBaseline="middle";g.fillStyle=accent;g.font="900 44px sans-serif";g.fillText(label,w/2,h*.48);
  g.fillStyle="#f7e9db";g.font="bold 13px sans-serif";g.fillText("BUENOS AIRES · CORRIENTES",w/2,h*.78);
 },512,128);
}
function paintBillboard(){
 return canvasTex((g,w,h)=>{
  const grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,"#29112c");grad.addColorStop(1,"#08070d");g.fillStyle=grad;g.fillRect(0,0,w,h);
  g.strokeStyle="#ff4ec8";g.lineWidth=12;g.strokeRect(12,12,w-24,h-24);g.strokeStyle="#f0b36b";g.lineWidth=3;g.strokeRect(29,29,w-58,h-58);
  g.textAlign="center";g.fillStyle="#fff0fa";g.font="900 64px sans-serif";g.fillText("MORIA",w/2,h*.38);
  g.fillStyle="#ff4ec8";g.font="bold 38px sans-serif";g.fillText("¿QUIÉNES SON?",w/2,h*.51);
  g.fillStyle="#f0b36b";g.font="bold 20px sans-serif";g.fillText("BUENOS AIRES · CORRIENTES",w/2,h*.67);
  g.fillStyle="#fff0fa";g.font="bold 16px sans-serif";g.fillText("TEATRO · NOCHE · GLAMOUR",w/2,h*.75);
 },512,768);
}
function paintHair(){
 return canvasTex((g,w,h)=>{
  g.clearRect(0,0,w,h);
  for(let i=0;i<76;i++){const x=(i+.5)*w/76,bend=Math.sin(i*1.73)*13;g.beginPath();g.moveTo(x,0);g.bezierCurveTo(x+bend,h*.25,x-bend*.55,h*.72,x+Math.sin(i)*4,h);g.strokeStyle=i%5===0?"rgba(70,48,58,.92)":"rgba(5,4,7,.98)";g.lineWidth=1.5+(i%4)*.8;g.stroke();}
 },256,512);
}
function paintFeather(){
 return canvasTex((g,w,h)=>{
  g.clearRect(0,0,w,h);const a={x:w*.18,y:h*.88},b={x:w*.82,y:h*.12};g.lineCap="round";
  g.strokeStyle="rgba(100,5,38,.9)";g.lineWidth=7;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
  for(let i=2;i<44;i++){const t=i/46,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,len=(1-t)*125+5;
   for(const sign of [-1,1]){g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x-len*.1,y-sign*len*.2,x-sign*len*.68,y-sign*len*.62);g.strokeStyle=sign<0?"rgba(255,95,160,.9)":"rgba(190,20,70,.9)";g.lineWidth=1+(1-t)*3;g.stroke();}
  }
 },512,512);
}
function paintSequins(){
 return canvasTex((g,w,h)=>{
  g.fillStyle="#25000d";g.fillRect(0,0,w,h);const step=34;
  for(let y=-step;y<h+step;y+=step)for(let x=-step;x<w+step;x+=step){
   const cx=x+((Math.round(y/step)%2)*step/2),cy=y,r=14,grad=g.createRadialGradient(cx-4,cy-5,1,cx,cy,r);
   grad.addColorStop(0,"#ffd4e7");grad.addColorStop(.24,"#ff4e9d");grad.addColorStop(.7,"#b20b4b");grad.addColorStop(1,"#3a0016");
   g.fillStyle=grad;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fill();g.strokeStyle="rgba(255,170,210,.55)";g.lineWidth=1;g.beginPath();g.arc(cx,cy,r-2,Math.PI*1.05,Math.PI*1.9);g.stroke();
  }
 },512,512);
}
export async function loadTextures():Promise<TexBag>{
 const bag:TexBag={apartments:paintFacade(0),shop:paintFacade(1),theater:paintFacade(2),fallbackA:paintFacade(0),fallbackB:paintFacade(1),fallbackC:paintFacade(2),asphalt:paintAsphalt(),sidewalk:paintSidewalk(),sky:paintSky(),billboard:paintBillboard(),granrex:paintSign("GRAN REX","#f0b36b"),cultura:paintSign("CULTURA","#ff4ec8"),libros:paintSign("LIBRERÍA AVENIDA","#f0b36b"),diva:paintSign("DIVA","#ff4ec8"),skin:canvasTex(g=>{g.fillStyle="#c48a6a";g.fillRect(0,0,512,512);}),sequin:paintSequins(),hair:paintHair(),feather:paintFeather()};
 for(const key of ["asphalt","sidewalk","sequin"]){bag[key].wrapS=THREE.RepeatWrapping;bag[key].wrapT=THREE.RepeatWrapping;}
 return bag;
}
