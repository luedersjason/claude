"""excerpt.py PDF PAGE OUT.png "phrase1" ["phrase2"...] [--box x0,y0,x1,y1 in pt] [--ctx PT]
Renders the page, highlights each phrase (or box), crops a wide window of context around all highlights."""
import sys, subprocess, re, tempfile, os, html
from PIL import Image, ImageDraw
a=sys.argv[1:]; pdf,page,out=a[0],int(a[1]),a[2]; rest=a[3:]
boxes=[];phr=[];ctx=150;dpi=130
i=0
while i<len(rest):
    if rest[i]=='--box': boxes.append(tuple(map(float,rest[i+1].split(',')))); i+=2
    elif rest[i]=='--ctx': ctx=float(rest[i+1]); i+=2
    else: phr.append(rest[i]); i+=1
x=subprocess.run(['pdftotext','-f',str(page),'-l',str(page),'-bbox',pdf,'-'],capture_output=True,text=True).stdout
pw,ph=map(float,re.search(r'<page width="([\d.]+)" height="([\d.]+)"',x).groups())
W=[(html.unescape(m[4]),*map(float,m[:4])) for m in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>',x)]
norm=lambda s:re.sub(r'[^a-z0-9]','',s.lower())
W=[w for w in W if norm(w[0])]
for p in phr:
    t=[norm(w) for w in p.split() if norm(w)]; found=False
    for s in range(len(W)):
        if all(s+k<len(W) and norm(W[s+k][0])==t[k] for k in range(len(t))):
            ws=W[s:s+len(t)]
            # split into line boxes
            lines={}
            for w in ws: lines.setdefault(round(w[2]/4),[]).append(w)
            for L in lines.values(): boxes.append((min(w[1] for w in L),min(w[2] for w in L),max(w[3] for w in L),max(w[4] for w in L)))
            found=True; break
    if not found: sys.exit('NOT FOUND: '+p)
d=tempfile.mkdtemp(); subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-r',str(dpi),'-png','-singlefile',pdf,d+'/p'],check=True)
im=Image.open(d+'/p.png').convert('RGB'); sx=im.width/pw; sy=im.height/ph
ov=Image.new('RGBA',im.size,(0,0,0,0)); dr=ImageDraw.Draw(ov)
for b in boxes:
    dr.rectangle([b[0]*sx-3,b[1]*sy-3,b[2]*sx+3,b[3]*sy+3],fill=(255,214,0,90),outline=(230,120,0,255),width=3)
im=Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB')
x0=max(0,min(b[0] for b in boxes)-ctx); x1=min(pw,max(b[2] for b in boxes)+ctx)
y0=max(0,min(b[1] for b in boxes)-ctx); y1=min(ph,max(b[3] for b in boxes)+ctx)
if x1-x0<pw*0.8: x0,x1=0,pw   # keep full width for readability
im=im.crop((int(x0*sx),int(y0*sy),int(x1*sx),int(y1*sy)))
if im.width>1400: im=im.resize((1400,int(im.height*1400/im.width)))
im.save(out,optimize=True); print(out,im.size,len(boxes),'highlights')
