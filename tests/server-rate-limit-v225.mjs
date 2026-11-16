import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'sweets-rate-v225-'));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const agent=new http.Agent({keepAlive:true,maxSockets:12});
let child,output='';

async function freePort(){
 const listener=net.createServer();
 await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
 const port=listener.address().port;
 await new Promise(resolve=>listener.close(resolve));
 return port;
}

function get(port,pathname,headers={},hostname='127.0.0.1'){
 return new Promise((resolve,reject)=>{
  const req=http.get({hostname,port,path:pathname,agent,headers:{Origin:'https://naokingu123-cloud.github.io',...headers}},res=>{
   const chunks=[];
   res.on('data',chunk=>chunks.push(chunk));
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString('utf8')}));
   res.on('error',reject);
  });
  req.setTimeout(5000,()=>req.destroy(new Error('HTTP request timed out')));
  req.on('error',reject);
 });
}

async function ready(port){
 for(let attempt=0;attempt<100;attempt++){
  if(child.exitCode!==null)throw new Error('Server exited before readiness:\n'+output);
  try{if((await get(port,'/api/health')).status===200)return;}catch{}
  await delay(50);
 }
 throw new Error('Server did not become ready:\n'+output);
}

try{
 for(const filename of ['server.mjs','server-core.mjs','server-core-loader-v220.mjs','server-startup-sanitize-v217.mjs','server-rtc-preload.mjs','server-payout-preload-v3.mjs']){
  // This optional override lets the exact same integration test demonstrate
  // the regression against an archived, unmodified server core.
  const source=filename==='server-core.mjs'&&process.env.SWEETS_TEST_CORE_SOURCE||path.join(ROOT,filename);
  await fs.copyFile(source,path.join(temporary,filename));
 }
 const require=createRequire(import.meta.url);
 const wsDirectory=path.dirname(require.resolve('ws/package.json'));
 await fs.cp(wsDirectory,path.join(temporary,'node_modules','ws'),{recursive:true});
 await fs.mkdir(path.join(temporary,'assets'),{recursive:true});
 await fs.writeFile(path.join(temporary,'index.html'),'<!doctype html><title>Roulette load regression</title>');
 await fs.writeFile(path.join(temporary,'assets','roulette.js'),'window.rouletteAssetLoaded=true;');
 await fs.writeFile(path.join(temporary,'assets','roulette.png'),Buffer.from([137,80,78,71,13,10,26,10]));
 const port=await freePort();
 child=spawn(process.execPath,['server.mjs'],{
  cwd:temporary,
  env:{...process.env,PORT:String(port),SWEETS_DATA_DIR:path.join(temporary,'data'),SWEETS_DATA_FILE:path.join(temporary,'data','shared-machine.json'),SWEETS_ADMIN_TOKEN:'rate-regression-only'},
  stdio:['ignore','pipe','pipe']
 });
 child.stdout.on('data',chunk=>{output+=chunk;});
 child.stderr.on('data',chunk=>{output+=chunk;});
 await ready(port);

 const staticClient={'CF-Connecting-IP':'192.0.2.10'};
 const assets=['/','/assets/roulette.js','/assets/roulette.png'];
 const assetBurst=await Promise.all(Array.from({length:300},(_,i)=>get(port,assets[i%assets.length],staticClient)));
 assert.equal(assetBurst.filter(response=>response.status===200).length,300,'static load burst must not exhaust the API quota');
 assert.equal((await get(port,'/api/health',staticClient)).status,200,'API must remain available after asset loading');

 const limitedClient={'CF-Connecting-IP':'192.0.2.20'};
 const windowStartedAt=Date.now();
 const apiBurst=await Promise.all(Array.from({length:240},()=>get(port,'/api/health',limitedClient)));
 assert.ok(Date.now()-windowStartedAt<9000,'request burst must fit within one rate-limit window');
 assert.ok(apiBurst.every(response=>response.status===200),'240 API requests within the quota must be accepted');
 const blocked=await get(port,'/api/health',limitedClient);
 assert.equal(blocked.status,429,'the API quota must still reject excessive requests');
 const error=JSON.parse(blocked.text);
 assert.equal(error.ok,false);
 assert.equal(error.error,'rate_limited');
 assert.ok(Number.isInteger(error.retryAfterMs)&&error.retryAfterMs>0&&error.retryAfterMs<=10000,'429 must contain a bounded retry delay');
 assert.equal(Number(blocked.headers['retry-after']),Math.ceil(error.retryAfterMs/1000),'Retry-After must match the JSON wait duration');
 assert.match(blocked.headers['access-control-expose-headers']||'',/(^|,\s*)Retry-After(\s*,|$)/i,'cross-origin clients must be able to read Retry-After');
 assert.equal(blocked.headers['cache-control'],'no-store');

 for(const asset of assets){
  assert.equal((await get(port,asset,limitedClient)).status,200,'an exhausted API quota must not hide roulette assets: '+asset);
 }
 assert.equal((await get(port,'/api/health',{'CF-Connecting-IP':'192.0.2.21'})).status,200,'different visitors behind one local Cloudflare tunnel must have separate quotas');
 assert.equal((await get(port,'/api/health',{'CF-Connecting-IP':'2001:db8::21'})).status,200,'valid IPv6 visitor addresses must also be accepted');
 assert.equal((await get(port,'/api/health')).status,200,'a public visitor must not exhaust the local physical host quota');

 const directBurst=await Promise.all(Array.from({length:241},(_,i)=>get(port,'/api/health',{'X-Forwarded-For':`198.51.100.${i%240+1}`})));
 assert.ok(directBurst.some(response=>response.status===429),'untrusted X-Forwarded-For values must not create independent quotas');
 assert.equal((await get(port,'/api/health',{'CF-Connecting-IP':'not-an-ip'})).status,429,'invalid Cloudflare visitor values must fall back to the socket quota');

 let lanAddress;
 try{lanAddress=Object.values(os.networkInterfaces()).flat().find(address=>address&&!address.internal&&address.family==='IPv4')?.address;}catch{}
 if(lanAddress){
  const spoofed=await Promise.all(Array.from({length:241},(_,i)=>get(port,'/api/health',{'CF-Connecting-IP':`203.0.113.${i%240+1}`},lanAddress)));
  assert.ok(spoofed.some(response=>response.status===429),'direct non-loopback callers must not bypass the quota by inventing Cloudflare headers');
 }else console.log('[rate-v225] non-loopback header check skipped: interface information unavailable');

 await delay(error.retryAfterMs+100);
 assert.equal((await get(port,'/api/health',limitedClient)).status,200,'the API must recover after the advertised retry window without restarting');
 console.log('[rate-v225] PASS: 300 assets, API quota, tunnel visitor isolation, trusted headers, Retry-After, automatic recovery');
}finally{
 agent.destroy();
 if(child&&child.exitCode===null){
  child.kill('SIGTERM');
  await Promise.race([once(child,'exit'),delay(2000)]);
  if(child.exitCode===null){child.kill('SIGKILL');await once(child,'exit');}
 }
 await fs.rm(temporary,{recursive:true,force:true});
}
