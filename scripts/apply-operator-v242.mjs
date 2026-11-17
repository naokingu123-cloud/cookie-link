import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s);
const version='20261117-v242-compact-refund-trends';
if(JSON.parse(read('app-version.json')).version===version){console.log('V242_ALREADY_APPLIED');process.exit(0);}
function once(s,a,b,label){if(s.split(a).length!==2)throw Error('v242 source contract: '+label);return s.replace(a,b);}
function edit(p,f){write(p,f(read(p)));}
function segment(s,name,next,f){const a=s.indexOf('function '+name+'('),b=s.indexOf('\nfunction '+next+'(',a);if(a<0||b<a)throw Error('function '+name);return s.slice(0,a)+f(s.slice(a,b))+s.slice(b);}
edit('server-payout-preload-v3.mjs',s=>{
 s=once(s,"const p=player(machineId,playerId),round=roundRecord(machineId,playerId,roundId);if(round.committed)return round.settlement;","const cancelled=operatorCancelledV242(machineId,roundId);if(cancelled?.refunds?.[playerId])return cancelled.refunds[playerId].settlement;\n const p=player(machineId,playerId),round=roundRecord(machineId,playerId,roundId);if(round.committed)return round.settlement;\n operatorTrendStateV242(machineId);",'settlement tombstone');
 s=once(s,'round.work=null;trimRounds(p);persistWallet();return round.settlement;','round.work=null;operatorRecordTrendV242(machineId,roundId);trimRounds(p);persistWallet();return round.settlement;','persist trend with outcome');
 s=once(s,"return {version:VERSION,source:'per-player-common',playerId:p.playerId,","return {version:VERSION,source:'per-player-common',playerId:p.playerId,refundsV242:operatorRefundNoticesV242(machineId,playerId),",'private refund notices');
 s=segment(s,'processTelemetry','finalGames',part=>once(part,' round.phase=telemetry.phase||round.phase;',' if(round.cancelledV242||operatorCancelledV242(machineId,roundId))return publicControl(machineId,playerId);\n round.phase=telemetry.phase||round.phase;','ignore void telemetry'));
 s=s.replace('if(!record)continue;record.phase=round.phase','if(!record||record.cancelledV242)continue;record.phase=round.phase').replace('if(!r)continue;const ball=message.ball','if(!r||r.cancelledV242)continue;const ball=message.ball');
 return s+read('scripts/v242/wallet-extension.js');
});
edit('server-core.mjs',s=>{
 s=once(s,'function createBettingRound(m){','function createBettingRound(m,forcedFromRoundId=null){','new forced BET identity');
 s=once(s,"sequence,phase:'BETTING',balls:[],","sequence,phase:'BETTING',balls:[],forcedFromRoundId,",'round provenance');
 s=segment(s,'publicRound','pendingRoundForPlayer',part=>once(part,'id:round.id,sequence:round.sequence,phase:round.phase,','id:round.id,sequence:round.sequence,phase:round.phase,cancelled:!!round.cancelledV242,forcedFromRoundId:round.forcedFromRoundId||null,','public cancel flag'));
 const look='const input=await bodyJson(req),round=lookupRound(m,input.roundId);';
 if(s.split(look).length<3)throw Error('checkpoint and settlement guards');
 s=s.split(look).join(look+"\n  if(round?.cancelledV242||payoutWallet?.operatorCancelled?.(m.id,input.roundId))return reply(res,409,{ok:false,error:'round_cancelled',...snapshot(m,player.id)});");
 s=once(s,'const input=await bodyJson(req);tickMachine(m);const round=m.round;',"const input=await bodyJson(req);if(operatorBusyV242.has(m))return reply(res,409,{ok:false,error:'wait_next_bet',...snapshot(m,player.id)});tickMachine(m);const round=m.round;",'no wagers before core persistence');
 s=once(s,'await loadDb();',read('scripts/v242/core-extension.js')+'\nawait loadDb();','core cancellation service');
 s=once(s,'payoutWallet?.attachCore(db);','payoutWallet?.attachCore(db);\nfor(const m of Object.values(db.machines||{}))recoverOperatorCancellationV242(m);','recover wallet journal');return s;
});
edit('server-core-loader-v220.mjs',s=>{
 const block=`\n// v242: applied after the established station/forecast patch contracts.\nsource=once(source,'function tickMachine(m){','function tickMachine(m){\\n if(operatorBusyV242.has(m))return;recoverOperatorCancellationV242(m);','operator transition lock');\nsource=once(source,'return reply(res,200,{ok:true,...requestServerBetNow(m),serverTime:now()});','const input=await bodyJson(req);return reply(res,200,{ok:true,...await forceServerBetV242(m,input),serverTime:now()});','forced BET transaction');\nsource=once(source,'stations:stationView};','stations:stationView,operatorRefundsV242:payoutWallet?.operatorNotices?.(m.id,playerId)||[]};','personalized refunds');\nsource=once(source,'hitForecasts:monitorForecastsV241.snapshot(m),machine:{','hitForecasts:monitorForecastsV241.snapshot(m),payoutTrendV242:payoutWallet?.operatorTrend?.(m.id)||null,machine:{','operator trend');\n`;
 return once(s,'await fs.mkdir(OUTPUT_DIR,{recursive:true});',block+'\nawait fs.mkdir(OUTPUT_DIR,{recursive:true});','loader extension');
});
edit('assets/shared-machine-core-v196.js',s=>{
 s=once(s,'  if(this.isStaleState(message))return false;','  if(this.isStaleState(message))return false;\n  window.SweetsSharedControllerV224?.operatorStateV242?.(message);','early cancelled-round handling');
 s=s.replaceAll('BETTING:1,PLAYING:2,COMPLETE:3','BETTING:1,PLAYING:2,COMPLETE:3,CANCELLED:4');
 return s;
});
edit('assets/server-payout-control-v3.js',s=>{
 s=once(s,' if(!control||Number(control.version)!==3)return;',' if(!control||Number(control.version)!==3)return;\n window.SweetsSharedControllerV224?.operatorStateV242?.(control);','refund before wallet hydration');
 s=once(s,'function applyStateControl(response,options={}){','function applyStateControl(response,options={}){\n window.SweetsSharedControllerV224?.operatorStateV242?.(response);','refund before HTTP snapshot hydration');return s;
});
edit('assets/shared-client-controller-v224.js',s=>{
 s=once(s,'function queueLoss(roundId,creditAfterBet){','function queueLoss(roundId,creditAfterBet){\n if(operatorVoidsV242.has(String(roundId)))return;','void never becomes loss');
 s=once(s,"const roundId=String(shared?.roundId||startedRoundId||'');if(!roundId||normalPending.has(roundId)","const roundId=String(shared?.roundId||startedRoundId||'');if(operatorVoidsV242.has(roundId))return;if(!roundId||normalPending.has(roundId)",'void never becomes normal settlement');
 s=once(s,'async function hardReset(credit,reason){','async function hardReset(credit,reason){\n const epochV242=operatorEpochV242;','reset epoch');
 s=once(s,'   await sleep(delay);','   await sleep(delay);if(epochV242!==operatorEpochV242)return false;','cancel old reset continuations');
 s=once(s,"roundId=String(roundId||'');if(!roundId)return false;","roundId=String(roundId||'');if(!roundId)return false;if(operatorVoidsV242.has(roundId)){dropLoss(roundId);return true;}",'zero settlement guard');
 s=once(s," if(!autoRebet&&manualBetRoundId!==id)return {text,label:'AUTO REBET OFF・BET待ち'};"," if(operatorAwaitingV242.size)return {text:'WAIT',label:'BET返却の残高確認中'};\n if(operatorManualBetV242(round))return {text,label:'BET全額返却済み・BETするで再参加'};\n if(!autoRebet&&manualBetRoundId!==id)return {text,label:'AUTO REBET OFF・BET待ち'};",'refund BET caption');
 s=once(s," if(!autoRebet&&manualBetRoundId!==id)return false;"," if(operatorAwaitingV242.size||operatorManualBetV242(round))return false;\n if(!autoRebet&&manualBetRoundId!==id)return false;",'no immediate automatic re-debit');
 s=once(s," const roundId=String(shared?.roundId||startedRoundId||'');if(!roundId)return finite(app.credit);"," const roundId=String(shared?.roundId||startedRoundId||'');if(!roundId||operatorVoidsV242.has(roundId))return lastServerWallet?.credit??finite(app.credit);",'settlement void guard');
 s=once(s," if(!response?.settlement||!Number.isFinite(Number(response.settlement.creditAfter)))throw Error('settlement_ack_missing');"," if(operatorVoidsV242.has(roundId))return lastServerWallet?.credit??finite(app.credit);\n if(!response?.settlement||!Number.isFinite(Number(response.settlement.creditAfter)))throw Error('settlement_ack_missing');",'late settlement ACK');
 s=once(s,"async function finishNormal(reason='result-complete'){","async function finishNormal(reason='result-complete'){\n const epochV242=operatorEpochV242;",'finish epoch');
 s=once(s,'const credit=await settleNormal(shared);joinedRounds.delete(roundId);','const credit=await settleNormal(shared);if(epochV242!==operatorEpochV242||operatorVoidsV242.has(roundId))return false;joinedRounds.delete(roundId);','old finish cannot reset new round');
 s=once(s,'try{const credit=await settleNormal({roundId});if(!active()', 'try{const credit=await settleNormal({roundId});if(operatorVoidsV242.has(roundId))continue;if(!active()', 'stale cleanup cannot overwrite refund');
 s=once(s,"['ball_result','round_started','round_complete','betting_started','host_changed','host_status']","['round_cancelled','ball_result','round_started','round_complete','betting_started','host_changed','host_status']",'cancel event reconciliation');
 s=once(s,'window.SweetsSharedControllerV224={hardReset,','window.SweetsSharedControllerV224={operatorStateV242,operatorVoidsV242,hardReset,','operator controller API');
 s=once(s,'boot();\n})();',read('scripts/v242/client-extension.js')+'\nboot();\n})();','controller refund scope');return s;
});
edit('assets/shared-machine-v176.js',s=>s.replaceAll(/\?v=\d+/g,'?v=242').replaceAll('V241','V242').replaceAll('v241-patched','v242-patched'));
edit('index.html',s=>s.replace(/assets\/shared-machine-v176\.js\?v=\d+/g,'assets/shared-machine-v176.js?v=242'));
edit('monitor.html',s=>{
 s=s.replace('<link rel="stylesheet" href="/assets/server-monitor-v241.css?v=241">','<link rel="stylesheet" href="/assets/server-monitor-v241.css?v=241">\n<link rel="stylesheet" href="/assets/server-monitor-v242.css?v=242">');
 s=s.replace('>BET TIME 開始</button>','>強制BET・全額返却</button>');
 s=once(s,' <section class="card players-card">',` <section class="card trend-card-v242"><h2>直近の払い出し推移 <span id="trend-summary-v242"></span></h2><div class="trend-controls-v242"><label><input type="checkbox" data-series="input" checked>IN</label><label><input type="checkbox" data-series="output" checked>OUT</label><label><input type="checkbox" data-series="po" checked>実測P/O</label><label><input type="checkbox" data-series="hg">H/G</label><label><input type="checkbox" data-series="rollingPo">直近10G P/O</label><select id="trend-range-v242" aria-label="表示ゲーム数"><option value="30">直近30G</option><option value="60">直近60G</option><option value="120">直近120G</option></select></div><div class="trend-plot-v242"><canvas id="payout-trend-v242" aria-label="IN OUT 実測P/Oの推移"></canvas><output id="trend-tooltip-v242" hidden></output></div></section>\n <section class="card players-card">`,'trend panel');
 s=s.replace(/<div class="monitor-legend-v241">[^]*?<\/div>/,'<div class="monitor-legend-v241">上段：増加WIN／下段：BET倍率。3倍到達＝赤・10倍＝紫・50倍＝虹。全体集計と在席6名を表示。詳細は別窓で開きます。</div>');
 s=s.replace('<script src="/assets/server-monitor-v241.js?v=241" data-boot="1"></script>','<script src="/assets/server-monitor-v242.js?v=242"></script>\n<script src="/assets/payout-trend-v242.js?v=242"></script>\n<script src="/assets/server-monitor-v241.js?v=242" data-boot="1"></script>');
 s=s.replace('<script src="/assets/server-monitor-bet-now-v240.js?v=240"></script>','<script src="/assets/server-monitor-bet-now-v242.js?v=242"></script>');return s;
});
// The old view remains responsible for boot and operator settings; its render
// calls the new fitted projection instead of recreating the long 39-column table.
edit('assets/server-monitor-v241.js',s=>once(s,'function render(data,{tbody,empty,openDetails,detail,refresh}){','function render(data,{tbody,empty,openDetails,detail,refresh}){\n if(root.SweetsMonitorCompactV242)return root.SweetsMonitorCompactV242.render(data,{tbody,empty,openDetails,detail,refresh});','compact view hook'));
write('tests/server-bet-now-v240.mjs',"// The v240 queued-start contract was explicitly replaced by full-refund interruption.\nawait import('./operator-refund-v242.mjs');\n");
write('app-version.json',JSON.stringify({version})+'\n');
console.log('V242_APPLIED');
