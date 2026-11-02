/* SWEETS LINK simple teaching demos v69: 4 nodes, 2 triangles, 6 cups.
 * 20 seconds of example graphics. Never change bets/engines/credits/results. */
(()=>{
'use strict';
if(window.RecentGameDemosV69?.installed)return;
const gelatoSlot=slots?.[0],winerySlot=slots?.[1];
const gelatoScene=gelatoSlot?.panel?.querySelector('.gp-scene');
const wineryScene=winerySlot?.panel?.querySelector('.wp-scene');
if(!gelatoScene||!wineryScene)return;
const sheet=document.createElement('link');
sheet.rel='stylesheet';
sheet.href='assets/recent-game-demos-simple-v69.css?v=68';
document.head.appendChild(sheet);
const TOTAL=20000,CHAPTER=4000;
function buildDemo(name,caption){
 const overlay=document.createElement('section');
 overlay.className='rg69-demo';
 overlay.setAttribute('aria-label',name+'の簡単な遊び方デモ');
 overlay.innerHTML='<div class="rg69-card">'+
  '<div class="rg69-heading"><strong>'+name+'</strong><em class="rg69-step">1 / 4</em></div>'+
  '<div class="rg69-board"></div>'+
  '<div class="rg69-instructions">'+caption+'</div>'+
  '<div class="rg69-progress"><i></i></div>'+
  '<small class="rg69-note">簡易盤面によるルール説明（実際の抽選には影響しません）</small>'+
  '</div>';
 return overlay;
}
// Gelato: only TWO triangles and FOUR numbers, not the full 19-node star.
// The rule demonstration is accurate: lit segments must enclose a triangle.
const G=buildDemo('ジェラートプリズム','① 番号にHIT！');
G.classList.add('rg69-gelato-demo');
// A compact seven-socket miniature of the real 19-node / 24-face hexagram.
const dotData=[
 {x:200,y:34,n:7},{x:110,y:91,n:12},{x:290,y:91,n:18},
 {x:200,y:151,n:3},{x:110,y:212,n:9},{x:290,y:212,n:14},
 {x:200,y:267,n:21}
];
const edgeData=[[0,1],[0,2],[1,2],[1,3],[2,3],[3,4],[3,5],[4,5],[4,6],[5,6]];
const faceData=[[0,1,2],[1,2,3],[3,4,5],[4,5,6]];
const polygon=ids=>ids.map(i=>dotData[i].x+','+dotData[i].y).join(' ');
const geom='<svg viewBox="0 0 400 305" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+
 '<defs><linearGradient id="rg69-gel-cream" x1="0" y1="0" x2="1" y2="1">'+
 '<stop stop-color="#fff6a1"/><stop offset=".52" stop-color="#ff91ae"/>'+
 '<stop offset="1" stop-color="#bc59d4"/></linearGradient></defs>'+
 '<g>'+faceData.map((f,i)=>'<polygon class="rg69-triangle" data-face="'+i+
 '" points="'+polygon(f)+'" fill="url(#rg69-gel-cream)"/>').join('')+'</g>'+
 '<g>'+edgeData.map((e,i)=>'<line class="rg69-edge" data-edge="'+i+
 '" x1="'+dotData[e[0]].x+'" y1="'+dotData[e[0]].y+
 '" x2="'+dotData[e[1]].x+'" y2="'+dotData[e[1]].y+'"/>').join('')+'</g>'+
 '<g>'+dotData.map((p,i)=>'<g class="rg69-node" data-node="'+i+'">'+
 '<circle cx="'+p.x+'" cy="'+p.y+'" r="23"/>'+
 '<text x="'+p.x+'" y="'+(p.y+8)+'">'+p.n+'</text>'+
 '<text class="rg69-hit" x="'+p.x+'" y="'+(p.y+48)+'">HIT!</text></g>').join('')+'</g>'+
 '<text class="rg69-win" x="200" y="291">TRIANGLE GET!</text>'+
 '</svg>';
G.querySelector('.rg69-board').innerHTML=geom;
gelatoScene.appendChild(G);
const gNodes=[...G.querySelectorAll('[data-node]')];
const gEdges=[...G.querySelectorAll('[data-edge]')];
const gFaces=[...G.querySelectorAll('[data-face]')];
const gLabel=G.querySelector('.rg69-instructions');
const gWin=G.querySelector('.rg69-win');
const gSteps=[
 '① 番号HITで交点が光る',
 '② HITした2点が線でつながる',
 '③ 囲まれた三角形をGET!',
 '④ 三角形がどんどん増える',
 '⑤ 多くの三角形で配当UP!'
];
const stages=[
 {nodes:[1],edges:[],faces:[]},
 {nodes:[1,2],edges:[2],faces:[]},
 {nodes:[1,2,3],edges:[2,3,4],faces:[1]},
 {nodes:[1,2,3,4,5],edges:[2,3,4,5,6,7],faces:[1,2]},
 {nodes:[0,1,2,3,4,5,6],edges:[0,1,2,3,4,5,6,7,8,9],faces:[0,1,2,3]}
];
function drawGelato(ms){
 const step=Math.min(4,Math.floor(ms/CHAPTER));
 const state=stages[step];
 gNodes.forEach((el,i)=>el.classList.toggle('on',state.nodes.includes(i)));
 gEdges.forEach((el,i)=>el.classList.toggle('on',state.edges.includes(i)));
 gFaces.forEach((el,i)=>el.classList.toggle('on',state.faces.includes(i)));
 gWin.classList.toggle('on',step>=2);
 gWin.textContent=step===4?'4 TRIANGLES GET!':'TRIANGLE GET!';
 gLabel.textContent=gSteps[step];
 G.querySelector('.rg69-step').textContent=(step+1)+' / 5';
 G.querySelector('.rg69-progress i').style.width=(100*ms/TOTAL).toFixed(1)+'%';
}
// Winery: a tiny 1→2→3 cup demonstrator, NOT a screenshot of the real 21 cups.
const W=buildDemo('ワイナリーピラミッド','① HITしたグラスにジュースを注ぐ');
W.classList.add('rg69-winery-demo');
const cups=[
 {x:200,y:54,n:7},{x:142,y:138,n:11},{x:258,y:138,n:18},
 {x:88,y:224,n:3},{x:200,y:224,n:9},{x:312,y:224,n:21}
];
// Reuse the same transparent crystal-coupe silhouette as the actual stage:
 // strawberry-red, orange and mixed juices are distinct and converge visibly.
const wdefs='<defs>'+
 '<linearGradient id="rg69-juice-grad" x1="0" x2=".95" y1="0" y2=".8">'+
 '<stop stop-color="#fff5c8"/><stop offset=".14" stop-color="#ffbd92"/>'+
 '<stop offset=".57" stop-color="#f45d9a"/><stop offset="1" stop-color="#bd4697"/></linearGradient>'+
 '<linearGradient id="rg69-juice-orange" x1="0" x2=".95" y1="0" y2=".8">'+
 '<stop stop-color="#fffdd0"/><stop offset=".20" stop-color="#ffdc72"/>'+
 '<stop offset=".60" stop-color="#ff9658"/><stop offset="1" stop-color="#f56767"/></linearGradient>'+
 '<linearGradient id="rg69-juice-mix" x1="0" x2=".95" y1="0" y2=".8">'+
 '<stop stop-color="#fff9d6"/><stop offset=".18" stop-color="#ffcd87"/>'+
 '<stop offset=".48" stop-color="#fa739f"/><stop offset="1" stop-color="#ba56ca"/></linearGradient>'+
 cups.map((_,i)=>'<clipPath id="rg69-cup-clip-'+i+'"><path d="M-27 -20 C-27 5 -17 19 0 26 C17 19 27 5 27 -20 Z"/></clipPath>').join('')+
 '</defs>';
const mkCup=(p,i)=>'<g class="rg69-cup" transform="translate('+p.x+' '+p.y+')">'+
 '<path class="rg69-glass-stem" d="M0 24V42"/>'+
 '<ellipse class="rg69-glass-base" cx="0" cy="43" rx="24" ry="4"/>'+
 '<path class="rg69-glass-shape" d="M-27 -20 C-27 5 -17 19 0 26 C17 19 27 5 27 -20 Z"/>'+
 '<g clip-path="url(#rg69-cup-clip-'+i+')">'+
 '<rect class="rg69-liquid" data-liquid="'+i+'" x="-27" y="26" width="54" height="0"/>'+
 '<path class="rg69-surface" data-surface="'+i+'" d="M-22 26H22" opacity="0"/>'+
 '</g><ellipse class="rg69-glass-rim" cx="0" cy="-20" rx="27" ry="5"/>'+
 '<text class="rg69-glass-number" x="0" y="59">'+p.n+'</text></g>';
const flowData=[
 'M200 6 Q213 15 200 33',
 'M193 81 Q177 103 142 118',
 'M207 81 Q229 103 258 118',
 'M142 162 Q167 191 200 204',
 'M258 162 Q233 191 200 204',
 'M265 163 Q283 192 312 204'
];
const wsvg='<svg viewBox="0 0 400 294" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+
 wdefs+
 '<g>'+flowData.map((d,i)=>'<path class="rg69-flow" data-flow="'+i+'" d="'+d+'"/>').join('')+'</g>'+
 '<g aria-hidden="true" class="rg69-stand">'+
 '<path class="rg69-stand-ornament" d="M133 103 Q200 113 267 103 M74 190 Q200 203 326 190 M42 281 Q200 301 358 281"/>'+
 '<circle cx="200" cy="111" r="6" fill="#f47d9d" stroke="#ffe4b1" stroke-width="3"/>'+
 '<circle cx="200" cy="199" r="6" fill="#f47d9d" stroke="#ffe4b1" stroke-width="3"/></g>'+
 '<g>'+cups.map(mkCup).join('')+'</g>'+
 '<g class="rg69-mixhint"><rect x="280" y="34" width="112" height="54" rx="13" fill="#fff1c5" stroke="#f9b473" stroke-width="4"/>'+
 '<text x="336" y="55">MIX JUICE</text><text x="336" y="75">×1.5 倍</text></g>'+
 '<g class="rg69-boost"><circle cx="349" cy="53" r="40" fill="#fff1af" stroke="#ffb27a" stroke-width="5"/>'+
 '<text x="349" y="47">★ HIT!</text><text x="349" y="68">次×2</text></g>'+
 '<g class="rg69-payhint"><rect x="130" y="14" width="139" height="37" rx="11" fill="#fff4be" stroke="#e49e7f" stroke-width="4"/>'+
 '<text x="199" y="39">10杯でWIN</text></g>'+
 '</svg>';
W.querySelector('.rg69-board').innerHTML=wsvg;
wineryScene.appendChild(W);
const wLiquids=[...W.querySelectorAll('[data-liquid]')];
const wSurfaces=[...W.querySelectorAll('[data-surface]')];
const wFlows=[...W.querySelectorAll('[data-flow]')];
const wMix=W.querySelector('.rg69-mixhint');
const wBoost=W.querySelector('.rg69-boost');
const wPay=W.querySelector('.rg69-payhint');
const wLabel=W.querySelector('.rg69-instructions');
const wSteps=[
 '① 番号HITでジュースを注ぐ',
 '② 満タンなら下の2杯へ分配',
 '③ 違う味が合流するとMIX JUICE!',
 '④ 特別番号HITで次の注入量UP!',
 '⑤ 本番は満タン10杯以上で配当'
];
function drawWinery(ms){
 const phase=Math.min(4,Math.floor(ms/CHAPTER));
 const within=Math.min(1,(ms%CHAPTER)/3650);
 const f=phase===0?[within,0,0,0,0,0]:
   phase===1?[1,within*.9,within*.9,0,0,0]:
   phase===2?[1,1,1,0,within,0]:
   phase===3?[1,1,1,0,1,within]:
              [1,1,1,.90,1,1];
 wLiquids.forEach((el,i)=>{
  const h=46*Math.max(0,Math.min(1,f[i]));
  el.setAttribute('y',(26-h).toFixed(2));
  el.setAttribute('height',h.toFixed(2));
  const flavor=i===1?'orange':(i===4||i===5)?'mix':'berry';
  const grad=flavor==='orange'?'rg69-juice-orange':
             flavor==='mix'?'rg69-juice-mix':'rg69-juice-grad';
  el.setAttribute('fill','url(#'+grad+')');
  el.setAttribute('data-flavor',flavor);
  const line=wSurfaces[i];
  line.setAttribute('opacity',h>.5?'1':'0');
  const wave=Math.sin(ms*.006+i)*1.8,top=26-h;
  line.setAttribute('d','M-23 '+(top+wave).toFixed(2)+
    ' Q-12 '+(top-3+wave).toFixed(2)+' 0 '+(top+wave).toFixed(2)+
    ' T23 '+(top+wave).toFixed(2));
 });
 wFlows.forEach((el,i)=>{
  const active=phase===0?i===0:
               phase===1?(i===1||i===2):
               phase===2?(i===3||i===4):
               phase===3?i===5:false;
  el.classList.toggle('on',active);
 });
 wMix.classList.toggle('on',phase===2);
 wBoost.classList.toggle('on',phase===3);
 wPay.classList.toggle('on',phase===4);
 wLabel.textContent=wSteps[phase];
 W.querySelector('.rg69-step').textContent=(phase+1)+' / 5';
 W.querySelector('.rg69-progress i').style.width=(100*ms/TOTAL).toFixed(1)+'%';
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
  layer.classList.remove('rg69-show');
  state.last=now;
  return;
 }
 state.elapsed=Math.min(TOTAL,state.elapsed+Math.min(150,Math.max(0,now-state.last)));
 state.last=now;
 if(state.finished||state.elapsed>=TOTAL){
  state.finished=true;layer.classList.remove('rg69-show');
  return;
 }
 layer.classList.add('rg69-show');
 if(i===0)drawGelato(state.elapsed);else drawWinery(state.elapsed);
}
function tick(){
 const now=performance.now();
 update(0,now);update(1,now);
}
const timer=setInterval(tick,90);
tick();
window.RecentGameDemosV69={
 installed:true,version:69,duration:TOTAL,
 stop(){clearInterval(timer);G.remove();W.remove();},
 get status(){return {gelato:G.classList.contains('rg69-show'),
  winery:W.classList.contains('rg69-show'),gelatoPoints:7,gelatoTriangles:4,wineryCups:6};}
};
})();
