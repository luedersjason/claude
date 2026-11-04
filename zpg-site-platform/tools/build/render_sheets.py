#!/usr/bin/env python3
"""Render PDF pages to viewer sheet images + a manifest the site can embed.

Usage: python3 render_sheets.py spec.json out_dir
spec.json = [{"id":"EQ-VAS","title":"Equipment layout","pdf":"/path/file.pdf","page":1,"label":"Layout"}, ...]
Writes out_dir/<id>.jpg (3000 px wide, JPEG q68) and out_dir/manifest.json:
[{"id","t","img":"sheets/<id>.jpg","W":2016,"H":<2016*ph/pw>,"pw","ph","x":1,"lab"}]
Needs poppler (pdftoppm) and Pillow.
"""
import json, os, subprocess, sys
from PIL import Image
spec = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
man = []
for s in spec:
    base = os.path.join(out, s["id"])
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=68", "-scale-to-x", "2000", "-scale-to-y", "-1",
                    "-f", str(s["page"]), "-l", str(s["page"]), "-singlefile", s["pdf"], base], check=False)
    if not os.path.exists(base + ".jpg"):
        print("FAILED", s["id"]); continue
    im = Image.open(base + ".jpg")
    if im.size[0] != 2000:  # rotated pages: pdftoppm scales before rotating
        im = im.resize((2000, round(im.size[1] * 2000 / im.size[0])), Image.LANCZOS); im.save(base + ".jpg", quality=68)
    pw, ph = im.size
    man.append({"id": s["id"], "t": s["title"], "img": "sheets/%s.jpg" % s["id"],
                "W": 2016, "H": round(2016 * ph / pw), "pw": pw, "ph": ph, "x": 1, "lab": s.get("label", s["id"])})
json.dump(man, open(os.path.join(out, "manifest.json"), "w"), separators=(",", ":"))
print(len(man), "sheets written")
