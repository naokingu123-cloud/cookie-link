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
sixDrawTutorial=function(s,time,bet){
 const x=s.candyCtx,t=Math.max(0,Math.min(17999,time)),index=Math.min(3,Math.floor(t/4500)),local=t%4500,type=['cluster','line','triangle','hexagon'][index],sample=sixDropDemoFixtures[type],rules=sixDropMiniRules,role=index>0;
 const plan=sixDropDemoPlans[type]||(sixDropDemoPlans[type]=rules.sixPlan(sample.grid,sample.numbers,{trace:true})),total=plan.timeline.reduce((n,f)=>n+f.ms,0),playMs=Math.max(0,(local-550)/2750)*total;
 let remaining=playMs,fx=null,p=0,grid=sample.grid;if(local>=550){for(const stage of plan.timeline){if(remaining<=stage.ms){fx={...stage,elapsed:remaining};p=remaining/stage.ms;grid=stage.grid;break;}remaining-=stage.ms;}if(!fx)grid=plan.grid;}
 const pos=cell=>{const z=rules.sixPoint(...cell,3);return {x:160+z.x*48,y:112+z.y*48};},finished=local>=3300;
 x.drawImage(sixArtBackdrop(10),0,0,320,320);x.fillStyle='#fff8eeed';x.beginPath();x.roundRect(20,20,280,282,17);x.fill();sixText(x,role?sample.label:'同じ色が4個以上つながると消去',160,40,12,'#fff3ba');sixText(x,'抽選番号 '+sample.numbers.join('・'),160,62,11,'#fff3cf');
 x.fillStyle='#eac9d5';x.strokeStyle='#cc8fac';x.lineWidth=2;x.beginPath();x.roundRect(32,79,256,147,19);x.fill();x.stroke();
 for(let r=0;r<3;r++)for(let c=0;c<(r===1?4:5);c++){const z=pos([r,c]);x.fillStyle='#fff7f3';x.strokeStyle='#dcb3c5';x.lineWidth=1;x.beginPath();x.arc(z.x,z.y,23,0,7);x.fill();x.stroke();}
 const fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,p):null;if(fall)grid=fall.grid;const moves=new Map((fall?.moves||[]).map(m=>[m.id,m]));
 for(let r=0;r<3;r++)for(let c=0;c<grid[r].length;c++){const tile=grid[r][c];if(!tile)continue;let z=pos([r,c]);const m=moves.get(tile.id);if(m){const v=rules.sixMotionPoint(m,fall.progress);z={x:160+v.x*48,y:112+v.y*48};}x.drawImage(sixArtCandySprite(tile.color,1),z.x-23,z.y-23,46,46);sixPaintCandyNumber(x,tile.number,z.x,z.y+1,19,tile.color,1);if((local<550||fx?.phase==='pyramidHit')&&sample.numbers.includes(tile.number)){x.strokeStyle='#fff6a3';x.lineWidth=3;x.shadowColor='#ffffcc';x.shadowBlur=11;x.beginPath();x.arc(z.x,z.y,24,0,7);x.stroke();x.shadowBlur=0;}}
 if(fx?.phase==='pyramidShape'){for(const cell of fx.cells||[]){const z=pos(cell);x.strokeStyle='#fff1a0';x.lineWidth=3;x.shadowColor='#fff9b2';x.shadowBlur=12;x.beginPath();x.arc(z.x,z.y,23.5,0,7);x.stroke();}for(const form of fx.forms||[]){const points=form.cells.map(pos),hull=form.type==='line'?points:sixHull(points);x.strokeStyle='#fffbc9';x.lineWidth=4;x.beginPath();hull.forEach((z,i)=>i?x.lineTo(z.x,z.y):x.moveTo(z.x,z.y));if(form.type!=='line')x.closePath();x.stroke();}x.shadowBlur=0;}
 if(fx?.removed){for(const v of fx.removed){const z=pos([v.r,v.c]);x.save();x.globalAlpha=1-p;for(let k=0;k<5;k++){const a=k*Math.PI*2/5;const dx=Math.cos(a)*p*30,dy=Math.sin(a)*p*30;x.fillStyle=['#ccefa9','#c9efda','#c9ecff'][v.tile.color%3];x.fillRect(z.x+dx-3,z.y+dy-3,6,6);}x.restore();}}
 const caption=local<550?'番号HITでドロップを消す':fx?.phase==='pyramidFall'?'空いたところへドロップが落下':fx?.phase==='pyramidShape'?(role?sample.label:'4個以上がつながった！'):finished?(role?'次ラウンド確定！':'通常連結は配当なし・盤面を継続'):'消去 → 落下 → つながりを判定';sixText(x,caption,160,245,12,'#fff4bd');
 if(role&&finished){x.fillStyle='#fff0a4';x.strokeStyle='#de83a4';x.lineWidth=2;x.beginPath();x.roundRect(48,258,224,30,12);x.fill();x.stroke();sixText(x,'＋'+num(medalWin(bet,plan.gain))+' WIN  → NEXT ROUND',160,274,11,'#fff9de');}
 else sixText(x,role?'直線・三角・ヘキサゴンで配当＋次ROUND':'役以外の連結も消えて落下する',160,274,10,'#fff6da');
 for(let k=0;k<4;k++){x.fillStyle=k===index?'#e35f9a':'#d9bdcc';x.beginPath();x.arc(139+k*14,295,3,0,7);x.fill();}
 s.candyCanvas.dataset.mode='tutorial';s.candyCanvas.dataset.scene=String(index);s.candyCanvas.dataset.example=type;s.candyCanvas.setAttribute('aria-label','シックスドロップ・5・4・5個の3段盤面・'+caption);s.sixReachLayer.replaceChildren();s.sixReachKey='';s.candyReward.hidden=true;s.candyStatus.textContent=caption;s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
};
sixArtNumberSprite=function(number,color=0,round=1){
 if(!Number.isInteger(number)||number<1||number>25)return null;const theme=sixRoundTheme(round),style=SIX_PNG_STYLES[theme.colors[color%theme.colors.length]],tint='hsl('+style.h+' '+Math.round(style.s*65)+'% 88%)',key='drop-number/'+number+'/'+color+'/'+round;if(sixArtCache.has(key))return sixArtCache.get(key);
 const cv=document.createElement('canvas');cv.width=192;cv.height=144;const x=cv.getContext('2d'),label=String(number);x.font='1000 112px SweetReachRounded, "Arial Rounded MT Bold", system-ui';x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';const max=number>=10?162:112;x.strokeStyle='#294669';x.lineWidth=15;x.strokeText(label,96,76,max);x.strokeStyle='#fff';x.lineWidth=8;x.strokeText(label,96,72,max);const g=x.createLinearGradient(0,20,0,125);g.addColorStop(0,'#ffffff');g.addColorStop(.48,'#ffffff');g.addColorStop(1,tint);x.fillStyle=g;x.fillText(label,96,72,max);sixArtCache.set(key,cv);return cv;
};
sixPaintCandyNumber=function(x,number,cx,cy,radius,color=0,round=1){const art=sixArtNumberSprite(number,color,round);if(art)x.drawImage(art,cx-radius*.96,cy-radius*.77,radius*1.92,radius*1.44);};
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
