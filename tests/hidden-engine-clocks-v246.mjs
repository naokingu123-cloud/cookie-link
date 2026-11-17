import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const specs=[['assets/jelly-host.js','advance'],['assets/popcorn-host.js','step'],['assets/bingo-stick-host.js','advanceMove'],['assets/party-castella-host.js',null]];
for(const [file,method] of specs){
 const source=await fs.readFile(file,'utf8');new vm.Script(source);
 const hook=source.match(/engine\.pumpHiddenV246=function\(elapsed\)\{[\s\S]*?\n\};/)?.[0];assert.ok(hook,file+' hidden hook');
 let calls=0,draws=0;const engine={running:true,presentationRate:1};
 const c={document:{hidden:true},window:{__sweetsSharedClientReady:true},app:{phase:'playing',paused:false,enabled:[true]},id:0,engine,jpcSession:{active:false},stamp:123,clock:0,animating:true,paint(){draws++;},advance(){calls++;},step(){calls++;},advanceMove(){calls++;}};
 vm.runInNewContext(hook,c);assert.equal(engine.pumpHiddenV246(60),true);assert.equal(c.clock,60);assert.equal(calls,method?1:0);assert.equal(draws,0,'hidden processing never paints');
 c.document.hidden=false;assert.equal(engine.pumpHiddenV246(60),false,'visible rAF remains sole owner');assert.equal(c.clock,60);
 c.document.hidden=true;c.app.paused=true;assert.equal(engine.pumpHiddenV246(60),false);c.app.paused=false;
 engine.running=false;assert.equal(engine.pumpHiddenV246(60),false,'no stale finished round');
}
console.log('HIDDEN_ENGINE_CLOCKS_V246_PASS: jelly, popcorn, waffle and castella; no hidden canvas drawing');
