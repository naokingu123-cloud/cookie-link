/* Six Drop v247: deterministic single-HIT rules. No DOM, wallet or network writes.
   Inject the existing staggered-grid gravity and role geometry to retain the
   approved board mechanics. A prediction clones the exact serialized RNG. */
(function(root){
'use strict';
const VERSION=247,ROWS=10,CAPACITY=75,UNIT=100;
const RING=['navy','aqua','green','lime','yellow','orange','red','violet'];
const BASE_PAY=Object.freeze({line:10,triangle:30,hexagon:60});
const LIMIT=Number.MAX_SAFE_INTEGER;
const integer=(n,fallback=0)=>Number.isSafeInteger(Number(n))&&Number(n)>=0?Number(n):fallback;
const copy=x=>JSON.parse(JSON.stringify(x));
const cleanCarry=value=>({version:VERSION,bankUnits:Math.min(1e14,integer(value?.bankUnits)),removed:Math.min(1e9,integer(value?.removed)),feed:Math.min(1e9,integer(value?.feed)),roundId:String(value?.roundId||'').slice(0,160)});
function palette(feed){const band=Math.floor(Math.max(0,Number(feed)||0)/CAPACITY),start=(3+band)%RING.length;return Array.from({length:4},(_,i)=>(start-i+RING.length)%RING.length);}
function nextRandom(state){let n=state.rng|0;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0||0x6d2b79f5;return state.rng/4294967296;}
function shuffle(values,state){for(let i=values.length-1;i>0;i--){const j=Math.floor(nextRandom(state)*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;}
function asHundredths(medals,bet){if(!(bet>0))return 0;let value=medals*100/bet;if(Math.floor(bet*value/100)<medals)value+=Math.max(1,Math.abs(value))*Number.EPSILON*4;return value;}
function totalMedals(s){return Math.floor(s.bet*s.normalHundredths/100)+s.bonusMedals;}
function roleAward(type,oldCount,count=1){const base=BASE_PAY[type]||0;return base*(count*oldCount+count*(count+1)/2);}
function create(geometry){
 const G=geometry;
 for(const k of ['empty','clone','count','valid','step','neighbors','patterns','findShapes','drop','point'])if(typeof G[k]!=='function')throw Error('Six Drop geometry missing '+k);
 const roles=G.patterns(ROWS).map(x=>x.cells);
 // Four consecutive candies in each of the three lattice directions.
 const sample=G.empty(ROWS);
 for(const [dr,dx] of [[0,1],[1,-.5],[1,.5]])for(let r=0;r<ROWS;r++)for(let c=0;c<sample[r].length;c++){
  const cells=[];let p=[r,c];for(let j=0;j<4;j++){cells.push(p);p=G.step(...p,dr,dx,ROWS);}if(cells.every(p=>G.valid(...p,ROWS)))roles.push(cells);
 }
 const byCell=new Map();for(const cells of roles)for(const [r,c]of cells){const key=r*16+c;if(!byCell.has(key))byCell.set(key,[]);byCell.get(key).push(cells);}
 const formsAt=(grid,r,c,color)=>(byCell.get(r*16+c)||[]).some(cells=>cells.every(([y,x])=>y===r&&x===c||grid[y]?.[x]?.color===color));
 function mobility(grid,r,c){let score=0;
  for(const dx of [-.5,.5]){const up=G.step(r,c,-1,dx,ROWS);if(!G.valid(...up,ROWS)||!grid[up[0]][up[1]])continue;
   const supports=[G.step(...up,1,-.5,ROWS),G.step(...up,1,.5,ROWS)];if(supports.some(([y,x])=>!(y===r&&x===c)&&G.valid(y,x,ROWS)&&!grid[y][x]))score++;
  }return score;
 }
 function refill(state,{initial=false}={}){
  const before=G.clone(state.grid),grid=G.clone(before),fillable=[];
  for(let r=ROWS-1;r>=0;r--)for(let c=0;c<grid[r].length;c++){
   if(grid[r][c])continue;let covered=false;const x=G.point(r,c,ROWS).x;
   for(let y=0;y<r&&!covered;y++)for(let k=0;k<before[y].length;k++)if(before[y][k]&&Math.abs(G.point(y,k,ROWS).x-x)<.999){covered=true;break;}
   if(!covered)fillable.push([r,c]);
  }
  if(!fillable.length)return {grid,added:[],holes:[],mobility:0};
  const target=Math.max(50,Math.min(150,state.target));
  const knots=[[50,.270],[75,.315],[90,.355],[100,.372],[125,.398],[150,.415]];
  let k=1;while(k<knots.length-1&&target>knots[k][0])k++;
  const lo=knots[k-1],hi=knots[k],ratio=lo[1]+(hi[1]-lo[1])*(target-lo[0])/(hi[0]-lo[0]);
  const prepared=.35+.55*(target-50)/100,templates=G.gapTemplates||[];
  const holes=templates.length&&nextRandom(state)<prepared?templates[Math.floor(nextRandom(state)*templates.length)]:[];
  const missing=new Set(fillable.map(([r,c])=>r*16+c)),chosen=new Set(holes.filter(([r,c])=>missing.has(r*16+c)).map(([r,c])=>r*16+c));
  let id=state.uid;
  const layout=()=>{const out=G.clone(before);let uid=id;for(const [r,c]of fillable)if(!chosen.has(r*16+c))out[r][c]={id:++uid,color:0,number:null};return out;};
  if(chosen.size&&G.drop(layout()).moves.length)chosen.clear();
  const positions=fillable.filter(([r,c])=>!chosen.has(r*16+c)),startFeed=state.feed;
  // Preserve surviving colors. Each NEW candy receives the color window of
  // its injection row, even if a palette boundary occurs within a refill.
  const choices=positions.map((_,i)=>shuffle(palette(startFeed+i),state));
  let visits=0;
  function place(index){
   if(index===positions.length)return true;if(++visits>16000)return false;
   const [r,c]=positions[index],colors=[...choices[index]];
   const nearby=color=>G.neighbors(r,c,ROWS).filter(([y,x])=>grid[y]?.[x]?.color===color).length;
   const cluster=nextRandom(state)<(.12+.50*ratio);
   colors.sort((a,b)=>(nearby(a)-nearby(b))*(cluster?-1:1));
   for(const color of colors){if(formsAt(grid,r,c,color))continue;grid[r][c]={id:id+index+1,color,number:null,feedRow:Math.floor((startFeed+index)*ROWS/CAPACITY)};if(place(index+1))return true;}
   grid[r][c]=null;return false;
  }
  if(!place(0))throw Error('Six Drop stable refill coloring exhausted');
  state.uid=id+positions.length;state.feed=startFeed+(initial?CAPACITY:positions.length);
  const drawn=new Set(state.draws),present=new Set(grid.flat().filter(t=>t?.number!=null).map(t=>t.number));
  const numbers=shuffle(Array.from({length:25},(_,i)=>i+1).filter(n=>!drawn.has(n)&&!present.has(n)),state);
  const targets=shuffle([...positions],state);
  // More prepared support pockets and a larger share of numbered supports at
  // high settings; rules and the payout table remain identical at every rate.
  const prefer=nextRandom(state)<.95;targets.sort((a,b)=>(mobility(grid,...a)-mobility(grid,...b))*(prefer?-1:1));
  for(const [r,c]of targets)if(numbers.length)grid[r][c].number=numbers.pop();
  if(G.findShapes(grid).length)throw Error('Six Drop refill created a paid role');
  if(G.drop(G.clone(grid)).moves.length)throw Error('Six Drop refill left unsupported candies');
  state.grid=grid;
  return {grid,added:positions.map(([r,c])=>({r,c,tile:{...grid[r][c]}})),holes:[...chosen],mobility:targets.filter(([r,c])=>grid[r][c].number!=null&&mobility(grid,r,c)>0).length};
 }
 function newGame({bet=100,rate=90,seed=1,carry=null}={}){
  bet=integer(bet);if(!bet||bet>1e10)throw Error('Six Drop invalid BET');
  const saved=cleanCarry(carry),state={version:VERSION,bet,target:Math.max(50,Math.min(150,Number(rate)||90)),rng:(seed>>>0)||1,uid:0,grid:G.empty(ROWS),draws:[],processed:0,
   feed:saved.feed,removedTotal:saved.removed,bankUnits:saved.bankUnits,roundRemoved:0,normalHundredths:0,bonusMedals:0,counts:{line:0,triangle:0,hexagon:0},allClears:0,maxChain:0,sugarAwarded:false,sugarTarget:95+((seed>>>8)%36)};
  refill(state,{initial:true});return state;
 }
 function hit(original,number,{trace=false,preview=false}={}){
  if(original?.version!==VERSION||!Number.isInteger(number)||number<1||number>25||original.draws.includes(number)||original.draws.length>=8)return null;
  const s=copy(original),timeline=[],startWin=totalMedals(s),startRemoved=s.roundRemoved;
  s.draws.push(number);let chain=0,sugar=false;
  const push=(phase,extra={},ms=100)=>{if(trace)timeline.push({phase,...extra,ms,grid:G.clone(s.grid),bankUnits:s.bankUnits,normalHundredths:s.normalHundredths,bonusMedals:s.bonusMedals,counts:{...s.counts},allClears:s.allClears});};
  function remove(cells){const removed=[];for(const [r,c]of cells){const t=s.grid[r]?.[c];if(!t)continue;removed.push({r,c,tile:{...t}});s.grid[r][c]=null;}
   s.roundRemoved+=removed.length;s.removedTotal+=removed.length;s.bankUnits+=removed.length*s.bet;
   if(!Number.isSafeInteger(s.bankUnits)||s.bankUnits>LIMIT)throw Error('Six Drop progressive overflow');return removed;
  }
  function fall(){const result=G.drop(s.grid,{trace});if(!result.moves.length)return;
   const natural=result.steps.reduce((n,x)=>n+x.ms,0)||100,scale=Math.min(1,300/natural);
   const steps=result.steps.map(x=>({...x,ms:x.ms*scale})),motionMs=steps.reduce((n,x)=>n+x.ms,0)||80;
   push('pyramidFall',{moves:result.moves,steps,motionMs,chain},Math.min(350,motionMs+35));
  }
  const cells=[];for(let r=0;r<ROWS;r++)for(let c=0;c<s.grid[r].length;c++)if(s.grid[r][c]?.number===number)cells.push([r,c]);
  push(cells.length?'pyramidHit':'pyramidMiss',{cells,numbers:[number]},70);
  if(cells.length){const removed=remove(cells);push('pyramidBreak',{removed},80);fall();}
  for(;;){
   const forms=G.findShapes(s.grid);if(!forms.length)break;if(++chain>8)throw Error('Six Drop color cascade did not terminate');
   const colors=new Set(forms.map(f=>f.color)),cleared=[];
   for(let r=0;r<ROWS;r++)for(let c=0;c<s.grid[r].length;c++)if(s.grid[r][c]&&colors.has(s.grid[r][c].color))cleared.push([r,c]);
   const before=totalMedals(s),counts={line:0,triangle:0,hexagon:0};for(const f of forms)counts[f.type]++;
   push('pyramidShape',{forms,cells:cleared,colors:[...colors],chain},counts.hexagon?260:counts.triangle?220:180);
   const removed=remove(cleared);
   for(const type of Object.keys(BASE_PAY)){s.normalHundredths+=roleAward(type,s.counts[type],counts[type]);s.counts[type]+=counts[type];}
   const won=totalMedals(s)-before;
   push('pyramidAward',{forms,removed,chain,gain:asHundredths(won,s.bet),winMedals:won,triangles:counts.triangle,hexagons:counts.hexagon,lines:counts.line,colors:[...colors]},130);
   fall();
  }
  const allClear=cells.length>0&&G.count(s.grid)===0;
  if(allClear){const prize=Math.floor(s.bankUnits/UNIT);s.bonusMedals+=prize;s.allClears++;push('pyramidAllClear',{chain,gain:asHundredths(prize,s.bet),winMedals:prize,forms:[]},720);}
  s.maxChain=Math.max(s.maxChain,chain);s.processed=s.draws.length;
  if(!s.sugarAwarded&&s.roundRemoved>=s.sugarTarget){s.sugarAwarded=true;sugar=true;}
  const fill=preview?{added:[]}:refill(s);
  if(fill.added.length){const rowOrder=[...new Set(fill.added.map(x=>x.r))].sort((a,b)=>b-a);push('pyramidTopUp',{added:fill.added,recolored:[],rowOrder,feed:s.feed},Math.min(580,220+rowOrder.length*32));}
  const win=totalMedals(s);
  return {state:s,timeline,chain,allClear,sugarAward:sugar,removed:s.roundRemoved-startRemoved,gain:win-startWin,totalWin:win,counts:{line:s.counts.line-original.counts.line,triangle:s.counts.triangle-original.counts.triangle,hexagon:s.counts.hexagon-original.counts.hexagon}};
 }
 function carryOut(s,roundId=''){return totalMedals(s)>0?cleanCarry({bankUnits:s.bankUnits,removed:s.removedTotal,feed:s.feed,roundId}):cleanCarry({roundId});}
 return {VERSION,ROWS,CAPACITY,RING,BASE_PAY,cleanCarry,palette,nextRandom,asHundredths,totalMedals,roleAward,newGame,hit,refill,carryOut,mobility};
}
root.SweetsSixDropV247={VERSION,create,BASE_PAY,RING,cleanCarry,palette,asHundredths,roleAward};
})(typeof window!=='undefined'?window:globalThis);
