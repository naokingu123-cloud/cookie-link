"""Read-only proof that the existing Pages site serves and runs this release."""
from pathlib import Path
import hashlib,json,os,time,urllib.request
from playwright.sync_api import sync_playwright
base='https://naokingu123-cloud.github.io/cookie-link/'
revision=os.environ.get('GITHUB_SHA','stage-v5')
checks=['index.html','assets/six-candy-stage.js','assets/six-candy-png/frame.webp','assets/six-candy-png/candies.webp']
expected={name:hashlib.sha256(Path(name).read_bytes()).hexdigest() for name in checks};actual={};last=''
for attempt in range(35):
 try:
  for name in checks:
   req=urllib.request.Request(base+name+'?verify='+revision,headers={'Cache-Control':'no-cache'})
   with urllib.request.urlopen(req,timeout=15) as response:data=response.read()
   actual[name]=hashlib.sha256(data).hexdigest()
  if actual==expected:break
  last='CDN not updated'
 except Exception as e:last=str(e)
 time.sleep(4)
else:raise AssertionError((last,actual,expected))
out=Path('qa-six-v5');out.mkdir(exist_ok=True);errors=[];report={'revision':revision,'matching_sha256':actual,'screens':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 for w,h,mobile in [(430,932,True),(1280,900,False)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile);page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  response=page.goto(base+'?v='+revision,wait_until='domcontentloaded',timeout=45000);assert response.status==200
  page.locator('.carnival-canvas[data-version="bet-guide-stage-v5"][data-mode="tutorial"]').wait_for(state='visible',timeout=30000)
  page.locator('.a8-stage canvas').first.wait_for(state='visible',timeout=30000)
  page.wait_for_timeout(1000);page.screenshot(path=str(out/f'public-tutorial-{w}.png'))
  if mobile:
   page.wait_for_function('document.querySelector(".carnival-canvas").dataset.scene==="3"',timeout=20000)
   page.screenshot(path=str(out/'public-tutorial-last-scene.png'))
   page.wait_for_function('document.querySelector(".carnival-canvas").dataset.mode==="playing"',timeout=15000)
  else:
   page.locator('#debug-start').click(timeout=30000)
   page.wait_for_function('document.querySelector(".carnival-canvas").dataset.mode==="playing"',timeout=10000)
  info=page.evaluate('''()=>{const c=document.querySelector('.carnival-canvas'),gl=document.querySelector('.a8-stage canvas'),o=document.querySelector('#carnival-odds'),head=document.querySelector('#carnival-heading');return {mode:c.dataset.mode,board:c.getAttribute('aria-label'),roundCards:head.querySelectorAll('.six-round-card').length,roundNow:head.querySelector('.current b').textContent,allClear:head.querySelector('.six-allclear-banner b').textContent,rouletteCanvas:{width:gl.width,height:gl.height},frameRequested:performance.getEntriesByType('resource').some(v=>v.name.includes('frame.webp')),originalPngRequested:performance.getEntriesByType('resource').some(v=>v.name.includes('candies.webp')),roleRows:document.querySelectorAll('.six-role-summary-row').length,roleTotal:document.querySelector('.six-role-summary-total b')?.textContent,oddsFits:o.scrollHeight<=o.clientHeight+2}}''')
  assert info['mode']=='playing' and '10段' in info['board'],info
  assert info['originalPngRequested'] and info['frameRequested'] and info['rouletteCanvas']['width']>0 and info['roleRows']==3 and info['roleTotal'].endswith(' WIN') and info['roundCards']==3 and info['oddsFits'],info
  page.screenshot(path=str(out/f'public-playing-{w}.png'));report['screens'].append({'width':w,'height':h,'automaticBetStart':mobile,**info});ctx.close()
 browser.close()
assert not errors,errors
report['pageErrors']=errors;(out/'public-deployment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('PUBLIC_V5_PAGES_VERIFIED',json.dumps(report,ensure_ascii=False),flush=True)
