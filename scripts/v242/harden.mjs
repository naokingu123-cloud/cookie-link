import fs from 'node:fs';
function edit(path,fn){const s=fs.readFileSync(path,'utf8');fs.writeFileSync(path,fn(s));}
function once(s,a,b){if(s.split(a).length!==2)throw Error('v242 hardening contract '+a.slice(0,80));return s.replace(a,b);}
edit('assets/shared-client-controller-v224.js',s=>{
 if(s.includes('// v242 refund-confirmation barrier'))return s;
 s=once(s,' const waiting=operatorAwaitingV242.size>0;',' // v242 refund-confirmation barrier\n const waiting=operatorAwaitingV242.size>0;\n const confirmed=!waiting||[...operatorAwaitingV242].every(id=>notices.some(n=>String(n.roundId)===id&&Number(n.revision)>0&&validWallet&&Number(wallet.revision)>=Number(n.revision)));');
 s=once(s,' if(validWallet)rememberWallet(control);',' if(validWallet&&confirmed)rememberWallet(control);');
 s=once(s,'const credit=validWallet?Number(wallet.credit):Math.max(0,finite(app.credit));','const credit=validWallet&&confirmed?Number(wallet.credit):Math.max(0,finite(app.credit));');
 s=once(s,'if(validWallet&&waiting&&!active()','if(validWallet&&confirmed&&waiting&&!active()');
 s=once(s,'window.SweetsSharedControllerV224={operatorStateV242,','window.SweetsSharedControllerV224={operatorRefundPendingV242:()=>operatorAwaitingV242.size>0,operatorStateV242,');
 s=once(s,"async function abandonRound(reason='connection-lost'){","async function abandonRound(reason='connection-lost'){\n const refundEpochV242=operatorEpochV242;");
 s=once(s,"await hardReset(credit,'abandon-'+reason);settleZero(roundId,credit).catch(()=>{});","await hardReset(credit,'abandon-'+reason);if(refundEpochV242!==operatorEpochV242)return false;settleZero(roundId,credit).catch(()=>{});");return s;
});
edit('assets/server-payout-control-v3.js',s=>{
 if(s.includes('operatorRefundPendingV242'))return s;
 return once(s," const wallet=control?.wallet,playerId=String(control?.playerId||''),revision=Number(wallet?.revision),credit=Number(wallet?.credit);"," if(window.SweetsSharedControllerV224?.operatorRefundPendingV242?.())return;\n const wallet=control?.wallet,playerId=String(control?.playerId||''),revision=Number(wallet?.revision),credit=Number(wallet?.credit);");
});
console.log('V242_REFUND_BARRIER_READY');
