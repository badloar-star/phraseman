#!/usr/bin/env python3
"""Generate ElevenLabs audio for the VENGA phrase template."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_MODEL_ID = "eleven_multilingual_v2"
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"

DEFAULT_RU_VOICE_ID = "3EuKHIEZbSzrHGNmdYsx"  # Nikolay - Professional YouTube / native Russian
DEFAULT_EN_1_VOICE_ID = "Xb7hH8MSUJpSbSDYk0k2"  # Alice - clear educator
DEFAULT_EN_2_VOICE_ID = "CwhRBWXzGAHq8TQ4Fs17"  # Roger - casual resonant
DEFAULT_EN_3_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # Sarah - reassuring, clear


@dataclass(frozen=True)
class PhraseRow:
    index: int
    ru: str
    en: str
    ipa: str
    breakdown: str


ROLE_CONFIG: dict[str, dict[str, Any]] = {
    "ru": {
        "language_code": "ru",
        "speed": 0.9,
        "stability": 0.7,
        "similarity_boost": 0.85,
        "style": 0.05,
    },
    "en1": {
        "language_code": "en",
        "speed": 0.72,
        "stability": 0.72,
        "similarity_boost": 0.86,
        "style": 0.03,
    },
    "en2": {
        "language_code": "en",
        "speed": 0.88,
        "stability": 0.68,
        "similarity_boost": 0.84,
        "style": 0.05,
    },
    "en3": {
        "language_code": "en",
        "speed": 1.08,
        "stability": 0.68,
        "similarity_boost": 0.84,
        "style": 0.05,
    },
}


RU_STRESS_OVERRIDES: dict[str, str] = {
    "автобус": "авто́бус",
    "автобусе": "авто́бусе",
    "английский": "англи́йский",
    "английских": "англи́йских",
    "английски": "англи́йски",
    "билет": "биле́т",
    "брата": "бра́та",
    "брат": "бра́т",
    "будет": "бу́дет",
    "вернусь": "верну́сь",
    "вернёшься": "вернёшься",
    "видео": "ви́део",
    "вместе": "вме́сте",
    "вопрос": "вопро́с",
    "вопрос?": "вопро́с?",
    "времени": "вре́мени",
    "выглядит": "вы́глядит",
    "выглядишь": "вы́глядишь",
    "говори": "говори́",
    "говорим": "говори́м",
    "говорит": "говори́т",
    "говорят": "говоря́т",
    "говоришь": "говори́шь",
    "голоден": "го́лоден",
    "город": "го́род",
    "готов": "гото́в",
    "готово": "гото́во",
    "готовы": "гото́вы",
    "готов?": "гото́в?",
    "грустный": "гру́стный",
    "далеко": "далеко́",
    "дверь": "дверь",
    "день": "день",
    "деньги": "де́ньги",
    "денег": "де́нег",
    "дорого": "до́рого",
    "друг": "друг",
    "друга": "дру́га",
    "еду": "е́ду",
    "едим": "еди́м",
    "завтрак": "за́втрак",
    "закончится": "зако́нчится",
    "закрывается": "закрыва́ется",
    "занят": "за́нят",
    "занят?": "за́нят?",
    "зарядить": "заряди́ть",
    "здесь": "здесь",
    "знаем": "зна́ем",
    "знает": "зна́ет",
    "знаешь": "зна́ешь",
    "знаю": "зна́ю",
    "знают": "зна́ют",
    "идея": "иде́я",
    "идём": "идём",
    "идти": "идти́",
    "иду": "иду́",
    "извини": "извини́",
    "изменилось": "измени́лось",
    "каждый": "ка́ждый",
    "картой": "ка́ртой",
    "красиво": "краси́во",
    "купить": "купи́ть",
    "куплю": "куплю́",
    "любит": "лю́бит",
    "любят": "лю́бят",
    "магазин": "магази́н",
    "магазине": "магази́не",
    "машина": "маши́на",
    "машине": "маши́не",
    "меня": "меня́",
    "медленно": "ме́дленно",
    "медленнее": "ме́дленнее",
    "минуту": "мину́ту",
    "можешь": "мо́жешь",
    "могу": "могу́",
    "можно": "мо́жно",
    "молчит": "молчи́т",
    "молчишь": "молчи́шь",
    "музыка": "му́зыка",
    "музыку": "му́зыку",
    "найду": "найду́",
    "начинаем": "начина́ем",
    "начнём": "начнём",
    "нужно": "ну́жно",
    "нужен": "ну́жен",
    "ответ": "отве́т",
    "открою": "откро́ю",
    "открывается": "открыва́ется",
    "подарок": "пода́рок",
    "подожди": "подожди́",
    "позвонить": "позвони́ть",
    "позвоню": "позвоню́",
    "покажи": "покажи́",
    "помогу": "помогу́",
    "помочь": "помо́чь",
    "помощь": "по́мощь",
    "понял": "по́нял",
    "понимает": "понима́ет",
    "понимаешь": "понима́ешь",
    "понимаю": "понима́ю",
    "понимают": "понима́ют",
    "попробуем": "попро́буем",
    "попробую": "попро́бую",
    "послушай": "послу́шай",
    "почему": "почему́",
    "почту": "по́чту",
    "прав": "прав",
    "придёшь": "придёшь",
    "проверить": "прове́рить",
    "просыпаюсь": "просыпа́юсь",
    "работаешь": "рабо́таешь",
    "работаем": "рабо́таем",
    "работаю": "рабо́таю",
    "работать": "рабо́тать",
    "раз": "раз",
    "рано": "ра́но",
    "рядом": "ря́дом",
    "сейчас": "сейча́с",
    "сестра": "сестра́",
    "слышал": "слы́шал",
    "слышишь": "слы́шишь",
    "смеёшься": "смеёшься",
    "смотрим": "смо́трим",
    "смотрю": "смотрю́",
    "снова": "сно́ва",
    "стоит": "сто́ит",
    "странно": "стра́нно",
    "стиль": "стиль",
    "сумка": "су́мка",
    "тихо": "ти́хо",
    "телефон": "телефо́н",
    "тебе": "тебе́",
    "тебя": "тебя́",
    "устал": "уста́л",
    "учиться": "учи́ться",
    "учу": "учу́",
    "фильм": "фильм",
    "хлеб": "хлеб",
    "холодно": "хо́лодно",
    "хорошо": "хорошо́",
    "хочу": "хочу́",
    "читаю": "чита́ю",
}


def load_env_file(start: Path) -> dict[str, str]:
    current = start.resolve()
    env_path = next(
        (folder / ".env.local" for folder in [current, *current.parents] if (folder / ".env.local").exists()),
        None,
    )
    if not env_path:
        return {}
    values: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def parse_phrase_file(path: Path) -> list[PhraseRow]:
    rows: list[PhraseRow] = []
    pattern = re.compile(r"^(\d+)\.\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$")
    for line in path.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line.strip())
        if not match:
            continue
        rows.append(
            PhraseRow(
                index=int(match.group(1)),
                ru=match.group(2).strip(),
                en=match.group(3).strip(),
                ipa=match.group(4).strip(),
                breakdown=match.group(5).strip(),
            )
        )
    if len(rows) != 200:
        raise ValueError(f"Expected 200 phrase rows, got {len(rows)} from {path}")
    expected = list(range(1, 201))
    actual = [row.index for row in rows]
    if actual != expected:
        raise ValueError("Phrase rows must be numbered from 1 to 200 without gaps")
    return rows


def add_russian_stress_marks(text: str) -> str:
    parts = re.findall(r"[А-Яа-яЁё]+|[^А-Яа-яЁё]+", text)
    stressed: list[str] = []
    for part in parts:
        lower = part.lower()
        replacement = RU_STRESS_OVERRIDES.get(lower)
        if not replacement:
            stressed.append(part)
            continue
        if part[:1].isupper():
            replacement = replacement[:1].upper() + replacement[1:]
        stressed.append(replacement)
    return "".join(stressed)


def normalize_tts_text(role: str, row: PhraseRow) -> str:
    if role == "ru":
        text = add_russian_stress_marks(row.ru)
    else:
        text = row.en
    text = text.replace("—", "-").strip()
    if text.endswith("?"):
        return text
    if not text.endswith((".", "!")):
        text += "."
    return text


def voice_config(env: dict[str, str]) -> dict[str, str]:
    return {
        "ru": env.get("ELEVENLABS_RU_VOICE_ID")
        or env.get("ELEVENLABS_RU_TIP_VOICE_ID")
        or DEFAULT_RU_VOICE_ID,
        "en1": env.get("ELEVENLABS_EN_VOICE_1_ID") or DEFAULT_EN_1_VOICE_ID,
        "en2": env.get("ELEVENLABS_EN_VOICE_2_ID") or DEFAULT_EN_2_VOICE_ID,
        "en3": env.get("ELEVENLABS_EN_VOICE_3_ID") or DEFAULT_EN_3_VOICE_ID,
    }


def request_hash(*, role: str, row: PhraseRow, voice_id: str, model_id: str, text: str) -> str:
    payload = {
        "role": role,
        "index": row.index,
        "voice_id": voice_id,
        "model_id": model_id,
        "text": text,
        "settings": ROLE_CONFIG[role],
    }
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def tts_request(
    *,
    api_key: str,
    voice_id: str,
    model_id: str,
    role: str,
    text: str,
    previous_text: str | None,
    next_text: str | None,
    output_format: str,
    retries: int = 4,
) -> bytes:
    query = urllib.parse.urlencode({"output_format": output_format})
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?{query}"
    role_config = ROLE_CONFIG[role]
    payload: dict[str, Any] = {
        "text": text,
        "model_id": model_id,
        "language_code": role_config["language_code"],
        "voice_settings": {
            "stability": role_config["stability"],
            "similarity_boost": role_config["similarity_boost"],
            "style": role_config["style"],
            "use_speaker_boost": True,
            "speed": role_config["speed"],
        },
        "apply_text_normalization": "on",
        "seed": 11052026 + len(text) + len(role),
    }
    if previous_text:
        payload["previous_text"] = previous_text
    if next_text:
        payload["next_text"] = next_text

    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key,
    }
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            request = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(f"HTTP {error.code}: {body[:500]}")
        except urllib.error.URLError as error:
            last_error = error
        if attempt < retries:
            time.sleep(1.5 * attempt)
    raise RuntimeError(f"ElevenLabs request failed after {retries} attempts: {last_error}")


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed.returncode != 0:
        return 0.0
    try:
        return round(float(completed.stdout.strip()), 3)
    except ValueError:
        return 0.0


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def append_log(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")


def build_manifest(
    *,
    rows: list[PhraseRow],
    voices: dict[str, str],
    model_id: str,
    output_format: str,
    out_dir: Path,
) -> list[dict[str, Any]]:
    manifest: list[dict[str, Any]] = []
    for row in rows:
        for role in ("ru", "en1", "en2", "en3"):
            tts_text = normalize_tts_text(role, row)
            source_text = row.ru if role == "ru" else row.en
            digest = request_hash(role=role, row=row, voice_id=voices[role], model_id=model_id, text=tts_text)
            path = out_dir / role / f"{row.index:03d}_{digest}.mp3"
            manifest.append(
                {
                    "index": row.index,
                    "role": role,
                    "source_text": source_text,
                    "tts_text": tts_text,
                    "ipa": row.ipa,
                    "breakdown": row.breakdown,
                    "voice_id": voices[role],
                    "voice_settings": ROLE_CONFIG[role],
                    "model_id": model_id,
                    "output_format": output_format,
                    "path": path.as_posix(),
                    "duration_sec": None,
                    "status": "pending",
                }
            )
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phrases", type=Path, default=Path("exports/venga-phrase-packs/first-200-a1-everyday-review.md"))
    parser.add_argument("--out-dir", type=Path, default=Path("exports/venga-phrase-packs/first-200-a1-everyday-audio"))
    parser.add_argument("--model-id", default=None)
    parser.add_argument("--output-format", default=DEFAULT_OUTPUT_FORMAT)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Generate only the first N phrase rows; 0 means all.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    env = load_env_file(Path.cwd())
    api_key = env.get("ELEVENLABS_API_KEY")
    if not api_key and not args.dry_run:
        raise RuntimeError("ELEVENLABS_API_KEY is required in .env.local")

    rows = parse_phrase_file(args.phrases)
    if args.limit:
        rows = rows[: args.limit]
    voices = voice_config(env)
    model_id = args.model_id or env.get("ELEVENLABS_MODEL_ID") or DEFAULT_MODEL_ID

    args.out_dir.mkdir(parents=True, exist_ok=True)
    manifest = build_manifest(
        rows=rows,
        voices=voices,
        model_id=model_id,
        output_format=args.output_format,
        out_dir=args.out_dir,
    )
    write_json(args.out_dir / "voice_config.json", {"voices": voices, "model_id": model_id, "roles": ROLE_CONFIG})
    write_json(args.out_dir / "tts_manifest.planned.json", manifest)
    if args.dry_run:
        print(json.dumps({"planned_files": len(manifest), "out_dir": args.out_dir.as_posix()}, ensure_ascii=False))
        return 0

    by_key = {(item["index"], item["role"]): item for item in manifest}
    log_path = args.out_dir / "generation_log.jsonl"
    generated = 0
    skipped = 0
    failed = 0
    total = len(manifest)
    started_at = time.time()

    for position, item in enumerate(manifest, start=1):
        path = Path(item["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.stat().st_size > 1000 and not args.overwrite:
            item["duration_sec"] = probe_duration(path)
            item["status"] = "cached"
            skipped += 1
            append_log(log_path, {"event": "cached", "position": position, "total": total, "path": path.as_posix()})
            continue

        row = next(row for row in rows if row.index == item["index"])
        role = str(item["role"])
        previous_item = by_key.get((row.index - 1, role))
        next_item = by_key.get((row.index + 1, role))
        previous_text = previous_item["tts_text"] if previous_item else None
        next_text = next_item["tts_text"] if next_item else None

        append_log(
            log_path,
            {
                "event": "tts_start",
                "position": position,
                "total": total,
                "index": row.index,
                "role": role,
                "path": path.as_posix(),
            },
        )
        print(f"[tts] {position:03d}/{total:03d} {role} {row.index:03d}", flush=True)
        try:
            audio = tts_request(
                api_key=str(api_key),
                voice_id=str(item["voice_id"]),
                model_id=model_id,
                role=role,
                text=str(item["tts_text"]),
                previous_text=str(previous_text) if previous_text else None,
                next_text=str(next_text) if next_text else None,
                output_format=args.output_format,
            )
            path.write_bytes(audio)
            item["duration_sec"] = probe_duration(path)
            item["status"] = "generated"
            generated += 1
            append_log(
                log_path,
                {
                    "event": "tts_done",
                    "position": position,
                    "total": total,
                    "index": row.index,
                    "role": role,
                    "bytes": path.stat().st_size,
                    "duration_sec": item["duration_sec"],
                    "elapsed_sec": round(time.time() - started_at, 1),
                },
            )
        except Exception as error:
            item["status"] = "failed"
            item["error"] = str(error)
            failed += 1
            write_json(args.out_dir / "tts_manifest.partial.json", manifest)
            append_log(
                log_path,
                {
                    "event": "tts_failed",
                    "position": position,
                    "total": total,
                    "index": row.index,
                    "role": role,
                    "error": str(error),
                },
            )
            raise

    write_json(args.out_dir / "tts_manifest.json", manifest)
    summary = {
        "out_dir": args.out_dir.as_posix(),
        "source_phrases": args.phrases.as_posix(),
        "planned": total,
        "generated": generated,
        "cached": skipped,
        "failed": failed,
        "duration_sec": round(time.time() - started_at, 1),
        "roles": {role: sum(1 for item in manifest if item["role"] == role and item["status"] in {"generated", "cached"}) for role in ("ru", "en1", "en2", "en3")},
    }
    write_json(args.out_dir / "generation_summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
