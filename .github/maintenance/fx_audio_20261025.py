from pathlib import Path
import hashlib,json,random,re,subprocess,tempfile
p=Path('index.html'); raw=p.read_bytes()
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
assert blob(raw)=='9c3b11093dfc10e4e1c14c89495c5c67b4b9cd70','Source changed; refusing overwrite'
s=raw.decode(); Path('/tmp/cookielink-before.html').write_text(s)
def replace(a,b):
 global s
 assert s.count(a)==1,'Anchor must be unique: '+a[:100]
 s=s.replace(a,b,1)
def section(a,b,text):
 global s
 assert s.count(a)==1 and s.count(b)==1,(a,b)
 lo=s.index(a); hi=s.index(b,lo); s=s[:lo]+text+'\n'+s[hi:]
# Extend only the life of NORMAL cookies remotely cleared by a hammer.
replace("targets[r*SIZE+c]={impact,breakAt};rays.push", "targets[r*SIZE+c]={impact,breakAt,fragmentLife:board[r][c]?.special?life:Math.max(420,life)};rays.push")
replace("return {sources,targets,rays,life,duration:Math.max(lead,...sources.map(p=>p.launch),...Object.values(targets).map(t=>t.breakAt))+life+16};", "return {sources,targets,rays,life,duration:Math.max(lead+life,...sources.map(p=>p.launch+life),...Object.values(targets).map(t=>t.breakAt+(t.fragmentLife??life)))+16};")
section('function startShatter(s,ev,e){','function rayPoint(',r'''const REMOTE_SHARD_RIM=[[-18,-18],[3,-18],[18,-18],[18,18],[-4,18],[-18,18]];
const REMOTE_SHARDS=REMOTE_SHARD_RIM.map((p,i)=>[[-1,1],p,REMOTE_SHARD_RIM[(i+1)%6]]);
function makeShatterFx(ev,board,speed,version){
 const plan=ev.plan||makeClearPlan(ev,board,speed),bits=[],dust=[];
 const remote=new Set((ev.remoteCells||[]).map(([r,c])=>r*SIZE+c));
 for(const [r,c] of ev.cells||[]){
  const tile=board[r][c];if(!tile)continue;
  const hit=plan.targets[r*SIZE+c]||{breakAt:70},enhanced=remote.has(r*SIZE+c)&&!tile.special;
  const count=enhanced?6:3,life=hit.fragmentLife??plan.life;
  for(let j=0;j<count;j++){
   const seed=((r+1)*97+(c+1)*53+j*31)%101/100,a=j*Math.PI*2/count-.8;
   bits.push({x:(c+.5)*CELL,y:(r+.5)*CELL,color:tile.color,special:tile.special,step:tile.step,number:tile.number,part:j,enhanced,life,delay:hit.breakAt,
    vx:enhanced?Math.cos(a)*(64+seed*27):(j===0?0:j===1?-1:1)*(42+seed*30),
    vy:enhanced?Math.sin(a)*47-52:-(j===0?54:32)-seed*25,spin:(j%2?-1:1)*(enhanced?3.6:2.2+seed*1.5)});
  }
  if(enhanced)for(let j=0;j<7;j++){const a=j*Math.PI*2/7+.25;dust.push({x:(c+.5)*CELL,y:(r+.5)*CELL,color:tile.color,delay:hit.breakAt,life,vx:Math.cos(a)*(42+j*5),vy:Math.sin(a)*42-30,size:1.3+j%3*.6});}
 }
 const rays=plan.rays.map(ray=>{
  const [r,c]=ray.from,[rr,cc]=ray.to,x=(c+.5)*CELL,y=(r+.5)*CELL,tx=(cc+.5)*CELL,ty=(rr+.5)*CELL;
  const length=Math.hypot(tx-x,ty-y)||1,bend=((r+c+rr+cc)%2?1:-1)*Math.min(22,length*.16);
  return {...ray,x,y,tx,ty,cx:(x+tx)/2-(ty-y)/length*bend,cy:(y+ty)/2+(tx-x)/length*bend};
 });
 return {bits,dust,rays,sources:plan.sources,life:plan.life,elapsed:0,stamp:null,duration:plan.duration,version};
}
function startShatter(s,ev,e){
 if(s.shatter&&s.shatter.event===ev)return;
 stopShatter(s);
 if(motionReduced||document.body.classList.contains('minimal')||s.i!==active||!ev.cells?.length)return;
 s.shatter=makeShatterFx(ev,e.board,e.speed,e.version);s.shatter.event=ev;requestShatter(s);
}
''')
section('function drawShatter(s,time){','function renderChain(s){',r'''function paintShatterFrame(ctx,fx){
 drawColorBurst(ctx,fx);
 for(const b of fx.bits){
  const t=(fx.elapsed-b.delay)/Math.max(130,b.life??fx.life);if(t<0||t>=1)continue;
  ctx.save();ctx.globalAlpha=Math.min(1,(1-t)*(b.enhanced?3.2:2.6));
  ctx.translate(b.x+b.vx*t,b.y+b.vy*t+83*t*t);ctx.rotate(b.spin*t);
  const z=CELL/36*(1-(b.enhanced?.18:.28)*t);ctx.scale(z,z);
  const points=b.enhanced?REMOTE_SHARDS[b.part]:shardPolygons[b.part];
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
  const sprite=cookieSprites[b.color*2+Number(b.special)];
  if(sprite?.complete&&sprite.naturalWidth)ctx.drawImage(sprite,-18,-18,36,36);
  else if(b.special)drawHammer(ctx,0,0,36,b.color);
  else{ctx.fillStyle='#dc9c51';ctx.fillRect(-17,-17,34,34);ctx.fillStyle=inks[b.color];ctx.fillRect(-14,-14,28,28);}
  if(b.step)drawSugar(ctx,0,0,23,wonderTier(b.step.value));
  if(!b.special&&b.number!=null)drawElixirNumber(ctx,b.number,0,0,b.number>9?18:20,'#fff1cf','#7b4129',1.5);
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.lineWidth=b.enhanced?1.8:1.4;ctx.strokeStyle='#fff0c6';ctx.stroke();ctx.restore();
 }
 for(const b of fx.dust||[]){const t=(fx.elapsed-b.delay)/b.life;if(t<0||t>=1)continue;ctx.save();ctx.globalAlpha=(1-t)*.9;ctx.translate(b.x+b.vx*t,b.y+b.vy*t+50*t*t);ctx.rotate(t*5);ctx.fillStyle=b.size>2?'#fff3b7':inks[b.color];ctx.fillRect(-b.size,-b.size,b.size*2,b.size*2);ctx.restore();}
}
function drawShatter(s,time){
 s.shatterPending=false;const fx=s.shatter;if(!fx)return;
 if(s.i!==active||s.engine.version!==fx.version){stopShatter(s);return;}
 if(document.hidden||!inView||app.paused){fx.stamp=null;return;}
 if(fx.stamp!==null)fx.elapsed+=Math.max(0,time-fx.stamp)*(s.engine.presentationRate||1);fx.stamp=time;
 const ctx=s.shatterCtx;ctx.clearRect(0,0,600,600);
 if(fx.elapsed>=fx.duration){stopShatter(s);return;}
 ctx.save();ctx.scale(600/298,600/298);paintShatterFrame(ctx,fx);ctx.restore();requestShatter(s);
}
''')
# Precompute two valid small boards. A displayed HIT removes cells, gravity produces
# the illustrated group. This data is independent of the real Engine and RNG.
def components(board):
 seen=set();out=[]
 for i,color in enumerate(board):
  if color is None or i in seen:continue
  group=[];todo=[i];seen.add(i)
  while todo:
   k=todo.pop();group.append(k);r,c=divmod(k,4)
   for rr,cc in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
    j=rr*4+cc
    if 0<=rr<3 and 0<=cc<4 and j not in seen and board[j]==color:seen.add(j);todo.append(j)
  out.append(group)
 return out
def example(target,seed):
 rng=random.Random(seed)
 for _ in range(200000):
  board=[]
  for i in range(12):
   banned=set()
   if i%4:banned.add(board[i-1])
   if i>=4:banned.add(board[i-4])
   board.append(rng.choice([c for c in range(4) if c not in banned]))
  hits=sorted(rng.sample(range(12),rng.choice([2,3,4])))
  after=[None]*12;moves=[]
  for c in range(4):
   items=[i for i in range(c,12,4) if i not in hits]
   for row,i in zip(range(3-len(items),3),items):after[row*4+c]=board[i];moves.append({'id':i,'r':i//4,'c':c,'to':row})
  comp=sorted(components(after),key=len,reverse=True)
  if comp and len(comp[0])==target:
   return {'before':board,'hits':hits,'after':after,'moves':moves,'group':comp[0],'link':target}
 raise AssertionError('No valid tutorial example found')
examples=[example(4,4061),example(6,6061)]
replace('const BET_LESSON_MS=14500;','const BET_LESSON_MS=22000;\nconst BET_LINK_EXAMPLES='+json.dumps(examples,separators=(',',':'))+';')
section('function drawBetScene(ctx,width,d){','function drawBetPreview(d){',r'''function lessonText(ctx,text,x,y,size,color='#fff1ca',width=286){
 ctx.save();ctx.font='900 '+size+'px "Hiragino Maru Gothic ProN",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='#3a1c1a';ctx.lineWidth=3;ctx.strokeText(text,x,y,width);ctx.fillStyle=color;ctx.fillText(text,x,y,width);ctx.restore();
}
function lessonCracks(ctx,x,y,size){
 ctx.save();ctx.translate(x,y);ctx.scale(size/36,size/36);ctx.beginPath();ctx.moveTo(-16,-5);ctx.lineTo(-5,-2);ctx.lineTo(-1,4);ctx.lineTo(4,-2);ctx.lineTo(16,2);ctx.moveTo(-1,4);ctx.lineTo(-5,11);ctx.lineTo(0,17);ctx.strokeStyle='#fff3c6';ctx.lineWidth=2.8;ctx.stroke();ctx.strokeStyle='#583027';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
}
function lessonPieces(ctx,color,x,y,size,q,boost=false,hammer=false){
 if(q<0||q>=1)return;
 const pieces=boost?REMOTE_SHARDS:shardPolygons;
 pieces.forEach((points,j)=>{const a=j*Math.PI*2/pieces.length-.7;ctx.save();ctx.globalAlpha=Math.min(1,(1-q)*2.5);ctx.translate(x+Math.cos(a)*q*size*(boost?.85:.45),y+Math.sin(a)*q*size*.4-q*size*.3+q*q*size*.4);ctx.rotate((j%2?-1:1)*q*2.3);ctx.scale(size/36,size/36);ctx.beginPath();points.forEach(([xx,yy],i)=>i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy));ctx.closePath();ctx.clip();betCookie(ctx,color,0,0,36,hammer);ctx.strokeStyle='#fff1c4';ctx.lineWidth=1.3;ctx.stroke();ctx.restore();});
}
function drawBetLinkLesson(ctx,t){
 const second=t>=16000,local=t-(second?16000:10000),ex=BET_LINK_EXAMPLES[second?1:0];
 const cell=43,left=12,top=88,drop=Math.max(0,Math.min(1,(local-1200)/450));
 const resolved=local>=1650,presented=local>=2150,group=new Set(ex.group),oldMax=second?4:0,newMax=presented?ex.link:oldMax;
 const award=medalWin(100,payoutTenths(ex.link)*10);
 lessonText(ctx,'③ つながる数で最大LINK更新',149,41,14);
 lessonText(ctx,second?'次のHITの例（補充後）':'入賞 → 落下 → LINK成立',149,64,11,'#ffdf91');
 for(let r=0;r<3;r++)for(let c=0;c<4;c++){ctx.fillStyle='#4c2d20';ctx.strokeStyle='#795039';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(left+c*cell,top+r*cell,cell-2,cell-2,6);ctx.fill();ctx.stroke();}
 const hitSet=new Set(ex.hits);
 for(let i=0;i<12;i++){
  const r=Math.floor(i/4),c=i%4,m=ex.moves.find(m=>m.id===i),hit=hitSet.has(i),color=ex.before[i];
  const row=hit?r:r+((m?.to??r)-r)*drop*drop,x=left+(c+.5)*cell-1,y=top+(row+.5)*cell-1;
  const inGroup=resolved&&m&&group.has(m.to*4+c),breakAt=hit?900:inGroup?4500:Infinity;
  if(local>=breakAt){lessonPieces(ctx,color,x,y,cell*.9,(local-breakAt)/400);continue;}
  betCookie(ctx,color,x,y,cell*.9);
  if(hit&&local>=550){ctx.strokeStyle='#fff9bc';ctx.lineWidth=2;ctx.strokeRect(x-cell*.43,y-cell*.43,cell*.86,cell*.86);if(local>=690)lessonCracks(ctx,x,y,cell*.9);}
  if(inGroup){ctx.strokeStyle='#fff4a3';ctx.lineWidth=2.4;ctx.beginPath();ctx.roundRect(x-cell*.45,y-cell*.45,cell*.9,cell*.9,6);ctx.stroke();}
 }
 if(local<900){const q=Math.min(1,local/600),ballX=262-150*q;ctx.save();ctx.translate(ballX,82);ctx.shadowColor='#ffe5a1';ctx.shadowBlur=8;ctx.fillStyle='#faffdf';ctx.strokeStyle='#c18b2c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.stroke();lessonText(ctx,second?'12':'7',0,0,13,'#725131',24);ctx.restore();}
 if(resolved&&local<4500){
  const steps=ex.group.slice(0,Math.max(1,Math.ceil((local-1650)/700*ex.group.length)));
  ctx.save();ctx.strokeStyle='#ffe99c';ctx.lineWidth=3;ctx.lineCap='round';
  for(const id of steps){const r=Math.floor(id/4),c=id%4;for(const j of [id+1,id+4])if(group.has(j)&&((j===id+1&&c<3)||j===id+4)){ctx.beginPath();ctx.moveTo(left+(c+.5)*cell-1,top+(r+.5)*cell-1);ctx.lineTo(left+(j%4+.5)*cell-1,top+(Math.floor(j/4)+.5)*cell-1);ctx.stroke();}}
  ctx.restore();
 }
 // Same payout function and highlighted-row movement as the real maximum-LINK rule.
 ctx.save();ctx.fillStyle='#fff0d5';ctx.strokeStyle='#b7824a';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(195,83,94,127,9);ctx.fill();ctx.stroke();lessonText(ctx,'100 BETの例',242,96,10,'#fff1bc',88);
 [6,5,4].forEach((n,j)=>{const y=111+j*27;ctx.fillStyle='#f2d5af';ctx.fillRect(201,y,82,24);ctx.font='800 10px system-ui';ctx.textAlign='left';ctx.fillStyle='#744326';ctx.fillText(n+' LINK',205,y+10);ctx.textAlign='right';ctx.fillText(medalWin(100,payoutTenths(n)*10)+' WIN',279,y+21);});
 if(newMax>=4){const fromRow=second?2:2,toRow=6-newMax,k=presented?Math.min(1,(local-2150)/500):0,y=111+(fromRow+(toRow-fromRow)*k)*27;ctx.strokeStyle='#e9429c';ctx.lineWidth=3;ctx.strokeRect(200,y-1,84,26);}
 ctx.restore();
 if(presented&&local<5000){const q=Math.min(1,(local-2150)/220),scale=.9+.1*Math.sin(q*Math.PI/2);ctx.save();ctx.translate(96,214);ctx.scale(scale,scale);ctx.fillStyle='#623046f2';ctx.strokeStyle='#ffdb83';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-80,-26,160,48,12);ctx.fill();ctx.stroke();lessonText(ctx,ex.link+' LINK',0,-12,21,'#fff2b8',150);lessonText(ctx,award+' WIN',0,10,19,'#ffd970',150);ctx.restore();}
 ctx.fillStyle='#281510ee';ctx.fillRect(0,249,298,49);
 lessonText(ctx,'最大LINKが多いほど 配当UP!!',149,262,15,'#fff3bd');
 lessonText(ctx,second?'4LINKの20 WIN → 6LINKで100 WIN':'同じ色が4つつながると 4LINK！',149,284,11,'#ffe290');
}
function drawBetScene(ctx,width,d){
 const t=d.elapsed%BET_LESSON_MS,cell=56,left=37,top=58,progress=(a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
 ctx.save();ctx.scale(width/298,width/298);ctx.clearRect(0,0,298,298);ctx.fillStyle='#382017';ctx.fillRect(0,0,298,298);
 ctx.fillStyle='#281510df';ctx.fillRect(0,0,298,28);lessonText(ctx,'BET中 ・ 実際の盤面とは別の演出見本',149,14,11,'#ffe5b0');
 if(t>=10000){drawBetLinkLesson(ctx,t);ctx.restore();return;}
 lessonText(ctx,t<5500?'① 連鎖をつなげる':'② ハンマーで同色消去',149,41,14,'#ffe8ad');
 for(let r=0;r<3;r++)for(let c=0;c<4;c++){ctx.fillStyle='#4c2d20';ctx.strokeStyle='#795039';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(left+c*cell+1,top+r*cell+1,cell-2,cell-2,7);ctx.fill();ctx.stroke();}
 const firstDrop=progress(2850,3300),secondDrop=progress(5050,5500),lastDrop=progress(9300,9750);
 for(let id=0;id<12;id++){
  const r=Math.floor(id/4),c=id%4,color=BET_LESSON_COOKIES[id],first=id===8||id===9,second=id===4||id===5,hammer=id===6&&t>=5500,remote=id===3||id===11;
  let row=r;if(c<2&&r<2)row+=firstDrop*firstDrop;if(c<2&&r===0)row+=secondDrop*secondDrop;if(id===2||id===7)row+=lastDrop*lastDrop;
  const x=left+(c+.5)*cell,y=top+(row+.5)*cell;
  const crackAt=first?2200:second?4400:hammer?7850:remote?8350:Infinity,breakAt=first?2450:second?4650:hammer?8150:remote?8600:Infinity;
  if(t>=breakAt){lessonPieces(ctx,color,x,y,cell*.88,(t-breakAt)/(remote?500:340),remote,hammer);continue;}
  const born=hammer?progress(5500,5850):1;ctx.save();
  if(hammer&&t>=7550&&t<8150){ctx.translate(x,y);ctx.rotate(Math.sin(progress(7550,8150)*Math.PI)*-.65);betCookie(ctx,color,0,0,cell*.88*born,true);}
  else betCookie(ctx,color,x,y,cell*.88*born,hammer);ctx.restore();
  if(t>=crackAt)lessonCracks(ctx,x,y,cell*.88);
  if((first&&t<2200)||(second&&t>=3300&&t<4400)||(remote&&t>=8350)){ctx.strokeStyle='#fff0a1';ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(x-cell*.45,y-cell*.45,cell*.9,cell*.9,7);ctx.stroke();}
 }
 if(t>=8150&&t<=8600){const q=progress(8150,8450),x=left+2.5*cell,y=top+1.5*cell;ctx.save();for(const row of [.5,2.5]){const tx=left+3.5*cell,ty=top+row*cell;ctx.strokeStyle='#ff9fca';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(tx-x)*q,y+(ty-y)*q);ctx.stroke();ctx.strokeStyle='#fff3dc';ctx.lineWidth=2;ctx.stroke();}ctx.restore();}
 let message='同じ色がつながると…',detail='クッキーが割れて、落下！';
 if(t>=2850&&t<5500){message='落下して、さらに連鎖！';detail='同じ色をつなげよう';}
 if(t>=5500&&t<7850){message='連鎖でハンマー出現！';detail='5連鎖以上で獲得（途中省略）';}
 if(t>=7850&&t<8350){message='ハンマーが消えると…';detail='光が同じ色のクッキーへ！';}
 if(t>=8350){message='離れた同じ色も、砕けて消える！';detail='同色の通常クッキーが破片に！';}
 ctx.fillStyle='#281510ee';ctx.fillRect(0,249,298,49);lessonText(ctx,message,149,262,15);lessonText(ctx,detail,149,284,12,'#ffe290');ctx.restore();
}
''')
# Audio never starts the round until the first assets and playback permission are ready.
replace("}audio.resume().catch(()=>{});", "}return audio.resume().then(()=>audio.state==='running').catch(()=>false);")
section('function prepareHammerImpact(){','function playHammerImpact(',r'''function prepareHammerImpact(){
 if(hammerImpactBuffer)return Promise.resolve(hammerImpactBuffer);
 if(hammerImpactLoad)return hammerImpactLoad;if(!audio)return Promise.resolve(null);
 hammerImpactLoad=loadEffectSample('グランドクロス被弾.wav').then(b=>hammerImpactBuffer=b).catch(error=>{console.warn('ハンマー音源は合成音へ切替',error);hammerImpactLoad=null;return hammerImpactBuffer=sfxBuffers.get('hammer')||null;});
 return hammerImpactLoad;
}
''')
section('function prepareArrival(){','function playArrivalSound(){',r'''function prepareArrival(){
 if(arrivalBuffer)return Promise.resolve(arrivalBuffer);
 if(arrivalLoading)return arrivalLoading;if(!audio)return Promise.resolve(null);
 arrivalLoading=loadEffectSample(arrivalFile).then(b=>arrivalBuffer=b).catch(error=>{console.warn('入賞音源は合成音へ切替',error);arrivalLoading=null;return arrivalBuffer=sfxBuffers.get('magic')||null;});return arrivalLoading;
}
''')
replace("if(!arrivalBuffer){prepareArrival();return;}","if(!arrivalBuffer){prepareArrival();sound('magic',{volume:.85});return;}")
replace("const bgmPlayer=new Audio();bgmPlayer.loop=true;bgmPlayer.preload='none';", "const bgmPlayer=new Audio();bgmPlayer.loop=true;bgmPlayer.preload='auto';bgmPlayer.setAttribute('playsinline','');")
section('function stopBgm(){','app=new Arcade({onEvent:recordEvent,onChange:recordChanged});',r'''let bgmMediaSource=null,bgmGain=null,bgmLevel=normalBgmVolume;
function connectBgmAudio(){
 if(!audio||bgmMediaSource)return;
 bgmMediaSource=audio.createMediaElementSource(bgmPlayer);bgmGain=audio.createGain();bgmGain.gain.value=bgmLevel;
 bgmMediaSource.connect(bgmGain);bgmGain.connect(audio.destination);bgmPlayer.volume=1;
}
function setBgmLevel(value){bgmLevel=Math.max(0,Math.min(1,value));if(bgmGain)bgmGain.gain.setValueAtTime(bgmLevel,audio.currentTime);else bgmPlayer.volume=bgmLevel;}
function stopBgm(){if('speechSynthesis' in window)speechSynthesis.cancel();announcedDrawCount=0;bgmFadeToken++;if(bgmFadeFrame)cancelAnimationFrame(bgmFadeFrame);bgmFadeFrame=0;bgmPlayer.pause();try{bgmPlayer.currentTime=0;}catch{}setBgmLevel(normalBgmVolume);}
function beginBgm(){
 bgmFadeToken++;if(bgmFadeFrame)cancelAnimationFrame(bgmFadeFrame);bgmFadeFrame=0;announcedDrawCount=0;
 bgmPlayer.loop=true;bgmPlayer.currentTime=0;setBgmLevel(normalBgmVolume);
 return $('sound').checked?Promise.resolve(bgmPlayer.play()):Promise.resolve();
}
function fadeBgm(){
 if(bgmPlayer.paused||bgmFadeFrame)return;const token=++bgmFadeToken,initial=bgmLevel,started=performance.now();
 function step(now){if(token!==bgmFadeToken)return;const t=Math.min(1,(now-started)/2900);setBgmLevel(initial*(1-t)*(1-t));if(t<1)bgmFadeFrame=requestAnimationFrame(step);else{bgmFadeFrame=0;bgmPlayer.pause();bgmPlayer.currentTime=0;setBgmLevel(normalBgmVolume);}}
 bgmFadeFrame=requestAnimationFrame(step);
}
const effectBytes=new Map();
function fetchEffectBytes(file){
 if(effectBytes.has(file))return effectBytes.get(file);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 const task=fetch(encodeURI(file),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error(file+' HTTP '+r.status);return r.arrayBuffer();}).catch(error=>{effectBytes.delete(file);throw error;}).finally(()=>clearTimeout(timer));effectBytes.set(file,task);return task;
}
async function loadEffectSample(file){
 const bytes=await fetchEffectBytes(file),buffer=await audio.decodeAudioData(bytes.slice(0));
 // Remove measurable leading silence only; never defer an event to a later HIT.
 let first=buffer.length;for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<first;i++)if(Math.abs(data[i])>.0008){first=i;break;}}
 first=Math.max(0,first-Math.round(buffer.sampleRate*.003));
 if(first<buffer.sampleRate*.02||first>=buffer.length-1)return buffer;
 const trimmed=audio.createBuffer(buffer.numberOfChannels,buffer.length-first,buffer.sampleRate);
 for(let ch=0;ch<buffer.numberOfChannels;ch++)trimmed.copyToChannel(buffer.getChannelData(ch).subarray(first),ch);return trimmed;
}
function audioTimeout(promise,ms=12000){return new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(Error('音声の読み込みがタイムアウトしました')),ms);Promise.resolve(promise).then(v=>{clearTimeout(id);resolve(v);},e=>{clearTimeout(id);reject(e);});});}
const DEBUG_FAST_START=true;
const BET_DURATION_MS=new URLSearchParams(location.search).has('demo')?3600000:DEBUG_FAST_START?1000:30000;
let autoRoundTimer=null,autoRoundToken=-1,autoRoundRemaining=BET_DURATION_MS,autoRoundStamp=null,roundStarting=false;
let audioAttempt=0,audioPreparing=false,audioPreparedToken=-1,audioTrusted=false,audioNeedsGesture=false,audioAttemptedToken=-1,bgmQueuedToken=-1,lastBgm='';
function stopAutoRound(){if(autoRoundTimer!==null)clearTimeout(autoRoundTimer);autoRoundTimer=null;autoRoundStamp=null;}
function countdownText(text,label='開始まで'){
 const box=$('bet-countdown');if(!box)return;box.querySelector('small').textContent=label;box.querySelector('strong').textContent=text;
}
function showAudioGate(message,error=false){const gate=$('audio-gate');gate.hidden=false;$('audio-gate-message').textContent=message;$('audio-enable').disabled=false;$('audio-enable').textContent=error?'音声を再試行':'タップして音声ON';}
function queueRoundBgm(){
 if(bgmQueuedToken===app.token)return;bgmQueuedToken=app.token;audioPreparedToken=-1;
 const pool=bgmTracks.filter(x=>x!==lastBgm),chosen=(pool.length?pool:bgmTracks)[Math.floor(Math.random()*(pool.length||bgmTracks.length))];
 lastBgm=chosen;bgmPlayer.pause();bgmPlayer.src=chosen;bgmPlayer.load();
}
function roundAudioReady(){return !$('sound').checked||(audioPreparedToken===app.token&&audio?.state==='running'&&!!arrivalBuffer&&!!hammerImpactBuffer&&bgmPlayer.readyState>=2);}
function activateGameAudio(){
 if(audioPreparing)return;audioPreparing=true;audioNeedsGesture=false;audioAttemptedToken=app.token;
 const attempt=++audioAttempt,token=app.token,playing=app.phase==='playing';
 if(!playing)queueRoundBgm();
 const resume=unlock();
 if(!audio){audioPreparing=false;audioNeedsGesture=true;showAudioGate('このブラウザーでは音声を使用できません',true);return;}
 connectBgmAudio();prepareAnnouncer();
 if(!playing)setBgmLevel(0);
 // Both calls happen in the click event, before any await: required on iPhone.
 const play=bgmPlayer.play();$('audio-gate').hidden=false;$('audio-gate-message').textContent='音声ファイルを準備しています…';$('audio-enable').disabled=true;
 audioTimeout(Promise.all([resume,play,prepareArrival(),prepareHammerImpact()])).then(([running,,arrival,hammer])=>{
  if(attempt!==audioAttempt||token!==app.token)return;
  if(!running||audio.state!=='running'||!arrival||!hammer)throw Error('音声を有効にできませんでした');
  audioTrusted=true;audioNeedsGesture=false;audioPreparedToken=token;
  if(!playing){bgmPlayer.pause();bgmPlayer.currentTime=0;}setBgmLevel(normalBgmVolume);$('audio-gate').hidden=true;
  if(playing)syncPause();else scheduleAutoRound();
 }).catch(error=>{
  if(attempt!==audioAttempt||token!==app.token)return;
  audioNeedsGesture=true;audioPreparedToken=-1;bgmPlayer.pause();setBgmLevel(normalBgmVolume);
  showAudioGate(error?.name==='NotAllowedError'?'最初の1回だけ、音声を有効にしてください':'音声を読み込めませんでした。タップして再試行できます',error?.name!=='NotAllowedError');
  console.warn('CookieLink audio preparation:',error);
 }).finally(()=>{if(attempt===audioAttempt){audioPreparing=false;if(app.phase==='ready')scheduleAutoRound();}});
}
async function startReadyRound(){
 if(roundStarting||app.phase!=='ready'||!rouletteReady||!app.bets.some(b=>b>0))return false;
 if(!roundAudioReady()){showAudioGate('最初の1回だけ、音声を有効にしてください');return false;}
 roundStarting=true;stopAutoRound();const token=app.token;
 try{
  if($('sound').checked){if(!await unlock())throw Error('音声が停止しています');await beginBgm();}
  if(token!==app.token||app.phase!=='ready'||document.hidden||menuOpen||!inView){bgmPlayer.pause();return false;}
  payoutStamp=null;const ok=app.start();if(!ok)stopBgm();else countdownText('PLAY','ゲーム中');return ok;
 }catch(error){audioNeedsGesture=true;audioPreparedToken=-1;showAudioGate('音声を再度有効にしてください',true);return false;}
 finally{roundStarting=false;if(app.phase==='ready')scheduleAutoRound();}
}
function scheduleAutoRound(){
 if(!app||roundStarting)return;
 if(app.phase!=='ready'){stopAutoRound();countdownText(app.phase==='playing'?'PLAY':'RESULT',app.phase==='playing'?'ゲーム中':'結果表示');return;}
 if(autoRoundToken!==app.token){stopAutoRound();autoRoundToken=app.token;autoRoundRemaining=BET_DURATION_MS;audioAttempt++;audioPreparing=false;audioAttemptedToken=-1;queueRoundBgm();}
 if(autoRoundTimer!==null)return;
 function tick(){
  autoRoundTimer=null;if(app.phase!=='ready'){scheduleAutoRound();return;}
  const now=performance.now(),available=rouletteReady&&!document.hidden&&!menuOpen&&!userPaused&&inView;
  if(!available){autoRoundStamp=null;countdownText('…',rouletteReady?'BET TIME':'読込中');}
  else if(!app.bets.some(b=>b>0)){autoRoundStamp=null;countdownText('BET','BETを選択');}
  else if(!roundAudioReady()){
   autoRoundStamp=null;countdownText('音声待ち','開始準備');
   if(!audioPreparing&&(!audioNeedsGesture||audioTrusted)&&audioAttemptedToken!==app.token)activateGameAudio();
  }else{
   if(autoRoundStamp!==null)autoRoundRemaining=Math.max(0,autoRoundRemaining+autoRoundStamp-now);autoRoundStamp=now;
   countdownText((autoRoundRemaining/1000).toFixed(1)+'秒',DEBUG_FAST_START?'開始まで・DEBUG':'開始まで');
   if(autoRoundRemaining<=0){startReadyRound();return;}
  }
  autoRoundTimer=setTimeout(tick,100);
 }
 tick();
}
''')
# Replace the previous timer and hidden start handler, but retain DOM compatibility.
section('let autoRoundTimer=null;function scheduleAutoRound()',"$('sound-test').onclick=",r'''$('start').onclick=()=>{if(app.phase==='complete'){nextFromResult();return;}startReadyRound();};
$('audio-enable').onclick=activateGameAudio;
$('audio-without').onclick=()=>{audioAttempt++;audioPreparing=false;audioNeedsGesture=false;$('sound').checked=false;bgmPlayer.pause();$('audio-gate').hidden=true;scheduleAutoRound();};
''')
replace("function nextFromResult(){if(app.phase!=='complete')return;stopBgm();userPaused=false;payoutStamp=null;app.prepare();syncPause();$('start').focus();}","function nextFromResult(){if(app.phase!=='complete')return;stopBgm();userPaused=false;payoutStamp=null;app.prepare();syncPause();scheduleAutoRound();}")
replace("function recordChanged(a){", "function recordChanged(a){\n if(a.phase==='ready'||a.phase==='playing')scheduleAutoRound();")
replace("$('pause').onclick=()=>{userPaused=!userPaused;syncPause();};", "$('pause').onclick=null;$('pause').hidden=true;$('pause').tabIndex=-1;")
section("$('sound').onchange=", "document.addEventListener('visibilitychange',syncPause);",r'''$('sound').onchange=()=>{
 if(!$('sound').checked){audioAttempt++;audioPreparing=false;stopSounds();bgmPlayer.pause();$('audio-gate').hidden=true;if('speechSynthesis' in window)speechSynthesis.cancel();scheduleAutoRound();}
 else{audioPreparedToken=-1;audioNeedsGesture=false;activateGameAudio();}
};
const soundLabel=$('sound').closest('label');if(soundLabel)$('bet-countdown').append(soundLabel);
fetchEffectBytes(arrivalFile).catch(()=>{});fetchEffectBytes('グランドクロス被弾.wav').catch(()=>{});
scheduleAutoRound();
''')
# Refreshing media after visibility does not silently discard a rejected play().
replace("bgmPlayer.play().catch(()=>{});}for(const s of slots)","bgmPlayer.play().catch(()=>{showAudioGate('音声を再開するにはタップしてください',true);});if(audio&&audio.state!=='running')unlock();}for(const s of slots)")
clock=r'''<div id="bet-countdown" aria-label="ゲーム開始までの残り時間"><small>開始準備</small><strong>…</strong></div><div id="audio-gate" hidden><p id="audio-gate-message">最初の1回だけ音声を有効にしてください</p><button id="audio-enable" type="button">タップして音声ON</button><button id="audio-without" type="button">音声なしで続ける</button></div>'''
replace('<div class="roulette-caption"><span data-status',clock+'<div class="roulette-caption"><span data-status')
css=r'''
/* Candy-world illustration is a repository asset; the transparent 3D model is unchanged. */
.cookie-roulette .a8-stage{inset:0 0 56px!important;background:url('assets/candy-roulette-world.svg') center 58%/cover no-repeat!important}
.arena{background:#f8c3d9;min-height:250px}
.cookie-roulette .roulette-caption{bottom:33px;height:18px;color:#744263;left:9px;right:9px}
.cookie-roulette .roulette-caption [data-count]{color:#6d395b;text-shadow:0 1px #fff6dc}
.cookie-roulette .roulette-info-strip{position:absolute;left:7px;right:7px;bottom:3px;height:26px;min-height:26px;margin:0;z-index:2}
.arena .avatar-box{bottom:61px}
.cookie-roulette .a8-loading{background:#fff3dfed;color:#854b70}
.play-controls,.play-controls #pause{display:none!important}
#bet-countdown{position:absolute;right:8px;top:6px;z-index:7;width:94px;min-height:49px;padding:4px 6px;box-sizing:border-box;border:1px solid #fff1c4;border-radius:10px;background:linear-gradient(#fff4d9ee,#ffd59de8);box-shadow:0 2px 7px #7a366a44;text-align:center;color:#793453;pointer-events:auto}
#bet-countdown small{display:block;font:800 7px/10px system-ui;white-space:nowrap}
#bet-countdown strong{display:block;font:900 18px/22px system-ui;font-variant-numeric:tabular-nums;white-space:nowrap;text-shadow:0 1px #fff9df}
#bet-countdown label{display:flex;justify-content:center;align-items:center;gap:3px;font:700 8px/12px system-ui}
#bet-countdown input{width:11px;height:11px;margin:0;accent-color:#d24a8c}
#audio-gate{position:absolute;left:50%;top:57%;transform:translate(-50%,-50%);z-index:8;width:225px;box-sizing:border-box;border:2px solid #fff2bb;border-radius:13px;padding:10px;background:#fff6e7f5;box-shadow:0 5px 18px #7a367450;text-align:center;color:#713959}
#audio-gate[hidden]{display:none!important}
#audio-gate #audio-gate-message{position:static;font:800 10px/1.5 system-ui;color:#713959;margin:0 0 7px}
#audio-gate button{position:static;display:block;width:100%;height:auto;min-height:29px;margin:4px 0 0;padding:5px;border-radius:8px;border:1px solid #bd6896;font:800 11px/16px system-ui;background:linear-gradient(#ffbadb,#e678b0);color:#442139}
#audio-gate #audio-without{background:#fff5df;min-height:22px;font-size:9px;border-color:#e2c3af}
.tile.color-target:not(.special) .crack-light{stroke:#fff9cf;stroke-width:1.8}
.tile.color-target:not(.special) .crack-dark{stroke-width:.8}
@media(prefers-reduced-motion:reduce){#bet-countdown{transition:none}}
'''
replace('</style></head><body>',css+'</style></head><body>')
# Parse every actual inline script, not external dependencies.
with tempfile.TemporaryDirectory() as folder:
 for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
  attrs,code=m.groups()
  if not code.strip() or re.search(r'type=[\"\x27](?:application/json|importmap)',attrs):continue
  f=Path(folder)/('script'+str(i)+('.mjs' if 'module' in attrs else '.js'));f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
p.write_text(s);print('PATCH_BLOB',blob(p.read_bytes()));print('DEMO_EXAMPLES',json.dumps(examples));print('SYNTAX_OK')
