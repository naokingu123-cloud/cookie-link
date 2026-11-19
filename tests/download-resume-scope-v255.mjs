import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';

const source=await fs.readFile(new URL('../assets/download-mode-v255.js',import.meta.url),'utf8');
const policy=source.slice(source.indexOf('function resumeIdentity('),source.indexOf('function openDatabase('));
const validator=source.slice(source.indexOf('async function validatePackage('),source.indexOf('function checkpointAt('));
const base='https://recording.example',playerId='fixture-player',machine='fixture-room';
const ids=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const pack={version:255,sessionId:'fixture-round',gameIds:ids,numbers:[1,2,3,4,5,6,7,8],initialState:{gameIds:ids},finalState:{credit:123},playback:{
 rngTapes:{streams:{}},checkpoints:Array.from({length:9},(_,ballIndex)=>({ballIndex})),
 recording:{version:255,hits:Array.from({length:8},(_,i)=>({number:i+1,atMs:(i+1)*1000}))}
}};
const digest=createHash('sha256').update(JSON.stringify(pack)).digest('hex');
const active={version:255,base,machine,playerId,response:{playerId},package:pack,session:{id:pack.sessionId,status:'ready',package:{sha256:digest}},progress:{ballIndex:3,seq:4,complete:false,pendingComplete:false}};
let record=structuredClone(active),reads=[];
const sessions=new Map([[base,{playerId,token:'isolated-fixture-token'}]]);
const context={URL,TextEncoder,crypto:webcrypto,machine,SweetsLineup:{ids},navigator:{onLine:true},G:{readSession(_key,server){return sessions.get(server)||{};}},renderer:{validate(value){assert.equal(value.version,255);}},async stored(operation,value,key){assert.equal(operation,'get');assert.equal(value,undefined);reads.push(key);return record;},fetch(){throw Error('local resume validation cannot contact any endpoint');}};
vm.runInNewContext(policy+validator+';globalThis.resumeTests={resumeIdentity,readVerifiedCache};',context);
const {resumeIdentity,readVerifiedCache}=context.resumeTests;
const identity=resumeIdentity({base,machine,playerId});
assert.equal(identity.base,base);assert.equal(identity.playerId,playerId);
const restored=await readVerifiedCache(identity,{unfinishedOnly:true});
assert.equal(restored.package.sessionId,'fixture-round');assert.deepEqual(reads,[base+'@'+machine+'@'+playerId]);
assert.equal(resumeIdentity({base:'http://recording.example',machine,playerId}),null);
assert.equal(resumeIdentity({base:'https://user:password@recording.example',machine,playerId}),null);
assert.equal(resumeIdentity({base:base+'/another-app',machine,playerId}),null);
assert.equal(resumeIdentity({base,machine:'another-room',playerId}),null);
assert.equal(resumeIdentity({base,machine,playerId:'another-player'}),null);
assert.equal(resumeIdentity({base:'https://new-config.example',machine,playerId}),null,'a remembered token cannot migrate to a discovery replacement host');

record={...structuredClone(active),playerId:'another-player'};assert.equal(await readVerifiedCache(identity,{unfinishedOnly:true}),null);
record={...structuredClone(active),response:{playerId:'another-player'}};assert.equal(await readVerifiedCache(identity,{unfinishedOnly:true}),null);
record=structuredClone(active);record.package.finalState.credit++;await assert.rejects(readVerifiedCache(identity,{unfinishedOnly:true}),/integrity_error/);
record=structuredClone(active);delete record.session.package.sha256;assert.equal(await readVerifiedCache(identity,{unfinishedOnly:true}),null);
record=structuredClone(active);record.session.status='complete';assert.equal(await readVerifiedCache(identity,{unfinishedOnly:true}),null,'completed history does not select an old endpoint');
record=structuredClone(active);record.progress.complete=true;assert.equal(await readVerifiedCache(identity,{unfinishedOnly:true}),null);
record.progress.pendingComplete=true;assert.equal((await readVerifiedCache(identity,{unfinishedOnly:true})).progress.pendingComplete,true,'an unsent completion ACK keeps its original server');
record=null;assert.equal(await readVerifiedCache(identity,{unfinishedOnly:true}),null);
assert.ok(source.indexOf('readVerifiedCache(identity,{unfinishedOnly:true})')<source.indexOf('base=await G.discover'), 'verified local recovery must precede online discovery');
console.log('download-resume-scope-v255: online-but-unreachable discovery, identity scope, pending ACK and corrupt-cache rejection PASS');
