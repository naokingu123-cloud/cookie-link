/* Six public stations. Test players use the real Jelly rules without rendering,
 * network peers, wallets or contributions to the real payout controller. */
import './assets/jelly-rules.js';
const JELLY=globalThis.JellyRules;
export const CAPACITY=6;
const FLAVORS=['strawberry','vanilla','mint','chocolate','grape'];
const TOPS=['strawberry','cookie','crown','none'],OUTFITS=['bow','cape','apron','none'];
const ACCENTS=['#ec6798','#67c6de','#a58ae0','#e7b847','#68be93'];
const NAMES=['シュガー','ミント','ココア','プリン','こはく'];
const integer=v=>Math.max(0,Math.min(1e12,Math.floor(Number(v)||0)));
export function cleanProfile(input={}){
 input=input&&typeof input==='object'?input:{};
 const pet=input.pet||{},pick=(values,value)=>values.includes(value)?value:values[0];
 const name=Array.from(String(input.name||'プレイヤー').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim()).slice(0,12).join('')||'プレイヤー';
 const photo=String(input.photo||'');
 // No remote URL/SVG/HTML is accepted; bounded raster thumbnails only.
 const validPhoto=photo.length<=24000&&(/^data:image\/png;base64,iVBOR[A-Za-z0-9+/=]+$/.test(photo)||/^data:image\/webp;base64,UklGR[A-Za-z0-9+/=]+$/.test(photo));
 return {name,pet:{flavor:pick(FLAVORS,pet.flavor),top:pick(TOPS,pet.top),outfit:pick(OUTFITS,pet.outfit),accent:pick(ACCENTS,pet.accent)},photo:validPhoto?photo:''};
}
function randomFor(text){let seed=2166136261;for(const char of text)seed=Math.imul(seed^char.charCodeAt(0),16777619);return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
export function createStationService({getDb,socketMap,connected,broadcast,scheduleSave,now=Date.now,graceMs=60000,rules=JELLY}={}){
 if(!rules?.create||!rules?.draw)throw Error('Station Jelly rules unavailable');
 const rooms=new Map();
 const runtime=m=>{let r=rooms.get(m.id);if(!r){r={bots:new Map(),signature:'',lastSend:-Infinity,revision:0,photos:new Map()};rooms.set(m.id,r);}return r;};
 function data(m){
  let d=m.stationsV235;
  if(!d||!Array.isArray(d.seats))d=m.stationsV235={seats:Array(CAPACITY).fill(null),demoCount:5,sequence:0};
  d.seats=Array.from({length:CAPACITY},(_,i)=>d.seats[i]||null);
  d.demoCount=Math.max(0,Math.min(5,Math.floor(Number(d.demoCount)||0)));
  d.sequence=integer(d.sequence);
  const used=new Set();d.seats=d.seats.map(s=>{if(!s||!['human','test'].includes(s.kind)||!s.playerId||used.has(s.playerId))return null;used.add(s.playerId);return s;});
  return d;
 }
 function systemPlayer(m,id){return id===m.hostPlayerId;}
 function release(m,id){const d=data(m),i=d.seats.findIndex(s=>s?.playerId===id);if(i<0)return false;d.seats[i]=null;runtime(m).bots.delete(id);scheduleSave();return true;}
 function allocate(m,id){
  if(systemPlayer(m,id))return null;
  const d=data(m);let at=d.seats.findIndex(s=>s?.playerId===id);
  if(at>=0)return at+1;
  at=d.seats.findIndex(s=>!s);
  // A real arrival can replace a TEST seat, never another real player.
  const testAt=d.seats.findIndex(s=>s?.kind==='test');
  if(testAt>=0&&(at<0||testAt<at))at=testAt;
  if(at<0)return null;
  if(d.seats[at])runtime(m).bots.delete(d.seats[at].playerId);
  d.seats[at]={playerId:id,kind:'human',joinedAt:now(),order:++d.sequence,offlineSince:0};scheduleSave();return at+1;
 }
 function fillTests(m){
  const d=data(m),hasHuman=d.seats.some(s=>s?.kind==='human');
  const tests=d.seats.filter(s=>s?.kind==='test');
  for(const s of tests.slice(hasHuman?d.demoCount:0))release(m,s.playerId);
  if(!hasHuman)return;
  let n=d.seats.filter(s=>s?.kind==='test').length;
  for(let k=0;k<5&&n<d.demoCount;k++){
   const id='station-test-'+k;if(d.seats.some(s=>s?.playerId===id))continue;
   const at=d.seats.findIndex(s=>!s);if(at<0)break;
   d.seats[at]={playerId:id,kind:'test',testIndex:k,joinedAt:now(),order:++d.sequence};n++;scheduleSave();
  }
 }
 function sync(m){
  const d=data(m),t=now();release(m,m.hostPlayerId);
  for(const s of d.seats){
   if(s?.kind!=='human')continue;
   if(connected(m.id,s.playerId)){if(s.offlineSince){s.offlineSince=0;scheduleSave();}}
   else if(!s.offlineSince){s.offlineSince=t;scheduleSave();}
   else if(t-s.offlineSince>=graceMs&&m.round?.phase!=='PLAYING')release(m,s.playerId);
  }
  // Wait until the host is registered so its initial socket never claims st.1.
  // Map insertion order is server-observed connection order, not client clocks.
  if(m.hostPlayerId)for(const id of socketMap(m.id).keys())if(!systemPlayer(m,id)&&connected(m.id,id))allocate(m,id);
  fillTests(m);advanceTests(m);return d;
 }
 function advanceTests(m){
  const round=m.round,r=runtime(m),d=data(m);
  // A completed round can be cleared before the next BET opens, including
  // while a restarted host reconnects. Never retain a playable orphan board.
  if(!round){r.bots.clear();return;}
  for(const s of d.seats){
   if(s?.kind!=='test')continue;
   let bot=r.bots.get(s.playerId);
   if(!bot||bot.roundId!==round.id){
    const eligible=s.joinedAt<=Number(round.betOpenedAt||0);
    bot={roundId:round.id,state:eligible?rules.create({rng:randomFor(m.id+'|'+s.playerId+'|'+round.id),rate:90}):null,win:0};r.bots.set(s.playerId,bot);
   }
   if(!bot.state)continue;
   for(const ball of (round.balls||[]).slice(bot.state.draws.length)){
    const result=rules.draw(bot.state,Number(ball.number));if(result)bot.state=result.state;
   }
   bot.win=integer(100*rules.payout(bot.state.lines.length,bot.state.oddsMultiplier,bot.state.payoutVersion)/100);
  }
 }
 function profile(m,s){
  if(s.kind==='test'){
   const k=s.testIndex||0;return cleanProfile({name:NAMES[k],pet:{flavor:FLAVORS[k],top:TOPS[k%TOPS.length],outfit:OUTFITS[k%OUTFITS.length],accent:ACCENTS[k]}});
  }
  const player=getDb().players[s.playerId]||{};
  return cleanProfile(player.stationProfileV235||{name:player.displayName});
 }
 function rows(m){
  const d=data(m),r=runtime(m),round=m.round;
  return d.seats.map((s,i)=>{
   if(!s)return {station:i+1,empty:true};
   const p=profile(m,s),entry={station:i+1,playerId:s.playerId,name:p.name,pet:p.pet,photo:p.photo,test:s.kind==='test',connected:s.kind==='test'||connected(m.id,s.playerId),joinedAt:s.joinedAt,win:0,roundId:round?.id||null,phase:'WAITING',settled:false};
   if(s.kind==='test'){
    const cached=r.bots.get(s.playerId),bot=round&&cached?.roundId===round.id?cached:null;
    entry.game='jelly';entry.bet=bot?.state?100:0;entry.win=bot?.win||0;entry.ballCount=bot?.state?.draws.length||0;
    if(round&&bot?.state){entry.phase=round.phase;entry.settled=round.phase==='COMPLETE';}
   }else{
    const participant=round?.participants?.[s.playerId],state=participant?.checkpoint;
    if(participant){
     entry.bet=integer(participant.totalBet);entry.ballCount=integer(participant.checkpointBall);entry.phase=round.phase;
     entry.settled=!!participant.settlement;
     entry.win=participant.settlement?integer(participant.settlement.totalWin):Math.max(integer(state?.totalWin),(Array.isArray(state?.roundWins)?state.roundWins:[]).reduce((a,b)=>a+integer(b),0),s.liveRound===round.id?integer(s.liveWin):0);
    }
   }
   return entry;
  });
 }
 function payload(m,id=null,compact=false){
  const r=runtime(m),seats=rows(m),self=seats.find(s=>s.playerId===id);
  if(compact)for(const s of seats){if(s.empty)continue;const key=s.playerId+'|'+s.photo;if(r.photos.get(s.station)===key)delete s.photo;else r.photos.set(s.station,key);}
  return {version:235,machineId:m.id,capacity:CAPACITY,revision:r.revision,selfStation:self?.station||null,waiting:!!id&&id!==m.hostPlayerId&&!self,demoCount:data(m).demoCount,seats};
 }
 function tick(m){
  sync(m);const r=runtime(m),signature=JSON.stringify(rows(m));
  if(signature===r.signature||now()-r.lastSend<250)return;
  r.signature=signature;r.lastSend=now();r.revision++;
  broadcast(m.id,{type:'station_roster',stations:payload(m,null,true)});
 }
 function snapshot(m,id=null,includePhotos=true){
  sync(m);const result=payload(m,id);
  // Frequent state polling must not resend up to six base64 thumbnails.
  // Initial hello/profile replies and changed-photo broadcasts supply them.
  if(!includePhotos)for(const seat of result.seats)if(seat.photo)delete seat.photo;
  return result;
 }
 function join(m,id,input){
  sync(m);const station=allocate(m,id);if(input&&station)updateProfile(m,id,input);fillTests(m);tick(m);return snapshot(m,id);
 }
 function updateProfile(m,id,input){
  if(systemPlayer(m,id))return false;
  const player=getDb().players[id];if(!player)return false;
  const clean=cleanProfile(input);
  if(JSON.stringify(player.stationProfileV235)===JSON.stringify(clean))return true;
  player.stationProfileV235=clean;player.displayName=clean.name;scheduleSave();return true;
 }
 function progress(m,id,msg){
  const s=data(m).seats.find(s=>s?.kind==='human'&&s.playerId===id),round=m.round,p=round?.participants?.[id];
  if(!s||!p||p.settlement||round.id!==String(msg.roundId)||round.phase==='BETTING')return false;
  if(s.liveRound!==round.id){s.liveRound=round.id;s.liveWin=0;}
  s.liveWin=Math.max(integer(s.liveWin),integer(msg.win));return true; // display only; never a wallet write
 }
 function configure(m,count){const n=Number(count);if(!Number.isInteger(n)||n<0||n>5)throw Object.assign(Error('invalid_test_count'),{status:400});data(m).demoCount=n;scheduleSave();tick(m);return snapshot(m);}
 function eligible(m,ids){sync(m);const seated=new Set(data(m).seats.filter(s=>s?.kind==='human').map(s=>s.playerId));return ids.filter(id=>seated.has(id));}
 return {tick,snapshot,join,release,configure,eligible,updateProfile,progress};
}

/* Applied after the established v220 patch. Fail closed on source drift. */
export function patchStationCore(source){
 const once=(from,to,label)=>{if(source.split(from).length!==2)throw Error('[Stations235] patch target '+label);source=source.replace(from,to);};
 once("import http from 'node:http';","import http from 'node:http';\nimport {createStationService} from '../server-stations-v235.mjs';",'import');
 once('await loadDb();',`const stations=createStationService({getDb:()=>db,socketMap,connected,broadcast,scheduleSave,now});\nawait loadDb();`,'service');
 once(" return {type:'snapshot',serverTime:now()",` const stationView=stations.snapshot(m,playerId,false),stationRound=publicRound(m.round,playerId);\n if(stationRound&&!stationView.selfStation)stationRound.canBet=false;\n return {type:'snapshot',serverTime:now()`, 'snapshot seat guard');
 once('round:publicRound(m.round,playerId),pendingRound:','round:stationRound,pendingRound:', 'snapshot round');
 once("role:isHost?'host':'player'};","role:isHost?'host':'player',stations:stationView};",'public snapshot');
 once(' return connectedPlayerIds(m);',' return stations.eligible(m,connectedPlayerIds(m));','seat eligibility');
 once('function tickMachine(m){\n const t=now()', 'function tickMachine(m){\n stations.tick(m);\n const t=now()', 'clock');
 once(" if(req.method==='POST'&&p[3]==='round'&&p[4]==='join'){",` if(req.method==='GET'&&p[3]==='stations')return reply(res,200,{ok:true,stations:stations.snapshot(m,player.id)});\n if(req.method==='POST'&&p[3]==='stations'&&p[4]==='join'){\n  const input=await bodyJson(req);return reply(res,200,{ok:true,stations:stations.join(m,player.id,input)});\n }\n if(req.method==='POST'&&p[3]==='round'&&p[4]==='join'){\n  // Use the established terminal BET rejection to release any client-side hold.\n  if(!stations.snapshot(m,player.id).selfStation)return reply(res,409,{ok:false,error:'wait_next_bet',reason:'machine_full',...snapshot(m,player.id)});`, 'player routes');
 once(" const p=parts(url.pathname);",` const p=parts(url.pathname);\n if(p[0]==='api'&&p[1]==='admin'&&p[2]==='machines'&&p[4]==='stations'){\n  if(!adminAllowed(req,url))return reply(res,403,{ok:false,error:'admin_required'});\n  const m=machine(safeId(p[3])||MACHINE_DEFAULT);\n  if(req.method==='GET')return reply(res,200,{ok:true,stations:stations.snapshot(m)});\n  if(req.method==='POST'&&p[5]==='demo'){const input=await bodyJson(req);return reply(res,200,{ok:true,stations:stations.configure(m,input.count)});}\n  return reply(res,404,{ok:false,error:'not_found'});\n }`, 'admin routes');
 once("   const msg=JSON.parse(String(raw));",`   const msg=JSON.parse(String(raw));\n   if(msg.type==='station_hello'||msg.type==='station_profile'){\n    const t=now();if(t-(ws.stationProfileAt||0)<1500)return;ws.stationProfileAt=t;\n    const view=stations.join(m,player.id,msg.profile);\n    ws.send(JSON.stringify({type:'station_roster',serverTime:t,stations:view}));return;\n   }\n   if(msg.type==='station_progress'){\n    const t=now();if(t-(ws.stationWinAt||0)<400)return;ws.stationWinAt=t;\n    stations.progress(m,player.id,msg);return;\n   }`, 'socket messages');
 once('  ok:true,serverTime:now(),machine:{','  ok:true,serverTime:now(),stations:stations.snapshot(m,null,false),machine:{','monitor roster');
 return source;
}
