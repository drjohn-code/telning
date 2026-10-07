#!/usr/bin/env python3
"""Pim master cut-out: art/source/pim-source.jpg (white background, painted shadow) →
public/art/pim-telning-character.png and .webp (transparent, no shadow, clean edges, cropped).
Pure Pillow, no numpy. Run: python3 scripts/pim-cutout.py"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art/source/pim-source.jpg'
OUT_DIR = ROOT / 'public/art'
OUT_DIR.mkdir(parents=True, exist_ok=True)

img = Image.open(SRC).convert('RGB')
W, H = img.size
px = img.load()

WHITE = 232   # a pixel whose channels are all above this is "background white"
def is_white(c): return c[0] > WHITE and c[1] > WHITE and c[2] > WHITE

# 1. Background: everything reachable from the picture border through white pixels.
bg = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if is_white(px[x, y]) and not bg[y * W + x]: bg[y * W + x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if is_white(px[x, y]) and not bg[y * W + x]: bg[y * W + x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= nx < W and 0 <= ny < H:
            i = ny * W + nx
            if not bg[i] and is_white(px[nx, ny]): bg[i] = 1; q.append((nx, ny))

# 2. Foreground components: keep the biggest (Pim); the painted shadow is a separate, smaller blob.
label = bytearray(W * H)   # 0 = unvisited
best, best_n = None, 0
comp_id = 0
for sy in range(H):
    for sx in range(W):
        i0 = sy * W + sx
        if bg[i0] or label[i0]: continue
        comp_id += 1
        members = []
        q.append((sx, sy)); label[i0] = 1
        while q:
            x, y = q.popleft(); members.append((x, y))
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < W and 0 <= ny < H:
                    i = ny * W + nx
                    if not bg[i] and not label[i]: label[i] = 1; q.append((nx, ny))
        if len(members) > best_n: best, best_n = members, len(members)
print(f'components: {comp_id}; Pim has {best_n} px')

mask = Image.new('L', (W, H), 0)
mp = mask.load()
for x, y in best: mp[x, y] = 255

# 3. Soft edge: inside a 3 px ring at the border, alpha comes from how far the pixel is from white
#    (the JPG blended Pim's edge with the white background), and the colour is un-blended.
inner = mask.filter(ImageFilter.MinFilter(7))
ip = inner.load()
out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
op = out.load()
for x, y in best:
    r, g, b = px[x, y]
    if ip[x, y]:
        op[x, y] = (r, g, b, 255)
    else:
        m = min(r, g, b)
        a = max(0, min(255, int((255 - m) * 255 / 70)))
        if a < 8: continue
        f = a / 255
        r2 = max(0, min(255, int((r - (1 - f) * 255) / f)))
        g2 = max(0, min(255, int((g - (1 - f) * 255) / f)))
        b2 = max(0, min(255, int((b - (1 - f) * 255) / f)))
        op[x, y] = (r2, g2, b2, a)

# 4. Crop with a small margin and save.
bbox = out.getbbox()
pad = 12
box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(W, bbox[2] + pad), min(H, bbox[3] + pad))
out = out.crop(box)
print('crop', box, '→', out.size)
out.save(OUT_DIR / 'pim-telning-character.png', optimize=True)
out.save(OUT_DIR / 'pim-telning-character.webp', quality=90, method=6)
# 5. Portrait crop (head and shoulders) for the round avatar when the raster version is used.
pw, ph = out.size
por = out.crop((int(pw * 0.08), 0, int(pw * 0.92), int(ph * 0.62)))
por.save(OUT_DIR / 'pim-telning-portrait.png', optimize=True)
por.save(OUT_DIR / 'pim-telning-portrait.webp', quality=90, method=6)
for f in ('pim-telning-character.png', 'pim-telning-character.webp', 'pim-telning-portrait.png', 'pim-telning-portrait.webp'):
    print(f, (OUT_DIR / f).stat().st_size // 1024, 'KB')
