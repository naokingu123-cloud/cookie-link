"""One-time exact-source repair for unsupported candy bridges. No rule/payout changes."""
from pathlib import Path
import hashlib,re,subprocess
index=Path('index.html');raw=index.read_bytes();base='e85d07c4a4d9a67a019e803b779288693204b857'
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==base,'Source changed; rebase before applying'
source=Path('assets/six-candy-rounds-engine.js').read_text()
Path('/tmp/six-empty-support-before-engine.js').write_text(source)
Path('/tmp/six-empty-support-before.html').write_bytes(raw)
start=source.index("const SIX_FALL_RULES='grid-support-synchronous-v3';")
end=source.index('function sixPlan(',start)
old=source[start:end];new=old

def replace(a,b):
 global new
 assert new.count(a)==1,(a[:120],new.count(a))
 new=new.replace(a,b,1)
replace("const SIX_FALL_RULES='grid-support-synchronous-v3';","const SIX_FALL_RULES='grid-support-synchronous-v4-gap-settle';")
replace(" t=Math.max(0,Math.min(1,t));const a=sixPoint(...move.from),b=sixPoint(...move.to);\n if(!move.pivot)",""" t=Math.max(0,Math.min(1,t));const a=sixPoint(...move.from),b=sixPoint(...move.to);
 if(t===0)return a;if(t===1)return b;
 if(move.gap){
  // Empty lower neighbours cannot support a candy. Descend through the open
  // centre before settling sideways; a direct diagonal would clip a side candy.
  const sign=Math.sign(b.x-a.x);
  if(move.gapPivot){
   // Approach the top of the next-row support, then roll only 30 degrees.
   // This differs from the 60-degree arc around an immediate diagonal support.
   const p=sixPoint(...move.gapPivot),vertical=p.y-1-a.y,arc=Math.PI/6,d=t*(vertical+arc);
   if(d<=vertical)return {x:a.x,y:a.y+d};
   const angle=-Math.PI/2+sign*(d-vertical);
   return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
  }
  // Bottom boundary or open lower centre: fall first, then align with a free
  // lattice slot. Keep the same candy identity and a continuous displayed path.
  const vertical=b.y-a.y,d=t*(vertical+Math.abs(b.x-a.x));
  return d<=vertical?{x:a.x,y:a.y+d}:{x:a.x+sign*(d-vertical),y:b.y};
 }
 if(!move.pivot)""")
replace(" const downLeft=()=>!left&&!sideL?make([r+1,c],right?[r+1,c+1]:null,right?-Math.PI/3:0):null;\n const downRight=()=>!right&&!sideR?make([r+1,c+1],left?[r+1,c]:null,left?Math.PI/3:0):null;",""" // When both supports are empty, lateral neighbours restrict the *path*, not
 // the ability to fall. The v3 diagonal-only path incorrectly formed air bridges.
 const gap=to=>({...make(to),gap:true,gapPivot:r+2<grid.length&&occupied(r+2,c+1)?[r+2,c+1]:null});
 const downLeft=()=>left?null:!sideL?make([r+1,c],right?[r+1,c+1]:null,right?-Math.PI/3:0):!right?gap([r+1,c]):null;
 const downRight=()=>right?null:!sideR?make([r+1,c+1],left?[r+1,c]:null,left?Math.PI/3:0):!left?gap([r+1,c+1]):null;""")
replace("     if(m.pivot){const support=grid[m.pivot[0]][m.pivot[1]];if(support)pinned.add(support.id);}","     for(const pivot of [m.pivot,m.gapPivot])if(pivot){const support=grid[pivot[0]][pivot[1]];if(support)pinned.add(support.id);}")
replace("  if(trace)steps.push({grid:sixClone(grid),moves:accepted,ms:accepted.some(m=>m.to[0]-m.from[0]===2)?120:90});","  if(trace)steps.push({grid:sixClone(grid),moves:accepted,ms:accepted.some(m=>m.gap)?160:accepted.some(m=>m.to[0]-m.from[0]===2)?120:90});")
for name in ['assets/six-candy-rounds-engine.js','assets/six-candy.js','index.html']:
 p=Path(name);text=p.read_text();assert text.count(old)==1,(name,'Embedded gravity copies differ')
 updated=text.replace(old,new,1);assert updated.replace(new,old,1)==text
 p.write_text(updated)
# Only the model version assertion changes in the retained regression; all of its
# independent path, support, accounting and visual checks remain intact.
p=Path('.github/tests/six_candy_fall_rules_20261026.cjs');text=p.read_text()
a="assert.equal(q.SIX_FALL_RULES,'grid-support-synchronous-v3');";b="assert.equal(q.SIX_FALL_RULES,'grid-support-synchronous-v4-gap-settle');"
assert text.count(a)==1;p.write_text(text.replace(a,b,1))
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',index.read_text())):
 attrs,body=m.groups()
 if not body.strip() or re.search(r'type=[\"\x27](?:application/(?:json|ld\+json)|importmap)',attrs):continue
 p=Path('/tmp')/f'six-empty-support-{i}.mjs';p.write_text(body);subprocess.run(['node','--check',str(p)],check=True)
print('EMPTY_SUPPORT_GRAVITY_PATCH_ONLY_OK')
