/* Six Drop v248: deterministic single-HIT rules. No DOM, wallet or network writes.
   Inject the existing staggered-grid gravity and role geometry to retain the
   approved board mechanics. A prediction clones the exact serialized RNG. */
(function(root){
'use strict';
// Keep the v247 serialization and color IDs readable by existing checkpoints.
const VERSION=247,REVISION=248,ROWS=10,CAPACITY=75,UNIT=100,CREDIT_PER_DROP=5;
const RING=['blue','aqua','green','lime','yellow','orange','red','violet','pink'];
const COLOR_PROGRESS=[0,1,2,3,4,5,6,8,7];
const BASE_PAY=Object.freeze({line:10,triangle:30,hexagon:60});
const LIMIT=Number.MAX_SAFE_INTEGER;
const integer=(n,fallback=0)=>Number.isSafeInteger(Number(n))&&Number(n)>=0?Number(n):fallback;
const copy=x=>JSON.parse(JSON.stringify(x));
const cleanCarry=value=>({version:VERSION,bankUnits:Math.min(1e14,integer(value?.bankUnits)),removed:Math.min(1e9,integer(value?.removed)),feed:Math.min(1e9,integer(value?.feed)),roundId:String(value?.roundId||'').slice(0,160)});
function palette(removed){const band=Math.min(5,Math.floor(Math.max(0,Number(removed)||0)/100));return COLOR_PROGRESS.slice(band,band+4).reverse();}
function gamePalette(state){
 if(!Array.isArray(state.palette)||state.palette.length!==4||new Set(state.palette).size!==4||state.palette.some(c=>!Number.isInteger(c)||c<0||c>=RING.length)){
  // A restored v247 checkpoint has no palette field. Freeze the window from
  // its start-of-game total once, without changing existing candies or money.
  state.palette=palette(Math.max(0,state.removedTotal-state.roundRemoved));
 }
 return state.palette;
}
function nextRandom(state){let n=state.rng|0;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0||0x6d2b79f5;return state.rng/4294967296;}
function shuffle(values,state){for(let i=values.length-1;i>0;i--){const j=Math.floor(nextRandom(state)*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;}
function asHundredths(medals,bet){if(!(bet>0))return 0;let value=medals*100/bet;if(Math.floor(bet*value/100)<medals)value+=Math.max(1,Math.abs(value))*Number.EPSILON*4;return value;}
function totalMedals(s){return Math.floor(s.bet*s.normalHundredths/100)+s.bonusMedals;}
function roleAward(type,oldCount,count=1){const base=BASE_PAY[type]||0;return base*(count*oldCount+count*(count+1)/2);}
function create(geometry){
 const G=geometry;
 for(const k of ['empty','clone','count','valid','step','neighbors','patterns','findShapes','drop','point'])if(typeof G[k]!=='function')throw Error('Six Drop geometry missing '+k);
 function connectedGroups(grid,minSize=4){
  const seen=new Set(),groups=[];
  for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){
   const tile=grid[r][c],key=r*16+c;if(!tile||seen.has(key))continue;
   const cells=[[r,c]];seen.add(key);
   for(let i=0;i<cells.length;i++)for(const [y,x]of G.neighbors(...cells[i],ROWS)){
    const next=y*16+x;if(seen.has(next)||grid[y]?.[x]?.color!==tile.color)continue;
    seen.add(next);cells.push([y,x]);
   }
   if(cells.length>=minSize)groups.push({color:tile.color,cells});
  }
  return groups;
 }
 // Check the complete connected component, including survivors on either
 // side of a new tile. Avoiding only straight lines left bent groups uncleared.
 function formsAt(grid,r,c,color){
  const cells=[[r,c]],seen=new Set([r*16+c]);
  for(let i=0;i<cells.length;i++)for(const [y,x]of G.neighbors(...cells[i],ROWS)){
   const key=y*16+x;if(seen.has(key)||grid[y]?.[x]?.color!==color)continue;
   seen.add(key);cells.push([y,x]);if(cells.length>=4)return true;
  }
  return false;
 }
 function mobility(grid,r,c){let score=0;
  for(const dx of [-.5,.5]){const up=G.step(r,c,-1,dx,ROWS);if(!G.valid(...up,ROWS)||!grid[up[0]][up[1]])continue;
   const supports=[G.step(...up,1,-.5,ROWS),G.step(...up,1,.5,ROWS)];if(supports.some(([y,x])=>!(y===r&&x===c)&&G.valid(y,x,ROWS)&&!grid[y][x]))score++;
  }return score;
 }
 function refill(state,{initial=false}={}){
  const colorsThisGame=gamePalette(state),before=G.clone(state.grid),grid=G.clone(before),fillable=[];
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
  // Every refill in this game uses the palette locked at newGame(). Crossing
  // a 100-clear threshold only changes the next game's four-color window.
  const choices=positions.map(()=>shuffle([...colorsThisGame],state));
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
  if(connectedGroups(grid).length||G.findShapes(grid).length)throw Error('Six Drop refill created a connected group or paid role');
  if(G.drop(G.clone(grid)).moves.length)throw Error('Six Drop refill left unsupported candies');
  state.grid=grid;
  return {grid,added:positions.map(([r,c])=>({r,c,tile:{...grid[r][c]}})),holes:[...chosen],mobility:targets.filter(([r,c])=>grid[r][c].number!=null&&mobility(grid,r,c)>0).length};
 }
 function newGame({bet=100,rate=90,seed=1,carry=null}={}){
  bet=integer(bet);if(!bet||bet>1e10)throw Error('Six Drop invalid BET');
  const saved=cleanCarry(carry),state={version:VERSION,rulesRevision:REVISION,palette:palette(saved.removed),bet,target:Math.max(50,Math.min(150,Number(rate)||90)),rng:(seed>>>0)||1,uid:0,grid:G.empty(ROWS),draws:[],processed:0,
   feed:saved.feed,removedTotal:saved.removed,bankUnits:saved.bankUnits,roundRemoved:0,normalHundredths:0,bonusMedals:0,counts:{line:0,triangle:0,hexagon:0},allClears:0,maxChain:0,sugarAwarded:false,sugarTarget:95+((seed>>>8)%36)};
  refill(state,{initial:true});return state;
 }
 function hit(original,number,{trace=false,preview=false}={}){
  if(original?.version!==VERSION||!Number.isInteger(number)||number<1||number>25||original.draws.includes(number)||original.draws.length>=8)return null;
  const s=copy(original),timeline=[],startWin=totalMedals(s),startRemoved=s.roundRemoved;
  gamePalette(s);s.rulesRevision=REVISION;s.draws.push(number);let chain=0,sugar=false;
  const push=(phase,extra={},ms=100)=>{if(trace)timeline.push({phase,...extra,ms,grid:G.clone(s.grid),bankUnits:s.bankUnits,normalHundredths:s.normalHundredths,bonusMedals:s.bonusMedals,counts:{...s.counts},allClears:s.allClears});};
  function remove(cells){const removed=[],progressiveCredits=[],bankUnitsBefore=s.bankUnits;for(const [r,c]of cells){
   const t=s.grid[r]?.[c];if(!t)continue;removed.push({r,c,tile:{...t}});s.grid[r][c]=null;
   const deltaUnits=s.bet*CREDIT_PER_DROP;s.roundRemoved++;s.removedTotal++;s.bankUnits+=deltaUnits;
   if(!Number.isSafeInteger(s.bankUnits)||s.bankUnits>LIMIT)throw Error('Six Drop progressive overflow');
   progressiveCredits.push({r,c,tileId:t.id,deltaUnits,bankUnits:s.bankUnits});
  }return {removed,progressiveCredits,bankUnitsBefore};
  }
  function fall(){const result=G.drop(s.grid,{trace});if(!result.moves.length)return;
   const natural=result.steps.reduce((n,x)=>n+x.ms,0)||100,scale=Math.min(1,300/natural);
   const steps=result.steps.map(x=>({...x,ms:x.ms*scale})),motionMs=steps.reduce((n,x)=>n+x.ms,0)||80;
   push('pyramidFall',{moves:result.moves,steps,motionMs,chain},Math.min(350,motionMs+35));
  }
  const cells=[];for(let r=0;r<ROWS;r++)for(let c=0;c<s.grid[r].length;c++)if(s.grid[r][c]?.number===number)cells.push([r,c]);
  push(cells.length?'pyramidHit':'pyramidMiss',{cells,numbers:[number]},70);
  if(cells.length){push('pyramidBreak',remove(cells),80);fall();}
  for(;;){
   const forms=G.findShapes(s.grid),groups=connectedGroups(s.grid);if(!forms.length&&!groups.length)break;
   if(++chain>Math.floor(CAPACITY/4))throw Error('Six Drop cascade exceeded finite board');
   const colors=new Set(forms.map(f=>f.color)),connected=new Set(groups.flatMap(g=>g.cells.map(([r,c])=>r*16+c))),cleared=[];
   for(let r=0;r<ROWS;r++)for(let c=0;c<s.grid[r].length;c++)if(s.grid[r][c]&&(colors.has(s.grid[r][c].color)||connected.has(r*16+c)))cleared.push([r,c]);
   const before=totalMedals(s),counts={line:0,triangle:0,hexagon:0};for(const f of forms)counts[f.type]++;
   push('pyramidShape',{forms,groups,cells:cleared,colors:[...colors],chain},counts.hexagon?260:counts.triangle?220:180);
   const removal=remove(cleared);
   for(const type of Object.keys(BASE_PAY)){s.normalHundredths+=roleAward(type,s.counts[type],counts[type]);s.counts[type]+=counts[type];}
   const won=totalMedals(s)-before;
   push('pyramidAward',{forms,groups,...removal,chain,gain:asHundredths(won,s.bet),winMedals:won,triangles:counts.triangle,hexagons:counts.hexagon,lines:counts.line,colors:[...colors]},130);
   fall();
  }
  const allClear=s.roundRemoved>startRemoved&&G.count(s.grid)===0;
  if(allClear){const prize=Math.floor(s.bankUnits/UNIT);s.bonusMedals+=prize;s.allClears++;push('pyramidAllClear',{chain,gain:asHundredths(prize,s.bet),winMedals:prize,forms:[]},720);}
  s.maxChain=Math.max(s.maxChain,chain);s.processed=s.draws.length;
  if(!s.sugarAwarded&&s.roundRemoved>=s.sugarTarget){s.sugarAwarded=true;sugar=true;}
  const fill=preview?{added:[]}:refill(s);
  if(fill.added.length){const rowOrder=[...new Set(fill.added.map(x=>x.r))].sort((a,b)=>b-a);push('pyramidTopUp',{added:fill.added,recolored:[],rowOrder,feed:s.feed},Math.min(580,220+rowOrder.length*32));}
  const win=totalMedals(s);
  return {state:s,timeline,chain,allClear,sugarAward:sugar,removed:s.roundRemoved-startRemoved,gain:win-startWin,totalWin:win,counts:{line:s.counts.line-original.counts.line,triangle:s.counts.triangle-original.counts.triangle,hexagon:s.counts.hexagon-original.counts.hexagon}};
 }
 function carryOut(s,roundId=''){return totalMedals(s)>0?cleanCarry({bankUnits:s.bankUnits,removed:s.removedTotal,feed:s.feed,roundId}):cleanCarry({roundId});}
 return {VERSION,REVISION,ROWS,CAPACITY,RING,BASE_PAY,CREDIT_PER_DROP,cleanCarry,palette,gamePalette,nextRandom,asHundredths,totalMedals,roleAward,newGame,hit,refill,carryOut,mobility,connectedGroups};
}
root.SweetsSixDropV247={VERSION,REVISION,create,BASE_PAY,RING,CREDIT_PER_DROP,cleanCarry,palette,gamePalette,asHundredths,roleAward};
})(typeof window!=='undefined'?window:globalThis);
