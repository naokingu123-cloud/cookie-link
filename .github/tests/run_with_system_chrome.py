"""Run unchanged Playwright assertions with a detected system Chrome when available."""
import os,runpy,sys
from pathlib import Path
from playwright.sync_api import BrowserType
if len(sys.argv)!=2:
 raise SystemExit('Usage: run_with_system_chrome.py <test.py>')
executable=os.environ.get('SIX_BROWSER_EXECUTABLE','').strip()
if executable:
 if not Path(executable).is_file():raise SystemExit('Configured Chrome executable does not exist')
 original=BrowserType.launch
 def launch(self,*args,**kwargs):
  if self.name=='chromium' and 'executable_path' not in kwargs:kwargs['executable_path']=executable
  return original(self,*args,**kwargs)
 BrowserType.launch=launch
 print('VERIFICATION_BROWSER',executable,flush=True)
runpy.run_path(sys.argv[1],run_name='__main__')
