"""Build 60 unique, licensed abstract intro clips from Mixkit stock video.

The script never touches CapCut. It keeps only normalized final MP4s and a
manifest in the requested output folder; the full-size source is removed after
each successful transcode so the desktop is not filled with redundant media.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import argparse
from pathlib import Path


OUTPUT = Path(r"C:\Users\badlo\Desktop\LINGMAN_INTRO_60_9x16")
CATALOGUE = "https://mixkit.co/free-stock-video/discover/abstract-background/?orientation=vertical"
LICENSE_URL = "https://mixkit.co/license/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0 Safari/537.36"
TARGET_COUNT = 60
TARGET_DURATION = 2.63

INCLUDE = re.compile(
    r"abstract|liquid|neon|light|glow|bokeh|bubble|ink|smoke|space|nebula|"
    r"galaxy|fabric|gradient|reflection|swirl|acrylic|colorful|turquoise|"
    r"psychedelic|figures|background|texture|drops|substance|rain", re.I
)
EXCLUDE = re.compile(
    r"girl|woman|man|couple|person|people|dancer|dance|baby|animal|bird|"
    r"beach|coast|mangrove|waterfall|flower|forest|tree|cat|dog|face|hand|"
    r"food|drink|city|car|road|house|green-screen|avenue|shoes|heart", re.I
)


def fetch_text(url: str, referer: str | None = None) -> str:
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    if referer:
        headers["Referer"] = referer
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8", errors="replace")


def download(url: str, target: Path, referer: str) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Referer": referer})
    with urllib.request.urlopen(request, timeout=180) as response, target.open("wb") as output:
        shutil.copyfileobj(response, output, length=1024 * 1024)


def run(command: list[str]) -> str:
    completed = subprocess.run(command, check=True, text=True, capture_output=True)
    return completed.stdout.strip()


def probe(path: Path) -> dict:
    payload = run([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_name,codec_type,width,height", "-of", "json", str(path),
    ])
    return json.loads(payload)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def catalogue_items() -> list[tuple[str, str]]:
    found: dict[str, str] = {}
    for page in range(1, 6):
        url = CATALOGUE if page == 1 else f"{CATALOGUE}&page={page}"
        html = fetch_text(url)
        for slug, asset_id in re.findall(r'href="(/free-stock-video/[^"?#]+-(\d+)/)"', html, re.I):
            if INCLUDE.search(slug) and not EXCLUDE.search(slug):
                found[asset_id] = slug
        time.sleep(0.75)
    return [(asset_id, found[asset_id]) for asset_id in sorted(found, key=int)]


def direct_download_url(asset_id: str, detail_url: str) -> str:
    modal_url = f"https://mixkit.co/free-stock-video/download/{asset_id}/?context=sidebar&type=1080p"
    html = fetch_text(modal_url, detail_url)
    match = re.search(r'data-download--modal-url-value="([^"]+)"', html)
    if not match:
        raise RuntimeError("Mixkit did not return a direct Full HD asset URL")
    return match.group(1).replace("&amp;", "&")


def render(source: Path, target: Path) -> None:
    # Fill 9:16 without distortion. Video is deliberately muted for the spoken intro.
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", "0.30", "-i", str(source),
        "-t", f"{TARGET_DURATION:.2f}", "-vf",
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(target),
    ])


def validate_final(path: Path) -> dict:
    info = probe(path)
    streams = info.get("streams", [])
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    if not video or video.get("codec_name") != "h264":
        raise RuntimeError("final clip is not H.264 video")
    if video.get("width") != 1080 or video.get("height") != 1920:
        raise RuntimeError("final clip is not 1080x1920")
    if any(stream.get("codec_type") == "audio" for stream in streams):
        raise RuntimeError("final clip unexpectedly contains audio")
    duration = float(info["format"]["duration"])
    if not 2.58 <= duration <= 2.68:
        raise RuntimeError(f"final duration {duration:.3f}s is outside tolerance")
    return {"duration_seconds": round(duration, 3), "width": 1080, "height": 1920, "codec": "h264"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=TARGET_COUNT)
    args = parser.parse_args()
    if args.batch_size < 1:
        raise ValueError("--batch-size must be positive")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    temp = OUTPUT / ".source-tmp"
    temp.mkdir(exist_ok=True)
    manifest_path = OUTPUT / "manifest.json"
    manifest = {
        "project": "Lingman intro pack",
        "license": "Mixkit Stock Video Free License",
        "license_url": LICENSE_URL,
        "target_spec": {"count": TARGET_COUNT, "duration_seconds": TARGET_DURATION, "resolution": "1080x1920", "codec": "H.264", "audio": False},
        "clips": [],
    }
    if manifest_path.exists():
        previous = json.loads(manifest_path.read_text(encoding="utf-8"))
        clips = previous.get("clips", [])
        valid = []
        for clip in clips:
            final = OUTPUT / str(clip.get("file", ""))
            if final.exists() and clip.get("sha256") == sha256(final):
                valid.append(clip)
        manifest["clips"] = valid
    # An orphan can be left if the shell terminates between ffmpeg and manifest write.
    expected = {f"{int(clip['index']):03d}.mp4" for clip in manifest["clips"]}
    for candidate in OUTPUT.glob("[0-9][0-9][0-9].mp4"):
        if candidate.name not in expected:
            candidate.unlink()
    candidates = catalogue_items()
    used_ids = {str(clip["source_asset_id"]) for clip in manifest["clips"]}
    stop_at = min(TARGET_COUNT, len(manifest["clips"]) + args.batch_size)
    for asset_id, slug in candidates:
        if len(manifest["clips"]) >= stop_at:
            break
        if asset_id in used_ids:
            continue
        number = len(manifest["clips"]) + 1
        detail_url = f"https://mixkit.co{slug}"
        source = temp / f"{number:03d}-{asset_id}.mp4"
        final = OUTPUT / f"{number:03d}.mp4"
        try:
            direct = direct_download_url(asset_id, detail_url)
            download(direct, source, detail_url)
            source_info = probe(source)
            render(source, final)
            verified = validate_final(final)
            manifest["clips"].append({
                "index": number,
                "file": final.name,
                "source_provider": "Mixkit",
                "source_page": detail_url,
                "source_asset_id": asset_id,
                "license": "Mixkit Stock Video Free License",
                "source_resolution": next(
                    (f"{s.get('width')}x{s.get('height')}" for s in source_info.get("streams", []) if s.get("codec_type") == "video"),
                    None,
                ),
                **verified,
                "sha256": sha256(final),
            })
            used_ids.add(asset_id)
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"OK {number:03d}/{TARGET_COUNT} {asset_id}", flush=True)
        except Exception as error:
            final.unlink(missing_ok=True)
            print(f"SKIP {asset_id}: {error}", flush=True)
        finally:
            source.unlink(missing_ok=True)
        time.sleep(0.8)
    temp.rmdir() if temp.exists() and not any(temp.iterdir()) else None
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"BATCH_DONE {len(manifest['clips'])}/{TARGET_COUNT} clips: {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
