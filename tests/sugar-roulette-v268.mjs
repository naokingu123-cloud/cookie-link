/* Local and downloaded rounds share the same visual adapter; no draw or wallet
   API is called. The GPU receives float32 uniforms, so test its precision too. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/sugar-roulette-v254.js',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../optimized/app-01.js',import.meta.url),'utf8');
const fragmentShader=core.match(/const faceMat=new THREE\.ShaderMaterial\([\s\S]*?fragmentShader:`([\s\S]*?)`,toneMapped/)[1];
const rulesContext=vm.createContext({console});vm.runInContext(fs.readFileSync(new URL('../assets/sugar-challenge-rules-v254.js',import.meta.url),'utf8'),rulesContext);
const R=rulesContext.SugarChallengeRulesV254;
const colors=['#ff5d9e','#39d5f5','#ffd363','#b38bff','#66e7b4','#ff9a65'];
const tint=(color='#ffffff')=>({color,clone(){return tint(this.color);},set(c){this.color=c;},getHexString(){return this.color.replace('#','');}});
const makeDriver=()=>{
 const panels=Array.from({length:25},(_,i)=>({isMesh:true,parent:{rotation:{y:-i*Math.PI*2/25}},material:{uniforms:{gridSize:{value:20},lightTint:{value:tint()},brightness:{value:1}},fragmentShader},onBeforeRender(){this.nativeCalls=(this.nativeCalls||0)+1;}}));
 return {panels,driver:{draw:{mode:'eight'},physics:{hits:[]},scene:{traverse(fn){panels.forEach(fn);}}}};
};
const results=[];
for(const edition of ['local','download']){
 let now=1795000000000,challenge=null;const app={phase:'ready'},root={anima8:null};
 const {driver,panels}=makeDriver();
 const win={SweetsEditionV255:{value:edition},SugarChallengeRulesV254:R,SweetsSugarChallengeV254:{describe:()=>({challenge})}};
 class FakeDate extends Date{static now(){return now;}}
 vm.runInNewContext(source,{window:win,app,URLSearchParams,location:{search:'?edition='+edition},Date:FakeDate,document:{getElementById:()=>root},setInterval(){return 1;},clearInterval(){},addEventListener(){}});
 const ui=win.SweetsSugarRouletteV254;assert.ok(ui);assert.equal(ui.describe().panelCount,0,'adapter waits for a native or recorded renderer');
 root.anima8=driver;ui.pulse();assert.equal(ui.describe().panelCount,25);
 const shaders=panels.map(p=>p.material.fragmentShader);ui.pulse();assert.deepEqual(panels.map(p=>p.material.fragmentShader),shaders,'rebinding the same driver is idempotent');
 for(let station=1;station<=6;station++){
  challenge=R.create({id:edition+'-'+station,roundId:edition+'-round-'+station,station,rulesRevision:268,sugarValues:[1000,1000,1000,1000,1000],cardId:'standard',multiplier:2});
  now+=100;ui.pulse();assert.equal(ui.colorFor(8),null,'BET keeps number faces in their normal state');
  app.phase='playing';for(const n of [25,24,20])challenge=R.advance(challenge,n);
  now+=100;ui.pulse();const reach=ui.colorFor(8);assert.equal(reach.station,station);assert.equal(reach.status,'reach');assert.equal(reach.color,colors[station-1]);
  panels[7].onBeforeRender();const uniforms=panels[7].material.uniforms;
  assert.equal(uniforms.sugarModeV254.value,1);assert.equal(uniforms.sugarFrameV254.value.color,colors[station-1]);
  assert.match(panels[7].material.fragmentShader,/spectrumPhase=sugarTimeV254\/0\.72/);assert.match(panels[7].material.fragmentShader,/sugarFrameV254\*4\.2,outerFrame/);
  const first=Math.fround(uniforms.sugarTimeV254.value);now+=180;panels[7].onBeforeRender();const second=Math.fround(uniforms.sugarTimeV254.value);
  assert.ok(Math.abs((second-first)-.18)<.0001,'GPU clock must advance smoothly inside the720ms spectrum cycle; epoch seconds freeze afterfloat32 conversion');
  assert.ok(second>=0&&second<720,'shader clock remains bounded');
  challenge=R.advance(challenge,8);now+=100;ui.pulse();assert.equal(challenge.jpcQualified,true);assert.equal(ui.colorFor(8).status,'acquired');panels[7].onBeforeRender();assert.equal(uniforms.sugarModeV254.value,2);
  for(const n of [1,2,3,4])challenge=R.advance(challenge,n);now+=100;ui.pulse();assert.equal(ui.colorFor(8).status,'acquired','the early winning number remains confirmed after the eighth ball');
  app.phase='ready';now+=100;ui.pulse();assert.equal(ui.colorFor(8),null,'the next BET hides a prior confirmed number');
 }
 challenge=null;now+=100;ui.pulse();assert.equal(ui.describe().rows.length,0);assert.equal(ui.colorFor(8),null);
 assert.deepEqual(driver.physics.hits,[]);assert.ok(panels[7].nativeCalls>=18,'native render hooks continue to run');
 // A downloaded scene can be replaced when another recording is mounted.
 const replacement=makeDriver();root.anima8=replacement.driver;ui.pulse();assert.equal(ui.describe().panelCount,25);assert.ok(replacement.panels.every(p=>p.material.uniforms.sugarModeV254));
 results.push({edition,stations:6,earlyLucky:true,latePersistence:true,float32Precision:true,rendererRebind:true});
}
console.log('SUGAR_ROULETTE_V268_PASS',JSON.stringify(results));
