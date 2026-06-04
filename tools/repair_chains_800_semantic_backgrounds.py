#!/usr/bin/env python3
"""Replace Chains 800 background track with semantic stock videos per phrase.

Rules enforced:
- each phrase row uses a background selected from its direct visual anchor;
- no single source video is used more than MAX_SOURCE_REUSE times globally;
- sources must be landscape, HD, decodable, and long enough for the slot;
- background track gaps are filled by extending each background to the next
  background segment so CTA gaps do not show black behind overlays.
"""

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
PACK = Path("exports/chains/phrase_packs/chains_800_20260603")
ROWS_JSON = PACK / "capcut_build" / "chains_800_timeline_rows.json"
OUT = PACK / "capcut_repair" / "semantic_backgrounds"
QUERY_CACHE = OUT / "query_cache"
SOURCE_CACHE = OUT / "source_videos"
REPORT = OUT / "chains_800_semantic_background_report.json"
MAX_SOURCE_REUSE = 8
MIN_WIDTH = 1920
MIN_HEIGHT = 1080
MIN_BITRATE = 1_400_000
PROJECTS = [
    ("CHAINS_800_READY_PART1_001_400 20260603_214026", 0, 400),
    ("CHAINS_800_READY_PART2_401_800 20260603_214046", 400, 800),
]
NEGATIVE_TERMS = {
    "abstract", "animation", "cartoon", "green screen", "template", "logo",
    "code", "coding", "programming", "html", "website", "mockup", "vertical",
    "screen recording", "dashboard", "developer", "software", "robot",
}


def gid() -> str:
    return str(uuid.uuid4()).upper()


def capcut_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        if not raw.strip() or raw.lstrip().startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def backup_project(project: Path) -> Path:
    backup = Path(".codex-tmp/capcut-backups") / f"{project.name}.backup-before-semantic-bg-{time.strftime('%Y%m%d_%H%M%S')}"
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(project, backup)
    return backup


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


def normalize_query(text: str) -> str:
    text = re.sub(r"[,;/]+", " ", text.lower())
    text = re.sub(r"\s+", " ", text).strip()
    return text


def row_queries(row: dict[str, Any]) -> list[str]:
    anchor = normalize_query(str(row.get("background_must_show") or ""))
    english = normalize_query(str(row.get("english") or ""))
    # Direct association first; phrase text only as fallback.
    queries = [anchor]
    parts = [p.strip() for p in re.split(r",|\band\b", anchor) if p.strip()]
    if len(parts) > 1:
        queries.append(" ".join(parts[:2]))
        queries.extend(parts[:3])
    queries.append(english)
    seen: set[str] = set()
    out = []
    for query in queries:
        if query and query not in seen:
            seen.add(query)
            out.append(query)
    return out[:6]


def pexels_candidates(query: str, key: str) -> list[dict[str, Any]]:
    if not key:
        return []
    params = urllib.parse.urlencode({"query": query, "orientation": "landscape", "size": "large", "per_page": 12})
    data = request_json(f"https://api.pexels.com/videos/search?{params}", {"Authorization": key})
    out: list[dict[str, Any]] = []
    for item in data.get("videos", []) or []:
        files = item.get("video_files") or []
        files = [f for f in files if int(f.get("width") or 0) >= MIN_WIDTH and int(f.get("height") or 0) >= MIN_HEIGHT and f.get("link")]
        files.sort(key=lambda f: int(f.get("width") or 0) * int(f.get("height") or 0), reverse=True)
        if not files:
            continue
        out.append(
            {
                "provider": "pexels",
                "source_id": str(item.get("id")),
                "title": str(item.get("url") or query),
                "url": files[0]["link"],
                "page_url": str(item.get("url") or ""),
                "query": query,
                "duration": float(item.get("duration") or 0),
            }
        )
    return out


def pixabay_candidates(query: str, key: str) -> list[dict[str, Any]]:
    if not key:
        return []
    params = urllib.parse.urlencode({"key": key, "q": query, "video_type": "film", "orientation": "horizontal", "per_page": 12, "safesearch": "true"})
    data = request_json(f"https://pixabay.com/api/videos/?{params}")
    out: list[dict[str, Any]] = []
    for item in data.get("hits", []) or []:
        videos = item.get("videos") or {}
        options = [v for v in videos.values() if int(v.get("width") or 0) >= MIN_WIDTH and int(v.get("height") or 0) >= MIN_HEIGHT and v.get("url")]
        options.sort(key=lambda v: int(v.get("width") or 0) * int(v.get("height") or 0), reverse=True)
        if not options:
            continue
        tags = str(item.get("tags") or "")
        out.append(
            {
                "provider": "pixabay",
                "source_id": str(item.get("id")),
                "title": tags,
                "url": options[0]["url"],
                "page_url": str(item.get("pageURL") or ""),
                "query": query,
                "duration": float(item.get("duration") or 0),
            }
        )
    return out


def candidate_score(candidate: dict[str, Any], query: str, slot_sec: float) -> int:
    text = f"{candidate.get('title','')} {candidate.get('page_url','')} {candidate.get('query','')}".lower()
    if any(term in text for term in NEGATIVE_TERMS):
        return -999
    terms = [t for t in re.split(r"[^a-z0-9]+", query.lower()) if len(t) > 2]
    score = 0
    for term in terms:
        if term in text:
            score += 3
    if float(candidate.get("duration") or 0) >= slot_sec:
        score += 4
    if candidate["provider"] == "pexels":
        score += 1
    return score


def ffprobe(path: Path) -> dict[str, Any] | None:
    try:
        completed = subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        data = json.loads(completed.stdout)
        stream = next(s for s in data["streams"] if s.get("codec_type") == "video")
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


def download_candidate(candidate: dict[str, Any]) -> Path | None:
    provider = candidate["provider"]
    source_id = re.sub(r"[^A-Za-z0-9_-]+", "_", candidate["source_id"])
    path = SOURCE_CACHE / provider / f"{source_id}.mp4"
    if path.exists() and path.stat().st_size > 1024 * 1024:
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


def discover_for_row(session: requests.Session, row: dict[str, Any], pexels_key: str, pixabay_key: str, used_counts: dict[str, int], slot_sec: float) -> dict[str, Any]:
    failures: list[dict[str, Any]] = []
    for query in row_queries(row):
        candidates = pexels_candidates(query, pexels_key) + pixabay_candidates(query, pixabay_key)
        candidates.sort(key=lambda c: (-candidate_score(c, query, slot_sec), c["provider"] != "pexels", c["source_id"]))
        for candidate in candidates:
            key = f"{candidate['provider']}:{candidate['source_id']}"
            if used_counts.get(key, 0) >= MAX_SOURCE_REUSE:
                failures.append({"key": key, "reason": "reuse_limit"})
                continue
            if candidate_score(candidate, query, slot_sec) < 3:
                failures.append({"key": key, "reason": "weak_metadata"})
                continue
            source = download_candidate(candidate)
            if not source:
                failures.append({"key": key, "reason": "download_failed"})
                continue
            meta = ffprobe(source)
            ok, reason = quality_ok(meta, slot_sec)
            if not ok:
                failures.append({"key": key, "reason": reason})
                continue
            used_counts[key] = used_counts.get(key, 0) + 1
            return {"candidate": candidate, "key": key, "source": str(source), "meta": meta, "query": query, "failures": failures[:8]}
    raise RuntimeError(f"No semantic background passed for row {row['index']}: {row.get('background_must_show')} failures={failures[:8]}")


def material_template(content: dict[str, Any], material_id: str) -> dict[str, Any]:
    for item in content.get("materials", {}).get("videos", []):
        if item.get("id") == material_id:
            return item
    raise RuntimeError(f"video material not found: {material_id}")


def clone_video_material(template: dict[str, Any], path: Path, duration: int) -> dict[str, Any]:
    out = deepcopy(template)
    out["id"] = gid()
    if "unique_id" in out:
        out["unique_id"] = gid()
    if "local_material_id" in out:
        out["local_material_id"] = gid().lower()
    out["path"] = str(path)
    out["name"] = path.name
    out["material_name"] = path.name
    out["duration"] = duration
    return out


def sorted_bg_segments(content: dict[str, Any]) -> list[dict[str, Any]]:
    return sorted(content["tracks"][0].get("segments", []), key=lambda s: int(s["target_timerange"]["start"]))


def bind_backgrounds(project: Path, rows: list[dict[str, Any]], assignments: dict[int, dict[str, Any]]) -> dict[str, Any]:
    content = load_json(project / "draft_content.json")
    bg = sorted_bg_segments(content)
    if len(bg) != 800:
        raise RuntimeError(f"expected 800 background segments in {project.name}, got {len(bg)}")
    # In this template first 400 are first half and next 400 are mirrored second half.
    source_by_local = {i: assignments[int(row["index"])] for i, row in enumerate(rows)}
    changed = 0
    for half_offset in [0, 400]:
        for local_idx, row in enumerate(rows):
            seg = bg[half_offset + local_idx]
            start = int(seg["target_timerange"]["start"])
            next_start = int(bg[half_offset + local_idx + 1]["target_timerange"]["start"]) if local_idx + 1 < 400 else start + int(seg["target_timerange"]["duration"])
            duration = max(1, next_start - start)
            assignment = source_by_local[local_idx]
            source = Path(assignment["source"])
            local = project / "Resources" / "chains_800_semantic_bg" / f"{int(row['index']):03d}_{Path(source).name}"
            local.parent.mkdir(parents=True, exist_ok=True)
            if not local.exists() or local.stat().st_size != source.stat().st_size:
                shutil.copy2(source, local)
            template = material_template(content, seg["material_id"])
            mat = clone_video_material(template, local, duration)
            content["materials"]["videos"].append(mat)
            seg["material_id"] = mat["id"]
            seg["target_timerange"]["duration"] = duration
            if seg.get("source_timerange") is not None:
                seg["source_timerange"] = {"start": 0, "duration": duration}
            if seg.get("render_timerange") is not None:
                seg["render_timerange"] = {"start": start, "duration": duration}
            seg["visible"] = True
            changed += 1
    write_json(project / "draft_content.json", content)
    if (project / "template-2.tmp").exists():
        write_json(project / "template-2.tmp", content)
    mirror = project / "Timelines" / str(content["id"]) / "draft_content.json"
    if mirror.parent.exists():
        write_json(mirror, content)
    return {"changed_background_segments": changed, "draft_content_mb": round((project / "draft_content.json").stat().st_size / 1024 / 1024, 2)}


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing draft files.")
    env = load_env()
    pexels_key = env.get("PEXELS_API_KEY", "")
    pixabay_key = env.get("PIXABAY_API_KEY", "")
    if not pexels_key and not pixabay_key:
        raise RuntimeError("PEXELS_API_KEY or PIXABAY_API_KEY is required")
    rows = load_json(ROWS_JSON)
    session = requests.Session()
    assignments: dict[int, dict[str, Any]] = {}
    used_counts: dict[str, int] = {}
    # Use max slot per row across both halves/projects. This keeps sources long
    # enough when background is extended through CTA gaps.
    row_slot_sec: dict[int, float] = {}
    for name, start, end in PROJECTS:
        content = load_json(capcut_root() / name / "draft_content.json")
        bg = sorted_bg_segments(content)
        for local_idx, row in enumerate(rows[start:end]):
            seg = bg[local_idx]
            next_start = int(bg[local_idx + 1]["target_timerange"]["start"]) if local_idx + 1 < 400 else int(seg["target_timerange"]["start"]) + int(seg["target_timerange"]["duration"])
            slot = max(1, next_start - int(seg["target_timerange"]["start"])) / US
            row_slot_sec[int(row["index"])] = max(row_slot_sec.get(int(row["index"]), 0), slot)
    for index, row in enumerate(rows, start=1):
        row_index = int(row["index"])
        if row_index in assignments:
            continue
        print(f"[semantic-bg] {row_index:03d} {row.get('background_must_show')}", flush=True)
        assignments[row_index] = discover_for_row(session, row, pexels_key, pixabay_key, used_counts, row_slot_sec[row_index])
        if index % 25 == 0:
            write_pretty(REPORT.with_suffix(".partial.json"), {"assignments": assignments, "used_counts": used_counts})
    project_reports = []
    for name, start, end in PROJECTS:
        project = capcut_root() / name
        backup = backup_project(project)
        project_reports.append({"project": name, "backup": str(backup), **bind_backgrounds(project, rows[start:end], assignments)})
    source_reuse_violations = {k: v for k, v in used_counts.items() if v > MAX_SOURCE_REUSE}
    report = {
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "rows": len(rows),
        "max_source_reuse": MAX_SOURCE_REUSE,
        "source_reuse_violations": source_reuse_violations,
        "used_source_count": len(used_counts),
        "project_reports": project_reports,
        "assignments": assignments,
        "error_count": len(source_reuse_violations),
    }
    write_pretty(REPORT, report)
    print(json.dumps({k: v for k, v in report.items() if k != "assignments"}, ensure_ascii=False, indent=2))
    return 0 if not source_reuse_violations else 1


if __name__ == "__main__":
    raise SystemExit(main())
