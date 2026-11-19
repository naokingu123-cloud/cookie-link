import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
import {cleanProfile} from './server-stations-v235.mjs';

const zip=promisify(gzip),hash=value=>createHash('sha256').update(value).digest('hex');
const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
const fail=(code,status=409)=>{throw Object.assign(Error(code),{status});};
const COMPUTER=Symbol.for('sweets-link.download-v255.computer');
const SERVICE=Symbol.for('sweets-link.download-v255.service');
const SERVER_EDITION=process.env.SWEETS_SERVER_EDITION==='download'?'download':'streaming';

export function createDownloadServiceV255({wallet,compute=input=>{
 const computer=globalThis[COMPUTER];if(!computer?.compute)fail('download_server_unavailable',503);return computer.compute(input);
},status=()=>globalThis[COMPUTER]?.status?.()||{enabled:SERVER_EDITION==='download',ready:false,error:SERVER_EDITION==='download'?'download_worker_not_ready':null},getProfile,setProfile,listMachines=()=>[],dataDir=process.env.SWEETS_DATA_DIR||path.join(process.cwd(),'data')}={}){
 const ledger=wallet?.downloadV255;if(!ledger)throw Error('download_wallet_bridge_missing');
 const directory=path.resolve(dataDir,'download-v255'),jobs=new Map();let computeTail=Promise.resolve();
 function runtime(){
  const current=status()||{};
  return {enabled:current.enabled??SERVER_EDITION==='download',ready:current.ready===true,activeJobs:jobs.size,busy:current.busy??jobs.size,completed:current.completed||0,error:current.error||null};
 }
 function profile(playerId){const saved=getProfile?.(playerId)||{};return {profile:cleanProfile(saved.profile||saved),profileReady:saved.ready===true,serverUpdatedAt:saved.updatedAt||null};}
 function store(machineId,playerId,sessionId,value){
  const relative=hash(machineId).slice(0,24)+'/'+hash(playerId).slice(0,24)+'/'+sessionId+'.json';
  const filename=path.join(directory,relative),bytes=Buffer.from(JSON.stringify(value));fs.mkdirSync(path.dirname(filename),{recursive:true});
  const temporary=filename+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,filename);}finally{try{fs.unlinkSync(temporary);}catch{}}
  return {file:relative,sha256:hash(bytes),bytes:bytes.length};
 }
 async function load(machineId,playerId,sessionId){
  const meta=ledger.packageInfo(machineId,playerId,sessionId);if(!meta)return null;
  if(!/^[a-f0-9]{24}\/[a-f0-9]{24}\/dl255-[A-Za-z0-9-]{16,100}\.json$/.test(meta.file))fail('download_package_unavailable',503);
  const expectedPrefix=hash(machineId).slice(0,24)+'/'+hash(playerId).slice(0,24)+'/';if(!meta.file.startsWith(expectedPrefix))fail('download_package_owner_mismatch',500);
  let bytes;try{bytes=await fs.promises.readFile(path.join(directory,meta.file));}catch{fail('download_package_unavailable',503);}
  if(bytes.length!==meta.bytes||hash(bytes)!==meta.sha256)fail('download_package_integrity_error',503);
  const result=JSON.parse(bytes.toString());if(result.sessionId!==sessionId)fail('download_package_session_mismatch',500);return result;
 }
 function queue(machineId,playerId,sessionId){
  const key=machineId+'\0'+playerId+'\0'+sessionId;if(jobs.has(key)||!runtime().enabled)return;
  const run=computeTail.then(async()=>{
   const input=ledger.work(machineId,playerId,sessionId);if(!input)return;
   const result=await compute(input);
   ledger.finish(machineId,playerId,sessionId,result,value=>store(machineId,playerId,sessionId,value));
  }).catch(error=>{
   try{ledger.failed(machineId,playerId,sessionId,error);}catch(saveError){console.error('[DownloadV255] error state save',saveError?.message||saveError);}
   console.warn('[DownloadV255] preparation',String(error?.message||error));
  }).finally(()=>jobs.delete(key));
  jobs.set(key,run);computeTail=run;
 }
 async function response(machineId,playerId,{sessionId,includePackage=false}={}){
  const value=ledger.state(machineId,playerId,{sessionId});
  const output={ok:true,...value,...profile(playerId),serverEdition:SERVER_EDITION,download:runtime()};
  if(includePackage&&['ready','complete'].includes(value.session?.status))output.package=await load(machineId,playerId,value.session.id);
  return output;
 }
 async function send(req,res,statusCode,payload){
  let bytes=Buffer.from(JSON.stringify(payload));
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  if(payload.package&&/\bgzip\b/.test(String(req.headers['accept-encoding']||''))){bytes=await zip(bytes,{level:6});headers['Content-Encoding']='gzip';headers.Vary='Origin, Accept-Encoding';}
  headers['Content-Length']=bytes.length;res.writeHead(statusCode,headers);res.end(bytes);
 }
 function noMoneyInput(body){for(const key of ['totalWin','credit','creditAfter','creditBefore','wallet','seed','previousState','finalState','state','rate','sugarState','games'])if(Object.prototype.hasOwnProperty.call(body||{},key))fail('download_client_result_forbidden',400);}
 async function handle(req,res,url,{machineId,playerId,action,body={}}){
  if(!['profile','prepare','active','progress','complete'].includes(action))fail('not_found',404);
  if(action==='profile'){
   if(req.method==='POST'){noMoneyInput(body);const clean=cleanProfile(body.profile||body);await setProfile?.(playerId,clean);}
   else if(req.method!=='GET')fail('method_not_allowed',405);
   await send(req,res,200,await response(machineId,playerId));return;
  }
  if(action==='active'&&req.method==='GET'){
   const sessionId=url.searchParams.get('sessionId')||undefined,value=ledger.state(machineId,playerId,{sessionId});
   if(value.session?.status==='preparing')queue(machineId,playerId,value.session.id);
   await send(req,res,200,await response(machineId,playerId,{sessionId,includePackage:url.searchParams.get('metadata')!=='1'}));return;
  }
  if(req.method!=='POST')fail('method_not_allowed',405);noMoneyInput(body);
  if(action==='prepare'){
   if(!runtime().enabled)fail('download_server_unavailable',503);
   const current=profile(playerId);if(!current.profileReady)fail('download_profile_required');
   const result=ledger.prepare(machineId,playerId,{requestId:body.requestId,bets:body.bets,gameIds:body.gameIds,profile:current.profile});
   if(['preparing','failed'].includes(result.session.status))queue(machineId,playerId,result.session.id);
   const payload=await response(machineId,playerId,{sessionId:result.session.id,includePackage:['ready','complete'].includes(result.session.status)});
   payload.created=result.created;await send(req,res,payload.session.status==='preparing'||payload.session.status==='failed'?202:200,payload);return;
  }
  if(action==='progress'){ledger.progress(machineId,playerId,body);await send(req,res,200,await response(machineId,playerId,{sessionId:body.sessionId}));return;}
  if(action==='complete'){ledger.complete(machineId,playerId,body);await send(req,res,200,await response(machineId,playerId,{sessionId:body.sessionId}));return;}
  fail('not_found',404);
 }
 function admin(machineId){
  const download=runtime(),players=ledger.list(machineId).map(row=>{
   const detail=profile(row.playerId),session=row.active||row.last;
   return {...row,...detail,displayName:detail.profile.name,credit:row.wallet?.credit??null,session,status:session?.status||'idle',progress:session?.progress||null};
  });return {ok:true,serverEdition:SERVER_EDITION,download,status:download,players};
 }
 function recover(){if(!runtime().enabled)return;for(const machineId of new Set([...listMachines(),...(ledger.machines?.()||[])]))for(const item of ledger.pending(machineId))queue(item.machineId,item.playerId,item.sessionId);}
 const service={handle,admin,recover,status:runtime,locked:ledger.locked,serverEdition:SERVER_EDITION,wait:()=>Promise.all([...jobs.values()])};
 globalThis[SERVICE]=service;return service;
}
