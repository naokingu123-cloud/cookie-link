const fs=require('fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/choco-dig.js','utf8').split('const chocoSprites=')[0];
const q=new Function('Engine','SIZE',source+';return {ChocoDigEngine,chocoGroups,chocoFillRows,CHOCO_SHAPES}')(class{constructor({random}){this.random=random;this.version=0;this.reset()}emit(p){this.phase=p}},5);
let seed=91;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),hist={},refillHist={};let total=0,small=0,large=0;
for(let n=0;n<1000;n++){
 const e=new q.ChocoDigEngine({random});const groups=q.chocoGroups(e.strata).groups.filter(g=>g[0].tile.color>=0);
 for(const group of groups){hist[group.length]=(hist[group.length]||0)+1;total++;small+=group.length<3;large+=group.length>6;assert(group.length>=3&&group.length<=6,'Initial region outside 3–6');}
 const remove=n%11+1;e.strata.splice(0,remove);const firstNew=e.uid;q.chocoFillRows(e);assert.equal(e.strata.length,12);const newGrid=e.strata.map(row=>row.map(t=>t?.id>firstNew?t:null));for(const group of q.chocoGroups(newGrid).groups.filter(g=>g[0].tile.color>=0))refillHist[group.length]=(refillHist[group.length]||0)+1;
 assert.equal(new Set(e.strata.flat().map(t=>t.id)).size,84);
}
assert(q.CHOCO_SHAPES.every(s=>s.length>=3&&s.length<=6));
console.log('CANYON_COMPACT_SHAPES_PASS',JSON.stringify({boards:1000,total,small,large,hist,refillHist,templates:q.CHOCO_SHAPES.length}));
