import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const encoded=[1,2,3].map(i=>fs.readFileSync(`scripts/sixdrop-v247-payload-${i}.b64`,'utf8').trim()).join('');
const packed=Buffer.from(encoded,'base64');
if(hash(packed)!=='fa79189df9910550695eb04cee163741375fd6e486b6092a110b48dfefba2b5f')throw Error('Six Drop transfer checksum mismatch');
const data=JSON.parse(brotliDecompressSync(packed).toString());
for(const item of data.files){
 const name=item.path;
 if(!/^(assets|tests)\/[a-zA-Z0-9._-]+$/.test(name)&&!['index.html','app-version.json','server-payout-preload-v3.mjs'].includes(name))throw Error('Unexpected patch path '+name);
 const before=fs.existsSync(name)?fs.readFileSync(name):Buffer.alloc(0);
 if(item.before===null?before.length>0:hash(before)!==item.before)throw Error('Source changed '+name);
 let cursor=0;const chunks=[];
 for(const [start,end,text] of item.edits){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<cursor||end<start||end>before.length)throw Error('Invalid source range '+name);
  chunks.push(before.subarray(cursor,start),Buffer.from(text));cursor=end;
 }
 chunks.push(before.subarray(cursor));const after=Buffer.concat(chunks);
 if(hash(after)!==item.after)throw Error('Result hash mismatch '+name);
 fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,after);
 console.log('SIXDROP_PATCH',name,after.length);
}
fs.mkdirSync('.runtime',{recursive:true});fs.writeFileSync('.runtime/sixdrop-patched-paths.json',JSON.stringify(data.files.map(x=>x.path)));
