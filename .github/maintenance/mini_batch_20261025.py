from pathlib import Path
import hashlib
raw=Path('index.html').read_bytes()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='251676ec51dea9951cb1dc1e486a94a7165902df'
lines=raw.decode().splitlines()
wanted=set(range(2419,2504))
for i,line in enumerate(lines):
 if len(line)<18000 and any(t in line for t in ['function hud(', 'ballsKey', '.balls ', '.balls.', 'draw-group', 'pending-group','batch-wait','ball.wait','ball.pending','ball-flash','group-wait','function makeClearPlan','const MIN_PAID_LINK','function copyReachState','function predictNextHit','const HIT_GAP_MS','type="module"']):
  wanted.update(range(max(0,i-2),min(len(lines),i+8)))
for i in sorted(wanted):
 line=lines[i]
 print(f'{i+1}: '+(line if len(line)<6000 else line[:300]+' [long asset omitted]'))
print('Inspection only; game files have not been modified.')
