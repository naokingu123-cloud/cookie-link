/* BET tutorial. The middle two scenes follow the same black move at 100 BET. */
(()=>{
'use strict';
const font='"Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif';
const files={black:'waffle-reversi-ogura-v128.png',white:'waffle-reversi-butter-v128.png',wafer:'waffle-tier.webp',rail:'waffle-turn-rail.webp'};
const images={};
function sprite(c,key,x,y,w,h){
 let im=images[key];if(!im){im=images[key]=new Image();im.decoding='async';im.src='assets/'+files[key];}
 if(!im.complete||!im.naturalWidth)return false;
 c.drawImage(im,x,y,w,h);return true;
}
const ease=(x)=>{const p=Math.max(0,Math.min(1,x));return p*p*(3-2*p);};
const ramp=(t,a,b)=>ease((t-a)/(b-a));
function box(c,x,y,w,h,r,fill,stroke,lw=2){
 c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
}
function disc(c,x,y,r,fill,stroke,lw=2){
 c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
}
function label(c,value,x,y,size,ink,max,weight=850){
 c.fillStyle=ink;c.font=weight+' '+size+'px '+font;c.textAlign='center';c.textBaseline='middle';c.fillText(String(value),x,y,max);
}
function badge(c,text,x,y,w,fill='#552c2d',ink='#ffe6ad'){
 box(c,x-w/2,y-15,w,30,12,fill,'#dcad70');label(c,text,x,y,18,ink,w-8);
}
function stone(c,color,x,y,size){
 if(sprite(c,color,x-size/2,y-size/2,size,size))return;
 if(color==='black')disc(c,x,y,size*.41,'#482031','#8e5845');
 else box(c,x-size*.34,y-size*.32,size*.68,size*.64,8,'#ffe9a0','#b8853a');
}
function pocket(c,x,y,size,num){
 const r=size/2;box(c,x-r,y-r,size,size,8,'#c97f37','#f4bc6e',2);
 box(c,x-r+3,y-r+3,size-6,size-6,6,'#df9b50','#945624',2);
 if(num!=null)label(c,num,x,y+1,size*.52,'#5d301c',size-8,950);
}
function ball(c,x,y,n){
 disc(c,x,y+2,28,'#87472a');disc(c,x,y,27,'#fff0b1','#e6a040',3);
 label(c,n,x,y+1,32,'#783a21',42,950);
}
function arrow(c,x,y){
 c.beginPath();c.moveTo(x-6,y-9);c.lineTo(x+5,y);c.lineTo(x-6,y+9);c.strokeStyle='#ffcb73';c.lineWidth=4;c.lineCap='round';c.lineJoin='round';c.stroke();
}
function turnScene(c,t){
 const second=t>=.52,phase=second?(t-.52)/.48:t/.52,num=second?18:7,color=second?'white':'black',place=ramp(phase,.22,.58);
 box(c,19,7,482,65,23,'#572d32','#cd9350');
 sprite(c,'rail',20,5,480,70);
 for(let i=0;i<8;i++){
  const x=57+i*58,active=i===Number(second);
  if(active)disc(c,x,39,26,'#9c652b','#ffe894',4);
  stone(c,i%2?'white':'black',x,39,active?45:34);
 }
 const ink=second?'#50312a':'#fff0ce';
 box(c,49,108,419,110,22,'#4d2a2d','#bc8046');
 box(c,68,128,121,68,12,second?'#ffe69a':'#311e28',second?'#f7c770':'#a37262');
 label(c,'第'+(second?2:1)+'球',128,146,18,ink,108);
 label(c,second?'白・バター':'黒・小倉あん',128,173,20,ink,110);
 ball(c,239,163,num);arrow(c,298,163);
 pocket(c,375,163,70,num);
 if(place>0){c.save();c.globalAlpha=place;stone(c,color,375,163-22*(1-place),63);c.restore();}
 if(place>.85)badge(c,'HIT!',430,125,63,'#a03243','#fff2ce');
}
function bracketScene(c,t){
 const p=ramp(t,.08,.27),phases=[.36,.50,.64].map(a=>ramp(t,a,a+.13));
 const flipped=phases.filter(v=>v>=.5).length;
 badge(c,'黒番　7番 HIT!',110,32,161);
 const x=i=>71+94*i,y=111;
 for(let i=0;i<5;i++){
  pocket(c,x(i),y,80,i===0?7:null);
  if(i===0){
   if(p>0){c.save();c.globalAlpha=p;stone(c,'black',x(i),y-20*(1-p),72);c.restore();}
  }else if(i===4)stone(c,'black',x(i),y,72);
  else{
   const f=phases[i-1];
   c.save();c.translate(x(i),y-8*Math.sin(Math.PI*f));c.scale(Math.max(.06,Math.abs(Math.cos(Math.PI*f))),1);
   stone(c,f<.5?'white':'black',0,0,72);c.restore();
  }
 }
 if(p>.8){
  c.save();c.globalAlpha=ramp(t,.22,.33);c.beginPath();c.moveTo(x(0),151);c.lineTo(x(0),164);c.lineTo(x(4),164);c.lineTo(x(4),151);
  c.lineWidth=4;c.strokeStyle='#ffd071';c.lineJoin='round';c.stroke();c.restore();
 }
 badge(c,flipped+'枚反転',260,204,142,flipped===3?'#944728':'#573034','#fff0c1');
}
function tile(c,x,y,win,lit){
 if(!sprite(c,'wafer',x,y-15,156,31))box(c,x,y-15,156,31,7,'#c68439','#edb961');
 box(c,x+57,y-12,95,24,5,lit?'#8a3f20':'#532b24');
 label(c,win+' WIN',x+103,y,20,lit?'#fff49f':'#fff2cb',88);
 if(lit)box(c,x,y-15,156,31,7,null,'#ffe99d',2.5);
}
function payoutScene(c,t){
 const eject=ramp(t,.24,.55),falling=ramp(t,.48,.77),claim=ramp(t,.12,.26);
 box(c,43,12,240,217,16,'#4b2729','#cf9a59');
 label(c,'配当表の一部',163,31,17,'#ffe3a4',195);
 const y=i=>202-(i-1)*40;
 for(let i=1;i<=4;i++){
  box(c,52,y(i)-15,53,30,6,'#322027');label(c,i+'枚',78,y(i),19,'#ffe9bb',48);
 }
 c.save();c.beginPath();c.rect(110,y(4)-15,166,158);c.clip();
 for(let i=1;i<=5;i++)if(i!==3)tile(c,116,y(i)+(i>=4?40*falling:0),i*10,false);
 c.restore();
 if(eject<1){
  c.save();c.globalAlpha=1-eject;c.translate(116+172*eject,y(3)-21*Math.sin(eject*Math.PI));c.rotate(eject*-.12);tile(c,0,0,30,true);c.restore();
 }
 box(c,310,52,171,135,18,'#602e2d','#dfa454',2);
 label(c,'100 BETの例',396,78,17,'#ffe4b1',145);
 if(claim>0){
  c.save();c.globalAlpha=claim;label(c,'30 WIN',396,123,38,'#fff298',145,950);c.restore();
 }else label(c,'3枚反転',396,123,24,'#ffdfa3',140);
 if(falling>.95)label(c,'3枚枠は40 WIN',396,163,17,'#ffdaa0',159);
}
function quietScene(c,t){
 const p=ramp(t,.14,.47),q=ramp(t,.44,.68);
 box(c,11,22,244,196,18,'#502a2a','#ca9258');
 box(c,265,22,244,196,18,'#422d36','#b2806b');
 label(c,'盤面上で0枚反転',133,52,23,'#ffe4a4',217);
 label(c,'盤面にない番号',387,52,23,'#ffe4a4',217);
 pocket(c,92,121,66,7);pocket(c,170,121,66);stone(c,'black',170,121,59);
 if(p>0){c.save();c.globalAlpha=p;stone(c,'black',92,121-17*(1-p),59);c.restore();}
 ball(c,326,121,25);arrow(c,384,121);
 c.save();c.globalAlpha=.25+q*.75;stone(c,'white',449,121,62);c.restore();
 label(c,'石を置いて終了',134,181,20,'#ffe6b5',210);
 label(c,'次の手番へ',387,181,20,'#ffe6b5',205);
}
const scenes=[turnScene,bracketScene,payoutScene,quietScene];
(window.SweetsAttractLessons??={}).stick={
 steps:[
  {title:'黒と白で交互に8球',caption:'番号にHITすると、黒は小倉あん、白はバターを置く。'},
  {title:'はさんだ石を順に返す',caption:'縦・横・斜めの8方向。この例では、黒が白を3枚はさむ。'},
  {title:'返した枚数の枠が飛ぶ',caption:'3枚枠の30 WINを獲得。上の40 WINが3枚枠に落ちる。'},
  {title:'0枚なら配当表はそのまま',caption:'0枚反転は石を置いて終了。盤面外の番号は手番だけ進む。'}
 ],
 draw(c,index,t){c.save();scenes[index](c,t);c.restore();}
};
})();
