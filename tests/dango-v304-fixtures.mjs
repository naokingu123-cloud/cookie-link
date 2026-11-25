/* Reachable Dango traces: native deterministic opening, actual eight balls,
 * and only legal FREE choices at the five-ball boundary. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
export const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
export const plain=value=>JSON.parse(JSON.stringify(value));
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const BASELINE_RULES='e61d3421e71022ef271c1f9ef0c885c80e59c0587278cf6db2cd0174dde8b86b';
export const BASELINE_HOST='33e68ffd30d0c052fe54725b907b6ed63063873e652aa816dff2ccf9a2b61c6a';
export function loadRules(){const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('Dango fixture sampled ambient RNG');};const c=vm.createContext({console,Math:safeMath});vm.runInContext(read('assets/dango-bingo-rules.js'),c);return c.DangoBingoRules;}
export const R=loadRules();
export const specs=Object.freeze({
 ordinary:{draws:[1,2,3,4,5,6,7,8],manual:null,revision:288,bet:3000},
 highest:{draws:[1,2,3,5,6,9,10,14],manual:[15,20,0,21],revision:288,bet:300000},
 'legacy-zero':{draws:[1,2,3,4,5,6,7,8],manual:null,revision:287,bet:5}
});
export function replayDango(id,{bet=specs[id]?.bet}={}){
 const spec=specs[id];assert(spec,'known Dango fixture');
 let state=R.create({rulesRevision:spec.revision,moldIndex:0,placementPolicy:'max',seed:304,numbers:Array.from({length:25},(_,i)=>i+1),triggerCells:[1,2,3]});
 const initial=plain(state),steps=[];
 for(const [index,number]of spec.draws.entries()){
  if(index===5){
   const before=plain(state),beforeRoles=plain(R.highestRolesFor(state)),startLines=state.completedLines.slice();
   if(spec.manual)for(const id of spec.manual){state=R.placeFree(state,id);assert(state,'legal manual FREE');}
   else state=R.autoPlace(state);
   const placement=plain(state);state=R.commitFree(state,{autoFill:false});assert(state,'actual commit after five balls');
   const lines=state.completedLines.filter(id=>!startLines.includes(id)),roles=R.highestRolesFor(state).filter(n=>!beforeRoles.includes(n));
   steps.push({kind:'commit',number:before.draws.at(-1),ball:5,before,placement,after:plain(state),animationLines:plain(lines),beforeRoles,oracle:expected(state,lines,roles,bet,true)});
  }
  const before=plain(state);state=R.draw(state,number);assert(state&&state.draws.length===index+1,'native accepted number exactly once');
  steps.push({kind:'draw',number,ball:index+1,before,after:plain(state),animationLines:plain(state.newLines),beforeRoles:plain(R.highestRolesFor(before)),oracle:expected(state,state.newLines,state.newHighestRoles,bet,false)});
 }
 return {id,bet,initial,draws:spec.draws.slice(),manual:spec.manual?.slice()||null,steps,final:plain(state)};
}
function expected(state,lineIds,roles,bet,committed){
 const monetary=!!(lineIds.length||roles.length),award=monetary||!committed&&state.lastBonusGain>0;
 return {award,role:roles.length?'highest':lineIds.length?'bingo':'free',monetary,newLineIds:plain(lineIds),highestRoles:plain(roles),totalLines:state.completedLines.length,
  gain:monetary?state.totalHundredths:0,win:monetary?Math.floor(bet*state.totalHundredths/100):0,
  freeGain:Number(state.lastBonusGain)||0,freeBudget:state.freeBudget,oddsMultiplier:state.oddsMultiplier,delay:lineIds.length?180:0};
}
export function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,'production boundary '+start);return source.slice(a,b);}
export function loadDangoOwner({bet=3000}={}){
 const source=read('assets/award-presentation-v277.js'),app={locked:[bet]},window={DangoBingoRules:R,SweetsLineup:{ids:['dango']}},c=vm.createContext({console,window,app,Math,active:0,layer:()=>{},ownsClass:()=>{},medalWin:(w,h)=>Math.floor(w*h/100)});
 vm.runInContext(section(source,'const clamp=','function target(')+section(source,'function semantic(','function recordFor(')+section(source,'function activate(','function finishCurrent(')+'\nglobalThis.owner={semantic,dangoSnapshot,activate};',c);return {...c.owner,app,source};
}
export function inspectCue(owner,step,bet){
 owner.app.locked[0]=bet;const state=plain(step.after),slot={i:0,engine:{kind:'dango',state,roundBet:bet,animationLines:step.animationLines.slice()}};
 const record={liveDepth:step.kind==='draw'?1:0,commitDepth:step.kind==='commit'?1:0,beforeDraws:step.before.draws.length,beforeRoles:step.beforeRoles.slice()};
 const before=JSON.stringify(slot);const cue=owner.semantic(slot,{phase:'settled'},record);assert.equal(JSON.stringify(slot),before,'observation never changes a native state');return {cue,slot,record};
}
