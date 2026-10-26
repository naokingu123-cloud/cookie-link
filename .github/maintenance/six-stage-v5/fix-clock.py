from pathlib import Path
import hashlib
R=Path.cwd();A=R/'assets'
html=(R/'index.html').read_text();bb=html.encode();assert hashlib.sha1(b'blob '+str(len(bb)).encode()+b'\0'+bb).hexdigest()=='a79a9ba2163eb407f910e0583f9b19fcceeff8b4'
old_u=(A/'six-candy-rounds-ui.js').read_text();old_b=(A/'six-candy.js').read_text();old_c=(A/'six-candy-stage.css').read_text()
a='if(ready){sixDrawTutorial(s,time,bet);'
b='if(ready){const guideTime=Math.min(SIX_TUTORIAL_DURATION-1,autoRoundRemaining>=0&&autoRoundRemaining<=BET_DURATION_MS?BET_DURATION_MS-autoRoundRemaining:time);sixDrawTutorial(s,guideTime,bet);'
assert old_u.count(a)==1;u=old_u.replace(a,b,1);assert old_b.count(old_u)==1;bundle=old_b.replace(old_u,u,1)
assert old_c.count('.six-allclear-banner strong{')==1;css=old_c.replace('.six-allclear-banner strong{','#carnival-heading .six-allclear-banner strong{',1)
assert html.count(old_b)==1 and html.count(old_c)==1;new=html.replace(old_b,bundle,1).replace(old_c,css,1)
assert new.replace(bundle,old_b,1).replace(css,old_c,1)==html
for path,value in [(A/'six-candy-rounds-ui.js',u),(A/'six-candy.js',bundle),(A/'six-candy-stage.css',css),(R/'index.html',new)]:path.write_text(value)
p=R/'.github/tests/six_stage_v5_browser.py';t=p.read_text();assert t.count('window.__qa={')==1
t=t.replace('window.__qa={','window.__qa={setBetRemaining(ms){autoRoundRemaining=ms;},',1)
marker=" report['tutorial']=page.evaluate"
extra=""" report['betClock']=page.evaluate(r'''()=>{const q=__qa,s=q.slots[2];s.candyTime=1;q.setBetRemaining(12000);q.redraw();if(s.candyCanvas.dataset.scene!=='1')throw Error('Tutorial did not follow BET clock');q.setBetRemaining(4000);q.redraw();if(s.candyCanvas.dataset.scene!=='3')throw Error('Tutorial did not finish before BET ends');q.setBetRemaining(3600000);return {usesRealBetClock:true,independentOfFrameRate:true}}''')
"""
assert t.count(marker)==1;t=t.replace(marker,extra+marker,1);p.write_text(t)
print('BET_CLOCK_AND_HEADER_FIXED')
