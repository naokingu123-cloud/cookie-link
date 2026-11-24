/* Runtime witnesses and statistics use the browser's actual source transform.
 * An explicit source override keeps standalone/historical golden tests raw. */
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,root),'utf8');
export function applyLoaderUpgrades(source){
 const scope={};new Function('window','console',read('assets/cookie-upgrade-patches.js'))(scope,{info(){},warn(){}});
 return scope.CookieUpgradePatch.patch(source);
}
export const productionBundle=()=>applyLoaderUpgrades(read('optimized/app-01.js'));
const canyonCore=bundle=>{
 const start=bundle.indexOf('const CHOCO_SAVE_KEY='),end=bundle.indexOf('const chocoSprites=',start);
 if(start<0||end<start)throw Error('Production Canyon core boundary is missing');
 return bundle.slice(start,end);
};
export const nativeCore=({runtime=true}={})=>runtime?canyonCore(productionBundle()):read('assets/choco-dig.js').split('const chocoSprites=')[0];
export function loadChoco({source,target=90}={}){
 const bundle=source===undefined?productionBundle():read('optimized/app-01.js');
 if(source===undefined)source=canyonCore(bundle);
 const start=bundle.indexOf('class Engine{'),end=bundle.indexOf('const elixirGlyphs=',start);
 if(start<0||end<start)throw Error('Native base Engine boundary is missing');
 const economy=read('assets/debug-economy.js');
 const extra=source.includes('const CHOCO_FRUITS=')?',CHOCO_FRUITS,CHOCO_FRUIT_DISTRIBUTIONS,CHOCO_FRUIT_RATES,chocoFruitRates,chocoFruitQuantile,chocoPrizeKind,chocoPrizeDefinition':'';
 const api=new Function('SIZE','wonderTier','motionReduced',economy+bundle.slice(start,end)+source+';return {ChocoDigEngine,chocoGroups,chocoFallStep,chocoExcavate,chocoPlan,chocoFillRows,chocoRandom,chocoRankOre,chocoOreRates,chocoOreQuantile,CHOCO_ORES,CHOCO_ITEM_RATES,CHOCO_ORE_DISTRIBUTIONS,CHOCO_WORLD_REVISION,CHOCO_FRUIT_PRIZES,setRate:value=>debugPayoutTarget=value'+extra+'};')(5,()=>0,false);
 api.setRate(target);return api;
}
export const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
export const plain=value=>JSON.parse(JSON.stringify(value));
export const empty=()=>Array.from({length:12},()=>Array(7).fill(null));
export const cake=(id,color=0,sectionId='section-'+id)=>({id,color,sectionId,number:null,prize:null});
export function worldFor(q,seed,revision){
 const e=new q.ChocoDigEngine({random:random(seed)});
 Object.assign(e,{rulesRevision:revision,seed,uid:0,depth:0,startDepth:0,dugTotal:0,chestsTotal:0,nextSugar:18,fruitState:0,fruitCount:0,bonusResolvedDepth:0,strata:[]});
 e.ensureRows();e.assignDrills();return e;
}
