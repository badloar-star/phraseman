from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(r"C:\appsprojects\phraseman")
ENV_PATH = ROOT / ".env.local"
RU_LIST = ROOT / ".codex-tmp" / "maymay-lists" / "ru_30x20.txt"
EN_LIST = ROOT / ".codex-tmp" / "maymay-lists" / "en_30x20.txt"
DESKTOP_DIR = Path(r"C:\Users\badlo\OneDrive\Desktop")

MODEL = "gpt-4o-mini-tts"
FORMAT = "mp3"
RU_VOICE = "marin"
EN_VOICE = "coral"

RU_INSTRUCTIONS = (
    "Speak in Russian with a warm, calm language-teacher tone. "
    "Use clear native pronunciation and natural conversational speed, neither slow nor fast. "
    "Say only the phrase exactly as written, then stop cleanly."
)

EN_INSTRUCTIONS = (
    "Speak English with a warm, calm language-teacher tone. "
    "Use clear pronunciation for learners and natural conversational speed, neither slow nor fast. "
    "Say only the phrase exactly as written, then stop cleanly."
)


def load_env_value(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if value:
        return value
    if not ENV_PATH.exists():
        return ""
    for raw_line in ENV_PATH.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw_value = line.split("=", 1)
        if key.strip() != name:
            continue
        value = raw_value.strip().strip('"').strip("'")
        return value
    return ""


def read_phrases(path: Path) -> list[str]:
    phrases = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if len(phrases) != 600:
        raise RuntimeError(f"{path} must contain 600 non-empty phrases, found {len(phrases)}")
    return phrases


def openai_tts(*, api_key: str, voice: str, instructions: str, text: str, retries: int = 5) -> bytes:
    payload = json.dumps(
        {
            "model": MODEL,
            "voice": voice,
            "input": text,
            "instructions": instructions,
            "response_format": FORMAT,
        },
        ensure_ascii=False,
    ).encode("utf-8")

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        request = urllib.request.Request(
            "https://api.openai.com/v1/audio/speech",
            data=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(f"OpenAI TTS failed {error.code}: {body[:600]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        if attempt < retries:
            time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI TTS failed after {retries} attempts: {last_error}")


def generate_set(
    *,
    api_key: str,
    language: str,
    phrases: list[str],
    out_dir: Path,
    voice: str,
    instructions: str,
    limit: int | None,
) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    selected = phrases[:limit] if limit else phrases
    written = 0
    for index, phrase in enumerate(selected, start=1):
        path = out_dir / f"{index}.mp3"
        if path.exists() and path.stat().st_size > 1024:
            continue
        print(f"[{language}] {index:03d}/{len(phrases):03d} {phrase}", flush=True)
        audio = openai_tts(api_key=api_key, voice=voice, instructions=instructions, text=phrase)
        tmp_path = path.with_suffix(".mp3.tmp")
        tmp_path.write_bytes(audio)
        tmp_path.replace(path)
        written += 1
    return written


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="", help="Output folder. Defaults to a timestamped folder on Desktop.")
    parser.add_argument("--limit", type=int, default=None, help="Generate only first N items per language.")
    args = parser.parse_args()

    api_key = load_env_value("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing in environment and .env.local")

    ru = read_phrases(RU_LIST)
    en = read_phrases(EN_LIST)
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    out_root = Path(args.output) if args.output else DESKTOP_DIR / f"MAYMAY_30x20_OPENAI_TTS_{timestamp}"
    # User-facing layout:
    #   1/ = Russian audio, numbered 1.mp3 ... 600.mp3
    #   2/ = English audio, numbered 1.mp3 ... 600.mp3
    out_ru = out_root / "1"
    out_en = out_root / "2"

    print(f"Output: {out_root}", flush=True)
    out_root.mkdir(parents=True, exist_ok=True)
    phrases_path = out_root / "phrases.txt"
    phrases_path.write_text("\n".join(ru + en) + "\n", encoding="utf-8")
    print(f"Phrases: {phrases_path}", flush=True)
    ru_written = generate_set(
        api_key=api_key,
        language="ru",
        phrases=ru,
        out_dir=out_ru,
        voice=RU_VOICE,
        instructions=RU_INSTRUCTIONS,
        limit=args.limit,
    )
    en_written = generate_set(
        api_key=api_key,
        language="en",
        phrases=en,
        out_dir=out_en,
        voice=EN_VOICE,
        instructions=EN_INSTRUCTIONS,
        limit=args.limit,
    )

    manifest = {
        "model": MODEL,
        "format": FORMAT,
        "ruVoice": RU_VOICE,
        "enVoice": EN_VOICE,
        "ruCount": len(ru[: args.limit] if args.limit else ru),
        "enCount": len(en[: args.limit] if args.limit else en),
        "ruWritten": ru_written,
        "enWritten": en_written,
        "output": str(out_root),
        "folder1": "Russian",
        "folder2": "English",
        "phrasesFile": str(phrases_path),
        "ruList": str(RU_LIST),
        "enList": str(EN_LIST),
    }
    (out_root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
