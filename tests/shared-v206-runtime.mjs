import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const hostSource=await readFile(new URL('../assets/shared-host-keepalive-v206.js',import.meta.url),'utf8');
let workerInstance=null,driverCalls=0,frameCalls=0;
class WorkerMock{constructor(){workerInstance=this;this.onmessage=null;}terminate(){}}
class BlobMock{constructor(parts){this.parts=parts;}}
const track={requestFrame(){frameCalls++;},contentHint:''};
function Canvas(){}
Canvas.prototype.captureStream=function(){return {getVideoTracks(){return [track];}}};
const hostRound={id:'host-round',phase:'PLAYING',drawSource:'physical'};
const hostContext={
 window:null,location:{search:'?serverHost=1'},URLSearchParams,
 URL:{createObjectURL(){return 'blob:host-test';},revokeObjectURL(){}},Blob:BlobMock,Worker:WorkerMock,
 HTMLCanvasElement:Canvas,document:{addEventListener(){}},addEventListener(){},setTimeout(){},console,
 app:{paused:true,engines:[{paused:true}],pause(){}},rouletteDrawSource:{pause(){}},
 rouletteDriver:{setPaused(value){assert.equal(value,false);driverCalls++;}},SweetsSharedMachine:null
};
hostContext.window=hostContext;
hostContext.SweetsSharedMachine={client:{round:hostRound,on(){}}};
vm.runInNewContext(hostSource,hostContext);
new hostContext.HTMLCanvasElement().captureStream(24);
assert.equal(driverCalls,1,'initial activation must resume the physical driver once');
for(let index=0;index<12;index++)workerInstance.onmessage();
assert.equal(driverCalls,1,'24 fps capture heartbeat must not reset the physical clock');
assert.ok(frameCalls>=12,'capture heartbeat must still request video frames');
hostContext.app.pause(true);
assert.equal(driverCalls,2,'a real pause attempt must resume the physical driver');

const recoverySource=await readFile(new URL('../assets/shared-recovery-completion-v206.js',import.meta.url),'utf8');
let interval=null,now=1000,finishCalls=0;
class FakeDate extends Date{static now(){return now;}}
const engine={presentationRate:60,processed:8,accepted:8,queue:[],busy:true,running:true,totalHundredths:250,paused:true};
const app={
 phase:'playing',draws:[1,2,3,4,5,6,7,8],engines:[engine],enabled:[true],paid:[false],roundWins:[0],locked:[100],
 dealing:true,fastForward:true,paused:true,
 finishRound(){finishCalls++;this.phase='result';this.totalWin=this.roundWins.reduce((sum,value)=>sum+value,0);},onChange(){}
};
const round={id:'recovery-round',phase:'COMPLETE',participant:{checkpoint:{
 phase:'playing',paid:[false],roundWins:[0],engines:[{processed:8,totalHundredths:250}]
}}};
const recoveryContext={
 window:null,location:{search:''},URLSearchParams,setTimeout(){},setInterval(callback){interval=callback;return 1;},console,Date:FakeDate,app,
 medalWin(bet,hundredths){return Math.floor(bet*hundredths/100);},countdownText(){},SweetsSharedMachine:null
};
recoveryContext.window=recoveryContext;
recoveryContext.SweetsSharedMachine={active:{roundId:round.id},client:{pendingRound:round,round:null}};
vm.runInNewContext(recoverySource,recoveryContext);
interval();
assert.equal(finishCalls,0,'a live recovery callback must receive a brief grace period');
now+=700;interval();
assert.equal(finishCalls,1,'a restored eighth ball must enter the normal result flow');
assert.equal(app.phase,'result');
assert.equal(app.roundWins[0],250);
assert.equal(app.fastForward,false);
assert.equal(engine.presentationRate,1);

console.log('v206 host clock and recovered result runtime regressions passed');
