import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Run the real installed Client, Arcade, controller and payout module with
// public WS/GET messages arriving after the successful personalized POST.
const source=await fs.readFile(new URL('./shared-v227-client-install.mjs',import.meta.url),'utf8');
const boundary=source.indexOf('\nasync function stable(');assert.ok(boundary>0);
let fixture=source.slice(0,boundary);
fixture=fixture.replace('function harness({joinDelay=5,loseJoinAck=false,foreignParticipant=false}={}){',
 'function harness({joinDelay=5,loseJoinAck=false,foreignParticipant=false,publicAck=false}={}){');
fixture=fixture.replace("else if(path.endsWith('/state')){data=snapshot();", "else if(path.endsWith('/state')){data=snapshot();if(publicAck&&data.round)data.round.participant=null;");
fixture=fixture.replace("later(()=>sockets.at(-1)?.deliver({...snapshot(),type:'bet_updated'}),1);",
 "later(()=>{const notice={...snapshot(),type:'bet_updated'};if(publicAck)notice.round.participant=null;sockets.at(-1)?.deliver(notice);},1);");
fixture+='\nexport {harness};\n';
const temp=new URL('../.runtime/join-ack-fixture-v248.mjs',import.meta.url);
await fs.mkdir(new URL('../.runtime/',import.meta.url),{recursive:true});await fs.writeFile(temp,fixture);
try{
 const {harness}=await import(temp.href+'?'+Date.now());
 const h=harness({publicAck:true});await h.advance(5000);assert.equal(h.control.stable(),true);
 h.betting('public-newer-than-own-ack');await h.advance(2200);
 const joins=h.events.filter(e=>e.kind==='join');
 assert.equal(joins.length,1,'a newer public snapshot must not make a successful own-token reservation post twice');
 assert.equal(h.control.describe().joinedRoundId,'public-newer-than-own-ack');
 assert.equal(h.machine.client.round.participant?.clientRoundToken,joins[0].payload.clientRoundToken,'merge only the acknowledged participant into the current round');
 h.playing();await h.advance(1400);
 assert.equal(h.app.phase,'playing');assert.equal(h.machine.active?.roundId,'public-newer-than-own-ack');
 assert.equal(h.events.filter(e=>e.kind==='settle').length,0,'the acknowledged live reservation is not an abandoned game');
 assert.equal(h.errors.length,0,JSON.stringify(h.errors));
 console.log('CLIENT_JOIN_ACK_V248_PASS: newer public state retains exact own-token POST acknowledgement and reserves/starts once');
}finally{await fs.rm(temp,{force:true});}
