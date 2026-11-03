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
  loadAsset('stall', 'popcorn-stall-v83.webp');
  loadAsset('hatch', 'popcorn-hatch-v83.webp');
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
  function layout(width,height,mini=false){
    const H=540,W=H*width/height;
    if(mini)return {H,W,b:boardFit(1,1,W-2,H-2)};
    if(W>=419){
      const sw=Math.min(185,Math.max(108,W*.212)),left=sw+3,field=W-left;
      return {H,W,b:boardFit(left,35,field-2,H-63),left:left+1,field:field-3,sidebar:[1,1,sw,H-2]};
    }
    return {H,W,b:boardFit(2,39,W-4,H-122),left:4,field:W-8};
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
  function drawPiece(ctx,p,x,y,time,mini,scale=1,alpha=1,warn=0,stretch=1) {
    if(!p || scale<.02 || alpha<.02)return;
    const power=p.power,seed=p.id,wiggle=warn*Math.sin(warn*21+seed*.9);
    const squat=clamp((warn-.50)*2);
    ctx.save();ctx.translate(x+.055*wiggle,y-.035+.055*squat);
    ctx.scale(scale*(1+.09*warn+.19*squat),scale*stretch*(1+.06*warn-.31*squat));ctx.globalAlpha*=alpha;
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
  const LIGHT=290, WARN=195, WAVE=480, BURST=455, CLEAR=480, SERVE_OPEN=310, SERVE_CLOSE=235;
  const SNAP=62, NEAR_HIT=226, OUTER_START=134, FAR_HIT=308;
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
    const key=power+(mini?3:0);if(popSheets.has(key))return popSheets.get(key);
    const px=mini?54:146,n=mini?6:14,cols=n/2;
    const sheet=document.createElement('canvas');sheet.width=cols*px;sheet.height=px*2;
    const c=sheet.getContext('2d'),tile=art.pieces.width/3,zoom=px/3.55;
    for(let i=0;i<n;i++){
      const t=i/(n-1),travel=1-(1-t)**1.65,shrink=1-.40*t;
      c.save();c.translate((i%cols+.5)*px,(Math.floor(i/cols)+.5)*px);c.scale(zoom,zoom);
      c.globalAlpha=Math.min(1,(1-t)*3.15);
      for(const lobe of lobes){
        const [cx,cy]=lobe.center,[vx,vy]=lobe.fly;
        c.save();
        const start=power?1.32:1.19,flight=power===2?1.12:1;
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
    tr.waves[0]?.forEach(i=>{arrival[i]=LIGHT-WARN;});
    tr.waves.forEach((wave,n)=>{
      const start=LIGHT+n*WAVE;
      for(const i of wave){
        const power=tr.before[i].power;if(!power)continue;
        const neighborhood=power===2?K.radiusTwo[i]:K.neighbors[i];
        for(const j of neighborhood){
          if(waveOf[j]!==n+1)continue;
          const outer=power===2&&!K.neighbors[i].includes(j);
          const when=start+(outer?FAR_HIT:NEAR_HIT);
          if(when<arrival[j]){arrival[j]=when;parent[j]=i;}
        }
      }
    });
    parent.forEach((i,j)=>{if(i>=0){const w=waveOf[i];trails[w].push({from:i,to:j,hit:arrival[j]-LIGHT-w*WAVE});}});
    const rest=tr.count?LIGHT+(tr.waves.length-1)*WAVE+BURST:(tr.port>=0?460:390);
    const fall=rest+(tr.clear?CLEAR:tr.count?90:0);
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
    const supply=tr.refillSteps.map((step,i)=>frame(step,step.kind==='spawn'?(i===0?210:145):step.ms));
    const end=cursor+(served?SERVE_CLOSE:tr.count?90:310);
    a={waveOf,arrival,trails,falls,supply,served,rest,fall,refill,end};traces.set(tr,a);return a;
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
  function shockFront(ctx,r,energy,outer,mini){
    const vertices=6,edge=outer?'#fff1a2':'#ffd875';
    ctx.save();ctx.globalAlpha*=energy;
    ctx.beginPath();
    for(let k=0;k<vertices;k++){
      const a=k*TAU/vertices,x=r*Math.cos(a),y=r*Math.sin(a);if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    ctx.closePath();ctx.fillStyle=outer?'rgba(255,102,34,.14)':'rgba(255,185,56,.19)';ctx.fill();
    ctx.lineJoin='round';ctx.strokeStyle=outer?'#b54232':'#ab5125';ctx.lineWidth=mini?.12:.14;ctx.stroke();
    ctx.strokeStyle=edge;ctx.lineWidth=mini?.071:.079;ctx.stroke();
    if(!mini){
      for(let k=0;k<vertices;k++){
        const a=k*TAU/vertices;star(ctx,r*Math.cos(a),r*Math.sin(a),outer?.084:.064,'#fffce2');
      }
    }
    ctx.restore();
  }
  function burst(ctx,pt,p,i,dt,mini,chain,crowd) {
    const a=clamp(dt/BURST),fade=1-a;if(fade<=0)return;
    const power=p.power;
    ctx.save();ctx.translate(pt.x,pt.y);
    // The near rim reaches the six actual neighboring centers, then lingers
    // while those kernels heat up. A strong bomb's outer hex reaches ring two.
    if(power&&dt>=SNAP){
      const near=clamp((dt-SNAP)/(NEAR_HIT-SNAP));
      const intensity=1-.85*clamp((dt-NEAR_HIT)/(BURST-NEAR_HIT));
      shockFront(ctx,.11+.89*near,intensity,false,mini);
      if(power===2 && dt>=OUTER_START){
        const outer=clamp((dt-OUTER_START)/(FAR_HIT-OUTER_START)),e=1-.8*clamp((dt-FAR_HIT)/(BURST-FAR_HIT));
        shockFront(ctx,.10+1.90*outer,e,true,mini);
      }
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
        if(j%2===0)circle(ctx,x,y,.04+.065*(1-u),power?'#ffd36c':'#fff3ce');
        else star(ctx,x,y,.07+.06*(1-u),chain>2?'#ffe2b9':'#fff7cb');
      }
      ctx.restore();
    }
    ctx.restore();
  }
  const master={x:-3.83,y:-3.48};
  function pickPort(width,height,localX,localY){
    if(!(width>0&&height>0&&localX>=0&&localX<=width&&localY>=0&&localY<=height))return -1;
    const {H,b}=layout(width,height),x=(localX*H/height-b.x)/b.k,y=(localY*H/height-b.y)/b.k;
    let chosen=-1,best=1;
    for(let i=0;i<=badges.length;i++){
      const all=i===badges.length,p=all?master:badges[i];
      const dx=(x-p.x)/(all?.88:.67),dy=(y-p.y+(all?.065:0))/(all?.76:.60);
      const d=dx*dx+dy*dy;if(d<best){best=d;chosen=i;}
    }
    return chosen;
  }
  const projections=new WeakMap();
  function guideFor(s,tr,elapsed,focus){
    if(tr&&elapsed<duration(tr)){
      return tr.port>=0&&elapsed<LIGHT?{port:tr.port,num:tr.oldNumber,waves:tr.waves}:null;
    }
    if(!Number.isInteger(focus)||focus<0||focus>=s.numbers.length)return null;
    let rows=projections.get(s.board);if(!rows){rows=[];projections.set(s.board,rows);}
    const num=s.numbers[focus];
    if(!rows[focus]||rows[focus].num!==num)rows[focus]={port:focus,num,waves:K.preview(s,num).waves};
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
    if(!guide)return;
    const pulse=mini?.5:(.5+.5*Math.sin(time*.006));
    ctx.save();
    guide.waves.forEach((wave,n)=>{
      const direct=n===0;
      for(const i of wave){
        const p=K.cells[i];
        ctx.beginPath();ctx.ellipse(p.x,p.y,.448,.42,0,0,TAU);
        ctx.lineWidth=direct?.117:.095;ctx.strokeStyle=direct?'#914a20':'#165366';ctx.stroke();
        ctx.lineWidth=direct?.077:.056;
        ctx.strokeStyle=direct?'#ffe483':'#91f4ef';ctx.stroke();
        if(!mini&&direct)star(ctx,p.x+.33,p.y-.30,.066+.034*pulse,'#fff8bd');
      }
    });
    ctx.restore();
  }
  function portArt(ctx,s,tr,elapsed,time,mini,reach,guide) {
    const hit=tr && tr.port>=0, change=hit?sequence(tr).rest:0;
    const numbers=hit && elapsed<change?tr.beforeNumbers:s.numbers;
    numbers.forEach((num,i)=>{
      const all=i===s.allIndex,p=all?master:badges[i];
      const fired=hit&&tr.port===i,lit=fired&&elapsed<change,flipped=fired&&elapsed>=change&&elapsed<change+260;
      const re=reach?.find?.(v=>Number(v.number??v.n??v)===num),type=re?.kind??re?.level??'reach';
      const inspected=guide?.port===i;
      const edge=lit||inspected?'#fff2a7':re?({all:'#ff94d6',super:'#ff73a0',high:'#ffb839'}[type]||'#6cf6ec'):(all?'#ffd878':'#f7bc71');
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
      if(!mini && (lit||flipped||re||inspected)){const extra=.034+.027*Math.sin(time*.009+i*.34);rounded(ctx,-half-extra,-high-extra,2*(half+extra),2*(high+extra),.205,null,edge,.037);}
      rounded(ctx,-half,-high,half*2,high*2,all?.26:.185,all?'#993740':lit?'#fbab51':inspected?'#925327':'#204c59',edge,all?.077:.046);
      if(all){
        rounded(ctx,-.50,-.59,1,.365,.14,'#ffda7d','#853e22',.033);label(ctx,'ALL',0,-.398,.29,'#662c21',{max:.9});
        if(!mini){star(ctx,-.49,.045,.080,'#ffcf66');star(ctx,.49,.045,.080,'#ffcf66');}
      }
      label(ctx,num,0,all?.063:.012,all?.60:.454,lit&&!all?'#572839':'#fff7d7',{max:2*half-.04,outline:lit&&!all?'#ffe9aa':'#332d38',stroke:.042});
      ctx.restore();
    });
  }
  function serviceAt(seq,elapsed){
    if(!seq?.served||elapsed<seq.refill||elapsed>=seq.end)return null;
    const enter=clamp((elapsed-seq.refill)/180),leave=clamp((seq.end-elapsed)/SERVE_CLOSE);
    const eased=n=>n*n*(3-2*n);
    const raised=eased(Math.min(enter,leave));
    const open=eased(Math.min(clamp((elapsed-seq.refill-88)/205),clamp((seq.end-elapsed-42)/165)));
    return {raised,open,y:-5.82-.67*(1-raised)};
  }
  const awningW=6.88,awningH=1.43;
  function foodStand(ctx,stage,front){
    const img=art.stall;
    if(!stage||!img||stage.raised<=0)return;
    const x=-awningW/2,y=stage.y,w=awningW,h=awningH;
    // Stretch the serving window, preserving both decorated end caps. All five
    // physical inlets (-2..2) sit inside the dark opening of the raster stand.
    const edges=[0,.239,.764,1],cuts=[0,.143,.857,1];
    ctx.save();ctx.globalAlpha*=stage.raised;
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
  function liveBoard(ctx,s,tr,elapsed,time,mini,reach,guide) {
    drawCachedPlate(ctx);
    const seq=tr&&sequence(tr),active=!!tr&&elapsed<seq.end;
    const moving=active&&(tr.count>0||seq.served),service=active?serviceAt(seq,elapsed):null;
    const showRails=!active||elapsed<LIGHT;
    if(showRails&&guide?.port<K.ports.length)lane(ctx,guide.port,true);
    foodStand(ctx,service,false);
    if(!moving)K.cells.forEach((p,i)=>drawPiece(ctx,s.board[i],p.x,p.y,time,mini));
    else if (elapsed<seq.fall) {
      const wave=waveAt(tr,elapsed);
      K.cells.forEach((p,i)=>{
        const w=seq.waveOf[i],dt=w<0?-Infinity:elapsed-(LIGHT+w*WAVE);
        if(dt<0){
          const ignited=w>=0&&elapsed>=seq.arrival[i],span=LIGHT+w*WAVE-seq.arrival[i];
          const charge=ignited?.22+.78*clamp((elapsed-seq.arrival[i])/span):0;
          drawPiece(ctx,tr.before[i],p.x,p.y,time,mini,1,1,charge);
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
              const start=trl.hit===FAR_HIT?OUTER_START:SNAP;
              const u=clamp((dt-start)/(trl.hit-start));
              const source=K.cells[trl.from],target=K.cells[trl.to];
              if(u>0&&u<1){
                const tail=Math.max(0,u-.31),xx=mix(source.x,target.x,u),yy=mix(source.y,target.y,u);
                ctx.beginPath();ctx.moveTo(mix(source.x,target.x,tail),mix(source.y,target.y,tail));ctx.lineTo(xx,yy);
                ctx.strokeStyle=trl.hit===FAR_HIT?'#ff9b51':'#ffcd64';ctx.lineWidth=.068;ctx.stroke();circle(ctx,xx,yy,.060,'#fffad5');
              } else if(dt>=trl.hit && dt<trl.hit+110){
                const q=(dt-trl.hit)/110;
                ctx.save();ctx.globalAlpha=1-q;circle(ctx,target.x,target.y,.35+.20*q,null,'#fff6ab',.085);ctx.restore();
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
      if(tr.count&&elapsed<LIGHT+105){
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
      ctx.save();polygon(ctx,K.outline,.975);
      // During supply the texture's open mouth and the top row form one visible
      // passage; internal movements remain inside the board after admission.
      if(service)ctx.rect(-2.51,service.y+awningH*.69,5.02,-3.18-(service.y+awningH*.69));
      ctx.clip();
      const frame=elapsed<seq.refill?seq.falls.find(f=>elapsed<f.end):seq.supply.find(f=>elapsed>=f.begin&&elapsed<f.end);
      if(frame){
        const progress=clamp((elapsed-frame.begin)/(frame.end-frame.begin));
        movingFrame(ctx,{...frame,progress},time,mini);
      } else {
        const board=seq.served&&elapsed>=seq.end-SERVE_CLOSE?tr.after:tr.settled;
        board.forEach((piece,i)=>{if(piece)drawPiece(ctx,piece,K.cells[i].x,K.cells[i].y,time,mini);});
      }
      ctx.restore();
    }
    foodStand(ctx,service,true);
    if(showRails){
      ctx.save();ctx.globalAlpha=guide?.30:(mini?.36:.82);railMap(ctx);ctx.restore();
      guideCells(ctx,guide,mini,time);
    }
    portArt(ctx,s,tr,elapsed,time,mini,reach,guide);
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
    if(!tr||tr.port<0||elapsed>=duration(tr))return {popped:s.popped,clears:s.clears};
    const seq=sequence(tr);let added=0;
    tr.waves.forEach((wave,n)=>{added+=Math.round(wave.length*clamp((elapsed-LIGHT-n*WAVE)/145));});
    const popped=s.popped-tr.count+added, clears=s.clears-(tr.clear&&elapsed<seq.rest?1:0);
    return {popped,clears};
  }
  function drawTop(ctx,s,opt,x,y,w,raised=0) {
    const title=Math.min(302,w-73);ctx.save();ctx.globalAlpha*=1-raised;
    rounded(ctx,x,y,title,31,12,'#a33c3d','#ffdda2',1.8);
    label(ctx,'ポップコーンスプラッシュ',x+title/2,y+15,20,cream,{max:title-12,outline:'#78322e',stroke:2.2});
    ctx.restore();const bw=68,bx=x+w-bw;
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
  function side(ctx,s,state,x,y,w,h){
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
    function row(tag,amount,y,height,active,bonus){
      const mid=y+height/2,inner=height-3;
      rounded(ctx,1,y,148,height,4,'#37222c',active?'#fff5a8':'#8d5134',active?1.6:.75);
      rounded(ctx,3,y+1.5,48,inner,3,bonus?(active?'#ffe285':'#8a303a'):active?'#f49ea8':'#f0c4bc');
      rounded(ctx,53,y+1.5,94,inner,3,active?'#fff4a8':'#f5d480');
      ctx.fillStyle='#fff7c777';ctx.fillRect(57,y+2.5,84,1.4);
      type(tag,27,mid,18.2,bonus&&!active?'#fff2bd':'#4b293b',{max:45});
      // A short exact 万 amount stays legible in the narrow cabinet at high bets.
      const text=amount>=100000&&amount%1000===0?(amount/10000).toLocaleString('ja-JP')+'万':amount.toLocaleString('ja-JP');
      type(text,120,mid,20.5,'#4c2529',{align:'right',max:65});
      rounded(ctx,121.5,mid-7,24.5,14.2,2.7,'#69412b');
      type('WIN',133.75,mid+.5,13.2,'#ffe391',{max:22.5});
    }
    heading('全消し BONUS',0,'#fff1a5');
    const first=Math.max(0,state.clears-1),last=Math.min(K.clearPay.length,state.clears+1);
    const bonusH=27;
    for(let n=last;n>=first;n--){
      const m=n===0?0:K.clearPay[n-1][1];
      row(n===0?'0回':n+'回目',Math.floor(s.bet*m+1e-8),29+(last-n)*bonusH,bonusH-1,n===state.clears,true);
    }
    const oddsY=34+(last-first+1)*bonusH;
    heading('ODDS',oddsY,'#a0f9fb');
    const start=oddsY+29,popH=(445-start)/K.popPay.length;
    for(let i=K.popPay.length-1;i>=0;i--){
      const [n,m]=K.popPay[i],active=n<=state.popped&&(i===K.popPay.length-1||state.popped<K.popPay[i+1][0]);
      row(n+'個',Math.floor(s.bet*m+1e-8),start+(K.popPay.length-1-i)*popH,popH-1,active,false);
    }
    rounded(ctx,0,451,150,38,7,'#692c45','#ffcc73',1.5);
    type('合計',8,470,18,cream,{align:'left'});
    type(state.popped+'個',142,470,25,'#fff2af',{align:'right',max:89});
    ctx.restore();
  }
  function footer(ctx,s,tr,elapsed,time,demo,x,y,w,guide) {
    let txt='番号をタップで着火範囲',accent='#fff0bd',tint='rgba(72,37,43,.9)';
    if(tr && elapsed<duration(tr)){
      const seq=sequence(tr);
      if(seq.served&&elapsed>=seq.refill)txt=elapsed<seq.refill+SERVE_OPEN?'売店のシャッターが開く！':'ポップコーンを補充中！';
      else if(tr.port<0) txt='着火番号なし';
      else if(!tr.count)txt=tr.all?'起爆粒なし':'このラインは空です';
      else if(elapsed<LIGHT)txt=tr.all?'すべての起爆粒に着火！':'着火！';
      else if(elapsed<seq.rest){const n=Math.min(tr.waves.length,Math.floor((elapsed-LIGHT)/WAVE)+1);txt=(tr.all?'全起爆　':'')+(n>1?n+'連鎖！':'ポップ！');accent='#ffefae';tint=['#80392b','#a9432c','#ae3150','#922b77'][Math.min(3,n-1)];}
      else if(elapsed<seq.fall && tr.clear)txt='全消し！';
      else if(elapsed<seq.refill)txt='残った粒が落下！';
      else txt='着火終了';
    } else if(guide){
      const direct=guide.waves[0]?.length||0,all=guide.waves.reduce((n,w)=>n+w.length,0);
      txt=guide.num+'番　'+(guide.port===s.allIndex?'起爆':'直撃')+direct+'粒・誘爆'+(all-direct)+'粒';accent='#fff0ad';
    } else if(demo){txt=['番号をタップで着火範囲','起爆粒は周囲へ、強起爆は2マス先まで！','ALLで起爆粒に一斉着火！'][Math.floor(time/3700)%3];}
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
    const {H,W,b,left,field,sidebar}=layout(width,height,mini);
    const guide=guideFor(s,tr,elapsed,opt.focusPort),service=tr?serviceAt(sequence(tr),elapsed):null;
    ctx.scale(height/H,height/H);background(ctx,W,H,mini);
    if(!mini){
      drawTop(ctx,s,opt,left,sidebar?3:4,field,service?.raised||0);
      if(!sidebar){
        rounded(ctx,5,H-80,W-10,42,12,'#20545b',gold,1.5);
        label(ctx,'合計 '+sv.popped+' 個　／　全消し '+sv.clears+' 回',W/2,H-59,19,cream,{max:W-22});
      }
      footer(ctx,s,tr,elapsed,t,opt.demo,left,sidebar?H-26:H-28,field,guide);
    }
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.k,b.k);liveBoard(ctx,s,tr,elapsed,t,mini,opt.reach,guide);ctx.restore();
    if(sidebar)side(ctx,s,sv,...sidebar);
    ctx.restore();
  }
  window.PopcornView={draw,duration,waveAt,pickPort,assetsReady:Promise.all(loading),get artVersion(){return artVersion;}};
})();
