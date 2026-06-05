#!/usr/bin/env python3
"""Repair the Chains 800 part-2 CapCut draft.

Fixes:
- swap second-half EN/RU visual presets while preserving text content;
- normalize text clip positions from first phrase templates;
- move existing CTA overlay groups so the first appears in the first 5 minutes;
- zoom wide background clips just enough to fill a 16:9 canvas;
- optionally generate OpenAI TTS WAV files and relink CapCut audio materials;
- place the second EN repeat so it ends on the EN text edge in the second half.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_800_READY_PART2_401_800 20260603_214046"
CAPCUT_ROOT = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft"
DRAFT_DIR = CAPCUT_ROOT / DRAFT_NAME
ROWS_JSON = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_build/chains_800_timeline_rows.json")
REPORT_PATH = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_repair/part2_draft_repair_report.json")
OPENAI_AUDIO_DIR = DRAFT_DIR / "Resources/chains_800_openai_tts"

MODEL_ID = "gpt-4o-mini-tts"
OUTPUT_FORMAT = "wav"
ROLE_CONFIG = {
    "ru": {
        "voice": "marin",
        "instructions": (
            "Говори по-русски теплым нейтральным голосом для учебного видео. "
            "Чистое естественное произношение, правильные ударения. "
            "Скажи только фразу и остановись чисто."
        ),
    },
    "en1": {
        "voice": "coral",
        "instructions": (
            "Speak American English clearly for an English chain-method lesson. "
            "Warm teacher voice, slow enough for learners, precise pronunciation. "
            "Say only the phrase, then stop cleanly."
        ),
    },
    "en2": {
        "voice": "cedar",
        "instructions": (
            "Speak American English naturally at a calm lesson pace. "
            "Clear pronunciation and stress, slightly warmer on the repeat. "
            "Say only the phrase, then stop cleanly."
        ),
    },
}

TEXT_TRACK_RU_TOP = 2
TEXT_TRACK_IPA = 3
TEXT_TRACK_EN_BOTTOM = 4
TEXT_TRACK_RU_SECOND_BOTTOM = 5

VIDEO_BG_TRACK = 0

FIRST_HALF_EN_AUDIO = 13
FIRST_HALF_RU_AUDIO = 14
FIRST_HALF_EN2_AUDIO = 15
SECOND_HALF_EN_AUDIO = 18
SECOND_HALF_RU_AUDIO = 19
SECOND_HALF_EN2_AUDIO = 20

CTA_BASES = [
    1_789_633_333,
    3_601_116_666,
    5_419_133_333,
    7_261_100_000,
    9_060_400_000,
    10_903_033_333,
    12_707_216_666,
    14_534_816_666,
]
CTA_NEW_FIRST_START = 240_000_000


def load_env_file(start: Path) -> dict[str, str]:
    env_path = next(
        (folder / ".env.local" for folder in [start.resolve(), *start.resolve().parents] if (folder / ".env.local").exists()),
        None,
    )
    values: dict[str, str] = {}
    if not env_path:
        return values
    for line in env_path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def compact_json(path: Path, data: Any) -> None:
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


def probe_duration_us(path: Path) -> int:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return int(round(float(completed.stdout.strip()) * 1_000_000))


def probe_dimensions(path: Path) -> tuple[int, int] | None:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        return None
    streams = json.loads(completed.stdout or "{}").get("streams") or []
    if not streams:
        return None
    width = int(streams[0].get("width") or 0)
    height = int(streams[0].get("height") or 0)
    return (width, height) if width and height else None


def text_from_material(material: dict[str, Any]) -> str:
    content = material.get("content")
    if isinstance(content, str):
        try:
            parsed = json.loads(content)
            text = parsed.get("text")
            if isinstance(text, str):
                return text
        except json.JSONDecodeError:
            pass
    return str(material.get("base_content") or "")


def set_material_text(material: dict[str, Any], text: str) -> None:
    material["base_content"] = text
    content = material.get("content")
    if isinstance(content, str):
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            parsed = {}
    else:
        parsed = {}
    parsed["text"] = text
    material["content"] = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))


def copy_text_style(dst: dict[str, Any], src: dict[str, Any]) -> None:
    text = text_from_material(dst)
    keep = {"id", "base_content", "content", "name", "text_to_audio_ids"}
    for key in list(dst.keys()):
        if key not in keep:
            dst.pop(key, None)
    for key, value in src.items():
        if key not in keep:
            dst[key] = copy.deepcopy(value)
    src_content = src.get("content")
    if isinstance(src_content, str):
        try:
            parsed = json.loads(src_content)
            parsed["text"] = text
            dst["content"] = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
        except json.JSONDecodeError:
            set_material_text(dst, text)
    else:
        set_material_text(dst, text)
    dst["base_content"] = text


def copy_clip_style(dst_segment: dict[str, Any], src_segment: dict[str, Any]) -> None:
    for key in ("clip", "common_keyframes", "extra_material_refs", "hdr_settings", "render_index"):
        if key in src_segment:
            dst_segment[key] = copy.deepcopy(src_segment[key])


def digest(role: str, index: int, text: str) -> str:
    payload = {"role": role, "index": index, "text": text, "model": MODEL_ID, **ROLE_CONFIG[role]}
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def openai_tts(api_key: str, role: str, text: str, path: Path) -> None:
    payload = json.dumps(
        {
            "model": MODEL_ID,
            "voice": ROLE_CONFIG[role]["voice"],
            "input": text,
            "instructions": ROLE_CONFIG[role]["instructions"],
            "response_format": OUTPUT_FORMAT,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    last_error: Exception | None = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
                return
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")[:600]
            last_error = RuntimeError(f"OpenAI TTS failed {error.code}: {body}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI TTS failed: {last_error}")


def generate_openai_audio(rows: list[dict[str, Any]], *, api_key: str, limit: int | None) -> dict[tuple[str, int], dict[str, Any]]:
    selected = [row for row in rows if 401 <= int(row["index"]) <= 800]
    if limit is not None:
        selected = selected[:limit]
    manifest: dict[tuple[str, int], dict[str, Any]] = {}
    generated = 0
    cached = 0
    total = len(selected) * 3
    done = 0
    for row in selected:
        index = int(row["index"])
        for role in ("ru", "en1", "en2"):
            text = str(row["russian"] if role == "ru" else row["english"]).rstrip(".")
            out = OPENAI_AUDIO_DIR / role / f"{index:03d}_{digest(role, index, text)}.wav"
            out.parent.mkdir(parents=True, exist_ok=True)
            if out.exists() and out.stat().st_size > 4096:
                cached += 1
            else:
                print(f"[openai-tts] {done + 1:04d}/{total:04d} {role} {index:03d}", flush=True)
                openai_tts(api_key, role, text, out)
                generated += 1
            duration_us = probe_duration_us(out)
            manifest[(role, index)] = {
                "index": index,
                "role": role,
                "text": text,
                "path": str(out),
                "duration_us": duration_us,
                "voice": ROLE_CONFIG[role]["voice"],
            }
            done += 1
    return {"items": manifest, "generated": generated, "cached": cached}  # type: ignore[return-value]


def relink_audio_segment(segment: dict[str, Any], material: dict[str, Any], audio_info: dict[str, Any]) -> None:
    duration = int(audio_info["duration_us"])
    path = str(audio_info["path"])
    material["path"] = path
    material["name"] = Path(path).name
    material["duration"] = duration
    material["type"] = "extract_audio"
    source = segment.setdefault("source_timerange", {})
    source["start"] = 0
    source["duration"] = duration
    target = segment.setdefault("target_timerange", {})
    target["duration"] = duration
    segment["extra_material_refs"] = []


def apply_audio_relinks(content: dict[str, Any], audio_manifest: dict[tuple[str, int], dict[str, Any]]) -> dict[str, Any]:
    audios = {item["id"]: item for item in content.get("materials", {}).get("audios", []) if item.get("id")}
    changed = 0
    track_role_offsets = {
        FIRST_HALF_EN_AUDIO: ("en1", 0),
        FIRST_HALF_RU_AUDIO: ("ru", 1),
        FIRST_HALF_EN2_AUDIO: ("en2", 0),
        SECOND_HALF_EN_AUDIO: ("en1", 401),
        SECOND_HALF_RU_AUDIO: ("ru", 401),
        SECOND_HALF_EN2_AUDIO: ("en2", 401),
    }
    for track_index, (role, start_index) in track_role_offsets.items():
        segments = content["tracks"][track_index]["segments"]
        for local_index, segment in enumerate(segments):
            if track_index in (FIRST_HALF_RU_AUDIO, SECOND_HALF_EN2_AUDIO) and local_index == 0:
                if track_index == SECOND_HALF_EN2_AUDIO:
                    continue
                # First segment on first-half RU track is intro voiceover.
                continue
            index = start_index + local_index
            if track_index in (SECOND_HALF_EN_AUDIO, SECOND_HALF_RU_AUDIO):
                index = 401 + local_index
            elif track_index == SECOND_HALF_EN2_AUDIO:
                index = 400 + local_index
            elif track_index in (FIRST_HALF_EN_AUDIO, FIRST_HALF_EN2_AUDIO):
                index = 401 + local_index
            elif track_index == FIRST_HALF_RU_AUDIO:
                index = 400 + local_index
            info = audio_manifest.get((role, index))
            material = audios.get(segment.get("material_id"))
            if not info or not material:
                continue
            relink_audio_segment(segment, material, info)
            changed += 1
    return {"audio_segments_relinked": changed}


def apply_second_en2_edge_timing(content: dict[str, Any], audio_manifest: dict[tuple[str, int], dict[str, Any]] | None) -> int:
    en_text_segments = content["tracks"][TEXT_TRACK_IPA]["segments"][400:800]
    en2_audio_segments = content["tracks"][SECOND_HALF_EN2_AUDIO]["segments"][1:]
    changed = 0
    for offset, audio_segment in enumerate(en2_audio_segments):
        index = 401 + offset
        if offset >= len(en_text_segments):
            break
        text_target = en_text_segments[offset].get("target_timerange") or {}
        audio_target = audio_segment.setdefault("target_timerange", {})
        duration = int(audio_target.get("duration") or 0)
        if audio_manifest and (info := audio_manifest.get(("en2", index))):
            duration = int(info["duration_us"])
            audio_target["duration"] = duration
        text_end = int(text_target.get("start") or 0) + int(text_target.get("duration") or 0)
        new_start = max(int(text_target.get("start") or 0), text_end - duration)
        if audio_target.get("start") != new_start:
            audio_target["start"] = new_start
            changed += 1
    return changed


def apply_text_repairs(content: dict[str, Any]) -> dict[str, int]:
    texts = {item["id"]: item for item in content.get("materials", {}).get("texts", []) if item.get("id")}

    ru_first_seg = content["tracks"][TEXT_TRACK_RU_TOP]["segments"][0]
    ipa_first_seg = content["tracks"][TEXT_TRACK_IPA]["segments"][0]
    en_first_seg = content["tracks"][TEXT_TRACK_EN_BOTTOM]["segments"][0]
    ru_top_style = copy.deepcopy(texts[ru_first_seg["material_id"]])
    ipa_style = copy.deepcopy(texts[ipa_first_seg["material_id"]])
    en_bottom_style = copy.deepcopy(texts[en_first_seg["material_id"]])

    changed = 0
    for segment in content["tracks"][TEXT_TRACK_RU_TOP]["segments"][:400]:
        copy_clip_style(segment, ru_first_seg)
        copy_text_style(texts[segment["material_id"]], ru_top_style)
        changed += 1
    for segment in content["tracks"][TEXT_TRACK_IPA]["segments"][:400]:
        copy_clip_style(segment, ipa_first_seg)
        copy_text_style(texts[segment["material_id"]], ipa_style)
        changed += 1
    for segment in content["tracks"][TEXT_TRACK_EN_BOTTOM]["segments"]:
        copy_clip_style(segment, en_first_seg)
        copy_text_style(texts[segment["material_id"]], en_bottom_style)
        changed += 1
    for segment in content["tracks"][TEXT_TRACK_RU_TOP]["segments"][400:]:
        copy_clip_style(segment, ipa_first_seg)
        copy_text_style(texts[segment["material_id"]], ipa_style)
        changed += 1

    # Second half language-position swap:
    # EN text sits in the upper RU position, RU text sits in the lower EN position.
    # Use first-half templates so this stays idempotent across repeated repair runs.
    for segment in content["tracks"][TEXT_TRACK_IPA]["segments"][400:]:
        copy_clip_style(segment, ru_first_seg)
        copy_text_style(texts[segment["material_id"]], ru_top_style)
        changed += 1
    for segment in content["tracks"][TEXT_TRACK_RU_SECOND_BOTTOM]["segments"]:
        copy_clip_style(segment, en_first_seg)
        copy_text_style(texts[segment["material_id"]], en_bottom_style)
        changed += 1
    return {"text_segments_normalized": changed}


def nearest_cta_base(start: int) -> int | None:
    candidates = sorted(CTA_BASES, key=lambda value: abs(value - start))
    if candidates and abs(candidates[0] - start) < 60_000_000:
        return candidates[0]
    return None


def apply_cta_shift(content: dict[str, Any]) -> dict[str, int]:
    new_bases = {old: CTA_NEW_FIRST_START + (old - CTA_BASES[0]) for old in CTA_BASES}
    changed = 0
    for track_index in (11, 12, 16, 17, 21, 22, 23, 24, 25):
        for segment in content["tracks"][track_index]["segments"]:
            target = segment.get("target_timerange")
            if not isinstance(target, dict):
                continue
            start = int(target.get("start") or 0)
            base = nearest_cta_base(start)
            if base is None:
                continue
            target["start"] = int(new_bases[base] + (start - base))
            changed += 1
    return {"cta_segments_shifted": changed}


def apply_background_scale(content: dict[str, Any]) -> dict[str, Any]:
    videos = {item["id"]: item for item in content.get("materials", {}).get("videos", []) if item.get("id")}
    project_ratio = 16 / 9
    changed = 0
    scale_counts: dict[str, int] = {}
    path_cache: dict[str, float] = {}
    for segment in content["tracks"][VIDEO_BG_TRACK]["segments"]:
        material = videos.get(segment.get("material_id"))
        if not material:
            continue
        path = str(material.get("path") or "")
        if not path.lower().endswith((".mp4", ".mov")):
            continue
        if path not in path_cache:
            dims = probe_dimensions(Path(path))
            if not dims:
                path_cache[path] = 1.0
            else:
                width, height = dims
                ratio = width / height
                needed = max(1.0, min(1.08, ratio / project_ratio + 0.003))
                path_cache[path] = round(needed, 4)
        scale = path_cache[path]
        if scale <= 1.0:
            continue
        clip = segment.setdefault("clip", {})
        clip["scale"] = {"x": scale, "y": scale}
        changed += 1
        scale_counts[f"{scale:.4f}"] = scale_counts.get(f"{scale:.4f}", 0) + 1
    return {"background_segments_scaled": changed, "scale_counts": scale_counts}


def sort_track_segments(content: dict[str, Any]) -> int:
    changed = 0
    for track in content.get("tracks", []):
        segments = track.get("segments")
        if not isinstance(segments, list) or len(segments) < 2:
            continue
        before = [segment.get("id") for segment in segments]
        segments.sort(key=lambda segment: int((segment.get("target_timerange") or {}).get("start") or 0))
        after = [segment.get("id") for segment in segments]
        if before != after:
            changed += 1
    return changed


def validate(content: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    if len(content["tracks"][VIDEO_BG_TRACK]["segments"]) != 800:
        errors.append("background track must contain 800 segments")
    if len(content["tracks"][TEXT_TRACK_RU_TOP]["segments"]) != 800:
        errors.append("track 2 must contain 800 text segments")
    if len(content["tracks"][TEXT_TRACK_IPA]["segments"]) != 800:
        errors.append("track 3 must contain 800 text segments")
    if len(content["tracks"][TEXT_TRACK_EN_BOTTOM]["segments"]) != 400:
        errors.append("track 4 must contain 400 first-half EN segments")
    if len(content["tracks"][TEXT_TRACK_RU_SECOND_BOTTOM]["segments"]) != 400:
        errors.append("track 5 must contain 400 second-half RU segments")
    for track_index in (18, 19):
        if len(content["tracks"][track_index]["segments"]) != 400:
            errors.append(f"track {track_index} must contain 400 second-half audio segments")
    if len(content["tracks"][20]["segments"]) != 401:
        errors.append("track 20 must contain 401 audio segments including bed")
    # EN2 edge timing.
    bad_en2 = 0
    for offset, audio_segment in enumerate(content["tracks"][SECOND_HALF_EN2_AUDIO]["segments"][1:]):
        if offset >= 400:
            break
        text_target = content["tracks"][TEXT_TRACK_IPA]["segments"][400 + offset].get("target_timerange") or {}
        audio_target = audio_segment.get("target_timerange") or {}
        text_end = int(text_target.get("start") or 0) + int(text_target.get("duration") or 0)
        audio_end = int(audio_target.get("start") or 0) + int(audio_target.get("duration") or 0)
        if abs(text_end - audio_end) > 2_000:
            bad_en2 += 1
    if bad_en2:
        errors.append(f"second-half EN2 audio does not end at EN text edge for {bad_en2} segments")
    first_cta = min(
        (int((segment.get("target_timerange") or {}).get("start") or 10**18) for segment in content["tracks"][16]["segments"]),
        default=10**18,
    )
    if first_cta > 300_000_000:
        errors.append(f"first CTA starts too late: {first_cta}")
    return {"ok": not errors, "errors": errors, "first_cta_start_us": first_cta}


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-tts", action="store_true")
    parser.add_argument("--tts-limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if capcut_is_open() and not args.dry_run:
        raise RuntimeError("CapCut is open. Close CapCut before writing draft files.")

    content_path = DRAFT_DIR / "draft_content.json"
    template_path = DRAFT_DIR / "template-2.tmp"
    content = load_json(content_path)
    rows = load_json(ROWS_JSON)
    env = load_env_file(Path.cwd())

    report: dict[str, Any] = {
        "draft": str(DRAFT_DIR),
        "skip_tts": args.skip_tts,
        "dry_run": args.dry_run,
    }

    tts_manifest: dict[tuple[str, int], dict[str, Any]] | None = None
    if not args.skip_tts:
        api_key = env.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required in .env.local unless --skip-tts is used")
        tts = generate_openai_audio(rows, api_key=api_key, limit=args.tts_limit)
        tts_manifest = tts["items"]  # type: ignore[assignment]
        report["tts_generated"] = tts["generated"]
        report["tts_cached"] = tts["cached"]
        report.update(apply_audio_relinks(content, tts_manifest))
    else:
        report["audio_segments_relinked"] = 0

    report.update(apply_text_repairs(content))
    report.update(apply_cta_shift(content))
    report.update(apply_background_scale(content))
    report["second_en2_edge_segments_shifted"] = apply_second_en2_edge_timing(content, tts_manifest)
    report["tracks_sorted"] = sort_track_segments(content)
    report["validation"] = validate(content)

    if not report["validation"]["ok"]:
        write_json(REPORT_PATH, report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    if not args.dry_run:
        compact_json(content_path, content)
        compact_json(template_path, content)
        meta_path = DRAFT_DIR / "draft_meta_info.json"
        if meta_path.exists():
            meta = load_json(meta_path)
            meta["tm_draft_modified"] = int(time.time() * 1_000_000)
            compact_json(meta_path, meta)
    write_json(REPORT_PATH, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
