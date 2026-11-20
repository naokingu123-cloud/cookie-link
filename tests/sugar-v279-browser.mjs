/* Transparent multiplier artwork in the real client. The test-only enlarged
 * preview checks reuse of the exported artwork descriptor; it is not a JPC
 * game implementation and never invokes native draws or settlement. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createUiFixture} from './ui-v250-fixture.mjs';

const output=process.env.SWEETS_QA_OUTPUT_DIR||'qa-sugar-v279';
const multipliers=[1,2,3,4,5,10],sequence=[1,2,1,3,4,1,2,5,1,3,2,4,1,10];
const originalHashes={
 1:'a49b2da1409b0bc1ef990f68d62d8fcc5f3cb568791526293492da28f5b6e57e',
 2:'b37f485aa7f94579aaf823965bc8cdd8a8314c1eeffedfcf43b0bcec52ba7330',
 3:'28b90d47d644d94be7f59349d9d62f567f146b068596793e20b8ac83c7226f6c',
 4:'db5cd2ef6846ac8deb820b6243f93af5dc970e493b61d63e4b8583cbc1c12f42',
 5:'d2b4fb982ddd0185253a585e0db71df2323dd8b0a0f09d18cbc7f2437bfecae3',
 10:'971907c8c2cbf2d91171328a636307ad52631bc5e03cfef9f3058dacc5b77be4'
};
const report={revision:279,scope:'Presentation-only rule-derived snapshots. The reusable 512px artwork preview is test-only; no JPC game or native settlement is run.',originalArtwork:[],artwork:[],cases:[],screens:[],assetFailures:[],errors:[]};
await fs.mkdir(output,{recursive:true});
for(const value of multipliers){
 const file='assets/sugar-art-v270/multiplier-'+value+'.png',data=await fs.readFile(file),sha256=createHash('sha256').update(data).digest('hex');
 assert.equal(sha256,originalHashes[value],'original roulette PNG is unchanged: '+value);report.originalArtwork.push({multiplier:value,path:file,bytes:data.length,sha256});
}
const fixture=await createUiFixture({startRound:false,output}),{page}=fixture;
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/sugar-art-v279/'))report.assetFailures.push({url:response.url(),status:response.status()});});
let serial=0;
const screen=async name=>{await page.screenshot({path:path.join(output,name)});report.screens.push(name);};
const inside=(inner,outer,label)=>assert.ok(inner.width>0&&inner.height>0&&inner.left>=outer.left-1&&inner.top>=outer.top-1&&inner.right<=outer.right+1&&inner.bottom<=outer.bottom+1,label+' fits: '+JSON.stringify({inner,outer}));
function noPlate(plate,label){
 assert.equal(plate.backgroundImage,'none',label+' has no background image');assert.equal(plate.backgroundColor,'rgba(0, 0, 0, 0)',label+' has no background fill');
 assert.ok(plate.borders.every(width=>width===0),label+' has no rectangular border');assert.equal(plate.boxShadow,'none',label+' has no rectangular shadow');
}
async function inject({multiplier=3,draws=[],startedAgo=12000,jpBase=150000,rulesRevision=null}={}){
 return page.evaluate(({multiplier,draws,startedAgo,id,jpBase,rulesRevision})=>{
  const ui=window.SweetsSugarChallengeV254,R=window.SugarChallengeRulesV254,a=window.__qa250.app;
  const native=()=>({credit:a.credit,displayCredit:a.displayCredit,bets:a.bets.slice(),locked:a.locked.slice(),draws:a.draws.slice(),totalWin:a.totalWin,token:a.token,phase:a.phase});
  const before=native();let state=R.create({rulesRevision:rulesRevision??R.REVISION,id,roundId:'sugar-v279-view',station:1,sugarValues:Array(5).fill(jpBase/5),cardId:'standard',multiplier,seed:279});
  for(const number of draws)state=R.advance(state,number,{roundId:state.roundId,ballIndex:state.draws.length+1});
  const acceptedIds=(a.wonderBank||[]).map(t=>t.sugarId).filter(Boolean),accepted=ui.accept({version:254,revision:++window.__qaSugar279Revision,bank:[],acceptedIds,queued:false,challenge:state,startedAt:Date.now()+(Number(window.SweetsSharedMachine?.client?.clockOffset)||0)-startedAgo});
  return {accepted,before,after:native(),challenge:state};
 },{multiplier,draws,startedAgo,id:'sugar-v279-view-'+(++serial),jpBase,rulesRevision});
}
async function read(){
 return page.evaluate(()=>{
  const ui=window.SweetsSugarChallengeV254,overlay=document.querySelector('.sc254-overlay'),celebration=document.querySelector('.sc254-celebration');
  const rect=node=>{const {left,top,right,bottom,width,height}=node.getBoundingClientRect();return {left,top,right,bottom,width,height};};
  const visible=node=>{for(let p=node;p&&p.nodeType===1;p=p.parentElement){const c=getComputedStyle(p);if(p.hidden||c.display==='none'||c.visibility==='hidden'||Number(c.opacity)===0)return false;}return node.getBoundingClientRect().width>0;};
  const plate=node=>{const c=getComputedStyle(node);return {backgroundImage:c.backgroundImage,backgroundColor:c.backgroundColor,borders:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth].map(parseFloat),boxShadow:c.boxShadow};};
  const art=node=>{const image=node.querySelector('img');return {visible:visible(node),src:image.getAttribute('src'),alt:image.alt,text:node.textContent,rect:rect(node),imageRect:rect(image),loaded:image.complete&&image.naturalWidth>0,fit:getComputedStyle(image).objectFit,plate:plate(node)};};
  const jp=overlay.querySelector('[data-sc-amount]'),reel=overlay.querySelector('.sc270-reel');
  return {api:ui.describe(),overlay:rect(overlay),jp:{value:Number(jp.textContent),rect:rect(jp),face:rect(jp.querySelector('.gold-number')||jp),multiplier:art(overlay.querySelector('[data-sc-jp-multiplier]'))},result:art(overlay.querySelector('.sc254-digital')),
   reel:{visible:visible(reel),spinning:reel.dataset.spinning,settled:reel.dataset.settled,sequence:[...reel.querySelectorAll('.sc270-reel-card[data-lap="0"]')].map(node=>Number(node.dataset.multiplier)),images:[...new Set([...reel.querySelectorAll('.sc270-reel-card>img')].map(img=>img.getAttribute('src')))],popupImageCount:reel.querySelector('[data-sc-reel-multiplier]').querySelectorAll('img').length},
   payouts:[...overlay.querySelectorAll('[data-sc-win]')].map(node=>Number(node.dataset.scWin)),celebration:{visible:visible(celebration),rect:rect(celebration),value:Number(celebration.querySelector('b').textContent),multiplier:art(celebration.querySelector('[data-sc-celebration-multiplier]'))}};
 });
}
function preserved(record){assert.equal(record.accepted,true);assert.deepEqual(record.after,record.before,'artwork presentation never changes the native wallet, BET or drawn balls');}
function verify(state,value){
 const source='assets/sugar-art-v279/multiplier-'+value+'-transparent.png';
 assert.equal(state.api.presentationRevision,279);assert.ok(state.api.artLoaded);assert.equal(state.result.src,source);assert.equal(state.result.visible,true);assert.equal(state.result.fit,'contain');assert.ok(state.result.loaded);noPlate(state.result.plate,'settled emblem');inside(state.result.imageRect,state.overlay,'settled artwork');
 assert.equal(state.jp.value,150000,'JP base remains separate from its multiplier');assert.equal(state.api.displayAmounts.cashBase,150000,'miss awards remain based on the unmultiplied amount');assert.deepEqual(state.payouts,[30000,15000,7500,4500,3000,1500]);
 assert.equal(state.jp.multiplier.src,source);assert.equal(state.jp.multiplier.text,'×'+value);assert.equal(state.jp.multiplier.visible,value>1);noPlate(state.jp.multiplier.plate,'JP multiplier');inside(state.jp.face,state.jp.rect,'JP number');
 if(value>1)inside(state.jp.multiplier.imageRect,state.overlay,'JP multiplier artwork');
 assert.deepEqual(state.reel.sequence,sequence);assert.deepEqual(state.api.reelTiming,{baseEnd:3250,start:3450,stop:9700,end:10500});
 assert.deepEqual(state.reel.images.slice().sort(),multipliers.map(n=>'assets/sugar-art-v270/multiplier-'+n+'.png').sort(),'every reel card retains the original PNG');assert.equal(state.reel.popupImageCount,0,'the roulette text popup is unchanged');
}
try{
 await page.waitForFunction(()=>window.SweetsSugarChallengeV254?.presentationRevision===279&&document.querySelector('[data-sc-multiplier-art]'),null,{timeout:20000});
 await page.evaluate(async()=>{await document.fonts.ready;window.__qaSugar279Revision=100000;await Promise.all([...document.querySelectorAll('.sc254-overlay img,.sc254-celebration img')].map(image=>image.decode()));});
 report.artwork=await page.evaluate(async values=>{
  const result=[];
  for(const value of values){
   const descriptor=window.SweetsSugarChallengeV254.multiplierArtwork(value),image=new Image();image.src=descriptor.transparentSrc;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
   const {data}=ctx.getImageData(0,0,canvas.width,canvas.height),w=canvas.width,h=canvas.height,edges={top:0,right:0,bottom:0,left:0},edgeClear={top:0,right:0,bottom:0,left:0};let clear=0,opaque=0,minX=w,minY=h,maxX=-1,maxY=-1;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const alpha=data[(y*w+x)*4+3];if(alpha===0)clear++;if(alpha===255)opaque++;if(alpha>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}if(y===0){edges.top=Math.max(edges.top,alpha);if(alpha===0)edgeClear.top++;}if(y===h-1){edges.bottom=Math.max(edges.bottom,alpha);if(alpha===0)edgeClear.bottom++;}if(x===0){edges.left=Math.max(edges.left,alpha);if(alpha===0)edgeClear.left++;}if(x===w-1){edges.right=Math.max(edges.right,alpha);if(alpha===0)edgeClear.right++;}}
   result.push({descriptor,frozen:Object.isFrozen(descriptor),width:w,height:h,transparentPixels:clear,opaquePixels:opaque,transparentFraction:clear/(w*h),cornerAlpha:[data[3],data[(w-1)*4+3],data[(h-1)*w*4+3],data[(w*h-1)*4+3]],edgeClearFractions:{top:edgeClear.top/w,right:edgeClear.right/h,bottom:edgeClear.bottom/w,left:edgeClear.left/h},edgeMaxAlpha:edges,paintedBounds:{minX,minY,maxX,maxY}});
  }
  return result;
 },multipliers);
 for(const a of report.artwork){assert.ok(a.frozen);assert.ok(a.width>=512&&a.height>=512,'transparent artwork supports a 512px future JPC presentation');assert.ok(a.transparentFraction>.05&&a.opaquePixels>0,'artwork has genuine alpha and visible content');assert.ok(a.cornerAlpha.every(alpha=>alpha<=1),'outer corners are transparent to within one alpha quantization step');assert.ok(Object.values(a.edgeClearFractions).every(fraction=>fraction>.05),'each edge contains a clear outer region while original ornament tips may touch the boundary');}
 await page.emulateMedia({reducedMotion:'no-preference'});preserved(await inject({startedAgo:4500}));const spinning=await read();assert.equal(spinning.reel.spinning,'true');assert.equal(spinning.result.visible,false);assert.equal(spinning.jp.multiplier.visible,false);report.spinning=spinning;
 preserved(await inject({startedAgo:9800}));
 // A server snapshot timestamp uses the server clock. Observe the actual
 // stopped frame instead of assuming the injected age has painted already.
 await page.waitForFunction(()=>{
  const reel=document.querySelector('.sc270-reel'),popup=document.querySelector('[data-sc-jp-multiplier]');
  return reel.dataset.settled==='true'&&!popup.hidden&&Number(getComputedStyle(popup).opacity)>0;
 },null,{timeout:5000});
 const decided=await read();assert.equal(decided.reel.settled,'true');assert.equal(decided.reel.visible,true);assert.equal(decided.jp.multiplier.src,'assets/sugar-art-v279/multiplier-3-transparent.png');assert.equal(decided.jp.multiplier.visible,true);noPlate(decided.jp.multiplier.plate,'decided JP multiplier');report.decided=decided;
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const value of multipliers){
  preserved(await inject({multiplier:value,draws:[1,2,3,10]}));await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().artLoaded);const challenge=await read();verify(challenge,value);await screen('challenge-'+value+'-desktop.png');
  const accepted=await inject({multiplier:value,draws:[25,24,20,8]});preserved(accepted);await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().artLoaded);const jpc=await read();verify(jpc,value);assert.equal(accepted.challenge.jpcQualified,true);assert.equal(jpc.celebration.visible,true);assert.equal(jpc.celebration.value,150000);assert.equal(jpc.celebration.multiplier.src,'assets/sugar-art-v279/multiplier-'+value+'-transparent.png');assert.equal(jpc.celebration.multiplier.visible,value>1);assert.equal(jpc.celebration.multiplier.text,'×'+value);noPlate(jpc.celebration.multiplier.plate,'JPC acquired multiplier');if(value>1)inside(jpc.celebration.multiplier.imageRect,jpc.celebration.rect,'JPC acquired multiplier artwork');await screen('jpc-'+value+'-desktop.png');report.cases.push({multiplier:value,challenge,jpc});
 }
 report.legacy=[];
 for(const rulesRevision of [254,268,270]){const accepted=await inject({rulesRevision,multiplier:3,draws:[1,2,3,10]});preserved(accepted);const state=await read();assert.equal(state.api.challenge.rulesRevision,rulesRevision,'artwork changes do not reinterpret an in-progress saved rules revision');assert.equal(state.api.displayAmounts.cashBase,accepted.challenge.jpAmount,'legacy cash display keeps its persisted calculation');assert.equal(state.result.src,'assets/sugar-art-v279/multiplier-3-transparent.png');report.legacy.push({rulesRevision,challenge:state.api.challenge,displayAmounts:state.api.displayAmounts,result:state.result});}
 await page.setViewportSize({width:390,height:844});preserved(await inject({multiplier:10,draws:[1,2,3,10]}));await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().artLoaded);report.mobile=await read();verify(report.mobile,10);await screen('challenge-10-mobile.png');
 preserved(await inject({multiplier:10,draws:[25,24,20,8]}));report.mobileJpc=await read();verify(report.mobileJpc,10);assert.equal(report.mobileJpc.celebration.visible,true);inside(report.mobileJpc.celebration.multiplier.imageRect,report.mobileJpc.celebration.rect,'mobile JPC multiplier');await screen('jpc-10-mobile.png');
 await page.setViewportSize({width:1700,height:1250});
 report.enlarged=await page.evaluate(async values=>{
  const preview=document.createElement('section');preview.id='qa279-jpc-artwork-preview';Object.assign(preview.style,{position:'fixed',inset:'0',zIndex:'2147483647',display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'16px',padding:'20px',boxSizing:'border-box',background:'#24132f',overflow:'auto'});
  for(const [i,value]of values.entries()){const descriptor=window.SweetsSugarChallengeV254.multiplierArtwork(value),card=document.createElement('figure'),label=document.createElement('figcaption'),image=new Image();Object.assign(card.style,{margin:'0',display:'grid',placeItems:'center',padding:'12px',background:i%2?'#fff0cd':'#3c2452'});label.textContent=descriptor.label+' · JPC拡大素材確認';Object.assign(label.style,{font:'700 18px system-ui',color:i%2?'#3c2452':'#fff0cd'});image.src=descriptor.transparentSrc;image.alt=descriptor.label;Object.assign(image.style,{display:'block',width:'512px',height:'512px',objectFit:'contain',background:'transparent',border:'0',boxShadow:'none'});card.append(label,image);preview.append(card);}
  document.body.append(preview);await Promise.all([...preview.querySelectorAll('img')].map(image=>image.decode()));
  return [...preview.querySelectorAll('img')].map(image=>({src:image.getAttribute('src'),width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,fit:getComputedStyle(image).objectFit,background:getComputedStyle(image).backgroundColor}));
 },multipliers);
 for(const art of report.enlarged){assert.equal(art.width,512);assert.equal(art.height,512);assert.equal(art.fit,'contain');assert.equal(art.background,'rgba(0, 0, 0, 0)');}
 await screen('jpc-artwork-enlarged-512.png');await page.evaluate(()=>document.getElementById('qa279-jpc-artwork-preview').remove());
 assert.deepEqual(fixture.errors,[]);assert.deepEqual(report.assetFailures,[]);report.errors=fixture.errors;report.ok=true;
 console.log('SUGAR_V279_BROWSER_PASS: six unchanged reel PNGs; six alpha cutouts with clear corners and outer regions; post-result and JPC artwork without plates; 512px JPC reuse; separate JP base and multiplier; saved rules revisions preserved.');
}catch(error){report.ok=false;report.failure={message:String(error),stack:error.stack};report.errors=fixture.errors;try{report.failure.state=await read();await screen('failure.png');}catch{}throw error;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await fixture.close();}
