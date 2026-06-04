#!/usr/bin/env python3
"""Repair weak no-blur semantic backgrounds in the current RU->FR CapCut draft."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any

PROJECT = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"
REPORT_PATH = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/rerender_semantic_backgrounds_noblur_report.json")
OUT_SUBDIR = "venga_semantic_strict_noblur_bg"
US = 1_000_000
MIN_RENDER_SHARPNESS = 250.0
MIN_SEQUENCE_PART_SEC = 1.5


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


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
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-repair-semantic-noblur-gaps"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        shutil.copy2(path, backup_root / f"{index:02d}_{path.name}")
    return backup_root


def custom_profile(strict: Any, index: int, phrase: str) -> Any:
    base = strict.profile_for_phrase(phrase)
    negative = set(base.negative_terms)
    if index == 192:
        negative.update({"dating", "partner search", "instagram", "facebook", "twitter", "chat"})
        return strict.VisualProfile(
            phrase=phrase,
            concept="phone charging",
            queries=[
                "charging phone",
                "phone charger cable",
                "smartphone charging cable",
                "plugging phone charger",
                "phone battery charging",
                "mobile phone charging",
            ],
            required_groups=[
                ["phone", "smartphone", "mobile", "cell"],
                ["charge", "charging", "charger", "cable", "battery", "plug"],
            ],
            positive_terms={
                "phone": 4,
                "smartphone": 4,
                "mobile": 3,
                "charge": 5,
                "charging": 5,
                "charger": 5,
                "cable": 3,
                "battery": 3,
                "plug": 3,
                "hands": 2,
            },
            negative_terms=negative,
            layers={
                "literal_action": "charging a phone",
                "object": "phone and charger cable",
                "setting": "desk, bedroom, or hand close-up",
                "mood": "neutral everyday",
            },
            min_score=12,
        )
    if index == 15:
        negative.update({"cat", "kitten", "kitty", "pet", "animal", "feline", "dog", "puppy"})
        return strict.VisualProfile(
            phrase=phrase,
            concept="person sleeping in bed",
            queries=[
                "person sleeping in bed",
                "man sleeping in bed",
                "woman sleeping in bed",
                "sleeping person bedroom",
                "tired person in bed",
                "bedroom sleep night",
            ],
            required_groups=[
                ["sleep", "sleeping", "asleep", "bed", "bedroom", "pillow"],
                ["person", "man", "woman", "face", "bed"],
            ],
            positive_terms={
                "sleep": 5,
                "sleeping": 5,
                "asleep": 4,
                "bed": 5,
                "bedroom": 4,
                "pillow": 4,
                "person": 3,
                "man": 2,
                "woman": 2,
                "tired": 2,
                "night": 2,
                "rest": 2,
            },
            negative_terms=negative,
            layers={
                "literal_action": "wanting to sleep",
                "object": "person in bed or pillow",
                "setting": "bedroom",
                "mood": "sleepy and quiet",
            },
            min_score=12,
        )
    if index == 197:
        negative.update({"paper", "pen", "inkpen", "flying paper", "alone", "sofa"})
        return strict.VisualProfile(
            phrase=phrase,
            concept="go home",
            queries=[
                "walking home",
                "coming home",
                "person entering home",
                "front door house",
                "home entrance",
                "walking to house",
            ],
            required_groups=[
                ["home", "house", "door", "entrance", "apartment"],
                ["walk", "walking", "enter", "entering", "coming", "person", "man", "woman", "family"],
            ],
            positive_terms={
                "home": 5,
                "house": 4,
                "door": 4,
                "entrance": 4,
                "apartment": 3,
                "walk": 3,
                "walking": 3,
                "enter": 4,
                "entering": 4,
                "coming": 3,
                "person": 2,
                "man": 2,
                "woman": 2,
                "family": 2,
            },
            negative_terms=negative,
            layers={
                "literal_action": "going home or entering home",
                "object": "door, house, apartment entrance, person",
                "setting": "home exterior or entrance",
                "mood": "calm return home",
            },
            min_score=11,
        )
    return base


def serialize_candidate(strict: Any, candidate: Any) -> dict[str, Any]:
    return strict.serialize_candidate(candidate)


def discover(strict: Any, session: Any, profile: Any, pexels_key: str | None, pixabay_key: str | None) -> list[Any]:
    seen: set[tuple[str, str]] = set()
    candidates: list[Any] = []
    for query in profile.queries:
        for candidate in [
            *strict.discover_pexels(session, query, pexels_key),
            *strict.discover_pixabay(session, query, pixabay_key),
            *strict.discover_mixkit(session, query),
            *strict.discover_commons(session, query),
        ]:
            key = (candidate.source, candidate.source_id)
            if key in seen:
                continue
            seen.add(key)
            candidates.append(candidate)
    return candidates


def valid_candidates(strict: Any, session: Any, profile: Any, pexels_key: str | None, pixabay_key: str | None, banned: set[tuple[str, str]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for candidate in discover(strict, session, profile, pexels_key, pixabay_key):
        key = (candidate.source, candidate.source_id)
        score, reasons, rejects = strict.score_candidate(profile, candidate)
        if key in banned:
            rejects = [*rejects, "banned_previous_soft_or_wrong_semantic"]
        if rejects or score < profile.min_score:
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
        results.append(
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
    results.sort(key=lambda item: (-int(item["score"]), item["candidate"].source != "pexels", item["candidate"].source != "pixabay", item["candidate"].title))
    return results


def build_sequence(options: list[dict[str, Any]], primary_index: int, target_sec: float) -> list[dict[str, Any]]:
    order = [options[primary_index], *options[:primary_index], *options[primary_index + 1 :]]
    remaining = target_sec
    sequence: list[dict[str, Any]] = []
    used: set[tuple[str, str]] = set()
    for option in order:
        candidate = option["candidate"]
        key = (candidate.source, candidate.source_id)
        if key in used:
            continue
        take = min(remaining, float(option["safe_duration_sec"]))
        if take >= MIN_SEQUENCE_PART_SEC or (sequence and remaining <= MIN_SEQUENCE_PART_SEC):
            sequence.append({**option, "clip_duration_sec": take})
            used.add(key)
            remaining -= take
        if remaining <= 0.1:
            break
    if remaining > 0.1:
        return []
    return sequence


def render_sequence(render_mod: Any, sequence: list[dict[str, Any]], output: Path) -> float:
    parts = [(item["source_path"], float(item["clip_duration_sec"])) for item in sequence]
    render_mod.render_sequence(parts, output)
    return float(render_mod.sharpness_score(output))


def repair_asset(strict: Any, render_mod: Any, root: Path, row: dict[str, Any], session: Any, pexels_key: str | None, pixabay_key: str | None) -> dict[str, Any]:
    index = int(row["index"])
    phrase = str(row["phrase"])
    target_sec = float(row["target_duration_sec"])
    profile = custom_profile(strict, index, phrase)
    banned = {(str(row["source"]["source"]), str(row["source"]["source_id"]))}
    options = valid_candidates(strict, session, profile, pexels_key, pixabay_key, banned)
    render_dir = root / "Resources" / OUT_SUBDIR
    render_dir.mkdir(parents=True, exist_ok=True)
    attempts: list[dict[str, Any]] = []
    for primary_index in range(min(len(options), 10)):
        sequence = build_sequence(options, primary_index, target_sec)
        if not sequence:
            continue
        primary = sequence[0]["candidate"]
        output = render_dir / f"{index:03d}_{primary.source}_{primary.source_id}_{strict.slugify(primary.title)[:36]}_noblur_repair.mp4"
        sharpness = render_sequence(render_mod, sequence, output)
        attempt = {
            "output": str(output),
            "sharpness_score": round(sharpness, 2),
            "primary": serialize_candidate(strict, primary),
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
        attempts.append(attempt)
        if sharpness >= MIN_RENDER_SHARPNESS:
            return {**attempt, "index": index, "phrase": phrase, "target_duration_sec": target_sec}
    raise RuntimeError(f"No sharp semantic no-blur replacement for {index}: {phrase}. Attempts: {attempts[:5]}")


def patch_contents(paths: list[Path], replacements: dict[int, str]) -> list[dict[str, Any]]:
    patches: list[dict[str, Any]] = []
    for path in paths:
        draft = load_json(path)
        videos = {item["id"]: item for item in draft["materials"]["videos"]}
        changed = 0
        for index, new_path in replacements.items():
            segment = draft["tracks"][0]["segments"][index - 1]
            material = videos[segment["material_id"]]
            if material.get("path") != new_path:
                material["path"] = new_path
                material["name"] = Path(new_path).name
                material["material_name"] = Path(new_path).name
                changed += 1
        write_json(path, draft)
        patches.append({"path": str(path), "changed": changed})
    return patches


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=PROJECT)
    parser.add_argument("--indices", nargs="+", type=int, default=[192, 197])
    args = parser.parse_args()

    root = capcut_root(args.project)
    if not root.exists():
        raise RuntimeError(f"Draft not found: {root}")
    strict = load_module("strict_bg_repair", Path("tools/build_venga_semantic_strict_backgrounds.py"))
    render_mod = load_module("noblur_render_repair", Path("tools/rerender_venga_ru_fr_semantic_backgrounds_noblur.py"))
    report = load_json(REPORT_PATH)
    rows = {int(item["index"]): item for item in report.get("sharpness_low_sample", [])}
    strict_report = load_json(Path("exports/venga-phrase-packs/semantic-strict-backgrounds/strict_background_report.json"))
    for item in strict_report.get("rows", []):
        index = int(item["index"])
        rows.setdefault(
            index,
            {
                "index": index,
                "phrase": item["en"],
                "target_duration_sec": item["target_duration_sec"],
                "source": item["selected"],
            },
        )
    for index in args.indices:
        if index not in rows:
            raise RuntimeError(f"Index {index} is not in semantic report; refusing blind replacement")
    env = {**strict.load_env_file(Path(".env.local")), **os.environ}
    session = strict.requests.Session()
    paths = content_paths(root)
    backup_dir = backup(paths)
    repaired = [
        repair_asset(strict, render_mod, root, rows[index], session, env.get("PEXELS_API_KEY"), env.get("PIXABAY_API_KEY"))
        for index in args.indices
    ]
    replacements = {int(item["index"]): str(item["output"]) for item in repaired}
    patches = patch_contents(paths, replacements)
    out = {
        "project": args.project,
        "backup": str(backup_dir),
        "min_render_sharpness": MIN_RENDER_SHARPNESS,
        "repaired": repaired,
        "patches": patches,
    }
    out_path = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/repair_semantic_noblur_gaps_report.json")
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
