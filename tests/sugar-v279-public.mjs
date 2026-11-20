/* Read-only publication gate after the v279 rules, browser and offline jobs.
 * GET static Pages files only. Published server source is not evidence that a
 * separate Windows game server has installed or restarted with that source. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const root=fileURLToPath(new URL('../',import.meta.url));
const base='https://naokingu123-cloud.github.io/cookie-link/';
const output=path.join(root,'qa-sugar-v279-public/report.json');
const started=Date.now(),deadline=started+5*60*1000,concurrency=4;
const multipliers=[1,2,3,4,5,10];
const originalHashes={
 1:'a49b2da1409b0bc1ef990f68d62d8fcc5f3cb568791526293492da28f5b6e57e',
 2:'b37f485aa7f94579aaf823965bc8cdd8a8314c1eeffedfcf43b0bcec52ba7330',
 3:'28b90d47d644d94be7f59349d9d62f567f146b068596793e20b8ac83c7226f6c',
 4:'db5cd2ef6846ac8deb820b6243f93af5dc970e493b61d63e4b8583cbc1c12f42',
 5:'d2b4fb982ddd0185253a585e0db71df2323dd8b0a0f09d18cbc7f2437bfecae3',
 10:'971907c8c2cbf2d91171328a636307ad52631bc5e03cfef9f3058dacc5b77be4'
};
const runtime=[
 'app-version.json','index.html','download-sw-v255.js',
 'assets/download-assets-v255.json','assets/download-cache-v255.js','assets/edition-choice-v255.js',
 'assets/sugar-challenge-rules-v254.js','assets/sugar-challenge-v254.js','assets/sugar-challenge-v254.css',
 'assets/local-sugar-v267.js','assets/download-mode-v255.js','assets/recorded-round-v255.js','assets/download-worker-v255.js',
 'server-sugar-challenge-v254.mjs','server-payout-preload-v3.mjs'
];
const report={ok:false,startedAt:new Date(started).toISOString(),completedAt:null,
 commit:process.env.GITHUB_SHA||null,url:base,maxWaitSeconds:300,concurrency,
 scope:'Static public Pages GET, byte-count and SHA-256 only: current Sugar entry rules, local owner, presentation, six transparent multiplier images with provenance, six unchanged roulette images and offline runtime/cache. No gameplay, API, wallet or BET operations. Server .mjs checks verify published source only; they do not install, restart or verify the separate running Windows game server.',
 expectedVersion:null,expectedFiles:0,artwork:{transparent:6,originalReel:6,provenance:'assets/sugar-art-v279/provenance.json'},
 attempts:[],checks:[],finalVersionCheck:null};
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
  url.searchParams.set('verify-v279',(report.commit||report.expectedVersion)+'-'+attempt);
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
 const art=await filesUnder('assets/sugar-art-v279');
 const transparent=multipliers.map(n=>'assets/sugar-art-v279/multiplier-'+n+'-transparent.png');
 const original=multipliers.map(n=>'assets/sugar-art-v270/multiplier-'+n+'.png');
 assert.deepEqual(art.filter(file=>file.endsWith('.png')).sort(),transparent.slice().sort(),'all six transparent multiplier images must be checked');
 assert(art.includes(report.artwork.provenance),'the generated artwork provenance must be published');
 const files=[...new Set([...runtime,...art,...original])].sort();
 for(const file of files){const bytes=await fs.readFile(path.join(root,file));expected.set(file,{bytes:bytes.length,sha256:hash(bytes)});}
 for(const n of multipliers)assert.equal(expected.get('assets/sugar-art-v270/multiplier-'+n+'.png').sha256,originalHashes[n],'original roulette PNG remains byte-identical: '+n);
 const provenance=JSON.parse(await fs.readFile(path.join(root,report.artwork.provenance),'utf8'));
 assert.deepEqual(provenance.assets.map(asset=>asset.multiplier).sort((a,b)=>a-b),multipliers,'provenance covers all six multiplier images once');
 for(const asset of provenance.assets){
  assert.equal(asset.path,'assets/sugar-art-v279/multiplier-'+asset.multiplier+'-transparent.png');
  assert.equal(asset.source,'assets/sugar-art-v270/multiplier-'+asset.multiplier+'.png');
  assert.equal(expected.get(asset.path).sha256,asset.sha256,'transparent artifact matches its provenance');
  assert.equal(expected.get(asset.path).bytes,asset.bytes,'transparent artifact byte count matches its provenance');
  assert.equal(asset.sourceSha256,originalHashes[asset.multiplier],'provenance retains the original roulette source hash');
 }
 report.expectedVersion=JSON.parse(await fs.readFile(path.join(root,'app-version.json'),'utf8')).version;
 // Check the current checkout so these retained assets can also be verified
 // after a later release without requiring the shell to stay on v279.
 assert(typeof report.expectedVersion==='string'&&report.expectedVersion.length>0,'the checkout must declare a build version');
 report.expectedFiles=files.length;

 // Wait for the current version before downloading the larger artwork files.
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
 if(!report.ok)throw Error('Public v279 SHA-256 verification did not finish within 300 seconds; unmatched files: '+files.filter(file=>!matched.has(file)).join(', '));
}catch(error){report.failure={message:String(error?.message||error),stack:error?.stack||null};process.exitCode=1;}
finally{
 report.completedAt=new Date().toISOString();report.elapsedSeconds=Math.round((Date.now()-started)/1000);
 report.checks=[...expected].map(([file,local])=>latest.get(file)||{path:file,expectedSha256:local.sha256,expectedBytes:local.bytes,matches:false,error:'Not fetched before the deadline'});
 report.matchedFiles=report.checks.filter(item=>item.matches).length;
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({ok:report.ok,version:report.expectedVersion,matched:report.matchedFiles,total:report.expectedFiles,report:path.relative(root,output),failure:report.failure?.message||null}));
}
