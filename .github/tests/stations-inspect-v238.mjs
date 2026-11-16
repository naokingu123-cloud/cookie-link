import fs from 'node:fs';
const files=['optimized/app-01.js','assets/gelato-prism-v28.js','assets/winery-pyramid-v1.js','assets/popcorn-host.js','assets/jelly-host.js','assets/bingo-stick-host.js','assets/waffle-pow-v159.js','assets/party-castella-host.js','assets/arcade-candy-world-v156.css','assets/arcade-candy-world-v157.css','assets/all-tabs-v150.css','assets/shared-roulette-client-v224.js'];
for(const file of files){
 const text=fs.readFileSync(file,'utf8'),lines=text.split('\n');console.log('\n### '+file+' ('+lines.length+' lines)');
 const out=new Set();
 const match=file.endsWith('.css')?/arena|a8-stage|cookie-roulette|height.*vh/:/function (?:\w*(?:Reach|Highest|highest|Achiev|AllClear|rouletteSelected|requestReach)|fit\b)|(?:const|let) (?:visibleReach|tabReach)|reachResults=|tabReachResults=|highestRole|highestAchiev|topAward|allClearCount|clearedRounds|\.reachStatus=|\.tabstate\.textContent|\.tabstate\.dataset/;
 for(let i=0;i<lines.length;i++)if(lines[i].length<15000&&match.test(lines[i])){for(let j=Math.max(0,i-1);j<=Math.min(lines.length-1,i+(file.endsWith('.css')?3:6));j++)out.add(j);}
 let count=0;for(const i of [...out].sort((a,b)=>a-b)){if(++count>160){console.log('...');break;}console.log((i+1)+': '+lines[i].slice(0,1800));}
}
