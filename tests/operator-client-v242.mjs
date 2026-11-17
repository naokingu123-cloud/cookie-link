import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('./shared-v228-credit-rebet.mjs',import.meta.url),'utf8');
const boundary=source.indexOf('\nconst joins=h=>');assert.ok(boundary>0);
let fixture=source.slice(0,boundary);
fixture=fixture.replace("source='initial';","source='initial',refunds=[];");
fixture=fixture.replace("const control={version:3,playerId:'PLAYER',","const control={version:3,playerId:'PLAYER',refundsV242:refunds,");
fixture=fixture.replace('getWallet:()=>({credit,revision}),',`getWallet:()=>({credit,revision}),
  refund(id){credit+=reservations.get(id)||0;revision++;source='admin-refund';lastRoundId=id;reservedRoundId=null;refunds=[{roundId:id,requestId:'client-fixture-242',refundedBet:reservations.get(id)||0,credit,revision,at:h.context.Date.now()}];return refunds[0];},`);
fixture+='\nexport {harness};\n';
const temp=new URL('../.runtime/operator-fixture-v242.mjs',import.meta.url);await fs.mkdir(new URL('../.runtime/',import.meta.url),{recursive:true});await fs.writeFile(temp,fixture);
try{
 const {harness}=await import(temp.href+'?'+Date.now()),h=harness();await h.advance(5000);h.betting('cancel-current-242');await h.advance(1200);h.playing();await h.advance(1400);
 assert.equal(h.app.credit,973000);assert.equal(h.app.phase,'playing');assert.equal(h.machine.active.roundId,'cancel-current-242');
 h.machine.client.accept({type:'round_cancelled',reason:'admin_refund',cancelledRoundId:'cancel-current-242',round:{...h.round,phase:'CANCELLED'}});
 assert.equal(h.machine.active,null);assert.equal(h.app.phase,'ready');assert.equal(h.app.credit,973000,'do not guess a refund before private wallet confirmation');
 const notice=h.refund('cancel-current-242');h.betting('forced-next-242');h.round.forcedFromRoundId='cancel-current-242';h.snapshot();await h.advance(4000);
 assert.equal(h.app.credit,1000000);assert.equal(h.app.displayCredit,1000000);assert.equal(h.machine.active,null);assert.equal(h.app.phase,'ready');assert.equal(h.events.filter(x=>x.kind==='join'&&x.payload.roundId==='forced-next-242').length,0,'refund does not immediately re-debit AUTO REBET');
 assert.equal(h.events.filter(x=>x.kind==='settle'&&x.payload.roundId==='cancel-current-242').length,0,'cancelled game is neither loss nor payout');
 assert.equal(h.control.describe().losses.length,0);assert.equal(h.control.describe().pendingSettlements.length,0);
 assert.equal(h.control.requestBet(),true);await h.advance(1200);assert.equal(h.app.credit,973000);assert.equal(h.events.filter(x=>x.kind==='join'&&x.payload.roundId==='forced-next-242').length,1);
 const credit=h.app.credit;h.control.operatorStateV242({version:3,playerId:'OTHER',wallet:{credit:1,revision:999},refundsV242:[notice]});assert.equal(h.app.credit,credit);
 assert.equal(h.errors.length,0,JSON.stringify(h.errors));console.log('OPERATOR_CLIENT_V242_PASS');
}finally{await fs.rm(temp,{force:true});}
