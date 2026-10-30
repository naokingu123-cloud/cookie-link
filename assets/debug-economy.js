/* Debug economy: changes generation only, never awards or the shared lottery. */
let debugPayoutTarget=90;
try{const stored=Number(localStorage.getItem('cookie-link-debug-payout-v1'));if(Number.isInteger(stored)&&stored>=50&&stored<=150)debugPayoutTarget=stored;}catch{}
function debugEconomyInterpolate(knots,target=debugPayoutTarget){
 const p=Math.max(50,Math.min(150,Number(target)||90));
 for(let i=1;i<knots.length;i++)if(p<=knots[i][0]){const [a,x]=knots[i-1],[b,y]=knots[i];return x+(y-x)*(p-a)/(b-a);}return knots.at(-1)[1];
}
function debugEconomyProfile(){return {
 cookieBias:debugEconomyInterpolate([[50,-1.8],[90,0],[110,.16],[130,.5],[150,1]]),
 cookiePlacement:debugEconomyInterpolate([[50,-1],[90,0],[110,.16],[130,.5],[150,1]]),
 cookieHammer:debugEconomyInterpolate([[50,0],[90,0],[110,.48],[130,1.5],[150,3]]),
 canyonDensity:debugEconomyInterpolate([[50,.52],[90,1],[150,1.6]]),
 canyonRareBoost:debugEconomyInterpolate([[50,1],[90,1],[150,3]]),
 sixSpread:debugEconomyInterpolate([[50,.575],[70,.43],[90,.30],[110,.17],[130,.07],[150,-.055]])
};}
function debugCookiePotential(board,tileId,coverage=null){
 const g=board.map(row=>row.map(t=>t?.id===tileId?null:t));let cleared=0,max=0,chains=0;
 for(let step=0;step<32;step++){
  for(let c=0;c<g.length;c++){let to=g.length-1;for(let r=g.length-1;r>=0;r--)if(g[r][c]){const t=g[r][c];g[r][c]=null;g[to--][c]=t;}}
  const linked=groups(g);if(!linked.length)break;chains++;max=Math.max(max,...linked.map(v=>v.size));const colors=new Set();
  for(const v of linked)for(const [r,c]of v.cells)if(g[r][c]?.special)colors.add(g[r][c].color);
  for(const v of linked)for(const [r,c]of v.cells)if(g[r][c]){if(coverage)coverage.set(g[r][c].id,(coverage.get(g[r][c].id)||0)+1);g[r][c]=null;cleared++;}
  if(colors.size)for(let r=0;r<g.length;r++)for(let c=0;c<g.length;c++)if(g[r][c]&&colors.has(g[r][c].color)){if(coverage)coverage.set(g[r][c].id,(coverage.get(g[r][c].id)||0)+1);g[r][c]=null;cleared++;}
 }
 return cleared/8+max/4+chains*.25;
}
function debugCookieNumberOrder(blanks,board,random){
 const {cookieBias:bias,
 cookiePlacement:placement}=debugEconomyProfile();if(!bias&&!placement)return blanks;
 const rows=new Map();board.forEach((row,r)=>row.forEach(t=>{if(t)rows.set(t.id,r);}));
 const scores=placement?blanks.map(t=>debugCookiePotential(board,t.id)):blanks.map(()=>0),mean=scores.reduce((a,b)=>a+b,0)/Math.max(1,scores.length),sd=Math.max(1,Math.sqrt(scores.reduce((n,v)=>n+(v-mean)**2,0)/Math.max(1,scores.length)));
 return blanks.map((tile,i)=>({tile,key:Math.log(Math.max(1e-12,random()))/Math.exp(bias*(rows.get(tile.id)/(board.length-1)-.5)+Math.max(-1.8,Math.min(1.8,placement*(scores[i]-mean)/sd)))})).sort((a,b)=>a.key-b.key).map(v=>v.tile);
}
function debugCookieHammerOrder(pools,board,random){
 const strength=debugEconomyProfile().cookieHammer;if(!strength)return;
 const coverage=new Map();for(const t of board.flat())if(t?.number!=null)debugCookiePotential(board,t.id,coverage);
 for(const pool of pools){const scored=pool.map(cell=>({cell,score:coverage.get(board[cell[0]][cell[1]].id)||0})),mean=scored.reduce((n,v)=>n+v.score,0)/Math.max(1,scored.length),sd=Math.max(1,Math.sqrt(scored.reduce((n,v)=>n+(v.score-mean)**2,0)/Math.max(1,scored.length)));
  const order=scored.map(v=>({...v,key:Math.log(Math.max(1e-12,random()))/Math.exp(Math.max(-2,Math.min(2,strength*(v.score-mean)/sd)))})).sort((a,b)=>a.key-b.key);pool.splice(0,pool.length,...order.map(v=>v.cell));
 }
}
