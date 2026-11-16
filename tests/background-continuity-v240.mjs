import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFile(new URL(p,root),'utf8');
const [index,game,keep,clientSource,loader,corePatch,html]=await Promise.all(['index.html','optimized/app-01.js','assets/shared-host-keepalive-v206.js','assets/shared-client-background-v240.js','assets/shared-machine-v176.js','assets/shared-core-patch-v221.js','monitor.html'].map(read));
assert.match(index,/pumpBackground:\(\)=>/,'host driver exposes worker-driven physics');
assert.match(index,/!window\.__sweetsSharedClientReady/,'shared client ignores hidden/menu automatic pause');
assert.match(index,/hostPhysicsGuard/,'host-only background physics guard is installed');
assert.equal(game.split('if(drawing&&!paused&&!document.hidden)').length-1,2,'renderer patch expects two matching guards');
assert.ok(loader.includes('shared-client-background-v240.js?v=240'),'extra background handler loaded');
assert.match(corePatch,/const finishedAttempt=\(!document.hidden\|\|window.SweetsHostKeepAliveV206\?\.capturePumpActive\)/,'completed hidden draw is recognized');
assert.match(html,/id="server-bet-now"/,'only the operator monitor has a BET button');
assert.doesNotMatch(index,/id="server-bet-now"/,'player page cannot start server BET');
new Function(clientSource);new Function(keep);
// A real hidden playing client unpauses its engines without starting a local
// roulette or touching credit, even when the browser fires visibilitychange.
const listeners={},app={phase:'playing',paused:true,credit:1000,pauseCalls:[],pause(next){this.pauseCalls.push(next);this.paused=next;}},window={__sweetsSharedClientReady:true,SweetsSharedMachine:{client:{online:true,ws:{}}},SweetsSharedControllerV224:{refreshNow(){window.snapshots=(window.snapshots||0)+1;return Promise.resolve();}}};
const document={hidden:true,addEventListener(name,fn){listeners[name]=fn;}};
const context={window,document,app,userPaused:false,console,location:{search:''},URLSearchParams,Date,setInterval(){return 1;},clearInterval(){},addEventListener(name,fn){listeners[name]=fn;}};
vm.runInNewContext(clientSource,context);
const bg=window.SweetsClientBackgroundV240;assert.ok(bg);assert.equal(bg.nudge(),true);assert.equal(app.paused,false);
app.paused=true;context.userPaused=true;assert.equal(bg.nudge(),false,'explicit user pause is respected');assert.equal(app.paused,true);
context.userPaused=false;document.hidden=false;listeners.visibilitychange();assert.equal(app.paused,false);assert.equal(window.snapshots,1,'returning to focus reconciles the server once');
listeners.focus();assert.equal(window.snapshots,1,'burst wakeups cannot flood the API');
window.SweetsSharedMachine.client.online=false;app.paused=true;assert.equal(bg.nudge(),false,'offline cannot fabricate gameplay');

// Run the actual Windows host worker integration in a bounded VM fixture.
let worker=null,now=0,manualFrames=0,physicalTicks=0,pauseCalls=0;
const handlers={};class Canvas{captureStream(){return {getVideoTracks(){return [{requestFrame(){manualFrames++}}]}};}};
class Worker{constructor(){worker=this;this.messages=[];}postMessage(value){this.messages.push(value);}terminate(){}}
const physicalRound={id:'r1',phase:'PLAYING',drawSource:'physical'},client={round:physicalRound,on(fn){this.notify=fn;}};
const w={__sweetsHostCaptureTrackV206:{requestFrame(){manualFrames++}},SweetsSharedMachine:{client}};
const doc={hidden:true,addEventListener(name,fn){handlers[name]=fn;},getElementById(id){return id==='cookie-roulette'?{anima8:{pumpBackground(){physicalTicks++;}}}:null;}};
const h={window:w,document:doc,location:{search:'?serverHost=1'},URLSearchParams,app:{paused:true,engines:[{paused:true}],pause(){}},rouletteDrawSource:{pause(){}},rouletteDriver:{setPaused(){pauseCalls++;}},HTMLCanvasElement:Canvas,Worker,Blob:class{},URL:{createObjectURL(){return 'blob:fake';},revokeObjectURL(){}},setTimeout(){return 1;},setInterval(){return 2;},clearInterval(){},addEventListener(name,fn){handlers[name]=fn;},console:{info(){},warn(){}},Date};
vm.runInNewContext(keep,h);
assert.ok(worker,'dedicated capture worker starts');
worker.onmessage({});assert.equal(physicalTicks,1);assert.ok(manualFrames>0);
worker.onmessage({});assert.equal(physicalTicks,2,'each hidden worker frame advances physics exactly once');
assert.ok(pauseCalls<=2,'host does not reset the physics accumulator every frame');
doc.hidden=false;worker.onmessage({});assert.equal(physicalTicks,2,'foreground RAF owns normal renderer ticks');
w.SweetsHostKeepAliveV206.setCaptureFps(60);assert.equal(worker.messages.at(-1).fps,60);
console.log('BACKGROUND_CONTINUITY_V240_PASS',{hiddenPhysicalTicks:physicalTicks,frameCaptures:manualFrames,avoidPhysicsReset:pauseCalls<=2,clientUnpaused:true,serverReconciled:true});
