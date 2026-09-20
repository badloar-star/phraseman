"""Озвучка пары «английская фраза + её русский перевод» для паузы.

Требование владельца 20.09.2026: «надо озвучить, но озвучить только его фразу
и перевод, без разбора».

зачем это НЕ возвращает прошлый баг: рассинхрон «озвучивается не то, что на
экране» возник потому, что озвучивался произвольный текст разбора, никак не
связанный с видеорядом. Здесь озвучиваются РОВНО два поля той же записи
phrases.json, которые и рисуются в кадре: 'text' и 'ru'. Сказать что-то
третье физически нельзя.

Два голоса: английскую фразу читает английский голос, перевод — русский.
Один голос на оба языка звучит с акцентом в одну из сторон.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

TAG = "[CLIPPER][tts-seq]"

URL = "https://api.elevenlabs.io/v1/text-to-speech/{vid}"
VOICE_EN = "21m00Tcm4TlvDq8ikWAM"          # Rachel — чистый английский
VOICE_RU = "ykZRIxgYtr1Fuwj2Yznj"          # билингв владельца, для русского
GAP_SEC = 0.35                              # тишина между фразой и переводом


def say(text: str, voice_id: str, out: Path, model: str) -> bool:
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        print(f"{TAG} РАННИЙ ВЫХОД: нет ELEVENLABS_API_KEY в окружении")
        return False

    payload = json.dumps({
        "text": text,
        "model_id": model,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75,
                           "style": 0.0, "use_speaker_boost": True},
    }).encode("utf-8")
    req = urllib.request.Request(
        URL.format(vid=voice_id), data=payload,
        headers={"xi-api-key": api_key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"}, method="POST")

    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            audio, code = resp.read(), resp.status
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:300]
        print(f"{TAG} ОШИБКА HTTP {exc.code}: {body}")
        if exc.code == 401:
            print(f"{TAG} причина: ключ недействителен или подписка кончилась")
        elif exc.code == 429:
            print(f"{TAG} причина: лимит символов исчерпан")
        return False
    except urllib.error.URLError as exc:
        print(f"{TAG} ОШИБКА сети: {exc.reason}")
        return False
    except Exception as exc:
        print(f"{TAG} ОШИБКА неожиданная: {type(exc).__name__}: {exc}")
        return False

    if not audio:
        print(f"{TAG} РАННИЙ ВЫХОД: ответ {code} пустой")
        return False
    out.write_bytes(audio)
    print(f"{TAG} {out.name}: {len(audio) / 1000:.0f} КБ за {time.time() - t0:.1f}с "
          f"(~{len(text)} знаков квоты)")
    return True


def join(en_mp3: Path, ru_mp3: Path, out: Path) -> bool:
    """Склеивает: английская фраза -> пауза -> перевод."""
    cmd = ["ffmpeg", "-y", "-i", str(en_mp3), "-i", str(ru_mp3),
           "-filter_complex",
           f"[0:a]adelay=0|0[a0];"
           f"aevalsrc=0:d={GAP_SEC}[sil];"
           f"[a0][sil][1:a]concat=n=3:v=0:a=1[out]",
           "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "3", str(out)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        noise = ("ffmpeg version", "built with", "configuration:", "  lib")
        lines = [ln for ln in proc.stderr.splitlines()
                 if ln.strip() and not ln.startswith(noise)]
        print(f"{TAG} ОШИБКА склейки озвучки: код {proc.returncode}")
        for ln in lines[-4:]:
            print(f"{TAG}   {ln.strip()}")
        return False
    return True


def main() -> int:
    if len(sys.argv) < 2:
        print(f"{TAG} использование: tts_seq.py <work> [лимит_фраз]")
        return 2
    workdir = Path(sys.argv[1])
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 0

    cfg = json.loads((Path(__file__).parent / "config" / "config.json")
                     .read_text(encoding="utf-8"))
    if not cfg.get("seq_voice", True):
        print(f"{TAG} РАННИЙ ВЫХОД: seq_voice=false в конфиге — озвучка отключена")
        return 0

    ppath = workdir / "phrases.json"
    if not ppath.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет {ppath}")
        return 1
    phrases = json.loads(ppath.read_text(encoding="utf-8"))
    if limit:
        phrases = phrases[:limit]
        print(f"{TAG} ограничение: первые {limit} фраз")

    voices = workdir / "voices"
    voices.mkdir(exist_ok=True)
    model = cfg.get("tts_model", "eleven_multilingual_v2")

    spent = sum(len(p.get("text", "")) + len(p.get("ru", "")) for p in phrases)
    print(f"{TAG} ВХОД: фраз={len(phrases)} · ориентировочный расход "
          f"~{spent} знаков квоты · модель={model}")

    done = 0
    for i, ph in enumerate(phrases, 1):
        pair = voices / f"pair_{i:02d}.mp3"
        if pair.exists():
            print(f"{TAG} {pair.name} уже есть — не переплачиваю")
            done += 1
            continue
        en, ru = ph.get("text", "").strip(), ph.get("ru", "").strip()
        if not en or not ru:
            print(f"{TAG} ПРОПУСК {i}: пустой text={bool(en)} или ru={bool(ru)}")
            continue

        en_mp3, ru_mp3 = voices / f"en_{i:02d}.mp3", voices / f"ru_{i:02d}.mp3"
        # зачем английский отдельным голосом: билингв читает англ. с заметным
        # акцентом, а фраза — эталон произношения, ради которого всё затевалось
        if not en_mp3.exists() and not say(en, VOICE_EN, en_mp3, model):
            print(f"{TAG} фраза {i}: английский не озвучен — пара пропущена")
            continue
        if not ru_mp3.exists() and not say(ru, VOICE_RU, ru_mp3, model):
            print(f"{TAG} фраза {i}: перевод не озвучен — пара пропущена")
            continue
        if join(en_mp3, ru_mp3, pair):
            done += 1

    print(f"{TAG} ИТОГ: озвучено пар {done} из {len(phrases)}")
    return 0 if done else 1


if __name__ == "__main__":
    sys.exit(main())
