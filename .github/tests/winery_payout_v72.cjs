/* Winery Pyramid payout regression v72.
 * Run: node .github/tests/winery_payout_v72.cjs */
'use strict';
const K=require('../../assets/winery-pyramid-core-v1.js');
function check(condition,label){if(!condition)throw new Error('WINERY_PAY_V72: '+label);}
function near(actual,expected,label){
 check(Math.abs(actual-expected)<1e-9,label+' expected '+expected+', got '+actual);
}
function board(full,mixed=0){
 return Array.from({length:21},(_,i)=>{
  if(i>=full)return {volume:0,layers:[]};
  if(i<mixed)return {volume:1,layers:[{flavor:0,amount:.6},{flavor:1,amount:.4}]};
  return {volume:1,layers:[{flavor:0,amount:1}]};
 });
}
check(K.PAY.length===22,'payout table must have 22 full counts (0–21)');
check(K.ROWS===6&&K.SIZE===21,'6-row, 21-cup layout unchanged');
for(let n=0;n<=9;n++){
 near(K.PAY[n],0,n+'-full base payout');
 const p=K.prize(board(n,Math.min(n,5)));
 check(p.full===n,n+' actual full count');
 check(p.hundredths===0,n+' full cups must not pay even with MIX');
}
near(K.PAY[10],.3,'10-full base payout');
near(K.PAY[11],.6,'11-full base payout');
const old12to21=[1,1.5,2,3,4,6,10,15,30,100];
old12to21.forEach((value,i)=>near(K.PAY[12+i],value,'unchanged '+(12+i)+'-full payout'));
check(K.prize(board(10)).hundredths===30,'10 full = 0.3x');
check(K.prize(board(11)).hundredths===60,'11 full = 0.6x');
check(K.prize(board(10,2)).hundredths===36,'10 full + 2 MIX = 0.36x');
check(K.prize(board(11,4)).hundredths===84,'11 full + 4 MIX = 0.84x');
check(K.prize(board(9,5)).hundredths===0,'9 full + 5 MIX still zero');
check(K.prize(board(21)).hundredths===10000,'21 full = 100x');
check(K.prize(board(21,2)).hundredths===12000,'21 full + 2 MIX = 120x');
const fullAt9=board(9);
const result=K.pour(fullAt9,9,1,0);
check(result.full===10,'pour can bring cup count to 10');
check(result.hundredths===30,'pour uses the new 10-FULL payout');
check(K.RATE_ANCHORS[0][1]<50&&K.RATE_ANCHORS.at(-1)[1]>150,
 'RTP calibration anchors cover menu 50–150%');
for(let i=1;i<K.RATE_ANCHORS.length;i++){
 check(K.RATE_ANCHORS[i][0]>K.RATE_ANCHORS[i-1][0],'RTP scale monotonic');
 check(K.RATE_ANCHORS[i][1]>K.RATE_ANCHORS[i-1][1],'RTP estimated return monotonic');
}
for(const target of [50,60,75,90,100,125,150]){
 const a=K.rateAnchor(target,()=>.5);
 check(a.scale>=0&&a.scale<=2.25,'valid scale at target '+target);
}
console.log('WINERY_PAY_V72_PASS: 0–9=0, 10=.3, 11=.6, 12–21 retained, MIX retained, pour and RTP anchors checked');
