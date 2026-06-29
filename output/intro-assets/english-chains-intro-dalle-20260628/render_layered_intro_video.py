from __future__ import annotations

import argparse
import array
import json
import math
import random
import struct
import subprocess
import sys
import wave
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


WIDTH = 1920
HEIGHT = 1080
FPS = 30
SAMPLE_RATE = 48000

WHITE = (255, 255, 255)
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")


SCENES = [
    {"title": ["ДЛИННЫЕ", "ПРЕДЛОЖЕНИЯ?"], "kind": "sentence_stream", "duration": 2.6},
    {"title": ["СПЛОШНОЙ", "ПОТОК СЛОВ"], "kind": "word_stream", "duration": 2.7},
    {"title": ["ЭТОТ УРОК", "ДЛЯ ВАС"], "kind": "target", "duration": 2.0},
    {"title": ["РАЗБИРАЕМ", "АНГЛИЙСКИЙ"], "kind": "parse", "duration": 2.0},
    {"title": ["НЕ ПО", "ОТДЕЛЬНЫМ СЛОВАМ"], "kind": "fragments", "duration": 1.5},
    {"title": ["А", "ЦЕПОЧКАМИ"], "kind": "chains", "duration": 1.7},
    {"title": ["КОРОТКАЯ", "ФРАЗА"], "kind": "seed", "duration": 1.6},
    {"title": ["ШАГ", "ЗА ШАГОМ"], "kind": "steps", "duration": 1.6},
    {"title": ["СЛОВО", "ЗА СЛОВОМ"], "kind": "word_by_word", "duration": 1.6},
    {"title": ["ФРАЗА", "РАСТЕТ"], "kind": "growth", "duration": 1.7},
    {"title": ["РАЗГОВОРНОЕ", "ПРЕДЛОЖЕНИЕ"], "kind": "full_sentence", "duration": 2.0},
    {"title": ["МОЗГ", "ПРИВЫКАЕТ"], "kind": "neural", "duration": 1.8},
    {"title": ["АНГЛИЙСКАЯ", "РЕЧЬ"], "kind": "speech", "duration": 1.8},
    {"title": ["СТАНЕТ", "ПОНЯТНЕЕ"], "kind": "clarity", "duration": 1.8},
    {"title": ["ПОПЫТКА", "ВСПОМНИТЬ"], "kind": "recall", "duration": 2.6},
    {"title": ["ПРАВИЛЬНЫЙ", "ОТВЕТ"], "kind": "answer", "duration": 2.3},
    {"title": ["ПРОСТО", "СЛУШАЙТЕ"], "kind": "listen", "duration": 1.7},
    {"title": ["ПОВТОРЯЙТЕ", "ВСЛУХ"], "kind": "repeat", "duration": 1.9},
    {"title": ["ЭФФЕКТ", "СИЛЬНЕЕ"], "kind": "amplify", "duration": 1.8},
    {"title": ["НАЧИНАЕМ"], "kind": "start", "duration": 1.0},
]


def run_capture(cmd: list[str]) -> str:
    completed = subprocess.run(cmd, check=True, text=True, capture_output=True)
    return completed.stdout.strip()


def probe_duration(audio_path: Path) -> float:
    return float(
        run_capture(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(audio_path),
            ]
        )
    )


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def ease_out(value: float) -> float:
    value = clamp(value)
    return 1 - (1 - value) ** 3


def ease_in_out(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def enter(local_t: float, start: float, duration: float) -> float:
    return ease_out((local_t - start) / max(duration, 0.001))


def exit_hold(local_t: float, scene_duration: float, exit_duration: float = 0.22) -> float:
    return ease_out((scene_duration - local_t) / max(exit_duration, 0.001))


def load_envelope(audio_path: Path, duration: float) -> list[float]:
    sample_rate = 16000
    cmd = [
        "ffmpeg",
        "-v",
        "error",
        "-i",
        str(audio_path),
        "-ac",
        "1",
        "-ar",
        str(sample_rate),
        "-f",
        "s16le",
        "-",
    ]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    samples = array.array("h")
    samples.frombytes(raw)
    if sys.byteorder != "little":
        samples.byteswap()

    total_frames = math.ceil(duration * FPS)
    samples_per_frame = sample_rate / FPS
    values = []
    for frame in range(total_frames):
        start = int(frame * samples_per_frame)
        end = min(len(samples), int((frame + 1) * samples_per_frame))
        if end <= start:
            values.append(0.0)
            continue
        total = 0
        for sample in samples[start:end]:
            total += sample * sample
        values.append(math.sqrt(total / (end - start)))

    peak = sorted(values)[int(len(values) * 0.92)] if values else 1
    peak = peak or max(values or [1])
    normalized = [min(1.0, value / peak) for value in values]

    smoothed = []
    prev = 0.0
    for value in normalized:
        prev = prev * 0.72 + value * 0.28
        smoothed.append(prev)
    return smoothed


def build_schedule(duration: float) -> list[dict[str, object]]:
    base = sum(float(scene["duration"]) for scene in SCENES)
    scale = duration / base
    cursor = 0.0
    schedule = []
    for idx, scene in enumerate(SCENES):
        scene_duration = float(scene["duration"]) * scale
        schedule.append(
            {
                "index": idx,
                "start": cursor,
                "duration": scene_duration,
                "end": cursor + scene_duration,
                "title": scene["title"],
                "kind": scene["kind"],
            }
        )
        cursor += scene_duration
    schedule[-1]["end"] = duration
    schedule[-1]["duration"] = duration - float(schedule[-1]["start"])
    return schedule


def scene_at(schedule: list[dict[str, object]], t: float) -> dict[str, object]:
    for scene in schedule:
        if float(scene["start"]) <= t < float(scene["end"]):
            return scene
    return schedule[-1]


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


def text_size(text: str, ft: ImageFont.FreeTypeFont) -> tuple[int, int]:
    probe = Image.new("L", (10, 10))
    draw = ImageDraw.Draw(probe)
    bbox = draw.textbbox((0, 0), text, font=ft, stroke_width=0)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def fit_font_size(lines: list[str], max_width: int, start_size: int) -> int:
    size = start_size
    while size > 42:
        ft = font(size, bold=True)
        if all(text_size(line, ft)[0] <= max_width for line in lines):
            return size
        size -= 4
    return size


def alpha_composite(canvas: Image.Image, layer: Image.Image) -> None:
    canvas.alpha_composite(layer)


def glow_line(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    fill: tuple[int, int, int, int],
    width: int = 2,
) -> None:
    if len(points) >= 2:
        draw.line([(int(x), int(y)) for x, y in points], fill=fill, width=width)


def draw_soft_glow(canvas: Image.Image, draw_fn: Callable[[ImageDraw.ImageDraw], None], blur: int = 12, opacity: int = 100) -> None:
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    draw_fn(gd)
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    if opacity < 255:
        glow.putalpha(glow.getchannel("A").point(lambda a: int(a * opacity / 255)))
    canvas.alpha_composite(glow)


def draw_revealed_text(
    canvas: Image.Image,
    text: str,
    center_x: int,
    y: int,
    ft: ImageFont.FreeTypeFont,
    progress: float,
    alpha: int = 255,
    tracking: int = 0,
) -> None:
    progress = clamp(progress)
    if progress <= 0:
        return

    width, height = text_size(text, ft)
    pad = 80
    layer = Image.new("RGBA", (width + pad * 2, height + pad * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x = pad
    if tracking <= 0:
        draw.text((x, pad), text, font=ft, fill=(255, 255, 255, alpha))
    else:
        for ch in text:
            draw.text((x, pad), ch, font=ft, fill=(255, 255, 255, alpha))
            x += text_size(ch, ft)[0] + tracking

    glow = layer.filter(ImageFilter.GaussianBlur(7))
    glow.putalpha(glow.getchannel("A").point(lambda a: int(a * 0.45)))
    layer = Image.alpha_composite(glow, layer)

    reveal = Image.new("L", layer.size, 0)
    rd = ImageDraw.Draw(reveal)
    reveal_w = int(layer.width * progress)
    rd.rectangle((0, 0, reveal_w, layer.height), fill=int(255 * progress))
    feather = 48
    for i in range(feather):
        x2 = reveal_w + i
        if x2 >= layer.width:
            break
        rd.line((x2, 0, x2, layer.height), fill=int(255 * progress * (1 - i / feather)))
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", layer.size, 0), reveal))

    scale = 0.965 + 0.035 * ease_out(progress)
    if scale != 1:
        layer = layer.resize((int(layer.width * scale), int(layer.height * scale)), Image.Resampling.BICUBIC)

    slide = int((1 - progress) * 30)
    x0 = center_x - layer.width // 2
    y0 = y - layer.height // 2 + slide
    canvas.alpha_composite(layer, (x0, y0))


def draw_title(canvas: Image.Image, lines: list[str], local_t: float, scene_duration: float, base_y: int = 470) -> None:
    size = fit_font_size(lines, 1420, 122 if len(lines) > 1 else 148)
    ft = font(size, bold=True)
    line_gap = int(size * 0.84)
    total_h = (len(lines) - 1) * line_gap
    fade_out = exit_hold(local_t, scene_duration)
    for idx, line in enumerate(lines):
        start = 0.18 + idx * 0.22
        progress = enter(local_t, start, 0.42) * fade_out
        y = base_y - total_h // 2 + idx * line_gap
        draw_revealed_text(canvas, line, WIDTH // 2, y, ft, progress, alpha=int(255 * fade_out), tracking=0)


def draw_progress(canvas: Image.Image, scene_index: int, p: float, audio: float) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    y = HEIGHT - 64
    x0 = WIDTH // 2 - 260
    width = 520
    draw.line((x0, y, x0 + width, y), fill=(255, 255, 255, 40), width=2)
    draw.line((x0, y, x0 + int(width * ((scene_index + p) / len(SCENES))), y), fill=(255, 255, 255, 175), width=3)
    for i in range(len(SCENES)):
        x = x0 + int(width * i / (len(SCENES) - 1))
        r = 3 if i != scene_index else 6 + int(audio * 3)
        a = 45 if i > scene_index else 110
        if i == scene_index:
            a = 210
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, a))
    canvas.alpha_composite(layer)


def draw_scene_frame(
    canvas: Image.Image,
    scene: dict[str, object],
    local_t: float,
    p: float,
    audio: float,
) -> None:
    kind = str(scene["kind"])
    scene_duration = float(scene["duration"])
    idx = int(scene["index"])

    # Tiny film-grain-like signal noise made of actual white specks, kept very restrained.
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(28):
        x = int((i * 379 + idx * 97 + p * 140) % WIDTH)
        y = int((i * 211 + idx * 61 + p * 90) % HEIGHT)
        draw.point((x, y), fill=(255, 255, 255, 18))
    canvas.alpha_composite(layer)

    dispatch = {
        "sentence_stream": draw_sentence_stream,
        "word_stream": draw_word_stream,
        "target": draw_target,
        "parse": draw_parse,
        "fragments": draw_fragments,
        "chains": draw_chains,
        "seed": draw_seed,
        "steps": draw_steps,
        "word_by_word": draw_word_by_word,
        "growth": draw_growth,
        "full_sentence": draw_full_sentence,
        "neural": draw_neural,
        "speech": draw_speech,
        "clarity": draw_clarity,
        "recall": draw_recall,
        "answer": draw_answer,
        "listen": draw_listen,
        "repeat": draw_repeat,
        "amplify": draw_amplify,
        "start": draw_start,
    }
    dispatch[kind](canvas, local_t, scene_duration, p, audio, idx)
    draw_title(canvas, list(scene["title"]), local_t, scene_duration)
    draw_progress(canvas, idx, p, audio)


def draw_waveform(
    canvas: Image.Image,
    y: int,
    start: float,
    local_t: float,
    width: int = 1520,
    amp: int = 80,
    x: int = 200,
    audio: float = 0.0,
    speed: float = 0.0,
) -> None:
    progress = enter(local_t, start, 0.75)
    if progress <= 0:
        return

    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    shown = int(width * progress)
    points = []
    for px in range(0, shown, 8):
        xx = x + px
        a = math.sin(px * 0.035 + speed) * amp * 0.45
        b = math.sin(px * 0.12 + speed * 1.7) * amp * 0.18
        c = math.sin(px * 0.011 + speed * 0.6) * amp * (0.15 + audio * 0.25)
        points.append((xx, y + a + b + c))
    glow_line(draw, points, (255, 255, 255, int(145 + audio * 70)), width=2)
    for k in range(0, shown, 64):
        h = int((18 + 46 * abs(math.sin(k * 0.03 + speed))) * (0.4 + audio))
        xx = x + k
        draw.line((xx, y - h, xx, y + h), fill=(255, 255, 255, 45), width=1)
    canvas.alpha_composite(layer)


def draw_sentence_stream(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    draw_waveform(canvas, 275, 0.0, local_t, amp=70, audio=audio, speed=p * 9)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(14):
        pp = enter(local_t, 0.35 + i * 0.045, 0.22)
        if pp <= 0:
            continue
        x = 250 + i * 95
        y = 690 + int(math.sin(i) * 22)
        w = 44 + (i % 5) * 24
        draw.rounded_rectangle((x, y, x + w * pp, y + 10), radius=5, fill=(255, 255, 255, int(120 * pp)))
        draw.line((x + w * pp, y + 5, x + w * pp + 42 * pp, y + 5), fill=(255, 255, 255, int(70 * pp)), width=1)
    canvas.alpha_composite(layer)


def draw_word_stream(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(42)
    for row in range(18):
        row_p = enter(local_t, row * 0.018, 0.5)
        y = 180 + row * 42
        for col in range(9):
            w = rng.randint(28, 132)
            x = 130 + col * 190 + int((1 - row_p) * -320) + int(math.sin(p * 6 + row) * 12)
            a = int((45 + audio * 65) * row_p)
            draw.rounded_rectangle((x, y, x + w, y + 6), radius=3, fill=(255, 255, 255, a))
    draw.ellipse((1510, 350, 1690, 530), outline=(255, 255, 255, int(90 + audio * 80)), width=2)
    draw.ellipse((1470, 310, 1730, 570), outline=(255, 255, 255, int(45 + audio * 50)), width=1)
    canvas.alpha_composite(layer)


def draw_target(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(4):
        pp = enter(local_t, 0.05 + i * 0.12, 0.45)
        r = 145 + i * 78 + audio * 22
        a = int(90 * pp)
        draw.ellipse((WIDTH // 2 - r, HEIGHT // 2 - r, WIDTH // 2 + r, HEIGHT // 2 + r), outline=(255, 255, 255, a), width=2)
    bracket_p = enter(local_t, 0.45, 0.35)
    if bracket_p:
        x0, x1 = 520, 1400
        y0, y1 = 355, 590
        l = int(82 * bracket_p)
        for sx in (x0, x1):
            sign = 1 if sx == x0 else -1
            draw.line((sx, y0, sx + sign * l, y0), fill=(255, 255, 255, 185), width=3)
            draw.line((sx, y1, sx + sign * l, y1), fill=(255, 255, 255, 185), width=3)
            draw.line((sx, y0, sx, y0 + l), fill=(255, 255, 255, 185), width=3)
            draw.line((sx, y1, sx, y1 - l), fill=(255, 255, 255, 185), width=3)
    canvas.alpha_composite(layer)


def draw_parse(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    draw_waveform(canvas, 225, 0.05, local_t, amp=52, audio=audio, speed=p * 8)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(7):
        pp = enter(local_t, 0.42 + i * 0.08, 0.28)
        x = 420 + i * 150
        y = 688
        draw.line((x, y, x + int(108 * pp), y), fill=(255, 255, 255, int(155 * pp)), width=3)
        draw.line((x, y, x, y - int(40 * pp)), fill=(255, 255, 255, int(90 * pp)), width=1)
        draw.line((x + int(108 * pp), y, x + int(108 * pp), y - int(40 * pp)), fill=(255, 255, 255, int(90 * pp)), width=1)
    for y in (625, 745):
        pp = enter(local_t, 0.25, 0.6)
        draw.line((300, y, 1620 * pp, y), fill=(255, 255, 255, int(55 * pp)), width=1)
    canvas.alpha_composite(layer)


def draw_fragments(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for row, y in enumerate((245, 705)):
        for i in range(9):
            pp = enter(local_t, 0.08 + i * 0.055 + row * 0.12, 0.22)
            x = 300 + i * 145
            w = 50 + (i % 3) * 34
            draw.rounded_rectangle((x, y, x + w * pp, y + 16), radius=8, fill=(255, 255, 255, int(170 * pp)))
            draw.rectangle((x - 16, y - 22, x + w + 16, y + 38), outline=(255, 255, 255, int(45 * pp)), width=1)
    canvas.alpha_composite(layer)


def draw_chains(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    centers = [(365 + i * 170, 665 + int(math.sin(i * 1.1) * 46)) for i in range(8)]
    prev = None
    for i, (x, y) in enumerate(centers):
        pp = enter(local_t, 0.12 + i * 0.09, 0.28)
        if prev and pp > 0:
            draw.line((prev[0], prev[1], x, y), fill=(255, 255, 255, int(115 * pp)), width=3)
            draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=(255, 255, 255, int(190 * pp)))
        if pp > 0:
            w = int((72 + i * 9) * pp)
            h = int(34 * pp)
            draw.rounded_rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), radius=14, outline=(255, 255, 255, int(210 * pp)), width=2)
            draw.line((x - w // 4, y, x + w // 4, y), fill=(255, 255, 255, int(120 * pp)), width=2)
        prev = (x, y)
    canvas.alpha_composite(layer)


def draw_seed(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    pp = enter(local_t, 0.15, 0.42)
    x0, y0, x1, y1 = 720, 640, 1200, 725
    draw.rounded_rectangle((x0, y0, x0 + (x1 - x0) * pp, y1), radius=36, outline=(255, 255, 255, int(220 * pp)), width=3)
    for i in range(3):
        node_p = enter(local_t, 0.45 + i * 0.16, 0.25)
        x = 1240 + i * 95
        draw.ellipse((x - 9, 682 - 9, x + 9, 682 + 9), fill=(255, 255, 255, int(200 * node_p)))
        if i:
            draw.line((x - 95, 682, x, 682), fill=(255, 255, 255, int(120 * node_p)), width=2)
    canvas.alpha_composite(layer)


def draw_steps(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    pts = [(250, 760), (420, 700), (590, 650), (760, 590), (930, 535), (1100, 470), (1270, 395), (1440, 330), (1610, 260)]
    for i in range(len(pts) - 1):
        pp = enter(local_t, 0.12 + i * 0.08, 0.24)
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        x = x0 + (x1 - x0) * pp
        y = y0 + (y1 - y0) * pp
        draw.line((x0, y0, x, y), fill=(255, 255, 255, int(180 * pp)), width=3)
        draw.ellipse((x0 - 8, y0 - 8, x0 + 8, y0 + 8), fill=(255, 255, 255, int(180 * pp)))
    canvas.alpha_composite(layer)


def draw_word_by_word(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(12):
        pp = enter(local_t, 0.08 + i * 0.07, 0.22)
        x = 310 + i * 108
        y = 665 + int(math.sin(i * 0.7) * 20)
        w = 58 + (i % 4) * 14
        draw.rounded_rectangle((x, y, x + w * pp, y + 26), radius=13, outline=(255, 255, 255, int(190 * pp)), width=2)
        if i > 0:
            draw.line((x - 42, y + 13, x, y + 13), fill=(255, 255, 255, int(95 * pp)), width=2)
    canvas.alpha_composite(layer)


def draw_growth(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    base_y = 760
    for i in range(8):
        pp = enter(local_t, 0.12 + i * 0.09, 0.28)
        x = 390 + i * 145
        h = (30 + i * 24) * pp
        draw.rounded_rectangle((x, base_y - h, x + 92, base_y), radius=10, outline=(255, 255, 255, int(175 * pp)), width=2)
        draw.line((x + 18, base_y - h + 18, x + 74, base_y - h + 18), fill=(255, 255, 255, int(80 * pp)), width=2)
    arc_p = enter(local_t, 0.35, 0.75)
    draw.arc((360, 265, 1570, 960), 195, int(195 + 105 * arc_p), fill=(255, 255, 255, int(170 * arc_p)), width=4)
    canvas.alpha_composite(layer)


def draw_full_sentence(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    y = 700
    x = 280
    for i in range(15):
        pp = enter(local_t, 0.05 + i * 0.045, 0.2)
        w = 64 + (i % 5) * 18
        draw.rounded_rectangle((x, y, x + w * pp, y + 22), radius=9, fill=(255, 255, 255, int(125 * pp)))
        x += w + 16
    bracket_p = enter(local_t, 0.72, 0.34)
    draw.line((255, y - 52, 255, y + 78), fill=(255, 255, 255, int(210 * bracket_p)), width=4)
    draw.line((1665, y - 52, 1665, y + 78), fill=(255, 255, 255, int(210 * bracket_p)), width=4)
    canvas.alpha_composite(layer)


def draw_neural(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    points = []
    for i in range(22):
        x = 300 + (i * 71) % 1320
        y = 220 + ((i * 157) % 560)
        points.append((x, y))
    for i, a in enumerate(points):
        pp = enter(local_t, 0.08 + i * 0.018, 0.45)
        if pp <= 0:
            continue
        for j in (i + 3, i + 7):
            b = points[j % len(points)]
            if abs(a[0] - b[0]) < 420:
                draw.line((a[0], a[1], b[0], b[1]), fill=(255, 255, 255, int(40 * pp)), width=1)
        r = 3 + int(audio * 4)
        draw.ellipse((a[0] - r, a[1] - r, a[0] + r, a[1] + r), fill=(255, 255, 255, int(160 * pp)))
    draw_waveform(canvas, 540, 0.45, local_t, width=1200, x=360, amp=36, audio=audio, speed=p * 11)
    canvas.alpha_composite(layer)


def draw_speech(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    draw_waveform(canvas, 650, 0.05, local_t, width=1540, x=190, amp=88, audio=audio, speed=p * 13)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(7):
        pp = enter(local_t, 0.62 + i * 0.07, 0.28)
        x = 1120 + i * 66
        y = 630 + (i % 2) * 38
        draw.rounded_rectangle((x, y, x + 58 * pp, y + 18), radius=7, outline=(255, 255, 255, int(170 * pp)), width=2)
    canvas.alpha_composite(layer)


def draw_clarity(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    draw_waveform(canvas, 285, 0.0, local_t, width=700, x=180, amp=82, audio=audio, speed=p * 12)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(8):
        pp = enter(local_t, 0.48 + i * 0.055, 0.25)
        x = 1040 + i * 70
        y = 640
        draw.rounded_rectangle((x, y, x + 58 * pp, y + 20), radius=9, fill=(255, 255, 255, int(130 * pp)))
    guide_p = enter(local_t, 0.75, 0.35)
    draw.line((980, 612, 1650, 612), fill=(255, 255, 255, int(90 * guide_p)), width=1)
    draw.line((980, 692, 1650, 692), fill=(255, 255, 255, int(90 * guide_p)), width=1)
    canvas.alpha_composite(layer)


def draw_recall(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    arc_p = enter(local_t, 0.08, 1.0)
    bbox = (WIDTH // 2 - 255, HEIGHT // 2 - 255, WIDTH // 2 + 255, HEIGHT // 2 + 255)
    draw.arc(bbox, -90, -90 + 320 * arc_p, fill=(255, 255, 255, 210), width=4)
    for i in range(12):
        pp = enter(local_t, 0.24 + i * 0.06, 0.18)
        angle = math.radians(-90 + i * 28)
        x = WIDTH // 2 + math.cos(angle) * 255
        y = HEIGHT // 2 + math.sin(angle) * 255
        draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(255, 255, 255, int(170 * pp)))
    for side in (-1, 1):
        for i in range(4):
            pp = enter(local_t, 0.5 + i * 0.1, 0.25)
            x = WIDTH // 2 + side * (420 + i * 26)
            y = 405 + i * 72
            draw.rounded_rectangle((x - 125, y, x + 125, y + 26), radius=13, outline=(255, 255, 255, int(110 * pp)), width=2)
    canvas.alpha_composite(layer)


def draw_answer(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(11):
        pp = enter(local_t, 0.05 + i * 0.055, 0.18)
        x = 420 + i * 94
        y = 675 + int(math.sin(i) * 34)
        draw.rounded_rectangle((x, y, x + 70 * pp, y + 20), radius=10, outline=(255, 255, 255, int(140 * pp)), width=2)
    reveal_p = enter(local_t, 0.62, 0.35)
    r = 170 + int(audio * 30)
    draw.ellipse((WIDTH // 2 - r, HEIGHT // 2 - r, WIDTH // 2 + r, HEIGHT // 2 + r), outline=(255, 255, 255, int(215 * reveal_p)), width=5)
    draw.line((WIDTH // 2, HEIGHT // 2 + r + 20, WIDTH // 2, HEIGHT // 2 + r + 150), fill=(255, 255, 255, int(170 * reveal_p)), width=3)
    canvas.alpha_composite(layer)


def draw_listen(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    draw_waveform(canvas, 545, 0.08, local_t, width=1500, x=210, amp=54, audio=audio, speed=p * 9)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(4):
        pp = enter(local_t, 0.35 + i * 0.11, 0.42)
        r = 160 + i * 72 + audio * 16
        draw.arc((WIDTH // 2 - r, HEIGHT // 2 - r, WIDTH // 2 + r, HEIGHT // 2 + r), 145, 215, fill=(255, 255, 255, int(120 * pp)), width=3)
        draw.arc((WIDTH // 2 - r, HEIGHT // 2 - r, WIDTH // 2 + r, HEIGHT // 2 + r), -35, 35, fill=(255, 255, 255, int(120 * pp)), width=3)
    canvas.alpha_composite(layer)


def draw_repeat(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    draw_waveform(canvas, 540, 0.04, local_t, width=1500, x=210, amp=92, audio=audio, speed=p * 15)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(6):
        pp = enter(local_t, 0.2 + i * 0.08, 0.45)
        r = 120 + i * 70 + 30 * ((p + i * 0.11) % 1)
        draw.ellipse((WIDTH // 2 - r, HEIGHT // 2 - r, WIDTH // 2 + r, HEIGHT // 2 + r), outline=(255, 255, 255, int(75 * pp)), width=2)
    canvas.alpha_composite(layer)


def draw_amplify(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    draw_waveform(canvas, 270, 0.08, local_t, width=1500, x=210, amp=78, audio=audio, speed=p * 14)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    base_y = 780
    for i in range(10):
        pp = enter(local_t, 0.18 + i * 0.055, 0.25)
        x = 500 + i * 92
        h = (28 + i * 24 + audio * 42) * pp
        draw.rounded_rectangle((x, base_y - h, x + 38, base_y), radius=6, fill=(255, 255, 255, int(120 * pp)))
    for i in range(3):
        pp = enter(local_t, 0.58 + i * 0.16, 0.45)
        r = 190 + i * 95 + audio * 22
        draw.ellipse((WIDTH // 2 - r, HEIGHT // 2 - r, WIDTH // 2 + r, HEIGHT // 2 + r), outline=(255, 255, 255, int(85 * pp)), width=2)
    canvas.alpha_composite(layer)


def draw_start(canvas: Image.Image, local_t: float, duration: float, p: float, audio: float, idx: int) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    center = (WIDTH // 2, HEIGHT // 2)
    for i in range(18):
        pp = enter(local_t, i * 0.025, 0.28)
        angle = math.tau * i / 18
        outer = 620 - 260 * pp
        x0 = center[0] + math.cos(angle) * outer
        y0 = center[1] + math.sin(angle) * outer
        x1 = center[0] + math.cos(angle) * (outer - 120 * pp)
        y1 = center[1] + math.sin(angle) * (outer - 120 * pp)
        draw.line((x0, y0, x1, y1), fill=(255, 255, 255, int(160 * pp)), width=2)
    r = 210 + audio * 28
    draw.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r), outline=(255, 255, 255, int(180 * enter(local_t, 0.35, 0.35))), width=3)
    canvas.alpha_composite(layer)


def generate_sfx(schedule: list[dict[str, object]], duration: float, out_path: Path) -> None:
    total_samples = int(duration * SAMPLE_RATE) + SAMPLE_RATE
    samples = [0.0] * total_samples
    rng = random.Random(1234)

    def add_sample(pos: int, value: float) -> None:
        if 0 <= pos < total_samples:
            samples[pos] = clamp(samples[pos] + value, -1.0, 1.0)

    def click(t: float, freq: float = 1400, dur: float = 0.055, volume: float = 0.16) -> None:
        start = int(t * SAMPLE_RATE)
        count = int(dur * SAMPLE_RATE)
        for n in range(count):
            x = n / max(1, count)
            env = math.exp(-x * 9)
            tone = math.sin(math.tau * freq * n / SAMPLE_RATE)
            add_sample(start + n, tone * env * volume)

    def pulse(t: float, freq: float = 120, dur: float = 0.14, volume: float = 0.13) -> None:
        start = int(t * SAMPLE_RATE)
        count = int(dur * SAMPLE_RATE)
        for n in range(count):
            x = n / max(1, count)
            env = math.sin(math.pi * x) * math.exp(-x * 2.5)
            tone = math.sin(math.tau * freq * n / SAMPLE_RATE)
            add_sample(start + n, tone * env * volume)

    def whoosh(t: float, dur: float = 0.36, volume: float = 0.10) -> None:
        start = int(t * SAMPLE_RATE)
        count = int(dur * SAMPLE_RATE)
        for n in range(count):
            x = n / max(1, count)
            env = math.sin(math.pi * x) ** 0.7
            freq = 220 + 980 * (x**1.7)
            tone = math.sin(math.tau * freq * n / SAMPLE_RATE)
            noise = rng.uniform(-1, 1) * 0.38
            add_sample(start + n, (tone * 0.55 + noise) * env * volume)

    for scene in schedule:
        start = float(scene["start"])
        duration_scene = float(scene["duration"])
        whoosh(start + 0.02, 0.34, 0.085)
        pulse(start + 0.22, 110, 0.12, 0.08)
        for line_index in range(len(scene["title"])):  # type: ignore[arg-type]
            click(start + 0.2 + line_index * 0.22, 1320 + line_index * 210, 0.045, 0.11)
        for event in range(6):
            t = start + 0.45 + event * max(0.09, duration_scene * 0.075)
            if t < start + duration_scene - 0.18:
                click(t, 900 + event * 145, 0.035, 0.055)
        if str(scene["kind"]) in {"answer", "start", "amplify"}:
            pulse(start + duration_scene * 0.62, 82, 0.22, 0.15)

    int_samples = [int(clamp(s, -0.95, 0.95) * 32767) for s in samples[: int(duration * SAMPLE_RATE)]]
    with wave.open(str(out_path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(struct.pack("<" + "h" * len(int_samples), *int_samples))


def render(args: argparse.Namespace) -> None:
    audio_path = Path(args.audio)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    audio_duration = probe_duration(audio_path)
    frame_duration = math.ceil(audio_duration * FPS) / FPS
    schedule = build_schedule(frame_duration)
    envelope = load_envelope(audio_path, frame_duration)

    sfx_path = output_path.with_suffix(".sfx.wav")
    timeline_path = output_path.with_suffix(".timeline.json")
    generate_sfx(schedule, frame_duration, sfx_path)
    timeline_path.write_text(json.dumps(schedule, ensure_ascii=False, indent=2), encoding="utf-8")

    cmd = [
        "ffmpeg",
        "-y",
        "-v",
        "error",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-i",
        str(audio_path),
        "-i",
        str(sfx_path),
        "-filter_complex",
        "[1:a]volume=1.0[voice];[2:a]volume=0.34[sfx];[voice][sfx]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[a]",
        "-map",
        "0:v:0",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "16",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        str(output_path),
    ]

    total_frames = math.ceil(frame_duration * FPS)
    process = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert process.stdin is not None
    last_scene = -1
    try:
        for frame_idx in range(total_frames):
            t = frame_idx / FPS
            scene = scene_at(schedule, t)
            scene_idx = int(scene["index"])
            if scene_idx != last_scene:
                print(f"Rendering layered scene {scene_idx + 1:02d}/20: {scene['kind']}", flush=True)
                last_scene = scene_idx
            local_t = t - float(scene["start"])
            duration = float(scene["duration"])
            p = clamp(local_t / max(duration, 0.001))
            audio = envelope[min(frame_idx, len(envelope) - 1)]

            frame = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
            draw_scene_frame(frame, scene, local_t, p, audio)
            process.stdin.write(frame.tobytes())
    finally:
        process.stdin.close()

    code = process.wait()
    if code:
        raise SystemExit(f"ffmpeg failed with exit code {code}")

    print(f"Wrote {output_path}")
    print(f"Wrote {sfx_path}")
    print(f"Wrote {timeline_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    render(parser.parse_args())


if __name__ == "__main__":
    main()
