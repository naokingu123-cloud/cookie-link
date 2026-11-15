import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../assets/shared-client-flow-v212.js',import.meta.url),'utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

let active={roundId:'round-1',settleSent:false,participant:{}};
let resetCount=0,prepareCount=0,nativeBeginCount=0,acceptedStateCount=0,syncReadyCount=0;
let settlePayload=null;

class Arcade{
 constructor(){
  this.engines=[{kind:'GAME0',paused:true,presentationRate:40}];
  this.phase='result';
  this.credit=100;
  this.displayCredit=100;
  this.totalWin=25;
  this.payout={};
  this.result={};
  this.dealing=true;
  this.fastForward=true;
  this.drawHeld=true;
  this.draws=[1,2,3,4,5,6,7,8];
  this.paid=[true];
  this.roundWins=[25];
 }
 beginPayout(){nativeBeginCount++;return false;}
 prepare(){prepareCount++;this.phase='ready';this.draws=[];this.paid=[false];this.roundWins=[0];this.totalWin=0;}
 onChange(){}
}
const app=new Arcade();
const client={
 online:true,
 settle(payload){settlePayload=payload;return Promise.resolve({settlement:{creditAfter:125,totalWin:25}});},
 getState(){return Promise.resolve({type:'snapshot',round:null});},
 accept(){acceptedStateCount++;},
 syncReady(){syncReadyCount++;}
};
const shared={client,get active(){return active;}};

const context=vm.createContext({
 console,
 setTimeout,
 clearTimeout,
 Promise,
 WeakMap,
 Number,
 String,
 Object,
 Array,
 Math,
 Arcade,
 app,
 window:{SweetsSharedMachine:shared},
 rouletteDrawSource:{reset(){resetCount++;active=null;}},
 renderRoundResult(){},
 scheduleUI(){},
 countdownText(){}
});
vm.runInContext(source,context,{filename:'shared-client-flow-v212.js'});

assert.equal(app.engines[0].kind,'cookie','GAME0 must map to Cookie Link');
assert.equal(app.beginPayout(),true,'shared result must bypass the normal payout presentation');

// Reproduce the reported race: the normal eighth-ball caller overwrites phase
// after beginPayout returns. v212 must still force the app to READY.
app.phase='result';
await sleep(40);

assert.equal(nativeBeginCount,0,'normal payout must not restart');
assert.equal(settlePayload?.roundId,'round-1');
assert.equal(settlePayload?.totalWin,25);
assert.equal(settlePayload?.creditAfter,125);
assert.equal(settlePayload?.immediateReset,true);
assert.equal(resetCount,1,'the working immediate-reset path must explicitly release the shared round');
assert.ok(prepareCount>=1,'prepare must run after the result call stack finishes');
assert.equal(active,null,'shared current round must be released');
assert.equal(app.phase,'ready','client must enter the next BET waiting state');
assert.equal(app.credit,125);
assert.equal(app.displayCredit,125);
assert.equal(app.payout,null);
assert.equal(app.result,null);
assert.equal(app.dealing,false);
assert.equal(app.fastForward,false);
assert.equal(app.drawHeld,false);
assert.equal(app.engines[0].paused,false);
assert.equal(app.engines[0].presentationRate,1);
assert.ok(acceptedStateCount>=1,'server state must be refreshed after reset');
assert.ok(syncReadyCount>=1,'client ready gate must be refreshed after reset');

console.log('v212 immediate settlement releases shared current and reaches the next BET state');
