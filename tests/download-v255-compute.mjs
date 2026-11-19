import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {createDownloadComputerV255} from '../server-download-compute-v255.mjs';

const root=process.cwd(),output='qa-download-v255';await fs.mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost'),relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,relative||'index.html');if(!file.startsWith(root+path.sep))throw Error('path');const data=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}
 catch{res.writeHead(404);res.end('Not found');}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const computer=createDownloadComputerV255({baseUrl:'http://127.0.0.1:'+server.address().port});
const gameIds=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const input={version:255,sessionId:'download-v255-real-engine-fixture',machineId:'public-01',playerId:'isolated-qa',requestId:'fixed-request',seed:25519,createdAt:1795046400000,bets:gameIds.map(()=>100),gameIds,rate:100,creditBefore:100000,totalBet:1000,previousState:null,sugarState:null,profile:{name:'ISOLATED QA'}};
function assertDangoCompletion(result){
 const state=result.finalState.engines[9].state;
 assert.equal(state.phase,'done');
 assert.equal(state.freeCommitted,true,'Dango resolves its placement boundary before the last three balls');
 if(state.rulesRevision===262){
  const initial=result.initialState.engines[9].state,firstFive=result.numbers.slice(0,5);
  const level=state.triggerNumbers.filter(number=>firstFive.includes(number)).length;
  assert.deepEqual(state.triggerNumbers,initial.triggerNumbers,'trigger numbers remain fixed throughout server computation');
  assert.deepEqual(state.initialFreeCells,initial.initialFreeCells);
  assert.deepEqual(state.numbers,initial.numbers);
  assert.equal(state.expansionLevel,level);
  assert.equal(state.manualFreeCells.length,[0,1,7,17][level],'zero triggers grants no region; other levels include the center');
  assert.equal(new Set(state.manualFreeCells).size,state.manualFreeCells.length);
  if(level===0)assert.equal(state.expansionCenter,null);
  else assert.ok(state.manualFreeCells.includes(state.expansionCenter));
  const overlap=state.initialFreeCells.filter(cell=>state.manualFreeCells.includes(cell)).length;
  const lateHits=result.numbers.slice(5).filter(number=>state.manualFreeCells.includes(state.numbers.indexOf(number))).length;
  assert.equal(state.oddsMultiplier,1+overlap+lateHits,'only placed FREE overlaps and later hits raise ODDS');
 }else{
  assert.ok(state.manualFreeCells.length>0,'legacy Dango automatic placement uses first five balls');
 }
 return {revision:state.rulesRevision,expansionLevel:state.expansionLevel??null,freeCells:state.manualFreeCells.length,odds:state.oddsMultiplier};
}
try{
 const started=Date.now();
 const first=await computer.compute(input);
 await fs.writeFile(path.join(output,'trusted-package.json'),JSON.stringify(first));
 assert.equal(first.version,255);assert.equal(first.numbers.length,8);assert.equal(new Set(first.numbers).size,8);
 assert.deepEqual(first.games.map(game=>game.id),gameIds);
 assert.ok(first.games.every(game=>Number.isSafeInteger(game.win)&&game.win>=0&&game.bet===100));
 assert.equal(first.totalWin,first.games.reduce((n,game)=>n+game.win,0));
 assert.equal(first.initialState.credit,99000);assert.equal(first.finalState.credit,99000+first.totalWin);
 assert.equal(first.playback.checkpoints.length,9);
 for(let i=0;i<=8;i++){
  const state=first.playback.checkpoints[i];assert.equal(state.ballIndex,i);assert.equal(state.draws.length,i);
  for(const [id,offset] of Object.entries(state.randomOffsets))assert.ok(offset<=first.playback.rngTapes.streams[id].length,id+' RNG boundary');
 }
 assert.ok(first.finalState.engines.every(engine=>Number(engine.processed)===8));
 const firstDango=assertDangoCompletion(first);
 const second=await computer.compute(input);
 assertDangoCompletion(second);
 assert.deepEqual(second.numbers,first.numbers,'server restart/retry retains its physical outcomes');
 assert.deepEqual(second.games,first.games,'all ten native game payouts must reproduce');
 assert.deepEqual(second.initialState.engines.map(engine=>engine.state||engine.board||engine.nodeNumbers),first.initialState.engines.map(engine=>engine.state||engine.board||engine.nodeNumbers),'server-generated initial boards must reproduce');
 const carry=await computer.compute({...input,sessionId:'download-v255-carried-fixture',requestId:'carry-request',seed:25520,creditBefore:first.finalState.credit,previousState:first.finalState});
 const carryDango=assertDangoCompletion(carry);
 await fs.writeFile(path.join(output,'carried-package.json'),JSON.stringify(carry));
 assert.equal(carry.initialState.credit,first.finalState.credit-input.totalBet);
 assert.equal(carry.finalState.credit,carry.initialState.credit+carry.totalWin);
 const oldChoco=first.finalState.engines[1],newChoco=carry.initialState.engines[1];
 if(oldChoco.continueDepth)assert.equal(newChoco.startDepth,oldChoco.depth,'trusted Canyon depth carries across downloads');
 const report={ok:true,completed:computer.status().completed,ms:Date.now()-started,numbers:first.numbers,firstGames:first.games,secondGames:second.games,carryGames:carry.games,firstDango,carryDango,firstCredit:first.finalState.credit,carryCredit:carry.finalState.credit,frames:first.playback.recording.frames.length,recordingDurationMs:first.playback.recording.durationMs,recordingSourceHash:first.playback.recording.sourceHash};
 await fs.writeFile(path.join(output,'compute.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){await fs.writeFile(path.join(output,'compute-error.json'),JSON.stringify({error:String(error?.stack||error),computer:computer.status()},null,2));throw error;}
finally{await computer.close();await new Promise(resolve=>server.close(resolve));}
