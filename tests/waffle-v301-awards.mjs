/* Reachable real Waffle events exercise the actual shared semantic and
 * activation functions. Presentation preserves native gain/tier/rays/delay,
 * while its received WIN uses the same cumulative rounding as the host. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {buildWaffleFixtures,loadWaffle,plain} from './waffle-v301-fixtures.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,'actual production boundary: '+start);return source.slice(a,b);}
export function loadWaffleOwner({bet=3000}={}){
 const owner=read('assets/award-presentation-v277.js'),app={locked:[bet]},sounds=[],layers=[],R=loadWaffle();
 const window={BingoStickRules:R,SweetsLineup:{ids:['stick']},SweetsAudioV277:{award:event=>sounds.push(plain(event))}};
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('Waffle presentation sampled ambient RNG');};
 const context=vm.createContext({window,app,console,Math:safeMath,active:0,layer:(record,mini)=>layers.push({record,mini}),medalWin:(wager,hundredths)=>Math.floor(wager*hundredths/100)});
 vm.runInContext([section(owner,'const clamp=','function target('),section(owner,'function project(','function convexHull('),section(owner,'function semantic(','function recordFor('),
  section(owner,'function ownsClass(','function clear('),section(owner,'function activate(','function tick('),
  'globalThis.__waffleOwner={semantic,project,waffleSnapshot,ownsClass,activate,finishCurrent};'].join('\n'),context,{filename:'production-waffle-semantic-v301.js'});
 return {...context.__waffleOwner,window,app,R,sounds,layers,source:owner};
}
function element(){const classes=new Set();return {dataset:{},classes,classList:{toggle(name,on){on?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)}};}
export function waffleSlot(step,bet){return {i:0,engine:{kind:'stick',state:plain(step.after),roundBet:bet,accepted:step.ball,processed:step.ball,
 get totalHundredths(){throw Error('the staged host animation total must not supply an event amount');}},panel:element(),tab:element()};}
export function inspectWaffleCue(h,step,bet){
 h.app.locked[0]=bet;const slot=waffleSlot(step,bet),before=plain(slot.engine.state);
 // Native startMove emits only its phase and already increments processed;
 // a synthetic event number or trace is not needed by this semantic path.
 const cue=h.semantic(slot,{phase:'flipping'},{});assert.deepEqual(plain(slot.engine.state),before);return {slot,cue};
}
function expectedSnapshot(step){const o=step.oracle;return {
 number:step.number,ball:step.ball,color:o.color,placedCell:o.origin>=0?o.origin:null,flippedCount:o.flips,flippedIds:o.flipped,flipSteps:o.flipSteps,lastKnockRows:o.rows,
 gradeBefore:o.oldGrade,gradeAfter:o.grade,powActive:o.pow,reversalThisMove:o.reversalThisMove,reversalCount:o.reversalCount,
 baseHundredths:o.baseGainHundredths,bonusHundredths:o.bonusGainHundredths,previousHundredths:o.previousTotalHundredths,totalHundredths:o.totalHundredths,incrementHundredths:o.gain,
 nativeOldWin:o.previousTotalWin,nativeTotalWin:o.totalWin,nativeWinDelta:o.deltaWin,rackBefore:o.oldRack,rackAfter:o.rack,
 opponentBefore:step.before.counts[o.color==='black'?'white':'black'],opponentAfter:step.after.counts[o.color==='black'?'white':'black']
};}
export function verifyWaffleCue(h,step,bet){
 const {slot,cue}=inspectWaffleCue(h,step,bet),o=step.oracle;
 if(!o.award){assert.equal(cue,null,'zero flips, off-board POW and a past retained highest role never invent a monetary cue');return null;}
 assert(cue);assert.equal(cue.game,'stick');assert.equal(cue.phase,'flipping');assert.equal(cue.number,step.number);
 assert.equal(cue.kind,o.reversalThisMove?'clear':'shape');assert.equal(cue.highest,o.reversalThisMove);assert.equal(cue.gain,o.gain);assert.equal(cue.total,false);assert.equal(cue.retained,false);
 assert.equal(cue.win,o.deltaWin,'the actual per-turn received amount includes a native carry and a legitimate zero');assert.equal(cue.tier,o.tier);assert.equal(cue.delay,o.delay);
 assert.equal(cue.label,o.reversalThisMove?'REVERSAL BONUS!':o.flips+' FLIP!');assert.equal(cue.detail,o.reversalThisMove?'相手のワッフルを全反転':o.flips+'枚のワッフルを反転');
 assert.equal(cue.state,slot.engine.state);assert.deepEqual(plain(cue.paths),o.paths.map(ids=>({anchors:ids.map(id=>({id})),closed:false,hull:false})));
 assert.deepEqual(plain(cue.waffle),expectedSnapshot(step));assert(Object.isFrozen(cue.waffle));
 for(const key of ['flippedIds','flipSteps','lastKnockRows','rackBefore','rackAfter']){assert(Object.isFrozen(cue.waffle[key]));assert.throws(()=>{cue.waffle[key][0]=999;},TypeError);}
 for(const flip of cue.waffle.flipSteps){assert(Object.isFrozen(flip));assert.throws(()=>{flip.id=999;},TypeError);}
 assert.throws(()=>{cue.waffle.flippedCount=999;},TypeError);assert.notEqual(cue.waffle.flippedIds,slot.engine.state.flipped);assert.notEqual(cue.waffle.rackAfter,slot.engine.state.rack);
 for(const [width,height,mini] of [[294,294,false],[116,116,true],[47,47,true],[430,372,false]])for(const id of [o.origin,...o.flipped]){
  const p=h.project(slot,{id},width,height,mini,step.after),side=Math.min(width,height),rim=.064*side,unit=(side-2*rim)/8;
  assert.deepEqual(plain(p),{x:(width-side)/2+rim+(id%8+.5)*unit,y:(height-side)/2+rim+(Math.floor(id/8)+.5)*unit,r:.46*unit});
 }
 const saved=JSON.stringify(cue.waffle);slot.engine.state.colors.fill(null);slot.engine.state.flipped.length=0;slot.engine.state.flipSteps.length=0;
 slot.engine.state.rack.fill(0);slot.engine.state.lastRack.fill(0);slot.engine.state.lastKnockRows.length=0;slot.engine.state.turnTotals.length=0;slot.engine.state.counts.black=999;
 assert.equal(JSON.stringify(cue.waffle),saved,'queued native state changes cannot rewrite the captured event, rack, POW or money values');return cue;
}
export function testWaffleAwards(){
 const h=loadWaffleOwner(),fixtures=buildWaffleFixtures(),events=[];
 for(const f of fixtures)for(const step of f.steps){const cue=verifyWaffleCue(h,step,f.bet);if(cue)events.push({fixture:f.id,ball:step.ball,flips:cue.waffle.flippedCount,pow:cue.waffle.powActive,rows:plain(cue.waffle.lastKnockRows),gain:cue.gain,win:cue.win,tier:cue.tier,delay:cue.delay});}
 const byId=Object.fromEntries(fixtures.map(f=>[f.id,f])),zero=inspectWaffleCue(h,byId['zero-one'].steps[4],1),carry=inspectWaffleCue(h,byId['carry-seven'].steps[6],7),reversal=inspectWaffleCue(h,byId['black-reversal'].steps[6],300000);
 assert.deepEqual([zero.cue.win,carry.cue.win,reversal.cue.win],[0,3,900600000]);
 assert.deepEqual([carry.cue.waffle.nativeOldWin,carry.cue.waffle.nativeTotalWin,carry.cue.gain],[1,4,40]);
 assert.equal(reversal.cue.waffle.incrementHundredths,reversal.cue.waffle.baseHundredths+reversal.cue.waffle.bonusHundredths);
 for(const phase of ['ready','waiting','settled','complete','pow'])assert.equal(h.semantic(waffleSlot(byId['black-reversal'].steps[6],300000),{phase},{}),null);
 assert.equal(inspectWaffleCue(h,byId['black-reversal'].steps[7],300000).cue,null,'a later zero-flip ball cannot replay the prior reversal');
 const announcements=[];
 for(const {slot,cue} of [zero,carry,reversal]){
  const record={slot,current:null,pending:[],retained:[],status:{textContent:''}};cue.key='waffle-native-'+cue.number;
  h.window.WaffleAwardV301={loaded:true};h.activate(record,cue);
  assert.equal(record.current,cue);assert.equal(cue.age,0);assert.equal(cue.sounded,true);
  assert.equal(record.status.textContent,cue.label+'。'+cue.detail+'。獲得配当 '+cue.win.toLocaleString('ja-JP')+' WIN');
  assert.deepEqual(h.sounds.at(-1),{game:'stick',tier:cue.tier,key:cue.key,kind:cue.kind,win:cue.win});assert.equal(h.layers.at(-1).mini,false);
  assert(slot.panel.classes.has('award-v277-owned'));assert(slot.panel.classes.has('waffle-v301-award-owned'));announcements.push(record.status.textContent);
  h.finishCurrent(record);assert.equal(record.current,null);assert.equal(record.retained.length,0);h.ownsClass(record,false);assert(!slot.panel.classes.has('waffle-v301-award-owned'));
  record.pending=[cue];h.ownsClass(record,true);assert(!slot.panel.classes.has('waffle-v301-award-owned'),'pending-only events cannot hide the native POW/board presentation');
  record.current=cue;h.window.WaffleAwardV301.loaded=false;h.ownsClass(record,true);assert(!slot.panel.classes.has('waffle-v301-award-owned'),'failed artwork leaves the existing native presentation available');
 }
 return {fixtures:fixtures.length,nativeDraws:fixtures.reduce((n,f)=>n+f.steps.length,0),monetaryCues:events.length,events,announcements,
  lowBet:{validZero:0,carry:3,oldIndependentRounding:2},reversalEventWin:900600000,immutableSnapshot:true,unchangedGainTierTimingRays:true,nativeGeometry:true,stagedTotalIgnored:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('WAFFLE_V301_AWARDS_PASS',JSON.stringify(testWaffleAwards()));
