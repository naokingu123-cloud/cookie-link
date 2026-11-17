import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {stationView} from './stations-view-fixture-v236.mjs';
const read=p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const api={};api.window=api;vm.createContext(api);vm.runInContext(await read('assets/stations-number-preview-v241.js'),api);
const loader=await read('assets/shared-machine-v176.js');assert.match(loader,/window\.SweetsStationNumbersV241\.patch\(/);assert.doesNotMatch(loader,/SweetsStationNumbersV242/);
const source=api.SweetsStationNumbersV241.patch(await read('assets/stations-v235.js'));
for(const count of [1,3]){
 const done=count===1?0:3,engines=[{kind:'cookie',version:1,totalHundredths:20,processed:done,accepted:done,phase:'waiting',busy:false,queue:[]},{kind:'candy',version:1,totalHundredths:30,processed:done,accepted:done,phase:'waiting',busy:false,queue:[]},{kind:'jelly',version:1,totalHundredths:50}];
 const a={phase:'playing',token:1,draws:Array.from({length:count},(_,i)=>i+1),locked:[100,100,200],enabled:[true,true,true],paid:[false,false,false],roundWins:[0,0,0],totalWin:0,engines};
 const r={id:'r'+count,phase:'PLAYING',balls:a.draws.map((number,index)=>({index:index+1,number})),participant:{totalBet:400}};
 const v=stationView(source,{id:'p',model:a,round:r});
 const slots=engines.map((engine,i)=>({engine,tabReachVersion:i<2?null:1,reachStatus:i<2?'inactive':'ready',tabReachBase:i<2?0:50,tabReachResults:i<2?[]:[{number:9,total:100,gain:50,tier:0}]}));
 let reads=0;const cache=s=>{reads++;return s.tabReachResults;},calculate=(bet,h)=>Math.floor(bet*h/100);
 const detail=v.api.currentDetail(a,r,v.shared.active,slots,cache,calculate);
 assert.equal(reads,1,'collection-only games do not require a new prediction');assert.equal(detail.prediction,'ready');assert.equal(detail.numberGains.length,25);assert.equal(detail.predictionBaseWin,150);assert.equal(detail.numberGains[8],100);assert.equal(detail.numberGains[4],0);assert.equal(detail.numberGains[0],null);
 engines[0].busy=true;assert.equal(v.api.currentDetail(a,r,v.shared.active,slots,cache,calculate).numberGains,null,'busy unknown board is not zero');engines[0].busy=false;
 engines[0].drawMode='single';assert.equal(v.api.groupedNoGainV243(engines[0],a),false,'single-HIT engine cannot use a grouped rule');delete engines[0].drawMode;
 a.paused=true;assert.equal(v.api.groupedNoGainV243(engines[0],a),false);a.paused=false;
 a.draws.push(25);assert.equal(v.api.groupedNoGainV243(engines[0],a),false,'next payout-bearing HIT must use its real cache');
}
console.log('CLIENT_FORECAST_V243_PASS',JSON.stringify({exportedApiMatches:true,collectionOnlyRounds:[1,3],zeroExtraSimulations:true,medalRounding:true,busyDataNotInvented:true}));
