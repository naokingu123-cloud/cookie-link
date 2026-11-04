/* Bingo Waffle. Cell indices are row-major, and state snapshots can be reused by previews. */
(function(root){
 'use strict';
 const cells=Array.from({length:64},(_,i)=>i);
 const numbers=Array.from({length:25},(_,i)=>i+1);
 const patterns=[
  {name:'対角の端',cells:[0,63]},
  {name:'向かい合わせ',cells:[10,53]},
  {name:'平行スティック',cells:[11,43]},
  {name:'段ちがい',cells:[18,29]}
 ];
 const axes=[],through=cells.map(()=>[]);
 for(const [dx,dy] of [[1,0],[0,1]]){
  for(const i of cells){
   const x=i%8,y=i>>3,px=x-dx,py=y-dy;
   if(px>=0&&px<8&&py>=0&&py<8)continue;
   const axis=[];
   for(let u=x,v=y;u>=0&&u<8&&v<8;u+=dx,v+=dy)axis.push(v*8+u);
   if(axis.length<2)continue;
   axes.push(axis);
   axis.forEach((cell,at)=>through[cell].push({axis,at}));
  }
 }
 // Marginals below length 8 never exceed the base of the next category.
 // Extending a winning run must never reduce the player's displayed award.
 const marginal={
  5:[20,40,60,80,100],
  6:[100,200,300,400,500],
  7:[500,700,800,1000],
  8:[1000,3000,6000,15000,25000,50000,100000,200000]
 };
 const award=(length,count)=>{
  const row=marginal[length];if(!row||count<=0)return 0;
  let sum=0;for(let n=0;n<count;n++)sum+=row[Math.min(n,row.length-1)];
  return sum;
 };
 function shuffle(a,rng){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
 }
 function filled(s){
  const mask=new Uint8Array(64);
  for(const i of s.initialFree)mask[i]=1;
  for(const i of s.hits)mask[i]=1;
  for(const i of s.placedFree)mask[i]=1;
  return mask;
 }
 function evaluate(s){
  const mask=filled(s),lines=[],counts={5:0,6:0,7:0,8:0};let longest=0;
  for(const axis of axes){
   let start=0;
   for(let i=0;i<=axis.length;i++){
    if(i<axis.length&&mask[axis[i]])continue;
    const length=i-start;
    if(length>longest)longest=length;
    if(length>=5){lines.push({length,cells:axis.slice(start,i)});counts[length]++;}
    start=i+1;
   }
  }
  let baseHundredths=0;
  for(let k=5;k<=8;k++)baseHundredths+=award(k,counts[k]);
  return {...s,lines,counts,longest,baseHundredths,totalHundredths:Math.round(baseHundredths*s.oddsMultiplier)};
 }
 function create({rng=Math.random}={}){
  const triples=shuffle(numbers.slice(),rng).slice(0,14);
  const board=shuffle([...numbers,...numbers,...triples],rng);
  const pattern=patterns[Math.floor(rng()*patterns.length)],sym=Math.floor(rng()*8);
  const initialFree=pattern.cells.map(i=>{
   let x=i%8,y=i>>3;if(sym&1)[x,y]=[y,x];if(sym&2)x=7-x;if(sym&4)y=7-y;
   return 8*y+x;
  });
  return evaluate({numbers:board,initialFree,patternName:pattern.name,placedFree:[],hits:[],draws:[],freeBudget:0,oddsMultiplier:1,oddsUpCells:[],phase:'first'});
 }
 function draw(s,n){
  if((s.phase!=='first'&&s.phase!=='last')||!Number.isInteger(n)||n<1||n>25||s.draws.includes(n))return null;
  const newHits=cells.filter(i=>s.numbers[i]===n);
  const oddsUpCells=newHits.filter(i=>s.initialFree.includes(i)||s.placedFree.includes(i));
  const oddsMultiplier=s.oddsMultiplier+oddsUpCells.length/2;
  const next=evaluate({...s,draws:[...s.draws,n],hits:[...s.hits,...newHits],oddsUpCells,oddsMultiplier});
  if(next.draws.length===5){next.phase='thinking';next.freeBudget=next.longest;}
  if(next.draws.length===8)next.phase='done';
  return next;
 }
 function place(s,cell){
  if(s.phase!=='thinking'||!Number.isInteger(cell)||cell<0||cell>=64||s.hits.includes(cell)||s.initialFree.includes(cell))return null;
  if(s.placedFree.includes(cell))return evaluate({...s,placedFree:s.placedFree.filter(i=>i!==cell)});
  if(s.placedFree.length>=s.freeBudget)return null;
  return evaluate({...s,placedFree:[...s.placedFree,cell]});
 }
 // Greedy fallback for timeouts. Rank only visible runs; later roulette draws are unknown.
 function suggest(s){
  const mask=filled(s);let best=-1,bestScore=-1;
  for(const cell of cells){
   if(mask[cell])continue;
   let gain=0,shape=0;
   for(const {axis,at} of through[cell]){
    let lo=at,hi=at;
    while(lo>0&&mask[axis[lo-1]])lo--;
    while(hi+1<axis.length&&mask[axis[hi+1]])hi++;
    const left=at-lo,right=hi-at,length=left+right+1;
    if(left>=5)gain-=award(left,s.counts[left])-award(left,s.counts[left]-1);
    if(right>=5)gain-=award(right,s.counts[right])-award(right,s.counts[right]-1);
    if(length>=5)gain+=award(length,s.counts[length]+1)-award(length,s.counts[length]);
    shape+=length*length*length;
   }
   const score=gain*10000+shape;
   if(score>bestScore){best=cell;bestScore=score;}
  }
  return best;
 }
 function confirm(s){
  if(s.phase!=='thinking')return null;
  let next=s;
  while(next.placedFree.length<next.freeBudget)next=place(next,suggest(next));
  return {...next,phase:'last'};
 }
 const api={create,draw,place,confirm,award,evaluate};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BingoStickRules=api;
})(globalThis);
