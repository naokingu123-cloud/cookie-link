import vm from 'node:vm';
// A minimal DOM for executing the actual roster script in the game's private
// lexical scope. There is intentionally no window.app or fabricated UI WIN.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.parentNode=null;this.isConnected=false;this.dataset={};this.style={};this.attrs={};this._text='';this.clientWidth=0;this.scrollWidth=0;this.classList={add(){},remove(){}};}
 set textContent(value){for(const child of this.children)child.parentNode=null;this.children=[];this._text=String(value);}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 append(...children){for(const child of children){child.remove();child.parentNode=this;child.isConnected=true;this.children.push(child);}}
 remove(){if(this.parentNode){const a=this.parentNode.children,i=a.indexOf(this);if(i>=0)a.splice(i,1);}this.parentNode=null;this.isConnected=false;}
 insertBefore(child,next){child.remove();const at=next?this.children.indexOf(next):-1;child.parentNode=this;child.isConnected=true;if(at<0)this.children.push(child);else this.children.splice(at,0,child);}
 replaceChildren(...children){this.textContent='';this.append(...children);}
 setAttribute(name,value){this.attrs[name]=String(value);}
 getAttribute(name){return name==='src'?this.src||null:this.attrs[name]??null;}
}
export function stationView(source,{id,model,round,send}={}){
 const arena=new Element('section');arena.isConnected=true;
 const listeners=[],pending=[],sent=[];
 const client={online:true,playerId:id,ws:{},round,on(fn){listeners.push(fn);},send(message){sent.push(message);return send?send(message):true;}};
 const shared={client,active:round?{roundId:round.id}:null};
 const document={getElementById:()=>null,querySelector:s=>s==='#screen>.arena'?arena:null,createElement:tag=>new Element(tag),createTextNode:text=>{const n=new Element('#text');n.textContent=text;return n;}};
 const context={model,document,URLSearchParams,location:{search:'?machine=public-01'},localStorage:{getItem:()=>null},console,Date,
  SweetsSharedMachine:shared,setTimeout(fn){pending.push(fn);return pending.length;},clearTimeout(){},addEventListener(){}};
 context.window=context;
 vm.runInNewContext('(function(){const app=model;const medalWin=(bet,hundredths)=>Math.floor(bet*hundredths/100);\n'+source+'\n})();',context);
 return {client,shared,model,sent,arena,context,api:context.SweetsStationsV235,
  tick(){const fn=pending.shift();if(fn)fn();},receive(message){for(const fn of listeners)fn(message);},
  cards(){return arena.children.find(n=>n.className==='stations-strip-v235')?.children||[];},
  otherText(station){return this.cards().find(n=>n.children.some(c=>c.className==='station-id'&&c.textContent==='st.'+station))?.textContent||'';}
 };
}
