/* BET-time teaching only. These fixed examples never reveal a live board. */
(()=>{
'use strict';
const R=window.DangoBingoRules,V=window.DangoBingoView,TAU=Math.PI*2;
const steps=[
 {title:'白いお団子の番号にHIT！',caption:'25個のお団子に1〜25の番号。縦・横・斜めの3マス以上をそろえて、串を通そう。'},
 {title:'緑の初期FREEにHITで配置＋1',caption:'初期FREEは0〜3個。前半5球で緑の番号にHITすると、配置できるFREEが1〜4個になります。'},
 {title:'5球のあと、赤いFREEを配置',caption:'シンキングタイムにお団子を選んで「配置完了」。未配置分は時間切れでおまかせ配置されます。'},
 {title:'赤いFREEに後半HITでODDS UP！',caption:'後半3球で配置FREEの番号にHITすると、赤い団子に金箔が付きODDS＋1。長さごとの完成本数で配当が決まり、その合計にODDS倍率を掛けます。'}
];
const first=[2,3,5,12,21],last=[4,9,14],numbers=Array.from({length:25},(_,i)=>i+1);
let buffer;
const start=()=>R.create({moldIndex:1,initialFreeCells:[20],numbers,seed:251});
const firstFive=()=>first.reduce((s,n)=>R.draw(s,n),start());
function placed(){let s=firstFive();s=R.placeFree(s,3);return R.placeFree(s,8);}
function text(c,value,x,y,size,ink='#673d32'){c.font='900 '+size+'px ElixirNumbers,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;c.fillText(value,x,y);}
function box(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function ball(c,x,y,r,kind,number,gold=false){
 const colors=kind==='initial'?['#f1f8d7','#a9c970','#628546']:kind==='manual'?['#ffe4e3','#e77e83','#b64755']:['#fff','#f6f0e8','#c2b6a5'];
 const g=c.createRadialGradient(x-r*.25,y-r*.3,0,x,y,r);g.addColorStop(0,colors[0]);g.addColorStop(.7,colors[1]);g.addColorStop(1,colors[2]);c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
 if(gold){c.strokeStyle='#d3a236';c.lineWidth=3;c.stroke();for(let i=0;i<6;i++){const a=i*TAU/6;c.fillStyle=i%2?'#f9e394':'#d4a033';c.fillRect(x+Math.cos(a)*r*.7-2,y+Math.sin(a)*r*.7-1,4,2);}}
 text(c,String(number),x,y+1,r*1.05,'#62392e');
}
function draw(c,scene,t){
 buffer??=Object.assign(document.createElement('canvas'),{width:640,height:420});
 const g=buffer.getContext('2d');let s=start(),age=Infinity;
 if(scene===0){for(let i=0;i<Math.min(4,Math.floor(t*5));i++)s=R.draw(s,first[i]);}
 if(scene===1){s=first.slice(0,4).reduce((state,n)=>R.draw(state,n),s);if(t>.32){s=R.draw(s,21);age=(t-.32)*2600;}}
 if(scene===2){s=firstFive();if(t>.18)s=R.placeFree(s,3);if(t>.53)s=R.placeFree(s,8);}
 if(scene===3){s=R.commitFree(placed(),{autoFill:false});for(let i=0;i<3;i++)if(t>.18+i*.25){s=R.draw(s,last[i]);age=(t-(.18+i*.25))*2200;}}
 V.paint(g,s,{time:t*3500,age,lineAge:t*2200,animationLines:scene===3?s.completedLines:s.newLines,bet:100,reach:[]},false);
 c.save();c.drawImage(buffer,3,17,324,212);
 box(c,333,19,176,204,17,'#fff6e3');
 if(scene===0){
  text(c,'前半 5球',421,48,23);ball(c,421,112,34,'plain',first[Math.min(3,Math.floor(t*4))]);text(c,'番号にHIT！',421,175,20,'#a44f55');
 }else if(scene===1){
  text(c,'初期FREE',421,45,20,'#5c7d37');ball(c,421,102,30,'initial',21);text(c,'配置できるFREE',421,155,15,'#5c7d37');text(c,t>.32?'1 → 2 個':'1 個',421,186,27,'#5c7d37');
 }else if(scene===2){
  text(c,'FREEを配置',421,46,21,'#ae3f58');ball(c,392,103,24,'manual',4);ball(c,450,103,24,'manual',9);text(c,s.manualFreeCells.length+' / 2 個',421,153,25,'#ae3f58');box(c,355,177,132,29,8,'#af4868');text(c,t>.53?'配置完了！':'お団子を選ぼう',421,192,17,'#fff7df');
 }else{
  text(c,'後半 3球',421,44,22);ball(c,421,102,32,'manual',s.oddsMultiplier>2?9:4,s.oddsMultiplier>1);text(c,'ODDS ×'+s.oddsMultiplier,421,155,24,'#ac7427');text(c,'金箔が目印！',421,189,17,'#aa772f');
 }
 c.restore();
}
(window.SweetsAttractLessons??={}).dango={steps,draw};
})();
