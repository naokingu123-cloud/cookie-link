/* Historical v268 rules with current presentation: this isolated fixture never touches a wallet. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),output=path.resolve(process.env.DANGO_VIEW_QA_OUTPUT||'qa-dango-v269-view');
await fs.mkdir(output,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
// Load the production pure reach builders, without starting the game or wallet.
const nativeSource=await fs.readFile(path.join(root,'optimized/app-01.js'),'utf8');
const cometStart=nativeSource.indexOf('function reachCometMarkup(tier){'),cometEnd=nativeSource.indexOf('\nconst paidReachDrawAllowed=',cometStart);
assert.ok(cometStart>=0&&cometEnd>cometStart,'production comet builder exists');
const circularBuilder=nativeSource.match(/function sixDropReachCometMarkup\(tier\)\{[^\n]+\}/)?.[0];
assert.ok(circularBuilder,'production circular Six Drop builder exists');
const nativeReach=nativeSource.slice(cometStart,cometEnd)+'\n'+circularBuilder+'\n'+nativeSource.match(/const REACH_WORDS=\[[^;]+;/)[0]+'\n'+nativeSource.match(/const reachTier=[^\n]+;/)[0];
const baseHtml='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dango current presentation</title><link rel="stylesheet" href="/optimized/style-01.css"><link rel="stylesheet" href="/optimized/style-03.css"><style>html,body,#screen,#panels{width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;display:block!important;overflow:hidden!important;transform:none!important}#screen{position:fixed!important;inset:0!important}#panels,#fixture{position:relative!important;width:100%!important;height:100%!important}@font-face{font-family:ElixirNumbers;src:url(/optimized/media/3af2886469024d10.woff2)}@font-face{font-family:ArcadePayout;src:url(/optimized/media/a73bbbdd98d48aac.woff2);font-weight:700}</style><link rel="stylesheet" href="/assets/dango-bingo.css"><body class="dgb-active"><div id="screen"><div id="panels"><div class="dgb-panel" id="fixture"></div></div></div><svg width="0" height="0" aria-hidden="true"><defs><linearGradient id="reach-rainbow-edge"><stop stop-color="#ff487d"/><stop offset=".5" stop-color="#59efb6"/><stop offset="1" stop-color="#bb78ff"/></linearGradient></defs></svg><script>'+nativeReach+'</script><script src="/assets/dango-bingo-rules.js"></script><script src="/assets/dango-bingo-view.js"></script><script src="/assets/dango-bingo-lesson.js"></script></body></html>';
// Load the production illustrated cells while retaining this isolated game fixture.
const html=baseHtml
 .replace('<script src="/assets/dango-bingo-rules.js"></script>','<script src="/assets/dango-bingo-rules.js"></script><script>window.DangoBingoRules=window.DangoBingoRules.legacy268??window.DangoBingoRules;</script>')
 .replace('<link rel="stylesheet" href="/assets/dango-bingo.css">','<link rel="stylesheet" href="/assets/dango-bingo.css"><link rel="stylesheet" href="/assets/ornate-boards-c-v274.css">')
 .replace('<script src="/assets/dango-bingo-view.js"></script>','<script src="/assets/illustrated-art-v275.js"></script><script src="/assets/illustrated-boards-c-v275.js"></script><script src="/assets/dango-bingo-view.js"></script>');
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
 try{const bytes=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;const report={revision:269,rulesRevision:268,errors:[],firstHalf:[],screens:[],thinking:[]};
const viewports=[[1366,750],[844,340],[390,844],[390,540],[320,480],[390,300],[320,270]];
async function setup(target){
 target.on('pageerror',error=>report.errors.push(String(error)));
 await target.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle'});
 return target.evaluate(async()=>{
  await Promise.all([DangoBingoView.assetsReady,SweetsBoardArtV275.ready,document.fonts.ready]);
  const R=DangoBingoRules,qa=window.qa269={R,view:DangoBingoView.mount(document.getElementById('fixture')),state:null,bet:100};
  qa.render=(options={})=>qa.view.draw(qa.state,{bet:qa.bet,remainingMs:9000,time:1200,reach:R.reaches(qa.state),...options});
  qa.new=(mold=0)=>{qa.state=R.create({moldIndex:mold,numbers:Array.from({length:25},(_,i)=>i+1)});qa.render();};
  qa.seven=()=>{qa.new();for(const n of [1,3,6,10,15])qa.state=R.draw(qa.state,n);qa.render();};
  qa.six=()=>{qa.new(1);for(const id of [2,7,11,16,22])qa.state=R.draw(qa.state,qa.state.numbers[id]);for(const id of [1,8,13,15,17,18])qa.state=R.placeFree(qa.state,id);qa.state=R.commitFree(qa.state,{autoFill:false});qa.state=R.draw(qa.state,qa.state.numbers[19]);qa.render();};
  qa.cell=(length,count)=>document.querySelector('.dgb-pay tr[data-length="'+length+'"] td[data-count="'+count+'"]');
  qa.view.setCallbacks({onCell(id){const s=qa.state;qa.state=s.manualFreeCells.includes(id)?R.undoFree(s,id):R.placeFree(s,id);if(qa.state)qa.render();},onAuto(){qa.state=R.autoPlace(qa.state);qa.render();}});
  qa.measure=()=>{
   const scene=document.querySelector('.dgb-scene'),g=DangoBingoView.geometry(scene.clientWidth,scene.clientHeight,{state:qa.state}),payout=qa.view.describe().payout;
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,centerX:(r.left+r.right)/2,centerY:(r.top+r.bottom)/2};};
   const table=box(document.querySelector('.dgb-pay')),frame=box(document.querySelector('.dgb-pay-matrix')),matrix=box(document.querySelector('.dgb-pay table')),oddsElement=document.querySelector('.dgb-pay-odds'),odds=oddsElement.hidden?null:box(oddsElement),free=box(document.querySelector('.dgb-free-stat')),railElement=document.querySelector('.dgb-free-rail'),rail=box(railElement);
   const distance=(r,p)=>Math.hypot(p.x-Math.max(r.x,Math.min(r.right,p.x)),p.y-Math.max(r.y,Math.min(r.bottom,p.y)));
   const cells=[...document.querySelectorAll('.dgb-pay td,.dgb-pay tbody th')];
   const labels=[...document.querySelectorAll('.dgb-pay tbody th')].map(th=>({length:+th.parentElement.dataset.length,text:th.textContent,cell:box(th),name:box(th.querySelector('.dgb-line-name')),scroll:th.scrollWidth,width:th.clientWidth}));
   const rows=[...document.querySelectorAll('.dgb-free-rail-row')].map(row=>({length:+row.dataset.length,box:box(row),icons:[...row.children].map(icon=>({box:box(icon),bitmap:icon.dataset.bitmap,kind:icon.dataset.kind,width:icon.width}))}));
   const draw=DangoBingoView.describeAssets().last.main,dpr=Math.min(2,devicePixelRatio||1),freeStyle=getComputedStyle(document.querySelector('.dgb-free-stat')),freeContentWidth=free.width-['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((sum,key)=>sum+parseFloat(freeStyle[key]),0);
   const payoutSource=getComputedStyle(document.querySelector('.dgb-pay-matrix')).borderImageSource;
   return {width:scene.clientWidth,height:scene.clientHeight,table,frame,matrix,odds,free,rail,railVisible:!railElement.hidden,unit:g.unit,payout,labels,rows,draw,
    tableClearance:Math.min(...[frame,odds].filter(Boolean).flatMap(rect=>g.centers.map(p=>distance(rect,p)))),freeClearance:Math.min(...g.centers.map(p=>distance(free,p))),railClearance:railElement.hidden?null:Math.min(...g.centers.map(p=>distance(rail,p))),
    numeralFont:parseFloat(getComputedStyle(document.querySelector('.gold-number')).fontSize),
    payoutSvgCount:document.querySelectorAll('.dgb-pay svg').length,payoutArtwork:payoutSource,nativeArtworkReady:DangoBingoView.describeAssets().ready,cartoonAdapter:DangoBingoView.describeAssets().cartoon,illustratedAdapter:DangoBingoView.describeAssets().illustrated,frameBackground:getComputedStyle(document.querySelector('.dgb-pay-matrix')).backgroundColor,frameInsets:Object.fromEntries(['Top','Right','Bottom','Left'].map(side=>[side.toLowerCase(),parseFloat(getComputedStyle(document.querySelector('.dgb-pay-matrix'))['border'+side+'Width'])])),
    numerals:[...document.querySelectorAll('.dgb-pay td .gold-number')].map(el=>{
     const td=el.parentElement,row=R.payRowsFor(qa.state).find(row=>row.length===Number(td.parentElement.dataset.length)&&row.count===Number(td.dataset.count));
     const range=document.createRange();range.selectNodeContents(el);
     return {text:el.textContent,expected:row.possible===false?'—':row.hundredths===0?'-':String(Math.floor(qa.bet*row.hundredths/100)),value:box(el),ink:box(range),cell:box(td),cellHeight:td.clientHeight,font:parseFloat(getComputedStyle(el).fontSize)};
    }),
    overflow:cells.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({length:e.parentElement.dataset.length,count:e.dataset.count,width:e.clientWidth,scroll:e.scrollWidth})),
    inside:g.centers.every(p=>p.x-g.radius>=0&&p.x+g.radius<=scene.clientWidth&&p.y-g.radius>=0&&p.y+g.radius<=scene.clientHeight),
    canvasMatches:Math.abs(draw.geometry.unit/dpr-g.unit)<.01&&draw.geometry.centers.every((p,i)=>Math.abs(p.x/dpr-g.centers[i].x)<.01&&Math.abs(p.y/dpr-g.centers[i].y)<.01),
    controlMatches:[...document.querySelectorAll('.dgb-cell')].every((button,i)=>Math.abs(parseFloat(button.style.left)-g.centers[i].x)<.01&&Math.abs(parseFloat(button.style.top)-g.centers[i].y)<.01),
    oldTableWidth:payout.referenceWidth??(g.portrait?g.width-payout.anchor*2:payout.unit*4.23),
    manualWait:document.querySelector('.dgb-countdown').textContent,
    freeContentWidth,freeTextOverflow:[...document.querySelectorAll('.dgb-free-stat>small,.dgb-free-stat>b,.dgb-free-detail,.dgb-countdown,.dgb-actions button')].filter(e=>e.getBoundingClientRect().width>freeContentWidth+1||e.scrollWidth>e.clientWidth+1).map(e=>({text:e.textContent,width:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth}))
   };
  };
  qa.new();return {rules:R.REVISION,view:DangoBingoView.presentationRevision,stateView:qa.view.describe().revision,assets:DangoBingoView.describeAssets().ready};
 });
}
async function fit(width,height,options={}){
 await page.setViewportSize({width,height});await page.evaluate(o=>qa269.render(o),options);
 await page.waitForFunction(()=>{const canvas=document.querySelector('.dgb-pan>canvas');return canvas.width===Math.round(innerWidth*Math.min(2,devicePixelRatio||1));});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return page.evaluate(()=>qa269.measure());
}
function checkLayout(m,{rail=false}={}){
 const detail=JSON.stringify(m);
 assert.equal(m.inside,true,'board containment '+detail);assert.equal(m.canvasMatches,true,'canvas logical/backing coordinate alignment '+detail);assert.equal(m.controlMatches,true,'FREE targets follow the drawn board '+detail);
 assert.equal(m.overflow.length,0,'payout text fits '+detail);
 // v301 reserves vertical room for GET!/reach. Keep the full-sized face where
 // it fits, with the established ~9px floor only in shallow portrait fixtures.
 const shallowPortrait=m.width/m.height<1.45&&m.height<420,minimumFont=shallowPortrait?8.9:14;
 for(const n of m.numerals){
  assert.equal(n.text,n.expected,'complete native payout, including every large-BET digit');
  const fittedHeight=Math.min(m.payout.unit*.4,n.cellHeight*.57);
  assert.ok(n.font>=minimumFont&&Math.abs(n.font-fittedHeight)<.02,'readable row-bounded numeral height '+JSON.stringify(n));
  assert.ok(n.ink.x>=n.cell.x-1&&n.ink.right<=n.cell.right+1&&n.ink.y>=n.cell.y-1&&n.ink.bottom<=n.cell.bottom+1,'complete numeral ink stays within its own row '+JSON.stringify(n));
 }
 assert.ok(m.table.right<=m.width+1&&m.table.bottom<=m.height+1,'table containment '+detail);assert.ok(m.free.right<=m.width+1&&m.free.bottom<=m.height+1,'FREE card containment '+detail);
 assert.ok(m.tableClearance>=m.unit*.5-.5,'payout/mochi overlap '+detail);assert.ok(m.freeClearance>=m.unit*.5-.5,'FREE card/mochi overlap '+detail);
 assert.ok(m.table.width<=m.oldTableWidth*.83+1,'compact matrix removes unused width '+detail);
 assert.equal(m.payoutSvgCount,0,'payout skin contains no SVG');assert.match(m.payoutArtwork,/dango-art-v270\/payout-table\.png/);assert.equal(m.frameBackground,'rgb(0, 0, 0)');
 assert.equal(m.nativeArtworkReady,true);assert.equal(m.cartoonAdapter,null,'the old flat painter stays disabled');assert.equal(m.illustratedAdapter.ready,true,'rich illustrated mochi are ready');assert.ok(m.illustratedAdapter.usage.dangoCells>0,'new mochi are actually drawn');assert.equal(m.draw.imageCells,m.draw.cells,'every dango body is drawn from its generated bitmap');assert.equal(m.draw.standRendered,true,'the generated tsukimi stand is drawn');
 assert.ok(Math.abs(m.frame.width-m.matrix.width-m.frameInsets.left-m.frameInsets.right)<1,'the inner table leaves the measured raster-frame inset '+detail);
 assert.ok(Object.values(m.frameInsets).every(inset=>Math.abs(inset-m.payout.frameInset)<1.01),'raster border respects the fitted inset after device-pixel rounding '+detail);
 assert.ok(m.frame.x>=m.table.x-.5&&m.frame.right<=m.table.right+.5&&m.frame.bottom<=m.table.bottom+.5,'the generated frame is contained by the payout panel '+detail);
 for(const n of m.numerals){assert.ok(Math.abs(n.value.centerX-n.cell.centerX)<=.75&&Math.abs(n.value.centerY-n.cell.centerY)<=.75,'payout number stays centered '+JSON.stringify(n));assert.ok(n.value.x>=n.cell.x-1&&n.value.right<=n.cell.right+1,'payout number fits its cell '+JSON.stringify(n));}
 assert.equal(m.railVisible,rail,'FREE rail visibility '+detail);
 for(const row of m.labels){assert.equal(row.text,row.length+'個ライン');assert.ok(row.name.right<=row.cell.right+1&&row.scroll<=row.width+1,'Japanese line labels fit '+detail);}
 if(rail){
  assert.deepEqual(m.rows.map(row=>row.icons.length),[2,3,4,5,6,7]);
  assert.ok(m.rail.x>=m.table.right-1,'FREE icons are to the right of the three payouts '+detail);
  assert.ok(m.rail.right<=m.width+1&&m.rail.bottom<=m.height+1,'rail containment '+detail);
  assert.ok(m.rail.right-m.table.x<=m.oldTableWidth+1,'rail does not expand the former table envelope '+detail);
  assert.ok(m.railClearance>=m.unit*.5-.5,'FREE rail/mochi overlap '+detail);
  for(const row of m.rows){
   const label=m.labels.find(label=>label.length===row.length);
   assert.ok(Math.abs(row.box.centerY-label.cell.centerY)<=1,'icon rows align with payout rows '+detail);
   for(const icon of row.icons){
    assert.equal(icon.bitmap,'true');assert.equal(icon.kind,'yellow');assert.ok(icon.box.width>=12&&icon.width>=12,'visible yellow bitmap size '+detail);
    assert.ok(icon.box.x>=row.box.x-.5&&icon.box.right<=row.box.right+.5&&icon.box.y>=row.box.y-.5&&icon.box.bottom<=row.box.bottom+.5,'FREE icons fit their own row '+detail);
   }
  }
 }
}
try{
 const executable=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
 browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1366,height:750}});
 assert.deepEqual(await setup(page),{rules:268,view:285,stateView:269,assets:true});
 report.initial=await page.evaluate(()=>({highest:qa269.view.describe().highestCells,zero:qa269.cell(2,1).textContent,zeroCurrent:qa269.cell(2,1).classList.contains('current'),oddsHidden:document.querySelector('.dgb-pay-odds').hidden,removedGrantText:document.querySelectorAll('.dgb-free-grant').length,idleMotion:DangoBingoView.describeAssets().last.main.idleMotion,colors:DangoBingoView.lineColors,freeTitle:document.querySelector('.dgb-free-title').textContent,value:document.querySelector('.dgb-free-value').textContent}));
 assert.deepEqual(report.initial.highest,[{length:4,count:3},{length:5,count:3},{length:6,count:2},{length:6,count:3},{length:7,count:2},{length:7,count:3}]);
 assert.equal(report.initial.zero,'-');assert.equal(report.initial.zeroCurrent,false);assert.equal(report.initial.oddsHidden,true);assert.equal(report.initial.idleMotion,false);assert.equal(report.initial.removedGrantText,0);assert.equal(report.initial.freeTitle,'置けるFREE');assert.equal(report.initial.colors[2],'#269eff');assert.equal(report.initial.colors[3],'#4ee3f5');
 report.zeroGet=await page.evaluate(()=>{
  const initial=qa269.state,R=qa269.R;let completed;
  for(let first=1;first<=25&&!completed;first++){
   const one=R.draw(initial,first);if(one.lineCounts[2]===1){completed=one;break;}
   for(let second=first+1;second<=25;second++){const two=R.draw(one,second);if(two.lineCounts[2]===1){completed=two;break;}}
  }
  if(!completed)throw Error('No real single two-cell-line state was found');
  qa269.zeroGetState=completed;qa269.state=completed;const before=JSON.stringify(completed),payout=R.payout(completed);qa269.render();
  const cell=qa269.cell(2,1),result={lines:completed.lineCounts[2],value:cell.textContent,current:cell.classList.contains('current'),label:getComputedStyle(cell,'::after').content,basePayout:R.payRowsBaseFor(completed).find(row=>row.length===2&&row.count===1).hundredths,payoutUnchanged:payout===R.payout(completed),stateUnchanged:before===JSON.stringify(completed)};
  qa269.new();return result;
 });
 assert.equal(report.zeroGet.lines,1);assert.equal(report.zeroGet.value,'-');assert.equal(report.zeroGet.current,true);assert.match(report.zeroGet.label,/GET!/);assert.equal(report.zeroGet.basePayout,0);assert.equal(report.zeroGet.payoutUnchanged,true);assert.equal(report.zeroGet.stateUnchanged,true);
 report.artwork=await page.evaluate(async()=>{
  const files=await Promise.all(DangoBingoView.describeAssets().images.map(async({key,url})=>{const image=new Image();image.src=url;await image.decode();return {key,file:url,width:image.naturalWidth,height:image.naturalHeight};}));
  const image=new Image();image.src=document.querySelector('.dgb-scene').dataset.payoutArt;await image.decode();
  const mini=document.createElement('canvas');mini.width=220;mini.height=150;const before=JSON.stringify(qa269.state),used=DangoBingoView.describeAssets().usage.cells;
  DangoBingoView.drawMini(mini.getContext('2d'),qa269.state,{reducedMotion:true});
  const visual=DangoBingoView.describeAssets(),illustrated=visual.illustrated,cellImages=['white','green','pink','yellow','rainbow'].map(color=>{const image=SweetsBoardArtV275.sprite('dango-'+color);return {name:color,width:image?.width,height:image?.height};});
  return {illustrated,cellImages,payoutSource:image.src,width:image.naturalWidth,height:image.naturalHeight,files,miniImageCells:visual.last.mini.imageCells,miniGeneratedCells:visual.usage.cells-used,miniStandRendered:visual.last.mini.standRendered,cells:qa269.state.cells.length,stateUnchanged:before===JSON.stringify(qa269.state)};
 });
 assert.equal(report.artwork.illustrated.ready,true);assert.ok(report.artwork.illustrated.usage.dangoCells>0);for(const image of report.artwork.cellImages)assert.ok(image.width>32&&image.height>32,'new illustrated mochi decoded: '+image.name);
 assert.match(report.artwork.payoutSource,/dango-art-v270\/payout-table\.png$/);assert.ok(report.artwork.width>0&&report.artwork.height>0,'generated payout PNG decodes');
 assert.deepEqual(report.artwork.files.map(source=>source.key),['white','green','pink','yellow','rainbow','skewer','stand']);
 for(const source of report.artwork.files){assert.match(source.file,/dango-art-v25[23]\/[^/]+\.webp\?v=253$/);assert.ok(source.width>0&&source.height>0,'generated native source decodes: '+source.file);}
 assert.equal(report.artwork.miniImageCells,report.artwork.cells);assert.equal(report.artwork.miniGeneratedCells,report.artwork.cells);assert.equal(report.artwork.miniStandRendered,true);assert.equal(report.artwork.stateUnchanged,true);
 for(const [width,height]of viewports){const m=await fit(width,height);report.firstHalf.push(m);checkLayout(m,{rail:true});await page.screenshot({path:output+'/v269-first-half-'+width+'x'+height+'.png'});}
 const shallowViewports=[[844,340],[844,300],[844,270],[844,250],[1366,250]];
 await page.evaluate(()=>{qa269.state=qa269.zeroGetState;qa269.render();});report.shallowEarlyGet=[];
 assert.equal(await page.evaluate(()=>qa269.cell(2,1).classList.contains('current')),true);
 for(const [width,height]of shallowViewports){
  const m=await fit(width,height);report.shallowEarlyGet.push(m);checkLayout(m,{rail:true});
  await page.screenshot({path:output+'/v270-landscape-early-get-'+width+'x'+height+'.png'});
 }
 // Entering the fifth-ball thinking state immediately removes every early icon.
 await page.evaluate(()=>qa269.seven());assert.equal(await page.evaluate(()=>qa269.state.freeBudget),7);
 for(const [width,height]of [[1366,750],[390,300],[320,270],[320,480]]){
  const m=await fit(width,height,{remainingMs:Infinity});report.thinking.push(m);checkLayout(m);assert.equal(m.manualWait,'6球目の番号待ち');assert.deepEqual(m.freeTextOverflow,[],'manual wait label stays inside FREE card '+JSON.stringify(m));
  await page.screenshot({path:output+'/v269-thinking-'+width+'x'+height+'.png'});
 }
 await fit(1366,750);
 const initialFree=await page.evaluate(()=>qa269.state.initialFreeCells[0]);await page.locator('.dgb-cell[data-cell-id="'+initialFree+'"]').click();
 report.odds=await page.evaluate(()=>({hidden:document.querySelector('.dgb-pay-odds').hidden,text:document.querySelector('.dgb-pay-odds').textContent,remaining:document.querySelector('.dgb-free-value').textContent,placed:qa269.state.manualFreeCells.length}));
 assert.equal(report.odds.hidden,false);assert.equal(report.odds.text,'Odds UP!2倍');assert.match(report.odds.remaining,/6個/);assert.equal(report.odds.placed,1);
 report.oddsPanels=[];
 for(const [width,height]of [[320,270],[390,300]]){
  const m=await fit(width,height,{remainingMs:Infinity}),before=report.thinking.find(row=>row.width===width&&row.height===height);report.oddsPanels.push(m);checkLayout(m);
  assert.ok(m.odds&&m.odds.y>=m.frame.bottom-.5,'Odds badge sits below the generated frame '+JSON.stringify(m));
  assert.ok(Math.abs(m.unit-before.unit)<.01&&Math.abs(m.free.x-before.free.x)<.01&&Math.abs(m.free.y-before.free.y)<.01,'Odds activation preserves board and FREE-card positions '+JSON.stringify({before,after:m}));
  assert.deepEqual(m.freeTextOverflow,[],'untimed Odds 2 placement text fits '+JSON.stringify(m));assert.equal(m.manualWait,'6球目の番号待ち');
  await page.screenshot({path:output+'/v269-thinking-odds2-'+width+'x'+height+'.png'});
 }
 // The decorative frame must fit together with Odds in shallow landscape too.
 report.shallowOdds=[];
 for(const [width,height]of shallowViewports){
  const m=await fit(width,height,{remainingMs:Infinity});report.shallowOdds.push(m);checkLayout(m);
  const early=report.shallowEarlyGet.find(row=>row.width===width&&row.height===height);
  assert.ok(Math.abs(m.unit-early.unit)<.01&&Math.abs(m.free.x-early.free.x)<.01&&Math.abs(m.free.y-early.free.y)<.01,'rail removal preserves the board and FREE-card positions '+JSON.stringify({early,after:m}));
  assert.ok(m.odds&&m.odds.bottom<=m.height+.5,'the complete Odds row stays visible '+JSON.stringify(m));
  assert.ok(m.odds.y>=m.frame.bottom-.5,'the Odds row follows the whole raster frame '+JSON.stringify(m));
  await page.screenshot({path:output+'/v270-landscape-odds2-'+width+'x'+height+'.png'});
 }
 await fit(1366,750);
 await page.locator('.dgb-cell[data-cell-id="'+initialFree+'"]').click();assert.equal(await page.evaluate(()=>document.querySelector('.dgb-pay-odds').hidden),true);
 await page.evaluate(()=>qa269.six());
 report.reach=await page.evaluate(()=>({two:qa269.cell(6,2).classList.contains('reach'),three:qa269.cell(6,3).classList.contains('reach'),oneCurrent:qa269.cell(6,1).classList.contains('current'),label:getComputedStyle(qa269.cell(6,2),'::after').content,animation:getComputedStyle(qa269.cell(6,2)).animationName,earnedAnimation:getComputedStyle(qa269.cell(6,1)).animationName,hitLabelPosition:DangoBingoView.describeAssets().last.main.hitLabelPosition,sparkleCells:DangoBingoView.describeAssets().last.main.sparkleCells,style:DangoBingoView.describeAssets().last.main.reachStyle,railVisible:!document.querySelector('.dgb-free-rail').hidden}));
 assert.equal(report.reach.two,true);assert.equal(report.reach.three,false);assert.equal(report.reach.oneCurrent,true);assert.match(report.reach.label,/リーチ!/);assert.match(report.reach.animation,/dgb-next-ball-reach/);assert.equal(report.reach.earnedAnimation,'none');assert.equal(report.reach.hitLabelPosition,'number-overlay');assert.ok(report.reach.sparkleCells>=6);assert.equal(report.reach.railVisible,false);
 report.sharedReach=await page.evaluate(()=>{
  const state=qa269.state,before=JSON.stringify(state),cells=state.cells.filter(cell=>cell.number>0&&!cell.hit).slice(0,4);
  if(cells.length!==4)throw Error('Expected four untouched cells for the reach-style probe');
  const hits=cells.map((cell,tier)=>({n:cell.number,gainHundredths:100,gain:100,tier,allClear:tier===3}));
  // These forecast-only options never change a game, draw, BET, or payout.
  qa269.render({reach:hits});
  const g=DangoBingoView.geometry(document.querySelector('.dgb-pan').clientWidth,document.querySelector('.dgb-pan').clientHeight,{state});
  const shown=[...document.querySelectorAll('.dgb-reach-layer .six-reach-cell')].map(el=>{
   const tier=+el.dataset.tier,cell=state.cells.find(cell=>cell.number===+el.dataset.number),point=g.centers[cell.id],orbit=el.querySelector('.reach-orbit'),expected=document.createElement('span');
   if(tier===1||tier===2)expected.innerHTML=sixDropReachCometMarkup(tier);
   return {tier,nativeCircleClass:el.classList.contains('six-reach-cell'),glints:el.querySelectorAll('.reach-glints i').length,caption:el.querySelector('.tile-reach').textContent,alternating:el.querySelector('.tile-reach').classList.contains('alternating'),nativeComet:orbit?orbit.innerHTML===expected.innerHTML:null,perimeter:el.querySelectorAll('.allclear-reach-perimeter circle').length,transparentPerimeter:[...el.querySelectorAll('.allclear-reach-perimeter circle')].every(circle=>getComputedStyle(circle).fill==='none'),captionSize:parseFloat(getComputedStyle(el.querySelector('.tile-reach')).fontSize),dx:parseFloat(el.style.left)+parseFloat(el.style.width)/2-point.x,dy:parseFloat(el.style.top)+parseFloat(el.style.height)/2-point.y};
  });
  qa269.render({reach:hits,paused:true});const paused=[...document.querySelectorAll('.dgb-reach-layer .reach-comet circle,.dgb-reach-layer .perimeter-core')].every(el=>getComputedStyle(el).animationPlayState==='paused');
  qa269.render({reach:hits,reducedMotion:true});const reduced=[...document.querySelectorAll('.dgb-reach-layer .reach-comet circle,.dgb-reach-layer .perimeter-core')].every(el=>getComputedStyle(el).animationName==='none');
  const result={shown,paused,reduced,payoutSvgCount:document.querySelectorAll('.dgb-pay svg').length,stateUnchanged:before===JSON.stringify(state),style:qa269.view.describe().reachPresentation.style};
  qa269.render();return result;
 });
 assert.equal(report.sharedReach.style,'six-drop');assert.equal(report.sharedReach.stateUnchanged,true);assert.equal(report.sharedReach.payoutSvgCount,0);assert.equal(report.sharedReach.paused,true);assert.equal(report.sharedReach.reduced,true);
 assert.deepEqual(report.sharedReach.shown.map(item=>item.tier),[0,1,2,3]);
 for(const hit of report.sharedReach.shown){assert.equal(hit.nativeCircleClass,true);assert.equal(hit.glints,3);assert.equal(hit.alternating,hit.tier>0);assert.ok(Math.abs(hit.dx)<.01&&Math.abs(hit.dy)<.01,'shared reach tracks the drawn dango center');assert.ok(hit.captionSize>0);if(hit.tier===1||hit.tier===2)assert.equal(hit.nativeComet,true,'native Six Drop comet markup');if(hit.tier===3){assert.equal(hit.perimeter,3);assert.equal(hit.transparentPerimeter,true);assert.equal(hit.caption,'リーチ最高役');}}
 await page.screenshot({path:output+'/v269-next-ball-reach-desktop.png'});
 await page.evaluate(()=>{qa269.state=qa269.R.draw(qa269.state,qa269.state.numbers[20]);qa269.render();});
 report.get=await page.evaluate(()=>({two:qa269.cell(6,2).className,three:qa269.cell(6,3).className,label:getComputedStyle(qa269.cell(6,2),'::after').content,value:qa269.cell(6,2).textContent}));
 assert.match(report.get.two,/current/);assert.ok(!report.get.two.includes('reach'));assert.match(report.get.three,/reach/);assert.match(report.get.label,/GET!/);assert.equal(report.get.value,'3000');
 for(const [width,height]of viewports){const m=await fit(width,height);report.screens.push(m);checkLayout(m);await page.screenshot({path:output+'/v269-get-and-reach-'+width+'x'+height+'.png'});}
 const beforeLargeBet=await page.evaluate(()=>qa269.measure());
 await page.evaluate(()=>{qa269.bet=1000000000;qa269.render();});
 report.largeBetLayout=await page.evaluate(()=>qa269.measure());checkLayout(report.largeBetLayout);
 report.longNumbers=await page.evaluate(()=>[...document.querySelectorAll('.dgb-pay td .gold-number')].map(e=>{const r=e.getBoundingClientRect(),c=e.parentElement.getBoundingClientRect();return {text:e.textContent,scale:+e.dataset.horizontalScale,font:parseFloat(getComputedStyle(e).fontSize),width:r.width,cell:c.width,dx:(r.left+r.right-c.left-c.right)/2,dy:(r.top+r.bottom-c.top-c.bottom)/2};}));
 assert.ok(report.longNumbers.some(n=>n.scale<.9));assert.ok(report.longNumbers.every((n,i)=>Math.abs(n.font-beforeLargeBet.numerals[i].font)<.02&&n.width<=n.cell+1&&Math.abs(n.dx)<.75&&Math.abs(n.dy)<.75),'large BET compresses only horizontally; numeral height and centering stay unchanged');await page.screenshot({path:output+'/v269-long-numbers-320x270.png'});
 report.final=await page.evaluate(()=>{
  qa269.bet=100;qa269.state=qa269.R.draw(qa269.state,qa269.state.numbers[26]);const before=JSON.stringify(qa269.state),payout=qa269.R.payout(qa269.state);
  qa269.render({reach:[]});const visual=qa269.R.presentationReaches(qa269.state),draw=DangoBingoView.describeAssets().last.main;
  return {phase:qa269.state.phase,count:qa269.state.draws.length,ordinary:qa269.R.reaches(qa269.state).length,visual:visual.length,allVisual:visual.every(hit=>hit.visualOnly&&hit.afterFinal),painted:draw.reachCount,shared:qa269.view.describe().reachPresentation,afterFinal:draw.afterFinalReach,payoutUnchanged:payout===qa269.R.payout(qa269.state),unchanged:before===JSON.stringify(qa269.state),threeOneReach:qa269.cell(3,1).classList.contains('reach'),sixThreeGet:qa269.cell(6,3).classList.contains('current'),railVisible:!document.querySelector('.dgb-free-rail').hidden};
 });
 assert.equal(report.final.phase,'done');assert.equal(report.final.count,8);assert.equal(report.final.ordinary,0);assert.ok(report.final.visual>0);assert.equal(report.final.allVisual,true);assert.equal(report.final.painted,report.final.visual);assert.equal(report.final.afterFinal,true);assert.equal(report.final.shared.style,'six-drop');assert.equal(report.final.shared.afterFinal,true);assert.equal(report.final.shared.count,report.final.visual);assert.equal(report.final.payoutUnchanged,true);assert.equal(report.final.unchanged,true);assert.equal(report.final.threeOneReach,true);assert.equal(report.final.sixThreeGet,true);assert.equal(report.final.railVisible,false);
 await fit(390,300);await page.screenshot({path:output+'/v269-final-board-390x300.png'});
 // Fixed CSS minima must not shift the canvas relative to pointer targets on retina screens.
 const retina=await browser.newPage({viewport:{width:320,height:270},deviceScaleFactor:2});await setup(retina);
 await retina.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));report.retina=await retina.evaluate(()=>qa269.measure());checkLayout(report.retina,{rail:true});await retina.screenshot({path:output+'/v269-retina-320x270.png'});await retina.close();
 // A restored prior-version board keeps its own presentation and highest roles.
 await page.evaluate(()=>{qa269.state=qa269.R.create({rulesRevision:266,moldIndex:0});qa269.render();});assert.equal(await page.evaluate(()=>qa269.view.describe().highestCells.some(x=>x.length===3&&x.count===3)),true);
 await page.evaluate(()=>qa269.new());assert.equal(await page.evaluate(()=>qa269.view.describe().highestCells.length),6);
 assert.deepEqual(report.errors,[]);report.success=true;
 console.log('DANGO_V269_VIEW_PASS',JSON.stringify({highest:report.initial.highest,reach:report.reach,get:report.get,final:report.final,viewports:report.screens.length,errors:report.errors}));
}catch(error){report.failure=String(error.stack||error);if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});throw error;}
finally{await fs.writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
