#!/usr/bin/env python3
"""Pim in the site's flat paper style, traced from art/source/pim-source.jpg. The character stays the same:
a small hedgehog-like creature, sandy cream body with white sparkles, a spiky cream head outline with soft green
leaf spines between the spikes, three glowing gold stars on the head, one blue eye open and one winking, rosy
cheeks, a small smile, sitting, facing front.
Writes art/pim/pim-full.svg (sitting), pim-portrait.svg (head and shoulders), pim-peek.svg (peeking over an edge).
Colours are token hex values (the sandy body is cream with a gold-light tint); Pim.astro turns them into CSS
variables. Run: python3 scripts/pim-svg.py"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'art/pim'
OUT.mkdir(parents=True, exist_ok=True)

C = dict(cream='#FFFDF8', white='#FFFFFF', paperdeep='#E9DFCF', ink='#16140F', inksoft='#4A453D',
         moss='#86A672', forest='#1E4A3B', forestlight='#3D6E58', gold='#E8B23A', golddeep='#B8841A', goldlight='#F6D27E',
         blush='#F3C9B8', rose='#E59A82', sky='#B9D3EC', sea='#4F7FAE')
TINT = .36          # gold-light over cream, then a little blush = Pim's sandy peach body
BLUSH = .2
SHADE = .32         # a gold-light crescent = the shaded side

HX, HY, HRX, HRY = 120, 124, 64, 56      # head ellipse
BX, BY, BRX, BRY = 120, 208, 60, 50      # body ellipse

def sand(shape_svg):
    """Draw a shape in cream, then tint it gold-light: the sandy body tone, from tokens only."""
    return (shape_svg.replace('FILL', C['cream'])
            + shape_svg.replace('FILL', C['goldlight']).replace('/>', f' opacity="{TINT}"/>', 1)
            + shape_svg.replace('FILL', C['blush']).replace('/>', f' opacity="{BLUSH}"/>', 1))

def on_ellipse(cx, cy, rx, ry, ang, k=1.0):
    """Point at `ang` degrees from straight up on an ellipse scaled by k."""
    r = math.radians(ang)
    return cx + rx * k * math.sin(r), cy - ry * k * math.cos(r)

def spike(cx, cy, rx, ry, ang, tip_k, base_k=0.72, half=17):
    """A pointed cream spike: base inside the ellipse, tip outside, rounded with a same-colour stroke."""
    tx, ty = on_ellipse(cx, cy, rx, ry, ang, tip_k)
    bx, by = on_ellipse(cx, cy, rx, ry, ang, base_k)
    r = math.radians(ang)
    px, py = math.cos(r) * half, math.sin(r) * half       # perpendicular to the spike direction
    d = f'M{bx-px:.1f} {by-py:.1f} L{tx:.1f} {ty:.1f} L{bx+px:.1f} {by+py:.1f} Z'
    return sand(f'<path d="{d}" fill="FILL" stroke="FILL" stroke-width="7" stroke-linejoin="round"/>')

def leaf(x, y, angle, length, width):
    w, L = width, length
    d = f'M0 0 C {w} {-L*0.3}, {w} {-L*0.72}, 0 {-L} C {-w} {-L*0.72}, {-w} {-L*0.3}, 0 0 Z'
    shade = f'M0 0 C {w} {-L*0.3}, {w} {-L*0.72}, 0 {-L} C {w*0.3} {-L*0.72}, {w*0.3} {-L*0.3}, 0 0 Z'
    return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({angle})">'
            f'<path d="{d}" fill="{C["moss"]}"/><path d="{shade}" fill="{C["forest"]}" opacity=".5"/>'
            f'<path d="M0 -3 L0 {-L*0.78:.1f}" stroke="{C["forestlight"]}" stroke-width="1.8" stroke-linecap="round" opacity=".8"/></g>')

def leaf_at(cx, cy, rx, ry, ang, base_k, length, width):
    x, y = on_ellipse(cx, cy, rx, ry, ang, base_k)
    return leaf(x, y, ang, length, width)

def star(cx, cy, r):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.47
        pts.append(f'{cx + rr*math.cos(a):.1f} {cy + rr*math.sin(a):.1f}')
    poly = 'M' + ' L'.join(pts) + ' Z'
    cid = f'pim-h{int(cx)}-{int(cy)}'
    return (f'<g class="pim-star"><circle cx="{cx}" cy="{cy}" r="{r*1.55:.1f}" fill="{C["goldlight"]}" opacity=".42"/>'
            f'<path d="{poly}" fill="{C["gold"]}" stroke="{C["gold"]}" stroke-width="2" stroke-linejoin="round"/>'
            f'<clipPath id="{cid}"><rect x="{cx}" y="{cy-r-3}" width="{r+3}" height="{2*r+6}"/></clipPath>'
            f'<path d="{poly}" fill="{C["golddeep"]}" opacity=".45" clip-path="url(#{cid})"/>'
            f'<circle cx="{cx - r*0.28:.1f}" cy="{cy - r*0.3:.1f}" r="{r*0.17:.1f}" fill="{C["goldlight"]}"/></g>')

def sparkle(x, y, s, op=0.95):
    return (f'<path d="M{x} {y-s} Q{x+s*0.16} {y-s*0.16} {x+s} {y} Q{x+s*0.16} {y+s*0.16} {x} {y+s} '
            f'Q{x-s*0.16} {y+s*0.16} {x-s} {y} Q{x-s*0.16} {y-s*0.16} {x} {y-s} Z" fill="{C["white"]}" opacity="{op}"/>')

# ---- parts ----
HEAD_SPIKES = [(0, 1.42), (-24, 1.34), (24, 1.34), (-56, 1.3), (56, 1.3), (-88, 1.28), (88, 1.28), (-116, 1.22), (116, 1.22)]
HEAD_LEAVES = [(-12, 30, 7), (12, 30, 7), (-40, 46, 13), (40, 46, 13), (-72, 48, 14), (72, 48, 14),
               (-102, 46, 13), (102, 46, 13), (-130, 44, 12), (130, 44, 12)]
BODY_LEAVES = [(-78, 40, 11), (-100, 42, 12), (-122, 40, 11), (78, 40, 11), (100, 42, 12), (122, 40, 11)]

def head_leaves():
    return ''.join(leaf_at(HX, HY, HRX, HRY, a, 0.78, L, w) for a, L, w in HEAD_LEAVES)

def body_leaves():
    return ''.join(leaf_at(BX, BY, BRX, BRY, a, 0.8, L, w) for a, L, w in BODY_LEAVES)

def head():
    out = ''.join(spike(HX, HY, HRX, HRY, a, k) for a, k in HEAD_SPIKES)
    out += sand(f'<ellipse cx="{HX}" cy="{HY}" rx="{HRX}" ry="{HRY}" fill="FILL"/>')
    out += (f'<path d="M{HX-HRX} {HY} a{HRX} {HRY} 0 0 0 {2*HRX} 0 a{HRX+4} {HRY-14} 0 0 1 -{2*HRX} 0z" fill="{C["goldlight"]}" opacity="{SHADE}"/>')
    # ears
    out += sand('<circle cx="62" cy="92" r="13" fill="FILL"/>') + f'<circle cx="62" cy="92" r="7" fill="{C["sky"]}"/>'
    out += sand('<circle cx="178" cy="92" r="13" fill="FILL"/>') + f'<circle cx="178" cy="92" r="7" fill="{C["sky"]}"/>'
    return out

def face():
    return (
        # brows
        f'<path d="M84 106 q10 -7 20 -3" stroke="{C["ink"]}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".75"/>'
        f'<path d="M136 103 q10 -4 20 3" stroke="{C["ink"]}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".75"/>'
        # open eye (viewer's left)
        f'<ellipse cx="97" cy="124" rx="10.5" ry="11.5" fill="{C["white"]}"/>'
        f'<circle cx="98" cy="125" r="7.6" fill="{C["sea"]}"/><circle cx="98.5" cy="125.5" r="4.2" fill="{C["ink"]}"/>'
        f'<circle cx="94.8" cy="121" r="2.3" fill="{C["white"]}"/>'
        # winking eye (viewer's right)
        f'<path d="M136 122 Q148 111 160 122" stroke="{C["ink"]}" stroke-width="3.4" fill="none" stroke-linecap="round"/>'
        # nose and smile
        f'<ellipse cx="121" cy="139" rx="4.4" ry="3.2" fill="{C["ink"]}"/>'
        f'<path d="M111 147 Q121 156 131 147" stroke="{C["ink"]}" stroke-width="2.8" fill="none" stroke-linecap="round"/>'
        # cheeks
        f'<ellipse cx="80" cy="143" rx="11" ry="6.5" fill="{C["blush"]}"/><ellipse cx="162" cy="143" rx="11" ry="6.5" fill="{C["blush"]}"/>')

def stars():
    t0 = on_ellipse(HX, HY, HRX, HRY, 0, 1.42); tl = on_ellipse(HX, HY, HRX, HRY, -24, 1.34); tr = on_ellipse(HX, HY, HRX, HRY, 24, 1.34)
    return star(round(t0[0]), round(t0[1]) - 4, 15) + star(round(tl[0]), round(tl[1]) - 3, 10.5) + star(round(tr[0]), round(tr[1]) - 3, 10.5)

def head_sparkles():
    return sparkle(72, 118, 4.5) + sparkle(152, 104, 3.6) + sparkle(106, 96, 3) + sparkle(166, 136, 2.8) + sparkle(120, 164, 2.6)

def body(with_limbs=True):
    out = sand(f'<ellipse cx="{BX}" cy="{BY}" rx="{BRX}" ry="{BRY}" fill="FILL"/>')
    out += f'<path d="M{BX-BRX} {BY} a{BRX} {BRY} 0 0 0 {2*BRX} 0 a{BRX+4} {BRY-14} 0 0 1 -{2*BRX} 0z" fill="{C["goldlight"]}" opacity="{SHADE}"/>'
    out += f'<ellipse cx="{BX}" cy="{BY+8}" rx="32" ry="32" fill="{C["cream"]}" opacity=".5"/>'
    if with_limbs:
        # arms: viewer's left raised in a small wave, right resting on the body
        out += sand('<ellipse cx="54" cy="180" rx="13" ry="30" transform="rotate(48 54 180)" fill="FILL"/>')
        out += sand('<ellipse cx="182" cy="204" rx="12" ry="26" transform="rotate(-14 182 204)" fill="FILL"/>')
        # feet, turned a little outward, with soft pads
        out += sand('<ellipse cx="82" cy="252" rx="26" ry="16" transform="rotate(-10 82 252)" fill="FILL"/>')
        out += sand('<ellipse cx="158" cy="252" rx="26" ry="16" transform="rotate(10 158 252)" fill="FILL"/>')
        for cx in (82, 158):
            s = -1 if cx < 120 else 1
            out += f'<ellipse cx="{cx}" cy="256" rx="13" ry="8" fill="{C["blush"]}"/>'
            out += ''.join(f'<circle cx="{cx + dx*s:.0f}" cy="{247 + dy}" r="2.8" fill="{C["blush"]}"/>' for dx, dy in ((-9, 1), (0, -2), (9, 1)))
    out += sparkle(100, 198, 3.8) + sparkle(142, 234, 3.2) + sparkle(78, 228, 2.8) + sparkle(150, 206, 2.4)
    return out

def shadow():
    return f'<ellipse class="pim-shadow" cx="120" cy="268" rx="80" ry="9" fill="{C["paperdeep"]}" opacity=".9"/>'

def svg(viewbox, inner, w, h):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{w}" height="{h}">\n{inner}\n</svg>\n'

full = shadow() + body_leaves() + head_leaves() + body() + head() + face() + stars() + head_sparkles()
(OUT / 'pim-full.svg').write_text(svg('0 0 240 280', full, 240, 280))

# portrait: head and shoulders (used as the round PimNote avatar)
portrait = head_leaves() + body(with_limbs=False) + head() + face() + stars() + head_sparkles()
(OUT / 'pim-portrait.svg').write_text(svg('20 22 200 200', portrait, 200, 200))

# peek: Pim looks over an edge with two paws on it (the 404 signpost goes in front of the lower part)
paws = ('<g class="pim-paws">' + sand('<ellipse cx="74" cy="178" rx="18" ry="11" fill="FILL"/>') + sand('<ellipse cx="166" cy="178" rx="18" ry="11" fill="FILL"/>')
        + ''.join(f'<circle cx="{x}" cy="183" r="2.6" fill="{C["blush"]}"/>' for x in (66, 74, 82, 158, 166, 174)) + '</g>')
peek = head_leaves() + head() + face() + stars() + head_sparkles() + paws
(OUT / 'pim-peek.svg').write_text(svg('20 24 200 168', peek, 200, 168))
for f in ('pim-full.svg', 'pim-portrait.svg', 'pim-peek.svg'):
    print(f, (OUT / f).stat().st_size, 'bytes')
