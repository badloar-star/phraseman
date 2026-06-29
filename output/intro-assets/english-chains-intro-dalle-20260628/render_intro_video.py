from __future__ import annotations

import argparse
import array
import json
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


WIDTH = 1920
HEIGHT = 1080
FPS = 30


BASE_DURATIONS = [
    2.6,
    2.7,
    2.0,
    2.0,
    1.5,
    1.7,
    1.6,
    1.6,
    1.6,
    1.7,
    2.0,
    1.8,
    1.8,
    1.8,
    2.6,
    2.3,
    1.7,
    1.9,
    1.8,
    1.0,
]


def run_capture(cmd: list[str]) -> str:
    completed = subprocess.run(cmd, check=True, text=True, capture_output=True)
    return completed.stdout.strip()


def probe_duration(audio_path: Path) -> float:
    out = run_capture(
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
    return float(out)


def load_audio_envelope(audio_path: Path, duration: float, fps: int) -> list[float]:
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

    total_frames = math.ceil(duration * fps)
    samples_per_frame = sample_rate / fps
    rms_values: list[float] = []

    for frame in range(total_frames):
        start = int(frame * samples_per_frame)
        end = min(len(samples), int((frame + 1) * samples_per_frame))
        if end <= start:
            rms_values.append(0.0)
            continue
        acc = 0
        for sample in samples[start:end]:
            acc += sample * sample
        rms_values.append(math.sqrt(acc / (end - start)))

    if not rms_values:
        return [0.0] * total_frames

    sorted_values = sorted(rms_values)
    peak = sorted_values[int(len(sorted_values) * 0.92)] or max(rms_values) or 1.0
    envelope = [min(1.0, value / peak) for value in rms_values]

    smoothed: list[float] = []
    prev = 0.0
    for value in envelope:
        prev = prev * 0.78 + value * 0.22
        smoothed.append(prev)
    return smoothed


def ease_out_cubic(x: float) -> float:
    x = clamp(x)
    return 1 - pow(1 - x, 3)


def ease_in_out(x: float) -> float:
    x = clamp(x)
    return x * x * (3 - 2 * x)


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def cover_image(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGB")
    scale = max(WIDTH / img.width, HEIGHT / img.height)
    new_size = (math.ceil(img.width * scale), math.ceil(img.height * scale))
    img = img.resize(new_size, Image.Resampling.LANCZOS)
    left = (img.width - WIDTH) // 2
    top = (img.height - HEIGHT) // 2
    return img.crop((left, top, left + WIDTH, top + HEIGHT))


def build_schedule(duration: float, image_paths: list[Path]) -> list[dict[str, float | int | str]]:
    scale = duration / sum(BASE_DURATIONS)
    schedule = []
    cursor = 0.0
    for index, path in enumerate(image_paths):
        scene_duration = BASE_DURATIONS[index] * scale
        schedule.append(
            {
                "index": index,
                "file": path.name,
                "start": cursor,
                "duration": scene_duration,
                "end": cursor + scene_duration,
            }
        )
        cursor += scene_duration

    drift = duration - float(schedule[-1]["end"])
    schedule[-1]["duration"] = float(schedule[-1]["duration"]) + drift
    schedule[-1]["end"] = duration
    return schedule


def scene_for_time(schedule: list[dict[str, float | int | str]], t: float) -> dict[str, float | int | str]:
    for scene in schedule:
        if float(scene["start"]) <= t < float(scene["end"]):
            return scene
    return schedule[-1]


def transformed_scene(base: Image.Image, index: int, p: float) -> Image.Image:
    drift = math.sin((p + index * 0.17) * math.tau) * 18
    lift = math.cos((p + index * 0.11) * math.tau) * 12
    zoom = 1.018 + 0.042 * ease_in_out(p)
    if index % 4 == 1:
        zoom = 1.055 - 0.035 * ease_in_out(p)
    if index % 4 == 2:
        drift *= -1
        lift *= 0.6

    w = math.ceil(WIDTH * zoom)
    h = math.ceil(HEIGHT * zoom)
    resized = base.resize((w, h), Image.Resampling.BICUBIC)
    left = (w - WIDTH) / 2 + drift
    top = (h - HEIGHT) / 2 + lift
    return resized.crop((round(left), round(top), round(left + WIDTH), round(top + HEIGHT)))


def alpha_mask(p: float, scene_duration: float) -> tuple[Image.Image, float]:
    enter = min(0.42, scene_duration * 0.28)
    exit_time = min(0.35, scene_duration * 0.22)
    alpha = ease_out_cubic(p / max(enter / scene_duration, 0.001))
    alpha *= ease_out_cubic((1 - p) / max(exit_time / scene_duration, 0.001))

    reveal = ease_out_cubic(p / max(enter / scene_duration, 0.001))
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(mask)
    reveal_x = int(WIDTH * reveal)
    draw.rectangle((0, 0, reveal_x, HEIGHT), fill=int(255 * alpha))
    feather = 80
    if 0 < reveal_x < WIDTH:
        for i in range(feather):
            x = reveal_x + i
            if x >= WIDTH:
                break
            value = int(255 * alpha * (1 - i / feather))
            draw.line((x, 0, x, HEIGHT), fill=value)
    if p > 0.20:
        mask = Image.new("L", (WIDTH, HEIGHT), int(255 * alpha))
    return mask, alpha


def draw_overlays(frame: Image.Image, index: int, p: float, audio: float, scene_count: int) -> None:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    pulse = clamp(audio)
    white = int(120 + pulse * 95)
    dim = int(28 + pulse * 32)

    # Bottom progress dots.
    dot_gap = 26
    start_x = WIDTH // 2 - (scene_count - 1) * dot_gap // 2
    y = HEIGHT - 58
    for i in range(scene_count):
        radius = 3 if i != index else 6 + int(pulse * 3)
        a = 48 if i > index else 90
        if i == index:
            a = 175 + int(pulse * 60)
        x = start_x + i * dot_gap
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 255, 255, a))

    # Fast white reveal sweep.
    if p < 0.22:
        x = int(WIDTH * ease_out_cubic(p / 0.22))
        draw.rectangle((x - 3, 0, x + 3, HEIGHT), fill=(255, 255, 255, 110))
        if x > 8:
            draw.rectangle((max(0, x - 80), 0, x - 8, HEIGHT), fill=(255, 255, 255, 18))

    # Audio-reactive center rings.
    cx = WIDTH // 2 + int(math.sin(index * 1.7) * 90)
    cy = HEIGHT // 2 + int(math.cos(index * 1.1) * 52)
    for r_i in range(3):
        rr = int(120 + r_i * 80 + pulse * 42 + 34 * ((p + r_i * 0.21) % 1))
        alpha = int(42 + pulse * 35 - r_i * 8)
        draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(255, 255, 255, max(0, alpha)), width=2)

    # Moving micro-bars and graph lines.
    phase = (p * 2.4 + index * 0.19) % 1
    for lane in range(9):
        yy = int(140 + lane * 92 + math.sin(index + lane) * 18)
        x0 = int((phase * WIDTH + lane * 211 + index * 37) % (WIDTH + 360)) - 180
        length = 44 + (lane * 17 + index * 11) % 130
        draw.line((x0, yy, x0 + length, yy), fill=(255, 255, 255, dim), width=2)
        draw.line((WIDTH - x0, HEIGHT - yy, WIDTH - x0 - length, HEIGHT - yy), fill=(255, 255, 255, dim // 2), width=1)

    # Scene-dependent accent.
    mode = index % 5
    if mode == 0:
        base_y = HEIGHT // 2 + 170
        points = []
        for x in range(80, WIDTH - 80, 24):
            wave = math.sin(x * 0.018 + p * math.tau * 2 + index) * (12 + pulse * 28)
            points.append((x, int(base_y + wave)))
        if len(points) > 1:
            draw.line(points, fill=(255, 255, 255, white), width=2)
    elif mode == 1:
        for k in range(7):
            x = int(260 + k * 225 + math.sin(p * math.tau + k) * 28)
            yy = int(HEIGHT // 2 + 210 + math.cos(p * math.tau + k) * 24)
            draw.ellipse((x - 7, yy - 7, x + 7, yy + 7), outline=(255, 255, 255, white), width=2)
            if k:
                draw.line((x - 225, yy, x, yy), fill=(255, 255, 255, dim + 35), width=1)
    elif mode == 2:
        sweep_y = int(HEIGHT * (0.15 + 0.7 * ((p * 1.3) % 1)))
        draw.line((0, sweep_y, WIDTH, sweep_y), fill=(255, 255, 255, 38 + int(pulse * 42)), width=2)
    elif mode == 3:
        for k in range(6):
            x = int(WIDTH * (0.18 + k * 0.13))
            h = int(40 + 130 * ease_in_out((p + k * 0.08) % 1) + pulse * 55)
            draw.rectangle((x, HEIGHT - 140 - h, x + 16, HEIGHT - 140), fill=(255, 255, 255, 58 + int(pulse * 40)))
    else:
        for k in range(4):
            rr = int(60 + k * 55 + p * 85)
            draw.arc((WIDTH - 340 - rr, 190 - rr, WIDTH - 340 + rr, 190 + rr), 20, 320, fill=(255, 255, 255, white - 35), width=2)

    # Subtle vignette.
    vignette = Image.new("L", (WIDTH, HEIGHT), 0)
    vd = ImageDraw.Draw(vignette)
    vd.rectangle((0, 0, WIDTH, HEIGHT), fill=0)
    vd.ellipse((-240, -220, WIDTH + 240, HEIGHT + 260), fill=180)
    vignette = Image.eval(vignette.filter(ImageFilter.GaussianBlur(60)), lambda v: 180 - v)
    dark = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 95))
    overlay = Image.alpha_composite(overlay, Image.composite(dark, Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0)), vignette))

    frame.alpha_composite(overlay)


def render(args: argparse.Namespace) -> None:
    asset_dir = Path(args.asset_dir)
    audio_path = Path(args.audio)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    image_paths = sorted(asset_dir.glob("*.png"))
    image_paths = [path for path in image_paths if path.name[:2].isdigit()]
    if len(image_paths) != 20:
        raise SystemExit(f"Expected 20 numbered PNG assets, found {len(image_paths)}")

    duration = probe_duration(audio_path)
    total_frames = math.ceil(duration * FPS)
    schedule = build_schedule(total_frames / FPS, image_paths)
    envelope = load_audio_envelope(audio_path, total_frames / FPS, FPS)
    bases = [cover_image(path) for path in image_paths]

    timeline_path = output_path.with_suffix(".timeline.json")
    timeline_path.write_text(json.dumps(schedule, indent=2), encoding="utf-8")

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
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "17",
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
    process = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert process.stdin is not None

    last_scene = -1
    try:
        for frame_index in range(total_frames):
            t = frame_index / FPS
            scene = scene_for_time(schedule, t)
            index = int(scene["index"])
            start = float(scene["start"])
            scene_duration = float(scene["duration"])
            p = clamp((t - start) / max(scene_duration, 0.001))
            if index != last_scene:
                print(f"Rendering scene {index + 1:02d}/20: {scene['file']}", flush=True)
                last_scene = index

            canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
            shot = transformed_scene(bases[index], index, p).convert("RGBA")
            mask, _ = alpha_mask(p, scene_duration)
            canvas.paste(shot, (0, 0), mask)
            draw_overlays(canvas, index, p, envelope[min(frame_index, len(envelope) - 1)], len(image_paths))
            process.stdin.write(canvas.tobytes())
    finally:
        process.stdin.close()

    code = process.wait()
    if code != 0:
        raise SystemExit(f"ffmpeg failed with exit code {code}")

    print(f"Wrote {output_path}")
    print(f"Wrote {timeline_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-dir", required=True)
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    render(parser.parse_args())


if __name__ == "__main__":
    main()
