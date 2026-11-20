/* Physical regression fixtures, using the exact production Cannon/PHYSICS.
 * No browser, target-pocket routing, substituted solver, or production server. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const source=await fs.readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');
const ca=source.indexOf('CANNON=(()=>{'),cb=source.indexOf('})();',ca)+5;
const pa=source.indexOf('const PHYSICS=(()=>{'),pb=source.indexOf('\nconst DRAW=',pa);
assert.ok(ca>=0&&cb>ca&&pa>cb&&pb>pa);
const context=vm.createContext({console:{info(){},warn(){},error(){}},performance});
vm.runInContext('const '+source.slice(ca,cb)+'\n'+source.slice(pa,pb)+'\nglobalThis.fixture={CANNON,PHYSICS};',context);
const {CANNON:C,PHYSICS:P}=context.fixture;
const rotate=(v,a)=>[Math.cos(a)*v[0]+Math.sin(a)*v[2],v[1],-Math.sin(a)*v[0]+Math.cos(a)*v[2]];
const setAngle=(p,a)=>{p.angle=a;p.rotor.quaternion.setFromAxisAngle(new C.Vec3(0,1,0),a);};
const contacts=(p,b)=>p.world.contacts.filter(c=>(c.bi===b.body||c.bj===b.body)&&(p.stopperShapes.includes(c.si)||p.stopperShapes.includes(c.sj)));
const plain=x=>JSON.parse(JSON.stringify(x));
const stats=values=>({min:Math.min(...values),max:Math.max(...values),span:Math.max(...values)-Math.min(...values)});

const launchA=new P.RoulettePhysics(C,{seed:276}),launchB=new P.RoulettePhysics(C,{seed:276});
const samples=Array.from({length:128},()=>launchA.createLaunchSpec());
assert.deepEqual(plain(samples),plain(Array.from({length:128},()=>launchB.createLaunchSpec())),'same seed gives the exact launch sequence');
const launchVariation=Object.fromEntries(Object.keys(samples[0]).map(k=>[k,stats(samples.map(s=>s[k]))]));
assert.ok(launchVariation.speed.span>.9&&launchVariation.speed.span<1.3);
assert.ok(launchVariation.angle.span>.12&&launchVariation.angle.span<.18);
assert.ok(launchVariation.spin.span>.20&&launchVariation.spin.span<.32);
assert.ok(launchVariation.mouthAngle.span>.018&&launchVariation.mouthRadius.span>.025);
assert.ok(launchVariation.clearance.min>0&&launchVariation.clearance.max<.04);
const spec=samples[0],expected=launchA.launchState(spec),seed=launchA.seed,ball=launchA.launch(spec);
assert.equal(launchA.seed,seed,'a supplied/planned spec is not rerolled when launched');
assert.deepEqual(plain(ball.body.position.toArray()),plain(expected.position));
assert.deepEqual(plain(ball.body.velocity.toArray()),plain(expected.velocity));
// Existing saved launch specifications remain valid inputs.
const legacy=launchA.launchState({speed:8.82,angle:2.12,spin:1});
assert.ok([...legacy.position,...legacy.velocity].every(Number.isFinite));

function glancing(theta,z,speed,reverse=false){
 const p=new P.RoulettePhysics(C,{rpm:0,seed:276});setAngle(p,theta);
 const b=p.launch(),direction=reverse?1:-1;
 b.body.position.set(...rotate([-direction*1.05,P.bowlHeight(z)+b.radius+.005,z],theta));
 b.body.velocity.set(...rotate([direction*speed,0,0],theta));
 b.body.angularVelocity.set(...rotate([0,0,-direction*speed/b.radius],theta));
 let entry=null,exit=null,last=-1,maxContacts=0,maxStep=0;
 for(let k=0;k<360&&!b.resolved;k++){
  const previous={time:p.time,speed:b.body.velocity.length(),position:b.body.position.toArray()};
  p.step();const hit=contacts(p,b);maxContacts=Math.max(maxContacts,hit.length);
  maxStep=Math.max(maxStep,Math.hypot(...b.body.position.toArray().map((x,i)=>x-previous.position[i])));
  if(hit.length){entry??=previous;last=k;}
  if(entry&&k-last>8){
   const position=b.body.position.toArray(),velocity=b.body.velocity.toArray(),r=Math.hypot(position[0],position[2]);
   exit={time:p.time,speed:b.body.velocity.length(),radius:r,radialVelocity:(position[0]*velocity[0]+position[2]*velocity[2])/r};break;
  }
 }
 assert.ok(entry&&exit,'ball physically enters and leaves a stopper contact');
 assert.equal(maxContacts,1,'one patch per ball / stopper, not repeated triangle-edge impulses');
 assert.ok(maxStep<.16,'no discontinuous position push');
 assert.equal(p.faults,0);
 const ratio=exit.speed/entry.speed;
 if(!reverse){assert.ok(ratio>.65&&ratio<1.15,'normal glancing speed is retained '+JSON.stringify({theta,z,speed,ratio,entry,exit}));assert.ok(exit.radialVelocity>0,'guide sends a glancing ball outward');}
 else assert.ok(ratio>.15&&ratio<1.5,'reverse approach leaves the guide without sticking');
 return {theta,z,speed,reverse,entry,exit,ratio,maxContacts,maxStep};
}

function occupied(theta,carryFraction=1,neighborPlugs=false){
 const p=new P.RoulettePhysics(C,{seed:276}),angle=theta-.25,w=p.settings.rpm*P.TAU/60;
 setAngle(p,angle);
 const occupied=neighborPlugs?[0,1,24]:[0];
 for(const index of occupied){
  const slot=(25-index)%25,local=new C.Vec3(...P.polar(P.DIM.pocket,slot*P.TAU/25,P.deckHeight(P.DIM.pocket)-.14));
  const plug=new C.Sphere(P.DIM.ball);p.rotor.addShape(plug,local);p.holds.push(plug);p.occupied[index]=true;
 }
 p.rotor.updateBoundingRadius();p.rotor.aabbNeedsUpdate=true;
 const b=p.launch(),pos=P.polar(P.DIM.pocket,angle,P.deckHeight(P.DIM.pocket)-.14+2*b.radius+.001);
 b.body.position.set(...pos);b.body.velocity.set(w*pos[2]*carryFraction,0,-w*pos[0]*carryFraction);b.body.angularVelocity.set(0,w,0);b.grounded=0;b.onRotor=true;
 let contactAt=null,lastContact=null,maxStep=0,maxHeight=pos[1],maxRadius=P.DIM.pocket;
 for(let k=0;k<1440&&!b.resolved;k++){
  const previous=b.body.position.toArray();p.step();
  if(contacts(p,b).length){contactAt??=p.time;lastContact=p.time;}
  // The existing final pocket capture anchors a resolved ball to its plug.
  if(!b.resolved)maxStep=Math.max(maxStep,Math.hypot(...b.body.position.toArray().map((x,i)=>x-previous[i])));
  maxHeight=Math.max(maxHeight,b.body.position.y);maxRadius=Math.max(maxRadius,Math.hypot(b.body.position.x,b.body.position.z));
 }
 const hit=p.hits.at(-1);
 assert.ok(contactAt!==null,'the occupied-pocket escape actually contacts a fixed stopper');
 assert.ok(hit&&hit.time<12,'a resting/carried ball reaches another physical opening');
 assert.ok(!occupied.includes(hit.pocket-1),'the new ball never duplicates an occupied result');
 assert.ok(maxStep<.16,'escape is integrated continuously without a teleport');
 assert.ok(maxHeight<.65,'escape stays low and does not throw the ball across the bowl');
 assert.equal(p.faults,0);
 return {theta,carryFraction,occupied:occupied.map(i=>i+1),contactAt,lastContact,hit,maxStep,maxHeight,maxRadius};
}

const angles=[0,P.TAU/3,2*P.TAU/3];
const glances=angles.flatMap(a=>[glancing(a,3.65,5),glancing(a,3.80,8),glancing(a,3.65,5,true)]);
const escapes=angles.flatMap(a=>[occupied(a,1),occupied(a,0,true)]);
const report={ok:true,physicsSourceHash:createHash('sha256').update(source.slice(pa,pb)).digest('hex'),launchVariation,glances,escapes,scope:'Production Cannon at 120Hz; identical visible/collision stopper mesh; no outcome shortcut or production server.',baseline:{version:275,outerGlanceSpeedRatios:{'radius3.65_speed5':.3794621321,'radius3.80_speed8':.4962987570}}};
await fs.mkdir('qa-v276',{recursive:true});
await fs.writeFile('qa-v276/roulette-motion.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ok:true,launchVariation,glancingRatios:glances.map(x=>({theta:x.theta,reverse:x.reverse,ratio:x.ratio,radial:x.exit.radialVelocity})),escapes:escapes.map(x=>({theta:x.theta,carry:x.carryFraction,hit:x.hit.pocket,time:x.hit.time,maxStep:x.maxStep}))}));
