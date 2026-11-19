/* A private localStorage namespace, available only to the explicit DEV edition. */
(()=>{
 'use strict';
 if(window.SweetsEditionV255?.value!=='local')return;
 const prefix='sweets-local-debug-v258:';
 const memory=new Map();let backend=null;
 try{backend=window.localStorage;}catch{}
 const keyFor=key=>prefix+String(key);
 const storage={
  keyFor,
  getItem(key){const name=keyFor(key);try{const value=backend?.getItem(name);if(value!==null&&value!==undefined){memory.set(name,value);return value;}}catch{}return memory.has(name)?memory.get(name):null;},
  setItem(key,value){const name=keyFor(key),text=String(value);memory.set(name,text);try{backend?.setItem(name,text);}catch{}},
  removeItem(key){const name=keyFor(key);memory.delete(name);try{backend?.removeItem(name);}catch{}},
  key(index){let found=[];try{for(let i=0;i<(backend?.length||0);i++){const name=backend.key(i);if(name?.startsWith(prefix))found.push(name);}}catch{}return found[index]?.slice(prefix.length)??null;},
  get length(){let total=0;try{for(let i=0;i<(backend?.length||0);i++)if(backend.key(i)?.startsWith(prefix))total++;}catch{}return total;}
 };
 window.SweetsLocalDebugV258={version:258,edition:'local',storage,namespace:prefix,ready:false};
})();
