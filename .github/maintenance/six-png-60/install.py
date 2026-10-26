"""One-time guarded integration. Only verified original PNG bytes are installed."""
from pathlib import Path
import json,hashlib,base64,re,subprocess
stage=Path('.github/maintenance/six-png-60')
raw=Path('index.html').read_bytes()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def sha(b):return hashlib.sha256(b).hexdigest()
assert blob(raw)=='d6c5ef16dea4d160ab7851636d729a2ea1e8a962','Main game changed; rebase rather than overwrite'
before=raw.decode();old_bundle=Path('assets/six-candy.js').read_text();old_css=Path('assets/six-candy-art.css').read_text()
assert before.count(old_bundle)==1 and before.count(old_css)==1
edits=json.loads((stage/'edits.json').read_text());old={};new={}
for name,change in edits.items():
 s=Path(name).read_text();old[name]=s
 assert sha(s.encode())==change['base'],f'Source changed: {name}'
 for a,b,t in reversed(change['edits']):s=s[:a]+t+s[b:]
 assert sha(s.encode())==change['final'],f'Transfer error: {name}'
 new[name]=s
corrections=json.loads((stage/'corrections.json').read_text());parts=[]
for i in range(4):
 text=(stage/f'atlas.{i}.b64').read_text()
 for a,b,t in reversed(corrections[str(i)]):text=text[:a]+t+text[b:]
 parts.append(text)
image=base64.b64decode(''.join(parts),validate=True)
assert len(image)==30044 and sha(image)=='ba24d2811b3758f9e810110a6505bb9ede2e70308983ec93f0d280e2e3461abb','Image transfer hash mismatch'
bundle=old_bundle
for name in ['assets/six-candy-rounds-engine.js','assets/six-candy-art.js','assets/six-candy-rounds-ui.js']:
 assert bundle.count(old[name])==1;bundle=bundle.replace(old[name],new[name],1)
html=before.replace(old_bundle,bundle,1).replace(old_css,new['assets/six-candy-art.css'],1)
assert before.replace(old_bundle,'[GAME]').replace(old_css,'[CSS]')==html.replace(bundle,'[GAME]').replace(new['assets/six-candy-art.css'],'[CSS]'),'Unrelated host modification'
for name,s in new.items():Path(name).write_text(s)
Path('assets/six-candy.js').write_text(bundle);Path('index.html').write_text(html)
out=Path('assets/six-candy-png');out.mkdir(exist_ok=True);(out/'candies.webp').write_bytes(image)
manifest={'version':'original-png-staggered-v1','source_png':'カラフルなキャンディアイコン素材シート.png','source_sha256':'6629a51390b952586800164f8e9b2191df7adca56a25773cb7e61f44b7fcb1c1','generated_png_embedded':True,'atlas':'assets/six-candy-png/candies.webp','atlas_cell_px':128,'atlas_sha256':sha(image),'flavors':[{'color':i,'name':n,'source_crop':box} for i,(n,box) in enumerate([('strawberry',[14,39,245,272]),('lemon',[250,36,483,272]),('soda',[763,36,996,270]),('grape',[498,50,720,272])])],'notes':'Original PNG pixels, resized and WebP-encoded; source alpha retained; grape round centre cropped for contact geometry. Numbers remain separate live glyphs. Logo and decorative backdrop remain vector/Canvas.'}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',html)):
 attrs,code=m.groups()
 if not code.strip() or re.search(r'type=[\"\x27](?:application/(?:json|ld\+json)|importmap)',attrs):continue
 f=Path('/tmp')/f'six-staggered-{i}.mjs';f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
print('GUARDED_STAGGERED_INSTALL_OK',blob(html.encode()),'PNG_SHA256',sha(image),flush=True)
