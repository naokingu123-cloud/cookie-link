/* HTTP-only recorded round player. The server owns every BET, result and wallet. */
(()=>{
'use strict';
if(window.SweetsDownloadV255||window.SweetsEditionV255?.value!=='download')return;
const G=window.SweetsGuestEntryV237,R=window.SweetsRecordedRoundV255,renderer=window.SweetsDownloadRouletteV255,cache=window.SweetsDownloadCacheV255;
if(!G||!R||!renderer||!cache)throw Error('download_dependencies_missing');
const query=new URLSearchParams(location.search),sameOrigin=!/\.github\.io$/i.test(location.hostname),machine=G.machine(query,sameOrigin),explicitServer=query.get('sharedServer')||query.get('server')||'';
const pageBase=new URL('./',location.href),pointerKey='sweets-download-resume-v255@'+pageBase.origin+pageBase.pathname+'@'+machine;
const nativeStart=Arcade.prototype.start,nativePrepare=Arcade.prototype.prepare,nativeSetBet=Arcade.prototype.setBet,nativeFinish=Arcade.prototype.finishRound,nativeHud=hud;
const initialProfile={name:playerLounge.store.data.name,pet:JSON.parse(JSON.stringify(playerLounge.store.data.pet)),photo:playerLounge.store.data.photo||''};
let base='',playerId='',token='',profileReady=false,online=false,connecting=false,busy=false,pack=null,session=null,wallet=null,responseCache=null;
let callbacks=null,started=false,playing=false,localComplete=false,pendingComplete=false,cursor=0,stableBall=0,playbackMs=0,stableMs=0,seq=0,ackSeq=0,frame=0,lastFrame=null,settling=false,settleStamp=0;
const playbackTiming={frames:0,activeMs:0,settlingMs:0,maxFrameMs:0};
let rng=null,error='',message='接続先サーバーを確認しています…',connectStep='接続先確認',assetsReady=false,assetsProgress=null,assetsTask=null,pollTimer=0,progressTask=null,syncTask=null,saveTask=Promise.resolve(),requestId='';
const number=value=>Math.max(0,Math.floor(Number(value)||0)),path=action=>`/api/machines/${encodeURIComponent(machine)}/download-v255/${action}`;
const scoped=()=>`${base}@${machine}@${playerId}`,draftKey=()=>`sweets-download-bets-v255@${scoped()}`,requestKey=()=>`sweets-download-request-v255@${scoped()}`;
const locked=()=>!!session&&!localComplete&&['preparing','ready','failed'].includes(session.status);
const bankAfterBet=()=>Math.max(0,Number(session?.creditBefore??pack?.creditBefore??wallet?.credit??0)-Number(session?.totalBet??pack?.totalBet??0));
const safeError=problem=>{
 const issue=String(problem?.message||problem||'');
 const known={
  download_server_not_updated:'接続先サーバーが旧版、またはダウンロード版が無効です。Windows側を最新版に更新し、start-download-server.cmd で起動してください。',
  download_server_unavailable:'ダウンロード版サーバーが停止しています。Windows側で start-download-server.cmd を起動してください。',
  download_server_unreachable:'サーバーに接続できません。Windows側の起動状態・トンネル・接続先URLを確認してください。',
  download_server_timeout:'サーバーから応答がありません。Windows側とトンネルの接続を確認してください。',
  download_server_missing:'接続先サーバーを特定できません。Windowsのサーバーが表示したプレイヤーURLから開いてください。',
  download_worker_not_ready:'録画処理がまだ準備できていません。サーバーの状態を確認して再試行してください。',
  download_insufficient_credit:'CREDITが足りません。BETを減らしてください。',
  insufficient_credit:'CREDITが足りません。BETを減らしてください。',
  download_profile_required:'プロフィールの取得を再試行してください。',
  download_wallet_locked:'別のゲームの同期が終わるまでお待ちください。',
  rate_limited:'サーバーへのアクセスが集中しています。しばらくして再試行してください。',
  offline:'通信が切れています。未取得のゲームを始めるにはサーバーへの接続が必要です。'
 };
 if(known[issue])return known[issue];
 if(/^download_health_(?:404|405|501)$/.test(issue))return known.download_server_not_updated;
 if(/^download_health_/.test(issue))return 'サーバーの状態確認に失敗しました（'+issue.replace('download_health_','HTTP ')+ '）。Windows側のサーバーを確認してください。';
 if(/401|403|unauthorized|invalid.*token/i.test(issue))return 'プレイヤー認証に失敗しました。接続先を確認して再試行してください（保存データは削除しないでください）。';
 if(/Failed to fetch|NetworkError|fetch failed|Load failed|AbortError/i.test(issue))return known.download_server_unreachable;
 return 'サーバー接続またはデータ取得に失敗しました（'+issue.slice(0,90)+'）。再試行してください。';
};
function setConnectStep(value){connectStep=value;message=value+'…';render();}
function resumeIdentity(pointer){
 if(pointer?.machine!==machine||typeof pointer.playerId!=='string')return null;
 try{
  const origin=new URL(pointer.base);
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.origin!==pointer.base)return null;
  const saved=G.readSession('sweets-shared-session-v176',origin.origin);
  return saved.playerId===pointer.playerId&&saved.token?{...saved,base:origin.origin}:null;
 }catch{return null;}
}
async function readVerifiedCache(identity,{unfinishedOnly=false}={}){
 const key=`${identity.base}@${machine}@${identity.playerId}`,local=await stored('get',undefined,key);
 if(local?.version!==255||local.base!==identity.base||local.machine!==machine||local.playerId!==identity.playerId||local.response?.playerId!==identity.playerId||!local.package||!local.session?.package?.sha256)return null;
 if(unfinishedOnly&&(local.session.status!=='ready'||local.progress?.complete&&!local.progress?.pendingComplete))return null;
 await validatePackage(local.package,local.session);return local;
}
function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open('sweets-download-v255',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('players'))request.result.createObjectStore('players');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('download_storage_unavailable'));});}
async function stored(operation,value,key=scoped()){const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('players',operation==='get'?'readonly':'readwrite'),store=tx.objectStore('players'),request=operation==='get'?store.get(key):store.put(value,key);let result;request.onsuccess=()=>result=request.result;request.onerror=()=>reject(request.error);tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('download_storage_failed'));});}finally{db.close();}}
function rememberPlaybackPosition(){
 if(!pack||!started||localComplete||settling||cursor!==stableBall)return false;
 const next=pack.playback.recording.hits[cursor],limit=next?Math.max(0,next.atMs-.001):pack.playback.recording.durationMs;
 const safe=Math.max(stableMs,Math.min(playbackMs,limit));if(safe<=stableMs)return false;
 stableMs=safe;seq++;return true;
}
function persist(){
 if(!playerId||!pack)return Promise.resolve();
 rememberPlaybackPosition();
 const storageKey=scoped(),value={version:255,base,machine,playerId,session,package:pack,response:responseCache,progress:{ballIndex:stableBall,playbackMs:stableMs,seq,ackSeq,complete:localComplete,pendingComplete},savedAt:Date.now()};
 saveTask=saveTask.catch(()=>{}).then(()=>stored('put',value,storageKey)).then(()=>{G.write(pointerKey,{base:value.base,machine:value.machine,playerId:value.playerId});}).catch(problem=>{error='この端末への保存に失敗しました。空き容量を確認して再試行してください。';render();throw problem;});return saveTask;
}
async function api(action,{method='GET',body,sessionEndpoint=false,timeout=18000}={}){
 if(!base)throw Error('download_server_missing');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 const headers={'Content-Type':'application/json'};if(token){headers.Authorization='Bearer '+token;headers['X-Player-Id']=playerId;}
 try{const response=await fetch(base+(sessionEndpoint?'/api/session':path(action)),{method,headers,cache:'no-store',credentials:'omit',signal:controller.signal,...(body?{body:JSON.stringify(body)}:{})}),value=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(Error(value.error||'HTTP '+response.status),{status:response.status});online=true;return value;}catch(problem){online=false;throw problem;}finally{clearTimeout(timer);}
}
// GitHub Pages provides the shell; the Windows service must provide the Download API.
async function confirmDownloadServer(){
 if(!base)throw Error('download_server_missing');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch(base+'/api/health',{cache:'no-store',credentials:'omit',signal:controller.signal});
  if(response.status===429)throw Error('rate_limited');
  if(!response.ok)throw Error('download_health_'+response.status);
  const value=await response.json().catch(()=>null);
  if(value?.ok!==true||!value.download||value.download.enabled!==true)throw Error('download_server_not_updated');
  return value;
 }catch(problem){
  if(problem?.name==='AbortError')throw Error('download_server_timeout');
  if(problem?.name==='TypeError')throw Error('download_server_unreachable');
  throw problem;
 }finally{clearTimeout(timer);}
}
async function validatePackage(value,expectedSession=session){
 if(value?.version!==255||value.sessionId!==expectedSession?.id||!Array.isArray(value.numbers)||value.numbers.length!==8||new Set(value.numbers).size!==8||value.numbers.some(n=>!Number.isInteger(n)||n<1||n>25))throw Error('download_package_invalid');
 if(JSON.stringify(value.gameIds||value.initialState?.gameIds)!==JSON.stringify(SweetsLineup.ids))throw Error('download_lineup_mismatch');
 const timeline=value.playback;if(!timeline?.rngTapes||!Array.isArray(timeline.checkpoints)||timeline.checkpoints.length<9||!value.initialState||!value.finalState)throw Error('download_checkpoint_missing');
 renderer.validate(timeline.recording);if(timeline.recording.hits.some((hit,i)=>hit.number!==value.numbers[i]))throw Error('download_recording_mismatch');
 if(expectedSession?.package?.sha256){const encoded=new TextEncoder().encode(JSON.stringify(value)),digest=await crypto.subtle.digest('SHA-256',encoded),actual=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');if(actual!==expectedSession.package.sha256)throw Error('download_package_integrity_error');}
 return value;
}
function checkpointAt(ball){if(ball===8)return pack?.finalState;const checkpoint=pack?.playback?.checkpoints?.[ball];return checkpoint?.state||checkpoint|| (ball===0?pack?.initialState:null);}
function applyWallet(next){if(!next||!Number.isSafeInteger(next.credit)||next.credit<0)return;if(wallet&&Number(next.revision)<Number(wallet.revision))return;wallet={...next};if(!started||localComplete){app.credit=wallet.credit;app.displayCredit=wallet.credit;}scheduleUI(app);}
async function acceptResponse(value,{cached=false}={}){
 if(value.playerId&&value.playerId!==playerId)throw Error('download_player_mismatch');
 applyWallet(value.wallet);profileReady=value.profileReady===true||profileReady;
 window.SweetsPlayerProfileV255?.hydrate(value);responseCache={...value};delete responseCache.package;
 const next=value.session,wasComplete=localComplete;
 if(next&&(!session||next.id!==session.id)){
  if(started&&!localComplete)throw Error('download_session_changed');
  session=next;cursor=stableBall=Math.min(8,number(next.progress?.ballIndex));playbackMs=stableMs=Number(next.progress?.playbackMs)||0;seq=number(next.progress?.seq);ackSeq=seq;localComplete=next.status==='complete';pendingComplete=false;started=false;
 }else if(next)session=next;
 if(next&&!started){const incomingBall=Math.min(8,number(next.progress?.ballIndex)),incomingSeq=number(next.progress?.seq);if(incomingBall>stableBall||incomingBall===stableBall&&incomingSeq>seq){cursor=stableBall=incomingBall;playbackMs=stableMs=Math.max(stableMs,Number(next.progress?.playbackMs)||0);}seq=Math.max(seq,incomingSeq);ackSeq=Math.max(ackSeq,incomingSeq);}
 if(value.package){pack=await validatePackage(value.package);requestId=session.requestId||requestId;app.bets=[...session.bets];if(!started){const hits=pack.playback.recording.hits,min=stableBall?hits[stableBall-1].atMs:0,max=stableBall<8?hits[stableBall].atMs:pack.playback.recording.durationMs;stableMs=playbackMs=Math.max(min,Math.min(max,stableMs));}if(!started&&session.status!=='complete')message='録画を保存しました。再生準備を確認しています…';}
 if(next?.status==='complete'){
  localComplete=true;pendingComplete=false;playing=false;cursor=stableBall=8;seq=Math.max(seq,number(next.progress?.seq));
  if(pack){stableMs=playbackMs=pack.playback.recording.durationMs;if(started&&!wasComplete){R.restore(app,pack.finalState,{wallet:false,notify:false});app.phase='complete';app.result={elapsed:1800,duration:1800};app.payout=null;renderer.renderAt(playbackMs);repaint();}}
  if(wallet){app.credit=app.displayCredit=wallet.credit;}message='再生完了を同期しました。次のBETへ進めます。';
 }
 // A ready package is already settled on the server. Its final Sugar snapshot
 // must wait for playback; publishing it here would reveal the future result
 // and make the presentation reject its older, recorded intermediate states.
 if(!started&&value.sugarState&&!pack&&!['preparing','ready'].includes(session?.status))window.SweetsSugarChallengeV254?.accept(value.sugarState);
 if(session?.status==='preparing'){message='サーバーで1ゲーム分を準備中です。1分ほどかかる場合があります。';schedulePoll();}
 if(session?.status==='failed'){error='ゲームの準備が中断しました。「準備を再試行」で同じゲームを再開します。';}
 if(pack&&assetsReady&&!started&&!localComplete)message=stableBall?'保存した '+stableBall+' 球目の続きから再生できます。':'ダウンロード完了。圏外でも1ゲームを再生できます。';
 if(!started&&locked()){app.credit=app.displayCredit=bankAfterBet();scheduleUI(app);}
 if(!cached&&pack&&(value.package||next?.status==='complete'))await persist();
 render();
}
function schedulePoll(){clearTimeout(pollTimer);pollTimer=setTimeout(async()=>{if(session?.status!=='preparing')return;if(!navigator.onLine){schedulePoll();return;}try{await acceptResponse(await api('active'));error='';}catch(problem){error=safeError(problem);render();}if(session?.status==='preparing')schedulePoll();},2200);}
async function prepareAssets(){
 if(assetsReady)return true;if(assetsTask)return assetsTask;
 assetsTask=(async()=>{try{assetsReady=await cache.ready();if(!assetsReady){await cache.prepare({onProgress:progress=>{assetsProgress=progress;render();}});assetsReady=true;}error='';if(pack&&!started&&!localComplete)message=stableBall?'保存した続きから再生できます。':'ダウンロード完了。圏外でも1ゲームを再生できます。';return true;}catch(problem){assetsReady=false;error='ゲーム素材の保存が途中です。通信と空き容量を確認して「再試行」を押してください。';return false;}finally{assetsTask=null;render();}})();return assetsTask;
}
async function restoreCached(local,identity){
 base=identity.base;playerId=identity.playerId;token=identity.token;session=local.session;
 await acceptResponse({...local.response,session,package:local.package},{cached:true});
 const p=local.progress||{};stableBall=cursor=Math.max(stableBall,Math.min(8,number(p.ballIndex)));stableMs=playbackMs=Math.max(stableMs,Number(p.playbackMs)||0);seq=Math.max(seq,number(p.seq));ackSeq=Math.max(ackSeq,number(p.ackSeq));localComplete=!!p.complete||session?.status==='complete';pendingComplete=!!p.pendingComplete&&session?.status!=='complete';
 assetsReady=await cache.ready();message=localComplete?'前のゲームは再生済みです。接続後に次のBETへ進めます。':'保存したゲームがあります。通信がなくても再開できます。';render();
}
async function initialize(){
 if(connecting)return;connecting=true;error='';setConnectStep('接続先サーバーを確認しています');
 try{
  // First recover a verified unfinished package locally, even if the browser
  // still reports online while the discovery route is unavailable. An absent,
  // completed or corrupt package cannot select a remembered endpoint.
  if(!pack&&!explicitServer&&!sameOrigin){
   const identity=resumeIdentity(G.read(pointerKey,null));
   if(identity)try{const local=await readVerifiedCache(identity,{unfinishedOnly:true});if(local)await restoreCached(local,identity);}catch(problem){console.warn('[DownloadV255] saved package',problem?.message||problem);}
  }
  // A downloaded round belongs to its original server and scoped identity.
  // Discovery changing during a reconnect must never redirect that token/ACK.
  if(!pack||!base){
   if(!navigator.onLine&&!explicitServer&&!sameOrigin)base=G.DEFAULT_SERVER;
   else base=await G.discover({explicit:explicitServer,sameOrigin,origin:location.origin,machine});
  }
  const saved=pack?{playerId,token,displayName:pack.profile?.name||''}:G.readSession('sweets-shared-session-v176',base);playerId=String(saved.playerId||'');token=String(saved.token||'');
  if(playerId&&!pack)try{const identity={...saved,base},local=await readVerifiedCache(identity);if(local)await restoreCached(local,identity);}catch(problem){console.warn('[DownloadV255] local cache',problem?.message||problem);}
  if(pack&&responseCache)await window.SweetsPlayerProfileV255?.setTransport((method,body)=>api('profile',{method,body}),{id:playerId,base,response:responseCache});
  if(navigator.onLine){setConnectStep('サーバーの対応状況を確認しています');await confirmDownloadServer();}
  if(!navigator.onLine)throw Error('offline');
  setConnectStep('プレイヤー認証中');
  const identity=await api('',{method:'POST',sessionEndpoint:true,timeout:11000,body:{playerId,displayName:initialProfile.name||saved.displayName||'PLAYER'}});
  if(playerId&&identity.player?.id!==playerId)throw Error('download_player_mismatch');
  playerId=String(identity.player?.id||'');token=String(identity.token||'');if(!playerId||!token)throw Error('download_session_invalid');
  G.writeSession('sweets-shared-session-v176',base,{playerId,token,displayName:identity.player.displayName});G.set('sweets-shared-server-v176',base);
  setConnectStep('プロフィールとCREDITを取得しています');
  let profile=await api('profile',{timeout:11000});if(!profile.profileReady){setConnectStep('プロフィールを初期登録しています');profile=await api('profile',{method:'POST',timeout:11000,body:{profile:initialProfile}});}
  setConnectStep('取得したプレイヤー情報を反映しています');
  await window.SweetsPlayerProfileV255?.setTransport((method,body)=>api('profile',{method,body}),{id:playerId,base,response:profile});
  await acceptResponse(profile);connectStep='接続完了';
  if(!pack&&!locked()){const savedDraft=G.read(draftKey(),null);app.bets=Array.isArray(savedDraft)&&savedDraft.length===10&&savedDraft.every(n=>Number.isSafeInteger(n)&&n>=0)?savedDraft:Array(10).fill(0);app.enabled=app.bets.map(n=>n>0);}
  if(session&&['ready','preparing'].includes(session.status)&&!started)await acceptResponse(await api('active'));
  if(!locked()&&!pack)message='各ゲームのBETを選んで、1ゲーム分をダウンロードしてください。';
  requestId=G.get(requestKey(),'');error='';if(pendingComplete)await sync();
 }catch(problem){if(!pack)error=safeError(problem);else message='保存したゲームを再生できます。進み具合は接続後に同期します。';console.warn('[DownloadV255] connect',problem?.message||problem);}
 finally{connecting=false;if(profileReady||pack)prepareAssets();render();scheduleUI(app);}
}
async function prepare(){
 if(busy||connecting||started&&!localComplete)return false;
 if(pack&&!localComplete){await prepareAssets();return assetsReady;}
 if(!profileReady||!wallet||!playerId){await initialize();if(!profileReady||!wallet)return false;}
 if(localComplete&&pendingComplete&&!await sync())return false;
 const bets=session?.status==='failed'?[...session.bets]:[...app.bets];
 if(!bets.some(n=>n>0)){message='参加するゲームのBETを追加してください。';render();return false;}
 if(bets.reduce((n,value)=>n+value,0)>wallet.credit){error='CREDITが足りません。BETを減らしてください。';render();return false;}
 busy=true;error='';message='サーバーへゲームを依頼しています…';render();prepareAssets();
 try{
  if(!requestId||session?.status==='complete'){requestId='dl255-'+crypto.randomUUID();G.set(requestKey(),requestId);}
  const result=await api('prepare',{method:'POST',body:{requestId,bets,gameIds:[...SweetsLineup.ids]}});
  pack=null;started=false;localComplete=false;pendingComplete=false;await acceptResponse(result);return true;
 }catch(problem){error=safeError(problem);return false;}
 finally{busy=false;render();}
}
function repaint(){
 for(const slot of slots){
  const engine=slot.engine;
  // The checkpoint cancels nativeStart's temporary opening job. Its matching
  // 'waiting' view event will never arrive, so do not retain a refill/queued
  // presentation that hides the restored cookies (especially while paused).
  if(!engine.kind||engine.kind==='cookie'){
   stopPour(slot);stopShatter(slot);stopHammerTransfer(slot);clearMarks(slot);
   slot.event={phase:engine.processed>=8?'complete':'waiting',restored:true};slot.cookieMiniState=null;slot.catchUp=true;
  }
  slot.dirtyMain=slot.dirtyMini=true;slot.reachBoardKey=null;slot.reachStatus='idle';
 }
 renderRoundResult(app);scheduleUI(app);
}
function restoreNative(ball){
 const state=checkpointAt(ball);if(!state)throw Error('download_checkpoint_missing');
 rng?.dispose();rng=null;callbacks=null;
 // Starting once installs the original game's callbacks. Its temporary board
 // is immediately replaced by the authenticated server checkpoint.
 const originals=app.engines.map(engine=>engine.random),appRandom=app.random;app.random=()=>.5;app.engines.forEach(engine=>{engine.random=()=>.5;engine.running=false;engine.paused=false;});
 app.phase='ready';app.bets=[...session.bets];app.credit=app.displayCredit=bankAfterBet();app.__sugarWorkRoundId=session.id;app.__downloadRoundId=session.id;
 try{if(nativeStart.call(app)===false)throw Error('download_native_start_rejected');}finally{app.random=appRandom;app.engines.forEach((engine,i)=>engine.random=originals[i]);}
 rng=R.installReplayTapes(app,pack.playback.rngTapes,state.randomOffsets);R.restore(app,state,{wallet:false,notify:false});
 app.phase=ball>=8?'result':'playing';app.paused=false;app.dealing=ball<8;app.fastForward=false;app.credit=app.displayCredit=bankAfterBet();
 for(const engine of app.engines){engine.paused=false;engine.presentationRate=1;}
 if(ball>=8){app.result={elapsed:0,duration:1800};app.totalWin=number(session.totalWin??pack.totalWin);}
 renderer.mount(pack.playback.recording);renderer.renderAt(playbackMs);repaint();
}
async function play(){
 if(busy||localComplete||!pack)return false;if(!assetsReady&&!await prepareAssets())return false;
 try{
  error='';if(!started){restoreNative(stableBall);cursor=stableBall;playbackMs=stableMs;started=true;settling=false;}
  playing=true;userPaused=false;syncPause();lastFrame=null;panel.dataset.collapsed='true';message='録画を再生しています。';wake();activateGameAudio({gesture:true});render();return true;
 }catch(problem){error='保存したゲームを再開できませんでした。接続して同じ録画を再取得してください。';playing=false;console.error('[DownloadV255] replay',problem);render();return false;}
}
function pause(){playing=false;userPaused=true;syncPause();lastFrame=null;persist().then(syncProgress).catch(()=>{});render();return true;}
function stopped(){return !playing||app.paused||document.hidden||menuOpen||userPaused||!inView;}
function reconcile(ball){
 const state=checkpointAt(ball);if(!state)return;
 const phase=app.phase;R.restore(app,state,{wallet:false,notify:false});
 app.credit=bankAfterBet();if(phase==='playing'&&ball<8)app.phase='playing';
 app.paused=false;app.fastForward=false;for(const engine of app.engines){engine.paused=false;engine.presentationRate=1;}
 if(ball===8){app.phase='playing';app.credit=app.displayCredit=bankAfterBet();app.finishRound();}
 repaint();
}
function tick(now){
 frame=0;try{
  if(!started||localComplete)return;
  if(stopped()){lastFrame=null;return;}
  // Recorded transforms need no physics integration. Keep their active clock
  // at real speed on a slow renderer; the next HIT remains a hard boundary.
  // Pause/hidden transitions clear lastFrame, so they contribute no elapsed time.
  const elapsed=lastFrame===null?0:Math.max(0,now-lastFrame);lastFrame=now;
  playbackTiming.frames++;playbackTiming.activeMs+=elapsed;playbackTiming.maxFrameMs=Math.max(playbackTiming.maxFrameMs,elapsed);
  if(app.phase==='error')throw Error(app.drawError||'download_native_error');
  if(settling){
   playbackTiming.settlingMs+=elapsed;
   if(R.stable(app,cursor)&&(cursor<8||app.enabled.every((yes,i)=>!yes||app.paid[i]))){reconcile(cursor);settling=false;stableBall=cursor;stableMs=playbackMs;seq++;persist().catch(()=>{});syncProgress();}
   else if((settleStamp+=elapsed)>90000)throw Error('download_native_settlement_timeout');
  }else if(cursor<8){
   const hit=pack.playback.recording.hits[cursor];playbackMs=Math.min(hit.atMs,playbackMs+elapsed);renderer.renderAt(playbackMs);
   if(playbackMs>=hit.atMs&&!app.drawHeld&&typeof callbacks?.onNumber==='function'&&callbacks.onNumber(hit.number)!==false){cursor++;if(pack.playback.sugarStates?.[cursor])window.SweetsSugarChallengeV254?.accept(pack.playback.sugarStates[cursor]);settling=true;settleStamp=0;}
  }else{playbackMs=Math.min(pack.playback.recording.durationMs,playbackMs+elapsed);renderer.renderAt(playbackMs);}
  if(cursor===8&&app.phase==='complete'&&!settling&&playbackMs>=pack.playback.recording.durationMs){finishLocal();return;}
  render();wake();
 }catch(problem){playing=false;userPaused=true;syncPause();error='再生を一時停止しました。保存した位置から再開できます。';started=false;cursor=stableBall;playbackMs=stableMs;console.error('[DownloadV255] playback',problem);persist().catch(()=>{});render();}
}
function wake(){if(!frame&&started&&!localComplete&&!stopped())frame=requestAnimationFrame(tick);}
async function syncProgress(){
 if(progressTask)return progressTask;
 if(!session||!navigator.onLine||seq<=ackSeq)return false;
 const sentSeq=seq;progressTask=(async()=>{try{const value=await api('progress',{method:'POST',body:{sessionId:session.id,seq:sentSeq,ballIndex:stableBall,playbackMs:stableMs}});ackSeq=Math.max(ackSeq,sentSeq);applyWallet(value.wallet);if(!pendingComplete)error='';return true;}catch{return false;}finally{progressTask=null;render();}})();return progressTask;
}
async function finishLocal(){
 playing=false;localComplete=true;pendingComplete=true;stableBall=cursor=8;stableMs=playbackMs=pack.playback.recording.durationMs;seq++;
 app.credit=app.displayCredit=Number(pack.creditAfter??wallet.credit);if(pack.sugarState)window.SweetsSugarChallengeV254?.accept(pack.sugarState);
 message='1ゲームの再生が完了しました。';panel.dataset.collapsed='true';render();await persist().catch(()=>{});await sync();render();
}
function sync(){if(syncTask)return syncTask;syncTask=syncNow().finally(()=>{syncTask=null;});return syncTask;}
async function syncNow(){
 if(!playerId||!token||!navigator.onLine){online=false;render();return false;}
 try{
  if(pendingComplete){const value=await api('complete',{method:'POST',body:{sessionId:session.id}});session=value.session;pendingComplete=false;ackSeq=Math.max(seq,number(session?.progress?.seq));await acceptResponse(value);await persist();message='再生完了を同期しました。次のBETへ進めます。';}
  else if(pack&&seq>ackSeq){if(!await syncProgress())return false;}
  else await acceptResponse(await api('profile'));
  await window.SweetsPlayerProfileV255?.flush();error='';render();return true;
 }catch(problem){error=pendingComplete?'再生は完了しています。通信が戻ると完了を同期します。':safeError(problem);render();return false;}
}
async function nextRound(){
 if(!localComplete)return false;if(pendingComplete&&!await sync())return false;
 rng?.dispose();rng=null;pack=null;started=false;playing=false;localComplete=false;session=null;requestId='';G.set(requestKey(),'');callbacks=null;userPaused=false;
 nativePrepare.call(app);app.credit=app.displayCredit=Number(wallet?.credit)||0;message='BETを選んで、次の1ゲームをダウンロードしてください。';error='';panel.dataset.collapsed='false';renderRoundResult(app);syncPause();render();return true;
}
async function chooseEdition(){pause();await persist().catch(()=>{});window.SweetsEditionV255.show();}
function render(){
 if(!panel)return;
 const status=panel.querySelector('#download-v255-status'),progress=panel.querySelector('progress'),total=app.bets.reduce((n,value)=>n+value,0),ready=!!pack&&assetsReady&&!localComplete;
 let text=error||message;
 if(!error&&assetsProgress&&!assetsReady)text+=(text?'\n':'')+`ゲーム素材 ${Math.floor((assetsProgress.bytes||0)/1048576)} / ${Math.ceil((assetsProgress.totalBytes||0)/1048576)} MB を保存中（${assetsProgress.done||0} / ${assetsProgress.total||0}）`;
 if(!error&&started&&!localComplete)text=(stopped()?'一時停止中。':'再生中。')+`${cursor} / 8球`;
 if(!online&&pack)text+='\n端末の録画を使用中・接続後に進み具合を同期';
 if(!profileReady&&!pack&&base)text+='\n接続先: '+base;
 if(status.textContent!==text)status.textContent=text;status.classList.toggle('dl255-error',!!error);status.classList.toggle('dl255-offline',!online&&!!pack);
 const putText=(selector,value)=>{const node=panel.querySelector(selector);if(node.textContent!==value)node.textContent=value;};
 putText('[data-dl-balls]',localComplete?'8/8球 · '+(pendingComplete?'同期待ち':'完了'):started?cursor+'/8球':'ダウンロード版');
 putText('[data-dl-wallet]',wallet?number(started?app.displayCredit:locked()?bankAfterBet():wallet.credit).toLocaleString('ja-JP'):'確認中');putText('[data-dl-bet]',number(locked()?session.totalBet:total).toLocaleString('ja-JP'));
 progress.hidden=!started&&!assetsProgress;progress.max=started?8:Math.max(1,assetsProgress?.total||1);progress.value=started?cursor:assetsProgress?.done||0;
 const button=name=>panel.querySelector(`[data-dl-action="${name}"]`);
 const collapsed=panel.dataset.collapsed==='true';putText('[data-dl-action="toggle"]',collapsed?'+':'−');button('toggle').setAttribute('aria-expanded',String(!collapsed));
 button('prepare').hidden=!!pack&&!localComplete||session?.status==='preparing'||localComplete;button('prepare').disabled=busy||connecting||!profileReady;button('prepare').textContent=session?.status==='failed'?'準備を再試行':'1ゲーム分をダウンロード';
 button('play').hidden=!pack||localComplete||started&&playing;button('play').disabled=!ready||busy;button('play').textContent=started||stableBall?'続きから再生':'録画を再生';
 button('pause').hidden=!started||localComplete;button('pause').textContent=playing&&!stopped()?'一時停止':'再開';
 button('sync').hidden=!error&&assetsReady&&!pendingComplete&&online;button('sync').textContent=!assetsReady?'保存を再試行':pendingComplete?'完了を同期':'接続を再試行';
 button('next').hidden=!localComplete;button('next').disabled=pendingComplete&&!navigator.onLine;
 document.documentElement.dataset.downloadState=session?.status==='preparing'?'preparing':localComplete?'complete':started?(stopped()?'paused':'playing'):ready?'ready':pack?'saving':'setup';
 window.__sweetsDownloadActive=!!pack&&!localComplete;
}
const panel=document.createElement('aside');panel.id='download-v255-panel';panel.className='dl255-panel';panel.dataset.collapsed='false';panel.setAttribute('aria-label','ダウンロード版の再生');
panel.innerHTML='<header><strong data-dl-balls>ダウンロード版</strong><button type="button" data-dl-action="pause" hidden>一時停止</button><button type="button" data-dl-action="toggle" aria-label="再生パネルを開閉" aria-expanded="true">−</button></header><div class="dl255-body"><p id="download-v255-status" class="dl255-status" role="status" aria-live="polite"></p><progress class="dl255-progress" max="8" value="0" aria-label="ダウンロードと再生の進み具合" hidden></progress><div class="dl255-wallet"><span>CREDIT <b data-dl-wallet>確認中</b></span><span>BET <b data-dl-bet>0</b></span></div><div class="dl255-actions"><button type="button" data-dl-action="prepare">1ゲーム分をダウンロード</button><button type="button" data-dl-action="play" hidden>録画を再生</button><button type="button" data-dl-action="next" hidden>次のBETへ</button><button type="button" data-dl-action="sync">接続を再試行</button><button type="button" data-dl-action="edition">版を選び直す</button></div><p class="dl255-note">BETと結果はサーバーで確定します。<br>ダンゴデビンゴはおまかせ配置です。</p></div>';
document.body.append(panel);
const rouletteLoading=document.querySelector('#cookie-roulette .a8-loading');if(rouletteLoading)rouletteLoading.textContent='録画を再生すると抽選が始まります';
panel.addEventListener('click',event=>{const action=event.target.closest('[data-dl-action]')?.dataset.dlAction;if(!action)return;if(action==='prepare')prepare();else if(action==='play')play();else if(action==='pause')playing&&!stopped()?pause():play();else if(action==='next')nextRound();else if(action==='edition')chooseEdition();else if(action==='sync'){if(!assetsReady)prepareAssets();if(pendingComplete)sync();else initialize();}else if(action==='toggle'){panel.dataset.collapsed=String(panel.dataset.collapsed!=='true');render();}});
// All native BET controls remain, with a clear button for each game's draft.
for(const slot of slots){const clear=document.createElement('button');clear.type='button';clear.className='dl255-clear-bet';clear.textContent='0 BET';clear.setAttribute('aria-label',SweetsLineup.catalog[SweetsLineup.ids[slot.i]].name+'のBETを0にする');clear.onclick=()=>app.setBet(slot.i,0);slot.controls.append(clear);}
Arcade.prototype.setBet=function(index,value){if(this!==app)return nativeSetBet.call(this,index,value);if(!profileReady||locked()||busy||!wallet||!Number.isSafeInteger(value)||value<0||this.bets.reduce((sum,n,i)=>sum+(i===index?value:n),0)>wallet.credit)return false;const result=nativeSetBet.call(this,index,value);if(result){G.write(draftKey(),this.bets);render();}return result;};
Arcade.prototype.start=function(){if(this!==app)return nativeStart.call(this);if(pack&&!localComplete)play();else prepare();return false;};
Arcade.prototype.prepare=function(){if(this!==app)return nativePrepare.call(this);if(locked()||started&&!localComplete)return false;return nativePrepare.call(this);};
Arcade.prototype.finishRound=function(){if(this!==app||!pack)return nativeFinish.call(this);panel.dataset.collapsed='true';this.roundWins=SweetsLineup.ids.map(id=>number((Array.isArray(pack.games)?pack.games:Object.values(pack.games||{})).find(game=>game.id===id)?.win));nativeFinish.call(this);this.totalWin=number(session.totalWin??pack.totalWin);this.onChange(this);render();};
Arcade.prototype.beginPayout=function(){if(this!==app||this.phase!=='result'||!pack)return false;const from=bankAfterBet(),to=Number(pack.creditAfter??wallet.credit),amount=Math.max(0,to-from);this.credit=to;this.displayCredit=from;this.payout=amount?{from,to,amount,elapsed:0,duration:Math.min(2600,Math.max(1100,700+Math.log2(amount+1)*110))}:null;this.phase=this.payout?'paying':'complete';this.onChange(this);return true;};
Object.defineProperty(rouletteDrawSource,'ready',{configurable:true,get:()=>!!pack});rouletteDrawSource.start=value=>{callbacks=value;return true;};rouletteDrawSource.reset=()=>{callbacks=null;renderer.driver?.setPaused(true);};rouletteDrawSource.pause=()=>{renderer.driver?.setPaused(true);lastFrame=null;wake();};
startReadyRound=function(){if(localComplete)nextRound();else if(pack)play();else prepare();return false;};scheduleAutoRound=function(){stopAutoRound();countdownText(started?'PLAY':pack?'READY':'BET',started?'録画を再生':pack?'再生できます':'BETを選択');};syncResultAuto=function(){stopResultAuto();};nextFromResult=()=>{nextRound();};$('result-next').onclick=nextFromResult;$('start').onclick=startReadyRound;$('pause').onclick=()=>playing&&!stopped()?pause():play();
hud=function(value){nativeHud(value);const editable=profileReady&&!locked()&&!busy&&value.phase==='ready';for(const slot of slots)for(const button of slot.controls.querySelectorAll('button'))button.disabled=!editable;$('start').disabled=busy||connecting||(!pack&&!profileReady)||started&&!localComplete;$('start').textContent=localComplete?'次のBETへ':pack?'録画を再生':'1ゲーム分をDL';};
// Replay never increments browser-only records. Server statistics are displayed
// by the common profile adapter, so restoring a checkpoint cannot count twice.
recordBook.capture=()=>({changed:false,unlocked:[],round:false});playerLounge.capture=()=>false;
window.SweetsDangoThinkingV251={state:()=>({enabled:false,active:false,ballCount:cursor,remainingMs:0,closesAt:0,roundId:session?.id||''}),checkpointPlacement:async()=>false,beforeSix:async()=>true};
stopAutoRound();stopResultAuto();app.bets=Array(10).fill(0);app.enabled=Array(10).fill(false);app.credit=app.displayCredit=0;
document.addEventListener('visibilitychange',()=>{lastFrame=null;if(document.hidden)persist().then(syncProgress).catch(()=>{});else wake();render();});
window.addEventListener('pagehide',()=>{persist().catch(()=>{});});window.addEventListener('online',()=>{online=true;if(pendingComplete)sync();else if(session?.status==='preparing')schedulePoll();else if(!profileReady)initialize();else syncProgress();prepareAssets();render();});window.addEventListener('offline',()=>{online=false;render();});
// A failed route or a restarted server does not necessarily change the browser's
// online flag. Retry only unsent progress/ACKs, with one request chain in flight.
setInterval(()=>{if(navigator.onLine&&playerId&&token&&(pendingComplete||pack&&seq>ackSeq))sync().catch(()=>{});},20000);
// Reprobe a restarted server even when navigator.onLine never changes.
setInterval(()=>{if(navigator.onLine&&!connecting&&!profileReady&&!pack)initialize().catch(()=>{});},20000);
window.SweetsDownloadV255={version:255,prepare,play,pause,sync,nextRound,chooseEdition,checkpoint:persist,initialize,describe:()=>({version:255,edition:'download',playerId,machine,server:base,connectStep,online,hydrated:profileReady,assetsReady,assetsProgress:assetsProgress?{...assetsProgress}:null,session:session?{id:session.id,status:session.status,requestId:session.requestId,totalBet:session.totalBet,totalWin:session.totalWin}:null,packageReady:!!pack,started,playing:playing&&!stopped(),cursor,stableBall,playbackMs,stableMs,seq,ackSeq,localComplete,pendingComplete,wallet:wallet?{...wallet}:null,bets:[...app.bets],phase:app.phase,draws:[...app.draws],timing:{...playbackTiming},error,message,streamingClientPresent:!!window.SweetsSharedMachine})};
render();scheduleUI(app);initialize();
})();
