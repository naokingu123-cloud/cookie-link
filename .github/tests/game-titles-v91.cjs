'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {defs,tracker}=require('../../assets/game-titles-v91.js');
assert.equal(defs.length,79);assert.equal(new Set(defs.map(d=>d.id)).size,79);
assert.deepEqual(['gelato','winery','popcorn'].map(k=>defs.filter(d=>d.game===k).length),[24,27,28]);
assert.deepEqual(defs.map(d=>d.atlas),defs.map((_,i)=>i));
const source=fs.readFileSync(path.join(__dirname,'../../assets/gelato-prism-v28.js'),'utf8');
const faces=new Function(source.slice(source.indexOf('const H=106'),source.indexOf(' const supports='))+';return FACES;')();
const inside=faces.filter(f=>f.nodes.includes(9)).map(f=>f.id);
assert.equal(inside.length,12);
const t=tracker(inside),stats={};
const peak=(k,v)=>stats[k]=Math.max(stats[k]||0,v),bump=(k,v)=>stats[k]=(stats[k]||0)+v;
const got=id=>{const d=defs.find(x=>x.id===id);return (stats[d.metric]||0)>=d.target;};
const glass=(n,full=true)=>({volume:full?1:.5,layers:Array.from({length:n},(_,flavor)=>({flavor,amount:1/n}))});
const mk=(kind,extra)=>({kind,processed:8,emit:()=>11,...extra});
const g=mk('gelato',{filled:new Set(inside),collectorCounts:[3,4,1,3,1]}),
 w=mk('winery',{glasses:[glass(5,false),glass(2)],wasted:9.999,mixCount:1,fullCount:1}),
 p=mk('popcorn',{trace:{before:[{bomb:true,power:3},{bomb:false,power:0}],after:[null,null],waves:[]},state:{popped:50,level:2,clears:0}});
const a={phase:'playing',token:1,enabled:[true,true,true],locked:[2,2,2],paid:[false,false,false],engines:[g,p,w],roundWins:[1000,1000,1000]};
t.attach(a);t.attach(a);
for(const e of a.engines)e.processed=7;
assert.equal(g.emit('gelatoFill',{newFaces:Array(17)}),11);
w.emit('wineryBoost',{power:16});w.emit('wineryPour',{volume:4});w.emit('wineryAward',{justFilled:Array(9)});
p.emit('popcornDraw');
a.paid.fill(true);for(let i=0;i<3;i++)t.capture(a,i,peak,bump);assert.deepEqual(stats,{});
for(const e of a.engines)e.processed=8;
for(let i=0;i<3;i++){t.capture(a,i,peak,bump);t.capture(a,i,peak,bump);}
assert(got('gelato-02')&&got('gelato-04')&&!got('gelato-03')&&!got('gelato-08'));
assert(got('popcorn-01')&&!got('popcorn-02')&&!got('popcorn-03')&&!got('popcorn-07')&&got('popcorn-08'));
assert(!got('winery-01')&&got('winery-02')&&!got('winery-03')&&!got('winery-07')&&got('winery-09')&&!got('winery-11'));
for(const k of ['gelato','winery','popcorn'])assert.equal(stats[k+'.lifetimeWin'],1000);
for(const id of ['gelato-19','winery-22','popcorn-23'])assert(!got(id));
a.token++;a.locked.fill(0);a.phase='ready';
g.emit('gelatoFill',{newFaces:Array(18)});w.emit('wineryPour',{volume:16});
for(let i=0;i<3;i++)t.capture(a,i,peak,bump);
assert(!got('gelato-03')&&!got('winery-11')&&stats['gelato.lifetimeCount']===12);
a.token++;a.phase='playing';a.locked.fill(1);a.roundWins.fill(1);
g.filled=new Set(faces.map(x=>x.id));g.collectorCounts=[8,4,4,4,4];g.emit('gelatoFill',{newFaces:Array(18)});
w.glasses=[glass(5)];w.wasted=10;w.fullCount=21;w.mixCount=10;w.emit('wineryAward',{justFilled:Array(10)});
for(const volume of [2,8,16])w.emit('wineryPour',{volume});
p.state={level:5,clears:5,popped:400};p.trace={before:[{bomb:true,power:5},null],after:[null,{bomb:true,power:3}],waves:[[0]]};p.emit('popcornDraw');
for(let i=0;i<3;i++)t.capture(a,i,peak,bump);
for(const d of defs.filter(d=>d.game==='popcorn'&&Number(d.id.slice(-2))<=16))assert(got(d.id),d.id);
assert(!got('winery-03')&&!got('winery-04')&&got('winery-05'),'a single five-color glass does not earn the exact three- and four-color glasses');
a.token++;w.glasses=[glass(3),glass(4)];t.capture(a,2,peak,bump);
for(const d of defs.filter(d=>d.game==='winery'&&Number(d.id.slice(-2))<=15))assert(got(d.id),d.id);
for(const id of ['gelato-03','gelato-08','gelato-12','gelato-19','winery-22','popcorn-23'])assert(got(id),id);
assert(!got('gelato-11')&&!got('gelato-01'));a.token++;
g.filled=new Set(faces.slice(0,22).map(x=>x.id));t.capture(a,0,peak,bump);assert(got('gelato-11'));
a.token++;g.filled.clear();t.capture(a,0,peak,bump);assert(got('gelato-01'));
const totals={gelato:[100,1000,10000,100000,200000,500000],winery:[100,1000,10000,100000,200000,500000],popcorn:[1000,10000,100000,1000000,2000000,5000000]};
for(const [game,limits] of Object.entries(totals))for(const [metric,cutoffs] of [['lifetimeCount',limits],['lifetimeWin',[1000,10000,100000,1000000,5000000,10000000]]]){
 const titles=defs.filter(x=>x.metric===game+'.'+metric);assert.equal(titles.length,6);
 titles.forEach((d,i)=>{stats[d.metric]=cutoffs[i];assert(!got(d.id),d.id);stats[d.metric]++;assert(got(d.id),d.id);});
}
console.log('79 independent title definitions, strict career thresholds, paid eight-ball settlement, no duplicate or demo stats; exact colors, real pours, inner twelve and bomb traces passed.');

// Two independent browser realms collect paid rounds before either acquires the
// origin lock. Test recovery even if one page closes before its callback runs.
const vm=require('node:vm'),root=path.join(__dirname,'../..');
const native=fs.readFileSync(path.join(root,'optimized/achievements-v3.js'),'utf8');
const modern=fs.readFileSync(path.join(root,'assets/game-titles-v91.js'),'utf8');
const key='cookie-link-achievements-v4',pending=key+'-pending-';
const db=new Map([[key,JSON.stringify({version:4,equipped:{id:'popcorn-01'},titles:{'v4-001':18,'popcorn-01':21},stats:{'popcorn.lifetimeCount':950,blocks:7}})],['cl-v4-last-day',new Date().toLocaleDateString('sv-SE')]]);
const localStorage={getItem:k=>db.get(k)||null,setItem:(k,x)=>db.set(k,x),removeItem:k=>db.delete(k),get length(){return db.size;},key:i=>[...db.keys()][i]};
const locks=[];
function tab(id){
 const engine={kind:'popcorn',emit(){},processed:8,state:{popped:50,clears:0,level:1}};
 const app={token:1,engines:[engine],paid:[true],enabled:[true],locked:[1],roundWins:[17],phase:'playing'};
 const recordBook={data:{equipped:null,records:{}},key:'records-v2',capture:()=>({}),equip(k){this.data.equipped=k?{id:k}:null;return true;}};
 const doc={querySelector:()=>null,getElementById:()=>null,createElement:()=>({}),body:{appendChild(){}},hidden:true};
 const window={addEventListener:(_,fn)=>{window.storage=fn;}};
 const realm={app,document:doc,window,recordBook,TITLE_DEFS:[],console,localStorage,menuOpen:false,selectedTitle:'',
  recordEvent(){},updateEquippedTitle(){},showTitleToast(){},renderTitles(){},renderRecordMenu(){},openRecordMenu(){},
  recordPage:'records',setInterval(){},crypto:{randomUUID:()=>id},navigator:{locks:{request(_,f){locks.push(f);return Promise.resolve();}}}};
 vm.runInNewContext(native+'\n'+modern,realm);return realm;
}
const a1=tab('one'),a2=tab('two');assert.equal(a1.TITLE_DEFS.length,182);
assert.equal(a2.recordBook.data.equipped.id,'popcorn-01');
a1.recordBook.capture(a1.app);a1.recordBook.capture(a1.app);
a2.app.roundWins[0]=32;a2.recordBook.capture(a2.app);
assert.equal([...db.keys()].filter(k=>k.startsWith(pending)).length,2);
assert.equal(locks.length,2);
locks.shift()();
const stored=()=>JSON.parse(db.get(key));
assert.equal(stored().stats['popcorn.lifetimeCount'],1050);assert.equal(stored().stats['popcorn.lifetimeWin'],49);
assert(stored().titles['popcorn-17']);assert.equal(stored().titles['popcorn-01'],21);
assert.equal(stored().titles['v4-001'],18);assert.equal(stored().stats.blocks,7);
assert.equal([...db.keys()].filter(k=>k.startsWith(pending)).length,0);
locks.shift()();assert.equal(stored().stats['popcorn.lifetimeWin'],49);
const newest=tab('three');assert.equal(newest.recordBook.data.equipped.id,'popcorn-01');
const replaced={};a2.recordBook.data.records=replaced;a2.window.storage({key:'records-v2'});assert(replaced.titles['popcorn-17']);
assert(a2.recordBook.equip('popcorn-17'));locks.shift()();a1.window.storage({key});assert.equal(a1.recordBook.data.equipped.id,'popcorn-17');
assert(a1.recordBook.equip(null));locks.shift()();assert.equal(stored().equipped,null);
// Simulate an unclean shutdown between the atomic v4 write and journal cleanup.
const old=stored().applied[0];db.set(old,JSON.stringify({adds:{'popcorn.lifetimeWin':999},peaks:{},titles:{}}));
tab('four');locks.shift()();assert.equal(stored().stats['popcorn.lifetimeWin'],49);assert.equal(db.has(old),false);
console.log('Concurrent v4 saves, last explicit equip, original unlock dates, core record replacement, reload and interrupted-transaction replay passed.');
