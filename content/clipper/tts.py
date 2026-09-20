"""Шаг 3: текст объяснения -> mp3.

зачем адаптер, а не прямой вызов: подписка ElevenLabs на аккаунте владельца
стоит на отмене (pending_change: cancellation), и квота символов на 20.09.2026
была израсходована на 92%. Конвейер не должен умереть вместе с подпиской —
смена провайдера должна стоить одну строку в config.json ("tts_provider").

Провайдеры:
  elevenlabs — боевой (нужен ELEVENLABS_API_KEY в окружении)
  none       — пропустить озвучку; render.py тогда ставит немую паузу
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

TAG = "[CLIPPER][tts]"

ELEVEN_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"  # Rachel — есть на любом аккаунте


def speak_elevenlabs(text: str, out: Path, cfg: dict) -> bool:
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        # зачем: без ключа дальше идти бессмысленно, но и падать нельзя —
        # render.py умеет собрать ролик с немой паузой.
        print(f"{TAG} РАННИЙ ВЫХОД: нет ELEVENLABS_API_KEY в окружении")
        return False

    voice_id = (cfg.get("tts_voice_id") or "").strip() or DEFAULT_VOICE
    payload = json.dumps({
        "text": text,
        "model_id": cfg.get("tts_model", "eleven_flash_v2_5"),
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.75,
                           "style": 0.0, "use_speaker_boost": True},
    }).encode("utf-8")

    req = urllib.request.Request(
        ELEVEN_URL.format(voice_id=voice_id),
        data=payload,
        headers={"xi-api-key": api_key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"},
        method="POST",
    )

    print(f"{TAG} запрос: голос={voice_id} модель={cfg.get('tts_model')} "
          f"знаков={len(text)}")
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            audio = resp.read()
            code = resp.status
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:400]
        print(f"{TAG} ОШИБКА HTTP {exc.code}: {body}")
        if exc.code == 401:
            print(f"{TAG} причина: ключ недействителен или подписка закончилась")
        elif exc.code == 429:
            print(f"{TAG} причина: лимит символов исчерпан — проверь квоту")
        return False
    except urllib.error.URLError as exc:
        print(f"{TAG} ОШИБКА сети: {exc.reason}")
        return False
    except Exception as exc:
        print(f"{TAG} ОШИБКА неожиданная: {type(exc).__name__}: {exc}")
        return False

    if not audio:
        print(f"{TAG} РАННИЙ ВЫХОД: ответ {code} пустой, аудио нет")
        return False

    out.write_bytes(audio)
    print(f"{TAG} готово: {out.name} · {len(audio) / 1000:.0f} КБ · "
          f"{time.time() - t0:.1f}с · потрачено ~{len(text)} знаков квоты")
    return True


def speak(text: str, out: Path, cfg: dict) -> bool:
    provider = cfg.get("tts_provider", "elevenlabs")
    if provider == "none":
        print(f"{TAG} провайдер 'none' — озвучка отключена в конфиге")
        return False
    if provider == "elevenlabs":
        return speak_elevenlabs(text, out, cfg)
    print(f"{TAG} РАННИЙ ВЫХОД: неизвестный провайдер {provider!r}")
    return False


def main() -> int:
    if len(sys.argv) < 2:
        print(f"{TAG} использование: tts.py <work>")
        return 2
    workdir = Path(sys.argv[1])
    cfg_path = Path(__file__).parent / "config" / "config.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))

    mpath = workdir / "moments.json"
    if not mpath.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет {mpath}")
        return 1
    moments = json.loads(mpath.read_text(encoding="utf-8"))
    print(f"{TAG} ВХОД: моментов={len(moments)} · провайдер={cfg.get('tts_provider')} "
          f"· порог={cfg['min_score']}")

    done = 0
    for i, moment in enumerate(moments, 1):
        score = moment.get("score", 0)
        if score < cfg["min_score"]:
            # зачем: главный предохранитель — слабый момент НЕ оплачиваем
            print(f"{TAG} ПРОПУСК {i}: оценка {score} < порога {cfg['min_score']} "
                  f"(символы сэкономлены)")
            continue
        out = workdir / f"voice_{i}.mp3"
        if out.exists():
            print(f"{TAG} {out.name} уже есть — не переплачиваю, переиспользую")
            done += 1
            continue
        text = (moment.get("voiceover") or "").strip()
        if not text:
            print(f"{TAG} ПРОПУСК {i}: пустой voiceover в moments.json")
            continue

        # зачем: пауза в ролике длится РОВНО столько, сколько звучит озвучка.
        # Замер 20.09.2026: 193 знака = 16 секунд стоп-кадра — удержание на
        # TikTok такого не переживает. Промпт просит коротко, но просьба не
        # гарантия: режем жёстко ДО оплаты, по границе предложения.
        cap = cfg.get("max_voiceover_chars", 150)
        if len(text) > cap:
            cut = text[:cap]
            dot = max(cut.rfind("."), cut.rfind("!"), cut.rfind("?"))
            trimmed = cut[:dot + 1] if dot > cap * 0.5 else cut.rstrip() + "."
            print(f"{TAG} момент {i}: разбор {len(text)} знаков > потолка {cap} "
                  f"— режу до {len(trimmed)} (экономия ~{len(text) - len(trimmed)} знаков квоты)")
            text = trimmed
        if speak(text, out, cfg):
            done += 1
        else:
            print(f"{TAG} момент {i} остался без озвучки — будет немая пауза")

    print(f"{TAG} ИТОГ: озвучено {done} из {len(moments)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
