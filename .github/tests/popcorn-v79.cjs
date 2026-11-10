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
assert.equal(new Set(s.numbers).size,17);
assert.ok(s.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=25));
assert.equal(s.allIndex,15);assert.equal(s.boostIndex,16);assert.equal(s.level,1);
assert.ok(s.board.every(c=>Object.isFrozen(c)&&c.color===c.power&&c.bomb===(c.power>0)));
assert.ok(s.board.some(c=>c.bomb)&&s.board.some(c=>!c.bomb));
const misses=Array.from({length:25},(_,i)=>i+1).filter(n=>!s.numbers.includes(n));
const initialNumbers=s.numbers.slice();
const miss=E.draw(s,misses[0],random);
assert.deepEqual(s.numbers,initialNumbers);assert.equal(miss.newNumber,null);assert.deepEqual(s.drawn,[misses[0]]);
assert.equal(s.turn,1); assert.equal(miss.count,0); assert.deepEqual(miss.before,miss.after);
const lineIndex=4, number=s.numbers[lineIndex];
const setPower=(piece,power)=>Object.freeze({id:piece.id,bomb:power>0,power,color:power});
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
 assert.ok(live.every(p=>Object.isFrozen(p)&&p.color===p.power&&p.bomb===(p.power>0)));
 assert.equal(E.settle(board).steps.length,0);
}
validateGravity(result);
function verifyNumbers(state,trace){
 assert.deepEqual(state.numbers,trace.afterNumbers);
 assert.equal(new Set(state.numbers).size,17);
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
assert.deepEqual(E.clearPay.map(([,award])=>award),[1,3,20,50,200,500,1000,2000]);
assert.deepEqual(E.popPay[0],[120,.1]);
let clearSum=0;
for(const [n,award] of E.clearPay){
 clearSum+=award;
 assert.equal(E.payout(0,n,1),clearSum);
}
const first=E.popPay[0][0], levels=[.1,.2,.3,.4,.5,.6,.7,.8,.9,1,1.2,1.4,1.6,1.8,2,2.5,3,3.5,4,4.5,5,6,7,8,9,10,12.5,15,17.5,20,22.5,25,27.5,30,35,40,45,50,55,60,65,70];
assert.equal(E.payout(first-1,0),0);
for(const [i,odds] of levels.entries()){
 assert.equal(E.payout(first+10*i,0),Math.round(odds*100));
 assert.equal(E.payout(first+10*i+9,0),Math.round(odds*100));
}
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
// A radius-three blast crosses three real hex rings and clips cleanly to an edge.
for(const [i,a] of cells.entries()){
 const bubble=cells.flatMap((b,j)=>{
   const q=b.q-a.q,r=b.r-a.r,d=Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
   return d>=1&&d<=3?[j]:[];
 });
 assert.deepEqual(new Set(E.radiusThree[i]),new Set(bubble));
}
const purple=E.create({rng:random});
purple.board=purple.board.map((p,i)=>setPower(p,Number(i===center)*3));
const big=E.draw(purple,purple.numbers[15],random);
assert.equal(big.count,37);assert.deepEqual(new Set(big.waves[1]),new Set(E.radiusThree[center]));
// The two diagonal axes and the horizontal row all reach their board edges.
for(const [i,a] of cells.entries()){
 const axes=E.lightningAxes[i];
 assert.ok(axes.every(line=>line.includes(i)));
 for(const [axis,line] of axes.entries()){
   const match=[b=>b.q===a.q,b=>b.r===a.r,b=>b.q+b.r===a.q+a.r][axis];
   assert.deepEqual(line,cells.flatMap((b,j)=>match(b)?[j]:[]));
 }
 const combined=[...new Set(axes.flat())].filter(j=>j!==i);
 assert.deepEqual(new Set(E.blastAreas[4][i]),new Set(combined));
 assert.equal(E.blastAreas[5][i].length,60);
 assert.ok(!E.blastAreas[5][i].includes(i));
}
const lightning=E.create({rng:random});
const cellAt=(q,r)=>cells.findIndex(c=>c.q===q&&c.r===r);
const receiver=cellAt(4,0),gap=cellAt(2,0),verticalOnly=cellAt(2,-4);
assert.deepEqual(E.lightningAxes[center].map(axis=>axis.length),[9,9,9]);
assert.equal(E.blastAreas[4][center].length,24);
assert.ok(E.blastAreas[4][center].includes(receiver)&&!E.blastAreas[4][center].includes(verticalOnly));
lightning.board=lightning.board.map((p,i)=>i===gap?null:setPower(p,i===center?4:i===receiver?2:0));
const arc=E.draw(lightning,lightning.numbers[4],random);
assert.ok(arc.waves[0].includes(center)&&arc.waves[1].includes(receiver));
assert.ok(!arc.waves.flat().includes(gap)&&arc.waves.length>=3);
assert.ok(arc.waves[2].some(j=>E.radiusTwo[receiver].includes(j)&&!E.blastAreas[4][center].includes(j)));
assert.equal(new Set(arc.waves.flat()).size,arc.count);
const rainbow=E.create({rng:random});
rainbow.board=rainbow.board.map((p,i)=>i===gap?null:setPower(p,i===center?4:i===receiver?5:0));
const savedRainbow=JSON.stringify(rainbow),futureRainbow=E.preview(rainbow,rainbow.numbers[4]);
assert.equal(JSON.stringify(rainbow),savedRainbow);
const jackpot=E.draw(rainbow,rainbow.numbers[4],random);
assert.deepEqual(jackpot.waves,futureRainbow.waves);
assert.ok(jackpot.clear&&jackpot.count===60&&rainbow.clears===1);
assert.ok(jackpot.waves[1].includes(receiver)&&jackpot.waves.length===3);
const untouched=E.create({rng:random});
untouched.board=untouched.board.map((p,i)=>setPower(p,i===receiver?5:0));
assert.equal(E.preview(untouched,untouched.numbers[4]).count,ports[4].line.length);
assert.equal(E.preview(untouched,untouched.numbers[15]).count,61);
untouched.board=untouched.board.map((p,i)=>setPower(p,i===center?5:0));
const directRainbow=E.draw(untouched,untouched.numbers[4],random);
assert.ok(directRainbow.clear&&!directRainbow.all&&directRainbow.waves[0].includes(center));
assert.equal(directRainbow.count,61);assert.equal(untouched.clears,1);
const kinds=E.create({rng:random});
kinds.board=kinds.board.map((p,i)=>setPower(p,i<5?i+1:0));
const allKinds=E.draw(kinds,kinds.numbers[15],random);
assert.deepEqual(allKinds.waves[0],[0,1,2,3,4]);assert.equal(allKinds.count,61);assert.equal(kinds.clears,1);
// The specified values are percentages of ALL new kernels, not only bombs.
const exactPercent=[
 [78.9,15,3,2,1,.1],[68.35,22.5,4.5,3,1.5,.15],
 [52.525,33.75,6.75,4.5,2.25,.225],[28.7875,50.625,10.125,6.75,3.375,.3375],
 [0,69.11875,15.1875,10.125,5.0625,.50625],
 [0,53.678125,22.78125,15.1875,7.59375,.759375],
 [0,30.5171875,34.171875,22.78125,11.390625,1.1390625],
 [0,0,47.03359375,34.171875,17.0859375,1.70859375],
 [0,0,20.550390625,51.2578125,25.62890625,2.562890625]
];
exactPercent.forEach((row,index)=>{
 const law=E.probabilitiesForLevel(index+1);close(law.reduce((sum,p)=>sum+p),1);
 let cursor=0;
 for(let power=5;power>=0;power--){
   close(law[power]*100,row[power]);
   if(law[power])assert.equal(E.powerForRoll(cursor+law[power]/2,law),power);
   cursor+=law[power];
 }
});
// Opening boards are selected from authored symmetric, immediately-clearable templates.
assert.equal(E.initialPatterns.length,8);
const coord=new Map(cells.map((c,i)=>[c.q+','+c.r,i]));
const reflect=i=>{const c=cells[i];return coord.get((-c.q-c.r)+','+c.r);};
const rotate180=i=>{const c=cells[i];return coord.get((-c.q)+','+(-c.r));};
for(const pattern of E.initialPatterns){
 assert.equal(pattern.powers.length,61);
 const transform=pattern.symmetry==='mirror'?reflect:rotate180;
 for(let i=0;i<61;i++)assert.equal(pattern.powers[i],pattern.powers[transform(i)],pattern.name+' symmetry');
 const state=E.create({rng:seededPattern(pattern.name.length),rate:90});
 state.board=pattern.powers.map((power,i)=>setPower({id:i},power));
 state.numbers=Array.from({length:17},(_,i)=>i+1);state.drawn=[];state.turn=0;state.popped=state.clears=state.win=0;
 for(const port of pattern.clearPorts)assert.ok(E.preview(state,port+1).clear,pattern.name+' opening clear '+port);
}
function seededPattern(n){return()=>((n=Math.imul(n+17,1664525)+1013904223|0)>>>0)/2**32;}
const boosts=E.create({rng:random}),original=boosts.board.slice();
for(let ball=1;ball<=8;ball++){
 const hit=boosts.numbers[16],before=JSON.stringify(boosts),v=E.preview(boosts,hit);
 assert.equal(JSON.stringify(boosts),before);assert.ok(v.boost);assert.deepEqual(v.waves,[]);
 assert.deepEqual([v.oldLevel,v.newLevel,v.count,v.win,v.clear],[ball,ball+1,0,0,false]);
 const candidates=Array.from({length:25},(_,i)=>i+1).filter(i=>!boosts.drawn.includes(i)&&!boosts.numbers.includes(i));
 assert.equal(candidates.length,9-ball);
 const trace=E.draw(boosts,hit,random);
 assert.ok(trace.boost&&!trace.all&&!trace.clear&&!trace.sugarCrossed);
 assert.deepEqual([trace.oldLevel,trace.newLevel,boosts.level,trace.count],[ball,ball+1,ball+1,0]);
 assert.deepEqual(trace.waves,[]);assert.deepEqual(boosts.board,original);verifyNumbers(boosts,trace);
 assert.ok(candidates.includes(trace.newNumber));
 if(ball===8)assert.equal(trace.newNumber,candidates[0]);
}
const inlet=E.create({rng:random});inlet.board[2]=null;
assert.equal(E.powerForRoll(.25,E.probabilitiesForLevel(1)),0);
const raised=E.draw(inlet,inlet.numbers[16],()=>.25);
assert.equal(raised.count,0);assert.equal(raised.oldLevel,1);assert.equal(raised.newLevel,2);
assert.equal(raised.moves.length,1);assert.equal(raised.moves[0].piece.power,1);
for(let i=0;i<61;i++)if(i!==2)assert.equal(raised.before[i],raised.after[i]);
const stage=E.create({rng:random}),targetAtStart=stage.sugarTarget;
assert.equal(targetAtStart%10,0);
stage.board=stage.board.map(p=>setPower(p,1));
let sugarCount=0;
for(let ball=1;ball<=8;ball++){
 const oldPopped=stage.popped,t=E.draw(stage,stage.numbers[15],()=>.005);
 assert.equal(stage.level,1);assert.equal(t.boost,false);
 assert.ok(t.moves.every(m=>m.piece.power===4));
 assert.equal(t.sugarCrossed,oldPopped<targetAtStart&&stage.popped>=targetAtStart);
 assert.equal(stage.sugarTarget,targetAtStart);sugarCount+=Number(t.sugarCrossed);
}
assert.equal(sugarCount,1);assert.ok(stage.sugarAwarded);
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
// PO 50–150 now changes both the symmetric opening-pattern mix and the
// first POP threshold. Every generated opening remains full and has an
// ordinary-number all-clear route.
const seeded=n=>()=>((n=Math.imul(n,1664525)+1013904223|0)>>>0)/2**32;
for(const rate of [50,75,90,110,130,150]){
 const mode=E.create({rate,rng:seeded(51821+rate),bet:100});
 assert.equal(mode.targetRate,rate);assert.equal(mode.board.length,61);assert.ok(mode.board.every(Boolean));
 assert.ok(E.initialPatterns.some(p=>p.name===mode.initialPattern&&p.symmetry===mode.initialSymmetry));
 assert.ok(mode.openingClearNumbers.length>=1);
 for(const n of mode.openingClearNumbers)assert.ok(E.preview(mode,n).clear);
 assert.ok(mode.firstPopAward>=100&&mode.firstPopAward<=250);
 const table=E.popPayFor(mode.firstPopAward);
 assert.deepEqual(table[0],[mode.firstPopAward,.1]);
 assert.equal(E.payout(mode.firstPopAward-1,0,100,mode.firstPopAward),0);
 assert.equal(E.payout(mode.firstPopAward,0,100,mode.firstPopAward),10);
}
assert.equal(E.firstForRate(50,0),240);
assert.equal(E.firstForRate(150,0),100);
assert.ok([150,160].includes(E.firstForRate(90,.5)));

// Exercise both sides of the 90% threshold interpolation and compare actual
// eight-clear awards against the displayed POP table.
for(const [roll,firstPay] of [[0,150],[.9,160]]){
 assert.equal(E.firstForRate(90,roll),firstPay);
 const mode=E.create({rng:seeded(7300+firstPay),rate:90,bet:37});
 mode.firstPopAward=firstPay;mode.board=mode.board.map(p=>setPower(p,5));
 const cumulative=[1,4,24,74,274,774,1774,3774];
 for(let i=0;i<8;i++){
   const number=mode.numbers[mode.allIndex],preview=E.preview(mode,number);
   const trace=E.draw(mode,number,()=>0);
   const displayed=E.popPayFor(firstPay).filter(([min])=>min<=mode.popped).at(-1)?.[1]||0;
   const expected=Math.floor(37*(displayed+cumulative[i])+1e-8);
   assert.ok(trace.clear&&preview.clear);assert.equal(trace.firstPopAward,firstPay);
   assert.equal(preview.win,expected);assert.equal(trace.win,expected);assert.equal(mode.win,expected);
 }
}
console.log('Passed 15 lanes, separate ALL and BOOST, priority-capped levels, sparse-board previews, sealed pockets, top-only entry and motion replay, occupied-only clears, no ghost hits, collision-safe gravity and eight-turn accounting.');
