#!/usr/bin/env python3
"""Remove UTF-8 BOM from CapCut draft JSON files.

CapCut Desktop can refuse an otherwise valid draft when draft_content.json,
template-2.tmp, or draft_meta_info.json starts with a UTF-8 BOM.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
FILES = ["draft_content.json", "template-2.tmp", "draft_meta_info.json"]
REPORT_PATH = Path("exports/chains/episode1/unique_explanations_approved/repair_capcut_json_bom_report.json")


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq CapCut.exe"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
    )
    return "CapCut.exe" in result.stdout


def backup() -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-bom-repair-{stamp}"
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(DRAFT_DIR, out)
    return out


def strip_bom(path: Path) -> dict[str, object]:
    before = path.read_bytes()
    had_bom = before.startswith(b"\xef\xbb\xbf")
    parsed = json.loads(before.decode("utf-8-sig"))
    text = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    after = path.read_bytes()
    return {
        "file": str(path),
        "had_bom_before": had_bom,
        "has_bom_after": after.startswith(b"\xef\xbb\xbf"),
        "size_before": len(before),
        "size_after": len(after),
        "first_bytes_after": list(after[:4]),
    }


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before removing BOM from draft JSON files.")

    backup_path = backup()
    file_reports = [strip_bom(DRAFT_DIR / name) for name in FILES]
    content = json.loads((DRAFT_DIR / "draft_content.json").read_text(encoding="utf-8"))
    meta = json.loads((DRAFT_DIR / "draft_meta_info.json").read_text(encoding="utf-8"))
    report = {
        "backup": str(backup_path),
        "draft_dir": str(DRAFT_DIR),
        "files": file_reports,
        "draft_content_id": content.get("id"),
        "draft_duration": content.get("duration"),
        "track_count": len(content.get("tracks", [])),
        "meta_tm_duration": meta.get("tm_duration"),
        "cta_tracks": sum(1 for t in content.get("tracks", []) if t.get("name") == "CODEx CTA VENGA SOURCE"),
        "explanation_tracks": [
            t.get("name")
            for t in content.get("tracks", [])
            if str(t.get("name", "")).startswith("CODEx construction explanation")
        ],
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if any(item["has_bom_after"] for item in file_reports):
        raise SystemExit("BOM still present after repair.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
