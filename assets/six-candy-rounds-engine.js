/* Six Candy rules v4. Fixed 10-row staggered tray with symmetric start gaps,
 * round-specific candy palettes, and separate round-clear bonuses.
 */
const SIX_ROWS=10,SIX_SQRT3_2=Math.sqrt(3)/2;
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
function sixMakeBoard(rows,colorCount,random,firstId=0,{holes=[]}={}){
 let grid=null,lastId=firstId;
 for(let attempt=0;attempt<64;attempt++){
  const g=sixApplyHoleTemplate(sixEmpty(rows),holes);let ok=true,id=firstId;
  outer:for(let r=0;r<rows;r++)for(let c=0;c<g[r].length;c++){
   if(g[r][c]===null&&holes.some(p=>p[0]===r&&p[1]===c))continue;
   const tile={id:++id,color:0,number:null,lean:random()<.5?-1:1};g[r][c]=tile;let placed=false;
   for(const color of sixShuffle(Array.from({length:colorCount},(_,i)=>i),random)){
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
 const spots=sixShuffle(grid.flat().filter(Boolean),random),numbers=sixShuffle(Array.from({length:25},(_,i)=>i+1),random);numbers.forEach((n,i)=>spots[i].number=n);
 if(sixResolve(grid).cells.length)throw Error('Initial board contains a connected group or role');
 if(sixDrop(sixClone(grid)).moves.length)throw Error('Initial board has unsupported candies');
 return {grid,lastId};
}
class SixBallCandyEngine extends Engine{
 reset(){
  this.kind='candy';this.gameName='シックスキャンディ';this.drawMode='grouped';this.reachMode='single';this.rows=SIX_ROWS;
  this.version++;this.presentationRate=1;this.roundBet=this.roundBet||3000;this.queue=[];this.pendingDraws=new Set();this.seen=new Set();this.drawn=new Set();this.history=[];
  this.accepted=0;this.processed=0;this.busy=false;this.running=false;this.opening=false;this.paused=false;this.transitionPending=false;
  this.totalHundredths=0;this.maxLink=0;this.maxChain=0;this.lastChain=0;this.allClears=0;this.roundSteps=0;this.roundHammers=0;this.roundCleared=0;
  this.wonderCollected=false;this.wonderIssued=false;this.wonderToken=null;this.wonderColumn=0;this.pendingSugarAward=[];
  this.basketState=Array.from({length:SIZE},()=>({goal:10,remaining:10,weight:0,pending:[]}));this.hammerQueue=[];this.hammerPreview=Array.from({length:65},()=>[]);this.hammerPreviewVersion=0;
  this.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));this.pyramid=sixEmpty(this.rows);this.initialPyramid=null;
  this.roundIndex=1;this.roundsCleared=0;this.sixColorCount=4;this.boardGeneration=0;this.roundTheme=sixRoundTheme(1).id;this.clearBonusHundredths=0;this.clearedRounds=new Set();this.maxRounds=5;this.chanceRound=sixPickChanceRound(this.random);
  this.triangles=0;this.hexagons=0;this.lines=0;this.shapes=0;this.bestCascade=0;this.cascade=0;this.removedCandies=0;this.remainingCandies=sixCapacity(this.rows);this.pyramidCleared=false;this.lastGain=0;this.lastNumber=0;this.fx=null;
  this.sugarRound=sixPickSugarRound(this.random);this.sugarPlaced=false;this.currentClearBonus=0;this.currentHoles=[];
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
 predict(number){
  if(!this.initialPyramid||this.drawn.has(number))return null;
  const p=sixPlan(this.pyramid,[number]),bonus=p.advance&&!this.clearedRounds.has(this.roundIndex)?sixRoundClearBonus(this.roundIndex):0,gain=p.gain+bonus;
  return {number,total:this.totalHundredths+gain,gain,roundBonus:bonus,maxLink:0,chain:p.chain,allClear:p.cleared,tier:reachTier(this.totalHundredths+gain,p.cleared),triangles:p.triangles,hexagons:p.hexagons,lines:p.lines};
 }
 async drain(){
  if(this.busy)return;const token=this.version;this.busy=true;
  try{
   while(this.queue.length&&token===this.version){
    const numbers=this.queue.shift();for(const n of numbers){this.pendingDraws.delete(n);this.drawn.add(n);}this.lastNumber=numbers.at(-1);this.cascade=0;this.lastGain=0;this.currentClearBonus=0;
    const plan=sixPlan(this.pyramid,numbers,{trace:true});
    for(const stage of plan.timeline){
     if(token!==this.version)return;this.pyramid=sixClone(stage.grid);this.remainingCandies=sixCount(this.pyramid);this.fx={...stage,elapsed:0,stamp:null};this.cascade=stage.chain||this.cascade;
     if(stage.phase==='pyramidHit')this.candyMessage=numbers.join('・')+'番 HIT！';
     if(stage.phase==='pyramidMiss')this.candyMessage='この番号は消去済み・次の番号を待とう';
     if(stage.phase==='pyramidFall')this.candyMessage='カタカタと落下！';
     if(stage.phase==='pyramidShape')this.candyMessage=stage.forms.length?'役が完成！ '+stage.chain+'連鎖':'4個以上つながった！ '+stage.chain+'連鎖';
     if(stage.phase==='pyramidAward'){this.totalHundredths+=stage.gain;this.lastGain=stage.gain;this.triangles+=stage.triangles;this.hexagons+=stage.hexagons;this.lines+=stage.lines;this.shapes=this.triangles+this.hexagons+this.lines;this.bestCascade=Math.max(this.bestCascade,stage.chain);}
     if(stage.phase==='pyramidAllClear'){this.totalHundredths+=SIX_PAY.allClear;this.lastGain=SIX_PAY.allClear;this.allClears++;this.candyMessage='ALL CLEAR！ 100倍ボーナス！';}
     this.emit(stage.phase,{numbers,...stage});const visualCritical=stage.phase==='pyramidFall'||stage.phase==='pyramidShape'||stage.phase==='pyramidBreak';const stageWait=visualCritical?stage.ms:plan.advance&&stage.phase!=='pyramidAllClear'?Math.min(stage.ms,360):stage.phase==='pyramidAllClear'&&plan.advance?Math.min(stage.ms,700):stage.ms;if(!await this.wait(stageWait*this.speed,token))return;
    }
    this.pyramid=sixClone(plan.grid);this.remainingCandies=sixCount(this.pyramid);this.removedCandies+=plan.removedCount;this.pyramidCleared=plan.cleared;this.processed+=numbers.length;this.fx=null;
    if(plan.advance&&!this.clearedRounds.has(this.roundIndex)){this.clearedRounds.add(this.roundIndex);this.roundsCleared++;this.currentClearBonus=sixRoundClearBonus(this.roundIndex);this.clearBonusHundredths+=this.currentClearBonus;this.totalHundredths+=this.currentClearBonus;}
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
