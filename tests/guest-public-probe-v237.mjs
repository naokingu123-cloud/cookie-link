// Read-only external check. Never logs credentials or changes production sessions.
import fs from 'node:fs/promises';
const config=JSON.parse(await fs.readFile(new URL('../shared-endpoint.json',import.meta.url),'utf8'));
const origin='https://naokingu123-cloud.github.io';
const result={server:config.server,verified:false};
try{
 const health=await fetch(config.server+'/api/health',{headers:{Origin:origin},redirect:'manual',signal:AbortSignal.timeout(10000)});
 result.healthStatus=health.status;result.healthCors=health.headers.get('access-control-allow-origin');
 const data=await health.json().catch(()=>null);
 result.publicHealth=health.ok&&data?.ok===true&&data?.source==='physical-host';
 const preflight=await fetch(config.server+'/api/session',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'},redirect:'manual',signal:AbortSignal.timeout(10000)});
 result.preflightStatus=preflight.status;result.preflightCors=preflight.headers.get('access-control-allow-origin');
 result.verified=result.publicHealth&&preflight.ok&&[origin,'*'].includes(result.healthCors)&&[origin,'*'].includes(result.preflightCors);
}catch(error){result.error=String(error?.cause?.code||error?.name||'unreachable');}
console.log('PUBLIC_GUEST_EXTERNAL_READ_ONLY',JSON.stringify(result));
// A stopped Windows machine is not a code-test failure; the result remains explicit.
