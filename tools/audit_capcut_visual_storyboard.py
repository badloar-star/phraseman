from __future__ import annotations

import html
import json
import math
import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


DRAFT_NAME = os.environ.get("CAPCUT_AUDIT_DRAFT", "PHONES_004_READY")
OUT_DIR = Path(os.environ.get("CAPCUT_AUDIT_OUT", "exports/old-phones-doc-retention-11labs/visual_audit"))
FRAME_DIR = OUT_DIR / "frames"
SHEET_DIR = OUT_DIR / "sheets"
WIDTH = 1280
HEIGHT = 720
THUMB_W = 426
THUMB_H = 240
PLACEHOLDER_RE = re.compile(r"##_draftpath_placeholder_[^#]+_##/(.+)$")


@dataclass
class VisualSample:
    index: int
    time_s: float
    shot_index: int
    clip_name: str
    source_key: str
    duration_s: float
    text: str
    text_bbox: tuple[int, int, int, int] | None
    issues: list[str]
    frame_path: Path


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def resolve_capcut_path(draft_dir: Path, value: str) -> Path:
    normalized = value.replace("\\", "/")
    match = PLACEHOLDER_RE.match(normalized)
    if match:
        return draft_dir / match.group(1)
    return Path(value)


def sec(timerange: dict[str, Any], key: str) -> float:
    return float(timerange.get(key, 0) or 0) / 1_000_000.0


def extract_frame(video_path: Path, source_time_s: float, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    attempts = [max(0.0, source_time_s), 0.45, 0.08]
    last_error = ""
    for attempt in attempts:
        command = [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{attempt:.3f}",
            "-i",
            str(video_path),
            "-frames:v",
            "1",
            "-vf",
            f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT}",
            str(out_path),
        ]
        completed = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if completed.returncode == 0 and out_path.exists() and out_path.stat().st_size > 0:
            return
        last_error = completed.stdout[-800:]
    raise RuntimeError(f"Could not extract frame from {video_path} at {source_time_s:.3f}s: {last_error}")


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def parse_text_material(material: dict[str, Any]) -> tuple[str, int, tuple[int, int, int]]:
    text = str(material.get("base_content") or "")
    size = 54
    color = (248, 250, 252)
    try:
        content = json.loads(str(material.get("content") or "{}"))
        text = str(content.get("text") or text)
        styles = content.get("styles") or []
        if styles:
            size = int(float(styles[0].get("size") or 7.0) * 7.4)
            solid = styles[0]["fill"]["content"]["solid"]["color"]
            color = tuple(max(0, min(255, int(float(v) * 255))) for v in solid[:3])
    except Exception:
        pass
    return text, max(36, min(70, size)), color  # audit view is 1280x720, not CapCut UI units.


def draw_capcut_text(
    image: Image.Image,
    text: str,
    transform: dict[str, float],
    size: int,
    color: tuple[int, int, int],
) -> tuple[int, int, int, int]:
    draw = ImageDraw.Draw(image)
    text_font = font(size)
    lines = text.splitlines() or [text]
    line_boxes = [draw.textbbox((0, 0), line, font=text_font, stroke_width=4) for line in lines]
    line_width = max(box[2] - box[0] for box in line_boxes)
    line_height = max(box[3] - box[1] for box in line_boxes)
    total_height = int(line_height * len(lines) * 1.08)
    x_norm = float(transform.get("x") or 0.0)
    y_norm = float(transform.get("y") or 0.0)
    cx = int(WIDTH * (0.5 + x_norm / 2.0))
    cy = int(HEIGHT * (0.5 + y_norm / 2.0))
    x = int(cx - line_width / 2)
    y = int(cy - total_height / 2)
    for i, line in enumerate(lines):
        yy = y + int(i * line_height * 1.08)
        draw.text((x + 5, yy + 7), line, font=text_font, fill=(2, 6, 23), stroke_width=4, stroke_fill=(2, 6, 23))
        draw.text((x, yy), line, font=text_font, fill=color, stroke_width=3, stroke_fill=(2, 6, 23))
    return (x, y, x + line_width, y + total_height)


def draw_overlay(
    image_path: Path,
    sample: VisualSample,
    active_texts: list[tuple[str, dict[str, float], int, tuple[int, int, int]]],
) -> None:
    image = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(image)
    header_font = font(22)
    label = f"{sample.time_s:06.2f}s  shot {sample.shot_index:02d}  {sample.clip_name}"
    draw.rectangle((0, 0, WIDTH, 40), fill=(2, 6, 23))
    draw.text((16, 8), label, font=header_font, fill=(226, 232, 240))
    text_bbox = None
    for text, transform, size, color in active_texts:
        text_bbox = draw_capcut_text(image, text, transform, size, color)
    sample.text_bbox = text_bbox
    if sample.issues:
        issue_text = " | ".join(sample.issues)
        draw.rectangle((0, HEIGHT - 36, WIDTH, HEIGHT), fill=(127, 29, 29))
        draw.text((16, HEIGHT - 29), issue_text, font=header_font, fill=(254, 242, 242))
    image.save(image_path, quality=92)


def bbox_problem(bbox: tuple[int, int, int, int] | None) -> list[str]:
    if not bbox:
        return []
    x1, y1, x2, y2 = bbox
    issues = []
    if x1 < 20 or y1 < 46 or x2 > WIDTH - 20 or y2 > HEIGHT - 20:
        issues.append("TEXT TOO CLOSE TO EDGE")
    if (WIDTH * 0.33) < ((x1 + x2) / 2) < (WIDTH * 0.67) and (HEIGHT * 0.30) < ((y1 + y2) / 2) < (HEIGHT * 0.72):
        issues.append("TEXT NEAR CENTER SUBJECT")
    return issues


def make_sheet(samples: list[VisualSample], path: Path, cols: int = 3) -> None:
    rows = math.ceil(len(samples) / cols)
    sheet = Image.new("RGB", (cols * THUMB_W, rows * (THUMB_H + 56)), (15, 23, 42))
    draw = ImageDraw.Draw(sheet)
    label_font = font(17)
    for i, sample in enumerate(samples):
        x = (i % cols) * THUMB_W
        y = (i // cols) * (THUMB_H + 56)
        frame = Image.open(sample.frame_path).convert("RGB").resize((THUMB_W, THUMB_H), Image.Resampling.LANCZOS)
        sheet.paste(frame, (x, y))
        issue = "OK" if not sample.issues else " / ".join(sample.issues[:2])
        label = f"{sample.time_s:05.1f}s  {sample.text or sample.source_key}  {issue}"
        draw.rectangle((x, y + THUMB_H, x + THUMB_W, y + THUMB_H + 56), fill=(15, 23, 42))
        draw.text((x + 8, y + THUMB_H + 8), label[:54], font=label_font, fill=(226, 232, 240))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, quality=92)


def make_html(samples: list[VisualSample], sheets: list[Path], draft_dir: Path) -> None:
    issue_count = sum(1 for sample in samples if sample.issues)
    rows = []
    for sample in samples:
        rows.append(
            "<tr>"
            f"<td>{sample.index}</td><td>{sample.time_s:.2f}</td><td>{html.escape(sample.clip_name)}</td>"
            f"<td>{html.escape(sample.text)}</td><td>{html.escape(', '.join(sample.issues) or 'OK')}</td>"
            f"<td><a href='{sample.frame_path.as_posix()}'>frame</a></td>"
            "</tr>"
        )
    sheet_imgs = "\n".join(f"<img src='{p.as_posix()}' />" for p in sheets)
    page = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{html.escape(DRAFT_NAME)} visual audit</title>
<style>
body{{margin:0;background:#0f172a;color:#e2e8f0;font-family:Arial,sans-serif}}
main{{max-width:1380px;margin:0 auto;padding:24px}}
img{{display:block;max-width:100%;margin:18px 0;border:1px solid #334155}}
table{{border-collapse:collapse;width:100%;font-size:14px}}
td,th{{border-bottom:1px solid #334155;padding:8px;text-align:left;vertical-align:top}}
.bad{{color:#fecaca}} .ok{{color:#bbf7d0}}
</style></head><body><main>
<h1>{html.escape(DRAFT_NAME)} visual audit</h1>
<p>Draft: {html.escape(str(draft_dir))}</p>
<p>Samples: {len(samples)}. Frames with issues: <span class="{'bad' if issue_count else 'ok'}">{issue_count}</span>.</p>
{sheet_imgs}
<h2>Frame table</h2>
<table><thead><tr><th>#</th><th>Time</th><th>Clip</th><th>Text</th><th>Issues</th><th>File</th></tr></thead><tbody>
{''.join(rows)}
</tbody></table></main></body></html>"""
    (OUT_DIR / "index.html").write_text(page, encoding="utf-8")


def main() -> None:
    root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    draft_dir = root / DRAFT_NAME
    content = load_json(draft_dir / "draft_content.json")
    material_by_id: dict[str, dict[str, Any]] = {}
    for group in content.get("materials", {}).values():
        if isinstance(group, list):
            for material in group:
                if isinstance(material, dict) and material.get("id"):
                    material_by_id[str(material["id"])] = material

    video_track = next(track for track in content["tracks"] if track.get("type") == "video")
    text_track = next(track for track in content["tracks"] if track.get("type") == "text")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    SHEET_DIR.mkdir(parents=True, exist_ok=True)

    samples: list[VisualSample] = []
    for index, segment in enumerate(video_track.get("segments", [])):
        start_s = sec(segment["target_timerange"], "start")
        duration_s = sec(segment["target_timerange"], "duration")
        sample_time = start_s + min(duration_s * 0.52, max(0.35, duration_s - 0.12))
        source_time = sec(segment.get("source_timerange") or {}, "start") + min(duration_s * 0.52, max(0.35, duration_s - 0.12))
        material = material_by_id[str(segment["material_id"])]
        video_path = resolve_capcut_path(draft_dir, str(material["path"]))
        clip_name = video_path.name
        source_key = clip_name.replace("shot_", "").replace(".mp4", "")
        source_key = re.sub(r"^\d+_", "", source_key)
        frame_path = FRAME_DIR / f"frame_{index:03d}_{sample_time:07.2f}s.png"
        extract_frame(video_path, source_time, frame_path)

        active_texts = []
        text_label = ""
        for text_segment in text_track.get("segments", []):
            ts = sec(text_segment["target_timerange"], "start")
            td = sec(text_segment["target_timerange"], "duration")
            if ts <= sample_time <= ts + td:
                text_material = material_by_id[str(text_segment["material_id"])]
                text, size, color = parse_text_material(text_material)
                text_label = text
                transform = (text_segment.get("clip") or {}).get("transform") or {"x": 0.0, "y": 0.0}
                active_texts.append((text, transform, size, color))

        issues: list[str] = []
        if duration_s < 2.0 or duration_s > 5.0:
            issues.append("CUT DURATION OUTSIDE 2-5S")
        sample = VisualSample(
            index=index,
            time_s=sample_time,
            shot_index=index,
            clip_name=clip_name,
            source_key=source_key,
            duration_s=duration_s,
            text=text_label,
            text_bbox=None,
            issues=issues,
            frame_path=frame_path,
        )
        draw_overlay(frame_path, sample, active_texts)
        sample.issues.extend(bbox_problem(sample.text_bbox))
        if sample.issues:
            draw_overlay(frame_path, sample, active_texts)
        samples.append(sample)

    text_hit_samples: list[VisualSample] = []
    for text_index, text_segment in enumerate(text_track.get("segments", [])):
        text_start = sec(text_segment["target_timerange"], "start")
        text_duration = sec(text_segment["target_timerange"], "duration")
        sample_time = text_start + min(text_duration * 0.50, max(0.24, text_duration - 0.08))
        active_video = None
        for shot_index, segment in enumerate(video_track.get("segments", [])):
            shot_start = sec(segment["target_timerange"], "start")
            shot_duration = sec(segment["target_timerange"], "duration")
            if shot_start <= sample_time <= shot_start + shot_duration:
                active_video = (shot_index, segment, shot_start)
                break
        if not active_video:
            continue
        shot_index, segment, shot_start = active_video
        material = material_by_id[str(segment["material_id"])]
        video_path = resolve_capcut_path(draft_dir, str(material["path"]))
        source_time = sec(segment.get("source_timerange") or {}, "start") + max(0.05, sample_time - shot_start)
        text_material = material_by_id[str(text_segment["material_id"])]
        text, size, color = parse_text_material(text_material)
        transform = (text_segment.get("clip") or {}).get("transform") or {"x": 0.0, "y": 0.0}
        frame_path = FRAME_DIR / f"text_hit_{text_index:03d}_{sample_time:07.2f}s.png"
        extract_frame(video_path, source_time, frame_path)
        sample = VisualSample(
            index=text_index,
            time_s=sample_time,
            shot_index=shot_index,
            clip_name=video_path.name,
            source_key=video_path.stem,
            duration_s=text_duration,
            text=text,
            text_bbox=None,
            issues=[],
            frame_path=frame_path,
        )
        draw_overlay(frame_path, sample, [(text, transform, size, color)])
        sample.issues.extend(bbox_problem(sample.text_bbox))
        if sample.issues:
            draw_overlay(frame_path, sample, [(text, transform, size, color)])
        text_hit_samples.append(sample)

    sheets = []
    for page_index in range(0, len(samples), 18):
        page_samples = samples[page_index : page_index + 18]
        sheet_path = SHEET_DIR / f"storyboard_page_{page_index // 18 + 1:02d}.jpg"
        make_sheet(page_samples, sheet_path)
        sheets.append(sheet_path)

    if text_hit_samples:
        text_sheet = SHEET_DIR / "text_hits_all.jpg"
        make_sheet(text_hit_samples, text_sheet, cols=2)
        sheets.insert(0, text_sheet)

    audit = {
        "draft": DRAFT_NAME,
        "draft_dir": str(draft_dir),
        "sample_count": len(samples),
        "text_sample_count": len(text_hit_samples),
        "issue_count": sum(1 for sample in [*samples, *text_hit_samples] if sample.issues),
        "issues": [
            {
                "index": sample.index,
                "time_s": sample.time_s,
                "clip": sample.clip_name,
                "text": sample.text,
                "issues": sample.issues,
                "frame": str(sample.frame_path),
            }
            for sample in [*samples, *text_hit_samples]
            if sample.issues
        ],
        "sheets": [str(path) for path in sheets],
        "html": str(OUT_DIR / "index.html"),
    }
    (OUT_DIR / "visual_audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    make_html(samples, sheets, draft_dir)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
