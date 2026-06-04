from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any


US = 1_000_000
SOURCE_DRAFT_NAME = "VENGA A1 200 OPENAI FIXED 20260530_144717"
TARGET_DRAFT_NAME = "VENGA A1 200 OPENAI LAYOUT FIX"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def unique_draft_dir(root: Path, base_name: str) -> Path:
    candidate = root / base_name
    if not candidate.exists():
        return candidate
    return root / f"{base_name} {time.strftime('%Y%m%d_%H%M%S')}"


def parse_rows(path: Path) -> list[dict[str, str]]:
    import re

    rows: list[dict[str, str]] = []
    pattern = re.compile(r"^(\d+)\.\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$")
    for line in path.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line.strip())
        if not match:
            continue
        rows.append(
            {
                "ru": match.group(2).strip(),
                "en": match.group(3).strip(),
                "ipa": match.group(4).strip(),
                "breakdown": match.group(5).strip(),
            }
        )
    if len(rows) != 200:
        raise SystemExit(f"Expected 200 phrase rows, got {len(rows)}")
    return rows


def balanced_two_line(text: str, threshold: int) -> str:
    if len(text) <= threshold or " " not in text:
        return text
    words = text.split()
    best: tuple[int, str, str] | None = None
    for i in range(1, len(words)):
        left = " ".join(words[:i])
        right = " ".join(words[i:])
        score = abs(len(left) - len(right)) + max(len(left), len(right)) // 8
        if best is None or score < best[0]:
            best = (score, left, right)
    assert best is not None
    return f"{best[1]}\n{best[2]}"


def two_line_breakdown(text: str) -> str:
    parts = [part.strip() for part in text.split(";") if part.strip()]
    if len(text) <= 58:
        return text
    if len(parts) >= 2:
        best: tuple[int, str, str] | None = None
        for i in range(1, len(parts)):
            left = "; ".join(parts[:i])
            right = "; ".join(parts[i:])
            score = abs(len(left) - len(right))
            if best is None or score < best[0]:
                best = (score, left, right)
        assert best is not None
        return f"{best[1]}\n{best[2]}"
    return balanced_two_line(text, 58)


def display_text(field: str, value: str) -> str:
    if field == "ru":
        return balanced_two_line(value, 26)
    if field == "en":
        return balanced_two_line(value, 24)
    if field == "ipa":
        return balanced_two_line(value, 34)
    if field == "breakdown":
        return two_line_breakdown(value)
    return value


def update_text_material(material: dict[str, Any], text: str) -> None:
    content = json.loads(material.get("content") or "{}")
    content["text"] = text
    text_length = len(text)
    for style in content.get("styles", []):
        style["range"] = [0, text_length]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def set_text_layout(segment: dict[str, Any], track_index: int) -> None:
    clip = segment.setdefault("clip", {})
    transform = clip.setdefault("transform", {})
    scale_obj = clip.setdefault("scale", {})
    if track_index == 6:
        x, y, scale = 0.0, -0.5555555555555556, 1.08
    elif track_index == 7:
        x, y, scale = 0.48, -0.23148148148148148, 0.92
    elif track_index == 8:
        x, y, scale = 0.0, 0.6018518518518519, 1.08
    else:
        x, y, scale = 0.0, 0.0925925925925926, 0.78
    transform["x"] = x
    transform["y"] = y
    scale_obj["x"] = scale
    scale_obj["y"] = scale


def apply_text_changes(draft: dict[str, Any], rows: list[dict[str, str]]) -> None:
    fields = {6: "ru", 7: "ipa", 8: "en", 9: "breakdown"}
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    for track_index, field in fields.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise SystemExit(f"Track {track_index} expected 200 text segments, got {len(segments)}")
        for i, segment in enumerate(segments):
            update_text_material(texts[segment["material_id"]], display_text(field, rows[i][field]))
            set_text_layout(segment, track_index)


def load_background_keyframes(repo_root: Path, base_source_us: int, source_duration_us: int, needed: int) -> list[int]:
    csv_path = repo_root / ".codex-tmp" / "venga-old-t-bg-keyframes-20260530.csv"
    if not csv_path.exists():
        return [base_source_us + i * 22 * US for i in range(needed)]
    values: list[int] = []
    min_start = max(0, base_source_us)
    max_start = max(min_start, base_source_us + source_duration_us - 25 * US)
    for line in csv_path.read_text(encoding="utf-8").splitlines():
        try:
            value = round(float(line.split(",", 1)[0]) * US)
        except ValueError:
            continue
        if min_start <= value <= max_start:
            values.append(value)
    if not values:
        return [base_source_us + i * 22 * US for i in range(needed)]
    # Spread across the whole source so adjacent phrase backgrounds are visibly different.
    return [values[round(i * (len(values) - 1) / max(1, needed - 1))] for i in range(needed)]


def rebuild_background_segments(draft: dict[str, Any], repo_root: Path) -> None:
    track = draft["tracks"][0]
    if not track["segments"]:
        return
    base = deepcopy(track["segments"][0])
    phrase_segments = draft["tracks"][6]["segments"]
    starts = [int(seg["target_timerange"]["start"]) for seg in phrase_segments]
    bg_end = int(phrase_segments[-1]["target_timerange"]["start"]) + int(phrase_segments[-1]["target_timerange"]["duration"])
    source_starts = load_background_keyframes(
        repo_root,
        int(base["source_timerange"]["start"]),
        int(base["source_timerange"]["duration"]),
        len(starts),
    )
    rebuilt: list[dict[str, Any]] = []
    for i, start in enumerate(starts):
        next_start = starts[i + 1] if i + 1 < len(starts) else bg_end
        duration = max(1, next_start - start)
        seg = deepcopy(base)
        seg["id"] = str(uuid.uuid4()).upper()
        seg["target_timerange"] = {"start": start, "duration": duration}
        seg["source_timerange"] = {"start": source_starts[i], "duration": duration}
        rebuilt.append(seg)
    track["segments"] = rebuilt


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> None:
    now_us = int(time.time() * US)
    project_id = str(uuid.uuid4()).upper()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us

    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    size = folder_size(draft_dir / "Resources")
    meta.update(
        {
            "draft_id": project_id,
            "draft_name": draft_dir.name,
            "draft_fold_path": draft_dir.as_posix(),
            "draft_root_path": draft_dir.parent.as_posix(),
            "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
            "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
            "draft_is_invisible": False,
            "streaming_edit_draft_ready": True,
            "tm_duration": draft["duration"],
            "tm_draft_modified": now_us,
            "draft_timeline_materials_size": size,
            "draft_timeline_materials_size_": size,
            "tm_draft_removed": 0,
        }
    )
    write_json(meta_path, meta)

    root_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_path)
    entry = {
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": size,
        "streaming_edit_draft_ready": True,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": draft["duration"],
    }
    root["all_draft_store"] = [
        entry,
        *[
            item
            for item in root.get("all_draft_store", [])
            if item.get("draft_name") != draft_dir.name
            and Path(str(item.get("draft_fold_path", ""))).as_posix().casefold() != draft_dir.as_posix().casefold()
            and item.get("draft_id") != project_id
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_json(root_path, root)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / SOURCE_DRAFT_NAME
    if not source_dir.exists():
        raise SystemExit(f"Source draft does not exist: {source_dir}")
    target_dir = unique_draft_dir(capcut_root, TARGET_DRAFT_NAME)
    shutil.copytree(source_dir, target_dir)

    draft = load_json(target_dir / "draft_content.json")
    rows = parse_rows(repo_root / "exports" / "venga-phrase-packs" / "first-200-a1-everyday-review.md")
    apply_text_changes(draft, rows)
    rebuild_background_segments(draft, repo_root)

    for rel in ["draft_content.json", "template-2.tmp", "draft_content.json.bak"]:
        path = target_dir / rel
        if path.exists():
            write_json(path, draft)
    timeline_content = target_dir / "Timelines" / draft["id"] / "draft_content.json"
    if timeline_content.exists():
        write_json(timeline_content, draft)
    update_identity_and_register(target_dir, draft)

    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_dir": str(source_dir),
        "changed_tracks": [0, 6, 7, 8, 9],
        "preserved_tracks": [1, 2, 10, 11, 12, 13],
        "background_segments": len(draft["tracks"][0]["segments"]),
    }
    out = repo_root / "exports" / "venga-phrase-packs" / "capcut_layout_only_build_report.json"
    write_json(out, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
