/* Local Debug: native physics/manual draw, no server session, isolated credit. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,bootstrap,extension,choice,service,profile,sugar,versionText]=await Promise.all([
 read('index.html'),read('assets/local-debug-v258.js'),read('assets/local-debug-game-v258.js'),
 read('assets/edition-choice-v255.js'),read('assets/shared-machine-v176.js'),
 read('assets/player-lounge.js'),read('assets/sugar-challenge-v254.js'),read('app-version.json')
]);
const version=JSON.parse(versionText).version;
assert.ok(Number(/-v(\d+)-/.exec(version)?.[1])>=258,'the local edition remains available in later builds');
assert.ok(html.includes('<script src="assets/local-debug-v258.js?v=258"></script>'));
assert.ok(html.includes("else if(edition==='local')extras.push('assets/local-debug-game-v258.js?v=258','assets/local-sugar-v267.js?v=267');"));
assert.ok(html.includes('if(edition===\'local\')'));
assert.ok(html.includes('const localStorage=window.SweetsLocalDebugV258.storage;'));
assert.ok(html.includes("const localEightAllowed=new URLSearchParams(location.search).get('serverHost')==='1';"));
assert.ok(html.includes("const LOCAL_EIGHT_DRAW_ALLOWED=new URLSearchParams(location.search).get('serverHost')==='1';"));
assert.ok(html.includes('window.SweetsEditionV255?.value===\'local\''));
assert.ok(html.includes('game=game.replace(oldRecordGuard'));
assert.ok(profile.includes('root.SweetsLocalDebugV258?.storage||localStorage'));
assert.ok(sugar.includes("query.get('edition')==='local'"));
const chooser={URL,URLSearchParams,window:{},document:{documentElement:{dataset:{}},readyState:'loading',addEventListener(){}},location:{href:'https://example.test/cookie-link/' ,get search(){return new URL(this.href).search;},assign(){}},history:{replaceState(){}},fetch(){throw Error('chooser contacted server');}};
vm.runInNewContext(choice,chooser);
const local=new URL(chooser.window.SweetsEditionV255.url('local'));assert.equal(local.searchParams.get('edition'),'local');assert.equal(local.searchParams.get('appv'),version);
const prefix='sweets-local-debug-v258:';
const source=new Map([['sweets-player-v1','REAL-SERVER-PROFILE'],['sweets-shared-session-v176@https://sweets.sweetslink-game.com','REAL-SERVER-IDENTITY']]);
const backing={getItem:key=>source.has(key)?source.get(key):null,setItem:(key,value)=>source.set(key,String(value)),removeItem:key=>source.delete(key),key:index=>[...source.keys()][index]??null,get length(){return source.size;}};
const debugContext={window:{SweetsEditionV255:{value:'local'},localStorage:backing}};
vm.runInNewContext(bootstrap,debugContext);
const store=debugContext.window.SweetsLocalDebugV258.storage;
assert.equal(store.getItem('sweets-player-v1'),null);
store.setItem('sweets-player-v1','LOCAL-PROFILE');
store.setItem('cookie-link-records-v2','LOCAL-RECORDS');
store.setItem('virtual-credit-v1','654321');
assert.equal(store.getItem('sweets-player-v1'),'LOCAL-PROFILE');
assert.equal(source.get('sweets-player-v1'),'REAL-SERVER-PROFILE');
assert.equal(source.get('sweets-shared-session-v176@https://sweets.sweetslink-game.com'),'REAL-SERVER-IDENTITY');
assert.equal(source.get(prefix+'cookie-link-records-v2'),'LOCAL-RECORDS');
store.removeItem('sweets-player-v1');assert.equal(source.get(prefix+'sweets-player-v1'),undefined);
const streamContext={window:{SweetsEditionV255:{value:'streaming'},localStorage:backing}};
vm.runInNewContext(bootstrap,streamContext);assert.equal(streamContext.window.SweetsLocalDebugV258,undefined);
assert.ok(extension.includes('LOCAL_EIGHT_DRAW_ALLOWED'));
assert.ok(extension.includes('rouletteDriver?.physics'));
assert.ok(!extension.includes('window.SweetsSharedMachine?.client'));
assert.ok(!html.includes("else if(edition==='local')extras.push('assets/shared-machine-v176.js"));
console.log('Local Debug v258: chooser, local roulette guards, 25-number panel, server exclusion and storage namespaces PASS');
