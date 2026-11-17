import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const source=await read('assets/shared-client-hidden-v246.js'),index=await read('index.html'),loader=await read('assets/shared-machine-v176.js');
new vm.Script(source);
assert.match(loader,/shared-client-hidden-v246\.js\?v=\d+/);
for(const s of ['const paused=!app||app.paused||document.hidden||!inView;if(s.chocoClockStamp==null)','while(token===e.version&&s.reachStatus===\'pending\')await new Promise(resolve=>setTimeout(resolve,16));','if(!a.paused&&!document.hidden&&inView)remaining-=Math.min(50,now-last);'])assert.ok(index.includes(s),'native completion patch contract: '+s);
let now=Date.now(),worker=null,creditAdds=0,results=0,payouts=0,balls=0;
const handlers={};class WorkerMock{
 constructor(url){this.url=url;this.messages=[];worker=this;}
 postMessage(value){this.messages.push(value);}
 terminate(){}
}
const app={phase:'result',paused:false,credit:973000,totalWin:2700,result:{elapsed:0,duration:1800},payout:null,
 engines:[{sleep(){return new Promise(()=>{});}}],
 advanceResult(ms){results++;this.result.elapsed+=ms;if(this.result.elapsed>=1800){this.phase='paying';creditAdds++;this.credit+=2700;this.payout={elapsed:0,duration:2200};}return true;},
 advancePayout(ms){payouts++;this.payout.elapsed+=ms;if(this.payout.elapsed>=2200)this.phase='complete';return true;}
};
const document={hidden:true,addEventListener(name,cb){handlers[name]=cb;},removeEventListener(){}};
const window={__sweetsSharedClientReady:true,SweetsSharedMachine:{client:{online:true}},SweetsClientBackgroundV240:{nudge(){return true;},restore(){}}};
const context={app,window,document,userPaused:false,location:{search:''},URLSearchParams,URL:{createObjectURL(){return 'blob:mock';},revokeObjectURL(){}},Blob:class{},Worker:WorkerMock,Date,console,
 setInterval(){return 1;},clearInterval(){},addEventListener(name,cb){handlers[name]=cb;}};
vm.runInNewContext(source,context);
const bg=window.SweetsHiddenGameV246;assert.ok(bg?.workerActive);assert.ok(worker);
for(let i=1;i<=12;i++)bg.pump(now+i*500);
assert.equal(app.phase,'complete','hidden worker advances result AND payout');
assert.equal(creditAdds,1,'native phase can credit WIN only once');assert.equal(app.credit,975700);assert.equal(balls,0,'no local ball draw');
assert.ok(results>0&&payouts>0);
const completeCredit=app.credit;for(let i=13;i<=22;i++)bg.pump(now+i*500);assert.equal(app.credit,completeCredit,'no duplicate credit after completion');
document.hidden=false;app.phase='result';app.result={elapsed:0,duration:1800};handlers.visibilitychange();bg.pump(now+18000);
assert.equal(app.result.elapsed,0,'the foreground RAF owns result progression');
document.hidden=true;context.userPaused=true;handlers.visibilitychange();bg.pump(now+19000);
assert.equal(app.result.elapsed,0,'explicit pause is respected');context.userPaused=false;
// Timers created while hidden have a worker-backed resolution path even if
// the browser clamps or freezes main-thread setTimeout callbacks.
bg.installSleeps();const sleepPromise=app.engines[0].sleep(40);
const message=worker.messages.find(x=>x.type==='sleep');
assert.ok(message&&message.ms===40);worker.onmessage({data:{type:'pulse',at:now+19060,due:[message.id]}});
await sleepPromise;assert.equal(bg.outstandingSleeps,0,'finished wake is cleaned up');
console.log('HIDDEN_RESULT_V246_PASS',{resultCalls:results,payoutCalls:payouts,once:creditAdds,workerSleep:true});
