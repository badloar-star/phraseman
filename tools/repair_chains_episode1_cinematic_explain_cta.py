#!/usr/bin/env python3
"""Repair the current CHAINS episode draft after CapCut pruned simple tracks."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any

import qrcode
import requests


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
PACK = Path("exports/chains/episode1")
OUT = PACK / "cinematic_repair"
US = 1_000_000
OLD_EXPLAIN_US = int(10.5 * US)
INTRO_SAFE_START_US = int(44.0 * US)
ELEVEN_MODEL = "eleven_multilingual_v2"
ELEVEN_OUTPUT_FORMAT = "mp3_44100_128"
VOICE_ID = "dH2EgYIVjY7q84hZZrSF"
DOWNLOAD_URL = "https://knowlyapps.com/download/"


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def capcut_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def probe_duration_us(path: Path) -> int:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    return int(round(float(completed.stdout.strip()) * US))


def set_text(material: dict[str, Any], text: str) -> None:
    try:
        content = json.loads(material.get("content") or "{}")
    except Exception:
        content = {}
    content["text"] = text
    for style in content.get("styles", []) or []:
        style["range"] = [0, len(text)]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    material["base_content"] = text


def get_text(material: dict[str, Any]) -> str:
    try:
        return str(json.loads(material.get("content") or "{}").get("text") or material.get("base_content") or "")
    except Exception:
        return str(material.get("base_content") or "")


def clone_material(material: dict[str, Any], new_id: bool = True) -> dict[str, Any]:
    item = deepcopy(material)
    if new_id:
        item["id"] = capcut_id()
        if "unique_id" in item:
            item["unique_id"] = capcut_id()
    return item


def clone_track(track: dict[str, Any], track_type: str | None = None) -> dict[str, Any]:
    item = deepcopy(track)
    item["id"] = capcut_id()
    if track_type:
        item["type"] = track_type
    item["segments"] = []
    item["is_default_name"] = True
    return item


def clone_segment(template: dict[str, Any], material_id: str, start: int, duration: int, source: bool) -> dict[str, Any]:
    item = deepcopy(template)
    item["id"] = capcut_id()
    item["material_id"] = material_id
    item["target_timerange"] = {"start": start, "duration": duration}
    item["source_timerange"] = {"start": 0, "duration": duration} if source else None
    item["render_timerange"] = {"start": 0, "duration": 0}
    item["keyframe_refs"] = []
    item["visible"] = True
    return item


def wrap_lines(text: str, max_chars: int, max_lines: int) -> str:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        cand = word if not cur else f"{cur} {word}"
        if len(cand) <= max_chars or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    if len(lines) <= max_lines:
        return "\n".join(lines)
    return "\n".join(lines[: max_lines - 1] + [" ".join(lines[max_lines - 1 :])])


def shift_segment(seg: dict[str, Any], events: list[tuple[int, int]]) -> None:
    tr = seg.get("target_timerange")
    if not tr:
        return
    start = int(tr["start"])
    duration = int(tr["duration"])
    end = start + duration
    shift = 0
    extend = 0
    for event_start, event_dur in events:
        if start >= event_start:
            shift += event_dur
        elif start < event_start < end:
            extend += event_dur
    tr["start"] = start + shift
    tr["duration"] = duration + extend


def shifted_time(original: int, events: list[tuple[int, int]]) -> int:
    return original + sum(dur for start, dur in events if start <= original)


def download_intro_clip(query: str, idx: int, pexels_key: str, pixabay_key: str) -> Path:
    raw_dir = OUT / "intro_raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    final = raw_dir / f"{idx:02d}_{query.replace(' ', '_')}.mp4"
    if final.exists():
        return final
    headers = {"Authorization": pexels_key}
    params = {"query": query, "orientation": "landscape", "size": "large", "per_page": 12}
    options: list[tuple[int, str]] = []
    if pexels_key:
        try:
            r = requests.get("https://api.pexels.com/videos/search", headers=headers, params=params, timeout=30)
            r.raise_for_status()
            for v in r.json().get("videos", []):
                width = int(v.get("width") or 0)
                height = int(v.get("height") or 0)
                duration = float(v.get("duration") or 0)
                if width < 1280 or height < 720 or duration < 4:
                    continue
                files = sorted(v.get("video_files", []), key=lambda f: int(f.get("width") or 0), reverse=True)
                for f in files:
                    if int(f.get("width") or 0) >= 1280 and str(f.get("link", "")).startswith("http"):
                        options.append((width * height, f["link"]))
                        break
        except Exception:
            pass
    if not options and pixabay_key:
        try:
            r = requests.get(
                "https://pixabay.com/api/videos/",
                params={"key": pixabay_key, "q": query, "video_type": "film", "orientation": "horizontal", "per_page": 20, "safesearch": "true"},
                timeout=30,
            )
            r.raise_for_status()
            for v in r.json().get("hits", []):
                vids = v.get("videos") or {}
                best = vids.get("large") or vids.get("medium")
                if best and best.get("width", 0) >= 1280 and best.get("url"):
                    options.append((int(best["width"]) * int(best.get("height") or 720), best["url"]))
        except Exception:
            pass
    if not options:
        raise RuntimeError(f"No intro clip found for {query}")
    url = sorted(options, reverse=True)[0][1]
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        final.write_bytes(r.content)
    return final


def make_intro_montage(env: dict[str, str]) -> Path:
    out = OUT / "intro_cinematic" / "chains_intro_cinematic_learning_thriller_44s.mp4"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    pexels = env.get("PEXELS_API_KEY", "")
    pixabay = env.get("PIXABAY_API_KEY", "")
    queries = [
        "cinematic student laptop night",
        "close up writing notebook dark",
        "person learning language online",
        "chain link macro cinematic",
        "city lights night focus",
        "typing keyboard study night",
    ]
    clips = [download_intro_clip(q, i + 1, pexels, pixabay) for i, q in enumerate(queries)]
    parts: list[Path] = []
    for i, clip in enumerate(clips, 1):
        part = out.parent / f"part_{i:02d}.mp4"
        if not part.exists():
            subprocess.run(
                [
                    "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(clip),
                    "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=contrast=1.08:saturation=0.88:brightness=-0.03",
                    "-an", "-t", "7.333333", "-r", "30", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(part),
                ],
                check=True,
            )
        parts.append(part)
    concat = out.parent / "concat.txt"
    concat.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in parts), encoding="utf-8")
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
            "-vf", "fade=t=in:st=0:d=0.35,fade=t=out:st=43.35:d=0.65",
            "-t", "44", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", str(out),
        ],
        check=True,
    )
    return out


def make_explain_background() -> Path:
    out = OUT / "explain_bg" / "construction_explain_cinematic_bg_30s.mp4"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "lavfi", "-i", "color=c=#090d12:s=1920x1080:r=30:d=30",
            "-f", "lavfi", "-i", "nullsrc=s=1920x1080:r=30:d=30",
            "-filter_complex",
            "[1:v]geq=r='40+25*sin((X+T*35)/90)+16*sin((Y+T*22)/130)':g='58+24*sin((X+Y+T*45)/150)':b='76+36*sin((Y+T*40)/100)',boxblur=28:2[glow];"
            "[0:v][glow]blend=all_mode=screen:all_opacity=0.34,format=yuv420p,"
            "drawbox=x=170:y=180:w=1580:h=720:color=black@0.42:t=fill,"
            "drawbox=x=170:y=180:w=1580:h=720:color=white@0.10:t=3",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", str(out),
        ],
        check=True,
    )
    return out


def elevenlabs_tts(api_key: str, text: str, out_mp3: Path) -> None:
    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    if out_mp3.exists():
        return
    payload = {
        "text": text,
        "model_id": ELEVEN_MODEL,
        "language_code": "ru",
        "voice_settings": {"stability": 0.58, "similarity_boost": 0.78, "style": 0.06, "use_speaker_boost": True, "speed": 0.92},
        "apply_text_normalization": "on",
    }
    response = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format={ELEVEN_OUTPUT_FORMAT}",
        headers={"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": api_key},
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        timeout=120,
    )
    if not response.ok:
        raise RuntimeError(f"ElevenLabs failed {response.status_code}: {response.text[:400]}")
    out_mp3.write_bytes(response.content)


def pad_audio(src: Path, dst: Path, target_us: int) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src),
            "-af", "apad", "-t", f"{target_us / US:.6f}", "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(dst),
        ],
        check=True,
    )


def chain_explain_text(rows: list[dict[str, Any]]) -> tuple[str, str]:
    base = rows[0]
    final = rows[-1]
    english = str(final["english"]).rstrip(".")
    russian = str(final["russian"]).rstrip(".")
    additions = []
    previous_words = set(str(base["english"]).rstrip(".").casefold().split())
    for row in rows[1:]:
        words = [w.strip(".,!?").casefold() for w in str(row["english"]).split()]
        new = [w for w in words if w and w not in previous_words]
        previous_words.update(words)
        if new:
            additions.append(" ".join(new))
    key_bits = "; ".join(additions[:3]) if additions else "уточнение смысла"
    visual = (
        f"Порядок: кто + действие\n"
        f"потом детали справа\n"
        f"ключ: {wrap_lines(key_bits, 30, 2)}"
    )
    spoken = (
        f"Разбираем порядок конструкции. Основа здесь: {str(base['english']).rstrip('.')}, то есть {str(base['russian']).rstrip('.')}. "
        f"Сначала в английском идет кто делает действие, потом само действие. "
        f"Дальше мы не перестраиваем всю фразу, а добавляем детали справа: {key_bits}. "
        f"Финальная мысль: {english}. По-русски: {russian}. "
        "Запомни принцип: главное действие стоит в начале, а время, причина, место или способ спокойно достраиваются после него."
    )
    return spoken, visual


def generate_explanation_assets(env: dict[str, str]) -> list[dict[str, Any]]:
    rows = load_json(PACK / "phrase_rows.json")
    api_key = env.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is required")
    items: list[dict[str, Any]] = []
    for chain in range(1, 26):
        chunk = [row for row in rows if int(row["chain"]) == chain]
        spoken, visual = chain_explain_text(chunk)
        raw = OUT / "explain_audio_detailed" / f"{chain:02d}_raw.mp3"
        wav = OUT / "explain_audio_detailed" / f"{chain:02d}_natural.wav"
        elevenlabs_tts(api_key, spoken, raw)
        raw_us = probe_duration_us(raw)
        target_us = max(raw_us + int(0.8 * US), int(18.0 * US))
        if not wav.exists() or probe_duration_us(wav) != target_us:
            pad_audio(raw, wav, target_us)
        items.append({"chain": chain, "spoken": spoken, "visual": visual, "raw": str(raw), "audio": str(wav), "duration_us": target_us})
    write_pretty(OUT / "detailed_explanations.json", {"items": items})
    return items


def make_qr() -> Path:
    out = OUT / "cta" / "phraseman_knowly_download_qr.png"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    qr = qrcode.QRCode(version=3, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=14, border=3)
    qr.add_data(DOWNLOAD_URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    img.save(out)
    return out


def add_video_material(draft: dict[str, Any], template: dict[str, Any], path: Path, duration: int, width: int = 1920, height: int = 1080, media_type: str = "video") -> str:
    mat = clone_material(template)
    mat.update({"path": str(path), "duration": duration, "name": path.name, "material_name": path.name, "width": width, "height": height})
    if media_type == "photo":
        mat["type"] = "photo"
        mat["has_audio"] = False
    draft["materials"]["videos"].append(mat)
    return mat["id"]


def add_audio_material(draft: dict[str, Any], template: dict[str, Any], path: Path, duration: int) -> str:
    mat = clone_material(template)
    mat.update({"path": str(path), "duration": duration, "name": path.name, "material_name": path.name})
    draft["materials"]["audios"].append(mat)
    return mat["id"]


def repair() -> dict[str, Any]:
    env = load_env()
    draft_dir = capcut_root() / DRAFT_NAME
    draft = load_json(draft_dir / "draft_content.json")
    first_start = min(int(draft["tracks"][6]["segments"][0]["target_timerange"]["start"]), int(draft["tracks"][0]["segments"][0]["target_timerange"]["start"]))
    intro_extra = max(0, INTRO_SAFE_START_US - first_start)

    explanations = generate_explanation_assets(env)
    intro_video = make_intro_montage(env)
    explain_bg = make_explain_background()
    qr_path = make_qr()
    resources = draft_dir / "Resources" / "chains_cinematic_repair"
    resources.mkdir(parents=True, exist_ok=True)
    intro_video_local = resources / intro_video.name
    explain_bg_local = resources / explain_bg.name
    qr_local = resources / qr_path.name
    for src, dst in [(intro_video, intro_video_local), (explain_bg, explain_bg_local), (qr_path, qr_local)]:
        if not dst.exists():
            shutil.copy2(src, dst)

    # Derive explanation starts from the existing 10.5-second gaps.
    explain_events: list[dict[str, Any]] = []
    for half, track_idx in [("first", 6), ("second", 3)]:
        for chain in range(1, 26):
            seg = draft["tracks"][track_idx]["segments"][chain * 4 - 1]
            base_start = int(seg["target_timerange"]["start"]) + int(seg["target_timerange"]["duration"])
            dur = int(explanations[chain - 1]["duration_us"])
            explain_events.append({"time": base_start, "old_end": base_start + OLD_EXPLAIN_US, "duration": dur, "extra": max(0, dur - OLD_EXPLAIN_US), "chain": chain, "half": half})
    shift_events: list[tuple[int, int]] = [(first_start, intro_extra)]
    shift_events.extend((int(e["old_end"]), int(e["extra"])) for e in explain_events if int(e["extra"]) > 0)
    shift_events.sort()

    # Shift root tracks. Full-span root layers are extended, not moved.
    old_duration = int(draft["duration"])
    total_extra = sum(d for _, d in shift_events)
    draft["duration"] = old_duration + total_extra
    for ti, track in enumerate(draft.get("tracks", [])):
        for seg in track.get("segments", []):
            tr = seg.get("target_timerange")
            if not tr:
                continue
            if int(tr["start"]) == 0 and int(tr["duration"]) > old_duration * 0.8:
                tr["duration"] = int(tr["duration"]) + total_extra
                if seg.get("source_timerange"):
                    seg["source_timerange"]["duration"] = int(seg["source_timerange"]["duration"]) + total_extra
            else:
                shift_segment(seg, shift_events)

    # Shift long nested service compound after intro.
    nested_main = draft["materials"]["drafts"][0]["draft"]
    nested_main["duration"] = int(nested_main.get("duration") or old_duration) + total_extra
    draft["materials"]["drafts"][0]["duration"] = int(draft["materials"]["drafts"][0].get("duration") or old_duration) + total_extra
    for track in nested_main.get("tracks", []):
        for seg in track.get("segments", []):
            shift_segment(seg, shift_events)

    # Replace intro footage and visible text support.
    nested_intro = draft["materials"]["drafts"][1]["draft"]
    intro_vid_id = add_video_material(nested_intro, nested_intro["materials"]["videos"][0], intro_video_local, int(44 * US))
    nested_intro["duration"] = int(44 * US)
    draft["materials"]["drafts"][1]["duration"] = int(44 * US)
    seg_template = nested_intro["tracks"][6]["segments"][0]
    nested_intro["tracks"][6]["segments"] = [clone_segment(seg_template, intro_vid_id, 0, int(44 * US), True)]
    intro_audio_seg = nested_intro["tracks"][7]["segments"][0]
    intro_audio_seg["target_timerange"]["duration"] = int(41.1 * US)
    intro_audio_seg["source_timerange"] = {"start": 0, "duration": int(41.1 * US)}
    texts = {t["id"]: t for t in nested_intro["materials"]["texts"]}
    intro_track = nested_intro["tracks"][1]
    intro_copy = [
        ("СНАЧАЛА КОРОТКАЯ МЫСЛЬ", 0.2, 7.0),
        ("ПОТОМ ДОБАВЛЯЕМ ДЕТАЛИ", 7.4, 8.0),
        ("ФРАЗА РАСТЕТ КАК ЦЕПЬ", 16.0, 8.0),
        ("СЛУШАЙ, ПОВТОРЯЙ,\nСОБИРАЙ КОНСТРУКЦИЮ", 26.0, 12.5),
    ]
    template_text_seg = intro_track["segments"][0]
    template_text_mat = texts[template_text_seg["material_id"]]
    intro_track["segments"] = []
    for text, start_s, dur_s in intro_copy:
        mat = clone_material(template_text_mat)
        set_text(mat, text)
        nested_intro["materials"]["texts"].append(mat)
        seg = clone_segment(template_text_seg, mat["id"], int(start_s * US), int(dur_s * US), False)
        seg["clip"]["transform"] = {"x": 0.0, "y": 0.0}
        seg["clip"]["scale"] = {"x": 0.92, "y": 0.92}
        intro_track["segments"].append(seg)
    for ti in [2, 3, 4, 5]:
        for seg in nested_intro["tracks"][ti].get("segments", []):
            seg["visible"] = False

    # Add persistent explanation tracks with full schema.
    bg_template_track = draft["tracks"][0]
    text_template_track = draft["tracks"][4]
    audio_template_track = draft["tracks"][8]
    explain_bg_track = clone_track(bg_template_track, "video")
    explain_text_track = clone_track(text_template_track, "text")
    explain_audio_track = clone_track(audio_template_track, "audio")
    bg_mat_id = add_video_material(draft, draft["materials"]["videos"][0], explain_bg_local, int(30 * US))
    text_template_seg = text_template_track["segments"][0]
    text_template_mat = next(t for t in draft["materials"]["texts"] if t["id"] == text_template_seg["material_id"])
    audio_template_seg = audio_template_track["segments"][0]
    audio_template_mat = draft["materials"]["audios"][0]
    for event in explain_events:
        start = shifted_time(int(event["time"]), shift_events)
        dur = int(event["duration"])
        chain = int(event["chain"])
        bg_seg = clone_segment(bg_template_track["segments"][0], bg_mat_id, start, dur, True)
        bg_seg["source_timerange"] = {"start": 0, "duration": dur}
        bg_seg["clip"]["scale"] = {"x": 1.0, "y": 1.0}
        bg_seg["clip"]["transform"] = {"x": 0.0, "y": 0.0}
        explain_bg_track["segments"].append(bg_seg)

        item = explanations[chain - 1]
        mat = clone_material(text_template_mat)
        visual = str(item["visual"]).upper()
        set_text(mat, "КОНСТРУКЦИЯ\n" + visual)
        draft["materials"]["texts"].append(mat)
        text_seg = clone_segment(text_template_seg, mat["id"], start + int(0.7 * US), dur - int(1.4 * US), False)
        text_seg["clip"]["transform"] = {"x": 0.0, "y": 0.0}
        text_seg["clip"]["scale"] = {"x": 0.9, "y": 0.9}
        explain_text_track["segments"].append(text_seg)

        audio_src = Path(str(item["audio"]))
        local_audio = resources / audio_src.name
        if not local_audio.exists():
            shutil.copy2(audio_src, local_audio)
        audio_id = add_audio_material(draft, audio_template_mat, local_audio, dur)
        audio_seg = clone_segment(audio_template_seg, audio_id, start + int(0.15 * US), dur, True)
        audio_seg["source_timerange"] = {"start": 0, "duration": dur}
        explain_audio_track["segments"].append(audio_seg)
    draft["tracks"].append(explain_bg_track)
    draft["tracks"].append(explain_text_track)
    draft["tracks"].append(explain_audio_track)

    # Fix CTA language and add local QR overlays.
    root_texts = {t["id"]: t for t in draft["materials"]["texts"]}
    replacements = [
        "АНГЛИЙСКИЕ ЦЕПОЧКИ\nУЖЕ МОЖНО ПОВТОРЯТЬ\nВ PHRASEMAN",
        "ХОЧЕШЬ ТРЕНИРОВАТЬСЯ?",
        "МЫ СОЗДАЛИ ПРИЛОЖЕНИЕ\nЧТОБЫ ФРАЗЫ СОБИРАЛИСЬ\nАВТОМАТИЧЕСКИ",
        "ССЫЛКА В ОПИСАНИИ",
        "НЕ ТЕРЯЙ ТЕМП",
        "СКАЧАЙ PHRASEMAN",
    ]
    rep_i = 0
    for ti in [17, 18, 21, 22]:
        if ti >= len(draft["tracks"]):
            continue
        for seg in draft["tracks"][ti].get("segments", []):
            if rep_i < len(replacements) and seg.get("material_id") in root_texts:
                set_text(root_texts[seg["material_id"]], replacements[rep_i])
                rep_i += 1
    qr_id = add_video_material(draft, draft["materials"]["videos"][0], qr_local, int(12 * US), width=qr_local.stat().st_size, height=qr_local.stat().st_size, media_type="photo")
    qr_track = clone_track(bg_template_track, "video")
    # CTA starts are the long gaps after chains 8, 16, and second-half 8, after explanation duration.
    for event in [e for e in explain_events if (e["half"], e["chain"]) in {("first", 8), ("first", 16), ("second", 8)}]:
        start = shifted_time(int(event["time"]), shift_events) + int(event["duration"])
        seg = clone_segment(bg_template_track["segments"][0], qr_id, start + int(0.4 * US), int(10.2 * US), True)
        seg["clip"]["scale"] = {"x": 0.22, "y": 0.22}
        seg["clip"]["transform"] = {"x": 0.64, "y": 0.12}
        seg["clip"]["alpha"] = 1.0
        qr_track["segments"].append(seg)
    draft["tracks"].append(qr_track)

    # Sort time-based tracks.
    for track in draft.get("tracks", []):
        track.get("segments", []).sort(key=lambda s: int(s.get("target_timerange", {}).get("start", 0)))

    write_json(draft_dir / "draft_content.json", draft)
    if (draft_dir / "template-2.tmp").exists():
        write_json(draft_dir / "template-2.tmp", draft)

    # Update project metadata in place.
    now = int(time.time() * US)
    size = sum(p.stat().st_size for p in (draft_dir / "Resources").rglob("*") if p.is_file())
    meta = load_json(draft_dir / "draft_meta_info.json")
    meta.update({"tm_duration": draft["duration"], "tm_draft_modified": now, "draft_timeline_materials_size": size, "draft_timeline_materials_size_": size})
    write_json(draft_dir / "draft_meta_info.json", meta)
    root_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_path)
    for entry in root.get("all_draft_store", []):
        if entry.get("draft_name") == draft_dir.name:
            entry.update({"tm_duration": draft["duration"], "tm_draft_modified": now, "draft_timeline_materials_size": size, "draft_timeline_materials_size_": size})
    write_json(root_path, root)

    report = {
        "draft_dir": str(draft_dir),
        "duration_us": draft["duration"],
        "intro_extra_us": intro_extra,
        "total_extra_us": total_extra,
        "explanations": len(explain_events),
        "explanation_assets": len(explanations),
        "tracks": [(i, t.get("type"), len(t.get("segments", []))) for i, t in enumerate(draft.get("tracks", []))],
        "style": "cinematic learning thriller",
        "qr_url": DOWNLOAD_URL,
    }
    write_pretty(OUT / "repair_report.json", report)
    return report


if __name__ == "__main__":
    print(json.dumps(repair(), ensure_ascii=False, indent=2))
