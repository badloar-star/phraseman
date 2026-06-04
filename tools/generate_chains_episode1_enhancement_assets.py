#!/usr/bin/env python3
"""Generate assets for the enhanced CHAINS episode 1 draft."""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import requests


PACK = Path("exports/chains/episode1")
OUT = PACK / "enhancements"
MODEL_OPENAI_TTS = "gpt-4o-mini-tts"
OPENAI_VOICE = "marin"
ELEVEN_MODEL = "eleven_multilingual_v2"
ELEVEN_OUTPUT_FORMAT = "mp3_44100_128"
ALINA_BEAUTY_VOICE_ID = "dH2EgYIVjY7q84hZZrSF"
US = 1_000_000

INTRO_TEXT = (
    "Сегодня мы учим английский методом цепочек. "
    "Сначала появится короткая мысль, потом к ней спокойно добавятся время, причина, место и детали. "
    "Смотри на экран, слушай русский перевод и замечай, как предложение растет шаг за шагом. "
    "После каждой полной цепочки я коротко объясню, почему предложение устроено именно так. "
    "Тебе не нужно зубрить правило отдельно: ты увидишь, как смысл собирается прямо на экране. "
    "Повторяй вслух, держи ритм, и постепенно английская фраза перестанет быть набором слов, "
    "а станет понятной живой конструкцией."
)
MIDDLE_TEXT = (
    "Дальше меняем порядок. "
    "Сначала ты увидишь и услышишь русский вариант, а потом английский перевод. "
    "Транскрипция появится только после английской фразы."
)
OUTRO_TEXT = (
    "Отлично. Ты прошел цепочки до конца. "
    "Пересмотри видео еще раз фоном и попробуй заранее угадывать следующий шаг. "
    "Так фразы начнут собираться автоматически."
)


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


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    return float(completed.stdout.strip())


def atempo_filter(factor: float) -> str:
    parts: list[str] = []
    while factor > 2.0:
        parts.append("atempo=2.0")
        factor /= 2.0
    while factor < 0.5:
        parts.append("atempo=0.5")
        factor /= 0.5
    parts.append(f"atempo={factor:.6f}")
    return ",".join(parts)


def fit_audio(src: Path, dst: Path, target_sec: float) -> dict[str, float]:
    raw = probe_duration(src)
    factor = raw / target_sec if target_sec > 0 else 1.0
    filters = [atempo_filter(factor)]
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(src),
            "-af",
            ",".join(filters),
            "-t",
            f"{target_sec:.6f}",
            "-ac",
            "1",
            "-ar",
            "44100",
            "-c:a",
            "pcm_s16le",
            str(dst),
        ],
        check=True,
    )
    return {"raw_duration_sec": raw, "target_duration_sec": target_sec, "speed_factor": factor}


def elevenlabs_tts(api_key: str, text: str, out_mp3: Path) -> None:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ALINA_BEAUTY_VOICE_ID}?output_format={ELEVEN_OUTPUT_FORMAT}"
    payload = {
        "text": text,
        "model_id": ELEVEN_MODEL,
        "language_code": "ru",
        "voice_settings": {
            "stability": 0.52,
            "similarity_boost": 0.78,
            "style": 0.05,
            "use_speaker_boost": True,
            "speed": 0.94,
        },
        "apply_text_normalization": "on",
        "seed": 2062026,
    }
    headers = {"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": api_key}
    last = ""
    for attempt in range(1, 5):
        response = requests.post(url, headers=headers, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"), timeout=120)
        if response.ok:
            out_mp3.parent.mkdir(parents=True, exist_ok=True)
            out_mp3.write_bytes(response.content)
            return
        last = f"HTTP {response.status_code}: {response.text[:500]}"
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"ElevenLabs failed: {last}")


def openai_tts(api_key: str, text: str, path: Path) -> None:
    payload = json.dumps(
        {
            "model": MODEL_OPENAI_TTS,
            "voice": OPENAI_VOICE,
            "input": text,
            "instructions": "Speak Russian like a calm premium language teacher. Warm, concise, clear. No extra words. End cleanly.",
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
    last_error: Exception | None = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(response.read())
                return
        except urllib.error.HTTPError as error:
            last_error = RuntimeError(f"OpenAI TTS failed {error.code}: {error.read().decode('utf-8', errors='replace')[:600]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI TTS failed: {last_error}")


def chain_explanation(chain_rows: list[dict[str, Any]]) -> str:
    final = str(chain_rows[-1]["english"]).rstrip(".")
    ru = str(chain_rows[-1]["russian"]).rstrip(".")
    lower = final.casefold()
    if "because" in lower:
        focus = "причину"
    elif "before" in lower or "after" in lower or "today" in lower or "morning" in lower:
        focus = "время"
    elif "to " in lower or "from " in lower:
        focus = "направление или адресата"
    elif "with " in lower or "by " in lower:
        focus = "способ действия"
    elif "quickly" in lower or "carefully" in lower or "politely" in lower or "happily" in lower:
        focus = "деталь о том, как действие произошло"
    else:
        focus = "важное уточнение"
    return (
        f"Здесь цепочка растет спокойно: сначала главное действие, потом добавляется {focus}. "
        f"Финальная мысль: «{ru}». "
        "В английском такие уточнения чаще идут вправо, после основной части."
    )


def generate_explanations(openai_key: str, eleven_key: str) -> list[dict[str, Any]]:
    rows = load_json(PACK / "phrase_rows.json")
    items: list[dict[str, Any]] = []
    audio_dir = OUT / "explanations-openai"
    for chain in range(1, 26):
        chunk = [row for row in rows if int(row["chain"]) == chain]
        text = chain_explanation(chunk)
        raw_path = audio_dir / f"{chain:02d}_raw.wav"
        eleven_raw = audio_dir / f"{chain:02d}_raw_11labs.mp3"
        fit_path = audio_dir / f"{chain:02d}_slot_10s50.wav"
        if eleven_raw.exists() and not raw_path.exists():
            raw_path = eleven_raw
        if not raw_path.exists():
            print(f"[chains-explain-tts] {chain:02d}", flush=True)
            try:
                openai_tts(openai_key, text, raw_path)
            except RuntimeError as error:
                if "insufficient_quota" not in str(error):
                    raise
                print(f"[chains-explain-tts] OpenAI quota unavailable; using 11Labs for {chain:02d}", flush=True)
                elevenlabs_tts(eleven_key, text, eleven_raw)
                raw_path = eleven_raw
        fit = fit_audio(raw_path, fit_path, 10.5)
        items.append({"chain": chain, "text": text, "raw_audio": str(raw_path), "audio": str(fit_path), "fit": fit})
    write_json(OUT / "construction_explanations.json", {"items": items, "duration_sec": 10.5})
    return items


def generate_service_voiceovers(api_key: str) -> dict[str, Any]:
    specs = {
        "intro": (INTRO_TEXT, 41.1),
        "middle": (MIDDLE_TEXT, 9.6),
        "outro": (OUTRO_TEXT, 13.733334),
    }
    result: dict[str, Any] = {}
    for key, (text, duration) in specs.items():
        mp3 = OUT / "service-11labs" / f"{key}_raw.mp3"
        wav = OUT / "service-11labs" / f"{key}_slot.wav"
        if not mp3.exists():
            print(f"[chains-11labs] {key}", flush=True)
            elevenlabs_tts(api_key, text, mp3)
        fit = fit_audio(mp3, wav, duration)
        result[key] = {"text": text, "mp3": str(mp3), "audio": str(wav), "fit": fit}
    write_json(OUT / "service_voiceovers_11labs.json", result)
    return result


def generate_screensaver() -> Path:
    out = OUT / "screensaver" / "construction_screensaver_10s50.mp4"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=0x121416:s=1920x1080:d=10.5:r=30",
            "-vf",
            "format=yuv420p",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-movflags",
            "+faststart",
            str(out),
        ],
        check=True,
    )
    return out


def generate_intro_montage() -> Path:
    out = OUT / "intro-montage" / "chains_intro_premium_montage_41s10.mp4"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    srcs = [
        PACK / "backgrounds-direct-gate" / "rendered" / f"{idx:03d}_chains_direct_bg.mp4"
        for idx in [1, 3, 9, 29, 61]
    ]
    tmp = out.parent / "__tmp_intro"
    if tmp.exists():
        subprocess.run(["powershell", "-NoProfile", "-Command", f"Remove-Item -LiteralPath '{tmp}' -Recurse -Force"], check=True)
    tmp.mkdir(parents=True)
    parts: list[Path] = []
    try:
        for i, src in enumerate(srcs, start=1):
            part = tmp / f"part_{i:02d}.mp4"
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(src),
                    "-t",
                    "8.5",
                    "-vf",
                    "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=brightness=-0.08:contrast=0.98:saturation=1.05,fps=30,format=yuv420p",
                    "-an",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "21",
                    str(part),
                ],
                check=True,
            )
            parts.append(part)
        concat = tmp / "concat.txt"
        concat.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in parts), encoding="utf-8")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat),
                "-t",
                "41.1",
                "-c",
                "copy",
                str(out),
            ],
            check=True,
        )
    finally:
        shutil = __import__("shutil")
        shutil.rmtree(tmp, ignore_errors=True)
    return out


def main() -> int:
    env = load_env()
    openai_key = env.get("OPENAI_API_KEY")
    eleven_key = env.get("ELEVENLABS_API_KEY")
    if not openai_key or not eleven_key:
        raise RuntimeError("OPENAI_API_KEY and ELEVENLABS_API_KEY are required in .env.local")
    OUT.mkdir(parents=True, exist_ok=True)
    service = generate_service_voiceovers(eleven_key)
    explanations = generate_explanations(openai_key, eleven_key)
    screensaver = generate_screensaver()
    intro = generate_intro_montage()
    summary = {
        "service_voiceovers": service,
        "explanations": len(explanations),
        "screensaver": str(screensaver),
        "intro_montage": str(intro),
    }
    write_json(OUT / "enhancement_assets_summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
