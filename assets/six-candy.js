/* Six Candy rules v2. Original deterministic simulation; no original-game code/assets.
 * Triangular lattice: down-left (r+1,c), down-right (r+1,c+1).
 * Actual Nintendo gravity implementation is unpublished; this model checks swept circle
 * clearance, rolls around a support, and resolves fall frames bottom-up without teleporting.
 */
const SIX_ROWS=10,SIX_SQRT3_2=Math.sqrt(3)/2;
const SIX_COLORS=[
 {name:'いちご',light:'#ffcbdc',color:'#f34c86',dark:'#a22353'},
 {name:'レモン',light:'#fff6b1',color:'#f6cc32',dark:'#aa741b'},
 {name:'ミント',light:'#cbffe4',color:'#44c695',dark:'#247e60'},
 {name:'ソーダ',light:'#d2f5ff',color:'#43bde8',dark:'#286ba9'},
 {name:'ぶどう',light:'#efdcff',color:'#b77bea',dark:'#71369d'}
];
const SIX_PAY={hexagon:50,triangle:30,line:10,allClear:6000};
const sixEmpty=(rows=SIX_ROWS)=>Array.from({length:rows},(_,r)=>Array(r+1).fill(null));
const sixClone=g=>g.map(row=>row.map(t=>t?{...t}:null));
const sixKey=(r,c)=>r*16+c;
const sixCount=g=>g.reduce((n,row)=>n+row.filter(Boolean).length,0);
const sixPoint=(r,c)=>({x:c-r/2,y:r*SIX_SQRT3_2});
function sixLayout(rows=10){const step=Math.min(40,256/(rows-1));return {step,top:270-(rows-1)*step*SIX_SQRT3_2,radius:step*.47};}
function sixXY(r,c,rows=10){const l=sixLayout(rows);return {x:160+(c-r/2)*l.step,y:l.top+r*l.step*SIX_SQRT3_2};}
function sixNeighbors(r,c){return [[r,c-1],[r,c+1],[r-1,c-1],[r-1,c],[r+1,c],[r+1,c+1]];}
const sixPatternCache=new Map();
function sixPatterns(rows=10){
 if(sixPatternCache.has(rows))return sixPatternCache.get(rows);const list=[];
 const add=(type,cells)=>{if(cells.every(([r,c])=>r>=0&&r<rows&&c>=0&&c<=r))list.push({type,cells,key:cells.map(p=>sixKey(...p)).sort((a,b)=>a-b).join(',')});};
 for(let r=0;r<rows;r++)for(let c=0;c<=r;c++){
  add('triangle',[[r,c],[r+1,c],[r+1,c+1],[r+2,c],[r+2,c+1],[r+2,c+2]]);
  add('triangle',[[r,c],[r,c+1],[r,c+2],[r+1,c+1],[r+1,c+2],[r+2,c+2]]);
  add('hexagon',[[r-1,c-1],[r-1,c],[r,c+1],[r+1,c+1],[r+1,c],[r,c-1]]);
 }
 sixPatternCache.set(rows,list);return list;
}
const SIX_PATTERNS=sixPatterns(10);
function sixComponents(grid){
 const seen=new Set(),out=[];
 for(let r=0;r<grid.length;r++)for(let c=0;c<=r;c++){
  const tile=grid[r][c],key=sixKey(r,c);if(!tile||seen.has(key))continue;
  const cells=[],stack=[[r,c]];seen.add(key);
  while(stack.length){const [y,x]=stack.pop();cells.push([y,x]);for(const [a,b] of sixNeighbors(y,x)){const k=sixKey(a,b);if(a<0||a>=grid.length||b<0||b>a||seen.has(k)||grid[a][b]?.color!==tile.color)continue;seen.add(k);stack.push([a,b]);}}
  out.push({cells,color:tile.color});
 }
 return out;
}
function sixUpperFirst(a,b){
 const ra=Math.min(...a.cells.map(p=>p[0])),rb=Math.min(...b.cells.map(p=>p[0]));
 return ra-rb||b.cells.length-a.cells.length||Math.min(...a.cells.map(p=>p[1]))-Math.min(...b.cells.map(p=>p[1]))||a.key.localeCompare(b.key);
}
function sixLines(grid,used=new Set()){
 const out=[];
 for(const [dr,dc] of [[0,1],[1,0],[1,1]])for(let r=0;r<grid.length;r++)for(let c=0;c<=r;c++){
  const t=grid[r][c];if(!t||used.has(sixKey(r,c)))continue;
  const same=(y,x)=>!!grid[y]?.[x]&&!used.has(sixKey(y,x))&&grid[y][x].color===t.color;
  if(same(r-dr,c-dc))continue;
  const cells=[];for(let y=r,x=c;same(y,x);y+=dr,x+=dc)cells.push([y,x]);
  if(cells.length>=4)out.push({type:'line',cells,color:t.color,key:cells.map(p=>sixKey(...p)).join(',')});
 }
 return out.sort(sixUpperFirst);
}
function sixFindShapes(grid){
 const used=new Set(),out=[],candidates=sixPatterns(grid.length).filter(p=>{const t=grid[p.cells[0][0]][p.cells[0][1]];return t&&p.cells.every(([r,c])=>grid[r][c]?.color===t.color);});
 // Highest-paying shape first; same-kind candidates are taken from the top.
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
function sixMotionPoint(move,t){
 const a=sixPoint(...move.from),b=sixPoint(...move.to);if(!move.pivot)return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 const p=sixPoint(...move.pivot),angle=Math.atan2(a.y-p.y,a.x-p.x)+move.turn*t;
 return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
}
function sixPathClear(grid,move){
 // Unit-diameter candy disks may touch but never cut through another candy.
 for(let k=1;k<=12;k++){
  const p=sixMotionPoint(move,k/12);
  for(let r=Math.max(0,move.from[0]-1);r<=Math.min(grid.length-1,move.to[0]+1);r++)for(let c=0;c<=r;c++){
   const t=grid[r][c];if(!t||t.id===move.id)continue;const q=sixPoint(r,c);
   if((p.x-q.x)**2+(p.y-q.y)**2<.999999)return false;
  }
 }
 return true;
}
function sixFallOptions(grid,r,c,momentum=new Map()){
 const tile=grid[r]?.[c];if(!tile||r===grid.length-1)return [];
 const left=grid[r+1][c],right=grid[r+1][c+1],sideL=grid[r][c-1],sideR=grid[r][c+1],options=[];
 if(left&&right)return options;
 const make=(to,pivot=null,turn=0)=>({id:tile.id,tile:{...tile},from:[r,c],to,pivot,turn});
 // Two empty supports allow a truly vertical two-row fall, not an arbitrary zig-zag.
 if(!left&&!right&&r+2<grid.length&&!grid[r+2][c+1])options.push(make([r+2,c+1]));
 const l=!left&&!sideL?make([r+1,c],right?[r+1,c+1]:null,right?-Math.PI/3:0):null;
 const rr=!right&&!sideR?make([r+1,c+1],left?[r+1,c]:null,left?Math.PI/3:0):null;
 const prefer=momentum.get(tile.id)||tile.lean||(c-r/2<0?-1:1);
 if(prefer<0){if(l)options.push(l);if(rr)options.push(rr);}else{if(rr)options.push(rr);if(l)options.push(l);}
 return options.filter(m=>sixPathClear(grid,m));
}
function sixDrop(grid,{trace=false}={}){
 const steps=[],paths=new Map(),momentum=new Map();let iterations=0;
 for(;;){
  let moved=false;if(++iterations>grid.length*grid.length+1)throw Error('Six Candy gravity did not converge');
  for(let r=grid.length-2;r>=0;r--){
   const proposals=[];
   // All proposals in one row use the same occupancy, independent of scan direction.
   for(let c=0;c<=r;c++){const candidates=sixFallOptions(grid,r,c,momentum);if(candidates.length)proposals.push({c,candidates});}
   proposals.sort((a,b)=>a.candidates.length-b.candidates.length||Math.abs(a.c-r/2)-Math.abs(b.c-r/2)||a.c-b.c);
   const accepted=[],targets=new Set();
   for(const p of proposals)for(const m of p.candidates){
    if(targets.has(sixKey(...m.to)))continue;let conflict=false;
    for(const other of accepted)for(let k=0;k<=12;k++){const a=sixMotionPoint(m,k/12),b=sixMotionPoint(other,k/12);if((a.x-b.x)**2+(a.y-b.y)**2<.999999){conflict=true;break;}}
    if(conflict)continue;accepted.push(m);targets.add(sixKey(...m.to));break;
   }
   if(!accepted.length)continue;
   for(const m of accepted){grid[m.from[0]][m.from[1]]=null;grid[m.to[0]][m.to[1]]=m.tile;const dx=sixPoint(...m.to).x-sixPoint(...m.from).x;if(dx)momentum.set(m.id,Math.sign(dx));
    if(!paths.has(m.id))paths.set(m.id,{id:m.id,tile:m.tile,points:[m.from]});paths.get(m.id).points.push(m.to);
   }
   if(trace)steps.push({grid:sixClone(grid),moves:accepted,ms:accepted.some(m=>m.to[0]-m.from[0]===2)?120:90});moved=true;
  }
  if(!moved)break;
 }
 return {steps,moves:[...paths.values()]};
}
function sixPlan(input,numbers,{trace=false}={}){
 const grid=sixClone(input),timeline=[],used=new Set(numbers),hit=[];let triangles=0,hexagons=0,lines=0,chain=0,gain=0,removedCount=0,ordinaryGroups=0;
 const push=(phase,detail={},ms=350)=>{if(trace)timeline.push({phase,...detail,grid:sixClone(grid),ms});};
 const remove=cells=>{const removed=[];for(const [r,c] of cells){const t=grid[r]?.[c];if(t){removed.push({r,c,tile:{...t}});grid[r][c]=null;}}removedCount+=removed.length;return removed;};
 const drop=()=>{const fall=sixDrop(grid,{trace});if(fall.moves.length)push('pyramidFall',{...fall},motionReduced?100:fall.steps.reduce((n,f)=>n+f.ms,0)||350);};
 for(let r=0;r<grid.length;r++)for(let c=0;c<=r;c++)if(grid[r][c]?.number!=null&&used.has(grid[r][c].number))hit.push([r,c]);
 if(!hit.length){push('pyramidMiss',{},250);return {grid,timeline,gain,triangles,hexagons,lines,chain,removedCount,ordinaryGroups,hit:0,cleared:false,advance:false};}
 push('pyramidHit',{cells:hit},280);push('pyramidBreak',{removed:remove(hit)},260);drop();
 for(;;){
  const resolved=sixResolve(grid);if(!resolved.cells.length)break;if(++chain>Math.ceil(input.length*(input.length+1)/8))throw Error('Cascade exceeded finite board');
  const award=resolved.hexagons*SIX_PAY.hexagon+resolved.triangles*SIX_PAY.triangle+resolved.lines*SIX_PAY.line;
  push('pyramidShape',{forms:resolved.forms,cells:resolved.cells,chain},resolved.forms.length?550:260);
  const removed=remove(resolved.cells);triangles+=resolved.triangles;hexagons+=resolved.hexagons;lines+=resolved.lines;gain+=award;ordinaryGroups+=resolved.clusters.length;
  push('pyramidAward',{...resolved,removed,chain,gain:award},award?1000:300);drop();
 }
 const cleared=sixCount(grid)===0;
 if(cleared){gain+=SIX_PAY.allClear;push('pyramidAllClear',{gain:SIX_PAY.allClear,chain,forms:[]},2100);}
 return {grid,timeline,gain,triangles,hexagons,lines,chain,removedCount,ordinaryGroups,hit:hit.length,cleared,advance:triangles+hexagons+lines>0||cleared};
}
function sixShuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[list[i],list[j]]=[list[j],list[i]];}return list;}
function sixMakeBoard(rows,colorCount,random,firstId=0){
 let grid=null,lastId=firstId;
 for(let attempt=0;attempt<32;attempt++){
  const g=sixEmpty(rows);let ok=true,id=firstId;
  outer:for(let r=0;r<rows;r++)for(let c=0;c<=r;c++){
   const tile={id:++id,color:0,number:null,lean:random()<.5?-1:1};g[r][c]=tile;let placed=false;
   for(const color of sixShuffle(Array.from({length:colorCount},(_,i)=>i),random)){
    tile.color=color;if(sixComponents(g).every(p=>p.cells.length<4)){placed=true;break;}
   }
   if(!placed){ok=false;break outer;}
  }
  if(ok){grid=g;lastId=id;break;}
 }
 if(!grid){const palette=sixShuffle(Array.from({length:colorCount},(_,i)=>i),random);grid=sixEmpty(rows);for(let r=0;r<rows;r++)for(let c=0;c<=r;c++)grid[r][c]={id:++lastId,color:palette[(r+c)%colorCount],number:null,lean:c<r/2?-1:1};}
 const spots=sixShuffle(grid.flat(),random),numbers=sixShuffle(Array.from({length:25},(_,i)=>i+1),random);numbers.forEach((n,i)=>spots[i].number=n);
 if(sixResolve(grid).cells.length)throw Error('Initial board contains a connected group or role');
 return {grid,lastId};
}
class SixBallCandyEngine extends Engine{
 reset(){
  this.kind='candy';this.gameName='シックスキャンディ';this.drawMode='single';this.reachMode='single';this.rows=[7,8,9,10].includes(this.rows)?this.rows:10;
  this.version++;this.presentationRate=1;this.roundBet=this.roundBet||3000;this.queue=[];this.pendingDraws=new Set();this.seen=new Set();this.drawn=new Set();this.history=[];
  this.accepted=0;this.processed=0;this.busy=false;this.running=false;this.opening=false;this.paused=false;this.transitionPending=false;
  this.totalHundredths=0;this.maxLink=0;this.maxChain=0;this.lastChain=0;this.allClears=0;this.roundSteps=0;this.roundHammers=0;this.roundCleared=0;
  this.wonderCollected=false;this.wonderIssued=false;this.wonderToken=null;this.wonderColumn=0;this.pendingSugarAward=[];
  this.basketState=Array.from({length:SIZE},()=>({goal:10,remaining:10,weight:0,pending:[]}));this.hammerQueue=[];this.hammerPreview=Array.from({length:65},()=>[]);this.hammerPreviewVersion=0;
  this.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));this.pyramid=sixEmpty(this.rows);this.initialPyramid=null;
  this.roundIndex=1;this.roundsCleared=0;this.sixColorCount=5;this.boardGeneration=0;
  this.triangles=0;this.hexagons=0;this.lines=0;this.shapes=0;this.bestCascade=0;this.cascade=0;this.removedCandies=0;this.remainingCandies=this.rows*(this.rows+1)/2;this.pyramidCleared=false;this.lastGain=0;this.lastNumber=0;this.fx=null;
  this.candyMessage='役をそろえて次のRoundへ！';this.emit('ready');
 }
 setRows(rows){if(this.running||![7,8,9,10].includes(rows))return false;this.rows=rows;this.reset();return true;}
 colorsForRound(n){return Math.min(this.colorCount||5,n>=5?3:n>=3?4:5);}
 newBoard(){
  this.sixColorCount=this.colorsForRound(this.roundIndex);const made=sixMakeBoard(this.rows,this.sixColorCount,this.random,this.uid);this.uid=made.lastId;this.pyramid=made.grid;this.initialPyramid=sixClone(this.pyramid);this.boardGeneration++;this.remainingCandies=sixCount(this.pyramid);this.pyramidCleared=false;
 }
 start(){if(this.running||this.roundBet<=0)return;this.newBoard();this.running=true;this.opening=false;this.busy=false;this.candyMessage='Round '+this.roundIndex+'・番号HITでキャンディを落とそう';this.emit('waiting');}
 reachSnapshot(){return Object.assign(Object.create(SixBallCandyEngine.prototype),{pyramid:sixClone(this.pyramid),drawn:new Set(this.drawn),totalHundredths:this.totalHundredths,initialPyramid:!!this.initialPyramid,rows:this.rows,boardGeneration:this.boardGeneration});}
 predict(number){if(!this.initialPyramid||this.drawn.has(number))return null;const p=sixPlan(this.pyramid,[number]);return {number,total:this.totalHundredths+p.gain,gain:p.gain,maxLink:0,chain:p.chain,allClear:p.cleared,tier:reachTier(this.totalHundredths+p.gain,p.cleared),triangles:p.triangles,hexagons:p.hexagons,lines:p.lines};}
 async drain(){
  if(this.busy)return;const token=this.version;this.busy=true;
  try{
   while(this.queue.length&&token===this.version){
    const numbers=this.queue.shift();for(const n of numbers){this.pendingDraws.delete(n);this.drawn.add(n);}this.lastNumber=numbers.at(-1);this.cascade=0;this.lastGain=0;
    const plan=sixPlan(this.pyramid,numbers,{trace:true});
    for(const stage of plan.timeline){
     if(token!==this.version)return;this.pyramid=sixClone(stage.grid);this.remainingCandies=sixCount(this.pyramid);this.fx={...stage,elapsed:0,stamp:null};this.cascade=stage.chain||this.cascade;
     if(stage.phase==='pyramidHit')this.candyMessage=numbers.join('・')+'番 HIT！';
     if(stage.phase==='pyramidMiss')this.candyMessage='この番号は消去済み・次の番号を待とう';
     if(stage.phase==='pyramidFall')this.candyMessage='支えに沿って、ころころ落下！';
     if(stage.phase==='pyramidShape')this.candyMessage=stage.forms.length?'役が完成！ '+stage.chain+'連鎖':stage.cells.length+'個つながった！ '+stage.chain+'連鎖';
     if(stage.phase==='pyramidAward'){
      this.totalHundredths+=stage.gain;this.lastGain=stage.gain;this.triangles+=stage.triangles;this.hexagons+=stage.hexagons;this.lines+=stage.lines;this.shapes=this.triangles+this.hexagons+this.lines;this.bestCascade=Math.max(this.bestCascade,stage.chain);
     }
     if(stage.phase==='pyramidAllClear'){this.totalHundredths+=SIX_PAY.allClear;this.lastGain=SIX_PAY.allClear;this.allClears++;this.candyMessage='ALL CLEAR！ 60倍ボーナス！';}
     this.emit(stage.phase,{numbers,...stage});if(!await this.wait(stage.ms*this.speed,token))return;
    }
    this.pyramid=sixClone(plan.grid);this.remainingCandies=sixCount(this.pyramid);this.removedCandies+=plan.removedCount;this.pyramidCleared=plan.cleared;this.processed+=numbers.length;this.fx=null;
    if(plan.advance)this.roundsCleared++;this.transitionPending=plan.advance&&this.processed<8;
    this.candyMessage=plan.advance?'Round '+this.roundIndex+' CLEAR！':plan.chain?'連結消去・次の番号で役をねらおう':'次の番号で役をねらおう';
    this.emit('settled',{numbers,candy:true,batchShapes:plan.triangles+plan.hexagons+plan.lines,batchChain:plan.chain,batchGain:plan.gain});
    if(!await this.wait((plan.chain||plan.advance?MINI_RESULT_MS:150)*this.speed,token))return;
    if(this.transitionPending){
     this.fx={phase:'pyramidRound',nextRound:this.roundIndex+1,elapsed:0,stamp:null,ms:650};this.emit('pyramidRound',{nextRound:this.roundIndex+1});if(!await this.wait(650*this.speed,token))return;
     this.roundIndex++;this.newBoard();this.fx={phase:'pyramidReady',elapsed:0,stamp:null,ms:400};this.candyMessage='Round '+this.roundIndex+'・'+this.sixColorCount+'色にチャレンジ！';this.emit('pyramidReady');if(!await this.wait(400*this.speed,token))return;
     this.fx=null;this.transitionPending=false;this.emit('settled',{numbers,candy:true,newBoard:true});
    }
   }
   if(token!==this.version)return;
   if(this.processed===8){
    if(this.hexagons>0&&!this.wonderCollected){this.wonderCollected=true;this.wonderIssued=true;this.roundSteps=1;this.wonderToken={id:'six-candy-'+this.version,value:this.roundBet,tier:wonderTier(this.roundBet)};this.emit('stepcollect',{steps:[this.wonderToken]});this.emit('sugaraward',{steps:[this.wonderToken]});if(!await this.wait(SUGAR_GET_WAIT*this.speed*(this.presentationRate||1),token))return;}
    this.busy=false;this.running=false;this.candyMessage='Round '+this.roundIndex+'・⬡ '+this.hexagons+' / △ '+this.triangles+' / LINE '+this.lines;this.emit('complete');
   }else{this.busy=false;this.emit('waiting');}
  }catch(error){if(token===this.version){this.busy=false;this.running=false;this.emit('error',{message:error.message});}}
 }
}
const CandyCarnivalEngine=SixBallCandyEngine;

const sixSprites=new Map();
function sixCandySprite(color){
 if(sixSprites.has(color))return sixSprites.get(color);const p=SIX_COLORS[color],cv=document.createElement('canvas');cv.width=96;cv.height=96;const x=cv.getContext('2d');
 const g=x.createRadialGradient(30,22,2,49,50,46);g.addColorStop(0,p.light);g.addColorStop(.34,p.color);g.addColorStop(1,p.dark);x.fillStyle=g;x.beginPath();x.arc(48,47,43,0,Math.PI*2);x.fill();x.strokeStyle=p.dark;x.lineWidth=3;x.stroke();
 x.save();x.clip();x.strokeStyle='#fff8e66e';x.lineWidth=7;
 if(color%3===0){x.beginPath();for(let i=0;i<100;i++){const a=i*.19,r=i*.48;i?x.lineTo(48+Math.cos(a)*r,47+Math.sin(a)*r):x.moveTo(48,47);}x.stroke();}
 else if(color%3===1){for(let k=-60;k<140;k+=22){x.beginPath();x.moveTo(k,0);x.lineTo(k+90,96);x.stroke();}}
 else{for(const r of [17,31,41]){x.beginPath();x.arc(48,47,r,0,7);x.stroke();}}
 x.restore();x.fillStyle='#fff9e9bf';x.beginPath();x.ellipse(31,20,16,7,-.4,0,7);x.fill();x.strokeStyle='#fff8daaa';x.lineWidth=1.5;x.beginPath();x.arc(48,47,40,-2.9,-.6);x.stroke();sixSprites.set(color,cv);return cv;
}
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
function setupCarnivalSlot(s){
 if(s.candyCanvas)return;s.panel.classList.add('carnival-panel','six-ball-panel');s.tab.classList.add('carnival-tab');s.holder.classList.add('carnival-slot');
 s.tab.querySelector('.tab-game-name').innerHTML='<span class="carnival-tab-title six-candy-wordmark">シックスキャンディ<small>SIX CANDY</small></span>';s.tab.querySelector('.tab-game-name').setAttribute('aria-label','シックスキャンディ');
 const wrap=document.createElement('div');wrap.className='carnival-surface six-ball-surface';wrap.innerHTML='<div class="carnival-topline"><span class="six-round-label">Round 1</span><label class="six-rows-control">段数 <select aria-label="シックスキャンディの段数・デバッグ用" id="six-row-select"><option value="7">7段</option><option value="8">8段</option><option value="9">9段</option><option value="10" selected>10段</option></select></label></div><canvas class="carnival-canvas" width="640" height="640" role="img" aria-label="キャンディピラミッド"></canvas><div class="carnival-status" role="status"></div><div class="carnival-reward" role="status" hidden></div>';
 s.panel.append(wrap);s.candyCanvas=wrap.querySelector('canvas');s.candyCtx=s.candyCanvas.getContext('2d');s.candyStatus=wrap.querySelector('.carnival-status');s.candyReward=wrap.querySelector('.carnival-reward');s.rowSelect=wrap.querySelector('select');s.roundLabel=wrap.querySelector('.six-round-label');
 s.rowSelect.onchange=()=>{if(!app||app.phase!=='ready'){s.rowSelect.value=String(s.engine.rows);return;}if(s.engine.setRows(Number(s.rowSelect.value))){s.candyKey='';s.dirtyMain=s.dirtyMini=true;invalidateReach(s);scheduleUI(app);}};
 const heading=document.createElement('div');heading.id='carnival-heading';heading.innerHTML='<strong class="six-candy-wordmark">シックスキャンディ<small>SIX CANDY · SWEET PUZZLE</small></strong><span>Round <b id="carnival-complete">1</b></span>';document.querySelector('.festival-top').append(heading);
 const odds=document.createElement('div');odds.id='carnival-odds';odds.innerHTML='<div class="carnival-odds-title">SIX CANDY<small>役ごとに配当を累積</small></div><section><span>今回の獲得</span><b id="carnival-win">0</b><em>WIN</em></section>'+[['hexagon','ヘキサゴン','0.5 / 1.0 / 1.5…'],['triangle','トライアングル','0.3 / 0.6 / 0.9…'],['line','直線 4個以上','0.1 / 0.2 / 0.3…']].map(([type,label,table])=>'<div class="six-pay-track" data-role="'+type+'">'+sixShapeIcon(type)+'<span>'+label+'<small>'+table+'倍</small><b>0役・0倍</b></span></div>').join('')+'<div class="six-clear-bonus">ALL CLEAR <b>60 × BET</b></div><div class="carnival-sugar-goal">ヘキサゴン完成で<br><b>シュガーGET</b></div><p>4個以上の連結も消去<br>通常連結だけは配当なし<br>役の連鎖終了で次Roundへ</p><footer>Round 3：4色 / Round 5：3色<br>0 BETは参加なし</footer>';$('odds-panel').append(odds);
}
function carnivalEvent(s,ev,e,a){
 setupCarnivalSlot(s);s.event=ev;s.dirtyMain=true;s.dirtyMini=true;
 if(['ready','error'].includes(ev.phase)){stopSugarAward(s);clearMiniResult(s);s.candyReward.hidden=true;if(s.candyFrame)cancelAnimationFrame(s.candyFrame);s.candyFrame=0;s.candyLastDraw=0;invalidateReach(s);}
 if(ev.phase==='sugaraward')showSugarAward(s,ev.steps);
 if(ev.phase.startsWith('pyramid')){s.candyReward.hidden=true;s.candyReward.classList.remove('six-round-callout');invalidateReach(s);}
 if(ev.phase==='pyramidRound'){
  clearMiniResult(s);s.candyReward.hidden=false;s.candyReward.classList.add('six-round-callout');s.candyReward.dataset.tier='1';s.candyReward.innerHTML='<small>ROUND CLEAR!</small><strong>Round '+ev.nextRound+'</strong><span>次のキャンディピラミッドへ</span>';
 }
 if(ev.phase==='pyramidAward'||ev.phase==='pyramidAllClear'){
  const gain=ev.gain||0;s.candyReward.hidden=!gain;s.candyReward.dataset.tier=gain>=1000?'2':gain>=300?'1':'0';
  if(gain){const title=ev.phase==='pyramidAllClear'?'ALL CLEAR BONUS!':[ev.hexagons?'HEXAGON ×'+ev.hexagons:'',ev.triangles?'TRIANGLE ×'+ev.triangles:'',ev.lines?'LINE ×'+ev.lines:''].filter(Boolean).join(' + ');s.candyReward.innerHTML='<small>'+title+'</small><strong>＋'+num(medalWin(a.bet(s.i),gain))+' <em>WIN</em></strong><span>'+num(gain/100)+' × BET</span>';if(s.i===active)sound('confirm',{volume:1});}
 }
 if(['pyramidBreak','pyramidAward'].includes(ev.phase)&&s.i===active)sound('crack',{volume:.75});
 if(ev.phase==='pyramidShape'&&s.i===active)sound('magic',{volume:.6});
 if(ev.phase==='settled'){
  s.candyReward.hidden=true;clearMiniResult(s);
  if(ev.batchChain>0||ev.batchShapes>0){s.miniLastResult=(ev.batchShapes||0)+'役 · '+(ev.batchChain||0)+'連鎖';s.miniResult.innerHTML='<strong>'+(ev.batchShapes||0)+' SHAPES</strong><small>'+(ev.batchChain||0)+'連鎖</small>';s.miniResultState={remaining:MINI_RESULT_MS,stamp:null,version:e.version};}
 }
 if(['waiting','settled','complete'].includes(ev.phase))requestReach(s,e,a);
 s.message=e.candyMessage;carnivalQueueFrame(s);scheduleUI(a);
}
function carnivalQueueFrame(s){if(s.candyFrame||document.hidden||!inView)return;const version=s.engine.version;s.candyFrame=requestAnimationFrame(now=>{s.candyFrame=0;if(s.engine.version!==version)return;if(s.candyLastDraw&&now-s.candyLastDraw<32){carnivalQueueFrame(s);return;}s.candyLastDraw=now;drawCarnival(s,now);});}
const sixDemoCache=new Map();
function sixDemo(rows){if(!sixDemoCache.has(rows))sixDemoCache.set(rows,Array.from({length:rows},(_,r)=>Array.from({length:r+1},(_,c)=>({id:sixKey(r,c),number:null,color:(r+c)%5}))));return sixDemoCache.get(rows);}
function sixFallFrame(fx,progress){
 const steps=fx.steps||[];if(!steps.length)return {grid:fx.grid,moves:[],progress:1};const total=steps.reduce((n,f)=>n+f.ms,0);let t=Math.min(total,progress*total);
 for(let i=0;i<steps.length;i++){const f=steps[i];if(t<=f.ms||i===steps.length-1)return {grid:f.grid,moves:f.moves,progress:Math.min(1,t/f.ms)};t-=f.ms;}
 return {grid:fx.grid,moves:[],progress:1};
}
function drawCarnival(s,now=performance.now()){
 if(s.engine?.kind!=='candy')return;setupCarnivalSlot(s);const e=s.engine,x=s.candyCtx,paused=!app||app.paused||document.hidden||!inView,bet=app?.bet(s.i)||0,ready=app?.phase==='ready',rows=e.rows,layout=sixLayout(rows),fx=e.fx;
 if(!paused)s.candyTime=now;const time=s.candyTime||now;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,320,320);
 const progress=fx?(()=>{if(!paused){if(fx.stamp!==null)fx.elapsed+=Math.max(0,now-fx.stamp)*(e.presentationRate||1);fx.stamp=now;}else fx.stamp=null;return Math.min(1,fx.elapsed/Math.max(1,fx.ms));})():0;
 const fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,motionReduced?1:progress):null,grid=ready?sixDemo(rows):fall?.grid||e.pyramid,moving=new Map((fall?.moves||[]).map(m=>[m.id,m]));
 const bg=x.createLinearGradient(0,0,320,320);bg.addColorStop(0,'#493955');bg.addColorStop(.55,'#674257');bg.addColorStop(1,'#35445f');x.fillStyle=bg;x.fillRect(0,0,320,320);
 // Candy-stick rails and lollipops frame an uncluttered playable triangle.
 for(const side of [8,312]){x.save();x.beginPath();x.roundRect(side-4,30,8,254,4);x.clip();x.fillStyle='#fff4df';x.fillRect(side-4,30,8,254);x.strokeStyle='#f18bb4';x.lineWidth=6;for(let y=20;y<290;y+=18){x.beginPath();x.moveTo(side-10,y);x.lineTo(side+10,y+14);x.stroke();}x.restore();}
 for(const [px,py,color] of [[14,17,0],[306,17,3]]){x.drawImage(sixCandySprite(color),px-12,py-12,24,24);}
 x.fillStyle='#f9daab';x.beginPath();x.roundRect(13,285,294,8,4);x.fill();
 x.strokeStyle='#eec7a01e';x.lineWidth=1;for(let r=0;r<rows;r++){const a=sixXY(r,0,rows),b=sixXY(r,r,rows);x.beginPath();x.moveTo(a.x-layout.radius,a.y+layout.radius);x.lineTo(b.x+layout.radius,b.y+layout.radius);x.stroke();}
 const lit=new Set((fx?.phase==='pyramidHit'?fx.cells:[]).map(p=>sixKey(...p))),shaped=new Set((fx?.forms||[]).flatMap(f=>f.cells).map(p=>sixKey(...p))),byNumber=new Map((ready?[]:visibleReachResults(s,app)).map(p=>[p.number,p]));
 for(let r=0;r<grid.length;r++)for(let c=0;c<=r;c++){
  const t=grid[r][c];if(!t)continue;let pos=sixXY(r,c,rows);const m=moving.get(t.id);
  if(m&&!motionReduced){const p=sixMotionPoint(m,fall.progress);pos={x:160+p.x*layout.step,y:layout.top+p.y*layout.step};}
  const pending=t.number!=null&&(e.pendingDraws.has(t.number)||lit.has(sixKey(r,c))),reach=t.number!=null?byNumber.get(t.number):null,shape=shaped.has(sixKey(r,c)),radius=layout.radius;
  x.save();if(!ready&&pending)x.globalAlpha=motionReduced?1:.55+.45*(.5+.5*Math.sin(time/115));if(shape||reach){x.shadowBlur=shape?12:6;x.shadowColor=shape?'#ffe39a':reach.tier>=2?'#eb93ff':'#fff3b6';}
  x.drawImage(sixCandySprite(t.color),pos.x-radius,pos.y-radius,radius*2,radius*2);x.shadowBlur=0;
  if(!ready&&t.number!=null){const font=Math.max(11,layout.step*.41);x.fillStyle='#442141c8';x.beginPath();x.ellipse(pos.x,pos.y+1,font*(t.number>=10?.94:.68),font*.7,0,0,7);x.fill();sixText(x,String(t.number),pos.x,pos.y+1,font,'#fffdf4');}
  if(shape||pending||reach){x.strokeStyle=shape?'#fff6b3':pending?'#fff9e7':reach.tier>=2?'#f0a2ff':'#fff3b6';x.lineWidth=shape?2.3:1.5;x.beginPath();x.arc(pos.x,pos.y,radius,0,Math.PI*2);x.stroke();}x.restore();
 }
 if(fx?.phase==='pyramidShape')for(const form of fx.forms){const points=form.cells.map(p=>sixXY(...p,rows));x.save();x.strokeStyle=form.type==='hexagon'?'#edb3ff':form.type==='line'?'#83f5ef':'#ffec98';x.shadowColor=x.strokeStyle;x.shadowBlur=12;x.lineWidth=3;x.beginPath();if(form.type==='line'){x.moveTo(points[0].x,points[0].y);x.lineTo(points.at(-1).x,points.at(-1).y);}else{sixHull(points).forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();}x.stroke();x.restore();}
 sixText(x,'Round '+e.roundIndex+'  ·  '+(ready?5:e.sixColorCount)+' COLORS',160,19,12,'#fff3b9');
 if(fx?.removed&&progress<.75&&!motionReduced){const t=Math.min(1,progress/.75);x.save();x.globalAlpha=1-t;for(const v of fx.removed){const p=sixXY(v.r,v.c,rows);for(let k=0;k<4;k++){const a=v.tile.id*.7+k*Math.PI/2;x.save();x.translate(p.x+Math.cos(a)*t*24,p.y+Math.sin(a)*t*20+t*t*19);x.rotate(a+t*2);x.fillStyle=SIX_COLORS[v.tile.color].light;x.beginPath();x.moveTo(-3,-4);x.lineTo(5,-2);x.lineTo(2,5);x.lineTo(-4,2);x.closePath();x.fill();x.restore();}}x.restore();}
 sixText(x,'⬡ '+e.hexagons+'  △ '+e.triangles+'  LINE '+e.lines,17,307,10,'#ffdfb1','left');sixText(x,'残り '+(ready?rows*(rows+1)/2:e.remainingCandies),304,307,10,'#e3d9ff','right');
 if(!bet){x.fillStyle='#231b3ba8';x.fillRect(0,0,320,320);sixText(x,'0 BET',160,140,29);sixText(x,'BETして キャンディを落とそう',160,172,11);}
 s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
 s.candyCanvas.setAttribute('aria-label','シックスキャンディ・Round '+e.roundIndex+'、'+rows+'段、'+e.remainingCandies+'個、ヘキサゴン'+e.hexagons+'、トライアングル'+e.triangles+'、直線'+e.lines);
 s.candyStatus.textContent=!bet?'0 BET・このゲームは参加しません':ready?'1〜25は各1個・空白も使って役を作ろう！':e.candyMessage;
 if((fx||e.pendingDraws.size)&&!paused&&!jpcSession.active)carnivalQueueFrame(s);
}
function carnivalHud(a){
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;setupCarnivalSlot(s);const selected=active===2;document.body.classList.toggle('carnival-active',selected);s.tab.setAttribute('aria-label','シックスキャンディ・Round '+e.roundIndex+'・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 s.rowSelect.disabled=a.phase!=='ready';s.rowSelect.value=String(e.rows);s.roundLabel.textContent='Round '+e.roundIndex+' · '+(a.phase==='ready'?5:e.sixColorCount)+'色';
 if(selected){put('carnival-complete',e.roundIndex);fitGoldenNumber($('carnival-win'),num(medalWin(a.bet(2),e.totalHundredths)),23,80);for(const [role,count] of [['hexagon',e.hexagons],['triangle',e.triangles],['line',e.lines]]){const el=$('carnival-odds').querySelector('[data-role="'+role+'"] b');el.textContent=count+'役・'+num(count*SIX_PAY[role]/100)+'倍';}}
 const key=[e.version,e.phase,e.processed,e.rows,e.roundIndex,e.boardGeneration,e.remainingCandies,e.totalHundredths,a.bet(2),s.reachEpoch,s.reachStatus,a.paused,e.pendingDraws.size].join('/');if(s.candyKey!==key){s.candyKey=key;carnivalQueueFrame(s);}
}
