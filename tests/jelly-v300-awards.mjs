/* Reachable native Jelly traces feed the real shared semantic/activation
 * functions. This checks amounts, timing, paths and accessible announcements;
 * generated pixels and browser scheduling have separate integration gates. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {buildJellyFixtures,replayJellyFixture,loadJelly,nativeCore,plain,reviveJellyState,serializeJellyState,serializeJellyTrace,ORACLE_LINES} from './jelly-v300-fixtures.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
function section(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'actual production source boundaries exist: '+start+' / '+end);return source.slice(a,b);
}
export function loadJellyOwner({bet=3000}={}){
 const owner=read('assets/award-presentation-v277.js'),view=read('assets/jelly-view.js');
 const popup=view.match(/^const oddsPopupMs=.*;$/m)?.[0];assert(popup);
 const timing=new Function(popup+'\n'+section(view,'const wallSplit=','let lastTurn,paths=')+'\nreturn {duration,lineRevealAt:waveEnd,oddsRevealAt:waveStart,oddsPopupMs,partitionBreakAt:wallSplit};')();
 const K=loadJelly(nativeCore(),{forbidAmbientRandom:true}),app={locked:[bet]},sounds=[],layers=[];
 const window={JellyRules:K,JellyView:timing,SweetsLineup:{ids:['jelly']},SweetsAudioV277:{award:event=>sounds.push(plain(event))}};
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('Jelly presentation sampled ambient RNG');};
 const context=vm.createContext({window,app,console,Math:safeMath,active:0,layer:(record,mini)=>layers.push({record,mini}),
  medalWin:(wager,hundredths)=>Math.floor(wager*hundredths/100)});
 const program=[section(owner,'const clamp=','function target('),section(owner,'function semantic(','function recordFor('),
  section(owner,'function ownsClass(','function clear('),section(owner,'function activate(','function tick('),
  'globalThis.__jellyOwner={semantic,ownsClass,activate,finishCurrent,jellySnapshot:typeof jellySnapshot==="function"?jellySnapshot:null};'].join('\n');
 vm.runInContext(program,context,{filename:'production-jelly-semantic-v300.js'});
 return {...context.__jellyOwner,window,app,K,timing,sounds,layers,source:owner};
}
function element(){const classes=new Set();return {dataset:{},classes,classList:{toggle(name,on){on?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)}};}
export function jellySlot(step,bet){
 const before=reviveJellyState(step.trace.before),trace={...plain({...step.trace,before:null}),before};
 return {i:0,engine:{kind:'jelly',state:reviveJellyState(step.after),trace,roundBet:bet,accepted:step.ball,processed:step.ball-1},panel:element(),tab:element()};
}
const engineData=engine=>({kind:engine.kind,state:serializeJellyState(engine.state),trace:serializeJellyTrace(engine.trace),roundBet:engine.roundBet,accepted:engine.accepted,processed:engine.processed});
export function inspectJellyCue(h,step,bet){
 h.app.locked[0]=bet;const slot=jellySlot(step,bet),before=engineData(slot.engine);
 // Native jelly-host emits only the phase, so the number must be derived from
 // the current real state instead of depending on a synthetic event property.
 const cue=h.semantic(slot,{phase:'jellyPour'},{});
 assert.deepEqual(engineData(slot.engine),before,'semantic observation does not alter any native state, trace or count');return {slot,cue};
}
function expectedSnapshot(step){const o=step.oracle;return {
 number:step.number,ball:step.ball,index:o.index,color:o.color,totalLines:o.totalLines,newLineCount:o.newLineCount,previousLines:o.previousLines,
 lineIds:o.lineIds,newLineIds:o.newLineIds,oddsMultiplier:o.oddsMultiplier,previousOdds:o.previousOdds,oddsReason:o.oddsReason,
 wetCells:o.wetCells,beforeRecipe:o.beforeRecipe,afterRecipe:o.afterRecipe,payoutVersion:o.payoutVersion,waveCounts:o.waveCounts,totalHundredths:o.totalHundredths,sugarLines:o.sugarLines
};}
export function verifyJellyCue(h,step,bet){
 const {slot,cue}=inspectJellyCue(h,step,bet),want=step.oracle;
 assert.equal(h.timing.lineRevealAt(slot.engine.trace),want.delay);assert.equal(h.timing.duration(slot.engine.trace),want.nativeDuration);
 assert.equal(h.timing.oddsRevealAt(slot.engine.trace),want.oddsRevealAt);assert.equal(h.timing.oddsPopupMs,1600);
 if(!want.award){assert.equal(cue,null,'wet-only, odds-only and no-line events never synthesize a monetary BINGO');return null;}
 assert(cue);assert.equal(cue.game,'jelly');assert.equal(cue.phase,'jellyPour');assert.equal(cue.number,step.number);
 assert.equal(cue.kind,'bingo');assert.equal(cue.gain,want.totalHundredths);assert.equal(cue.total,true);assert.equal(cue.retained,true);
 assert.equal(cue.win,want.payoutWin,'Jelly shows its exact current total, never the incremental rounded difference');
 assert.equal(cue.highest,want.full12);assert.equal(cue.tier,want.tier);assert.equal(cue.delay,want.delay);
 assert.equal(cue.label,want.totalLines+' LINE BINGO!');assert.equal(cue.detail,want.full12?'12ライン 全完成':'今回 '+want.newLineCount+'ライン完成');
 assert.deepEqual(plain(cue.paths),want.newLineIds.map(id=>({anchors:ORACLE_LINES[id].map(cell=>({id:cell})),closed:false,hull:false})),
  'every newly completed native line keeps its five actual cell anchors');
 assert.equal(cue.state,slot.engine.state,'native geometry keeps the unchanged state reference');
 assert(cue.jelly,'a real monetary Jelly event carries its immutable snapshot');assert.deepEqual(plain(cue.jelly),expectedSnapshot(step));
 assert(Object.isFrozen(cue.jelly));
 for(const key of ['lineIds','newLineIds','waveCounts']){
  assert(Object.isFrozen(cue.jelly[key]));assert.throws(()=>{cue.jelly[key][0]=999;},TypeError);
 }
 assert.notEqual(cue.jelly.lineIds,slot.engine.state.lines);assert.notEqual(cue.jelly.newLineIds,slot.engine.trace.newLines);
 assert.throws(()=>{cue.jelly.totalLines=999;},TypeError);
 const captured=JSON.stringify(cue.jelly);
 slot.engine.state.lines.length=0;slot.engine.state.colors.fill(null);slot.engine.state.oddsMultiplier=99;
 slot.engine.trace.newLines.length=0;slot.engine.trace.wave.length=0;slot.engine.trace.before.lines.length=0;
 assert.equal(JSON.stringify(cue.jelly),captured,'later queued state changes cannot rewrite captured count, recipe, odds or line IDs');
 return cue;
}

export function testJellyAwards(){
 const h=loadJellyOwner(),fixtures=buildJellyFixtures(),events=[];
 for(const fixture of fixtures)for(const step of fixture.steps){
  const cue=verifyJellyCue(h,step,fixture.bet);
  if(cue)events.push({fixture:fixture.id,ball:step.ball,totalLines:cue.jelly.totalLines,newLines:cue.jelly.newLineIds,gain:cue.gain,win:cue.win,tier:cue.tier,delay:cue.delay});
 }
 const low=fixtures.find(f=>f.id==='low-bet'),zero=inspectJellyCue(h,low.steps[4],5),retained=inspectJellyCue(h,low.steps[7],5);
 assert.deepEqual([zero.cue.win,retained.cue.win,low.steps[7].oracle.deltaWin],[0,1,0]);
 const full=fixtures.find(f=>f.id==='all-line').steps[7],fullCue=inspectJellyCue(h,full,300000).cue;
 assert.equal(fullCue.win,90000000);assert.equal(fullCue.tier,4);

 // Current/old checkpoints select their original schedule. Missing version is
 // legacy version zero rather than the new constructor's current version.
 const legacy=[];
 for(const options of [{legacyCheckpoint:true},{payoutVersion:231},{payoutVersion:232}]){
  const f=replayJellyFixture('low-bet',options);
  for(const step of f.steps)if(step.oracle.award){const cue=verifyJellyCue(h,step,5);legacy.push({version:step.after.payoutVersion??0,ball:step.ball,win:cue.win,gain:cue.gain});}
 }
 for(const phase of ['ready','complete','settled','jellyOdds'])assert.equal(h.semantic(jellySlot(full,300000),{phase},{}),null);
 const oddsOnly=fixtures.find(f=>f.id==='ten-line-odds').steps[7];assert.equal(inspectJellyCue(h,oddsOnly,300000).cue,null);

 // Exercise the actual activation, audio and retained-path functions. The
 // accessible amount must include 0 as well as ordinary and highest totals.
 const announcements=[];
 for(const {slot,cue} of [zero,retained,inspectJellyCue(h,full,300000)]){
  const record={slot,current:null,pending:[],retained:[],status:{textContent:''}};
  cue.key='jelly-native-'+cue.number;h.activate(record,cue);
  assert.equal(record.current,cue);assert.equal(cue.age,0);assert.equal(cue.sounded,true);
  assert.equal(record.status.textContent,cue.label+'。'+cue.detail+'。現在の配当 '+cue.win.toLocaleString('ja-JP')+' WIN');
  assert.deepEqual(h.sounds.at(-1),{game:'jelly',tier:cue.tier,key:cue.key,kind:'bingo',win:cue.win});
  assert.equal(h.layers.at(-1).mini,false);assert(slot.panel.classes.has('award-v277-owned'));
  announcements.push(record.status.textContent);h.finishCurrent(record);assert.equal(record.current,null);assert.equal(record.retained.length,1);
  assert.deepEqual(plain(record.retained[0].paths),plain(cue.paths));assert.notEqual(record.retained[0].paths,cue.paths);
 }
 return {nativeDraws:40,monetaryCues:events.length,events,legacy,announcements,lowBet:{zeroWin:zero.cue.win,retainedTotal:retained.cue.win,increment:0},
  fullWin:fullCue.win,oddsOnlyNoMoney:true,oddsPopupMs:1600,immutableSnapshot:true,totalGainTierTimingPaths:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('JELLY_V300_AWARDS_PASS',JSON.stringify(testJellyAwards()));
