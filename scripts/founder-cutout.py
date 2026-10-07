#!/usr/bin/env python3
"""Founder portrait cut-out: art/source/founder-source.jpg (the grey-white checkerboard is part of the JPG) →
public/art/dr-john-muhammadi-telning-founder.webp and .png (transparent, no checkerboard pixel left, the chest text kept).
Pure Pillow. Background = neutral light pixels (the two checker tones and their anti-aliased seams) reachable from the
picture border; the edge ring gets an alpha from its distance to the local background tone and is un-blended.
Run: python3 scripts/founder-cutout.py"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art/source/founder-source.jpg'
OUT = ROOT / 'public/art'
OUT.mkdir(parents=True, exist_ok=True)

img = Image.open(SRC).convert('RGB')
W, H = img.size
px = img.load()

def is_bg(c):
    """A checkerboard pixel: neutral grey/white, light (the two tones are ~204 and ~255, seams in between)."""
    r, g, b = c
    return max(r, g, b) - min(r, g, b) <= 16 and min(r, g, b) >= 176

# 1. flood fill the background from the border
bg = bytearray(W * H)
q = deque()
def seed(x, y):
    i = y * W + x
    if not bg[i] and is_bg(px[x, y]): bg[i] = 1; q.append((x, y))
for x in range(W): seed(x, 0); seed(x, H - 1)
for y in range(H): seed(0, y); seed(W - 1, y)
while q:
    x, y = q.popleft()
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
        if 0 <= nx < W and 0 <= ny < H:
            i = ny * W + nx
            if not bg[i] and is_bg(px[nx, ny]): bg[i] = 1; q.append((nx, ny))

# 2. figure = biggest non-background component (drops stray specks in the checkerboard)
label = bytearray(W * H)
best, best_n = [], 0
for sy in range(H):
    for sx in range(W):
        i0 = sy * W + sx
        if bg[i0] or label[i0]: continue
        members = []; q.append((sx, sy)); label[i0] = 1
        while q:
            x, y = q.popleft(); members.append((x, y))
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < W and 0 <= ny < H:
                    i = ny * W + nx
                    if not bg[i] and not label[i]: label[i] = 1; q.append((nx, ny))
        if len(members) > best_n: best, best_n = members, len(members)
print(f'figure: {best_n} px')

mask = Image.new('L', (W, H), 0); mp = mask.load()
for x, y in best: mp[x, y] = 255
inner = mask.filter(ImageFilter.MinFilter(5)); ip = inner.load()

# 3. local background tone: mean of the background pixels around (x, y), for the edge ring
def local_bg(x, y):
    acc = [0, 0, 0]; n = 0
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and bg[ny * W + nx]:
                c = px[nx, ny]; acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; n += 1
    if not n: return (230, 230, 230)
    return (acc[0] / n, acc[1] / n, acc[2] / n)

out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); op = out.load()
for x, y in best:
    r, g, b = px[x, y]
    if ip[x, y]:
        op[x, y] = (r, g, b, 255); continue
    br, bgc, bb = local_bg(x, y)
    d = max(abs(r - br), abs(g - bgc), abs(b - bb))
    a = max(0, min(255, int(d * 255 / 90)))
    if a < 10: continue
    f = a / 255
    un = lambda c, bc: max(0, min(255, int((c - (1 - f) * bc) / f)))
    op[x, y] = (un(r, br), un(g, bgc), un(b, bb), a)

# 4. crop: just above the hair to the bottom of the picture (the arms run off the frame; the page covers the cut)
bbox = out.getbbox()
box = (max(0, bbox[0] - 8), max(0, bbox[1] - 10), min(W, bbox[2] + 8), H)
out = out.crop(box)
print('crop', box, '→', out.size)
# no checkerboard pixel may stay: count opaque neutral-light pixels along the outer edge ring
ring = 0
o2 = out.load(); w2, h2 = out.size
for y in range(h2):
    for x in range(w2):
        c = o2[x, y]
        if c[3] > 200 and is_bg(c[:3]) and (x < 3 or y < 3 or x > w2 - 4): ring += 1
print('checker-like opaque pixels on the outer edge:', ring)
out.save(OUT / 'dr-john-muhammadi-telning-founder.png', optimize=True)
small = out.resize((640, int(out.height * 640 / out.width)), Image.LANCZOS) if out.width > 640 else out
small.save(OUT / 'dr-john-muhammadi-telning-founder.webp', quality=82, method=6)
for f in ('dr-john-muhammadi-telning-founder.png', 'dr-john-muhammadi-telning-founder.webp'):
    print(f, (OUT / f).stat().st_size // 1024, 'KB', Image.open(OUT / f).size)
