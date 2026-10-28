// Uniform, without-replacement eight-ball simulation using the production rules.
// Round entry on ball 8 is NOT counted: the engine ends without creating another board.
const fs=require('fs'),crypto=require('crypto');
const src=fs.readFileSync('assets/six-candy-rounds-engine.js','utf8');
const q=new Function('Engine','motionReduced',src+';return {sixPickChanceRound,sixPickSugarRound,sixPickGapTemplate,sixMakeBoard,sixPlan,sixRoundClearBonus,sixRefillBoard};')(class{},false);
const N=Number(process.argv[2]||10000),initialSeed=Number(process.argv[3]||281028101),progress=process.argv[4];
let seed=initialSeed;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const rounds=Array.from({length:5},(_,i)=>({round:i+1,reached:0,cleared:0,normal:{reached:0,cleared:0},chance:{reached:0,cleared:0},entryDraws:{},clearDraws:{}}));
let sum=0,sq=0,refills=0;const clearCounts=Array(6).fill(0);
for(let k=0;k<N;k++){
 const chance=q.sixPickChanceRound(random),sugar=q.sixPickSugarRound(random);let r=1,g,uid=0,collected=false,pos=0,total=0;const drawn=new Set(),cleared=new Set();
 function board(){
  const stat=rounds[r-1];stat.reached++;stat[chance===r?'chance':'normal'].reached++;stat.entryDraws[pos]=(stat.entryDraws[pos]||0)+1;
  const b=q.sixMakeBoard(10,chance===r?3:4,random,uid,{holes:q.sixPickGapTemplate(random,r)});g=b.grid;uid=b.lastId;
  if(!collected&&r===sugar){const a=g.flat().filter(t=>t&&t.number==null);const pick=a[Math.floor(random()*a.length)];if(pick)pick.sugar=true;}
 }
 board();const nums=Array.from({length:25},(_,i)=>i+1);for(let i=24;i>0;i--){const j=Math.floor(random()*(i+1));[nums[i],nums[j]]=[nums[j],nums[i]];}
 for(const n of [3,2,1,1,1]){
  const batch=nums.slice(pos,pos+n),present=new Set(g.flat().filter(t=>t?.number!=null).map(t=>t.number)),miss=batch.some(n=>!present.has(n));batch.forEach(n=>drawn.add(n));
  const p=q.sixPlan(g,batch);pos+=n;g=p.grid;total+=p.gain;collected||=p.sugarAward;
  if(p.advance){
   if(!cleared.has(r)){cleared.add(r);total+=q.sixRoundClearBonus(r);const stat=rounds[r-1];stat.cleared++;stat[chance===r?'chance':'normal'].cleared++;stat.clearDraws[pos]=(stat.clearDraws[pos]||0)+1;}
   if(pos<8&&r<5){r++;board();}
  }else if(miss){const f=q.sixRefillBoard(g,chance===r?3:4,random,uid,drawn);g=f.grid;uid=f.lastId;refills++;}
 }
 clearCounts[cleared.size]++;sum+=total;sq+=total*total;
 if(progress&&(k+1)%1000===0)fs.writeFileSync(progress,JSON.stringify({completed:k+1,N}));
}
console.log(JSON.stringify({N,seed:initialSeed,engineSha256:crypto.createHash('sha256').update(src).digest('hex'),rounds,clearCounts,refills,sumHundredths:sum,sumSquaresHundredths:sq,rtp:sum/N/100}));
