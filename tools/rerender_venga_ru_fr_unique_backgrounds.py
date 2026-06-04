#!/usr/bin/env python3
"""Build non-repeating RU->FR backgrounds and patch the current CapCut draft.

This script exists for the language-version rule: a new target language must not
reuse the previous language's background footage, even when the phrase list is
the same.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


PROJECT = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"
SOURCE_DRAFT = "VENGA A1 200 OPENAI SEMANTIC HQ NOFADE CAPS"
STRICT_REPORT = Path("exports/venga-phrase-packs/semantic-strict-backgrounds/strict_background_report.json")
OPEN_REPORT = Path("exports/venga-phrase-packs/semantic-open-backgrounds/semantic_background_report.json")
REPORT_PATH = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/unique_language_backgrounds_report.json")
OUT_SUBDIR = "venga_semantic_unique_language_noblur_bg"
MIN_SHARPNESS = 180.0
MIN_SEQUENCE_PART_SEC = 1.5


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_module(name: str, path: Path) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def capcut_root(project: str) -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / project


def capcut_is_open() -> bool:
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process | Where-Object { $_.ProcessName -match 'CapCut' } | Select-Object -First 1 -ExpandProperty Id",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    return bool(completed.stdout.strip())


def content_paths(root: Path) -> list[Path]:
    paths = [root / "draft_content.json"]
    for rel in ["template-2.tmp", "draft_content.json.bak"]:
        path = root / rel
        if path.exists():
            paths.append(path)
    paths.extend((root / "Timelines").rglob("draft_content.json"))
    unique: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path.resolve()).casefold()
        if path.exists() and key not in seen:
            unique.append(path)
            seen.add(key)
    return unique


def backup(paths: list[Path]) -> Path:
    backup_root = (
        Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/backups")
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-unique-language-backgrounds"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        shutil.copy2(path, backup_root / f"{index:02d}_{path.name}")
    return backup_root


def source_key(data: dict[str, Any]) -> tuple[str, str] | None:
    source = str(data.get("source") or "").strip()
    source_id = str(data.get("source_id") or "").strip()
    if not source or not source_id:
        return None
    return (source, source_id)


def collect_report_sources(path: Path) -> set[tuple[str, str]]:
    if not path.exists():
        return set()
    report = load_json(path)
    rows = report.get("rows") if isinstance(report, dict) else None
    if not isinstance(rows, list):
        rows = []
        if isinstance(report, dict):
            for value in report.values():
                if isinstance(value, list) and value and isinstance(value[0], dict):
                    rows = value
                    break
    keys: set[tuple[str, str]] = set()
    for row in rows:
        selected = row.get("selected")
        if isinstance(selected, dict):
            key = source_key(selected)
            if key:
                keys.add(key)
        for item in row.get("sequence_sources") or []:
            selected = item.get("selected")
            if isinstance(selected, dict):
                key = source_key(selected)
                if key:
                    keys.add(key)
    return keys


def collect_project_path_sources(project: str) -> set[tuple[str, str]]:
    root = capcut_root(project)
    path = root / "draft_content.json"
    if not path.exists():
        return set()
    draft = load_json(path)
    keys: set[tuple[str, str]] = set()
    pattern = re.compile(r"(pexels|pixabay|mixkit|wikimedia_commons|commons)[_\\/-]([A-Za-z0-9-]+)", re.IGNORECASE)
    videos = {item["id"]: item for item in draft.get("materials", {}).get("videos", []) if item.get("id")}
    for segment in draft.get("tracks", [{}])[0].get("segments", []):
        material = videos.get(segment.get("material_id"))
        value = str((material or {}).get("path") or "")
        match = pattern.search(value)
        if match:
            source = match.group(1).lower()
            if source == "commons":
                source = "wikimedia_commons"
            keys.add((source, match.group(2)))
    return keys


def phrase_rows(strict_report: dict[str, Any]) -> list[dict[str, Any]]:
    rows = strict_report.get("rows") or []
    out: list[dict[str, Any]] = []
    for row in rows:
        out.append(
            {
                "index": int(row["index"]),
                "en": str(row.get("en") or row.get("phrase") or ""),
                "ru": str(row.get("ru") or ""),
                "target_duration_sec": float(row["target_duration_sec"]),
            }
        )
    if len(out) != 200:
        raise RuntimeError(f"Expected 200 phrase rows, got {len(out)}")
    return out


def serialize_candidate(strict: Any, candidate: Any) -> dict[str, Any]:
    return strict.serialize_candidate(candidate)


def discover_options(
    strict: Any,
    session: Any,
    profile: Any,
    pexels_key: str | None,
    pixabay_key: str | None,
    banned: set[tuple[str, str]],
    used: set[tuple[str, str]],
) -> list[dict[str, Any]]:
    options: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for candidate in strict.collect_candidates(session, profile, pexels_key, pixabay_key):
        key = (candidate.source, candidate.source_id)
        if key in seen or key in banned or key in used:
            continue
        seen.add(key)
        score, reasons, rejects = strict.score_candidate(profile, candidate)
        # A language-version pack must avoid previous source IDs. When the
        # strongest semantic match is banned because it was used in the prior
        # language, allow the next still-relevant visual match instead of
        # falling back to duplicated footage.
        min_score = max(6, int(profile.min_score) - 3)
        if rejects or score < min_score:
            continue
        source_path = strict.download_candidate(session, candidate)
        meta = strict.ffprobe(source_path) if source_path else None
        if not source_path or not strict.is_source_quality_ok(meta):
            continue
        visual = strict.visual_quality_gate(source_path, candidate, meta)
        if not visual.get("passed"):
            continue
        safe_duration_sec = max(0.0, float(meta["duration"]) - 0.25)
        if safe_duration_sec < MIN_SEQUENCE_PART_SEC:
            continue
        options.append(
            {
                "candidate": candidate,
                "score": score,
                "reasons": reasons,
                "source_path": Path(source_path),
                "source_meta": meta,
                "visual_audit": visual,
                "safe_duration_sec": safe_duration_sec,
            }
        )
    options.sort(key=lambda item: (-int(item["score"]), item["candidate"].source != "pexels", item["candidate"].source != "pixabay", item["candidate"].title))
    return options


def build_sequence(options: list[dict[str, Any]], primary_index: int, target_sec: float) -> list[dict[str, Any]]:
    ordered = [options[primary_index], *options[:primary_index], *options[primary_index + 1 :]]
    remaining = target_sec
    sequence: list[dict[str, Any]] = []
    local_used: set[tuple[str, str]] = set()
    for option in ordered:
        candidate = option["candidate"]
        key = (candidate.source, candidate.source_id)
        if key in local_used:
            continue
        take = min(remaining, float(option["safe_duration_sec"]))
        if take >= MIN_SEQUENCE_PART_SEC or (sequence and remaining <= MIN_SEQUENCE_PART_SEC):
            sequence.append({**option, "clip_duration_sec": take})
            local_used.add(key)
            remaining -= take
        if remaining <= 0.1:
            break
    if remaining > 0.1:
        return []
    return sequence


def render_asset(render_mod: Any, strict: Any, root: Path, row: dict[str, Any], sequence: list[dict[str, Any]], suffix: str) -> dict[str, Any]:
    primary = sequence[0]["candidate"]
    render_dir = root / "Resources" / OUT_SUBDIR
    render_dir.mkdir(parents=True, exist_ok=True)
    output = render_dir / f"{int(row['index']):03d}_{primary.source}_{primary.source_id}_{strict.slugify(primary.title)[:36]}_{suffix}.mp4"
    parts = [(item["source_path"], float(item["clip_duration_sec"])) for item in sequence]
    render_mod.render_sequence(parts, output)
    meta = strict.ffprobe(output)
    sharpness = float(render_mod.sharpness_score(output))
    return {
        "index": int(row["index"]),
        "output": str(output),
        "phrase": row["en"],
        "target_duration_sec": row["target_duration_sec"],
        "sharpness_score": round(sharpness, 2),
        "meta": meta,
        "source": serialize_candidate(strict, primary),
        "sequence_sources": [
            {
                "selected": serialize_candidate(strict, item["candidate"]),
                "score": item["score"],
                "clip_duration_sec": round(float(item["clip_duration_sec"]), 3),
                "source_meta": item["source_meta"],
                "visual_summary": item["visual_audit"].get("summary", {}),
            }
            for item in sequence
        ],
    }


def build_assets(strict: Any, render_mod: Any, root: Path, rows: list[dict[str, Any]], banned: set[tuple[str, str]], force: bool) -> list[dict[str, Any]]:
    env = {**strict.load_env_file(Path(".env.local")), **os.environ}
    session = strict.requests.Session()
    used: set[tuple[str, str]] = set()
    assets: list[dict[str, Any]] = []
    for row in rows:
        profile = strict.profile_for_phrase(row["en"])
        options = discover_options(strict, session, profile, env.get("PEXELS_API_KEY"), env.get("PIXABAY_API_KEY"), banned, used)
        attempts: list[dict[str, Any]] = []
        chosen: dict[str, Any] | None = None
        for primary_index in range(min(len(options), 18)):
            sequence = build_sequence(options, primary_index, float(row["target_duration_sec"]))
            if not sequence:
                continue
            asset = render_asset(render_mod, strict, root, row, sequence, f"unique_{primary_index + 1:02d}" if force else "unique")
            attempts.append({"output": asset["output"], "sharpness_score": asset["sharpness_score"], "source": asset["source"]})
            if float(asset["sharpness_score"]) >= MIN_SHARPNESS:
                chosen = asset
                break
        if chosen is None:
            raise RuntimeError(f"No unique sharp background for {row['index']:03d} {row['en']}. Attempts: {attempts[:8]}")
        for item in chosen["sequence_sources"]:
            key = source_key(item["selected"])
            if key:
                used.add(key)
        assets.append(chosen)
        if int(row["index"]) % 10 == 0:
            print(f"[unique-bg] rendered {row['index']:03d}/200", flush=True)
    return assets


def patch_content(path: Path, assets: list[dict[str, Any]]) -> dict[str, Any]:
    draft = load_json(path)
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    effect_ids = {
        item.get("id")
        for key in ["effects", "transitions", "video_effects"]
        for item in draft.get("materials", {}).get(key, [])
    }
    changed = 0
    for index, asset in enumerate(assets, start=1):
        segment = draft["tracks"][0]["segments"][index - 1]
        segment["extra_material_refs"] = [ref for ref in segment.get("extra_material_refs", []) if ref not in effect_ids]
        for flag in [
            "enable_lut",
            "enable_adjust",
            "enable_hsl",
            "enable_color_curves",
            "enable_hsl_curves",
            "enable_color_wheels",
            "enable_smart_color_adjust",
            "enable_color_match_adjust",
            "enable_color_correct_adjust",
            "enable_color_adjust_pro",
        ]:
            if flag in segment:
                segment[flag] = False
        material = videos[segment["material_id"]]
        if material.get("path") != asset["output"]:
            material["path"] = asset["output"]
            material["name"] = Path(asset["output"]).name
            material["material_name"] = Path(asset["output"]).name
            changed += 1
    write_json(path, draft)
    return {"path": str(path), "changed_bg_paths": changed}


def verify_content(path: Path, assets: list[dict[str, Any]], banned: set[tuple[str, str]]) -> dict[str, Any]:
    draft = load_json(path)
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    effect_ids = {
        item.get("id")
        for key in ["effects", "transitions", "video_effects"]
        for item in draft.get("materials", {}).get(key, [])
    }
    wrong: list[dict[str, Any]] = []
    dirty: list[dict[str, Any]] = []
    repeated: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for index, asset in enumerate(assets, start=1):
        segment = draft["tracks"][0]["segments"][index - 1]
        material_path = str(videos[segment["material_id"]].get("path") or "")
        if material_path != asset["output"]:
            wrong.append({"index": index, "path": material_path, "expected": asset["output"]})
        refs = sorted(set(segment.get("extra_material_refs", [])) & effect_ids)
        if refs:
            dirty.append({"index": index, "refs": refs})
        for item in asset["sequence_sources"]:
            key = source_key(item["selected"])
            if not key:
                continue
            if key in banned:
                repeated.append({"index": index, "source": key[0], "source_id": key[1], "reason": "matches_previous_language"})
            if key in seen:
                repeated.append({"index": index, "source": key[0], "source_id": key[1], "reason": "reused_inside_current_language"})
            seen.add(key)
    return {
        "path": str(path),
        "wrong_path_count": len(wrong),
        "dirty_ref_count": len(dirty),
        "repeat_count": len(repeated),
        "wrong_sample": wrong[:5],
        "dirty_sample": dirty[:5],
        "repeat_sample": repeated[:10],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=PROJECT)
    parser.add_argument("--source-draft", default=SOURCE_DRAFT)
    parser.add_argument("--allow-open-capcut", action="store_true")
    parser.add_argument("--force-render", action="store_true")
    args = parser.parse_args()

    root = capcut_root(args.project)
    if not root.exists():
        raise RuntimeError(f"Draft not found: {root}")
    if not args.allow_open_capcut and capcut_is_open():
        raise RuntimeError("CapCut is open. Close CapCut before editing draft JSON.")
    if not args.allow_open_capcut and (root / ".locked").exists():
        raise RuntimeError(f"Draft is locked: {root}")

    strict = load_module("strict_unique_bg", Path("tools/build_venga_semantic_strict_backgrounds.py"))
    render_mod = load_module("unique_noblur_render", Path("tools/rerender_venga_ru_fr_semantic_backgrounds_noblur.py"))
    strict_report = load_json(STRICT_REPORT)
    rows = phrase_rows(strict_report)
    banned = set()
    banned |= collect_report_sources(STRICT_REPORT)
    banned |= collect_report_sources(OPEN_REPORT)
    banned |= collect_project_path_sources(args.source_draft)

    paths = content_paths(root)
    backup_dir = backup(paths)
    assets = build_assets(strict, render_mod, root, rows, banned, force=args.force_render)
    patches = [patch_content(path, assets) for path in paths]
    verifications = [verify_content(path, assets, banned) for path in paths]
    wrong_total = sum(item["wrong_path_count"] for item in verifications)
    dirty_total = sum(item["dirty_ref_count"] for item in verifications)
    repeat_total = sum(item["repeat_count"] for item in verifications)
    low_sharpness = [item for item in assets if float(item["sharpness_score"]) < MIN_SHARPNESS]
    unique_sources = {
        source_key(item["selected"])
        for asset in assets
        for item in asset["sequence_sources"]
        if source_key(item["selected"])
    }
    report = {
        "project": args.project,
        "backup": str(backup_dir),
        "asset_dir": str(root / "Resources" / OUT_SUBDIR),
        "asset_count": len(assets),
        "banned_previous_language_source_count": len(banned),
        "unique_current_language_source_count": len(unique_sources),
        "min_sharpness": min(float(item["sharpness_score"]) for item in assets),
        "low_sharpness_count": len(low_sharpness),
        "low_sharpness_sample": low_sharpness[:10],
        "patches": patches,
        "verifications": verifications,
        "wrong_total": wrong_total,
        "dirty_total": dirty_total,
        "repeat_total": repeat_total,
        "assets": assets,
    }
    write_json(REPORT_PATH, report)
    print(json.dumps({k: v for k, v in report.items() if k != "assets"}, ensure_ascii=False, indent=2))
    if wrong_total or dirty_total or repeat_total or low_sharpness:
        raise RuntimeError(
            f"Unique background gate failed: wrong={wrong_total}, dirty={dirty_total}, repeats={repeat_total}, low_sharpness={len(low_sharpness)}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
