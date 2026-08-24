from __future__ import annotations

import json
from collections import deque
from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT = Path.cwd()
# зачем: черновики генерации вынесены из assets/ в asset_sources/.
SOURCE_ROOT = ROOT / "asset_sources/cinema_dalle_sources/singles/v1"
AUDIT_PATH = ROOT / ".codex-tmp/cinema-single-assets-pillow-audit.json"

THEMES = ["midnight", "ember", "aurora", "volt"]
THEME_BACKGROUND = {
    "midnight": "orange",
    "ember": "cyan",
    "aurora": "magenta",
    "volt": "magenta",
}

HOME_TARGETS = [
    ("lessons", 384, {"width": 326, "height": 326, "centerX": 192, "centerY": 192}),
    ("cards", 384, {"width": 298, "height": 326, "centerX": 192, "centerY": 192}),
    ("daily-tasks", 384, {"width": 302, "height": 326, "centerX": 192, "centerY": 192}),
    ("league", 384, {"width": 240, "height": 326, "centerX": 191, "centerY": 192}),
    ("diagnostic-test", 384, {"width": 281, "height": 326, "centerX": 192, "centerY": 192}),
    ("practice", 384, {"width": 304, "height": 326, "centerX": 192, "centerY": 192}),
    ("dialogs", 384, {"width": 304, "height": 326, "centerX": 192, "centerY": 192}),
    ("exam", 384, {"width": 302, "height": 326, "centerX": 192, "centerY": 192}),
    ("shop", 384, {"width": 302, "height": 326, "centerX": 192, "centerY": 192}),
    ("hero-map", 384, {"width": 302, "height": 326, "centerX": 192, "centerY": 192}),
]

EXTRA_TARGETS = []

SECONDARY_TARGETS = []


def target_records() -> Iterable[dict]:
    for theme in THEMES:
        for key, size, fit in HOME_TARGETS:
            yield {
                "theme": theme,
                "key": f"home-{key}",
                "source": SOURCE_ROOT / theme / f"home-{key}.png",
                "output": ROOT / "assets/images/home_menu" / theme / f"home-{theme}-{key}.webp",
                "size": size,
                "fit": fit,
                "background": THEME_BACKGROUND[theme],
            }
        for key, source_name, output_template, size, fit in EXTRA_TARGETS:
            yield {
                "theme": theme,
                "key": key,
                "source": SOURCE_ROOT / theme / source_name,
                "output": ROOT / output_template.format(theme=theme),
                "size": size,
                "fit": fit,
                "background": THEME_BACKGROUND[theme],
            }
        for key, source_name, output_template, size, fit in SECONDARY_TARGETS:
            yield {
                "theme": theme,
                "key": key,
                "source": SOURCE_ROOT / theme / source_name,
                "output": ROOT / output_template.format(theme=theme),
                "size": size,
                "fit": fit,
                "background": THEME_BACKGROUND[theme],
            }


def is_bg(pixel: tuple[int, int, int, int], kind: str) -> bool:
    r, g, b, a = pixel
    if a < 8:
        return True
    if kind == "orange":
        return r >= 185 and 35 <= g <= 155 and b <= 70 and r > g * 1.35 and r > b * 3.0
    if kind == "cyan":
        return b >= 130 and g >= 145 and r <= 95 and g > r * 1.8 and b > r * 1.8
    if kind == "magenta":
        return r >= 160 and b >= 120 and g <= 95 and r > g * 1.6 and b > g * 1.4
    if kind == "green":
        return g >= 145 and r <= 100 and b <= 100 and g > r * 1.7 and g > b * 1.7
    raise ValueError(f"Unknown background kind {kind}")


def remove_edge_background(image: Image.Image, kind: str) -> tuple[Image.Image, int]:
    image = image.convert("RGBA")
    px = image.load()
    width, height = image.size
    queue: deque[tuple[int, int]] = deque()
    seen = bytearray(width * height)

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    removed = 0
    while queue:
        x, y = queue.pop()
        idx = y * width + x
        if seen[idx]:
            continue
        seen[idx] = 1
        if not is_bg(px[x, y], kind):
            continue
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        removed += 1
        if x > 0:
            queue.append((x - 1, y))
        if x < width - 1:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y < height - 1:
            queue.append((x, y + 1))
    return image, removed


def alpha_bbox(image: Image.Image, threshold: int = 12) -> dict | None:
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda a: 255 if a > threshold else 0).getbbox()
    if bbox is None:
        return None
    left, top, right, bottom = bbox
    return {
        "minX": left,
        "minY": top,
        "maxX": right - 1,
        "maxY": bottom - 1,
        "width": right - left,
        "height": bottom - top,
    }


def process_target(target: dict) -> dict:
    src = target["source"]
    out = target["output"]
    image = Image.open(src).convert("RGBA")
    matted, removed = remove_edge_background(image, target["background"])
    bbox = alpha_bbox(matted)
    if bbox is None:
        raise RuntimeError(f"No visible pixels after matte: {src}")

    crop = matted.crop((bbox["minX"], bbox["minY"], bbox["maxX"] + 1, bbox["maxY"] + 1))
    fit = target["fit"]
    scale = min(fit["width"] / bbox["width"], fit["height"] / bbox["height"])
    content_w = max(1, round(bbox["width"] * scale))
    content_h = max(1, round(bbox["height"] * scale))
    resized = crop.resize((content_w, content_h), Image.Resampling.LANCZOS)

    size = target["size"]
    left = round(fit["centerX"] - content_w / 2)
    top = round(fit["centerY"] - content_h / 2)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (left, top))

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "WEBP", quality=95, method=6, lossless=False)

    output_bbox = alpha_bbox(canvas)
    if output_bbox is None:
        raise RuntimeError(f"No visible pixels in output: {out}")
    return {
        "theme": target["theme"],
        "key": target["key"],
        "source": str(src.relative_to(ROOT)),
        "output": str(out.relative_to(ROOT)),
        "removedPixels": removed,
        "sourceBBox": bbox,
        "outputBBox": output_bbox,
        "outputMargins": {
            "left": output_bbox["minX"],
            "top": output_bbox["minY"],
            "right": size - 1 - output_bbox["maxX"],
            "bottom": size - 1 - output_bbox["maxY"],
        },
    }


def main() -> None:
    strict = "--strict" in set(__import__("sys").argv)
    audits = []
    missing = []
    for target in target_records():
        if not target["source"].exists():
            missing.append(str(target["source"].relative_to(ROOT)))
            continue
        audits.append(process_target(target))
    if strict and missing:
        raise SystemExit("Missing source files:\n" + "\n".join(missing))

    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_PATH.write_text(
        json.dumps(
            {
                "processed": len(audits),
                "missing": len(missing),
                "missingSources": missing,
                "audits": audits,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"processed": len(audits), "missing": len(missing), "audit": str(AUDIT_PATH.relative_to(ROOT))}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
