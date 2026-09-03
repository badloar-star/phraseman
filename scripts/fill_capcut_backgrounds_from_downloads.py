#!/usr/bin/env python3
"""Fill a CapCut background track with whole, consecutive download videos.

The script deliberately refuses to make a partial final clip.  It uses every
fresh video once, then repeats a few complete videos only when needed to make
the CapCut timeline end exactly on its existing duration.
"""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import json
import random
import shutil
import subprocess
import sys
import uuid
from pathlib import Path


VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".m4v", ".avi", ".webm"}
FPS = 30
MICROS_PER_SECOND = 1_000_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--downloads", type=Path, required=True)
    parser.add_argument("--modified-since", required=True,
                        help="Local ISO timestamp, e.g. 2026-09-03T11:00:00")
    parser.add_argument("--seed", default="MAYMAY-download-backgrounds-20260903")
    parser.add_argument("--track-index", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def run_ffprobe(path: Path) -> tuple[int, int, int]:
    command = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=width,height", "-of", "json", str(path),
    ]
    try:
        result = subprocess.run(command, check=True, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        payload = json.loads(result.stdout)
        seconds = float(payload["format"]["duration"])
        stream = next((s for s in payload.get("streams", []) if s.get("width")), {})
        width, height = int(stream.get("width", 1080)), int(stream.get("height", 1920))
    except (subprocess.CalledProcessError, KeyError, ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Unable to inspect {path.name}: {exc}") from exc
    source_us = round(seconds * MICROS_PER_SECOND)
    frames = round(seconds * FPS)
    if source_us <= 0 or frames <= 0:
        raise RuntimeError(f"Invalid duration for {path.name}")
    return source_us, frames, width, height


def fresh_videos(downloads: Path, modified_since: dt.datetime) -> list[dict]:
    candidates = sorted(
        (path for path in downloads.iterdir()
         if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS
         and dt.datetime.fromtimestamp(path.stat().st_mtime) >= modified_since),
        key=lambda path: path.name.casefold(),
    )
    if not candidates:
        raise RuntimeError("No fresh video files found.")
    items: list[dict] = []
    for path in candidates:
        source_us, frames, width, height = run_ffprobe(path)
        items.append({"path": path, "source_us": source_us, "frames": frames,
                      "width": width, "height": height})
    return items


def exact_extra_indices(items: list[dict], missing_frames: int) -> list[int]:
    """Return a repeatable list of whole clips whose frames total exactly missing."""
    if missing_frames == 0:
        return []
    # Unbounded forward dynamic programming: repeats are allowed, trims are not.
    previous: list[tuple[int, int] | None] = [None] * (missing_frames + 1)
    previous[0] = (-1, -1)
    for total in range(missing_frames + 1):
        if previous[total] is None:
            continue
        for index, item in enumerate(items):
            next_total = total + item["frames"]
            if next_total <= missing_frames and previous[next_total] is None:
                previous[next_total] = (total, index)
    if previous[missing_frames] is None:
        raise RuntimeError(
            f"Whole clips cannot exactly cover the remaining {missing_frames} frames; "
            "the draft was not changed."
        )
    indices: list[int] = []
    cursor = missing_frames
    while cursor:
        prior, index = previous[cursor]  # type: ignore[misc]
        indices.append(index)
        cursor = prior
    return indices


def material_for(item: dict, base: dict) -> dict:
    material = copy.deepcopy(base)
    material_id = str(uuid.uuid4()).upper()
    material["id"] = material_id
    material["duration"] = item["source_us"]
    material["path"] = str(item["path"]).replace("\\", "/")
    material["media_path"] = ""
    material["material_name"] = item["path"].name
    material["name"] = None
    material["width"] = item["width"]
    material["height"] = item["height"]
    material["crop"] = {"lower_left_x": 0.0, "lower_left_y": 1.0,
                        "lower_right_x": 1.0, "lower_right_y": 1.0,
                        "upper_left_x": 0.0, "upper_left_y": 0.0,
                        "upper_right_x": 1.0, "upper_right_y": 0.0}
    material["crop_ratio"] = "free"
    material["crop_scale"] = 1.0
    return material


def frame_boundary_us(frame: int) -> int:
    return round(frame * MICROS_PER_SECOND / FPS)


def segment_for(item: dict, material_id: str, start_frame: int, base: dict) -> dict:
    segment = copy.deepcopy(base)
    segment["id"] = str(uuid.uuid4()).upper()
    segment["material_id"] = material_id
    end_frame = start_frame + item["frames"]
    segment["target_timerange"] = {
        "start": frame_boundary_us(start_frame),
        "duration": frame_boundary_us(end_frame) - frame_boundary_us(start_frame),
    }
    # Full source duration, starting at frame zero: no trim/crop/time-stretch.
    segment["source_timerange"] = {"start": 0, "duration": item["source_us"]}
    segment["volume"] = 0.0
    segment["visible"] = True
    segment["clip"] = {"alpha": 1.0, "flip": {"horizontal": False, "vertical": False},
                       "rotation": 0.0, "scale": {"x": 1.0, "y": 1.0},
                       "transform": {"x": 0.0, "y": 0.0}}
    return segment


def validate(segments: list[dict], materials: dict[str, dict], target_duration_us: int) -> None:
    cursor = 0
    for segment in segments:
        target = segment["target_timerange"]
        source = segment["source_timerange"]
        material = materials[segment["material_id"]]
        if target["start"] != cursor:
            raise RuntimeError("Gap or overlap detected in generated background track.")
        if source["start"] != 0 or source["duration"] != material["duration"]:
            raise RuntimeError("A generated background would be trimmed; refusing to write.")
        if segment.get("volume") != 0.0:
            raise RuntimeError("Generated background audio was not muted.")
        cursor += target["duration"]
    if cursor != target_duration_us:
        raise RuntimeError(f"Background end {cursor} does not equal draft duration {target_duration_us}.")


def main() -> int:
    args = parse_args()
    modified_since = dt.datetime.fromisoformat(args.modified_since)
    draft = args.draft.resolve()
    if not draft.is_file():
        raise RuntimeError(f"Draft not found: {draft}")
    data = json.loads(draft.read_text(encoding="utf-8"))
    target_duration_us = int(data["duration"])
    tracks = data["tracks"]
    track = tracks[args.track_index]
    if track.get("type") != "video" or not track.get("segments"):
        raise RuntimeError(f"Track {args.track_index} is not a populated video background track.")
    base_segment = track["segments"][0]
    videos = data["materials"]["videos"]
    base_material = next((m for m in videos if m.get("id") == base_segment.get("material_id")), None)
    if base_material is None:
        raise RuntimeError("Background base material is missing.")

    items = fresh_videos(args.downloads.resolve(), modified_since)
    rng = random.Random(args.seed)
    rng.shuffle(items)
    target_frames = target_duration_us * FPS // MICROS_PER_SECOND
    all_frames = sum(item["frames"] for item in items)
    if all_frames > target_frames:
        raise RuntimeError("Fresh videos are longer than the draft; fulfilling without trims is impossible.")
    extra_indices = exact_extra_indices(items, target_frames - all_frames)
    extras = [items[index] for index in extra_indices]
    rng.shuffle(extras)
    playlist = items + extras

    print(f"fresh={len(items)} repeat_full_clips={len(extras)} frames={sum(x['frames'] for x in playlist)} target={target_frames}")
    print("repeats=" + ", ".join(item["path"].name for item in extras))
    if args.dry_run:
        return 0

    new_materials: list[dict] = []
    generated_segments: list[dict] = []
    cursor_frame = 0
    for item in playlist:
        material = material_for(item, base_material)
        new_materials.append(material)
        segment = segment_for(item, material["id"], cursor_frame, base_segment)
        generated_segments.append(segment)
        cursor_frame += item["frames"]
    all_materials = {m["id"]: m for m in new_materials}
    validate(generated_segments, all_materials, target_duration_us)

    track["segments"] = generated_segments
    videos.extend(new_materials)
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = draft.with_name(f"draft_content.before_download_backgrounds_{timestamp}.json")
    shutil.copy2(draft, backup)
    temporary = draft.with_suffix(".json.backgrounds-pending")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(draft)
    print(f"written={draft}")
    print(f"backup={backup}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
