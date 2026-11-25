/* Native Canvas proof for generated Castella materials, immutable native
 * receipts and responsive main/mini artwork. DOM/CSS/input are browser CI. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createCanvas,Image,Path2D,GlobalFonts} from '@napi-rs/canvas';
const root=process.cwd(),out=path.resolve(root,'qa-castella-v303-render');fs.mkdirSync(out,{recursive:true});
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),plain=v=>JSON.parse(JSON.stringify(v));
const hash=v=>createHash('sha256').update(v).digest('hex');
const owner=read('assets/award-presentation-v277.js'),native=read('optimized/app-01.js');
const report={scope:'Actual production Canvas painter, native board coordinates, native semantic award snapshots and generated number atlas. CSS/input/clocks/wallet remain browser-CI checks. Existing nonstandard 1000-weight legacy font parsing is not rewritten by this harness.',boards:[],awards:[],errors:[],assets:[]};
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'Noto Sans JP');
const sourceFiles=new WeakMap(),traces=new WeakMap();let canvases=0,readbacks=0;
function canvas(w=300,h=150){
 const cv=createCanvas(w,h),ctx=cv.getContext('2d');canvases++;traces.set(cv,{images:[],numbers:[],texts:[]});
 const draw=ctx.drawImage.bind(ctx),get=ctx.getImageData.bind(ctx),text=ctx.fillText.bind(ctx);
 ctx.getImageData=(...args)=>{readbacks++;return get(...args);};
 ctx.drawImage=(image,...args)=>{const result=draw(image,...args),inherited=traces.get(image),file=sourceFiles.get(image);const t=traces.get(cv);t.images.push({file,args,sources:file?[file]:[...new Set((inherited?.images||[]).flatMap(v=>v.sources))]});t.numbers.push(...(inherited?.numbers||[]));return result;};
 ctx.fillText=(value,...args)=>{traces.get(cv).texts.push({text:String(value),args,font:ctx.font});return text(value,...args);};return cv;
}
class LocalImage extends Image{
 set src(value){const file=String(value).split('?')[0];assert(file.startsWith('assets/'));sourceFiles.set(this,file);super.src=fs.readFileSync(path.join(root,file));}
 get src(){return sourceFiles.get(this)||'';}
 addEventListener(type,fn){const key='on'+type,prev=this[key];this[key]=(...a)=>{prev?.(...a);fn(...a);};}
}
const media={matches:false},classes=new Set(),classList={add:n=>classes.add(n)};
const window={SweetsLineup:{chosen:['castella'],ids:['castella']}},document={createElement(tag){assert.equal(tag,'canvas');return canvas();},fonts:{ready:Promise.resolve()},documentElement:{classList},body:{classList}};
const math=Object.create(Math);math.random=()=>{throw Error('presentation sampled gameplay RNG');};
const context=vm.createContext({window,document,Image:LocalImage,Path2D,Math:math,console,location:{search:''},URLSearchParams,Promise,performance:{now:()=>0},matchMedia:()=>media,app:{locked:[3000]},medalWin:(b,h)=>Math.floor(b*h/100)});
function section(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i);return s.slice(i,j);}
vm.runInContext(read('assets/party-castella-rules.js'),context);const R=context.PartyCastellaRules;window.PartyCastellaRules=R;
vm.runInContext(section(native,'const elixirGlyphs=','const cookieFlavors='),context);
const drawNumber=context.drawElixirNumber;context.drawElixirNumber=(ctx,n,x,y,size,...args)=>{traces.get(ctx.canvas).numbers.push({n,x,y,size});return drawNumber(ctx,n,x,y,size,...args);};
for(const file of ['assets/castella-art-v303.js','assets/castella-award-v303.js'])vm.runInContext(read(file),context,{filename:file});
assert.deepEqual(await Promise.all([window.CastellaArtV303.ready,window.CastellaAwardV303.ready]),[true,true]);
const art=window.CastellaArtV303,award=window.CastellaAwardV303;
assert.deepEqual(plain(art.describe().errors),[]);assert.deepEqual(plain(award.describe().errors),[]);assert(award.describe().digitsReady);
vm.runInContext(read('assets/party-castella.js').replace('window.PartyCastellaView={','window.__paint303=paint;window.PartyCastellaView={'),context);
vm.runInContext(section(owner,'const clamp=','function target(')+section(owner,'function semantic(','function recordFor(')+'\nwindow.__semantic303=semantic;',context);
const badge=owner.slice(0,owner.indexOf('function recordFor('))+section(owner,'function paintGameBadge(','function paintBadge(')+'\nwindow.__badge303=paintGameBadge;\n})();';
vm.runInContext(badge,context);
const freeze=v=>{if(v&&typeof v==='object'){Object.freeze(v);Object.values(v).forEach(freeze);}return v;};
function save(cv,name){fs.writeFileSync(path.join(out,name+'.png'),cv.toBuffer('image/png'));return name+'.png';}
function sources(cv){return [...new Set(traces.get(cv).images.flatMap(v=>v.sources))];}
const {state:opening,draws}=R.createDemo();let s=opening;const states=[s];for(const n of draws){s=R.draw(s,n);states.push(s);}assert.equal(s.bakedCount,61);
const boardSpecs=[
 {name:'opening-main',state:0,w:860,h:720},
 {name:'pour-live',state:1,w:860,h:720,age:350},
 {name:'raw-61',state:5,w:860,h:720},
 {name:'baking-live',state:6,w:860,h:720,age:600},
 {name:'all-baked-main',state:8,w:860,h:720},
 {name:'mobile-320-board',state:7,w:258,h:238},
 {name:'mini116',state:7,w:116,h:116,mini:true},
 {name:'mini47',state:8,w:47,h:47,mini:true}
];
const contact=createCanvas(1280,1120),cc=contact.getContext('2d');cc.fillStyle='#f4ddb3';cc.fillRect(0,0,1280,1120);
for(const [index,spec] of boardSpecs.entries()){
 const state=freeze(plain(states[spec.state])),before=JSON.stringify(state),cv=canvas(spec.w,spec.h),ctx=cv.getContext('2d');
 window.__paint303(ctx,state,{age:spec.age??Infinity,time:spec.age??5000,reach:[],bet:3000,sugarCollected:true},!!spec.mini);
 assert.equal(JSON.stringify(state),before,'painting must not mutate native state');assert(sources(cv).includes('assets/castella-art-v303/copper-griddle.webp'));assert(sources(cv).includes('assets/castella-art-v303/castella-materials.webp'));
 const {panW,panH}=window.PartyCastellaView.geometry(state),u=Math.min(spec.w/panW,spec.h/panH);
 for(const c of state.cells){const x=spec.w/2+c.x*u,y=spec.h/2+c.y*u,r=u*.405;assert(x-r>=0&&x+r<=spec.w&&y-r>=0&&y+r<=spec.h);}
 if(spec.state<5)assert.deepEqual(traces.get(cv).numbers.map(p=>p.n).sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
 if(spec.name==='pour-live')assert(sources(cv).includes('assets/castella-art-v303/bakery-furniture.webp'),'real pouring animation uses commissioned dispenser');
 const allocated=canvases,scans=readbacks;window.__paint303(ctx,state,{age:spec.age??Infinity,time:spec.age??5000,reach:[],bet:3000,sugarCollected:true},!!spec.mini);assert.equal(canvases,allocated);assert.equal(readbacks,scans,'repeated native frame does not scan pixels');
 report.boards.push({...spec,state:spec.state,file:save(cv,spec.name),sources:sources(cv),numbers:traces.get(cv).numbers.length});
 const x=(index%4)*320,y=Math.floor(index/4)*300,k=Math.min(300/spec.w,260/spec.h);cc.drawImage(cv,x+(320-spec.w*k)/2,y+12,spec.w*k,spec.h*k);cc.fillStyle='#402719';cc.font='16px sans-serif';cc.fillText(spec.name,x+12,y+288);
}
const full=states[8],ordinary=R.draw(states[7],1);
const cases=[{name:'all-main',state:full,w:430,h:372,bet:3000},{name:'bake-main',state:ordinary,w:430,h:372,bet:3000},{name:'all-mobile-large',state:full,w:318,h:275,bet:300000},{name:'bake-mini',state:ordinary,w:116,h:116,mini:true,bet:3000},{name:'all-mini47',state:full,w:47,h:47,mini:true,bet:3000},{name:'all-reduced',state:full,w:430,h:372,reduced:true,bet:3000}];
for(const [index,spec]of cases.entries()){
 context.app.locked[0]=spec.bet;const state=freeze(plain(spec.state)),slot={i:0,engine:{kind:'castella',state,roundBet:spec.bet}},before=JSON.stringify(state);
 const raw=window.__semantic303(slot,{phase:'settled',number:state.draws.at(-1)},{liveDepth:1,beforeDraws:7});assert(raw);assert(Object.isFrozen(raw.castella));
 assert.equal(raw.win,Math.floor(spec.bet*state.totalHundredths/100));assert.equal(raw.castella.bakedCount,state.bakedCount);assert.equal(raw.castella.allBaked,state.highestRole);
 assert.equal(window.__semantic303(slot,{phase:'settled'},{liveDepth:0,beforeDraws:7}),null,'restoration cannot mint a new cue');
 assert.equal(window.__semantic303(slot,{phase:'settled'},{liveDepth:1,beforeDraws:8}),null,'repeated settle cannot mint a new cue');
 const cue=freeze({...raw,age:900,duration:3100,serial:index+1}),cv=canvas(spec.w*2,spec.h*2),ctx=cv.getContext('2d');
 ctx.fillStyle='#f2c68d';ctx.fillRect(0,0,cv.width,cv.height);ctx.scale(2,2);media.matches=!!spec.reduced;
 window.__badge303(ctx,{},cue,spec.w,spec.h,!!spec.mini,0,0);const d=plain(award.describe());
 assert.equal(JSON.stringify(state),before);assert.equal(d.last.win,raw.win);assert.equal(d.last.rasterNumbers,true);assert.equal(d.last.role,state.highestRole?'all':'bake');assert.deepEqual(d.last.glyphs,[...raw.win.toLocaleString('ja-JP'),'WIN']);
 const digitOps=traces.get(cv).images.filter(op=>op.file==='assets/castella-art-v303/award-digits.webp');assert.deepEqual(digitOps.map(op=>op.args.slice(0,4)),d.last.glyphs.map(g=>d.glyphRects[g]));
 const allocations=canvases,scans=readbacks;window.__badge303(ctx,{},cue,spec.w,spec.h,!!spec.mini,0,0);assert.equal(canvases,allocations);assert.equal(readbacks,scans);
 report.awards.push({name:spec.name,file:save(cv,spec.name),win:d.last.win,role:d.last.role,glyphs:d.last.glyphs,snapshot:plain(cue.castella),sources:sources(cv)});
 const x=(index%3)*425,y=620+Math.floor(index/3)*246,k=Math.min(410/cv.width,225/cv.height);cc.drawImage(cv,x+(425-cv.width*k)/2,y,cv.width*k,cv.height*k);cc.fillStyle='#402719';cc.font='15px sans-serif';cc.fillText(spec.name+' / '+raw.win,x+12,y+237);
}
media.matches=false;const legacy=freeze(plain(R.legacy.create({rng:()=>.38,target:90}))),lc=canvas(490,390);window.PartyCastellaView.drawMini(lc.getContext('2d'),legacy,{age:Infinity,reach:[]});assert.equal(legacy.cells.length,37);assert(sources(lc).includes('assets/castella-art-v303/castella-materials.webp'));save(lc,'legacy37');
const prov=JSON.parse(read('assets/castella-art-v303/generation-provenance.json'));for(const a of prov.assets){const bytes=fs.readFileSync(path.join(root,'assets/castella-art-v303',a.file));assert.equal(hash(bytes),a.sha256);report.assets.push({file:a.file,sha256:a.sha256,bytes:bytes.length});}
save(contact,'native-contact');report.art=plain(art.describe());report.award=plain(award.describe());report.ok=true;report.legacy=37;report.canvases=canvases;report.readbacks=readbacks;fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
console.log('CASTELLA_V303_RENDER_PASS',JSON.stringify({boards:report.boards.length,awards:report.awards.length,legacy:37,assets:report.assets.length,canvas:canvases,readbacks}));
