"""Шаг 1: видео -> транскрипт с таймкодами ПО СЛОВАМ.

зачем: без таймкодов на уровне слова невозможно поставить паузу ровно на конце
фразы — а именно это и есть весь формат. Транскрибируем ЛОКАЛЬНО (faster-whisper),
не через ElevenLabs: квота символов владельца исчерпана на 92%, тратить её на
распознавание нельзя.

Логи с префиксом [CLIPPER] по правилу владельца: всё, что решает ветвление,
печатается вместе со значением, каждый ранний выход — с причиной.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

TAG = "[CLIPPER][transcribe]"


def extract_audio(video: Path, out_wav: Path) -> bool:
    """Достаёт моно 16кГц wav — формат, который whisper любит больше всего."""
    print(f"{TAG} извлекаю аудио: {video.name} -> {out_wav.name}")
    t0 = time.time()
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000",
         "-c:a", "pcm_s16le", str(out_wav)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        # зачем: немой catch запрещён — печатаем реальную причину ffmpeg
        print(f"{TAG} РАННИЙ ВЫХОД: ffmpeg вернул код {proc.returncode}")
        print(f"{TAG} stderr (хвост): {proc.stderr[-600:]}")
        return False
    size_mb = out_wav.stat().st_size / 1_000_000 if out_wav.exists() else 0
    print(f"{TAG} аудио готово за {time.time()-t0:.1f}с, размер {size_mb:.1f} МБ")
    return True


def transcribe(wav: Path, model_name: str) -> dict | None:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        print(f"{TAG} РАННИЙ ВЫХОД: нет faster_whisper ({exc}). pip install faster-whisper")
        return None

    print(f"{TAG} гружу модель '{model_name}' (первый раз качает веса, это долго)")
    t0 = time.time()
    try:
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
    except Exception as exc:
        print(f"{TAG} РАННИЙ ВЫХОД: модель не загрузилась: {type(exc).__name__}: {exc}")
        return None
    print(f"{TAG} модель загружена за {time.time()-t0:.1f}с")

    print(f"{TAG} распознаю (word_timestamps=True — они и дают точку паузы)")
    t0 = time.time()
    try:
        segments, info = model.transcribe(
            str(wav), language="en", word_timestamps=True, vad_filter=True,
        )
    except Exception as exc:
        print(f"{TAG} РАННИЙ ВЫХОД: transcribe упал: {type(exc).__name__}: {exc}")
        return None

    words, seg_list = [], []
    for seg in segments:  # генератор: работа идёт здесь
        seg_list.append({"start": seg.start, "end": seg.end, "text": seg.text.strip()})
        for w in (seg.words or []):
            words.append({"start": w.start, "end": w.end, "word": w.word.strip()})

    print(f"{TAG} готово за {time.time()-t0:.1f}с · язык={info.language} "
          f"(уверенность {info.language_probability:.2f}) · "
          f"сегментов={len(seg_list)} · слов={len(words)}")
    if not words:
        print(f"{TAG} ВНИМАНИЕ: слов ноль — речи нет или она не распознана")
    return {"language": info.language, "duration": info.duration,
            "segments": seg_list, "words": words}


def main() -> int:
    if len(sys.argv) < 3:
        print(f"{TAG} использование: transcribe.py <видео> <папка_work> [модель]")
        return 2
    video, workdir = Path(sys.argv[1]), Path(sys.argv[2])
    model_name = sys.argv[3] if len(sys.argv) > 3 else "small"

    print(f"{TAG} ВХОД: видео={video} · work={workdir} · модель={model_name}")
    if not video.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: файла нет по пути {video}")
        return 1
    workdir.mkdir(parents=True, exist_ok=True)

    out_json = workdir / "transcript.json"
    if out_json.exists():
        # зачем: транскрипция самая долгая; повторный запуск не должен её повторять
        print(f"{TAG} transcript.json уже есть — пропускаю (удали файл для пересчёта)")
        return 0

    wav = workdir / "audio.wav"
    if not wav.exists():
        if not extract_audio(video, wav):
            return 1
    else:
        print(f"{TAG} audio.wav уже есть, переиспользую")

    data = transcribe(wav, model_name)
    if data is None:
        print(f"{TAG} РАННИЙ ВЫХОД: транскрипта нет, дальше идти нельзя")
        return 1

    out_json.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{TAG} РЕЗУЛЬТАТ: {out_json} · {len(data['words'])} слов с таймкодами")
    return 0


if __name__ == "__main__":
    sys.exit(main())
