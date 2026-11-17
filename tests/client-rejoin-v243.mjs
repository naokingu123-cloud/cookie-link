import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('./shared-v228-credit-rebet.mjs',import.meta.url),'utf8');
const boundary=source.indexOf('\nconst joins=h=>');assert.ok(boundary>0);
let fixture=source.slice(0,boundary);
fixture=fixture.replace("source='initial';","source='initial',refunds=[];");
fixture=fixture.replace("const control={version:3,playerId:'PLAYER',","const control={version:3,playerId:'PLAYER',refundsV242:refunds,");
fixture=fixture.replace('getWallet:()=>({credit,revision}),',`getWallet:()=>({credit,revision}),
  refund(id){credit+=reservations.get(id)||0;revision++;source='admin-refund';lastRoundId=id;reservedRoundId=null;refunds=[{roundId:id,requestId:'client-fixture-243',refundedBet:reservations.get(id)||0,credit,revision,at:h.context.Date.now()}];return refunds[0];},`);
fixture+='\nexport {harness};\n';
const temp=new URL('../.runtime/rejoin-fixture-v243.mjs',import.meta.url);await fs.mkdir(new URL('../.runtime/',import.meta.url),{recursive:true});await fs.writeFile(temp,fixture);
try{
 const {harness}=await import(temp.href+'?'+Date.now());
 for(const automatic of [true,false]){
  const h=harness(),oldId='cancel-v243-'+automatic,nextId='forced-v243-'+automatic;
  await h.advance(5000);h.betting(oldId);await h.advance(1200);h.playing();await h.advance(1400);
  assert.equal(h.app.credit,973000);assert.equal(h.machine.active?.roundId,oldId);
  if(!automatic)h.control.setAutoRebet(false);
  h.machine.client.accept({type:'round_cancelled',reason:'admin_refund',cancelledRoundId:oldId,round:{...h.round,phase:'CANCELLED'}});
  assert.equal(h.machine.active,null);assert.equal(h.app.phase,'ready');assert.equal(h.app.credit,973000,'never guess refund credit');
  h.betting(nextId);h.round.forcedFromRoundId=oldId;h.snapshot();await h.advance(1200);
  assert.equal(h.control.operatorRefundPendingV242(),true);
  assert.equal(h.events.filter(e=>e.kind==='join'&&e.payload.roundId===nextId).length,0,'do not rebet before confirmed wallet revision');
  const notice=h.refund(oldId);h.snapshot();await h.advance(3500);
  assert.equal(h.control.operatorRefundPendingV242(),false);
  const joins=()=>h.events.filter(e=>e.kind==='join'&&e.payload.roundId===nextId);
  if(automatic){assert.equal(joins().length,1,'AUTO ON automatically rejoins a forced BET exactly once');assert.equal(h.app.credit,973000);}
  else{assert.equal(joins().length,0,'AUTO OFF is respected');assert.equal(h.app.credit,1000000);assert.equal(h.control.requestBet(),true);await h.advance(1200);assert.equal(joins().length,1);}
  assert.equal(h.control.describe().joinedRoundId,nextId);
  h.playing();await h.advance(1400);
  assert.equal(h.machine.active?.roundId,nextId,'zero-second server transition starts the forced round, not NEXT');assert.equal(h.app.phase,'playing');assert.equal(h.app.credit,973000,'starting must not debit again');
  assert.equal(h.events.filter(e=>e.kind==='settle'&&e.payload.roundId===oldId).length,0,'cancelled round is never settled as a loss');
  let writes=0;const store=h.context.localStorage,native=store.setItem.bind(store);store.setItem=(...args)=>{writes++;return native(...args);};
  const wallet=h.getWallet(),generation=h.control.describe().generation;
  const message={version:3,playerId:'PLAYER',wallet:{...wallet,lastRoundId:nextId,source:'bet'},refundsV242:[notice]};
  for(let i=0;i<100;i++)h.control.operatorStateV242(message);
  assert.equal(writes,0,'100 unchanged old refund notices cause zero synchronous storage writes');
  assert.equal(h.control.describe().generation,generation,'duplicate notices cannot rebuild the board');assert.equal(h.machine.active?.roundId,nextId);
  h.control.operatorStateV242({...message,playerId:'OTHER',wallet:{credit:1,revision:999}});assert.equal(h.app.credit,973000);
  assert.equal(h.errors.length,0,JSON.stringify(h.errors));
 }
 console.log('CLIENT_REJOIN_V243_PASS',JSON.stringify({autoOn:'one rebet then PLAYING',autoOff:'manual BET preserved',refundBeforeRebet:true,duplicateNotices:100,duplicateStorageWrites:0,staleRefundCannotReset:true}));
}finally{await fs.rm(temp,{force:true});}
