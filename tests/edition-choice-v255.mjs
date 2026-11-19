import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../assets/edition-choice-v255.js',import.meta.url),'utf8');
const version=JSON.parse(await fs.readFile(new URL('../app-version.json',import.meta.url),'utf8')).version;
function load(url){
 const events=[],navigations=[],location={href:url,get search(){return new URL(this.href).search;},assign(url){navigations.push(url);}};
 const context={URL,URLSearchParams,location,history:{replaceState(_state,_title,url){location.href=url;}},window:{},document:{readyState:'loading',documentElement:{dataset:{}},addEventListener:(...args)=>events.push(args)},fetch(){throw Error('the chooser must not create a player connection');}};
 vm.runInNewContext(source,context);return {api:context.window.SweetsEditionV255,location,events,navigations,dataset:context.document.documentElement.dataset};
}
const old=load('https://example.test/game/?appv=20261119-v254-sugar&games=castella&machine=room-2&sharedServer=https%3A%2F%2Fserver.example');
assert.equal(old.api.value,'');assert.equal(old.dataset.edition,'choice');assert.equal(old.events.length,1);assert.deepEqual(old.navigations,[]);
const chosen=new URL(old.api.url('download'));
assert.equal(chosen.searchParams.get('edition'),'download');assert.equal(chosen.searchParams.get('appv'),version);
assert.equal(chosen.searchParams.get('machine'),'room-2');assert.equal(chosen.searchParams.get('sharedServer'),'https://server.example');assert.equal(chosen.searchParams.has('games'),false);
const direct=load('https://example.test/game/?edition=download&appv=20261119-v254-sugar&set=classic');
assert.equal(direct.api.value,'download');assert.equal(direct.api.buildVersion,version);assert.equal(new URL(direct.location.href).searchParams.get('appv'),version);
assert.equal(new URL(direct.location.href).searchParams.has('set'),false);assert.deepEqual(direct.navigations,[],'pin the shell without discarding a pending recording through a reload');
assert.equal(new URL(load('https://example.test/game/?edition=download').location.href).searchParams.get('appv'),version);
assert.equal(load('https://example.test/game/?serverHost=1').api.internal,true);
assert.equal(load('https://example.test/game/?downloadWorker=1').api.internal,true);
const debugLink=new URL(old.api.url('local'));
assert.equal(debugLink.searchParams.get('edition'),'local');
assert.equal(debugLink.searchParams.get('appv'),version);
assert.equal(debugLink.searchParams.get('machine'),'room-2');
assert.equal(debugLink.searchParams.has('sharedServer'),false,'local mode never shares a configured server endpoint');
assert.equal(load(debugLink.href).api.value,'local');
const local=load('https://example.test/game/?edition=local&appv='+version);assert.equal(local.dataset.edition,'local');
assert.equal(local.navigations.length,0);
const streaming=load('https://example.test/game/?edition=streaming&appv=old');assert.equal(new URL(streaming.location.href).searchParams.get('appv'),'old');
console.log('edition-choice-v255: old-version launch, download pin, chooser isolation and internal bypass PASS');
