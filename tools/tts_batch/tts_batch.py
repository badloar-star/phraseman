#!/usr/bin/env python3
"""
Пакетная озвучка списка фраз через локальный ComfyUI (TTS Audio Suite).

Зачем: владельцу нужно для роликов (MASON / LINGMAN / VIRAL) отдать список из
300-500 фраз и получить их озвученными ОДНИМ И ТЕМ ЖЕ голосом, пронумерованными,
в одной папке — вместо ручной прогонки каждой фразы в интерфейсе ComfyUI.

Почему поверх HTTP API, а не форк движка: движок владелец выбирает на слух
(ChatterBox 23L / OmniVoice / ...), и при смене движка скрипт менять не нужно —
меняется только --engine. Логика батча, нумерации и докачки остаётся общей.

Постоянство голоса: голос задаётся ИМЕНЕМ файла-образца в папке голосов ComfyUI
(models/voices/Имя.wav + Имя.reference.txt), а не случайным seed. Один и тот же
образец + фиксированный seed = один и тот же голос в любом запуске, хоть завтра.

Пример:
    python tts_batch.py --phrases phrases.txt --out ./out --voice "Мой_голос" \
        --engine chatterbox_23lang --language ru

Формат phrases.txt: одна фраза на строку. Пустые строки и строки, начинающиеся
с #, пропускаются (нумерация при этом не сбивается — считаются только фразы).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path

LOG = "[TTS-BATCH]"

# Ноды-движки TTS Audio Suite. Ключ — значение для --engine, значение — class_type
# ноды в графе ComfyUI. Список отражает движки, реально покрывающие все шесть
# языков владельца (RU/EN/DE/ES/FR/IT); остальные намеренно не включены.
# Имена сверены с живым ComfyUI через /object_info — не по догадке: у всех
# движков суффикс ...EngineNode, а единая нода озвучки называется
# UnifiedTTSTextNode (а не TTSTextNode).
ENGINE_NODES: dict[str, str] = {
    "chatterbox_23lang": "ChatterBoxOfficial23LangEngineNode",
    "omnivoice": "OmniVoiceEngineNode",
    "higgs_v3": "HiggsAudioV3EngineNode",  # лицензия Non-Commercial, см. README
    "moss": "MossTTSEngineNode",
}

TTS_TEXT_NODE = "UnifiedTTSTextNode"


@dataclass(frozen=True)
class Job:
    """Одна фраза + её место в выдаче. Неизменяемый — чтобы индекс не поехал."""

    index: int  # 1-based, попадает в имя файла
    text: str


def log(msg: str) -> None:
    print(f"{LOG} {msg}", flush=True)


def read_phrases(path: Path) -> list[Job]:
    """Читает список фраз. Пустые строки и комментарии не занимают номер."""
    if not path.is_file():
        raise SystemExit(f"{LOG} ОШИБКА: файл фраз не найден: {path}")

    jobs: list[Job] = []
    skipped = 0
    with path.open(encoding="utf-8-sig") as fh:  # utf-8-sig: Блокнот пишет BOM
        for raw_no, raw in enumerate(fh, start=1):
            text = raw.strip()
            if not text or text.startswith("#"):
                skipped += 1
                continue
            jobs.append(Job(index=len(jobs) + 1, text=text))

    log(f"прочитано фраз: {len(jobs)}, пропущено строк (пустые/комментарии): {skipped}")
    if not jobs:
        raise SystemExit(f"{LOG} ОШИБКА: в {path} нет ни одной фразы")
    return jobs


def http_json(url: str, payload: dict | None = None, timeout: int = 30) -> dict:
    """POST (если payload) или GET на ComfyUI. Любая ошибка называет причину."""
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500]
        # зачем: молчаливый отказ сервера — главная причина "скрипт просто встал"
        raise RuntimeError(f"HTTP {exc.code} от {url}: {detail}") from exc
    except (urllib.error.URLError, OSError) as exc:
        # зачем: ConnectionRefusedError — это OSError, а не URLError, и без него
        # владелец при незапущенном ComfyUI видел голый traceback вместо причины
        reason = getattr(exc, "reason", exc)
        raise RuntimeError(
            f"нет связи с ComfyUI по {url}: {reason}. "
            f"Запущен ли ComfyUI? Запустите C:\\ComfyUI\\run_nvidia_gpu.bat "
            f"и дождитесь строки 'To see the GUI go to: http://127.0.0.1:8188'"
        ) from exc


def check_server(server: str) -> None:
    """Проверяет, что ComfyUI жив и нужные ноды реально зарегистрированы."""
    info = http_json(f"{server}/object_info")
    log(f"ComfyUI отвечает, зарегистрировано типов нод: {len(info)}")
    return info


# Код языка -> как его называет конкретный движок.
# Зачем: ChatterBox ждёт слово ("Russian"), а не код ISO ("ru"); OmniVoice
# определяет язык сам по тексту. Без этой таблицы сервер молча отвергал задание.
LANGUAGE_NAMES: dict[str, str] = {
    "ru": "Russian",
    "en": "English",
    "de": "German",
    "es": "Spanish",
    "fr": "French",
    "it": "Italian",
}


def engine_defaults(info: dict, engine_node: str) -> dict:
    """
    Берёт значения по умолчанию ПРЯМО У СЕРВЕРА для всех обязательных полей движка.

    Зачем: у каждого движка свой набор обязательных параметров (у ChatterBox их 9,
    у OmniVoice 8), и пропуск любого = отказ задания. Читать их у сервера надёжнее,
    чем держать копию списка в скрипте и ловить рассинхрон после обновления ноды.
    """
    required = info.get(engine_node, {}).get("input", {}).get("required", {})
    values: dict[str, object] = {}
    for name, spec in required.items():
        opts = spec[0] if spec else None
        meta = spec[1] if len(spec) > 1 and isinstance(spec[1], dict) else {}
        if "default" in meta:
            values[name] = meta["default"]
        elif isinstance(opts, list) and opts:
            values[name] = opts[0]
    return values


def build_graph(
    job: Job,
    engine_node: str,
    engine_inputs: dict,
    voice: str,
    seed: int,
    filename_prefix: str,
) -> dict:
    """
    Собирает минимальный граф: движок -> озвучка -> сохранение.

    Зачем так: граф строится на КАЖДУЮ фразу отдельно, а не одним длинным текстом.
    Иначе движок склеит всё в один файл, а владельцу нужны отдельные
    пронумерованные файлы под каждую фразу для монтажа.
    """
    return {
        "1": {
            "class_type": engine_node,
            "inputs": dict(engine_inputs),  # копия: граф не должен мутировать общие настройки
        },
        "2": {
            "class_type": TTS_TEXT_NODE,
            "inputs": {
                "TTS_engine": ["1", 0],
                "text": job.text,
                "narrator_voice": voice,
                "seed": seed,  # фиксирован -> голос не «плывёт» между фразами
                "enable_chunking": False,  # фразы короткие, нарезка только вредит
                "enable_audio_cache": True,
            },
        },
        "3": {
            "class_type": "SaveAudio",
            "inputs": {
                "audio": ["2", 0],
                "filename_prefix": f"{filename_prefix}/{job.index:03d}",
            },
        },
    }


def submit(server: str, graph: dict, client_id: str) -> str:
    """Ставит задание в очередь, возвращает prompt_id."""
    res = http_json(server + "/prompt", {"prompt": graph, "client_id": client_id})
    prompt_id = res.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"ComfyUI не вернул prompt_id, ответ: {res}")
    return prompt_id


def wait_done(server: str, prompt_id: str, timeout_s: int) -> dict:
    """
    Ждёт завершения задания.

    Зачем таймаут: без него одна зависшая фраза останавливает весь батч из 500
    навсегда, и владелец видит замерший экран без причины.
    """
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        hist = http_json(f"{server}/history/{prompt_id}", timeout=15)
        entry = hist.get(prompt_id)
        if entry:
            status = entry.get("status", {})
            if status.get("status_str") == "error" or status.get("completed") is False:
                raise RuntimeError(f"ComfyUI вернул ошибку: {json.dumps(status)[:400]}")
            if entry.get("outputs"):
                return entry
        time.sleep(1.0)
    raise TimeoutError(
        f"фраза не озвучена за {timeout_s} с (prompt_id={prompt_id}). "
        f"Модель могла не поместиться в VRAM — смотрите окно ComfyUI."
    )


def collect_output(server: str, entry: dict, dest: Path) -> Path:
    """Скачивает готовый аудиофайл из ComfyUI в целевую папку."""
    for node_out in entry.get("outputs", {}).values():
        for key in ("audio", "audios"):
            for item in node_out.get(key, []) or []:
                params = urllib.parse.urlencode(
                    {
                        "filename": item["filename"],
                        "subfolder": item.get("subfolder", ""),
                        "type": item.get("type", "output"),
                    }
                )
                url = f"{server}/view?{params}"
                suffix = Path(item["filename"]).suffix or ".wav"
                target = dest.with_suffix(suffix)
                with urllib.request.urlopen(url, timeout=120) as resp:
                    target.write_bytes(resp.read())
                return target
    raise RuntimeError(
        f"задание завершилось, но аудио в выходных данных нет: "
        f"{json.dumps(entry.get('outputs', {}))[:300]}"
    )


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Пакетная озвучка списка фраз через локальный ComfyUI."
    )
    ap.add_argument("--phrases", required=True, type=Path, help="txt, фраза на строку")
    ap.add_argument("--out", required=True, type=Path, help="папка для результата")
    ap.add_argument(
        "--voice",
        required=True,
        help="имя сохранённого голоса (файл в ComfyUI/models/voices без расширения)",
    )
    ap.add_argument(
        "--engine",
        default="chatterbox_23lang",
        choices=sorted(ENGINE_NODES),
        help="движок озвучки",
    )
    ap.add_argument(
        "--language",
        default="ru",
        choices=sorted(LANGUAGE_NAMES),
        help="язык фраз: ru/en/de/es/fr/it",
    )
    ap.add_argument("--seed", type=int, default=42, help="фиксирует голос между запусками")
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--timeout", type=int, default=600, help="секунд на одну фразу")
    ap.add_argument(
        "--resume",
        action="store_true",
        help="пропускать фразы, чей файл уже есть (продолжить прерванный батч)",
    )
    args = ap.parse_args()

    server = args.server.rstrip("/")
    engine_node = ENGINE_NODES[args.engine]

    jobs = read_phrases(args.phrases)
    args.out.mkdir(parents=True, exist_ok=True)

    try:
        info = check_server(server)
    except RuntimeError as exc:
        # зачем: сервер не поднят — самая частая причина запуска «в пустоту»;
        # владелец должен увидеть что делать, а не стек вызовов urllib
        raise SystemExit(f"{LOG} ОШИБКА: {exc}") from None

    for needed in (engine_node, TTS_TEXT_NODE, "SaveAudio"):
        if needed not in info:
            log(f"ВНИМАНИЕ: нода '{needed}' не зарегистрирована в ComfyUI.")
            log("Доступные ноды TTS: " + ", ".join(sorted(
                n for n in info if "TTS" in n or "Engine" in n
            ))[:500])
            raise SystemExit(f"{LOG} ОШИБКА: движок '{args.engine}' недоступен")

    # Дефолты движка берём у сервера, затем подменяем только язык.
    engine_inputs = engine_defaults(info, engine_node)
    lang_spec = info[engine_node]["input"]["required"].get("language", [None])
    lang_choices = lang_spec[0] if isinstance(lang_spec[0], list) else None
    if lang_choices:
        wanted = LANGUAGE_NAMES[args.language]
        if wanted not in lang_choices:
            # зачем: движок без нужного языка — это не «немного хуже», а гарантия
            # акцента и каши; лучше остановиться сразу, чем озвучить 500 фраз в брак
            raise SystemExit(
                f"{LOG} ОШИБКА: движок '{args.engine}' не поддерживает "
                f"{wanted}. Доступно: {', '.join(lang_choices)}"
            )
        engine_inputs["language"] = wanted
        log(f"движок: {args.engine}, язык: {wanted}")
    else:
        # OmniVoice определяет язык сам по тексту — строка 'Auto' остаётся
        log(f"движок: {args.engine}, язык определяется автоматически")

    client_id = str(uuid.uuid4())
    prefix = f"tts_batch_{int(time.time())}"
    ok, failed, skipped = 0, [], 0
    started = time.monotonic()

    for job in jobs:
        dest = args.out / f"{job.index:03d}"
        if args.resume and any(args.out.glob(f"{job.index:03d}.*")):
            skipped += 1
            continue

        preview = job.text if len(job.text) <= 60 else job.text[:57] + "..."
        log(f"[{job.index}/{len(jobs)}] {preview}")
        try:
            graph = build_graph(
                job, engine_node, engine_inputs, args.voice, args.seed, prefix
            )
            entry = wait_done(server, submit(server, graph, client_id), args.timeout)
            saved = collect_output(server, entry, dest)
            ok += 1
            log(f"    -> {saved.name} ({saved.stat().st_size // 1024} КБ)")
        except Exception as exc:  # зачем: одна плохая фраза не рвёт батч из 500
            failed.append((job.index, job.text, str(exc)))
            log(f"    !! ОШИБКА на фразе {job.index}: {exc}")

    elapsed = time.monotonic() - started
    log("=" * 60)
    log(f"готово: {ok} | пропущено (--resume): {skipped} | ошибок: {len(failed)}")
    log(f"время: {elapsed / 60:.1f} мин, папка: {args.out.resolve()}")

    if failed:
        report = args.out / "_errors.txt"
        with report.open("w", encoding="utf-8") as fh:
            for idx, text, err in failed:
                fh.write(f"{idx:03d}\t{text}\t{err}\n")
        log(f"список несработавших фраз: {report}")
        log("повторить только их: тот же запуск с --resume")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
