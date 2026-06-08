#!/usr/bin/env python3
"""
1. Fix mid-word line breaks in track[12] (Russian translation) — replace \n with space
2. Apply IPA transcription to track[13] — preserve font, size, style exactly
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


def fix_text_no_linebreak(text: str) -> str:
    """Replace all \n with space, then collapse multiple spaces."""
    return " ".join(text.replace("\n", " ").split())


def main() -> None:
    if capcut_is_open():
        raise SystemExit("CapCut is open — close it first.")

    transcriptions = json.loads(TRANSCRIPTIONS_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(transcriptions)} IPA transcriptions", flush=True)

    project = project_path()
    content = json.loads((project / "draft_content.json").read_text(encoding="utf-8"))

    tracks = content.get("tracks", [])
    mats = content.get("materials", {})
    texts_list = mats.get("texts", [])
    texts = {m["id"]: m for m in texts_list}

    # --- Fix track[12]: Russian text line breaks ---
    t12 = tracks[12]
    fixed_ru = 0
    for s in t12["segments"]:
        mat = texts.get(s["material_id"])
        if not mat:
            continue
        cv = mat.get("content", "")
        try:
            parsed = json.loads(cv)
        except Exception:
            continue
        old_text = parsed.get("text", "")
        new_text = fix_text_no_linebreak(old_text)
        if new_text == old_text:
            continue
        new_parsed = copy.deepcopy(parsed)
        new_parsed["text"] = new_text
        # Update range in styles to match new text length
        if "styles" in new_parsed:
            for style in new_parsed["styles"]:
                if "range" in style:
                    style["range"] = [0, len(new_text)]
                if "text" in style:
                    style["text"] = new_text
        mat["content"] = json.dumps(new_parsed, ensure_ascii=False)
        fixed_ru += 1

    print(f"Fixed {fixed_ru} Russian line breaks in track[12]", flush=True)

    # --- Apply IPA to track[13], preserving all style/font/size ---
    t13 = tracks[13]
    t14 = tracks[14]
    changed_ipa = 0

    for s13, s14 in zip(t13["segments"], t14["segments"]):
        # Get English key from track[14]
        mat14 = texts.get(s14["material_id"], {})
        try:
            en_text = json.loads(mat14.get("content", "")).get("text", "")
        except Exception:
            en_text = ""
        en_key = en_text.replace("\n", " ").strip()

        ipa = transcriptions.get(en_key)
        if ipa is None:
            print(f"  MISS: {en_key!r}", flush=True)
            continue

        mat13 = texts.get(s13["material_id"])
        if not mat13:
            continue
        try:
            parsed = json.loads(mat13.get("content", ""))
        except Exception:
            continue

        if parsed.get("text") == ipa:
            continue  # already set

        # ONLY update text — preserve size, font, color, shadows exactly
        new_parsed = copy.deepcopy(parsed)
        new_parsed["text"] = ipa
        if "styles" in new_parsed:
            for style in new_parsed["styles"]:
                # Update range to match new text length, keep everything else
                if "range" in style:
                    style["range"] = [0, len(ipa)]
                # Do NOT touch size, font, fill, shadows, italic
                if "text" in style:
                    style["text"] = ipa

        mat13["content"] = json.dumps(new_parsed, ensure_ascii=False)
        changed_ipa += 1

    print(f"Applied IPA to {changed_ipa} segments in track[13]", flush=True)

    # Write back
    content["materials"]["texts"] = texts_list
    (project / "draft_content.json").write_text(
        json.dumps(content, ensure_ascii=False), encoding="utf-8"
    )
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
