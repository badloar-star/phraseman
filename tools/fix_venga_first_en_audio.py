from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any

from generate_venga_openai_audio import ROLE_CONFIG, load_env_file, openai_tts, probe_duration


US = 1_000_000
SOURCE_DRAFT_NAME = os.environ.get("VENGA_SOURCE_DRAFT", "VENGA A1 200 OPENAI BG SEQ LOOP FADEOUT CLEAN")
TARGET_DRAFT_NAME = os.environ.get("VENGA_TARGET_DRAFT", "VENGA A1 200 OPENAI FIRST EN AUDIO FIX")
PHRASE_TEXT = "I wake up early"
TARGET_DURATION_US = 5_966_666
ROLE_TRACKS = {"en1": 11, "en2": 12, "en3": 13}
VOICE_INSTRUCTIONS = {
    "en1": (
        "Speak exactly this English phrase: I wake up early. "
        "Pronounce it as /aɪ weɪk ʌp ˈɜːrli/. Slow, beautiful, clear teacher voice. "
        "Make it confident and audible, not quiet. Say only the phrase, no extra words."
    ),
    "en2": (
        "Speak exactly this English phrase: I wake up early. "
        "Pronounce it as /aɪ weɪk ʌp ˈɜːrli/. Calm medium lesson pace, clear and natural. "
        "Make it confident and audible, not quiet. Say only the phrase, no extra words."
    ),
    "en3": (
        "Speak exactly this English phrase: I wake up early. "
        "Pronounce it as /aɪ weɪk ʌp ˈɜːrli/. Slow learner-friendly pace, not fast. "
        "Make it confident and audible, not quiet. Say only the phrase, no extra words."
    ),
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def unique_draft_dir(root: Path, base_name: str) -> Path:
    candidate = root / base_name
    if not candidate.exists():
        return candidate
    return root / f"{base_name} {time.strftime('%Y%m%d_%H%M%S')}"


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> None:
    now_us = int(time.time() * US)
    project_id = str(uuid.uuid4()).upper()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us

    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    size = folder_size(draft_dir / "Resources")
    meta.update(
        {
            "draft_id": project_id,
            "draft_name": draft_dir.name,
            "draft_fold_path": draft_dir.as_posix(),
            "draft_root_path": draft_dir.parent.as_posix(),
            "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
            "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
            "draft_is_invisible": False,
            "streaming_edit_draft_ready": True,
            "tm_duration": draft["duration"],
            "tm_draft_modified": now_us,
            "draft_timeline_materials_size": size,
            "draft_timeline_materials_size_": size,
            "tm_draft_removed": 0,
        }
    )
    write_json(meta_path, meta)

    root_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_path)
    entry = {
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": size,
        "streaming_edit_draft_ready": True,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": draft["duration"],
    }
    root["all_draft_store"] = [
        entry,
        *[
            item
            for item in root.get("all_draft_store", [])
            if item.get("draft_name") != draft_dir.name
            and Path(str(item.get("draft_fold_path", ""))).as_posix().casefold()
            != draft_dir.as_posix().casefold()
            and item.get("draft_id") != project_id
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_json(root_path, root)


def normalize_audio(raw_path: Path, out_path: Path, duration_us: int = TARGET_DURATION_US) -> None:
    duration = duration_us / US
    out_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(raw_path),
            "-af",
            f"loudnorm=I=-15:LRA=7:TP=-1.0,apad,atrim=0:{duration:.6f},asetpts=N/SR/TB",
            "-ar",
            "48000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(out_path),
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def volume_stats(path: Path) -> dict[str, str]:
    completed = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    stats: dict[str, str] = {}
    for line in completed.stderr.splitlines():
        if "mean_volume:" in line:
            stats["mean_volume"] = line.rsplit("mean_volume:", 1)[1].strip()
        if "max_volume:" in line:
            stats["max_volume"] = line.rsplit("max_volume:", 1)[1].strip()
    return stats


def audio_material_for_track(draft: dict[str, Any], track_index: int) -> dict[str, Any]:
    segment = draft["tracks"][track_index]["segments"][0]
    material_id = segment["material_id"]
    for material in draft["materials"]["audios"]:
        if material.get("id") == material_id:
            return material
    raise SystemExit(f"Audio material not found for track {track_index}: {material_id}")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    env = load_env_file(repo_root)
    api_key = env.get("OPENAI_TTS_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_TTS_API_KEY is required in .env.local")

    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / SOURCE_DRAFT_NAME
    if not source_dir.exists():
        raise SystemExit(f"Source draft does not exist: {source_dir}")
    target_dir = unique_draft_dir(capcut_root, TARGET_DRAFT_NAME)
    shutil.copytree(source_dir, target_dir)

    draft = load_json(target_dir / "draft_content.json")
    before_materials = {
        role: deepcopy(audio_material_for_track(draft, track_index))
        for role, track_index in ROLE_TRACKS.items()
    }

    generated_dir = target_dir / "Resources" / "openai_first_phrase_audio_fix"
    raw_dir = generated_dir / "_raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, Any] = {}
    for role, track_index in ROLE_TRACKS.items():
        raw_path = raw_dir / f"001_{role}_raw.wav"
        final_path = generated_dir / role / "001.wav"
        ROLE_CONFIG[role]["instructions"] = VOICE_INSTRUCTIONS[role]
        openai_tts(
            api_key=api_key,
            role=role,
            text=PHRASE_TEXT,
            path=raw_path,
        )
        normalize_audio(raw_path, final_path)
        material = audio_material_for_track(draft, track_index)
        material["path"] = str(final_path)
        material["name"] = "001.wav"
        material["duration"] = TARGET_DURATION_US
        results[role] = {
            "track": track_index,
            "old_path": before_materials[role].get("path"),
            "new_path": str(final_path),
            "duration_sec": round(probe_duration(final_path), 6),
            "old_volume": volume_stats(Path(before_materials[role]["path"])),
            "new_volume": volume_stats(final_path),
            "voice": {
                "en1": "coral",
                "en2": "cedar",
                "en3": "sage",
            }[role],
            "instructions": VOICE_INSTRUCTIONS[role],
        }

    for rel in ["draft_content.json", "template-2.tmp", "draft_content.json.bak"]:
        path = target_dir / rel
        if path.exists():
            write_json(path, draft)
    timeline_content = target_dir / "Timelines" / draft["id"] / "draft_content.json"
    if timeline_content.exists():
        write_json(timeline_content, draft)
    update_identity_and_register(target_dir, draft)

    template_marker = {
        "template_draft_name": SOURCE_DRAFT_NAME,
        "template_draft_dir": str(source_dir),
        "created_at_unix": int(time.time()),
        "note": "User approved this edited draft as the strict template. Preserve layout, text, audio/compound states, and disabled clips unless explicitly asked.",
    }
    write_json(repo_root / "exports" / "venga-phrase-packs" / "current_capcut_template.json", template_marker)

    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_template": template_marker,
        "changed_audio_tracks": list(ROLE_TRACKS.values()),
        "changed_phrase_index": 1,
        "phrase_text": PHRASE_TEXT,
        "results": results,
    }
    write_json(repo_root / "exports" / "venga-phrase-packs" / "first_en_audio_fix_report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
