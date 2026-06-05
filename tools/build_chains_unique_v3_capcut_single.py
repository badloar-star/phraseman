#!/usr/bin/env python3
"""Build one openable native CapCut draft for Chains 800 unique v3."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import build_chains_unique_v3_capcut_parts as parts
from build_chains_800_capcut_project import backup_source, capcut_is_open, capcut_root, load_json, update_meta, write_json, write_pretty


REPORT_PATH = parts.PACK / "capcut_build" / "chains_unique_v3_capcut_single_report.json"


def mirror_all_timelines(target: Path, content: dict[str, Any]) -> None:
    write_json(target / "draft_content.json", content)
    if (target / "template-2.tmp").exists():
        write_json(target / "template-2.tmp", content)
    timelines = target / "Timelines"
    if timelines.exists():
        for mirror in timelines.glob("*/draft_content.json"):
            write_json(mirror, content)
    update_meta(target, content)


def validate_single(draft: dict[str, Any]) -> dict[str, Any]:
    target = Path(draft["target"])
    content = load_json(target / "draft_content.json")
    errors: list[str] = []
    missing: list[str] = []

    template = load_json(target / "template-2.tmp") if (target / "template-2.tmp").exists() else None
    if template is not None and template != content:
        errors.append("template-2.tmp mismatch")
    timelines = list((target / "Timelines").glob("*/draft_content.json")) if (target / "Timelines").exists() else []
    if not timelines:
        errors.append("timeline mirror missing")
    for mirror in timelines:
        if load_json(mirror) != content:
            errors.append(f"timeline mirror mismatch: {mirror.parent.name}")

    for group in ("videos", "audios", "images"):
        for material in content.get("materials", {}).get(group, []):
            raw = material.get("path") or material.get("media_path")
            if raw and not Path(str(raw)).exists():
                missing.append(str(raw))
    if missing:
        errors.append(f"missing media paths: {len(missing)}")

    expected_counts = {
        0: 1600,
        2: 1600,
        3: 1600,
        4: 800,
        5: 800,
        9: 800,
        10: 800,
        11: 800,
        14: 800,
        15: 800,
        16: 800,
    }
    for idx, expected in expected_counts.items():
        actual = len(content["tracks"][idx].get("segments", []))
        if actual != expected:
            errors.append(f"track {idx} expected {expected}, got {actual}")

    intro_tracks = [track for track in content["tracks"] if track.get("name") == "CODEx UNIQUE V3 INTRO VOICE"]
    if len(intro_tracks) != 1:
        errors.append(f"intro audio track count {len(intro_tracks)}")

    for idx in [9, 10, 11, 14, 15, 16]:
        previous_end = -1
        for seg in sorted(content["tracks"][idx].get("segments", []), key=lambda s: int(s["target_timerange"]["start"])):
            start = int(seg["target_timerange"]["start"])
            duration = int(seg["target_timerange"]["duration"])
            if start < previous_end:
                errors.append(f"audio overlap on track {idx}")
                break
            previous_end = start + duration

    return {"error_count": len(errors), "errors": errors, "missing_media_count": len(missing)}


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing native draft files.")
    source = capcut_root() / parts.SOURCE_DRAFT
    backup = backup_source(source)
    rows, text_items, timing = parts.load_maps()
    parts.TARGET_BASE = "CHAINS_800_UNIQUE_V3_OPENAI_SINGLE"
    draft = parts.build_part(1, rows, text_items, timing)
    draft["part"] = "single"
    draft["rows"] = [1, 800]
    target = Path(draft["target"])
    content = load_json(target / "draft_content.json")
    mirror_all_timelines(target, content)
    validation = validate_single(draft)
    report = {
        "status": "ready" if validation["error_count"] == 0 else "failed",
        "source": str(source),
        "backup": str(backup),
        "draft": draft,
        "parts": [draft],
        "validation": validation,
    }
    write_pretty(REPORT_PATH, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
