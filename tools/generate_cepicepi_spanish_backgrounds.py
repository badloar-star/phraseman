#!/usr/bin/env python3
"""Download and render phrase-specific stock backgrounds for Spanish-Russian Cepicepi."""

from __future__ import annotations

import importlib.util
import json
import shutil
from pathlib import Path


BASE_PATH = Path(__file__).with_name("generate_cepicepi_next_backgrounds.py")
SPEC = importlib.util.spec_from_file_location("base_bg", BASE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("cannot load base background generator")
base_bg = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(base_bg)


OUT = Path("exports/chains/cepicepi_spanish_ru_a1_20260605")
ROWS_PATH = OUT / "spanish_chains_100.json"
BG_DIR = OUT / "semantic_backgrounds"
SOURCE_DIR = BG_DIR / "source_videos"
RENDER_DIR = BG_DIR / "rendered_1920x1080"
QUERY_CACHE = BG_DIR / "stock_query_cache.json"
REPORT_PATH = BG_DIR / "background_generation_report.json"
CONTACT_SHEET = BG_DIR / "contact_sheet_mid.jpg"


def generate() -> dict:
    base_bg.OUT = OUT
    base_bg.ROWS_PATH = ROWS_PATH
    base_bg.BG_DIR = BG_DIR
    base_bg.SOURCE_DIR = SOURCE_DIR
    base_bg.RENDER_DIR = RENDER_DIR
    base_bg.QUERY_CACHE = QUERY_CACHE
    base_bg.REPORT_PATH = REPORT_PATH
    base_bg.CONTACT_SHEET = CONTACT_SHEET

    rows = json.loads(ROWS_PATH.read_text(encoding="utf-8"))
    english_rows = []
    for row in rows:
        # Reuse the robust stock downloader by giving it a semantic English query
        # while preserving the Spanish/Russian row data in the final report.
        english_rows.append({**row, "english": row["spanish"]})
    tmp_rows = OUT / "_background_rows_tmp.json"
    tmp_rows.write_text(json.dumps(english_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    base_bg.ROWS_PATH = tmp_rows
    try:
        report = base_bg.generate()
    finally:
        tmp_rows.unlink(missing_ok=True)
    return report


def make_contact_sheet() -> Path:
    base_bg.OUT = OUT
    base_bg.REPORT_PATH = REPORT_PATH
    base_bg.CONTACT_SHEET = CONTACT_SHEET
    return base_bg.make_contact_sheet()


def main() -> None:
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in {"generate", "all"}:
        if BG_DIR.exists() and "--fresh" in sys.argv:
            shutil.rmtree(BG_DIR)
        print(json.dumps(generate(), ensure_ascii=False, indent=2), flush=True)
    if mode in {"sheet", "all"}:
        print(make_contact_sheet())


if __name__ == "__main__":
    main()
