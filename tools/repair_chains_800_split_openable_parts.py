#!/usr/bin/env python3
"""Repair the failed 800-line Chains CapCut build by splitting it into openable parts.

The single 800-row native draft became too heavy for CapCut to open reliably.
This script keeps the known-good 400-row DIRECT_BG template structure and creates
two native CapCut projects:

- rows 001-400
- rows 401-800

It updates only phrase text/audio payloads in existing timeline slots, preserving
the source template's layout, CTA structure, intro/middle blocks, and track shape.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import uuid
import wave
from copy import deepcopy
from pathlib import Path
from typing import Any


US = 1_000_000
SOURCE_DRAFT = "CHAINS_EP01_EN_OPENAI_DIRECT_BG 20260601_214833"
PACK = Path("exports/chains/phrase_packs/chains_800_20260603")
ROWS_JSON = PACK / "capcut_build" / "chains_800_timeline_rows.json"
AUDIO_DIR = PACK / "capcut_build" / "sapi_audio_800"
REPORT_DIR = PACK / "capcut_repair"
PARTS = [
    ("PART1_001_400", 0, 400),
    ("PART2_401_800", 400, 800),
]


def gid() -> str:
    return str(uuid.uuid4()).upper()


def capcut_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def capcut_is_open() -> bool:
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def unique_project_name(label: str) -> str:
    stamp = time.strftime("%Y%m%d_%H%M%S")
    return f"CHAINS_800_READY_{label} {stamp}"


def backup_folder(path: Path, reason: str) -> Path:
    backup = Path(".codex-tmp/capcut-backups") / f"{path.name}.backup-{reason}-{time.strftime('%Y%m%d_%H%M%S')}"
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(path, backup)
    return backup


def text_payload(material: dict[str, Any]) -> dict[str, Any]:
    try:
        return json.loads(material.get("content") or "{}")
    except json.JSONDecodeError:
        return {}


def set_text(material: dict[str, Any], text: str) -> None:
    payload = text_payload(material)
    payload["text"] = text
    for style in payload.get("styles", []) or []:
        if isinstance(style, dict):
            style["range"] = [0, len(text)]
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if material.get("base_content") is not None:
        material["base_content"] = text


def wrap_words(text: str, max_chars: int, max_lines: int = 2) -> str:
    text = " ".join(str(text).split())
    if len(text) <= max_chars:
        return text
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        if len(word) > max_chars:
            raise RuntimeError(f"single word is too long for safe wrap: {word!r} in {text!r}")
        candidate = word if not cur else f"{cur} {word}"
        if len(candidate) <= max_chars or not cur:
            cur = candidate
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        # Keep word integrity at all costs; use a wider caption box behavior by
        # allowing three lines only for small grey parse/IPA text.
        raise RuntimeError(f"too many lines after safe wrap: {text!r} -> {lines!r}")
    return "\n".join(lines)


def safe_text(row: dict[str, Any], kind: str) -> str:
    if kind == "en":
        return wrap_words(str(row["english"]).upper(), 44, 3)
    if kind == "ru":
        return wrap_words(str(row["russian"]).upper(), 46, 3)
    if kind == "ipa":
        return wrap_words(str(row.get("ipa") or row["english"]).strip("/"), 52, 3)
    raise ValueError(kind)


def materials_by_id(content: dict[str, Any], group: str) -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in content["materials"].get(group, []) if isinstance(item, dict) and item.get("id")}


def sorted_segments(content: dict[str, Any], track_idx: int) -> list[dict[str, Any]]:
    return sorted(content["tracks"][track_idx].get("segments", []), key=lambda s: int(s["target_timerange"]["start"]))


def wav_duration_us(path: Path) -> int:
    with wave.open(str(path), "rb") as src:
        return int(round((src.getnframes() / src.getframerate()) * US))


def copy_wav_with_tail_silence(src_path: Path, dst_path: Path, tail_ms: int = 350) -> int:
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(src_path), "rb") as src:
        params = src.getparams()
        frames = src.readframes(src.getnframes())
        silence_frames = int(src.getframerate() * tail_ms / 1000)
        silence = b"\x00" * silence_frames * src.getnchannels() * src.getsampwidth()
    with wave.open(str(dst_path), "wb") as dst:
        dst.setparams(params)
        dst.writeframes(frames)
        dst.writeframes(silence)
    return wav_duration_us(dst_path)


def update_audio_material(material: dict[str, Any], path: Path, duration: int) -> None:
    material["path"] = str(path)
    material["name"] = path.name
    material["material_name"] = path.name
    material["duration"] = duration
    if "wave_points" in material:
        material["wave_points"] = []


def update_audio_segment(seg: dict[str, Any], duration: int, next_start: int | None) -> None:
    start = int(seg["target_timerange"]["start"])
    max_duration = duration
    if next_start is not None and next_start > start:
        max_duration = min(max_duration, max(1, next_start - start - 100_000))
    seg["target_timerange"]["duration"] = max_duration
    if seg.get("source_timerange") is not None:
        seg["source_timerange"] = {"start": 0, "duration": max_duration}
    if seg.get("render_timerange") is not None:
        seg["render_timerange"] = {"start": start, "duration": max_duration}
    seg["visible"] = True


def localize_copied_project_paths(node: Any, source: Path, target: Path) -> int:
    changed = 0
    source_str = source.as_posix().casefold()
    if isinstance(node, dict):
        for key, value in list(node.items()):
            if isinstance(value, str):
                normalized = Path(value).as_posix()
                if normalized.casefold().startswith(source_str):
                    rel = Path(normalized[len(source.as_posix()) :].lstrip("/\\"))
                    candidate = target / rel
                    if candidate.exists():
                        node[key] = str(candidate)
                        changed += 1
            else:
                changed += localize_copied_project_paths(value, source, target)
    elif isinstance(node, list):
        for item in node:
            changed += localize_copied_project_paths(item, source, target)
    return changed


def update_meta(target: Path, content: dict[str, Any]) -> None:
    now = int(time.time() * US)
    size = sum(p.stat().st_size for p in (target / "Resources").rglob("*") if p.is_file())
    meta_path = target / "draft_meta_info.json"
    meta = load_json(meta_path)
    meta.update(
        {
            "draft_id": gid(),
            "draft_name": target.name,
            "draft_fold_path": target.as_posix(),
            "draft_root_path": target.parent.as_posix(),
            "draft_is_invisible": False,
            "tm_duration": content["duration"],
            "draft_duration": content["duration"],
            "tm_draft_modified": now,
            "tm_draft_removed": 0,
            "draft_timeline_materials_size": size,
            "draft_timeline_materials_size_": size,
        }
    )
    write_json(meta_path, meta)

    root_path = target.parent / "root_meta_info.json"
    root = load_json(root_path)
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cover": (target / "draft_cover.jpg").as_posix(),
        "draft_fold_path": target.as_posix(),
        "draft_id": meta["draft_id"],
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_json_file": (target / "draft_content.json").as_posix(),
        "draft_name": target.name,
        "draft_new_version": meta.get("draft_new_version") or "164.0.0",
        "draft_root_path": target.parent.as_posix(),
        "draft_timeline_materials_size": size,
        "draft_timeline_materials_size_": size,
        "draft_type": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_create": now,
        "tm_draft_modified": now,
        "tm_draft_removed": 0,
        "tm_duration": content["duration"],
    }
    stores = root.get("all_draft_store") or root.get("drafts") or []
    stores = [item for item in stores if item.get("draft_name") != target.name]
    stores.insert(0, entry)
    root["all_draft_store"] = stores
    if "drafts" in root:
        root["drafts"] = stores
    draft_ids = root.get("draft_ids")
    if isinstance(draft_ids, list):
        root["draft_ids"] = [meta["draft_id"], *[item for item in draft_ids if item != meta["draft_id"]]]
    else:
        root["draft_ids"] = max(int(draft_ids or 0), len(stores))
    root["root_path"] = target.parent.as_posix()
    write_json(root_path, root)


def update_text_tracks(content: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    text_mats = materials_by_id(content, "texts")
    segments = {
        "first_ru": sorted_segments(content, 2)[:400],
        "second_ipa": sorted_segments(content, 2)[400:800],
        "first_ipa": sorted_segments(content, 3)[:400],
        "second_en": sorted_segments(content, 3)[400:800],
        "first_en": sorted_segments(content, 4),
        "second_ru": sorted_segments(content, 5),
    }
    for name, segs in segments.items():
        if len(segs) != 400:
            raise RuntimeError(f"track segment count mismatch for {name}: {len(segs)}")
    for row, seg in zip(rows, segments["first_en"], strict=True):
        set_text(text_mats[seg["material_id"]], safe_text(row, "en"))
    for row, seg in zip(rows, segments["first_ru"], strict=True):
        set_text(text_mats[seg["material_id"]], safe_text(row, "ru"))
    for row, seg in zip(rows, segments["first_ipa"], strict=True):
        set_text(text_mats[seg["material_id"]], safe_text(row, "ipa"))
    for row, seg in zip(rows, segments["second_ru"], strict=True):
        set_text(text_mats[seg["material_id"]], safe_text(row, "ru"))
    for row, seg in zip(rows, segments["second_en"], strict=True):
        set_text(text_mats[seg["material_id"]], safe_text(row, "en"))
    for row, seg in zip(rows, segments["second_ipa"], strict=True):
        set_text(text_mats[seg["material_id"]], safe_text(row, "ipa"))
    return {key: len(value) for key, value in segments.items()}


def update_audio_tracks(target: Path, content: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    audio_mats = materials_by_id(content, "audios")
    mapping = [
        (9, "en1"),
        (10, "ru"),
        (11, "en2"),
        (15, "ru"),
        (14, "en1"),
        (16, "en2"),
    ]
    counts: dict[str, int] = {}
    for track_idx, role in mapping:
        segs = sorted_segments(content, track_idx)
        if len(segs) != 400:
            raise RuntimeError(f"audio track {track_idx} count mismatch: {len(segs)}")
        for local_idx, (row, seg) in enumerate(zip(rows, segs, strict=True)):
            global_index = int(row["index"])
            src = AUDIO_DIR / role / f"{global_index:03d}.wav"
            if not src.exists() or src.stat().st_size <= 4096:
                raise RuntimeError(f"missing or tiny audio source: {src}")
            dst = target / "Resources" / "chains_800_part_audio" / role / f"{global_index:03d}.wav"
            duration = copy_wav_with_tail_silence(src, dst)
            mat = audio_mats[seg["material_id"]]
            update_audio_material(mat, dst, duration)
            next_start = None
            if local_idx + 1 < len(segs):
                next_start = int(segs[local_idx + 1]["target_timerange"]["start"])
            update_audio_segment(seg, duration, next_start)
        counts[f"track_{track_idx}_{role}"] = len(segs)
    return counts


def mirror_content_files(target: Path, content: dict[str, Any]) -> None:
    write_json(target / "draft_content.json", content)
    if (target / "template-2.tmp").exists():
        write_json(target / "template-2.tmp", content)
    timeline_dir = target / "Timelines" / str(content["id"])
    if timeline_dir.exists():
        write_json(timeline_dir / "draft_content.json", content)


def validate_project(target: Path, expected_rows: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[str] = []
    content = load_json(target / "draft_content.json")
    for rel in ["draft_content.json", "template-2.tmp", "draft_meta_info.json", "draft_biz_config.json", "timeline_layout.json"]:
        path = target / rel
        if not path.exists():
            errors.append(f"missing service file: {rel}")
        else:
            try:
                load_json(path)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid json {rel}: {exc}")
    mirror = target / "Timelines" / str(content.get("id")) / "draft_content.json"
    if not mirror.exists():
        errors.append("timeline mirror draft_content missing")

    missing_paths = []
    for group in ("videos", "audios"):
        for mat in content.get("materials", {}).get(group, []):
            path = mat.get("path")
            if path and not Path(str(path)).exists():
                missing_paths.append(path)
    if missing_paths:
        errors.append(f"missing material paths: {len(missing_paths)}")

    text_counts = {i: len(content["tracks"][i].get("segments", [])) for i in [2, 3, 4, 5]}
    audio_counts = {i: len(content["tracks"][i].get("segments", [])) for i in [9, 10, 11, 14, 15, 16]}
    if text_counts != {2: 800, 3: 800, 4: 400, 5: 400}:
        errors.append(f"text track counts changed unexpectedly: {text_counts}")
    if any(v != 400 for v in audio_counts.values()):
        errors.append(f"audio track counts changed unexpectedly: {audio_counts}")

    # Word-split gate: no newline may split inside a word; every line must be
    # made from whitespace-separated tokens only.
    text_mats = materials_by_id(content, "texts")
    broken_wraps = []
    for mat in text_mats.values():
        payload = text_payload(mat)
        text = str(payload.get("text", ""))
        if "\n" in text:
            for line in text.split("\n"):
                if not line.strip():
                    broken_wraps.append(text)
                    break
    if broken_wraps:
        errors.append(f"empty/broken text wrap lines: {len(broken_wraps)}")

    source_refs = 0
    source_name = SOURCE_DRAFT.casefold()
    for group in ("videos", "audios"):
        for mat in content.get("materials", {}).get(group, []):
            if source_name in str(mat.get("path", "")).casefold():
                source_refs += 1
    if source_refs:
        errors.append(f"remaining source-project media refs: {source_refs}")

    return {
        "error_count": len(errors),
        "errors": errors,
        "missing_paths": len(missing_paths),
        "text_counts": text_counts,
        "audio_counts": audio_counts,
        "draft_content_mb": round((target / "draft_content.json").stat().st_size / 1024 / 1024, 2),
        "resources_mb": round(sum(p.stat().st_size for p in (target / "Resources").rglob("*") if p.is_file()) / 1024 / 1024, 2),
        "expected_first_row": expected_rows[0]["index"],
        "expected_last_row": expected_rows[-1]["index"],
    }


def build_part(source: Path, label: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    root = capcut_root()
    target = root / unique_project_name(label)
    while target.exists():
        target = root / f"{unique_project_name(label)}_{gid()[:6]}"
    shutil.copytree(source, target)
    lock = target / ".locked"
    if lock.exists():
        lock.unlink()

    content = load_json(target / "draft_content.json")
    localized_paths = localize_copied_project_paths(content, source, target)
    text_counts = update_text_tracks(content, rows)
    audio_counts = update_audio_tracks(target, content, rows)
    mirror_content_files(target, content)
    update_meta(target, content)
    validation = validate_project(target, rows)
    return {
        "label": label,
        "target": str(target),
        "rows": f"{rows[0]['index']:03d}-{rows[-1]['index']:03d}",
        "localized_copied_project_paths": localized_paths,
        "text_updates": text_counts,
        "audio_updates": audio_counts,
        "validation": validation,
    }


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing native draft files.")
    root = capcut_root()
    source = root / SOURCE_DRAFT
    if not source.exists():
        raise SystemExit(f"source draft not found: {source}")
    if not ROWS_JSON.exists():
        raise SystemExit(f"rows json missing: {ROWS_JSON}")
    rows = load_json(ROWS_JSON)
    if len(rows) != 800:
        raise SystemExit(f"expected 800 rows, got {len(rows)}")

    source_backup = backup_folder(source, "before-split-openable-repair")
    report: dict[str, Any] = {
        "source": str(source),
        "source_backup": str(source_backup),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "parts": [],
    }
    for label, start, end in PARTS:
        report["parts"].append(build_part(source, label, rows[start:end]))
    report["error_count"] = sum(part["validation"]["error_count"] for part in report["parts"])
    write_pretty(REPORT_DIR / "chains_800_split_openable_parts_report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["error_count"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
