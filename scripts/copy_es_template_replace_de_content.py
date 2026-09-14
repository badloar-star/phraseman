"""Copy the approved ES CapCut layout and replace *only* DE media/text payloads.

Allowed draft mutations are intentionally narrow:
  * text material `content` strings (style dictionaries are retained);
  * audio material file paths/names;
  * visual material file paths/names/dimensions.

Track order, segment order, segment timings, transforms, effects, fonts, colour,
opacity, animation, and every other material property are copied unchanged.
"""

from __future__ import annotations

import argparse
import copy
import json
import random
import re
import shutil
import uuid
from pathlib import Path

from PIL import Image


SOURCE_NAME = "SPANISH CHAINS 50 — 3 PARTS: CHAINS + RECALL + LISTENING"
STAGING_FOLDER = "CAPCUT_ES_TEMPLATE_DE_CONTENT_COPY"
VISUAL_TRACKS = {"06_VISUALS_50_ALPHA", "P2_01_VISUALS_50_ALPHA", "P3_01_VISUALS_50_ALPHA"}
WAV_PATTERN = re.compile(r"[\\/]([1-7])[\\/](\d{3})\.wav$", re.IGNORECASE)
CHAIN_PATTERN = re.compile(r"(?:^P|CH)(\d{3})")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, value: dict) -> None:
    temporary = path.with_name(f"{path.name}.new-{uuid.uuid4().hex}")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def utf16_length(text: str) -> int:
    return len(text.encode("utf-16-le")) // 2


def replace_text(material: dict, text: str) -> None:
    """Change text and only the rich-text range that describes that exact text."""
    content = json.loads(material["content"])
    old_text = content.get("text", "")
    old_length = utf16_length(old_text)
    new_length = utf16_length(text)
    content["text"] = text
    for style in content.get("styles", []):
        if style.get("range") == [0, old_length]:
            style["range"] = [0, new_length]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def text_track_by_occurrence(draft: dict, name: str, occurrence: int) -> dict:
    matches = [track for track in draft["tracks"] if track["type"] == "text" and track["name"] == name]
    if occurrence >= len(matches):
        raise ValueError(f"Missing text track {name!r} occurrence {occurrence}")
    return matches[occurrence]


def segment_materials(draft: dict, track: dict) -> list[dict]:
    materials = {item["id"]: item for item in draft["materials"]["texts"]}
    return [materials[segment["material_id"]] for segment in track["segments"]]


def language_label(text: str) -> str:
    replacements = {
        "ИСПАНСКИ": "НЕМЕЦКИ",
        "испански": "немецки",
        "Испански": "Немецки",
        "ИСПАНСКУЮ": "НЕМЕЦКУЮ",
        "испанскую": "немецкую",
        "Испанскую": "Немецкую",
        "ИСПАНСКАЯ": "НЕМЕЦКАЯ",
        "испанская": "немецкая",
        "Испанская": "Немецкая",
        "ИСПАНСКОГО": "НЕМЕЦКОГО",
        "испанского": "немецкого",
        "Испанского": "Немецкого",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


def text_of(material: dict) -> str:
    return json.loads(material["content"]).get("text", "")


def visual_chain_number(segment: dict) -> int | None:
    match = CHAIN_PATTERN.search(segment.get("desc", ""))
    return int(match.group(1)) if match else None


def audio_indices(draft: dict, track_name: str) -> list[int]:
    audio_materials = {item["id"]: item for item in draft["materials"]["audios"]}
    track = next(track for track in draft["tracks"] if track["type"] == "audio" and track["name"] == track_name)
    indices: list[int] = []
    for segment in track["segments"]:
        match = WAV_PATTERN.search(audio_materials[segment["material_id"]].get("path", ""))
        if not match:
            raise ValueError(f"Cannot derive phrase index from {track_name}")
        indices.append(int(match.group(2)))
    if len(indices) != 50 or any(index % 5 for index in indices):
        raise ValueError(f"Unexpected recall/listening index pattern in {track_name}")
    return indices


def validate_layout_unchanged(before: dict, after: dict) -> None:
    """Prove that no timing/style/layout field changed during payload replacement."""
    assert len(before["tracks"]) == len(after["tracks"])
    for original, changed in zip(before["tracks"], after["tracks"]):
        assert original["id"] == changed["id"]
        assert original["type"] == changed["type"]
        assert original["name"] == changed["name"]
        assert original["segments"] == changed["segments"]

    for category in ("audios", "videos", "texts"):
        original = {item["id"]: item for item in before["materials"][category]}
        changed = {item["id"]: item for item in after["materials"][category]}
        assert original.keys() == changed.keys()
        for item_id in original:
            old = copy.deepcopy(original[item_id])
            new = copy.deepcopy(changed[item_id])
            if category == "texts":
                old.pop("content", None)
                new.pop("content", None)
            elif category == "audios":
                for key in ("path", "name", "material_name"):
                    old.pop(key, None)
                    new.pop(key, None)
            else:
                for key in ("path", "name", "material_name", "width", "height"):
                    old.pop(key, None)
                    new.pop(key, None)
            assert old == new, f"Unexpected {category} mutation: {item_id}"


def mutate_payloads(draft: dict, de_root: Path) -> dict:
    chains = read_json(de_root / "VIDEO_DATA.json")["chains"]
    if len(chains) != 50 or any(len(chain["steps"]) != 5 for chain in chains):
        raise ValueError("DE content does not contain 50 chains of five steps")
    before = copy.deepcopy(draft)

    # Part 1: positional slots already represent 50 chains × 5 steps.
    primary_tracks = [text_track_by_occurrence(draft, "ES_TEXT_250", index) for index in range(5)]
    ru_slots, ipa_slots, de_slots, explanation_slots, replay_slots = [segment_materials(draft, track) for track in primary_tracks]
    if [len(items) for items in (ru_slots, ipa_slots, de_slots, explanation_slots, replay_slots)] != [250, 250, 250, 50, 50]:
        raise ValueError("Unexpected Part 1 text-slot counts")
    for chain_index, chain in enumerate(chains):
        for step_index, step in enumerate(chain["steps"]):
            slot = chain_index * 5 + step_index
            replace_text(ru_slots[slot], step["russian"])
            replace_text(ipa_slots[slot], step["ipa_auto"])
            replace_text(de_slots[slot], step["german"])
        replace_text(explanation_slots[chain_index], chain["explanation_screen_ru"])
        replace_text(replay_slots[chain_index], chain["steps"][-1]["german"])

    # The approved template's own audio order defines the recall/listening
    # order.  German strings are selected from that same final-step index.
    p2_indices = audio_indices(draft, "P2_09_RUSSIAN_AUDIO_50")
    p3_indices = audio_indices(draft, "P3_09_MALE_CHECK_AUDIO_50")
    p2_chains = [chains[index // 5 - 1] for index in p2_indices]
    p3_chains = [chains[index // 5 - 1] for index in p3_indices]
    for materials, values in (
        (segment_materials(draft, text_track_by_occurrence(draft, "P2_03_RU_PROMPTS_50", 0)), [chain["steps"][-1]["russian"] for chain in p2_chains]),
        (segment_materials(draft, text_track_by_occurrence(draft, "P2_04_IPA_ANSWERS_50", 0)), [chain["steps"][-1]["ipa_auto"] for chain in p2_chains]),
        (segment_materials(draft, text_track_by_occurrence(draft, "P2_05_ES_ANSWERS_50", 0)), [chain["steps"][-1]["german"] for chain in p2_chains]),
        (segment_materials(draft, text_track_by_occurrence(draft, "P3_03_IPA_ANSWERS_50", 0)), [chain["steps"][-1]["ipa_auto"] for chain in p3_chains]),
        (segment_materials(draft, text_track_by_occurrence(draft, "P3_04_ES_ANSWERS_50", 0)), [chain["steps"][-1]["german"] for chain in p3_chains]),
    ):
        if len(materials) != len(values):
            raise ValueError("Unexpected Part 2/3 text-slot count")
        for material, value in zip(materials, values):
            replace_text(material, value)

    # Keep every template label, font and position; change only the target
    # language name where the existing Russian helper text says Spanish.
    assigned_ids = {material["id"] for group in (ru_slots, ipa_slots, de_slots, explanation_slots, replay_slots) for material in group}
    for material in draft["materials"]["texts"]:
        if material["id"] not in assigned_ids:
            current = text_of(material)
            adjusted = language_label(current)
            if adjusted != current:
                replace_text(material, adjusted)

    # CapCut's supplied project deliberately reuses 50 material IDs: a final
    # phrase and its replay point at the same ID.  The JSON material array
    # nevertheless contains duplicate records.  CapCut resolves the first
    # record, so every record for the same ID must receive the identical
    # payload; changing just the final duplicate leaves Spanish on screen.
    duplicate_groups: dict[str, list[dict]] = {}
    for material in draft["materials"]["texts"]:
        duplicate_groups.setdefault(material["id"], []).append(material)
    for materials in duplicate_groups.values():
        if len(materials) > 1:
            canonical_text = text_of(materials[-1])
            for material in materials[:-1]:
                replace_text(material, canonical_text)

    # Replace audio asset paths only; keep all timing/segment layout intact.
    audio_replaced = 0
    for material in draft["materials"]["audios"]:
        match = WAV_PATTERN.search(material.get("path", ""))
        if not match:
            continue
        folder, index = match.groups()
        replacement = de_root / folder / f"{index}.wav"
        if not replacement.is_file():
            raise ValueError(f"Missing approved DE audio: {replacement}")
        material["path"] = replacement.as_posix()
        material["name"] = replacement.name
        material["material_name"] = replacement.name
        audio_replaced += 1

    # Replace only the photo materials actually used by the three existing
    # illustration tracks.  Their segments/transforms/effects remain exact.
    video_materials = {item["id"]: item for item in draft["materials"]["videos"]}
    image_replaced = 0
    for track in draft["tracks"]:
        if track["name"] not in VISUAL_TRACKS:
            continue
        for segment in track["segments"]:
            chain_number = visual_chain_number(segment)
            if chain_number is None:
                continue
            candidates = sorted((de_root / "ASSETS" / "COLLAGE_TRANSPARENT_V3").glob(f"{chain_number:03d}_*.png"))
            if len(candidates) != 1:
                raise ValueError(f"Missing or ambiguous visual for chain {chain_number:03d}")
            replacement = candidates[0]
            with Image.open(replacement) as image:
                width, height = image.size
            material = video_materials[segment["material_id"]]
            material["path"] = replacement.as_posix()
            material["name"] = replacement.name
            material["material_name"] = replacement.name
            material["width"] = width
            material["height"] = height
            image_replaced += 1

    validate_layout_unchanged(before, draft)
    return {"audio_materials_relinked": audio_replaced, "visual_materials_relinked": image_replaced, "text_materials_rewritten": len(draft["materials"]["texts"])}


def ignored_copy_items(directory: str, contents: list[str]) -> set[str]:
    ignored: set[str] = set()
    for name in contents:
        if name.startswith("draft_content.before_") or name in {"draft_content.zip", "template-2.tmp", "draft_content.json.bak", "draft_meta_info.json.bak"}:
            ignored.add(name)
    return ignored


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--de-root", type=Path, required=True)
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    source = args.source.resolve()
    de_root = args.de_root.resolve()
    destination = (args.destination or de_root / STAGING_FOLDER).resolve()
    original = read_json(source / "draft_content.json")
    if original.get("name") != SOURCE_NAME:
        raise SystemExit(f"Refusing unexpected template project: {original.get('name')!r}")
    if destination.exists():
        raise SystemExit(f"Refusing to overwrite existing destination: {destination}")

    candidate = copy.deepcopy(original)
    report = mutate_payloads(candidate, de_root)
    report.update({"template": source.as_posix(), "destination": destination.as_posix(), "tracks_preserved": len(candidate["tracks"]), "segment_count_preserved": sum(len(track["segments"]) for track in candidate["tracks"])})
    if args.dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    shutil.copytree(source, destination, ignore=ignored_copy_items)
    candidate["name"] = "DE A1 — Фразы для жизни в Германии"
    write_json(destination / "draft_content.json", candidate)
    # Desktop CapCut loads the active Player from the inner timeline bundle,
    # not exclusively from the project-root draft.  Keep all active full-draft
    # replicas identical.  No segment/style/layout field changes here.
    timeline_dir = destination / "Timelines" / candidate["id"]
    if not timeline_dir.is_dir():
        raise RuntimeError("Template is missing its active Timelines bundle")
    for relative in (Path("draft_content.json"), Path("draft_content.json.bak"), Path("template-2.tmp")):
        write_json(timeline_dir / relative, candidate)
    meta_path = destination / "draft_meta_info.json"
    if meta_path.is_file():
        meta = read_json(meta_path)
        meta["draft_name"] = candidate["name"]
        write_json(meta_path, meta)
    (destination / "PAYLOAD_REPLACEMENT_REPORT.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
