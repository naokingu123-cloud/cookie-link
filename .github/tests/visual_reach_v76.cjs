/* v76 visual and reach rules: geometry states, rank, contrast locality. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const g=read('assets/gelato-prism-v28.js');
const w=read('assets/winery-pyramid-v1.js');
const gcss=read('assets/gelato-prism-rail-v76.css');
const wcss=read('assets/winery-stand-focus-v76.css');
const html=read('index.html');
const core=require('../../assets/winery-pyramid-core-v1.js');
new Function(g);new Function(w);
const sourceStart=g.indexOf(' const H=106,HW=Math.sqrt(3)*H/2,X=250,Y=250;');
const sourceEnd=g.indexOf(' const path=nodes=>',sourceStart);
assert(sourceStart>=0&&sourceEnd>sourceStart,'Gelato geometry present');
const {GelatoEngine,EDGES,FACES,faceAtEdge}=
 new Function(g.slice(sourceStart,sourceEnd)+
 '\nreturn {GelatoEngine,EDGES,FACES,faceAtEdge};')();
assert.equal(EDGES.length,42);assert.equal(FACES.length,24);
const e=new GelatoEngine(()=>.5,()=>{},()=>Promise.resolve());
function states(hits){
 const state=e.stateFor(new Set(hits));
 const white=state.edges;
 const cyan=new Set(EDGES.map((_,i)=>i).filter(id=>!white.has(id)&&
  faceAtEdge[id].length===2&&faceAtEdge[id].every(f=>state.faces.has(f))));
 return {white:white.size,cyan:cyan.size,dark:42-white.size-cyan.size,
  filled:state.faces.size};
}
assert.deepEqual(states([]),{white:0,cyan:0,dark:42,filled:0});
assert.deepEqual(states([0,1,5,13,17,18]),
 {white:36,cyan:6,dark:0,filled:24});
assert.match(g,/rail\(id,'#303454'/,'dark rail');
assert.match(g,/rail\(id,'#38dbff'/,'cyan interior');
assert.match(g,/rail\(id,'#fffefa'/,'white connected');
assert.match(g,/motion\*\.00072/,'faster travelling bright pearls');
assert.match(g,/const REACH_NAMES=\['リーチ','高額','超高額','全埋め'\]/);
const ra=g.indexOf(' const REACH_NAMES='),rb=g.indexOf(' function drawReachOnNodes',ra);
assert(ra>0&&rb>ra,'Gelato four-tier preview');
const getReach=new Function('FACES',g.slice(ra,rb)+'\nreturn getNodeReachTiers;')(FACES);
e.hits=new Set([0,1,5,13,17]);e.filled=e.stateFor(e.hits).faces;
e.processed=8;e.accepted=8;e.phase='complete';e.running=false;
const reach=[...getReach(e).values()];
assert(reach.some(p=>p.tier===3&&p.name==='全埋め'&&p.allFill),
 'All-fill tier based on actual 24 captured regions');
const match=w.match(/const reachTier=p=>([^;]+);/);
assert(match,'Winery independent four-tier classifier');
const tier=new Function('p','return '+match[1]+';');
assert.equal(tier({gain:100,full:9,allClear:false}),0);
assert.equal(tier({gain:500,full:12,allClear:false}),1);
assert.equal(tier({gain:1200,full:17,allClear:false}),2);
assert.equal(tier({gain:100,full:21,allClear:true}),3);
assert.match(w,/function wineryTagReachPath/);
assert.match(w,/x\.lineDashOffset=-\(seconds\*/,'animated tag perimeter');
assert.match(w,/premiumReach\(xx,time\)/,'live game render');
assert.match(w,/WP_REACH_WORDS=\['リーチ','高額','超高額','全満'\]/);
assert.match(wcss,/inset:7% 28% 1% 18%!important/,'dim central stand only');
assert.match(wcss,/brightness\(\.98\)/,'bright outer static stand returns');
assert.match(html,/gelato-prism-rail-v76\.css\?v=76/);
assert.ok(Number(html.match(/gelato-prism-v28\.js\?v=(\d+)/)?.[1])>=76);
assert.ok(Number(html.match(/winery-pyramid-v1\.js\?v=(\d+)/)?.[1])>=76);
assert.equal(core.PAY[10],.3);
assert.equal(core.PAY[11],.6);
for(const css of [gcss,wcss])
 assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,'CSS braces');
console.log('V76_VISUAL_PASS',JSON.stringify({
 rails:states([0,1,5,13,17,18]),gelatoFourTiers:true,
 wineryTagFourTiers:true,localizedStandContrast:true,payoutsUnchanged:true
}));
