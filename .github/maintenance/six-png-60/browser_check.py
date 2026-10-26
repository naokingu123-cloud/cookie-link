from pathlib import Path
p=Path('.github/tests/six_candy_staggered_browser.py');s=p.read_text()
for selector in ['#panel0','#choco-odds','#carnival-odds']:
 old=f"assert page.locator('{selector}').is_visible()"
 assert s.count(old)==1
 s=s.replace(old,f"page.locator('{selector}').wait_for(state='visible',timeout=10000);{old}")
anchor=' assert not errors,errors\n'
assert s.count(anchor)==1
s=s.replace(anchor,''' # Separate native desktop context, not just a mobile viewport resized to PC width.
 pc=browser.new_context(viewport={'width':1280,'height':900},is_mobile=False,device_scale_factor=1)
 pg=pc.new_page();pg.on('pageerror',lambda e:errors.append(str(e)))
 if memory:pg.set_content(html,wait_until='domcontentloaded')
 else:pg.goto(url,wait_until='domcontentloaded')
 pg.wait_for_function('window.__qa?.sixCandyPngState.loaded',timeout=30000)
 if not memory:pg.wait_for_function('__qa.ready',timeout=30000)
 pg.evaluate('__qa.redraw();document.fonts.ready');pg.wait_for_timeout(150)
 if memory:pg.evaluate('__qa.app.drawSource={ready:true,start(){},pause(){},reset(){}};__qa.resume();__qa.app.start();__qa.freeze();__qa.redraw()')
 else:pg.evaluate('__qa.resume();__qa.startReadyRound();__qa.driver.setPaused(true);__qa.freeze();__qa.redraw()')
 pg.wait_for_timeout(150);assert sorted(pg.evaluate('__qa.captureNumbers()'))==list(range(1,26))
 report['nativeDesktop']=pg.evaluate("()=>{const o=document.querySelector('#carnival-odds');if(o.scrollHeight>o.clientHeight+2)throw Error('Desktop odds clipping');return {width:innerWidth,height:innerHeight,artLoaded:__qa.sixCandyPngState.loaded,rouletteLoaded:__qa.ready,candies:__qa.app.engines[2].pyramid.flat().filter(Boolean).length}}")
 pg.screenshot(path=str(out/'desktop-native.png'));pc.close()
'''+anchor)
p.write_text(s)
