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
 close(port.dx,bottom?0:j<5?S:-S); close(port.dy,bottom?-1:-.5);
 close((first.x-port.x)*port.dy-(first.y-port.y)*port.dx,0);
 for(const [k,i] of port.line.entries()){
   const {x,y}=cells[i], dx=x-first.x, dy=y-first.y;
   close(dx*port.dx+dy*port.dy,k*(bottom?2*S:S));
   close(Math.abs(dx*port.dy-dy*port.dx),!bottom&&k%2?.5:0);
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
assert.equal(new Set(s.numbers).size,15);
assert.ok(s.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=25));
assert.ok(s.board.every(c=>c.color===0));
assert.ok(s.board.some(c=>c.bomb)&&s.board.some(c=>!c.bomb));
const misses=Array.from({length:25},(_,i)=>i+1).filter(n=>!s.numbers.includes(n));
const initialNumbers=s.numbers.slice();
const miss=E.draw(s,misses[0],random);
assert.deepEqual(s.numbers,initialNumbers);assert.equal(miss.newNumber,null);assert.deepEqual(s.drawn,[misses[0]]);
assert.equal(s.turn,1); assert.equal(miss.count,0); assert.deepEqual(miss.before,miss.after);
const lineIndex=s.allIndex===4?10:4, number=s.numbers[lineIndex];
s.board=s.board.map(c=>({...c,bomb:false}));
const clean=E.preview(s,number);
assert.equal(clean.count,ports[lineIndex].line.length);
const bomb=ports[lineIndex].line[3];
const bomb2=neighbors[bomb].find(j=>!ports[lineIndex].line.includes(j));
s.board[bomb].bomb=true; s.board[bomb2].bomb=true;
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
 for(const column of E.columns){
   const old=column.filter(i=>!gone.has(i)).map(i=>turn.before[i].id);
   assert.deepEqual(column.slice(column.length-old.length).map(i=>turn.after[i].id),old);
 }
 for(const m of turn.moves){
   assert.equal(m.x,cells[m.to].x);
   assert.ok(m.y<cells[m.to].y);
   if(m.from>=0) assert.equal(m.piece,turn.before[m.from]);
   assert.equal(m.piece,turn.after[m.to]);
 }
 assert.equal(new Set(turn.after.map(p=>p.id)).size,61);
}
validateGravity(result);
function verifyNumbers(state,trace){
 assert.deepEqual(state.numbers,trace.afterNumbers);
 assert.equal(new Set(state.numbers).size,15);
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
s.board=s.board.map((piece,i)=>({...piece,bomb:i===center}));
const firstAll=s.numbers[s.allIndex], master=E.draw(s,firstAll,random);
verifyNumbers(s,master);validateGravity(master);
assert.equal(master.clear,false);assert.equal(master.count,7);assert.equal(s.clears,0);
assert.deepEqual(master.waves[0],[center]);
assert.deepEqual(new Set(master.waves[1]),new Set(neighbors[center]));
s.board=s.board.map(piece=>({...piece,bomb:false}));
assert.equal(E.preview(s,master.newNumber).count,0);
const dry=E.draw(s,master.newNumber,random);
assert.equal(dry.port,s.allIndex);assert.ok(dry.all);assert.equal(dry.count,0);assert.deepEqual(dry.waves,[]);
verifyNumbers(s,dry);
assert.equal(E.draw(s,firstAll,random),null);assert.equal(s.turn,4);
assert.deepEqual([0,1,25,26,50,51,75,76,100,101,125,126,420].map(E.colorFor),[0,1,1,2,2,3,3,4,4,5,5,6,6]);
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
rich.board.forEach(c=>{c.bomb=true;});
const explosive=E.draw(rich,rich.numbers[(rich.allIndex+1)%15],random);
assert.ok(explosive.waves.length>1 && explosive.clear);
validateGravity(explosive);
const forced=E.create({rng:random});
forced.board.forEach(p=>{p.bomb=true;});
assert.ok(E.draw(forced,forced.numbers[forced.allIndex],random).clear);
console.log('Passed mirrored edge-normal rays, five vertical targets, bomb-only master ignition, hit-number rerolls, misses and repeats, cascade order, gravity, colors, payout, previews and 8-turn stop.');
