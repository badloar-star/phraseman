"""Register a staged CapCut project as a new local project without overwriting any draft."""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save_json_atomically(path: Path, value: dict) -> None:
    temporary = path.with_name(f"{path.name}.new-{uuid.uuid4().hex}")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def assert_capcut_closed() -> None:
    result = subprocess.run(["tasklist", "/FO", "CSV", "/NH"], capture_output=True, text=True, errors="replace", check=True)
    if re.search(r'"(?:CapCut|CapCut\.exe|CapCutService\.exe)"', result.stdout, re.IGNORECASE):
        raise RuntimeError("Close CapCut completely before installing; no project was changed.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--staged", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    assert_capcut_closed()
    staged = args.staged.resolve()
    source_draft = staged / "draft_content.json"
    source_meta = staged / "draft_meta_info.json"
    if not source_draft.is_file() or not source_meta.is_file():
        raise SystemExit("Staged project is incomplete; no project was created.")
    draft = load_json(source_draft)
    if draft.get("name") != "DE A1 — Фразы для жизни в Германии":
        raise SystemExit(f"Unexpected staged draft name: {draft.get('name')!r}")

    store = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    index_path = store / "root_meta_info.json"
    registry = load_json(index_path)
    if not isinstance(registry.get("all_draft_store"), list):
        raise SystemExit("CapCut project index format is unknown; no project was created.")
    draft_id = str(uuid.uuid4()).upper()
    stamp = time.strftime("%Y%m%d_%H%M%S")
    destination = store / f"CHAIN_DE_50_FROM_ES_TEMPLATE_{stamp}_{draft_id[:6]}"
    report = {"destination": destination.as_posix(), "existing_projects_untouched": True, "source": staged.as_posix()}
    if args.dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    if destination.exists():
        raise SystemExit("Destination collision; no project was changed.")

    original_index = index_path.read_bytes()
    shutil.copytree(staged, destination)
    try:
        installed_draft = load_json(destination / "draft_content.json")
        # `draft_content.id` is the ID of the on-disk timeline bundle:
        # Timelines/<draft_content.id>.  It must stay exactly as it was in the
        # copied working project.  The unique project-list identity is instead
        # `draft_meta_info.draft_id` below.
        timeline_bundle = destination / "Timelines" / str(installed_draft.get("id", ""))
        if not timeline_bundle.is_dir():
            raise RuntimeError("The staged draft's Timelines bundle does not match draft_content.id.")
        now = int(time.time() * 1_000_000)

        meta = load_json(destination / "draft_meta_info.json")
        meta.update({
            "draft_id": draft_id,
            "draft_name": installed_draft["name"],
            "draft_fold_path": destination.as_posix(),
            "draft_root_path": store.as_posix(),
            # Keep the original null draft_json_file and relative cover form:
            # both are part of the known-working ES project metadata shape.
            "draft_json_file": None,
            "draft_cover": "draft_cover.jpg",
            "tm_draft_create": now,
            "tm_draft_modified": now,
            "tm_duration": installed_draft["duration"],
            "draft_timeline_materials_size_": sum(file.stat().st_size for file in destination.rglob("*") if file.is_file()),
        })
        save_json_atomically(destination / "draft_meta_info.json", meta)

        if index_path.read_bytes() != original_index:
            raise RuntimeError("CapCut project list changed during installation; destination is preserved but was not registered.")
        entry = copy.deepcopy(registry["all_draft_store"][0]) if registry["all_draft_store"] else {}
        for key in list(entry):
            if "cloud" in key:
                entry[key] = False if isinstance(entry[key], bool) else (-1 if isinstance(entry[key], int) else "")
        entry.update(meta)
        entry["draft_timeline_materials_size"] = meta["draft_timeline_materials_size_"]
        entry["draft_is_invisible"] = False
        entry["draft_need_rename_folder"] = False
        registry["all_draft_store"] = [entry] + registry["all_draft_store"]
        if isinstance(registry.get("draft_ids"), list):
            registry["draft_ids"] = [draft_id] + registry["draft_ids"]
        backup = index_path.with_name(f"root_meta_info.before_DE_template_copy_{stamp}_{draft_id[:6]}.json")
        backup.write_bytes(original_index)
        save_json_atomically(index_path, registry)
    except Exception:
        raise
    report.update({"draft_id": draft_id, "index_backup": backup.as_posix()})
    # Windows terminals may still use cp1252; the report must never make a
    # completed installation look failed merely because its project name is
    # Russian.
    print(json.dumps(report, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
