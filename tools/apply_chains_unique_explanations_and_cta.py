from __future__ import annotations

import copy
import json
import shutil
import subprocess
import uuid
from pathlib import Path


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
CONTENT_PATH = DRAFT_DIR / "draft_content.json"
META_PATH = DRAFT_DIR / "draft_meta_info.json"
TMP_PATH = DRAFT_DIR / "template-2.tmp"
UNIQUE_DIR = Path("exports/chains/episode1/unique_explanations_approved")
SCREENSAVER = UNIQUE_DIR / "screensaver_loop/chains_explain_screensaver_loop_60s.mp4"
SOURCE_CTA_DRAFT = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/VENGA_ES_200_0601_LANGFIX_FINAL 20260601_162739/draft_content.json"

US = 1_000_000


def gid() -> str:
    return str(uuid.uuid4()).upper()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def capcut_is_open() -> bool:
    ps = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process | Where-Object { $_.ProcessName -match 'CapCut|VECreator|lv' } | Select-Object -First 1 -ExpandProperty ProcessName"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return bool(ps.stdout.strip())


def backup() -> Path:
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-unique-explanations"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(DRAFT_DIR, out)
    return out


def ensure_screensaver() -> None:
    SCREENSAVER.parent.mkdir(parents=True, exist_ok=True)
    if SCREENSAVER.exists() and SCREENSAVER.stat().st_size > 200 * 1024:
        return
    # A calm loop-style screensaver: abstract low-motion light field, not a person typing.
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i",
            "color=c=0b1018:s=1920x1080:r=24:d=20",
            "-vf",
            "drawbox=x='mod(t*34,2200)-220':y=160:w=360:h=760:color=24445a@0.22:t=fill,"
            "drawbox=x='1920-mod(t*28,2300)':y=110:w=280:h=850:color=184d60@0.18:t=fill,"
            "drawbox=x=0:y=238:w=1920:h=3:color=ffc400@0.35:t=fill,"
            "drawbox=x=0:y=782:w=1920:h=3:color=ffc400@0.28:t=fill,"
            "drawbox=x='mod(t*42,2100)-180':y=510:w=260:h=5:color=ffc400@0.20:t=fill,"
            "vignette=angle=PI/5:eval=frame,format=yuv420p",
            "-an", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "24",
            str(SCREENSAVER),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def material_by_id(materials: dict, mid: str):
    for coll, arr in materials.items():
        if isinstance(arr, list):
            for item in arr:
                if isinstance(item, dict) and item.get("id") == mid:
                    return coll, item
    return None, None


def clone_material(target: dict, source_materials: dict, old_id: str, id_map: dict[str, str]) -> str:
    if not old_id:
        return old_id
    if old_id in id_map:
        return id_map[old_id]
    coll, mat = material_by_id(source_materials, old_id)
    if mat is None or coll is None:
        return old_id
    new = copy.deepcopy(mat)
    new_id = gid()
    id_map[old_id] = new_id
    new["id"] = new_id
    if "unique_id" in new:
        new["unique_id"] = gid()
    target["materials"].setdefault(coll, []).append(new)
    return new_id


def clone_segment_with_materials(target: dict, source_materials: dict, segment: dict, id_map: dict[str, str]) -> dict:
    s = copy.deepcopy(segment)
    s["id"] = gid()
    if s.get("material_id"):
        s["material_id"] = clone_material(target, source_materials, s["material_id"], id_map)
    if s.get("extra_material_refs"):
        s["extra_material_refs"] = [clone_material(target, source_materials, x, id_map) for x in s["extra_material_refs"]]
    s["visible"] = True
    return s


def text_material_from_template(template: dict, text: str) -> dict:
    mat = copy.deepcopy(template)
    mat["id"] = gid()
    mat["base_content"] = text
    content = json.loads(mat["content"])
    content["text"] = text
    for style in content.get("styles", []):
        style["range"] = [0, len(text)]
        style["fill"]["content"]["solid"]["color"] = [1, 1, 1]
        style["size"] = 6.2
    mat["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    mat["font_size"] = 6.2
    mat["text_size"] = 26
    mat["background_alpha"] = 0.0
    return mat


def clone_track(template: dict, name: str, segments: list[dict]) -> dict:
    t = copy.deepcopy(template)
    t["id"] = gid()
    t["name"] = name
    t["is_default_name"] = False
    t["segments"] = segments
    return t


def make_video_material(template: dict, path: Path, duration: int) -> dict:
    mat = copy.deepcopy(template)
    mat["id"] = gid()
    mat["unique_id"] = gid()
    mat["type"] = "video"
    mat["duration"] = duration
    mat["path"] = str(path)
    mat["material_name"] = path.name
    mat["name"] = path.name
    mat["width"] = 1920
    mat["height"] = 1080
    mat["has_audio"] = False
    if isinstance(mat.get("video_algorithm"), dict):
        mat["video_algorithm"]["algorithms"] = []
    return mat


def make_audio_material(template: dict, path: Path, duration: int) -> dict:
    mat = copy.deepcopy(template)
    mat["id"] = gid()
    mat["unique_id"] = ""
    mat["duration"] = duration
    mat["path"] = str(path)
    mat["name"] = path.name
    mat["type"] = "extract_music"
    mat["wave_points"] = []
    return mat


def apply_unique_explanations(draft: dict) -> dict:
    timed = read_json(UNIQUE_DIR / "timed_explanations.json")
    old_bg = next(t for t in draft["tracks"] if t.get("name") == "CODEx construction explanation BG")
    old_vo = next(t for t in draft["tracks"] if t.get("name") == "CODEx construction explanation VO")
    old_text = next(t for t in draft["tracks"] if t.get("name") == "CODEx construction explanation TEXT")
    windows = [copy.deepcopy(s["target_timerange"]) for s in old_bg["segments"]]

    draft["tracks"] = [t for t in draft["tracks"] if not str(t.get("name", "")).startswith("CODEx construction explanation")]

    video_template_track = old_bg
    audio_template_track = old_vo
    text_template_track = old_text
    video_template_seg = old_bg["segments"][0]
    audio_template_seg = old_vo["segments"][0]
    text_template_seg = old_text["segments"][0]

    video_template_mat = next(m for m in draft["materials"]["videos"] if m["id"] == video_template_seg["material_id"])
    audio_template_mat = next(m for m in draft["materials"]["audios"] if m["id"] == audio_template_seg["material_id"])
    text_template_mat = next(m for m in draft["materials"]["texts"] if m["id"] == text_template_seg["material_id"])

    screen_mat = make_video_material(video_template_mat, DRAFT_DIR / "Resources/chains_unique_explanations/screensaver_loop.mp4", 20_000_000)
    target_res = Path(screen_mat["path"])
    target_res.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SCREENSAVER, target_res)
    draft["materials"]["videos"].append(screen_mat)

    bg_segments: list[dict] = []
    audio_segments: list[dict] = []
    text_segments: list[dict] = []
    for i, item in enumerate(timed):
        window = windows[i]
        w_start = int(window["start"])
        w_dur = int(window["duration"])

        bg = copy.deepcopy(video_template_seg)
        bg["id"] = gid()
        bg["material_id"] = screen_mat["id"]
        bg["source_timerange"] = {"start": 0, "duration": min(20_000_000, w_dur)}
        bg["target_timerange"] = {"start": w_start, "duration": w_dur}
        bg["is_loop"] = True
        bg["visible"] = True
        bg_segments.append(bg)

        src_audio = Path(item["audio_path"])
        dst_audio = DRAFT_DIR / "Resources/chains_unique_explanations" / src_audio.name
        dst_audio.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_audio, dst_audio)
        audio_dur = int(float(item["duration_sec"]) * US)
        audio_mat = make_audio_material(audio_template_mat, dst_audio, audio_dur)
        draft["materials"]["audios"].append(audio_mat)
        au = copy.deepcopy(audio_template_seg)
        au["id"] = gid()
        au["material_id"] = audio_mat["id"]
        au["source_timerange"] = {"start": 0, "duration": audio_dur}
        au["target_timerange"] = {"start": w_start + 150_000, "duration": min(audio_dur, w_dur - 300_000)}
        au["visible"] = True
        au["volume"] = 1.0
        au["last_nonzero_volume"] = 1.0
        audio_segments.append(au)

        for block in item["timed_blocks"]:
            start = w_start + int(float(block["start_sec"]) * US)
            end = w_start + int(float(block["end_sec"]) * US)
            start = max(w_start + 120_000, min(start, w_start + w_dur - 500_000))
            end = min(max(end, start + 700_000), w_start + w_dur - 180_000)
            text_mat = text_material_from_template(text_template_mat, str(block["text"]).upper())
            draft["materials"]["texts"].append(text_mat)
            ts = copy.deepcopy(text_template_seg)
            ts["id"] = gid()
            ts["material_id"] = text_mat["id"]
            ts["source_timerange"] = None
            ts["target_timerange"] = {"start": start, "duration": end - start}
            ts["visible"] = True
            ts["clip"]["transform"] = {"x": 0.0, "y": 0.04}
            ts["clip"]["scale"] = {"x": 1.0, "y": 1.0}
            text_segments.append(ts)

    draft["tracks"].append(clone_track(video_template_track, "CODEx construction explanation SCREENSAVER", bg_segments))
    draft["tracks"].append(clone_track(audio_template_track, "CODEx construction explanation UNIQUE VO", audio_segments))
    draft["tracks"].append(clone_track(text_template_track, "CODEx construction explanation TIMED TEXT", text_segments))
    return {"explanation_audio": len(audio_segments), "explanation_text_blocks": len(text_segments)}


def source_venga_cta_draft() -> dict:
    src = read_json(SOURCE_CTA_DRAFT)
    for mat in src["materials"]["drafts"]:
        draft = mat.get("draft", {})
        if draft.get("name") == "VENGA BEAR":
            return draft
    raise RuntimeError("VENGA BEAR source CTA compound not found")


def apply_venga_cta(draft: dict) -> dict:
    draft["tracks"] = [t for t in draft["tracks"] if not str(t.get("name", "")).startswith("CODEx CTA ")]
    source = source_venga_cta_draft()
    source_tracks = [source["tracks"][i] for i in [7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 22, 23, 24]]
    all_segments = []
    for t in source_tracks:
        for s in t.get("segments", []):
            all_segments.append(s["target_timerange"]["start"])
    clusters = [
        [x for x in all_segments if 580_000_000 <= x <= 610_000_000],
        [x for x in all_segments if 1_120_000_000 <= x <= 1_150_000_000],
        [x for x in all_segments if 2_210_000_000 <= x <= 2_235_000_000],
    ]
    src_bases = [min(c) for c in clusters if c]
    dst_bases = [994_271_564, 1_951_754_148, 3_978_130_315]
    id_map: dict[str, str] = {}
    added_tracks = 0

    replacements = [
        "ЭТИ ФРАЗЫ МОЖНО СЛУШАТЬ НА ФОНЕ,\nА МОЖНО НАЧАТЬ ИСПОЛЬЗОВАТЬ.",
        "МЫ СОЗДАЛИ PHRASEMAN,\nЧТОБЫ ТЫ РЕАЛЬНО ГОВОРИЛ ПО-АНГЛИЙСКИ.",
        "СКАЧАЙ PHRASEMAN\nИ ТРЕНИРУЙ ЦЕПОЧКИ КАЖДЫЙ ДЕНЬ.",
    ]
    replacement_index = 0

    for t in source_tracks:
        new_segments: list[dict] = []
        for s in t.get("segments", []):
            start = s["target_timerange"]["start"]
            group = next((i for i, base in enumerate(src_bases) if base <= start <= base + 35_000_000), None)
            if group is None:
                continue
            ns = clone_segment_with_materials(draft, source["materials"], s, id_map)
            rel = start - src_bases[group]
            ns["target_timerange"]["start"] = dst_bases[group] + rel
            ns["visible"] = True
            if t.get("type") == "text":
                mid = ns["material_id"]
                mat = next((m for m in draft["materials"]["texts"] if m["id"] == mid), None)
                if mat is not None:
                    text = replacements[min(replacement_index, len(replacements) - 1)]
                    replacement_index += 1
                    content = json.loads(mat["content"])
                    content["text"] = text
                    for style in content.get("styles", []):
                        style["range"] = [0, len(text)]
                    mat["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
                    mat["base_content"] = text
            new_segments.append(ns)
        if new_segments:
            nt = clone_track(t, "CODEx CTA VENGA SOURCE", new_segments)
            draft["tracks"].append(nt)
            added_tracks += 1
    return {"cta_tracks": added_tracks}


def validate(draft: dict) -> dict:
    errors = []
    names = {t.get("name"): len(t.get("segments", [])) for t in draft["tracks"]}
    if any(str(t.get("name", "")).startswith("CODEx CTA WHITE") for t in draft["tracks"]):
        errors.append("old self-made white CTA still present")
    if names.get("CODEx construction explanation UNIQUE VO") != 50:
        errors.append("unique explanation voice count is not 50")
    if names.get("CODEx construction explanation TIMED TEXT", 0) < 200:
        errors.append("timed text blocks below 200")
    forbidden = []
    one_letter = []
    for mat in draft["materials"].get("texts", []):
        try:
            text = json.loads(mat.get("content", "{}")).get("text", "")
        except Exception:
            text = ""
        low = text.lower()
        if "француз" in low or "french" in low:
            forbidden.append(text)
        for line in text.splitlines():
            if len(line.strip()) == 1 and any(ch.isalpha() for ch in line):
                one_letter.append(text)
    if forbidden:
        errors.append(f"forbidden French text found: {len(forbidden)}")
    if one_letter:
        errors.append(f"one-letter text line found: {len(one_letter)}")
    return {"errors": errors, "track_counts": names}


def main() -> None:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before applying draft edits.")
    ensure_screensaver()
    backup_path = backup()
    draft = read_json(CONTENT_PATH)
    a = apply_unique_explanations(draft)
    b = apply_venga_cta(draft)
    report = validate(draft)
    report.update(a)
    report.update(b)
    report["backup"] = str(backup_path)
    report["draft_dir"] = str(DRAFT_DIR)
    if report["errors"]:
        Path("exports/chains/episode1/unique_explanations_approved/apply_report_failed.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        raise SystemExit(json.dumps(report, ensure_ascii=False, indent=2))
    write_json(CONTENT_PATH, draft)
    if TMP_PATH.exists():
        write_json(TMP_PATH, draft)
    meta = read_json(META_PATH)
    meta["tm_duration"] = draft["duration"]
    write_json(META_PATH, meta)
    Path("exports/chains/episode1/unique_explanations_approved/apply_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
