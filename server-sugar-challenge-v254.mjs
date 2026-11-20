// Server-owned Sugar receipts, FIFO consumption and bonus settlement. This
// module receives the real shared-round history; it never generates a ball.
// Its caller persists player.sugarV254 and player.wallet in the SAME payout DB
// transaction and calls start only at the opening of a shared BET window.
import {createHash,randomBytes} from 'node:crypto';
import './assets/sugar-challenge-rules-v254.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const id=value=>typeof value==='string'&&value.length>0&&value.length<=512?value:null;
const medal=value=>Number.isSafeInteger(value)&&value>=0;
const positive=value=>medal(value)&&value>0;
const dictionary=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const keyHash=value=>createHash('sha256').update(value).digest('hex').slice(0,24);
const ordinarySugar=token=>token.directJpc!==true&&token.kind!=='direct-jpc'&&token.jpcRedeemed!==true;

export function createSugarChallengeLedger({rules=globalThis.SugarChallengeRulesV254,randomSeed=()=>randomBytes(4).readUInt32LE(0),now=Date.now}={}){
 if(![254,268,270].includes(rules?.REVISION))throw new Error('Compatible Sugar Challenge rules are required.');
 const timestamp=()=>{const value=Number(now());if(!Number.isSafeInteger(value)||value<0)throw new RangeError('Invalid Sugar Challenge server time.');return value;};
 const seed=()=>{const value=Number(randomSeed());if(!Number.isSafeInteger(value)||value<0||value>0xffffffff)throw new RangeError('Sugar Challenge seed must be a uint32.');return value;};

 function normalize(player){
  if(!player||typeof player!=='object')throw new TypeError('A payout player is required.');
  const value=player.sugarV254;
  if(value?.version!=null&&value.version!==254)throw new RangeError('Unsupported Sugar Challenge ledger version.');
  const ledger=player.sugarV254=value&&typeof value==='object'?value:{};
  ledger.version=254;ledger.revision=medal(ledger.revision)?ledger.revision:0;
  ledger.sequence=medal(ledger.sequence)?ledger.sequence:0;ledger.challengeSequence=medal(ledger.challengeSequence)?ledger.challengeSequence:0;
  ledger.bank=Array.isArray(ledger.bank)?ledger.bank:[];ledger.receipts=dictionary(ledger.receipts);ledger.rounds=dictionary(ledger.rounds);ledger.cancelledRounds=dictionary(ledger.cancelledRounds);
  ledger.currentRoundId=id(ledger.currentRoundId);ledger.lastRoundId=id(ledger.lastRoundId);ledger.legacyImported=ledger.legacyImported===true;
  return ledger;
 }
 const getRound=(ledger,roundId)=>own(ledger.rounds,roundId)?ledger.rounds[roundId]:null;
 const isCancelled=(ledger,roundId)=>own(ledger.cancelledRounds,roundId);
 const storedState=record=>record&&record.status!=='cancelled'?rules.restore(record.state):null;
 const activeRecord=ledger=>Object.values(ledger.rounds).find(record=>{const state=storedState(record);return state&&state.phase!=='complete';})||null;
 function challengeView(record){
  if(!record)return null;
  const state=rules.restore(record.state);if(!state)return null;
  const cancelled=record.status==='cancelled';
  return {...state,...(cancelled?{phase:'cancelled',award:null,cashWin:0,jpcQualified:false,jpcTicket:null}:{}),
   sugarTokens:clone(record.consumed||[]),openedAt:record.openedAt,startedAt:record.startedAt,completedAt:record.completedAt||null,
   cancelledAt:record.cancelledAt||null,cancelReason:record.cancelReason||null,paymentStatus:cancelled?'void':record.paid?'paid':'pending',cashPaid:record.paid&&!record.reversed?record.paidCash||0:0};
 }
 function publicState(player){
  const ledger=normalize(player),current=challengeView(activeRecord(ledger)),last=challengeView(getRound(ledger,ledger.lastRoundId)),challenge=current||last;
  return {version:254,revision:ledger.revision,bank:clone(ledger.bank),acceptedIds:Object.keys(ledger.receipts),queued:ledger.bank.filter(ordinarySugar).length>=rules.SUGAR_COUNT,legacyImported:ledger.legacyImported,
   challenge,current,last,startedAt:challenge?.startedAt??null,openedAt:challenge?.openedAt??null,jpcTickets:Object.values(ledger.rounds).filter(record=>record.status!=='cancelled').map(record=>rules.restore(record.state)?.jpcTicket).filter(Boolean).map(clone)};
 }
 const result=(player,changed,extra={})=>({changed,...publicState(player),...extra});
 function commit(player,draft,{delta=0,roundId=null,at=timestamp(),source='sugar-challenge',settlement=false}={}){
  if(!Number.isSafeInteger(delta))throw new RangeError('Invalid Sugar Challenge wallet delta.');
  let wallet=null,lifetimeWin=player.lifetimeWin??0,game=null;
  if(delta!==0){
   const current=player.wallet?.credit,total=player.lifetimeWin??0,previous=player.games?.['sugar-challenge']||{bet:0,win:0};
   if(!medal(current)||!medal(total)||!medal(previous.win??0))throw new RangeError('Sugar Challenge requires an initialized integer wallet.');
   const credit=BigInt(current)+BigInt(delta),lifetime=BigInt(total)+BigInt(delta),gameWin=BigInt(previous.win??0)+BigInt(delta),max=BigInt(Number.MAX_SAFE_INTEGER);
   if(credit<0n||lifetime<0n||gameWin<0n||credit>max||lifetime>max||gameWin>max)throw new RangeError('Sugar Challenge wallet adjustment exceeds the available balance or safe integer range.');
   wallet={...player.wallet,credit:Number(credit),revision:(Number(player.wallet.revision)||0)+1,lastRoundId:roundId,source,updatedAt:at};
   lifetimeWin=Number(lifetime);game={...previous,bet:previous.bet??0,win:Number(gameWin)};
  }
  draft.revision++;draft.updatedAt=at;
  // All validation happens before these assignments. The owner persists them
  // atomically with normal settlements, without including this cash in totalWin.
  player.sugarV254=draft;
  if(wallet){player.wallet=wallet;player.lifetimeWin=lifetimeWin;player.games=player.games||{};player.games['sugar-challenge']=game;}
  else if(settlement){player.games=player.games||{};player.games['sugar-challenge']||={bet:0,win:0};}
  player.updatedAt=at;
 }
 function sourceBet(token,{locked,bets,games,legacy}){
  const index=Number(token.game),hasIndex=Number.isInteger(index)&&index>=0&&index<100,name=id(token.sourceGame);
  const select=values=>{
   if(Array.isArray(values)&&hasIndex&&index<values.length)return {present:true,value:values[index]};
   if(values&&typeof values==='object'&&name&&own(values,name))return {present:true,value:values[name]?.bet??values[name]};
   return {present:false};
  };
  for(const values of [locked,bets]){const found=select(values);if(found.present)return positive(Number(found.value))?Number(found.value):null;}
  if(Array.isArray(games)){
   const item=name?games.find(row=>String(row?.id||row?.kind)===name):hasIndex?games[index]:null;
   if(item&&positive(Number(item.bet)))return Number(item.bet);
  }else if(name&&games&&own(games,name)&&positive(Number(games[name]?.bet)))return Number(games[name].bet);
  return legacy&&positive(Number(token.value))?Number(token.value):null;
 }
 function ingest(player,{roundId,tokens,locked,bets,games,payoutRate=100,legacy=false}={}){
  const ledger=normalize(player),round=id(roundId);
  if(!round||!Array.isArray(tokens))return result(player,false,{acceptedCount:0,rejectedCount:0,reason:'invalid-input'});
  if(isCancelled(ledger,round))return result(player,false,{acceptedCount:0,rejectedCount:tokens.length,reason:'cancelled-round'});
  if(legacy&&ledger.legacyImported)return result(player,false,{acceptedCount:0,rejectedCount:0,reason:'legacy-already-imported'});
  const draft=clone(ledger),accepted=[],rejected=[],at=timestamp();let skipped=0,redeemed=0;
  for(let index=0;index<tokens.length;index++){
   const token=tokens[index];if(!token||typeof token!=='object'){rejected.push({index,reason:'invalid-token'});continue;}
   const sugarId=id(token.sugarId)||(legacy?id(`legacy:${String(token.game??'unknown')}:${String(token.id??'sugar')}:${index}`):null);
   if(!sugarId){rejected.push({index,reason:'missing-sugar-id'});continue;}
   if(own(draft.receipts,sugarId)){
    const stored=draft.bank.find(item=>item.sugarId===sugarId);
    if(stored&&(stored.directJpc||stored.kind==='direct-jpc')&&token.jpcRedeemed===true&&!stored.jpcRedeemed){stored.jpcRedeemed=true;draft.receipts[sugarId].jpcRedeemed=true;redeemed++;}
    skipped++;continue;
   }
   if(!legacy&&token.sourceRoundId!==round){rejected.push({sugarId,reason:'source-round-mismatch'});continue;}
   const bet=sourceBet(token,{locked,bets,games,legacy});
   if(!bet){rejected.push({sugarId,reason:'missing-source-bet'});continue;}
   const value=Number(token.value);if(!positive(value)){rejected.push({sugarId,reason:'invalid-visual-value'});continue;}
   const quote=rules.quoteSugar({bet,payoutRate,seed:seed()}),sequence=++draft.sequence,serverSugarId=`s254:${keyHash(String(player.playerId||'player'))}:${sequence}`;
   const stored={id:typeof token.id==='number'||typeof token.id==='string'?token.id:sugarId,value,game:Number.isInteger(Number(token.game))?Number(token.game):null,
    sourceGame:typeof token.sourceGame==='string'?token.sourceGame.slice(0,100):null,sugarId,serverSugarId,sourceRoundId:round,sequence,acceptedAt:at,legacy:!!legacy,...quote};
   for(const property of ['tier','kind','directJpc','jpcRedeemed'])if(['string','number','boolean'].includes(typeof token[property]))stored[property]=token[property];
   draft.bank.push(stored);Object.defineProperty(draft.receipts,sugarId,{value:{sugarId,serverSugarId,sourceRoundId:round,sequence,acceptedAt:at,legacy:!!legacy},enumerable:true,writable:true,configurable:true});accepted.push(sugarId);
  }
  if(legacy){draft.legacyImported=true;draft.legacyImportedAt=at;}
  const changed=accepted.length>0||redeemed>0||legacy;
  if(changed)commit(player,draft,{at});
  return result(player,changed,{acceptedCount:accepted.length,accepted,skippedCount:skipped,rejectedCount:rejected.length,rejected});
 }
 function start(player,{roundId,station=1,openedAt}={}){
  const ledger=normalize(player),round=id(roundId);
  if(!round||round.length>240||!Number.isInteger(station)||station<1||station>6)return result(player,false,{started:false,reason:'invalid-round'});
  if(isCancelled(ledger,round))return result(player,false,{started:false,reason:'cancelled-round'});
  if(getRound(ledger,round))return result(player,false,{started:false,reason:'already-started'});
  if(activeRecord(ledger))return result(player,false,{started:false,reason:'previous-challenge-pending'});
  const consumed=ledger.bank.filter(ordinarySugar).slice(0,rules.SUGAR_COUNT);
  if(consumed.length<rules.SUGAR_COUNT)return result(player,false,{started:false,reason:'not-enough-sugar'});
  if(consumed.some(token=>token.sourceRoundId===round))return result(player,false,{started:false,reason:'wait-for-next-round'});
  const at=timestamp(),opened=openedAt==null?at:Number(openedAt);
  if(!medal(opened))return result(player,false,{started:false,reason:'invalid-opened-at'});
  const challengeId=`sc254:${keyHash(String(player.playerId||'player')+'\0'+round)}`;
  const state=rules.create({id:challengeId,roundId:round,station,sugarValues:consumed.map(token=>token.challengeValue),seed:seed()});
  const draft=clone(ledger),consumedIds=new Set(consumed.map(token=>token.sugarId));draft.bank=draft.bank.filter(token=>!consumedIds.has(token.sugarId));draft.challengeSequence++;
  Object.defineProperty(draft.rounds,round,{value:{roundId:round,sequence:draft.challengeSequence,status:'ready',state:rules.snapshot(state),consumed:clone(consumed),openedAt:opened,startedAt:at,paid:false,paidCash:0,reversed:false},enumerable:true,writable:true,configurable:true});
  draft.currentRoundId=round;commit(player,draft,{roundId:round,at});return result(player,true,{started:true,reason:null});
 }
 function advance(player,{roundId,balls}={}){
  const ledger=normalize(player),round=id(roundId),record=round?getRound(ledger,round):null;
  if(!record||record.status==='cancelled'||isCancelled(ledger,round))return result(player,false,{advanced:0,settled:false,cashPaid:0,reason:'no-active-challenge'});
  let state=rules.restore(record.state);
  if(!state||!Array.isArray(balls)||balls.length>rules.BALL_COUNT)return result(player,false,{advanced:0,settled:false,cashPaid:0,reason:'invalid-history'});
  const numbers=[];
  for(let index=0;index<balls.length;index++){
   const ball=balls[index],number=typeof ball==='number'?ball:ball?.number;
   if(!Number.isInteger(number)||number<1||number>25||numbers.includes(number)||(ball&&typeof ball==='object'&&ball.index!=null&&ball.index!==index+1))return result(player,false,{advanced:0,settled:false,cashPaid:0,reason:'invalid-history'});
   numbers.push(number);
  }
  if(numbers.some((number,index)=>index<state.draws.length&&state.draws[index]!==number))return result(player,false,{advanced:0,settled:false,cashPaid:0,reason:'history-mismatch'});
  if(numbers.length<state.draws.length)return result(player,false,{advanced:0,settled:false,cashPaid:0,reason:'stale-history'});
  const previousCount=state.draws.length;
  for(let index=previousCount;index<numbers.length;index++)state=rules.advance(state,numbers[index],{roundId:round,ballIndex:index+1});
  if(!state)throw new Error('Validated Sugar Challenge history could not advance.');
  const settled=state.phase==='complete'&&!record.paid,advanced=state.draws.length-previousCount;
  if(!advanced&&!settled)return result(player,false,{advanced:0,settled:false,cashPaid:0,reason:'already-accepted'});
  const draft=clone(ledger),target=getRound(draft,round),at=timestamp();target.state=rules.snapshot(state);target.status=state.phase;
  if(settled){target.paid=true;target.paidCash=state.cashWin;target.paidAt=at;target.completedAt=at;draft.lastRoundId=round;}
  commit(player,draft,{delta:settled?state.cashWin:0,roundId:round,at,settlement:settled});
  return result(player,true,{advanced,settled,cashPaid:settled?state.cashWin:0,reason:null});
 }
 function cancel(player,roundId){
  const ledger=normalize(player),round=id(roundId);
  if(!round)return result(player,false,{cancelled:false,cashReversed:0,restoredCount:0,removedCount:0,reason:'invalid-round'});
  if(isCancelled(ledger,round))return result(player,false,{cancelled:false,cashReversed:0,restoredCount:0,removedCount:0,reason:'already-cancelled'});
  const draft=clone(ledger),at=timestamp();Object.defineProperty(draft.cancelledRounds,round,{value:{at},enumerable:true,writable:true,configurable:true});
  let cashReversed=0,removedCount=0;const restored=[],cancelledChallenges=[];
  for(const record of Object.values(draft.rounds)){
   if(record.status==='cancelled')continue;
   // If an older round is voided after its Sugar has already been consumed,
   // void that dependent challenge too and restore its other valid tokens.
   const depends=(record.consumed||[]).some(token=>token.sourceRoundId===round);
   if(record.roundId!==round&&!depends)continue;
   if(record.paid&&!record.reversed)cashReversed+=record.paidCash||0;
   record.reversed=record.paid===true;record.status='cancelled';record.cancelledAt=at;record.cancelReason=record.roundId===round?'round-cancelled':'source-round-cancelled';record.invalidSourceRoundId=round;
   cancelledChallenges.push(record.roundId);draft.lastRoundId=record.roundId;
   for(const token of record.consumed||[]){if(isCancelled(draft,token.sourceRoundId)){removedCount++;continue;}restored.push(token);}
  }
  const retained=[];
  for(const token of draft.bank){if(isCancelled(draft,token.sourceRoundId))removedCount++;else retained.push(token);}
  const present=new Set(retained.map(token=>token.sugarId));let restoredCount=0;
  for(const token of restored)if(!present.has(token.sugarId)){retained.push(token);present.add(token.sugarId);restoredCount++;}
  draft.bank=retained.sort((a,b)=>a.sequence-b.sequence);
  for(const receipt of Object.values(draft.receipts))if(receipt.sourceRoundId===round)receipt.voided=true;
  if(cancelledChallenges.includes(draft.currentRoundId))draft.currentRoundId=null;
  commit(player,draft,{delta:-cashReversed,roundId:round,at,source:'sugar-challenge-cancel'});
  return result(player,true,{cancelled:true,cancelledChallenges,cashReversed,restoredCount,removedCount,reason:null});
 }
 function publicReach(player,roundId){
  const ledger=normalize(player),round=id(roundId),record=round?getRound(ledger,round):null;
  if(!record||record.status==='cancelled'||isCancelled(ledger,round))return [];
  return rules.reaches(record.state);
 }
 return {normalize,ingest,start,advance,cancel,publicState,publicReach};
}
