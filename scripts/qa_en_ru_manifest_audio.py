#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Offline transcript QA for the EN/RU ElevenLabs manifest audio.

Checks each numbered MP3 against the exact text in the supplied manifest using
the locally installed whisper.cpp model. It never calls a network service or
spends API credits. Failed/empty recognitions are written as a small JSON list
that can be passed to the targeted regeneration step.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path


def normal(text: str) -> str:
    value = unicodedata.normalize("NFKD", text).casefold().replace("’", "'")
    return re.sub(r"[^\w']+", " ", value, flags=re.UNICODE).strip()


def local_whisper_command() -> list[str]:
    root = Path.home() / ".local" / "share" / "whisper.cpp"
    executable = root / "v1.8.6" / "Release" / "whisper-cli.exe"
    model = root / "models" / "ggml-base.bin"
    if not executable.is_file() or not model.is_file():
        raise RuntimeError("Direct local whisper.cpp executable or model is unavailable.")
    return [str(executable), "-m", str(model)]


def transcribe_batch(command: list[str], language: str, audios: list[Path]) -> list[str]:
    # whisper.cpp on this Windows installation receives non-ASCII paths through
    # a legacy argv path incorrectly. Copy each short clip to an ASCII temp name
    # before invoking it; the source file remains untouched.
    safe_dir = Path(tempfile.gettempdir()) / "en_ru_manifest_whisper_qa"
    safe_dir.mkdir(exist_ok=True)
    safe_audios: list[Path] = []
    for offset, audio in enumerate(audios, 1):
        safe_audio = safe_dir / f"{language}_{offset:03d}{audio.suffix.lower()}"
        shutil.copyfile(audio, safe_audio)
        safe_audios.append(safe_audio)
    completed = subprocess.run(
        [*command, "-nt", "-np", "-l", language, *(str(path) for path in safe_audios)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=90,
    )
    if completed.returncode:
        raise RuntimeError((completed.stderr or completed.stdout).strip()[-600:])
    lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
    if len(lines) != len(audios):
        raise RuntimeError(f"Whisper returned {len(lines)} transcripts for {len(audios)} files.")
    return lines


def verdict(expected: str, actual: str) -> tuple[bool, float, str]:
    want, heard = normal(expected), normal(actual)
    if not heard:
        return False, 0.0, "empty_or_non_speech"
    ratio = SequenceMatcher(None, want, heard).ratio()
    # Exact phrase containment accommodates terminal punctuation and a small
    # amount of Whisper's harmless casing/spacing variance.
    if want in heard or heard in want or ratio >= 0.82:
        return True, ratio, "match"
    return False, ratio, "transcript_mismatch"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("template", type=Path)
    parser.add_argument("--limit", type=int, default=0, help="diagnostic cap per language; 0 means all 600")
    args = parser.parse_args()
    manifest = args.template / "ELEVENLABS_BATCH_MANIFEST.csv"
    if not manifest.is_file():
        raise RuntimeError("Manifest is unavailable.")
    whisper = local_whisper_command()
    rows = list(csv.DictReader(manifest.open(encoding="utf-8-sig")))
    if len(rows) != 600:
        raise RuntimeError(f"Expected 600 manifest rows, found {len(rows)}.")
    report: list[dict[str, object]] = []
    bad: dict[str, list[int]] = {"en": [], "ru": []}
    for code, folder, column, language in (("en", "2", "english", "en"), ("ru", "1", "russian", "ru")):
        selected = rows[:args.limit] if args.limit else rows
        for start in range(0, len(selected), 25):
            batch_rows = selected[start:start + 25]
            batch_audios = [args.template / folder / f"{start + offset + 1:04d}.mp3" for offset in range(len(batch_rows))]
            if all(audio.is_file() for audio in batch_audios):
                try:
                    transcripts = transcribe_batch(whisper, language, batch_audios)
                except Exception as error:
                    transcripts = [f"__ERROR__{error}"] * len(batch_rows)
            else:
                transcripts = ["__MISSING__" if not audio.is_file() else "__BATCH_MISSING__" for audio in batch_audios]
            for offset, (row, actual) in enumerate(zip(batch_rows, transcripts), start + 1):
                if actual.startswith("__MISSING__"):
                    passed, ratio, actual, reason = False, 0.0, "", "missing_file"
                elif actual.startswith("__"):
                    passed, ratio, actual, reason = False, 0.0, "", f"transcription_error: {actual[2:]}"
                else:
                    passed, ratio, reason = verdict(row[column], actual)
                report.append({"language": code, "index": offset, "expected": row[column], "actual": actual, "ratio": round(ratio, 3), "status": reason})
                if not passed:
                    bad[code].append(offset)
            print(f"[{code}] {start + len(batch_rows)}/{len(selected)} bad={len(bad[code])}", flush=True)
    (args.template / "ELEVENLABS_AUDIO_TRANSCRIPT_QA.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.template / "ELEVENLABS_AUDIO_REGENERATE.json").write_text(json.dumps(bad, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"FINAL en_bad={len(bad['en'])} ru_bad={len(bad['ru'])} report=ELEVENLABS_AUDIO_TRANSCRIPT_QA.json")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(2)
