#!/usr/bin/env python3
"""Repair text/audio binding in the two openable Chains 800 CapCut parts.

Previous repair updated materials by duplicated CapCut material IDs. Some
segments therefore still pointed at old template payloads. This pass creates a
fresh material per edited text/audio segment and rebinds each segment to it.
"""

from __future__ import annotations

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


US = 1_000_000
PACK = Path("exports/chains/phrase_packs/chains_800_20260603")
ROWS_JSON = PACK / "capcut_build" / "chains_800_timeline_rows.json"
AUDIO_DIR = PACK / "capcut_build" / "sapi_audio_800"
REPORT = PACK / "capcut_repair" / "chains_800_binding_repair_report.json"
PROJECTS = [
    ("CHAINS_800_READY_PART1_001_400 20260603_214026", 0, 400),
    ("CHAINS_800_READY_PART2_401_800 20260603_214046", 400, 800),
]


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


def backup_project(project: Path) -> Path:
    backup = Path(".codex-tmp/capcut-backups") / f"{project.name}.backup-before-binding-repair-{time.strftime('%Y%m%d_%H%M%S')}"
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(project, backup)
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
    if material.get("base_content") is not None:
        material["base_content"] = text


def wrap_words(text: str, max_chars: int, max_lines: int) -> str:
    text = " ".join(str(text).split())
    if len(text) <= max_chars:
        return text
    lines: list[str] = []
    cur = ""
    for word in text.split():
        if len(word) > max_chars:
            raise RuntimeError(f"word too long for wrap gate: {word!r} in {text!r}")
        candidate = word if not cur else f"{cur} {word}"
        if len(candidate) <= max_chars:
            cur = candidate
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        raise RuntimeError(f"text exceeds line gate: {text!r} -> {lines!r}")
    return "\n".join(lines)


def row_text(row: dict[str, Any], kind: str) -> str:
    if kind == "en":
        return wrap_words(str(row["english"]).upper(), 42, 3)
    if kind == "ru":
        return wrap_words(str(row["russian"]).upper(), 43, 3)
    if kind == "ipa":
        return wrap_words(str(row.get("ipa") or row["english"]).strip("/"), 50, 3)
    raise ValueError(kind)


def materials_by_id(content: dict[str, Any], group: str) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    for item in content.get("materials", {}).get(group, []):
        if isinstance(item, dict) and item.get("id"):
            out.setdefault(item["id"], []).append(item)
    return out


def first_material(content: dict[str, Any], group: str, material_id: str) -> dict[str, Any]:
    found = materials_by_id(content, group).get(material_id) or []
    if not found:
        raise RuntimeError(f"material not found: {group}:{material_id}")
    return found[0]


def clone_material(material: dict[str, Any]) -> dict[str, Any]:
    out = deepcopy(material)
    out["id"] = gid()
    if "unique_id" in out:
        out["unique_id"] = gid()
    if "local_material_id" in out:
        out["local_material_id"] = gid().lower()
    return out


def sorted_segments(content: dict[str, Any], track_idx: int) -> list[dict[str, Any]]:
    return sorted(content["tracks"][track_idx].get("segments", []), key=lambda s: int(s["target_timerange"]["start"]))


def wav_duration_us(path: Path) -> int:
    with wave.open(str(path), "rb") as src:
        return int(round((src.getnframes() / src.getframerate()) * US))


def bind_text(content: dict[str, Any], track_idx: int, segs: list[dict[str, Any]], rows: list[dict[str, Any]], kind: str) -> None:
    for seg, row in zip(segs, rows, strict=True):
        template = first_material(content, "texts", seg["material_id"])
        mat = clone_material(template)
        set_text(mat, row_text(row, kind))
        content["materials"]["texts"].append(mat)
        seg["material_id"] = mat["id"]
        seg["visible"] = True


def bind_audio(content: dict[str, Any], project: Path, track_idx: int, segs: list[dict[str, Any]], rows: list[dict[str, Any]], role: str) -> None:
    for idx, (seg, row) in enumerate(zip(segs, rows, strict=True)):
        src = AUDIO_DIR / role / f"{int(row['index']):03d}.wav"
        if not src.exists() or src.stat().st_size <= 4096:
            raise RuntimeError(f"missing audio: {src}")
        local = project / "Resources" / "chains_800_bound_audio" / role / src.name
        local.parent.mkdir(parents=True, exist_ok=True)
        if not local.exists() or local.stat().st_size != src.stat().st_size:
            shutil.copy2(src, local)
        duration = wav_duration_us(local)
        next_start = int(segs[idx + 1]["target_timerange"]["start"]) if idx + 1 < len(segs) else None
        if next_start:
            duration = min(duration, max(1, next_start - int(seg["target_timerange"]["start"]) - 100_000))
        template = first_material(content, "audios", seg["material_id"])
        mat = clone_material(template)
        mat["path"] = str(local)
        mat["name"] = local.name
        mat["material_name"] = local.name
        mat["duration"] = duration
        if "wave_points" in mat:
            mat["wave_points"] = []
        content["materials"]["audios"].append(mat)
        seg["material_id"] = mat["id"]
        seg["target_timerange"]["duration"] = duration
        if seg.get("source_timerange") is not None:
            seg["source_timerange"] = {"start": 0, "duration": duration}
        if seg.get("render_timerange") is not None:
            seg["render_timerange"] = {"start": int(seg["target_timerange"]["start"]), "duration": duration}
        seg["visible"] = True


def mirror(project: Path, content: dict[str, Any]) -> None:
    write_json(project / "draft_content.json", content)
    if (project / "template-2.tmp").exists():
        write_json(project / "template-2.tmp", content)
    timeline = project / "Timelines" / str(content["id"]) / "draft_content.json"
    if timeline.parent.exists():
        write_json(timeline, content)


def active_text(content: dict[str, Any], track_idx: int, midpoint: int) -> str:
    mats = materials_by_id(content, "texts")
    for seg in sorted_segments(content, track_idx):
        tr = seg["target_timerange"]
        start = int(tr["start"])
        end = start + int(tr["duration"])
        if start <= midpoint < end:
            mat = mats.get(seg["material_id"], [{}])[-1]
            return str(text_payload(mat).get("text", "")).replace("\n", " ")
    return ""


def validate_binding(project: Path, rows: list[dict[str, Any]]) -> dict[str, Any]:
    content = load_json(project / "draft_content.json")
    errors: list[str] = []
    en_first = sorted_segments(content, 4)
    for i, (seg, row) in enumerate(zip(en_first, rows, strict=True), start=1):
        midpoint = int(seg["target_timerange"]["start"]) + int(seg["target_timerange"]["duration"]) // 2
        en = active_text(content, 4, midpoint)
        ru = active_text(content, 2, midpoint)
        if str(row["english"]).upper().split()[0] not in en:
            errors.append(f"EN mismatch at local {i} row {row['index']}: {en!r}")
            break
        expected_ru_first = str(row["russian"]).upper().split()[0]
        if expected_ru_first not in ru:
            errors.append(f"RU mismatch at local {i} row {row['index']}: got {ru!r}, expected starts {expected_ru_first!r}")
            break
    missing = []
    for group in ("videos", "audios"):
        for mat in content.get("materials", {}).get(group, []):
            path = mat.get("path")
            if path and not Path(str(path)).exists():
                missing.append(path)
    if missing:
        errors.append(f"missing media paths: {len(missing)}")
    return {
        "error_count": len(errors),
        "errors": errors,
        "missing_paths": len(missing),
        "draft_content_mb": round((project / "draft_content.json").stat().st_size / 1024 / 1024, 2),
    }


def repair_project(name: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    project = capcut_root() / name
    if not project.exists():
        raise RuntimeError(f"project missing: {project}")
    backup = backup_project(project)
    content = load_json(project / "draft_content.json")

    bind_text(content, 4, sorted_segments(content, 4), rows, "en")
    bind_text(content, 2, sorted_segments(content, 2)[:400], rows, "ru")
    bind_text(content, 3, sorted_segments(content, 3)[:400], rows, "ipa")
    bind_text(content, 5, sorted_segments(content, 5), rows, "ru")
    bind_text(content, 3, sorted_segments(content, 3)[400:800], rows, "en")
    bind_text(content, 2, sorted_segments(content, 2)[400:800], rows, "ipa")

    bind_audio(content, project, 9, sorted_segments(content, 9), rows, "en1")
    bind_audio(content, project, 10, sorted_segments(content, 10), rows, "ru")
    bind_audio(content, project, 11, sorted_segments(content, 11), rows, "en2")
    bind_audio(content, project, 15, sorted_segments(content, 15), rows, "ru")
    bind_audio(content, project, 14, sorted_segments(content, 14), rows, "en1")
    bind_audio(content, project, 16, sorted_segments(content, 16), rows, "en2")

    mirror(project, content)
    validation = validate_binding(project, rows)
    return {"project": name, "backup": str(backup), "rows": f"{rows[0]['index']:03d}-{rows[-1]['index']:03d}", "validation": validation}


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing draft files.")
    all_rows = load_json(ROWS_JSON)
    report = {"created_at": time.strftime("%Y-%m-%d %H:%M:%S"), "projects": []}
    for name, start, end in PROJECTS:
        report["projects"].append(repair_project(name, all_rows[start:end]))
    report["error_count"] = sum(item["validation"]["error_count"] for item in report["projects"])
    write_pretty(REPORT, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["error_count"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
