'use strict';
const assert=require('node:assert/strict');
const E=require('../../assets/popcorn-engine.js');
const {cells,ports,neighbors}=E;
assert.equal(cells.length,61);
assert.deepEqual([...new Set(cells.map(p=>p.y))].map(y=>cells.filter(p=>p.y===y).length),[5,6,7,8,9,8,7,6,5]);
assert.deepEqual(ports.map(p=>p.line.length),[9,8,7,6,5,9,8,7,6,5,9,8,7,6,5]);
assert.equal(ports.length,15);
assert.equal(new Set(ports.map(p=>p.line.join(','))).size,15);
assert.equal(neighbors[cells.findIndex(p=>p.q===0&&p.r===0)].length,6);
for (const port of ports){
 const first=cells[port.line[0]];
 for(const [k,i] of port.line.entries()){
   const {x,y}=cells[i]; assert.ok(Math.abs(x-first.x-k*port.dx)<1e-7);
   assert.ok(Math.abs(y-first.y-k*port.dy)<1e-7);
   assert.ok(Math.abs((x-port.x)*port.dy-(y-port.y)*port.dx)<1e-7);
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
const miss=E.draw(s,misses[0],random);
assert.equal(s.turn,1); assert.equal(miss.count,0); assert.deepEqual(miss.before,miss.after);
const lineIndex=s.allIndex===0?1:0, number=s.numbers[lineIndex];
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
assert.equal(result.waves.length,3);
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
const master=E.draw(s,s.numbers[s.allIndex],random);
assert.equal(master.clear,true);assert.equal(master.count,61);assert.equal(s.clears,1);validateGravity(master);
assert.deepEqual([0,1,25,26,50,51,75,76,100,101,125,126,420].map(E.colorFor),[0,1,1,2,2,3,3,4,4,5,5,6,6]);
for(let i=0;i<5;i++) validateGravity(E.draw(s,number,random));
assert.equal(s.turn,8); assert.equal(s.popped,s.refilled);
const ended=JSON.stringify(s);assert.ok(E.preview(s,s.numbers[s.allIndex]).count===61);
assert.equal(E.draw(s,number,random),null); assert.equal(JSON.stringify(s),ended);
const rich=E.create({rng:random});
rich.board.forEach(c=>{c.bomb=true;});
const explosive=E.draw(rich,rich.numbers[(rich.allIndex+1)%15],random);
assert.ok(explosive.waves.length>1 && explosive.clear);
validateGravity(explosive);
console.log('Passed geometry, rays, six-neighbor bomb cascades, no premature detonation, vertical fall, refill IDs/order/colors, misses, all-clear, immutable previews, eight-turn stop.');
