/* Presentation-only Sugar snapshots against the real isolated client/server.
 * All challenge records come from the shipped pure rules. No synthetic draw
 * reaches a native engine, and no presentation action may credit a wallet.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep} from './ui-v250-fixture.mjs';

const output=process.env.SWEETS_QA_OUTPUT_DIR||'qa-sugar-v254',fixture=await createUiFixture({startRound:false,output});
const {page,errors}=fixture;
const report={version:fixture.version,scope:'Rule-derived server snapshots injected only into the Sugar presentation API; real server ownership and settlement are tested separately.',intro:null,screens:[],highAmounts:[],cards:[],awards:[],lifecycle:null,lucky:null};
const sugarValues=[1000,1100,950,1050,900],jpAmount=5000;
let serial=0;

function contained(inner,outer,label,tolerance=2){
 assert.ok(inner&&outer&&inner.width>0&&inner.height>0,label+' has visible bounds');
 assert.ok(inner.left>=outer.left-tolerance&&inner.top>=outer.top-tolerance&&inner.right<=outer.right+tolerance&&inner.bottom<=outer.bottom+tolerance,label+' fits its container: '+JSON.stringify({inner,outer}));
}
async function read(){
 return page.evaluate(()=>{
  const ui=window.SweetsSugarChallengeV254,a=window.__qa250.app,overlay=document.querySelector('.sc254-overlay'),dock=document.querySelector('.sc254-dock'),celebration=document.querySelector('.sc254-celebration'),announcement=document.querySelector('.sc254-announcement');
  const rect=node=>{if(!node)return null;const {left,top,right,bottom,width,height}=node.getBoundingClientRect();return {left,top,right,bottom,width,height};};
  const visible=node=>{if(!node)return false;for(let p=node;p&&p.nodeType===1;p=p.parentElement){const css=getComputedStyle(p);if(p.hidden||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return false;}const r=node.getBoundingClientRect();return r.width>0&&r.height>0;};
  const text=s=>overlay.querySelector(s)?.textContent||'',num=s=>Number(text(s)),sumNode=overlay.querySelector('[data-sc-sum]'),jp=overlay.querySelector('[data-sc-amount]');
  const overflowing=[overlay,...overlay.querySelectorAll('.sc254-head,.sc254-content,.sc254-card,.sc254-targets,.sc254-payouts,.sc254-payouts td,.sc254-rule,.sc254-history')].filter(visible).filter(node=>node.scrollWidth>node.clientWidth+2).map(node=>({className:node.className,tag:node.tagName,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth}));
  return {api:ui.describe(),phase:a.phase,credit:a.credit,displayCredit:a.displayCredit,bets:a.bets.slice(),draws:a.draws.slice(),totalWin:a.totalWin,token:a.token,
   viewport:{width:innerWidth,height:innerHeight},screen:rect(document.getElementById('screen')),game:rect(document.querySelector('#screen>.game')),overlay:{visible:visible(overlay),rect:rect(overlay),role:overlay.getAttribute('role'),expanded:ui.describe().expanded,paused:overlay.dataset.paused,reduced:overlay.dataset.reduced,background:getComputedStyle(overlay).backgroundImage,overflowing},
   bottle:{rect:rect(overlay.querySelector('.sc254-bottle')),labelRect:rect(overlay.querySelector('.sc254-sum>small')),visible:visible(overlay.querySelector('.sc254-bottle')),pouring:overlay.querySelector('.sc254-bottle').dataset.pouring,fill:Number.parseFloat(overlay.querySelector('.sc254-fill').style.height),sum:num('[data-sc-sum]'),label:text('[data-sc-ball-count]'),fillShell:rect(overlay.querySelector('.sc254-fill-shell')),liquid:rect(overlay.querySelector('.sc254-fill'))},
   scale:{visible:visible(overlay.querySelector('.sc254-scale')),amount:num('[data-sc-scale-amount]'),pouring:overlay.querySelector('.sc254-scale').dataset.pouring,gems:[...overlay.querySelectorAll('.sc254-five .sugar-gem')].map(node=>({poured:node.dataset.poured,active:node.dataset.active}))},
   jp:{value:num('[data-sc-amount]'),multiplier:text('[data-sc-jp-multiplier]'),multiplierVisible:visible(overlay.querySelector('[data-sc-jp-multiplier]')),multiplierRect:rect(overlay.querySelector('[data-sc-jp-multiplier]')),text:jp.textContent,font:getComputedStyle(jp.querySelector('.gold-number')||jp).fontFamily,rect:rect(jp),face:rect(jp.querySelector('.gold-number'))},sumFont:getComputedStyle(sumNode.querySelector('.gold-number')||sumNode).fontFamily,multiplier:text('[data-sc-multiplier]'),phaseText:text('.sc254-phase'),cardName:text('.sc254-card-name'),lucky:[...overlay.querySelectorAll('.sc254-lucky>b')].map(node=>Number(node.textContent)),extremes:text('.sc254-extremes'),reach:text('.sc254-reach'),history:[...overlay.querySelectorAll('.sc254-history>span')].map(node=>({hit:node.dataset.hit,text:node.textContent})),
   gauge:{count:overlay.querySelectorAll('.sc270-gauge').length,rect:rect(overlay.querySelector('.sc270-gauge')),marker:rect(overlay.querySelector('.sc270-gauge-marker')),label:overlay.querySelector('.sc270-gauge').getAttribute('aria-label'),pins:[...overlay.querySelectorAll('.sc270-lucky-pin')].map(node=>Number(node.dataset.total)),bands:[...overlay.querySelectorAll('.sc270-gauge-band')].map(node=>({min:Number(node.dataset.min),max:Number(node.dataset.max),hundredths:Number(node.dataset.hundredths)||0,jpc:node.dataset.jpc==='true'}))},
   reel:{visible:visible(overlay.querySelector('.sc270-reel')),ready:overlay.querySelector('.sc270-reel').dataset.ready,spinning:overlay.querySelector('.sc270-reel').dataset.spinning,settled:overlay.querySelector('.sc270-reel').dataset.settled,position:Number(overlay.querySelector('.sc270-reel-track').dataset.position),target:Number(overlay.querySelector('.sc270-reel-track').dataset.target),window:rect(overlay.querySelector('.sc270-reel-window')),targetCard:rect(overlay.querySelectorAll('.sc270-reel-card')[Number(overlay.querySelector('.sc270-reel-track').dataset.target)]),targetMultiplier:Number(overlay.querySelectorAll('.sc270-reel-card')[Number(overlay.querySelector('.sc270-reel-track').dataset.target)]?.dataset.multiplier),base:num('[data-sc-reel-base]'),cycle:[...overlay.querySelectorAll('.sc270-reel-card[data-lap="0"]')].map(node=>Number(node.dataset.multiplier)),images:[...new Set([...overlay.querySelectorAll('.sc270-reel-card>img')].map(node=>node.getAttribute('src')))],resultImage:overlay.querySelector('[data-sc-result-face]').getAttribute('src'),resultAlt:overlay.querySelector('[data-sc-result-face]').alt,resultLabel:overlay.querySelector('.sc254-digital').getAttribute('aria-label'),cardFit:getComputedStyle(overlay.querySelector('.sc270-reel-card>img')).objectFit,imageLabels:[...overlay.querySelectorAll('.sc270-reel-card[data-lap="0"]>img')].map(node=>node.alt)},
   payouts:[...overlay.querySelectorAll('.sc254-payouts tbody tr')].map(node=>({hundredths:Number(node.dataset.hundredths),color:getComputedStyle(node.querySelector('.sc270-award-key>i')).backgroundColor,bands:[...overlay.querySelectorAll('.sc270-gauge-band[data-hundredths="'+node.dataset.hundredths+'"]')].map(n=>({min:Number(n.dataset.min),max:Number(n.dataset.max),color:getComputedStyle(n).backgroundColor})),label:node.querySelector('.sc270-win-unit').textContent,value:Number(node.querySelector('b').textContent),text:node.querySelector('b').textContent,font:getComputedStyle(node.querySelector('b')).fontFamily,current:node.dataset.current==='true',rect:rect(node),valueRect:rect(node.querySelector('b')),valueFace:rect(node.querySelector('b>.gold-number'))})),table:rect(overlay.querySelector('.sc254-payouts')),targets:rect(overlay.querySelector('.sc254-targets')),footer:rect(overlay.querySelector('footer')),bottom:rect(overlay.querySelector('.sc270-bottom')),historyRect:rect(overlay.querySelector('.sc254-history')),
   dock:{visible:visible(dock),rect:rect(dock),parent:dock.parentElement.id,parentRect:rect(dock.parentElement),text:dock.textContent,paused:dock.dataset.paused,animationPlayState:getComputedStyle(dock).animationPlayState},
   announcement:{visible:visible(announcement),text:announcement.textContent,pointerEvents:getComputedStyle(announcement).pointerEvents,rect:rect(announcement),badge:rect(announcement.querySelector('.sc254-announcement-badge'))},
   celebration:{visible:visible(celebration),text:celebration.textContent,pointerEvents:getComputedStyle(celebration).pointerEvents,image:celebration.querySelector('img').getAttribute('src'),alt:celebration.querySelector('img').alt,loaded:celebration.querySelector('img').complete&&celebration.querySelector('img').naturalWidth>0,rect:rect(celebration),title:rect(celebration.querySelector('img'))},
   animations:overlay.getAnimations({subtree:true}).map(animation=>({name:animation.animationName||'',state:animation.playState,time:Number(animation.currentTime)}))};
 });
}
async function inject({rulesRevision=271,id='sugar-view-'+(++serial),draws=[],cardId='standard',multiplier=3,values=sugarValues,queued=false,bank=[],challenge=true,startedAgo=0}={}){
 return page.evaluate(({rulesRevision,id,draws,cardId,multiplier,queued,bank,challenge,startedAgo,sugarValues})=>{
  const ui=window.SweetsSugarChallengeV254,R=window.SugarChallengeRulesV254,a=window.__qa250.app;
  const native=()=>({credit:a.credit,displayCredit:a.displayCredit,bets:a.bets.slice(),locked:a.locked.slice(),draws:a.draws.slice(),totalWin:a.totalWin,token:a.token,phase:a.phase});
  const before=native();let state=null;
  if(challenge){state=R.create({rulesRevision,id,roundId:'isolated-sugar-view',station:1,sugarValues,cardId,multiplier,seed:254});for(const number of draws)state=R.advance(state,number,{roundId:state.roundId,ballIndex:state.draws.length+1});}
  const known=new Set([...(window.__sugarView254.acceptedIds||[]),...(a.wonderBank||[]).map(token=>token.sugarId).filter(Boolean),...bank.map(token=>token.sugarId)]);window.__sugarView254.acceptedIds=[...known];
  const raw={version:254,revision:++window.__sugarView254.revision,bank,acceptedIds:[...known],queued,challenge:state,startedAt:Date.now()-startedAgo};
  const accepted=ui.accept(raw),after=native();window.__sugarView254.last=raw;
  return {id,accepted,before,after,challenge:state,raw};
 },{rulesRevision,id,draws,cardId,multiplier,queued,bank,challenge,startedAgo,sugarValues:values});
}
function preserved(record){assert.equal(record.accepted,true);assert.deepEqual(record.after,record.before,'accepting a Sugar display snapshot cannot change native CREDIT, BET, draw history or settlement');}
function verifyPanel(state,{jp=jpAmount,multiplier=3,cashBase=jp}={}){
 assert.equal(state.overlay.visible,true);contained(state.overlay.rect,state.game,'expanded Sugar panel');contained(state.targets,state.overlay.rect,'JPC and lucky targets');contained(state.table,state.overlay.rect,'all six payout rows');contained(state.footer,state.overlay.rect,'fold instruction');
 for(const row of state.payouts)contained(row.rect,state.table,'payout row '+row.hundredths);
 assert.deepEqual(state.overlay.overflowing,[],'Sugar content has no horizontal overflow');assert.ok(state.api.artLoaded,'scale, bottle, JPC and all multiplier artwork decode');
 assert.equal(state.payouts.length,6);assert.deepEqual(state.payouts.map(row=>row.hundredths),[20,10,5,3,2,1]);assert.deepEqual(state.payouts.map(row=>row.value),[20,10,5,3,2,1].map(percent=>Math.floor(cashBase*percent/100)));
 for(const row of state.payouts){assert.match(row.font,/ArcadePayout/);assert.doesNotMatch(row.text,/[,，]/);assert.equal(row.label,'WIN');assert.ok(row.bands.length);assert.ok(row.bands.every(band=>band.color===row.color),'payout color matches its vertical gauge bands');}
 assert.equal(state.gauge.count,1,'all outcomes share one vertical gauge');contained(state.gauge.rect,state.overlay.rect,'single vertical gauge');
 assert.ok(state.gauge.rect.height>state.gauge.rect.width*2,'gauge is visibly vertical');
 assert.ok(Math.abs(state.gauge.rect.top-state.bottle.fillShell.top)<1,'gauge top matches the bottle fill top');assert.ok(Math.abs(state.gauge.rect.bottom-state.bottle.fillShell.bottom)<1,'gauge bottom matches the bottle fill bottom');
 const markerCenter=(state.gauge.marker.top+state.gauge.marker.bottom)/2;assert.ok(Math.abs(markerCenter-state.bottle.liquid.top)<1,'moving gauge marker matches the animated liquid level');
 assert.deepEqual(state.gauge.pins,state.lucky,'lucky totals are represented on the same gauge');assert.match(state.gauge.label,/0から172/);
 assert.equal(state.jp.value,jp);assert.equal(state.jp.multiplierVisible,multiplier>1);if(multiplier>1){assert.equal(state.jp.multiplier,'×'+multiplier);contained(state.jp.multiplierRect,state.overlay.rect,'JP multiplier popup');}assert.match(state.jp.font,/ArcadePayout/);assert.match(state.sumFont,/ArcadePayout/);assert.doesNotMatch(state.jp.text,/[,，]/);const tier=({1:'',2:'ハイパー ',3:'スペシャル ',4:'ウルトラ ',5:'ミラクル ',10:'ギャラクシー '}[multiplier])+multiplier+'倍';assert.equal(state.multiplier,tier);assert.equal(state.reel.resultAlt,tier);assert.equal(state.reel.resultLabel,tier);assert.equal(state.reel.cardFit,'contain','the full square emblem is preserved');
 assert.equal(state.reel.images.length,6);assert.equal(state.reel.resultImage,'assets/sugar-art-v270/multiplier-'+multiplier+'.png');
 assert.deepEqual(state.reel.imageLabels,state.reel.cycle.map(value=>({1:'',2:'ハイパー ',3:'スペシャル ',4:'ウルトラ ',5:'ミラクル ',10:'ギャラクシー '}[value])+value+'倍'));
 assert.equal(state.reel.cycle.length,14);assert.deepEqual(Object.fromEntries([1,2,3,4,5,10].map(n=>[n,state.reel.cycle.filter(v=>v===n).length])),{1:5,2:3,3:2,4:2,5:1,10:1});
}
function numbersForSum(sum){
 const numbers=[1,2,3,4,5,6,7,8];let extra=sum-36;
 for(let i=7;i>=0;i--){const add=Math.min(extra,(i===7?25:numbers[i+1]-1)-numbers[i]);numbers[i]+=add;extra-=add;}
 assert.equal(extra,0);assert.equal(new Set(numbers).size,8);assert.equal(numbers.reduce((n,v)=>n+v,0),sum);return numbers;
}
try{
 await page.waitForFunction(()=>window.SweetsSugarChallengeV254?.describe&&window.SugarChallengeRulesV254?.REVISION===271&&document.querySelector('.sc254-overlay'),null,{timeout:20000});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.sc254-overlay img,.sc254-celebration img,.sc254-dock img')].map(image=>image.decode()));window.__sugarView254={revision:100000,acceptedIds:[]};});
 await page.emulateMedia({reducedMotion:'no-preference'});await sleep(150);
 report.nativeBefore=await page.evaluate(()=>{const a=window.__qa250.app;return {credit:a.credit,bets:a.bets.slice(),draws:a.draws.slice(),totalWin:a.totalWin,phase:a.phase};});

 const bank=sugarValues.map((value,i)=>({id:'sugar-'+i,sugarId:'isolated-sugar-view:token:'+i,game:i,value,challengeValue:value,sourceBet:100,sourceGame:['cookie','choco','candy','gelato','winery'][i],sourceRoundId:'isolated-sugar-prior',directJpc:false}));
 preserved(await inject({challenge:false,queued:true,bank}));
 await page.waitForFunction(()=>!document.querySelector('.sc254-announcement').hidden);
 const announce=await read();report.announcement=announce.announcement;assert.equal(announce.api.bankCount,5);assert.match(announce.announcement.text,/5 SUGAR GET!/);assert.match(announce.announcement.text,/BETタイムでJP・倍率を決定/);assert.equal(announce.announcement.pointerEvents,'none');
 await page.screenshot({path:output+'/five-sugar-announcement.png'});

 const introRecord=await inject({id:'sugar-intro'});preserved(introRecord);
 await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().intro>=900&&window.SweetsSugarChallengeV254.describe().intro<3250,null,{timeout:5000});
 const early=await read();assert.equal(early.scale.visible,true);assert.equal(early.bottle.visible,false);assert.equal(early.scale.gems.length,5);assert.ok(early.scale.gems.some(gem=>gem.poured==='true'));assert.ok(early.scale.amount>0&&early.scale.amount<5000);assert.equal(early.scale.pouring,'true');assert.equal(early.api.bankCount,0);assert.equal(early.scale.amount%500,0,'JP count-up uses500 increments');assert.equal(early.reel.ready,'false','multiplier waits for the final base');assert.equal(early.reel.position,0);
 await page.screenshot({path:output+'/scale-intro.png'});
 await page.locator('#open-record-menu').click();await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().paused);
 const menuBefore=await read();await sleep(240);const menuAfter=await read();assert.equal(menuAfter.api.intro,menuBefore.api.intro,'opening MENU freezes the scale presentation clock');assert.ok(menuAfter.animations.every(animation=>animation.state==='paused'||animation.state==='finished'));
 await page.locator('#record-close-top').click();await page.waitForFunction(()=>!window.SweetsSugarChallengeV254.describe().paused);
 await page.evaluate(()=>{window.__sugarHidden254=Object.getOwnPropertyDescriptor(document,'hidden');Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 const hiddenBefore=await read();await sleep(240);const hiddenAfter=await read();assert.equal(hiddenAfter.api.intro,hiddenBefore.api.intro,'hidden documents freeze the presentation clock');assert.equal(hiddenAfter.api.paused,true);
 await page.evaluate(()=>{const old=window.__sugarHidden254;if(old)Object.defineProperty(document,'hidden',old);else delete document.hidden;delete window.__sugarHidden254;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().intro>=3600&&window.SweetsSugarChallengeV254.describe().intro<6000,null,{timeout:7000});
 const roulette=await read();assert.equal(roulette.scale.amount,5000);assert.equal(roulette.jp.value,5000);assert.equal(roulette.reel.base,5000);assert.equal(roulette.reel.ready,'true');assert.equal(roulette.reel.spinning,'true');assert.match(roulette.phaseText,/倍率決定/);
 await sleep(160);const movingReel=await read();assert.ok(movingReel.reel.position>roulette.reel.position,'image cards move horizontally along the repeated strip');assert.equal(movingReel.reel.base,5000,'base remains fixed during the reel');
 await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().intro>=9700&&window.SweetsSugarChallengeV254.describe().intro<10400,null,{timeout:9000});const stoppedReel=await read();assert.equal(stoppedReel.reel.settled,'true');assert.equal(stoppedReel.reel.targetMultiplier,3);assert.equal(stoppedReel.reel.position,stoppedReel.reel.target);assert.ok(Math.abs(stoppedReel.reel.targetCard.width-stoppedReel.reel.targetCard.height)<1,'the ornate emblem keeps a square image card');assert.ok(stoppedReel.reel.targetCard.width>stoppedReel.reel.window.width/5,'the main multiplier image has a legible share of the full-width reel');assert.ok(Math.abs((stoppedReel.reel.targetCard.left+stoppedReel.reel.targetCard.right)/2-(stoppedReel.reel.window.left+stoppedReel.reel.window.right)/2)<1,'server multiplier image stops under the fixed center marker');
 await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().intro>=10500,null,{timeout:6000});const settled=await read();verifyPanel(settled);assert.equal(settled.bottle.visible,true);assert.equal(settled.scale.visible,false);
 const repeated=await page.evaluate(()=>{const ui=window.SweetsSugarChallengeV254,before=ui.describe();ui.accept({...window.__sugarView254.last,revision:++window.__sugarView254.revision});return {before,after:ui.describe()};});assert.equal(repeated.after.intro,repeated.before.intro,'repeated snapshots do not replay the five-Sugar intro');
 report.intro={early,roulette,movingReel,stoppedReel,settled,repeated};report.lifecycle={menuBefore:menuBefore.api,menuAfter:menuAfter.api,hiddenBefore:hiddenBefore.api,hiddenAfter:hiddenAfter.api};

 for(const [width,height]of [[390,844],[844,390],[1366,900]]){
  await page.setViewportSize({width,height});await sleep(100);preserved(await inject({draws:[1,2,3,10]}));
  const pouring=await read();assert.equal(pouring.bottle.pouring,'true');
  await sleep(820);const state=await read();verifyPanel(state);assert.equal(state.bottle.sum,16);assert.equal(state.bottle.label,'4 / 8球');assert.ok(Math.abs(state.bottle.fill-16/172*100)<.01);assert.deepEqual(state.history.filter(ball=>ball.hit==='true').map(ball=>Number(ball.text)),[1,2,3,10]);assert.deepEqual(state.lucky,[77]);
  await page.screenshot({path:output+'/sugar-panel-'+width+'x'+height+'.png'});
  await page.locator('.sc254-overlay').click();const folded=await read();assert.equal(folded.overlay.visible,false);assert.equal(folded.dock.visible,true);assert.equal(folded.dock.parent,'cookie-roulette');contained(folded.dock.rect,folded.dock.parentRect,'folded roulette dock');
  await page.locator('.sc254-dock').click();const expanded=await read();assert.equal(expanded.overlay.visible,true);assert.equal(expanded.dock.visible,false);assert.equal(expanded.api.challenge.id,state.api.challenge.id);assert.equal(expanded.api.challenge.sum,state.api.challenge.sum,'folding never changes the active challenge');
  report.screens.push({width,height,state,pouring:pouring.bottle,folded:folded.dock,expanded:expanded.overlay});
 }
 preserved(await inject({id:'sugar-large-jp',values:[30000,30000,30000,30000,30000],multiplier:10,draws:[1,2,3,10]}));
 for(const [width,height]of [[390,844],[844,390],[1366,900]]){
  await page.setViewportSize({width,height});await sleep(150);
  const state=await read();verifyPanel(state,{jp:150000,multiplier:10});
  contained(state.jp.face,state.jp.rect,'seven-digit JP fits after same-value resize');
  for(const row of state.payouts)contained(row.valueFace,row.valueRect,'large payout fits '+row.value);
  await page.screenshot({path:output+'/sugar-large-jp-'+width+'x'+height+'.png'});report.highAmounts.push({width,height,state});
 }
 // The panel may be compact even on a wide monitor. Constrain only its
 // logical box to reproduce320x300 without changing wallet or game geometry.
 await page.evaluate(()=>{const node=document.querySelector('.sc254-overlay');window.__sugarCompactStyle=node.getAttribute('style');Object.assign(node.style,{width:'320px',height:'300px',inset:'auto',left:'0px',top:'0px'});window.SweetsSugarChallengeV254.setExpanded(true);});
 preserved(await inject({id:'sugar-compact-v270',values:[40000,40000,40000,40000,40000],multiplier:10,draws:[1,2,3,10]}));await sleep(820);
 const compact=await read();verifyPanel(compact,{jp:200000,multiplier:10});contained(compact.bottle.labelRect,compact.bottle.rect,'compact bottle label');
 assert.ok(compact.table.bottom<=compact.bottom.top+.5,'all six payout rows end above the history and phase area');
 for(const row of compact.payouts)contained(row.valueFace,row.valueRect,'compact high-JP payout '+row.value);
 contained(compact.historyRect,compact.overlay.rect,'compact history');report.compact=compact;await page.screenshot({path:output+'/sugar-compact-320x300.png'});
 await page.evaluate(()=>{const node=document.querySelector('.sc254-overlay');if(window.__sugarCompactStyle===null)node.removeAttribute('style');else node.setAttribute('style',window.__sugarCompactStyle);delete window.__sugarCompactStyle;window.SweetsSugarChallengeV254.setExpanded(true);});
 for(const [cardId,lucky,high]of [['standard',[77],139],['lucky',[77,88],139],['wide',[77],130]]){
  preserved(await inject({cardId,draws:[1,2,3,10]}));const state=await read();verifyPanel(state);assert.deepEqual(state.lucky,lucky);assert.doesNotMatch(state.extremes,/LOW/);assert.match(state.extremes,new RegExp('合計 '+high+' 以上'));assert.equal(state.cardName.includes('RARE CARD'),cardId!=='standard');report.cards.push({cardId,lucky:state.lucky,extremes:state.extremes,name:state.cardName});
 }
 for(const [sum,win]of [[36,1000],[74,1000],[80,500],[86,250],[92,150],[98,100],[104,50]]){
  const record=await inject({draws:numbersForSum(sum)});preserved(record);const state=await read();assert.equal(record.challenge.cashWin,win);assert.equal(record.challenge.jpcQualified,false);assert.equal(state.payouts.filter(row=>row.current).length,1);assert.equal(state.payouts.find(row=>row.current).value,win);assert.match(state.phaseText,new RegExp(win+' WIN GET!'));assert.equal(state.celebration.visible,false);report.awards.push({sum,win,phaseText:state.phaseText,current:state.payouts.find(row=>row.current)});
 }

 const seven=[1,2,3,10,15,19,21],luckyId='sugar-lucky-jpc';preserved(await inject({id:luckyId,draws:seven}));const reach=await read();assert.match(reach.reach,/JPCリーチ/);assert.match(reach.reach,/JPCリーチ　6$/);
 const luckyRecord=await inject({id:luckyId,draws:[...seven,6]});preserved(luckyRecord);await sleep(900);const lucky=await read();assert.equal(luckyRecord.challenge.sum,77);assert.equal(luckyRecord.challenge.award.reason,'lucky');assert.equal(luckyRecord.challenge.cashWin,0);assert.equal(lucky.api.challenge.jpcQualified,true);assert.match(lucky.reach,/合計 77 でJPC確定/);assert.equal(lucky.celebration.visible,true);assert.equal(lucky.celebration.loaded,true);assert.match(lucky.celebration.image,/sugar-art-v254\/jpc-title\.webp/);assert.match(lucky.celebration.alt,/JACKPOT CHANCE/);assert.equal(lucky.celebration.pointerEvents,'none');contained(lucky.celebration.title,lucky.celebration.rect,'illustrated JACKPOT CHANCE title');
 await page.screenshot({path:output+'/lucky-jpc.png'});
 const luckyRepeat=await page.evaluate(()=>{const ui=window.SweetsSugarChallengeV254,before=ui.describe().celebrateAge;ui.accept({...window.__sugarView254.last,revision:++window.__sugarView254.revision});return {before,after:ui.describe().celebrateAge};});assert.equal(luckyRepeat.after,luckyRepeat.before,'JPC artwork never replays for duplicate server snapshots');
 await page.locator('.sc254-overlay').click();await page.locator('#open-record-menu').click();await page.waitForFunction(()=>window.SweetsSugarChallengeV254.describe().paused);const pausedDock=await read();assert.equal(pausedDock.dock.paused,'true');assert.equal(pausedDock.dock.animationPlayState,'paused','the folded JPC glow pauses along with the expanded UI');await page.locator('#record-close-top').click();
 report.lucky={reach:reach.reach,state:lucky,repeated:luckyRepeat,pausedDock:pausedDock.dock};

 // Current rules qualify at the first lucky prefix, before the final ball.
 const earlyJpc=await inject({id:'sugar-early-v271',rulesRevision:271,draws:[25,24,20,8]});preserved(earlyJpc);
 const earlyView=await read();assert.equal(earlyJpc.challenge.draws.length,4);assert.equal(earlyJpc.challenge.sum,77);assert.equal(earlyJpc.challenge.jpcQualified,true);assert.equal(earlyView.celebration.visible,true);assert.match(earlyView.reach,/77.*4球目/);
 const heldJpc=await inject({id:'sugar-early-v271',rulesRevision:271,draws:[25,24,20,8,1,2,3,4]});preserved(heldJpc);
 const heldView=await read();assert.equal(heldJpc.challenge.sum,87);assert.equal(heldJpc.challenge.jpcQualified,true);assert.equal(heldJpc.challenge.cashWin,0);assert.match(heldView.reach,/77.*4球目/);assert.equal(heldView.payouts.filter(row=>row.current).length,0);
 report.earlyJpc={first:earlyView,final:heldView};
 for(const rulesRevision of [254,268,270]){preserved(await inject({rulesRevision,draws:[1,2,3,10]}));const legacy=await read();verifyPanel(legacy,{jp:5000,cashBase:15000});assert.deepEqual(legacy.lucky,[77,88,120,131]);assert.match(legacy.extremes,/LOW 70/);}await page.screenshot({path:output+'/early-lucky-jpc-v271.png'});
 await page.emulateMedia({reducedMotion:'reduce'});preserved(await inject({id:'sugar-reduced'}));const reduced=await read();verifyPanel(reduced);assert.equal(reduced.overlay.reduced,'true');assert.equal(reduced.scale.visible,false);assert.equal(reduced.bottle.visible,true);assert.equal(reduced.bottle.pouring,'false');assert.ok(reduced.animations.every(animation=>animation.state==='finished'));report.reduced=reduced;
 const reducedHit=await inject({id:'sugar-reduced',draws:[25]});preserved(reducedHit);const hit=await read();assert.equal(hit.bottle.sum,25,'reduced motion presents the exact sum immediately');assert.equal(hit.bottle.pouring,'false');assert.ok(Math.abs(hit.bottle.fill-25/172*100)<.01);
 const finalNative=await page.evaluate(()=>{const a=window.__qa250.app;return {credit:a.credit,bets:a.bets.slice(),draws:a.draws.slice(),totalWin:a.totalWin,phase:a.phase};});assert.deepEqual(finalNative,report.nativeBefore,'all purely visual scenarios preserve native wallet, bets and lottery history');report.nativeAfter=finalNative;
 assert.deepEqual(errors,[],'no page errors');report.errors=errors;await fs.writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');
 console.log('SUGAR_V254_BROWSER_PASS',JSON.stringify({screens:report.screens.length,cards:report.cards.length,awards:report.awards.length,jpc:77,creditUnchanged:true,errors}));
}catch(error){
 report.failure={message:String(error),stack:error.stack,errors,warnings:fixture.warnings};try{report.failure.state=await read();await page.screenshot({path:output+'/failure.png'});}catch(captureError){report.failure.captureError=String(captureError);}
 await fs.writeFile(output+'/partial-result.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(output+'/server.log',fixture.logs.slice(-20000));console.error('SUGAR_V254_BROWSER_FAIL',error,JSON.stringify(errors));throw error;
}finally{await fixture.close();}
