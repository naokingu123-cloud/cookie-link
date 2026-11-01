/* SWEETS LINK v21: twelve independent, real betting engines.
 * The original 3 remain app.engines[0..2]. Nine additional authentic
 * Engine/ChocoDigEngine/CandyCarnivalEngine instances occupy indices 3..11.
 * Original Arcade.start/acceptNumber/pause/prepare/finishRound automatically
 * handle arbitrary length arrays; callback below mirrors constructor's
 * credit and completion accounting for new instances.
 */
(()=>{
'use strict';
function install(){
 try{
  if(!app||!slots?.length)return;
  const KEY='sweets-link-board-system-v21';
  const TYPES=['cookie','canyon','drop'];
  const TITLES=['クッキーリンク','チョコレートキャニオン','シックスドロップ'];
  const ordered=[
    {game:0,mini:0},{game:1,mini:0},{game:2,mini:0},
    {game:0,mini:1},{game:0,mini:2},{game:0,mini:3},
    {game:1,mini:1},{game:1,mini:2},{game:1,mini:3},
    {game:2,mini:1},{game:2,mini:2},{game:2,mini:3}
  ];
  const indexByGame=Array.from({length:3},(_,g)=>
    ordered.map((p,i)=>p.game===g?i:-1).filter(i=>i>=0));
  const defaults=ordered.map((p,id)=>({
    name:(['COOKIE','CANYON','DROP'][p.game])+' '+(p.mini+1),
    bet:3000,
    enabled:true,
    colors:5,
    speed:1
  }));
  let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{}
  let mode=saved.mode==='3'?'3':'12';
  let pendingMode=null, selected=[0,0,0], currentMode='3';
  let baseBets=app.bets.slice(0,3);
  const configs=defaults.map((d,i)=>{
    const v=Array.isArray(saved.boards)?saved.boards[i]||{}:{};
    return {
      name:String(v.name||d.name).slice(0,16),
      bet:Number.isSafeInteger(v.bet)&&v.bet>=0&&v.bet<=100000?v.bet:d.bet,
      enabled:typeof v.enabled==='boolean'?v.enabled:true,
      colors:[3,4,5].includes(v.colors)?v.colors:5,
      speed:[1,2,3].includes(v.speed)?v.speed:1
    };
  });
  const ghostMap=new Map();
  const cb=app.onEvent,betFn=app.bet.bind(app);
  const miniReachCache=new Map();
  // Shared cooperative reach scheduler: one small budget for all 12 boards.
  // Never create twelve independent timer chains for the same draw.
  const reachJobs=[];
  let reachTimer=null;
  let reachCalculations=0,reachCacheHits=0;
  function pumpReachJobs(){
    reachTimer=null;
    if(currentMode!=='12'||app.phase==='ready'){
      reachJobs.length=0;return;
    }
    const deadline=performance.now()+5;
    let processed=0;
    while(reachJobs.length){
      const job=reachJobs.shift(),{id,cache,e,numbers,group,bet,snapshot}=job;
      if(miniReachCache.get(id)!==cache||app.phase==='ready'||e.version!==job.version)continue;
      // A board can become busy while a snapshot is being processed.
      if(e.busy||e.queue?.length){
        cache.busy=false;miniReachCache.delete(id);continue;
      }
      try{
        const n=numbers[job.position++];
        if(n!==undefined){
          let prediction;
          if(group===0)prediction=predictNextHit(e,n);
          else if(group===2)prediction=snapshot.predict(n);
          else{
            const p=chocoPlan(snapshot.strata,[n],snapshot);
            const resolved=Number(snapshot.bonusResolvedDepth)||0;
            const depth=Number(p.bonusResolvedDepth)||0;
            prediction={number:n,gain:p.gain,total:e.totalHundredths+p.gain,
              tier:depth>=500&&depth>resolved&&depth%100===0?3:
              reachTier(e.totalHundredths+p.gain,false)};
          }
          reachCalculations++;
          if(prediction?.gain>0&&medalWin(bet,prediction.gain)>0){
            cache.values.push({value:String(n),tier:String(prediction.tier||0)});
          }
        }
        if(job.position<numbers.length){
          reachJobs.push(job);
        }else{
          cache.busy=false;
          cache.values.sort((a,b)=>Number(a.value)-Number(b.value));
        }
      }catch(error){
        cache.busy=false;cache.error=true;
        console.warn('[Sweets12] reach prediction board '+id,error);
      }
      processed++;
      if(processed>=2||performance.now()>deadline)break;
    }
    if(reachJobs.length)reachTimer=setTimeout(pumpReachJobs,16);
  }
  function queueReach(job){
    reachJobs.push(job);
    if(reachTimer===null)reachTimer=setTimeout(pumpReachJobs,8);
  }
  const lastEvents=new Map();
  let pane=null,modeInfo=null,modeButtons=[],configsHolder=null;
  let syncTimer=0;
  const savedSet=()=>{try{localStorage.setItem(KEY,JSON.stringify({mode,boards:configs}));}catch{}};
  const optionFor=(i)=>configs[i];
  const gameFor=i=>ordered[i].game;
  const groupPos=(group,mini)=>indexByGame[group][mini]??group;
  const isReady=()=>app.phase==='ready';
  function activeSlot(group){return groupPos(group,selected[group]);}
  function betAt(i){
    return app.phase==='ready'?Number(app.bets[i]||0):Number(app.locked[i]||0);
  }
  function want(i){return optionFor(i).enabled?optionFor(i).bet:0;}
  function makeGhost(i){
    const group=gameFor(i),cfg=optionFor(i);
    const Type=group===0?Engine:group===1?ChocoDigEngine:CandyCarnivalEngine;
    const e=new Type({
      random:Math.random,speed:Math.max(2,app.speed),colorCount:cfg.colors,
      sleep:ms=>new Promise(resolve=>setTimeout(resolve,Math.min(8,Math.max(0,ms/12)))),
      onEvent:(ev,engine)=>ghostEvent(i,ev,engine)
    });
    // Offscreen boards resolve animation delays rapidly; physics, random
    // drops, rewards and bonus planning are the real engine implementation.
    const rush=async(ms,token)=>{
      while(e.paused&&token===e.version)await new Promise(r=>setTimeout(r,32));
      // The per-board 1x/2x/3x setting is meaningful even for offscreen
      // boards, but a short upper bound avoids twelve slow animations.
      const delay=Math.max(5,Math.min(110,(Number(ms)||0)/(8*Math.max(1,e.speed))));
      await new Promise(r=>setTimeout(r,delay));
      return token===e.version;
    };
    if(group===0)e.wait=rush;
    if(group===1)e.visualWait=rush;
    if(group===2)e.waitVisual=rush;
    e.presentationRate=3;
    ghostMap.set(i,e);
    return e;
  }
  function getEngine(i){return i<3?app.engines[i]:ghostMap.get(i);}
  function ghostEvent(i,ev,e){
    if(!app||currentMode!=='12'||!app.engines.includes(e))return;
    // Keep actual event payload for compact full-renderer fall/refill FX.
    lastEvents.set(i,ev);
    const game=gameFor(i);
    if(ev.phase==='stepcollect'&&app.phase==='playing'&&app.enabled[i]){
      app.wonderBank.push(...(ev.steps||[]).map(step=>({...step,game,board:i})));
      app.wonderSteps=app.wonderBank.length;
      app.wonderValue+=(ev.steps||[]).reduce((a,v)=>a+(v.value||0),0);
    }
    if(ev.phase==='complete'&&app.phase==='playing'&&!app.paid[i]&&app.enabled[i]){
      app.paid[i]=true;
      app.roundWins[i]=medalWin(app.locked[i]||0,e.totalHundredths);
      if(app.enabled.every((yes,j)=>!yes||app.paid[j]))app.finishRound();
      app.onChange(app);
    }
    if(ev.phase==='error'&&app.phase==='playing'&&app.enabled[i]){
      console.error('[Sweets12] independent engine '+i,ev.message||ev);
      // Do not strand all twelve in an unfinished result on one board error.
      app.paid[i]=true;app.roundWins[i]=0;
      if(app.enabled.every((yes,j)=>!yes||app.paid[j]))app.finishRound();
      app.onChange(app);
    }
    // On a stable board a result is keyed by state; repeated 'waiting'
    // and 'settled' events do not invalidate it. Reset only on a new round.
    if(ev.phase==='ready'||ev.phase==='error')miniReachCache.delete(i);
    if(selected[game]===ordered[i].mini&&active===game){
      event(game,ev,e,app);
    }else if(ev.phase==='complete'||ev.phase==='sugaraward'){
      scheduleUI(app);
    }
  }
  // Original Arcade callbacks still account for main-board payouts, but
  // must not overwrite the main view when a secondary board is selected.
  app.onEvent=function(i,ev,e,a){
    lastEvents.set(i,ev);
    if(currentMode==='12'&&selected[i]>0&&ev.phase!=='rainbowappear'){
      if(ev.phase==='complete')recordChanged(a);
      return;
    }
    return cb(i,ev,e,a);
  };
  app.bet=function(i){
    if(currentMode==='12'&&Number.isInteger(i)&&i>=0&&i<3){
      return betAt(activeSlot(i));
    }
    return betFn(i);
  };
  function applySettingsToInstances(reset=false){
    for(let i=0;i<12;i++){
      const cfg=configs[i],e=getEngine(i);
      if(!e)continue;
      app.bets[i]=want(i);
      if(gameFor(i)===0){
        if(e.colorCount!==cfg.colors){
          e.colorCount=cfg.colors;
          if(reset)e.reset({keepWonder:true,keepHammers:false});
        }
      }
      e.speed=i>=3?Math.max(2,app.speed*cfg.speed):app.speed*cfg.speed;
    }
    if(app.phase==='ready')app.enabled=app.bets.map(n=>n>0);
    app.onChange(app);
  }
  function attachTwelve(){
    if(currentMode==='12')return;
    for(let i=3;i<12;i++){
      let e=ghostMap.get(i);
      if(!e)e=makeGhost(i);
      app.engines[i]=e;
      e.reset({keepWonder:true,keepHammers:false});
    }
    app.engines.length=12;
    while(app.bets.length<12)app.bets.push(3000);
    while(app.locked.length<12)app.locked.push(0);
    while(app.paid.length<12)app.paid.push(false);
    while(app.roundWins.length<12)app.roundWins.push(0);
    currentMode='12';
    applySettingsToInstances(true);
    document.body.classList.add('twelve-mini-tabs-v16');
  }
  function detachTwelve(){
    if(currentMode==='3')return;
    for(const e of ghostMap.values()){e.paused=true;}
    app.engines.length=3;
    app.bets=baseBets.slice(0,3);
    app.locked.length=3;app.paid.length=3;app.roundWins.length=3;
    app.enabled=app.bets.map(n=>n>0);
    currentMode='3';selected=[0,0,0];
    document.body.classList.remove('twelve-mini-tabs-v16');
    // Immediately restore the original three engines to their native panels.
    for(let g=0;g<3;g++){
      const slot=slots[g],e=app.engines[g];
      slot.engine=e;slot.event={phase:e.phase||'ready'};
      slot.dirtyMain=true;slot.dirtyMini=true;slot.catchUp=true;
      slot.tabKey=null;slot.reachBoardKey=null;slot.chocoReachKey=null;
      slot.sixReachKey=null;slot.candyKey='';
      if(g===active){try{event(g,slot.event,e,app);}catch(error){console.warn('[Sweets12] original view',error);}}
    }
    app.onChange(app);
  }
  function applyMode(value){
    if(value!==currentMode){
      if(value==='12')attachTwelve();else detachTwelve();
    }
    document.body.classList.toggle('twelve-live-active',currentMode==='12');
    document.body.dataset.gameMode=currentMode;
    if(currentMode==='12')for(let g=0;g<3;g++)refreshLarge(g);
    refreshMenu();
  }
  function requestMode(next){
    if(!['3','12'].includes(next))return;
    mode=next;savedSet();
    if(!isReady()){
      pendingMode=next;
      if(modeInfo)modeInfo.textContent='ゲーム進行中のため、次のBET時間から'+next+'面に切り替えます';
      return;
    }
    pendingMode=null;applyMode(next);
  }
  const nativePrepare=app.prepare.bind(app);
  app.prepare=function(...args){
    const out=nativePrepare(...args);
    if(pendingMode){const chosen=pendingMode;pendingMode=null;applyMode(chosen);}
    if(currentMode==='12')applySettingsToInstances(true);
    return out;
  };
  const nativeSetBet=app.setBet.bind(app);
  app.setBet=function(i,n){
    const ok=nativeSetBet(i,n);
    if(ok&&currentMode==='3'&&i<3)baseBets[i]=n;
    if(ok&&currentMode==='12'&&i<12){
      configs[i].bet=n;configs[i].enabled=n>0;savedSet();
    }
    return ok;
  };
  const nativeColor=app.setColorCount.bind(app);
  app.setColorCount=function(...args){
    const result=nativeColor(...args);
    if(result&&currentMode==='12'&&app.phase==='ready')applySettingsToInstances(true);
    return result;
  };
  const nativeReset=app.resetDebug.bind(app);
  app.resetDebug=function(...args){
    const result=nativeReset(...args);
    if(currentMode==='12')applySettingsToInstances(true);
    return result;
  };
  function refreshLarge(group){
    if(!app||currentMode!=='12')return;
    const slot=slots[group],i=activeSlot(group),e=getEngine(i);
    if(!slot||!e)return;
    if(slot.engine===e)return;
    slot.engine=e;
    slot.event={phase:e.phase||'ready'};
    slot.tabKey=null;
    slot.dirtyMain=true;slot.dirtyMini=true;slot.catchUp=true;
    slot.reachEpoch=(slot.reachEpoch||0)+1;
    slot.reachBoardKey=null;slot.chocoReachKey=null;
    slot.tabReachResults=[];slot.reachResults=[];
    slot.sixReachKey=null;slot.candyKey='';
    if(active===group){
      try{event(group,slot.event,e,app);}catch(error){console.warn('[Sweets12] board view',error);}
    }
    scheduleUI(app);
  }
  function selectBoard(group,mini){
    if(currentMode!=='12')return;
    if(group<0||group>2||mini<0||mini>3)return;
    selected[group]=mini;
    refreshLarge(group);
    if(active!==group)select(group);
    scheduleUI(app);
  }
  function reachFor(i){
    const e=getEngine(i);
    if(!e||app.phase==='ready'||betAt(i)<=0||e.busy||e.queue?.length
      ||e.opening||e.transitionPending||(e.processed||0)<1
      ||e.phase==='error'||app.draws.length>=8)return [];
    const group=gameFor(i),bet=betAt(i);
    // All fields that materially change the calculation are in this key.
    // Scrolling numbers, switching tabs, and repainting do not change it.
    const key=[e.version,e.processed,e.boardGeneration||0,e.depth||0,
      e.totalHundredths||0,e.roundIndex||0,bet,app.draws.join(',')].join('/');
    const old=miniReachCache.get(i);
    if(old?.key===key){reachCacheHits++;return old.values;}
    // Main-board reach forecasts are already computed by the original
    // engine. Reuse them instead of simulating the same numbers again.
    const slot=slots[group];
    if(slot?.engine===e && slot.reachStatus==='ready'
      && slot.tabReachVersion===e.version
      && slot.reachAfterBall===e.processed && slot.reachPageResults?.length){
      const result=slot.reachPageResults.map(p=>({
        value:String(p.number),tier:String(p.tier||0)
      })).sort((a,b)=>Number(a.value)-Number(b.value));
      miniReachCache.set(i,{key,values:result,busy:false,source:'main'});
      return result;
    }
    const values=[];
    const cache={key,values,busy:true,source:'simulation'};
    miniReachCache.set(i,cache);
    const drawn=new Set(app.draws);
    let numbers=group===1?
      [...new Set([...(e.drills||[]).flatMap(d=>d.numbers||[]),
        ...(e.lucky?.numbers||[])])]:
      Array.from({length:25},(_,n)=>n+1);
    numbers=numbers.filter(n=>!drawn.has(n)).sort((a,b)=>a-b);
    if(!numbers.length){cache.busy=false;return values;}
    let snapshot;
    try{snapshot=group===1?e.world():group===2?e.reachSnapshot():null;}
    catch(error){cache.busy=false;console.warn('[Sweets12] reach snapshot',error);return values;}
    queueReach({id:i,cache,e,group,bet,numbers,snapshot,position:0,version:e.version});
    return values;
  }
  function getBoard(group,mini){
    if(currentMode!=='12')return null;
    const i=groupPos(group,mini),cfg=configs[i],e=getEngine(i);
    if(!e)return null;
    const bet=betAt(i);
    const score=medalWin(bet,e.totalHundredths||0);
    return {id:i,game:group,mini,name:cfg.name,bet,enabled:bet>0,
      engine:e,event:lastEvents.get(i)||{phase:e.phase||'ready'},
      score,sugar:!!e.wonderCollected,
      reach:reachFor(i),selected:selected[group]===mini,
      status:bet<=0?'不参加':app.phase==='ready'?'準備':
        e.phase==='complete'?'終了':e.busy?'処理中':'待機'};
  }
  function persistSettingsFromForm(field,i,v){
    const cfg=configs[i];
    if(!cfg)return;
    if(field==='name')cfg.name=String(v||'').trim().slice(0,16)||defaults[i].name;
    else if(field==='enabled')cfg.enabled=!!v;
    else if(field==='bet')cfg.bet=Math.max(0,Math.min(100000,Math.round(Number(v)||0)));
    else if(field==='colors')cfg.colors=[3,4,5].includes(+v)?+v:5;
    else if(field==='speed')cfg.speed=[1,2,3].includes(+v)?+v:1;
    savedSet();
    // Changing a display name must not reset real engines or trigger a
    // full 12-board status/payout recomputation on every typed character.
    if(field!=='name'&&isReady()&&currentMode==='12')
      applySettingsToInstances(field==='colors');
    if(modeInfo)modeInfo.textContent=isReady()?'設定を保存しました':'設定は次ゲームから反映されます';
  }
  function makeMenu(){
    const nav=document.querySelector('#record-menu .record-nav');
    const root=document.getElementById('record-page');
    if(!nav||!root)return;
    const button=document.createElement('button');
    button.type='button';button.id='menu-page-boards';
    button.setAttribute('aria-pressed','false');button.textContent='盤面設定';
    nav.append(button);
    pane=document.createElement('section');pane.id='sweets12-board-settings';pane.hidden=true;
    pane.innerHTML=
      '<div class="sweets12-mode-select" role="group" aria-label="ゲーム盤面数">'+
      '<button type="button" data-mode="3">3面</button>'+
      '<button type="button" data-mode="12">12面</button></div>'+
      '<p id="sweets12-mode-info" aria-live="polite"></p>'+
      '<p class="sweets12-info">12面は実際に独立抽選・配当計算します。同じルーレットの8球を使用します。BETや設定は各盤面で個別です。</p>'+
      '<div id="sweets12-board-configs" class="sweets12-board-configs"></div>';
    root.before(pane);
    modeInfo=pane.querySelector('#sweets12-mode-info');
    configsHolder=pane.querySelector('#sweets12-board-configs');
    modeButtons=[...pane.querySelectorAll('[data-mode]')];
    pane.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>requestMode(b.dataset.mode)));
    button.addEventListener('click',()=>{
      pane.hidden=false;root.hidden=true;
      document.querySelector('#record-menu .debug-colors')?.setAttribute('hidden','');
      document.querySelector('#record-menu .record-scope')?.setAttribute('hidden','');
      nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      refreshMenu();
    });
    nav.addEventListener('click',ev=>{
      if(ev.target.closest('button')===button)return;
      pane.hidden=true;root.hidden=false;
      document.querySelector('#record-menu .debug-colors')?.removeAttribute('hidden');
      document.querySelector('#record-menu .record-scope')?.removeAttribute('hidden');
    },true);
    configsHolder.addEventListener('change',ev=>{
      const target=ev.target,idx=Number(target.dataset.board),field=target.dataset.field;
      if(!Number.isInteger(idx)||idx<0||idx>=12||!field)return;
      persistSettingsFromForm(field,idx,field==='enabled'?target.checked:target.value);
      if(field==='enabled'||field==='colors')refreshMenu();
    });
    configsHolder.addEventListener('input',ev=>{
      const target=ev.target;
      if(target.dataset.field==='name'){
        const i=Number(target.dataset.board);
        if(Number.isInteger(i)&&i>=0&&i<12)persistSettingsFromForm('name',i,target.value);
      }
    });
  }
  function refreshMenu(){
    if(!pane)return;
    modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    if(modeInfo){
      modeInfo.textContent=pendingMode?'次のBET時間から'+pendingMode+'面に切替':
        '現在 '+currentMode+'面モード'+(isReady()?'／変更可能':'／設定は次ゲームから適用');
    }
    if(pane.hidden||!configsHolder)return;
    const section=Array.from({length:3},(_,g)=>{
      const cards=indexByGame[g].map(i=>{
        const c=configs[i],n=ordered[i].mini+1;
        return '<div class="sweets12-board-row"><div class="sweets12-board-row-top">'+
        '<strong>'+TITLES[g]+' '+n+'</strong><label class="sweets12-switch">参加 '+
        '<input type="checkbox" data-board="'+i+'" data-field="enabled" '+(c.enabled?'checked':'')+'></label></div>'+
        '<div class="sweets12-board-fields">'+
        '<label>名前<input maxlength="16" data-board="'+i+'" data-field="name" value="'+
         c.name.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')+'"></label>'+
        '<label>BET<input type="number" min="0" max="100000" step="100" data-board="'+i+
         '" data-field="bet" value="'+c.bet+'"></label>'+
        (g===0?'<label>色数<select data-board="'+i+'" data-field="colors">'+
          [3,4,5].map(v=>'<option value="'+v+'" '+(c.colors===v?'selected':'')+'>'+v+'色</option>').join('')+
         '</select></label>':'')+
        '<label>速度<select data-board="'+i+'" data-field="speed">'+
         [1,2,3].map(v=>'<option value="'+v+'" '+(c.speed===v?'selected':'')+'>'+v+'倍</option>').join('')+
        '</select></label></div></div>';
      }).join('');
      return '<section class="sweets12-config-group"><h3>'+TITLES[g]+'（4面）</h3>'+cards+'</section>';
    }).join('');
    configsHolder.innerHTML=section;
  }
  // The original result layout was designed for only 3 rows.
  // In twelve-board mode it becomes a 3x4 compact, scrollable scorecard.
  const nativeResult=renderRoundResult;
  renderRoundResult=function(a){
    nativeResult(a);
    const list=document.getElementById('result-games');
    if(!list)return;
    list.classList.toggle('sweets12-result-grid',currentMode==='12');
    if(currentMode!=='12')return;
    list.querySelectorAll('.result-game').forEach((row,i)=>{
      const icon=row.querySelector('use');
      if(icon)icon.setAttribute('href','#candy'+[0,2,4][gameFor(i)]);
      const name=row.querySelector('.result-game-name');
      if(name && !name.querySelector('.sweets12-result-id')){
        const tag=document.createElement('span');
        tag.className='sweets12-result-id';
        tag.textContent=' '+(configs[i]?.name||String((ordered[i]?.mini||0)+1)+'番');
        const small=name.querySelector('small');
        if(small)small.before(tag);else name.append(tag);
      }
    });
  };
  function attachImmediate(){
    // Always initialize the visible menu, even if currently in 3-board mode.
    makeMenu();
    if(mode==='12')applyMode('12');
    else{document.body.classList.remove('twelve-mini-tabs-v16');currentMode='3';}
    savedSet();
    scheduleUI(app);
    console.info('[Sweets12V21] mode '+currentMode+', active engines '+app.engines.length);
  }
  window.sweets12ReachStats={
    get calculations(){return reachCalculations;},
    get cacheHits(){return reachCacheHits;},
    get queued(){return reachJobs.length;}
  };
  window.sweets12Live={
    get mode(){return currentMode;},
    get selected(){return selected.slice();},
    get boards(){return app.engines.length;},
    getBoard,selectBoard,requestMode,
    get settings(){return configs.map(v=>({...v}));}
  };
  attachImmediate();
 }catch(err){console.error('[Sweets12V21]',err);}
}
setTimeout(install,0);
})();