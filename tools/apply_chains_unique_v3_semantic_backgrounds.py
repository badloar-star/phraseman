#!/usr/bin/env python3
"""Find, render, and apply direct semantic backgrounds for Chains unique v3."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import time
import urllib.parse
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any

import requests


US = 1_000_000
PACK = Path("exports/chains/phrase_packs/chains_800_unique_v3_20260604")
PROFILES_PATH = PACK / "semantic_backgrounds" / "chains_unique_v3_background_profiles.json"
CAPCUT_REPORT = Path(os.environ.get("CHAINS_UNIQUE_V3_CAPCUT_REPORT", PACK / "capcut_build" / "chains_unique_v3_capcut_parts_report.json"))
OUT = PACK / "semantic_backgrounds"
QUERY_CACHE = OUT / "query_cache"
SOURCE_CACHE = OUT / "source_videos"
RENDER_DIR = OUT / "rendered_1920x1080"
REPORT = Path(os.environ.get("CHAINS_UNIQUE_V3_BG_REPORT", OUT / "chains_unique_v3_semantic_background_apply_report.json"))
PARTIAL = Path(os.environ.get("CHAINS_UNIQUE_V3_BG_PARTIAL", OUT / "chains_unique_v3_semantic_background_apply.partial.json"))
MAX_SOURCE_REUSE = 8
MIN_WIDTH = 1920
MIN_HEIGHT = 1080
MIN_BITRATE = 1_200_000
NEGATIVE_TERMS = {
    "abstract", "animation", "cartoon", "green screen", "template", "logo",
    "vertical", "screen recording", "coding", "programming", "robot", "mockup",
}


def gid() -> str:
    return str(uuid.uuid4()).upper()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def cache_key(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def request_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
    cache = QUERY_CACHE / f"{cache_key(url)}.json"
    if cache.exists():
        return load_json(cache)
    response = requests.get(url, headers=headers or {}, timeout=45)
    response.raise_for_status()
    data = response.json()
    write_pretty(cache, data)
    return data


def pexels_candidates(query: str, key: str) -> list[dict[str, Any]]:
    if not key:
        return []
    params = urllib.parse.urlencode({"query": query, "orientation": "landscape", "size": "large", "per_page": 12})
    data = request_json(f"https://api.pexels.com/videos/search?{params}", {"Authorization": key})
    out = []
    for item in data.get("videos", []) or []:
        files = [
            file for file in item.get("video_files", []) or []
            if file.get("link") and int(file.get("width") or 0) >= MIN_WIDTH and int(file.get("height") or 0) >= MIN_HEIGHT
        ]
        files.sort(key=lambda file: int(file.get("width") or 0) * int(file.get("height") or 0), reverse=True)
        if not files:
            continue
        out.append(
            {
                "provider": "pexels",
                "source_id": str(item.get("id")),
                "title": str(item.get("url") or query),
                "page_url": str(item.get("url") or ""),
                "query": query,
                "url": files[0]["link"],
                "duration": float(item.get("duration") or 0),
            }
        )
    return out


def pixabay_candidates(query: str, key: str) -> list[dict[str, Any]]:
    if not key:
        return []
    params = urllib.parse.urlencode({"key": key, "q": query, "video_type": "film", "orientation": "horizontal", "per_page": 12, "safesearch": "true"})
    data = request_json(f"https://pixabay.com/api/videos/?{params}")
    out = []
    for item in data.get("hits", []) or []:
        videos = item.get("videos") or {}
        options = [
            video for video in videos.values()
            if video.get("url") and int(video.get("width") or 0) >= MIN_WIDTH and int(video.get("height") or 0) >= MIN_HEIGHT
        ]
        options.sort(key=lambda video: int(video.get("width") or 0) * int(video.get("height") or 0), reverse=True)
        if not options:
            continue
        out.append(
            {
                "provider": "pixabay",
                "source_id": str(item.get("id")),
                "title": str(item.get("tags") or query),
                "page_url": str(item.get("pageURL") or ""),
                "query": query,
                "url": options[0]["url"],
                "duration": float(item.get("duration") or 0),
            }
        )
    return out


def candidate_score(candidate: dict[str, Any], profile: dict[str, Any], query: str, slot_sec: float) -> int:
    text = f"{candidate.get('title','')} {candidate.get('page_url','')} {candidate.get('query','')}".casefold()
    if any(term in text for term in NEGATIVE_TERMS):
        return -999
    terms = [term for term in re.split(r"[^a-z0-9]+", f"{profile['visual_anchor']} {query}".casefold()) if len(term) > 2]
    score = sum(3 for term in terms if term in text)
    if float(candidate.get("duration") or 0) >= slot_sec:
        score += 4
    if candidate["provider"] == "pexels":
        score += 1
    return score


def ffprobe(path: Path) -> dict[str, Any] | None:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        data = json.loads(result.stdout)
        stream = next(item for item in data["streams"] if item.get("codec_type") == "video")
        return {
            "width": int(stream.get("width") or 0),
            "height": int(stream.get("height") or 0),
            "duration": float(data.get("format", {}).get("duration") or stream.get("duration") or 0),
            "codec": stream.get("codec_name"),
            "pix_fmt": stream.get("pix_fmt"),
            "bit_rate": int(float(data.get("format", {}).get("bit_rate") or stream.get("bit_rate") or 0)),
        }
    except Exception:
        return None


def quality_ok(meta: dict[str, Any] | None, slot_sec: float) -> tuple[bool, str]:
    if not meta:
        return False, "ffprobe_failed"
    if meta["width"] < MIN_WIDTH or meta["height"] < MIN_HEIGHT:
        return False, f"low_resolution:{meta['width']}x{meta['height']}"
    if meta["width"] < meta["height"]:
        return False, "vertical"
    if meta["duration"] < slot_sec:
        return False, f"too_short:{meta['duration']:.2f}<{slot_sec:.2f}"
    if meta["bit_rate"] and meta["bit_rate"] < MIN_BITRATE:
        return False, f"low_bitrate:{meta['bit_rate']}"
    return True, "ok"


def download(candidate: dict[str, Any]) -> Path | None:
    source_id = re.sub(r"[^A-Za-z0-9_-]+", "_", candidate["source_id"])
    path = SOURCE_CACHE / candidate["provider"] / f"{source_id}.mp4"
    if path.exists() and path.stat().st_size > 1_000_000:
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".download")
    try:
        with requests.get(candidate["url"], stream=True, timeout=180, headers={"User-Agent": "PhrasemanChains/1.0"}) as response:
            response.raise_for_status()
            with tmp.open("wb") as handle:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        handle.write(chunk)
        tmp.replace(path)
        return path
    except Exception:
        if tmp.exists():
            tmp.unlink()
        return None


def discover(profile: dict[str, Any], pexels_key: str, pixabay_key: str, used_counts: dict[str, int], slot_sec: float) -> dict[str, Any]:
    failures = []
    for query in profile["search_queries"]:
        candidates = pexels_candidates(query, pexels_key) + pixabay_candidates(query, pixabay_key)
        candidates.sort(key=lambda item: (-candidate_score(item, profile, query, slot_sec), item["provider"] != "pexels", item["source_id"]))
        for candidate in candidates:
            key = f"{candidate['provider']}:{candidate['source_id']}"
            if used_counts.get(key, 0) >= MAX_SOURCE_REUSE:
                failures.append({"key": key, "reason": "reuse_limit"})
                continue
            if candidate_score(candidate, profile, query, slot_sec) < 3:
                failures.append({"key": key, "reason": "weak_metadata"})
                continue
            source = download(candidate)
            if not source:
                failures.append({"key": key, "reason": "download_failed"})
                continue
            meta = ffprobe(source)
            ok, reason = quality_ok(meta, slot_sec)
            if not ok:
                failures.append({"key": key, "reason": reason})
                continue
            used_counts[key] = used_counts.get(key, 0) + 1
            return {"profile": profile, "candidate": candidate, "key": key, "source": str(source), "source_meta": meta, "query": query, "failures": failures[:8]}
    raise RuntimeError(f"No semantic background for row {profile['index']}: {profile['visual_anchor']} failures={failures[:8]}")


def render_background(index: int, assignment: dict[str, Any], duration_us: int) -> Path:
    source = Path(assignment["source"])
    duration_sec = duration_us / US
    source_id = re.sub(r"[^A-Za-z0-9_-]+", "_", assignment["candidate"]["source_id"])
    target = RENDER_DIR / f"{index:03d}_{assignment['candidate']['provider']}_{source_id}.mp4"
    if target.exists() and target.stat().st_size > 1_000_000:
        meta = ffprobe(target)
        if meta and meta["duration"] >= duration_sec - 0.05 and meta["width"] == 1920 and meta["height"] == 1080:
            return target
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(source), "-t", f"{duration_sec:.3f}",
            "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p",
            "-an", "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", str(target),
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return target


def clone_video_material(template: dict[str, Any], path: Path, duration: int) -> dict[str, Any]:
    out = deepcopy(template)
    out["id"] = gid()
    if "unique_id" in out:
        out["unique_id"] = gid()
    if "local_material_id" in out:
        out["local_material_id"] = gid().lower()
    out.update({"path": str(path), "media_path": str(path), "name": path.name, "material_name": path.name, "duration": duration, "has_audio": False, "width": 1920, "height": 1080})
    return out


def material_map(content: dict[str, Any], group: str) -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in content.get("materials", {}).get(group, []) if item.get("id")}


def sorted_bg(content: dict[str, Any]) -> list[dict[str, Any]]:
    return sorted(content["tracks"][0].get("segments", []), key=lambda seg: int(seg["target_timerange"]["start"]))


def localize(project: Path, src: Path, index: int) -> Path:
    dst = project / "Resources" / "chains_unique_v3_semantic_bg" / f"{index:03d}_{src.name}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists() or dst.stat().st_size != src.stat().st_size:
        shutil.copy2(src, dst)
    return dst


def apply_to_project(part: dict[str, Any], assignments: dict[int, dict[str, Any]]) -> dict[str, Any]:
    project = Path(part["target"])
    content = load_json(project / "draft_content.json")
    bg = sorted_bg(content)
    videos = material_map(content, "videos")
    changed = 0
    rows_start, rows_end = part["rows"]
    row_count = rows_end - rows_start + 1
    expected_segments = row_count * 2
    if len(bg) < expected_segments:
        raise RuntimeError(f"{project.name}: background track has {len(bg)} segments, expected at least {expected_segments}")
    for half_offset in (0, row_count):
        for local_idx, row_index in enumerate(range(rows_start, rows_end + 1)):
            seg = bg[half_offset + local_idx]
            start = int(seg["target_timerange"]["start"])
            duration = int(seg["target_timerange"]["duration"])
            assignment = assignments[row_index]
            rendered = Path(assignment["rendered_path"])
            local = localize(project, rendered, row_index)
            template = videos[seg["material_id"]]
            mat = clone_video_material(template, local, duration)
            content["materials"]["videos"].append(mat)
            seg["material_id"] = mat["id"]
            seg["target_timerange"] = {"start": start, "duration": duration}
            seg["source_timerange"] = {"start": 0, "duration": duration}
            if seg.get("render_timerange") is not None:
                seg["render_timerange"] = {"start": start, "duration": duration}
            changed += 1
    write_json(project / "draft_content.json", content)
    if (project / "template-2.tmp").exists():
        write_json(project / "template-2.tmp", content)
    timelines = project / "Timelines"
    if timelines.exists():
        for mirror in timelines.glob("*/draft_content.json"):
            write_json(mirror, content)
    return {"project": project.name, "changed_background_segments": changed}


def row_slot_durations(parts: list[dict[str, Any]]) -> dict[int, int]:
    out: dict[int, int] = {}
    for part in parts:
        content = load_json(Path(part["target"]) / "draft_content.json")
        bg = sorted_bg(content)
        rows_start, rows_end = part["rows"]
        for local_idx, row_index in enumerate(range(rows_start, rows_end + 1)):
            duration = max(int(bg[local_idx]["target_timerange"]["duration"]), int(bg[400 + local_idx]["target_timerange"]["duration"]))
            out[row_index] = duration
    return out


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing draft files.")
    env = load_env()
    pexels_key = env.get("PEXELS_API_KEY", "")
    pixabay_key = env.get("PIXABAY_API_KEY", "")
    if not pexels_key and not pixabay_key:
        raise RuntimeError("PEXELS_API_KEY or PIXABAY_API_KEY is required")
    capcut_report = load_json(CAPCUT_REPORT)
    profiles = {int(item["index"]): item for item in load_json(PROFILES_PATH)["profiles"]}
    durations = row_slot_durations(capcut_report["parts"])
    assignments: dict[int, dict[str, Any]] = {}
    used_counts: dict[str, int] = {}
    if PARTIAL.exists():
        partial = load_json(PARTIAL)
        assignments = {int(k): v for k, v in (partial.get("assignments") or {}).items()}
        used_counts = {str(k): int(v) for k, v in (partial.get("used_counts") or {}).items()}
        print(f"[unique-v3-bg] resume assignments={len(assignments)}", flush=True)
    for row_index in range(1, 801):
        if row_index not in assignments:
            profile = profiles[row_index]
            print(f"[unique-v3-bg] discover {row_index:03d} {profile['visual_anchor']}", flush=True)
            assignments[row_index] = discover(profile, pexels_key, pixabay_key, used_counts, durations[row_index] / US)
            write_pretty(PARTIAL, {"assignments": assignments, "used_counts": used_counts})
        if "rendered_path" not in assignments[row_index]:
            rendered = render_background(row_index, assignments[row_index], durations[row_index])
            assignments[row_index]["rendered_path"] = str(rendered)
            write_pretty(PARTIAL, {"assignments": assignments, "used_counts": used_counts})
    project_reports = [apply_to_project(part, assignments) for part in capcut_report["parts"]]
    violations = {key: value for key, value in used_counts.items() if value > MAX_SOURCE_REUSE}
    report = {
        "status": "ready" if not violations else "failed",
        "rows": len(assignments),
        "max_source_reuse": MAX_SOURCE_REUSE,
        "used_source_count": len(used_counts),
        "source_reuse_violations": violations,
        "project_reports": project_reports,
        "assignments": assignments,
    }
    write_pretty(REPORT, report)
    print(json.dumps({key: value for key, value in report.items() if key != "assignments"}, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
