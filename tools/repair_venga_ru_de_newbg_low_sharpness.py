#!/usr/bin/env python3
"""Repair low-sharpness fresh backgrounds in the RU->DE NEWBG draft."""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any


PROJECT = "VENGA RU DE NEWBG"
INDICES = [132, 144]
REPORT = Path("exports/venga-phrase-packs/ru-de-a1-vsscp/fresh_background_repair_report.json")


def load_module(path: Path, name: str) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main() -> int:
    fresh = load_module(Path("tools/build_venga_ru_de_user_template_new_backgrounds.py"), "fresh_bg")
    strict = fresh.load_strict_module()
    env = {**strict.load_env_file(Path(".env.local")), **os.environ}
    pexels_key = env.get("PEXELS_API_KEY")
    pixabay_key = env.get("PIXABAY_API_KEY")
    root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / PROJECT
    draft = load_json(root / "draft_content.json")
    rows = {int(row["index"]): row for row in fresh.rows_for_backgrounds()}
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    banned = fresh.source_ids_from_reports() | fresh.source_ids_from_current_bg(draft)
    session = strict.requests.Session()
    render_dir = root / "Resources" / fresh.OUT_SUBDIR
    repairs: list[dict[str, Any]] = []

    for index in INDICES:
        segment = draft["tracks"][0]["segments"][index - 1]
        old_material = videos[segment["material_id"]]
        duration_us = int(segment["target_timerange"]["duration"])
        profile = strict.profile_for_phrase(rows[index]["en"])
        sequence, failed = fresh.pick_sequence(
            strict=strict,
            session=session,
            profile=profile,
            duration_us=duration_us,
            banned=banned,
            used=set(),
            pexels_key=pexels_key,
            pixabay_key=pixabay_key,
        )
        if not sequence:
            raise RuntimeError(f"No repair candidate for {index}: {rows[index]['en']}. Failed {failed[:8]}")
        primary = sequence[0]["candidate"]
        output = render_dir / f"{index:03d}_{primary.source}_{primary.source_id}_repair.mp4"
        rendered_meta = fresh.render_sequence(sequence, output)
        score = fresh.sharpness_score(output)
        if score < 180.0:
            raise RuntimeError(f"Repair candidate still low sharpness for {index}: {score}")
        old_material["path"] = str(output)
        old_material["duration"] = duration_us
        old_material["name"] = output.name
        old_material["material_name"] = output.name
        segment["source_timerange"] = {"start": 0, "duration": duration_us}
        segment["is_loop"] = False
        for item in sequence:
            banned.add((item["candidate"].source.lower(), str(item["candidate"].source_id)))
        repairs.append(
            {
                "index": index,
                "en": rows[index]["en"],
                "rendered_path": str(output),
                "rendered_meta": rendered_meta,
                "sharpness_score": score,
                "sequence_sources": [
                    {
                        "selected": strict.serialize_candidate(item["candidate"]),
                        "score": item["score"],
                        "clip_duration_sec": round(item["duration_sec"], 3),
                    }
                    for item in sequence
                ],
            }
        )

    for path in fresh.patch_content_paths(root, draft):
        write_json(path, draft)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({"project": PROJECT, "repairs": repairs}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"project": PROJECT, "repairs": repairs}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
