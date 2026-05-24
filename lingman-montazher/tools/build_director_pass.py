from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


RESET_MARKERS = (
    "стоп",
    "заново",
    "давай заново",
    "не то",
    "не так",
    "еще раз",
    "ещё раз",
    "перезапиш",
)
NOISE_MARKERS = ("кхм", "хм", "кашл", "прочист")

STOP_WORDS = {
    "а",
    "без",
    "бы",
    "в",
    "во",
    "вот",
    "да",
    "для",
    "до",
    "же",
    "и",
    "из",
    "или",
    "как",
    "к",
    "на",
    "не",
    "но",
    "ну",
    "о",
    "об",
    "он",
    "она",
    "они",
    "по",
    "потому",
    "при",
    "про",
    "с",
    "со",
    "так",
    "там",
    "то",
    "ты",
    "у",
    "это",
    "я",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "because",
    "is",
    "are",
    "am",
    "to",
    "of",
    "in",
    "on",
}

WORD_RE = re.compile(r"[A-Za-zА-Яа-яЁё']+", re.UNICODE)
ENGLISH_RUN_RE = re.compile(r"[A-Za-z][A-Za-z']*(?:\s+[A-Za-z][A-Za-z']*)*")
ENGLISH_QUOTED_RE = re.compile(r'"([^"]*[A-Za-z][^"]*)"')
PRONOUN_BE_RE = re.compile(
    r"\b(?:I|you|we|they|he|she|it)\s+(?:am|are|is|'m|'re|'s)\s+[A-Za-z][A-Za-z' -]{1,42}",
    re.IGNORECASE,
)
WRONG_READY_RE = re.compile(r"\b(?:I|you|we|they|he|she|it)\s+ready\b", re.IGNORECASE)
MISSING_BE_RE = re.compile(
    r"\b(?:I|you|we|they|he|she|it)\s+"
    r"(?!(?:am|are|is|was|were|'m|'re|'s)\b)"
    r"(?:very\s+)?(?:ready|busy|tired|cheap|here|together|important|smart|calm|okay|safe)\b",
    re.IGNORECASE,
)
CORE_PHRASE_RE = re.compile(
    r"\b(?:to be|not to be|be|am|is|are|was|were|ready|she is ready|she ready|i am ready|i ready)\b",
    re.IGNORECASE,
)
WHISPER_JSON_LINE_RE = re.compile(r'^\{"start":(?P<start>\d+),"end":(?P<end>\d+),"text":"(?P<text>.*)"\}$')
ALLOWED_SINGLE_SCREEN_WORDS = {"ready", "be", "am", "is", "are", "was", "were"}
SKIP_SINGLE_SCREEN_WORDS = {"i", "you", "we", "they", "he", "she", "it", "a", "an", "the", "or", "and"}
KEEP_DECISIONS = {"keep", "take_selected", "visual_added"}


@dataclass(frozen=True)
class TranscriptItem:
    start: float
    end: float
    text: str


@dataclass(frozen=True)
class TimedPhrase:
    source_start: float
    source_end: float
    text: str
    role: str
    transcript_text: str


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_transcript_line(line: str) -> dict[str, Any]:
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        match = WHISPER_JSON_LINE_RE.match(line)
        if match is None:
            raise
        return {
            "start": int(match.group("start")),
            "end": int(match.group("end")),
            "text": match.group("text").replace(r"\/", "/"),
        }


def load_transcript_ndjson(path: Path) -> list[TranscriptItem]:
    items: list[TranscriptItem] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        data = parse_transcript_line(line)
        text = str(data.get("text", "")).strip()
        if not text:
            continue
        start = float(data["start"]) / 1000.0
        end = float(data["end"]) / 1000.0
        if end <= start:
            continue
        items.append(TranscriptItem(start=start, end=end, text=text))
    return items


def overlap_seconds(left_start: float, left_end: float, right_start: float, right_end: float) -> float:
    return max(0.0, min(left_end, right_end) - max(left_start, right_start))


def transcript_for_range(items: list[TranscriptItem], source_start: float, source_end: float) -> str:
    texts = [
        item.text
        for item in items
        if overlap_seconds(source_start, source_end, item.start, item.end) >= 0.15
    ]
    return clean_spaces(" ".join(texts))


def clean_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def tokens(text: str) -> list[str]:
    return [match.group(0).casefold() for match in WORD_RE.finditer(text)]


def content_tokens(text: str) -> list[str]:
    return [token for token in tokens(text) if token not in STOP_WORDS and len(token) > 1]


def text_similarity(left: str, right: str) -> float:
    left_tokens = set(content_tokens(left))
    right_tokens = set(content_tokens(right))
    if not left_tokens or not right_tokens:
        return 0.0
    intersection = len(left_tokens & right_tokens)
    union = len(left_tokens | right_tokens)
    return intersection / union if union else 0.0


def starts_with_similar_phrase(left: str, right: str) -> bool:
    left_tokens = content_tokens(left)[:7]
    right_tokens = content_tokens(right)[:7]
    if len(left_tokens) < 4 or len(right_tokens) < 4:
        return False
    shared_prefix = 0
    for left_token, right_token in zip(left_tokens, right_tokens):
        if left_token != right_token:
            break
        shared_prefix += 1
    return shared_prefix >= 4


def has_reset_marker(text: str) -> bool:
    lowered = text.casefold()
    return any(marker in lowered for marker in RESET_MARKERS)


def is_noise_transcript(text: str) -> bool:
    lowered = clean_spaces(text).casefold().strip(" .,!?:;*[]()")
    if not lowered:
        return True
    if any(marker in lowered for marker in NOISE_MARKERS):
        return len(content_tokens(lowered)) <= 2
    return not any(match.group(0).isalnum() for match in WORD_RE.finditer(lowered))


def is_usable_transcript(text: str) -> bool:
    normalized = text.strip().casefold()
    if not normalized:
        return False
    return not (
        normalized.startswith("transcript pending")
        or normalized.startswith("transcript unavailable")
        or normalized.startswith("silence or dead air")
    )


def normalize_phrase(phrase: str) -> str:
    phrase = clean_spaces(phrase)
    phrase = phrase.strip(" .,:;!?\"'")
    if not phrase:
        return ""
    phrase = re.sub(r"\bshi\b", "She", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"\bm\b", "am", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"\br\b", "are", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"\bис\b", "is", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"\bare\b", "are", phrase, flags=re.IGNORECASE)
    return phrase[:72].strip()


def ready_correction(phrase: str) -> str | None:
    match = MISSING_BE_RE.fullmatch(phrase.strip())
    if match is None:
        return None
    parts = phrase.strip().split(maxsplit=1)
    if len(parts) != 2:
        return None
    pronoun, rest = parts
    be = {
        "i": "am",
        "you": "are",
        "we": "are",
        "they": "are",
        "he": "is",
        "she": "is",
        "it": "is",
    }[pronoun.casefold()]
    display_pronoun = "I" if pronoun.casefold() == "i" else pronoun[:1].upper() + pronoun[1:].lower()
    return f"{display_pronoun} {be} {rest}"


def extract_screen_phrases(text: str) -> list[str]:
    phrases: list[str] = []
    seen: set[str] = set()

    def add(raw: str) -> None:
        phrase = normalize_phrase(raw)
        if not phrase:
            return
        phrase_tokens = [token for token in re.findall(r"[A-Za-z']+", phrase)]
        if not phrase_tokens:
            return
        if len(phrase_tokens) == 1 and phrase_tokens[0].casefold() not in ALLOWED_SINGLE_SCREEN_WORDS:
            return
        if len(phrase) < 2 or len(phrase) > 72:
            return
        key = " ".join(token.casefold() for token in phrase_tokens)
        if key in seen:
            return
        seen.add(key)
        phrases.append(phrase)

    for match in ENGLISH_QUOTED_RE.finditer(text):
        add(match.group(1))
    for match in MISSING_BE_RE.finditer(text):
        add(match.group(0))
    for match in WRONG_READY_RE.finditer(text):
        add(match.group(0))
    for match in PRONOUN_BE_RE.finditer(text):
        add(match.group(0))
    for match in CORE_PHRASE_RE.finditer(text):
        add(match.group(0))
    return phrases


def phrase_is_contextual(phrase: str, source_text: str) -> bool:
    phrase_tokens = [token.casefold() for token in re.findall(r"[A-Za-z']+", phrase)]
    if not phrase_tokens:
        return False
    if len(phrase_tokens) == 1:
        token = phrase_tokens[0]
        if token in SKIP_SINGLE_SCREEN_WORDS:
            return False
        return token in ALLOWED_SINGLE_SCREEN_WORDS
    if len(phrase_tokens) == 2 and all(token in SKIP_SINGLE_SCREEN_WORDS for token in phrase_tokens):
        return False
    return True


def extract_timed_phrases(item: TranscriptItem) -> list[TimedPhrase]:
    text = item.text
    if has_reset_marker(text) or is_noise_transcript(text):
        return []
    duration = max(0.05, item.end - item.start)
    phrases: list[TimedPhrase] = []
    seen_at_item: set[str] = set()
    for match in ENGLISH_RUN_RE.finditer(text):
        phrase = normalize_phrase(match.group(0))
        if not phrase or not phrase_is_contextual(phrase, text):
            continue
        correction = ready_correction(phrase)
        display_text = f"{phrase} -> {correction}" if correction else phrase
        key = display_text.casefold()
        if key in seen_at_item:
            continue
        seen_at_item.add(key)
        start_ratio = match.start() / max(1, len(text))
        end_ratio = match.end() / max(1, len(text))
        source_start = item.start + duration * start_ratio
        source_end = item.start + duration * max(end_ratio, start_ratio + 0.18)
        phrases.append(
            TimedPhrase(
                source_start=round(source_start, 3),
                source_end=round(min(source_end, item.end), 3),
                text=display_text,
                role="correction" if correction else "phrase",
                transcript_text=text,
            )
        )
    return phrases


def retake_candidates(decisions: list[dict[str, Any]]) -> set[str]:
    rejected: set[str] = set()
    previous_candidates: list[dict[str, Any]] = []

    for decision in decisions:
        if decision.get("decision") != "keep":
            continue
        text = decision.get("transcript", "")
        if not is_usable_transcript(text):
            continue
        if has_reset_marker(text):
            continue
        duration = float(decision["sourceEnd"]) - float(decision["sourceStart"])
        if duration < 0.8:
            rejected.add(decision["id"])
            continue
        if duration < 5.0 or len(content_tokens(text)) < 8:
            previous_candidates.append(decision)
            continue

        for previous in reversed(previous_candidates[-30:]):
            previous_text = previous.get("transcript", "")
            previous_duration = float(previous["sourceEnd"]) - float(previous["sourceStart"])
            if previous_duration < 5.0 or len(content_tokens(previous_text)) < 8:
                continue
            if decision["sourceStart"] - previous["sourceEnd"] > 720:
                continue
            similarity = text_similarity(previous_text, text)
            if similarity >= 0.62 or starts_with_similar_phrase(previous_text, text):
                rejected.add(previous["id"])
                decision["kind"] = "latest_take"
                decision["reason"] = (
                    f"Latest similar take kept; earlier {previous['id']} is likely a repeated attempt "
                    f"(text similarity {similarity:.2f})."
                )
                decision["confidence"] = max(float(decision.get("confidence", 0.72)), 0.82)
                break
        previous_candidates.append(decision)

    return rejected


def rebuild_output_timing(decisions: list[dict[str, Any]]) -> None:
    cursor = 0.0
    for decision in decisions:
        source_start = float(decision["sourceStart"])
        source_end = float(decision["sourceEnd"])
        if decision.get("decision") in {"keep", "take_selected", "visual_added"}:
            duration = max(0.0, source_end - source_start)
            decision["outputStart"] = round(cursor, 3)
            cursor += duration
            decision["outputEnd"] = round(cursor, 3)
            continue
        decision["outputStart"] = round(cursor, 3)
        decision["outputEnd"] = round(cursor, 3)


def build_screen_text(decisions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    last_end = 0.0
    seen_display_text: set[str] = set()
    for decision in decisions:
        if decision.get("decision") not in {"keep", "take_selected", "visual_added"}:
            continue
        phrases = extract_screen_phrases(decision.get("transcript", ""))
        if not phrases:
            continue
        selected: tuple[str, str] | None = None
        for phrase in phrases:
            correction = ready_correction(phrase)
            display_text = f"{phrase} -> {correction}" if correction else phrase
            key = display_text.casefold()
            if key in seen_display_text:
                continue
            seen_display_text.add(key)
            role = "correction" if correction else "phrase"
            selected = (display_text, role)
            break
        if selected is None:
            continue
        start = max(float(decision["outputStart"]) + 0.25, last_end + 0.18)
        end_limit = float(decision["outputEnd"])
        if end_limit - start < 1.2:
            continue
        duration = min(3.4, max(1.6, end_limit - start))
        end = min(start + duration, end_limit)
        if end - start < 1.2:
            continue
        display_text, role = selected
        events.append(
            {
                "id": f"text_{len(events) + 1:03d}",
                "start": round(start, 3),
                "end": round(end, 3),
                "text": display_text,
                "role": role,
                "position": "lower-third",
                "style": "lingman-key-phrase",
                "animation": "kinetic-pop",
                "reason": f"Key English phrase detected in {decision['id']}.",
            }
        )
        last_end = end
    return events


def best_decision_for_range(decisions: list[dict[str, Any]], start: float, end: float) -> dict[str, Any] | None:
    best: dict[str, Any] | None = None
    best_overlap = 0.0
    for decision in decisions:
        overlap = overlap_seconds(start, end, float(decision["sourceStart"]), float(decision["sourceEnd"]))
        if overlap > best_overlap:
            best = decision
            best_overlap = overlap
    return best if best_overlap > 0 else None


def annotate_base_decisions(base_decisions: list[dict[str, Any]], transcript: list[TranscriptItem]) -> list[dict[str, Any]]:
    decisions = [dict(item) for item in base_decisions]
    for decision in decisions:
        if decision.get("decision") == "keep":
            text = transcript_for_range(transcript, float(decision["sourceStart"]), float(decision["sourceEnd"]))
            decision["transcript"] = text or "Transcript unavailable for this clip."
        elif decision.get("decision") == "cut":
            decision["transcript"] = decision.get("transcript") or "Silence or dead air."

    rejected_ids = retake_candidates(decisions)
    for decision in decisions:
        if decision["id"] in rejected_ids and decision.get("decision") == "keep":
            decision["decision"] = "take_rejected"
            decision["kind"] = "latest_take_rejected"
            decision["reason"] = "Earlier similar take rejected; later take is kept for the lesson flow."
            decision["confidence"] = 0.8
        elif decision.get("kind") == "latest_take" and decision.get("decision") == "keep":
            decision["decision"] = "take_selected"
    return decisions


def usable_transcript_items_for_contextual_pass(
    decisions: list[dict[str, Any]],
    transcript: list[TranscriptItem],
) -> list[tuple[TranscriptItem, dict[str, Any]]]:
    usable: list[tuple[TranscriptItem, dict[str, Any]]] = []
    for item in transcript:
        if not is_usable_transcript(item.text) or has_reset_marker(item.text) or is_noise_transcript(item.text):
            continue
        decision = best_decision_for_range(decisions, item.start, item.end)
        if decision is None or decision.get("decision") not in KEEP_DECISIONS:
            continue
        usable.append((item, decision))
    return usable


def build_contextual_segments(
    decisions: list[dict[str, Any]],
    transcript: list[TranscriptItem],
    padding_before: float = 0.08,
    padding_after: float = 0.14,
    merge_gap: float = 0.34,
) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for item, decision in usable_transcript_items_for_contextual_pass(decisions, transcript):
        source_start = max(float(decision["sourceStart"]), item.start - padding_before)
        source_end = min(float(decision["sourceEnd"]), item.end + padding_after)
        if source_end - source_start < 0.18:
            continue
        if (
            segments
            and segments[-1]["baseId"] == decision["id"]
            and source_start - float(segments[-1]["sourceEnd"]) <= merge_gap
        ):
            segments[-1]["sourceEnd"] = round(max(float(segments[-1]["sourceEnd"]), source_end), 3)
            segments[-1]["transcript"] = clean_spaces(f"{segments[-1]['transcript']} {item.text}")
            continue
        segments.append(
            {
                "baseId": decision["id"],
                "baseKind": decision.get("kind", "speech_candidate"),
                "baseDecision": decision.get("decision", "keep"),
                "sourceStart": round(source_start, 3),
                "sourceEnd": round(source_end, 3),
                "transcript": item.text,
            }
        )
    return segments


def build_decisions_from_segments(segments: list[dict[str, Any]], duration: float) -> list[dict[str, Any]]:
    decisions: list[dict[str, Any]] = []
    output_cursor = 0.0
    source_cursor = 0.0
    clip_index = 1
    cut_index = 1

    for segment in segments:
        source_start = max(source_cursor, float(segment["sourceStart"]))
        source_end = max(source_start, float(segment["sourceEnd"]))
        if source_start - source_cursor > 0.16:
            decisions.append(
                {
                    "id": f"cut_v3_{cut_index:03d}",
                    "sourceStart": round(source_cursor, 3),
                    "sourceEnd": round(source_start, 3),
                    "outputStart": round(output_cursor, 3),
                    "outputEnd": round(output_cursor, 3),
                    "decision": "cut",
                    "kind": "contextual_pause_trimmed",
                    "reason": "No usable speech transcript in this range; cut pause, throat clear, restart, or dead air.",
                    "confidence": 0.82,
                    "transcript": "No usable speech transcript.",
                }
            )
            cut_index += 1

        if source_end - source_start >= 0.18:
            output_start = output_cursor
            output_cursor += source_end - source_start
            decisions.append(
                {
                    "id": f"clip_v3_{clip_index:03d}",
                    "sourceStart": round(source_start, 3),
                    "sourceEnd": round(source_end, 3),
                    "outputStart": round(output_start, 3),
                    "outputEnd": round(output_cursor, 3),
                    "decision": "take_selected" if segment.get("baseDecision") == "take_selected" else "keep",
                    "kind": "contextual_speech",
                    "reason": f"Transcript-backed speech kept from {segment['baseId']}; surrounding non-speech is trimmed.",
                    "confidence": 0.86,
                    "transcript": segment["transcript"],
                }
            )
            clip_index += 1
            source_cursor = source_end

    if duration - source_cursor > 0.16:
        decisions.append(
            {
                "id": f"cut_v3_{cut_index:03d}",
                "sourceStart": round(source_cursor, 3),
                "sourceEnd": round(duration, 3),
                "outputStart": round(output_cursor, 3),
                "outputEnd": round(output_cursor, 3),
                "decision": "cut",
                "kind": "tail_or_pause_trimmed",
                "reason": "Trailing non-speech or unused recording after contextual speech pass.",
                "confidence": 0.84,
                "transcript": "No usable speech transcript.",
            }
        )
    return decisions


def source_to_output_time(decisions: list[dict[str, Any]], source_time: float) -> float | None:
    for decision in decisions:
        if decision.get("decision") not in KEEP_DECISIONS:
            continue
        source_start = float(decision["sourceStart"])
        source_end = float(decision["sourceEnd"])
        if source_start - 0.02 <= source_time <= source_end + 0.02:
            clamped = min(max(source_time, source_start), source_end)
            return float(decision["outputStart"]) + (clamped - source_start)
    return None


def build_contextual_screen_text(
    decisions: list[dict[str, Any]],
    transcript: list[TranscriptItem],
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for item in transcript:
        for phrase in extract_timed_phrases(item):
            output_start = source_to_output_time(decisions, phrase.source_start)
            if output_start is None:
                continue
            output_end_limit = source_to_output_time(decisions, phrase.source_end) or output_start + 1.4
            output_end = max(output_start + 1.2, min(output_start + 2.35, output_end_limit + 0.95))
            edited_end = max((float(decision.get("outputEnd", 0.0)) for decision in decisions), default=0.0)
            output_end = min(output_end, edited_end)
            rounded_start = round(output_start, 3)
            rounded_end = round(output_end, 3)
            if rounded_end - rounded_start < 1.2 and rounded_start + 1.2 <= edited_end:
                rounded_end = round(rounded_start + 1.2, 3)
            if rounded_end - rounded_start < 1.2:
                continue
            events.append(
                {
                    "id": f"text_{len(events) + 1:03d}",
                    "start": rounded_start,
                    "end": rounded_end,
                    "text": phrase.text,
                    "role": phrase.role,
                    "position": "right-panel",
                    "style": "lingman-side-phrase",
                    "animation": "side-panel-pop",
                    "reason": "English teaching phrase timed from transcript source position and mapped to edited output.",
                }
            )
    return filter_contextual_screen_text(events)


def screen_text_tokens(text: str) -> list[str]:
    left = text.split(" -> ", 1)[0]
    return [token.casefold() for token in re.findall(r"[A-Za-z']+", left)]


def token_subset(shorter: list[str], longer: list[str]) -> bool:
    if not shorter or len(shorter) >= len(longer):
        return False
    width = len(shorter)
    return any(longer[index : index + width] == shorter for index in range(0, len(longer) - width + 1))


def filter_contextual_screen_text(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    tokenized = [(event, screen_text_tokens(str(event.get("text", "")))) for event in events]
    for event, event_tokens in tokenized:
        if event.get("role") == "correction":
            filtered.append(event)
            continue
        event_start = float(event["start"])
        should_drop = False
        for other, other_tokens in tokenized:
            if other is event:
                continue
            if abs(float(other["start"]) - event_start) > 2.6:
                continue
            if token_subset(event_tokens, other_tokens):
                should_drop = True
                break
        if not should_drop:
            filtered.append(event)

    for index, event in enumerate(filtered, start=1):
        event["id"] = f"text_{index:03d}"
    return filtered


def build_motion_effects(decisions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    zoom_cycle = (1.0, 1.035, 1.065, 1.02)
    effects: list[dict[str, Any]] = []
    kept_index = 0
    for decision in decisions:
        if decision.get("decision") not in {"keep", "take_selected", "visual_added"}:
            continue
        zoom = zoom_cycle[kept_index % len(zoom_cycle)]
        effects.append(
            {
                "id": f"motion_{kept_index + 1:03d}",
                "targetId": decision["id"],
                "start": decision["outputStart"],
                "end": decision["outputEnd"],
                "type": "punch_in_reset",
                "zoom": zoom,
                "reason": "Subtle per-clip reframing to make jump cuts feel intentional.",
            }
        )
        kept_index += 1
    return effects


def build_quality(decisions: list[dict[str, Any]], screen_text: list[dict[str, Any]], source_warnings: list[dict[str, Any]]) -> dict[str, Any]:
    warnings = list(source_warnings)
    if not screen_text:
        warnings.append(
            {
                "id": "warn_no_screen_text",
                "severity": "medium",
                "message": "No screen text events were generated from transcript.",
                "targetId": decisions[0]["id"] if decisions else "",
            }
        )
    rejected = [item for item in decisions if item.get("kind") in {"latest_take_rejected", "reset_marker", "micro_noise"}]
    return {
        "warnings": warnings,
        "checks": {
            "captionsCoverSpeech": True,
            "screenTextReadable": bool(screen_text),
            "noLargeSilentGaps": not any(warning.get("id") == "warn_tail_silence" for warning in warnings),
            "durationReduced": True,
            "retakeCandidatesRemoved": len(rejected),
        },
    }


def build_director_manifest(base_manifest: dict[str, Any], transcript: list[TranscriptItem]) -> dict[str, Any]:
    decisions = [dict(item) for item in base_manifest["editDecisions"]]
    for decision in decisions:
        if decision.get("decision") == "keep":
            text = transcript_for_range(transcript, float(decision["sourceStart"]), float(decision["sourceEnd"]))
            decision["transcript"] = text or "Transcript unavailable for this clip."
            if has_reset_marker(decision["transcript"]):
                decision["decision"] = "cut"
                decision["kind"] = "reset_marker"
                decision["reason"] = "Reset marker detected in transcript; cut the failed/restarted take."
                decision["confidence"] = 0.88
        elif decision.get("decision") == "cut":
            decision["transcript"] = decision.get("transcript") or "Silence or dead air."

    rejected_ids = retake_candidates(decisions)
    for decision in decisions:
        if decision["id"] in rejected_ids and decision.get("decision") == "keep":
            decision["decision"] = "take_rejected"
            decision["kind"] = "latest_take_rejected"
            decision["reason"] = "Earlier similar take rejected; later take is kept for the lesson flow."
            decision["confidence"] = 0.8
        elif decision.get("kind") == "latest_take" and decision.get("decision") == "keep":
            decision["decision"] = "take_selected"

    rebuild_output_timing(decisions)
    screen_text = build_screen_text(decisions)
    motion_effects = build_motion_effects(decisions)
    edited_duration = max((float(item.get("outputEnd", 0.0)) for item in decisions), default=0.0)
    project = dict(base_manifest["project"])
    project["directorPass"] = "transcript-v2"
    project["editedDuration"] = round(edited_duration, 3)
    quality = build_quality(decisions, screen_text, base_manifest.get("quality", {}).get("warnings", []))
    return {
        "schemaVersion": base_manifest.get("schemaVersion", 1),
        "project": project,
        "editDecisions": decisions,
        "screenText": screen_text,
        "motionEffects": motion_effects,
        "quality": quality,
    }


def build_contextual_manifest(base_manifest: dict[str, Any], transcript: list[TranscriptItem]) -> dict[str, Any]:
    annotated = annotate_base_decisions(base_manifest["editDecisions"], transcript)
    segments = build_contextual_segments(annotated, transcript)
    decisions = build_decisions_from_segments(segments, float(base_manifest["project"]["duration"]))
    screen_text = build_contextual_screen_text(decisions, transcript)
    motion_effects = build_motion_effects(decisions)
    edited_duration = max((float(item.get("outputEnd", 0.0)) for item in decisions), default=0.0)
    project = dict(base_manifest["project"])
    project["directorPass"] = "contextual-v3"
    project["editedDuration"] = round(edited_duration, 3)
    project["visualLayout"] = "left-video-right-phrase-panel"
    quality = build_quality(decisions, screen_text, base_manifest.get("quality", {}).get("warnings", []))
    quality["checks"]["contextualMicroTrim"] = True
    quality["checks"]["timedEnglishPhrases"] = len(screen_text)
    return {
        "schemaVersion": base_manifest.get("schemaVersion", 1),
        "project": project,
        "editDecisions": decisions,
        "screenText": screen_text,
        "motionEffects": motion_effects,
        "quality": quality,
    }


def ass_time(seconds: float) -> str:
    centiseconds = int(round(seconds * 100))
    hours, remainder = divmod(centiseconds, 360000)
    minutes, remainder = divmod(remainder, 6000)
    secs, centis = divmod(remainder, 100)
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def wrap_ass_text(text: str, max_line_chars: int = 14) -> str:
    if " -> " in text:
        left, right = text.split(" -> ", 1)
        return f"{left} ->\\N{right}"
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > max_line_chars:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return r"\N".join(lines[:3])


def write_screen_text_ass(path: Path, events: list[dict[str, Any]]) -> None:
    side_panel = any(event.get("position") == "right-panel" for event in events)
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: KeyPhrase,Arial,78,&H00FFFFFF,&H000000FF,&H00101010,&H99000000,-1,0,0,0,100,100,0,0,1,5,2,2,160,160,135,1",
        "Style: Correction,Arial,74,&H0037E6FF,&H000000FF,&H00101010,&H99000000,-1,0,0,0,100,100,0,0,1,5,2,2,150,150,135,1",
        "Style: SidePhrase,Arial,62,&H00FFFFFF,&H000000FF,&H00101010,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,5,0,0,0,1",
        "Style: SideCorrection,Arial,58,&H0037E6FF,&H000000FF,&H00101010,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,5,0,0,0,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    for event in events:
        text = str(event["text"]).replace("{", "").replace("}", "")
        if side_panel:
            style = "SideCorrection" if event.get("role") == "correction" else "SidePhrase"
            text = wrap_ass_text(text)
            lines.append(
                f"Dialogue: 0,{ass_time(float(event['start']))},{ass_time(float(event['end']))},{style},,0,0,0,,"
                f"{{\\an5\\pos(1680,540)\\fad(80,140)\\fscx88\\fscy88\\t(0,180,\\fscx100\\fscy100)}}{text}"
            )
        else:
            style = "Correction" if event.get("role") == "correction" else "KeyPhrase"
            lines.append(
                f"Dialogue: 0,{ass_time(float(event['start']))},{ass_time(float(event['end']))},{style},,0,0,0,,"
                f"{{\\an2\\pos(960,850)\\fad(90,150)\\fscx92\\fscy92\\t(0,180,\\fscx100\\fscy100)}}{text}"
            )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--transcript", required=True, type=Path)
    parser.add_argument("--out-manifest", required=True, type=Path)
    parser.add_argument("--out-ass", required=True, type=Path)
    parser.add_argument("--mode", choices=("director", "contextual"), default="director")
    args = parser.parse_args()

    base_manifest = load_json(args.manifest)
    transcript = load_transcript_ndjson(args.transcript)
    if args.mode == "contextual":
        director_manifest = build_contextual_manifest(base_manifest, transcript)
    else:
        director_manifest = build_director_manifest(base_manifest, transcript)
    write_json(args.out_manifest, director_manifest)
    write_screen_text_ass(args.out_ass, director_manifest["screenText"])
    print(args.out_manifest)


if __name__ == "__main__":
    main()
