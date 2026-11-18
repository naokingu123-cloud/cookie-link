/* Visual-only result scroll. Native engines retain all credit, timing and input ownership. */
(()=>{
'use strict';
if(window.SweetsResultsV253)return;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;
const layer=document.getElementById('round-result-layer'),card=layer?.querySelector('.round-result'),list=document.getElementById('result-games'),screen=document.getElementById('screen');
if(!layer||!card||!list||!screen||typeof renderRoundResult!=='function')return;
const media=window.matchMedia('(prefers-reduced-motion: reduce)'),clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>1-(1-clamp(n))**3;
const ART=['assets/results-art-v253/result-frame.webp','assets/results-art-v253/sweets-wipe.webp'];
const art=ART.map(url=>({url,loaded:false,failed:false}));
const assetsReady=Promise.all(art.map(item=>new Promise(resolve=>{const image=new Image();item.image=image;image.decoding='async';image.onload=()=>{item.loaded=true;resolve(true);};image.onerror=()=>{item.failed=true;resolve(false);};image.src=item.url+'?v=253';}))).then(ok=>ok.every(Boolean));
layer.classList.add('sr253-results');card.classList.add('sr253-scroll');
const wipeNode=document.createElement('div');wipeNode.className='sr253-wipe';wipeNode.hidden=true;wipeNode.inert=true;wipeNode.setAttribute('aria-hidden','true');wipeNode.innerHTML='<div class="sr253-wipe-art"></div><div class="sr253-wipe-title"><b>SWEETS LINK</b><span>SWEETS KINGDOM</span></div>';screen.append(wipeNode);
const state={active:false,token:null,startCount:0,elapsed:0,phase:'closed',model:null,rows:[],total:0,columns:1,paused:false,lastStamp:null,frame:0,lastLayout:'',lastDom:null};
const wipe={active:false,phase:'hidden',elapsed:0,startCount:0,token:null,lastStamp:null};
const seen=new Map();
function numeric(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0;}
function flags(model=state.model){return {hidden:document.hidden,menu:typeof menuOpen!=='undefined'&&!!menuOpen,user:typeof userPaused!=='undefined'&&!!userPaused,offscreen:typeof inView!=='undefined'&&!inView,app:!!model?.paused,jpc:typeof jpcSession!=='undefined'&&!!jpcSession.active};}
function blocked(model){return Object.values(flags(model)).some(Boolean);}
function currentModel(){return typeof app!=='undefined'?app:state.model;}
function visible(model){return !!model?.result&&['result','paying','complete'].includes(model.phase)&&!layer.hidden;}
function stopWipe(){wipe.active=false;wipe.phase='hidden';wipe.elapsed=0;wipe.lastStamp=null;wipeNode.hidden=true;wipeNode.style.opacity='0';}
function startWipe(){
 const model=currentModel();
 if(media.matches||blocked(model)||model?.phase!=='ready'||model?.result||state.elapsed<120)return;
 if(wipe.active)return;
 wipe.active=true;wipe.phase='entering';wipe.elapsed=0;wipe.lastStamp=null;wipe.token=String(model.token);wipe.startCount++;wipeNode.hidden=false;paintWipe();wake();
}
function close(){
 const was=state.active;state.active=false;state.phase='closed';state.lastStamp=null;layer.dataset.sr253Phase='closed';
 if(was){seen.set(state.token,state.elapsed);startWipe();}
}
function decorate(model){
 const nodes=[...list.querySelectorAll('.result-game[data-game-index]')],lineup=window.SweetsLineup;
 // Move existing rows, retaining the delegated selection listeners and game
 // wrappers. Removing the obsolete column furniture never changes a result.
 if(nodes.some(row=>row.parentElement!==list))list.replaceChildren(...nodes);
 const enabled=[];
 for(const row of nodes){
  const index=Number(row.dataset.gameIndex),on=!!model.enabled?.[index],engine=model.engines?.[index],key=lineup?.ids?.[index],game=lineup?.catalog?.[key];
  row.hidden=!on;row.classList.toggle('sr253-hidden-row',!on);if(!on)continue;
  const win=numeric(model.roundWins?.[index]),value=row.querySelector('.result-value'),logo=row.querySelector('.result-game-emblem');
  if(value){value.dataset.value=String(win);value.setAttribute('aria-label',String(win)+' WIN');}
  if(logo){logo.classList.add('sr253-row-logo');if(game&&logo.tagName==='IMG'&&logo.getAttribute('src')!==game.logo)logo.src=game.logo;logo.alt='';}
  let sugar=row.querySelector('.sr253-row-sugar');if(!sugar){sugar=document.createElement('span');sugar.className='sr253-row-sugar';row.append(sugar);}
  const won=!!engine?.wonderCollected,token=engine?.wonderToken,direct=typeof isDirectJpcSugar==='function'&&isDirectJpcSugar(token),sugarValue=numeric(token?.value||model.locked?.[index]);
  const sugarKey=[won,direct,sugarValue].join('/');
  if(sugar.dataset.key!==sugarKey){
   sugar.dataset.key=sugarKey;sugar.hidden=!won;sugar.replaceChildren();
   if(won){const icon=document.createElement('i');icon.className='sugar-gem';icon.dataset.value=String(sugarValue);icon.dataset.directJpc=String(direct);if(typeof applySugarTier==='function'&&typeof sugarVisualTier==='function')applySugarTier(icon,sugarVisualTier({value:sugarValue,directJpc:direct}));const text=document.createElement('small');text.textContent='GET!';sugar.append(icon,text);sugar.setAttribute('aria-label','シュガー獲得');}
  }
  row.setAttribute('aria-label',(game?.name||engine?.gameName||'ゲーム')+' '+String(win)+' WIN'+(won?' シュガー獲得':''));
  enabled.push({node:row,index,win,sugar:won,logo,value});
 }
 state.rows=enabled;state.total=numeric(model.totalWin);layer.dataset.sr253Count=String(enabled.length);
 const heading=document.getElementById('result-heading');if(heading)heading.textContent='RESULT';
 const subtitle=card.querySelector('.result-subtitle');if(subtitle)subtitle.textContent='SWEETS KINGDOM';
 const totalLabel=card.querySelector('.result-total-label');if(totalLabel)totalLabel.textContent='TOTAL';
}
function fitNumbers(){
 if(!state.active)return;
 for(const row of state.rows){
  const award=row.node.querySelector('.result-game-award'),width=Math.max(24,(award?.clientWidth||100)-24),size=Math.max(14,Math.min(31,parseFloat(card.style.getPropertyValue('--sr253-row-height'))*.68));
  if(row.value&&typeof fitGoldenNumber==='function')fitGoldenNumber(row.value,String(row.win),size,width);
 }
 const target=document.getElementById('result-total-win'),amount=card.querySelector('.result-total-amount'),width=Math.max(40,Math.min(265,(amount?.clientWidth||220)-38));
 if(target&&typeof fitGoldenNumber==='function')fitGoldenNumber(target,String(state.total),Number(card.dataset.sr253Landscape)==1?36:44,width);
}
function fit(){
 if(!state.active)return;
 const width=layer.clientWidth,height=layer.clientHeight;if(!width||!height)return;
 const n=Math.max(1,state.rows.length),landscape=width/height>1.45,columns=landscape&&n>6?2:1,rowCount=Math.ceil(n/columns),availableH=Math.max(180,height-18);
 const cardW=Math.min(width-16,landscape?900:520),edge=Math.min(40,cardW*.075,availableH*.09),top=Math.min(72,cardW*.145,availableH*.18),bottom=Math.min(42,availableH*.105),totalH=landscape?48:60,footerH=landscape?29:36,gap=landscape?3:4;
 const overhead=top+bottom+totalH+footerH+8,rowH=Math.max(17,Math.min(n<=3?54:42,(availableH-overhead-(rowCount-1)*gap)/rowCount)),cardH=Math.min(availableH,overhead+rowH*rowCount+(rowCount-1)*gap);
 const layout=[cardW,cardH,edge,top,bottom,rowH,columns,gap].map(n=>n.toFixed(3)).join('/');
 if(layout!==state.lastLayout){
  state.lastLayout=layout;state.columns=columns;card.dataset.sr253Landscape=String(Number(landscape));list.dataset.columns=String(columns);
  for(const [key,value]of Object.entries({width:cardW,height:cardH,edge,top,bottom,'row-height':rowH,gap,'total-height':totalH,'footer-height':footerH}))card.style.setProperty('--sr253-'+key,value+'px');
  card.style.setProperty('--sr253-columns',String(columns));card.style.setProperty('--sr253-rows',String(rowCount));
 }
 fitNumbers();paint();
}
function paint(){
 if(!state.active)return;
 // Hidden clients can finish the native result/payout before their first DOM
 // frame. Catch up only this decorative clock so TOTAL cannot be skipped on
 // return; never rewind or advance the engine's own timestamps or settlement.
 if(!state.paused){
  const phase=state.model?.phase,nativeElapsed=phase==='paying'||phase==='complete'?1310:phase==='result'?numeric(state.model?.result?.elapsed):0;
  state.elapsed=Math.max(state.elapsed,Math.min(1310,nativeElapsed));
 }
 const reduced=media.matches,elapsed=reduced?1500:state.elapsed,open=ease(elapsed/450),totalProgress=ease((elapsed-1050)/260);
 state.phase=elapsed<450?'opening':elapsed<1050?'rows':elapsed<1310?'total':'hold';layer.dataset.sr253Phase=state.phase;layer.dataset.sr253Paused=String(state.paused);layer.dataset.sr253Reduced=String(reduced);
 card.style.opacity=String(.25+.75*open);card.style.transform='translateY('+(18*(1-open)).toFixed(2)+'px) scale('+(0.97+.03*open).toFixed(4)+')';card.style.clipPath='inset(0 '+((1-open)*47).toFixed(3)+'% round 16px)';
 const spread=state.rows.length>1?Math.min(110,500/(state.rows.length-1)):0;
 state.rows.forEach((row,index)=>{const progress=ease((elapsed-350-index*spread)/220);row.node.style.opacity=String(progress);row.node.style.transform='translateX('+((1-progress)*24).toFixed(2)+'px)';row.node.dataset.sr253Revealed=String(progress>=1);});
 const total=card.querySelector('.result-total');if(total){total.style.opacity=String(totalProgress);total.style.transform='translateY('+((1-totalProgress)*10).toFixed(2)+'px) scale('+(0.93+.07*totalProgress).toFixed(4)+')';}
 seen.set(state.token,state.elapsed);
}
function paintWipe(){
 if(!wipe.active)return;
 const t=wipe.elapsed;
 wipe.phase=t<220?'entering':t<400?'cover':'leaving';
 const x=t<220?105*(1-ease(t/220)):t<400?0:-105*ease((t-400)/250);
 wipeNode.dataset.phase=wipe.phase;wipeNode.style.transform='translateX('+x.toFixed(3)+'%)';wipeNode.style.opacity=t>610?String(clamp((650-t)/40)):'1';
}
function wake(){if(!state.frame&&(state.active&&state.elapsed<1310&&!blocked(state.model)||wipe.active))state.frame=requestAnimationFrame(tick);}
function tick(now){
 state.frame=0;
 if(state.active){
  if(!visible(state.model)||card.hidden)close();
  else{
   state.paused=blocked(state.model);if(state.paused){state.lastStamp=null;}else{if(state.lastStamp!==null)state.elapsed=Math.min(1310,state.elapsed+Math.max(0,now-state.lastStamp));state.lastStamp=now;}
   if(media.matches)state.elapsed=1310;paint();
  }
 }
 if(wipe.active){
  const model=currentModel();
  if(media.matches||blocked(model)||model?.phase!=='ready'||String(model.token)!==wipe.token){stopWipe();}
  else{if(wipe.lastStamp!==null)wipe.elapsed+=Math.max(0,now-wipe.lastStamp);wipe.lastStamp=now;if(wipe.elapsed>=650)stopWipe();else paintWipe();}
 }
 wake();
}
function reconcile(model){
 state.model=model;
 if(!visible(model)){close();if(wipe.active&&model?.phase!=='ready')stopWipe();return;}
 if(wipe.active)stopWipe();
 card.hidden=false;
 const token=String(model.token),newToken=state.token!==token;
 if(newToken){
  state.token=token;state.elapsed=seen.get(token)||0;if(!seen.has(token)){state.startCount++;seen.set(token,0);}state.lastStamp=null;state.lastLayout='';
  if(seen.size>32)seen.delete(seen.keys().next().value);
 }
 state.active=true;state.paused=blocked(model);if(state.paused)state.lastStamp=null;
 if(media.matches)state.elapsed=1310;
 decorate(model);fit();wake();
}
const previousRender=renderRoundResult;
renderRoundResult=function(...args){const result=previousRender.apply(this,args);reconcile(args[0]);return result;};
// Native resizing can reformat TOTAL with separators; retain only its display
// fitting hook and apply the same comma-free font used for individual rows.
if(typeof fitResultTotal==='function'){
 const previousFit=fitResultTotal;
 fitResultTotal=function(...args){const result=previousFit.apply(this,args);if(state.active)fitNumbers();return result;};
}
if(typeof syncPause==='function'){
 const previousPause=syncPause;
 syncPause=function(...args){const result=previousPause.apply(this,args);state.paused=blocked(state.model);state.lastStamp=null;if(state.active)paint();if(wipe.active&&blocked(currentModel()))stopWipe();wake();return result;};
}
const observer=new MutationObserver(()=>{if((layer.hidden||card.hidden)&&state.active)close();else if(state.active){state.paused=blocked(state.model);if(state.paused)state.lastStamp=null;wake();}});
observer.observe(layer,{attributes:true,attributeFilter:['hidden']});observer.observe(card,{attributes:true,attributeFilter:['hidden']});
const resize=new ResizeObserver(fit);resize.observe(layer);
document.addEventListener('visibilitychange',()=>{state.lastStamp=null;state.paused=blocked(state.model);if(document.hidden&&wipe.active)stopWipe();if(state.active)paint();wake();});
window.addEventListener('pageshow',()=>{state.lastStamp=null;if(state.active)fit();wake();});
media.addEventListener('change',()=>{if(media.matches){if(state.active)state.elapsed=1310;stopWipe();}state.lastStamp=null;if(state.active)paint();wake();});
function rect(node){const r=node?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null;}
function describe(){
 return {version:253,installed:true,active:state.active,token:state.model?.token??state.token,startCount:state.startCount,elapsed:state.elapsed,phase:state.phase,paused:state.paused,reducedMotion:media.matches,rowCount:state.rows.length,columns:state.columns,total:state.total,totalText:document.getElementById('result-total-win')?.textContent||'',
  rows:state.rows.map(row=>({index:row.index,win:row.win,sugar:row.sugar,valueText:row.value?.textContent||'',logoLoaded:row.logo?.tagName==='IMG'?row.logo.complete&&row.logo.naturalWidth>0:false,logoSrc:row.logo?.getAttribute('src')||'',rect:rect(row.node),opacity:getComputedStyle(row.node).opacity,revealed:row.node.dataset.sr253Revealed==='true'})),
  assets:art.map(item=>({url:item.url,loaded:item.loaded,failed:item.failed})),card:rect(card),layer:rect(layer),wipe:{active:wipe.active,phase:wipe.phase,elapsed:wipe.elapsed,startCount:wipe.startCount,token:wipe.token,rect:rect(wipeNode)},nativeTimerUntouched:true};
}
window.SweetsResultsV253={version:253,describe,assetsReady};
if(typeof app!=='undefined'&&app?.result)reconcile(app);
})();
