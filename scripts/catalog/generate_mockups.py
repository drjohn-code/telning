#!/usr/bin/env python3
"""Telning gift mockups with Google AI Studio (google-genai).

Every product has its own four designs (Halloween: one cat, one dog, many cats,
many dogs). Theme `winter` (Christmas and New Year, 15 Oct 2026) has postcards and
greeting cards only, in its own style: --theme winter. Tote bags have eight: four on undyed and four on black cotton (product
`tote-black`), so 20 artworks; mugs are white 11 oz only. For each design it makes:
(three square photos per product since 14 Oct 2026: on the table, at home, in a hand)
  1. the artwork                              -> assets/telning-products/_art/...   (print master, git-ignored)
  2. a photo of that artwork on its product (mug, tote bag, postcard, greeting card)
                                              -> public/products/{product}/{theme}/{design}/...webp
and then once:
  3. one gift-set picture of four products together -> public/products/gift-set/{theme}/...webp

Step 2 sends the finished artwork to the model as a reference picture, so the
product shows exactly that drawing. Step 3 sends four product photos.
Nothing is printed on a product unless the design has `words` in prompts.json.
No book covers (paused).

Key: GOOGLE_API_KEY (or GEMINI_API_KEY) in .env.local at the repo root. The key
is never printed. .env.local is git-ignored.

Setup (once):   pip3 install --user google-genai Pillow
Free checks:    python3 scripts/catalog/generate_mockups.py --list-models
                python3 scripts/catalog/generate_mockups.py --dry-run
Try one image:  python3 scripts/catalog/generate_mockups.py --stage art --products mug --designs cat --limit 1
Everything:     python3 scripts/catalog/generate_mockups.py   (81 images: 20 art, 60 photos, 1 gift set)

Images are paid per image. Existing files are skipped; use --force to redo them.

Full-bleed print files (postcards, `full_bleed` in prompts.json, 15 Oct 2026): the art must cover the whole card.
A thin plain paper strip the model draws along an edge is cut off when the art is saved; a wide one (the drawing
sits small in the middle) prints a WARNING, and that art must be made again. The photo stage sends the card as
it is after cutting (`trim_mm`: print file minus the 4 mm bleed), so the photo shows what the buyer gets.
Fix old masters for free:  python3 scripts/catalog/generate_mockups.py --refit --products postcard [--dry-run]

Changing a picture John likes (16 Oct 2026): a design's `edit` text + --stage art --edit sends the existing master
and rewrites it (copy the old one to review/ first). Example: the small side plants on the plant mugs.

Matching photos (John, 16 Oct 2026: the print must look the same size and in the same place in all three photos):
--match table sends the table photo along with the art for the other views. Delete the views to redo, then e.g.
  python3 scripts/catalog/generate_mockups.py --theme everyday --stage mockups --products tote --designs dog --match table
"""
import argparse
import io
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = Path(__file__).with_name("prompts.json")
ENV_FILE = ROOT / ".env.local"
DEFAULT_PUBLIC = ROOT / "public" / "products"
DEFAULT_MASTERS = ROOT / "assets" / "telning-products"
DEFAULT_MODEL = "gemini-3-pro-image"
DEFAULT_SIZE = "2K"
WEBP_QUALITY = 90
RETRY_WAITS = (5, 15, 40)  # seconds, for rate limits and busy servers
PAPER_LIMIT = 0.06          # full-bleed art: a paper strip wider than 6% of a side means the art must be made again


class BillingError(RuntimeError):
    """The project has no credits (HTTP 402). Retrying will not help."""


# ---------------------------------------------------------------- key and config

def read_env_file(path):
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip("\"'")
    return values


def get_key():
    env = read_env_file(ENV_FILE)
    for name in ("GOOGLE_API_KEY", "GEMINI_API_KEY"):
        if env.get(name):
            return env[name]
        if os.environ.get(name):
            return os.environ[name]
    sys.exit(f"No API key. Add a line GOOGLE_API_KEY=... to {ENV_FILE}")


def scrub(text, key):
    return str(text).replace(key, "***") if key else str(text)


def load_config(path=CONFIG):
    with Path(path).open(encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- plan

MATCH_NOTE = (" The second attached image is another photo of this same product with this same print. Print the artwork at "
              "exactly the same size and in the same place on the product as in that photo: the same width, the same distance "
              "from the top and the bottom, the same margins. Only the scene and the camera change.")


EDIT_TEMPLATE = ("The attached image is the current artwork. {edit} Keep everything else exactly as it is: the same shapes, lines, "
                 "colours, texture, size and place, and the same plain background. Flat 2D artwork for printing. {no_text}")


def build_jobs(cfg, theme, stages, designs, products, public_dir, masters_dir, style=None, match=None, edit=False):
    look = cfg["styles"][style] if style else None   # --style: one older style for every product
    t = cfg["themes"].get(theme)
    if not t or not t.get("active"):
        sys.exit(f"Theme '{theme}' is not active. {(t or {}).get('note', '')}".strip())
    spec = cfg["designs"].get(theme)
    if not spec:
        sys.exit(f"No designs written for '{theme}' in prompts.json.")
    prods = products or [p for p in cfg["products"] if p in spec]   # a theme may have designs for some products only
    unknown = [p for p in prods if p not in spec]
    if unknown:
        sys.exit(f"Unknown product(s) for '{theme}': {', '.join(unknown)}. Choices: {', '.join(spec)}")
    every = list(dict.fromkeys(k for v in spec.values() for k in v))   # products may have different designs (everyday: 8 mugs, 4 + 4 totes)
    names = designs or every
    unknown = [d for d in names if d not in every]
    if unknown:
        sys.exit(f"Unknown design(s): {', '.join(unknown)}. Choices: {', '.join(every)}")

    def art_path(p, d):
        return masters_dir / "_art" / theme / p / d / f"{theme}-{d}-{p}.png"

    def mock_path(p, d, view):
        return public_dir / p / theme / d / f"{theme}-{d}-{p}-{view}.webp"

    jobs = []
    for p in prods:
        pr = {**cfg["products"][p], **t.get("products", {}).get(p, {})}   # a theme may set its own style, layout, background, views
        for d in names:
            if d not in spec[p]:
                continue
            design = spec[p][d]
            own = look or {**pr, **{k: design[k] for k in ("style", "layout", "art_background") if k in design}}   # product style, a design may override it
            if "art" in stages and edit:   # --edit: change the existing master with the design's `edit` instruction
                if design.get("edit"):
                    jobs.append({
                        "stage": "art", "id": f"{theme}-{d}-{p}-art", "label": f"edit artwork, {pr['label']}: {design['title']}",
                        "ratio": pr["art_ratio"], "inputs": [art_path(p, d)], "out": art_path(p, d), "print_mm": pr.get("print_mm"),
                        "full_bleed": pr.get("full_bleed", False), "edit": True,
                        "prompt": EDIT_TEMPLATE.format(edit=design["edit"], no_text=cfg["no_text"]),
                    })
            elif "art" in stages:
                words = design.get("words", "").strip()
                jobs.append({
                    "stage": "art", "id": f"{theme}-{d}-{p}-art", "label": f"artwork, {pr['label']}: {design['title']}",
                    "ratio": pr["art_ratio"], "inputs": [], "out": art_path(p, d), "print_mm": pr.get("print_mm"),
                    "full_bleed": pr.get("full_bleed", False),
                    "prompt": cfg["art_template"].format(
                        style=own.get("style", cfg["style"]), subject=design["subject"], no_text=cfg["no_text"],
                        layout=own.get("layout", "Centred on {background}.").format(
                            background=(pr.get("art_background") if p == "tote-black" else None) or own.get("art_background") or own.get("background") or "a plain warm cream paper background"),
                        extra=pr.get("art_extra", ""),
                        words=(f' The picture includes the words "{words}", drawn by hand in the same style.' if words else "")),
                })
            if "mockups" in stages:
                for view, v in pr["views"].items():   # three photos per product: table, home, hand
                    matched = bool(match and view != match and match in pr["views"])   # --match: copy the print size from that photo
                    jobs.append({
                        "stage": "mockups", "id": f"{theme}-{d}-{p}-{view}", "label": f"{pr['label']}, {view}: {design['title']}",
                        "ratio": pr.get("mockup_ratio", "1:1"), "out": mock_path(p, d, view), "matched": matched,
                        "inputs": [art_path(p, d)] + ([mock_path(p, d, match)] if matched else []),
                        "face": (pr["print_mm"], pr["trim_mm"]) if pr.get("trim_mm") else None,   # the photo shows the cut card, not the bleed
                        "prompt": cfg["mockup_template"].format(scene=v["scene"], place=pr["place"], mood=t.get("mood", "")) + (MATCH_NOTE if matched else ""),
                    })
    if "gift-set" in stages and t.get("gift_set", True):
        gs = cfg["gift_set"]
        jobs.append({
            "stage": "gift-set", "id": f"{theme}-gift-set", "label": "gift set: all four products",
            "ratio": gs["ratio"], "inputs": [mock_path(p, d, "table") for p, d in gs["uses"].items()],
            "out": public_dir / "gift-set" / theme / f"{theme}-gift-set.webp",
            "prompt": gs["scene"],
        })
    return jobs


def campaign_jobs(cfg, scenes=None):
    """Campaign pictures (John, 16 Oct 2026): one room scene per campaign page (/campaigns/<key>) with its real products:
    the Story Wall framed on the wall, the tote bag on a hook, the mug and the cards on a wooden table. The inputs are the
    Story Wall's colour art and the gifts' table photos (paths from the repo root, in prompts.json `campaign_scenes`)."""
    cs = {k: v for k, v in cfg.get("campaign_scenes", {}).items() if not k.startswith("_")}
    unknown = [k for k in (scenes or []) if k not in cs]
    if unknown:
        sys.exit(f"Unknown campaign scene(s): {', '.join(unknown)}. Choices: {', '.join(cs)}")
    return [{
        "stage": "campaign", "id": f"campaign-{k}", "label": f"campaign scene: {k}", "ratio": c["ratio"],
        "inputs": [ROOT / x for x in c["inputs"]],
        "out": DEFAULT_PUBLIC / "campaign" / f"{k}-campaign-scene.webp",
        "prompt": c["scene"] + " " + cfg["campaign_scenes"]["_rules"],
    } for k, c in cs.items() if not scenes or k in scenes]


# ---------------------------------------------------------------- Google AI Studio

def make_client(key):
    try:
        from google import genai
    except ImportError:
        sys.exit("google-genai is not installed. Run: pip3 install --user google-genai Pillow")
    return genai.Client(api_key=key)


def request_config(types, ratio, size):
    """Aspect ratio and size. Older SDKs have no image_size field; send it in the raw request body."""
    if not size:
        return types.GenerateContentConfig(
            response_modalities=["IMAGE"], image_config=types.ImageConfig(aspect_ratio=ratio))
    if "image_size" in types.ImageConfig.model_fields:
        return types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio=ratio, image_size=size))
    return types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(aspect_ratio=ratio),
        http_options=types.HttpOptions(extra_body={"generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": ratio, "imageSize": size}}}))


def extract_image(response):
    """Return (bytes, mime) of the first image in a response, or raise ValueError with the reason."""
    cands = getattr(response, "candidates", None) or []
    content = getattr(cands[0], "content", None) if cands else None
    texts = []
    for part in (getattr(content, "parts", None) or []):
        inline = getattr(part, "inline_data", None)
        if inline is not None and getattr(inline, "data", None):
            return inline.data, (getattr(inline, "mime_type", None) or "image/png")
        if getattr(part, "text", None):
            texts.append(part.text)
    reason = getattr(cands[0], "finish_reason", None) if cands else getattr(response, "prompt_feedback", None)
    raise ValueError(f"no image returned (reason: {reason}). {' '.join(texts)[:200]}".strip())


def is_billing_error(exc):
    text = str(exc).lower()
    return getattr(exc, "code", None) == 402 or "prepayment" in text or "credits are depleted" in text


def generate(client, types, key, model, contents, ratio, size):
    last = None
    for attempt in range(len(RETRY_WAITS) + 1):
        try:
            response = client.models.generate_content(
                model=model, contents=contents, config=request_config(types, ratio, size))
            return extract_image(response)
        except ValueError:
            raise
        except Exception as exc:  # SDK raises ClientError / ServerError
            if is_billing_error(exc):
                raise BillingError(scrub(exc, key))
            code = getattr(exc, "code", None)
            if code == 429 and "perday" in str(exc).lower().replace("_", ""):
                raise BillingError("the daily image limit for this model is used up; it resets about 24 hours after the first image of the day")
            last = exc
            if code == 400 and size and "imagesize" in str(exc).lower().replace("_", ""):
                print(f"note: the API rejected image size {size}; trying again at the default size")
                size = None
                continue
            if code in (429, 500, 503) and attempt < len(RETRY_WAITS):
                time.sleep(RETRY_WAITS[attempt])
                continue
            raise RuntimeError(scrub(exc, key))
    raise RuntimeError(scrub(last, key))


# ---------------------------------------------------------------- files

def need_pillow():
    try:
        from PIL import Image
        return Image
    except ImportError:
        sys.exit("Pillow is not installed. Run: pip3 install --user Pillow")


def fit_print(im, print_mm):
    """Centre-crop to the printer's file shape (trim size plus bleed, in mm), e.g. A6 postcard 156 x 113."""
    w, h = im.size
    want = print_mm[0] / print_mm[1]
    if abs(w / h - want) < 0.005:
        return im
    if w / h > want:
        nw = round(h * want); x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = round(w / want); y = (h - nh) // 2
    return im.crop((0, y, w, y + nh))


def paper_bands(im, limit):
    """Plain light paper strips along each edge, in pixels: rows or columns that are light and nearly one colour.
    Counts up to just past `limit` (a share of that side) so a wide margin can be told from a thin strip."""
    from PIL import ImageStat
    rgb = im.convert("RGB")
    w, h = rgb.size

    def plain(box):
        st = ImageStat.Stat(rgb.crop(box))
        return sum(st.mean) / 3 > 225 and min(st.mean) > 190 and sum(st.stddev) / 3 < 12

    bands = {}
    for side, size in (("top", h), ("bottom", h), ("left", w), ("right", w)):
        n = 0
        while n <= limit * size + 1:
            box = {"top": (0, n, w, n + 1), "bottom": (0, h - 1 - n, w, h - n),
                   "left": (n, 0, n + 1, h), "right": (w - 1 - n, 0, w - n, h)}[side]
            if not plain(box):
                break
            n += 1
        bands[side] = n
    return bands


def trim_paper(im, limit=PAPER_LIMIT):
    """A full-bleed print file must not have a paper margin. The model sometimes draws one anyway (a cream strip
    along an edge, like the margin of a real screen print). Cut thin strips off; refuse to guess when the margin is
    wide, because then the drawing sits small in the middle of the card and has to be made again.
    Returns (image, note)."""
    w, h = im.size
    bands = paper_bands(im, limit)
    wide = [f"{s} {n}px" for s, n in bands.items() if n > limit * (h if s in ("top", "bottom") else w)]
    if wide:
        return im, f"WARNING: the art does not fill the card (plain paper margin: {', '.join(wide)}); make it again"
    if not any(bands.values()):
        return im, ""
    cut = ", ".join(f"{s} {n}px" for s, n in bands.items() if n)
    return im.crop((bands["left"], bands["top"], w - bands["right"], h - bands["bottom"])), f"cut a paper margin: {cut}"


def prepare_print(im, print_mm=None, full_bleed=False):
    """Art master as the printer wants it: no paper margin (full-bleed products), then the print file's shape."""
    note = ""
    if full_bleed:
        im, note = trim_paper(im)
    if print_mm:
        im = fit_print(im, print_mm)
    return im, note


def save_image(data, path, print_mm=None, full_bleed=False):
    Image = need_pillow()
    path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(data)) as im:
        im, note = prepare_print(im, print_mm, full_bleed)
        size = im.size
        if path.suffix.lower() == ".webp":
            im.convert("RGB").save(path, "WEBP", quality=WEBP_QUALITY, method=6)
        else:
            im.save(path, "PNG")
    return size, note


def card_face(path, print_mm, trim_mm):
    """The art as the cut card shows it: the print file minus the bleed, as PNG bytes for the photo stage."""
    Image = need_pillow()
    with Image.open(path) as im:
        w, h = im.size
        cw, ch = round(w * trim_mm[0] / print_mm[0]), round(h * trim_mm[1] / print_mm[1])
        x, y = (w - cw) // 2, (h - ch) // 2
        buf = io.BytesIO()
        im.crop((x, y, x + cw, y + ch)).save(buf, "PNG")
    return buf.getvalue()


def mime_of(path):
    return {".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}[path.suffix.lower()]


# ---------------------------------------------------------------- commands

def cmd_list_models(key):
    client = make_client(key)
    names = sorted(m.name.replace("models/", "") for m in client.models.list())
    image = [n for n in names if "image" in n or "imagen" in n]
    print(f"Key works. {len(names)} models; image models:")
    for n in image:
        print(f"  {n}{'   <- default' if n == DEFAULT_MODEL else ''}")
    if not any("imagen" in n for n in image):
        print("No Imagen models on this key; the Gemini image models above do the same job.")
    if DEFAULT_MODEL not in image:
        print(f"Default model {DEFAULT_MODEL} is not on this key. Pass --model with one of the names above.")


def cmd_refit(args):
    """Free, no key: cut paper margins off the existing art masters and crop them to the print shape again."""
    Image = need_pillow()
    cfg = load_config(args.config)
    jobs = build_jobs(cfg, args.theme, ["art"], args.designs, args.products,
                      Path(args.public_dir), Path(args.masters_dir), args.style, getattr(args, 'match', None))
    for j in jobs:
        if not j["out"].exists() or not (j["print_mm"] or j["full_bleed"]):
            continue
        with Image.open(j["out"]) as src:
            src.load()
            im, note = prepare_print(src, j["print_mm"], j["full_bleed"])
            changed = im.size != src.size
            if changed and not args.dry_run:
                im.save(j["out"], "PNG")
        print(f"{'would fix' if changed and args.dry_run else 'fixed' if changed else 'ok':<9} {j['id']}  "
              f"{src.size[0]}x{src.size[1]} -> {im.size[0]}x{im.size[1]}{'  ' + note if note else ''}")
    return 0


def run(args):
    cfg = load_config(args.config)
    stages = ["art", "mockups", "gift-set"] if args.stage == "all" else [args.stage]
    jobs = campaign_jobs(cfg, args.scenes) if args.stage == "campaign" else build_jobs(
        cfg, args.theme, stages, args.designs, args.products,
        Path(args.public_dir), Path(args.masters_dir), args.style, getattr(args, 'match', None), args.edit)
    todo = [j for j in jobs if args.force or j.get("edit") or not j["out"].exists()]   # an edit always runs (it rewrites the master)
    print(f"{len(jobs)} images in this plan, {len(jobs) - len(todo)} already exist, {len(todo)} to make "
          f"(model {args.model}, size {args.size}).")
    if args.dry_run:
        for j in jobs:
            state = "exists" if j["out"].exists() and not args.force else "make"
            print(f"  [{state:<6}] {j['stage']:<8} {j['label']:<32} -> {j['out'].relative_to(ROOT) if ROOT in j['out'].parents else j['out']}")
        print("Dry run: nothing was sent.")
        return 0
    if not todo:
        print("Nothing to do.")
        return 0
    if args.limit:
        todo = todo[:args.limit]
    need_pillow()
    key = get_key()
    client = make_client(key)
    from google.genai import types
    made, failed, stop = 0, [], []
    from concurrent.futures import ThreadPoolExecutor

    def one(j):
        if stop:
            return
        missing = [p for p in j["inputs"] if not p.exists()]
        if missing:
            print(f"SKIP   {j['id']}: needs {missing[0].name} first (run the earlier stage).", flush=True)
            failed.append(j["id"]); return
        face = j.get("face")
        contents = [types.Part.from_bytes(data=card_face(p, *face), mime_type="image/png") if face and i == 0
                    else types.Part.from_bytes(data=p.read_bytes(), mime_type=mime_of(p)) for i, p in enumerate(j["inputs"])] + [j["prompt"]]
        started = time.time()
        try:
            data, _mime = generate(client, types, key, args.model, contents, j["ratio"], args.size)
            (w, h), note = save_image(data, j["out"], j.get("print_mm"), j.get("full_bleed"))
        except BillingError as exc:
            stop.append(str(exc)); return
        except (ValueError, RuntimeError) as exc:
            print(f"FAILED {j['id']}: {exc}", flush=True); failed.append(j["id"]); return
        nonlocal_made.append(1)
        print(f"made   {j['id']}  {w}x{h}  {time.time() - started:.0f}s{'  ' + note if note else ''}", flush=True)

    nonlocal_made = []
    for stage, matched in (("art", False), ("mockups", False), ("mockups", True), ("gift-set", False), ("campaign", False)):   # a stage needs the one before it
        batch = [j for j in todo if j["stage"] == stage and bool(j.get("matched")) == matched]   # matched photos after their reference
        if not batch or stop:
            continue
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
            list(pool.map(one, batch))
    made = len(nonlocal_made)
    if stop:
        print(f"\nSTOP: the Google project has no credits left ({stop[0]})")
        print("Add credits in AI Studio (https://ai.studio/projects, Billing), then run this again.")
        print(f"{made} made before stopping.")
        return 2
    print(f"\n{made} made, {len(failed)} failed.")
    return 1 if failed else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Generate Telning gift mockups with Google AI Studio.")
    ap.add_argument("--theme", default="halloween")
    ap.add_argument("--config", default=str(CONFIG), help="another prompts file, for style tests")
    ap.add_argument("--stage", choices=["art", "mockups", "gift-set", "campaign", "all"], default="all")   # campaign: not in "all"
    ap.add_argument("--scenes", type=lambda s: s.split(","), help="campaign stage: comma list of scenes, e.g. halloween")
    ap.add_argument("--designs", type=lambda s: s.split(","), help="comma list, e.g. cat,dogs")
    ap.add_argument("--products", type=lambda s: s.split(","), help="comma list, e.g. mug,tote")
    ap.add_argument("--style", help="another art style from prompts.json 'styles', e.g. storybook (try it with other --masters-dir/--public-dir)")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--size", choices=["1K", "2K", "4K"], default=DEFAULT_SIZE)
    ap.add_argument("--limit", type=int, help="make at most this many images in this run")
    ap.add_argument("--workers", type=int, default=3, help="images made at the same time (default 3)")
    ap.add_argument("--force", action="store_true", help="redo images that already exist")
    ap.add_argument("--edit", action="store_true", help="art: change the existing art masters with each design's `edit` instruction (sends the art itself; copy the old file away first)")
    ap.add_argument("--match", choices=["table", "home", "hand"], help="photos: send this view's photo too, so the print has the same size and place in all three")
    ap.add_argument("--dry-run", action="store_true", help="show the plan; send nothing, no key needed")
    ap.add_argument("--list-models", action="store_true", help="check the key and list image models (free)")
    ap.add_argument("--refit", action="store_true", help="free: cut paper margins off existing art masters and crop them to the print shape")
    ap.add_argument("--public-dir", default=str(DEFAULT_PUBLIC))
    ap.add_argument("--masters-dir", default=str(DEFAULT_MASTERS))
    args = ap.parse_args(argv)
    if args.list_models:
        cmd_list_models(get_key())
        return 0
    if args.refit:
        return cmd_refit(args)
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
