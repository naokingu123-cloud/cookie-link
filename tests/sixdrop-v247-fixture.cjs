const fs=require('fs');
require('../assets/sixdrop-progressive-core-v247.js');
const s=fs.readFileSync('optimized/app-01.js','utf8');
const geom=s.slice(s.indexOf('const SIX_ROWS=10'),s.indexOf('class SixBallCandyEngine'));
const G=new Function('const motionReduced=false;'+geom+';return {empty:sixEmpty,clone:sixClone,count:sixCount,valid:sixValid,step:sixStep,neighbors:sixNeighbors,patterns:sixPatterns,findShapes:sixFindShapes,drop:sixDrop,point:sixPoint,gapTemplates:SIX_START_GAP_TEMPLATES};')();
module.exports={G,R:globalThis.SweetsSixDropV247.create(G)};
