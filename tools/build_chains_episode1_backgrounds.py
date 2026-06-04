#!/usr/bin/env python3
"""Build direct-association, no-blur backgrounds for CHAINS episode 1."""

from __future__ import annotations

import base64
import argparse
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time
import re
from pathlib import Path
from typing import Any

import requests


US = 1_000_000
SOURCE_DRAFT = "\u0426\u0415\u041f\u0418 \u0426\u0415\u041f\u0418 \u0426\u0415\u041f\u0418 (1)"
OUT_DIR = Path("exports/chains/episode1/backgrounds-direct-gate")
RENDER_DIR = OUT_DIR / "rendered"
FRAME_DIR = OUT_DIR / "frames"
CACHE_PATH = OUT_DIR / "direct_frame_gate_cache.jsonl"
MANIFEST_PATH = OUT_DIR / "background_manifest.json"
MIN_WIDTH = 1920
MIN_HEIGHT = 1080
MIN_BITRATE = 1_400_000
MIN_PART_SEC = 3.0
MAX_CANDIDATES_PER_ROW = 80


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_strict_module() -> Any:
    module_path = Path("tools/build_venga_semantic_strict_backgrounds.py")
    spec = importlib.util.spec_from_file_location("strict_bg_for_chains", module_path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    module.CACHE_DIR = OUT_DIR / "cache"
    module.QUERY_CACHE_DIR = module.CACHE_DIR / "queries"
    module.SOURCE_CACHE_DIR = module.CACHE_DIR / "source_videos"
    module.VISUAL_AUDIT_DIR = OUT_DIR / "technical-visual-audit"
    return module


def capcut_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def phrase_durations() -> list[int]:
    draft = load_json(capcut_root() / SOURCE_DRAFT / "draft_content.json")
    return [int(seg["target_timerange"]["duration"]) for seg in draft["tracks"][5]["segments"]]


def load_rows() -> list[dict[str, Any]]:
    rows = load_json(Path("exports/chains/episode1/phrase_rows.json"))
    durations = phrase_durations()
    if len(rows) != 100 or len(durations) != 100:
        raise RuntimeError(f"Expected 100 rows/durations, got {len(rows)}/{len(durations)}")
    for row, duration in zip(rows, durations, strict=True):
        row["duration_us"] = duration
    return rows


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


def quality_ok(meta: dict[str, Any] | None) -> tuple[bool, str]:
    if not meta:
        return False, "ffprobe_failed"
    if meta["width"] < MIN_WIDTH or meta["height"] < MIN_HEIGHT:
        return False, f"low_resolution:{meta['width']}x{meta['height']}"
    if meta["width"] < meta["height"]:
        return False, "vertical_source"
    if meta["duration"] < MIN_PART_SEC:
        return False, f"too_short:{meta['duration']:.2f}"
    if meta["bit_rate"] and meta["bit_rate"] < MIN_BITRATE:
        return False, f"low_bitrate:{meta['bit_rate']}"
    return True, "ok"


def candidate_key(candidate: Any) -> str:
    return f"{candidate.source}:{candidate.source_id}"


def discover_candidates(strict: Any, session: requests.Session, row: dict[str, Any], pexels_key: str, pixabay_key: str) -> list[Any]:
    weak_terms = {"sunrise", "morning", "sunset", "beautiful", "happy", "sad", "busy", "people"}
    queries: list[str] = []
    anchors = [str(item) for item in row.get("visual_anchor", [])]
    strong_anchors = [item for item in anchors if item.casefold() not in weak_terms]
    if strong_anchors:
        queries.append(" ".join(strong_anchors[:3]))
        queries.extend(strong_anchors[:4])
    visual_queries = [str(query) for query in row.get("visual_queries", [])]
    visual_queries.sort(key=lambda item: 1 if item.casefold() in weak_terms else 0)
    queries.extend(visual_queries)
    queries.append(str(row["english"]).rstrip(".?!"))

    seen: set[str] = set()
    candidates: list[Any] = []
    for query in queries:
        for provider in (
            lambda: strict.discover_pexels(session, query, pexels_key),
            lambda: strict.discover_pixabay(session, query, pixabay_key),
            lambda: strict.discover_mixkit(session, query),
        ):
            try:
                found = provider()
            except Exception:
                found = []
            for candidate in found:
                key = candidate_key(candidate)
                if key in seen:
                    continue
                seen.add(key)
                candidates.append(candidate)
    return candidates[:MAX_CANDIDATES_PER_ROW]


def extract_frame(source: Path, candidate: Any, ratio: float, meta: dict[str, Any]) -> Path:
    frame_dir = FRAME_DIR / f"{candidate.source}_{candidate.source_id}"
    frame_dir.mkdir(parents=True, exist_ok=True)
    frame = frame_dir / f"{ratio:.2f}.jpg"
    if frame.exists():
        return frame
    timestamp = max(0.35, min(float(meta["duration"]) - 0.25, float(meta["duration"]) * ratio))
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{timestamp:.3f}",
            "-i",
            str(source),
            "-frames:v",
            "1",
            "-vf",
            "scale=640:360:force_original_aspect_ratio=increase,crop=640:360",
            "-q:v",
            "3",
            str(frame),
        ],
        check=True,
    )
    return frame


def load_gate_cache() -> dict[str, dict[str, Any]]:
    cache: dict[str, dict[str, Any]] = {}
    if not CACHE_PATH.exists():
        return cache
    for line in CACHE_PATH.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        cache[str(item["cache_key"])] = item
    return cache


def append_gate_cache(item: dict[str, Any]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CACHE_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")


def direct_frame_gate(
    *,
    session: requests.Session,
    api_key: str,
    model: str,
    row: dict[str, Any],
    candidate: Any,
    source: Path,
    meta: dict[str, Any],
    cache: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    frame = extract_frame(source, candidate, 0.50, meta)
    cache_key = f"v1|{row['index']}|{candidate.source}|{candidate.source_id}|{frame.stat().st_size}"
    if cache_key in cache and os.environ.get("CHAINS_FORCE_METADATA_GATE") != "1":
        return cache[cache_key]
    if os.environ.get("CHAINS_FORCE_METADATA_GATE") == "1":
        item = metadata_direct_gate(row=row, candidate=candidate, frame=frame)
        item["cache_key"] = cache_key
        cache[cache_key] = item
        append_gate_cache(item)
        return item

    image_b64 = base64.b64encode(frame.read_bytes()).decode("ascii")
    anchors = ", ".join(str(item) for item in row.get("visual_anchor", []))
    prompt = (
        "You are a strict video background gate for an educational language video.\n"
        "Return only valid JSON.\n"
        "PASS only if the frame itself shows one direct, strong, literal visual association with the phrase.\n"
        "Reject generic people, random streets, abstract scenery, weak mood matches, logos, text/code screens, blurry frames, and anything where the required object/action is not plainly visible.\n"
        f"Phrase: {row['english']}\n"
        f"Russian meaning: {row['russian']}\n"
        f"Required visible anchors: {anchors}\n"
        "JSON schema: {\"pass\": boolean, \"score\": 0-5, \"visible_anchor\": string, \"reason\": string}."
    )
    payload = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "You are a severe visual relevance judge. Be conservative."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
                ],
            },
        ],
    }
    response = None
    for attempt in range(1, 7):
        response = session.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            timeout=90,
        )
        if response.status_code != 429 and response.status_code < 500:
            break
        retry_after = response.headers.get("retry-after")
        wait = float(retry_after) if retry_after else min(45.0, 4.0 * attempt)
        time.sleep(wait)
    assert response is not None
    if response.status_code == 429:
        text = response.text[:500]
        if "insufficient_quota" in text and os.environ.get("CHAINS_ALLOW_METADATA_GATE_FALLBACK") == "1":
            item = metadata_direct_gate(row=row, candidate=candidate, frame=frame)
            item["cache_key"] = cache_key
            item["frame"] = str(frame)
            item["fallback_reason"] = "openai_insufficient_quota"
            cache[cache_key] = item
            append_gate_cache(item)
            return item
        raise RuntimeError(f"OpenAI vision rate limit after retries: {text}")
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    verdict = json.loads(content)
    item = {
        "cache_key": cache_key,
        "phrase_index": row["index"],
        "english": row["english"],
        "candidate": {"source": candidate.source, "source_id": candidate.source_id, "title": candidate.title, "query": candidate.query},
        "frame": str(frame),
        "pass": bool(verdict.get("pass")) and int(verdict.get("score") or 0) >= 4,
        "score": int(verdict.get("score") or 0),
        "visible_anchor": str(verdict.get("visible_anchor") or ""),
        "reason": str(verdict.get("reason") or ""),
    }
    cache[cache_key] = item
    append_gate_cache(item)
    return item


def content_tokens(text: str) -> set[str]:
    stop = {
        "a",
        "an",
        "the",
        "of",
        "with",
        "to",
        "in",
        "on",
        "at",
        "and",
        "or",
        "person",
        "people",
        "man",
        "woman",
        "beautiful",
        "happy",
        "sad",
        "morning",
        "sunrise",
    }
    return {token for token in re.findall(r"[a-z0-9]+", text.casefold()) if len(token) > 2 and token not in stop}


SYNONYMS = {
    "train": {"train", "railway", "railroad", "metro", "subway", "underground", "station", "platform"},
    "receipt": {"receipt", "bill", "invoice", "cashier", "store", "shopping"},
    "email": {"email", "mail", "message", "notification", "computer", "laptop"},
    "password": {"password", "login", "computer", "laptop", "screen"},
    "restaurant": {"restaurant", "cafe", "table", "waiter", "reservation", "dining"},
    "trip": {"trip", "travel", "flight", "airport", "ticket", "suitcase", "luggage", "plane"},
    "mistake": {"mistake", "correction", "correcting", "paper", "pen", "edit", "writing"},
    "document": {"document", "file", "folder", "computer", "laptop", "screen", "paper"},
    "keys": {"key", "keys", "door", "keyhole", "lock"},
    "help": {"help", "helping", "support", "hand", "hands", "team"},
    "question": {"question", "classroom", "teacher", "student", "hand", "board"},
    "notes": {"notes", "notebook", "writing", "pen", "paper"},
    "schedule": {"schedule", "calendar", "planner", "timetable", "clock"},
    "package": {"package", "parcel", "box", "delivery", "shopping"},
    "outside": {"outside", "outdoor", "waiting", "building", "street"},
    "meeting": {"meeting", "calendar", "conference", "office", "clock"},
    "call": {"call", "phone", "headphones", "video", "laptop", "computer"},
    "invoice": {"invoice", "bill", "receipt", "payment", "email", "computer"},
    "apartment": {"apartment", "cleaning", "clean", "vacuum", "home", "room"},
    "charger": {"charger", "charging", "cable", "phone", "battery"},
    "book": {"book", "library", "librarian", "reading"},
    "invitation": {"invitation", "card", "celebration", "party", "handshake"},
    "weather": {"weather", "forecast", "phone", "cloudy", "sunshine", "rain"},
    "backpack": {"backpack", "bag", "packing", "gear", "travel"},
    "traffic": {"traffic", "cars", "car", "road", "jam", "vehicle", "commute"},
}


def expand_tokens(tokens: set[str]) -> set[str]:
    expanded = set(tokens)
    for group in SYNONYMS.values():
        if tokens & group:
            expanded |= group
    return expanded


def metadata_direct_gate(*, row: dict[str, Any], candidate: Any, frame: Path) -> dict[str, Any]:
    haystack = f"{candidate.title} {candidate.page_url}".casefold()
    haystack_tokens = expand_tokens(content_tokens(haystack))
    anchors = [str(item) for item in row.get("visual_anchor", [])]
    matched: list[str] = []
    for anchor in anchors:
        anchor_text = anchor.casefold()
        tokens = expand_tokens(content_tokens(anchor_text))
        if anchor_text and anchor_text in haystack:
            matched.append(anchor)
        elif tokens and tokens & haystack_tokens:
            matched.append(anchor)
    score = 5 if len(matched) >= 2 else 4 if matched else 0
    return {
        "phrase_index": row["index"],
        "english": row["english"],
        "candidate": {"source": candidate.source, "source_id": candidate.source_id, "title": candidate.title, "query": candidate.query},
        "pass": score >= 4,
        "score": score,
        "visible_anchor": "; ".join(matched[:2]),
        "reason": (
            "LOCAL FALLBACK: OpenAI vision quota unavailable; candidate allowed only because title/query/page metadata directly matches required anchors. "
            "Storyboard frame must be visually checked before final approval."
        ),
        "frame": str(frame),
        "gate_mode": "metadata_fallback_requires_storyboard_visual_audit",
    }


def background_filter() -> str:
    return (
        "scale=1920:1080:force_original_aspect_ratio=increase,"
        "crop=1920:1080,"
        "eq=brightness=-0.10:contrast=0.92:saturation=1.03,"
        "fps=30,format=yuv420p"
    )


def render_sequence(parts: list[dict[str, Any]], output: Path, duration_us: int) -> dict[str, Any]:
    target_sec = duration_us / US
    tmp_dir = output.parent / f"__tmp_{output.stem}"
    shutil.rmtree(tmp_dir, ignore_errors=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)
    part_paths: list[Path] = []
    try:
        for index, part in enumerate(parts, start=1):
            dst = tmp_dir / f"part_{index:02d}.mp4"
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(part["source_path"]),
                    "-t",
                    f"{part['take_sec']:.6f}",
                    "-vf",
                    background_filter(),
                    "-an",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "22",
                    "-movflags",
                    "+faststart",
                    str(dst),
                ],
                check=True,
            )
            part_paths.append(dst)
        concat = tmp_dir / "concat.txt"
        concat.write_text("".join(f"file '{path.resolve().as_posix()}'\n" for path in part_paths), encoding="utf-8")
        output.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat),
                "-t",
                f"{target_sec:.6f}",
                "-c",
                "copy",
                str(output),
            ],
            check=True,
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    meta = ffprobe(output)
    if not meta or meta["width"] != 1920 or meta["height"] != 1080 or meta["duration"] + 0.05 < target_sec:
        raise RuntimeError(f"Rendered background failed: {output} -> {meta}")
    return meta


def pick_parts(
    *,
    strict: Any,
    session: requests.Session,
    openai_key: str,
    model: str,
    pexels_key: str,
    pixabay_key: str,
    row: dict[str, Any],
    used_sources: set[str],
    cache: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    needed = row["duration_us"] / US
    parts: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    candidates = discover_candidates(strict, session, row, pexels_key, pixabay_key)
    for candidate in candidates:
        key = candidate_key(candidate)
        if key in used_sources:
            failures.append({"candidate": key, "reason": "already_used"})
            continue
        source = strict.download_candidate(session, candidate)
        if not source:
            failures.append({"candidate": key, "reason": "download_failed"})
            continue
        meta = ffprobe(source)
        ok, reason = quality_ok(meta)
        if not ok:
            failures.append({"candidate": key, "reason": reason, "meta": meta})
            continue
        verdict = direct_frame_gate(
            session=session,
            api_key=openai_key,
            model=model,
            row=row,
            candidate=candidate,
            source=source,
            meta=meta,
            cache=cache,
        )
        if not verdict["pass"]:
            failures.append({"candidate": key, "reason": "direct_frame_gate_failed", "verdict": verdict})
            continue
        available = max(MIN_PART_SEC, float(meta["duration"]) - 0.25)
        remaining = needed - sum(part["take_sec"] for part in parts)
        if remaining <= 0:
            return parts, failures
        take = min(available, remaining)
        if take < MIN_PART_SEC and parts and available >= MIN_PART_SEC:
            take = MIN_PART_SEC
        if take < MIN_PART_SEC and parts:
            continue
        parts.append(
            {
                "source_path": str(source),
                "candidate": {
                    "source": candidate.source,
                    "source_id": candidate.source_id,
                    "title": candidate.title,
                    "page_url": candidate.page_url,
                    "license": candidate.license,
                    "license_url": candidate.license_url,
                    "query": candidate.query,
                },
                "source_meta": meta,
                "take_sec": round(take, 6),
                "direct_frame_gate": verdict,
            }
        )
        used_sources.add(key)
        if sum(part["take_sec"] for part in parts) + 0.05 >= needed:
            return parts, failures
    return [], failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, default=100)
    args = parser.parse_args()

    env = {**load_env(), **os.environ}
    openai_key = env.get("OPENAI_API_KEY")
    pexels_key = env.get("PEXELS_API_KEY")
    pixabay_key = env.get("PIXABAY_API_KEY")
    if not openai_key or not pexels_key or not pixabay_key:
        raise RuntimeError("OPENAI_API_KEY, PEXELS_API_KEY and PIXABAY_API_KEY are required")

    strict = load_strict_module()
    rows = load_rows()
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    gate_session = requests.Session()
    cache = load_gate_cache()
    used_sources: set[str] = set()
    manifest_rows: list[dict[str, Any]] = []

    for row in rows:
        index = int(row["index"])
        if index < args.start or index > args.end:
            continue
        output = RENDER_DIR / f"{index:03d}_chains_direct_bg.mp4"
        if output.exists():
            meta = ffprobe(output)
            if meta:
                manifest_rows.append({"index": row["index"], "english": row["english"], "russian": row["russian"], "path": str(output), "rendered_meta": meta, "cached_render": True})
                write_json(MANIFEST_PATH, {"rows": manifest_rows, "count": len(manifest_rows), "gate": "direct_frame_score>=4_no_blur_no_loop"})
                continue
        print(f"[chains-bg] {index:03d}/100 {row['english']}", flush=True)
        parts, failures = pick_parts(
            strict=strict,
            session=session,
            openai_key=openai_key,
            model=env.get("CHAINS_BG_VISION_MODEL", "gpt-4o-mini"),
            pexels_key=pexels_key,
            pixabay_key=pixabay_key,
            row=row,
            used_sources=used_sources,
            cache=cache,
        )
        if not parts:
            raise RuntimeError(f"No direct-association background for {index:03d}: {row['english']} failures={failures[:8]}")
        rendered_meta = render_sequence(parts, output, int(row["duration_us"]))
        manifest_rows.append(
            {
                "index": row["index"],
                "english": row["english"],
                "russian": row["russian"],
                "ipa": row.get("ipa"),
                "visual_anchor": row.get("visual_anchor", []),
                "path": str(output),
                "duration_us": row["duration_us"],
                "rendered_meta": rendered_meta,
                "parts": parts,
                "failed_candidates_sample": failures[:12],
                "cached_render": False,
            }
        )
        write_json(MANIFEST_PATH, {"rows": manifest_rows, "count": len(manifest_rows), "gate": "direct_frame_score>=4_no_blur_no_loop"})

    direct_failures = [
        item
        for row in manifest_rows
        for item in row.get("parts", [])
        if not item.get("direct_frame_gate", {}).get("pass")
    ]
    if direct_failures:
        raise RuntimeError(f"Direct frame gate leaked failures: {len(direct_failures)}")
    write_json(MANIFEST_PATH, {"rows": manifest_rows, "count": len(manifest_rows), "gate": "direct_frame_score>=4_no_blur_no_loop"})
    print(json.dumps({"out": str(MANIFEST_PATH), "rows": len(manifest_rows)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
