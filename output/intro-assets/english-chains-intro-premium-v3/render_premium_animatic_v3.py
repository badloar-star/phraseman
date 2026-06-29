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
from dataclasses import dataclass, asdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


WIDTH = 1920
HEIGHT = 1080
FPS = 30
SR = 48000

FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")
FONT_MONO = Path("C:/Windows/Fonts/consola.ttf")


SCENES = [
    {
        "id": "s01_stream",
        "title": ["ПОТОК", "СЛОВ?"],
        "caption": "длинные английские фразы звучат как один шум",
        "start": 0.00,
        "end": 5.20,
        "kind": "stream",
    },
    {
        "id": "s02_chains_method",
        "title": ["НЕ СЛОВАМИ.", "ЦЕПОЧКАМИ."],
        "caption": "разбираем речь на смысловые куски",
        "start": 5.20,
        "end": 10.70,
        "kind": "chains_method",
    },
    {
        "id": "s03_phrase_growth",
        "title": ["ФРАЗА", "РАСТЕТ"],
        "caption": "короткая фраза становится разговорным предложением",
        "start": 10.70,
        "end": 19.60,
        "kind": "phrase_growth",
    },
    {
        "id": "s04_brain_clarity",
        "title": ["МОЗГ СЛЫШИТ", "СТРУКТУРУ"],
        "caption": "длинная речь становится понятнее",
        "start": 19.60,
        "end": 26.40,
        "kind": "brain_clarity",
    },
    {
        "id": "s05_recall",
        "title": ["ПОПРОБУЙТЕ", "ВСПОМНИТЬ"],
        "caption": "короткая пауза перед правильным ответом",
        "start": 26.40,
        "end": 31.50,
        "kind": "recall",
    },
    {
        "id": "s06_repeat",
        "title": ["ПОВТОРЯЙТЕ", "ВСЛУХ"],
        "caption": "эффект сильнее, когда вы произносите цепочку",
        "start": 31.50,
        "end": 35.90,
        "kind": "repeat",
    },
    {
        "id": "s07_start",
        "title": ["НАЧИНАЕМ"],
        "caption": "",
        "start": 35.90,
        "end": 37.642438,
        "kind": "start",
    },
]


PHRASE_STEPS = [
    ("I need", "Мне нужно...", 11.55),
    ("I need to", "", 12.95),
    ("I need to get", "", 14.30),
    ("I need to get back", "", 15.95),
    ("I need to get back to work", "...вернуться к работе", 17.55),
]


@dataclass
class SfxEvent:
    role: str
    family: str
    start: float
    duration: float
    volume: float
    frequency: float
    query: str
    visual_event: str


def run_capture(cmd: list[str]) -> str:
    return subprocess.run(cmd, check=True, text=True, capture_output=True).stdout.strip()


def probe_duration(path: Path) -> float:
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
                str(path),
            ]
        )
    )


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def ease_out(v: float) -> float:
    v = clamp(v)
    return 1 - (1 - v) ** 3


def ease_in_out(v: float) -> float:
    v = clamp(v)
    return v * v * (3 - 2 * v)


def window(t: float, start: float, duration: float) -> float:
    return ease_out((t - start) / max(duration, 0.001))


def fade_out(local_t: float, duration: float, amount: float = 0.35) -> float:
    return ease_out((duration - local_t) / amount)


def ft(size: int, bold: bool = True, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MONO if mono and FONT_MONO.exists() else (FONT_BOLD if bold else FONT_REGULAR)
    return ImageFont.truetype(str(path), size)


def text_box(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0], b[3] - b[1]


def fit_font(lines: list[str], max_width: int, start: int) -> ImageFont.FreeTypeFont:
    size = start
    probe = ImageDraw.Draw(Image.new("L", (10, 10)))
    while size > 42:
        font = ft(size, True)
        if all(text_box(probe, line, font)[0] <= max_width for line in lines):
            return font
        size -= 3
    return ft(size, True)


def load_envelope(audio_path: Path, duration: float) -> list[float]:
    sample_rate = 16000
    raw = subprocess.run(
        [
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
        ],
        check=True,
        capture_output=True,
    ).stdout
    samples = array.array("h")
    samples.frombytes(raw)
    if sys.byteorder != "little":
        samples.byteswap()
    total_frames = math.ceil(duration * FPS)
    per = sample_rate / FPS
    values = []
    for frame in range(total_frames):
        s = int(frame * per)
        e = min(len(samples), int((frame + 1) * per))
        if e <= s:
            values.append(0.0)
        else:
            rms = math.sqrt(sum(x * x for x in samples[s:e]) / (e - s))
            values.append(rms)
    peak = sorted(values)[int(len(values) * 0.91)] if values else 1
    peak = peak or max(values or [1])
    out = []
    prev = 0.0
    for value in values:
        prev = prev * 0.80 + min(1.0, value / peak) * 0.20
        out.append(prev)
    return out


def scene_at(t: float) -> dict:
    for scene in SCENES:
        if scene["start"] <= t < scene["end"]:
            return scene
    return SCENES[-1]


def draw_masked_text(
    canvas: Image.Image,
    text: str,
    x: int,
    y: int,
    font: ImageFont.FreeTypeFont,
    progress: float,
    alpha: int = 255,
    align: str = "center",
) -> None:
    progress = clamp(progress)
    if progress <= 0:
        return
    probe = ImageDraw.Draw(Image.new("L", (10, 10)))
    w, h = text_box(probe, text, font)
    pad = 80
    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((pad, pad), text, font=font, fill=(255, 255, 255, alpha))
    glow = layer.filter(ImageFilter.GaussianBlur(6))
    glow.putalpha(glow.getchannel("A").point(lambda a: int(a * 0.34)))
    layer = Image.alpha_composite(glow, layer)
    mask = Image.new("L", layer.size, 0)
    md = ImageDraw.Draw(mask)
    reveal_w = int(layer.width * progress)
    md.rectangle((0, 0, reveal_w, layer.height), fill=255)
    for i in range(48):
        xx = reveal_w + i
        if xx >= layer.width:
            break
        md.line((xx, 0, xx, layer.height), fill=int(255 * (1 - i / 48)))
    layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", layer.size, 0), mask))
    if align == "center":
        x0 = x - layer.width // 2
    elif align == "right":
        x0 = x - layer.width
    else:
        x0 = x
    y0 = y - layer.height // 2 + int((1 - progress) * 18)
    canvas.alpha_composite(layer, (x0, y0))


def draw_title(canvas: Image.Image, scene: dict, local_t: float) -> None:
    lines = scene["title"]
    duration = scene["end"] - scene["start"]
    if scene["kind"] == "phrase_growth":
        font = fit_font(lines, 1100, 84)
        base_y = 215
        caption_y = 350
    else:
        font = fit_font(lines, 1380, 124 if len(lines) > 1 else 154)
        base_y = 430
        caption_y = 705
    line_h = int(font.size * 0.88)
    y0 = base_y - (len(lines) - 1) * line_h // 2
    out = fade_out(local_t, duration, 0.45)
    for i, line in enumerate(lines):
        p = window(local_t, 0.22 + i * 0.22, 0.58) * out
        draw_masked_text(canvas, line, WIDTH // 2, y0 + i * line_h, font, p, int(255 * out))
    caption = scene.get("caption") or ""
    if caption:
        cfont = ft(34, False)
        cp = window(local_t, 1.00, 0.55) * out
        draw_masked_text(canvas, caption, WIDTH // 2, caption_y, cfont, cp, int(165 * out))


def draw_wave(canvas: Image.Image, y: int, x0: int, w: int, p: float, amp: float, audio: float, phase: float, alpha: int = 150) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shown = int(w * clamp(p))
    pts = []
    for x in range(0, shown, 7):
        yy = y + math.sin(x * 0.031 + phase) * amp + math.sin(x * 0.113 + phase * 1.7) * amp * 0.23
        yy += math.sin(x * 0.009 + phase * 0.5) * amp * audio * 0.35
        pts.append((x0 + x, yy))
    if len(pts) > 1:
        d.line([(int(x), int(y)) for x, y in pts], fill=(255, 255, 255, int(alpha + audio * 55)), width=2)
    for x in range(0, shown, 86):
        h = int((10 + 42 * abs(math.sin(x * 0.05 + phase))) * (0.45 + audio))
        d.line((x0 + x, y - h, x0 + x, y + h), fill=(255, 255, 255, 42), width=1)
    canvas.alpha_composite(layer)


def draw_progress(canvas: Image.Image, t: float) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0 = 510
    y = HEIGHT - 70
    w = 900
    total = SCENES[-1]["end"]
    d.line((x0, y, x0 + w, y), fill=(255, 255, 255, 32), width=2)
    d.line((x0, y, x0 + int(w * t / total), y), fill=(255, 255, 255, 150), width=3)
    for s in SCENES:
        x = x0 + int(w * s["start"] / total)
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(255, 255, 255, 120 if t >= s["start"] else 42))
    canvas.alpha_composite(layer)


def draw_stream(canvas: Image.Image, local_t: float, p: float, audio: float) -> None:
    draw_wave(canvas, 280, 190, 1540, window(local_t, 0.05, 1.1), 74, audio, local_t * 5)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(22):
        pp = window(local_t, 0.72 + i * 0.035, 0.24)
        x = 230 + i * 68
        y = 800 + int(math.sin(i * 0.67) * 28)
        length = 28 + (i % 5) * 17
        d.rounded_rectangle((x, y, x + length * pp, y + 8), radius=4, fill=(255, 255, 255, int(110 * pp)))
    canvas.alpha_composite(layer)


def draw_chains_method(canvas: Image.Image, local_t: float, p: float, audio: float) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Before: isolated word blocks.
    for i in range(9):
        pp = window(local_t, 0.25 + i * 0.05, 0.28)
        x = 270 + i * 150
        y = 250
        d.rounded_rectangle((x, y, x + (54 + i % 3 * 26) * pp, y + 15), radius=7, fill=(255, 255, 255, int(150 * pp)))
    # After: connected chain.
    centers = [(345 + i * 165, 705 + int(math.sin(i * 1.2) * 36)) for i in range(8)]
    prev = None
    for i, (x, y) in enumerate(centers):
        pp = window(local_t, 2.05 + i * 0.12, 0.35)
        if prev and pp:
            d.line((prev[0], prev[1], x, y), fill=(255, 255, 255, int(120 * pp)), width=3)
        w = int((84 + i * 7) * pp)
        h = int(34 * pp)
        d.rounded_rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), radius=15, outline=(255, 255, 255, int(210 * pp)), width=2)
        d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(255, 255, 255, int(160 * pp)))
        prev = (x, y)
    canvas.alpha_composite(layer)


def draw_phrase_capsule(
    canvas: Image.Image,
    text: str,
    ru: str,
    center_x: int,
    center_y: int,
    progress: float,
    active: bool,
) -> None:
    progress = clamp(progress)
    if progress <= 0:
        return
    ef = ft(38, True, mono=True)
    rf = ft(25, False)
    probe = ImageDraw.Draw(Image.new("L", (10, 10)))
    tw, th = text_box(probe, text, ef)
    rw, rh = text_box(probe, ru, rf) if ru else (0, 0)
    pad_x = 36
    w = max(tw, rw) + pad_x * 2
    h = 86 if ru else 62
    w = int(w * progress)
    if w < 10:
        return
    layer = Image.new("RGBA", (max(10, w + 40), h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    a = 230 if active else 120
    d.rounded_rectangle((20, 20, w + 20, h + 20), radius=22, outline=(255, 255, 255, a), width=3 if active else 2)
    if progress > 0.72:
        tx = 20 + (w - tw) // 2
        d.text((tx, 30), text, font=ef, fill=(255, 255, 255, 245 if active else 185))
        if ru:
            rx = 20 + (w - rw) // 2
            d.text((rx, 78), ru, font=rf, fill=(255, 255, 255, 145))
    if active:
        glow = layer.filter(ImageFilter.GaussianBlur(8))
        glow.putalpha(glow.getchannel("A").point(lambda x: int(x * 0.26)))
        layer = Image.alpha_composite(glow, layer)
    canvas.alpha_composite(layer, (center_x - layer.width // 2, center_y - layer.height // 2))


def draw_large_phrase(canvas: Image.Image, text: str, ru: str, progress: float, active_glow: float) -> None:
    progress = clamp(progress)
    if progress <= 0:
        return
    ef = ft(68, True, mono=True)
    rf = ft(34, False)
    probe = ImageDraw.Draw(Image.new("L", (10, 10)))
    tw, th = text_box(probe, text, ef)
    rw, rh = text_box(probe, ru, rf) if ru else (0, 0)
    w = min(1420, max(tw, rw) + 120)
    h = 178 if ru else 132
    layer = Image.new("RGBA", (w + 140, h + 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    box_w = int(w * progress)
    x0 = (layer.width - w) // 2
    y0 = 42
    d.rounded_rectangle((x0, y0, x0 + box_w, y0 + h), radius=36, outline=(255, 255, 255, int(220 * progress)), width=4)
    if progress > 0.72:
        tx = x0 + (w - tw) // 2
        d.text((tx, y0 + 34), text, font=ef, fill=(255, 255, 255, 248))
        if ru:
            rx = x0 + (w - rw) // 2
            d.text((rx, y0 + 112), ru, font=rf, fill=(255, 255, 255, 160))
    if active_glow:
        glow = layer.filter(ImageFilter.GaussianBlur(14))
        glow.putalpha(glow.getchannel("A").point(lambda x: int(x * 0.22 * active_glow)))
        layer = Image.alpha_composite(glow, layer)
    canvas.alpha_composite(layer, (WIDTH // 2 - layer.width // 2, 560 - layer.height // 2))


def draw_phrase_growth(canvas: Image.Image, local_t: float, p: float, audio: float) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rail_y = 820
    x0 = 420
    x1 = 1500
    d.line((x0, rail_y, x1, rail_y), fill=(255, 255, 255, 40), width=2)

    active_index = 0
    for i, (_, _, abs_start) in enumerate(PHRASE_STEPS):
        if local_t >= abs_start - 10.70:
            active_index = i

    mono_small = ft(25, True, mono=True)
    for i, (en, _, abs_start) in enumerate(PHRASE_STEPS):
        local_start = abs_start - 10.70
        pp = window(local_t, local_start, 0.35)
        x = x0 + int((x1 - x0) * i / (len(PHRASE_STEPS) - 1))
        r = 8 if i != active_index else 13
        d.ellipse((x - r, rail_y - r, x + r, rail_y + r), fill=(255, 255, 255, int((120 if i != active_index else 220) * pp)))
        if i <= active_index and pp > 0.95:
            label = str(i + 1)
            d.text((x - 7, rail_y + 28), label, font=mono_small, fill=(255, 255, 255, 105))
        if i > 0:
            prev_abs = PHRASE_STEPS[i - 1][2] - 10.70
            line_p = window(local_t, local_start + 0.18, 0.30)
            px = x0 + int((x1 - x0) * (i - 1) / (len(PHRASE_STEPS) - 1))
            d.line((px, rail_y, px + (x - px) * line_p, rail_y), fill=(255, 255, 255, int(115 * line_p)), width=3)

    canvas.alpha_composite(layer)

    en, ru, abs_start = PHRASE_STEPS[active_index]
    active_start = abs_start - 10.70
    phrase_p = window(local_t, active_start, 0.58)
    draw_large_phrase(canvas, en, ru, phrase_p, 1.0 if active_index == len(PHRASE_STEPS) - 1 else 0.65)


def draw_brain_clarity(canvas: Image.Image, local_t: float, p: float, audio: float) -> None:
    draw_wave(canvas, 790, 280, 1360, window(local_t, 0.55, 1.0), 45, audio, local_t * 8, alpha=100)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    points = []
    for i in range(26):
        x = 350 + (i * 197) % 1240
        y = 215 + (i * 109) % 405
        points.append((x, y))
    for i, a in enumerate(points):
        pp = window(local_t, 0.20 + i * 0.028, 0.38)
        if pp <= 0:
            continue
        for j in (i + 4, i + 9):
            b = points[j % len(points)]
            if abs(a[0] - b[0]) < 390:
                d.line((a[0], a[1], b[0], b[1]), fill=(255, 255, 255, int(36 * pp)), width=1)
        r = 3 + int(audio * 4)
        d.ellipse((a[0] - r, a[1] - r, a[0] + r, a[1] + r), fill=(255, 255, 255, int(160 * pp)))
    canvas.alpha_composite(layer)


def draw_recall(canvas: Image.Image, local_t: float, p: float, audio: float) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ring_p = window(local_t, 0.5, 1.0)
    r = 250
    d.arc((WIDTH // 2 - r, HEIGHT // 2 - r, WIDTH // 2 + r, HEIGHT // 2 + r), -90, -90 + 310 * ring_p, fill=(255, 255, 255, 190), width=4)
    for i in range(5):
        pp = window(local_t, 1.2 + i * 0.28, 0.22)
        x = 610 + i * 175
        y = 740
        d.rounded_rectangle((x, y, x + 115 * pp, y + 24), radius=12, outline=(255, 255, 255, int(155 * pp)), width=2)
    blank_p = window(local_t, 2.8, 0.45)
    f = ft(40, True, mono=True)
    for i, word in enumerate(["I", "need", "to", "____", "____"]):
        a = int(210 * blank_p)
        d.text((620 + i * 135, 600), word, font=f, fill=(255, 255, 255, a))
    canvas.alpha_composite(layer)


def draw_repeat(canvas: Image.Image, local_t: float, p: float, audio: float) -> None:
    draw_wave(canvas, 650, 270, 1380, window(local_t, 0.3, 0.9), 70, audio, local_t * 10, alpha=132)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(5):
        pp = window(local_t, 0.8 + i * 0.22, 0.5)
        r = 140 + i * 75 + audio * 18
        d.ellipse((WIDTH // 2 - r, 650 - r, WIDTH // 2 + r, 650 + r), outline=(255, 255, 255, int(70 * pp)), width=2)
    f = ft(38, True, mono=True)
    draw_masked_text(canvas, "I need to get back to work", WIDTH // 2, 790, f, window(local_t, 1.5, 0.65), 220)
    canvas.alpha_composite(layer)


def draw_start(canvas: Image.Image, local_t: float, p: float, audio: float) -> None:
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = WIDTH // 2, HEIGHT // 2
    for i in range(20):
        pp = window(local_t, i * 0.018, 0.28)
        angle = math.tau * i / 20
        start_r = 740 - 430 * pp
        end_r = start_r - 120 * pp
        d.line((cx + math.cos(angle) * start_r, cy + math.sin(angle) * start_r, cx + math.cos(angle) * end_r, cy + math.sin(angle) * end_r), fill=(255, 255, 255, int(160 * pp)), width=2)
    r = 190 + audio * 40
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 255, 255, int(175 * window(local_t, 0.28, 0.32))), width=3)
    canvas.alpha_composite(layer)


def draw_frame(t: float, audio: float) -> Image.Image:
    scene = scene_at(t)
    local_t = t - scene["start"]
    dur = scene["end"] - scene["start"]
    p = clamp(local_t / dur)
    frame = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
    # Scene body first, title second for readability.
    kind = scene["kind"]
    if kind == "stream":
        draw_stream(frame, local_t, p, audio)
    elif kind == "chains_method":
        draw_chains_method(frame, local_t, p, audio)
    elif kind == "phrase_growth":
        draw_phrase_growth(frame, local_t, p, audio)
    elif kind == "brain_clarity":
        draw_brain_clarity(frame, local_t, p, audio)
    elif kind == "recall":
        draw_recall(frame, local_t, p, audio)
    elif kind == "repeat":
        draw_repeat(frame, local_t, p, audio)
    elif kind == "start":
        draw_start(frame, local_t, p, audio)
    draw_title(frame, scene, local_t)
    draw_progress(frame, t)
    return frame


def add_event(samples: list[float], event: SfxEvent, rng: random.Random) -> None:
    start = int(event.start * SR)
    count = max(1, int(event.duration * SR))
    family = event.family
    for n in range(count):
        x = n / count
        if family == "air":
            env = math.sin(math.pi * x) ** 0.7
            freq = event.frequency * (0.55 + 2.2 * x)
            tone = math.sin(math.tau * freq * n / SR)
            noise = rng.uniform(-1, 1) * 0.45
            value = (tone * 0.48 + noise) * env
        elif family == "blip":
            env = math.exp(-x * 10)
            value = (math.sin(math.tau * event.frequency * n / SR) + 0.25 * math.sin(math.tau * event.frequency * 2.03 * n / SR)) * env
        elif family == "magnetic":
            env = math.exp(-x * 13)
            value = (math.sin(math.tau * event.frequency * n / SR) * 0.65 + math.sin(math.tau * 92 * n / SR) * 0.35) * env
        elif family == "riser":
            env = math.sin(math.pi * x)
            freq = event.frequency + 900 * x * x
            value = math.sin(math.tau * freq * n / SR) * env
        elif family == "pulse":
            env = math.sin(math.pi * x) * math.exp(-x * 2.0)
            value = math.sin(math.tau * event.frequency * n / SR) * env
        elif family == "tick":
            env = math.exp(-x * 18)
            value = (rng.uniform(-1, 1) * 0.5 + math.sin(math.tau * event.frequency * n / SR)) * env
        elif family == "chime":
            env = math.exp(-x * 4.8)
            value = (
                math.sin(math.tau * event.frequency * n / SR)
                + 0.42 * math.sin(math.tau * event.frequency * 1.5 * n / SR)
                + 0.22 * math.sin(math.tau * event.frequency * 2.0 * n / SR)
            ) * env
        else:  # hit
            env = math.exp(-x * 7)
            value = (math.sin(math.tau * event.frequency * n / SR) * 0.55 + rng.uniform(-1, 1) * 0.35) * env
        pos = start + n
        if 0 <= pos < len(samples):
            samples[pos] = clamp(samples[pos] + value * event.volume, -1.0, 1.0)


def build_sfx_events() -> list[SfxEvent]:
    events = [
        SfxEvent("opening_reveal", "air", 0.15, 0.48, 0.10, 320, "soft whoosh", "stream waveform reveal"),
        SfxEvent("word_noise_01", "blip", 1.05, 0.06, 0.055, 980, "data blip", "word fragments enter"),
        SfxEvent("word_noise_02", "blip", 1.42, 0.05, 0.050, 1220, "ui click", "word fragments enter"),
        SfxEvent("stream_resolve", "riser", 3.75, 0.70, 0.060, 260, "digital riser short", "stream begins resolving"),
        SfxEvent("method_cut", "air", 5.26, 0.38, 0.075, 420, "short whoosh", "scene 2 reveal"),
        SfxEvent("word_blocks", "tick", 6.10, 0.045, 0.050, 840, "soft tick", "isolated word block"),
        SfxEvent("chain_attach_01", "magnetic", 7.45, 0.08, 0.075, 760, "magnetic click", "first chain connector"),
        SfxEvent("chain_attach_02", "magnetic", 7.92, 0.08, 0.072, 690, "soft metal click", "second chain connector"),
        SfxEvent("chain_attach_03", "magnetic", 8.42, 0.08, 0.070, 810, "magnetic click", "third chain connector"),
        SfxEvent("phrase_scene_air", "air", 10.78, 0.42, 0.085, 360, "soft whoosh", "phrase growth scene reveal"),
        SfxEvent("phrase_i_need", "chime", 11.62, 0.22, 0.070, 620, "soft chime", "I need capsule"),
        SfxEvent("phrase_to", "magnetic", 13.02, 0.08, 0.066, 900, "ui click", "to connector"),
        SfxEvent("phrase_get", "blip", 14.38, 0.06, 0.060, 1120, "data blip", "get capsule"),
        SfxEvent("phrase_back", "magnetic", 16.05, 0.10, 0.070, 520, "soft metal click", "back capsule"),
        SfxEvent("phrase_full_lock", "chime", 17.72, 0.42, 0.088, 380, "logo reveal soft", "full sentence lock"),
        SfxEvent("brain_air", "air", 19.66, 0.36, 0.070, 280, "reverse swell", "brain scene reveal"),
        SfxEvent("neural_pulse_01", "pulse", 21.08, 0.20, 0.055, 130, "technology pulse", "neural graph sync"),
        SfxEvent("neural_pulse_02", "pulse", 22.65, 0.18, 0.052, 165, "technology pulse", "neural graph sync"),
        SfxEvent("clarity_lock", "chime", 24.86, 0.36, 0.070, 510, "soft confirmation", "clarity moment"),
        SfxEvent("recall_air", "air", 26.50, 0.34, 0.060, 240, "reverse swell", "recall scene opens"),
        SfxEvent("memory_tick_01", "tick", 27.74, 0.045, 0.046, 760, "memory tick", "timer tick"),
        SfxEvent("memory_tick_02", "tick", 28.42, 0.045, 0.046, 700, "memory tick", "timer tick"),
        SfxEvent("memory_tick_03", "tick", 29.10, 0.045, 0.046, 820, "memory tick", "timer tick"),
        SfxEvent("answer_hint", "chime", 30.62, 0.30, 0.068, 660, "soft chime", "answer hint"),
        SfxEvent("repeat_air", "air", 31.58, 0.36, 0.064, 410, "air pulse", "repeat scene opens"),
        SfxEvent("repeat_wave", "pulse", 33.40, 0.30, 0.052, 120, "soft echo", "voice echo wave"),
        SfxEvent("effect_chime", "chime", 34.78, 0.34, 0.072, 540, "soft chime", "stronger effect"),
        SfxEvent("launch_whoosh", "air", 35.96, 0.40, 0.080, 460, "short whoosh hit", "final convergence"),
        SfxEvent("launch_hit", "hit", 36.72, 0.58, 0.105, 86, "cinematic hit soft", "final start hit"),
    ]
    return events


def write_wav(path: Path, samples: list[float]) -> None:
    ints = [int(clamp(v, -0.96, 0.96) * 32767) for v in samples]
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes(struct.pack("<" + "h" * len(ints), *ints))


def render(args: argparse.Namespace) -> None:
    audio = Path(args.audio)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    duration = probe_duration(audio)
    total_frames = math.ceil(duration * FPS)
    frame_duration = total_frames / FPS
    envelope = load_envelope(audio, frame_duration)

    events = build_sfx_events()
    sfx_samples = [0.0] * int(frame_duration * SR + SR)
    rng = random.Random(4417)
    for event in events:
        add_event(sfx_samples, event, rng)
    sfx_path = out.with_suffix(".sfx_temp.wav")
    write_wav(sfx_path, sfx_samples[: int(duration * SR)])

    timeline = {
        "duration": duration,
        "fps": FPS,
        "scenes": SCENES,
        "phrase_steps": [{"text": en, "ru": ru, "start": start} for en, ru, start in PHRASE_STEPS],
        "sfx_events": [asdict(event) for event in events],
        "note": "V3 animatic uses varied local temp-SFX. Replace with real sourced Pixabay SFX in final pass.",
    }
    out.with_suffix(".timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2), encoding="utf-8")

    sourcing = {
        "status": "temp_sfx_used_for_animatic",
        "reason": "Pixabay Sound Effects pages are protected by browser/Cloudflare flow in raw HTTP; official Pixabay API covers images/videos, not sound effects.",
        "final_pass_rule": "Replace temp SFX with unique downloaded Pixabay Sound Effects files and record source title, author, URL, duration, local path, license URL.",
        "pixabay_sound_effect_queries": sorted({event.query for event in events}),
        "visual_api_queries_checked": [
            "sound wave abstract",
            "data stream black background",
            "neural network abstract",
            "light trails black background",
            "technology grid dark",
        ],
    }
    out.with_suffix(".sourcing_manifest.json").write_text(json.dumps(sourcing, ensure_ascii=False, indent=2), encoding="utf-8")

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
        str(audio),
        "-i",
        str(sfx_path),
        "-filter_complex",
        "[1:a]volume=1.0[voice];[2:a]volume=0.42[sfx];[voice][sfx]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[a]",
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
        str(out),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    last_scene = ""
    try:
        for frame_idx in range(total_frames):
            t = frame_idx / FPS
            scene = scene_at(t)
            if scene["id"] != last_scene:
                print(f"Rendering {scene['id']} {scene['start']:.2f}-{scene['end']:.2f}", flush=True)
                last_scene = scene["id"]
            frame = draw_frame(t, envelope[min(frame_idx, len(envelope) - 1)])
            proc.stdin.write(frame.tobytes())
    finally:
        proc.stdin.close()
    code = proc.wait()
    if code:
        raise SystemExit(f"ffmpeg failed with exit code {code}")
    print(f"Wrote {out}")
    print(f"Wrote {sfx_path}")
    print(f"Wrote {out.with_suffix('.timeline.json')}")
    print(f"Wrote {out.with_suffix('.sourcing_manifest.json')}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    render(parser.parse_args())


if __name__ == "__main__":
    main()
