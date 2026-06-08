#!/usr/bin/env python3
"""Restore readable Russian CTA/STA text materials in the current Cepicepi draft."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from build_chains_800_capcut_project import set_text, write_json


PROJECT_NAME = "ЦЕПИ ЦЕПИ ЦЕПИ (1)"
PROJECT = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / PROJECT_NAME
REPORT = Path("exports/chains/cepicepi_next_chains_a1a2_20260605/sta_text_restore_report.json")

CYR_FONT = "C:/Windows/Fonts/arial.ttf"

STA_TEXTS: dict[tuple[int, int], str] = {
    (7, 0): "Мы создали приложение,\nчтобы помочь тебе\nдумать на испанском.",
    (9, 0): "Эти фразы можно слушать на фоне,\nа можно реально начать\nиспользовать их.",
    (9, 1): "Мы создали приложение,\nчтобы помочь тебе\nдумать на изучаемом языке.",
    (9, 2): "Слушать фразы на фоне — хорошо.\nУметь их использовать —\nпревосходно.",
    (10, 0): "Слушать фразы на фоне — хорошо.\nУметь их использовать —\nпревосходно.",
    (10, 1): "Ссылка в описании",
}


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def text_payload(material: dict[str, Any]) -> dict[str, Any]:
    try:
        return json.loads(material.get("content") or "{}")
    except Exception:
        return {}


def apply_font(material: dict[str, Any]) -> None:
    material["font_path"] = CYR_FONT
    material["font_title"] = "Arial"
    material["font_name"] = "Arial"
    payload = text_payload(material)
    for style in payload.get("styles", []) or []:
        if isinstance(style, dict):
            style.setdefault("font", {})["path"] = CYR_FONT
            style.setdefault("font", {})["id"] = ""
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def patch_content(content: dict[str, Any]) -> dict[str, Any]:
    texts = {m.get("id"): m for m in content.get("materials", {}).get("texts", []) if isinstance(m, dict)}
    changed: list[dict[str, Any]] = []
    for (track_idx, seg_idx), value in STA_TEXTS.items():
        try:
            segment = content["tracks"][track_idx]["segments"][seg_idx]
        except (IndexError, KeyError):
            changed.append({"track": track_idx, "segment": seg_idx, "status": "missing_segment"})
            continue
        material = texts.get(segment.get("material_id"))
        if not material:
            changed.append({"track": track_idx, "segment": seg_idx, "status": "missing_material"})
            continue
        set_text(material, value)
        apply_font(material)
        if track_idx in {7, 9, 10}:
            segment["visible"] = True
            if isinstance(segment.get("clip"), dict):
                segment["clip"]["alpha"] = 1
        changed.append({"track": track_idx, "segment": seg_idx, "status": "restored", "text": value})

    # The long empty template text layer must not cover STA or phrases.
    try:
        long_segment = content["tracks"][2]["segments"][0]
        long_segment["visible"] = False
        if isinstance(long_segment.get("clip"), dict):
            long_segment["clip"]["alpha"] = 0
        changed.append({"track": 2, "segment": 0, "status": "hidden_long_overlay"})
    except (IndexError, KeyError):
        pass
    return {"changed": changed}


def qa(content: dict[str, Any]) -> dict[str, Any]:
    texts = {m.get("id"): m for m in content.get("materials", {}).get("texts", []) if isinstance(m, dict)}
    bad: list[dict[str, Any]] = []
    for track_idx, seg_idx in STA_TEXTS:
        segment = content["tracks"][track_idx]["segments"][seg_idx]
        material = texts[segment["material_id"]]
        text = text_payload(material).get("text", "")
        if "?" in text:
            bad.append({"track": track_idx, "segment": seg_idx, "reason": "contains_question_marks", "text": text})
        if "Ð" in text or "Ñ" in text:
            bad.append({"track": track_idx, "segment": seg_idx, "reason": "mojibake", "text": text})
        if "\n" in text and any(part and " " not in part and len(part) > 18 for part in text.split("\n")):
            bad.append({"track": track_idx, "segment": seg_idx, "reason": "possible_bad_wrap", "text": text})
    long_seg = content["tracks"][2]["segments"][0]
    if long_seg.get("visible") is not False:
        bad.append({"track": 2, "segment": 0, "reason": "long_overlay_visible"})
    return {"status": "ready" if not bad else "failed", "errors": bad}


def main() -> int:
    root = PROJECT / "draft_content.json"
    content = load(root)
    patch = patch_content(content)
    verification = qa(content)
    write_json(root, content)
    root_bytes = root.read_bytes()
    mirrors = [PROJECT / "template-2.tmp"]
    timelines = PROJECT / "Timelines"
    if timelines.exists():
        mirrors.extend(t / "draft_content.json" for t in timelines.iterdir() if (t / "draft_content.json").exists())
    for mirror in mirrors:
        mirror.write_bytes(root_bytes)
    report = {"project": str(PROJECT), **patch, "qa": verification, "mirrors_written": [str(m) for m in mirrors]}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if verification["status"] == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
