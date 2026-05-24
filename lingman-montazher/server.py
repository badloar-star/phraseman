from __future__ import annotations

import argparse
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


ROOT = Path(__file__).resolve().parent
INPUT_DIR = ROOT / "input"
ALLOWED_VIDEO_SUFFIXES = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}


class ReviewDeskHandler(BaseHTTPRequestHandler):
    server_version = "LingmanMontazher/0.1"

    def do_GET(self) -> None:
        path = self.route_path()
        if path == "/":
            self.send_redirect("/review-desk/")
            return
        self.serve_file(path)

    def do_PUT(self) -> None:
        path = self.route_path()
        if path != "/api/upload-video":
            self.send_error(404, "Unknown endpoint")
            return
        self.save_video_upload()

    def route_path(self) -> str:
        return unquote(urlparse(self.path).path)

    def send_redirect(self, target: str) -> None:
        self.send_response(302)
        self.send_header("Location", target)
        self.end_headers()

    def serve_file(self, route: str) -> None:
        relative = route.lstrip("/")
        if relative.endswith("/"):
            relative += "index.html"
        target = (ROOT / relative).resolve()
        if not str(target).startswith(str(ROOT.resolve())):
            self.send_error(403, "Forbidden")
            return
        if not target.is_file():
            self.send_error(404, "File not found")
            return

        content_type, _ = mimetypes.guess_type(target.name)
        self.send_response(200)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(target.stat().st_size))
        self.end_headers()
        with target.open("rb") as handle:
            self.wfile.write(handle.read())

    def save_video_upload(self) -> None:
        parsed = urlparse(self.path)
        raw_name = parse_qs(parsed.query).get("name", ["raw.mp4"])[0]
        safe_name = sanitize_filename(raw_name)
        suffix = Path(safe_name).suffix.lower()
        if suffix not in ALLOWED_VIDEO_SUFFIXES:
            self.send_json({"error": f"Unsupported video suffix: {suffix}"}, status=400)
            return

        length = self.headers.get("Content-Length")
        if length is None:
            self.send_json({"error": "Missing Content-Length"}, status=411)
            return
        size = int(length)
        if size <= 0:
            self.send_json({"error": "Uploaded video is empty"}, status=400)
            return
        INPUT_DIR.mkdir(parents=True, exist_ok=True)
        target = unique_path(INPUT_DIR / safe_name)

        remaining = size
        with target.open("wb") as handle:
            while remaining > 0:
                chunk = self.rfile.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                handle.write(chunk)
                remaining -= len(chunk)

        if remaining != 0:
            target.unlink(missing_ok=True)
            self.send_json({"error": "Upload ended before all bytes were received"}, status=400)
            return

        self.send_json(
            {
                "savedAs": str(target.relative_to(ROOT)).replace("\\", "/"),
                "bytes": size,
            }
        )

    def send_json(self, payload: dict[str, object], status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")


def sanitize_filename(name: str) -> str:
    candidate = Path(name).name.strip() or "raw.mp4"
    cleaned = "".join(char if char.isalnum() or char in "._- " else "_" for char in candidate)
    return cleaned[:160] or "raw.mp4"


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    for index in range(2, 1000):
        candidate = path.with_name(f"{stem}-{index}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"Could not find unique filename for {path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4179)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), ReviewDeskHandler)
    print(f"Lingman Montazher Review Desk: http://{args.host}:{args.port}/review-desk/")
    server.serve_forever()


if __name__ == "__main__":
    main()
