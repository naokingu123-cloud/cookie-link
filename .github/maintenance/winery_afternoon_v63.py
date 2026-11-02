#!/usr/bin/env python3
"""Photo-detailed 6-tier afternoon-tea STAND ONLY for Winery Pyramid.

Builds a transparent RGBA WebP using the existing original deluxe gold
photograph as its relief source. Never bakes cups, numbers, fluids, UI or
landscape into the overlay. All game values stay live in the 2 canvas layers.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math

root=Path(__file__).resolve().parents[2]
W,H=1672,941
source=Image.open(root/'assets/winery-luxury-screen-v56.webp').convert('RGB')
rim=source.crop((170,855,1320,914)).convert('RGBA')
stand=Image.new('RGBA',(W,H),(0,0,0,0))
rails=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(rails)
P=[(792-(r/2)*141-108,110+r*136+118) for r in range(6)]
Q=[(792+(r/2)*141+108,110+r*136+118) for r in range(6)]
for side in (P,Q):
    pts=[]
    for r in range(5):
        x0,y0=side[r];x1,y1=side[r+1]
        for j in range(13):
            u=j/13;ease=u*u*(3-2*u)
            xx=x0+(x1-x0)*ease+(-1 if side is P else 1)*8*math.sin(math.pi*u)
            yy=y0+(y1-y0)*u
            pts.append((int(xx),int(yy)))
    pts.append(tuple(map(int,side[-1])))
    d.line(pts,fill=(113,43,70,118),width=20,joint='curve')
    d.line(pts,fill=(223,140,68,230),width=13,joint='curve')
    d.line([(x-2,y-2) for x,y in pts],fill=(255,231,152,236),width=5,joint='curve')
    d.line([(x+3,y+2) for x,y in pts],fill=(178,78,45,175),width=2,joint='curve')
    for r in range(6):
        x,y=side[r]
        d.ellipse((x-13,y-14,x+13,y+14),fill=(233,171,76,240),outline=(255,239,183,240),width=3)
        d.ellipse((x-8,y-9,x+8,y+9),fill=(163,41,94,245),outline=(255,188,125,240),width=2)
        d.polygon([(x,y-8),(x+6,y),(x,y+9),(x-6,y)],fill=(245,64,140,255))
        d.line([(x-15,y-14),(x-29,y-25),(x-38,y-24)],fill=(251,213,139,180),width=3)
stand.alpha_composite(rails.filter(ImageFilter.GaussianBlur(5)))
stand.alpha_composite(rails)
widths=[222,365,510,650,790,936]
for r,w in enumerate(widths):
    cy=110+r*136+[0,0,1,1,2,2][r]
    yy=int(cy+117)
    x0=int(792-w/2);x1=int(792+w/2)
    shadow=Image.new('RGBA',(W,H),(0,0,0,0))
    ImageDraw.Draw(shadow).ellipse((x0-5,yy+7,x1+5,yy+42),fill=(71,12,51,105))
    stand.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(7)))
    layer=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(layer)
    d.ellipse((x0-2,yy-5,x1+2,yy+34),fill=(150,60,66,245),outline=(249,192,91,250),width=3)
    metal=rim.resize((w,48),Image.Resampling.LANCZOS)
    mask=Image.new('L',(w,48),0)
    ImageDraw.Draw(mask).ellipse((0,2,w-1,57),fill=255)
    alpha=np.asarray(mask).astype(np.float32)
    feather=np.clip((np.arange(48,dtype=np.float32)-12)/9,0,1)
    metal.putalpha(Image.fromarray(np.uint8(alpha*feather[:,None]),'L'))
    layer.alpha_composite(metal,(x0,yy+2))
    # Pearl-rose porcelain is shaded at pixel level rather than CSS/SVG.
    Y,X=np.indices((40,w));u=X/(w-1);v=Y/40
    grain=3*np.sin(u*45+v*12)+2*np.cos(u*95-v*4)
    glow=np.exp(-((u-.4)/.45)**2)*15
    px=np.zeros((40,w,4),dtype=np.uint8)
    px[:,:,0]=np.uint8(np.clip(249+glow*.25+grain*.4,0,255))
    px[:,:,1]=np.uint8(np.clip(212+glow*.4+grain*.6,0,255))
    px[:,:,2]=np.uint8(np.clip(215+glow*.55+grain*.8,0,255))
    px[:,:,3]=255
    plate=Image.fromarray(px,'RGBA')
    m=Image.new('L',(w,40),0)
    ImageDraw.Draw(m).ellipse((4,0,w-4,35),fill=255)
    plate.putalpha(m.filter(ImageFilter.GaussianBlur(.65)))
    layer.alpha_composite(plate,(x0,yy-16))
    d=ImageDraw.Draw(layer)
    d.ellipse((x0+3,yy-17,x1-3,yy+19),outline=(171,83,37,255),width=6)
    d.ellipse((x0+4,yy-19,x1-4,yy+17),outline=(255,225,145,253),width=3)
    d.arc((x0+7,yy-12,x1-7,yy+11),start=5,end=178,fill=(255,248,211,230),width=3)
    d.arc((x0+5,yy-18,x1-5,yy+20),start=190,end=350,fill=(255,218,134,239),width=3)
    divisions=max(8,r*4+8)
    for j in range(divisions):
        xx=x0+int(w*(j+.5)/divisions)
        by=yy+17+int(4*math.sin(math.pi*(xx-x0)/w))
        rad=3 if r>2 else 2
        d.arc((xx-rad*2,by-rad,xx+rad*2,by+rad),0,180,fill=(255,230,153,235),width=2)
        if j%3==0:d.ellipse((xx-2,by+2,xx+2,by+6),fill=(246,151,90,234))
    cy2=yy+23;cx=x0+w//2
    d.ellipse((cx-14,cy2-12,cx+14,cy2+13),fill=(245,194,107,255),outline=(255,244,196,254),width=2)
    d.polygon([(cx,cy2-11),(cx+9,cy2-1),(cx,cy2+11),(cx-9,cy2-1)],fill=(228,58,130,250))
    d.polygon([(cx,cy2-8),(cx+5,cy2-1),(cx,cy2+6),(cx-5,cy2-1)],fill=(255,134,190,255))
    d.line((cx-4,cy2-4,cx-1,cy2-9),fill=(255,247,244,236),width=2)
    if r in (1,3,5):
        for ex in (x0+11,x1-11):
            ey=yy+4
            d.ellipse((ex-23,ey-10,ex-2,ey+12),fill=(238,110,164,222),outline=(253,213,195,248),width=2)
            d.ellipse((ex+2,ey-10,ex+23,ey+12),fill=(245,140,174,222),outline=(255,215,213,248),width=2)
            d.ellipse((ex-6,ey-6,ex+6,ey+8),fill=(255,213,132,250))
            d.polygon([(ex-2,ey+7),(ex-13,ey+30),(ex+2,ey+20)],fill=(235,89,154,201))
            d.polygon([(ex+3,ey+6),(ex+13,ey+27),(ex+2,ey+18)],fill=(247,124,174,201))
    stand.alpha_composite(layer)

spark=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(spark)
for r,w in enumerate(widths):
    yy=int(110+r*136+[0,0,1,1,2,2][r]+116)
    for j in range(5):
        xx=int(792-w*.45+w*(j+.3)/5)
        sy=yy+int(math.sin(j*2.3+r)*6)
        sz=2+(j+r)%3
        d.line((xx-sz,sy,xx+sz,sy),fill=(255,251,219,195),width=2)
        d.line((xx,sy-sz,xx,sy+sz),fill=(255,251,219,170),width=2)
stand.alpha_composite(spark)
target=root/'assets/winery-afternoon-stand-v63.webp'
stand.save(target,'WEBP',quality=91,method=6)
assert stand.size==(1672,941)
assert target.stat().st_size>50000
assert stand.getbbox() is not None
print('TEA_STAND_ONLY_OK',target.stat().st_size)
