#!/usr/bin/env python3
"""Build an English editable CapCut draft with strict no-repeat b-roll."""

from __future__ import annotations

import json
import os
import random
import re
import shutil
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import build_old_phones_capcut_mvp as base  # noqa: E402
import build_old_phones_retention_capcut as retention  # noqa: E402


DRAFT_NAME = "PHONES_EN_UNIQUE_0529_004"
OUT_DIR = ROOT / "exports" / "old-phones-doc-english-unique"
RAW_DIR = OUT_DIR / "source_downloads"
VOICE_DIR = OUT_DIR / "elevenlabs_voice"
STORYBOARD_DIR = OUT_DIR / "storyboard"
VOICE_ID = "006EYOybeBcRfv8oyv6v"  # ВИДЕО РАССКАЗЧИК СТОРИТЕЛЛЕР, generated, English
MODEL_ID = "eleven_multilingual_v2"
MIN_REPEAT_DISTANCE_SECONDS = 90.0
BAD_ASSET_IDS = {
    "241",  # paper signing, not phone use
    "42633",  # green screen call shot
    "28286",  # green screen call/phone shot
    "28300",  # green screen phone shot
    "1240",  # magenta chroma-style body shot
    "44737",  # green screen workstation
    "4688",  # field game, not mobile gaming
    "50816",  # inappropriate/irrelevant charging page result
    "52076",  # green screen laptop shot
    "34435",  # decorative event footage from charging category
    "34048",  # abstract/kaleidoscope footage from charging category
    "9356",  # abstract numbers from charging category
    "33335",  # TV remote, not phone battery
    "29999",  # marker pens, not battery health
    "4762",  # chess, not mobile gaming
    "5339",  # chess, not mobile gaming
    "29030",  # bridge/city from repair category, irrelevant
    "24011",  # bicycle repair, irrelevant
    "15871",  # bicycle repair, irrelevant
    "22965",  # bicycle repair, irrelevant
    "41930",  # vehicle repair, irrelevant
    "41931",  # vehicle repair, irrelevant
    "47005",  # money pile, too off-topic
}


VOICE_SCRIPT = """
You tap an app.

Nothing happens.

You wait one second. Then another. Then you tap again, harder, as if pressure could make software feel guilty.

And the thought appears: this phone used to fly. What happened?

The answer is not one dramatic villain. Most old phones are not suddenly broken. They are living inside a digital world that quietly became heavier.

That is why the slowdown feels so unfair. You did not wake up and decide to overload the phone. You just kept using normal apps in a world where normal apps became more demanding every year.

When your phone was new, the apps around it were lighter. Social feeds showed fewer videos. Websites were simpler. Messengers were not trying to be a bank, a shop, a camera editor, a mini television, and a cloud drive at the same time.

Then a few years passed. Apps updated. Interfaces became prettier. Feeds became endless. Photos got bigger. Video got sharper. Ads got smarter. Every app learned to do more, track more, cache more, and ask for more memory.

So the same phone is now doing a different job.

And the tricky part is that app developers are usually building for the phones people buy now, not the phone sitting in your drawer from five years ago. New chips, more memory, faster storage, brighter screens, and better networks quietly become the baseline. Your older phone can still run the app, but it has less headroom for everything around it.

It is like buying a small city car, then five years later asking it to carry concrete. It still moves. It just does not feel excited about the assignment.

The second problem is storage.

People look at two free gigabytes and think: technically, there is still space. But a phone needs more than storage for your photos. It needs working room. It needs space for temporary files, updates, cache, app data, thumbnails, downloads, logs, and all the invisible little pieces that make the system feel smooth.

When storage gets almost full, simple actions take extra steps. Opening the camera. Loading a gallery. Updating a chat. Saving a video. The phone has to move things around before it can do the thing you asked for.

There is also RAM, the short-term memory of the phone. When there is not enough of it, apps get kicked out of memory more often. So instead of instantly returning to where you were, the phone reloads the app. That reload feels like the phone forgot what you were doing.

You might not be doing anything extreme. Photos pile up. Chats grow. Cache expands. Downloads stay forgotten. Slowly, the phone becomes a room where you can still walk, but every step is between boxes.

Then there is the battery.

A phone battery is not just a tank of energy. It also has to deliver power quickly when the phone needs a burst. Opening the camera is a burst. Recording video is a burst. Gaming is a burst. Navigation in the sun is a burst.

A new battery can handle those spikes calmly. An old battery may struggle. To avoid random shutdowns, the system can become more careful. It may reduce performance, smooth out power peaks, and avoid pushing the processor as hard.

To you, it feels like lag.

To the phone, it might be survival mode.

This is not the same as saying the phone is useless. It means the system is choosing stability over speed. A slightly slower phone is better than a phone that shuts off the moment you open the camera at twenty percent battery.

Heat makes it worse. Phones hate heat. When the inside gets too warm, the system slows the processor down to protect the components. That is called throttling.

It happens during video recording, gaming, navigation, charging, and bright sunlight. An older phone falls into this trap more often because the battery is weaker, apps are heavier, storage is tighter, and the cooling system has not magically improved with age.

So the phone is not only old. It is constantly working closer to its limit.

There is also a stranger reason: you changed.

When the phone was new, it felt fast compared with what you expected then. But now you have seen smoother screens, faster cameras, instant unlocks, and apps that open with almost no pause. Your internal standard moved.

What felt normal before now feels like waiting.

It is like old internet. A page loading in five seconds used to be fine. Today five seconds feels like a personal attack.

So when people say companies secretly slow old phones, the real story is usually more boring and more practical. Batteries age. Storage fills. Apps grow. Systems get more complex. Heat limits performance. And our expectations rise.

Sometimes companies do make choices people dislike. Sometimes updates are not kind to older hardware. But in everyday use, the slow feeling is usually not one switch. It is pressure building from several directions at once.

It is not one cause. It is many small causes combining into one big feeling: my phone is tired.

If your phone feels slow, start with free storage. Not the last two gigabytes, but a real buffer.

Then check battery health, if your system shows it. Sometimes replacing the battery gives an old phone a second life.

Remove apps you never open. They may still hold cache, background tasks, and storage.

Avoid heat: heavy games while charging, navigation in a hot car, or filming in direct sun will make lag more obvious.

Also restart it sometimes. Not as magic, but as cleanup. A restart can clear stuck background tasks and give the system a fresh start when it has been carrying too much for too long.

And finally, be fair to the device. An old phone is not always bad. It is just not a young athlete anymore. Give it space, give it a healthy battery, and give it less digital chaos.
""".strip()


TEXT_BEATS = [
    (1.0, 1.5, "YOU TAP"),
    (3.0, 1.4, "NOTHING"),
    (6.5, 1.7, "IT USED TO FLY"),
    (12.0, 1.7, "WHAT HAPPENED?"),
    (22.0, 1.8, "THE WORLD GOT HEAVIER"),
    (38.0, 1.7, "APPS GREW"),
    (47.0, 1.7, "FEEDS GOT ENDLESS"),
    (56.0, 1.7, "CACHE EVERYWHERE"),
    (68.0, 1.8, "SAME PHONE"),
    (72.0, 1.8, "DIFFERENT JOB"),
    (92.0, 1.8, "STORAGE"),
    (111.0, 1.8, "WORKING ROOM"),
    (132.0, 1.8, "ALMOST FULL"),
    (151.0, 1.8, "BETWEEN BOXES"),
    (165.0, 1.8, "BATTERY"),
    (181.0, 1.7, "POWER SPIKES"),
    (197.0, 1.8, "SURVIVAL MODE"),
    (212.0, 1.7, "HEAT"),
    (224.0, 1.8, "THROTTLING"),
    (241.0, 1.8, "CLOSER TO THE LIMIT"),
    (258.0, 1.8, "YOU CHANGED"),
    (278.0, 1.8, "THE STANDARD MOVED"),
    (294.0, 1.8, "5 SECONDS"),
    (309.0, 1.8, "NOT ONE CAUSE"),
    (324.0, 1.8, "PHONE IS TIRED"),
    (340.0, 1.6, "FREE STORAGE"),
    (350.0, 1.6, "BATTERY HEALTH"),
    (360.0, 1.6, "REMOVE APPS"),
    (370.0, 1.6, "AVOID HEAT"),
    (386.0, 2.0, "LESS DIGITAL CHAOS"),
]


SECTION_CATEGORIES = [
    (0.00, 0.12, ["phone", "smartphone", "cellphone", "call", "device", "technology", "laptop", "social-media"], "hook and lag"),
    (0.12, 0.27, ["social-media", "internet", "technology", "business"], "heavier apps and feeds"),
    (0.27, 0.40, ["data", "computer", "office", "laptop"], "storage and cache"),
    (0.40, 0.54, ["device", "phone", "smartphone", "technology", "data"], "battery and power"),
    (0.54, 0.66, ["sun", "gaming", "game", "car"], "heat and throttling"),
    (0.66, 0.79, ["smartphone", "technology", "business", "work"], "expectations changed"),
    (0.79, 0.90, ["data", "computer", "device", "technology"], "many causes"),
    (0.90, 1.01, ["device", "office", "phone", "smartphone", "data"], "fixes"),
]


MIXKIT_CATEGORIES = sorted({category for _, _, categories, _ in [(0, 0, cats, "") for _, _, cats, _ in SECTION_CATEGORIES] for category in categories} | {
    "laptop",
    "coding",
    "city",
    "work",
})


@dataclass(frozen=True)
class StockAsset:
    asset_id: str
    category: str
    download_url: str
    page_url: str
    resolution: int


@dataclass(frozen=True)
class Shot:
    start: float
    duration: float
    asset: StockAsset
    purpose: str
    source_start: float


def load_api_key() -> str:
    env = retention.load_env_file(ROOT / ".env.local")
    api_key = os.environ.get("ELEVENLABS_API_KEY") or env.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is required in .env.local")
    return api_key


def scrape_mixkit_category(category: str) -> list[StockAsset]:
    url = f"https://mixkit.co/free-stock-video/{category}/"
    html = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"}).text
    matches = re.findall(r"https://assets\.mixkit\.co/videos/(\d+)/\1-(\d+)\.mp4", html)
    best_by_id: dict[str, int] = {}
    for asset_id, resolution in matches:
        res = int(resolution)
        if res <= 1080:
            best_by_id[asset_id] = max(best_by_id.get(asset_id, 0), res)
    return [
        StockAsset(
            asset_id=asset_id,
            category=category,
            download_url=f"https://assets.mixkit.co/videos/{asset_id}/{asset_id}-{resolution}.mp4",
            page_url=url,
            resolution=resolution,
        )
    for asset_id, resolution in sorted(best_by_id.items())
        if asset_id not in BAD_ASSET_IDS
    ]


def collect_assets() -> tuple[list[StockAsset], dict[str, list[StockAsset]]]:
    by_id: dict[str, StockAsset] = {}
    by_category: dict[str, list[StockAsset]] = {}
    for category in MIXKIT_CATEGORIES:
        assets = scrape_mixkit_category(category)
        by_category[category] = []
        for asset in assets:
            if asset.asset_id not in by_id or asset.resolution > by_id[asset.asset_id].resolution:
                by_id[asset.asset_id] = asset
            by_category[category].append(asset)
    return list(by_id.values()), by_category


def section_for_time(t: float, total_duration: float) -> tuple[list[str], str]:
    ratio = t / max(total_duration, 1.0)
    for start, end, categories, purpose in SECTION_CATEGORIES:
        if start <= ratio < end:
            return categories, purpose
    return SECTION_CATEGORIES[-1][2], SECTION_CATEGORIES[-1][3]


def build_shots(total_duration: float, all_assets: list[StockAsset], by_category: dict[str, list[StockAsset]]) -> list[Shot]:
    random.seed(529)
    used_ids: set[str] = set()
    last_categories: list[str] = []
    shots: list[Shot] = []
    t = 0.0
    index = 0
    while t < total_duration - 0.25:
        duration = random.choice([2.0, 2.25, 2.5, 2.8, 3.1]) if t < 24 else random.choice([2.7, 3.0, 3.4, 3.8, 4.2, 4.7])
        duration = min(duration, total_duration - t)
        remaining_after = total_duration - (t + duration)
        if 0 < remaining_after < 2.0 and duration + remaining_after <= 5.0:
            duration += remaining_after
        categories, purpose = section_for_time(t, total_duration)
        candidates: list[StockAsset] = []
        for category in categories:
            candidates.extend(by_category.get(category, []))
        random.shuffle(candidates)
        selected = None
        for asset in candidates:
            if asset.asset_id in used_ids:
                continue
            if last_categories[-1:] and last_categories[-1] == asset.category:
                continue
            recent = [shot.asset.category for shot in shots if shot.start >= t - 20.0]
            if recent.count(asset.category) >= 3:
                continue
            selected = asset
            break
        if selected is None:
            for asset in random.sample(all_assets, len(all_assets)):
                recent = [shot.asset.category for shot in shots if shot.start >= t - 20.0]
                if asset.asset_id not in used_ids and recent.count(asset.category) < 4:
                    selected = asset
                    break
        if selected is None:
            raise RuntimeError("Not enough unique Mixkit assets for no-repeat shot plan")
        used_ids.add(selected.asset_id)
        last_categories.append(selected.category)
        shots.append(Shot(round(t, 3), round(duration, 3), selected, purpose, float((index * 2.7) % 8)))
        t += duration
        index += 1
    return shots


def clean_template_resources(resources: Path) -> None:
    for path in resources.iterdir():
        if path.is_file() and path.suffix.lower() in {".mp4", ".mov", ".mp3", ".wav", ".m4a", ".jpg", ".jpeg", ".png"}:
            path.unlink()


def make_storyboard(shot_records: list[dict[str, Any]], resources: Path) -> None:
    STORYBOARD_DIR.mkdir(parents=True, exist_ok=True)
    thumbs: list[Path] = []
    for shot in shot_records[:120]:
        clip = resources / shot["clip"]
        thumb = STORYBOARD_DIR / f"{shot['index']:03d}.jpg"
        if not thumb.exists():
            retention.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", "0.4", "-i", str(clip), "-frames:v", "1", "-q:v", "3", str(thumb)])
        thumbs.append(thumb)
    html_parts = [
        "<html><head><meta charset='utf-8'><style>body{font-family:Arial;background:#111827;color:#e5e7eb}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.card{background:#1f2937;padding:8px}.card img{width:100%}.t{font-size:12px;color:#d1d5db}</style></head><body>",
        "<h1>English Unique B-roll Storyboard</h1><div class='grid'>",
    ]
    for shot, thumb in zip(shot_records[:120], thumbs, strict=False):
        html_parts.append(
            f"<div class='card'><img src='{thumb.name}'><div class='t'>{shot['index']:03d} | {shot['start']:.1f}s | {shot['duration']:.1f}s<br>"
            f"asset {shot['asset_id']} | {shot['category']}<br>{shot['purpose']}</div></div>"
        )
    html_parts.append("</div></body></html>")
    (STORYBOARD_DIR / "index.html").write_text("\n".join(html_parts), encoding="utf-8")


def text_active_beats(total_duration: float) -> list[tuple[float, float, str]]:
    return [(start, min(duration, 2.0), text) for start, duration, text in TEXT_BEATS if start < total_duration]


def build() -> dict[str, Any]:
    api_key = load_api_key()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    all_assets, by_category = collect_assets()

    voice_parts: list[Path] = []
    for index, chunk in enumerate(retention.chunk_text(VOICE_SCRIPT, max_chars=2300), start=1):
        path = VOICE_DIR / f"storyteller_english_v2_part_{index:02d}.mp3"
        retention.elevenlabs_tts(chunk, path, api_key=api_key, voice_id=VOICE_ID, model_id=MODEL_ID)
        voice_parts.append(path)
    voiceover = VOICE_DIR / "old_phones_english_storyteller_v2_voiceover.mp3"
    retention.concat_audio(voice_parts, voiceover)
    total_duration = retention.probe_duration(voiceover)
    total_us = base.us(total_duration)

    shots = build_shots(total_duration, all_assets, by_category)

    result = base.clone_wednesday_template(source_draft=base.SOURCE_DRAFT, draft_name=DRAFT_NAME, blank_tracks=[], copy_mode="copy")
    draft_dir = Path(result["draftDir"])
    resources = draft_dir / "Resources"
    resources.mkdir(exist_ok=True)
    clean_template_resources(resources)

    shot_records: list[dict[str, Any]] = []
    for index, shot in enumerate(shots):
        raw = RAW_DIR / f"mixkit_{shot.asset.asset_id}_{shot.asset.resolution}.mp4"
        retention.download(shot.asset.download_url, raw)
        out = resources / f"shot_{index:03d}_mixkit_{shot.asset.asset_id}_{shot.asset.category}.mp4"
        retention.cut_shot(raw, out, shot.source_start, shot.duration, index)
        shot_records.append(
            {
                "index": index,
                "start": shot.start,
                "duration": shot.duration,
                "asset_id": shot.asset.asset_id,
                "category": shot.asset.category,
                "source_key": f"mixkit_{shot.asset.asset_id}_{shot.asset.category}",
                "purpose": shot.purpose,
                "clip": out.name,
                "download_url": shot.asset.download_url,
                "page_url": shot.asset.page_url,
            }
        )

    music_source = VOICE_DIR / "mixkit_technology_music_source.mp3"
    retention.download(retention.first_mixkit_audio_url(retention.MUSIC_PAGE), music_source)
    music = VOICE_DIR / "mixkit_technology_music_bed.wav"
    retention.prepare_music_bed(music_source, music, total_duration)
    sfx_pop = VOICE_DIR / "mixkit_click_pop.mp3"
    sfx_whoosh = VOICE_DIR / "mixkit_whoosh_transition.mp3"
    retention.download(retention.first_mixkit_audio_url(retention.SFX_PAGES["pop"]), sfx_pop)
    retention.download(retention.first_mixkit_audio_url(retention.SFX_PAGES["whoosh"]), sfx_whoosh)

    voice_resource = resources / "old_phones_english_storyteller_voiceover.mp3"
    music_resource = resources / "mixkit_technology_music_bed.wav"
    sfx_pop_resource = resources / "sfx_pop.mp3"
    sfx_whoosh_resource = resources / "sfx_whoosh.mp3"
    shutil.copy2(voiceover, voice_resource)
    shutil.copy2(music, music_resource)
    shutil.copy2(sfx_pop, sfx_pop_resource)
    shutil.copy2(sfx_whoosh, sfx_whoosh_resource)

    content_path = draft_dir / "draft_content.json"
    draft_content = base.load_json(content_path)
    prefix = base.resource_prefix(draft_content)
    now_us = int(time.time() * base.US)
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

    active_text_beats = text_active_beats(total_duration)
    text_materials = [base.make_text_material(base_text, text) for start, duration, text in active_text_beats]
    for index, (material, (_, _, text)) in enumerate(zip(text_materials, active_text_beats, strict=True)):
        retention.style_text_material(material, text, index)

    voice_material = base.make_audio_material(base_audio, voice_resource, total_duration, prefix, name="ElevenLabs English storyteller voiceover")
    music_material = base.make_audio_material(base_audio, music_resource, total_duration, prefix, name="Mixkit low documentary music bed")
    pop_material = base.make_audio_material(base_audio, sfx_pop_resource, 0.16, prefix, name="SFX pop")
    whoosh_material = base.make_audio_material(base_audio, sfx_whoosh_resource, 0.38, prefix, name="SFX whoosh")

    materials["videos"] = video_materials
    materials["texts"] = text_materials
    materials["audios"] = [voice_material, music_material, pop_material, whoosh_material]

    video_track = json.loads(json.dumps(draft_content["tracks"][0], ensure_ascii=False))
    video_track["name"] = "UNIQUE B-ROLL - NO REPEATS"
    video_track["segments"] = [
        base.clone_segment(base_video_segment, material["id"], record["start"], record["duration"], record["index"])
        for material, record in zip(video_materials, shot_records, strict=True)
    ]

    text_track = json.loads(json.dumps(draft_content["tracks"][1], ensure_ascii=False))
    text_track["name"] = "ENGLISH KINETIC TEXT HITS"
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
        segment["common_keyframes"] = retention.punch_keyframes(duration_us)

    voice_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    voice_track["name"] = "ELEVENLABS STORYTELLER VOICE"
    voice_track["segments"] = [base.clone_segment(base_audio_segment, voice_material["id"], 0.0, total_duration, 0)]
    voice_track["segments"][0]["volume"] = 1.0
    voice_track["segments"][0]["last_nonzero_volume"] = 1.0

    music_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    music_track["id"] = base.new_id()
    music_track["name"] = "MIXKIT MUSIC BED"
    music_track["segments"] = [base.clone_segment(base_audio_segment, music_material["id"], 0.0, total_duration, 0)]
    music_track["segments"][0]["volume"] = 0.16
    music_track["segments"][0]["last_nonzero_volume"] = 0.16

    sfx_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    sfx_track["id"] = base.new_id()
    sfx_track["name"] = "VARIED SFX TRANSITIONS"
    text_hit_times = {round(start, 1) for start, _, _ in active_text_beats}
    sfx_segments = []
    for index, record in enumerate(shot_records):
        if index == 0:
            continue
        is_hook = record["start"] < 22
        is_text_hit = any(abs(record["start"] - hit) < 0.8 for hit in text_hit_times)
        is_pulse = index % 4 == 0 or index % 9 == 0
        if not (is_hook or is_text_hit or is_pulse):
            continue
        material_id = whoosh_material["id"] if index % 5 == 0 else pop_material["id"]
        duration = 0.38 if index % 5 == 0 else 0.16
        segment = base.clone_segment(base_audio_segment, material_id, record["start"], duration, index)
        segment["volume"] = 0.14 if index % 5 == 0 else 0.09
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
                "draft_is_invisible": False,
            }
        )
        base.write_json(meta_path, meta)
    base.sync_root_meta_entry(draft_dir, timeline_id, total_us, size)

    make_storyboard(shot_records, resources)
    ids = [record["asset_id"] for record in shot_records]
    duplicate_ids = sorted({asset_id for asset_id in ids if ids.count(asset_id) > 1})
    category_window_violations = []
    for i, record in enumerate(shot_records):
        window = [r for r in shot_records if record["start"] <= r["start"] < record["start"] + 20]
        counts: dict[str, int] = {}
        for item in window:
            counts[item["category"]] = counts.get(item["category"], 0) + 1
        if any(count > 4 for count in counts.values()):
            category_window_violations.append({"index": i, "start": record["start"], "counts": counts})
    no_repeat_gate = {
        "unique_source_assets": len(set(ids)) == len(ids),
        "duplicate_asset_ids": duplicate_ids,
        "min_repeat_distance_seconds": MIN_REPEAT_DISTANCE_SECONDS,
        "category_window_violations": category_window_violations[:8],
    }
    shot_gate = {
        "avg_2_to_5_seconds": 2.0 <= (sum(s["duration"] for s in shot_records) / len(shot_records)) <= 5.0,
        "max_under_5_seconds": max(s["duration"] for s in shot_records) <= 5.0,
        "first_20s_at_least_7": sum(1 for s in shot_records if s["start"] < 20) >= 7,
        "no_repeat_gate": no_repeat_gate,
    }
    audit = {
        "draft_name": draft_dir.name,
        "draft_dir": str(draft_dir),
        "duration_seconds": total_duration,
        "voice": {
            "provider": "ElevenLabs",
            "voice_id": VOICE_ID,
            "voice_name": "ВИДЕО РАССКАЗЧИК СТОРИТЕЛЛЕР",
            "language": "en",
            "model_id": MODEL_ID,
        },
        "language": "English",
        "shot_count": len(shot_records),
        "unique_asset_count": len(set(ids)),
        "avg_shot_duration": round(sum(s["duration"] for s in shot_records) / len(shot_records), 3),
        "text_count": len(text_materials),
        "sfx_count": len(sfx_segments),
        "shot_quality_gate": shot_gate,
        "license_manifest": [
            {
                "asset_id": record["asset_id"],
                "category": record["category"],
                "page_url": record["page_url"],
                "download_url": record["download_url"],
                "license": "Mixkit Video Free License",
                "license_url": "https://mixkit.co/license/#videoFree",
            }
            for record in shot_records
        ],
        "validation": base.validate_native_clone(draft_dir, []),
        "storyboard_html": str(STORYBOARD_DIR / "index.html"),
        "timeline_json": str(OUT_DIR / "timeline.json"),
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
