from pathlib import Path
import hashlib,re
R=Path.cwd();A=R/'assets';D=Path(__file__).resolve().parent

def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def one(s,a,b):
 assert s.count(a)==1,('unsafe patch',a[:100],s.count(a))
 return s.replace(a,b,1)
html=(R/'index.html').read_text();assert blob(html.encode())=='ac55547cf7b3db0d6e68f757b7d84e2592fe684c','main changed; reconcile first'
old_bundle=(A/'six-candy.js').read_text();old_e=(A/'six-candy-rounds-engine.js').read_text();old_u=(A/'six-candy-rounds-ui.js').read_text()
e=old_e;u=old_u
start="     this.fx={phase:'pyramidRound',nextRound:this.roundIndex+1,elapsed:0,stamp:null,ms:900,clearBonus:this.currentClearBonus,roundIndex:this.roundIndex};"
a=e.index(start);b=e.index("     this.fx=null;this.transitionPending=false;",a)
e=e[:a]+"""     const outgoing=sixClone(this.pyramid),nextRound=this.roundIndex+1,sweepMs=(motionReduced?140:760)*this.speed;
     this.fx={phase:'pyramidSweep',grid:outgoing,roundIndex:this.roundIndex,nextRound,elapsed:0,stamp:null,ms:sweepMs};
     this.candyMessage='ROUND CLEAR!';this.emit('pyramidSweep',{nextRound});
     if(!await this.wait(sweepMs,token))return;
     this.roundIndex++;this.newBoard();const refillMs=(motionReduced?140:480+(this.rows-1)*96)*this.speed;
     this.fx={phase:'pyramidRefill',grid:sixClone(this.pyramid),roundIndex:this.roundIndex,elapsed:0,stamp:null,ms:refillMs};
     this.candyMessage='Round '+this.roundIndex+' START';this.emit('pyramidRefill',{roundIndex:this.roundIndex});
     if(!await this.wait(refillMs,token))return;
"""+e[b:]
u=one(u,"s.sixFallSoundFx=null;invalidateReach(s);","s.sixFallSoundFx=null;s.sixRefillFx=null;s.candyTime=0;invalidateReach(s);")
u=one(u,"s.candyReward.classList.remove('six-round-callout');invalidateReach(s);","s.candyReward.classList.remove('six-round-callout','six-special-award');invalidateReach(s);")
u=one(u,"const gain=ev.gain;s.candyReward.hidden=false;","const gain=ev.gain;s.candyReward.hidden=false;s.candyReward.classList.add('six-special-award');")
u=one(u,"<span>'+num(gain/100)+' × BET</span>","<span>'+ (ev.chain?ev.chain+' CHAIN':'') +'</span>")
u=one(u,"if(ev.phase==='pyramidShape'&&s.i===active)","if(ev.phase==='pyramidSweep'&&s.i===active)sound('magic',{volume:.35});\n if(ev.phase==='pyramidShape'&&s.i===active)")
u=one(u," const progress=fx?", " if(ready){sixDrawTutorial(s,time,bet);if(!paused&&!jpcSession.active)carnivalQueueFrame(s);return;}s.candyCanvas.dataset.mode='playing';\n const progress=fx?")
u=one(u,"const fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,motionReduced?1:progress):null,grid=ready?sixDemo(rows,1):fall?.grid||e.pyramid,moving=new Map((fall?.moves||[]).map(m=>[m.id,m]));", "const sweep=fx?.phase==='pyramidSweep',refill=fx?.phase==='pyramidRefill',transition=sweep||refill;\n const fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,motionReduced?1:progress):null,grid=transition?fx.grid:fall?.grid||e.pyramid,moving=new Map((fall?.moves||[]).map(m=>[m.id,m]));")
u=one(u," x.drawImage(sixArtBackdrop(rows),0,0,320,320);", """ if(refill&&!paused&&!motionReduced&&s.i===active){const landed=Math.min(rows-1,Math.floor((progress*(480+(rows-1)*96)-400)/96));if(s.sixRefillFx!==fx){s.sixRefillFx=fx;s.sixRefillRow=-1;}if(landed>s.sixRefillRow){s.sixRefillRow=landed;sixCandyAudio('fall',2);}}
 x.drawImage(sixArtBackdrop(rows),0,0,320,320);""")
u=one(u,"  const pending=t.number!=null&&", "  const pose=sixTransitionPose(fx,r,c,t,rows,progress,motionReduced);if(!pose.visible)continue;if(transition)pos={x:pose.x,y:pose.y};\n  const pending=!transition&&t.number!=null&&")
u=one(u,"  x.save();if(!ready&&pending)","  x.save();x.globalAlpha=pose.alpha;if(!ready&&pending)")
u=one(u,"  x.save();x.translate(pos.x,pos.y);", "  x.save();x.translate(pos.x,pos.y);\n  if(transition){x.rotate(pose.rotation);x.scale(pose.scale,pose.scale);}else if(!m&&!motionReduced)x.rotate(Math.sin(time/1400+t.id*.53)*.016);")
u=one(u,"if(!motionReduced&&!m&&!paused)","if(!motionReduced&&!m&&!paused&&!transition)")
u=one(u,"if(e.roundIndex===8&&!motionReduced)","if(e.roundIndex===8&&!motionReduced&&!transition)")
a=u.index(" if(fx?.phase==='pyramidShape')for(");b=u.index(" if(!bet){",a)
u=u[:a]+" sixStageEffects(x,fx,progress,e.roundIndex,rows,motionReduced);\n"+u[b:]
u=one(u,"sixReachPresentation(s,ready?[]:visibleReachResults(s,app),grid,ready);","sixReachPresentation(s,transition?[]:visibleReachResults(s,app),grid,transition);")
stage=(D/'stage.js').read_text();css=(D/'stage.css').read_text()
bundle=one(one(old_bundle,old_e,e),old_u,u)+'\n'+stage
new=one(html,old_bundle,bundle);new=one(new,'</style></head>',css+'\n</style></head>')
assert new.replace(bundle,old_bundle,1).replace(css+'\n','',1)==html
(A/'six-candy-rounds-engine.js').write_text(e);(A/'six-candy-rounds-ui.js').write_text(u);(A/'six-candy-stage.js').write_text(stage);(A/'six-candy-stage.css').write_text(css);(A/'six-candy.js').write_text(bundle);(R/'index.html').write_text(new)
from PIL import Image,ImageDraw
im=Image.new('RGBA',(640,640));d=ImageDraw.Draw(im)
for y in range(640):
 q=y/639;d.line((0,y,640,y),fill=(int(104-40*q),int(44-19*q),int(56-20*q),255))
d.rounded_rectangle((5,2,635,638),radius=25,outline='#f7c985',width=18)
d.rounded_rectangle((16,4,624,636),radius=20,outline='#fff5d4',width=9)
for y in range(-24,660,24):
 d.line((5,y,29,y+24),fill='#ef67a8',width=9);d.line((611,y,635,y+24),fill='#ef67a8',width=9)
for x in range(25,620,26):
 d.line((x,2,x+18,12),fill='#ee69a5',width=6);d.line((x,626,x+18,638),fill='#ee69a5',width=7)
atlas=Image.open(A/'six-candy-png/candies.webp').convert('RGBA');size=atlas.width//4
sprites=[atlas.crop((c*size,0,(c+1)*size,size)).resize((35,35),Image.Resampling.LANCZOS) for c in range(4)]
for j,y in enumerate(range(34,604,34)):
 im.alpha_composite(sprites[j%4],(-2,y));im.alpha_composite(sprites[(j+2)%4],(607,y))
for x,y,c in [(0,0,0),(602,0,1),(0,602,2),(602,602,3)]:
 im.alpha_composite(sprites[c].resize((38,38)),(x,y))
im.save(A/'six-candy-png/frame.webp',quality=92,method=6)
T=R/'.github/tests'
if (T/'six_rounds_v4_browser.py').exists():
 t=(T/'six_rounds_v4_browser.py').read_text().replace("includes('-198')","includes('-320')")
 t=t.replace('window.__qa={app,slots,','window.__qa={SIX_STAGE_VERSION,SIX_TUTORIAL_DURATION,sixFrameState,sixTransitionPose,sixTutorialScene,sixDrawTutorial,app,slots,')
 t=t.replace("'qa-six-v4'","'qa-six-v5'")
 marker=" page.wait_for_function('window.__qa?.sixCandyPngState.loaded',timeout=30000)"
 t=t.replace(marker,marker+"\n page.wait_for_function('__qa.sixFrameState.loaded',timeout=30000)")
 t=t.replace("pc=browser.new_context",(D/'browser-extra.txt').read_text()+"\n pc=browser.new_context")
 (T/'six_stage_v5_browser.py').write_text(t)
print('SIX_STAGE_V5_INSTALLED',blob(new.encode()))
