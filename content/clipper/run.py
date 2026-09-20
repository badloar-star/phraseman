"""Раннер конвейера: папка видео -> папка готовых роликов.

Порядок шагов:
  1. transcribe.py     — видео -> транскрипт с таймкодами по словам (локально)
  2. select_moments.py — транскрипт -> prompt.txt (запрос к модели)
     ... сюда подставляется ответ модели в answer.json ...
     select_moments.py parse -> moments.json с таймкодами
  3. tts.py            — озвучка тех моментов, что прошли порог
  4. render.py         — сборка роликов

зачем разбито на шаги с файлами между ними: падение на шаге N не заставляет
переделывать 1..N-1, а самый долгий шаг (транскрипция) кэшируется навсегда.

Запуск:
  python content/clipper/run.py --prepare          # все видео из input/ до запроса
  python content/clipper/run.py --finish <имя>     # после того, как положен answer.json
  python content/clipper/run.py --one <файл>       # один файл, шаг подготовки
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

TAG = "[CLIPPER][run]"
HERE = Path(__file__).parent
VIDEO_EXT = {".mp4", ".mkv", ".mov", ".webm", ".m4v", ".avi"}


def load_cfg() -> dict:
    return json.loads((HERE / "config" / "config.json").read_text(encoding="utf-8"))


def step(script: str, args: list[str]) -> bool:
    """Запуск шага отдельным процессом.

    зачем PYTHONIOENCODING: на Windows консоль по умолчанию cp1252 и падает
    на русских логах — проверено на этой машине 20.09.2026.
    """
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    cmd = [sys.executable, str(HERE / script)] + args
    print(f"{TAG} --> {script} {' '.join(args)}")
    proc = subprocess.run(cmd, env=env)
    if proc.returncode != 0:
        print(f"{TAG} шаг {script} вернул код {proc.returncode}")
        return False
    return True


def work_dir_for(video: Path) -> Path:
    return HERE / "work" / video.stem


def prepare(video: Path, cfg: dict) -> bool:
    """Шаги 1-2: до момента, когда нужен ответ модели."""
    wd = work_dir_for(video)
    wd.mkdir(parents=True, exist_ok=True)
    print(f"{TAG} ГОТОВЛЮ: {video.name} -> {wd}")

    if not step("transcribe.py", [str(video), str(wd), cfg["whisper_model"]]):
        return False
    if not step("select_moments.py", [str(wd), "prompt", str(cfg["clips_per_video"])]):
        return False

    print(f"{TAG} ГОТОВО К ОТБОРУ: {wd / 'prompt.txt'}")
    return True


def finish(video: Path, cfg: dict) -> bool:
    """Шаги 2b-4: после того, как в work/<имя>/answer.json лёг ответ модели."""
    wd = work_dir_for(video)
    answer = wd / "answer.json"
    if not answer.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет {answer} — сначала ответ модели")
        return False

    if not step("select_moments.py", [str(wd), "parse"]):
        return False
    step("tts.py", [str(wd)])  # без озвучки ролик всё равно соберётся (немая пауза)
    return step("render.py", [str(video), str(wd), str(HERE / "output")])


def list_videos() -> list[Path]:
    inp = HERE / "input"
    inp.mkdir(parents=True, exist_ok=True)
    found = sorted(p for p in inp.iterdir()
                   if p.is_file() and p.suffix.lower() in VIDEO_EXT)
    print(f"{TAG} в input/ найдено видео: {len(found)}")
    return found


def main() -> int:
    cfg = load_cfg()
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2

    mode = args[0]

    if mode == "--one":
        if len(args) < 2:
            print(f"{TAG} нужен путь к файлу")
            return 2
        video = Path(args[1])
        if not video.exists():
            print(f"{TAG} РАННИЙ ВЫХОД: нет файла {video}")
            return 1
        return 0 if prepare(video, cfg) else 1

    if mode == "--prepare":
        videos = list_videos()
        if not videos:
            print(f"{TAG} РАННИЙ ВЫХОД: положи видео в {HERE / 'input'}")
            return 1
        ok = sum(1 for v in videos if prepare(v, cfg))
        print(f"{TAG} ИТОГ подготовки: {ok} из {len(videos)}")
        return 0 if ok else 1

    if mode == "--finish":
        if len(args) < 2:
            print(f"{TAG} нужен путь к видео или его имя")
            return 2
        candidate = Path(args[1])
        if not candidate.exists():
            matches = [p for p in list_videos() if p.stem == args[1]]
            if not matches:
                print(f"{TAG} РАННИЙ ВЫХОД: не нашёл видео {args[1]}")
                return 1
            candidate = matches[0]
        return 0 if finish(candidate, cfg) else 1

    print(f"{TAG} неизвестный режим: {mode}")
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
