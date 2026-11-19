// Contract-only trusted engine fixture. Real native game/physics computation is
// independently exercised by download-v255-compute.mjs; this fixture lets the
// persistence tests stop a process at exact reservation/settlement boundaries.
export function computedFixtureV255(input,{numbers=[1,2,3,8,20,21,24,25],sugars=5}={}){
 const games=input.gameIds.map((id,i)=>({id,bet:input.bets[i],win:input.bets[i]*(i+1),...(id==='candy'?{rulesVersion:247,carryV247:{bankUnits:1234,removed:7,feed:13}}:{})}));
 const totalWin=games.reduce((n,g)=>n+g.win,0),round=(input.previousState?.trustedRounds||0)+1;
 const initialState={version:255,ballIndex:0,draws:[],credit:input.creditBefore-input.totalBet,trustedRounds:round-1,engines:input.gameIds.map(id=>({kind:id,processed:0}))};
 const checkpoints=Array.from({length:9},(_,i)=>({...initialState,ballIndex:i,draws:numbers.slice(0,i),engines:input.gameIds.map(id=>({kind:id,processed:i}))}));
 const finalState={...checkpoints[8],phase:'complete',credit:initialState.credit+totalWin,displayCredit:initialState.credit+totalWin,trustedRounds:round};
 const source=input.bets.findIndex(bet=>bet>0);
 const sugarTokens=source<0?[]:Array.from({length:sugars},(_,i)=>({id:i,game:source,sourceGame:input.gameIds[source],value:7,sugarId:input.sessionId+':'+source+':'+i,sourceRoundId:input.sessionId}));
 return {version:255,sessionId:input.sessionId,numbers,games,totalWin,initialState,finalState,sugarTokens,
  playback:{recording:{version:255,kind:'production-physics-frames',fps:30,physicsHz:120,sourceHash:'0'.repeat(64),durationMs:8000,
   frames:Array.from({length:9},(_,i)=>[i*1000,i/4,[],[0,0,0,1]]),hits:numbers.map((number,i)=>({index:i+1,number,atMs:(i+1)*1000,ball:i+1}))},checkpoints,rngTapes:{version:255,streams:{}}}};
}
