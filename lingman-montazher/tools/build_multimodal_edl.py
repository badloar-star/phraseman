from __future__ import annotations

import argparse
import importlib.util
import json
import math
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
KEEP_DECISIONS = {"keep", "take_selected", "visual_added"}
ASTATS_TIME_RE = re.compile(r"\bpts_time:(?P<time>-?[0-9.]+)")
ASTATS_VALUE_RE = re.compile(r"^lavfi\.astats\.Overall\.(?P<key>[A-Za-z_]+)=(?P<value>-?(?:inf|nan|[0-9.]+))$")


@dataclass(frozen=True)
class SpeechChunk:
    start: float
    end: float
    text: str
    transcript_ids: list[int]


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_text_fallback(path: Path) -> str:
    for encoding in ("utf-8-sig", "utf-16le", "utf-16"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeError:
            continue
    return path.read_text(errors="ignore")


def load_build_director_module() -> Any:
    path = ROOT / "tools" / "build_director_pass.py"
    spec = importlib.util.spec_from_file_location("build_director_pass", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def ffprobe_video(source_video: Path, ffprobe_bin: str = "ffprobe") -> dict[str, Any]:
    result = subprocess.run(
        [
            ffprobe_bin,
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(source_video),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


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
            ranges.append((round(start, 3), round(float(end_match.group(1)), 3)))
            start = None
    return ranges


def parse_astats_metadata(path: Path | None) -> list[dict[str, Any]]:
    if path is None or not path.exists():
        return []
    windows: list[dict[str, Any]] = []
    current: dict[str, Any] = {}
    current_time: float | None = None

    def flush() -> None:
        nonlocal current, current_time
        if current_time is None or not current:
            current = {}
            return
        current["start"] = round(current_time, 3)
        windows.append(current)
        current = {}

    for raw_line in read_text_fallback(path).replace("\x00", "").splitlines():
        line = raw_line.strip()
        time_match = ASTATS_TIME_RE.search(line)
        if time_match:
            flush()
            current_time = float(time_match.group("time"))
            continue
        value_match = ASTATS_VALUE_RE.match(line)
        if value_match:
            value = parse_float(value_match.group("value"))
            if value is not None:
                current[camel_key(value_match.group("key"))] = value
    flush()

    for index, window in enumerate(windows):
        next_start = windows[index + 1]["start"] if index + 1 < len(windows) else window["start"] + 0.25
        window["duration"] = round(max(0.01, next_start - float(window["start"])), 3)
    return windows


def parse_float(value: str) -> float | None:
    if value.lower() in {"inf", "-inf", "nan"}:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def camel_key(value: str) -> str:
    parts = value.lower().split("_")
    return parts[0] + "".join(part.title() for part in parts[1:])


def complement_ranges(duration: float, cut_ranges: list[tuple[float, float]]) -> list[tuple[float, float]]:
    ranges: list[tuple[float, float]] = []
    cursor = 0.0
    for start, end in sorted(cut_ranges):
        start = max(0.0, min(duration, start))
        end = max(start, min(duration, end))
        if start - cursor > 0.01:
            ranges.append((round(cursor, 3), round(start, 3)))
        cursor = max(cursor, end)
    if duration - cursor > 0.01:
        ranges.append((round(cursor, 3), round(duration, 3)))
    return ranges


def overlap_seconds(left_start: float, left_end: float, right_start: float, right_end: float) -> float:
    return max(0.0, min(left_end, right_end) - max(left_start, right_start))


def overlap_ratio(start: float, end: float, ranges: list[tuple[float, float]]) -> float:
    duration = max(0.001, end - start)
    overlap = sum(overlap_seconds(start, end, range_start, range_end) for range_start, range_end in ranges)
    return min(1.0, overlap / duration)


def summarize_audio(duration: float, silence_ranges: list[tuple[float, float]], energy_windows: list[dict[str, Any]]) -> dict[str, Any]:
    speaking_ranges = complement_ranges(duration, silence_ranges)
    long_pauses = [
        {
            "start": start,
            "end": end,
            "duration": round(end - start, 3),
            "type": "pause_candidate",
            "reason": "Long low-volume interval from ffmpeg silencedetect; eligible for cut unless it protects a sentence boundary.",
        }
        for start, end in silence_ranges
        if end - start >= 0.44
    ]
    sync_spikes = detect_sync_spikes(energy_windows)
    return {
        "duration": round(duration, 3),
        "silenceRanges": [{"start": start, "end": end, "duration": round(end - start, 3)} for start, end in silence_ranges],
        "speakingRanges": [{"start": start, "end": end, "duration": round(end - start, 3)} for start, end in speaking_ranges],
        "pauseCandidates": long_pauses,
        "energyWindows": compact_energy_windows(energy_windows),
        "syncSpikeCandidates": sync_spikes,
        "summary": {
            "silenceCount": len(silence_ranges),
            "pauseCandidateCount": len(long_pauses),
            "energyWindowCount": len(energy_windows),
            "reportedEnergyWindowCount": len(compact_energy_windows(energy_windows)),
            "syncSpikeCandidateCount": len(sync_spikes),
            "speechCoverage": round(sum(end - start for start, end in speaking_ranges) / max(0.001, duration), 4),
        },
    }


def compact_energy_windows(energy_windows: list[dict[str, Any]], bucket_seconds: float = 1.0) -> list[dict[str, Any]]:
    buckets: dict[int, dict[str, Any]] = {}
    for window in energy_windows:
        start = float(window.get("start", 0.0))
        bucket_id = int(start // bucket_seconds)
        bucket = buckets.setdefault(
            bucket_id,
            {
                "start": round(bucket_id * bucket_seconds, 3),
                "duration": bucket_seconds,
                "rmsValues": [],
                "peakLevel": None,
                "maxDifference": None,
            },
        )
        rms = window.get("rmsLevel")
        if isinstance(rms, (int, float)):
            bucket["rmsValues"].append(float(rms))
        peak = window.get("peakLevel")
        if isinstance(peak, (int, float)):
            bucket["peakLevel"] = float(peak) if bucket["peakLevel"] is None else max(float(bucket["peakLevel"]), float(peak))
        max_difference = window.get("maxDifference")
        if isinstance(max_difference, (int, float)):
            bucket["maxDifference"] = (
                float(max_difference)
                if bucket["maxDifference"] is None
                else max(float(bucket["maxDifference"]), float(max_difference))
            )

    compacted: list[dict[str, Any]] = []
    for bucket_id in sorted(buckets):
        bucket = buckets[bucket_id]
        rms_values = bucket.pop("rmsValues")
        bucket["rmsLevel"] = round(average(rms_values), 3) if rms_values else None
        if bucket["peakLevel"] is not None:
            bucket["peakLevel"] = round(float(bucket["peakLevel"]), 3)
        if bucket["maxDifference"] is not None:
            bucket["maxDifference"] = round(float(bucket["maxDifference"]), 5)
        compacted.append(bucket)
    return compacted


def detect_sync_spikes(energy_windows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for window in energy_windows:
        peak = window.get("peakLevel")
        rms = window.get("rmsLevel")
        if not isinstance(peak, (int, float)):
            continue
        rms_value = float(rms) if isinstance(rms, (int, float)) else -60.0
        max_difference = float(window.get("maxDifference", 0.0) or 0.0)
        crest_like_gap = float(peak) - rms_value
        if peak >= -5.0 and max_difference >= 0.10 and (rms_value <= -19.0 or crest_like_gap >= 18.0):
            candidates.append(
                {
                    "start": float(window["start"]),
                    "end": float(window["start"]) + float(window.get("duration", 0.25)),
                    "peakLevel": float(peak),
                    "rmsLevel": rms_value,
                    "maxDifference": max_difference,
                }
            )

    merged: list[dict[str, Any]] = []
    for candidate in candidates:
        if merged and candidate["start"] - float(merged[-1]["end"]) <= 0.12:
            merged[-1]["end"] = max(float(merged[-1]["end"]), candidate["end"])
            merged[-1]["peakLevel"] = max(float(merged[-1]["peakLevel"]), candidate["peakLevel"])
            merged[-1]["rmsLevel"] = min(float(merged[-1]["rmsLevel"]), candidate["rmsLevel"])
            merged[-1]["maxDifference"] = max(float(merged[-1]["maxDifference"]), candidate["maxDifference"])
            continue
        merged.append(dict(candidate))

    spikes: list[dict[str, Any]] = []
    for candidate in merged:
        duration = float(candidate["end"]) - float(candidate["start"])
        if duration > 1.2:
            continue
        spikes.append(
            {
                "start": round(float(candidate["start"]), 3),
                "end": round(float(candidate["end"]), 3),
                "duration": round(duration, 3),
                "peakLevel": round(float(candidate["peakLevel"]), 3),
                "rmsLevel": round(float(candidate["rmsLevel"]), 3),
                "maxDifference": round(float(candidate["maxDifference"]), 5),
                "reason": "Short high transient over lower RMS; likely clap/sync spike, not lesson speech.",
            }
        )
    return spikes


def build_speech_chunks(transcript: list[Any], bdp: Any, merge_gap: float = 0.85) -> list[SpeechChunk]:
    chunks: list[SpeechChunk] = []
    for index, item in enumerate(transcript):
        text = bdp.clean_spaces(str(item.text))
        if not text or bdp.has_reset_marker(text) or bdp.is_noise_transcript(text):
            continue
        if chunks and float(item.start) - chunks[-1].end <= merge_gap:
            previous = chunks[-1]
            chunks[-1] = SpeechChunk(
                start=previous.start,
                end=round(float(item.end), 3),
                text=bdp.clean_spaces(f"{previous.text} {text}"),
                transcript_ids=[*previous.transcript_ids, index],
            )
            continue
        chunks.append(
            SpeechChunk(
                start=round(float(item.start), 3),
                end=round(float(item.end), 3),
                text=text,
                transcript_ids=[index],
            )
        )
    return chunks


def build_take_groups(chunks: list[SpeechChunk], bdp: Any, threshold: float = 0.56) -> list[dict[str, Any]]:
    groups: list[dict[str, Any]] = []
    for chunk in chunks:
        if chunk.end - chunk.start < 1.2 or len(bdp.content_tokens(chunk.text)) < 7:
            continue
        matched: dict[str, Any] | None = None
        matched_similarity = 0.0
        for group in reversed(groups[-40:]):
            latest = group["members"][-1]
            if chunk.start - float(latest["sourceEnd"]) > 720:
                continue
            similarity = bdp.text_similarity(str(latest["text"]), chunk.text)
            prefix_match = bdp.starts_with_similar_phrase(str(latest["text"]), chunk.text)
            if similarity >= threshold or prefix_match:
                matched = group
                matched_similarity = similarity
                break
        member = {
            "sourceStart": chunk.start,
            "sourceEnd": chunk.end,
            "duration": round(chunk.end - chunk.start, 3),
            "text": chunk.text,
            "similarityToPrevious": round(matched_similarity, 3) if matched else None,
            "role": "candidate",
        }
        if matched is None:
            groups.append({"id": f"take_group_{len(groups) + 1:03d}", "members": [member]})
        else:
            matched["members"].append(member)

    retake_groups = [group for group in groups if len(group["members"]) > 1]
    for group_index, group in enumerate(retake_groups, start=1):
        group["id"] = f"retake_group_{group_index:03d}"
        for member in group["members"][:-1]:
            member["role"] = "reject_earlier_variant"
        group["members"][-1]["role"] = "keep_latest_variant"
        group["reason"] = "Several transcript chunks are semantically similar; the latest coherent variant wins unless manually overridden."
    return retake_groups


def build_phrase_candidates(transcript: list[Any], bdp: Any) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen_recent: list[tuple[float, str]] = []
    for item in transcript:
        for phrase in bdp.extract_timed_phrases(item):
            text = str(phrase.text).strip()
            tokens = re.findall(r"[A-Za-z']+", text)
            if len(tokens) == 1 and tokens[0].casefold() not in {"am", "is", "are", "be"}:
                continue
            if any(abs(float(phrase.source_start) - start) <= 2.0 and text.casefold() == seen for start, seen in seen_recent):
                continue
            candidates.append(
                {
                    "id": f"phrase_candidate_{len(candidates) + 1:03d}",
                    "sourceStart": round(float(phrase.source_start), 3),
                    "sourceEnd": round(float(phrase.source_end), 3),
                    "text": text,
                    "role": phrase.role,
                    "reason": "Transcript-level English teaching phrase candidate; director/exporter decides whether to show it.",
                }
            )
            seen_recent.append((float(phrase.source_start), text.casefold()))
            seen_recent = seen_recent[-80:]
    return candidates


def sample_vision_opencv(source_video: Path, duration: float, sample_step: float, skip: bool) -> dict[str, Any]:
    if skip:
        return {"status": "skipped", "samples": [], "summary": {"sampleCount": 0}}
    try:
        import cv2  # type: ignore[import-not-found]
    except ImportError:
        return {
            "status": "unavailable",
            "samples": [],
            "summary": {"sampleCount": 0},
            "reason": "opencv-python is not installed. Install it to enable face/eye-contact sampling.",
        }

    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(str(cascade_path))
    cap = cv2.VideoCapture(str(source_video))
    if not cap.isOpened():
        return {"status": "failed", "samples": [], "summary": {"sampleCount": 0}, "reason": "OpenCV could not open source video."}

    samples: list[dict[str, Any]] = []
    previous_center: tuple[float, float] | None = None
    timestamp = 0.0
    while timestamp <= duration:
        cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000.0)
        ok, frame = cap.read()
        if not ok:
            break
        height, width = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        sample: dict[str, Any] = {"time": round(timestamp, 3), "faceDetected": False}
        if len(faces):
            x, y, w, h = max(faces, key=lambda face: int(face[2]) * int(face[3]))
            center_x = (float(x) + float(w) / 2.0) / max(1, width)
            center_y = (float(y) + float(h) / 2.0) / max(1, height)
            face_area = (float(w) * float(h)) / max(1, width * height)
            center_distance = math.dist((center_x, center_y), (0.5, 0.42))
            eye_contact_score = max(0.0, min(1.0, 1.0 - center_distance * 2.1))
            motion_score = 0.0
            if previous_center is not None:
                motion_score = max(0.0, min(1.0, math.dist(previous_center, (center_x, center_y)) * 8.0))
            previous_center = (center_x, center_y)
            sample.update(
                {
                    "faceDetected": True,
                    "faceBox": {
                        "x": round(float(x) / max(1, width), 4),
                        "y": round(float(y) / max(1, height), 4),
                        "w": round(float(w) / max(1, width), 4),
                        "h": round(float(h) / max(1, height), 4),
                    },
                    "eyeContactProxy": round(eye_contact_score, 3),
                    "faceArea": round(face_area, 4),
                    "faceMotionProxy": round(motion_score, 3),
                }
            )
        samples.append(sample)
        timestamp += max(0.25, sample_step)
    cap.release()

    detected = [sample for sample in samples if sample.get("faceDetected")]
    avg_eye = average([float(sample["eyeContactProxy"]) for sample in detected])
    avg_motion = average([float(sample.get("faceMotionProxy", 0.0)) for sample in detected])
    return {
        "status": "ok",
        "samples": samples,
        "summary": {
            "sampleCount": len(samples),
            "faceDetectedCount": len(detected),
            "faceDetectionRate": round(len(detected) / max(1, len(samples)), 4),
            "averageEyeContactProxy": round(avg_eye, 4),
            "averageFaceMotionProxy": round(avg_motion, 4),
        },
    }


def average(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def energy_score_for_range(start: float, end: float, energy_windows: list[dict[str, Any]]) -> float:
    values: list[float] = []
    for window in energy_windows:
        window_start = float(window.get("start", 0.0))
        window_end = window_start + float(window.get("duration", 0.25))
        if overlap_seconds(start, end, window_start, window_end) <= 0:
            continue
        rms = window.get("rmsLevel")
        if isinstance(rms, (int, float)):
            values.append(max(0.0, min(1.0, (float(rms) + 55.0) / 38.0)))
    return average(values)


def vision_score_for_range(start: float, end: float, vision_samples: list[dict[str, Any]]) -> float:
    scores = [
        float(sample.get("eyeContactProxy", 0.0)) * 0.65 + float(sample.get("faceMotionProxy", 0.0)) * 0.35
        for sample in vision_samples
        if start <= float(sample.get("time", -1.0)) <= end and sample.get("faceDetected")
    ]
    return average(scores)


def build_emotion_energy(
    chunks: list[SpeechChunk],
    energy_windows: list[dict[str, Any]],
    vision_samples: list[dict[str, Any]],
    bdp: Any,
) -> dict[str, Any]:
    segments: list[dict[str, Any]] = []
    previous_score: float | None = None
    for index, chunk in enumerate(chunks, start=1):
        duration = max(0.001, chunk.end - chunk.start)
        word_density = len(bdp.content_tokens(chunk.text)) / duration
        text_score = max(0.0, min(1.0, word_density / 4.8))
        audio_score = energy_score_for_range(chunk.start, chunk.end, energy_windows)
        visual_score = vision_score_for_range(chunk.start, chunk.end, vision_samples)
        available_weights = [("text", text_score, 0.42)]
        if energy_windows:
            available_weights.append(("audio", audio_score, 0.36))
        if vision_samples:
            available_weights.append(("vision", visual_score, 0.22))
        weight_sum = sum(weight for _, _, weight in available_weights)
        score = sum(value * weight for _, value, weight in available_weights) / max(0.001, weight_sum)
        shift = 0.0 if previous_score is None else score - previous_score
        previous_score = score
        segments.append(
            {
                "id": f"energy_segment_{index:03d}",
                "sourceStart": chunk.start,
                "sourceEnd": chunk.end,
                "score": round(score, 3),
                "shiftFromPrevious": round(shift, 3),
                "signals": {
                    "textDensityScore": round(text_score, 3),
                    "audioEnergyScore": round(audio_score, 3) if energy_windows else None,
                    "visualPresenceScore": round(visual_score, 3) if vision_samples else None,
                },
                "reason": "Combined lesson energy from speech density plus optional audio RMS and face/eye-contact proxies.",
            }
        )
    changes = [
        {
            "sourceStart": segment["sourceStart"],
            "sourceEnd": segment["sourceEnd"],
            "score": segment["score"],
            "shiftFromPrevious": segment["shiftFromPrevious"],
            "kind": "energy_rise" if segment["shiftFromPrevious"] > 0 else "energy_drop",
        }
        for segment in segments
        if abs(float(segment["shiftFromPrevious"])) >= 0.24
    ]
    return {"segments": segments, "changePoints": changes}


def source_to_output_time(decisions: list[dict[str, Any]], source_time: float) -> float | None:
    for decision in decisions:
        if decision.get("decision") not in KEEP_DECISIONS:
            continue
        source_start = float(decision["sourceStart"])
        source_end = float(decision["sourceEnd"])
        if source_start - 0.02 <= source_time <= source_end + 0.02:
            clamped = min(max(source_time, source_start), source_end)
            return round(float(decision["outputStart"]) + (clamped - source_start), 3)
    return None


def support_for_clip(
    decision: dict[str, Any],
    silence_ranges: list[tuple[float, float]],
    emotion_energy: dict[str, Any],
    take_groups: list[dict[str, Any]],
) -> dict[str, Any]:
    start = float(decision["sourceStart"])
    end = float(decision["sourceEnd"])
    energy_scores = [
        float(segment["score"])
        for segment in emotion_energy.get("segments", [])
        if overlap_seconds(start, end, float(segment["sourceStart"]), float(segment["sourceEnd"])) > 0
    ]
    retake_roles: list[dict[str, Any]] = []
    for group in take_groups:
        for member in group["members"]:
            if overlap_seconds(start, end, float(member["sourceStart"]), float(member["sourceEnd"])) > 0:
                retake_roles.append({"groupId": group["id"], "role": member["role"]})
    return {
        "speechCoverage": round(1.0 - overlap_ratio(start, end, silence_ranges), 3),
        "averageEnergyScore": round(average(energy_scores), 3),
        "retakeEvidence": retake_roles,
    }


def build_edl(
    manifest: dict[str, Any],
    analysis: dict[str, Any],
) -> dict[str, Any]:
    decisions = manifest.get("editDecisions", [])
    selected = [decision for decision in decisions if decision.get("decision") in KEEP_DECISIONS]
    cuts = [decision for decision in decisions if decision.get("decision") not in KEEP_DECISIONS]
    silence_ranges = [(float(item["start"]), float(item["end"])) for item in analysis["audio"]["silenceRanges"]]
    take_groups = analysis["speech"]["takeGroups"]
    emotion_energy = analysis["emotionEnergy"]

    clips: list[dict[str, Any]] = []
    for decision in selected:
        clips.append(
            {
                "id": decision["id"],
                "sourceStart": decision["sourceStart"],
                "sourceEnd": decision["sourceEnd"],
                "targetStart": decision["outputStart"],
                "targetEnd": decision["outputEnd"],
                "sourceMedia": manifest["project"].get("sourceFile"),
                "transcript": decision.get("transcript", ""),
                "directorBlock": decision.get("directorBlock"),
                "support": support_for_clip(decision, silence_ranges, emotion_energy, take_groups),
                "edits": {
                    "cutType": "jump_cut",
                    "audio": {"keepOriginal": True, "duckMusic": True},
                    "video": {"editableInCapCut": True},
                },
            }
        )

    screen_text = []
    for event in manifest.get("screenText", []):
        item = dict(event)
        item["capcutPolicy"] = {
            "editableTextLayer": True,
            "manualKeyframes": False,
            "manualAnimation": False,
            "nativeAnimationAllowedByHumanOnly": True,
        }
        screen_text.append(item)

    return {
        "schemaVersion": 1,
        "pipeline": "lingman-montazher-max",
        "project": {
            **manifest.get("project", {}),
            "renderPolicy": "capcut_project_only_by_default",
            "canonicalPlan": "multimodal-edl",
        },
        "analysisRefs": analysis.get("artifacts", {}),
        "timeline": {
            "clips": clips,
            "cuts": [
                {
                    "id": decision["id"],
                    "sourceStart": decision["sourceStart"],
                    "sourceEnd": decision["sourceEnd"],
                    "reason": decision.get("reason", ""),
                    "confidence": decision.get("confidence", 0.0),
                }
                for decision in cuts
            ],
            "captions": {
                "source": "whisper_like_transcript",
                "mode": "generated_from_edl_in_remotion_or_capcut",
                "editable": True,
            },
            "screenText": screen_text,
            "motion": manifest.get("motionEffects", []),
            "sfx": [
                {
                    "id": f"sfx_{index + 1:03d}",
                    "targetTextId": event.get("id"),
                    "targetStart": event.get("start"),
                    "kind": "soft_text_pop",
                    "variant": event.get("sfxVariant", index % 4),
                    "editableInCapCut": True,
                }
                for index, event in enumerate(manifest.get("screenText", []))
            ],
            "music": {
                "status": "planned",
                "policy": "low-bed, duck under speech, never mask lesson examples",
            },
            "broll": {
                "status": "planned_by_context",
                "policy": "only add if it clarifies the English point; talking-head remains primary",
            },
        },
        "exporters": {
            "capcut": {
                "editableProject": True,
                "trackPolicy": "video/text/plaque/sfx stay as separate editable tracks",
                "default": True,
            },
            "remotion": {
                "status": "ready_for_adapter",
                "role": "deterministic renderer from this EDL, not the decision maker",
                "finalMp4Export": False,
            },
        },
        "qualityGates": {
            "noManualTextKeyframes": True,
            "noBlackSidePanel": True,
            "retakesRequireLatestVariant": True,
            "phrasesTimedToSourceSpeech": True,
            "mp4RenderSkippedByDefault": True,
        },
    }


def build_analysis(
    *,
    manifest: dict[str, Any],
    transcript_path: Path,
    source_video: Path,
    ffprobe_path: Path | None,
    silence_log: Path | None,
    energy_log: Path | None,
    vision_sample_step: float,
    skip_vision: bool,
) -> dict[str, Any]:
    bdp = load_build_director_module()
    duration = float(manifest["project"]["duration"])
    ffprobe = load_json(ffprobe_path) if ffprobe_path and ffprobe_path.exists() else ffprobe_video(source_video)
    transcript = bdp.load_transcript_ndjson(transcript_path)
    silence_ranges = load_silence_ranges(silence_log)
    energy_windows = parse_astats_metadata(energy_log)
    speech_chunks = build_speech_chunks(transcript, bdp)
    vision = sample_vision_opencv(source_video, duration, vision_sample_step, skip_vision)
    vision_samples = vision.get("samples", []) if isinstance(vision.get("samples"), list) else []
    emotion_energy = build_emotion_energy(speech_chunks, energy_windows, vision_samples, bdp)
    take_groups = build_take_groups(speech_chunks, bdp)
    phrase_candidates = build_phrase_candidates(transcript, bdp)
    return {
        "schemaVersion": 1,
        "pipeline": "lingman-montazher-max-analysis",
        "artifacts": {
            "sourceVideo": str(source_video),
            "transcript": str(transcript_path),
            "ffprobe": str(ffprobe_path) if ffprobe_path else "generated",
            "silenceLog": str(silence_log) if silence_log else "",
            "energyLog": str(energy_log) if energy_log else "",
        },
        "ffprobe": ffprobe,
        "audio": summarize_audio(duration, silence_ranges, energy_windows),
        "speech": {
            "transcriptItemCount": len(transcript),
            "speechChunks": [
                {
                    "id": f"speech_chunk_{index + 1:03d}",
                    "sourceStart": chunk.start,
                    "sourceEnd": chunk.end,
                    "duration": round(chunk.end - chunk.start, 3),
                    "text": chunk.text,
                    "transcriptItemIndexes": chunk.transcript_ids,
                }
                for index, chunk in enumerate(speech_chunks)
            ],
            "takeGroups": take_groups,
            "phraseCandidates": phrase_candidates,
        },
        "vision": vision,
        "emotionEnergy": emotion_energy,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Lingman maximum multimodal analysis and canonical EDL without rendering MP4.")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--transcript", required=True, type=Path)
    parser.add_argument("--source-video", required=True, type=Path)
    parser.add_argument("--out-analysis", required=True, type=Path)
    parser.add_argument("--out-edl", required=True, type=Path)
    parser.add_argument("--ffprobe-json", type=Path)
    parser.add_argument("--silence-log", type=Path)
    parser.add_argument("--energy-log", type=Path)
    parser.add_argument("--vision-sample-step", type=float, default=2.0)
    parser.add_argument("--skip-vision", action="store_true")
    args = parser.parse_args()

    manifest = load_json(args.manifest)
    analysis = build_analysis(
        manifest=manifest,
        transcript_path=args.transcript,
        source_video=args.source_video,
        ffprobe_path=args.ffprobe_json,
        silence_log=args.silence_log,
        energy_log=args.energy_log,
        vision_sample_step=args.vision_sample_step,
        skip_vision=args.skip_vision,
    )
    edl = build_edl(manifest, analysis)
    analysis["artifacts"]["analysisJson"] = str(args.out_analysis)
    analysis["artifacts"]["edlJson"] = str(args.out_edl)
    edl["analysisRefs"] = analysis["artifacts"]
    write_json(args.out_analysis, analysis)
    write_json(args.out_edl, edl)
    print(args.out_edl)


if __name__ == "__main__":
    main()
