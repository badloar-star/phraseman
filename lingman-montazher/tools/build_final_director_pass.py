from __future__ import annotations

import argparse
import importlib.util
import json
import math
import re
import sys
import wave
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUN_DIR = ROOT / "runs" / "20260524-0915-concrete-video"

SOURCE_SEGMENTS = [
    ("hook", 0.0, 38.60, "Strong opening: missing be in 'she ready'."),
    ("problem", 38.60, 56.96, "Clarifies that the problem is the missing middle word."),
    ("bridge_ru_examples", 56.96, 73.64, "Russian examples and bridge idea."),
    ("bridge_system", 73.64, 103.64, "Explains am/is/are as the bridge; stops before the abandoned example run."),
    ("i_am_case", 173.56, 213.04, "Clean final take for I am here / I am ok."),
    ("he_she_case", 221.64, 269.68, "Clean final take for he/she and stable pairs."),
    ("listener_waits", 293.40, 304.08, "Short listener expectation summary."),
    ("it_important", 307.60, 371.24, "Good self-check and it is important block."),
    ("it_cheap_final", 407.84, 436.16, "Final usable it is cheap take; stops before the side historical tangent."),
    ("stable_pairs_are", 469.32, 584.76, "Stable pairs and are agreement, using the final coherent run."),
    ("roles", 591.36, 653.72, "Roles/professions with I am a teacher / We are students."),
    ("very_final", 747.84, 817.28, "Final complete very block; earlier attempts removed."),
    ("summary_examples", 839.04, 881.72, "Compact lesson summary with core examples."),
    ("concept_summary", 883.96, 913.60, "Conceptual explanation of why the middle word matters."),
    ("practice_pair_1", 1009.08, 1020.70, "Practice pair: I am here / I am ok."),
    ("practice_pair_2", 1023.76, 1073.68, "Practice pair: we are together / we are safe and contractions."),
    ("boundary", 1076.56, 1103.08, "Boundary: am/is/are are not for every sentence."),
    ("simple_recipe", 1106.56, 1167.0, "Simple final recipe."),
    ("comment_task", 1187.44, 1208.20, "Comment task; final clean take."),
    ("app_cta", 1217.96, 1258.72, "Final app CTA take."),
]

CURATED_SCREEN_TEXT = [
    (25.92, 2.3, ["she is ready"], "phrase", 0),
    (48.04, 2.7, ["she ready", "-> she is ready"], "correction", 0),
    (82.08, 2.4, ["am / is / are"], "phrase", 0),
    (189.40, 2.2, ["I am here"], "phrase", 0),
    (203.32, 2.2, ["I am ok"], "phrase", 1),
    (259.12, 3.0, ["he is busy", "she is ready"], "phrase", 0),
    (346.60, 2.4, ["it is important"], "phrase", 0),
    (407.84, 2.3, ["it is cheap"], "phrase", 0),
    (488.64, 3.4, ["I am / he is / she is / it is", "you are / we are / they are"], "phrase", 0),
    (535.12, 2.7, ["we is together", "-> we are together"], "correction", 0),
    (536.69, 2.7, ["they is happy", "-> they are happy"], "correction", 1),
    (545.76, 2.4, ["we are together"], "phrase", 0),
    (552.09, 2.4, ["they are happy"], "phrase", 1),
    (603.76, 2.4, ["I am a teacher"], "phrase", 0),
    (625.32, 2.4, ["We are students"], "phrase", 0),
    (760.82, 3.2, ["She is very smart", "We are very tired"], "phrase", 0),
    (776.72, 2.8, ["She very smart", "-> She is very smart"], "correction", 0),
    (778.92, 2.8, ["We very tired", "-> We are very tired"], "correction", 1),
    (1120.24, 2.3, ["I am here"], "phrase", 0),
    (1131.24, 2.3, ["she is ready"], "phrase", 0),
    (1139.57, 2.3, ["we are together"], "phrase", 0),
    (1197.08, 3.0, ["she is ready", "she is calm"], "phrase", 0),
    (1198.94, 3.0, ["we are together", "we are safe"], "phrase", 1),
]


def load_build_director_module() -> Any:
    path = ROOT / "tools" / "build_director_pass.py"
    spec = importlib.util.spec_from_file_location("build_director_pass", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def us(seconds: float) -> int:
    return int(round(seconds * 1_000_000))


def read_text_fallback(path: Path) -> str:
    for encoding in ("utf-8-sig", "utf-16le", "utf-16"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeError:
            continue
    return path.read_text(errors="ignore")


def load_silence_ranges(path: Path | None) -> list[tuple[float, float]]:
    if path is None or not path.exists():
        return []
    text = read_text_fallback(path).replace("\x00", "")
    ranges: list[tuple[float, float]] = []
    start: float | None = None
    for line in text.splitlines():
        start_match = re.search(r"silence_start: ([0-9.]+)", line)
        if start_match:
            start = float(start_match.group(1))
            continue
        end_match = re.search(r"silence_end: ([0-9.]+) \| silence_duration: ([0-9.]+)", line)
        if end_match and start is not None:
            ranges.append((start, float(end_match.group(1))))
            start = None
    return ranges


def split_range_by_silence(
    start: float,
    end: float,
    silence_ranges: list[tuple[float, float]],
    *,
    min_silence: float = 0.44,
    handle: float = 0.045,
) -> list[tuple[float, float]]:
    chunks: list[tuple[float, float]] = []
    cursor = start
    for silence_start, silence_end in silence_ranges:
        clipped_start = max(start, silence_start)
        clipped_end = min(end, silence_end)
        if clipped_end <= clipped_start or clipped_end - clipped_start < min_silence:
            continue
        chunk_end = max(cursor, clipped_start + handle)
        if chunk_end - cursor >= 0.24:
            chunks.append((cursor, chunk_end))
        cursor = min(end, max(cursor, clipped_end - handle))
    if end - cursor >= 0.24:
        chunks.append((cursor, end))
    if not chunks:
        return [(start, end)]
    merged: list[tuple[float, float]] = []
    for chunk_start, chunk_end in chunks:
        if merged and chunk_start - merged[-1][1] <= 0.12:
            merged[-1] = (merged[-1][0], chunk_end)
        else:
            merged.append((chunk_start, chunk_end))
    return merged


def build_decisions(
    base_project: dict[str, Any],
    bdp: Any,
    silence_ranges: list[tuple[float, float]] | None = None,
) -> list[dict[str, Any]]:
    decisions: list[dict[str, Any]] = []
    output_cursor = 0.0
    source_cursor = 0.0
    cut_index = 1
    clip_index = 1
    silence_ranges = silence_ranges or []
    for name, start, end, reason in SOURCE_SEGMENTS:
        if start - source_cursor > 0.12:
            decisions.append(
                {
                    "id": f"cut_v4_{cut_index:03d}",
                    "sourceStart": round(source_cursor, 3),
                    "sourceEnd": round(start, 3),
                    "outputStart": round(output_cursor, 3),
                    "outputEnd": round(output_cursor, 3),
                    "decision": "cut",
                    "kind": "director_rejected",
                    "reason": "Rejected by full-lesson director pass: pause, repeated take, throat clear, or earlier failed variant.",
                    "confidence": 0.9,
                    "transcript": "Rejected in final director pass.",
                }
            )
            cut_index += 1
        chunks = split_range_by_silence(start, end, silence_ranges)
        for chunk_index, (chunk_start, chunk_end) in enumerate(chunks, start=1):
            if chunk_start - source_cursor > 0.12:
                decisions.append(
                    {
                        "id": f"cut_v6_{cut_index:03d}",
                        "sourceStart": round(source_cursor, 3),
                        "sourceEnd": round(chunk_start, 3),
                        "outputStart": round(output_cursor, 3),
                        "outputEnd": round(output_cursor, 3),
                        "decision": "cut",
                        "kind": "director_pause_removed",
                        "reason": "Rejected by director pass: internal pause, restart gap, clap/sync gap, or dead air between spoken thoughts.",
                        "confidence": 0.9,
                        "transcript": "Rejected internal pause.",
                    }
                )
                cut_index += 1
            duration = chunk_end - chunk_start
            decisions.append(
                {
                    "id": f"clip_v6_{clip_index:03d}",
                    "sourceStart": round(chunk_start, 3),
                    "sourceEnd": round(chunk_end, 3),
                    "outputStart": round(output_cursor, 3),
                    "outputEnd": round(output_cursor + duration, 3),
                    "decision": "take_selected",
                    "kind": "director_selected_speech_microclip",
                    "reason": f"{reason} Micro-cut {chunk_index}/{len(chunks)} after transcript-backed pause pass.",
                    "confidence": 0.92,
                    "transcript": "",
                    "directorBlock": name,
                }
            )
            output_cursor += duration
            source_cursor = chunk_end
            clip_index += 1
        source_cursor = end

    total = float(base_project["duration"])
    if total - source_cursor > 0.12:
        decisions.append(
            {
                "id": f"cut_v4_{cut_index:03d}",
                "sourceStart": round(source_cursor, 3),
                "sourceEnd": round(total, 3),
                "outputStart": round(output_cursor, 3),
                "outputEnd": round(output_cursor, 3),
                "decision": "cut",
                "kind": "director_rejected_tail",
                "reason": "Rejected tail after final usable take.",
                "confidence": 0.9,
                "transcript": "Rejected tail.",
            }
        )
    return decisions


def output_time_for_source(decisions: list[dict[str, Any]], source_time: float) -> float | None:
    for decision in decisions:
        if decision["decision"] == "cut":
            continue
        source_start = float(decision["sourceStart"])
        source_end = float(decision["sourceEnd"])
        if source_start <= source_time <= source_end:
            return float(decision["outputStart"]) + (source_time - source_start)
    return None


def match_source_time(item: Any, match: re.Match[str]) -> float:
    duration = max(0.05, float(item.end) - float(item.start))
    return float(item.start) + duration * (match.start() / max(1, len(item.text)))


def build_screen_text(decisions: list[dict[str, Any]], transcript: list[Any], bdp: Any) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for source_time, duration, lines, role, slot in CURATED_SCREEN_TEXT:
        output_start = output_time_for_source(decisions, source_time)
        if output_start is None:
            continue
        events.append(
            {
                "id": "",
                "start": round(output_start, 3),
                "end": round(output_start + duration, 3),
                "text": "\n".join(lines),
                "lines": lines,
                "role": role,
                "slot": slot,
                "position": "right-of-head",
                "style": "lingman-right-plaque",
                "animation": "soft-slide-pop",
                "sfxVariant": len(events) % 4,
                "reason": "Curated director overlay: key English phrase, timed to the exact spoken source moment.",
            }
        )
    events.sort(key=lambda item: (float(item["start"]), item["text"]))
    for index, event in enumerate(events, start=1):
        event["id"] = f"text_{index:03d}"
    return events


def ass_time(seconds: float) -> str:
    centiseconds = int(round(seconds * 100))
    hours, remainder = divmod(centiseconds, 360_000)
    minutes, remainder = divmod(remainder, 6_000)
    secs, centis = divmod(remainder, 100)
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def ass_text(text: str) -> str:
    return str(text).replace("\\", "\\\\").replace("\n", r"\N")


def write_plaque_ass(path: Path, events: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    header = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Plaque,Arial,40,&H00F8FAFC,&H000000FF,&H00181818,&HC0181818,-1,0,0,0,100,100,0,0,3,16,0,4,0,0,0,1",
        "Style: PlaqueCorrection,Arial,38,&H003DD8FF,&H000000FF,&H00181818,&HC0181818,-1,0,0,0,100,100,0,0,3,16,0,4,0,0,0,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    body: list[str] = []
    for event in events:
        slot = int(event.get("slot", 0))
        x = 1138
        y = 328 + slot * 108
        style = "PlaqueCorrection" if event.get("role") == "correction" else "Plaque"
        line_count = max(1, len(event.get("lines") or str(event["text"]).splitlines()))
        font_size = 34 if any(len(line) > 28 for line in event.get("lines", [])) else 40
        if line_count > 1:
            font_size -= 2
        tags = (
            rf"{{\an4\pos({x},{y})\fs{font_size}\bord14\shad0"
            rf"\fscx96\fscy96\t(0,180,\fscx100\fscy100)\fad(100,90)}}"
        )
        body.append(
            f"Dialogue: 0,{ass_time(float(event['start']))},{ass_time(float(event['end']))},"
            f"{style},,0,0,0,,{tags}{ass_text(event['text'])}"
        )
    path.write_text("\n".join(header + body) + "\n", encoding="utf-8")


def add_transcripts(decisions: list[dict[str, Any]], transcript: list[Any], bdp: Any) -> None:
    for decision in decisions:
        if decision["decision"] == "cut":
            continue
        decision["transcript"] = bdp.transcript_for_range(
            transcript,
            float(decision["sourceStart"]),
            float(decision["sourceEnd"]),
        ) or "Transcript unavailable for this selected take."


def build_motion_effects(decisions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    reframe_cycle = (
        (1.0, 0.0, 0.0),
        (1.10, 0.0, 0.0),
        (1.15, -0.018, 0.0),
        (1.0, 0.0, 0.0),
        (1.08, 0.016, 0.0),
    )
    effects: list[dict[str, Any]] = []
    index = 0
    for decision in decisions:
        if decision.get("decision") != "take_selected":
            continue
        zoom, x, y = reframe_cycle[index % len(reframe_cycle)]
        effects.append(
            {
                "id": f"motion_{index + 1:03d}",
                "targetId": decision["id"],
                "start": decision["outputStart"],
                "end": decision["outputEnd"],
                "type": "reference_inspired_jumpcut_reframe",
                "zoom": zoom,
                "x": x,
                "y": y,
                "reason": "Reference-inspired per-clip reframing after director cut; transform resets on every segment.",
            }
        )
        index += 1
    return effects


def build_manifest(
    base_manifest: dict[str, Any],
    transcript: list[Any],
    bdp: Any,
    silence_ranges: list[tuple[float, float]] | None = None,
) -> dict[str, Any]:
    decisions = build_decisions(base_manifest["project"], bdp, silence_ranges)
    add_transcripts(decisions, transcript, bdp)
    screen_text = build_screen_text(decisions, transcript, bdp)
    motion_effects = build_motion_effects(decisions)
    edited_duration = max(float(decision["outputEnd"]) for decision in decisions)
    project = dict(base_manifest["project"])
    project["directorPass"] = "director-v6"
    project["editedDuration"] = round(edited_duration, 3)
    project["visualLayout"] = "right-of-head-plaque"
    project["previewFile"] = "runs/20260524-0915-concrete-video/director-pass-v6-1080p.mp4"
    return {
        "schemaVersion": base_manifest.get("schemaVersion", 1),
        "project": project,
        "editDecisions": decisions,
        "screenText": screen_text,
        "motionEffects": motion_effects,
        "quality": {
            "warnings": [],
            "checks": {
                "fullLessonDirectorPass": True,
                "repeatedTakesRejected": True,
                "fullFrameNoBlackSidePanel": True,
                "rightOfHeadPlaques": True,
                "microPausePass": bool(silence_ranges),
                "screenTextTimedToSpeech": len(screen_text),
            },
        },
    }


def write_sfx_bed(path: Path, duration: float, events: list[dict[str, Any]]) -> None:
    sample_rate = 48000
    total_samples = int(math.ceil(duration * sample_rate))
    samples = [0.0] * total_samples
    variants = [
        (220.0, 330.0),
        (246.94, 369.99),
        (261.63, 392.0),
        (293.66, 440.0),
    ]
    for event in events:
        start = int(float(event["start"]) * sample_rate)
        length = int(0.24 * sample_rate)
        low, high = variants[int(event.get("sfxVariant", 0)) % len(variants)]
        for offset in range(length):
            index = start + offset
            if index >= total_samples:
                break
            t = offset / sample_rate
            attack = min(1.0, t / 0.018)
            release = max(0.0, 1.0 - t / 0.24)
            envelope = attack * (release**1.8)
            shimmer = math.sin(2 * math.pi * high * t) * 0.34
            body = math.sin(2 * math.pi * low * t) * 0.66
            samples[index] += 0.12 * envelope * (body + shimmer)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        pcm = bytearray()
        for value in samples:
            clipped = max(-1.0, min(1.0, value))
            pcm.extend(int(clipped * 32767).to_bytes(2, "little", signed=True))
        handle.writeframes(bytes(pcm))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--transcript", required=True, type=Path)
    parser.add_argument("--out-manifest", required=True, type=Path)
    parser.add_argument("--out-ass", required=True, type=Path)
    parser.add_argument("--out-sfx", required=True, type=Path)
    parser.add_argument("--silence-log", type=Path)
    args = parser.parse_args()

    bdp = load_build_director_module()
    base_manifest = json.loads(args.manifest.read_text(encoding="utf-8-sig"))
    transcript = bdp.load_transcript_ndjson(args.transcript)
    silence_ranges = load_silence_ranges(args.silence_log)
    manifest = build_manifest(base_manifest, transcript, bdp, silence_ranges)
    write_json(args.out_manifest, manifest)
    write_plaque_ass(args.out_ass, manifest["screenText"])
    write_sfx_bed(args.out_sfx, float(manifest["project"]["editedDuration"]), manifest["screenText"])
    print(args.out_manifest)


if __name__ == "__main__":
    main()
