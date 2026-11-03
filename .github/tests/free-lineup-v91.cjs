'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const script=new vm.Script(fs.readFileSync(path.join(__dirname,'../../assets/lineups-v91.js'),'utf8'));
function load(search){
 const root={dataset:{},toggleAttribute(){}},ctx={location:{search},URLSearchParams,document:{documentElement:root,addEventListener(){},head:{}},MutationObserver:class{observe(){}},window:{}};
 script.runInNewContext(ctx);const setup=ctx.window.SweetsLineup;return {chosen:Array.from(setup.chosen),ids:Array.from(setup.ids),mode:setup.mode};
}
const classic=['cookie','choco','candy'],festival=['winery','popcorn','jelly'],kinds=[...classic,'gelato',...festival];
assert.deepEqual(load('').chosen,festival);assert.deepEqual(load('').ids,['jelly','winery','popcorn']);assert.deepEqual(load('?set=classic').ids,classic);
for(const bad of ['cookie,cookie','winery,unknown','cookie,choco,candy,popcorn',''])assert.equal(load('?games='+bad).mode,'festival');
let tested=0;
function check(picks){
 if(picks.length){
  const x=load('?games='+picks.join(','));assert.deepEqual(x.chosen,picks);assert.deepEqual(x.ids.filter(Boolean).sort(),[...picks].sort());assert.equal(x.mode,'custom');
  for(const k of picks)if(classic.includes(k))assert.equal(x.ids.indexOf(k),classic.indexOf(k));tested++;
 }
 if(picks.length<3)for(const k of kinds)if(!picks.includes(k))check([...picks,k]);
}
check([]);console.log('Passed '+tested+' ordered single-, double- and triple-game selections.');
