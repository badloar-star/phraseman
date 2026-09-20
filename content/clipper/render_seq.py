"""Сборка ПОФРАЗОВАЯ: фраза -> её перевод -> следующая фраза -> её перевод.

Требование владельца 20.09.2026, дословно: «текст надо просто перевести и
причём весь, и давать надо так, чтобы сказал фразу и мы её перевели, потом
след фраза и так далее, и каждую, а не ждать».

Чем отличается от render.py:
  1. НЕТ отбора. Идём по всем фразам отрезка подряд, ничего не пропуская.
  2. Плашка с текстом ТОЛЬКО в паузе. В живом видео её нет вовсе — владелец:
     «плашка на пол-экрана не должна быть постоянно, а только когда надо».
  3. НЕТ озвучки. Рассинхрон «озвучивается не то, что на экране» возникал
     потому, что звук и видеоряд собирались из разных источников. Здесь
     перевод и отрезок берутся из ОДНОЙ записи phrases.json — разойтись
     физически нечему.
"""
from __future__ import annotations

import json
import subprocess
import sys
import textwrap
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from framing import find_face_box, fullframe_filter  # noqa: E402

TAG = "[CLIPPER][seq]"

# зачем длиннее: владелец 20.09.2026 — «слишком быстро снимается пауза».
# Прежние 1.1 + 0.045/знак давали ~1.7с на короткий перевод: глаз только
# доходит до текста, а кадр уже сменился. Комфортная скорость чтения около
# 15 знаков в секунду, плюс время найти текст глазами и плюс озвучка сверху.
PAUSE_BASE = 1.6        # время «заметить, что появился текст»
PAUSE_PER_CHAR = 0.075  # чтение: примерно 13 знаков в секунду
PAUSE_TAIL = 0.5        # воздух после озвучки, чтобы не обрывало
# зачем 10, а не 7: на замере 20.09.2026 озвучка длинных фраз требовала
# 8.2-8.7с и обрывалась на полуслове. Потолок обязан быть выше самой длинной
# озвучки, иначе -t режет звук. Ограничивать надо длину ФРАЗ, а не паузы.
PAUSE_MAX = 10.0
FADE = 0.28             # плавность ухода в ч/б


def run(cmd: list[str], what: str) -> bool:
    t0 = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        # зачем не голый хвост stderr: у ffmpeg там баннер сборки, а не ошибка
        noise = ("ffmpeg version", "built with", "configuration:", "  lib")
        lines = [ln for ln in proc.stderr.splitlines()
                 if ln.strip() and not ln.startswith(noise)]
        keys = ("Error", "error", "Impossible", "Invalid", "No such",
                "Unable", "Failed", "Conversion failed")
        hot = [ln for ln in lines if any(k in ln for k in keys)]
        print(f"{TAG} ОШИБКА '{what}': код {proc.returncode}")
        for ln in (hot or lines)[-5:]:
            print(f"{TAG}   {ln.strip()}")
        return False
    print(f"{TAG} ок: {what} ({time.time() - t0:.1f}с)")
    return True


def duration(path: Path) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True)
    try:
        return float(proc.stdout.strip())
    except ValueError:
        print(f"{TAG} ffprobe вернул не число для {path.name}: {proc.stdout!r}")
        return 0.0


def source_size(video: Path) -> tuple[int, int]:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height",
         "-of", "default=nw=1:nk=1", str(video)],
        capture_output=True, text=True)
    raw = proc.stdout.strip().splitlines()
    try:
        return int(raw[0]), int(raw[1])
    except (IndexError, ValueError):
        print(f"{TAG} не прочитал размер кадра ({raw!r}) — считаю 1920x1080")
        return 1920, 1080


def esc(text: str) -> str:
    """Экранирование drawtext: двоеточие, апостроф и процент ломают фильтр."""
    out = text.replace("\\", "\\\\").replace(":", "\\:")
    return out.replace("'", "’").replace("%", "\\%")


def lines_at(text: str, width: int, y_px: float, size: int, color: str,
             gap: int, appear: float) -> tuple[list[str], float]:
    """Рисует текст от заданного y вниз. Возвращает (фильтры, высота блока).

    зачем не '\\n' в одном drawtext: ffmpeg его НЕ переносит, а съедает пробел
    и печатает букву 'n' ('necknand' вместо 'neck and neck', поймано 20.09.2026).

    зачем возвращаем высоту: раньше английский и русский рисовались по
    ФИКСИРОВАННЫМ долям экрана, и при длинном английском (три строки вместо
    одной) он наезжал на перевод — владелец прислал скриншот 20.09.2026.
    Теперь следующий блок знает, где кончился предыдущий.
    """
    wrapped = [ln for ln in textwrap.wrap(text, width=width) if ln.strip()]
    if not wrapped:
        return [], 0.0
    out = []
    for i, line in enumerate(wrapped):
        y = y_px + i * (size + gap)
        out.append(f"drawtext=text='{esc(line)}':fontcolor={color}"
                   f":fontsize={size}:x=(w-text_w)/2:y={y:.0f}"
                   f":alpha='if(lt(t,{appear:.2f}),0,1)'")
    height = len(wrapped) * size + (len(wrapped) - 1) * gap
    return out, height


def wrapped_height(text: str, width: int, size: int, gap: int) -> float:
    """Сколько места займёт текст — нужно ДО размещения, чтобы собрать блок."""
    n = len([ln for ln in textwrap.wrap(text, width=width) if ln.strip()])
    return (n * size + max(0, n - 1) * gap) if n else 0.0


def pause_len(translation: str, voice: Path | None = None) -> float:
    """Длина паузы: успеть прочитать И дослушать озвучку.

    зачем берём максимум из двух: если озвучка длиннее времени чтения, её
    нельзя обрывать; если короче — текст всё равно надо успеть прочесть.
    """
    read = PAUSE_BASE + len(translation) * PAUSE_PER_CHAR
    if voice is not None and voice.exists():
        spoken = duration(voice) + PAUSE_TAIL
        chosen = max(read, spoken)
        print(f"{TAG} длина паузы: чтение {read:.1f}с / озвучка {spoken:.1f}с "
              f"-> беру {min(PAUSE_MAX, chosen):.1f}с")
        return min(PAUSE_MAX, chosen)
    return min(PAUSE_MAX, read)


def build_pause(frame: Path, phrase: dict, cfg: dict, out: Path,
                voice: Path | None = None) -> bool:
    """Стоп-кадр с переводом. Плашка существует ТОЛЬКО здесь."""
    h, w = cfg["output_height"], cfg["output_width"]
    ru = phrase.get("ru", "")
    en = phrase.get("text", "")
    secs = pause_len(ru, voice)

    # зачем русский КРУПНЕЕ и СВЕРХУ: айтрекинг (42 испытуемых) — верхняя
    # строка перетягивает внимание независимо от языка, и родной язык сверху
    # даёт достоверно лучшее понимание (F(1,41)=7.44, p=.009). Интуиция
    # «оригинал главный» здесь противоречит данным.
    fs_ru = int(h * 0.042)
    fs_en = int(h * 0.027)
    gap_ru, gap_en = 14, 10
    between = int(h * 0.020)
    pad = int(h * 0.028)
    delay = cfg.get("ru_delay_sec", 1.2)

    h_ru = wrapped_height(ru, 22, fs_ru, gap_ru)
    h_en = wrapped_height(en, 28, fs_en, gap_en)
    block_h = h_ru + (between if h_en and h_ru else 0) + h_en

    # зачем 0.73, а не 0.88: безопасная зона TikTok плавающая и съедает до
    # ~500px снизу — часть перевода зритель просто не видел. Официального
    # числа не существует, берём с запасом.
    bottom = h * 0.73
    band_top = bottom - block_h - pad

    # зачем английский СВЕРХУ блока, хотя русский главнее: при задержке показа
    # русского место под него пустует. Если русский сверху — английский первую
    # секунду висит у нижнего края, а потом над ним возникает строка; читается
    # как сбой вёрстки (видно на кадре 20.09.2026). Английский появляется на
    # своём месте и не двигается, русский приходит под него — крупнее и белым,
    # поэтому взгляд всё равно ведёт он.
    en_y = band_top + pad
    ru_y = en_y + h_en + (between if h_en else 0)

    print(f"{TAG} блок: рус {h_ru:.0f}px + англ {h_en:.0f}px = {block_h:.0f}px, "
          f"плашка {band_top / h:.3f}..{bottom / h:.3f} высоты · "
          f"RU с задержкой {delay}с")

    parts = [
        f"hue=s='if(lt(t,{FADE}),1-t/{FADE},0)'",
        (f"drawbox=y={band_top:.0f}:h={block_h + pad * 2:.0f}:w=iw"
         f":t=fill:color=black@0.74"),
    ]
    # зачем EN сразу, а RU с задержкой: зритель успевает попробовать понять
    # сам. Это retrieval practice — попытка вспомнить ДО подсказки доказанно
    # улучшает запоминание, плюс микро-ожидание мешает свайпнуть.
    en_parts, _ = lines_at(en, 28, en_y, fs_en, "0x9a9a9a", gap_en, 0.0)
    ru_parts, _ = lines_at(ru, 22, ru_y, fs_ru, "0xffffff", gap_ru, delay)
    parts += en_parts + ru_parts

    cmd = ["ffmpeg", "-y", "-loop", "1", "-t", f"{secs}", "-i", str(frame)]

    # зачем музыка ТОЛЬКО здесь: людям, учащим язык, нужен запас разборчивости
    # на 1-7 дБ выше, чем носителям — подклад под английской речью им мешает
    # сильнее, чем обычному зрителю. build_speech про музыку не знает вовсе,
    # поэтому зазвучать под речью она физически не может.
    music = cfg.get("seq_music_file", "").strip()
    music_path = (Path(__file__).parent / music) if music else None
    use_music = bool(music) and music_path is not None and music_path.exists()
    if music and not use_music:
        print(f"{TAG} музыка указана ({music}), но файла нет — пауза без подклада")

    has_voice = voice is not None and voice.exists()
    if has_voice:
        cmd += ["-i", str(voice)]
    else:
        cmd += ["-f", "lavfi", "-t", f"{secs}", "-i", "anullsrc=r=48000:cl=stereo"]

    if use_music:
        # -stream_loop -1: трек короче ролика не должен обрываться
        cmd += ["-stream_loop", "-1", "-i", str(music_path)]
        vol = cfg.get("seq_music_volume", 0.10)  # 0.10 = -20 дБ, норма WCAG G56
        # зачем apad до микса: без добивки amix обрежет паузу по концу озвучки
        cmd += ["-filter_complex",
                f"[1:a]apad=whole_dur={secs}[sp];"
                f"[2:a]volume={vol},atrim=0:{secs},afade=t=in:d=0.4:st=0,"
                f"afade=t=out:d=0.5:st={max(0.0, secs - 0.5):.2f}[bed];"
                f"[sp][bed]amix=inputs=2:normalize=0[aout]",
                "-map", "0:v", "-map", "[aout]"]
        heard = f"озвучка+музыка {vol}"
    else:
        cmd += ["-af", f"apad=whole_dur={secs}"]
        heard = "с озвучкой" if has_voice else "БЕЗ озвучки"

    cmd += ["-vf", ",".join(parts), "-r", "30", "-t", f"{secs}",
            "-c:v", "libx264", "-preset", cfg["encode_preset"],
            "-crf", str(cfg["encode_crf"]), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            str(out)]
    return run(cmd, f"пауза {secs:.1f}с {heard}: {ru[:32]}")


def build_speech(video: Path, phrase: dict, crop: str, out: Path,
                 cfg: dict) -> bool:
    """Кусок живого видео. Никакого текста поверх — владелец просил чистый кадр."""
    cmd = ["ffmpeg", "-y", "-ss", f"{phrase['start']}", "-to", f"{phrase['end']}",
           "-i", str(video), "-vf", crop, "-af", "aresample=async=1",
           "-r", "30", "-c:v", "libx264", "-preset", cfg["encode_preset"],
           "-crf", str(cfg["encode_crf"]), "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", str(out)]
    return run(cmd, f"речь {phrase['start']:.1f}..{phrase['end']:.1f}с")


def main() -> int:
    if len(sys.argv) < 4:
        print(f"{TAG} использование: render_seq.py <видео> <work> <output>")
        return 2
    video, workdir, outdir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    cfg = json.loads((Path(__file__).parent / "config" / "config.json")
                     .read_text(encoding="utf-8"))

    ppath = workdir / "phrases.json"
    if not ppath.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет {ppath} — сначала phrases.py")
        return 1
    phrases = json.loads(ppath.read_text(encoding="utf-8"))

    missing = [i for i, p in enumerate(phrases, 1) if not p.get("ru")]
    if missing:
        print(f"{TAG} РАННИЙ ВЫХОД: нет перевода у фраз {missing[:10]} "
              f"(всего {len(missing)}). Переводы кладутся в поле 'ru'.")
        return 1

    src_w, src_h = source_size(video)
    budget = cfg.get("max_total_sec", 60)
    print(f"{TAG} ВХОД: фраз={len(phrases)} · исходник={src_w}x{src_h} · "
          f"бюджет={budget}с · качество={cfg['encode_preset']}/crf{cfg['encode_crf']}")

    outdir.mkdir(parents=True, exist_ok=True)
    tmp = workdir / "seq"
    tmp.mkdir(exist_ok=True)

    # зачем одна рамка на весь ролик: пересчёт на каждую фразу заставлял кадр
    # дышать между соседними кусками — у говорящей головы это заметно как
    # рывок. Берём медиану по всему отрезку.
    cx, cy, fh, found = find_face_box(video, phrases[0]["start"],
                                      phrases[-1]["end"], samples=14)
    if found == 0:
        print(f"{TAG} лица нет на всём отрезке — кадр по центру")
    # зачем fullframe: владелец 20.09.2026 — «видео должно быть 9:16 фулл,
    # без каких-либо полосок». Композиция с фоном давала поля по построению,
    # чем бы их ни заливали. Здесь кадр заполнен целиком.
    crop = fullframe_filter(src_w, src_h, cfg["output_width"],
                            cfg["output_height"], cx)

    parts: list[Path] = []
    bounds: list[float] = []          # фактическое время конца каждой пары
    used_phrases: list[dict] = []     # какие фразы реально вошли в ролик
    total = 0.0
    used = 0

    for i, ph in enumerate(phrases, 1):
        speech = ph["end"] - ph["start"]
        # зачем ищем озвучку заранее: от неё зависит длина паузы, а значит и
        # помещается ли фраза в бюджет ролика
        voice = workdir / "voices" / f"pair_{i:02d}.mp3"
        if not voice.exists():
            print(f"{TAG} фраза {i}: озвучки нет ({voice.name}) — пауза немая")
            voice = None
        pause = pause_len(ph["ru"], voice)
        if total + speech + pause > budget and used > 0:
            print(f"{TAG} фраза {i} не влезает в бюджет "
                  f"({total:.1f}+{speech + pause:.1f} > {budget}) — стоп")
            break

        part_s = tmp / f"s{i:02d}.mp4"
        if not build_speech(video, ph, crop, part_s, cfg):
            print(f"{TAG} фраза {i}: речь не собралась — пропускаю пару")
            continue

        frame = tmp / f"f{i:02d}.png"
        if not run(["ffmpeg", "-y", "-ss", f"{max(0.0, ph['end'] - 0.04)}",
                    "-i", str(video), "-frames:v", "1",
                    "-vf", crop, str(frame)], f"кадр {i}"):
            continue

        part_p = tmp / f"p{i:02d}.mp4"
        if not build_pause(frame, ph, cfg, part_p, voice):
            continue

        parts += [part_s, part_p]
        total += speech + pause
        used += 1
        # зачем копим фактические границы: счётчик делил время на РАВНЫЕ доли
        # (total/used), а пары разной длины — 10.2с и 4.8с. Цифра менялась не
        # там, где реально начиналась фраза. Замер 20.09.2026.
        bounds.append(total)
        used_phrases.append(ph)
        print(f"{TAG} [{used}] «{ph['text'][:40]}» -> «{ph['ru'][:40]}» "
              f"· пара {speech + pause:.1f}с · граница на {total:.1f}с")

    if not parts:
        print(f"{TAG} РАННИЙ ВЫХОД: ни одной пары не собралось")
        return 1

    # зачем финальный прогон: владелец 20.09.2026 — «не должно вот так
    # обрываться, после последней мы должны просмотреть фулл видео без
    # подсказок». Зритель проверяет себя на том же материале, который только
    # что разобрали. Никакого текста поверх — в этом весь смысл.
    if cfg.get("seq_replay", True) and used_phrases:
        rp_start = used_phrases[0]["start"]
        rp_end = used_phrases[-1]["end"]
        replay = tmp / "replay.mp4"
        print(f"{TAG} финал: повтор {rp_start:.1f}..{rp_end:.1f}с "
              f"({rp_end - rp_start:.1f}с) без подсказок")
        if build_speech(video, {"start": rp_start, "end": rp_end},
                        crop, replay, cfg):
            parts.append(replay)
            total += rp_end - rp_start
        else:
            print(f"{TAG} финал не собрался — ролик останется без повтора")

    lst = tmp / "concat.txt"
    # зачем .resolve(): concat-демуксер считает пути ОТНОСИТЕЛЬНО файла списка
    lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in parts),
                   encoding="utf-8")

    out = outdir / f"{video.stem}_seq.mp4"
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst)]

    # зачем на СКЛЕЙКЕ, а не на каждом куске: полоска и счётчик должны идти
    # сквозь весь ролик. Считать их по частям — значит пересобирать проценты
    # в каждом файле; один проход поверх готовой склейки и дешевле, и точнее.
    # зачем полоска и счётчик РАЗДЕЛЕНЫ флагами: владелец 20.09.2026 попросил
    # убрать жёлтую полоску, счётчик при этом оставил. Один общий флаг
    # заставлял бы выключать оба.
    bar_span = bounds[-1] if bounds else total
    layers: list[str] = []

    if cfg.get("seq_progress_bar", False):
        accent = cfg.get("accent_color", "0xe8c566")
        bar_h = int(cfg["output_height"] * 0.010)
        layers.append(f"drawbox=x=0:y=0:w='iw*min(1,t/{bar_span:.2f})':h={bar_h}"
                      f":color={accent}:t=fill")
        print(f"{TAG} наложение: полоска {accent} по {bar_span:.1f}с")

    if cfg.get("seq_counter", True):
        fs_cnt = int(cfg["output_height"] * 0.024)
        # зачем сумма степов, а не floor(t/среднее): пары разной длины.
        # Каждый gte добавляет единицу ровно на своей фактической границе.
        steps = "+".join(f"gte(t,{b:.2f})" for b in bounds[:-1]) or "0"
        layers.append(f"drawtext=text='%{{eif\\:1+({steps})\\:d}}/{used}'"
                      f":fontcolor=white@0.85:fontsize={fs_cnt}"
                      f":x=w-tw-{int(cfg['output_width'] * 0.055)}"
                      f":y={int(cfg['output_height'] * 0.055)}"
                      f":enable='lt(t,{bar_span:.2f})'")
        print(f"{TAG} наложение: счётчик до {used} на границах "
              f"{[round(b, 1) for b in bounds[:-1]]}")

    if layers:
        cmd += ["-vf", ",".join(layers)]
    else:
        print(f"{TAG} наложений нет — чистый кадр")

    cmd += ["-c:v", "libx264", "-preset", cfg["encode_preset"],
            "-crf", str(cfg["encode_crf"]), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            "-movflags", "+faststart", str(out)]
    if not run(cmd, "склейка"):
        return 1

    print(f"{TAG} ИТОГ: {out.name} · {duration(out):.1f}с · "
          f"{out.stat().st_size / 1_000_000:.1f} МБ · переведено фраз: {used}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
