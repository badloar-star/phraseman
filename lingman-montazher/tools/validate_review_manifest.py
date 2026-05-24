from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DECISIONS = {
    "keep",
    "cut",
    "take_selected",
    "take_rejected",
    "pause_trimmed",
    "filler_trimmed",
    "visual_added",
    "sfx_added",
}


def load_manifest(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def validate_manifest(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    project = manifest.get("project")
    decisions = manifest.get("editDecisions")
    screen_text = manifest.get("screenText")

    if not isinstance(project, dict):
        errors.append("project must be an object")
        return errors

    duration = project.get("duration")
    if not isinstance(duration, (int, float)) or duration <= 0:
        errors.append("project.duration must be a positive number")

    if not isinstance(project.get("title"), str) or not project["title"].strip():
        errors.append("project.title must be a non-empty string")

    if not isinstance(decisions, list) or not decisions:
        errors.append("editDecisions must be a non-empty list")
    else:
        validate_decisions(decisions, float(duration or 0), errors)

    if not isinstance(screen_text, list):
        errors.append("screenText must be a list")
    else:
        validate_screen_text(screen_text, edited_duration(decisions or []), errors)

    return errors


def edited_duration(decisions: list[dict[str, Any]]) -> float:
    ends = [item.get("outputEnd", 0) for item in decisions if isinstance(item, dict)]
    return float(max(ends, default=0))


def validate_decisions(decisions: list[dict[str, Any]], duration: float, errors: list[str]) -> None:
    previous_output_end = 0.0
    seen_ids: set[str] = set()

    for index, item in enumerate(decisions):
        label = f"editDecisions[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{label} must be an object")
            continue

        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id.strip():
            errors.append(f"{label}.id must be a non-empty string")
        elif item_id in seen_ids:
            errors.append(f"{label}.id duplicates {item_id}")
        else:
            seen_ids.add(item_id)

        decision = item.get("decision")
        if decision not in DECISIONS:
            errors.append(f"{label}.decision must be one of {sorted(DECISIONS)}")

        source_start = item.get("sourceStart")
        source_end = item.get("sourceEnd")
        output_start = item.get("outputStart")
        output_end = item.get("outputEnd")

        if not numeric_range(source_start, source_end):
            errors.append(f"{label} source range must increase")
        elif source_start < 0 or source_end > duration:
            errors.append(f"{label} source range must stay inside project.duration")

        if not numeric_range(output_start, output_end, allow_zero=True):
            errors.append(f"{label} output range must be valid")
        elif output_start < previous_output_end:
            errors.append(f"{label}.outputStart must not move backwards")

        if isinstance(output_end, (int, float)):
            previous_output_end = max(previous_output_end, float(output_end))

        confidence = item.get("confidence")
        if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
            errors.append(f"{label}.confidence must be between 0 and 1")

        for field in ("reason", "transcript"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                errors.append(f"{label}.{field} must be a non-empty string")


def validate_screen_text(events: list[dict[str, Any]], output_duration: float, errors: list[str]) -> None:
    seen_ids: set[str] = set()

    for index, item in enumerate(events):
        label = f"screenText[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{label} must be an object")
            continue

        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id.strip():
            errors.append(f"{label}.id must be a non-empty string")
        elif item_id in seen_ids:
            errors.append(f"{label}.id duplicates {item_id}")
        else:
            seen_ids.add(item_id)

        start = item.get("start")
        end = item.get("end")
        if not numeric_range(start, end):
            errors.append(f"{label} timing must increase")
        elif start < 0 or end > output_duration:
            errors.append(f"{label} timing must stay inside edited duration")
        elif end - start < 1.2:
            errors.append(f"{label} must stay visible for at least 1.2 seconds")

        text = item.get("text")
        if not isinstance(text, str) or not text.strip():
            errors.append(f"{label}.text must be a non-empty string")
        elif len(text) > 72:
            errors.append(f"{label}.text must be 72 characters or fewer")

        for field in ("role", "position", "style", "animation", "reason"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                errors.append(f"{label}.{field} must be a non-empty string")


def numeric_range(start: Any, end: Any, allow_zero: bool = False) -> bool:
    if not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
        return False
    if allow_zero and start == end:
        return True
    return start < end


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("manifest")
    args = parser.parse_args()
    problems = validate_manifest(load_manifest(args.manifest))
    if problems:
        for problem in problems:
            print(problem)
        raise SystemExit(1)
    print("manifest ok")
