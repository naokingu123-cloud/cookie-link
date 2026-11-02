/* SWEETS LINK simple teaching demos v68: 4 nodes, 2 triangles, 6 cups.
 * 20 seconds of example graphics. Never change bets/engines/credits/results. */
(()=>{
'use strict';
if(window.RecentGameDemosV68?.installed)return;
const gelatoSlot=slots?.[0],winerySlot=slots?.[1];
const gelatoScene=gelatoSlot?.panel?.querySelector('.gp-scene');
const wineryScene=winerySlot?.panel?.querySelector('.wp-scene');
if(!gelatoScene||!wineryScene)return;
const sheet=document.createElement('link');
sheet.rel='stylesheet';
sheet.href='assets/recent-game-demos-simple-v68.css?v=68';
document.head.appendChild(sheet);
const TOTAL=20000,CHAPTER=5000;
function buildDemo(name,caption){
 const overlay=document.createElement('section');
 overlay.className='rg68-demo';
 overlay.setAttribute('aria-label',name+'の簡単な遊び方デモ');
 overlay.innerHTML='<div class="rg68-card">'+
  '<div class="rg68-heading"><strong>'+name+'</strong><em class="rg68-step">1 / 4</em></div>'+
  '<div class="rg68-board"></div>'+
  '<div class="rg68-instructions">'+caption+'</div>'+
  '<div class="rg68-progress"><i></i></div>'+
  '<small class="rg68-note">簡易盤面によるルール説明（実際の抽選には影響しません）</small>'+
  '</div>';
 return overlay;
}
// Gelato: only TWO triangles and FOUR numbers, not the full 19-node star.
// The rule demonstration is accurate: lit segments must enclose a triangle.
const G=buildDemo('ジェラートプリズム','① 番号にHIT！');
G.classList.add('rg68-gelato-demo');
const dotData=[
 {x:98,y:82,n:7},{x:234,y:82,n:14},
 {x:165,y:222,n:19},{x:302,y:222,n:4}
];
const edgeData=[[0,1],[1,2],[2,0],[1,3],[3,2]];
const faceData=[[0,1,2],[1,2,3]];
const polygon=ids=>ids.map(i=>dotData[i].x+','+dotData[i].y).join(' ');
const geom='<svg viewBox="0 0 400 292" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+
 '<defs><linearGradient id="rg68-gel-cream" x1="0" y1="0" x2="1" y2="1">'+
 '<stop stop-color="#fff6a1"/><stop offset=".52" stop-color="#ff91ae"/>'+
 '<stop offset="1" stop-color="#bc59d4"/></linearGradient></defs>'+
 '<g>'+faceData.map((f,i)=>'<polygon class="rg68-triangle" data-face="'+i+
 '" points="'+polygon(f)+'" fill="url(#rg68-gel-cream)"/>').join('')+'</g>'+
 '<g>'+edgeData.map((e,i)=>'<line class="rg68-edge" data-edge="'+i+
 '" x1="'+dotData[e[0]].x+'" y1="'+dotData[e[0]].y+
 '" x2="'+dotData[e[1]].x+'" y2="'+dotData[e[1]].y+'"/>').join('')+'</g>'+
 '<g>'+dotData.map((p,i)=>'<g class="rg68-node" data-node="'+i+'">'+
 '<circle cx="'+p.x+'" cy="'+p.y+'" r="23"/>'+
 '<text x="'+p.x+'" y="'+(p.y+8)+'">'+p.n+'</text>'+
 '<text class="rg68-hit" x="'+p.x+'" y="'+(p.y+48)+'">HIT!</text></g>').join('')+'</g>'+
 '<text class="rg68-win" x="200" y="278">TRIANGLE GET!</text>'+
 '</svg>';
G.querySelector('.rg68-board').innerHTML=geom;
gelatoScene.appendChild(G);
const gNodes=[...G.querySelectorAll('[data-node]')];
const gEdges=[...G.querySelectorAll('[data-edge]')];
const gFaces=[...G.querySelectorAll('[data-face]')];
const gLabel=G.querySelector('.rg68-instructions');
const gWin=G.querySelector('.rg68-win');
const gSteps=['① 番号にHIT！','② HITした2点が線でつながる','③ 3点で囲むと三角形GET！',
 '④ 三角形を増やして配当UP！'];
function drawGelato(ms){
 const step=Math.min(3,Math.floor(ms/CHAPTER));
 const hitCount=step+1;
 gNodes.forEach((el,i)=>el.classList.toggle('on',i<hitCount));
 gEdges.forEach((el,i)=>el.classList.toggle('on',i<(step===0?0:step===1?1:step===2?3:5)));
 gFaces.forEach((el,i)=>el.classList.toggle('on',step>=i+2));
 gWin.classList.toggle('on',step>=2);
 gWin.textContent=step===3?'2 TRIANGLES GET!':'TRIANGLE GET!';
 gLabel.textContent=gSteps[step];
 G.querySelector('.rg68-step').textContent=(step+1)+' / 4';
 G.querySelector('.rg68-progress i').style.width=(100*ms/TOTAL).toFixed(1)+'%';
}
// Winery: a tiny 1→2→3 cup demonstrator, NOT a screenshot of the real 21 cups.
const W=buildDemo('ワイナリーピラミッド','① HITしたグラスにジュースを注ぐ');
W.classList.add('rg68-winery-demo');
const cups=[
 {x:200,y:54,n:7},{x:142,y:138,n:11},{x:258,y:138,n:18},
 {x:88,y:224,n:3},{x:200,y:224,n:9},{x:312,y:224,n:21}
];
const wdefs='<defs><linearGradient id="rg68-juice-grad" x1="0" x2=".95" y1="0" y2=".8">'+
 '<stop stop-color="#fff6bd"/><stop offset=".15" stop-color="#ffad91"/>'+
 '<stop offset=".54" stop-color="#f263a1"/><stop offset="1" stop-color="#bd4697"/></linearGradient>'+
 cups.map((_,i)=>'<clipPath id="rg68-cup-clip-'+i+'"><path d="M-27 -20 C-27 5 -17 19 0 26 C17 19 27 5 27 -20 Z"/></clipPath>').join('')+
 '</defs>';
const mkCup=(p,i)=>'<g class="rg68-cup" transform="translate('+p.x+' '+p.y+')">'+
 '<path class="rg68-glass-stem" d="M0 24V42"/>'+
 '<ellipse class="rg68-glass-base" cx="0" cy="43" rx="24" ry="4"/>'+
 '<path class="rg68-glass-shape" d="M-27 -20 C-27 5 -17 19 0 26 C17 19 27 5 27 -20 Z"/>'+
 '<g clip-path="url(#rg68-cup-clip-'+i+')">'+
 '<rect class="rg68-liquid" data-liquid="'+i+'" x="-27" y="26" width="54" height="0"/>'+
 '<path class="rg68-surface" data-surface="'+i+'" d="M-22 26H22" opacity="0"/>'+
 '</g><ellipse class="rg68-glass-rim" cx="0" cy="-20" rx="27" ry="5"/>'+
 '<text class="rg68-glass-number" x="0" y="59">'+p.n+'</text></g>';
const flowData=[
 'M200 6 Q213 15 200 33',
 'M193 81 Q177 103 142 118',
 'M207 81 Q229 103 258 118',
 'M136 163 Q115 190 88 204',
 'M150 163 Q163 189 200 204',
 'M265 163 Q279 187 312 204'
];
const wsvg='<svg viewBox="0 0 400 294" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+
 wdefs+
 '<g>'+flowData.map((d,i)=>'<path class="rg68-flow" data-flow="'+i+'" d="'+d+'"/>').join('')+'</g>'+
 '<g>'+cups.map(mkCup).join('')+'</g>'+
 '<g class="rg68-boost"><circle cx="349" cy="53" r="40" fill="#fff1af" stroke="#ffb27a" stroke-width="5"/>'+
 '<text x="349" y="47">★ HIT!</text><text x="349" y="68">次×2</text></g>'+
 '<g class="rg68-payhint"><rect x="130" y="14" width="139" height="37" rx="11" fill="#fff4be" stroke="#e49e7f" stroke-width="4"/>'+
 '<text x="199" y="39">10杯でWIN</text></g>'+
 '</svg>';
W.querySelector('.rg68-board').innerHTML=wsvg;
wineryScene.appendChild(W);
const wLiquids=[...W.querySelectorAll('[data-liquid]')];
const wSurfaces=[...W.querySelectorAll('[data-surface]')];
const wFlows=[...W.querySelectorAll('[data-flow]')];
const wBoost=W.querySelector('.rg68-boost');
const wPay=W.querySelector('.rg68-payhint');
const wLabel=W.querySelector('.rg68-instructions');
const wSteps=['① HITしたグラスに1杯注ぐ','② 満タンなら下の2杯に分配',
 '③ 特別番号HITで次の注入量UP！','④ 本番は満タン10杯以上で配当'];
function drawWinery(ms){
 const phase=Math.min(3,Math.floor(ms/CHAPTER));
 const within=Math.min(1,(ms%CHAPTER)/4400);
 const f=phase===0?[within,0,0,0,0,0]:
  phase===1?[1,within*.9,within*.9,0,0,0]:
  phase===2?[1,1,1,within*.7,within*.7,within*.7]:
            [1,1,1,1,1,1];
 wLiquids.forEach((el,i)=>{
  const h=46*Math.max(0,Math.min(1,f[i]));
  el.setAttribute('y',(26-h).toFixed(2));
  el.setAttribute('height',h.toFixed(2));
  const line=wSurfaces[i];
  line.setAttribute('opacity',h>.5?'1':'0');
  const wave=Math.sin(ms*.006+i)*1.8;
  const top=26-h;
  line.setAttribute('d','M-23 '+(top+wave).toFixed(2)+
   ' Q-12 '+(top-3+wave).toFixed(2)+' 0 '+(top+wave).toFixed(2)+
   ' T23 '+(top+wave).toFixed(2));
 });
 wFlows.forEach((el,i)=>{
  const on=phase===0?i===0:phase===1?i===1||i===2:
           phase===2?i>=3:false;
  el.classList.toggle('on',on);
 });
 wBoost.classList.toggle('on',phase===2);
 wPay.classList.toggle('on',phase===3);
 wLabel.textContent=wSteps[phase];
 W.querySelector('.rg68-step').textContent=(phase+1)+' / 4';
 W.querySelector('.rg68-progress i').style.width=(100*ms/TOTAL).toFixed(1)+'%';
}
// Each game receives one 20s demo per ready cycle; pause when the game is
// deselected/menu open; never change engine or credit state.
const track=[{cycle:null,start:0,last:0,elapsed:0,finished:false},
             {cycle:null,start:0,last:0,elapsed:0,finished:false}];
function update(i,now){
 const s=i===0?gelatoSlot:winerySlot;
 const layer=i===0?G:W;
 const isSelected=i===0?document.body.classList.contains('gelato-active'):
                          document.body.classList.contains('winery-active');
 const menu=document.getElementById('record-menu-layer');
 const enabled=app.phase==='ready'&&!app.paused&&!s.engine?.running&&
   isSelected&&!document.hidden&&(!menu||menu.hidden);
 const state=track[i],cycle=s.engine?.cycle;
 if(cycle!==state.cycle){
  state.cycle=cycle;state.elapsed=0;state.last=now;state.finished=false;
 }
 if(!enabled){
  layer.classList.remove('rg68-show');
  state.last=now;
  return;
 }
 state.elapsed=Math.min(TOTAL,state.elapsed+Math.min(150,Math.max(0,now-state.last)));
 state.last=now;
 if(state.finished||state.elapsed>=TOTAL){
  state.finished=true;layer.classList.remove('rg68-show');
  return;
 }
 layer.classList.add('rg68-show');
 if(i===0)drawGelato(state.elapsed);else drawWinery(state.elapsed);
}
function tick(){
 const now=performance.now();
 update(0,now);update(1,now);
}
const timer=setInterval(tick,90);
tick();
window.RecentGameDemosV68={
 installed:true,version:68,duration:TOTAL,
 stop(){clearInterval(timer);G.remove();W.remove();},
 get status(){return {gelato:G.classList.contains('rg68-show'),
  winery:W.classList.contains('rg68-show'),gelatoPoints:4,gelatoTriangles:2,wineryCups:6};}
};
})();
