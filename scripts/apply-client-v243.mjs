import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s);
function once(s,a,b,label){const n=s.split(a).length-1;if(n!==1)throw Error('Client v243 source contract: '+label+' count='+n);return s.replace(a,b);}
let loader=read('assets/shared-machine-v176.js');
// Cache keys are release numbers; exported API names are NOT release numbers.
if(loader.includes('window.SweetsStationNumbersV242.patch'))loader=once(loader,'window.SweetsStationNumbersV242.patch','window.SweetsStationNumbersV241.patch','number preview API');
loader=loader.replaceAll('?v=242','?v=243').replace('[SharedMachineLoaderV242]','[SharedMachineLoaderV243]').replace('core-v196-v242-patched','core-v196-v243-patched');
write('assets/shared-machine-v176.js',loader);
let controller=read('assets/shared-client-controller-v224.js');
if(!controller.includes('persistChangedV243')){
 controller=once(controller,"operatorVoidsV242.has(String(round.forcedFromRoundId))&&manualBetRoundId!==String(round.id)","operatorVoidsV242.has(String(round.forcedFromRoundId))&&!autoRebet&&manualBetRoundId!==String(round.id)",'restore automatic re-entry after confirmed refund');
 controller=once(controller,' let reset=false,changed=false;',' let reset=false,changed=false,persistChangedV243=false;','refund persistence dirty flag');
 controller=once(controller,'  delete lossQueue[id];normalPending.delete(id);normalReview.delete(id);',`  // Repeated historical notices must not synchronously write storage on every
  // HTTP response and WebSocket snapshot. Only removed persisted entries matter.
  persistChangedV243=persistChangedV243||Object.prototype.hasOwnProperty.call(lossQueue,id)||normalPending.has(id)||normalReview.has(id);
  delete lossQueue[id];normalPending.delete(id);normalReview.delete(id);`,'dirty persisted queue detection');
 controller=once(controller,' saveLosses();saveNormals();try{localStorage.setItem(NORMAL_REVIEW_KEY,JSON.stringify(Object.fromEntries(normalReview)));}catch{}',' if(persistChangedV243){saveLosses();saveNormals();try{localStorage.setItem(NORMAL_REVIEW_KEY,JSON.stringify(Object.fromEntries(normalReview)));}catch{}}','write refunds only on changed queues');
 controller=once(controller,"  status('BET','BET全額返却済み・「BETする」で再参加');","  status('BET',autoRebet?'BET全額返却済み・自動BETを再登録':'BET全額返却済み・「BETする」で再参加');",'accurate refund status');
 write('assets/shared-client-controller-v224.js',controller);
}
let index=read('index.html');index=index.replace('assets/shared-machine-v176.js?v=242','assets/shared-machine-v176.js?v=243');write('index.html',index);
write('app-version.json',JSON.stringify({version:'20261117-v243-client-rejoin-forecast-performance'})+'\n');
write('tests/operator-client-v242.mjs',"// v243 preserves refund confirmation but restores AUTO REBET after it.\nawait import('./client-rejoin-v243.mjs');\n");
console.log('CLIENT_V243_REJOIN_AND_STORAGE_APPLIED');
