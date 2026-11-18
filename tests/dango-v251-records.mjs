import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [bundle,playerSource,lineupSource]=await Promise.all([
 read('optimized/app-01.js'),read('assets/player-lounge.js'),read('assets/lineups-v91.js')
]);
const lineupContext={window:{},location:{search:''},URLSearchParams,
 document:{documentElement:{dataset:{},toggleAttribute(){}},addEventListener(){},head:{}},
 MutationObserver:class{observe(){}}};
vm.runInNewContext(lineupSource,lineupContext);
const {ids,catalog}=lineupContext.window.SweetsLineup,lineup=Array.from(ids);
assert.equal(lineup.length,10);assert.equal(lineup.at(-1),'dango');assert.equal(catalog.dango.record,10);

const start=bundle.indexOf('const TITLE_DEFS=['),end=bundle.indexOf('\nconst $=id=>',start);
assert.ok(start>=0&&end>start,'load the production RecordBook and its sanitizer');
const context={module:{exports:{}}};vm.createContext(context);
vm.runInContext(bundle.slice(start,end)+'\nglobalThis.RecordBook=RecordBook;',context);
vm.runInContext(playerSource,context);
const {RecordBook}=context,{PlayerStore,uniqueBest,demoRows,month}=context.module.exports;
const copy=value=>JSON.parse(JSON.stringify(value));
const saved=new Map(),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,String(value))};
const at=Date.UTC(2026,10,18,12),now=()=>at;
const wins=lineup.map((id,index)=>id==='dango'?6000000:(index+1)*100);
const app={token:1,engines:lineup.map(id=>Object.freeze({kind:id,recordGame:catalog[id].record,processed:8,
 maxLink:0,maxChain:0,totalHundredths:id==='dango'?200000:100,allClears:Number(id==='dango'),
 roundSteps:0,roundHammers:0,roundCleared:0})),
 enabled:lineup.map(()=>true),paid:lineup.map(()=>true),locked:lineup.map(()=>3000),roundWins:wins};
const book=new RecordBook(storage,now),captured=book.capture(app),record=book.data.records;
assert.equal(captured.changed,true);assert.equal(captured.round,true);
assert.equal(record.games,10);assert.equal(record.rounds,1);assert.equal(record.totalWin,wins.reduce((a,b)=>a+b,0));
assert.equal(record.best.length,10);assert.equal(record.best[0].game,10);assert.equal(record.best[0].win,6000000);
assert.equal(record.clears.length,1);assert.equal(record.clears[0].game,10);assert.equal(record.allClears,1);
const snapshot=saved.get(book.key);
assert.equal(book.capture(app).changed,false,'a repeated completion cannot record the ten games twice');
assert.equal(saved.get(book.key),snapshot);

const restored=new RecordBook(storage,now);
assert.deepEqual(copy(restored.data.records),copy(record),'all ten identities survive the real record sanitizer');
assert.equal(restored.data.records.best[0].game,10);assert.equal(restored.data.records.clears[0].game,10);
const player=new PlayerStore(storage,now,()=> 'player-ten');
player.migrate(restored.data.records);
assert.equal(player.data.bests['all/10'].win,6000000);
assert.equal(player.data.bests[month(at)+'/10'].win,6000000);
assert.equal(Object.keys(player.data.bests).length,20,'every game has one all-time and one monthly best');
assert.equal(player.rows('all',10).length,1);assert.equal(player.rows('month',10).length,1);
assert.equal(player.record({win:1,at,game:11}),false,'the accepted record range ends at game ten');
const reload=new PlayerStore(storage,now,()=> 'unused-player');
assert.deepEqual(copy(reload.data.bests),copy(player.data.bests),'monthly and all-time /10 keys reload intact');
const native=new PlayerStore({getItem:()=>null,setItem(){}},now,()=> 'native-capture');
native.capture(app);native.capture(app);
assert.equal(native.rows('all',10)[0].win,6000000);assert.equal(Object.keys(native.data.bests).length,20);

for(let game=1;game<=10;game++){
 const demos=demoRows(at,game),ranking=uniqueBest([...reload.rows('all',game),...demos]);
 assert.equal(demos.length,10);assert.ok(demos.every(row=>Number.isSafeInteger(row.win)&&row.win>0&&row.game===game));
 assert.equal(ranking.length,11,'the selected game retains every demo and its own record');
 assert.equal(ranking.filter(row=>row.self).length,1);
}
console.log('DANGO_V251_RECORDS_PASS',JSON.stringify({games:10,bet:30000,recordId:10,
 highestRoleSaved:true,duplicateCapture:false,monthlyAndAllTimeRestored:true,demoRankings:10}));
