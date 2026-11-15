import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const temp=await mkdtemp(path.join(os.tmpdir(),'payout-v2-'));
process.env.SWEETS_DATA_DIR=temp;process.env.SWEETS_ADMIN_TOKEN='admin-test';
await import('../server-payout-preload-v2.mjs');
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.includes('/round/checkpoint')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const text=JSON.stringify({ok:true});res.writeHead(200,{'content-type':'application/json','content-length':Buffer.byteLength(text)});res.end(text);return;}
 if(url.pathname.endsWith('/state')){const text=JSON.stringify({ok:true,round:null});res.writeHead(200,{'content-type':'application/json','content-length':Buffer.byteLength(text)});res.end(text);return;}
 if(url.pathname.match(/^\/api\/admin\/machines\/[^/]+$/)){const text=JSON.stringify({ok:true,round:{players:[]}});res.writeHead(200,{'content-type':'application/json','content-length':Buffer.byteLength(text)});res.end(text);return;}
 res.writeHead(404);res.end('{}');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port,base='http://127.0.0.1:'+port;
async function checkpoint(player,round,ball,bet,win,appliedRate=90){const response=await fetch(base+'/api/machines/public-01/round/checkpoint',{method:'POST',headers:{'content-type':'application/json','x-player-id':player},body:JSON.stringify({roundId:round,ballIndex:ball,state:{payoutV2:{version:2,ball,credit:1000,roundWin:win,games:[{id:'cookie',bet,win,processed:ball,appliedRate}]}}})});assert.equal(response.status,200);return response.json();}
const a1=await checkpoint('A','r1',1,100,200);assert.equal(a1.payoutControlV2.games.cookie.effectiveRate,89);
const b1=await checkpoint('B','r1',1,10,9);assert.equal(b1.payoutControlV2.games.cookie.effectiveRate,90,'player A result must not affect player B');
const a2=await checkpoint('A','r1',2,100,220,89);assert.equal(a2.payoutControlV2.games.cookie.bet,100);assert.equal(a2.payoutControlV2.games.cookie.win,220);
const a3=await checkpoint('A','r1',3,100,225,88);assert.ok(a3.payoutControlV2.games.cookie.effectiveRate<89);
const state=await fetch(base+'/api/machines/public-01/state',{headers:{'x-player-id':'A'}}).then(r=>r.json());assert.equal(state.payoutControlV2.playerId,'A');
const monitor=await fetch(base+'/api/admin/machines/public-01?adminToken=admin-test').then(r=>r.json());const pa=monitor.payoutControlV2.players.find(p=>p.playerId==='A');assert.equal(pa.ballHistory.length,3);assert.equal(pa.ballHistory[2].roundWin,225);
const manual=await fetch(base+'/api/admin/machines/public-01/payout-v2/players/A/games/cookie?adminToken=admin-test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'manual',manualRate:77.5})}).then(r=>r.json());assert.equal(manual.control.games.cookie.effectiveRate,77.5);
await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});
console.log('payout v2 runtime isolation, nWIN history and manual game control passed');
