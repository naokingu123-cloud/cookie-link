/* v250 BET lesson: real ring-and-spoke passages, two distinct powers, baked Sugar. */
(()=>{
'use strict';
const R=window.PartyCastellaRules,TAU=Math.PI*2;
const steps=[
 {title:'当たった穴に生地を注ぐ',caption:'前半の5球は、出た番号の穴にカステラ液を注ぎます。'},
 {title:'注入力UPにHIT！ 次から広く注ぐ',caption:'注入力は周囲1マスから、UP番号を当てるたび2・3マスへ。強化は次の球から。'},
 {title:'スイッチに生地が届くと火力UP',caption:'2個の火力スイッチで周囲1→2→3マスへ。後半3球は生地のある穴を焼きます。'},
 {title:'焼けた個数でWIN！ シュガーもGET',caption:'配当は焼き上がり個数で決定。シュガーの印がある穴を焼くとシュガーGET！'}
];
const origin=26,oven=27,detail=[24,11,12,13,29,25,26,27,28],spots=new Set(detail);
// A top-down crop along the outer ring. Both 26 and 27 are numbered in the 雪風 mold.
const links=R.originalEdges.filter(([a,b])=>spots.has(a)&&spots.has(b));
const xy=R.cells.map(({x,y})=>[241+(x+.5)*83,157+(y-3*Math.sqrt(3)/2)*83]);
const connections=id=>R.originalEdges.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
const depth=new Map([[origin,0]]);
for(let d=1;d<=3;d++)for(const [id,n] of [...depth])if(n===d-1){
 for(const dst of connections(id))if(!depth.has(dst))depth.set(dst,d);
}
const hot=(id,radius=1)=>{const q=R.cells[id].q-R.cells[oven].q,r=R.cells[id].r-R.cells[oven].r;return Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))<=radius;};
const unit=(t,a,b)=>Math.min(1,Math.max(0,(t-a)/(b-a)));
const smooth=(t,a,b)=>{const x=unit(t,a,b);return x*x*(3-2*x);};
let art,faces;
function loadArt(){
 if(window.SweetsCartoonArt?.loaded)return;
 if(!art){
  art={};
  for(const [key,file] of Object.entries({tiles:'tiles',pan:'honey-griddle',bottle:'dispenser'})){
   const im=new Image();im.src='assets/party-castella-'+file+'.webp';art[key]=im;
  }
 }
 if(!faces&&art.tiles.naturalWidth){
  const sw=art.tiles.naturalWidth/3,sh=art.tiles.naturalHeight;
  faces=[0,1,2].map(i=>{
   const c=document.createElement('canvas');c.width=c.height=160;
   const g=c.getContext('2d');g.beginPath();g.arc(80,80,79.5,0,TAU);g.clip();g.drawImage(art.tiles,i*sw,0,sw,sh,0,0,160,160);return c;
  });
 }
}
function disc(c,x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function box(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function stroke(c,a,b,color,width){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}
function text(c,s,x,y,size,color){
 c.font='900 '+size+'px ElixirNumbers,"Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif';
 c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(s,x,y);
}
function badge(c,s,x,y,w,fill='#442a20',ink='#ffe3a4'){
 box(c,x-w/2,y-15,w,30,14,fill);text(c,s,x,y+1,19,ink);
}
function power(c,kind,x,y,r){
 const glyph=window.PartyCastellaView?.powerGlyph;
 if(glyph)glyph(c,x,y,r,kind);
 else{disc(c,x,y,r,kind==='pour'?'#6bd6eb':kind==='fire'?'#f7aa54':'#eaa8dc');text(c,kind==='pour'?'↑':kind==='fire'?'火':'◆',x,y,r*1.4,'#fff7d1');}
}
function gauge(c,kind,level,x,y){
 power(c,kind,x-25,y,13);
 for(let i=0;i<3;i++)box(c,x+i*20,y-7,16,14,3,i<level?(kind==='pour'?'#79e8f6':'#ffc164'):'#41332d');
}
function well(c,x,y,r,state){
 const cartoon=window.SweetsCartoonArt;
 disc(c,x,y+2,r+1,cartoon?.loaded?'#87452c':'#331d19');
 const dedicated=window.CastellaArtV303?.materials();
 const illustrated=dedicated||window.SweetsIllustratedBoardsCV275?.castellaMaterials();
 if(illustrated)c.drawImage(illustrated[state],x-r,y-r,r*2,r*2);
 else if(cartoon?.loaded)cartoon.draw(c,['castella-hole','castella-raw','castella-baked'][state],x-r,y-r,r*2,r*2);
 else if(faces)c.drawImage(faces[state],x-r,y-r,r*2,r*2);
 else disc(c,x,y,r,['#192426','#ffcf69','#bf6b2a'][state]);
}
function plate(c,x,y,w,h){
 if(window.CastellaArtV303?.griddle(c,x,y,w,h))return;
 const cartoon=window.SweetsCartoonArt;
 if(cartoon?.loaded){
  box(c,x-2,y-2,w+4,h+5,24,'#87452c');box(c,x,y,w,h,23,'#e49b3b');
  cartoon.frame(c,'castella',x,y,w,h,Math.min(w,h)*.10);return;
 }
 box(c,x-2,y-2,w+4,h+5,24,'#703e29');box(c,x,y,w,h,23,'#da9551');
 box(c,x+3,y+3,w-6,h-6,20,'#885031');
 if(art.pan.naturalWidth){
  c.save();c.beginPath();c.roundRect(x+3,y+3,w-6,h-6,20);c.clip();
  const iw=art.pan.naturalWidth,ih=art.pan.naturalHeight;
  c.drawImage(art.pan,iw*.29,ih*.32,iw*.42,ih*.36,x+3,y+3,w-6,h-6);c.restore();
 }
 for(const dx of [10,w-10])for(const dy of [11,h-11])disc(c,x+dx,y+dy,2.3,'#e2ab69');
}
function filling(c,x,y,r,p){
 if(p<=0)return;
 c.save();c.beginPath();c.arc(x,y,r*Math.min(1,p),0,TAU);c.clip();well(c,x,y,r,1);c.restore();
}
function pour(c,t){
 plate(c,15,17,490,207);
 const x=283,y=129,r=65,flow=smooth(t,.22,.39)*(1-smooth(t,.61,.69));
 well(c,x,y,r,0);filling(c,x,y,r,smooth(t,.27,.68));
 const approach=smooth(t,.06,.23),leave=smooth(t,.64,.84);
 const bx=x-22-(1-approach+leave)*42,by=y-8-(1-approach+leave)*33;
 if(flow>0){
  const end=[bx+(x-bx)*flow,by+(y-by)*flow];
  stroke(c,[bx,by],end,'#cc8e44',12);stroke(c,[bx,by],end,'#ffdd87',9);
 }
 if(t<.84){
  c.save();c.globalAlpha=approach*(1-leave);
  const cartoon=window.SweetsCartoonArt;
  if(window.CastellaArtV303?.loaded){
   const w=112,h=w*window.CastellaArtV303.dispenserRatio();window.CastellaArtV303.dispenser(c,bx,by,w,h);
  }else if(cartoon?.loaded){
   // Match the live board's generated bottle: the upper-center nozzle stays
   // anchored to the existing jet origin throughout the unchanged approach.
   const image=cartoon.sprite('castella-dispenser'),w=91*.66,h=w*image.height/image.width;
   c.translate(bx,by);c.rotate(Math.PI*.75);cartoon.draw(c,'castella-dispenser',-w/2,0,w,h);
  }else if(art.bottle.naturalWidth){
   const w=91,h=w*art.bottle.naturalHeight/art.bottle.naturalWidth;
   c.drawImage(art.bottle,bx-w*.954,by-h*.971,w,h);
  }else stroke(c,[bx-38,by-40],[bx,by],'#c4b6ab',14);
  c.restore();
 }
 badge(c,'7  HIT!',404,53,105,'#742d46','#fff4c0');
 text(c,'7',x,y+5,43,t>.44?'#622e18':'#fff0c8');
}
function channels(c){for(const [a,b] of links){
 const cartoon=window.SweetsCartoonArt?.loaded;
 stroke(c,xy[a],xy[b],cartoon?'#87452c':'#d29b69',9);stroke(c,xy[a],xy[b],cartoon?'#f3b94f':'#4c3025',5);
}}
function flow(c,t){
 plate(c,15,15,490,211);channels(c);
 const level=t<.39?1:t<.72?2:3;
 const amount=d=>d===0?1:d>level?0:smooth(t,d===1?.10:d===2?.42:.74,d===1?.30:d===2?.64:.91);
 for(const [a,b] of links){
  const da=depth.get(a),db=depth.get(b);if(da===undefined||db===undefined||da===db)continue;
  const [start,end]=da<db?[xy[a],xy[b]]:[xy[b],xy[a]],p=amount(Math.max(da,db));
  if(p)stroke(c,start,[start[0]+(end[0]-start[0])*p,start[1]+(end[1]-start[1])*p],'#ffe294',6);
 }
 for(const id of detail){
  const [x,y]=xy[id],d=depth.get(id);well(c,x,y,25,id===12?1:0);
  if(d!==undefined)filling(c,x,y,25,amount(d));if(id===origin)text(c,'7',x,y+1,22,'#683720');
 }
 badge(c,'注入力',95,47,93,'#205d73','#e9fcff');gauge(c,'pour',level,172,47);
 power(c,'pour',451,88,21);power(c,'pour',451,151,21);
 badge(c,'次から周囲'+level+'マス',365,199,185,'#205d73','#f1feff');
}
function bake(c,t){
 plate(c,15,15,490,211);channels(c);
 const [ox,oy]=xy[oven],p=smooth(t,.32,.68),level=t<.19?1:t<.37?2:3;
 if(p){c.save();c.beginPath();c.roundRect(18,18,484,205,20);c.clip();c.beginPath();c.arc(ox,oy,83*level*p,0,TAU);c.fillStyle='#ffad4a43';c.fill();c.strokeStyle='#ffb64e';c.lineWidth=3;c.stroke();c.restore();}
 for(const id of detail){
  const [x,y]=xy[id],wet=depth.has(id)||id===12;
  well(c,x,y,25,wet?1:0);
  if(hot(id,level)&&wet){
   const brown=id===oven?smooth(t,.41,.66):smooth(t,.56,.86);
   if(brown){c.save();c.globalAlpha=brown;well(c,x,y,25,2);c.restore();}
  }
 }
 text(c,'15',ox,oy+1,22,'#59301b');
 badge(c,'15  HIT!',ox,201,105,'#742d46','#fff1bc');
 badge(c,'火力',78,47,75);gauge(c,'fire',level,139,47);
 power(c,'fire',430,75,18);power(c,'fire',472,75,18);
 if(t>.67){const [x,y]=xy[13];badge(c,'生地なし',x,48,96);}
}
function payout(c,t){
 plate(c,13,19,265,201);
 const count=18+Math.floor(smooth(t,.09,.54)*8);
 for(let k=0;k<30;k++){
  const x=46+(k%6)*39,y=45+Math.floor(k/6)*32;well(c,x,y,13,k<count?2:1);
  if(k===24)power(c,'sugar',x,y,10);
 }
 badge(c,'焼き上がり '+count+'個',145,202,195);
 box(c,289,20,218,199,18,'#412923');
 text(c,'100 BET',398,44,22,'#ffe0a4');
 text(c,R.payout(count)+' WIN',398,96,40,'#ffe08a');
 c.save();c.globalAlpha=smooth(t,.51,.72);
 power(c,'sugar',346,160,21);text(c,'シュガーGET!',420,160,23,'#ffe3f9');c.restore();
}
const scenes=[pour,flow,bake,payout];
(window.SweetsAttractLessons??={}).castella={steps,draw(c,scene,t){loadArt();c.save();scenes[scene](c,t);c.restore();}};
})();
