/* Local-only Sugar Challenge. BET fixes its card/JP/multiplier; the existing
 * native eight balls advance it. Never accesses a server session or wallet. */
(()=>{
'use strict';
if(window.SweetsEditionV255?.value!=='local')return;
const debug=window.SweetsLocalDebugV258,R=window.SugarChallengeRulesV254,V=window.SweetsSugarChallengeV254;
if(!debug||!R||!V||!app||typeof app.start!=='function')return;
const store=debug.storage,KEY='local-sugar-challenge-v267',SCHEMA=268,copy=x=>JSON.parse(JSON.stringify(x));
const ordinary=t=>t&&t.directJpc!==true&&t.kind!=='direct-jpc'&&t.jpcRedeemed!==true;
let revision=0,challenge=null,consumed=[],settled=false,awardCount=0,openedAt=0,roundSequence=0,tokenSequence=0,updating=false,resetting=false;
const getSaved=()=>{try{const d=JSON.parse(store.getItem(KEY)||'null');return [267,SCHEMA].includes(d?.schema)?d:null;}catch{return null;}};
const saved=getSaved();
if(saved){
 roundSequence=Math.max(0,Number(saved.roundSequence)||0);tokenSequence=Math.max(0,Number(saved.tokenSequence)||0);awardCount=Math.max(0,Number(saved.awardCount)||0);
 const previous=R.restore(saved.challenge),pending=previous&&previous.phase!=='complete';
 // A ready quote survives reloading the BET screen. Local debug does not resume
 // the native board mid-round, so unfinished draws restart with the SAME quote.
 if(pending){challenge=R.restore({...R.snapshot(previous),draws:[]});consumed=copy(saved.consumed||[]);openedAt=Number(saved.openedAt)||Date.now();}
 const recover=!previous&&Array.isArray(saved.consumed)?saved.consumed:[];
 const bank=[...(Array.isArray(saved.bank)?saved.bank:[]),...recover],unique=new Map();
 for(const t of bank)if(t&&typeof t==='object')unique.set(String(t.sugarId||t.id||unique.size),t);
 const consumedIds=new Set(consumed.map(t=>t.sugarId));
 app.wonderBank=[...unique.values()].filter(t=>!consumedIds.has(t.sugarId));
 app.wonderSteps=app.wonderBank.length;app.wonderValue=app.wonderBank.reduce((n,t)=>n+Math.max(0,Number(t.value)||0),0);
}
function persist(){
 try{store.setItem(KEY,JSON.stringify({schema:SCHEMA,bank:copy(app.wonderBank||[]),consumed:copy(consumed),challenge:challenge?R.snapshot(challenge):null,settled,awardCount,openedAt,roundSequence,tokenSequence}));}catch(e){console.warn('[LocalSugar] save',e);}
}
function show(){
 V.stampBank();
 V.accept({version:254,revision:++revision,challenge:challenge?copy(challenge):null,bank:copy(app.wonderBank||[]),acceptedIds:consumed.map(t=>t.sugarId).filter(Boolean),startedAt:openedAt,openedAt,queued:(app.wonderBank||[]).filter(ordinary).length>=5});
}
function sync(){
 if(!challenge||challenge.phase==='complete')return;
 const numbers=Array.isArray(app.draws)?app.draws:[];
 for(let i=challenge.draws.length;i<numbers.length&&i<8;i++){
  const next=R.advance(challenge,numbers[i],{roundId:challenge.roundId,ballIndex:i+1});
  if(!next)throw Error('[LocalSugar] nonsequential native ball');
  challenge=next;
 }
 show();persist();
}
function beginBet(){
 if(updating||resetting||app.phase!=='ready'||challenge)return false;
 updating=true;
 try{
  V.stampBank();
  const bank=app.wonderBank||[],eligible=bank.filter(ordinary).slice(0,5);
  if(eligible.length<5)return false;
  const payoutRate=typeof debugPayoutTarget!=='undefined'&&Number.isFinite(debugPayoutTarget)?debugPayoutTarget:100;
  const values=eligible.map(t=>{
   if(Number.isSafeInteger(t.challengeValue)&&t.challengeValue>0)return t.challengeValue;
   const gameIndex=Number(t.game),bet=Number(t.sourceBet)||Number(app.bets?.[gameIndex])||Number(t.value)||100;
   return R.quoteSugar({bet:Math.max(1,Math.floor(bet)),payoutRate,rng:app.random}).challengeValue;
  });
  const roundId='local:bet:'+Date.now()+':'+(++roundSequence);
  // Validate and freeze the complete quote BEFORE removing any bank tokens.
  const next=R.create({id:roundId+':sugar',roundId,station:1,sugarValues:values,rng:app.random});
  consumed=copy(eligible);const used=new Set(eligible);
  app.wonderBank=bank.filter(t=>!used.has(t));challenge=next;openedAt=Date.now();settled=false;
  app.wonderSteps=app.wonderBank.length;app.wonderValue=app.wonderBank.reduce((sum,t)=>sum+Number(t.value||0),0);
  show();persist();V.setExpanded(true);return true;
 }finally{updating=false;}
}
const nativeStart=app.start;
app.start=function(...args){
 // Preparation is a BET action. Starting the game never rerolls or clears it,
 // even when a native host wrapper signals success through phase, not a boolean.
 beginBet();
 if(this.phase==='ready')this.__sugarWorkRoundId=challenge?.roundId||'local:game:'+Date.now()+':'+(++roundSequence);
 return nativeStart.apply(this,args);
};
const nativeAccept=app.acceptNumber;
app.acceptNumber=function(...args){
 const accepted=nativeAccept.apply(this,args);
 if(accepted&&challenge)sync();
 return accepted;
};
const nativeFinish=app.finishRound;
app.finishRound=function(...args){
 if(this.phase==='playing'&&challenge)sync();
 const wasPlaying=this.phase==='playing',result=nativeFinish.apply(this,args);
 if(wasPlaying&&this.phase==='result'&&challenge?.phase==='complete'&&!settled){
  const award=Number(challenge.cashWin)||0;
  if(award>0&&(!Number.isSafeInteger(award)||!Number.isSafeInteger(this.totalWin+award)))throw Error('[LocalSugar] unsafe award');
  settled=true;
  if(award>0){this.totalWin+=award;awardCount++;this.onChange(this);}
  show();persist();
 }
 return result;
};
const nativePrepare=app.prepare;
app.prepare=function(...args){
 // The native countdown may already be 'playing' while the physical first
 // ball has not landed. Switching to manual mode calls prepare() in that gap.
 // Keep the fixed BET quote until a ball has actually entered the challenge;
 // changing the draw controller must not consume/requote the same five Sugar.
 V.stampBank();
 const unstarted=challenge&&!settled&&challenge.draws.length===0&&(!Array.isArray(this.draws)||this.draws.length===0);
 if(challenge&&this.phase!=='ready'&&!unstarted){
  if(challenge.phase!=='complete'){
   const bank=app.wonderBank||[],ids=new Set(bank.map(t=>t.sugarId));
   for(const token of consumed)if(!ids.has(token.sugarId)){bank.push(copy(token));ids.add(token.sugarId);}
  }
  challenge=null;consumed=[];settled=false;openedAt=0;
 }
 const result=nativePrepare.apply(this,args);
 if(!beginBet()){show();persist();}return result;
};
const nativeChange=app.onChange;
app.onChange=function(...args){
 const result=nativeChange.apply(this,args);
 if(!updating&&!resetting)beginBet();persist();return result;
};
const nativeReset=app.resetDebug;
app.resetDebug=function(...args){
 resetting=true;challenge=null;consumed=[];settled=false;openedAt=0;
 try{return nativeReset.apply(this,args);}finally{resetting=false;store.removeItem(KEY);show();persist();}
};
function grantTestSugar(count=5){
 if(app.phase!=='ready'||!Number.isInteger(count)||count<1||count>5)return false;
 const game=app.bets.findIndex(b=>b>0),bet=Math.max(1,Number(app.bets[game])||100);
 for(let i=0;i<count;i++){
  const serial=Date.now()+'-'+(++tokenSequence);
  app.wonderBank.push({id:'local-sugar-'+serial,sugarId:'local:test:'+serial,sourceRoundId:'local:test',game:Math.max(0,game),sourceBet:bet,value:bet,kind:'local-debug-sugar',tier:0});
 }
 app.wonderSteps=app.wonderBank.length;app.wonderValue=app.wonderBank.reduce((sum,t)=>sum+(Number(t.value)||0),0);
 app.onChange(app);beginBet();show();persist();return true;
}
const banner=document.getElementById('local-debug-v258');
if(banner&&!banner.querySelector('[data-local-action="sugar-five"]')){
 const button=document.createElement('button');button.type='button';button.dataset.localAction='sugar-five';button.textContent='シュガー5個（試験）';
 button.title='ローカル版だけで5個を追加。BETタイム中にJP値と倍率が決まります';
 button.addEventListener('click',event=>{event.stopPropagation();grantTestSugar(5);});banner.append(button);
}
window.SweetsLocalSugarV267={version:268,grantTestSugar,beginBet,describe:()=>({active:!!challenge,phase:challenge?.phase||null,draws:challenge?.draws.slice()||[],bankCount:app.wonderBank?.length||0,roundId:challenge?.roundId||null,jpAmount:challenge?.jpAmount||0,multiplier:challenge?.multiplier||null,openedAt,cashWin:challenge?.cashWin||0,jpcQualified:!!challenge?.jpcQualified,qualifyingDrawCount:challenge?.qualifyingDrawCount||null,settled,awardCount,serverIsolated:true})};
V.stampBank();if(!beginBet()){show();persist();}
})();
