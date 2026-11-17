/* Run the actual shared-client browser regression with additional computed-
   style checks. This wrapper changes observations only, never runtime rules. */
import fs from 'node:fs/promises';
const file=new URL('./client-browser-v243.mjs',import.meta.url),temporary=new URL('./.sixdrop-hud-run-v247.mjs',import.meta.url);
let source=await fs.readFile(file,'utf8');
const anchor="console.log('SIXDROP_V247_BROWSER_HUD',JSON.stringify(sixHud));";
if(source.split(anchor).length!==2)throw Error('Shared browser observation anchor changed');
source=source.replace(anchor,anchor+`
 const hudReadability=await page.evaluate(()=>{
  const heading=document.querySelector('#carnival-heading'),panel=document.querySelector('.sd247-roles'),row=panel.querySelector('section'),label=row.querySelector('b'),amount=row.querySelector('strong');
  return {heading:getComputedStyle(heading).display,background:getComputedStyle(row).backgroundColor,labelDisplay:getComputedStyle(label).display,labelColor:getComputedStyle(label).color,amountColor:getComputedStyle(amount).color,labelSize:parseFloat(getComputedStyle(label).fontSize),amountSize:parseFloat(getComputedStyle(amount).fontSize),label:label.textContent,headingHeight:heading.getBoundingClientRect().height};
 });
 assert.equal(hudReadability.heading,'flex','old round-only block layout must not displace progressive/colors');
 assert.equal(hudReadability.background,'rgb(32, 27, 72)','old cream sections must not wash out the new lettering');
 assert.equal(hudReadability.labelColor,'rgb(255, 244, 211)');
 assert.equal(hudReadability.amountColor,'rgb(255, 221, 105)');
 assert.ok(hudReadability.labelSize>=9&&hudReadability.amountSize>=12);
 assert.equal(hudReadability.label,'直線');
 console.log('SIXDROP_HUD_READABILITY_V247_PASS',JSON.stringify(hudReadability));
`);
await fs.writeFile(temporary,source);
try{await import(temporary.href);}finally{await fs.rm(temporary,{force:true});}
