import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';

const temp=await mkdtemp(path.join(os.tmpdir(),'sixdrop-server248-'));
const file=path.join(temp,'payout-control-v3.json');
const prior={version:247,revision:4,roundId:'before-v248',bankUnits:12345,removed:99,feed:410};
const seedPlayer=(id,carry)=>({playerId:id,sixDropV247:carry,rounds:{},games:{},wallet:{credit:1000000,revision:2,initializationVersion:228}});
await writeFile(file,JSON.stringify({version:3,machines:{'public-01':{id:'public-01',players:{legacy:seedPlayer('legacy',prior),passive:seedPlayer('passive',{...prior,bankUnits:54321,removed:430})}}}}));
process.env.SWEETS_DATA_DIR=temp;process.env.SWEETS_ADMIN_TOKEN='six248-test';
await import('../server-payout-preload-v3.mjs');
const {R,G}=createRequire(import.meta.url)('./sixdrop-v247-fixture.cjs');
const send=(res,payload)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(payload));};
const server=http.createServer(async(req,res)=>{
 let body={};if(req.method==='POST'){const chunks=[];for await(const b of req)chunks.push(b);body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}
 const url=new URL(req.url,'http://localhost'),player=String(req.headers['x-player-id']||'');
 if(url.pathname.endsWith('/join'))return send(res,{ok:true,round:{id:body.roundId,phase:'BETTING',participant:{playerId:player}}});
 if(url.pathname.endsWith('/settle'))return send(res,{ok:true,settlement:{playerId:player}});
 return send(res,{ok:true,round:null,pendingRound:null});
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const request=async(route,id,body)=>{
 const r=await fetch(base+'/api/machines/public-01/'+route,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-player-id':id},body:body?JSON.stringify(body):undefined});
 assert.equal(r.status,200);return r.json();
};
const candy=bet=>({id:'candy',bet,rulesVersion:247});
const join=(id,round,games)=>request('round/join',id,{roundId:round,totalBet:games.reduce((n,g)=>n+g.bet,0),bets:games.map(g=>g.bet),enabled:games.map(()=>true),payoutV3Bet:{version:3,games}});
const settle=(id,round,games)=>request('round/settle',id,{roundId:round,totalWin:games.reduce((n,g)=>n+g.win,0),payoutV3:{version:3,games}});
const oneDrop=(bet,carry,seed=1)=>{
 const s=R.newGame({bet,carry,seed});s.grid=G.empty(10);s.grid[9][0]={id:1,color:s.palette[0],number:1};s.uid=1;
 return R.hit(s,1,{trace:true});
};

try{
 let a=await request('state','legacy');
 assert.equal(a.payoutControlV3.sixDropV247.bankUnits,12345,'existing hundredth-medal balance is not multiplied by five');
 assert.equal(a.payoutControlV3.sixDropV247.removed,99,'old cumulative clears survive the update');
 await join('legacy','first',[candy(100)]);
 const first=oneDrop(100,a.payoutControlV3.sixDropV247);
 assert.equal(first.allClear,true);assert.equal(first.removed,1);
 assert.equal(first.state.bankUnits,12845,'only the newly removed drop accrues five hundredths of BET');
 assert.equal(first.state.removedTotal,100);
 assert.deepEqual(first.state.palette,R.palette(99),'crossing 100 does not change the current game palette');
 const carry=R.carryOut(first.state,'first');
 assert.equal(carry.bankUnits,12845,'collecting all-clear does not consume the progressive');
 const firstGames=[{...candy(100),win:first.totalWin,carryV247:carry}];
 a=await settle('legacy','first',firstGames);
 assert.equal(a.payoutControlV3.sixDropV247.bankUnits,12845);
 assert.equal(a.payoutControlV3.wallet.credit,1000000-100+first.totalWin);
 const revision=a.payoutControlV3.sixDropV247.revision,wallet=a.payoutControlV3.wallet.credit;
 a=await settle('legacy','first',firstGames);
 assert.equal(a.payoutControlV3.sixDropV247.revision,revision,'settlement retry does not accumulate twice');
 assert.equal(a.payoutControlV3.wallet.credit,wallet,'settlement retry does not award twice');
 const separate=await request('state','new-player');assert.equal(separate.payoutControlV3.sixDropV247.bankUnits,0);

 a=await join('legacy','second',[candy(3000)]);
 assert.equal(a.payoutControlV3.sixDropV247.bankUnits,12845,'changing BET never reprices saved medals');
 const next=oneDrop(3000,a.payoutControlV3.sixDropV247,2);
 assert.deepEqual(next.state.palette,R.palette(100),'the next game adopts the newly unlocked color');
 assert.equal(next.state.bankUnits,27845,'new BET affects the new drop only');
 await settle('legacy','second',[{...candy(3000),win:next.totalWin,carryV247:R.carryOut(next.state,'second')}]);
 const bridge=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];
 const round={id:'second',sequence:2,participants:{legacy:{totalBet:3000,creditAfterBet:wallet-3000}}};
 bridge.operatorCancel('public-01',round,'cancel-second');
 a=await request('state','legacy');
 assert.equal(a.payoutControlV3.sixDropV247.bankUnits,12845,'cancellation restores the precise pre-BET bank');
 assert.equal(a.payoutControlV3.sixDropV247.removed,100,'cancellation also restores color progress');
 assert.equal(a.payoutControlV3.wallet.credit,wallet);
 const refundedRevision=a.payoutControlV3.sixDropV247.revision;
 bridge.operatorCancel('public-01',round,'cancel-second-again');
 a=await request('state','legacy');assert.equal(a.payoutControlV3.sixDropV247.revision,refundedRevision);

 await join('legacy','own-zero',[candy(100),{id:'cookie',bet:100}]);
 a=await settle('legacy','own-zero',[{...candy(100),win:0,carryV247:carry},{id:'cookie',bet:100,win:70}]);
 assert.equal(a.payoutControlV3.currentRoundWin,70,'another game can win in the reset round');
 for(const key of ['bankUnits','removed','feed'])assert.equal(a.payoutControlV3.sixDropV247[key],0,'Six Drop own zero WIN resets '+key);
 await join('passive','other-only',[{id:'cookie',bet:100}]);
 const passive=await settle('passive','other-only',[{id:'cookie',bet:100,win:0}]);
 assert.equal(passive.payoutControlV3.sixDropV247.bankUnits,54321,'not playing Six Drop cannot reset its carry');

 // The browser worker revives all state fields. Exercise the real restore
 // function with a serialised mid-game state rather than a hand-built clone.
 const workerSource=await readFile(new URL('../assets/server-offline-settlement-worker-v3.js',import.meta.url),'utf8');
 const entry=workerSource.lastIndexOf('install();');assert.ok(entry>0);
 const window={},context=vm.createContext({window,location:{search:'?serverSettlementWorker=1'},URLSearchParams,setTimeout,console});
 vm.runInContext(workerSource.slice(0,entry)+'window.testRestore=restore;\n})();',context);
 let restores=0;const engine={afterCheckpointRestoreV247(){restores++;}},app={engines:[engine]};
 const saved=JSON.parse(JSON.stringify({engines:[{state:first.state}],credit:999900,draws:[1]}));
 assert.equal(window.testRestore(app,saved),true);assert.equal(restores,1);
 assert.deepEqual(JSON.parse(JSON.stringify(engine.state.palette)),first.state.palette,'worker restore retains the locked color combination');
 assert.equal(engine.state.bankUnits,12845);assert.equal(engine.state.removedTotal,100);
 assert.deepEqual(JSON.parse(JSON.stringify(engine.state)),first.state,'worker checkpoint revival preserves the exact deterministic game state');

 // Cold-load in a separate process to exercise the production on-disk
 // normalizer, then force a normal reservation write of that loaded state.
 const moduleUrl=new URL('../server-payout-preload-v3.mjs',import.meta.url).href;
 const child=spawnSync(process.execPath,['--input-type=module','-e',
  `await import(${JSON.stringify(moduleUrl)});globalThis[Symbol.for('sweets-link.payout-v3.wallet')].reserve('public-01','passive',{id:'restart-check',participants:{}},{totalBet:100,bets:[100],enabled:[true]});`
 ],{env:{...process.env,SWEETS_DATA_DIR:temp},encoding:'utf8',timeout:10000});
 assert.equal(child.status,0,child.stderr);
 const disk=JSON.parse(await readFile(file,'utf8'));
 assert.equal(disk.machines['public-01'].players.passive.sixDropV247.bankUnits,54321,'server restart preserves saved medal value');
 assert.equal(disk.machines['public-01'].players.passive.sixDropV247.removed,430,'server restart preserves color progress');
 assert.equal(disk.machines['public-01'].players.legacy.sixDropV247.bankUnits,0,'zero-WIN reset is durable');
 console.log('SIXDROP_SERVER_V248_PASS: old balance migration, 0.05 BET accrual, fixed palette carry, independent players, retries, cancel rollback, own-zero reset, worker restoration and cold restart');
}finally{
 await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});
}
