import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const view=await fs.readFile(new URL('../assets/jelly-view.js',import.meta.url),'utf8');
const host=await fs.readFile(new URL('../assets/jelly-host.js',import.meta.url),'utf8');
const rules=await fs.readFile(new URL('../assets/jelly-rules.js',import.meta.url),'utf8');
const context=vm.createContext({console});
vm.runInContext(rules,context);
const L=context.JellyRules.LINES;
assert.equal(L.length,12);
const start=view.indexOf('const railGeometry=K.LINES.map(');
const stop=view.indexOf('\nconst spectrum=',start);
assert.ok(start>0&&stop>start);
const program=`const K={LINES:${JSON.stringify(L)}},moldRim=42;const center=i=>[50+i%5*100,50+Math.floor(i/5)*100];`+view.slice(start,stop)+';globalThis.rails=railGeometry;';
vm.runInContext(program,context);
const rails=JSON.parse(JSON.stringify(context.rails));
assert.equal(rails.length,12);
for(const rail of rails){
 const endX=rail.x+rail.length*Math.cos(rail.angle),endY=rail.y+rail.length*Math.sin(rail.angle);
 const firstEdge=Math.min(Math.abs(rail.x+41),Math.abs(rail.y+41),Math.abs(rail.x-541),Math.abs(rail.y-541));
 const lastEdge=Math.min(Math.abs(endX+41),Math.abs(endY+41),Math.abs(endX-541),Math.abs(endY-541));
 assert.ok(firstEdge<.01&&lastEdge<.01,'rail must reach both outer bezel edges '+JSON.stringify(rail));
 for(const point of [rail.x,rail.y,endX,endY])assert.ok(point>=-42.01&&point<=542.01,'rail outside artwork: '+point);
 assert.ok(rail.length>570,'no 400px short rail '+rail.length);
}
assert.match(view,/line\(c,0,0,end,0,'#ffffff',mini\?12:20\+power\*2\)/,'fat translucent white body');
assert.match(view,/function comet\(c,length,end,phase,power,mini\)/);
assert.match(view,/#faffff74/,'moving whitish light reflection');
assert.ok(!view.includes("const label=item.oddsUp?'オッズアップ'"),'odds-only board label removed');
assert.match(host,/if\(gain<=0\|\|oddsReason==='color'&&lines===engine.state.lines.length\)continue/,'odds-only reach filtered before board and tab');
assert.match(host,/oddsUp:false/);
assert.match(host,/this\.state=K\.create/,'no change to real payout rules');
console.log('JELLY_V288_LINES_PASS',JSON.stringify({rails:rails.length,bezel:true,flowingWhiteLight:true,oddsOnlyReachRemoved:true,payoutRulesUnchanged:true}));
