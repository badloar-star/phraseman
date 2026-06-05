#!/usr/bin/env python3
"""Build intro script, OpenAI voiceover, screen texts, and study b-roll assets."""

from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


OUT = Path("exports/chains/phrase_packs/chains_800_unique_v3_20260604/intro_assets")
RAW_DIR = OUT / "raw_broll"
RENDER_DIR = OUT / "rendered_broll"
VOICE_DIR = OUT / "voice"
FINAL_MONTAGE = OUT / "chains_unique_v3_intro_broll_montage_39s.mp4"
PREVIEW_VIDEO = OUT / "chains_unique_v3_intro_preview_voice_text.mp4"
INTRO_VOICE = VOICE_DIR / "chains_unique_v3_intro_openai_marin.mp3"
MANIFEST = OUT / "intro_manifest.json"

INTRO_TEXT = (
    "За следующие четыре часа ты соберёшь восемьсот живых английских фраз. "
    "Не список слов, а готовые куски речи для дома, работы, дороги, покупок, общения и срочных ситуаций. "
    "В первой части слушай английский и повторяй вслух. "
    "Во второй части сначала появится русский смысл, и ты сам вспоминаешь английскую фразу. "
    "Так фразы перестают быть теорией и становятся готовыми ответами в голове. "
    "Начинаем спокойно: слушай, повторяй, и собирай английский цепочками."
)

SCREEN_TEXTS = [
    {
        "start_sec": 0.0,
        "duration_sec": 4.2,
        "main": "800 ЖИВЫХ ФРАЗ",
        "sub": "не список слов, а готовая речь",
    },
    {
        "start_sec": 4.2,
        "duration_sec": 5.3,
        "main": "ДОМ • РАБОТА • ДОРОГА",
        "sub": "реальные ситуации, не учебниковый шум",
    },
    {
        "start_sec": 9.5,
        "duration_sec": 5.6,
        "main": "СЛУШАЙ АНГЛИЙСКИЙ",
        "sub": "и повторяй вслух сразу",
    },
    {
        "start_sec": 15.1,
        "duration_sec": 6.0,
        "main": "ПОТОМ РУССКИЙ СМЫСЛ",
        "sub": "вспоминай английскую фразу сам",
    },
    {
        "start_sec": 21.1,
        "duration_sec": 6.2,
        "main": "ФРАЗЫ В ГОЛОВЕ",
        "sub": "готовые ответы вместо теории",
    },
    {
        "start_sec": 27.3,
        "duration_sec": 12.2,
        "main": "СОБИРАЙ АНГЛИЙСКИЙ ЦЕПОЧКАМИ",
        "sub": "слушай • повторяй • вспоминай",
    },
]

SHOTS = [
    {
        "slug": "open_books",
        "duration_sec": 4.2,
        "query": "close up books studying desk",
        "fallback": ["open book study desk", "student books desk"],
        "must": ["book", "study", "desk", "education"],
        "local_fallback_ids": ["11025820", "14426292"],
    },
    {
        "slug": "writing_notebook",
        "duration_sec": 5.3,
        "query": "hand writing notebook study close up",
        "fallback": ["student writing notes notebook", "pen writing notebook study"],
        "must": ["writing", "notebook", "notes", "pen", "study"],
        "local_fallback_ids": ["10599691", "11025442", "11025820", "17136728"],
    },
    {
        "slug": "laptop_learning",
        "duration_sec": 5.6,
        "query": "person studying laptop notebook desk",
        "fallback": ["student laptop studying notes", "online learning laptop notebook"],
        "must": ["laptop", "student", "study", "notebook"],
        "local_fallback_ids": ["20065494", "20246503", "10567193"],
    },
    {
        "slug": "repeat_headphones",
        "duration_sec": 6.0,
        "query": "student headphones studying language laptop",
        "fallback": ["person headphones studying laptop", "student learning headphones notebook"],
        "must": ["headphones", "student", "study", "laptop"],
        "local_fallback_ids": ["19919755", "20065494", "20246503"],
    },
    {
        "slug": "notes_planning",
        "duration_sec": 6.2,
        "query": "hands organizing notes study desk",
        "fallback": ["planning notes notebook desk", "hands notes desk study"],
        "must": ["notes", "desk", "study", "writing", "paper"],
        "local_fallback_ids": ["14426292", "10599691", "17136728"],
    },
    {
        "slug": "focused_study",
        "duration_sec": 12.2,
        "query": "cinematic study desk notebook lamp",
        "fallback": ["desk lamp notebook study", "student studying notebook desk lamp"],
        "must": ["desk", "notebook", "study", "lamp", "book"],
        "local_fallback_ids": ["19919755", "11025820", "20065494"],
    },
]

FORBIDDEN_TERMS = {
    "animation",
    "cartoon",
    "party",
    "concert",
    "wedding",
    "makeup",
    "food",
    "burger",
    "dance",
    "abstract",
    "robot",
}


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    for path in (Path(".env.local"), Path(".env")):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            env.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return env


def request_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
    request = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def pexels_search(query: str, api_key: str) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode({"query": query, "per_page": 10, "orientation": "landscape"})
    data = request_json(f"https://api.pexels.com/videos/search?{params}", {"Authorization": api_key})
    out = []
    for video in data.get("videos", []):
        files = video.get("video_files") or []
        candidates = [
            item
            for item in files
            if item.get("link") and int(item.get("width") or 0) >= 1280 and int(item.get("height") or 0) >= 720
        ]
        if not candidates:
            continue
        best = max(candidates, key=lambda item: int(item.get("width") or 0) * int(item.get("height") or 0))
        out.append(
            {
                "provider": "pexels",
                "id": str(video.get("id")),
                "url": video.get("url"),
                "tags": video.get("url") or "",
                "duration": float(video.get("duration") or 0),
                "download_url": best.get("link"),
                "width": int(best.get("width") or 0),
                "height": int(best.get("height") or 0),
            }
        )
    return out


def pixabay_search(query: str, api_key: str) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode(
        {"key": api_key, "q": query, "video_type": "all", "orientation": "horizontal", "per_page": 10, "safesearch": "true"}
    )
    data = request_json(f"https://pixabay.com/api/videos/?{params}")
    out = []
    for item in data.get("hits", []):
        videos = item.get("videos") or {}
        best = videos.get("large") or videos.get("medium") or videos.get("small")
        if not best or not best.get("url"):
            continue
        out.append(
            {
                "provider": "pixabay",
                "id": str(item.get("id")),
                "url": item.get("pageURL"),
                "tags": item.get("tags") or "",
                "duration": float(item.get("duration") or 0),
                "download_url": best.get("url"),
                "width": int(best.get("width") or 0),
                "height": int(best.get("height") or 0),
            }
        )
    return out


def candidate_ok(candidate: dict[str, Any], shot: dict[str, Any], used: set[tuple[str, str]]) -> bool:
    if (candidate["provider"], candidate["id"]) in used:
        return False
    if candidate["duration"] < shot["duration_sec"]:
        return False
    if candidate["width"] < 1280 or candidate["height"] < 720:
        return False
    text = " ".join(str(candidate.get(key, "")) for key in ("url", "tags")).casefold()
    if any(term in text for term in FORBIDDEN_TERMS):
        return False
    must = [term.casefold() for term in shot["must"]]
    return any(term in text for term in must)


def local_fallback_path(shot: dict[str, Any], used: set[tuple[str, str]]) -> Path | None:
    source_root = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_repair/semantic_backgrounds/source_videos")
    for allow_reuse in (False, True):
        for source_id in shot.get("local_fallback_ids", []):
            if not allow_reuse and ("local", str(source_id)) in used:
                continue
            matches = list(source_root.rglob(f"{source_id}.mp4"))
            for path in matches:
                if ffprobe_duration(path) >= float(shot["duration_sec"]):
                    used.add(("local", str(source_id)))
                    return path
    return None


def download(url: str, path: Path) -> None:
    if path.exists() and path.stat().st_size > 500_000:
        return
    request = urllib.request.Request(url, headers={"User-Agent": "Phraseman intro builder"})
    with urllib.request.urlopen(request, timeout=180) as response:
        path.write_bytes(response.read())


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    return float(result.stdout.strip() or 0) if result.returncode == 0 else 0.0


def render_clip(source: Path, target: Path, duration: float) -> None:
    source_duration = ffprobe_duration(source)
    offset = max(0.0, min(source_duration - duration, source_duration * 0.12))
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            f"{offset:.3f}",
            "-i",
            str(source),
            "-t",
            f"{duration:.3f}",
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
            "eq=contrast=1.08:saturation=1.05:brightness=-0.02,format=yuv420p",
            "-an",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            str(target),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def concat_clips(clips: list[Path], target: Path) -> None:
    list_file = OUT / "concat_intro_broll.txt"
    list_file.write_text("".join(f"file '{clip.resolve().as_posix()}'\n" for clip in clips), encoding="utf-8")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", str(target)],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def ass_time(seconds: float) -> str:
    centis = int(round(seconds * 100))
    h = centis // 360000
    centis %= 360000
    m = centis // 6000
    centis %= 6000
    s = centis // 100
    cs = centis % 100
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def write_ass_texts(path: Path) -> None:
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Main,Arial,84,&H00FFFFFF,&H000000FF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,5,2,2,80,80,178,1",
        "Style: Sub,Arial,42,&H00F0F0F0,&H000000FF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,3,1,2,90,90,98,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    for item in SCREEN_TEXTS:
        start = float(item["start_sec"])
        end = start + float(item["duration_sec"])
        lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Main,,0,0,0,,{ass_escape(item['main'])}")
        lines.append(f"Dialogue: 1,{ass_time(start)},{ass_time(end)},Sub,,0,0,0,,{ass_escape(item['sub'])}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_preview(montage: Path, voice: Path, target: Path) -> Path:
    ass_path = OUT / "intro_screen_texts.ass"
    write_ass_texts(ass_path)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(montage),
            "-i",
            str(voice),
            "-vf",
            f"subtitles={ass_path.as_posix().replace(':', '\\\\:')}",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-shortest",
            str(target),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return ass_path


def openai_tts(api_key: str) -> None:
    if INTRO_VOICE.exists() and INTRO_VOICE.stat().st_size > 100_000:
        return
    payload = json.dumps(
        {
            "model": "gpt-4o-mini-tts",
            "voice": "marin",
            "input": INTRO_TEXT,
            "response_format": "mp3",
            "instructions": (
                "Speak in Russian as a premium educational documentary narrator. "
                "Warm, confident, gripping, not robotic. Clear stress. Do not rush. "
                "Make it sound like a serious hook for a long English practice lesson."
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
    with urllib.request.urlopen(request, timeout=240) as response:
        INTRO_VOICE.write_bytes(response.read())


def main() -> int:
    env = load_env()
    required = ["OPENAI_API_KEY", "PEXELS_API_KEY", "PIXABAY_API_KEY"]
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise SystemExit(f"Missing keys in .env.local: {missing}")
    for folder in [OUT, RAW_DIR, RENDER_DIR, VOICE_DIR]:
        folder.mkdir(parents=True, exist_ok=True)

    openai_tts(env["OPENAI_API_KEY"])
    rendered: list[Path] = []
    used: set[tuple[str, str]] = set()
    manifest_shots: list[dict[str, Any]] = []
    for index, shot in enumerate(SHOTS, start=1):
        local_path = local_fallback_path(shot, used)
        if local_path is not None:
            chosen = {
                "provider": "local",
                "id": local_path.stem,
                "url": str(local_path),
                "download_url": None,
                "width": 1920,
                "height": 1080,
                "duration": ffprobe_duration(local_path),
            }
            raw = local_path
            used_query = "local_fallback"
        else:
            chosen = None
            raw = None
            used_query = None
            for query in [shot["query"], *shot["fallback"]]:
                try:
                    candidates = pexels_search(query, env["PEXELS_API_KEY"]) + pixabay_search(query, env["PIXABAY_API_KEY"])
                except Exception:
                    candidates = []
                strict_candidates = [candidate for candidate in candidates if candidate_ok(candidate, shot, used)]
                if strict_candidates:
                    candidates = strict_candidates
                else:
                    candidates = [
                        candidate
                        for candidate in candidates
                        if (candidate["provider"], candidate["id"]) not in used
                        and candidate["duration"] >= shot["duration_sec"]
                        and candidate["width"] >= 1280
                        and candidate["height"] >= 720
                        and not any(term in " ".join(str(candidate.get(key, "")) for key in ("url", "tags")).casefold() for term in FORBIDDEN_TERMS)
                    ]
                if candidates:
                    chosen = max(candidates, key=lambda item: (item["width"] * item["height"], item["duration"]))
                    used_query = query
                    break
                time.sleep(0.2)
            if chosen is None:
                raise RuntimeError(f"No b-roll candidate for shot {index}: {shot['query']}")
            used.add((chosen["provider"], chosen["id"]))
            raw = RAW_DIR / f"{index:02d}_{shot['slug']}_{chosen['provider']}_{chosen['id']}.mp4"
            download(chosen["download_url"], raw)
        render = RENDER_DIR / f"{index:02d}_{shot['slug']}.mp4"
        render_clip(raw, render, float(shot["duration_sec"]))
        rendered.append(render)
        manifest_shots.append(
            {
                "index": index,
                "slug": shot["slug"],
                "duration_sec": shot["duration_sec"],
                "query": shot["query"],
                "used_query": used_query,
                "provider": chosen["provider"],
                "source_id": chosen["id"],
                "source_url": chosen["url"],
                "raw_path": str(raw),
                "rendered_path": str(render),
                "width": chosen["width"],
                "height": chosen["height"],
            }
        )

    concat_clips(rendered, FINAL_MONTAGE)
    ass_path = build_preview(FINAL_MONTAGE, INTRO_VOICE, PREVIEW_VIDEO)
    voice_duration = ffprobe_duration(INTRO_VOICE)
    montage_duration = ffprobe_duration(FINAL_MONTAGE)
    preview_duration = ffprobe_duration(PREVIEW_VIDEO)
    manifest = {
        "status": "ready",
        "intro_text": INTRO_TEXT,
        "voice_path": str(INTRO_VOICE),
        "voice_duration_sec": round(voice_duration, 3),
        "screen_texts": SCREEN_TEXTS,
        "broll_montage_path": str(FINAL_MONTAGE),
        "broll_montage_duration_sec": round(montage_duration, 3),
        "preview_video_path": str(PREVIEW_VIDEO),
        "preview_duration_sec": round(preview_duration, 3),
        "ass_screen_text_path": str(ass_path),
        "shots": manifest_shots,
        "qa": {
            "no_word_video_in_intro": "видео" not in INTRO_TEXT.casefold(),
            "mentions_specific_result": "восемьсот" in INTRO_TEXT.casefold() and "фраз" in INTRO_TEXT.casefold(),
            "has_openai_voice": INTRO_VOICE.exists() and INTRO_VOICE.stat().st_size > 100_000,
            "has_broll_montage": FINAL_MONTAGE.exists() and FINAL_MONTAGE.stat().st_size > 1_000_000,
            "has_preview_voice_text": PREVIEW_VIDEO.exists() and PREVIEW_VIDEO.stat().st_size > 1_000_000,
            "screen_text_count": len(SCREEN_TEXTS),
        },
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "intro_script_and_screen_texts.md").write_text(
        "# Chains Unique V3 Intro\n\n"
        "## Voiceover\n\n"
        f"{INTRO_TEXT}\n\n"
        "## Screen Texts\n\n"
        + "\n".join(
            f"- {item['start_sec']:05.2f}-{item['start_sec'] + item['duration_sec']:05.2f}: "
            f"{item['main']} / {item['sub']}"
            for item in SCREEN_TEXTS
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0 if all(manifest["qa"].values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
