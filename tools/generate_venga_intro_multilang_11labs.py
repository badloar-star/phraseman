#!/usr/bin/env python3
"""Generate VENGA intro voiceovers in multiple languages with the Alina Beauty voice."""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path
from typing import Any

import requests


OUT_DIR = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/intro-multilang-11labs")
DEFAULT_MODEL_ID = "eleven_multilingual_v2"
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"
ALINA_BEAUTY_VOICE_ID = "dH2EgYIVjY7q84hZZrSF"

TEXTS = {
    "de": {
        "label": "German",
        "language_code": "de",
        "text": (
            "In diesem Video bringe ich dir bei, Deutsch zu sprechen. "
            "Du brauchst keine dicken Lehrbücher und keinen Haufen auswendig gelernter Regeln. "
            "Du hörst 200 deutsche Sätze auf A1-Niveau, mit unterschiedlichen Sprechgeschwindigkeiten. "
            "Lass das Video im Hintergrund laufen, während du andere wichtige Dinge erledigst, "
            "und erschaffe um dich herum eine Sprachumgebung."
        ),
    },
    "en": {
        "label": "English",
        "language_code": "en",
        "text": (
            "In this video, I will teach you to speak English. "
            "You do not need thick textbooks or a pile of memorized rules. "
            "You will hear 200 A1-level English phrases at different speaking speeds. "
            "Play the video in the background while you do other important things, "
            "creating a language environment around you."
        ),
    },
    "es": {
        "label": "Spanish",
        "language_code": "es",
        "text": (
            "En este video te enseñaré a hablar español. "
            "No necesitas libros enormes ni un montón de reglas memorizadas. "
            "Escucharás 200 frases en español de nivel A1, con diferentes velocidades de voz. "
            "Pon el video de fondo mientras haces otras cosas importantes, "
            "creando a tu alrededor un entorno lingüístico."
        ),
    },
    "it": {
        "label": "Italian",
        "language_code": "it",
        "text": (
            "In questo video ti insegnerò a parlare italiano. "
            "Non ti servono libri enormi né una montagna di regole imparate a memoria. "
            "Ascolterai 200 frasi italiane di livello A1, con diverse velocità di pronuncia. "
            "Lascia il video in sottofondo mentre fai altre cose importanti, "
            "creando intorno a te un ambiente linguistico."
        ),
    },
}


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def probe(path: Path) -> dict[str, Any]:
    completed = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    data = json.loads(completed.stdout)
    stream = next(item for item in data["streams"] if item.get("codec_type") == "audio")
    return {
        "duration_sec": round(float(data.get("format", {}).get("duration") or stream.get("duration") or 0.0), 3),
        "codec": stream.get("codec_name"),
        "sample_rate": int(stream.get("sample_rate") or 0),
        "channels": int(stream.get("channels") or 0),
        "bit_rate": int(float(data.get("format", {}).get("bit_rate") or stream.get("bit_rate") or 0)),
        "size": int(Path(path).stat().st_size),
    }


def elevenlabs_tts(
    *,
    api_key: str,
    voice_id: str,
    model_id: str,
    language_code: str,
    text: str,
    output_format: str,
) -> bytes:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format={output_format}"
    payload = {
        "text": text,
        "model_id": model_id,
        "language_code": language_code,
        "voice_settings": {
            "stability": 0.50,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 1.0,
        },
        "apply_text_normalization": "on",
        "seed": 31052026,
    }
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key,
    }
    last_error: str | None = None
    for attempt in range(1, 5):
        response = requests.post(url, headers=headers, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"), timeout=120)
        if response.ok:
            return response.content
        last_error = f"HTTP {response.status_code}: {response.text[:500]}"
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"ElevenLabs request failed: {last_error}")


def main() -> int:
    env = load_env()
    api_key = env.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing in .env.local")
    model_id = env.get("ELEVENLABS_MODEL_ID") or DEFAULT_MODEL_ID
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, Any]] = []
    for code, item in TEXTS.items():
        path = OUT_DIR / f"intro_{code}_alina_beauty.mp3"
        print(f"[11labs-intro] {code} -> {path}", flush=True)
        audio = elevenlabs_tts(
            api_key=api_key,
            voice_id=ALINA_BEAUTY_VOICE_ID,
            model_id=model_id,
            language_code=item["language_code"],
            text=item["text"],
            output_format=DEFAULT_OUTPUT_FORMAT,
        )
        path.write_bytes(audio)
        meta = probe(path)
        manifest.append(
            {
                "code": code,
                "label": item["label"],
                "language_code": item["language_code"],
                "text": item["text"],
                "voice": "ALINA BEAUTY",
                "voice_id": ALINA_BEAUTY_VOICE_ID,
                "model_id": model_id,
                "output_format": DEFAULT_OUTPUT_FORMAT,
                "voice_settings": {
                    "stability": 0.50,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                    "speed": 1.0,
                },
                "path": str(path),
                "probe": meta,
            }
        )
    (OUT_DIR / "intro_multilang_manifest.json").write_text(
        json.dumps({"items": manifest}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"out_dir": str(OUT_DIR), "files": [item["path"] for item in manifest]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
