import fs from 'node:fs';
function edit(path,fn){fs.writeFileSync(path,fn(fs.readFileSync(path,'utf8')));}
function once(s,a,b){if(s.split(a).length!==2)throw Error('v242 polish source drift '+a.slice(0,80));return s.replace(a,b);}
edit('assets/server-monitor-v242.css',s=>s.includes('v242 separate rail and iframe')?s:s+`\n/* v242 separate rail and iframe: keep all six St cards outside the video. */\nbody .station-host-card-v238 .host-frame,body .host-card .host-frame{margin-left:84px!important;width:calc(100% - 84px)!important;flex:1;align-self:flex-start}\n@media(max-width:800px){body .station-host-card-v238 .host-frame,body .host-card .host-frame{margin-left:48px!important;width:calc(100% - 48px)!important}}\n`);
edit('assets/server-monitor-v241.js',s=>s.includes('v242 update independent of focused inputs')?s:once(s,'  const config=payout(data).config||{};','  // v242 update independent of focused inputs\n  window.SweetsMonitorSnapshotV242=data;window.SweetsPayoutTrendV242?.update(data.payoutTrendV242);\n  const config=payout(data).config||{};'));
edit('assets/shared-machine-core-v196.js',s=>s.includes('v242 no stale host callback')?s:once(s,'  function syncHost(round=client.round){','  function syncHost(round=client.round){\n   // v242 no stale host callback may restart a cancelled physical round.\n   if(round?.id!==client.round?.id)round=client.round;'));
edit('server-core.mjs',s=>{
 const target='if(m.operatorRequestsV242?.[requestId])return {...m.operatorRequestsV242[requestId],idempotent:true};';
 if(!s.includes(target))return s;
 if(s.split(target).length!==3)throw Error('two idempotent operator returns required');
 return s.split(target).join('if(m.operatorRequestsV242?.[requestId]){await flushDb();return {...m.operatorRequestsV242[requestId],idempotent:true};}');
});
console.log('V242_OPERATOR_POLISH_READY');
