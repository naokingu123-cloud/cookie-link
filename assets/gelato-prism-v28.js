/* GELATO PRISM v29 - faithful 19-point/24-triangle reference star */
(()=>{
'use strict';
try{
 // Geometry follows the user's 500 x 500 six-point star reference exactly:
 // 19 labeled intersections, 42 segments and 24 elementary triangular faces.
 // Indices: top; five upper; two upper diagonals; three center;
 // two lower diagonals; five lower; bottom tip.
 const RAW=[
  [250,46],[44,132],[202,132],[250,132],[294,132],[455,132],
  [160,213],[339,213],[129,272],[250,272],[370,272],
  [166,333],[332,333],[55,412],[212,412],[250,412],[288,412],[443,412],[250,470]
 ];
 const P=RAW.map(([x,y])=>({x:160+(x-250)*.71,y:8+(y-46)*.70}));
 // Every path is a continuous stroke in the supplied drawing. Intersections
 // are explicit so the board has no inadvertent extra faces or missing links.
 const LINES=[
  [0,2,6,8,13],[0,4,7,10,17],[1,2,3,4,5],[13,14,15,16,17],
  [1,6,9,12,17],[5,7,9,11,13],[1,8,11,14,18],[5,10,12,16,18],
  [0,3,9,15,18],[8,9,10],[2,9,16],[4,9,14]
 ];
 const EDGES=[],FACES=[],emap=new Map();
 for(const line of LINES)for(let k=0;k<line.length-1;k++){
   const a=line[k],b=line[k+1],key=Math.min(a,b)+':'+Math.max(a,b);
   if(emap.has(key))continue;
   const id=EDGES.length;EDGES.push({a,b,id});emap.set(key,id);
 }
 const edge=(a,b)=>emap.get(Math.min(a,b)+':'+Math.max(a,b));
 for(let a=0;a<P.length;a++)for(let b=a+1;b<P.length;b++)for(let c=b+1;c<P.length;c++){
   const x=edge(a,b),y=edge(b,c),z=edge(a,c);
   if(x==null||y==null||z==null)continue;
   FACES.push({id:FACES.length,nodes:[a,b,c],edges:[x,y,z],
     x:(P[a].x+P[b].x+P[c].x)/3,y:(P[a].y+P[b].y+P[c].y)/3,
     flavor:(a+2*b+5*c)%6});
 }
 if(P.length!==19||EDGES.length!==42||FACES.length!==24)
   throw Error('Prism reference geometry invalid: '+P.length+'/'+EDGES.length+'/'+FACES.length);
 const supports=EDGES.map(e=>{
   let total=0;
   for(const line of LINES){
     const a=line.indexOf(e.a),b=line.indexOf(e.b);
     if(a<0||b<0||Math.abs(a-b)!==1)continue;
     const k=Math.min(a,b);total+=(k+1)*(line.length-k-1);
   }
   return total;
 });
 const ranked=[...FACES].sort((a,b)=>
   a.edges.reduce((n,i)=>n+1/supports[i],0)-b.edges.reduce((n,i)=>n+1/supports[i],0));
 ranked.forEach((f,i)=>{f.tier=Math.min(3,Math.floor(i/6));f.reward=[32,42,62,95][f.tier];});
 const BONUS=3500,flavors=['#f88fb9','#fff1c7','#b0e9d9','#ffe0a7','#b1ccfa','#d6b6f1'];
 function link(hits){
   const result=new Set();
   for(const line of LINES){
     let first=-1,last=-1;
     for(let i=0;i<line.length;i++)if(hits.has(line[i])){if(first<0)first=i;last=i;}
     if(first<0||last<=first)continue;
     for(let k=first;k<last;k++)result.add(edge(line[k],line[k+1]));
   }
   return result;
 }
 const fill=links=>new Set(FACES.filter(f=>f.edges.every(e=>links.has(e))).map(f=>f.id));
 class GelatoEngine {
   constructor(random,onEvent,sleep){
     this.random=random;this.onEvent=onEvent;this.sleep=sleep;this.speed=1.4;
     this.kind='gelato';this.gameName='ジェラートプリズム';this.drawMode='single';this.reachMode='single';
     this.colorCount=5;this.version=0;this.cycle=0;this.newPrism();this.reset();
   }
   emit(phase,extras={}){
     if(!['queued','drawpending','stepcollect'].includes(phase))this.phase=phase;
     this.onEvent(Object.assign({phase},extras),this);
   }
   newPrism(){
     this.cycle++;
     let nums=Array.from({length:25},(_,i)=>i+1);
     for(let i=24;i>0;i--){const j=Math.floor(this.random()*(i+1));[nums[i],nums[j]]=[nums[j],nums[i]];}
     this.nodeNumbers=nums.slice(0,19);this.hits=new Set();this.links=new Set();
     this.filled=new Set();this.sugarFace=Math.floor(this.random()*24);
     this.sugarAwarded=false;this.allComplete=false;
   }
   reset(){
     if(this.allComplete)this.newPrism();
     this.version++;this.queue=[];this.pendingDraws=new Set();this.drawn=new Set();this.seen=new Set();
     this.accepted=0;this.processed=0;this.busy=false;this.running=false;this.opening=false;this.paused=false;
     this.presentationRate=1;this.roundBet=this.roundBet||3000;this.totalHundredths=0;this.maxLink=0;this.maxChain=0;
     this.allClears=0;this.roundSteps=0;this.roundHammers=0;this.roundCleared=0;this.lastGain=0;
     this.lastFilled=[];this.lastNode=-1;this.wonderCollected=this.sugarAwarded;this.wonderToken=null;
     this.emit('ready',{filled:this.filled.size});
   }
   get idle(){return !this.busy&&!this.queue.length;}
   start(){if(this.running||this.roundBet<=0)return;this.running=true;this.emit('waiting');}
   previewDraw(n){
     if(!this.running||this.seen.has(n)||this.pendingDraws.has(n))return false;
     this.pendingDraws.add(n);this.emit('drawpending',{number:n});return true;
   }
   enqueueBatch(numbers){
     if(!this.running||!numbers?.length||this.accepted+numbers.length>8||numbers.some(n=>this.seen.has(n)))return false;
     for(const n of numbers)this.seen.add(n);
     this.accepted+=numbers.length;this.queue.push([...numbers]);
     this.emit('queued',{numbers});if(!this.busy)this.drain();return true;
   }
   async wait(ms,token){
     let left=ms/Math.max(.5,this.speed);
     while(left>0&&token===this.version){
       const slice=Math.min(35,left);
       await this.sleep(slice);
       if(!this.paused)left-=slice*Math.max(1,this.presentationRate||1);
     }
     return token===this.version;
   }
   stateFor(hits){const edges=link(hits);return {edges,faces:fill(edges)};}
   predict(number){
     const pos=this.nodeNumbers.indexOf(number);
     if(pos<0||this.hits.has(pos))return {number,gain:0,total:this.totalHundredths,tier:0};
     const next=new Set(this.hits);next.add(pos);
     const state=this.stateFor(next),fresh=[...state.faces].filter(i=>!this.filled.has(i));
     let gain=fresh.reduce((n,i)=>n+FACES[i].reward,0);
     if(state.faces.size===24&&!this.allComplete)gain+=BONUS;
     return {number,gain,total:this.totalHundredths+gain,tier:gain>=BONUS?3:gain>=170?2:gain>=85?1:0};
   }
   async drain(){
     if(this.busy)return;
     const token=this.version;this.busy=true;
     try{
       while(this.queue.length&&token===this.version){
         const numbers=this.queue.shift();
         for(const n of numbers){this.drawn.add(n);this.pendingDraws.delete(n);}
         for(const number of numbers){
           const pos=this.nodeNumbers.indexOf(number),newHit=pos>=0&&!this.hits.has(pos);
           if(newHit)this.hits.add(pos);
           this.lastNode=pos;
           this.emit('gelatoHit',{number,index:pos,newHit});
           if(!await this.wait(newHit?250:110,token))return;
           const next=this.stateFor(this.hits);
           const newFaces=[...next.faces].filter(i=>!this.filled.has(i));
           this.links=next.edges;this.filled=next.faces;this.lastFilled=newFaces;
           if(newFaces.length){
             let gain=newFaces.reduce((n,i)=>n+FACES[i].reward,0);
             this.roundCleared+=newFaces.length;
             if(newFaces.includes(this.sugarFace)&&!this.sugarAwarded){
               this.sugarAwarded=true;this.wonderCollected=true;this.roundSteps++;
               const step={id:this.version*100+this.processed+1,value:Math.max(1,this.roundBet),tier:wonderTier(this.roundBet)};
               this.wonderToken=step;this.emit('stepcollect',{steps:[step]});this.emit('sugaraward',{steps:[step]});
             }
             if(this.filled.size===24&&!this.allComplete){this.allComplete=true;this.allClears++;gain+=BONUS;}
             this.totalHundredths+=gain;this.lastGain=gain;
             this.maxLink=Math.max(this.maxLink,this.filled.size);
             this.emit('gelatoFill',{number,newFaces,gain,full:this.allComplete});
             if(!await this.wait(660,token))return;
           }
         }
         this.processed+=numbers.length;this.emit('settled',{numbers,filled:this.filled.size});
       }
       if(token!==this.version)return;
       if(this.processed>=8){
         if(this.beforeComplete)await this.beforeComplete(token);
         if(token!==this.version)return;
         this.busy=false;this.running=false;this.emit('complete');
       }else{this.busy=false;this.emit('waiting');}
     }catch(err){if(token===this.version){this.busy=false;this.running=false;this.emit('error',{message:err.message});}}
   }
 }
 const path=nodes=>nodes.map(i=>P[i].x.toFixed(1)+','+P[i].y.toFixed(1)).join(' ');
 function boardSVG(prefix){
   const defs=['<defs>'];
   defs.push('<radialGradient id="'+prefix+'-shell"><stop stop-color="#fffbef"/><stop offset=".46" stop-color="#ffe1f2"/><stop offset=".88" stop-color="#d3b7fa"/><stop offset="1" stop-color="#9b76a6"/></radialGradient>');
   defs.push('<linearGradient id="'+prefix+'-rail" x2=".8" y2=".9"><stop stop-color="#fffef3"/><stop offset=".4" stop-color="#d2f9f3"/><stop offset="1" stop-color="#8ab5e6"/></linearGradient>');
   for(let i=0;i<6;i++)defs.push('<radialGradient id="'+prefix+'-ice'+i+'" cx=".35" cy=".16" r=".85"><stop stop-color="#ffffff"/><stop offset=".26" stop-color="#fff9f5"/><stop offset=".57" stop-color="'+flavors[i]+'"/><stop offset="1" stop-color="#b179af"/></radialGradient>');
   for(const f of FACES)defs.push('<clipPath id="'+prefix+'-clip'+f.id+'"><polygon points="'+path(f.nodes)+'"/></clipPath>');
   defs.push('</defs>');
   const faces=FACES.map(f=>{
     const cx=f.x.toFixed(1),cy=f.y.toFixed(1);
     return '<g class="gp-face" data-face="'+f.id+'">'+
       '<polygon class="gp-blank" points="'+path(f.nodes)+'" fill="'+(f.id%2?'#ffecf6aa':'#d9f8fa99')+'"/>'+
       '<g class="gp-ice" clip-path="url(#'+prefix+'-clip'+f.id+')">'+
       '<polygon points="'+path(f.nodes)+'" fill="url(#'+prefix+'-ice'+f.flavor+')"/>'+
       '<path d="M'+(f.x-21)+' '+(f.y-7)+'q18-16 37 1t-8 19" stroke="#fff8ec" stroke-width="5" fill="none" opacity=".62"/>'+
       '<ellipse cx="'+(f.x-7)+'" cy="'+(f.y-7)+'" rx="4" ry="2" fill="#fffefa" opacity=".7"/>'+
       '</g><polygon class="gp-face-border" points="'+path(f.nodes)+'" fill="none" stroke="#fffaf3" stroke-width="1.8"/>'+
       '<text class="gp-face-value" x="'+cx+'" y="'+(f.y+3).toFixed(1)+'">'+(f.reward/100).toFixed(2)+'×</text>'+
       '<text class="gp-sugar" x="'+cx+'" y="'+(f.y-9).toFixed(1)+'">✦</text></g>';
   }).join('');
   const lines=EDGES.map(e=>{
     const a=P[e.a],b=P[e.b],d='M'+a.x.toFixed(1)+' '+a.y.toFixed(1)+'L'+b.x.toFixed(1)+' '+b.y.toFixed(1);
     return '<g data-edge="'+e.id+'" class="gp-edge"><path d="'+d+'" stroke="#654974" stroke-width="7" stroke-linecap="round"/>'+
       '<path d="'+d+'" stroke="url(#'+prefix+'-rail)" stroke-width="4.2" stroke-linecap="round"/>'+
       '<path class="gp-glowing-line" d="'+d+'" stroke="#ffefa1" stroke-width="5.2" stroke-linecap="round"/></g>';
   }).join('');
   const nodes=P.map((p,i)=>'<g data-node="'+i+'" class="gp-node" transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')">'+
      '<circle r="13.8" fill="#745281" stroke="#fffcee" stroke-width="2.5"/>'+
      '<circle r="11.6" fill="url(#'+prefix+'-shell)" stroke="#f7bfd0" stroke-width="1.2"/>'+
      '<ellipse cx="-4" cy="-5" rx="4" ry="2.2" transform="rotate(-28)" fill="#ffffffa5"/>'+
      '<text class="gp-digit" y="4.3" text-anchor="middle">?</text>'+
      '<circle class="gp-hit-ring" r="14.2" fill="none" stroke="#ffdf64" stroke-width="3"/></g>').join('');
   const major=[P[0],P[5],P[17],P[18],P[13],P[1]];
   const tri=(indices)=>indices.map((i,k)=>(k?'L':'M')+major[i].x.toFixed(1)+' '+major[i].y.toFixed(1)).join('')+'Z';
   return '<svg class="gp-board-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 314" role="img" aria-label="19交点・24三角形のジェラートプリズム">'+defs.join('')+
      '<circle cx="160" cy="157" r="154" fill="url(#'+prefix+'-shell)" stroke="#fffcf6" stroke-width="7"/>'+
      '<circle cx="160" cy="157" r="143" fill="#f7eafa" stroke="#e9c0e7" stroke-width="4"/>'+
      faces+'<path d="'+tri([0,2,4])+'" fill="none" stroke="#fff2d4" stroke-width="5" opacity=".7"/>'+
      '<path d="'+tri([1,3,5])+'" fill="none" stroke="#e690b9" stroke-width="5" opacity=".6"/>'+
      lines+nodes+'</svg>';
 }
 const slot=slots[0],originalEvent=app.onEvent;
 slot.holder.classList.add('gp-slot');slot.panel.classList.add('gp-panel');slot.tab.classList.add('gp-tab');
 slot.tab.querySelector('.tab-game-name').innerHTML='<span class="gp-logo"><b>ジェラート<br>プリズム</b><small>GELATO PRISM ✦</small></span>';
 slots[1].holder.style.order='0';slots[2].holder.style.order='1';slot.holder.style.order='2';
 const scene=document.createElement('div');scene.className='gp-scene';
 scene.innerHTML='<div class="gp-land"></div>'+
  '<div class="gp-head"><b>GELATO PRISM</b><small>19 DOTS / 24 SWEET TRIANGLES</small></div>'+
  '<div class="gp-mold">'+boardSVG('gp-main')+'</div>'+
  '<div class="gp-status"><span><small>FILL</small><b class="gp-fill-count">0 / 24</b></span>'+
  '<span><small>今回のWIN</small><b class="gp-earned">0 WIN</b></span>'+
  '<span><small>SUGAR</small><b class="gp-sugar-state">✦</b></span></div>'+
  '<div class="gp-note">HIT点をつなぐとジェラートが流れ込む！<small>PRISMは次ゲームにも蓄積・24面でボーナス</small></div>'+
  '<div class="gp-flash" hidden></div>';
 slot.panel.append(scene);
 // Native right-hand payout furniture remains intact for Canyon/Drop.
 // Gelato replaces it with the 24-face difficulty/odds legend.
 const gpOdds=document.createElement('div');gpOdds.className='gp-prism-odds';
 gpOdds.innerHTML='<div class="gp-odds-heading"><span>✦</span><b>PRISM REWARDS</b><small>GELATO PRISM</small></div>'+
   '<div class="gp-odds-instructions">24個のトライアングルを完成させよう！</div>'+
   [3,2,1,0].map(t=>'<div class="gp-odds-row gp-tier-'+t+'"><i>✦</i><b>'+['C','B','A','S'][t]+' RANK</b><strong>'+([32,42,62,95][t]/100).toFixed(2)+'×</strong></div>').join('')+
   '<div class="gp-odds-sugar"><span>✧</span><b>WONDER SUGAR</b><small>特別な三角形でGET!</small></div>'+
   '<div class="gp-odds-bonus"><b>24 / 24</b><strong>+35.0×</strong><small>RAINBOW GELATO BONUS</small></div>';
 $('odds-panel')?.append(gpOdds);
 const gpSign=document.createElement('div');gpSign.className='gp-bonus-sign';
 gpSign.innerHTML='<span>✦ RAINBOW GELATO ✦</span><b>24 FILL BONUS</b>';
 document.querySelector('.festival-top')?.append(gpSign);
 const mini=document.createElement('div');mini.className='gp-mini';mini.innerHTML=boardSVG('gp-tab');
 slot.tab.querySelector('.mini-wrap').append(mini);
 function updateDraw(root,e){
   const svg=root.querySelector('.gp-board-svg');if(!svg)return;
   for(const el of svg.querySelectorAll('[data-node]')){
     const i=+el.dataset.node,v=e.nodeNumbers[i],label=el.querySelector('.gp-digit');
     if(label&&label.textContent!==String(v))label.textContent=String(v);
     el.classList.toggle('is-hit',e.hits.has(i));
     el.classList.toggle('is-pending',e.pendingDraws.has(v));
   }
   for(const el of svg.querySelectorAll('[data-edge]'))el.classList.toggle('is-lit',e.links.has(+el.dataset.edge));
   for(const el of svg.querySelectorAll('[data-face]')){
     const id=+el.dataset.face;
     el.classList.toggle('is-filled',e.filled.has(id));
     el.classList.toggle('is-new',e.lastFilled.includes(id));
     el.classList.toggle('is-sugar',id===e.sugarFace&&!e.sugarAwarded);
   }
 }
 const gpFillLabel=scene.querySelector('.gp-fill-count'),
       gpWinLabel=scene.querySelector('.gp-earned'),
       gpSugarLabel=scene.querySelector('.gp-sugar-state');
 let lastGeometryKey='';
 function drawGelato(){
   const e=app.engines[0];if(e?.kind!=='gelato')return;
   // Cache DOM changes during the 3D roulette's continuous render loop.
   // Repaint node/edge/triangle classes only on actual gameplay changes.
   const geometryKey=[e.cycle,e.version,e.phase,e.hits.size,e.links.size,
     e.filled.size,e.lastNode,e.pendingDraws.size,e.sugarAwarded].join('/');
   if(geometryKey!==lastGeometryKey){
     lastGeometryKey=geometryKey;
     updateDraw(scene,e);updateDraw(mini,e);
   }
   const count=e.filled.size+' / 24',win=num(medalWin(app.bet(0),e.totalHundredths))+' WIN',
         sugar=e.sugarAwarded?'GET!':'✦';
   if(gpFillLabel.textContent!==count)gpFillLabel.textContent=count;
   if(gpWinLabel.textContent!==win)gpWinLabel.textContent=win;
   if(gpSugarLabel.textContent!==sugar)gpSugarLabel.textContent=sugar;
   slot.miniCanvas.hidden=true;slot.miniLogo.hidden=true;
 }
 let flashTimer=null;
 function flash(txt){
   const el=scene.querySelector('.gp-flash');el.textContent=txt;el.hidden=false;
   el.classList.remove('gp-flash-in');void el.offsetWidth;el.classList.add('gp-flash-in');
   if(flashTimer)clearTimeout(flashTimer);
   flashTimer=setTimeout(()=>{el.hidden=true},1550);
 }
 function onGelatoEvent(ev,e){
   slot.engine=e;slot.event=ev;slot.dirtyMain=true;slot.dirtyMini=true;
   if(ev.phase==='ready'){slot.reachStatus='inactive';slot.reachEpoch=(slot.reachEpoch||0)+1;slot.reachBoardKey=null;slot.reachResults=[];slot.tabReachResults=[];}
   if(ev.phase==='gelatoFill')flash(ev.full?'RAINBOW GELATO BONUS!!':ev.newFaces.length+' GELATO FILL! +'+num(medalWin(app.bet(0),ev.gain))+' WIN');
   if(ev.phase==='sugaraward')flash('✦ WONDER SUGAR GET!');
   if(['waiting','settled','complete'].includes(ev.phase))requestReach(slot,e,app);
   drawGelato();scheduleUI(app);
 }
 const e=new GelatoEngine(app.random,(ev,engine)=>{
   if(ev.phase==='stepcollect'&&app.phase==='playing'&&app.enabled[0]){
     app.wonderBank.push(...ev.steps.map(t=>({...t,game:0})));
     app.wonderSteps=app.wonderBank.length;app.wonderValue+=ev.steps.reduce((n,t)=>n+t.value,0);
   }
   if(ev.phase==='complete'&&app.phase==='playing'&&!app.paid[0]&&app.enabled[0]){
     app.paid[0]=true;app.roundWins[0]=medalWin(app.locked[0],engine.totalHundredths);
     if(app.enabled.every((yes,i)=>!yes||app.paid[i]))app.finishRound();
   }
   onGelatoEvent(ev,engine);
   if(ev.phase==='complete')recordChanged(app);
 },app.sleep);
 app.engines[0]=e;slot.engine=e;
 e.beforeComplete=async token=>{if(token===e.version)await e.wait(280,token);};
 // Keep the other two original game engines and all common accounting.
 const nativeRender=render;
 render=function(s,ev,engine,...rest){if(engine?.kind==='gelato'){drawGelato();return;}return nativeRender(s,ev,engine,...rest);};
 const nativeMini=miniature;
 miniature=function(s){if(s.engine?.kind==='gelato'){drawGelato();return;}return nativeMini(s);};
 const nativeReach=requestReach;
 requestReach=function(s,engine,a=app){
   if(engine?.kind!=='gelato')return nativeReach(s,engine,a);
   const ctx=reachContext(engine,a);
   if(!ctx||a.bet(0)<=0||engine.processed>=8){s.reachStatus='inactive';s.reachResults=[];s.tabReachResults=[];s.reachBoardKey=null;return;}
   if(s.reachBoardKey===ctx.key)return;
   const epoch=(s.reachEpoch||0)+1;s.reachEpoch=epoch;
   s.reachBoardKey=ctx.key;s.reachStatus='pending';
   const candidates=Array.from({length:25},(_,i)=>i+1).filter(n=>!ctx.used.has(n));
   const results=[];let k=0;
   function chunk(){
     if(s.reachEpoch!==epoch||s.reachBoardKey!==ctx.key)return;
     if(app.paused){setTimeout(chunk,75);return;}
     for(let max=Math.min(k+3,candidates.length);k<max;k++){
       const p=engine.predict(candidates[k]);if(p.gain>0)results.push(p);
     }
     if(k<candidates.length){setTimeout(chunk,10);return;}
     results.sort((a,b)=>a.number-b.number);
     s.reachResults=results;s.tabReachResults=results;s.tabReachBase=engine.totalHundredths;
     s.tabReachVersion=engine.version;s.reachStatus='ready';s.reachAfterBall=engine.processed;
     scheduleUI(app);
   }
   setTimeout(chunk,12);
 };
 const nativeReachBoard=updateReachBoard;
 updateReachBoard=function(s,a){if(s.engine?.kind==='gelato')return;return nativeReachBoard(s,a);};
 const nativeTabs=tabs;
 tabs=function(a){
   if(slot.engine?.kind!=='gelato')return nativeTabs(a);
   const saved=slot.engine;slot.engine=null;
   try{nativeTabs(a);}finally{slot.engine=saved;}
   const bet=a.bet(0),win=medalWin(bet,saved.totalHundredths);
   fitGoldenNumber(slot.tabBet,num(bet),14,76);
   slot.tabWin.parentNode.hidden=win<=0;fitGoldenNumber(slot.tabWin,num(win),17,50);
   slot.tabSugar.hidden=false;slot.tabSugar.classList.toggle('collected',saved.wonderCollected);
   applySugarTier(slot.tabSugar.querySelector('.sugar-gem'),wonderTier(bet));
   slot.sugarGet.hidden=!saved.wonderCollected;slot.tab.classList.toggle('off',bet<=0);
 };
 const nativeHud=hud;
 hud=function(a){
   if(active!==0){document.body.classList.remove('gelato-active');return nativeHud(a);}
   active=1;
   try{nativeHud(a);}finally{active=0;}
   document.body.classList.remove('choco-active','carnival-active');document.body.classList.add('gelato-active');
   put('best','PRISM '+e.filled.size+' / 24 · BONUS '+(BONUS/100)+'×');
   put('ballinfo','あと'+Math.max(0,8-a.draws.length)+'球');
   fitGoldenNumber($('credit'),num(a.displayCredit),17,68);
   fitGoldenNumber($('win'),num(a.totalWin),17,54);
   drawGelato();updateReachUI(a);
 };
 const nativePreview=syncBetPreview;
 syncBetPreview=function(a){
   if(a?.engines[0]?.kind==='gelato'){if(betPreview)stopBetPreview();return;}
   return nativePreview(a);
 };
 const nativeResult=renderRoundResult;
 renderRoundResult=function(a){
   nativeResult(a);
   if(a.engines[0]?.kind!=='gelato')return;
   const row=$('result-games')?.querySelector('.result-game');
   if(!row||row.dataset.gelato)return;
   row.dataset.gelato='yes';
   row.querySelector('.result-game-name').innerHTML='ジェラートプリズム <small>'+num(a.locked[0])+' BET</small>';
   const details=row.querySelector('.result-game-details');
   if(details)details.innerHTML='<span>'+e.filled.size+' / 24 FILL</span><span>'+e.roundCleared+' GELATO GET!</span>';
   // Visually follow the three-tab order without changing app.engine indices.
   const panel=$('result-games'),cards=[...panel.querySelectorAll('.result-game')];
   if(cards.length===3)panel.append(cards[1],cards[2],cards[0]);
 };
 document.body.classList.add('gelato-enabled');
 drawGelato();select(1);scheduleUI(app);
 window.GelatoPrism={
   geometry:{nodes:P.length,edges:EDGES.length,faces:FACES.length},
   get state(){return {filled:e.filled.size,hits:e.hits.size,processed:e.processed,phase:e.phase,bonus:e.allComplete};},
   engine:e,faces:FACES
 };
 console.info('[GelatoPrism] ready: 19 nodes / 24 faces / 8 draws');
}catch(error){console.error('[GelatoPrism] initialization failed',error);}
})();