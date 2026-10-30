const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('assets/choco-dig.js','utf8');
const ctx={motionReduced:false,medalWin:(bet,h)=>Math.floor(bet*h/100)};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('function chocoPayoutEase('),source.indexOf('function chocoDepthValue('))+'\nfunction chocoCartArrival(i,n){return .65+.3*i/Math.max(1,n-1)}',ctx);
const s={},e={version:1,totalHundredths:0,cart:[]};const value=t=>ctx.chocoScaleValue(s,e,100,t);
value(0);e.totalHundredths=300;value(0);value(1200);assert.equal(Math.floor(s.chocoAwardValue),276);assert.equal(s.chocoWinValue,0);
e.totalHundredths=600;value(1200);value(2200);assert(s.chocoAwardValue>560&&s.chocoAwardValue<590);assert.equal(s.chocoAward.target,600);
value(3200);assert.equal(s.chocoAwardValue,600);assert.equal(s.chocoAwardPhase,'fixed');value(3360);assert.equal(s.chocoAwardPhase,'add');
e.totalHundredths=900;value(3500);assert(s.chocoPayoutFlights.at(-1).held);assert.equal(s.chocoAward.target,600);
const beforeAward=s.chocoAwardValue;e.totalHundredths=1900;e.fx={phase:'canyonBonus',gain:1000};value(3500);assert.equal(s.chocoAwardValue,beforeAward);assert.equal(s.chocoAward.target,600);value(4150);assert.equal(s.chocoBonusValue,1000);assert.equal(s.chocoAwardValue,600);assert(s.chocoOreValue>0&&s.chocoOreValue<600);
e.fx=null;value(5360);assert.equal(s.chocoAwardValue,0);assert.equal(s.chocoWinValue,1600);assert(!s.chocoPayoutFlights.at(-1).landed);value(5520);assert(s.chocoPayoutFlights.at(-1).landed);assert.equal(s.chocoAward.target,300);value(9680);assert.equal(s.chocoWinValue,1900);assert.equal(s.chocoAwardValue,0);assert(!s.chocoWinCounting);
// Landings drive both the bowl and counter; same-frame batch arrivals merge.
e.version++;e.totalHundredths=0;e.cart=[];value(10000);e.totalHundredths=600;e.cart=[{id:1},{id:2}];e.fx={phase:'canyonCollect',cartStart:0,ms:1000,elapsed:0,gain:600,items:[{tile:{id:1,item:'ore'},gain:300,r:0,c:0},{tile:{id:2,item:'ore'},gain:300,r:0,c:1}]};value(10000);assert.equal(s.chocoLandedCart.size,0);value(10650);assert(s.chocoLandedCart.has(0));assert(!s.chocoLandedCart.has(1));e.fx.elapsed=950;value(10950);assert.equal(s.chocoLandedCart.size,2);assert.equal(s.chocoAward.target,600);
e.fx=null;value(16000);assert.equal(s.chocoWinValue,600);assert.equal(s.chocoAwardValue,0);
// Reset cancels held flights, and large amounts are not split into serial roulettes.
e.version++;e.totalHundredths=0;e.cart=[];value(17000);e.totalHundredths=100001;value(17000);value(22000);assert.equal(s.chocoWinValue,100001);assert.equal(s.chocoAwardValue,0);e.version++;e.totalHundredths=0;value(23000);assert.equal(s.chocoPayoutFlights.length,0);assert.equal(s.chocoWinValue,0);
ctx.motionReduced=true;e.totalHundredths=600;value(23000);assert.equal(s.chocoWinValue,600);assert.equal(s.chocoAwardValue,0);assert(!s.chocoWinCounting);
// Each mineral uses its own threshold; a normal sum alone never triggers rarity.
for(const [kind,rare,ultra]of [['copper',30,100],['silver',70,500],['gold',400,2000],['diamond',1500,10000]]){for(const [n,r]of [[rare-1,0],[rare,1],[ultra-1,1],[ultra,2]])assert.equal(ctx.chocoOreRarity({item:'ore',ore:kind,baseValue:n}),r);}
ctx.motionReduced=false;e.version++;e.totalHundredths=0;e.fx=null;value(30000);e.totalHundredths=100;e.fx={phase:'canyonCollect',cartStart:0,ms:1000,elapsed:0,gain:100,items:[{tile:{item:'ore',ore:'copper',baseValue:100},gain:100}]};value(30000);value(30650);assert.equal(s.chocoAwardPhase,'anticipation');assert.equal(s.chocoAward.rarity,2);assert.equal(s.chocoAwardValue,0);e.fx=null;value(31749);assert.equal(s.chocoAwardValue,0);value(32750);assert.equal(s.chocoAwardValue,90);value(33910);assert.equal(s.chocoAwardPhase,'add');value(34910);assert.equal(s.chocoAwardValue,100);assert.equal(s.chocoWinValue,90);assert.equal(s.chocoAward.rarity,2);value(35910);assert.equal(s.chocoAwardValue,0);assert.equal(s.chocoWinValue,100);assert(!s.chocoAward.rarity);assert(!s.chocoWinCounting);
console.log('CANYON_SCALE_COUNTER_PASS: retarget, arrival sync, hold during transfer, direct bonus, conservation, reset, large amounts, reduced motion');
