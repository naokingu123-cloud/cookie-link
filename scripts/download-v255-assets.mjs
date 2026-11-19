/* Rebuild after all runtime edits; stale hashes fail the offline installer. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('..',import.meta.url),paths=['index.html','app-version.json'];
async function walk(relative){for(const entry of await fs.readdir(new URL(relative+'/',root),{withFileTypes:true})){const file=relative+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(entry.isFile()&&/\.(?:js|css|webp|png|avif|svg|woff2|mp3|wav|json|txt)$/.test(file)&&file!=='assets/download-assets-v255.json')paths.push(file);}}
await walk('assets');await walk('optimized');
const version=JSON.parse(await fs.readFile(new URL('app-version.json',root),'utf8')).version;
const files=[];for(const file of paths.sort()){const data=await fs.readFile(new URL(file,root));files.push({path:file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
const value={version,files,totalBytes:files.reduce((n,file)=>n+file.bytes,0)};
await fs.writeFile(new URL('assets/download-assets-v255.json',root),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({version,files:files.length,bytes:value.totalBytes}));
