import test from "node:test";
import assert from "node:assert/strict";
import {MissionDirector,ROSTER,LANDMARKS} from "../../src/missions/MissionDirector.ts";
import {missionToWorld,worldToMission} from "../../src/game/world-map.ts";

const f=(point,inVehicle=false,extras={})=>({x:point[0],z:point[1],inVehicle,...extras});
const start=p=>{const m=new MissionDirector();m.choose(p);m.start();return m;};
test("mission map projects onto the recovered street and round-trips",()=>{
 const t=missionToWorld(LANDMARKS.T), n=missionToWorld(LANDMARKS.N);
 assert.ok(Math.abs(t.x-10.5)<1e-9);assert.ok(Math.abs(t.z-62)<1e-9);
 assert.ok(Math.abs(n.x-10.5)<1e-9);assert.ok(Math.abs(n.z+58)<1e-9);
 for(const p of Object.values(LANDMARKS)){
   const w=missionToWorld(p), back=worldToMission(w.x,w.z);
   assert.ok(Math.abs(back[0]-p[0])<1e-9);
   assert.ok(Math.abs(back[1]-p[1])<1e-9);
 }
});
test("roster uses canonical display names",()=>{
 assert.deepEqual(Object.values(ROSTER).map(x=>x.displayName),["Moria Casán","Facundo Moyano","Franco Colapinto","Tini Stoessel"]);
});
test("every protagonist has a distinct briefing and ability",()=>{
 const values=Object.values(ROSTER);
 assert.ok(values.every(x=>x.briefing.length>20&&x.abilityName.length>1));
 assert.equal(new Set(values.map(x=>x.abilityName)).size,4);
});
test("four player registry and one shared 2D topology",()=>{
 assert.deepEqual(Object.keys(ROSTER),["moria","facundo","franco","tini"]);
 for(const spec of Object.values(ROSTER)){
   assert.ok(spec.objectives.length>0);
   for(const obj of spec.objectives)assert.ok(LANDMARKS[obj.targetId]);
 }
});
test("Moria cannot win outside club; Q applies pressure reduction and cooldown",()=>{
 const m=start("moria");
 m.tick(0.016,f(LANDMARKS.T,false,{paparazziPhotos:2}));
 assert.equal(m.snapshot().phase,"PLAYING");
 assert.equal(m.snapshot().pressure>0,true);
 m.tick(0.016,f(LANDMARKS.T,false,{specialPressed:true}));
 assert.equal(m.snapshot().events.some(x=>x.type==="special"),true);
 assert.ok(m.snapshot().specialCooldown>7);
 m.tick(0.016,f(LANDMARKS.N));
 assert.equal(m.snapshot().phase,"WON");
});
test("each protagonist can trigger a bounded ability and cooldown",()=>{
 for(const p of ["moria","facundo","franco","tini"]){
   const m=start(p);m.tick(0.016,f(ROSTER[p].spawn,false,{specialPressed:true}));
   assert.ok(m.snapshot().events.some(x=>x.type==="special"),p+" ability did not fire");
   assert.ok(m.snapshot().specialCooldown>7,p+" cooldown missing");
 }
});
test("Moria loses on flashes and replay resets without reloading",()=>{
 const m=start("moria");
 for(let i=0;i<200&&m.phase==="PLAYING";i++)m.tick(0.016,f(LANDMARKS.T,false,{paparazziPhotos:4}));
 assert.equal(m.phase,"LOST");
 m.retry();
 assert.equal(m.snapshot().phase,"PLAYING");assert.equal(m.snapshot().pressure,0);
});
test("Facundo checkpoints cannot be skipped and timer fails correctly",()=>{
 const m=start("facundo");
 m.tick(0.016,f(LANDMARKS.E));assert.equal(m.snapshot().completed.length,0);
 for(const l of ["K","X","S","E"])m.tick(0.016,f(LANDMARKS[l]));
 assert.equal(m.phase,"WON");
 const lost=start("facundo");
 for(let i=0;i<80;i++)lost.tick(0.125,f(LANDMARKS.T));
 assert.equal(lost.phase,"PLAYING");
 for(let i=0;i<600&&lost.phase==="PLAYING";i++)lost.tick(0.125,f(LANDMARKS.T));
 assert.equal(lost.phase,"LOST");
});
test("Franco collision pressure is event-based rather than frame-rate-based",()=>{
 const m=start("franco");
 m.tick(0.016,f(ROSTER.franco.spawn,false,{collisionEvent:true}));
 assert.ok(m.snapshot().pressure>23.9&&m.snapshot().pressure<=24);
});
test("Franco requires car throughout and all four driving checkpoints",()=>{
 const m=start("franco");
 m.tick(0.016,f(LANDMARKS.F_CAR));
 assert.equal(m.snapshot().currentObjective,"enter-car");
 m.tick(0.016,f(LANDMARKS.F_CAR,true));
 m.tick(0.016,f(LANDMARKS.F1,true));
 m.tick(0.016,f(LANDMARKS.F2,true));
 m.tick(0.016,f(LANDMARKS.F3,false));
 assert.equal(m.snapshot().currentObjective,"slalom-3");
 m.tick(0.016,f(LANDMARKS.F3,true));
 m.tick(0.016,f(LANDMARKS.E,true));
 assert.equal(m.phase,"WON");
});
test("Tini requires all 3 in-world pickups via interactions",()=>{
 const m=start("tini");
 m.tick(0.016,f(LANDMARKS.E));
 assert.equal(m.snapshot().completed.length,0);
 for(const t of ["A_TOKEN","K_PLUS","S_TOKEN"]){
   m.tick(0.016,f(LANDMARKS[t],false,{interacting:true,collectedTarget:"E"}));
   assert.equal(m.snapshot().currentObjective!==null,true);
   m.tick(0.016,f(LANDMARKS[t],false,{interacting:true,collectedTarget:t}));
 }
 m.tick(0.016,f(LANDMARKS.E));
 assert.equal(m.phase,"WON");
});
test("pause freezes all progression; switch resets all shared mission state",()=>{
 const m=start("moria");m.pause();m.tick(0.1,f(LANDMARKS.N));
 assert.equal(m.phase,"PAUSED");assert.equal(m.elapsed,0);
 m.pause();m.tick(0.016,f(LANDMARKS.T));
 m.choose("tini");assert.equal(m.snapshot().phase,"BRIEFING");
 assert.equal(m.snapshot().pressure,0);assert.equal(m.snapshot().completed.length,0);
 m.start();assert.equal(m.snapshot().currentObjective,"contract");
 m.exit();assert.equal(m.snapshot().player,null);
});
