/* Popcorn Splash — the main panel and its thumbnail share one geometry. */
(() => {
  'use strict';
  const K = window.PopcornEngine;
  if (!K) throw new Error('Load PopcornEngine before PopcornView');
  const clamp = n => Math.max(0, Math.min(1, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const font = '"Arial Rounded MT Bold","Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif';
  const payoutFace='ArcadePayout, Georgia, serif';
  const kernelColors=['#fff5dc','#ffcd35','#f74b38','#b761ec','#3a9dfb','#ffe4a2'];
  const blastPaint=[null,
    {rim:'#9e5919',light:'#ffe878',spark:'#fff7b0',wash:'rgba(255,191,36,.19)'},
    {rim:'#ab3238',light:'#ff8771',spark:'#fff0a9',wash:'rgba(255,76,54,.17)'},
    {rim:'#6a3098',light:'#e99cff',spark:'#fff1ff',wash:'rgba(189,85,249,.20)'},
    {rim:'#313f9f',light:'#6ceeff',spark:'#e8ffff',wash:'rgba(61,147,255,.24)'},
    {rim:'#bc407a',light:'#fff29a',spark:'#fffdf4',wash:'rgba(255,172,229,.23)'}
  ];
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
  loadAsset('stall', 'popcorn-stall-v83.webp');
  loadAsset('hatch', 'popcorn-hatch-v83.webp');
  loadAsset('allSign', 'popcorn-all-sign-v88.webp');
  loadAsset('upSign', 'popcorn-up-sign-v88.webp');
  loadAsset('pieces', 'popcorn-kernels-v85.webp');
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
    ctx.font = (opts.weight || 900) + ' ' + size*k + 'px ' + (opts.face||font);
    ctx.textAlign = opts.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const max=opts.max==null?undefined:opts.max*k, text=String(s);
    if(max!==undefined){const advance=ctx.measureText(text).width;if(advance>max)ctx.scale(max/advance,1);}
    if (opts.outline) { ctx.strokeStyle = opts.outline; ctx.lineWidth = (opts.stroke || size*.13)*k; ctx.strokeText(text, 0, 0); }
    if(opts.rainbow!==undefined){
      const w=Math.max(1,ctx.measureText(text).width),g=ctx.createLinearGradient(-w/2,0,w/2,0);
      const t=Math.floor(opts.rainbow/150)%spectrum.length;
      for(let n=0;n<spectrum.length;n++)g.addColorStop(n/(spectrum.length-1),spectrum[(n+t)%spectrum.length]);
      ctx.fillStyle=g;
    } else ctx.fillStyle=color;
    ctx.fillText(text,0,0);ctx.restore();
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
    top:-5.82,
    bottom:Math.max(...badges.map(p=>p.y+.64),...K.outline.map(p=>p.y*1.09))
  };
  function boardFit(x,y,w,h) {
    const k=Math.min(w/(bounds.right-bounds.left),h/(bounds.bottom-bounds.top));
    return {k,x:x+w/2-k*(bounds.right+bounds.left)/2,y:y+h/2-k*(bounds.bottom+bounds.top)/2};
  }
  function layout(width,height,mini=false){
    const H=540,W=H*width/height;
    if(mini)return {H,W,b:boardFit(1,1,W-2,H-2)};
    if(W>=419){
      const sw=Math.min(185,Math.max(108,W*.212)),left=sw+3,field=W-left;
      return {H,W,b:boardFit(left,2,field-2,H-31),left:left+1,field:field-3,sidebar:[1,1,sw,H-2]};
    }
    return {H,W,b:boardFit(2,3,W-4,H-88),left:4,field:W-8};
  }
  function star(ctx,x,y,r,fill) {
    ctx.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4;const d=r*(j%2?.24:1);const xx=x+Math.cos(a)*d,yy=y+Math.sin(a)*d;if(j)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  }
  function spriteAtlas(mini) {
    if(!art.pieces) return null;
    const tile=mini?18:54;
    if(!sprites[tile]) {
      const sheet=document.createElement('canvas');sheet.width=kernelColors.length*tile;sheet.height=tile;
      const sc=sheet.getContext('2d');sc.imageSmoothingQuality='high';
      sc.drawImage(art.pieces,0,0,sheet.width,sheet.height);sprites[tile]=sheet;
    }
    return sprites[tile];
  }
  function drawPiece(ctx,p,x,y,time,mini,scale=1,alpha=1,warn=0,stretch=1,heat='#fff59f') {
    if(!p || scale<.02 || alpha<.02)return;
    const power=p.power,seed=p.id,wiggle=warn*Math.sin(warn*21+seed*.9);
    const squat=clamp((warn-.50)*2);
    ctx.save();ctx.translate(x+.055*wiggle,y-.035+.055*squat);
    ctx.scale(scale*(1+.09*warn+.19*squat),scale*stretch*(1+.06*warn-.31*squat));ctx.globalAlpha*=alpha;
    if(warn)ctx.rotate(wiggle*.10);
    if(power){
      const pulse=mini?.65:(1+Math.sin(time*.008+seed))/2;
      ctx.beginPath();ctx.ellipse(0,.07,.436,.36,0,0,TAU);ctx.fillStyle=blastPaint[power].wash;ctx.fill();
      ctx.lineWidth=.041+.014*power;ctx.strokeStyle=pulse>.57?blastPaint[power].spark:blastPaint[power].light;ctx.stroke();
      if(power>1){ctx.beginPath();ctx.ellipse(0,.065,.49,.413,0,0,TAU);ctx.strokeStyle=blastPaint[power].light;ctx.lineWidth=.035;ctx.stroke();}
    }
    const img=spriteAtlas(mini),size=power?1:.9;
    if(img) {
      ctx.save();if(!power)ctx.rotate((seed%5-2)*.047);
      const tile=img.width/kernelColors.length;ctx.drawImage(img,power*tile,0,tile,tile,-size*.5,-size*.53,size,size);ctx.restore();
    } else {
      for(const [dx,dy,r] of [[-.18,0,.22],[.14,-.05,.25],[-.05,-.17,.2],[.06,.11,.22],[-.1,.08,.17]])circle(ctx,dx,dy,r,kernelColors[power]);
      if(power){ctx.beginPath();ctx.moveTo(.14,-.20);ctx.quadraticCurveTo(.23,-.47,.35,-.34);ctx.strokeStyle='#6b3326';ctx.lineWidth=.065;ctx.stroke();}
    }
    if(power){const a=mini?.7:(1+Math.sin(time*.014+seed*.77))/2;star(ctx,.26,-.37,.09+.072*a,blastPaint[power].light);star(ctx,.26,-.37,.052+.04*a,blastPaint[power].spark);}
    if(warn){
      const pulse=.5+.5*Math.sin(warn*17);
      ctx.globalAlpha*=.35+.65*pulse;circle(ctx,0,0,.44+.08*warn,null,heat,.070);
      if(!mini){for(let i=0;i<4;i++){const a=i*Math.PI/2+seed*.6;const r=.40+.14*warn;star(ctx,r*Math.cos(a),r*Math.sin(a),.075+.04*warn,'#fff6ae');}}
    }
    ctx.restore();
  }
  const LIGHT=625, FRONT_START=45, FRONT_TRAVEL=410, WAVE=480, BURST=455, CLEAR=480, SERVE_OPEN=112, SERVE_CLOSE=96;
  const SNAP=62,RING_START=[0,SNAP,123,152],RING_HIT=[0,217,283,338];
  const hexDistance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
  // Jagged seams meet inside the generated kernel. Each lobe keeps its own
  // original frosting, outline and highlights as it peels away from the center.
  const lobes=[
    {center:[.27,.28],fly:[-.71,-.83],spin:-1.25,shape:[[0,0],[.56,0],[.48,.21],[.55,.34],[.49,.43],[.51,.53],[.33,.47],[.23,.54],[0,.48]]},
    {center:[.75,.27],fly:[.74,-.76],spin:1.08,shape:[[.56,0],[1,0],[1,.54],[.80,.46],[.67,.55],[.51,.53],[.49,.43],[.55,.34],[.48,.21]]},
    {center:[.24,.74],fly:[-.66,.37],spin:-1.64,shape:[[0,.48],[.23,.54],[.33,.47],[.51,.53],[.47,.67],[.54,.81],[.47,1],[0,1]]},
    {center:[.75,.75],fly:[.70,.46],spin:1.47,shape:[[.51,.53],[.67,.55],[.80,.46],[1,.54],[1,1],[.47,1],[.54,.81],[.47,.67]]}
  ];
  const popSheets=new Map();
  function popSheet(power,mini){
    if(!art.pieces)return null;
    const key=2*power+Number(mini);if(popSheets.has(key))return popSheets.get(key);
    const px=mini?54:146,n=mini?6:14,cols=n/2;
    const sheet=document.createElement('canvas');sheet.width=cols*px;sheet.height=px*2;
    const c=sheet.getContext('2d'),tile=art.pieces.width/kernelColors.length,zoom=px/3.55;
    for(let i=0;i<n;i++){
      const t=i/(n-1),travel=1-(1-t)**1.65,shrink=1-.40*t;
      c.save();c.translate((i%cols+.5)*px,(Math.floor(i/cols)+.5)*px);c.scale(zoom,zoom);
      c.globalAlpha=Math.min(1,(1-t)*3.15);
      for(const lobe of lobes){
        const [cx,cy]=lobe.center,[vx,vy]=lobe.fly;
        c.save();
        const start=power?1.32:1.19,flight=1+Math.max(0,power-1)*.10;
        c.translate((cx-.5)*start+vx*travel*flight,(cy-.53)*start+vy*travel*flight-.18+.87*t*t);
        c.rotate(lobe.spin*t);c.scale(shrink*start,shrink*start);c.translate(-cx,-cy);
        c.beginPath();lobe.shape.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
        c.drawImage(art.pieces,tile*power,0,tile,tile,0,0,1,1);c.restore();
      }
      c.restore();
    }
    const pack={sheet,n,cols,px};popSheets.set(key,pack);return pack;
  }
  function fragments(ctx,p,pt,dt,mini){
    const f=popSheet(p.power,mini);if(!f)return;
    const t=clamp((dt-SNAP)/(BURST-SNAP)),i=Math.min(f.n-1,Math.floor(t*f.n));
    ctx.save();ctx.translate(pt.x,pt.y-.035);ctx.rotate(((p.id%7)-3)*.054);
    ctx.drawImage(f.sheet,i%f.cols*f.px,Math.floor(i/f.cols)*f.px,f.px,f.px,-1.775,-1.775,3.55,3.55);ctx.restore();
  }
  const BOLT_START=56,BOLT_END=295,RAIN_START=58,RAIN_END=340;
  const spectrum=['#ff6e86','#ffac5f','#ffef82','#7dedaa','#70e3f9','#7798ff','#e798f8'];
  const domains=[];
  function domain(i){
    if(domains[i])return domains[i];
    const p=K.cells[i],rays=[];
    K.lightningAxes[i].forEach(axis=>{
      // Use the same two diagonals and horizontal row as the live blast and guide.
      const first=K.cells[axis[0]],last=K.cells[axis.at(-1)];
      const vx=last.x-first.x,vy=last.y-first.y,length=Math.hypot(vx,vy);
      const dx=vx/length,dy=vy/length;
      for(const sign of [-1,1]){
        const u=dx*sign,v=dy*sign;let edge=Infinity;
        for(let k=0;k<K.outline.length;k++){
          const a=K.outline[k],b=K.outline[(k+1)%K.outline.length],ex=(b.x-a.x)*.977,ey=(b.y-a.y)*.977;
          const cx=a.x*.977-p.x,cy=a.y*.977-p.y,det=u*ey-v*ex;
          if(Math.abs(det)<1e-7)continue;
          const t=(cx*ey-cy*ex)/det,side=(cx*v-cy*u)/det;
          if(t>=0&&side>=-1e-8&&side<=1.00000001)edge=Math.min(edge,t);
        }
        if(Number.isFinite(edge))rays.push({dx:u,dy:v,length:edge});
      }
    });
    return domains[i]={rays,boltMax:Math.max(...rays.map(v=>v.length)),rainMax:Math.max(...K.outline.map(v=>Math.hypot(v.x-p.x,v.y-p.y)))};
  }
  function contactTime(power,from,to){
    const p=K.cells[from],q=K.cells[to];
    if(power<=3)return RING_HIT[hexDistance(p,q)];
    const d=Math.hypot(q.x-p.x,q.y-p.y),geom=domain(from);
    return power===4?BOLT_START+(BOLT_END-BOLT_START)*d/geom.boltMax:RAIN_START+(RAIN_END-RAIN_START)*d/geom.rainMax;
  }
  const traces=new WeakMap();
  let flashTexture;
  function sequence(tr) {
    let a=traces.get(tr);if(a)return a;
    const waveOf=new Int16Array(K.cells.length);waveOf.fill(-1);
    tr.waves.forEach((wave,n)=>wave.forEach(i=>{waveOf[i]=n;}));
    // Link each newly ignited cell to the first real parent front that reaches it.
    // A simultaneous blast can share targets without drawing a mesh of duplicate trails.
    const arrival=new Float32Array(K.cells.length);arrival.fill(Infinity);
    const parent=new Int16Array(K.cells.length);parent.fill(-1);
    const trails=tr.waves.map(()=>[]);
    if(tr.waves[0]){
      if(tr.all)tr.waves[0].forEach(i=>{arrival[i]=105;});
      else{
        const port=K.ports[tr.port],end=K.cells[port.line.at(-1)];
        const distance=cell=>(cell.x-port.x)*port.dx+(cell.y-port.y)*port.dy;
        tr.waves[0].forEach(i=>{arrival[i]=FRONT_START+FRONT_TRAVEL*distance(K.cells[i])/distance(end);});
      }
    }
    tr.waves.forEach((wave,n)=>{
      const start=LIGHT+n*WAVE;
      for(const i of wave){
        const power=tr.before[i].power;if(!power)continue;
        const neighborhood=K.blastAreas[power][i];
        for(const j of neighborhood){
          if(waveOf[j]!==n+1)continue;
          const when=start+contactTime(power,i,j);
          if(when<arrival[j]){arrival[j]=when;parent[j]=i;}
        }
      }
    });
    parent.forEach((i,j)=>{if(i>=0){const w=waveOf[i];trails[w].push({from:i,to:j,hit:arrival[j]-LIGHT-w*WAVE,ring:hexDistance(K.cells[i],K.cells[j])});}});
    const rest=tr.boost?500:tr.count?LIGHT+(tr.waves.length-1)*WAVE+BURST:(tr.port>=0?LIGHT:390);
    const fall=rest+(tr.boost?510:tr.clear?CLEAR:tr.count?90:0);
    let cursor=fall;
    function frame(step,ms){
      const begin=cursor;cursor+=ms;
      const moving=new Set(step.moves.map(m=>m.from));
      const stationary=step.before.map((p,i)=>p&&!moving.has(i)?i:-1).filter(i=>i>=0);
      return {step,begin,end:cursor,stationary};
    }
    const falls=tr.fallSteps.map(step=>frame(step,step.ms)),refill=cursor;
    const served=tr.refillSteps.length>0;
    if(served)cursor+=SERVE_OPEN;
    const supply=tr.refillSteps.map((step,i)=>frame(step,.52*(step.kind==='spawn'?(i===0?170:119):Math.max(102,step.ms*.84))));
    const end=cursor+(served?SERVE_CLOSE:tr.count?90:310);
    const rainbow=tr.waves.some(w=>w.some(i=>tr.before[i].power===5));
    a={waveOf,arrival,parent,trails,falls,supply,served,rest,fall,refill,end,rainbow};traces.set(tr,a);return a;
  }
  function duration(trace) {return trace?sequence(trace).end:0;}
  function refilling(trace,elapsed){
    if(!trace)return false;
    const seq=sequence(trace);return seq.served&&elapsed>=seq.refill&&elapsed<seq.end;
  }
  function waveAt(trace, elapsed) {
    if (!trace || trace.port<0 || elapsed<LIGHT) return -1;
    return Math.min(trace.waves.length-1, Math.floor((elapsed-LIGHT)/WAVE));
  }
  function flame(ctx,x,y,dx,dy,size,time,mini){
    const flicker=Math.sin(time*.034+x*.8);
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx)+Math.PI/2);ctx.scale(size,size);
    // Upright, forked flame face with a white-hot core; the flame points in the
    // travel direction on the two sloping banks as well as the vertical bank.
    ctx.beginPath();ctx.moveTo(-.13,.38);
    ctx.bezierCurveTo(-.55,.28,-.47,-.04,-.29,-.31);
    ctx.quadraticCurveTo(-.32,-.10,-.18,-.03);
    ctx.bezierCurveTo(-.20,-.28,.10,-.43,.07+.05*flicker,-.71);
    ctx.quadraticCurveTo(.36,-.49,.26,-.20);ctx.quadraticCurveTo(.39,-.22,.43,-.36);
    ctx.bezierCurveTo(.63,-.02,.42,.28,.18,.37);ctx.quadraticCurveTo(.03,.44,-.13,.38);
    ctx.fillStyle='#ff5f21';ctx.fill();ctx.lineWidth=.041;ctx.strokeStyle='#9e3021';ctx.stroke();
    ctx.beginPath();ctx.moveTo(-.12,.32);ctx.quadraticCurveTo(-.34,.21,-.24,-.06);
    ctx.quadraticCurveTo(-.16,.08,-.10,.055);ctx.quadraticCurveTo(-.15,-.15,.055,-.37);
    ctx.quadraticCurveTo(.045,-.13,.20,-.09);ctx.quadraticCurveTo(.28,-.13,.29,-.20);
    ctx.quadraticCurveTo(.41,.13,.15,.31);ctx.quadraticCurveTo(.01,.38,-.12,.32);
    ctx.fillStyle='#ffdc42';ctx.fill();
    if(!mini){ctx.beginPath();ctx.moveTo(-.075,.26);ctx.quadraticCurveTo(-.18,.19,-.065,.03);
      ctx.quadraticCurveTo(-.06,.09,.005,.10);ctx.lineTo(.08,-.07);ctx.quadraticCurveTo(.25,.26,.04,.29);ctx.fillStyle='#fffddd';ctx.fill();}
    ctx.restore();
  }
  function shot(ctx,index,elapsed,mini){
    const port=K.ports[index],badge=badges[index],end=K.cells[port.line.at(-1)];
    const u=clamp((elapsed-FRONT_START)/FRONT_TRAVEL),join=clamp(elapsed/FRONT_START);
    const x=mix(port.x,end.x,u),y=mix(port.y,end.y,u),length=Math.hypot(end.x-port.x,end.y-port.y);
    const fade=1-clamp((elapsed-FRONT_START-FRONT_TRAVEL)/(LIGHT-FRONT_START-FRONT_TRAVEL));
    if(fade<=0)return;
    ctx.save();ctx.globalAlpha*=fade;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo(badge.x,badge.y);ctx.lineTo(mix(badge.x,port.x,join),mix(badge.y,port.y,join));
    if(join===1)ctx.lineTo(x,y);ctx.strokeStyle='#ff842e';ctx.lineWidth=.13;ctx.stroke();
    if(join<1)star(ctx,mix(badge.x,port.x,join),mix(badge.y,port.y,join),.24,'#ffdf62');
    else{
      const tail=clamp(u-1.55/length);
      ctx.beginPath();ctx.moveTo(mix(port.x,end.x,tail),mix(port.y,end.y,tail));ctx.lineTo(x,y);
      ctx.strokeStyle='#ffd14b';ctx.lineWidth=.22;ctx.stroke();
      flame(ctx,x,y,port.dx,port.dy,mini?.82:1.16,elapsed,mini);
      if(!mini)for(let i=1;i<=4;i++){
        const back=i*.23,side=.09*Math.sin(elapsed*.022+i*1.8);
        if(back<u*length)circle(ctx,x-port.dx*back+port.dy*side,y-port.dy*back-port.dx*side,.045+(i%2)*.024,i%2?'#ffb337':'#fff0a5');
      }
    }
    ctx.restore();
  }
  function shockFront(ctx,r,energy,grade,ring,mini){
    const colors=blastPaint[grade];ctx.save();ctx.globalAlpha*=energy;
    ctx.beginPath();
    for(let k=0;k<6;k++){const a=k*TAU/6,x=r*Math.cos(a),y=r*Math.sin(a);if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
    ctx.closePath();ctx.fillStyle=colors.wash;ctx.fill();ctx.lineJoin='round';
    ctx.strokeStyle=colors.rim;ctx.lineWidth=mini?.12:.145;ctx.stroke();
    ctx.strokeStyle=colors.light;ctx.lineWidth=mini?.069:.080;ctx.stroke();
    if(!mini)for(let k=0;k<6;k++){const a=k*TAU/6;star(ctx,r*Math.cos(a),r*Math.sin(a),.052+.011*ring,colors.spark);}
    ctx.restore();
  }
  function lightning(ctx,i,dt,mini){
    if(dt<BOLT_START)return;
    const geom=domain(i),q=clamp((dt-BOLT_START)/(BOLT_END-BOLT_START)),reach=q*geom.boltMax;
    const flick=Math.floor(dt/46),alpha=1-.73*clamp((dt-BOLT_END)/(BURST-BOLT_END));
    ctx.save();ctx.globalAlpha*=alpha;ctx.lineJoin='round';ctx.lineCap='round';
    ctx.beginPath();
    geom.rays.forEach((v,ri)=>{
      const end=Math.min(reach,v.length);ctx.moveTo(0,0);
      if(!mini)for(let n=1,d=.24;d<end;n++,d+=.24){
        const jitter=(n%2?1:-1)*(.055+.065*(1+Math.sin(n*7.5+ri*2+flick*1.56))/2);
        ctx.lineTo(v.dx*d-v.dy*jitter,v.dy*d+v.dx*jitter);
      }
      ctx.lineTo(v.dx*end,v.dy*end);
    });
    for(const [width,color] of [[.19,'#514ccb'],[.113,'#58dbff'],[.044,'#edffff']]){
      ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
    }
    if(!mini)for(const v of geom.rays){const end=Math.min(reach,v.length);star(ctx,v.dx*end,v.dy*end,.12,'#c9ffff');}
    ctx.restore();
  }
  function rainbowWash(ctx,i,dt,mini){
    if(dt<RAIN_START)return;
    const point=K.cells[i],geom=domain(i),q=clamp((dt-RAIN_START)/(RAIN_END-RAIN_START)),r=q*geom.rainMax;
    ctx.save();ctx.translate(-point.x,-point.y);polygon(ctx,K.outline,.977);ctx.clip();ctx.translate(point.x,point.y);
    const fade=1-.86*clamp((dt-RAIN_END)/(BURST-RAIN_END));
    ctx.globalAlpha*=fade;circle(ctx,0,0,Math.max(.02,r),'rgba(255,237,166,.16)');
    const bands=mini?3:spectrum.length;
    for(let k=0;k<bands;k++){
      const radius=r-k*(mini?.12:.105);if(radius<=.01)break;
      circle(ctx,0,0,radius,null,spectrum[Math.round(k*(spectrum.length-1)/(bands-1))],mini?.16:.155);
    }
    if(r>.03){circle(ctx,0,0,r+.05,null,'#fffdda',.061);
      if(!mini)for(let k=0;k<12;k++){const a=k*TAU/12+q*.2;star(ctx,r*Math.cos(a),r*Math.sin(a),.093+.036*(k%3),'#fffef0');}}
    ctx.restore();
  }
  function burst(ctx,pt,p,i,dt,mini,chain,crowd) {
    const a=clamp(dt/BURST),fade=1-a;if(fade<=0)return;
    const power=p.power;
    ctx.save();ctx.translate(pt.x,pt.y);
    if(power===4)lightning(ctx,i,dt,mini);
    else if(power===5)rainbowWash(ctx,i,dt,mini);
    else for(let ring=1;ring<=power;ring++){
      if(dt<RING_START[ring])continue;
      const q=clamp((dt-RING_START[ring])/(RING_HIT[ring]-RING_START[ring]));
      const intensity=1-.84*clamp((dt-RING_HIT[ring])/(BURST-RING_HIT[ring]));
      shockFront(ctx,.10+(ring-.10)*q,intensity,power,ring,mini);
    }
    if(!mini && dt<195){
      if(!flashTexture){
        flashTexture=document.createElement('canvas');flashTexture.width=flashTexture.height=80;
        const g=flashTexture.getContext('2d'),halo=g.createRadialGradient(40,40,0,40,40,40);
        halo.addColorStop(0,'#fffdeb');halo.addColorStop(.28,'#fff5aabf');halo.addColorStop(.63,'#ffac4575');halo.addColorStop(1,'#fb752100');
        g.fillStyle=halo;g.fillRect(0,0,80,80);
      }
      ctx.save();ctx.globalAlpha*=Math.sin(Math.PI*clamp(dt/195))*(power?.91:.64);
      const size=(power?1.72:1.14)*(.62+.50*clamp(dt/195));
      ctx.drawImage(flashTexture,-size/2,-size/2,size,size);ctx.restore();
    }
    if(dt>=SNAP&&!mini){
      const u=clamp((dt-SNAP)/(BURST-SNAP)),n=Math.min(power?8:5,Math.max(2,Math.floor(68/crowd)));
      ctx.save();ctx.globalAlpha*=Math.min(1,1.65*(1-u));
      for(let j=0;j<n;j++){
        const angle=TAU*j/n+i*.81,dist=.30+(.48+.09*(j%3))*(1-(1-u)**1.8);
        const x=Math.cos(angle)*dist,y=Math.sin(angle)*dist-.25*u+.40*u*u;
        if(j%2===0)circle(ctx,x,y,.04+.065*(1-u),power?blastPaint[power].light:'#fff3ce');
        else star(ctx,x,y,.07+.06*(1-u),chain>2?'#ffe2b9':'#fff7cb');
      }
      ctx.restore();
    }
    ctx.restore();
  }
  const master={x:-3.83,y:-3.48},boostBadge={x:4.04,y:-3.62};
  const badgePositions=[...badges,master,boostBadge];
  function pickPort(width,height,localX,localY){
    if(!(width>0&&height>0&&localX>=0&&localX<=width&&localY>=0&&localY<=height))return -1;
    const {H,b}=layout(width,height),x=(localX*H/height-b.x)/b.k,y=(localY*H/height-b.y)/b.k;
    let chosen=-1,best=1;
    for(let i=0;i<badgePositions.length;i++){
      const p=badgePositions[i],boost=p===boostBadge,all=p===master;
      const dx=(x-p.x)/(boost?.95:all?.88:.67),dy=(y-p.y-(boost?.09:all?-.065:0))/(boost?.96:all?.76:.60);
      const d=dx*dx+dy*dy;if(d<best){best=d;chosen=i;}
    }
    return chosen;
  }
  const projections=new WeakMap();
  function guideFor(s,tr,elapsed,focus){
    if(tr&&elapsed<duration(tr)){
      if(tr.boost)return {port:s.boostIndex,num:tr.oldNumber,boost:true,waves:[]};
      return tr.port>=0&&elapsed<LIGHT?{port:tr.port,num:tr.oldNumber,waves:tr.waves,board:tr.before,arrival:sequence(tr).arrival,elapsed}:null;
    }
    if(!Number.isInteger(focus)||focus<0||focus>=s.numbers.length)return null;
    if(focus===s.boostIndex)return {port:focus,num:s.numbers[focus],boost:true,waves:[]};
    let rows=projections.get(s.board);if(!rows){rows=[];projections.set(s.board,rows);}
    const num=s.numbers[focus];
    if(!rows[focus]||rows[focus].num!==num)rows[focus]={port:focus,num,waves:K.preview(s,num).waves,board:s.board};
    return rows[focus];
  }
  const railColors=['#ffd492','#9cf0eb','#ffbdd5'];
  function lane(ctx,i,selected){
    const p=K.ports[i],cells=p.line.map(j=>K.cells[j]),first=cells[0],end=cells.at(-1);
    const color=selected?'#ffde71':railColors[Math.floor(i/5)],bottom=i>=5&&i<10;
    ctx.save();ctx.lineCap='round';ctx.strokeStyle=color;
    if(selected){
      ctx.beginPath();ctx.moveTo(first.x-.67*p.dx,first.y-.67*p.dy);ctx.lineTo(end.x+.36*p.dx,end.y+.36*p.dy);
      ctx.setLineDash(bottom?[.21,.10]:[]);ctx.lineWidth=.105;ctx.stroke();ctx.setLineDash([]);
    }
    // Draw route segments between kernels, leaving their faces unobscured.
    ctx.beginPath();
    for(let j=1;j<cells.length;j++){
      const a=cells[j-1],b=cells[j],d=.32;
      ctx.moveTo(a.x+d*p.dx,a.y+d*p.dy);ctx.lineTo(b.x-d*p.dx,b.y-d*p.dy);
    }
    ctx.moveTo(first.x-.68*p.dx,first.y-.68*p.dy);ctx.lineTo(first.x-.37*p.dx,first.y-.37*p.dy);
    ctx.moveTo(end.x+.30*p.dx,end.y+.30*p.dy);ctx.lineTo(end.x+.48*p.dx,end.y+.48*p.dy);
    ctx.setLineDash(bottom?[.09,.105]:[]);ctx.lineWidth=selected?.094:.058;ctx.stroke();ctx.restore();
  }
  let railSheet;
  function railMap(ctx){
    if(!railSheet){
      railSheet=document.createElement('canvas');railSheet.width=railSheet.height=880;
      const c=railSheet.getContext('2d');c.translate(440,440);c.scale(80,80);
      for(let i=0;i<K.ports.length;i++)lane(c,i,false);
    }
    ctx.drawImage(railSheet,-5.5,-5.5,11,11);
  }
  function guideCells(ctx,guide,mini,time){
    if(!guide||guide.boost)return;
    const pulse=mini?.5:(.5+.5*Math.sin(time*.006));
    ctx.save();
    if(!mini&&!guide.arrival){
      const sources=guide.waves.flat().filter(i=>guide.board[i]?.power===4);
      if(sources.length){
        ctx.save();ctx.globalAlpha=.58/Math.sqrt(sources.length);ctx.setLineDash([.14,.10]);ctx.beginPath();
        for(const i of sources){const p=K.cells[i];for(const v of domain(i).rays){
          ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+v.dx*v.length,p.y+v.dy*v.length);
        }}
        ctx.strokeStyle='#90efff';ctx.lineWidth=.045;ctx.stroke();ctx.restore();
      }
    }
    guide.waves.forEach((wave,n)=>{
      const direct=n===0;
      for(const i of wave){
        const p=K.cells[i],power=guide.board[i]?.power||0;
        ctx.globalAlpha=guide.arrival?(direct&&guide.elapsed>=guide.arrival[i]?1:direct?.38:.24):1;
        ctx.beginPath();ctx.ellipse(p.x,p.y,.448,.42,0,0,TAU);
        ctx.lineWidth=direct?.117:.095;ctx.strokeStyle=direct?'#914a20':'#165366';ctx.stroke();
        ctx.lineWidth=direct?.077:.056;
        ctx.strokeStyle=direct?'#ffe483':'#91f4ef';ctx.stroke();
        if(!mini&&direct)star(ctx,p.x+.33,p.y-.30,.066+.034*pulse,power?blastPaint[power].spark:'#fff8bd');
      }
    });
    ctx.restore();
  }
  const reachNames=['リーチ','高額','超高額','全消し'];
  const reachColors=['#7ef0f9','#ff537b','#cd79ff','#ffdb96'];
  const tierFor=r=>({reach:0,high:1,super:2,all:3}[r.kind]??r.tier??0);
  const trimTracks=new Map();
  function trimTrack(rx,ry){
    if(trimTracks.has(rx))return trimTracks.get(rx);
    const r=rx>.55?.12:.202,w=2*(rx-r),h=2*(ry-r),arc=Math.PI*r/2;
    // Each straight section is followed clockwise by its own quarter-circle.
    const sides=[
      [-rx+r,-ry,1,0,w,rx-r,-ry+r,-Math.PI/2],
      [rx,-ry+r,0,1,h,rx-r,ry-r,0],
      [rx-r,ry,-1,0,w,-rx+r,ry-r,Math.PI/2],
      [-rx,ry-r,0,-1,h,-rx+r,-ry+r,Math.PI]
    ];
    const perimeter=2*(w+h)+4*arc;
    const point=t=>{
      let d=((t%1+1)%1)*perimeter;
      for(const [x,y,dx,dy,len,cx,cy,start] of sides){
        if(d<=len)return [x+dx*d,y+dy*d];d-=len;
        if(d<=arc){const angle=start+d/r;return [cx+r*Math.cos(angle),cy+r*Math.sin(angle)];}
        d-=arc;
      }
      return [-rx+r,-ry];
    };
    const track={r,point};trimTracks.set(rx,track);return track;
  }
  function reachTrim(ctx,tier,rx,ry,time,index,mini){
    const track=trimTrack(rx,ry),phase=(time*(tier===2?.0041:tier===3?.0031:.00275)+index*.41)/TAU;
    const pulse=.5+.5*Math.sin(time*(tier?.006:.004)+index);
    const outline=(color,width)=>rounded(ctx,-rx,-ry,2*rx,2*ry,track.r,null,color,width);
    function trail(start,end,color,width){
      const steps=Math.max(3,Math.ceil((end-start)*64));
      ctx.beginPath();
      for(let j=0;j<=steps;j++){
        const [x,y]=track.point(mix(start,end,j/steps));if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      }
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    }
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';outline('#543349',.113);
    if(tier===0){
      outline('#56dbe7',.060+.020*pulse);
      const n=mini?2:4;
      for(let i=0;i<n;i++){const [x,y]=track.point(phase*.58+i/n);star(ctx,x,y,mini?.048:.069,'#edfffd');}
    }else if(tier===1||tier===2){
      outline(reachColors[tier],.043);
      for(let i=0;i<2;i++){
        const pos=phase+i*.5;trail(pos-.23,pos,reachColors[tier],.104);trail(pos-.075,pos,'#fff5dc',.050);
        const [x,y]=track.point(pos);circle(ctx,x,y,mini?.044:.057,'#fffdf2');
      }
    }else{
      for(let i=0;i<spectrum.length;i++)trail(phase+i/spectrum.length,phase+(i+1)/spectrum.length,spectrum[i],.10);
      if(!mini)for(let i=0;i<3;i++){const [x,y]=track.point(phase*.67+i/3);star(ctx,x,y,.072,'#fff5b7');}
    }
    ctx.restore();
  }
  function reachTag(ctx,tier,y,time,mini){
    if(mini&&tier!==3)return;
    const title=reachNames[tier],w=tier===1?.66:.88,h=.262;
    rounded(ctx,-w/2,y-h/2,w,h,.085,'#39283f',reachColors[tier],.022);
    label(ctx,title,0,y,mini?.197:.242,reachColors[tier],{face:'SweetReachRounded,'+font,max:w-.045,rainbow:tier===3?time:undefined});
  }
  function hangSigns(ctx){
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(const [p,side] of [[master,-1],[boostBadge,1]]){
      ctx.beginPath();ctx.moveTo(side*3.13,-4.61);ctx.lineTo(p.x,-4.61);ctx.lineTo(p.x,p.y-.44);
      for(const [c,w] of [['#783d31',.19],['#e3a74e',.130],['#ffe4a3',.041]]){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
      circle(ctx,p.x,-4.61,.105,'#b5783b','#fff1bb',.034);
    }
    ctx.restore();
  }
  function portArt(ctx,s,tr,elapsed,time,mini,reach,guide) {
    const hit=tr && tr.port>=0, change=hit?sequence(tr).rest:0;
    const numbers=hit && elapsed<change?tr.beforeNumbers:s.numbers;
    numbers.forEach((num,i)=>{
      const all=i===s.allIndex,boost=i===s.boostIndex,special=all||boost,p=badgePositions[i];
      const fired=hit&&tr.port===i,lit=fired&&elapsed<change,flipped=fired&&elapsed>=change&&elapsed<change+260;
      const re=!boost&&reach?.find?.(v=>Number(v.number??v.n??v)===num),tier=re?tierFor(re):-1;
      const inspected=guide?.port===i;
      const edge=lit||inspected?'#fff2a7':re?reachColors[tier]:(boost?'#baed87':all?'#ffd878':'#f7bc71');
      ctx.save();ctx.translate(p.x,p.y);
      if(!mini && !special){
        const gate=K.ports[i],first=K.cells[gate.line[0]],gx=first.x-.69*gate.dx-p.x,gy=first.y-.69*gate.dy-p.y;
        ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(gx,gy);ctx.strokeStyle=lit?'#fff8ac':'#d6a451';ctx.lineWidth=.055;ctx.stroke();
        ctx.translate(gx,gy);ctx.rotate(Math.atan2(gate.dy,gate.dx));ctx.beginPath();
        ctx.moveTo(-.08,-.095);ctx.lineTo(.15,0);ctx.lineTo(-.08,.095);ctx.closePath();
        ctx.fillStyle=lit?'#fff9bd':'#ffe3a6';ctx.fill();ctx.strokeStyle='#793e37';ctx.lineWidth=.029;ctx.stroke();ctx.restore();
      }
      if(flipped){const f=clamp((elapsed-change)/260),k=1+.16*Math.sin(Math.PI*f);ctx.scale(k,k);}
      const half=special?.685:.376,high=special?.415:.292;
      const sign=all?art.allSign:boost?art.upSign:null;
      if(sign){
        ctx.drawImage(sign,-.94,-.84,1.88,1.62);
        if(lit||inspected||flipped)rounded(ctx,-.652,-.48,1.304,.867,.135,null,edge,.060);
      } else {
        rounded(ctx,-half,-high,half*2,high*2,special?.26:.185,boost?(lit?'#49984b':'#245e4b'):all?'#993740':lit?'#fbab51':inspected?'#925327':'#204c59',edge,special?.077:.046);
        if(!mini&&(lit||flipped||inspected)){
          const extra=.034+.027*Math.sin(time*.009+i*.34);
          rounded(ctx,-half-extra,-high-extra,2*(half+extra),2*(high+extra),.205,null,edge,.037);
        }
      }
      if(re)reachTrim(ctx,tier,sign?.79:half+.020,sign?.45:high+.020,time,i,mini);
      if(all){
        if(!sign)rounded(ctx,-.50,-.59,1,.365,.14,'#ffda7d','#853e22',.033);
        label(ctx,'ALL',0,sign?-.32:-.398,.285,sign?'#ffe8a5':'#662c21',{max:1.05,outline:sign?'#702f36':null,stroke:.025});
      }
      if(boost){
        const changing=tr?.boost&&elapsed<sequence(tr).fall;
        const lv=changing&&elapsed<change?tr.oldLevel:s.level;
        if(!sign)rounded(ctx,-.66,-.61,1.32,.39,.14,'#dcf2a0','#3f6b3e',.036);
        label(ctx,mini?'UP':'ボム率UP',0,sign?-.38:-.407,mini?.31:.262,sign?'#f3ffd6':'#244b2c',{max:1.22});
        if(!sign)rounded(ctx,-.76,.365,1.52,.365,.13,'#315f48','#cae797',.035);
        label(ctx,(mini?'Lv':'補充Lv')+lv,0,sign?.36:.548,mini?.268:.245,'#f5ffd9',{max:1.29});
        if(changing){
          const q=(elapsed%350)/350,light=1-.50*q;
          ctx.save();ctx.globalAlpha*=light;ctx.strokeStyle='#ecffa6';ctx.lineWidth=.072;ctx.lineCap='round';ctx.lineJoin='round';
          for(const xx of [-.56,.56]){
            const yy=.14-.23*q;ctx.beginPath();ctx.moveTo(xx-.072,yy+.085);ctx.lineTo(xx,yy);ctx.lineTo(xx+.072,yy+.085);ctx.stroke();
          }ctx.restore();
        }
      }
      label(ctx,num,0,boost&&sign?-.025:special?.063:.012,boost&&sign?.48:special?.60:.454,lit&&!special?'#572839':'#fff7d7',{max:2*half-.04,outline:lit&&!special?'#ffe9aa':'#332d38',stroke:mini&&tier===3?.055:.042,rainbow:mini&&tier===3?time+i*97:undefined});
      if(re)reachTag(ctx,tier,special?.742:.451,time+i*97,mini);
      ctx.restore();
    });
  }
  function serviceAt(seq,elapsed){
    if(!seq?.served||elapsed<seq.refill||elapsed>=seq.end)return null;
    const enter=clamp((elapsed-seq.refill)/70),leave=clamp((seq.end-elapsed)/SERVE_CLOSE);
    const eased=n=>n*n*(3-2*n);
    const raised=eased(Math.min(enter,leave));
    const open=eased(Math.min(clamp((elapsed-seq.refill-22)/72),clamp((seq.end-elapsed-16)/65)));
    return {raised,open,y:-5.77+.11*raised};
  }
  const awningW=6.88,awningH=1.43,restingStand={raised:0,open:0,y:-5.77};
  function foodStand(ctx,stage,front){
    const img=art.stall;
    if(!stage||!img)return;
    const x=-awningW/2,y=stage.y,w=awningW,h=awningH;
    // Stretch the serving window, preserving both decorated end caps. All five
    // physical inlets (-2..2) sit inside the dark opening of the raster stand.
    const edges=[0,.239,.764,1],cuts=[0,.143,.857,1];
    ctx.save();
    if(!front){
      for(let n=0;n<3;n++){
        const x0=Math.round(img.width*edges[n]),x1=Math.round(img.width*edges[n+1]);
        ctx.drawImage(img,x0,0,x1-x0,img.height,x+w*cuts[n],y,w*(cuts[n+1]-cuts[n]),h);
      }
    } else if(art.hatch){
      const yy=y+h*.687,sh=h*.255;
      ctx.save();ctx.beginPath();ctx.rect(x+w*.140,yy,w*.720,sh*1.02);ctx.clip();
      ctx.drawImage(art.hatch,x+w*.140,yy-sh*stage.open,w*.720,sh);ctx.restore();
    }
    ctx.restore();
  }
  function movingFrame(ctx,f,time,mini){
    const {step,stationary,progress}=f;
    for(const i of stationary)drawPiece(ctx,step.before[i],K.cells[i].x,K.cells[i].y,time,mini);
    for(const m of step.moves){
      const a=step.kind==='spawn'?progress*(.5+.5*progress):progress;
      const pt=K.motionPoint(m,a);drawPiece(ctx,m.piece,pt.x,pt.y,time,mini);
    }
  }
  let socketImage;
  function emptySocket(ctx,p){
    if(!socketImage){
      const c=document.createElement('canvas');c.width=c.height=82;
      const g=c.getContext('2d');g.translate(41,41);g.scale(76,76);
      g.beginPath();g.ellipse(0,.007,.443,.359,0,0,TAU);g.fillStyle='#48303c';g.fill();
      g.lineWidth=.042;g.strokeStyle='#c09178';g.stroke();
      g.beginPath();g.ellipse(0,.005,.365,.277,0,0,TAU);
      const shade=g.createLinearGradient(0,-.27,0,.28);shade.addColorStop(0,'#211e2d');shade.addColorStop(1,'#49333f');g.fillStyle=shade;g.fill();
      g.lineCap='round';g.strokeStyle='#8a6d72';g.lineWidth=.025;g.beginPath();
      for(let j=-1;j<=1;j++){g.moveTo(j*.115-.042,.061);g.lineTo(j*.115+.042,-.061);}g.stroke();
      socketImage=c;
    }
    ctx.drawImage(socketImage,p.x-.54,p.y-.54,1.08,1.08);
  }
  function liveBoard(ctx,s,tr,elapsed,time,mini,reach,guide) {
    drawCachedPlate(ctx);
    const seq=tr&&sequence(tr),active=!!tr&&elapsed<seq.end;
    const moving=active&&(tr.port>=0||seq.served),service=active?serviceAt(seq,elapsed):null;
    const stepFrame=moving&&elapsed>=seq.fall?(elapsed<seq.refill?seq.falls.find(f=>elapsed<f.end):seq.supply.find(f=>elapsed>=f.begin&&elapsed<f.end)):null;
    // Keep the empty-cup overlay fixed throughout falling and refilling.
    // Per-step occupancy flickered whenever a piece vacated or entered a cell.
    const gaps=!moving?s.board:elapsed<seq.fall?tr.before:tr.after;
    K.cells.forEach((p,i)=>{
      const w=seq?.waveOf[i]??-1;
      if(!gaps[i]||(moving&&elapsed<seq.fall&&w>=0&&elapsed>LIGHT+w*WAVE+SNAP))emptySocket(ctx,p);
    });
    const showRails=!active||elapsed<LIGHT;
    if(showRails&&guide?.port<K.ports.length)lane(ctx,guide.port,true);
    // The mini renders only the actual board, rim, and integrated numbered reach plaques.
    if(!mini){hangSigns(ctx);foodStand(ctx,service||restingStand,false);}
    if(!moving)K.cells.forEach((p,i)=>drawPiece(ctx,s.board[i],p.x,p.y,time,mini));
    else if (elapsed<seq.fall) {
      const wave=waveAt(tr,elapsed);
      K.cells.forEach((p,i)=>{
        const w=seq.waveOf[i],dt=w<0?-Infinity:elapsed-(LIGHT+w*WAVE);
        if(dt<0){
          const ignited=w>=0&&elapsed>=seq.arrival[i],span=LIGHT+w*WAVE-seq.arrival[i];
          const charge=ignited?.22+.78*clamp((elapsed-seq.arrival[i])/span):0;
          const parent=seq.parent[i],grade=parent>=0?tr.before[parent].power:0,heat=grade===5?spectrum[i%spectrum.length]:grade?blastPaint[grade].light:'#fff59f';
          drawPiece(ctx,tr.before[i],p.x,p.y,time,mini,1,1,charge,1,heat);
        } else if(dt<SNAP){
          const a=clamp(dt/SNAP);
          drawPiece(ctx,tr.before[i],p.x,p.y-.18*a,time,mini,1.26+.06*a,1,0,.64+.49*a);
        }
      });
      if(wave>=0){
        const dt=elapsed-LIGHT-wave*WAVE,current=tr.waves[wave];
        if(dt<BURST){
          for(const i of current)burst(ctx,K.cells[i],tr.before[i],i,dt,mini,wave+1,current.length);
          if(!mini){
            for(const trl of seq.trails[wave]){
              const grade=tr.before[trl.from].power;
              const start=grade<=3?RING_START[trl.ring]:(grade===4?BOLT_START:RAIN_START);
              const u=clamp((dt-start)/(trl.hit-start));
              const source=K.cells[trl.from],target=K.cells[trl.to];
              if(grade<=3&&u>0&&u<1){
                const tail=Math.max(0,u-.31),xx=mix(source.x,target.x,u),yy=mix(source.y,target.y,u);
                ctx.beginPath();ctx.moveTo(mix(source.x,target.x,tail),mix(source.y,target.y,tail));ctx.lineTo(xx,yy);
                ctx.strokeStyle=blastPaint[tr.before[trl.from].power].light;ctx.lineWidth=.068;ctx.stroke();circle(ctx,xx,yy,.060,'#fffad5');
              } else if(dt>=trl.hit && dt<trl.hit+110){
                const q=(dt-trl.hit)/110;
                const color=grade===5?spectrum[(trl.to+wave)%spectrum.length]:blastPaint[grade].spark;
                ctx.save();ctx.globalAlpha=1-q;circle(ctx,target.x,target.y,.35+.20*q,null,color,.085);ctx.restore();
              }
            }
          }
          if(dt>=SNAP)for(const i of current)fragments(ctx,tr.before[i],K.cells[i],dt,mini);
          if(wave>0&&!mini){
            ctx.save();ctx.globalAlpha=.78*(1-dt/BURST);
            polygon(ctx,K.outline,1.017);ctx.setLineDash([.22,.32]);
            ctx.lineDashOffset=-dt*.004;ctx.lineWidth=.048+.014*Math.min(4,wave);
            ctx.strokeStyle=['#fff4a1','#ffba56','#ff8e87','#ff91d2'][Math.min(3,wave-1)];ctx.stroke();ctx.restore();
          }
        }
      }
      if(!tr.boost&&tr.port>=0&&elapsed<LIGHT){
        if(tr.port<K.ports.length)shot(ctx,tr.port,elapsed,mini);
        for(const i of tr.waves[0]||[]){
          const age=elapsed-seq.arrival[i];if(age<0)continue;
          const p=K.cells[i],q=clamp(age/(tr.all?360:175));
          if(tr.all||q<1){
            ctx.save();ctx.globalAlpha*=tr.all?.65+.35*Math.sin(q*Math.PI):1-q*.8;
            flame(ctx,p.x+.20,p.y-.36,0,-1,(tr.all?.65:.55)*(1+.17*Math.sin(age*.031+i)),elapsed+i*15,mini);ctx.restore();
          }
        }
      }
    } else {
      ctx.save();polygon(ctx,K.outline,.975);
      // During supply the texture's open mouth and the top row form one visible
      // passage; internal movements remain inside the board after admission.
      if(service)ctx.rect(-2.51,service.y+awningH*.69,5.02,-3.18-(service.y+awningH*.69));
      ctx.clip();
      if(stepFrame){
        const progress=clamp((elapsed-stepFrame.begin)/(stepFrame.end-stepFrame.begin));
        movingFrame(ctx,{...stepFrame,progress},time,mini);
      } else {
        const board=seq.served&&elapsed>=seq.end-SERVE_CLOSE?tr.after:tr.settled;
        board.forEach((piece,i)=>{if(piece)drawPiece(ctx,piece,K.cells[i].x,K.cells[i].y,time,mini);});
      }
      ctx.restore();
    }
    if(!mini)foodStand(ctx,service||restingStand,true);
    if(showRails && !mini){
      ctx.save();ctx.globalAlpha=guide?.30:.82;railMap(ctx);ctx.restore();
      guideCells(ctx,guide,false,time);
    }
    portArt(ctx,s,tr,elapsed,time,mini,reach,guide);
    if(!mini && moving && tr.clear && elapsed>=seq.rest && elapsed<seq.fall){
      const a=clamp((elapsed-seq.rest)/120),pulse=Math.sin(a*Math.PI/2);
      ctx.save();ctx.globalAlpha*=pulse;rounded(ctx,-2.7,-.59,5.4,1.18,.46,'#7c263ce8','#ffc85d',.072);
      if(seq.rainbow){
        ctx.save();ctx.setLineDash([.44,.15]);polygon(ctx,K.outline,.982);ctx.lineWidth=.095;
        for(let k=0;k<spectrum.length;k++){ctx.setLineDash([.24,1.44]);ctx.lineDashOffset=-k*.24;ctx.strokeStyle=spectrum[k];ctx.stroke();}ctx.restore();
      }
      label(ctx,seq.rainbow?'虹ボム 全消し！':'全消し！',0,-.12,seq.rainbow?.45:.52,'#fff0ab',{outline:'#7e362a'});
      label(ctx,seq.rainbow?'RAINBOW ALL CLEAR':'ALL CLEAR',0,.29,.224,'#ffdd82');ctx.restore();
    }
  }
  function background(ctx,w,h,mini) {
    if(art.back) {
      const img=art.back, s=Math.max(w/img.width,h/img.height),iw=img.width*s,ih=img.height*s;
      ctx.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);
    } else {const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#62b6b8');g.addColorStop(.5,'#fff0ba');g.addColorStop(1,'#ed946c');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
    if(!mini){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(88,30,22,.08)');g.addColorStop(.42,'rgba(255,232,176,0)');g.addColorStop(1,'rgba(57,31,41,.17)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
  }
  function shownPopped(s,tr,elapsed){
    if(!tr?.count||elapsed>=duration(tr))return s.popped;
    let count=s.popped-tr.count;
    const last=waveAt(tr,elapsed);
    for(let i=0;i<=last;i++)count+=tr.waves[i].length;
    return count;
  }
  function progress(s,tr,elapsed){
    const popped=shownPopped(s,tr,elapsed);
    const clears=s.clears-(tr?.clear&&elapsed<sequence(tr).rest?1:0);
    return {popped,clears,win:K.payout(popped,clears,s.bet,s.firstPopAward),sugar:!!s.sugarAwarded&&popped>=s.sugarTarget};
  }
  function thresholdTime(s,tr,target){
    if(!tr?.count||s.popped<target)return Infinity;
    let count=s.popped-tr.count;if(count>=target)return -Infinity;
    for(let i=0;i<tr.waves.length;i++){
      const n=tr.waves[i].length;
      if(count+n>=target)return LIGHT+i*WAVE;
      count+=n;
    }
    return Infinity;
  }
  function drawRound(ctx,s,opt,x,y,w) {
    const bw=62,bx=x+w-bw;
    rounded(ctx,bx,y,bw,25,10,'#204d50',gold,1.5);
    label(ctx,opt.demo?'デモ':(s.turn+'/8 球'),bx+bw/2,y+12.5,16,cream,{max:bw-8});
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
  function side(ctx,s,state,x,y,w,h,tr,elapsed,sugarIcon){
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
    // Counts and credit amounts occupy separate tags. Every credit tag has its own unit.
    function sweet(xx,yy,size){
      const w=size*uniform/sx,h=size*uniform/sy;
      if(sugarIcon)ctx.drawImage(sugarIcon,xx-w/2,yy-h/2,w,h);
      else{ctx.save();ctx.translate(xx,yy);ctx.scale(uniform/sx,uniform/sy);star(ctx,0,0,size*.48,'#f6c9ff');star(ctx,0,0,size*.29,'#e777e6');ctx.restore();}
    }
    function row(tag,amount,y,height,active,bonus){
      const mid=y+height/2,inner=height-3;
      const strength=Number(active)||0;
      rounded(ctx,1,y,148,height,4,'#37222c','#8d5134',.75);
      rounded(ctx,3,y+1.5,48,inner,3,bonus?'#8a303a':'#f0c4bc');
      rounded(ctx,53,y+1.5,94,inner,3,'#683145');
      if(strength>0){
        ctx.save();ctx.globalAlpha*=strength;
        rounded(ctx,1,y,148,height,4,null,'#fff5a8',1.6);
        rounded(ctx,3,y+1.5,48,inner,3,bonus?'#ffe285':'#f49ea8');
        rounded(ctx,53,y+1.5,94,inner,3,'#854654');ctx.restore();
      }
      ctx.fillStyle='#fff0b540';ctx.fillRect(57,y+2.5,84,1.0);
      type(tag,27,mid,18.2,bonus&&strength<.55?'#fff2bd':'#4b293b',{max:45});
      // Gelato and Winery show the credit digits ungrouped. Keep WIN attached
      // in the same gold payout face while reserving a smaller suffix width.
      type(String(amount),120,mid,20.8,'#ffedb0',{align:'right',max:64.5,face:payoutFace,weight:750});
      type('WIN',145.4,mid+1.4,13.2,'#ffdf8a',{align:'right',max:23.5,face:payoutFace,weight:750});
    }
    heading('全消し BONUS',0,'#fff1a5');
    const bonusH=27,bonusY=29,maxBonus=K.clearPay.length;
    const topFor=n=>Math.min(maxBonus,Math.max(3,n+1));
    const after=s.clears,before=tr?.clear?after-1:after;
    const q=tr?.clear?clamp((elapsed-sequence(tr).rest)/320):1,t=q*q*(3-2*q);
    const bonusTop=mix(topFor(before),topFor(after),t),chosen=before?mix(before,after,t):after;
    const show=before?1:after?t:0;
    ctx.save();ctx.beginPath();ctx.rect(0,bonusY,150,3*bonusH);ctx.clip();
    for(let n=Math.min(maxBonus,Math.ceil(bonusTop));n>=Math.max(1,Math.floor(bonusTop)-2);n--){
      const y=bonusY+(bonusTop-n)*bonusH,mark=show*Math.max(0,1-Math.abs(chosen-n));
      row(n+'回目',Math.floor(s.bet*K.clearPay[n-1][1]+1e-8),y,bonusH-1,mark,true);
    }
    if(show){
      ctx.save();ctx.globalAlpha*=show;
      rounded(ctx,1.4,bonusY+(bonusTop-chosen)*bonusH+.6,147.2,bonusH-2.2,4,null,'#ffed94',1.7);ctx.restore();
    }
    ctx.restore();
    const oddsY=34+3*bonusH;
    heading('ODDS',oddsY,'#a0f9fb');
    const start=oddsY+29,windowBottom=397,rows=8;
    const popPay=K.popPayFor(s.firstPopAward);
    const highest=popPay.findLastIndex(([n])=>n<480),popH=(windowBottom-start)/rows;
    const active=popPay.findLastIndex(([n])=>n<=state.popped);
    const firstFor=count=>Math.max(0,Math.min(highest-rows+1,popPay.findLastIndex(([n])=>n<=count)-1));
    let offset=firstFor(s.popped);
    if(tr?.count&&elapsed<duration(tr)){
      const before=firstFor(s.popped-tr.count);offset=before;
      for(let j=before+1;j<=firstFor(s.popped);j++){
        const at=thresholdTime(s,tr,popPay[j+1][0]),t=clamp((elapsed-at)/220);offset+=t*t*(3-2*t);
      }
    }
    const pay=(i,y)=>{const [n,m]=popPay[i];row(n+'個',Math.floor(s.bet*m+1e-8),y,popH-1,i===active,false);};
    ctx.save();ctx.beginPath();ctx.rect(0,start,150,rows*popH);ctx.clip();
    for(let i=Math.min(highest,Math.ceil(offset)+rows-1);i>=Math.floor(offset);i--)
      pay(i,start+popH*(rows-1+offset-i));
    ctx.restore();
    const got=state.sugar,getAt=tr?.sugarCrossed?thresholdTime(s,tr,s.sugarTarget):Infinity;
    const since=elapsed-getAt,shine=got&&since>=0&&since<700?Math.sin(Math.PI*since/700):0;
    rounded(ctx,0,402,150,43,7,got?'#724366':'#3f3552',got?'#ffe48d':'#dbb3d5',1.6+shine*2.1);
    sweet(19,423,24+shine*7);
    type('シュガー',38,423,17,'#ffe6f0',{align:'left',max:got?60:104});
    if(got)type('GET',143,424,20,'#ffe56b',{align:'right',max:40});
    const wave=tr?waveAt(tr,elapsed):-1,age=wave<0?Infinity:elapsed-LIGHT-wave*WAVE;
    const pop=age<260?Math.sin(Math.PI*age/260):0;
    rounded(ctx,0,451,150,38,7,'#692c45',pop?'#fff3a5':'#ffcc73',1.5+pop*1.7);
    type('合計',8,470,18,cream,{align:'left'});
    type(state.popped+'個',142,470,25+pop*3,'#fff2af',{align:'right',max:89});
    ctx.restore();
  }
  function bombRate(level){
    const probs=K.probabilitiesForLevel(level);
    return (100*(1-probs[0])).toFixed(1).replace(/\.0$/,'');
  }
  function footer(ctx,s,tr,elapsed,time,demo,x,y,w,guide) {
    let txt='番号をタップで着火範囲',accent='#fff0bd',tint='rgba(72,37,43,.9)';
    if(tr && elapsed<duration(tr)){
      const seq=sequence(tr);
      if(tr.boost&&elapsed<seq.fall){
        tint='#276443';accent='#eeffab';
        txt=elapsed<seq.rest?'補充Lv'+tr.oldLevel+' → Lv'+tr.newLevel+'　×1.5 UP！':'補充Lv'+tr.newLevel+'　累積倍率 ×'+(1.5**(tr.newLevel-1));
      } else if(seq.served&&elapsed>=seq.refill)txt=elapsed<seq.refill+SERVE_OPEN?'売店のシャッターが開く！':'ポップコーンを補充中！';
      else if(tr.boost){txt='補充Lv'+tr.newLevel+'　累積倍率 ×'+(1.5**(tr.newLevel-1));tint='#276443';accent='#eeffab';}
      else if(tr.port<0) txt='着火番号なし';
      else if(!tr.count)txt=tr.all?'起爆粒なし':'このラインは空です';
      else if(elapsed<LIGHT)txt=tr.all?'すべての起爆粒に着火！':'着火！';
      else if(elapsed<seq.rest){const n=Math.min(tr.waves.length,Math.floor((elapsed-LIGHT)/WAVE)+1);txt=(tr.all?'全起爆　':'')+(n>1?n+'連鎖！':'ポップ！');accent='#ffefae';tint=['#80392b','#a9432c','#ae3150','#922b77'][Math.min(3,n-1)];}
      else if(elapsed<seq.fall && tr.clear)txt='全消し！';
      else if(elapsed<seq.refill)txt='残った粒が落下！';
      else txt='着火終了';
    } else if(guide?.boost){
      const level=s.level;tint='#276443';accent='#eeffab';
      txt=s.turn>=8?'補充Lv'+level+'　8球終了':guide.num+'番　補充Lv'+(level+1)+'へ　ボム '+bombRate(level)+'→'+bombRate(level+1)+'%';
    } else if(guide){
      const direct=guide.waves[0]?.length||0,all=guide.waves.reduce((n,w)=>n+w.length,0);
      txt=guide.num+'番　'+(guide.port===s.allIndex?'起爆':'直撃')+direct+'粒・誘爆'+(all-direct)+'粒';accent='#fff0ad';
    } else if(demo){txt=['番号をタップで着火範囲','起爆範囲　黄は1周・赤は2周・紫は3周！','青い稲妻は3方向、虹は全体に着火！','ALLで起爆粒に一斉着火！','ボム率UPで次の補充からレベルアップ！'][Math.floor(time/3700)%5];}
    else if(s.turn>=8) txt='8球終了';
    else if(tr&&tr.count) txt='この球で '+tr.count+' 個 POP！';
    const tw=Math.min(w,336),celebrating=tr?.boost&&elapsed<sequence(tr).fall;
    const pop=celebrating?Math.sin(Math.PI*clamp((elapsed-(elapsed<500?0:500))/310)):0;
    rounded(ctx,x+(w-tw)/2,y,tw,24,10,tint,celebrating?'#e9ff9e':'#edbc75',celebrating?2.4:1.5);
    if(celebrating){
      const rise=1-(elapsed%290)/290;
      ctx.save();ctx.globalAlpha=.5+.5*rise;ctx.lineWidth=2;ctx.strokeStyle='#ebff9a';ctx.lineCap='round';
      for(const xx of [x+(w-tw)/2+10,x+(w+tw)/2-10]){
        const yy=y+8+rise*7;ctx.beginPath();ctx.moveTo(xx-3,yy+3);ctx.lineTo(xx,yy);ctx.lineTo(xx+3,yy+3);ctx.stroke();
      }ctx.restore();
    }
    label(ctx,txt,x+w/2,y+12,16+1.5*pop,accent,{max:tw-(celebrating?32:18)});
  }
  // Each introductory card uses the same hex lattice and the exact engine mask,
  // but one example bomb and a small set of plain kernels make its range easy to see.
  const lessons=[
    ['黄ボム','となりの1周','まわりの6マス','#ffe078',2],
    ['赤ボム','まわりの2周','2周ぶんの18マス','#ff977a',3],
    ['紫ボム','まわりの3周','3周ぶんの36マス','#e9aaff',3],
    ['稲妻ボム','3本のライン','横と斜めを端まで','#82e7ff',3],
    ['虹ボム','盤面全体','すべての粒に着火','#ffda9e',2],
    ['着火ライン','番号にHIT','一直線に着火！','#ffc772',2],
    ['ボム率UP','補充Lvが上昇','新しい粒に適用','#bded91',2],
    ['ALL着火','すべてのボム','ボムから周囲へ','#ffd985',2]
  ];
  const lessonCenter=K.cells.findIndex(p=>p.q===0&&p.r===0);
  const actionExamples=new Map();
  function exampleFor(s,kind){
    if(actionExamples.has(kind))return actionExamples.get(kind);
    const center=K.cells[lessonCenter],port=kind===6?K.ports.findIndex(p=>p.dx!==0&&p.line.includes(lessonCenter)):kind===7?s.boostIndex:s.allIndex;
    const board=K.cells.map((p,i)=>{
      if(hexDistance(center,p)>2)return null;
      const power=(kind===6?i===lessonCenter:kind===8?p.r===0&&Math.abs(p.q)===1:false)?1:0;
      return {id:i,power,bomb:!!power};
    });
    const waves=K.preview({...s,board},s.numbers[port]).waves;
    const waveOf=new Int8Array(board.length);waveOf.fill(-1);
    waves.forEach((wave,w)=>wave.forEach(i=>{waveOf[i]=w;}));
    const example={board,port,waveOf,waves};actionExamples.set(kind,example);return example;
  }
  function actionDiagram(ctx,s,kind,t,mini){
    const {board,port,waveOf,waves}=exampleFor(s,kind),up=kind===7,all=kind===8;
    for(let i=0;i<board.length;i++){
      const piece=board[i];if(!piece)continue;
      const p=K.cells[i],w=waveOf[i],fire=.38+.27*w,hit=w>=0&&t>=fire;
      circle(ctx,p.x,p.y,.412,hit?'#604247':'#4a2c40',hit?'#f1c182':'#977174',.035);
      if(up&&p.r===-2){
        const down=clamp((t-.53-(p.x+1)*.023)/.19),born={id:i,power:p.x===0?1:0};
        if(down)drawPiece(ctx,born,p.x,p.y-1.2*(1-down*down),t*2500,mini,.78);continue;
      }
      if(hit){
        const f=(t-fire)/.17;if(f<1)fragments(ctx,piece,p,SNAP+f*(BURST-SNAP),mini);
        else star(ctx,p.x,p.y,.105,'#ebc991');
      } else{
        const warn=w<0?0:clamp((t-fire+.125)/.125);
        drawPiece(ctx,piece,p.x,p.y,t*3300,mini,.76,1,warn);
      }
    }
    if(kind===6){
      const lane=K.ports[port],line=waves[0],first=K.cells[line[0]],last=K.cells[line.at(-1)];
      const a={x:first.x-lane.dx*.82,y:first.y-lane.dy*.82},progress=clamp((t-.085)/.255);
      if(t<.46){
        const x=mix(a.x,last.x,progress),y=mix(a.y,last.y,progress);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(x,y);ctx.strokeStyle='#ffb345';ctx.lineWidth=.115;ctx.stroke();
        if(t>.07)flame(ctx,x,y,lane.dx,lane.dy,.88,t*3300,mini);
      }
      rounded(ctx,a.x-.28,a.y-.21,.56,.42,.14,'#26555c','#f8c575',.04);
      label(ctx,s.numbers[port],a.x,a.y,.32,'#fff7d0',{max:.51});
    }
    if(up){
      const now=t>=.43;
      rounded(ctx,-1.65,-2.66,3.30,.56,.15,'#285840','#cbe990',.048);
      label(ctx,now?'補充Lv 2　×1.5':'補充Lv 1',0,-2.37,.344,'#efffb1',{max:3.1});
    } else if(t>=.38&&t<.66){
      for(const i of waves[0]||[]){if(!board[i].power)continue;const p=K.cells[i];
        ctx.save();ctx.translate(p.x,p.y);shockFront(ctx,clamp((t-.38)/.20),.89,1,1,mini);ctx.restore();}
    }
    if(all&&t<.385)for(const i of waves[0]||[]){const p=K.cells[i];if(t>.16)flame(ctx,p.x+.1,p.y-.34,0,-1,.65,t*3600,mini);}
  }
  function lessonGuideHit(width,height,x,y){
    if(width<=0||height<=0)return false;
    const W=540*width/height,u=x*540/height,v=y*540/height;
    return v>=474&&v<=521&&Math.abs(u-W/2)<=Math.min(175,(W-36)/2);
  }
  function bombLesson(ctx,W,H,s,lesson,mini){
    const power=lesson.power,[name,caption,detail,accent,radius]=lessons[power-1];
    const t=clamp(lesson.progress),sheet=spriteAtlas(mini);
    const action=power>5,affected=action?[]:K.blastAreas[power][lessonCenter],center=K.cells[lessonCenter];
    const left=W*.30,fieldX=mini?W*.55:(left+W)/2,fieldY=H*(mini?.52:.47);
    const k=Math.min((mini?W*.94:W-left-32)/(2*radius+1.3),(H*(mini?.92:.585))/(radius*1.732+1.2));
    rounded(ctx,6,7,W-12,H-14,23,'rgba(64,32,48,.95)','#ffd688',3);
    if(!mini){
      rounded(ctx,16,17,W-32,57,16,'#783740','#e5a773',2);
      label(ctx,action?'番号の遊び方':'ボムの遊び方',34,45,25,'#ffedc6',{align:'left',max:W-160});
      label(ctx,action?(power-5)+' / 3':power+' / 5',W-31,45,23,accent,{align:'right'});
      const icon=Math.min(91,left*.61);
      if(!action&&sheet){const tile=sheet.width/kernelColors.length;ctx.drawImage(sheet,power*tile,0,tile,tile,left*.52-icon/2,H*.31-icon/2,icon,icon);}
      if(action){
        const ex=exampleFor(s,power),sign=power===7?art.upSign:power===8?art.allSign:null;
        if(sign)ctx.drawImage(sign,left*.52-icon*.6,H*.31-icon*.54,icon*1.20,icon*1.10);
        else rounded(ctx,left*.52-icon*.52,H*.31-icon*.37,icon*1.04,icon*.75,13,'#28565c',accent,2.6);
        label(ctx,s.numbers[ex.port],left*.52,H*.32,38,'#fff2bf',{max:icon*.72,outline:'#67402e'});
      }
      label(ctx,name,left*.52,H*.48,32,accent,{max:left-24,outline:'#552f42'});
      label(ctx,caption,left*.52,H*.59,22,'#fff7d5',{max:left-14});
      label(ctx,detail,left*.52,H*.66,17,'#ebd6cd',{max:left-16});
    }
    ctx.save();ctx.translate(fieldX,fieldY);ctx.scale(k,k);
    if(action)actionDiagram(ctx,s,power,t,mini);
    else {
    const pass=clamp((t-.24)/.45),color=blastPaint[power];
    const maxDistance=power<=3?power:radius;
    // All six directions are represented for lightning, including its horizontal track.
    if(power===4&&pass>0){
      ctx.save();ctx.lineWidth=.095;ctx.strokeStyle='#8beaff';ctx.lineCap='round';ctx.beginPath();
      for(const axis of K.lightningAxes[lessonCenter]){
        for(const i of [axis.find(i=>hexDistance(center,K.cells[i])<=radius),axis.findLast(i=>hexDistance(center,K.cells[i])<=radius)]){const z=K.cells[i],len=Math.hypot(z.x,z.y),a=Math.min(1,pass*radius/len);ctx.moveTo(0,0);ctx.lineTo(z.x*a,z.y*a);}
      }
      ctx.stroke();ctx.restore();
      if(pass<1){
        ctx.save();polygon(ctx,K.outline,.71);ctx.clip();lightning(ctx,lessonCenter,BOLT_START+pass*(BOLT_END-BOLT_START),mini);ctx.restore();
      }
    }
    for(let i=0;i<K.cells.length;i++){
      const p=K.cells[i],dist=hexDistance(p,center);if(dist>radius)continue;
      const target=affected.includes(i),when=power>=4?Math.hypot(p.x,p.y)/radius:dist/maxDistance;
      const active=target&&pass>0&&pass+1e-7>=when;
      circle(ctx,p.x,p.y,.405,active?color.wash:'#482d3e',active?color.light:'#885d64',active?.065:.035);
      if(i===lessonCenter)continue;
      if(active){
        const col=power===5?spectrum[(i+2)%spectrum.length]:accent;
        const age=t-(.24+.45*when),d=clamp(age/.20);
        ctx.save();ctx.globalAlpha=.60;circle(ctx,p.x,p.y,.19-.07*d,col);ctx.restore();
        if(d<1)fragments(ctx,{power:0,id:i},p,SNAP+d*(BURST-SNAP),mini);
      }else{
        ctx.save();ctx.globalAlpha=target?.85:.46;
        if(sheet){const tile=sheet.width/kernelColors.length;ctx.drawImage(sheet,0,0,tile,tile,p.x-.29,p.y-.29,.58,.58);}
        ctx.restore();
      }
    }
    if(power<=3&&pass>0){
      for(let j=1;j<=power;j++){if(pass*power<j-1)continue;
        const r=Math.min(j,Math.max(.08,pass*power));
        shockFront(ctx,r,.63,power,j,mini);
      }
    } else if(power===5&&pass>0&&pass<1){ctx.save();ctx.scale(radius/4,radius/4);rainbowWash(ctx,lessonCenter,RAIN_START+pass*(RAIN_END-RAIN_START),mini);ctx.restore();}
    const example={power,id:lessonCenter};
    if(t<.24)drawPiece(ctx,example,0,0,t*2050,mini,1.06,1,clamp((t-.12)/.12));
    else if(t<.45)fragments(ctx,example,center,SNAP+clamp((t-.24)/.21)*(BURST-SNAP),mini);
    }
    ctx.restore();
    if(!mini){
      const navY=H*.813,step=Math.min(45,(W-90)/6);
      if(!action)for(let i=1;i<=5;i++){
        const x=W/2+(i-3)*step,sel=i===power,sz=sel?33:25;
        if(sel)circle(ctx,x,navY,21,'#5f394b',accent,2);
        if(sheet){const tile=sheet.width/kernelColors.length;ctx.drawImage(sheet,i*tile,0,tile,tile,x-sz/2,navY-sz/2,sz,sz);}
      }
      const bw=Math.min(350,W-36);
      rounded(ctx,(W-bw)/2,474,bw,47,16,'#314f50','#d3d891',1.5);
      label(ctx,'番号ガイドを開く',W/2,497,20,'#fff1c2',{max:bw-18});
    }else{
      rounded(ctx,12,12,Math.min(156,W*.52),56,12,'#573042','#e7bd81',2);
      label(ctx,name,12+Math.min(156,W*.52)/2,40,31,accent,{max:Math.min(142,W*.48)});
    }
  }
  function draw(ctx,s,opt={}) {
    if(!ctx||!s?.board?.length)return;
    const width=opt.width??ctx.canvas.width, height=opt.height??ctx.canvas.height;
    if(!(width>0&&height>0))return;
    const t=Number.isFinite(opt.time)?opt.time:performance.now(),mini=!!opt.mini;
    const tr=opt.turn,elapsed=Math.max(0,opt.elapsed??Infinity),sv=progress(s,tr,elapsed);
    ctx.save();ctx.translate(opt.x||0,opt.y||0);ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
    // Fixed logical height preserves type sizes and line weights at either host pixel ratio.
    const {H,W,b,left,field,sidebar}=layout(width,height,mini);
    const guide=guideFor(s,tr,elapsed,opt.focusPort);
    if(mini)ctx.clearRect(0,0,width,height);
    ctx.scale(height/H,height/H);
    if(!mini)background(ctx,W,H,mini);
    if(!mini && opt.lesson){bombLesson(ctx,W,H,s,opt.lesson,false);ctx.restore();return;}
    if(!mini){
      drawRound(ctx,s,opt,left,2,field);
      if(!sidebar){
        rounded(ctx,5,H-80,W-10,42,12,'#20545b',gold,1.5);
        label(ctx,'合計 '+sv.popped+'個　全消し '+sv.clears+'回',W/2,H-67,16,cream,{max:W-18});
        label(ctx,sv.sugar?'シュガー GET':'シュガー',W/2,H-49,14,'#ffe2a9',{max:W-18});
      }
      footer(ctx,s,tr,elapsed,t,opt.demo,left,sidebar?H-26:H-28,field,guide);
    }
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.k,b.k);liveBoard(ctx,s,tr,elapsed,t,mini,opt.reach,guide);ctx.restore();
    if(sidebar)side(ctx,s,sv,...sidebar,tr,elapsed,opt.sugarIcon);
    ctx.restore();
  }
  window.PopcornView={draw,duration,waveAt,refilling,pickPort,lessonGuideHit,shownPopped,assetsReady:Promise.all(loading),get artVersion(){return artVersion;}};
})();
