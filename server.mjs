process.env.SWEETS_BET_DURATION_MS??='20000';
// The legacy v213 synthetic-player runner remains disabled. v220 advances
// empty authoritative rounds directly inside the server core instead.
process.env.SWEETS_AUTONOMOUS_ROUNDS='0';
process.env.SWEETS_CONTINUOUS_PHYSICAL_ROUNDS??='1';
process.env.SWEETS_PLAYER_STABLE_MS??='2800';
process.env.SWEETS_ROUND_START_DELAY_MS??='1100';
process.env.SWEETS_RESULT_GRACE_MS??='3200';
// A missing physical host must never be replaced by an unrequested random
// eight-ball draw. The round waits for the real host to reconnect instead.
process.env.SWEETS_HOST_FALLBACK_DELAY_MS??=String(24*60*60*1000);

await import('./server-startup-sanitize-v217.mjs');
await import('./server-rtc-preload.mjs');
await import('./server-payout-preload-v3.mjs');
// Streaming starts without a browser. Its first Download request warms the
// same trusted engine lazily; the Download launcher warms it at startup.
const downloadComputerKeyV255=Symbol.for('sweets-link.download-v255.computer');
if(!globalThis[downloadComputerKeyV255]){
 let computer=null,loading=null,error=null,closed=false;
 const enabled=process.env.SWEETS_DOWNLOAD_ENABLED!=='0';
 async function loadComputer(){
  if(!enabled||closed)throw Error('download_server_unavailable');
  if(computer)return computer;
  if(!loading)loading=import('./server-download-compute-v255.mjs').then(({createDownloadComputerV255})=>{
   computer=createDownloadComputerV255({baseUrl:()=>`http://127.0.0.1:${Number(process.env.PORT||3000)}`,root:process.cwd()});return computer;
  }).catch(cause=>{error=String(cause?.message||cause);loading=null;throw cause;});
  return loading;
 }
 globalThis[downloadComputerKeyV255]={
  async ready(){const value=await loadComputer();const result=await value.ready();error=null;return result;},
  async compute(input){const value=await loadComputer();return value.compute(input);},
  status(){return computer?.status()||{enabled,ready:false,busy:0,completed:0,error};},
  async close(){closed=true;await computer?.close();}
 };
}
await import('./server-core-loader-v220.mjs');
if(process.env.SWEETS_SERVER_EDITION==='download'){
 globalThis[downloadComputerKeyV255].ready().then(()=>globalThis[Symbol.for('sweets-link.download-v255.service')]?.recover()).catch(error=>console.error('[DownloadV255] startup',error?.message||error));
}else{
 // Resume committed jobs from disk even if a server was restarted in the
 // Streaming edition. Merely serving Streaming does not launch Chromium.
 globalThis[Symbol.for('sweets-link.download-v255.service')]?.recover();
}

