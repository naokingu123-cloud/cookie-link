/* Six Candy rules v4. Fixed 10-row staggered tray with symmetric start gaps,
 * round-specific candy palettes, and separate round-clear bonuses.
 */
const SIX_ROWS=10,SIX_SQRT3_2=Math.sqrt(3)/2;
const SIX_PAY={hexagon:50,triangle:30,line:10,allClear:10000};
const SIX_CLEAR_BONUS=[0,20,40,100,300,1000];
const SIX_ROUND_THEMES=[
 {id:'cool-1',label:'Round 1',colors:['lime','green','aqua','navy'],tier:1},
 {id:'fresh-2',label:'Round 2',colors:['yellow','lime','green','aqua'],tier:2},
 {id:'citrus-3',label:'Round 3',colors:['orange','yellow','lime','green'],tier:3},
 {id:'hot-4',label:'Round 4',colors:['red','orange','yellow','lime'],tier:4},
 {id:'hot-5',label:'Round 5',colors:['violet','red','orange','yellow'],tier:5}
];
const SIX_CHANCE_THEME={id:'chance-3',label:'CHANCE',colors:['gold','silver','diamond'],tier:8};
const SIX_CHANCE_RATE=.12;
const SIX_COLOR_SPREAD=.375;
const SIX_SUGAR_ROUND_CHOICES=[2,3,3,3,4];
const SIX_START_GAP_TEMPLATES=[
 [[0,2],[0,4],[2,1],[2,5],[6,1],[6,5]],
 [[4,1],[4,5],[2,3],[7,1],[7,6]],
 [[4,1],[4,5],[2,3],[7,1],[7,6],[0,3]],
 [[4,2],[4,4],[7,1],[7,6]],
 [[4,2],[4,4],[7,1],[7,6],[8,2],[8,4]],
 [[0,1],[0,5],[5,1],[5,6],[7,1],[7,6]]
];
function sixRoundTheme(round){return SIX_ROUND_THEMES[Math.max(0,Math.min(4,round-1))];}
function sixPickChanceRound(random){return random()<SIX_CHANCE_RATE?2+Math.floor(random()*4):null;}
function sixRoundColorCount(round){return sixRoundTheme(round).colors.length;}
function sixRoundClearBonus(round){return SIX_CLEAR_BONUS[Math.max(0,Math.min(5,round))]||0;}
function sixPickSugarRound(random){return SIX_SUGAR_ROUND_CHOICES[Math.floor(random()*SIX_SUGAR_ROUND_CHOICES.length)]||3;}
function sixPickGapTemplate(random,round){
 const list=SIX_START_GAP_TEMPLATES;return list[(Math.floor(random()*list.length)+Math.max(0,round-1))%list.length].map(([r,c])=>[r,c]);
}
function sixRowWidth(r,rows=SIX_ROWS){return 8-((rows-1-r)&1);} // bottom is always 8
function sixCapacity(rows=SIX_ROWS){return Array.from({length:rows},(_,r)=>sixRowWidth(r,rows)).reduce((a,b)=>a+b,0);}
const sixEmpty=(rows=SIX_ROWS)=>Array.from({length:rows},(_,r)=>Array(sixRowWidth(r,rows)).fill(null));
const sixClone=g=>g.map(row=>row.map(t=>t?{...t}:null));
const sixKey=(r,c)=>r*16+c;
const sixCount=g=>g.reduce((n,row)=>n+row.filter(Boolean).length,0);
const sixPoint=(r,c,rows=SIX_ROWS)=>({x:c-(sixRowWidth(r,rows)-1)/2,y:r*SIX_SQRT3_2});
function sixValid(r,c,rows=SIX_ROWS){return r>=0&&r<rows&&Number.isInteger(c)&&c>=0&&c<sixRowWidth(r,rows);}
function sixStep(r,c,dr,dx,rows=SIX_ROWS){return [r+dr,c+(sixRowWidth(r+dr,rows)-sixRowWidth(r,rows))/2+dx];}
function sixLayout(rows=SIX_ROWS){const step=35;return {step,top:295.5-(rows-1)*step*SIX_SQRT3_2,radius:step*.50};}
function sixXY(r,c,rows=SIX_ROWS){const l=sixLayout(rows),p=sixPoint(r,c,rows);return {x:160+p.x*l.step,y:l.top+p.y*l.step};}
function sixNeighbors(r,c,rows=SIX_ROWS){return [[0,-1],[0,1],[-1,-.5],[-1,.5],[1,-.5],[1,.5]].map(([dr,dx])=>sixStep(r,c,dr,dx,rows));}
const sixPatternCache=new Map();
function sixPatterns(rows=SIX_ROWS){
 if(sixPatternCache.has(rows))return sixPatternCache.get(rows);const list=[];
 const add=(type,cells)=>{if(cells.every(([r,c])=>sixValid(r,c,rows)))list.push({type,cells,key:cells.map(p=>sixKey(...p)).sort((a,b)=>a-b).join(',')});};
 for(let r=0;r<rows;r++)for(let c=0;c<sixRowWidth(r,rows);c++){
  const at=offsets=>offsets.map(([dr,dx])=>sixStep(r,c,dr,dx,rows));
  add('triangle',at([[0,0],[1,-.5],[1,.5],[2,-1],[2,0],[2,1]]));
  add('triangle',at([[0,-1],[0,0],[0,1],[1,-.5],[1,.5],[2,0]]));
  add('hexagon',sixNeighbors(r,c,rows));
 }
 sixPatternCache.set(rows,list);return list;
}
function sixComponents(grid){
 const seen=new Set(),out=[];
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){
  const tile=grid[r][c],key=sixKey(r,c);if(!tile||seen.has(key))continue;
  const cells=[],stack=[[r,c]];seen.add(key);
  while(stack.length){const [y,x]=stack.pop();cells.push([y,x]);for(const [a,b] of sixNeighbors(y,x,grid.length)){const k=sixKey(a,b);if(!sixValid(a,b,grid.length)||seen.has(k)||grid[a][b]?.color!==tile.color)continue;seen.add(k);stack.push([a,b]);}}
  out.push({cells,color:tile.color});
 }
 return out;
}
function sixUpperFirst(a,b){
 const ra=Math.min(...a.cells.map(p=>p[0])),rb=Math.min(...b.cells.map(p=>p[0]));
 return ra-rb||b.cells.length-a.cells.length||Math.min(...a.cells.map(p=>p[1]))-Math.min(...b.cells.map(p=>p[1]))||a.key.localeCompare(b.key);
}
function sixLines(grid,used=new Set()){
 const out=[],rows=grid.length;
 for(const [dr,dx] of [[0,1],[1,-.5],[1,.5]])for(let r=0;r<rows;r++)for(let c=0;c<grid[r].length;c++){
  const t=grid[r][c];if(!t||used.has(sixKey(r,c)))continue;
  const same=([y,x])=>sixValid(y,x,rows)&&!!grid[y][x]&&!used.has(sixKey(y,x))&&grid[y][x].color===t.color;
  if(same(sixStep(r,c,-dr,-dx,rows)))continue;
  const cells=[];for(let p=[r,c];same(p);p=sixStep(...p,dr,dx,rows))cells.push(p);
  if(cells.length>=4)out.push({type:'line',cells,color:t.color,key:cells.map(p=>sixKey(...p)).join(',')});
 }
 return out.sort(sixUpperFirst);
}
function sixFindShapes(grid){
 const used=new Set(),out=[],candidates=sixPatterns(grid.length).filter(p=>{const t=grid[p.cells[0][0]][p.cells[0][1]];return t&&p.cells.every(([r,c])=>grid[r][c]?.color===t.color);});
 for(const type of ['hexagon','triangle'])for(const p of candidates.filter(p=>p.type===type).sort(sixUpperFirst)){
  if(p.cells.some(cell=>used.has(sixKey(...cell))))continue;
  p.cells.forEach(cell=>used.add(sixKey(...cell)));out.push({...p,color:grid[p.cells[0][0]][p.cells[0][1]].color});
 }
 for(;;){const p=sixLines(grid,used)[0];if(!p)break;p.cells.forEach(cell=>used.add(sixKey(...cell)));out.push(p);}
 return out;
}
function sixResolve(grid){
 const forms=sixFindShapes(grid),clusters=sixComponents(grid).filter(g=>g.cells.length>=4);
 const cells=[...new Map(clusters.flatMap(g=>g.cells).map(p=>[sixKey(...p),p])).values()];
 return {forms,clusters,cells,hexagons:forms.filter(f=>f.type==='hexagon').length,triangles:forms.filter(f=>f.type==='triangle').length,lines:forms.filter(f=>f.type==='line').length};
}
const SIX_FALL_RULES='grid-support-synchronous-v5-staggered-gap-settle';
function sixMotionPoint(move,t){
 t=Math.max(0,Math.min(1,t));const rows=move.rows||SIX_ROWS,a=sixPoint(...move.from,rows),b=sixPoint(...move.to,rows);
 if(t===0)return a;if(t===1)return b;
 if(move.gap){
  const sign=Math.sign(b.x-a.x);
  if(move.gapPivot){
   const p=sixPoint(...move.gapPivot,rows),vertical=p.y-1-a.y,arc=Math.PI/6,d=t*(vertical+arc);
   if(d<=vertical)return {x:a.x,y:a.y+d};
   const angle=-Math.PI/2+sign*(d-vertical);
   return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
  }
  const vertical=b.y-a.y,d=t*(vertical+Math.abs(b.x-a.x));
  return d<=vertical?{x:a.x,y:a.y+d}:{x:a.x+sign*(d-vertical),y:b.y};
 }
 if(!move.pivot)return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 const p=sixPoint(...move.pivot,rows),angle=Math.atan2(a.y-p.y,a.x-p.x)+move.turn*t;
 return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
}
function sixPathClear(grid,move,vacating=new Set()){
 for(let k=1;k<=16;k++){
  const p=sixMotionPoint(move,k/16);
  for(let r=Math.max(0,move.from[0]-1);r<=Math.min(grid.length-1,move.to[0]+1);r++)for(let c=0;c<grid[r].length;c++){
   const t=grid[r][c];if(!t||t.id===move.id||vacating.has(t.id))continue;const q=sixPoint(r,c,grid.length);
   if((p.x-q.x)**2+(p.y-q.y)**2<.999999)return false;
  }
 }
 return true;
}
function sixFallOptions(grid,r,c,vacating=new Set()){
 const rows=grid.length,tile=grid[r]?.[c];if(!tile||r===rows-1||vacating.has(tile.id))return [];
 const valid=p=>sixValid(...p,rows),occupied=([y,x])=>{const t=grid[y]?.[x];return t&&!vacating.has(t.id)?t:null;};
 const dl=sixStep(r,c,1,-.5,rows),dr=sixStep(r,c,1,.5,rows),down=sixStep(r,c,2,0,rows);
 const left=occupied(dl),right=occupied(dr),sideL=occupied([r,c-1]),sideR=occupied([r,c+1]);
 if(left&&right)return [];
 const make=(to,pivot=null,turn=0)=>valid(to)?{id:tile.id,tile:{...tile},from:[r,c],to,pivot,turn,rows}:null;
 const gap=to=>{const m=make(to);return m?{...m,gap:true,gapPivot:valid(down)&&occupied(down)?down:null}:null;};
 const downLeft=()=>!valid(dl)||left?null:!sideL?make(dl,right?dr:null,right?-Math.PI/3:0):!right?gap(dl):null;
 const downRight=()=>!valid(dr)||right?null:!sideR?make(dr,left?dl:null,left?Math.PI/3:0):!left?gap(dr):null;
 const vertical=()=>!left&&!right&&valid(down)&&!occupied(down)?make(down):null;
 let options=[];
 if(left)options=[downRight()];
 else if(right)options=[downLeft()];
 else {
  const biasL=!!grid[r]?.[c-1],biasR=!!grid[r]?.[c+1];
  if(biasL&&!biasR)options=[downRight(),vertical(),downLeft()];
  else if(biasR&&!biasL)options=[downLeft(),vertical(),downRight()];
  else if(vertical())options=[vertical()];
  else {
   const l=downLeft(),rr=downRight();
   const room=m=>m?[-.5,.5].map(dx=>sixStep(...m.to,1,dx,rows)).filter(p=>valid(p)&&!occupied(p)).length:-1;
   options=room(rr)>room(l)?[rr,l]:[l,rr];
  }
 }
 return options.filter(Boolean).filter(m=>sixPathClear(grid,m,vacating));
}
function sixMotionsClear(a,b){for(let k=0;k<=16;k++){const p=sixMotionPoint(a,k/16),q=sixMotionPoint(b,k/16);if((p.x-q.x)**2+(p.y-q.y)**2<.999999)return false;}return true;}
function sixDrop(grid,{trace=false}={}){
 const steps=[],paths=new Map(),count=sixCount(grid);let iterations=0;
 for(;;){
  if(++iterations>count*grid.length+1)throw Error('Six Candy gravity did not converge');
  const accepted=[],vacating=new Set(),targets=new Set(),pinned=new Set();
  for(let pass=0;pass<=count;pass++){
   const previous=accepted.length;
   for(let r=grid.length-2;r>=0;r--){
    const proposals=[];
    for(let c=0;c<grid[r].length;c++){
     const t=grid[r][c];if(!t||vacating.has(t.id)||pinned.has(t.id))continue;
     const candidates=sixFallOptions(grid,r,c,vacating);if(candidates.length)proposals.push({c,candidates});
    }
    proposals.sort((a,b)=>a.candidates.length-b.candidates.length||a.c-b.c);
    for(const proposal of proposals)for(const m of proposal.candidates){
     if(vacating.has(m.id)||pinned.has(m.id)||targets.has(sixKey(...m.to)))continue;
     if(!sixPathClear(grid,m,vacating)||accepted.some(other=>!sixMotionsClear(m,other)))continue;
     accepted.push(m);vacating.add(m.id);targets.add(sixKey(...m.to));
     for(const pivot of [m.pivot,m.gapPivot])if(pivot){const support=grid[pivot[0]][pivot[1]];if(support)pinned.add(support.id);}break;
    }
   }
   if(accepted.length===previous)break;
  }
  if(!accepted.length)break;
  for(const m of accepted)grid[m.from[0]][m.from[1]]=null;
  for(const m of accepted){
   if(grid[m.to[0]][m.to[1]])throw Error('Reserved candy destination is occupied');
   grid[m.to[0]][m.to[1]]=m.tile;
   if(!paths.has(m.id))paths.set(m.id,{id:m.id,tile:m.tile,points:[m.from]});paths.get(m.id).points.push(m.to);
  }
  if(trace)steps.push({grid:sixClone(grid),moves:accepted,ms:accepted.some(m=>m.gap)?160:accepted.some(m=>m.to[0]-m.from[0]===2)?120:90});
 }
 return {steps,moves:[...paths.values()]};
}
function sixPlan(input,numbers,{trace=false}={}){
 const grid=sixClone(input),timeline=[],used=new Set(numbers),hit=[];let triangles=0,hexagons=0,lines=0,chain=0,gain=0,removedCount=0,ordinaryGroups=0,sugarAward=false;
 const push=(phase,detail={},ms=350)=>{if(trace)timeline.push({phase,...detail,grid:sixClone(grid),ms});};
 const remove=cells=>{const removed=[];for(const [r,c] of cells){const t=grid[r]?.[c];if(t){removed.push({r,c,tile:{...t}});if(t.sugar)sugarAward=true;grid[r][c]=null;}}removedCount+=removed.length;return removed;};
 const drop=()=>{const fall=sixDrop(grid,{trace});if(fall.moves.length){const motionMs=fall.steps.reduce((n,f)=>n+f.ms,0)||350;push('pyramidFall',{...fall,motionMs},motionReduced?100:motionMs+180);}};
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++)if(grid[r][c]?.number!=null&&used.has(grid[r][c].number))hit.push([r,c]);
 if(!hit.length){push('pyramidMiss',{},250);return {grid,timeline,gain,triangles,hexagons,lines,chain,removedCount,ordinaryGroups,hit:0,cleared:false,advance:false,sugarAward};}
 push('pyramidHit',{cells:hit},280);push('pyramidBreak',{removed:remove(hit)},420);drop();
 for(;;){
  const resolved=sixResolve(grid);if(!resolved.cells.length)break;if(++chain>Math.ceil(Math.max(1,sixCount(input))/4))throw Error('Cascade exceeded finite board');
  const award=resolved.hexagons*SIX_PAY.hexagon+resolved.triangles*SIX_PAY.triangle+resolved.lines*SIX_PAY.line;
  push('pyramidShape',{forms:resolved.forms,cells:resolved.cells,chain},resolved.forms.length?650:500);
  const removed=remove(resolved.cells);triangles+=resolved.triangles;hexagons+=resolved.hexagons;lines+=resolved.lines;gain+=award;ordinaryGroups+=resolved.clusters.length;
  push('pyramidAward',{...resolved,removed,chain,gain:award},award?1000:300);drop();
 }
 const cleared=sixCount(grid)===0;
 if(cleared){gain+=SIX_PAY.allClear;push('pyramidAllClear',{gain:SIX_PAY.allClear,chain,forms:[]},2100);}
 return {grid,timeline,gain,triangles,hexagons,lines,chain,removedCount,ordinaryGroups,hit:hit.length,cleared,advance:triangles+hexagons+lines>0||cleared,sugarAward};
}
function sixShuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[list[i],list[j]]=[list[j],list[i]];}return list;}
function sixApplyHoleTemplate(grid,holes){for(const [r,c] of holes||[])if(sixValid(r,c,grid.length))grid[r][c]=null;return grid;}
// Fixed symmetric numbered cells; 25 labels concentrated in the supporting lower half.
const SIX_NUMBER_CELLS=Object.freeze([[5,2],[5,3],[5,4],[5,5],[6,0],[6,2],[6,4],[6,6],[7,0],[7,2],[7,3],[7,4],[7,5],[7,7],[8,0],[8,1],[8,3],[8,5],[8,6],[9,1],[9,2],[9,3],[9,4],[9,5],[9,6]].map(Object.freeze));
function sixColorFits(grid,r,c,color){
 const seen=new Set([sixKey(r,c)]),queue=[[r,c]];
 for(let i=0;i<queue.length;i++)for(const [y,x] of sixNeighbors(...queue[i],grid.length)){const key=sixKey(y,x);if(seen.has(key)||grid[y]?.[x]?.color!==color)continue;seen.add(key);if(seen.size>=4)return false;queue.push([y,x]);}
 return true;
}
function sixRefillBoard(input,colorCount,random,firstId,drawn=new Set()){
 const grid=sixClone(input),empty=[],oldTiles=[];let lastId=firstId;
 for(let r=grid.length-1;r>=0;r--)for(let c=0;c<grid[r].length;c++){if(grid[r][c]){oldTiles.push([r,c]);continue;}const x=sixPoint(r,c,grid.length).x;let covered=false;for(let y=0;y<r;y++)for(let k=0;k<input[y].length;k++)if(input[y][k]&&Math.abs(sixPoint(y,k,grid.length).x-x)<.999)covered=true;if(!covered)empty.push([r,c]);}
 if(!empty.length)return {grid,lastId,added:[],recolored:[]};
 const palettes=empty.map(()=>sixShuffle(Array.from({length:colorCount},(_,i)=>i),random));let visits=0;
 function fill(i){if(i===empty.length)return true;if(++visits>16000)return false;const [r,c]=empty[i];for(const color of palettes[i]){if(!sixColorFits(grid,r,c,color))continue;grid[r][c]={id:firstId+i+1,color,number:null};if(fill(i+1))return true;}grid[r][c]=null;return false;}
 let ok=fill(0),recolored=[];
 // A settled remnant can rarely forbid every color at one hole. Repair one
 // surviving color if necessary, retaining its identity, number and sugar.
 if(!ok)for(const [r,c] of oldTiles){const t=grid[r][c],before=t.color;for(let color=0;color<colorCount;color++){if(color===before||!sixColorFits(grid,r,c,color))continue;t.color=color;visits=0;if(fill(0)){ok=true;recolored=[{r,c,before,after:color}];break;}t.color=before;}if(ok)break;}
 if(!ok){
  // Bounded fallback: recolor this presentation only; never erase surviving
  // numbers/sugar or leave a hole. The 3-color lattice is a proper coloring.
  const palette=sixShuffle(Array.from({length:colorCount},(_,i)=>i),random);
  const fillable=new Set(empty.map(p=>p.join(',')));for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){if(!grid[r][c]&&!fillable.has([r,c].join(',')))continue;const color=palette[(r+c+Math.floor((r+grid.length%2)/2))%colorCount];if(grid[r][c]){if(grid[r][c].color!==color)recolored.push({r,c,before:grid[r][c].color,after:color});grid[r][c].color=color;}else grid[r][c]={id:++lastId,color,number:null};}
 }
 lastId=Math.max(lastId,...grid.flat().filter(Boolean).map(t=>t.id));
 const present=new Set(grid.flat().filter(t=>t?.number!=null).map(t=>t.number)),available=sixShuffle(Array.from({length:25},(_,i)=>i+1).filter(n=>!drawn.has(n)&&!present.has(n)),random),added=[];
 for(const [r,c] of empty){const tile=grid[r][c];if(available.length)tile.number=available.pop();added.push({r,c,tile:{...tile}});}
 if(sixResolve(grid).cells.length||sixDrop(sixClone(grid)).moves.length)throw Error('Top refill must be stable and cascade-free');
 return {grid,lastId,added,recolored};
}

function sixMakeBoard(rows,colorCount,random,firstId=0,{holes=[]}={}){
 let grid=null,lastId=firstId;
 for(let attempt=0;attempt<64;attempt++){
  const g=sixApplyHoleTemplate(sixEmpty(rows),holes);let ok=true,id=firstId;
  outer:for(let r=0;r<rows;r++)for(let c=0;c<g[r].length;c++){
   if(g[r][c]===null&&holes.some(p=>p[0]===r&&p[1]===c))continue;
   const tile={id:++id,color:0,number:null,lean:random()<.5?-1:1};g[r][c]=tile;let placed=false;
   const choices=sixShuffle(Array.from({length:colorCount},(_,i)=>i),random);
   if(random()<SIX_COLOR_SPREAD){const nearby=color=>sixNeighbors(r,c,rows).filter(([y,x])=>g[y]?.[x]?.color===color).length;choices.sort((a,b)=>nearby(a)-nearby(b));}
   for(const color of choices){
    tile.color=color;if(sixComponents(g).every(p=>p.cells.length<4)){placed=true;break;}
   }
   if(!placed){ok=false;break outer;}
  }
  if(ok&&sixDrop(sixClone(g)).moves.length===0){grid=g;lastId=id;break;}
 }
 if(!grid){
  const palette=sixShuffle(Array.from({length:colorCount},(_,i)=>i),random);grid=sixApplyHoleTemplate(sixEmpty(rows),holes);
  for(let r=0;r<rows;r++)for(let c=0;c<grid[r].length;c++)if(!(holes||[]).some(p=>p[0]===r&&p[1]===c))grid[r][c]={id:++lastId,color:palette[(r+c+Math.floor((r+(rows%2))/2))%colorCount],number:null,lean:c<grid[r].length/2?-1:1};
 }
 const spots=SIX_NUMBER_CELLS.map(([r,c])=>grid[r]?.[c]);if(spots.some(t=>!t))throw Error('Fixed number position is missing');const numbers=sixShuffle(Array.from({length:25},(_,i)=>i+1),random);numbers.forEach((n,i)=>spots[i].number=n);
 if(sixResolve(grid).cells.length)throw Error('Initial board contains a connected group or role');
 if(sixDrop(sixClone(grid)).moves.length)throw Error('Initial board has unsupported candies');
 return {grid,lastId};
}
class SixBallCandyEngine extends Engine{
 reset(){
  this.kind='candy';this.gameName='シックスドロップ';this.drawMode='grouped';this.reachMode='single';this.rows=SIX_ROWS;
  this.version++;this.presentationRate=1;this.roundBet=this.roundBet||3000;this.queue=[];this.pendingDraws=new Set();this.seen=new Set();this.drawn=new Set();this.history=[];
  this.accepted=0;this.processed=0;this.busy=false;this.running=false;this.opening=false;this.paused=false;this.transitionPending=false;
  this.totalHundredths=0;this.maxLink=0;this.maxChain=0;this.lastChain=0;this.allClears=0;this.roundSteps=0;this.roundHammers=0;this.roundCleared=0;
  this.wonderCollected=false;this.wonderIssued=false;this.wonderToken=null;this.wonderColumn=0;this.pendingSugarAward=[];
  this.basketState=Array.from({length:SIZE},()=>({goal:10,remaining:10,weight:0,pending:[]}));this.hammerQueue=[];this.hammerPreview=Array.from({length:65},()=>[]);this.hammerPreviewVersion=0;
  this.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));this.pyramid=sixEmpty(this.rows);this.initialPyramid=null;
  this.roundIndex=1;this.roundsCleared=0;this.sixColorCount=4;this.boardGeneration=0;this.roundTheme=sixRoundTheme(1).id;this.clearBonusHundredths=0;this.clearedRounds=new Set();this.maxRounds=5;this.chanceRound=sixPickChanceRound(this.random);
  this.triangles=0;this.hexagons=0;this.lines=0;this.shapes=0;this.bestCascade=0;this.cascade=0;this.removedCandies=0;this.remainingCandies=sixCapacity(this.rows);this.pyramidCleared=false;this.lastGain=0;this.lastNumber=0;this.fx=null;
  this.sugarRound=sixPickSugarRound(this.random);this.sugarPlaced=false;this.lastRefill=null;this.currentClearBonus=0;this.currentHoles=[];
  this.candyMessage='役をそろえて次のRoundへ！';this.emit('ready');
 }
 setRows(){return false;}
 colorsForRound(n){return this.chanceRound===n?3:sixRoundColorCount(n);}
 newBoard(){
  const theme=this.chanceRound===this.roundIndex?SIX_CHANCE_THEME:sixRoundTheme(this.roundIndex),holes=sixPickGapTemplate(this.random,this.roundIndex);this.sixColorCount=theme.colors.length;this.roundTheme=theme.id;this.currentHoles=holes;
  const made=sixMakeBoard(this.rows,this.sixColorCount,this.random,this.uid,{holes});this.uid=made.lastId;this.pyramid=made.grid;this.boardGeneration++;this.remainingCandies=sixCount(this.pyramid);this.pyramidCleared=false;
  if(!this.wonderCollected&&this.roundIndex===this.sugarRound){const candidates=this.pyramid.flat().filter(t=>t&&t.number==null);const pick=candidates[Math.floor(this.random()*candidates.length)];if(pick){pick.sugar=true;this.sugarPlaced=true;}}
  this.initialPyramid=sixClone(this.pyramid);
 }
 start(){if(this.running||this.roundBet<=0)return;this.newBoard();this.running=true;this.opening=false;this.busy=false;this.candyMessage='Round '+this.roundIndex+'・番号HITでキャンディを落とそう';this.emit('waiting');}
 reachSnapshot(){return Object.assign(Object.create(SixBallCandyEngine.prototype),{pyramid:sixClone(this.pyramid),drawn:new Set(this.drawn),totalHundredths:this.totalHundredths,initialPyramid:!!this.initialPyramid,rows:this.rows,boardGeneration:this.boardGeneration,roundIndex:this.roundIndex,clearedRounds:new Set(this.clearedRounds)});}
 async waitVisual(ms,token){let remaining=ms/this.speed;while(remaining>0&&token===this.version){const slice=Math.min(40,remaining);await this.sleep(slice);if(!this.paused)remaining-=slice;}return token===this.version;}
 predict(number,pending=[]){
  if(!this.initialPyramid||this.drawn.has(number))return null;
  const p=sixPlan(this.pyramid,[...pending,number]),bonus=p.advance&&!this.clearedRounds.has(this.roundIndex)?sixRoundClearBonus(this.roundIndex):0,gain=p.gain+bonus;
  return {number,total:this.totalHundredths+gain,gain,roundBonus:bonus,maxLink:0,chain:p.chain,ordinaryGroups:p.ordinaryGroups,allClear:p.cleared,tier:reachTier(this.totalHundredths+gain,p.cleared),triangles:p.triangles,hexagons:p.hexagons,lines:p.lines};
 }
 async drain(){
  if(this.busy)return;const token=this.version;this.busy=true;
  try{
   while(this.queue.length&&token===this.version){
    const numbers=this.queue.shift();for(const n of numbers){this.pendingDraws.delete(n);this.drawn.add(n);}this.lastNumber=numbers.at(-1);this.cascade=0;this.lastGain=0;this.currentClearBonus=0;
    const presentBefore=new Set(this.pyramid.flat().filter(t=>t?.number!=null).map(t=>t.number)),missed=numbers.filter(n=>!presentBefore.has(n));
    const plan=sixPlan(this.pyramid,numbers,{trace:true});
    let roleReached=false;
    for(const originalStage of plan.timeline){
     if(originalStage.phase==='pyramidShape'&&originalStage.forms?.length)roleReached=true;
     const rate=roleReached?3:1,stage={...originalStage,ms:originalStage.ms/rate,...(originalStage.motionMs?{motionMs:originalStage.motionMs/rate}:{})};
     if(token!==this.version)return;this.pyramid=sixClone(stage.grid);this.remainingCandies=sixCount(this.pyramid);this.fx={...stage,elapsed:0,stamp:null};this.cascade=stage.chain||this.cascade;
     if(stage.phase==='pyramidHit')this.candyMessage=numbers.join('・')+'番 HIT！';
     if(stage.phase==='pyramidMiss')this.candyMessage='盤面の番号にHITしなければ、未抽選番号付きドロップも上から補充！';
     if(stage.phase==='pyramidFall')this.candyMessage='カタカタと落下！';
     if(stage.phase==='pyramidShape')this.candyMessage=stage.forms.length?'役が完成！ '+stage.chain+'連鎖':'4個以上つながった！ '+stage.chain+'連鎖';
     if(stage.phase==='pyramidAward'){this.totalHundredths+=stage.gain;this.lastGain=stage.gain;this.triangles+=stage.triangles;this.hexagons+=stage.hexagons;this.lines+=stage.lines;this.shapes=this.triangles+this.hexagons+this.lines;this.bestCascade=Math.max(this.bestCascade,stage.chain);}
     if(stage.phase==='pyramidAllClear'){this.totalHundredths+=SIX_PAY.allClear;this.lastGain=SIX_PAY.allClear;this.allClears++;this.candyMessage='ALL CLEAR！ 100倍ボーナス！';}
     this.emit(stage.phase,{numbers,...stage});const visualCritical=stage.phase==='pyramidFall'||stage.phase==='pyramidShape'||stage.phase==='pyramidBreak';const stageWait=visualCritical?stage.ms:plan.advance&&stage.phase!=='pyramidAllClear'?Math.min(stage.ms,360):stage.phase==='pyramidAllClear'&&plan.advance?Math.min(stage.ms,700):stage.ms;if(!await (visualCritical?this.waitVisual(stageWait*this.speed,token):this.wait(stageWait*this.speed,token)))return;
    }
    this.pyramid=sixClone(plan.grid);this.remainingCandies=sixCount(this.pyramid);this.removedCandies+=plan.removedCount;this.pyramidCleared=plan.cleared;this.processed+=numbers.length;this.fx=null;
    if(plan.advance&&!this.clearedRounds.has(this.roundIndex)){this.clearedRounds.add(this.roundIndex);this.roundsCleared++;this.currentClearBonus=sixRoundClearBonus(this.roundIndex);this.clearBonusHundredths+=this.currentClearBonus;this.totalHundredths+=this.currentClearBonus;}
    if(missed.length&&!plan.advance){
     const fill=sixRefillBoard(this.pyramid,this.sixColorCount,this.random,this.uid,this.drawn);this.uid=fill.lastId;
     if(fill.added.length){this.pyramid=fill.grid;this.remainingCandies=sixCount(this.pyramid);this.boardGeneration++;this.lastRefill={added:fill.added.length,recolored:fill.recolored.length,missed:[...missed]};
      this.fx={phase:'pyramidTopUp',grid:sixClone(fill.grid),added:fill.added,recolored:fill.recolored,elapsed:0,stamp:null,ms:1400};this.candyMessage='盤面の番号にHITしなければ、未抽選番号付きドロップも上から補充！';this.emit('pyramidTopUp',{missed,added:fill.added});
      if(!await this.waitVisual(1400*this.speed,token))return;this.fx=null;
     }
    }
    this.transitionPending=plan.advance&&this.processed<8&&this.roundIndex<this.maxRounds;
    this.candyMessage=plan.advance?'Round '+this.roundIndex+' CLEAR！':plan.chain?'連結消去・次の番号で役をねらおう':'次の番号で役をねらおう';
    if(this.currentClearBonus){this.emit('pyramidRoundBonus',{roundIndex:this.roundIndex,gain:this.currentClearBonus,nextRound:this.transitionPending?this.roundIndex+1:null});if(!await this.wait(420*this.speed,token))return;}
    this.emit('settled',{numbers,candy:true,batchShapes:plan.triangles+plan.hexagons+plan.lines,batchChain:plan.chain,batchGain:plan.gain,advance:plan.advance,clearBonus:this.currentClearBonus,sugarAward:plan.sugarAward});
    if(plan.sugarAward&&!this.wonderCollected){
     this.wonderCollected=true;this.wonderIssued=true;this.roundSteps=1;this.wonderToken={id:'six-candy-'+this.version,value:this.roundBet,tier:wonderTier(this.roundBet)};this.emit('stepcollect',{steps:[this.wonderToken]});this.emit('sugaraward',{steps:[this.wonderToken]});if(!await this.wait(SUGAR_GET_WAIT*this.speed*(this.presentationRate||1),token))return;
    }
    if(!await this.wait((plan.advance?260:plan.chain?MINI_RESULT_MS:150)*this.speed,token))return;
    if(this.transitionPending){
     const outgoing=sixClone(this.pyramid),nextRound=this.roundIndex+1,sweepMs=(motionReduced?100:430)*this.speed;
     this.fx={phase:'pyramidSweep',grid:outgoing,roundIndex:this.roundIndex,nextRound,elapsed:0,stamp:null,ms:sweepMs};
     this.candyMessage='ROUND CLEAR!';this.emit('pyramidSweep',{nextRound});
     if(!await this.wait(sweepMs,token))return;
     this.roundIndex++;this.newBoard();const refillMs=(motionReduced?100:360+(this.rows-1)*60)*this.speed;
     this.fx={phase:'pyramidRefill',grid:sixClone(this.pyramid),roundIndex:this.roundIndex,elapsed:0,stamp:null,ms:refillMs};
     this.candyMessage='Round '+this.roundIndex+' START';this.emit('pyramidRefill',{roundIndex:this.roundIndex});
     if(!await this.wait(refillMs,token))return;
     this.fx=null;this.transitionPending=false;this.emit('settled',{numbers,candy:true,newBoard:true});
    }
   }
   if(token!==this.version)return;
   if(this.processed===8){this.busy=false;this.running=false;this.candyMessage='Round '+this.roundIndex+'・⬡ '+this.hexagons+' / △ '+this.triangles+' / LINE '+this.lines;this.emit('complete');}
   else{this.busy=false;this.emit('waiting');}
  }catch(error){if(token===this.version){this.busy=false;this.running=false;this.emit('error',{message:error.message});}}
 }
}
const CandyCarnivalEngine=SixBallCandyEngine;

/* Four candy sprites are real pixels cut from the user-approved PNG.
 * Numbers stay separate live glyphs. The rest of the decorative backdrop is Canvas.
 * Presentation consumes no game random state. */
const SIX_ART_VERSION='rounds-png-v4';
const sixArtCache=new Map();
const SIX_ART_PALETTE=[
 ['#fff0f6','#ff478c','#b81051'],['#fffbc7','#ffd71c','#d57b06'],
 ['#eeffd9','#67d826','#217d16'],['#dfffff','#28c9f1','#0660ab'],
 ['#fbeaff','#bd54f5','#6c14ad']
];
function sixArtStar(x,cx,cy,r,fill='#ffdf3e',stroke='#df8b17'){
 x.save();x.translate(cx,cy);x.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,d=k%2?r*.48:r;k?x.lineTo(Math.cos(a)*d,Math.sin(a)*d):x.moveTo(Math.cos(a)*d,Math.sin(a)*d);}x.closePath();x.fillStyle=fill;x.strokeStyle=stroke;x.lineWidth=Math.max(.7,r*.13);x.lineJoin='round';x.fill();x.stroke();x.restore();
}
function sixArtHeart(x,cx,cy,r,fill='#ff559b'){
 x.save();x.translate(cx,cy);x.beginPath();x.moveTo(0,r*.72);x.bezierCurveTo(-r*1.6,-r*.12,-r*.73,-r*1.28,0,-r*.52);x.bezierCurveTo(r*.73,-r*1.28,r*1.6,-r*.12,0,r*.72);x.fillStyle=fill;x.fill();x.strokeStyle='#fff5df';x.lineWidth=r*.12;x.stroke();x.restore();
}
function sixVectorCandySprite(color){
 color=([0,1,3,4,2][((color%5)+5)%5]);const key='candy/'+color;if(sixArtCache.has(key))return sixArtCache.get(key);
 const cv=document.createElement('canvas');cv.width=cv.height=144;const x=cv.getContext('2d'),p=SIX_ART_PALETTE[color];
 x.shadowColor=p[2]+'99';x.shadowBlur=4;x.shadowOffsetY=3;
 const shell=x.createRadialGradient(42,32,2,73,72,65);shell.addColorStop(0,'#ffffff');shell.addColorStop(.2,p[0]);shell.addColorStop(.52,p[1]);shell.addColorStop(.84,p[1]);shell.addColorStop(1,p[2]);
 x.fillStyle=shell;x.beginPath();x.arc(72,70,64,0,Math.PI*2);x.fill();x.shadowBlur=0;x.shadowOffsetY=0;x.strokeStyle=p[2];x.lineWidth=3;x.stroke();
 x.strokeStyle='#ffffffcc';x.lineWidth=2.8;x.beginPath();x.arc(72,70,58,-2.9,-.35);x.stroke();
 x.save();x.beginPath();x.arc(72,70,53,0,7);x.clip();
 const core=x.createLinearGradient(34,20,105,121);core.addColorStop(0,p[0]);core.addColorStop(.3,p[1]);core.addColorStop(1,p[2]);x.fillStyle=core;x.fillRect(12,12,120,120);
 if(color===0){
  // Strawberry candy: fruit silhouette, leaves and seeds, not a flat color disk.
  x.fillStyle='#f32355';x.beginPath();x.moveTo(72,34);x.bezierCurveTo(17,28,31,92,72,110);x.bezierCurveTo(113,92,127,28,72,34);x.fill();
  x.fillStyle='#64bc2b';for(let k=-1;k<=1;k++){x.save();x.translate(72,38);x.rotate(k*.7);x.beginPath();x.ellipse(0,-8,6,15,0,0,7);x.fill();x.restore();}
  x.fillStyle='#fff6b2';for(const [u,v,a] of [[50,55,-.2],[78,58,.2],[95,64,.4],[57,80,-.2],[79,86,.15]]){x.beginPath();x.ellipse(u,v,2.5,5,a,0,7);x.fill();}
 }else if(color===1){
  // Lemon cross-section with translucent segments.
  x.fillStyle='#fff9b4';x.beginPath();x.arc(72,70,44,0,7);x.fill();
  for(let k=0;k<8;k++){const a=k*Math.PI/4+.06;x.fillStyle=k%2?'#ffdc2f':'#ffc420';x.beginPath();x.moveTo(72+Math.cos(a)*7,70+Math.sin(a)*7);x.arc(72,70,37,a,a+Math.PI/4-.12);x.closePath();x.fill();}
  x.strokeStyle='#fffce2';x.lineWidth=2;x.beginPath();x.arc(72,70,43,0,7);x.stroke();
 }else if(color===2){
  // Lime/kiwi hard candy, kept green to preserve the game's color identity.
  x.fillStyle='#ddf38b';x.beginPath();x.arc(72,70,41,0,7);x.fill();
  x.fillStyle='#fff3c3';x.beginPath();x.ellipse(72,70,14,17,0,0,7);x.fill();
  for(let k=0;k<12;k++){const a=k*Math.PI/6;x.save();x.translate(72+Math.cos(a)*27,70+Math.sin(a)*27);x.rotate(a);x.fillStyle='#518120';x.beginPath();x.ellipse(0,0,3.6,2,0,0,7);x.fill();x.restore();}
 }else if(color===3){
  // Peppermint swirl with a blue candy-glass rim.
  x.fillStyle='#e9fffb';for(let k=0;k<6;k++){x.save();x.translate(72,70);x.rotate(k*Math.PI/3);x.beginPath();x.moveTo(0,0);x.bezierCurveTo(12,-29,41,-12,51,-18);x.arc(0,0,54,-.34,.17);x.bezierCurveTo(33,19,13,21,0,0);x.fill();x.restore();}
 }else{
  // Grape bonbon with separate glossy fruit lobes.
  for(const [u,v,r] of [[53,53,17],[78,46,17],[93,64,17],[62,76,18],[83,88,17],[64,101,13]]){const g=x.createRadialGradient(u-5,v-6,1,u,v,r);g.addColorStop(0,'#f7ceff');g.addColorStop(.24,'#d875ff');g.addColorStop(.65,'#a83ae6');g.addColorStop(1,'#701cb4');x.fillStyle=g;x.beginPath();x.arc(u,v,r,0,7);x.fill();x.strokeStyle='#7721b0';x.lineWidth=1.5;x.stroke();}
  x.fillStyle='#60cb4a';x.beginPath();x.ellipse(73,28,8,17,.7,0,7);x.fill();
 }
 x.restore();
 x.strokeStyle='#ffffffa8';x.lineWidth=2;x.beginPath();x.arc(72,70,52,0,7);x.stroke();
 x.fillStyle='#ffffffc0';x.beginPath();x.ellipse(43,28,18,8,-.55,0,7);x.fill();x.fillStyle='#ffffff70';x.beginPath();x.ellipse(109,86,5,15,.5,0,7);x.fill();
 for(const [u,v,r] of [[22,76,2],[36,106,1.4],[105,35,1.6],[118,62,1.1],[91,119,1.8]]){x.fillStyle='#fffce6c0';x.beginPath();x.arc(u,v,r,0,7);x.fill();}
 sixArtCache.set(key,cv);return cv;
}
// Original PNG-derived cells: strawberry, lemon, blue swirl, grape.
const sixCandyPng=new Image();
const sixCandyPngState={loaded:false,error:false};
sixCandyPng.onload=()=>{sixCandyPngState.loaded=true;sixArtCache.clear();try{const s=slots[2];if(s?.engine?.kind==='candy'){s.candyKey='';s.dirtyMain=s.dirtyMini=true;carnivalQueueFrame(s);}}catch{}};
sixCandyPng.onerror=()=>{sixCandyPngState.error=true;console.warn('Six Candy original artwork could not load; temporary vector fallback is visible.');};
sixCandyPng.src='assets/six-candy-png/candies.webp?v=staggered-v1';
function sixOriginalCandySprite(color){
 if(!sixCandyPngState.loaded||color<0||color>3)return sixVectorCandySprite(color);
 const key='original/'+color;if(sixArtCache.has(key))return sixArtCache.get(key);
 const cv=document.createElement('canvas'),size=sixCandyPng.naturalWidth/4;cv.width=cv.height=size;
 cv.getContext('2d').drawImage(sixCandyPng,color*size,0,size,size,0,0,size,size);
 sixArtCache.set(key,cv);return cv;
}
function sixArtNumberSprite(number){
 if(!Number.isInteger(number)||number<1||number>25)return null;const key='number/'+number;if(sixArtCache.has(key))return sixArtCache.get(key);
 const cv=document.createElement('canvas');cv.width=192;cv.height=144;const x=cv.getContext('2d'),label=String(number);
 const font='1000 112px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
 x.font=font;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineCap='round';
 const max=number>=10?168:112;
 x.strokeStyle='#551246';x.lineWidth=18;x.strokeText(label,96,78,max);
 x.strokeStyle='#ffce74';x.lineWidth=12;x.strokeText(label,96,73,max);
 x.strokeStyle='#fffceb';x.lineWidth=7;x.strokeText(label,96,70,max);
 const face=x.createLinearGradient(0,15,0,126);face.addColorStop(0,'#ffffff');face.addColorStop(.4,'#fffaf0');face.addColorStop(.6,'#ffe4ed');face.addColorStop(1,'#ff9cc3');x.fillStyle=face;x.fillText(label,96,70,max);
 // The stripes are clipped to real text glyphs, so every 1–25 remains exact.
 const mask=document.createElement('canvas');mask.width=192;mask.height=144;const z=mask.getContext('2d');z.font=font;z.textAlign='center';z.textBaseline='middle';z.fillStyle='#fff';z.fillText(label,96,70,max);z.globalCompositeOperation='source-in';z.strokeStyle='#f44787';z.lineWidth=9;
 for(let k=-120;k<240;k+=30){z.beginPath();z.moveTo(k,0);z.lineTo(k+90,144);z.stroke();}
 x.drawImage(mask,0,0);x.strokeStyle='#ffffffaa';x.lineWidth=1.8;x.strokeText(label,96,69,max);
 sixArtCache.set(key,cv);return cv;
}
function sixPaintCandyNumber(x,number,cx,cy,radius){
 const art=sixArtNumberSprite(number);if(!art)return;x.save();x.drawImage(art,cx-radius*.96,cy-radius*.77,radius*1.92,radius*1.44);x.restore();
}
function sixArtStripePattern(x){
 const key='stripe-tile';let tile=sixArtCache.get(key);
 if(!tile){tile=document.createElement('canvas');tile.width=tile.height=28;const p=tile.getContext('2d');p.fillStyle='#fff7e8';p.fillRect(0,0,28,28);p.strokeStyle='#ff4b99';p.lineWidth=11;for(const k of [-28,0,28,56]){p.beginPath();p.moveTo(k,-2);p.lineTo(k+30,30);p.stroke();}sixArtCache.set(key,tile);}
 return x.createPattern(tile,'repeat');
}
function sixArtCloud(x,cx,cy,s){x.save();x.fillStyle='#ffffffb8';x.beginPath();x.ellipse(cx,cy,s*1.5,s*.46,0,0,7);x.ellipse(cx-s*.55,cy-s*.22,s*.65,s*.58,0,0,7);x.ellipse(cx+s*.25,cy-s*.43,s*.7,s*.7,0,0,7);x.fill();x.restore();}
function sixArtTurret(x,cx,y,h,color){
 x.save();x.fillStyle='#fff0ec';x.strokeStyle='#eb9ec9';x.lineWidth=1;x.beginPath();x.roundRect(cx-9,y,18,h,3);x.fill();x.stroke();
 const roof=x.createLinearGradient(cx-12,y-24,cx+12,y);roof.addColorStop(0,'#fff4fc');roof.addColorStop(.4,color);roof.addColorStop(1,'#c64d99');x.fillStyle=roof;x.beginPath();x.moveTo(cx,y-26);x.quadraticCurveTo(cx-4,y-9,cx-14,y);x.lineTo(cx+14,y);x.quadraticCurveTo(cx+4,y-9,cx,y-26);x.fill();
 x.fillStyle='#ef7fbc';for(let k=0;k<Math.floor(h/16);k++){x.beginPath();x.roundRect(cx-3,y+7+k*16,6,9,3);x.fill();}sixArtStar(x,cx,y-28,4);x.restore();
}
function sixArtBackdrop(rows){
 const key='backdrop10/'+rows;if(sixArtCache.has(key))return sixArtCache.get(key);const cv=document.createElement('canvas');cv.width=cv.height=640;const x=cv.getContext('2d');x.scale(2,2);
 const g=x.createLinearGradient(0,0,0,320);g.addColorStop(0,'#5b2418');g.addColorStop(.5,'#8b4626');g.addColorStop(1,'#431c29');x.fillStyle=g;x.fillRect(0,0,320,320);
 x.lineWidth=9;x.strokeStyle='#ffdc86';x.strokeRect(7,3,306,314);x.lineWidth=5;x.strokeStyle=sixArtStripePattern(x);x.strokeRect(7,3,306,314);
 x.fillStyle='#fff2d00a';for(let r=0;r<20;r++)for(let c=0;c<20;c++)if((r+c)%2)x.fillRect(c*16,r*16,16,16);
 sixArtCache.set(key,cv);return cv;
}
function sixArtLogoMarkup(instance='main'){
 const id='sc-art-'+instance,colors=['#ff398d','#ffc833','#71d82c','#28c7f7','#ff3b8c','#ffca2d','#4bc8f6','#ad52f6','#ff509d'];
 const defs=colors.map((c,i)=>'<linearGradient id="'+id+'-g'+i+'" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff5ff"/><stop offset=".2" stop-color="'+c+'"/><stop offset=".7" stop-color="'+c+'"/><stop offset="1" stop-color="#b12878"/></linearGradient>').join('');
 const text=[...'シックスドロップ'].map((ch,i)=>'<text x="'+(95+i*72)+'" y="113" fill="url(#'+id+'-g'+i+')">'+ch+'</text>').join('');
 return '<svg class="six-art-logo" viewBox="0 0 760 174" role="img" aria-label="シックスドロップ SIX DROP" xmlns="http://www.w3.org/2000/svg"><defs>'+defs+'<pattern id="'+id+'-stripe" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="26" height="26" fill="#fff1e3"/><rect width="12" height="26" fill="#ff64aa"/></pattern><linearGradient id="'+id+'-r" x2="0" y2="1"><stop stop-color="#fff8d9"/><stop offset="1" stop-color="#ffd080"/></linearGradient></defs><g stroke-linejoin="round"><path d="M30 104Q380-22 730 104L715 146Q380 110 45 146Z" fill="#ff83b9" stroke="#e89c43" stroke-width="8"/><path d="M55 125Q380 90 705 125L690 159Q380 133 70 159Z" fill="url(#'+id+'-stripe)" stroke="#ffda88" stroke-width="5"/><g fill="#ffe561" stroke="#eaae3f" stroke-width="2"><path d="m382 5 7 16 18 2-13 12 3 18-15-8-16 8 3-18-13-12 18-2Z"/><path d="m81 24 5 12 13 2-9 9 2 13-11-6-12 6 3-13-10-9 13-2Z"/><path d="m673 22 5 12 13 2-9 9 2 13-11-6-12 6 3-13-10-9 13-2Z"/></g><g fill="#fff0f4" stroke="#e99ac2" stroke-width="3"><path d="M332 68V39h25v29M404 68V39h25v29M365 68V26h28v42"/><path d="m326 39 19-28 19 28m35 0 18-28 19 28m-77-13 20-23 20 23" fill="#ff86b9"/></g><g fill="#ff71ae" stroke="#fff2db" stroke-width="5"><circle cx="32" cy="77" r="28"/><circle cx="728" cy="79" r="28"/></g><g fill="none" stroke="#fff4eb" stroke-width="7"><path d="M25 83c-17-20 19-34 23-13s-18 24-23 12 12-17 14-6M720 87c-17-20 19-34 23-13s-18 24-23 12 12-17 14-6"/></g><g font-family="CookieLabels,Arial Rounded MT Bold,system-ui,sans-serif" font-size="77" font-weight="1000" text-anchor="middle" paint-order="stroke fill" stroke="#8f215e" stroke-width="16">'+text+'</g><g font-family="CookieLabels,Arial Rounded MT Bold,system-ui,sans-serif" font-size="77" font-weight="1000" text-anchor="middle" paint-order="stroke fill" stroke="#ffe7a5" stroke-width="11">'+text+'</g><g font-family="CookieLabels,Arial Rounded MT Bold,system-ui,sans-serif" font-size="77" font-weight="1000" text-anchor="middle" paint-order="stroke fill" stroke="#fffced" stroke-width="6">'+text+'</g><rect x="258" y="132" width="244" height="31" rx="13" fill="url(#'+id+'-r)" stroke="#e6a13d" stroke-width="3"/><text x="380" y="155" text-anchor="middle" font-family="system-ui,sans-serif" font-size="23" font-weight="1000" letter-spacing="4" fill="#e63987" stroke="#fff6e0" stroke-width="1" paint-order="stroke fill">SIX DROP</text></g></svg>';
}

// Round variants retain the texture, specular highlights and motifs of the supplied PNG.
const SIX_PNG_STYLES={
 lime:{src:1,h:86,s:.90},green:{src:3,h:139,s:.75},aqua:{src:2,h:189,s:.78},navy:{src:2,h:227,s:.78,light:.78},
 orange:{src:1,h:26,s:.97},yellow:{src:1,h:51,s:.94},violet:{src:3,h:279,s:.82},red:{src:0,h:348,s:.90},
 gold:{src:1,h:45,s:.9},silver:{src:2,h:222,s:.09,light:1.08},diamond:{src:3,h:194,s:.30,light:1.12}
};
function sixHsl(r,g,b){r/=255;g/=255;b/=255;const hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo,l=(hi+lo)/2;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=hi===r?(g-b)/d+(g<b?6:0):hi===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return [h,s,l];}
function sixRgb(h,s,l){h=(h%1+1)%1;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h*12)%12;return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)));};return [f(0),f(8),f(4)];}
function sixArtCandySprite(color,round=1,sugar=false,chance=false){
 const theme=chance?SIX_CHANCE_THEME:sixRoundTheme(round),name=theme.colors[color%theme.colors.length],style=SIX_PNG_STYLES[name],key='orbPNG/'+round+'/'+name+'/'+(chance?'chance':'base');
 if(sixArtCache.has(key))return sixArtCache.get(key);
 const original=sixOriginalCandySprite(style.src),cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');x.drawImage(original,0,0,128,128);
 const image=x.getImageData(0,0,128,128),d=image.data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const [h,s,l]=sixHsl(d[i],d[i+1],d[i+2]);if(s>.13){const rgb=sixRgb(style.h/360,Math.min(1,style.s*(.65+s*.35)),Math.min(.98,l*(style.light||1)));d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];}}
 // Preserve the original fruit/swirl pixels, while rebuilding the outer candy lens.
 const motif=document.createElement('canvas');motif.width=motif.height=128;motif.getContext('2d').putImageData(image,0,0);x.clearRect(0,0,128,128);
 const sat=Math.round(style.s*86),hue=style.h,hsl=(light,alpha=1)=>'hsla('+hue+','+sat+'%,'+light+'%,'+alpha+')';
 const disc=(r,fill)=>{x.fillStyle=fill;x.beginPath();x.arc(64,64,r,0,Math.PI*2);x.fill();};
 disc(62,hsl(27));
 const rim=x.createLinearGradient(25,8,100,119);rim.addColorStop(0,'#ffffe9');rim.addColorStop(.32,hsl(86));rim.addColorStop(.58,hsl(54));rim.addColorStop(.85,hsl(76));rim.addColorStop(1,hsl(34));disc(60,rim);
 disc(55,hsl(43));
 const face=x.createRadialGradient(43,32,4,65,68,62);face.addColorStop(0,hsl(85));face.addColorStop(.42,hsl(69));face.addColorStop(.8,hsl(53));face.addColorStop(1,hsl(37));disc(52,face);
 x.save();x.beginPath();x.arc(64,64,49,0,Math.PI*2);x.clip();x.globalAlpha=.91;x.drawImage(motif,16,16,96,96,18,18,92,92);x.globalAlpha=1;
 // Broad translucent diagonal polish, over the retained fruit and candy pattern.
 const glaze=x.createLinearGradient(18,12,105,119);glaze.addColorStop(0,'#ffffff4d');glaze.addColorStop(.28,'#ffffff26');glaze.addColorStop(.35,'#ffffff08');glaze.addColorStop(.56,'#ffffff24');glaze.addColorStop(.63,'#ffffff00');glaze.addColorStop(1,'#00172c26');x.fillStyle=glaze;x.fillRect(10,10,108,108);x.restore();
 x.strokeStyle='#fffde0c9';x.lineWidth=2.4;x.beginPath();x.arc(64,64,56,-Math.PI*.94,-Math.PI*.14);x.stroke();
 x.strokeStyle=hsl(87,.8);x.lineWidth=2;x.beginPath();x.arc(64,64,53,.12,Math.PI*.83);x.stroke();
 x.save();x.translate(43,29);x.rotate(-.5);const shine=x.createRadialGradient(0,0,1,0,0,15);shine.addColorStop(0,'#ffffffd9');shine.addColorStop(1,'#ffffff00');x.scale(1.4,.45);x.fillStyle=shine;x.beginPath();x.arc(0,0,15,0,7);x.fill();x.restore();
 x.save();x.beginPath();x.arc(64,64,62,0,7);x.clip();
 if(round>=2){x.strokeStyle=round>=6?'#fff0afcc':'#ffffffb5';x.lineWidth=round>=6?2.2:1;x.beginPath();x.arc(64,64,58,0,7);x.stroke();}
 if(round>=3){const n=round*2;for(let i=0;i<n;i++){const ang=i*2*Math.PI/n,xp=64+Math.cos(ang)*56,yp=64+Math.sin(ang)*56;x.fillStyle=round>=6?'#ffe36d':'#fffbea';x.beginPath();x.arc(xp,yp,round>=6?1.9:1.25,0,7);x.fill();}}
 if(round>=4){x.strokeStyle='#fff3c790';x.lineWidth=1.1;x.beginPath();x.arc(64,64,51,0,7);x.stroke();}
 if(round>=6){for(const [px,py,r] of [[24,31,4],[100,84,3],[41,109,3]])sixArtStar(x,px,py,r,'#fff6bc','#f5c35e');}
 if(chance){const g=x.createLinearGradient(22,22,106,108);g.addColorStop(0,'#ffffffdd');g.addColorStop(.3,'#ffffff10');g.addColorStop(.55,'#ffffff77');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.beginPath();x.arc(64,64,51,0,7);x.fill();
  if(name==='diamond'){x.beginPath();x.moveTo(64,25);x.lineTo(101,50);x.lineTo(88,98);x.lineTo(40,98);x.lineTo(27,50);x.closePath();x.fillStyle='#dffcff50';x.fill();x.strokeStyle='#ffffffdc';x.lineWidth=1.7;x.stroke();x.beginPath();x.moveTo(64,25);x.lineTo(40,98);x.moveTo(64,25);x.lineTo(88,98);x.moveTo(27,50);x.lineTo(101,50);x.stroke();}
 }
 x.restore();sixArtCache.set(key,cv);return cv;
}

function sixCandySprite(color,round=1,sugar=false){return sixArtCandySprite(color,round,sugar);}
function sixText(x,text,px,py,size,color='#fff1d6',align='center'){
 x.font='900 '+size+'px system-ui,sans-serif';x.textAlign=align;x.textBaseline='middle';x.lineJoin='round';x.strokeStyle='#46294c';x.lineWidth=Math.max(1.2,size*.2);x.strokeText(text,px,py);x.fillStyle=color;x.fillText(text,px,py);
}
function sixHull(points){
 const list=points.map(p=>({...p})).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);if(list.length<3)return list;
 const low=[],high=[];for(const p of list){while(low.length>1&&cross(low.at(-2),low.at(-1),p)<=0)low.pop();low.push(p);}for(const p of [...list].reverse()){while(high.length>1&&cross(high.at(-2),high.at(-1),p)<=0)high.pop();high.push(p);}return low.slice(0,-1).concat(high.slice(0,-1));
}

/* Host-compatible renderer for Six Candy v2. Uses the retained original candy sprites. */
function sixShapeIcon(type){
 const cells=type==='hexagon'?[[0,0],[0,1],[1,2],[2,2],[2,1],[1,0]]:type==='line'?[[1,0],[1,1],[1,2],[1,3]]:[[0,1],[1,1],[1,2],[2,1],[2,2],[2,3]];
 return '<svg viewBox="0 0 66 52" aria-hidden="true">'+cells.map(([r,c])=>'<circle cx="'+(12+(c-r/2)*16)+'" cy="'+(9+r*15)+'" r="6.8" fill="'+(type==='hexagon'?'#aa73e8':type==='line'?'#48bfd8':'#ee749d')+'" stroke="#fff4cd" stroke-width="2"/>').join('')+'</svg>';
}
function sixRoleTrack(type,label){
 return '<div class="six-role" data-role="'+type+'"><div class="six-role-head">'+sixShapeIcon(type)+'<strong>'+label+'</strong></div><div class="six-role-window"><div class="six-role-reel">'+Array.from({length:161},(_,n)=>'<div class="six-role-row" data-count="'+n+'"><span>'+n+'個</span><b>'+(n*SIX_PAY[type]/100).toFixed(1)+'×</b></div>').join('')+'</div></div></div>';
}
function setupCarnivalSlot(s){
 if(s.candyCanvas)return;s.panel.classList.add('carnival-panel','six-ball-panel');s.tab.classList.add('carnival-tab');s.holder.classList.add('carnival-slot');
 s.tab.querySelector('.tab-game-name').innerHTML=sixArtLogoMarkup('tab');s.tab.querySelector('.tab-game-name').setAttribute('aria-label','シックスドロップ');
 const wrap=document.createElement('div');wrap.className='carnival-surface six-ball-surface';wrap.innerHTML='<div class="six-board-viewport"><canvas class="carnival-canvas" width="640" height="640" role="img" aria-label="キャンディボード"></canvas><div class="six-reach-layer" aria-hidden="true"></div></div><div class="carnival-status" role="status"></div><div class="carnival-reward" role="status" hidden></div>';
 s.panel.append(wrap);s.candyCanvas=wrap.querySelector('canvas');s.candyCtx=s.candyCanvas.getContext('2d');s.candyStatus=wrap.querySelector('.carnival-status');s.candyReward=wrap.querySelector('.carnival-reward');s.sixReachLayer=wrap.querySelector('.six-reach-layer');
 const heading=document.createElement('div');heading.id='carnival-heading';heading.innerHTML='<strong>シックスドロップ'+sixArtLogoMarkup('main')+'</strong><span>Round <b id="carnival-complete">1</b></span>';document.querySelector('.festival-top').append(heading);
 const odds=document.createElement('div');odds.id='carnival-odds';odds.innerHTML='<div class="six-refill-note">盤面の番号にHITしなければ補充！<br>未抽選番号付きドロップも上から追加</div><section class="six-total"><span>TOTAL WIN</span><b id="carnival-win">0</b></section><div class="six-role-tables">'+sixRoleTrack('line','直線')+sixRoleTrack('triangle','トライアングル')+sixRoleTrack('hexagon','ヘキサゴン')+'</div><div class="six-clear-bonus">全消し <b>＋100×BET</b></div><div class="six-round-rail"><strong>ROUND CLEAR BONUS</strong><div class="six-round-cards">'+[-1,0,1].map(offset=>'<div class="six-round-card" data-offset="'+offset+'"><small>ROUND</small><b></b><em></em><span class="six-round-sugar sugar-gem" hidden></span></div>').join('')+'</div></div><div class="six-bonus-total">クリア累計 <b>0.0×</b></div><div class="six-bonus-list">'+Array.from({length:8},(_,i)=>'<span data-round="'+(i+1)+'">R'+(i+1)+' <b>'+ (sixRoundClearBonus(i+1)/100).toFixed(1)+'×</b></span>').join('')+'</div>';
 $('odds-panel').append(odds);s.sixOdds=odds;
}
function sixDropReachCometMarkup(tier){return reachCometMarkup(tier).replaceAll('<rect','<circle').replaceAll('x="4" y="4" width="92" height="92" rx="11"','cx="50" cy="50" r="46"');}
function sixReachPresentation(s,results,grid,ready){
 const layer=s.sixReachLayer,w=layer.parentElement.clientWidth,h=layer.parentElement.clientHeight,k=Math.min(w,h)/320,layout=sixLayout(s.engine.rows),list=ready?[]:results;
 const key=[w,h,s.engine.version,s.engine.boardGeneration,s.engine.fx?.phase,list.map(p=>p.number+'/'+p.tier+'/'+p.total).join(',')].join('|');
 layer.classList.toggle('is-paused',!!app?.paused);if(key===s.sixReachKey)return;s.sixReachKey=key;layer.replaceChildren();
 const lookup=new Map(grid.flatMap((row,r)=>row.map((t,c)=>t?[t.number,[r,c]]:null)).filter(Boolean));
 for(const result of list){const pos=lookup.get(result.number);if(!pos)continue;const p=sixXY(...pos,s.engine.rows),el=document.createElement('div');el.className='six-reach-cell';el.style.cssText='left:'+((w-320*k)/2+(p.x-layout.radius)*k)+'px;top:'+((h-320*k)/2+(p.y-layout.radius)*k)+'px;width:'+layout.step*k+'px;height:'+layout.step*k+'px';
  const tier=result.tier;el.innerHTML='<span class="reach-glints" data-tier="'+tier+'"><i></i><i></i><i></i></span>'+(tier===1||tier===2?'<span class="reach-orbit" data-tier="'+tier+'">'+sixDropReachCometMarkup(tier)+'</span>':'')+(tier===3?'<span class="allclear-reach-aura"><svg class="allclear-reach-perimeter" viewBox="0 0 100 100"><circle class="perimeter-rail" cx="50" cy="50" r="44" pathLength="100"/><circle class="perimeter-trail" cx="50" cy="50" r="44" pathLength="100"/><circle class="perimeter-core" cx="50" cy="50" r="44" pathLength="100"/></svg></span>':'')+'<span class="tile-reach '+(tier?'alternating':'')+'" data-tier="'+tier+'"><span class="reach-first">リーチ</span>'+(tier?'<span class="reach-second">'+REACH_WORDS[tier]+'</span>':'')+'</span>';layer.append(el);
 }
}
// Deterministic PCM effects share the existing unlocked context, mute and reset bus.
let sixCandyAudioLast={break:-100,fall:-100,role:-100,pop:-100};
function sixCandyAudio(kind,amount=1){
 if(!audio||audio.state!=='running'||!$('sound').checked||app?.paused||document.hidden||!inView)return;
 const at=audio.currentTime;if(at-sixCandyAudioLast[kind]<(kind==='fall'?.055:.035))return;sixCandyAudioLast[kind]=at;
 const names=kind==='fall'?['six-marble-0','six-marble-1','six-marble-2']:kind==='role'?['six-role-rush']:kind==='clear'?['six-round-fanfare']:kind==='refill'?['six-refill-shower']:kind==='pop'?['six-cluster-pop']:['six-hard-candy'];
 names.forEach((name,j)=>{
  if(sfxBuffers.has(name))return;const duration=kind==='fall'?.09:kind==='role'?.32:kind==='refill'?.72:kind==='clear'?.55:.19,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),d=buffer.getChannelData(0);
  let seed=71527+j*977,prev=0;for(let i=0;i<d.length;i++){
   const t=i/audio.sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1,high=n-prev;prev=n;
   if(kind==='fall'){const f=[1250,940,1510][j];d[i]=Math.min(1,t/.0015)*(Math.exp(-t*110)*high*.21+Math.sin(2*Math.PI*f*t)*Math.exp(-t*75)*.35+Math.sin(2*Math.PI*f*2.73*t)*Math.exp(-t*120)*.13);}
   else if(kind==='role'){const envelope=Math.sin(Math.PI*Math.min(1,t/.32))*Math.exp(-t*3);d[i]=(high*.16+Math.sin(2*Math.PI*(440*t+2400*t*t))*.30+Math.sin(2*Math.PI*(660*t+3200*t*t))*.12)*envelope;}
   else if(kind==='clear'){const note=Math.min(3,Math.floor(t/.12)),f=[784,988,1175,1568][note],u=t-note*.12;d[i]=(Math.sin(2*Math.PI*f*u)*.25+Math.sin(2*Math.PI*f*2*u)*.08)*Math.exp(-u*15)*Math.min(1,u/.006);}
   else if(kind==='refill'){const env=Math.sin(Math.PI*t/.72);d[i]=(Math.sin(2*Math.PI*(1800*t-650*t*t))*.23+Math.sin(2*Math.PI*2700*t)*.12+high*.07)*env;}
   else if(kind==='pop'){d[i]=(Math.sin(2*Math.PI*(900*t-1500*t*t))*.55+high*.08)*Math.exp(-t*32)*Math.min(1,t/.002);}
   else{const burst=[0,.014,.033].reduce((v,b)=>v+(t>=b?Math.exp(-(t-b)*110):0),0);d[i]=Math.min(1,t/.001)*(high*burst*.19+(Math.sin(2*Math.PI*2340*t)+Math.sin(2*Math.PI*3710*t))*.10*Math.exp(-t*24));}
  }sfxBuffers.set(name,buffer);
 });
 const count=kind==='fall'?Math.min(3,Math.max(1,amount)):1;
 for(let i=0;i<count;i++)sound(names[i%names.length],{delay:i*18,volume:kind==='fall'?.55/(1+i*.4):.72});
}

function carnivalEvent(s,ev,e,a){
 setupCarnivalSlot(s);s.event=ev;s.dirtyMain=true;s.dirtyMini=true;
  if(['ready','error'].includes(ev.phase)){s.sixSparkleIds=new Set();s.sixSparkleVersion=null;s.sixSparkleKey=null;stopSugarAward(s);clearMiniResult(s);s.candyReward.hidden=true;if(s.candyFrame)cancelAnimationFrame(s.candyFrame);s.candyFrame=0;s.candyLastDraw=0;s.candyClockStamp=null;s.sixFallSoundFx=null;s.sixRefillFx=null;s.candyTime=0;invalidateReach(s);}
 if(ev.phase==='drawpending'){requestSixSparkles(s,e,a);clearMiniResult(s);invalidateReach(s);requestReach(s,e,a);s.message=e.candyMessage;carnivalQueueFrame(s);scheduleUI(a);return;}
 if(ev.phase==='sugaraward')showSugarAward(s,ev.steps);
 if(ev.phase.startsWith('pyramid')){s.candyReward.hidden=true;s.candyReward.classList.remove('six-round-callout','six-special-award');invalidateReach(s);}
 if(['pyramidAward','pyramidAllClear','pyramidRoundBonus'].includes(ev.phase)&&ev.gain>0){
  const gain=ev.gain;s.candyReward.hidden=false;s.candyReward.classList.add('six-special-award');s.candyReward.dataset.tier=gain>=1000?'2':gain>=300?'1':'0';
  const title=ev.phase==='pyramidAllClear'?'ALL CLEAR BONUS':ev.phase==='pyramidRoundBonus'?'ROUND '+ev.roundIndex+' CLEAR BONUS':[ev.lines?'直線 ×'+ev.lines:'',ev.triangles?'トライアングル ×'+ev.triangles:'',ev.hexagons?'ヘキサゴン ×'+ev.hexagons:''].filter(Boolean).join(' / ');
  const remain=e.processed+(ev.numbers?.length||0)<8,advance=e.roundIndex<5&&remain;
  s.candyReward.innerHTML='<small>'+title+'</small><strong>＋'+num(medalWin(a.bet(s.i),gain))+' <em>WIN</em></strong><span>'+ (ev.chain?ev.chain+' CHAIN':'') +'</span><b class="six-next">'+(advance?'NEXT ROUND '+(e.roundIndex+1)+' 進出':e.roundIndex===5?'ALL ROUNDS CLEAR':'ROUND CLEAR')+'</b>';if(s.i===active)sound('confirm',{volume:1});
 }
 if(ev.phase==='pyramidRound'){clearMiniResult(s);s.candyReward.hidden=false;s.candyReward.classList.add('six-round-callout');s.candyReward.dataset.tier='1';s.candyReward.innerHTML='<small>NEXT ROUND</small><strong>Round '+ev.nextRound+'</strong>';}
 if(ev.phase==='pyramidBreak'&&ev.removed?.length&&s.i===active)sixCandyAudio('break');
 if(ev.phase==='pyramidAward'&&ev.removed?.length&&s.i===active&&!ev.forms?.length)sixCandyAudio('pop');
 if(ev.phase==='pyramidFall'&&motionReduced&&s.i===active)sixCandyAudio('fall',ev.moves?.length||1);
 if(ev.phase==='pyramidTopUp'&&s.i===active)sixCandyAudio('refill');
 if(ev.phase==='pyramidSweep'&&s.i===active)sound('magic',{volume:.35});
 if(ev.phase==='pyramidShape'&&ev.forms?.length&&s.i===active)sixCandyAudio('role');
 if(ev.phase==='settled'){if(!ev.advance)s.candyReward.hidden=true;clearMiniResult(s);if(ev.batchChain>0||ev.batchShapes>0){s.miniLastResult=(ev.batchShapes||0)+'役 · '+(ev.batchChain||0)+'連鎖';s.miniResult.innerHTML='<strong>'+(ev.batchShapes||0)+' SHAPES</strong><small>'+(ev.batchChain||0)+'連鎖</small>';s.miniResultState={remaining:MINI_RESULT_MS,stamp:null,version:e.version};}}
 if(['waiting','settled'].includes(ev.phase))requestSixSparkles(s,e,a);
 if(['waiting','settled','complete'].includes(ev.phase))requestReach(s,e,a);s.message=e.candyMessage;carnivalQueueFrame(s);scheduleUI(a);
}
function carnivalQueueFrame(s){if(s.candyFrame||document.hidden||!inView)return;const version=s.engine.version;s.candyFrame=requestAnimationFrame(now=>{s.candyFrame=0;if(s.engine.version!==version)return;if(s.candyLastDraw&&now-s.candyLastDraw<32){carnivalQueueFrame(s);return;}s.candyLastDraw=now;drawCarnival(s,now);});}
const sixDemoCache=new Map();
function sixDemo(rows,round=1){const key=rows+'/'+round;if(!sixDemoCache.has(key)){const holes=new Set(SIX_START_GAP_TEMPLATES[0].map(p=>sixKey(...p))),colors=sixRoundColorCount(round);sixDemoCache.set(key,sixEmpty(rows).map((row,r)=>row.map((_,c)=>holes.has(sixKey(r,c))?null:{id:sixKey(r,c),number:null,color:(r+c+Math.floor((r+rows%2)/2))%colors})));}return sixDemoCache.get(key);}
function sixFallFrame(fx,progress){
 const steps=fx.steps||[];if(!steps.length)return {grid:fx.grid,moves:[],progress:1};const total=steps.reduce((n,f)=>n+f.ms,0),motionMs=fx.motionMs||total,visualProgress=fx.motionMs?Math.min(1,(fx.elapsed||0)/Math.max(1,motionMs)):progress;let t=Math.min(total,visualProgress*total);
 for(let i=0;i<steps.length;i++){const f=steps[i];if(t<=f.ms||i===steps.length-1)return {grid:f.grid,moves:f.moves,progress:Math.min(1,t/f.ms),index:i};t-=f.ms;}
 return {grid:fx.grid,moves:[],progress:1};
}
function drawCarnival(s,now=performance.now()){
 if(s.engine?.kind!=='candy')return;setupCarnivalSlot(s);const e=s.engine,x=s.candyCtx,paused=!app||app.paused||document.hidden||!inView,bet=app?.bet(s.i)||0,ready=app?.phase==='ready',rows=e.rows,layout=sixLayout(rows),fx=e.fx;
 if(s.candyClockStamp==null)s.candyClockStamp=now;if(!paused)s.candyTime=(s.candyTime||0)+Math.min(100,Math.max(0,now-s.candyClockStamp));s.candyClockStamp=now;const time=s.candyTime||0;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,320,320);
 if(ready){const guideTime=Math.min(SIX_TUTORIAL_DURATION-1,autoRoundRemaining>=0&&autoRoundRemaining<=BET_DURATION_MS?BET_DURATION_MS-autoRoundRemaining:time);sixDrawTutorial(s,guideTime,bet);if(!paused&&!jpcSession.active)carnivalQueueFrame(s);return;}s.candyCanvas.dataset.mode='playing';
 const progress=fx?(()=>{const critical=['pyramidFall','pyramidShape','pyramidBreak','pyramidTopUp'].includes(fx.phase),rate=critical?1:(e.presentationRate||1);if(!paused){if(fx.stamp!==null)fx.elapsed+=Math.max(0,now-fx.stamp)*rate;fx.stamp=now;}else fx.stamp=null;return Math.min(1,fx.elapsed/Math.max(1,fx.ms));})():0;
 const sweep=fx?.phase==='pyramidSweep',refill=fx?.phase==='pyramidRefill',transition=sweep||refill;
 const fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,motionReduced?1:progress):null,grid=transition?fx.grid:fall?.grid||e.pyramid,moving=new Map((fall?.moves||[]).map(m=>[m.id,m]));
 if(fall&&!paused&&!motionReduced&&s.i===active){
  if(s.sixFallSoundFx!==fx){s.sixFallSoundFx=fx;s.sixFallSoundIndex=-1;}
  const landed=fall.progress>=.82?fall.index:fall.index-1;
  if(landed>s.sixFallSoundIndex){s.sixFallSoundIndex=landed;sixCandyAudio('fall',fall.moves.length);}
 }
 if(refill&&!paused&&!motionReduced&&s.i===active){const landed=Math.min(rows-1,Math.floor((progress*(480+(rows-1)*96)-400)/96));if(s.sixRefillFx!==fx){s.sixRefillFx=fx;s.sixRefillRow=-1;}if(landed>s.sixRefillRow){s.sixRefillRow=landed;sixCandyAudio('fall',2);}}
 x.drawImage(sixArtBackdrop(rows),0,0,320,320);
 const lit=new Set((fx?.phase==='pyramidHit'?fx.cells:[]).map(p=>sixKey(...p))),shaped=new Set((fx?.forms||[]).flatMap(f=>f.cells).map(p=>sixKey(...p))),byNumber=new Map((ready?[]:visibleReachResults(s,app)).map(p=>[p.number,p]));
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){
  const t=grid[r][c];if(!t)continue;let pos=sixXY(r,c,rows);const m=moving.get(t.id);
  if(m&&!motionReduced){const p=sixMotionPoint(m,fall.progress);pos={x:160+p.x*layout.step,y:layout.top+p.y*layout.step};}
  if(fx?.phase==='pyramidTopUp'&&!motionReduced&&fx.added.some(a=>a.tile.id===t.id)){const u=Math.max(0,Math.min(1,progress*fx.ms/1100));pos.y-=350*(1-u*u);}
  const pose=sixTransitionPose(fx,r,c,t,rows,progress,motionReduced);if(!pose.visible)continue;if(transition)pos={x:pose.x,y:pose.y};
  const pending=!transition&&t.number!=null&&(e.pendingDraws.has(t.number)||lit.has(sixKey(r,c))),reach=t.number!=null?byNumber.get(t.number):null,shape=shaped.has(sixKey(r,c)),radius=layout.radius;
  x.save();if(fx?.phase==='pyramidHit'&&lit.has(sixKey(r,c))&&!motionReduced){const bounce=Math.sin(Math.PI*progress);x.translate(pos.x,pos.y);x.scale(1+.09*bounce,1-.10*bounce);x.translate(-pos.x,-pos.y);}x.globalAlpha=pose.alpha;if(!ready&&pending)x.globalAlpha=motionReduced?1:.55+.45*(.5+.5*Math.sin(time/115));if(shape||reach){x.shadowBlur=shape?12:6;x.shadowColor=shape?'#ffe39a':reach.tier>=2?'#eb93ff':'#fff3b6';}
  const ordinarySparkle=s.sixSparkleVersion===e.version&&s.sixSparkleIds?.has(t.id);
  const candyR=radius,idleLift=!m&&!transition&&!motionReduced?Math.sin(time/780+t.id*.67)*.85:0,idleBreath=!m&&!transition&&!motionReduced?1+.017*Math.sin(time/930+t.id*.41):1,idleSway=!m&&!transition&&!motionReduced?1+.012*Math.sin(time/1110+t.id*.59):1;
  // Keep centres and outer radii fixed so resting candies stay in contact.
  // Resting candy artwork breathes slightly; the number remains upright.
  x.save();x.translate(pos.x,pos.y+idleLift);
  if(transition){x.rotate(pose.rotation);x.scale(pose.scale,pose.scale);}else if(!m&&!motionReduced){x.rotate(Math.sin(time/1400+t.id*.53)*.016);x.scale(idleBreath,idleSway);}
  if(m&&!motionReduced){const a=sixPoint(...m.from,rows),b=sixPoint(...m.to,rows);x.rotate(Math.sign(b.x-a.x||((t.id&1)?1:-1))*.22*Math.sin(Math.PI*fall.progress));}
  x.drawImage(sixArtCandySprite(t.color,ready?1:e.roundIndex,!!t.sugar,e.chanceRound===e.roundIndex),-candyR,-candyR,candyR*2,candyR*2);x.restore();
  if(!motionReduced&&!m&&!paused&&!transition){x.fillStyle='rgba(255,255,245,'+(.12+.11*(.5+.5*Math.sin(time/1050+t.id*2.1)))+')';x.beginPath();x.ellipse(pos.x-radius*.32,pos.y-radius*.42+idleLift*.28,radius*.16,radius*.07,-.55,0,Math.PI*2);x.fill();}
  x.shadowBlur=0;
  if(t.sugar){const img=getSugarSprite(wonderTier(bet));if(img)x.drawImage(img,pos.x-radius*.75,pos.y-radius*.75,radius*1.5,radius*1.5);}
  if(e.chanceRound===e.roundIndex&&!motionReduced&&!transition){const spark=.5+.5*Math.sin(time/350+t.id*2.4);x.globalAlpha*=spark;sixArtStar(x,pos.x+radius*.55,pos.y-radius*.55,1.4+spark*2,'#fff','#fff');x.globalAlpha=1;}
  if(ordinarySparkle&&!m&&!transition){for(let k=0;k<3;k++){const a=k*2.094+t.id*.37,twinkle=motionReduced?.7:.3+.7*(.5+.5*Math.sin(time/240+k*2.1));sixArtStar(x,pos.x+Math.cos(a)*radius*.78,pos.y+Math.sin(a)*radius*.78,1.5+twinkle*2.3,'#fffce1','#e6f9ff');}}
  if(!ready&&t.number!=null)sixPaintCandyNumber(x,t.number,pos.x,pos.y+1,radius,t.color,e.roundIndex,e.chanceRound===e.roundIndex);
  if(shape||pending||reach){x.strokeStyle=shape?'#fff6b3':pending?'#fff9e7':reach.tier>=2?'#f0a2ff':'#fff3b6';x.lineWidth=shape?2.3:1.5;x.beginPath();x.arc(pos.x,pos.y,radius,0,Math.PI*2);x.stroke();}x.restore();
 }
 sixStageEffects(x,fx,progress,e.roundIndex,rows,motionReduced);
 sixArcadeAccents(s,x,time);
 if(!bet){x.fillStyle='#231b3ba8';x.fillRect(0,0,320,320);sixText(x,'0 BET',160,140,29);sixText(x,'BETして キャンディを落とそう',160,172,11);}
 s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
 s.candyCanvas.setAttribute('aria-label','シックスドロップ・Round '+e.roundIndex+'、'+rows+'段、'+e.remainingCandies+'個、ヘキサゴン'+e.hexagons+'、トライアングル'+e.triangles+'、直線'+e.lines);
 sixReachPresentation(s,transition?[]:visibleReachResults(s,app),grid,transition);
 s.candyStatus.textContent=!bet?'0 BET・このゲームは参加しません':ready?'1〜25は各1個・空白も使って役を作ろう！':e.candyMessage;
 if((fx||e.pendingDraws.size||(!motionReduced&&bet))&&!paused&&!jpcSession.active)carnivalQueueFrame(s);
}
function carnivalHud(a){
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;setupCarnivalSlot(s);document.body.classList.toggle('carnival-active',active===2);s.tab.setAttribute('aria-label','シックスドロップ・Round '+e.roundIndex+'・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 put('carnival-complete',e.roundIndex);fitGoldenNumber($('carnival-win'),num(medalWin(a.bet(2),e.totalHundredths)),23,100);
 for(const [role,count] of [['line',e.lines],['triangle',e.triangles],['hexagon',e.hexagons]]){const col=s.sixOdds.querySelector('[data-role="'+role+'"]');if(col.dataset.count===String(count))continue;col.dataset.count=String(count);col.querySelector('.six-role-reel').style.transform='translateX('+(-Math.max(0,count-1)*62)+'px)';col.querySelectorAll('.six-role-row').forEach(row=>row.classList.toggle('chosen',Number(row.dataset.count)===count));}
 for(const el of s.sixOdds.querySelectorAll('.six-round-card')){const offset=Number(el.dataset.offset),r=e.roundIndex+offset,valid=r>=1&&r<=5;el.classList.toggle('current',offset===0);el.classList.toggle('disabled',!valid);el.querySelector('b').textContent=valid?r:'—';el.querySelector('em').textContent=valid?'+'+(sixRoundClearBonus(r)/100).toFixed(1)+'×':'';const sugar=el.querySelector('.six-round-sugar');sugar.hidden=!valid||e.sugarRound!==r||e.wonderCollected;if(!sugar.hidden)applySugarTier(sugar,wonderTier(a.bet(2)));}
 s.sixOdds.querySelector('.six-bonus-total b').textContent=(e.clearBonusHundredths/100).toFixed(1)+'×';s.sixOdds.querySelectorAll('.six-bonus-list span').forEach(el=>{el.classList.toggle('current',Number(el.dataset.round)===e.roundIndex);el.classList.toggle('cleared',e.clearedRounds.has(Number(el.dataset.round)));});
 const key=[e.version,e.phase,e.processed,e.roundIndex,e.boardGeneration,e.totalHundredths,e.clearBonusHundredths,a.bet(2),s.reachEpoch,s.reachStatus,a.paused,e.pendingDraws.size].join('/');if(s.candyKey!==key){s.candyKey=key;carnivalQueueFrame(s);}
}

/* Six Candy presentation v5: no gameplay RNG, no scoring, no board mutation. */
const SIX_STAGE_VERSION='bet-guide-stage-v5',SIX_TUTORIAL_DURATION=18000;
const sixV4Setup=setupCarnivalSlot,sixV4Backdrop=sixArtBackdrop;
const sixStageTone=round=>round>=5?'hot':round>=3?'citrus':round>=2?'fresh':'cool';
const sixCandyBackdropCache=new Map(),sixFrameImage=new Image(),sixFrameState={loaded:false,error:false};
sixFrameImage.onload=()=>{sixFrameState.loaded=true;sixCandyBackdropCache.clear();try{slots[2].candyKey='';carnivalQueueFrame(slots[2]);}catch{}};
sixFrameImage.onerror=()=>{sixFrameState.error=true;};
sixFrameImage.src='assets/six-candy-png/frame.webp?v=stage-v5';
function sixBackdropCandyMotifs(x){
 const wrapped=(cx,cy,scale,rot,color)=>{x.save();x.translate(cx,cy);x.rotate(rot);x.scale(scale,scale);x.fillStyle=color;x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.2;x.beginPath();x.roundRect(-9,-6,18,12,6);x.fill();x.stroke();x.beginPath();x.moveTo(-9,-4);x.lineTo(-18,-10);x.lineTo(-17,8);x.closePath();x.fill();x.beginPath();x.moveTo(9,-4);x.lineTo(18,-10);x.lineTo(17,8);x.closePath();x.fill();x.restore();};
 const pop=(cx,cy,r,color)=>{x.save();x.strokeStyle=color;x.lineWidth=2;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.stroke();for(let a=0;a<Math.PI*4;a+=Math.PI/4){const rr=r*(.18+.68*a/(Math.PI*4));x.beginPath();x.arc(cx,cy,rr,a,a+Math.PI/2);x.stroke();}x.beginPath();x.moveTo(cx-r*.2,cy+r);x.lineTo(cx-r*.75,cy+r*2.15);x.stroke();x.restore();};
 x.save();x.globalAlpha=.10;
 wrapped(32,72,.75,-.28,'#ffd2e7');wrapped(288,86,.68,.32,'#fff0ad');wrapped(39,224,.62,.18,'#cceeff');wrapped(278,242,.72,-.22,'#e0ccff');
 pop(286,150,12,'#ffd0e6');pop(34,154,10,'#d4eef7');
 x.fillStyle='#fff0c9';for(const [cx,cy,r] of [[74,42,3],[246,42,2],[66,276,2.5],[252,286,3],[20,118,2],[300,196,2]]){x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();}
 x.restore();
}
sixArtBackdrop=function(rows){
 const key=rows+'/'+sixFrameState.loaded;if(sixCandyBackdropCache.has(key))return sixCandyBackdropCache.get(key);
 const cv=document.createElement('canvas');cv.width=cv.height=320;const x=cv.getContext('2d'),base=sixFrameState.loaded?sixFrameImage:sixV4Backdrop(rows);x.drawImage(base,0,0,320,320);sixBackdropCandyMotifs(x);sixCandyBackdropCache.set(key,cv);return cv;
};
setupCarnivalSlot=function(s){
 sixV4Setup(s);if(s.sixStageSetup)return;s.sixStageSetup=true;
 const heading=$('carnival-heading'),cards=s.sixOdds.querySelector('.six-round-cards'),banner=document.createElement('div');
 banner.className='six-allclear-banner';banner.innerHTML='<strong>ALL CLEAR BONUS</strong><b></b><em>WIN</em>';
 heading.replaceChildren(cards,banner);s.sixHeading=heading;
 cards.querySelectorAll('.six-round-card').forEach(el=>{const n=Number(el.dataset.offset);el.querySelector('small').textContent=n<0?'PREV':n===0?'NOW':'NEXT';});
 s.sixOdds.querySelectorAll('.six-clear-bonus,.six-round-rail,.six-bonus-total,.six-bonus-list').forEach(el=>el.remove());
 const wrap=s.sixOdds.querySelector('.six-role-tables');wrap.className='six-role-summary';
 wrap.innerHTML=[['line','直線'],['triangle','△'],['hexagon','ヘキサゴン']].map(([role,label])=>'<div class="six-role-summary-row" data-role="'+role+'" aria-label="'+label+'"><div class="six-role-summary-icon"><canvas width="120" height="80" aria-hidden="true"></canvas><strong>'+label+'</strong></div><div class="six-role-summary-formula"><span class="unit">0 WIN</span><span class="times">×</span><span class="count">0個</span></div><b class="subtotal">0 WIN</b></div>').join('')+'<div class="six-role-summary-total"><span>TOTAL</span><b>0 WIN</b></div>';
 s.sixRoleSummary=wrap;s.candyCanvas.dataset.version=SIX_STAGE_VERSION;
};
carnivalHud=function(a){
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;setupCarnivalSlot(s);document.body.classList.toggle('carnival-active',active===2);s.tab.setAttribute('aria-label','シックスドロップ・Round '+e.roundIndex+'・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 const bet=a.bet(2);fitGoldenNumber($('carnival-win'),num(medalWin(bet,e.totalHundredths)),23,100);
 const artKey=e.roundIndex+'/'+sixCandyPngState.loaded+'/'+(e.chanceRound===e.roundIndex);let roleTotal=0;
 for(const [role,count] of [['line',e.lines],['triangle',e.triangles],['hexagon',e.hexagons]]){
  const row=s.sixOdds.querySelector('.six-role-summary-row[data-role="'+role+'"]');if(!row)continue;
  if(row.dataset.art!==artKey){row.dataset.art=artKey;sixDrawRoleIcon(row.querySelector('canvas'),role,e.roundIndex);}
  const unit=medalWin(bet,SIX_PAY[role]),subtotal=medalWin(bet,SIX_PAY[role]*count);roleTotal+=subtotal;
  row.querySelector('.unit').textContent=num(unit)+' WIN';row.querySelector('.count').textContent=count+'個';row.querySelector('.subtotal').textContent=num(subtotal)+' WIN';row.classList.toggle('hot',count>0);
 }
 const totalRow=s.sixOdds.querySelector('.six-role-summary-total b');if(totalRow)totalRow.textContent=num(roleTotal)+' WIN';
 for(const el of s.sixHeading.querySelectorAll('.six-round-card')){const offset=Number(el.dataset.offset),r=e.roundIndex+offset,valid=r>=1&&r<=5;el.classList.toggle('current',offset===0);el.classList.toggle('disabled',!valid);el.querySelector('b').textContent=valid?'R'+r:'—';el.querySelector('em').textContent=valid?(e.chanceRound===r&&r===e.roundIndex+1?'CHANCE! 3色':num(medalWin(bet,sixRoundClearBonus(r)))+' WIN'):'';el.dataset.level=valid?String(r):'0';el.dataset.tone=valid?sixStageTone(r):'';el.dataset.chance=valid&&e.chanceRound===r?'1':'0';const sugar=el.querySelector('.six-round-sugar');sugar.hidden=!valid||e.sugarRound!==r||e.wonderCollected;if(!sugar.hidden)applySugarTier(sugar,wonderTier(bet));}
 s.sixHeading.dataset.roundTone=sixStageTone(e.roundIndex);s.sixOdds.dataset.roundTone=sixStageTone(e.roundIndex);
 const banner=s.sixHeading.querySelector('.six-allclear-banner');banner.querySelector('b').textContent=num(medalWin(bet,SIX_PAY.allClear));banner.classList.toggle('celebrate',e.phase==='pyramidAllClear');banner.dataset.tone=sixStageTone(e.roundIndex);
 const key=[e.version,e.phase,e.processed,e.roundIndex,e.boardGeneration,e.totalHundredths,e.clearBonusHundredths,bet,s.reachEpoch,s.reachStatus,a.paused,e.pendingDraws.size].join('/');if(s.candyKey!==key){s.candyKey=key;carnivalQueueFrame(s);}
};
function sixTransitionPose(fx,r,c,t,rows,p,reduced=false){
 const pos=sixXY(r,c,rows),out={...pos,alpha:1,rotation:0,scale:1,visible:true};
 if(fx?.phase==='pyramidSweep'){
  if(reduced)return {...out,alpha:1-p,visible:p<1};
  const dx=pos.x-160,dy=pos.y-164,a=Math.atan2(dy||-1,dx||.1),d=520*p*p;
  return {x:pos.x+Math.cos(a)*d,y:pos.y+Math.sin(a)*d-55*p,alpha:Math.max(0,1-Math.max(0,p-.65)/.35),rotation:(t.id%2?1:-1)*(3+t.id%4)*p,scale:1-.12*p,visible:p<1};
 }
 if(fx?.phase==='pyramidRefill'){
  if(reduced)return {...out,alpha:p,visible:p>0};
  const age=p*(480+(rows-1)*96)-(rows-1-r)*96;
  if(age<0)return {...out,visible:false};
  const q=Math.min(1,age/400),bounce=age>400&&age<480?-Math.sin((age-400)/80*Math.PI)*2:0;
  return {...out,y:-40+(pos.y+40)*q*q+bounce,rotation:Math.sin(q*Math.PI)*.12*(c%2?1:-1)};
 }
 return out;
}
function sixDrawRoleIcon(canvas,type,round){
 const x=canvas.getContext('2d');x.clearRect(0,0,120,80);
 const ps=type==='line'?[[18,40],[46,40],[74,40],[102,40]]:type==='triangle'?[[60,13],[45,39],[75,39],[30,65],[60,65],[90,65]]:[[45,14],[75,14],[90,40],[75,66],[45,66],[30,40]];
 const color=type==='line'?2:type==='triangle'?0:Math.min(3,sixRoundColorCount(round)-1),sprite=sixArtCandySprite(color,round);
 for(const [cx,cy] of ps)x.drawImage(sprite,cx-15,cy-15,30,30);
}
function sixStageEffects(x,fx,p,round,rows,reduced){
 if(!fx)return;
 const crack=(pos,r,seed,alpha=1)=>{x.save();x.translate(pos.x,pos.y);x.rotate((seed%7-.3)*.09);x.globalAlpha=alpha;x.strokeStyle='rgba(255,248,218,.95)';x.lineWidth=1.5;x.shadowColor='#fff3ad';x.shadowBlur=7;x.beginPath();for(let k=0;k<4;k++){const a=(seed*.71+k*1.57)%6.28,inner=r*.16,outer=r*(.48+(k%2)*.16);x.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);x.lineTo(Math.cos(a+.10)*r*.32,Math.sin(a+.10)*r*.32);x.lineTo(Math.cos(a-.05)*outer,Math.sin(a-.05)*outer);}x.stroke();x.restore();};
 if(fx.phase==='pyramidShape'){
  const warn=.42+.58*(.5+.5*Math.sin(p*Math.PI*10));
  for(const cell of fx.cells||[]){const pos=sixXY(...cell,rows),r=sixLayout(rows).radius;x.save();x.globalAlpha=.28+.48*warn;x.strokeStyle='#fff6ad';x.lineWidth=2+warn*1.3;x.shadowColor='#fff0a2';x.shadowBlur=10+warn*8;x.beginPath();x.arc(pos.x,pos.y,r*(1.01+.045*warn),0,Math.PI*2);x.stroke();x.restore();crack(pos,r,cell[0]*17+cell[1]*31,.65+.3*warn);}
  for(const form of fx.forms||[]){
   const ps=form.cells.map(cell=>sixXY(...cell,rows)),hull=form.type==='line'?ps:sixHull(ps),color=form.type==='line'?'#99f7ff':form.type==='triangle'?'#ffec94':'#f2b5ff';
   x.save();x.strokeStyle=color;x.fillStyle=color+'24';x.shadowColor=color;x.shadowBlur=reduced?0:18;x.lineWidth=4;x.beginPath();hull.forEach((v,i)=>i?x.lineTo(v.x,v.y):x.moveTo(v.x,v.y));if(form.type!=='line'){x.closePath();x.fill();}x.stroke();const cx=ps.reduce((n,v)=>n+v.x,0)/ps.length,cy=ps.reduce((n,v)=>n+v.y,0)/ps.length;if(!reduced){if(form.type==='hexagon'){x.lineWidth=2;x.beginPath();x.arc(cx,cy,35+16*Math.sin(p*Math.PI),0,Math.PI*2);x.stroke();}for(let k=0;k<ps.length;k++){const a=p*Math.PI*2+k*Math.PI*2/ps.length,v=ps[k];sixArtStar(x,v.x+Math.cos(a)*6,v.y+Math.sin(a)*6,3.5,'#fffbe4',color);}}x.restore();
  }
 }
 if(fx.phase==='pyramidBreak'&&fx.removed&&p<.38){
  const pulse=.45+.55*(.5+.5*Math.sin(p*Math.PI*18));for(const v of fx.removed){const pos=sixXY(v.r,v.c,rows),r=sixLayout(rows).radius,sprite=sixArtCandySprite(v.tile.color,round);x.save();x.globalAlpha=.7+.3*pulse;x.shadowColor='#fff2a5';x.shadowBlur=12+8*pulse;x.drawImage(sprite,pos.x-r,pos.y-r,r*2,r*2);x.strokeStyle='#fff7b6';x.lineWidth=2.5;x.beginPath();x.arc(pos.x,pos.y,r*(1.02+.04*pulse),0,Math.PI*2);x.stroke();x.restore();crack(pos,r,v.tile.id,.65+.3*pulse);}
 }
 if(fx.removed&&p<.92){
  const delay=fx.phase==='pyramidBreak'?.30:0,q=Math.max(0,Math.min(1,(p-delay)/Math.max(.01,.90-delay))),tiles=fx.removed;if(q<=0)return;x.save();x.globalAlpha=1-q;
  for(const v of tiles){const pos=sixXY(v.r,v.c,rows),r=sixLayout(rows).radius;if(reduced){x.fillStyle='#fff7c9';x.beginPath();x.arc(pos.x,pos.y,r,0,7);x.fill();continue;}const sprite=sixArtCandySprite(v.tile.color,round),pieces=tiles.length>28?4:7;x.strokeStyle='#fff6ce';x.lineWidth=1.3;x.beginPath();x.arc(pos.x,pos.y,r*(.45+q),0,7);x.stroke();for(let k=0;k<pieces;k++){const a=k*Math.PI*2/pieces+(v.tile.id%13)*.11,d=(18+k%3*9)*q;x.save();x.translate(pos.x+Math.cos(a)*d,pos.y+Math.sin(a)*d+q*q*16);x.rotate(a+q*(k%2?2.4:-2.4));x.beginPath();x.moveTo(-4,-5);x.lineTo(7,-2);x.lineTo(3,6);x.lineTo(-5,3);x.closePath();x.clip();x.drawImage(sprite,-r,-r,r*2,r*2);x.restore();}if(v.tile.id%3===0)sixArtStar(x,pos.x+Math.sin(v.tile.id)*q*30,pos.y-q*25,3*(1-q),'#fff','#ffdc89');}
  x.restore();
 }
}
function sixTutorialScene(time){const t=((time%SIX_TUTORIAL_DURATION)+SIX_TUTORIAL_DURATION)%SIX_TUTORIAL_DURATION;return {index:t<4500?0:t<9000?1:t<14000?2:3,t};}
const sixTutorialIconCache=new Map();
function sixTutorialIcon(role){const key=role+'/'+sixCandyPngState.loaded;if(!sixTutorialIconCache.has(key)){const cv=document.createElement('canvas');cv.width=120;cv.height=80;sixDrawRoleIcon(cv,role,1);sixTutorialIconCache.set(key,cv);}return sixTutorialIconCache.get(key);}
function sixDrawTutorial(s,time,bet){
 const x=s.candyCtx,{index,t}=sixTutorialScene(time),clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v)};x.drawImage(sixArtBackdrop(10),0,0,320,320);x.fillStyle='rgba(255,247,238,.80)';x.beginPath();x.roundRect(28,20,264,278,18);x.fill();sixText(x,'BET TIME',160,38,10,'#fff1ba');
 const candy=(c,px,py,r=22,alpha=1,n=null,scale=1)=>{x.save();x.globalAlpha=alpha;x.translate(px,py);x.scale(scale,scale);x.drawImage(sixArtCandySprite(c,1),-r,-r,r*2,r*2);x.restore();if(n!==null)sixText(x,String(n),px,py+1,20);};
 if(index===0){
  const p=t/4500,fall=smooth(p/.42),flash=p>.44&&p<.66?.45+.55*(.5+.5*Math.sin(p*45)):1,fade=p>.64?1-smooth((p-.64)/.25):1;
  candy(0,90,190,22,1,3);candy(3,230,190,22,1,11);candy(2,160,92+(190-92)*fall,22,fade,7,1+.04*(1-fall));if(p<.44){x.strokeStyle='#ffc15b';x.lineWidth=3;x.beginPath();x.moveTo(160,74);x.lineTo(160,116);x.stroke();}else if(p<.72){x.save();x.globalAlpha=flash;x.strokeStyle='#fff1a6';x.lineWidth=3;x.shadowBlur=14;x.shadowColor='#fff1a6';x.beginPath();x.arc(160,190,28,0,7);x.stroke();x.restore();}if(p>.72)for(let k=0;k<6;k++){const a=k*1.047,q=smooth((p-.72)/.25);sixArtStar(x,160+Math.cos(a)*q*42,190+Math.sin(a)*q*34,3.5*(1-q),'#fff','#f4bd68');}
 }else if(index===1){
  const p=(t-4500)/4500,drop=smooth(p/.34),warn=p>.36&&p<.68?.45+.55*(.5+.5*Math.sin(p*42)):1,fade=p>.66?1-smooth((p-.66)/.25):1,ys=[196,196,154,96+(154-96)*drop],xs=[92,140,116,164];
  for(let i=0;i<4;i++)candy(0,xs[i],ys[i],23,fade,null,1+.025*Math.sin(p*18+i));if(p>.36&&p<.72){for(let i=0;i<4;i++){x.save();x.globalAlpha=warn;x.strokeStyle='#f4ffab';x.lineWidth=3;x.shadowBlur=12;x.shadowColor='#f7ffb2';x.beginPath();x.arc(xs[i],ys[i],28,0,7);x.stroke();x.restore();}sixText(x,'4+',160,112,20,'#f2ffb7');}if(p>.72)for(let k=0;k<8;k++){const a=k*.785,q=smooth((p-.72)/.24);sixArtStar(x,128+Math.cos(a)*q*60,174+Math.sin(a)*q*40,3.2*(1-q),'#fff','#c9f6ff');}
 }else if(index===2){
  const p=(t-9000)/5000,join=smooth(p/.32),shine=.5+.5*Math.sin(p*30),spots=[[86,184],[134,184],[182,184],[230,184]];for(let i=0;i<4;i++){const fromY=92+i%2*18,y=fromY+(184-fromY)*join;candy(1,spots[i][0],y,22,1);}if(p>.34){x.save();x.globalAlpha=.55+.4*shine;x.strokeStyle='#adf6ff';x.lineWidth=4;x.shadowBlur=14;x.shadowColor='#9df6ff';x.beginPath();x.moveTo(65,184);x.lineTo(251,184);x.stroke();x.restore();}if(p>.55){sixText(x,'+'+num(medalWin(bet,SIX_PAY.line)),112,224,14,'#ffe89f');x.strokeStyle='#ffd58a';x.lineWidth=3;x.beginPath();x.moveTo(176,224);x.lineTo(238,224);x.lineTo(229,217);x.moveTo(238,224);x.lineTo(229,231);x.stroke();x.save();x.globalAlpha=.85;x.fillStyle='#ffe2f1';x.beginPath();x.roundRect(242,209,46,30,12);x.fill();x.restore();sixText(x,'R2',265,224,12,'#fff');}
 }else{
  const p=(t-14000)/4000,q=smooth(p/.55);for(let k=0;k<4;k++)candy(0,92+(k%2)*48,154+Math.floor(k/2)*42,22,1-Math.max(0,q-.72)*2);const sugar=getSugarSprite(wonderTier(bet));if(sugar)x.drawImage(sugar,72+q*70,124-q*10,34,34);if(p>.62){sixText(x,'ALL CLEAR',160,120,18,'#ffe786');for(let k=0;k<6;k++)sixArtStar(x,52+k*43,165+Math.sin(time/300+k)*7,4,'#fff7b9','#e9a25e');}
 }
 for(let k=0;k<4;k++){x.fillStyle=k===index?'#ed67a4':'#d7c1cf';x.beginPath();x.arc(139+k*14,286,k===index?4:3,0,7);x.fill();}
 s.candyCanvas.dataset.mode='tutorial';s.candyCanvas.dataset.scene=String(index);s.candyCanvas.setAttribute('aria-label','シックスドロップ・遊び方デモ');s.sixReachLayer.replaceChildren();s.sixReachKey='';s.candyReward.hidden=true;s.candyStatus.textContent='BET待機中・遊び方デモ';s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
}

// Capture once before draws 1, 4, 5, 6, 7, 8. Draw events never clear this set.
function requestSixSparkles(s,e,a){
 if(!a||e.kind!=='candy'||a.bet(s.i)<=0||!e.initialPyramid||e.transitionPending||!reachBoardSettled(e)||e.queue.length)return;
 const count=a.draws.length,expected=count===0?0:count===4?3:count;
 if(![0,3,4,5,6,7].includes(count)||e.processed!==expected)return;
 const key=[e.version,e.boardGeneration,e.processed,count].join('/');if(s.sixSparkleKey===key)return;
 const pending=count===4?a.draws.slice(3,4):[],ids=new Set(),used=new Set(a.draws);
 for(const tile of e.pyramid.flat())if(tile?.number!=null&&!used.has(tile.number)){const p=sixPlan(e.pyramid,[...pending,tile.number]);if(p.chain>0)ids.add(tile.id);}
 s.sixSparkleIds=ids;s.sixSparkleVersion=e.version;s.sixSparkleKey=key;s.sixSparkleBeforeBall=count+1;
}
const sixDropMiniRules=(()=>{
/* Six Candy rules v4. Fixed 10-row staggered tray with symmetric start gaps,
 * round-specific candy palettes, and separate round-clear bonuses.
 */
const SIX_ROWS=3,SIX_SQRT3_2=Math.sqrt(3)/2;
const SIX_PAY={hexagon:50,triangle:30,line:10,allClear:10000};
const SIX_CLEAR_BONUS=[0,20,100,300,1000,5000];
const SIX_ROUND_THEMES=[
 {id:'cool-1',label:'Round 1',colors:['lime','green','aqua','navy'],tier:1},
 {id:'fresh-2',label:'Round 2',colors:['yellow','lime','green','aqua'],tier:2},
 {id:'citrus-3',label:'Round 3',colors:['orange','yellow','lime','green'],tier:3},
 {id:'hot-4',label:'Round 4',colors:['red','orange','yellow','lime'],tier:4},
 {id:'hot-5',label:'Round 5',colors:['violet','red','orange','yellow'],tier:5}
];
const SIX_CHANCE_THEME={id:'chance-3',label:'CHANCE',colors:['gold','silver','diamond'],tier:8};
const SIX_CHANCE_RATE=.12;
const SIX_SUGAR_ROUND_CHOICES=[2,3,3,3,4];
const SIX_START_GAP_TEMPLATES=[
 [[0,2],[0,4],[2,1],[2,5],[6,1],[6,5]],
 [[4,1],[4,5],[2,3],[7,1],[7,6]],
 [[4,1],[4,5],[2,3],[7,1],[7,6],[0,3]],
 [[4,2],[4,4],[7,1],[7,6]],
 [[4,2],[4,4],[7,1],[7,6],[8,2],[8,4]],
 [[0,1],[0,5],[5,1],[5,6],[7,1],[7,6]]
];
function sixRoundTheme(round){return SIX_ROUND_THEMES[Math.max(0,Math.min(4,round-1))];}
function sixPickChanceRound(random){return random()<SIX_CHANCE_RATE?2+Math.floor(random()*4):null;}
function sixRoundColorCount(round){return sixRoundTheme(round).colors.length;}
function sixRoundClearBonus(round){return SIX_CLEAR_BONUS[Math.max(0,Math.min(5,round))]||0;}
function sixPickSugarRound(random){return SIX_SUGAR_ROUND_CHOICES[Math.floor(random()*SIX_SUGAR_ROUND_CHOICES.length)]||3;}
function sixPickGapTemplate(random,round){
 const list=SIX_START_GAP_TEMPLATES;return list[(Math.floor(random()*list.length)+Math.max(0,round-1))%list.length].map(([r,c])=>[r,c]);
}
function sixRowWidth(r,rows=SIX_ROWS){return 5-((rows-1-r)&1);} // bottom is always 8
function sixCapacity(rows=SIX_ROWS){return Array.from({length:rows},(_,r)=>sixRowWidth(r,rows)).reduce((a,b)=>a+b,0);}
const sixEmpty=(rows=SIX_ROWS)=>Array.from({length:rows},(_,r)=>Array(sixRowWidth(r,rows)).fill(null));
const sixClone=g=>g.map(row=>row.map(t=>t?{...t}:null));
const sixKey=(r,c)=>r*16+c;
const sixCount=g=>g.reduce((n,row)=>n+row.filter(Boolean).length,0);
const sixPoint=(r,c,rows=SIX_ROWS)=>({x:c-(sixRowWidth(r,rows)-1)/2,y:r*SIX_SQRT3_2});
function sixValid(r,c,rows=SIX_ROWS){return r>=0&&r<rows&&Number.isInteger(c)&&c>=0&&c<sixRowWidth(r,rows);}
function sixStep(r,c,dr,dx,rows=SIX_ROWS){return [r+dr,c+(sixRowWidth(r+dr,rows)-sixRowWidth(r,rows))/2+dx];}
function sixLayout(rows=SIX_ROWS){const step=35;return {step,top:295.5-(rows-1)*step*SIX_SQRT3_2,radius:step*.50};}
function sixXY(r,c,rows=SIX_ROWS){const l=sixLayout(rows),p=sixPoint(r,c,rows);return {x:160+p.x*l.step,y:l.top+p.y*l.step};}
function sixNeighbors(r,c,rows=SIX_ROWS){return [[0,-1],[0,1],[-1,-.5],[-1,.5],[1,-.5],[1,.5]].map(([dr,dx])=>sixStep(r,c,dr,dx,rows));}
const sixPatternCache=new Map();
function sixPatterns(rows=SIX_ROWS){
 if(sixPatternCache.has(rows))return sixPatternCache.get(rows);const list=[];
 const add=(type,cells)=>{if(cells.every(([r,c])=>sixValid(r,c,rows)))list.push({type,cells,key:cells.map(p=>sixKey(...p)).sort((a,b)=>a-b).join(',')});};
 for(let r=0;r<rows;r++)for(let c=0;c<sixRowWidth(r,rows);c++){
  const at=offsets=>offsets.map(([dr,dx])=>sixStep(r,c,dr,dx,rows));
  add('triangle',at([[0,0],[1,-.5],[1,.5],[2,-1],[2,0],[2,1]]));
  add('triangle',at([[0,-1],[0,0],[0,1],[1,-.5],[1,.5],[2,0]]));
  add('hexagon',sixNeighbors(r,c,rows));
 }
 sixPatternCache.set(rows,list);return list;
}
function sixComponents(grid){
 const seen=new Set(),out=[];
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){
  const tile=grid[r][c],key=sixKey(r,c);if(!tile||seen.has(key))continue;
  const cells=[],stack=[[r,c]];seen.add(key);
  while(stack.length){const [y,x]=stack.pop();cells.push([y,x]);for(const [a,b] of sixNeighbors(y,x,grid.length)){const k=sixKey(a,b);if(!sixValid(a,b,grid.length)||seen.has(k)||grid[a][b]?.color!==tile.color)continue;seen.add(k);stack.push([a,b]);}}
  out.push({cells,color:tile.color});
 }
 return out;
}
function sixUpperFirst(a,b){
 const ra=Math.min(...a.cells.map(p=>p[0])),rb=Math.min(...b.cells.map(p=>p[0]));
 return ra-rb||b.cells.length-a.cells.length||Math.min(...a.cells.map(p=>p[1]))-Math.min(...b.cells.map(p=>p[1]))||a.key.localeCompare(b.key);
}
function sixLines(grid,used=new Set()){
 const out=[],rows=grid.length;
 for(const [dr,dx] of [[0,1],[1,-.5],[1,.5]])for(let r=0;r<rows;r++)for(let c=0;c<grid[r].length;c++){
  const t=grid[r][c];if(!t||used.has(sixKey(r,c)))continue;
  const same=([y,x])=>sixValid(y,x,rows)&&!!grid[y][x]&&!used.has(sixKey(y,x))&&grid[y][x].color===t.color;
  if(same(sixStep(r,c,-dr,-dx,rows)))continue;
  const cells=[];for(let p=[r,c];same(p);p=sixStep(...p,dr,dx,rows))cells.push(p);
  if(cells.length>=4)out.push({type:'line',cells,color:t.color,key:cells.map(p=>sixKey(...p)).join(',')});
 }
 return out.sort(sixUpperFirst);
}
function sixFindShapes(grid){
 const used=new Set(),out=[],candidates=sixPatterns(grid.length).filter(p=>{const t=grid[p.cells[0][0]][p.cells[0][1]];return t&&p.cells.every(([r,c])=>grid[r][c]?.color===t.color);});
 for(const type of ['hexagon','triangle'])for(const p of candidates.filter(p=>p.type===type).sort(sixUpperFirst)){
  if(p.cells.some(cell=>used.has(sixKey(...cell))))continue;
  p.cells.forEach(cell=>used.add(sixKey(...cell)));out.push({...p,color:grid[p.cells[0][0]][p.cells[0][1]].color});
 }
 for(;;){const p=sixLines(grid,used)[0];if(!p)break;p.cells.forEach(cell=>used.add(sixKey(...cell)));out.push(p);}
 return out;
}
function sixResolve(grid){
 const forms=sixFindShapes(grid),clusters=sixComponents(grid).filter(g=>g.cells.length>=4);
 const cells=[...new Map(clusters.flatMap(g=>g.cells).map(p=>[sixKey(...p),p])).values()];
 return {forms,clusters,cells,hexagons:forms.filter(f=>f.type==='hexagon').length,triangles:forms.filter(f=>f.type==='triangle').length,lines:forms.filter(f=>f.type==='line').length};
}
const SIX_FALL_RULES='grid-support-synchronous-v5-staggered-gap-settle';
function sixMotionPoint(move,t){
 t=Math.max(0,Math.min(1,t));const rows=move.rows||SIX_ROWS,a=sixPoint(...move.from,rows),b=sixPoint(...move.to,rows);
 if(t===0)return a;if(t===1)return b;
 if(move.gap){
  const sign=Math.sign(b.x-a.x);
  if(move.gapPivot){
   const p=sixPoint(...move.gapPivot,rows),vertical=p.y-1-a.y,arc=Math.PI/6,d=t*(vertical+arc);
   if(d<=vertical)return {x:a.x,y:a.y+d};
   const angle=-Math.PI/2+sign*(d-vertical);
   return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
  }
  const vertical=b.y-a.y,d=t*(vertical+Math.abs(b.x-a.x));
  return d<=vertical?{x:a.x,y:a.y+d}:{x:a.x+sign*(d-vertical),y:b.y};
 }
 if(!move.pivot)return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 const p=sixPoint(...move.pivot,rows),angle=Math.atan2(a.y-p.y,a.x-p.x)+move.turn*t;
 return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
}
function sixPathClear(grid,move,vacating=new Set()){
 for(let k=1;k<=16;k++){
  const p=sixMotionPoint(move,k/16);
  for(let r=Math.max(0,move.from[0]-1);r<=Math.min(grid.length-1,move.to[0]+1);r++)for(let c=0;c<grid[r].length;c++){
   const t=grid[r][c];if(!t||t.id===move.id||vacating.has(t.id))continue;const q=sixPoint(r,c,grid.length);
   if((p.x-q.x)**2+(p.y-q.y)**2<.999999)return false;
  }
 }
 return true;
}
function sixFallOptions(grid,r,c,vacating=new Set()){
 const rows=grid.length,tile=grid[r]?.[c];if(!tile||r===rows-1||vacating.has(tile.id))return [];
 const valid=p=>sixValid(...p,rows),occupied=([y,x])=>{const t=grid[y]?.[x];return t&&!vacating.has(t.id)?t:null;};
 const dl=sixStep(r,c,1,-.5,rows),dr=sixStep(r,c,1,.5,rows),down=sixStep(r,c,2,0,rows);
 const left=occupied(dl),right=occupied(dr),sideL=occupied([r,c-1]),sideR=occupied([r,c+1]);
 if(left&&right)return [];
 const make=(to,pivot=null,turn=0)=>valid(to)?{id:tile.id,tile:{...tile},from:[r,c],to,pivot,turn,rows}:null;
 const gap=to=>{const m=make(to);return m?{...m,gap:true,gapPivot:valid(down)&&occupied(down)?down:null}:null;};
 const downLeft=()=>!valid(dl)||left?null:!sideL?make(dl,right?dr:null,right?-Math.PI/3:0):!right?gap(dl):null;
 const downRight=()=>!valid(dr)||right?null:!sideR?make(dr,left?dl:null,left?Math.PI/3:0):!left?gap(dr):null;
 const vertical=()=>!left&&!right&&valid(down)&&!occupied(down)?make(down):null;
 let options=[];
 if(left)options=[downRight()];
 else if(right)options=[downLeft()];
 else {
  const biasL=!!grid[r]?.[c-1],biasR=!!grid[r]?.[c+1];
  if(biasL&&!biasR)options=[downRight(),vertical(),downLeft()];
  else if(biasR&&!biasL)options=[downLeft(),vertical(),downRight()];
  else if(vertical())options=[vertical()];
  else {
   const l=downLeft(),rr=downRight();
   const room=m=>m?[-.5,.5].map(dx=>sixStep(...m.to,1,dx,rows)).filter(p=>valid(p)&&!occupied(p)).length:-1;
   options=room(rr)>room(l)?[rr,l]:[l,rr];
  }
 }
 return options.filter(Boolean).filter(m=>sixPathClear(grid,m,vacating));
}
function sixMotionsClear(a,b){for(let k=0;k<=16;k++){const p=sixMotionPoint(a,k/16),q=sixMotionPoint(b,k/16);if((p.x-q.x)**2+(p.y-q.y)**2<.999999)return false;}return true;}
function sixDrop(grid,{trace=false}={}){
 const steps=[],paths=new Map(),count=sixCount(grid);let iterations=0;
 for(;;){
  if(++iterations>count*grid.length+1)throw Error('Six Candy gravity did not converge');
  const accepted=[],vacating=new Set(),targets=new Set(),pinned=new Set();
  for(let pass=0;pass<=count;pass++){
   const previous=accepted.length;
   for(let r=grid.length-2;r>=0;r--){
    const proposals=[];
    for(let c=0;c<grid[r].length;c++){
     const t=grid[r][c];if(!t||vacating.has(t.id)||pinned.has(t.id))continue;
     const candidates=sixFallOptions(grid,r,c,vacating);if(candidates.length)proposals.push({c,candidates});
    }
    proposals.sort((a,b)=>a.candidates.length-b.candidates.length||a.c-b.c);
    for(const proposal of proposals)for(const m of proposal.candidates){
     if(vacating.has(m.id)||pinned.has(m.id)||targets.has(sixKey(...m.to)))continue;
     if(!sixPathClear(grid,m,vacating)||accepted.some(other=>!sixMotionsClear(m,other)))continue;
     accepted.push(m);vacating.add(m.id);targets.add(sixKey(...m.to));
     for(const pivot of [m.pivot,m.gapPivot])if(pivot){const support=grid[pivot[0]][pivot[1]];if(support)pinned.add(support.id);}break;
    }
   }
   if(accepted.length===previous)break;
  }
  if(!accepted.length)break;
  for(const m of accepted)grid[m.from[0]][m.from[1]]=null;
  for(const m of accepted){
   if(grid[m.to[0]][m.to[1]])throw Error('Reserved candy destination is occupied');
   grid[m.to[0]][m.to[1]]=m.tile;
   if(!paths.has(m.id))paths.set(m.id,{id:m.id,tile:m.tile,points:[m.from]});paths.get(m.id).points.push(m.to);
  }
  if(trace)steps.push({grid:sixClone(grid),moves:accepted,ms:accepted.some(m=>m.gap)?160:accepted.some(m=>m.to[0]-m.from[0]===2)?120:90});
 }
 return {steps,moves:[...paths.values()]};
}
function sixPlan(input,numbers,{trace=false}={}){
 const grid=sixClone(input),timeline=[],used=new Set(numbers),hit=[];let triangles=0,hexagons=0,lines=0,chain=0,gain=0,removedCount=0,ordinaryGroups=0,sugarAward=false;
 const push=(phase,detail={},ms=350)=>{if(trace)timeline.push({phase,...detail,grid:sixClone(grid),ms});};
 const remove=cells=>{const removed=[];for(const [r,c] of cells){const t=grid[r]?.[c];if(t){removed.push({r,c,tile:{...t}});if(t.sugar)sugarAward=true;grid[r][c]=null;}}removedCount+=removed.length;return removed;};
 const drop=()=>{const fall=sixDrop(grid,{trace});if(fall.moves.length){const motionMs=fall.steps.reduce((n,f)=>n+f.ms,0)||350;push('pyramidFall',{...fall,motionMs},motionReduced?100:motionMs+180);}};
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++)if(grid[r][c]?.number!=null&&used.has(grid[r][c].number))hit.push([r,c]);
 if(!hit.length){push('pyramidMiss',{},250);return {grid,timeline,gain,triangles,hexagons,lines,chain,removedCount,ordinaryGroups,hit:0,cleared:false,advance:false,sugarAward};}
 push('pyramidHit',{cells:hit},280);push('pyramidBreak',{removed:remove(hit)},420);drop();
 for(;;){
  const resolved=sixResolve(grid);if(!resolved.cells.length)break;if(++chain>Math.ceil(Math.max(1,sixCount(input))/4))throw Error('Cascade exceeded finite board');
  const award=resolved.hexagons*SIX_PAY.hexagon+resolved.triangles*SIX_PAY.triangle+resolved.lines*SIX_PAY.line;
  push('pyramidShape',{forms:resolved.forms,cells:resolved.cells,chain},resolved.forms.length?650:500);
  const removed=remove(resolved.cells);triangles+=resolved.triangles;hexagons+=resolved.hexagons;lines+=resolved.lines;gain+=award;ordinaryGroups+=resolved.clusters.length;
  push('pyramidAward',{...resolved,removed,chain,gain:award},award?1000:300);drop();
 }
 const cleared=sixCount(grid)===0;
 if(cleared){gain+=SIX_PAY.allClear;push('pyramidAllClear',{gain:SIX_PAY.allClear,chain,forms:[]},2100);}
 return {grid,timeline,gain,triangles,hexagons,lines,chain,removedCount,ordinaryGroups,hit:hit.length,cleared,advance:triangles+hexagons+lines>0||cleared,sugarAward};
}

return {sixEmpty,sixResolve,sixDrop,sixClone,sixPlan,sixPoint,sixMotionPoint};})();
const sixDropDemoFixtures={"cluster":{"grid":[[{"id":1,"color":0,"number":1},{"id":2,"color":0,"number":2},{"id":3,"color":2,"number":3},{"id":4,"color":1,"number":4},{"id":5,"color":2,"number":5}],[{"id":6,"color":0,"number":6},{"id":7,"color":0,"number":7},{"id":8,"color":1,"number":8},{"id":9,"color":0,"number":9}],[{"id":10,"color":2,"number":10},{"id":11,"color":2,"number":11},{"id":12,"color":1,"number":12},{"id":13,"color":1,"number":13},{"id":14,"color":2,"number":14}]],"numbers":[3,13,14],"label":"4個以上つながって消去"},"line":{"grid":[[{"id":1,"color":1,"number":1},{"id":2,"color":2,"number":2},{"id":3,"color":2,"number":3},{"id":4,"color":1,"number":4},{"id":5,"color":2,"number":5}],[{"id":6,"color":2,"number":6},{"id":7,"color":2,"number":7},{"id":8,"color":1,"number":8},{"id":9,"color":1,"number":9}],[{"id":10,"color":0,"number":10},{"id":11,"color":0,"number":11},{"id":12,"color":1,"number":12},{"id":13,"color":0,"number":13},{"id":14,"color":2,"number":14}]],"numbers":[13,12,14],"label":"直線が成立！"},"hexagon":{"grid":[[{"id":1,"color":1,"number":1},{"id":2,"color":1,"number":2},{"id":3,"color":1,"number":3},{"id":4,"color":2,"number":4},{"id":5,"color":0,"number":5}],[{"id":6,"color":0,"number":6},{"id":7,"color":2,"number":7},{"id":8,"color":1,"number":8},{"id":9,"color":0,"number":9}],[{"id":10,"color":1,"number":10},{"id":11,"color":1,"number":11},{"id":12,"color":1,"number":12},{"id":13,"color":0,"number":13},{"id":14,"color":0,"number":14}]],"numbers":[5,6,13],"label":"ヘキサゴン成立！"},"triangle":{"grid":[[{"id":1,"color":2,"number":1},{"id":2,"color":1,"number":2},{"id":3,"color":1,"number":3},{"id":4,"color":0,"number":4},{"id":5,"color":2,"number":5}],[{"id":6,"color":1,"number":6},{"id":7,"color":1,"number":7},{"id":8,"color":2,"number":8},{"id":9,"color":1,"number":9}],[{"id":10,"color":1,"number":10},{"id":11,"color":1,"number":11},{"id":12,"color":2,"number":12},{"id":13,"color":2,"number":13},{"id":14,"color":1,"number":14}]],"numbers":[8,14,12],"label":"トライアングル成立！"}};
const sixDropDemoPlans={};
function sixDropDemoRefill(input){
 // The same top-entry algorithm with the miniature board's coordinate rules.
 const grid=sixDropMiniRules.sixClone(input),added=[],holes=[];let number=15;
 for(let r=2;r>=0;r--)for(let c=0;c<grid[r].length;c++)if(!grid[r][c]){const x=sixDropMiniRules.sixPoint(r,c,3).x;let covered=false;for(let y=0;y<r;y++)for(let k=0;k<input[y].length;k++)if(input[y][k]&&Math.abs(sixDropMiniRules.sixPoint(y,k,3).x-x)<.999)covered=true;if(!covered)holes.push([r,c]);}
 function fill(i){if(i===holes.length)return true;const [r,c]=holes[i];for(let color=0;color<4;color++){grid[r][c]={id:100+i,color,number:15+i};if(!sixDropMiniRules.sixResolve(grid).cells.length&&fill(i+1))return true;}grid[r][c]=null;return false;}
 if(!fill(0))throw Error('Demo refill failed');for(const [r,c] of holes)added.push(grid[r][c].id);return {grid,added};
}
sixDrawTutorial=function(s,time,bet){
 const x=s.candyCtx,t=Math.max(0,Math.min(17999,time)),index=t<6000?0:Math.min(3,1+Math.floor((t-6000)/4000)),local=index===0?t:(t-6000)%4000,type=['cluster','line','triangle','hexagon'][index],sample=sixDropDemoFixtures[type],rules=sixDropMiniRules,role=index>0;
 const plan=sixDropDemoPlans[type]||(sixDropDemoPlans[type]=rules.sixPlan(sample.grid,sample.numbers,{trace:true})),total=plan.timeline.reduce((n,f)=>n+f.ms,0),playMs=Math.max(0,(local-550)/2750)*total;
 let remaining=playMs,fx=null,p=0,grid=sample.grid;if(local>=550){for(const stage of plan.timeline){if(remaining<=stage.ms){fx={...stage,elapsed:remaining};p=remaining/stage.ms;grid=stage.grid;break;}remaining-=stage.ms;}if(!fx)grid=plan.grid;}
 const topUp=!role&&local>=3300,refillDemo=topUp?(sixDropDemoPlans.refill||(sixDropDemoPlans.refill=sixDropDemoRefill(plan.grid))):null;if(topUp){grid=refillDemo.grid;fx=null;}
 const pos=cell=>{const z=rules.sixPoint(...cell,3);return {x:160+z.x*48,y:112+z.y*48};},finished=local>=3300;
 x.drawImage(sixArtBackdrop(10),0,0,320,320);x.fillStyle='#fff8eeed';x.beginPath();x.roundRect(20,20,280,282,17);x.fill();sixText(x,role?sample.label:'同じ色が4個以上つながると消去',160,40,12,'#fff3ba');sixText(x,topUp?'抽選番号 25 → HITなし':'抽選番号 '+sample.numbers.join('・'),160,62,11,'#fff3cf');
 x.fillStyle='#eac9d5';x.strokeStyle='#cc8fac';x.lineWidth=2;x.beginPath();x.roundRect(32,79,256,147,19);x.fill();x.stroke();
 for(let r=0;r<3;r++)for(let c=0;c<(r===1?4:5);c++){const z=pos([r,c]);x.fillStyle='#fff7f3';x.strokeStyle='#dcb3c5';x.lineWidth=1;x.beginPath();x.arc(z.x,z.y,23,0,7);x.fill();x.stroke();}
 const fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,p):null;if(fall)grid=fall.grid;const moves=new Map((fall?.moves||[]).map(m=>[m.id,m]));
 for(let r=0;r<3;r++)for(let c=0;c<grid[r].length;c++){const tile=grid[r][c];if(!tile)continue;let z=pos([r,c]);if(topUp&&refillDemo.added.includes(tile.id)){const u=Math.max(0,Math.min(1,(local-3500)/900));if(local<3500)continue;z.y-=180*(1-u*u);}const m=moves.get(tile.id);if(m){const v=rules.sixMotionPoint(m,fall.progress);z={x:160+v.x*48,y:112+v.y*48};}x.drawImage(sixArtCandySprite(tile.color,1),z.x-23,z.y-23,46,46);if(tile.number!=null)sixPaintCandyNumber(x,tile.number,z.x,z.y+1,19,tile.color,1);if((local<550||fx?.phase==='pyramidHit')&&sample.numbers.includes(tile.number)){x.strokeStyle='#fff6a3';x.lineWidth=3;x.shadowColor='#ffffcc';x.shadowBlur=11;x.beginPath();x.arc(z.x,z.y,24,0,7);x.stroke();x.shadowBlur=0;}}
 if(fx?.phase==='pyramidShape'){for(const cell of fx.cells||[]){const z=pos(cell);x.strokeStyle='#fff1a0';x.lineWidth=3;x.shadowColor='#fff9b2';x.shadowBlur=12;x.beginPath();x.arc(z.x,z.y,23.5,0,7);x.stroke();}for(const form of fx.forms||[]){const points=form.cells.map(pos),hull=form.type==='line'?points:sixHull(points);x.strokeStyle='#fffbc9';x.lineWidth=4;x.beginPath();hull.forEach((z,i)=>i?x.lineTo(z.x,z.y):x.moveTo(z.x,z.y));if(form.type!=='line')x.closePath();x.stroke();}x.shadowBlur=0;}
 if(fx?.removed){for(const v of fx.removed){const z=pos([v.r,v.c]);x.save();x.globalAlpha=1-p;for(let k=0;k<5;k++){const a=k*Math.PI*2/5;const dx=Math.cos(a)*p*30,dy=Math.sin(a)*p*30;x.fillStyle=['#ccefa9','#c9efda','#c9ecff'][v.tile.color%3];x.fillRect(z.x+dx-3,z.y+dy-3,6,6);}x.restore();}}
 const caption=topUp?'番号にHITなし → 上からドロップ補充！':local<550?'番号HITでドロップを消す':fx?.phase==='pyramidFall'?'空いたところへドロップが落下':fx?.phase==='pyramidShape'?(role?sample.label:'4個以上がつながった！'):finished?(role?'次ラウンド確定！':'通常連結は配当なし・盤面を継続'):'消去 → 落下 → つながりを判定';sixText(x,caption,160,245,12,'#fff4bd');
 if(role&&finished){x.fillStyle='#fff0a4';x.strokeStyle='#de83a4';x.lineWidth=2;x.beginPath();x.roundRect(48,258,224,30,12);x.fill();x.stroke();sixText(x,'＋'+num(medalWin(bet,plan.gain))+' WIN  → NEXT ROUND',160,274,11,'#fff9de');}
 else sixText(x,topUp?'未抽選番号も追加・途中の空白はそのまま':role?'直線・三角・ヘキサゴンで配当＋次ROUND':'役以外の連結も消えて落下する',160,274,10,'#fff6da');
 for(let k=0;k<4;k++){x.fillStyle=k===index?'#e35f9a':'#d9bdcc';x.beginPath();x.arc(139+k*14,295,3,0,7);x.fill();}
 s.candyCanvas.dataset.mode='tutorial';s.candyCanvas.dataset.scene=String(index);s.candyCanvas.dataset.example=type;s.candyCanvas.setAttribute('aria-label','シックスドロップ・5・4・5個の3段盤面・'+caption);s.sixReachLayer.replaceChildren();s.sixReachKey='';s.candyReward.hidden=true;s.candyStatus.textContent=caption;s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
};
// Refresh cached glyphs once the embedded arcade digit font is available.
if(document.fonts)document.fonts.load('900 108px ElixirNumbers','0123456789').then(()=>{for(const key of sixArtCache.keys())if(key.startsWith('orb-number/'))sixArtCache.delete(key);try{const s=slots[2];if(s?.engine){s.candyKey='';s.dirtyMini=true;carnivalQueueFrame(s);}}catch{}});
sixArtNumberSprite=function(number,color=0,round=1,chance=false){
 if(!Number.isInteger(number)||number<1||number>25)return null;const theme=chance?SIX_CHANCE_THEME:sixRoundTheme(round),style=SIX_PNG_STYLES[theme.colors[color%theme.colors.length]],tint='hsl('+style.h+' '+Math.round(style.s*66)+'% 78%)',key='orb-number/'+number+'/'+color+'/'+round+'/'+chance;if(sixArtCache.has(key))return sixArtCache.get(key);
 const cv=document.createElement('canvas');cv.width=192;cv.height=144;const x=cv.getContext('2d'),label=String(number);x.font='900 108px ElixirNumbers, "Arial Rounded MT Bold", system-ui';x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineCap='round';const max=number>=10?150:100;
 // Compact mint-tinted arcade numerals: cream keyline, dark contour, colored face.
 x.strokeStyle='#16352c';x.lineWidth=23;x.strokeText(label,96,76,max);x.strokeStyle='#fff2d5';x.lineWidth=16;x.strokeText(label,96,71,max);x.strokeStyle='#233d32';x.lineWidth=9;x.strokeText(label,96,71,max);
 const g=x.createLinearGradient(0,26,0,121);g.addColorStop(0,'#fcffe6');g.addColorStop(.28,'#eaffca');g.addColorStop(.62,tint);g.addColorStop(1,'hsl('+style.h+' '+Math.round(style.s*61)+'% 63%)');x.fillStyle=g;x.fillText(label,96,71,max);sixArtCache.set(key,cv);return cv;
};
sixPaintCandyNumber=function(x,number,cx,cy,radius,color=0,round=1,chance=false){const art=sixArtNumberSprite(number,color,round,chance);if(art)x.drawImage(art,cx-radius*.87,cy-radius*.73,radius*1.74,radius*1.36);};
sixArtLogoMarkup=function(instance='main'){
 const id='six-drop-luxe-'+instance,colors=['#b5ee77','#71e2d2','#82d8ff','#c5acff','#ff9acb','#ffc67a','#ffe58c','#b8ec92'];
 const defs='<linearGradient id="'+id+'-gold" x2="0" y2="1"><stop stop-color="#fffde0"/><stop offset=".28" stop-color="#ffe893"/><stop offset=".48" stop-color="#d99b3c"/><stop offset=".62" stop-color="#fff2b5"/><stop offset="1" stop-color="#c68036"/></linearGradient><linearGradient id="'+id+'-ribbon" x2="0" y2="1"><stop stop-color="#f7a5cf"/><stop offset=".45" stop-color="#d85aa1"/><stop offset="1" stop-color="#783775"/></linearGradient>'+colors.map((c,i)=>'<linearGradient id="'+id+'-c'+i+'" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset=".23" stop-color="'+c+'"/><stop offset=".55" stop-color="#fff5df"/><stop offset=".6" stop-color="'+c+'"/><stop offset="1" stop-color="#c85a96"/></linearGradient>').join('');
 const letters=[...'シックスドロップ'].map((ch,i)=>{const px=82+i*54,yy=94+Math.abs(i-3.5)*1.5,rotate=(i-3.5)*1.1;return '<g transform="translate('+px+' '+yy+') rotate('+rotate+')"><text y="6" fill="#72316a" stroke="#72316a" stroke-width="14">'+ch+'</text><text fill="url(#'+id+'-c'+i+')" stroke="url(#'+id+'-gold)" stroke-width="12">'+ch+'</text><text fill="url(#'+id+'-c'+i+')" stroke="#fff9e9" stroke-width="5">'+ch+'</text><text fill="url(#'+id+'-c'+i+')" stroke="#ad5689" stroke-width=".7">'+ch+'</text></g>';}).join('');
 const candy=(cx,cy,c,rot)=>'<g transform="translate('+cx+' '+cy+') rotate('+rot+')"><path d="M-13-9-29-15-25 0-29 15-13 9M13-9 29-15 25 0 29 15 13 9" fill="'+c+'" stroke="#fff7ce" stroke-width="3"/><rect x="-17" y="-13" width="34" height="26" rx="13" fill="'+c+'" stroke="url(#'+id+'-gold)" stroke-width="3"/><path d="M-9-7Q0-12 9-7" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/></g>';
 const gems=Array.from({length:17},(_,i)=>{const a=Math.PI+i*Math.PI/16;return '<circle cx="'+(270+244*Math.cos(a))+'" cy="'+(83+53*Math.sin(a))+'" r="3.2" fill="#fff3bf" stroke="#cc8f4a" stroke-width="1"/>';}).join('');
 return '<svg class="six-art-logo" viewBox="0 0 540 170" role="img" aria-label="シックスドロップ SIX DROP" xmlns="http://www.w3.org/2000/svg"><defs>'+defs+'</defs><g stroke-linejoin="round"><path d="M16 71 40 44 88 39Q270-15 452 39L500 44 524 71 505 100 519 126 468 126Q270 183 72 126L21 126 35 100Z" fill="#693c70" stroke="#693c70" stroke-width="7"/><path d="M22 68 50 43 90 43Q270-8 450 43L490 43 518 68 499 98 510 119 463 119Q270 171 77 119L30 119 41 98Z" fill="url(#'+id+'-ribbon)" stroke="url(#'+id+'-gold)" stroke-width="6"/><path d="M54 113Q270 157 486 113" stroke="#ffd8ee" stroke-width="2" fill="none"/>'+gems+candy(35,83,'#9be3e7',-22)+candy(505,83,'#ffd184',22)+'<g fill="#fff0a8" stroke="#d89944" stroke-width="2"><path d="m270 5 6 15 17 2-13 11 4 17-14-9-14 9 4-17-13-11 17-2Z"/><path d="m108 17 4 9 10 2-7 7 2 10-9-5-9 5 2-10-7-7 10-2Z"/><path d="m432 17 4 9 10 2-7 7 2 10-9-5-9 5 2-10-7-7 10-2Z"/></g><g font-family="CookieLabels,system-ui,sans-serif" font-size="56" font-weight="1000" text-anchor="middle" paint-order="stroke fill">'+letters+'</g><path d="M168 120Q270 111 372 120L363 148Q270 160 177 148Z" fill="url(#'+id+'-gold)" stroke="#ad6084" stroke-width="2"/><text x="270" y="141" text-anchor="middle" font-family="system-ui" font-weight="1000" font-size="21" letter-spacing="5" fill="#9a367c" stroke="#fff9df" stroke-width="1.2" paint-order="stroke fill">SIX DROP</text><g stroke="#fffced" stroke-width="2.5" stroke-linecap="round"><path d="M60 40v12m-6-6h12M480 40v12m-6-6h12M143 115v10m-5-5h10M397 115v10m-5-5h10"/></g></g></svg>';
};
const sixDropOriginalStageEffects=sixStageEffects;
sixStageEffects=function(x,fx,p,round,rows,reduced){sixDropOriginalStageEffects(x,fx,p,round,rows,reduced);if(fx?.phase!=='pyramidShape'||!fx.forms?.length||reduced)return;for(const f of fx.forms){const ps=f.cells.map(c=>sixXY(...c,rows)),cx=ps.reduce((v,z)=>v+z.x,0)/ps.length,cy=ps.reduce((v,z)=>v+z.y,0)/ps.length;x.save();x.strokeStyle='#fff8ba';x.lineWidth=2;x.globalAlpha=(1-p)*.8;for(let k=0;k<9;k++){const yy=cy-32+k*8;x.beginPath();x.moveTo(cx-90+85*p,yy);x.lineTo(cx-45+85*p,yy);x.stroke();}x.restore();}};

// Cabinet accents are presentation-only and use the existing paused visual clock.
function sixArcadeCounter(s){
 const e=s.engine,el=$('carnival-win');if(!el||!e)return;
 const target=medalWin(app.bet(s.i),e.totalHundredths),t=s.sixWinTween;
 let value=target;
 if(t&&t.version===e.version&&t.to===target&&!motionReduced){const p=Math.max(0,Math.min(1,((s.candyTime||0)-t.start)/650));value=Math.floor(t.from+(t.to-t.from)*(1-Math.pow(1-p,3)));if(p===1)s.sixWinTween=null;}
 if(el.textContent!==num(value))fitGoldenNumber(el,num(value),23,100);el.setAttribute('aria-label','TOTAL WIN '+num(target));s.sixDisplayedWin=value;
}
function sixArcadeAccents(s,x,time){
 sixArcadeCounter(s);const e=s.engine,celebration=s.sixClearAccent,age=celebration&&celebration.version===e.version?time-celebration.start:2000,clear=age>=0&&age<1200;
 s.sixHeading?.classList.toggle('six-clear-flash',clear&&!motionReduced);
 if(!app.bet(s.i))return;
 x.save();const hue=[168,66,35,340,280][Math.max(0,Math.min(4,e.roundIndex-1))];
 // Small lamps stay outside the playable tray.
 for(let k=0;k<14;k++)for(const side of [0,1]){const y=24+k*21,pulse=motionReduced?.35:.3+.7*Math.pow(.5+.5*Math.sin(time/260-k*.65+side*1.4),3);x.globalAlpha=.3+.5*pulse;x.fillStyle='hsl('+hue+' 90% '+(65+pulse*25)+'%)';x.shadowColor=x.fillStyle;x.shadowBlur=3+pulse*3;x.beginPath();x.arc(side?314:6,y,1.6+pulse*.5,0,Math.PI*2);x.fill();}
 if(clear&&!motionReduced){const p=age/1200;x.shadowBlur=0;for(let k=0;k<24;k++){const side=k%2,delay=(k%6)*.025,u=Math.max(0,p-delay),cx=side?310:10,cy=30+u*240+(k%6)*19;x.globalAlpha=Math.max(0,(1-p)*.85);x.save();x.translate(cx+Math.sin(k*2.3+u*9)*6,cy);x.rotate(k+u*7);x.fillStyle=['#ffe7a1','#ffafd6','#b7f3e1'][k%3];x.fillRect(-2,-3,4,6);x.restore();}}
 x.restore();
}
const sixArcadeBaseEvent=carnivalEvent;
carnivalEvent=function(s,ev,e,a){
 if(ev.phase==='ready'||ev.phase==='error'){s.sixWinTween=null;s.sixDisplayedWin=0;s.sixClearAccent=null;s.sixHeading?.classList.remove('six-clear-flash');}
 sixArcadeBaseEvent(s,ev,e,a);
 if(['pyramidAward','pyramidRoundBonus','pyramidAllClear'].includes(ev.phase)&&ev.gain>0){const target=medalWin(a.bet(s.i),e.totalHundredths);s.sixWinTween={version:e.version,from:Math.min(target,s.sixDisplayedWin??medalWin(a.bet(s.i),Math.max(0,e.totalHundredths-ev.gain))),to:target,start:s.candyTime||0};}
 if(ev.phase==='pyramidRoundBonus'){s.sixClearAccent={version:e.version,start:s.candyTime||0};if(s.i===active)sixCandyAudio('clear');}
};
const sixArcadeBaseHud=carnivalHud;
carnivalHud=function(a){sixArcadeBaseHud(a);const s=slots[2];if(s?.engine?.kind==='candy')sixArcadeCounter(s);};
