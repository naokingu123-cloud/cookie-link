/* BET-time teaching only. These fixed examples never reveal a live board. */
(()=>{
'use strict';
const R=window.DangoBingoRules,V=window.DangoBingoView;
const steps=[
 {title:'白いお団子の番号にHIT！',caption:'25個のお団子に1〜25の番号。縦・横・斜めの3マス以上をそろえて、串を通そう。'},
 {title:'緑の初期FREEにHITで配置＋1',caption:'初期FREEは0〜3個。前半5球で緑の番号にHITすると、配置できるFREEが1〜4個になります。'},
 {title:'5球のあと、赤いFREEを配置',caption:'お団子をタップしてFREE配置。もう一度タップで取り消し。未配置分は時間切れでおまかせ配置されます。'},
 {title:'赤いFREEに後半HITでODDS UP！',caption:'後半3球で配置FREEの番号にHITすると、赤い団子に金箔が付きODDS＋1。長さごとの完成本数で配当が決まり、その合計にODDS倍率を掛けます。'}
];
const first=[2,3,5,12,21],last=[4,9,14],numbers=Array.from({length:25},(_,i)=>i+1);
let buffer,lastLessonFrame;
const start=()=>R.create({moldIndex:1,initialFreeCells:[20],numbers,seed:251});
const firstFive=()=>first.reduce((s,n)=>R.draw(s,n),start());
function placed(){let s=firstFive();s=R.placeFree(s,3);return R.placeFree(s,8);}
function text(c,value,x,y,size,ink='#673d32'){c.font='900 '+size+'px ElixirNumbers,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;c.fillText(value,x,y);}
function box(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function ball(c,x,y,r,kind,number,gold=false){
 V.drawLessonDango(c,x,y,r,kind,number,gold);
}
function draw(c,scene,t){
 lastLessonFrame={c,scene,t,transform:c.getTransform?.(),width:c.canvas.width,height:c.canvas.height};
 buffer??=Object.assign(document.createElement('canvas'),{width:640,height:420});
 const g=buffer.getContext('2d');let s=start(),age=Infinity;
 if(scene===0){for(let i=0;i<Math.min(4,Math.floor(t*5));i++)s=R.draw(s,first[i]);}
 if(scene===1){s=first.slice(0,4).reduce((state,n)=>R.draw(state,n),s);if(t>.32){s=R.draw(s,21);age=(t-.32)*2600;}}
 if(scene===2){s=firstFive();if(t>.18)s=R.placeFree(s,3);if(t>.4)s=R.placeFree(s,8);if(t>.65)s=R.undoFree(s,3);if(t>.85)s=R.placeFree(s,3);}
 if(scene===3){s=R.commitFree(placed(),{autoFill:false});for(let i=0;i<3;i++)if(t>.18+i*.25){s=R.draw(s,last[i]);age=(t-(.18+i*.25))*2200;}}
 V.paint(g,s,{time:t*3500,age,lineAge:t*2200,animationLines:scene===3?s.completedLines:s.newLines,bet:100,reach:[],artUsage:'lesson'},false);
 c.save();c.drawImage(buffer,3,17,324,212);
 box(c,333,19,176,204,17,'#fff6e3');
 if(scene===0){
  text(c,'前半 5球',421,48,23);ball(c,421,112,34,'plain',first[Math.min(3,Math.floor(t*4))]);text(c,'番号にHIT！',421,175,20,'#a44f55');
 }else if(scene===1){
  text(c,'初期FREE',421,45,20,'#5c7d37');ball(c,421,102,30,'initial',21);text(c,'配置できるFREE',421,155,15,'#5c7d37');text(c,t>.32?'1 → 2 個':'1 個',421,186,27,'#5c7d37');
 }else if(scene===2){
  text(c,'FREEを配置',421,46,21,'#ae3f58');ball(c,392,103,24,s.manualFreeCells.includes(3)?'manual':'plain',4);ball(c,450,103,24,s.manualFreeCells.includes(8)?'manual':'plain',9);text(c,'あと'+s.freeRemaining+'個',421,153,25,'#ae3f58');box(c,343,177,156,29,8,'#af4868');text(c,t>.65&&t<.85?'再タップで取り消し':t>.85?'置き直しもOK':'お団子をタップ',421,192,16,'#fff7df');
 }else{
  text(c,'後半 3球',421,44,22);ball(c,421,102,32,'manual',s.oddsMultiplier>2?9:4,s.oddsMultiplier>1);text(c,'ODDS ×'+s.oddsMultiplier,421,155,24,'#ac7427');text(c,'金箔が目印！',421,189,17,'#aa772f');
 }
 c.restore();
}
// A paused BET lesson may have painted while images were still decoding. Paint
// that same fixed example again once the art is ready, preserving the diagram's
// responsive transform and never advancing a live game or the lesson clock.
V.onAssetsChanged(()=>{
 const frame=lastLessonFrame,status=window.SweetsDemoSuite?.status;
 if(!frame?.transform||!frame.c.canvas.isConnected||status?.kind!=='dango'||!status.active||frame.c.canvas.width!==frame.width||frame.c.canvas.height!==frame.height)return;
 const c=frame.c;c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,frame.width,frame.height);c.setTransform(frame.transform);draw(c,frame.scene,frame.t);c.restore();
});
(window.SweetsAttractLessons??={}).dango={steps,draw};
})();
