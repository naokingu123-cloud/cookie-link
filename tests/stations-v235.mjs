import assert from 'node:assert/strict';
import {createStationService,cleanProfile} from '../server-stations-v235.mjs';
let time=10000,saves=0;const db={players:{}},maps=new Map(),messages=[];
const socketMap=id=>{if(!maps.has(id))maps.set(id,new Map());return maps.get(id);};
const connected=(m,p)=>!!socketMap(m).get(p)?.size;
const options={getDb:()=>db,socketMap,connected,broadcast:(id,msg)=>messages.push({id,msg}),scheduleSave:()=>saves++,now:()=>time,graceMs:1000};
let service=createStationService(options);
const m={id:'one',hostPlayerId:'host',round:null};
function connect(id,machine=m){db.players[id]||={id,displayName:id,tokenHash:'secret',credit:999};socketMap(machine.id).set(id,new Set([{}]));service.tick(machine);return service.snapshot(machine,id);}
function disconnect(id){socketMap(m.id).delete(id);time+=1;service.tick(m);}
connect('host');assert.equal(service.snapshot(m).seats.filter(s=>!s.empty).length,0,'host is not a seat');
assert.equal(service.snapshot(m).demoCount,0,'v236 defaults to real players only');
service.configure(m,5); // Explicit opt-in only for retained TEST-rule regression coverage.
let roster=connect('p1');assert.equal(roster.selfStation,1);assert.equal(roster.seats.filter(s=>s.test).length,5);
assert.equal(Object.keys(db.players).filter(id=>id.startsWith('station-test')).length,0);
assert.equal(service.join(m,'p1').selfStation,1,'duplicate tab reuses seat');
for(let i=2;i<=6;i++){time++;assert.equal(connect('p'+i).selfStation,i);}
assert.equal(service.snapshot(m).seats.filter(s=>s.test).length,0,'real arrivals replace tests');
assert.equal(connect('p7').selfStation,null);assert.equal(service.snapshot(m,'p7').waiting,true);
assert.deepEqual(service.eligible(m,['host','p1','p7','p6']),['p1','p6']);
disconnect('p2');time+=500;assert.equal(connect('p2').selfStation,2,'reconnect keeps st.2');
disconnect('p2');time+=1100;service.tick(m);
assert.equal(service.snapshot(m,'p7').selfStation,2,'vacant seat is assigned to first waiting player');
assert.equal(service.snapshot(m,'p3').selfStation,3,'other seats never renumber');
service=createStationService(options);assert.equal(service.snapshot(m,'p1').selfStation,1);assert.equal(service.snapshot(m,'p7').selfStation,2);
const clean=cleanProfile({name:'<img onerror=x>\u202e',photo:'javascript:alert(1)',pet:{flavor:'evil',accent:'url(x)'}});
assert.equal(clean.photo,'');assert.equal(clean.pet.flavor,'strawberry');assert.ok(Array.from(clean.name).length<=12);
service.updateProfile(m,'p1',{name:'テスト名前',pet:{flavor:'mint',top:'crown',outfit:'cape',accent:'#67c6de'}});
assert.equal(service.snapshot(m,'p1').seats[0].name,'テスト名前');
assert.doesNotMatch(JSON.stringify(service.snapshot(m)),/secret|tokenHash|credit/,'public view excludes account secrets');
m.round={id:'round-real',phase:'PLAYING',betOpenedAt:time-100,balls:[],participants:{p1:{totalBet:100,checkpoint:{totalWin:20,roundWins:[30,40]},checkpointBall:2}}};
assert.equal(service.snapshot(m,'p1').seats[0].win,70);
assert.equal(service.progress(m,'p7',{roundId:m.round.id,win:999}),false);
assert.equal(service.progress(m,'p1',{roundId:'wrong',win:999}),false);
service.progress(m,'p1',{roundId:m.round.id,win:100});assert.equal(service.snapshot(m).seats[0].win,100);
m.round.participants.p1.settlement={totalWin:80};assert.equal(service.snapshot(m).seats[0].win,80,'final settlement overrides provisional display');
assert.equal(service.progress(m,'p1',{roundId:m.round.id,win:999}),false);
const two={id:'two',hostPlayerId:'host',round:null};time+=10;
service.configure(two,5); // Isolated fixture; normal machines remain at zero.
connect('p1',two);
assert.equal(service.snapshot(two,'p1').selfStation,1);assert.equal(service.snapshot(two).seats.filter(s=>s.test).length,5);
time+=20;two.round={id:'round-test',phase:'BETTING',betOpenedAt:time,balls:[],participants:{}};service.tick(two);
for(let i=1;i<=8;i++){time+=250;two.round.phase=i===8?'COMPLETE':'PLAYING';two.round.balls.push({index:i,number:i});service.tick(two);}
const testRoster=service.snapshot(two);assert.equal(testRoster.seats.filter(s=>s.test).length,5);
assert.ok(testRoster.seats.filter(s=>s.test).every(s=>s.ballCount===8&&s.settled));
assert.equal(Object.keys(two.round.participants).length,0,'TEST entries never enter payout participants');
const wins=testRoster.seats.filter(s=>s.test).map(s=>s.win);
service.tick(two);assert.deepEqual(service.snapshot(two).seats.filter(s=>s.test).map(s=>s.win),wins,'same ball not paid twice');
service=createStationService(options);assert.deepEqual(service.snapshot(two).seats.filter(s=>s.test).map(s=>s.win),wins,'deterministic restart reconstructs test state');
service.configure(two,0);assert.equal(service.snapshot(two).seats.filter(s=>s.test).length,0);
service.configure(two,5);assert.equal(service.snapshot(two).seats.filter(s=>s.test).length,5);
assert.throws(()=>service.configure(two,6),/invalid_test_count/);
console.log('STATIONS_V235_UNIT_PASS',{wins,saves,broadcasts:messages.length});
