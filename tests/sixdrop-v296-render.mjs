/* Isolated real-canvas artwork verification, not a browser/gameplay test.
 * Runs the unmodified native semantic function, shared badge sizing function,
 * SixDropAwardV296 and SixDropArtV296 against actual PNG/WebP pixels. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createCanvas,Image,GlobalFonts} from '@napi-rs/canvas';
const {R,NUMBERS,clone}=createRequire(import.meta.url)('./sixdrop-v283-fixture.cjs');
const root=process.cwd(),out=path.resolve(root,'qa-sixdrop-v296');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'native-render-report.json'),JSON.stringify({ok:false,status:'Verification has started but has not completed.',scope:'Isolated native artwork renderer; not browser or full gameplay verification.'},null,2)+'\n');
const moduleFile='assets/sixdrop-award-v296.js',artFile='assets/sixdrop-art-v296.js',ownerFile='assets/award-presentation-v277.js';
const moduleCode=fs.readFileSync(moduleFile,'utf8'),artCode=fs.readFileSync(artFile,'utf8'),ownerCode=fs.readFileSync(ownerFile,'utf8');
const beforeRecord=ownerCode.indexOf('function recordFor(slot)'),badgeStart=ownerCode.indexOf('function paintGameBadge('),badgeEnd=ownerCode.indexOf('function paintBadge(',badgeStart);
assert(beforeRecord>0&&badgeStart>beforeRecord&&badgeEnd>badgeStart,'actual production semantic and badge functions found');
const ownerSlice=ownerCode.slice(0,beforeRecord)+ownerCode.slice(badgeStart,badgeEnd)+'\nwindow.__semantic296=semantic;window.__badge296=paintGameBadge;\n})();';
const assetPaths=['bottle','payouts','candy-pieces','award-line','award-triangle','award-hexagon','award-allclear','award-digits'].map(name=>'assets/sixdrop-art-v296/'+name+'.webp');
const missing=assetPaths.filter(file=>!fs.existsSync(file));assert.deepEqual(missing,[],'finish actual generated artwork before running renderer verification');
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'Noto Sans JP');
const media={matches:false},sourcePaths=new WeakMap(),traces=new WeakMap(),sources=new WeakMap();
const plain=value=>JSON.parse(JSON.stringify(value));
function deepFreeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item);}return value;}
function freshTrace(){return {images:[],digitRects:[],texts:[],textMetrics:[]};}
function transformedBounds(ctx,left,top,right,bottom){
 const m=ctx.getTransform(),points=[[left,top],[right,top],[left,bottom],[right,bottom]].map(([x,y])=>({x:x*m.a+y*m.c+m.e,y:x*m.b+y*m.d+m.f}));
 return {left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y))};
}
function trackedCanvas(width=300,height=150){
 const canvas=createCanvas(width,height),ctx=canvas.getContext('2d'),trace=freshTrace();traces.set(canvas,trace);sources.set(canvas,new Set());
 const nativeDraw=ctx.drawImage.bind(ctx),nativeFill=ctx.fillText.bind(ctx);
 ctx.drawImage=function(image,...args){
  const result=nativeDraw(image,...args),file=sourcePaths.get(image),inherited=sources.get(image);
  if(file){
   const [x,y,w,h]=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],image.naturalWidth||image.width,image.naturalHeight||image.height];
   sources.get(canvas).add(file);trace.images.push({file,args:[...args],bounds:transformedBounds(ctx,x,y,x+w,y+h)});if(file.endsWith('/award-digits.webp')&&args.length===8)trace.digitRects.push(args.slice(0,4));
  }
  if(inherited)for(const item of inherited)sources.get(canvas).add(item);
  return result;
 };
 ctx.fillText=function(text,...args){
  const value=String(text),metrics=ctx.measureText(value),size=Number(ctx.font.match(/([\d.]+)px/)?.[1]);
  const x=args[0]||0,y=args[1]||0,bounds=transformedBounds(ctx,x-metrics.actualBoundingBoxLeft,y-metrics.actualBoundingBoxAscent,x+metrics.actualBoundingBoxRight,y+metrics.actualBoundingBoxDescent);
  trace.texts.push(value);trace.textMetrics.push({text:value,font:ctx.font,size,width:metrics.width,ascent:metrics.fontBoundingBoxAscent,descent:metrics.fontBoundingBoxDescent,bounds});
  return nativeFill(value,...args);
 };
 return canvas;
}
class LocalImage extends Image{
 set src(value){const file=String(value).split('?')[0];assert(assetPaths.includes(file),'renderer only reads its known local assets');sourcePaths.set(this,file);super.src=fs.readFileSync(path.resolve(root,file));}
 get src(){return sourcePaths.get(this)||'';}
}
const window={SweetsLineup:{ids:['cookie','choco','candy'],chosen:['candy']}};
const document={createElement(tag){assert.equal(tag,'canvas');return trackedCanvas();},fonts:{ready:Promise.resolve()},documentElement:{classList:{add(){}}},body:{classList:{add(){}}}};
const context=vm.createContext({window,document,Image:LocalImage,location:{search:''},URLSearchParams,console,app:{locked:[0,0,3000]},matchMedia:()=>media,Math,Promise});
vm.runInContext(ownerSlice,context,{filename:ownerFile+'#native-semantic-and-badge'});
vm.runInContext(artCode,context,{filename:artFile});vm.runInContext(moduleCode,context,{filename:moduleFile});
assert.deepEqual(await Promise.all([window.SixDropArtV296.ready,window.SixDropAwardV296.ready]),[true,true]);
const api=window.SixDropAwardV296;let diagnostic=plain(api.describe());assert(diagnostic.loaded&&diagnostic.digitsReady);assert.deepEqual(diagnostic.errors,[]);
const definitions={line:{seed:1,ball:2},triangle:{seed:1,ball:2},hexagon:{seed:21,ball:5},allclear:{seed:2,ball:7}};
function eventKind(ev){if(ev.phase==='pyramidAllClear')return 'allclear';if(ev.phase!=='pyramidAward'||!ev.forms?.length)return null;return ev.forms.some(f=>f.type==='hexagon')?'hexagon':ev.forms.some(f=>f.type==='triangle')?'triangle':'line';}
function witness(role,bet){
 const {seed,ball}=definitions[role],prior={version:247,bankUnits:99999900,removed:99,feed:450,roundId:'native-render-prior'};
 const prefix=carry=>{let s=R.newGame({seed,bet,rate:90,carry,rulesRevision:R.CURRENT_REVISION});for(let i=0;i<ball;i++)s=R.hit(s,NUMBERS[i],{trace:true}).state;return s;};
 const sample=prefix(prior),carry={...prior,bankUnits:99999000-(sample.bankUnits-prior.bankUnits)},before=prefix(carry),plan=R.hit(before,NUMBERS[ball],{trace:true});
 const native=plan.timeline.find(ev=>eventKind(ev)===role);assert(native&&native.winMedals>0);
 const slot={i:2,engine:{kind:'candy',state:clone(plan.state),rows:10,roundBet:bet}},event={numbers:[NUMBERS[ball]],...clone(native)},frozenBefore=JSON.stringify({slot,event});
 context.app.locked[2]=bet;const cue=window.__semantic296(slot,event,{});assert.equal(JSON.stringify({slot,event}),frozenBefore,'native cue extraction never mutates rule result');
 assert.equal(cue.win,native.winMedals);assert.equal(cue.game,'candy');assert.equal(cue.phase,native.phase);
 return {role,seed,ball:ball+1,number:NUMBERS[ball],bet,before,after:plan.state,native, cue:plain(cue)};
}
const cases=[
 {id:'line-main',role:'line',bet:3000,width:318,height:318},
 {id:'triangle-main',role:'triangle',bet:3000,width:318,height:318},
 {id:'hexagon-main',role:'hexagon',bet:3000,width:318,height:318},
 {id:'allclear-main',role:'allclear',bet:3000,width:318,height:318},
 {id:'allclear-large-win',role:'allclear',bet:300000,width:318,height:318},
 {id:'allclear-mini-116',role:'allclear',bet:3000,width:116,height:116,mini:true},
 {id:'allclear-mini-47',role:'allclear',bet:3000,width:47,height:47,mini:true},
 {id:'allclear-reduced',role:'allclear',bet:300000,width:318,height:318,reduced:true}
];
const report={scope:'ISOLATED REAL-CANVAS ARTWORK ONLY. Actual native semantic function + shared badge sizing + actual raster renderer. Browser layout, full gameplay, scheduling, audio and deployment are not verified here.',rulesRevision:R.CURRENT_REVISION,files:Object.fromEntries([moduleFile,artFile,ownerFile,...assetPaths].map(file=>[file,{bytes:fs.statSync(file).size,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}])),font:fs.existsSync(font)?font:'system fallback',cases:[],errors:[]};
const renders=[];
for(const spec of cases){
 const w=witness(spec.role,spec.bet),cue=deepFreeze({...w.cue,age:900,duration:3100,serial:1}),before=JSON.stringify(cue),canvas=trackedCanvas(spec.width*2,spec.height*2),ctx=canvas.getContext('2d');
 ctx.scale(2,2);media.matches=!!spec.reduced;const glints=window.__badge296(ctx,{},cue,spec.width,spec.height,!!spec.mini,0,0);assert.equal(JSON.stringify(cue),before,'painting preserves immutable native cue');
 const d=plain(api.describe()),trace=traces.get(canvas),expectedGlyphs=[...Number(w.native.winMedals).toLocaleString('ja-JP'),'WIN'];
 assert.equal(d.last.win,w.native.winMedals);assert.equal(d.last.role,spec.role);assert.equal(d.last.label,cue.label);assert.equal(d.last.detail,cue.detail);assert.equal(d.last.mini,!!spec.mini);
 assert(d.last.rasterNumbers);assert.equal(d.fallbackAmounts,0);assert.deepEqual(d.last.glyphs,expectedGlyphs);
 assert.deepEqual(trace.digitRects,expectedGlyphs.map(char=>d.glyphRects[char]),'actual source rectangles and draw order spell the exact native WIN');
 assert(sources.get(canvas).has('assets/sixdrop-art-v296/award-'+spec.role+'.webp'));assert(sources.get(canvas).has('assets/sixdrop-art-v296/award-digits.webp'));
 const formNames={line:'直線',triangle:'トライアングル',hexagon:'ヘキサゴン'},counts=Object.fromEntries(Object.keys(formNames).map(role=>[role,(w.native.forms||[]).filter(form=>form.type===role).length]));
 const expectedLiveLabel=spec.role==='allclear'?'全消し '+w.native.allClears+'回目！':Object.keys(formNames).filter(role=>counts[role]>0).map(role=>formNames[role]+' ×'+counts[role]).join(' ・ ');
 assert.equal(d.last.liveLabel,expectedLiveLabel,'visible count comes from the actual native event');assert(trace.texts.includes(expectedLiveLabel),'the variable native role count is actually painted');
 for(const metrics of trace.textMetrics)assert(Number.isFinite(metrics.size)&&metrics.size>0&&metrics.ascent+metrics.descent>0&&metrics.ascent+metrics.descent<metrics.size*2.5,'native Canvas correctly interprets font weight and size: '+JSON.stringify(metrics));
 const numberImages=trace.images.filter(item=>item.file.endsWith('/award-digits.webp')),amountBounds={left:Math.min(...numberImages.map(item=>item.bounds.left)),top:Math.min(...numberImages.map(item=>item.bounds.top)),right:Math.max(...numberImages.map(item=>item.bounds.right)),bottom:Math.max(...numberImages.map(item=>item.bounds.bottom))};
 assert(amountBounds.left>=0&&amountBounds.right<=canvas.width&&amountBounds.top>=0&&amountBounds.bottom<=canvas.height,'every complete numeral and WIN fits inside the real surface');
 for(const metrics of trace.textMetrics)assert(metrics.bounds.bottom<=amountBounds.top,'live count/caption never overlaps the generated amount: '+JSON.stringify({metrics,amountBounds}));
 assert.equal(glints,spec.reduced?0:spec.mini?2:6,'reduced motion removes animated glints');
 const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let opaque=0,minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>24){opaque++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 assert(opaque>canvas.width*canvas.height*.05,'substantial actual raster pixels were painted');assert(minX>=0&&maxX<canvas.width&&minY>=0&&maxY<canvas.height);
 const filename=spec.id+'-native.png';fs.writeFileSync(path.join(out,filename),canvas.toBuffer('image/png'));
 const row={...spec,fixture:{seed:w.seed,ball:w.ball,number:w.number,bet:w.bet,win:w.native.winMedals,forms:w.native.forms?.map(f=>f.type)||[],allClears:w.native.allClears},cue:plain(cue),liveLabel:d.last.liveLabel,winText:d.last.winText,glyphs:expectedGlyphs,sourceRects:trace.digitRects,texts:trace.texts,textMetrics:trace.textMetrics,amountBounds,animatedGlints:glints,sources:[...sources.get(canvas)],pixels:{opaque,bounds:[minX,minY,maxX,maxY]},image:filename};report.cases.push(row);renders.push({spec,row,canvas});
 console.log('SIXDROP_V296_NATIVE_RENDER_PASS',spec.id,w.native.winMedals);
}
// Check all generated glyph bounds independently of the visible sample values.
const digitImage=new LocalImage();digitImage.src='assets/sixdrop-art-v296/award-digits.webp';await digitImage.decode();
for(const [name,rect]of Object.entries(diagnostic.glyphRects)){const [x,y,w,h]=rect;assert(w>0&&h>0&&x>=0&&y>=0&&x+w<=digitImage.naturalWidth&&y+h<=digitImage.naturalHeight,name+' stays inside its actual generated atlas');}
report.glyphRects=diagnostic.glyphRects;
// Each registered glyph gets its own preview so packing bleed or a clipped
// comma/WIN cannot hide behind the successful numeric provenance checks.
const glyphOrder=['0','1','2','3','4','5','6','7','8','9',',','WIN'],glyphSheet=createCanvas(1120,660),gx=glyphSheet.getContext('2d');
gx.fillStyle='#21142d';gx.fillRect(0,0,glyphSheet.width,glyphSheet.height);gx.fillStyle='#fff1d0';gx.font='bold 22px "Noto Sans JP"';gx.fillText('実際に登録された数字・区切り・WIN の切り出し',24,34);
for(let index=0;index<glyphOrder.length;index++){
 const name=glyphOrder[index],[sx,sy,sw,sh]=diagnostic.glyphRects[name],x=(index%4)*280,y=58+Math.floor(index/4)*192,fit=Math.min(220/sw,132/sh);
 gx.fillStyle='#39223e';gx.fillRect(x+12,y,256,176);gx.drawImage(digitImage,sx,sy,sw,sh,x+140-sw*fit/2,y+12+(132-sh*fit)/2,sw*fit,sh*fit);
 gx.fillStyle='#ecd5ea';gx.font='15px "Noto Sans JP"';gx.fillText(name+'  ['+[sx,sy,sw,sh].join(', ')+']',x+24,y+154);
}
gx.fillStyle='#bca0c5';gx.font='13px "Noto Sans JP"';gx.fillText('画像の実際のアルファ境界から登録。目視で別のセルの混入と文字の欠けを確認します。',24,646);
fs.writeFileSync(path.join(out,'native-digit-glyphs.png'),glyphSheet.toBuffer('image/png'));
const names={line:'直線',triangle:'トライアングル',hexagon:'ヘキサゴン',allclear:'全消し'};
const sheet=createCanvas(1344,1260),sx=sheet.getContext('2d');sx.fillStyle='#171021';sx.fillRect(0,0,sheet.width,sheet.height);sx.textBaseline='top';
for(let i=0;i<renders.length;i++){
 const {spec,row,canvas}=renders[i],x=(i%3)*448,y=Math.floor(i/3)*420;sx.fillStyle='#2b173a';sx.fillRect(x+12,y+12,424,396);sx.fillStyle='#fff1cf';sx.font='bold 19px "Noto Sans JP"';sx.fillText(names[spec.role]+(spec.mini?' / ミニ '+spec.width+'px':spec.reduced?' / 動きを減らす':spec.bet===300000?' / 高額WIN':''),x+28,y+25);
 sx.fillStyle='#d9bfdc';sx.font='13px "Noto Sans JP"';sx.fillText(row.fixture.win.toLocaleString('ja-JP')+' WIN  ·  実ルールの成立結果',x+28,y+54);
 const display=spec.mini?spec.width:318;sx.drawImage(canvas,x+(448-display)/2,y+84+(300-display)/2,display,display);
 if(spec.mini){sx.fillStyle='#b59cbc';sx.font='12px "Noto Sans JP"';sx.fillText('元の描画サイズ（拡大なし）',x+28,y+370);}
}
sx.fillStyle='#c3a9c9';sx.font='14px "Noto Sans JP"';sx.fillText('アート描画プレビュー — 実際の描画コードを使用。ブラウザーやゲーム全体の動作検証とは別です。',28,1230);
fs.writeFileSync(path.join(out,'native-render-contact.png'),sheet.toBuffer('image/png'));
const pieceSheet=createCanvas(990,430),px=pieceSheet.getContext('2d');px.fillStyle='#21142d';px.fillRect(0,0,990,430);px.fillStyle='#fff1d0';px.font='bold 22px "Noto Sans JP"';px.fillText('シックスドロップ / 新しい9色のキャンディ',28,36);
const artApi=window.SixDropArtV296,pieceReport=[];
for(let i=0;i<9;i++){
 const sprite=artApi.sprite(i);assert(sprite&&sprite.width===128&&sprite.height===128);const origin=sources.get(sprite);assert(origin?.has('assets/sixdrop-art-v296/candy-pieces.webp'),'actual cached candy comes from new raster sheet');
 px.drawImage(sprite,35+i*106,65,88,88);px.fillStyle='#e5d4e9';px.font='14px "Noto Sans JP"';px.fillText(artApi.describe().colors[i],42+i*106,176);
 // Native piece diameter:29.5px; show both art and live-size sample.
 px.drawImage(sprite,64+i*106,224,29.5,29.5);px.fillStyle='#b79bbf';px.font='12px "Noto Sans JP"';px.fillText('29.5px',55+i*106,282);
 pieceReport.push({index:i,name:artApi.describe().colors[i],sources:[...origin],width:sprite.width,height:sprite.height});
}
px.fillStyle='#bca0c5';px.font='14px "Noto Sans JP"';px.fillText('上段は素材の拡大表示、下段は通常のドロップ描画径。番号はゲーム側で別に描画します。',28,352);
fs.writeFileSync(path.join(out,'native-candy-pieces.png'),pieceSheet.toBuffer('image/png'));report.candyPieces=pieceReport;
report.renderer=plain(api.describe());report.art=plain(artApi.describe());report.ok=true;
const embedded=Object.fromEntries(assetPaths.map(file=>[file,'data:image/webp;base64,'+fs.readFileSync(file).toString('base64')]));
const scriptSafe=s=>s.replace(/<\/script/gi,'<\\/script');
const review=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>シックスドロップ — アート描画プレビュー</title><style>body{margin:0;background:#15101d;color:#faebd4;font:15px/1.7 system-ui,sans-serif}main{max-width:1050px;margin:0 auto;padding:28px}h1{font-size:25px;margin:0 0 8px}p{color:#cdb7d2;max-width:850px}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0}button{border:1px solid #755171;background:#39243d;color:#faedd7;border-radius:12px;padding:10px 15px;font:inherit;cursor:pointer}button[aria-pressed=true]{background:#794164;border-color:#f5c98d}section{display:grid;grid-template-columns:minmax(360px,430px) 1fr;gap:26px;align-items:start}.stage{height:390px;background:#2a1737;border-radius:20px;display:grid;place-items:center;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px #6e4268}.stage canvas{display:block;max-width:100%}.info{background:#22172d;border-radius:16px;padding:20px}.info h2{margin:0;font-size:21px}.amount{font-size:30px;color:#ffe19d}.facts{white-space:pre-line;color:#d4bbd8}small{color:#ad91b5}.palette{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}.palette canvas{width:64px;height:64px}.foot{font-size:12px;color:#9c82a5;margin-top:24px}@media(max-width:760px){main{padding:18px}section{grid-template-columns:1fr}.stage{max-width:430px}} </style><main><h1>シックスドロップ — アート描画プレビュー</h1><p>実際のルールで成立した役と配当を、ゲームと同じ描画関数で表示します。これは素材・文字・数字の描画を確認するプレビューです。画面全体のレイアウト、操作、進行、音声のブラウザー動作確認は含みません。</p><nav class="tabs" id="choices"></nav><section><div class="stage"><canvas id="preview"></canvas></div><aside class="info"><h2 id="label">読み込み中</h2><div class="amount" id="amount"></div><div class="facts" id="facts"></div><button id="replay">演出を再生</button><p><small>役名の大きな文字と金色の数字は生成画像を使用。成立個数と配当は、実際の成立結果に追従します。</small></p></aside></section><div class="palette" id="palette"></div><p class="foot">オフラインで開ける描画確認用ファイルです。サーバー通信・ゲーム結果の送信は行いません。</p></main><script>const embeddedAssets=${JSON.stringify(embedded)};const NativeImage=window.Image;window.Image=class extends NativeImage{set src(value){super.src=embeddedAssets[String(value).split('?')[0]]||value;}get src(){return super.src;}};window.SweetsLineup={ids:['cookie','choco','candy'],chosen:['candy']};const app={locked:[0,0,3000]};</script><script>${scriptSafe(artCode)}</script><script>${scriptSafe(moduleCode)}</script><script>${scriptSafe(ownerSlice)}</script><script>const samples=${JSON.stringify(report.cases.filter(row=>!row.reduced).map(row=>({id:row.id,role:row.role,width:row.width,height:row.height,mini:!!row.mini,reduced:!!row.reduced,cue:row.cue,fixture:row.fixture,liveLabel:row.liveLabel})))};const names=${JSON.stringify(names)};let selected=0,frame=0,started=0;const canvas=document.getElementById('preview'),ctx=canvas.getContext('2d');function draw(age){const s=samples[selected],dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==s.width*dpr||canvas.height!==s.height*dpr){canvas.width=s.width*dpr;canvas.height=s.height*dpr;}canvas.style.width=s.width+'px';canvas.style.height=s.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,s.width,s.height);window.__badge296(ctx,{},Object.freeze({...s.cue,age,duration:3100}),s.width,s.height,s.mini,0,0);}function choose(i){cancelAnimationFrame(frame);selected=i;const s=samples[i];document.querySelectorAll('#choices button').forEach((b,k)=>b.setAttribute('aria-pressed',String(k===i)));document.getElementById('label').textContent=names[s.role]+(s.mini?' / ミニ '+s.width+'px':'');document.getElementById('amount').textContent=s.fixture.win.toLocaleString('ja-JP')+' WIN';document.getElementById('facts').textContent=s.liveLabel+'\\n'+s.fixture.ball+'球目・'+s.fixture.number+'番へのHIT\\n'+s.fixture.bet.toLocaleString('ja-JP')+' BET';draw(900);}document.getElementById('replay').onclick=()=>{cancelAnimationFrame(frame);started=performance.now();function tick(now){const age=now-started;draw(age<2900?age:900);if(age<2900)frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);};Promise.all([SixDropArtV296.ready,SixDropAwardV296.ready]).then(values=>{if(!values.every(Boolean))throw Error('画像を読み込めませんでした');samples.forEach((s,i)=>{const b=document.createElement('button');b.textContent=names[s.role]+(s.mini?' '+s.width+'px':s.id.includes('large')?' 高額':s.reduced?' 静止':'');b.setAttribute('aria-pressed','false');b.onclick=()=>choose(i);document.getElementById('choices').append(b);});for(let i=0;i<9;i++){const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(SixDropArtV296.sprite(i),0,0);c.title=SixDropArtV296.describe().colors[i];document.getElementById('palette').append(c);}choose(0);}).catch(e=>document.getElementById('label').textContent=e.message);</script></html>`;
const reviewScripts=[...review.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(reviewScripts.length,5,'standalone artwork preview contains exactly its five inline scripts');
for(let i=0;i<reviewScripts.length;i++)new vm.Script(reviewScripts[i][1],{filename:'sixdrop-artwork-review.html#script'+i});
report.review={file:'sixdrop-artwork-review.html',bytes:Buffer.byteLength(review),inlineScriptsCompile:true,inlineScripts:reviewScripts.length,browserVerified:false};
fs.writeFileSync(path.join(out,'sixdrop-artwork-review.html'),review);
fs.writeFileSync(path.join(out,'native-render-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('SIXDROP_V296_NATIVE_RENDER_REPORT',path.join(out,'native-render-report.json'));
