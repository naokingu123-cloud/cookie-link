#!/usr/bin/env python3
"""Build the clean 1672x941 winery scenery from the existing photographic source.

Retains high-detail fruit waterfalls at the sides; removes screenshot-only title,
ball counters, example glasses, BET/WIN bar and other static game elements.
The centre is intentionally defocused to keep 21 separately animated glasses clear.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

root=Path(__file__).resolve().parents[2]
src=Image.open(root/"assets/winery-juice-world-v60.webp").convert("RGB")
w,h=src.size
assert (w,h)==(1672,941)
base=np.asarray(src).astype(np.float32)
blur=np.asarray(src.filter(ImageFilter.GaussianBlur(44))).astype(np.float32)
y,x=np.indices((h,w))
left=np.clip((x-290)/130,0,1)
right=np.clip((1340-x)/110,0,1)
down=np.clip((y-70)/100,0,1)
central=left*right*down
base=base*(1-central[:,:,None])+blur*central[:,:,None]
# Clean the whole old title and round display, including the first baked cup.
upper=np.clip((355-y)/100,0,1)
upper*=np.clip((1320-x)/30,0,1)
topbase=np.asarray(
    src.crop((0,250,w,620)).resize((w,370),Image.Resampling.LANCZOS)
       .filter(ImageFilter.GaussianBlur(37))
).astype(np.float32)
for row in range(370):
    a=upper[row,:,None]
    base[row,:,:]=base[row,:,:]*(1-a)+topbase[row,:,:]*a
# Hide the baked bottom BET/WIN/circle row behind river reflections.
bottom=np.clip((y-735)/75,0,1)*central
base=base*(1-bottom[:,:,None]*.85)+blur*(bottom[:,:,None]*.85)
river=np.clip((y-350)/340,0,1)*np.clip((1340-np.abs(x-820))/230,0,1)
red=np.empty_like(base)
red[:,:,0]=245+6*np.sin(x*.015+y*.013)
red[:,:,1]=54+20*np.sin(y*.013)
red[:,:,2]=114+25*np.sin((x+y)*.009)
strength=.17*river
base=base*(1-strength[:,:,None])+red*strength[:,:,None]
im=Image.fromarray(np.uint8(np.clip(base,0,255))).convert("RGBA")
highlights=Image.new("RGBA",(w,h),(0,0,0,0))
brush=ImageDraw.Draw(highlights)
for i in range(160):
    px=340+(i*151)%870
    py=360+(i*93)%545
    rad=(i*7)%30+18
    brush.line([(px-rad,py),(px+rad,py)],
               fill=(255,246,199,36+((i*11)%55)),width=1+int(i%3==0))
highlights=highlights.filter(ImageFilter.GaussianBlur(1.5))
im=Image.alpha_composite(im,highlights).convert("RGB")
im=ImageEnhance.Color(im).enhance(1.13)
target=root/"assets/winery-juice-world-clean-v61.webp"
im.save(target,format="WEBP",quality=89,method=6)
assert target.stat().st_size > 50000
print(f"CREATED {target} ({target.stat().st_size} bytes)")
