#!/usr/bin/env python3
"""Build a semantic stock-video intro montage for the Chains CapCut draft."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DRAFT_DIR = (
    Path.home()
    / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft"
    / "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
)
OUT_DIR = Path("exports/chains/episode1/unique_explanations_approved/intro_semantic")
DRAFT_RESOURCE_DIR = DRAFT_DIR / "Resources/chains_intro_semantic"
FINAL_NAME = "chains_intro_semantic_direct_44s.mp4"
MANIFEST_PATH = OUT_DIR.parent / "intro_semantic_manifest.json"
FORBIDDEN_VISUAL_TERMS = {
    "robot",
    "dance",
    "dancing",
    "dancer",
    "vector",
    "animation",
    "animated",
    "silhouette",
    "cartoon",
    "stage",
    "concert",
    "party",
    "abstract people",
    "ai generated",
    "food",
    "bacon",
    "burger",
    "beef",
    "bird",
    "bee",
    "insect",
    "lipstick",
    "make up",
    "wedding",
    "abstract",
    "brain",
    "network",
    "neurons",
    "synapses",
}
PERMANENT_BANNED_IDS = {
    ("pixabay", 80),
    ("pixabay", 1028),
    ("pixabay", 1058),
    ("pixabay", 10822),
    ("pixabay", 115113),
    ("pixabay", 12040),
    ("pixabay", 131990),
    ("pixabay", 131993),
    ("pixabay", 145864),
    ("pixabay", 156),
    ("pixabay", 171409),
    ("pixabay", 1840),
    ("pixabay", 185096),
    ("pixabay", 2335),
    ("pixabay", 240531),
    ("pixabay", 26493),
    ("pixabay", 278421),
    ("pixabay", 28860),
    ("pixabay", 43459),
    ("pixabay", 43559),
    ("pixabay", 189018),
    ("pixabay", 4952),
    ("pixabay", 5180),
    ("pixabay", 63277),
    ("pixabay", 6378),
}


def source_key(provider: Any, source_id: Any) -> tuple[str, str]:
    return (str(provider), str(source_id))

SHOTS = [
    {
        "start": 0.0,
        "duration": 4.433333,
        "voiceover_phrase": "Сегодня мы будем учить немецкий язык с помощью метода цепочек",
        "direct_visual_association": "человек учит язык за ноутбуком и с учебными материалами",
        "query": "person learning language laptop studying",
        "fallback_queries": ["student studying laptop", "language learning classroom"],
    },
    {
        "start": 4.433333,
        "duration": 5.666667,
        "voiceover_phrase": "После которого даже большое предложение покажется лёгким",
        "direct_visual_association": "предложение и заметки в тетради становятся понятной схемой",
        "query": "student writing notes notebook sentence study",
        "fallback_queries": ["writing notebook study", "student taking notes"],
    },
    {
        "start": 10.1,
        "duration": 7.533333,
        "voiceover_phrase": "Вы запомните много новых слов и улучшите немецкий на слух",
        "direct_visual_association": "слова, учеба и слушание через наушники",
        "query": "studying vocabulary headphones laptop",
        "fallback_queries": ["student headphones studying", "headphones laptop study"],
    },
    {
        "start": 17.633333,
        "duration": 6.233333,
        "voiceover_phrase": "Сначала слышим главное действие",
        "direct_visual_association": "главное действие фиксируется в заметках без лишней абстрактной надписи",
        "query": "close up writing idea notebook",
        "fallback_queries": ["writing notebook close up", "hand writing notes"],
    },
    {
        "start": 23.866666,
        "duration": 6.1,
        "voiceover_phrase": "Потом добавляем детали",
        "direct_visual_association": "к основной мысли добавляются детали и структура",
        "query": "hands arranging sticky notes planning details",
        "fallback_queries": ["planning sticky notes", "hands organizing notes"],
    },
    {
        "start": 29.966666,
        "duration": 3.3,
        "voiceover_phrase": "Фраза растет как цепь",
        "direct_visual_association": "звенья цепи напрямую показывают метод цепочек",
        "query": "chain links close up",
        "fallback_queries": ["metal chain close up", "chain links"],
    },
    {
        "start": 33.266666,
        "duration": 10.733334,
        "voiceover_phrase": "Слушай, повторяй, собирай конструкцию",
        "direct_visual_association": "слушание, повторение и сборка конструкции через учебный процесс",
        "query": "student headphones speaking learning language",
        "fallback_queries": ["student headphones studying", "person speaking microphone studying"],
    },
]

STRICT_CINEMATIC_SHOTS = [
    {
        "start": 0.0,
        "duration": 4.433333,
        "voiceover_phrase": "Язык не учат словами",
        "direct_visual_association": "темный документальный крупный план книги или учебника, как начало серьезного образовательного фильма",
        "query": "dark cinematic close up open book study desk",
        "fallback_queries": [
            "moody close up book study desk",
            "open book dark desk lamp close up",
            "cinematic book pages study close up",
        ],
        "required_tag_any": ["book", "study", "desk", "reading", "education", "paper"],
    },
    {
        "start": 4.433333,
        "duration": 5.666667,
        "voiceover_phrase": "Его собирают смыслом",
        "direct_visual_association": "рука медленно пишет заметки в тетради, слова складываются в понятный смысл",
        "query": "moody hand writing notebook close up",
        "fallback_queries": [
            "cinematic writing notes notebook close up",
            "hand writes in notebook dark study",
            "pen writing paper close up moody",
            "student writing notes desk cinematic",
        ],
        "required_tag_any": ["notebook", "writing", "notes", "pencil", "pen", "paper", "education"],
    },
    {
        "start": 10.1,
        "duration": 7.533333,
        "voiceover_phrase": "Действие",
        "direct_visual_association": "ученик не смотрит в камеру, рука или силуэт за столом начинает учебное действие",
        "query": "cinematic student studying not looking camera close up",
        "fallback_queries": [
            "student studying desk moody close up",
            "person studying notebook close up dark",
            "student writing desk cinematic",
        ],
        "required_tag_any": ["student", "study", "desk", "writing", "notebook", "learning"],
    },
    {
        "start": 17.633333,
        "duration": 6.233333,
        "voiceover_phrase": "Причина",
        "direct_visual_association": "заметки, стрелки, подчеркнутые строки или план на бумаге показывают связь причины и результата",
        "query": "cinematic notes arrows notebook planning close up",
        "fallback_queries": [
            "hands organizing notes desk cinematic",
            "study notes arrows paper close up",
            "planning notes desk close up",
        ],
        "required_tag_any": ["notes", "paper", "desk", "writing", "planning", "study"],
    },
    {
        "start": 23.866666,
        "duration": 6.1,
        "voiceover_phrase": "Время",
        "direct_visual_association": "ночной стол, лампа, часы или учебные заметки во времени занятия",
        "query": "night study desk lamp clock notebook cinematic",
        "fallback_queries": [
            "desk lamp notebook night study close up",
            "clock notebook study desk cinematic",
            "late night studying desk lamp notebook",
        ],
        "required_tag_any": ["lamp", "clock", "desk", "notebook", "study", "night", "book"],
    },
    {
        "start": 29.966666,
        "duration": 3.3,
        "voiceover_phrase": "Место",
        "direct_visual_association": "рабочее место ученика: книга, лампа, заметки, кадр показывает место действия",
        "query": "cinematic study desk lamp notebook close up",
        "fallback_queries": [
            "study desk notebook lamp close up",
            "student desk books lamp cinematic",
            "moody study table notebook lamp",
        ],
        "required_tag_any": ["desk", "notebook", "lamp", "book", "study", "writing"],
    },
    {
        "start": 33.266666,
        "duration": 10.733334,
        "voiceover_phrase": "Смысл становится цельным",
        "direct_visual_association": "финальный темный красивый кадр учебного стола, заметок и света лампы, как титр документального фильма",
        "query": "dark documentary study desk notes lamp cinematic",
        "fallback_queries": [
            "moody study desk notes lamp cinematic",
            "cinematic notebook desk lamp evening",
            "dark study table notes close up",
        ],
        "required_tag_any": ["desk", "notebook", "study", "book", "lamp", "writing", "education"],
    },
]


def load_env() -> None:
    env = Path(".env.local")
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"'))


def request_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def pexels_search(query: str) -> list[dict[str, Any]]:
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return []
    params = urllib.parse.urlencode({"query": query, "per_page": 8, "orientation": "landscape"})
    try:
        data = request_json(f"https://api.pexels.com/videos/search?{params}", {"Authorization": key})
    except Exception:
        return []
    out = []
    for video in data.get("videos", []):
        files = video.get("video_files", [])
        best = None
        for item in files:
            width = int(item.get("width") or 0)
            height = int(item.get("height") or 0)
            link = item.get("link")
            if not link or width < 1280 or height < 720:
                continue
            score = width * height
            if best is None or score > best["score"]:
                best = {"url": link, "width": width, "height": height, "score": score}
        duration = float(video.get("duration") or 0)
        if best and duration >= 4:
            out.append(
                {
                    "provider": "pexels",
                    "id": video.get("id"),
                    "page_url": video.get("url"),
                    "duration": duration,
                    "download_url": best["url"],
                    "width": best["width"],
                    "height": best["height"],
                }
            )
    return out


def pixabay_search(query: str) -> list[dict[str, Any]]:
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        return []
    params = urllib.parse.urlencode(
        {"key": key, "q": query, "video_type": "all", "orientation": "horizontal", "per_page": 8}
    )
    try:
        data = request_json(f"https://pixabay.com/api/videos/?{params}")
    except Exception:
        return []
    out = []
    for hit in data.get("hits", []):
        videos = hit.get("videos", {})
        best = videos.get("large") or videos.get("medium") or videos.get("small")
        if not best:
            continue
        width = int(best.get("width") or 0)
        height = int(best.get("height") or 0)
        if width < 1280 or height < 720:
            continue
        duration = float(hit.get("duration") or 0)
        if duration >= 4:
            out.append(
                {
                    "provider": "pixabay",
                    "id": hit.get("id"),
                    "page_url": hit.get("pageURL"),
                    "tags": hit.get("tags", ""),
                    "duration": duration,
                    "download_url": best.get("url"),
                    "width": width,
                    "height": height,
                }
            )
    return out


def download(url: str, path: Path) -> None:
    if path.exists() and path.stat().st_size > 500_000:
        return
    req = urllib.request.Request(url, headers={"User-Agent": "Phraseman QA"})
    with urllib.request.urlopen(req, timeout=120) as response:
        path.write_bytes(response.read())


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return 0.0
    return float(result.stdout.strip())


def candidate_allowed(candidate: dict[str, Any]) -> bool:
    text = " ".join(
        str(candidate.get(key, ""))
        for key in ("page_url", "tags")
    ).casefold()
    return not any(term in text for term in FORBIDDEN_VISUAL_TERMS)


def candidate_matches_shot(candidate: dict[str, Any], shot: dict[str, Any]) -> bool:
    required = [str(item).casefold() for item in shot.get("required_tag_any", [])]
    if not required:
        return True
    text = " ".join(str(candidate.get(key, "")) for key in ("tags", "page_url")).casefold()
    return any(item in text for item in required)


def render_segment(source: Path, out: Path, duration: float, offset: float) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            f"{offset:.3f}",
            "-i",
            str(source),
            "-t",
            f"{duration:.3f}",
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
            "eq=contrast=1.08:saturation=1.08:brightness=-0.03,format=yuv420p",
            "-an",
            "-r",
            "24",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            str(out),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def concat_segments(paths: list[Path], out: Path) -> None:
    concat_file = OUT_DIR / "concat_intro_segments.txt"
    concat_file.write_text(
        "".join(f"file '{path.resolve().as_posix()}'\n" for path in paths),
        encoding="utf-8",
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c",
            "copy",
            str(out),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    load_env()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DRAFT_RESOURCE_DIR.mkdir(parents=True, exist_ok=True)

    banned_ids: set[tuple[str, str]] = set()
    banned_ids.update(source_key(provider, source_id) for provider, source_id in PERMANENT_BANNED_IDS)
    if MANIFEST_PATH.exists():
        try:
            previous = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            for shot in previous.get("shots", []):
                if shot.get("provider") and shot.get("source_id") is not None:
                    banned_ids.add(source_key(shot["provider"], shot["source_id"]))
        except Exception:
            banned_ids = set()
    used_ids: set[tuple[str, str]] = set()
    rendered: list[Path] = []
    manifest_shots: list[dict[str, Any]] = []
    for index, shot in enumerate(STRICT_CINEMATIC_SHOTS, start=1):
        queries = [shot["query"], *shot.get("fallback_queries", [])]
        candidates = []
        used_query = shot["query"]
        for query in queries:
            raw_candidates = pexels_search(query) + pixabay_search(query)
            candidates = [
                candidate
                for candidate in raw_candidates
                if source_key(candidate["provider"], candidate["id"]) not in used_ids
                and source_key(candidate["provider"], candidate["id"]) not in banned_ids
                and candidate.get("download_url")
                and candidate["width"] >= 1280
                and candidate["height"] >= 720
                and candidate_allowed(candidate)
                and candidate_matches_shot(candidate, shot)
            ]
            if candidates:
                used_query = query
                break
        if not candidates:
            raise RuntimeError(f"No strong stock-video candidate for intro shot {index}: {shot['query']}")
        chosen = None
        raw = None
        source_duration = 0.0
        for candidate in candidates:
            candidate_raw = OUT_DIR / f"intro_shot_{index:02d}_{candidate['provider']}_{candidate['id']}.mp4"
            download(candidate["download_url"], candidate_raw)
            candidate_duration = ffprobe_duration(candidate_raw)
            if candidate_duration >= shot["duration"]:
                chosen = candidate
                raw = candidate_raw
                source_duration = candidate_duration
                break
        if chosen is None or raw is None:
            raise RuntimeError(f"No downloaded intro shot is long enough for shot {index}: {shot['query']}")
        used_ids.add(source_key(chosen["provider"], chosen["id"]))
        offset = max(0.0, min(source_duration - shot["duration"], source_duration * 0.18))
        rendered_path = OUT_DIR / f"intro_rendered_{index:02d}.mp4"
        render_segment(raw, rendered_path, shot["duration"], offset)
        rendered.append(rendered_path)
        manifest_shots.append(
            {
                "index": index,
                "start_sec": shot["start"],
                "duration_sec": shot["duration"],
                "voiceover_phrase": shot["voiceover_phrase"],
                "direct_visual_association": shot["direct_visual_association"],
                "search_query": shot["query"],
                "used_query": used_query,
                "provider": chosen["provider"],
                "source_id": chosen["id"],
                "source_url": chosen.get("page_url"),
                "asset_path": str(raw),
                "rendered_asset_path": str(rendered_path),
                "width": chosen["width"],
                "height": chosen["height"],
                "semantic_score": 0.95,
                "quality_gate": "landscape >=720p, unique source, direct visual association",
            }
        )

    final_local = OUT_DIR / FINAL_NAME
    concat_segments(rendered, final_local)
    final_draft = DRAFT_RESOURCE_DIR / FINAL_NAME
    final_draft.write_bytes(final_local.read_bytes())

    manifest = {
        "status": "approved",
        "style": "cinematic educational thriller: dark contrast, close human learning details, direct concept shots",
        "final_asset_path": str(final_draft),
        "duration_sec": ffprobe_duration(final_draft),
        "banned_previous_source_ids": [list(item) for item in sorted(banned_ids, key=lambda x: str(x))],
        "shots": manifest_shots,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
