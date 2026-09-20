"""Пакетная сборка N роликов из одного исходника.

Требование владельца 20.09.2026: «сделай мне таких 10 видео и на рабочем столе
сделай папку».

Как устроено: видео делится на N непересекающихся отрезков, каждый получает
СВОЮ рабочую подпапку (work/batch_NN) и проходит цепочку
phrases -> [перевод] -> tts_seq -> render_seq. Готовый файл копируется в папку
назначения.

зачем отдельные подпапки: phrases.json, озвучки и куски одного ролика не должны
смешиваться с другим. Одна общая папка уже приводила к тому, что переводы
слетали при пересоздании (20.09.2026).

Шаг перевода ОСТАЁТСЯ ручным: скрипт печатает, что нужно перевести, и
останавливается. Автоматический вызов модели — отдельная задача.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

TAG = "[CLIPPER][batch]"
HERE = Path(__file__).parent


def step(script: str, args: list[str]) -> bool:
    """Запуск шага отдельным процессом.

    зачем PYTHONIOENCODING: на Windows консоль cp1252 и падает на русских
    логах — проверено на этой машине 20.09.2026.
    """
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    proc = subprocess.run([sys.executable, str(HERE / script)] + args,
                          env=env, capture_output=True, text=True,
                          encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        print(f"{TAG}   шаг {script} вернул {proc.returncode}")
        for ln in (proc.stdout or "").splitlines()[-6:]:
            print(f"{TAG}     {ln}")
        for ln in (proc.stderr or "").splitlines()[-4:]:
            print(f"{TAG}     ! {ln}")
        return False
    return True


def resolve_dest(raw: str) -> Path:
    """Разворачивает 'desktop' в НАСТОЯЩИЙ рабочий стол пользователя.

    зачем: 20.09.2026 файлы легли в C:\\Users\\badlo\\Desktop, а реальный
    рабочий стол владельца перенесён в OneDrive — он их не увидел. Windows
    молча создаёт скрытый каталог-двойник, и ошибка выглядит как «ничего не
    сработало». Проверяем у системы, а не угадываем.
    """
    if raw.strip().lower() not in ("desktop", "рабочий стол", "~desktop"):
        return Path(raw)

    # 1) реестр Windows — самый надёжный источник
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders")
        value, _ = winreg.QueryValueEx(key, "Desktop")
        winreg.CloseKey(key)
        p = Path(os.path.expandvars(value))
        if p.exists():
            print(f"{TAG} рабочий стол из реестра: {p}")
            return p
        print(f"{TAG} реестр дал {p}, но такой папки нет — пробую откат")
    except ImportError as exc:
        print(f"{TAG} реестр недоступен (не Windows?): {exc} — пробую откат")
    except OSError as exc:
        print(f"{TAG} реестр не прочитался: {exc} — пробую откат")

    # 2) откат: OneDrive раньше обычной папки, он чаще и есть настоящий
    home = Path(os.path.expanduser("~"))
    for cand in (home / "OneDrive" / "Desktop", home / "Desktop"):
        if cand.exists():
            print(f"{TAG} рабочий стол определён перебором: {cand}")
            return cand

    fallback = home / "Desktop"
    print(f"{TAG} ВНИМАНИЕ: рабочий стол не найден, беру {fallback} — "
          f"файлы могут оказаться не там, где ты смотришь")
    return fallback


def transcript_span(workdir: Path) -> tuple[float, float]:
    """Границы речи в исходнике — режем по ним, а не по длине файла."""
    t = json.loads((workdir / "transcript.json").read_text(encoding="utf-8"))
    words = t.get("words", [])
    if not words:
        print(f"{TAG} РАННИЙ ВЫХОД: в транскрипте нет слов")
        return 0.0, 0.0
    return words[0]["start"], words[-1]["end"]


def plan_segments(first: float, last: float, count: int,
                  length: float) -> list[tuple[float, float]]:
    """Делит доступное время на count непересекающихся отрезков."""
    span = last - first
    if span <= 0:
        print(f"{TAG} РАННИЙ ВЫХОД: нулевая длина речи ({first}..{last})")
        return []
    stride = span / count
    if stride < length:
        print(f"{TAG} отрезки будут короче {length}с: на {count} роликов "
              f"всего {span:.0f}с — беру по {stride:.0f}с")
        length = stride
    segs = []
    for i in range(count):
        s = first + i * stride
        segs.append((s, min(s + length, last)))
    return segs


def main() -> int:
    if len(sys.argv) < 3:
        print(f"{TAG} использование: batch.py <видео> <папка_назначения> "
              f"[сколько=10] [длина_отрезка_с=70]")
        return 2

    video = Path(sys.argv[1])
    dest = resolve_dest(sys.argv[2])
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    seg_len = float(sys.argv[4]) if len(sys.argv) > 4 else 70.0

    if not video.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет файла {video}")
        return 1

    base_work = HERE / "work" / video.stem
    if not (base_work / "transcript.json").exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет транскрипта {base_work/'transcript.json'} "
              f"— сначала run.py --one {video}")
        return 1

    first, last = transcript_span(base_work)
    if last <= first:
        return 1
    segments = plan_segments(first, last, count, seg_len)
    if not segments:
        return 1

    dest.mkdir(parents=True, exist_ok=True)
    print(f"{TAG} ВХОД: {video.name} · речь {first:.0f}..{last:.0f}с · "
          f"роликов={count} · отрезок={seg_len:.0f}с · папка={dest}")

    ready, need_translation, failed = [], [], []
    t_all = time.time()

    for i, (s, e) in enumerate(segments, 1):
        wd = HERE / "work" / f"{video.stem}_b{i:02d}"
        wd.mkdir(parents=True, exist_ok=True)
        # транскрипт общий — копируем, чтобы phrases.py его нашёл
        if not (wd / "transcript.json").exists():
            shutil.copy2(base_work / "transcript.json", wd / "transcript.json")

        print(f"\n{TAG} --- ролик {i}/{count}: {s:.0f}..{e:.0f}с ---")

        if not (wd / "phrases.json").exists():
            if not step("phrases.py", [str(wd), f"{s}", f"{e}"]):
                print(f"{TAG}   нарезка фраз не удалась — пропускаю")
                failed.append(i)
                continue

        phrases = json.loads((wd / "phrases.json").read_text(encoding="utf-8"))
        missing = [p for p in phrases if not p.get("ru")]
        if missing:
            print(f"{TAG}   НУЖЕН ПЕРЕВОД: {len(missing)} из {len(phrases)} фраз")
            need_translation.append((i, wd, len(phrases)))
            continue

        if not step("tts_seq.py", [str(wd), "13"]):
            print(f"{TAG}   озвучка не удалась — пауза будет немой")

        if not step("render_seq.py", [str(video), str(wd), str(wd / "out")]):
            print(f"{TAG}   сборка не удалась")
            failed.append(i)
            continue

        src = wd / "out" / f"{video.stem}_seq.mp4"
        if not src.exists():
            print(f"{TAG}   файла нет после сборки: {src}")
            failed.append(i)
            continue

        target = dest / f"clip_{i:02d}.mp4"
        if target.exists():
            # зачем не молча: перезапись чужого файла на рабочем столе — плохо
            target = dest / f"clip_{i:02d}_{int(time.time())}.mp4"
            print(f"{TAG}   файл уже был — сохраняю как {target.name}")
        shutil.copy2(src, target)
        size = target.stat().st_size / 1_000_000
        print(f"{TAG}   ГОТОВ: {target.name} · {size:.1f} МБ")
        ready.append(target)

    print(f"\n{TAG} ===== ИТОГ за {(time.time() - t_all) / 60:.1f} мин =====")
    print(f"{TAG} готово: {len(ready)} · ждут перевода: {len(need_translation)} "
          f"· с ошибкой: {len(failed)}")
    for i, wd, n in need_translation:
        print(f"{TAG}   ролик {i}: {wd / 'phrases.json'} ({n} фраз)")
    if failed:
        print(f"{TAG} не собрались: {failed}")
    return 0 if ready or need_translation else 1


if __name__ == "__main__":
    sys.exit(main())
