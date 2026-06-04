#!/usr/bin/env python3
"""Build enhanced CHAINS episode 1 from the user's current edited draft."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any


SOURCE_DRAFT = "CHAINS_EP01_EN_OPENAI_DIRECT_BG 20260601_214833"
VENGA_CTA_SOURCE = "VENGA_ES_200_0601_LANGFIX_FINAL 20260601_162739"
TARGET_BASE = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE"
PACK = Path("exports/chains/episode1")
ASSETS = PACK / "enhancements"
US = 1_000_000
EXPLAIN_DUR = int(10.5 * US)
CTA_DUR = int(11.22 * US)


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def capcut_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def unique_target(root: Path) -> Path:
    base = root / f"{TARGET_BASE} {time.strftime('%Y%m%d_%H%M%S')}"
    if not base.exists():
        return base
    return root / f"{TARGET_BASE} {time.strftime('%Y%m%d_%H%M%S')}_{capcut_id()[:6]}"


def probe_duration_us(path: Path) -> int:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    return int(round(float(completed.stdout.strip()) * US))


def capcut_text(material: dict[str, Any]) -> str:
    try:
        return str(json.loads(material.get("content") or "{}").get("text") or material.get("base_content") or "")
    except Exception:
        return str(material.get("base_content") or "")


def set_text(material: dict[str, Any], text: str) -> None:
    try:
        content = json.loads(material.get("content") or "{}")
    except Exception:
        content = {}
    content["text"] = text
    for style in content.get("styles", []) or []:
        style["range"] = [0, len(text)]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    if material.get("base_content"):
        material["base_content"] = text


def wrap_ordered(text: str, max_chars: int, max_lines: int = 3) -> str:
    words = text.split()
    if len(text) <= max_chars or len(words) <= 1:
        return text
    lines: list[str] = []
    cur = ""
    for word in words:
        cand = word if not cur else f"{cur} {word}"
        if len(cand) <= max_chars or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    if len(lines) <= max_lines:
        return "\n".join(lines)
    return "\n".join(lines[: max_lines - 1] + [" ".join(" ".join(lines[max_lines - 1:]).split())])


def clone_material(material: dict[str, Any], new_id: bool = True) -> dict[str, Any]:
    out = deepcopy(material)
    if new_id:
        out["id"] = capcut_id()
        if "unique_id" in out:
            out["unique_id"] = capcut_id()
    return out


def clone_text_segment(template_segment: dict[str, Any], material_id: str, start: int, duration: int) -> dict[str, Any]:
    seg = deepcopy(template_segment)
    seg["id"] = capcut_id()
    seg["material_id"] = material_id
    seg["target_timerange"] = {"start": start, "duration": duration}
    seg["source_timerange"] = None
    seg["keyframe_refs"] = []
    seg["visible"] = True
    return seg


def clone_av_segment(template_segment: dict[str, Any], material_id: str, start: int, duration: int) -> dict[str, Any]:
    seg = deepcopy(template_segment)
    seg["id"] = capcut_id()
    seg["material_id"] = material_id
    seg["target_timerange"] = {"start": start, "duration": duration}
    seg["source_timerange"] = {"start": 0, "duration": duration}
    seg["extra_material_refs"] = list(seg.get("extra_material_refs") or [])
    seg["keyframe_refs"] = []
    seg["visible"] = True
    return seg


def insertion_events(draft: dict[str, Any]) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    # First half: track 6 English top line. Second half: track 3 top line.
    for half, track_index in [("first", 6), ("second", 3)]:
        for chain in range(1, 26):
            idx = chain * 4 - 1
            seg = draft["tracks"][track_index]["segments"][idx]
            end = int(seg["target_timerange"]["start"]) + int(seg["target_timerange"]["duration"])
            events.append({"time": end, "duration": EXPLAIN_DUR, "kind": "explain", "chain": chain, "half": half, "order": 0})
            if (half, chain) in {("first", 8), ("first", 16), ("second", 8)}:
                events.append({"time": end, "duration": CTA_DUR, "kind": "cta", "chain": chain, "half": half, "order": 1})
    return sorted(events, key=lambda item: (item["time"], item["order"]))


def shifted_time(original: int, events: list[dict[str, Any]]) -> int:
    return original + sum(int(e["duration"]) for e in events if int(e["time"]) <= original)


def shift_segment(seg: dict[str, Any], events: list[dict[str, Any]]) -> None:
    tr = seg.get("target_timerange")
    if not tr:
        return
    start = int(tr["start"])
    duration = int(tr["duration"])
    end = start + duration
    shift = 0
    extend = 0
    for event in events:
        t = int(event["time"])
        d = int(event["duration"])
        if start >= t:
            shift += d
        elif start < t < end:
            extend += d
    tr["start"] = start + shift
    tr["duration"] = duration + extend


def shift_draft(draft: dict[str, Any], events: list[dict[str, Any]]) -> None:
    total = sum(int(e["duration"]) for e in events)
    draft["duration"] = int(draft["duration"]) + total
    for track in draft.get("tracks", []):
        for seg in track.get("segments", []):
            shift_segment(seg, events)
    for dm in draft.get("materials", {}).get("drafts", []):
        nested = dm.get("draft")
        if not nested:
            continue
        nested_duration = int(dm.get("duration") or nested.get("duration") or 0)
        # Long compound timelines carry the lesson body; shift them with the root.
        # Short intro compounds stay self-contained.
        if nested_duration > 1_000_000_000:
            nested["duration"] = int(nested.get("duration") or nested_duration) + total
            dm["duration"] = nested_duration + total
            for track in nested.get("tracks", []):
                for seg in track.get("segments", []):
                    shift_segment(seg, events)


def add_audio_material(draft: dict[str, Any], template: dict[str, Any], path: Path, duration: int) -> str:
    mat = clone_material(template)
    mat["path"] = str(path)
    mat["duration"] = duration
    mat["name"] = path.name
    mat["material_name"] = path.name
    draft["materials"]["audios"].append(mat)
    return mat["id"]


def add_video_material(draft: dict[str, Any], template: dict[str, Any], path: Path, duration: int) -> str:
    mat = clone_material(template)
    mat["path"] = str(path)
    mat["duration"] = duration
    mat["name"] = path.name
    mat["material_name"] = path.name
    mat["width"] = 1920
    mat["height"] = 1080
    mat["has_audio"] = False
    draft["materials"]["videos"].append(mat)
    return mat["id"]


def local_copy(src: Path, dst_dir: Path) -> Path:
    dst_dir.mkdir(parents=True, exist_ok=True)
    if src.exists() and src.is_dir():
        return src
    dst = dst_dir / src.name
    if src.exists() and src.is_file() and not dst.exists():
        shutil.copy2(src, dst)
    return dst


def patch_service_sections(draft: dict[str, Any], target_dir: Path) -> None:
    service = load_json(ASSETS / "service_voiceovers_11labs.json")
    intro_video = local_copy(ASSETS / "intro-montage" / "chains_intro_premium_montage_41s10.mp4", target_dir / "Resources" / "chains_enhanced_service")
    intro_audio = local_copy(Path(service["intro"]["audio"]), target_dir / "Resources" / "chains_enhanced_service")
    middle_audio = local_copy(Path(service["middle"]["audio"]), target_dir / "Resources" / "chains_enhanced_service")
    outro_audio = local_copy(Path(service["outro"]["audio"]), target_dir / "Resources" / "chains_enhanced_service")

    nested_main = draft["materials"]["drafts"][0]["draft"]
    nested_intro = draft["materials"]["drafts"][1]["draft"]

    # New intro montage, text and narration.
    intro_videos = nested_intro["materials"]["videos"]
    video_template = intro_videos[0]
    intro_mat = clone_material(video_template)
    intro_mat.update({"path": str(intro_video), "duration": int(41.1 * US), "name": intro_video.name, "material_name": intro_video.name, "width": 1920, "height": 1080})
    intro_videos.append(intro_mat)
    seg_template = deepcopy(nested_intro["tracks"][6]["segments"][0])
    nested_intro["tracks"][6]["segments"] = [clone_av_segment(seg_template, intro_mat["id"], 0, int(41.1 * US))]
    intro_audios = {a["id"]: a for a in nested_intro["materials"]["audios"]}
    a_seg = nested_intro["tracks"][7]["segments"][0]
    a_mat = intro_audios[a_seg["material_id"]]
    a_mat.update({"path": str(intro_audio), "duration": int(41.1 * US), "name": intro_audio.name, "material_name": intro_audio.name})
    a_seg["target_timerange"] = {"start": 0, "duration": int(41.1 * US)}
    a_seg["source_timerange"] = {"start": 0, "duration": int(41.1 * US)}
    intro_texts = {t["id"]: t for t in nested_intro["materials"]["texts"]}
    intro_lines = [
        ("АНГЛИЙСКИЙ МЕТОДОМ\nЦЕПОЧЕК", 0, 13.5),
        ("ФРАЗА РАСТЕТ\nШАГ ЗА ШАГОМ", 13.5, 13.8),
        ("СМОТРИ, СЛУШАЙ\nИ ПОВТОРЯЙ", 27.3, 13.8),
    ]
    for seg, (text, start, dur) in zip(nested_intro["tracks"][1]["segments"], intro_lines, strict=False):
        set_text(intro_texts[seg["material_id"]], text)
        seg["target_timerange"] = {"start": int(start * US), "duration": int(dur * US)}

    # Middle reverse-order announcement.
    main_texts = {t["id"]: t for t in nested_main["materials"]["texts"]}
    set_text(main_texts[nested_main["tracks"][3]["segments"][0]["material_id"]], "ДАЛЬШЕ:\nСНАЧАЛА РУССКИЙ\nПОТОМ АНГЛИЙСКИЙ")
    main_audios = {a["id"]: a for a in nested_main["materials"]["audios"]}
    mid_seg = nested_main["tracks"][6]["segments"][0]
    mid_mat = main_audios[mid_seg["material_id"]]
    mid_dur = probe_duration_us(middle_audio)
    mid_mat.update({"path": str(middle_audio), "duration": mid_dur, "name": middle_audio.name, "material_name": middle_audio.name})
    mid_seg["target_timerange"]["duration"] = mid_dur
    mid_seg["source_timerange"] = {"start": 0, "duration": mid_dur}

    # Outro narration replacement.
    out_seg = nested_main["tracks"][10]["segments"][0]
    out_mat = main_audios[out_seg["material_id"]]
    out_dur = probe_duration_us(outro_audio)
    out_mat.update({"path": str(outro_audio), "duration": out_dur, "name": outro_audio.name, "material_name": outro_audio.name})
    out_seg["target_timerange"]["duration"] = out_dur
    out_seg["source_timerange"] = {"start": 0, "duration": out_dur}


def add_explanations(draft: dict[str, Any], target_dir: Path, events: list[dict[str, Any]]) -> None:
    explanations = load_json(ASSETS / "construction_explanations.json")["items"]
    screen = local_copy(ASSETS / "screensaver" / "construction_screensaver_10s50.mp4", target_dir / "Resources" / "chains_enhanced_explanations")
    video_template = draft["materials"]["videos"][0]
    audio_template = draft["materials"]["audios"][0]
    text_template_seg = draft["tracks"][4]["segments"][0]
    text_template_mat = next(t for t in draft["materials"]["texts"] if t["id"] == text_template_seg["material_id"])
    bg_track = draft["tracks"][0]
    text_track = {"type": "text", "segments": []}
    audio_track = {"type": "audio", "segments": []}
    screen_mat_id = add_video_material(draft, video_template, screen, EXPLAIN_DUR)
    for event in events:
        if event["kind"] != "explain":
            continue
        start = shifted_time(int(event["time"]), [e for e in events if e is not event and (e["time"], e["order"]) < (event["time"], event["order"])])
        chain = int(event["chain"])
        item = explanations[chain - 1]
        bg_track["segments"].append(clone_av_segment(bg_track["segments"][0], screen_mat_id, start, EXPLAIN_DUR))
        text_mat = clone_material(text_template_mat)
        set_text(text_mat, "КАК ЭТО РАБОТАЕТ\n" + wrap_ordered(str(item["text"]), 46, 3))
        draft["materials"]["texts"].append(text_mat)
        text_track["segments"].append(clone_text_segment(text_template_seg, text_mat["id"], start + int(0.35 * US), EXPLAIN_DUR - int(0.7 * US)))
        audio_src = local_copy(Path(item["audio"]), target_dir / "Resources" / "chains_enhanced_explanations")
        audio_id = add_audio_material(draft, audio_template, audio_src, EXPLAIN_DUR)
        audio_track["segments"].append(clone_av_segment(draft["tracks"][8]["segments"][0], audio_id, start, EXPLAIN_DUR))
    draft["tracks"].append(text_track)
    draft["tracks"].append(audio_track)


def copy_cta_materials_and_segments(draft: dict[str, Any], target_dir: Path, events: list[dict[str, Any]]) -> int:
    root = capcut_root()
    src = load_json(root / VENGA_CTA_SOURCE / "draft_content.json")
    nested = src["materials"]["drafts"][6]["draft"]
    src_materials = nested["materials"]
    src_windows = [(589.92, 602.0), (1130.67, 1142.2), (2222.53, 2234.2)]
    cta_events = [e for e in events if e["kind"] == "cta"]
    material_ids_present = {m.get("id") for mats in draft["materials"].values() if isinstance(mats, list) for m in mats if isinstance(m, dict)}
    category_by_id: dict[str, str] = {}
    material_by_id: dict[str, dict[str, Any]] = {}
    for category, mats in src_materials.items():
        if not isinstance(mats, list):
            continue
        for mat in mats:
            if isinstance(mat, dict) and mat.get("id"):
                category_by_id[mat["id"]] = category
                material_by_id[mat["id"]] = mat

    def ensure_material(mid: str) -> None:
        if not mid or mid in material_ids_present or mid not in material_by_id:
            return
        category = category_by_id[mid]
        mat = deepcopy(material_by_id[mid])
        # Localize direct media paths.
        if mat.get("path"):
            p = Path(str(mat["path"]))
            if p.exists():
                dst = local_copy(p, target_dir / "Resources" / "chains_enhanced_cta_assets")
                mat["path"] = str(dst)
                mat["name"] = dst.name
                mat["material_name"] = dst.name
            else:
                fallback = root / VENGA_CTA_SOURCE / "Resources" / "venga_template_sfx" / p.name
                if fallback.exists():
                    dst = local_copy(fallback, target_dir / "Resources" / "chains_enhanced_cta_assets")
                    mat["path"] = str(dst)
                    mat["name"] = dst.name
                    mat["material_name"] = dst.name
        # Localize nested draft media paths when copying compound icons.
        if mat.get("draft"):
            for group in ["videos", "audios"]:
                for nested_mat in mat["draft"].get("materials", {}).get(group, []):
                    if nested_mat.get("path") and Path(str(nested_mat["path"])).exists():
                        dst = local_copy(Path(str(nested_mat["path"])), target_dir / "Resources" / "chains_enhanced_cta_assets")
                        nested_mat["path"] = str(dst)
                        nested_mat["name"] = dst.name
                        nested_mat["material_name"] = dst.name
        draft["materials"].setdefault(category, []).append(mat)
        material_ids_present.add(mid)

    track_map: dict[tuple[int, str], dict[str, Any]] = {}
    copied = 0
    for group_index, ((win_start, win_end), event) in enumerate(zip(src_windows, cta_events, strict=True), start=1):
        event_start = shifted_time(int(event["time"]), [e for e in events if (e["time"], e["order"]) < (event["time"], event["order"])])
        for ti in [7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 22, 23, 24]:
            if ti >= len(nested.get("tracks", [])):
                continue
            src_track = nested["tracks"][ti]
            key = (ti, src_track["type"])
            if key not in track_map:
                track_map[key] = {"type": src_track["type"], "segments": []}
                draft["tracks"].append(track_map[key])
            for seg in src_track.get("segments", []):
                start_sec = seg["target_timerange"]["start"] / US
                end_sec = start_sec + seg["target_timerange"]["duration"] / US
                if end_sec < win_start or start_sec > win_end:
                    continue
                new_seg = deepcopy(seg)
                new_seg["id"] = capcut_id()
                new_seg["target_timerange"]["start"] = event_start + int((start_sec - win_start) * US)
                new_seg["material_id"] = seg.get("material_id")
                ensure_material(seg.get("material_id"))
                for ref in list(seg.get("extra_material_refs") or []):
                    ensure_material(ref)
                track_map[key]["segments"].append(new_seg)
                copied += 1
    return copied


def reverse_second_half(draft: dict[str, Any], target_dir: Path) -> None:
    rows = load_json(PACK / "phrase_rows.json")
    texts = {t["id"]: t for t in draft["materials"]["texts"]}
    audio_mats = {a["id"]: a for a in draft["materials"]["audios"]}
    # Replace second-half top text with Russian.
    for i, row in enumerate(rows):
        top_seg = draft["tracks"][3]["segments"][i]
        set_text(texts[top_seg["material_id"]], wrap_ordered(str(row["russian"]).rstrip(".").upper(), 26, 2))
        ipa_seg = draft["tracks"][2]["segments"][i]
        english_audio_start = int(draft["tracks"][12]["segments"][i]["target_timerange"]["start"])
        phrase_end = int(top_seg["target_timerange"]["start"]) + int(top_seg["target_timerange"]["duration"])
        ipa_seg["target_timerange"]["start"] = english_audio_start
        ipa_seg["target_timerange"]["duration"] = max(1, phrase_end - english_audio_start)
        # Reuse track 11 as Russian audio in second half.
        ru_file = next((target_dir / "Resources" / "chains_ep01_openai_audio").glob(f"ru_{i+1:03d}.wav"))
        ru_dur = probe_duration_us(ru_file)
        ru_seg = draft["tracks"][11]["segments"][i]
        ru_mat = audio_mats[ru_seg["material_id"]]
        ru_mat.update({"path": str(ru_file), "duration": ru_dur, "name": ru_file.name, "material_name": ru_file.name})
        ru_seg["source_timerange"] = {"start": 0, "duration": ru_dur}
        ru_seg["target_timerange"]["duration"] = ru_dur
    # Add English translation in the old Russian visual position for second half.
    track4 = draft["tracks"][4]
    template_seg = track4["segments"][0]
    template_mat = texts[template_seg["material_id"]]
    for i, row in enumerate(rows):
        top_seg = draft["tracks"][3]["segments"][i]
        start = int(draft["tracks"][12]["segments"][i]["target_timerange"]["start"])
        phrase_end = int(top_seg["target_timerange"]["start"]) + int(top_seg["target_timerange"]["duration"])
        mat = clone_material(template_mat)
        set_text(mat, wrap_ordered(str(row["english"]).rstrip(".?!").upper(), 28, 2))
        draft["materials"]["texts"].append(mat)
        track4["segments"].append(clone_text_segment(template_seg, mat["id"], start, max(1, phrase_end - start)))
    track4["segments"].sort(key=lambda s: s["target_timerange"]["start"])


def update_identity(draft_dir: Path, draft: dict[str, Any]) -> None:
    now = int(time.time() * US)
    project_id = capcut_id()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    size = sum(p.stat().st_size for p in (draft_dir / "Resources").rglob("*") if p.is_file())
    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    meta.update({"draft_id": project_id, "draft_name": draft_dir.name, "draft_fold_path": draft_dir.as_posix(), "draft_root_path": draft_dir.parent.as_posix(), "tm_duration": draft["duration"], "tm_draft_modified": now, "tm_draft_removed": 0, "draft_is_invisible": False, "draft_timeline_materials_size": size, "draft_timeline_materials_size_": size})
    write_json(meta_path, meta)
    root_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_path)
    entry = {"cloud_draft_cover": False, "cloud_draft_sync": False, "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(), "draft_fold_path": draft_dir.as_posix(), "draft_id": project_id, "draft_is_cloud_temp_draft": False, "draft_is_invisible": False, "draft_json_file": (draft_dir / "draft_content.json").as_posix(), "draft_name": draft_dir.name, "draft_new_version": meta.get("draft_new_version") or "164.0.0", "draft_root_path": draft_dir.parent.as_posix(), "draft_timeline_materials_size": size, "draft_timeline_materials_size_": size, "draft_type": "", "streaming_edit_draft_ready": True, "tm_draft_create": now, "tm_draft_modified": now, "tm_draft_removed": 0, "tm_duration": draft["duration"]}
    root["all_draft_store"] = [entry, *[item for item in root.get("all_draft_store", []) if item.get("draft_name") != draft_dir.name]]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_json(root_path, root)


def main() -> int:
    root = capcut_root()
    source = root / SOURCE_DRAFT
    target = unique_target(root)
    shutil.copytree(source, target)
    if (target / ".locked").exists():
        (target / ".locked").unlink()
    draft = load_json(target / "draft_content.json")
    events = insertion_events(draft)
    shift_draft(draft, events)
    patch_service_sections(draft, target)
    reverse_second_half(draft, target)
    add_explanations(draft, target, events)
    cta_segments = copy_cta_materials_and_segments(draft, target, events)
    draft["tracks"][0]["segments"].sort(key=lambda s: s["target_timerange"]["start"])
    for path in [target / "draft_content.json", target / "template-2.tmp"]:
        if path.exists() or path.name == "draft_content.json":
            write_json(path, draft)
    update_identity(target, draft)
    report = {"draft_name": target.name, "draft_dir": str(target), "source": str(source), "duration_us": draft["duration"], "insertions": len(events), "explanations": sum(1 for e in events if e["kind"] == "explain"), "cta_insertions": sum(1 for e in events if e["kind"] == "cta"), "cta_segments_copied": cta_segments, "tracks": [(i, t.get("type"), len(t.get("segments", []))) for i, t in enumerate(draft.get("tracks", []))]}
    write_pretty(PACK / "enhanced_capcut_build_report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
