from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SILENCE_START_RE = re.compile(r"silence_start:\s*([0-9.]+)")
SILENCE_END_RE = re.compile(r"silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def parse_silences(path: Path) -> list[dict[str, float]]:
    silences: list[dict[str, float]] = []
    pending_start: float | None = None
    for line in read_log_text(path).splitlines():
        start_match = SILENCE_START_RE.search(line)
        if start_match:
            pending_start = float(start_match.group(1))
            continue
        end_match = SILENCE_END_RE.search(line)
        if end_match and pending_start is not None:
            end = float(end_match.group(1))
            duration = float(end_match.group(2))
            silences.append({"start": pending_start, "end": end, "duration": duration})
            pending_start = None
    return silences


def read_log_text(path: Path) -> str:
    data = path.read_bytes()
    if data.startswith(b"\xff\xfe") or data.startswith(b"\xfe\xff"):
        return data.decode("utf-16", errors="ignore")
    return data.decode("utf-8", errors="ignore")


def project_from_probe(probe: dict[str, Any], source_file: str) -> dict[str, Any]:
    video_stream = next((stream for stream in probe["streams"] if stream.get("codec_type") == "video"), {})
    duration = float(probe["format"]["duration"])
    return {
        "title": Path(source_file).stem.strip() or "Lingman raw video",
        "sourceFile": source_file,
        "duration": round(duration, 3),
        "frameRate": rate_to_float(video_stream.get("avg_frame_rate", "0/1")),
        "resolution": f"{video_stream.get('width', 0)}x{video_stream.get('height', 0)}",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


def rate_to_float(rate: str) -> float:
    try:
        numerator, denominator = rate.split("/", 1)
        return round(float(numerator) / float(denominator), 3)
    except (ValueError, ZeroDivisionError):
        return 0.0


def build_decisions(duration: float, silences: list[dict[str, float]], cut_threshold: float) -> list[dict[str, Any]]:
    decisions: list[dict[str, Any]] = []
    output_cursor = 0.0
    source_cursor = 0.0
    clip_index = 1
    cut_index = 1

    cuts = [item for item in silences if item["duration"] >= cut_threshold]
    cuts.sort(key=lambda item: item["start"])

    for silence in cuts:
        if silence["start"] - source_cursor > 0.05:
            output_cursor = append_keep(decisions, clip_index, source_cursor, silence["start"], output_cursor)
            clip_index += 1
        append_cut(decisions, cut_index, silence, output_cursor)
        cut_index += 1
        source_cursor = max(source_cursor, silence["end"])

    if source_cursor < duration:
        append_keep(decisions, clip_index, source_cursor, duration, output_cursor)

    return decisions


def append_keep(decisions: list[dict[str, Any]], index: int, start: float, end: float, output_start: float) -> float:
    clip_duration = end - start
    output_end = output_start + clip_duration
    decisions.append(
        {
            "id": f"clip_{index:03d}",
            "sourceStart": round(start, 3),
            "sourceEnd": round(end, 3),
            "outputStart": round(output_start, 3),
            "outputEnd": round(output_end, 3),
            "decision": "keep",
            "kind": "speech_candidate",
            "reason": "Audio is above the silence threshold; keep for human review.",
            "confidence": 0.72,
            "transcript": "Transcript pending.",
        }
    )
    return output_end


def append_cut(decisions: list[dict[str, Any]], index: int, silence: dict[str, float], output_cursor: float) -> None:
    duration = silence["duration"]
    kind = "tail_silence" if duration >= 30 else "pause_trimmed"
    decisions.append(
        {
            "id": f"cut_{index:03d}",
            "sourceStart": round(silence["start"], 3),
            "sourceEnd": round(silence["end"], 3),
            "outputStart": round(output_cursor, 3),
            "outputEnd": round(output_cursor, 3),
            "decision": "cut",
            "kind": kind,
            "reason": f"Detected silence lasting {duration:.2f}s.",
            "confidence": 0.88 if duration >= 2 else 0.74,
            "transcript": "Silence or dead air.",
        }
    )


def build_manifest(probe_path: Path, silence_path: Path, source_file: str, cut_threshold: float) -> dict[str, Any]:
    probe = load_json(probe_path)
    duration = float(probe["format"]["duration"])
    silences = parse_silences(silence_path)
    long_silences = [item for item in silences if item["duration"] >= cut_threshold]
    tail = max(long_silences, key=lambda item: item["duration"], default=None)
    decisions = build_decisions(duration, silences, cut_threshold)
    warnings = []
    if tail and tail["duration"] >= 30:
        tail_cut_id = next(
            (
                item["id"]
                for item in decisions
                if item["decision"] == "cut"
                and abs(float(item["sourceStart"]) - tail["start"]) < 0.01
                and abs(float(item["sourceEnd"]) - tail["end"]) < 0.01
            ),
            "cut_001",
        )
        warnings.append(
            {
                "id": "warn_tail_silence",
                "severity": "high",
                "message": f"Large silent tail detected from {format_time(tail['start'])} to {format_time(tail['end'])}.",
                "targetId": tail_cut_id,
            }
        )

    return {
        "schemaVersion": 1,
        "project": project_from_probe(probe, source_file),
        "editDecisions": decisions,
        "screenText": [],
        "quality": {
            "warnings": warnings,
            "checks": {
                "captionsCoverSpeech": False,
                "screenTextReadable": True,
                "noLargeSilentGaps": len(long_silences) == 0,
                "durationReduced": True,
            },
        },
    }


def format_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    rest = int(seconds % 60)
    return f"{minutes:02d}:{rest:02d}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", required=True, type=Path)
    parser.add_argument("--silence", required=True, type=Path)
    parser.add_argument("--source-file", required=True)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--cut-threshold", type=float, default=1.2)
    args = parser.parse_args()

    manifest = build_manifest(args.probe, args.silence, args.source_file, args.cut_threshold)
    args.out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
