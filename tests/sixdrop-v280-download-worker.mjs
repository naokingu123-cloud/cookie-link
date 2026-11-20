/* One real isolated Download computation, including the published 278 final
 * checkpoint as previousState. No live player API or full offline replay. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {createDownloadComputerV255} from '../server-download-compute-v255.mjs';
const {R,clone,batches}=createRequire(import.meta.url)('./sixdrop-v278-fixture.cjs');
const legacy=JSON.parse(await fs.readFile('tests/fixtures/sixdrop-v278-download-final.json','utf8'));
const output='qa-sixdrop-v280-worker',root=process.cwd();await fs.mkdir(output,{recursive:true});
const ids=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const report={rulesRevision:280,scope:'Real production Download computer and physical recording; published 278 final state into a fresh 280 round; nine checkpoints and native integer payout',apiRequests:[],assetFailures:[]};
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const body=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);}
 catch{report.assetFailures.push(url.pathname);res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const computer=createDownloadComputerV255({baseUrl:'http://127.0.0.1:'+server.address().port});
try{
 assert.equal(legacy.previousState.engines[2].state.rulesRevision,278);
 const input={version:255,sessionId:'sixdrop-v280-download-native',machineId:'qa-machine',playerId:'isolated',requestId:'v280-native-rounded',seed:25520,createdAt:1795046400000,bets:ids.map(id=>id==='candy'?301:0),gameIds:ids,rate:90,creditBefore:legacy.creditBefore,totalBet:301,previousState:legacy.previousState,sugarState:null,sixDropCarry:legacy.sixDropCarry,profile:{name:'ISOLATED QA'}};
 const result=await computer.compute(input);await fs.writeFile(path.join(output,'native-round.json'),JSON.stringify(result));
 const initial=result.initialState.engines[2].state;assert.equal(initial.rulesRevision,280);assert.equal(initial.bet,301);
 assert.deepEqual(initial.carryAtStart,R.cleanCarry(legacy.sixDropCarry));assert(Number.isSafeInteger(initial.rng));
 assert.equal(result.playback.checkpoints.length,9);assert.equal(result.playback.recording.hits.length,8);
 const processed=[0,0,0,3,3,5,6,7,8];let state=clone(initial),group=0;
 for(let ball=0;ball<=8;ball++){
  if([3,5,6,7,8].includes(ball))state=R.hitBatch(state,batches(result.numbers)[group++]).state;
  const checkpoint=result.playback.checkpoints[ball];
  assert.equal(checkpoint.engines[2].processed,processed[ball]);
  assert.deepEqual(checkpoint.engines[2].state,state,'actual native Download checkpoint '+ball);
 }
 assert.deepEqual(state.counts,{line:2,triangle:0,hexagon:1});
 assert.equal(R.totalMedals({...state,rulesRevision:278}),541,'the same physical draw had the previous non-round award');
 assert.equal(result.games[2].win,451,'new table pays floor(301 × .5) + floor(301 × 1)');
 assert.equal(result.games[2].win,R.totalMedals(state));assert.equal(result.totalWin,451);
 assert.deepEqual(result.games[2].carryV247,R.carryOut(state,result.sessionId));
 assert.equal(result.finalState.credit,input.creditBefore-input.totalBet+451);
 assert.equal(computer.status().completed,1);assert.equal(report.apiRequests.length,0);
 assert.equal(report.assetFailures.filter(p=>p!=='/favicon.ico').length,0,'all required worker assets load');
 report.ok=true;report.previousRevision=278;report.initialRevision=initial.rulesRevision;report.numbers=result.numbers;
 report.checkpointProcessed=result.playback.checkpoints.map(s=>s.engines[2].processed);report.counts=state.counts;report.oldWin=541;report.win=result.totalWin;report.creditAfter=result.finalState.credit;report.carry=result.games[2].carryV247;report.computer=computer.status();
 console.log('SIXDROP_V280_DOWNLOAD_WORKER_PASS',JSON.stringify(report));
}catch(error){report.ok=false;report.error=String(error);report.stack=error.stack;report.computer=computer.status();process.exitCode=1;console.error(error);}
finally{await computer.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
