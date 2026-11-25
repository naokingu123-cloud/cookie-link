/* Exact state/financial examples plus the shipped DrawController. Randomized
 * results are confined to this test harness; production receives physical HITs. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const output=process.env.SWEETS_QA_OUTPUT_DIR||'qa-jpc-crystal-v306';
await fs.mkdir(output,{recursive:true});
const report={ok:false,cases:[],scope:'Pure production rules and extracted native draw controller. Synthetic HIT fixtures test accounting; native physics evidence is reported separately.'};
const plain=value=>JSON.parse(JSON.stringify(value));
const quiet={info(){},warn(){},error(){}};
const source=await fs.readFile('optimized/app-01.js','utf8');
const rulesSource=await fs.readFile('assets/jpc-crystal-rules-v306.js','utf8');
const math=JSON.parse(await fs.readFile('docs/jpc-crystal-v306-math.json','utf8'));
const context={console:quiet,performance,URLSearchParams,location:{search:'?edition=local'}};
context.window=context;vm.createContext(context);vm.runInContext(rulesSource,context);
const R=context.SweetsCrystalJpcV306;
assert(R,'production Crystal JPC rules are exposed');
const values=[0,1,2,3,4,6,8,10,15];
const bonuses=new Map([[6,1],[11,1],[16,4],[21,8]]);
const ordinary=Array.from({length:25},(_,i)=>i+1).filter(n=>n!==1&&!bonuses.has(n));
let nextId=1;
const state=()=>R.createSession();
function invariant(s,label='state'){
 assert.equal(s.counts.length,25,label+' has 25 counters');
 assert(s.counts.every(n=>Number.isSafeInteger(n)&&n>=0),label+' counts are nonnegative integers');
 assert(Number.isSafeInteger(s.remaining)&&s.remaining>=0,label+' bank is nonnegative');
 assert.equal(s.landed,s.counts.reduce((sum,n)=>sum+n,0),label+' accepted counts match landed balls');
 assert.equal(s.remaining+Object.keys(s.pending).length+s.landed,30+s.bonusTotal,label+' every ball belongs to bank, flight or a settled pocket');
 assert.equal(s.jpHits,s.counts[0]);
 const base=ordinary.reduce((sum,n)=>sum+values[Math.min(8,s.counts[n-1])],0);
 assert.equal(s.base,base,label+' uses final per-pocket values, not repeated milestone additions');
 const multiplier=s.jpHits>=5?5*(s.jpHits-4):1;
 assert.equal(s.multiplier,multiplier,label+' multiplier');
 assert.equal(s.payout,base*multiplier,label+' payout');
}
function launch(s,id=nextId++){R.launch(s,id);invariant(s,'after launch');return id;}
function land(s,pocket,id=launch(s)){R.acceptHit(s,{id,ball:id,pocket});invariant(s,'after HIT');return id;}
function flush(s,pocket=2){while(s.remaining)land(s,pocket);assert(R.isComplete(s));}
function run(name,fn){fn();report.cases.push(name);}

const drawStart=source.indexOf('class DrawController{'),drawEnd=source.indexOf('\n// Lightweight online timing',drawStart);
assert(drawStart>=0&&drawEnd>drawStart,'native draw controller source boundaries');
const groups=source.match(/^const NORMAL_DRAW_GROUPS=.*;$/m)?.[0];
assert(groups,'native normal draw groups remain available');
vm.runInContext('const localEightAllowed=true;\n'+groups+'\n'+source.slice(drawStart,drawEnd)+'\nglobalThis.NativeDrawController=DrawController;',context);
function controller(variant='crystal'){
 const flying=new Map();
 const p={settings:{interval:1},time:0,serial:0,hits:[],seed:1,blocked:false,
  get active(){return flying.size;},random:()=>.5,createLaunchSpec:()=>({speed:10,angle:2.12}),
  reset(){flying.clear();this.serial=0;this.hits=[];},
  launch(){if(this.blocked||this.active>=10)return null;const ball={id:++this.serial};flying.set(ball.id,ball);return ball;}
 };
 const d=new context.NativeDrawController(p);d.jpcVariant=variant;d.select('jpc');d.start();
 const next=()=>{p.time=Math.max(p.time+1,d.next);const serial=p.serial;d.update();return p.serial>serial?p.serial:null;};
 const hit=(id,pocket)=>{assert(flying.has(id),'test result has a real pending controller launch');flying.delete(id);const result={ball:id,pocket,time:p.time};p.hits.push(result);d.acceptJpcHit(result);};
 const fault=id=>{assert(flying.has(id));flying.delete(id);d.acceptJpcFault(id);};
 return {d,p,next,hit,fault,flying};
}

try{
 run('the production configuration matches the independently calibrated model',()=>{
  for(const key of ['version','pocketCount','initialBalls','jpPocket','bonusPockets','bonuses','payouts','jpThreshold','jpMultiplierStep','referenceJP'])assert.deepEqual(plain(R.config[key]),math.rules[key],'model/production '+key);
  assert(Math.abs(R.config.targetEV-math.selected.expected_payout)<1e-7,'displayed expected payout matches numerical evidence');
  assert(Math.abs(R.config.jpProbability-math.selected.jp_probability)<1e-9,'JP probability matches numerical evidence');
  assert(Math.abs(R.config.meanDraws-math.selected.mean_balls)<1e-9,'mean draw count matches numerical evidence');
  assert.equal(math.rules.hasDrawLimit,false);assert.equal(R.config.maxBalls,undefined);
 });
 run('30-ball initial bank, 25 separate pockets and independent sessions',()=>{
  const a=state(),b=state();invariant(a);assert.equal(a.remaining,30);assert.equal(a.launched,0);assert.equal(a.landed,0);assert.equal(a.payout,0);assert.equal(R.isComplete(a),false);
  land(a,2);assert.equal(b.remaining,30);assert.equal(b.counts[1],0);assert.notEqual(a.counts,b.counts);
 });
 run('all eight cumulative payout/color levels including the 8+ cap',()=>{
  assert.deepEqual(Array.from({length:13},(_,n)=>R.pocketValue(n)),[0,1,2,3,4,6,8,10,15,15,15,15,15]);
  assert.equal(new Set(Array.from({length:8},(_,i)=>R.pocketColor(i+1))).size,8,'each nonzero payout tier has its requested distinct color');
  const s=state();for(let n=1;n<=12;n++){land(s,2);assert.equal(s.base,values[Math.min(n,8)]);}
  assert.equal(s.base,15,'twelve repeated HITs retain 15 rather than summing prior awards');
 });
 run('five evenly spaced special pockets are excluded from the base',()=>{
  const s=state();for(const n of [1,6,11,16,21])land(s,n);
  assert.equal(s.base,0);assert.equal(s.jpHits,1);assert.equal(s.bonusTotal,14);assert.equal(s.remaining,39);assert.equal(s.payout,0);
  for(const n of ordinary)land(s,n);
  assert.equal(s.base,20);assert.equal(s.payout,20);
 });
 run('JP 4/5/6/7 HITs pay S/5S/10S/15S and never add a fixed 500',()=>{
  const s=state();for(let i=0;i<7;i++)land(s,2);assert.equal(s.base,10);
  for(let n=1;n<=7;n++){land(s,1);assert.equal(s.payout,n<5?10:50*(n-4));}
  assert.equal(s.payout,150);assert.equal(s.multiplier,15);
  land(s,3);assert.equal(s.base,11);assert.equal(s.payout,165,'normal payouts continue growing after JP');
 });
 run('each repeat bonus HIT adds its full configured number of balls',()=>{
  const s=state();for(const [pocket,bonus] of bonuses)for(let i=0;i<3;i++){
   const before=s.remaining;land(s,pocket);assert.equal(s.remaining,before-1+bonus);
  }
  assert.equal(s.bonusTotal,42);assert.equal(s.remaining,60);assert.equal(s.base,0);
 });
 run('the last in-flight ball can replenish an empty bank before completion',()=>{
  const s=state();for(let i=0;i<29;i++)land(s,2);
  const id=launch(s);assert.equal(s.remaining,0);assert.equal(R.isComplete(s),false,'an airborne ball keeps the round live');
  land(s,21,id);assert.equal(s.remaining,8);assert.equal(R.isComplete(s),false);
  flush(s);assert.equal(s.landed,38);assert.equal(s.bonusTotal,8);assert.equal(s.payout,15);
 });
 run('the final fifth JP HIT affects the final payout',()=>{
  const s=state();for(let i=0;i<25;i++)land(s,2);for(let i=0;i<4;i++)land(s,1);
  const id=launch(s);assert.equal(s.remaining,0);assert.equal(s.payout,15);assert.equal(R.isComplete(s),false);
  land(s,1,id);assert.equal(s.jpHits,5);assert.equal(s.payout,75);assert.equal(R.isComplete(s),true);
 });
 run('unissued, duplicate and conflicting results cannot change state',()=>{
  const s=state();let before=plain(s);R.acceptHit(s,{id:777,ball:777,pocket:21});assert.deepEqual(plain(s),before);
  const id=land(s,21);before=plain(s);
  for(const pocket of [21,1,2])R.acceptHit(s,{id,ball:id,pocket});R.acceptFault(s,id);R.launch(s,id);
  assert.deepEqual(plain(s),before,'an accepted launch ID cannot receive another award or refund');
  const pending=launch(s);before=plain(s);
  for(const pocket of [0,26,-1,1.5,NaN])R.acceptHit(s,{id:pending,ball:pending,pocket});
  assert.deepEqual(plain(s),before,'invalid pocket does not consume a pending physical ball');
  land(s,2,pending);
 });
 run('a physical fault returns one ball once and never manufactures a HIT',()=>{
  const s=state(),id=launch(s);assert.equal(s.remaining,29);
  R.acceptFault(s,id);invariant(s);assert.equal(s.remaining,30);assert.equal(s.landed,0);assert.equal(s.payout,0);
  const before=plain(s);R.acceptFault(s,id);R.acceptHit(s,{id,ball:id,pocket:21});assert.deepEqual(plain(s),before);
  land(s,2);assert.equal(s.remaining,29);assert.equal(s.landed,1);assert.equal(s.base,1);
 });
 run('zero-bank launches are rejected without modifying the completed round',()=>{
  const s=state();flush(s);const before=plain(s);R.launch(s,nextId++);assert.deepEqual(plain(s),before);assert.equal(s.payout,15);
 });

 run('native controller waits for the last ball and launches all eight bonus balls',()=>{
  const h=controller();
  for(let i=0;i<29;i++){const id=h.next();assert(id);h.hit(id,2);}
  const last=h.next();assert.equal(h.d.crystalState.remaining,0);h.d.update();assert.equal(h.d.state,'running');
  assert.equal(h.d.launch(),null,'native launch guard also refuses an empty bank');
  h.hit(last,21);assert.equal(h.d.crystalState.remaining,8,'physical HIT updates bank synchronously');
  for(let i=0;i<8;i++){assert.equal(h.d.state,'running');const id=h.next();assert(id);h.hit(id,2);}
  assert.equal(h.p.serial,38);h.d.update();assert.equal(h.d.state,'complete');invariant(h.d.crystalState);
  assert.equal(h.d.crystalState.landed,38);assert.equal(h.d.crystalState.payout,15);
 });
 run('native controller honors ten in-flight balls and charges only successful launches',()=>{
  const h=controller();h.p.blocked=true;h.next();assert.equal(h.d.crystalState.remaining,30);assert.equal(h.d.crystalState.launched,0);
  h.p.blocked=false;for(let i=0;i<10;i++)assert(h.next());
  assert.equal(h.p.active,10);assert.equal(h.d.crystalState.remaining,20);assert.equal(h.next(),null);
  h.hit(1,2);assert(h.next());assert.equal(h.p.active,10);assert.equal(h.d.crystalState.remaining,19);invariant(h.d.crystalState);
 });
 run('native fault recovery uses a new physical launch and has no duplicate refund',()=>{
  const h=controller();const id=h.next();h.fault(id);assert.equal(h.d.crystalState.remaining,30);
  h.d.acceptJpcFault(id);assert.equal(h.d.crystalState.remaining,30);
  const retry=h.next();assert.notEqual(retry,id);h.hit(retry,2);
  assert.equal(h.d.crystalState.landed,1);assert.equal(h.d.crystalState.refunded,1);invariant(h.d.crystalState);
 });
 run('native reset starts a fresh 30-ball session and preserves the selected variant',()=>{
  const h=controller();h.hit(h.next(),21);const prior=h.d.crystalState;h.d.reset();
  assert.equal(h.d.jpcVariant,'crystal');assert.equal(h.d.state,'ready');assert.equal(h.d.crystalState.remaining,30);assert.equal(h.d.crystalState.landed,0);assert.notEqual(h.d.crystalState,prior);
  h.d.jpcVariant='classic';h.d.reset();assert.equal(h.d.crystalState,null);
 });
 run('classic native JPC retains 70 launches, planner gating and final-flight draining',()=>{
  const h=controller('classic');let plannerOpen=false;h.d.canLaunchJpc=()=>plannerOpen;
  assert.equal(h.next(),null);plannerOpen=true;
  for(let i=0;i<69;i++){const id=h.next();assert(id);h.hit(id,2);}
  const last=h.next();assert.equal(last,70);assert.equal(h.d.crystalState,null);h.d.update();assert.equal(h.d.state,'running');assert.equal(h.next(),null);
  h.hit(last,2);h.d.update();assert.equal(h.d.state,'complete');assert.equal(h.p.hits.length,70);
 });
 run('Crystal native JPC has no empty-pocket targeting dependency',()=>{
  const h=controller();h.d.canLaunchJpc=()=>{throw Error('classic empty-pocket timing must not be used by Crystal');};
  assert(h.next());assert.equal(h.d.crystalState.launched,1);
 });
 run('Crystal native JPC keeps drawing beyond the classic 70-ball limit',()=>{
  const h=controller();for(let i=0;i<10;i++)h.hit(h.next(),21);
  while(h.d.crystalState.remaining){const id=h.next();assert(id,'positive bank always remains drawable');h.hit(id,2);}
  h.d.update();assert.equal(h.d.state,'complete');assert.equal(h.p.serial,110);assert.equal(h.d.crystalState.landed,110);assert.equal(h.d.crystalState.bonusTotal,80);invariant(h.d.crystalState);
 });

 // Run the bundled Cannon and unchanged production geometry. The initial seed
 // is fixed for reproducibility; HIT numbers are produced solely by world.step.
 const cannonStart=source.indexOf('CANNON=(()=>{'),cannonEnd=source.indexOf('})();',cannonStart)+5;
 const physicsStart=source.indexOf('const PHYSICS=(()=>{'),physicsEnd=source.indexOf('\nconst DRAW=',physicsStart)+1;
 assert(cannonStart>=0&&cannonEnd>cannonStart&&physicsStart>cannonEnd&&physicsEnd>physicsStart);
 vm.runInContext('const '+source.slice(cannonStart,cannonEnd)+'\n'+source.slice(physicsStart,physicsEnd)+'\nglobalThis.NativePhysics={CANNON,PHYSICS};',context);
 const p=new context.NativePhysics.PHYSICS.RoulettePhysics(context.NativePhysics.CANNON),d=new context.NativeDrawController(p);
 d.jpcVariant='crystal';d.select('jpc');d.start();p.seed=306031;
 p.onHit=hit=>{assert.equal(d.acceptJpcHit(hit),true,'every actual physical HIT belongs to its pending launched ball');};
 p.onFault=id=>{assert.equal(d.acceptJpcFault(id),true);};
 const began=performance.now(),maxPhysicsSeconds=1800;
 while(d.state==='running'&&p.time<maxPhysicsSeconds){d.update();p.step(1/120);p.balls=p.balls.filter(ball=>!ball.dead);}
 assert.equal(d.state,'complete','a native physical round drains within the bounded observation horizon');
 invariant(d.crystalState,'completed native physical round');assert.equal(d.crystalState.landed,p.hits.length);assert(p.hits.length>=30);
 assert.equal(p.active,0);assert.equal(d.crystalState.remaining,0);
 report.physical={seed:306031,physicsSeconds:p.time,elapsedMs:Math.round(performance.now()-began),launched:p.serial,landed:p.hits.length,faults:p.faults,bonusTotal:d.crystalState.bonusTotal,jpHits:d.crystalState.jpHits,base:d.crystalState.base,payout:d.crystalState.payout,hits:p.hits.map(hit=>({ball:hit.ball,pocket:hit.pocket,time:hit.time}))};
 report.cases.push('one complete seeded production Cannon round with actual HIT accounting');
 report.ok=true;
 console.log('JPC_CRYSTAL_V306_RULES_PASS',JSON.stringify({cases:report.cases,physical:{...report.physical,hits:undefined}}));
}catch(error){report.failure={message:String(error),stack:error.stack};throw error;}
finally{await fs.writeFile(path.join(output,'rules-report.json'),JSON.stringify(report,null,2)+'\n');}
