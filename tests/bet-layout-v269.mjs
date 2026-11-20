/* Execute the shipped BET bridge against native phase and authority transitions.
   The button must never place a wager or escape a server/download edit lock. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../assets/arcade-tabs-v249.js',import.meta.url),'utf8');
const start=source.indexOf('// Retain the native cycle button');
const end=source.indexOf('function syncSugar(){',start);
assert.ok(start>=0&&end>start,'the production BET bridge is present');
class Node {
 constructor(id=''){this.id=id;this.children=[];this.dataset={};this.attributes={};this.hidden=false;this.disabled=false;this.tabIndex=0;this.clientWidth=145;this.classList={add(){}};}
 append(node){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(child=>child!==node);node.parentElement=this;this.children.push(node);}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
}
const nodes=new Map(['cookie-roulette','console','total-bet','win','credit'].map(id=>[id,new Node(id)]));
const slots=Array.from({length:4},(_,i)=>({i,holder:{hidden:i===0},cycle:new Node('cycle'+i)}));
const app={phase:'ready',draws:[],bets:[0,100,5,0],locked:[0,100,5,0],credit:10000,displayCredit:10000,totalWin:0};
const unit=[0,4,1,3],units=[5,10,20,50,100,500],window={},jpcSession={active:false};
let scheduled=0,prepare=null,fitCalls=[];
const context=vm.createContext({slots,app,unit,units,window,jpcSession,records:new Map(slots.map(slot=>[slot.i,{}])),Date,Number,
 document:{createElement:()=>new Node(),getElementById:id=>nodes.get(id),querySelector:selector=>selector==='[data-dl-action="prepare"]'?prepare:null},
 scheduleUI:()=>scheduled++,num:n=>String(n),fitGoldenNumber:(node,text,size,width)=>{fitCalls.push({id:node.id,text,size,width});return {};}});
vm.runInContext(source.slice(start,end)+'\nwindow.qa269={button:commonBet,host:commonBetHost,sync:syncCommonBet,editable:commonBetEditable,fit:fitLedger};',context);
const q=window.qa269;
function sync(expected,label){q.sync();assert.equal(q.editable(),expected,label+' authority');assert.equal(q.host.hidden,!expected,label+' visibility');assert.equal(q.button.disabled,!expected,label+' native disabled');assert.equal(q.button.tabIndex,expected?0:-1,label+' keyboard focus');}
function untouched(action,label){const before=JSON.stringify({unit,bets:app.bets,credit:app.credit});action();assert.equal(JSON.stringify({unit,bets:app.bets,credit:app.credit}),before,label);}
sync(true,'local BET');
assert.equal(q.button,slots[1].cycle,'the first visible native slot owns the sole common button');
assert.equal(q.host.parentElement,nodes.get('cookie-roulette'));
assert.equal(nodes.get('console').children.length,0,'no empty footer BET bay remains');
assert.deepEqual(unit,[4,4,4,4]);
assert.ok(slots.filter(slot=>slot.i!==1).every(slot=>slot.cycle.hidden&&slot.cycle.tabIndex===-1));
const funds=JSON.stringify({bets:app.bets,credit:app.credit});q.button.onclick();
assert.deepEqual(unit,[5,5,5,5]);assert.equal(scheduled,1);assert.equal(JSON.stringify({bets:app.bets,credit:app.credit}),funds,'a unit switch never debits or places BET');
for(const phase of ['playing','thinking','result','paying','complete','error']){
 app.phase=phase;sync(false,phase);untouched(()=>q.button.onclick(),phase+' direct handler stays locked');
}
app.phase='ready';app.draws=[3];sync(false,'stale ready with a draw');app.draws=[];jpcSession.active=true;sync(false,'JPC');jpcSession.active=false;sync(true,'next local BET');
q.button.disabled=true;untouched(()=>q.button.onclick(),'externally disabled button cannot be invoked');

let editable=true;
window.SweetsSharedMachine={client:{round:null,clockOffset:0},active:null};
window.SweetsSharedControllerV224={canEditBets:target=>target===app&&editable};
sync(true,'native shared waiting draft');
window.SweetsSharedMachine.client.round={phase:'BETTING',canBet:true,betClosesAt:Date.now()+100000};sync(true,'server BET');
editable=false;sync(false,'pending or registered server BET');
untouched(()=>q.button.onclick(),'registration lock');editable=true;
for(const phase of ['PLAYING','THINKING','RESULT','COMPLETE']){
 window.SweetsSharedMachine.client.round.phase=phase;
 // Deliberately leave the element enabled: the handler must recheck authority
 // before the next paint, not merely trust its previous appearance.
 q.button.disabled=false;untouched(()=>q.button.onclick(),'server '+phase+' beats stale ready DOM');sync(false,'server '+phase);
}
Object.assign(window.SweetsSharedMachine.client.round,{phase:'BETTING',canBet:false});sync(false,'not eligible');
Object.assign(window.SweetsSharedMachine.client.round,{canBet:true,betClosesAt:Date.now()-1});sync(false,'BET deadline');
Object.assign(window.SweetsSharedMachine.client.round,{betClosesAt:Date.now()+100000});window.SweetsSharedMachine.active={roundId:'old'};sync(false,'active shared round');
window.SweetsSharedMachine.active=null;sync(true,'next shared BET');
delete window.SweetsSharedMachine;delete window.SweetsSharedControllerV224;

window.SweetsEditionV255={value:'download'};let state={hydrated:false,packageReady:false,started:false,session:null};
window.SweetsDownloadV255={describe:()=>state};prepare=new Node();sync(false,'download identity pending');state.hydrated=true;sync(true,'download BET');
prepare.disabled=true;q.button.disabled=false;untouched(()=>q.button.onclick(),'download request in flight cannot switch');sync(false,'download preparing');prepare.disabled=false;
for(const status of ['preparing','ready','failed']){state.session={status};sync(false,'download '+status);}
state.session=null;state.packageReady=true;sync(false,'download package ready');state.started=true;app.phase='playing';sync(false,'download playback');
app.phase='complete';state.localComplete=true;sync(false,'download result');
state={hydrated:true,packageReady:false,started:false,session:null};app.phase='ready';sync(true,'next download BET');
q.fit();assert.deepEqual(fitCalls.map(call=>[call.id,call.size,call.width]),[['total-bet',20,139],['win',21,139],['credit',21,139]],'ledger amounts use their recovered width');
console.log('BET_LAYOUT_V269_PASS local/shared/download BET-only visibility, native locks, no wager side effects, ledger fitting');
