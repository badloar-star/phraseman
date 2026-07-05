#!/usr/bin/env python3
"""Build a true A1/A2 chain-method source pack for the CapCut draft."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


OUT = Path("exports/chains/cepicepi_true_chains_a1a2_20260605")
AUDIO_DIR = OUT / "openai_audio"
AUDITION_DIR = OUT / "voice_audition"
ROWS_JSON = OUT / "true_chains_200_steps.json"
ROWS_CSV = OUT / "true_chains_200_steps.csv"
TEXT_MANIFEST = OUT / "true_chains_text_manifest.json"
REPORT = OUT / "true_chains_report.json"
MODEL = "gpt-4o-mini-tts"
US = 1_000_000


EN1_VOICE = "nova"
RU_VOICE = "shimmer"
EN2_VOICE = "fable"

ROLE_CONFIG = {
    "en1": {
        "voice": EN1_VOICE,
        "instructions": "Speak American English beautifully and clearly for A1-A2 learners. Warm, bright, natural teacher voice. Say only the phrase.",
    },
    "ru": {
        "voice": RU_VOICE,
        "instructions": "Ð“Ð¾Ð²Ð¾Ñ€Ð¸ Ð¿Ð¾-Ñ€ÑƒÑÑÐºÐ¸ ÐºÑ€Ð°ÑÐ¸Ð²Ð¾, Ñ‚ÐµÐ¿Ð»Ð¾ Ð¸ ÐµÑÑ‚ÐµÑÑ‚Ð²ÐµÐ½Ð½Ð¾, ÐºÐ°Ðº Ð¿Ñ€Ð¸ÑÑ‚Ð½Ñ‹Ð¹ Ð²ÐµÐ´ÑƒÑ‰Ð¸Ð¹ ÑƒÑ‡ÐµÐ±Ð½Ð¾Ð³Ð¾ Ð²Ð¸Ð´ÐµÐ¾. Ð§Ñ‘Ñ‚ÐºÐ¾, Ð±ÐµÐ· Ñ€Ð¾Ð±Ð¾Ñ‚Ð¸Ð·Ð°Ñ†Ð¸Ð¸. Ð¡ÐºÐ°Ð¶Ð¸ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ñ„Ñ€Ð°Ð·Ñƒ.",
    },
    "en2": {
        "voice": EN2_VOICE,
        "instructions": "Speak American English with a second beautiful voice, softer and calmer than the first. Clear A1-A2 lesson pace. Say only the phrase.",
    },
}


CHAINS = [
    ("home", ["I opened the window.", "I opened the window in my room.", "I opened the window in my room this morning.", "I opened the window in my room this morning because it was hot."], ["Ð¯ Ð¾Ñ‚ÐºÑ€Ñ‹Ð» Ð¾ÐºÐ½Ð¾.", "Ð¯ Ð¾Ñ‚ÐºÑ€Ñ‹Ð» Ð¾ÐºÐ½Ð¾ Ð² ÑÐ²Ð¾ÐµÐ¹ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ðµ.", "Ð¯ Ð¾Ñ‚ÐºÑ€Ñ‹Ð» Ð¾ÐºÐ½Ð¾ Ð² ÑÐ²Ð¾ÐµÐ¹ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ðµ ÑÐµÐ³Ð¾Ð´Ð½Ñ ÑƒÑ‚Ñ€Ð¾Ð¼.", "Ð¯ Ð¾Ñ‚ÐºÑ€Ñ‹Ð» Ð¾ÐºÐ½Ð¾ Ð² ÑÐ²Ð¾ÐµÐ¹ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ðµ ÑÐµÐ³Ð¾Ð´Ð½Ñ ÑƒÑ‚Ñ€Ð¾Ð¼, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð±Ñ‹Ð»Ð¾ Ð¶Ð°Ñ€ÐºÐ¾."]),
    ("home", ["She made tea.", "She made tea for her mother.", "She made tea for her mother after dinner.", "She made tea for her mother after dinner because she was tired."], ["ÐžÐ½Ð° ÑÐ´ÐµÐ»Ð°Ð»Ð° Ñ‡Ð°Ð¹.", "ÐžÐ½Ð° ÑÐ´ÐµÐ»Ð°Ð»Ð° Ñ‡Ð°Ð¹ Ð´Ð»Ñ Ð¼Ð°Ð¼Ñ‹.", "ÐžÐ½Ð° ÑÐ´ÐµÐ»Ð°Ð»Ð° Ñ‡Ð°Ð¹ Ð´Ð»Ñ Ð¼Ð°Ð¼Ñ‹ Ð¿Ð¾ÑÐ»Ðµ ÑƒÐ¶Ð¸Ð½Ð°.", "ÐžÐ½Ð° ÑÐ´ÐµÐ»Ð°Ð»Ð° Ñ‡Ð°Ð¹ Ð´Ð»Ñ Ð¼Ð°Ð¼Ñ‹ Ð¿Ð¾ÑÐ»Ðµ ÑƒÐ¶Ð¸Ð½Ð°, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ñ‚Ð° ÑƒÑÑ‚Ð°Ð»Ð°."]),
    ("home", ["We cleaned the kitchen.", "We cleaned the kitchen together.", "We cleaned the kitchen together before lunch.", "We cleaned the kitchen together before lunch because guests were coming."], ["ÐœÑ‹ ÑƒÐ±Ñ€Ð°Ð»Ð¸ ÐºÑƒÑ…Ð½ÑŽ.", "ÐœÑ‹ ÑƒÐ±Ñ€Ð°Ð»Ð¸ ÐºÑƒÑ…Ð½ÑŽ Ð²Ð¼ÐµÑÑ‚Ðµ.", "ÐœÑ‹ ÑƒÐ±Ñ€Ð°Ð»Ð¸ ÐºÑƒÑ…Ð½ÑŽ Ð²Ð¼ÐµÑÑ‚Ðµ Ð¿ÐµÑ€ÐµÐ´ Ð¾Ð±ÐµÐ´Ð¾Ð¼.", "ÐœÑ‹ ÑƒÐ±Ñ€Ð°Ð»Ð¸ ÐºÑƒÑ…Ð½ÑŽ Ð²Ð¼ÐµÑÑ‚Ðµ Ð¿ÐµÑ€ÐµÐ´ Ð¾Ð±ÐµÐ´Ð¾Ð¼, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð´Ð¾Ð»Ð¶Ð½Ñ‹ Ð±Ñ‹Ð»Ð¸ Ð¿Ñ€Ð¸Ð¹Ñ‚Ð¸ Ð³Ð¾ÑÑ‚Ð¸."]),
    ("home", ["He found his keys.", "He found his keys on the table.", "He found his keys on the table before work.", "He found his keys on the table before work and left quickly."], ["ÐžÐ½ Ð½Ð°ÑˆÑ‘Ð» ÐºÐ»ÑŽÑ‡Ð¸.", "ÐžÐ½ Ð½Ð°ÑˆÑ‘Ð» ÐºÐ»ÑŽÑ‡Ð¸ Ð½Ð° ÑÑ‚Ð¾Ð»Ðµ.", "ÐžÐ½ Ð½Ð°ÑˆÑ‘Ð» ÐºÐ»ÑŽÑ‡Ð¸ Ð½Ð° ÑÑ‚Ð¾Ð»Ðµ Ð¿ÐµÑ€ÐµÐ´ Ñ€Ð°Ð±Ð¾Ñ‚Ð¾Ð¹.", "ÐžÐ½ Ð½Ð°ÑˆÑ‘Ð» ÐºÐ»ÑŽÑ‡Ð¸ Ð½Ð° ÑÑ‚Ð¾Ð»Ðµ Ð¿ÐµÑ€ÐµÐ´ Ñ€Ð°Ð±Ð¾Ñ‚Ð¾Ð¹ Ð¸ Ð±Ñ‹ÑÑ‚Ñ€Ð¾ ÑƒÑˆÑ‘Ð»."]),
    ("home", ["They watched a movie.", "They watched a movie at home.", "They watched a movie at home on Friday.", "They watched a movie at home on Friday because it was raining."], ["ÐžÐ½Ð¸ ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ Ñ„Ð¸Ð»ÑŒÐ¼.", "ÐžÐ½Ð¸ ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ Ñ„Ð¸Ð»ÑŒÐ¼ Ð´Ð¾Ð¼Ð°.", "ÐžÐ½Ð¸ ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ Ñ„Ð¸Ð»ÑŒÐ¼ Ð´Ð¾Ð¼Ð° Ð² Ð¿ÑÑ‚Ð½Ð¸Ñ†Ñƒ.", "ÐžÐ½Ð¸ ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ Ñ„Ð¸Ð»ÑŒÐ¼ Ð´Ð¾Ð¼Ð° Ð² Ð¿ÑÑ‚Ð½Ð¸Ñ†Ñƒ, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ ÑˆÑ‘Ð» Ð´Ð¾Ð¶Ð´ÑŒ."]),
    ("daily", ["I bought bread.", "I bought bread at the store.", "I bought bread at the store after work.", "I bought bread at the store after work for breakfast."], ["Ð¯ ÐºÑƒÐ¿Ð¸Ð» Ñ…Ð»ÐµÐ±.", "Ð¯ ÐºÑƒÐ¿Ð¸Ð» Ñ…Ð»ÐµÐ± Ð² Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½Ðµ.", "Ð¯ ÐºÑƒÐ¿Ð¸Ð» Ñ…Ð»ÐµÐ± Ð² Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½Ðµ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹.", "Ð¯ ÐºÑƒÐ¿Ð¸Ð» Ñ…Ð»ÐµÐ± Ð² Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½Ðµ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹ Ð½Ð° Ð·Ð°Ð²Ñ‚Ñ€Ð°Ðº."]),
    ("daily", ["She called her friend.", "She called her friend in the evening.", "She called her friend in the evening from the bus.", "She called her friend in the evening from the bus to ask for help."], ["ÐžÐ½Ð° Ð¿Ð¾Ð·Ð²Ð¾Ð½Ð¸Ð»Ð° Ð¿Ð¾Ð´Ñ€ÑƒÐ³Ðµ.", "ÐžÐ½Ð° Ð¿Ð¾Ð·Ð²Ð¾Ð½Ð¸Ð»Ð° Ð¿Ð¾Ð´Ñ€ÑƒÐ³Ðµ Ð²ÐµÑ‡ÐµÑ€Ð¾Ð¼.", "ÐžÐ½Ð° Ð¿Ð¾Ð·Ð²Ð¾Ð½Ð¸Ð»Ð° Ð¿Ð¾Ð´Ñ€ÑƒÐ³Ðµ Ð²ÐµÑ‡ÐµÑ€Ð¾Ð¼ Ð¸Ð· Ð°Ð²Ñ‚Ð¾Ð±ÑƒÑÐ°.", "ÐžÐ½Ð° Ð¿Ð¾Ð·Ð²Ð¾Ð½Ð¸Ð»Ð° Ð¿Ð¾Ð´Ñ€ÑƒÐ³Ðµ Ð²ÐµÑ‡ÐµÑ€Ð¾Ð¼ Ð¸Ð· Ð°Ð²Ñ‚Ð¾Ð±ÑƒÑÐ°, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð¿Ð¾Ð¿Ñ€Ð¾ÑÐ¸Ñ‚ÑŒ Ð¿Ð¾Ð¼Ð¾Ñ‰Ð¸."]),
    ("daily", ["We waited outside.", "We waited outside the building.", "We waited outside the building for ten minutes.", "We waited outside the building for ten minutes because the door was locked."], ["ÐœÑ‹ Ð¶Ð´Ð°Ð»Ð¸ ÑÐ½Ð°Ñ€ÑƒÐ¶Ð¸.", "ÐœÑ‹ Ð¶Ð´Ð°Ð»Ð¸ ÑÐ½Ð°Ñ€ÑƒÐ¶Ð¸ Ð·Ð´Ð°Ð½Ð¸Ñ.", "ÐœÑ‹ Ð¶Ð´Ð°Ð»Ð¸ ÑÐ½Ð°Ñ€ÑƒÐ¶Ð¸ Ð·Ð´Ð°Ð½Ð¸Ñ Ð´ÐµÑÑÑ‚ÑŒ Ð¼Ð¸Ð½ÑƒÑ‚.", "ÐœÑ‹ Ð¶Ð´Ð°Ð»Ð¸ ÑÐ½Ð°Ñ€ÑƒÐ¶Ð¸ Ð·Ð´Ð°Ð½Ð¸Ñ Ð´ÐµÑÑÑ‚ÑŒ Ð¼Ð¸Ð½ÑƒÑ‚, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð´Ð²ÐµÑ€ÑŒ Ð±Ñ‹Ð»Ð° Ð·Ð°ÐºÑ€Ñ‹Ñ‚Ð°."]),
    ("daily", ["He took a photo.", "He took a photo of the menu.", "He took a photo of the menu at the cafe.", "He took a photo of the menu at the cafe and sent it to me."], ["ÐžÐ½ ÑÐ´ÐµÐ»Ð°Ð» Ñ„Ð¾Ñ‚Ð¾.", "ÐžÐ½ ÑÐ´ÐµÐ»Ð°Ð» Ñ„Ð¾Ñ‚Ð¾ Ð¼ÐµÐ½ÑŽ.", "ÐžÐ½ ÑÐ´ÐµÐ»Ð°Ð» Ñ„Ð¾Ñ‚Ð¾ Ð¼ÐµÐ½ÑŽ Ð² ÐºÐ°Ñ„Ðµ.", "ÐžÐ½ ÑÐ´ÐµÐ»Ð°Ð» Ñ„Ð¾Ñ‚Ð¾ Ð¼ÐµÐ½ÑŽ Ð² ÐºÐ°Ñ„Ðµ Ð¸ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð» ÐµÐ³Ð¾ Ð¼Ð½Ðµ."]),
    ("daily", ["They missed the bus.", "They missed the bus in the morning.", "They missed the bus in the morning near school.", "They missed the bus in the morning near school and walked home."], ["ÐžÐ½Ð¸ Ð¾Ð¿Ð¾Ð·Ð´Ð°Ð»Ð¸ Ð½Ð° Ð°Ð²Ñ‚Ð¾Ð±ÑƒÑ.", "ÐžÐ½Ð¸ Ð¾Ð¿Ð¾Ð·Ð´Ð°Ð»Ð¸ Ð½Ð° Ð°Ð²Ñ‚Ð¾Ð±ÑƒÑ ÑƒÑ‚Ñ€Ð¾Ð¼.", "ÐžÐ½Ð¸ Ð¾Ð¿Ð¾Ð·Ð´Ð°Ð»Ð¸ Ð½Ð° Ð°Ð²Ñ‚Ð¾Ð±ÑƒÑ ÑƒÑ‚Ñ€Ð¾Ð¼ Ð²Ð¾Ð·Ð»Ðµ ÑˆÐºÐ¾Ð»Ñ‹.", "ÐžÐ½Ð¸ Ð¾Ð¿Ð¾Ð·Ð´Ð°Ð»Ð¸ Ð½Ð° Ð°Ð²Ñ‚Ð¾Ð±ÑƒÑ ÑƒÑ‚Ñ€Ð¾Ð¼ Ð²Ð¾Ð·Ð»Ðµ ÑˆÐºÐ¾Ð»Ñ‹ Ð¸ Ð¿Ð¾ÑˆÐ»Ð¸ Ð´Ð¾Ð¼Ð¾Ð¹ Ð¿ÐµÑˆÐºÐ¾Ð¼."]),
    ("work", ["I sent an email.", "I sent an email to my manager.", "I sent an email to my manager after lunch.", "I sent an email to my manager after lunch with the file attached."], ["Ð¯ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð» Ð¿Ð¸ÑÑŒÐ¼Ð¾.", "Ð¯ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð» Ð¿Ð¸ÑÑŒÐ¼Ð¾ Ð¼ÐµÐ½ÐµÐ´Ð¶ÐµÑ€Ñƒ.", "Ð¯ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð» Ð¿Ð¸ÑÑŒÐ¼Ð¾ Ð¼ÐµÐ½ÐµÐ´Ð¶ÐµÑ€Ñƒ Ð¿Ð¾ÑÐ»Ðµ Ð¾Ð±ÐµÐ´Ð°.", "Ð¯ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð» Ð¿Ð¸ÑÑŒÐ¼Ð¾ Ð¼ÐµÐ½ÐµÐ´Ð¶ÐµÑ€Ñƒ Ð¿Ð¾ÑÐ»Ðµ Ð¾Ð±ÐµÐ´Ð° Ñ Ð¿Ñ€Ð¸ÐºÑ€ÐµÐ¿Ð»Ñ‘Ð½Ð½Ñ‹Ð¼ Ñ„Ð°Ð¹Ð»Ð¾Ð¼."]),
    ("work", ["She joined the meeting.", "She joined the meeting online.", "She joined the meeting online at nine.", "She joined the meeting online at nine and shared her idea."], ["ÐžÐ½Ð° Ð¿Ñ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½Ð¸Ð»Ð°ÑÑŒ Ðº Ð²ÑÑ‚Ñ€ÐµÑ‡Ðµ.", "ÐžÐ½Ð° Ð¿Ñ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½Ð¸Ð»Ð°ÑÑŒ Ðº Ð²ÑÑ‚Ñ€ÐµÑ‡Ðµ Ð¾Ð½Ð»Ð°Ð¹Ð½.", "ÐžÐ½Ð° Ð¿Ñ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½Ð¸Ð»Ð°ÑÑŒ Ðº Ð²ÑÑ‚Ñ€ÐµÑ‡Ðµ Ð¾Ð½Ð»Ð°Ð¹Ð½ Ð² Ð´ÐµÐ²ÑÑ‚ÑŒ.", "ÐžÐ½Ð° Ð¿Ñ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½Ð¸Ð»Ð°ÑÑŒ Ðº Ð²ÑÑ‚Ñ€ÐµÑ‡Ðµ Ð¾Ð½Ð»Ð°Ð¹Ð½ Ð² Ð´ÐµÐ²ÑÑ‚ÑŒ Ð¸ Ð¿Ð¾Ð´ÐµÐ»Ð¸Ð»Ð°ÑÑŒ Ð¸Ð´ÐµÐµÐ¹."]),
    ("work", ["We checked the report.", "We checked the report together.", "We checked the report together before sending it.", "We checked the report together before sending it to the client."], ["ÐœÑ‹ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð»Ð¸ Ð¾Ñ‚Ñ‡Ñ‘Ñ‚.", "ÐœÑ‹ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð»Ð¸ Ð¾Ñ‚Ñ‡Ñ‘Ñ‚ Ð²Ð¼ÐµÑÑ‚Ðµ.", "ÐœÑ‹ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð»Ð¸ Ð¾Ñ‚Ñ‡Ñ‘Ñ‚ Ð²Ð¼ÐµÑÑ‚Ðµ Ð¿ÐµÑ€ÐµÐ´ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²ÐºÐ¾Ð¹.", "ÐœÑ‹ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð»Ð¸ Ð¾Ñ‚Ñ‡Ñ‘Ñ‚ Ð²Ð¼ÐµÑÑ‚Ðµ Ð¿ÐµÑ€ÐµÐ´ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²ÐºÐ¾Ð¹ ÐºÐ»Ð¸ÐµÐ½Ñ‚Ñƒ."]),
    ("work", ["He fixed a mistake.", "He fixed a mistake in the document.", "He fixed a mistake in the document before the call.", "He fixed a mistake in the document before the call and saved a copy."], ["ÐžÐ½ Ð¸ÑÐ¿Ñ€Ð°Ð²Ð¸Ð» Ð¾ÑˆÐ¸Ð±ÐºÑƒ.", "ÐžÐ½ Ð¸ÑÐ¿Ñ€Ð°Ð²Ð¸Ð» Ð¾ÑˆÐ¸Ð±ÐºÑƒ Ð² Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ðµ.", "ÐžÐ½ Ð¸ÑÐ¿Ñ€Ð°Ð²Ð¸Ð» Ð¾ÑˆÐ¸Ð±ÐºÑƒ Ð² Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ðµ Ð¿ÐµÑ€ÐµÐ´ Ð·Ð²Ð¾Ð½ÐºÐ¾Ð¼.", "ÐžÐ½ Ð¸ÑÐ¿Ñ€Ð°Ð²Ð¸Ð» Ð¾ÑˆÐ¸Ð±ÐºÑƒ Ð² Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ðµ Ð¿ÐµÑ€ÐµÐ´ Ð·Ð²Ð¾Ð½ÐºÐ¾Ð¼ Ð¸ ÑÐ¾Ñ…Ñ€Ð°Ð½Ð¸Ð» ÐºÐ¾Ð¿Ð¸ÑŽ."]),
    ("work", ["They changed the plan.", "They changed the plan at work.", "They changed the plan at work after the meeting.", "They changed the plan at work after the meeting because the client was late."], ["ÐžÐ½Ð¸ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ð»Ð¸ Ð¿Ð»Ð°Ð½.", "ÐžÐ½Ð¸ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ð»Ð¸ Ð¿Ð»Ð°Ð½ Ð½Ð° Ñ€Ð°Ð±Ð¾Ñ‚Ðµ.", "ÐžÐ½Ð¸ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ð»Ð¸ Ð¿Ð»Ð°Ð½ Ð½Ð° Ñ€Ð°Ð±Ð¾Ñ‚Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð²ÑÑ‚Ñ€ÐµÑ‡Ð¸.", "ÐžÐ½Ð¸ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ð»Ð¸ Ð¿Ð»Ð°Ð½ Ð½Ð° Ñ€Ð°Ð±Ð¾Ñ‚Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð²ÑÑ‚Ñ€ÐµÑ‡Ð¸, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ ÐºÐ»Ð¸ÐµÐ½Ñ‚ Ð¾Ð¿Ð°Ð·Ð´Ñ‹Ð²Ð°Ð»."]),
    ("study", ["I wrote a note.", "I wrote a note in my notebook.", "I wrote a note in my notebook during class.", "I wrote a note in my notebook during class so I could remember it."], ["Ð¯ Ð½Ð°Ð¿Ð¸ÑÐ°Ð» Ð·Ð°Ð¼ÐµÑ‚ÐºÑƒ.", "Ð¯ Ð½Ð°Ð¿Ð¸ÑÐ°Ð» Ð·Ð°Ð¼ÐµÑ‚ÐºÑƒ Ð² Ñ‚ÐµÑ‚Ñ€Ð°Ð´Ð¸.", "Ð¯ Ð½Ð°Ð¿Ð¸ÑÐ°Ð» Ð·Ð°Ð¼ÐµÑ‚ÐºÑƒ Ð² Ñ‚ÐµÑ‚Ñ€Ð°Ð´Ð¸ Ð²Ð¾ Ð²Ñ€ÐµÐ¼Ñ ÑƒÑ€Ð¾ÐºÐ°.", "Ð¯ Ð½Ð°Ð¿Ð¸ÑÐ°Ð» Ð·Ð°Ð¼ÐµÑ‚ÐºÑƒ Ð² Ñ‚ÐµÑ‚Ñ€Ð°Ð´Ð¸ Ð²Ð¾ Ð²Ñ€ÐµÐ¼Ñ ÑƒÑ€Ð¾ÐºÐ°, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð·Ð°Ð¿Ð¾Ð¼Ð½Ð¸Ñ‚ÑŒ ÑÑ‚Ð¾."]),
    ("study", ["She read the page.", "She read the page slowly.", "She read the page slowly before the test.", "She read the page slowly before the test and marked new words."], ["ÐžÐ½Ð° Ð¿Ñ€Ð¾Ñ‡Ð¸Ñ‚Ð°Ð»Ð° ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ñƒ.", "ÐžÐ½Ð° Ð¿Ñ€Ð¾Ñ‡Ð¸Ñ‚Ð°Ð»Ð° ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ñƒ Ð¼ÐµÐ´Ð»ÐµÐ½Ð½Ð¾.", "ÐžÐ½Ð° Ð¿Ñ€Ð¾Ñ‡Ð¸Ñ‚Ð°Ð»Ð° ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ñƒ Ð¼ÐµÐ´Ð»ÐµÐ½Ð½Ð¾ Ð¿ÐµÑ€ÐµÐ´ Ñ‚ÐµÑÑ‚Ð¾Ð¼.", "ÐžÐ½Ð° Ð¿Ñ€Ð¾Ñ‡Ð¸Ñ‚Ð°Ð»Ð° ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ñƒ Ð¼ÐµÐ´Ð»ÐµÐ½Ð½Ð¾ Ð¿ÐµÑ€ÐµÐ´ Ñ‚ÐµÑÑ‚Ð¾Ð¼ Ð¸ Ð¾Ñ‚Ð¼ÐµÑ‚Ð¸Ð»Ð° Ð½Ð¾Ð²Ñ‹Ðµ ÑÐ»Ð¾Ð²Ð°."]),
    ("study", ["We practiced together.", "We practiced together after school.", "We practiced together after school for half an hour.", "We practiced together after school for half an hour because the exam was close."], ["ÐœÑ‹ Ð·Ð°Ð½Ð¸Ð¼Ð°Ð»Ð¸ÑÑŒ Ð²Ð¼ÐµÑÑ‚Ðµ.", "ÐœÑ‹ Ð·Ð°Ð½Ð¸Ð¼Ð°Ð»Ð¸ÑÑŒ Ð²Ð¼ÐµÑÑ‚Ðµ Ð¿Ð¾ÑÐ»Ðµ ÑˆÐºÐ¾Ð»Ñ‹.", "ÐœÑ‹ Ð·Ð°Ð½Ð¸Ð¼Ð°Ð»Ð¸ÑÑŒ Ð²Ð¼ÐµÑÑ‚Ðµ Ð¿Ð¾ÑÐ»Ðµ ÑˆÐºÐ¾Ð»Ñ‹ Ð¿Ð¾Ð»Ñ‡Ð°ÑÐ°.", "ÐœÑ‹ Ð·Ð°Ð½Ð¸Ð¼Ð°Ð»Ð¸ÑÑŒ Ð²Ð¼ÐµÑÑ‚Ðµ Ð¿Ð¾ÑÐ»Ðµ ÑˆÐºÐ¾Ð»Ñ‹ Ð¿Ð¾Ð»Ñ‡Ð°ÑÐ°, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ ÑÐºÐ·Ð°Ð¼ÐµÐ½ Ð±Ñ‹Ð» Ð±Ð»Ð¸Ð·ÐºÐ¾."]),
    ("study", ["He asked a question.", "He asked a question in class.", "He asked a question in class about homework.", "He asked a question in class about homework and wrote down the answer."], ["ÐžÐ½ Ð·Ð°Ð´Ð°Ð» Ð²Ð¾Ð¿Ñ€Ð¾Ñ.", "ÐžÐ½ Ð·Ð°Ð´Ð°Ð» Ð²Ð¾Ð¿Ñ€Ð¾Ñ Ð½Ð° ÑƒÑ€Ð¾ÐºÐµ.", "ÐžÐ½ Ð·Ð°Ð´Ð°Ð» Ð²Ð¾Ð¿Ñ€Ð¾Ñ Ð½Ð° ÑƒÑ€Ð¾ÐºÐµ Ð¾ Ð´Ð¾Ð¼Ð°ÑˆÐ½ÐµÐ¼ Ð·Ð°Ð´Ð°Ð½Ð¸Ð¸.", "ÐžÐ½ Ð·Ð°Ð´Ð°Ð» Ð²Ð¾Ð¿Ñ€Ð¾Ñ Ð½Ð° ÑƒÑ€Ð¾ÐºÐµ Ð¾ Ð´Ð¾Ð¼Ð°ÑˆÐ½ÐµÐ¼ Ð·Ð°Ð´Ð°Ð½Ð¸Ð¸ Ð¸ Ð·Ð°Ð¿Ð¸ÑÐ°Ð» Ð¾Ñ‚Ð²ÐµÑ‚."]),
    ("study", ["They opened their books.", "They opened their books on the desk.", "They opened their books on the desk after the break.", "They opened their books on the desk after the break and started reading."], ["ÐžÐ½Ð¸ Ð¾Ñ‚ÐºÑ€Ñ‹Ð»Ð¸ ÐºÐ½Ð¸Ð³Ð¸.", "ÐžÐ½Ð¸ Ð¾Ñ‚ÐºÑ€Ñ‹Ð»Ð¸ ÐºÐ½Ð¸Ð³Ð¸ Ð½Ð° Ð¿Ð°Ñ€Ñ‚Ðµ.", "ÐžÐ½Ð¸ Ð¾Ñ‚ÐºÑ€Ñ‹Ð»Ð¸ ÐºÐ½Ð¸Ð³Ð¸ Ð½Ð° Ð¿Ð°Ñ€Ñ‚Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð¿ÐµÑ€ÐµÑ€Ñ‹Ð²Ð°.", "ÐžÐ½Ð¸ Ð¾Ñ‚ÐºÑ€Ñ‹Ð»Ð¸ ÐºÐ½Ð¸Ð³Ð¸ Ð½Ð° Ð¿Ð°Ñ€Ñ‚Ðµ Ð¿Ð¾ÑÐ»Ðµ Ð¿ÐµÑ€ÐµÑ€Ñ‹Ð²Ð° Ð¸ Ð½Ð°Ñ‡Ð°Ð»Ð¸ Ñ‡Ð¸Ñ‚Ð°Ñ‚ÑŒ."]),
    ("travel", ["I booked a ticket.", "I booked a ticket online.", "I booked a ticket online last night.", "I booked a ticket online last night because the price was low."], ["Ð¯ Ð·Ð°Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð» Ð±Ð¸Ð»ÐµÑ‚.", "Ð¯ Ð·Ð°Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð» Ð±Ð¸Ð»ÐµÑ‚ Ð¾Ð½Ð»Ð°Ð¹Ð½.", "Ð¯ Ð·Ð°Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð» Ð±Ð¸Ð»ÐµÑ‚ Ð¾Ð½Ð»Ð°Ð¹Ð½ Ð¿Ñ€Ð¾ÑˆÐ»Ð¾Ð¹ Ð½Ð¾Ñ‡ÑŒÑŽ.", "Ð¯ Ð·Ð°Ð±Ñ€Ð¾Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð» Ð±Ð¸Ð»ÐµÑ‚ Ð¾Ð½Ð»Ð°Ð¹Ð½ Ð¿Ñ€Ð¾ÑˆÐ»Ð¾Ð¹ Ð½Ð¾Ñ‡ÑŒÑŽ, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ñ†ÐµÐ½Ð° Ð±Ñ‹Ð»Ð° Ð½Ð¸Ð·ÐºÐ¾Ð¹."]),
    ("travel", ["She packed her bag.", "She packed her bag before the trip.", "She packed her bag before the trip on Sunday.", "She packed her bag before the trip on Sunday and checked her passport."], ["ÐžÐ½Ð° ÑÐ¾Ð±Ñ€Ð°Ð»Ð° ÑÑƒÐ¼ÐºÑƒ.", "ÐžÐ½Ð° ÑÐ¾Ð±Ñ€Ð°Ð»Ð° ÑÑƒÐ¼ÐºÑƒ Ð¿ÐµÑ€ÐµÐ´ Ð¿Ð¾ÐµÐ·Ð´ÐºÐ¾Ð¹.", "ÐžÐ½Ð° ÑÐ¾Ð±Ñ€Ð°Ð»Ð° ÑÑƒÐ¼ÐºÑƒ Ð¿ÐµÑ€ÐµÐ´ Ð¿Ð¾ÐµÐ·Ð´ÐºÐ¾Ð¹ Ð² Ð²Ð¾ÑÐºÑ€ÐµÑÐµÐ½ÑŒÐµ.", "ÐžÐ½Ð° ÑÐ¾Ð±Ñ€Ð°Ð»Ð° ÑÑƒÐ¼ÐºÑƒ Ð¿ÐµÑ€ÐµÐ´ Ð¿Ð¾ÐµÐ·Ð´ÐºÐ¾Ð¹ Ð² Ð²Ð¾ÑÐºÑ€ÐµÑÐµÐ½ÑŒÐµ Ð¸ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð»Ð° Ð¿Ð°ÑÐ¿Ð¾Ñ€Ñ‚."]),
    ("travel", ["We found the station.", "We found the station near the hotel.", "We found the station near the hotel in the morning.", "We found the station near the hotel in the morning and bought two tickets."], ["ÐœÑ‹ Ð½Ð°ÑˆÐ»Ð¸ ÑÑ‚Ð°Ð½Ñ†Ð¸ÑŽ.", "ÐœÑ‹ Ð½Ð°ÑˆÐ»Ð¸ ÑÑ‚Ð°Ð½Ñ†Ð¸ÑŽ Ð²Ð¾Ð·Ð»Ðµ Ð¾Ñ‚ÐµÐ»Ñ.", "ÐœÑ‹ Ð½Ð°ÑˆÐ»Ð¸ ÑÑ‚Ð°Ð½Ñ†Ð¸ÑŽ Ð²Ð¾Ð·Ð»Ðµ Ð¾Ñ‚ÐµÐ»Ñ ÑƒÑ‚Ñ€Ð¾Ð¼.", "ÐœÑ‹ Ð½Ð°ÑˆÐ»Ð¸ ÑÑ‚Ð°Ð½Ñ†Ð¸ÑŽ Ð²Ð¾Ð·Ð»Ðµ Ð¾Ñ‚ÐµÐ»Ñ ÑƒÑ‚Ñ€Ð¾Ð¼ Ð¸ ÐºÑƒÐ¿Ð¸Ð»Ð¸ Ð´Ð²Ð° Ð±Ð¸Ð»ÐµÑ‚Ð°."]),
    ("travel", ["He called a taxi.", "He called a taxi from the airport.", "He called a taxi from the airport after midnight.", "He called a taxi from the airport after midnight because the train had stopped."], ["ÐžÐ½ Ð²Ñ‹Ð·Ð²Ð°Ð» Ñ‚Ð°ÐºÑÐ¸.", "ÐžÐ½ Ð²Ñ‹Ð·Ð²Ð°Ð» Ñ‚Ð°ÐºÑÐ¸ Ð¸Ð· Ð°ÑÑ€Ð¾Ð¿Ð¾Ñ€Ñ‚Ð°.", "ÐžÐ½ Ð²Ñ‹Ð·Ð²Ð°Ð» Ñ‚Ð°ÐºÑÐ¸ Ð¸Ð· Ð°ÑÑ€Ð¾Ð¿Ð¾Ñ€Ñ‚Ð° Ð¿Ð¾ÑÐ»Ðµ Ð¿Ð¾Ð»ÑƒÐ½Ð¾Ñ‡Ð¸.", "ÐžÐ½ Ð²Ñ‹Ð·Ð²Ð°Ð» Ñ‚Ð°ÐºÑÐ¸ Ð¸Ð· Ð°ÑÑ€Ð¾Ð¿Ð¾Ñ€Ñ‚Ð° Ð¿Ð¾ÑÐ»Ðµ Ð¿Ð¾Ð»ÑƒÐ½Ð¾Ñ‡Ð¸, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð¿Ð¾ÐµÐ·Ð´ ÑƒÐ¶Ðµ Ð½Ðµ Ñ…Ð¾Ð´Ð¸Ð»."]),
    ("travel", ["They walked to the hotel.", "They walked to the hotel with their bags.", "They walked to the hotel with their bags after dinner.", "They walked to the hotel with their bags after dinner because it was close."], ["ÐžÐ½Ð¸ Ð¿Ð¾ÑˆÐ»Ð¸ Ð² Ð¾Ñ‚ÐµÐ»ÑŒ Ð¿ÐµÑˆÐºÐ¾Ð¼.", "ÐžÐ½Ð¸ Ð¿Ð¾ÑˆÐ»Ð¸ Ð² Ð¾Ñ‚ÐµÐ»ÑŒ Ð¿ÐµÑˆÐºÐ¾Ð¼ Ñ ÑÑƒÐ¼ÐºÐ°Ð¼Ð¸.", "ÐžÐ½Ð¸ Ð¿Ð¾ÑˆÐ»Ð¸ Ð² Ð¾Ñ‚ÐµÐ»ÑŒ Ð¿ÐµÑˆÐºÐ¾Ð¼ Ñ ÑÑƒÐ¼ÐºÐ°Ð¼Ð¸ Ð¿Ð¾ÑÐ»Ðµ ÑƒÐ¶Ð¸Ð½Ð°.", "ÐžÐ½Ð¸ Ð¿Ð¾ÑˆÐ»Ð¸ Ð² Ð¾Ñ‚ÐµÐ»ÑŒ Ð¿ÐµÑˆÐºÐ¾Ð¼ Ñ ÑÑƒÐ¼ÐºÐ°Ð¼Ð¸ Ð¿Ð¾ÑÐ»Ðµ ÑƒÐ¶Ð¸Ð½Ð°, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð¾Ð½ Ð±Ñ‹Ð» Ñ€ÑÐ´Ð¾Ð¼."]),
    ("shopping", ["I paid by card.", "I paid by card at the supermarket.", "I paid by card at the supermarket this afternoon.", "I paid by card at the supermarket this afternoon because I had no cash."], ["Ð¯ Ð·Ð°Ð¿Ð»Ð°Ñ‚Ð¸Ð» ÐºÐ°Ñ€Ñ‚Ð¾Ð¹.", "Ð¯ Ð·Ð°Ð¿Ð»Ð°Ñ‚Ð¸Ð» ÐºÐ°Ñ€Ñ‚Ð¾Ð¹ Ð² ÑÑƒÐ¿ÐµÑ€Ð¼Ð°Ñ€ÐºÐµÑ‚Ðµ.", "Ð¯ Ð·Ð°Ð¿Ð»Ð°Ñ‚Ð¸Ð» ÐºÐ°Ñ€Ñ‚Ð¾Ð¹ Ð² ÑÑƒÐ¿ÐµÑ€Ð¼Ð°Ñ€ÐºÐµÑ‚Ðµ ÑÐµÐ³Ð¾Ð´Ð½Ñ Ð´Ð½Ñ‘Ð¼.", "Ð¯ Ð·Ð°Ð¿Ð»Ð°Ñ‚Ð¸Ð» ÐºÐ°Ñ€Ñ‚Ð¾Ð¹ Ð² ÑÑƒÐ¿ÐµÑ€Ð¼Ð°Ñ€ÐºÐµÑ‚Ðµ ÑÐµÐ³Ð¾Ð´Ð½Ñ Ð´Ð½Ñ‘Ð¼, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ñƒ Ð¼ÐµÐ½Ñ Ð½Ðµ Ð±Ñ‹Ð»Ð¾ Ð½Ð°Ð»Ð¸Ñ‡Ð½Ñ‹Ñ…."]),
    ("shopping", ["She returned the jacket.", "She returned the jacket to the store.", "She returned the jacket to the store after work.", "She returned the jacket to the store after work because it was too small."], ["ÐžÐ½Ð° Ð²ÐµÑ€Ð½ÑƒÐ»Ð° ÐºÑƒÑ€Ñ‚ÐºÑƒ.", "ÐžÐ½Ð° Ð²ÐµÑ€Ð½ÑƒÐ»Ð° ÐºÑƒÑ€Ñ‚ÐºÑƒ Ð² Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½.", "ÐžÐ½Ð° Ð²ÐµÑ€Ð½ÑƒÐ»Ð° ÐºÑƒÑ€Ñ‚ÐºÑƒ Ð² Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹.", "ÐžÐ½Ð° Ð²ÐµÑ€Ð½ÑƒÐ»Ð° ÐºÑƒÑ€Ñ‚ÐºÑƒ Ð² Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð¾Ð½Ð° Ð±Ñ‹Ð»Ð° ÑÐ»Ð¸ÑˆÐºÐ¾Ð¼ Ð¼Ð°Ð»ÐµÐ½ÑŒÐºÐ¾Ð¹."]),
    ("shopping", ["We chose a gift.", "We chose a gift for our friend.", "We chose a gift for our friend at the mall.", "We chose a gift for our friend at the mall and wrapped it at home."], ["ÐœÑ‹ Ð²Ñ‹Ð±Ñ€Ð°Ð»Ð¸ Ð¿Ð¾Ð´Ð°Ñ€Ð¾Ðº.", "ÐœÑ‹ Ð²Ñ‹Ð±Ñ€Ð°Ð»Ð¸ Ð¿Ð¾Ð´Ð°Ñ€Ð¾Ðº Ð´Ð»Ñ Ð´Ñ€ÑƒÐ³Ð°.", "ÐœÑ‹ Ð²Ñ‹Ð±Ñ€Ð°Ð»Ð¸ Ð¿Ð¾Ð´Ð°Ñ€Ð¾Ðº Ð´Ð»Ñ Ð´Ñ€ÑƒÐ³Ð° Ð² Ñ‚Ð¾Ñ€Ð³Ð¾Ð²Ð¾Ð¼ Ñ†ÐµÐ½Ñ‚Ñ€Ðµ.", "ÐœÑ‹ Ð²Ñ‹Ð±Ñ€Ð°Ð»Ð¸ Ð¿Ð¾Ð´Ð°Ñ€Ð¾Ðº Ð´Ð»Ñ Ð´Ñ€ÑƒÐ³Ð° Ð² Ñ‚Ð¾Ñ€Ð³Ð¾Ð²Ð¾Ð¼ Ñ†ÐµÐ½Ñ‚Ñ€Ðµ Ð¸ Ð·Ð°Ð²ÐµÑ€Ð½ÑƒÐ»Ð¸ ÐµÐ³Ð¾ Ð´Ð¾Ð¼Ð°."]),
    ("shopping", ["He checked the receipt.", "He checked the receipt near the door.", "He checked the receipt near the door after paying.", "He checked the receipt near the door after paying because the price looked wrong."], ["ÐžÐ½ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð» Ñ‡ÐµÐº.", "ÐžÐ½ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð» Ñ‡ÐµÐº Ð²Ð¾Ð·Ð»Ðµ Ð´Ð²ÐµÑ€Ð¸.", "ÐžÐ½ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð» Ñ‡ÐµÐº Ð²Ð¾Ð·Ð»Ðµ Ð´Ð²ÐµÑ€Ð¸ Ð¿Ð¾ÑÐ»Ðµ Ð¾Ð¿Ð»Ð°Ñ‚Ñ‹.", "ÐžÐ½ Ð¿Ñ€Ð¾Ð²ÐµÑ€Ð¸Ð» Ñ‡ÐµÐº Ð²Ð¾Ð·Ð»Ðµ Ð´Ð²ÐµÑ€Ð¸ Ð¿Ð¾ÑÐ»Ðµ Ð¾Ð¿Ð»Ð°Ñ‚Ñ‹, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ñ†ÐµÐ½Ð° Ð²Ñ‹Ð³Ð»ÑÐ´ÐµÐ»Ð° Ð½ÐµÐ¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ð¾Ð¹."]),
    ("shopping", ["They bought fresh fruit.", "They bought fresh fruit at the market.", "They bought fresh fruit at the market on Saturday.", "They bought fresh fruit at the market on Saturday and made a salad."], ["ÐžÐ½Ð¸ ÐºÑƒÐ¿Ð¸Ð»Ð¸ ÑÐ²ÐµÐ¶Ð¸Ðµ Ñ„Ñ€ÑƒÐºÑ‚Ñ‹.", "ÐžÐ½Ð¸ ÐºÑƒÐ¿Ð¸Ð»Ð¸ ÑÐ²ÐµÐ¶Ð¸Ðµ Ñ„Ñ€ÑƒÐºÑ‚Ñ‹ Ð½Ð° Ñ€Ñ‹Ð½ÐºÐµ.", "ÐžÐ½Ð¸ ÐºÑƒÐ¿Ð¸Ð»Ð¸ ÑÐ²ÐµÐ¶Ð¸Ðµ Ñ„Ñ€ÑƒÐºÑ‚Ñ‹ Ð½Ð° Ñ€Ñ‹Ð½ÐºÐµ Ð² ÑÑƒÐ±Ð±Ð¾Ñ‚Ñƒ.", "ÐžÐ½Ð¸ ÐºÑƒÐ¿Ð¸Ð»Ð¸ ÑÐ²ÐµÐ¶Ð¸Ðµ Ñ„Ñ€ÑƒÐºÑ‚Ñ‹ Ð½Ð° Ñ€Ñ‹Ð½ÐºÐµ Ð² ÑÑƒÐ±Ð±Ð¾Ñ‚Ñƒ Ð¸ ÑÐ´ÐµÐ»Ð°Ð»Ð¸ ÑÐ°Ð»Ð°Ñ‚."]),
    ("health", ["I drank water.", "I drank water after running.", "I drank water after running in the park.", "I drank water after running in the park because I felt thirsty."], ["Ð¯ Ð²Ñ‹Ð¿Ð¸Ð» Ð²Ð¾Ð´Ñ‹.", "Ð¯ Ð²Ñ‹Ð¿Ð¸Ð» Ð²Ð¾Ð´Ñ‹ Ð¿Ð¾ÑÐ»Ðµ Ð±ÐµÐ³Ð°.", "Ð¯ Ð²Ñ‹Ð¿Ð¸Ð» Ð²Ð¾Ð´Ñ‹ Ð¿Ð¾ÑÐ»Ðµ Ð±ÐµÐ³Ð° Ð² Ð¿Ð°Ñ€ÐºÐµ.", "Ð¯ Ð²Ñ‹Ð¿Ð¸Ð» Ð²Ð¾Ð´Ñ‹ Ð¿Ð¾ÑÐ»Ðµ Ð±ÐµÐ³Ð° Ð² Ð¿Ð°Ñ€ÐºÐµ, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ñ…Ð¾Ñ‚ÐµÐ» Ð¿Ð¸Ñ‚ÑŒ."]),
    ("health", ["She took medicine.", "She took medicine before bed.", "She took medicine before bed with warm tea.", "She took medicine before bed with warm tea because her throat hurt."], ["ÐžÐ½Ð° Ð¿Ñ€Ð¸Ð½ÑÐ»Ð° Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð²Ð¾.", "ÐžÐ½Ð° Ð¿Ñ€Ð¸Ð½ÑÐ»Ð° Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð²Ð¾ Ð¿ÐµÑ€ÐµÐ´ ÑÐ½Ð¾Ð¼.", "ÐžÐ½Ð° Ð¿Ñ€Ð¸Ð½ÑÐ»Ð° Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð²Ð¾ Ð¿ÐµÑ€ÐµÐ´ ÑÐ½Ð¾Ð¼ Ñ Ñ‚Ñ‘Ð¿Ð»Ñ‹Ð¼ Ñ‡Ð°ÐµÐ¼.", "ÐžÐ½Ð° Ð¿Ñ€Ð¸Ð½ÑÐ»Ð° Ð»ÐµÐºÐ°Ñ€ÑÑ‚Ð²Ð¾ Ð¿ÐµÑ€ÐµÐ´ ÑÐ½Ð¾Ð¼ Ñ Ñ‚Ñ‘Ð¿Ð»Ñ‹Ð¼ Ñ‡Ð°ÐµÐ¼, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ñƒ Ð½ÐµÑ‘ Ð±Ð¾Ð»ÐµÐ»Ð¾ Ð³Ð¾Ñ€Ð»Ð¾."]),
    ("health", ["We visited the doctor.", "We visited the doctor in the morning.", "We visited the doctor in the morning at the clinic.", "We visited the doctor in the morning at the clinic and asked about the results."], ["ÐœÑ‹ Ð¿Ð¾ÑÐµÑ‚Ð¸Ð»Ð¸ Ð²Ñ€Ð°Ñ‡Ð°.", "ÐœÑ‹ Ð¿Ð¾ÑÐµÑ‚Ð¸Ð»Ð¸ Ð²Ñ€Ð°Ñ‡Ð° ÑƒÑ‚Ñ€Ð¾Ð¼.", "ÐœÑ‹ Ð¿Ð¾ÑÐµÑ‚Ð¸Ð»Ð¸ Ð²Ñ€Ð°Ñ‡Ð° ÑƒÑ‚Ñ€Ð¾Ð¼ Ð² ÐºÐ»Ð¸Ð½Ð¸ÐºÐµ.", "ÐœÑ‹ Ð¿Ð¾ÑÐµÑ‚Ð¸Ð»Ð¸ Ð²Ñ€Ð°Ñ‡Ð° ÑƒÑ‚Ñ€Ð¾Ð¼ Ð² ÐºÐ»Ð¸Ð½Ð¸ÐºÐµ Ð¸ ÑÐ¿Ñ€Ð¾ÑÐ¸Ð»Ð¸ Ð¾ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ð°Ñ…."]),
    ("health", ["He felt better.", "He felt better after breakfast.", "He felt better after breakfast at home.", "He felt better after breakfast at home and went to work."], ["ÐžÐ½ Ð¿Ð¾Ñ‡ÑƒÐ²ÑÑ‚Ð²Ð¾Ð²Ð°Ð» ÑÐµÐ±Ñ Ð»ÑƒÑ‡ÑˆÐµ.", "ÐžÐ½ Ð¿Ð¾Ñ‡ÑƒÐ²ÑÑ‚Ð²Ð¾Ð²Ð°Ð» ÑÐµÐ±Ñ Ð»ÑƒÑ‡ÑˆÐµ Ð¿Ð¾ÑÐ»Ðµ Ð·Ð°Ð²Ñ‚Ñ€Ð°ÐºÐ°.", "ÐžÐ½ Ð¿Ð¾Ñ‡ÑƒÐ²ÑÑ‚Ð²Ð¾Ð²Ð°Ð» ÑÐµÐ±Ñ Ð»ÑƒÑ‡ÑˆÐµ Ð¿Ð¾ÑÐ»Ðµ Ð·Ð°Ð²Ñ‚Ñ€Ð°ÐºÐ° Ð´Ð¾Ð¼Ð°.", "ÐžÐ½ Ð¿Ð¾Ñ‡ÑƒÐ²ÑÑ‚Ð²Ð¾Ð²Ð°Ð» ÑÐµÐ±Ñ Ð»ÑƒÑ‡ÑˆÐµ Ð¿Ð¾ÑÐ»Ðµ Ð·Ð°Ð²Ñ‚Ñ€Ð°ÐºÐ° Ð´Ð¾Ð¼Ð° Ð¸ Ð¿Ð¾ÑˆÑ‘Ð» Ð½Ð° Ñ€Ð°Ð±Ð¾Ñ‚Ñƒ."]),
    ("health", ["They rested at home.", "They rested at home all evening.", "They rested at home all evening after the long walk.", "They rested at home all evening after the long walk because they were tired."], ["ÐžÐ½Ð¸ Ð¾Ñ‚Ð´Ñ‹Ñ…Ð°Ð»Ð¸ Ð´Ð¾Ð¼Ð°.", "ÐžÐ½Ð¸ Ð¾Ñ‚Ð´Ñ‹Ñ…Ð°Ð»Ð¸ Ð´Ð¾Ð¼Ð° Ð²ÐµÑÑŒ Ð²ÐµÑ‡ÐµÑ€.", "ÐžÐ½Ð¸ Ð¾Ñ‚Ð´Ñ‹Ñ…Ð°Ð»Ð¸ Ð´Ð¾Ð¼Ð° Ð²ÐµÑÑŒ Ð²ÐµÑ‡ÐµÑ€ Ð¿Ð¾ÑÐ»Ðµ Ð´Ð¾Ð»Ð³Ð¾Ð¹ Ð¿Ñ€Ð¾Ð³ÑƒÐ»ÐºÐ¸.", "ÐžÐ½Ð¸ Ð¾Ñ‚Ð´Ñ‹Ñ…Ð°Ð»Ð¸ Ð´Ð¾Ð¼Ð° Ð²ÐµÑÑŒ Ð²ÐµÑ‡ÐµÑ€ Ð¿Ð¾ÑÐ»Ðµ Ð´Ð¾Ð»Ð³Ð¾Ð¹ Ð¿Ñ€Ð¾Ð³ÑƒÐ»ÐºÐ¸, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ ÑƒÑÑ‚Ð°Ð»Ð¸."]),
    ("food", ["I cooked rice.", "I cooked rice for dinner.", "I cooked rice for dinner in the kitchen.", "I cooked rice for dinner in the kitchen and added vegetables."], ["Ð¯ Ð¿Ñ€Ð¸Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð» Ñ€Ð¸Ñ.", "Ð¯ Ð¿Ñ€Ð¸Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð» Ñ€Ð¸Ñ Ð½Ð° ÑƒÐ¶Ð¸Ð½.", "Ð¯ Ð¿Ñ€Ð¸Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð» Ñ€Ð¸Ñ Ð½Ð° ÑƒÐ¶Ð¸Ð½ Ð½Ð° ÐºÑƒÑ…Ð½Ðµ.", "Ð¯ Ð¿Ñ€Ð¸Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð» Ñ€Ð¸Ñ Ð½Ð° ÑƒÐ¶Ð¸Ð½ Ð½Ð° ÐºÑƒÑ…Ð½Ðµ Ð¸ Ð´Ð¾Ð±Ð°Ð²Ð¸Ð» Ð¾Ð²Ð¾Ñ‰Ð¸."]),
    ("food", ["She ordered soup.", "She ordered soup at the restaurant.", "She ordered soup at the restaurant after work.", "She ordered soup at the restaurant after work because she was cold."], ["ÐžÐ½Ð° Ð·Ð°ÐºÐ°Ð·Ð°Ð»Ð° ÑÑƒÐ¿.", "ÐžÐ½Ð° Ð·Ð°ÐºÐ°Ð·Ð°Ð»Ð° ÑÑƒÐ¿ Ð² Ñ€ÐµÑÑ‚Ð¾Ñ€Ð°Ð½Ðµ.", "ÐžÐ½Ð° Ð·Ð°ÐºÐ°Ð·Ð°Ð»Ð° ÑÑƒÐ¿ Ð² Ñ€ÐµÑÑ‚Ð¾Ñ€Ð°Ð½Ðµ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹.", "ÐžÐ½Ð° Ð·Ð°ÐºÐ°Ð·Ð°Ð»Ð° ÑÑƒÐ¿ Ð² Ñ€ÐµÑÑ‚Ð¾Ñ€Ð°Ð½Ðµ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ ÐµÐ¹ Ð±Ñ‹Ð»Ð¾ Ñ…Ð¾Ð»Ð¾Ð´Ð½Ð¾."]),
    ("food", ["We shared pizza.", "We shared pizza with our friends.", "We shared pizza with our friends on Friday.", "We shared pizza with our friends on Friday and watched a show."], ["ÐœÑ‹ Ñ€Ð°Ð·Ð´ÐµÐ»Ð¸Ð»Ð¸ Ð¿Ð¸Ñ†Ñ†Ñƒ.", "ÐœÑ‹ Ñ€Ð°Ð·Ð´ÐµÐ»Ð¸Ð»Ð¸ Ð¿Ð¸Ñ†Ñ†Ñƒ Ñ Ð´Ñ€ÑƒÐ·ÑŒÑÐ¼Ð¸.", "ÐœÑ‹ Ñ€Ð°Ð·Ð´ÐµÐ»Ð¸Ð»Ð¸ Ð¿Ð¸Ñ†Ñ†Ñƒ Ñ Ð´Ñ€ÑƒÐ·ÑŒÑÐ¼Ð¸ Ð² Ð¿ÑÑ‚Ð½Ð¸Ñ†Ñƒ.", "ÐœÑ‹ Ñ€Ð°Ð·Ð´ÐµÐ»Ð¸Ð»Ð¸ Ð¿Ð¸Ñ†Ñ†Ñƒ Ñ Ð´Ñ€ÑƒÐ·ÑŒÑÐ¼Ð¸ Ð² Ð¿ÑÑ‚Ð½Ð¸Ñ†Ñƒ Ð¸ Ð¿Ð¾ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ ÑˆÐ¾Ñƒ."]),
    ("food", ["He washed the vegetables.", "He washed the vegetables in the sink.", "He washed the vegetables in the sink before cooking.", "He washed the vegetables in the sink before cooking because they were dirty."], ["ÐžÐ½ Ð¿Ð¾Ð¼Ñ‹Ð» Ð¾Ð²Ð¾Ñ‰Ð¸.", "ÐžÐ½ Ð¿Ð¾Ð¼Ñ‹Ð» Ð¾Ð²Ð¾Ñ‰Ð¸ Ð² Ñ€Ð°ÐºÐ¾Ð²Ð¸Ð½Ðµ.", "ÐžÐ½ Ð¿Ð¾Ð¼Ñ‹Ð» Ð¾Ð²Ð¾Ñ‰Ð¸ Ð² Ñ€Ð°ÐºÐ¾Ð²Ð¸Ð½Ðµ Ð¿ÐµÑ€ÐµÐ´ Ð³Ð¾Ñ‚Ð¾Ð²ÐºÐ¾Ð¹.", "ÐžÐ½ Ð¿Ð¾Ð¼Ñ‹Ð» Ð¾Ð²Ð¾Ñ‰Ð¸ Ð² Ñ€Ð°ÐºÐ¾Ð²Ð¸Ð½Ðµ Ð¿ÐµÑ€ÐµÐ´ Ð³Ð¾Ñ‚Ð¾Ð²ÐºÐ¾Ð¹, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð¾Ð½Ð¸ Ð±Ñ‹Ð»Ð¸ Ð³Ñ€ÑÐ·Ð½Ñ‹Ðµ."]),
    ("food", ["They made breakfast.", "They made breakfast together.", "They made breakfast together on Sunday.", "They made breakfast together on Sunday and ate on the balcony."], ["ÐžÐ½Ð¸ Ð¿Ñ€Ð¸Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð»Ð¸ Ð·Ð°Ð²Ñ‚Ñ€Ð°Ðº.", "ÐžÐ½Ð¸ Ð¿Ñ€Ð¸Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð»Ð¸ Ð·Ð°Ð²Ñ‚Ñ€Ð°Ðº Ð²Ð¼ÐµÑÑ‚Ðµ.", "ÐžÐ½Ð¸ Ð¿Ñ€Ð¸Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð»Ð¸ Ð·Ð°Ð²Ñ‚Ñ€Ð°Ðº Ð²Ð¼ÐµÑÑ‚Ðµ Ð² Ð²Ð¾ÑÐºÑ€ÐµÑÐµÐ½ÑŒÐµ.", "ÐžÐ½Ð¸ Ð¿Ñ€Ð¸Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð»Ð¸ Ð·Ð°Ð²Ñ‚Ñ€Ð°Ðº Ð²Ð¼ÐµÑÑ‚Ðµ Ð² Ð²Ð¾ÑÐºÑ€ÐµÑÐµÐ½ÑŒÐµ Ð¸ Ð¿Ð¾ÐµÐ»Ð¸ Ð½Ð° Ð±Ð°Ð»ÐºÐ¾Ð½Ðµ."]),
    ("phone", ["I charged my phone.", "I charged my phone near the bed.", "I charged my phone near the bed before sleeping.", "I charged my phone near the bed before sleeping because the battery was low."], ["Ð¯ Ð·Ð°Ñ€ÑÐ´Ð¸Ð» Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½.", "Ð¯ Ð·Ð°Ñ€ÑÐ´Ð¸Ð» Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð²Ð¾Ð·Ð»Ðµ ÐºÑ€Ð¾Ð²Ð°Ñ‚Ð¸.", "Ð¯ Ð·Ð°Ñ€ÑÐ´Ð¸Ð» Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð²Ð¾Ð·Ð»Ðµ ÐºÑ€Ð¾Ð²Ð°Ñ‚Ð¸ Ð¿ÐµÑ€ÐµÐ´ ÑÐ½Ð¾Ð¼.", "Ð¯ Ð·Ð°Ñ€ÑÐ´Ð¸Ð» Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½ Ð²Ð¾Ð·Ð»Ðµ ÐºÑ€Ð¾Ð²Ð°Ñ‚Ð¸ Ð¿ÐµÑ€ÐµÐ´ ÑÐ½Ð¾Ð¼, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð±Ð°Ñ‚Ð°Ñ€ÐµÑ Ð±Ñ‹Ð»Ð° Ð¿Ð¾Ñ‡Ñ‚Ð¸ Ñ€Ð°Ð·Ñ€ÑÐ¶ÐµÐ½Ð°."]),
    ("phone", ["She sent a message.", "She sent a message to her brother.", "She sent a message to her brother during lunch.", "She sent a message to her brother during lunch and asked about dinner."], ["ÐžÐ½Ð° Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð»Ð° ÑÐ¾Ð¾Ð±Ñ‰ÐµÐ½Ð¸Ðµ.", "ÐžÐ½Ð° Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð»Ð° ÑÐ¾Ð¾Ð±Ñ‰ÐµÐ½Ð¸Ðµ Ð±Ñ€Ð°Ñ‚Ñƒ.", "ÐžÐ½Ð° Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð»Ð° ÑÐ¾Ð¾Ð±Ñ‰ÐµÐ½Ð¸Ðµ Ð±Ñ€Ð°Ñ‚Ñƒ Ð²Ð¾ Ð²Ñ€ÐµÐ¼Ñ Ð¾Ð±ÐµÐ´Ð°.", "ÐžÐ½Ð° Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð»Ð° ÑÐ¾Ð¾Ð±Ñ‰ÐµÐ½Ð¸Ðµ Ð±Ñ€Ð°Ñ‚Ñƒ Ð²Ð¾ Ð²Ñ€ÐµÐ¼Ñ Ð¾Ð±ÐµÐ´Ð° Ð¸ ÑÐ¿Ñ€Ð¾ÑÐ¸Ð»Ð° Ð¿Ñ€Ð¾ ÑƒÐ¶Ð¸Ð½."]),
    ("phone", ["We watched a video.", "We watched a video on my phone.", "We watched a video on my phone after class.", "We watched a video on my phone after class because it was funny."], ["ÐœÑ‹ Ð¿Ð¾ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ Ð²Ð¸Ð´ÐµÐ¾.", "ÐœÑ‹ Ð¿Ð¾ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ Ð²Ð¸Ð´ÐµÐ¾ Ð½Ð° Ð¼Ð¾Ñ‘Ð¼ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ðµ.", "ÐœÑ‹ Ð¿Ð¾ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ Ð²Ð¸Ð´ÐµÐ¾ Ð½Ð° Ð¼Ð¾Ñ‘Ð¼ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ðµ Ð¿Ð¾ÑÐ»Ðµ ÑƒÑ€Ð¾ÐºÐ°.", "ÐœÑ‹ Ð¿Ð¾ÑÐ¼Ð¾Ñ‚Ñ€ÐµÐ»Ð¸ Ð²Ð¸Ð´ÐµÐ¾ Ð½Ð° Ð¼Ð¾Ñ‘Ð¼ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ðµ Ð¿Ð¾ÑÐ»Ðµ ÑƒÑ€Ð¾ÐºÐ°, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð¾Ð½Ð¾ Ð±Ñ‹Ð»Ð¾ ÑÐ¼ÐµÑˆÐ½Ñ‹Ð¼."]),
    ("phone", ["He lost the charger.", "He lost the charger in his bag.", "He lost the charger in his bag at the airport.", "He lost the charger in his bag at the airport and bought a new one."], ["ÐžÐ½ Ð¿Ð¾Ñ‚ÐµÑ€ÑÐ» Ð·Ð°Ñ€ÑÐ´ÐºÑƒ.", "ÐžÐ½ Ð¿Ð¾Ñ‚ÐµÑ€ÑÐ» Ð·Ð°Ñ€ÑÐ´ÐºÑƒ Ð² ÑÑƒÐ¼ÐºÐµ.", "ÐžÐ½ Ð¿Ð¾Ñ‚ÐµÑ€ÑÐ» Ð·Ð°Ñ€ÑÐ´ÐºÑƒ Ð² ÑÑƒÐ¼ÐºÐµ Ð² Ð°ÑÑ€Ð¾Ð¿Ð¾Ñ€Ñ‚Ñƒ.", "ÐžÐ½ Ð¿Ð¾Ñ‚ÐµÑ€ÑÐ» Ð·Ð°Ñ€ÑÐ´ÐºÑƒ Ð² ÑÑƒÐ¼ÐºÐµ Ð² Ð°ÑÑ€Ð¾Ð¿Ð¾Ñ€Ñ‚Ñƒ Ð¸ ÐºÑƒÐ¿Ð¸Ð» Ð½Ð¾Ð²ÑƒÑŽ."]),
    ("phone", ["They joined the chat.", "They joined the chat after work.", "They joined the chat after work on their phones.", "They joined the chat after work on their phones and shared photos."], ["ÐžÐ½Ð¸ Ð¿Ñ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½Ð¸Ð»Ð¸ÑÑŒ Ðº Ñ‡Ð°Ñ‚Ñƒ.", "ÐžÐ½Ð¸ Ð¿Ñ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½Ð¸Ð»Ð¸ÑÑŒ Ðº Ñ‡Ð°Ñ‚Ñƒ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹.", "ÐžÐ½Ð¸ Ð¿Ñ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½Ð¸Ð»Ð¸ÑÑŒ Ðº Ñ‡Ð°Ñ‚Ñƒ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹ Ð½Ð° Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð°Ñ….", "ÐžÐ½Ð¸ Ð¿Ñ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½Ð¸Ð»Ð¸ÑÑŒ Ðº Ñ‡Ð°Ñ‚Ñƒ Ð¿Ð¾ÑÐ»Ðµ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹ Ð½Ð° Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð°Ñ… Ð¸ Ð¿Ð¾Ð´ÐµÐ»Ð¸Ð»Ð¸ÑÑŒ Ñ„Ð¾Ñ‚Ð¾Ð³Ñ€Ð°Ñ„Ð¸ÑÐ¼Ð¸."]),
    ("social", ["I invited my neighbor.", "I invited my neighbor for coffee.", "I invited my neighbor for coffee on Saturday.", "I invited my neighbor for coffee on Saturday because we had not talked for a long time."], ["Ð¯ Ð¿Ñ€Ð¸Ð³Ð»Ð°ÑÐ¸Ð» ÑÐ¾ÑÐµÐ´Ð°.", "Ð¯ Ð¿Ñ€Ð¸Ð³Ð»Ð°ÑÐ¸Ð» ÑÐ¾ÑÐµÐ´Ð° Ð½Ð° ÐºÐ¾Ñ„Ðµ.", "Ð¯ Ð¿Ñ€Ð¸Ð³Ð»Ð°ÑÐ¸Ð» ÑÐ¾ÑÐµÐ´Ð° Ð½Ð° ÐºÐ¾Ñ„Ðµ Ð² ÑÑƒÐ±Ð±Ð¾Ñ‚Ñƒ.", "Ð¯ Ð¿Ñ€Ð¸Ð³Ð»Ð°ÑÐ¸Ð» ÑÐ¾ÑÐµÐ´Ð° Ð½Ð° ÐºÐ¾Ñ„Ðµ Ð² ÑÑƒÐ±Ð±Ð¾Ñ‚Ñƒ, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð¼Ñ‹ Ð´Ð°Ð²Ð½Ð¾ Ð½Ðµ Ñ€Ð°Ð·Ð³Ð¾Ð²Ð°Ñ€Ð¸Ð²Ð°Ð»Ð¸."]),
    ("social", ["She thanked the teacher.", "She thanked the teacher after class.", "She thanked the teacher after class for the help.", "She thanked the teacher after class for the help and smiled."], ["ÐžÐ½Ð° Ð¿Ð¾Ð±Ð»Ð°Ð³Ð¾Ð´Ð°Ñ€Ð¸Ð»Ð° ÑƒÑ‡Ð¸Ñ‚ÐµÐ»Ñ.", "ÐžÐ½Ð° Ð¿Ð¾Ð±Ð»Ð°Ð³Ð¾Ð´Ð°Ñ€Ð¸Ð»Ð° ÑƒÑ‡Ð¸Ñ‚ÐµÐ»Ñ Ð¿Ð¾ÑÐ»Ðµ ÑƒÑ€Ð¾ÐºÐ°.", "ÐžÐ½Ð° Ð¿Ð¾Ð±Ð»Ð°Ð³Ð¾Ð´Ð°Ñ€Ð¸Ð»Ð° ÑƒÑ‡Ð¸Ñ‚ÐµÐ»Ñ Ð¿Ð¾ÑÐ»Ðµ ÑƒÑ€Ð¾ÐºÐ° Ð·Ð° Ð¿Ð¾Ð¼Ð¾Ñ‰ÑŒ.", "ÐžÐ½Ð° Ð¿Ð¾Ð±Ð»Ð°Ð³Ð¾Ð´Ð°Ñ€Ð¸Ð»Ð° ÑƒÑ‡Ð¸Ñ‚ÐµÐ»Ñ Ð¿Ð¾ÑÐ»Ðµ ÑƒÑ€Ð¾ÐºÐ° Ð·Ð° Ð¿Ð¾Ð¼Ð¾Ñ‰ÑŒ Ð¸ ÑƒÐ»Ñ‹Ð±Ð½ÑƒÐ»Ð°ÑÑŒ."]),
    ("social", ["We met our friends.", "We met our friends in the park.", "We met our friends in the park in the evening.", "We met our friends in the park in the evening and walked together."], ["ÐœÑ‹ Ð²ÑÑ‚Ñ€ÐµÑ‚Ð¸Ð»Ð¸ Ð´Ñ€ÑƒÐ·ÐµÐ¹.", "ÐœÑ‹ Ð²ÑÑ‚Ñ€ÐµÑ‚Ð¸Ð»Ð¸ Ð´Ñ€ÑƒÐ·ÐµÐ¹ Ð² Ð¿Ð°Ñ€ÐºÐµ.", "ÐœÑ‹ Ð²ÑÑ‚Ñ€ÐµÑ‚Ð¸Ð»Ð¸ Ð´Ñ€ÑƒÐ·ÐµÐ¹ Ð² Ð¿Ð°Ñ€ÐºÐµ Ð²ÐµÑ‡ÐµÑ€Ð¾Ð¼.", "ÐœÑ‹ Ð²ÑÑ‚Ñ€ÐµÑ‚Ð¸Ð»Ð¸ Ð´Ñ€ÑƒÐ·ÐµÐ¹ Ð² Ð¿Ð°Ñ€ÐºÐµ Ð²ÐµÑ‡ÐµÑ€Ð¾Ð¼ Ð¸ Ð³ÑƒÐ»ÑÐ»Ð¸ Ð²Ð¼ÐµÑÑ‚Ðµ."]),
    ("social", ["He helped his sister.", "He helped his sister with her bag.", "He helped his sister with her bag at the station.", "He helped his sister with her bag at the station because it was heavy."], ["ÐžÐ½ Ð¿Ð¾Ð¼Ð¾Ð³ ÑÐµÑÑ‚Ñ€Ðµ.", "ÐžÐ½ Ð¿Ð¾Ð¼Ð¾Ð³ ÑÐµÑÑ‚Ñ€Ðµ Ñ ÑÑƒÐ¼ÐºÐ¾Ð¹.", "ÐžÐ½ Ð¿Ð¾Ð¼Ð¾Ð³ ÑÐµÑÑ‚Ñ€Ðµ Ñ ÑÑƒÐ¼ÐºÐ¾Ð¹ Ð½Ð° ÑÑ‚Ð°Ð½Ñ†Ð¸Ð¸.", "ÐžÐ½ Ð¿Ð¾Ð¼Ð¾Ð³ ÑÐµÑÑ‚Ñ€Ðµ Ñ ÑÑƒÐ¼ÐºÐ¾Ð¹ Ð½Ð° ÑÑ‚Ð°Ð½Ñ†Ð¸Ð¸, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð¾Ð½Ð° Ð±Ñ‹Ð»Ð° Ñ‚ÑÐ¶Ñ‘Ð»Ð°Ñ."]),
    ("social", ["They talked quietly.", "They talked quietly in the hallway.", "They talked quietly in the hallway before the lesson.", "They talked quietly in the hallway before the lesson and made a plan."], ["ÐžÐ½Ð¸ Ñ‚Ð¸Ñ…Ð¾ Ñ€Ð°Ð·Ð³Ð¾Ð²Ð°Ñ€Ð¸Ð²Ð°Ð»Ð¸.", "ÐžÐ½Ð¸ Ñ‚Ð¸Ñ…Ð¾ Ñ€Ð°Ð·Ð³Ð¾Ð²Ð°Ñ€Ð¸Ð²Ð°Ð»Ð¸ Ð² ÐºÐ¾Ñ€Ð¸Ð´Ð¾Ñ€Ðµ.", "ÐžÐ½Ð¸ Ñ‚Ð¸Ñ…Ð¾ Ñ€Ð°Ð·Ð³Ð¾Ð²Ð°Ñ€Ð¸Ð²Ð°Ð»Ð¸ Ð² ÐºÐ¾Ñ€Ð¸Ð´Ð¾Ñ€Ðµ Ð¿ÐµÑ€ÐµÐ´ ÑƒÑ€Ð¾ÐºÐ¾Ð¼.", "ÐžÐ½Ð¸ Ñ‚Ð¸Ñ…Ð¾ Ñ€Ð°Ð·Ð³Ð¾Ð²Ð°Ñ€Ð¸Ð²Ð°Ð»Ð¸ Ð² ÐºÐ¾Ñ€Ð¸Ð´Ð¾Ñ€Ðµ Ð¿ÐµÑ€ÐµÐ´ ÑƒÑ€Ð¾ÐºÐ¾Ð¼ Ð¸ ÑÐ¾ÑÑ‚Ð°Ð²Ð¸Ð»Ð¸ Ð¿Ð»Ð°Ð½."]),
]


def load_env() -> dict[str, str]:
    path = Path(".env.local")
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip('"').strip("'")
    return values


def norm(value: str) -> str:
    return " ".join(value.casefold().split())


def build_rows() -> list[dict[str, Any]]:
    rows = []
    idx = 1
    for chain_index, (theme, en_steps, ru_steps) in enumerate(CHAINS, start=1):
        for step, (english, russian) in enumerate(zip(en_steps, ru_steps, strict=True), start=1):
            rows.append(
                {
                    "index": idx,
                    "chain_index": chain_index,
                    "step": step,
                    "theme": theme,
                    "english": english,
                    "russian": russian,
                    "method": "chain_step",
                    "chain_rule": "Each step adds one clear A1/A2 meaning unit to the previous step.",
                }
            )
            idx += 1
    if len(rows) != 200:
        raise RuntimeError(f"expected 200 chain steps, got {len(rows)}")
    for key in ("english", "russian"):
        values = [norm(row[key]) for row in rows]
        if len(set(values)) != len(values):
            raise RuntimeError(f"{key} duplicates found")
    return rows


def write_rows(rows: list[dict[str, Any]]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ROWS_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with ROWS_CSV.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def build_text_manifest(rows: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        import eng_to_ipa  # type: ignore
    except Exception as error:  # noqa: BLE001
        raise RuntimeError(f"eng_to_ipa is required for Chains IPA: {error}") from error
    items = []
    for row in rows:
        ipa = eng_to_ipa.convert(str(row["english"]).rstrip(".!?"))
        ipa = ipa.replace("*", "")
        if not ipa.strip():
            raise RuntimeError(f"empty IPA for row {row['index']}")
        items.append(
            {
                "index": int(row["index"]),
                "chain_index": int(row["chain_index"]),
                "step": int(row["step"]),
                "english_upper": str(row["english"]).upper(),
                "russian_upper": str(row["russian"]).upper(),
                "ipa": ipa,
            }
        )
    manifest = {"status": "ready", "items": items}
    TEXT_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def openai_tts(api_key: str, text: str, role: str, path: Path, voice_override: str | None = None) -> None:
    cfg = ROLE_CONFIG[role]
    payload = {
        "model": MODEL,
        "voice": voice_override or cfg["voice"],
        "input": text,
        "instructions": cfg["instructions"],
        "response_format": "wav",
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
            return
        except urllib.error.HTTPError as error:
            last = error.read().decode("utf-8", errors="replace")[:500]
        except Exception as error:  # noqa: BLE001
            last = str(error)
        time.sleep(attempt)
    raise RuntimeError(f"TTS failed {role}/{voice_override}: {last}")


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr[:300])
    return float(result.stdout.strip())


def audio_path(row: dict[str, Any], role: str) -> Path:
    text = row["russian"] if role == "ru" else row["english"]
    digest = hashlib.sha1(f"{ROLE_CONFIG[role]['voice']}|{text}".encode("utf-8")).hexdigest()[:12]
    return AUDIO_DIR / role / f"{int(row['index']):03d}_{digest}.wav"


def generate_auditions(api_key: str) -> dict[str, Any]:
    candidates = ["nova", "shimmer", "fable", "alloy", "verse", "sage", "coral", "ash", "ballad", "echo"]
    samples = [
        ("en", "I opened the window in my room this morning because it was hot."),
        ("ru", "Ð¯ Ð¾Ñ‚ÐºÑ€Ñ‹Ð» Ð¾ÐºÐ½Ð¾ Ð² ÑÐ²Ð¾ÐµÐ¹ ÐºÐ¾Ð¼Ð½Ð°Ñ‚Ðµ ÑÐµÐ³Ð¾Ð´Ð½Ñ ÑƒÑ‚Ñ€Ð¾Ð¼, Ð¿Ð¾Ñ‚Ð¾Ð¼Ñƒ Ñ‡Ñ‚Ð¾ Ð±Ñ‹Ð»Ð¾ Ð¶Ð°Ñ€ÐºÐ¾."),
    ]
    ok = []
    failed = []
    for voice in candidates:
        for lang, text in samples:
            path = AUDITION_DIR / voice / f"{lang}.wav"
            if path.exists() and path.stat().st_size > 10_000:
                ok.append({"voice": voice, "lang": lang, "path": str(path), "duration_sec": round(ffprobe_duration(path), 3)})
                continue
            try:
                openai_tts(api_key, text, "en1" if lang == "en" else "ru", path, voice_override=voice)
                ok.append({"voice": voice, "lang": lang, "path": str(path), "duration_sec": round(ffprobe_duration(path), 3)})
            except Exception as error:  # noqa: BLE001
                failed.append({"voice": voice, "lang": lang, "error": str(error)[:300]})
    report = {"selected": {"en1": EN1_VOICE, "ru": RU_VOICE, "en2": EN2_VOICE}, "ok": ok, "failed": failed}
    (AUDITION_DIR / "voice_audition_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def generate_audio(api_key: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    manifest = []
    for row in rows:
        for role in ("en1", "ru", "en2"):
            path = audio_path(row, role)
            text = row["russian"] if role == "ru" else row["english"]
            if not path.exists() or path.stat().st_size < 10_000:
                openai_tts(api_key, text, role, path)
            manifest.append(
                {
                    "index": row["index"],
                    "chain_index": row["chain_index"],
                    "step": row["step"],
                    "role": role,
                    "voice": ROLE_CONFIG[role]["voice"],
                    "text": text,
                    "path": str(path),
                    "duration_sec": round(ffprobe_duration(path), 3),
                }
            )
    (AUDIO_DIR / "openai_audio_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    rows = build_rows()
    write_rows(rows)
    text_manifest = build_text_manifest(rows)
    env = load_env()
    api_key = env.get("OPENAI_TTS_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_TTS_API_KEY is required in .env.local")
    audition = generate_auditions(api_key)
    audio = generate_audio(api_key, rows)
    report = {
        "status": "ready",
        "method": "true_chain_method",
        "chain_count": 50,
        "step_count": len(rows),
        "level": "A1-A2",
        "voices": {role: cfg["voice"] for role, cfg in ROLE_CONFIG.items()},
        "voice_audition": str((AUDITION_DIR / "voice_audition_report.json").resolve()),
        "audio_count": len(audio),
        "outputs": {"rows_json": str(ROWS_JSON), "rows_csv": str(ROWS_CSV), "text_manifest": str(TEXT_MANIFEST), "audio_manifest": str(AUDIO_DIR / "openai_audio_manifest.json")},
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
