#!/usr/bin/env python3
"""Generate the complete 1052-file Spanish-chain audio set with ElevenLabs V3."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env.local"
PACKAGE = Path(r"C:\Users\badlo\OneDrive\Документы\проекты\CHAIN_ES_50_ACTIVE_LISTENING_A1_FULL_PACK")
STAGING = PACKAGE / "_V3_AUDIO_STAGING"
RECEIPT = PACKAGE / "ELEVENLABS_V3_GENERATION_RECEIPT.json"
MODEL = "eleven_v3"
SPEED = 0.85
VOICE_IDS = {
    1: "QZYZCENjeawpG1QkjIsW",       # АЛИНА РУС
    2: "t4H5JNhv5BvHoyD32wEl",       # ALEJANDRO ES
    3: "Vpv1YgvVd6CHIzOTiTt8",       # Martin Osborne 2
    4: "2ymLWvNtabqcyXuGmsvk",       # LUCIA ES
    5: "kqz6EQ0gdQdeyLo2GcU7",       # МИХАИЛ РУС
    7: "kqz6EQ0gdQdeyLo2GcU7",
}
PRINT_LOCK = threading.Lock()


def read_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if value:
        return value
    if ENV_PATH.exists():
        for raw in ENV_PATH.read_text(encoding="utf-8-sig").splitlines():
            if raw.strip().startswith(f"{name}="):
                return raw.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def wav_ok(path: Path) -> bool:
    return path.exists() and path.stat().st_size > 2000 and path.read_bytes()[:4] == b"RIFF"


def tasks() -> list[dict]:
    data = json.loads((PACKAGE / "VIDEO_DATA.json").read_text(encoding="utf-8"))
    result = []
    for chain in data["chains"]:
        for step in chain["steps"]:
            number = int(step["audio_index"])
            result.append({"folder": 1, "number": number, "text": step["russian"], "lang": "ru"})
            for folder in (2, 3, 4):
                result.append({"folder": folder, "number": number, "text": step["spanish"], "lang": "es"})
        result.append({"folder": 5, "number": int(chain["chain"]), "text": chain["explanation_ru"], "lang": "ru"})
    intros = [
        "Теперь ваша задача — услышать русский перевод и успеть самостоятельно сказать фразу по-испански до ответа.",
        "Теперь слушайте испанскую фразу без подсказок, постарайтесь понять её на слух и затем повторите вслух.",
    ]
    for number, text in enumerate(intros, start=1):
        result.append({"folder": 7, "number": number, "text": text, "lang": "ru"})
    return result


def synthesize(api_key: str, task: dict) -> tuple[int, int, int]:
    folder, number = task["folder"], task["number"]
    output = STAGING / str(folder) / f"{number:03d}.wav"
    if wav_ok(output):
        return folder, number, output.stat().st_size
    output.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_IDS[folder]}?output_format=mp3_44100_192"
    payload = json.dumps(
        {
            "text": task["text"],
            "model_id": MODEL,
            "language_code": task["lang"],
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.78,
                "style": 0.08,
                "use_speaker_boost": True,
                "speed": SPEED,
            },
        },
        ensure_ascii=False,
    ).encode("utf-8")
    last_error = None
    for attempt in range(1, 5):
        try:
            request = Request(
                url,
                data=payload,
                method="POST",
                headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
            )
            with urlopen(request, timeout=180) as response:
                audio = response.read()
            if len(audio) < 1000:
                raise RuntimeError("returned audio is unexpectedly small")
            with tempfile.TemporaryDirectory(prefix="chain_es_v3_") as temp_dir:
                mp3 = Path(temp_dir) / "source.mp3"
                temp_wav = Path(temp_dir) / "result.wav"
                mp3.write_bytes(audio)
                subprocess.run(
                    ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(temp_wav)],
                    check=True,
                )
                shutil.move(str(temp_wav), output)
            if not wav_ok(output):
                raise RuntimeError("invalid WAV after conversion")
            return folder, number, output.stat().st_size
        except (HTTPError, OSError, RuntimeError, subprocess.CalledProcessError) as exc:
            last_error = exc
            if isinstance(exc, HTTPError) and exc.code not in {429, 500, 502, 503, 504}:
                detail = exc.read().decode("utf-8", errors="replace")[:500]
                raise RuntimeError(f"folder={folder} file={number:03d} HTTP {exc.code}: {detail}") from exc
            time.sleep(min(20, 2**attempt))
    raise RuntimeError(f"folder={folder} file={number:03d} failed after retries: {last_error}")


def main() -> int:
    if read_env("PHRASEMAN_ALLOW_ELEVENLABS_DEV_SPEND") != "1":
        raise RuntimeError("Set PHRASEMAN_ALLOW_ELEVENLABS_DEV_SPEND=1 for the authorized V3 batch.")
    api_key = read_env("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing.")
    batch = tasks()
    expected_characters = sum(len(item["text"]) for item in batch)
    request = Request("https://api.elevenlabs.io/v1/user/subscription", headers={"xi-api-key": api_key})
    with urlopen(request, timeout=60) as response:
        subscription = json.loads(response.read().decode("utf-8"))
    remaining = int(subscription.get("character_limit", 0)) - int(subscription.get("character_count", 0))
    if remaining < expected_characters + 1000:
        raise RuntimeError(f"Not enough ElevenLabs characters: need {expected_characters}, remaining {remaining}.")

    completed = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(synthesize, api_key, item) for item in batch]
        for future in as_completed(futures):
            future.result()
            completed += 1
            if completed % 50 == 0 or completed == len(batch):
                with PRINT_LOCK:
                    print(f"PROGRESS {completed}/{len(batch)}", flush=True)

    backups = sorted(PACKAGE.glob("_BACKUP_BEFORE_V3_*"))
    backup = backups[-1] if backups else PACKAGE / "_BACKUP_BEFORE_V3_AUDIO"
    for folder in (1, 2, 3, 4, 5, 7):
        backup_audio = backup / f"audio_{folder}"
        if not backup_audio.exists():
            shutil.copytree(PACKAGE / str(folder), backup_audio)
        for source in (STAGING / str(folder)).glob("*.wav"):
            shutil.copy2(source, PACKAGE / str(folder) / source.name)

    receipt = {
        "model_id": MODEL,
        "speed": SPEED,
        "files": len(batch),
        "characters": expected_characters,
        "voice_ids": {str(key): value for key, value in VOICE_IDS.items()},
        "completed": True,
    }
    RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"AUDIO_READY files={len(batch)} characters={expected_characters} model={MODEL} speed={SPEED}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
