import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createStationService,cleanStationDetail,STATION_COLORS} from '../server-stations-v235.mjs';
import {stationView} from './stations-view-fixture-v236.mjs';
const [hostSource,clientSource,loader,version] = await Promise.all([
 readFile(new URL('../assets/stations-reach-host-v239.js',import.meta.url),'utf8'),
 readFile(new URL('../assets/stations-v235.js',import.meta.url),'utf8'),
 readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8'),
 readFile(new URL('../app-version.json',import.meta.url),'utf8')
]);
const release=JSON.parse(version).version.match(/-v(\d+)-/)?.[1];
assert.ok(release&&Number(release)>=239);
assert.ok(loader.includes('stations-reach-host-v239.js?v='+release));
assert.equal(STATION_COLORS.length,6);
assert.equal(new Set(STATION_COLORS).size,6,'each ST uses a unique tint');
assert.match(clientSource,/highestReachNumbers/);
new Function(hostSource);new Function(clientSource);

// Real next-HIT cache: a tier-3 role may not be the overall largest WIN.
const engines=[{kind:'cookie',version:1,phase:'settled',totalHundredths:100},{kind:'jelly',version:1,phase:'settled',totalHundredths:100}];
const model={phase:'playing',token:1,draws:[1,2],locked:[100,100],bets:[100,100],enabled:[true,true],paid:[false,false],roundWins:[0,0],totalWin:0,engines};
const round={id:'live',phase:'PLAYING',balls:[1,2].map((number,i)=>({index:i+1,number})),participant:{totalBet:200}};
const page=stationView(clientSource,{id:'a',model,round});
const slots=engines.map((engine,i)=>({i,engine,reachStatus:'ready',tabReachVersion:1,tabReachBase:100,
 tabReachResults:i===0?[{number:12,total:130,gain:30,tier:3},{number:15,total:900,gain:800,tier:1}]:[{number:12,total:150,gain:50,tier:0},{number:15,total:1000,gain:900,tier:0}]}));
const predict=()=>page.api.currentDetail(model,round,page.shared.active,slots,s=>s.tabReachResults,(bet,h)=>Math.floor(bet*h/100));
const plain=value=>JSON.parse(JSON.stringify(value));
const predicted=plain(predict());
assert.equal(predicted.prediction,'ready');
assert.deepEqual(predicted.best.numbers,[15]);
assert.deepEqual(predicted.highestReachNumbers,[12], 'highest-role reach is distinct from highest WIN');
assert.equal(page.api.rowPresentation({roundId:round.id,phase:'PLAYING',win:0,connected:true,detail:predicted}).label,'最高役リーチ');
slots[1].reachStatus='pending';assert.deepEqual(plain(predict().highestReachNumbers),[],'incomplete cache cannot announce a highest reach');
slots[1].reachStatus='ready';

// Strict bounded server roster: only authenticated real participants can tint.
let tick=10000;const db={players:{a:{displayName:'A'},b:{displayName:'B'}}};
const sockets=new Map([['a',new Set([{}])],['b',new Set([{}])]]);
const service=createStationService({getDb:()=>db,socketMap:()=>sockets,connected:(_,id)=>sockets.has(id),broadcast(){},scheduleSave(){},now:()=>tick});
const machine={id:'public-01',hostPlayerId:'host',round:{id:'live',phase:'PLAYING',balls:[{index:1,number:1},{index:2,number:2}],participants:{a:{totalBet:100},b:{totalBet:100}}}};
service.snapshot(machine);
assert.deepEqual(service.snapshot(machine).seats.map(s=>s.color),STATION_COLORS);
const details={version:238,roundId:'live',ballCount:2,prediction:'ready',best:{numbers:[15],gain:900,tier:1},highestReachNumbers:[12,12,1,26,0],achievedTier:0,highestGames:[],paused:false};
assert.deepEqual(cleanStationDetail(details,machine.round).highestReachNumbers,[12]);
assert.equal(service.progress(machine,'a',{roundId:'live',win:110,detail:details}),true);
assert.equal(service.progress(machine,'b',{roundId:'live',win:220,detail:{...details,best:{numbers:[13],gain:300,tier:3},highestReachNumbers:[12,13]}}),true);
let roster=service.snapshot(machine);
assert.equal(roster.seats[0].detail.highestReachNumbers[0],12);
assert.deepEqual(roster.seats[1].detail.highestReachNumbers,[12,13]);
assert.equal(service.progress(machine,'host',{roundId:'live',win:999,detail:details}),false);
assert.equal(service.progress(machine,'impostor',{roundId:'live',win:999,detail:details}),false);
const remote=stationView(clientSource,{id:'a',model,round});
remote.receive({stations:roster,type:'station_roster'});
const card=remote.cards().find(c=>c.children.some(n=>n.className==='station-id'&&n.textContent==='st.2'));
assert.equal(card?.style['--station-color'],STATION_COLORS[1]);
assert.equal(card?.dataset.reach,'1');

// Host canvas fixture: 25 actual rotating number-panel meshes with the
// production shader uniforms, including a separate acrylic scatter layer.
const pairs=[],meshes=[];
const tint=()=>({value:{color:'original',set(color){this.color=color;}}});
for(let i=0;i<25;i++){
 const group={rotation:{y:-i*2*Math.PI/25},children:[]};
 const face={isMesh:true,parent:group,material:{uniforms:{gridSize:{value:20},lightTint:tint(),brightness:{value:1},flash:{value:0}}}};
 const scatter={isMesh:true,name:'Acrylic digit light scatter',parent:group,material:{uniforms:{lightTint:tint(),brightness:{value:1},flash:{value:0}}}};
 group.children=[face,scatter];meshes.push(face,scatter);pairs.push({face,scatter});
}
const draw={mode:'eight'},physics={hits:[]},driver={scene:{traverse(fn){for(const m of meshes)fn(m);}},draw,physics};
const fakeClient={round:{id:'live',phase:'PLAYING',balls:[{index:1,number:1},{index:2,number:2}]},listeners:[],on(fn){this.listeners.push(fn);},async getState(){return {stations:roster}}};
const window={SweetsSharedMachine:{client:fakeClient}},context={window,URLSearchParams,location:{search:'?serverHost=1'},
 document:{getElementById:id=>id==='cookie-roulette'?{anima8:driver}:null},
 console:{info(){}},Date,setInterval(){return 1;},clearInterval(){},addEventListener(){}};
vm.runInNewContext(hostSource,context);
const host=window.SweetsStationReachHostV239;
assert.ok(host,'host hooks installed');assert.equal(host.panelCount,25);
host.accept(roster);host.pulse();
assert.deepEqual(plain(host.highlightedNumbers),[12,13]);
assert.equal(host.colorFor(12,0).station,1);
assert.equal(host.colorFor(12,950).station,2,'same pocket alternates between st.1 and st.2');
assert.equal(host.colorFor(12,1900).station,1,'cycle wraps');
assert.equal(host.colorFor(13,0).station,2);
assert.equal(host.colorFor(14,0),null);
// Physically draw the pocket's material: the attached hook recolors it after
// the roulette's normal tinting, without changing a mesh, physics step, or hit.
const face=pairs[11].face,scatter=pairs[11].scatter;
face.onBeforeRender();scatter.onBeforeRender();
assert.ok([STATION_COLORS[0],STATION_COLORS[1]].includes(face.material.uniforms.lightTint.value.color));
assert.equal(face.material.uniforms.brightness.value,2.65);
assert.equal(scatter.material.uniforms.lightTint.value.color,face.material.uniforms.lightTint.value.color);
physics.hits.push({pocket:12});assert.equal(host.colorFor(12,0),null,'physical HIT darkens reach immediately');
physics.hits.length=0;
fakeClient.round.phase='COMPLETE';host.pulse();assert.equal(host.colorFor(12,0),null,'round complete clears colors');
fakeClient.round.phase='PLAYING';
// A new number is received and the server has not yet delivered fresh
// per-player calculations: old highlights must not survive.
fakeClient.round.balls.push({index:3,number:14});host.pulse();assert.equal(host.colorFor(12,0),null);
roster=service.snapshot(machine);
machine.round.balls.push({index:3,number:14});
assert.deepEqual(service.snapshot(machine).seats[0].detail.highestReachNumbers,[],'server invalidates outdated forecasts');
fakeClient.round.balls.pop();
const settled={...service.snapshot(machine),revision:99,seats:roster.seats.map(s=>({...s,settled:true}))};
host.accept(settled);host.pulse();assert.equal(host.colorFor(12,0),null);
assert.doesNotMatch(JSON.stringify(service.snapshot(machine)),/tokenHash|wallet|creditAfter|password/i);
console.log('STATIONS_V239_HIGHLIGHT_PASS: six fixed colors, 3D rotating panels, alternating shared pockets, prediction isolation, server stale guards, no extra simulation');
