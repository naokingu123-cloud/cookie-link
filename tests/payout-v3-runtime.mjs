import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket,WebSocketServer} from 'ws';

const temp=await mkdtemp(path.join(os.tmpdir(),'payout-v3-'));
process.env.SWEETS_DATA_DIR=temp;process.env.SWEETS_ADMIN_TOKEN='admin-test';
await import('../server-payout-preload-v3.mjs');
let adminRound=null;
const pendingByPlayer=new Map();
function send(res,payload,status=200){const text=JSON.stringify(payload);res.writeHead(status,{'content-type':'application/json','content-length':Buffer.byteLength(text)});res.end(text);}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),player=String(req.headers['x-player-id']||'');
 if(url.pathname.endsWith('/round/join')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');send(res,{ok:true,round:{id:body.clientRoundToken?.includes('r2')?'r2':body.clientRoundToken?.includes('rB')?'rB':'r1',phase:'BETTING',participant:{playerId:player}}});return;}
 if(url.pathname.endsWith('/round/checkpoint')){for await(const _ of req){}send(res,{ok:true});return;}
 if(url.pathname.endsWith('/round/settle')){for await(const _ of req){}send(res,{ok:true,settlement:{playerId:player}});return;}
 if(url.pathname.endsWith('/state')){send(res,{ok:true,round:null,pendingRound:pendingByPlayer.get(player)||null});return;}
 if(url.pathname.match(/^\/api\/admin\/machines\/[^/]+$/)){send(res,{ok:true,machine:{hostConnected:true},round:adminRound});return;}
 send(res,{error:'not_found'},404);
});
const wss=new WebSocketServer({server});wss.on('connection',()=>{});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port,base='http://127.0.0.1:'+port;
const auth=player=>({'content-type':'application/json','x-player-id':player});
async function post(pathname,player,body){const response=await fetch(base+pathname,{method:'POST',headers:auth(player),body:JSON.stringify(body)});assert.equal(response.status,200);return response.json();}
async function getState(player){const response=await fetch(base+'/api/machines/public-01/state',{headers:{'x-player-id':player}});assert.equal(response.status,200);return response.json();}
const joinBody=(token,totalBet,games)=>({clientRoundToken:token,totalBet,bets:games.map(g=>g.bet),locked:games.map(g=>g.bet),enabled:games.map(()=>true),creditAfterBet:900,payoutV3Bet:{version:3,games}});

try{
 const aJoin=await post('/api/machines/public-01/round/join','A',joinBody('r1',100,[{id:'cookie',bet:60},{id:'choco',bet:40}]));
 assert.equal(aJoin.payoutControlV3.effectiveRate,90);assert.equal(aJoin.payoutControlV3.source,'per-player-common');
 const aBall=await post('/api/machines/public-01/round/checkpoint','A',{roundId:'r1',ballIndex:3,state:{credit:900,payoutV3:{version:3,ball:3,complete:true,phase:'PLAYING',credit:900,roundBet:100,roundWin:30,games:[{id:'cookie',bet:60,win:20,appliedRate:90},{id:'choco',bet:40,win:10,appliedRate:90}]}}});
 assert.equal(aBall.payoutControlV3.currentRoundWin,30);assert.equal(aBall.payoutControlV3.lifetimeWin,0,'per-ball nWIN must not inflate cumulative WIN');
 const aSettle=await post('/api/machines/public-01/round/settle','A',{roundId:'r1',totalWin:120,creditAfter:1020,digest:'a-r1',payoutV3:{version:3,games:[{id:'cookie',bet:60,win:70,appliedRate:90},{id:'choco',bet:40,win:50,appliedRate:90}]}});
 assert.equal(aSettle.payoutControlV3.currentRoundWin,120);assert.equal(aSettle.payoutControlV3.lifetimeWin,120);assert.equal(aSettle.payoutControlV3.lifetimeBet,100);
 assert.equal(aSettle.payoutControlV3.games.cookie.win,70);assert.equal(aSettle.payoutControlV3.games.choco.win,50);
 const low=await post('/api/machines/public-01/round/join','A',joinBody('r2-low',10,[{id:'cookie',bet:5},{id:'choco',bet:5}]));
 assert.equal(low.payoutControlV3.effectiveRate,50,'low BET may receive a bounded strong correction');
 const high=await post('/api/machines/public-01/round/join','A',joinBody('r2-high',1000,[{id:'cookie',bet:500},{id:'choco',bet:500}]));
 assert.ok(high.payoutControlV3.effectiveRate>85&&high.payoutControlV3.effectiveRate<95,'switching back to high BET must immediately reprice instead of retaining the low-BET extreme');
 assert.equal(high.payoutControlV3.effectiveRate,high.payoutControlV3.desiredRate);

 await post('/api/machines/public-01/round/join','B',joinBody('rB',100,[{id:'cookie',bet:100}]));
 await post('/api/machines/public-01/round/checkpoint','B',{roundId:'rB',ballIndex:0,state:{phase:'playing',credit:900,bets:[100],locked:[100],enabled:[true],paid:[false],draws:[],roundWins:[0],totalWin:0,engines:[{kind:'cookie',processed:0,totalHundredths:0}],payoutV3:{version:3,ball:0,complete:true,phase:'PLAYING',credit:900,roundBet:100,roundWin:0,games:[{id:'cookie',bet:100,win:0,appliedRate:90}]}}});
 const socket=await new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=B&token=x`);ws.once('open',()=>resolve(ws));ws.once('error',reject);});
 socket.close();await new Promise(resolve=>setTimeout(resolve,80));
 adminRound={id:'rB',phase:'COMPLETE',balls:Array.from({length:8},(_,index)=>({index:index+1,number:index+1}))};pendingByPlayer.set('B',{id:'rB',phase:'COMPLETE',participant:{playerId:'B'}});
 await fetch(base+'/api/admin/machines/public-01?adminToken=admin-test').then(response=>response.json());
 const workResponse=await fetch(base+'/api/admin/machines/public-01/payout-v3/offline-work?adminToken=admin-test').then(response=>response.json());
 assert.ok(workResponse.work);assert.equal(workResponse.work.playerId,'B');assert.equal(workResponse.work.balls.length,8);assert.equal(workResponse.work.stableBall,0);
 const completed=await fetch(base+'/api/admin/machines/public-01/payout-v3/offline-work/complete?adminToken=admin-test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:workResponse.work.token,playerId:'B',roundId:'rB',totalWin:80,creditAfter:980,games:[{id:'cookie',bet:100,win:80,appliedRate:90}]})}).then(response=>response.json());
 assert.equal(completed.settlement.source,'server-worker');
 const bState=await getState('B');assert.equal(bState.pendingRound,null,'server-settled round must not replay on the client');assert.equal(bState.payoutControlV3.offlinePending,false);assert.equal(bState.payoutControlV3.wallet.credit,980);assert.equal(bState.payoutControlV3.wallet.source,'server-worker');assert.equal(bState.payoutControlV3.lifetimeWin,80);
 console.log('common player rate, BET-shock repricing, WIN semantics and offline settlement runtime passed');
}finally{
 await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});
}
