/* SWEETS LINK v18 -- true highest-role reach.
 * Canyon: a single remaining numbered draw resolves a new 500m+,
 * every-100m bonus -> tier 3 (matching Cookie Link all-clear effect).
 * Six Drop: preserve its existing predictor's allClear -> tier 3.
 * Runtime patch is loaded in the original game IIFE after engine code.
 * It never changes payout amounts, draw odds, or engine transitions.
 */
(()=>{
'use strict';
try{
 if(typeof chocoRequestReach!=='function'||typeof chocoPlan!=='function'
   ||typeof chocoReachLabel!=='function'||typeof reachTier!=='function'){
   throw Error('Missing Canyon reach helpers');
 }
 // Keep the original Canyon predictor lifecycle and its asynchronous
 // two-number chunks. Only its returned tier can change.
 chocoRequestReach=function(s,e,a){
  if(a.bet(s.i)<=0||a.phase==='ready'||e.processed<1||e.processed>8
    ||e.fx||e.queue.length||e.accepted!==e.processed)return;
  const key=[e.version,e.processed,e.seed,e.totalHundredths].join('/');
  if(s.chocoReachKey===key)return;
  s.chocoReachKey=key;
  const snapshot=e.world(),base=e.totalHundredths;
  const epoch=s.reachEpoch=(s.reachEpoch||0)+1;
  const numbers=[...e.drills.flatMap(d=>d.numbers),...e.lucky.numbers]
    .filter(n=>!a.draws.includes(n));
  const resolved=Number(snapshot.bonusResolvedDepth)||0;
  s.reachStatus='pending';
  let index=0;const results=[];
  function chunk(){
   if(s.reachEpoch!==epoch||s.chocoReachKey!==key||s.engine!==e)return;
   try{
    const end=Math.min(numbers.length,index+2);
    for(;index<end;index++){
      const number=numbers[index];
      const p=chocoPlan(snapshot.strata,[number],snapshot);
      if(!(p.gain>0))continue;
      const reached=Number(p.bonusResolvedDepth)||0;
      const highest=reached>=500&&reached>resolved&&reached%100===0;
      const tier=highest?3:reachTier(base+p.gain,false);
      results.push({
        number,gain:p.gain,total:base+p.gain,tier,
        ...(highest?{highestRole:'canyonBonus',bonusDepth:reached}:{})
      });
    }
    if(index<numbers.length){setTimeout(chunk,0);return;}
    results.sort((a,b)=>a.number-b.number);
    s.reachResults=results;
    s.tabReachResults=results;
    s.tabReachBase=base;
    s.tabReachVersion=e.version;
    s.reachStatus='ready';
    s.reachAfterBall=e.processed;
    chocoQueueFrame(s);
    scheduleUI(a);
   }catch(error){failReachPreview(s,epoch,error);}
  }
  setTimeout(chunk,0);
 };
 const oldLabel=chocoReachLabel;
 chocoReachLabel=function(x,s,n,cx,cy,time,size=6.5){
   const r=(s.reachResults||[]).find(v=>v.number===n);
   if(!r||r.tier!==3||r.highestRole!=='canyonBonus'){
     return oldLabel(x,s,n,cx,cy,time,size);
   }
   // The same all-clear tier-3 visual language: rotating rainbow rail,
   // bright perimeter, sparks and an alternating high-award reach label.
   // Use BONUS instead of ALL CLEAR because this is a Canyon depth bonus.
   const colors=['#ff709e','#ffe174','#8aeb8c','#60dbff','#a68bff','#ff90d5'];
   const phase=motionReduced?0:time/750,px=cx,py=cy-7;
   x.save();
   x.globalAlpha=motionReduced?1:.78+.22*Math.sin(time/190)**2;
   x.shadowBlur=motionReduced?2:8;
   x.shadowColor='#ffe6a4';
   x.lineWidth=2.15;
   const radius=13.2;
   for(let i=0;i<6;i++){
     x.strokeStyle=colors[i];
     x.beginPath();
     x.arc(px,py,radius,phase+i*Math.PI/3,phase+(i+1)*Math.PI/3);
     x.stroke();
   }
   x.shadowBlur=0;
   x.strokeStyle='#fff4b9';
   x.globalAlpha=.68;
   x.lineWidth=1.1;
   x.beginPath();x.arc(px,py,radius+2,0,Math.PI*2);x.stroke();
   if(!motionReduced)for(let i=0;i<4;i++){
     const angle=phase*.8+i*Math.PI/2;
     const sx=px+Math.cos(angle)*(radius+4),sy=py+Math.sin(angle)*(radius+4);
     x.strokeStyle=colors[(i+Math.floor(time/300))%6];
     x.lineWidth=1.05;x.beginPath();
     x.moveTo(sx-2,sy);x.lineTo(sx+2,sy);
     x.moveTo(sx,sy-2);x.lineTo(sx,sy+2);x.stroke();
   }
   x.restore();
   const text=motionReduced||Math.floor(time/1600)%2?'BONUS':'リーチ';
   chocoText(x,text,cx,cy,Math.max(size,7.5),'#fff0ba');
 };
 // The Six Drop predictor already sets tier 3 if its actual
 // deterministic sixPlan calculation clears the entire staggered board.
 console.info('[HighestRoleV18] Canyon 500m+ bonus and Six Drop all-clear, tier 3');
}catch(error){console.error('[HighestRoleV18]',error);}
})();