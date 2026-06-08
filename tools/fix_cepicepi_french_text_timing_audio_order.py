#!/usr/bin/env python3
"""Restore French Cepicepi text block timings and audio order to the locked template."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from apply_cepicepi_french_ru_pack import (
    AUDIO_DIR,
    PACK,
    build_rows,
    fit_audio,
    localize,
    load_json,
    media_map,
    project_path,
    raw_audio_path,
)
from build_chains_800_capcut_project import write_json


LOCKED = next(Path(".codex-tmp/capcut-backups").glob("*LOCKED-GOOD-CURRENT-20260605_162149/draft_content.json"))
REPORT = PACK / "text_timing_audio_order_fix_report.json"


def copy_timer(dst: dict[str, Any], src: dict[str, Any]) -> bool:
    changed = False
    for key in ("target_timerange", "source_timerange", "render_timerange"):
        if key in src and dst.get(key) != src.get(key):
            dst[key] = json.loads(json.dumps(src[key]))
            changed = True
    return changed


def restore_text_timings(content: dict[str, Any], baseline: dict[str, Any]) -> dict[str, Any]:
    changed = []
    for track_idx in (3, 4, 5):
        current_segments = content["tracks"][track_idx]["segments"]
        baseline_segments = baseline["tracks"][track_idx]["segments"]
        for seg_idx in range(min(len(current_segments), len(baseline_segments))):
            before = current_segments[seg_idx].get("target_timerange", {}).copy()
            if copy_timer(current_segments[seg_idx], baseline_segments[seg_idx]):
                after = current_segments[seg_idx].get("target_timerange", {}).copy()
                changed.append({"track": track_idx, "segment": seg_idx, "before": before, "after": after})
    return {"changed_count": len(changed), "sample": changed[:12]}


def set_audio_material(
    project: Path,
    audios: dict[str, dict[str, Any]],
    segment: dict[str, Any],
    fitted_path: Path,
) -> dict[str, Any]:
    local = localize(project, fitted_path, "cepicepi_french_openai_audio")
    mat = audios[segment["material_id"]]
    mat["path"] = str(local)
    mat["media_path"] = str(local)
    mat["duration"] = int((segment.get("target_timerange") or {}).get("duration", 0))
    mat["name"] = local.name
    mat["material_name"] = local.name
    return {"material_id": segment["material_id"], "path": str(local)}


def restore_audio_order(content: dict[str, Any], project: Path) -> dict[str, Any]:
    audios = media_map(content, "audios")
    rows = build_rows()
    changed = []
    fitted = []
    for idx in range(100):
        row = rows[idx]
        # Part 1 slots are track18/19/20 in time order. Required: FR, RU, FR.
        mapping = [
            (18, idx, "fr1", row["french"]),
            (19, idx, "ru", row["russian"]),
            (20, idx, "fr2", row["french"]),
            # Part 2 required: RU, FR, FR.
            (18, 100 + idx, "ru", row["russian"]),
            (19, 100 + idx, "fr1", row["french"]),
            (20, 100 + idx, "fr2", row["french"]),
            # Part 3 required: FR, FR only.
            (19, 200 + idx, "fr1", row["french"]),
            (20, 200 + idx, "fr2", row["french"]),
        ]
        for track, seg_idx, desired_role, phrase_text in mapping:
            if seg_idx >= len(content["tracks"][track]["segments"]):
                continue
            segment = content["tracks"][track]["segments"][seg_idx]
            slot_us = int((segment.get("target_timerange") or {}).get("duration", 0))
            raw = raw_audio_path(phrase_text, desired_role)
            if not raw.exists():
                raise FileNotFoundError(f"missing raw audio for {desired_role}: {raw}")
            fitted_path = AUDIO_DIR / "fitted_fixed_order" / desired_role / f"t{track}_s{seg_idx}_{slot_us}_{desired_role}.wav"
            fit = fit_audio(raw, fitted_path, slot_us)
            fitted.append({"track": track, "seg": seg_idx, "role": desired_role, **fit})
            before = audios[segment["material_id"]].get("path") or audios[segment["material_id"]].get("media_path")
            result = set_audio_material(project, audios, segment, fitted_path)
            after = result["path"]
            if before != after:
                changed.append({"track": track, "segment": seg_idx, "role": desired_role, "before": before, "after": after})
    return {"changed_count": len(changed), "fitted_count": len(fitted), "max_speed": max(item["speed"] for item in fitted), "sample": changed[:12]}


def verify(content: dict[str, Any], baseline: dict[str, Any]) -> dict[str, Any]:
    errors = []
    for track_idx in (3, 4, 5):
        for seg_idx, (cur, base) in enumerate(zip(content["tracks"][track_idx]["segments"], baseline["tracks"][track_idx]["segments"])):
            if cur.get("target_timerange") != base.get("target_timerange"):
                errors.append(f"text timing mismatch t{track_idx}s{seg_idx}")
                break
    audios = media_map(content, "audios")
    checks = [
        (18, 0, "fr1"),
        (19, 0, "ru"),
        (20, 0, "fr2"),
        (18, 100, "ru"),
        (19, 100, "fr1"),
        (20, 100, "fr2"),
        (19, 200, "fr1"),
        (20, 200, "fr2"),
    ]
    for track, seg_idx, role in checks:
        if seg_idx >= len(content["tracks"][track]["segments"]):
            errors.append(f"missing audio slot t{track}s{seg_idx}")
            continue
        mat = audios[content["tracks"][track]["segments"][seg_idx]["material_id"]]
        path = str(mat.get("path") or mat.get("media_path") or "")
        if f"_{role}.wav" not in path:
            errors.append(f"audio role mismatch t{track}s{seg_idx}: expected {role}, got {path}")
    return {"status": "ready" if not errors else "failed", "errors": errors}


def main() -> int:
    project = project_path()
    root = project / "draft_content.json"
    content = load_json(root)
    baseline = load_json(LOCKED)
    text_report = restore_text_timings(content, baseline)
    audio_report = restore_audio_order(content, project)
    qa = verify(content, baseline)
    write_json(root, content)
    root_bytes = root.read_bytes()
    mirrors = [project / "template-2.tmp"]
    timelines = project / "Timelines"
    if timelines.exists():
        mirrors.extend(t / "draft_content.json" for t in timelines.iterdir() if (t / "draft_content.json").exists())
    for mirror in mirrors:
        mirror.write_bytes(root_bytes)
    report = {
        "status": qa["status"],
        "project": str(project),
        "baseline": str(LOCKED),
        "text_timings": text_report,
        "audio_order": audio_report,
        "qa": qa,
        "mirrors_written": [str(m) for m in mirrors],
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if qa["status"] == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
