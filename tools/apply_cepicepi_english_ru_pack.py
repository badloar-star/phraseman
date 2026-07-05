#!/usr/bin/env python3
"""Apply the English-Russian Cepicepi pack to the CapCut template.

Target project: Ð¦Ð•ÐŸÐ˜ Ð¦Ð•ÐŸÐ˜ Ð¦Ð•ÐŸÐ˜ (1)  â€” same structure as the French pack.
25 chains Ã— 4 steps = 100 phrases, 3 parts Ã— 100 slots = 300 background slots.

Part 1: EN â†’ RU â†’ EN2
Part 2: RU â†’ EN â†’ EN2
Part 3: EN â†’ EN2 (no Russian)

Voices:
  en1  â€” alloy   (clear, warm, confident male â€” good teaching pace)
  ru   â€” shimmer (natural warm Russian female)
  en2  â€” nova    (friendly female â€” second English voice, distinct from alloy)
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_chains_800_capcut_project import set_text, update_meta, write_json  # noqa: E402


PROJECT_NAME = "Ð¦Ð•ÐŸÐ˜ Ð¦Ð•ÐŸÐ˜ Ð¦Ð•ÐŸÐ˜ (1)"
PACK = Path("exports/chains/cepicepi_english_ru_a1a2_20260607")
ROWS_PATH = PACK / "english_chains_100.json"
BG_REPORT = PACK / "semantic_backgrounds" / "background_generation_report.json"
AUDIO_DIR = PACK / "openai_audio"
APPLY_REPORT = PACK / "capcut_apply_report.json"
QA_REPORT = PACK / "capcut_ready_final_qa.json"
OPENAI_TTS_MODEL = "gpt-4o-mini-tts"
US = 1_000_000

# Voices: alloy (en1) + nova (en2) are distinct English voices, shimmer for Russian.
# Speed: teaching pace â€” instructions explicitly say slow and clear.
ROLE_CONFIG = {
    "en1": {
        "voice": "alloy",
        "instructions": (
            "Speak clear, natural English for language learners. "
            "Calm and warm teaching pace â€” not too fast, not robotic. "
            "Pronounce every word clearly. Say only the phrase, nothing else."
        ),
    },
    "ru": {
        "voice": "shimmer",
        "instructions": (
            "Speak Russian naturally and warmly, like a pleasant lesson host. "
            "Clear pronunciation, slightly faster than the English voice but still comfortable. "
            "Say only the phrase, nothing else."
        ),
    },
    "en2": {
        "voice": "nova",
        "instructions": (
            "Speak clear natural English with a friendly female voice. "
            "Calm teaching pace, warm tone. "
            "Say only the phrase, nothing else."
        ),
    },
}


def project_path() -> Path:
    return (
        Path(os.environ["LOCALAPPDATA"])
        / "CapCut"
        / "User Data"
        / "Projects"
        / "com.lveditor.draft"
        / PROJECT_NAME
    )


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                key, value = stripped.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    values.update({k: v for k, v in os.environ.items() if k == "OPENAI_TTS_API_KEY"})
    return values


def capcut_is_open() -> bool:
    result = subprocess.run(
        [
            "powershell", "-NoProfile", "-Command",
            "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def media_map(content: dict[str, Any], group: str) -> dict[str, dict[str, Any]]:
    return {
        m.get("id"): m
        for m in content.get("materials", {}).get(group, [])
        if isinstance(m, dict) and m.get("id")
    }


def timer(seg: dict[str, Any]) -> tuple[int, int]:
    tr = seg.get("target_timerange") or {}
    return int(tr.get("start", 0)), int(tr.get("duration", 0))


def normalize_spaces(text: str) -> str:
    return " ".join(str(text).replace("\n", " ").split())


def wrap_text(text: str, limit: int) -> str:
    words = normalize_spaces(text).split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= limit:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def digest_audio(text: str, role: str) -> str:
    payload = {
        "model": OPENAI_TTS_MODEL,
        "role": role,
        "voice": ROLE_CONFIG[role]["voice"],
        "text": text,
    }
    return hashlib.sha1(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()[:14]


def raw_audio_path(text: str, role: str) -> Path:
    return AUDIO_DIR / "raw" / role / f"{digest_audio(text, role)}.wav"


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1",
            str(path),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {result.stderr[:300]}")
    return float(result.stdout.strip())


def openai_tts(api_key: str, text: str, role: str, out_path: Path) -> None:
    cfg = ROLE_CONFIG[role]
    payload = json.dumps(
        {
            "model": OPENAI_TTS_MODEL,
            "voice": cfg["voice"],
            "input": text,
            "instructions": cfg["instructions"],
            "response_format": "wav",
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    last_error: Exception | None = None
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                out_path.write_bytes(response.read())
            return
        except urllib.error.HTTPError as error:
            last_error = RuntimeError(
                error.read().decode("utf-8", errors="replace")[:800]
            )
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.4 * attempt)
    raise RuntimeError(f"OpenAI TTS failed for {role}: {last_error}")


def atempo_chain(factor: float) -> str:
    values = []
    remaining = factor
    while remaining > 2.0:
        values.append(2.0)
        remaining /= 2.0
    while remaining < 0.5:
        values.append(0.5)
        remaining /= 0.5
    values.append(remaining)
    return ",".join(f"atempo={v:.6f}" for v in values)


def fit_audio(raw: Path, target: Path, slot_us: int) -> dict[str, Any]:
    slot_sec = slot_us / US
    raw_sec = ffprobe_duration(raw)
    speed = 1.0
    filters: list[str] = []
    if raw_sec > max(slot_sec - 0.08, 0.2):
        speed = raw_sec / max(slot_sec - 0.08, 0.2)
        filters.append(atempo_chain(speed))
    filters.append(f"apad=pad_dur={max(slot_sec, 0.1):.6f}")
    filters.append(f"atrim=0:{slot_sec:.6f}")
    target.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(raw),
            "-af", ",".join(filters),
            "-ar", "48000", "-ac", "2",
            str(target),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"audio fit failed for {raw}: {result.stdout[:500]}")
    return {
        "path": str(target),
        "raw_sec": round(raw_sec, 3),
        "slot_sec": round(slot_sec, 3),
        "speed": round(speed, 4),
    }


def localize(project: Path, source: Path, folder: str) -> Path:
    target = project / "Resources" / folder / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or target.stat().st_size != source.stat().st_size:
        shutil.copy2(source, target)
    return target


def generate_audio(content: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    api_key = load_env().get("OPENAI_TTS_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_TTS_API_KEY is required â€” add to .env.local or set env var")

    # Build job list matching track/segment indices in the template:
    # Part 1 (slots 0..99):   track18=ru(first), track19=en1(second), track20=en2(third)
    # Part 2 (slots 100..199): track18=ru(first), track19=en1(second), track20=en2(third)
    # Part 3 (slots 200..299): track19=en1, track20=en2 (no Russian)
    #
    # Wait â€” the FR template had:
    #   Part1 slot: t18=fr1_first, t19=ru_second, t20=fr2_third  â†’ EN1 EN RU EN2 EN
    #   Part2 slot: t18=ru_first,  t19=fr1_second, t20=fr2_third â†’ RU EN EN2
    # For EN-RU we adapt:
    #   Part1: EN1 first â†’ RU second â†’ EN2 third
    #   Part2: RU first â†’ EN1 second â†’ EN2 third
    #   Part3: EN1 first â†’ EN2 second
    #
    # Track mapping from the French apply script:
    #   part1: role ru  â†’ track 18, seg idx
    #          role fr1 â†’ track 19, seg idx
    #          role fr2 â†’ track 20, seg idx
    #   part2: role ru  â†’ track 18, seg 100+idx
    #          role fr1 â†’ track 19, seg 100+idx
    #          role fr2 â†’ track 20, seg 100+idx
    #   part3: role fr1 â†’ track 19, seg 200+idx
    #          role fr2 â†’ track 20, seg 200+idx
    #
    # We keep the same track â†’ position mapping, only swap the TEXT of the role.
    # In the EN-RU version:
    #   track18 = "first voice in slot"
    #     Part1: EN1 (english)  Part2: RU (russian)  Part3: â€“
    #   track19 = "second voice in slot"
    #     Part1: RU (russian)   Part2: EN1 (english)  Part3: EN1 (english)
    #   track20 = "third voice in slot"
    #     Part1: EN2 (english)  Part2: EN2 (english)  Part3: EN2 (english)
    #
    # So jobs:
    jobs: list[dict[str, Any]] = []
    for idx, row in enumerate(rows):
        en = row["english"]
        ru = row["russian"]
        jobs.extend([
            # Part 1: EN1 â†’ RU â†’ EN2
            {"part": 1, "role": "en1", "text": en,  "track": 18, "seg": idx},
            {"part": 1, "role": "ru",  "text": ru,  "track": 19, "seg": idx},
            {"part": 1, "role": "en2", "text": en,  "track": 20, "seg": idx},
            # Part 2: RU â†’ EN1 â†’ EN2
            {"part": 2, "role": "ru",  "text": ru,  "track": 18, "seg": 100 + idx},
            {"part": 2, "role": "en1", "text": en,  "track": 19, "seg": 100 + idx},
            {"part": 2, "role": "en2", "text": en,  "track": 20, "seg": 100 + idx},
            # Part 3: EN1 â†’ EN2 (no Russian)
            {"part": 3, "role": "en1", "text": en,  "track": 19, "seg": 200 + idx},
            {"part": 3, "role": "en2", "text": en,  "track": 20, "seg": 200 + idx},
        ])

    generated_raw = 0
    fitted: list[dict[str, Any]] = []
    for n, job in enumerate(jobs, start=1):
        raw = raw_audio_path(job["text"], job["role"])
        if not raw.exists() or raw.stat().st_size < 10_000:
            print(
                f"TTS {n:03d}/{len(jobs)} [{job['role']}] {job['text'][:70]}",
                flush=True,
            )
            openai_tts(api_key, job["text"], job["role"], raw)
            generated_raw += 1
        seg = content["tracks"][int(job["track"])]["segments"][int(job["seg"])]
        _, slot_us = timer(seg)
        target = (
            AUDIO_DIR
            / "fitted"
            / str(job["role"])
            / f"t{job['track']}_s{job['seg']}_{slot_us}.wav"
        )
        fit = fit_audio(raw, target, slot_us)
        fitted.append({**job, **fit})

    report = {
        "generated_raw": generated_raw,
        "fitted_count": len(fitted),
        "max_speed": max(item["speed"] for item in fitted),
        "items": fitted,
    }
    (AUDIO_DIR / "audio_generation_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return report


def apply() -> dict[str, Any]:
    if capcut_is_open():
        raise SystemExit("CapCut is open â€” close it before editing native draft files.")

    project = project_path()
    content = load_json(project / "draft_content.json")
    rows = load_json(ROWS_PATH)

    audio_report = generate_audio(content, rows)
    bg_report = load_json(BG_REPORT)
    bg_by_index = {int(item["index"]): item for item in bg_report["assignments"]}

    texts = media_map(content, "texts")
    audios = media_map(content, "audios")
    videos = media_map(content, "videos")

    # â”€â”€ Text replacement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Track layout (inherited from FR template â€” same positions):
    #   track[3] = secondary text (Part1: RU delayed, Part2: EN delayed, Part3: absent)
    #   track[4] = IPA/pronunciation hint â€” for EN we put a light phonetic hint
    #   track[5] = primary text   (Part1: EN, Part2: RU, Part3: EN)
    #
    # Pronunciation hint: just the lowercase English phrase (no IPA library needed â€”
    # native English speakers don't need IPA, but we keep the track populated so
    # nothing breaks in CapCut).
    text_changes = 0
    for idx, row in enumerate(rows):
        en = wrap_text(row["english"], 40)
        ru = wrap_text(row["russian"], 34)
        # "pronunciation" for EN: we just repeat the phrase in lowercase as a subtle hint
        hint = wrap_text(row["english"].lower().rstrip(".!?"), 52)

        # Part 1
        set_text(texts[content["tracks"][5]["segments"][idx]["material_id"]], en)
        set_text(texts[content["tracks"][4]["segments"][idx]["material_id"]], hint)
        set_text(texts[content["tracks"][3]["segments"][idx]["material_id"]], ru)

        # Part 2
        set_text(texts[content["tracks"][5]["segments"][100 + idx]["material_id"]], ru)
        set_text(texts[content["tracks"][4]["segments"][100 + idx]["material_id"]], hint)
        set_text(texts[content["tracks"][3]["segments"][100 + idx]["material_id"]], en)

        # Part 3 (track3 has no segments for part3)
        set_text(texts[content["tracks"][5]["segments"][200 + idx]["material_id"]], en)
        set_text(texts[content["tracks"][4]["segments"][200 + idx]["material_id"]], hint)

        text_changes += 8

    # â”€â”€ Audio replacement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    audio_items = {
        (int(item["track"]), int(item["seg"]), str(item["role"])): item
        for item in audio_report["items"]
    }
    audio_changes = 0
    for idx, _row in enumerate(rows):
        for role, track, seg_idx in [
            ("en1", 18, idx),        ("ru",  19, idx),        ("en2", 20, idx),
            ("ru",  18, 100 + idx),  ("en1", 19, 100 + idx),  ("en2", 20, 100 + idx),
            ("en1", 19, 200 + idx),  ("en2", 20, 200 + idx),
        ]:
            item = audio_items[(track, seg_idx, role)]
            local = localize(project, Path(item["path"]), "cepicepi_english_openai_audio")
            seg = content["tracks"][track]["segments"][seg_idx]
            mat = audios[seg["material_id"]]
            mat["path"] = str(local)
            mat["media_path"] = str(local)
            mat["duration"] = int((seg.get("target_timerange") or {}).get("duration", 0))
            mat["name"] = local.name
            mat["material_name"] = local.name
            audio_changes += 1

    # â”€â”€ Background replacement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bg_changes = 0
    for part in range(3):
        for idx, row in enumerate(rows):
            seg_idx = part * 100 + idx
            seg = content["tracks"][1]["segments"][seg_idx]
            mat = videos[seg["material_id"]]
            source = Path(bg_by_index[int(row["index"])]["rendered_path"])
            local = localize(project, source, "cepicepi_english_phrase_backgrounds")
            mat["path"] = str(local)
            mat["media_path"] = str(local)
            mat["duration"] = int((seg.get("target_timerange") or {}).get("duration", 0))
            mat["name"] = f"{seg_idx + 1:03d}_{local.name}"
            mat["material_name"] = f"{seg_idx + 1:03d}_{local.name}"
            mat["width"] = 1920
            mat["height"] = 1080
            mat["has_audio"] = False
            seg["visible"] = True
            if isinstance(seg.get("clip"), dict):
                seg["clip"]["alpha"] = 1
            seg["common_keyframes"] = [
                kf for kf in seg.get("common_keyframes", [])
                if kf.get("property_type") != "KFTypeAlpha"
            ]
            bg_changes += 1

    # Hide the overlay track[2] (service/preset track)
    try:
        content["tracks"][2]["segments"][0]["visible"] = False
        content["tracks"][2]["segments"][0].setdefault("clip", {})["alpha"] = 0
    except Exception:
        pass

    # â”€â”€ Write all mirrors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    write_json(project / "draft_content.json", content)
    if (project / "template-2.tmp").exists():
        write_json(project / "template-2.tmp", content)
    if (project / "Timelines").exists():
        for mirror in (project / "Timelines").glob("*/draft_content.json"):
            write_json(mirror, content)
    update_meta(project, content)

    report = {
        "status": "ready",
        "project": str(project),
        "text_changes": text_changes,
        "audio_changes": audio_changes,
        "background_video_material_replacements": bg_changes,
        "audio": {
            "fitted_count": audio_report["fitted_count"],
            "max_speed": audio_report["max_speed"],
        },
    }
    APPLY_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def text_value(mat: dict[str, Any] | None) -> str:
    if not mat:
        return ""
    raw = mat.get("content") or mat.get("base_content") or ""
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return str(data.get("text") or data.get("content") or raw)
    except Exception:
        pass
    return str(raw)


def qa() -> dict[str, Any]:
    project = project_path()
    content = load_json(project / "draft_content.json")
    template = (
        load_json(project / "template-2.tmp")
        if (project / "template-2.tmp").exists()
        else None
    )
    timeline_paths = (
        sorted((project / "Timelines").glob("*/draft_content.json"))
        if (project / "Timelines").exists()
        else []
    )
    timeline_docs = [load_json(p) for p in timeline_paths]
    texts = media_map(content, "texts")
    audios = media_map(content, "audios")
    videos = media_map(content, "videos")
    errors: list[str] = []

    if template is None or content != template:
        errors.append("draft/template mirror mismatch")
    if not all(content == doc for doc in timeline_docs):
        errors.append("timeline mirror mismatch")

    missing = []
    for group, mats in [("audio", audios), ("video", videos)]:
        for mat in mats.values():
            path = mat.get("path")
            if path and (":" in str(path) or str(path).startswith("\\\\")) and not Path(path).exists():
                missing.append({"group": group, "id": mat.get("id"), "path": path})
    if missing:
        errors.append(f"missing media: {len(missing)}")

    line_bad = []
    bad_text = []
    for ti, tr in enumerate(content.get("tracks", [])):
        if tr.get("type") != "text":
            continue
        for seg in tr.get("segments", []):
            value = text_value(texts.get(seg.get("material_id")))
            if "????" in value or "Ã" in value or "Ã‘" in value:
                bad_text.append({"track": ti, "text": value})
            is_ru = any(("Ð" <= ch <= "Ñ") or ch in "ÐÑ‘" for ch in value)
            limit = 52 if ti == 4 else (34 if is_ru else 40)
            for line in value.split("\n"):
                if len(line) > limit:
                    line_bad.append({"track": ti, "limit": limit, "line": line, "text": value})

    if line_bad:
        errors.append(f"text line length violations: {len(line_bad)}")
    if bad_text:
        errors.append(f"bad encoded text: {len(bad_text)}")

    bg_en = [
        m for m in videos.values()
        if "cepicepi_english_phrase_backgrounds" in str(m.get("path") or m.get("media_path") or "")
    ]
    audio_en = [
        m for m in audios.values()
        if "cepicepi_english_openai_audio" in str(m.get("path") or m.get("media_path") or "")
    ]
    if len(bg_en) < 300:
        errors.append(f"English background material count {len(bg_en)} < 300")
    if len(audio_en) < 800:
        errors.append(f"English audio material count {len(audio_en)} < 800")

    report = {
        "status": "ready" if not errors else "failed",
        "errors": errors,
        "project": str(project),
        "mirrors": {
            "draft_template_equal": template is not None and content == template,
            "timeline_count": len(timeline_paths),
            "all_timelines_equal": all(content == doc for doc in timeline_docs),
        },
        "media": {
            "missing_count": len(missing),
            "english_background_materials": len(bg_en),
            "english_audio_materials": len(audio_en),
        },
        "text": {
            "line_violations": len(line_bad),
            "line_violations_sample": line_bad[:10],
            "bad_encoded_text": len(bad_text),
        },
    }
    QA_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    mode = sys.argv[1] if len(sys.argv) > 1 else "apply"
    if mode == "apply":
        print(json.dumps(apply(), ensure_ascii=False, indent=2), flush=True)
    elif mode == "qa":
        print(json.dumps(qa(), ensure_ascii=False, indent=2), flush=True)
    else:
        raise SystemExit(f"unknown mode: {mode!r}  (use 'apply' or 'qa')")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
