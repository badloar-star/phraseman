"""Make the 60 current project intro clips frame-exact to their 30 fps timeline slots."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import subprocess
from pathlib import Path


PROJECT = Path(r"C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Учти язык")
INTRO_DIR = PROJECT / "Resources" / "lingman_intro_stock_20260813"
BACKUP_ROOT = Path(r"C:\appsprojects\phraseman\.codex-tmp\capcut-backups")
FRAME_COUNT = 79
FRAME_RATE = 30


def capcut_is_running() -> bool:
    process = subprocess.run(["powershell", "-NoProfile", "-Command", "@(Get-Process CapCut* -ErrorAction SilentlyContinue).Count"], capture_output=True, text=True, check=True)
    return int(process.stdout.strip() or "0") > 0


def probe(path: Path) -> dict:
    process = subprocess.run(
        ["ffprobe", "-v", "error", "-count_frames", "-show_entries", "format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,r_frame_rate,nb_read_frames,duration_ts,time_base", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(process.stdout)


def valid(path: Path) -> bool:
    payload = probe(path)
    streams = payload["streams"]
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    return bool(
        video
        and video.get("codec_name") == "h264"
        and video.get("width") == 1080
        and video.get("height") == 1920
        and video.get("avg_frame_rate") == "30/1"
        and video.get("r_frame_rate") == "30/1"
        and int(video.get("nb_read_frames") or 0) == FRAME_COUNT
        and video.get("time_base") == "1/30000"
        and int(video.get("duration_ts") or 0) == 79_000
        # MP4's container duration is rounded to milliseconds by some muxers.
        # The video stream timing is authoritative: 79 frames at 30 fps.
        and not any(stream.get("codec_type") == "audio" for stream in streams)
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if capcut_is_running():
        raise RuntimeError("CapCut is running; intro asset replacement is forbidden")
    files = [INTRO_DIR / f"{number:03d}.mp4" for number in range(1, 61)]
    if [path.name for path in files if not path.is_file()]:
        raise RuntimeError("one or more current intro files are missing")
    to_fix = [path for path in files if not valid(path)]
    before = [path.name for path in to_fix]
    print(json.dumps({"dryRun": not args.apply, "files": len(files), "alreadyFrameExact": 60 - len(before), "needsNormalization": before}, ensure_ascii=False))
    if not args.apply:
        return
    backup = BACKUP_ROOT / f"Учти язык.before-intro-frame-normalization.{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup.mkdir(parents=True)
    for source in to_fix:
        shutil.copy2(source, backup / source.name)
    for source in to_fix:
        temp = source.with_suffix(".frame-normalize.tmp.mp4")
        temp.unlink(missing_ok=True)
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source), "-an", "-vf", "fps=30", "-frames:v", str(FRAME_COUNT), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-bf", "0", "-pix_fmt", "yuv420p", "-video_track_timescale", "30000", "-movflags", "+faststart", str(temp)],
            check=True,
        )
        if not valid(temp):
            raise RuntimeError(f"normalized clip failed validation: {source.name}")
        temp.replace(source)
    failures = [path.name for path in files if not valid(path)]
    if failures:
        raise RuntimeError(f"post-write validation failed: {failures}")
    print(json.dumps({"applied": True, "backup": str(backup), "frameCount": FRAME_COUNT, "frameRate": FRAME_RATE, "durationSeconds": FRAME_COUNT / FRAME_RATE}, ensure_ascii=False))


if __name__ == "__main__":
    main()
