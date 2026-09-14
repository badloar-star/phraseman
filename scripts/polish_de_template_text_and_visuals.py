"""Text fidelity and visual-fade correction for the elastic DE template copy.

This is intentionally a narrow payload/presentation pass.  It does not add,
delete, retime or reorder any CapCut segments/tracks.  It only:
* makes every visible explanation equal to its folder-5 voice script;
* applies the Part-1 language-text presentation to matching P2/P3 slots;
* moves existing image fade-outs to the actual end of stretched image clips.
"""

from __future__ import annotations

import argparse
import copy
import json
import shutil
import textwrap
import uuid
from pathlib import Path


VISUAL_TRACKS = {"06_VISUALS_50_ALPHA", "P2_01_VISUALS_50_ALPHA", "P3_01_VISUALS_50_ALPHA"}


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(path: Path, data: dict) -> None:
    temp = path.with_name(f"{path.name}.new-{uuid.uuid4().hex}")
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(path)


def text_tracks(draft: dict, name: str) -> list[dict]:
    return [track for track in draft["tracks"] if track["type"] == "text" and track["name"] == name]


def text_materials(draft: dict) -> dict[str, dict]:
    return {material["id"]: material for material in draft["materials"]["texts"]}


def set_text(material: dict, text: str, *, styles: list[dict] | None = None) -> None:
    content = json.loads(material["content"])
    old_text = content.get("text", "")
    content["text"] = text
    if styles is not None:
        content["styles"] = copy.deepcopy(styles)
    old_length = len(old_text.encode("utf-16-le")) // 2
    new_length = len(text.encode("utf-16-le")) // 2
    for style in content.get("styles", []):
        # A copied Part-1 style carries that material's original range; the
        # range belongs to typography, not to the words themselves.
        if style.get("range", [None])[0] == 0:
            style["range"] = [0, new_length]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def display_wrap(text: str, width: int = 38) -> str:
    """Line breaks are visual only: replacing them with spaces restores audio text."""
    normalized = " ".join(text.split())
    return "\n".join(textwrap.wrap(normalized, width=width, break_long_words=False, break_on_hyphens=False))


def apply_explanations(draft: dict, de_root: Path) -> int:
    manifest = read(de_root / "AUDIO_MANIFEST.json")
    spoken = {int(item["number"]): item["text"] for item in manifest if item.get("folder") == "5"}
    if set(spoken) != set(range(1, 51)):
        raise ValueError("Expected 50 folder-5 explanation scripts")
    explanation_track = text_tracks(draft, "ES_TEXT_250")[3]
    if len(explanation_track["segments"]) != 50:
        raise ValueError("Expected 50 explanation text slots")
    materials = text_materials(draft)
    for number, segment in enumerate(explanation_track["segments"], 1):
        material = materials[segment["material_id"]]
        set_text(material, display_wrap(spoken[number]))
        # The source Part-1 explanation card is centre aligned.  Explicitly
        # retain that invariant while the visual line breaks make long scripts
        # fit inside the existing card.
        material["alignment"] = 1
        material["line_feed"] = 1
        material["force_apply_line_max_width"] = True
        material["line_max_width"] = 0.78
        material["fixed_width"] = 1120.0
        segment["clip"]["transform"]["x"] = 0.0
        segment["clip"]["transform"]["y"] = -0.05
    return len(explanation_track["segments"])


def wrap_all_russian_text(draft: dict) -> int:
    """Put every Russian line break at a word boundary, never mid-word."""
    materials = text_materials(draft)
    changed = 0
    # Phrase translations are deliberately narrow: four short centred lines
    # read better than CapCut's automatic split inside a Russian word.
    phrase_tracks = [
        text_tracks(draft, "ES_TEXT_250")[0],
        text_tracks(draft, "P2_03_RU_PROMPTS_50")[0],
    ]
    processed: set[str] = set()
    for track in phrase_tracks:
        for segment in track["segments"]:
            material = materials[segment["material_id"]]
            raw = json.loads(material["content"]).get("text", "")
            if any("А" <= char <= "я" or char in "Ёё" for char in raw):
                set_text(material, display_wrap(raw, 28))
                processed.add(material["id"])
                changed += 1
    # Remaining Russian text is instructional/section copy.  It uses a wider
    # line but still receives explicit whole-word breaks.
    for material in materials.values():
        if material["id"] in processed:
            continue
        raw = json.loads(material["content"]).get("text", "")
        if any("А" <= char <= "я" or char in "Ёё" for char in raw):
            set_text(material, display_wrap(raw, 36))
            changed += 1
    return changed


def copy_presentation(source_segment: dict, source_material: dict, target_segment: dict, target_material: dict) -> None:
    """Copy only presentation, retaining target words and material identity."""
    target_text = json.loads(target_material["content"]).get("text", "")
    source_content = json.loads(source_material["content"])
    preserved_id = target_material["id"]
    replacement = copy.deepcopy(source_material)
    replacement["id"] = preserved_id
    set_text(replacement, target_text, styles=source_content.get("styles", []))
    target_material.clear()
    target_material.update(replacement)
    target_segment["clip"] = copy.deepcopy(source_segment["clip"])


def standardize_p2_p3(draft: dict) -> int:
    materials = text_materials(draft)
    part1 = text_tracks(draft, "ES_TEXT_250")
    source_ru, source_ipa, source_de = (part1[0]["segments"][0], part1[1]["segments"][0], part1[2]["segments"][0])
    source_pairs = [(source_ru, materials[source_ru["material_id"]]), (source_ipa, materials[source_ipa["material_id"]]), (source_de, materials[source_de["material_id"]])]
    targets = [
        ("P2_03_RU_PROMPTS_50", source_pairs[0]),
        ("P2_04_IPA_ANSWERS_50", source_pairs[1]),
        ("P2_05_ES_ANSWERS_50", source_pairs[2]),
        ("P3_03_IPA_ANSWERS_50", source_pairs[1]),
        ("P3_04_ES_ANSWERS_50", source_pairs[2]),
    ]
    changed = 0
    for name, (source_segment, source_material) in targets:
        target_track = text_tracks(draft, name)[0]
        for target_segment in target_track["segments"]:
            copy_presentation(source_segment, source_material, target_segment, materials[target_segment["material_id"]])
            changed += 1
    return changed


def move_image_fades_to_end(draft: dict) -> int:
    changed = 0
    for track in draft["tracks"]:
        if track["name"] not in VISUAL_TRACKS:
            continue
        for segment in track["segments"]:
            alpha_keyframes = [frame for frame in segment.get("common_keyframes", []) if frame.get("property_type") == "KFTypeGlobalAlpha"]
            for alpha in alpha_keyframes:
                keyframes = alpha.get("keyframe_list", [])
                if len(keyframes) < 4:
                    continue
                duration = segment["target_timerange"]["duration"]
                fade = min(500_000, max(1, duration // 3))
                # Preserve the existing fade-in (first two frames) and move
                # the existing fade-out pair from its stale old duration to
                # this clip's actual end.
                keyframes[-2]["time_offset"] = duration - fade
                keyframes[-2]["values"] = [1.0]
                keyframes[-1]["time_offset"] = duration
                keyframes[-1]["values"] = [0.0]
                changed += 1
    return changed


def add_final_replay_fadeouts(draft: dict) -> int:
    """Add a native alpha fade-out to the existing post-explanation phrase."""
    replay_track = text_tracks(draft, "ES_TEXT_250")[4]
    for segment in replay_track["segments"]:
        duration = segment["target_timerange"]["duration"]
        fade = min(500_000, max(1, duration // 3))
        segment["common_keyframes"].append({
            "id": str(uuid.uuid4()).upper(),
            "material_id": "",
            "property_type": "KFTypeGlobalAlpha",
            "keyframe_list": [
                {"id": str(uuid.uuid4()).upper(), "curveType": "Line", "time_offset": 0, "left_control": {"x": 0.0, "y": 0.0}, "right_control": {"x": 0.0, "y": 0.0}, "values": [1.0], "string_value": "", "graphID": ""},
                {"id": str(uuid.uuid4()).upper(), "curveType": "Line", "time_offset": duration - fade, "left_control": {"x": 0.0, "y": 0.0}, "right_control": {"x": 0.0, "y": 0.0}, "values": [1.0], "string_value": "", "graphID": ""},
                {"id": str(uuid.uuid4()).upper(), "curveType": "Line", "time_offset": duration, "left_control": {"x": 0.0, "y": 0.0}, "right_control": {"x": 0.0, "y": 0.0}, "values": [0.0], "string_value": "", "graphID": ""},
            ],
        })
    return len(replay_track["segments"])


def assert_layout(before: dict, after: dict) -> None:
    assert len(before["tracks"]) == len(after["tracks"])
    for old_track, new_track in zip(before["tracks"], after["tracks"]):
        assert (old_track["id"], old_track["name"], old_track["type"]) == (new_track["id"], new_track["name"], new_track["type"])
        assert len(old_track["segments"]) == len(new_track["segments"])
        assert [item["id"] for item in old_track["segments"]] == [item["id"] for item in new_track["segments"]]
        assert [item["material_id"] for item in old_track["segments"]] == [item["material_id"] for item in new_track["segments"]]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--de-root", type=Path, required=True)
    args = parser.parse_args()
    if args.destination.exists():
        raise SystemExit(f"Refusing to overwrite: {args.destination}")
    source = args.source.resolve()
    draft = read(source / "draft_content.json")
    before = copy.deepcopy(draft)
    report = {
        "explanation_texts_from_audio_manifest": apply_explanations(draft, args.de_root.resolve()),
        "russian_text_materials_wrapped_at_word_boundaries": wrap_all_russian_text(draft),
        "p2_p3_text_slots_standardized_from_part1": standardize_p2_p3(draft),
        "visual_fadeouts_moved_to_clip_end": move_image_fades_to_end(draft),
        "post_explanation_replay_fadeouts_added": add_final_replay_fadeouts(draft),
        "new_segments_created": 0,
        "timing_changes": 0,
    }
    assert_layout(before, draft)
    shutil.copytree(source, args.destination)
    for relative in (Path("draft_content.json"), Path("Timelines") / draft["id"] / "draft_content.json", Path("Timelines") / draft["id"] / "draft_content.json.bak", Path("Timelines") / draft["id"] / "template-2.tmp"):
        write(args.destination / relative, draft)
    (args.destination / "TEXT_VISUAL_POLISH_REPORT.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=True))


if __name__ == "__main__":
    main()
