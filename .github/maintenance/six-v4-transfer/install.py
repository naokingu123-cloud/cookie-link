"""Apply a hash-verified text delta without transferring the 70MB project."""
from pathlib import Path
import base64,hashlib,json,re,subprocess,zlib
root=Path.cwd();stage=root/'.github/maintenance/six-v4-transfer'
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
raw=(root/'index.html').read_bytes()
assert blob(raw)=='c0c02ed3a56eb395881fe2ae8cdd00632a5da8a9','Live game changed; rebase before applying'
old=raw.decode();old_bundle=(root/'assets/six-candy.js').read_text()
assert old.count(old_bundle)==1,'Embedded source differs from editable source'
chunks=[(stage/f'part-{n}.b64').read_text().strip() for n in range(4)]
# Repair the one verified transport insertion, then verify the entire payload.
chunks[0]=chunks[0].replace('F3WpP9aVX3o','F3WpP9aVXo',1)
packed=zlib.decompress(base64.b64decode(''.join(chunks)))
assert hashlib.sha256(packed).hexdigest()=='b08beddec77a1f76628c6ba0959f31a3dce30ffde28082e998055c8944eecc19','Transfer checksum mismatch'
for path,before_hash,after_hash,edits in json.loads(packed):
 p=root/path;before=p.read_text() if p.exists() else ''
 assert hashlib.sha256(before.encode()).hexdigest()==before_hash,f'Changed base file: {path}'
 lines=before.splitlines(True)
 for a,b,text in reversed(edits):lines[a:b]=text.splitlines(True)
 after=''.join(lines)
 assert hashlib.sha256(after.encode()).hexdigest()==after_hash,f'Delta mismatch: {path}'
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(after)
a=root/'assets';engine=(a/'six-candy-rounds-engine.js').read_text();art=(a/'six-candy-art.js').read_text();ui=(a/'six-candy-rounds-ui.js').read_text()
helpers=old_bundle[old_bundle.index('function sixCandySprite('):old_bundle.index('/* Host-compatible renderer')]
helpers=helpers.replace('function sixCandySprite(color){return sixArtCandySprite(color);}','function sixCandySprite(color,round=1,sugar=false){return sixArtCandySprite(color,round,sugar);}')
bundle=engine+'\n'+art+'\n'+helpers+ui
(a/'six-candy.js').write_text(bundle)
css=(a/'six-candy-rounds.css').read_text();html=old.replace(old_bundle,bundle)
assert html.count('</style></head><body>')==1
html=html.replace('</style></head><body>',css+'\n</style></head><body>')
assert html.replace(bundle,'[[SIX]]').replace(css+'\n','',1)==old.replace(old_bundle,'[[SIX]]'),'Shared game code changed'
assert hashlib.sha256(html.encode()).hexdigest()=='ab7c635c3018d5eb5f33df0c90edf9b3d1e85e4588b957544adb540b6448e86c','Unexpected generated game'
(root/'index.html').write_text(html)
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',html)):
 attrs,code=m.groups()
 if not code.strip() or re.search(r'type=[\"\x27](?:application/(?:json|ld\+json)|importmap)',attrs):continue
 f=Path('/tmp')/f'six-v4-check-{i}.mjs';f.write_text(code);subprocess.run(['node','--check',f],check=True);f.unlink()
print('SIX_V4_TRANSFER_AND_HOST_GUARD_OK',blob(html.encode()),flush=True)
