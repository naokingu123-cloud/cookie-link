/* Six Drop glass-jar presentation and simplified award panel.
 * Presentation-only: scores, numbers, rounds, sugar and physics stay unchanged.
 * Loaded in the same IIFE as the existing game code.
 */
(()=>{
'use strict';
try{
 const card=slots[2];
 if(!card||!app||typeof carnivalHud!=='function'||typeof sixArtBackdrop!=='function')throw Error('Six Drop is not initialized');
 // The previous candy-filled backdrop is intentionally removed from INSIDE the tray.
 // The playfield is almost clear glass; its colorful enclosure is a separate CSS overlay.
 // Keep every staggered candy INSIDE the bottle's open glass window.
 // The old 35px spacing put outer candies underneath the 39px decorative rails.
 // This is visual geometry only: grid cells, awards and reach logic stay intact.
 sixLayout=function(rows=SIX_ROWS){
  const step=28,top=164-(rows-1)*step*SIX_SQRT3_2/2;
  return {step,top,radius:step*.5};
 };
 const clearPlateCache=new Map();
 sixArtBackdrop=function(rows){
  const key=rows;
  if(clearPlateCache.has(key))return clearPlateCache.get(key);
  const cv=document.createElement('canvas');cv.width=cv.height=320;
  const x=cv.getContext('2d');
  const glaze=x.createLinearGradient(0,0,320,320);
  glaze.addColorStop(0,'rgba(244,214,242,.075)');
  glaze.addColorStop(.45,'rgba(252,255,255,.025)');
  glaze.addColorStop(1,'rgba(173,227,250,.085)');
  x.fillStyle=glaze;x.fillRect(0,0,320,320);
  x.strokeStyle='rgba(255,255,255,.22)';x.lineWidth=3;
  x.beginPath();x.roundRect(5,5,310,310,24);x.stroke();
  clearPlateCache.set(key,cv);return cv;
 };
 // Icons use precisely one pink glass-candy color each.
 // Triangle middle row has no horizontal line.
 // Hexagon is deliberately rotated 30 degrees to match the tray orientation.
 function roleIcon(type){
  const line=[[18,40],[54,40],[90,40],[126,40]];
  const tri=[[72,9],[49,38],[95,38],[26,69],[72,69],[118,69]];
  const hex=Array.from({length:6},(_,i)=>{const a=-Math.PI/2+i*Math.PI/3;return [72+37*Math.cos(a),42+34*Math.sin(a)];});
  const gems=type==='line'?line:type==='triangle'?tri:hex;
  const links=type==='line'?'<path d="M18 40H126"/>':
       type==='triangle'?'<path d="M72 9L26 69H118Z"/>':
       '<path d="'+hex.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(2)).join(' ')).join('')+'Z"/>';
  const bulbs=gems.map(([x,y])=>'<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="'+(type==='line'?13:12)+'" fill="url(#glass-pink-'+type+')" stroke="#ffda72" stroke-width="4"/><ellipse cx="'+(x-3).toFixed(2)+'" cy="'+(y-4).toFixed(2)+'" rx="4" ry="2.5" fill="#fff" opacity=".68"/>').join('');
  const group=type==='hexagon'?'<g transform="rotate(30 72 42)">'+links+bulbs+'</g>':links+bulbs;
  return '<svg class="six-glass-role-icon" viewBox="0 0 144 84" role="img" aria-label="'+({line:'同色4個以上の直線',triangle:'同色6個の3段トライアングル・2段目横線なし',hexagon:'30度回転の同色6個ヘキサゴン'}[type])+'"><defs><radialGradient id="glass-pink-'+type+'" cx=".32" cy=".2" r=".86"><stop stop-color="#fffaf7"/><stop offset=".18" stop-color="#ffcce9"/><stop offset=".62" stop-color="#fa59af"/><stop offset="1" stop-color="#a72a9c"/></radialGradient></defs><g stroke="#ffc862" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">'+group+'</g></svg>';
 }
 const labels={line:'直線（同色4個以上）',triangle:'トライアングル（同色6個）',hexagon:'ヘキサゴン（同色6個）'};
 const kind=['line','triangle','hexagon'];
 function install(){
  setupCarnivalSlot(card);
  const root=card.sixOdds;
  if(!root)return null;
  let panel=root.querySelector('.six-glass-ui');
  if(panel)return panel;
  panel=document.createElement('div');
  panel.className='six-glass-ui';panel.setAttribute('aria-label','シックスドロップの役別配当とTOTAL WIN');
  panel.innerHTML='<div class="six-glass-roles">'+kind.map(type=>
   '<section class="six-glass-role" data-simple-role="'+type+'">'+roleIcon(type)+
   '<span class="six-glass-role-label">'+labels[type]+'</span>'+
   '<span class="six-glass-formula"><b class="six-glass-unit">0 WIN</b><span class="six-glass-times">×</span><b class="six-glass-count">0</b></span></section>'
  ).join('')+'</div><div class="six-glass-total"><strong>TOTAL WIN</strong><b class="six-glass-value">0</b></div>';
  root.append(panel);
  root.classList.add('six-simple-glass-odds');
  return panel;
 }
 function update(a){
  const e=slots[2]?.engine,panel=install();
  if(!panel||e?.kind!=='candy')return;
  const bet=a.bet(2);
  for(const type of kind){
   const row=panel.querySelector('[data-simple-role="'+type+'"]'),count=e[type==='line'?'lines':type==='triangle'?'triangles':'hexagons']||0;
   const unit=medalWin(bet,SIX_PAY[type]);const node=row.querySelector('.six-glass-unit');
   const unitText=num(unit)+' WIN';if(node.textContent!==unitText)node.textContent=unitText;
   const counter=row.querySelector('.six-glass-count');if(counter.textContent!==String(count))counter.textContent=String(count);
   row.classList.toggle('earned',count>0);
  }
  const total=num(medalWin(bet,e.totalHundredths)),target=panel.querySelector('.six-glass-value');
  if(target.textContent!==total)target.textContent=total;
 }
 // Preserve the existing hidden DOM/reel data structures used by the official HUD.
 // Update the visible glass panel only after the normal score HUD finishes.
 const existingHud=carnivalHud;
 carnivalHud=function(a){existingHud(a);update(a);};
 install();update(app);
 // Change the background immediately even on the idle / BET demonstration screen.
 // The existing top-refill animation begins above the screen at y=-350;
 // the generated bottle lid (drawn as a foreground layer) hides the travel
 // until the candy emerges below the lip. Do not skip fall or landing frames.
 const baseCandyDraw=drawCarnival;
 drawCarnival=function(s,now){
  if(s?.candyCanvas){
   const refilling=['pyramidTopUp','pyramidRefill'].includes(s.engine?.fx?.phase);
   s.candyCanvas.parentElement?.classList.toggle('jar-refilling',refilling);
  }
  return baseCandyDraw(s,now);
 };
 card.candyKey='';carnivalQueueFrame(card);scheduleUI(app);
 console.info('[SixDropGlass] jar frame and 3-role transparent award panel ready');
}catch(error){console.error('[SixDropGlass]',error);}
})();