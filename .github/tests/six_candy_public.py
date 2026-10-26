"""Read-only deployment check: compare public bytes and open the unmodified game."""
from pathlib import Path
import hashlib,json,os,time,urllib.request
from playwright.sync_api import sync_playwright
base='https://naokingu123-cloud.github.io/cookie-link/'
revision=os.environ.get('GITHUB_SHA','verified')
checks=['index.html','assets/six-candy-png/candies.webp']
expected={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in checks}
actual={};last=None
for attempt in range(30):
 try:
  for path in checks:
   request=urllib.request.Request(base+path+'?verify='+revision,headers={'Cache-Control':'no-cache'})
   with urllib.request.urlopen(request,timeout=15) as response:data=response.read()
   actual[path]=hashlib.sha256(data).hexdigest()
  if actual==expected:break
  last='Public revision has not matched checkout yet'
 except Exception as exc:last=str(exc)
 time.sleep(4)
else:raise AssertionError(f'Public deployment mismatch: {last}; {actual}; expected {expected}')
out=Path('qa-six-staggered');out.mkdir(exist_ok=True)
report={'url':base,'revision':revision,'matching_sha256':actual,'screens':[]};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 for width,height,mobile in [(430,932,True),(1280,900,False)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  response=page.goto(base+'?v='+revision,wait_until='domcontentloaded',timeout=45000)
  assert response.status==200
  page.locator('#six-row-select').wait_for(state='visible',timeout=30000)
  assert page.locator('#six-row-select').input_value()=='8'
  page.locator('.a8-stage canvas').first.wait_for(state='visible',timeout=30000)
  page.wait_for_function("document.querySelector('.six-round-label')?.textContent.includes('4色')")
  page.wait_for_timeout(2000)
  info=page.evaluate("()=>{const c=document.querySelector('.carnival-canvas'),gl=document.querySelector('.a8-stage canvas');return {board:c.getAttribute('aria-label'),round:document.querySelector('.six-round-label').textContent,rouletteCanvas:{width:gl.width,height:gl.height},originalPngRequested:performance.getEntriesByType('resource').some(v=>v.name.includes('six-candy-png/candies.webp'))}}")
  assert info['originalPngRequested'] and info['rouletteCanvas']['width']>0
  assert '60個' in info['board'],info
  page.screenshot(path=str(out/f'public-{width}.png'))
  report['screens'].append({'width':width,'height':height,**info});context.close()
 browser.close()
assert not errors,errors
report['pageErrors']=errors
(out/'public-deployment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('PUBLIC_PAGES_VERIFIED',json.dumps(report,ensure_ascii=False),flush=True)
