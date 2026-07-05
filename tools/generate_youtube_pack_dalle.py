#!/usr/bin/env python3
"""Generate YouTube thumbnail pack via OpenAI DALL-E 3 API.

Produces 9 thumbnails (1792x1024, closest to 1280x720 ratio) for
ЦЕПИ ЦЕПИ ЦЕПИ video. Saves to the pack folder.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from openai_dev_guard import require_codex_openai_tts_only

sys.stdout.reconfigure(encoding="utf-8")

require_codex_openai_tts_only(action="YouTube thumbnail DALL-E generation", endpoint="images/generations")
API_KEY = os.environ["OPENAI_API_KEY"]  # Raises KeyError if missing — never hardcode secrets
OUT_DIR = Path("lingman-scenarist-pipeline/youtube_packages/chains_cepi_cepi_20260607_pack/READY_YOUTUBE_PACK/youtube_ready_1280x720")
REJECTED_DIR = Path("lingman-scenarist-pipeline/youtube_packages/chains_cepi_cepi_20260607_pack/READY_YOUTUBE_PACK/rejected_or_drafts")
OUT_DIR.mkdir(parents=True, exist_ok=True)
REJECTED_DIR.mkdir(parents=True, exist_ok=True)

# 9 thumbnails — inspired by real high-click Russian YouTube references
# Formula: FACE + BIG TEXT + ONE OBJECT, max 3 elements, integrated text
THUMBNAILS = [
    {
        "id": "01_97_minut_dark",
        "hook": "97 МИНУТ",
        "style": "dark_cinematic_huge_text",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Dark cinematic background — deep black with subtle blue city lights glow at the bottom edge. "
            "MASSIVE bold white Cyrillic text dominating the top 60% of the frame, reading exactly: «97 МИНУТ». "
            "Below in large bold yellow Cyrillic: «АНГЛИЙСКИХ ЦЕПОЧЕК». "
            "Bottom third: a stylized confident young man, upper body, looking directly at camera with a slight smirk, "
            "modern casual style, dramatic rim lighting. "
            "No flags, no badges, no small icons, no English text anywhere. "
            "Three elements only: huge text, face, dark atmospheric background. "
            "Cinematic depth, strong contrast, professional YouTube education thumbnail."
        ),
    },
    {
        "id": "02_nachni_govorit_face",
        "hook": "НАЧНИ ГОВОРИТЬ ФРАЗАМИ",
        "style": "face_left_text_right",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Clean dark background, slight gradient from black to dark navy. "
            "Left half: expressive young male presenter, upper body, pointing finger directly at the bold text on the right, "
            "surprised-confident expression, casual modern outfit, dramatic studio lighting. "
            "Right half: giant bold Cyrillic text in two lines, white with strong drop shadow: «НАЧНИ» on top, "
            "«ГОВОРИТЬ» below in bright orange-yellow. "
            "Under that in smaller white bold: «ФРАЗАМИ». "
            "No flags, no badges, no icons, no English text. "
            "Only three elements: face with gesture, big text block, dark background. "
            "Mobile-readable at small size, cinematic, professional."
        ),
    },
    {
        "id": "03_100_fraz_red",
        "hook": "100 ФРАЗ ДЛЯ РЕЧИ",
        "style": "red_bold_face",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Vivid red background, bold editorial composition. "
            "Left two-thirds: huge stacked bold white Cyrillic text: «100» in massive numerals top, "
            "then «ФРАЗ» in bold white, then «ДЛЯ ЖИВОЙ» and «РЕЧИ» — all integrated into the red field, "
            "strong black outline on letters. "
            "Right third: real-looking woman presenter, upper body, warm smile, confident, "
            "dark hair, facing slightly left toward the text. "
            "No flags, no icons, no English text anywhere, no small labels. "
            "Three elements: red background, giant text, smiling face. "
            "Style inspired by Butterfly Spanish YouTube thumbnails. Professional, bold, mobile-readable."
        ),
    },
    {
        "id": "04_logika_fraz_night",
        "hook": "ЛОГИКА ФРАЗ",
        "style": "neon_night_city",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Dark night cityscape silhouette at the very bottom — minimal, atmospheric. "
            "Massive glowing Cyrillic letters fill the entire frame like a typographic poster: "
            "«ЛОГИКА» on top in white with subtle blue electric glow, "
            "«ФРАЗ» below in even bigger letters with warm orange glow. "
            "A stylized male figure in silhouette stands confidently in front of the letters, center frame, "
            "arms slightly out — scale makes him look small against the giant text. "
            "Deep dark background, cinematic fog/light rays. "
            "No flags, no badges, no icons, no English text. "
            "Inspired by «ЛОГИКА АНГЛИЙСКОГО» night city thumbnail style. Dramatic, bold, memorable."
        ),
    },
    {
        "id": "05_soberay_frazy_chain",
        "hook": "СОБИРАЙ ФРАЗЫ",
        "style": "dark_chain_object",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Very dark charcoal background with subtle texture. "
            "Center-left: young male presenter, chest-up, intense focused expression, looking at camera, "
            "one hand raised as if building something, dramatic side lighting. "
            "Right side: bold white Cyrillic stacked text integrated into dark background: «СОБИРАЙ» large on top, "
            "«ФРАЗЫ» even larger below in bright teal/cyan color with glow. "
            "Small visual element: a simple glowing chain icon near the text — minimal, not cluttered. "
            "No flags, no badges, no English text. Three elements: face, big text, one chain accent. "
            "Cinematic, high contrast, professional YouTube thumbnail."
        ),
    },
    {
        "id": "06_ne_uchi_slova",
        "hook": "НЕ УЧИ СЛОВА",
        "style": "shock_warning_dark",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Dark background with bold red accent stripe or glow. "
            "Giant bold Cyrillic text dominating most of the frame: «НЕ УЧИ» in huge white letters top half, "
            "«СЛОВА» in massive red letters below — dramatic forbidden/warning energy. "
            "Bottom right: male presenter face, upper body, shocked or warning expression, "
            "index finger raised in a 'wait/stop' gesture, looking directly at viewer. "
            "No flags, no icons, no English text, no clutter. "
            "Three elements: huge warning text, face with gesture, dark red-accent background. "
            "High contrast, emotionally direct, mobile-readable, professional YouTube education style."
        ),
    },
    {
        "id": "07_5_minut_podcast",
        "hook": "5 МИНУТ В ДЕНЬ",
        "style": "podcast_illustration_warm",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Warm cozy background — soft yellow-orange gradient like a podcast studio. "
            "Left side: illustrated or stylized female character, friendly and expressive, "
            "wearing headphones, slight smile, animated style similar to modern YouTube education channels. "
            "Right side: bold stacked Cyrillic text: «5 МИНУТ» in very large black bold letters, "
            "«В ДЕНЬ» below in same style, then smaller «МЕНЯЕТ ВСЁ» in dark grey. "
            "Clean, warm, friendly energy. No flags, no icons, no English text. "
            "Three elements: illustrated character, bold text, warm background. "
            "Style inspired by 'Just 5 Minutes a Day' English Easy Practice thumbnail. "
            "Professional, warm, inviting, mobile-readable."
        ),
    },
    {
        "id": "08_govori_seychas",
        "hook": "ГОВОРИ СЕЙЧАС",
        "style": "green_result_promise",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Bold split composition: left half deep dark background, right half bright emerald green. "
            "Left side dark: young man, upper body, slightly slumped/uncertain expression — 'before' energy. "
            "Right side green: same man or mirrored figure, confident posture, arms open, big smile — 'after' energy. "
            "Center dividing line with bold white Cyrillic arrow text: «→» and «ГОВОРИ» in massive letters. "
            "Bottom of green side: «СЕЙЧАС» in large bold white. "
            "No flags, no small icons, no English text. "
            "Three elements: before/after split faces, giant arrow text, two-color background. "
            "Transformation hook, dramatic, high contrast, professional."
        ),
    },
    {
        "id": "09_kak_sobrat_frazu",
        "hook": "КАК СОБРАТЬ ФРАЗУ",
        "style": "curiosity_pointing",
        "prompt": (
            "Premium high-retention YouTube thumbnail, 1792x1024. "
            "Clean dark blue-black background, editorial composition. "
            "Large confident male presenter, upper body, pointing upward dramatically with one finger "
            "toward the text, eyebrows raised in a 'I'll show you' expression, direct eye contact. "
            "Above/beside him: bold Cyrillic text in two lines: «КАК СОБРАТЬ» in large white bold, "
            "«ФРАЗУ» in even bigger bright yellow-orange bold below. "
            "Strong dramatic lighting on face, dark background with very subtle gradient. "
            "No flags, no badges, no icons, no English text, no clutter. "
            "Three elements: expressive pointing face, big curiosity-hook text, dark background. "
            "Mobile-readable at small size, professional YouTube education thumbnail, high click-through energy."
        ),
    },
]


def generate_image(prompt: str, filename: str) -> bool:
    payload = json.dumps({
        "model": "gpt-image-1",
        "prompt": prompt,
        "n": 1,
        "size": "1536x1024",
        "quality": "high",
        "output_format": "png",
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read())
                item = data["data"][0]
                if "b64_json" in item:
                    img_bytes = base64.b64decode(item["b64_json"])
                else:
                    img_url = item["url"]
                    with urllib.request.urlopen(img_url, timeout=60) as img_resp:
                        img_bytes = img_resp.read()
                out_path = OUT_DIR / filename
                out_path.write_bytes(img_bytes)
                print(f"  Saved: {filename} ({len(img_bytes)//1024}KB)", flush=True)
                return True
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            print(f"  HTTP {e.code}: {body[:200]}", flush=True)
            if e.code == 429:
                time.sleep(20)
            elif attempt < 2:
                time.sleep(5)
            else:
                return False
        except Exception as ex:
            print(f"  Error attempt {attempt+1}: {ex}", flush=True)
            if attempt < 2:
                time.sleep(5)
            else:
                return False
    return False


def main() -> None:
    print(f"Generating {len(THUMBNAILS)} thumbnails via DALL-E 3...", flush=True)
    failed = []

    for i, t in enumerate(THUMBNAILS):
        filename = f"{t['id']}.png"
        out_path = OUT_DIR / filename
        if out_path.exists():
            print(f"  SKIP (exists): {filename}", flush=True)
            continue

        print(f"\n[{i+1}/{len(THUMBNAILS)}] {t['id']} — hook: {t['hook']}", flush=True)
        ok = generate_image(t["prompt"], filename)
        if not ok:
            failed.append(t["id"])
        # Rate limit: max 5 images/min on DALL-E 3
        if i < len(THUMBNAILS) - 1:
            time.sleep(13)

    print(f"\n{'='*50}", flush=True)
    print(f"Done. Generated: {len(THUMBNAILS) - len(failed)}/{len(THUMBNAILS)}", flush=True)
    if failed:
        print(f"Failed: {failed}", flush=True)
    print(f"Output: {OUT_DIR.resolve()}", flush=True)


if __name__ == "__main__":
    main()
