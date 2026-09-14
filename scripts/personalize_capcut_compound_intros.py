#!/usr/bin/env python3
"""Give every reused CapCut compound an intro that matches its manifest block.

The compounds keep the repaired arrow timing and visual styling.  Each outer
placement receives its own clone of the first compound, with only its repeated
intro title text changed to a block-specific, manifest-grounded title.
"""

from __future__ import annotations

import argparse
import copy
import csv
import datetime as dt
import json
import shutil
import sys
import uuid
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


INTRO_SPECS = [
    ("ЖИВЫЕ РЕАКЦИИ\nНА КАЖДЫЙ ДЕНЬ", ("no way", "seriously")),
    ("ЭМОЦИИ\nБЕЗ ПАУЗ", ("I'm embarrassed", "getting nervous")),
    ("ПЕРЕПИСКА\nИ ЛИЧНЫЕ СООБЩЕНИЯ", ("text me", "voice note")),
    ("ЗНАКОМСТВО\nИ ФЛИРТ", ("first date", "kiss me")),
    ("РАССТАВАНИЕ\nИ БЫВШИЕ", ("toxic ex", "no contact")),
    ("ДЕНЬГИ\nПОКУПКИ И ЦЕНЫ", ("refund please", "card declined")),
    ("РАБОТА\nОФИС И ВЫГОРАНИЕ", ("job interview", "burnout")),
    ("В ПУТИ\nАЭРОПОРТ И ОТЕЛЬ", ("boarding pass", "hotel room")),
    ("ЗА РУЛЁМ\nИ НА ДОРОГЕ", ("traffic jam", "flat tire")),
    ("ЕДА\nКАФЕ И РЕСТОРАН", ("too spicy", "table please")),
    ("ВЕЧЕРИНКА\nИ НОЧЬ ПОСЛЕ", ("house party", "next morning")),
    ("СЕКРЕТЫ\nИ НЕУДОБНАЯ ПРАВДА", ("dirty secret", "caught lying")),
    ("КОНФЛИКТ\nКОГДА ВСЁ БЕСИТ", ("shut up", "stop shouting")),
    ("ВНЕШНОСТЬ\nСТИЛЬ И КОМПЛИМЕНТЫ", ("nice hair", "nice shoes")),
    ("ТЕЛЕФОН\nИНТЕРНЕТ И ПРИЛОЖЕНИЯ", ("wifi password", "account locked")),
    ("ШОПИНГ\nРАЗМЕРЫ И ВОЗВРАТ", ("fitting room", "return policy")),
    ("САМОЧУВСТВИЕ\nИ ЗДОРОВЬЕ", ("headache", "feel sick")),
    ("ПОЛИЦИЯ\nИ НЕПРИЯТНОСТИ", ("police officer", "crime scene")),
    ("КОМАНДЫ\nНА КАЖДЫЙ ДЕНЬ", ("wake up", "sit down")),
    ("ФРАЗОВЫЕ ГЛАГОЛЫ\nБЕЗ ЗУБРЁЖКИ", ("give up", "look after")),
    ("ВОПРОСЫ\nДЛЯ ЖИВОГО ДИАЛОГА", ("what happened", "need help")),
    ("КАК ОТВЕЧАТЬ\nПО-АНГЛИЙСКИ", ("of course", "good point")),
    ("ЧУВСТВА\nИ ОТНОШЕНИЯ", ("need you", "hold me")),
    ("БРИТАНСКИЙ АНГЛИЙСКИЙ\nКАК ГОВОРЯТ В UK", ("cheers mate", "bollocks")),
    ("АМЕРИКАНСКИЙ АНГЛИЙСКИЙ\nКАК ГОВОРЯТ В США", ("gas station", "cell phone")),
    ("В ПОЕЗДКЕ\nКОГДА ТЫ ПОТЕРЯЛСЯ", ("I'm lost", "lost passport")),
    ("КОГДА ВСЁ ПОШЛО\nНЕ ПО ПЛАНУ", ("false alarm", "wrong place")),
    ("ПЛАНЫ\nВРЕМЯ И ВСТРЕЧИ", ("this weekend", "plan changed")),
    ("СТРАННЫЕ СИТУАЦИИ\nИ ПОВОРОТЫ", ("plot twist", "hidden camera")),
    ("КОРОТКИЕ ФРАЗЫ\nДЛЯ РАЗГОВОРА", ("come on", "your turn")),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--compound-track", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def id_map(items: list[dict]) -> dict[str, dict]:
    return {item["id"]: item for item in items if item.get("id")}


def title_text_materials(compound: dict) -> list[dict]:
    matches: list[dict] = []
    for material in compound["materials"].get("texts", []):
        try:
            payload = json.loads(material.get("content", ""))
        except json.JSONDecodeError:
            continue
        text = payload.get("text", "")
        if text == "РЕАКЦИИ\nТЫ ИХ ЗНАЕШЬ":
            matches.append(material)
    if len(matches) != 5:
        raise RuntimeError(f"Expected five repeated intro text layers, found {len(matches)}.")
    return matches


def replace_text(material: dict, replacement: str) -> None:
    payload = json.loads(material["content"])
    old_text = payload["text"]
    payload["text"] = replacement
    # CapCut styles use absolute character spans.  Preserve typography while
    # expanding their range to the new title so no old trailing text survives.
    for style in payload.get("styles", []):
        if style.get("range") == [0, len(old_text)]:
            style["range"] = [0, len(replacement)]
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def manifest_blocks(path: Path) -> list[list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) != 600 or any(not row.get("english") for row in rows):
        raise RuntimeError("Manifest must contain its 600 English phrase rows.")
    blocks = [[row["english"].strip().casefold() for row in rows[index:index + 20]]
              for index in range(0, len(rows), 20)]
    if len(blocks) != len(INTRO_SPECS):
        raise RuntimeError("Manifest block count does not match the intro specification.")
    for index, (phrases, (_, evidence)) in enumerate(zip(blocks, INTRO_SPECS), start=1):
        missing = [phrase for phrase in evidence if phrase.casefold() not in phrases]
        if missing:
            raise RuntimeError(f"Block {index} title evidence is absent from manifest: {missing}")
    return blocks


def find_base(data: dict, track_index: int) -> tuple[dict, dict, dict, dict]:
    outer_track = data["tracks"][track_index]
    if len(outer_track.get("segments", [])) != len(INTRO_SPECS):
        raise RuntimeError("Expected 30 outer compound placements.")
    base_segment = outer_track["segments"][0]
    video = id_map(data["materials"].get("videos", [])).get(base_segment.get("material_id"))
    drafts = id_map(data["materials"].get("drafts", []))
    draft_id = next((ref for ref in base_segment.get("extra_material_refs", []) if ref in drafts), None)
    if video is None or draft_id is None:
        raise RuntimeError("First placement does not contain an outer video and compound draft reference.")
    entry = drafts[draft_id]
    if entry.get("type") != "combination" or not isinstance(entry.get("draft"), dict):
        raise RuntimeError("First placement does not reference an editable compound.")
    return outer_track, base_segment, video, entry


def clone_for_block(base_video: dict, base_entry: dict, title: str, block_number: int) -> tuple[dict, dict]:
    video = copy.deepcopy(base_video)
    video["id"] = str(uuid.uuid4()).upper()
    video["material_name"] = f"Compound clip1 — block {block_number:02d}"
    entry = copy.deepcopy(base_entry)
    entry["id"] = str(uuid.uuid4()).upper()
    entry["combination_id"] = str(uuid.uuid4()).upper()
    entry["draft"]["id"] = str(uuid.uuid4()).upper()
    entry["draft"]["name"] = f"Compound clip1 — block {block_number:02d}"
    for material in title_text_materials(entry["draft"]):
        replace_text(material, title)
    return video, entry


def validate(data: dict, track: dict, titles: list[str]) -> None:
    drafts = id_map(data["materials"]["drafts"])
    seen_titles: list[str] = []
    for block_index, segment in enumerate(track["segments"]):
        entry = next((drafts[ref] for ref in segment.get("extra_material_refs", []) if ref in drafts), None)
        if entry is None:
            raise RuntimeError("An outer placement lost its compound draft reference.")
        expected_title = titles[block_index]
        values = [json.loads(material["content"])["text"]
                  for material in entry["draft"]["materials"].get("texts", [])
                  if json.loads(material.get("content", "{}")).get("text") == expected_title]
        if len(values) != 5:
            raise RuntimeError("The five title layers inside a compound do not match its block title.")
        seen_titles.append(values[0])
    if seen_titles != titles or len(set(seen_titles)) != len(titles):
        raise RuntimeError("Compound intro titles are not unique or not in block order.")


def main() -> int:
    args = parse_args()
    draft_path = args.draft.resolve()
    titles = [item[0] for item in INTRO_SPECS]
    manifest_blocks(args.manifest.resolve())
    data = json.loads(draft_path.read_text(encoding="utf-8"))
    track, base_segment, base_video, base_entry = find_base(data, args.compound_track)

    # The first compound is the timing/style template. Clone it while its five
    # original title layers are still identifiable, then replace its own title.
    videos_to_add: list[dict] = []
    entries_to_add: list[dict] = []
    base_draft_id = base_entry["id"]
    for index, segment in enumerate(track["segments"][1:], start=1):
        video, entry = clone_for_block(base_video, base_entry, titles[index], index + 1)
        videos_to_add.append(video)
        entries_to_add.append(entry)
        segment["material_id"] = video["id"]
        segment["extra_material_refs"] = [entry["id"] if ref == base_draft_id else ref
                                           for ref in base_segment["extra_material_refs"]]
    for material in title_text_materials(base_entry["draft"]):
        replace_text(material, titles[0])

    print(f"blocks={len(titles)} unique_titles={len(set(titles))} cloned_compounds={len(entries_to_add)}")
    for index, title in enumerate(titles, start=1):
        print(f"{index:02d}: {title.replace(chr(10), ' / ')}")
    if args.dry_run:
        return 0

    data["materials"]["videos"].extend(videos_to_add)
    data["materials"]["drafts"].extend(entries_to_add)
    validate(data, track, titles)
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = draft_path.with_name(f"draft_content.before_unique_intros_{stamp}.json")
    shutil.copy2(draft_path, backup)
    pending = draft_path.with_suffix(".json.unique-intros-pending")
    pending.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    pending.replace(draft_path)
    print(f"written={draft_path}")
    print(f"backup={backup}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
