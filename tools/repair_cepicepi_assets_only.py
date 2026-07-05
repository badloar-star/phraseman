#!/usr/bin/env python3
"""Assets-only repair for the native CapCut draft "Ð¦Ð•ÐŸÐ˜ Ð¦Ð•ÐŸÐ˜ Ð¦Ð•ÐŸÐ˜ (1)".

Allowed changes:
- text material content replacement only;
- audio/video material path replacement only;
- background-only video segments added into empty phrase ranges.

Existing segment timing, transforms, styles, and CTA/service elements are frozen.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any

import requests

from build_chains_800_capcut_project import capcut_root, load_json, set_text, update_meta, write_json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


US = 1_000_000
OUT = Path("exports/chains/cepicepi_assets_only")
SOURCE_PACK = Path(os.environ.get("CEPICEPI_SOURCE_PACK", "exports/chains/cepicepi_true_chains_a1a2_20260605"))
SOURCE_ROWS = SOURCE_PACK / "true_chains_200_steps.json"
SOURCE_TEXT_MANIFEST = SOURCE_PACK / "true_chains_text_manifest.json"
SOURCE_AUDIO_MANIFEST = SOURCE_PACK / "openai_audio" / "openai_audio_manifest.json"
BACKUP_REPORT = OUT / "backup_report.json"
FREEZE_PATH = OUT / "timeline_freeze_before.json"
MANIFEST_PATH = OUT / "cepicepi_timeline_manifest.json"
AUDIO_DIR = OUT / "openai_audio"
BG_DIR = OUT / "semantic_backgrounds"
BG_SOURCE_DIR = BG_DIR / "source_videos"
BG_RENDER_DIR = BG_DIR / "rendered_1920x1080"
APPLY_REPORT = OUT / "assets_only_apply_report.json"
OPENAI_MODEL = "gpt-4o-mini-tts"
MAX_BG_SOURCE_REUSE = 6

ROLE_CONFIG = {
    "en1": {
        "voice": "nova",
        "instructions": "Speak American English beautifully and clearly for A1-A2 learners. Warm, bright, natural teacher voice. Say only the phrase.",
    },
    "ru": {
        "voice": "shimmer",
        "instructions": "Ð“Ð¾Ð²Ð¾Ñ€Ð¸ Ð¿Ð¾-Ñ€ÑƒÑÑÐºÐ¸ ÐµÑÑ‚ÐµÑÑ‚Ð²ÐµÐ½Ð½Ð¾, Ñ‚ÐµÐ¿Ð»Ð¾ Ð¸ Ñ‡Ñ‘Ñ‚ÐºÐ¾, ÐºÐ°Ðº Ð´Ð¸ÐºÑ‚Ð¾Ñ€ Ñ…Ð¾Ñ€Ð¾ÑˆÐµÐ³Ð¾ ÑƒÑ‡ÐµÐ±Ð½Ð¾Ð³Ð¾ Ð²Ð¸Ð´ÐµÐ¾. Ð¡ÐºÐ°Ð¶Ð¸ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ñ„Ñ€Ð°Ð·Ñƒ.",
    },
    "en2": {
        "voice": "fable",
        "instructions": "Speak American English with a second beautiful voice, softer and calmer than the first. Clear A1-A2 lesson pace. Say only the phrase.",
    },
    "transition": {
        "voice": "shimmer",
        "instructions": "Ð“Ð¾Ð²Ð¾Ñ€Ð¸ Ð¿Ð¾-Ñ€ÑƒÑÑÐºÐ¸ Ð¶Ð¸Ð²Ð¾, Ñ‡ÐµÐ»Ð¾Ð²ÐµÑ‡ÐµÑÐºÐ¸Ð¼ Ñ‚ÐµÐ¼Ð¿Ð¾Ð¼, ÐºÐ°Ðº Ð²ÐµÐ´ÑƒÑ‰Ð¸Ð¹ ÑƒÑ‡ÐµÐ±Ð½Ð¾Ð³Ð¾ Ð²Ð¸Ð´ÐµÐ¾. Ð‘ÐµÐ· ÑÐ¿ÐµÑˆÐºÐ¸, Ð½Ð¾ ÐºÐ¾Ð¼Ð¿Ð°ÐºÑ‚Ð½Ð¾.",
    },
}
ROLE_CONFIG["ru"]["instructions"] = "Speak Russian beautifully and naturally, warm and clear, like a pleasant lesson host. Say only the phrase."
ROLE_CONFIG["transition"]["instructions"] = "Speak Russian beautifully and naturally at a human lesson pace. Compact, clear, not rushed."

NEGATIVE_BG_TERMS = {
    "abstract",
    "animation",
    "cartoon",
    "green screen",
    "template",
    "logo",
    "vertical",
    "screen recording",
    "coding",
    "robot",
    "mockup",
}


def gid() -> str:
    return str(uuid.uuid4()).upper()


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def project_path() -> Path:
    report = json.loads(BACKUP_REPORT.read_text(encoding="utf-8"))
    return Path(report["source"])


def material_map(content: dict[str, Any], group: str) -> dict[str, dict[str, Any]]:
    return {m.get("id"): m for m in content.get("materials", {}).get(group, []) if isinstance(m, dict) and m.get("id")}


def text_value(mat: dict[str, Any] | None) -> str:
    if not mat:
        return ""
    if mat.get("base_content"):
        return str(mat["base_content"])
    try:
        return str(json.loads(mat.get("content", "{}")).get("text", ""))
    except Exception:
        return ""


def media_path(mat: dict[str, Any] | None) -> str:
    if not mat:
        return ""
    return str(mat.get("path") or mat.get("media_path") or "")


def timer(seg: dict[str, Any]) -> tuple[int, int]:
    tr = seg.get("target_timerange") or {}
    return int(tr.get("start", 0)), int(tr.get("duration", 0))


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {result.stderr[:400]}")
    return float(result.stdout.strip())


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("|", " ").strip())


def make_manifest() -> dict[str, Any]:
    project = project_path()
    content = load_json(project / "draft_content.json")
    texts = material_map(content, "texts")
    audios = material_map(content, "audios")

    source_rows = {int(row["index"]): row for row in json.loads(SOURCE_ROWS.read_text(encoding="utf-8"))}
    source_texts = {int(item["index"]): item for item in json.loads(SOURCE_TEXT_MANIFEST.read_text(encoding="utf-8"))["items"]}
    phrase_slots: list[dict[str, Any]] = []
    for i in range(100):
        en_seg = content["tracks"][4]["segments"][i]
        ipa_seg = content["tracks"][3]["segments"][i]
        ru_seg = content["tracks"][2]["segments"][i]
        start, duration = timer(en_seg)
        phrase_slots.append(
            {
                "part": 1,
                "index": i + 1,
                "source_index": i + 1,
                "english": normalize_text(source_rows[i + 1]["english"]),
                "ipa": normalize_text(source_texts[i + 1]["ipa"]),
                "russian": normalize_text(source_rows[i + 1]["russian"]),
                "text_segments": {"en": [4, i], "ipa": [3, i], "ru": [2, i]},
                "audio_segments": {"en1": [16, i], "ru": [17, i], "en2": [18, i]},
                "start_us": start,
                "duration_us": duration,
            }
        )
    for i in range(100):
        en_seg = content["tracks"][4]["segments"][100 + i]
        ipa_seg = content["tracks"][3]["segments"][100 + i]
        ru_seg = content["tracks"][2]["segments"][100 + i]
        start, duration = timer(en_seg)
        phrase_slots.append(
            {
                "part": 2,
                "index": i + 1,
                "source_index": i + 1,
                "english": phrase_slots[i]["english"],
                "ipa": phrase_slots[i]["ipa"],
                "russian": phrase_slots[i]["russian"],
                "text_segments": {"ru_on_en_style": [4, 100 + i], "ipa": [3, 100 + i], "en_on_ru_style": [2, 100 + i]},
                "audio_segments": {"ru": [16, 100 + i], "en1": [17, 100 + i], "en2": [18, 100 + i]},
                "start_us": start,
                "duration_us": duration,
            }
        )
    for i in range(100):
        en_seg = content["tracks"][4]["segments"][200 + i]
        ipa_seg = content["tracks"][3]["segments"][200 + i]
        start, duration = timer(en_seg)
        phrase_slots.append(
            {
                "part": 3,
                "index": i + 1,
                "source_index": i + 1,
                "english": phrase_slots[i]["english"],
                "ipa": phrase_slots[i]["ipa"],
                "russian": "",
                "text_segments": {"en": [4, 200 + i], "ipa": [3, 200 + i]},
                "audio_segments": {"en1": [17, 200 + i], "en2": [18, 200 + i]},
                "start_us": start,
                "duration_us": duration,
            }
        )

    transitions = []
    for track_idx, seg_idx in [(6, 1), (6, 2)]:
        seg = content["tracks"][track_idx]["segments"][seg_idx]
        start, duration = timer(seg)
        transitions.append(
            {
                "track": track_idx,
                "segment": seg_idx,
                "start_us": start,
                "duration_us": duration,
                "screen_text": normalize_text(text_value(texts[seg["material_id"]])),
            }
        )

    manifest = {
        "project": project.name,
        "source_pack": str(SOURCE_PACK),
        "source_rows_requested_by_user": 200,
        "source_rows_used_by_existing_timeline_slots": len([slot for slot in phrase_slots if int(slot["part"]) == 1]),
        "duration_us": content.get("duration", 0),
        "phrase_slots": phrase_slots,
        "transitions": transitions,
        "audio_material_source_counts": {
            "track16": len(content["tracks"][16]["segments"]),
            "track17": len(content["tracks"][17]["segments"]),
            "track18": len(content["tracks"][18]["segments"]),
        },
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def openai_tts(api_key: str, text: str, role: str, out_path: Path) -> None:
    cfg = ROLE_CONFIG[role]
    payload = json.dumps(
        {
            "model": OPENAI_MODEL,
            "voice": cfg["voice"],
            "input": text,
            "instructions": cfg["instructions"],
            "response_format": "wav",
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    last_error: Exception | None = None
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                out_path.write_bytes(response.read())
            return
        except urllib.error.HTTPError as error:
            last_error = RuntimeError(error.read().decode("utf-8", errors="replace")[:800])
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.2 * attempt)
    raise RuntimeError(f"OpenAI TTS failed for {role}: {last_error}")


def digest_audio(text: str, role: str) -> str:
    payload = {"model": OPENAI_MODEL, "role": role, "voice": ROLE_CONFIG[role]["voice"], "text": text}
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def raw_audio_path(text: str, role: str) -> Path:
    safe = digest_audio(text, role)
    return AUDIO_DIR / "raw" / role / f"{safe}.wav"


def atempo_chain(factor: float) -> str:
    values = []
    remaining = factor
    while remaining > 2.0:
        values.append(2.0)
        remaining /= 2.0
    while remaining < 0.5:
        values.append(0.5)
        remaining /= 0.5
    values.append(remaining)
    return ",".join(f"atempo={value:.6f}" for value in values)


def fit_audio_to_slot(raw: Path, target: Path, slot_us: int) -> dict[str, Any]:
    slot_sec = slot_us / US
    raw_sec = ffprobe_duration(raw)
    speed = 1.0
    filters: list[str] = []
    if raw_sec > max(slot_sec - 0.08, 0.2):
        speed = raw_sec / max(slot_sec - 0.08, 0.2)
        filters.append(atempo_chain(speed))
    filters.append(f"apad=pad_dur={max(slot_sec, 0.1):.6f}")
    filters.append(f"atrim=0:{slot_sec:.6f}")
    target.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(raw),
        "-af",
        ",".join(filters),
        "-ar",
        "48000",
        "-ac",
        "2",
        str(target),
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"audio fit failed for {raw}: {result.stdout[:500]}")
    return {"raw_sec": round(raw_sec, 3), "slot_sec": round(slot_sec, 3), "speed": round(speed, 4), "path": str(target)}


def generate_all_audio(manifest: dict[str, Any]) -> dict[str, Any]:
    env = load_env()
    api_key = env.get("OPENAI_TTS_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_TTS_API_KEY is required in .env.local")
    source_audio = {
        (int(item["index"]), str(item["role"])): item
        for item in json.loads(SOURCE_AUDIO_MANIFEST.read_text(encoding="utf-8"))
    }
    generated_raw = 0
    fitted: list[dict[str, Any]] = []

    jobs: list[dict[str, Any]] = []
    content = load_json(project_path() / "draft_content.json")
    for slot in manifest["phrase_slots"]:
        for role, loc in slot["audio_segments"].items():
            text = slot["russian"] if role == "ru" else slot["english"]
            track, seg_index = loc
            # Preserve the existing segment duration exactly.
            seg = content["tracks"][track]["segments"][seg_index]
            _, slot_us = timer(seg)
            source_item = source_audio[(int(slot["source_index"]), role)]
            jobs.append(
                {
                    "text": text,
                    "role": role,
                    "track": track,
                    "segment": seg_index,
                    "slot_us": slot_us,
                    "source_path": source_item["path"],
                    "source": "prepared_800_pack",
                }
            )
    for idx, transition in enumerate(manifest["transitions"], start=1):
        text = transition_voice_text(transition["screen_text"], transition["duration_us"])
        jobs.append({"text": text, "role": "transition", "track": "transition", "segment": idx, "slot_us": transition["duration_us"], "source": "openai_transition"})

    for job in jobs:
        if job.get("source_path"):
            raw = Path(str(job["source_path"]))
            if not raw.exists():
                raise RuntimeError(f"prepared audio missing: {raw}")
        else:
            raw = raw_audio_path(job["text"], job["role"])
            if not raw.exists() or raw.stat().st_size < 10_000:
                openai_tts(api_key, job["text"], job["role"], raw)
                generated_raw += 1
        target = AUDIO_DIR / "fitted" / str(job["role"]) / f"t{job['track']}_s{job['segment']}_{job['slot_us']}.wav"
        fit = fit_audio_to_slot(raw, target, int(job["slot_us"]))
        fitted.append({**job, **fit})
    report = {"generated_raw": generated_raw, "fitted_count": len(fitted), "max_speed": max(item["speed"] for item in fitted), "items": fitted}
    (AUDIO_DIR / "audio_generation_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def transition_voice_text(screen_text: str, duration_us: int) -> str:
    lower = screen_text.lower()
    if "Ñ€Ð¾Ð´Ð½Ð¾Ð¼ ÑÐ·Ñ‹ÐºÐµ" in lower:
        return "Ð¢ÐµÐ¿ÐµÑ€ÑŒ ÑÐ½Ð°Ñ‡Ð°Ð»Ð° ÑƒÑÐ»Ñ‹ÑˆÐ¸ÑˆÑŒ ÑÐ¼Ñ‹ÑÐ» Ð¿Ð¾-Ñ€ÑƒÑÑÐºÐ¸. ÐŸÐ¾ÑÑ‚Ð°Ñ€Ð°Ð¹ÑÑ ÑÐ°Ð¼ Ð²ÑÐ¿Ð¾Ð¼Ð½Ð¸Ñ‚ÑŒ Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ¸Ð¹ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚, Ð° Ð¿Ð¾Ñ‚Ð¾Ð¼ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÑŒ ÑÐµÐ±Ñ."
    if "Ð¿ÐµÑ€ÐµÐ²Ð¾Ð´ Ð½Ð° Ñ€ÑƒÑÑÐºÐ¸Ð¹ Ð¾Ñ‚ÑÑƒÑ‚ÑÑ‚Ð²ÑƒÐµÑ‚" in lower:
        return "Ð¢ÐµÐ¿ÐµÑ€ÑŒ Ð±ÐµÐ· Ñ€ÑƒÑÑÐºÐ¾Ð³Ð¾ Ð¿ÐµÑ€ÐµÐ²Ð¾Ð´Ð°. Ð¡Ð»ÑƒÑˆÐ°Ð¹ Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ¸Ð¹ Ð¸ Ð²Ð¾ÑÑÑ‚Ð°Ð½Ð°Ð²Ð»Ð¸Ð²Ð°Ð¹ ÑÐ¼Ñ‹ÑÐ» ÑÐ°Ð¼Ð¾ÑÑ‚Ð¾ÑÑ‚ÐµÐ»ÑŒÐ½Ð¾."
    return screen_text


def pexels_search(api_key: str, query: str) -> list[dict[str, Any]]:
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode({"query": query, "per_page": 8, "orientation": "landscape"})
    response = requests.get(url, headers={"Authorization": api_key}, timeout=30)
    if response.status_code >= 400:
        return []
    out = []
    for video in response.json().get("videos", []):
        files = sorted(video.get("video_files", []), key=lambda f: (int(f.get("width") or 0), int(f.get("height") or 0)), reverse=True)
        best = next((f for f in files if int(f.get("width") or 0) >= 1920 and int(f.get("height") or 0) >= 1080), files[0] if files else None)
        if not best:
            continue
        out.append(
            {
                "provider": "pexels",
                "id": str(video.get("id")),
                "url": best.get("link"),
                "width": best.get("width"),
                "height": best.get("height"),
                "duration": video.get("duration"),
                "title": video.get("url", ""),
                "query": query,
            }
        )
    return out


def pixabay_search(api_key: str, query: str) -> list[dict[str, Any]]:
    url = "https://pixabay.com/api/videos/?" + urllib.parse.urlencode({"key": api_key, "q": query, "per_page": 8, "video_type": "film", "safesearch": "true"})
    response = requests.get(url, timeout=30)
    if response.status_code >= 400:
        return []
    out = []
    for video in response.json().get("hits", []):
        videos = video.get("videos", {})
        best = videos.get("large") or videos.get("medium") or videos.get("small")
        if not best:
            continue
        out.append(
            {
                "provider": "pixabay",
                "id": str(video.get("id")),
                "url": best.get("url"),
                "width": best.get("width"),
                "height": best.get("height"),
                "duration": video.get("duration"),
                "title": f"{video.get('tags','')} {video.get('pageURL','')}",
                "query": query,
            }
        )
    return out


def background_query(english: str) -> str:
    text = english.lower()
    if any(x in text for x in ["window", "room", "tea", "kitchen", "keys", "movie", "home"]):
        return "cozy home room kitchen everyday life"
    if any(x in text for x in ["notebook", "class", "teacher", "books", "test", "school"]):
        return "student notebook books studying classroom"
    if any(x in text for x in ["work", "meeting", "report", "document", "client", "manager", "email"]):
        return "office meeting work documents laptop"
    if any(x in text for x in ["ticket", "trip", "station", "airport", "taxi", "hotel", "passport"]):
        return "travel suitcase airport station hotel"
    if any(x in text for x in ["store", "supermarket", "market", "receipt", "gift", "card", "jacket"]):
        return "shopping store cashier market receipt"
    if any(x in text for x in ["doctor", "medicine", "running", "throat", "clinic", "rested"]):
        return "doctor clinic medicine healthy lifestyle"
    if any(x in text for x in ["rice", "soup", "pizza", "vegetables", "breakfast", "dinner"]):
        return "cooking kitchen food restaurant table"
    if any(x in text for x in ["phone", "message", "charger", "chat", "video"]):
        return "smartphone message phone close up"
    if any(x in text for x in ["friend", "neighbor", "sister", "talked", "helped"]):
        return "friends talking helping everyday conversation"
    return "everyday people simple daily life"


def download(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 500_000:
        return
    with requests.get(url, stream=True, timeout=90) as response:
        response.raise_for_status()
        with path.open("wb") as fh:
            for chunk in response.iter_content(chunk_size=1024 * 512):
                if chunk:
                    fh.write(chunk)


def render_bg(source: Path, target: Path, duration_us: int) -> None:
    if target.exists() and target.stat().st_size > 500_000:
        return
    duration = duration_us / US
    target.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-stream_loop",
        "-1",
        "-i",
        str(source),
        "-t",
        f"{duration:.6f}",
        "-vf",
        "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        str(target),
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"background render failed {source}: {result.stdout[:500]}")


def prepare_backgrounds(manifest: dict[str, Any]) -> dict[str, Any]:
    env = load_env()
    pexels_key = env.get("PEXELS_API_KEY", "")
    pixabay_key = env.get("PIXABAY_API_KEY", "")
    if not pexels_key and not pixabay_key:
        raise RuntimeError("PEXELS_API_KEY or PIXABAY_API_KEY is required for semantic backgrounds")
    BG_DIR.mkdir(parents=True, exist_ok=True)
    BG_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    BG_RENDER_DIR.mkdir(parents=True, exist_ok=True)
    base_slots = [slot for slot in manifest["phrase_slots"] if int(slot["part"]) == 1]
    source_use: dict[str, int] = {}
    assignments: list[dict[str, Any]] = []
    query_cache_path = BG_DIR / "true_chains_query_cache.json"
    query_cache: dict[str, list[dict[str, Any]]] = {}
    if query_cache_path.exists():
        query_cache = json.loads(query_cache_path.read_text(encoding="utf-8"))
    for slot in base_slots:
        query = background_query(slot["english"])
        candidates = query_cache.get(query)
        if candidates is None:
            candidates = []
            if pexels_key:
                candidates.extend(pexels_search(pexels_key, query))
            if pixabay_key:
                candidates.extend(pixabay_search(pixabay_key, query))
            query_cache[query] = candidates
            query_cache_path.write_text(json.dumps(query_cache, ensure_ascii=False, indent=2), encoding="utf-8")
        picked = None
        for candidate in candidates:
            title = f"{candidate.get('title','')} {candidate.get('query','')}".casefold()
            if any(term in title for term in NEGATIVE_BG_TERMS):
                continue
            source_key = f"{candidate['provider']}:{candidate['id']}"
            if source_use.get(source_key, 0) >= MAX_BG_SOURCE_REUSE:
                continue
            picked = candidate
            break
        if not picked:
            raise RuntimeError(f"no semantic background for row {slot['index']}: {slot['english']}")
        source_key = f"{picked['provider']}:{picked['id']}"
        source_use[source_key] = source_use.get(source_key, 0) + 1
        source = BG_SOURCE_DIR / f"{picked['provider']}_{picked['id']}.mp4"
        download(str(picked["url"]), source)
        rendered = BG_RENDER_DIR / f"{int(slot['index']):03d}_{source.name}"
        render_bg(source, rendered, int(slot["duration_us"]))
        assignments.append(
            {
                **slot,
                "source": "semantic_search",
                "query": query,
                "source_key": source_key,
                "source_path": str(source),
                "rendered_path": str(rendered),
            }
        )
    report = {"assignments": assignments, "source_use": source_use, "max_source_use": max(source_use.values()) if source_use else 0, "source_pack": str(SOURCE_PACK)}
    (BG_DIR / "background_generation_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def clone_material(template: dict[str, Any], new_path: Path, duration_us: int) -> dict[str, Any]:
    mat = deepcopy(template)
    mat["id"] = gid()
    mat["path"] = str(new_path)
    mat["media_path"] = str(new_path)
    mat["duration"] = duration_us
    mat["name"] = new_path.name
    mat["material_name"] = new_path.name
    return mat


def clone_segment(template: dict[str, Any], material_id: str, start_us: int, duration_us: int) -> dict[str, Any]:
    seg = deepcopy(template)
    seg["id"] = gid()
    seg["material_id"] = material_id
    seg["target_timerange"] = {"start": start_us, "duration": duration_us}
    seg["source_timerange"] = {"start": 0, "duration": duration_us}
    if seg.get("render_timerange") is not None:
        seg["render_timerange"] = {"start": start_us, "duration": duration_us}
    return seg


def localize(project: Path, source: Path, folder: str) -> Path:
    target = project / "Resources" / folder / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or target.stat().st_size != source.stat().st_size:
        shutil.copy2(source, target)
    return target


def apply_assets(manifest: dict[str, Any], audio_report: dict[str, Any], bg_report: dict[str, Any]) -> dict[str, Any]:
    project = project_path()
    content = load_json(project / "draft_content.json")
    texts = material_map(content, "texts")
    audios = material_map(content, "audios")
    videos = material_map(content, "videos")

    # Replace only material text content. Segment timing/style/transform stays frozen.
    text_changes = 0
    for slot in manifest["phrase_slots"]:
        if int(slot["part"]) == 2:
            en_track, en_seg = slot["text_segments"]["en_on_ru_style"]
            ru_track, ru_seg = slot["text_segments"]["ru_on_en_style"]
            set_text(texts[content["tracks"][en_track]["segments"][en_seg]["material_id"]], slot["english"])
            set_text(texts[content["tracks"][ru_track]["segments"][ru_seg]["material_id"]], slot["russian"])
            ipa_track, ipa_seg = slot["text_segments"]["ipa"]
            set_text(texts[content["tracks"][ipa_track]["segments"][ipa_seg]["material_id"]], slot["ipa"])
            text_changes += 3
        elif int(slot["part"]) == 3:
            en_track, en_seg = slot["text_segments"]["en"]
            ipa_track, ipa_seg = slot["text_segments"]["ipa"]
            set_text(texts[content["tracks"][en_track]["segments"][en_seg]["material_id"]], slot["english"])
            set_text(texts[content["tracks"][ipa_track]["segments"][ipa_seg]["material_id"]], slot["ipa"])
            text_changes += 2
        else:
            en_track, en_seg = slot["text_segments"]["en"]
            ru_track, ru_seg = slot["text_segments"]["ru"]
            ipa_track, ipa_seg = slot["text_segments"]["ipa"]
            set_text(texts[content["tracks"][en_track]["segments"][en_seg]["material_id"]], slot["english"])
            set_text(texts[content["tracks"][ru_track]["segments"][ru_seg]["material_id"]], slot["russian"])
            set_text(texts[content["tracks"][ipa_track]["segments"][ipa_seg]["material_id"]], slot["ipa"])
            text_changes += 3

    fitted = {(str(item["track"]), int(item["segment"]), str(item["role"])): item for item in audio_report["items"]}
    audio_changes = 0
    for slot in manifest["phrase_slots"]:
        for role, loc in slot["audio_segments"].items():
            track, seg_index = loc
            item = fitted[(str(track), int(seg_index), role)]
            seg = content["tracks"][track]["segments"][seg_index]
            mat = audios[seg["material_id"]]
            local = localize(project, Path(item["path"]), "cepicepi_openai_audio")
            mat["path"] = str(local)
            mat["media_path"] = str(local)
            mat["duration"] = int(slot_audio_duration_us(content, track, seg_index))
            mat["name"] = local.name
            mat["material_name"] = local.name
            audio_changes += 1

    # Add transition voiceover as one separate background/commentary audio track.
    transition_template_track = deepcopy(content["tracks"][20])
    transition_template_track["id"] = gid()
    transition_template_track["name"] = "CODEx OPENAI TRANSITION VOICE"
    transition_template_track["segments"] = []
    template_audio_seg = content["tracks"][20]["segments"][0]
    template_audio_mat = audios[template_audio_seg["material_id"]]
    for idx, transition in enumerate(manifest["transitions"], start=1):
        item = fitted[("transition", idx, "transition")]
        local = localize(project, Path(item["path"]), "cepicepi_openai_transition_voice")
        mat = clone_material(template_audio_mat, local, int(transition["duration_us"]))
        content["materials"]["audios"].append(mat)
        transition_template_track["segments"].append(clone_segment(template_audio_seg, mat["id"], int(transition["start_us"]), int(transition["duration_us"])))
    content["tracks"].append(transition_template_track)

    # Add background segments into a dedicated sorted track; leave all existing video/CTA segments intact.
    bg_by_index = {int(item["index"]): item for item in bg_report["assignments"]}
    bg_track = deepcopy(content["tracks"][0])
    bg_track["id"] = gid()
    bg_track["name"] = "CODEx TRUE CHAINS SEMANTIC BACKGROUND"
    bg_track["segments"] = []
    template_video_seg = next(seg for seg in content["tracks"][0]["segments"] if seg.get("material_id") in videos)
    template_video_mat = videos[template_video_seg["material_id"]]
    bg_changes = 0
    for slot in manifest["phrase_slots"]:
        assignment = bg_by_index[int(slot["index"])]
        rendered = Path(assignment["rendered_path"])
        local = localize(project, rendered, "cepicepi_true_chains_backgrounds")
        start_us = int(slot["start_us"])
        duration_us = int(slot["duration_us"])
        mat = clone_material(template_video_mat, local, duration_us)
        mat.update({"width": 1920, "height": 1080, "has_audio": False})
        content["materials"]["videos"].append(mat)
        bg_track["segments"].append(clone_segment(template_video_seg, mat["id"], start_us, duration_us))
        bg_changes += 1
    bg_track["segments"].sort(key=lambda seg: int((seg.get("target_timerange") or {}).get("start", 0)))
    content["tracks"].append(bg_track)

    write_json(project / "draft_content.json", content)
    if (project / "template-2.tmp").exists():
        write_json(project / "template-2.tmp", content)
    timelines = project / "Timelines"
    if timelines.exists():
        for mirror in timelines.glob("*/draft_content.json"):
            write_json(mirror, content)
    update_meta(project, content)
    return {"text_changes": text_changes, "audio_changes": audio_changes, "transition_voice_segments": 2, "background_segments_added": bg_changes}


def slot_audio_duration_us(content: dict[str, Any], track: int, seg_index: int) -> int:
    return int((content["tracks"][track]["segments"][seg_index].get("target_timerange") or {}).get("duration", 0))


def freeze_gate() -> dict[str, Any]:
    project = project_path()
    content = load_json(project / "draft_content.json")
    before = json.loads(FREEZE_PATH.read_text(encoding="utf-8"))["segments"]
    errors: list[str] = []
    for item in before:
        track = int(item["track"])
        seg_idx = int(item["seg"])
        if track >= len(content["tracks"]) or seg_idx >= len(content["tracks"][track].get("segments", [])):
            errors.append(f"missing original segment t{track}s{seg_idx}")
            continue
        after = content["tracks"][track]["segments"][seg_idx]
        frozen_after = {k: after.get(k) for k in item["frozen"].keys()}
        # material_id is allowed to stay same; text/audio paths are changed inside materials, not segment ids.
        if frozen_after != item["frozen"]:
            errors.append(f"original segment changed t{track}s{seg_idx}")
    return {"status": "ready" if not errors else "failed", "error_count": len(errors), "errors": errors[:100]}


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["audit", "apply"])
    args = parser.parse_args()
    if args.mode == "audit":
        manifest = make_manifest()
        print(json.dumps({"status": "ready", "phrases": len(manifest["phrase_slots"]), "transitions": manifest["transitions"]}, ensure_ascii=False, indent=2))
        return 0
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing native draft files.")
    manifest = make_manifest()
    audio_report = generate_all_audio(manifest)
    bg_report = prepare_backgrounds(manifest)
    changes = apply_assets(manifest, audio_report, bg_report)
    gate = freeze_gate()
    report = {"status": "ready" if gate["status"] == "ready" else "failed", "changes": changes, "audio": {"fitted_count": audio_report["fitted_count"], "max_speed": audio_report["max_speed"]}, "backgrounds": {"assignments": len(bg_report["assignments"]), "max_source_use": bg_report["max_source_use"]}, "freeze_gate": gate}
    APPLY_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
