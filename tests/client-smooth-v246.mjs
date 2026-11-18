import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const read=p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [patch,bundle,upgrade,clientSource,hostSource,displayTests,previousTests]=await Promise.all([
 'assets/client-render-patch-v246.js','optimized/app-01.js','assets/cookie-upgrade-patches.js','assets/shared-roulette-client-v224.js','assets/shared-roulette-webrtc-host-v224.js','tests/shared-v229-video-display.mjs','tests/shared-v225-video-reconnect.mjs'].map(read));
const noLog={info(){},warn(){},error(){}};
function cadence(host){const c={window:{},location:{search:host?'?serverHost=1':''},URLSearchParams,console:noLog,setTimeout(){return 1;}};vm.createContext(c);vm.runInContext(patch,c);return c;}
const c=cadence(false);vm.runInContext(upgrade,c);const upgraded=c.window.CookieUpgradePatch.patch(bundle),patched=c.window.SweetsRenderPatchV246.patch(upgraded);
new vm.Script(patched);
assert.equal((patched.match(/physics\.step\(physicsDt\)/g)||[]).length,(upgraded.match(/physics\.step\(physicsDt\)/g)||[]).length,'physics integration remains unchanged');
assert.ok(patched.includes('serverHostPage?window.SweetsRenderCadenceV246.hostFps()'));
assert.ok(patched.includes('miniPaintedV246>=2'));
assert.equal(c.window.SweetsRenderCadenceV246.activeInterval(),1000/60);
for(let i=0;i<5;i++)c.window.SweetsRenderCadenceV246.recordClient(23);
assert.equal(c.window.SweetsRenderCadenceV246.activeInterval(),1000/30);
for(let i=0;i<240;i++)c.window.SweetsRenderCadenceV246.recordClient(3);
assert.equal(c.window.SweetsRenderCadenceV246.activeInterval(),1000/60,'long stable recovery, not oscillation');
const host=cadence(true);host.window.SweetsHostKeepAliveV206={captureFps:60};assert.equal(host.window.SweetsRenderCadenceV246.hostFps(),60);
for(let i=0;i<5;i++)host.window.SweetsRenderCadenceV246.recordHost(25);
assert.equal(host.window.SweetsRenderCadenceV246.hostFps(),30);
host.window.SweetsHostKeepAliveV206.captureFps=24;assert.equal(host.window.SweetsRenderCadenceV246.hostFps(),24);
function section(source,a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,a);return source.slice(start,end);}
// Run the actual flushUI with ten dirty thumbnails. Only the selected one
// and two inactive previews may draw per frame; every preview eventually draws.
const painted=[],slots=Array.from({length:10},(_,i)=>({i,dirtyMini:true,dirtyMain:false}));let deferred=0;
const ui={uiPending:true,uiApp:{phase:'playing',paused:false},document:{hidden:false},inView:true,payoutStamp:null,slots,active:0,allNineMode:true,window:{SweetsRenderCadenceV246:{deferUI(){deferred++;}}},miniature(s){painted.push(s.i);},render(){},syncPendingHitTiles(){},updateMiniResults(){},hud(){},syncPresentationRate(){},syncBetPreview(){},scheduleUI(){}};
vm.createContext(ui);vm.runInContext(section(patched,'function flushUI(timestamp){','// Predefined irregular fractures'),ui);
vm.runInContext('flushUI(1000)',ui);assert.deepEqual(painted,[0,1,2]);assert.equal(deferred,1);
for(let i=1;i<=4;i++)vm.runInContext('flushUI('+(1000+40*i)+')',ui);
assert.deepEqual(painted,[0,1,2,3,4,5,6,7,8,9]);
const fixture=new Function('assert','vm','clientSource','hostSource','previousTests',section(displayTests,'const flush=','const cases=[]')+'\nreturn {viewer,attach,flush};');
const proxy={runInNewContext(source,context,options){context.document.hidden=false;context.document.addEventListener=(name,fn)=>{if(name==='visibilitychange')context.__visible=fn;};context.document.removeEventListener=()=>{};return vm.runInNewContext(source,context,options);}};
const fx=fixture(assert,proxy,clientSource,hostSource,previousTests),viewer=fx.viewer();await fx.flush();
const peer=await fx.attach(viewer);viewer.video('p2p').frame();viewer.api.health();assert.equal(viewer.api.source,'p2p');
const restarts=()=>viewer.messages.filter(m=>m.type==='rtc_restart').length;
const before=restarts();viewer.context.document.hidden=true;viewer.context.__visible();await viewer.clock.advance(12000);viewer.api.health();
assert.equal(restarts(),before,'hidden rVFC suspension cannot trigger a peer restart');assert.equal(peer.closed,false);
viewer.context.document.hidden=false;viewer.context.__visible();viewer.api.health();assert.equal(peer.closed,false,'wake-up grace preserves the current video');
viewer.video('p2p').frame();await viewer.clock.advance(1000);viewer.video('p2p').frame();await viewer.clock.advance(900);viewer.video('p2p').frame();viewer.api.health();
assert.equal(viewer.api.source,'p2p');assert.equal(restarts(),before);
const receiver={jitterBufferTarget:null};peer.ontrack({streams:[{getVideoTracks:()=>[]}],receiver});assert.equal(receiver.jitterBufferTarget,80,'optional 80ms target applies to received video only');
assert.ok(clientSource.includes('if(document.hidden)return;\n  if(!framesSupported'));
assert.ok(clientSource.includes('frameReadyV246={job,pending}'));
assert.ok(clientSource.includes('lag>1.8'));
assert.ok(!clientSource.includes('end-video.currentTime>.9'));
console.log('CLIENT_SMOOTH_V246_PASS',JSON.stringify({activeTarget:60,lowPowerTarget:30,miniPerFrame:2,hiddenPeerRestart:0,jitterTargetMs:80,physicsUnchanged:true}));
