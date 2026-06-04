#!/usr/bin/env python3
"""Build a real-b-roll OpenAI-voiced CapCut draft for the old phones documentary."""

from __future__ import annotations

import json
import os
import random
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import build_old_phones_capcut_mvp as base  # noqa: E402


DRAFT_NAME = "OLD_PHONES_DOC_REAL_BROLL_OPENAI_0529"
OUT_DIR = ROOT / "exports" / "old-phones-doc-real-broll-openai"
RAW_DIR = OUT_DIR / "source_downloads"
VOICE_DIR = OUT_DIR / "openai_voice"


@dataclass(frozen=True)
class RealScene:
    slug: str
    start: float
    duration: float
    title: str
    callout: str
    source_title: str
    page_url: str
    source_start: float


REAL_SCENES = [
    RealScene(
        "01_hook_old_phone",
        0.0,
        20.0,
        "Он же раньше летал.",
        "Старый телефон в новом цифровом мире",
        "Smartphone, close up - Free Stock Video",
        "https://mixkit.co/free-stock-video/smartphone-close-up-1789/",
        0.0,
    ),
    RealScene(
        "02_apps_heavier",
        20.0,
        45.0,
        "Приложения стали тяжелее",
        "Видео, кэш, реклама, функции",
        "Hands of a person typing on a cell phone - Free Stock Video",
        "https://mixkit.co/free-stock-video/hands-of-a-person-typing-on-a-cell-phone-4915/",
        8.0,
    ),
    RealScene(
        "03_storage_and_files",
        65.0,
        45.0,
        "Память почти забита",
        "Телефону нужно рабочее пространство",
        "Person on social media while serving coffee - Free Stock Video",
        "https://mixkit.co/free-stock-video/person-on-social-media-while-serving-coffee-4919/",
        0.0,
    ),
    RealScene(
        "04_battery_and_parts",
        110.0,
        45.0,
        "Батарея стареет",
        "Система начинает осторожничать",
        "Phone on round end table - Free Stock Video",
        "https://mixkit.co/free-stock-video/phone-on-round-end-table-248/",
        3.0,
    ),
    RealScene(
        "05_heat_and_limits",
        155.0,
        45.0,
        "Throttling",
        "Телефон снижает скорость, чтобы не перегреться",
        "Programmer using his cell phone while working at his desk - Free Stock Video",
        "https://mixkit.co/free-stock-video/programmer-using-his-cell-phone-while-working-at-his-desk-41638/",
        4.0,
    ),
    RealScene(
        "06_expectations_now",
        200.0,
        50.0,
        "Ожидания тоже обновились",
        "То, что раньше было нормой, теперь кажется лагом",
        "Young man sitting scrolling on his cell phone - Free Stock Video",
        "https://mixkit.co/free-stock-video/young-man-sitting-scrolling-on-his-cell-phone-4801/",
        5.0,
    ),
    RealScene(
        "07_fix_it",
        250.0,
        60.0,
        "Что можно сделать",
        "Память, батарея, приложения, жара",
        "Hands shown texting on a smartphone - Free Stock Video",
        "https://mixkit.co/free-stock-video/hands-shown-texting-on-a-smartphone-144/",
        0.0,
    ),
]


VOICE_PARTS = [
    "Ты нажимаешь на приложение. Ждешь секунду. Потом еще одну. Потом начинаешь нажимать сильнее, как будто телефон просто не понял серьезности ситуации. И в голове появляется мысль: он же раньше летал. Что с ним стало? Самое интересное: старый телефон не обязательно сломался. Часто он просто оказался в мире, который стал тяжелее.",
    "Когда ты покупал телефон, приложения были легче. Соцсети показывали меньше видео. Сайты были проще. Мессенджеры не пытались быть одновременно банком, магазином, редактором видео и маленьким телевизором. А потом прошло несколько лет. Приложения обновлялись, функций становилось больше, видео четче, реклама умнее, ленты бесконечнее. Телефон, который был создан для одного цифрового мира, внезапно живет в другом.",
    "Вторая причина - память. Многие думают: ну да, у меня осталось два гигабайта, но место же еще есть. Проблема в том, что телефону нужно не просто место для хранения. Ему нужно свободное пространство, чтобы нормально работать: сохранять временные файлы, обновлять приложения, кэшировать данные и перемещать куски системы. Когда память почти забита, простые вещи начинают идти через лишние круги.",
    "Третья причина - батарея. Аккумулятор не вечный. Со временем он хуже держит заряд и хуже отдает энергию в моменты, когда телефону нужно резко напрячься. Ты открываешь камеру, экран, сенсоры и обработка изображения включаются почти одновременно. Новая батарея держит такой рывок спокойно. Старая может просесть. И система начинает вести себя осторожнее.",
    "Еще один фактор - тепло. Телефоны не любят перегрев. Когда внутри становится слишком жарко, система снижает производительность, чтобы защитить компоненты. Это называется throttling. Особенно это заметно, когда ты снимаешь видео, пользуешься навигатором, играешь или сидишь на солнце. Старый телефон чаще работает ближе к пределу.",
    "Есть еще один неприятный момент: изменился не только телефон. Изменился ты. Когда телефон был новым, он казался быстрым на фоне того, к чему ты привык тогда. Но за несколько лет ты увидел новые экраны, новые анимации, быстрые камеры и моментальную разблокировку. То, что раньше казалось нормальным, сегодня ощущается как задержка.",
    "Это не всегда заговор. Обычно все скучнее и практичнее: батарея изнашивается, память забивается, приложения растут, система становится сложнее, а мы ждем от старого устройства поведения нового. Что можно сделать? Освободи память с нормальным запасом. Проверь состояние батареи. Убери приложения, которые давно не открывал. Не мучай телефон жарой. Старый телефон не обязательно плохой. Ему просто нужно немного пространства и меньше цифрового хаоса.",
]

BEAT_TEXTS = [
    (0.8, 2.2, "Раньше летал"),
    (4.0, 2.0, "Теперь думает"),
    (8.0, 2.3, "Что изменилось?"),
    (22.0, 2.5, "Приложения тяжелее"),
    (29.0, 2.2, "Видео"),
    (32.0, 2.2, "Кэш"),
    (35.0, 2.2, "Реклама"),
    (38.0, 2.2, "Функции"),
    (67.0, 3.0, "Место есть ≠ запас есть"),
    (81.0, 2.5, "Временные файлы"),
    (88.0, 2.5, "Кэш данных"),
    (113.0, 3.0, "Батарея стареет"),
    (129.0, 2.6, "Пики нагрузки"),
    (142.0, 2.8, "Режим осторожности"),
    (158.0, 3.0, "THROTTLING"),
    (174.0, 2.7, "Солнце"),
    (178.0, 2.7, "Навигатор"),
    (182.0, 2.7, "Игры"),
    (204.0, 3.0, "Изменился ты"),
    (222.0, 3.0, "Новые телефоны подняли планку"),
    (252.0, 2.6, "1. Память"),
    (258.0, 2.6, "2. Батарея"),
    (264.0, 2.6, "3. Приложения"),
    (270.0, 2.6, "4. Жара"),
    (292.0, 4.5, "Меньше цифрового хаоса"),
]


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def run(command: list[str]) -> None:
    completed = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if completed.returncode != 0:
        raise RuntimeError("Command failed:\n" + " ".join(command) + "\n\n" + completed.stdout)


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
    last_error = ""
    headers = {
        "User-Agent": "PhrasemanVideoMVP/0.1 (local prototype; contact: local-user)",
        "Accept": "video/webm,video/mp4,*/*",
    }
    for attempt in range(5):
        with requests.get(url, stream=True, timeout=180, headers=headers) as response:
            if response.status_code == 429:
                last_error = response.text[:500]
                time.sleep((attempt + 1) * 8 + random.random() * 2)
                continue
            response.raise_for_status()
            with path.open("wb") as handle:
                for chunk in response.iter_content(chunk_size=1024 * 512):
                    if chunk:
                        handle.write(chunk)
            return
    raise RuntimeError(f"Download rate-limited after retries: {url}\n{last_error}")


def strip_html(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value or "").replace("\n", " ").strip()


def mixkit_asset(page_url: str) -> dict[str, str]:
    html = requests.get(page_url, timeout=60, headers={"User-Agent": "Mozilla/5.0"}).text
    if "Mixkit Stock Video Free License" not in html or "Restricted License" in html:
        raise RuntimeError(f"Mixkit page is not free-license safe for this MVP: {page_url}")
    mp4s = re.findall(r"https://assets\.mixkit\.co/videos/[^\"']+?\.mp4", html)
    if not mp4s:
        raise RuntimeError(f"No MP4 URL found on Mixkit page: {page_url}")
    title_match = re.search(r"<title>(.*?)</title>", html, re.S)
    title = strip_html(title_match.group(1)) if title_match else page_url
    return {
        "title": title,
        "page_url": page_url,
        "download_url": mp4s[0],
        "license": "Mixkit Stock Video Free License",
        "license_url": "https://mixkit.co/license/#videoFree",
    }


def fit_clip(raw: Path, out: Path, scene: RealScene) -> None:
    if out.exists() and out.stat().st_size > 1024:
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    source_duration = probe_duration(raw)
    start = min(scene.source_start, max(0.0, source_duration - 1.0))
    stream_loop = ["-stream_loop", "-1"] if source_duration < scene.duration + 1 else []
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            *stream_loop,
            "-ss",
            f"{start:.3f}",
            "-i",
            str(raw),
            "-t",
            f"{scene.duration:.3f}",
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1",
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


def openai_tts(text: str, path: Path, api_key: str) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    response = requests.post(
        "https://api.openai.com/v1/audio/speech",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o-mini-tts",
            "voice": "coral",
            "input": text,
            "instructions": "Говори по-русски живо и уверенно, как автор YouTube tech-документалки. Темп энергичный, но разборчивый.",
            "format": "mp3",
        },
        timeout=180,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI TTS failed {response.status_code}: {response.text[:1000]}")
    path.write_bytes(response.content)


def concat_audio(parts: list[Path], out: Path) -> None:
    list_path = out.with_suffix(".txt")
    list_path.write_text("\n".join(f"file '{p.as_posix()}'" for p in parts) + "\n", encoding="utf-8")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(list_path), "-c", "copy", str(out)])


def make_music(path: Path, duration: float) -> None:
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
            f"sine=frequency=82:sample_rate=44100:duration={duration}",
            "-af",
            "volume=0.025",
            "-c:a",
            "pcm_s16le",
            str(path),
        ]
    )


def build_real_draft() -> dict[str, Any]:
    env = load_env_file(ROOT / ".env.local")
    api_key = os.environ.get("OPENAI_API_KEY") or env.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing in environment or .env.local")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    metadata = {scene.slug: mixkit_asset(scene.page_url) for scene in REAL_SCENES}

    raw_paths: dict[str, Path] = {}
    for scene in REAL_SCENES:
        raw = RAW_DIR / (scene.slug + ".mp4")
        download(metadata[scene.slug]["download_url"], raw)
        raw_paths[scene.slug] = raw

    voice_parts: list[Path] = []
    for index, text in enumerate(VOICE_PARTS, start=1):
        path = VOICE_DIR / f"voice_part_{index:02d}.mp3"
        openai_tts(text, path, api_key)
        voice_parts.append(path)
    voiceover = VOICE_DIR / "old_phones_openai_voiceover.mp3"
    concat_audio(voice_parts, voiceover)
    voice_duration = probe_duration(voiceover)
    total_duration = max(310.0, voice_duration)
    music = VOICE_DIR / "music_bed_placeholder_quiet.wav"
    make_music(music, total_duration)

    result = base.clone_wednesday_template(
        source_draft=base.SOURCE_DRAFT,
        draft_name=DRAFT_NAME,
        blank_tracks=[],
        copy_mode="copy",
    )
    draft_dir = Path(result["draftDir"])
    resources = draft_dir / "Resources"
    resources.mkdir(exist_ok=True)

    scene_resources: list[Path] = []
    for scene in REAL_SCENES:
        out = resources / f"{scene.slug}.mp4"
        fit_clip(raw_paths[scene.slug], out, scene)
        scene_resources.append(out)
    voice_resource = resources / "old_phones_openai_voiceover.mp3"
    music_resource = resources / "music_bed_placeholder_quiet.wav"
    shutil.copy2(voiceover, voice_resource)
    shutil.copy2(music, music_resource)
    shutil.copy2(Path(base.__file__).resolve().parents[1] / "lingman-scenarist-pipeline" / "capcut_wednesday_assembler" / "__init__.py", OUT_DIR / ".keep")
    # Reuse the existing soft pop generated by the previous builder if present, otherwise generate it.
    sfx_resource = resources / "sfx_soft_pop_placeholder.wav"
    base.generate_audio(sfx_resource, 0.25, kind="sfx")

    content_path = draft_dir / "draft_content.json"
    draft_content = base.load_json(content_path)
    prefix = base.resource_prefix(draft_content)
    now_us = int(time.time() * base.US)
    total_us = base.us(total_duration)
    timeline_id = str(draft_content["id"])
    draft_content["name"] = draft_dir.name
    draft_content["duration"] = total_us
    draft_content["update_time"] = now_us
    draft_content["path"] = draft_dir.as_posix()

    materials = draft_content["materials"]
    base_video = materials["videos"][0]
    base_audio = materials["audios"][0]
    base_text = materials["texts"][0]

    video_materials = [
        base.make_video_material(base_video, resource, base.Scene(scene.slug, scene.slug, scene.start, scene.duration, "0x111827", scene.title, scene.callout), prefix)
        for scene, resource in zip(REAL_SCENES, scene_resources, strict=True)
    ]
    title_materials = [base.make_text_material(base_text, scene.title) for scene in REAL_SCENES]
    callout_materials = [base.make_text_material(base_text, scene.callout) for scene in REAL_SCENES]
    beat_materials = [base.make_text_material(base_text, text) for _, _, text in BEAT_TEXTS]

    voice_material = base.make_audio_material(base_audio, voice_resource, total_duration, prefix, name="OpenAI voiceover - old phones")
    music_material = base.make_audio_material(base_audio, music_resource, total_duration, prefix, name="Quiet temp music bed")
    sfx_material = base.make_audio_material(base_audio, sfx_resource, 0.25, prefix, name="Soft pop SFX")

    materials["videos"] = video_materials
    materials["audios"] = [voice_material, music_material, sfx_material]
    materials["texts"] = title_materials + callout_materials + beat_materials

    base_video_segment = draft_content["tracks"][0]["segments"][0]
    base_title_segment = draft_content["tracks"][1]["segments"][0]
    base_callout_segment = draft_content["tracks"][3]["segments"][0]
    base_audio_segment = draft_content["tracks"][5]["segments"][0]

    video_track = json.loads(json.dumps(draft_content["tracks"][0], ensure_ascii=False))
    video_track["name"] = "REAL B-ROLL FROM COMMONS"
    video_track["segments"] = [
        base.clone_segment(base_video_segment, material["id"], scene.start, scene.duration, index)
        for index, (scene, material) in enumerate(zip(REAL_SCENES, video_materials, strict=True))
    ]

    title_track = json.loads(json.dumps(draft_content["tracks"][1], ensure_ascii=False))
    title_track["name"] = "Dynamic scene titles"
    title_track["segments"] = [
        base.clone_segment(base_title_segment, material["id"], scene.start + 0.6, 3.0, index)
        for index, (scene, material) in enumerate(zip(REAL_SCENES, title_materials, strict=True))
    ]

    callout_track = json.loads(json.dumps(draft_content["tracks"][3], ensure_ascii=False))
    callout_track["name"] = "Short callouts"
    callout_track["segments"] = [
        base.clone_segment(base_callout_segment, material["id"], scene.start + 5.0, 3.2, index)
        for index, (scene, material) in enumerate(zip(REAL_SCENES, callout_materials, strict=True))
    ]

    beat_track = json.loads(json.dumps(draft_content["tracks"][2], ensure_ascii=False))
    beat_track["name"] = "Fast pop beat text"
    beat_track["segments"] = [
        base.clone_segment(base_title_segment, material["id"], start, duration, index)
        for index, ((start, duration, _), material) in enumerate(zip(BEAT_TEXTS, beat_materials, strict=True))
    ]

    voice_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    voice_track["name"] = "OPENAI VOICEOVER"
    voice_track["segments"] = [base.clone_segment(base_audio_segment, voice_material["id"], 0.0, total_duration, 0)]
    voice_track["segments"][0]["volume"] = 1.0
    voice_track["segments"][0]["last_nonzero_volume"] = 1.0

    music_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    music_track["id"] = base.new_id()
    music_track["name"] = "TEMP MUSIC BED"
    music_track["segments"] = [base.clone_segment(base_audio_segment, music_material["id"], 0.0, total_duration, 0)]
    music_track["segments"][0]["volume"] = 0.22
    music_track["segments"][0]["last_nonzero_volume"] = 0.22

    sfx_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    sfx_track["id"] = base.new_id()
    sfx_track["name"] = "DYNAMIC SFX POPS"
    sfx_track["segments"] = [
        base.clone_segment(base_audio_segment, sfx_material["id"], start, 0.25, index)
        for index, (start, _, _) in enumerate(BEAT_TEXTS[:18])
    ]
    for segment in sfx_track["segments"]:
        segment["volume"] = 0.26
        segment["last_nonzero_volume"] = 0.26

    draft_content["tracks"] = [video_track, title_track, callout_track, beat_track, voice_track, music_track, sfx_track]
    base.write_json(content_path, draft_content)
    if (draft_dir / "template-2.tmp").exists():
        base.write_json(draft_dir / "template-2.tmp", draft_content)
    if (draft_dir / "draft_content.json.bak").exists():
        base.write_json(draft_dir / "draft_content.json.bak", draft_content)
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

    license_manifest = []
    for scene in REAL_SCENES:
        meta = metadata.get(scene.slug, {})
        license_manifest.append(
            {
                "scene": scene.slug,
                "title": scene.source_title,
                "source_url": scene.page_url,
                "download_url": meta.get("download_url", ""),
                "creator": "Mixkit contributor",
                "credit": meta.get("title", ""),
                "license": meta.get("license", ""),
                "license_url": meta.get("license_url", ""),
                "local_clip": str(resources / f"{scene.slug}.mp4"),
            }
        )
    manifest = {
        "draft_name": draft_dir.name,
        "draft_dir": str(draft_dir),
        "duration_seconds": total_duration,
        "voiceover": str(voice_resource),
        "voiceover_duration_seconds": voice_duration,
        "tts_model": "gpt-4o-mini-tts",
        "broll_license_manifest": license_manifest,
        "validation": base.validate_native_clone(draft_dir, []),
    }
    base.write_json(OUT_DIR / "asset_manifest.real_broll.json", manifest, compact=False)
    (OUT_DIR / "capcut_native_draft_path.txt").write_text(str(draft_dir) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(build_real_draft(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
