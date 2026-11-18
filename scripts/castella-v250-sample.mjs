/* Reproducible direct-game Monte Carlo. Uses shipped geometry, starter wells,
   switches and payouts; layout RNG and future 8/25 draw RNG are independent.
   This fast bitmask model is compared to actual immutable Rules.draw in tests. */
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export function loadRules(){const box=vm.createContext({Math});vm.runInContext(fs.readFileSync(new URL('../assets/party-castella-rules.js',import.meta.url),'utf8'),box);return box.PartyCastellaRules;}
export function random(seed){return ()=>{seed=(seed+0x6D2B79F5)|0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const mask=ids=>{let lo=0,hi=0;for(const id of ids){if(id<32)lo|=1<<id;else hi|=1<<(id-32);}return [lo,hi];};
const pop=x=>{x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return (((x+(x>>>4))&0x0F0F0F0F)*0x01010101)>>>24;};
const has=(lo,hi,id)=>id<32?!!(lo&(1<<id)):!!(hi&(1<<(id-32)));
const dist=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
export function buildModel(R,moldIndex){
 const state=R.createBoard(moldIndex,90,random(5),90,0),neighbors=state.cells.map(()=>[]);
 for(const [a,b]of state.edges){neighbors[a].push(b);neighbors[b].push(a);}
 const pour=Array.from({length:4},()=>Array(61)),heat=Array.from({length:4},()=>Array(61));
 for(const cell of state.cells)for(let radius=1;radius<=3;radius++){
  let nodes=new Set([cell.id]),frontier=new Set(nodes);
  for(let depth=0;depth<radius;depth++){const next=new Set();for(const a of frontier)for(const b of neighbors[a])if(!nodes.has(b)){nodes.add(b);next.add(b);}frontier=next;}
  pour[radius][cell.id]=mask(nodes);
  heat[radius][cell.id]=mask(state.cells.filter(other=>dist(cell,other)<=radius).map(c=>c.id));
 }
 return {state,numbered:state.cells.filter(c=>c.number!==null).map(c=>c.id),starter:mask(state.cells.filter(c=>state.wet[c.id]).map(c=>c.id)),pour,heat,specials:state.specials,pay:Array.from({length:62},(_,n)=>R.payout(n))};
}
export function evaluateAnchors(model,anchors){
 let [lo,hi]=model.starter,power=1;
 for(let ball=0;ball<5;ball++){const id=anchors[ball],m=model.pour[power][id];lo|=m[0];hi|=m[1];if(model.specials.pour.includes(id))power++;}
 const fire=1+Number(has(lo,hi,model.specials.fire[0]))+Number(has(lo,hi,model.specials.fire[1]));
 let a=0,b=0;for(let ball=5;ball<8;ball++){const m=model.heat[fire][anchors[ball]];a|=m[0];b|=m[1];}a&=lo;b&=hi;
 return {baked:pop(a)+pop(b),wet:pop(lo)+pop(hi),pourLevel:power,fireLevel:fire,sugar:has(a,b,model.specials.sugar[0])};
}
export function weights(R,target){
 const ordinary=R.molds.map((m,i)=>({m,i})).filter(x=>!x.m.festival),festival=R.molds.findIndex(m=>m.festival),share=R.FESTIVAL_SHARE;
 const adjusted=(target-share*R.molds[festival].returnPercent)/(1-share),low=ordinary.filter(x=>x.m.returnPercent<=adjusted),high=ordinary.filter(x=>x.m.returnPercent>=adjusted);
 if(!low.length||!high.length)throw new Error('Target outside calibrated brackets');
 const result=Array(R.molds.length).fill(0);result[festival]=share;
 for(const lo of low)for(const hi of high){const p=lo.i===hi.i?0:(adjusted-lo.m.returnPercent)/(hi.m.returnPercent-lo.m.returnPercent),q=(1-share)/(low.length*high.length);result[lo.i]+=q*(1-p);result[hi.i]+=q*p;}
 return result;
}
function summarize(hist,models,used,n,sugarCount){
 const pay=models[0].pay;let sum=0,squares=0,wins=0;
 for(let i=0;i<hist.length;i++){sum+=hist[i]*pay[i];squares+=hist[i]*pay[i]**2;if(pay[i])wins+=hist[i];}
 const mean=sum/n,se=Math.sqrt(Math.max(0,(squares/n-mean**2)/(n-1))),frequency=wins/n,frequencySe=Math.sqrt(frequency*(1-frequency)/n);
 return {n,returnPercent:mean,return95:[mean-1.96*se,mean+1.96*se],awardFrequency:frequency,award95:[frequency-1.96*frequencySe,frequency+1.96*frequencySe],sugarFrequency:sugarCount/n,fullBake:hist[61],hist:Array.from(hist),moldUse:Array.from(used)};
}
export function simulate(R,{n=200000,seed=9384721,moldIndex=null,target=90}={}){
 const models=R.molds.map((_,i)=>buildModel(R,i)),draw=random(seed),layout=random(seed^0x38170593),cdf=[];
 let accumulated=0;for(const weight of weights(R,target)){accumulated+=weight;cdf.push(accumulated);}
 const hist=new Uint32Array(62),used=new Uint32Array(models.length),deck=new Uint8Array(25),anchors=new Uint8Array(8);let sugarCount=0;
 for(let game=0;game<n;game++){
  let index=moldIndex;if(index===null){const pick=layout();index=0;while(index<cdf.length-1&&pick>=cdf[index])index++;}
  const model=models[index];used[index]++;
  for(let i=0;i<25;i++)deck[i]=i;
  for(let i=0;i<8;i++){const j=i+Math.floor(draw()*(25-i)),old=deck[i];deck[i]=deck[j];deck[j]=old;anchors[i]=model.numbered[deck[i]];}
  const value=evaluateAnchors(model,anchors);hist[value.baked]++;sugarCount+=Number(value.sugar);
 }
 return {target,moldIndex,seed,layoutSeed:(seed^0x38170593)>>>0,...summarize(hist,models,used,n,sugarCount)};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1];};
 const R=loadRules(),n=Number(get('--samples','200000')),seed=Number(get('--seed','9384721')),out=get('--output','');
 const mode=args.includes('--molds')?'calibration':'independent-target-validation';
 const targets=get('--targets','50,70,90,100,110,130,150').split(',').map(Number),reports=[];
 const jobs=mode==='calibration'?R.molds.map((_,moldIndex)=>({moldIndex,target:90})):targets.map(target=>({target}));
 for(let i=0;i<jobs.length;i++){
  const report=simulate(R,{n,seed:(seed+Math.imul(i+1,1013904223))>>>0,...jobs[i]});reports.push(report);
  console.error(JSON.stringify({mode,index:i,target:report.target,mold:report.moldIndex,returnPercent:report.returnPercent,awardFrequency:report.awardFrequency}));
 }
 const data={revision:250,mode,scope:'Ordinary direct medal payouts only. Uniform eight non-repeating numbers out of 25; first five pour in order, last three bake. Shared Sugar/JPC excluded. Independent layout and draw PRNG streams; finite simulation with 95% Monte Carlo intervals.',samplesPerCase:n,baseSeed:seed,script:'node scripts/castella-v250-sample.mjs '+args.join(' '),fixed:{cells:61,starter:19,numbered:25,pourUp:2,fireSwitches:2,sugar:1,graphEdges:84},payRows:JSON.parse(JSON.stringify(R.payRows)),molds:JSON.parse(JSON.stringify(R.molds)),reports};
 const json=JSON.stringify(data,null,2)+'\n';if(out)fs.writeFileSync(out,json);else process.stdout.write(json);
}
