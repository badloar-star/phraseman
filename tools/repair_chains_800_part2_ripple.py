#!/usr/bin/env python3
"""Second repair for the Chains 800 part-2 CapCut draft.

This repair starts from the clean pre-repair JSON backup, preserving generated
OpenAI resources, then applies only scoped fixes:
- relink phrase audio to OpenAI WAV files already generated in draft Resources;
- regenerate the intro VO with clearer Russian stress;
- move real CTA blocks with a ripple map: close old CTA slots and open new ones;
- keep text layout/styles from the clean backup;
- lightly scale background videos.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_800_READY_PART2_401_800 20260603_214046"
CAPCUT_ROOT = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft"
DRAFT_DIR = CAPCUT_ROOT / DRAFT_NAME
CLEAN_BACKUP = Path(
    r"C:\appsprojects\phraseman-backups\capcut"
    r"\CHAINS_800_READY_PART2_401_800_20260603_214046_BEFORE_REPAIR_20260604_094733"
)
REPORT = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_repair/part2_ripple_repair_report.json")
OPENAI_AUDIO_DIR = DRAFT_DIR / "Resources/chains_800_openai_tts"
INTRO_DIR = DRAFT_DIR / "Resources/direct_bg_generated_voice"
INTRO_TEXT = (
    "Ð’ ÑÑ‚Ð¾Ð¼ ÑƒÑ€Ð¾ÐºÐµ Ñ‚ÐµÐ±Ñ Ð¶Ð´ÑƒÑ‚ Ñ‡ÐµÑ‚Ñ‹Ñ€Ðµ Ñ‡Ð°ÑÐ° Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ¾Ð³Ð¾ Ð¼ÐµÑ‚Ð¾Ð´Ð¾Ð¼ Ñ†ÐµÐ¿Ð¾Ñ‡ÐµÐº. "
    "ÐœÑ‹ ÑƒÑ‡Ð¸Ð¼ Ð½Ðµ Ð¾Ñ‚Ð´ÐµÐ»ÑŒÐ½Ñ‹Ðµ ÑÐ»Ð¾Ð²Ð°Ì, Ð° Ð³Ð¾Ñ‚Ð¾Ð²Ñ‹Ðµ Ñ„Ñ€Ð°Ð·Ñ‹. "
    "Ð¡Ð»ÑƒÑˆÐ°Ð¹, Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÑÐ¹ Ð²ÑÐ»ÑƒÑ…, Ð° Ð²Ð¾ Ð²Ñ‚Ð¾Ñ€Ð¾Ð¹ Ñ‡Ð°ÑÑ‚Ð¸ ÑÐ½Ð°Ñ‡Ð°Ð»Ð° Ð¿Ñ€Ð¾Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ Ñ€ÑƒÑÑÐºÐ¸Ð¹ Ð¿ÐµÑ€ÐµÐ²Ð¾Ð´."
)
INTRO_SLOT_US = 16_366_667

US = 1_000_000
OLD_CTA_STARTS = [
    1_789_633_333,
    3_601_116_666,
    5_419_133_333,
    7_261_100_000,
    9_060_400_000,
    10_903_033_333,
    12_707_216_666,
    14_534_816_666,
]
NEW_CTA_STARTS = [240_000_000 + index * 1_800_000_000 for index in range(len(OLD_CTA_STARTS))]
MID_SECOND_HALF_START = 7_740_316_666
CTA_TRACKS = {11, 12, 16, 17, 21, 22, 23, 24, 25}
PHRASE_AUDIO_TRACKS = {
    13: ("en1", 401, 0),
    14: ("ru", 401, 1),
    15: ("en2", 401, 0),
    18: ("en1", 401, 0),
    19: ("ru", 401, 0),
    20: ("en2", 401, 1),
}


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


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    for path in (Path(".env.local"), Path(".env")):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_compact(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_report(data: Any) -> None:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ffprobe_duration_us(path: Path) -> int:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return int(round(float(result.stdout.strip()) * US))


def ffprobe_dimensions(path: Path) -> tuple[int, int] | None:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    streams = json.loads(result.stdout or "{}").get("streams") or []
    if not streams:
        return None
    return int(streams[0].get("width") or 0), int(streams[0].get("height") or 0)


def openai_intro_tts(api_key: str, raw: Path) -> None:
    payload = json.dumps(
        {
            "model": "gpt-4o-mini-tts",
            "voice": "marin",
            "input": INTRO_TEXT,
            "response_format": "wav",
            "instructions": (
                "Speak Russian with a warm native Moscow-neutral lesson voice. "
                "Pronounce 'ÑÐ»Ð¾Ð²Ð°' as plural with stress on the final syllable. "
                "Do not say 'Ð²Ð¸Ð´Ñ'. Say only the supplied text, clearly and calmly."
            ),
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        raw.write_bytes(response.read())


def fit_audio(raw: Path, out: Path, target_us: int) -> int:
    target_sec = target_us / US
    raw_sec = ffprobe_duration_us(raw) / US
    temp = raw
    if raw_sec > target_sec - 0.2:
        ratio = min(1.25, raw_sec / (target_sec - 0.35))
        temp = raw.with_name(raw.stem + "_speed.wav")
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(raw), "-filter:a", f"atempo={ratio:.6f}", "-ar", "48000", "-ac", "2", str(temp)],
            check=True,
            capture_output=True,
            text=True,
        )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(temp),
            "-af",
            f"apad=pad_dur=5,atrim=0:{target_sec:.6f},aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar",
            "48000",
            "-ac",
            "2",
            str(out),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return ffprobe_duration_us(out)


def material_maps(content: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    audios = {item["id"]: item for item in content.get("materials", {}).get("audios", []) if item.get("id")}
    videos = {item["id"]: item for item in content.get("materials", {}).get("videos", []) if item.get("id")}
    return audios, videos


def relink_audio_segment(segment: dict[str, Any], material: dict[str, Any], path: Path, duration_us: int) -> None:
    material["path"] = str(path)
    material["name"] = path.name
    material["material_name"] = path.name
    material["duration"] = duration_us
    segment.setdefault("source_timerange", {})["start"] = 0
    segment["source_timerange"]["duration"] = duration_us
    segment.setdefault("target_timerange", {})["duration"] = duration_us
    segment["extra_material_refs"] = []


def find_openai_audio(role: str, index: int) -> Path:
    matches = sorted((OPENAI_AUDIO_DIR / role).glob(f"{index:03d}_*.wav"))
    if not matches:
        raise FileNotFoundError(f"missing OpenAI audio: {role} {index}")
    return matches[0]


def relink_phrase_audio(content: dict[str, Any]) -> int:
    audios, _ = material_maps(content)
    changed = 0
    for track_index, (role, first_index, skip) in PHRASE_AUDIO_TRACKS.items():
        segments = content["tracks"][track_index]["segments"]
        for pos, segment in enumerate(segments[skip:], start=0):
            index = first_index + pos
            if index > 800:
                break
            path = find_openai_audio(role, index)
            material = audios.get(segment.get("material_id"))
            if not material:
                continue
            relink_audio_segment(segment, material, path, ffprobe_duration_us(path))
            changed += 1
    return changed


def relink_intro(content: dict[str, Any], api_key: str) -> dict[str, Any]:
    INTRO_DIR.mkdir(parents=True, exist_ok=True)
    raw = INTRO_DIR / "direct_bg_intro_chain_4h_openai_clear_raw.wav"
    fitted = INTRO_DIR / "direct_bg_intro_chain_4h_openai_clear_slot.wav"
    openai_intro_tts(api_key, raw)
    duration = fit_audio(raw, fitted, INTRO_SLOT_US)
    audios, _ = material_maps(content)
    segment = content["tracks"][14]["segments"][0]
    material = audios[segment["material_id"]]
    relink_audio_segment(segment, material, fitted, duration)
    segment["target_timerange"]["start"] = 916_666
    return {"intro_audio": str(fitted), "intro_duration_us": duration, "intro_text": INTRO_TEXT}


def get_start(segment: dict[str, Any]) -> int:
    return int((segment.get("target_timerange") or {}).get("start") or 0)


def get_end(segment: dict[str, Any]) -> int:
    target = segment.get("target_timerange") or {}
    return int(target.get("start") or 0) + int(target.get("duration") or 0)


def segment_is_mid(segment: dict[str, Any]) -> bool:
    return abs(get_start(segment) - MID_SECOND_HALF_START) < 30_000_000


def nearest_old_cta(start: int) -> int | None:
    if segment_is_start_mid(start):
        return None
    candidates = sorted(OLD_CTA_STARTS, key=lambda value: abs(value - start))
    if candidates and abs(candidates[0] - start) <= 35_000_000:
        return candidates[0]
    return None


def segment_is_start_mid(start: int) -> bool:
    return abs(start - MID_SECOND_HALF_START) < 35_000_000


def collect_cta_segments(content: dict[str, Any]) -> tuple[dict[int, list[tuple[int, dict[str, Any]]]], list[tuple[int, int]]]:
    groups: dict[int, list[tuple[int, dict[str, Any]]]] = {old: [] for old in OLD_CTA_STARTS}
    for track_index in CTA_TRACKS:
        kept = []
        for segment in content["tracks"][track_index]["segments"]:
            start = get_start(segment)
            old = nearest_old_cta(start)
            if old is None:
                kept.append(segment)
            else:
                groups[old].append((track_index, segment))
        content["tracks"][track_index]["segments"] = kept
    intervals = []
    for old, items in groups.items():
        end = max((get_end(segment) for _, segment in items), default=old + 20_100_000)
        intervals.append((old, end))
    return groups, intervals


def remove_old_time(t: int, intervals: list[tuple[int, int]]) -> int:
    value = t
    for start, end in intervals:
        if t >= end:
            value -= end - start
        elif start <= t < end:
            value = start - sum(e - s for s, e in intervals if e <= start)
            break
    return value


def insert_new_time(c: int, inserts: list[tuple[int, int]]) -> int:
    value = c
    cumulative = 0
    for final_start, duration in inserts:
        boundary = final_start - cumulative
        if c >= boundary:
            value += duration
            cumulative += duration
    return value


def map_time(t: int, old_intervals: list[tuple[int, int]], inserts: list[tuple[int, int]]) -> int:
    return insert_new_time(remove_old_time(t, old_intervals), inserts)


def apply_ripple(content: dict[str, Any]) -> dict[str, Any]:
    cta_groups, old_intervals = collect_cta_segments(content)
    durations = [end - start for start, end in old_intervals]
    inserts = list(zip(NEW_CTA_STARTS, durations))

    shifted = 0
    for track in content["tracks"]:
        for segment in track.get("segments", []):
            target = segment.get("target_timerange")
            if not isinstance(target, dict):
                continue
            old = int(target.get("start") or 0)
            new = map_time(old, old_intervals, inserts)
            if new != old:
                target["start"] = max(0, new)
                shifted += 1

    inserted = 0
    for old, new_start in zip(OLD_CTA_STARTS, NEW_CTA_STARTS):
        for track_index, segment in cta_groups[old]:
            clone = copy.deepcopy(segment)
            target = clone.setdefault("target_timerange", {})
            target["start"] = new_start + (get_start(segment) - old)
            content["tracks"][track_index]["segments"].append(clone)
            inserted += 1

    for track in content["tracks"]:
        if isinstance(track.get("segments"), list):
            track["segments"].sort(key=get_start)

    max_end = max(get_end(segment) for track in content["tracks"] for segment in track.get("segments", []) if segment.get("target_timerange"))
    content["duration"] = max_end
    return {
        "old_cta_intervals_sec": [(round(a / US, 3), round(b / US, 3)) for a, b in old_intervals],
        "new_cta_starts_sec": [round(item / US, 3) for item in NEW_CTA_STARTS],
        "shifted_non_cta_segments": shifted,
        "inserted_cta_segments": inserted,
    }


def apply_background_scale(content: dict[str, Any]) -> dict[str, Any]:
    _, videos = material_maps(content)
    changed = 0
    counts: dict[str, int] = {}
    project_ratio = 16 / 9
    cache: dict[str, float] = {}
    for segment in content["tracks"][0]["segments"]:
        material = videos.get(segment.get("material_id"))
        path = Path(str((material or {}).get("path") or ""))
        if not path.exists() or path.suffix.lower() not in {".mp4", ".mov"}:
            continue
        if str(path) not in cache:
            dims = ffprobe_dimensions(path)
            if not dims:
                cache[str(path)] = 1.0
            else:
                width, height = dims
                cache[str(path)] = round(max(1.0, min(1.08, (width / height) / project_ratio + 0.003)), 4)
        scale = cache[str(path)]
        if scale > 1.0:
            segment.setdefault("clip", {})["scale"] = {"x": scale, "y": scale}
            counts[f"{scale:.4f}"] = counts.get(f"{scale:.4f}", 0) + 1
            changed += 1
    return {"background_segments_scaled": changed, "scale_counts": counts}


def align_second_half_en2_to_text_edge(content: dict[str, Any]) -> int:
    changed = 0
    en_text = content["tracks"][3]["segments"][400:800]
    en2_audio = content["tracks"][20]["segments"][1:]
    for text_segment, audio_segment in zip(en_text, en2_audio):
        text_end = get_end(text_segment)
        target = audio_segment.setdefault("target_timerange", {})
        duration = int(target.get("duration") or 0)
        new_start = max(get_start(text_segment), text_end - duration)
        if int(target.get("start") or 0) != new_start:
            target["start"] = new_start
            changed += 1
    content["tracks"][20]["segments"].sort(key=get_start)
    return changed


def validate(content: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    audios, _ = material_maps(content)
    if len(content["tracks"][0]["segments"]) != 800:
        errors.append("background track segment count changed")
    for track_index in [2, 3]:
        if len(content["tracks"][track_index]["segments"]) != 800:
            errors.append(f"text track {track_index} should have 800 segments")
    for track_index in [4, 5]:
        if len(content["tracks"][track_index]["segments"]) != 400:
            errors.append(f"text track {track_index} should have 400 segments")
    for track_index in [13, 15, 18, 19]:
        if len(content["tracks"][track_index]["segments"]) != 400:
            errors.append(f"audio track {track_index} should have 400 segments")
    if len(content["tracks"][14]["segments"]) != 401 or len(content["tracks"][20]["segments"]) != 401:
        errors.append("audio tracks 14/20 should keep bed or intro plus 400 phrases")
    openai_counts = {
        track_index: sum(
            "chains_800_openai_tts" in str(audios.get(segment.get("material_id"), {}).get("path", ""))
            for segment in content["tracks"][track_index]["segments"]
        )
        for track_index in [13, 14, 15, 18, 19, 20]
    }
    if openai_counts != {13: 400, 14: 400, 15: 400, 18: 400, 19: 400, 20: 400}:
        errors.append(f"bad OpenAI phrase audio counts: {openai_counts}")
    cta_music_starts = [get_start(segment) for segment in content["tracks"][16]["segments"] if abs(get_end(segment) - get_start(segment) - 20_100_000) < 100_000]
    for wanted in NEW_CTA_STARTS:
        if not any(abs(start - wanted) < 2_000 for start in cta_music_starts):
            errors.append(f"missing CTA music segment at {wanted}")
    bad_en2_edge = 0
    for text_segment, audio_segment in zip(content["tracks"][3]["segments"][400:800], content["tracks"][20]["segments"][1:]):
        if abs(get_end(text_segment) - get_end(audio_segment)) > 2_000:
            bad_en2_edge += 1
    if bad_en2_edge:
        errors.append(f"second-half EN2 edge mismatch: {bad_en2_edge}")
    # Check no old CTA slots remain as 17-21 sec gaps in display text tracks.
    for track_index in [3, 4, 5]:
        segments = content["tracks"][track_index]["segments"]
        for a, b in zip(segments, segments[1:]):
            gap_start = get_end(a)
            gap_end = get_start(b)
            if 16_000_000 <= gap_end - gap_start <= 22_000_000:
                if any(abs(gap_start - old) < 35_000_000 for old in OLD_CTA_STARTS):
                    errors.append(f"old CTA gap remains on track {track_index} near {gap_start}")
    return {"ok": not errors, "errors": errors, "openai_counts": openai_counts, "bad_en2_edge": bad_en2_edge}


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if capcut_is_open() and not args.dry_run:
        raise RuntimeError("CapCut is open. Close CapCut before writing draft files.")
    env = load_env()
    api_key = env.get("OPENAI_TTS_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_TTS_API_KEY is required in .env.local")

    content = load_json(CLEAN_BACKUP / "draft_content.json")
    report: dict[str, Any] = {"draft": str(DRAFT_DIR), "clean_backup": str(CLEAN_BACKUP), "dry_run": args.dry_run}
    report["phrase_audio_relinked"] = relink_phrase_audio(content)
    report["intro"] = relink_intro(content, api_key)
    report["ripple"] = apply_ripple(content)
    report["second_en2_edge_segments_shifted"] = align_second_half_en2_to_text_edge(content)
    report["background"] = apply_background_scale(content)
    report["validation"] = validate(content)
    if not report["validation"]["ok"]:
        write_report(report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1
    if not args.dry_run:
        write_compact(DRAFT_DIR / "draft_content.json", content)
        write_compact(DRAFT_DIR / "template-2.tmp", content)
        meta = load_json(CLEAN_BACKUP / "draft_meta_info.json")
        meta["tm_draft_modified"] = int(time.time() * US)
        meta["tm_duration"] = content["duration"]
        write_compact(DRAFT_DIR / "draft_meta_info.json", meta)
    write_report(report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
