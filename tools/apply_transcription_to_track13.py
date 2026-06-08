#!/usr/bin/env python3
"""Replace track[13] text with Russian phonetic transcriptions in ЦЕПИ ЦЕПИ ЦЕПИ (1).

Usage:
    python apply_transcription_to_track13.py
"""
from __future__ import annotations

import copy
import json
import os
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PROJECT_NAME = "ЦЕПИ ЦЕПИ ЦЕПИ (1)"
TRANSCRIPTIONS_PATH = Path(
    "exports/chains/phrase_packs/chains_800_unique_v3_20260604/transcriptions_track13.json"
)


def project_path() -> Path:
    return (
        Path(os.environ["LOCALAPPDATA"])
        / "CapCut" / "User Data" / "Projects"
        / "com.lveditor.draft" / PROJECT_NAME
    )


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command",
         "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=False,
    )
    return bool(result.stdout.strip())


def main() -> None:
    if capcut_is_open():
        raise SystemExit("CapCut is open — close it first.")

    transcriptions = json.loads(TRANSCRIPTIONS_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(transcriptions)} transcriptions", flush=True)

    project = project_path()
    content = json.loads((project / "draft_content.json").read_text(encoding="utf-8"))

    tracks = content.get("tracks", [])
    mats = content.get("materials", {})
    texts = mats.get("texts", [])
    texts_by_id = {m["id"]: m for m in texts}

    # track[13] = lowercase english / should be transcription
    t13 = tracks[13]
    t14 = tracks[14]
    segs13 = t13["segments"]
    segs14 = t14["segments"]
    print(f"track[13] segments: {len(segs13)}, track[14] segments: {len(segs14)}", flush=True)

    changed = 0
    for i, (s13, s14) in enumerate(zip(segs13, segs14)):
        # Get English text from track[14]
        mid14 = s14["material_id"]
        mat14 = texts_by_id.get(mid14, {})
        cv14 = mat14.get("content", "")
        try:
            en_text = json.loads(cv14).get("text", "")
        except Exception:
            en_text = cv14
        en_clean = en_text.replace("\n", " ").strip()

        # Look up IPA transcription by English text
        transcription = transcriptions.get(en_clean)
        if transcription is None:
            print(f"  MISS [{i}]: {en_clean!r}", flush=True)
            continue

        # Update track[13] segment
        mid13 = s13["material_id"]
        mat13 = texts_by_id.get(mid13)
        if mat13 is None:
            continue

        content_val = mat13.get("content", "")
        try:
            parsed = json.loads(content_val)
        except Exception:
            continue

        if parsed.get("text") == transcription:
            continue  # already correct

        new_parsed = copy.deepcopy(parsed)
        new_parsed["text"] = transcription
        if "styles" in new_parsed:
            for style in new_parsed["styles"]:
                if "text" in style:
                    style["text"] = transcription

        mat13["content"] = json.dumps(new_parsed, ensure_ascii=False)
        changed += 1

    print(f"Changed: {changed} segments", flush=True)

    if changed == 0:
        print("Nothing to change.", flush=True)
        return

    # Write back
    content["materials"]["texts"] = texts
    (project / "draft_content.json").write_text(
        json.dumps(content, ensure_ascii=False), encoding="utf-8"
    )

    # Mirror to template and Timelines if they exist
    if (project / "template-2.tmp").exists():
        (project / "template-2.tmp").write_text(
            json.dumps(content, ensure_ascii=False), encoding="utf-8"
        )
    if (project / "Timelines").exists():
        for mirror in (project / "Timelines").glob("*/draft_content.json"):
            mirror.write_text(json.dumps(content, ensure_ascii=False), encoding="utf-8")

    print("Done.", flush=True)


if __name__ == "__main__":
    main()
