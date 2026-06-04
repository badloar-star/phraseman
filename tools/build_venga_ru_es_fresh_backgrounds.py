#!/usr/bin/env python3
"""Build a fresh semantic background copy for the RU->ES Venga draft."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def load_de_background_builder():
    module_path = Path("tools/build_venga_ru_de_user_template_new_backgrounds.py")
    spec = importlib.util.spec_from_file_location("ru_de_bg_builder", module_path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    builder = load_de_background_builder()
    builder.BASE_TARGET = "VENGA_ES_200_0601"
    builder.TARGET_DRAFT = "VENGA_ES_200_0601_FRESHBG"
    builder.PACK_DIR = Path("exports/venga-phrase-packs/ru-es-a1-vsscp")
    builder.OUT_SUBDIR = "venga_ru_es_fresh_semantic_bg"
    builder.OLD_BACKGROUND_TOKENS = tuple(
        set(builder.OLD_BACKGROUND_TOKENS)
        | {
            "venga_ru_de_fresh_semantic_bg",
            "venga_ru_es_fresh_semantic_bg",
            "venga_ru_fr",
        }
    )
    return builder.main()


if __name__ == "__main__":
    raise SystemExit(main())
