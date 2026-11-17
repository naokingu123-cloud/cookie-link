/* Separate rAF-driven game state from painting for already-accepted hidden rounds. */
import fs from 'node:fs';
const changes=new Map();const read=p=>changes.get(p)??fs.readFileSync(p,'utf8');
function edit(p,a,b,label){const s=read(p);if(s.split(a).length!==2)throw Error(label+' source mismatch in '+p);changes.set(p,s.replace(a,b));}
function hook(path,anchor,body){
 const code=`\n// v246: the hidden-tab worker calls only the normal logical advance.\n// No canvas painting, RNG prediction or extra draw is introduced.\nengine.pumpHiddenV246=function(elapsed){\n if(!document.hidden||!window.__sweetsSharedClientReady||app.phase!=='playing'||app.paused||!app.enabled[id]||!engine.running||jpcSession.active)return false;\n const dt=Math.max(0,Math.min(100,Number(elapsed)||0));if(!dt)return false;\n ${body}\n return true;\n};\n`;
 edit(path,anchor,anchor+code,'hidden native advance');
}
hook('assets/jelly-host.js','slot.paintJelly=paint;','stamp=0;clock+=dt;advance(dt);');
hook('assets/popcorn-host.js','slot.paintPopcorn=paint;','stamp=0;clock+=dt;step(dt);');
hook('assets/bingo-stick-host.js','slot.paintStick=paint;','stamp=null;clock+=animating?Math.min(90,dt*engine.presentationRate):dt;if(animating)advanceMove();');
hook('assets/party-castella-host.js','slot.paintCastella=paint;','stamp=null;clock+=dt;');
const hidden='assets/shared-client-hidden-v246.js';
edit(hidden," if(a.paused||at-lastAdvance<RESULT_PULSE_MS)return false;",` if(a.paused)return false;
 if(a.phase==='playing'&&elapsed>0){
  for(const engine of a.engines||[])if(typeof engine.pumpHiddenV246==='function'){
   try{engine.pumpHiddenV246(Math.min(100,elapsed));}catch(error){console.warn('[HiddenGame246] game clock',engine.kind,error);}
  }
 }
 if(at-lastAdvance<RESULT_PULSE_MS)return false;`, 'advance queued single-HIT engines without canvas');
// These main canvases had independent 30/25fps paint caps. Lift only PAINT,
// retaining each engine's original clock and the existing thumbnail cadence.
const rate="(window.SweetsRenderCadenceV246?.activeInterval?.()??32)-.75";
edit('assets/jelly-host.js','if(active===id&&clock-lastMain>=32){paint(false);lastMain=clock;}',`if(active===id&&clock-lastMain>=${rate}){const paintStartV246=performance.now();paint(false);lastMain=clock;window.SweetsRenderCadenceV246?.recordClient?.(performance.now()-paintStartV246);}`, 'jelly active paint cadence');
edit('assets/popcorn-host.js','if(selected&&(fastSupply||clock-lastMain>=33)){paint(false);lastMain=clock;}',`if(selected&&(fastSupply||clock-lastMain>=${rate})){const paintStartV246=performance.now();paint(false);lastMain=clock;window.SweetsRenderCadenceV246?.recordClient?.(performance.now()-paintStartV246);}`, 'popcorn active paint cadence');
edit('assets/bingo-stick-host.js','if(active===id&&(animating||clock-lastMain>=32)){paint(false);lastMain=clock;}',`if(active===id&&clock-lastMain>=${rate}){const paintStartV246=performance.now();paint(false);lastMain=clock;window.SweetsRenderCadenceV246?.recordClient?.(performance.now()-paintStartV246);}`, 'waffle active paint cadence');
edit('assets/party-castella-host.js','if(active===id&&clock-lastMain>=40){paint(false);lastMain=clock;}',`if(active===id&&clock-lastMain>=${rate}){const paintStartV246=performance.now();paint(false);lastMain=clock;window.SweetsRenderCadenceV246?.recordClient?.(performance.now()-paintStartV246);}`, 'castella active paint cadence');
for(const [p,s] of changes){fs.writeFileSync(p,s);console.log('HIDDEN_GAME_CLOCK_PATCH',p,s.length);}
