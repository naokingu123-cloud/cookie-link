/* Curated real-rule witnesses for presentation QA. These checkpoints only enter
 * an isolated CI server; production contains no award trigger or QA endpoint. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
export const encode=value=>JSON.parse(JSON.stringify(value,(_key,v)=>Object.prototype.toString.call(v)==='[object Set]'?{$set:[...v]}:Object.prototype.toString.call(v)==='[object Map]'?{$map:[...v]}:v));
const engineData=e=>Object.fromEntries(Object.entries(e).filter(([key,value])=>typeof value!=='function'&&!['version','cycle','phase','running','busy','paused','presentationRate','roundBet','beforeComplete','onEvent','random','sleep'].includes(key)));
async function loadRules(file,name){const context=vm.createContext({Math,console});vm.runInContext(await fs.readFile(file,'utf8'),context);return context[name];}
async function core(file){const module={exports:{}};new Function('module',await fs.readFile(file,'utf8'))(module);return module.exports;}
export async function buildAwardFixtures(){
 const fixtures={};
 const record=(game,fields,draws,next,proof,extra={})=>fixtures[game]={game,fields:encode(fields),draws:[...draws],next,proof,...extra};
 const classic=require('./payout-v232-classic-sample.cjs').load();
 for(let seed=1;seed<=100&&!fixtures.cookie;seed++){
  const events=[],e=new classic.Engine({random:random(seed*7919),colorCount:5,onEvent:event=>events.push(event)}),fields=engineData(e);
  // The first two balls are only previewed in the grouped Cookie engine.
  const before=encode(fields);e.wait=async()=>true;e.running=true;e.accepted=3;e.queue=[[1,2,3]];await e.drain();
  const award=events.find(v=>v.phase==='link'&&(v.gain>0||v.newRecord));
  if(award)fixtures.cookie={game:'cookie',fields:before,draws:[1,2],next:3,proof:{seed:seed*7919,event:award.phase,gain:award.gain,groupSizes:award.groups.map(g=>g.size)}};
 }
 assert(fixtures.cookie,'a genuine Cookie grouped-draw award witness exists');
 for(let seed=1;seed<=100&&!fixtures.choco;seed++){
  const events=[],e=new classic.ChocoDigEngine({random:random(seed*7919),colorCount:5,onEvent:event=>events.push(event)});
  assert.equal(e.drawMode,'single');e.visualWait=async()=>true;e.running=true;
  // Canyon consumes each received ball immediately. Store the real checkpoint
  // after the first two separate draws, including renewed drill numbers and
  // already collected ore; a grouped [1,2,3] plan is a different board history.
  e.accepted=2;e.seen=new Set([1,2]);e.queue=[[1],[2]];await e.drain();
  assert(!events.some(event=>event.phase==='error'),'Canyon prior draws execute without engine errors');
  assert.equal(e.processed,2);assert.deepEqual([...e.drawn],[1,2]);
  const before=encode(engineData(e));events.length=0;
  e.accepted=3;e.seen.add(3);e.queue=[[3]];await e.drain();
  assert(!events.some(event=>event.phase==='error'),'Canyon final draw executes without engine errors');
  assert.equal(e.processed,3);
  const award=events.find(v=>['canyonCollect','canyonBonus'].includes(v.phase)&&v.gain>0);
  if(award)record('choco',before,[1,2],3,{seed:seed*7919,event:award.phase,gain:award.gain,drawMode:'single',processedBefore:2,processedAfter:e.processed});
 }
 assert(fixtures.choco,'a genuine Canyon drill/collect witness exists');
 const six=require('./sixdrop-v247-fixture.cjs').R;
 for(let seed=1;seed<=100&&!fixtures.candy;seed++){
  const state=six.newGame({bet:3000,rate:90,seed});
  for(let number=1;number<=25;number++){
   const plan=six.hit(state,number,{trace:true,preview:true}),role=plan.timeline.find(s=>s.phase==='pyramidAward'&&s.forms.length);
   if(role){record('candy',{state,pyramid:state.grid,initialPyramid:state.grid,processed:0,accepted:0,queue:[],drawn:new Set(),seen:new Set(),pendingDraws:new Set()},[],number,{seed,event:role.phase,roles:role.forms.map(f=>f.type),gain:role.gain,winMedals:role.winMedals});break;}
  }
 }
 assert(fixtures.candy,'a genuine Six Drop gravity/role witness exists');
 const gelatoSource=await fs.readFile('assets/gelato-prism-v28.js','utf8'),start=gelatoSource.indexOf(' const H=106,'),end=gelatoSource.indexOf(' const path=nodes=>');
 const Gelato=new Function('wonderTier',gelatoSource.slice(start,end)+';return GelatoEngine;')(()=>1);
 const ge=new Gelato(random(277),()=>{},async()=>{});ge.wait=async()=>true;ge.running=true;
 const tipNumbers=[0,1,5,13,17,18].map(i=>ge.nodeNumbers[i]),prior=tipNumbers.slice(0,-1);
 ge.accepted=prior.length;ge.seen=new Set(prior);ge.queue=[prior];await ge.drain();
 assert(ge.predict(tipNumbers.at(-1)).allClear);
 record('gelato',engineData(ge),prior,tipNumbers.at(-1),{event:'gelatoFill',allClear:true,nodeIds:[0,1,5,13,17,18]});
 const W=await core('assets/winery-pyramid-core-v1.js'),we=new W.WineryEngine({random:random(277),sleep:async()=>{}});
 we.wait=async()=>true;we.running=true;const boosts=we.boostNumbers.slice();we.accepted=4;we.seen=new Set(boosts);we.queue=[boosts];await we.drain();
 const wp=we.nodeNumbers.map(n=>we.predict(n)).sort((a,b)=>b.gain-a.gain)[0];assert(wp.gain>0);
 record('winery',engineData(we),boosts,wp.number,{event:'wineryAward',gain:wp.gain,full:wp.full,power:we.power});
 const P=await core('assets/popcorn-engine.js');
 for(let seed=1;seed<=100&&!fixtures.popcorn;seed++){
  const rng=random(seed*7919),state=P.create({bet:3000,rate:90,rng});
  for(let turn=0;turn<8;turn++){
   const choices=state.numbers.filter(n=>!state.drawn.includes(n)).map(number=>({number,...P.preview(state,number)})).sort((a,b)=>b.win-a.win||b.count-a.count),best=choices[0];
   assert(best);const before=structuredClone(state),oldWin=state.win,trace=P.draw(state,best.number,rng);
   if(trace.count>0&&state.win>oldWin){record('popcorn',{state:before,queue:[],trace:null,processed:before.turn,accepted:before.turn,elapsed:0,drawn:new Set(before.drawn)},before.drawn,best.number,{seed,event:'popcornDraw',count:trace.count,clear:trace.clear,waves:trace.waves.length,win:state.win-oldWin});break;}
  }
 }
 assert(fixtures.popcorn,'a genuine Popcorn payout witness exists');
 const J=await loadRules('assets/jelly-rules.js','JellyRules'),seeds=[0,4,20,24];
 let jelly={...J.create({rate:90,rng:random(277)}),numbers:Array.from({length:25},(_,i)=>i+1),seeds,colors:Array.from({length:25},(_,i)=>seeds.includes(i)?'blue':null),draws:[],open:new Set(),lines:[],oddsMultiplier:1};
 const jellyDraws=[2,9,12,17,19,6,15,23];for(const n of jellyDraws.slice(0,-1))jelly=J.draw(jelly,n).state;
 const jellyNext=J.draw(jelly,jellyDraws.at(-1));assert.equal(jellyNext.state.lines.length,12);assert(jellyNext.trace.newLines.length);
 record('jelly',{state:jelly,queue:[],trace:null,processed:7,accepted:7,elapsed:0,oddsStart:null,drawn:new Set(jellyDraws.slice(0,-1))},jellyDraws.slice(0,-1),jellyDraws.at(-1),{event:'jellyPour',newLines:[...jellyNext.trace.newLines],allClear:true});
 const waffleContext={Math,console,performance:{now:()=>0},document:{getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),head:{append(){}}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1};waffleContext.window=waffleContext;vm.createContext(waffleContext);
 vm.runInContext(await fs.readFile('assets/bingo-stick-rules.js','utf8'),waffleContext);const B=waffleContext.BingoStickRules;
 waffleContext.BingoStick={engine:{version:0,roundBet:3000,reset(){this.state=B.create({target:90});}}};
 vm.runInContext(await fs.readFile('assets/waffle-pow-v159.js','utf8'),waffleContext);
 const waffle=B.createDemo();let waffleState=waffle.state;
 for(const n of waffle.draws){const next=B.draw(waffleState,n);if(next.lastBaseHundredths>0){record('stick',{state:waffleState,queue:[],processed:waffleState.draws.length,accepted:waffleState.draws.length,drawn:new Set(waffleState.draws)},waffleState.draws,n,{event:'flipping',flipped:[...next.flipped],gain:next.lastBaseHundredths});break;}waffleState=next;}
 assert(fixtures.stick,'a genuine bracketed Waffle flip witness exists');
 const C=await loadRules('assets/party-castella-rules.js','PartyCastellaRules'),castella=C.createDemo();let cake=castella.state;
 for(const n of castella.draws.slice(0,-1))cake=C.draw(cake,n);const finalCake=C.draw(cake,castella.draws.at(-1));assert.equal(finalCake.bakedCount,61);assert.equal(finalCake.phase,'done');
 record('castella',{state:cake,queue:[],processed:7,accepted:7,drawn:new Set(cake.draws)},cake.draws,castella.draws.at(-1),{event:'settled',baked:61,totalHundredths:finalCake.totalHundredths,highest:true});
 const D=await loadRules('assets/dango-bingo-rules.js','DangoBingoRules');let dango=D.create({moldIndex:1,numbers:Array.from({length:25},(_,i)=>i+1)});
 for(const id of [2,7,11,16,22])dango=D.draw(dango,dango.numbers[id]);
 for(const id of [1,8,13,15,17,18])dango=D.placeFree(dango,id);
 dango=D.commitFree(dango,{autoFill:false});dango=D.draw(dango,dango.numbers[19]);
 const finalDango=D.draw(dango,dango.numbers[20]);assert(finalDango.newHighestRoles.includes(6));assert(finalDango.newLines.length);
 record('dango',{state:dango,liveBoard:true,queue:[],processed:6,accepted:6,drawn:new Set(dango.draws),animationLines:[],placementStartLines:[],thinkingClosesAt:0},dango.draws,dango.numbers[20],{event:'settled',newLines:[...finalDango.newLines],newHighestRoles:[...finalDango.newHighestRoles],highest:true});
 return fixtures;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const fixtures=await buildAwardFixtures();console.log(JSON.stringify(Object.values(fixtures).map(({game,draws,next,proof})=>({game,draws,next,proof})),null,2));
}
