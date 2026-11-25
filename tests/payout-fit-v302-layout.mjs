/* Exercise the actual two HUD update functions against a layout-invalidating
 * DOM witness. All native amounts and row-dependent fit sizes must survive,
 * while geometry reads may not alternate with every number write. Browser
 * workflows remain responsible for real font pixels and native timer progress. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const root=process.env.PAYOUT_FIT_SOURCE_DIR||process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function body(file,start,end){const source=read(file),a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);}
function dom(){
 const log={dirty:false,flushes:0,reads:0,writes:0};
 const changed=node=>{if(node.connected){log.dirty=true;log.writes++;}};
 const measure=value=>{log.reads++;if(log.dirty){log.flushes++;log.dirty=false;}return value;};
 class Node{
  constructor(tag='div',connected=false){
   this.tagName=tag;this.connected=connected;this.children=[];this.lookups=new Map();this.width=64;this.height=14;this.text='';this.classes=new Set();this.attrs=new Map();
   this.dataset=new Proxy({}, {set:(target,key,value)=>{if(target[key]!==value){target[key]=value;changed(this);}return true;}});
   this.style={setProperty:(key,value)=>this.setAttribute('style:'+key,value)};
   this.classList={toggle:(key,on)=>{const old=this.classes.has(key);if(old!==!!on){if(on)this.classes.add(key);else this.classes.delete(key);changed(this);}return !!on;}};
  }
  set textContent(value){value=String(value);if(this.text!==value){this.text=value;changed(this);}}
  get textContent(){return this.text;}
  set innerHTML(value){this.textContent=value;}
  setAttribute(key,value){value=String(value);if(this.attrs.get(key)!==value){this.attrs.set(key,value);changed(this);}}
  connect(value){this.connected=value;for(const child of this.children)child.connect(value);for(const child of this.lookups.values())child.connect(value);}
  append(...children){for(const child of children){this.children.push(child);child.connect(this.connected);}changed(this);}
  replaceChildren(...children){for(const child of this.children)child.connect(false);this.children=[];this.append(...children);}
  querySelector(selector){if(!this.lookups.has(selector))this.lookups.set(selector,new Node(selector,this.connected));return this.lookups.get(selector);}
  get clientWidth(){return measure(this.width);}
  get clientHeight(){return measure(this.height);}
 }
 return {Node,log,clear:()=>{log.dirty=false;log.flushes=log.reads=log.writes=0;}};
}

const winery=dom(),scene=new winery.Node('scene',true),payoutRows=Array.from({length:12},(_,i)=>{
 const row=new winery.Node('row',true);row.dataset.full=String(21-i);row.height=12+i%3*2;row.querySelector('.wp298-row-amount').width=70;return row;
});
const lists=new Map([['[data-full]',payoutRows],['[data-amount]',[1,2,4,8,16].map(n=>{const row=new winery.Node('marker',true);row.dataset.amount=String(n);return row;})],['.wp-boost-stage',[]],['.wp-boost-number',Array.from({length:4},()=>new winery.Node('boost',true))]]);
scene.querySelectorAll=selector=>lists.get(selector)||[];
const core={exports:{}};new Function('module',read('assets/winery-pyramid-core-v1.js'))(core);
const engine={version:1,phase:'wineryOddsUp',processed:4,power:16,totalPoured:0,totalHundredths:0,fullCount:0,mixCount:0,presentedMixCount:4,sugarTarget:12,sugarAwarded:false,cycle:1,boostNumbers:[21,12,10,9],seen:new Set([21,12,10,9]),fx:{type:'odds',fromMix:0,toMix:4,elapsed:475,duration:950}};
const bet=7,rowWin=(b,n,m)=>Math.floor(b*Math.round(Math.round(core.exports.PAY[n]*100)*(10+m)/10)/100),fitted=[];
const context={scene,engine,app:{bet:()=>bet},mount:4,window:{WineryArtV298:{loaded:true}},uiKey:'',num:String,rowWin,
 updatePayoutVisual:node=>node.style.setProperty('progress','current'),
 fitGoldenNumber:(node,text,size,width)=>{fitted.push({node,text,size,width});node.textContent=text;node.style.setProperty('font-size',size);}};
vm.createContext(context);vm.runInContext(body('assets/winery-pyramid-v1.js','function updateHUD(){','// Only the grape-juice GLASS PYRAMID'),context);
winery.clear();const stateBefore=JSON.stringify(engine);context.updateHUD();
assert.equal(fitted.length,12);assert(winery.log.flushes<=1,'Winery groups all payout layout reads before writes: '+JSON.stringify(winery.log));
for(let i=0;i<12;i++){
 const n=21-i,expected=Math.round((rowWin(bet,n,0)+rowWin(bet,n,4))/2),item=fitted[i];
 assert.equal(item.text,String(expected));assert.equal(item.size,Math.min(11,payoutRows[i].height-3));assert.equal(item.width,67);
 assert.equal(payoutRows[i].querySelector('b').attrs.get('aria-label'),expected+' WIN');
}
assert.equal(JSON.stringify(engine),stateBefore,'HUD fitting cannot change native state');
const firstWineryFlushes=winery.log.flushes;winery.clear();fitted.length=0;context.updateHUD();assert.equal(fitted.length,0);assert.equal(winery.log.reads,0,'unchanged HUD avoids layout measurements');
engine.fx.elapsed=950;context.updateHUD();assert.equal(fitted.length,12);for(let i=0;i<12;i++)assert.equal(fitted[i].text,String(rowWin(bet,21-i,4)));

const six=dom(),roles=['line','triangle','hexagon'],records=new Map(roles.map(role=>[role,{section:new six.Node('section',true),body:new six.Node('tbody',true),count:new six.Node('count',true),tableCount:new six.Node('count',true)}]));
const rules=createRequire(import.meta.url)('./sixdrop-v247-fixture.cjs').R,sixState={rulesRevision:rules.CURRENT_REVISION},sixFits=[];
const c={engine:{fx:null,state:sixState},roles,nodes:{roles:records},app:{bet:()=>3000},id:2,rules,window:{SixDropArtV296:{loaded:true}},lastRows:{},
 document:{createElement:tag=>new six.Node(tag)},paintRoleDiagram(){},putText:(node,text)=>{node.textContent=text;},
 amount:(span,win,size,width)=>{sixFits.push({span,win,size,width});span.textContent=win;span.style.setProperty('font-size',size);}};
vm.createContext(c);vm.runInContext(body('assets/sixdrop-ui-v278.js','function paintTables(d){','function refresh(){'),c);
six.clear();const data={counts:{line:2,triangle:6,hexagon:0}};c.paintTables(data);
assert.equal(sixFits.length,15);assert(six.log.flushes<=4,'Six Drop batches each role table instead of flushing every row: '+JSON.stringify(six.log));
for(const role of roles){const record=records.get(role),count=data.counts[role],first=count<5?1:count-3;assert.equal(record.body.children.length,5);
 for(let i=0;i<5;i++){const tr=record.body.children[i],n=first+i,value=tr.children[1],span=value.children[0],expected=Math.floor(3000*rules.roleTotal(role,n,sixState)/100);
  assert.equal(tr.dataset.count,String(n));assert.equal(tr.dataset.win,String(expected));assert.equal(span.textContent,String(expected));
  const fit=sixFits.find(item=>item.span===span);assert.equal(fit.size,11);assert.equal(fit.width,61);assert.equal(tr.classes.has('is-current'),n===count);
 }
}
const firstSixFlushes=six.log.flushes;six.clear();sixFits.length=0;c.paintTables(data);assert.equal(sixFits.length,0);assert.equal(six.log.writes,0,'unchanged tables do not rebuild');
console.log('PAYOUT_FIT_V302_LAYOUT_PASS',JSON.stringify({wineryRows:12,wineryLayoutFlushes:firstWineryFlushes,sixRows:15,sixLayoutFlushes:firstSixFlushes,nativeValues:true,unchangedUpdatesCached:true}));
