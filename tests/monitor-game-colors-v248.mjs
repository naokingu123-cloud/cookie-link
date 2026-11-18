import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {stationView} from './stations-view-fixture-v236.mjs';

const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const ctx={window:{}};vm.createContext(ctx);
for(const path of ['assets/stations-number-preview-v241.js','assets/stations-progressive-v246.js'])vm.runInContext(await read(path),ctx);
const patched=ctx.window.SweetsStationProgressiveV246.patch(ctx.window.SweetsStationNumbersV241.patch(await read('assets/stations-v235.js')));
new vm.Script(patched);
const copy=value=>JSON.parse(JSON.stringify(value)),calculate=(bet,hundredths)=>Math.floor(bet*hundredths/100);
const basis='per-game-new-award-v248';
let producerCases=0;
function forecast(games){
 const engines=games.map(g=>({kind:g.kind||'jelly',version:1,phase:'settled',totalHundredths:g.base||0,...g.engine}));
 const bets=games.map(g=>g.bet),model={phase:'playing',token:1,draws:[3,7],locked:bets,bets,enabled:games.map(()=>true),paid:games.map(()=>false),roundWins:games.map(()=>0),totalWin:0,engines};
 const round={id:'colors-v248',phase:'PLAYING',balls:[{index:1,number:3},{index:2,number:7}],participant:{totalBet:bets.reduce((a,b)=>a+b,0)}};
 const view=stationView(patched,{id:'p',model,round});
 const slots=engines.map((engine,i)=>({engine,tabReachVersion:1,reachStatus:games[i].pending?'pending':'ready',tabReachBase:games[i].base||0,tabReachResults:games[i].hits||[]}));
 let reads=0;const detail=copy(view.api.currentDetail(model,round,view.shared.active,slots,s=>{reads++;return s.tabReachResults;},calculate));
 producerCases++;return {detail,reads,model,round,view,slots};
}
const hit=(number,total,extra={})=>({number,total,...extra});
const color=(d,n)=>d.numberColorTiers[n-1],gain=(d,n)=>d.numberGains[n-1];

// A small game's 3x is significant even when the combined BET is much larger.
let result=forecast([{bet:100,hits:[hit(12,300)]},{bet:10000,hits:[]}]);
assert.equal(gain(result.detail,12),300);assert.ok(300/(100+10000)<3);assert.equal(color(result.detail,12),1);
assert.equal(result.detail.colorBasis,basis);
assert.equal(result.detail.numberColorTiers.length,25);assert.equal(color(result.detail,3),null);assert.equal(color(result.detail,7),null);

// The next award's medal increase is the basis; accumulated WIN and the old
// generic reach tier cannot independently create a colored number.
result=forecast([{bet:100,base:6000,engine:{allClears:2,state:{highestRole:true}},hits:[hit(12,6200,{tier:3})]}]);
assert.equal(result.detail.achievedTier,3,'already-earned highest role remains an achieved award');
assert.equal(gain(result.detail,12),200);assert.equal(color(result.detail,12),0);assert.deepEqual(result.detail.highestReachNumbers,[]);
result=forecast([{bet:100,hits:[hit(12,5000,{tier:3})]}]);
assert.equal(color(result.detail,12),2,'50x without an actual highest role stays at the 10x tier');
assert.deepEqual(result.detail.highestReachNumbers,[]);
result=forecast([{bet:100,hits:[hit(12,1,{allClear:true,tier:0})]}]);
assert.equal(gain(result.detail,12),1);assert.equal(color(result.detail,12),3,'a new actual highest role can award less than 3x');
assert.deepEqual(result.detail.highestReachNumbers,[12]);

result=forecast([{bet:100,hits:[hit(11,299),hit(12,300),hit(13,999),hit(14,1000)]}]);
assert.deepEqual([11,12,13,14].map(n=>color(result.detail,n)),[0,1,1,2],'3x and 10x boundaries are inclusive');
result=forecast([{bet:3,base:34,hits:[hit(12,333),hit(13,334)]}]);
assert.deepEqual([12,13].map(n=>gain(result.detail,n)),[8,9]);
assert.deepEqual([12,13].map(n=>color(result.detail,n)),[0,1],'compare rounded medal increases against the individual BET');

result=forecast([{kind:'choco',bet:100,base:6000,engine:{bonusResolvedDepth:500},hits:[
 hit(11,6001,{highestRole:'canyonBonus',bonusDepth:500}),
 hit(12,6001,{highestRole:'canyonBonus',bonusDepth:600}),
 hit(13,6001,{highestRole:'canyonBonus',bonusDepth:550}),
 hit(14,6001,{highestRole:'canyonBonus',bonusDepth:400}),
 hit(15,6001,{tier:3,bonusDepth:700})
]}]);
assert.deepEqual([11,12,13,14,15].map(n=>color(result.detail,n)),[0,3,0,0,0]);
assert.deepEqual(result.detail.highestReachNumbers,[12],'only a newly resolved complete Canyon depth bonus is a highest-role reach');
result=forecast([{kind:'cookie',bet:100,hits:[hit(12,1,{highestRole:'canyonBonus',bonusDepth:600})]}]);
assert.equal(color(result.detail,12),0,'Canyon-only metadata cannot promote another game');
result=forecast([{kind:'choco',bet:100,engine:{bonusResolvedDepth:400},hits:[hit(12,1,{highestRole:'canyonBonus',bonusDepth:500})]}]);
assert.equal(color(result.detail,12),3,'the first newly resolved 500-depth bonus qualifies');
result=forecast([{bet:100,hits:[hit(12,300)]},{bet:1000,hits:[hit(12,1000)]},{bet:1,hits:[hit(12,100,{allClear:true})]}]);
assert.equal(gain(result.detail,12),10301);assert.equal(color(result.detail,12),3,'simultaneous 3x, 10x and a true highest role choose the strongest tier');

const simultaneous=[
 {bet:100,hits:[hit(12,300),hit(14,300)]},
 {bet:10000,hits:[hit(13,1000),hit(14,1000)]},
 {bet:1,hits:[hit(15,100,{allClear:true}),hit(3,100,{allClear:true})]}
];
result=forecast(simultaneous);
assert.deepEqual([12,13,14,15].map(n=>gain(result.detail,n)),[300,100000,100300,1]);
assert.deepEqual([12,13,14,15].map(n=>color(result.detail,n)),[1,2,2,3]);
assert.deepEqual(result.detail.highestReachNumbers,[15],'already drawn highest-role numbers are excluded');
assert.deepEqual(result.detail.best,{numbers:[14],gain:100300,tier:2},'largest amount is not automatically the highest-role color');
result=forecast([...simultaneous,{bet:5000,pending:true,hits:[hit(12,9000,{allClear:true})]}]);
const partial=result.detail;
assert.equal(partial.prediction,'partial');assert.equal(partial.best,null);assert.equal(partial.readyGames,3);assert.equal(partial.totalGames,4);assert.equal(result.reads,3);
assert.deepEqual([12,13,14,15].map(n=>color(partial,n)),[1,2,2,3],'confirmed colors survive while another game is unknown');
assert.equal(gain(partial,12),300,'pending cache values must not enter the known subtotal');
result=forecast([{bet:100,pending:true,hits:[hit(12,9000,{allClear:true})]}]);
assert.equal(result.detail.prediction,'updating');assert.equal(result.detail.numberGains,null);assert.equal(result.detail.numberColorTiers,null);

// Exercise the exact service implementation extracted from the production
// loader. Authentication/seat checks and expiry use the same code as admin IO.
const loader=await read('server-core-loader-v220.mjs'),start=loader.indexOf('function createMonitorForecastsV241('),end=loader.indexOf('\nlet source=',start);
assert.ok(start>=0&&end>start);
let now=1000,online=true;
const service=vm.runInNewContext('('+loader.slice(start,end).trim()+')')({connected:()=>online,now:()=>now});
const machine={id:'public-01',hostPlayerId:'host',stationsV235:{seats:[{kind:'human',playerId:'p'},{kind:'human',playerId:'host'}]},round:{id:'colors-v248',phase:'PLAYING',balls:[{index:1,number:3},{index:2,number:7}],participants:{p:{totalBet:15101},host:{totalBet:10}}}};
const record=d=>service.record(machine,'p',{roundId:machine.round.id,detail:d});
const snapshot=()=>copy(service.snapshot(machine));
assert.equal(record(partial),true);let snap=snapshot().p;
assert.equal(snap.colorBasis,basis);assert.equal(snap.partial,true);assert.equal(snap.readyGames,3);assert.equal(snap.totalGames,4);
assert.deepEqual(snap.colorTiers,partial.numberColorTiers);assert.deepEqual(snap.gains,partial.numberGains);
const exported=service.snapshot(machine).p;exported.colorTiers[11]=3;exported.gains[11]=999;
assert.equal(snapshot().p.colorTiers[11],1);assert.equal(snapshot().p.gains[11],300,'returned arrays cannot mutate the saved forecast');
const unconfirmed=copy(partial);unconfirmed.numberColorTiers[11]=3;
assert.equal(record(unconfirmed),true);assert.equal(snapshot().p.colorTiers[11],0,'rainbow also requires the same number in highestReachNumbers');
const noAward=copy(partial);noAward.numberGains[14]=0;
assert.equal(record(noAward),true);assert.equal(snapshot().p.colorTiers[14],0,'no new medal award cannot retain a highest-role color');
const legacy=copy(partial);delete legacy.colorBasis;delete legacy.numberColorTiers;
assert.equal(record(legacy),true);snap=snapshot().p;assert.deepEqual(snap.gains,partial.numberGains);assert.equal(snap.colorTiers,null);assert.equal(snap.colorBasis,null);
assert.equal(record({...partial,colorBasis:'aggregate-old-rule'}),true);assert.equal(snapshot().p.colorTiers,null,'unknown color semantics never restore aggregate coloring');

const malformed=[undefined,Array(24).fill(0),Array(26).fill(0),...[NaN,Infinity,-1,4,.5,'2'].map(value=>{const a=[...partial.numberColorTiers];a[11]=value;return a;})];
for(const numberColorTiers of malformed){
 assert.equal(record(partial),true);assert.equal(record({...partial,numberColorTiers}),false);
 assert.deepEqual(snapshot(),{},'malformed color metadata removes the previous forecast');
}
assert.equal(record(partial),true);
assert.equal(service.record(machine,'host',{roundId:machine.round.id,detail:partial}),false,'the host cannot submit a player forecast even when seated');
assert.equal(service.record(machine,'outsider',{roundId:machine.round.id,detail:partial}),false);
assert.equal(service.record(machine,'p',{roundId:'other-round',detail:partial}),false);
assert.deepEqual(snapshot().p.gains,partial.numberGains,'foreign attempts cannot replace the live player forecast');
assert.equal(record({...partial,roundId:'other-round'}),false);assert.deepEqual(snapshot(),{});
assert.equal(record(partial),true);online=false;assert.deepEqual(snapshot(),{},'disconnected players have no visible forecast');online=true;
assert.equal(record(partial),true);now+=12001;assert.deepEqual(snapshot(),{},'expired colors and amounts disappear together');
assert.equal(record(partial),true);machine.round.participants.p.settlement={totalWin:1};assert.deepEqual(snapshot(),{});delete machine.round.participants.p.settlement;
assert.equal(record(partial),true);machine.round.balls.push({index:3,number:12});assert.deepEqual(snapshot(),{},'a new ball invalidates all prior number colors');
assert.equal(record(partial),false,'the previous ball count cannot reintroduce colors');
machine.round.balls.pop();assert.equal(record(partial),true);machine.round.id='new-round';assert.deepEqual(snapshot(),{},'colors never cross a round boundary');
console.log('MONITOR_GAME_COLORS_V248_PASS',JSON.stringify({producerCases,malformedMetadata:malformed.length,individualBetTiers:true,newAwardOnly:true,newHighestOnly:true,partialColors:true,serverGuards:true}));
