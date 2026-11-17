/* Native Canvas, redrawn only for new settlements, options or resize. */
(()=>{
'use strict';const canvas=document.getElementById('payout-trend-v242');if(!canvas)return;
const ctx=canvas.getContext('2d'),range=document.getElementById('trend-range-v242'),tip=document.getElementById('trend-tooltip-v242'),summary=document.getElementById('trend-summary-v242');
const series={input:{label:'IN',color:'#73d8ff'},output:{label:'OUT',color:'#ffacbe'},po:{label:'実測P/O',color:'#ffe179',percent:true},hg:{label:'H/G',color:'#8ae4ad'},rollingPo:{label:'直近10G P/O',color:'#d4b0ff',percent:true}};
let data={points:[]},signature='',frame=0,points=[],plot=null;
const number=n=>Number(n).toLocaleString('ja-JP',{useGrouping:false,maximumFractionDigits:1});
const clock=t=>new Date(t).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
const compact=n=>Math.abs(n)>=10000?(n/10000).toLocaleString('ja-JP',{useGrouping:false,maximumFractionDigits:1})+'万':number(n);
function enabled(){return [...document.querySelectorAll('[data-series]')].filter(x=>x.checked&&series[x.dataset.series]).map(x=>x.dataset.series);}
function request(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
function update(value){if(!value||!Array.isArray(value.points))return;const next=JSON.stringify(value);if(next===signature)return;signature=next;data=value;request();}
function draw(){
 const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),dpr=Math.min(2,devicePixelRatio||1);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const small=w<300,font=small?6:8;ctx.font=font+'px system-ui';ctx.fillStyle='#a4c5da';
 points=data.points.slice(-Math.max(1,Number(range.value)||30));
 if(!points.length){ctx.textAlign='center';ctx.fillText('確定ゲームの精算待ち',w/2,h/2);summary.textContent='確定値のみ・取消ゲームは除外';plot=null;return;}
 const keys=enabled(),last=points.at(-1);
 summary.textContent='IN '+number(last.input)+' / OUT '+number(last.output)+' / P/O ';
 const poValue=document.createElement('strong');
 poValue.textContent=last.po==null?'—':number(last.po)+'%';
 const spectrum=window.SweetsMonitorLedgerV241?.spectrum?.(last.po);
 if(spectrum){poValue.style.color=spectrum;poValue.style.textShadow='0 0 5px '+spectrum;}
 summary.append(poValue);
 if(last.partial)summary.append('（精算中）');
 const left=small?28:45,right=small?23:38,top=14,bottom=small?24:30,pw=Math.max(1,w-left-right),ph=Math.max(1,h-top-bottom);
 const amounts=keys.filter(k=>!series[k].percent).flatMap(k=>points.map(p=>p[k]).filter(Number.isFinite)),percents=keys.filter(k=>series[k].percent).flatMap(k=>points.map(p=>p[k]).filter(Number.isFinite));
 let min=Math.min(0,...amounts),max=Math.max(1,...amounts),pmax=Math.max(100,...percents);if(max!==min)max+=(max-min)*.08;pmax*=1.08;
 const x=i=>left+(points.length===1?.5:i/(points.length-1))*pw,y=(v,pct)=>top+ph-(pct?v/pmax:(v-min)/(max-min))*ph;
 plot={left,right: w-right,top,bottom:h-bottom};
 ctx.lineWidth=.5;ctx.strokeStyle='#365469';ctx.textBaseline='middle';
 for(let i=0;i<=4;i++){
  const yy=top+ph*i/4;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(w-right,yy);ctx.stroke();
  ctx.fillStyle='#88b4cf';ctx.textAlign='right';ctx.fillText(compact(max-(max-min)*i/4),left-4,yy);
  ctx.fillStyle=window.SweetsMonitorLedgerV241?.spectrum?.(pmax*(1-i/4))||'#e7d389';ctx.textAlign='left';ctx.fillText(number(pmax*(1-i/4))+'%',w-right+3,yy);
 }
 ctx.textAlign='left';ctx.fillStyle='#91b5cc';ctx.fillText('メダル累計',left,5);ctx.textAlign='right';ctx.fillText('P/O',w-right,5);
 const ticks=Math.min(points.length,small?3:6),used=new Set();
 for(let k=0;k<ticks;k++){
  const i=ticks===1?0:Math.round(k*(points.length-1)/(ticks-1));if(used.has(i))continue;used.add(i);
  ctx.textAlign='center';ctx.fillStyle='#adc9db';ctx.fillText('G'+points[i].game,x(i),h-bottom+9);ctx.fillStyle='#688ea6';ctx.fillText(clock(points[i].at),x(i),h-bottom+font+12);
 }
 for(const key of keys){
  const s=series[key];ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=s.percent?1.6:1.2;ctx.setLineDash(key==='rollingPo'?[4,2]:[]);ctx.beginPath();let started=false;
  for(let i=0;i<points.length;i++){const v=points[i][key];if(!Number.isFinite(v)){started=false;continue;}if(started)ctx.lineTo(x(i),y(v,s.percent));else{ctx.moveTo(x(i),y(v,s.percent));started=true;}}
  ctx.stroke();const v=last[key];if(Number.isFinite(v)){ctx.beginPath();ctx.arc(x(points.length-1),y(v,s.percent),2,0,Math.PI*2);ctx.fill();}
 }
 ctx.setLineDash([]);
}
for(const e of document.querySelectorAll('[data-series]')){e.style.accentColor=series[e.dataset.series]?.color;e.addEventListener('change',request);}
range.addEventListener('change',request);
canvas.addEventListener('pointermove',event=>{
 if(!plot||!points.length)return;const rect=canvas.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(event.clientX-rect.left-plot.left)/(plot.right-plot.left))),p=points[Math.round(fraction*(points.length-1))];
 tip.hidden=false;tip.textContent='G'+p.game+'　'+new Date(p.at).toLocaleString('ja-JP')+'\nIN '+number(p.input)+'　OUT '+number(p.output)+'　H/G '+number(p.hg)+'\n実測P/O '+(p.po==null?'—':number(p.po)+'%')+'　直近10G '+(p.rollingPo==null?'—':number(p.rollingPo)+'%')+'\n今回 IN '+number(p.roundIn)+' / OUT '+number(p.roundOut)+(p.partial?'（一部参加者の精算待ち）':'');
});
canvas.addEventListener('pointerleave',()=>{tip.hidden=true;});
if(typeof ResizeObserver==='function')new ResizeObserver(request).observe(canvas.parentElement);else addEventListener('resize',request);
window.SweetsPayoutTrendV242={update,draw};request();
})();
