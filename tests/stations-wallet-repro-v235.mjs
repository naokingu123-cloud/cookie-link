// Run the unchanged wallet/restart assertions, retaining child-server diagnostics
// if a transport fails. This does not retry, suppress, or relax an assertion.
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
const native=childProcess.spawn,logs=[];
childProcess.spawn=function(...args){
 const child=native.apply(this,args),pid=child.pid;
 for(const stream of [child.stdout,child.stderr])stream?.on('data',chunk=>logs.push('['+pid+'] '+String(chunk)));
 child.on('exit',(code,signal)=>logs.push('['+pid+'] exit '+code+' '+signal));
 return child;
};
syncBuiltinESMExports();
try{await import('./server-wallet-v228.mjs');console.log('STATIONS_V235_WALLET_PASS');}
catch(error){console.error('--- isolated server diagnostics ---\n'+logs.join(''));throw error;}
finally{childProcess.spawn=native;syncBuiltinESMExports();}
