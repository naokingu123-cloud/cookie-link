/* Canvas paytables share the same cut-out confection borders as the HTML panels. */
const drawSweetFrame=(()=>{
 const frames=new Map();
 for(const id of SweetsLineup.chosen.filter(id=>['choco','jelly','popcorn'].includes(id))){
  const art=new Image();art.src='assets/sweet-skins/'+id+'-frame.webp';
  frames.set(id,{art});
 }
 return (ctx,id,x,y,w,h,edge)=>{
  const frame=frames.get(id);
  if(!frame?.art.naturalWidth||w<=0||h<=0)return;
  const width=Math.round(w*2),height=Math.round(h*2);
  const rim=Math.min(Math.round(edge*2),Math.floor(Math.min(width,height)/2));
  if(!rim)return;
  const key=width+'/'+height+'/'+rim;
  if(frame.key!==key){
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const c=canvas.getContext('2d'),image=frame.art,size=image.naturalWidth,corner=Math.round(size*.30);
   const src=[0,corner,size-corner,size],dx=[0,rim,width-rim,width],dy=[0,rim,height-rim,height];
   for(let j=0;j<3;j++)for(let i=0;i<3;i++){
    if(i===1&&j===1)continue;
    const sw=src[i+1]-src[i],sh=src[j+1]-src[j],dw=dx[i+1]-dx[i],dh=dy[j+1]-dy[j];
    // Repeat the straight pieces like CSS border-image-repeat:round.
    const nx=i===1?Math.max(1,Math.round(dw*corner/(rim*sw))):1;
    const ny=j===1?Math.max(1,Math.round(dh*corner/(rim*sh))):1;
    for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
     const x1=Math.round(col*dw/nx),y1=Math.round(row*dh/ny);
     c.drawImage(image,src[i],src[j],sw,sh,dx[i]+x1,dy[j]+y1,Math.round((col+1)*dw/nx)-x1,Math.round((row+1)*dh/ny)-y1);
    }
   }
   frame.canvas=canvas;frame.key=key;
  }
  ctx.drawImage(frame.canvas,x,y,w,h);
 };
})();
