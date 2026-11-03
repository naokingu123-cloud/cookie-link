'use strict';
const assert=require('node:assert/strict');
const E=require('../../assets/popcorn-engine.js');
const {cells,ports,neighbors}=E;
assert.equal(cells.length,61);
assert.deepEqual([...new Set(cells.map(p=>p.y))].map(y=>cells.filter(p=>p.y===y).length),[5,6,7,8,9,8,7,6,5]);
assert.deepEqual(ports.map(p=>p.line.length),[5,6,7,8,9,5,5,5,5,5,9,8,7,6,5]);
assert.equal(ports.length,15);
assert.equal(new Set(ports.map(p=>p.line.join(','))).size,15);
assert.equal(neighbors[cells.findIndex(p=>p.q===0&&p.r===0)].length,6);
const S=Math.sqrt(3)/2, close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7);
for(const [j,port] of ports.entries()){
 const first=cells[port.line[0]], bottom=j>=5&&j<10;
 close(port.dx,bottom?0:j<5?.5:-.5); close(port.dy,bottom?-1:-S);
 close((first.x-port.x)*port.dy-(first.y-port.y)*port.dx,0);
 for(const [k,i] of port.line.entries()){
   const {x,y}=cells[i], dx=x-first.x, dy=y-first.y;
   close(dx*port.dx+dy*port.dy,k*(bottom?2*S:1));
   close(Math.abs(dx*port.dy-dy*port.dx),0);
   if(!bottom&&k) assert.ok(neighbors[port.line[k-1]].includes(i));
 }
 if(j<5){
   const right=ports[14-j]; close(port.x,-right.x); close(port.y,right.y);
   for(const [k,i] of port.line.entries()){
     close(cells[i].x,-cells[right.line[k]].x); close(cells[i].y,cells[right.line[k]].y);
   }
 }
}
let seed=48271;
const random=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/2**32;
const s=E.create({rng:random});
assert.equal(new Set(s.numbers).size,16);
assert.ok(s.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=25));
assert.equal(s.allIndex,15);
assert.ok(s.board.every(c=>Object.isFrozen(c)&&c.color===Number(c.bomb)&&c.bomb===(c.power>0)));
assert.ok(s.board.some(c=>c.bomb)&&s.board.some(c=>!c.bomb));
const misses=Array.from({length:25},(_,i)=>i+1).filter(n=>!s.numbers.includes(n));
const initialNumbers=s.numbers.slice();
const miss=E.draw(s,misses[0],random);
assert.deepEqual(s.numbers,initialNumbers);assert.equal(miss.newNumber,null);assert.deepEqual(s.drawn,[misses[0]]);
assert.equal(s.turn,1); assert.equal(miss.count,0); assert.deepEqual(miss.before,miss.after);
const lineIndex=4, number=s.numbers[lineIndex];
const setPower=(piece,power)=>Object.freeze({id:piece.id,bomb:power>0,power,color:Number(power>0)});
s.board=s.board.map(c=>setPower(c,0));
const clean=E.preview(s,number);
assert.equal(clean.count,ports[lineIndex].line.length);
const bomb=ports[lineIndex].line[3];
const bomb2=neighbors[bomb].find(j=>!ports[lineIndex].line.includes(j));
s.board[bomb]=setPower(s.board[bomb],1); s.board[bomb2]=setPower(s.board[bomb2],1);
const saved=JSON.stringify(s);
const expected=E.preview(s,number);
assert.equal(JSON.stringify(s),saved);
const result=E.draw(s,number,random);
assert.ok(result.waves.length>=2);
assert.deepEqual(result.waves[0],ports[lineIndex].line);
assert.equal(expected.count,result.count);assert.equal(expected.win,result.win);
for(const i of new Set([...ports[lineIndex].line,...neighbors[bomb],...neighbors[bomb2]]))assert.ok(result.waves.flat().includes(i));
assert.equal(new Set(result.waves.flat()).size,result.waves.flat().length);
function validateGravity(turn){
 const gone=new Set(turn.waves.flat());
 assert.ok([...gone].every(i=>turn.before[i]));
 assert.equal(gone.size,turn.count);
 assert.equal(turn.clear,turn.count>0&&turn.count===turn.before.filter(Boolean).length);
 let board=turn.before.map((p,i)=>gone.has(i)?null:p), added=[];
 function replay(step,feed){
   assert.deepEqual(step.before,board);
   const moving=new Set(step.moves.map(m=>m.from));
   const stationary=board.flatMap((p,i)=>p&&!moving.has(i)?[cells[i]]:[]);
   for(let k=0;k<=48;k++){
     const movingPoints=step.moves.map(m=>E.motionPoint(m,k/48));
     if(!feed)for(const {x,y} of movingPoints){
       const wall=Math.max(Math.abs(y),Math.abs(x)*S+Math.abs(y)/2);
       assert.ok(wall+.5<=1.045*4.6*S+1e-8);
     }
     const points=stationary.concat(movingPoints);
     for(let a=0;a<points.length;a++)for(let b=0;b<a;b++)
       assert.ok(Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y)>=.99999);
   }
   for(const m of step.moves){
     if(feed){
       assert.equal(m.from,-1);assert.equal(cells[m.to].r,-4);
       assert.equal(m.x,cells[m.to].x);assert.ok(m.y<-4.6);
       assert.deepEqual(E.motionPoint(m,0),{x:m.x,y:m.y});
       const end=E.motionPoint(m,1);close(end.x,cells[m.to].x);close(end.y,cells[m.to].y);
       added.push(m.piece);
     }else{
       assert.equal(board[m.from],m.piece);assert.ok(cells[m.to].y>cells[m.from].y);
       assert.equal(E.motionPoint(m,0),cells[m.from]);assert.equal(E.motionPoint(m,1),cells[m.to]);
     }
   }
   board=board.slice();
   if(!feed)for(const m of step.moves)board[m.from]=null;
   for(const m of step.moves){assert.equal(board[m.to],null);board[m.to]=m.piece;}
   assert.deepEqual(board,step.after);
 }
 for(const step of turn.fallSteps)replay(step,false);
 assert.deepEqual(board,turn.settled);assert.equal(E.settle(board).steps.length,0);
 for(const step of turn.refillSteps)replay(step,step.kind==='spawn');
 assert.deepEqual(board,turn.after);
 const live=board.filter(Boolean);
 assert.equal(new Set(live.map(p=>p.id)).size,live.length);
 assert.deepEqual(added,turn.moves.map(m=>m.piece));
 for(const m of turn.moves)assert.equal(board[m.to],m.piece);
 assert.equal(live.length,turn.before.filter(Boolean).length-turn.count+added.length);
 assert.ok(live.every(p=>Object.isFrozen(p)&&p.color===Number(p.bomb)&&p.bomb===(p.power>0)));
 assert.equal(E.settle(board).steps.length,0);
}
validateGravity(result);
function verifyNumbers(state,trace){
 assert.deepEqual(state.numbers,trace.afterNumbers);
 assert.equal(new Set(state.numbers).size,16);
 assert.ok(state.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=25&&!state.drawn.includes(n)));
 const changes=trace.beforeNumbers.map((n,i)=>n!==trace.afterNumbers[i]?i:-1).filter(i=>i>=0);
 assert.deepEqual(changes,trace.port<0?[]:[trace.port]);
 if(trace.port>=0){
   assert.equal(trace.beforeNumbers[trace.port],trace.oldNumber);
   assert.equal(trace.afterNumbers[trace.port],trace.newNumber);
 }
}
verifyNumbers(s,result);
const center=cells.findIndex(p=>p.q===0&&p.r===0);
s.board=E.create({rng:random}).board.map((piece,i)=>setPower(piece,Number(i===center)));
const firstAll=s.numbers[s.allIndex], master=E.draw(s,firstAll,random);
verifyNumbers(s,master);validateGravity(master);
assert.equal(master.clear,false);assert.equal(master.count,7);assert.equal(s.clears,0);
assert.deepEqual(master.waves[0],[center]);
assert.deepEqual(new Set(master.waves[1]),new Set(neighbors[center]));
s.board=s.board.map(piece=>piece?setPower(piece,0):null);
assert.equal(E.preview(s,master.newNumber).count,0);
const dry=E.draw(s,master.newNumber,random);
assert.equal(dry.port,s.allIndex);assert.ok(dry.all);assert.equal(dry.count,0);assert.deepEqual(dry.waves,[]);
verifyNumbers(s,dry);
assert.equal(E.draw(s,firstAll,random),null);assert.equal(s.turn,4);
assert.deepEqual(E.clearPay.map(a=>a[1]),[5,20,50,100,200,300,500,1000]);
assert.deepEqual(Array.from({length:9},(_,n)=>E.payout(0,n,1)),[0,5,25,75,175,375,675,1175,2175]);
while(s.turn<8){
 const cycle=E.draw(s,s.numbers[lineIndex],random);
 validateGravity(cycle);verifyNumbers(s,cycle);
}
assert.equal(s.turn,8);assert.equal(s.drawn.length,8);
const ended=JSON.stringify(s), next=s.numbers[s.allIndex];
const future=E.preview(s,next);
assert.ok(future.count>=0&&future.count<=61);
assert.equal(E.draw(s,next,random),null);assert.equal(JSON.stringify(s),ended);
const rich=E.create({rng:random});
rich.board=rich.board.map(c=>setPower(c,1));
const explosive=E.draw(rich,rich.numbers[(rich.allIndex+1)%15],random);
assert.ok(explosive.waves.length>1 && explosive.clear);
validateGravity(explosive);
const forced=E.create({rng:random});
forced.board=forced.board.map(c=>setPower(c,1));
assert.ok(E.draw(forced,forced.numbers[forced.allIndex],random).clear);
// Independently check hex radius by cube distance at all interior and edge cells.
for(const [i,a] of cells.entries()){
 const ring=cells.flatMap((b,j)=>{
   const q=b.q-a.q,r=b.r-a.r,d=Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
   return d>=1&&d<=2?[j]:[];
 });
 assert.deepEqual(new Set(E.radiusTwo[i]),new Set(ring));
}
const strong=E.create({rng:random});
strong.board=strong.board.map((c,i)=>setPower(c,i===center?2:0));
const wide=E.draw(strong,strong.numbers[strong.allIndex],random);
assert.equal(wide.count,19);assert.deepEqual(new Set(wide.waves[1]),new Set(E.radiusTwo[center]));
const relay=E.create({rng:random}), side=ports[4];
const remote=E.radiusTwo[center].find(i=>!side.line.includes(i)&&!neighbors[center].includes(i)&&neighbors[i].some(j=>!side.line.includes(j)&&!E.radiusTwo[center].includes(j)));
relay.board=relay.board.map((c,i)=>setPower(c,i===center?2:i===remote?1:0));
const chain=E.draw(relay,relay.numbers[4],random);
assert.ok(chain.waves[0].includes(center)&&chain.waves[1].includes(remote)&&chain.waves[2].length>0);
let bombs=0,enhanced=0;
for(let i=0;i<400;i++) for(const c of E.create({rng:random}).board){
 if(c.bomb){bombs++;if(c.power===2)enhanced++;}
}
assert.ok(enhanced/bombs>.02&&enhanced/bombs<.045);
// A lone support makes the kernel roll around it; two supports hold it in
// place. Empty tracks permit the same vertical two-row drop as Six Drop.
const idx=(q,r)=>cells.findIndex(c=>c.q===q&&c.r===r);
const single=Array(61).fill(null), upper=idx(0,3), lower=idx(0,4);
single[upper]=setPower({id:100},0); single[lower]=setPower({id:101},1);
const roll=E.settle(single);
assert.ok(roll.steps[0].moves.some(m=>m.from===upper&&m.to===idx(-1,4)&&m.path.pivot===lower));
single[idx(-1,4)]=setPower({id:102},0);assert.equal(E.settle(single).steps.length,0);
const empty=Array(61).fill(null);empty[center]=setPower({id:300},2);
assert.equal(E.settle(empty).steps[0].moves[0].to,idx(-1,2));
// A stable occupied roof cannot spawn replacement kernels into the void below.
const roof=E.create({rng:random});roof.board=roof.board.map(c=>setPower(c,0));
roof.board[center]=null;
const missNumber=state=>Array.from({length:25},(_,i)=>i+1).find(i=>!state.numbers.includes(i)&&!state.drawn.includes(i));
const roofTurn=E.draw(roof,missNumber(roof),random);
assert.equal(roofTurn.after[center],null);assert.equal(roofTurn.moves.length,0);
const ghost=E.draw(roof,roof.numbers[15],random);
assert.deepEqual(ghost.waves,[]);assert.equal(ghost.count,0);assert.equal(ghost.clear,false);
const sparse=E.create({rng:random});
const bottom=cells.findIndex(p=>p.r===4&&p.q===-2);
sparse.board=sparse.board.map((p,i)=>i===bottom?setPower(p,1):null);
assert.deepEqual(E.preview(sparse,sparse.numbers[15]).waves,[[bottom]]);
const sparseClear=E.draw(sparse,sparse.numbers[15],random);
assert.equal(sparseClear.clear,true);assert.equal(sparseClear.count,1);
assert.equal(sparseClear.after.filter(Boolean).length,61);validateGravity(sparseClear);
const vacantLane=E.create({rng:random}),lane=E.ports[1].line;
vacantLane.board=vacantLane.board.map((p,i)=>lane.includes(i)?null:p);
assert.deepEqual(E.preview(vacantLane,vacantLane.numbers[1]).waves,[]);
assert.equal(E.draw(vacantLane,vacantLane.numbers[1],random).count,0);
const open=E.create({rng:random});open.board[2]=null;
const topMiss=E.draw(open,missNumber(open),random);
assert.equal(topMiss.port,-1);assert.equal(topMiss.count,0);assert.equal(topMiss.moves.length,1);validateGravity(topMiss);
let survivingHoles=0;
for(let game=0;game<25;game++){
 const state=E.create({rng:random});
 for(let draw=0;draw<8;draw++){
   const number=draw%4===0?state.numbers[15]:state.numbers[(game+draw)%15];
   const prediction=E.preview(state,number),t=E.draw(state,number,random);
   assert.deepEqual(prediction.waves,t.waves);assert.equal(t.clear,prediction.clear);
   const occupied=state.board.filter(Boolean).length;
   if(occupied<61)survivingHoles++;
   assert.equal(occupied,61+state.refilled-state.popped);
   assert.ok(t.waves.flat().every(i=>t.before[i]));
   if(game<2)validateGravity(t);
 }
}
assert.ok(survivingHoles>0);
console.log('Passed 16 igniters, sparse-board previews, sealed pockets, top-only entry and motion replay, occupied-only clears, no ghost hits, collision-safe gravity and eight-turn accounting.');
