#!/usr/bin/env python3
"""Match second-half Chains audio pauses to the first-half pause rhythm."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_800_READY_PART2_401_800 20260603_214046"
REPORT = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_repair/part2_audio_pause_fix_report.json")
US = 1_000_000
MAX_REAL_PAUSE_SEC = 8.0
MIN_NEXT_GAP_US = 50_000


def capcut_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def capcut_is_open() -> bool:
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    return bool(result.stdout.strip())


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def role_for_segment(content: dict[str, Any], segment: dict[str, Any]) -> str | None:
    audios = {m.get("id"): m for m in content.get("materials", {}).get("audios", [])}
    path = str(audios.get(segment.get("material_id"), {}).get("path") or "").replace("\\", "/").lower()
    match = re.search(r"chains_800_openai_tts/(en1|en2|ru)/", path)
    return match.group(1) if match else None


def phrase_audio_segments(content: dict[str, Any], track_index: int, role: str) -> list[dict[str, Any]]:
    segments = sorted(
        content["tracks"][track_index].get("segments", []),
        key=lambda s: int(s["target_timerange"]["start"]),
    )
    return [segment for segment in segments if role_for_segment(content, segment) == role]


def start_us(segment: dict[str, Any]) -> int:
    return int(segment["target_timerange"]["start"])


def duration_us(segment: dict[str, Any]) -> int:
    return int(segment["target_timerange"]["duration"])


def end_us(segment: dict[str, Any]) -> int:
    return start_us(segment) + duration_us(segment)


def median(values: list[int]) -> int:
    values = sorted(values)
    mid = len(values) // 2
    if len(values) % 2:
        return values[mid]
    return (values[mid - 1] + values[mid]) // 2


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open; close it before editing the draft.")

    project = capcut_root() / DRAFT_NAME
    content_path = project / "draft_content.json"
    content = load_json(content_path)

    first = {
        "en1": phrase_audio_segments(content, 20, "en1"),
        "ru": phrase_audio_segments(content, 21, "ru"),
        "en2": phrase_audio_segments(content, 22, "en2"),
    }
    second = {
        "en1": phrase_audio_segments(content, 25, "en1"),
        "ru": phrase_audio_segments(content, 26, "ru"),
        "en2": phrase_audio_segments(content, 27, "en2"),
    }
    counts = {f"first_{k}": len(v) for k, v in first.items()} | {f"second_{k}": len(v) for k, v in second.items()}
    if any(count != 400 for count in counts.values()):
        raise SystemExit(f"Expected 400 phrase audio segments per role, got {counts}")

    raw_gap_after_first_en = [start_us(first["ru"][i]) - end_us(first["en1"][i]) for i in range(400)]
    raw_gap_after_ru = [start_us(first["en2"][i]) - end_us(first["ru"][i]) for i in range(400)]
    normal_after_first_en = [g for g in raw_gap_after_first_en if 0 <= g <= int(MAX_REAL_PAUSE_SEC * US)]
    normal_after_ru = [g for g in raw_gap_after_ru if 0 <= g <= int(MAX_REAL_PAUSE_SEC * US)]
    fallback_after_first_en = median(normal_after_first_en)
    fallback_after_ru = median(normal_after_ru)

    changed = 0
    capped_to_next = 0
    abnormal_first_half_pause_rows: list[int] = []
    samples: list[dict[str, Any]] = []

    for i in range(400):
        gap_after_ru_first = raw_gap_after_first_en[i]
        gap_after_english_first = raw_gap_after_ru[i]
        if not (0 <= gap_after_ru_first <= int(MAX_REAL_PAUSE_SEC * US)):
            gap_after_ru_first = fallback_after_first_en
            abnormal_first_half_pause_rows.append(i + 401)
        if not (0 <= gap_after_english_first <= int(MAX_REAL_PAUSE_SEC * US)):
            gap_after_english_first = fallback_after_ru
            abnormal_first_half_pause_rows.append(i + 401)

        ru = second["ru"][i]
        en1 = second["en1"][i]
        en2 = second["en2"][i]
        new_en1_start = end_us(ru) + gap_after_ru_first
        new_en2_start = new_en1_start + duration_us(en1) + gap_after_english_first

        if i < 399:
            next_ru_start = start_us(second["ru"][i + 1])
            latest_en2_start = next_ru_start - duration_us(en2) - MIN_NEXT_GAP_US
            if new_en2_start > latest_en2_start:
                new_en2_start = latest_en2_start
                capped_to_next += 1

        old_en1_start = start_us(en1)
        old_en2_start = start_us(en2)
        en1["target_timerange"]["start"] = int(new_en1_start)
        en2["target_timerange"]["start"] = int(new_en2_start)
        if old_en1_start != new_en1_start or old_en2_start != new_en2_start:
            changed += 1
        if i in {0, 1, 2, 50, 100, 291, 384, 399}:
            samples.append(
                {
                    "row": i + 401,
                    "ru_start_sec": round(start_us(ru) / US, 3),
                    "en1_start_sec": round(new_en1_start / US, 3),
                    "en2_start_sec": round(new_en2_start / US, 3),
                    "gap_ru_to_en1_sec": round((new_en1_start - end_us(ru)) / US, 3),
                    "gap_en1_to_en2_sec": round((new_en2_start - (new_en1_start + duration_us(en1))) / US, 3),
                }
            )

    overlaps = []
    for i in range(399):
        gap = start_us(second["ru"][i + 1]) - end_us(second["en2"][i])
        if gap < 0:
            overlaps.append({"row": i + 401, "overlap_sec": round(gap / US, 3)})

    content_id = str(content.get("id") or "")
    write_json(content_path, content)
    write_json(project / "template-2.tmp", content)
    if content_id:
        mirror = project / "Timelines" / content_id / "draft_content.json"
        if mirror.exists():
            write_json(mirror, content)

    report = {
        "project": str(project),
        "changed_phrase_rows": changed,
        "capped_to_avoid_next_phrase_overlap": capped_to_next,
        "abnormal_first_half_pause_rows_using_fallback": sorted(set(abnormal_first_half_pause_rows)),
        "fallback_after_ru_then_en1_sec": round(fallback_after_first_en / US, 3),
        "fallback_after_en1_then_en2_sec": round(fallback_after_ru / US, 3),
        "overlaps_after_fix": overlaps,
        "samples": samples,
        "counts": counts,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not overlaps else 1


if __name__ == "__main__":
    raise SystemExit(main())
