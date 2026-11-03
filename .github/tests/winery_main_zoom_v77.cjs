/* v77 — main Winery 21-glass board enlargement, with stable tab mini. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('assets/winery-pyramid-v1.js','utf8');
const css=fs.readFileSync('assets/winery-main-board-enlarge-v77.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const core=require('../../assets/winery-pyramid-core-v1.js');
new Function(s);
const zoom=Number(s.match(/WP_MAIN_CUP_ZOOM=([0-9.]+)/)?.[1]);
const spread=Number(s.match(/WP_MAIN_X_SPREAD=([0-9.]+)/)?.[1]);
assert(zoom>=1.05&&zoom<=1.09,'A modest zoom on each cup and number');
assert(spread>=1.03&&spread<=1.08,'Horizontal separation avoids overlap');
assert.match(s,/if\(!small\)zoomMainGlass\(lx,i\)/,'main fluids only');
assert.match(s,/if\(!small\)zoomMainGlass\(xx,i\)/,'main crystals only');
assert.match(s,/premiumStreams\(lx,fx,flows,time\)/,'flows retained');
assert.match(s,/zoomMainGlass\(x,i\); \/\/ Exact price-tag reach follows enlarged price tag\./,
 'reach glow follows the enlarged tag');
assert.match(s,/premiumGlass\(miniOnlyCtx,i,current\[i\],clock\)/,
 'miniature crystals retain their original size');
assert.match(s,/premiumJuice\(miniOnlyCtx,i,current\[i\],clock,touching\)/,
 'miniature juices retain their original size');
assert.match(s,/premiumSpout\(xx,time\);\s+if\(!small\)/,
 'existing decorative spout stays stationary');
assert.match(css,/scaleX\(1\.05\)/,'stand registers with horizontal glass expansion');
assert.match(css,/44\.74% 50%/,'stand transforms around cups center');
assert.match(s,/winery-main-board-enlarge-v77\.css\?v=77/);
assert.ok(Number(html.match(/winery-pyramid-v1\.js\?v=(\d+)/)?.[1])>=77);
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
assert.equal(core.PAY[10],.3);
assert.equal(core.PAY[11],.6);
// Physical main scene is 1672 wide, with the payout/sidebar from ~76%.
const L=1672,center=748,spacing=141;
let minX=Infinity,maxX=-Infinity;
for(let row=0;row<6;row++)for(let col=0;col<=row;col++){
 const oldX=center+(col-row/2)*spacing;
 const newX=center+(oldX-center)*spread;
 minX=Math.min(minX,newX-74*zoom);
 maxX=Math.max(maxX,newX+74*zoom);
}
assert(minX>0,'No enlarged cup can leave the left side of the scene');
assert(maxX/L<.755,'Rightmost enlarged glass stays left of the 24% payout cabinet');
console.log('WINERY_V77_PASS',JSON.stringify({
 cups:21,zoom,spread,leftMainEdge:+(minX/L).toFixed(4),
 rightMainEdge:+(maxX/L).toFixed(4),miniAndAwardsUnchanged:true
}));
