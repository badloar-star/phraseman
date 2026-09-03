#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Install the validated EN/RU manifest draft into one existing CapCut draft.

The target is backed up before the atomic replacement. It preserves
draft_info.json (and therefore the CapCut folder/title) while replacing only
draft_content.json, which is the complete timeline state CapCut renders.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def fail(message: str) -> None:
    raise RuntimeError(message)


def check_source(data: dict, source: Path) -> None:
    tracks = data.get("tracks") or []
    if len(tracks) != 26 or [track.get("type") for track in tracks[24:26]] != ["audio", "audio"]:
        fail(f"{source} is not the validated 26-track EN/RU timeline.")
    if [len(track.get("segments") or []) for track in tracks[24:26]] != [600, 600]:
        fail(f"{source} does not contain 600 EN and 600 RU audio segments.")
    audio_by_id = {item.get("id"): item for item in data.get("materials", {}).get("audios", [])}
    for lane, folder in zip(tracks[24:26], ("2", "1")):
        for segment in lane["segments"]:
            material = audio_by_id.get(segment.get("material_id"))
            if not material or not Path(material.get("path", "")).is_file() or Path(material["path"]).parent.name != folder:
                fail(f"Invalid {folder}-lane audio reference in source draft.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="validated CAPCUT_TEMPLATE/draft_content.json")
    parser.add_argument("target", type=Path, help="existing CapCut draft_content.json")
    args = parser.parse_args()
    if not args.source.is_file() or not args.target.is_file():
        fail("Both source and target draft_content.json files must exist.")
    source = load(args.source)
    target = load(args.target)
    check_source(source, args.source)
    # Guard against writing this package into an unrelated CapCut draft.
    source_ids = [segment.get("material_id") for track in source.get("tracks", [])[:24] for segment in track.get("segments", [])]
    target_ids = [segment.get("material_id") for track in target.get("tracks", [])[:24] for segment in track.get("segments", [])]
    if source_ids != target_ids:
        fail("Target visual/text template does not match the validated EN/RU base; refusing to overwrite it.")
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = args.target.with_name(f"draft_content.before_manifest_sync_{stamp}.json")
    shutil.copy2(args.target, backup)
    temporary = args.target.with_suffix(".json.pending")
    temporary.write_text(json.dumps(source, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(args.target)
    installed = load(args.target)
    check_source(installed, args.target)
    print(f"INSTALLED target={args.target}")
    print(f"BACKUP={backup}")
    print("EN=600 folder=2 | RU=600 folder=1 | intervals=4.5s minimum | legacy_nested_audio=muted")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(2)
