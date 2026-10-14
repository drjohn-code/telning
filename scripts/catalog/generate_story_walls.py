#!/usr/bin/env python3
"""Telning Story Walls with Google AI Studio (same key and model as generate_mockups.py).

One design per series. For each series it makes (prompts in story-walls.json):
  1. line    the 5-7 picture as black lines only: landscape, packed shapes, edge to edge     (paid, 4K)
  2. art     the print picture: the same lines with about 1 in 3 objects in flat colour     (paid, 4K)
  3. colour  the same picture coloured in, as if finished by a family (for the wall photo) (paid)
  4. derive  the sheet files for both ages, no cost: 5-7 is the picture cropped to the
             sheet (100 x 70 cm + 3 mm bleed); 3-5 is the same design with every shape
             20% bigger (enlarged 1.2, cropped to the same sheet)
  5. photos  two realistic photos per age: 'progress' (on the floor, colouring together,
             from above) and 'wall' (finished and framed)                                (paid)
Files: assets/telning-products/_story-walls/<series>/ (masters, git-ignored) and
public/products/story-wall/<series>/<series>-<age>-<view>.webp (photos).
Then: node scripts/shop/import-story-walls.mjs

Try one:   python3 scripts/catalog/generate_story_walls.py --series paws-claws
Everything: python3 scripts/catalog/generate_story_walls.py --workers 4   (12 line, 12 art, 12 colour, 48 photos)
Existing files are skipped; use --force to redo them.
"""
import argparse
import io
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_mockups as gm  # noqa: E402  (key, client, retries and saving are shared)

ROOT = gm.ROOT
CONFIG = Path(__file__).with_name("story-walls.json")
MASTERS = ROOT / "assets" / "telning-products" / "_story-walls"
PUBLIC = ROOT / "public" / "products" / "story-wall"
AGES = ("3-5", "5-7")


def paths(key):
    m = MASTERS / key
    return {
        "line": m / f"{key}-line-raw.png", "art": m / f"{key}-art-raw.png", "colour": m / f"{key}-colour-raw.png",
        "print": {a: m / f"{key}-{a}-print.png" for a in AGES},
        "painted": {a: m / f"{key}-{a}-colour.png" for a in AGES},
        "photo": lambda a, v: PUBLIC / key / f"{key}-{a}-{v}.webp",
    }


def derive(cfg, key):
    """Both ages from one picture: 5-7 = cropped to the sheet; 3-5 = every shape 20% bigger."""
    Image = gm.need_pillow()
    p = paths(key)
    sw, sh = cfg["sheet_mm"]
    grow = cfg["grow_3_5"]
    for src, outs in ((p["art"], p["print"]), (p["colour"], p["painted"])):
        if not src.exists():
            continue
        im = Image.open(src).convert("RGB")
        base = gm.fit_print(im, [sw, sh])                  # 5-7: the sheet, centred
        W, H = base.size
        cw, ch = round(W / grow), round(H / grow)          # 3-5: the middle of it, enlarged back to the sheet
        x, y = (W - cw) // 2, (H - ch) // 2
        small = base.crop((x, y, x + cw, y + ch)).resize((W, H), Image.LANCZOS)
        outs["5-7"].parent.mkdir(parents=True, exist_ok=True)
        base.save(outs["5-7"], "PNG")
        small.save(outs["3-5"], "PNG")
    return p


def as_part(types, path, max_side=3072):
    """Send a smaller JPEG of a big master as the reference picture."""
    Image = gm.need_pillow()
    im = Image.open(path).convert("RGB")
    im.thumbnail((max_side, max_side))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=92)
    return types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg")


def jobs_for(cfg, keys, stages, ages):
    out = []
    for key in keys:
        p = paths(key)
        if "line" in stages:
            out.append({"stage": "line", "id": f"{key}-line", "out": p["line"], "inputs": [], "ratio": cfg["art_ratio"], "size": cfg.get("art_size"),
                        "prompt": cfg["line_template"].format(style=cfg["style"], subject=cfg["series"][key])})
        if "art" in stages:
            out.append({"stage": "art", "id": f"{key}-art", "out": p["art"], "inputs": [p["line"]], "ratio": cfg["art_ratio"], "size": cfg.get("art_size"),
                        "prompt": cfg["guide_prompt"].format(palette=cfg["palette"])})
        if "colour" in stages:
            out.append({"stage": "colour", "id": f"{key}-colour", "out": p["colour"], "inputs": [p["art"]], "ratio": cfg["art_ratio"], "size": None,
                        "prompt": cfg["colour_prompt"]})
        if "photos" in stages:
            for a in ages:
                for view, v in cfg["photos"].items():
                    src = p["print"][a] if v["input"] == "print" else p["painted"][a]
                    out.append({"stage": "photos", "id": f"{key}-{a}-{view}", "out": p["photo"](a, view), "inputs": [src], "ratio": "1:1", "size": None,
                                "prompt": f'{v["scene"]} {cfg["photo_tail"]}'})
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description="Generate Telning Story Walls with Google AI Studio.")
    ap.add_argument("--series", type=lambda s: s.split(","), help="comma list, e.g. paws-claws,home-hearts")
    ap.add_argument("--config", default=str(CONFIG), help="another prompts file, for style tests")
    ap.add_argument("--masters-dir", help="write masters here instead (style tests)")
    ap.add_argument("--public-dir", help="write photos here instead (style tests)")
    ap.add_argument("--stage", choices=["line", "art", "colour", "derive", "photos", "all"], default="all")
    ap.add_argument("--ages", type=lambda s: s.split(","), default=list(AGES))
    ap.add_argument("--model", default=gm.DEFAULT_MODEL)
    ap.add_argument("--size", choices=["1K", "2K", "4K"], default=gm.DEFAULT_SIZE, help="photos and colour (art uses art_size)")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    global MASTERS, PUBLIC
    if args.masters_dir: MASTERS = Path(args.masters_dir).resolve()
    if args.public_dir: PUBLIC = Path(args.public_dir).resolve()
    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    keys = args.series or list(cfg["series"])
    bad = [k for k in keys if k not in cfg["series"]]
    if bad:
        sys.exit(f"Unknown series: {', '.join(bad)}. Choices: {', '.join(cfg['series'])}")
    order = ["line", "art", "colour", "derive", "photos"]
    stages = order if args.stage == "all" else [args.stage]
    jobs = jobs_for(cfg, keys, stages, args.ages)
    todo = [j for j in jobs if args.force or not j["out"].exists()]
    print(f"{len(jobs)} paid images in this plan, {len(todo)} to make (model {args.model}).")
    if args.dry_run:
        for j in jobs:
            print(f"  [{'make' if j in todo else 'exists':<6}] {j['stage']:<7} {j['id']:<28} -> {j['out']}")
        return 0
    key = gm.get_key() if todo else None
    client = gm.make_client(key) if todo else None
    if todo:
        from google.genai import types
    made, failed, stop = [], [], []

    def one(j):
        if stop:
            return
        missing = [x for x in j["inputs"] if not x.exists()]
        if missing:
            print(f"SKIP   {j['id']}: needs {missing[0].name} first", flush=True); failed.append(j["id"]); return
        contents = [as_part(types, x) for x in j["inputs"]] + [j["prompt"]]
        t = time.time()
        try:
            data, _ = gm.generate(client, types, key, args.model, contents, j["ratio"], j["size"] or args.size)
            w, h = gm.save_image(data, j["out"])
        except gm.BillingError as exc:
            stop.append(str(exc)); return
        except (ValueError, RuntimeError) as exc:
            print(f"FAILED {j['id']}: {exc}", flush=True); failed.append(j["id"]); return
        made.append(j["id"])
        print(f"made   {j['id']}  {w}x{h}  {time.time() - t:.0f}s", flush=True)

    for stage in order:
        if stage not in stages or stop:
            continue
        if stage == "derive":
            for k in keys:
                derive(cfg, k)
            print(f"derived the 3-5 and 5-7 sheets for {len(keys)} series", flush=True)
            continue
        batch = [j for j in todo if j["stage"] == stage]
        if batch:
            with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
                list(pool.map(one, batch))
        if stage == "colour" and "photos" in stages and "derive" not in stages:
            for k in keys:
                derive(cfg, k)
    if stop:
        print(f"\nSTOP: {stop[0][:300]}\n(no credits left, or the daily limit is used up)\n{len(made)} made before stopping.")
        return 2
    print(f"\n{len(made)} made, {len(failed)} failed.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
