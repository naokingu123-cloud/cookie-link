"""Read-only public deployment comparison and browser smoke check."""
from pathlib import Path
import hashlib,json,os,time,urllib.request
from playwright.sync_api import sync_playwright
base='https://naokingu123-cloud.github.io/cookie-link/'
revision=os.environ.get('GITHUB_SHA','verified')
checks=['index.html','assets/six-candy-png/candies.webp']
expected={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in checks}
actual={};last=None
for attempt in range(35):
 try:
  for path in checks:
   req=urllib.request.Request(base+path+'?verify='+revision,headers={'Cache-Control':'no-cache'})
   with urllib.request.urlopen(req,timeout=15) as response:data=response.read()
   actual[path]=hashlib.sha256(data).hexdigest()
  if actual==expected:break
  last='Public revision not yet matched'
 except Exception as exc:last=str(exc)
 time.sleep(4)
else:raise AssertionError(f'Public deployment mismatch: {last}; {actual}; expected {expected}')
out=Path('qa-six-v4');out.mkdir(exist_ok=True)
report={'url':base,'revision':revision,'matching_sha256':actual,'screens':[]};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 for w,h,mobile in [(430,932,True),(1280,900,False)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile)
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  response=page.goto(base+'?v='+revision,wait_until='domcontentloaded',timeout=45000);assert response.status==200
  page.locator('.six-round-cards').wait_for(state='visible',timeout=30000)
  page.locator('.a8-stage canvas').first.wait_for(state='visible',timeout=30000)
  assert page.locator('#six-row-select').count()==0
  page.wait_for_timeout(1500)
  info=page.evaluate("()=>{const c=document.querySelector('.carnival-canvas'),gl=document.querySelector('.a8-stage canvas'),o=document.querySelector('#carnival-odds');return {board:c.getAttribute('aria-label'),round:document.querySelector('#carnival-complete').textContent,rouletteCanvas:{width:gl.width,height:gl.height},originalPngRequested:performance.getEntriesByType('resource').some(v=>v.name.includes('six-candy-png/candies.webp')),threeTables:document.querySelectorAll('.six-role-window').length,oddsFits:o.scrollHeight<=o.clientHeight+2}}")
  assert info['originalPngRequested'] and info['rouletteCanvas']['width']>0 and info['threeTables']==3 and info['oddsFits'],info
  assert '10段' in info['board'],info
  page.screenshot(path=str(out/f'public-{w}.png'));report['screens'].append({'width':w,'height':h,**info});ctx.close()
 browser.close()
assert not errors,errors
report['pageErrors']=errors;(out/'public-deployment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('PUBLIC_V4_PAGES_VERIFIED',json.dumps(report,ensure_ascii=False),flush=True)
