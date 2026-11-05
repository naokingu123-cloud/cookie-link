/* Main-board BET lessons. The game kind owns its lesson, independently of the chosen slot. */
(()=>{
'use strict';
if(window.SweetsDemoSuite?.installed)return;
const field=document.querySelector('#panels')?.closest('.field');
if(!field)return;
const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='assets/demo-suite-v91.css?v=91';document.head.append(stylesheet);
field.classList.add('ds91-field');
const canvas=document.createElement('canvas');canvas.className='ds91-lesson';canvas.hidden=true;
canvas.setAttribute('role','img');field.append(canvas);
const ctx=canvas.getContext('2d'),font='"Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif';
const games={
 cookie:{name:'クッキーリンク',accent:'#ffc87a',ink:'#603444',steps:[
  ['番号にHIT','当たったクッキーが割れる'],['落下と連鎖','同じ色が2枚以上つながると消える'],['ハンマー','消えると離れた同色も割れる'],['最大LINK','つながった枚数で配当アップ']]},
 choco:{name:'チョコレートキャニオン',accent:'#ffcc88',ink:'#603844',steps:[
  ['ドリルHIT','ドリルの向きに地層を掘る'],['ドリルLv','レベルが上がると深く掘れる'],['同色の連鎖','落下後、同色4マス以上で消去'],['鉱石GET','地表に出た鉱石を獲得'],['ボーナス層','100mごとにボーナス層へ']]},
 candy:{name:'シックスドロップ',accent:'#ffb7dc',ink:'#64344b',steps:[
  ['HITと落下','すき間にドロップが落ちる'],['一直線','同じ色を4個以上並べる'],['トライアングル','同色6個で3段の三角形'],['ヘキサゴン','中心を囲む同色6個の輪']]},
 gelato:{name:'ジェラートプリズム',accent:'#91edff',ink:'#343856',steps:[
  ['交点にHIT','抽選された番号が点灯'],['ライン成立','HITした点を盤面の線で結ぶ'],['三角形GET','線で囲んだ小さな三角形を獲得'],['全埋め','本盤は三角形24枚で全埋め']]},
 winery:{name:'ワイナリーピラミッド',accent:'#ffcb9d',ink:'#65364b',steps:[
  ['ジュースを注ぐ','HITした番号のグラスへ注入'],['あふれて分配','余った量を下の2杯へ半分ずつ'],['MIXでODDS UP','異なる色が入ったグラスで倍率UP'],['注入量アップ','特別番号で次から注ぐ量が2倍'],['満タンで配当','本盤は満タン10杯から配当']]},
 popcorn:{name:'ポップコーンスプラッシュ',accent:'#ffe093'},
 jelly:{name:'ジェリービンゴ',accent:'#adf2e1'},
 stick:{name:'ワッフルリバーシ',accent:'#ffd994'},
 castella:{name:'パーティカステラ',accent:'#ffcc81'}
};
const alias={canyon:'choco',chocolate:'choco',six:'candy',sixdrop:'candy',drop:'candy',prism:'gelato',pyramid:'winery'};
function kindOf(s){
 const id=s?.engine?.kind||window.SweetsLineup?.ids?.[s?.i]||'cookie';return games[id]?id:alias[id]||'cookie';
}
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
const art={},images={
 cakes:['cake-white','cake-strawberry','cake-milk','cake-bitter'].map(k=>'assets/canyon-geology/'+k+'.webp'),
 ore:['assets/canyon-geology/ore-diamond.webp'],
 prism:['assets/gelato-prism-gelato-v37.png'],glass:['assets/winery-crystal-coupe-v60.png'],
 popcorn:['assets/popcorn-art/popcorn-normal.webp'],jelly:['assets/jelly-emblem.svg'],stick:['assets/waffle-reversi-logo.webp'],castella:[SweetsLineup.catalog.castella.logo]
};
for(const [key,urls] of Object.entries(images))art[key]=urls.map(src=>{const im=new Image();im.decoding='async';im.src=src;return im;});
const loaded=im=>im&&(im.naturalWidth||im.width)>0&&im.complete!==false;
function rect(c,x,y,w,h,r,fill,stroke,lw=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke();}}
function dot(c,x,y,r,fill,stroke,lw=1){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function text(c,s,x,y,size,color,max,align='center'){
 c.save();c.translate(x,y);c.font='900 '+size+'px '+font;c.textAlign=align;c.textBaseline='middle';const w=c.measureText(s).width;
 if(w>max)c.scale(max/w,1);c.fillStyle=color;c.fillText(s,0,0);c.restore();
}
function line(c,points,color,w){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.stroke();}
function picture(c,im,x,y,size){if(!loaded(im))return false;const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,k=size/Math.max(w,h);c.drawImage(im,x-w*k/2,y-h*k/2,w*k,h*k);return true;}
const shades=['#f7db98','#ef779a','#bc784c','#774c46'];
function cookie(c,color,x,y,size,hammer=false){
 const sprite=typeof cookieSprites!=='undefined'&&cookieSprites[color*2+Number(hammer)];
 if(!picture(c,sprite,x,y,size)&&typeof betCookie==='function')betCookie(c,color,x,y,size,hammer);
}
function cake(c,k,x,y,size){if(!picture(c,art.cakes[k],x,y,size))rect(c,x-size/2,y-size/2,size,size,3,shades[k],'#c99e80');}
function candy(c,k,x,y,size){
 const im=typeof sixCandySprite==='function'?sixCandySprite(k,1,false):null;
 if(!picture(c,im,x,y,size))dot(c,x,y,size*.42,['#fc8cb8','#72d9ee','#eac554','#b19af2'][k%4],'#fee9f2',2);
}
function emblem(c,kind,x,y,size){
 if(kind==='cookie')cookie(c,1,x,y,size);
 else if(kind==='choco')picture(c,art.ore[0],x,y,size);
 else if(kind==='candy')candy(c,0,x,y,size);
 else if(kind==='gelato')picture(c,art.prism[0],x,y,size*1.18);
 else if(kind==='winery')picture(c,art.glass[0],x,y,size);
 else picture(c,art[kind][0],x,y,size);
}
function tag(c,s,x,y,max=130,accent='#ffe69b'){const w=Math.min(max,Math.max(42,s.length*13+22));rect(c,x-w/2,y-11,w,22,7,'#6b3349',accent,1.4);text(c,s,x,y,15,accent,w-6);}
function burst(c,x,y,p){if(p<=0||p>=1)return;c.save();c.globalAlpha=1-p;for(let i=0;i<6;i++){const a=i*Math.PI/3,d=6+19*p;dot(c,x+Math.cos(a)*d,y+Math.sin(a)*d,2.3,'#ffe5a8');}c.restore();}
function cookieDiagram(c,stage,t){
 const palette=[0,2,1,0,2,1,2,1,1,1,0,3],q=ease((t-.43)/.28);
 const cells=stage===0?[5]:stage===1?[8,9,5]:stage===2?[3,6,11]:[0,1,4,5,8,9];
 for(let row=0;row<3;row++)for(let col=0;col<4;col++)rect(c,17+col*55,28+row*53,50,48,8,'#512e35','#83564b',1.4);
 for(let i=0;i<12;i++){
  const r=Math.floor(i/4),col=i%4,x=42+col*55,y=52+r*53;
  const targeted=cells.includes(i),remote=stage===2&&i!==6,fade=stage===3?0:targeted?ease((t-(remote?.61:.42))/.22):0;
  const k=stage===2&&targeted?3:stage===3?(targeted?1:palette[i]===1?2:palette[i]):palette[i];
  const gaps=stage===1&&!targeted?cells.filter(j=>j%4===col&&j>i).length:0,dy=53*gaps*ease((t-.65)/.28);
  c.save();c.globalAlpha*=1-fade;if(!targeted&&stage===3)c.globalAlpha*=.5;
  const size=46*(1+.08*Math.sin(Math.PI*q));cookie(c,k,x,y+dy,size,stage===2&&i===6);
  if(targeted&&stage!==3&&t<.47)rect(c,x-22,y-22,44,44,7,null,'#ffec94',2.3);
  if(stage===0&&i===5)text(c,'7',x,y+1,22,'#4c253a',35);
  if(stage===3&&targeted&&t>.25)rect(c,x-22,y-22,44,44,7,null,'#ffe08b',2);
  c.restore();if(targeted&&stage!==3)burst(c,x,y,fade);
 }
 if(stage===2&&t>.42&&t<.76){const a=ease((t-.42)/.2);for(const y of [52,158])line(c,[[152,105],[152+(207-152)*a,105+(y-105)*a]],'#ffc1d0',3);}
 tag(c,['7 HIT','落下・連鎖','同色消去',t<.25?'同色をつなぐ':'6 LINK'][stage],124,204);
}
function drill(c,x,y){rect(c,x-11,y-28,22,17,4,'#ffce77','#813e35',2);c.beginPath();c.moveTo(x-9,y-11);c.lineTo(x+9,y-11);c.lineTo(x,y+9);c.closePath();c.fillStyle='#d9e8e9';c.fill();line(c,[[x-6,y-8],[x+5,y-5],[x-2,y-1]],'#797784',2);}
function canyonDiagram(c,stage,t){
 const colors=[2,0,3,1,0,3,1,0,3,1,1,0,3,2,3,2],q=ease((t-.27)/.42),x0=42,y0=63,cell=44;
 const cluster=[6,9,10,14];
 for(let i=0;i<16;i++){
  const r=Math.floor(i/4),j=i%4,x=x0+j*cell,y=y0+r*cell;
  const killed=stage===2?cluster.includes(i)&&t>.58:stage===3?i===1&&t>.34:stage===4?false:j===1&&r<(stage===1?2:1)&&q>(r+.35)/(stage===1?2:1);
  if(killed){burst(c,x,y,ease((t-(stage===2?.58:.36))/.25));continue;}
  if(stage===3&&i===5){picture(c,art.ore[0],x,y-(t>.56?31*ease((t-.56)/.3):0),39);continue;}
  const group=stage===2&&cluster.includes(i);
  cake(c,group?1:colors[i],x,y-(group&&i===6?22*(1-ease(t/.42)):0),42);
  if(group&&t>.43&&t<.58)rect(c,x-19,y-19,38,38,6,null,'#fff3af',3);
 }
 if(stage<2)drill(c,x0+cell,40+q*(stage===1?72:34));
 if(stage===3&&t>.55)tag(c,'鉱石 GET',163,47,100);
 if(stage===4)tag(c,'100m',114,86,95);
 tag(c,['ドリルHIT','Lv2・2層','4マスで消去','鉱石を露出','ボーナス層'][stage],110,224,140);
}
function sixDiagram(c,stage,t){
 const pos=[],colors=[0,1,2,3];for(let r=0;r<3;r++)for(let j=0;j<(r===1?4:5);j++)pos.push([19+(r===1?.5:0)*43+j*43,66+r*38]);
 const sets=[[6],[0,1,2,3],[2,6,7,10,11,12],[1,2,5,7,10,11]];
 const group=sets[stage];const vanish=ease((t-.68)/.24);
 for(let i=0;i<pos.length;i++){
  let [x,y]=pos[i],selected=group.includes(i),color=selected?stage%4:colors[(i+Math.floor(i/5))%4];
  if(!stage&&i===1){const u=ease((t-.46)/.45);x+=u*21.5;y+=u*38;}
  const fade=stage?(selected?vanish:0):(i===6?ease((t-.22)/.22):0);
  c.save();c.globalAlpha=1-fade;candy(c,color,x,y,40);
  if(!stage&&i===6)text(c,'12',x,y,17,'#482f55',31);
  if(stage&&selected&&t>.28)dot(c,x,y,18.7,null,'#ffef9e',2.4);c.restore();
  if(fade)burst(c,x,y,fade);
 }
 if(stage&&t>.26&&t<.7){
  const outline=stage===1?[0,3]:stage===2?[2,10,12,2]:[1,2,7,11,10,5,1];
  line(c,outline.map(i=>pos[i]),'rgba(255,244,178,.9)',3.1);
 }
 tag(c,['12 HIT','4個以上','3段・6個','6個の輪'][stage],105,193,130);
}
const prismPoints=[[22,116],[83,42],[100,147],[170,71]],prismLines=[[0,1],[0,2],[1,2],[1,3],[2,3]];
function gelatoDiagram(c,stage,t){
 const hitCount=stage===0?1:stage===1?2:stage===2?3:4;
 const present=new Set(Array.from({length:hitCount-1+(t>.28?1:0)},(_,i)=>i));
 for(const tri of [[0,1,2],[1,2,3]]){
  if(!tri.every(i=>present.has(i)))continue;c.beginPath();tri.forEach((i,j)=>j?c.lineTo(...prismPoints[i]):c.moveTo(...prismPoints[i]));c.closePath();c.fillStyle='rgba(121,224,242,.63)';c.fill();
 }
 for(const [a,b] of prismLines){const hot=present.has(a)&&present.has(b);line(c,[prismPoints[a],prismPoints[b]],hot?'#f3ffff':'#557c8b',hot?5:2);}
 prismPoints.forEach(([x,y],i)=>{const on=present.has(i);dot(c,x,y,15,on?'#86dfea':'#3f5b71',on?'#f7ffff':'#70929c',2.5);text(c,['7','12','3','19'][i],x,y,16,on?'#325973':'#e3edf1',26);});
 tag(c,['7 HIT','2点を結ぶ','1枚 GET','2枚 GET'][stage],100,198,136,'#adf0ff');
}
function glass(c,x,y,red,orange){
 c.save();c.translate(x,y);
 c.beginPath();c.moveTo(-23,-22);c.lineTo(23,-22);c.quadraticCurveTo(23,13,0,17);c.quadraticCurveTo(-23,13,-23,-22);c.closePath();
 c.fillStyle='rgba(246,246,255,.11)';c.fill();c.save();c.clip();
 const base=17;const a=39*red,b=39*orange;c.fillStyle='#ee6692';c.fillRect(-25,base-a,50,a);c.fillStyle='#ffaf42';c.fillRect(-25,base-a-b,50,b);c.restore();
 c.strokeStyle='#ffe6aa';c.lineWidth=2.6;c.stroke();line(c,[[0,17],[0,28],[-11,28],[11,28]],'#ffe6aa',2.4);c.restore();
}
function wineryDiagram(c,stage,t){
 const pts=[[110,36],[75,95],[145,95],[40,154],[110,154],[180,154]],q=ease((t-.15)/.65);
 if(stage===4){let i=0;for(let r=0;r<6;r++)for(let j=0;j<=r;j++){c.save();c.translate(110+(j-r/2)*28,23+r*27);c.scale(.52,.43);glass(c,0,0,i<10?1:0,0);c.restore();i++;}tag(c,'10 / 21 杯',110,205,140);return;}
 const red=stage===0?[q,0,0,0,0,0]:stage===1?[1,.5*q,.5*q,0,0,0]:[1,.5,.5,0,0,0];
 const orange=Array(6).fill(0);
 if(stage>=2){const v=stage===2?q:1;orange[1]=Math.min(v,.5);orange[3]=orange[4]=Math.max(0,v-.5)/2;}
 if(t>.13&&t<.82&&stage<3){
  const ink=stage===2?'#ffb440':'#fd729a';const path=(a,b)=>line(c,[a,b],ink,3.7);
  if(stage===0)path([110,0],[110,25]);
  if(stage===1){path([108,44],[75,79]);path([112,44],[145,79]);}
  if(stage===2){path([74,47],[75,78]);if(q>.5){path([72,107],[40,139]);path([79,107],[109,139]);}}
 }
 pts.forEach(([x,y],i)=>glass(c,x,y,red[i],orange[i]));
 tag(c,['1杯注入','半分ずつ','MIX','次は ×2'][stage],110,206,130);
}
const diagrams={cookie:cookieDiagram,choco:canyonDiagram,candy:sixDiagram,gelato:gelatoDiagram,winery:wineryDiagram};
let lastMode='',lastToken=null,lastReady=false,elapsed=0,stamp=0,frame=0,lastPaint=0;
const miniData=new WeakMap();
function staticMini(slot,kind){
 const wrap=slot.tab.querySelector('.mini-wrap');if(!wrap)return;
 let item=miniData.get(wrap);
 if(!item){const layer=document.createElement('span');layer.className='ds91-ready-mark';layer.setAttribute('aria-hidden','true');
   const icon=document.createElement('canvas');icon.width=icon.height=84;const caption=document.createElement('b');caption.textContent='BET受付中';layer.append(icon,caption);wrap.append(layer);
   item={icon,kind:'',done:false};miniData.set(wrap,item);
 }
 if(item.kind!==kind){item.kind=kind;item.done=false;wrap.style.setProperty('--ds-accent',games[kind].accent);}
 if(!item.done){
   const g=item.icon.getContext('2d');g.clearRect(0,0,84,84);emblem(g,kind,42,42,72);
   item.done=!!g.getImageData(0,0,84,84).data.some((v,i)=>i%4===3&&v>0);
 }
}
function draw(kind){
 const game=games[kind],r=field.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(w<3||h<3)return;
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const H=540,W=H*w/h,n=game.steps.length,total=19800,segment=total/n,idx=Math.min(n-1,Math.floor((elapsed%total)/segment)),t=(elapsed%segment)/segment;
 const [name,copy]=game.steps[idx];canvas.dataset.scene=String(idx+1);canvas.dataset.game=kind;
 const aria=game.name+'の遊び方　'+(idx+1)+'／'+n+'　'+name+'。'+copy;if(canvas.getAttribute('aria-label')!==aria)canvas.setAttribute('aria-label',aria);
 ctx.setTransform(h/H,0,0,h/H,0,0);ctx.clearRect(0,0,W,H);
 const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,game.ink);grad.addColorStop(1,'#342738');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 rect(ctx,6,7,W-12,H-14,23,'rgba(60,32,48,.82)','#ffd688',3);
 rect(ctx,16,17,W-32,57,16,'#783740','#e5a773',2);
 text(ctx,game.name+'の遊び方',34,45,25,'#ffedc6',W-174,'left');text(ctx,(idx+1)+' / '+n,W-31,45,23,game.accent,100,'right');
 const left=Math.max(110,W*.31),sx=left*.51,fieldX=left+6,fieldW=W-fieldX-20;
 emblem(ctx,kind,sx,H*.32,Math.min(91,left*.57));text(ctx,name,sx,H*.51,28,game.accent,left-15);
 const dx=kind==='gelato'?202:kind==='candy'?214:kind==='choco'?218:244,dy=kind==='choco'?240:224;
 const sc=Math.min(fieldW/dx,H*.62/dy);
 ctx.save();ctx.translate(fieldX+(fieldW-dx*sc)/2,H*.47-dy*sc/2);ctx.scale(sc,sc);diagrams[kind](ctx,idx,t);ctx.restore();
 for(let j=0;j<n;j++){const bw=33,gap=7,x=W/2-(n*bw+(n-1)*gap)/2+j*(bw+gap);rect(ctx,x,H*.801,bw,6,3,j<idx?game.accent:'#825c6b');if(j===idx)rect(ctx,x,H*.801,Math.max(4,bw*t),6,3,game.accent);}
 rect(ctx,Math.max(20,W*.06),H*.86,Math.min(W-40,W*.88),H*.094,15,'#314f50','#d3d891',1.6);
 text(ctx,copy,W/2,H*.907,20,'#fff1c2',W*.78);
}
function sync(){
 const ready=app.phase==='ready'&&!jpcSession.active,slot=slots[active],kind=kindOf(slot);
 const main=ready&&kind!=='popcorn'&&!!diagrams[kind];
 document.body.classList.toggle('ds91-ready',ready);field.classList.toggle('ds91-has-lesson',main);
 if(ready)for(const s of slots)if(!s.holder.hidden)staticMini(s,kindOf(s));
 if(lastReady!==ready){lastReady=ready;if(!ready)for(const s of slots){s.dirtyMini=true;s.dirtyMain=true;}}
 if(kind!==lastMode||app.token!==lastToken||!ready){lastMode=kind;lastToken=app.token;elapsed=0;stamp=0;lastPaint=0;}
 canvas.hidden=!main;
 if(main&&(!lastPaint||canvas.dataset.game!==kind)){draw(kind);lastPaint=performance.now();}
 if(!main||app.paused||!inView||document.hidden){stamp=0;if(frame)cancelAnimationFrame(frame);frame=0;return;}
 if(!frame)frame=requestAnimationFrame(tick);
}
function tick(now){
 frame=0;
 if(app.phase!=='ready'||jpcSession.active||kindOf(slots[active])!==lastMode||app.paused||!inView||document.hidden){sync();return;}
 if(stamp)elapsed+=Math.max(0,now-stamp);stamp=now;
 if(!lastPaint||now-lastPaint>=40){draw(lastMode);lastPaint=now;}
 frame=requestAnimationFrame(tick);
}
// Don't paint a hidden cookie / drill / bottle lesson beneath the shared board.
const preview0=syncBetPreview;syncBetPreview=function(a){preview0(a);if(a?.phase==='ready'&&betPreviewFrame){cancelAnimationFrame(betPreviewFrame);betPreviewFrame=0;}};
const bet0=drawBetPreview;drawBetPreview=function(...a){if(app.phase!=='ready')return bet0(...a);};
const choco0=chocoDrawTutorial;chocoDrawTutorial=function(...a){if(app.phase!=='ready')return choco0(...a);};
const six0=sixDrawTutorial;sixDrawTutorial=function(...a){if(app.phase!=='ready')return six0(...a);};
window.RecentGameDemosV74?.stop?.();
const select0=select;select=function(i,...a){const result=select0(i,...a);sync();return result;};
const hud0=hud;hud=function(a,...rest){const result=hud0(a,...rest);sync();return result;};
document.addEventListener('visibilitychange',sync);new ResizeObserver(sync).observe(field);
window.SweetsDemoSuite={version:91,installed:true,sync,get status(){return {ready:lastReady,kind:lastMode,active:!canvas.hidden,scene:Number(canvas.dataset.scene)||0};}};
sync();
})();
