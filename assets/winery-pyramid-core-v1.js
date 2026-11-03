/* Winery Pyramid v72. Ten or more full cups required for a payout; MIX is a multiplier only. */
(function(root){
'use strict';
const EPS=1e-9, ROWS=6, SIZE=21;
// Full-glass payout: 0–9 = 0, 10 = 0.3x, 11 = 0.6x; 12–21 unchanged.
const PAY=[0,0,0,0,0,0,0,0,0,0,.3,.6,1,1.5,2,3,4,6,10,15,30,100];
const WEIGHTS=[16,16,16,17,19,16];
const NAMES=['りんごの雫','双翼の果樹園','中央の泉','ジュースの花冠','果実のリボン','夕映えの王冠'];
const PREFILLS=[
[.25,.25,.25,0,.5,0,0,.25,.25,0,0,0,.25,0,0,.25,0,0,0,0,.25],
[0,.5,.5,.25,0,.25,0,.25,.25,0,.25,0,0,0,.25,0,.25,0,0,.25,0],
[.5,.25,.25,0,.25,0,.25,0,0,.25,0,.5,0,.5,0,0,0,.25,.25,0,0],
[.25,0,0,.25,.5,.25,0,.25,.25,0,.25,0,.25,0,.25,0,.25,0,0,.25,0],
[0,.25,.25,.5,0,.5,.25,0,0,.25,0,.25,.5,.25,0,.25,0,0,0,0,.25],
[.5,0,0,.25,.25,.25,0,.5,.5,0,.25,0,0,0,.25,0,.25,0,0,.25,0]
];
const FLAVORS=[{name:'りんご',color:'#f05e67',light:'#ffc4a8'},
{name:'レモン',color:'#ffd539',light:'#fff4a2'},
{name:'メロン',color:'#50cc79',light:'#d0ffb4'},
{name:'ソーダ',color:'#41c8f5',light:'#ccfaff'},
{name:'ぶどう',color:'#a569e7',light:'#e8bdff'},
{name:'白ジュース',color:'#f7f3e9',light:'#ffffff'}];
const CELLS=[];
for(let r=0;r<ROWS;r++)for(let c=0;c<=r;c++)CELLS.push({r,c,id:r*(r+1)/2+c});
const flavorFor=ball=>ball<=3?0:ball<=5?1:ball===6?2:ball===7?3:4;
const clone=glasses=>glasses.map(g=>({volume:g.volume,layers:g.layers.map(x=>({...x}))}));
// v72 calibration: 250,000-game legacy means corrected with paired
// 32,000-game estimates of the 7-11 FULL award differences. Additional
// 2.05-2.25 scales use paired 70,000-game estimates to cover MENU 150%.
// Physical FULL-count tail probabilities are unchanged for old scales.
// These values describe expected RTP, not guaranteed game outcomes.
const RATE_ANCHORS=[[0,21.411,0.0954,0.0636,0.0393,0.0231],[0.1,30.869,0.0955,0.0637,0.0396,0.0233],[0.25,33.289,0.0994,0.0661,0.042,0.0251],[0.5,38.092,0.1129,0.0738,0.0473,0.0284],[0.75,43.352,0.1253,0.0818,0.0533,0.0327],[0.85,48.492,0.1418,0.0918,0.0588,0.0358],[0.95,50.592,0.1465,0.0957,0.0612,0.0376],[1,58.258,0.1731,0.1106,0.0694,0.042],[1.1,60.54,0.1772,0.1132,0.0713,0.0434],[1.2,66.221,0.1866,0.121,0.0773,0.0479],[1.35,78.295,0.221,0.144,0.0906,0.0554],[1.45,80.843,0.2256,0.1476,0.0934,0.0572],[1.55,86.743,0.2358,0.1558,0.1001,0.0618],[1.65,94.921,0.252,0.1663,0.1069,0.066],[1.75,102.365,0.266,0.1783,0.1157,0.0721],[1.85,109.856,0.2803,0.189,0.1236,0.0767],[1.95,113.693,0.2873,0.1943,0.1278,0.0796],[2.05,140.732,0.34837,0.24381,0.16367,0.1021],[2.15,151.282,0.37931,0.26063,0.17266,0.10676],[2.25,160.887,0.39056,0.27186,0.18326,0.11496]];
function rateAnchor(rate,random=Math.random){
   const target=Math.max(50,Math.min(150,Number(rate)||90));
   let j=1;while(j<RATE_ANCHORS.length-1&&RATE_ANCHORS[j][1]<target)j++;
   const a=RATE_ANCHORS[j-1],b=RATE_ANCHORS[j];
   const fraction=Math.max(0,Math.min(1,(target-a[1])/(b[1]-a[1])));
   const selected=random()<fraction?b:a;
   return {scale:selected[0],expected:target,observed:selected[1],anchor:selected};
 }
 function initial(pattern,scale=1){
   return PREFILLS[pattern].map(v=>{
     const amount=Math.min(.97,Math.max(0,v*scale));
     return {volume:amount,layers:amount>EPS?[{flavor:5,amount}]:[]};
   });
 }
 function sugarThreshold(anchor,random=Math.random){
   // Choose a threshold for the final number of full glasses, keeping the
   // mean acquisition around 10% under this particular initial fill mode.
   const target=.10,tails=[anchor[2],anchor[3],anchor[4],anchor[5]];
   if(tails[0]<=target)return 11;
   for(let i=0;i<3;i++)if(tails[i]>=target&&tails[i+1]<=target){
     const upperProbability=(target-tails[i+1])/(tails[i]-tails[i+1]);
     return random()<upperProbability?11+i:12+i;
   }
   return 14;
 }
function choose(random){let x=random()*100;for(let i=0;i<6;i++){x-=WEIGHTS[i];if(x<0)return i;}return 5;}
function prize(glasses){
 let full=0,mix=0;
 for(const g of glasses)if(g.volume>=1-EPS){full++;if(new Set(g.layers.filter(l=>l.amount>EPS).map(l=>l.flavor)).size>=2)mix++;}
 // MIX is a final odds multiplier, not a free-standing WIN award:
 // three full mixed glasses => base payout ×1.3; five => ×1.5.
 const mixTenths=10+mix,baseHundredths=Math.round(PAY[full]*100);
 return {full,mix,countMultiplier:PAY[full],mixMultiplier:mixTenths/10,
   hundredths:Math.round(baseHundredths*mixTenths/10),allFull:full===SIZE};
}
function pour(glasses,source,amount,flavor){
 if(!Number.isInteger(source)||source<0||source>=SIZE||!Number.isFinite(amount)||amount<0||!Number.isInteger(flavor)||flavor<0||flavor>4)throw Error('Invalid winery pour');
 const next=clone(glasses),incoming=Array(SIZE).fill(0),flows=[];
 incoming[source]=amount;let wasted=0;
 for(const {r,c,id} of CELLS){
  const received=incoming[id];if(received<=EPS)continue;
  const g=next[id],take=Math.min(received,Math.max(0,1-g.volume));
  if(take>EPS){
   const top=g.layers[g.layers.length-1];
   if(top&&top.flavor===flavor)top.amount+=take;else g.layers.push({flavor,amount:take});
   g.volume=Math.min(1,g.volume+take);
  }
  const excess=Math.max(0,received-take);
  if(excess>EPS){
   if(r===ROWS-1){wasted+=excess;flows.push({from:id,to:-1,amount:excess});}
   else{
    const child=(r+1)*(r+2)/2+c;
    incoming[child]+=excess/2;incoming[child+1]+=excess/2;
    flows.push({from:id,to:child,amount:excess/2},{from:id,to:child+1,amount:excess/2});
   }
  }
 }
 return {glasses:next,flows,wasted,incoming,...prize(next)};
}
class WineryEngine{
 constructor({random=Math.random,sleep=ms=>new Promise(r=>setTimeout(r,ms)),onEvent=()=>{},speed=1.4}={}){
  this.random=random;this.sleep=sleep;this.onEvent=onEvent;this.speed=speed;
  this.kind='winery';this.gameName='ワイナリーピラミッド';this.drawMode='single';this.reachMode='single';this.colorCount=5;
  this.version=0;this.cycle=0;this.roundBet=3000;this.payoutTarget=90;this.reset();
 }
 emit(phase,data={}){if(!['drawpending','queued','stepcollect','sugaraward'].includes(phase))this.phase=phase;this.onEvent({phase,...data},this);}
 reset(){
  this.version++;this.cycle++;this.running=false;this.busy=false;this.opening=false;this.paused=false;this.presentationRate=1;
  this.queue=[];this.pendingDraws=new Set();this.drawn=new Set();this.seen=new Set();this.hits=new Set();this.accepted=0;this.processed=0;
  this.power=1;this.boostCount=0;this.lastNumber=null;this.lastGain=0;this.fx=null;this.wasted=0;this.totalPoured=0;
  this.totalHundredths=0;this.maxLink=0;this.maxChain=0;this.allClears=0;this.roundCleared=0;this.roundSteps=0;this.roundHammers=0;
  this.wonderCollected=false;this.wonderToken=null;this.board=[];
  const nums=Array.from({length:25},(_,i)=>i+1);
  for(let i=24;i>0;i--){const j=Math.floor(this.random()*(i+1));[nums[i],nums[j]]=[nums[j],nums[i]];}
  this.nodeNumbers=nums.slice(0,SIZE);this.boostNumbers=nums.slice(SIZE);
  this.pattern=choose(this.random);
   const calibrated=rateAnchor(this.payoutTarget,this.random);
   this.fillScale=calibrated.scale;this.calibratedRtp=calibrated.observed;
   this.glasses=initial(this.pattern,this.fillScale);
   this.initialVolume=this.glasses.reduce((s,g)=>s+g.volume,0);
   this.sugarTarget=sugarThreshold(calibrated.anchor,this.random);
   this.sugarAwarded=false;this.justFilled=[];
  this.fullCount=0;this.mixCount=0;this.countMultiplier=0;this.mixMultiplier=1;
  this.emit('ready');
 }
 setPayoutTarget(rate){
   if(!Number.isInteger(rate)||rate<50||rate>150||this.running)return false;
   this.payoutTarget=rate;this.reset();return true;
 }
 get idle(){return !this.busy&&!this.queue.length;}
 start(){if(this.running||this.roundBet<=0)return;this.running=true;this.emit('waiting');}
 previewDraw(n){if(!this.running||this.seen.has(n)||this.pendingDraws.has(n))return false;this.pendingDraws.add(n);this.emit('drawpending',{number:n});return true;}
 enqueueBatch(numbers){
  if(!this.running||!Array.isArray(numbers)||!numbers.length||this.accepted+numbers.length>8||new Set(numbers).size!==numbers.length||numbers.some(n=>!Number.isInteger(n)||n<1||n>25||this.seen.has(n)))return false;
  for(const n of numbers)this.seen.add(n);this.accepted+=numbers.length;this.queue.push(numbers.slice());
  this.emit('queued',{numbers});if(!this.busy)this.drain();return true;
 }
 async wait(ms,token){
  let left=ms;while(left>0&&token===this.version){await this.sleep(25);if(!this.paused){const step=25*Math.max(.5,this.speed)*Math.max(1,this.presentationRate||1);left-=step;if(this.fx)this.fx.elapsed=Math.min(this.fx.duration,this.fx.elapsed+step);}}
  return token===this.version;
 }
 refreshPrize(){const p=prize(this.glasses);this.fullCount=p.full;this.mixCount=p.mix;this.countMultiplier=p.countMultiplier;this.mixMultiplier=p.mixMultiplier;this.totalHundredths=p.hundredths;this.maxLink=p.full;this.roundCleared=p.full;this.allClears=p.allFull?1:0;return p;}
 predict(number){
  const pos=this.nodeNumbers.indexOf(number);
  // Reach preview after 8 balls is read-only: a hypothetical extra glass hit
   // can be evaluated, but enqueueBatch still forbids any ninth real draw.
   if(pos<0||this.seen.has(number))return {number,gain:0,total:this.totalHundredths,tier:0};
  const p=pour(this.glasses,pos,this.power,flavorFor(this.processed+1));
  return {number,gain:p.hundredths-this.totalHundredths,total:p.hundredths,full:p.full,mix:p.mix,allClear:p.allFull,tier:p.allFull?3:p.hundredths>=1000?2:p.hundredths>=300?1:0};
 }
 async drain(){
  if(this.busy)return;this.busy=true;const token=this.version;
  try{
   while(this.queue.length&&token===this.version){
    for(const n of this.queue.shift()){
     this.drawn.add(n);this.pendingDraws.delete(n);this.lastNumber=n;
     const pos=this.nodeNumbers.indexOf(n),ball=this.processed+1;
     if(pos<0){
      this.power=Math.min(16,this.power*2);this.boostCount++;
      this.fx={type:'boost',number:n,power:this.power,elapsed:0,duration:650};
      this.emit('wineryBoost',{number:n,power:this.power,ball});
      if(!await this.wait(650,token))return;
     }else{
      const before=clone(this.glasses),volume=this.power,flavor=flavorFor(ball),plan=pour(before,pos,volume,flavor),previous=this.totalHundredths;
      this.hits.add(pos);
      const duration=1100+Math.min(850,plan.flows.length*22)+Math.log2(volume)*110;
      this.fx={type:'pour',source:pos,number:n,volume,flavor,before,elapsed:0,duration};
      this.emit('wineryPour',{number:n,ball,volume,flavor});
      if(!await this.wait(duration,token))return;
      this.glasses=plan.glasses;this.wasted+=plan.wasted;this.totalPoured+=volume;
       this.refreshPrize();this.lastGain=this.totalHundredths-previous;
       this.justFilled=plan.glasses.map((g,i)=>g.volume>=1-EPS&&before[i].volume<1-EPS?i:-1).filter(i=>i>=0);
       this.fx=null;
       this.emit('wineryAward',{gain:this.lastGain,full:this.fullCount,mix:this.mixCount,justFilled:this.justFilled.slice()});
       if(!this.sugarAwarded&&this.fullCount>=this.sugarTarget){
         this.sugarAwarded=true;this.wonderCollected=true;this.roundSteps=1;
         const step={id:this.version*100+this.processed+1,
           value:Math.max(1,this.roundBet),tier:Math.max(1,Math.min(5,Math.ceil(this.roundBet/1000))),
           kind:'winery',source:'full-glass'};
         this.wonderToken=step;
         this.emit('stepcollect',{steps:[step]});
         this.emit('sugaraward',{steps:[step],full:this.fullCount});
       }
      if(plan.allFull){this.emit('wineryAllFull');if(!await this.wait(850,token))return;}
     }
     this.fx=null;this.processed++;this.emit('settled',{number:n,ball});
    }
   }
   if(token!==this.version)return;
   if(this.processed===8){
    if(this.beforeComplete)await this.beforeComplete(token);
    if(token!==this.version)return;
    this.busy=false;this.running=false;this.emit('complete');
   }else{this.busy=false;this.emit('waiting');}
  }catch(error){if(token===this.version){this.fx=null;this.queue=[];this.busy=false;this.running=false;this.emit('error',{message:error.message});}}
 }
}
const api={version:75,EPS,ROWS,SIZE,PAY,WEIGHTS,NAMES,PREFILLS,FLAVORS,CELLS,RATE_ANCHORS,rateAnchor,sugarThreshold,flavorFor,clone,initial,choose,prize,pour,WineryEngine};
if(typeof module==='object'&&module.exports)module.exports=api;else root.WineryPyramidCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
