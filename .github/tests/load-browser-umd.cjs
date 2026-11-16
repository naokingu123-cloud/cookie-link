'use strict';
const {readFileSync}=require('node:fs');
const {resolve,dirname}=require('node:path');
const {createRequire}=require('node:module');

// These trusted browser UMD files use module.exports when it is available.
// Load them in a CommonJS function scope even when package.json marks .js as
// ESM. Keep the current realm so their arrays/objects work with strict asserts.
module.exports=function loadBrowserUmd(relativePath){
 const filename=resolve(__dirname,relativePath),loaded={exports:{}};
 const evaluate=new Function('module','exports','require','__filename','__dirname',readFileSync(filename,'utf8'));
 evaluate.call(loaded.exports,loaded,loaded.exports,createRequire(filename),filename,dirname(filename));
 return loaded.exports;
};
