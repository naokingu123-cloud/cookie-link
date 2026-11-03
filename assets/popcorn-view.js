/* Popcorn Splash — the main panel and its thumbnail share one geometry. */
(() => {
  'use strict';
  const K = window.PopcornEngine;
  if (!K) throw new Error('Load PopcornEngine before PopcornView');
  const clamp = n => Math.max(0, Math.min(1, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const font = '"Arial Rounded MT Bold","Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif';
  const palette = ['#fff4cf', '#4bbbf7', '#67d389', '#ffdc52', '#ff9835', '#f4535d', '#af7bea'];
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
  loadAsset('pieces', 'popcorn-pieces.webp?v=80');
  loadAsset('payout', 'popcorn-payout-frame.webp');
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
    if (opts.outline) { ctx.strokeStyle = opts.outline; ctx.lineWidth = (opts.stroke || size*.13)*k; ctx.strokeText(text, 0, 0, max); }
    ctx.fillStyle = color; ctx.fillText(text, 0, 0, max);ctx.restore();
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
    polygon(ctx,K.outline,.952);ctx.strokeStyle='#e89869';ctx.lineWidth=.022;ctx.stroke();
    if(art.carton){
      const radius=Math.max(...K.outline.map(p=>Math.abs(p.x)));
      const halfHeight=Math.max(...K.outline.map(p=>Math.abs(p.y)));
      const w=2*radius*1.09,h=2*halfHeight*1.09;
      ctx.drawImage(art.carton,-w/2,-h/2,w,h);
    }
    K.cells.forEach(p => drawCup(ctx,p.x,p.y));
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
  const bounds = {
    left:Math.min(...K.ports.map(p=>p.x-.42),...K.outline.map(p=>p.x*1.09)),
    right:Math.max(...K.ports.map(p=>p.x+.42),...K.outline.map(p=>p.x*1.09)),
    top:Math.min(...K.outline.map(p=>p.y*1.09))-.008,
    bottom:Math.max(...K.ports.map(p=>p.y+.34),...K.outline.map(p=>p.y*1.09))
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
      const sheet=document.createElement('canvas');sheet.width=7*tile;sheet.height=2*tile;
      const sc=sheet.getContext('2d');sc.imageSmoothingQuality='high';
      sc.drawImage(art.pieces,0,0,sheet.width,sheet.height);sprites[tile]=sheet;
    }
    return sprites[tile];
  }
  function drawPiece(ctx,p,x,y,time,mini,scale=1,alpha=1) {
    if(!p || scale<.02 || alpha<.02)return;
    ctx.save();ctx.translate(x,y-.035);ctx.scale(scale,scale);ctx.globalAlpha*=alpha;
    const c=p.color||0,img=spriteAtlas(mini),seed=p.id||0;
    if(p.bomb) {
      const pulse=mini?.68:(1+Math.sin(time*.007+seed))/2;
      ctx.beginPath();ctx.ellipse(0,.07,.436,.36,0,0,TAU);ctx.fillStyle='rgba(255,146,26,'+(.16+.13*pulse)+')';ctx.fill();
      ctx.lineWidth=.065;ctx.strokeStyle= pulse>.57?'#ffe695':'#ffad47';ctx.stroke();
    }
    if(img) {
      const size=p.bomb?.99:.90;
      ctx.save();if(!p.bomb)ctx.rotate((seed%5-2)*.047);
      const tile=img.width/7;
      ctx.drawImage(img,c*tile,p.bomb?tile:0,tile,tile,-size*.5,-size*.53,size,size);ctx.restore();
    } else {
      // A lightweight first-paint kernel while the asset pack decodes.
      for (const [dx,dy,r] of [[-.18,0,.22],[.14,-.05,.25],[-.05,-.17,.2],[.06,.11,.22],[-.1,.08,.17]])circle(ctx,dx,dy,r,palette[c]);
      circle(ctx,-.08,-.16,.08,'#fff8');
      if(p.bomb){ctx.beginPath();ctx.moveTo(.14,-.20);ctx.quadraticCurveTo(.23,-.47,.35,-.34);ctx.strokeStyle='#6b3326';ctx.lineWidth=.065;ctx.stroke();}
    }
    if(p.bomb){const a=mini?.7:(1+Math.sin(time*.014+seed*.77))/2;star(ctx,.27,-.37,.085+.065*a,'#ffe376');star(ctx,.27,-.37,.055+.035*a,'#fffdf1');}
    ctx.restore();
  }
  const LIGHT=200, WAVE=230, BURST=285, CLEAR=480, DROP=455, FILL=535;
  const traces=new WeakMap();
  function sequence(tr) {
    let a=traces.get(tr);if(a)return a;
    if (tr.port<0) {a={end:470};traces.set(tr,a);return a;}
    if(!tr.count){a={rest:460,fall:460,refill:460,end:770};traces.set(tr,a);return a;}
    const waveOf=new Int16Array(K.cells.length);waveOf.fill(-1);
    tr.waves.forEach((wave,n)=>wave.forEach(i=>{waveOf[i]=n;}));
    const rest=LIGHT+Math.max(0,tr.waves.length-1)*WAVE+BURST;
    const fall=rest+(tr.clear?CLEAR:90);
    const survivors=tr.moves.filter(m=>m.from>=0);
    const refill=fall+(survivors.some(m=>m.from!==m.to)?DROP:0);
    const destinations=new Set(tr.moves.map(m=>m.to));
    const still=K.cells.map((_,i)=>i).filter(i=>!destinations.has(i));
    a={waveOf,still,rest,fall,refill,end:refill+FILL};traces.set(tr,a);return a;
  }
  function duration(trace) {return trace?sequence(trace).end:0;}
  function waveAt(trace, elapsed) {
    if (!trace || trace.port<0 || elapsed<LIGHT) return -1;
    return Math.min(trace.waves.length-1, Math.floor((elapsed-LIGHT)/WAVE));
  }
  function shot(ctx,index,progress) {
    const p=K.ports[index],seq=p.line;if(!seq.length)return;
    const last=K.cells[seq[seq.length-1]], length=(last.x-p.x)*p.dx+(last.y-p.y)*p.dy;
    const end={x:p.x+length*p.dx,y:p.y+length*p.dy},a=clamp(progress*1.24),fade=1-clamp((progress-.64)/.55);
    ctx.save();ctx.globalAlpha*=fade;ctx.lineCap='round';
    for(const [s,color] of [[.22,'#ff6f1f'],[.107,'#ffcc48'],[.032,'#fffcdd']]) {
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mix(p.x,end.x,a),mix(p.y,end.y,a));ctx.strokeStyle=color;ctx.lineWidth=s;ctx.stroke();
    }
    star(ctx,mix(p.x,end.x,a),mix(p.y,end.y,a),.19,'#fff5a2');ctx.restore();
  }
  function burst(ctx,pt,p,i,t,mini) {
    const a=clamp(t),fade=1-a;if(fade<=0)return;
    ctx.save();ctx.translate(pt.x,pt.y);ctx.globalAlpha*=fade;
    circle(ctx,0,0,.14+.54*a,null,p.bomb?'#ffce54':'#fff3c0',(1-a)*.13+.025);
    if(!mini)for(let n=0;n<(p.bomb?8:5);n++) {
      const angle=TAU*n/(p.bomb?8:5)+i*.79;const d=.14+(.48+(n%3)*.105)*a;const px=Math.cos(angle)*d,py=Math.sin(angle)*d+.11*a*a;
      if(n%2)star(ctx,px,py,(.096+.05*(n%3))*(1-.62*a),n%3?'#ffeaaa':'#fff');
      else circle(ctx,px,py,.07*(1-.5*a),palette[p.color]);
    }
    ctx.restore();
  }
  function portArt(ctx,s,tr,elapsed,time,mini,reach) {
    const hit=tr && tr.port>=0, change=hit?sequence(tr).rest:0;
    const hitNumbers=hit && elapsed<change?tr.beforeNumbers:s.numbers;
    K.ports.forEach((p,i)=>{
      const all=i===s.allIndex,fired=hit&&tr.port===i,lit=fired&&elapsed<change;
      const flipped=fired&&elapsed>=change&&elapsed<change+260,num=hitNumbers[i];
      const re=reach?.find?.(v=>Number(v.number??v.n??v)===num),type=re?.kind??re?.level??'reach';
      const edge=lit?'#fffcdb':re?({all:'#ff94d6',super:'#ff73a0',high:'#ffb839'}[type]||'#6cf6ec'):(all?'#ffe095':'#f7bc71');
      ctx.save();ctx.translate(p.x,p.y);
      if(!mini && !all) {
        // The arrow and laser point along this side's inward normal.
        ctx.save();ctx.rotate(Math.atan2(p.dy,p.dx));ctx.beginPath();
        ctx.moveTo(.43,-.107);ctx.lineTo(.635,0);ctx.lineTo(.43,.107);ctx.closePath();
        ctx.fillStyle=lit?'#fff9bd':'#ffe3a6';ctx.fill();ctx.strokeStyle='#793e37';ctx.lineWidth=.029;ctx.stroke();ctx.restore();
      }
      if(flipped){const phase=clamp((elapsed-change)/260);ctx.scale(1+.17*Math.sin(Math.PI*phase),1+.17*Math.sin(Math.PI*phase));}
      if(!mini && (lit||flipped||re)) {const s=(1+Math.sin(time*.009+i*.34))/2;rounded(ctx,-.413-s*.025,-.319-s*.025,.826+s*.05,.638+s*.05,.225,null,edge,.035);}
      rounded(ctx,-.382,-.307,.764,.614,.205,all?'#a84422':lit?'#ed9042':'#204c59',edge,.048);
      if(all){ctx.save();ctx.translate(0,-.236);rounded(ctx,-.348,-.151,.696,.275,.08,'#ffd16b','#98472b',.024);label(ctx,'ALL',0,-.004,.212,'#632c26',{max:.63});ctx.restore();}
      label(ctx,num??'?',0,all?.065:.012,.454,lit?'#572839':'#fff7d7',{max:.69,outline:lit?'#ffe9aa':'#332d38',stroke:.043});
      ctx.restore();
    });
  }
  const easeFall=t=>{t=clamp(t);return t<.84?(t/.84)**1.75:1-.048*Math.sin((t-.84)/.16*Math.PI);};
  function liveBoard(ctx,s,tr,elapsed,time,mini,reach) {
    drawCachedPlate(ctx);
    const seq = tr && sequence(tr), moving=tr && tr.count>0 && elapsed<seq.end;
    if(!moving) K.cells.forEach((p,i)=>drawPiece(ctx,s.board[i],p.x,p.y,time,mini));
    else if (elapsed<seq.fall) {
      K.cells.forEach((p,i)=>{
        const w=seq.waveOf[i],dt=w<0?-1:elapsed-(LIGHT+w*WAVE);
        if(dt<0) drawPiece(ctx,tr.before[i],p.x,p.y,time,mini);
        else if(dt<BURST){const a=clamp(dt/125);drawPiece(ctx,tr.before[i],p.x,p.y-.10*a,time,mini,1+.24*a,1-a);burst(ctx,p,tr.before[i],i,dt/BURST,mini);}
      });
      if(!mini){
        const n=waveAt(tr,elapsed),a=clamp((elapsed-LIGHT-n*WAVE-40)/(WAVE-45));
        if(n>=0&&n+1<tr.waves.length&&a>0&&a<1) {
          for(const id of tr.waves[n]){
            if(!tr.before[id].bomb)continue;
            const u=K.cells[id];
            for(const j of K.neighbors[id]){
              if(seq.waveOf[j]!==n+1) continue;
              const v=K.cells[j],tail=Math.max(0,a-.32);
              ctx.beginPath();ctx.moveTo(mix(u.x,v.x,tail),mix(u.y,v.y,tail));
              const xx=mix(u.x,v.x,a),yy=mix(u.y,v.y,a);
              ctx.lineTo(xx,yy);ctx.strokeStyle='#ffb845';ctx.lineWidth=.077;ctx.stroke();circle(ctx,xx,yy,.046,'#fff9d4');
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
      seq.still.forEach(i=>drawPiece(ctx,tr.after[i],K.cells[i].x,K.cells[i].y,time,mini));
      tr.moves.forEach(m=>{
        const p=K.cells[m.to],isNew=m.from<0;
        if(isNew&&elapsed<seq.refill)return;
        const stagger=isNew?Math.abs(m.to%5)*13:0;
        const t=isNew?clamp((elapsed-seq.refill-stagger)/(FILL-55)):clamp((elapsed-seq.fall)/DROP);
        const e=easeFall(t);drawPiece(ctx,m.piece,mix(m.x,p.x,e),mix(m.y,p.y,e),time,mini);
      });ctx.restore();
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
    if(!tr||tr.port<0||elapsed>=duration(tr))return {popped:s.popped,clears:s.clears,win:s.win,filled:s.refilled};
    const seq=sequence(tr);let added=0;
    tr.waves.forEach((wave,n)=>{added+=Math.round(wave.length*clamp((elapsed-LIGHT-n*WAVE)/145));});
    const popped=s.popped-tr.count+added, clears=s.clears-(tr.clear&&elapsed<seq.rest?1:0);
    return {popped,clears,win:K.payout(popped,clears,s.bet),filled:s.refilled-tr.count+Math.round(tr.count*clamp((elapsed-seq.refill)/FILL))};
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
    // A fixed highest award and a descending payout ladder follow Gelato's cabinet.
    const pad=w*.099,top=w*.255,bottom=w*.185,iw=w-2*pad;
    const sx=iw/150,sy=(h-top-bottom)/410,uniform=Math.sqrt(sx*sy);
    ctx.save();ctx.translate(x+pad,y+top);ctx.scale(sx,sy);
    // Keep small ledger digits square even when the cabinet has to be tall and narrow.
    function type(text,xx,yy,size,color,opts={}){
      ctx.save();ctx.translate(xx,yy);ctx.scale(uniform/sx,uniform/sy);
      label(ctx,text,0,0,size,color,{...opts,max:opts.max===undefined?undefined:opts.max*sx/uniform});ctx.restore();
    }
    const mid=75,wide=146, red='#863942';
    rounded(ctx,0,0,150,62,9,'#723344',gold,1.5);
    type('はじけた数',mid,14,15,cream,{max:132});type(state.popped+' 個',mid,41,27,'#ffedb2',{max:129});
    type('個数配当',4,76,15,ink,{align:'left'});type('WIN',146,76,14,teal,{align:'right'});
    const active=K.popPay.findIndex(([n],i,a)=>state.popped>=n&&(i===a.length-1||state.popped<a[i+1][0]));
    const highest=K.popPay.length-1;
    function payRow(i,yy,fixed){
      const [n,m]=K.popPay[i],selected=active===i, cx=2;
      const flag=selected?'#c85d43':fixed?'#a14948':i%2?'#fae9bf':'#f7dcad';
      rounded(ctx,cx,yy,wide,23.2,4.5,flag,selected?'#ffd76b':null,1.2);
      type(n+'個',7,yy+11.8,15,selected||fixed?cream:ink,{align:'left',max:62});
      type(Math.floor(s.bet*m+1e-8),143,yy+11.8,16.2,selected||fixed?'#ffefa8':red,{align:'right',max:72});
    }
    payRow(highest,89,true);
    ctx.save();ctx.beginPath();ctx.rect(0,121,150,144);ctx.clip();
    for(let i=Math.min(highest-1,Math.ceil(scroll)+5);i>=Math.floor(scroll);i--)
      payRow(i,121+(scroll+5-i)*24,false);
    ctx.restore();
    rounded(ctx,1,274,148,44,8,'#f9e1b6','#c88c56',1);
    type('全消し '+state.clears+'回',mid,286,15,red,{max:135});
    const next=K.clearPay.find(([n])=>n>state.clears);
    type(next?(next[0]+'回 '+Math.floor(s.bet*next[1]+1e-8)+' WIN'):'最高ボーナス',mid,306,13,ink,{max:132});
    const col=K.colorFor(state.filled);
    type('補充色',4,336,12,teal,{align:'left'});
    for(let i=0;i<7;i++)circle(ctx,52+i*15,336,i===col?6.4:4.6,palette[i],i===col?ink:'#cba97f',i===col?1.7:.7);
    rounded(ctx,0,354,150,48,9,'#723344',gold,1.4);
    type('WIN',7,378,14,'#ffd98a',{align:'left'});type(state.win,142,378,27,cream,{align:'right',max:96});
    ctx.restore();
  }
  function footer(ctx,s,tr,elapsed,time,demo,x,y,w) {
    let txt='番号HITで一直線に着火！',accent='#fff0bd';
    if(tr && elapsed<duration(tr)){
      const seq=sequence(tr);
      if(tr.port<0) txt='着火番号なし';
      else if(!tr.count)txt='起爆粒なし';
      else if(elapsed<LIGHT)txt=tr.all?'すべての起爆粒に着火！':'着火！';
      else if(elapsed<seq.rest){const n=Math.min(tr.waves.length,Math.floor((elapsed-LIGHT)/WAVE)+1);txt=(tr.all?'全起爆　':'')+(n>1?n+'連鎖！':'ポップ！');accent='#ffdd71';}
      else if(elapsed<seq.fall && tr.clear)txt='全消し！';
      else if(elapsed<seq.refill)txt='残った粒が落下！';
      else txt='ポップコーン補充中';
    } else if(demo){txt=['番号HITで一直線に着火！','火花の粒はまわりに誘爆！','ALLで起爆粒に一斉着火！'][Math.floor(time/3700)%3];}
    else if(s.turn>=8) txt='8球終了';
    else if(tr&&tr.count) txt='この球で '+tr.count+' 個 POP！';
    const tw=Math.min(w,336);
    rounded(ctx,x+(w-tw)/2,y,tw,24,10,'rgba(72,37,43,.9)','#edbc75',1.5);
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
      const sw=Math.min(185,Math.max(108,W*.212)),sx=W-sw-1;
      drawTop(ctx,s,opt,3,3,sx-6);b=boardFit(1,35,sx-3,H-63);
      sidebar=[sx,1,sw,H-2];footer(ctx,s,tr,elapsed,t,opt.demo,3,H-26,sx-6);
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
