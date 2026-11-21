/* Six Drop: deterministic revisioned single-HIT and grouped rules.
   No DOM, wallet or network writes.
   Inject the existing staggered-grid gravity and role geometry to retain the
   approved board mechanics. A prediction clones the exact serialized RNG. */
(function(root){
'use strict';
// Keep the v247 serialization and color IDs readable by existing checkpoints.
const VERSION=247,REVISION=248,GROUPED_REVISION=278,ROUNDED_REVISION=280,SINGLE_REVISION=283,BALANCED_REVISION=284,FIXED_PALETTE_REVISION=285,CURRENT_REVISION=FIXED_PALETTE_REVISION,ROWS=10,CAPACITY=75,UNIT=100,CREDIT_PER_DROP=5,CREDIT_PER_DROP_V284=.2,CREDIT_PER_DROP_V285=.4,COLOR_STEP_V284=200;
const BATCH_SIZES=Object.freeze([3,2,1,1,1]);
const RING=['blue','aqua','green','lime','yellow','orange','red','violet','pink'];
const COLOR_PROGRESS=[0,1,2,3,4,5,6,8,7];
const BASE_PAY=Object.freeze({line:10,triangle:30,hexagon:60});
const BASE_PAY_V278=Object.freeze({line:20,triangle:60,hexagon:120});
// Cumulative role payouts in hundredths of BET. The first five rows use
// familiar values; later rows keep nondecreasing gains in equally clean units.
const ROLE_PAY_TABLE_V280=Object.freeze({
 line:Object.freeze([0,20,50,150,250,400]),
 triangle:Object.freeze([0,50,200,400,750,1250]),
 hexagon:Object.freeze([0,100,400,800,1500,2500])
});
const ROLE_TAIL_STEP_V280=Object.freeze({line:50,triangle:250,hexagon:500});
const SUPPORT_TABLE_V278=Object.freeze([[50,.23],[90,.57],[100,.615],[150,.9]].map(row=>Object.freeze(row)));
// Revision 284 calibrates the actual seven-cell single-ball mechanics. Payouts
// are the same at every setting; only prospective color cohesion varies.
const ROLE_PAY_TABLE_V284=Object.freeze({
 line:Object.freeze([0,10,20,50,100,200]),
 triangle:Object.freeze([0,20,100,200,400,750]),
 hexagon:Object.freeze([0,50,200,400,750,1250])
});
const ROLE_TAIL_STEP_V284=Object.freeze({line:50,triangle:100,hexagon:250});
const NUMBER_BIAS_V284=.16;
// v285 places numbers mainly through a symmetric perimeter/inside balance.
// The residual row preference is far smaller than the old 0.16 per row.
const NUMBER_EDGE_BIAS_V285=.4;
const NUMBER_ROW_BIAS_V285=Object.freeze([[50,.10],[90,.06],[150,.04]].map(row=>Object.freeze(row)));
const COLOR_COHESION_V285=Object.freeze([[50,0],[90,.02],[150,.075]].map(row=>Object.freeze(row)));
const COLOR_COHESION_V284=Object.freeze([[50,.0235],[75,.10555],[90,.13223],[100,.15295],[125,.19317],[150,.22354]].map(row=>Object.freeze(row)));
// Whole-medal flooring changes which low-BET rounds earn carry. These anchors
// compensate in board generation, keeping the visible payout table unchanged.
const COLOR_COHESION_LOW_BET_V284=Object.freeze({
 1:Object.freeze([[50,.09726],[75,.16071],[90,.19879],[100,.21733],[125,.26284],[150,.305]].map(row=>Object.freeze(row))),
 2:Object.freeze([[50,.06666],[75,.13714],[90,.17355],[100,.18928],[125,.22832],[150,.26066]].map(row=>Object.freeze(row))),
 3:Object.freeze([[50,.07366],[75,.14344],[90,.17925],[100,.19458],[125,.23302],[150,.26486]].map(row=>Object.freeze(row))),
 5:Object.freeze([[50,.0483],[75,.1271],[90,.165],[100,.17685],[125,.2098],[150,.24272]].map(row=>Object.freeze(row)))
});
const LIMIT=Number.MAX_SAFE_INTEGER;
const integer=(n,fallback=0)=>Number.isSafeInteger(Number(n))&&Number(n)>=0?Number(n):fallback;
const copy=x=>JSON.parse(JSON.stringify(x));
const cleanCarry=value=>({version:VERSION,bankUnits:Math.min(1e14,integer(value?.bankUnits)),removed:Math.min(1e9,integer(value?.removed)),feed:Math.min(1e9,integer(value?.feed)),roundId:String(value?.roundId||'').slice(0,160)});
function palette(removed,stateOrRevision=REVISION){
 const total=Math.max(0,Number(removed)||0);
 if(revisionOf(stateOrRevision)>=BALANCED_REVISION){
  const band=Math.floor(total/COLOR_STEP_V284)%COLOR_PROGRESS.length;
  return Array.from({length:4},(_,index)=>COLOR_PROGRESS[(band+index)%COLOR_PROGRESS.length]).reverse();
 }
 const band=Math.min(5,Math.floor(total/100));return COLOR_PROGRESS.slice(band,band+4).reverse();
}
function gamePalette(state){
 // New game locks its four colours at start: later 200-drop boundaries
 // affect the NEXT round only. Historic revision284 keeps its old rule.
 if(revisionOf(state)>=FIXED_PALETTE_REVISION){
  if(!Array.isArray(state.palette)||state.palette.length!==4)state.palette=palette(Math.max(0,state.removedTotal-state.roundRemoved),state);
  return state.palette;
 }
 if(revisionOf(state)>=BALANCED_REVISION){state.palette=palette(state.removedTotal,state);return state.palette;}
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
function totalMedals(s){
 const normal=modernRules(s)?Object.keys(BASE_PAY).reduce((sum,type)=>sum+Math.floor(s.bet*roleTotal(type,s.counts[type],s)/100),0):Math.floor(s.bet*s.normalHundredths/100);
 return normal+s.bonusMedals;
}
const revisionOf=value=>Number(typeof value==='object'?value?.rulesRevision:value)||REVISION;
const modernRules=value=>revisionOf(value)>=GROUPED_REVISION;
const isGrouped=value=>revisionOf(value)>=GROUPED_REVISION&&revisionOf(value)<SINGLE_REVISION;
const normalizedRevision=value=>revisionOf(value)>=FIXED_PALETTE_REVISION?FIXED_PALETTE_REVISION:revisionOf(value)>=BALANCED_REVISION?BALANCED_REVISION:revisionOf(value)>=SINGLE_REVISION?SINGLE_REVISION:revisionOf(value)>=ROUNDED_REVISION?ROUNDED_REVISION:modernRules(value)?GROUPED_REVISION:REVISION;
function roleTotal(type,count,stateOrRevision=CURRENT_REVISION){
 const n=integer(count);
 if(revisionOf(stateOrRevision)>=ROUNDED_REVISION){
  const balanced=revisionOf(stateOrRevision)>=BALANCED_REVISION,table=(balanced?ROLE_PAY_TABLE_V284:ROLE_PAY_TABLE_V280)[type];if(!table)return 0;
  if(n<table.length)return table[n];
  const tail=n-5;
  return table[5]+(table[5]-table[4])*tail+(balanced?ROLE_TAIL_STEP_V284:ROLE_TAIL_STEP_V280)[type]*Math.floor(tail*tail/4);
 }
 const base=(modernRules(stateOrRevision)?BASE_PAY_V278:BASE_PAY)[type]||0;
 return base*(n*(n+1)/2+(modernRules(stateOrRevision)&&n>0?Math.floor((n-1)*(n-1)/4):0));
}
function roleAward(type,oldCount,count=1,stateOrRevision=REVISION){return roleTotal(type,integer(oldCount)+integer(count),stateOrRevision)-roleTotal(type,integer(oldCount),stateOrRevision);}
// Omitted revision retains the old grouped helper contract. New scheduling
// always passes the saved state so 278/280 games finish their original groups.
function batchSize(processed,stateOrRevision=GROUPED_REVISION){
 if(!isGrouped(stateOrRevision))return Number.isInteger(processed)&&processed>=0&&processed<8?1:0;
 let end=0;for(const size of BATCH_SIZES){if(processed===end)return size;end+=size;}return 0;
}
function creditPerDrop(stateOrRevision=REVISION){return revisionOf(stateOrRevision)>=FIXED_PALETTE_REVISION?CREDIT_PER_DROP_V285:revisionOf(stateOrRevision)>=BALANCED_REVISION?CREDIT_PER_DROP_V284:CREDIT_PER_DROP;}
function creditUnitsForDrop(bet,removedBefore,stateOrRevision=REVISION){
 if(revisionOf(stateOrRevision)<BALANCED_REVISION)return bet*CREDIT_PER_DROP;
 if(revisionOf(stateOrRevision)>=FIXED_PALETTE_REVISION){
  // 0.004 BET per removed candy in exact integer 1/100-medal ledger units.
  const cursor=integer(removedBefore)%5;
  return Math.floor(bet*(cursor+1)*2/5)-Math.floor(bet*cursor*2/5);
 }
 // Credit exactly 1/5 of a hundredth BET per drop, using existing cumulative
 // removals as the remainder cursor. Integer units survive every legacy ledger.
 const cursor=integer(removedBefore)%5;
 return Math.floor(bet*(cursor+1)/5)-Math.floor(bet*cursor/5);
}
function numberPlacementBias(rate,stateOrRevision=BALANCED_REVISION){
 if(revisionOf(stateOrRevision)>=FIXED_PALETTE_REVISION){
  const target=Math.max(50,Math.min(150,Number(rate)||90));
  for(let i=1;i<NUMBER_ROW_BIAS_V285.length;i++){
   const [from,a]=NUMBER_ROW_BIAS_V285[i-1],[to,b]=NUMBER_ROW_BIAS_V285[i];
   if(target<=to)return a+(b-a)*(target-from)/(to-from);
  }
  return NUMBER_ROW_BIAS_V285.at(-1)[1];
 }
 return NUMBER_BIAS_V284;
}
function colorCohesion(rate,bet=100,stateOrRevision=BALANCED_REVISION){
 const target=Math.max(50,Math.min(150,Number(rate)||90));
 if(revisionOf(stateOrRevision)>=FIXED_PALETTE_REVISION){
  for(let i=1;i<COLOR_COHESION_V285.length;i++){
   const [from,a]=COLOR_COHESION_V285[i-1],[to,b]=COLOR_COHESION_V285[i];
   if(target<=to)return a+(b-a)*(target-from)/(to-from);
  }
  return COLOR_COHESION_V285.at(-1)[1];
 }
 const interpolate=table=>{
  for(let index=1;index<table.length;index++){
   const [low,from]=table[index-1],[high,to]=table[index];
   if(target<=high)return from+(to-from)*(target-low)/(high-low);
  }
  return table.at(-1)[1];
 };
 const wager=Math.max(1,Number(bet)||100);
 if(wager>=10)return interpolate(COLOR_COHESION_V284);
 // Integer payout floors create distinct carry thresholds: line x4 at1BET,
 // x3 at2–4BET, x2 at5–9BET, x1 at10+BET. They are not monotone in1/BET.
 // 2/4 share exact proportional half-BET awards;3needs a small compensation.
 const group=wager===1?1:wager===3?3:wager<5?2:5;
 return interpolate(COLOR_COHESION_LOW_BET_V284[group]);
}
function supportProbability(rate,stateOrRevision=CURRENT_REVISION){
 if(revisionOf(stateOrRevision)>=BALANCED_REVISION)return 0;
 const target=Math.max(50,Math.min(150,Number(rate)||90));
 if(!modernRules(stateOrRevision))return .35+.55*(target-50)/100;
 for(let index=1;index<SUPPORT_TABLE_V278.length;index++){
  const [low,from]=SUPPORT_TABLE_V278[index-1],[high,to]=SUPPORT_TABLE_V278[index];
  if(target<=high)return from+(to-from)*(target-low)/(high-low);
 }
 return SUPPORT_TABLE_V278.at(-1)[1];
}
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
  // Historical revisions use the calibrated share of support pockets.
  // Fixed-colour rounds tune board cohesion instead of creating a visible
  // row bias in numbered cells. Historical rounds retain prior placement.
  const prepared=supportProbability(target,state),templates=G.gapTemplates||[];
  const holes=templates.length&&nextRandom(state)<prepared?templates[Math.floor(nextRandom(state)*templates.length)]:[];
  const missing=new Set(fillable.map(([r,c])=>r*16+c)),chosen=new Set(holes.filter(([r,c])=>missing.has(r*16+c)).map(([r,c])=>r*16+c));
  let id=state.uid;
  const layout=(places=fillable.filter(([r,c])=>!chosen.has(r*16+c)))=>{const out=G.clone(before);let uid=id;for(const [r,c]of places)out[r][c]={id:++uid,color:0,number:null};return out;};
  if(chosen.size&&G.drop(layout()).moves.length)chosen.clear();
  let positions=fillable.filter(([r,c])=>!chosen.has(r*16+c));const startFeed=state.feed,blocked=new Set();
  // Historical rounds keep their start-of-game palette. Revision 284 changes
  // only newly poured drops at each cumulative 200-clear boundary; surviving
  // candies keep their original colors, including during a carried game.
  let choices=positions.map(()=>shuffle([...colorsThisGame],state)),visits=0,failedCell=null,furthest=0;
  function place(index){
   if(index===positions.length)return true;if(++visits>16000)return false;
   furthest=Math.max(furthest,index);
   const [r,c]=positions[index],colors=[...choices[index]];
   const nearby=color=>G.neighbors(r,c,ROWS).filter(([y,x])=>grid[y]?.[x]?.color===color).length;
   const cluster=nextRandom(state)<(revisionOf(state)>=BALANCED_REVISION?colorCohesion(target,state.bet,state):.04);
   colors.sort((a,b)=>(nearby(a)-nearby(b))*(cluster?-1:1));
   let fits=false;
   for(const color of colors){if(formsAt(grid,r,c,color))continue;fits=true;grid[r][c]={id:id+index+1,color,number:null,feedRow:Math.floor((startFeed+index)*ROWS/CAPACITY)};if(place(index+1))return true;}
   if(!fits&&!failedCell)failedCell=[r,c];
   grid[r][c]=null;return false;
  }
  while(!place(0)){
   // Four surviving triples can forbid every color at one exposed pocket.
   // Keep that pocket open instead of recoloring survivors or auto-clearing a
   // refill. Remove only NEW candies that would fall into the open pocket;
   // the original settled board is never moved or changed by this fallback.
   // Each retry removes at least one position, so there are at most 75 tries.
   const [r,c]=failedCell||positions[Math.min(furthest,positions.length-1)],key=r*16+c;
   // Prefer retaining the original height over adding optional template gaps
   // when a mandatory color pocket has already removed some upper supports.
   blocked.add(key);chosen.clear();positions=fillable.filter(([y,x])=>!blocked.has(y*16+x));
   for(;;){
    const result=G.drop(layout(positions));if(!result.moves.length)break;
    const addedIds=new Set(positions.map((_,i)=>id+i+1)),moving=new Set(result.moves.filter(m=>addedIds.has(m.id)).map(m=>m.id));
    // The input was stable. If an unexpected old-only motion is ever found,
    // restoring it without additions is the conservative finite fallback.
    if(!moving.size){for(const [y,x]of positions)blocked.add(y*16+x);positions=[];break;}
    positions=positions.filter(([y,x],i)=>{if(!moving.has(id+i+1))return true;blocked.add(y*16+x);return false;});
   }
   for(let y=0;y<grid.length;y++)grid[y]=before[y].map(t=>t?{...t}:null);
   choices=positions.map(()=>shuffle([...colorsThisGame],state));visits=0;failedCell=null;furthest=0;
  }
  state.uid=id+positions.length;state.feed=startFeed+(initial?CAPACITY:positions.length);
  const drawn=new Set(state.draws),present=new Set(grid.flat().filter(t=>t?.number!=null).map(t=>t.number));
  const numbers=shuffle(Array.from({length:25},(_,i)=>i+1).filter(n=>!drawn.has(n)&&!present.has(n)),state);
  const targets=shuffle([...positions],state);
  // Number labels are a shuffle of every remaining undrawn value. Existing
  // surviving labels are never changed or duplicated during refills.
  const prefer=nextRandom(state)<.95;
  if(revisionOf(state)>=BALANCED_REVISION){
   // v285 removes the deterministic numbered-row preference. Colour
   // placement and gaps remain the source of P/O variation.
   const bias=numberPlacementBias(target,state),scores=new Map(targets.map(cell=>{
    const [row,col]=cell,edge=Math.min(row,ROWS-1-row,col,grid[row].length-1-col);
    const balanced=revisionOf(state)>=FIXED_PALETTE_REVISION;
    return [cell,nextRandom(state)+bias*row+(balanced?NUMBER_EDGE_BIAS_V285*edge:0)];
   }));
   targets.sort((a,b)=>scores.get(a)-scores.get(b));
  }else targets.sort((a,b)=>(mobility(grid,...a)-mobility(grid,...b))*(prefer?-1:1));
  for(const [r,c]of targets)if(numbers.length)grid[r][c].number=numbers.pop();
  if(connectedGroups(grid).length||G.findShapes(grid).length)throw Error('Six Drop refill created a connected group or paid role');
  if(G.drop(G.clone(grid)).moves.length)throw Error('Six Drop refill left unsupported candies');
  state.grid=grid;
  return {grid,added:positions.map(([r,c])=>({r,c,tile:{...grid[r][c]}})),holes:[...new Set([...chosen,...blocked])],mobility:targets.filter(([r,c])=>grid[r][c].number!=null&&mobility(grid,r,c)>0).length};
 }
 function newGame({bet=100,rate=90,seed=1,carry=null,rulesRevision=REVISION}={}){
  bet=integer(bet);if(!bet||bet>1e10)throw Error('Six Drop invalid BET');
  const saved=cleanCarry(carry),state={version:VERSION,rulesRevision:normalizedRevision(rulesRevision),palette:palette(saved.removed,rulesRevision),bet,target:Math.max(50,Math.min(150,Number(rate)||90)),rng:(seed>>>0)||1,uid:0,grid:G.empty(ROWS),draws:[],processed:0,
   feed:saved.feed,removedTotal:saved.removed,bankUnits:saved.bankUnits,roundRemoved:0,normalHundredths:0,bonusMedals:0,counts:{line:0,triangle:0,hexagon:0},allClears:0,maxChain:0,sugarAwarded:false,sugarTarget:95+((seed>>>8)%36)};
  if(modernRules(state)){state.carryAtStart={...saved};state.lastAllClearWin=0;}
  refill(state,{initial:true});return state;
 }
 function hit(original,number,{trace=false,preview=false}={}){
  if(isGrouped(original))return null;
  return resolveHits(original,[number],{trace,preview});
 }
 function hitBatch(original,numbers,{trace=false,preview=false}={}){
  if(!isGrouped(original)||!Array.isArray(numbers)||numbers.length!==batchSize(original?.draws?.length,original))return null;
  return resolveHits(original,numbers,{trace,preview});
 }
 function resolveHits(original,numbers,{trace=false,preview=false}={}){
  if(original?.version!==VERSION||!Array.isArray(original.draws)||!numbers.length||original.draws.length+numbers.length>8||new Set(numbers).size!==numbers.length||numbers.some(number=>!Number.isInteger(number)||number<1||number>25||original.draws.includes(number)))return null;
  const s=copy(original),timeline=[],startWin=totalMedals(s),startRemoved=s.roundRemoved;
  gamePalette(s);s.rulesRevision=normalizedRevision(s);s.draws.push(...numbers);let chain=0,sugar=false;
  const push=(phase,extra={},ms=100)=>{if(trace)timeline.push({phase,...extra,ms,grid:G.clone(s.grid),bankUnits:s.bankUnits,normalHundredths:s.normalHundredths,bonusMedals:s.bonusMedals,counts:{...s.counts},allClears:s.allClears,...(s.rulesRevision>=BALANCED_REVISION?{removedTotal:s.removedTotal}:{})});};
  function remove(cells){const removed=[],progressiveCredits=[],bankUnitsBefore=s.bankUnits;for(const [r,c]of cells){
   const t=s.grid[r]?.[c];if(!t)continue;removed.push({r,c,tile:{...t}});s.grid[r][c]=null;
   const deltaUnits=creditUnitsForDrop(s.bet,s.removedTotal,s);s.roundRemoved++;s.removedTotal++;s.bankUnits+=deltaUnits;
   if(!Number.isSafeInteger(s.bankUnits)||s.bankUnits>LIMIT)throw Error('Six Drop progressive overflow');
   progressiveCredits.push({r,c,tileId:t.id,deltaUnits,bankUnits:s.bankUnits,...(s.rulesRevision>=BALANCED_REVISION?{removedTotal:s.removedTotal}:{})});
  }return {removed,progressiveCredits,bankUnitsBefore};
  }
  function fall(){const result=G.drop(s.grid,{trace});if(!result.moves.length)return;
   const natural=result.steps.reduce((n,x)=>n+x.ms,0)||100,scale=Math.min(1,300/natural);
   const steps=result.steps.map(x=>({...x,ms:x.ms*scale})),motionMs=steps.reduce((n,x)=>n+x.ms,0)||80;
   push('pyramidFall',{moves:result.moves,steps,motionMs,chain},Math.min(350,motionMs+35));
  }
  // A saved grouped round still hits all its numbers on the same board.
  // Revision 283 resolves one number and its occupied six-neighbour ring.
  // Build that ring before removing anything: it never expands recursively.
  const hits=new Set(numbers),cells=[];for(let r=0;r<ROWS;r++)for(let c=0;c<s.grid[r].length;c++)if(hits.has(s.grid[r][c]?.number))cells.push([r,c]);
  const hitDetails={cells,numbers:[...numbers]};let affected=cells;
  if(s.rulesRevision>=SINGLE_REVISION){
   const keys=new Set();for(const [r,c]of cells){keys.add(r*16+c);for(const [y,x]of G.neighbors(r,c,ROWS))if(G.valid(y,x,ROWS))keys.add(y*16+x);}
   affected=[];for(let r=0;r<ROWS;r++)for(let c=0;c<s.grid[r].length;c++)if(s.grid[r][c]&&keys.has(r*16+c))affected.push([r,c]);
   hitDetails.affectedCells=affected;
  }
  push(cells.length?'pyramidHit':'pyramidMiss',hitDetails,70);
  if(cells.length){push('pyramidBreak',remove(affected),80);fall();}
  for(;;){
   const forms=G.findShapes(s.grid),groups=connectedGroups(s.grid);if(!forms.length&&!groups.length)break;
   if(++chain>Math.floor(CAPACITY/4))throw Error('Six Drop cascade exceeded finite board');
   const colors=new Set(forms.map(f=>f.color)),connected=new Set(groups.flatMap(g=>g.cells.map(([r,c])=>r*16+c))),cleared=[];
   for(let r=0;r<ROWS;r++)for(let c=0;c<s.grid[r].length;c++)if(s.grid[r][c]&&(colors.has(s.grid[r][c].color)||connected.has(r*16+c)))cleared.push([r,c]);
   const before=totalMedals(s),counts={line:0,triangle:0,hexagon:0};for(const f of forms)counts[f.type]++;
   push('pyramidShape',{forms,groups,cells:cleared,colors:[...colors],chain},counts.hexagon?260:counts.triangle?220:180);
   const removal=remove(cleared);
   for(const type of Object.keys(BASE_PAY)){s.normalHundredths+=roleAward(type,s.counts[type],counts[type],s);s.counts[type]+=counts[type];}
   const won=totalMedals(s)-before;
   push('pyramidAward',{forms,groups,...removal,chain,gain:asHundredths(won,s.bet),winMedals:won,triangles:counts.triangle,hexagons:counts.hexagon,lines:counts.line,colors:[...colors]},130);
   fall();
  }
  const allClear=s.roundRemoved>startRemoved&&G.count(s.grid)===0;
  if(allClear){const prize=Math.floor(s.bankUnits/UNIT);s.bonusMedals+=prize;s.allClears++;if(modernRules(s))s.lastAllClearWin=prize;push('pyramidAllClear',{chain,gain:asHundredths(prize,s.bet),winMedals:prize,forms:[]},720);}
  s.maxChain=Math.max(s.maxChain,chain);s.processed=s.draws.length;
  if(!s.sugarAwarded&&s.roundRemoved>=s.sugarTarget){s.sugarAwarded=true;sugar=true;}
  const fill=preview?{added:[]}:refill(s);
  if(fill.added.length){const rowOrder=[...new Set(fill.added.map(x=>x.r))].sort((a,b)=>b-a);push('pyramidTopUp',{added:fill.added,recolored:[],rowOrder,feed:s.feed},Math.min(580,220+rowOrder.length*32));}
  const win=totalMedals(s);
  return {state:s,timeline,chain,allClear,sugarAward:sugar,removed:s.roundRemoved-startRemoved,gain:win-startWin,totalWin:win,counts:{line:s.counts.line-original.counts.line,triangle:s.counts.triangle-original.counts.triangle,hexagon:s.counts.hexagon-original.counts.hexagon}};
 }
 function carryOut(s,roundId=''){
  // An interrupted v278 round is not a completed zero-WIN game. Only its
  // already committed starting meter may be carried into another round.
  if(modernRules(s)&&s.draws.length<8)return cleanCarry(s.carryAtStart);
  return totalMedals(s)>0?cleanCarry({bankUnits:s.bankUnits,removed:s.removedTotal,feed:s.feed,roundId}):cleanCarry({roundId});
 }
 return {VERSION,REVISION,GROUPED_REVISION,ROUNDED_REVISION,SINGLE_REVISION,BALANCED_REVISION,FIXED_PALETTE_REVISION,CURRENT_REVISION,BATCH_SIZES,ROWS,CAPACITY,RING,BASE_PAY,BASE_PAY_V278,ROLE_PAY_TABLE_V280,ROLE_TAIL_STEP_V280,SUPPORT_TABLE_V278,ROLE_PAY_TABLE_V284,ROLE_TAIL_STEP_V284,NUMBER_BIAS_V284,NUMBER_EDGE_BIAS_V285,NUMBER_ROW_BIAS_V285,COLOR_COHESION_V284,COLOR_COHESION_V285,COLOR_COHESION_LOW_BET_V284,CREDIT_PER_DROP,CREDIT_PER_DROP_V284,CREDIT_PER_DROP_V285,COLOR_STEP_V284,creditPerDrop,creditUnitsForDrop,numberPlacementBias,colorCohesion,cleanCarry,palette,gamePalette,nextRandom,asHundredths,totalMedals,roleTotal,roleAward,isGrouped,batchSize,supportProbability,newGame,hit,hitBatch,refill,carryOut,mobility,connectedGroups};
}
root.SweetsSixDropV247={VERSION,REVISION,GROUPED_REVISION,ROUNDED_REVISION,SINGLE_REVISION,BALANCED_REVISION,FIXED_PALETTE_REVISION,CURRENT_REVISION,BATCH_SIZES,create,BASE_PAY,BASE_PAY_V278,ROLE_PAY_TABLE_V280,ROLE_TAIL_STEP_V280,SUPPORT_TABLE_V278,ROLE_PAY_TABLE_V284,ROLE_TAIL_STEP_V284,NUMBER_BIAS_V284,NUMBER_EDGE_BIAS_V285,NUMBER_ROW_BIAS_V285,COLOR_COHESION_V284,COLOR_COHESION_V285,COLOR_COHESION_LOW_BET_V284,RING,CREDIT_PER_DROP,CREDIT_PER_DROP_V284,CREDIT_PER_DROP_V285,COLOR_STEP_V284,creditPerDrop,creditUnitsForDrop,numberPlacementBias,colorCohesion,cleanCarry,palette,gamePalette,asHundredths,roleTotal,roleAward,isGrouped,batchSize,supportProbability};
})(typeof window!=='undefined'?window:globalThis);
