/* Current Waffle UI and settlement through an isolated, authenticated server.
   Only the host transport chooses test balls; native guards and engines run intact. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep,until} from './ui-v250-fixture.mjs';

const output=process.env.SWEETS_QA_OUTPUT_DIR||'qa-waffle-v255';
const openingRack=[0,20,20,40,40,100,100,150,200,300,400,500,1000,1500];
const topPrizes=[2000,2500,3000,4000,5000,7500,10000];
const topPrize=grade=>grade<topPrizes.length?topPrizes[grade]:10000+2500*(grade-6);
const medals=(bet,hundredths)=>Math.floor(bet*hundredths/100);

function observe(){
 const q=window.__qa250,a=q.app,e=window.BingoStick.engine,s=e.state,root=document.querySelector('.bs-scene');
 const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const grid=root.querySelector('.bs-grid'),pay=root.querySelector('.bs-pay'),canvas=grid.querySelector('canvas');
 const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;
 return {phase:a.phase,paid:a.paid[a.engines.indexOf(e)],roundWin:a.roundWins[a.engines.indexOf(e)],totalWin:a.totalWin,
  processed:e.processed,running:e.running,idle:e.idle,draws:a.draws.slice(),
  state:{draws:s.draws,colors:s.colors,rack:s.rack,grade:s.grade,total:s.totalHundredths,flips:s.lastFlips,pow:s.lastPowActive,knockRows:s.lastKnockRows,reversal:s.reversalThisMove,phase:s.phase},
  grade:Number(pay.dataset.grade),win:Number(root.querySelector('.bs-total').textContent),bonus:root.querySelector('.bs-bonus strong').textContent,
  rows:[...pay.querySelectorAll('tr[data-count]')].map(row=>({count:Number(row.dataset.count),value:Number(row.querySelector('.bs-block:not(.bs-incoming) span').getAttribute('aria-label').replace(' WIN','')),rect:rect(row)})),
  scene:rect(root),board:rect(grid),pay:rect(pay),painted,boardLabel:grid.getAttribute('aria-label'),width:innerWidth};
}
function contained(inner,outer,label){
 assert(inner.width>0&&inner.height>0,label+' is visible');
 assert(inner.left>=outer.left-2&&inner.top>=outer.top-2&&inner.right<=outer.right+2&&inner.bottom<=outer.bottom+2,label+' fits: '+JSON.stringify({inner,outer}));
}
function verifyView(view,bet,rack,total,grade){
 assert.equal(view.grade,grade);assert.equal(view.win,medals(bet,total));
 assert.equal(view.rows.length,13);
 for(const row of view.rows)assert.equal(row.value,medals(bet,total+rack[row.count])-medals(bet,total),'visible payout including fractional carry, row '+row.count);
 assert.match(view.bonus,new RegExp('(?:^|\\s)'+bet*3000+' WIN$'),'current 3000x reversal award');
 assert.match(view.boardLabel,/8行8列/);assert(view.painted>1000,'real board canvas is painted');
 contained(view.board,view.scene,'board');contained(view.pay,view.scene,'paytable');
 for(const row of view.rows)contained(row.rect,view.pay,'payout row '+row.count);
 assert(view.scene.left>=-2&&view.scene.right<=view.width+2,'board and paytable fit the narrow viewport');
}

for(const [bet,width] of [[7,320],[100,390]]){
 const out=output+'/bet-'+bet,fixture=await createUiFixture({search:'?games=waffle',startRound:false,viewport:{width,height:844},output:out});
 const {page,context,call,host,base,errors}=fixture,report={bet,width,version:fixture.version,balls:[]},external=[];
 context.on('request',request=>{const url=new URL(request.url());if(/^https?:$/.test(url.protocol)&&url.origin!==base)external.push(url.origin+url.pathname);});
 try{
  await page.waitForFunction(()=>window.WafflePowV159?.version===232&&window.SweetsSharedControllerV224?.stable()&&window.SweetsSharedControllerV224.canEditBets(window.__qa250.app));
  const session=await page.evaluate(()=>{const c=window.SweetsSharedMachine.client;return {player:{id:c.playerId},token:c.token};});
  const before=(await call('/api/machines/public-01/state',{session})).payoutControlV3;
  const selected=await page.evaluate(bet=>{
   const q=window.__qa250,a=q.app,id=a.engines.findIndex(e=>e.kind==='stick');
   const edited=a.bets.map((_,i)=>a.setBet(i,0));edited.push(a.setBet(id,bet));q.select(id);
   return {id,edited,bets:a.bets.slice(),bonus:window.BingoStickRules.sweepBonusHundredths};
  },bet);
  assert(selected.id>=0);assert(selected.edited.every(Boolean),'native BET edit guards accept the selection');
  assert.equal(selected.bets.reduce((a,b)=>a+b,0),bet);assert.equal(selected.bonus,300000);
  await call('/api/admin/machines/public-01/host/register',{session:host,body:{},adminOnly:true});
  const round=await until(async()=>{const state=await call('/api/machines/public-01/state',{session});return state.round?.phase==='PLAYING'?state.round:null;},'accepted Waffle round');
  report.roundId=round.id;assert.equal(round.participant.totalBet,bet);
  assert.equal(round.participant.creditAfterBet,before.wallet.credit-bet);
  await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id&&window.__qa250.app.phase==='playing'&&window.BingoStick.engine.running,round.id);
  await page.evaluate(()=>window.SweetsSharedControllerV224.setAutoRebet(false));
  await page.waitForFunction(()=>document.querySelector('.bs-pay')?.dataset.grade==='0'&&window.BingoStick.engine.idle);
  const initial=await page.evaluate(observe);report.initial=initial;
  assert.equal(initial.state.colors.filter(Boolean).length,44);assert.deepEqual(initial.state.rack,openingRack);
  verifyView(initial,bet,openingRack,0,0);await page.screenshot({path:out+'/opening.png'});
  // Project a useful eight-ball sequence from this genuine opening, without
  // replacing its RNG, state, presentation clock or settlement implementation.
  const plan=await page.evaluate(()=>{
   const R=window.BingoStickRules,start=window.BingoStick.engine.state,saved=JSON.stringify(start),turns=[];let state=start;
   for(let i=0;i<8;i++){
    const candidates=Array.from({length:25},(_,n)=>n+1).filter(n=>!state.draws.includes(n));
    const number=i===0?start.offBoardNumbers[0]:candidates.sort((a,b)=>R.project(state,b).lastFlips-R.project(state,a).lastFlips||a-b)[0];
    state=R.draw(state,number);turns.push({number,flips:state.lastFlips,pow:state.lastPowActive,reversal:state.reversalThisMove,colors:state.colors});
   }
   return {turns,unchanged:JSON.stringify(start)===saved,numbers:start.numbers.filter(n=>n!==null).length,offBoard:start.offBoardNumbers.length};
  });
  assert.equal(plan.unchanged,true);assert.equal(plan.numbers,20);assert.equal(plan.offBoard,5);
  const numbers=plan.turns.map(turn=>turn.number);assert.equal(new Set(numbers).size,8);report.numbers=numbers;
  let rack=openingRack.slice(),grade=0,total=0,finalView;
  await sleep(Math.max(0,Number(round.drawStartsAt)-Date.now()+20));
  for(const [index,turn] of plan.turns.entries()){
   const count=index+1,row=Math.min(13,turn.flips),knocks=(row?(turn.pow?[row+1,row,row-1]:[row]):[]).filter(n=>n>=1&&n<=13).sort((a,b)=>b-a);
   total+=rack[row]+(turn.reversal?300000:0);
   for(const knock of knocks)rack.splice(knock,1);
   for(let i=0;i<knocks.length;i++)rack.push(topPrize(grade+i));grade+=knocks.length;
   const accepted=await call('/api/machines/public-01/round/ball',{session:host,body:{roundId:round.id,ballIndex:count,number:turn.number,eventId:round.id+':waffle255:'+count}});
   assert.equal(accepted.ball.number,turn.number);
   await page.waitForFunction(({count,grade,win})=>{
    const e=window.BingoStick.engine,a=window.__qa250.app,root=document.querySelector('.bs-scene');
    return e.processed===count&&e.idle&&Number(root.querySelector('.bs-pay').dataset.grade)===grade&&Number(root.querySelector('.bs-total').textContent)===win&&(count<8||a.paid[a.engines.indexOf(e)]);
   },{count,grade,win:medals(bet,total)},{timeout:30000});
   const view=await page.evaluate(observe);report.balls.push(view);finalView=view;
   assert.deepEqual(view.state.draws,numbers.slice(0,count));assert.deepEqual(view.state.colors,turn.colors);
   assert.deepEqual(view.state.knockRows,knocks);assert.deepEqual(view.state.rack,rack);
   assert.equal(view.state.grade,grade);assert.equal(view.state.total,total);
   verifyView(view,bet,rack,total,grade);
  }
  const win=medals(bet,total);assert(win>0,'the real sequence exercises a positive payout');
  assert.equal(finalView.state.phase,'done');assert.equal(finalView.processed,8);assert.equal(finalView.running,false);assert.equal(finalView.paid,true);
  assert.deepEqual(finalView.draws,numbers);assert.equal(finalView.roundWin,win);assert.equal(finalView.totalWin,win);
  await page.waitForFunction(({id,win})=>{
   const layer=document.getElementById('round-result-layer'),row=layer?.querySelector('[data-game-index="'+id+'"]'),value=row?.querySelector('.result-value');
   return layer&&!layer.hidden&&layer.dataset.sr253Phase==='hold'&&row?.dataset.sr253Revealed==='true'&&Number(value?.dataset.value)===win;
  },{id:selected.id,win},{timeout:10000});
  report.result=await page.evaluate(id=>{const layer=document.getElementById('round-result-layer'),row=layer.querySelector('[data-game-index="'+id+'"]');return {win:Number(row.querySelector('.result-value').dataset.value),text:row.textContent,total:document.getElementById('result-total-win').textContent};},selected.id);
  assert.equal(report.result.win,win);await page.screenshot({path:out+'/result.png'});
  const settled=await until(async()=>{const s=await call('/api/machines/public-01/state',{session}),p=s.payoutControlV3;return p.wallet.lastRoundId===round.id&&p.wallet.source==='client'?s:null;},'native client settlement');
  const control=settled.payoutControlV3;report.settlement={wallet:control.wallet,bet:control.currentRoundBet,win:control.currentRoundWin,game:control.games.stick};
  assert.equal(control.wallet.credit,before.wallet.credit-bet+win);assert.equal(control.wallet.reservedRoundId,null);
  assert.equal(control.lifetimeBet-before.lifetimeBet,bet);assert.equal(control.lifetimeWin-before.lifetimeWin,win);
  assert.equal(control.currentRoundWin,win);assert.equal(control.lastBall,8);assert.equal(control.games.stick.bet,bet);assert.equal(control.games.stick.win,win);
  assert(fixture.requests.some(request=>request.path.endsWith('/round/join')),'native controller submits BET');
  assert(fixture.requests.some(request=>request.path.endsWith('/round/settle')),'native controller settles the result');
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>entry.name));
  for(const resource of resources){const url=new URL(resource);if(/^https?:$/.test(url.protocol)&&url.origin!==base)external.push(url.origin+url.pathname);}
  assert.deepEqual(external,[],'all browser traffic stays on the isolated server');assert.deepEqual(errors,[],'zero JavaScript exceptions');
  report.errors=errors;report.externalRequests=external;
  await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
  console.log('WAFFLE_SERVER_V255_PASS',JSON.stringify({bet,width,balls:8,win,credit:control.wallet.credit,errors,external}));
 }catch(error){
  report.failure={message:String(error),stack:error.stack,errors,warnings:fixture.warnings};
  try{report.failure.state=await page.evaluate(observe);await page.screenshot({path:out+'/failure.png'});}catch(captureError){report.failure.captureError=String(captureError);}
  await fs.writeFile(out+'/failure.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/server.log',fixture.logs.slice(-20000));throw error;
 }finally{await fixture.close();}
}
