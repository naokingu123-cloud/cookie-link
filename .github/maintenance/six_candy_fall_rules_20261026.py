"""One-time source-guarded gravity update. Only the Six Candy fall solver changes.
Reference observations: https://qiita.com/Jun_Ishikawa/items/fe6a533c0531a9071d99
and https://qiita.com/GANTZ/items/e6b5e9168b595404d582 . These are independent
reimplementations, NOT Nintendo source or proof of all original-game outcomes.
The implementation below is original; regression fixtures verify its declared rules.
"""
from pathlib import Path
import hashlib,re,subprocess
p=Path('index.html');raw=p.read_bytes();before=raw.decode()
base='2db6ae96fc5e1383e029f9c36d50f500ac3e828c'
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==base,'Source changed; inspect before rebasing'
Path('/tmp/six-candy-fall-before.html').write_bytes(raw)
engine=Path('assets/six-candy-rounds-engine.js').read_text()
a=engine.index('function sixMotionPoint(');b=engine.index('function sixPlan(',a);old=engine[a:b]
new=r'''// Grid-directed falling. Occupancy determines the destination; rendering does not
// choose gameplay outcomes. No per-candy lean, id parity, random drift or momentum.
const SIX_FALL_RULES='grid-support-synchronous-v3';
function sixMotionPoint(move,t){
 t=Math.max(0,Math.min(1,t));const a=sixPoint(...move.from),b=sixPoint(...move.to);
 if(!move.pivot)return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 const p=sixPoint(...move.pivot),angle=Math.atan2(a.y-p.y,a.x-p.x)+move.turn*t;
 return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
}
function sixPathClear(grid,move,vacating=new Set()){
 // A departing neighbour is tested against its real path by the batch scheduler,
 // not against its old, frozen location. Anchored neighbours still block passage.
 for(let k=1;k<=16;k++){
  const p=sixMotionPoint(move,k/16);
  for(let r=Math.max(0,move.from[0]-1);r<=Math.min(grid.length-1,move.to[0]+1);r++)for(let c=0;c<=r;c++){
   const t=grid[r][c];if(!t||t.id===move.id||vacating.has(t.id))continue;const q=sixPoint(r,c);
   if((p.x-q.x)**2+(p.y-q.y)**2<.999999)return false;
  }
 }
 return true;
}
function sixFallOptions(grid,r,c,vacating=new Set()){
 const tile=grid[r]?.[c];if(!tile||r===grid.length-1||vacating.has(tile.id))return [];
 const occupied=(y,x)=>{const t=grid[y]?.[x];return t&&!vacating.has(t.id)?t:null;};
 const left=occupied(r+1,c),right=occupied(r+1,c+1),sideL=occupied(r,c-1),sideR=occupied(r,c+1);
 if(left&&right)return [];
 const make=(to,pivot=null,turn=0)=>({id:tile.id,tile:{...tile},from:[r,c],to,pivot,turn});
 const downLeft=()=>!left&&!sideL?make([r+1,c],right?[r+1,c+1]:null,right?-Math.PI/3:0):null;
 const downRight=()=>!right&&!sideR?make([r+1,c+1],left?[r+1,c]:null,left?Math.PI/3:0):null;
 const vertical=()=>!left&&!right&&r+2<grid.length&&!occupied(r+2,c+1)?make([r+2,c+1]):null;
 let options=[];
 if(left)options=[downRight()];
 else if(right)options=[downLeft()];
 else {
  // A lateral neighbour sends the ball toward the opposite lower slot. When
  // neither side biases it, an empty shaft is traversed vertically, not zig-zag.
  // Keep the snapshot neighbour for direction even when that neighbour is moving.
  const biasL=!!grid[r]?.[c-1],biasR=!!grid[r]?.[c+1];
  if(biasL&&!biasR)options=[downRight()];
  else if(biasR&&!biasL)options=[downLeft()];
  else if(vertical())options=[vertical()];
  else {
   const l=downLeft(),rr=downRight();
   // Geometric tie only: prefer the less obstructed lower landing. Exact symmetry
   // is resolved left first. Neither tile ids nor random state affect prediction.
   const room=m=>m?[[m.to[0]+1,m.to[1]],[m.to[0]+1,m.to[1]+1]].filter(([y,x])=>y<grid.length&&!occupied(y,x)).length:-1;
   options=room(rr)>room(l)?[rr,l]:[l,rr];
  }
 }
 return options.filter(Boolean).filter(m=>sixPathClear(grid,m,vacating));
}
function sixMotionsClear(a,b){
 for(let k=0;k<=16;k++){const p=sixMotionPoint(a,k/16),q=sixMotionPoint(b,k/16);if((p.x-q.x)**2+(p.y-q.y)**2<.999999)return false;}
 return true;
}
function sixDrop(grid,{trace=false}={}){
 const steps=[],paths=new Map(),count=sixCount(grid);let iterations=0;
 for(;;){
  if(++iterations>count*grid.length+1)throw Error('Six Candy gravity did not converge');
  const accepted=[],vacating=new Set(),targets=new Set(),pinned=new Set();
  // Bottom-up is used to resolve dependencies, not to animate rows one at a time.
  // Revisit cells after their neighbours receive a move, permitting a stack to
  // descend in the same visual beat as the ball which was supporting it.
  for(let pass=0;pass<=count;pass++){
   const previous=accepted.length;
   for(let r=grid.length-2;r>=0;r--){
    const proposals=[];
    for(let c=0;c<=r;c++){
     const t=grid[r][c];if(!t||vacating.has(t.id)||pinned.has(t.id))continue;
     const candidates=sixFallOptions(grid,r,c,vacating);if(candidates.length)proposals.push({c,candidates});
    }
    proposals.sort((a,b)=>a.candidates.length-b.candidates.length||a.c-b.c);
    for(const proposal of proposals)for(const m of proposal.candidates){
     if(vacating.has(m.id)||pinned.has(m.id)||targets.has(sixKey(...m.to)))continue;
     // Earlier moves can have changed which neighbours are static.
     if(!sixPathClear(grid,m,vacating)||accepted.some(other=>!sixMotionsClear(m,other)))continue;
     accepted.push(m);vacating.add(m.id);targets.add(sixKey(...m.to));
     if(m.pivot){const support=grid[m.pivot[0]][m.pivot[1]];if(support)pinned.add(support.id);}
     break;
    }
   }
   if(accepted.length===previous)break;
  }
  if(!accepted.length)break;
  // Clear all sources before writing destinations: a following ball may occupy
  // another ball's just-vacated slot without overwriting or duplicating either.
  for(const m of accepted)grid[m.from[0]][m.from[1]]=null;
  for(const m of accepted){
   if(grid[m.to[0]][m.to[1]])throw Error('Reserved candy destination is occupied');
   grid[m.to[0]][m.to[1]]=m.tile;
   if(!paths.has(m.id))paths.set(m.id,{id:m.id,tile:m.tile,points:[m.from]});paths.get(m.id).points.push(m.to);
  }
  if(trace)steps.push({grid:sixClone(grid),moves:accepted,ms:accepted.some(m=>m.to[0]-m.from[0]===2)?120:90});
 }
 return {steps,moves:[...paths.values()]};
}
'''
for path in ['assets/six-candy-rounds-engine.js','assets/six-candy.js','index.html']:
 f=Path(path);text=f.read_text();assert text.count(old)==1,(path,'Gravity source mismatch')
 changed=text.replace(old,new,1);assert changed.replace(new,old,1)==text,'Unexpected unrelated change'
 f.write_text(changed)
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',p.read_text())):
 attrs,code=m.groups()
 if not code.strip() or re.search(r'type=[\"\x27](?:application/(?:json|ld\+json)|importmap)',attrs):continue
 f=Path('/tmp')/f'six-gravity-{i}.mjs';f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
print('SIX_GRAVITY_PATCH_ONLY_OK',hashlib.sha1(b'blob '+str(len(p.read_bytes())).encode()+b'\0'+p.read_bytes()).hexdigest())
