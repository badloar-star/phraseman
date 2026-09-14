#!/usr/bin/env python3
"""Install the user-supplied character art as true-alpha numbered visuals."""

from __future__ import annotations

import random
import shutil
import json
import re
from pathlib import Path

from PIL import Image


PACKAGE = Path(r"C:\Users\badlo\OneDrive\Документы\проекты\CHAIN_ES_50_ACTIVE_LISTENING_A1_FULL_PACK")
DOWNLOADS = Path(r"C:\Users\badlo\Downloads")
NAMES = [
    "ChatGPT Image 2 сент. 2026 г., 10_06_56 (10).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_55 (8).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_56 (9).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_54 (6).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_54 (7).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_53 (5).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_52 (3).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_52 (4).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_51 (2).png",
    "ChatGPT Image 2 сент. 2026 г., 10_06_51 (1).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (7).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (8).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (9).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (10).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (1).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (2).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (3).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (4).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (5).png",
    "ChatGPT Image 2 сент. 2026 г., 09_54_13 (6).png",
]


def main() -> int:
    sources = [DOWNLOADS / name for name in NAMES]
    missing = [path for path in sources if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing source illustrations: {missing}")
    for path in sources:
        with Image.open(path) as image:
            if image.mode != "RGBA" or image.getextrema()[3][0] >= 255:
                raise RuntimeError(f"Illustration has no usable alpha channel: {path.name}")

    backups = sorted(PACKAGE.glob("_BACKUP_BEFORE_V3_*"))
    backup = backups[-1] if backups else PACKAGE / "_BACKUP_BEFORE_V3_VISUALS"
    backup_visuals = backup / "visuals_6"
    if not backup_visuals.exists():
        shutil.copytree(PACKAGE / "6", backup_visuals)

    order = list(range(len(sources)))
    random.Random(20260904).shuffle(order)
    assignments = []
    for index in range(50):
        source = sources[order[index % len(order)]]
        destination = PACKAGE / "6" / f"{index + 1:03d}.png"
        shutil.copy2(source, destination)
        assignments.append(f"{index + 1:03d}.png <- {source.name}")
    (PACKAGE / "6" / "ALPHA_ASSIGNMENTS.txt").write_text("\n".join(assignments) + "\n", encoding="utf-8")
    draft_path = PACKAGE / "draft_content.json"
    draft = json.loads(draft_path.read_text(encoding="utf-8"))
    patched_materials = 0
    for material in draft.get("materials", {}).get("videos", []):
        path_text = str(material.get("path") or "")
        match = re.search(r"[\\/]6[\\/](\d{3})\.png$", path_text, flags=re.I)
        if not match:
            continue
        image_path = PACKAGE / "6" / f"{int(match.group(1)):03d}.png"
        with Image.open(image_path) as image:
            width, height = image.size
        material["path"] = str(image_path)
        material["name"] = image_path.name
        material["width"] = width
        material["height"] = height
        material["type"] = "photo"
        patched_materials += 1
    temp = draft_path.with_suffix(".json.alpha.tmp")
    temp.write_text(json.dumps(draft, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(draft_path)
    print(f"ALPHA_VISUALS_READY files=50 unique_sources=20 mode=RGBA materials={patched_materials}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
