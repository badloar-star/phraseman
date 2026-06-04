#!/usr/bin/env python3
"""Replace explanation captions with persistent line tracks.

This script is intentionally narrower than the full layout repair: it does not
shift phrases, CTA blocks, audio, or backgrounds. It only replaces disappearing
explanation text segments with five persistent lines per explanation window.
"""

from __future__ import annotations

import copy
import json
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
CONTENT_PATH = DRAFT_DIR / "draft_content.json"
META_PATH = DRAFT_DIR / "draft_meta_info.json"
TMP_PATH = DRAFT_DIR / "template-2.tmp"
ASSETS_DIR = Path("exports/chains/episode1/unique_explanations_approved")
TIMED_PATH = ASSETS_DIR / "timed_explanations.json"

US = 1_000_000
EXPLANATION_PAD_BEFORE_US = 150_000
LINE_Y = [-0.17, -0.085, 0.0, 0.085, 0.17]


def gid() -> str:
    return str(uuid.uuid4()).upper()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq CapCut.exe"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
    )
    return "CapCut.exe" in result.stdout


def backup() -> Path:
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-persistent-explanation-text"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(DRAFT_DIR, out)
    return out


def material_by_id(materials: dict[str, Any], material_id: str) -> dict[str, Any] | None:
    for items in materials.values():
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and item.get("id") == material_id:
                    return item
    return None


def flatten_block(text: str) -> str:
    return " ".join(str(text).upper().replace("\\n", "\n").split())


def font_size_for_line(text: str) -> float:
    length = len(text)
    if length <= 28:
        return 6.2
    if length <= 42:
        return 5.3
    return 4.6


def make_text_material(template: dict[str, Any], text: str) -> dict[str, Any]:
    font_size = font_size_for_line(text)
    mat = copy.deepcopy(template)
    mat["id"] = gid()
    mat["base_content"] = text
    mat["font_size"] = font_size
    mat["text_size"] = max(18, int(font_size * 4.1))
    mat["line_spacing"] = 0.01
    mat["background_alpha"] = 0.0
    content = json.loads(mat["content"])
    content["text"] = text
    for style in content.get("styles", []):
        style["range"] = [0, len(text)]
        style["size"] = font_size
        fill = style.setdefault("fill", {}).setdefault("content", {}).setdefault("solid", {})
        fill["color"] = [1, 1, 1]
    mat["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    return mat


def clone_track(template: dict[str, Any], name: str, segments: list[dict[str, Any]]) -> dict[str, Any]:
    track = copy.deepcopy(template)
    track["id"] = gid()
    track["name"] = name
    track["is_default_name"] = False
    track["segments"] = segments
    return track


def visual_starts(window_start: int, audio_start: int, audio_end: int, blocks: list[dict[str, Any]]) -> list[int]:
    starts: list[int] = []
    min_gap = 1_150_000
    for index, block in enumerate(blocks):
        if index == 0:
            raw = audio_start
        else:
            raw = window_start + int(round(float(block.get("start_sec", 0)) * US))
            raw = max(raw, starts[-1] + min_gap)
        starts.append(raw)
    latest_last = audio_end - 1_500_000
    if starts and starts[-1] > latest_last:
        span_start = audio_start
        span_end = max(span_start + (len(starts) - 1) * min_gap, latest_last)
        gap = (span_end - span_start) / max(1, len(starts) - 1)
        starts = [int(span_start + gap * i) for i in range(len(starts))]
    return starts


def main() -> None:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before rebuilding persistent explanation text.")

    backup_path = backup()
    draft = read_json(CONTENT_PATH)
    timed = read_json(TIMED_PATH)
    tracks = draft.get("tracks", [])
    bg_track = next(t for t in tracks if t.get("name") == "CODEx construction explanation SCREENSAVER")
    audio_track = next(t for t in tracks if t.get("name") == "CODEx construction explanation UNIQUE VO")

    removed = []
    kept = []
    for track in tracks:
        name = str(track.get("name", ""))
        if name == "CODEx construction explanation TIMED TEXT" or name.startswith(
            "CODEx construction explanation PERSISTENT TEXT LINE "
        ):
            removed.append(track)
        else:
            kept.append(track)
    if not removed:
        raise RuntimeError("No explanation text track found as template.")
    draft["tracks"] = kept
    template_track = removed[0]
    template_segment = template_track["segments"][0]
    template_material = material_by_id(draft["materials"], template_segment["material_id"])
    if template_material is None:
        raise RuntimeError("Explanation text template material not found.")

    line_tracks: list[list[dict[str, Any]]] = [[] for _ in range(5)]
    for index, item in enumerate(timed):
        bg_range = bg_track["segments"][index]["target_timerange"]
        audio_range = audio_track["segments"][index]["target_timerange"]
        window_start = int(bg_range["start"])
        window_end = window_start + int(bg_range["duration"])
        audio_start = int(audio_range["start"])
        audio_end = audio_start + int(audio_range["duration"])
        end = window_end - 120_000
        blocks = item.get("timed_blocks", [])
        starts = visual_starts(window_start, audio_start, audio_end, blocks)
        for line_index, block in enumerate(blocks[:5]):
            start = max(window_start + 80_000, min(starts[line_index], end - 700_000))
            text = flatten_block(block.get("text", ""))
            material = make_text_material(template_material, text)
            draft["materials"].setdefault("texts", []).append(material)
            segment = copy.deepcopy(template_segment)
            segment["id"] = gid()
            segment["material_id"] = material["id"]
            segment["source_timerange"] = None
            segment["target_timerange"] = {"start": start, "duration": end - start}
            segment["visible"] = True
            segment["clip"]["transform"] = {"x": -0.18, "y": LINE_Y[line_index]}
            segment["clip"]["scale"] = {"x": 1.0, "y": 1.0}
            line_tracks[line_index].append(segment)

    total = 0
    for line_index, segments in enumerate(line_tracks, start=1):
        segments.sort(key=lambda s: int(s["target_timerange"]["start"]))
        total += len(segments)
        draft["tracks"].append(
            clone_track(
                template_track,
                f"CODEx construction explanation PERSISTENT TEXT LINE {line_index}",
                segments,
            )
        )

    write_json(CONTENT_PATH, draft)
    if TMP_PATH.exists():
        write_json(TMP_PATH, draft)
    meta = read_json(META_PATH)
    meta["tm_duration"] = draft["duration"]
    write_json(META_PATH, meta)
    report = {
        "backup": str(backup_path),
        "draft_dir": str(DRAFT_DIR),
        "persistent_text_segments": total,
        "line_tracks": 5,
    }
    report_path = ASSETS_DIR / "persistent_explanation_text_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
