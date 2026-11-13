(()=>{
'use strict';
if(window.__sweetsRoundRecoveryV171)return;
window.__sweetsRoundRecoveryV171=true;

const VERSION='v171';
const ROUND_KEY='sweets-link-pending-round-v1';
const LEDGER_KEY='sweets-link-round-ledger-v1';
const MAX_LEDGER=120;

const readJSON=(key,fallback)=>{
  try{
    const raw=localStorage.getItem(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
};
const writeJSON=(key,value)=>{
  try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}
};
const removeKey=key=>{try{localStorage.removeItem(key);}catch{}};
const readRound=()=>readJSON(ROUND_KEY,null);
const saveRound=round=>writeJSON(ROUND_KEY,round);
const ledger=()=>{
  const value=readJSON(LEDGER_KEY,[]);
  return Array.isArray(value)?value.filter(v=>typeof v==='string').slice(-MAX_LEDGER):[];
};
const hasLedger=id=>!!id&&ledger().includes(id);
const addLedger=id=>{
  if(!id)return;
  const list=ledger();
  if(!list.includes(id))list.push(id);
  writeJSON(LEDGER_KEY,list.slice(-MAX_LEDGER));
};
const roundId=token=>`${Date.now().toString(36)}-${Number(token||0).toString(36)}-${Math.random().toString(36).slice(2,9)}`;
const makePlan=()=>{
  const pool=Array.from({length:25},(_,i)=>i+1),out=[];
  while(out.length<8){
    const i=Math.floor(Math.random()*pool.length);
    out.push(pool.splice(i,1)[0]);
  }
  return out;
};
const safeObject=value=>{
  try{return JSON.parse(JSON.stringify(value));}catch{return null;}
};
const engineSnapshot=e=>{
  const keys=[
    'kind','recordGame','totalHundredths','maxLink','maxChain','allClears',
    'roundSteps','roundHammers','roundCleared','wonderCollected','wonderToken',
    'depth','roundDepth','roundBlocks','roundChests','roundIndex','roundsCleared',
    'hexagons','triangles','lines','processed','accepted','allReachName'
  ];
  const out={};
  for(const key of keys){
    const value=e?.[key];
    if(value==null||['string','number','boolean'].includes(typeof value))out[key]=value;
    else{const copy=safeObject(value);if(copy!==null)out[key]=copy;}
  }
  return out;
};
const snapshot=(a,status)=>({
  version:1,
  runtime:VERSION,
  id:a.__recoveryRoundId||roundId(a.token),
  token:Number(a.token)||0,
  status,
  savedAt:Date.now(),
  creditBefore:Number(a.__recoveryCreditBefore??a.credit)||0,
  creditAfter:Number(a.credit)||0,
  bets:[...(a.bets||[])],
  locked:[...(a.locked||[])],
  enabled:[...(a.enabled||[])],
  paid:[...(a.paid||[])],
  draws:[...(a.draws||[])],
  plan:[...(a.__recoveryPlan||[])],
  roundWins:[...(a.roundWins||[])],
  totalWin:Number(a.totalWin)||0,
  engines:(a.engines||[]).map(engineSnapshot)
});
const refreshSnapshot=(a,status)=>{
  if(!a?.__recoveryRoundId)return false;
  const value=snapshot(a,status);
  value.id=a.__recoveryRoundId;
  return saveRound(value);
};
const restoreEngine=(engine,data)=>{
  if(!engine||!data)return;
  for(const [key,value] of Object.entries(data)){
    try{engine[key]=safeObject(value)??value;}catch{}
  }
};
const repaint=a=>{
  try{if(typeof renderRoundResult==='function')renderRoundResult(a);}catch{}
  try{if(typeof scheduleUI==='function')scheduleUI(a);}catch{}
  try{a.onChange?.(a);}catch{}
};

function install(){
  if(typeof Arcade!=='function'||typeof app==='undefined'||!app){setTimeout(install,80);return;}
  const proto=Arcade.prototype;
  if(proto.__roundRecoveryV171)return;
  Object.defineProperty(proto,'__roundRecoveryV171',{value:true});

  const original={
    start:proto.start,
    acceptNumber:proto.acceptNumber,
    finishRound:proto.finishRound,
    beginPayout:proto.beginPayout,
    advancePayout:proto.advancePayout,
    prepare:proto.prepare
  };

  proto.start=function(...args){
    const ok=original.start.apply(this,args);
    if(ok){
      this.__recoveryRoundId=roundId(this.token);
      this.__recoveryCreditBefore=Number(this.credit)||0;
      this.__recoveryPlan=makePlan();
      refreshSnapshot(this,'playing');
    }
    return ok;
  };

  proto.acceptNumber=function(...args){
    const ok=original.acceptNumber.apply(this,args);
    if(ok)refreshSnapshot(this,'playing');
    return ok;
  };

  proto.finishRound=function(...args){
    const result=original.finishRound.apply(this,args);
    if(this.phase==='result')refreshSnapshot(this,'result');
    return result;
  };

  proto.beginPayout=function(...args){
    if(this.phase!=='result')return original.beginPayout.apply(this,args);
    const pending=readRound();
    const id=this.__recoveryRoundId||pending?.id;
    if(id&&hasLedger(id)){
      const finalCredit=Number(pending?.creditAfter);
      if(Number.isFinite(finalCredit))this.credit=finalCredit;
      this.displayCredit=this.credit;
      this.payout=null;
      this.phase='complete';
      repaint(this);
      return true;
    }
    if(id){
      this.__recoveryRoundId=id;
      const committing=snapshot(this,'crediting');
      committing.id=id;
      committing.creditBefore=Number(this.credit)||0;
      committing.creditAfter=(Number(this.credit)||0)+(Number(this.totalWin)||0);
      saveRound(committing);
    }
    const result=original.beginPayout.apply(this,args);
    if(result&&id){
      addLedger(id);
      const paid=snapshot(this,'paid');
      paid.id=id;
      paid.creditAfter=Number(this.credit)||0;
      saveRound(paid);
    }
    return result;
  };

  proto.advancePayout=function(...args){
    const result=original.advancePayout.apply(this,args);
    if(this.phase==='complete'&&this.__recoveryRoundId)refreshSnapshot(this,'paid');
    return result;
  };

  proto.prepare=function(...args){
    const previous=this.phase;
    const id=this.__recoveryRoundId;
    if(previous==='result')this.beginPayout();
    const result=original.prepare.apply(this,args);
    if(id&&['complete','ready'].includes(previous)){
      const pending=readRound();
      if(pending?.id===id)removeKey(ROUND_KEY);
    }
    this.__recoveryRoundId=null;
    this.__recoveryPlan=null;
    this.__recoveryCreditBefore=null;
    return result;
  };

  async function settleCurrentRound(a){
    if(!a||a.phase!=='playing'||a.__recoverySettling)return false;
    a.__recoverySettling=true;
    try{
      try{typeof stopAutoRound==='function'&&stopAutoRound();}catch{}
      try{a.drawSource?.pause(true);}catch{}
      a.paused=false;
      a.fastForward=true;
      for(const e of a.engines||[]){e.paused=false;e.presentationRate=Math.max(30,Number(e.presentationRate)||1);}
      const saved=readRound();
      const preferred=[...(saved?.plan||a.__recoveryPlan||[])];
      const remaining=()=>Array.from({length:25},(_,i)=>i+1).filter(n=>!a.draws.includes(n));
      const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
      let guard=0;
      while(a.phase==='playing'&&a.draws.length<8&&guard++<1200){
        if(a.drawHeld){await sleep(12);continue;}
        const pool=remaining();
        if(!pool.length)break;
        let n=preferred.find(v=>pool.includes(v));
        if(!n)n=pool[0];
        const index=preferred.indexOf(n);if(index>=0)preferred.splice(index,1);
        if(!a.acceptNumber(n,a.token)){await sleep(12);continue;}
        await sleep(12);
      }
      guard=0;
      while(a.phase==='playing'&&guard++<2500){
        for(const e of a.engines||[])e.presentationRate=60;
        await sleep(12);
      }
      if(a.phase==='result'){
        refreshSnapshot(a,'result');
        a.beginPayout();
        if(a.phase==='paying'&&a.payout){a.advancePayout(a.payout.duration+1);}
        repaint(a);
        return true;
      }
      return false;
    }finally{a.__recoverySettling=false;}
  }

  try{
    if(typeof debugResetRound==='function'){
      const originalReset=debugResetRound;
      debugResetRound=function(...args){
        if(app?.phase==='playing'){
          settleCurrentRound(app).then(ok=>{if(!ok)originalReset.apply(this,args);});
          return;
        }
        return originalReset.apply(this,args);
      };
    }
  }catch(error){console.warn('[RoundRecovery] reset hook unavailable',error);}

  const pending=readRound();
  if(pending&&['result','crediting','paid'].includes(pending.status)&&app.phase==='ready'){
    app.__recoveryRoundId=pending.id;
    app.__recoveryCreditBefore=Number(pending.creditBefore)||0;
    app.__recoveryPlan=[...(pending.plan||[])];
    app.locked=[...(pending.locked||[])];
    app.bets=[...(pending.bets||app.bets||[])];
    app.enabled=[...(pending.enabled||[])];
    app.paid=[...(pending.paid||app.enabled.map(Boolean))];
    app.draws=[...(pending.draws||[])];
    app.roundWins=[...(pending.roundWins||[])];
    app.totalWin=Number(pending.totalWin)||0;
    (pending.engines||[]).forEach((data,i)=>restoreEngine(app.engines?.[i],data));
    const alreadyPaid=pending.status==='paid'||hasLedger(pending.id);
    if(alreadyPaid){
      app.credit=Number.isFinite(Number(pending.creditAfter))?Number(pending.creditAfter):app.credit;
      app.displayCredit=app.credit;
      app.payout=null;
      app.result={elapsed:1800,duration:1800};
      app.phase='complete';
    }else{
      app.credit=Number.isFinite(Number(pending.creditBefore))?Number(pending.creditBefore):app.credit;
      app.displayCredit=app.credit;
      app.payout=null;
      app.result={elapsed:0,duration:2200};
      app.phase='result';
    }
    app.paused=false;app.dealing=false;
    requestAnimationFrame(()=>repaint(app));
  }

  window.SweetsRoundRecovery={
    version:VERSION,
    get pending(){return readRound();},
    settle:()=>settleCurrentRound(app),
    clear:()=>removeKey(ROUND_KEY)
  };
  console.info('[RoundRecoveryV171] result journal, idempotent payout and reset settlement enabled');
}

install();
})();
