/* Fixed BET examples. The lesson never reads a live board or a future ball. */
(()=>{
'use strict';
const R=window.DangoBingoRules,V=window.DangoBingoView,individual=R.REVISION>=265;
const steps=[
 {title:'7段・28個のお団子をそろえよう',caption:'上から1〜7個の7段。番号1〜25が1個ずつと初期FREEが3個。2〜7個のラインから、どの長さを完成させるか考えよう。'},
 {title:'前半5球でFREEの範囲が決まる',caption:individual?'前半5球で完成した最長2～7個ラインと同じ数のFREEを1個ずつ配置。役がなければ1個。初期FREE3個も判定に含みます。':'前半5球で3個ラインなら中心1マス、4個ラインなら周囲1マス、5個ラインなら周囲2マスをFREEにできます。複数成立時は長いラインを優先。'},
 {title:'中心を選んで、まとめてFREE！',caption:individual?'FREEは1粒ずつ自由に置く。短い3本と長い1〜2本が互角の局面もあります。初期FREEへの重ね置きでODDS＋1。':'中心を1つタップすると範囲全体をFREEに。中心も含みます。同じ中心を再タップで取り消し、別の中心へ置き直しもできます。初期FREEに重なった分はODDS＋1。'},
 {title:'配置FREEへの後半HITでODDS UP',caption:'後半3球で配置したFREEの番号にHITすると、1個につきODDS＋1。長さごとの完成本数で配当を選び、合計にODDSを反映します。'}
];
let buffer,lastLessonFrame;
const start=()=>R.create({seed:individual?265:264,moldIndex:individual?0:2,target:90});
function firstFor(state,count=2){const line=individual?[1,3,6,10,15].map(id=>state.numbers[id]):state.cells.filter(cell=>cell.row===4&&cell.number>0).map(cell=>cell.number);return [...line.slice(0,count),...Array.from({length:25},(_,i)=>i+1).filter(n=>!line.includes(n)).slice(0,Math.max(0,5-count))];}
function firstFive(count=2){let state=start();for(const n of firstFor(state,count))state=R.draw(state,n);return state;}
function centerFor(state){
 const initial=new Set(state.initialFreeCells),centers=R.availableCenters?.(state)||[],footprint=id=>R.expansionCellsFor?.(state,id)||[id];
 return centers.slice().sort((a,b)=>footprint(b).filter(id=>initial.has(id)).length-footprint(a).filter(id=>initial.has(id)).length||a-b)[0];
}
function placed(){const state=firstFive(individual?5:2);if(individual)return R.autoPlace(state);const center=centerFor(state);return Number.isInteger(center)?R.placeFree(state,center):state;}
function text(c,value,x,y,size,ink='#673d32'){c.font='900 '+size+'px ElixirNumbers,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;c.fillText(value,x,y);}
function box(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
const ball=(c,x,y,r,kind,number,rainbow=false)=>V.drawLessonDango(c,x,y,r,kind,number,rainbow);
function draw(c,scene,t){
 lastLessonFrame={c,scene,t,transform:c.getTransform?.(),width:c.canvas.width,height:c.canvas.height};
 buffer??=Object.assign(document.createElement('canvas'),{width:640,height:420});
 const g=buffer.getContext('2d');let state=start(),age=Infinity,center=null,lastNumber=null;
 if(scene===0){for(const n of firstFor(state,0).slice(0,Math.min(4,Math.floor(t*5))))state=R.draw(state,n);}
 if(scene===1)state=firstFive(individual?Math.min(5,1+Math.floor(t*5)):Math.min(3,1+Math.floor(t*3)));
 if(scene===2){
  state=firstFive(individual?5:2);
  if(individual){const planned=R.autoPlace(state).manualFreeCells;const n=t<=.2?0:Math.min(planned.length,1+Math.floor((t-.2)*planned.length));for(const id of planned.slice(0,n))state=R.placeFree(state,id);if(t>.67&&t<.85&&state.manualFreeCells.length)state=R.undoFree(state,state.manualFreeCells[0]);center=planned[0]??null;}
  else{center=centerFor(state);if(t>.20&&Number.isInteger(center))state=R.placeFree(state,center);if(t>.67&&t<.85&&Number.isInteger(center))state=R.undoFree(state,center);}
 }
 if(scene===3){
  state=R.commitFree(placed(),{autoFill:false});
  const remaining=Array.from({length:25},(_,i)=>i+1).filter(n=>!state.draws.includes(n));
  const expansion=state.manualFreeCells.map(id=>state.numbers[id]).filter(n=>n>0&&remaining.includes(n));
  const final=[...new Set([...expansion,...remaining])].slice(0,3);
  for(let i=0;i<3;i++)if(t>.18+i*.25){state=R.draw(state,final[i]);lastNumber=final[i];age=(t-(.18+i*.25))*2200;}
 }
 V.paint(g,state,{time:t*3500,age,lineAge:t*2200,animationLines:scene===3?state.completedLines:state.newLines,bet:100,reach:[],artUsage:'lesson',previewCells:scene===2&&t<=.2&&Number.isInteger(center)?R.expansionCellsFor(state,center):[]},false);
 c.save();c.drawImage(buffer,3,17,324,212);box(c,333,19,176,204,17,'#fff6e3');
 if(scene===0){
  text(c,'番号25 ＋ FREE3',421,45,17);ball(c,392,103,27,'plain',12);ball(c,450,103,27,'initial',0);text(c,'1・2・3・4・5・6・7段',421,163,14);text(c,'3方向に串を通そう',421,190,16,'#a44f55');
 }else if(scene===1){
  text(c,'ライン完成でFREE昇格',421,45,17,'#5c7d37');
  const grade=state.expansionLevel||0,completed=new Set(state.qualifiedEarlyLengths||[]);
  for(const [i,length] of (individual?[2,4,7]:[3,4,5]).entries())ball(c,370+i*51,94,20,completed.has(length)?'hit':'plain',length);
  text(c,individual?(completed.size?grade+'個ライン成立':'ラインなし'):grade?([null,'3個','4個','5個'][grade]+'ライン成立'):'成立なし',421,151,20,'#5c7d37');text(c,individual?'FREE '+grade+'個を配置':(['FREEなし','中心のみ','周囲1マス','周囲2マス'][grade]),421,185,17,'#5c7d37');
 }else if(scene===2){
  text(c,individual?'好きなマスへ個別FREE':'中心から広がる',421,46,individual?17:20,'#8a6512');ball(c,421,103,31,'manual',state.cells[center]?.number||1);text(c,individual?'配置'+state.manualFreeCells.length+' / '+state.freeBudget+'個':'周囲2マス（最大19個）',421,153,17,'#8a6512');
  box(c,342,177,158,30,8,'#93621c');text(c,t>.67&&t<.85?'再タップで取り消し':t>.85?'置き直しもOK':individual?'個別の団子をFREEへ':'中心もFREE',421,192,16,'#fff7df');
 }else{
  text(c,'後半 3球',421,44,22);ball(c,421,102,32,'manual',lastNumber||state.cells[state.manualFreeCells[0]]?.number||1,!!lastNumber);text(c,'ODDS ×'+state.oddsMultiplier,421,155,24,'#ac7427');text(c,'重なり・後半HITで＋1',421,190,14,'#8154a9');
 }
 c.restore();
}
// Repaint paused examples after their art decodes; never advance lesson time.
V.onAssetsChanged(()=>{
 const frame=lastLessonFrame,status=window.SweetsDemoSuite?.status;
 if(!frame?.transform||!frame.c.canvas.isConnected||status?.kind!=='dango'||!status.active||frame.c.canvas.width!==frame.width||frame.c.canvas.height!==frame.height)return;
 const c=frame.c;c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,frame.width,frame.height);c.setTransform(frame.transform);draw(c,frame.scene,frame.t);c.restore();
});
(window.SweetsAttractLessons??={}).dango={steps,draw};
})();
