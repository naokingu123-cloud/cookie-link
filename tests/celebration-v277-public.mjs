/* Read-only publication gate. Run in CI after the v277 behavioral jobs pass.
 * Only GET static resources on the public Pages origin; no game/API requests. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const root=fileURLToPath(new URL('../',import.meta.url));
const base='https://naokingu123-cloud.github.io/cookie-link/';
const output=path.join(root,'qa-celebration-v277-public/report.json');
const started=Date.now(),deadline=started+5*60*1000,concurrency=4;
const runtime=[
 'app-version.json','index.html','download-sw-v255.js',
 'assets/arcade-candy-sfx-v158.js','assets/arcade-candy-world-v157.js','assets/arcade-candy-world-v158.js',
 'assets/download-assets-v255.json','assets/download-cache-v255.js','assets/edition-choice-v255.js',
 'assets/game-menu-v91.js','assets/gelato-prism-v28.js','assets/sugar-challenge-v254.js',
 'assets/award-presentation-v277.js','assets/award-presentation-v277.css',
 'assets/celebration-art-v277.js','assets/celebration-audio-v277.js'
];
const report={ok:false,startedAt:new Date(started).toISOString(),completedAt:null,
 commit:process.env.GITHUB_SHA||null,url:base,maxWaitSeconds:300,concurrency,
 scope:'Static GET and SHA-256 only: changed runtime, all v277 art, all 41 original sounds and manifests. No gameplay, API, wallet or BET operations.',
 expectedVersion:null,expectedFiles:0,attempts:[],checks:[],finalVersionCheck:null};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=new Map(),latest=new Map(),matched=new Set();

async function filesUnder(relative){
 const entries=await fs.readdir(path.join(root,relative),{withFileTypes:true}),files=[];
 for(const entry of entries){
  const file=relative+'/'+entry.name;
  if(entry.isDirectory())files.push(...await filesUnder(file));
  else if(entry.isFile())files.push(file);
  else throw Error('Unexpected non-file public resource: '+file);
 }
 return files.sort();
}

async function check(file,attempt){
 const local=expected.get(file),result={path:file,attempt,checkedAt:new Date().toISOString(),
  expectedSha256:local.sha256,expectedBytes:local.bytes,status:null,bytes:0,sha256:null,matches:false};
 try{
  const remaining=deadline-Date.now();if(remaining<=0)throw Error('Publication wait deadline reached');
  const url=new URL(file,base);
  url.searchParams.set('verify-v277',(report.commit||report.expectedVersion)+'-'+attempt);
  const response=await fetch(url,{method:'GET',redirect:'error',
   headers:{'Cache-Control':'no-cache',Accept:'*/*'},signal:AbortSignal.timeout(Math.min(12000,remaining))});
  result.status=response.status;
  const bytes=Buffer.from(await response.arrayBuffer());result.bytes=bytes.length;result.sha256=hash(bytes);
  result.matches=response.status===200&&result.sha256===local.sha256&&result.bytes===local.bytes;
  if(file==='app-version.json'&&response.status===200){
   try{result.version=JSON.parse(bytes.toString('utf8')).version;}catch{result.version=null;}
  }
 }catch(error){result.error=String(error?.message||error);}
 latest.set(file,result);return result;
}

async function batch(files,attempt){
 let cursor=0;const results=[];
 async function worker(){while(cursor<files.length&&Date.now()<deadline){
  const result=await check(files[cursor++],attempt);results.push(result);
  if(result.matches)matched.add(result.path);
 }}
 await Promise.all(Array.from({length:Math.min(concurrency,files.length)},worker));
 return results;
}

try{
 const [art,sound]=await Promise.all([filesUnder('assets/celebration-art-v277'),filesUnder('assets/audio/celebration-v277')]);
 assert.equal(sound.filter(file=>file.endsWith('.wav')).length,41,'all 41 sound cues must be in the publication gate');
 assert.equal(art.filter(file=>file.endsWith('.png')).length,5,'all four award images and the line ornament must be checked');
 const files=[...new Set([...runtime,...art,...sound])].sort();
 for(const file of files){const bytes=await fs.readFile(path.join(root,file));expected.set(file,{bytes:bytes.length,sha256:hash(bytes)});}
 report.expectedVersion=JSON.parse(await fs.readFile(path.join(root,'app-version.json'),'utf8')).version;
 // The assets remain available to pinned offline editions after later releases.
 // Compare against the current checkout, rather than pinning the shell to 277.
 assert(typeof report.expectedVersion==='string'&&report.expectedVersion.length>0,'the checkout must declare a build version');
 report.expectedFiles=files.length;

 // Do not download all media while Pages is still serving the previous build.
 let attempt=0,ready=false;
 while(Date.now()<deadline){
  attempt++;
  const version=await check('app-version.json',attempt);
  const row={attempt,at:version.checkedAt,stage:ready?'assets':'version',version:version.version||null,
   versionMatches:version.matches,checked:1,matched:matched.size,remaining:files.length-matched.size};
  if(version.matches){
   ready=true;matched.add('app-version.json');
   const pending=files.filter(file=>!matched.has(file));
   const checks=await batch(pending,attempt);
   row.stage='assets';row.checked+=checks.length;row.matched=matched.size;row.remaining=files.length-matched.size;
   row.failures=checks.filter(c=>!c.matches).map(c=>({path:c.path,status:c.status,error:c.error||null}));
   if(matched.size===files.length){
    report.finalVersionCheck=await check('app-version.json',attempt);
    if(report.finalVersionCheck.matches){report.ok=true;report.attempts.push(row);break;}
    matched.delete('app-version.json');
   }
  }
  report.attempts.push(row);
  console.log(JSON.stringify({publicationAttempt:attempt,versionMatches:version.matches,matched:matched.size,total:files.length,remainingSeconds:Math.max(0,Math.ceil((deadline-Date.now())/1000))}));
  const remaining=deadline-Date.now();if(remaining>0)await delay(Math.min(10000,remaining));
 }
 if(!report.ok)throw Error('Public v277 SHA-256 verification did not finish within 300 seconds; unmatched files: '+files.filter(file=>!matched.has(file)).join(', '));
}catch(error){report.failure={message:String(error?.message||error),stack:error?.stack||null};process.exitCode=1;}
finally{
 report.completedAt=new Date().toISOString();report.elapsedSeconds=Math.round((Date.now()-started)/1000);
 report.checks=[...expected].map(([file,local])=>latest.get(file)||{path:file,expectedSha256:local.sha256,expectedBytes:local.bytes,matches:false,error:'Not fetched before the deadline'});
 report.matchedFiles=report.checks.filter(item=>item.matches).length;
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({ok:report.ok,version:report.expectedVersion,matched:report.matchedFiles,total:report.expectedFiles,report:path.relative(root,output),failure:report.failure?.message||null}));
}
