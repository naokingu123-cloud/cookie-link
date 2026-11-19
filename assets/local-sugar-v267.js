/* Local-only Sugar Challenge. Uses the existing local eight balls; no server requests or second roulette. */
(()=>{
'use strict';
if(window.SweetsEditionV255?.value!=='local')return;
const debug=window.SweetsLocalDebugV258,R=window.SugarChallengeRulesV254,V=window.SweetsSugarChallengeV254;
if(!debug||!R||!V||!app||typeof app.start!=='function')return;
const store=debug.storage,KEY='local-sugar-challenge-v267',SCHEMA=267,copy=x=>JSON.parse(JSON.stringify(x));
let revision=0,challenge=null,consumed=[],settled=false,closed=false,awardCount=0;
const getSaved=()=>{try{const d=JSON.parse(store.getItem(KEY)||'null');return d?.schema===SCHEMA?d:null;}catch{return null;}};
const saved=getSaved();
if(saved){
 const recover=Array.isArray(saved.consumed)&&saved.challenge?.phase!=='complete'?saved.consumed:[];
 const bank=[...(Array.isArray(saved.bank)?saved.bank:[]),...recover];
 const unique=new Map();
 for(const t of bank)if(t&&typeof t==='object')unique.set(String(t.sugarId||t.id||unique.size),t);
 app.wonderBank=[...unique.values()];app.wonderSteps=app.wonderBank.length;app.wonderValue=app.wonderBank.reduce((n,t)=>n+Math.max(0,Number(t.value)||0),0);
}
function persist(){
 try{store.setItem(KEY,JSON.stringify({schema:SCHEMA,bank:copy(app.wonderBank||[]),consumed:copy(consumed),challenge:challenge?copy(challenge):null,settled,awardCount}));}catch(e){console.warn('[LocalSugar] save',e);}
}
function show(){
 const bank=copy(app.wonderBank||[]);
 const acceptedIds=consumed.map(t=>t.sugarId).filter(Boolean);
 V.accept({version:254,revision:++revision,challenge:challenge?copy(challenge):null,bank,acceptedIds,startedAt:openedAt,queued:bank.length>=5});
}
let openedAt=0;
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
function consume(){
 V.stampBank();
 const bank=app.wonderBank||[];
 if(bank.length<5)return false;
 consumed=bank.splice(0,5);
 const roundId='local:'+String(app.token),id=roundId+':sugar';
 const payoutRate=typeof debugPayoutTarget!=='undefined'&&Number.isFinite(debugPayoutTarget)?debugPayoutTarget:100;
 const values=consumed.map(t=>{
  if(Number.isSafeInteger(t.challengeValue)&&t.challengeValue>0)return t.challengeValue;
  const gameIndex=Number(t.game),bet=Number(t.sourceBet)||Number(app.locked?.[gameIndex])||Number(t.value)||100;
  return R.quoteSugar({bet:Math.max(1,Math.floor(bet)),payoutRate,rng:app.random}).challengeValue;
 });
 challenge=R.create({id,roundId,station:1,sugarValues:values,rng:app.random});
 openedAt=Date.now();settled=false;closed=false;
 app.wonderSteps=bank.length;app.wonderValue=bank.reduce((sum,t)=>sum+Number(t.value||0),0);
 show();persist();
 V.setExpanded(true);
 return true;
}
const nativeStart=app.start;
app.start=function(...args){
 const result=nativeStart.apply(this,args);
 if(result===true){if(!consume()){challenge=null;consumed=[];settled=false;closed=false;show();persist();}}
 return result;
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
  settled=true;
  const award=Number(challenge.cashWin)||0;
  if(award>0&&Number.isSafeInteger(award)&&Number.isSafeInteger(this.totalWin+award)){
   this.totalWin+=award;awardCount++;this.onChange(this);
  }
  show();persist();
 }
 return result;
};
const nativePrepare=app.prepare;
app.prepare=function(...args){
 const result=nativePrepare.apply(this,args);
 if(challenge){challenge=null;consumed=[];settled=false;closed=true;show();}
 persist();return result;
};
const nativeChange=app.onChange;
app.onChange=function(...args){const result=nativeChange.apply(this,args);persist();return result;};
const nativeReset=app.resetDebug;
app.resetDebug=function(...args){const result=nativeReset.apply(this,args);challenge=null;consumed=[];settled=false;store.removeItem(KEY);show();persist();return result;};
function grantTestSugar(count=5){
 if(app.phase!=='ready'||!Number.isInteger(count)||count<1||count>5)return false;
 const game=app.bets.findIndex(b=>b>0),bet=Math.max(1,Number(app.bets[game])||100);
 for(let i=0;i<count;i++){
  const serial=Date.now()+'-'+(++awardCount)+'-'+i;
  app.wonderBank.push({id:'local-sugar-'+serial,sugarId:'local:test:'+serial,sourceRoundId:'local:test',game:Math.max(0,game),sourceBet:bet,value:bet,kind:'local-debug-sugar',tier:0});
 }
 app.wonderSteps=app.wonderBank.length;app.wonderValue=app.wonderBank.reduce((sum,t)=>sum+(Number(t.value)||0),0);
 app.onChange(app);V.stampBank();persist();return true;
}
const banner=document.getElementById('local-debug-v258');
if(banner&&!banner.querySelector('[data-local-action="sugar-five"]')){
 const button=document.createElement('button');button.type='button';button.dataset.localAction='sugar-five';button.textContent='シュガー5個（試験）';
 button.title='ローカル版だけで5個のシュガーを追加。次のゲームでシュガーチャレンジが始まります';
 button.addEventListener('click',event=>{event.stopPropagation();grantTestSugar(5);});
 banner.append(button);
}
window.SweetsLocalSugarV267={version:267,grantTestSugar,describe:()=>({active:!!challenge,phase:challenge?.phase||null,draws:challenge?.draws.slice()||[],bankCount:app.wonderBank?.length||0,roundId:challenge?.roundId||null,cashWin:challenge?.cashWin||0,jpcQualified:!!challenge?.jpcQualified,settled,awardCount,serverIsolated:true})};
V.stampBank();show();persist();
})();