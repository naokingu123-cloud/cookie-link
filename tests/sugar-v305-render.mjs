/* Actual generated assets and production Canvas helpers, composited on dark
 * plum. These are material/amount previews, not browser screenshots. The full
 * DOM, CSS and input tests run separately in sugar-v305-browser.mjs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createCanvas,Image} from '@napi-rs/canvas';

const out=path.resolve(process.env.SWEETS_QA_OUTPUT_DIR||'qa-sugar-v305');fs.mkdirSync(out,{recursive:true});
const read=file=>fs.readFileSync(file,'utf8'),plain=value=>JSON.parse(JSON.stringify(value)),sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report={ok:false,scope:'Production SugarArtV305 crops and SugarAwardV305 amount/number methods on native Canvas, plus exact production acceptance logic with rule-derived snapshots. Dark alpha composition is intentional. DOM/CSS geometry and real inputs are separate browser gates.',assets:[],glyphs:[],numbers:[],awards:[],furniture:[],screens:[]};
const hashes={
 'assets/sugar-challenge-rules-v254.js':'1e4025d82dd8c96559aaf1b2b07cf1601122f784bd52353c5dd6689387eb4f22',
 'assets/local-sugar-v267.js':'9bcfed03f5c0cb83e80ee9114ad6d3a79939bfef8f2c12ee0fc3b7008e01d1b6',
 'server-sugar-challenge-v254.mjs':'5dd63eacbc6bec96b42dc0586f4fe7bd8aaed25744befcac4a2960794f65acfc'
};
const opaque={1:'a49b2da1409b0bc1ef990f68d62d8fcc5f3cb568791526293492da28f5b6e57e',2:'b37f485aa7f94579aaf823965bc8cdd8a8314c1eeffedfcf43b0bcec52ba7330',3:'28b90d47d644d94be7f59349d9d62f567f146b068596793e20b8ac83c7226f6c',4:'db5cd2ef6846ac8deb820b6243f93af5dc970e493b61d63e4b8583cbc1c12f42',5:'d2b4fb982ddd0185253a585e0db71df2323dd8b0a0f09d18cbc7f2437bfecae3',10:'971907c8c2cbf2d91171328a636307ad52631bc5e03cfef9f3058dacc5b77be4'};
const transparent={1:'d7f9121ff202284eafad8c861f0510c2bbce645c9b84934b58dc352a37dc0f5f',2:'7810781c4734453382907beadc07ca1563ff550e9766f091534653fb0dc5f065',3:'4144c1ad9dfa80daa9402966ce18cca8469af590f61b634f25ad6e1c3b15c22a',4:'043610a9a4b83a64c313bb7ab86bf1f53fa2a41a09778600d05a99917741677d',5:'553597707850d5ccb063cea82bf8422e0a2bcfc0435b8c09c139f413dc31d69d',10:'c0abd23f6cbd35ca59c8f0eb5f5cc67e50e09c939078c107a1e94d9bf583781e'};
for(const [n,hash]of Object.entries(opaque))hashes['assets/sugar-art-v270/multiplier-'+n+'.png']=hash;
for(const [n,hash]of Object.entries(transparent))hashes['assets/sugar-art-v279/multiplier-'+n+'-transparent.png']=hash;
for(const [file,hash]of Object.entries(hashes))assert.equal(sha(file),hash,'protected native authority/original multiplier bytes: '+file);
report.protectedHashes=hashes;
const images=new Map(),files=new WeakMap(),traces=new WeakMap();let allocations=0,readbacks=0,rngCalls=0;
class LocalImage extends Image{
 set src(value){const file=String(value).split('?')[0];assert(file.startsWith('assets/')&&!file.includes('..'));files.set(this,file);images.set(file,this);super.src=fs.readFileSync(file);}
 get src(){return files.get(this);}
}
function canvas(){
 const cv=createCanvas(300,150),ctx=cv.getContext('2d'),ops=[];allocations++;traces.set(cv,ops);
 const draw=ctx.drawImage.bind(ctx),pixels=ctx.getImageData.bind(ctx);
 ctx.drawImage=(image,...args)=>{ops.push({file:files.get(image)||null,args});return draw(image,...args);};
 ctx.getImageData=(...args)=>{readbacks++;return pixels(...args);};return cv;
}
function node(){const classes=new Set();return {dataset:{},style:{setProperty(key,value){this[key]=value;}},classList:{add:name=>classes.add(name),contains:name=>classes.has(name)}};}
const html=node(),sandboxMath=Object.create(Math);sandboxMath.random=()=>{rngCalls++;throw Error('Sugar art sampled RNG');};
const window={},document={documentElement:html,createElement:tag=>{assert.equal(tag,'canvas');return canvas();}};
const context=vm.createContext({window,document,Image:LocalImage,location:{search:''},URLSearchParams,Math:sandboxMath,console});
function pixels(cv){return cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;}
function ink(cv,threshold=24){const data=pixels(cv);let left=cv.width,top=cv.height,right=-1,bottom=-1,count=0;for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++)if(data[(y*cv.width+x)*4+3]>=threshold){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++;}return {left,top,right:right+1,bottom:bottom+1,count};}
function inside(rect,width,height,label){assert.ok(rect.left>=0&&rect.top>=0&&rect.right<=width&&rect.bottom<=height,label+' fits '+JSON.stringify({rect,width,height}));}
function save(cv,name){fs.writeFileSync(path.join(out,name),cv.toBuffer('image/png'));report.screens.push(name);return name;}
function contact(items,name,cols=3,w=400,h=300){
 const cv=createCanvas(cols*w,Math.ceil(items.length/cols)*h),c=cv.getContext('2d');c.fillStyle='#1b0b29';c.fillRect(0,0,cv.width,cv.height);
 items.forEach(({image,label},i)=>{const x=i%cols*w,y=Math.floor(i/cols)*h,k=Math.min((w-20)/image.width,(h-45)/image.height);c.drawImage(image,x+(w-image.width*k)/2,y+8+(h-45-image.height*k)/2,image.width*k,image.height*k);c.fillStyle='#ffe8c7';c.font='15px sans-serif';c.fillText(label,x+10,y+h-14,w-20);});return save(cv,name);
}
async function dataImage(url){const image=new Image();image.src=Buffer.from(url.replace(/^url\("data:image\/png;base64,/, '').replace(/"\)$/, ''),'base64');await image.decode();return image;}
async function originalMultiplier(value){
 // Some native Canvas builds reject caBX (C2PA) ancillary metadata. Ignore
 // that metadata in this decoder input only. Every image-data chunk and the
 // original on-disk file stay byte-identical; Chrome reads the original PNG.
 const raw=fs.readFileSync('assets/sugar-art-v279/multiplier-'+value+'-transparent.png'),parts=[raw.subarray(0,8)];
 for(let offset=8;offset<raw.length;){const size=raw.readUInt32BE(offset),type=raw.toString('ascii',offset+4,offset+8);if(type!=='caBX')parts.push(raw.subarray(offset,offset+size+12));offset+=size+12;}
 const image=new Image();image.src=Buffer.concat(parts);await image.decode();return image;
}
function ruleState(R,{id='native-sugar',jpBase=150000,multiplier=3,draws=[]}={}){let state=R.create({id,roundId:'sugar-v305-qa',station:1,sugarValues:Array(5).fill(jpBase/5),cardId:'standard',multiplier,seed:305});for(const number of draws)state=R.advance(state,number,{roundId:state.roundId,ballIndex:state.draws.length+1});assert(state);return state;}
try{
 const provenance=JSON.parse(read('assets/sugar-art-v305/generation-provenance.json'));assert.equal(provenance.entries.length,8);
 for(const entry of provenance.entries)assert.equal(sha('assets/sugar-art-v305/'+entry.file),entry.sha256,'generated asset provenance '+entry.file);
 for(const file of ['assets/sugar-art-v305.js','assets/sugar-award-v305.js'])vm.runInContext(read(file),context,{filename:file});
 assert.deepEqual(await Promise.all([window.SugarArtV305.ready,window.SugarAwardV305.ready]),[true,true]);
 const A=window.SugarArtV305,W=window.SugarAwardV305;assert.equal(A.loaded,true);assert.equal(W.loaded,true);assert.deepEqual(plain(A.describe().errors),[]);assert.deepEqual(plain(W.describe().errors),[]);
 assert.equal(images.size,8);assert.equal(A.describe().cropCount,4);assert.equal(readbacks,5,'four furniture crops and one digit atlas readback, once at load');
 const assetContact=[];
 for(const entry of provenance.entries){
  const file='assets/sugar-art-v305/'+entry.file,img=images.get(file);assert(img);assert.deepEqual([img.width,img.height],entry.dimensions);
  const cv=createCanvas(img.width,img.height),c=cv.getContext('2d');c.drawImage(img,0,0);const data=pixels(cv);let clear=0,partial=0,opaqueCount=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;else if(data[i]===255)opaqueCount++;else partial++;}
  const corners=[data[3],data[(cv.width-1)*4+3],data[(cv.height-1)*cv.width*4+3],data.at(-1)];
  if(entry.file==='workshop-background.webp')assert.equal(opaqueCount,cv.width*cv.height);else{assert(clear>cv.width*cv.height*.05,'genuine clear outer alpha '+entry.file);assert(corners.every(a=>a<=1),'clean cutout corners '+entry.file);}
  report.assets.push({file,width:img.width,height:img.height,sha256:sha(file),clear,partial,opaque:opaqueCount,corners});assetContact.push({image:img,label:entry.file});
 }
 contact(assetContact,'native-assets-dark.png',3,400,370);
 const furniture=[];
 for(const [i,name]of ['jp','targets','announcement','gauge'].entries()){
  const sprite=A.sprite(name),rect=plain(A.describe().sourceRects[name]),cell={x:i%2*576,y:Math.floor(i/2)*384,w:576,h:384};assert(sprite);assert.equal(rect[2],sprite.width);assert.equal(rect[3],sprite.height);
  assert(rect[0]>=cell.x&&rect[1]>=cell.y&&rect[0]+rect[2]<=cell.x+cell.w&&rect[1]+rect[3]<=cell.y+cell.h,'crop never leaks adjacent furniture');
  const body=ink(sprite,160);assert(body.count>200);assert(body.left<=3&&body.top<=3&&body.right>=sprite.width-3&&body.bottom>=sprite.height-3,'material bound tightly crops low-alpha atlas haze');
  assert.match(html.style['--sugar305-'+name],/^url\("data:image\/png;base64,/);report.furniture.push({name,sourceRect:rect,materialBounds:body});furniture.push({image:sprite,label:name+' | actual production crop'});
 }
 contact(furniture,'native-furniture-dark.png',2,500,240);
 const digitImage=W.image('digits'),glyphs=['0','1','2','3','4','5','6','7','8','9',',','WIN'],glyphContact=[];
 for(const [i,glyph]of glyphs.entries()){
  const rect=plain(W.describe().glyphRects[glyph]),rows=[0,350,690,1024],x0=i%4*384,x1=(i%4+1)*384,y0=rows[Math.floor(i/4)],y1=rows[Math.floor(i/4)+1];
  assert(rect[0]>x0&&rect[1]>y0&&rect[0]+rect[2]<x1&&rect[1]+rect[3]<y1,'glyph stays inside measured clear atlas gutters without truncation or adjacent-row fragments: '+glyph);
  const cv=createCanvas(rect[2],rect[3]);cv.getContext('2d').drawImage(digitImage,...rect,0,0,cv.width,cv.height);const b=ink(cv,32);assert(b.count>100);inside(b,cv.width,cv.height,glyph);report.glyphs.push({glyph,rect,ink:b});glyphContact.push({image:cv,label:glyph});
 }
 contact(glyphContact,'native-glyphs-dark.png',4,240,280);
 const numberContact=[],cases=[{value:0,w:55,h:17},{value:500,w:66,h:18},{value:150000,w:96,h:21},{value:999999900,w:66,h:17},{value:999999999,w:260,h:48},{value:Number.MAX_SAFE_INTEGER,w:350,h:60}];
 for(const {value,w,h}of cases){
  const cv=canvas();cv.width=w*2;cv.height=h*2;const drawn=W.amount(cv.getContext('2d'),value,w,h,(h-1)*2,(w-2)*2);assert(drawn);assert.deepEqual(plain(drawn.glyphs),[...value.toLocaleString('ja-JP')]);
  assert(drawn.width<=(w-2)*2+.001&&drawn.height<=(h-1)*2+.001);const b=ink(cv,32);assert(b.count>0);inside(b,w*2,h*2,'amount '+value);
  const n=node();assert.equal(W.number(n,value,w,h),true);assert.equal(n.dataset.sugarNumber,value+'/'+w+'/'+h);assert(n.classList.contains('sc305-raster-number'));const raster=await dataImage(n.style['--sugar305-number']);assert.equal(raster.width,w*2);assert.equal(raster.height,h*2);
  const rasterCanvas=createCanvas(w*2,h*2);rasterCanvas.getContext('2d').drawImage(raster,0,0);assert.deepEqual(Buffer.from(pixels(rasterCanvas)),Buffer.from(pixels(cv)),'DOM raster equals the actual amount painter');
  report.numbers.push({value,width:w,height:h,glyphs:plain(drawn.glyphs),ink:b});numberContact.push({image:cv,label:value.toLocaleString('ja-JP')+' @ '+w+'×'+h});
 }
 contact(numberContact,'native-money-dark.png',2,600,150);
 const unitCanvas=canvas();unitCanvas.width=700;unitCanvas.height=120;const unit=W.amount(unitCanvas.getContext('2d'),999999900,350,60,110,680,true);assert.deepEqual(plain(unit.glyphs),[...'999,999,900','WIN']);inside(ink(unitCanvas),700,120,'amount with generated WIN');
 vm.runInContext(read('assets/sugar-challenge-rules-v254.js'),context);const R=context.SugarChallengeRulesV254;
 const awardContact=[];
 for(const kind of ['jpc','cash'])for(const width of [320,390,430]){
  const state=ruleState(R,{id:kind+'-'+width,jpBase:4999999500,multiplier:10,draws:kind==='jpc'?[25,24,20,8]:[1,2,3,4,5,6,7,8]}),before=JSON.stringify(state),value=kind==='jpc'?state.jpBase:state.cashWin;assert.equal(state.jpcQualified,kind==='jpc');assert.equal(state.cashWin,kind==='cash'?999999900:0);
  const height=width*2/3,cv=createCanvas(width*2,Math.ceil(height*2)),c=cv.getContext('2d');c.fillStyle='#1b0b29';c.fillRect(0,0,cv.width,cv.height);c.scale(2,2);c.drawImage(W.image(kind),0,0,width,height);
  const [x,y,w,h]=W.layouts[kind].amount.map((v,i)=>v*(i%2?height:width));const numeric=W.amount(c,value,x+w/2,y+h/2,h,w);assert(numeric);assert(numeric.width<=w+.001&&numeric.height<=h+.001);
  if(kind==='jpc'){const image=await originalMultiplier(10);const [mx,my,mw,mh]=W.layouts.jpc.multiplier.map((v,i)=>v*(i%2?height:width)),scale=Math.min(mw/image.width,mh/image.height);c.drawImage(image,mx+(mw-image.width*scale)/2,my+(mh-image.height*scale)/2,image.width*scale,image.height*scale);assert.notEqual(value,state.jpAmount,'JPC number is the unmultiplied base');}
  assert.equal(JSON.stringify(state),before);report.awards.push({kind,width,state:plain(state),drawn:plain(numeric)});awardContact.push({image:cv,label:kind+' '+width+'px | '+value.toLocaleString('ja-JP')});
 }
 contact(awardContact,'native-awards-dark.png',3,450,345);
 // Execute the shipped acceptance body unchanged. Drawing into the UI is a
 // no-op here; current-browser tests cover DOM painting, timers and controls.
 const view=read('assets/sugar-challenge-v254.js'),start=view.indexOf('function restore(raw)'),end=view.indexOf('\nfunction mount()',start);assert(start>0&&end>start);
 const acceptContext=vm.createContext({R,window:{},Date,Number,Set,Map,clone:plain,clamp:(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),worker:true,client:null,app:{wonderBank:[],wonderSteps:0,wonderValue:0,credit:95000,bets:[25,50],draws:[4,7],totalWin:125},stampBank(){}});
 vm.runInContext('let server=null,challenge=null,intro=0,fillSum=0,fromSum=0,fillAge=900,expanded=false,paintKey="",syncing=false,celebrateAge=5000,cashAge=5000;const INTRO_END=10500,celebrated=new Set(),cashCelebrated=new Set();'+view.slice(start,end)+';globalThis.accept=restore;globalThis.state=()=>({server,challenge,celebrateAge,cashAge});globalThis.age=()=>{cashAge=1234;celebrateAge=2345;};',acceptContext);
 const nativeBefore=JSON.stringify(acceptContext.app),raw=(challenge,revision)=>({version:254,revision,bank:[],acceptedIds:[],challenge,startedAt:Date.now()-12000});
 const drawing=ruleState(R,{id:'cash-accepted',draws:[1,2,3,4,5,6,7]});assert(acceptContext.accept(raw({...drawing,cashWin:999999900,phase:'complete'},10)));assert.equal(acceptContext.state().cashAge,5000,'fabricated cached cash/phase fields are rederived and cannot trigger an award');
 const cash=ruleState(R,{id:'cash-accepted',draws:[1,2,3,4,5,6,7,8]});assert(acceptContext.accept(raw(cash,11)));assert.equal(acceptContext.state().cashAge,0);acceptContext.age();assert(acceptContext.accept(raw(cash,12)));assert.equal(acceptContext.state().cashAge,1234,'duplicate snapshot never restarts cash');
 assert.equal(acceptContext.accept(raw(cash,10)),false,'stale revision rejected');assert.equal(acceptContext.accept(raw(drawing,13)),false,'same challenge cannot lose already accepted draws');assert.equal(acceptContext.state().cashAge,1234);
 const jpc=ruleState(R,{id:'jpc-accepted',draws:[25,24,20,8]});assert(acceptContext.accept(raw({...jpc,cashWin:999999900},14)));assert.equal(acceptContext.state().celebrateAge,0);assert.equal(acceptContext.state().cashAge,1234);assert.equal(acceptContext.state().challenge.cashWin,0,'JPC cannot fabricate a cash award');assert.equal(JSON.stringify(acceptContext.app),nativeBefore,'presentation leaves native wallet/BET/draw state unchanged');report.acceptance={forgedFieldsRejected:true,duplicateNoReplay:true,staleRejected:true,regressiveDrawRejected:true,nativePreserved:true};
 const steady=node();W.number(steady,999999900,66,17);const before={allocations,readbacks,builds:W.describe().numberBuilds};for(let i=0;i<1000;i++){assert(W.number(steady,999999900,66,17));assert(W.number(node(),999999900,66,17));assert(A.sprite('jp'));}assert.deepEqual({allocations,readbacks,builds:W.describe().numberBuilds},before,'warmed paints and remounts allocate no canvas and do not read pixels');
 for(let i=0;i<160;i++)W.number(node(),1000000+i,65,17);assert.equal(W.describe().numberCacheSize,128,'amount cache remains bounded');
 for(const bad of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(W.number(node(),bad,100,30),false);assert.equal(W.amount(null,1,0,0,1,1),null);assert.equal(rngCalls,0);
 report.cache={warm:{...before,iterations:1000},final:plain(W.describe()),allocations,readbacks};report.rngCalls=rngCalls;report.ok=true;
 console.log('SUGAR_V305_RENDER_PASS: 8 generated assets; 12 glyph crops inside measured clear gutters; live 9-digit/maximum-safe amounts; original 12 multiplier images and native authority unchanged; accepted cash/JPC only; duplicate/stale/regression protection; 1000 warm renders without allocation/readback; bounded cache.');
}catch(error){report.failure={message:String(error),stack:error.stack};throw error;}finally{fs.writeFileSync(path.join(out,'native-render-report.json'),JSON.stringify(report,null,2)+'\n');}
