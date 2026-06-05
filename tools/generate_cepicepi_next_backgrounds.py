#!/usr/bin/env python3
"""Download and render phrase-specific stock backgrounds for the next Cepicepi pack."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
import urllib.parse
from collections import Counter
from pathlib import Path
from typing import Any

import requests


OUT = Path("exports/chains/cepicepi_next_chains_a1a2_20260605")
ROWS_PATH = OUT / "next_chains_100.json"
BG_DIR = OUT / "semantic_backgrounds"
SOURCE_DIR = BG_DIR / "source_videos"
RENDER_DIR = BG_DIR / "rendered_1920x1080"
QUERY_CACHE = BG_DIR / "stock_query_cache.json"
REPORT_PATH = BG_DIR / "background_generation_report.json"
CONTACT_SHEET = BG_DIR / "contact_sheet_mid.jpg"
US = 1_000_000
DEFAULT_DURATION_US = 11_466_667

NEGATIVE_TERMS = {
    "abstract",
    "animation",
    "cartoon",
    "green screen",
    "template",
    "logo",
    "mockup",
    "vertical",
    "screen recording",
    "ai generated",
    "background loop",
}


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                key, value = stripped.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    values.update({k: v for k, v in os.environ.items() if k in {"PEXELS_API_KEY", "PIXABAY_API_KEY"}})
    return values


def pexels_search(api_key: str, query: str, page: int = 1) -> list[dict[str, Any]]:
    params = {"query": query, "per_page": 20, "page": page, "orientation": "landscape"}
    response = requests.get("https://api.pexels.com/videos/search?" + urllib.parse.urlencode(params), headers={"Authorization": api_key}, timeout=30)
    if response.status_code >= 400:
        return []
    out: list[dict[str, Any]] = []
    for video in response.json().get("videos", []):
        files = sorted(video.get("video_files", []), key=lambda f: (int(f.get("width") or 0), int(f.get("height") or 0)), reverse=True)
        best = next((f for f in files if int(f.get("width") or 0) >= 1280 and int(f.get("height") or 0) >= 720), files[0] if files else None)
        if best:
            out.append(
                {
                    "provider": "pexels",
                    "id": str(video.get("id")),
                    "url": best.get("link"),
                    "width": best.get("width"),
                    "height": best.get("height"),
                    "duration": video.get("duration"),
                    "title": video.get("url", ""),
                    "query": query,
                }
            )
    return out


def pixabay_search(api_key: str, query: str, page: int = 1) -> list[dict[str, Any]]:
    params = {"key": api_key, "q": query, "per_page": 20, "page": page, "video_type": "film", "safesearch": "true"}
    response = requests.get("https://pixabay.com/api/videos/?" + urllib.parse.urlencode(params), timeout=30)
    if response.status_code >= 400:
        return []
    out: list[dict[str, Any]] = []
    for video in response.json().get("hits", []):
        videos = video.get("videos", {})
        best = videos.get("large") or videos.get("medium") or videos.get("small")
        if best:
            out.append(
                {
                    "provider": "pixabay",
                    "id": str(video.get("id")),
                    "url": best.get("url"),
                    "width": best.get("width"),
                    "height": best.get("height"),
                    "duration": video.get("duration"),
                    "title": f"{video.get('tags', '')} {video.get('pageURL', '')}",
                    "query": query,
                }
            )
    return out


def is_bad(candidate: dict[str, Any]) -> bool:
    title = f"{candidate.get('title', '')} {candidate.get('query', '')}".casefold()
    if any(term in title for term in NEGATIVE_TERMS):
        return True
    width = int(candidate.get("width") or 0)
    height = int(candidate.get("height") or 0)
    return bool(width and height and height > width)


def cached_search(cache: dict[str, list[dict[str, Any]]], env: dict[str, str], query: str) -> list[dict[str, Any]]:
    if query in cache:
        return cache[query]
    candidates: list[dict[str, Any]] = []
    for page in (1, 2):
        if env.get("PEXELS_API_KEY"):
            candidates.extend(pexels_search(env["PEXELS_API_KEY"], query, page=page))
        if env.get("PIXABAY_API_KEY"):
            candidates.extend(pixabay_search(env["PIXABAY_API_KEY"], query, page=page))
        time.sleep(0.12)
    cache[query] = candidates
    QUERY_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    return candidates


def download(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 500_000:
        return
    last_error: Exception | None = None
    for attempt in range(1, 5):
        try:
            with requests.get(url, stream=True, timeout=(20, 180)) as response:
                response.raise_for_status()
                tmp = target.with_suffix(target.suffix + ".part")
                with tmp.open("wb") as fh:
                    for chunk in response.iter_content(chunk_size=1024 * 512):
                        if chunk:
                            fh.write(chunk)
                tmp.replace(target)
                return
        except Exception as error:  # noqa: BLE001
            last_error = error
            time.sleep(1.5 * attempt)
    raise RuntimeError(f"download failed after retries for {url}: {last_error}")


def render_bg(source: Path, target: Path, duration_us: int = DEFAULT_DURATION_US) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 500_000:
        return
    duration = duration_us / US
    cmd = [
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
        "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        str(target),
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed for {source}: {result.stdout[:500]}")


def ffprobe_ok(path: Path) -> bool:
    return subprocess.run(["ffprobe", "-v", "error", str(path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False).returncode == 0


def generate() -> dict[str, Any]:
    env = load_env()
    if not env.get("PEXELS_API_KEY") and not env.get("PIXABAY_API_KEY"):
        raise RuntimeError("PEXELS_API_KEY or PIXABAY_API_KEY is required")
    rows = json.loads(ROWS_PATH.read_text(encoding="utf-8"))
    BG_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    cache = json.loads(QUERY_CACHE.read_text(encoding="utf-8")) if QUERY_CACHE.exists() else {}
    used: set[str] = set()
    assignments: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    for row in rows:
        queries = [
            row["background_query"],
            f"{row['scenario']} real life",
            f"{row['english'].replace('.', '').lower()} real life",
        ]
        picked = None
        tried = []
        for query in queries:
            query = " ".join(str(query).split())
            tried.append(query)
            for candidate in cached_search(cache, env, query):
                if is_bad(candidate):
                    continue
                key = f"{candidate['provider']}:{candidate['id']}"
                if key in used:
                    continue
                picked = candidate
                break
            if picked:
                break
        if not picked:
            failures.append({"index": row["index"], "english": row["english"], "queries": tried})
            continue
        key = f"{picked['provider']}:{picked['id']}"
        used.add(key)
        source = SOURCE_DIR / f"{int(row['index']):03d}_{picked['provider']}_{picked['id']}.mp4"
        rendered = RENDER_DIR / f"{int(row['index']):03d}_{picked['provider']}_{picked['id']}.mp4"
        download(str(picked["url"]), source)
        render_bg(source, rendered)
        if not ffprobe_ok(rendered):
            failures.append({"index": row["index"], "english": row["english"], "source_key": key, "error": "ffprobe_failed"})
            continue
        assignments.append(
            {
                **row,
                "query": picked.get("query"),
                "queries_tried": tried,
                "provider": picked["provider"],
                "id": picked["id"],
                "source_key": key,
                "title": picked.get("title", ""),
                "source_path": str(source),
                "rendered_path": str(rendered),
            }
        )
        print(f"{int(row['index']):03d}/100 {row['english']} -> {key} | {picked.get('query')}", flush=True)
    counts = Counter(item["source_key"] for item in assignments)
    report = {
        "status": "ready" if len(assignments) == 100 and not failures and len(counts) == 100 else "failed",
        "assignments": assignments,
        "failures": failures,
        "unique_source_assets": len(counts),
        "max_source_use": max(counts.values()) if counts else 0,
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if report["status"] != "ready":
        raise RuntimeError(json.dumps({"assignments": len(assignments), "failures": failures[:5]}, ensure_ascii=False))
    return report


def make_contact_sheet() -> Path:
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    tmp = OUT / ".tmp_contact_sheet"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    try:
        images = []
        for item in report["assignments"]:
            src = Path(item["rendered_path"])
            img = tmp / f"{int(item['index']):03d}.jpg"
            subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", "4.5", "-i", str(src), "-frames:v", "1", "-vf", "scale=192:108", str(img)], check=True)
            images.append(img)
        listfile = tmp / "inputs.txt"
        listfile.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in images), encoding="utf-8")
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(listfile), "-vf", "tile=10x10:margin=4:padding=2:color=black", "-frames:v", "1", str(CONTACT_SHEET)], check=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return CONTACT_SHEET


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in {"generate", "all"}:
        print(json.dumps(generate(), ensure_ascii=False, indent=2), flush=True)
    if mode in {"sheet", "all"}:
        print(make_contact_sheet())


if __name__ == "__main__":
    main()
