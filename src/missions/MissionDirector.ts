/** ORDER-003 shared, deterministic four-mission contract. No Three.js dependency.
 * Runtime is intentionally pure: renderers/controllers provide measured inputs,
 * and only approved in-world triggers may advance the mission.
 */
export type PlayerId = "moria" | "facundo" | "franco" | "tini";
export type ObjectiveKind = "reach" | "evade" | "collect" | "time-trial" | "drive" | "ability";
export type Phase = "SELECT" | "BRIEFING" | "PLAYING" | "PAUSED" | "WON" | "LOST";
export type Point = readonly [number, number]; // world x,z in metres
export type LandmarkId = "T" | "K" | "X" | "V" | "M" | "A" | "S" | "N" | "E" | "O" |
  "K_PLUS" | "A_TOKEN" | "S_TOKEN" | "F1" | "F2" | "F3" | "F_CAR";
export interface Objective {
  id: string;
  kind: ObjectiveKind;
  targetId: LandmarkId;
  radius: number;
  requires?: readonly string[];
  requiresVehicle?: boolean;
  requiresInteraction?: boolean;
}
export interface MissionSpec {
  playerId: PlayerId;
  displayName: string;
  title: string;
  briefing: string;
  abilityName: string;
  spawn: Point;
  objectives: readonly Objective[];
  winText: string;
  failText: string;
  timeLimitSeconds?: number;
  pressureType: "ENTIDAD" | "FLASHS" | "FAMA" | "ALARMA";
}

export const LANDMARKS: Readonly<Record<LandmarkId, Point>> = {
  T: [-70, 12], K: [-47, 12], X: [-10, 0], V: [-30, -5],
  M: [0, -29], A: [28, 12], S: [30, -13], N: [70, 12],
  E: [70, -10], O: [82, 0], K_PLUS: [43, 12],
  A_TOKEN: [24, 12], S_TOKEN: [42, -12],
  F_CAR: [-2, -22], F1: [-10, -6], F2: [18, -5], F3: [45, -5],
};
const step=(id:string,kind:ObjectiveKind,targetId:LandmarkId,requires:string[]=[],
  options:Partial<Pick<Objective,"requiresVehicle"|"requiresInteraction"|"radius">>={}):Objective=>({
  id,kind,targetId,requires,radius:options.radius ?? 3,
  requiresVehicle:options.requiresVehicle ?? false,
  requiresInteraction:options.requiresInteraction ?? false
});
export const ROSTER: Readonly<Record<PlayerId,MissionSpec>> = {
  moria:{
    playerId:"moria",displayName:"Moria Casán",title:"¿QUIÉNES SON?",
    briefing:"De Corrientes al boliche: evitá los flashes y usá tu salida teatral.",
    abilityName:"¿QUIÉNES SON?",
    spawn:LANDMARKS.T,
    objectives:[step("club","reach","N",[],{radius:3.2})],
    winText:"MISSION PASSED — GLAMOUR +500 / ENTIDAD +0",
    failText:"LES DISTE ENTIDAD",pressureType:"ENTIDAD"
  },
  facundo:{
    playerId:"facundo",displayName:"Facundo Moyano",title:"LA CORRIDA DEL SIGLO",
    briefing:"Persecución arcade ficticia: cruzá los checkpoints antes de que se agote el tiempo.",
    abilityName:"PIQUE",
    spawn:[-56,12],timeLimitSeconds:80,pressureType:"FLASHS",
    objectives:[
      step("kiosk","time-trial","K",[],{radius:2.8}),
      step("crossing","time-trial","X",["kiosk"],{radius:3.5}),
      step("shortcut","time-trial","S",["crossing"],{radius:3.2}),
      step("deliver-vip-pass","reach","E",["shortcut"],{radius:3}),
    ],
    winText:"MISSION PASSED — PASE VIP ENTREGADO",
    failText:"SE TERMINÓ EL TIEMPO"
  },
  franco:{
    playerId:"franco",displayName:"Franco Colapinto",title:"MADRID EXPRESS",
    briefing:"Escape arcade ficticio desde un set inspirado en Madrid: subite al auto y llegá al punto seguro.",
    abilityName:"OVERDRIVE",
    spawn:LANDMARKS.M,timeLimitSeconds:105,pressureType:"FAMA",
    objectives:[
      step("enter-car","drive","F_CAR",[],{requiresVehicle:true,radius:4}),
      step("slalom-1","drive","F1",["enter-car"],{requiresVehicle:true,radius:3.2}),
      step("slalom-2","drive","F2",["slalom-1"],{requiresVehicle:true,radius:3.2}),
      step("slalom-3","drive","F3",["slalom-2"],{requiresVehicle:true,radius:3.2}),
      step("set-exit","drive","E",["slalom-3"],{requiresVehicle:true,radius:3.4}),
    ],
    winText:"MISSION PASSED — MADRID EXPRESS",
    failText:"SE CAYÓ EL ESTRENO"
  },
  tini:{
    playerId:"tini",displayName:"Tini Stoessel",title:"REGLAS DEL SHOW",
    briefing:"Recuperá tres activos ficticios y escapá de los perseguidores sin atropellar peatones.",
    abilityName:"CORTINA",
    spawn:LANDMARKS.A,timeLimitSeconds:125,pressureType:"ALARMA",
    objectives:[
      step("contract","collect","A_TOKEN",[],{requiresInteraction:true,radius:2.1}),
      step("royalties","collect","K_PLUS",["contract"],{requiresInteraction:true,radius:2.1}),
      step("rights","collect","S_TOKEN",["royalties"],{requiresInteraction:true,radius:2.1}),
      step("escape","evade","E",["rights"],{radius:3}),
    ],
    winText:"MISSION PASSED — LOS DERECHOS SON TUYOS",
    failText:"LAS CÁMARAS TE ENCONTRARON"
  }
};
export type FrameInput = {
  x:number; z:number; inVehicle:boolean;
  interacting?:boolean;
  collectedTarget?:LandmarkId;
  paparazziPhotos?:number;
  collisions?:number;
  cameraSightings?:number;
  specialPressed?:boolean;
  collisionEvent?:boolean;
  playerHasMoved?:boolean;
};
export type MissionEvent =
  {type:"objective-start"|"objective-complete";id:string} |
  {type:"won"|"lost";message:string} |
  {type:"special";radius:number;stunSeconds:number} |
  {type:"phase";phase:Phase};
export type MissionSnapshot = {
  player:PlayerId|null;phase:Phase;elapsed:number;
  remaining:number|null;pressure:number;specialCooldown:number;
  completed:readonly string[];currentObjective:string|null;events:readonly MissionEvent[];
};
export class MissionDirector {
  player:PlayerId|null=null;
  phase:Phase="SELECT";
  elapsed=0;
  pressure=0;
  specialCooldown=0;
  private completed=new Set<string>();
  private emitted:MissionEvent[]=[];
  private activeId:string|null=null;
  private lastFrame:FrameInput|null=null;
  choose(player:PlayerId):void {
    if(!(player in ROSTER))throw new Error("Invalid player");
    this.player=player;
    this.phase="BRIEFING";
    this.elapsed=0;this.pressure=0;this.specialCooldown=0;
    this.completed.clear();this.lastFrame=null;this.activeId=null;
    this.emitted=[{type:"phase",phase:"BRIEFING"}];
  }
  start():void {
    if(!this.player||this.phase!=="BRIEFING")throw new Error("Select player and briefing first");
    this.phase="PLAYING";this.emitted=[{type:"phase",phase:"PLAYING"}];
    this.activate();
  }
  pause():void {
    if(this.phase==="PLAYING"){this.phase="PAUSED";this.emitted.push({type:"phase",phase:"PAUSED"});}
    else if(this.phase==="PAUSED"){this.phase="PLAYING";this.emitted.push({type:"phase",phase:"PLAYING"});}
  }
  retry():void {
    if(!this.player)throw new Error("Nothing to retry");
    const p=this.player;this.choose(p);this.start();
  }
  exit():void {
    this.player=null;this.phase="SELECT";this.elapsed=0;this.pressure=0;
    this.specialCooldown=0;this.completed.clear();this.activeId=null;
    this.lastFrame=null;this.emitted=[{type:"phase",phase:"SELECT"}];
  }
  private activate():void {
    if(!this.player)return;
    const obj=ROSTER[this.player].objectives.find(o=>!this.completed.has(o.id)&&
      (o.requires??[]).every(id=>this.completed.has(id)));
    if(obj&&obj.id!==this.activeId){
      this.activeId=obj.id;
      this.emitted.push({type:"objective-start",id:obj.id});
    }
  }
  tick(dt:number,frame:FrameInput):void{
    this.emitted=[];
    if(this.phase!=="PLAYING"||!this.player)return;
    if(!Number.isFinite(dt)||dt<0||dt>0.25)throw new Error("Simulation timestep out of range");
    if(!Number.isFinite(frame.x)||!Number.isFinite(frame.z))throw new Error("Invalid position");
    const spec=ROSTER[this.player];
    this.elapsed+=dt;
    this.lastFrame=frame;
    this.specialCooldown=Math.max(0,this.specialCooldown-dt);
    // Bounds/pressure inputs are produced by world collision/NPC systems.
    const photos=Math.max(0,Math.min(4,frame.paparazziPhotos??0));
    const bumps=Math.max(0,Math.min(4,frame.collisions??0));
    const cameras=Math.max(0,Math.min(4,frame.cameraSightings??0));
    const gainPerSecond = this.player==="moria" ? photos*13 :
      this.player==="facundo" ? photos*3 :
      this.player==="franco" ? bumps*24 : cameras*2.8;
    const decayPerSecond = this.player==="moria" ? 1.0 :
      this.player==="facundo" ? 2.2 :
      this.player==="franco" ? 0.3 : 0.4;
    const collisionImpact=this.player==="franco"&&frame.collisionEvent?24:0;
    this.pressure=Math.min(100,Math.max(0,this.pressure+(gainPerSecond-decayPerSecond)*dt+collisionImpact));
    if(frame.specialPressed&&this.specialCooldown===0){
      this.specialCooldown=8;
      const reduction=this.player==="moria"?18:this.player==="facundo"?12:this.player==="franco"?10:15;
      const radius=this.player==="moria"?7:this.player==="franco"?4.5:6;
      this.pressure=Math.max(0,this.pressure-reduction);
      this.emitted.push({type:"special",radius,stunSeconds:this.player==="franco"?0.8:1.6});
    }
    if(this.pressure>=100){
      this.phase="LOST";this.emitted.push({type:"lost",message:spec.failText});return;
    }
    if(spec.timeLimitSeconds!==undefined&&this.elapsed>=spec.timeLimitSeconds){
      this.phase="LOST";this.emitted.push({type:"lost",message:spec.failText});return;
    }
    // Only active prerequisite-satisfied objective may advance.
    this.activate();
    const obj=spec.objectives.find(o=>o.id===this.activeId);
    if(!obj)return;
    const target=LANDMARKS[obj.targetId];
    const inRadius=Math.hypot(frame.x-target[0],frame.z-target[1])<=obj.radius;
    const drivingOkay=!obj.requiresVehicle||frame.inVehicle;
    const interactionOkay=!obj.requiresInteraction||
      (frame.interacting===true&&frame.collectedTarget===obj.targetId);
    if(inRadius&&drivingOkay&&interactionOkay){
      this.completed.add(obj.id);
      this.emitted.push({type:"objective-complete",id:obj.id});
      this.activeId=null;
      if(this.completed.size===spec.objectives.length){
        this.phase="WON";
        this.emitted.push({type:"won",message:spec.winText});
      }else this.activate();
    }
  }
  snapshot():MissionSnapshot{
    const spec=this.player?ROSTER[this.player]:null;
    return{
      player:this.player,phase:this.phase,elapsed:this.elapsed,
      remaining:spec?.timeLimitSeconds===undefined?null:Math.max(0,spec.timeLimitSeconds-this.elapsed),
      pressure:this.pressure,specialCooldown:this.specialCooldown,
      completed:[...this.completed],currentObjective:this.activeId,events:[...this.emitted]
    };
  }
}
