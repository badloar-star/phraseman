#!/usr/bin/env python3
"""Build RU->DE Venga from the 19-track template with a fresh background set."""

from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from PIL import Image, ImageFilter, ImageStat


BASE_TARGET = "VENGA A1 200 RU DE VSSCP USER TEMPLATE"
TARGET_DRAFT = "VENGA RU DE NEWBG"
PACK_DIR = Path("exports/venga-phrase-packs/ru-de-a1-vsscp")
OUT_SUBDIR = "venga_ru_de_fresh_semantic_bg"
US = 1_000_000
MIN_PART_US = int(1.5 * US)
MIN_SEQUENCE_SOURCE_DURATION = 2.0
MIN_SOURCE_BITRATE = 1_800_000
OLD_BACKGROUND_TOKENS = (
    "venga_semantic_strict_bg",
    "venga_semantic_strict_noblur_bg",
    "venga_semantic_noblur_open_bg",
    "venga_ru_de_strict_noblur_bg",
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def capcut_is_open() -> bool:
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process | Where-Object { $_.ProcessName -match 'CapCut' } | Select-Object -First 1 -ExpandProperty Id",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    return bool(completed.stdout.strip())


def load_strict_module() -> Any:
    module_path = Path("tools/build_venga_semantic_strict_backgrounds.py")
    spec = importlib.util.spec_from_file_location("strict_bg", module_path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def unique_draft_dir(root: Path, name: str, resume: bool = False) -> Path:
    candidate = root / name
    if resume and candidate.exists():
        return candidate
    if not candidate.exists():
        return candidate
    return root / f"{name} {time.strftime('%Y%m%d_%H%M%S')}"


def source_ids_from_current_bg(draft: dict[str, Any]) -> set[tuple[str, str]]:
    videos = {item["id"]: item for item in draft.get("materials", {}).get("videos", [])}
    banned: set[tuple[str, str]] = set()
    pattern = re.compile(r"_(pexels|pixabay|mixkit|commons)_([^_\\/.]+)_", re.IGNORECASE)
    for segment in draft["tracks"][0]["segments"]:
        material = videos.get(segment.get("material_id"), {})
        path = str(material.get("path") or "")
        match = pattern.search(Path(path).name)
        if match:
            banned.add((match.group(1).lower(), match.group(2)))
    return banned


def source_ids_from_reports() -> set[tuple[str, str]]:
    banned: set[tuple[str, str]] = set()
    reports = [
        Path("exports/venga-phrase-packs/semantic-strict-backgrounds/strict_background_report.json"),
        Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/rerender_semantic_backgrounds_noblur_report.json"),
    ]
    for path in reports:
        if not path.exists():
            continue
        try:
            data = load_json(path)
        except Exception:
            continue

        rows = data.get("rows", []) if isinstance(data, dict) else []
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            selected = row.get("selected") or row.get("source")
            if isinstance(selected, dict) and selected.get("source") and selected.get("source_id"):
                banned.add((str(selected["source"]).lower(), str(selected["source_id"])))
            for item in row.get("sequence_sources", []) or []:
                if not isinstance(item, dict):
                    continue
                selected = item.get("selected")
                if isinstance(selected, dict) and selected.get("source") and selected.get("source_id"):
                    banned.add((str(selected["source"]).lower(), str(selected["source_id"])))
    return banned


def rows_for_backgrounds() -> list[dict[str, str]]:
    rows = load_json(PACK_DIR / "phrase_rows.json")
    out = []
    for row in rows:
        out.append(
            {
                "index": f"{int(row['index']):03d}",
                "en": str(row.get("en_reference") or row.get("de") or "").strip(),
                "ru": str(row.get("ru") or "").strip(),
            }
        )
    if len(out) != 200:
        raise RuntimeError(f"Expected 200 rows, got {len(out)}")
    return out


def ffmpeg_filter_no_blur() -> str:
    return (
        "scale=1920:1080:force_original_aspect_ratio=increase,"
        "crop=1920:1080,"
        "eq=brightness=-0.08:contrast=0.94:saturation=0.96,"
        "fps=30,format=yuv420p"
    )


def render_part(source: Path, output: Path, duration_sec: float) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(source),
            "-t",
            f"{duration_sec:.6f}",
            "-vf",
            ffmpeg_filter_no_blur(),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )


def render_sequence(parts: list[dict[str, Any]], output: Path) -> dict[str, Any]:
    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.parent / f"__tmp_{output.stem[:12]}"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    try:
        rendered: list[Path] = []
        for index, part in enumerate(parts, start=1):
            out = tmp / f"part_{index:02d}.mp4"
            render_part(Path(part["source_path"]), out, float(part["duration_sec"]))
            rendered.append(out)
        concat = tmp / "concat.txt"
        concat.write_text("".join(f"file '{path.as_posix()}'\n" for path in rendered), encoding="utf-8")
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(output)],
            check=True,
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return ffprobe(output)


def ffprobe(path: Path) -> dict[str, Any]:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    data = json.loads(completed.stdout)
    video = next(stream for stream in data["streams"] if stream.get("codec_type") == "video")
    return {
        "width": int(video.get("width") or 0),
        "height": int(video.get("height") or 0),
        "duration": float(data.get("format", {}).get("duration") or video.get("duration") or 0.0),
        "codec": video.get("codec_name"),
        "pix_fmt": video.get("pix_fmt"),
        "bit_rate": int(float(data.get("format", {}).get("bit_rate") or video.get("bit_rate") or 0)),
    }


def sharpness_score(video_path: Path, sample_sec: float = 1.0) -> float:
    frame = PACK_DIR / "fresh_bg_verify_frames" / f"{video_path.stem}.jpg"
    frame.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{sample_sec:.3f}", "-i", str(video_path), "-frames:v", "1", "-q:v", "3", str(frame)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if not frame.exists():
        return 0.0
    image = Image.open(frame).convert("L").resize((320, 180))
    return round(float(ImageStat.Stat(image.filter(ImageFilter.FIND_EDGES)).var[0]), 2)


def is_sequence_source_quality_ok(meta: dict[str, Any] | None) -> bool:
    if not meta:
        return False
    return (
        int(meta["width"]) >= 1920
        and int(meta["height"]) >= 1080
        and int(meta["width"]) >= int(meta["height"])
        and float(meta["duration"]) >= MIN_SEQUENCE_SOURCE_DURATION
        and (int(meta.get("bit_rate") or 0) == 0 or int(meta.get("bit_rate") or 0) >= MIN_SOURCE_BITRATE)
    )


def video_material_from_template(template: dict[str, Any], path: Path, duration_us: int, name: str, strict: Any) -> dict[str, Any]:
    material = dict(template)
    material["id"] = strict.capcut_id()
    material["path"] = str(path)
    material["duration"] = duration_us
    material["name"] = name
    material["material_name"] = name
    material["type"] = "video"
    return material


def pick_sequence(
    *,
    strict: Any,
    session: Any,
    profile: Any,
    duration_us: int,
    banned: set[tuple[str, str]],
    used: set[tuple[str, str]],
    pexels_key: str | None,
    pixabay_key: str | None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    try:
        candidates = strict.collect_candidates(session, profile, pexels_key, pixabay_key)
    except Exception as error:  # noqa: BLE001
        print(f"[fresh-bg] candidate provider error, retrying without Pixabay: {error}", flush=True)
        candidates = strict.collect_candidates(session, profile, pexels_key, None)
    extra_queries: list[str] = []
    concept = str(getattr(profile, "concept", "") or "").casefold()
    phrase = str(getattr(profile, "phrase", "") or "").casefold()
    if "help" in concept or "thank" in phrase:
        extra_queries.extend(["thank you handshake", "people handshake", "team support", "volunteer helping", "helping elderly"])
    if "work" in concept or "office" in concept:
        extra_queries.extend(["office work", "business meeting", "working laptop"])
    if "schedule" in concept or "schedule" in phrase or "calendar" in concept or "plan" in concept or "routine" in concept:
        extra_queries.extend(
            [
                "calendar planner notebook",
                "writing schedule planner",
                "daily schedule calendar",
                "planning day notebook",
                "checking calendar phone",
            ]
        )
    if "solve" in concept or "solve" in phrase or "problem" in concept or "solution" in concept:
        extra_queries.extend(["solving problem notebook", "working on solution", "thinking at desk", "writing plan"])
    if "feel" in concept or "feel" in phrase or "tired" in concept or "air" in concept:
        extra_queries.extend(["person resting", "fresh air outside", "tired person", "wellness breathing"])
    if "walk" in concept or "walk" in phrase or "walking" in concept:
        extra_queries.extend(["person walking alone park", "walking path nature", "feet walking path", "empty park path"])
    if "bank" in concept or "ticket" in concept or "store" in concept or "university" in concept or "park" in concept or "office" in concept or "police" in concept or "station" in concept:
        extra_queries.extend(["city service building", "building entrance", "street sign city", "person near building"])
    if "restaurant" in concept or "restaurant" in phrase:
        extra_queries.extend(["restaurant interior", "restaurant entrance", "restaurant table", "people eating restaurant"])
    if "food" in concept or "fruit" in concept or "breakfast" in concept or "restaurant" in concept:
        extra_queries.extend(["fresh food table", "restaurant meal", "market fruit"])
    if "cook" in concept or "cook" in phrase or "grill" in concept or "grill" in phrase or "barbecue" in concept:
        extra_queries.extend(
            [
                "grill barbecue food",
                "cooking kitchen close up",
                "friends cooking dinner",
                "family cooking kitchen",
                "food on grill",
            ]
        )
    if any(word in concept or word in phrase for word in ["seafood", "pizza", "chicken", "dessert", "ice cream", "pie", "salad", "bread", "corn", "eggs", "soup", "snacks", "dumplings"]):
        extra_queries.extend(["food close up table", "restaurant food close up", "market food"])
    if "phone" in concept or "message" in concept or "call" in concept or "video" in concept:
        extra_queries.extend(["using phone close up", "typing phone message", "watching video phone"])
    if "concert" in concept or "concert" in phrase or "music" in concept or "music" in phrase:
        extra_queries.extend(
            [
                "concert stage crowd",
                "live music concert",
                "musician on stage",
                "audience concert lights",
                "people at concert",
            ]
        )
    if "exhibition" in concept or "exhibition" in phrase or "museum" in concept:
        extra_queries.extend(["art exhibition gallery", "museum exhibition", "people in art gallery"])
    if "party" in concept or "party" in phrase:
        extra_queries.extend(["friends party", "party lights people", "birthday party"])
    if "photo" in concept or "photo" in phrase:
        extra_queries.extend(["looking at photos phone", "taking photos phone", "photo gallery phone"])
    if "home" in concept:
        extra_queries.extend(["person at home", "front door home", "walking home"])
    if "try" in concept or "practice" in concept or "again" in phrase:
        extra_queries.extend(
            [
                "person practicing skill",
                "training practice",
                "learning practice",
                "person writing notebook",
                "starting over work",
                "repeat exercise",
            ]
        )
    if extra_queries:
        seen = {(item.source, item.source_id) for item in candidates}
        for query in extra_queries:
            try:
                discovered = [
                    *strict.discover_pexels(session, query, pexels_key),
                    *strict.discover_pixabay(session, query, pixabay_key),
                    *strict.discover_mixkit(session, query),
                ]
            except Exception as error:  # noqa: BLE001
                print(f"[fresh-bg] extra query provider error for {query}: {error}", flush=True)
                discovered = [*strict.discover_pexels(session, query, pexels_key), *strict.discover_mixkit(session, query)]
            for candidate in discovered:
                key = (candidate.source, candidate.source_id)
                if key not in seen:
                    candidates.append(candidate)
                    seen.add(key)
    scored = []
    fallback_scored = []
    fallback_threshold = max(6, int(profile.min_score) - 4)
    for candidate in candidates:
        key = (candidate.source.lower(), str(candidate.source_id))
        if key in banned or key in used:
            continue
        score, reasons, rejects = strict.score_candidate(profile, candidate)
        if rejects:
            continue
        if score >= profile.min_score:
            scored.append((candidate, score, reasons))
        elif score >= fallback_threshold:
            fallback_scored.append((candidate, score, [*reasons, "fallback-score"]))
        elif extra_queries and score >= 4:
            fallback_scored.append((candidate, score, [*reasons, "expanded-query"]))
    scored.extend(fallback_scored)
    scored.sort(key=lambda item: (-item[1], item[0].source != "pexels", item[0].source != "pixabay", item[0].title))

    failed: list[dict[str, Any]] = []
    sequence: list[dict[str, Any]] = []
    remaining_us = duration_us
    local_used: set[tuple[str, str]] = set()
    for candidate, score, reasons in scored:
        key = (candidate.source.lower(), str(candidate.source_id))
        if key in local_used:
            continue
        downloaded = strict.download_candidate(session, candidate)
        meta = strict.ffprobe(downloaded) if downloaded else None
        if not downloaded or not is_sequence_source_quality_ok(meta):
            failed.append({"candidate": strict.serialize_candidate(candidate), "downloaded": bool(downloaded), "meta": meta, "reason": "quality_or_download"})
            continue
        visual = strict.visual_quality_gate(downloaded, candidate, meta)
        if not visual.get("passed"):
            failed.append(
                {
                    "candidate": strict.serialize_candidate(candidate),
                    "score": score,
                    "meta": meta,
                    "reason": "visual_gate",
                    "visual_reject_reasons": visual.get("reject_reasons", []),
                }
            )
            continue
        safe_us = max(0, int((float(meta["duration"]) - 0.25) * US))
        clip_us = min(remaining_us, safe_us)
        if clip_us < MIN_PART_US and not sequence:
            failed.append({"candidate": strict.serialize_candidate(candidate), "score": score, "meta": meta, "reason": "too_short_for_first_part"})
            continue
        if clip_us <= 0:
            continue
        sequence.append(
            {
                "candidate": candidate,
                "score": score,
                "reasons": reasons,
                "source_path": downloaded,
                "source_meta": meta,
                "visual": visual,
                "duration_us": clip_us,
                "duration_sec": clip_us / US,
            }
        )
        local_used.add(key)
        remaining_us -= clip_us
        if remaining_us <= int(0.1 * US):
            break
    if remaining_us > int(0.1 * US):
        return [], failed
    for part in sequence:
        used.add((part["candidate"].source.lower(), str(part["candidate"].source_id)))
    return sequence, failed


def patch_content_paths(root: Path, draft: dict[str, Any]) -> list[Path]:
    paths = [root / "draft_content.json", root / "template-2.tmp", root / "draft_content.json.bak", root / "Timelines" / draft["id"] / "draft_content.json"]
    out: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path.resolve()).casefold()
        if path.exists() and key not in seen:
            out.append(path)
            seen.add(key)
    return out


def segment_material_ids(segment: dict[str, Any]) -> list[str]:
    material_id = segment.get("material_id")
    if isinstance(material_id, str):
        return [material_id]
    if isinstance(material_id, list):
        return [item for item in material_id if isinstance(item, str)]
    return []


def material_path(material: dict[str, Any]) -> str:
    for key in ("path", "media_path", "file_Path", "file_path"):
        value = material.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def localize_material_paths(source_dir: Path, target_dir: Path, draft: dict[str, Any]) -> int:
    source_prefix = (source_dir / "Resources").as_posix().casefold() + "/"
    target_prefix = (target_dir / "Resources").as_posix() + "/"
    changed = 0
    for materials in draft.get("materials", {}).values():
        if not isinstance(materials, list):
            continue
        for material in materials:
            if not isinstance(material, dict):
                continue
            for key in ("path", "media_path", "file_Path", "file_path"):
                value = material.get(key)
                if not isinstance(value, str) or not value:
                    continue
                normalized = value.replace("\\", "/")
                if not normalized.casefold().startswith(source_prefix):
                    continue
                candidate = target_prefix + normalized[len(source_prefix):]
                if Path(candidate).exists():
                    material[key] = candidate.replace("/", "\\") if key != "file_Path" else candidate
                    changed += 1
    return changed


def prune_stale_background_video_materials(draft: dict[str, Any]) -> int:
    used: set[str] = set()
    for track in draft.get("tracks", []):
        for segment in track.get("segments", []):
            used.update(segment_material_ids(segment))
            used.update(ref for ref in segment.get("extra_material_refs", []) if isinstance(ref, str))

    videos = draft.get("materials", {}).get("videos", [])
    if not isinstance(videos, list):
        return 0
    before = len(videos)
    draft["materials"]["videos"] = [
        material
        for material in videos
        if material.get("id") in used
        or not any(token in material_path(material).replace("\\", "/") for token in OLD_BACKGROUND_TOKENS)
    ]
    return before - len(draft["materials"]["videos"])


def sync_draft_meta_materials(draft_dir: Path, draft: dict[str, Any]) -> dict[str, int]:
    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    groups = meta.setdefault("draft_materials", [])
    removed_old = 0
    existing: set[str] = set()
    for group in groups:
        values = []
        for item in group.get("value", []) or []:
            path = str(item.get("file_Path") or "")
            if any(token in path.replace("\\", "/") for token in OLD_BACKGROUND_TOKENS):
                removed_old += 1
                continue
            if path:
                existing.add(path.replace("\\", "/").casefold())
            values.append(item)
        group["value"] = values

    type0 = next((group for group in groups if group.get("type") == 0), None)
    if type0 is None:
        type0 = {"type": 0, "value": []}
        groups.insert(0, type0)

    materials_by_id: dict[str, dict[str, Any]] = {}
    for material_group in draft.get("materials", {}).values():
        if isinstance(material_group, list):
            for material in material_group:
                if isinstance(material, dict) and material.get("id"):
                    materials_by_id[material["id"]] = material

    added = 0
    for track in draft.get("tracks", []):
        for segment in track.get("segments", []):
            for material_id in segment_material_ids(segment):
                material = materials_by_id.get(material_id, {})
                path = material_path(material)
                suffix = Path(path).suffix.lower()
                if suffix not in {".mp4", ".wav", ".mp3", ".m4a", ".aac"}:
                    continue
                key = path.replace("\\", "/").casefold()
                if key in existing:
                    continue
                duration = int(material.get("duration") or segment.get("target_timerange", {}).get("duration") or 0)
                is_video = suffix == ".mp4"
                type0["value"].append(
                    {
                        "ai_group_type": "",
                        "create_time": -1,
                        "duration": duration,
                        "enter_from": 0,
                        "extra_info": Path(path).name,
                        "file_Path": path.replace("\\", "/"),
                        "height": int(material.get("height") or 0) if is_video else 0,
                        "id": material_id,
                        "import_time": -1,
                        "import_time_ms": -1,
                        "item_source": 1,
                        "md5": "",
                        "metetype": "video" if is_video else "music",
                        "roughcut_time_range": {"duration": duration, "start": 0},
                        "sub_time_range": {"duration": -1, "start": -1},
                        "type": 0,
                        "width": int(material.get("width") or 0) if is_video else 0,
                    }
                )
                existing.add(key)
                added += 1
    write_json(meta_path, meta)
    return {"removed_old_meta_refs": removed_old, "added_meta_refs": added}


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> None:
    now_us = int(time.time() * US)
    project_id = str(__import__("uuid").uuid4()).upper()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us
    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
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
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "draft_timeline_materials_size": sum(file.stat().st_size for file in (draft_dir / "Resources").rglob("*") if file.is_file()),
            "draft_timeline_materials_size_": sum(file.stat().st_size for file in (draft_dir / "Resources").rglob("*") if file.is_file()),
        }
    )
    write_json(meta_path, meta)
    root_meta_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_meta_path)
    shutil.copy2(root_meta_path, root_meta_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}"))
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": meta["draft_timeline_materials_size"],
        "draft_type": "",
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
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_json(root_meta_path, root)


def main() -> int:
    if capcut_is_open():
        print("[fresh-bg] CapCut is open; creating a separate draft, then user must restart CapCut.", flush=True)
    strict = load_strict_module()
    env = {**strict.load_env_file(Path(".env.local")), **os.environ}
    pexels_key = env.get("PEXELS_API_KEY")
    pixabay_key = env.get("PIXABAY_API_KEY")
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / BASE_TARGET
    if not source_dir.exists():
        raise RuntimeError(f"Base German draft not found: {source_dir}")
    # Every run must build a new project/background set. Reusing the previous
    # target folder or rendered mp4s can silently carry old phrase backgrounds.
    target_dir = unique_draft_dir(capcut_root, TARGET_DRAFT, resume=False)
    if not target_dir.exists():
        shutil.copytree(source_dir, target_dir)
    if (target_dir / ".locked").exists():
        (target_dir / ".locked").unlink()
    draft = load_json(target_dir / "draft_content.json")
    localized_paths = localize_material_paths(source_dir, target_dir, draft)
    banned = source_ids_from_current_bg(draft) | source_ids_from_reports()
    rows = rows_for_backgrounds()
    session = strict.requests.Session()
    bg_track = draft["tracks"][0]
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    template_material = videos[bg_track["segments"][0]["material_id"]]
    render_subdir = f"{OUT_SUBDIR}_{time.strftime('%Y%m%d_%H%M%S')}"
    render_dir = target_dir / "Resources" / render_subdir
    render_dir.mkdir(parents=True, exist_ok=True)
    used: set[tuple[str, str]] = set()
    new_materials = []
    report_rows = []

    for index, (row, segment) in enumerate(zip(rows, bg_track["segments"], strict=True), start=1):
        profile = strict.profile_for_phrase(row["en"])
        duration_us = int(segment["target_timerange"]["duration"])
        sequence, failed = pick_sequence(
            strict=strict,
            session=session,
            profile=profile,
            duration_us=duration_us,
            banned=banned,
            used=used,
            pexels_key=pexels_key,
            pixabay_key=pixabay_key,
        )
        if not sequence:
            raise RuntimeError(f"No fresh semantic background for {index:03d} {row['en']}. Failed sample: {failed[:8]}")
        primary = sequence[0]["candidate"]
        output = render_dir / f"{index:03d}_{primary.source}_{primary.source_id}_fresh.mp4"
        rendered_meta = render_sequence(sequence, output)
        score = sharpness_score(output)
        material = video_material_from_template(template_material, output, duration_us, output.name, strict)
        new_materials.append(material)
        segment["material_id"] = material["id"]
        segment["source_timerange"] = {"start": 0, "duration": duration_us}
        segment["is_loop"] = False
        report_rows.append(
            {
                "index": f"{index:03d}",
                "en": row["en"],
                "ru": row["ru"],
                "rendered_path": str(output),
                "rendered_meta": rendered_meta,
                "sharpness_score": score,
                "sequence_sources": [
                    {
                        "selected": strict.serialize_candidate(item["candidate"]),
                        "score": item["score"],
                        "clip_duration_sec": round(item["duration_sec"], 3),
                        "source_meta": item["source_meta"],
                        "visual_summary": item["visual"].get("summary", {}),
                    }
                    for item in sequence
                ],
                "failed_runtime_candidates": failed[:12],
            }
        )
        if index % 10 == 0:
            print(f"[fresh-bg] rendered {index}/200", flush=True)

    draft["materials"]["videos"].extend(new_materials)
    pruned_stale_videos = prune_stale_background_video_materials(draft)
    for path in patch_content_paths(target_dir, draft):
        write_json(path, draft)
    update_identity_and_register(target_dir, draft)
    meta_sync = sync_draft_meta_materials(target_dir, draft)
    unique_sources = {
        (src["selected"]["source"], src["selected"]["source_id"])
        for row in report_rows
        for src in row["sequence_sources"]
    }
    repeated_old = sorted(unique_sources & banned)
    low_sharp = [row for row in report_rows if float(row["sharpness_score"]) < 180.0]
    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_draft": str(source_dir),
        "rows": report_rows,
        "background_count": len(report_rows),
        "unique_source_count": len(unique_sources),
        "banned_source_count": len(banned),
        "reused_banned_sources": repeated_old,
        "low_sharpness_count_lt_180": len(low_sharp),
        "low_sharpness_sample": low_sharp[:10],
        "pexels_enabled": bool(pexels_key),
        "pixabay_enabled": bool(pixabay_key),
        "render_subdir": render_subdir,
        "localized_template_media_paths": localized_paths,
        "pruned_stale_background_video_materials": pruned_stale_videos,
        **meta_sync,
    }
    out = PACK_DIR / "fresh_background_build_report.json"
    write_pretty(out, report)
    print(json.dumps({k: v for k, v in report.items() if k != "rows"}, ensure_ascii=False, indent=2))
    if repeated_old:
        raise RuntimeError(f"Fresh background gate failed: reused old sources {repeated_old[:10]}")
    if low_sharp:
        raise RuntimeError(f"Fresh background gate failed: low sharpness {len(low_sharp)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
