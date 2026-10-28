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
const SIX_PAY={hexagon:300,triangle:150,line:10,allClear:10000};
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
  push('pyramidShape',{forms:resolved.forms,cells:resolved.cells,chain},resolved.hexagons?2700:resolved.triangles?2250:resolved.forms.length?650:500);
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
 for(let r=0;r<3;r++)for(let c=0;c<grid[r].length;c++){const tile=grid[r][c];if(!tile)continue;let z=pos([r,c]);if(topUp&&refillDemo.added.includes(tile.id)){const order=sixGlassRows(grid.flatMap((row,r)=>row.map(tile=>tile&&refillDemo.added.includes(tile.id)?{r}:null).filter(Boolean)),3),pose=sixGlassPose(order,r,local-3500,motionReduced);if(!pose.visible)continue;z.y+=pose.offset*180/350;}const m=moves.get(tile.id);if(m){const v=rules.sixMotionPoint(m,fall.progress);z={x:160+v.x*48,y:112+v.y*48};}x.drawImage(sixArtCandySprite(tile.color,1),z.x-23,z.y-23,46,46);if(tile.number!=null)sixPaintCandyNumber(x,tile.number,z.x,z.y+1,19,tile.color,1);if((local<550||fx?.phase==='pyramidHit')&&sample.numbers.includes(tile.number)){x.strokeStyle='#fff6a3';x.lineWidth=3;x.shadowColor='#ffffcc';x.shadowBlur=11;x.beginPath();x.arc(z.x,z.y,24,0,7);x.stroke();x.shadowBlur=0;}}
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
const sixCandyTitlePaths={"シ": "M-10.85 -46.69 -15.95 -38.92C-11.89 -36.66 -5.97 -32.89 -2.49 -30.57L2.73 -38.34C-0.58 -40.6 -6.79 -44.49 -10.85 -46.69ZM-22.74 -5.68 -17.46 3.6C-12.47 2.78 -3.94 -0.23 1.97 -3.54C11.6 -9.05 19.89 -16.3 25.46 -24.48L20.07 -34.1C15.49 -25.75 7.13 -17.57 -2.84 -12.06C-9.4 -8.53 -16.18 -6.79 -22.74 -5.68ZM-19.89 -33.35 -25 -25.58C-20.88 -23.37 -15.02 -19.55 -11.48 -17.11L-6.32 -25C-9.57 -27.26 -15.72 -31.15 -19.89 -33.35Z", "ッ": "M0.99 -35.03 -7.37 -32.31C-5.8 -29.06 -3.36 -22.21 -2.55 -19.31L5.86 -22.21C4.99 -24.94 2.15 -32.48 0.99 -35.03ZM22.62 -30.28 12.7 -33.47C12.18 -26.27 9.45 -18.39 5.63 -13.57C0.81 -7.48 -7.66 -3.07 -13.8 -1.51L-6.44 6.03C0.52 3.36 7.83 -1.68 13.22 -8.76C17.05 -13.75 19.49 -19.66 21 -25.23C21.4 -26.62 21.81 -28.01 22.62 -30.28ZM-12.47 -31.9 -20.94 -28.88C-19.37 -26.1 -16.59 -18.5 -15.6 -15.37L-7.02 -18.56C-8.18 -21.92 -10.85 -28.65 -12.47 -31.9Z", "ク": "M5.45 -45.36 -4.81 -48.72C-5.45 -46.46 -6.84 -43.44 -7.89 -41.82C-10.96 -36.95 -15.66 -29.99 -25.93 -23.66L-18.04 -17.81C-12.7 -21.52 -7.54 -26.51 -3.42 -31.67H11.02C10.27 -27.9 7.02 -21.23 3.36 -17.17C-1.57 -11.66 -7.6 -6.73 -20.13 -2.9L-11.77 4.52C-0.87 0.06 6.15 -5.28 11.77 -12.18C17.11 -18.73 20.24 -26.39 21.81 -31.2C22.39 -32.94 23.32 -34.68 24.07 -35.96L16.94 -40.37C15.43 -39.9 13.11 -39.61 11.19 -39.61H1.86C2.73 -41.12 4.12 -43.5 5.45 -45.36Z", "ス": "M20.47 -39.61 14.73 -43.85C13.4 -43.38 10.67 -42.98 7.77 -42.98C4.99 -42.98 -8.12 -42.98 -11.6 -42.98C-13.28 -42.98 -16.99 -43.15 -19.02 -43.44V-33.47C-17.4 -33.58 -14.21 -33.93 -11.6 -33.93C-8.82 -33.93 3.83 -33.93 6.44 -33.93C5.22 -30.22 2.09 -25.11 -1.68 -20.82C-6.84 -15.08 -16.01 -7.95 -25.4 -4.52L-18.1 3.07C-10.5 -0.58 -2.9 -6.44 3.19 -12.76C8.41 -7.71 13.34 -2.15 17.05 3.13L25.11 -3.89C21.92 -7.83 14.96 -15.2 9.34 -20.07C13.11 -25.29 16.18 -31.09 18.1 -35.38C18.73 -36.83 19.95 -38.86 20.47 -39.61Z", "ド": "M11.37 -43.96 5.57 -41.53C7.83 -38.34 8.82 -36.54 10.67 -32.54L16.65 -35.15C15.37 -37.76 13.11 -41.35 11.37 -43.96ZM19.31 -47.27 13.57 -44.6C15.83 -41.53 16.94 -39.9 18.97 -35.9L24.77 -38.74C23.49 -41.3 21.11 -44.78 19.31 -47.27ZM-13.28 -4.93C-13.28 -2.55 -13.57 1.33 -13.98 3.83H-2.96C-3.25 1.22 -3.6 -3.36 -3.6 -4.93V-19.84C2.55 -17.63 10.5 -14.56 16.36 -11.54L20.36 -21.34C15.49 -23.72 4.23 -27.84 -3.6 -30.1V-38.05C-3.6 -40.83 -3.25 -43.38 -3.02 -45.59H-13.98C-13.51 -43.38 -13.28 -40.37 -13.28 -38.05C-13.28 -33.12 -13.28 -10.03 -13.28 -4.93Z", "ロ": "M-22.33 -41.93C-22.21 -40.14 -22.21 -37.47 -22.21 -35.61C-22.21 -31.61 -22.21 -11.54 -22.21 -7.42C-22.21 -4.23 -22.39 1.33 -22.39 1.33H-12.7V-1.74H13.17L13.05 1.33H22.79C22.79 1.33 22.68 -4.81 22.68 -7.31C22.68 -11.54 22.68 -31.61 22.68 -35.61C22.68 -37.58 22.68 -39.96 22.79 -41.88C20.47 -41.82 18.27 -41.82 16.7 -41.82C11.77 -41.82 -10.85 -41.82 -15.66 -41.82C-17.34 -41.82 -19.95 -41.88 -22.33 -41.93ZM-12.76 -10.73V-32.83H13.22V-10.73Z", "プ": "M17.57 -43.04C17.57 -44.72 18.97 -46.11 20.65 -46.11C22.33 -46.11 23.72 -44.72 23.72 -43.04C23.72 -41.35 22.33 -39.96 20.65 -39.96C18.97 -39.96 17.57 -41.35 17.57 -43.04ZM13.46 -43.04 13.51 -42.28C11.95 -42.05 10.32 -41.99 9.34 -41.99C5.74 -41.99 -11.31 -41.99 -16.24 -41.99C-18.15 -41.99 -21.98 -42.28 -23.78 -42.51V-32.6C-22.27 -32.71 -19.08 -32.89 -16.24 -32.89C-11.31 -32.89 5.68 -32.89 9.28 -32.89C8.53 -28.25 6.61 -22.5 2.9 -17.92C-1.68 -12.24 -8.24 -7.13 -19.89 -4.52L-12.24 3.89C-2.03 0.58 6.15 -5.39 11.37 -12.41C16.36 -19.14 18.73 -27.96 20.13 -33.41L20.82 -35.84C24.71 -35.96 27.84 -39.15 27.84 -43.04C27.84 -46.98 24.59 -50.23 20.65 -50.23C16.7 -50.23 13.46 -46.98 13.46 -43.04Z"};
const sixPromotionPaths={"1": "M64.93 36.09V28.69H67.89C71.03 28.69 72.73 29.54 72.73 32.13C72.73 34.72 71.03 36.09 67.89 36.09ZM73.18 51H80.58L74.44 40.09C77.28 38.75 79.17 36.16 79.17 32.13C79.17 25.47 74.29 23.44 68.41 23.44H58.3V51H64.93V41.31H68.11ZM95.86 51.52C103.37 51.52 108.48 46.12 108.48 37.09C108.48 28.1 103.37 22.95 95.86 22.95C88.35 22.95 83.24 28.06 83.24 37.09C83.24 46.12 88.35 51.52 95.86 51.52ZM95.86 45.82C92.23 45.82 90.01 42.42 90.01 37.09C90.01 31.76 92.23 28.62 95.86 28.62C99.48 28.62 101.74 31.76 101.74 37.09C101.74 42.42 99.48 45.82 95.86 45.82ZM124.61 51.52C131.93 51.52 135.63 47.34 135.63 38.05V23.44H129.27V38.75C129.27 43.97 127.6 45.82 124.61 45.82C121.57 45.82 120.02 43.97 120.02 38.75V23.44H113.43V38.05C113.43 47.34 117.24 51.52 124.61 51.52ZM141.81 51H148.1V41.86C148.1 38.53 147.55 34.76 147.25 31.69H147.44L150.14 37.72L156.95 51H163.68V23.44H157.39V32.57C157.39 35.87 157.94 39.83 158.28 42.75H158.09L155.39 36.64L148.55 23.44H141.81ZM170.08 51H178.37C186.4 51 191.95 46.67 191.95 37.09C191.95 27.51 186.4 23.44 178 23.44H170.08ZM176.7 45.67V28.73H177.59C182.03 28.73 185.18 30.54 185.18 37.09C185.18 43.64 182.03 45.67 177.59 45.67ZM205.23 51H222.62V45.67H217.66V23.44H212.82C210.89 24.66 208.97 25.4 206.01 25.95V30.02H211.08V45.67H205.23Z", "2": "M64.93 36.09V28.69H67.89C71.03 28.69 72.73 29.54 72.73 32.13C72.73 34.72 71.03 36.09 67.89 36.09ZM73.18 51H80.58L74.44 40.09C77.28 38.75 79.17 36.16 79.17 32.13C79.17 25.47 74.29 23.44 68.41 23.44H58.3V51H64.93V41.31H68.11ZM95.86 51.52C103.37 51.52 108.48 46.12 108.48 37.09C108.48 28.1 103.37 22.95 95.86 22.95C88.35 22.95 83.24 28.06 83.24 37.09C83.24 46.12 88.35 51.52 95.86 51.52ZM95.86 45.82C92.23 45.82 90.01 42.42 90.01 37.09C90.01 31.76 92.23 28.62 95.86 28.62C99.48 28.62 101.74 31.76 101.74 37.09C101.74 42.42 99.48 45.82 95.86 45.82ZM124.61 51.52C131.93 51.52 135.63 47.34 135.63 38.05V23.44H129.27V38.75C129.27 43.97 127.6 45.82 124.61 45.82C121.57 45.82 120.02 43.97 120.02 38.75V23.44H113.43V38.05C113.43 47.34 117.24 51.52 124.61 51.52ZM141.81 51H148.1V41.86C148.1 38.53 147.55 34.76 147.25 31.69H147.44L150.14 37.72L156.95 51H163.68V23.44H157.39V32.57C157.39 35.87 157.94 39.83 158.28 42.75H158.09L155.39 36.64L148.55 23.44H141.81ZM170.08 51H178.37C186.4 51 191.95 46.67 191.95 37.09C191.95 27.51 186.4 23.44 178 23.44H170.08ZM176.7 45.67V28.73H177.59C182.03 28.73 185.18 30.54 185.18 37.09C185.18 43.64 182.03 45.67 177.59 45.67ZM203.9 51H222.99V45.45H217.96C216.7 45.45 214.81 45.63 213.45 45.82C217.66 41.56 221.73 36.35 221.73 31.61C221.73 26.36 218.03 22.95 212.71 22.95C208.78 22.95 206.27 24.32 203.57 27.21L207.16 30.76C208.49 29.36 209.93 28.1 211.82 28.1C214.04 28.1 215.41 29.47 215.41 31.98C215.41 35.98 210.78 40.97 203.9 47.23Z", "3": "M64.93 36.09V28.69H67.89C71.03 28.69 72.73 29.54 72.73 32.13C72.73 34.72 71.03 36.09 67.89 36.09ZM73.18 51H80.58L74.44 40.09C77.28 38.75 79.17 36.16 79.17 32.13C79.17 25.47 74.29 23.44 68.41 23.44H58.3V51H64.93V41.31H68.11ZM95.86 51.52C103.37 51.52 108.48 46.12 108.48 37.09C108.48 28.1 103.37 22.95 95.86 22.95C88.35 22.95 83.24 28.06 83.24 37.09C83.24 46.12 88.35 51.52 95.86 51.52ZM95.86 45.82C92.23 45.82 90.01 42.42 90.01 37.09C90.01 31.76 92.23 28.62 95.86 28.62C99.48 28.62 101.74 31.76 101.74 37.09C101.74 42.42 99.48 45.82 95.86 45.82ZM124.61 51.52C131.93 51.52 135.63 47.34 135.63 38.05V23.44H129.27V38.75C129.27 43.97 127.6 45.82 124.61 45.82C121.57 45.82 120.02 43.97 120.02 38.75V23.44H113.43V38.05C113.43 47.34 117.24 51.52 124.61 51.52ZM141.81 51H148.1V41.86C148.1 38.53 147.55 34.76 147.25 31.69H147.44L150.14 37.72L156.95 51H163.68V23.44H157.39V32.57C157.39 35.87 157.94 39.83 158.28 42.75H158.09L155.39 36.64L148.55 23.44H141.81ZM170.08 51H178.37C186.4 51 191.95 46.67 191.95 37.09C191.95 27.51 186.4 23.44 178 23.44H170.08ZM176.7 45.67V28.73H177.59C182.03 28.73 185.18 30.54 185.18 37.09C185.18 43.64 182.03 45.67 177.59 45.67ZM212.67 51.52C218.14 51.52 222.84 48.63 222.84 43.49C222.84 39.94 220.59 37.72 217.55 36.79V36.61C220.48 35.42 221.96 33.28 221.96 30.54C221.96 25.62 218.22 22.95 212.52 22.95C209.26 22.95 206.53 24.21 203.97 26.36L207.3 30.39C208.97 28.91 210.37 28.1 212.22 28.1C214.26 28.1 215.37 29.13 215.37 31.02C215.37 33.2 213.89 34.61 209.19 34.61V39.27C214.96 39.27 216.22 40.68 216.22 43.05C216.22 45.12 214.56 46.19 212 46.19C209.86 46.19 207.93 45.08 206.27 43.53L203.23 47.67C205.23 50 208.3 51.52 212.67 51.52Z", "4": "M64.93 36.09V28.69H67.89C71.03 28.69 72.73 29.54 72.73 32.13C72.73 34.72 71.03 36.09 67.89 36.09ZM73.18 51H80.58L74.44 40.09C77.28 38.75 79.17 36.16 79.17 32.13C79.17 25.47 74.29 23.44 68.41 23.44H58.3V51H64.93V41.31H68.11ZM95.86 51.52C103.37 51.52 108.48 46.12 108.48 37.09C108.48 28.1 103.37 22.95 95.86 22.95C88.35 22.95 83.24 28.06 83.24 37.09C83.24 46.12 88.35 51.52 95.86 51.52ZM95.86 45.82C92.23 45.82 90.01 42.42 90.01 37.09C90.01 31.76 92.23 28.62 95.86 28.62C99.48 28.62 101.74 31.76 101.74 37.09C101.74 42.42 99.48 45.82 95.86 45.82ZM124.61 51.52C131.93 51.52 135.63 47.34 135.63 38.05V23.44H129.27V38.75C129.27 43.97 127.6 45.82 124.61 45.82C121.57 45.82 120.02 43.97 120.02 38.75V23.44H113.43V38.05C113.43 47.34 117.24 51.52 124.61 51.52ZM141.81 51H148.1V41.86C148.1 38.53 147.55 34.76 147.25 31.69H147.44L150.14 37.72L156.95 51H163.68V23.44H157.39V32.57C157.39 35.87 157.94 39.83 158.28 42.75H158.09L155.39 36.64L148.55 23.44H141.81ZM170.08 51H178.37C186.4 51 191.95 46.67 191.95 37.09C191.95 27.51 186.4 23.44 178 23.44H170.08ZM176.7 45.67V28.73H177.59C182.03 28.73 185.18 30.54 185.18 37.09C185.18 43.64 182.03 45.67 177.59 45.67ZM214.74 51H220.88V44.12H223.92V39.12H220.88V23.44H212.74L203.16 39.57V44.12H214.74ZM214.74 39.12H209.45L212.59 33.68C213.37 32.13 214.11 30.54 214.81 28.95H214.96C214.89 30.72 214.74 33.35 214.74 35.09Z", "5": "M64.93 36.09V28.69H67.89C71.03 28.69 72.73 29.54 72.73 32.13C72.73 34.72 71.03 36.09 67.89 36.09ZM73.18 51H80.58L74.44 40.09C77.28 38.75 79.17 36.16 79.17 32.13C79.17 25.47 74.29 23.44 68.41 23.44H58.3V51H64.93V41.31H68.11ZM95.86 51.52C103.37 51.52 108.48 46.12 108.48 37.09C108.48 28.1 103.37 22.95 95.86 22.95C88.35 22.95 83.24 28.06 83.24 37.09C83.24 46.12 88.35 51.52 95.86 51.52ZM95.86 45.82C92.23 45.82 90.01 42.42 90.01 37.09C90.01 31.76 92.23 28.62 95.86 28.62C99.48 28.62 101.74 31.76 101.74 37.09C101.74 42.42 99.48 45.82 95.86 45.82ZM124.61 51.52C131.93 51.52 135.63 47.34 135.63 38.05V23.44H129.27V38.75C129.27 43.97 127.6 45.82 124.61 45.82C121.57 45.82 120.02 43.97 120.02 38.75V23.44H113.43V38.05C113.43 47.34 117.24 51.52 124.61 51.52ZM141.81 51H148.1V41.86C148.1 38.53 147.55 34.76 147.25 31.69H147.44L150.14 37.72L156.95 51H163.68V23.44H157.39V32.57C157.39 35.87 157.94 39.83 158.28 42.75H158.09L155.39 36.64L148.55 23.44H141.81ZM170.08 51H178.37C186.4 51 191.95 46.67 191.95 37.09C191.95 27.51 186.4 23.44 178 23.44H170.08ZM176.7 45.67V28.73H177.59C182.03 28.73 185.18 30.54 185.18 37.09C185.18 43.64 182.03 45.67 177.59 45.67ZM212.89 51.52C218.18 51.52 222.84 47.93 222.84 41.75C222.84 35.79 218.92 33.05 214.26 33.05C213.22 33.05 212.41 33.2 211.41 33.61L211.82 28.95H221.62V23.44H206.16L205.45 37.09L208.34 38.98C209.97 37.94 210.71 37.64 212.22 37.64C214.59 37.64 216.26 39.12 216.26 41.9C216.26 44.75 214.59 46.19 211.93 46.19C209.75 46.19 207.82 45.04 206.27 43.56L203.27 47.71C205.45 49.85 208.49 51.52 212.89 51.52Z", "6": "M64.93 36.09V28.69H67.89C71.03 28.69 72.73 29.54 72.73 32.13C72.73 34.72 71.03 36.09 67.89 36.09ZM73.18 51H80.58L74.44 40.09C77.28 38.75 79.17 36.16 79.17 32.13C79.17 25.47 74.29 23.44 68.41 23.44H58.3V51H64.93V41.31H68.11ZM95.86 51.52C103.37 51.52 108.48 46.12 108.48 37.09C108.48 28.1 103.37 22.95 95.86 22.95C88.35 22.95 83.24 28.06 83.24 37.09C83.24 46.12 88.35 51.52 95.86 51.52ZM95.86 45.82C92.23 45.82 90.01 42.42 90.01 37.09C90.01 31.76 92.23 28.62 95.86 28.62C99.48 28.62 101.74 31.76 101.74 37.09C101.74 42.42 99.48 45.82 95.86 45.82ZM124.61 51.52C131.93 51.52 135.63 47.34 135.63 38.05V23.44H129.27V38.75C129.27 43.97 127.6 45.82 124.61 45.82C121.57 45.82 120.02 43.97 120.02 38.75V23.44H113.43V38.05C113.43 47.34 117.24 51.52 124.61 51.52ZM141.81 51H148.1V41.86C148.1 38.53 147.55 34.76 147.25 31.69H147.44L150.14 37.72L156.95 51H163.68V23.44H157.39V32.57C157.39 35.87 157.94 39.83 158.28 42.75H158.09L155.39 36.64L148.55 23.44H141.81ZM170.08 51H178.37C186.4 51 191.95 46.67 191.95 37.09C191.95 27.51 186.4 23.44 178 23.44H170.08ZM176.7 45.67V28.73H177.59C182.03 28.73 185.18 30.54 185.18 37.09C185.18 43.64 182.03 45.67 177.59 45.67ZM214.33 51.52C219.25 51.52 223.4 48 223.4 42.16C223.4 36.2 219.92 33.54 215.33 33.54C213.78 33.54 211.45 34.5 210.08 36.24C210.34 30.24 212.59 28.21 215.44 28.21C216.96 28.21 218.66 29.17 219.55 30.13L223.03 26.25C221.29 24.47 218.63 22.95 215 22.95C209.3 22.95 204.05 27.51 204.05 37.46C204.05 47.48 209.15 51.52 214.33 51.52ZM210.19 40.64C211.3 38.83 212.74 38.16 214.07 38.16C215.89 38.16 217.4 39.16 217.4 42.16C217.4 45.3 215.92 46.6 214.19 46.6C212.45 46.6 210.74 45.23 210.19 40.64Z"};
const sixPromotionSubtitle="M91.31 70.62 92.61 72.38C93.58 71.4 94.71 70.17 95.63 69.02L94.47 67.27C93.32 68.56 92.08 69.86 91.31 70.62ZM91.69 63.37C92.51 63.97 93.6 64.87 94.07 65.48L95.61 63.8C95.07 63.2 93.94 62.39 93.13 61.86ZM96.8 61.1C96.39 63.33 95.54 65.5 94.33 66.76C94.86 66.99 95.83 67.53 96.26 67.85C96.77 67.2 97.24 66.36 97.66 65.43H98.43V66.67C98.43 68.41 97.38 71.19 93.86 72.61C94.21 72.97 94.85 73.85 95.09 74.33C97.62 73.21 99.15 71.04 99.53 69.82C99.82 71.05 101.21 73.29 103.47 74.33C103.8 73.81 104.4 72.96 104.79 72.47C101.53 71.04 100.6 68.35 100.6 66.66V65.43H102.06C101.82 66.13 101.53 66.81 101.29 67.29C101.77 67.47 102.59 67.89 103.01 68.11C103.59 67.08 104.26 65.64 104.68 64.18L103.17 63.28L102.77 63.4H98.42C98.6 62.78 98.77 62.14 98.91 61.48ZM108.07 62.08V64.26C108.49 64.22 109.16 64.21 109.63 64.21C110.5 64.21 114.14 64.21 114.91 64.21C115.44 64.21 116.2 64.24 116.59 64.26V62.08C116.19 62.14 115.39 62.16 114.94 62.16C114.14 62.16 110.59 62.16 109.63 62.16C109.14 62.16 108.46 62.14 108.07 62.08ZM117.87 66.36 116.37 65.43C116.14 65.52 115.72 65.59 115.19 65.59C114.1 65.59 109.63 65.59 108.53 65.59C108.05 65.59 107.39 65.55 106.75 65.5V67.68C107.38 67.62 108.18 67.61 108.53 67.61C110.01 67.61 114.18 67.61 114.9 67.61C114.66 68.25 114.28 68.95 113.6 69.64C112.59 70.65 110.96 71.57 108.78 72.03L110.47 73.95C112.27 73.43 114.09 72.41 115.47 70.86C116.51 69.7 117.1 68.38 117.56 67.04C117.61 66.87 117.75 66.57 117.87 66.36ZM131.94 64.53 130.47 63.63C130.19 63.73 129.81 63.8 129.19 63.8H127.15V62.86C127.15 62.4 127.18 62.14 127.26 61.44H124.64C124.75 62.14 124.77 62.4 124.77 62.86V63.8H121.84C121.28 63.8 120.86 63.79 120.34 63.73C120.4 64.08 120.41 64.68 120.41 65.01C120.41 65.55 120.41 66.95 120.41 67.41C120.41 67.85 120.39 68.34 120.34 68.74H122.68C122.64 68.44 122.63 67.95 122.63 67.6C122.63 67.16 122.63 66.24 122.63 65.8H129.08C128.88 67.08 128.56 68.2 127.89 69.14C127.13 70.16 126.07 70.86 125.06 71.28C124.4 71.54 123.51 71.8 122.78 71.92L124.54 73.97C126.99 73.34 129.21 71.82 130.35 69.63C131 68.39 131.35 67.26 131.63 65.79C131.68 65.51 131.81 64.89 131.94 64.53ZM136.49 62.14 134.88 63.86C135.88 64.57 137.65 66.11 138.39 66.92L140.13 65.15C139.29 64.25 137.45 62.79 136.49 62.14ZM134.41 71.43 135.86 73.67C137.62 73.39 139.44 72.66 140.87 71.82C143.21 70.45 145.19 68.51 146.31 66.52L145 64.12C144.06 66.1 142.17 68.27 139.65 69.72C138.28 70.52 136.47 71.15 134.41 71.43ZM156.74 62.39 155.34 62.98C155.89 63.75 156.13 64.18 156.58 65.15L158.02 64.52C157.71 63.89 157.16 63.02 156.74 62.39ZM158.66 61.59 157.28 62.23C157.82 62.98 158.09 63.37 158.58 64.33L159.98 63.65C159.67 63.03 159.1 62.19 158.66 61.59ZM150.79 71.81C150.79 72.38 150.72 73.32 150.63 73.92H153.29C153.22 73.29 153.13 72.19 153.13 71.81V68.21C154.62 68.74 156.53 69.49 157.95 70.21L158.91 67.85C157.74 67.27 155.02 66.28 153.13 65.73V63.82C153.13 63.14 153.22 62.53 153.27 62H150.63C150.74 62.53 150.79 63.26 150.79 63.82C150.79 65.01 150.79 70.58 150.79 71.81ZM161.38 68.65 163.45 70.77C163.72 70.37 164.04 69.82 164.37 69.32C164.92 68.56 165.82 67.26 166.32 66.62C166.68 66.15 166.95 66.1 167.38 66.57C168.04 67.33 169.08 68.66 169.92 69.68C170.77 70.7 171.92 72.01 172.89 72.93L174.65 70.89C173.28 69.65 172.19 68.52 171.26 67.51C170.48 66.64 169.34 65.17 168.32 64.21C167.24 63.19 166.24 63.26 165.17 64.46C164.28 65.48 163.25 66.84 162.65 67.46C162.2 67.93 161.84 68.28 161.38 68.65ZM181.13 69.28H182.87L183.29 64.85L183.37 62.53H180.63L180.71 64.85ZM182 73.17C182.83 73.17 183.43 72.57 183.43 71.74C183.43 70.91 182.83 70.34 182 70.34C181.17 70.34 180.57 70.91 180.57 71.74C180.57 72.57 181.16 73.17 182 73.17Z";
sixArtLogoMarkup=function(instance='main'){
 const id='six-drop-luxe-'+instance,colors=['#b5ee77','#71e2d2','#82d8ff','#c5acff','#ff9acb','#ffc67a','#ffe58c','#b8ec92'];
 const defs='<linearGradient id="'+id+'-gold" x2="0" y2="1"><stop stop-color="#fffde0"/><stop offset=".28" stop-color="#ffe893"/><stop offset=".48" stop-color="#d99b3c"/><stop offset=".62" stop-color="#fff2b5"/><stop offset="1" stop-color="#c68036"/></linearGradient><linearGradient id="'+id+'-ribbon" x2="0" y2="1"><stop stop-color="#f7a5cf"/><stop offset=".45" stop-color="#d85aa1"/><stop offset="1" stop-color="#783775"/></linearGradient>'+colors.map((c,i)=>'<linearGradient id="'+id+'-c'+i+'" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset=".23" stop-color="'+c+'"/><stop offset=".55" stop-color="#fff5df"/><stop offset=".6" stop-color="'+c+'"/><stop offset="1" stop-color="#c85a96"/></linearGradient>').join('');
 const letters=[...'シックスドロップ'].map((ch,i)=>{const px=82+i*54,yy=94+Math.abs(i-3.5)*1.5,rotate=(i-3.5)*1.1,d=sixCandyTitlePaths[ch];return '<g transform="translate('+px+' '+yy+') rotate('+rotate+')"><path d="'+d+'" transform="translate(0 6)" fill="#72316a" stroke="#72316a" stroke-width="14"/><path d="'+d+'" fill="url(#'+id+'-c'+i+')" stroke="url(#'+id+'-gold)" stroke-width="12"/><path d="'+d+'" fill="url(#'+id+'-c'+i+')" stroke="#fff9e9" stroke-width="5"/><path d="'+d+'" fill="url(#'+id+'-c'+i+')" stroke="#ad5689" stroke-width=".7"/></g>';}).join('');
 const candy=(cx,cy,c,rot)=>'<g transform="translate('+cx+' '+cy+') rotate('+rot+')"><path d="M-13-9-29-15-25 0-29 15-13 9M13-9 29-15 25 0 29 15 13 9" fill="'+c+'" stroke="#fff7ce" stroke-width="3"/><rect x="-17" y="-13" width="34" height="26" rx="13" fill="'+c+'" stroke="url(#'+id+'-gold)" stroke-width="3"/><path d="M-9-7Q0-12 9-7" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/></g>';
 const sweets='<g stroke-linecap="round"><path d="M55 71 34 12M485 71 506 12" stroke="#8b4b76" stroke-width="7"/><path d="M55 71 34 12M485 71 506 12" stroke="#fff5d9" stroke-width="4"/><g fill="#ffa4d4" stroke="#fff4b5" stroke-width="4"><circle cx="34" cy="24" r="20"/><circle cx="506" cy="24" r="20"/></g><g fill="none" stroke="#bc438c" stroke-width="4"><path d="M34 24c-11-11-20 8-6 13s27-12 13-23-27 0-25 13M506 24c11-11 20 8 6 13s-27-12-13-23 27 0 25 13"/></g><path d="M77 50Q94 65 108 48Q123 64 139 46Q153 61 169 44Q185 59 201 42Q217 57 233 41Q249 56 265 40Q281 55 297 41Q313 56 329 42Q345 58 361 44Q377 60 393 46Q409 62 425 48Q441 65 460 50" fill="none" stroke="#fff6dd" stroke-width="7"/>'+Array.from({length:6},(_,i)=>'<g transform="translate('+(174+i*38)+' 24)"><path d="M0-15C-4-9-12-4-12 3a12 12 0 0 0 24 0C12-4 4-9 0-15Z" fill="'+colors[i]+'" stroke="#fff2ad" stroke-width="3"/><ellipse cx="-4" cy="-1" rx="3" ry="5" fill="#fff" fill-opacity=".72"/></g>').join('')+'</g>';
 const gems=Array.from({length:17},(_,i)=>{const a=Math.PI+i*Math.PI/16;return '<circle cx="'+(270+244*Math.cos(a))+'" cy="'+(83+53*Math.sin(a))+'" r="3.2" fill="#fff3bf" stroke="#cc8f4a" stroke-width="1"/>';}).join('');
 return '<svg class="six-art-logo" viewBox="0 -5 540 180" role="img" aria-label="シックスドロップ SIX DROP" xmlns="http://www.w3.org/2000/svg"><defs>'+defs+'</defs><g stroke-linejoin="round"><path d="M16 71 40 44 88 39Q270-15 452 39L500 44 524 71 505 100 519 126 468 126Q270 183 72 126L21 126 35 100Z" fill="#693c70" stroke="#693c70" stroke-width="7"/><path d="M22 68 50 43 90 43Q270-8 450 43L490 43 518 68 499 98 510 119 463 119Q270 171 77 119L30 119 41 98Z" fill="url(#'+id+'-ribbon)" stroke="url(#'+id+'-gold)" stroke-width="6"/><path d="M54 113Q270 157 486 113" stroke="#ffd8ee" stroke-width="2" fill="none"/>'+sweets+gems+candy(35,83,'#9be3e7',-22)+candy(505,83,'#ffd184',22)+'<g fill="#fff0a8" stroke="#d89944" stroke-width="2"><path d="m270 5 6 15 17 2-13 11 4 17-14-9-14 9 4-17-13-11 17-2Z"/><path d="m108 17 4 9 10 2-7 7 2 10-9-5-9 5 2-10-7-7 10-2Z"/><path d="m432 17 4 9 10 2-7 7 2 10-9-5-9 5 2-10-7-7 10-2Z"/></g><g font-family="CookieLabels,system-ui,sans-serif" font-size="58" font-weight="1000" text-anchor="middle" paint-order="stroke fill">'+letters+'</g><path d="M168 120Q270 111 372 120L363 148Q270 160 177 148Z" fill="url(#'+id+'-gold)" stroke="#ad6084" stroke-width="2"/><text x="270" y="141" text-anchor="middle" font-family="system-ui" font-weight="1000" font-size="21" letter-spacing="5" fill="#9a367c" stroke="#fff9df" stroke-width="1.2" paint-order="stroke fill">SIX DROP</text><g stroke="#fffced" stroke-width="2.5" stroke-linecap="round"><path d="M60 40v12m-6-6h12M480 40v12m-6-6h12M143 115v10m-5-5h10M397 115v10m-5-5h10"/></g></g></svg>';
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

function sixCandyPromotionMarkup(round){
 const title='ROUND '+round;
 return '<svg class="six-promotion-sign" viewBox="0 0 280 94" role="img" aria-label="ラウンド'+round+'進出"><title>NEXT ROUND '+round+'・次ラウンドへ！</title><defs><pattern id="six-prom-stripes" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="18" height="18" fill="#fff8e9"/><rect width="8" height="18" fill="#ff75ad"/></pattern><linearGradient id="six-prom-face" x2="0" y2="1"><stop stop-color="#fffce6"/><stop offset="1" stop-color="#ffc8e6"/></linearGradient></defs><g stroke-linejoin="round"><path d="M24 26 3 15 8 47 3 77 27 67M256 26 277 15 272 47 277 77 253 67" fill="url(#six-prom-stripes)" stroke="#aa3b79" stroke-width="3"/><rect x="20" y="5" width="240" height="84" rx="30" fill="url(#six-prom-stripes)" stroke="#a53a74" stroke-width="4"/><rect x="28" y="13" width="224" height="68" rx="24" fill="url(#six-prom-face)" stroke="#ffe99f" stroke-width="4"/><path d="M48 23Q140 5 232 23" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="'+sixPromotionPaths[round]+'" transform="translate(0 2)" fill="#f75c9e" stroke="#82366a" stroke-width="6"/><path d="'+sixPromotionPaths[round]+'" fill="#f75c9e" stroke="#fffcec" stroke-width="2.5" paint-order="stroke fill"/><path d="'+sixPromotionSubtitle+'" fill="#8a326c" stroke="#fffaf0" stroke-width="3"/><path d="'+sixPromotionSubtitle+'" fill="#8a326c"/><g fill="#fff5a7" stroke="#d89b42"><path d="m36 39 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/><path d="m244 39 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/></g></g></svg>';
}
const sixCandySignBaseEvent=carnivalEvent;
carnivalEvent=function(s,ev,e,a){
 sixCandySignBaseEvent(s,ev,e,a);
 if(ev.phase==='ready'||ev.phase==='error'){s.sixPromotionShown=new Set();s.candyReward.classList.remove('six-candy-promotion','six-simple-award');}
 if(['pyramidAward','pyramidRoundBonus','pyramidAllClear'].includes(ev.phase)&&!s.candyReward.hidden){
  const key=e.version+'/'+e.roundIndex,next=s.candyReward.querySelector('.six-next'),advance=next?.textContent.startsWith('NEXT ROUND');s.sixPromotionShown??=new Set();
  const simple=s.sixPromotionShown.has(key);if(!simple)s.candyReward.removeAttribute('aria-label');s.candyReward.classList.toggle('six-simple-award',simple);s.candyReward.classList.toggle('six-candy-promotion',!simple&&!!advance);
  if(simple){s.candyReward.innerHTML='<strong>＋'+num(medalWin(a.bet(s.i),ev.gain))+' <em>WIN</em></strong>';s.candyReward.setAttribute('aria-label','配当増加 '+num(medalWin(a.bet(s.i),ev.gain))+' WIN');}
  else if(advance){s.sixPromotionShown.add(key);next.innerHTML=sixCandyPromotionMarkup(e.roundIndex+1);}
 }
};

/* Rare shapes: deterministic, phase-bound jewels; never modify the board. */
const sixRareBaseEffects=sixStageEffects;
sixStageEffects=function(x,fx,p,round,rows,reduced){
 if(reduced&&fx?.phase==='pyramidShape'&&fx.forms?.some(f=>f.type!=='line'))p=.5;
 sixRareBaseEffects(x,fx,p,round,rows,reduced);
 if(!fx||!['pyramidShape','pyramidAward'].includes(fx.phase))return;
 for(const form of fx.forms||[]){
  if(form.type==='line')continue;
  const hex=form.type==='hexagon',ps=form.cells.map(c=>sixXY(...c,rows)),cx=ps.reduce((n,z)=>n+z.x,0)/ps.length,cy=ps.reduce((n,z)=>n+z.y,0)/ps.length,hull=sixHull(ps),award=fx.phase==='pyramidAward',u=reduced?.5:p;
  x.save();x.lineJoin='round';x.globalAlpha=award?Math.max(0,1-p):.85;x.shadowBlur=reduced?0:14;x.shadowColor=hex?'#eeb8ff':'#ffd36a';
  // Layered gem silhouette remains centered on the actual matching drops.
  for(const [scale,width,color] of [[1.22,5,hex?'#b463df':'#d58a21'],[1.12,3,'#fff4b6'],[1,2,'#ffffff']]){
   x.strokeStyle=color;x.lineWidth=width;x.beginPath();hull.forEach((v,i)=>{const xx=cx+(v.x-cx)*scale,yy=cy+(v.y-cy)*scale;i?x.lineTo(xx,yy):x.moveTo(xx,yy);});x.closePath();x.stroke();
  }
  if(!reduced){
   const count=hex?24:15;
   for(let k=0;k<count;k++){
    const a=k*Math.PI*2/count+u*(hex?1.1:-.7),radius=35+(award?u*65:14*Math.sin(u*Math.PI))+(k%3)*8,xx=cx+Math.cos(a)*radius,yy=cy+Math.sin(a)*radius;
    const color=hex?['#ffaadf','#ffe48d','#a5f5eb','#c8b5ff'][k%4]:'#ffe28e';
    sixArtStar(x,xx,yy,2+(k%3), '#fffbea',color);
    x.strokeStyle=color;x.lineWidth=1.3;x.beginPath();x.moveTo(cx+Math.cos(a)*(radius-10),cy+Math.sin(a)*(radius-10));x.lineTo(xx,yy);x.stroke();
   }
  }
  x.restore();
 }
};
