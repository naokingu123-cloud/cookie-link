import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {R,read,plain,sha256,BASELINE_RULES,BASELINE_HOST,replayDango,loadDangoOwner,inspectCue} from './dango-v304-fixtures.mjs';
export function testDangoAwards(){
 assert.equal(sha256(read('assets/dango-bingo-rules.js')),BASELINE_RULES,'all current and historical rules unchanged');
 assert.equal(sha256(read('assets/dango-bingo-host.js')),BASELINE_HOST,'native timing, accepted input and settlement unchanged');
 const owner=loadDangoOwner(),events=[];
 for(const id of ['ordinary','highest','legacy-zero']){
  const fixture=replayDango(id);
  for(const step of fixture.steps){
   const {cue,slot,record}=inspectCue(owner,step,fixture.bet),o=step.oracle;
   if(!o.award){assert.equal(cue,null,'a repaint/odds-only/no-line event has no new monetary award');continue;}
   assert(cue&&cue.dango);assert.equal(cue.game,'dango');assert.equal(cue.phase,'settled');assert.equal(cue.total,true);assert.equal(cue.retained,true);
   assert.equal(cue.win,o.win);assert.equal(cue.gain,o.gain);assert.equal(cue.delay,o.delay);assert.equal(cue.highest,o.role==='highest');
   const d=cue.dango;assert.equal(d.totalLines,o.totalLines);assert.equal(d.newLineCount,o.newLineIds.length);assert.deepEqual(plain(d.newLineIds),o.newLineIds);assert.deepEqual(plain(d.highestRoles),o.highestRoles);
   assert.equal(d.freeGain,o.freeGain);assert.equal(d.freeBudget,o.freeBudget);assert.equal(d.oddsMultiplier,o.oddsMultiplier);assert.equal(d.committed,step.kind==='commit');
   assert(Object.isFrozen(d));for(const key of ['lineIds','newLineIds','highestRoles','lineCounts'])assert(Object.isFrozen(d[key]));
   const snapshot=JSON.stringify(d);slot.engine.state.completedLines.length=0;slot.engine.state.lineCounts[7]=99;slot.engine.state.freeBudget=99;assert.equal(JSON.stringify(d),snapshot,'queued awards keep exact immutable native counts');
   const announced={slot,status:{textContent:''}};owner.activate(announced,cue);if(o.monetary)assert(announced.status.textContent.includes(o.win.toLocaleString('ja-JP')+' WIN'),'accessible real payout includes zero');else assert(!announced.status.textContent.includes('WIN'),'FREE only never announces money');
   const silent={...record,liveDepth:0,commitDepth:0};assert.equal(owner.semantic(slot,{phase:'settled'},silent),null,'manual preview or restored repaint does not replay an award');
   for(const phase of ['ready','waiting','complete'])assert.equal(owner.semantic(slot,{phase},record),null);
   events.push({fixture:id,kind:step.kind,ball:step.ball,role:o.role,win:cue.win,gain:cue.gain});
  }
  assert.equal(fixture.final.draws.length,8);assert.equal(fixture.final.phase,'done');assert.equal(fixture.final.totalHundredths,R.payout(fixture.final));
 }
 assert(events.some(e=>e.role==='free'&&e.win===0));assert(events.some(e=>e.role==='bingo'&&e.win===0),'real legacy low-BET zero keeps a valid BINGO');assert(events.some(e=>e.role==='highest'&&e.win===450000000));
 return {events,rulesHash:BASELINE_RULES,hostHash:BASELINE_HOST};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href)console.log('DANGO_V304_AWARDS_PASS',JSON.stringify(testDangoAwards()));
