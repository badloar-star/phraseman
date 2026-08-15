"""Replace only the DEUTSCH_1 intro helper copy across its 60 intro slots."""

from __future__ import annotations

import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


PROJECT = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / "DEUTSCH_1"
BACKUPS = Path(r"C:\appsprojects\phraseman\.codex-tmp\capcut-backups")
COPY = "Watch it twice\nto remember more."


def capcut_running() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "@(Get-Process -Name CapCut -ErrorAction SilentlyContinue).Count"],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(result.stdout.strip() or "0") > 0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def main() -> int:
    if capcut_running():
        raise RuntimeError("CapCut is running")
    root = PROJECT / "draft_content.json"
    before = root.read_bytes()
    draft = json.loads(before.decode("utf-8"))
    mirrors = [
        root,
        PROJECT / "template-2.tmp",
        PROJECT / "Timelines" / str(draft["id"]) / "draft_content.json",
        PROJECT / "Timelines" / str(draft["id"]) / "template-2.tmp",
    ]
    if any(not path.is_file() or path.read_bytes() != before for path in mirrors):
        raise RuntimeError("Native draft mirrors are not byte-identical before patch")
    track = draft["tracks"][5]
    if track.get("type") != "text" or track.get("name") != "INTRO INFO" or len(track.get("segments", [])) != 60:
        raise RuntimeError("INTRO INFO track contract failed")
    text_map = {str(item["id"]): item for item in draft["materials"]["texts"]}
    ids = [str(segment["material_id"]) for segment in track["segments"]]
    if len(ids) != 60 or len(set(ids)) != 60:
        raise RuntimeError("INTRO INFO must reference 60 unique text materials")
    allowed = copy.deepcopy(draft)
    for item in allowed["materials"]["texts"]:
        if str(item.get("id")) in ids:
            item["content"] = "__ALLOWED_INTRO_INFO_TEXT__"
    for material_id in ids:
        material = text_map[material_id]
        content = json.loads(material["content"])
        content["text"] = COPY
        for style in content.get("styles", []):
            if isinstance(style, dict) and "range" in style:
                style["range"] = [0, len(COPY)]
        material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    after_allowed = copy.deepcopy(draft)
    for item in after_allowed["materials"]["texts"]:
        if str(item.get("id")) in ids:
            item["content"] = "__ALLOWED_INTRO_INFO_TEXT__"
    if json.dumps(allowed, sort_keys=True, ensure_ascii=False) != json.dumps(after_allowed, sort_keys=True, ensure_ascii=False):
        raise RuntimeError("Patch would change a field outside INTRO INFO text")
    payload = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    backup = BACKUPS / f"DEUTSCH_1.before-intro-info-copy.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup.mkdir(parents=True, exist_ok=False)
    for source in mirrors:
        target = backup / source.relative_to(PROJECT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    for path in mirrors:
        temporary = path.with_name(f"{path.name}.intro-copy-new")
        temporary.write_bytes(payload)
        temporary.replace(path)
    if any(path.read_bytes() != payload for path in mirrors):
        raise RuntimeError("Native draft mirrors differ after patch")
    print(json.dumps({"status": "applied", "copy": COPY.replace("\n", " "), "slots": 60, "backup": str(backup), "mirrorSha256": sha256(root)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
