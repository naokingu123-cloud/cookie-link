/* The main griddle and the tab preview share one top-down view of the same draw. */
(()=>{
'use strict';
const R=window.PartyCastellaRules,tiles=new Image(),panArt=new Image(),bottle=new Image(),honeyCrumb=new Image();
tiles.src='assets/party-castella-tiles.webp?v=116';
panArt.src='assets/party-castella-honey-griddle.webp';
bottle.src='assets/party-castella-dispenser.webp';
honeyCrumb.src='assets/sweet-skins/castella.webp';
const bottleTip=[.954,.971];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const tau=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
// A live legacy round keeps its 37-hole geometry; newly dealt griddles have 61.
const geometry=s=>{const radius=Math.max(1,...s.cells.map(c=>c.ring??Math.max(Math.abs(c.q),Math.abs(c.r),Math.abs(c.q+c.r))));return {radius,panW:radius*2+1.34,panH:radius*Math.sqrt(3)+1.12};};
const fillStart=[145,375,655,935],pourDuration=320,ovenSwitch=1340;
const history=new WeakMap(),maskCache=new WeakMap();
const winFor=typeof medalWin==='function'?medalWin:(bet,rate)=>Math.floor(bet*rate/100);
const showOven=(s,age)=>s.draws.length>5||s.draws.length===5&&(reduced.matches||age>=ovenSwitch);

// Outline the actual heated hexes, including the clipped regions at the edge.
function mask(zone,cells){
 const cached=maskCache.get(zone);if(cached)return cached;
 const surface=new Path2D(),rim=new Path2D(),boundary=new Map();
 for(const id of zone.cells){
  const {x,y}=cells[id],points=[];
  for(let i=0;i<6;i++){
   const a=(i*60-90)*Math.PI/180;points.push([x+Math.cos(a)/Math.sqrt(3),y+Math.sin(a)/Math.sqrt(3)]);
  }
  surface.moveTo(...points[0]);for(const p of points.slice(1))surface.lineTo(...p);surface.closePath();
  for(let i=0;i<6;i++){
   const a=points[i],b=points[(i+1)%6];
   const key=[a,b].map(p=>p.map(n=>Math.round(n*1000)).join(',')).sort().join(':');
   if(boundary.has(key))boundary.delete(key);else boundary.set(key,[a,b]);
  }
 }
 for(const [a,b] of boundary.values()){rim.moveTo(...a);rim.lineTo(...b);}
 const result={surface,rim};maskCache.set(zone,result);return result;
}
function circle(ctx,x,y,r,fill){
 ctx.beginPath();ctx.arc(x,y,r,0,tau);ctx.fillStyle=fill;ctx.fill();
}
function line(ctx,x,y,X,Y,color,width){
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function outline(ctx,x,y,r,color,width){
 ctx.beginPath();ctx.arc(x,y,r,0,tau);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
let materials;
honeyCrumb.addEventListener('load',()=>{materials=null;browning=null;});
function makeMaterials(){
 const dedicated=window.CastellaArtV303?.materials();if(dedicated)return dedicated;
 const illustrated=window.SweetsIllustratedBoardsCV275?.castellaMaterials();if(illustrated)return illustrated;
 if(window.SweetsCartoonBoardsC)return window.SweetsCartoonBoardsC.castellaMaterials();
 if(materials||!tiles.naturalWidth)return materials;
 const sw=tiles.naturalWidth/3,sh=tiles.naturalHeight;
 materials=[0,1,2].map(i=>{
  const face=document.createElement('canvas');face.width=face.height=160;
  const g=face.getContext('2d');g.beginPath();g.arc(80,80,79.5,0,tau);g.clip();
  g.drawImage(tiles,i*sw,0,sw,sh,0,0,160,160);
  if(i===2&&honeyCrumb.naturalWidth){
   g.save();g.beginPath();g.arc(80,80,65,0,tau);g.clip();
   g.globalCompositeOperation='soft-light';g.drawImage(honeyCrumb,13,13,134,134);g.restore();
  }
  return face;
 });
 return materials;
}
function number(ctx,n,x,y,size,filled){
 const ink=filled?'#402116':'#fff9e9',rim=filled?'#fff0b4':'#221c1b';
 ctx.save();
 if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,n,x,y,size,ink,rim,size*.077);
 else{
  ctx.font='900 '+size+'px ElixirNumbers,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=size*.12;ctx.strokeStyle=rim;ctx.strokeText(n,x,y);ctx.fillStyle=ink;ctx.fillText(n,x,y);
 }
 ctx.restore();
}
const specialColors={pour:['#b9f7ff','#26b7df','#125e89'],fire:['#fff0a3','#ff8c39','#8a2b19'],sugar:['#ffe8fa','#ed94d5','#8d4389'],odds:['#fff5b7','#e7b552','#87532c']};
// Small code-native marks stay crisp at both live-board and miniature sizes.
// The drop + rising arrow means injection; a flame above a switch means heat.
function powerGlyph(ctx,x,y,r,kind){
 if(window.CastellaArtV303?.power(ctx,x,y,r,kind))return;
 ctx.save();ctx.translate(x,y);ctx.scale(r,r);ctx.lineJoin=ctx.lineCap='round';
 const colors=specialColors[kind]||specialColors.sugar;
 ctx.lineWidth=.11;ctx.strokeStyle=colors[2];ctx.fillStyle=colors[1];
 if(kind==='pour'||kind==='odds'){
  ctx.beginPath();ctx.moveTo(-.12,-.9);ctx.bezierCurveTo(-.35,-.48,-.77,-.09,-.71,.30);ctx.bezierCurveTo(-.64,.96,.44,.99,.5,.27);ctx.bezierCurveTo(.55,-.12,.1,-.58,-.12,-.9);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=colors[0];ctx.lineWidth=.14;ctx.beginPath();ctx.moveTo(-.40,.06);ctx.quadraticCurveTo(-.55,.43,-.25,.53);ctx.stroke();
  if(kind==='pour'){
   ctx.strokeStyle='#fff5bf';ctx.lineWidth=.22;ctx.beginPath();ctx.moveTo(.54,.39);ctx.lineTo(.54,-.54);ctx.moveTo(.24,-.26);ctx.lineTo(.54,-.59);ctx.lineTo(.84,-.26);ctx.stroke();
  }
 }else if(kind==='fire'){
  ctx.beginPath();ctx.moveTo(-.12,-.93);ctx.bezierCurveTo(.22,-.52,.02,-.29,.31,-.22);ctx.lineTo(.52,-.56);ctx.bezierCurveTo(.98,.19,.62,.73,.03,.76);ctx.bezierCurveTo(-.63,.8,-.88,.23,-.47,-.31);ctx.bezierCurveTo(-.47,-.03,-.21,.03,-.19,-.19);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff0a3';ctx.beginPath();ctx.moveTo(.04,-.19);ctx.bezierCurveTo(-.40,.28,-.24,.57,.07,.58);ctx.bezierCurveTo(.45,.54,.34,.22,.04,-.19);ctx.fill();
  ctx.fillStyle='#33494f';ctx.strokeStyle='#fff1b3';ctx.lineWidth=.07;ctx.beginPath();ctx.roundRect(-.5,.69,1,.26,.12);ctx.fill();ctx.stroke();circle(ctx,.24,.82,.12,'#fff2ab');
 }else{
  ctx.beginPath();ctx.moveTo(0,-.87);ctx.lineTo(.63,-.23);ctx.lineTo(.4,.65);ctx.lineTo(-.4,.65);ctx.lineTo(-.63,-.23);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#fff6ff';ctx.lineWidth=.075;ctx.beginPath();ctx.moveTo(0,-.87);ctx.lineTo(-.2,-.12);ctx.lineTo(.4,.65);ctx.moveTo(-.63,-.23);ctx.lineTo(.63,-.23);ctx.moveTo(.63,-.23);ctx.lineTo(-.4,.65);ctx.stroke();
  ctx.strokeStyle='#fff7ce';ctx.lineWidth=.11;ctx.beginPath();ctx.moveTo(.73,-.75);ctx.lineTo(.73,-.28);ctx.moveTo(.5,-.52);ctx.lineTo(.96,-.52);ctx.stroke();
 }
 ctx.restore();
}
function specialMarker(ctx,x,y,rr,kind,on,age,unit,compact=false){
 ctx.save();
 const colors=specialColors[kind],radius=compact?rr*.31:rr*.91;
 if(compact){x+=rr*.82;y+=rr*.70;}
 const g=ctx.createRadialGradient(x-radius*.25,y-radius*.28,0,x,y,radius);
 g.addColorStop(0,colors[0]);g.addColorStop(.56,colors[1]);g.addColorStop(1,colors[2]);
 const t=Number.isFinite(age)?age:0,glow=reduced.matches?1:.75+.25*Math.sin(t*.006)**2;
 ctx.shadowColor=colors[1];ctx.shadowBlur=on?radius*.36*glow:0;
 circle(ctx,x,y,radius,g);outline(ctx,x,y,radius,on?'#fffbd9':'#ffe8b6',Math.max(1,unit*.03));ctx.shadowBlur=0;
 powerGlyph(ctx,x,y-radius*(compact?0:.08),radius*(compact?.76:.66),kind);
 if(!compact){
  ctx.font='1000 '+unit*.135+'px "Hiragino Maru Gothic ProN","Yu Gothic",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=unit*.035;ctx.strokeStyle=colors[2];ctx.fillStyle='#fff9da';
  const label=kind==='sugar'?(on?'GET':'SUGAR'):on?'UP!':kind==='pour'?'注入力':kind==='fire'?'火力':'はちみつ';
  ctx.strokeText(label,x,y+radius*.67);ctx.fillText(label,x,y+radius*.67);
 }
 if(on){outline(ctx,x,y,radius*1.10,colors[0],unit*.025);}
 ctx.restore();
}
const reachBadges=new WeakMap();
function reachEffect(ctx,x,y,r,hit,time,mini){
 const tier=hit.allClear?3:Math.min(2,hit.tier||0),colors=['#ffec8f','#ffb64d','#ff7892','#ffd86a'];
 const all=!!hit.allClear;
 const t=Number.isFinite(time)?time:0,phase=reduced.matches?0:t/600;
 ctx.save();
 const glow=.72+.28*Math.cos(t/220)**2;
 const color=all?['#ff7f9c','#fff08e','#7af8dd','#6abaff','#e497ff'][Math.floor(t/150)%5]:colors[Math.min(tier,3)];
 let cache=reachBadges.get(ctx);
 if(!cache||cache.r!==r){cache={r,images:new Map()};reachBadges.set(ctx,cache);}
 const caption=mini?'':all?(Math.floor(t/850)%2?'全焼き':'リーチ'):tier===2?'超高額':tier===1?'高額':hit.oddsUp?'ODDS UP':'リーチ';
 const key=color+caption;
 let sprite=cache.images.get(key);
 if(!sprite){
   const img=document.createElement('canvas'),extent=Math.ceil(r*2.25);
   img.width=img.height=extent*2;const g=img.getContext('2d');g.translate(extent,extent);
   g.strokeStyle=color;g.lineWidth=r*(all?.155:.10);g.shadowColor=color;g.shadowBlur=r*(all?.62:.37);
   g.beginPath();g.arc(0,0,r*1.09,0,tau);g.stroke();g.shadowBlur=0;
   if(caption){
     g.font='1000 '+r*(all?.62:.59)+'px "Hiragino Maru Gothic ProN","Yu Gothic",system-ui,sans-serif';
     g.textAlign='center';g.textBaseline='middle';g.lineWidth=r*.16;g.lineJoin='round';
     g.strokeStyle='#582d25';g.strokeText(caption,0,-r*.82);
     g.fillStyle=all?'#fff9d9':tier===2?'#ffe6b3':'#fff8c8';g.fillText(caption,0,-r*.82);
   }
   sprite=img;cache.images.set(key,img);
 }
 ctx.globalAlpha=glow;ctx.drawImage(sprite,x-sprite.width/2,y-sprite.height/2);ctx.globalAlpha=.75;
 for(let k=0;k<(all?5:3);k++){
   const angle=(all?1:-1)*phase+(k/(all?5:3))*tau;
   const sx=x+Math.cos(angle)*r*1.22,sy=y+Math.sin(angle)*r*1.22;
   ctx.fillStyle=all?['#ff7f9c','#ffe776','#88f2b1','#75dfff','#e69aff'][k]:colors[Math.min(tier,3)];
   circle(ctx,sx,sy,r*(all?.115:.083),ctx.fillStyle);
 }
 ctx.globalAlpha=1;

 ctx.restore();
}
function hitLabel(ctx,x,y,unit){
 ctx.save();ctx.translate(x,y);ctx.rotate(-.12);
 ctx.font='italic 1000 '+unit*.292+'px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.lineWidth=unit*.077;ctx.strokeStyle='#581e17';ctx.strokeText('HIT!',0,0);
 ctx.lineWidth=unit*.034;ctx.strokeStyle='#fff3be';ctx.strokeText('HIT!',0,0);
 ctx.fillStyle='#b43117';ctx.fillText('HIT!',0,0);ctx.restore();
}
// Fronts arriving from different passages meet inside the same well.
function pool(ctx,x,y,r,u,inlets,cell,stamp){
 if(u<=0)return;
 const eased=u*(2-u),radius=r*eased;
 ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,tau);ctx.clip();
 if(stamp){
  ctx.beginPath();
  for(const inlet of inlets){
   const cx=x+(inlet.x-cell.x)*r*.90*(1-eased),cy=y+(inlet.y-cell.y)*r*.90*(1-eased);
   for(let j=0;j<32;j++){
    const a=tau*j/32,rad=radius*(1+(1-u)*.08*Math.sin(3*a+u*6)+(1-u)*.045*Math.sin(5*a-u*4));
    const px=cx+rad*Math.cos(a),py=cy+rad*Math.sin(a);
    if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
   }
   ctx.closePath();
  }
  ctx.clip();stamp(1);
 }
 // An already-filled junction still ripples on each side where batter arrives.
 ctx.globalAlpha=Math.sin(Math.PI*u)*.9;ctx.strokeStyle='#fff4bd';ctx.lineWidth=r*.09;
 for(const inlet of inlets){
  const dx=inlet.x-cell.x,dy=inlet.y-cell.y,angle=Math.atan2(-dy,-dx);
  ctx.beginPath();ctx.arc(x+dx*r*.84,y+dy*r*.84,radius*.97,angle-.96,angle+.96);ctx.stroke();
 }
 ctx.restore();
}
// A softened, uneven caramel front travels in from the hot rim of the mould.
let browning,browningMaterials;
function bakeFaces(mats){
 if(browning&&browningMaterials===mats)return browning;
 browningMaterials=mats;
 const mask=document.createElement('canvas');mask.width=mask.height=160;
 const m=mask.getContext('2d'),spots=[[43,55,24],[114,61,32],[58,103,35],[95,120,23]];
 browning=Array.from({length:19},(_,i)=>{
  if(!i)return mats[1];if(i===18)return mats[2];
  const t=i/18,face=document.createElement('canvas');face.width=face.height=160;
  const g=face.getContext('2d'),rim=m.createRadialGradient(76,78,0,80,80,80);
  for(let k=0;k<=8;k++){
   const a=clamp((1.08*t-.67*(1-k/8))/.39);
   rim.addColorStop(k/8,'rgba(0,0,0,'+a+')');
  }
  m.clearRect(0,0,160,160);m.fillStyle=rim;m.fillRect(0,0,160,160);
  for(const [x,y,r] of spots){
   const spot=m.createRadialGradient(x,y,0,x,y,r);
   spot.addColorStop(0,'rgba(0,0,0,'+clamp((t-.12)*1.38)+')');spot.addColorStop(1,'transparent');
   m.fillStyle=spot;m.fillRect(x-r,y-r,r*2,r*2);
  }
  g.drawImage(mats[2],0,0);g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);
  g.globalCompositeOperation='destination-over';g.drawImage(mats[1],0,0);return face;
 });
 return browning;
}
function griddleHeat(ctx,x,y,r,t,id,mini){
 if(t<=0||t>=1)return;
 ctx.save();const power=Math.sin(t*Math.PI);
 // A red-hot iron rim, pinprick flashes and curling steam on contact with batter.
 ctx.globalAlpha=power*.85;
 outline(ctx,x,y,r*1.035,'#fb7236',r*.13);
 ctx.beginPath();ctx.arc(x,y,r*.99,Math.PI*1.06,Math.PI*1.64);ctx.strokeStyle='#ffdb78';ctx.lineWidth=r*.082;ctx.stroke();
 for(let j=0;j<(mini?1:3);j++){
  const u=(t*1.75+id*.27+j*.37)%1,a=(j*.37+.1)*Math.PI+id*1.7;
  const sx=x+Math.cos(a)*r*(.72+.18*u),sy=y+Math.sin(a)*r*.66-r*.36*u;
  ctx.globalAlpha=power*Math.sin(Math.PI*u);
  circle(ctx,sx,sy,r*.105*(1-u*.48),'#fff4b6');
 }
 if(!mini&&t>.22){
  const u=(t-.22)/.78;
  for(let j=0;j<(id%3===0?2:1);j++){
   const lean=Math.sin(id*2+j+u*4),sx=x+r*.48*Math.sin(id+j*2),sy=y-r*.30;
   const length=r*(.52+u*.99),lift=r*u*.72;
   ctx.globalAlpha=.76*Math.sin(u*Math.PI);ctx.lineWidth=r*(.07+.02*j);ctx.strokeStyle='#fff2d8';
   ctx.beginPath();ctx.moveTo(sx,sy-lift);
   ctx.bezierCurveTo(sx+r*.49*lean,sy-lift-length*.33,sx-r*.42*lean,sy-lift-length*.61,sx+r*.16*lean,sy-lift-length);ctx.stroke();
  }
 }
 ctx.restore();
}
function dispenser(ctx,x,y,unit,age){
 const dedicated=window.CastellaArtV303?.loaded?window.CastellaArtV303:null;
 const cartoon=window.SweetsCartoonBoardsC;
 if((!dedicated&&!cartoon&&!bottle.naturalWidth)||age>=1110)return;
 const side=x<ctx.canvas.width/2?-1:1,fromTop=y>unit*3.12;
 const tilt=fromTop?0:-1.08,approach=clamp(age/130),leave=clamp((age-825)/285);
 const visibility=clamp(age/85)*(1-leave);
 const exit=(1-approach+leave)*unit*.45;
 const gx=x-side*unit*.29,gy=y+unit*.14;
 const tipX=gx-side*(unit*.30+exit),tipY=gy-unit*(fromTop?.54:.34)-exit*.64;
 ctx.save();ctx.globalAlpha=visibility;
 const jet=clamp((age-95)/95)*clamp((865-age)/120);
 if(jet>0){
  const endX=tipX+(gx-tipX)*jet,endY=tipY+(gy-tipY)*jet;
  const width=unit*(.115+.015*Math.sin(age*.03))*Math.sqrt(jet);
  const mx=tipX+(endX-tipX)*.21,my=tipY+(endY-tipY)*.47;
  ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo(mx,my,endX,endY);
  ctx.strokeStyle='#986327';ctx.lineWidth=width*1.38;ctx.stroke();
  ctx.strokeStyle='#ffdf8b';ctx.lineWidth=width;ctx.stroke();
  ctx.beginPath();ctx.moveTo(tipX+width*.15,tipY);ctx.quadraticCurveTo(mx+width*.15,my,endX+width*.12,endY);
  ctx.strokeStyle='#fff4ba';ctx.lineWidth=width*.37;ctx.stroke();
  if(jet>.97){
   const beat=(age%235)/235;
   circle(ctx,gx,gy,unit*(.075+.05*beat),'#fff0b0');
   for(let j=0;j<4;j++){
    const a=(j+.15)*tau/4+age*.0014,u=(beat+j*.23)%1;
    circle(ctx,gx+Math.cos(a)*unit*.24*u,gy+Math.sin(a)*unit*.13*u-unit*.09*Math.sin(Math.PI*u),unit*.037*(1-.48*u),'#ffe79e');
   }
  }
 }
 ctx.translate(tipX,tipY);ctx.scale(side,1);ctx.rotate(tilt-.12*(1-approach)+leave*.17);
 const bw=unit*2.02,bh=bw*(dedicated?dedicated.dispenserRatio():cartoon?cartoon.dispenserRatio():bottle.naturalHeight/bottle.naturalWidth);
 ctx.shadowColor='#27180ea3';ctx.shadowBlur=unit*.07;ctx.shadowOffsetY=unit*.10;
 if(dedicated)dedicated.dispenser(ctx,0,0,bw,bh);
 else if(cartoon)cartoon.castellaDispenser(ctx,0,0,bw,bh);
 else ctx.drawImage(bottle,-bw*bottleTip[0],-bh*bottleTip[1],bw,bh);
 ctx.restore();
}
function paint(ctx,s,opts={},mini=false){
 const w=ctx.canvas.width,h=ctx.canvas.height;
 if(!w||!h)return;
 const age=reduced.matches?Infinity:Math.max(0,opts.age??Infinity),oven=showOven(s,age);
 const bake=s.draws.length>=6,play=s.draws.length>0&&age<1500,zoneId=opts.previewZone||s.lastZone;
 const reachShown=Array.isArray(opts.reach)&&opts.reach.length>0&&(s.phase==='pour'||oven);
 const key=[w,h,oven,play?Math.floor(age/30):-1,tiles.naturalWidth,panArt.naturalWidth,bottle.naturalWidth,window.SweetsCartoonBoardsC?.epoch,window.SweetsIllustratedBoardsCV275?.epoch,window.CastellaArtV303?.epoch,opts.previewZone,zoneId,
   reachShown&&!reduced.matches?Math.floor((opts.time||0)/80):-1].join('/');
 const last=history.get(ctx);
 if(last?.s===s&&last.key===key&&last.reach===opts.reach)return;
 let frame=last?.frame;
 if(last?.s!==s){
  const wave=s.cells.map(()=>-1),arrival=[],inlets=s.cells.map(()=>[]),labels=[];
  s.wave.forEach((group,t)=>group.forEach(i=>{wave[i]=t;}));
  if(!bake)for(const id of s.sources){inlets[id].push(s.cells[id]);arrival[id]=0;}
  for(const [from,to,depth] of s.flow){inlets[to].push(s.cells[from]);arrival[to]=depth;}
  for(const z of s.zones)if(z.numbers.length)labels[z.anchor]=z.numbers[0];
  frame={wave,arrival,inlets,labels,layer:last?.frame.layer,legend:last?.frame.legend};
 }
 history.set(ctx,{s,key,frame,reach:opts.reach});
 const {panW,panH}=geometry(s),unit=Math.min(w/panW,h/panH),X=x=>w/2+x*unit,Y=y=>h/2+y*unit,rr=unit*.405,mats=makeMaterials();
 ctx.save();ctx.clearRect(0,0,w,h);
 ctx.lineJoin=ctx.lineCap='round';
 const px=X(-panW/2),py=Y(-panH/2);
 const firing=bake?s.zones[s.lastZone-1]:null,zone=zoneId?s.zones[zoneId-1]:null;
 const bakeOverlay=bake&&play;
 const baseKey=[w,h,oven,play,opts.previewZone,zoneId,tiles.naturalWidth,panArt.naturalWidth,honeyCrumb.naturalWidth,window.SweetsCartoonBoardsC?.epoch,window.SweetsIllustratedBoardsCV275?.epoch,window.CastellaArtV303?.epoch].join('/');
 if(frame.baseKey!==baseKey){
  const movingCell=c=>play&&(bake?firing.cells.includes(c.id):frame.arrival[c.id]!==undefined);
  frame.moving=s.cells.filter(movingCell);
  // Cache the griddle, channels and every untouched well at the device's actual resolution.
  const layerCtx=surface('layer');
  drawGriddle(layerCtx);drawWells(layerCtx,s.cells.filter(c=>!movingCell(c)));
  if(bakeOverlay){
   const legendCtx=surface('legend');
   for(const cell of s.cells)drawMark(legendCtx,cell,1);
  }
  frame.baseKey=baseKey;
 }
 ctx.drawImage(frame.layer,0,0);
 if(zone&&zone===firing&&play){
  ctx.save();ctx.translate(w/2,h/2);ctx.scale(unit,unit);
  const m=mask(zone,s.cells);
  const c=s.cells[firing.anchor],t=clamp(age/1420),reach=.23+2.6*clamp(age/520);
  const flare=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,reach);
  flare.addColorStop(0,'#ffd466');flare.addColorStop(.55,'#f37d22');flare.addColorStop(1,'#eb612100');
  ctx.globalAlpha=Math.sin(t*Math.PI)*.65;ctx.fillStyle=flare;ctx.fill(m.surface);
  ctx.strokeStyle='#ffbb56';ctx.lineWidth=.075;ctx.stroke(m.rim);
  ctx.restore();
 }
 if(!bake&&play){
  for(const [from,to,depth] of s.flow){
   const A=s.cells[from],B=s.cells[to],u=clamp((age-fillStart[depth]+155)/155);
   if(!u)continue;
   // Move across the exposed channel between the two rims, then into the next well.
   const t=.39+.22*u,ax=X(A.x+.39*(B.x-A.x)),ay=Y(A.y+.39*(B.y-A.y));
   const bx=X(A.x+t*(B.x-A.x)),by=Y(A.y+t*(B.y-A.y));
   ctx.globalAlpha=clamp((1330-age)/250);
   line(ctx,ax,ay,bx,by,'#f4b950',unit*.10);
   line(ctx,ax,ay-unit*.012,bx,by-unit*.012,'#ffe8a2',unit*.045);
  }
  ctx.globalAlpha=1;
 }
 drawWells(ctx,frame.moving);
 if(bakeOverlay)ctx.drawImage(frame.legend,0,0);
 function surface(name){
  const image=frame[name]||(frame[name]=document.createElement('canvas'));
  if(image.width!==w||image.height!==h){image.width=w;image.height=h;}
  const g=image.getContext('2d');g.clearRect(0,0,w,h);g.lineJoin=g.lineCap='round';return g;
 }
 function drawGriddle(ctx){
  if(window.CastellaArtV303?.griddle(ctx,px,py,panW*unit,panH*unit)){}
  else if(window.SweetsCartoonBoardsC)window.SweetsCartoonBoardsC.castellaGriddle(ctx,px,py,panW*unit,panH*unit,unit);
  else if(!mini){
   if(panArt.naturalWidth)ctx.drawImage(panArt,px,py,panW*unit,panH*unit);
   else{ctx.fillStyle='#39322e';ctx.fillRect(px,py,panW*unit,panH*unit);}
  }
  if(zone){
   ctx.save();ctx.translate(w/2,h/2);ctx.scale(unit,unit);
   const m=mask(zone,s.cells);
   ctx.fillStyle=opts.previewZone?'#ffdf866b':'#ed873731';ctx.fill(m.surface);
   ctx.strokeStyle=opts.previewZone?'#ffe893':'#f2ab6bbf';ctx.lineWidth=.038;ctx.stroke(m.rim);
   ctx.restore();
  }
  for(const [a,b] of s.edges){
   const A=s.cells[a],B=s.cells[b],x=X(A.x),y=Y(A.y),bx=X(B.x),by=Y(B.y);
   const cartoon=!!window.SweetsCartoonBoardsC;
   line(ctx,x,y,bx,by,cartoon?'#87452c':'#cc9f68',unit*.15);
   line(ctx,x,y+unit*.006,bx,by+unit*.006,cartoon?'#f3b94f':'#37281f',unit*.093);
   line(ctx,x,y+unit*.013,bx,by+unit*.013,cartoon?'#ffeaaa':'#7d6040',unit*.031);
  }
 }
 function drawWells(ctx,list){
  for(const cell of list){
   const {id}=cell,x=X(cell.x),y=Y(cell.y);
   const stage=s.baked[id]?2:s.wet[id]?1:0,depth=frame.wave[id];
   const step=bake?depth:frame.arrival[id];
   const u=play&&step>=0?clamp((age-(bake?step*120+80:fillStart[step]))/(bake?830:pourDuration)):1;
   const stamp=k=>{
    if(mats)ctx.drawImage(mats[k],x-rr,y-rr,rr*2,rr*2);
    else circle(ctx,x,y,rr,['#28231e','#f5ca75','#b77130'][k]);
   };
   circle(ctx,x,y+unit*.025,rr*1.045,window.SweetsCartoonBoardsC?'#87452c':'#1b1816');
   if(u>=1)stamp(stage);
   else if(bake){
    if(mats)ctx.drawImage(bakeFaces(mats)[Math.round(u*18)],x-rr,y-rr,rr*2,rr*2);
    else{stamp(1);ctx.globalAlpha=u;stamp(2);ctx.globalAlpha=1;}
   }
   else{
    const newWell=depth>=0;stamp(newWell?0:stage);
    pool(ctx,x,y,rr,u,frame.inlets[id],cell,newWell?stamp:null);
   }
   if(!bake&&play&&s.sources.includes(id)&&age>=165&&age<990){
    const t=(age-165)/825;ctx.globalAlpha=.84*(1-t);
    for(let j=0;j<2;j++){
     const k=(t*1.25+j*.46)%1;ctx.beginPath();
     ctx.arc(x,y,rr*(.15+k*.76),t*4+j*3,t*4+j*3+Math.PI*1.55);
     ctx.strokeStyle=j?'#ffc45c':'#fff4cb';ctx.lineWidth=unit*.046;ctx.stroke();
    }
    ctx.globalAlpha=1;
   }
   if(firing&&play&&firing.cells.includes(id)){
    const anchor=s.cells[firing.anchor];
    const delay=Math.round(Math.hypot(cell.x-anchor.x,cell.y-anchor.y))*100;
    const heat=clamp((age-delay)/1200);
    if(s.wet[id])griddleHeat(ctx,x,y,rr,heat,id,mini);
    else if(heat>0&&heat<1){
     ctx.globalAlpha=Math.sin(heat*Math.PI)*.8;
     outline(ctx,x,y,rr*1.03,'#ff9340',rr*.105);ctx.globalAlpha=1;
    }
   }
   if(!bakeOverlay)drawMark(ctx,cell,u);
  }
 }
 function drawMark(ctx,cell,u){
  const {id}=cell,n=oven?frame.labels[id]:cell.number,x=X(cell.x),y=Y(cell.y);
  const depth=frame.wave[id],stage=s.wet[id]||s.baked[id];
  const specials=s.specials||{},kind=specials.pour?.includes(id)?'pour':specials.fire?.includes(id)?'fire':specials.sugar?.includes(id)?'sugar':specials.odds?.includes(id)?'odds':null;
  const newlyReached=play&&depth>=0&&u<.98;
  const on=kind==='pour'?s.pourTriggered?.includes(id):kind==='fire'?(s.rulesRevision>=250?s.fireTriggered?.includes(id):s.wet[id])&&!newlyReached:kind==='sugar'?s.baked[id]&&(!play||depth<0||opts.sugarCollected):s.wet[id];
  if(kind&&!n)specialMarker(ctx,x,y,rr,kind,on,play?age:Infinity,unit);
  if(n){
   const hit=s.draws.includes(n),active=hit&&n===s.lastNumber;
   if(hit)outline(ctx,x,y,rr*(active?1.035:.96),active?'#fff2a0':'#efb162',unit*(active?.060:.035));
   number(ctx,n,x-(kind?unit*.025:0),y+(hit?unit*.105:kind?-unit*.055:0),unit*(hit?.50:kind?.535:.575),stage&&(depth<0||u>.5||bake));
   if(hit)hitLabel(ctx,x,y-unit*.18,unit);
  }
  if(kind&&n)specialMarker(ctx,x,y,rr,kind,on,play?age:Infinity,unit,true);
 }
 if(reachShown){
  for(const hit of opts.reach){
   if(s.draws.includes(hit.number))continue;
   const c=s.cells[hit.anchor];
   reachEffect(ctx,X(c.x),Y(c.y),rr,hit,opts.time,mini);
  }
 }
 if(!bake&&play&&s.sources.length){
  const c=s.cells[s.sources[0]];dispenser(ctx,X(c.x),Y(c.y),unit,age);
 }
 ctx.restore();
}
function mount(panel){
 panel.classList.add('pct-panel');
 const root=document.createElement('section');root.className='pct-scene';root.setAttribute('aria-label','パーティカステラ');
 root.innerHTML=`<img class="pct-land" src="assets/party-castella-bg.webp?v=117" alt="" aria-hidden="true">
 <aside class="pct-side"><div class="pct-phase" role="group" aria-label="前半・後半">
 <div class="pct-phase-first"><strong>前半</strong><span>1〜5球</span></div>
 <div class="pct-phase-second"><strong>後半</strong><span>6〜8球</span></div></div>
 <div class="pct-pay"><div class="pct-pay-label"><span>配当</span></div>
 <table aria-label="焼けた個数と現在のBETでの獲得WIN"><thead><tr><th scope="col">個数</th><th scope="col">WIN</th></tr></thead><tbody></tbody></table></div></aside>
 <div class="pct-tray"><div class="pct-pan"><canvas role="img"></canvas>
 <div class="pct-anchors" role="group" aria-label="番号を選ぶと焼き範囲を表示"></div></div>
 <div class="pct-status" role="group" aria-label="注入力・火力ゲージ">
   <div class="pct-status-pour"><canvas class="pct-power-icon" data-power="pour" width="72" height="72" aria-hidden="true"></canvas><div class="pct-stat-line"><small>注入力</small><div class="pct-gauge pct-pour-gauge" role="meter" aria-label="注入力" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1"><i></i><i></i><i></i></div><span class="pct-pour-radius">周囲1マス</span></div></div>
   <div class="pct-status-fire"><canvas class="pct-power-icon" data-power="fire" width="72" height="72" aria-hidden="true"></canvas><div class="pct-stat-line"><small>火力</small><div class="pct-gauge pct-fire-gauge" role="meter" aria-label="火力" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1"><i></i><i></i><i></i></div><span class="pct-fire-radius">周囲1マス</span></div></div>
 </div>
 <img class="pct-sweep-art" src="assets/party-castella-feast.webp" alt="" aria-hidden="true"></div>
 <div class="pct-caption" role="status" aria-live="polite"></div>`;
 panel.append(root);
 if(window.CastellaArtV303?.mount(root)){}
 else if(window.SweetsCartoonBoardsC)root.querySelector('.pct-sweep-art').src=window.SweetsCartoonBoardsC.url('castella-baked');
 const q=k=>root.querySelector(k),phase=q('.pct-phase'),pan=q('.pct-pan'),canvas=q('.pct-pan>canvas'),ctx=canvas.getContext('2d');
 for(const icon of root.querySelectorAll('.pct-power-icon'))powerGlyph(icon.getContext('2d'),36,34,30,icon.dataset.power);
 const legend=q('.pct-anchors'),caption=q('.pct-caption'),table=q('tbody');
 let rows=[],rowRevision=null,shown=null,shownOven=false,previewZone=null,lastOpts={},shownBet=null,shownBoost=null;
 function buildRows(s){
  const revision=String(s.rulesRevision||0)+'/'+s.cells.length;if(revision===rowRevision)return;
  rowRevision=revision;table.replaceChildren();shownBet=shownBoost=null;
  const payRows=R.payRowsFor?R.payRowsFor(s):R.payRows,top=s.cells.length;
  rows=payRows.map(({count,hundredths},index)=>{
   const row=table.insertRow(0),th=document.createElement('th');
   const upper=(payRows[index+1]?.count??top+1)-1;
   row.dataset.prize=count===top?'feast':hundredths>=1000?'ruby':hundredths>=300?'honey':hundredths>=100?'mint':'vanilla';
   row.dataset.count=String(count);th.scope='row';th.textContent=count+'';
   if(count===top){const mark=document.createElement('small');mark.textContent='全焼';th.append(mark);}
   else if(upper>count){const mark=document.createElement('small');mark.textContent='〜';th.append(mark);}
   row.append(th);const cell=row.insertCell(),value=document.createElement('span'),unit=document.createElement('small');
   value.className='pct-win-value';unit.textContent='WIN';cell.append(value,unit);
   return {count,upper,hundredths,row,cell,value};
  });
  root.dataset.payRows=String(rows.length);
 }
 function fitPayoutRows(){for(const {cell,value} of rows||[])window.SweetsPayoutFitV301?.plain(value,cell,cell.querySelector('small'),{inset:4});}
 function updateWins(bet,s){
  buildRows(s);
  const oddsHits=s.rulesRevision>=250?0:s.oddsHits||0;
  if(shownBet===bet&&shownBoost===oddsHits)return;
  shownBet=bet;shownBoost=oddsHits;
  for(const {count,upper,hundredths,row,cell,value} of rows){
   const rate=R.payoutState?R.payoutState(s,count):R.payout(count,oddsHits),win=winFor(bet,rate);
   let label=String(win);
   // Keep the amount exact. Multiples of a large Japanese unit fit the narrow plaque.
   if(label.length>6){
    for(const [factor,suffix] of [[1e12,'兆'],[1e8,'億'],[1e4,'万']]){
     if(win%factor===0){label=String(win/factor)+suffix;break;}
    }
   }
   value.textContent=label;
   row.title=count+(upper>count?'〜'+upper:'')+'個　'+(rate/100).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'倍　'+bet.toLocaleString('ja-JP')+' BET → '+win.toLocaleString('ja-JP')+' WIN';
   cell.setAttribute('aria-label',win.toLocaleString('ja-JP')+' WIN');
  }
  fitPayoutRows();
 }
 function repaint(){if(shown)paint(ctx,shown,previewZone?{...lastOpts,previewZone}:lastOpts);}
 function placeButtons(){
  if(!shown||!shownOven)return;
  const {panW,panH}=geometry(shown),w=pan.clientWidth,h=pan.clientHeight,unit=Math.min(w/panW,h/panH);
  for(const [i,btn] of Array.from(legend.children).entries()){
   const z=shown.zones[i],c=shown.cells[z.anchor];
   Object.assign(btn.style,{left:w/2+c.x*unit+'px',top:h/2+c.y*unit+'px',width:unit*.85+'px',height:unit*.85+'px'});
  }
 }
 function fit(){
  const w=root.clientWidth,h=root.clientHeight;
  if(!w||!h)return;
  root.style.setProperty('--pct-unit',Math.min(w/350,h/300)+'px');
  const ratio=Math.min(devicePixelRatio||1,2),cw=Math.round(pan.clientWidth*ratio),ch=Math.round(pan.clientHeight*ratio);
  if(cw&&ch&&(canvas.width!==cw||canvas.height!==ch)){canvas.width=cw;canvas.height=ch;repaint();}
  placeButtons();fitPayoutRows();
 }
 document.fonts?.ready.then(fitPayoutRows);
 for(const img of [tiles,panArt,bottle,honeyCrumb])img.addEventListener('load',repaint,{once:true});
 const resize=new ResizeObserver(fit);resize.observe(root);resize.observe(pan);
 function makeButtons(s){
  legend.replaceChildren();
  if(!shownOven)return;
  for(const z of s.zones){
   const btn=document.createElement('button');btn.type='button';
   btn.setAttribute('aria-label',z.numbers[0]+'番の焼き範囲');btn.setAttribute('aria-pressed','false');
   btn.onclick=()=>{
    previewZone=previewZone===z.id?null:z.id;
    for(const [i,b] of Array.from(legend.children).entries())b.setAttribute('aria-pressed',String(s.zones[i].id===previewZone));
    repaint();
   };
   legend.append(btn);
  }
  placeButtons();
 }
 function draw(s,o={}){
  if(!s)return;
  const oven=showOven(s,o.age??Infinity),last=shown;
  if(s!==last)previewZone=null;
  lastOpts=o;updateWins(o.bet??0,s);
  let shownFire=s.fireLevel||1;
  if(s.rulesRevision>=250&&!reduced.matches&&s.draws.length<=5){
   const age=o.age??Infinity;
   for(const id of s.newFireTriggers||[]){const depth=s.wave.findIndex(layer=>layer.includes(id));if(depth>=0&&age<fillStart[depth]+pourDuration)shownFire--;}
  }
  for(const [kind,level] of [['pour',s.rulesRevision>=250?s.pourLevel||1:2],['fire',shownFire]]){
   const gauge=q('.pct-'+kind+'-gauge');if(gauge.dataset.value===String(level))continue;
   gauge.dataset.value=String(level);gauge.setAttribute('aria-valuenow',String(level));gauge.setAttribute('aria-valuetext','レベル'+level+'、周囲'+level+'マス');
   for(const [i,bar]of [...gauge.children].entries())bar.classList.toggle('filled',i<level);
   q('.pct-'+kind+'-radius').textContent='周囲'+level+'マス';root.dataset[kind+'Level']=String(level);
  }
  root.dataset.flame=String(shownFire);
  if(s!==last){
   root.dataset.holes=String(s.cells.length);root.dataset.rulesRevision=String(s.rulesRevision||0);
   root.dataset.pourMarkers=String(s.specials?.pour?.length||0);root.dataset.fireMarkers=String(s.specials?.fire?.length||0);root.dataset.sugarMarkers=String(s.specials?.sugar?.length||0);
  }
  if(s!==last||oven!==shownOven){
   const turn=s.draws.length;
   shown=s;shownOven=oven;root.dataset.stage=oven?'bake':'pour';
   root.classList.toggle('pct-sweep',!!s.highestRole);
   phase.classList.toggle('pct-after',oven);phase.setAttribute('aria-label',oven?'後半 6〜8球':'前半 1〜5球');
   rows.forEach(({count,upper,row})=>row.classList.toggle('current',turn>=6&&count<=s.bakedCount&&upper>=s.bakedCount));
   const status='生地 '+s.wetCount+'個、焼き上がり '+s.bakedCount+'個。'+(s.lastNumber?s.lastNumber+'番 HIT!':'');
   const specialInfo=s.rulesRevision>=250?'注入力UPは番号HITで次回から強化。火力スイッチは生地が届くと発動。シュガーの穴が焼き上がると獲得。':'';
   caption.textContent=status;canvas.setAttribute('aria-label',s.cells.length+'個の焼き型。'+status+specialInfo);
   if((oven?s.zones:null)!==(legend.children.length?last?.zones:null))makeButtons(s);
   else for(const btn of legend.children)btn.setAttribute('aria-pressed','false');
  }
  repaint();
 }
 fit();return {draw,drawMini};
}
function drawMini(ctx,s,o){paint(ctx,s,o,true);}
window.PartyCastellaView={mount,drawMini,geometry,powerGlyph};
})();
