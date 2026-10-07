#!/usr/bin/env python3
"""
AB Colors - image optimiser.

Converts the JPG/PNG photos used by the site into small, resized WebP files in
img/opt/ so pages load fast on mobile. Originals are never modified.

Usage (run from the repository root, needs Pillow: pip install pillow):

    python tools/optimize-images.py --scan
        Optimise every local image referenced by the HTML/CSS files.

    python tools/optimize-images.py "img/Signages/New Folder/new photo.jpg"
        Optimise specific files and print ready-to-paste <img> markup.

Output naming: img/opt/<folder-slug>/<file-slug>-<width>.webp
e.g. img/Signages/ACP Cladding/ACP Cladding.jpeg
  -> img/opt/signages/acp-cladding/acp-cladding-800.webp  (thumbnail)
  -> img/opt/signages/acp-cladding/acp-cladding-1600.webp (large / lightbox)

The mapping is stored in tools/image-manifest.json so names stay stable.
"""
import argparse
import json
import os
import re
import sys
import urllib.parse

from PIL import Image, ImageFile, ImageOps

# A few camera uploads are truncated; browsers still show them, so do the same.
ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = "img/opt"
MANIFEST = os.path.join(ROOT, "tools", "image-manifest.json")
DEFAULT_WIDTHS = (800, 1600)
RASTER = re.compile(r"\.(jpe?g|png|jfif|webp)$", re.I)
REF = re.compile(r"""(?:src|data-src|href)\s*=\s*["']([^"']+)["']|url\(\s*['"]?([^'")]+)['"]?\s*\)""", re.I)


def slugify(text):
    text = text.lower().replace("&", " and ")
    text = re.sub(r"['’]", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-{2,}", "-", text).strip("-") or "image"


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as fh:
            return json.load(fh)
    return {}


def save_manifest(data):
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(dict(sorted(data.items())), fh, indent=1, ensure_ascii=False)
        fh.write("\n")


def base_for(src, manifest):
    """Stable output base path (without -<width>.webp) for a source image."""
    if src in manifest:
        return manifest[src]["base"]
    parts = src.split("/")
    if parts[0] in ("img", "images"):
        parts = parts[1:]
    folders = [slugify(p) for p in parts[:-1]]
    stem = slugify(os.path.splitext(parts[-1])[0])
    base = "/".join([OUT_DIR] + folders + [stem])
    taken = {v["base"] for v in manifest.values()}
    candidate, n = base, 2
    while candidate in taken:
        candidate = f"{base}-{n}"
        n += 1
    return candidate


def scan_references():
    found = set()
    files = [f for f in os.listdir(ROOT) if f.endswith(".html")]
    files += [os.path.join("css", f) for f in os.listdir(os.path.join(ROOT, "css")) if f.endswith(".css")]
    for rel in files:
        with open(os.path.join(ROOT, rel), encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        base_dir = os.path.dirname(rel)
        for m in REF.finditer(text):
            url = (m.group(1) or m.group(2) or "").split("#")[0].split("?")[0]
            if not url or re.match(r"^(https?:|data:|//|mailto:|tel:)", url):
                continue
            path = urllib.parse.unquote(url)
            path = path.lstrip("/") if path.startswith("/") else os.path.normpath(os.path.join(base_dir, path))
            path = path.replace(os.sep, "/")
            if path.startswith(OUT_DIR + "/") or not RASTER.search(path):
                continue
            if os.path.isfile(os.path.join(ROOT, path)):
                found.add(path)
    return sorted(found)


def optimise(src, manifest, widths, force=False):
    abs_src = os.path.join(ROOT, src)
    base = base_for(src, manifest)
    with Image.open(abs_src) as im:
        im = ImageOps.exif_transpose(im)
        icc = im.info.get("icc_profile")
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        im = im.convert("RGBA" if has_alpha else "RGB")
        orig_w, orig_h = im.size
        targets = sorted({w for w in widths if w < orig_w} | {min(orig_w, max(widths))})
        variants = []
        for w in targets:
            h = round(orig_h * w / orig_w)
            out_rel = f"{base}-{w}.webp"
            out_abs = os.path.join(ROOT, out_rel)
            if force or not os.path.exists(out_abs) or os.path.getmtime(out_abs) < os.path.getmtime(abs_src):
                os.makedirs(os.path.dirname(out_abs), exist_ok=True)
                frame = im if w == orig_w else im.resize((w, h), Image.LANCZOS)
                quality = 85 if (has_alpha and w <= 400) else 76
                kwargs = {"quality": quality, "method": 5}
                if icc:
                    kwargs["icc_profile"] = icc
                frame.save(out_abs, "WEBP", **kwargs)
            variants.append({"w": w, "h": h, "path": out_rel, "kb": round(os.path.getsize(out_abs) / 1024)})
    manifest[src] = {"base": base, "width": orig_w, "height": orig_h, "variants": variants}
    return manifest[src]


def snippet(entry, alt=""):
    v = entry["variants"]
    small, large = v[0], v[-1]
    srcset = ", ".join(f'{urllib.parse.quote(x["path"])} {x["w"]}w' for x in v)
    return (f'<img src="{small["path"]}" srcset="{srcset}" sizes="(max-width: 640px) 100vw, 50vw" '
            f'width="{small["w"]}" height="{small["h"]}" loading="lazy" decoding="async" alt="{alt}">'
            f'\n  (large: {large["path"]})')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", help="image paths relative to the repo root")
    ap.add_argument("--scan", action="store_true", help="optimise every image referenced by HTML/CSS")
    ap.add_argument("--manifest", action="store_true", help="re-process every image already listed in the manifest")
    ap.add_argument("--widths", default=",".join(map(str, DEFAULT_WIDTHS)), help="comma separated widths")
    ap.add_argument("--force", action="store_true", help="re-encode even if output is up to date")
    args = ap.parse_args()

    os.chdir(ROOT)
    widths = tuple(int(w) for w in args.widths.split(","))
    sources = [f.replace("\\", "/") for f in args.files]
    manifest = load_manifest()
    if args.scan:
        sources += scan_references()
    if args.manifest:
        sources += list(manifest)
    if not sources:
        ap.print_help()
        return 1

    before = after = 0
    for i, src in enumerate(sorted(set(sources)), 1):
        if not os.path.isfile(os.path.join(ROOT, src)):
            print(f"!! missing: {src}", file=sys.stderr)
            continue
        try:
            entry = optimise(src, manifest, widths, args.force)
        except OSError as exc:
            print(f"!! failed: {src}: {exc}", file=sys.stderr)
            continue
        before += os.path.getsize(os.path.join(ROOT, src))
        after += entry["variants"][0]["kb"] * 1024
        print(f"[{i}] {src} -> {', '.join(v['path'].rsplit('/', 1)[-1] for v in entry['variants'])}")
        if args.files and not args.scan:
            print("  " + snippet(entry))
        if i % 25 == 0:
            save_manifest(manifest)
    save_manifest(manifest)
    print(f"\nOriginals: {before / 1e6:.1f} MB -> smallest variants: {after / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
