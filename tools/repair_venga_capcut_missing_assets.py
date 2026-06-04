from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any


SFX_SOURCES = {
    "01_main.mp3": Path(r"C:\Users\badlo\OneDrive\Desktop\MySADfolder\PROJECTS\ENGLISHHUB\sound effect\01_main.mp3"),
    "Riser.wav": Path(r"C:\Users\badlo\OneDrive\Desktop\MySADfolder\PROJECTS\ENGLISHHUB\sound effect\Riser.wav"),
    "Zoom 4.wav": Path(r"C:\Users\badlo\Downloads\Zoom 4.wav"),
    "Rising Sparkly Air Whoosh.wav": Path(
        r"C:\Users\badlo\OneDrive\Desktop\MySADfolder\PROJECTS\ENGLISHHUB\sound effect\Rising Sparkly Air Whoosh\Rising Sparkly Air Whoosh.wav"
    ),
    "Zoom 1.wav": Path(r"C:\Users\badlo\OneDrive\Desktop\MySADfolder\PROJECTS\ENGLISHHUB\sound effect\zoom\Zoom 1.wav"),
    "Zoom 4.mp3": Path(r"C:\Users\badlo\OneDrive\Desktop\MySADfolder\PROJECTS\ENGLISHHUB\sound effect\zoom\Zoom 4.mp3"),
    "Zoom 5.wav": Path(r"C:\Users\badlo\OneDrive\Desktop\MySADfolder\PROJECTS\ENGLISHHUB\sound effect\zoom\Zoom 5.wav"),
    "Zoom 5.mp3": Path(r"C:\Users\badlo\OneDrive\Desktop\MySADfolder\PROJECTS\ENGLISHHUB\sound effect\zoom\Zoom 5.mp3"),
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def copy_sfx(draft_dir: Path) -> dict[str, Path]:
    target_root = draft_dir / "Resources" / "venga_template_sfx"
    target_root.mkdir(parents=True, exist_ok=True)
    copied: dict[str, Path] = {}
    for name, src in SFX_SOURCES.items():
        if not src.exists():
            raise SystemExit(f"Missing SFX source: {src}")
        dst = target_root / name
        shutil.copy2(src, dst)
        copied[name.casefold()] = dst
    return copied


def patch_paths(value: Any, sfx: dict[str, Path], matting_dir: Path) -> int:
    changed = 0
    if isinstance(value, dict):
        for key, child in list(value.items()):
            if key == "path" and isinstance(child, str):
                filename = Path(child.replace("\\", "/")).name.casefold()
                if filename in sfx and not Path(child.replace("\\", "/")).exists():
                    value[key] = str(sfx[filename])
                    changed += 1
                elif "INTRO MEGATRONULTRA3000/matting" in child.replace("\\", "/") and not Path(child.replace("\\", "/")).exists():
                    value[key] = str(matting_dir)
                    changed += 1
            changed += patch_paths(child, sfx, matting_dir)
    elif isinstance(value, list):
        for child in value:
            changed += patch_paths(child, sfx, matting_dir)
    return changed


def collect_missing_paths(draft: Any) -> list[str]:
    missing: list[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "path" and isinstance(child, str) and (":" in child or child.startswith("/")):
                    first_path = child.split(";")[0]
                    if not Path(first_path.replace("\\", "/")).exists():
                        missing.append(child)
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(draft)
    return missing


def quarantine_corrupt_video_alg(draft_dir: Path, draft: Any) -> dict[str, int]:
    referenced_names: set[str] = set()

    def clear_bad_refs(value: Any) -> int:
        changed = 0
        if isinstance(value, dict):
            video_algorithm = value.get("video_algorithm")
            if isinstance(video_algorithm, dict):
                path = str(video_algorithm.get("path") or "")
                name = Path(path.replace("\\", "/")).name
                if name:
                    referenced_names.add(name)
                    full_path = draft_dir / "Resources" / "videoAlg" / name
                    if full_path.exists() and not ffprobe_ok(full_path):
                        video_algorithm["path"] = ""
                        video_algorithm["algorithms"] = []
                        changed += 1
            for child in value.values():
                changed += clear_bad_refs(child)
        elif isinstance(value, list):
            for child in value:
                changed += clear_bad_refs(child)
        return changed

    cleared_refs = clear_bad_refs(draft)
    quarantine = draft_dir / "corrupt_resource_quarantine"
    quarantine.mkdir(parents=True, exist_ok=True)
    moved = 0
    for path in (draft_dir / "Resources" / "videoAlg").glob("*.mp4"):
        if not ffprobe_ok(path):
            shutil.move(str(path), str(quarantine / path.name))
            moved += 1
    return {"cleared_video_algorithm_refs": cleared_refs, "moved_corrupt_mp4": moved}


def ffprobe_ok(path: Path) -> bool:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.returncode == 0


def update_sizes(draft_dir: Path) -> None:
    size = folder_size(draft_dir / "Resources")
    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    meta["draft_timeline_materials_size"] = size
    meta["draft_timeline_materials_size_"] = size
    write_json(meta_path, meta)

    root_path = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / "root_meta_info.json"
    root = load_json(root_path)
    for item in root.get("all_draft_store", []):
        if item.get("draft_name") == draft_dir.name or Path(str(item.get("draft_fold_path", ""))).as_posix().casefold() == draft_dir.as_posix().casefold():
            item["draft_timeline_materials_size"] = size
            item["draft_timeline_materials_size_"] = size
    write_json(root_path, root)


def main() -> None:
    report_path = Path("exports/venga-phrase-packs/capcut_project_build_report.json")
    report = load_json(report_path)
    draft_dir = Path(report["draft_dir"])
    draft_path = draft_dir / "draft_content.json"
    draft = load_json(draft_path)

    matting_dir = draft_dir / "matting" / "venga_intro_placeholder"
    matting_dir.mkdir(parents=True, exist_ok=True)
    sfx = copy_sfx(draft_dir)
    changed = patch_paths(draft, sfx, matting_dir)
    corrupt_report = quarantine_corrupt_video_alg(draft_dir, draft)

    for rel in ["draft_content.json", "template-2.tmp", "draft_content.json.bak"]:
        path = draft_dir / rel
        if path.exists():
            write_json(path, draft)
    timeline_content = draft_dir / "Timelines" / draft["id"] / "draft_content.json"
    if timeline_content.exists():
        write_json(timeline_content, draft)
    update_sizes(draft_dir)

    missing = collect_missing_paths(draft)
    repair_report = {
        "draft_name": draft_dir.name,
        "draft_dir": str(draft_dir),
        "changed_paths": changed,
        **corrupt_report,
        "missing_paths": len(missing),
        "missing_path_samples": missing[:12],
    }
    out = Path("exports/venga-phrase-packs/capcut_project_repair_report.json")
    write_json(out, repair_report)
    print(json.dumps(repair_report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
