from __future__ import annotations

import copy
import json
import math
import shutil
import subprocess
import uuid
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageStat


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
CONTENT_PATH = DRAFT_DIR / "draft_content.json"
META_PATH = DRAFT_DIR / "draft_meta_info.json"
TMP_PATH = DRAFT_DIR / "template-2.tmp"
ROOT_META_PATH = DRAFT_DIR.parent / "root_meta_info.json"
RES_DIR = DRAFT_DIR / "Resources" / "chains_cinematic_repair"
QA_DIR = Path("exports/chains/episode1/cinematic_repair/qa_frames")
REPORT_PATH = Path("exports/chains/episode1/cinematic_repair/final_quality_gate_report.json")

US = 1_000_000
CTA_DUR = 11_200_000
QR_DUR = 10_200_000


def gid() -> str:
    return str(uuid.uuid4()).upper()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def copy_backup() -> Path:
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-cta-final"
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(DRAFT_DIR, out)
    return out


def make_cta_bg(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (1920, 1080), (249, 249, 246))
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((0, 0, 1920, 95), fill=(255, 194, 18, 255))
    draw.rectangle((0, 985, 1920, 1080), fill=(12, 14, 18, 255))
    draw.rectangle((116, 170, 1804, 910), outline=(18, 20, 26, 42), width=4)
    for x in range(-260, 2200, 180):
        draw.line((x, 1080, x + 520, 0), fill=(18, 20, 26, 15), width=10)
    draw.rounded_rectangle((1220, 220, 1645, 645), radius=34, outline=(255, 194, 18, 180), width=8)
    draw.rounded_rectangle((1260, 260, 1605, 605), radius=22, fill=(255, 255, 255, 160))
    img.save(path, quality=95)


def make_soft_sfx(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sample_rate = 48_000
    duration = 0.42
    frames = int(sample_rate * duration)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        data = bytearray()
        for i in range(frames):
            t = i / sample_rate
            env = math.exp(-8.0 * t)
            tone = math.sin(2 * math.pi * 740 * t) * 0.28 + math.sin(2 * math.pi * 1180 * t) * 0.16
            sample = int(max(-1.0, min(1.0, tone * env * 0.18)) * 32767)
            data.extend(sample.to_bytes(2, "little", signed=True))
        w.writeframes(bytes(data))


def rebuild_explanation_bg() -> None:
    source_candidates = [
        Path("exports/chains/episode1/cinematic_repair/intro_raw/06_typing_keyboard_study_night.mp4"),
        Path("exports/chains/episode1/cinematic_repair/intro_raw/05_city_lights_night_focus.mp4"),
        Path("exports/chains/episode1/cinematic_repair/intro_raw/03_person_learning_language_online.mp4"),
    ]
    src = next((p for p in source_candidates if p.exists()), None)
    if src is None:
        return
    out = RES_DIR / "construction_explain_cinematic_bg_30s.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y", "-stream_loop", "-1", "-i", str(src), "-t", "30",
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=increase,"
            "crop=1920:1080,"
            "eq=brightness=-0.16:contrast=1.22:saturation=0.9,"
            "format=yuv420p",
            "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            str(out),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def clone_track(template: dict, name: str, segments: list[dict]) -> dict:
    t = copy.deepcopy(template)
    t["id"] = gid()
    t["segments"] = segments
    t["name"] = name
    t["is_default_name"] = False
    return t


def make_photo_material(template: dict, path: Path, width: int, height: int, duration: int, name: str) -> dict:
    m = copy.deepcopy(template)
    m["id"] = gid()
    m["unique_id"] = gid()
    m["type"] = "photo"
    m["duration"] = duration
    m["path"] = str(path)
    m["media_path"] = ""
    m["has_audio"] = False
    m["width"] = width
    m["height"] = height
    m["material_name"] = name
    m["name"] = name
    m["category_name"] = "local"
    if "video_algorithm" in m and isinstance(m["video_algorithm"], dict):
        m["video_algorithm"]["algorithms"] = []
    return m


def make_audio_material(template: dict, path: Path, duration: int, name: str) -> dict:
    m = copy.deepcopy(template)
    m["id"] = gid()
    m["unique_id"] = ""
    m["type"] = "extract_music"
    m["duration"] = duration
    m["path"] = str(path)
    m["name"] = name
    m["wave_points"] = []
    return m


def make_text_material(template: dict, text: str, color: list[float], font_size: float, bg_alpha: float = 0.0) -> dict:
    m = copy.deepcopy(template)
    m["id"] = gid()
    m["base_content"] = text
    m["text_color"] = "#%02x%02x%02x" % tuple(int(max(0, min(1, c)) * 255) for c in color)
    m["font_size"] = font_size
    m["text_size"] = int(font_size * 4.1)
    m["background_alpha"] = bg_alpha
    m["background_style"] = 0 if bg_alpha <= 0 else m.get("background_style", 1)
    content = json.loads(m["content"])
    content["text"] = text
    for style in content.get("styles", []):
        style["range"] = [0, len(text)]
        style["fill"]["content"]["solid"]["color"] = color
        style["size"] = font_size
    m["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    return m


def clone_segment(template: dict, material_id: str, start: int, duration: int, source_duration: int | None = None) -> dict:
    s = copy.deepcopy(template)
    s["id"] = gid()
    s["material_id"] = material_id
    s["target_timerange"] = {"start": start, "duration": duration}
    if s.get("source_timerange") is not None:
        s["source_timerange"] = {"start": 0, "duration": source_duration or duration}
    s["render_timerange"] = {"start": 0, "duration": 0}
    s["visible"] = True
    s["group_id"] = ""
    return s


def text_segment(template: dict, material_id: str, start: int, duration: int, x: float, y: float, scale: float) -> dict:
    s = clone_segment(template, material_id, start, duration)
    s["source_timerange"] = None
    s["clip"] = copy.deepcopy(template.get("clip") or {})
    s["clip"]["transform"] = {"x": x, "y": y}
    s["clip"]["scale"] = {"x": scale, "y": scale}
    s["clip"]["alpha"] = 1.0
    return s


def audio_segment(template: dict, material_id: str, start: int, duration: int) -> dict:
    s = clone_segment(template, material_id, start, duration, duration)
    s["clip"] = None
    s["volume"] = 0.26
    s["last_nonzero_volume"] = 0.26
    return s


def ensure_root_meta(draft: dict, meta: dict) -> None:
    root = read_json(ROOT_META_PATH)
    drafts = root.get("drafts", [])
    draft_id = meta.get("draft_id")
    for item in drafts:
        if item.get("draft_id") == draft_id:
            item["draft_name"] = DRAFT_NAME
            item["tm_duration"] = draft["duration"]
            break
    else:
        drafts.append({"draft_id": draft_id, "draft_name": DRAFT_NAME, "tm_duration": draft["duration"]})
    root["drafts"] = drafts
    write_json(ROOT_META_PATH, root)


def update_cta(draft: dict) -> dict:
    RES_DIR.mkdir(parents=True, exist_ok=True)
    rebuild_explanation_bg()
    cta_bg = RES_DIR / "phraseman_cta_white_bg.png"
    cta_sfx = RES_DIR / "cta_soft_confirm.wav"
    make_cta_bg(cta_bg)
    make_soft_sfx(cta_sfx)

    qr_path = RES_DIR / "phraseman_knowly_download_qr.png"
    if not qr_path.exists():
        src = Path("exports/chains/episode1/cinematic_repair/cta/phraseman_knowly_download_qr.png")
        shutil.copy2(src, qr_path)

    with Image.open(cta_bg) as im:
        bg_w, bg_h = im.size
    with Image.open(qr_path) as im:
        qr_w, qr_h = im.size

    video_template_track = next(t for t in draft["tracks"] if t.get("type") == "video" and t.get("segments"))
    text_template_track = next(t for t in draft["tracks"] if t.get("type") == "text" and len(t.get("segments", [])) >= 50)
    audio_template_track = next(t for t in draft["tracks"] if t.get("type") == "audio" and t.get("segments"))
    video_seg_template = video_template_track["segments"][0]
    text_seg_template = text_template_track["segments"][0]
    audio_seg_template = audio_template_track["segments"][0]

    video_mat_template = next(m for m in draft["materials"]["videos"] if m.get("id") == video_seg_template["material_id"])
    text_mat_template = next(m for m in draft["materials"]["texts"] if m.get("id") == text_seg_template["material_id"])
    audio_mat_template = next(m for m in draft["materials"]["audios"] if m.get("id") == audio_seg_template["material_id"])

    # Name recovered explanation tracks explicitly. CapCut keeps unnamed tracks openable,
    # but our gates need stable labels so they cannot silently disappear again.
    for t in draft["tracks"]:
        if t.get("type") == "video" and len(t.get("segments", [])) == 50:
            mat = next((m for m in draft["materials"]["videos"] if m.get("id") == t["segments"][0].get("material_id")), {})
            if "construction_explain_cinematic_bg" in str(mat.get("path", "")):
                t["name"] = "CODEx construction explanation BG"
                t["is_default_name"] = False
        if t.get("type") == "text" and len(t.get("segments", [])) == 50:
            mat = next((m for m in draft["materials"]["texts"] if m.get("id") == t["segments"][0].get("material_id")), {})
            text = json.loads(mat.get("content", "{}")).get("text", "")
            if "КОНСТРУКЦИЯ" in text:
                t["name"] = "CODEx construction explanation TEXT"
                t["is_default_name"] = False
        if t.get("type") == "audio" and len(t.get("segments", [])) == 50:
            mat = next((m for m in draft["materials"]["audios"] if m.get("id") == t["segments"][0].get("material_id")), {})
            if str(mat.get("path", "")).endswith("_natural.wav"):
                t["name"] = "CODEx construction explanation VO"
                t["is_default_name"] = False

    # Stable block starts. QR itself is intentionally delayed inside each block;
    # never derive block starts from QR starts or repeated repairs will drift.
    cta_starts = [994_271_564, 1_951_754_148, 3_978_130_315]

    # Remove previous generated CTA tracks if the script is rerun. They are rebuilt
    # in a known layer order: white background, text, QR, SFX.
    draft["tracks"] = [
        t for t in draft["tracks"]
        if not str(t.get("name", "")).startswith("CODEx CTA ")
    ]

    # Fix or recreate QR material dimensions and placement.
    qr_mat_id = None
    for m in draft["materials"]["videos"]:
        if Path(str(m.get("path", ""))).name == "phraseman_knowly_download_qr.png":
            m["path"] = str(qr_path)
            m["width"] = qr_w
            m["height"] = qr_h
            m["duration"] = max(m.get("duration", 0), CTA_DUR)
            m["type"] = "photo"
            m["material_name"] = "phraseman_knowly_download_qr.png"
            m["name"] = "phraseman_knowly_download_qr.png"
            qr_mat_id = m["id"]
            break
    if qr_mat_id is None:
        qr_mat = make_photo_material(video_mat_template, qr_path, qr_w, qr_h, CTA_DUR, "phraseman_knowly_download_qr.png")
        draft["materials"]["videos"].append(qr_mat)
        qr_mat_id = qr_mat["id"]

    bg_mat = make_photo_material(video_mat_template, cta_bg, bg_w, bg_h, CTA_DUR, "phraseman_cta_white_bg.png")
    sfx_mat = make_audio_material(audio_mat_template, cta_sfx, 420_000, "cta_soft_confirm.wav")
    draft["materials"]["videos"].append(bg_mat)
    draft["materials"]["audios"].append(sfx_mat)

    cta_texts = [
        ("АНГЛИЙСКИЕ\nЦЕПОЧКИ", "ТРЕНИРУЙ В PHRASEMAN\nСКАНИРУЙ QR"),
        ("ФРАЗЫ\nШАГ ЗА ШАГОМ", "СОБИРАЙ ЦЕПОЧКИ\nССЫЛКА В ОПИСАНИИ"),
        ("СКАЧАЙ\nPHRASEMAN", "ТРЕНИРУЙ РИТМ\nKNOWLYAPPS.COM/DOWNLOAD"),
    ]
    bg_segments: list[dict] = []
    head_segments: list[dict] = []
    sub_segments: list[dict] = []
    qr_segments: list[dict] = []
    sfx_segments: list[dict] = []
    for i, start in enumerate(cta_starts[:3]):
        bg_s = clone_segment(video_seg_template, bg_mat["id"], start, CTA_DUR, CTA_DUR)
        bg_s["clip"]["scale"] = {"x": 1.0, "y": 1.0}
        bg_s["clip"]["transform"] = {"x": 0.0, "y": 0.0}
        bg_segments.append(bg_s)

        head, sub = cta_texts[i]
        head_mat = make_text_material(text_mat_template, head, [0.05, 0.055, 0.07], 8.7, 0.0)
        sub_mat = make_text_material(text_mat_template, sub, [1.0, 0.75, 0.05], 4.9, 0.0)
        draft["materials"]["texts"].extend([head_mat, sub_mat])
        head_segments.append(text_segment(text_seg_template, head_mat["id"], start + 450_000, CTA_DUR - 900_000, -0.27, -0.09, 1.02))
        sub_segments.append(text_segment(text_seg_template, sub_mat["id"], start + 1_450_000, CTA_DUR - 2_000_000, -0.29, 0.37, 0.86))
        qr_s = clone_segment(video_seg_template, qr_mat_id, start + 550_000, QR_DUR, QR_DUR)
        qr_s["clip"]["scale"] = {"x": 0.235, "y": 0.235}
        qr_s["clip"]["transform"] = {"x": 0.62, "y": 0.07}
        qr_segments.append(qr_s)
        sfx_segments.append(audio_segment(audio_seg_template, sfx_mat["id"], start + 350_000, 420_000))

    draft["tracks"].append(clone_track(video_template_track, "CODEx CTA WHITE BG", bg_segments))
    draft["tracks"].append(clone_track(text_template_track, "CODEx CTA HEADLINE", head_segments))
    draft["tracks"].append(clone_track(text_template_track, "CODEx CTA SUB", sub_segments))
    draft["tracks"].append(clone_track(video_template_track, "CODEx CTA QR", qr_segments))
    draft["tracks"].append(clone_track(audio_template_track, "CODEx CTA SFX", sfx_segments))

    return {"cta_starts": cta_starts[:3], "cta_bg": str(cta_bg), "cta_sfx": str(cta_sfx), "qr": str(qr_path)}


def ffprobe(path: Path) -> dict:
    cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_name,pix_fmt,width,height",
        "-of", "json", str(path)
    ]
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {p.stderr}")
    return json.loads(p.stdout)


def extract_frame(video: Path, seconds: float, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-ss", f"{seconds:.3f}", "-i", str(video), "-frames:v", "1", "-q:v", "2", str(out)],
        check=True, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )


def image_metrics(path: Path) -> dict:
    with Image.open(path).convert("L") as im:
        stat = ImageStat.Stat(im)
        mean = stat.mean[0]
        variance = stat.var[0]
        small = im.resize((320, 180))
        # Simple edge strength via neighboring pixel differences.
        px = small.load()
        diffs = []
        for y in range(0, small.height - 1, 4):
            for x in range(0, small.width - 1, 4):
                diffs.append(abs(px[x + 1, y] - px[x, y]) + abs(px[x, y + 1] - px[x, y]))
        edge = sum(diffs) / max(1, len(diffs))
        return {"mean": round(mean, 2), "variance": round(variance, 2), "edge": round(edge, 2)}


def collect_paths(obj) -> list[str]:
    paths = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in {"path", "media_path", "intensifies_path", "reverse_path", "reverse_intensifies_path", "intensifies_audio_path"} and isinstance(v, str) and v:
                for part in v.split(";"):
                    if part.strip():
                        paths.append(part.strip())
            else:
                paths.extend(collect_paths(v))
    elif isinstance(obj, list):
        for item in obj:
            paths.extend(collect_paths(item))
    return paths


def text_has_bad_midword_break(text: str) -> bool:
    # Hard gate for examples the user flagged: never one-letter fragments on a new line.
    for line in text.splitlines():
        token = line.strip(" ;—-")
        if token and len(token) == 1 and token.isalpha():
            return True
    return False


def validate(draft: dict) -> dict:
    report: dict = {"errors": [], "warnings": []}
    draft_id = draft.get("id")
    layout = read_json(DRAFT_DIR / "timeline_layout.json")
    biz = read_json(DRAFT_DIR / "draft_biz_config.json")
    if draft.get("duration", 0) <= 0:
        report["errors"].append("draft duration is zero")
    layout_ids = layout.get("timelineIds")
    if layout_ids is None:
        layout_ids = []
        for item in layout.get("dockItems", []):
            layout_ids.extend(item.get("timelineIds", []))
    if layout_ids != [draft_id]:
        report["errors"].append("timeline_layout timelineIds mismatch")
    timeline_dir = DRAFT_DIR / "Timelines" / draft_id
    if not timeline_dir.exists():
        report["errors"].append("timeline folder missing")
    if draft_id not in json.dumps(biz, ensure_ascii=False):
        report["errors"].append("draft_biz_config timeline id mismatch")

    missing = sorted({p for p in collect_paths(draft) if (":" in p or p.startswith("\\\\")) and not Path(p).exists()})
    report["missing_paths"] = missing[:25]
    if missing:
        report["errors"].append(f"missing referenced media: {len(missing)}")

    names = {t.get("name"): len(t.get("segments", [])) for t in draft.get("tracks", [])}
    report["track_counts"] = names
    for name in ["CODEx CTA QR", "CODEx CTA WHITE BG", "CODEx CTA HEADLINE", "CODEx CTA SUB", "CODEx CTA SFX"]:
        if names.get(name) != 3:
            report["errors"].append(f"{name} segment count is {names.get(name)}")

    explanation_counts = {
        "video": names.get("CODEx construction explanation BG", 0),
        "text": names.get("CODEx construction explanation TEXT", 0),
        "audio": names.get("CODEx construction explanation VO", 0),
    }
    report["explanation_counts"] = explanation_counts
    if any(v != 50 for v in explanation_counts.values()):
        report["errors"].append(f"explanation track counts wrong: {explanation_counts}")

    bad_texts = []
    forbidden = []
    for mat in draft.get("materials", {}).get("texts", []):
        content = mat.get("content", "")
        try:
            text = json.loads(content).get("text", "")
        except Exception:
            text = content
        lower = text.lower()
        if "франц" in lower or "french" in lower:
            forbidden.append(text)
        if text_has_bad_midword_break(text):
            bad_texts.append(text)
    report["forbidden_cta_texts"] = forbidden[:5]
    report["bad_midword_breaks"] = bad_texts[:10]
    if forbidden:
        report["errors"].append("found forbidden French CTA text")
    if bad_texts:
        report["errors"].append("found hard mid-word/one-letter line break")

    intro_audio = next((m for m in draft["materials"]["audios"] if "intro" in str(m.get("path", "")).lower()), None)
    first_phrase = min(
        s["target_timerange"]["start"]
        for t in draft["tracks"]
        if t.get("type") == "video" and t.get("segments")
        for s in t["segments"]
        if s["target_timerange"]["start"] > 0
    )
    report["first_phrase_start_us"] = first_phrase
    if intro_audio:
        report["intro_audio_duration_us"] = intro_audio.get("duration")
        if first_phrase < intro_audio.get("duration", 0) + 1_500_000:
            report["errors"].append("intro audio overlaps first phrase")

    media_checks = {}
    for path in [
        RES_DIR / "chains_intro_cinematic_learning_thriller_44s.mp4",
        RES_DIR / "construction_explain_cinematic_bg_30s.mp4",
        RES_DIR / "phraseman_cta_white_bg.png",
        RES_DIR / "phraseman_knowly_download_qr.png",
        RES_DIR / "cta_soft_confirm.wav",
    ]:
        if path.exists() and path.suffix.lower() in {".mp4", ".wav"}:
            media_checks[str(path)] = ffprobe(path)
        elif path.exists() and path.suffix.lower() == ".png":
            with Image.open(path) as im:
                media_checks[str(path)] = {"image": im.size, "mode": im.mode}
    report["media_checks"] = media_checks

    QA_DIR.mkdir(parents=True, exist_ok=True)
    intro = RES_DIR / "chains_intro_cinematic_learning_thriller_44s.mp4"
    explain = RES_DIR / "construction_explain_cinematic_bg_30s.mp4"
    frame_metrics = {}
    if intro.exists():
        for sec in [3, 10, 18, 30, 40]:
            out = QA_DIR / f"intro_{sec:02d}s.jpg"
            extract_frame(intro, sec, out)
            frame_metrics[str(out)] = image_metrics(out)
    if explain.exists():
        for sec in [3, 12, 23]:
            out = QA_DIR / f"explain_bg_{sec:02d}s.jpg"
            extract_frame(explain, sec, out)
            frame_metrics[str(out)] = image_metrics(out)
    cta_bg = RES_DIR / "phraseman_cta_white_bg.png"
    if cta_bg.exists():
        frame_metrics[str(cta_bg)] = image_metrics(cta_bg)
    report["frame_metrics"] = frame_metrics

    for path, metrics in frame_metrics.items():
        if "cta_white_bg" in path:
            continue
        if metrics["variance"] < 35 or metrics["edge"] < 0.7:
            report["warnings"].append(f"low visual texture metric: {path} {metrics}")

    return report


def main() -> None:
    if not CONTENT_PATH.exists():
        raise FileNotFoundError(CONTENT_PATH)
    backup = copy_backup()
    draft = read_json(CONTENT_PATH)
    cta_info = update_cta(draft)
    meta = read_json(META_PATH)
    meta["tm_duration"] = draft["duration"]
    write_json(CONTENT_PATH, draft)
    if TMP_PATH.exists():
        write_json(TMP_PATH, draft)
    write_json(META_PATH, meta)
    ensure_root_meta(draft, meta)
    report = validate(draft)
    report["backup"] = str(backup)
    report["cta"] = cta_info
    report["draft_dir"] = str(DRAFT_DIR)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
