/* Reproduce the black all-clear discs with the actual production SVG builder
   and styles, and verify pixels inside the ring remain transparent. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep} from './ui-v250-fixture.mjs';
const fixture=await createUiFixture({output:'qa-sixdrop-v250'});
const {page,errors}=fixture;
try{
 await page.evaluate(()=>{const q=window.__qa250;q.select(q.slots.find(s=>s.engine.kind==='candy').i);});
 await page.waitForFunction(()=>{
  const canvas=window.__qa250.slots.find(s=>s.engine.kind==='candy').candyCanvas;
  if(!canvas.width||!canvas.height)return false;
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  for(let i=3;i<pixels.length;i+=4)if(pixels[i])return true;
  return false;
 },null,{timeout:10000});
 const measurement=await page.evaluate(async()=>{
  const q=window.__qa250,slot=q.slots.find(s=>s.engine.kind==='candy');
  const grid=slot.engine.pyramid,entry=grid.flatMap((row,r)=>row.map((tile,c)=>tile?.number!=null?{tile,r,c}:null).filter(Boolean))[0];
  if(!entry)throw Error('Actual single-draw board has no numbered drop');
  // A separate visual probe avoids touching the real engine, its forecast or BET.
  const frame=document.createElement('div');frame.id='sixdrop-allclear-probe-v250';
  frame.style.cssText='position:fixed;left:20px;top:100px;width:320px;height:320px;background:#f8dba6;z-index:2147483647;pointer-events:none';
  const canvas=document.createElement('canvas');canvas.width=canvas.height=640;canvas.style.cssText='position:absolute;inset:0;width:320px;height:320px';
  canvas.getContext('2d').drawImage(slot.candyCanvas,0,0,640,640);
  const layer=document.createElement('div');layer.className='six-reach-layer';
  frame.append(canvas,layer);document.body.append(frame);
  const copy={...slot,sixReachLayer:layer,sixReachKey:''};
  q.sixReachPresentation(copy,[{number:entry.tile.number,tier:3}],grid,false);
  const svg=layer.querySelector('svg.allclear-reach-perimeter');
  if(!svg)throw Error('Native highest-reach SVG was not rendered');
  const circles=[...svg.querySelectorAll('circle')];
  const styled=svg.cloneNode(true);styled.setAttribute('xmlns','http://www.w3.org/2000/svg');styled.setAttribute('width','128');styled.setAttribute('height','128');
  for(let i=0;i<circles.length;i++){
   const computed=getComputedStyle(circles[i]),copy=styled.querySelectorAll('circle')[i];
   copy.setAttribute('fill',computed.fill);copy.setAttribute('stroke','#ffe782');copy.setAttribute('stroke-width',computed.strokeWidth);
  }
  const blob=new Blob([new XMLSerializer().serializeToString(styled)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);
  const image=new Image();image.src=url;await image.decode();
  const pixels=document.createElement('canvas');pixels.width=pixels.height=128;const context=pixels.getContext('2d');context.drawImage(image,0,0);
  const center=context.getImageData(48,48,32,32).data;let opaque=0;for(let i=3;i<center.length;i+=4)if(center[i])opaque++;
  URL.revokeObjectURL(url);
  return {number:entry.tile.number,parts:circles.length,fills:circles.map(circle=>getComputedStyle(circle).fill),centerOpaquePixels:opaque,sourceFill:svg.getAttribute('fill'),gameStateUnchanged:slot.engine.pyramid===grid};
 });
 assert.equal(measurement.parts,3);assert.deepEqual(measurement.fills,['none','none','none']);
 assert.equal(measurement.centerOpaquePixels,0,'the entire interior stays transparent, never black');
 assert.equal(measurement.gameStateUnchanged,true);assert.equal(measurement.sourceFill,'none');
 await sleep(250);await page.screenshot({path:'qa-sixdrop-v250/allclear-transparent.png'});
 await page.evaluate(()=>document.getElementById('sixdrop-allclear-probe-v250').remove());
 assert.deepEqual(errors,[]);
 await fs.writeFile('qa-sixdrop-v250/result.json',JSON.stringify(measurement,null,2)+'\n');
 console.log('SIXDROP_REACH_V250_PASS',JSON.stringify(measurement));
}finally{await fixture.close();}
