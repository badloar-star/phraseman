#!/usr/bin/env python3
"""Build a real-b-roll OpenAI-voiced CapCut draft for the old phones documentary."""

from __future__ import annotations

import json
import os
import random
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import build_old_phones_capcut_mvp as base  # noqa: E402


DRAFT_NAME = "OLD_PHONES_DOC_REAL_BROLL_OPENAI_0529"
OUT_DIR = ROOT / "exports" / "old-phones-doc-real-broll-openai"
RAW_DIR = OUT_DIR / "source_downloads"
VOICE_DIR = OUT_DIR / "openai_voice"


@dataclass(frozen=True)
class RealScene:
    slug: str
    start: float
    duration: float
    title: str
    callout: str
    source_title: str
    page_url: str
    source_start: float


REAL_SCENES = [
    RealScene(
        "01_hook_old_phone",
        0.0,
        20.0,
        "ÐžÐ½ Ð¶Ðµ Ñ€Ð°Ð½ÑŒÑˆÐµ Ð»ÐµÑ‚Ð°Ð».",
        "Ð¡Ñ‚Ð°Ñ€Ñ‹Ð¹ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð² Ð½Ð¾Ð²Ð¾Ð¼ Ñ†Ð¸Ñ„Ñ€Ð¾Ð²Ð¾Ð¼ Ð¼Ð¸Ñ€Ðµ",
        "Smartphone, close up - Free Stock Video",
        "https://mixkit.co/free-stock-video/smartphone-close-up-1789/",
        0.0,
    ),
    RealScene(
        "02_apps_heavier",
        20.0,
        45.0,
        "ÐŸÑ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ ÑÑ‚Ð°Ð»Ð¸ Ñ‚ÑÐ¶ÐµÐ»ÐµÐµ",
        "Ð’Ð¸Ð´ÐµÐ¾, ÐºÑÑˆ, Ñ€ÐµÐºÐ»Ð°Ð¼Ð°, Ñ„ÑƒÐ½ÐºÑ†Ð¸Ð¸",
        "Hands of a person typing on a cell phone - Free Stock Video",
        "https://mixkit.co/free-stock-video/hands-of-a-person-typing-on-a-cell-phone-4915/",
        8.0,
    ),
    RealScene(
        "03_storage_and_files",
        65.0,
        45.0,
        "ÐŸÐ°Ð¼ÑÑ‚ÑŒ Ð¿Ð¾Ñ‡Ñ‚Ð¸ Ð·Ð°Ð±Ð¸Ñ‚Ð°",
        "Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½Ñƒ Ð½ÑƒÐ¶Ð½Ð¾ Ñ€Ð°Ð±Ð¾Ñ‡ÐµÐµ Ð¿Ñ€Ð¾ÑÑ‚Ñ€Ð°Ð½ÑÑ‚Ð²Ð¾",
        "Person on social media while serving coffee - Free Stock Video",
        "https://mixkit.co/free-stock-video/person-on-social-media-while-serving-coffee-4919/",
        0.0,
    ),
    RealScene(
        "04_battery_and_parts",
        110.0,
        45.0,
        "Ð‘Ð°Ñ‚Ð°Ñ€ÐµÑ ÑÑ‚Ð°Ñ€ÐµÐµÑ‚",
        "Ð¡Ð¸ÑÑ‚ÐµÐ¼Ð° Ð½Ð°Ñ‡Ð¸Ð½Ð°ÐµÑ‚ Ð¾ÑÑ‚Ð¾Ñ€Ð¾Ð¶Ð½Ð¸Ñ‡Ð°Ñ‚ÑŒ",
        "Phone on round end table - Free Stock Video",
        "https://mixkit.co/free-stock-video/phone-on-round-end-table-248/",
        3.0,
    ),
    RealScene(
        "05_heat_and_limits",
        155.0,
        45.0,
        "Throttling",
        "Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½ ÑÐ½Ð¸Ð¶Ð°ÐµÑ‚ ÑÐºÐ¾Ñ€Ð¾ÑÑ‚ÑŒ, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð½Ðµ Ð¿ÐµÑ€ÐµÐ³Ñ€ÐµÑ‚ÑŒÑÑ",
        "Programmer using his cell phone while working at his desk - Free Stock Video",
        "https://mixkit.co/free-stock-video/programmer-using-his-cell-phone-while-working-at-his-desk-41638/",
        4.0,
    ),
    RealScene(
        "06_expectations_now",
        200.0,
        50.0,
        "ÐžÐ¶Ð¸Ð´Ð°Ð½Ð¸Ñ Ñ‚Ð¾Ð¶Ðµ Ð¾Ð±Ð½Ð¾Ð²Ð¸Ð»Ð¸ÑÑŒ",
        "Ð¢Ð¾, Ñ‡Ñ‚Ð¾ Ñ€Ð°Ð½ÑŒÑˆÐµ Ð±Ñ‹Ð»Ð¾ Ð½Ð¾Ñ€Ð¼Ð¾Ð¹, Ñ‚ÐµÐ¿ÐµÑ€ÑŒ ÐºÐ°Ð¶ÐµÑ‚ÑÑ Ð»Ð°Ð³Ð¾Ð¼",
        "Young man sitting scrolling on his cell phone - Free Stock Video",
        "https://mixkit.co/free-stock-video/young-man-sitting-scrolling-on-his-cell-phone-4801/",
        5.0,
    ),
    RealScene(
        "07_fix_it",
        250.0,
        60.0,
        "Ð§Ñ‚Ð¾ Ð¼Ð¾Ð¶Ð½Ð¾ ÑÐ´ÐµÐ»Ð°Ñ‚ÑŒ",
        "ÐŸÐ°Ð¼ÑÑ‚ÑŒ, Ð±Ð°Ñ‚Ð°Ñ€ÐµÑ, Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ, Ð¶Ð°Ñ€Ð°",
        "Hands shown texting on a smartphone - Free Stock Video",
        "https://mixkit.co/free-stock-video/hands-shown-texting-on-a-smartphone-144/",
        0.0,
    ),
]


VOICE_PARTS = [
    "Ð¢Ñ‹ Ð½Ð°Ð¶Ð¸Ð¼Ð°ÐµÑˆÑŒ Ð½Ð° Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ. Ð–Ð´ÐµÑˆÑŒ ÑÐµÐºÑƒÐ½Ð´Ñƒ. ÐŸÐ¾Ñ‚Ð¾Ð¼ ÐµÑ‰Ðµ Ð¾Ð´Ð½Ñƒ. ÐŸÐ¾Ñ‚Ð¾Ð¼ Ð½Ð°Ñ‡Ð¸Ð½Ð°ÐµÑˆÑŒ Ð½Ð°Ð¶Ð¸Ð¼Ð°Ñ‚ÑŒ ÑÐ¸Ð»ÑŒÐ½ÐµÐµ, ÐºÐ°Ðº Ð±ÑƒÐ´Ñ‚Ð¾ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð¿Ñ€Ð¾ÑÑ‚Ð¾ Ð½Ðµ Ð¿Ð¾Ð½ÑÐ» ÑÐµÑ€ÑŒÐµÐ·Ð½Ð¾ÑÑ‚Ð¸ ÑÐ¸Ñ‚ÑƒÐ°Ñ†Ð¸Ð¸. Ð˜ Ð² Ð³Ð¾Ð»Ð¾Ð²Ðµ Ð¿Ð¾ÑÐ²Ð»ÑÐµÑ‚ÑÑ Ð¼Ñ‹ÑÐ»ÑŒ: Ð¾Ð½ Ð¶Ðµ Ñ€Ð°Ð½ÑŒÑˆÐµ Ð»ÐµÑ‚Ð°Ð». Ð§Ñ‚Ð¾ Ñ Ð½Ð¸Ð¼ ÑÑ‚Ð°Ð»Ð¾? Ð¡Ð°Ð¼Ð¾Ðµ Ð¸Ð½Ñ‚ÐµÑ€ÐµÑÐ½Ð¾Ðµ: ÑÑ‚Ð°Ñ€Ñ‹Ð¹ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð½Ðµ Ð¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾ ÑÐ»Ð¾Ð¼Ð°Ð»ÑÑ. Ð§Ð°ÑÑ‚Ð¾ Ð¾Ð½ Ð¿Ñ€Ð¾ÑÑ‚Ð¾ Ð¾ÐºÐ°Ð·Ð°Ð»ÑÑ Ð² Ð¼Ð¸Ñ€Ðµ, ÐºÐ¾Ñ‚Ð¾Ñ€Ñ‹Ð¹ ÑÑ‚Ð°Ð» Ñ‚ÑÐ¶ÐµÐ»ÐµÐµ.",
    "ÐšÐ¾Ð³Ð´Ð° Ñ‚Ñ‹ Ð¿Ð¾ÐºÑƒÐ¿Ð°Ð» Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½, Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ Ð±Ñ‹Ð»Ð¸ Ð»ÐµÐ³Ñ‡Ðµ. Ð¡Ð¾Ñ†ÑÐµÑ‚Ð¸ Ð¿Ð¾ÐºÐ°Ð·Ñ‹Ð²Ð°Ð»Ð¸ Ð¼ÐµÐ½ÑŒÑˆÐµ Ð²Ð¸Ð´ÐµÐ¾. Ð¡Ð°Ð¹Ñ‚Ñ‹ Ð±Ñ‹Ð»Ð¸ Ð¿Ñ€Ð¾Ñ‰Ðµ. ÐœÐµÑÑÐµÐ½Ð´Ð¶ÐµÑ€Ñ‹ Ð½Ðµ Ð¿Ñ‹Ñ‚Ð°Ð»Ð¸ÑÑŒ Ð±Ñ‹Ñ‚ÑŒ Ð¾Ð´Ð½Ð¾Ð²Ñ€ÐµÐ¼ÐµÐ½Ð½Ð¾ Ð±Ð°Ð½ÐºÐ¾Ð¼, Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½Ð¾Ð¼, Ñ€ÐµÐ´Ð°ÐºÑ‚Ð¾Ñ€Ð¾Ð¼ Ð²Ð¸Ð´ÐµÐ¾ Ð¸ Ð¼Ð°Ð»ÐµÐ½ÑŒÐºÐ¸Ð¼ Ñ‚ÐµÐ»ÐµÐ²Ð¸Ð·Ð¾Ñ€Ð¾Ð¼. Ð Ð¿Ð¾Ñ‚Ð¾Ð¼ Ð¿Ñ€Ð¾ÑˆÐ»Ð¾ Ð½ÐµÑÐºÐ¾Ð»ÑŒÐºÐ¾ Ð»ÐµÑ‚. ÐŸÑ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÐ»Ð¸ÑÑŒ, Ñ„ÑƒÐ½ÐºÑ†Ð¸Ð¹ ÑÑ‚Ð°Ð½Ð¾Ð²Ð¸Ð»Ð¾ÑÑŒ Ð±Ð¾Ð»ÑŒÑˆÐµ, Ð²Ð¸Ð´ÐµÐ¾ Ñ‡ÐµÑ‚Ñ‡Ðµ, Ñ€ÐµÐºÐ»Ð°Ð¼Ð° ÑƒÐ¼Ð½ÐµÐµ, Ð»ÐµÐ½Ñ‚Ñ‹ Ð±ÐµÑÐºÐ¾Ð½ÐµÑ‡Ð½ÐµÐµ. Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½, ÐºÐ¾Ñ‚Ð¾Ñ€Ñ‹Ð¹ Ð±Ñ‹Ð» ÑÐ¾Ð·Ð´Ð°Ð½ Ð´Ð»Ñ Ð¾Ð´Ð½Ð¾Ð³Ð¾ Ñ†Ð¸Ñ„Ñ€Ð¾Ð²Ð¾Ð³Ð¾ Ð¼Ð¸Ñ€Ð°, Ð²Ð½ÐµÐ·Ð°Ð¿Ð½Ð¾ Ð¶Ð¸Ð²ÐµÑ‚ Ð² Ð´Ñ€ÑƒÐ³Ð¾Ð¼.",
    "Ð’Ñ‚Ð¾Ñ€Ð°Ñ Ð¿Ñ€Ð¸Ñ‡Ð¸Ð½Ð° - Ð¿Ð°Ð¼ÑÑ‚ÑŒ. ÐœÐ½Ð¾Ð³Ð¸Ðµ Ð´ÑƒÐ¼Ð°ÑŽÑ‚: Ð½Ñƒ Ð´Ð°, Ñƒ Ð¼ÐµÐ½Ñ Ð¾ÑÑ‚Ð°Ð»Ð¾ÑÑŒ Ð´Ð²Ð° Ð³Ð¸Ð³Ð°Ð±Ð°Ð¹Ñ‚Ð°, Ð½Ð¾ Ð¼ÐµÑÑ‚Ð¾ Ð¶Ðµ ÐµÑ‰Ðµ ÐµÑÑ‚ÑŒ. ÐŸÑ€Ð¾Ð±Ð»ÐµÐ¼Ð° Ð² Ñ‚Ð¾Ð¼, Ñ‡Ñ‚Ð¾ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ñƒ Ð½ÑƒÐ¶Ð½Ð¾ Ð½Ðµ Ð¿Ñ€Ð¾ÑÑ‚Ð¾ Ð¼ÐµÑÑ‚Ð¾ Ð´Ð»Ñ Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸Ñ. Ð•Ð¼Ñƒ Ð½ÑƒÐ¶Ð½Ð¾ ÑÐ²Ð¾Ð±Ð¾Ð´Ð½Ð¾Ðµ Ð¿Ñ€Ð¾ÑÑ‚Ñ€Ð°Ð½ÑÑ‚Ð²Ð¾, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð½Ð¾Ñ€Ð¼Ð°Ð»ÑŒÐ½Ð¾ Ñ€Ð°Ð±Ð¾Ñ‚Ð°Ñ‚ÑŒ: ÑÐ¾Ñ…Ñ€Ð°Ð½ÑÑ‚ÑŒ Ð²Ñ€ÐµÐ¼ÐµÐ½Ð½Ñ‹Ðµ Ñ„Ð°Ð¹Ð»Ñ‹, Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÑ‚ÑŒ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ, ÐºÑÑˆÐ¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ð¸ Ð¿ÐµÑ€ÐµÐ¼ÐµÑ‰Ð°Ñ‚ÑŒ ÐºÑƒÑÐºÐ¸ ÑÐ¸ÑÑ‚ÐµÐ¼Ñ‹. ÐšÐ¾Ð³Ð´Ð° Ð¿Ð°Ð¼ÑÑ‚ÑŒ Ð¿Ð¾Ñ‡Ñ‚Ð¸ Ð·Ð°Ð±Ð¸Ñ‚Ð°, Ð¿Ñ€Ð¾ÑÑ‚Ñ‹Ðµ Ð²ÐµÑ‰Ð¸ Ð½Ð°Ñ‡Ð¸Ð½Ð°ÑŽÑ‚ Ð¸Ð´Ñ‚Ð¸ Ñ‡ÐµÑ€ÐµÐ· Ð»Ð¸ÑˆÐ½Ð¸Ðµ ÐºÑ€ÑƒÐ³Ð¸.",
    "Ð¢Ñ€ÐµÑ‚ÑŒÑ Ð¿Ñ€Ð¸Ñ‡Ð¸Ð½Ð° - Ð±Ð°Ñ‚Ð°Ñ€ÐµÑ. ÐÐºÐºÑƒÐ¼ÑƒÐ»ÑÑ‚Ð¾Ñ€ Ð½Ðµ Ð²ÐµÑ‡Ð½Ñ‹Ð¹. Ð¡Ð¾ Ð²Ñ€ÐµÐ¼ÐµÐ½ÐµÐ¼ Ð¾Ð½ Ñ…ÑƒÐ¶Ðµ Ð´ÐµÑ€Ð¶Ð¸Ñ‚ Ð·Ð°Ñ€ÑÐ´ Ð¸ Ñ…ÑƒÐ¶Ðµ Ð¾Ñ‚Ð´Ð°ÐµÑ‚ ÑÐ½ÐµÑ€Ð³Ð¸ÑŽ Ð² Ð¼Ð¾Ð¼ÐµÐ½Ñ‚Ñ‹, ÐºÐ¾Ð³Ð´Ð° Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ñƒ Ð½ÑƒÐ¶Ð½Ð¾ Ñ€ÐµÐ·ÐºÐ¾ Ð½Ð°Ð¿Ñ€ÑÑ‡ÑŒÑÑ. Ð¢Ñ‹ Ð¾Ñ‚ÐºÑ€Ñ‹Ð²Ð°ÐµÑˆÑŒ ÐºÐ°Ð¼ÐµÑ€Ñƒ, ÑÐºÑ€Ð°Ð½, ÑÐµÐ½ÑÐ¾Ñ€Ñ‹ Ð¸ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ° Ð¸Ð·Ð¾Ð±Ñ€Ð°Ð¶ÐµÐ½Ð¸Ñ Ð²ÐºÐ»ÑŽÑ‡Ð°ÑŽÑ‚ÑÑ Ð¿Ð¾Ñ‡Ñ‚Ð¸ Ð¾Ð´Ð½Ð¾Ð²Ñ€ÐµÐ¼ÐµÐ½Ð½Ð¾. ÐÐ¾Ð²Ð°Ñ Ð±Ð°Ñ‚Ð°Ñ€ÐµÑ Ð´ÐµÑ€Ð¶Ð¸Ñ‚ Ñ‚Ð°ÐºÐ¾Ð¹ Ñ€Ñ‹Ð²Ð¾Ðº ÑÐ¿Ð¾ÐºÐ¾Ð¹Ð½Ð¾. Ð¡Ñ‚Ð°Ñ€Ð°Ñ Ð¼Ð¾Ð¶ÐµÑ‚ Ð¿Ñ€Ð¾ÑÐµÑÑ‚ÑŒ. Ð˜ ÑÐ¸ÑÑ‚ÐµÐ¼Ð° Ð½Ð°Ñ‡Ð¸Ð½Ð°ÐµÑ‚ Ð²ÐµÑÑ‚Ð¸ ÑÐµÐ±Ñ Ð¾ÑÑ‚Ð¾Ñ€Ð¾Ð¶Ð½ÐµÐµ.",
    "Ð•Ñ‰Ðµ Ð¾Ð´Ð¸Ð½ Ñ„Ð°ÐºÑ‚Ð¾Ñ€ - Ñ‚ÐµÐ¿Ð»Ð¾. Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½Ñ‹ Ð½Ðµ Ð»ÑŽÐ±ÑÑ‚ Ð¿ÐµÑ€ÐµÐ³Ñ€ÐµÐ². ÐšÐ¾Ð³Ð´Ð° Ð²Ð½ÑƒÑ‚Ñ€Ð¸ ÑÑ‚Ð°Ð½Ð¾Ð²Ð¸Ñ‚ÑÑ ÑÐ»Ð¸ÑˆÐºÐ¾Ð¼ Ð¶Ð°Ñ€ÐºÐ¾, ÑÐ¸ÑÑ‚ÐµÐ¼Ð° ÑÐ½Ð¸Ð¶Ð°ÐµÑ‚ Ð¿Ñ€Ð¾Ð¸Ð·Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»ÑŒÐ½Ð¾ÑÑ‚ÑŒ, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð·Ð°Ñ‰Ð¸Ñ‚Ð¸Ñ‚ÑŒ ÐºÐ¾Ð¼Ð¿Ð¾Ð½ÐµÐ½Ñ‚Ñ‹. Ð­Ñ‚Ð¾ Ð½Ð°Ð·Ñ‹Ð²Ð°ÐµÑ‚ÑÑ throttling. ÐžÑÐ¾Ð±ÐµÐ½Ð½Ð¾ ÑÑ‚Ð¾ Ð·Ð°Ð¼ÐµÑ‚Ð½Ð¾, ÐºÐ¾Ð³Ð´Ð° Ñ‚Ñ‹ ÑÐ½Ð¸Ð¼Ð°ÐµÑˆÑŒ Ð²Ð¸Ð´ÐµÐ¾, Ð¿Ð¾Ð»ÑŒÐ·ÑƒÐµÑˆÑŒÑÑ Ð½Ð°Ð²Ð¸Ð³Ð°Ñ‚Ð¾Ñ€Ð¾Ð¼, Ð¸Ð³Ñ€Ð°ÐµÑˆÑŒ Ð¸Ð»Ð¸ ÑÐ¸Ð´Ð¸ÑˆÑŒ Ð½Ð° ÑÐ¾Ð»Ð½Ñ†Ðµ. Ð¡Ñ‚Ð°Ñ€Ñ‹Ð¹ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ñ‡Ð°Ñ‰Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ð°ÐµÑ‚ Ð±Ð»Ð¸Ð¶Ðµ Ðº Ð¿Ñ€ÐµÐ´ÐµÐ»Ñƒ.",
    "Ð•ÑÑ‚ÑŒ ÐµÑ‰Ðµ Ð¾Ð´Ð¸Ð½ Ð½ÐµÐ¿Ñ€Ð¸ÑÑ‚Ð½Ñ‹Ð¹ Ð¼Ð¾Ð¼ÐµÐ½Ñ‚: Ð¸Ð·Ð¼ÐµÐ½Ð¸Ð»ÑÑ Ð½Ðµ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½. Ð˜Ð·Ð¼ÐµÐ½Ð¸Ð»ÑÑ Ñ‚Ñ‹. ÐšÐ¾Ð³Ð´Ð° Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð±Ñ‹Ð» Ð½Ð¾Ð²Ñ‹Ð¼, Ð¾Ð½ ÐºÐ°Ð·Ð°Ð»ÑÑ Ð±Ñ‹ÑÑ‚Ñ€Ñ‹Ð¼ Ð½Ð° Ñ„Ð¾Ð½Ðµ Ñ‚Ð¾Ð³Ð¾, Ðº Ñ‡ÐµÐ¼Ñƒ Ñ‚Ñ‹ Ð¿Ñ€Ð¸Ð²Ñ‹Ðº Ñ‚Ð¾Ð³Ð´Ð°. ÐÐ¾ Ð·Ð° Ð½ÐµÑÐºÐ¾Ð»ÑŒÐºÐ¾ Ð»ÐµÑ‚ Ñ‚Ñ‹ ÑƒÐ²Ð¸Ð´ÐµÐ» Ð½Ð¾Ð²Ñ‹Ðµ ÑÐºÑ€Ð°Ð½Ñ‹, Ð½Ð¾Ð²Ñ‹Ðµ Ð°Ð½Ð¸Ð¼Ð°Ñ†Ð¸Ð¸, Ð±Ñ‹ÑÑ‚Ñ€Ñ‹Ðµ ÐºÐ°Ð¼ÐµÑ€Ñ‹ Ð¸ Ð¼Ð¾Ð¼ÐµÐ½Ñ‚Ð°Ð»ÑŒÐ½ÑƒÑŽ Ñ€Ð°Ð·Ð±Ð»Ð¾ÐºÐ¸Ñ€Ð¾Ð²ÐºÑƒ. Ð¢Ð¾, Ñ‡Ñ‚Ð¾ Ñ€Ð°Ð½ÑŒÑˆÐµ ÐºÐ°Ð·Ð°Ð»Ð¾ÑÑŒ Ð½Ð¾Ñ€Ð¼Ð°Ð»ÑŒÐ½Ñ‹Ð¼, ÑÐµÐ³Ð¾Ð´Ð½Ñ Ð¾Ñ‰ÑƒÑ‰Ð°ÐµÑ‚ÑÑ ÐºÐ°Ðº Ð·Ð°Ð´ÐµÑ€Ð¶ÐºÐ°.",
    "Ð­Ñ‚Ð¾ Ð½Ðµ Ð²ÑÐµÐ³Ð´Ð° Ð·Ð°Ð³Ð¾Ð²Ð¾Ñ€. ÐžÐ±Ñ‹Ñ‡Ð½Ð¾ Ð²ÑÐµ ÑÐºÑƒÑ‡Ð½ÐµÐµ Ð¸ Ð¿Ñ€Ð°ÐºÑ‚Ð¸Ñ‡Ð½ÐµÐµ: Ð±Ð°Ñ‚Ð°Ñ€ÐµÑ Ð¸Ð·Ð½Ð°ÑˆÐ¸Ð²Ð°ÐµÑ‚ÑÑ, Ð¿Ð°Ð¼ÑÑ‚ÑŒ Ð·Ð°Ð±Ð¸Ð²Ð°ÐµÑ‚ÑÑ, Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ Ñ€Ð°ÑÑ‚ÑƒÑ‚, ÑÐ¸ÑÑ‚ÐµÐ¼Ð° ÑÑ‚Ð°Ð½Ð¾Ð²Ð¸Ñ‚ÑÑ ÑÐ»Ð¾Ð¶Ð½ÐµÐµ, Ð° Ð¼Ñ‹ Ð¶Ð´ÐµÐ¼ Ð¾Ñ‚ ÑÑ‚Ð°Ñ€Ð¾Ð³Ð¾ ÑƒÑÑ‚Ñ€Ð¾Ð¹ÑÑ‚Ð²Ð° Ð¿Ð¾Ð²ÐµÐ´ÐµÐ½Ð¸Ñ Ð½Ð¾Ð²Ð¾Ð³Ð¾. Ð§Ñ‚Ð¾ Ð¼Ð¾Ð¶Ð½Ð¾ ÑÐ´ÐµÐ»Ð°Ñ‚ÑŒ? ÐžÑÐ²Ð¾Ð±Ð¾Ð´Ð¸ Ð¿Ð°Ð¼ÑÑ‚ÑŒ Ñ Ð½Ð¾Ñ€Ð¼Ð°Ð»ÑŒÐ½Ñ‹Ð¼ Ð·Ð°Ð¿Ð°ÑÐ¾Ð¼. ÐŸÑ€Ð¾Ð²ÐµÑ€ÑŒ ÑÐ¾ÑÑ‚Ð¾ÑÐ½Ð¸Ðµ Ð±Ð°Ñ‚Ð°Ñ€ÐµÐ¸. Ð£Ð±ÐµÑ€Ð¸ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ, ÐºÐ¾Ñ‚Ð¾Ñ€Ñ‹Ðµ Ð´Ð°Ð²Ð½Ð¾ Ð½Ðµ Ð¾Ñ‚ÐºÑ€Ñ‹Ð²Ð°Ð». ÐÐµ Ð¼ÑƒÑ‡Ð°Ð¹ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð¶Ð°Ñ€Ð¾Ð¹. Ð¡Ñ‚Ð°Ñ€Ñ‹Ð¹ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð½Ðµ Ð¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾ Ð¿Ð»Ð¾Ñ…Ð¾Ð¹. Ð•Ð¼Ñƒ Ð¿Ñ€Ð¾ÑÑ‚Ð¾ Ð½ÑƒÐ¶Ð½Ð¾ Ð½ÐµÐ¼Ð½Ð¾Ð³Ð¾ Ð¿Ñ€Ð¾ÑÑ‚Ñ€Ð°Ð½ÑÑ‚Ð²Ð° Ð¸ Ð¼ÐµÐ½ÑŒÑˆÐµ Ñ†Ð¸Ñ„Ñ€Ð¾Ð²Ð¾Ð³Ð¾ Ñ…Ð°Ð¾ÑÐ°.",
]

BEAT_TEXTS = [
    (0.8, 2.2, "Ð Ð°Ð½ÑŒÑˆÐµ Ð»ÐµÑ‚Ð°Ð»"),
    (4.0, 2.0, "Ð¢ÐµÐ¿ÐµÑ€ÑŒ Ð´ÑƒÐ¼Ð°ÐµÑ‚"),
    (8.0, 2.3, "Ð§Ñ‚Ð¾ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ð»Ð¾ÑÑŒ?"),
    (22.0, 2.5, "ÐŸÑ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ Ñ‚ÑÐ¶ÐµÐ»ÐµÐµ"),
    (29.0, 2.2, "Ð’Ð¸Ð´ÐµÐ¾"),
    (32.0, 2.2, "ÐšÑÑˆ"),
    (35.0, 2.2, "Ð ÐµÐºÐ»Ð°Ð¼Ð°"),
    (38.0, 2.2, "Ð¤ÑƒÐ½ÐºÑ†Ð¸Ð¸"),
    (67.0, 3.0, "ÐœÐµÑÑ‚Ð¾ ÐµÑÑ‚ÑŒ â‰  Ð·Ð°Ð¿Ð°Ñ ÐµÑÑ‚ÑŒ"),
    (81.0, 2.5, "Ð’Ñ€ÐµÐ¼ÐµÐ½Ð½Ñ‹Ðµ Ñ„Ð°Ð¹Ð»Ñ‹"),
    (88.0, 2.5, "ÐšÑÑˆ Ð´Ð°Ð½Ð½Ñ‹Ñ…"),
    (113.0, 3.0, "Ð‘Ð°Ñ‚Ð°Ñ€ÐµÑ ÑÑ‚Ð°Ñ€ÐµÐµÑ‚"),
    (129.0, 2.6, "ÐŸÐ¸ÐºÐ¸ Ð½Ð°Ð³Ñ€ÑƒÐ·ÐºÐ¸"),
    (142.0, 2.8, "Ð ÐµÐ¶Ð¸Ð¼ Ð¾ÑÑ‚Ð¾Ñ€Ð¾Ð¶Ð½Ð¾ÑÑ‚Ð¸"),
    (158.0, 3.0, "THROTTLING"),
    (174.0, 2.7, "Ð¡Ð¾Ð»Ð½Ñ†Ðµ"),
    (178.0, 2.7, "ÐÐ°Ð²Ð¸Ð³Ð°Ñ‚Ð¾Ñ€"),
    (182.0, 2.7, "Ð˜Ð³Ñ€Ñ‹"),
    (204.0, 3.0, "Ð˜Ð·Ð¼ÐµÐ½Ð¸Ð»ÑÑ Ñ‚Ñ‹"),
    (222.0, 3.0, "ÐÐ¾Ð²Ñ‹Ðµ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ñ‹ Ð¿Ð¾Ð´Ð½ÑÐ»Ð¸ Ð¿Ð»Ð°Ð½ÐºÑƒ"),
    (252.0, 2.6, "1. ÐŸÐ°Ð¼ÑÑ‚ÑŒ"),
    (258.0, 2.6, "2. Ð‘Ð°Ñ‚Ð°Ñ€ÐµÑ"),
    (264.0, 2.6, "3. ÐŸÑ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ"),
    (270.0, 2.6, "4. Ð–Ð°Ñ€Ð°"),
    (292.0, 4.5, "ÐœÐµÐ½ÑŒÑˆÐµ Ñ†Ð¸Ñ„Ñ€Ð¾Ð²Ð¾Ð³Ð¾ Ñ…Ð°Ð¾ÑÐ°"),
]


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def run(command: list[str]) -> None:
    completed = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if completed.returncode != 0:
        raise RuntimeError("Command failed:\n" + " ".join(command) + "\n\n" + completed.stdout)


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stdout)
    return float(completed.stdout.strip())


def download(url: str, path: Path) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    last_error = ""
    headers = {
        "User-Agent": "PhrasemanVideoMVP/0.1 (local prototype; contact: local-user)",
        "Accept": "video/webm,video/mp4,*/*",
    }
    for attempt in range(5):
        with requests.get(url, stream=True, timeout=180, headers=headers) as response:
            if response.status_code == 429:
                last_error = response.text[:500]
                time.sleep((attempt + 1) * 8 + random.random() * 2)
                continue
            response.raise_for_status()
            with path.open("wb") as handle:
                for chunk in response.iter_content(chunk_size=1024 * 512):
                    if chunk:
                        handle.write(chunk)
            return
    raise RuntimeError(f"Download rate-limited after retries: {url}\n{last_error}")


def strip_html(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value or "").replace("\n", " ").strip()


def mixkit_asset(page_url: str) -> dict[str, str]:
    html = requests.get(page_url, timeout=60, headers={"User-Agent": "Mozilla/5.0"}).text
    if "Mixkit Stock Video Free License" not in html or "Restricted License" in html:
        raise RuntimeError(f"Mixkit page is not free-license safe for this MVP: {page_url}")
    mp4s = re.findall(r"https://assets\.mixkit\.co/videos/[^\"']+?\.mp4", html)
    if not mp4s:
        raise RuntimeError(f"No MP4 URL found on Mixkit page: {page_url}")
    title_match = re.search(r"<title>(.*?)</title>", html, re.S)
    title = strip_html(title_match.group(1)) if title_match else page_url
    return {
        "title": title,
        "page_url": page_url,
        "download_url": mp4s[0],
        "license": "Mixkit Stock Video Free License",
        "license_url": "https://mixkit.co/license/#videoFree",
    }


def fit_clip(raw: Path, out: Path, scene: RealScene) -> None:
    if out.exists() and out.stat().st_size > 1024:
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    source_duration = probe_duration(raw)
    start = min(scene.source_start, max(0.0, source_duration - 1.0))
    stream_loop = ["-stream_loop", "-1"] if source_duration < scene.duration + 1 else []
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            *stream_loop,
            "-ss",
            f"{start:.3f}",
            "-i",
            str(raw),
            "-t",
            f"{scene.duration:.3f}",
            "-vf",
            "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1",
            "-an",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "veryfast",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )


def openai_tts(text: str, path: Path, api_key: str) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    response = requests.post(
        "https://api.openai.com/v1/audio/speech",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o-mini-tts",
            "voice": "coral",
            "input": text,
            "instructions": "Ð“Ð¾Ð²Ð¾Ñ€Ð¸ Ð¿Ð¾-Ñ€ÑƒÑÑÐºÐ¸ Ð¶Ð¸Ð²Ð¾ Ð¸ ÑƒÐ²ÐµÑ€ÐµÐ½Ð½Ð¾, ÐºÐ°Ðº Ð°Ð²Ñ‚Ð¾Ñ€ YouTube tech-Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ð°Ð»ÐºÐ¸. Ð¢ÐµÐ¼Ð¿ ÑÐ½ÐµÑ€Ð³Ð¸Ñ‡Ð½Ñ‹Ð¹, Ð½Ð¾ Ñ€Ð°Ð·Ð±Ð¾Ñ€Ñ‡Ð¸Ð²Ñ‹Ð¹.",
            "format": "mp3",
        },
        timeout=180,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI TTS failed {response.status_code}: {response.text[:1000]}")
    path.write_bytes(response.content)


def concat_audio(parts: list[Path], out: Path) -> None:
    list_path = out.with_suffix(".txt")
    list_path.write_text("\n".join(f"file '{p.as_posix()}'" for p in parts) + "\n", encoding="utf-8")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(list_path), "-c", "copy", str(out)])


def make_music(path: Path, duration: float) -> None:
    if path.exists() and path.stat().st_size > 1024:
        return
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=82:sample_rate=44100:duration={duration}",
            "-af",
            "volume=0.025",
            "-c:a",
            "pcm_s16le",
            str(path),
        ]
    )


def build_real_draft() -> dict[str, Any]:
    env = load_env_file(ROOT / ".env.local")
    api_key = os.environ.get("OPENAI_TTS_API_KEY") or env.get("OPENAI_TTS_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_TTS_API_KEY is missing in environment or .env.local")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    metadata = {scene.slug: mixkit_asset(scene.page_url) for scene in REAL_SCENES}

    raw_paths: dict[str, Path] = {}
    for scene in REAL_SCENES:
        raw = RAW_DIR / (scene.slug + ".mp4")
        download(metadata[scene.slug]["download_url"], raw)
        raw_paths[scene.slug] = raw

    voice_parts: list[Path] = []
    for index, text in enumerate(VOICE_PARTS, start=1):
        path = VOICE_DIR / f"voice_part_{index:02d}.mp3"
        openai_tts(text, path, api_key)
        voice_parts.append(path)
    voiceover = VOICE_DIR / "old_phones_openai_voiceover.mp3"
    concat_audio(voice_parts, voiceover)
    voice_duration = probe_duration(voiceover)
    total_duration = max(310.0, voice_duration)
    music = VOICE_DIR / "music_bed_placeholder_quiet.wav"
    make_music(music, total_duration)

    result = base.clone_wednesday_template(
        source_draft=base.SOURCE_DRAFT,
        draft_name=DRAFT_NAME,
        blank_tracks=[],
        copy_mode="copy",
    )
    draft_dir = Path(result["draftDir"])
    resources = draft_dir / "Resources"
    resources.mkdir(exist_ok=True)

    scene_resources: list[Path] = []
    for scene in REAL_SCENES:
        out = resources / f"{scene.slug}.mp4"
        fit_clip(raw_paths[scene.slug], out, scene)
        scene_resources.append(out)
    voice_resource = resources / "old_phones_openai_voiceover.mp3"
    music_resource = resources / "music_bed_placeholder_quiet.wav"
    shutil.copy2(voiceover, voice_resource)
    shutil.copy2(music, music_resource)
    shutil.copy2(Path(base.__file__).resolve().parents[1] / "lingman-scenarist-pipeline" / "capcut_wednesday_assembler" / "__init__.py", OUT_DIR / ".keep")
    # Reuse the existing soft pop generated by the previous builder if present, otherwise generate it.
    sfx_resource = resources / "sfx_soft_pop_placeholder.wav"
    base.generate_audio(sfx_resource, 0.25, kind="sfx")

    content_path = draft_dir / "draft_content.json"
    draft_content = base.load_json(content_path)
    prefix = base.resource_prefix(draft_content)
    now_us = int(time.time() * base.US)
    total_us = base.us(total_duration)
    timeline_id = str(draft_content["id"])
    draft_content["name"] = draft_dir.name
    draft_content["duration"] = total_us
    draft_content["update_time"] = now_us
    draft_content["path"] = draft_dir.as_posix()

    materials = draft_content["materials"]
    base_video = materials["videos"][0]
    base_audio = materials["audios"][0]
    base_text = materials["texts"][0]

    video_materials = [
        base.make_video_material(base_video, resource, base.Scene(scene.slug, scene.slug, scene.start, scene.duration, "0x111827", scene.title, scene.callout), prefix)
        for scene, resource in zip(REAL_SCENES, scene_resources, strict=True)
    ]
    title_materials = [base.make_text_material(base_text, scene.title) for scene in REAL_SCENES]
    callout_materials = [base.make_text_material(base_text, scene.callout) for scene in REAL_SCENES]
    beat_materials = [base.make_text_material(base_text, text) for _, _, text in BEAT_TEXTS]

    voice_material = base.make_audio_material(base_audio, voice_resource, total_duration, prefix, name="OpenAI voiceover - old phones")
    music_material = base.make_audio_material(base_audio, music_resource, total_duration, prefix, name="Quiet temp music bed")
    sfx_material = base.make_audio_material(base_audio, sfx_resource, 0.25, prefix, name="Soft pop SFX")

    materials["videos"] = video_materials
    materials["audios"] = [voice_material, music_material, sfx_material]
    materials["texts"] = title_materials + callout_materials + beat_materials

    base_video_segment = draft_content["tracks"][0]["segments"][0]
    base_title_segment = draft_content["tracks"][1]["segments"][0]
    base_callout_segment = draft_content["tracks"][3]["segments"][0]
    base_audio_segment = draft_content["tracks"][5]["segments"][0]

    video_track = json.loads(json.dumps(draft_content["tracks"][0], ensure_ascii=False))
    video_track["name"] = "REAL B-ROLL FROM COMMONS"
    video_track["segments"] = [
        base.clone_segment(base_video_segment, material["id"], scene.start, scene.duration, index)
        for index, (scene, material) in enumerate(zip(REAL_SCENES, video_materials, strict=True))
    ]

    title_track = json.loads(json.dumps(draft_content["tracks"][1], ensure_ascii=False))
    title_track["name"] = "Dynamic scene titles"
    title_track["segments"] = [
        base.clone_segment(base_title_segment, material["id"], scene.start + 0.6, 3.0, index)
        for index, (scene, material) in enumerate(zip(REAL_SCENES, title_materials, strict=True))
    ]

    callout_track = json.loads(json.dumps(draft_content["tracks"][3], ensure_ascii=False))
    callout_track["name"] = "Short callouts"
    callout_track["segments"] = [
        base.clone_segment(base_callout_segment, material["id"], scene.start + 5.0, 3.2, index)
        for index, (scene, material) in enumerate(zip(REAL_SCENES, callout_materials, strict=True))
    ]

    beat_track = json.loads(json.dumps(draft_content["tracks"][2], ensure_ascii=False))
    beat_track["name"] = "Fast pop beat text"
    beat_track["segments"] = [
        base.clone_segment(base_title_segment, material["id"], start, duration, index)
        for index, ((start, duration, _), material) in enumerate(zip(BEAT_TEXTS, beat_materials, strict=True))
    ]

    voice_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    voice_track["name"] = "OPENAI VOICEOVER"
    voice_track["segments"] = [base.clone_segment(base_audio_segment, voice_material["id"], 0.0, total_duration, 0)]
    voice_track["segments"][0]["volume"] = 1.0
    voice_track["segments"][0]["last_nonzero_volume"] = 1.0

    music_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    music_track["id"] = base.new_id()
    music_track["name"] = "TEMP MUSIC BED"
    music_track["segments"] = [base.clone_segment(base_audio_segment, music_material["id"], 0.0, total_duration, 0)]
    music_track["segments"][0]["volume"] = 0.22
    music_track["segments"][0]["last_nonzero_volume"] = 0.22

    sfx_track = json.loads(json.dumps(draft_content["tracks"][5], ensure_ascii=False))
    sfx_track["id"] = base.new_id()
    sfx_track["name"] = "DYNAMIC SFX POPS"
    sfx_track["segments"] = [
        base.clone_segment(base_audio_segment, sfx_material["id"], start, 0.25, index)
        for index, (start, _, _) in enumerate(BEAT_TEXTS[:18])
    ]
    for segment in sfx_track["segments"]:
        segment["volume"] = 0.26
        segment["last_nonzero_volume"] = 0.26

    draft_content["tracks"] = [video_track, title_track, callout_track, beat_track, voice_track, music_track, sfx_track]
    base.write_json(content_path, draft_content)
    if (draft_dir / "template-2.tmp").exists():
        base.write_json(draft_dir / "template-2.tmp", draft_content)
    if (draft_dir / "draft_content.json.bak").exists():
        base.write_json(draft_dir / "draft_content.json.bak", draft_content)
    base.update_timeline_service_files(draft_dir, timeline_id, timeline_id, draft_content, now_us)

    size = base.folder_size(resources)
    meta_path = draft_dir / "draft_meta_info.json"
    if meta_path.exists():
        meta = base.load_json(meta_path)
        meta.update(
            {
                "draft_id": timeline_id,
                "draft_name": draft_dir.name,
                "draft_fold_path": draft_dir.as_posix(),
                "draft_root_path": base.CAPCUT_DRAFTS_DIR.as_posix(),
                "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
                "tm_duration": total_us,
                "tm_draft_modified": now_us,
                "draft_timeline_materials_size": size,
                "draft_timeline_materials_size_": size,
            }
        )
        base.write_json(meta_path, meta)
    base.sync_root_meta_entry(draft_dir, timeline_id, total_us, size)

    license_manifest = []
    for scene in REAL_SCENES:
        meta = metadata.get(scene.slug, {})
        license_manifest.append(
            {
                "scene": scene.slug,
                "title": scene.source_title,
                "source_url": scene.page_url,
                "download_url": meta.get("download_url", ""),
                "creator": "Mixkit contributor",
                "credit": meta.get("title", ""),
                "license": meta.get("license", ""),
                "license_url": meta.get("license_url", ""),
                "local_clip": str(resources / f"{scene.slug}.mp4"),
            }
        )
    manifest = {
        "draft_name": draft_dir.name,
        "draft_dir": str(draft_dir),
        "duration_seconds": total_duration,
        "voiceover": str(voice_resource),
        "voiceover_duration_seconds": voice_duration,
        "tts_model": "gpt-4o-mini-tts",
        "broll_license_manifest": license_manifest,
        "validation": base.validate_native_clone(draft_dir, []),
    }
    base.write_json(OUT_DIR / "asset_manifest.real_broll.json", manifest, compact=False)
    (OUT_DIR / "capcut_native_draft_path.txt").write_text(str(draft_dir) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(build_real_draft(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
