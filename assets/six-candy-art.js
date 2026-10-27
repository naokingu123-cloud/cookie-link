/* Four candy sprites are real pixels cut from the user-approved PNG.
 * Numbers stay separate live glyphs. The rest of the decorative backdrop is Canvas.
 * Presentation consumes no game random state. */
const SIX_ART_VERSION='rounds-png-v4';
const sixArtCache=new Map();
const SIX_ART_PALETTE=[
 ['#fff0f6','#ff478c','#b81051'],['#fffbc7','#ffd71c','#d57b06'],
 ['#eeffd9','#67d826','#217d16'],['#dfffff','#28c9f1','#0660ab'],
 ['#fbeaff','#bd54f5','#6c14ad']
];
function sixArtStar(x,cx,cy,r,fill='#ffdf3e',stroke='#df8b17'){
 x.save();x.translate(cx,cy);x.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,d=k%2?r*.48:r;k?x.lineTo(Math.cos(a)*d,Math.sin(a)*d):x.moveTo(Math.cos(a)*d,Math.sin(a)*d);}x.closePath();x.fillStyle=fill;x.strokeStyle=stroke;x.lineWidth=Math.max(.7,r*.13);x.lineJoin='round';x.fill();x.stroke();x.restore();
}
function sixArtHeart(x,cx,cy,r,fill='#ff559b'){
 x.save();x.translate(cx,cy);x.beginPath();x.moveTo(0,r*.72);x.bezierCurveTo(-r*1.6,-r*.12,-r*.73,-r*1.28,0,-r*.52);x.bezierCurveTo(r*.73,-r*1.28,r*1.6,-r*.12,0,r*.72);x.fillStyle=fill;x.fill();x.strokeStyle='#fff5df';x.lineWidth=r*.12;x.stroke();x.restore();
}
function sixVectorCandySprite(color){
 color=([0,1,3,4,2][((color%5)+5)%5]);const key='candy/'+color;if(sixArtCache.has(key))return sixArtCache.get(key);
 const cv=document.createElement('canvas');cv.width=cv.height=144;const x=cv.getContext('2d'),p=SIX_ART_PALETTE[color];
 x.shadowColor=p[2]+'99';x.shadowBlur=4;x.shadowOffsetY=3;
 const shell=x.createRadialGradient(42,32,2,73,72,65);shell.addColorStop(0,'#ffffff');shell.addColorStop(.2,p[0]);shell.addColorStop(.52,p[1]);shell.addColorStop(.84,p[1]);shell.addColorStop(1,p[2]);
 x.fillStyle=shell;x.beginPath();x.arc(72,70,64,0,Math.PI*2);x.fill();x.shadowBlur=0;x.shadowOffsetY=0;x.strokeStyle=p[2];x.lineWidth=3;x.stroke();
 x.strokeStyle='#ffffffcc';x.lineWidth=2.8;x.beginPath();x.arc(72,70,58,-2.9,-.35);x.stroke();
 x.save();x.beginPath();x.arc(72,70,53,0,7);x.clip();
 const core=x.createLinearGradient(34,20,105,121);core.addColorStop(0,p[0]);core.addColorStop(.3,p[1]);core.addColorStop(1,p[2]);x.fillStyle=core;x.fillRect(12,12,120,120);
 if(color===0){
  // Strawberry candy: fruit silhouette, leaves and seeds, not a flat color disk.
  x.fillStyle='#f32355';x.beginPath();x.moveTo(72,34);x.bezierCurveTo(17,28,31,92,72,110);x.bezierCurveTo(113,92,127,28,72,34);x.fill();
  x.fillStyle='#64bc2b';for(let k=-1;k<=1;k++){x.save();x.translate(72,38);x.rotate(k*.7);x.beginPath();x.ellipse(0,-8,6,15,0,0,7);x.fill();x.restore();}
  x.fillStyle='#fff6b2';for(const [u,v,a] of [[50,55,-.2],[78,58,.2],[95,64,.4],[57,80,-.2],[79,86,.15]]){x.beginPath();x.ellipse(u,v,2.5,5,a,0,7);x.fill();}
 }else if(color===1){
  // Lemon cross-section with translucent segments.
  x.fillStyle='#fff9b4';x.beginPath();x.arc(72,70,44,0,7);x.fill();
  for(let k=0;k<8;k++){const a=k*Math.PI/4+.06;x.fillStyle=k%2?'#ffdc2f':'#ffc420';x.beginPath();x.moveTo(72+Math.cos(a)*7,70+Math.sin(a)*7);x.arc(72,70,37,a,a+Math.PI/4-.12);x.closePath();x.fill();}
  x.strokeStyle='#fffce2';x.lineWidth=2;x.beginPath();x.arc(72,70,43,0,7);x.stroke();
 }else if(color===2){
  // Lime/kiwi hard candy, kept green to preserve the game's color identity.
  x.fillStyle='#ddf38b';x.beginPath();x.arc(72,70,41,0,7);x.fill();
  x.fillStyle='#fff3c3';x.beginPath();x.ellipse(72,70,14,17,0,0,7);x.fill();
  for(let k=0;k<12;k++){const a=k*Math.PI/6;x.save();x.translate(72+Math.cos(a)*27,70+Math.sin(a)*27);x.rotate(a);x.fillStyle='#518120';x.beginPath();x.ellipse(0,0,3.6,2,0,0,7);x.fill();x.restore();}
 }else if(color===3){
  // Peppermint swirl with a blue candy-glass rim.
  x.fillStyle='#e9fffb';for(let k=0;k<6;k++){x.save();x.translate(72,70);x.rotate(k*Math.PI/3);x.beginPath();x.moveTo(0,0);x.bezierCurveTo(12,-29,41,-12,51,-18);x.arc(0,0,54,-.34,.17);x.bezierCurveTo(33,19,13,21,0,0);x.fill();x.restore();}
 }else{
  // Grape bonbon with separate glossy fruit lobes.
  for(const [u,v,r] of [[53,53,17],[78,46,17],[93,64,17],[62,76,18],[83,88,17],[64,101,13]]){const g=x.createRadialGradient(u-5,v-6,1,u,v,r);g.addColorStop(0,'#f7ceff');g.addColorStop(.24,'#d875ff');g.addColorStop(.65,'#a83ae6');g.addColorStop(1,'#701cb4');x.fillStyle=g;x.beginPath();x.arc(u,v,r,0,7);x.fill();x.strokeStyle='#7721b0';x.lineWidth=1.5;x.stroke();}
  x.fillStyle='#60cb4a';x.beginPath();x.ellipse(73,28,8,17,.7,0,7);x.fill();
 }
 x.restore();
 x.strokeStyle='#ffffffa8';x.lineWidth=2;x.beginPath();x.arc(72,70,52,0,7);x.stroke();
 x.fillStyle='#ffffffc0';x.beginPath();x.ellipse(43,28,18,8,-.55,0,7);x.fill();x.fillStyle='#ffffff70';x.beginPath();x.ellipse(109,86,5,15,.5,0,7);x.fill();
 for(const [u,v,r] of [[22,76,2],[36,106,1.4],[105,35,1.6],[118,62,1.1],[91,119,1.8]]){x.fillStyle='#fffce6c0';x.beginPath();x.arc(u,v,r,0,7);x.fill();}
 sixArtCache.set(key,cv);return cv;
}
// Original PNG-derived cells: strawberry, lemon, blue swirl, grape.
const sixCandyPng=new Image();
const sixCandyPngState={loaded:false,error:false};
sixCandyPng.onload=()=>{sixCandyPngState.loaded=true;sixArtCache.clear();try{const s=slots[2];if(s?.engine?.kind==='candy'){s.candyKey='';s.dirtyMain=s.dirtyMini=true;carnivalQueueFrame(s);}}catch{}};
sixCandyPng.onerror=()=>{sixCandyPngState.error=true;console.warn('Six Candy original artwork could not load; temporary vector fallback is visible.');};
sixCandyPng.src='assets/six-candy-png/candies.webp?v=staggered-v1';
function sixOriginalCandySprite(color){
 if(!sixCandyPngState.loaded||color<0||color>3)return sixVectorCandySprite(color);
 const key='original/'+color;if(sixArtCache.has(key))return sixArtCache.get(key);
 const cv=document.createElement('canvas'),size=sixCandyPng.naturalWidth/4;cv.width=cv.height=size;
 cv.getContext('2d').drawImage(sixCandyPng,color*size,0,size,size,0,0,size,size);
 sixArtCache.set(key,cv);return cv;
}
function sixArtNumberSprite(number){
 if(!Number.isInteger(number)||number<1||number>25)return null;const key='number/'+number;if(sixArtCache.has(key))return sixArtCache.get(key);
 const cv=document.createElement('canvas');cv.width=192;cv.height=144;const x=cv.getContext('2d'),label=String(number);
 const font='1000 112px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
 x.font=font;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineCap='round';
 const max=number>=10?168:112;
 x.strokeStyle='#551246';x.lineWidth=18;x.strokeText(label,96,78,max);
 x.strokeStyle='#ffce74';x.lineWidth=12;x.strokeText(label,96,73,max);
 x.strokeStyle='#fffceb';x.lineWidth=7;x.strokeText(label,96,70,max);
 const face=x.createLinearGradient(0,15,0,126);face.addColorStop(0,'#ffffff');face.addColorStop(.4,'#fffaf0');face.addColorStop(.6,'#ffe4ed');face.addColorStop(1,'#ff9cc3');x.fillStyle=face;x.fillText(label,96,70,max);
 // The stripes are clipped to real text glyphs, so every 1–25 remains exact.
 const mask=document.createElement('canvas');mask.width=192;mask.height=144;const z=mask.getContext('2d');z.font=font;z.textAlign='center';z.textBaseline='middle';z.fillStyle='#fff';z.fillText(label,96,70,max);z.globalCompositeOperation='source-in';z.strokeStyle='#f44787';z.lineWidth=9;
 for(let k=-120;k<240;k+=30){z.beginPath();z.moveTo(k,0);z.lineTo(k+90,144);z.stroke();}
 x.drawImage(mask,0,0);x.strokeStyle='#ffffffaa';x.lineWidth=1.8;x.strokeText(label,96,69,max);
 sixArtCache.set(key,cv);return cv;
}
function sixPaintCandyNumber(x,number,cx,cy,radius){
 const art=sixArtNumberSprite(number);if(!art)return;x.save();x.drawImage(art,cx-radius*.96,cy-radius*.77,radius*1.92,radius*1.44);x.restore();
}
function sixArtStripePattern(x){
 const key='stripe-tile';let tile=sixArtCache.get(key);
 if(!tile){tile=document.createElement('canvas');tile.width=tile.height=28;const p=tile.getContext('2d');p.fillStyle='#fff7e8';p.fillRect(0,0,28,28);p.strokeStyle='#ff4b99';p.lineWidth=11;for(const k of [-28,0,28,56]){p.beginPath();p.moveTo(k,-2);p.lineTo(k+30,30);p.stroke();}sixArtCache.set(key,tile);}
 return x.createPattern(tile,'repeat');
}
function sixArtCloud(x,cx,cy,s){x.save();x.fillStyle='#ffffffb8';x.beginPath();x.ellipse(cx,cy,s*1.5,s*.46,0,0,7);x.ellipse(cx-s*.55,cy-s*.22,s*.65,s*.58,0,0,7);x.ellipse(cx+s*.25,cy-s*.43,s*.7,s*.7,0,0,7);x.fill();x.restore();}
function sixArtTurret(x,cx,y,h,color){
 x.save();x.fillStyle='#fff0ec';x.strokeStyle='#eb9ec9';x.lineWidth=1;x.beginPath();x.roundRect(cx-9,y,18,h,3);x.fill();x.stroke();
 const roof=x.createLinearGradient(cx-12,y-24,cx+12,y);roof.addColorStop(0,'#fff4fc');roof.addColorStop(.4,color);roof.addColorStop(1,'#c64d99');x.fillStyle=roof;x.beginPath();x.moveTo(cx,y-26);x.quadraticCurveTo(cx-4,y-9,cx-14,y);x.lineTo(cx+14,y);x.quadraticCurveTo(cx+4,y-9,cx,y-26);x.fill();
 x.fillStyle='#ef7fbc';for(let k=0;k<Math.floor(h/16);k++){x.beginPath();x.roundRect(cx-3,y+7+k*16,6,9,3);x.fill();}sixArtStar(x,cx,y-28,4);x.restore();
}
function sixArtBackdrop(rows){
 const key='backdrop10/'+rows;if(sixArtCache.has(key))return sixArtCache.get(key);const cv=document.createElement('canvas');cv.width=cv.height=640;const x=cv.getContext('2d');x.scale(2,2);
 const g=x.createLinearGradient(0,0,0,320);g.addColorStop(0,'#5b2418');g.addColorStop(.5,'#8b4626');g.addColorStop(1,'#431c29');x.fillStyle=g;x.fillRect(0,0,320,320);
 x.lineWidth=9;x.strokeStyle='#ffdc86';x.strokeRect(7,3,306,314);x.lineWidth=5;x.strokeStyle=sixArtStripePattern(x);x.strokeRect(7,3,306,314);
 x.fillStyle='#fff2d00a';for(let r=0;r<20;r++)for(let c=0;c<20;c++)if((r+c)%2)x.fillRect(c*16,r*16,16,16);
 sixArtCache.set(key,cv);return cv;
}
function sixArtLogoMarkup(instance='main'){
 const id='sc-art-'+instance,colors=['#ff398d','#ffc833','#71d82c','#28c7f7','#ff3b8c','#ffca2d','#4bc8f6','#ad52f6','#ff509d'];
 const defs=colors.map((c,i)=>'<linearGradient id="'+id+'-g'+i+'" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff5ff"/><stop offset=".2" stop-color="'+c+'"/><stop offset=".7" stop-color="'+c+'"/><stop offset="1" stop-color="#b12878"/></linearGradient>').join('');
 const text=[...'シックスドロップ'].map((ch,i)=>'<text x="'+(95+i*72)+'" y="113" fill="url(#'+id+'-g'+i+')">'+ch+'</text>').join('');
 return '<svg class="six-art-logo" viewBox="0 0 760 174" role="img" aria-label="シックスドロップ SIX DROP" xmlns="http://www.w3.org/2000/svg"><defs>'+defs+'<pattern id="'+id+'-stripe" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="26" height="26" fill="#fff1e3"/><rect width="12" height="26" fill="#ff64aa"/></pattern><linearGradient id="'+id+'-r" x2="0" y2="1"><stop stop-color="#fff8d9"/><stop offset="1" stop-color="#ffd080"/></linearGradient></defs><g stroke-linejoin="round"><path d="M30 104Q380-22 730 104L715 146Q380 110 45 146Z" fill="#ff83b9" stroke="#e89c43" stroke-width="8"/><path d="M55 125Q380 90 705 125L690 159Q380 133 70 159Z" fill="url(#'+id+'-stripe)" stroke="#ffda88" stroke-width="5"/><g fill="#ffe561" stroke="#eaae3f" stroke-width="2"><path d="m382 5 7 16 18 2-13 12 3 18-15-8-16 8 3-18-13-12 18-2Z"/><path d="m81 24 5 12 13 2-9 9 2 13-11-6-12 6 3-13-10-9 13-2Z"/><path d="m673 22 5 12 13 2-9 9 2 13-11-6-12 6 3-13-10-9 13-2Z"/></g><g fill="#fff0f4" stroke="#e99ac2" stroke-width="3"><path d="M332 68V39h25v29M404 68V39h25v29M365 68V26h28v42"/><path d="m326 39 19-28 19 28m35 0 18-28 19 28m-77-13 20-23 20 23" fill="#ff86b9"/></g><g fill="#ff71ae" stroke="#fff2db" stroke-width="5"><circle cx="32" cy="77" r="28"/><circle cx="728" cy="79" r="28"/></g><g fill="none" stroke="#fff4eb" stroke-width="7"><path d="M25 83c-17-20 19-34 23-13s-18 24-23 12 12-17 14-6M720 87c-17-20 19-34 23-13s-18 24-23 12 12-17 14-6"/></g><g font-family="CookieLabels,Arial Rounded MT Bold,system-ui,sans-serif" font-size="77" font-weight="1000" text-anchor="middle" paint-order="stroke fill" stroke="#8f215e" stroke-width="16">'+text+'</g><g font-family="CookieLabels,Arial Rounded MT Bold,system-ui,sans-serif" font-size="77" font-weight="1000" text-anchor="middle" paint-order="stroke fill" stroke="#ffe7a5" stroke-width="11">'+text+'</g><g font-family="CookieLabels,Arial Rounded MT Bold,system-ui,sans-serif" font-size="77" font-weight="1000" text-anchor="middle" paint-order="stroke fill" stroke="#fffced" stroke-width="6">'+text+'</g><rect x="258" y="132" width="244" height="31" rx="13" fill="url(#'+id+'-r)" stroke="#e6a13d" stroke-width="3"/><text x="380" y="155" text-anchor="middle" font-family="system-ui,sans-serif" font-size="23" font-weight="1000" letter-spacing="4" fill="#e63987" stroke="#fff6e0" stroke-width="1" paint-order="stroke fill">SIX DROP</text></g></svg>';
}

// Round variants retain the texture, specular highlights and motifs of the supplied PNG.
const SIX_PNG_STYLES={
 lime:{src:1,h:86,s:.90},green:{src:3,h:139,s:.75},aqua:{src:2,h:189,s:.78},navy:{src:2,h:227,s:.78,light:.78},
 orange:{src:1,h:26,s:.97},yellow:{src:1,h:51,s:.94},violet:{src:3,h:279,s:.82},red:{src:0,h:348,s:.90},
 gold:{src:1,h:45,s:.9},silver:{src:2,h:222,s:.09,light:1.08},diamond:{src:3,h:194,s:.30,light:1.12}
};
function sixHsl(r,g,b){r/=255;g/=255;b/=255;const hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo,l=(hi+lo)/2;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=hi===r?(g-b)/d+(g<b?6:0):hi===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return [h,s,l];}
function sixRgb(h,s,l){h=(h%1+1)%1;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h*12)%12;return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)));};return [f(0),f(8),f(4)];}
function sixArtCandySprite(color,round=1,sugar=false,chance=false){
 const theme=chance?SIX_CHANCE_THEME:sixRoundTheme(round),name=theme.colors[color%theme.colors.length],style=SIX_PNG_STYLES[name],key='roundPNG/'+round+'/'+name+'/'+(chance?'chance':'base');
 if(sixArtCache.has(key))return sixArtCache.get(key);
 const original=sixOriginalCandySprite(style.src),cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');x.drawImage(original,0,0,128,128);
 const image=x.getImageData(0,0,128,128),d=image.data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const [h,s,l]=sixHsl(d[i],d[i+1],d[i+2]);if(s>.13){const rgb=sixRgb(style.h/360,Math.min(1,style.s*(.65+s*.35)),Math.min(.98,l*(style.light||1)));d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];}}
 x.putImageData(image,0,0);x.save();x.beginPath();x.arc(64,64,62,0,7);x.clip();
 if(round>=2){x.strokeStyle=round>=6?'#fff0afcc':'#ffffffb5';x.lineWidth=round>=6?2.2:1;x.beginPath();x.arc(64,64,58,0,7);x.stroke();}
 if(round>=3){const n=round*2;for(let i=0;i<n;i++){const ang=i*2*Math.PI/n,xp=64+Math.cos(ang)*56,yp=64+Math.sin(ang)*56;x.fillStyle=round>=6?'#ffe36d':'#fffbea';x.beginPath();x.arc(xp,yp,round>=6?1.9:1.25,0,7);x.fill();}}
 if(round>=4){x.strokeStyle='#fff3c790';x.lineWidth=1.1;x.beginPath();x.arc(64,64,51,0,7);x.stroke();}
 if(round>=6){for(const [px,py,r] of [[24,31,4],[100,84,3],[41,109,3]])sixArtStar(x,px,py,r,'#fff6bc','#f5c35e');}
 if(chance){const g=x.createLinearGradient(22,22,106,108);g.addColorStop(0,'#ffffffdd');g.addColorStop(.3,'#ffffff10');g.addColorStop(.55,'#ffffff77');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.beginPath();x.arc(64,64,51,0,7);x.fill();
  if(name==='diamond'){x.beginPath();x.moveTo(64,25);x.lineTo(101,50);x.lineTo(88,98);x.lineTo(40,98);x.lineTo(27,50);x.closePath();x.fillStyle='#dffcff50';x.fill();x.strokeStyle='#ffffffdc';x.lineWidth=1.7;x.stroke();x.beginPath();x.moveTo(64,25);x.lineTo(40,98);x.moveTo(64,25);x.lineTo(88,98);x.moveTo(27,50);x.lineTo(101,50);x.stroke();}
 }
 x.restore();sixArtCache.set(key,cv);return cv;
}
