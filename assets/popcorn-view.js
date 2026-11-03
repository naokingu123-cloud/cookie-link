/* Popcorn Splash — the main panel and its thumbnail share one geometry. */
(() => {
  'use strict';
  const K = window.PopcornEngine;
  if (!K) throw new Error('Load PopcornEngine before PopcornView');
  const clamp = n => Math.max(0, Math.min(1, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const font = '"Arial Rounded MT Bold","Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif';
  const kernelColors = ['#fff5dc','#fb7635','#fb7635'];
  const ink = '#452335', cream = '#fff5d5', gold = '#ffcd65', teal = '#126b73';
  const path = 'assets/popcorn-art/';
  let plate, artVersion = 0;
  const sprites = [];
  const art = {}, loading = [];
  function loadAsset(name, file) {
    const img = new Image();
    loading.push(new Promise(resolve => {
      img.onload = () => { art[name] = img; artVersion++; resolve(true); };
      img.onerror = () => resolve(false);
    }));
    img.src = path + file;
  }
  // Generated raster artwork; the live cells, badge digits and scores are independent.
  loadAsset('back', 'popcorn-fair.webp');
  loadAsset('carton', 'popcorn-carton.webp');
  loadAsset('stage', 'popcorn-stage-v81.webp');
  loadAsset('pieces', 'popcorn-kernels-v81.webp');
  loadAsset('payout', 'popcorn-payout-v81.webp');
  function rounded(ctx, x, y, w, h, r, fill, stroke, lw = 1) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function label(ctx, s, x, y, size, color, opts = {}) {
    // Letter shaping in whole CSS pixels avoids subpixel font-size quantization for scaled board digits.
    const k=size<2?100:1;
    ctx.save();ctx.translate(x,y);ctx.scale(1/k,1/k);
    ctx.font = (opts.weight || 900) + ' ' + size*k + 'px ' + font;
    ctx.textAlign = opts.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const max=opts.max==null?undefined:opts.max*k, text=String(s);
    if(max!==undefined){const advance=ctx.measureText(text).width;if(advance>max)ctx.scale(max/advance,1);}
    if (opts.outline) { ctx.strokeStyle = opts.outline; ctx.lineWidth = (opts.stroke || size*.13)*k; ctx.strokeText(text, 0, 0); }
    ctx.fillStyle = color; ctx.fillText(text, 0, 0);ctx.restore();
  }
  function circle(ctx,x,y,r,fill,stroke,lw=1) {
    ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
    if (fill) {ctx.fillStyle=fill;ctx.fill();} if (stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
  }
  function polygon(ctx, points, f = 1) {
    ctx.beginPath(); points.forEach(({x,y},i) => i ? ctx.lineTo(x*f,y*f) : ctx.moveTo(x*f,y*f)); ctx.closePath();
  }
  function boardBorder(ctx) {
    // A red-cream folded carton with a double brass lip, registered to the exact live polygon.
    ctx.save(); polygon(ctx,K.outline,1.047); ctx.translate(0,.05); ctx.fillStyle='#67382b'; ctx.fill(); ctx.restore();
    ctx.save(); polygon(ctx,K.outline,1.04); ctx.fillStyle='#ffefc4'; ctx.fill();ctx.clip();
    ctx.fillStyle='#df4743';
    for(let x=-8;x<8;x+=.55) {ctx.beginPath();ctx.moveTo(x,-6);ctx.lineTo(x+.26,-6);ctx.lineTo(x+4.26,6);ctx.lineTo(x+4,6);ctx.closePath();ctx.fill();}
    ctx.restore();
    polygon(ctx,K.outline,1.045);ctx.strokeStyle='#79372c';ctx.lineWidth=.075;ctx.stroke();
    polygon(ctx,K.outline,1.02);ctx.strokeStyle='#ffe7a4';ctx.lineWidth=.045;ctx.stroke();
    const g=ctx.createLinearGradient(0,-4,0,4);g.addColorStop(0,'#673043');g.addColorStop(.52,'#884145');g.addColorStop(1,'#562439');
    polygon(ctx,K.outline,.978);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#ffcb80';ctx.lineWidth=.07;ctx.stroke();
    if(art.stage){
      const rx=Math.max(...K.outline.map(p=>Math.abs(p.x))),ry=Math.max(...K.outline.map(p=>Math.abs(p.y)));
      ctx.save();polygon(ctx,K.outline,.975);ctx.clip();ctx.drawImage(art.stage,-rx,-ry,rx*2,ry*2);ctx.restore();
    }
    polygon(ctx,K.outline,.952);ctx.strokeStyle='#e89869';ctx.lineWidth=.022;ctx.stroke();
    if(art.carton){
      const radius=Math.max(...K.outline.map(p=>Math.abs(p.x)));
      const halfHeight=Math.max(...K.outline.map(p=>Math.abs(p.y)));
      const w=2*radius*1.09,h=2*halfHeight*1.09;
      ctx.drawImage(art.carton,-w/2,-h/2,w,h);
    }
    ctx.save();ctx.globalAlpha=.82;K.cells.forEach(p=>drawCup(ctx,p.x,p.y));ctx.restore();
  }
  function cupPath(ctx,x,y) {
    ctx.beginPath();ctx.moveTo(x-.447,y-.21);ctx.quadraticCurveTo(x,y-.35,x+.447,y-.21);
    ctx.lineTo(x+.337,y+.37);ctx.quadraticCurveTo(x,y+.49,x-.337,y+.37);ctx.closePath();
  }
  function drawCup(ctx,x,y) {
    cupPath(ctx,x,y);ctx.fillStyle='#e8a98b';ctx.fill();ctx.strokeStyle='#4d2737';ctx.lineWidth=.045;ctx.stroke();
    ctx.save();ctx.clip();ctx.fillStyle='#c94e51';
    for (let j=-2;j<=2;j++) {const a=j*.21;ctx.beginPath();ctx.moveTo(x+a-.066,y-.32);ctx.lineTo(x+a+.055,y-.32);ctx.lineTo(x+a*.72+.045,y+.47);ctx.lineTo(x+a*.72-.045,y+.47);ctx.fill();}
    ctx.restore();ctx.beginPath();ctx.ellipse(x,y-.205,.427,.096,0,0,TAU);ctx.fillStyle='#703844';ctx.fill();ctx.lineWidth=.037;ctx.strokeStyle='#ffdfae';ctx.stroke();
  }
  function drawCachedPlate(ctx) {
    if (!plate || plate.version!==artVersion) {
      plate=document.createElement('canvas');plate.width=plate.height=924;plate.version=artVersion;
      const pc=plate.getContext('2d');pc.translate(462,462);pc.scale(84,84);boardBorder(pc);
    }
    ctx.drawImage(plate,-5.5,-5.5,11,11);
  }
  // The badge follows its physical rail. A brass elbow rejoins the shot's
  // real centerline, so the five bottom plates form a separate horizontal bank.
  const badges=K.ports.map((p,i)=>{
    if(i>=5&&i<10)return p;
    const first=K.cells[p.line[0]];
    return {x:first.x+(i<5?-1:1),y:first.y+.43};
  });
  const bounds = {
    left:Math.min(...badges.map(p=>p.x-.42),...K.outline.map(p=>p.x*1.09)),
    right:Math.max(...badges.map(p=>p.x+.42),...K.outline.map(p=>p.x*1.09)),
    top:Math.min(...K.outline.map(p=>p.y*1.09))-.008,
    bottom:Math.max(...badges.map(p=>p.y+.34),...K.outline.map(p=>p.y*1.09))
  };
  function boardFit(x,y,w,h) {
    const k=Math.min(w/(bounds.right-bounds.left),h/(bounds.bottom-bounds.top));
    return {k,x:x+w/2-k*(bounds.right+bounds.left)/2,y:y+h/2-k*(bounds.bottom+bounds.top)/2};
  }
  function star(ctx,x,y,r,fill) {
    ctx.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4;const d=r*(j%2?.24:1);const xx=x+Math.cos(a)*d,yy=y+Math.sin(a)*d;if(j)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  }
  function spriteAtlas(mini) {
    if(!art.pieces) return null;
    const tile=mini?18:54;
    if(!sprites[tile]) {
      const sheet=document.createElement('canvas');sheet.width=3*tile;sheet.height=tile;
      const sc=sheet.getContext('2d');sc.imageSmoothingQuality='high';
      sc.drawImage(art.pieces,0,0,sheet.width,sheet.height);sprites[tile]=sheet;
    }
    return sprites[tile];
  }
  function drawPiece(ctx,p,x,y,time,mini,scale=1,alpha=1,warn=0) {
    if(!p || scale<.02 || alpha<.02)return;
    const power=p.power,seed=p.id,wiggle=warn*Math.sin(warn*21+seed*.9);
    ctx.save();ctx.translate(x+.052*wiggle,y-.035-.045*warn);ctx.scale(scale*(1+.14*warn),scale*(1+.10*warn));ctx.globalAlpha*=alpha;
    if(warn)ctx.rotate(wiggle*.10);
    if(power){
      const pulse=mini?.65:(1+Math.sin(time*.008+seed))/2;
      ctx.beginPath();ctx.ellipse(0,.07,.436,.36,0,0,TAU);ctx.fillStyle='rgba(255,112,19,'+(.19+.2*pulse)+')';ctx.fill();
      ctx.lineWidth=power===2?.085:.055;ctx.strokeStyle=pulse>.57?'#ffe789':'#ff9c29';ctx.stroke();
      if(power===2){ctx.beginPath();ctx.ellipse(0,.065,.495,.419,0,0,TAU);ctx.strokeStyle='#fff4ae';ctx.lineWidth=.038;ctx.stroke();}
    }
    const img=spriteAtlas(mini),size=power?1:.9;
    if(img) {
      ctx.save();if(!power)ctx.rotate((seed%5-2)*.047);
      const tile=img.width/3;ctx.drawImage(img,power*tile,0,tile,tile,-size*.5,-size*.53,size,size);ctx.restore();
    } else {
      for(const [dx,dy,r] of [[-.18,0,.22],[.14,-.05,.25],[-.05,-.17,.2],[.06,.11,.22],[-.1,.08,.17]])circle(ctx,dx,dy,r,kernelColors[power]);
      if(power){ctx.beginPath();ctx.moveTo(.14,-.20);ctx.quadraticCurveTo(.23,-.47,.35,-.34);ctx.strokeStyle='#6b3326';ctx.lineWidth=.065;ctx.stroke();}
    }
    if(power){const a=mini?.7:(1+Math.sin(time*.014+seed*.77))/2;star(ctx,.26,-.37,.09+.072*a,'#ffe376');star(ctx,.26,-.37,.052+.04*a,'#fffdf1');}
    if(warn){
      const pulse=.5+.5*Math.sin(warn*17);
      ctx.globalAlpha*=.35+.65*pulse;circle(ctx,0,0,.44+.08*warn,null,'#fff59f',.054);
      if(!mini){for(let i=0;i<4;i++){const a=i*Math.PI/2+seed*.6;const r=.40+.14*warn;star(ctx,r*Math.cos(a),r*Math.sin(a),.075+.04*warn,'#fff6ae');}}
    }
    ctx.restore();
  }
  const LIGHT=290, WARN=195, WAVE=365, BURST=340, CLEAR=480, FILL=535;
  const traces=new WeakMap();
  let flashTexture;
  function sequence(tr) {
    let a=traces.get(tr);if(a)return a;
    if (tr.port<0) {a={end:470};traces.set(tr,a);return a;}
    if(!tr.count){a={rest:460,fall:460,refill:460,end:770};traces.set(tr,a);return a;}
    const waveOf=new Int16Array(K.cells.length);waveOf.fill(-1);
    tr.waves.forEach((wave,n)=>wave.forEach(i=>{waveOf[i]=n;}));
    const rest=LIGHT+Math.max(0,tr.waves.length-1)*WAVE+BURST;
    const fall=rest+(tr.clear?CLEAR:90);
    let refill=fall;
    const falls=tr.fallSteps.map(step=>{
      const begin=refill;refill+=step.ms;
      const moving=new Set(step.moves.map(m=>m.from));
      const stationary=step.before.map((p,i)=>p&&!moving.has(i)?i:-1).filter(i=>i>=0);
      return {step,begin,end:refill,stationary};
    });
    a={waveOf,falls,rest,fall,refill,end:refill+FILL};traces.set(tr,a);return a;
  }
  function duration(trace) {return trace?sequence(trace).end:0;}
  function waveAt(trace, elapsed) {
    if (!trace || trace.port<0 || elapsed<LIGHT) return -1;
    return Math.min(trace.waves.length-1, Math.floor((elapsed-LIGHT)/WAVE));
  }
  function shot(ctx,index,progress) {
    const p=K.ports[index],seq=p.line;if(!seq.length)return;
    const last=K.cells[seq[seq.length-1]], length=(last.x-p.x)*p.dx+(last.y-p.y)*p.dy;
    const end={x:p.x+length*p.dx,y:p.y+length*p.dy},a=clamp((progress-.10)*1.38),fade=1-clamp((progress-.64)/.55);
    const badge=badges[index],join=clamp(progress*9);
    ctx.save();ctx.globalAlpha*=fade;ctx.lineCap='round';
    for(const [s,color] of [[.22,'#ff6f1f'],[.107,'#ffcc48'],[.032,'#fffcdd']]) {
      ctx.beginPath();ctx.moveTo(badge.x,badge.y);ctx.lineTo(mix(badge.x,p.x,join),mix(badge.y,p.y,join));if(join===1)ctx.lineTo(mix(p.x,end.x,a),mix(p.y,end.y,a));ctx.strokeStyle=color;ctx.lineWidth=s;ctx.stroke();
    }
    star(ctx,mix(p.x,end.x,a),mix(p.y,end.y,a),.19,'#fff5a2');ctx.restore();
  }
  function burst(ctx,pt,p,i,t,mini,chain,crowd) {
    const a=clamp(t),fade=1-a;if(fade<=0)return;
    const power=p.power,range=power===2?2.02:power?1.02:.54;
    ctx.save();ctx.translate(pt.x,pt.y);ctx.globalAlpha*=fade;
    const r=.11+range*(1-(1-a)**1.4);
    if(power&&!mini){
      if(!flashTexture){
        flashTexture=document.createElement('canvas');flashTexture.width=flashTexture.height=96;
        const g=flashTexture.getContext('2d'),halo=g.createRadialGradient(48,48,0,48,48,48);
        halo.addColorStop(0,'#fffde6');halo.addColorStop(.22,'#fff59bab');halo.addColorStop(.53,'#ffad4388');halo.addColorStop(1,'#fb582300');
        g.fillStyle=halo;g.fillRect(0,0,96,96);
      }
      ctx.drawImage(flashTexture,-r,-r,2*r,2*r);
      const n=power===2?12:crowd>7?3:6;
      ctx.beginPath();
      for(let k=0;k<n;k++){
        const angle=k*TAU/n+i*.67,tip=r*(k%2?.96:1.14);
        ctx.moveTo(.17*Math.cos(angle-.23),.17*Math.sin(angle-.23));
        ctx.lineTo(tip*Math.cos(angle),tip*Math.sin(angle));
        ctx.lineTo(.38*r*Math.cos(angle+.08),.38*r*Math.sin(angle+.08));ctx.closePath();
      }
      ctx.fillStyle=power===2?'#fff3ad':'#ffe99b';ctx.fill();
    }
    circle(ctx,0,0,r,null,power===2?'#fff393':power?'#ffaf34':'#fff3c0',(.09+power*.028)*(1-a)+.025);
    if(power===2){
      circle(ctx,0,0,Math.max(.06,r-.17),null,'#ff6f2a',.06);
      if(!mini)circle(ctx,0,0,r+.085,null,'#fffcea',.035);
    }
    const particles=mini?0:Math.min(power===2?14:power?9:6,Math.max(power===2?5:2,Math.floor(64/crowd)));
    for(let n=0;n<particles;n++){
      const angle=TAU*n/particles+i*.79;const d=.12+(.62+(n%3)*.11)*(power===2?1.95:1)*a;
      const px=Math.cos(angle)*d,py=Math.sin(angle)*d+.18*a*a;
      if(n%2)star(ctx,px,py,(.105+.047*(n%3))*(1-.62*a),chain>2&&n%3===0?'#ffade8':n%3?'#ffe79b':'#fff');
      else circle(ctx,px,py,.065*(1-.5*a),power?'#ffaf3d':'#fff5cc');
    }
    ctx.restore();
  }
  const master={x:-3.83,y:-3.48};
  function portArt(ctx,s,tr,elapsed,time,mini,reach) {
    const hit=tr && tr.port>=0, change=hit?sequence(tr).rest:0;
    const numbers=hit && elapsed<change?tr.beforeNumbers:s.numbers;
    numbers.forEach((num,i)=>{
      const all=i===s.allIndex,p=all?master:badges[i];
      const fired=hit&&tr.port===i,lit=fired&&elapsed<change,flipped=fired&&elapsed>=change&&elapsed<change+260;
      const re=reach?.find?.(v=>Number(v.number??v.n??v)===num),type=re?.kind??re?.level??'reach';
      const edge=lit?'#fffce2':re?({all:'#ff94d6',super:'#ff73a0',high:'#ffb839'}[type]||'#6cf6ec'):(all?'#ffd878':'#f7bc71');
      ctx.save();ctx.translate(p.x,p.y);
      if(!mini && !all){
        const gate=K.ports[i],first=K.cells[gate.line[0]],gx=first.x-.69*gate.dx-p.x,gy=first.y-.69*gate.dy-p.y;
        ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(gx,gy);ctx.strokeStyle=lit?'#fff8ac':'#d6a451';ctx.lineWidth=.055;ctx.stroke();
        ctx.translate(gx,gy);ctx.rotate(Math.atan2(gate.dy,gate.dx));ctx.beginPath();
        ctx.moveTo(-.08,-.095);ctx.lineTo(.15,0);ctx.lineTo(-.08,.095);ctx.closePath();
        ctx.fillStyle=lit?'#fff9bd':'#ffe3a6';ctx.fill();ctx.strokeStyle='#793e37';ctx.lineWidth=.029;ctx.stroke();ctx.restore();
      }
      if(flipped){const f=clamp((elapsed-change)/260),k=1+.16*Math.sin(Math.PI*f);ctx.scale(k,k);}
      const half=all?.685:.376,high=all?.415:.292;
      if(!mini && (lit||flipped||re)){const extra=.034+.027*Math.sin(time*.009+i*.34);rounded(ctx,-half-extra,-high-extra,2*(half+extra),2*(high+extra),.205,null,edge,.037);}
      rounded(ctx,-half,-high,half*2,high*2,all?.26:.185,all?'#993740':lit?'#fbab51':'#204c59',edge,all?.077:.046);
      if(all){
        rounded(ctx,-.50,-.59,1,.365,.14,'#ffda7d','#853e22',.033);label(ctx,'ALL',0,-.398,.29,'#662c21',{max:.9});
        if(!mini){star(ctx,-.49,.045,.080,'#ffcf66');star(ctx,.49,.045,.080,'#ffcf66');}
      }
      label(ctx,num,0,all?.063:.012,all?.60:.454,lit&&!all?'#572839':'#fff7d7',{max:2*half-.04,outline:lit&&!all?'#ffe9aa':'#332d38',stroke:.042});
      ctx.restore();
    });
  }
  const easeFall=t=>{t=clamp(t);return t<.84?(t/.84)**1.75:1-.048*Math.sin((t-.84)/.16*Math.PI);};
  function liveBoard(ctx,s,tr,elapsed,time,mini,reach) {
    drawCachedPlate(ctx);
    const seq = tr && sequence(tr), moving=tr && tr.count>0 && elapsed<seq.end;
    if(!moving) K.cells.forEach((p,i)=>drawPiece(ctx,s.board[i],p.x,p.y,time,mini));
    else if (elapsed<seq.fall) {
      const wave=waveAt(tr,elapsed);
      K.cells.forEach((p,i)=>{
        const w=seq.waveOf[i],dt=w<0?-Infinity:elapsed-(LIGHT+w*WAVE);
        if(dt<0){const charge=w>=0?clamp(1+dt/WARN):0;drawPiece(ctx,tr.before[i],p.x,p.y,time,mini,1,1,charge);}
        else if(dt<130){const a=clamp(dt/130);drawPiece(ctx,tr.before[i],p.x,p.y-.13*a,time,mini,1.18+.25*a,1-a);}
      });
      if(wave>=0){
        const dt=elapsed-LIGHT-wave*WAVE,current=tr.waves[wave];
        if(dt<BURST){
          for(const i of current)burst(ctx,K.cells[i],tr.before[i],i,dt/BURST,mini,wave+1,current.length);
          if(wave>0&&!mini){
            ctx.save();ctx.globalAlpha=.78*(1-dt/BURST);
            polygon(ctx,K.outline,1.017);ctx.setLineDash([.22,.32]);
            ctx.lineDashOffset=-dt*.004;ctx.lineWidth=.048+.014*Math.min(4,wave);
            ctx.strokeStyle=['#fff4a1','#ffba56','#ff8e87','#ff91d2'][Math.min(3,wave-1)];ctx.stroke();ctx.restore();
          }
        }
        const a=clamp((dt-12)/(WAVE-WARN-12));
        if(!mini&&wave+1<tr.waves.length&&a>0&&a<1){
          for(const id of current){
            const power=tr.before[id].power;if(!power)continue;
            const u=K.cells[id],near=power===2?K.radiusTwo[id]:K.neighbors[id];
            for(const j of near){
              if(seq.waveOf[j]!==wave+1)continue;
              const v=K.cells[j],tail=Math.max(0,a-.39),xx=mix(u.x,v.x,a),yy=mix(u.y,v.y,a);
              ctx.beginPath();ctx.moveTo(mix(u.x,v.x,tail),mix(u.y,v.y,tail));ctx.lineTo(xx,yy);
              ctx.strokeStyle=power===2?'#ff8d44':'#ffbe4c';ctx.lineWidth=power===2?.079:.055;ctx.stroke();circle(ctx,xx,yy,.057,'#fff9d4');
            }
          }
        }
      }
      if(elapsed<LIGHT+105){
        const a=elapsed/(LIGHT+75);
        if(!tr.all) shot(ctx,tr.port,a);
        else if(elapsed<LIGHT) {
          // Master ignition charges every live fuse at once. No straight lanes fire.
          for(const i of tr.waves[0]){
            const p=K.cells[i];
            circle(ctx,p.x,p.y,.53-.29*a,null,'#ffdf7e',.045+.04*a);
            star(ctx,p.x+.25,p.y-.36,.11+.13*a,'#fffde3');
          }
        }
      }
    } else {
      ctx.save();polygon(ctx,K.outline,.975);ctx.clip();
      const frame=seq.falls.find(f=>elapsed<f.end);
      if(frame){
        const {step,stationary}=frame,progress=clamp((elapsed-frame.begin)/step.ms);
        for(const i of stationary)drawPiece(ctx,step.before[i],K.cells[i].x,K.cells[i].y,time,mini);
        for(const move of step.moves){const p=K.motionPoint(move,progress);drawPiece(ctx,move.piece,p.x,p.y,time,mini);}
      } else {
        tr.moves.forEach(m=>{
          const p=K.cells[m.to],stagger=Math.abs(m.to%5)*13,t=clamp((elapsed-seq.refill-stagger)/(FILL-55)),e=easeFall(t);
          drawPiece(ctx,m.piece,mix(m.x,p.x,e),mix(m.y,p.y,e),time,mini);
        });
        tr.settled.forEach((piece,i)=>{if(piece)drawPiece(ctx,piece,K.cells[i].x,K.cells[i].y,time,mini);});
      }
      ctx.restore();
    }
    portArt(ctx,s,tr,elapsed,time,mini,reach);
    if(moving && tr.clear && elapsed>=seq.rest && elapsed<seq.fall){
      const a=clamp((elapsed-seq.rest)/120),pulse=Math.sin(a*Math.PI/2);
      ctx.save();ctx.globalAlpha*=pulse;rounded(ctx,-2.7,-.59,5.4,1.18,.46,'#7c263ce8','#ffc85d',.072);
      label(ctx,'全消し！',0,-.12,.52,'#fff0ab',{outline:'#7e362a'});label(ctx,'ALL CLEAR',0,.29,.224,'#ffdd82');ctx.restore();
    }
  }
  function background(ctx,w,h,mini) {
    if(art.back) {
      const img=art.back, s=Math.max(w/img.width,h/img.height),iw=img.width*s,ih=img.height*s;
      ctx.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);
    } else {const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#62b6b8');g.addColorStop(.5,'#fff0ba');g.addColorStop(1,'#ed946c');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
    if(!mini){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(88,30,22,.08)');g.addColorStop(.42,'rgba(255,232,176,0)');g.addColorStop(1,'rgba(57,31,41,.17)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
  }
  function progress(s,tr,elapsed){
    if(!tr||tr.port<0||elapsed>=duration(tr))return {popped:s.popped,clears:s.clears,win:s.win};
    const seq=sequence(tr);let added=0;
    tr.waves.forEach((wave,n)=>{added+=Math.round(wave.length*clamp((elapsed-LIGHT-n*WAVE)/145));});
    const popped=s.popped-tr.count+added, clears=s.clears-(tr.clear&&elapsed<seq.rest?1:0);
    return {popped,clears,win:K.payout(popped,clears,s.bet)};
  }
  function drawTop(ctx,s,opt,x,y,w) {
    const title=Math.min(302,w-73);
    rounded(ctx,x,y,title,31,12,'#a33c3d','#ffdda2',1.8);
    label(ctx,'ポップコーンスプラッシュ',x+title/2,y+15,20,cream,{max:title-12,outline:'#78322e',stroke:2.2});
    const bw=68,bx=x+w-bw;
    rounded(ctx,bx,y,bw,29,12,'#204d50',gold,1.5);
    label(ctx,opt.demo?'デモ':(s.turn+'/8 球'),bx+bw/2,y+14.5,17,cream,{max:bw-8});
  }
  function payoutFrame(ctx,x,y,w,h){
    const img=art.payout;
    if(!img){rounded(ctx,x,y,w,h,12,'#fff1d2','#b95b46',2);return;}
    // Preserve the printed corner ornaments when the narrow mobile tray grows taller.
    const a=Math.round(img.height*.15),b=Math.round(img.height*.12),k=w/img.width;
    ctx.drawImage(img,0,0,img.width,a,x,y,w,a*k);
    ctx.drawImage(img,0,a,img.width,img.height-a-b,x,y+a*k,w,h-(a+b)*k);
    ctx.drawImage(img,0,img.height-b,img.width,b,x,y+h-b*k,w,b*k);
  }
  function payoutScroll(s,tr,elapsed){
    const firstRow=count=>Math.max(0,Math.min(K.popPay.length-7,K.popPay.findLastIndex(([n])=>count>=n)-1));
    if(!tr?.count || elapsed>=duration(tr))return firstRow(s.popped);
    let count=s.popped-tr.count,position=firstRow(count);
    tr.waves.forEach((wave,i)=>{
      const after=count+wave.length;
      for(let row=firstRow(count)+1;row<=firstRow(after);row++){
        const threshold=K.popPay[row+1][0];
        // Use the same 145 ms tally as the visible count; each newly reached tier
        // adds one smooth row of travel, including several tiers in one blast.
        const crossed=LIGHT+i*WAVE+145*(threshold-count-.5)/wave.length;
        const t=clamp((elapsed-crossed)/235);
        position+=t*t*(3-2*t);
      }
      count=after;
    });
    return position;
  }
  function side(ctx,s,state,x,y,w,h,scroll){
    payoutFrame(ctx,x,y,w,h);
    const pad=w*.105,top=w*.165,bottom=w*.137,iw=w-2*pad;
    const sx=iw/150,sy=(h-top-bottom)/490,uniform=Math.sqrt(sx*sy);
    ctx.save();ctx.translate(x+pad,y+top);ctx.scale(sx,sy);
    function type(text,xx,yy,size,color,opts={}){
      ctx.save();ctx.translate(xx,yy);ctx.scale(uniform/sx,uniform/sy);
      label(ctx,text,0,0,size,color,{...opts,max:opts.max===undefined?undefined:opts.max*sx/uniform});ctx.restore();
    }
    function heading(text,y,accent){
      rounded(ctx,0,y,150,25,3.5,'#a12131','#ffca64',1.3);
      rounded(ctx,3,y+2,144,6,2,'#d74a42');
      star(ctx,7,y+13,3.3,gold);star(ctx,143,y+13,3.3,gold);
      type(text,75,y+12.8,18.8,accent,{max:131,outline:'#642434',stroke:2});
    }
    // Dark enamel surrounds separate the count and credit tags like the sample cabinet.
    function row(tag,win,y,selected,bonus,fixed){
      rounded(ctx,2,y,146,20.8,4,'#322837',selected?'#fff19e':'#82462d',selected?1.45:.7);
      rounded(ctx,4,y+1.6,58,17.4,3.7,bonus?'#812d36':fixed?'#bc6484':'#e8b2b7');
      rounded(ctx,65,y+1.6,81,17.4,4,selected?'#fff1a6':fixed?'#f8bc51':'#f4d77b');
      ctx.fillStyle='#fff5bd66';ctx.fillRect(69,y+2.7,69,1.4);
      type(tag,33,y+10.7,15.6,bonus?'#fff0bc':'#44263e',{max:54});
      type(win,141,y+10.7,16.2,'#503024',{align:'right',max:74});
    }
    heading('全消し BONUS',0,'#fff1a5');
    rounded(ctx,0,27,150,178,4,'#39252d','#ffd681',1);
    K.clearPay.forEach(([n,m],i)=>row(n+'回目',Math.floor(s.bet*m+1e-8),29+i*21.6,n===state.clears+1,true,false));
    heading('ODDS',210,'#a0f9fb');
    const active=K.popPay.findIndex(([n],i,a)=>state.popped>=n&&(i===a.length-1||state.popped<a[i+1][0]));
    const highest=K.popPay.length-1;
    const payRow=(i,y,fixed)=>{const [n,m]=K.popPay[i];row(n+'個',Math.floor(s.bet*m+1e-8),y,active===i,false,fixed);};
    rounded(ctx,0,237,150,162,4,'#352532','#fec96c',1);
    payRow(highest,239,true);
    ctx.save();ctx.beginPath();ctx.rect(1,263,148,135);ctx.clip();
    for(let i=Math.min(highest-1,Math.ceil(scroll)+5);i>=Math.floor(scroll);i--)
      payRow(i,263+(scroll+5-i)*22.4,false);
    ctx.restore();
    rounded(ctx,0,405,150,38,7,'#692c45','#ffcc73',1.5);
    type('合計',7,423.5,14,cream,{align:'left'});
    type(state.popped+'個',142,424,24,'#fff2af',{align:'right',max:100});
    rounded(ctx,0,448,150,41,7,'#31263c','#f6b257',1.6);
    type('WIN',7,468,15,'#ffda80',{align:'left'});type(state.win,142,468,24,cream,{align:'right',max:98});
    ctx.restore();
  }
  function footer(ctx,s,tr,elapsed,time,demo,x,y,w) {
    let txt='番号HITで一直線に着火！',accent='#fff0bd',tint='rgba(72,37,43,.9)';
    if(tr && elapsed<duration(tr)){
      const seq=sequence(tr);
      if(tr.port<0) txt='着火番号なし';
      else if(!tr.count)txt='起爆粒なし';
      else if(elapsed<LIGHT)txt=tr.all?'すべての起爆粒に着火！':'着火！';
      else if(elapsed<seq.rest){const n=Math.min(tr.waves.length,Math.floor((elapsed-LIGHT)/WAVE)+1);txt=(tr.all?'全起爆　':'')+(n>1?n+'連鎖！':'ポップ！');accent='#ffefae';tint=['#80392b','#a9432c','#ae3150','#922b77'][Math.min(3,n-1)];}
      else if(elapsed<seq.fall && tr.clear)txt='全消し！';
      else if(elapsed<seq.refill)txt='残った粒が落下！';
      else txt='ポップコーン補充中';
    } else if(demo){txt=['番号HITで一直線に着火！','起爆粒は周囲へ、強起爆は2マス先まで！','ALLで起爆粒に一斉着火！'][Math.floor(time/3700)%3];}
    else if(s.turn>=8) txt='8球終了';
    else if(tr&&tr.count) txt='この球で '+tr.count+' 個 POP！';
    const tw=Math.min(w,336);
    rounded(ctx,x+(w-tw)/2,y,tw,24,10,tint,'#edbc75',1.5);
    label(ctx,txt,x+w/2,y+12,16,accent,{max:tw-18});
  }
  function draw(ctx,s,opt={}) {
    if(!ctx||!s?.board?.length)return;
    const width=opt.width??ctx.canvas.width, height=opt.height??ctx.canvas.height;
    if(!(width>0&&height>0))return;
    const t=Number.isFinite(opt.time)?opt.time:performance.now(),mini=!!opt.mini;
    const tr=opt.turn,elapsed=Math.max(0,opt.elapsed??Infinity),sv=progress(s,tr,elapsed);
    ctx.save();ctx.translate(opt.x||0,opt.y||0);ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
    // Fixed logical height preserves type sizes and line weights at either host pixel ratio.
    const H=540,W=H*width/height;ctx.scale(height/H,height/H);background(ctx,W,H,mini);
    let b,sidebar=null;
    if(mini) b=boardFit(1,1,W-2,H-2);
    else if(W>=419){
      const sw=Math.min(185,Math.max(108,W*.212)),left=sw+3,field=W-left;
      drawTop(ctx,s,opt,left+1,3,field-3);b=boardFit(left,35,field-2,H-63);
      sidebar=[1,1,sw,H-2];footer(ctx,s,tr,elapsed,t,opt.demo,left+1,H-26,field-3);
    } else {
      drawTop(ctx,s,opt,4,4,W-8);b=boardFit(2,39,W-4,H-122);
      rounded(ctx,5,H-80,W-10,42,12,'#20545b',gold,1.5);
      label(ctx,sv.popped+' 個　／　全消し '+sv.clears+' 回',12,H-59,17,cream,{align:'left',max:W*.55});
      label(ctx,sv.win+' WIN',W-14,H-59,22,'#ffdc86',{align:'right',max:W*.35});
      footer(ctx,s,tr,elapsed,t,opt.demo,5,H-28,W-10);
    }
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.k,b.k);liveBoard(ctx,s,tr,elapsed,t,mini,opt.reach);ctx.restore();
    if(sidebar)side(ctx,s,sv,...sidebar,payoutScroll(s,tr,elapsed));
    ctx.restore();
  }
  window.PopcornView={draw,duration,waveAt,assetsReady:Promise.all(loading),get artVersion(){return artVersion;}};
})();
