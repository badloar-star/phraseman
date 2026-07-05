#!/usr/bin/env python3
"""Apply the requested DIRECT_BG Chains edits safely.

Target project:
  CHAINS_EP01_EN_OPENAI_DIRECT_BG 20260601_214833

Changes:
- new Russian ElevenLabs intro audio and visible intro text, preserving the
  existing intro subdraft style;
- replace the middle "full immersion" section with a Russian-first second-half
  announcement;
- make the second half reversed: Russian text/voice first, then English +
  transcription;
- insert the previous project's third CTA every 30 minutes, creating timeline
  slots instead of overlaying phrases.
"""

from __future__ import annotations

import copy
import json
import shutil
import subprocess
import time
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError


TARGET_NAME = "CHAINS_EP01_EN_OPENAI_DIRECT_BG 20260601_214833"
CTA_SOURCE_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
CAPCUT_ROOT = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft"
TARGET_DIR = CAPCUT_ROOT / TARGET_NAME
CTA_SOURCE_DIR = CAPCUT_ROOT / CTA_SOURCE_NAME
OUT_DIR = Path("exports/chains/episode1/direct_bg_20260601_214833_repair")
INTRO_RAW = OUT_DIR / "direct_bg_intro_chain_4h_11labs_raw.mp3"
INTRO_WAV = OUT_DIR / "direct_bg_intro_chain_4h_11labs_slot_41s10.wav"
MID_RAW = OUT_DIR / "direct_bg_mid_reverse_ru_first_11labs_raw.mp3"
MID_WAV = OUT_DIR / "direct_bg_mid_reverse_ru_first_11labs_slot_9s60.wav"
REPORT = OUT_DIR / "apply_direct_bg_intro_cta_reverse_second_half_report.json"
US = 1_000_000
INTRO_DUR = 41_100_000
MID_DUR = 9_600_000
CTA_TRACK_NAME = "CODEx CTA VENGA SOURCE"
CTA_CLONE_TRACK_NAME = "CODEx CTA EVERY 30 MIN SOURCE"

INTRO_VO = (
    "Ð’ ÑÑ‚Ð¾Ð¼ Ð²Ð¸Ð´ÐµÐ¾ Ñ‚ÐµÐ±Ñ Ð¶Ð´ÑƒÑ‚ Ð±Ð¾Ð»ÑŒÑˆÐµ Ñ‡ÐµÑ‚Ñ‹Ñ€Ñ‘Ñ… Ñ‡Ð°ÑÐ¾Ð² Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ¾Ð³Ð¾ Ð¼ÐµÑ‚Ð¾Ð´Ð¾Ð¼ Ñ†ÐµÐ¿Ð¾Ñ‡ÐµÐº. "
    "ÐœÑ‹ Ð½Ðµ ÑƒÑ‡Ð¸Ð¼ Ð¾Ñ‚Ð´ÐµÐ»ÑŒÐ½Ñ‹Ðµ ÑÐ»Ð¾Ð²Ð°, Ð¼Ñ‹ ÑÐ¾Ð±Ð¸Ñ€Ð°ÐµÐ¼ ÑÐ¼Ñ‹ÑÐ»: Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ðµ, Ð¿Ñ€Ð¸Ñ‡Ð¸Ð½Ð°, Ð²Ñ€ÐµÐ¼Ñ, Ð¼ÐµÑÑ‚Ð¾. "
    "Ð¡Ð¼Ð¾Ñ‚Ñ€Ð¸ Ð½Ð° ÑÐºÑ€Ð°Ð½, ÑÐ»ÑƒÑˆÐ°Ð¹ Ñ€Ð¸Ñ‚Ð¼ Ð¸ Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÑÐ¹ Ð²ÑÐ»ÑƒÑ…. "
    "Ð Ð²Ð¾ Ð²Ñ‚Ð¾Ñ€Ð¾Ð¹ Ñ‡Ð°ÑÑ‚Ð¸ Ð¿Ð¾Ñ€ÑÐ´Ð¾Ðº Ð¸Ð·Ð¼ÐµÐ½Ð¸Ñ‚ÑÑ: Ñ€ÑƒÑÑÐºÐ¸Ð¹ Ð¿ÐµÑ€ÐµÐ²Ð¾Ð´ Ð±ÑƒÐ´ÐµÑ‚ Ð·Ð²ÑƒÑ‡Ð°Ñ‚ÑŒ Ð¿ÐµÑ€Ð²Ñ‹Ð¼, "
    "Ð¸ Ñ‚Ñ‹ Ð±ÑƒÐ´ÐµÑˆÑŒ ÑÐ¾Ð±Ð¸Ñ€Ð°Ñ‚ÑŒ Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÑƒÑŽ Ñ„Ñ€Ð°Ð·Ñƒ ÑƒÐ¶Ðµ Ð² Ð¾Ð±Ñ€Ð°Ñ‚Ð½ÑƒÑŽ ÑÑ‚Ð¾Ñ€Ð¾Ð½Ñƒ."
)

MID_VO = (
    "Ð’Ð¾ Ð²Ñ‚Ð¾Ñ€Ð¾Ð¹ Ñ‡Ð°ÑÑ‚Ð¸ Ð²ÑÑ‘ Ð±ÑƒÐ´ÐµÑ‚ Ð½Ð°Ð¾Ð±Ð¾Ñ€Ð¾Ñ‚. Ð¡Ð½Ð°Ñ‡Ð°Ð»Ð° Ð¿Ñ€Ð¾Ð·Ð²ÑƒÑ‡Ð¸Ñ‚ Ñ€ÑƒÑÑÐºÐ¸Ð¹ Ð¿ÐµÑ€ÐµÐ²Ð¾Ð´. "
    "ÐŸÐ¾Ñ‚Ð¾Ð¼ Ð¿Ð¾ÑÐ²Ð¸Ñ‚ÑÑ Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ°Ñ Ñ„Ñ€Ð°Ð·Ð° Ð¸ Ñ‚Ñ€Ð°Ð½ÑÐºÑ€Ð¸Ð¿Ñ†Ð¸Ñ, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ñ‚Ñ‹ ÑÐ¾Ð±Ñ€Ð°Ð» ÑÐ¼Ñ‹ÑÐ» Ð² Ð¾Ð±Ñ€Ð°Ñ‚Ð½ÑƒÑŽ ÑÑ‚Ð¾Ñ€Ð¾Ð½Ñƒ."
)

INTRO_TITLES = [
    "4 Ð§ÐÐ¡Ð ÐÐÐ“Ð›Ð˜Ð™Ð¡ÐšÐžÐ“Ðž",
    "ÐœÐ•Ð¢ÐžÐ”ÐžÐœ Ð¦Ð•ÐŸÐžÐ§Ð•Ðš",
    "Ð’Ðž Ð’Ð¢ÐžÐ ÐžÐ™ Ð§ÐÐ¡Ð¢Ð˜\nÐ¡ÐÐÐ§ÐÐ›Ð Ð Ð£Ð¡Ð¡ÐšÐ˜Ð™",
]

MID_TITLE = "Ð’Ð¢ÐžÐ ÐÐ¯ Ð§ÐÐ¡Ð¢Ð¬:\nÐ¡ÐÐÐ§ÐÐ›Ð Ð Ð£Ð¡Ð¡ÐšÐ˜Ð™"


def gid() -> str:
    return str(uuid.uuid4()).upper()


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
    env: dict[str, str] = {}
    for path in (Path(".env.local"), Path(".env")):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def backup_project() -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = Path(".codex-tmp/capcut-backups") / f"{TARGET_NAME}.backup-before-direct-bg-intro-cta-reverse-{stamp}"
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(TARGET_DIR, out)
    return out


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {result.stderr}")
    return float(result.stdout.strip())


def elevenlabs_tts(text: str, out_path: Path) -> str:
    env = load_env()
    api_key = env.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing.")
    voice_id = env.get("ELEVENLABS_VOICE_ID") or "dH2EgYIVjY7q84hZZrSF"
    model_id = env.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2"
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.66,
            "similarity_boost": 0.84,
            "style": 0.2,
            "use_speaker_boost": True,
        },
    }
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=160) as response:
            out_path.write_bytes(response.read())
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"ElevenLabs TTS failed: {exc}") from exc
    return voice_id


def openai_tts(text: str, out_path: Path) -> str:
    env = load_env()
    api_key = env.get("OPENAI_TTS_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_TTS_API_KEY is missing.")
    payload = {
        "model": "gpt-4o-mini-tts",
        "voice": "ash",
        "input": text,
        "response_format": "mp3",
        "instructions": (
            "Speak Russian naturally, warm documentary tone, clear native pronunciation, "
            "clean endings, no rushed delivery."
        ),
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=160) as response:
            out_path.write_bytes(response.read())
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"OpenAI TTS failed: {exc}") from exc
    return "openai_fallback_after_elevenlabs_401"


def edge_tts(text: str, out_path: Path) -> str:
    import asyncio
    import edge_tts as edge_tts_pkg

    async def run() -> None:
        communicate = edge_tts_pkg.Communicate(text, voice="ru-RU-DmitryNeural", rate="-4%", volume="+0%")
        await communicate.save(str(out_path))

    asyncio.run(run())
    return "edge_tts_fallback_after_api_auth_or_quota_error"


def generate_tts(text: str, out_path: Path) -> str:
    try:
        voice_id = elevenlabs_tts(text, out_path)
        return f"elevenlabs:{voice_id}"
    except Exception as eleven_exc:  # noqa: BLE001 - report fallback reason.
        try:
            provider = openai_tts(text, out_path)
            return f"{provider}; elevenlabs_error={eleven_exc}"
        except Exception as openai_exc:  # noqa: BLE001 - final offline fallback.
            provider = edge_tts(text, out_path)
            return f"{provider}; elevenlabs_error={eleven_exc}; openai_error={openai_exc}"


def make_slot_audio(raw: Path, out: Path, target_us: int) -> dict[str, Any]:
    raw_sec = ffprobe_duration(raw)
    target_sec = target_us / US
    temp = raw
    filters: list[str] = []
    if raw_sec > target_sec - 0.45:
        ratio = min(1.18, raw_sec / (target_sec - 0.8))
        sped = raw.with_name(raw.stem + "_fit.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(raw), "-filter:a", f"atempo={ratio:.6f}", "-c:a", "libmp3lame", "-b:a", "192k", str(sped)],
            check=True,
            capture_output=True,
            text=True,
        )
        temp = sped
        filters.append(f"atempo={ratio:.6f}")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(temp),
            "-af",
            f"apad=pad_dur=8,atrim=0:{target_sec:.3f},aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ac",
            "2",
            "-ar",
            "48000",
            str(out),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return {"raw_sec": raw_sec, "slot_sec": ffprobe_duration(out), "filters": filters}


def material_index(content: dict[str, Any]) -> dict[str, tuple[str, dict[str, Any]]]:
    out: dict[str, tuple[str, dict[str, Any]]] = {}
    for group, arr in content.get("materials", {}).items():
        if isinstance(arr, list):
            for item in arr:
                if isinstance(item, dict) and item.get("id"):
                    out[str(item["id"])] = (group, item)
    return out


def text_from_material(material: dict[str, Any]) -> str:
    try:
        return json.loads(str(material.get("content") or "{}")).get("text", "")
    except Exception:
        return str(material.get("text") or material.get("base_content") or "")


def set_text_material(material: dict[str, Any], text: str) -> None:
    payload = json.loads(str(material.get("content") or "{}"))
    payload["text"] = text
    styles = payload.get("styles")
    if isinstance(styles, list):
        for style in styles:
            if isinstance(style, dict) and isinstance(style.get("range"), list):
                style["range"] = [0, len(text)]
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def clone_audio_material(template: dict[str, Any], path: Path, duration_us: int) -> dict[str, Any]:
    material = copy.deepcopy(template)
    material["id"] = gid()
    material["unique_id"] = gid()
    material["local_material_id"] = gid().lower()
    material["path"] = str(path)
    material["name"] = path.name
    material["material_name"] = path.name
    material["duration"] = duration_us
    material["wave_points"] = []
    return material


def set_segment_time(segment: dict[str, Any], start: int, duration: int, source_duration: int | None = None) -> None:
    for key in ("target_timerange", "render_timerange"):
        if isinstance(segment.get(key), dict):
            segment[key]["start"] = start
            segment[key]["duration"] = duration
    if isinstance(segment.get("source_timerange"), dict):
        segment["source_timerange"]["start"] = 0
        segment["source_timerange"]["duration"] = source_duration if source_duration is not None else duration


def shift_segment(segment: dict[str, Any], delta: int) -> None:
    for key in ("target_timerange", "render_timerange"):
        if isinstance(segment.get(key), dict):
            segment[key]["start"] = int(segment[key].get("start", 0)) + delta


def timerange(segment: dict[str, Any]) -> tuple[int, int]:
    tr = segment.get("target_timerange", {}) or {}
    start = int(tr.get("start", 0))
    return start, start + int(tr.get("duration", 0))


def apply_intro(content: dict[str, Any], intro_wav: Path) -> dict[str, Any]:
    intro_mat = content["materials"]["drafts"][0]
    intro = intro_mat["draft"]
    text_materials = material_index(intro)
    visible_text_tracks = [t for t in intro["tracks"] if t.get("type") == "text" and any(s.get("visible") for s in t.get("segments", []))]
    if not visible_text_tracks:
        raise RuntimeError("No visible intro text track found.")
    text_track = visible_text_tracks[0]
    for segment, title in zip(text_track.get("segments", []), INTRO_TITLES):
        _, material = text_materials[str(segment["material_id"])]
        set_text_material(material, title)

    audio_track = intro["tracks"][7]
    audio_segment = audio_track["segments"][0]
    _, audio_template = text_materials[str(audio_segment["material_id"])]
    resource_dir = TARGET_DIR / "Resources" / "direct_bg_generated_voice"
    resource_dir.mkdir(parents=True, exist_ok=True)
    target_audio = resource_dir / intro_wav.name
    shutil.copy2(intro_wav, target_audio)
    new_material = clone_audio_material(audio_template, target_audio, INTRO_DUR)
    intro["materials"]["audios"].append(new_material)
    audio_segment["material_id"] = new_material["id"]
    set_segment_time(audio_segment, 0, INTRO_DUR, INTRO_DUR)
    audio_segment["volume"] = 1.0
    audio_segment["last_nonzero_volume"] = 1.0

    # Mirror the embedded intro subdraft to its service file too.
    subdraft_path_raw = str(intro_mat.get("draft_file_path") or "")
    subdraft_rel = subdraft_path_raw.split("##\\")[-1] if "##\\" in subdraft_path_raw else ""
    subdraft_path = TARGET_DIR / subdraft_rel if subdraft_rel else None
    if subdraft_path and subdraft_path.exists():
        write_json(subdraft_path, intro)
    return {"intro_texts": INTRO_TITLES, "intro_audio": str(target_audio)}


def apply_middle(content: dict[str, Any], mid_wav: Path) -> dict[str, Any]:
    texts = material_index(content)
    text_track = content["tracks"][7]
    text_segment = text_track["segments"][0]
    _, text_material = texts[str(text_segment["material_id"])]
    set_text_material(text_material, MID_TITLE)

    audio_track = content["tracks"][11]
    audio_segment = audio_track["segments"][0]
    _, audio_template = texts[str(audio_segment["material_id"])]
    resource_dir = TARGET_DIR / "Resources" / "direct_bg_generated_voice"
    resource_dir.mkdir(parents=True, exist_ok=True)
    target_audio = resource_dir / mid_wav.name
    shutil.copy2(mid_wav, target_audio)
    new_material = clone_audio_material(audio_template, target_audio, MID_DUR)
    content["materials"]["audios"].append(new_material)
    audio_segment["material_id"] = new_material["id"]
    start = int(audio_segment["target_timerange"]["start"])
    set_segment_time(audio_segment, start, MID_DUR, MID_DUR)
    audio_segment["volume"] = 1.0
    audio_segment["last_nonzero_volume"] = 1.0
    return {"mid_text": MID_TITLE, "mid_audio": str(target_audio)}


def clone_track_without_segments(track: dict[str, Any], name: str) -> dict[str, Any]:
    cloned = copy.deepcopy(track)
    cloned["id"] = gid()
    cloned["name"] = name
    cloned["is_default_name"] = False
    cloned["segments"] = []
    return cloned


def clone_segment(segment: dict[str, Any]) -> dict[str, Any]:
    cloned = copy.deepcopy(segment)
    cloned["id"] = gid()
    return cloned


def apply_reverse_second_half(content: dict[str, Any]) -> dict[str, Any]:
    backgrounds = content["tracks"][0]["segments"]
    ru_first_half = content["tracks"][2]["segments"][:400]
    ipa_second_half = content["tracks"][2]["segments"][400:]
    ipa_first_half = content["tracks"][3]["segments"][:400]
    english_second_half = content["tracks"][3]["segments"][400:]
    english_first_half = content["tracks"][4]["segments"][:400]
    ru_audio_first = content["tracks"][9]["segments"][:400]
    en1_second = content["tracks"][13]["segments"]
    en2_second = content["tracks"][14]["segments"]
    if not all(len(items) == 400 for items in [backgrounds[400:], ru_first_half, ipa_second_half, ipa_first_half, english_second_half, english_first_half, ru_audio_first, en1_second, en2_second]):
        raise RuntimeError("Unexpected second-half segment counts.")

    ru_text_track = clone_track_without_segments(content["tracks"][4], "CODEx SECOND HALF RUSSIAN FIRST TEXT")
    ru_audio_track = clone_track_without_segments(content["tracks"][9], "CODEx SECOND HALF RUSSIAN FIRST VO")

    for index in range(400):
        bg = backgrounds[400 + index]
        bg_start, bg_end = timerange(bg)
        bg_duration = bg_end - bg_start

        ru_audio = clone_segment(ru_audio_first[index])
        ru_dur = int(ru_audio["target_timerange"]["duration"])
        set_segment_time(ru_audio, bg_start, ru_dur, ru_dur)
        ru_audio_track["segments"].append(ru_audio)

        en1 = en1_second[index]
        en2 = en2_second[index]
        en1_dur = int(en1["target_timerange"]["duration"])
        en2_dur = int(en2["target_timerange"]["duration"])
        en1_start = bg_start + ru_dur + 600_000
        en2_start = en1_start + en1_dur + 600_000
        if en2_start + en2_dur > bg_end - 200_000:
            en2_start = max(en1_start + en1_dur + 250_000, bg_end - en2_dur - 200_000)
        set_segment_time(en1, en1_start, en1_dur, en1_dur)
        set_segment_time(en2, en2_start, en2_dur, en2_dur)

        ru_text = clone_segment(english_first_half[index])
        ru_text["material_id"] = ru_first_half[index]["material_id"]
        set_segment_time(ru_text, bg_start, bg_duration, bg_duration)
        ru_text_track["segments"].append(ru_text)

        english_text = english_second_half[index]
        ipa_text = ipa_second_half[index]
        english_text["clip"] = copy.deepcopy(ru_first_half[index]["clip"])
        ipa_text["clip"] = copy.deepcopy(ipa_first_half[index]["clip"])
        english_start = en1_start
        english_duration = max(1, bg_end - english_start)
        set_segment_time(english_text, english_start, english_duration, english_duration)
        set_segment_time(ipa_text, english_start, english_duration, english_duration)

    content["tracks"].insert(5, ru_text_track)
    content["tracks"].insert(15, ru_audio_track)
    return {
        "ru_text_segments_added": len(ru_text_track["segments"]),
        "ru_audio_segments_added": len(ru_audio_track["segments"]),
    }


def clone_cta_materials(target: dict[str, Any], source: dict[str, Any], source_segment_ids: set[str]) -> dict[str, str]:
    src_index = material_index(source)
    id_map: dict[str, str] = {}
    resource_dir = TARGET_DIR / "Resources" / "cta_every_30_min_from_previous"
    resource_dir.mkdir(parents=True, exist_ok=True)
    for old_id in source_segment_ids:
        group, material = src_index[old_id]
        cloned = copy.deepcopy(material)
        new_id = gid()
        cloned["id"] = new_id
        cloned["unique_id"] = gid()
        cloned["local_material_id"] = gid().lower()
        for key in ("path", "media_path", "audio_path", "video_path", "cover_path"):
            raw = cloned.get(key)
            if isinstance(raw, str) and raw and Path(raw).exists():
                src_path = Path(raw)
                dst = resource_dir / src_path.name
                if not dst.exists():
                    shutil.copy2(src_path, dst)
                cloned[key] = str(dst)
                cloned["name"] = src_path.name
                cloned["material_name"] = src_path.name
        target.setdefault("materials", {}).setdefault(group, []).append(cloned)
        id_map[old_id] = new_id
    return id_map


def shift_all_after(content: dict[str, Any], start_us: int, delta_us: int) -> None:
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            seg_start, _ = timerange(segment)
            if seg_start >= start_us:
                shift_segment(segment, delta_us)


def next_background_boundary(content: dict[str, Any], target_us: int) -> int:
    boundaries = sorted(timerange(segment)[1] for segment in content["tracks"][0]["segments"])
    for boundary in boundaries:
        if boundary >= target_us:
            return boundary
    return boundaries[-1]


def insert_cta_every_30_min(content: dict[str, Any]) -> dict[str, Any]:
    source = read_json(CTA_SOURCE_DIR / "draft_content.json")
    source_tracks = [source["tracks"][index] for index in [28, 29, 30, 31, 32, 33]]
    source_segments = [track["segments"][0] for track in source_tracks]
    source_base = min(timerange(segment)[0] for segment in source_segments)
    source_end = max(timerange(segment)[1] for segment in source_segments)
    slot_duration = source_end - source_base
    material_ids = {str(segment["material_id"]) for segment in source_segments}
    id_map = clone_cta_materials(content, source, material_ids)

    cta_tracks = [clone_track_without_segments(track, CTA_CLONE_TRACK_NAME) for track in source_tracks]
    content["tracks"].extend(cta_tracks)
    initial_duration = int(content.get("duration", 0))
    desired_times = list(range(1800 * US, initial_duration - 60 * US, 1800 * US))
    insertions: list[dict[str, Any]] = []
    accumulated = 0
    for desired in desired_times:
        insertion = next_background_boundary(content, desired + accumulated)
        shift_all_after(content, insertion, slot_duration)
        for cta_track, source_segment in zip(cta_tracks, source_segments):
            cloned = clone_segment(source_segment)
            cloned["material_id"] = id_map[str(source_segment["material_id"])]
            source_start, source_segment_end = timerange(source_segment)
            offset = source_start - source_base
            set_segment_time(cloned, insertion + offset, source_segment_end - source_start, source_segment_end - source_start)
            cta_track["segments"].append(cloned)
        insertions.append({"desired_us": desired, "inserted_at_us": insertion, "slot_duration_us": slot_duration})
        accumulated += slot_duration
    return {"cta_repeats": len(insertions), "slot_duration_us": slot_duration, "insertions": insertions}


def compute_duration(content: dict[str, Any]) -> int:
    max_end = 0
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            max_end = max(max_end, timerange(segment)[1])
    return max_end


def mirror_content(content: dict[str, Any]) -> list[str]:
    timeline_id = str(content["id"])
    paths = [
        TARGET_DIR / "draft_content.json",
        TARGET_DIR / "template-2.tmp",
        TARGET_DIR / "draft_content.json.bak",
        TARGET_DIR / "Timelines" / timeline_id / "draft_content.json",
    ]
    written = []
    for path in paths:
        if path.parent.exists() or path.name == "draft_content.json":
            path.parent.mkdir(parents=True, exist_ok=True)
            write_json(path, content)
            written.append(str(path))
    return written


def update_meta(duration: int) -> None:
    meta_path = TARGET_DIR / "draft_meta_info.json"
    if meta_path.exists():
        meta = read_json(meta_path)
        meta["tm_duration"] = duration
        meta["draft_duration"] = duration
        meta["tm_draft_modified"] = int(time.time() * 1_000_000)
        write_json(meta_path, meta)
    root_meta_path = CAPCUT_ROOT / "root_meta_info.json"
    if root_meta_path.exists():
        root = read_json(root_meta_path)
        for entry in root.get("drafts", []):
            if entry.get("draft_name") == TARGET_NAME or str(entry.get("draft_fold_path", "")).endswith(TARGET_NAME):
                entry["tm_duration"] = duration
                entry["tm_draft_modified"] = int(time.time() * 1_000_000)
        write_json(root_meta_path, root)


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before editing draft JSON.")
    if not TARGET_DIR.exists():
        raise RuntimeError(f"Target draft not found: {TARGET_DIR}")
    if not CTA_SOURCE_DIR.exists():
        raise RuntimeError(f"CTA source draft not found: {CTA_SOURCE_DIR}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    backup = backup_project()
    intro_voice = generate_tts(INTRO_VO, INTRO_RAW)
    mid_voice = generate_tts(MID_VO, MID_RAW)
    intro_audio_report = make_slot_audio(INTRO_RAW, INTRO_WAV, INTRO_DUR)
    mid_audio_report = make_slot_audio(MID_RAW, MID_WAV, MID_DUR)

    content = read_json(TARGET_DIR / "draft_content.json")
    intro_report = apply_intro(content, INTRO_WAV)
    middle_report = apply_middle(content, MID_WAV)
    reverse_report = apply_reverse_second_half(content)
    cta_report = insert_cta_every_30_min(content)
    duration = compute_duration(content)
    content["duration"] = duration
    written = mirror_content(content)
    update_meta(duration)

    report = {
        "status": "done",
        "backup": str(backup),
        "target": str(TARGET_DIR),
        "intro_voice_id": intro_voice,
        "mid_voice_id": mid_voice,
        "intro_audio": intro_audio_report,
        "mid_audio": mid_audio_report,
        "intro": intro_report,
        "middle": middle_report,
        "reverse_second_half": reverse_report,
        "cta": cta_report,
        "duration_us": duration,
        "duration_sec": round(duration / US, 3),
        "written": written,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
