#!/usr/bin/env python3
"""Apply the next Cepicepi phrase pack to the current native CapCut template."""

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

try:
    import eng_to_ipa  # type: ignore
except Exception as error:  # noqa: BLE001
    raise RuntimeError(f"eng_to_ipa is required: {error}") from error


PROJECT_NAME = "\u0426\u0415\u041f\u0418 \u0426\u0415\u041f\u0418 \u0426\u0415\u041f\u0418 (1)"
PACK = Path("exports/chains/cepicepi_next_chains_a1a2_20260605")
ROWS_PATH = PACK / "next_chains_100.json"
BG_REPORT = PACK / "semantic_backgrounds" / "background_generation_report.json"
AUDIO_DIR = PACK / "openai_audio"
APPLY_REPORT = PACK / "capcut_apply_report.json"
QA_REPORT = PACK / "capcut_ready_final_qa.json"
OPENAI_MODEL = "gpt-4o-mini-tts"
US = 1_000_000

ROLE_CONFIG = {
    "en1": {
        "voice": "nova",
        "instructions": "Speak American English beautifully and clearly for A1-A2 learners. Warm, bright, natural teacher voice. Say only the phrase.",
    },
    "ru": {
        "voice": "shimmer",
        "instructions": "Speak Russian beautifully and naturally, warm and clear, like a pleasant lesson host. Say only the phrase.",
    },
    "en2": {
        "voice": "fable",
        "instructions": "Speak American English with a second beautiful voice, softer and calmer than the first. Clear A1-A2 lesson pace. Say only the phrase.",
    },
}


def project_path() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / PROJECT_NAME


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
    values.update({k: v for k, v in os.environ.items() if k == "OPENAI_API_KEY"})
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


def media_map(content: dict[str, Any], group: str) -> dict[str, dict[str, Any]]:
    return {m.get("id"): m for m in content.get("materials", {}).get(group, []) if isinstance(m, dict) and m.get("id")}


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


def ipa_for(text: str) -> str:
    value = eng_to_ipa.convert(str(text).rstrip(".!?")).replace("*", "")
    return normalize_spaces(value)


def digest_audio(text: str, role: str) -> str:
    payload = {"model": OPENAI_MODEL, "role": role, "voice": ROLE_CONFIG[role]["voice"], "text": text}
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:14]


def raw_audio_path(text: str, role: str) -> Path:
    return AUDIO_DIR / "raw" / role / f"{digest_audio(text, role)}.wav"


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
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
            "model": OPENAI_MODEL,
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
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
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
            last_error = RuntimeError(error.read().decode("utf-8", errors="replace")[:800])
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
    return ",".join(f"atempo={value:.6f}" for value in values)


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
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(raw),
            "-af",
            ",".join(filters),
            "-ar",
            "48000",
            "-ac",
            "2",
            str(target),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"audio fit failed for {raw}: {result.stdout[:500]}")
    return {"path": str(target), "raw_sec": round(raw_sec, 3), "slot_sec": round(slot_sec, 3), "speed": round(speed, 4)}


def localize(project: Path, source: Path, folder: str) -> Path:
    target = project / "Resources" / folder / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or target.stat().st_size != source.stat().st_size:
        shutil.copy2(source, target)
    return target


def build_rows() -> list[dict[str, Any]]:
    rows = load_json(ROWS_PATH)
    for row in rows:
        row["ipa"] = ipa_for(row["english"])
    (PACK / "next_chains_100_with_ipa.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return rows


def generate_audio(content: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    api_key = load_env().get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required")
    jobs: list[dict[str, Any]] = []
    # Part 1: EN -> RU -> EN. Part 2: RU -> EN -> EN. Part 3: EN -> EN.
    for idx, row in enumerate(rows):
        jobs.extend(
            [
                {"part": 1, "role": "ru", "text": row["russian"], "track": 17, "seg": idx},
                {"part": 1, "role": "en1", "text": row["english"], "track": 18, "seg": idx},
                {"part": 1, "role": "en2", "text": row["english"], "track": 19, "seg": idx},
                {"part": 2, "role": "ru", "text": row["russian"], "track": 17, "seg": 100 + idx},
                {"part": 2, "role": "en1", "text": row["english"], "track": 18, "seg": 100 + idx},
                {"part": 2, "role": "en2", "text": row["english"], "track": 19, "seg": 100 + idx},
                {"part": 3, "role": "en1", "text": row["english"], "track": 18, "seg": 200 + idx},
                {"part": 3, "role": "en2", "text": row["english"], "track": 19, "seg": 200 + idx},
            ]
        )
    generated_raw = 0
    fitted = []
    for n, job in enumerate(jobs, start=1):
        raw = raw_audio_path(job["text"], job["role"])
        if not raw.exists() or raw.stat().st_size < 10_000:
            print(f"TTS {n:03d}/{len(jobs)} {job['role']} {job['text'][:70]}", flush=True)
            openai_tts(api_key, job["text"], job["role"], raw)
            generated_raw += 1
        seg = content["tracks"][int(job["track"])]["segments"][int(job["seg"])]
        _, slot_us = timer(seg)
        target = AUDIO_DIR / "fitted" / str(job["role"]) / f"t{job['track']}_s{job['seg']}_{slot_us}.wav"
        fit = fit_audio(raw, target, slot_us)
        fitted.append({**job, **fit})
    report = {
        "generated_raw": generated_raw,
        "fitted_count": len(fitted),
        "max_speed": max(item["speed"] for item in fitted),
        "items": fitted,
    }
    (AUDIO_DIR / "audio_generation_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def apply() -> dict[str, Any]:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing native draft files.")
    project = project_path()
    content = load_json(project / "draft_content.json")
    rows = build_rows()
    audio_report = generate_audio(content, rows)
    bg_report = load_json(BG_REPORT)
    bg_by_index = {int(item["index"]): item for item in bg_report["assignments"]}
    texts = media_map(content, "texts")
    audios = media_map(content, "audios")
    videos = media_map(content, "videos")

    text_changes = 0
    for idx, row in enumerate(rows):
        # Part 1
        set_text(texts[content["tracks"][3]["segments"][idx]["material_id"]], wrap_text(row["russian"], 34))
        set_text(texts[content["tracks"][4]["segments"][idx]["material_id"]], wrap_text(row["ipa"], 52))
        set_text(texts[content["tracks"][5]["segments"][idx]["material_id"]], wrap_text(row["english"], 40))
        # Part 2: RU and EN swap visual styles/positions according to existing template.
        set_text(texts[content["tracks"][3]["segments"][100 + idx]["material_id"]], wrap_text(row["english"], 40))
        set_text(texts[content["tracks"][4]["segments"][100 + idx]["material_id"]], wrap_text(row["ipa"], 52))
        set_text(texts[content["tracks"][5]["segments"][100 + idx]["material_id"]], wrap_text(row["russian"], 34))
        # Part 3
        set_text(texts[content["tracks"][4]["segments"][200 + idx]["material_id"]], wrap_text(row["ipa"], 52))
        set_text(texts[content["tracks"][5]["segments"][200 + idx]["material_id"]], wrap_text(row["english"], 40))
        text_changes += 8

    audio_items = {(int(item["track"]), int(item["seg"]), str(item["role"])): item for item in audio_report["items"]}
    audio_changes = 0
    for idx, row in enumerate(rows):
        for role, track, seg_idx in [
            ("ru", 17, idx),
            ("en1", 18, idx),
            ("en2", 19, idx),
            ("ru", 17, 100 + idx),
            ("en1", 18, 100 + idx),
            ("en2", 19, 100 + idx),
            ("en1", 18, 200 + idx),
            ("en2", 19, 200 + idx),
        ]:
            item = audio_items[(track, seg_idx, role)]
            local = localize(project, Path(item["path"]), "cepicepi_next_openai_audio")
            seg = content["tracks"][track]["segments"][seg_idx]
            mat = audios[seg["material_id"]]
            mat["path"] = str(local)
            mat["media_path"] = str(local)
            mat["duration"] = int((seg.get("target_timerange") or {}).get("duration", 0))
            mat["name"] = local.name
            mat["material_name"] = local.name
            audio_changes += 1

    bg_changes = 0
    for part in range(3):
        for idx, row in enumerate(rows):
            seg_idx = part * 100 + idx
            seg = content["tracks"][1]["segments"][seg_idx]
            mat = videos[seg["material_id"]]
            source = Path(bg_by_index[int(row["index"])]["rendered_path"])
            local = localize(project, source, "cepicepi_next_phrase_backgrounds")
            mat["path"] = str(local)
            mat["media_path"] = str(local)
            mat["duration"] = int((seg.get("target_timerange") or {}).get("duration", 0))
            mat["name"] = local.name
            mat["material_name"] = local.name
            mat["width"] = 1920
            mat["height"] = 1080
            mat["has_audio"] = False
            bg_changes += 1

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
        "audio": {"fitted_count": audio_report["fitted_count"], "max_speed": audio_report["max_speed"]},
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
    template = load_json(project / "template-2.tmp") if (project / "template-2.tmp").exists() else None
    timeline_paths = sorted((project / "Timelines").glob("*/draft_content.json")) if (project / "Timelines").exists() else []
    timeline_docs = [load_json(p) for p in timeline_paths]
    texts = media_map(content, "texts")
    audios = media_map(content, "audios")
    videos = media_map(content, "videos")
    errors: list[str] = []
    if template is None or content != template:
        errors.append("draft/template mirror mismatch")
    if not all(content == doc for doc in timeline_docs):
        errors.append("timeline mirror mismatch")
    if len(content["tracks"][1]["segments"]) != 300:
        errors.append("background track 1 must have 300 segments")
    missing = []
    for group, mats in [("audio", audios), ("video", videos)]:
        for mat in mats.values():
            path = mat.get("path")
            if path and (":" in str(path) or str(path).startswith("\\\\")) and not Path(path).exists():
                missing.append({"group": group, "id": mat.get("id"), "path": path})
    if missing:
        errors.append(f"missing media: {len(missing)}")
    # No known mid-word splits and line lengths within caps.
    bad_fragments = ["уста\nла", "tire\nd", "dinn\ner", "beca\nuse", "moth\ner"]
    split_bad = []
    line_bad = []
    for ti, tr in enumerate(content.get("tracks", [])):
        if tr.get("type") != "text":
            continue
        for seg in tr.get("segments", []):
            value = text_value(texts.get(seg.get("material_id")))
            low = value.lower()
            if any(fragment.lower() in low for fragment in bad_fragments):
                split_bad.append({"track": ti, "text": value})
            limit = 52 if ti == 4 else (34 if any(("А" <= ch <= "я") or ch in "Ёё" for ch in value) else 40)
            for line in value.split("\n"):
                if len(line) > limit:
                    line_bad.append({"track": ti, "limit": limit, "line": line, "text": value})
    if split_bad:
        errors.append(f"known mid-word split regressions: {len(split_bad)}")
    if line_bad:
        errors.append(f"text line length violations: {len(line_bad)}")
    bg_next = [m for m in videos.values() if "cepicepi_next_phrase_backgrounds" in str(m.get("path") or "")]
    audio_next = [m for m in audios.values() if "cepicepi_next_openai_audio" in str(m.get("path") or "")]
    if len(bg_next) < 300:
        errors.append(f"next background material count {len(bg_next)} < 300")
    if len(audio_next) < 800:
        errors.append(f"next audio material count {len(audio_next)} < 800")
    report = {
        "status": "ready" if not errors else "failed",
        "errors": errors,
        "project": str(project),
        "tracks": len(content.get("tracks", [])),
        "mirrors": {
            "draft_template_equal": template is not None and content == template,
            "timeline_count": len(timeline_paths),
            "all_timelines_equal": all(content == doc for doc in timeline_docs),
        },
        "media": {
            "missing_count": len(missing),
            "next_background_materials": len(bg_next),
            "next_audio_materials": len(audio_next),
        },
        "text": {
            "known_midword_splits": len(split_bad),
            "line_violations": len(line_bad),
            "line_violations_sample": line_bad[:10],
        },
    }
    QA_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in {"apply", "all"}:
        print(json.dumps(apply(), ensure_ascii=False, indent=2), flush=True)
    if mode in {"qa", "all"}:
        print(json.dumps(qa(), ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
