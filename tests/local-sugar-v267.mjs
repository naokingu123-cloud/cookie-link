import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const [rules,bridge]=await Promise.all(['assets/sugar-challenge-rules-v254.js','assets/local-sugar-v267.js'].map(p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8')));
const storage=new Map(),rounds=[],notifications=[];
const store={getItem:k=>storage.get(k)??null,setItem(k,v){storage.set(k,String(v));},removeItem:k=>storage.delete(k)};
const app={
 phase:'ready',token:0,bets:[100],locked:[0],wonderBank:[],wonderSteps:0,wonderValue:0,draws:[],totalWin:0,credit:10000,
 random:()=>.25,
 onChange(){},start(){if(this.phase!=='ready')return false;this.phase='playing';this.token++;this.locked=this.bets.slice();this.draws=[];return true;},
 acceptNumber(n){if(this.phase!=='playing'||this.draws.length>=8||this.draws.includes(n))return false;this.draws.push(n);if(this.draws.length===8)this.finishRound();return true;},
 finishRound(){if(this.phase!=='playing')return;this.totalWin=25;this.phase='result';},
 prepare(){this.phase='ready';this.draws=[];this.totalWin=0;},
 resetDebug(){this.wonderBank=[];this.phase='ready';this.draws=[];}
};
const V={stampBank(){},accept(value){notifications.push(JSON.parse(JSON.stringify(value)));},setExpanded(value){rounds.push(['expanded',value]);}};
const ctx=vm.createContext({console,window:{SweetsEditionV255:{value:'local'},SweetsLocalDebugV258:{storage:store}},app,document:{getElementById:()=>null},Date,Number,Map,Math,URLSearchParams,debugPayoutTarget:90});
vm.runInContext(rules,ctx);const legacyRules=ctx.SugarChallengeRulesV254;ctx.window.SugarChallengeRulesV254={...legacyRules,create:options=>legacyRules.create({...options,rulesRevision:268})};ctx.window.SweetsSugarChallengeV254=V;
vm.runInContext(bridge,ctx);
const L=ctx.window.SweetsLocalSugarV267;
assert.equal(L.version,268);assert.equal(L.describe().bankCount,0);
assert.equal(L.grantTestSugar(5),true);assert.equal(L.describe().bankCount,0);assert.equal(L.describe().active,true);assert.equal(app.phase,'ready');
const betQuote=L.describe();assert.ok(betQuote.jpAmount>0);assert.ok(betQuote.multiplier>0);
assert.equal(app.start(),true);let now=L.describe();assert.equal(now.jpAmount,betQuote.jpAmount);assert.equal(now.roundId,betQuote.roundId);assert.equal(now.active,true);assert.equal(now.bankCount,0);assert.equal(now.phase,'ready');assert.deepEqual(rounds.at(-1),['expanded',true]);
for(const n of [2,5,8,10,12,14,17,22])assert.equal(app.acceptNumber(n),true);
now=L.describe();assert.equal(now.phase,'complete');assert.equal(now.draws.length,8);assert.equal(now.settled,true);assert.equal(app.phase,'result');
const p=ctx.window.SugarChallengeRulesV254.evaluate('standard',90,268);assert.equal(p.jpc,false);
assert.equal(app.totalWin,25+now.cashWin);assert.ok(now.cashWin>0);
const once=app.totalWin;app.finishRound();assert.equal(app.totalWin,once,'no duplicate Sugar payment');
assert.equal(app.acceptNumber(24),false);
app.prepare();assert.equal(L.describe().active,false);
assert.equal(L.grantTestSugar(5),true);assert.equal(app.start(),true);
for(let i=1;i<=8;i++)assert.equal(app.acceptNumber(i),true);
now=L.describe();assert.equal(now.jpcQualified,true);assert.equal(now.cashWin,0);assert.equal(app.totalWin,25);
assert.equal(L.describe().serverIsolated,true);
assert.equal(storage.has('sweets-shared-session-v176'),false);
assert.ok(storage.has('local-sugar-challenge-v267'));
console.log('LOCAL_SUGAR_V267_PASS',JSON.stringify({firstCash:once-25,jpcFlag:true,localOnly:true,panelUpdates:notifications.length,once:true}));
