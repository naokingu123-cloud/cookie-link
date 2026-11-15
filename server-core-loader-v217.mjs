import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'server-core.mjs');
const OUTPUT_DIR=path.join(ROOT,'.runtime');
const OUTPUT=path.join(OUTPUT_DIR,'server-core-v217-generated.mjs');

function once(source,from,to,label){
 const count=source.split(from).length-1;
 if(count!==1)throw new Error(`[ServerCoreLoaderV217] ${label} matches=${count}`);
 return source.replace(from,to);
}

let source=await fs.readFile(SOURCE,'utf8');
source=once(source,
 "const ROOT=path.dirname(fileURLToPath(import.meta.url));",
 "const ROOT=process.cwd();",
 'generated module root');
source=once(source,
 "const HOST_FALLBACK_DELAY_MS=Math.max(300,Number(process.env.SWEETS_HOST_FALLBACK_DELAY_MS||3500));",
 "const HOST_FALLBACK_DELAY_MS=Math.max(300,Number(process.env.SWEETS_HOST_FALLBACK_DELAY_MS||3500));\nconst PLAYER_STABLE_MS=Math.max(500,Number(process.env.SWEETS_PLAYER_STABLE_MS||2800));",
 'stable player duration');
source=once(source,
 "function connected(machineId,playerId){const set=socketMap(machineId).get(playerId);return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN);}",
 "function connected(machineId,playerId){const set=socketMap(machineId).get(playerId);return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN);}\nfunction stablyConnected(machineId,playerId){const set=socketMap(machineId).get(playerId),time=now();return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN&&Number(ws.connectedAt)>0&&time-Number(ws.connectedAt)>=PLAYER_STABLE_MS);}",
 'stable socket helper');
source=once(source,
`function connectedPlayerIds(m){
 return [...socketMap(m.id).keys()].filter(id=>id!==m.hostPlayerId&&connected(m.id,id));
}`,
`function connectedPlayerIds(m){
 // A socket that merely opened for an instant is not eligible to create a BET
 // window. The player must remain continuously connected for PLAYER_STABLE_MS.
 return [...socketMap(m.id).keys()].filter(id=>id!==m.hostPlayerId&&stablyConnected(m.id,id));
}`,
 'stable BET eligibility');
source=once(source,
 " ws.isAlive=true;ws.missedPongs=0;",
 " ws.isAlive=true;ws.missedPongs=0;ws.connectedAt=now();",
 'socket connected timestamp');
source=once(source,
`   if(msg.type==='host_fallback_request'){
    if(player.id===m.hostPlayerId&&m.round?.phase==='PLAYING'&&(!msg.roundId||msg.roundId===m.round.id))activateServerFallback(m,m.round,'host_requested');
    return;
   }`,
`   if(msg.type==='host_fallback_request'){
    // v217 never replaces the physical machine with unexplained random balls.
    // Keep the authoritative round paused until the real host is available.
    return;
   }`,
 'disable requested random fallback');

await fs.mkdir(OUTPUT_DIR,{recursive:true});
await fs.writeFile(OUTPUT,source,'utf8');
await import(pathToFileURL(OUTPUT).href+'?v=217-'+Date.now());
console.info('[ServerCoreLoaderV217] stable-player core loaded; random fallback requests disabled');
