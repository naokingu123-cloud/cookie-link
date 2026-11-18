/* Run the actual shared-client browser regression with additional computed-
   style checks. This wrapper changes observations only, never runtime rules. */
import fs from 'node:fs/promises';
const file=new URL('./client-browser-v243.mjs',import.meta.url),temporary=new URL('./.sixdrop-hud-run-v247.mjs',import.meta.url);
let source=await fs.readFile(file,'utf8');
const startAnchor='const numbers=[3,7,11];let firstBatchTotals;';
if(source.split(startAnchor).length!==2)throw Error('Shared browser draw observation anchor changed');
source=source.replace(startAnchor,`
 await page.locator('#tab2').click({force:true});
 await page.evaluate(()=>{
  window.__sixBankFrames=[];
  const node=document.querySelector('#sd247-bank');
  const observer=new MutationObserver(()=>{
   const display=Number(node.dataset.displayUnits),target=Number(node.dataset.targetUnits),engine=window.SixDropV247.engine;
   if(!Number.isFinite(display)||!Number.isFinite(target))return;
   const previous=window.__sixBankFrames.at(-1);
   if(previous?.display===display&&previous?.target===target)return;
   window.__sixBankFrames.push({display,target,version:engine.version,phase:engine.fx?.phase||engine.phase,text:node.textContent});
  });
  observer.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-display-units','data-target-units']});
  window.__sixBankObserver=observer;
 });
 `+startAnchor);
const anchor="console.log('SIXDROP_V247_BROWSER_HUD',JSON.stringify(sixHud));";
if(source.split(anchor).length!==2)throw Error('Shared browser observation anchor changed');
source=source.replace(anchor,anchor+`
 const hudReadability=await page.evaluate(()=>{
  const heading=document.querySelector('#carnival-heading'),panel=document.querySelector('.sd247-roles'),row=panel.querySelector('section'),label=row.querySelector('b'),amount=row.querySelector('strong'),bank=document.querySelector('#sd247-bank'),gold=bank.querySelector('.gold-number'),frame=bank.parentElement;
  const rgba=value=>{const values=value.match(/[\\d.]+/g)?.map(Number)||[];return values.length>=3?[...values.slice(0,3),values[3]??1]:null;};
  const luminance=color=>color.slice(0,3).map(value=>{const n=value/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((total,value,index)=>total+value*[.2126,.7152,.0722][index],0);
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const roleRows=[...panel.querySelectorAll('section')].map(section=>{
   const style=getComputedStyle(section),name=section.querySelector('b'),number=section.querySelector('strong'),nameStyle=getComputedStyle(name),numberStyle=getComputedStyle(number);
   const stops=(style.backgroundImage.match(/rgba?\\([^)]+\\)/g)||[]).map(rgba).filter(color=>color&&color[3]===1);
   const base=rgba(style.backgroundColor);if(base?.[3]===1)stops.push(base);
   return {label:name.textContent,background:style.backgroundImage,backgroundStops:stops.length,labelVisible:nameStyle.display!=='none'&&nameStyle.visibility!=='hidden'&&name.getBoundingClientRect().height>0,labelSize:parseFloat(nameStyle.fontSize),amountSize:parseFloat(numberStyle.fontSize),labelContrast:stops.length?Math.min(...stops.map(color=>contrast(rgba(nameStyle.color),color))):0,amountContrast:stops.length?Math.min(...stops.map(color=>contrast(rgba(numberStyle.color),color))):0};
  });
  return {heading:getComputedStyle(heading).display,background:getComputedStyle(row).backgroundColor,labelDisplay:getComputedStyle(label).display,labelColor:getComputedStyle(label).color,amountColor:getComputedStyle(amount).color,labelSize:parseFloat(getComputedStyle(label).fontSize),amountSize:parseFloat(getComputedStyle(amount).fontSize),label:label.textContent,roleRows,headingHeight:heading.getBoundingClientRect().height,bankFont:getComputedStyle(gold).fontFamily,bankAlignment:getComputedStyle(bank).textAlign,bankWeight:getComputedStyle(gold).fontWeight,bankText:frame.textContent,frameBorder:parseFloat(getComputedStyle(frame).borderTopWidth),frameBackground:getComputedStyle(frame).backgroundImage,obsoleteText:!!document.querySelector('.sd247-colors,.sd247-footer,#sd247-progress'),frames:window.__sixBankFrames};
 });
 assert.equal(hudReadability.heading,'flex','old round-only block layout must not displace the candy payout frame');
 assert.equal(hudReadability.roleRows.length,3);
 for(const row of hudReadability.roleRows){
  assert.ok(row.backgroundStops>0,row.label+' has an opaque readable plaque');
  assert.equal(row.labelVisible,true,row.label+' label remains visible');
  assert.ok(row.labelContrast>=4.5&&row.amountContrast>=4.5,row.label+' lettering maintains 4.5:1 contrast across its gradient');
  assert.ok(row.labelSize>=9&&row.amountSize>=12,row.label+' retains readable minimum type sizes');
 }
 assert.equal(hudReadability.label,'直線');
 assert.match(hudReadability.bankFont,/ArcadePayout/);assert.equal(hudReadability.bankWeight,'700');assert.equal(hudReadability.bankAlignment,'right');
 assert.match(hudReadability.bankText,/全消し\\s*\\d+\\s*WIN/);assert.ok(hudReadability.frameBorder>=4);assert.match(hudReadability.frameBackground,/repeating-linear-gradient/);assert.equal(hudReadability.obsoleteText,false);
 const frames=hudReadability.frames;
 assert.ok(frames.some(frame=>frame.display>0&&frame.display<frame.target),'progressive must show intermediate values during removal, not jump to precomputed final balance');
 for(let i=1;i<frames.length;i++)if(frames[i].version===frames[i-1].version)assert.ok(frames[i].display>=frames[i-1].display,'count-up must never count backwards');
 assert.ok(new Set(frames.map(frame=>frame.text)).size>=4,'multiple displayed numeral steps are observed');
 const summary={...hudReadability,frames:frames.length,intermediateFrames:frames.filter(frame=>frame.display>0&&frame.display<frame.target).length};
 console.log('SIXDROP_HUD_READABILITY_V249_PASS',JSON.stringify(summary));
`);
await fs.writeFile(temporary,source);
try{await import(temporary.href);}finally{await fs.rm(temporary,{force:true});}
