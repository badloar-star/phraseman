#!/usr/bin/env python3
"""Repair Chains CapCut explanations and CTA layout.

Fixes three layout-level issues without changing existing phrase content:
- explanation captions become cumulative instead of disappearing;
- explanation windows shrink/expand from the actual voiceover length;
- the three VENGA CTA blocks are inserted into real gaps by shifting later
  timeline material, instead of overlapping lesson phrases.
"""

from __future__ import annotations

import copy
import argparse
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
SOURCE_CTA_DRAFT = (
    Path.home()
    / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft"
    / "VENGA_ES_200_0601_LANGFIX_FINAL 20260601_162739/draft_content.json"
)

US = 1_000_000
EXPLANATION_PAD_BEFORE_US = 150_000
EXPLANATION_PAD_AFTER_US = 1_650_000
CTA_INSERT_AFTER_EXPLANATIONS = [16, 33, 50]
SOURCE_CTA_TRACKS = [7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 22, 23, 24]


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
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-cumulative-cta-layout"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(DRAFT_DIR, out)
    return out


def material_by_id(materials: dict[str, Any], material_id: str) -> tuple[str | None, dict[str, Any] | None]:
    for collection, items in materials.items():
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and item.get("id") == material_id:
                    return collection, item
    return None, None


def text_from_material(material: dict[str, Any]) -> str:
    try:
        return json.loads(material.get("content", "{}")).get("text", "")
    except Exception:
        return material.get("base_content", "")


def make_text_material(template: dict[str, Any], text: str, font_size: float) -> dict[str, Any]:
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


def flatten_block(text: str) -> str:
    return " ".join(str(text).upper().replace("\\n", "\n").split())


def cumulative_font_size(line_count: int, max_line_len: int) -> float:
    if line_count <= 3 and max_line_len <= 32:
        return 6.2
    if line_count <= 4 and max_line_len <= 36:
        return 5.4
    return 4.7


def visual_block_starts(
    window_start: int,
    audio_duration: int,
    blocks: list[dict[str, Any]],
) -> list[int]:
    audio_start = window_start + EXPLANATION_PAD_BEFORE_US
    audio_end = audio_start + audio_duration
    safe_start = window_start + 600_000
    safe_end = audio_end + 700_000
    starts: list[int] = []
    min_gap = 1_150_000
    for block in blocks:
        raw = window_start + int(round(float(block.get("start_sec", 0)) * US))
        if starts:
            raw = max(raw, starts[-1] + min_gap)
        starts.append(max(safe_start, raw))
    if not starts:
        return starts
    if starts[-1] > safe_end:
        span_start = min(starts[0], audio_start + 3_000_000)
        span_end = max(span_start + (len(starts) - 1) * min_gap, audio_end - 1_500_000)
        gap = (span_end - span_start) / max(1, len(starts) - 1)
        starts = [int(span_start + gap * index) for index in range(len(starts))]
    return starts


def clone_track(template: dict[str, Any], name: str, segments: list[dict[str, Any]]) -> dict[str, Any]:
    track = copy.deepcopy(template)
    track["id"] = gid()
    track["name"] = name
    track["is_default_name"] = False
    track["segments"] = segments
    return track


def shift_after(draft: dict[str, Any], point: int, delta: int, excluded_track_names: set[str] | None = None) -> None:
    if delta == 0:
        return
    excluded_track_names = excluded_track_names or set()
    for track in draft.get("tracks", []):
        if track.get("name", "") in excluded_track_names:
            continue
        for segment in track.get("segments", []):
            timerange = segment.get("target_timerange")
            if not isinstance(timerange, dict):
                continue
            start = int(timerange.get("start", 0))
            duration = int(timerange.get("duration", 0))
            end = start + duration
            if start >= point:
                timerange["start"] = start + delta
            elif start < point < end:
                timerange["duration"] = max(1, duration + delta)


def remove_tracks_by_name(draft: dict[str, Any], names: set[str]) -> list[dict[str, Any]]:
    removed: list[dict[str, Any]] = []
    kept: list[dict[str, Any]] = []
    for track in draft.get("tracks", []):
        if track.get("name", "") in names:
            removed.append(track)
        else:
            kept.append(track)
    draft["tracks"] = kept
    return removed


def find_track(draft: dict[str, Any], name: str) -> dict[str, Any]:
    for track in draft.get("tracks", []):
        if track.get("name") == name:
            return track
    raise RuntimeError(f"Track not found: {name}")


def repair_explanation_windows(draft: dict[str, Any], timed: list[dict[str, Any]]) -> dict[str, Any]:
    bg_track = find_track(draft, "CODEx construction explanation SCREENSAVER")
    audio_track = find_track(draft, "CODEx construction explanation UNIQUE VO")
    if len(bg_track.get("segments", [])) != len(timed):
        raise RuntimeError("Explanation screensaver segment count does not match timed explanations.")
    if len(audio_track.get("segments", [])) != len(timed):
        raise RuntimeError("Explanation audio segment count does not match timed explanations.")

    window_durations: list[int] = []
    for index, item in enumerate(timed):
        bg_segment = bg_track["segments"][index]
        audio_segment = audio_track["segments"][index]
        bg_range = bg_segment["target_timerange"]
        audio_duration = int(round(float(item["duration_sec"]) * US))
        old_start = int(bg_range["start"])
        old_duration = int(bg_range["duration"])
        old_end = old_start + old_duration
        new_duration = audio_duration + EXPLANATION_PAD_BEFORE_US + EXPLANATION_PAD_AFTER_US
        new_end = old_start + new_duration

        bg_range["duration"] = new_duration
        bg_segment["is_loop"] = True
        bg_segment["visible"] = True
        if isinstance(bg_segment.get("source_timerange"), dict):
            bg_segment["source_timerange"]["start"] = 0
            bg_segment["source_timerange"]["duration"] = min(20 * US, new_duration)

        audio_segment["target_timerange"] = {
            "start": old_start + EXPLANATION_PAD_BEFORE_US,
            "duration": audio_duration,
        }
        audio_segment["source_timerange"] = {"start": 0, "duration": audio_duration}
        audio_segment["visible"] = True
        audio_segment["volume"] = 1.0
        audio_segment["last_nonzero_volume"] = 1.0

        delta = new_end - old_end
        shift_after(
            draft,
            old_end,
            delta,
            excluded_track_names={
                "CODEx construction explanation SCREENSAVER",
                "CODEx construction explanation UNIQUE VO",
            },
        )
        # Shift later explanation windows after this old end; current segment was
        # already directly rewritten, so only subsequent segments move.
        for later_track in (bg_track, audio_track):
            for later in later_track.get("segments", [])[index + 1 :]:
                tr = later.get("target_timerange", {})
                if int(tr.get("start", 0)) >= old_end:
                    tr["start"] = int(tr["start"]) + delta
        window_durations.append(new_duration)

    return {
        "explanation_windows": len(window_durations),
        "min_window_duration": min(window_durations) if window_durations else 0,
        "max_window_duration": max(window_durations) if window_durations else 0,
    }


def rebuild_cumulative_explanation_text(draft: dict[str, Any], timed: list[dict[str, Any]]) -> dict[str, Any]:
    removed = remove_tracks_by_name(
        draft,
        {
            "CODEx construction explanation TIMED TEXT",
            "CODEx construction explanation PERSISTENT TEXT LINE 1",
            "CODEx construction explanation PERSISTENT TEXT LINE 2",
            "CODEx construction explanation PERSISTENT TEXT LINE 3",
            "CODEx construction explanation PERSISTENT TEXT LINE 4",
            "CODEx construction explanation PERSISTENT TEXT LINE 5",
        },
    )
    if not removed:
        raise RuntimeError("No existing timed explanation text track to use as template.")
    template_track = removed[0]
    template_segment = template_track["segments"][0]
    _, template_material = material_by_id(draft["materials"], template_segment["material_id"])
    if template_material is None:
        raise RuntimeError("Timed explanation text material template not found.")

    bg_track = find_track(draft, "CODEx construction explanation SCREENSAVER")
    line_tracks: list[list[dict[str, Any]]] = [[] for _ in range(5)]
    line_y = [-0.17, -0.085, 0.0, 0.085, 0.17]
    for index, item in enumerate(timed):
        window = bg_track["segments"][index]["target_timerange"]
        window_start = int(window["start"])
        window_end = window_start + int(window["duration"])
        audio_duration = int(round(float(item["duration_sec"]) * US))
        audio_end = window_start + EXPLANATION_PAD_BEFORE_US + audio_duration
        blocks = item.get("timed_blocks", [])
        starts = visual_block_starts(window_start, audio_duration, blocks)
        for block_index, block in enumerate(blocks):
            text = flatten_block(block.get("text", ""))
            if block_index == 0:
                start = window_start + EXPLANATION_PAD_BEFORE_US
            else:
                start = starts[block_index]
            end = min(audio_end + 1_000_000, window_end - 120_000)
            start = max(window_start + 80_000, min(start, end - 700_000))

            font_size = cumulative_font_size(5, len(text))
            text_material = make_text_material(template_material, text, font_size)
            draft["materials"].setdefault("texts", []).append(text_material)
            segment = copy.deepcopy(template_segment)
            segment["id"] = gid()
            segment["material_id"] = text_material["id"]
            segment["source_timerange"] = None
            segment["target_timerange"] = {"start": start, "duration": end - start}
            segment["visible"] = True
            segment["clip"]["transform"] = {"x": -0.18, "y": line_y[block_index]}
            segment["clip"]["scale"] = {"x": 1.0, "y": 1.0}
            line_tracks[block_index].append(segment)

    total = 0
    for line_index, segments in enumerate(line_tracks, start=1):
        segments.sort(key=lambda segment: segment["target_timerange"]["start"])
        total += len(segments)
        draft["tracks"].append(
            clone_track(
                template_track,
                f"CODEx construction explanation PERSISTENT TEXT LINE {line_index}",
                segments,
            )
        )
    return {"persistent_text_segments": total}


def source_venga_cta_draft() -> dict[str, Any]:
    source = read_json(SOURCE_CTA_DRAFT)
    for material in source.get("materials", {}).get("drafts", []):
        draft = material.get("draft", {})
        if draft.get("name") == "VENGA BEAR":
            return draft
    raise RuntimeError("VENGA BEAR source CTA compound not found.")


def clone_material(
    target: dict[str, Any],
    source_materials: dict[str, Any],
    old_id: str,
    id_map: dict[str, str],
) -> str:
    if not old_id:
        return old_id
    if old_id in id_map:
        return id_map[old_id]
    collection, material = material_by_id(source_materials, old_id)
    if material is None or collection is None:
        return old_id
    new_material = copy.deepcopy(material)
    new_id = gid()
    id_map[old_id] = new_id
    new_material["id"] = new_id
    if "unique_id" in new_material:
        new_material["unique_id"] = gid()
    # Localize media paths when the same asset already exists in current draft resources.
    for key in ("path", "source_path", "media_path"):
        value = new_material.get(key)
        if isinstance(value, str) and value:
            candidate = DRAFT_DIR / "Resources" / "chains_enhanced_cta_assets" / Path(value).name
            if candidate.exists():
                new_material[key] = str(candidate)
    target["materials"].setdefault(collection, []).append(new_material)
    return new_id


def clone_segment_with_materials(
    target: dict[str, Any],
    source_materials: dict[str, Any],
    source_segment: dict[str, Any],
    id_map: dict[str, str],
) -> dict[str, Any]:
    segment = copy.deepcopy(source_segment)
    segment["id"] = gid()
    if segment.get("material_id"):
        segment["material_id"] = clone_material(target, source_materials, segment["material_id"], id_map)
    if segment.get("extra_material_refs"):
        segment["extra_material_refs"] = [
            clone_material(target, source_materials, ref, id_map)
            for ref in segment["extra_material_refs"]
        ]
    segment["visible"] = True
    return segment


def cta_source_groups(source: dict[str, Any]) -> tuple[list[int], int]:
    # In the VENGA source compound, the three CTA blocks are anchored by the
    # main CTA audio track. Other VENGA tracks contain non-CTA decorations far
    # away from these blocks, so broad clustering would accidentally swallow
    # unrelated material.
    audio_track = source["tracks"][18]
    bases = [
        int(segment["target_timerange"]["start"])
        for segment in audio_track.get("segments", [])[:3]
    ]
    if len(bases) != 3:
        raise RuntimeError(f"Expected 3 VENGA CTA audio bases, got {len(bases)}")

    duration = max(
        int(segment["target_timerange"]["duration"])
        for segment in audio_track.get("segments", [])[:3]
    )
    return bases, duration


def remove_existing_cta_tracks(draft: dict[str, Any]) -> None:
    draft["tracks"] = [
        track
        for track in draft.get("tracks", [])
        if not str(track.get("name", "")).startswith("CODEx CTA ")
    ]


def insert_venga_cta_in_gaps(draft: dict[str, Any]) -> dict[str, Any]:
    remove_existing_cta_tracks(draft)
    source = source_venga_cta_draft()
    source_tracks = [source["tracks"][index] for index in SOURCE_CTA_TRACKS]
    source_bases, cta_duration = cta_source_groups(source)
    id_map: dict[str, str] = {}
    inserted_at: list[int] = []
    added_tracks = 0

    for order, explanation_index in enumerate(CTA_INSERT_AFTER_EXPLANATIONS):
        bg_track = find_track(draft, "CODEx construction explanation SCREENSAVER")
        window = bg_track["segments"][explanation_index - 1]["target_timerange"]
        insert_at = int(window["start"]) + int(window["duration"])
        shift_after(draft, insert_at, cta_duration)
        inserted_at.append(insert_at)
        source_base = source_bases[order]

        for source_track in source_tracks:
            new_segments: list[dict[str, Any]] = []
            for source_segment in source_track.get("segments", []):
                start = int(source_segment["target_timerange"]["start"])
                if not (source_base <= start <= source_base + cta_duration):
                    continue
                segment = clone_segment_with_materials(draft, source["materials"], source_segment, id_map)
                segment["target_timerange"]["start"] = insert_at + (start - source_base)
                new_segments.append(segment)
            if new_segments:
                draft["tracks"].append(clone_track(source_track, "CODEx CTA VENGA SOURCE", new_segments))
                added_tracks += 1

    return {"cta_insertions": inserted_at, "cta_duration": cta_duration, "cta_tracks_added": added_tracks}


def update_duration(draft: dict[str, Any]) -> int:
    max_end = 0
    for track in draft.get("tracks", []):
        for segment in track.get("segments", []):
            tr = segment.get("target_timerange", {})
            max_end = max(max_end, int(tr.get("start", 0)) + int(tr.get("duration", 0)))
    draft["duration"] = max_end
    return max_end


def main() -> None:
    global DRAFT_DIR, CONTENT_PATH, META_PATH, TMP_PATH

    parser = argparse.ArgumentParser(description="Repair Chains explanation and CTA layout in a CapCut draft.")
    parser.add_argument("--draft-dir", type=Path, default=DRAFT_DIR)
    parser.add_argument("--allow-capcut-open", action="store_true")
    parser.add_argument("--report", type=Path, default=ASSETS_DIR / "layout_repair_report.json")
    args = parser.parse_args()

    DRAFT_DIR = args.draft_dir
    CONTENT_PATH = DRAFT_DIR / "draft_content.json"
    META_PATH = DRAFT_DIR / "draft_meta_info.json"
    TMP_PATH = DRAFT_DIR / "template-2.tmp"

    if capcut_is_open() and not args.allow_capcut_open:
        raise SystemExit("CapCut is open. Close CapCut before applying layout repair.")

    timed = read_json(TIMED_PATH)
    backup_path = backup()
    draft = read_json(CONTENT_PATH)

    report: dict[str, Any] = {"backup": str(backup_path), "draft_dir": str(DRAFT_DIR)}
    report.update(repair_explanation_windows(draft, timed))
    report.update(rebuild_cumulative_explanation_text(draft, timed))
    report.update(insert_venga_cta_in_gaps(draft))
    new_duration = update_duration(draft)

    write_json(CONTENT_PATH, draft)
    if TMP_PATH.exists():
        write_json(TMP_PATH, draft)
    meta = read_json(META_PATH)
    meta["tm_duration"] = new_duration
    write_json(META_PATH, meta)

    report["duration"] = new_duration
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
