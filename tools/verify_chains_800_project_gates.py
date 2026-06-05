#!/usr/bin/env python3
"""Verify the repaired Chains 800 CapCut parts."""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any


PACK = Path("exports/chains/phrase_packs/chains_800_20260603")
ROWS_JSON = PACK / "capcut_build" / "chains_800_timeline_rows.json"
REPORT = PACK / "capcut_repair" / "chains_800_final_gate_report.json"
PROJECTS = [
    ("CHAINS_800_READY_PART1_001_400 20260603_214026", 0, 400),
    ("CHAINS_800_READY_PART2_401_800 20260603_214046", 400, 800),
]


def normalize_phrase(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().casefold())


def capcut_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def text_payload(material: dict[str, Any]) -> str:
    try:
        return str(json.loads(material.get("content") or "{}").get("text", ""))
    except Exception:
        return ""


def sorted_segments(content: dict[str, Any], track_idx: int) -> list[dict[str, Any]]:
    return sorted(content["tracks"][track_idx].get("segments", []), key=lambda s: int(s["target_timerange"]["start"]))


def material_map(content: dict[str, Any], group: str) -> dict[str, dict[str, Any]]:
    out = {}
    for item in content.get("materials", {}).get(group, []):
        if item.get("id"):
            out[item["id"]] = item
    return out


def ffprobe_ok(path: Path) -> bool:
    completed = subprocess.run(["ffprobe", "-v", "error", str(path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return completed.returncode == 0


def active_text(content: dict[str, Any], track_idx: int, midpoint: int) -> str:
    mats = material_map(content, "texts")
    for seg in sorted_segments(content, track_idx):
        tr = seg["target_timerange"]
        start = int(tr["start"])
        end = start + int(tr["duration"])
        if start <= midpoint < end:
            return text_payload(mats[seg["material_id"]]).replace("\n", " ")
    return ""


def validate_project(name: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    project = capcut_root() / name
    content = load_json(project / "draft_content.json")
    errors: list[str] = []
    for rel in ["draft_content.json", "template-2.tmp", "draft_meta_info.json", "draft_biz_config.json", "timeline_layout.json"]:
        try:
            load_json(project / rel)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"bad json {rel}: {exc}")
    mirror = project / "Timelines" / str(content.get("id")) / "draft_content.json"
    if not mirror.exists():
        errors.append("timeline mirror missing")

    missing = []
    media_paths: set[Path] = set()
    for group in ("videos", "audios"):
        for mat in content.get("materials", {}).get(group, []):
            raw = mat.get("path")
            if raw:
                path = Path(str(raw))
                media_paths.add(path)
                if not path.exists():
                    missing.append(str(path))
    if missing:
        errors.append(f"missing media paths: {len(missing)}")

    bad_mp4 = []
    for path in sorted(project.rglob("*.mp4")):
        if not ffprobe_ok(path):
            bad_mp4.append(str(path))
    if bad_mp4:
        errors.append(f"bad mp4 decode: {len(bad_mp4)}")

    # Text/translation binding gate.
    en_first = sorted_segments(content, 4)
    for local_idx, (seg, row) in enumerate(zip(en_first, rows, strict=True), start=1):
        midpoint = int(seg["target_timerange"]["start"]) + int(seg["target_timerange"]["duration"]) // 2
        en = active_text(content, 4, midpoint)
        ru = active_text(content, 2, midpoint)
        if str(row["english"]).upper().split()[0] not in en:
            errors.append(f"EN mismatch local {local_idx} row {row['index']}: {en!r}")
            break
        if str(row["russian"]).upper().split()[0] not in ru:
            errors.append(f"RU mismatch local {local_idx} row {row['index']}: {ru!r}")
            break

    # Background continuity gate for row backgrounds: next segment starts exactly
    # at previous segment end in each 400-row half, except where source template
    # explicitly ends.
    bg = sorted_segments(content, 0)
    gaps = []
    for half in [0, 400]:
        for i in range(half, half + 399):
            a = bg[i]["target_timerange"]
            b = bg[i + 1]["target_timerange"]
            end_a = int(a["start"]) + int(a["duration"])
            start_b = int(b["start"])
            if end_a != start_b:
                gaps.append({"i": i, "end": end_a, "next_start": start_b})
                if len(gaps) >= 5:
                    break
    if gaps:
        errors.append(f"background gaps inside halves: {gaps[:5]}")

    return {
        "project": name,
        "error_count": len(errors),
        "errors": errors,
        "missing_paths": len(missing),
        "bad_mp4": len(bad_mp4),
        "media_path_count": len(media_paths),
        "draft_content_mb": round((project / "draft_content.json").stat().st_size / 1024 / 1024, 2),
        "resource_mb": round(sum(p.stat().st_size for p in (project / "Resources").rglob("*") if p.is_file()) / 1024 / 1024, 2),
    }


def validate_unique_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[str] = []
    if len(rows) != 800:
        errors.append(f"expected 800 timeline rows, got {len(rows)}")

    for key in ("english", "russian"):
        seen: dict[str, int] = {}
        duplicates = []
        for idx, row in enumerate(rows, start=1):
            normalized = normalize_phrase(row.get(key))
            if not normalized:
                errors.append(f"empty {key} at row {idx}")
                continue
            if normalized in seen:
                duplicates.append(
                    {
                        "first_row": seen[normalized],
                        "duplicate_row": idx,
                        "value": row.get(key),
                    }
                )
            else:
                seen[normalized] = idx
        if duplicates:
            errors.append(
                f"duplicate {key} phrases: {len(duplicates)}; examples: {duplicates[:5]}"
            )

    return {"error_count": len(errors), "errors": errors}


def main() -> int:
    all_rows = load_json(ROWS_JSON)
    uniqueness = validate_unique_rows(all_rows)
    projects = []
    for name, start, end in PROJECTS:
        projects.append(validate_project(name, all_rows[start:end]))
    report = {
        "uniqueness": uniqueness,
        "projects": projects,
        "error_count": uniqueness["error_count"] + sum(p["error_count"] for p in projects),
    }
    write_json(REPORT, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["error_count"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
