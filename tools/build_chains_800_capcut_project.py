#!/usr/bin/env python3
"""Build an editable CapCut project for 800 Chains timeline phrases.

Source template: the user's working DIRECT_BG Chains draft.
Content source: first 200 generated chains from chains_800_20260603, expanded
to 800 timeline phrase rows.
"""

from __future__ import annotations

import csv
import json
import os
import shutil
import subprocess
import time
import uuid
import wave
from copy import deepcopy
from pathlib import Path
from typing import Any

import eng_to_ipa

US = 1_000_000
SOURCE_DRAFT = "CHAINS_EP01_EN_OPENAI_DIRECT_BG 20260601_214833"
TARGET_BASE = "CHAINS_800_READY_DIRECT_BG"
PACK = Path("exports/chains/phrase_packs/chains_800_20260603")
ROWS_JSON = PACK / "chains_800_phrases.json"
OUT = PACK / "capcut_build"
AUDIO_DIR = OUT / "sapi_audio_800"
TIMELINE_ROWS = 800
INTRO_DUR = 41_100_000
MID_DUR = 9_600_000
CTA_DUR_FALLBACK = 20_100_000
IPA_REPLACEMENTS = {"workbook*": "ˈwɜrkˌbʊk"}


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


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def unique_target(root: Path) -> Path:
    stamp = time.strftime("%Y%m%d_%H%M%S")
    target = root / f"{TARGET_BASE} {stamp}"
    if target.exists():
        return root / f"{TARGET_BASE} {stamp}_{gid()[:6]}"
    return target


def backup_source(source: Path) -> Path:
    backup = Path(".codex-tmp/capcut-backups") / f"{source.name}.backup-before-chains-800-build-{time.strftime('%Y%m%d_%H%M%S')}"
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, backup)
    return backup


def text_payload(material: dict[str, Any]) -> dict[str, Any]:
    try:
        return json.loads(material.get("content") or "{}")
    except json.JSONDecodeError:
        return {}


def set_text(material: dict[str, Any], text: str) -> None:
    payload = text_payload(material)
    payload["text"] = text
    for style in payload.get("styles", []) or []:
        if isinstance(style, dict):
            style["range"] = [0, len(text)]
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if material.get("base_content"):
        material["base_content"] = text


def wrap_words(text: str, max_chars: int, max_lines: int = 2) -> str:
    text = " ".join(text.split())
    words = text.split()
    if len(text) <= max_chars:
        return text
    lines: list[str] = []
    cur = ""
    for word in words:
        if len(word) > max_chars:
            raise RuntimeError(f"word too long for safe wrap: {word!r} in {text!r}")
        candidate = word if not cur else f"{cur} {word}"
        if len(candidate) <= max_chars or not cur:
            cur = candidate
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        raise RuntimeError(f"too many safe-wrap lines: {text!r} -> {lines!r}")
    return "\n".join(lines)


def expanded_rows() -> list[dict[str, Any]]:
    chains = load_json(ROWS_JSON)[:200]
    rows: list[dict[str, Any]] = []
    for chain in chains:
        for step in chain["chain_steps"]:
            rows.append(
                {
                    "index": len(rows) + 1,
                    "chain_id": chain["id"],
                    "step": int(step["step"]),
                    "theme": chain["theme"],
                    "grammar_focus": chain["grammar_focus"],
                    "english": step["en"].rstrip("."),
                    "russian": step["ru"].rstrip("."),
                    "ipa": ipa_for(step["en"]),
                    "background_must_show": chain["background_gate"]["must_show"],
                }
            )
    if len(rows) != TIMELINE_ROWS:
        raise RuntimeError(f"expected {TIMELINE_ROWS} expanded rows, got {len(rows)}")
    return rows


def ipa_for(text: str) -> str:
    value = eng_to_ipa.convert(text.rstrip("."))
    for bad, good in IPA_REPLACEMENTS.items():
        value = value.replace(bad, good)
    if "*" in value:
        raise RuntimeError(f"IPA unknown word in {text!r}: {value!r}")
    return value.strip().strip("/")


def save_rows_csv(rows: list[dict[str, Any]]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "chains_800_timeline_rows.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    (OUT / "chains_800_timeline_rows.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


def wav_duration_us(path: Path) -> int:
    with wave.open(str(path), "rb") as wav:
        return int(round((wav.getnframes() / wav.getframerate()) * US))


def generate_sapi_audio(rows: list[dict[str, Any]]) -> dict[str, Any]:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    jobs: list[dict[str, str]] = []
    voices = {
        "en1": {"culture": "en-US", "gender": "Male"},
        "ru": {"culture": "ru-RU", "gender": "Female"},
        "en2": {"culture": "en-US", "gender": "Female"},
    }
    rates = {"en1": "-2", "ru": "-1", "en2": "0"}
    for row in rows:
        for role in ("en1", "ru", "en2"):
            text = row["russian"] if role == "ru" else row["english"]
            path = AUDIO_DIR / role / f"{int(row['index']):03d}.wav"
            if path.exists() and path.stat().st_size > 4096:
                continue
            jobs.append({"role": role, "culture": voices[role]["culture"], "gender": voices[role]["gender"], "rate": rates[role], "text": text, "path": str(path)})
    jobs_path = OUT / "sapi_jobs.json"
    jobs_path.parent.mkdir(parents=True, exist_ok=True)
    jobs_path.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")
    if jobs:
        ps1 = OUT / "generate_sapi_audio.ps1"
        ps1.write_text(
            "\n".join(
                [
                    "$ErrorActionPreference = 'Stop'",
                    "Add-Type -AssemblyName System.Speech",
                    "$jobs = Get-Content -LiteralPath $args[0] -Raw -Encoding UTF8 | ConvertFrom-Json",
                    "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
                    "$count = 0",
                    "foreach ($job in $jobs) {",
                    "  $dir = Split-Path -Parent $job.path",
                    "  New-Item -ItemType Directory -Force -Path $dir | Out-Null",
                    "  $culture = [System.Globalization.CultureInfo]::GetCultureInfo($job.culture)",
                    "  $gender = [System.Speech.Synthesis.VoiceGender]::$($job.gender)",
                    "  $synth.SelectVoiceByHints($gender, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, $culture)",
                    "  $synth.Rate = [int]$job.rate",
                    "  $synth.Volume = 100",
                    "  $synth.SetOutputToWaveFile($job.path)",
                    "  $synth.Speak($job.text)",
                    "  $synth.SetOutputToNull()",
                    "  $count++",
                    "  if (($count % 100) -eq 0) { Write-Host \"generated $count / $($jobs.Count)\" }",
                    "}",
                    "$synth.Dispose()",
                ]
            ),
            encoding="utf-8",
        )
        subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps1), str(jobs_path)], check=True)
    durations: dict[str, list[int]] = {"en1": [], "ru": [], "en2": []}
    for row in rows:
        for role in durations:
            path = AUDIO_DIR / role / f"{int(row['index']):03d}.wav"
            if not path.exists():
                raise RuntimeError(f"missing generated audio: {path}")
            durations[role].append(wav_duration_us(path))
    return {"generated_now": len(jobs), "total_files": TIMELINE_ROWS * 3, "voices": voices, "durations": durations}


def clone_material(material: dict[str, Any], new_path: Path | None = None, duration: int | None = None) -> dict[str, Any]:
    out = deepcopy(material)
    out["id"] = gid()
    if "unique_id" in out:
        out["unique_id"] = gid()
    if "local_material_id" in out:
        out["local_material_id"] = gid().lower()
    if new_path:
        out["path"] = str(new_path)
        out["name"] = new_path.name
        out["material_name"] = new_path.name
    if duration is not None:
        out["duration"] = duration
    if "wave_points" in out:
        out["wave_points"] = []
    return out


def clone_segment(segment: dict[str, Any], material_id: str, start: int, duration: int, source_duration: int | None = None) -> dict[str, Any]:
    out = deepcopy(segment)
    out["id"] = gid()
    out["material_id"] = material_id
    out["target_timerange"] = {"start": start, "duration": duration}
    if out.get("source_timerange") is not None:
        out["source_timerange"] = {"start": 0, "duration": source_duration if source_duration is not None else duration}
    if out.get("render_timerange") is not None:
        out["render_timerange"] = {"start": start, "duration": duration}
    out["visible"] = True
    return out


def get_materials(content: dict[str, Any], group: str) -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in content["materials"].get(group, []) if isinstance(item, dict) and item.get("id")}


def localize_audio(target_dir: Path, source: Path) -> Path:
    out_dir = target_dir / "Resources" / "chains_800_sapi_audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / source.parent.name / source.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists() or dst.stat().st_size != source.stat().st_size:
        shutil.copy2(source, dst)
    return dst


def update_meta(target: Path, content: dict[str, Any]) -> None:
    now = int(time.time() * US)
    size = sum(p.stat().st_size for p in (target / "Resources").rglob("*") if p.is_file())
    meta_path = target / "draft_meta_info.json"
    meta = load_json(meta_path)
    meta.update(
        {
            "draft_id": gid(),
            "draft_name": target.name,
            "draft_fold_path": target.as_posix(),
            "draft_root_path": target.parent.as_posix(),
            "draft_is_invisible": False,
            "tm_duration": content["duration"],
            "draft_duration": content["duration"],
            "tm_draft_modified": now,
            "tm_draft_removed": 0,
            "draft_timeline_materials_size": size,
            "draft_timeline_materials_size_": size,
        }
    )
    write_json(meta_path, meta)
    root_path = target.parent / "root_meta_info.json"
    root = load_json(root_path)
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cover": (target / "draft_cover.jpg").as_posix(),
        "draft_fold_path": target.as_posix(),
        "draft_id": meta["draft_id"],
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_json_file": (target / "draft_content.json").as_posix(),
        "draft_name": target.name,
        "draft_new_version": meta.get("draft_new_version") or "164.0.0",
        "draft_root_path": target.parent.as_posix(),
        "draft_timeline_materials_size": size,
        "draft_timeline_materials_size_": size,
        "draft_type": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_create": now,
        "tm_draft_modified": now,
        "tm_draft_removed": 0,
        "tm_duration": content["duration"],
    }
    stores = root.get("all_draft_store") or root.get("drafts") or []
    stores = [item for item in stores if item.get("draft_name") != target.name]
    stores.insert(0, entry)
    root["all_draft_store"] = stores
    if "drafts" in root:
        root["drafts"] = stores
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(stores))
    root["root_path"] = target.parent.as_posix()
    write_json(root_path, root)


def localize_copied_project_paths(node: Any, source: Path, target: Path) -> int:
    changed = 0
    source_str = source.as_posix().casefold()
    if isinstance(node, dict):
        for key, value in list(node.items()):
            if isinstance(value, str):
                normalized = Path(value).as_posix()
                if normalized.casefold().startswith(source_str):
                    rel = Path(normalized[len(source.as_posix()) :].lstrip("/\\"))
                    candidate = target / rel
                    if candidate.exists():
                        node[key] = str(candidate)
                        changed += 1
            else:
                changed += localize_copied_project_paths(value, source, target)
    elif isinstance(node, list):
        for item in node:
            changed += localize_copied_project_paths(item, source, target)
    return changed


def compute_duration(content: dict[str, Any]) -> int:
    end = 0
    for track in content.get("tracks", []):
        for seg in track.get("segments", []):
            tr = seg.get("target_timerange") or {}
            end = max(end, int(tr.get("start", 0)) + int(tr.get("duration", 0)))
    return end


def build_project(rows: list[dict[str, Any]], audio: dict[str, Any]) -> dict[str, Any]:
    root = capcut_root()
    source = root / SOURCE_DRAFT
    if not source.exists():
        raise RuntimeError(f"source draft not found: {source}")
    backup = backup_source(source)
    target = unique_target(root)
    shutil.copytree(source, target)
    lock = target / ".locked"
    if lock.exists():
        lock.unlink()

    content = load_json(target / "draft_content.json")
    localized_paths = localize_copied_project_paths(content, source, target)
    text_mats = get_materials(content, "texts")
    audio_mats = get_materials(content, "audios")

    # Templates from the known-good first and second half.
    bg_templates = content["tracks"][0]["segments"][:400]
    first_ru_template = content["tracks"][2]["segments"][0]
    first_ipa_template = content["tracks"][3]["segments"][0]
    first_en_template = content["tracks"][4]["segments"][0]
    second_ru_template = content["tracks"][5]["segments"][0]
    second_ipa_template = content["tracks"][2]["segments"][400]
    second_en_template = content["tracks"][3]["segments"][400]
    en1_seg_template = content["tracks"][9]["segments"][0]
    ru_seg_template = content["tracks"][10]["segments"][0]
    en2_seg_template = content["tracks"][11]["segments"][0]
    second_en1_template = content["tracks"][14]["segments"][0]
    second_ru_template_audio = content["tracks"][15]["segments"][0]
    second_en2_template = content["tracks"][16]["segments"][0]
    cta_template_tracks = [deepcopy(track) for track in content["tracks"][17:23]]
    first_en_mat_template = text_mats[first_en_template["material_id"]]
    first_ru_mat_template = text_mats[first_ru_template["material_id"]]
    first_ipa_mat_template = text_mats[first_ipa_template["material_id"]]
    second_ru_mat_template = text_mats[second_ru_template["material_id"]]
    second_en_mat_template = text_mats[second_en_template["material_id"]]
    second_ipa_mat_template = text_mats[second_ipa_template["material_id"]]
    audio_templates = {
        "en1": audio_mats[en1_seg_template["material_id"]],
        "ru": audio_mats[ru_seg_template["material_id"]],
        "en2": audio_mats[en2_seg_template["material_id"]],
    }

    # Clear phrase/body tracks. Keep intro and middle service tracks.
    for idx in [0, 2, 3, 4, 5, 9, 10, 11, 14, 15, 16]:
        content["tracks"][idx]["segments"] = []
    # Remove old CTA tracks before rebuilding.
    content["tracks"] = content["tracks"][:17]

    def add_text(track_idx: int, template_seg: dict[str, Any], template_mat: dict[str, Any], text: str, start: int, duration: int) -> None:
        mat = clone_material(template_mat)
        set_text(mat, text)
        content["materials"]["texts"].append(mat)
        content["tracks"][track_idx]["segments"].append(clone_segment(template_seg, mat["id"], start, duration))

    def add_audio(track_idx: int, template_seg: dict[str, Any], role: str, row_index: int, start: int, duration: int) -> None:
        src = AUDIO_DIR / role / f"{row_index:03d}.wav"
        local = localize_audio(target, src)
        mat = clone_material(audio_templates[role], local, duration)
        content["materials"]["audios"].append(mat)
        content["tracks"][track_idx]["segments"].append(clone_segment(template_seg, mat["id"], start, duration, duration))

    gap = 650_000
    cta_gap = 900_000
    next_cta = 1800 * US
    row_infos, first_end, next_cta, cta_slots = layout_rows(INTRO_DUR + 1_500_000, rows, audio, next_cta, gap, cta_gap)
    first_end += 2_000_000
    mid_start = first_end
    mid_video_dur = int(content["tracks"][7]["segments"][0]["target_timerange"]["duration"])
    for track_idx in [7, 8, 12, 13]:
        for seg in content["tracks"][track_idx]["segments"]:
            old_start = int(seg["target_timerange"]["start"])
            offset = 350_000 if track_idx == 8 else 0
            seg["target_timerange"]["start"] = mid_start + offset
            if seg.get("source_timerange"):
                seg["source_timerange"]["start"] = 0
    second_start = mid_start + max(mid_video_dur, MID_DUR) + 2_000_000
    second_infos, second_end, next_cta, second_cta_slots = layout_rows(second_start, rows, audio, next_cta, gap, cta_gap)
    cta_slots.extend(second_cta_slots)

    # First half.
    for info, row in zip(row_infos, rows, strict=True):
        i = info["index"]
        start = info["start"]
        slot = info["duration"]
        bg_template = bg_templates[(i - 1) % len(bg_templates)]
        content["tracks"][0]["segments"].append(clone_segment(bg_template, bg_template["material_id"], start, slot, min(slot, int(bg_template.get("source_timerange", {}).get("duration", slot)))))
        en1_start = start
        ru_start = en1_start + info["en1"] + 650_000
        en2_start = ru_start + info["ru"] + 650_000
        add_text(4, first_en_template, first_en_mat_template, wrap_words(row["english"].upper(), 34, 2), start, slot)
        add_text(3, first_ipa_template, first_ipa_mat_template, wrap_words(row["ipa"] or row["english"].lower(), 42, 2), start, slot)
        add_text(2, first_ru_template, first_ru_mat_template, wrap_words(row["russian"].upper(), 39, 2), ru_start, max(1, start + slot - ru_start))
        add_audio(9, en1_seg_template, "en1", i, en1_start, info["en1"])
        add_audio(10, ru_seg_template, "ru", i, ru_start, info["ru"])
        add_audio(11, en2_seg_template, "en2", i, en2_start, info["en2"])

    # Second half, mirrored: Russian first, then English + IPA.
    for info, row in zip(second_infos, rows, strict=True):
        i = info["index"]
        start = info["start"]
        slot = info["duration"]
        bg_template = bg_templates[(i - 1) % len(bg_templates)]
        content["tracks"][0]["segments"].append(clone_segment(bg_template, bg_template["material_id"], start, slot, min(slot, int(bg_template.get("source_timerange", {}).get("duration", slot)))))
        ru_start = start
        en1_start = ru_start + info["ru"] + 650_000
        en2_start = en1_start + info["en1"] + 650_000
        add_text(5, second_ru_template, second_ru_mat_template, wrap_words(row["russian"].upper(), 39, 2), start, slot)
        add_text(3, second_en_template, second_en_mat_template, wrap_words(row["english"].upper(), 34, 2), en1_start, max(1, start + slot - en1_start))
        add_text(2, second_ipa_template, second_ipa_mat_template, wrap_words(row["ipa"] or row["english"].lower(), 42, 2), en1_start, max(1, start + slot - en1_start))
        add_audio(15, second_ru_template_audio, "ru", i, ru_start, info["ru"])
        add_audio(14, second_en1_template, "en1", i, en1_start, info["en1"])
        add_audio(16, second_en2_template, "en2", i, en2_start, info["en2"])

    add_cta_tracks(content, cta_template_tracks, cta_slots)

    content["duration"] = compute_duration(content)
    # Long full-duration helper track.
    if content["tracks"][1]["segments"]:
        content["tracks"][1]["segments"][0]["target_timerange"]["duration"] = content["duration"]
    for track in content["tracks"]:
        track["segments"].sort(key=lambda s: int((s.get("target_timerange") or {}).get("start", 0)))

    write_json(target / "draft_content.json", content)
    if (target / "template-2.tmp").exists():
        write_json(target / "template-2.tmp", content)
    timeline_dir = target / "Timelines" / str(content["id"])
    if timeline_dir.exists():
        write_json(timeline_dir / "draft_content.json", content)
    update_meta(target, content)
    return {
        "target": str(target),
        "source": str(source),
        "backup": str(backup),
        "localized_copied_project_paths": localized_paths,
        "rows": len(rows),
        "duration_us": content["duration"],
        "duration_hours": round(content["duration"] / US / 3600, 3),
        "cta_slots": len(cta_slots),
        "tracks": [{"index": i, "type": t.get("type"), "name": t.get("name"), "segments": len(t.get("segments", []))} for i, t in enumerate(content["tracks"])],
    }


def layout_rows(start: int, rows: list[dict[str, Any]], audio: dict[str, Any], next_cta: int, gap: int, cta_gap: int) -> tuple[list[dict[str, Any]], int, int, list[int]]:
    infos: list[dict[str, Any]] = []
    cta_slots: list[int] = []
    cursor = start
    for i, _row in enumerate(rows, start=1):
        en1_dur = audio["durations"]["en1"][i - 1]
        ru_dur = audio["durations"]["ru"][i - 1]
        en2_dur = audio["durations"]["en2"][i - 1]
        slot = max(en1_dur + ru_dur + en2_dur + 2_600_000, 9_000_000)
        infos.append({"index": i, "start": cursor, "duration": slot, "en1": en1_dur, "ru": ru_dur, "en2": en2_dur})
        cursor += slot + gap
        if cursor >= next_cta:
            cta_slots.append(cursor + cta_gap)
            cursor += CTA_DUR_FALLBACK + cta_gap * 2
            while next_cta <= cursor:
                next_cta += 1800 * US
    return infos, cursor, next_cta, cta_slots


def add_cta_tracks(content: dict[str, Any], template_tracks: list[dict[str, Any]], cta_times: list[int]) -> None:
    # Reuse the already validated CTA tracks from the source template and repeat
    # them every 30 minutes at the nearest row boundary without intersecting rows.
    if not template_tracks:
        return
    base_starts = [int(seg["target_timerange"]["start"]) for track in template_tracks for seg in track.get("segments", [])]
    if not base_starts:
        return
    base_start = min(base_starts)
    base_end = max(int(seg["target_timerange"]["start"]) + int(seg["target_timerange"]["duration"]) for track in template_tracks for seg in track.get("segments", []))
    slot = max(CTA_DUR_FALLBACK, base_end - base_start)
    new_tracks = []
    for track in template_tracks:
        new_track = deepcopy(track)
        new_track["id"] = gid()
        new_track["segments"] = []
        new_tracks.append(new_track)
    for cta_start in cta_times:
        for new_track, template_track in zip(new_tracks, template_tracks, strict=True):
            for seg in template_track.get("segments", [])[:1]:
                old_start = int(seg["target_timerange"]["start"])
                dur = int(seg["target_timerange"]["duration"])
                new_track["segments"].append(clone_segment(seg, seg["material_id"], cta_start + (old_start - base_start), dur, dur))
    content["tracks"].extend(new_tracks)


def validate_project(report: dict[str, Any]) -> dict[str, Any]:
    target = Path(report["target"])
    content = load_json(target / "draft_content.json")
    errors: list[str] = []
    if int(content.get("duration") or 0) <= 0:
        errors.append("draft_content.duration is zero")
    timeline_id = str(content.get("id"))
    if not (target / "Timelines" / timeline_id / "draft_content.json").exists():
        errors.append("timeline mirror draft_content missing")
    missing = []
    for group in ("videos", "audios"):
        for mat in content.get("materials", {}).get(group, []):
            path = mat.get("path")
            if path and not Path(str(path)).exists():
                missing.append(path)
    if missing:
        errors.append(f"missing media paths: {len(missing)}")
    text_tracks = {i: len(content["tracks"][i]["segments"]) for i in [2, 3, 4, 5]}
    audio_tracks = {i: len(content["tracks"][i]["segments"]) for i in [9, 10, 11, 14, 15, 16]}
    cta_tracks = {i: len(track.get("segments", [])) for i, track in enumerate(content["tracks"]) if "CTA" in str(track.get("name", ""))}
    if text_tracks[4] != TIMELINE_ROWS or text_tracks[5] != TIMELINE_ROWS:
        errors.append(f"bad main text counts: {text_tracks}")
    if any(count != TIMELINE_ROWS for count in audio_tracks.values()):
        errors.append(f"bad audio counts: {audio_tracks}")
    if len(cta_tracks) < 6 or any(count == 0 for count in cta_tracks.values()):
        errors.append(f"bad CTA tracks: {cta_tracks}")
    phrase_intervals = []
    for idx in [4, 5, 9, 10, 11, 14, 15, 16]:
        for seg in content["tracks"][idx]["segments"]:
            tr = seg["target_timerange"]
            phrase_intervals.append((int(tr["start"]), int(tr["start"]) + int(tr["duration"]), idx))
    cta_overlaps = 0
    for idx, track in enumerate(content["tracks"]):
        if "CTA" not in str(track.get("name", "")):
            continue
        for seg in track.get("segments", []):
            tr = seg["target_timerange"]
            a = int(tr["start"])
            b = a + int(tr["duration"])
            if any(a < y and x < b for x, y, _track_idx in phrase_intervals):
                cta_overlaps += 1
    if cta_overlaps:
        errors.append(f"CTA overlaps phrase/audio segments: {cta_overlaps}")
    return {"error_count": len(errors), "errors": errors, "text_tracks": text_tracks, "audio_tracks": audio_tracks, "cta_tracks": cta_tracks, "cta_overlaps": cta_overlaps, "missing_paths": len(missing)}


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing native draft files.")
    rows = expanded_rows()
    save_rows_csv(rows)
    audio = generate_sapi_audio(rows)
    report = build_project(rows, audio)
    validation = validate_project(report)
    report["audio"] = {k: v for k, v in audio.items() if k != "durations"}
    report["validation"] = validation
    write_pretty(OUT / "chains_800_capcut_build_report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if validation["error_count"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
