from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any

import requests


US = 1_000_000
SOURCE_DRAFT_NAME = os.environ.get("VENGA_SOURCE_DRAFT", "VENGA A1 200 OPENAI FIRST EN AUDIO FIX")
TARGET_DRAFT_NAME = os.environ.get("VENGA_TARGET_DRAFT", "VENGA A1 200 OPENAI SEMANTIC OPEN BG")
OUT_DIR = Path("exports/venga-phrase-packs/semantic-open-backgrounds")
SOURCE_CACHE = OUT_DIR / "source_cache"
RENDER_SUBDIR = "venga_semantic_open_bg"
MIXKIT_LICENSE_URL = "https://mixkit.co/license/#videoFree"

BAD_ASSET_IDS = {
    "241", "42633", "28286", "28300", "1240", "44737", "4688", "50816", "52076",
    "34435", "34048", "9356", "33335", "29999", "4762", "5339", "29030", "24011",
    "15871", "22965", "41930", "41931", "47005", "32458", "23477",
}

MANUAL_ASSETS = {
    "41859": "coffee",
    "236": "coffee",
    "41858": "coffee",
    "13766": "coffee",
    "814": "coffee",
    "5072": "coffee",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_capcut_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def unique_draft_dir(root: Path, base_name: str) -> Path:
    candidate = root / base_name
    if not candidate.exists():
        return candidate
    return root / f"{base_name} {time.strftime('%Y%m%d_%H%M%S')}"


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def capcut_text(material: dict[str, Any]) -> str:
    try:
        return str(json.loads(material.get("content") or "{}").get("text") or material.get("base_content") or "")
    except json.JSONDecodeError:
        return str(material.get("base_content") or "")


def phrase_rows(draft: dict[str, Any]) -> list[dict[str, str]]:
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    rows: list[dict[str, str]] = []
    for index, en_segment in enumerate(draft["tracks"][8]["segments"], start=1):
        ru_segment = draft["tracks"][6]["segments"][index - 1]
        rows.append(
            {
                "index": f"{index:03d}",
                "en": capcut_text(texts[en_segment["material_id"]]).replace("\n", " ").strip(),
                "ru": capcut_text(texts[ru_segment["material_id"]]).replace("\n", " ").strip(),
            }
        )
    return rows


def load_known_assets() -> dict[str, str]:
    assets: dict[str, str] = {}
    for path in [Path(".codex-tmp/mixkit_known_assets.json"), OUT_DIR / "mixkit_known_assets.json"]:
        if path.exists():
            assets.update({str(k): str(v) for k, v in load_json(path).items()})
    if not assets:
        for path in Path("exports").rglob("*"):
            if path.suffix.lower() not in {".json", ".html"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for match in re.finditer(r"mixkit_(\d+)_([A-Za-z0-9_-]+)", text):
                assets[match.group(1)] = match.group(2)
            for match in re.finditer(r"https://assets\.mixkit\.co/videos/(\d+)/\1-\d+\.mp4", text):
                assets.setdefault(match.group(1), "general")
    assets.update(MANUAL_ASSETS)
    return {asset_id: category for asset_id, category in assets.items() if asset_id not in BAD_ASSET_IDS}


def categories_for_phrase(phrase: str) -> tuple[list[str], str]:
    text = phrase.casefold()
    checks: list[tuple[tuple[str, ...], list[str], str]] = [
        (("wake", "early", "morning"), ["coffee", "home", "sun", "city"], "morning / waking up"),
        (("water",), ["water", "coffee", "food"], "drinking water"),
        (("coffee", "tea"), ["coffee", "food", "restaurant"], "drink / cafe"),
        (("breakfast", "eat", "hungry", "food", "dinner", "bread"), ["food", "coffee", "business"], "food / meal"),
        (("work", "office", "email"), ["office", "work", "business", "laptop"], "work / office"),
        (("home", "room", "door", "window"), ["home", "house", "office"], "home / room"),
        (("bus", "train", "ticket", "car", "arrive"), ["bus", "car", "city", "technology"], "transport"),
        (("phone", "text", "call", "hear", "see"), ["phone", "smartphone", "call", "device"], "phone / communication"),
        (("music", "song"), ["music", "smartphone", "technology"], "music"),
        (("movie", "video", "watching"), ["movie", "internet", "technology"], "video / movie"),
        (("book", "english", "study", "learn", "question", "answer", "repeat", "slowly", "say"), ["book", "office", "laptop"], "learning"),
        (("store", "buy", "pay", "card", "money", "expensive", "gift"), ["store", "shopping", "business"], "shopping / money"),
        (("park", "sports"), ["car", "sun", "city", "gaming"], "park / sports"),
        (("birthday", "sister", "brother", "friend", "mom", "people", "together", "meet"), ["friend", "business", "home"], "people / family"),
        (("cold",), ["cold", "winter", "city"], "cold"),
        (("hot", "heat"), ["hot", "sun", "city"], "hot"),
        (("sleep", "tired", "late", "quiet"), ["tired", "home", "night"], "tired / quiet"),
        (("beautiful", "new", "old", "style", "look"), ["fashion", "city", "smartphone"], "look / style"),
        (("sad", "crying", "laughing", "strange"), ["friend", "woman", "business"], "emotion"),
        (("help", "understand", "important", "ready", "start", "finish", "try", "changed"), ["business", "office", "work"], "abstract everyday action"),
    ]
    chosen: list[str] = []
    reasons: list[str] = []
    for words, categories, reason in checks:
        if any(word in text for word in words):
            chosen.extend(categories)
            reasons.append(reason)
    if not chosen:
        chosen = ["city", "business", "office", "smartphone", "home"]
        reasons = ["general everyday scene"]
    chosen.extend(["business", "city", "technology", "office", "home"])
    deduped = list(dict.fromkeys(chosen))
    return deduped, " + ".join(reasons[:2])


def asset_url(asset_id: str, resolution: int = 720) -> str:
    return f"https://assets.mixkit.co/videos/{asset_id}/{asset_id}-{resolution}.mp4"


def download_asset(asset_id: str, category: str) -> Path | None:
    SOURCE_CACHE.mkdir(parents=True, exist_ok=True)
    for resolution in [720, 1080]:
        out = SOURCE_CACHE / f"mixkit_{asset_id}_{category}_{resolution}.mp4"
        if out.exists() and out.stat().st_size > 100_000:
            return out
        url = asset_url(asset_id, resolution)
        try:
            with requests.get(url, stream=True, timeout=90, headers={"User-Agent": "Mozilla/5.0"}) as response:
                if response.status_code != 200:
                    continue
                with out.open("wb") as handle:
                    for chunk in response.iter_content(chunk_size=1024 * 512):
                        if chunk:
                            handle.write(chunk)
            if out.exists() and out.stat().st_size > 100_000:
                return out
        except requests.RequestException:
            continue
    return None


def ffprobe(path: Path) -> dict[str, Any] | None:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                str(path),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        data = json.loads(result.stdout)
        video = next(stream for stream in data["streams"] if stream.get("codec_type") == "video")
        return {
            "width": int(video.get("width") or 0),
            "height": int(video.get("height") or 0),
            "duration": float(data.get("format", {}).get("duration") or video.get("duration") or 0.0),
            "codec": video.get("codec_name"),
        }
    except Exception:
        return None


def is_hd_landscape(meta: dict[str, Any] | None) -> bool:
    if not meta:
        return False
    return int(meta["width"]) >= 1280 and int(meta["height"]) >= 720 and float(meta["duration"]) >= 2.0


def render_background(source: Path, output: Path, duration_us: int) -> dict[str, Any]:
    duration = duration_us / US
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
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
            f"{duration:.6f}",
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "28",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )
    meta = ffprobe(output)
    if not meta or meta["width"] != 1920 or meta["height"] != 1080 or meta["duration"] + 0.05 < duration:
        raise RuntimeError(f"Rendered background failed quality gate: {output} -> {meta}")
    return meta


def choose_assets(rows: list[dict[str, str]], asset_categories: dict[str, str]) -> list[dict[str, Any]]:
    by_category: dict[str, list[str]] = {}
    for asset_id, category in asset_categories.items():
        by_category.setdefault(category, []).append(asset_id)
    for ids in by_category.values():
        ids.sort()
    all_ids = sorted(asset_categories)
    used: set[str] = set()
    selections: list[dict[str, Any]] = []
    cursor = 0
    for row in rows:
        categories, reason = categories_for_phrase(row["en"])
        candidates: list[str] = []
        for category in categories:
            candidates.extend(by_category.get(category, []))
        candidates.extend(all_ids)
        selected = next((asset_id for asset_id in candidates if asset_id not in used), None)
        repeated = False
        if selected is None:
            selected = candidates[cursor % len(candidates)]
            cursor += 1
            repeated = True
        used.add(selected)
        selections.append(
            {
                **row,
                "asset_id": selected,
                "category": asset_categories[selected],
                "semantic_categories": categories,
                "semantic_reason": reason,
                "repeated_source_asset": repeated,
            }
        )
    return selections


def video_material_from_template(template: dict[str, Any], path: Path, duration_us: int, name: str) -> dict[str, Any]:
    material = deepcopy(template)
    material["id"] = capcut_id()
    material["unique_id"] = capcut_id()
    material["path"] = str(path)
    material["name"] = name
    material["material_name"] = name
    material["duration"] = duration_us
    material["width"] = 1920
    material["height"] = 1080
    material["has_audio"] = False
    return material


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> None:
    now_us = int(time.time() * US)
    project_id = capcut_id()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us

    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    size = folder_size(draft_dir / "Resources")
    meta.update(
        {
            "draft_id": project_id,
            "draft_name": draft_dir.name,
            "draft_fold_path": draft_dir.as_posix(),
            "draft_root_path": draft_dir.parent.as_posix(),
            "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
            "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
            "draft_is_invisible": False,
            "streaming_edit_draft_ready": True,
            "tm_duration": draft["duration"],
            "tm_draft_modified": now_us,
            "draft_timeline_materials_size": size,
            "draft_timeline_materials_size_": size,
            "tm_draft_removed": 0,
        }
    )
    write_capcut_json(meta_path, meta)

    root_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_path)
    entry = {
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": size,
        "streaming_edit_draft_ready": True,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": draft["duration"],
    }
    root["all_draft_store"] = [
        entry,
        *[
            item
            for item in root.get("all_draft_store", [])
            if item.get("draft_name") != draft_dir.name
            and Path(str(item.get("draft_fold_path", ""))).as_posix().casefold() != draft_dir.as_posix().casefold()
            and item.get("draft_id") != project_id
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_capcut_json(root_path, root)


def main() -> None:
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / SOURCE_DRAFT_NAME
    if not source_dir.exists():
        raise SystemExit(f"Source draft does not exist: {source_dir}")
    target_dir = unique_draft_dir(capcut_root, TARGET_DRAFT_NAME)
    shutil.copytree(source_dir, target_dir)

    draft = load_json(target_dir / "draft_content.json")
    rows = phrase_rows(draft)
    asset_categories = load_known_assets()
    write_json(OUT_DIR / "mixkit_known_assets.json", asset_categories)
    selections = choose_assets(rows, asset_categories)

    bg_track = draft["tracks"][0]
    old_video_ids = {seg["material_id"] for seg in bg_track["segments"]}
    video_template = next(item for item in draft["materials"]["videos"] if item.get("id") in old_video_ids)
    render_dir = target_dir / "Resources" / RENDER_SUBDIR
    report_rows: list[dict[str, Any]] = []
    new_materials: list[dict[str, Any]] = []
    invalid_assets: set[str] = set()

    for index, (segment, selection) in enumerate(zip(bg_track["segments"], selections, strict=True), start=1):
        duration_us = int(segment["target_timerange"]["duration"])
        candidate = selection
        attempts = 0
        source_path: Path | None = None
        source_meta: dict[str, Any] | None = None
        while attempts < len(selections) + 1:
            attempts += 1
            asset_id = candidate["asset_id"]
            if asset_id in invalid_assets:
                candidate = selections[(index + attempts) % len(selections)]
                continue
            downloaded = download_asset(asset_id, candidate["category"])
            source_meta = ffprobe(downloaded) if downloaded else None
            if downloaded and is_hd_landscape(source_meta):
                source_path = downloaded
                break
            invalid_assets.add(asset_id)
            candidate = selections[(index + attempts) % len(selections)]
        if source_path is None or source_meta is None:
            raise RuntimeError(f"No valid HD source found for phrase {index}")

        clip_name = f"{index:03d}_mixkit_{candidate['asset_id']}_{candidate['category']}.mp4"
        output_path = render_dir / clip_name
        rendered_meta = render_background(source_path, output_path, duration_us)
        material = video_material_from_template(video_template, output_path, duration_us, clip_name)
        new_materials.append(material)
        segment["material_id"] = material["id"]
        segment["source_timerange"] = {"start": 0, "duration": duration_us}
        segment["is_loop"] = False
        report_rows.append(
            {
                **selection,
                "final_asset_id": candidate["asset_id"],
                "final_category": candidate["category"],
                "source_url": asset_url(candidate["asset_id"], 720),
                "page_url": f"https://mixkit.co/free-stock-video/{candidate['category']}/",
                "license": "Mixkit Video Free License",
                "license_url": MIXKIT_LICENSE_URL,
                "source_path": str(source_path),
                "rendered_path": str(output_path),
                "target_start_sec": round(segment["target_timerange"]["start"] / US, 3),
                "target_duration_sec": round(duration_us / US, 3),
                "source_meta": source_meta,
                "rendered_meta": rendered_meta,
            }
        )
        if index % 10 == 0:
            print(f"[semantic-bg] rendered {index}/200", flush=True)

    draft["materials"]["videos"].extend(new_materials)

    for rel in ["draft_content.json", "template-2.tmp", "draft_content.json.bak"]:
        path = target_dir / rel
        if path.exists():
            write_capcut_json(path, draft)
    timeline_content = target_dir / "Timelines" / draft["id"] / "draft_content.json"
    if timeline_content.exists():
        write_capcut_json(timeline_content, draft)
    update_identity_and_register(target_dir, draft)

    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_template": str(source_dir),
        "changed_tracks": [0],
        "preserved_tracks": list(range(1, len(draft["tracks"]))),
        "phrase_count": len(report_rows),
        "unique_source_assets": len({row["final_asset_id"] for row in report_rows}),
        "repeated_source_asset_count": len(report_rows) - len({row["final_asset_id"] for row in report_rows}),
        "quality_gate": {
            "rendered_1920x1080": all(row["rendered_meta"]["width"] == 1920 and row["rendered_meta"]["height"] == 1080 for row in report_rows),
            "source_min_720p_landscape": all(row["source_meta"]["width"] >= 1280 and row["source_meta"]["height"] >= 720 for row in report_rows),
            "missing_paths": 0,
        },
        "rows": report_rows,
    }
    write_json(OUT_DIR / "semantic_background_report.json", report)
    print(json.dumps({k: v for k, v in report.items() if k != "rows"}, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
