import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const DATA_FILE=process.env.SWEETS_DATA_FILE||path.join(ROOT,'data','shared-machine.json');
const DATA_DIR=process.env.SWEETS_DATA_DIR||path.dirname(DATA_FILE);
const LEGACY_SESSION_FILE=path.join(DATA_DIR,'autonomous-rounds-v213.json');
const SYNTHETIC_NAMES=new Set(['SERVER CLOCK','SERVER FALLBACK HOST']);

function syntheticPlayerIds(db){
 const ids=new Set();
 for(const [id,player] of Object.entries(db?.players||{})){
  if(SYNTHETIC_NAMES.has(String(player?.displayName||'').trim()))ids.add(id);
 }
 for(const machine of Object.values(db?.machines||{})){
  for(const round of [machine?.round,...(machine?.history||[])]){
   for(const [id,participant] of Object.entries(round?.participants||{})){
    if(String(participant?.appVersion||'').startsWith('server-autonomous-'))ids.add(id);
   }
  }
 }
 return ids;
}

function stripSynthetic(round,ids){
 if(!round)return round;
 round.participants=round.participants||{};
 for(const id of ids)delete round.participants[id];
 round.eligiblePlayerIds=(round.eligiblePlayerIds||[]).filter(id=>!ids.has(String(id)));
 return round;
}

function sanitize(){
 let db;
 try{db=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));}catch(error){
  if(error?.code!=='ENOENT')console.warn('[StartupSanitizeV217] data read',error?.message||error);
  try{fs.rmSync(LEGACY_SESSION_FILE,{force:true});}catch{}
  return;
 }
 const ids=syntheticPlayerIds(db);
 let changed=false;
 for(const machine of Object.values(db.machines||{})){
  if(ids.has(String(machine?.hostPlayerId||''))){machine.hostPlayerId=null;machine.hostRegisteredAt=0;changed=true;}
  const round=stripSynthetic(machine?.round,ids);
  if(round){
   const physicalHostLost=ids.has(String(round.hostPlayerId||''));
   const legacyFallback=round.drawSource==='server-fallback'||String(round.fallbackReason||'').includes('host');
   const noRealParticipants=!Object.keys(round.participants||{}).length;
   if(physicalHostLost||legacyFallback||noRealParticipants){machine.round=null;changed=true;}
  }
  for(const historical of machine?.history||[])stripSynthetic(historical,ids);
 }
 for(const id of ids){if(db.players?.[id]){delete db.players[id];changed=true;}}
 if(changed){
  try{
   fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});
   const temporary=DATA_FILE+'.v217.tmp';
   fs.writeFileSync(temporary,JSON.stringify(db,null,2));
   fs.renameSync(temporary,DATA_FILE);
   console.info('[StartupSanitizeV217] removed legacy autonomous players and phantom rounds');
  }catch(error){console.warn('[StartupSanitizeV217] data write',error?.message||error);}
 }
 try{fs.rmSync(LEGACY_SESSION_FILE,{force:true});}catch{}
}

sanitize();
