// Run from the repository: node scripts/payout-lategames-v232-calibrate.mjs [rounds=50000]
// Uses the shipped browser rules, not a substitute payout model.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const rounds=Math.max(1,Number(process.argv[2]||50000));
const c={console,Math,performance:{now:()=>0},document:{getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),head:{append(){}}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1};c.window=c;vm.createContext(c);
for(const file of ['assets/jelly-rules.js','assets/party-castella-rules.js','assets/bingo-stick-rules.js'])vm.runInContext(source(file),c,{filename:file});
const J=c.JellyRules,C=c.PartyCastellaRules,W=c.BingoStickRules;
c.BingoStick={engine:{version:0,roundBet:100,reset(){this.state=W.create({target:90});}}};
vm.runInContext(source('assets/waffle-pow-v159.js'),c,{filename:'assets/waffle-pow-v159.js'});
for(const game of ['jelly','castella','waffle'])for(const target of [50,90,150]){
 let seed=23116000+target;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 let sum=0,sq=0,ordinarySum=0,ordinarySq=0,bonusEvents=0,topAwards=0,createMs=0;
 const started=performance.now();
 for(let n=0;n<rounds;n++){
  const t=performance.now();let s=game==='jelly'?J.create({rate:target,rng}):game==='castella'?C.create({target,rng}):W.create({target,rng});createMs+=performance.now()-t;
  for(let number=1;number<=8;number++)s=game==='jelly'?J.draw(s,number).state:game==='castella'?C.draw(s,number):W.draw(s,number);
  const gross=game==='jelly'?J.payout(s.lines.length,s.oddsMultiplier):s.totalHundredths;
  const ordinary=game==='waffle'?s.baseHundredths:gross;
  sum+=gross;sq+=gross*gross;ordinarySum+=ordinary;ordinarySq+=ordinary*ordinary;
  bonusEvents+=s.reversalCount||0;topAwards+=game==='jelly'?Number(s.lines.length===12):Number(!!s.highestRole);
 }
 const average=sum/rounds,ordinary=ordinarySum/rounds,se=Math.sqrt(Math.max(0,sq/rounds-average*average)/rounds),ordinarySe=Math.sqrt(Math.max(0,ordinarySq/rounds-ordinary*ordinary)/rounds);
 const expectedBonusPercent=game==='waffle'?W.balance(target).bonusPercent:0;
 console.log(JSON.stringify({game,target,rounds,seed:23116000+target,observedGrossReturnPercent:average,grossSampleStandardError:se,ordinaryReturnPercent:ordinary,ordinarySampleStandardError:ordinarySe,expectedBonusPercent,ordinaryPlusExactReversalReturnPercent:ordinary+expectedBonusPercent,bonusEvents,topAwards,meanCreateMs:createMs/rounds,elapsedMs:performance.now()-started}));
}
