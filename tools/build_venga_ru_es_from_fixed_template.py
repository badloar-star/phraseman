#!/usr/bin/env python3
"""Build RU->ES Venga CapCut draft from the latest fixed 19-track template."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any


US = 1_000_000
SOURCE_DRAFT = "VENGA RU DE NEWBG.backup-before-media-localize-2026-05-31-19-44-40"
TARGET_DRAFT = "VENGA_ES_200_0601"
PACK_DIR = Path("exports/venga-phrase-packs/ru-es-a1-vsscp")
INTRO_WAV = Path("exports/venga-phrase-packs/intro-russian-target-11labs/intro_ru_for_es_alina_beauty_slot_19s83.wav")
INTRO_DURATION_US = 19_833_333

TRACK_TEXT = {7: "ru", 8: "ipa", 9: "es", 10: "breakdown"}
TRACK_AUDIO = {15: "ru", 16: "es1", 17: "es2", 18: "es3"}
INTRO_TRACK = 14


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file()) if path.exists() else 0


def unique_draft_dir(root: Path, base_name: str) -> Path:
    candidate = root / base_name
    if not candidate.exists():
        return candidate
    return root / f"{base_name} {time.strftime('%Y%m%d_%H%M%S')}"


def content_paths(root: Path, timeline_id: str) -> list[Path]:
    paths = [root / "draft_content.json", root / "template-2.tmp", root / "Timelines" / timeline_id / "draft_content.json"]
    out: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        if path.exists():
            key = str(path.resolve()).casefold()
            if key not in seen:
                out.append(path)
                seen.add(key)
    return out


def rewrite_paths(value: Any, old_prefix: Path, target_dir: Path) -> Any:
    if isinstance(value, dict):
        return {key: rewrite_paths(child, old_prefix, target_dir) for key, child in value.items()}
    if isinstance(value, list):
        return [rewrite_paths(child, old_prefix, target_dir) for child in value]
    if isinstance(value, str):
        old_a = str(old_prefix)
        old_b = old_prefix.as_posix()
        if value.startswith(old_a):
            return str(target_dir) + value[len(old_a) :]
        if value.startswith(old_b):
            return target_dir.as_posix() + value[len(old_b) :]
    return value


def material_ids(segment: dict[str, Any]) -> list[str]:
    material_id = segment.get("material_id")
    if isinstance(material_id, str):
        return [material_id]
    if isinstance(material_id, list):
        return [item for item in material_id if isinstance(item, str)]
    return []


def material_path(material: dict[str, Any]) -> str:
    for key in ("path", "media_path", "file_Path", "file_path"):
        value = material.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def probe_duration_sec(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    return float(completed.stdout.strip())


def text_payload(material: dict[str, Any]) -> tuple[dict[str, Any], str]:
    raw = material.get("content") or "{}"
    payload = json.loads(raw)
    return payload, str(payload.get("text") or "")


def set_text(material: dict[str, Any], text: str) -> None:
    payload, old = text_payload(material)
    payload["text"] = text
    for style in payload.get("styles", []) or []:
        if isinstance(style, dict) and isinstance(style.get("range"), list):
            style["range"] = [0, len(text)]
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    material["content"] = encoded
    if "base_content" in material:
        material["base_content"] = encoded
    if "recognize_text" in material:
        material["recognize_text"] = text
    if "translate_original_text" in material:
        material["translate_original_text"] = text


def visual_len(text: str) -> int:
    return len(text)


def best_two_line_wrap(words: list[str]) -> str:
    best: tuple[int, int, str] | None = None
    for split in range(1, len(words)):
        left = " ".join(words[:split])
        right = " ".join(words[split:])
        score = max(visual_len(left), visual_len(right))
        balance = abs(visual_len(left) - visual_len(right))
        candidate = (score, balance, left + "\n" + right)
        if best is None or candidate < best:
            best = candidate
    return best[2] if best else " ".join(words)


def wrap_text(text: str, max_line: int, max_lines: int = 2) -> str:
    words = " ".join(text.split()).split()
    if not words:
        return ""
    one = " ".join(words)
    if visual_len(one) <= max_line:
        return one
    if max_lines == 2:
        return best_two_line_wrap(words)
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join([*current, word])
        if current and visual_len(trial) > max_line:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return "\n".join(lines)


def wrap_breakdown(text: str) -> str:
    parts: list[str] = []
    for line in text.splitlines():
        parts.extend(item.strip() for item in line.split(";") if item.strip())
    lines: list[str] = []
    for part in parts:
        if visual_len(part) <= 28:
            lines.append(part)
        elif " — " in part:
            left, right = part.split(" — ", 1)
            lines.append(f"{left} —")
            lines.append(right)
        else:
            lines.extend(wrap_text(part, 28, 4).splitlines())
    return "\n".join(lines)


def display_text(field: str, text: str) -> str:
    text = text.strip().rstrip(".")
    if field == "ru":
        return wrap_text(text.upper(), 20, 2)
    if field == "es":
        return wrap_text(text.upper(), 17, 2)
    if field == "ipa":
        return wrap_text(text, 34, 2)
    if field == "breakdown":
        return wrap_breakdown(text)
    return text


def bad_wrap(text: str) -> bool:
    lines = text.splitlines()
    for left, right in zip(lines, lines[1:]):
        left = left.strip()
        right = right.strip()
        if not left or not right:
            continue
        if (len(left) <= 2 or len(right) <= 2) and re.search(r"[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁё]$", left) and re.match(
            r"^[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁё]", right
        ):
            return True
    return False


def manifest_rows(phrases_path: Path, manifest_path: Path) -> list[dict[str, Any]]:
    phrases = {int(item["index"]): item for item in load_json(phrases_path)}
    audio: dict[int, dict[str, Any]] = {index: {} for index in phrases}
    for item in load_json(manifest_path):
        audio[int(item["index"])][str(item["role"])] = item
    rows: list[dict[str, Any]] = []
    for index in range(1, 201):
        row = dict(phrases[index])
        row["audio"] = audio[index]
        missing = [role for role in TRACK_AUDIO.values() if role not in row["audio"]]
        if missing:
            raise RuntimeError(f"Phrase {index} missing audio roles: {missing}")
        rows.append(row)
    return rows


def copy_audio_assets(rows: list[dict[str, Any]], repo_root: Path, draft_dir: Path) -> dict[tuple[int, str], Path]:
    assets: dict[tuple[int, str], Path] = {}
    audio_root = draft_dir / "Resources" / "venga_ru_es_openai_audio"
    for index, row in enumerate(rows, start=1):
        for role, item in row["audio"].items():
            src = repo_root / item["path"]
            if not src.exists():
                raise RuntimeError(f"Missing generated audio: {src}")
            dst = audio_root / role / f"{index:03d}{src.suffix.lower()}"
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            assets[(index, role)] = dst
    return assets


def fit_audio_to_slot(asset_path: Path, slot_us: int) -> dict[str, Any]:
    slot_sec = slot_us / US
    source_sec = probe_duration_sec(asset_path)
    tmp_path = asset_path.with_suffix(".slot.tmp.wav")
    filters: list[str] = []
    speed_ratio = 1.0
    if source_sec > slot_sec - 0.12:
        speed_ratio = source_sec / max(slot_sec - 0.18, 0.1)
        if speed_ratio > 1.18:
            raise RuntimeError(f"Audio too long for slot without bad speedup: {asset_path} {source_sec:.3f}s > {slot_sec:.3f}s")
        filters.append(f"atempo={speed_ratio:.5f}")
    filters.append("apad")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(asset_path),
            "-af",
            ",".join(filters),
            "-t",
            f"{slot_sec:.6f}",
            "-c:a",
            "pcm_s16le",
            str(tmp_path),
        ],
        check=True,
    )
    tmp_path.replace(asset_path)
    return {"source_sec": round(source_sec, 3), "slot_sec": round(slot_sec, 3), "speed_ratio": round(speed_ratio, 4)}


def update_intro(draft: dict[str, Any], repo_root: Path, target_dir: Path) -> Path:
    src = repo_root / INTRO_WAV
    if not src.exists():
        raise RuntimeError(f"Missing Spanish intro WAV: {src}")
    out_dir = target_dir / "Resources" / "venga_intro_11labs_ru_target"
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / src.name
    shutil.copy2(src, dst)
    duration_us = int(round(probe_duration_sec(dst) * US))
    if duration_us != INTRO_DURATION_US:
        raise RuntimeError(f"Intro duration mismatch: {duration_us}")
    audios = {item["id"]: item for item in draft["materials"]["audios"]}
    track = draft["tracks"][INTRO_TRACK]
    segment = track["segments"][0]
    material = audios[segment["material_id"]]
    material["path"] = str(dst)
    material["duration"] = INTRO_DURATION_US
    material["name"] = dst.name
    material["material_name"] = dst.name
    material["wave_points"] = []
    segment["source_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
    segment["target_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
    segment["volume"] = 1.0
    segment["last_nonzero_volume"] = 1.0
    segment["visible"] = True
    track["name"] = "INTRO 11LABS RU FOR SPANISH ACTIVE"
    return dst


def update_timeline(draft: dict[str, Any], rows: list[dict[str, Any]], assets: dict[tuple[int, str], Path]) -> list[dict[str, Any]]:
    text_by_id = {item["id"]: item for item in draft["materials"]["texts"]}
    audio_by_id = {item["id"]: item for item in draft["materials"]["audios"]}
    for track in draft.get("tracks", []):
        track["attribute"] = 0
        for segment in track.get("segments", []):
            segment["visible"] = True
            if track.get("type") == "audio":
                segment["volume"] = 1.0
                segment["last_nonzero_volume"] = 1.0

    for track_index, field in TRACK_TEXT.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise RuntimeError(f"Text track {track_index} has {len(segments)} segments, expected 200")
        for index, segment in enumerate(segments, start=1):
            text = display_text(field, str(rows[index - 1][field]))
            if bad_wrap(text):
                raise RuntimeError(f"Bad wrap in track {track_index} segment {index}: {text!r}")
            set_text(text_by_id[segment["material_id"]], text)

    fit_rows: list[dict[str, Any]] = []
    for track_index, role in TRACK_AUDIO.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise RuntimeError(f"Audio track {track_index} has {len(segments)} segments, expected 200")
        for index, segment in enumerate(segments, start=1):
            slot_us = int(segment["target_timerange"]["duration"])
            asset_path = assets[(index, role)]
            fit = fit_audio_to_slot(asset_path, slot_us)
            material = audio_by_id[segment["material_id"]]
            material["path"] = str(asset_path)
            material["duration"] = slot_us
            material["name"] = asset_path.name
            material["material_name"] = asset_path.name
            material["volume"] = 1.0
            material["last_nonzero_volume"] = 1.0
            segment["source_timerange"] = {"start": 0, "duration": slot_us}
            segment["target_timerange"]["duration"] = slot_us
            fit_rows.append({"index": index, "role": role, **fit})
    return fit_rows


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> str:
    now_us = int(time.time() * US)
    project_id = str(uuid.uuid4()).upper()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us
    meta_path = draft_dir / "draft_meta_info.json"
    meta = rewrite_paths(load_json(meta_path), Path(meta.get("draft_fold_path", draft_dir.as_posix())) if False else draft_dir, draft_dir) if False else load_json(meta_path)
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
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "draft_timeline_materials_size": folder_size(draft_dir / "Resources"),
            "draft_timeline_materials_size_": folder_size(draft_dir / "Resources"),
        }
    )
    write_json(meta_path, meta)

    root_meta_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_meta_path)
    shutil.copy2(root_meta_path, root_meta_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}"))
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": meta["draft_timeline_materials_size"],
        "draft_type": "",
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
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_json(root_meta_path, root)
    return project_id


def collect_missing_paths(draft: Any) -> list[str]:
    missing: list[str] = []
    for group_name in ("videos", "audios", "images"):
        for material in draft.get("materials", {}).get(group_name, []) or []:
            path = material_path(material)
            if path and re.match(r"^[A-Za-z]:[\\/]", path) and not Path(path).exists():
                missing.append(path)
    return missing


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-draft", default=SOURCE_DRAFT)
    parser.add_argument("--target-draft", default=TARGET_DRAFT)
    parser.add_argument("--phrases", type=Path, default=PACK_DIR / "phrase_rows.json")
    parser.add_argument("--manifest", type=Path, default=PACK_DIR / "openai-audio" / "tts_manifest.json")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / args.source_draft
    if not source_dir.exists():
        raise RuntimeError(f"Source draft not found: {source_dir}")
    target_dir = unique_draft_dir(capcut_root, args.target_draft)
    shutil.copytree(source_dir, target_dir)
    if (target_dir / ".locked").exists():
        (target_dir / ".locked").unlink()

    rows = manifest_rows(args.phrases, args.manifest)
    draft = rewrite_paths(load_json(target_dir / "draft_content.json"), source_dir, target_dir)
    if len(draft.get("tracks", [])) != 19:
        raise RuntimeError(f"Expected 19-track template, got {len(draft.get('tracks', []))}")
    intro_path = update_intro(draft, repo_root, target_dir)
    assets = copy_audio_assets(rows, repo_root, target_dir)
    audio_fit = update_timeline(draft, rows, assets)
    project_id = update_identity_and_register(target_dir, draft)
    for path in content_paths(target_dir, str(draft["id"])):
        write_json(path, draft)

    missing = collect_missing_paths(draft)
    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_draft": str(source_dir),
        "project_id": project_id,
        "timeline_id": draft["id"],
        "track_count": len(draft.get("tracks", [])),
        "phrase_count": len(rows),
        "intro_path": str(intro_path),
        "text_tracks": {str(track): len(draft["tracks"][track]["segments"]) for track in TRACK_TEXT},
        "audio_tracks": {str(track): len(draft["tracks"][track]["segments"]) for track in TRACK_AUDIO},
        "copied_audio_files": len(assets),
        "audio_speedup_count": sum(1 for item in audio_fit if float(item["speed_ratio"]) > 1.0),
        "audio_speedup_max": max(float(item["speed_ratio"]) for item in audio_fit) if audio_fit else 1.0,
        "missing_paths": len(missing),
        "missing_path_samples": missing[:12],
    }
    write_json(repo_root / PACK_DIR / "capcut_build_report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if missing:
        raise RuntimeError(f"Missing paths: {len(missing)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
