/* SWEETS LINK v157 compatibility loader.
   The visible notice area moved to the existing roulette information strip in v158. */
(()=>{
'use strict';
document.querySelectorAll('.sweets-event-ticker').forEach(el=>el.remove());

if(!document.getElementById('arcade-candy-world-v158-css')){
 const link=document.createElement('link');
 link.id='arcade-candy-world-v158-css';
 link.rel='stylesheet';
 link.href='assets/arcade-candy-world-v158.css?v=158';
 document.head.append(link);
}

const scripts=[
 ['arcade-candy-sfx-v158-js','assets/arcade-candy-sfx-v158.js?v=158'],
 ['arcade-candy-world-v158-js','assets/arcade-candy-world-v158.js?v=158']
];
function load(index){
 if(index>=scripts.length)return;
 const [id,src]=scripts[index],old=document.getElementById(id);
 if(old){load(index+1);return;}
 const script=document.createElement('script');
 script.id=id;script.src=src;script.async=false;
 script.onload=()=>load(index+1);
 script.onerror=()=>{console.error('[SweetsWorldV158] failed to load '+src);load(index+1);};
 document.head.append(script);
}
load(0);
})();
