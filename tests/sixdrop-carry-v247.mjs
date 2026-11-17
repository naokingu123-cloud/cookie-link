import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const temp=await mkdtemp(path.join(os.tmpdir(),'sixdrop-carry247-'));
process.env.SWEETS_DATA_DIR=temp;process.env.SWEETS_ADMIN_TOKEN='carry-test';
await import('../server-payout-preload-v3.mjs');
const send=(res,payload)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(payload));};
const server=http.createServer(async(req,res)=>{let body={};if(req.method==='POST'){const chunks=[];for await(const b of req)chunks.push(b);body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}
 const url=new URL(req.url,'http://localhost'),player=String(req.headers['x-player-id']||'');
 if(url.pathname.endsWith('/join'))return send(res,{ok:true,round:{id:body.roundId,phase:'BETTING',participant:{playerId:player}}});
 if(url.pathname.endsWith('/settle'))return send(res,{ok:true,settlement:{playerId:player}});
 return send(res,{ok:true,round:null,pendingRound:null});
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const request=async(route,id,body)=>{const r=await fetch(base+'/api/machines/public-01/'+route,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-player-id':id},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200);return r.json();};
const join=(id,round,bet=100)=>request('round/join',id,{roundId:round,totalBet:bet,bets:[bet],enabled:[true],creditAfterBet:1e6-bet,payoutV3Bet:{version:3,games:[{id:'candy',bet,rulesVersion:247}]}});
const settle=(id,round,bet,win,carry)=>request('round/settle',id,{roundId:round,totalWin:win,creditAfter:1e6-bet+win,payoutV3:{version:3,games:[{id:'candy',bet,win,rulesVersion:247,carryV247:carry}]}});
try{
 let a=await join('a','one');assert.equal(a.payoutControlV3.sixDropV247.bankUnits,0);
 const carry={version:247,bankUnits:13900,removed:139,feed:210};
 a=await settle('a','one',100,120,carry);assert.equal(a.payoutControlV3.sixDropV247.bankUnits,13900);assert.equal(a.payoutControlV3.wallet.credit,1000020);
 const rev=a.payoutControlV3.sixDropV247.revision;
 a=await settle('a','one',100,120,carry);assert.equal(a.payoutControlV3.sixDropV247.revision,rev,'settlement retry does not increase bank again');
 let b=await join('b','other',100);assert.equal(b.payoutControlV3.sixDropV247.bankUnits,0,'separate players have separate meters');
 a=await join('a','two',3000);assert.equal(a.payoutControlV3.sixDropV247.bankUnits,13900,'new BET cannot reprice bank');
 await settle('a','two',3000,700,{version:247,bankUnits:28000,removed:186,feed:290});
 const bridge=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];
 const core={id:'two',sequence:2,participants:{a:{totalBet:3000,creditAfterBet:997020}}};
 bridge.operatorCancel('public-01',core,'cancel-two');
 a=await request('state','a');assert.equal(a.payoutControlV3.sixDropV247.bankUnits,13900,'forced BET restores the exact pre-round progressive');assert.equal(a.payoutControlV3.wallet.credit,1000020);
 const cancelRev=a.payoutControlV3.sixDropV247.revision;bridge.operatorCancel('public-01',core,'cancel-two-again');
 a=await request('state','a');assert.equal(a.payoutControlV3.sixDropV247.revision,cancelRev,'refund is idempotent');
 await join('a','three',100);a=await settle('a','three',100,0,carry);assert.equal(a.payoutControlV3.sixDropV247.bankUnits,0);assert.equal(a.payoutControlV3.sixDropV247.removed,0);assert.equal(a.payoutControlV3.sixDropV247.feed,0);
 const disk=JSON.parse(await readFile(path.join(temp,'payout-control-v3.json'),'utf8'));assert.equal(disk.machines['public-01'].players.a.sixDropV247.bankUnits,0);assert.equal(disk.machines['public-01'].players.a.sixDropV247.roundId,'three');
 console.log('SIXDROP_CARRY_V247_PASS: per-player persistence, no reprice, one settlement, forced-refund rollback and zero-WIN reset');
}finally{await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
