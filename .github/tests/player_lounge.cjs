const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {PlayerStore,uniqueBest,demoRows,month}=require('../../assets/player-lounge.js');
const cache=new Map(),storage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)};
let now=Date.parse('2026-10-30T03:00:00Z');
const player=new PlayerStore(storage,()=>now,()=> 'persistent-user');
const app={token:1,enabled:[true,true,true],paid:[true,true,true],engines:[{processed:8},{processed:8},{processed:8}],roundWins:[120,400,200]};
player.capture(app);player.capture(app);
assert.equal(uniqueBest(player.rows('month',0)).length,1);
assert.equal(uniqueBest(player.rows('month',0))[0].win,400);
assert.equal(player.rows('month',1)[0].win,120);
assert(player.rename('もちもち'));assert.equal(player.data.id,'persistent-user');
assert(!player.rename('  '));assert(!player.rename('あ'.repeat(13)));assert(player.rename('🧁'.repeat(12)));
const restored=new PlayerStore(storage,()=>now,()=> 'wrong');
assert.equal(restored.data.id,'persistent-user');assert.equal(restored.data.name,'🧁'.repeat(12));
assert.equal(uniqueBest(restored.rows('month',0))[0].win,400);
now=Date.parse('2026-11-01T00:00:00Z');assert.equal(restored.rows('month',0).length,0);assert.equal(uniqueBest(restored.rows('all',0))[0].win,400);
assert.equal(month(Date.parse('2026-10-31T15:01:00Z')),'2026-11');
app.token++;app.roundWins=[500,100,200];restored.capture(app);assert.equal(uniqueBest(restored.rows('month',0))[0].win,500);assert.equal(uniqueBest(restored.rows('all',0)).length,1);
const mixed=uniqueBest([...demoRows(now,0),...restored.rows('all',0),...restored.rows('all',0)]);assert.equal(mixed.length,11);assert.equal(mixed.filter(r=>r.self).length,1);assert.deepEqual(mixed.filter(r=>r.win===165600).map(r=>r.rank),[8,8]);
const before=JSON.stringify(restored.data.bests);restored.record({win:Infinity,at:now,game:1});restored.record({win:999,at:now,game:7});assert.equal(JSON.stringify(restored.data.bests),before);
const broken=new PlayerStore({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},()=>now,()=> 'memory-only');assert(!broken.saved);assert(broken.rename('安全'));broken.record({win:1,game:1,at:now});assert.equal(broken.rows('all',1)[0].win,1);
const corrupt=new PlayerStore({getItem(){return '{broken'},setItem(){}},()=>now,()=> 'recovered');assert.equal(corrupt.data.id,'recovered');
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('const THREE=(()=>{'),end=html.indexOf('const SPECIAL_RATE',start);
const bundled=vm.runInNewContext(html.slice(start,end)+';THREE;',{console});
let meshes=0,triangles=0,renders=0;
const T={...bundled,WebGLRenderer:class {constructor() {this.info={render:{}};}setPixelRatio(){}setSize(){}setClearColor(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);meshes=0;triangles=0;scene.traverse(m=>{if(m.isMesh){meshes++;triangles+=m.geometry.index.count/3;assert(m.position.toArray().every(Number.isFinite));assert(m.scale.toArray().every(n=>Number.isFinite(n)&&n>0));}});renders++;}}};
// Build real Three.js geometry with only the GPU renderer stubbed; the test does not control a browser.
const code=fs.readFileSync('assets/player-lounge.js','utf8').replace('const api={PlayerStore,','const api={makePetRenderer,PlayerStore,');
const sandbox={module:{exports:{}},console,document:{createElement:()=>({addEventListener(){}})}};sandbox.globalThis=sandbox;vm.runInNewContext(code,sandbox);
const renderer=sandbox.module.exports.makePetRenderer(T);
for(const flavor of ['strawberry','vanilla','mint','chocolate','grape'])for(const top of ['strawberry','cookie','crown','none'])for(const outfit of ['bow','cape','apron','none']){
 renderer.draw({flavor,top,outfit,accent:'#ec6798'},.5,1.5);assert(meshes<70);assert(triangles<50000);
}
assert.equal(renders,80);
for(const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
console.log('PASS: identity/rename/reload, unique best, monthly rollover (JST), per-game filtering, ties, invalid records, blocked/corrupt storage, 80 real 3D model variants, JavaScript syntax.');
