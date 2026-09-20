"""Шаг 4: моменты + озвучка -> ОДИН ролик до минуты с несколькими остановками.

Устройство ролика (решение владельца 20.09.2026):
  [видео] ... [СТОП: разбор] ... [видео] ... [СТОП: разбор] ... [видео]
Один непрерывный ролик, а не пачка отдельных клипов.

Что здесь важно и почему именно так:

1. КАДРИРОВАНИЕ ПО ЛИЦУ (framing.py). Прежняя версия делала scale+crop по
   центру: герой интервью сидит на 0.64 ширины, и центральная обрезка резала
   его пополам. Теперь рамка считается по лицу для КАЖДОГО отрезка отдельно.

2. КАЧЕСТВО. preset slow, crf 18, lanczos при масштабировании. Плюс исходник
   обязан быть 1080p: замер показал, что 720p-поток шёл на 332 кбит/с, и
   никакие настройки кодирования мыло из него не вытащат.

3. ПЛАВНОСТЬ. Вместо рывка «видео -> стоп-кадр»:
   - замедление последних мгновений перед остановкой;
   - плавное обесцвечивание, а не мгновенное переключение;
   - текст появляется с затуханием, по очереди, а не всё сразу;
   - возврат к видео тоже через короткое проявление.
"""
from __future__ import annotations

import json
import subprocess
import sys
import textwrap
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from framing import compose_filter, find_face_box, text_zone_top  # noqa: E402

TAG = "[CLIPPER][render]"

FADE = 0.45          # длительность ухода в ч/б и возврата
TEXT_FADE = 0.35     # проявление строки текста
SLOWDOWN = 0.55      # последние N секунд перед стопом идут замедленно


def run(cmd: list[str], what: str) -> bool:
    t0 = time.time()
    print(f"{TAG} ffmpeg: {what}")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        # зачем не голый хвост stderr: у ffmpeg там баннер сборки, а не ошибка —
        # поймано 20.09.2026, настоящая причина пряталась выше списка библиотек.
        noise = ("ffmpeg version", "built with", "configuration:", "  lib")
        lines = [ln for ln in proc.stderr.splitlines()
                 if ln.strip() and not ln.startswith(noise)]
        keys = ("Error", "error", "Impossible", "Invalid", "No such",
                "Unable", "Failed", "not found", "Conversion failed")
        interesting = [ln for ln in lines if any(k in ln for k in keys)]
        print(f"{TAG} ОШИБКА на шаге '{what}': код {proc.returncode}")
        for ln in (interesting or lines)[-6:]:
            print(f"{TAG}   {ln.strip()}")
        return False
    print(f"{TAG} шаг '{what}' готов за {time.time() - t0:.1f}с")
    return True


def probe(path: Path, entries: str) -> str:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", entries, "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        print(f"{TAG} ffprobe не смог прочесть {path.name}: {proc.stderr[-200:]}")
        return ""
    return proc.stdout.strip()


def duration(path: Path) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True,
    )
    try:
        return float(proc.stdout.strip())
    except ValueError:
        print(f"{TAG} ffprobe вернул не число для {path.name}: {proc.stdout!r}")
        return 0.0


def source_size(video: Path) -> tuple[int, int]:
    raw = probe(video, "stream=width,height").splitlines()
    try:
        return int(raw[0]), int(raw[1])
    except (IndexError, ValueError):
        print(f"{TAG} не прочитал размер кадра ({raw!r}) — считаю 1920x1080")
        return 1920, 1080


def esc(text: str) -> str:
    """Экранирование для drawtext: двоеточие, апостроф и процент ломают фильтр."""
    out = text.replace("\\", "\\\\")
    out = out.replace(":", "\\:")
    out = out.replace("'", "’")
    out = out.replace("%", "\\%")
    return out


def text_lines(text: str, width: int, y_start: float, size: int, color: str,
               gap: float, height: int, appear: float, hold: float) -> list[str]:
    """Каждая строка — отдельный drawtext со своим y и своим проявлением.

    зачем отдельными вызовами: экранированный '\\n' внутри одного drawtext
    ffmpeg НЕ переносит — он съедает пробел и печатает букву 'n'
    ('necknand' вместо 'neck and neck', поймано 20.09.2026).

    зачем alpha по времени: текст должен проявляться, а не возникать рывком.
    """
    lines = textwrap.wrap(text, width=width) or [""]
    out = []
    for idx, line in enumerate(lines):
        if not line.strip():
            continue
        y = y_start * height + idx * (size + gap)
        t0 = appear + idx * 0.12          # строки появляются лесенкой
        alpha = (f"if(lt(t,{t0:.2f}),0,"
                 f"if(lt(t,{t0 + TEXT_FADE:.2f}),(t-{t0:.2f})/{TEXT_FADE},"
                 f"if(lt(t,{hold:.2f}),1,0)))")
        out.append(f"drawtext=text='{esc(line)}':fontcolor={color}"
                   f":fontsize={size}:x=(w-text_w)/2:y={y:.0f}"
                   f":alpha='{alpha}'")
    return out


def build_pause(frame: Path, voice: Path | None, moment: dict, cfg: dict,
                out: Path, zone_top: float = 0.50) -> bool:
    """Стоп-кадр: плавное обесцвечивание + текст по очереди + озвучка."""
    h, w = cfg["output_height"], cfg["output_width"]
    if voice is not None and voice.exists():
        pause = duration(voice) + 0.9
        print(f"{TAG} пауза {pause:.2f}с (по длине озвучки {voice.name})")
    else:
        pause = 5.0
        print(f"{TAG} озвучки нет (voice={voice}) — пауза {pause:.2f}с")

    fs_phrase = int(h * 0.042)
    fs_small = int(h * 0.026)
    fs_cta = int(h * 0.020)
    hold = pause - 0.25

    # зачем зажим: полоса начинается под плашкой героя, но не ниже 0.70 —
    # иначе трём строкам разбора и подписи не хватит высоты. Плашка теперь
    # занимает 70% кадра, поэтому лёгкий заход на её низ (грудь, не лицо)
    # допустим и даже нужен, чтобы текст не жался к краю.
    band_top = min(max(zone_top - 0.04, 0.58), 0.70)
    band_h = min(0.40, 0.975 - band_top)
    print(f"{TAG} текст с {band_top:.3f} высоты (плашка героя до {zone_top:.3f})")

    # зачем выражение по t: обесцвечивание и затемнение НАРАСТАЮТ, а не
    # включаются мгновенно — владелец просил плавность.
    sat = f"if(lt(t,{FADE}),1-t/{FADE},0)"
    parts = [
        f"hue=s='{sat}'",
        "eq=contrast=1.05",
        # зачем полоса привязана к zone_top: она начинается ровно там, где
        # кончается плашка героя. Фиксированное значение (0.27, потом 0.50)
        # дважды легло герою на лицо — 20.09.2026 на готовых роликах.
        (f"drawbox=y=ih*{band_top:.3f}:h=ih*{band_h:.3f}:w=iw:t=fill"
         f":color=black@0.72:enable='gte(t,{FADE * 0.5:.2f})'"),
    ]
    # зачем сжатые отступы: блок из трёх частей плюс подпись должен уложиться
    # между band_top и низом кадра. При прежних 0.035/0.145/0.235 подпись
    # налезала на строку смысла (видно на кадре 20.09.2026).
    parts += text_lines(moment.get("phrase", ""), 20, band_top + 0.025,
                        fs_phrase, "white", 16, h, FADE, hold)
    parts += text_lines(moment.get("literal", ""), 26, band_top + 0.125,
                        fs_small, "0x8e8e8e", 12, h, FADE + 0.45, hold)
    parts += text_lines(moment.get("meaning", ""), 26, band_top + 0.205,
                        fs_small, "0xe8c566", 12, h, FADE + 0.95, hold)
    parts.append(f"drawtext=text='{esc(cfg['cta_text'])}'"
                 f":fontcolor=white@0.70:fontsize={fs_cta}"
                 f":x=(w-text_w)/2:y={int(h * min(0.955, band_top + 0.285))}"
                 f":alpha='if(lt(t,{FADE + 1.3:.2f}),0,0.7)'")

    cmd = ["ffmpeg", "-y", "-loop", "1", "-t", f"{pause}", "-i", str(frame)]
    if voice is not None and voice.exists():
        cmd += ["-i", str(voice)]
    else:
        cmd += ["-f", "lavfi", "-t", f"{pause}", "-i", "anullsrc=r=48000:cl=stereo"]
    cmd += ["-vf", ",".join(parts), "-r", "30",
            "-c:v", "libx264", "-preset", cfg["encode_preset"],
            "-crf", str(cfg["encode_crf"]), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            "-shortest", str(out)]
    return run(cmd, "пауза с разбором")


def build_video_part(video: Path, start: float, end: float, crop: str,
                     out: Path, cfg: dict, slow_tail: bool) -> bool:
    """Кусок оригинала. slow_tail — замедлить концовку перед остановкой."""
    vf = crop
    af = "aresample=async=1"
    if slow_tail and end - start > SLOWDOWN + 0.3:
        # зачем: резкая остановка выглядит дёшево. Лёгкое торможение в последние
        # мгновения читается как «сейчас будет важное» и смягчает стоп-кадр.
        # Дописываем ПОСЛЕ overlay — цепочка уже сведена в один поток.
        t_slow = end - start - SLOWDOWN
        vf += (f",setpts='if(lt(T,{t_slow:.2f}),PTS,"
               f"{t_slow:.2f}/TB+(PTS-{t_slow:.2f}/TB)*1.55)'")
        print(f"{TAG} торможение последних {SLOWDOWN}с перед стопом")

    # зачем -filter_complex: compose_filter возвращает цепочку со ссылками
    # [bg]/[fg], которую -vf не понимает (падает с Invalid argument).
    cmd = ["ffmpeg", "-y", "-ss", f"{start}", "-to", f"{end}", "-i", str(video),
           "-filter_complex", vf, "-af", af, "-r", "30",
           "-c:v", "libx264", "-preset", cfg["encode_preset"],
           "-crf", str(cfg["encode_crf"]), "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", str(out)]
    return run(cmd, f"видео {start:.1f}..{end:.1f}с")


def main() -> int:
    if len(sys.argv) < 4:
        print(f"{TAG} использование: render.py <видео> <work> <output>")
        return 2
    video, workdir, outdir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    cfg = json.loads((Path(__file__).parent / "config" / "config.json")
                     .read_text(encoding="utf-8"))

    mpath = workdir / "moments.json"
    if not mpath.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет {mpath} — сначала select_moments.py")
        return 1
    moments = json.loads(mpath.read_text(encoding="utf-8"))

    good = [m for m in moments if m.get("score", 0) >= cfg["min_score"]]
    skipped = len(moments) - len(good)
    if skipped:
        print(f"{TAG} отсеяно по порогу {cfg['min_score']}: {skipped}")
    if not good:
        print(f"{TAG} РАННИЙ ВЫХОД: ни один момент не прошёл порог")
        return 1
    good.sort(key=lambda m: m["start"])

    src_w, src_h = source_size(video)
    out_w, out_h = cfg["output_width"], cfg["output_height"]
    lead, tail = cfg["lead_in_sec"], cfg["tail_sec"]
    budget = cfg.get("max_total_sec", 60)
    print(f"{TAG} ВХОД: моментов={len(good)} · исходник={src_w}x{src_h} · "
          f"бюджет={budget}с · качество={cfg['encode_preset']}/crf{cfg['encode_crf']}")

    outdir.mkdir(parents=True, exist_ok=True)
    tmp = workdir / "tmp"
    tmp.mkdir(exist_ok=True)

    parts: list[Path] = []
    total = 0.0
    used = 0

    for i, moment in enumerate(good, 1):
        voice = workdir / f"voice_{i}.mp3"
        pause_len = (duration(voice) + 0.9) if voice.exists() else 5.0
        seg_start = max(0.0, moment["start"] - lead)
        seg_end = moment["phrase_end"]
        chunk = (seg_end - seg_start) + pause_len

        if total + chunk > budget and used > 0:
            # зачем: владелец задал «видео до минуты» — режем по бюджету,
            # а не пихаем всё подряд.
            print(f"{TAG} момент {i} не влезает в бюджет "
                  f"({total:.1f}+{chunk:.1f} > {budget}) — останавливаюсь")
            break

        # рамка считается для КАЖДОГО отрезка: герой может пересесть
        cx, cy, fh, found = find_face_box(video, seg_start, seg_end)
        if found == 0:
            print(f"{TAG} момент {i}: лица нет — кадр по центру (риск срезать героя)")
        crop = compose_filter(src_w, src_h, out_w, out_h, cx, cy, fh)

        part_v = tmp / f"v{i}.mp4"
        if not build_video_part(video, seg_start, seg_end, crop, part_v, cfg,
                                slow_tail=True):
            print(f"{TAG} момент {i}: кусок видео не собрался — пропускаю")
            continue

        frame = tmp / f"f{i}.png"
        # зачем -filter_complex, а не -vf: compose_filter возвращает цепочку со
        # ссылками [bg]/[fg]; -vf такой синтаксис не понимает и падает.
        if not run(["ffmpeg", "-y", "-ss", f"{max(0.0, seg_end - 0.04)}",
                    "-i", str(video), "-frames:v", "1",
                    "-filter_complex", crop, str(frame)],
                   f"стоп-кадр {i}"):
            continue

        zone = text_zone_top(src_h, out_h, cy, fh)
        part_p = tmp / f"p{i}.mp4"
        if not build_pause(frame, voice if voice.exists() else None,
                           moment, cfg, part_p, zone):
            continue

        parts += [part_v, part_p]
        total += chunk
        used += 1
        print(f"{TAG} момент {i} добавлен · накоплено {total:.1f}с из {budget}")

    if not parts:
        print(f"{TAG} РАННИЙ ВЫХОД: ни один момент не собрался")
        return 1

    # хвост после последней остановки — чтобы ролик не обрывался на тексте
    last_end = good[used - 1]["phrase_end"]
    if total + tail <= budget + 2:
        cx, cy, fh, _ = find_face_box(video, last_end, last_end + tail)
        crop = compose_filter(src_w, src_h, out_w, out_h, cx, cy, fh)
        part_t = tmp / "tail.mp4"
        if build_video_part(video, last_end, last_end + tail, crop, part_t,
                            cfg, slow_tail=False):
            parts.append(part_t)

    lst = tmp / "concat.txt"
    # зачем .resolve(): concat-демуксер считает пути ОТНОСИТЕЛЬНО файла списка,
    # с относительными выходило '.../tmp/content/clipper/.../a.mp4'.
    lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in parts),
                   encoding="utf-8")

    out = outdir / f"{video.stem}_lesson.mp4"
    if not run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                "-c:v", "libx264", "-preset", cfg["encode_preset"],
                "-crf", str(cfg["encode_crf"]), "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                "-movflags", "+faststart", str(out)], "склейка"):
        return 1

    print(f"{TAG} ИТОГ: {out.name} · {duration(out):.1f}с · "
          f"{out.stat().st_size / 1_000_000:.1f} МБ · разборов внутри: {used}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
