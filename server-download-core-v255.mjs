export function patchDownloadCoreV255(source){
 const once=(from,to,label)=>{const count=source.split(from).length-1;if(count!==1)throw Error('[DownloadCoreV255] '+label+' matches='+count);source=source.replace(from,to);};
 once("import http from 'node:http';","import http from 'node:http';\nimport {createDownloadServiceV255} from '../server-download-v255.mjs';",'download service');
 once("const payoutWallet=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];",`const payoutWallet=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];
const downloadServiceV255=createDownloadServiceV255({wallet:payoutWallet,
 getProfile:id=>{const p=db.players[id];return {profile:p?.stationProfileV235||{name:p?.displayName},ready:!!p?.stationProfileV235,updatedAt:p?.profileUpdatedAtV255||null};},
 setProfile:async(id,profile)=>{const p=db.players[id];if(!p)throw Object.assign(Error('unauthorized'),{status:401});p.stationProfileV235=profile;p.displayName=profile.name;p.profileUpdatedAtV255=now();scheduleSave();await flushDb();},
 listMachines:()=>Object.keys(db.machines)
});`,'download initialization');
 once("source:'physical-host',time:now(),betDurationMs:BET_DURATION_MS});","source:'physical-host',time:now(),betDurationMs:BET_DURATION_MS,serverEdition:downloadServiceV255.serverEdition,download:downloadServiceV255.status()});",'readiness');
 once(" const p=parts(url.pathname);",` const p=parts(url.pathname);
 if(req.method==='GET'&&p[0]==='api'&&p[1]==='admin'&&p[2]==='machines'&&p[4]==='download-v255'){
  if(!adminAllowed(req,url))return reply(res,403,{ok:false,error:'admin_required'});
  return reply(res,200,downloadServiceV255.admin(safeId(p[3])||MACHINE_DEFAULT));
 }`,'admin download summary');
 once(" const machineId=safeId(p[2])||MACHINE_DEFAULT,m=machine(machineId);",` const machineId=safeId(p[2])||MACHINE_DEFAULT,m=machine(machineId);
 if(p[3]==='download-v255')return downloadServiceV255.handle(req,res,url,{machineId,playerId:player.id,action:p[4],body:req.method==='POST'?await bodyJson(req):{}});
 if(p[3]==='round'&&['join','settle','checkpoint','leave'].includes(p[4])&&downloadServiceV255.locked(machineId,player.id))return reply(res,409,{ok:false,error:'download_session_active'});`,'authenticated download routes and financial lock');
 return source;
}
