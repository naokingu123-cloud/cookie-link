/* Winery Pyramid v232: geometric opening patterns and real fruit-layer MIX. */
(function(root){
'use strict';
const EPS=1e-9, ROWS=6, SIZE=21;
// Full-glass payout: 0–9 = 0, 10 = 0.3x, 11 = 0.6x; 12–21 unchanged.
const PAY=[0,0,0,0,0,0,0,0,0,0,.3,.6,1,1.5,2,3,4,6,10,15,30,100];
// v232: authored, mirror-symmetric six-glass openings. The visible liquid
// belongs to its real flavor and participates in MIX normally. The main
// control is spatial arrangement; total liquid stays within 4.9–5.4 cups.
const NAMES=["果実の足あと","レモンの花壇","ぶどうのリボン","レモンの王冠","メロンの花輪","白い果樹園","翠のピラミッド","ジュースの宝冠"];
const PREFILLS=[[0.95,0,0,0,0,0,0,0,0,0,0,0,0.2,0,0,0,0.95,0.95,0.95,0.95,0],[0.95,0,0,0,0,0,0,0,0,0,0,0,0.15,0,0,0.95,0,0.95,0.95,0,0.95],[0.9,0,0,0,0,0,0,0,0,0,0,0,0.9,0,0,0.9,0,0.9,0.9,0,0.9],[0,0.9,0.9,0,0,0,0,0.9,0.9,0,0,0,0,0,0,0,0.9,0,0,0.9,0],[0,0.9,0.9,0,0,0,0.9,0,0,0.9,0,0.9,0,0.9,0,0,0,0,0,0,0],[0,0.9,0.9,0,0.9,0,0,0.9,0.9,0,0,0,0.9,0,0,0,0,0,0,0,0],[0.8,0.95,0.95,0.95,0.8,0.95,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0.8,0.95,0.95,0.95,0.8,0.95,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]];
const PREFILL_FLAVORS=[[1,5,5,5,5,5,5,5,5,5,5,5,1,5,5,5,1,1,1,1,5],[4,5,5,5,5,5,5,5,5,5,5,5,1,5,5,1,5,1,1,5,1],[4,5,5,5,5,5,5,5,5,5,5,5,4,5,5,4,5,4,4,5,4],[5,1,1,5,5,5,5,1,1,5,5,5,5,5,5,5,1,5,5,1,5],[5,2,2,5,5,5,2,5,5,2,5,2,5,2,5,5,5,5,5,5,5],[5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],[2,2,2,2,2,2,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],[5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5]];
const WEIGHTS=Array(PREFILLS.length).fill(100/PREFILLS.length);
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
// Offline eight-draw means and full-glass tails are measured with the
// production pour/prize functions. There is no target-dependent multiplier
// on an actual award, no prefill-wide scaling and no future-draw inspection.
const RATE_ANCHORS=[[0,49.117495,0.17051,0.110465,0.071475,0.04381,0.025785,0.01397,0.006965,0.002945,0.001005,0.0003,7.5e-05],[1,49.18934,0.156505,0.102955,0.06593,0.040975,0.024255,0.013435,0.00705,0.00336,0.00141,0.000515,0.00025],[2,60.08807,0.19357,0.12242,0.07652,0.046845,0.0273,0.015015,0.00774,0.003585,0.001425,0.00053,0.00025],[3,88.844555,0.288995,0.20057,0.13334,0.08198,0.04615,0.02453,0.01192,0.00465,0.00142,0.00038,8e-05],[4,102.04724,0.27822,0.19188,0.12967,0.08387,0.05129,0.029655,0.016,0.00757,0.002845,0.00078,0.000155],[5,140.191535,0.503085,0.293365,0.177655,0.099785,0.051875,0.025565,0.011445,0.00452,0.0014,0.000435,9e-05],[6,153.863525,0.474065,0.333825,0.1985,0.12132,0.069145,0.036205,0.017885,0.007855,0.00285,0.000915,0.00017],[7,159.423585,0.474065,0.333825,0.1985,0.12132,0.069145,0.036205,0.017885,0.007855,0.00285,0.000915,0.00017]];
const PATTERN_CALIBRATION=[{"rounds":200000,"seed":231995,"se":0.496827258},{"rounds":200000,"seed":231995,"se":0.730079446},{"rounds":200000,"seed":231995,"se":0.783484177},{"rounds":200000,"seed":231995,"se":0.615969735},{"rounds":200000,"seed":231995,"se":0.837953475},{"rounds":200000,"seed":231995,"se":0.712804608},{"rounds":200000,"seed":231995,"se":0.926062722},{"rounds":200000,"seed":231995,"se":0.978760555}];
function patternMix(rate){
 const target=Math.max(50,Math.min(150,Number(rate)||90)),ranked=[...RATE_ANCHORS].sort((a,b)=>a[1]-b[1]);
 const lowPatterns=ranked.filter(a=>a[1]<=target).slice(-2),highPatterns=ranked.filter(a=>a[1]>target).slice(0,2);
 const mean=values=>values.reduce((sum,a)=>sum+a[1],0)/values.length;
 const low=[lowPatterns[0][0],mean(lowPatterns)],high=[highPatterns[0][0],mean(highPatterns)];
 return {low,high,lowPatterns,highPatterns,probability:(target-low[1])/(high[1]-low[1]),target};
}
function rateAnchor(rate,random=Math.random){
 const mix=patternMix(rate),roll=random(),upper=roll<mix.probability,group=upper?mix.highPatterns:mix.lowPatterns;
 // One uniform draw selects both the side and a member, so every template
 // stays reachable without extra random work or a rate-specific volume scale.
 const fraction=upper?roll/mix.probability:(roll-mix.probability)/(1-mix.probability);
 const selected=group[Math.min(group.length-1,Math.floor(fraction*group.length))];
 return {scale:1,pattern:selected[0],expected:mix.target,observed:selected[1],anchor:selected};
}
 function initial(pattern,scale=1){
   return PREFILLS[pattern].map((v,index)=>{
     const amount=Math.min(.97,Math.max(0,v*scale));
     return {volume:amount,layers:amount>EPS?[{flavor:PREFILL_FLAVORS[pattern][index],amount}]:[]};
   });
 }
 function sugarThreshold(anchor,random=Math.random){
   // Choose a threshold for the final number of full glasses, keeping the
   // mean acquisition around 10% under this particular initial fill mode.
   const target=.10,tails=anchor.slice(2);
   if(tails[0]<=target)return 11;
   for(let i=0;i<tails.length-1;i++)if(tails[i]>=target&&tails[i+1]<=target){
     const upperProbability=(target-tails[i+1])/(tails[i]-tails[i+1]);
     return random()<upperProbability?11+i:12+i;
   }
   return 10+tails.length;
 }
function choose(random){let x=random()*100;for(let i=0;i<WEIGHTS.length;i++){x-=WEIGHTS[i];if(x<0)return i;}return WEIGHTS.length-1;}
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
  const calibrated=rateAnchor(this.payoutTarget,this.random);
   this.pattern=calibrated.pattern;
   this.fillScale=calibrated.scale;this.calibratedRtp=calibrated.observed;
   this.glasses=initial(this.pattern,this.fillScale);
   this.initialVolume=this.glasses.reduce((s,g)=>s+g.volume,0);
   this.sugarTarget=sugarThreshold(calibrated.anchor,this.random);
   this.sugarAwarded=false;this.justFilled=[];
  this.fullCount=0;this.mixCount=0;this.countMultiplier=0;this.mixMultiplier=1;this.presentedMixCount=0;
  this.emit('ready');
 }
 setPayoutTarget(rate){
   rate=Number(rate);if(!Number.isFinite(rate)||rate<50||rate>150||this.running)return false;
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
  const gain=p.hundredths-this.totalHundredths,allClear=p.allFull&&this.fullCount<SIZE;
  const tier=allClear?3:p.hundredths>=1000?2:p.hundredths>=300?1:0;
  return {number,gain,total:p.hundredths,full:p.full,mix:p.mix,allClear,tier,oddsUp:p.mix>this.mixCount&&(!gain||!tier)};
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
      // MIX odds are presented on the payout table before the juice starts.
      // Real glass state and final WIN still settle only after pouring.
      if(plan.mix>this.mixCount){
       const fromMix=this.mixCount,toMix=plan.mix;
       this.fx={type:'odds',fromMix,toMix,elapsed:0,duration:950};
       this.emit('wineryOddsUp',{number:n,ball,fromMix,toMix});
       if(!await this.wait(950,token))return;
      }
      this.presentedMixCount=plan.mix;
      const duration=1100+Math.min(850,plan.flows.length*22)+Math.log2(volume)*110;
      this.fx={type:'pour',source:pos,number:n,volume,flavor,before,elapsed:0,duration};
      this.emit('wineryPour',{number:n,ball,volume,flavor});
      if(!await this.wait(duration,token))return;
      this.glasses=plan.glasses;this.wasted+=plan.wasted;this.totalPoured+=volume;
       this.refreshPrize();this.presentedMixCount=this.mixCount;this.lastGain=this.totalHundredths-previous;
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
const api={version:232,EPS,ROWS,SIZE,PAY,WEIGHTS,NAMES,PREFILLS,PREFILL_FLAVORS,FLAVORS,CELLS,RATE_ANCHORS,PATTERN_CALIBRATION,patternMix,rateAnchor,sugarThreshold,flavorFor,clone,initial,choose,prize,pour,WineryEngine};
if(typeof module==='object'&&module.exports)module.exports=api;else root.WineryPyramidCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
