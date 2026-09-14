#!/usr/bin/env python3
"""Apply the approved Spanish-chain copy edit and rebuild all TTS text inputs."""

from __future__ import annotations

import csv
import json
import re
import shutil
from datetime import datetime
from pathlib import Path


PACKAGE = Path(r"C:\Users\badlo\OneDrive\Документы\проекты\CHAIN_ES_50_ACTIVE_LISTENING_A1_FULL_PACK")
VOWELS = set("aeiou")


def normalized_ipa(value: str) -> str:
    """Repair the old English/Latin-American TTS transcription mechanically.

    The source already contains one IPA token per Spanish word, but used English
    lax vowels and placed the stress mark directly before the stressed vowel.
    Spanish has a five-vowel system; this also moves stress to the beginning of
    the stressed syllable onset.
    """
    body = value.strip().strip("/").replace("ɔ", "o").replace("ɛ", "e")
    body = body.replace("ɪ", "i").replace("ʊ", "u").replace("jj", "j").replace("ˌ", "")
    fixed: list[str] = []
    for token in body.split():
        while "ˈ" in token:
            marker = token.index("ˈ")
            bare = token[:marker] + token[marker + 1 :]
            stressed_vowel = marker
            previous_vowel = -1
            for idx, char in enumerate(bare[:stressed_vowel]):
                if char in VOWELS:
                    previous_vowel = idx
            insert_at = previous_vowel + 1
            token = bare[:insert_at] + "ˈ" + bare[insert_at:]
            break
        fixed.append(token)
    return "/" + " ".join(fixed) + "/"


def numbered_text(folder: Path, number: int, text: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{number:03d}.txt").write_text(text.strip() + "\n", encoding="utf-8")


def main() -> int:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = PACKAGE / f"_BACKUP_BEFORE_V3_{stamp}"
    backup.mkdir(parents=True)
    for name in [
        "VIDEO_DATA.json",
        "PROJECT_CONFIG.json",
        "VOICE_SETTINGS_RU_ES.txt",
        "ELEVENLABS_BATCH_MANIFEST.csv",
        "50_CHAINS_FULL_CONTENT_RU_ES.md",
        "50_SPANISH_CHAIN_EXPLANATIONS_RU.md",
        "draft_content.json",
    ]:
        source = PACKAGE / name
        if source.exists():
            shutil.copy2(source, backup / name)

    video_path = PACKAGE / "VIDEO_DATA.json"
    data = json.loads(video_path.read_text(encoding="utf-8"))
    data["schema_version"] = "1.2"
    data["spanish_variant"] = "standard European Spanish, broadly intelligible"
    data["level"] = "A1-A2 practical listening"

    replacements = {
        (7, 2): (None, "Что это значит?"),
        (8, 2): (None, "Как это пишется?"),
        (19, 2): (None, "Я хочу кофе."),
        (21, 2): (None, "Я хочу суп."),
        (25, 2): (None, "Сколько это стоит?"),
        (47, 5): (None, "Сейчас я очень хочу пить, поэтому хочу воды."),
    }
    allergy = [
        ("No como frutos secos.", "Я не ем орехи."),
        ("No puedo comer frutos secos.", "Я не могу есть орехи."),
        ("Soy alérgico a los frutos secos.", "У меня аллергия на орехи."),
        ("No puedo comer ningún fruto seco.", "Я не могу есть никакие орехи."),
        ("Por favor, no ponga frutos secos en mi comida.", "Пожалуйста, не кладите орехи в мою еду."),
    ]

    for chain in data["chains"]:
        if chain["chain"] == 49:
            chain["title_ru"] = "Нужно такси"
        if chain["chain"] == 22:
            for step, pair in zip(chain["steps"], allergy):
                step["spanish"], step["russian"] = pair
        for step in chain["steps"]:
            es, ru = replacements.get((chain["chain"], step["step"]), (None, None))
            if es:
                step["spanish"] = es
            if ru:
                step["russian"] = ru
            step["ipa"] = normalized_ipa(step["ipa"])

    video_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    config_path = PACKAGE / "PROJECT_CONFIG.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["schema_version"] = "1.2"
    config["pause_model"] = {
        "after_es_voice_1": "max(3.00, 1.10 × audio_duration + 0.90)",
        "after_russian": "max(2.20, 0.65 × audio_duration + 0.70)",
        "after_es_voice_2": "max(2.20, 1.00 × audio_duration + 0.45)",
        "after_es_voice_3_before_next_step": "max(2.60, 1.15 × audio_duration + 0.75)",
        "before_explanation_seconds": 1.7,
        "after_explanation_seconds": 1.2,
        "after_final_audio_replay": "max(2.80, 0.90 × replay_duration + 0.90)",
    }
    config["transcriptions"] = {
        "count": 250,
        "track_name": "ES_IPA_TRANSCRIPTION_250",
        "accent": "standard European Spanish",
        "notation": "broad phonemic IPA",
        "timing_rule": "copy exact start and duration from corresponding ES_TEXT segment",
        "hidden_during_final_audio_replay": True,
    }
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    inputs = PACKAGE / "ELEVENLABS_INPUT"
    mapping = {
        1: inputs / "01_RU_PHRASES_250",
        2: inputs / "02_ES_VOICE_1_250",
        3: inputs / "03_ES_VOICE_2_250",
        4: inputs / "04_ES_VOICE_3_250",
        5: inputs / "05_RU_EXPLANATIONS_50",
    }
    all_ru, all_es, all_ipa, explanations = [], [], [], []
    manifest: list[dict[str, str | int]] = []
    for chain in data["chains"]:
        for step in chain["steps"]:
            index = int(step["audio_index"])
            all_ru.append(step["russian"])
            all_es.append(step["spanish"])
            all_ipa.append(step["ipa"])
            numbered_text(mapping[1], index, step["russian"])
            for folder in (2, 3, 4):
                numbered_text(mapping[folder], index, step["spanish"])
            for folder, text, role in [
                (1, step["russian"], "RU phrase"),
                (2, step["spanish"], "ES voice 1"),
                (3, step["spanish"], "ES voice 2"),
                (4, step["spanish"], "ES voice 3"),
            ]:
                manifest.append({"folder": folder, "index": index, "text": text, "output_file": f"{folder}/{index:03d}.wav", "role": role})
        explanation = chain["explanation_ru"]
        explanations.append(explanation)
        numbered_text(mapping[5], chain["chain"], explanation)
        manifest.append({"folder": 5, "index": chain["chain"], "text": explanation, "output_file": f"5/{chain['chain']:03d}.wav", "role": "RU explanation"})

    lists = PACKAGE / "TEXT_LISTS_FOR_ELEVENLABS"
    lists.mkdir(exist_ok=True)
    for filename, values in [
        ("01_RU_ALL_250_PARAGRAPHS.txt", all_ru),
        ("02_ES_VOICE_1_ALL_250_PARAGRAPHS.txt", all_es),
        ("03_ES_VOICE_2_ALL_250_PARAGRAPHS.txt", all_es),
        ("04_ES_VOICE_3_ALL_250_PARAGRAPHS.txt", all_es),
        ("05_RU_EXPLANATIONS_ALL_50_PARAGRAPHS.txt", explanations),
        ("06_ES_IPA_ALL_250.txt", all_ipa),
    ]:
        (lists / filename).write_text("\n\n".join(values) + "\n", encoding="utf-8")

    with (PACKAGE / "ELEVENLABS_BATCH_MANIFEST.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["folder", "index", "text", "output_file", "role"])
        writer.writeheader()
        writer.writerows(manifest)

    voice_settings = """SPANISH CHAINS A1-A2 — ELEVENLABS V3\n\nПАПКА 1 — АЛИНА РУС (QZYZCENjeawpG1QkjIsW)\nСпокойные русские переводы, speed 0.85.\n\nПАПКА 2 — ALEJANDRO ES (t4H5JNhv5BvHoyD32wEl)\nОсновной испанский преподаватель, speed 0.85.\n\nПАПКА 3 — MARTIN OSBORNE 2 (Vpv1YgvVd6CHIzOTiTt8)\nГлубокий мужской кастильский диктор. Временно выбран вместо нового DIEGO: аккаунт заполнен 30/30 пользовательских голосов. Три новых DIEGO-превью лежат в VOICE_PREVIEWS; после освобождения одного слота голос можно сохранить. speed 0.85.\n\nПАПКА 4 — LUCIA ES (2ymLWvNtabqcyXuGmsvk)\nДружелюбный женский голос Испании, speed 0.85.\n\nПАПКИ 5 И 7 — МИХАИЛ РУС (kqz6EQ0gdQdeyLo2GcU7)\nРусский образовательный диктор, speed 0.85.\n\nМОДЕЛЬ: eleven_v3. Один TXT = один WAV. Номера файлов не озвучивать.\n"""
    (PACKAGE / "VOICE_SETTINGS_RU_ES.txt").write_text(voice_settings, encoding="utf-8")
    print(f"CONTENT_READY chains=50 phrases=250 manifest={len(manifest)} backup={backup.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
