/* GELATO PRISM v47 - per-number reach, 0-to-count animated payouts, luxury logo */
(()=>{
'use strict';
try{
 // Geometry follows the user's 500 x 500 six-point star reference exactly:
 // 19 labeled intersections, 42 segments and 24 elementary triangular faces.
 // Indices: top; five upper; two upper diagonals; three center;
 // two lower diagonals; five lower; bottom tip.

 // Perfectly regular hexagram (two equilateral triangles), 19 nodes,
 // 42 edges, 24 triangle cells.  The raster artwork uses these same points.
 const H=106,HW=Math.sqrt(3)*H/2,X=250,Y=250;
 const RAW=[
  [X,Y-2*H],
  [X-2*HW,Y-H],[X-2*HW/3,Y-H],[X,Y-H],[X+2*HW/3,Y-H],[X+2*HW,Y-H],
  [X-HW,Y-H/2],[X+HW,Y-H/2],
  [X-4*HW/3,Y],[X,Y],[X+4*HW/3,Y],
  [X-HW,Y+H/2],[X+HW,Y+H/2],
  [X-2*HW,Y+H],[X-2*HW/3,Y+H],[X,Y+H],[X+2*HW/3,Y+H],[X+2*HW,Y+H],
  [X,Y+2*H]
 ];
 const P=RAW.map(([x,y])=>({x:160+(x-250)*.71,y:157+(y-250)*.70}));
 // Every path is a continuous stroke in the supplied drawing. Intersections
 // are explicit so the board has no inadvertent extra faces or missing links.
 const LINES=[
  [0,2,6,8,13],[0,4,7,10,17],[1,2,3,4,5],[13,14,15,16,17],
  [1,6,9,12,17],[5,7,9,11,13],[1,8,11,14,18],[5,10,12,16,18],
  [0,3,9,15,18],[8,9,10],[2,9,16],[4,9,14]
 ];
 const EDGES=[],FACES=[],emap=new Map();
 for(const line of LINES)for(let k=0;k<line.length-1;k++){
   const a=line[k],b=line[k+1],key=Math.min(a,b)+':'+Math.max(a,b);
   if(emap.has(key))continue;
   const id=EDGES.length;EDGES.push({a,b,id});emap.set(key,id);
 }
 const edge=(a,b)=>emap.get(Math.min(a,b)+':'+Math.max(a,b));
 for(let a=0;a<P.length;a++)for(let b=a+1;b<P.length;b++)for(let c=b+1;c<P.length;c++){
   const x=edge(a,b),y=edge(b,c),z=edge(a,c);
   if(x==null||y==null||z==null)continue;
   FACES.push({id:FACES.length,nodes:[a,b,c],edges:[x,y,z],
     x:(P[a].x+P[b].x+P[c].x)/3,y:(P[a].y+P[b].y+P[c].y)/3,
     flavor:FACES.length%6});
 }
 if(P.length!==19||EDGES.length!==42||FACES.length!==24)
   throw Error('Prism reference geometry invalid: '+P.length+'/'+EDGES.length+'/'+FACES.length);
 const supports=EDGES.map(e=>{
   let total=0;
   for(const line of LINES){
     const a=line.indexOf(e.a),b=line.indexOf(e.b);
     if(a<0||b<0||Math.abs(a-b)!==1)continue;
     const k=Math.min(a,b);total+=(k+1)*(line.length-k-1);
   }
   return total;
 });
 const ranked=[...FACES].sort((a,b)=>
   a.edges.reduce((n,i)=>n+1/supports[i],0)-b.edges.reduce((n,i)=>n+1/supports[i],0));
 // Monte Carlo, 45,000 eight-ball draws across 25 slots:
 // ≈2.63 rare and ≈5.05 common face hits per round.
 // Face awards ≈88% of BET; full-clear bonus adds ≈0.5%
 // leaving limited room for Wonder Sugar-related value.
 ranked.forEach((f,i)=>{f.tier=Math.min(3,Math.floor(i/6));f.reward=0;});
 // Colors: 0=水色, 1=緑, 2=黄色, 3=赤, 4=紫.  All patterns are mirror-symmetric.
 const GRADE_COLORS=['#36d6fc','#34d77b','#ffd63c','#f64a6d','#ac66f2'];
 const GRADE_NAMES=['水色','緑','黄色','赤','紫'];
 const COLLECTOR_MULT=[0,1,3,5,10];
 const COUNT_MULT=[0,0,0,0,0,0,0,0,0,0,0.2,0.4,0.6,0.8,1,1.5,2,2.5,3,4,5,7.5,10,20,100];
 const PATTERNS=[{"id":"A","name":"氷晶の王冠","weight":5,"grades":[3,3,4,2,1,0,1,4,0,2,0,0,0,2,0,0,0,1,1,2,4,4,3,3]},{"id":"B","name":"ミントの花飾り","weight":5,"grades":[4,4,4,3,2,0,2,4,0,3,0,0,1,1,1,0,0,0,0,1,3,3,2,2]},{"id":"C","name":"双翼のソルベ","weight":6,"grades":[4,4,2,4,0,0,0,2,0,4,0,0,1,3,1,1,1,2,2,3,0,0,3,3]},{"id":"D","name":"スノーリボン","weight":6,"grades":[2,2,2,4,0,3,0,2,3,4,0,0,0,3,0,0,0,1,1,3,4,4,1,1]},{"id":"E","name":"フロストの花輪","weight":6,"grades":[1,1,3,4,1,0,1,3,0,4,0,0,0,4,0,0,0,3,3,4,2,2,2,2]},{"id":"F","name":"アクア・プリズム","weight":6,"grades":[3,3,1,2,0,1,0,1,1,2,2,2,0,4,0,0,0,0,0,4,3,3,4,4]},{"id":"G","name":"彩氷のしずく","weight":7,"grades":[0,0,3,1,2,0,2,3,0,1,1,1,0,4,0,3,3,0,0,4,2,2,4,4]},{"id":"H","name":"六花のオーロラ","weight":7,"grades":[3,3,4,0,0,2,0,4,2,0,0,0,1,4,1,1,1,0,0,4,2,2,3,3]},{"id":"I","name":"レインボーの羽","weight":9,"grades":[0,0,2,3,0,0,0,2,0,3,0,0,1,1,1,2,2,3,3,1,4,4,4,4]},{"id":"J","name":"ミント・クラウン","weight":9,"grades":[4,4,1,4,3,0,3,1,0,4,1,1,2,2,2,0,0,0,0,2,3,3,0,0]},{"id":"K","name":"雪花のガーデン","weight":9,"grades":[4,4,4,3,0,1,0,4,1,3,1,1,0,2,0,0,0,3,3,2,0,0,2,2]},{"id":"L","name":"ダブルジュエル","weight":9,"grades":[4,4,3,4,0,2,0,3,2,4,0,0,0,1,0,3,3,0,0,1,1,1,2,2]},{"id":"M","name":"クリスタル・ローズ","weight":8,"grades":[2,2,2,3,1,0,1,2,0,3,3,3,0,0,0,1,1,0,0,0,4,4,4,4]},{"id":"N","name":"ルビーフローラ","weight":5,"grades":[2,2,4,1,0,0,0,4,0,1,1,1,0,3,0,0,0,4,4,3,2,2,3,3]},{"id":"O","name":"アメジストの宝冠","weight":2,"grades":[4,4,0,2,3,1,3,0,1,2,1,1,0,3,0,2,2,0,0,3,0,0,4,4]},{"id":"P","name":"虹色の流星","weight":1,"grades":[4,4,0,3,0,0,0,0,0,3,3,3,1,2,1,0,0,1,1,2,2,2,4,4]}];
 const BONUS=10000,flavors=['#ff3b82','#ffc224','#38db80','#00bfe9','#536cf7','#bb55f7'];
 function selectPattern(random){
   const roll=random()*100;let total=0;
   for(const pattern of PATTERNS){total+=pattern.weight;if(roll<total)return pattern;}
   return PATTERNS[PATTERNS.length-1];
 }
 function evaluatePrize(filled,grades){
   const counts=[0,0,0,0,0];
   for(const id of filled)counts[grades[id]]++;
   const collectorMult=counts.reduce((sum,n,color)=>sum+(color>0&&n===4?COLLECTOR_MULT[color]:0),0);
   const countMult=COUNT_MULT[filled.size]||0;
   return {counts,collectorMult,countMult,hundredths:Math.round((collectorMult+countMult)*100)};
 }
 // Sanity: 24/24 pays the final count tier only, plus each of four collectors.
 const testFull=evaluatePrize(new Set(Array.from({length:24},(_,i)=>i)),PATTERNS[0].grades);
 if(testFull.hundredths!==11900||testFull.counts.join(',')!=='8,4,4,4,4')
   throw Error('Gelato full-clear/collector payout table invalid');
 function link(hits){
   const result=new Set();
   for(const line of LINES){
     let first=-1,last=-1;
     for(let i=0;i<line.length;i++)if(hits.has(line[i])){if(first<0)first=i;last=i;}
     if(first<0||last<=first)continue;
     for(let k=first;k<last;k++)result.add(edge(line[k],line[k+1]));
   }
   return result;
 }
 // Each 3-node elementary face is a region in the embedded planar graph.
 // Lit line segments become impermeable walls. Flood-fill from the exterior
 // through UNLIT segments, then pay every face not reachable from outside.
 // This includes smaller triangles inside any large enclosed polygon.
 const faceAtEdge=EDGES.map(()=>[]);
 for(const f of FACES)for(const id of f.edges)faceAtEdge[id].push(f.id);
 if(faceAtEdge.some(a=>a.length<1||a.length>2))
   throw Error('Gelato planar adjacency invalid');
 function fill(links){
   const outside=new Set(),queue=[];
   for(let id=0;id<EDGES.length;id++){
     if(links.has(id)||faceAtEdge[id].length!==1)continue;
     const face=faceAtEdge[id][0];
     if(!outside.has(face)){outside.add(face);queue.push(face);}
   }
   for(let pos=0;pos<queue.length;pos++){
     for(const edgeId of FACES[queue[pos]].edges){
       if(links.has(edgeId))continue;
       for(const adjacent of faceAtEdge[edgeId]){
         if(outside.has(adjacent))continue;
         outside.add(adjacent);queue.push(adjacent);
       }
     }
   }
   return new Set(FACES.filter(f=>!outside.has(f.id)).map(f=>f.id));
 }
 // Six outer star tips bound both large triangles and must contain all 24.
 if(fill(link(new Set([0,1,5,13,17,18]))).size!==24)
   throw Error('Six-tip full-area completion regression');
 class GelatoEngine {
   constructor(random,onEvent,sleep){
     this.random=random;this.onEvent=onEvent;this.sleep=sleep;this.speed=1.4;
     this.kind='gelato';this.gameName='ジェラートプリズム';this.drawMode='single';this.reachMode='single';
     this.colorCount=5;this.version=0;this.cycle=0;this.reset();
   }
   emit(phase,extras={}){
     if(!['queued','drawpending','stepcollect'].includes(phase))this.phase=phase;
     this.onEvent(Object.assign({phase},extras),this);
   }
   newPrism(){
     this.cycle++;
     let nums=Array.from({length:25},(_,i)=>i+1);
     for(let i=24;i>0;i--){const j=Math.floor(this.random()*(i+1));[nums[i],nums[j]]=[nums[j],nums[i]];}
     this.nodeNumbers=nums.slice(0,19);this.hits=new Set();this.links=new Set();
     this.pattern=selectPattern(this.random);
     this.faceGrades=this.pattern.grades.slice();
     this.collectorCounts=[0,0,0,0,0];
     this.collectorMult=0;this.countMult=0;
     // Exactly ~10% sugar-acquisition probability under the 25-number, 8-ball model.
     // P(>=16)=11.34318%, P(>=17)=8.48457%.
     this.sugarTarget=this.random()<0.5301280807296723?16:17;
     this.filled=new Set();this.sugarFace=-1;
     this.sugarAwarded=false;this.allComplete=false;
   }
   reset(){
     // Each eight-ball game gets a fresh board: no previous gelato persists.
     this.newPrism();
     this.pouring=null;
     this.version++;this.queue=[];this.pendingDraws=new Set();this.drawn=new Set();this.seen=new Set();
     this.accepted=0;this.processed=0;this.busy=false;this.running=false;this.opening=false;this.paused=false;
     this.presentationRate=1;this.roundBet=this.roundBet||3000;this.totalHundredths=0;this.maxLink=0;this.maxChain=0;
     this.allClears=0;this.roundSteps=0;this.roundHammers=0;this.roundCleared=0;this.lastGain=0;
     this.lastFilled=[];this.lastNode=-1;this.wonderCollected=this.sugarAwarded;this.wonderToken=null;
     this.emit('ready',{filled:this.filled.size});
   }
   get idle(){return !this.busy&&!this.queue.length;}
   start(){if(this.running||this.roundBet<=0)return;this.running=true;this.emit('waiting');}
   previewDraw(n){
     if(!this.running||this.seen.has(n)||this.pendingDraws.has(n))return false;
     this.pendingDraws.add(n);this.emit('drawpending',{number:n});return true;
   }
   enqueueBatch(numbers){
     if(!this.running||!numbers?.length||this.accepted+numbers.length>8||numbers.some(n=>this.seen.has(n)))return false;
     for(const n of numbers)this.seen.add(n);
     this.accepted+=numbers.length;this.queue.push([...numbers]);
     this.emit('queued',{numbers});if(!this.busy)this.drain();return true;
   }
   async wait(ms,token){
     let left=ms/Math.max(.5,this.speed);
     while(left>0&&token===this.version){
       const slice=Math.min(35,left);
       await this.sleep(slice);
       if(!this.paused)left-=slice*Math.max(1,this.presentationRate||1);
     }
     return token===this.version;
   }
   stateFor(hits){const edges=link(hits);return {edges,faces:fill(edges)};}
   predict(number){
     const pos=this.nodeNumbers.indexOf(number);
     if(pos<0||this.hits.has(pos))return {number,gain:0,total:this.totalHundredths,tier:0};
     const next=new Set(this.hits);next.add(pos);
     const state=this.stateFor(next),prospective=new Set(this.filled);
     for(const id of state.faces)prospective.add(id);
     const prize=evaluatePrize(prospective,this.faceGrades);
     const gain=Math.max(0,prize.hundredths-this.totalHundredths);
     return {number,gain,total:prize.hundredths,tier:gain>=10000?3:gain>=500?2:gain>=100?1:0};
   }
   async drain(){
     if(this.busy)return;
     const token=this.version;this.busy=true;
     try{
       while(this.queue.length&&token===this.version){
         const numbers=this.queue.shift();
         for(const n of numbers){this.drawn.add(n);this.pendingDraws.delete(n);}
         for(const number of numbers){
           const pos=this.nodeNumbers.indexOf(number),newHit=pos>=0&&!this.hits.has(pos);
           if(newHit)this.hits.add(pos);
           this.lastNode=pos;
           this.emit('gelatoHit',{number,index:pos,newHit});
           if(!await this.wait(newHit?250:110,token))return;
           const next=this.stateFor(this.hits);
           const newFaces=[...next.faces].filter(i=>!this.filled.has(i));
           this.links=next.edges;
           // Only acquired triangles count; cumulative bonus is recalculated,
           // never stacked at each milestone.  The award is settled at round end.
           const previousTotal=this.totalHundredths;
           for(const id of newFaces)this.filled.add(id);
           this.lastFilled=newFaces;
           if(newFaces.length){
             this.roundCleared+=newFaces.length;
             if(this.filled.size>=this.sugarTarget&&!this.sugarAwarded){
               this.sugarAwarded=true;this.wonderCollected=true;this.roundSteps++;
               const step={id:this.version*100+this.processed+1,value:Math.max(1,this.roundBet),tier:wonderTier(this.roundBet)};
               this.wonderToken=step;this.emit('stepcollect',{steps:[step]});this.emit('sugaraward',{steps:[step]});
             }
             if(this.filled.size===24&&!this.allComplete){this.allComplete=true;this.allClears++;}
             const prize=evaluatePrize(this.filled,this.faceGrades);
             this.collectorCounts=prize.counts;
             this.collectorMult=prize.collectorMult;
             this.countMult=prize.countMult;
             this.totalHundredths=prize.hundredths;
             const gain=this.totalHundredths-previousTotal;
             this.lastGain=gain;
             this.maxLink=Math.max(this.maxLink,this.filled.size);
             this.emit('gelatoFill',{number,newFaces,gain,full:this.allComplete,
               collectors:prize.counts.slice(),countMultiplier:prize.countMult});
             if(!await this.wait(660,token))return;
           }
         }
         this.processed+=numbers.length;this.emit('settled',{numbers,filled:this.filled.size});
       }
       if(token!==this.version)return;
       if(this.processed>=8){
         if(this.beforeComplete)await this.beforeComplete(token);
         if(token!==this.version)return;
         this.busy=false;this.running=false;this.emit('complete');
       }else{this.busy=false;this.emit('waiting');}
     }catch(err){if(token===this.version){this.busy=false;this.running=false;this.emit('error',{message:err.message});}}
   }
 }
 const path=nodes=>nodes.map(i=>P[i].x.toFixed(1)+','+P[i].y.toFixed(1)).join(' ');
 function boardSVG(prefix){
   // All biscuit decoration and gelato reservoirs are rendered from the
   // engine's exact 19 dots, 42 links and 24 primitive triangles.
   const defs=['<defs>'];
   defs.push('<linearGradient id="'+prefix+'-waffle" x1=".05" y1=".02" x2=".89" y2=".98"><stop stop-color="#fff0b9"/><stop offset=".19" stop-color="#efbb73"/><stop offset=".52" stop-color="#dc9651"/><stop offset=".78" stop-color="#bd6e39"/><stop offset="1" stop-color="#814421"/></linearGradient>');
   defs.push('<linearGradient id="'+prefix+'-rail" x1=".12" y1=".05" x2=".81" y2=".92"><stop stop-color="#fffefa"/><stop offset=".28" stop-color="#fff6e4"/><stop offset=".62" stop-color="#fce2b7"/><stop offset=".83" stop-color="#dfa36e"/><stop offset="1" stop-color="#a86b40"/></linearGradient>');
   defs.push('<radialGradient id="'+prefix+'-gold" cx=".29" cy=".19" r=".88"><stop stop-color="#ffffff"/><stop offset=".13" stop-color="#fffce5"/><stop offset=".33" stop-color="#ffe789"/><stop offset=".64" stop-color="#f6b740"/><stop offset=".87" stop-color="#c57020"/><stop offset="1" stop-color="#713612"/></radialGradient>');
   defs.push('<radialGradient id="'+prefix+'-waffle-light" cx=".33" cy=".21" r="1"><stop stop-color="#fff3d0"/><stop offset=".58" stop-color="#eac087"/><stop offset="1" stop-color="#b16e3d"/></radialGradient>');
   defs.push('<pattern id="'+prefix+'-biscuit" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V15M0 0H15" fill="none" stroke="#754323" stroke-width="2.4" opacity=".35"/><path d="M3 3H12V12" fill="none" stroke="#fff3bf" stroke-width="1.3" opacity=".5"/></pattern>');
   defs.push('<pattern id="'+prefix+'-crumb" width="23" height="22" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1.4" fill="#fff7d8"/><circle cx="17" cy="10" r=".9" fill="#85482a"/><circle cx="11" cy="19" r="1.1" fill="#fef0b7"/><circle cx="21" cy="2" r=".8" fill="#ad6c3d"/></pattern>');
   const vivid=['#fc2870','#ffd025','#36e77b','#2ad8fd','#7481ff','#bd46e8'];
   for(let i=0;i<6;i++){
     defs.push('<radialGradient id="'+prefix+'-ice'+i+'" cx=".27" cy=".15" r=".89"><stop stop-color="#ffffff"/><stop offset=".12" stop-color="#fff8f0"/><stop offset=".26" stop-color="'+vivid[i]+'"/><stop offset=".64" stop-color="'+vivid[i]+'"/><stop offset="1" stop-color="#652a65"/></radialGradient>');
     defs.push('<radialGradient id="'+prefix+'-glaze'+i+'" cx=".27" cy=".1" r=".98"><stop stop-color="#fffdf9" stop-opacity=".94"/><stop offset=".3" stop-color="'+vivid[i]+'" stop-opacity=".5"/><stop offset=".8" stop-color="'+vivid[i]+'" stop-opacity=".75"/><stop offset="1" stop-color="#5b285e" stop-opacity=".48"/></radialGradient>');
   }
   for(const f of FACES)defs.push('<clipPath id="'+prefix+'-clip'+f.id+'"><polygon points="'+path(f.nodes)+'"/></clipPath>');
   defs.push('</defs>');
   const faces=FACES.map(f=>{
     const cx=f.x.toFixed(1),cy=f.y.toFixed(1);
     return '<g class="gp-face" data-face="'+f.id+'">'+
       '<polygon class="gp-blank" points="'+path(f.nodes)+'" fill="url(#'+prefix+'-glaze'+f.flavor+')"/>'+
       '<g class="gp-ice" clip-path="url(#'+prefix+'-clip'+f.id+')">'+
       '<polygon points="'+path(f.nodes)+'" fill="url(#'+prefix+'-ice'+f.flavor+')"/>'+
       '<path d="M'+(f.x-18)+' '+(f.y-8)+'q13-16 29-4t-5 22" stroke="#fff9ec" stroke-width="4.3" fill="none" opacity=".79"/>'+
       '<ellipse cx="'+(f.x-6)+'" cy="'+(f.y-9)+'" rx="5" ry="2.5" fill="#ffffff" opacity=".86"/>'+
       '<circle cx="'+(f.x+9)+'" cy="'+(f.y+7)+'" r="1.6" fill="#ffffff" opacity=".74"/>'+
       '</g><polygon class="gp-face-border" points="'+path(f.nodes)+'" fill="none" stroke="#fff4cf" stroke-width="1.3"/>'+
       '<text class="gp-face-value" data-reward="'+f.reward+'" x="'+cx+'" y="'+(f.y+3).toFixed(1)+'">'+f.reward+'WIN</text>'+
       '<text class="gp-sugar" x="'+cx+'" y="'+(f.y-9).toFixed(1)+'">✦</text></g>';
   }).join('');
   const lines=EDGES.map(e=>{
     const a=P[e.a],b=P[e.b],d='M'+a.x.toFixed(1)+' '+a.y.toFixed(1)+'L'+b.x.toFixed(1)+' '+b.y.toFixed(1);
     return '<g data-edge="'+e.id+'" class="gp-edge">'+
       '<path d="'+d+'" stroke="#90512e" stroke-width="14.5" stroke-linecap="round"/>'+
       '<path d="'+d+'" stroke="url(#'+prefix+'-rail)" stroke-width="10" stroke-linecap="round"/>'+
       '<path d="'+d+'" stroke="#fffdf5" stroke-width="2.1" stroke-linecap="round" opacity=".88"/>'+
       '<path class="gp-glowing-line" d="'+d+'" stroke="#ffe85c" stroke-width="5.2" stroke-linecap="round"/></g>';
   }).join('');
   const nodes=P.map((p,i)=>'<g data-node="'+i+'" class="gp-node" transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')">'+
      '<circle r="13.8" fill="#93532a" stroke="#fff3c9" stroke-width="2.5"/>'+
      '<circle r="11.6" fill="url(#'+prefix+'-gold)" stroke="#ffecc0" stroke-width="1.3"/>'+
      '<ellipse cx="-4" cy="-4.8" rx="5.2" ry="2.7" transform="rotate(-27)" fill="#ffffffc5"/>'+
      '<text class="gp-digit" y="4.3" text-anchor="middle">?</text>'+
      '<circle class="gp-hit-ring" r="14.4" fill="none" stroke="#fff06e" stroke-width="3.8"/></g>').join('');
   const outline=path([0,4,5,10,17,16,18,14,13,8,1,2]);
   return '<svg class="gp-board-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-22 -23 364 360" preserveAspectRatio="xMidYMid meet" role="img" aria-label="19交点・24三角形の高級ワッフルジェラート型">'+defs.join('')+
      '<polygon points="'+outline+'" fill="#7e3a20" stroke="#744024" stroke-width="16" stroke-linejoin="round"/>'+
      '<polygon points="'+outline+'" fill="url(#'+prefix+'-waffle)" stroke="#b46a39" stroke-width="12.2" stroke-linejoin="round"/>'+
      '<polygon points="'+outline+'" fill="url(#'+prefix+'-biscuit)" stroke="#f4c786" stroke-width="6.7" stroke-linejoin="round"/>'+
      '<polygon points="'+outline+'" fill="url(#'+prefix+'-crumb)" stroke="#fff3c9" stroke-width="2.1" opacity=".8" stroke-linejoin="round"/>'+
      faces+lines+nodes+'</svg>';
 }
 const slot=slots[0],originalEvent=app.onEvent;
 slot.holder.classList.add('gp-slot');slot.panel.classList.add('gp-panel');slot.tab.classList.add('gp-tab');
 const gpTabName=slot.tab.querySelector('.tab-game-name');
 gpTabName.innerHTML='<span class="gp-logo"><img class="gp-tab-logo-img" alt="GELATO PRISM" hidden>'+
   '<span class="gp-logo-text"><b>ジェラート<br>プリズム</b><small>GELATO PRISM ✦</small></span></span>';
 const gpTabLogo=gpTabName.querySelector('.gp-tab-logo-img');
 gpTabLogo.onload=()=>{gpTabLogo.hidden=false;gpTabName.classList.add('gp-has-tab-art');};
 gpTabLogo.onerror=()=>{gpTabLogo.hidden=true;gpTabName.classList.remove('gp-has-tab-art');};
 gpTabLogo.src='assets/gelato-prism-tab-logo-v47.svg?v=47';
 slots[1].holder.style.order='0';slots[2].holder.style.order='1';slot.holder.style.order='2';
 const scene=document.createElement('div');scene.className='gp-scene';
 scene.innerHTML='<div class="gp-land" aria-hidden="true"></div>'+
  '<div class="gp-head"><b>GELATO PRISM</b><small>ジェラートプリズム</small></div>'+
  '<div class="gp-bonus-crest" aria-label="RAINBOW GELATO BONUS 全埋めボーナス">'+
   '<span class="gp-crest-crown">♛ ✦ ♛</span><b>RAINBOW</b><strong>GELATO BONUS</strong><small>全埋めボーナス</small></div>'+
  '<div class="gp-mold">'+boardSVG('gp-main')+'</div>'+
  '<div class="gp-flash" hidden></div>';
 slot.panel.append(scene);
 // Native right-hand payout furniture remains intact for Canyon/Drop.
 // Gelato replaces it with the 24-face difficulty/odds legend.
 const gpSign=document.createElement('div');gpSign.className='gp-bonus-sign';
 gpSign.innerHTML='<span>✦ RAINBOW GELATO ✦</span><b>24 FILL BONUS</b>';
 document.querySelector('.festival-top')?.append(gpSign);
 const mini=document.createElement('div');mini.className='gp-mini';mini.innerHTML=boardSVG('gp-tab');
 slot.tab.querySelector('.mini-wrap').append(mini);

 // The user supplies three high-resolution raster assets at assets/:
 // gelato-prism-cookie-v36.png, gelato-prism-gelato-v36.png,
 // gelato-prism-trim-v36.png.
 // No SVG is painted when both load successfully.  Old SVG remains a safe
 // fallback until the upload is complete (avoids a broken production game).

 // Cached, low-resolution raster display.  Three PNGs are uploaded to assets/
 // by the user.  The backing image is composited once; dynamic controls are
 // only re-rendered when the round state or BET actually changes.
 const MAIN_PX=640,MINI_PX=192,MAIN_SCALE=MAIN_PX/500,MINI_SCALE=MINI_PX/500;
 const rasterMain=document.createElement('canvas'),rasterMini=document.createElement('canvas');
 rasterMain.width=rasterMain.height=MAIN_PX;
 rasterMini.width=rasterMini.height=MINI_PX;
 for(const canvas of [rasterMain,rasterMini]){
   canvas.className='gp-raster-board';
   canvas.setAttribute('aria-label','ジェラートプリズム画像盤面');
 }
 const rasterMold=scene.querySelector('.gp-mold');
 rasterMold.appendChild(rasterMain);mini.appendChild(rasterMini);
 // Reach uses the exact numbered sockets (same four-tier language as Candy),
 // never an overlay banner. Each number predicts the next ball independently.
 const REACH_NAMES=['リーチ','高額','超高額','全獲り'];
 const REACH_COLORS=['#4dd5ff','#ffe077','#ff70c9','#e8faff'];
 const REACH_RAINBOW=['#ff6ca5','#ffd66f','#83f79b','#61dfff','#a982ff'];
 let nodeReachCacheKey='',nodeReachCache=new Map();
 function getNodeReachTiers(engine){
   if(!engine||engine.kind!=='gelato')return new Map();
   const key=[engine.cycle,engine.version,engine.phase,engine.processed,
     engine.accepted,engine.busy,engine.running,engine.filled.size,
     engine.totalHundredths,engine.hits.size,engine.seen.size,
     engine.pendingDraws.size].join('/');
   if(key===nodeReachCacheKey)return nodeReachCache;
   nodeReachCacheKey=key;
   const result=new Map();
   if(engine.running&&engine.processed>=1&&engine.processed<8&&
      engine.accepted===engine.processed&&!engine.busy){
     for(let i=0;i<engine.nodeNumbers.length;i++){
       if(engine.hits.has(i))continue;
       const number=engine.nodeNumbers[i];
       if(engine.seen.has(number)||engine.pendingDraws.has(number))continue;
       const p=engine.predict(number);
       if(!(p.gain>0))continue;
       const tier=p.gain>=10000?3:p.gain>=1000?2:p.gain>=300?1:0;
       result.set(i,{tier,number,gain:p.gain,name:REACH_NAMES[tier]});
     }
   }
   nodeReachCache=result;
   return result;
 }
 function drawReachOnNodes(ctx,e,small){
   const tiers=getNodeReachTiers(e);
   if(!tiers.size)return;
   const time=(typeof performance!=='undefined'?performance.now():Date.now());
   const phase=time/750;
   ctx.save();
   ctx.setTransform((small?MINI_PX:MAIN_PX)/500,0,0,
       (small?MINI_PX:MAIN_PX)/500,0,0);
   ctx.textAlign='center';ctx.textBaseline='middle';
   for(const [index,reach] of tiers){
     const p=rasterCoords[index],tier=reach.tier;
     const hue=REACH_RAINBOW[(Math.floor(phase*2)+index)%REACH_RAINBOW.length];
     const tint=tier===3?hue:REACH_COLORS[tier];
     const bob=.5+.5*Math.sin(phase*3+index);
     ctx.globalAlpha=.84+.16*bob;
     ctx.shadowColor=tint;ctx.shadowBlur=small?4:(9+tier*3);
     ctx.lineWidth=tier===3?3.6:2.9;ctx.strokeStyle=tint;
     ctx.beginPath();ctx.arc(p.x,p.y,19.8+bob*1.4,0,Math.PI*2);
     ctx.stroke();
     if(tier>=2){
       ctx.lineWidth=1.4;
       ctx.beginPath();ctx.arc(p.x,p.y,23.5,.35+phase,Math.PI*1.32+phase);
       ctx.stroke();
     }
     ctx.shadowBlur=0;
     if(small)continue;
     // Floating individual badge above each numbered circle, not global text.
     const badgeWidth=tier===0?35:tier===1?31:45;
     const labelY=p.y-32;
     ctx.fillStyle=tier===3?'#6f36ab':tier===2?'#9e2679':tier===1?'#9d5826':'#226daa';
     ctx.beginPath();
     const rx=p.x-badgeWidth/2,ry=labelY-8;
     ctx.roundRect(rx,ry,badgeWidth,16,4);
     ctx.fill();
     ctx.lineWidth=1.4;ctx.strokeStyle=tint;ctx.stroke();
     ctx.font=(tier===2||tier===3?'900 10px ':'900 11px ')+'system-ui,sans-serif';
     ctx.lineWidth=2.2;ctx.strokeStyle='#59367a';ctx.fillStyle='#fff9df';
     ctx.strokeText(reach.name,p.x,labelY+.6);
     ctx.fillText(reach.name,p.x,labelY+.6);
   }
   ctx.restore();
 }
 // Four 4-piece diamond collectors, plus the single final count payout.
 // This UI is outside the PNG mould so it never obscures the star's digits.
 const collectorPanel=document.createElement('div');
 collectorPanel.className='gp-collector-panel';
 // 24 WIN is fixed. Six descending rows scroll, and 23 is impossible.
 const payoutRows=Array.from({length:23},(_,i)=>22-i).map(n=>
   '<div class="gp-pay-row" data-panels="'+n+'"><span class="gp-pay-panel-n">'+
   n+'枚<span class="gp-sugar-status"></span></span>'+
   '<strong class="gold-number gp-pay-win">0WIN</strong></div>').join('');
 collectorPanel.innerHTML=
  '<div class="gp-collector-grid">'+
  [1,2,3,4].map(g=>'<div class="gp-collector-row" data-grade="'+g+'">'+
    '<span class="gp-diamond-wrap"><span class="gp-diamond">'+
      Array.from({length:4},(_,i)=>'<i class="gp-diamond-piece" data-piece="'+i+'"></i>').join('')+
    '</span></span>'+
    '<span class="gp-collector-meta"><b>'+GRADE_NAMES[g]+'</b>'+
      '<small class="gp-collected-n">0/4</small></span>'+
    '<strong class="gold-number gp-collector-win">'+
      '<span class="gp-win-number">0</span><small>WIN</small></strong></div>').join('')+
  '</div>'+
  '<div class="gp-pay-row gp-pay-fixed" data-panels="24">'+
     '<span class="gp-pay-panel-n">24枚</span>'+
     '<strong class="gold-number gp-pay-win">0WIN</strong></div>'+
  '<div class="gp-payout-break" aria-hidden="true"><i></i></div>'+
  '<div class="gp-payout-window"><div class="gp-payout-track">'+payoutRows+'</div></div>'+
  '<div class="gp-highest-frame">'+
    '<span class="gp-highest-heading">✦ 最高役 ✦ '+
      '<small class="gp-sugar-header">✦16枚</small></span>'+
    '<div class="gp-highest-bottom"><span class="gp-highest-name">未成立</span>'+
       '<strong class="gold-number gp-highest-win">0WIN</strong></div>'+
  '</div>';
 scene.appendChild(collectorPanel);
 // For 10 panels: 24,13,12,11,10,9,8.  For 22: 24,22,21,20,19,18,17.
 function payoutWindowFor(n){
   const top=Math.max(5,Math.min(22,Math.floor(n)+3));
   return [24,top,top-1,top-2,top-3,top-4,top-5];
 }
 const payoutTrack=collectorPanel.querySelector('.gp-payout-track');
 const payoutDivider=collectorPanel.querySelector('.gp-payout-break');
 // Follow each newly earned panel one at a time, even after a large
 // multi-face completion. The six-row viewport follows only as needed.
 let payoutSlideCycle=-1,payoutShown=0,payoutTarget=0,payoutTick=null;
 function paintPayoutStep(){
   const top=payoutWindowFor(payoutShown)[1];
   payoutTrack.style.setProperty('--gp-slide-index',String(22-top));
   payoutDivider.classList.toggle('gp-has-skip',top!==22);
   for(const row of collectorPanel.querySelectorAll('.gp-pay-row')){
     row.classList.toggle('gp-current',+row.dataset.panels===payoutShown);
   }
 }
 function advancePayoutStep(){
   payoutTick=null;
   if(payoutShown===payoutTarget)return;
   payoutShown+=Math.sign(payoutTarget-payoutShown);
   // 23 faces cannot occur: there is no corresponding payout row.
   if(payoutShown===23)payoutShown=payoutTarget===24?24:22;
   paintPayoutStep();
   if(payoutShown!==payoutTarget)payoutTick=setTimeout(advancePayoutStep,230);
 }
 function schedulePayoutSlide(e){
   if(payoutSlideCycle!==e.cycle){
     if(payoutTick!==null){clearTimeout(payoutTick);payoutTick=null;}
     payoutSlideCycle=e.cycle;
     payoutShown=0;payoutTarget=0;
     payoutTrack.classList.add('gp-snap');
     paintPayoutStep();
     requestAnimationFrame(()=>requestAnimationFrame(()=>payoutTrack.classList.remove('gp-snap')));
   }
   payoutTarget=e.filled.size;
   if(payoutShown!==payoutTarget&&payoutTick===null)
     payoutTick=setTimeout(advancePayoutStep,125);
 }
 let collectorKey='';
 function updateCollectorHUD(e,bet){
   if(!e?.faceGrades)return;
   const key=[e.cycle,e.phase,e.filled.size,e.totalHundredths,
     e.pattern?.id,e.sugarTarget,e.sugarAwarded,bet].join('/');
   if(key===collectorKey)return;
   collectorKey=key;
   const counts=e.collectorCounts||evaluatePrize(e.filled,e.faceGrades).counts;
   const best=[{mult:COUNT_MULT[e.filled.size]||0,
     name:e.filled.size>=10?e.filled.size+'枚パネル':'未成立'}];
   for(const row of collectorPanel.querySelectorAll('[data-grade]')){
     const grade=+row.dataset.grade,count=counts[grade],color=GRADE_COLORS[grade];
     row.querySelector('.gp-collected-n').textContent=count+'/4';
     const diamond=row.querySelector('.gp-diamond');
     for(const [index,piece] of [...diamond.querySelectorAll('.gp-diamond-piece')].entries()){
       piece.classList.toggle('is-filled',index<count);
       piece.style.setProperty('--gp-gem-color',color);
       piece.style.setProperty('--gp-crystal-pos',grade*25+'%');
     }
     row.querySelector('.gp-win-number').textContent=
       num(medalWin(bet,COLLECTOR_MULT[grade]*100));
     row.classList.toggle('gp-complete',count===4);
     if(count===4)best.push({mult:COLLECTOR_MULT[grade],name:GRADE_NAMES[grade]+'4個'});
   }
   const highest=best.sort((a,b)=>b.mult-a.mult)[0];
   collectorPanel.querySelector('.gp-highest-name').textContent=
     e.filled.size===24?'全獲り':highest.name;
   collectorPanel.querySelector('.gp-highest-win').textContent=
     num(medalWin(bet,Math.round(highest.mult*100)))+'WIN';
   const sugarHeader=collectorPanel.querySelector('.gp-sugar-header');
   sugarHeader.textContent=e.sugarAwarded?'✦ GET!':'✦ '+e.sugarTarget+'枚';
   sugarHeader.classList.toggle('is-get',e.sugarAwarded);
   schedulePayoutSlide(e);
   for(const row of collectorPanel.querySelectorAll('.gp-pay-row')){
     const n=+row.dataset.panels;
     const payout=num(medalWin(bet,Math.round(COUNT_MULT[n]*100)))+'WIN';
     const label=row.querySelector('.gp-pay-win');
     if(label.textContent!==payout)label.textContent=payout;
     // The current-highlight is owned by paintPayoutStep(), so it advances
     // through 0,1,2,... rather than jumping straight to the final count.
     const tag=row.querySelector('.gp-sugar-status');
     if(tag){
       const selected=n===e.sugarTarget;
       tag.textContent=selected?(e.sugarAwarded?'✦GET!':'✦'):'';
       tag.classList.toggle('is-get',selected&&e.sugarAwarded);
       row.classList.toggle('gp-sugar-row',selected);
     }
   }
 }
 // Bonus emblem is now layered over the playable board, not a cropped header.
 // The old on-board 100x emblem is removed; 24/24 is pinned in the payout table.
 const rasterImages={
   board:new Image(),fill:new Image(),trim:new Image(),ice:new Image(),ready:false,iceReady:false,iceCache:null,exactV40:false,
   candyAtlas:new Image(),candyAtlasReady:false,crystalTiles:new Image(),crystalTilesReady:false,
   base:null,trimCache:null,faceTiles:[],labels:null,numbers:null,
   labelsBet:null,numbersKey:null
 };
 const rasterCoords=RAW.map(([x,y])=>({x,y}));
 // The number layer is cached, so repaint after the shared Anima number
 // font has finished loading (the browser may initially show a fallback).
 if(document.fonts?.load){
   document.fonts.load('400 23px ElixirNumbers').then(()=>{
     rasterImages.numbersKey=null;rasterKey='';
     if(rasterImages.ready)drawGelato();
   }).catch(()=>{});
 }

 // Five transparent faceted ice colors: water blue, green, yellow, red, violet.
 const frozenFruitBackdrop=document.createElement('canvas');
 frozenFruitBackdrop.className='gp-frozen-fruit-backdrop';
 frozenFruitBackdrop.width=1024;frozenFruitBackdrop.height=640;
 scene.insertBefore(frozenFruitBackdrop,scene.firstChild);
 let rasterKey='';
 // The v45 ice-candy kingdom is a full-resolution illustrated image, not
 // a generative procedural canvas.  The inert fallback canvas stays hidden.
 function paintFrozenFruitBackdrop(){/* v45 background is the SVG asset */}

 function loadRasterAsset(img,name){
   return new Promise((resolve,reject)=>{
     img.onload=()=>img.naturalWidth>0?resolve():reject(new Error(name+' was empty'));
     img.onerror=()=>reject(new Error(name+' missing'));
     img.src='assets/'+name+'?v=37-'+Date.now();
   });
 }
 function offscreen(w,h=w){
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   return canvas;
 }
 function scaledAsset(img){
   const canvas=offscreen(MAIN_PX);
   canvas.getContext('2d').drawImage(img,0,0,MAIN_PX,MAIN_PX);
   return canvas;
 }
 function createRasterCache(){
   rasterImages.base=scaledAsset(rasterImages.board);
   rasterImages.trimCache=scaledAsset(rasterImages.trim);
   const fillSheet=scaledAsset(rasterImages.fill);
   // Cache all five tinted liquid textures once per face.  The source PNG
   // supplies highlights/gelato texture; CSS/SVG are not used to fake it.
   rasterImages.faceTiles=FACES.map(f=>{
     const verts=f.nodes.map(i=>rasterCoords[i]);
     const px=verts.map(p=>p.x*MAIN_SCALE),py=verts.map(p=>p.y*MAIN_SCALE);
     const left=Math.max(0,Math.floor(Math.min(...px))-2);
     const top=Math.max(0,Math.floor(Math.min(...py))-2);
     const right=Math.min(MAIN_PX,Math.ceil(Math.max(...px))+2);
     const bottom=Math.min(MAIN_PX,Math.ceil(Math.max(...py))+2);
     const width=right-left,height=bottom-top;
     const images=[],dimImages=[];
     for(let grade=0;grade<5;grade++){
       const bright=offscreen(width,height),ctx=bright.getContext('2d');
       ctx.beginPath();ctx.moveTo(px[0]-left,py[0]-top);
       for(let k=1;k<3;k++)ctx.lineTo(px[k]-left,py[k]-top);
       ctx.closePath();ctx.clip();
       if(rasterImages.crystalTilesReady){
         const source=rasterImages.crystalTiles;
         const sy=Math.min(...verts.map(p=>p.y)),sameTop=verts.filter(p=>Math.abs(p.y-sy)<.01).length;
         ctx.save();
         if(sameTop===2){ctx.translate(0,height);ctx.scale(1,-1);}
         ctx.drawImage(source,grade*256,0,256,256,0,0,width,height);
         ctx.restore();
       }else{
         // Gentle color-only fallback while the external SVG image loads.
         const ice=ctx.createLinearGradient(0,0,width,height);
         ice.addColorStop(0,'#f0ffff');
         ice.addColorStop(.28,GRADE_COLORS[grade]);
         ice.addColorStop(1,'#3659a1');
         ctx.fillStyle=ice;
         ctx.fillRect(0,0,width,height);
       }
       // Pores/ice crystals are subdued to keep all five colors distinguishable.
       for(let k=0;k<7;k++){
         const x=(k*29+f.id*17+grade*13)%(Math.max(1,width));
         const y=(k*41+f.id*19+grade*9)%(Math.max(1,height));
         ctx.beginPath();ctx.arc(x,y,1+(k%3)*.35,0,Math.PI*2);
         ctx.fillStyle='rgba(250,254,255,.58)';ctx.fill();
       }
       const gloss=ctx.createLinearGradient(0,0,width,height);
       gloss.addColorStop(0,'rgba(255,255,255,.54)');
       gloss.addColorStop(.32,'rgba(255,255,255,.10)');
       gloss.addColorStop(.7,'rgba(255,255,255,.0)');
       gloss.addColorStop(1,'rgba(10,12,80,.23)');
       ctx.fillStyle=gloss;ctx.fillRect(0,0,width,height);
       ctx.restore?.();
       const dim=offscreen(width,height),dc=dim.getContext('2d');
       dc.drawImage(bright,0,0);
       dc.globalCompositeOperation='source-atop';
       dc.fillStyle='rgba(2,12,37,.64)';
       dc.fillRect(0,0,width,height);
       dc.globalCompositeOperation='source-over';
       images.push(bright);dimImages.push(dim);
     }
     return {images,dimImages,x:left,y:top,width,height};
   });
   // Cache node and WIN labels independent of hit animations and filled state.
   rasterImages.labels=offscreen(MAIN_PX);
   rasterImages.numbers=offscreen(MAIN_PX);
   // The v37 -> v40 asset swap creates blank caches; invalidate text keys.
   rasterImages.labelsBet=null;
   rasterImages.numbersKey=null;
 }
 // Crystal sprite atlas: loading is optional so the game remains functional
 // on a slow connection; once ready all 24 cached triangle tiles are rebuilt.
 loadRasterAsset(rasterImages.crystalTiles,'gelato-prism-crystal-tiles-v45.svg')
 .then(()=>{
   rasterImages.crystalTilesReady=true;
   if(rasterImages.ready){createRasterCache();rasterKey='';drawGelato();}
 }).catch(err=>console.warn('[GelatoPrism] crystal atlas fallback',err.message));
 const standardAssetsReady=Promise.all([
   loadRasterAsset(rasterImages.board,'gelato-prism-cookie-v37.png'),
   loadRasterAsset(rasterImages.fill,'gelato-prism-gelato-v37.png'),
   loadRasterAsset(rasterImages.trim,'gelato-prism-trim-v37.png')
 ]).then(()=>{
   createRasterCache();
   rasterImages.ready=true;
   rasterMold.classList.add('gp-raster-ready');
   mini.classList.add('gp-raster-ready');
   rasterKey='';lastGeometryKey='';
   drawGelato();
   console.info('[GelatoPrism] v37 PNG renderer ready (640 + 192 px, cached tiles)');
 }).catch(err=>{
   console.info('[GelatoPrism] v37 PNGs are not uploaded yet; fallback board remains',err.message);
   throw err;
 });
 // Use the generated snowflake exterior, with ALL internal 42 rails rebuilt
 // from the same regular-hexagram coordinates as the payout engine. v40 has
 // exactly 19 numbered sockets and 24 tiny triangle cavities.
 // Two PNGs can be uploaded after the code; failed loads preserve v37 intact.
 const exactIceBoard=new Image(),exactIceRails=new Image();
 Promise.all([
   standardAssetsReady,
   loadRasterAsset(exactIceBoard,'gelato-prism-ice-base-v40.png'),
   loadRasterAsset(exactIceRails,'gelato-prism-ice-rails-v40.png')
 ]).then(()=>{
   rasterImages.board=exactIceBoard;
   rasterImages.trim=exactIceRails;
   rasterImages.exactV40=true;
   rasterImages.iceReady=false;
   rasterImages.iceCache=null;
   createRasterCache();
   rasterImages.ready=true;
   rasterMold.classList.add('gp-raster-ready');
   mini.classList.add('gp-raster-ready');
   rasterKey='';lastGeometryKey='';
   drawGelato();
   console.info('[GelatoPrism] v40 exact 19/42/24 crystalline PNG board active');
 }).catch(()=>{
   // Until PNGs are uploaded, the published v37 game still functions.
   console.info('[GelatoPrism] v40 snowflake PNG assets pending; preserving v37 renderer');
 });
 function updateStaticLabels(e,bet){
   // Individual triangles do not pay.  No per-cell "0WIN" labels.
   if(rasterImages.labelsBet!==bet){
     rasterImages.labelsBet=bet;
     const c=rasterImages.labels,ctx=c.getContext('2d');
     ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);
   }
   const key=e.nodeNumbers.join(',');
   if(rasterImages.numbersKey!==key){
     rasterImages.numbersKey=key;
     const c=rasterImages.numbers,ctx=c.getContext('2d');
     ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);
     ctx.setTransform(MAIN_SCALE,0,0,MAIN_SCALE,0,0);
     ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
     ctx.strokeStyle='#fff1c8';ctx.fillStyle='#65328a';ctx.lineWidth=4.3;
     // Same Anima-style numerical face as the other Sweets Link games.
     ctx.font='400 23px ElixirNumbers,system-ui,sans-serif';
     for(let idx=0;idx<rasterCoords.length;idx++){
       const p=rasterCoords[idx],n=String(e.nodeNumbers[idx]);
       // Enlarge the original circles slightly, without moving the exact nodes.
       ctx.beginPath();ctx.arc(p.x,p.y,16.3,0,Math.PI*2);
       ctx.fillStyle='#d8edffa8';ctx.strokeStyle='#edfdff';ctx.lineWidth=2.1;
       ctx.fill();ctx.stroke();
       ctx.fillStyle='#56317f';ctx.strokeStyle='#fff6da';ctx.lineWidth=3.8;
       ctx.strokeText(n,p.x,p.y+.5);ctx.fillText(n,p.x,p.y+.5);
     }
   }
 }
 // Small stylized enamel bucket is drawn only during payout filling.
 // The cached image layers remain fully raster; this is an animated overlay.
 function drawIceBucket(ctx,pour){
   const faces=pour.faces;if(!faces.length)return;
   const step=Math.min(faces.length-1,Math.floor(pour.progress*faces.length));
   const f=FACES[faces[step]];if(!f)return;
   const x=f.nodes.reduce((n,i)=>n+rasterCoords[i].x,0)/3*MAIN_SCALE;
   const y=f.nodes.reduce((n,i)=>n+rasterCoords[i].y,0)/3*MAIN_SCALE;
   const bx=Math.min(590,Math.max(70,x+40)),by=Math.max(52,y-116);
   ctx.save();
   const liquid=ctx.createLinearGradient(bx-6,by+26,x,y);
   liquid.addColorStop(0,'#fffbf0');liquid.addColorStop(.45,'#fc80c8');liquid.addColorStop(1,'#ffecf1');
   ctx.beginPath();ctx.moveTo(bx-17,by+24);
   ctx.quadraticCurveTo(bx-12,by+65,x,y-4);
   ctx.strokeStyle='#d66df7';ctx.lineWidth=13;ctx.globalAlpha=.83;ctx.stroke();
   ctx.strokeStyle=liquid;ctx.lineWidth=9;ctx.stroke();
   ctx.globalAlpha=1;
   for(let i=0;i<5;i++){
     const t=(pour.progress*2+i*.17)%1;
     const dx=bx-17+(x-bx+17)*t,dy=by+25+(y-by-25)*t*t;
     ctx.beginPath();ctx.ellipse(dx,dy,3+i%3,4+i%2,0,0,Math.PI*2);
     ctx.fillStyle=i%2?'#fff8ef':'#f696e5';ctx.fill();
   }
   ctx.translate(bx,by);ctx.rotate(-.32);
   const enamel=ctx.createLinearGradient(-38,-26,32,35);
   enamel.addColorStop(0,'#fffefd');enamel.addColorStop(.22,'#c4edff');
   enamel.addColorStop(.64,'#77b7ed');enamel.addColorStop(1,'#35579d');
   ctx.lineWidth=7;ctx.strokeStyle='#eafaff';
   ctx.beginPath();ctx.ellipse(0,-10,39,20,0,Math.PI,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.moveTo(-32,-8);ctx.lineTo(-24,28);
   ctx.quadraticCurveTo(0,47,26,27);ctx.lineTo(33,-8);ctx.closePath();
   ctx.fillStyle=enamel;ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#ffe8a4';ctx.stroke();
   ctx.beginPath();ctx.ellipse(0,-11,35,12,0,0,Math.PI*2);
   ctx.fillStyle='#ffc2e9';ctx.fill();ctx.strokeStyle='#fff9f1';ctx.lineWidth=5;ctx.stroke();
   ctx.fillStyle='#ffffff';ctx.font='1000 26px system-ui';
   ctx.textAlign='center';ctx.fillText('❄',0,21);
   ctx.restore();
 }
 function paintRaster(ctx,e,bet,small){
   const size=small?MINI_PX:MAIN_PX,scale=size/MAIN_PX;
   ctx.setTransform(1,0,0,1,0,0);
   ctx.clearRect(0,0,size,size);
   ctx.drawImage(rasterImages.base,0,0,size,size);
   // Unacquired faces remain dark translucent ice-candy.  Each captured
   // face is lit from within; the bucket reveal advances from bottom upward.
   for(const f of FACES){
     const t=rasterImages.faceTiles[f.id],grade=e.faceGrades[f.id];
     ctx.drawImage(t.dimImages[grade],t.x*scale,t.y*scale,t.width*scale,t.height*scale);
     if(!e.filled.has(f.id))continue;
     const pour=e.pouring,order=pour?.faces.indexOf(f.id)??-1;
     let amount=1;
     if(pour&&order>=0){
       const n=pour.faces.length;
       const phaseWidth=n===1?.6:Math.min(.55,Math.max(.14,1.8/n));
       const startAt=n===1?0:order/(n-1)*(1-phaseWidth);
       amount=Math.max(0,Math.min(1,(pour.progress-startAt)/phaseWidth));
     }
     if(amount<=0)continue;
     ctx.save();
     if(amount<1){
       ctx.beginPath();
       ctx.rect(t.x*scale,t.y*scale+t.height*scale*(1-amount),
         t.width*scale,t.height*scale*amount);
       ctx.clip();
     }
     ctx.globalAlpha=1;
     ctx.drawImage(t.images[grade],t.x*scale,t.y*scale,t.width*scale,t.height*scale);
     ctx.restore();
   }
   ctx.drawImage(rasterImages.trimCache,0,0,size,size);
   if(rasterImages.iceReady&&!rasterImages.exactV40)ctx.drawImage(rasterImages.iceCache,0,0,size,size);
   // Neon icing outlines follow only awarded triangles. Cached PNG textures
   // supply the detailed popsicles; these light strokes communicate status.
   ctx.save();
   ctx.setTransform(size/500,0,0,size/500,0,0);
   for(const faceId of e.filled){
     const face=FACES[faceId],pts=face.nodes.map(i=>rasterCoords[i]);
     ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
     ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[2].x,pts[2].y);ctx.closePath();
     ctx.strokeStyle=GRADE_COLORS[e.faceGrades[faceId]];
     ctx.globalAlpha=.8;
     ctx.lineWidth=small?2.5:3;
     ctx.shadowColor=GRADE_COLORS[e.faceGrades[faceId]];
     ctx.shadowBlur=small?0:5;
     ctx.stroke();
   }
   ctx.restore();

   if(!small&&e.pouring&&e.pouring.progress<1)drawIceBucket(ctx,e.pouring);
   if(!small){
     ctx.drawImage(rasterImages.labels,0,0);
     // Sugar icon is dynamic and can move without repainting label cache.
     if(!e.sugarAwarded){
       const f=FACES[e.sugarFace];
       if(f){
         const x=f.nodes.reduce((n,i)=>n+rasterCoords[i].x,0)/3*MAIN_SCALE;
         const y=f.nodes.reduce((n,i)=>n+rasterCoords[i].y,0)/3*MAIN_SCALE;
         ctx.font='1000 20px system-ui';ctx.textAlign='center';
         ctx.fillStyle='#fff5ac';ctx.strokeStyle='#a43caa';ctx.lineWidth=2.5;
         ctx.strokeText('✦',x,y-21);ctx.fillText('✦',x,y-21);
       }
     }
   }
   ctx.save();
   ctx.setTransform(size/500,0,0,size/500,0,0);
   for(const edgeIndex of e.links){
     const ed=EDGES[edgeIndex],a=rasterCoords[ed.a],b=rasterCoords[ed.b];
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
     ctx.lineCap='round';ctx.lineWidth=small?4:5;
     ctx.strokeStyle='#ffe568';ctx.stroke();
   }
   for(let k=0;k<rasterCoords.length;k++){
     const p=rasterCoords[k],n=e.nodeNumbers[k];
     if(!e.hits.has(k)&&!e.pendingDraws.has(n))continue;
     ctx.beginPath();ctx.arc(p.x,p.y,small?17:15,0,Math.PI*2);
     ctx.lineWidth=small?5:3.7;
     ctx.strokeStyle=e.hits.has(k)?'#ffec55':'#ffffff';
     ctx.stroke();
   }
   ctx.restore();
   if(!small)ctx.drawImage(rasterImages.numbers,0,0);
   drawReachOnNodes(ctx,e,small);
 }
 function drawRaster(e,bet){
   if(!rasterImages.ready)return;
   const key=[e.cycle,e.version,e.hits.size,e.links.size,e.filled.size,
     e.processed,e.accepted,e.busy,e.phase,e.pattern?.id,e.lastNode,
     [...e.pendingDraws].join(','),e.sugarAwarded,bet,
     e.pouring?Math.floor(e.pouring.progress*50):-1].join('/');
   if(key===rasterKey)return;
   rasterKey=key;
   updateStaticLabels(e,bet);
   paintRaster(rasterMain.getContext('2d'),e,bet,false);
   paintRaster(rasterMini.getContext('2d'),e,bet,true);
 }
 function updateDraw(root,e){
   const svg=root.querySelector('.gp-board-svg');if(!svg)return;
   for(const el of svg.querySelectorAll('[data-node]')){
     const i=+el.dataset.node,v=e.nodeNumbers[i],label=el.querySelector('.gp-digit');
     if(label&&label.textContent!==String(v))label.textContent=String(v);
     el.classList.toggle('is-hit',e.hits.has(i));
     el.classList.toggle('is-pending',e.pendingDraws.has(v));
     const reach=getNodeReachTiers(e).get(i);
     el.classList.toggle('is-reach',!!reach);
     if(reach)el.dataset.reachTier=String(reach.tier);
     else delete el.dataset.reachTier;
   }
   for(const el of svg.querySelectorAll('[data-edge]'))el.classList.toggle('is-lit',e.links.has(+el.dataset.edge));
   for(const el of svg.querySelectorAll('[data-face]')){
     const id=+el.dataset.face;
     el.classList.toggle('is-filled',e.filled.has(id));
     el.classList.toggle('is-new',e.lastFilled.includes(id));
     el.classList.toggle('is-sugar',id===e.sugarFace&&!e.sugarAwarded);
     const faceColor=GRADE_COLORS[e.faceGrades[id]];
     const blank=el.querySelector('.gp-blank');
     if(blank)blank.setAttribute('fill',faceColor);
     const gelato=el.querySelector('.gp-ice polygon');
     if(gelato)gelato.setAttribute('fill',faceColor);
     const valueLabel=el.querySelector('.gp-face-value');
     if(valueLabel)valueLabel.textContent='';
   }
 }
 let lastGeometryKey='';
 function drawGelato(){
   const e=app.engines[0];if(e?.kind!=='gelato')return;
   // Cache DOM changes during the 3D roulette's continuous render loop.
   // Repaint node/edge/triangle classes only on actual gameplay changes.
   const geometryKey=[e.cycle,e.version,e.phase,e.hits.size,e.links.size,
     e.filled.size,e.lastNode,e.pendingDraws.size,e.sugarAwarded,e.pattern?.id].join('/');
   if(!rasterImages.ready&&geometryKey!==lastGeometryKey){
     lastGeometryKey=geometryKey;
     updateDraw(scene,e);updateDraw(mini,e);
   }
   // The visible value is a real WIN amount derived from the current BET.
   const bet=app.bet(0);
   if(scene.dataset.gpBet!==String(bet)){
     scene.dataset.gpBet=String(bet);
     for(const root of [scene,mini])
       for(const el of root.querySelectorAll('[data-reward]'))
         el.textContent=num(medalWin(bet,+el.dataset.reward))+'WIN';
   }
   drawRaster(e,bet);
   updateCollectorHUD(e,bet);
   slot.miniCanvas.hidden=true;slot.miniLogo.hidden=true;
 }
 let flashTimer=null;
 function flash(txt){
   const el=scene.querySelector('.gp-flash');el.textContent=txt;el.hidden=false;
   el.classList.remove('gp-flash-in');void el.offsetWidth;el.classList.add('gp-flash-in');
   if(flashTimer)clearTimeout(flashTimer);
   flashTimer=setTimeout(()=>{el.hidden=true},1550);
 }
 let pourToken=0;
 function startGelatoPour(ev,e){
   const token=++pourToken,version=e.version;
   const faces=ev.newFaces.slice();
   if(!faces.length)return;
   const state={faces,progress:0};
   e.pouring=state;
   let started=null,lastUpdate=0;
   const duration=Math.min(2000,950+faces.length*50);
   function frame(now){
     if(token!==pourToken||e.version!==version||e.pouring!==state)return;
     if(started==null)started=now;
     if(now-lastUpdate>=30||now-started>=duration){
       lastUpdate=now;
       state.progress=Math.min(1,(now-started)/duration);
       drawGelato();
     }
     if(state.progress<1)requestAnimationFrame(frame);
     else{e.pouring=null;drawGelato();}
   }
   requestAnimationFrame(frame);
 }
 function onGelatoEvent(ev,e){
   slot.engine=e;slot.event=ev;slot.dirtyMain=true;slot.dirtyMini=true;
   if(ev.phase==='ready'){pourToken++;e.pouring=null;slot.reachStatus='inactive';slot.reachEpoch=(slot.reachEpoch||0)+1;slot.reachBoardKey=null;slot.reachResults=[];slot.tabReachResults=[];}
   if(ev.phase==='gelatoFill'){
     startGelatoPour(ev,e);
     // A large flash would obscure the bucket and liquid animation.
     // Reserve the short announcement only for the rare 24/24 full-clear.
     if(ev.full)flash('全埋め！');
   }
   if(ev.phase==='sugaraward')flash('✦ WONDER SUGAR GET!');
   if(['waiting','settled','complete'].includes(ev.phase))requestReach(slot,e,app);
   drawGelato();scheduleUI(app);
 }
 const e=new GelatoEngine(app.random,(ev,engine)=>{
   if(ev.phase==='stepcollect'&&app.phase==='playing'&&app.enabled[0]){
     app.wonderBank.push(...ev.steps.map(t=>({...t,game:0})));
     app.wonderSteps=app.wonderBank.length;app.wonderValue+=ev.steps.reduce((n,t)=>n+t.value,0);
   }
   if(ev.phase==='complete'&&app.phase==='playing'&&!app.paid[0]&&app.enabled[0]){
     app.paid[0]=true;app.roundWins[0]=medalWin(app.locked[0],engine.totalHundredths);
     if(app.enabled.every((yes,i)=>!yes||app.paid[i]))app.finishRound();
   }
   onGelatoEvent(ev,engine);
   if(ev.phase==='complete')recordChanged(app);
 },app.sleep);
 app.engines[0]=e;slot.engine=e;
 // Keep reach highlights lively without involving full world rerendering.
 // Only the two small 2D canvases refresh while these numbered reaches exist.
 setInterval(()=>{
   if(document.hidden||!document.body.classList.contains('gelato-active'))return;
   if(getNodeReachTiers(e).size===0)return;
   rasterKey='';
   drawRaster(e,app.bet(0));
 },115);
 e.beforeComplete=async token=>{if(token===e.version)await e.wait(280,token);};
 // Keep the other two original game engines and all common accounting.
 const nativeRender=render;
 render=function(s,ev,engine,...rest){if(engine?.kind==='gelato'){drawGelato();return;}return nativeRender(s,ev,engine,...rest);};
 const nativeMini=miniature;
 miniature=function(s){if(s.engine?.kind==='gelato'){drawGelato();return;}return nativeMini(s);};
 const nativeReach=requestReach;
 requestReach=function(s,engine,a=app){
   if(engine?.kind!=='gelato')return nativeReach(s,engine,a);
   const ctx=reachContext(engine,a);
   if(!ctx||a.bet(0)<=0||engine.processed>=8){s.reachStatus='inactive';s.reachResults=[];s.tabReachResults=[];s.reachBoardKey=null;return;}
   if(s.reachBoardKey===ctx.key)return;
   const epoch=(s.reachEpoch||0)+1;s.reachEpoch=epoch;
   s.reachBoardKey=ctx.key;s.reachStatus='pending';
   const candidates=Array.from({length:25},(_,i)=>i+1).filter(n=>!ctx.used.has(n));
   const results=[];let k=0;
   function chunk(){
     if(s.reachEpoch!==epoch||s.reachBoardKey!==ctx.key)return;
     if(app.paused){setTimeout(chunk,75);return;}
     for(let max=Math.min(k+3,candidates.length);k<max;k++){
       const p=engine.predict(candidates[k]);if(p.gain>0)results.push(p);
     }
     if(k<candidates.length){setTimeout(chunk,10);return;}
     results.sort((a,b)=>a.number-b.number);
     s.reachResults=results;s.tabReachResults=results;s.tabReachBase=engine.totalHundredths;
     s.tabReachVersion=engine.version;s.reachStatus='ready';s.reachAfterBall=engine.processed;
     scheduleUI(app);
   }
   setTimeout(chunk,12);
 };
 const nativeReachBoard=updateReachBoard;
 updateReachBoard=function(s,a){if(s.engine?.kind==='gelato')return;return nativeReachBoard(s,a);};
 const nativeTabs=tabs;
 tabs=function(a){
   if(slot.engine?.kind!=='gelato')return nativeTabs(a);
   const saved=slot.engine;slot.engine=null;
   try{nativeTabs(a);}finally{slot.engine=saved;}
   const bet=a.bet(0),win=medalWin(bet,saved.totalHundredths);
   fitGoldenNumber(slot.tabBet,num(bet),14,76);
   slot.tabWin.parentNode.hidden=win<=0;fitGoldenNumber(slot.tabWin,num(win),17,50);
   slot.tabSugar.hidden=false;slot.tabSugar.classList.toggle('collected',saved.wonderCollected);
   applySugarTier(slot.tabSugar.querySelector('.sugar-gem'),wonderTier(bet));
   slot.sugarGet.hidden=!saved.wonderCollected;slot.tab.classList.toggle('off',bet<=0);
 };
 const nativeHud=hud;
 hud=function(a){
   if(active!==0){document.body.classList.remove('gelato-active');return nativeHud(a);}
   active=1;
   try{nativeHud(a);}finally{active=0;}
   document.body.classList.remove('choco-active','carnival-active');document.body.classList.add('gelato-active');
   put('best','PRISM '+e.filled.size+' / 24 · '+(e.pattern?.name||''));
   put('ballinfo','あと'+Math.max(0,8-a.draws.length)+'球');
   fitGoldenNumber($('credit'),num(a.displayCredit),17,68);
   fitGoldenNumber($('win'),num(a.totalWin),17,54);
   drawGelato();updateReachUI(a);
 };
 const nativePreview=syncBetPreview;
 syncBetPreview=function(a){
   if(a?.engines[0]?.kind==='gelato'){if(betPreview)stopBetPreview();return;}
   return nativePreview(a);
 };
 const nativeResult=renderRoundResult;
 renderRoundResult=function(a){
   nativeResult(a);
   if(a.engines[0]?.kind!=='gelato')return;
   const row=$('result-games')?.querySelector('.result-game');
   if(!row||row.dataset.gelato)return;
   row.dataset.gelato='yes';
   row.querySelector('.result-game-name').innerHTML='ジェラートプリズム <small>'+num(a.locked[0])+' BET</small>';
   const details=row.querySelector('.result-game-details');
   if(details)details.innerHTML='<span>'+e.filled.size+' / 24パネル</span><span>枚数 '+e.countMult.toFixed(1)+'倍＋4色 '+e.collectorMult.toFixed(1)+'倍</span>';
   // Visually follow the three-tab order without changing app.engine indices.
   const panel=$('result-games'),cards=[...panel.querySelectorAll('.result-game')];
   if(cards.length===3)panel.append(cards[1],cards[2],cards[0]);
 };
 document.body.classList.add('gelato-enabled');
 drawGelato();select(1);scheduleUI(app);
 window.GelatoPrism={
   get imageVersion(){return rasterImages.candyAtlasReady?'v43-popsicles':rasterImages.exactV40?'v40-exact-24-cells':rasterImages.ready?'v37-fallback':'loading';},
   geometry:{nodes:P.length,edges:EDGES.length,faces:FACES.length},
   get state(){return {filled:e.filled.size,hits:e.hits.size,processed:e.processed,phase:e.phase,
     pattern:e.pattern?.id,counts:e.collectorCounts.slice(),sugarTarget:e.sugarTarget,sugarAwarded:e.sugarAwarded,countMult:e.countMult,
     collectorMult:e.collectorMult,totalHundredths:e.totalHundredths,bonus:e.allComplete};},
   patterns:PATTERNS.map(p=>({id:p.id,name:p.name,weight:p.weight,grades:p.grades.slice()})),
   prizes:{countMultiplier:COUNT_MULT.slice(),colorMultipliers:COLLECTOR_MULT.slice()},
   payoutWindowFor,
   get reach(){return [...getNodeReachTiers(e)].map(([index,r])=>({index,...r}));},
   engine:e,faces:FACES
 };
 console.info('[GelatoPrism] ready: 19 nodes / 24 faces / 8 draws');
}catch(error){console.error('[GelatoPrism] initialization failed',error);}
})();