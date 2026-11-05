/* Waffle Reversi. A numbered draw places every matching piece on the same board. */
(function(root){
 'use strict';
 const cells=Array.from({length:64},(_,i)=>i);
 const labels=Array.from({length:25},(_,i)=>i+1);
 const opposite=color=>color==='black'?'white':'black';
 const payRows=[[44,10],[48,20],[52,30],[56,50],[58,100],[60,200],[62,500],[63,1000],[64,2000]]
  .map(([count,hundredths])=>({count,hundredths}));
 const sweepBonusHundredths=3000;
 function award(count){
  const row=payRows.findLast(r=>r.count<=count);
  return (row?.hundredths||0)+(count===64?sweepBonusHundredths:0);
 }

 // A quarter is mirrored across both center lines, or repeated in both directions.
 // Each tile also admits axis swaps, reflections and interchange of the ingredients.
 const fine=[
  {name:'市松',repeat:true,tile:['1010','0101','1010','0101']},
  {name:'大市松',repeat:true,tile:['1100','1100','0011','0011']},
  {name:'折り市松',tile:['1010','0101','1010','0101']},
  {name:'籠目',repeat:true,tile:['1010','1010','0101','0101']}
 ];
 const bold=[
  {name:'双縞',tile:['1010','1010','1010','1010']},
  {name:'斜め十字',tile:['1000','0100','0010','0001']},
  {name:'十字格子',tile:['0001','0001','0001','1111']},
  {name:'大菱',tile:['0001','0011','0111','1111']},
  {name:'菱格子',tile:['0100','1001','0010','0100']},
  {name:'重ね升',tile:['1111','1000','1011','1010']}
 ];
 // Mean gross RTP (%) of each equally weighted family under the majority choice.
 // Reproduction and independent holdout measurements: .github/tests/bingo-stick.cjs.
 const fineReturn=43.91,boldReturn=188.40;
 function shuffled(values,rng){
  for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  return values;
 }
 function create({rng=Math.random,target=90}={}){
  const rate=Math.max(50,Math.min(150,Number.isFinite(target)?target:90));
  const family=rng()<(rate-fineReturn)/(boldReturn-fineReturn)?bold:fine;
  const pattern=family[Math.floor(rng()*family.length)],sym=Math.floor(rng()*8),invert=rng()<.5;
  const colors=cells.map(i=>{
   let x=i%8,y=i>>3;if(sym&1)[x,y]=[y,x];if(sym&2)x=7-x;if(sym&4)y=7-y;
   x=pattern.repeat?x%4:Math.min(x,7-x);y=pattern.repeat?y%4:Math.min(y,7-y);
   return (pattern.tile[y][x]==='1')!==invert?'black':'white';
  });
  const triples=shuffled(labels.slice(),rng).slice(0,14),numbers=shuffled([...labels,...labels,...triples],rng);
  const black=colors.filter(c=>c==='black').length;
  return {numbers,colors,counts:{black,white:64-black},draws:[],phase:'first',firstColor:rng()<.5?'black':'white',
   chosen:null,countChosen:0,patternName:pattern.name,lastColor:null,placed:[],flipped:[],totalHundredths:0,highestRole:false};
 }

 const rays=cells.map(i=>{
  const dirs=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;
   const line=[];
   for(let x=i%8+dx,y=(i>>3)+dy;x>=0&&x<8&&y>=0&&y<8;x+=dx,y+=dy)line.push(y*8+x);
   if(line.length>=2)dirs.push(line);
  }
  return dirs;
 });
 function draw(s,number){
  if((s.phase!=='first'&&s.phase!=='last')||!Number.isInteger(number)||number<1||number>25||s.draws.includes(number))return null;
  const color=s.chosen||(s.draws.length%2===0?s.firstColor:opposite(s.firstColor));
  const placed=cells.filter(i=>s.numbers[i]===number),colors=s.colors.slice();
  for(const i of placed)colors[i]=color;
  // Collect captures from the post-placement snapshot. One capture cannot start another.
  const captures=new Set();
  for(const i of placed)for(const ray of rays[i]){
   let end=0;while(end<ray.length&&colors[ray[end]]!==color)end++;
   if(end<ray.length)for(let n=0;n<end;n++)captures.add(ray[n]);
  }
  const flipped=[...captures];for(const i of flipped)colors[i]=color;
  const black=colors.filter(c=>c==='black').length,counts={black,white:64-black};
  const draws=[...s.draws,number],countChosen=s.chosen?counts[s.chosen]:0;
  return {...s,colors,counts,draws,lastColor:color,placed,flipped,countChosen,totalHundredths:award(countChosen),
   highestRole:countChosen===64,phase:draws.length===8?'done':draws.length===5?'thinking':s.phase};
 }
 function recommend(s){
  if(s.counts.black===s.counts.white)return s.firstColor;
  return s.counts.black>s.counts.white?'black':'white';
 }
 function choose(s,color){
  if(s.phase!=='thinking'||(color!=='black'&&color!=='white'))return null;
  const countChosen=s.counts[color];
  return {...s,phase:'last',chosen:color,countChosen,totalHundredths:award(countChosen),highestRole:countChosen===64};
 }
 const api={create,draw,choose,recommend,award,payRows,sweepBonusHundredths};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BingoStickRules=api;
})(globalThis);
