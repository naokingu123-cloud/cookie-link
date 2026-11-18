/* ダンゴデビンゴ — numbered initial FREE, five balls / placement / three balls.
 * Pure, serializable rules. Initial layout is selected before the round starts.
 * P/O calibration uses optimal manual placement; automatic placement is greedy.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DangoBingoRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const REVISION=254,PREVIOUS_REVISION=253,LEGACY_REVISION=251,ALL=(1<<25)-1,DENOMINATOR=60568200,FESTIVAL_PROBABILITY=.005,MIN_REGULAR_MOLD_PROBABILITY=.002;
  const LENGTHS=[3,4,5,7,9];
  const freeze=value=>{
    if(value&&typeof value==='object'&&!Object.isFrozen(value)){
      for(const child of Object.values(value))freeze(child);
      Object.freeze(value);
    }
    return value;
  };
  const cells=[];
  for(let row=0;row<5;row++)for(let x=-row;x<=row;x++)cells.push({id:cells.length,row,x,y:row});
  const axes=['horizontal','vertical','diagonal-minus','diagonal-plus'],lines=[];
  for(let axis=0;axis<4;axis++){
    const groups=new Map();
    for(const c of cells){
      const key=axis===0?c.row:axis===1?c.x:axis===2?c.x-c.row:c.x+c.row;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(c.id);
    }
    for(const [key,ids] of [...groups].sort((a,b)=>a[0]-b[0]))if(ids.length>=3){
      lines.push({id:lines.length,length:ids.length,cells:ids,mask:ids.reduce((m,id)=>m|(1<<id),0),axis:axes[axis],key});
    }
  }
  const mirror=cells.map(c=>cells.find(x=>x.row===c.row&&x.x===-c.x).id);
  const geometry=freeze({cells,lines,mirror,rows:[1,3,5,7,9]});
  const highestRoleMinimums=freeze({3:4,4:3,5:2,7:1,9:1});
  function isHighestRole(length,count){return Number.isFinite(count)&&highestRoleMinimums[length]!==undefined&&count>=highestRoleMinimums[length];}
  function highestRolesFor(state){return LENGTHS.filter(length=>isHighestRole(length,state?.lineCounts?.[length]??state?.counts?.[length]??0));}
  // The three small tiers are adjusted so even the minimum one-FREE mold can
  // reach a 50% setting. Existing revision251 checkpoints keep their old table.
  const legacyTiers=freeze({3:[0,20,100,500,10000],4:[0,100,300,5000,50000],5:[0,300,10000,200000],7:[0,2500],9:[0,10000]});
  const tiers=freeze({3:[0,10,50,500,10000],4:[0,40,300,5000,50000],5:[0,300,10000,200000],7:[0,2500],9:[0,10000]});
  const rowsFor=table=>freeze(LENGTHS.flatMap(length=>table[length].slice(1).map((hundredths,index)=>{
    const count=index+1,atLeast=(length===3||length===4||length===5)&&count===table[length].length-1;
    return {length,count,atLeast,hundredths,label:length+'個ライン '+count+'本'+(atLeast?'以上':'')};
  })));
  const payRows=rowsFor(tiers),legacyPayRows=rowsFor(legacyTiers);
  const tiersFor=state=>state?.rulesRevision===LEGACY_REVISION?legacyTiers:tiers;
  const payRowsBaseFor=state=>state?.rulesRevision===LEGACY_REVISION?legacyPayRows:payRows;
  // Numerators count tenths of BET over C(25,5) * C(20,3) equally likely outcomes.
  // The 0.5% festival mold keeps the three five-cell lines possible at every setting.
  const legacyMolds=freeze([
    {id:'plain',name:'白いおさら',initialFreeCells:[],optimalNumeratorTenths:275113532,automaticNumeratorTenths:264375064},
    {id:'one',name:'ひと粒',initialFreeCells:[20],optimalNumeratorTenths:584311374,automaticNumeratorTenths:509480674},
    {id:'two',name:'ふた粒',initialFreeCells:[19,21],optimalNumeratorTenths:887409084,automaticNumeratorTenths:749874864},
    {id:'shoulders',name:'よりそい',initialFreeCells:[10,14],optimalNumeratorTenths:1285049154,automaticNumeratorTenths:896031148},
    {id:'festival',name:'三色まつり',initialFreeCells:[5,6,7],optimalNumeratorTenths:4454759956,automaticNumeratorTenths:2948678970}
  ].map(m=>({...m,optimalReturnPercent:10*m.optimalNumeratorTenths/DENOMINATOR,automaticReturnPercent:10*m.automaticNumeratorTenths/DENOMINATOR})));
  const previousMolds=freeze([
    {id:'edge',name:'すそのひと粒',initialFreeCells:[17],mirrorRandomly:true,optimalNumeratorTenths:277406842,automaticNumeratorTenths:235838809},
    {id:'one',name:'ひと粒',initialFreeCells:[20],optimalNumeratorTenths:414836844,automaticNumeratorTenths:324652551},
    {id:'two',name:'ふた粒',initialFreeCells:[19,21],optimalNumeratorTenths:624489542,automaticNumeratorTenths:447384849},
    {id:'shoulders',name:'よりそい',initialFreeCells:[10,14],optimalNumeratorTenths:1058887719,automaticNumeratorTenths:630265093},
    {id:'festival',name:'三色まつり',initialFreeCells:[5,6,7],optimalNumeratorTenths:4305190290,automaticNumeratorTenths:2664728671}
  ].map(m=>({...m,optimalReturnPercent:10*m.optimalNumeratorTenths/DENOMINATOR,automaticReturnPercent:10*m.automaticNumeratorTenths/DENOMINATOR})));
  const legacy=freeze({revision:LEGACY_REVISION,ruleId:'initial-hit-free-v4',tiers:legacyTiers,payRows:legacyPayRows,molds:legacyMolds});
  const legacy253=freeze({revision:PREVIOUS_REVISION,ruleId:'initial-required-free-v5',tiers,payRows,molds:previousMolds});
  // Each pool selects one of its variants uniformly before number shuffling.
  // Variant numerators are exact over C(25,5)*C(20,3), independent of ball labels.
  const molds=freeze([
    {id:"edge",name:"すそのひと粒",variants:[
      {"id":"one-17","initialFreeCells":[17],"initialReflected":false,"optimalNumeratorTenths":277406842,"automaticNumeratorTenths":235838809},
      {"id":"one-17-mirror","initialFreeCells":[23],"initialReflected":true,"optimalNumeratorTenths":277406842,"automaticNumeratorTenths":235838809}
    ]},
    {id:"one",name:"ひと粒いろいろ",variants:[
      {"id":"one-20","initialFreeCells":[20],"initialReflected":false,"optimalNumeratorTenths":414836844,"automaticNumeratorTenths":324652551},
      {"id":"one-0","initialFreeCells":[0],"initialReflected":false,"optimalNumeratorTenths":525609257,"automaticNumeratorTenths":419542606},
      {"id":"one-1","initialFreeCells":[1],"initialReflected":false,"optimalNumeratorTenths":417395211,"automaticNumeratorTenths":337491741},
      {"id":"one-2","initialFreeCells":[2],"initialReflected":false,"optimalNumeratorTenths":408202041,"automaticNumeratorTenths":327042802},
      {"id":"one-1-mirror","initialFreeCells":[3],"initialReflected":true,"optimalNumeratorTenths":417395211,"automaticNumeratorTenths":337491741},
      {"id":"one-4","initialFreeCells":[4],"initialReflected":false,"optimalNumeratorTenths":492916742,"automaticNumeratorTenths":378243958},
      {"id":"one-5","initialFreeCells":[5],"initialReflected":false,"optimalNumeratorTenths":417458113,"automaticNumeratorTenths":340773423},
      {"id":"one-6","initialFreeCells":[6],"initialReflected":false,"optimalNumeratorTenths":488238689,"automaticNumeratorTenths":395280425},
      {"id":"one-5-mirror","initialFreeCells":[7],"initialReflected":true,"optimalNumeratorTenths":417458113,"automaticNumeratorTenths":340773423},
      {"id":"one-4-mirror","initialFreeCells":[8],"initialReflected":true,"optimalNumeratorTenths":492916742,"automaticNumeratorTenths":378243958},
      {"id":"one-9","initialFreeCells":[9],"initialReflected":false,"optimalNumeratorTenths":388771612,"automaticNumeratorTenths":299299911},
      {"id":"one-10","initialFreeCells":[10],"initialReflected":false,"optimalNumeratorTenths":352321081,"automaticNumeratorTenths":278020035},
      {"id":"one-11","initialFreeCells":[11],"initialReflected":false,"optimalNumeratorTenths":392737966,"automaticNumeratorTenths":320429912},
      {"id":"one-12","initialFreeCells":[12],"initialReflected":false,"optimalNumeratorTenths":426459605,"automaticNumeratorTenths":311626544},
      {"id":"one-11-mirror","initialFreeCells":[13],"initialReflected":true,"optimalNumeratorTenths":392737966,"automaticNumeratorTenths":320429912},
      {"id":"one-10-mirror","initialFreeCells":[14],"initialReflected":true,"optimalNumeratorTenths":352321081,"automaticNumeratorTenths":278020035},
      {"id":"one-9-mirror","initialFreeCells":[15],"initialReflected":true,"optimalNumeratorTenths":388771612,"automaticNumeratorTenths":299299911},
      {"id":"one-16","initialFreeCells":[16],"initialReflected":false,"optimalNumeratorTenths":349091231,"automaticNumeratorTenths":282764069},
      {"id":"one-17","initialFreeCells":[17],"initialReflected":false,"optimalNumeratorTenths":277406842,"automaticNumeratorTenths":235838809},
      {"id":"one-18","initialFreeCells":[18],"initialReflected":false,"optimalNumeratorTenths":317457752,"automaticNumeratorTenths":264874215},
      {"id":"one-19","initialFreeCells":[19],"initialReflected":false,"optimalNumeratorTenths":307893136,"automaticNumeratorTenths":256269965},
      {"id":"one-19-mirror","initialFreeCells":[21],"initialReflected":true,"optimalNumeratorTenths":307893136,"automaticNumeratorTenths":256269965},
      {"id":"one-18-mirror","initialFreeCells":[22],"initialReflected":true,"optimalNumeratorTenths":317457752,"automaticNumeratorTenths":264874215},
      {"id":"one-17-mirror","initialFreeCells":[23],"initialReflected":true,"optimalNumeratorTenths":277406842,"automaticNumeratorTenths":235838809},
      {"id":"one-16-mirror","initialFreeCells":[24],"initialReflected":true,"optimalNumeratorTenths":349091231,"automaticNumeratorTenths":282764069}
    ]},
    {id:"two",name:"ふた粒いろいろ",variants:[
      {"id":"two-middle","initialFreeCells":[19,21],"initialReflected":false,"optimalNumeratorTenths":624489542,"automaticNumeratorTenths":447384849},
      {"id":"two-edge","initialFreeCells":[17,23],"initialReflected":false,"optimalNumeratorTenths":507092971,"automaticNumeratorTenths":364948246},
      {"id":"two-corners","initialFreeCells":[16,24],"initialReflected":false,"optimalNumeratorTenths":739274113,"automaticNumeratorTenths":494923172},
      {"id":"two-wide","initialFreeCells":[18,22],"initialReflected":false,"optimalNumeratorTenths":716802480,"automaticNumeratorTenths":521537659}
    ]},
    {id:"shoulders",name:"ひろがるふた粒",variants:[
      {"id":"two-shoulders","initialFreeCells":[10,14],"initialReflected":false,"optimalNumeratorTenths":1058887719,"automaticNumeratorTenths":630265093},
      {"id":"two-spine","initialFreeCells":[0,20],"initialReflected":false,"optimalNumeratorTenths":1298177034,"automaticNumeratorTenths":852876457},
      {"id":"two-cross","initialFreeCells":[5,14],"initialReflected":false,"optimalNumeratorTenths":774741551,"automaticNumeratorTenths":543436458},
      {"id":"two-cross-mirror","initialFreeCells":[7,10],"initialReflected":true,"optimalNumeratorTenths":774741551,"automaticNumeratorTenths":543436458},
      {"id":"two-bowl","initialFreeCells":[4,12],"initialReflected":false,"optimalNumeratorTenths":1094691743,"automaticNumeratorTenths":687642736},
      {"id":"two-bowl-mirror","initialFreeCells":[8,12],"initialReflected":true,"optimalNumeratorTenths":1094691743,"automaticNumeratorTenths":687642736}
    ]},
    {id:"festival",name:"三色まつり",variants:[
      {"id":"three-festival","initialFreeCells":[5,6,7],"initialReflected":false,"optimalNumeratorTenths":4305190290,"automaticNumeratorTenths":2664728671},
      {"id":"three-five","initialFreeCells":[4,8,20],"initialReflected":false,"optimalNumeratorTenths":4379422245,"automaticNumeratorTenths":2650738217},
      {"id":"three-cross","initialFreeCells":[1,8,20],"initialReflected":false,"optimalNumeratorTenths":2353461354,"automaticNumeratorTenths":1231270947},
      {"id":"three-cross-mirror","initialFreeCells":[3,4,20],"initialReflected":true,"optimalNumeratorTenths":2353461354,"automaticNumeratorTenths":1231270947},
      {"id":"three-wide","initialFreeCells":[10,18,20],"initialReflected":false,"optimalNumeratorTenths":2778799717,"automaticNumeratorTenths":1876390330},
      {"id":"three-wide-mirror","initialFreeCells":[14,20,22],"initialReflected":true,"optimalNumeratorTenths":2778799717,"automaticNumeratorTenths":1876390330}
    ]}
  ].map(m=>{
    const layoutCount=m.variants.length;
    const optimalNumeratorSumTenths=m.variants.reduce((sum,v)=>sum+v.optimalNumeratorTenths,0);
    const automaticNumeratorSumTenths=m.variants.reduce((sum,v)=>sum+v.automaticNumeratorTenths,0);
    return {...m,initialFreeCells:m.variants[0].initialFreeCells,layoutCount,optimalNumeratorSumTenths,automaticNumeratorSumTenths,
      poolOutcomeDenominator:layoutCount*DENOMINATOR,
      optimalNumeratorTenths:optimalNumeratorSumTenths/layoutCount,automaticNumeratorTenths:automaticNumeratorSumTenths/layoutCount,
      optimalReturnPercent:10*optimalNumeratorSumTenths/(layoutCount*DENOMINATOR),automaticReturnPercent:10*automaticNumeratorSumTenths/(layoutCount*DENOMINATOR)};
  }));

  function effectiveTarget(value){
    const n=Number(value);return Math.max(50,Math.min(150,Number.isFinite(n)?n:90));
  }
  function calibrationForTarget(value=90){
    const target=effectiveTarget(value),festival=molds.length-1;
    const remaining=1-FESTIVAL_PROBABILITY-festival*MIN_REGULAR_MOLD_PROBABILITY;
    const fixedReturn=FESTIVAL_PROBABILITY*molds[festival].optimalReturnPercent+
      MIN_REGULAR_MOLD_PROBABILITY*molds.slice(0,festival).reduce((sum,m)=>sum+m.optimalReturnPercent,0);
    const regularTarget=(target-fixedReturn)/remaining;
    let low=0;
    while(low<festival-1&&molds[low+1].optimalReturnPercent<regularTarget)low++;
    const high=Math.min(low+1,festival-1),span=molds[high].optimalReturnPercent-molds[low].optimalReturnPercent;
    const highShare=span?Math.max(0,Math.min(1,(regularTarget-molds[low].optimalReturnPercent)/span)):0;
    const weights=molds.map((_,moldIndex)=>({moldIndex,weight:moldIndex===festival?FESTIVAL_PROBABILITY:MIN_REGULAR_MOLD_PROBABILITY}));
    weights[low].weight+=remaining*(1-highShare);weights[high].weight+=remaining*highShare;
    return {target,reference:'optimal-manual',festivalProbability:FESTIVAL_PROBABILITY,
      minimumRegularMoldProbability:MIN_REGULAR_MOLD_PROBABILITY,weights,
      optimalReturnPercent:weights.reduce((sum,x)=>sum+x.weight*molds[x.moldIndex].optimalReturnPercent,0),
      automaticReturnPercent:weights.reduce((sum,x)=>sum+x.weight*molds[x.moldIndex].automaticReturnPercent,0)};
  }
  function weightsForTarget(target){return calibrationForTarget(target).weights;}
  function seededRandom(seed){
    let value=Number(seed)>>>0;
    return ()=>{value=(value+0x6D2B79F5)>>>0;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  function sample(rng){
    const value=Number(rng());
    if(!Number.isFinite(value)||value<0||value>1)throw new RangeError('Dango RNG must return a value in [0,1].');
    return Math.min(1-Number.EPSILON,value);
  }
  function pickMold(target,rng){
    const roll=sample(rng);let sum=0;
    for(const item of weightsForTarget(target)){sum+=item.weight;if(roll<sum)return item.moldIndex;}
    return molds.length-1;
  }
  function maskOf(ids){return ids.reduce((m,id)=>m|(1<<id),0);}
  function popcount(value){
    value>>>=0;value-=(value>>>1)&0x55555555;value=(value&0x33333333)+((value>>>2)&0x33333333);
    return Math.imul((value+(value>>>4))&0x0f0f0f0f,0x01010101)>>>24;
  }
  function idsOf(mask){const result=[];for(let i=0;i<25;i++)if(mask&(1<<i))result.push(i);return result;}
  function reflect(mask){let result=0;for(let i=0;i<25;i++)if(mask&(1<<i))result|=1<<mirror[i];return result;}
  function hash32(value){
    value>>>=0;value^=value>>>16;value=Math.imul(value,0x7feb352d);value^=value>>>15;
    value=Math.imul(value,0x846ca68b);value^=value>>>16;return value>>>0;
  }
  function stateOk(state){return !!state&&[REVISION,PREVIOUS_REVISION,LEGACY_REVISION].includes(state.rulesRevision)&&Array.isArray(state.numbers)&&state.numbers.length===25&&Array.isArray(state.draws);}
  function cellIdOk(id){return Number.isInteger(id)&&id>=0&&id<25;}
  function scoreGreater(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]>b[i];return false;}

  function derive(source,previous){
    const numbers=source.numbers.slice(),draws=source.draws.slice(),initialFreeCells=source.initialFreeCells.slice(),manualFreeCells=source.manualFreeCells.slice();
    const initialMask=maskOf(initialFreeCells),manualMask=maskOf(manualFreeCells),hitCells=draws.map(n=>numbers.indexOf(n)),hitMask=maskOf(hitCells);
    const bonusHits=draws.slice(0,5).filter(n=>initialMask&(1<<numbers.indexOf(n)));
    const oddsHits=draws.slice(5).filter(n=>{const bit=1<<numbers.indexOf(n);return !!(manualMask&bit)&&!(initialMask&bit);});
    const freeBudget=1+bonusHits.length,oddsMultiplier=1+oddsHits.length,markedMask=initialMask|manualMask|hitMask;
    const completedLines=lines.filter(line=>(line.mask&markedMask)===line.mask).map(line=>line.id);
    const lineCounts={3:0,4:0,5:0,7:0,9:0};for(const id of completedLines)lineCounts[lines[id].length]++;
    const highestRoles=highestRolesFor({lineCounts}),previousHighestRoles=highestRolesFor(previous);
    const newHighestRoles=previous?highestRoles.filter(length=>!previousHighestRoles.includes(length)):[];
    const payoutTable=tiersFor(source);
    const baseHundredths=LENGTHS.reduce((sum,length)=>sum+payoutTable[length][Math.min(lineCounts[length],payoutTable[length].length-1)],0);
    const previousLines=new Set(previous?.completedLines||[]),newLines=previous?completedLines.filter(id=>!previousLines.has(id)):[];
    const freeCommitted=!!source.freeCommitted;
    const phase=draws.length>=8?'done':draws.length<5?'draw':freeCommitted?'draw-final':'placing';
    return {...source,rulesRevision:source.rulesRevision,numbers,draws,phase,freeCommitted,placementCommitted:freeCommitted,
      initialFreeCells,manualFreeCells,initialFree:initialFreeCells,manualFree:manualFreeCells,
      freeBudget,freeQuota:freeBudget,freeRemaining:Math.max(0,freeBudget-manualFreeCells.length),bonusHits,oddsHits,
      oddsMultiplier,multiplier:oddsMultiplier,baseHundredths,totalHundredths:baseHundredths*oddsMultiplier,
      lineCounts,counts:lineCounts,completedLines,newLines,highestRole:highestRoles.length>0,highestRoles,newHighestRoles,
      hitCells,markedCells:idsOf(markedMask),initialMask,manualMask,hitMask,markedMask,
      lineMasks:lines.map(line=>line.mask),lastBonusGain:previous?Math.max(0,freeBudget-previous.freeBudget):0,
      lastOddsGain:previous?Math.max(0,oddsMultiplier-previous.oddsMultiplier):0,
      cells:cells.map(c=>({...c,number:numbers[c.id],hit:!!(hitMask&(1<<c.id)),initialFree:!!(initialMask&(1<<c.id)),manualFree:!!(manualMask&(1<<c.id)),marked:!!(markedMask&(1<<c.id))}))};
  }

  function create(options={}){
    const requestedTarget=options.target??90,target=effectiveTarget(requestedTarget);
    const rng=typeof options.rng==='function'?options.rng:options.seed!==undefined?seededRandom(options.seed):Math.random;
    const moldIndex=options.moldIndex===undefined?pickMold(target,rng):options.moldIndex;
    if(!Number.isInteger(moldIndex)||!molds[moldIndex])throw new RangeError('Unknown Dango mold.');
    const mold=molds[moldIndex],customInitial=options.initialFreeCells!==undefined;
    const initialVariantIndex=customInitial?null:options.initialVariantIndex??Math.floor(sample(rng)*mold.variants.length);
    if(!customInitial&&(!Number.isInteger(initialVariantIndex)||!mold.variants[initialVariantIndex]))throw new RangeError('Unknown Dango initial layout.');
    const variant=customInitial?null:mold.variants[initialVariantIndex];
    const initialFreeCells=(customInitial?options.initialFreeCells:variant.initialFreeCells).slice();
    const initialReflected=!!variant?.initialReflected;
    if(initialFreeCells.length<1||initialFreeCells.length>3||new Set(initialFreeCells).size!==initialFreeCells.length||!initialFreeCells.every(cellIdOk))throw new RangeError('Dango initial FREE must contain 1–3 distinct cells.');
    let numbers;
    if(options.numbers!==undefined){
      numbers=options.numbers.slice();
      if(numbers.length!==25||new Set(numbers).size!==25||!numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=25))throw new RangeError('Dango numbers must be a permutation of 1–25.');
    }else{
      numbers=Array.from({length:25},(_,i)=>i+1);
      for(let i=24;i>0;i--){const j=Math.floor(sample(rng)*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
    }
    return derive({rulesRevision:REVISION,ruleId:'random-initial-free-v6',numbers,draws:[],initialFreeCells,manualFreeCells:[],freeCommitted:false,
      target,requestedTarget,moldIndex,moldId:molds[moldIndex].id,moldName:molds[moldIndex].name,initialReflected,initialVariantIndex,initialLayoutId:variant?.id??'custom',seed:options.seed??null,
      calibrationReference:'optimal-manual',lastNumber:null,lastCell:null});
  }
  function draw(state,number){
    if(!stateOk(state)||!Number.isInteger(number)||number<1||number>25)return null;
    if(state.draws.includes(number))return state;
    if(state.phase==='placing'||state.phase==='done'||state.draws.length>=8)return null;
    if(state.draws.length>=5&&!state.freeCommitted)return null;
    return derive({...state,draws:[...state.draws,number],lastNumber:number,lastCell:state.numbers.indexOf(number)},state);
  }
  function placeFree(state,cellId){
    if(!stateOk(state)||!cellIdOk(cellId))return null;
    if(state.manualFreeCells.includes(cellId))return state;
    if(state.phase!=='placing'||state.freeCommitted||state.freeRemaining<=0)return null;
    // An initial FREE stays an initial FREE; neither placing nor stacking raises odds.
    if(state.initialFreeCells.includes(cellId)||state.hitCells.includes(cellId))return null;
    return derive({...state,manualFreeCells:[...state.manualFreeCells,cellId]},state);
  }
  function undoFree(state,cellId){
    if(!stateOk(state)||!cellIdOk(cellId)||state.phase!=='placing'||state.freeCommitted)return null;
    if(!state.manualFreeCells.includes(cellId))return state;
    return derive({...state,manualFreeCells:state.manualFreeCells.filter(id=>id!==cellId)},state);
  }
  function autoPlace(state){
    if(!stateOk(state)||state.phase!=='placing'||state.freeCommitted)return null;
    if(!state.freeRemaining)return state;
    const initial=state.initialMask,h=state.hitMask,ri=reflect(initial),rh=reflect(h);
    const mirrored=ri<initial||(ri===initial&&rh<h),ih=mirrored?ri:initial,hh=mirrored?rh:h;
    let selected=mirrored?reflect(state.manualMask):state.manualMask;
    const existing=popcount(selected);
    for(let step=existing;step<state.freeBudget;step++){
      const marked=ih|hh|selected;let best=null,bestBit=0;
      for(let id=0;id<25;id++)if(!(marked&(1<<id))){
        let complete=0,longComplete=0,longReach=0,reachCount=0,closest=100,longClosest=0;
        for(const line of lines)if(line.mask&(1<<id)){
          const missing=popcount(line.mask&~marked);
          if(missing===1){complete++;longComplete=Math.max(longComplete,line.length);}
          if(missing===2){longReach=Math.max(longReach,line.length);reachCount++;}
          if(missing>2){if(missing<closest){closest=missing;longClosest=line.length;}else if(missing===closest)longClosest=Math.max(longClosest,line.length);}
        }
        const tie=hash32(hh^Math.imul(ih,0xc2b2ae35)^Math.imul(id+1,0x9e3779b9)^Math.imul(step+1,0x85ebca6b));
        const score=[complete,longComplete,longReach,reachCount,-closest,longClosest,tie];
        if(!best||scoreGreater(score,best)){best=score;bestBit=1<<id;}
      }
      selected|=bestBit;
    }
    const resultMask=mirrored?reflect(selected):selected;
    const added=idsOf(resultMask&~state.manualMask);
    return derive({...state,manualFreeCells:[...state.manualFreeCells,...added]},state);
  }
  function commitFree(state,{autoFill=true}={}){
    if(!stateOk(state))return null;
    if(state.freeCommitted&&(state.phase==='draw-final'||state.phase==='done'))return state;
    if(state.phase!=='placing')return null;
    let next=state;
    if(next.freeRemaining){if(!autoFill)return null;next=autoPlace(next);}
    if(!next||next.freeRemaining)return null;
    return derive({...next,freeCommitted:true},state);
  }
  function payout(state){return stateOk(state)?state.totalHundredths:0;}
  function payRowsFor(state){
    const multiplier=stateOk(state)?state.oddsMultiplier:1;
    return payRowsBaseFor(state).map(row=>({...row,baseHundredths:row.hundredths,hundredths:row.hundredths*multiplier}));
  }
  function reaches(state){
    if(!stateOk(state)||state.phase==='placing'||state.phase==='done')return [];
    const result=[];
    for(let n=1;n<=25;n++)if(!state.draws.includes(n)){
      const next=draw(state,n);if(!next)continue;
      const gainHundredths=next.totalHundredths-state.totalHundredths,oddsUp=next.oddsMultiplier>state.oddsMultiplier;
      const allClear=next.newHighestRoles.length>0;
      if(gainHundredths>0||oddsUp||allClear)result.push({n,number:n,totalHundredths:next.totalHundredths,gainHundredths,
        total:next.totalHundredths/100,gain:gainHundredths/100,oddsUp,allClear,highestRole:next.highestRole,
        highestRoles:next.highestRoles.slice(),newHighestRoles:next.newHighestRoles.slice(),newLines:next.newLines.slice()});
    }
    return result;
  }
  return freeze({REVISION,version:REVISION,ruleId:'random-initial-free-v6',geometry,cells,lines,CELLS:cells,LINES:lines,molds,tiers,payRows,tiersFor,payRowsBaseFor,legacy,legacy253,highestRoleMinimums,isHighestRole,highestRolesFor,
    FESTIVAL_PROBABILITY,MIN_REGULAR_MOLD_PROBABILITY,DENOMINATOR,create,createBoard:create,draw,placeFree,undoFree,autoPlace,commitFree,reaches,
    payout,payoutState:payout,payRowsFor,weightsForTarget,calibrationForTarget,effectiveTarget,seededRandom,
    helpers:{popcount,maskOf,idsOf,reflect,hash32}});
});
