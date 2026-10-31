/* SWEETS LINK compact 12-board layout trial: four previews per existing
 * game tab, never inside the full-size playing board.
 * Display trial only: each of the twelve thumbnail boards has an
 * independent seeded visual; independent payouts/engines are NOT created.
 * No touches to app.engines, app.bet, user credits, or roulette timing.
 */
(()=>{
'use strict';
try{
 const TICK_MS=430, frames=[];
 const palettes=[
  ['#e5c587','#fa8aa7','#e9ba62','#67c58b','#7cb6f7','#a98ae1'],
  ['#f6ecd8','#f3b5c7','#c79166','#51362f','#e0a65e'],
  ['#27bae7','#1458bb','#4fdd71','#15b785']
 ];
 const slotsRoot=document.getElementById('tabs');
 let installed=false, tick=0;
 if(!slotsRoot)throw Error('Main game tabs not found');
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 function rng(seed){
   let k=(seed|0)||1;
   return ()=>{
     k^=k<<13;k^=k>>>17;k^=k<<5;
     return (k>>>0)/4294967296;
   };
 }
 function roundedRect(g,x,y,w,h,r,fill){
   g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();
 }
 function drawCookie(g,random){
   const cells=7,s=5.32,off=3.4;
   roundedRect(g,1,1,42,42,5,'#49302e');
   for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){
     const q=Math.floor(random()*6),col=palettes[0][q];
     roundedRect(g,off+x*s,off+y*s,s-0.5,s-0.5,1.1,col);
     g.fillStyle='rgba(255,255,255,.36)';g.fillRect(off+x*s+1,off+y*s+1,2.1,.8);
   }
 }
 function drawCanyon(g,random){
   roundedRect(g,1,1,42,42,5,'#352126');
   const size=4.8,off=5;
   for(let r=0;r<8;r++)for(let c=0;c<7;c++){
     const n=Math.floor(random()*5),col=palettes[1][n];
     const x=off+c*size,y=3+r*size;
     roundedRect(g,x,y,size-.35,size-.35,.8,col);
     g.fillStyle='rgba(255,255,255,.22)';g.fillRect(x+.65,y+.7,size-1.5,.7);
   }
   g.fillStyle='#ffe3ad';g.font='bold 5px sans-serif';g.textAlign='right';g.fillText('10m',39,42);
 }
 function drawDrop(g,random){
   roundedRect(g,1,1,42,42,5,'#f7dcfc');
   for(let row=0;row<9;row++){
     const n=row%2===0?8:7,dx=row%2===0?0:2.3;
     for(let col=0;col<n;col++){
       if(random()<.08)continue;
       const x=4.3+col*4.75+dx, y=4.4+row*4.33;
       const clr=palettes[2][Math.floor(random()*4)];
       g.beginPath();g.arc(x,y,2.25,0,Math.PI*2);
       g.fillStyle=clr;g.fill();g.strokeStyle='#fff9df';g.lineWidth=.42;g.stroke();
       g.beginPath();g.arc(x-.62,y-.75,.7,0,Math.PI*2);
       g.fillStyle='rgba(255,255,255,.57)';g.fill();
     }
   }
 }
 function paint(entry,seed){
   const g=entry.ctx;if(!g)return;
   g.clearRect(0,0,44,44);
   const random=rng((entry.game+5)*390841+(entry.index+11)*104729+seed*1723);
   if(entry.game===0)drawCookie(g,random);
   else if(entry.game===1)drawCanyon(g,random);
   else drawDrop(g,random);
 }
 function build(){
   if(installed)return true;
   const slots=Array.from(slotsRoot.querySelectorAll('.tab-slot'));
   if(slots.length!==3)return false;
   slots.forEach((host,game)=>{
     const tab=host.querySelector('.tab');
     if(!tab)return;
     if(tab.querySelector('.mini-fleet-four'))return;
     const grid=document.createElement('div');
     grid.className='mini-fleet-four';
     grid.setAttribute('aria-label',String(game+1)+'番ゲームの小盤面4面配置テスト');
     for(let i=0;i<4;i++){
       const pane=document.createElement('div');
       pane.className='mini-fleet-pane';
       pane.setAttribute('aria-label',String(i+1)+'番小盤面、配置試験用');
       const canvas=document.createElement('canvas');
       canvas.width=44;canvas.height=44;
       canvas.setAttribute('aria-hidden','true');
       const text=document.createElement('div');
       text.className='mini-fleet-meta';
       const top=document.createElement('b');top.textContent=String(i+1);
       const bottom=document.createElement('small');bottom.textContent='TEST';
       text.append(top,bottom);pane.append(canvas,text);grid.append(pane);
       const ctx=canvas.getContext('2d',{alpha:false});
       frames.push({game,index:i,ctx,canvas});
     }
     tab.append(grid);
   });
   if(frames.length!==12)return false;
   document.body.classList.add('twelve-tab-layout-trial');
   installed=true;return true;
 }
 // The three original game selections remain the only tab buttons.
 // 4 miniature previews are not buttons and don't change active game.
 function update(){
   if(!installed&&!build())return;
   if(document.hidden)return;
   // Stable still-like miniatures during one round; a fresh layout
   // appears when the app advances its round. No game state is altered.
   const roundKey=app?.phase==='ready'?0:(Number(app?.drawIndex)||Number(app?.drawn?.length)||1);
   for(const frame of frames)paint(frame,roundKey);
   tick++;
 }
 update();
 const timer=setInterval(update,TICK_MS);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 console.info('[TwelveTabTrial] 4 cookie + 4 canyon + 4 drop thumbnails, only in existing tabs');
}catch(e){console.error('[TwelveTabTrial]',e);}
})();