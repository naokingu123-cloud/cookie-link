import fs from 'node:fs';
function edit(p,a,b){const s=fs.readFileSync(p,'utf8');if(s.split(a).length!==2)throw Error(p+' test boundary mismatch: '+a);fs.writeFileSync(p,s.replace(a,b));}
const boot='tests/payout-v232-bootstrap.mjs';
edit(boot,'const context={URL,location,SweetsLineup:', 'const context={URL,URLSearchParams,location,SweetsLineup:');
edit(boot," vm.runInContext(source('assets/cookie-upgrade-patches.js'),context,{filename:'cookie-upgrade-patches.js'});", " vm.runInContext(source('assets/cookie-upgrade-patches.js'),context,{filename:'cookie-upgrade-patches.js'});\n vm.runInContext(source('assets/client-render-patch-v246.js'),context,{filename:'client-render-patch-v246.js'});");
const hidden='tests/client-hidden-browser-v246.mjs';
edit(hidden,"  const a=window.__client243.app;\n  window.__v246Phases=[];const previous=a.onChange;", `  const a=window.__client243.app;
  // Observe one completed round without the next AUTO REBET changing CREDIT.
  window.SweetsSharedControllerV224.setAutoRebet(false);
  window.__v246Phases=[];window.__v246Award=null;window.__v246AdvanceResult=0;
  const nativeAdvance=a.advanceResult;
  a.advanceResult=function(...args){window.__v246AdvanceResult++;return nativeAdvance.apply(this,args);};
  const previous=a.onChange;`);
edit(hidden,"  a.onChange=function(...args){if(window.__v246Phases.at(-1)!==a.phase)window.__v246Phases.push(a.phase);return previous.apply(this,args);};", `  a.onChange=function(...args){
   if(window.__v246Phases.at(-1)!==a.phase)window.__v246Phases.push(a.phase);
   if(['result','paying','complete'].includes(a.phase)&&a.result)window.__v246Award={phase:a.phase,win:a.totalWin,roundWins:[...a.roundWins],credit:a.credit};
   return previous.apply(this,args);
  };`);
edit(hidden,"  return value.phases.includes('result')&&value.phases.includes('paying')&&\n    value.phases.includes('complete')&&value.phase==='ready'?value:null;", "  return value.phases.includes('result')&&value.phases.includes('complete')&&value.phase==='ready'?value:null;");
edit(hidden," },'hidden real 9-game result, payout, and next ready',210000);", " },'hidden real 9-game result, payout, and next ready',140000);");
edit(hidden," const hiddenState=await page.evaluate(()=>({credit:window.__client243.app.credit,phases:window.__v246Phases}));\n assert.ok(hiddenState.credit>=973000,'the refunded and rebet wallet was not lost');", ` const hiddenState=await page.evaluate(()=>({credit:window.__client243.app.credit,phases:window.__v246Phases,award:window.__v246Award,advanceResult:window.__v246AdvanceResult}));
 assert.ok(hiddenState.award&&hiddenState.advanceResult>0,'native result logic advances while hidden');
 assert.equal(hiddenState.award.win,hiddenState.award.roundWins.reduce((a,b)=>a+b,0),'nine game award sum');
 assert.equal(hiddenState.credit,973000+hiddenState.award.win,'one exact credited award, no AUTO REBET in this assertion');
 const ledger=await call('/api/admin/machines/public-01',{adminOnly:true});
 const account=ledger.payoutControlV3.players.find(p=>p.playerId===playerId);
 assert.equal(account.lifetimeBet,27000,'the cancelled round must not be counted as IN');
 assert.equal(account.lifetimeWin,hiddenState.award.win,'server OUT equals the native game result');
 assert.equal(account.wallet.credit,hiddenState.credit,'local and server wallets agree');
 console.log('HIDDEN_NATIVE_ROUND',JSON.stringify(hiddenState));`);
edit(hidden,'const report={version,hiddenNineGameResultAndPayout:true,', 'const report={version,hiddenState,hiddenNineGameResultAndPayout:true,');
edit(hidden,"await fs.writeFile('docs/client-v243-qa.json'", "await fs.writeFile('docs/client-v246-qa.json'");
edit(hidden,"phase:window.__client243?.app.phase,draws:","phase:window.__client243?.app.phase,hiddenPhases:window.__v246Phases,award:window.__v246Award,resultAdvances:window.__v246AdvanceResult,draws:");
console.log('V246_QA_PREPARED');
