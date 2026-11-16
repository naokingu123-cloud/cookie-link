import assert from 'node:assert/strict';
import {createStationService} from '../server-stations-v235.mjs';
let now=10000;const messages=[],db={players:{p:{displayName:'PLAYER'}}},sockets=new Map([['p',new Set([{}])]]);
const m={id:'idle-test',hostPlayerId:'host',round:null};
const service=createStationService({getDb:()=>db,socketMap:()=>sockets,connected:(_,id)=>sockets.has(id),broadcast:(_,value)=>messages.push(value),scheduleSave(){},now:()=>now});
service.join(m,'p');
const tests=()=>service.snapshot(m,'p').seats.filter(s=>s.test);
assert.equal(tests().length,5);
now+=500;m.round={id:'completed-round',phase:'COMPLETE',betOpenedAt:now,balls:Array.from({length:8},(_,i)=>({number:i+1,index:i+1})),participants:{}};
service.tick(m);
assert.ok(tests().every(s=>s.ballCount===8&&s.bet===100&&s.settled));
// The core clears a completed round while waiting for a restarted host. This
// used to leave a cached board behind and crash an incoming WebSocket snapshot.
now+=500;m.round=null;
assert.doesNotThrow(()=>service.tick(m));
assert.ok(tests().every(s=>s.roundId===null&&s.phase==='WAITING'&&s.ballCount===0&&s.bet===0&&s.win===0&&!s.settled));
assert.equal(service.snapshot(m,'p').selfStation,1,'idle transition must retain station identity');
for(let n=0;n<4;n++){now+=300;assert.doesNotThrow(()=>service.tick(m));}
now+=500;m.round={id:'next-round',phase:'BETTING',betOpenedAt:now,balls:[],participants:{}};
service.tick(m);
assert.ok(tests().every(s=>s.roundId==='next-round'&&s.phase==='BETTING'&&s.ballCount===0&&s.bet===100&&!s.settled));
m.round.phase='PLAYING';m.round.balls.push({number:17,index:1});service.tick(m);
assert.ok(tests().every(s=>s.ballCount===1),'new round must not inherit eight old results');
now+=500;m.round=null;
assert.doesNotThrow(()=>service.snapshot(m,'p'));
service.configure(m,0);assert.equal(tests().length,0);
service.configure(m,5);assert.equal(tests().length,5);
assert.ok(tests().every(s=>s.phase==='WAITING'&&s.win===0));
console.log('STATIONS_V235_IDLE_ROUND_PASS',JSON.stringify({tests:5,completedToIdle:true,playingToIdle:true,nextBet:true,seatsRetained:true}));
