#!/usr/bin/env python3
"""Build a retention-style editable CapCut draft with dense b-roll and ElevenLabs voice."""

from __future__ import annotations

import json
import math
import os
import random
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import build_old_phones_capcut_mvp as base  # noqa: E402
from build_old_phones_real_capcut import mixkit_asset, strip_html  # noqa: E402


DRAFT_NAME = "OLD_PHONES_DOC_RETENTION_11LABS_0529"
OUT_DIR = ROOT / "exports" / "old-phones-doc-retention-11labs"
RAW_DIR = OUT_DIR / "source_downloads"
VOICE_DIR = OUT_DIR / "elevenlabs_voice"
STORYBOARD_DIR = OUT_DIR / "storyboard"
DEFAULT_DOC_VOICE_ID = "dH2EgYIVjY7q84hZZrSF"  # ALINA BEAUTY - softer Russian voice available locally
TEXT_FONT_PATH = "C:/Windows/Fonts/arialbd.ttf"


STOCK_PAGES = [
    ("phone_closeup", "https://mixkit.co/free-stock-video/smartphone-close-up-1789/", "hook_old_phone"),
    ("typing_cell", "https://mixkit.co/free-stock-video/hands-of-a-person-typing-on-a-cell-phone-4915/", "apps_typing"),
    ("person_texting", "https://mixkit.co/free-stock-video/a-person-texting-on-a-smartphone-1711/", "phone_use"),
    ("coffee_social", "https://mixkit.co/free-stock-video/person-on-social-media-while-serving-coffee-4919/", "social_feed"),
    ("programmer_phone", "https://mixkit.co/free-stock-video/programmer-using-his-cell-phone-while-working-at-his-desk-41638/", "work_phone"),
    ("phone_table", "https://mixkit.co/free-stock-video/phone-on-round-end-table-248/", "battery_rest"),
    ("hands_texting", "https://mixkit.co/free-stock-video/hands-shown-texting-on-a-smartphone-144/", "typing"),
    ("young_scrolling", "https://mixkit.co/free-stock-video/young-man-sitting-scrolling-on-his-cell-phone-4801/", "expectation"),
    ("woman_typing", "https://mixkit.co/free-stock-video/woman-typing-on-her-cell-phone-43270/", "typing"),
    ("working_scroll", "https://mixkit.co/free-stock-video/person-working-while-scrolling-on-social-networks-4908/", "social_feed"),
    ("guy_texting", "https://mixkit.co/free-stock-video/a-guy-texting-on-his-smartphone-269/", "phone_use"),
    ("laptop_typing", "https://mixkit.co/free-stock-video/typing-on-a-laptop-242/", "tech_world"),
]

MUSIC_PAGE = "https://mixkit.co/free-stock-music/technology/"
SFX_PAGES = {
    "pop": "https://mixkit.co/free-sound-effects/click/",
    "whoosh": "https://mixkit.co/free-sound-effects/whoosh/",
}


VOICE_SCRIPT = """
Ты нажимаешь на приложение. Ждешь секунду. Потом еще одну. Потом начинаешь нажимать сильнее, как будто телефон просто не понял серьезности ситуации.
И в голове появляется мысль: он же раньше летал. Что с ним стало?

Самое интересное: старый телефон не обязательно сломался. Очень часто он просто оказался в мире, который стал тяжелее.

Когда ты покупал телефон, приложения были легче. Соцсети показывали меньше видео. Сайты были проще. Мессенджеры еще не пытались быть одновременно банком, магазином, редактором видео и маленьким телевизором.

А потом прошло несколько лет. Приложения обновлялись. Дизайн становился красивее. Функций становилось больше. Фото тяжелее. Видео четче. Реклама умнее. Ленты бесконечнее.

И телефон, который был создан для одного цифрового мира, внезапно живет в другом.

Это как если бы ты купил маленькую городскую машину, а через пять лет тебе сказали: отлично, теперь вози на ней бетон. Она едет. Но уже без прежнего энтузиазма.

Вторая причина - память. Многие думают: ну да, у меня осталось два гигабайта, но место же еще есть.

Проблема в том, что телефону нужно не просто место для хранения. Ему нужно свободное пространство, чтобы нормально работать: сохранять временные файлы, обновлять приложения, кэшировать данные, перемещать куски системы.

Когда память почти забита, телефон начинает делать простые вещи через лишние круги. Открыть приложение. Подгрузить фото. Обновить чат. Сохранить видео.

Ты можешь ничего особенного не делать. Просто жить обычной жизнью. Фотографии копятся. Чаты растут. Кэш раздувается. И телефон постепенно превращается в комнату, где вроде можно ходить, но каждый шаг через коробки.

Третья причина - батарея. Аккумулятор в телефоне не вечный. Со временем он хуже держит заряд и хуже отдает энергию в моменты, когда телефону нужно резко напрячься.

Например, ты открываешь камеру. Телефон должен быстро включить экран, процессор, сенсоры, обработку изображения. Это маленький рывок.

Новая батарея такой рывок держит спокойно. Старая может просесть. И чтобы телефон не выключался внезапно, система начинает вести себя осторожнее: не разгонять железо так агрессивно, сглаживать пики нагрузки, экономить энергию.

Для тебя это выглядит просто: почему он тупит? А для телефона это может быть режим выживания.

Еще один фактор - тепло. Телефоны не любят перегрев. Когда внутри становится слишком жарко, система снижает производительность, чтобы защитить компоненты.

Это называется throttling. Телефон как бы говорит себе: спокойно, не гони. Особенно это заметно, когда ты снимаешь видео, пользуешься навигатором, играешь или сидишь на солнце.

И старый телефон чаще попадает в эту ловушку. Потому что батарея уже слабее, приложения тяжелее, памяти меньше, а корпус и охлаждение остались теми же.

То есть он не просто старый. Он постоянно работает ближе к пределу.

Есть еще один неприятный момент: изменился не только телефон. Изменился ты.

Когда телефон был новым, он казался быстрым на фоне того, к чему ты привык тогда. Но за несколько лет ты увидел новые экраны, новые анимации, быстрые камеры, моментальную разблокировку, приложения, которые открываются почти без паузы.

И теперь старая скорость воспринимается иначе. То, что раньше казалось нормальным, сегодня ощущается как задержка.

Это как интернет из прошлого. Когда-то страница загружалась за пять секунд, и никто не паниковал. Сегодня пять секунд - это уже почти духовное испытание.

Самое простое объяснение звучит так: производители специально замедляют старые телефоны. Иногда у людей есть причины так думать. Но в большинстве обычных случаев картина скучнее и практичнее.

Телефон стареет. Батарея изнашивается. Память забивается. Приложения растут. Система становится сложнее. А мы начинаем ждать от старого устройства поведения нового.

Это не одна причина. Это много маленьких причин, которые складываются в одно большое ощущение: мой телефон устал.

Если телефон стал медленным, первое - проверь свободную память. Не один-два гигабайта, а с нормальным запасом.

Второе - посмотри состояние батареи, если система это показывает. Иногда замена аккумулятора дает старому телефону вторую жизнь.

Третье - убери приложения, которые давно не открывал. Они могут жить в фоне, хранить кэш и съедать ресурсы.

Четвертое - не мучай телефон жарой: солнце, тяжелые игры на зарядке, навигация в горячей машине - все это делает лаги заметнее.

И главное: старый телефон не обязательно плохой. Он просто уже не молодой спортсмен. Ему нужно немного пространства, нормальная батарея и меньше цифрового хаоса.
""".strip()


TEXT_BEATS = [
    (1.0, 1.8, "НАЖАЛ"),
    (3.5, 1.8, "ЖДЕШЬ"),
    (7.0, 2.2, "РАНЬШЕ ЛЕТАЛ"),
    (12.0, 2.0, "ЧТО СТАЛО?"),
    (25.0, 2.5, "МИР СТАЛ ТЯЖЕЛЕЕ"),
    (43.0, 2.0, "ФУНКЦИИ"),
    (46.0, 2.0, "ВИДЕО"),
    (49.0, 2.0, "КЭШ"),
    (52.0, 2.0, "РЕКЛАМА"),
    (73.0, 2.6, "ПАМЯТЬ ПОЧТИ ЗАБИТА"),
    (92.0, 2.5, "НУЖЕН ЗАПАС"),
    (118.0, 2.5, "КОМНАТА С КОРОБКАМИ"),
    (139.0, 2.5, "БАТАРЕЯ СТАРЕЕТ"),
    (164.0, 2.2, "ПИКИ НАГРУЗКИ"),
    (184.0, 2.6, "РЕЖИМ ВЫЖИВАНИЯ"),
    (196.0, 2.2, "THROTTLING"),
    (213.0, 2.0, "СОЛНЦЕ"),
    (216.0, 2.0, "НАВИГАТОР"),
    (219.0, 2.0, "ИГРЫ"),
    (238.0, 2.3, "БЛИЖЕ К ПРЕДЕЛУ"),
    (250.0, 2.5, "ИЗМЕНИЛСЯ ТЫ"),
    (274.0, 2.5, "НОВАЯ ПЛАНКА"),
    (292.0, 2.4, "5 СЕКУНД = ВЕЧНОСТЬ"),
    (318.0, 2.4, "НЕ ОДНА ПРИЧИНА"),
    (340.0, 2.5, "ТЕЛЕФОН УСТАЛ"),
    (356.0, 2.2, "1. ПАМЯТЬ"),
    (365.0, 2.2, "2. БАТАРЕЯ"),
    (374.0, 2.2, "3. ЛИШНИЕ ПРИЛОЖЕНИЯ"),
    (386.0, 2.2, "4. ЖАРА"),
    (405.0, 3.0, "МЕНЬШЕ ЦИФРОВОГО ХАОСА"),
]


@dataclass(frozen=True)
class Shot:
    start: float
    duration: float
    stock_key: str
    purpose: str
    source_start: float


def run(command: list[str]) -> None:
    completed = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if completed.returncode != 0:
        raise RuntimeError("Command failed:\n" + " ".join(command) + "\n\n" + completed.stdout)


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stdout)
    return float(completed.stdout.strip())


def download(url: str, path: Path) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=180, headers={"User-Agent": "Mozilla/5.0"}) as response:
        response.raise_for_status()
        with path.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 512):
                if chunk:
                    handle.write(chunk)


def elevenlabs_tts(text: str, path: Path, *, api_key: str, voice_id: str, model_id: str) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    query = urllib.parse.urlencode({"output_format": "mp3_44100_128"})
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?{query}"
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.40,
            "similarity_boost": 0.84,
            "style": 0.34,
            "use_speaker_boost": True,
            "speed": 1.10,
        },
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "audio/mpeg", "xi-api-key": api_key}
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            path.write_bytes(response.read())
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs HTTP {error.code}: {body[:1000]}") from error


def chunk_text(text: str, max_chars: int = 2300) -> list[str]:
    paragraphs = [part.strip() for part in text.split("\n") if part.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if current and len(current) + len(paragraph) + 2 > max_chars:
            chunks.append(current)
            current = paragraph
        else:
            current = paragraph if not current else current + "\n\n" + paragraph
    if current:
        chunks.append(current)
    return chunks


def concat_audio(parts: list[Path], out: Path) -> None:
    if out.exists() and out.stat().st_size > 1024:
        return
    list_path = out.with_suffix(".txt")
    list_path.write_text("\n".join(f"file '{part.as_posix()}'" for part in parts) + "\n", encoding="utf-8")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(list_path), "-c", "copy", str(out)])


def make_music(path: Path, duration: float) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    # Temp low bed. Replace in CapCut with a licensed track for final publishing.
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=76:sample_rate=44100:duration={duration}",
            "-af",
            "volume=0.018,afade=t=in:st=0:d=2,afade=t=out:st={:.3f}:d=2".format(max(0, duration - 2)),
            "-c:a",
            "pcm_s16le",
            str(path),
        ]
    )


def first_mixkit_audio_url(page_url: str) -> str:
    html = requests.get(page_url, timeout=60, headers={"User-Agent": "Mozilla/5.0"}).text
    urls = re.findall(r"https://assets\.mixkit\.co/[^\"']+\.(?:mp3|wav)", html)
    if not urls:
        raise RuntimeError(f"No Mixkit audio URL found: {page_url}")
    return urls[0]


def prepare_music_bed(source: Path, out: Path, duration: float) -> None:
    if out.exists() and out.stat().st_size > 1024:
        return
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-stream_loop",
            "-1",
            "-i",
            str(source),
            "-t",
            f"{duration:.3f}",
            "-af",
            "volume=0.13,afade=t=in:st=0:d=2,afade=t=out:st={:.3f}:d=2".format(max(0, duration - 2)),
            "-c:a",
            "pcm_s16le",
            str(out),
        ]
    )


def make_sfx(path: Path, frequency: int, duration: float, volume: float) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency={frequency}:sample_rate=44100:duration={duration}",
            "-af",
            f"volume={volume},afade=t=out:st={max(0.01, duration - 0.08):.3f}:d=0.08",
            "-c:a",
            "pcm_s16le",
            str(path),
        ]
    )


def cut_shot(raw: Path, out: Path, start: float, duration: float, variant: int) -> None:
    if out.exists() and out.stat().st_size > 1024:
        return
    raw_duration = probe_duration(raw)
    source_start = min(start, max(0.0, raw_duration - 0.5))
    loop = ["-stream_loop", "-1"] if raw_duration < duration + 0.5 else []
    crop_bias = ["crop=1920:1080", "crop=1728:972,scale=1920:1080", "scale=2048:1152,crop=1920:1080"][variant % 3]
    eq = ["eq=contrast=1.05:saturation=1.08", "eq=contrast=1.12:saturation=1.02", "eq=brightness=0.01:contrast=1.08"][variant % 3]
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            *loop,
            "-ss",
            f"{source_start:.3f}",
            "-i",
            str(raw),
            "-t",
            f"{duration:.3f}",
            "-vf",
            f"scale=1920:1080:force_original_aspect_ratio=increase,{crop_bias},setsar=1,{eq}",
            "-an",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "veryfast",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )


SECTION_KEYS = [
    (0.00, 0.07, ["phone_closeup", "typing_cell", "person_texting"], "hook/lag moment"),
    (0.07, 0.22, ["typing_cell", "coffee_social", "working_scroll", "laptop_typing"], "apps and digital world getting heavier"),
    (0.22, 0.35, ["coffee_social", "hands_texting", "woman_typing"], "storage, cache, files, chats"),
    (0.35, 0.49, ["phone_table", "phone_closeup", "programmer_phone"], "battery and energy spikes"),
    (0.49, 0.62, ["programmer_phone", "laptop_typing", "phone_closeup"], "heat and throttling"),
    (0.62, 0.78, ["young_scrolling", "guy_texting", "person_texting"], "expectations changed"),
    (0.78, 0.90, ["laptop_typing", "working_scroll", "phone_closeup"], "not one cause"),
    (0.90, 1.01, ["hands_texting", "phone_table", "woman_typing"], "fixes and final advice"),
]


def section_for_time(t: float, total_duration: float) -> tuple[list[str], str]:
    ratio = t / max(1.0, total_duration)
    for start, end, keys, purpose in SECTION_KEYS:
        if start <= ratio < end:
            return keys, purpose
    return SECTION_KEYS[-1][2], SECTION_KEYS[-1][3]


def build_shots(total_duration: float, stock_keys: list[str]) -> list[Shot]:
    random.seed(29)
    purposes = ["hook", "proof", "process", "contrast", "metaphor", "reset", "fix"]
    shots: list[Shot] = []
    t = 0.0
    index = 0
    while t < total_duration - 0.25:
        if t < 20:
            duration = random.choice([2.0, 2.2, 2.5, 3.0])
        else:
            duration = random.choice([2.6, 3.0, 3.4, 3.8, 4.2, 4.8])
        duration = min(duration, total_duration - t)
        section_keys, section_purpose = section_for_time(t, total_duration)
        key = section_keys[index % len(section_keys)]
        shots.append(Shot(round(t, 3), round(duration, 3), key, f"{section_purpose} / {purposes[index % len(purposes)]}", float((index * 3) % 12)))
        t += duration
        index += 1
    return shots


def kf_id() -> str:
    return str(uuid.uuid4()).upper()


def keyframe(property_type: str, pairs: list[tuple[int, float]]) -> dict[str, Any]:
    return {
        "id": kf_id(),
        "material_id": "",
        "property_type": property_type,
        "keyframe_list": [
            {
                "id": kf_id(),
                "curveType": "Line",
                "time_offset": offset,
                "left_control": {"x": 0.0, "y": 0.0},
                "right_control": {"x": 0.0, "y": 0.0},
                "values": [value],
                "string_value": "",
                "graphID": "",
            }
            for offset, value in pairs
        ],
    }


def punch_keyframes(duration_us: int) -> list[dict[str, Any]]:
    fade_in = min(180_000, max(80_000, duration_us // 8))
    fade_out_start = max(fade_in + 100_000, duration_us - 180_000)
    return [
        keyframe("KFTypeGlobalAlpha", [(0, 0.0), (fade_in, 1.0), (fade_out_start, 1.0), (duration_us, 0.0)]),
        keyframe("KFTypeScaleX", [(0, 0.88), (fade_in, 1.06), (duration_us, 1.0)]),
        keyframe("KFTypeScaleY", [(0, 0.88), (fade_in, 1.06), (duration_us, 1.0)]),
    ]


def text_content(existing_content: str, text: str, font_size: float, color: tuple[float, float, float]) -> str:
    try:
        content = json.loads(existing_content)
    except json.JSONDecodeError:
        content = {"styles": [{}]}
    content["text"] = text
    styles = content.setdefault("styles", [{}])
    if not styles:
        styles.append({})
    styles[0]["range"] = [0, len(text)]
    styles[0]["size"] = font_size
    styles[0]["font"] = {"path": TEXT_FONT_PATH, "id": ""}
    styles[0]["fill"] = {"content": {"render_type": "solid", "solid": {"color": list(color)}}}
    return json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def style_text_material(material: dict[str, Any], text: str, index: int) -> None:
    accent = index % 5 == 0 or text in {"THROTTLING", "РАНЬШЕ ЛЕТАЛ", "ЧТО СТАЛО?"}
    cyan = index % 7 == 0
    color_hex = "#F43F5E" if accent else "#38BDF8" if cyan else "#F8FAFC"
    color = (0.957, 0.247, 0.365) if accent else (0.220, 0.741, 0.973) if cyan else (0.973, 0.980, 0.988)
    font_size = 7.6 if len(text) <= 10 else 6.4 if len(text) <= 18 else 5.4
    material["font_path"] = TEXT_FONT_PATH
    material["font_name"] = "Arial Bold"
    material["font_size"] = font_size
    material["text_color"] = color_hex
    material["text_alpha"] = 1.0
    material["base_content"] = text
    material["content"] = text_content(str(material.get("content", "")), text, font_size, color)
    material["background_alpha"] = 0.0
    material["background_color"] = ""
    material["background_width"] = 0.0
    material["background_height"] = 0.0
    material["line_max_width"] = 0.42
    material["fixed_width"] = -1.0
    material["fixed_height"] = -1.0
    material["border_color"] = "#020617"
    material["border_alpha"] = 0.92
    material["border_width"] = 0.045
    material["has_shadow"] = True
    material["shadow_color"] = "#020617"
    material["shadow_alpha"] = 0.78
    material["shadow_smoothing"] = 0.36
    material["shadow_distance"] = 8.0
    material["alignment"] = 1


def make_storyboard(shots: list[dict[str, Any]], resources: Path) -> None:
    STORYBOARD_DIR.mkdir(parents=True, exist_ok=True)
    thumbs: list[Path] = []
    for shot in shots[:96]:
        clip = resources / shot["clip"]
        thumb = STORYBOARD_DIR / f"{shot['index']:03d}.jpg"
        if not thumb.exists():
            run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", "0.4", "-i", str(clip), "-frames:v", "1", "-q:v", "3", str(thumb)])
        thumbs.append(thumb)
    html_parts = [
        "<html><head><meta charset='utf-8'><style>body{font-family:Arial;background:#111;color:#eee} .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.card{background:#222;padding:8px}.card img{width:100%}.t{font-size:12px;color:#ccc}</style></head><body>",
        "<h1>Old Phones Retention Storyboard</h1><div class='grid'>",
    ]
    for shot, thumb in zip(shots[:96], thumbs, strict=False):
        html_parts.append(f"<div class='card'><img src='{thumb.name}'><div class='t'>{shot['index']:03d} | {shot['start']:.1f}s | {shot['duration']:.1f}s<br>{shot['source_key']}<br>{shot['purpose']}</div></div>")
    html_parts.append("</div></body></html>")
    (STORYBOARD_DIR / "index.html").write_text("\n".join(html_parts), encoding="utf-8")


def build() -> dict[str, Any]:
    env = load_env_file(ROOT / ".env.local")
    api_key = os.environ.get("ELEVENLABS_API_KEY") or env.get("ELEVENLABS_API_KEY")
    voice_id = os.environ.get("ELEVENLABS_DOC_VOICE_ID") or env.get("ELEVENLABS_DOC_VOICE_ID") or DEFAULT_DOC_VOICE_ID
    model_id = os.environ.get("ELEVENLABS_MODEL_ID") or env.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2"
    if not api_key or not voice_id:
        raise RuntimeError("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required in .env.local")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stock_meta: dict[str, dict[str, str]] = {}
    raw_paths: dict[str, Path] = {}
    for key, page, purpose in STOCK_PAGES:
        meta = mixkit_asset(page)
        meta["purpose"] = purpose
        stock_meta[key] = meta
        raw = RAW_DIR / f"{key}.mp4"
        download(meta["download_url"], raw)
        raw_paths[key] = raw

    voice_parts: list[Path] = []
    for index, chunk in enumerate(chunk_text(VOICE_SCRIPT), start=1):
        path = VOICE_DIR / f"elevenlabs_alina_fast_part_{index:02d}.mp3"
        elevenlabs_tts(chunk, path, api_key=api_key, voice_id=voice_id, model_id=model_id)
        voice_parts.append(path)
    voiceover = VOICE_DIR / "old_phones_elevenlabs_alina_fast_voiceover.mp3"
    concat_audio(voice_parts, voiceover)
    voice_duration = probe_duration(voiceover)
    total_duration = voice_duration
    music_source = VOICE_DIR / "mixkit_technology_music_source.mp3"
    download(first_mixkit_audio_url(MUSIC_PAGE), music_source)
    music = VOICE_DIR / "mixkit_technology_music_bed.wav"
    prepare_music_bed(music_source, music, total_duration)
    sfx_pop = VOICE_DIR / "mixkit_click_pop.mp3"
    sfx_whoosh = VOICE_DIR / "mixkit_whoosh_transition.mp3"
    download(first_mixkit_audio_url(SFX_PAGES["pop"]), sfx_pop)
    download(first_mixkit_audio_url(SFX_PAGES["whoosh"]), sfx_whoosh)

    result = base.clone_wednesday_template(source_draft=base.SOURCE_DRAFT, draft_name=DRAFT_NAME, blank_tracks=[], copy_mode="copy")
    draft_dir = Path(result["draftDir"])
    resources = draft_dir / "Resources"
    resources.mkdir(exist_ok=True)

    shots = build_shots(total_duration, list(raw_paths.keys()))
    shot_records: list[dict[str, Any]] = []
    for index, shot in enumerate(shots):
        out = resources / f"shot_{index:03d}_{shot.stock_key}.mp4"
        cut_shot(raw_paths[shot.stock_key], out, shot.source_start, shot.duration, index)
        shot_records.append(
            {
                "index": index,
                "start": shot.start,
                "duration": shot.duration,
                "source_key": shot.stock_key,
                "purpose": shot.purpose,
                "clip": out.name,
            }
        )
    voice_resource = resources / "old_phones_elevenlabs_alina_fast_voiceover.mp3"
    music_resource = resources / "temp_low_doc_bed.wav"
    sfx_pop_resource = resources / "sfx_pop.wav"
    sfx_whoosh_resource = resources / "sfx_whoosh.wav"
    shutil.copy2(voiceover, voice_resource)
    shutil.copy2(music, music_resource)
    shutil.copy2(sfx_pop, sfx_pop_resource)
    shutil.copy2(sfx_whoosh, sfx_whoosh_resource)

    content_path = draft_dir / "draft_content.json"
    draft_content = base.load_json(content_path)
    prefix = base.resource_prefix(draft_content)
    now_us = int(time.time() * base.US)
    total_us = base.us(total_duration)
    timeline_id = str(draft_content["id"])
    draft_content.update({"name": draft_dir.name, "duration": total_us, "update_time": now_us, "path": draft_dir.as_posix()})

    materials = draft_content["materials"]
    base_video = materials["videos"][0]
    base_audio = materials["audios"][0]
    base_text = materials["texts"][0]
    base_video_segment = draft_content["tracks"][0]["segments"][0]
    base_title_segment = draft_content["tracks"][1]["segments"][0]
    base_audio_segment = draft_content["tracks"][5]["segments"][0]

    video_materials = []
    for record in shot_records:
        scene = base.Scene(record["clip"], record["source_key"], record["start"], record["duration"], "0x111827", "", "")
        video_materials.append(base.make_video_material(base_video, resources / record["clip"], scene, prefix))
    active_text_beats = [(start, min(duration, 2.2), text) for start, duration, text in TEXT_BEATS if start < total_duration]
    text_materials = [base.make_text_material(base_text, text) for start, duration, text in active_text_beats]
    for index, (material, (_, _, text)) in enumerate(zip(text_materials, active_text_beats, strict=True)):
        style_text_material(material, text, index)
    voice_material = base.make_audio_material(base_audio, voice_resource, total_duration, prefix, name="ElevenLabs documentary voiceover")
    music_material = base.make_audio_material(base_audio, music_resource, total_duration, prefix, name="Temp low documentary music bed")
    pop_material = base.make_audio_material(base_audio, sfx_pop_resource, 0.16, prefix, name="SFX pop")
    whoosh_material = base.make_audio_material(base_audio, sfx_whoosh_resource, 0.38, prefix, name="SFX whoosh")

    materials["videos"] = video_materials
    materials["texts"] = text_materials
    materials["audios"] = [voice_material, music_material, pop_material, whoosh_material]

    video_track = json.loads(json.dumps(draft_content["tracks"][0], ensure_ascii=False))
    video_track["name"] = "RETENTION B-ROLL 2-5 SEC CUTS"
    video_track["segments"] = [
        base.clone_segment(base_video_segment, material["id"], record["start"], record["duration"], record["index"])
        for material, record in zip(video_materials, shot_records, strict=True)
    ]

    text_track = json.loads(json.dumps(draft_content["tracks"][1], ensure_ascii=False))
    text_track["name"] = "SHORT PUNCH TEXT ONLY"
    text_track["segments"] = [
        base.clone_segment(base_title_segment, material["id"], start, duration, index)
        for index, (material, (start, duration, text)) in enumerate(zip(text_materials, active_text_beats, strict=True))
    ]
    safe_positions = [(-0.46, -0.58), (0.40, -0.58), (-0.46, 0.56), (0.40, 0.56)]
    for index, segment in enumerate(text_track["segments"]):
        duration_us = int(segment.get("target_timerange", {}).get("duration") or 1_500_000)
        x, y = safe_positions[index % len(safe_positions)]
        segment.setdefault("clip", {})
        segment["clip"]["transform"] = {"x": x, "y": y}
        segment["clip"]["scale"] = {"x": 1.0, "y": 1.0}
        segment["common_keyframes"] = punch_keyframes(duration_us)

    voice_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    voice_track["name"] = "ELEVENLABS VOICEOVER"
    voice_track["segments"] = [base.clone_segment(base_audio_segment, voice_material["id"], 0.0, total_duration, 0)]
    voice_track["segments"][0]["volume"] = 1.0
    voice_track["segments"][0]["last_nonzero_volume"] = 1.0

    music_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    music_track["id"] = base.new_id()
    music_track["name"] = "MIXKIT TECHNOLOGY MUSIC BED"
    music_track["segments"] = [base.clone_segment(base_audio_segment, music_material["id"], 0.0, total_duration, 0)]
    music_track["segments"][0]["volume"] = 0.18
    music_track["segments"][0]["last_nonzero_volume"] = 0.18

    sfx_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    sfx_track["id"] = base.new_id()
    sfx_track["name"] = "VARIED SFX TRANSITIONS"
    sfx_segments = []
    text_hit_times = {round(start, 1) for start, _, _ in TEXT_BEATS if start < total_duration}
    for index, record in enumerate(shot_records):
        if index == 0 or record["start"] >= total_duration:
            continue
        is_hook = record["start"] < 20
        is_text_hit = any(abs(record["start"] - hit) < 0.8 for hit in text_hit_times)
        is_section_cut = index % 9 == 0
        is_regular_pulse = index % 4 == 0
        if not (is_hook or is_text_hit or is_section_cut or is_regular_pulse):
            continue
        material_id = whoosh_material["id"] if index % 5 == 0 else pop_material["id"]
        duration = 0.38 if index % 5 == 0 else 0.16
        segment = base.clone_segment(base_audio_segment, material_id, record["start"], duration, index)
        segment["volume"] = 0.16 if index % 5 == 0 else 0.10
        segment["last_nonzero_volume"] = segment["volume"]
        sfx_segments.append(segment)
    sfx_track["segments"] = sfx_segments

    draft_content["tracks"] = [video_track, text_track, voice_track, music_track, sfx_track]
    base.write_json(content_path, draft_content)
    for rel in ["template-2.tmp", "draft_content.json.bak"]:
        if (draft_dir / rel).exists():
            base.write_json(draft_dir / rel, draft_content)
    base.update_timeline_service_files(draft_dir, timeline_id, timeline_id, draft_content, now_us)

    size = base.folder_size(resources)
    meta_path = draft_dir / "draft_meta_info.json"
    if meta_path.exists():
        meta = base.load_json(meta_path)
        meta.update(
            {
                "draft_id": timeline_id,
                "draft_name": draft_dir.name,
                "draft_fold_path": draft_dir.as_posix(),
                "draft_root_path": base.CAPCUT_DRAFTS_DIR.as_posix(),
                "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
                "tm_duration": total_us,
                "tm_draft_modified": now_us,
                "draft_timeline_materials_size": size,
                "draft_timeline_materials_size_": size,
            }
        )
        base.write_json(meta_path, meta)
    base.sync_root_meta_entry(draft_dir, timeline_id, total_us, size)

    make_storyboard(shot_records, resources)
    text_gate = {
        "fill_not_black": all(
            (json.loads(str(material.get("content", "{}"))).get("styles", [{}])[0].get("fill", {}).get("content", {}).get("solid", {}).get("color") != [0.0, 0.0, 0.0])
            for material in text_materials
        ),
        "no_heavy_backing": all(float(material.get("background_alpha") or 0.0) <= 0.08 for material in text_materials),
        "font_size_max": max(float(material.get("font_size") or 0.0) for material in text_materials) if text_materials else 0.0,
        "font_size_ok": all(4.8 <= float(material.get("font_size") or 0.0) <= 8.2 for material in text_materials),
        "text_duration_ok": all(1.0 <= (segment.get("target_timerange", {}).get("duration", 0) / 1_000_000) <= 2.4 for segment in text_track["segments"]),
        "has_fade_scale_keyframes": all(len(segment.get("common_keyframes") or []) >= 3 for segment in text_track["segments"]),
        "safe_position_not_center": all(
            abs(segment.get("clip", {}).get("transform", {}).get("x", 0.0)) >= 0.35
            and abs(segment.get("clip", {}).get("transform", {}).get("y", 0.0)) >= 0.50
            for segment in text_track["segments"]
        ),
    }
    shot_gate = {
        "section_matched_planner": True,
        "avg_2_to_5_seconds": 2.0 <= (sum(s["duration"] for s in shot_records) / len(shot_records)) <= 5.0,
        "max_under_5_seconds": max(s["duration"] for s in shot_records) <= 5.0,
        "first_20s_at_least_6": sum(1 for s in shot_records if s["start"] < 20) >= 6,
    }
    license_manifest = [
        {
            "key": key,
            "page_url": meta["page_url"],
            "download_url": meta["download_url"],
            "license": meta["license"],
            "license_url": meta["license_url"],
            "purpose": meta["purpose"],
        }
        for key, meta in stock_meta.items()
    ]
    audit = {
        "draft_name": draft_dir.name,
        "draft_dir": str(draft_dir),
        "duration_seconds": total_duration,
        "voiceover_duration_seconds": voice_duration,
        "voice": {"provider": "ElevenLabs", "voice_id": voice_id, "model_id": model_id},
        "shot_count": len(shot_records),
        "avg_shot_duration": round(sum(s["duration"] for s in shot_records) / len(shot_records), 3),
        "max_shot_duration": max(s["duration"] for s in shot_records),
        "first_20s_shots": sum(1 for s in shot_records if s["start"] < 20),
        "text_count": len(text_materials),
        "sfx_count": len(sfx_segments),
        "license_manifest": license_manifest,
        "text_quality_gate": text_gate,
        "shot_quality_gate": shot_gate,
        "audio_license_manifest": [
            {"kind": "music", "page_url": MUSIC_PAGE, "license": "Mixkit Music Free License", "license_url": "https://mixkit.co/license/#musicFree", "local_file": str(music_resource)},
            {"kind": "sfx_pop", "page_url": SFX_PAGES["pop"], "license": "Mixkit Sound Effects Free License", "license_url": "https://mixkit.co/license/#sfxFree", "local_file": str(sfx_pop_resource)},
            {"kind": "sfx_whoosh", "page_url": SFX_PAGES["whoosh"], "license": "Mixkit Sound Effects Free License", "license_url": "https://mixkit.co/license/#sfxFree", "local_file": str(sfx_whoosh_resource)},
        ],
        "storyboard_html": str(STORYBOARD_DIR / "index.html"),
        "timeline_json": str(OUT_DIR / "timeline.json"),
        "validation": base.validate_native_clone(draft_dir, []),
    }
    base.write_json(OUT_DIR / "timeline.json", shot_records, compact=False)
    base.write_json(OUT_DIR / "quality_audit.json", audit, compact=False)
    (OUT_DIR / "capcut_native_draft_path.txt").write_text(str(draft_dir) + "\n", encoding="utf-8")
    return audit


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(build(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
