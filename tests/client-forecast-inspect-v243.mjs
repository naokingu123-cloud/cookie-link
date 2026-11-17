import fs from 'node:fs/promises';
const s=await fs.readFile('optimized/app-01.js','utf8');
console.log('REACH_FUNCTION_NAMES', [...s.matchAll(/(?:async\s+)?function\s+\w*[Rr]each\w*\([^]*?\{/g)].map(m=>({at:m.index,name:m[0]})));
for(const name of ['tabReachBase','tabReachResults=','function reachContext(','function reachContextKey(','function chocoReachReady(','const tabReachCurrentValue','tabReachCurrentValue=']){
 let at=-1,count=0;const hits=[];while((at=s.indexOf(name,at+1))>=0){count++;if(hits.length<5)hits.push(s.slice(Math.max(0,at-350),at+1800));}console.log('CACHE_SOURCE',name,JSON.stringify({count,hits}));
}
let code=await fs.readFile('tests/client-profile-v243.mjs','utf8');
code=code.replace("for(const mode of ['baseline','loader-fixed'])","for(const mode of ['loader-fixed'])").replace('await sleep(4000)','await sleep(10000)');
code=code.replace("busy:s.engine?.busy,results:s.tabReachResults?.length", "busy:s.engine?.busy,base:s.tabReachBase,raw:s.tabReachResults?.slice(0,2),results:s.tabReachResults?.length");
code=code.replace("stations:!!window.SweetsStationsV235,round:","stations:!!window.SweetsStationsV235,telemetry:window.__lastStationV243,round:");
code=code.replace("await sleep(5500);",`await sleep(5500);
  await page.evaluate(()=>{const c=window.SweetsSharedMachine.client,send=c.send;c.send=function(m){if(m.type==='station_progress')window.__lastStationV243=m;return send.call(this,m);};});`);
const file=new URL('./.client-forecast-inspect-v243.generated.mjs',import.meta.url);await fs.writeFile(file,code);try{await import(file.href);}finally{await fs.rm(file,{force:true});}
