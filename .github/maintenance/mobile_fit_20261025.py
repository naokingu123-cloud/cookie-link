from pathlib import Path
import re,subprocess,tempfile
p=Path('index.html');s=p.read_text()
assert 'function debugResetRound()' in s,'Apply sync/reset patch first'
def replace(a,b):
 global s
 assert s.count(a)==1,'Missing unique anchor: '+a[:110]
 s=s.replace(a,b,1)
replace('<meta name="viewport" content="width=device-width,initial-scale=1">','<meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#f2a8bd"><meta name="apple-mobile-web-app-capable" content="yes">')
s,n=re.subn(r'<div class="view-tools">[\s\S]*?</div>(?=<div id="viewport">)','',s,count=1);assert n==1
start=s.index("$('view-zoom').value=desktopView?'1.25':'fit';")
end=s.index('// A glossy jelly companion',start)
s=s[:start]+r'''// Fill the available phone viewport, not a fixed 480:960 letterbox.
let fitPending=false;
function fit(){
 fitPending=false;
 const phone=matchMedia('(pointer:coarse)').matches||!desktopView;
 const vv=window.visualViewport,w=Math.max(1,document.documentElement.clientWidth||innerWidth);
 // If an accessibility/browser zoom is imposed externally, do not compound it.
 const h=Math.max(1,vv?vv.height*vv.scale:innerHeight);
 const viewport=$('viewport'),screenEl=$('screen');
 viewport.style.width=w+'px';viewport.style.height=h+'px';
 const cs=getComputedStyle(viewport),left=parseFloat(cs.paddingLeft)||0,right=parseFloat(cs.paddingRight)||0,top=parseFloat(cs.paddingTop)||0,bottom=parseFloat(cs.paddingBottom)||0;
 const width=Math.max(1,w-left-right),height=Math.max(1,h-top-bottom),landscape=phone&&width>height;
 document.body.classList.toggle('mobile-view',phone);document.body.classList.toggle('desktop-view',!phone);document.body.classList.toggle('mobile-landscape',landscape);
 let scale,logicalWidth,logicalHeight,x=left,y=top;
 if(phone){
  scale=landscape?Math.min(width/960,height/480):width/480;
  logicalWidth=width/scale;logicalHeight=height/scale;
 }else{
  scale=Math.min(width/480,height/960,1.25);logicalWidth=480;logicalHeight=960;x+=(width-logicalWidth*scale)/2;y+=(height-logicalHeight*scale)/2;
 }
 screenEl.style.width=logicalWidth+'px';screenEl.style.height=logicalHeight+'px';screenEl.style.left=x+'px';screenEl.style.top=y+'px';screenEl.style.transform='scale('+scale+')';
 document.documentElement.style.setProperty('--game-viewport-height',h+'px');
}
function requestFit(){if(!fitPending){fitPending=true;requestAnimationFrame(fit);}}
addEventListener('resize',requestFit);addEventListener('orientationchange',requestFit);window.visualViewport?.addEventListener('resize',requestFit);
// No app zoom selector, two-finger camera zoom, or pinch-to-reflow.
const gameViewport=$('viewport');
for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,event=>{if(event.cancelable)event.preventDefault();},{passive:false});
for(const type of ['touchstart','touchmove'])gameViewport.addEventListener(type,event=>{if(event.touches.length>1&&event.cancelable)event.preventDefault();},{passive:false});
gameViewport.addEventListener('dblclick',event=>event.preventDefault());
document.addEventListener('wheel',event=>{if((event.ctrlKey||event.metaKey)&&event.cancelable)event.preventDefault();},{passive:false});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&['+','-','=','0'].includes(event.key))event.preventDefault();});
fit();
''' + s[end:]
replace("else{const p=[...pointers.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(lastPinch)distance=Math.max(8,Math.min(30,distance+(lastPinch-d)*.025));lastPinch=d;}","else{lastPinch=0;return;}")
replace("renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(8,Math.min(30,distance+e.deltaY*.007));applyCamera();},{passive:false});", "renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();},{passive:false});")
css=r'''
/* Fixed app viewport. Safe-area padding protects controls; scenery fills the edge. */
html,body{width:100%;height:100%;height:100dvh;min-height:0;margin:0;padding:0;overflow:hidden;overscroll-behavior:none;-webkit-text-size-adjust:100%;background:#f2a8bd}
body{position:fixed;inset:0;display:block}
body #viewport,body.desktop-view #viewport,body.mobile-view #viewport{position:fixed;left:0;top:0;margin:0!important;max-width:none;max-height:none;overflow:hidden;box-sizing:border-box;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);background-color:#f2a8bd;background-image:var(--candy-land);background-size:cover;background-position:center;touch-action:none}
#screen{transform-origin:0 0;box-shadow:none!important}
body.mobile-view #screen{padding-top:4px;gap:5px}
body.mobile-view #screen>.arena{min-height:120px;flex:1 1 0}
body.mobile-view #screen>.console{flex-shrink:0}
.view-tools{display:none!important}
#record-page{touch-action:pan-y;overscroll-behavior:contain}
body.mobile-landscape #screen{display:grid;grid-template-columns:minmax(0,1fr) 456px;grid-template-rows:minmax(130px,1fr) 178px 72px;column-gap:12px;row-gap:5px;padding:6px 12px 0}
body.mobile-landscape #screen>.arena{grid-column:1;grid-row:1;min-height:0;width:100%;height:100%}
body.mobile-landscape #screen>.games-deck{grid-column:1;grid-row:2;width:100%;height:178px}
body.mobile-landscape #screen>.game{grid-column:2;grid-row:1 / 3;align-self:end;width:456px;height:390px}
body.mobile-landscape #screen>#console{grid-column:1 / 3;grid-row:3;width:100%;margin:0;height:72px}
body.mobile-landscape #debug-reset{right:491px}
'''
replace('</style></head><body>',css+'</style></head><body>')
assert "$('view-zoom')" not in s
p.write_text(s)
with tempfile.TemporaryDirectory() as folder:
 for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
  attrs,code=m.groups()
  if not code.strip() or re.search(r'type=[\"\x27](?:application/json|importmap)',attrs):continue
  f=Path(folder)/('script'+str(i)+('.mjs' if 'module' in attrs else '.js'));f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
print('MOBILE_LAYOUT_PATCH_OK')
