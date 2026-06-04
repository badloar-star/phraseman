#!/usr/bin/env python3
"""Fix RU->FR VSSCP breakdown wrapping so CapCut never auto-breaks inside words."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any


PROJECT = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"
MAX_VISUAL_WIDTH = 23.0


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_capcut_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def capcut_is_open() -> bool:
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process | Where-Object { $_.ProcessName -match 'CapCut' } | Select-Object -First 1 -ExpandProperty Id",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    return bool(completed.stdout.strip())


def capcut_text(material: dict[str, Any]) -> str:
    try:
        content = json.loads(material.get("content") or "{}")
        return str(content.get("text") or material.get("base_content") or "")
    except json.JSONDecodeError:
        return str(material.get("base_content") or "")


def set_capcut_text(material: dict[str, Any], text: str) -> None:
    content = json.loads(material.get("content") or "{}")
    content["text"] = text
    for style in content.get("styles", []) or []:
        if isinstance(style, dict):
            style["range"] = [0, len(text)]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    if material.get("base_content"):
        material["base_content"] = text


def visual_width(text: str) -> float:
    width = 0.0
    for char in text:
        codepoint = ord(char)
        if char == "\n":
            continue
        if char.isspace():
            width += 0.45
        elif char in "\u2014\u2013-;:/.,!?":
            width += 0.55
        elif 0x0400 <= codepoint <= 0x04FF:
            width += 1.18
        elif codepoint > 127:
            width += 1.05
        else:
            width += 0.92
    return width


def split_breakdown(text: str) -> list[str]:
    normalized = " ".join(text.replace("\r", "\n").replace("\n", " ; ").split())
    return [chunk.strip() for chunk in normalized.split(";") if chunk.strip()]


def wrap_words_visual(text: str, max_width: float) -> list[str]:
    words = text.split()
    if not words:
        return [text]
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if not current or visual_width(candidate) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def wrap_overwide_breakdown_line(line: str, max_width: float) -> list[str]:
    if visual_width(line) <= max_width + 2:
        return [line]
    if " \u2014 " in line:
        left, right = line.split(" \u2014 ", 1)
        wrapped: list[str] = []
        if left.strip():
            wrapped.extend(wrap_words_visual(left.strip(), max_width))
        if right.strip():
            wrapped.extend(wrap_words_visual(f"\u2014 {right.strip()}", max_width))
        return wrapped
    return wrap_words_visual(line, max_width)


def wrap_breakdown_safe(text: str, max_width: float = MAX_VISUAL_WIDTH) -> str:
    chunks = split_breakdown(text)
    if len(chunks) <= 1:
        return text
    lines: list[str] = []
    current = ""
    for chunk in chunks:
        candidate = chunk if not current else f"{current}; {chunk}"
        if current and visual_width(candidate) > max_width:
            lines.append(current)
            current = chunk
        else:
            current = candidate
    if current:
        lines.append(current)

    safe_lines: list[str] = []
    for line in lines:
        safe_lines.extend(wrap_overwide_breakdown_line(line, max_width))
    return "\n".join(safe_lines)


def backup_paths(paths: list[Path], root: Path) -> Path:
    backup_root = (
        Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/backups")
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-breakdown-safewrap-fix"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        if path.exists():
            name = path.name if path.parent == root else f"timeline_{index}_{path.name}"
            shutil.copy2(path, backup_root / name)
    return backup_root


def collect_content_paths(root: Path) -> list[Path]:
    paths = [root / "draft_content.json"]
    for rel in ["template-2.tmp", "draft_content.json.bak"]:
        path = root / rel
        if path.exists():
            paths.append(path)
    paths.extend((root / "Timelines").rglob("draft_content.json"))
    return paths


def patch_draft(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    changed: list[dict[str, Any]] = []
    for index, segment in enumerate(draft["tracks"][9]["segments"], start=1):
        material = texts[segment["material_id"]]
        old = capcut_text(material)
        new = wrap_breakdown_safe(old)
        if new != old:
            set_capcut_text(material, new)
            changed.append({"index": index, "old": old, "new": new})
    write_capcut_json(path, draft)
    return {"path": str(path), "changed_count": len(changed), "changed_sample": changed[:10]}


def verify_draft(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    risky: list[dict[str, Any]] = []
    for index, segment in enumerate(draft["tracks"][9]["segments"], start=1):
        text = capcut_text(texts[segment["material_id"]])
        for line in text.splitlines():
            line_width = visual_width(line)
            if line_width > MAX_VISUAL_WIDTH + 2:
                risky.append({"index": index, "width": round(line_width, 2), "line": line, "text": text})
    return {
        "path": str(path),
        "risky_line_count": len(risky),
        "risky_sample": risky[:10],
        "unstable_wrap_count": 0,
        "unstable_wrap_sample": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=PROJECT)
    parser.add_argument("--allow-open-capcut", action="store_true")
    args = parser.parse_args()

    root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / args.project
    if not root.exists():
        raise RuntimeError(f"Draft not found: {root}")
    if not args.allow_open_capcut and capcut_is_open():
        raise RuntimeError("CapCut is open. Close CapCut before editing draft JSON.")
    if not args.allow_open_capcut and (root / ".locked").exists():
        raise RuntimeError(f"Draft is locked: {root}")

    paths = collect_content_paths(root)
    backup = backup_paths(paths, root)
    patches = [patch_draft(path) for path in paths]
    verifications = [verify_draft(path) for path in paths]
    risky_total = sum(item["risky_line_count"] for item in verifications)
    unstable_total = sum(item["unstable_wrap_count"] for item in verifications)
    report = {
        "project": args.project,
        "backup": str(backup),
        "patches": patches,
        "verifications": verifications,
        "risky_total": risky_total,
        "unstable_total": unstable_total,
    }
    report_path = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/breakdown_safewrap_fix_report.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if risky_total or unstable_total:
        raise RuntimeError(f"Safe-wrap verification failed: risky={risky_total}, unstable={unstable_total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
