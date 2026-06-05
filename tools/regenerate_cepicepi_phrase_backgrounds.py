#!/usr/bin/env python3
"""Regenerate phrase-specific Pexels/Pixabay backgrounds for the Cepi Cepi CapCut draft.

This script repairs only the semantic background video track. It does not touch
existing text, voiceover, CTA, intro, transition, or user-edited timing.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import uuid
from collections import Counter
from copy import deepcopy
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_chains_800_capcut_project import update_meta, write_json  # noqa: E402


US = 1_000_000
PROJECT_NAME = "\u0426\u0415\u041f\u0418 \u0426\u0415\u041f\u0418 \u0426\u0415\u041f\u0418 (1)"
OUT = Path("exports/chains/cepicepi_true_chains_a1a2_20260605")
MANIFEST_PATH = Path("exports/chains/cepicepi_assets_only/cepicepi_timeline_manifest.json")
BG_DIR = OUT / "phrase_specific_backgrounds"
SOURCE_DIR = BG_DIR / "source_videos"
RENDER_DIR = BG_DIR / "rendered_1920x1080"
QUERY_CACHE = BG_DIR / "stock_query_cache.json"
REPORT_PATH = BG_DIR / "phrase_background_generation_report.json"
APPLY_REPORT_PATH = OUT / "phrase_background_apply_report.json"
QA_REPORT_PATH = OUT / "phrase_background_final_qa.json"
RESOURCE_FOLDER = "cepicepi_phrase_specific_backgrounds"
TRACK_NAME = "CODEx PHRASE SPECIFIC STOCK BACKGROUND"

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
    "coding",
    "ai generated",
    "background loop",
}

SCENARIOS = [
    ["person opening window bedroom morning sunlight", "open window room morning warm weather", "bedroom window curtains morning real life", "hot morning open window home"],
    ["woman making tea kitchen mother dinner", "making tea at home kitchen family", "tea cup kitchen after dinner", "tired woman making tea evening"],
    ["people cleaning kitchen together home", "clean kitchen before lunch home", "family cleaning kitchen guests coming", "tidy kitchen home real life"],
    ["man finding keys on table before work", "keys on table home morning", "person picking up keys leaving for work", "lost keys found table"],
    ["family watching movie at home rainy evening", "people watching movie living room", "home cinema friday rain", "cozy living room movie night"],
    ["person buying bread store bakery", "bread shopping grocery store", "customer buying bread after work", "breakfast bread grocery store"],
    ["woman calling friend evening bus", "person phone call on bus evening", "woman talking phone public transport", "asking for help phone bus"],
    ["people waiting outside building locked door", "waiting outside building ten minutes", "person at locked door outside", "people waiting entrance building"],
    ["person taking photo of cafe menu", "phone photo menu cafe", "customer photographing menu restaurant", "sending menu photo cafe"],
    ["students missing bus near school morning", "school bus stop morning people walking", "missed bus walking home", "students near school bus stop"],
    ["person sending email laptop office manager", "office email laptop after lunch", "attach file email work", "manager email office computer"],
    ["woman online meeting laptop morning", "online meeting at nine laptop", "remote work video meeting idea", "woman sharing idea online meeting"],
    ["coworkers checking report together office", "people reviewing report document", "send report to client office", "team checking document before sending"],
    ["person fixing mistake in document office", "editing document before call", "save copy document laptop", "correcting mistake paperwork office"],
    ["team changing plan at work meeting", "business plan change after meeting", "client late office meeting", "people discussing new plan work"],
    ["student writing note notebook class", "writing in notebook classroom", "student taking notes during lesson", "remember note notebook school"],
    ["student reading page before test", "reading textbook slowly study", "marking new words book", "exam preparation reading page"],
    ["students practicing together after school", "study group practicing exam", "classmates practicing half hour", "exam close students studying"],
    ["student asking question in class", "teacher answering homework question", "student writing answer notebook", "classroom homework question"],
    ["students opening books on desk", "books on desk after break", "students start reading classroom", "open textbooks school desk"],
    ["person booking ticket online laptop", "buy ticket online night", "travel ticket low price laptop", "online booking ticket computer"],
    ["woman packing bag before trip", "packing suitcase passport sunday", "checking passport travel bag", "prepare bag for trip home"],
    ["travelers finding train station hotel", "station near hotel morning tickets", "buy train tickets station", "people walking to station hotel"],
    ["man calling taxi airport midnight", "taxi at airport night", "airport taxi after midnight", "train stopped calling taxi"],
    ["travelers walking to hotel with bags", "people walking hotel luggage", "hotel bags after dinner", "travelers with suitcases near hotel"],
]


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


def project_path() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / PROJECT_NAME


def gid() -> str:
    return str(uuid.uuid4()).upper()


def pexels_search(api_key: str, query: str, page: int = 1) -> list[dict[str, Any]]:
    params = {"query": query, "per_page": 20, "page": page, "orientation": "landscape"}
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode(params)
    response = requests.get(url, headers={"Authorization": api_key}, timeout=30)
    if response.status_code >= 400:
        return []
    out: list[dict[str, Any]] = []
    for video in response.json().get("videos", []):
        files = sorted(video.get("video_files", []), key=lambda f: (int(f.get("width") or 0), int(f.get("height") or 0)), reverse=True)
        best = next((f for f in files if int(f.get("width") or 0) >= 1280 and int(f.get("height") or 0) >= 720), files[0] if files else None)
        if not best:
            continue
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
    url = "https://pixabay.com/api/videos/?" + urllib.parse.urlencode(params)
    response = requests.get(url, timeout=30)
    if response.status_code >= 400:
        return []
    out: list[dict[str, Any]] = []
    for video in response.json().get("hits", []):
        videos = video.get("videos", {})
        best = videos.get("large") or videos.get("medium") or videos.get("small")
        if not best:
            continue
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


def query_variants(index: int, english: str) -> list[str]:
    group = (index - 1) // 4
    step = (index - 1) % 4
    scenario = list(SCENARIOS[group])
    variants = [scenario[min(step, len(scenario) - 1)], *scenario]
    exact = english.lower().replace(".", "")
    exact = re.sub(r"\b(because|and)\b", " ", exact)
    replacements = {
        "i": "person",
        "we": "people",
        "he": "man",
        "she": "woman",
        "they": "people",
    }
    exact = " ".join(replacements.get(word, word) for word in exact.split())
    variants.append(f"{exact} real life")
    clean: list[str] = []
    for item in variants:
        normalized = " ".join(item.split())
        if normalized and normalized not in clean:
            clean.append(normalized)
    return clean


def is_bad(candidate: dict[str, Any]) -> bool:
    title = f"{candidate.get('title', '')} {candidate.get('query', '')}".casefold()
    if any(term in title for term in NEGATIVE_TERMS):
        return True
    width = int(candidate.get("width") or 0)
    height = int(candidate.get("height") or 0)
    if width and height and height > width:
        return True
    return False


def cached_search(cache: dict[str, list[dict[str, Any]]], env: dict[str, str], query: str) -> list[dict[str, Any]]:
    if query in cache:
        return cache[query]
    candidates: list[dict[str, Any]] = []
    for page in (1, 2):
        if env.get("PEXELS_API_KEY"):
            candidates.extend(pexels_search(env["PEXELS_API_KEY"], query, page=page))
        if env.get("PIXABAY_API_KEY"):
            candidates.extend(pixabay_search(env["PIXABAY_API_KEY"], query, page=page))
        time.sleep(0.15)
    cache[query] = candidates
    QUERY_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    return candidates


def download(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 500_000:
        return
    with requests.get(url, stream=True, timeout=120) as response:
        response.raise_for_status()
        with path.open("wb") as fh:
            for chunk in response.iter_content(chunk_size=1024 * 512):
                if chunk:
                    fh.write(chunk)


def render_bg(source: Path, target: Path, duration_us: int) -> None:
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
        raise RuntimeError(f"background render failed for {source}: {result.stdout[:500]}")


def ffprobe_ok(path: Path) -> bool:
    result = subprocess.run(["ffprobe", "-v", "error", str(path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    return result.returncode == 0


def generate_backgrounds() -> dict[str, Any]:
    env = load_env()
    if not env.get("PEXELS_API_KEY") and not env.get("PIXABAY_API_KEY"):
        raise RuntimeError("PEXELS_API_KEY or PIXABAY_API_KEY is required")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    base_slots = [slot for slot in manifest["phrase_slots"] if int(slot["part"]) == 1]
    BG_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    cache = json.loads(QUERY_CACHE.read_text(encoding="utf-8")) if QUERY_CACHE.exists() else {}
    used_sources: set[str] = set()
    assignments: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    for slot in base_slots:
        index = int(slot["index"])
        english = str(slot["english"])
        picked: dict[str, Any] | None = None
        tried_queries: list[str] = []
        for query in query_variants(index, english):
            tried_queries.append(query)
            candidates = cached_search(cache, env, query)
            for candidate in candidates:
                if is_bad(candidate):
                    continue
                source_key = f"{candidate['provider']}:{candidate['id']}"
                if source_key in used_sources:
                    continue
                picked = candidate
                break
            if picked:
                break
        if not picked:
            failures.append({"index": index, "english": english, "queries": tried_queries})
            continue
        source_key = f"{picked['provider']}:{picked['id']}"
        used_sources.add(source_key)
        source = SOURCE_DIR / f"{index:03d}_{picked['provider']}_{picked['id']}.mp4"
        rendered = RENDER_DIR / f"{index:03d}_{picked['provider']}_{picked['id']}.mp4"
        download(str(picked["url"]), source)
        render_bg(source, rendered, int(slot["duration_us"]))
        if not ffprobe_ok(rendered):
            failures.append({"index": index, "english": english, "source_key": source_key, "error": "ffprobe_failed"})
            continue
        assignments.append(
            {
                "index": index,
                "english": english,
                "source_index": int(slot["source_index"]),
                "query": picked.get("query"),
                "queries_tried": tried_queries,
                "provider": picked["provider"],
                "id": picked["id"],
                "source_key": source_key,
                "title": picked.get("title", ""),
                "source_path": str(source),
                "rendered_path": str(rendered),
                "start_us": int(slot["start_us"]),
                "duration_us": int(slot["duration_us"]),
            }
        )
        print(f"{index:03d}/100 {english} -> {source_key} | {picked.get('query')}", flush=True)

    source_counts = Counter(item["source_key"] for item in assignments)
    report = {
        "status": "ready" if len(assignments) == len(base_slots) and not failures and len(source_counts) == len(base_slots) else "failed",
        "assignments": assignments,
        "failures": failures,
        "unique_source_assets": len(source_counts),
        "base_phrase_count": len(base_slots),
        "max_source_use_base": max(source_counts.values()) if source_counts else 0,
        "rules": {
            "one_unique_source_per_base_phrase": True,
            "allowed_reuse_only_same_phrase_across_parts": True,
            "providers": ["pexels", "pixabay"],
        },
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if report["status"] != "ready":
        raise RuntimeError(json.dumps({"status": report["status"], "failures": failures[:5], "assignments": len(assignments)}, ensure_ascii=False))
    return report


def clone_material(template: dict[str, Any], path: Path, duration_us: int) -> dict[str, Any]:
    mat = deepcopy(template)
    mat["id"] = gid()
    mat["path"] = str(path)
    mat["media_path"] = str(path)
    mat["duration"] = int(duration_us)
    mat["name"] = path.name
    mat["material_name"] = path.name
    mat["width"] = 1920
    mat["height"] = 1080
    mat["has_audio"] = False
    return mat


def clone_segment(template: dict[str, Any], material_id: str, start_us: int, duration_us: int) -> dict[str, Any]:
    seg = deepcopy(template)
    seg["id"] = gid()
    seg["material_id"] = material_id
    seg["target_timerange"] = {"start": int(start_us), "duration": int(duration_us)}
    seg["source_timerange"] = {"start": 0, "duration": int(duration_us)}
    if seg.get("render_timerange") is not None:
        seg["render_timerange"] = {"start": int(start_us), "duration": int(duration_us)}
    return seg


def localize(project: Path, source: Path) -> Path:
    target = project / "Resources" / RESOURCE_FOLDER / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or target.stat().st_size != source.stat().st_size:
        shutil.copy2(source, target)
    return target


def apply_backgrounds(report: dict[str, Any] | None = None) -> dict[str, Any]:
    report = report or json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    project = project_path()
    content = json.loads((project / "draft_content.json").read_text(encoding="utf-8"))
    videos = {m.get("id"): m for m in content.get("materials", {}).get("videos", [])}

    background_names = {TRACK_NAME, "CODEx TRUE CHAINS SEMANTIC BACKGROUND"}
    content["tracks"] = [tr for tr in content.get("tracks", []) if str(tr.get("name") or "") not in background_names]
    used_ids = {seg.get("material_id") for tr in content["tracks"] for seg in tr.get("segments", [])}
    content["materials"]["videos"] = [
        m
        for m in content.get("materials", {}).get("videos", [])
        if not (
            (
                RESOURCE_FOLDER in str(m.get("path") or "")
                or "cepicepi_true_chains_backgrounds" in str(m.get("path") or "")
            )
            and m.get("id") not in used_ids
        )
    ]
    videos = {m.get("id"): m for m in content["materials"]["videos"]}
    template_track = deepcopy(content["tracks"][0])
    template_track["id"] = gid()
    template_track["name"] = TRACK_NAME
    template_track["segments"] = []
    template_seg = next(seg for seg in content["tracks"][0]["segments"] if seg.get("material_id") in videos)
    template_mat = videos[template_seg["material_id"]]
    by_source_index = {int(item["source_index"]): item for item in report["assignments"]}

    added = 0
    for slot in manifest["phrase_slots"]:
        item = by_source_index[int(slot["source_index"])]
        local = localize(project, Path(item["rendered_path"]))
        mat = clone_material(template_mat, local, int(slot["duration_us"]))
        content["materials"]["videos"].append(mat)
        template_track["segments"].append(clone_segment(template_seg, mat["id"], int(slot["start_us"]), int(slot["duration_us"])))
        added += 1

    template_track["segments"].sort(key=lambda seg: int((seg.get("target_timerange") or {}).get("start", 0)))
    content["tracks"].append(template_track)
    write_json(project / "draft_content.json", content)
    if (project / "template-2.tmp").exists():
        write_json(project / "template-2.tmp", content)
    if (project / "Timelines").exists():
        for mirror in (project / "Timelines").glob("*/draft_content.json"):
            write_json(mirror, content)
    update_meta(project, content)
    apply_report = {
        "status": "ready",
        "project": str(project),
        "track_name": TRACK_NAME,
        "background_segments_added": added,
        "unique_source_assets": report["unique_source_assets"],
        "tracks_after": len(content["tracks"]),
    }
    APPLY_REPORT_PATH.write_text(json.dumps(apply_report, ensure_ascii=False, indent=2), encoding="utf-8")
    return apply_report


def qa() -> dict[str, Any]:
    project = project_path()
    content = json.loads((project / "draft_content.json").read_text(encoding="utf-8"))
    template = json.loads((project / "template-2.tmp").read_text(encoding="utf-8"))
    timelines = sorted((project / "Timelines").glob("*/draft_content.json")) if (project / "Timelines").exists() else []
    timeline_docs = [json.loads(p.read_text(encoding="utf-8")) for p in timelines]
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    videos = {m.get("id"): m for m in content.get("materials", {}).get("videos", [])}
    errors: list[str] = []
    if content != template:
        errors.append("draft/template mismatch")
    if not all(content == doc for doc in timeline_docs):
        errors.append("timeline mirror mismatch")
    bg_tracks = [tr for tr in content.get("tracks", []) if str(tr.get("name") or "") == TRACK_NAME]
    if len(bg_tracks) != 1:
        errors.append(f"background track count {len(bg_tracks)}")
    missing = 0
    timing_bad = 0
    source_counts: Counter[str] = Counter()
    if bg_tracks:
        segments = bg_tracks[0].get("segments", [])
        if len(segments) != len(manifest["phrase_slots"]):
            errors.append(f"background segment count {len(segments)}")
        for slot, seg in zip(manifest["phrase_slots"], segments):
            target = seg.get("target_timerange") or {}
            if int(target.get("start", -1)) != int(slot["start_us"]) or int(target.get("duration", -1)) != int(slot["duration_us"]):
                timing_bad += 1
            mat = videos.get(seg.get("material_id"), {})
            path = mat.get("path")
            if not path or not Path(path).exists():
                missing += 1
            else:
                source_counts[Path(path).name] += 1
    if missing:
        errors.append(f"missing background media {missing}")
    if timing_bad:
        errors.append(f"background timing mismatches {timing_bad}")
    if source_counts and max(source_counts.values()) > 3:
        errors.append(f"background source reused more than same phrase across three parts: {max(source_counts.values())}")
    qa_report = {
        "status": "ready" if not errors else "failed",
        "errors": errors,
        "track_name": TRACK_NAME,
        "background_segments": len(bg_tracks[0].get("segments", [])) if bg_tracks else 0,
        "unique_resource_files": len(source_counts),
        "max_resource_file_use": max(source_counts.values()) if source_counts else 0,
        "missing_background_media": missing,
        "background_timing_mismatches": timing_bad,
        "mirrors": {
            "draft_template_equal": content == template,
            "timeline_count": len(timelines),
            "all_timelines_equal": all(content == doc for doc in timeline_docs),
        },
    }
    QA_REPORT_PATH.write_text(json.dumps(qa_report, ensure_ascii=False, indent=2), encoding="utf-8")
    return qa_report


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in {"generate", "all"}:
        report = generate_backgrounds()
    else:
        report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    if mode in {"apply", "all"}:
        print(json.dumps(apply_backgrounds(report), ensure_ascii=False, indent=2), flush=True)
    if mode in {"qa", "all"}:
        print(json.dumps(qa(), ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
