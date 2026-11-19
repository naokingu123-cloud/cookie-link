/* An isolated headless engine computes a trusted round; no visible roulette
 * window and no player-supplied payout/checkpoint are used as inputs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {computeRecordingV255} from './server-download-recording-v255.mjs';

const ROOT=fileURLToPath(new URL('.',import.meta.url));
const toSeed=value=>typeof value==='number'?value>>>0:createHash('sha256').update(String(value)).digest().readUInt32LE(0);
async function exists(file){try{await fs.access(file);return true;}catch{return false;}}
async function browserOptions(){
 const configured=process.env.SWEETS_DOWNLOAD_BROWSER_PATH||process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
 if(configured)return {executablePath:configured};
 if(process.platform==='win32'){
  for(const base of [process.env['ProgramFiles(x86)'],process.env.ProgramFiles,process.env.LOCALAPPDATA].filter(Boolean)){
   for(const suffix of ['Microsoft/Edge/Application/msedge.exe','Google/Chrome/Application/chrome.exe']){
    const executablePath=path.join(base,suffix);if(await exists(executablePath))return {executablePath};
   }
  }
 }
 return {};
}
export function createDownloadComputerV255({baseUrl,root=ROOT}={}){
 let browser=null,initializing=null,closed=false,readyFlag=false,error='',busy=false,completed=0,lastMs=0;
 const pending=new Set(),controller=new AbortController();
 function status(){return {enabled:true,ready:readyFlag&&!closed,busy,completed,lastMs,error:error||null,engine:'native-games-and-recorded-physics',visibleWindow:false};}
 async function ready(){
  if(closed)throw Error('download_computer_closed');
  if(browser?.isConnected()&&readyFlag)return true;
  if(initializing)return initializing;
  initializing=(async()=>{
   try{
    const {chromium}=await import('playwright');
    browser=await chromium.launch({headless:true,...await browserOptions(),timeout:45000});
    browser.on('disconnected',()=>{readyFlag=false;if(!closed)error='計算用ブラウザーが停止しました。次の準備で再起動します。';});
    readyFlag=true;error='';return true;
   }catch(cause){readyFlag=false;error=String(cause?.message||cause).slice(0,500);throw cause;}
   finally{initializing=null;}
  })();return initializing;
 }
 async function compute(input){
  if(busy)throw Error('download_computer_busy');busy=true;const began=Date.now();let context,timer;
  try{
   await ready();
   const origin=typeof baseUrl==='function'?baseUrl():baseUrl||'http://127.0.0.1:'+String(process.env.PORT||8787);
   const url=new URL('/?edition=download&downloadWorker=1&serverSettlementWorker=1',origin);
   const version=JSON.parse(await fs.readFile(path.join(root,'app-version.json'),'utf8')).version;url.searchParams.set('appv',version);
   context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});pending.add(context);
   // A worker cannot reach another origin, APIs, or a player's local storage.
   await context.route('**/*',route=>{
    const target=new URL(route.request().url());
    if(target.origin!==url.origin||target.pathname.startsWith('/api/')||!['GET','HEAD'].includes(route.request().method()))return route.abort('blockedbyclient');
    return route.continue();
   });
   const seed=toSeed(input.seed);
   await context.addInitScript(({seed})=>{
    let value=seed;Math.random=()=>{value=(value+0x6D2B79F5)>>>0;let n=value;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
   },{seed});
   const page=await context.newPage(),pageErrors=[];
   page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.SweetsDownloadWorkerV255?.ready,null,{timeout:60000});
   const recording=await computeRecordingV255({seed},{signal:controller.signal});
   const output=await Promise.race([
    page.evaluate(data=>window.SweetsDownloadWorkerV255.compute(data),{...input,seed,recording}),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('download_game_compute_timeout')),180000);timer.unref?.();})
   ]);
   if(pageErrors.length)throw Error('download_worker_page_error:'+pageErrors.join('; ').slice(0,1000));
   completed++;lastMs=Date.now()-began;error='';return output;
  }catch(cause){error=String(cause?.message||cause).slice(0,1200);throw cause;}
  finally{clearTimeout(timer);busy=false;if(context){pending.delete(context);await context.close().catch(()=>{});}}
 }
 async function close(){closed=true;readyFlag=false;controller.abort();for(const context of pending)await context.close().catch(()=>{});pending.clear();await browser?.close().catch(()=>{});browser=null;}
 return {compute,ready,status,close};
}
