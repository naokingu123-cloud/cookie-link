import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../assets/shared-recovery-replay-v207.js',import.meta.url),'utf8');

function makeRound({id='round-1',phase='COMPLETE',ballCount=8,settled=false,initial=true,checkpointBall=8}={}){
 const initialState=initial?{draws:[],paid:[false],engines:[{processed:0,busy:false,queue:[]}],credit:700}:null;
 return {
  id,phase,balls:Array.from({length:ballCount},(_,index)=>({index:index+1,number:index+1})),
  participant:{
   playerId:'player-1',settlement:settled?{roundId:id,totalWin:10}:null,
   checkpointBall,checkpoint:{draws:Array.from({length:checkpointBall},(_,index)=>index+1),engines:[{processed:7,busy:true,queue:[]}]},
   initialState
  }
 };
}

function install({response,active=null,search=''}={}){
 const client={async getState(){return structuredClone(response);}};
 const shared={client,active};
 const context={window:null,location:{search},URLSearchParams,setTimeout(){throw new Error('unexpected install retry');},console,Date,structuredClone,SweetsSharedMachine:shared};
 context.window=context;
 vm.runInNewContext(source,context);
 return {context,client,shared};
}

{
 const pendingRound=makeRound();
 const {context,client}=install({response:{pendingRound,round:null}});
 const state=await client.getState();
 assert.equal(state.pendingRound.participant.checkpointBall,0,'completed reconnect must replay from ball zero');
 assert.deepEqual(state.pendingRound.participant.checkpoint.draws,[],'transient eighth-ball checkpoint must be replaced by stable initial state');
 assert.equal(state.pendingRound.participant.checkpoint.engines[0].busy,false,'stale busy flag must not survive page-close recovery');
 assert.equal(context.__sweetsRecoveryReplayV207.roundId,'round-1');
 assert.equal(context.__sweetsRecoveryReplayV207.serverBallCount,8);
 assert.equal(context.__sweetsRecoveryReplayV207.replacedCheckpointBall,8);
}

{
 const pendingRound=makeRound();
 const {client}=install({response:{pendingRound,round:null},active:{roundId:'round-1'}});
 const state=await client.getState();
 assert.equal(state.pendingRound.participant.checkpointBall,8,'an already attached recovery must not be rewound again');
 assert.equal(state.pendingRound.participant.checkpoint.engines[0].busy,true);
}

for(const pendingRound of [
 makeRound({ballCount:7}),
 makeRound({settled:true}),
 makeRound({initial:false})
]){
 const {client}=install({response:{pendingRound,round:null}});
 const state=await client.getState();
 assert.equal(state.pendingRound.participant.checkpointBall,8,'only unresolved complete eight-ball rounds with an initial state may be rewound');
}

{
 const pendingRound=makeRound();
 const client={async getState(){return {pendingRound,round:null};}};
 const context={window:null,location:{search:'?serverHost=1'},URLSearchParams,setTimeout(){},console,Date,structuredClone,SweetsSharedMachine:{client,active:null}};
 context.window=context;
 vm.runInNewContext(source,context);
 const state=await client.getState();
 assert.equal(state.pendingRound.participant.checkpointBall,8,'physical host must never install player recovery rewriting');
}

console.log('v207 stable initial-state replay regressions passed');
