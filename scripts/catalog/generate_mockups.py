#!/usr/bin/env python3
"""Telning gift mockups with Google AI Studio (google-genai).

Every product has its own four designs (Halloween: one cat, one dog, many cats,
many dogs). Tote bags have eight: four on undyed and four on black cotton (product
`tote-black`), so 20 artworks; mugs are white 11 oz only. For each design it makes:
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
Everything:     python3 scripts/catalog/generate_mockups.py   (41 images)

Images are paid per image. Existing files are skipped; use --force to redo them.
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


def load_config():
    with CONFIG.open(encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- plan

def build_jobs(cfg, theme, stages, designs, products, public_dir, masters_dir):
    t = cfg["themes"].get(theme)
    if not t or not t.get("active"):
        sys.exit(f"Theme '{theme}' is not active. {(t or {}).get('note', '')}".strip())
    spec = cfg["designs"].get(theme)
    if not spec:
        sys.exit(f"No designs written for '{theme}' in prompts.json.")
    prods = products or list(cfg["products"])
    unknown = [p for p in prods if p not in cfg["products"]]
    if unknown:
        sys.exit(f"Unknown product(s): {', '.join(unknown)}. Choices: {', '.join(cfg['products'])}")
    every = list(next(iter(spec.values())))
    names = designs or every
    unknown = [d for d in names if d not in every]
    if unknown:
        sys.exit(f"Unknown design(s): {', '.join(unknown)}. Choices: {', '.join(every)}")

    def art_path(p, d):
        return masters_dir / "_art" / theme / p / d / f"{theme}-{d}-{p}.png"

    def mock_path(p, d, colour=""):
        tag = f"-{colour}" if colour else ""
        return public_dir / p / theme / d / f"{theme}-{d}-{p}{tag}.webp"

    def variants(pr):
        """{colour: {label, scene, place}}; a product without colours gives one entry with an empty key."""
        if "colours" in pr:
            return pr["colours"]
        return {"": {"label": pr["label"], "scene": pr["scene"], "place": pr["place"]}}

    jobs = []
    for p in prods:
        pr = cfg["products"][p]
        for d in names:
            design = spec[p][d]
            if "art" in stages:
                words = design.get("words", "").strip()
                jobs.append({
                    "stage": "art", "id": f"{theme}-{d}-{p}-art", "label": f"artwork, {pr['label']}: {design['title']}",
                    "ratio": pr["art_ratio"], "inputs": [], "out": art_path(p, d),
                    "prompt": cfg["art_template"].format(
                        style=cfg["style"], subject=design["subject"], no_text=cfg["no_text"],
                        background=pr.get("art_background", "a plain warm cream paper background"), extra=pr.get("art_extra", ""),
                        words=(f' The picture includes the words "{words}", drawn by hand in the same style.' if words else "")),
                })
            if "mockups" in stages:
                for colour, scene in variants(pr).items():   # tote bags come in two colours, the others in one
                    tag = f"-{colour}" if colour else ""
                    jobs.append({
                        "stage": "mockups", "id": f"{theme}-{d}-{p}{tag}", "label": f"{scene['label']}: {design['title']}",
                        "ratio": pr["ratio"], "inputs": [art_path(p, d)], "out": mock_path(p, d, colour),
                        "prompt": cfg["mockup_template"].format(scene=scene["scene"], place=scene["place"]),
                    })
    if "gift-set" in stages:
        gs = cfg["gift_set"]
        jobs.append({
            "stage": "gift-set", "id": f"{theme}-gift-set", "label": "gift set: all four products",
            "ratio": gs["ratio"], "inputs": [mock_path(p, d, next(iter(variants(cfg["products"][p])))) for p, d in gs["uses"].items()],
            "out": public_dir / "gift-set" / theme / f"{theme}-gift-set.webp",
            "prompt": gs["scene"],
        })
    return jobs


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


def save_image(data, path):
    Image = need_pillow()
    path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(data)) as im:
        size = im.size
        if path.suffix.lower() == ".webp":
            im.convert("RGB").save(path, "WEBP", quality=WEBP_QUALITY, method=6)
        else:
            im.save(path, "PNG")
    return size


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


def run(args):
    cfg = load_config()
    stages = ["art", "mockups", "gift-set"] if args.stage == "all" else [args.stage]
    jobs = build_jobs(cfg, args.theme, stages, args.designs, args.products,
                      Path(args.public_dir), Path(args.masters_dir))
    todo = [j for j in jobs if args.force or not j["out"].exists()]
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
    made, failed = 0, []
    for j in todo:
        missing = [p for p in j["inputs"] if not p.exists()]
        if missing:
            print(f"SKIP   {j['id']}: needs {missing[0].name} first (run the earlier stage).")
            failed.append(j["id"])
            continue
        contents = [types.Part.from_bytes(data=p.read_bytes(), mime_type=mime_of(p)) for p in j["inputs"]]
        contents.append(j["prompt"])
        started = time.time()
        try:
            data, _mime = generate(client, types, key, args.model, contents, j["ratio"], args.size)
            w, h = save_image(data, j["out"])
        except BillingError as exc:
            print(f"\nSTOP: the Google project has no credits left ({exc})")
            print("Add credits in AI Studio (https://ai.studio/projects, Billing), then run this again.")
            print(f"{made} made before stopping.")
            return 2
        except (ValueError, RuntimeError) as exc:
            print(f"FAILED {j['id']}: {exc}")
            failed.append(j["id"])
            continue
        made += 1
        print(f"made   {j['id']}  {w}x{h}  {time.time() - started:.0f}s  -> {j['out']}")
    print(f"\n{made} made, {len(failed)} failed.")
    return 1 if failed else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Generate Telning gift mockups with Google AI Studio.")
    ap.add_argument("--theme", default="halloween")
    ap.add_argument("--stage", choices=["art", "mockups", "gift-set", "all"], default="all")
    ap.add_argument("--designs", type=lambda s: s.split(","), help="comma list, e.g. cat,dogs")
    ap.add_argument("--products", type=lambda s: s.split(","), help="comma list, e.g. mug,tote")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--size", choices=["1K", "2K", "4K"], default=DEFAULT_SIZE)
    ap.add_argument("--limit", type=int, help="make at most this many images in this run")
    ap.add_argument("--force", action="store_true", help="redo images that already exist")
    ap.add_argument("--dry-run", action="store_true", help="show the plan; send nothing, no key needed")
    ap.add_argument("--list-models", action="store_true", help="check the key and list image models (free)")
    ap.add_argument("--public-dir", default=str(DEFAULT_PUBLIC))
    ap.add_argument("--masters-dir", default=str(DEFAULT_MASTERS))
    args = ap.parse_args(argv)
    if args.list_models:
        cmd_list_models(get_key())
        return 0
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
