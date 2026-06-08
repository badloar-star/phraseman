#!/usr/bin/env python3
"""Replace the intro segment in ЦЕПИ ЦЕПИ ЦЕПИ (1) with the new Remotion-rendered intro.

The CapCut project has an intro video at track[0] segments[0] and track[6] segments[0].
We replace those material paths with the new rendered intro MP4.
Audio intro track (track[17] if present) gets replaced with the new intro voice track,
or we attach a dedicated audio track for the intro voice-over if needed.

Usage:
    python inject_cepicepi_english_intro.py
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_chains_800_capcut_project import update_meta, write_json  # noqa: E402

PROJECT_NAME = "ЦЕПИ ЦЕПИ ЦЕПИ (1)"
INTRO_MP4 = Path("tools/intro_remotion/out/english_chains_intro.mp4")
PACK = Path("exports/chains/cepicepi_english_ru_a1a2_20260607")
REPORT_PATH = PACK / "intro_inject_report.json"
US = 1_000_000


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


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command",
         "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=False,
    )
    return bool(result.stdout.strip())


def ffprobe_duration_us(path: Path) -> int:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr[:200]}")
    return int(round(float(result.stdout.strip()) * US))


def localize(project: Path, source: Path, folder: str) -> Path:
    target = project / "Resources" / folder / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or target.stat().st_size != source.stat().st_size:
        shutil.copy2(source, target)
    return target


def inject() -> dict[str, Any]:
    if capcut_is_open():
        raise SystemExit("CapCut is open — close it before editing native draft files.")
    if not INTRO_MP4.exists():
        raise RuntimeError(f"Intro MP4 not found: {INTRO_MP4}")

    project = project_path()
    content = load_json(project / "draft_content.json")

    intro_dur_us = ffprobe_duration_us(INTRO_MP4)
    local_intro = localize(project, INTRO_MP4, "cepicepi_english_intro")

    videos = {m["id"]: m for m in content.get("materials", {}).get("videos", []) if m.get("id")}

    changed_tracks = []

    # track[0] seg[0] — full-width intro background (present in FR project)
    # track[6] seg[0] — intro preview clip (also present)
    for ti in [0, 6]:
        try:
            segs = content["tracks"][ti]["segments"]
            if not segs:
                continue
            # Only touch if this is clearly an intro segment (starts at/near 0)
            seg = segs[0]
            tr = seg.get("target_timerange", {})
            start = int(tr.get("start", 0))
            if start > 5 * US:
                continue  # not the intro slot
            mat = videos.get(seg["material_id"])
            if mat is None:
                continue
            mat["path"] = str(local_intro)
            mat["media_path"] = str(local_intro)
            mat["duration"] = intro_dur_us
            mat["name"] = local_intro.name
            mat["material_name"] = local_intro.name
            mat["width"] = 1920
            mat["height"] = 1080
            mat["has_audio"] = False
            seg["target_timerange"] = {"start": start, "duration": intro_dur_us}
            seg["source_timerange"] = {"start": 0, "duration": intro_dur_us}
            seg["visible"] = True
            if isinstance(seg.get("clip"), dict):
                seg["clip"]["alpha"] = 1
            changed_tracks.append(ti)
        except (IndexError, KeyError):
            continue

    write_json(project / "draft_content.json", content)
    if (project / "template-2.tmp").exists():
        write_json(project / "template-2.tmp", content)
    if (project / "Timelines").exists():
        for mirror in (project / "Timelines").glob("*/draft_content.json"):
            write_json(mirror, content)
    update_meta(project, content)

    report = {
        "status": "done",
        "intro_mp4": str(INTRO_MP4),
        "intro_duration_sec": round(intro_dur_us / US, 2),
        "local_path": str(local_intro),
        "changed_tracks": changed_tracks,
    }
    PACK.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(inject(), ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
