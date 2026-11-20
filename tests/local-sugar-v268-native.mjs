import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bundle=read('optimized/app-01.js'),begin=bundle.indexOf('class Arcade{'),end=bundle.indexOf('// Only the next HIT is simulated.',begin),arcadeSource=bundle.slice(begin,end)+'\nglobalThis.NativeArcade=Arcade;';
const storeData=new Map(),store={getItem:k=>storeData.get(k)??null,setItem:(k,v)=>storeData.set(k,String(v)),removeItem:k=>storeData.delete(k)};
let rngCalls=0;
class Engine{constructor({onEvent}){this.onEvent=onEvent;this.kind='fixture';}start(){}reset(){}previewDraw(){}enqueueBatch(){} }
function boot(){
 const context=vm.createContext({console,window:{SweetsEditionV255:{value:'local'},SweetsLocalDebugV258:{storage:store}},document:{getElementById:()=>null},debugForceRainbowSugar:false,RAINBOW_SUGAR_CHANCE:0,debugPayoutTarget:100,medalWin:(bet,h)=>Math.floor(bet*h/100),Date,Math,Number,Map});
 vm.runInContext(arcadeSource,context);
 const app=new context.NativeArcade({random:()=>{rngCalls++;return .25;},initialEngines:[Engine]});app.bets=[100];app.credit=10000;app.drawSource={ready:true,start({onNumber}){this.onNumber=onNumber;},reset(){},pause(){}};
 app.boostAfterDraws=()=>{};context.app=app;
 let visible=null;
 context.window.SweetsSugarChallengeV254={stampBank(){for(const [i,t] of app.wonderBank.entries())if(!t.sugarId)t.sugarId='native:'+i;},accept(s){visible=JSON.parse(JSON.stringify(s));const accepted=new Set(s.acceptedIds),pending=app.wonderBank.filter(t=>!accepted.has(t.sugarId));app.wonderBank=[...new Map([...s.bank,...pending].map(t=>[t.sugarId,t])).values()];},setExpanded(){},snapshot:()=>visible};
 vm.runInContext(read('assets/sugar-challenge-rules-v254.js'),context);const legacyRules=context.SugarChallengeRulesV254;context.window.SugarChallengeRulesV254={...legacyRules,create:options=>legacyRules.create({...options,rulesRevision:268})};
 vm.runInContext(read('assets/local-sugar-v267.js'),context);return {context,app,L:context.window.SweetsLocalSugarV267,V:context.window.SweetsSugarChallengeV254};
}
let {app,L,V}=boot();
L.grantTestSugar();const quote=L.describe();assert.equal(app.phase,'ready');assert.equal(quote.active,true);assert.equal(quote.draws.length,0);assert.equal(quote.bankCount,0);assert.equal(V.snapshot().challenge.jpAmount,quote.jpAmount);
const calls=rngCalls;({app,L,V}=boot());assert.equal(rngCalls,calls,'BET reload never draws a new quote');assert.equal(L.describe().jpAmount,quote.jpAmount);assert.equal(L.describe().roundId,quote.roundId);
app.prepare();assert.equal(L.describe().roundId,quote.roundId,'harmless native prepare retains a BET preview');
// The real UI's auto countdown can start the native controller before ball 1.
// Toggling manual mode then calls debugResetRound -> app.prepare. The same
// consumed five Sugar and preannounced quote must survive this zero-ball reset.
assert.equal(app.start(),true);assert.equal(app.phase,'playing');assert.equal(app.draws.length,0);
const beforeModeSwitch=JSON.parse(JSON.stringify(V.snapshot().challenge)),beforeModeRng=rngCalls;
app.prepare();assert.equal(app.phase,'ready');assert.equal(rngCalls,beforeModeRng,'controller reset never quotes Sugar or rerolls card/multiplier');
assert.equal(L.describe().bankCount,0);assert.equal(L.describe().roundId,quote.roundId);assert.deepEqual(V.snapshot().challenge,beforeModeSwitch);
assert.equal(app.start(),true);assert.equal(L.describe().jpAmount,quote.jpAmount);assert.equal(L.describe().roundId,quote.roundId);assert.equal(L.describe().multiplier,quote.multiplier);
for(const n of [20,19,18,15,5])app.drawSource.onNumber(n);
assert.equal(L.describe().jpcQualified,true);assert.equal(L.describe().qualifyingDrawCount,5);assert.equal(L.describe().phase,'drawing');assert.equal(V.snapshot().challenge.jpcQualified,true);
for(const n of [3,7,17])app.drawSource.onNumber(n);
app.roundWins=[25];app.finishRound();assert.equal(L.describe().settled,true);assert.equal(app.totalWin,25);assert.equal(app.phase,'result');
app.finishRound();assert.equal(app.totalWin,25);assert.equal(app.beginPayout(),true);assert.equal(app.credit,10025);assert.equal(app.beginPayout(),false);assert.equal(app.credit,10025);
app.prepare();assert.equal(L.describe().active,false);
// Rainbow Sugar is never consumed by the ordinary-five challenge.
app.wonderBank.push({sugarId:'rainbow',id:'rainbow',game:0,value:100,directJpc:true});L.grantTestSugar();assert.equal(L.describe().bankCount,1);assert.equal(app.wonderBank[0].sugarId,'rainbow');
assert.equal(app.start(),true);for(const n of [2,5,8,10,12,14,17,22])app.drawSource.onNumber(n);app.roundWins=[25];app.finishRound();
assert.equal(L.describe().jpcQualified,false);assert.equal(L.describe().cashWin,135);assert.equal(app.totalWin,160);const count=L.describe().awardCount;app.finishRound();assert.equal(L.describe().awardCount,count);assert.equal(app.totalWin,160);
console.log('LOCAL_SUGAR_V268_NATIVE_PASS: real Arcade class, ready quote, reload/manual-controller preservation, native callbacks, early JPC, no duplicate cash and rainbow exclusion');
