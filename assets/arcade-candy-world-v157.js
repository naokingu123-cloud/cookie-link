/* SWEETS LINK v157 — ornate all-game frame and event ticker.
   Presentation only: game engines, payout rules and roulette results remain unchanged. */
(()=>{
'use strict';

const VERSION='v157';
if(window.SweetsEventTicker?.version===VERSION){
  window.SweetsEventTicker.install?.();
  return;
}

const state={
  screen:null,
  host:null,
  ticker:null,
  message:null,
  badge:null,
  text:null,
  queue:[],
  seen:new Map(),
  previousReach:new Set(),
  active:false,
  timer:0,
  transitionTimer:0,
  scanTimer:0,
  observer:null,
  mutationTimer:0,
  mutationNodes:new Set()
};

const formatWin=value=>{
  const n=Math.max(0,Math.round(Number(value)||0));
  return n.toLocaleString('ja-JP');
};

function heatTier(ratio){
  if(ratio>=500)return {level:'god',label:'神熱',priority:100};
  if(ratio>=200)return {level:'extreme',label:'極熱',priority:80};
  if(ratio>=50)return {level:'super',label:'超熱',priority:60};
  if(ratio>=10)return {level:'hot',label:'激熱',priority:40};
  return null;
}

function visible(el){
  if(!el||!el.isConnected||el.hidden)return false;
  const style=getComputedStyle(el);
  return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0;
}

function ensureTicker(host){
  let ticker=host.querySelector(':scope > .sweets-event-ticker');
  if(!ticker){
    ticker=document.createElement('section');
    ticker.className='sweets-event-ticker';
    ticker.setAttribute('role','status');
    ticker.setAttribute('aria-live','polite');
    ticker.setAttribute('aria-atomic','true');
    ticker.innerHTML='\
      <span class="sweets-event-ticker__spark sweets-event-ticker__spark--left" aria-hidden="true"></span>\
      <div class="sweets-event-ticker__viewport">\
        <div class="sweets-event-ticker__message is-visible" data-level="info">\
          <strong class="sweets-event-ticker__badge">INFO</strong>\
          <span class="sweets-event-ticker__text">リーチ・高配当情報を表示します</span>\
        </div>\
      </div>\
      <span class="sweets-event-ticker__spark sweets-event-ticker__spark--right" aria-hidden="true"></span>';
    host.append(ticker);
  }
  state.ticker=ticker;
  state.message=ticker.querySelector('.sweets-event-ticker__message');
  state.badge=ticker.querySelector('.sweets-event-ticker__badge');
  state.text=ticker.querySelector('.sweets-event-ticker__text');
}

function markNumberModeButton(screen){
  const buttons=[...screen.querySelectorAll('button,[role="button"]')];
  const target=buttons.find(el=>/番号指定モード/.test(el.textContent||''));
  if(target)target.classList.add('arcade-number-mode-button');
}

function queueMessage(message,{cooldown=15000}={}){
  if(!message?.text||!message?.key)return;
  const now=Date.now();
  const last=state.seen.get(message.key)||0;
  if(now-last<cooldown)return;
  state.seen.set(message.key,now);
  state.queue=state.queue.filter(item=>item.key!==message.key);
  state.queue.push(message);
  state.queue.sort((a,b)=>(b.priority||0)-(a.priority||0));
  if(state.queue.length>24)state.queue.length=24;
  pump();
}

function showMessage(item){
  if(!state.message)return;
  clearTimeout(state.transitionTimer);
  state.message.classList.remove('is-visible');
  state.message.classList.add('is-leaving');
  state.transitionTimer=setTimeout(()=>{
    state.message.dataset.level=item.level||'info';
    state.badge.textContent=item.badge||'INFO';
    state.text.textContent=item.text;
    state.message.title=item.source||item.text;
    state.message.classList.remove('is-leaving');
    void state.message.offsetWidth;
    state.message.classList.add('is-visible');
  },170);
}

function pump(){
  if(state.active||!state.queue.length||document.hidden)return;
  state.active=true;
  const item=state.queue.shift();
  showMessage(item);
  clearTimeout(state.timer);
  state.timer=setTimeout(()=>{
    state.active=false;
    if(state.queue.length)pump();
  },item.duration||3900);
}

function gameNameFor(item){
  const key=window.SweetsLineup?.ids?.[item?.game];
  return window.SweetsLineup?.catalog?.[key]?.name||key||'';
}

function collectReachCandidates(){
  const boards=window.sweets12Live?.boards;
  if(!boards||typeof boards.values!=='function')return [];
  const candidates=[];
  for(const item of boards.values()){
    const bet=Number(item?.live?.bet||0);
    if(!(bet>0)||!Array.isArray(item?.reach))continue;
    const source=gameNameFor(item);
    for(const row of item.reach){
      const number=Number(row?.number);
      const gain=Number(row?.gain ?? ((Number(row?.total)||0)+(Number(row?.bonus)||0)));
      if(!(number>0)||!(gain>0))continue;
      candidates.push({
        game:item.game,
        board:item.board,
        number,
        gain,
        ratio:gain/bet,
        full:Boolean(row?.full),
        source
      });
    }
  }
  return candidates;
}

function bestHeatCandidates(candidates){
  const best=new Map();
  for(const candidate of candidates){
    const tier=heatTier(candidate.ratio);
    if(!tier)continue;
    const key=`${candidate.game}:${candidate.number}`;
    const previous=best.get(key);
    if(!previous||candidate.ratio>previous.ratio||candidate.gain>previous.gain){
      best.set(key,{...candidate,...tier});
    }
  }
  return [...best.values()].sort((a,b)=>b.priority-a.priority||b.ratio-a.ratio||b.gain-a.gain);
}

function scanReach(){
  if(document.hidden)return;
  const candidates=collectReachCandidates();
  const current=new Set(candidates.map(c=>`${c.game}:${c.board}:${c.number}:${Math.round(c.gain)}`));
  const added=candidates.filter(c=>!state.previousReach.has(`${c.game}:${c.board}:${c.number}:${Math.round(c.gain)}`));

  const heats=bestHeatCandidates(added);
  for(const item of heats.slice(0,8)){
    queueMessage({
      key:`heat:${item.game}:${item.number}:${Math.round(item.gain)}`,
      level:item.level,
      badge:item.label,
      text:`${item.number}番に入れば ${formatWin(item.gain)}WIN!`,
      source:item.source,
      priority:item.priority,
      duration:item.level==='god'?5000:4200
    },{cooldown:18000});
  }

  const highReach=heats.find(item=>item.ratio>=50);
  if(highReach){
    queueMessage({
      key:`high-reach:${highReach.game}:${highReach.number}:${Math.round(highReach.gain)}`,
      level:highReach.ratio>=200?'extreme':'rare',
      badge:'高額リーチ!',
      text:`${highReach.number}番が高配当チャンス!`,
      source:highReach.source,
      priority:35,
      duration:3400
    },{cooldown:22000});
  }else{
    const ordinary=added
      .filter(item=>item.ratio<10)
      .sort((a,b)=>b.gain-a.gain)[0];
    if(ordinary){
      queueMessage({
        key:`reach:${ordinary.game}:${ordinary.number}:${Math.round(ordinary.gain)}`,
        level:'reach',
        badge:'リーチ!',
        text:`${ordinary.number}番に入れば ${formatWin(ordinary.gain)}WIN!`,
        source:ordinary.source,
        priority:20,
        duration:3200
      },{cooldown:18000});
    }
  }

  const full=added.find(item=>item.full);
  if(full){
    queueMessage({
      key:`full-reach:${full.game}:${full.number}:${Math.round(full.gain)}`,
      level:'clear',
      badge:'全消しリーチ!',
      text:`${full.number}番で全消しチャンス!`,
      source:full.source,
      priority:75,
      duration:4200
    },{cooldown:24000});
  }

  state.previousReach=current;
}

function announceRareText(rawText,source=''){
  const text=String(rawText||'').replace(/\s+/g,' ').trim();
  if(!text||text.length>180)return;
  const rules=[
    {re:/最高役|MAX役|最高配当役/i,key:'highest-role',level:'rare',badge:'最高役獲得!',message:'最高役を獲得!',priority:95,cooldown:30000},
    {re:/全消し達成|ALL\s*CLEAR|FULL\s*CLEAR/i,key:'full-clear',level:'clear',badge:'全消し達成!',message:'全消しボーナス獲得!',priority:90,cooldown:30000},
    {re:/新記録|NEW\s*RECORD/i,key:'new-record',level:'rare',badge:'新記録!',message:'新記録を達成!',priority:85,cooldown:30000},
    {re:/超高額リーチ/i,key:'ultra-reach',level:'extreme',badge:'超高額リーチ!',message:'超高額配当のチャンス!',priority:72,cooldown:22000},
    {re:/高額リーチ/i,key:'high-reach-text',level:'super',badge:'高額リーチ!',message:'高額配当のチャンス!',priority:60,cooldown:22000},
    {re:/JACKPOT|ジャックポット|大爆発/i,key:'rare-event',level:'god',badge:'レア演出!',message:'特別な演出が発生!',priority:88,cooldown:30000}
  ];
  for(const rule of rules){
    if(!rule.re.test(text))continue;
    queueMessage({
      key:`rare:${rule.key}:${text.slice(0,42)}`,
      level:rule.level,
      badge:rule.badge,
      text:rule.message,
      source:source||text,
      priority:rule.priority,
      duration:4300
    },{cooldown:rule.cooldown});
    break;
  }
}

function flushMutations(){
  state.mutationTimer=0;
  for(const node of state.mutationNodes){
    const element=node?.nodeType===1?node:node?.parentElement;
    if(!element||element.closest?.('.sweets-event-ticker')||!visible(element))continue;
    const eventRoot=element.closest?.('.record,[data-frame-tier],.round-result,.tab-win-bubble,.result-banner,.highest-role,.all-clear')||element;
    announceRareText(eventRoot.textContent,eventRoot.className||'');
  }
  state.mutationNodes.clear();
}

function observeRareEvents(screen){
  state.observer?.disconnect();
  state.observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.target?.closest?.('.sweets-event-ticker'))continue;
      state.mutationNodes.add(mutation.target);
      for(const node of mutation.addedNodes||[])state.mutationNodes.add(node);
    }
    if(!state.mutationTimer)state.mutationTimer=setTimeout(flushMutations,140);
  });
  state.observer.observe(screen,{
    subtree:true,
    childList:true,
    characterData:true,
    attributes:true,
    attributeFilter:['class','hidden','data-frame-tier','data-result','data-role']
  });
}

function install(){
  document.documentElement.classList.add('arcade-candy-world','arcade-candy-world-v157');
  document.documentElement.dataset.arcadeWorld='candy-v157';
  const screen=document.getElementById('screen');
  if(!screen)return false;
  state.screen=screen;

  const host=screen.querySelector('.festival-top')||screen.querySelector('.arena');
  if(!host)return false;
  state.host=host;
  host.classList.add('arcade-event-host');
  ensureTicker(host);
  markNumberModeButton(screen);
  observeRareEvents(screen);

  clearInterval(state.scanTimer);
  scanReach();
  state.scanTimer=setInterval(scanReach,900);
  return true;
}

function start(){
  if(install())return;
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(install),{once:true});
  }else{
    requestAnimationFrame(()=>requestAnimationFrame(install));
  }
}

document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){scanReach();pump();}
});

window.SweetsEventTicker={
  version:VERSION,
  install,
  enqueue:(text,options={})=>queueMessage({
    key:options.key||`external:${text}`,
    level:options.level||'info',
    badge:options.badge||'INFO',
    text:String(text||''),
    priority:Number(options.priority)||30,
    duration:Number(options.duration)||3900,
    source:options.source||''
  },{cooldown:Number(options.cooldown)||12000}),
  refresh:scanReach
};

start();
console.info('[SweetsWorldV157] ornate nine-game frame and event ticker enabled');
})();
