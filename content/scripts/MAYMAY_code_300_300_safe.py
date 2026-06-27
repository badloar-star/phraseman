import json
import os
import re
import shutil
import subprocess
import sys


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


JSON_INPUT = "draft_content.json"
JSON_OUTPUT = "draft_content.json"
JSON_BACKUP = "draft_content_old.json"
PHRASES_FILE = "phrases.txt"
FOLDER_RU = "1"
FOLDER_EN = "2"

PACK01_CATEGORIES = [
    "ON",
    "AT",
    "FOR",
    "TO",
    "BY",
    "IN",
    "OUT",
    "UP",
    "DOWN",
    "OFF",
    "OVER",
    "WITH",
    "FROM",
    "ABOUT",
    "INTO",
]
PACK02_CATEGORIES = [
    "AWAY",
    "BACK",
    "AROUND",
    "THROUGH",
    "ACROSS",
    "AFTER",
    "BEFORE",
    "UNDER",
    "AGAINST",
    "BETWEEN",
    "WITHOUT",
    "WITHIN",
    "ALONG",
    "AHEAD",
    "ASIDE",
]
CATEGORY_PREFIX = "ФРАЗЫ\nС "
CATEGORY_FIRST_LINE = "ФРАЗЫ\n"
OLD_RU_TITLE_PREFIX = "Как хорошо"
OLD_RU_TITLE_MID = "ты знаешь"
OLD_EN_TITLE_PREFIX = "How well"


def natural_sort_key(s):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r"(\d+)", s)]


def get_audio_files(folder):
    if not os.path.exists(folder):
        print(f"[ERROR] Folder not found: {folder}")
        sys.exit(1)
    files = [f for f in os.listdir(folder) if f.lower().endswith((".mp3", ".wav", ".m4a", ".aac", ".ogg"))]
    files.sort(key=natural_sort_key)
    paths = [os.path.abspath(os.path.join(folder, f)) for f in files]
    print(f"  Folder '{folder}': found {len(paths)} audio files")
    return paths


def read_phrases(filepath):
    with open(filepath, "r", encoding="utf-8-sig") as f:
        phrases = [line.strip() for line in f.read().splitlines() if line.strip()]

    if len(phrases) != 600:
        print(f"[ERROR] phrases.txt must contain exactly 600 non-empty lines, found {len(phrases)}")
        sys.exit(1)

    ru_phrases = phrases[:300]
    en_phrases = phrases[300:600]
    print(f"  RU phrases: {len(ru_phrases)}, EN phrases: {len(en_phrases)}")
    return ru_phrases, en_phrases


def get_audio_duration(filepath):
    try:
        from mutagen import File

        audio = File(filepath)
        if audio and audio.info:
            return int(audio.info.length * 1_000_000)
    except Exception:
        pass

    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                filepath,
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=20,
        )
        seconds = float(result.stdout.strip())
        if seconds > 0:
            return int(seconds * 1_000_000)
    except Exception:
        pass

    try:
        import wave

        with wave.open(filepath, "rb") as wf:
            return int(wf.getnframes() / wf.getframerate() * 1_000_000)
    except Exception:
        pass

    return None


def update_text_content(original_content_str, new_text):
    try:
        content = json.loads(original_content_str)
        content["text"] = new_text
        for style in content.get("styles", []):
            if "range" in style:
                style["range"] = [0, len(new_text)]
        return json.dumps(content, ensure_ascii=False)
    except Exception as error:
        print(f"[ERROR] update_text_content failed: {error}")
        return original_content_str


def infer_categories(en_phrases):
    cwd = os.path.basename(os.getcwd()).lower()
    first_phrase = en_phrases[0].lower() if en_phrases else ""
    if "pack_02" in cwd or first_phrase.endswith(" away"):
        return PACK02_CATEGORIES
    return PACK01_CATEGORIES


def is_old_category_title(text):
    if not isinstance(text, str):
        return False
    return (
        text.startswith(OLD_EN_TITLE_PREFIX)
        or text.startswith(CATEGORY_PREFIX)
        or (text.startswith(OLD_RU_TITLE_PREFIX) and OLD_RU_TITLE_MID in text)
    )


def update_category_title_content(original_content_str, new_text):
    try:
        content = json.loads(original_content_str)
        if not is_old_category_title(content.get("text")):
            return original_content_str, False
        content["text"] = new_text
        styles = content.get("styles", [])
        if len(styles) == 1 and "range" in styles[0]:
            styles[0]["range"] = [0, len(new_text)]
        elif len(styles) > 1:
            split = len(CATEGORY_FIRST_LINE)
            for index, style in enumerate(styles):
                if "range" in style:
                    style["range"] = [0, split] if index == 0 else [split, len(new_text)]
        return json.dumps(content, ensure_ascii=False, separators=(",", ":")), True
    except Exception as error:
        print(f"[ERROR] update_category_title_content failed: {error}")
        return original_content_str, False


def update_draft_category_titles(draft, new_text):
    changed = 0
    texts = draft.get("materials", {}).get("texts", [])
    for mat in texts:
        updated, did_change = update_category_title_content(mat.get("content", ""), new_text)
        if did_change:
            mat["content"] = updated
            changed += 1
    return changed


def find_visible_category_drafts(d):
    drafts = d.get("materials", {}).get("drafts", [])
    draft_id_to_index = {draft.get("id"): index for index, draft in enumerate(drafts)}
    rows = []
    for track_index, track in enumerate(d.get("tracks", [])):
        if track.get("type") != "video":
            continue
        for segment_index, seg in enumerate(track.get("segments", [])):
            for ref in seg.get("extra_material_refs", []):
                draft_index = draft_id_to_index.get(ref)
                if draft_index is None:
                    continue
                draft = drafts[draft_index].get("draft", {})
                if update_draft_category_titles(json.loads(json.dumps(draft, ensure_ascii=False)), "__PROBE__"):
                    start = seg.get("target_timerange", {}).get("start", 0)
                    rows.append((start, track_index, segment_index, draft_index))
    by_track = {}
    for row in sorted(rows):
        by_track.setdefault(row[1], []).append(row)
    candidates = [rows_for_track for rows_for_track in by_track.values() if len(rows_for_track) == 30]
    if not candidates:
        return []
    return [row[3] for row in sorted(candidates, key=lambda item: item[0][1])[0]]


def update_category_titles(d, categories):
    drafts = d.get("materials", {}).get("drafts", [])
    draft_indices = find_visible_category_drafts(d)
    if len(draft_indices) != 30:
        print(f"[ERROR] Need exactly 30 visible compound title drafts, found {len(draft_indices)}")
        sys.exit(1)
    changed = 0
    for seg_index, draft_index in enumerate(draft_indices):
        label = CATEGORY_PREFIX + categories[seg_index % len(categories)]
        changed += update_draft_category_titles(drafts[draft_index].get("draft", {}), label)
    return changed


def update_audio_mat(mat, filepath):
    mat["path"] = filepath.replace("\\", "/")
    mat["name"] = os.path.basename(filepath)
    duration = get_audio_duration(filepath)
    if not duration:
        raise RuntimeError(f"Could not read audio duration: {filepath}")
    mat["duration"] = duration
    return duration


def update_audio_segment_duration(seg, duration):
    duration = int(duration)
    seg["source_timerange"]["duration"] = duration
    seg["target_timerange"]["duration"] = duration


def tracks_guard_snapshot(tracks):
    clone = json.loads(json.dumps(tracks, ensure_ascii=False))
    for track in clone:
        if track.get("type") != "audio":
            continue
        for seg in track.get("segments", []):
            for key in ("source_timerange", "target_timerange"):
                timerange = seg.get(key)
                if isinstance(timerange, dict):
                    timerange.pop("duration", None)
    return json.dumps(clone, ensure_ascii=False, sort_keys=True)


def main():
    print("=" * 60)
    print("  CapCut JSON Updater - SAFE audio/text only")
    print("=" * 60)

    json_input_path = JSON_INPUT
    if not os.path.exists(json_input_path) and os.path.exists(JSON_BACKUP):
        json_input_path = JSON_BACKUP
        print(f"[INFO] {JSON_INPUT} not found, using {JSON_BACKUP} as source")

    for path in [json_input_path, PHRASES_FILE]:
        if not os.path.exists(path):
            print(f"[ERROR] File not found: {path}")
            sys.exit(1)

    print("\n[1/4] Loading data...")
    with open(json_input_path, "r", encoding="utf-8") as f:
        d = json.load(f)

    original_tracks = tracks_guard_snapshot(d.get("tracks", []))

    ru_phrases, en_phrases = read_phrases(PHRASES_FILE)
    audio_1 = get_audio_files(FOLDER_RU)
    audio_2 = get_audio_files(FOLDER_EN)

    if len(audio_1) != 300 or len(audio_2) != 300:
        print(f"[ERROR] Need exactly 300 audio files in each folder. Folder1={len(audio_1)}, Folder2={len(audio_2)}")
        sys.exit(1)

    print("\n[2/4] Updating audio materials and audio durations only...")
    audios = d["materials"]["audios"]
    if len(audios) < 1200:
        print(f"[ERROR] draft_content.json must contain at least 1200 audio materials, found {len(audios)}")
        sys.exit(1)

    audio_tracks = [t for t in d["tracks"] if t["type"] == "audio"]
    if len(audio_tracks) < 2:
        print(f"[ERROR] Need at least 2 audio tracks, found {len(audio_tracks)}")
        sys.exit(1)
    track23_segs = audio_tracks[0]["segments"]
    track24_segs = audio_tracks[1]["segments"]
    if len(track23_segs) < 600 or len(track24_segs) < 600:
        print(f"[ERROR] Need at least 600 segments in each audio track. Got {len(track23_segs)} and {len(track24_segs)}")
        sys.exit(1)

    # Swapped folder mapping:
    # folder 1 audio goes into the slots that previously used folder 2,
    # folder 2 audio goes into the slots that previously used folder 1.
    for i in range(300):
        folder2_duration = update_audio_mat(audios[i], audio_2[i])
        update_audio_mat(audios[900 + i], audio_2[i])
        folder1_duration = update_audio_mat(audios[300 + i], audio_1[i])
        update_audio_mat(audios[600 + i], audio_1[i])

        update_audio_segment_duration(track23_segs[i], folder2_duration)
        update_audio_segment_duration(track23_segs[300 + i], folder1_duration)
        update_audio_segment_duration(track24_segs[i], folder1_duration)
        update_audio_segment_duration(track24_segs[300 + i], folder2_duration)

    print("\n[3/4] Updating text materials only...")
    text_tracks = [t for t in d["tracks"] if t["type"] == "text"]
    if len(text_tracks) < 21:
        print(f"[ERROR] Need at least 21 text tracks, found {len(text_tracks)}")
        sys.exit(1)

    texts_mats = d["materials"]["texts"]
    mat_id_to_text = {t["id"]: t for t in texts_mats}
    blocks = 15

    for seg_idx in range(30):
        inverted = seg_idx >= blocks
        block = seg_idx - blocks if inverted else seg_idx
        phrase_start = block * 20

        seg_long = text_tracks[0]["segments"][seg_idx]
        mat_long = mat_id_to_text[seg_long["material_id"]]
        group = ru_phrases[phrase_start : phrase_start + 20] if inverted else en_phrases[phrase_start : phrase_start + 20]
        mat_long["content"] = update_text_content(mat_long["content"], "\n\n".join(group))

        for track_pos in range(1, 21):
            phrase_idx = phrase_start + (track_pos - 1)
            seg_ind = text_tracks[track_pos]["segments"][seg_idx]
            mat_ind = mat_id_to_text[seg_ind["material_id"]]
            word = en_phrases[phrase_idx] if inverted else ru_phrases[phrase_idx]
            mat_ind["content"] = update_text_content(mat_ind["content"], word)

    print("\n[3b/4] Updating compound category titles...")
    category_title_count = update_category_titles(d, infer_categories(en_phrases))
    print(f"  Category title text items changed: {category_title_count}")

    updated_tracks = tracks_guard_snapshot(d.get("tracks", []))
    if updated_tracks != original_tracks:
        print("[ERROR] Internal guard failed: tracks changed beyond audio durations. Refusing to save.")
        sys.exit(1)

    print("\n[4/4] Saving...")
    if os.path.exists(JSON_INPUT) and not os.path.exists(JSON_BACKUP):
        shutil.copy2(JSON_INPUT, JSON_BACKUP)
        print(f"  Backup copied -> {JSON_BACKUP}")
    elif os.path.exists(JSON_INPUT):
        print(f"  Backup already exists -> {JSON_BACKUP}")
    elif json_input_path == JSON_BACKUP:
        print(f"  Source was {JSON_BACKUP}; writing new {JSON_OUTPUT}")

    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))

    print("Done.")


if __name__ == "__main__":
    main()
