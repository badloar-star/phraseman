#!/usr/bin/env python3
"""Repair Chains 800 delivery as two openable CapCut drafts.

Root cause: the single 800-row draft doubles the root timeline size and CapCut
does not open it reliably. This repair keeps the known-good DIRECT_BG shape and
creates two 400-row editable drafts.
"""

from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Any

import eng_to_ipa


US = 1_000_000
SOURCE_DRAFT = "CHAINS_EP01_EN_OPENAI_DIRECT_BG 20260601_214833"
TARGET_BASE = "CHAINS_800_OPENABLE_PART"
ROWS_PATH = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_build/chains_800_timeline_rows.json")
AUDIO_DIR = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_build/sapi_audio_800")
OUT = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_repair")
IPA_REPLACEMENTS = {"workbook*": "ˈwɜrkˌbʊk"}


def gid() -> str:
    return str(uuid.uuid4()).upper()


def root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def text_payload(material: dict[str, Any]) -> dict[str, Any]:
    try:
        return json.loads(material.get("content") or "{}")
    except Exception:
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
            raise RuntimeError(f"word too long: {word!r}")
        candidate = word if not cur else f"{cur} {word}"
        if len(candidate) <= max_chars or not cur:
            cur = candidate
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        raise RuntimeError(f"too many lines for {text!r}: {lines!r}")
    return "\n".join(lines)


def ipa_for(text: str) -> str:
    value = eng_to_ipa.convert(text.rstrip("."))
    for bad, good in IPA_REPLACEMENTS.items():
        value = value.replace(bad, good)
    if "*" in value:
        raise RuntimeError(f"IPA unknown in {text!r}: {value!r}")
    return value.strip().strip("/")


def clone_material(material: dict[str, Any], new_path: Path | None = None, duration: int | None = None) -> dict[str, Any]:
    out = json.loads(json.dumps(material))
    out["id"] = gid()
    if "unique_id" in out:
        out["unique_id"] = gid()
    if "local_material_id" in out:
        out["local_material_id"] = gid().lower()
    if new_path is not None:
        out["path"] = str(new_path)
        out["name"] = new_path.name
        out["material_name"] = new_path.name
    if duration is not None:
        out["duration"] = duration
    if "wave_points" in out:
        out["wave_points"] = []
    return out


def audio_duration_us(path: Path) -> int:
    import wave

    with wave.open(str(path), "rb") as wav:
        return int(round((wav.getnframes() / wav.getframerate()) * US))


def localize_audio(target: Path, src: Path) -> Path:
    out = target / "Resources" / "chains_800_part_audio" / src.parent.name / src.name
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists() or out.stat().st_size != src.stat().st_size:
        shutil.copy2(src, out)
    return out


def set_audio(content: dict[str, Any], target: Path, segment: dict[str, Any], template_material: dict[str, Any], role: str, row_index: int) -> None:
    src = AUDIO_DIR / role / f"{row_index:03d}.wav"
    if not src.exists():
        raise RuntimeError(f"missing audio {src}")
    local = localize_audio(target, src)
    duration = audio_duration_us(local)
    mat = clone_material(template_material, local, duration)
    content["materials"]["audios"].append(mat)
    segment["material_id"] = mat["id"]
    segment["source_timerange"] = {"start": 0, "duration": min(duration, int(segment["target_timerange"]["duration"]))}


def update_project_registration(target: Path, content: dict[str, Any]) -> None:
    now = int(time.time() * US)
    project_id = gid()
    size = sum(p.stat().st_size for p in (target / "Resources").rglob("*") if p.is_file())
    meta_path = target / "draft_meta_info.json"
    meta = read_json(meta_path)
    meta.update(
        {
            "draft_id": project_id,
            "draft_name": target.name,
            "draft_fold_path": target.as_posix(),
            "draft_root_path": target.parent.as_posix(),
            "draft_is_invisible": False,
            "tm_duration": content["duration"],
            "tm_draft_modified": now,
            "tm_draft_removed": 0,
            "draft_timeline_materials_size": size,
            "draft_timeline_materials_size_": size,
        }
    )
    meta.pop("draft_duration", None)
    write_json(meta_path, meta)
    root_meta_path = target.parent / "root_meta_info.json"
    root_meta = read_json(root_meta_path)
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cover": (target / "draft_cover.jpg").as_posix(),
        "draft_fold_path": target.as_posix(),
        "draft_id": project_id,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_json_file": (target / "draft_content.json").as_posix().replace("/", "\\", 1) if False else (target / "draft_content.json").as_posix(),
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
    stores = root_meta.get("all_draft_store") or root_meta.get("drafts") or []
    stores = [item for item in stores if item.get("draft_name") != target.name]
    stores.insert(0, entry)
    root_meta["all_draft_store"] = stores
    if "drafts" in root_meta:
        root_meta["drafts"] = stores
    root_meta["draft_ids"] = max(int(root_meta.get("draft_ids", 0) or 0), len(stores))
    root_meta["root_path"] = target.parent.as_posix()
    write_json(root_meta_path, root_meta)


def build_part(part: int, rows: list[dict[str, Any]]) -> dict[str, Any]:
    source = root() / SOURCE_DRAFT
    target = root() / f"{TARGET_BASE}{part}_{time.strftime('%Y%m%d_%H%M%S')}"
    shutil.copytree(source, target)
    if (target / ".locked").exists():
        (target / ".locked").unlink()
    content = read_json(target / "draft_content.json")
    texts = {item["id"]: item for item in content["materials"]["texts"]}
    audios = {item["id"]: item for item in content["materials"]["audios"]}
    audio_templates = {
        "en1": audios[content["tracks"][9]["segments"][0]["material_id"]],
        "ru": audios[content["tracks"][10]["segments"][0]["material_id"]],
        "en2": audios[content["tracks"][11]["segments"][0]["material_id"]],
    }
    second_audio_templates = {
        "en1": audios[content["tracks"][14]["segments"][0]["material_id"]],
        "ru": audios[content["tracks"][15]["segments"][0]["material_id"]],
        "en2": audios[content["tracks"][16]["segments"][0]["material_id"]],
    }
    for local_i, row in enumerate(rows):
        row_index = int(row["index"])
        en = wrap_words(row["english"].upper(), 34, 2)
        ru = wrap_words(row["russian"].upper(), 39, 2)
        ipa = wrap_words(ipa_for(row["english"]), 42, 2)
        # First half text.
        set_text(texts[content["tracks"][4]["segments"][local_i]["material_id"]], en)
        set_text(texts[content["tracks"][2]["segments"][local_i]["material_id"]], ru)
        set_text(texts[content["tracks"][3]["segments"][local_i]["material_id"]], ipa)
        # Second half text.
        set_text(texts[content["tracks"][5]["segments"][local_i]["material_id"]], ru)
        set_text(texts[content["tracks"][3]["segments"][400 + local_i]["material_id"]], en)
        set_text(texts[content["tracks"][2]["segments"][400 + local_i]["material_id"]], ipa)
        # First half audio.
        set_audio(content, target, content["tracks"][9]["segments"][local_i], audio_templates["en1"], "en1", row_index)
        set_audio(content, target, content["tracks"][10]["segments"][local_i], audio_templates["ru"], "ru", row_index)
        set_audio(content, target, content["tracks"][11]["segments"][local_i], audio_templates["en2"], "en2", row_index)
        # Second half audio.
        set_audio(content, target, content["tracks"][15]["segments"][local_i], second_audio_templates["ru"], "ru", row_index)
        set_audio(content, target, content["tracks"][14]["segments"][local_i], second_audio_templates["en1"], "en1", row_index)
        set_audio(content, target, content["tracks"][16]["segments"][local_i], second_audio_templates["en2"], "en2", row_index)
    # Keep exact source structure and duration.
    write_json(target / "draft_content.json", content)
    if (target / "template-2.tmp").exists():
        write_json(target / "template-2.tmp", content)
    timeline_path = target / "Timelines" / str(content["id"]) / "draft_content.json"
    if timeline_path.parent.exists():
        write_json(timeline_path, content)
    update_project_registration(target, content)
    return {
        "part": part,
        "target": str(target),
        "rows": [int(rows[0]["index"]), int(rows[-1]["index"])],
        "duration_us": content["duration"],
        "content_size_mb": round((target / "draft_content.json").stat().st_size / 1024 / 1024, 2),
        "tracks": [{"index": i, "type": t.get("type"), "name": t.get("name"), "segments": len(t.get("segments", []))} for i, t in enumerate(content["tracks"])],
    }


def validate(report: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    for part in report["parts"]:
        target = Path(part["target"])
        content = read_json(target / "draft_content.json")
        if not (target / "Timelines" / str(content["id"]) / "draft_content.json").exists():
            errors.append(f"part {part['part']} timeline mirror missing")
        missing = []
        for group in ("videos", "audios", "images"):
            for item in content.get("materials", {}).get(group, []):
                path = item.get("path")
                if path and not Path(path).exists():
                    missing.append(path)
        if missing:
            errors.append(f"part {part['part']} missing paths {len(missing)}")
        if len(content["tracks"][4]["segments"]) != 400 or len(content["tracks"][5]["segments"]) != 400:
            errors.append(f"part {part['part']} bad text segment counts")
        if any(len(content["tracks"][idx]["segments"]) != 400 for idx in [9, 10, 11, 14, 15, 16]):
            errors.append(f"part {part['part']} bad audio segment counts")
    return {"error_count": len(errors), "errors": errors}


def main() -> int:
    rows = read_json(ROWS_PATH)
    if len(rows) != 800:
        raise RuntimeError(f"need 800 rows, got {len(rows)}")
    part1 = build_part(1, rows[:400])
    part2 = build_part(2, rows[400:800])
    report = {"source": str(root() / SOURCE_DRAFT), "parts": [part1, part2]}
    report["validation"] = validate(report)
    write_pretty(OUT / "chains_800_two_openable_parts_report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["validation"]["error_count"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
