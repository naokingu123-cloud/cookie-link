/* SWEETS LINK v158 — use the existing roulette information strip and add
   original, scene-aware arcade cues. Presentation only: no odds, payout or
   roulette result is changed. */
(()=>{
'use strict';

const VERSION='v159';
if(window.SweetsEventTicker?.version===VERSION){
  window.SweetsEventTicker.install?.();
  return;
}

const state={
  screen:null,
  strip:null,
  message:null,
  badge:null,
  animation:null,
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
  mutationNodes:new Set(),
  audioReady:false
};

const formatWin=value=>{
  const n=Math.max(0,Math.round(Number(value)||0));
  return n.toLocaleString('ja-JP');
};

function heatTier(ratio){
  if(ratio>=500)return {level:'god',label:'神熱',priority:100,cue:'special'};
  if(ratio>=200)return {level:'extreme',label:'極熱',priority:80,cue:'special'};
  if(ratio>=50)return {level:'super',label:'超熱',priority:60,cue:'high-reach'};
  if(ratio>=10)return {level:'hot',label:'激熱',priority:40,cue:'high-reach'};
  return null;
}

function visible(el){
  if(!el||!el.isConnected||el.hidden)return false;
  const style=getComputedStyle(el);
  return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0;
}

function ensureStrip(){
  document.querySelectorAll('.sweets-event-ticker').forEach(el=>el.remove());
  const strip=document.querySelector('#cookie-roulette .roulette-info-strip')||document.querySelector('.roulette-info-strip');
  if(!strip)return false;
  strip.classList.add('sweets-event-strip');
  strip.setAttribute('aria-live','polite');
  strip.setAttribute('aria-atomic','true');
  strip.setAttribute('aria-label','リーチ・高配当情報');

  // The old ROUND-clear/achievement marquee is temporarily retired.
  // Keep its producer intact for records, but never let its viewport share this black strip.
  strip.querySelectorAll(':scope > .achievement-viewport,:scope > .sweets-event-strip-message').forEach(el=>el.remove());

  const viewport=document.createElement('div');
  viewport.className='achievement-viewport sweets-event-scroll-viewport';
  viewport.hidden=true;
  const text=document.createElement('div');
  text.className='achievement-text sweets-event-scroll-text';
  viewport.append(text);
  strip.append(viewport);

  state.strip=strip;
  state.message=viewport;
  state.badge=null;
  state.text=text;
  return true;
}
function markNumberModeButton(screen){
  const buttons=[...screen.querySelectorAll('button,[role="button"]')];
  const target=buttons.find(el=>/番号指定モード/.test(el.textContent||''));
  if(target)target.classList.add('arcade-number-mode-button');
}

function inferCue(item={}){
  if(item.cue)return item.cue;
  const value=[item.level,item.badge,item.text,item.source].filter(Boolean).join(' ');
  if(/JACKPOT|ジャックポット|全消し|ALL\s*CLEAR|FULL\s*CLEAR|最高役|全満|RAINBOW|虹色/i.test(value))return 'special';
  if(/シュガー|SUGAR/i.test(value))return 'sugar';
  if(/POW|LEVEL|LV\.?\s*UP|オッズアップ|ランクアップ|昇格/i.test(value))return 'level';
  if(/超高額|高額リーチ|神熱|極熱|超熱/i.test(value))return 'high-reach';
  if(/BONUS|ボーナス|高配当|新記録/i.test(value))return 'high-win';
  if(/リーチ|REACH/i.test(value))return 'reach';
  if(/連鎖|CHAIN|LINK/i.test(value))return 'chain';
  if(/MISS|ミス/i.test(value))return 'miss';
  return 'notice';
}

function queueMessage(message,{cooldown=15000}={}){
  if(!message?.text||!message?.key)return;
  const now=Date.now();
  const last=state.seen.get(message.key)||0;
  if(cooldown>0&&now-last<cooldown)return;
  state.seen.set(message.key,now);
  state.queue=state.queue.filter(item=>item.key!==message.key);
  state.queue.push({...message,cue:inferCue(message)});
  state.queue.sort((a,b)=>(b.priority||0)-(a.priority||0));
  if(state.queue.length>24)state.queue.length=24;
  pump();
}

function hideMessage(){
  if(!state.message)return;
  try{state.animation?.cancel();}catch{}
  state.animation=null;
  state.message.hidden=true;
  state.text.textContent='';
  state.strip?.removeAttribute('data-event-level');
}
function showMessage(item){
  if(!state.message&&!ensureStrip())return 3900;
  try{state.animation?.cancel();}catch{}
  state.animation=null;

  const label=item.badge&&item.badge!=='INFO'?String(item.badge).trim():'';
  state.text.textContent=(label?label+'　':'')+item.text;
  state.text.title=item.source||item.text;
  state.message.hidden=false;
  state.strip.removeAttribute('data-event-level');

  // Match the cabinet's original white scrolling ticker: one line, right to left.
  void state.message.offsetWidth;
  const viewportWidth=Math.max(1,state.message.clientWidth||state.strip.clientWidth||440);
  const textWidth=Math.max(1,state.text.scrollWidth||state.text.getBoundingClientRect().width||160);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let duration=Math.max(4300,Math.min(9000,Math.round((viewportWidth+textWidth+28)/72*1000)));

  if(reduced){
    state.text.style.transform='translateX(0)';
    duration=Math.max(3000,Number(item.duration)||3600);
  }else if(typeof state.text.animate==='function'){
    const from=viewportWidth+8,to=-(textWidth+10);
    state.animation=state.text.animate(
      [{transform:`translateX(${from}px)`},{transform:`translateX(${to}px)`}],
      {duration,easing:'linear',fill:'forwards'}
    );
  }else{
    state.text.style.setProperty('--ticker-from',(viewportWidth+8)+'px');
    state.text.style.setProperty('--ticker-to',-(textWidth+10)+'px');
    state.text.style.setProperty('--ticker-duration',duration+'ms');
    state.text.classList.remove('is-scrolling');
    void state.text.offsetWidth;
    state.text.classList.add('is-scrolling');
  }

  window.SweetsEventSound?.play(item.cue||inferCue(item));
  return duration;
}
function pump(){
  if(state.active||!state.queue.length||document.hidden)return;
  if(!state.message&&!ensureStrip())return;
  state.active=true;
  const item=state.queue.shift();
  const duration=showMessage(item);
  clearTimeout(state.timer);
  state.timer=setTimeout(()=>{
    state.active=false;
    if(state.queue.length)pump();
    else hideMessage();
  },Math.max(1500,Number(duration)||3900)+100);
}
function gameNameFor(item){
  const key=window.SweetsLineup?.ids?.[item?.game];
  return window.SweetsLineup?.catalog?.[key]?.name||key||'';
}

function boardValues(){
  const boards=window.sweets12Live?.boards;
  if(boards&&typeof boards!=='number'&&typeof boards.values==='function')return [...boards.values()];
  if(Array.isArray(boards))return boards;
  return [];
}

function collectReachCandidates(){
  const candidates=[];
  for(const item of boardValues()){
    const bet=Number(item?.live?.bet??item?.bet??0);
    if(!(bet>0)||!Array.isArray(item?.reach))continue;
    const source=gameNameFor(item);
    for(const row of item.reach){
      const number=Number(row?.number??row?.value);
      const gain=Number(row?.gain ?? ((Number(row?.total)||0)+(Number(row?.bonus)||0)));
      if(!(number>0)||!(gain>0))continue;
      candidates.push({game:item.game,board:item.board??item.mini??0,number,gain,ratio:gain/bet,full:Boolean(row?.full||row?.allClear),source});
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
    if(!previous||candidate.ratio>previous.ratio||candidate.gain>previous.gain)best.set(key,{...candidate,...tier});
  }
  return [...best.values()].sort((a,b)=>b.priority-a.priority||b.ratio-a.ratio||b.gain-a.gain);
}

function scanVisibleReachLabels(){
  if(!state.screen)return;
  const nodes=state.screen.querySelectorAll('.reach-strip,.mini-four-reach,.reach-banner,[data-reach-kind]');
  for(const node of nodes){
    if(!visible(node))continue;
    const text=String(node.textContent||'').replace(/\s+/g,' ').trim();
    if(/超高額リーチ|高額リーチ|全消しリーチ|リーチ/.test(text))announceRareText(text,node.className||'reach');
  }
}

function scanReach(){
  if(document.hidden)return;
  const candidates=collectReachCandidates();
  const current=new Set(candidates.map(c=>`${c.game}:${c.board}:${c.number}:${Math.round(c.gain)}`));
  const added=candidates.filter(c=>!state.previousReach.has(`${c.game}:${c.board}:${c.number}:${Math.round(c.gain)}`));
  const heats=bestHeatCandidates(added);
  for(const item of heats.slice(0,8)){
    queueMessage({key:`heat:${item.game}:${item.number}:${Math.round(item.gain)}`,level:item.level,badge:item.label,text:`${item.number}番に入れば ${formatWin(item.gain)}WIN!`,source:item.source,priority:item.priority,duration:item.level==='god'?5000:4200,cue:item.cue},{cooldown:18000});
  }
  const highReach=heats.find(item=>item.ratio>=50);
  if(highReach){
    queueMessage({key:`high-reach:${highReach.game}:${highReach.number}:${Math.round(highReach.gain)}`,level:highReach.ratio>=200?'extreme':'rare',badge:'高額リーチ!',text:`${highReach.number}番が高配当チャンス!`,source:highReach.source,priority:55,duration:3500,cue:highReach.ratio>=200?'special':'high-reach'},{cooldown:22000});
  }else{
    const ordinary=added.filter(item=>item.ratio<10).sort((a,b)=>b.gain-a.gain)[0];
    if(ordinary)queueMessage({key:`reach:${ordinary.game}:${ordinary.number}:${Math.round(ordinary.gain)}`,level:'reach',badge:'リーチ!',text:`${ordinary.number}番に入れば ${formatWin(ordinary.gain)}WIN!`,source:ordinary.source,priority:20,duration:3100,cue:'reach'},{cooldown:16000});
  }
  const full=added.find(item=>item.full);
  if(full)queueMessage({key:`full-reach:${full.game}:${full.number}:${Math.round(full.gain)}`,level:'clear',badge:'全消しリーチ!',text:`${full.number}番で全消しチャンス!`,source:full.source,priority:75,duration:4200,cue:'special'},{cooldown:24000});
  state.previousReach=current;
  scanVisibleReachLabels();
}

function announceRareText(rawText,source=''){
  const text=String(rawText||'').replace(/\s+/g,' ').trim();
  if(!text||text.length>220)return;
  const rules=[
    {re:/JACKPOT|ジャックポット|大爆発/i,key:'jackpot',level:'god',badge:'SPECIAL!',message:'特別な演出が発生!',priority:110,cooldown:30000,cue:'special'},
    {re:/最高役|MAX役|最高配当役/i,key:'highest-role',level:'god',badge:'最高役獲得!',message:'最高役を獲得!',priority:100,cooldown:30000,cue:'special'},
    {re:/全消し達成|ALL\s*CLEAR|FULL\s*CLEAR|全満達成/i,key:'full-clear',level:'clear',badge:'全消し達成!',message:'全消しボーナス獲得!',priority:95,cooldown:30000,cue:'special'},
    {re:/虹色シュガー|WONDER\s*SUGAR\s*GET|シュガー獲得/i,key:'sugar',level:'clear',badge:'SUGAR GET!',message:'ワンダーシュガー獲得!',priority:88,cooldown:18000,cue:'sugar'},
    {re:/新記録|NEW\s*RECORD/i,key:'new-record',level:'rare',badge:'新記録!',message:'新記録を達成!',priority:85,cooldown:26000,cue:'high-win'},
    {re:/超高額リーチ/i,key:'ultra-reach',level:'extreme',badge:'超高額リーチ!',message:'超高額配当のチャンス!',priority:78,cooldown:20000,cue:'special'},
    {re:/高額リーチ/i,key:'high-reach-text',level:'super',badge:'高額リーチ!',message:'高額配当のチャンス!',priority:68,cooldown:18000,cue:'high-reach'},
    {re:/POW\s*\+|オッズアップ|LEVEL\s*UP|LV\.?\s*UP|ランクアップ|昇格/i,key:'level-up',level:'hot',badge:'LEVEL UP!',message:'配当チャンスがアップ!',priority:58,cooldown:9000,cue:'level'},
    {re:/BIG\s*BONUS|高配当獲得|ボーナス獲得|BONUS\s*GET/i,key:'high-win',level:'rare',badge:'HIGH WIN!',message:'高配当を獲得!',priority:72,cooldown:15000,cue:'high-win'},
    {re:/全消しリーチ/i,key:'full-reach-text',level:'clear',badge:'全消しリーチ!',message:'全消しのチャンス!',priority:76,cooldown:20000,cue:'special'},
    {re:/リーチ/i,key:'ordinary-reach-text',level:'reach',badge:'リーチ!',message:'配当獲得のチャンス!',priority:24,cooldown:12000,cue:'reach'}
  ];
  for(const rule of rules){
    if(!rule.re.test(text))continue;
    queueMessage({key:`rare:${rule.key}:${text.slice(0,48)}`,level:rule.level,badge:rule.badge,text:rule.message,source:source||text,priority:rule.priority,duration:rule.level==='god'?4800:rule.level==='clear'?4200:3500,cue:rule.cue},{cooldown:rule.cooldown});
    break;
  }
}

function flushMutations(){
  state.mutationTimer=0;
  for(const node of state.mutationNodes){
    const element=node?.nodeType===1?node:node?.parentElement;
    if(!element||element.closest?.('.sweets-event-strip,.sweets-event-ticker')||!visible(element))continue;
    const eventRoot=element.closest?.('.record,[data-frame-tier],.round-result,.tab-win-bubble,.result-banner,.highest-role,.all-clear,.reach-strip,.mini-four-reach')||element;
    announceRareText(eventRoot.textContent,eventRoot.className||'');
  }
  state.mutationNodes.clear();
}

function observeRareEvents(screen){
  state.observer?.disconnect();
  state.observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      if(mutation.target?.closest?.('.sweets-event-strip,.sweets-event-ticker'))continue;
      state.mutationNodes.add(mutation.target);
      for(const node of mutation.addedNodes||[])state.mutationNodes.add(node);
    }
    if(!state.mutationTimer)state.mutationTimer=setTimeout(flushMutations,140);
  });
  state.observer.observe(screen,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','data-frame-tier','data-result','data-role']});
}

function install(){
  document.documentElement.classList.add('arcade-candy-world','arcade-candy-world-v157','arcade-candy-world-v158');
  document.documentElement.dataset.arcadeWorld='candy-v158';
  const screen=document.getElementById('screen');
  if(!screen)return false;
  state.screen=screen;
  if(!ensureStrip())return false;
  markNumberModeButton(screen);
  observeRareEvents(screen);
  clearInterval(state.scanTimer);
  scanReach();
  state.scanTimer=setInterval(scanReach,900);
  return true;
}

function start(){
  if(install())return;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(install),{once:true});
  else requestAnimationFrame(()=>requestAnimationFrame(install));
}

document.addEventListener('visibilitychange',()=>{if(!document.hidden){scanReach();pump();}});
window.addEventListener('sweets:event',event=>{
  const detail=event.detail||{};
  const text=[detail.event,detail.value,detail.label,detail.message].filter(Boolean).join(' ');
  if(text)announceRareText(text,detail.game||detail.source||'');
});

window.SweetsEventTicker={
  version:VERSION,
  install,
  enqueue:(text,options={})=>{
    const cooldown=options.cooldown==null?12000:Math.max(0,Number(options.cooldown)||0);
    queueMessage({key:options.key||`external:${text}`,level:options.level||'info',badge:options.badge||'INFO',text:String(text||''),priority:Number(options.priority)||30,duration:Number(options.duration)||3900,source:options.source||'',cue:options.cue||''},{cooldown});
  },
  refresh:scanReach,
  playCue:name=>window.SweetsEventSound?.play(name)
};

start();
console.info('[SweetsWorldV159] original white scrolling roulette ticker and scene-aware cues enabled');
})();
