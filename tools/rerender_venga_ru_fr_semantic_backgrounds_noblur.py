#!/usr/bin/env python3
"""Re-render the semantic-strict backgrounds without baked blur and patch the RU->FR draft."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from PIL import Image, ImageFilter, ImageStat


PROJECT = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"
STRICT_REPORT = Path("exports/venga-phrase-packs/semantic-strict-backgrounds/strict_background_report.json")
OUT_SUBDIR = "venga_semantic_strict_noblur_bg"
US = 1_000_000


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


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


def backup_paths(paths: list[Path]) -> Path:
    backup_root = (
        Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/backups")
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-rerender-semantic-noblur"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        shutil.copy2(path, backup_root / f"{index:02d}_{path.name}")
    return backup_root


def load_strict_module() -> Any:
    module_path = Path("tools/build_venga_semantic_strict_backgrounds.py")
    spec = importlib.util.spec_from_file_location("strict_bg", module_path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def candidate_from_dict(strict: Any, data: dict[str, Any]) -> Any:
    return strict.Candidate(
        source=str(data["source"]),
        source_id=str(data["source_id"]),
        title=str(data.get("title") or ""),
        page_url=str(data.get("page_url") or ""),
        download_url=str(data.get("download_url") or ""),
        license=str(data.get("license") or ""),
        license_url=str(data.get("license_url") or ""),
        query=str(data.get("query") or ""),
        resolution_hint=int(data.get("resolution_hint") or 0),
        ext=str(data.get("ext") or "mp4"),
        source_meta_hint={},
    )


def ffmpeg_filter_no_blur() -> str:
    return (
        "scale=1920:1080:force_original_aspect_ratio=increase,"
        "crop=1920:1080,"
        "eq=brightness=-0.08:contrast=0.94:saturation=0.96,"
        "fps=30,format=yuv420p"
    )


def render_part(source: Path, output: Path, duration_sec: float) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(source),
            "-t",
            f"{duration_sec:.6f}",
            "-vf",
            ffmpeg_filter_no_blur(),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )


def render_sequence(parts: list[tuple[Path, float]], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.parent / f"__tmp_{output.stem}"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    try:
        rendered_parts: list[Path] = []
        for index, (source, duration_sec) in enumerate(parts, start=1):
            part = tmp / f"part_{index:02d}.mp4"
            render_part(source, part, duration_sec)
            rendered_parts.append(part)
        concat_file = tmp / "concat.txt"
        concat_file.write_text("".join(f"file '{path.as_posix()}'\n" for path in rendered_parts), encoding="utf-8")
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
                str(concat_file),
                "-c",
                "copy",
                str(output),
            ],
            check=True,
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def sharpness_score(video_path: Path, sample_sec: float = 1.0) -> float:
    frame = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/noblur_sharpness_frames") / f"{video_path.stem}.jpg"
    frame.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{sample_sec:.3f}",
            "-i",
            str(video_path),
            "-frames:v",
            "1",
            "-q:v",
            "3",
            str(frame),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if not frame.exists():
        return 0.0
    image = Image.open(frame).convert("L").resize((320, 180))
    return round(float(ImageStat.Stat(image.filter(ImageFilter.FIND_EDGES)).var[0]), 2)


def build_assets(root: Path, force: bool = False) -> list[dict[str, Any]]:
    strict = load_strict_module()
    report = load_json(STRICT_REPORT)
    rows = report["rows"]
    if len(rows) != 200:
        raise RuntimeError(f"Expected 200 strict rows, got {len(rows)}")
    session = strict.requests.Session()
    render_dir = root / "Resources" / OUT_SUBDIR
    render_dir.mkdir(parents=True, exist_ok=True)
    assets: list[dict[str, Any]] = []
    for row in rows:
        index = int(row["index"])
        parts: list[tuple[Path, float]] = []
        sequence_sources = row.get("sequence_sources") or [{"selected": row["selected"], "clip_duration_sec": row["target_duration_sec"]}]
        for item in sequence_sources:
            candidate = candidate_from_dict(strict, item["selected"])
            source = strict.download_candidate(session, candidate)
            if not source or not Path(source).exists():
                raise RuntimeError(f"Cannot download source for {index:03d}: {candidate}")
            parts.append((Path(source), float(item.get("clip_duration_sec") or row["target_duration_sec"])))
        selected = row["selected"]
        output = render_dir / f"{index:03d}_{selected['source']}_{selected['source_id']}_{strict.slugify(selected.get('title') or '')[:36]}_noblur.mp4"
        if force or not output.exists() or output.stat().st_size < 150_000:
            render_sequence(parts, output)
        meta = strict.ffprobe(output)
        score = sharpness_score(output)
        assets.append(
            {
                "index": index,
                "output": str(output),
                "source": selected,
                "phrase": row.get("en"),
                "target_duration_sec": row.get("target_duration_sec"),
                "meta": meta,
                "sharpness_score": score,
            }
        )
        if index % 20 == 0:
            print(f"[noblur] rendered/audited {index}/200", flush=True)
    return assets


def patch_content(path: Path, assets: list[dict[str, Any]]) -> dict[str, Any]:
    draft = load_json(path)
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    changed = 0
    effect_ids = {
        item.get("id")
        for key in ["effects", "transitions", "video_effects"]
        for item in draft.get("materials", {}).get(key, [])
    }
    for segment in draft["tracks"][0]["segments"]:
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
    for index, asset in enumerate(assets, start=1):
        segment = draft["tracks"][0]["segments"][index - 1]
        material = videos[segment["material_id"]]
        if material.get("path") != asset["output"]:
            material["path"] = asset["output"]
            changed += 1
    write_json(path, draft)
    return {"path": str(path), "changed_bg_paths": changed}


def verify_content(path: Path, assets: list[dict[str, Any]]) -> dict[str, Any]:
    draft = load_json(path)
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    effect_ids = {
        item.get("id")
        for key in ["effects", "transitions", "video_effects"]
        for item in draft.get("materials", {}).get(key, [])
    }
    wrong: list[dict[str, Any]] = []
    dirty: list[dict[str, Any]] = []
    for index, asset in enumerate(assets, start=1):
        segment = draft["tracks"][0]["segments"][index - 1]
        path_value = str(videos[segment["material_id"]].get("path") or "")
        if path_value != asset["output"]:
            wrong.append({"index": index, "path": path_value, "expected": asset["output"]})
        refs = sorted(set(segment.get("extra_material_refs", [])) & effect_ids)
        if refs:
            dirty.append({"index": index, "refs": refs})
    return {"path": str(path), "wrong_path_count": len(wrong), "dirty_ref_count": len(dirty), "wrong_sample": wrong[:5], "dirty_sample": dirty[:5]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=PROJECT)
    parser.add_argument("--allow-open-capcut", action="store_true")
    parser.add_argument("--force-render", action="store_true")
    args = parser.parse_args()

    root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / args.project
    if not root.exists():
        raise RuntimeError(f"Draft not found: {root}")
    if not args.allow_open_capcut and capcut_is_open():
        raise RuntimeError("CapCut is open. Close CapCut before editing draft JSON.")
    if not args.allow_open_capcut and (root / ".locked").exists():
        raise RuntimeError(f"Draft is locked: {root}")

    paths = content_paths(root)
    backup = backup_paths(paths)
    assets = build_assets(root, force=args.force_render)
    patches = [patch_content(path, assets) for path in paths]
    verifications = [verify_content(path, assets) for path in paths]
    wrong_total = sum(item["wrong_path_count"] for item in verifications)
    dirty_total = sum(item["dirty_ref_count"] for item in verifications)
    low_sharpness = [item for item in assets if float(item["sharpness_score"]) < 180.0]
    report = {
        "project": args.project,
        "backup": str(backup),
        "asset_count": len(assets),
        "asset_dir": str(root / "Resources" / OUT_SUBDIR),
        "sharpness_min": min(float(item["sharpness_score"]) for item in assets),
        "sharpness_low_count_lt_180": len(low_sharpness),
        "sharpness_low_sample": low_sharpness[:20],
        "assets_sample": assets[:8],
        "patches": patches,
        "verifications": verifications,
        "wrong_total": wrong_total,
        "dirty_total": dirty_total,
    }
    report_path = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/rerender_semantic_backgrounds_noblur_report.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if wrong_total or dirty_total or low_sharpness:
        raise RuntimeError(
            f"No-blur semantic background gate failed: wrong={wrong_total}, dirty={dirty_total}, low_sharpness={len(low_sharpness)}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
