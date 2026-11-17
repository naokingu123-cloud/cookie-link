import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s);
function once(s,a,b,label){if(s.split(a).length!==2)throw Error('Forecast v243 source contract: '+label);return s.replace(a,b);}
let station=read('assets/stations-v235.js');
if(!station.includes('function groupedNoGainV243(')){
 const helper=`// Grouped cookie/candy games only collect the next number after ball 1 or
// ball 3. That next HIT cannot award a medal yet; no simulation is necessary.
// Never infer zero for a busy board, a single-HIT game, or an unknown phase.
function groupedNoGainV243(e,a){
 const kind=String(e?.kind||''),count=a?.draws?.length,done=count===1?0:count===3?3:-1;
 if(!['cookie','candy'].includes(kind)||done<0||a?.phase!=='playing'||a.paused)return false;
 if(kind==='cookie'&&(e.reachMode==='single'||e.drawMode==='single'))return false;
 return Number(e.processed)===done&&Number(e.accepted)===done&&!e.busy&&!e.opening&&!e.transitionPending&&!e.fx&&!(e.queue?.length)&&['waiting','settled'].includes(e.phase)&&Number.isFinite(Number(e.totalHundredths));
}
`;
 station=once(station,'function currentDetail(a,round,active,boardSlots,readCache,calculate){',helper+'function currentDetail(a,round,active,boardSlots,readCache,calculate){','grouped no-award helper');
 station=once(station,"  let entries=null;\n  if(s&&s.tabReachVersion===e.version&&s.reachStatus==='ready')try{entries=readCache?.(s,a);}catch{}", "  const noGain=groupedNoGainV243(e,a);let entries=noGain?[]:null;\n  if(!noGain&&s&&s.tabReachVersion===e.version&&s.reachStatus==='ready')try{entries=readCache?.(s,a);}catch{}",'recognize collection-only slots');
 station=once(station,'  const perGame=new Map(),base=amount(s.tabReachBase);','  const perGame=new Map(),base=noGain?amount(e.totalHundredths):amount(s.tabReachBase);','zero contribution keeps actual baseline');
 station=once(station,"  c.node.style.gridColumn='1';\n  c.node.style.gridRow=String(i+1);", "  if(c.node.style.gridColumn!=='1')c.node.style.gridColumn='1';\n  if(c.node.style.gridRow!==String(i+1))c.node.style.gridRow=String(i+1);",'no repeated grid writes');
 station=once(station,'  const key=JSON.stringify([row,photo,hue,p]);','  const key=JSON.stringify([row.station,row.playerId,own,row.empty,row.connected,row.name,row.win,row.settled,row.test,photo,hue,p.tier,p.highestReach]);','paint only displayed changes');
 station=once(station,'paint,currentWin,currentDetail,rowPresentation};','paint,currentWin,currentDetail,rowPresentation,groupedNoGainV243};','testable collection-only rule');
 write('assets/stations-v235.js',station);
}
let preview=read('assets/stations-number-preview-v241.js');
if(!preview.includes('collectionOnlyV243')){
 preview=once(preview,"  const slot=(boardSlots||[]).find(s=>s?.engine===a.engines[i]);",`  const collectionOnlyV243=groupedNoGainV243(a.engines[i],a);
  if(collectionOnlyV243){
   try{const value=calculate(bet,amount(a.engines[i].totalHundredths));if(!Number.isFinite(value)||value<0){validBase=false;break;}baseWin+=value;}catch{validBase=false;break;}
   continue;
  }
  const slot=(boardSlots||[]).find(s=>s?.engine===a.engines[i]);`,'grouped collection baseline');
 write('assets/stations-number-preview-v241.js',preview);
}
console.log('CLIENT_V243_CACHED_FORECAST_APPLIED');
