#!/usr/bin/env python3
"""Complete RU->ES LANGFIX draft with fresh semantic backgrounds, reusing the safe partial renders."""

from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path
from typing import Any


BASE_TARGET = "VENGA_ES_200_0601_LANGFIX"
TARGET_DRAFT = "VENGA_ES_200_0601_LANGFIX_FINAL"
PACK_DIR = Path("exports/venga-phrase-packs/ru-es-a1-vsscp")
INITIAL_PARTIAL_RENDER_DIR = (
    Path(os.environ["LOCALAPPDATA"])
    / "CapCut"
    / "User Data"
    / "Projects"
    / "com.lveditor.draft"
    / "VENGA_ES_200_0601_FRESHBG 20260601_153649"
    / "Resources"
    / "venga_ru_es_fresh_semantic_bg_20260601_153701"
)
OUT_SUBDIR = "venga_ru_es_langfix_fresh_semantic_bg"
US = 1_000_000


def load_builder():
    module_path = Path("tools/build_venga_ru_de_user_template_new_backgrounds.py")
    spec = importlib.util.spec_from_file_location("fresh_bg_builder", module_path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    module.PACK_DIR = PACK_DIR
    module.OUT_SUBDIR = OUT_SUBDIR
    module.OLD_BACKGROUND_TOKENS = tuple(
        set(module.OLD_BACKGROUND_TOKENS)
        | {
            "venga_ru_de_fresh_semantic_bg",
            "venga_ru_es_fresh_semantic_bg",
            "venga_ru_es_langfix_fresh_semantic_bg",
            "venga_semantic_strict_bg",
            "venga_semantic_strict_noblur_bg",
            "venga_semantic_noblur_open_bg",
        }
    )
    return module


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def source_key_from_name(path: Path) -> tuple[str, str] | None:
    match = re.match(r"^\d+_([^_]+)_([^_]+)_fresh$", path.stem)
    if not match:
        return None
    return match.group(1).lower(), match.group(2)


def cleanup_old_background_dirs(target_dir: Path, builder: Any, render_dir: Path) -> list[str]:
    removed: list[str] = []
    resources = target_dir / "Resources"
    for child in resources.iterdir():
        if not child.is_dir() or child.resolve() == render_dir.resolve():
            continue
        name = child.name
        if any(token in name for token in builder.OLD_BACKGROUND_TOKENS):
            shutil.rmtree(child, ignore_errors=True)
            removed.append(name)
    return removed


def best_partial_render_dir(capcut_root: Path) -> Path:
    candidates = [INITIAL_PARTIAL_RENDER_DIR]
    for draft in capcut_root.glob("VENGA_ES_200_0601_LANGFIX_FINAL*"):
        resources = draft / "Resources"
        if resources.exists():
            candidates.extend(path for path in resources.glob("venga_ru_es_langfix_fresh_semantic_bg_*") if path.is_dir())
    existing = [path for path in candidates if path.exists()]
    if not existing:
        return INITIAL_PARTIAL_RENDER_DIR
    return max(existing, key=lambda path: len(list(path.glob("*.mp4"))))


def main() -> int:
    builder = load_builder()
    strict = builder.load_strict_module()
    env = {**strict.load_env_file(Path(".env.local")), **os.environ}
    pexels_key = env.get("PEXELS_API_KEY")
    pixabay_key = env.get("PIXABAY_API_KEY")
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / BASE_TARGET
    if not source_dir.exists():
        raise RuntimeError(f"Missing base draft: {source_dir}")
    partial_render_dir = best_partial_render_dir(capcut_root)
    if not partial_render_dir.exists():
        raise RuntimeError(f"Missing partial render dir: {partial_render_dir}")
    target_dir = builder.unique_draft_dir(capcut_root, TARGET_DRAFT, resume=False)
    shutil.copytree(source_dir, target_dir)
    if (target_dir / ".locked").exists():
        (target_dir / ".locked").unlink()

    draft = load_json(target_dir / "draft_content.json")
    bg_track = draft["tracks"][0]
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    template_material = videos[bg_track["segments"][0]["material_id"]]
    rows = builder.rows_for_backgrounds()
    session = strict.requests.Session()
    render_dir = target_dir / "Resources" / f"{OUT_SUBDIR}_{time.strftime('%Y%m%d_%H%M%S')}"
    render_dir.mkdir(parents=True, exist_ok=True)
    removed_dirs = cleanup_old_background_dirs(target_dir, builder, render_dir)

    banned = builder.source_ids_from_current_bg(draft) | builder.source_ids_from_reports()
    used: set[tuple[str, str]] = set()
    new_materials: list[dict[str, Any]] = []
    report_rows: list[dict[str, Any]] = []

    for index, (row, segment) in enumerate(zip(rows, bg_track["segments"], strict=True), start=1):
        duration_us = int(segment["target_timerange"]["duration"])
        existing = next(partial_render_dir.glob(f"{index:03d}_*_fresh.mp4"), None)
        if existing:
            output = render_dir / existing.name
            shutil.copy2(existing, output)
            key = source_key_from_name(output)
            if key:
                used.add(key)
            rendered_meta = builder.ffprobe(output)
            sharpness = builder.sharpness_score(output)
            sequence_sources = [
                {
                    "selected": {"source": key[0], "source_id": key[1]} if key else {"source": "partial", "source_id": output.stem},
                    "score": None,
                    "clip_duration_sec": round(duration_us / US, 3),
                    "source_meta": rendered_meta,
                    "visual_summary": {"reused_from_partial_strict_render": True},
                }
            ]
            failed: list[dict[str, Any]] = []
        else:
            profile = strict.profile_for_phrase(row["en"])
            sequence, failed = builder.pick_sequence(
                strict=strict,
                session=session,
                profile=profile,
                duration_us=duration_us,
                banned=banned,
                used=used,
                pexels_key=pexels_key,
                pixabay_key=pixabay_key,
            )
            if not sequence:
                raise RuntimeError(f"No fresh semantic background for {index:03d} {row['en']}. Failed sample: {failed[:8]}")
            primary = sequence[0]["candidate"]
            output = render_dir / f"{index:03d}_{primary.source}_{primary.source_id}_fresh.mp4"
            rendered_meta = builder.render_sequence(sequence, output)
            sharpness = builder.sharpness_score(output)
            sequence_sources = [
                {
                    "selected": strict.serialize_candidate(item["candidate"]),
                    "score": item["score"],
                    "clip_duration_sec": round(item["duration_sec"], 3),
                    "source_meta": item["source_meta"],
                    "visual_summary": item["visual"].get("summary", {}),
                }
                for item in sequence
            ]
        material = builder.video_material_from_template(template_material, output, duration_us, output.name, strict)
        new_materials.append(material)
        segment["material_id"] = material["id"]
        segment["source_timerange"] = {"start": 0, "duration": duration_us}
        segment["is_loop"] = False
        report_rows.append(
            {
                "index": f"{index:03d}",
                "en": row["en"],
                "ru": row["ru"],
                "rendered_path": str(output),
                "rendered_meta": rendered_meta,
                "sharpness_score": sharpness,
                "sequence_sources": sequence_sources,
                "failed_runtime_candidates": failed[:12],
                "reused_partial": bool(existing),
            }
        )
        if index % 10 == 0:
            print(f"[es-final-bg] prepared {index}/200", flush=True)

    draft["materials"]["videos"].extend(new_materials)
    pruned = builder.prune_stale_background_video_materials(draft)
    for path in builder.patch_content_paths(target_dir, draft):
        write_json(path, draft)
    builder.update_identity_and_register(target_dir, draft)
    meta_sync = builder.sync_draft_meta_materials(target_dir, draft)
    unique_sources = {
        (str(src["selected"].get("source", "")).lower(), str(src["selected"].get("source_id", "")))
        for item in report_rows
        for src in item["sequence_sources"]
    }
    low_sharp = [item for item in report_rows if float(item["sharpness_score"]) < 180.0]
    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_draft": str(source_dir),
        "partial_render_dir": str(partial_render_dir),
        "render_subdir": render_dir.name,
        "background_count": len(report_rows),
        "reused_partial_count": sum(1 for item in report_rows if item["reused_partial"]),
        "rendered_new_count": sum(1 for item in report_rows if not item["reused_partial"]),
        "unique_source_count": len(unique_sources),
        "low_sharpness_count_lt_180": len(low_sharp),
        "low_sharpness_sample": low_sharp[:10],
        "removed_old_background_dirs": removed_dirs,
        "pruned_stale_background_video_materials": pruned,
        **meta_sync,
        "rows": report_rows,
    }
    out = PACK_DIR / "fresh_background_langfix_final_report.json"
    write_pretty(out, report)
    print(json.dumps({k: v for k, v in report.items() if k != "rows"}, ensure_ascii=False, indent=2), flush=True)
    if low_sharp:
        raise RuntimeError(f"Fresh background gate failed: low sharpness {len(low_sharp)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
