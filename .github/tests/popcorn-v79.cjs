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
 let board=turn.before.map((p,i)=>gone.has(i)?null:p);
 for(const step of turn.fallSteps){
   assert.deepEqual(step.before,board);
   const moving=new Set(step.moves.map(m=>m.from));
   const stationary=board.flatMap((p,i)=>p&&!moving.has(i)?[cells[i]]:[]);
   for(let k=0;k<=16;k++){
     const points=stationary.concat(step.moves.map(m=>E.motionPoint(m,k/16)));
     for(let a=0;a<points.length;a++)for(let b=0;b<a;b++)
       assert.ok(Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y)>=.99999);
   }
   for(const m of step.moves){
     assert.equal(board[m.from],m.piece);assert.ok(cells[m.to].y>cells[m.from].y);
     assert.equal(E.motionPoint(m,0),cells[m.from]);assert.equal(E.motionPoint(m,1),cells[m.to]);
   }
   board=board.slice();
   for(const m of step.moves)board[m.from]=null;
   for(const m of step.moves){assert.equal(board[m.to],null);board[m.to]=m.piece;}
   assert.deepEqual(board,step.after);
 }
 assert.deepEqual(board,turn.settled);assert.equal(E.settle(board).steps.length,0);
 board=board.slice();
 for(const m of turn.moves){
   assert.equal(m.from,-1);assert.equal(board[m.to],null);assert.ok(m.y<-4.6);
   assert.equal(m.x,cells[m.to].x);board[m.to]=m.piece;
 }
 assert.deepEqual(board,turn.after);
 assert.equal(new Set(turn.after.map(p=>p.id)).size,61);
 assert.ok(turn.after.every(p=>Object.isFrozen(p)&&p.color===Number(p.bomb)&&p.bomb===(p.power>0)));
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
s.board=s.board.map((piece,i)=>setPower(piece,Number(i===center)));
const firstAll=s.numbers[s.allIndex], master=E.draw(s,firstAll,random);
verifyNumbers(s,master);validateGravity(master);
assert.equal(master.clear,false);assert.equal(master.count,7);assert.equal(s.clears,0);
assert.deepEqual(master.waves[0],[center]);
assert.deepEqual(new Set(master.waves[1]),new Set(neighbors[center]));
s.board=s.board.map(piece=>setPower(piece,0));
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
assert.equal(s.turn,8);assert.equal(s.popped,s.refilled);assert.equal(s.drawn.length,8);
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
console.log('Passed mirrored diagonal and vertical lanes, independent 16th ALL, regular/enhanced cascades, two-color pieces, successive clear prizes, number rerolls, Six Drop motion and staged refill, previews and eight-turn stop.');
