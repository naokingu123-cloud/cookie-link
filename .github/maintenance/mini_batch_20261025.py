from pathlib import Path
import hashlib
raw=Path('index.html').read_bytes()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='251676ec51dea9951cb1dc1e486a94a7165902df'
lines=raw.decode().splitlines()
spans=[(2375,2399),(2504,2555),(3137,3193),(3580,3650)]
terms=['miniResult','mini-result-label','function recordEvent','function recordChanged','function event','function syncPause','function debugResetRound','group-pending','draw-batch','ball-pending','ball-flash','group-flash','function scheduleUI','function flushUI','.tile.hit','const slots=']
wanted=set()
for a,b in spans:wanted.update(range(a-1,b))
for i,line in enumerate(lines):
 if any(t in line for t in terms) and len(line)<18000:wanted.update(range(max(0,i-3),min(len(lines),i+20)))
for i in sorted(wanted):
 line=lines[i]
 if len(line)>9000:line=line[:500]+' [embedded asset omitted]'
 print(f'{i+1}: {line}')
print('Inspection only; game files have not been modified.')
