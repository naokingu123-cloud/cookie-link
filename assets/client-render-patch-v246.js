/* v246: visual cadence only. No random draws, time-scale, wager or wallet changes. */
(()=>{
'use strict';
const query=new URLSearchParams(location.search),isHost=query.get('serverHost')==='1';
let hostTarget=60,clientTarget=60,hostBad=0,hostGood=0,clientBad=0,clientGood=0,deferred=0;
function sample(cost,host){
 if(!Number.isFinite(cost)||cost<0)return;
 if(host){
  if(cost>18){hostBad++;hostGood=0;}else{hostBad=Math.max(0,hostBad-1);if(cost<10)hostGood++;else hostGood=0;}
  if(hostBad>=5){hostTarget=30;hostBad=0;}if(hostTarget===30&&hostGood>=180){hostTarget=60;hostGood=0;}
 }else{
  if(cost>17){clientBad++;clientGood=0;}else{clientBad=Math.max(0,clientBad-1);if(cost<9)clientGood++;else clientGood=0;}
  if(clientBad>=5){clientTarget=30;clientBad=0;}if(clientTarget===30&&clientGood>=240){clientTarget=60;clientGood=0;}
 }
}
window.SweetsRenderCadenceV246={
 hostFps(){return Math.max(24,Math.min(hostTarget,Number(window.SweetsHostKeepAliveV206?.captureFps)||60));},
 activeInterval(){return 1000/clientTarget;},
 recordHost(cost){if(isHost)sample(cost,true);},recordClient(cost){if(!isHost)sample(cost,false);},
 deferUI(callback){if(deferred)return;deferred=setTimeout(()=>{deferred=0;callback();},32);},
 describe(){return {hostTarget,clientTarget,inactiveMiniPerFrame:2};}
};
function patch(source){
 const once=(from,to,label)=>{const count=source.split(from).length-1;if(count!==1)throw Error('[RenderCadence246] '+label+' matches='+count);source=source.replace(from,to);};
 once('const renderFps=ultraLightRoulette?10:30;',
  'const renderFps=serverHostPage?window.SweetsRenderCadenceV246.hostFps():(ultraLightRoulette?10:30);','actual host render cap');
 once('if(drawing&&!paused&&now-paintStamp<1000/renderFps){wake();return;}paintStamp=now;',
  'if(drawing&&!paused&&now-paintStamp<1000/renderFps-.75){wake();return;}paintStamp=now;const renderCostStartV246=performance.now();','avoid refresh quantization');
 once('renderer.render(scene,camera);if(drawing&&!paused&&!document.hidden)wake();',
  'renderer.render(scene,camera);window.SweetsRenderCadenceV246.recordHost(performance.now()-renderCostStartV246);if(drawing&&!paused&&!document.hidden)wake();','measure existing render cost');
 once('if(s.candyLastDraw&&now-s.candyLastDraw<32){carnivalQueueFrame(s);return;}s.candyLastDraw=now;drawCarnival(s,now);',
  'if(s.candyLastDraw&&now-s.candyLastDraw<(s.i===active?window.SweetsRenderCadenceV246.activeInterval():100)-.75){carnivalQueueFrame(s);return;}s.candyLastDraw=now;const paintCostV246=performance.now();drawCarnival(s,now);if(s.i===active)window.SweetsRenderCadenceV246.recordClient(performance.now()-paintCostV246);','active candy animation');
 once('s.chocoFrame=0;s.chocoLastDraw=now;drawChoco(s,now);',
  's.chocoFrame=0;if(s.chocoLastDraw&&now-s.chocoLastDraw<(s.i===active?window.SweetsRenderCadenceV246.activeInterval():100)-.75){chocoQueueFrame(s);return;}s.chocoLastDraw=now;const paintCostV246=performance.now();drawChoco(s,now);if(s.i===active)window.SweetsRenderCadenceV246.recordClient(performance.now()-paintCostV246);','active canyon animation');
 once(` for(const slot of slots)if(slot.dirtyMini){
  const inactiveAll=allNineMode&&slot.i!==active;
  if(inactiveAll&&slot.miniLastPaint!=null&&timestamp-slot.miniLastPaint<140)continue;
  slot.dirtyMini=false;slot.miniLastPaint=timestamp;miniature(slot);
 }`,
 ` let miniDeferredV246=false,miniPaintedV246=0;
 for(const slot of slots)if(slot.dirtyMini){
  const inactiveAll=allNineMode&&slot.i!==active;
  if(inactiveAll&&(miniPaintedV246>=2||slot.miniLastPaint!=null&&timestamp-slot.miniLastPaint<140)){miniDeferredV246=true;continue;}
  slot.dirtyMini=false;slot.miniLastPaint=timestamp;miniature(slot);if(inactiveAll)miniPaintedV246++;
 }
 if(miniDeferredV246)window.SweetsRenderCadenceV246.deferUI(()=>scheduleUI(uiApp));`, 'spread inactive thumbnail paints');
 return source;
}
window.SweetsRenderPatchV246={patch};
})();
