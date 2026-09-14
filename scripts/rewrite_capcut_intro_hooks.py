#!/usr/bin/env python3
"""Replace generic compound intros with distinct, manifest-grounded video hooks."""

from __future__ import annotations

import argparse
import copy
import csv
import datetime as dt
import json
import shutil
import sys
from collections import Counter
from pathlib import Path


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


# One hook per 20-phrase video.  The paired phrases are exact manifest evidence
# that the hook describes that video's real subject rather than a generic label.
HOOK_SPECS = [
    ("«ДА ЛАДНО» И «НУ И ЧТО?»\nРЕАКЦИИ, КОТОРЫЕ ЗВУЧАТ ЖИВО", ("no way", "as if")),
    ("КОГДА СТЫДНО, СТРАШНО, НЕЛОВКО\nНЕ МОЛЧИ ПО-АНГЛИЙСКИ", ("so awkward", "really scared")),
    ("ПИШИ В ЧАТЕ НЕ КАК В УЧЕБНИКЕ\nАНГЛИЙСКИЙ ДЛЯ ПЕРЕПИСКИ", ("text me", "voice note")),
    ("ФЛИРТУЙ, А НЕ ПЕРЕВОДИ С РУССКОГО\nФРАЗЫ ДЛЯ СВИДАНИЯ", ("first date", "kiss me")),
    ("КАК РАССТАТЬСЯ\nНЕ ЗВУЧА КАК ПЕРЕВОДЧИК", ("it's over", "no contact")),
    ("ТЫ НЕ БЕДНЫЙ — ТЫ BROKE\nДЕНЬГИ БЕЗ УЧЕБНИКА", ("I'm broke", "refund please")),
    ("БОСС, ДЕДЛАЙН, ВЫГОРАНИЕ\nВЫЖИВИ В ОФИСЕ", ("job interview", "burnout")),
    ("РЕЙС ЗАДЕРЖАЛИ. БАГАЖ ПРОПАЛ.\nТЕПЕРЬ ТЫ ГОТОВ", ("flight delayed", "lost bag")),
    ("ПРОБКА, БЕНЗИН НА НУЛЕ, КОЛЕСО\nНЕ ТЕРЯЙСЯ ЗА РУЛЁМ", ("traffic jam", "flat tire")),
    ("БЕЗ ЛЬДА. БОЛЬШЕ СОУСА. СЧЁТ.\nЗАКАЖИ ЕДУ БЕЗ ПАНИКИ", ("more sauce", "no ice")),
    ("НЕ ПОМНИШЬ ВЧЕРА?\nЭТИ ФРАЗЫ ТЕБЕ ЗНАКОМЫ", ("house party", "next morning")),
    ("«НИКОМУ НЕ ГОВОРИ»\nАНГЛИЙСКИЙ ДЛЯ СЕКРЕТОВ", ("keep secret", "caught lying")),
    ("КОГДА ВСЁ БЕСИТ\nСПОРЬ ПО-АНГЛИЙСКИ", ("stop shouting", "forget it")),
    ("НЕ «YOU ARE BEAUTIFUL»\nКОМПЛИМЕНТЫ, КОТОРЫЕ РАБОТАЮТ", ("nice hair", "nice shoes")),
    ("ТЕЛЕФОН СЕЛ, WI‑FI НЕ РАБОТАЕТ\nВОТ ЧТО СКАЗАТЬ", ("low battery", "wifi password")),
    ("РАЗМЕР НЕ ПОДОШЁЛ?\nВЕРНИ ВЕЩЬ БЕЗ ОБЪЯСНЕНИЙ", ("fitting room", "return policy")),
    ("ГОЛОВА БОЛИТ, СОН НЕ ИДЁТ\nСКАЖИ ТОЧНО, ЧТО С ТОБОЙ", ("headache", "can't sleep")),
    ("ТЕБЕ НУЖЕН АДВОКАТ?\nЛУЧШЕ ЗНАТЬ ЗАРАНЕЕ", ("under arrest", "lawyer please")),
    ("ВСТАНЬ, ПОВЕРНИСЬ, ПОДОЖДИ\nЖИВЫЕ КОМАНДЫ НА КАЖДЫЙ ДЕНЬ", ("wake up", "wait here")),
    ("НЕ УЧИ ТАБЛИЦУ\nСЛУШАЙ, КАК ЖИВУТ PHRASAL VERBS", ("give up", "look after")),
    ("ВОПРОСЫ, ПОСЛЕ КОТОРЫХ\nРАЗГОВОР НЕ УМИРАЕТ", ("what happened", "any idea")),
    ("ДА, НЕТ, МОЖЕТ БЫТЬ\nОТВЕЧАЙ КАК ЧЕЛОВЕК", ("of course", "good point")),
    ("«НЕ УХОДИ» И «Я РЕВНУЮ»\nФРАЗЫ БЕЗ ДРАМЫ", ("don't leave", "hold me")),
    ("БРИТАНЕ СКАЖУТ ИНАЧЕ\nПОЙМИ ИХ С ПЕРВОГО РАЗА", ("cheers mate", "bollocks")),
    ("В США НЕ ЕДУТ НА PETROL STATION\nГОВОРИ КАК АМЕРИКАНЕЦ", ("gas station", "cell phone")),
    ("ПОТЕРЯЛ ПАСПОРТ?\nНЕ ПАНИКУЙ, СПРОСИ ТАК", ("lost passport", "need taxi")),
    ("КОГДА ВСЁ ПОШЛО НЕ ТАК\nНЕ ЗАВИСАЙ В ТИШИНЕ", ("false alarm", "wrong place")),
    ("«СЕГОДНЯ ИЛИ ЗАВТРА?»\nДОГОВОРИСЬ ЗА 10 СЕКУНД", ("tonight", "plan changed")),
    ("СТРАННЫЙ ЗВОНОК, КАМЕРА, КРАСНЫЙ ФЛАГ\nКАК СКАЗАТЬ ЭТО", ("hidden camera", "red flag")),
    ("КОГДА НУЖНО БЫТЬ БЫСТРЫМ\n20 ФРАЗ, ЧТОБЫ НЕ ТУПИТЬ", ("come on", "your turn")),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--compound-track", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def check_manifest(path: Path) -> None:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) != 600:
        raise RuntimeError("Expected 600 manifest rows.")
    for index, (_, evidence) in enumerate(HOOK_SPECS):
        block = {row["english"].strip().casefold() for row in rows[index * 20:(index + 1) * 20]}
        if any(phrase.casefold() not in block for phrase in evidence):
            raise RuntimeError(f"Hook {index + 1} does not match its manifest block.")


def compound_for(data: dict, segment: dict) -> dict:
    drafts = {item["id"]: item for item in data["materials"].get("drafts", []) if item.get("id")}
    entry = next((drafts[ref] for ref in segment.get("extra_material_refs", []) if ref in drafts), None)
    if not entry or entry.get("type") != "combination":
        raise RuntimeError("Outer placement is missing its compound reference.")
    return entry["draft"]


def intro_materials(compound: dict) -> list[dict]:
    parsed: list[tuple[str, dict]] = []
    for material in compound["materials"].get("texts", []):
        try:
            text = json.loads(material.get("content", "{}")).get("text", "")
        except json.JSONDecodeError:
            continue
        if isinstance(text, str) and "\n" in text and text.strip():
            parsed.append((text, material))
    counts = Counter(text for text, _ in parsed)
    repeated = [text for text, count in counts.items() if count == 5]
    if len(repeated) != 1:
        raise RuntimeError(f"Expected one five-layer intro, got {repeated!r}.")
    return [material for text, material in parsed if text == repeated[0]]


def type_sizes(title: str) -> tuple[float, float]:
    first, second = title.split("\n", 1)
    return (round(max(3.25, min(8.0, 112.0 / len(first))), 2),
            round(max(3.0, min(6.0, 78.0 / len(second))), 2))


def rewrite(material: dict, hook: str) -> None:
    payload = json.loads(material["content"])
    old_styles = payload.get("styles") or []
    if not old_styles:
        raise RuntimeError("Intro style is missing.")
    first, second = hook.split("\n", 1)
    first_style, second_style = copy.deepcopy(old_styles[0]), copy.deepcopy(old_styles[-1])
    size_one, size_two = type_sizes(hook)
    first_style.update({"range": [0, len(first)], "size": size_one})
    second_style.update({"range": [len(first) + 1, len(hook)], "size": size_two})
    payload["text"] = hook
    payload["styles"] = [first_style, second_style]
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def arrow_is_intact(compound: dict) -> bool:
    texts = {item["id"]: item for item in compound["materials"].get("texts", []) if item.get("id")}
    expected = [4_500_000 * index for index in range(1, 20)]
    found = []
    for track in compound["tracks"]:
        for segment in track.get("segments", []):
            if "→" not in texts.get(segment.get("material_id"), {}).get("content", ""):
                continue
            for group in segment.get("common_keyframes", []):
                if group.get("property_type") == "KFTypePositionY":
                    found.append([frame["time_offset"] for frame in group["keyframe_list"][2::2]])
    return found == [expected, expected]


def validate(data: dict, track: dict, hooks: list[str]) -> None:
    observed = []
    for segment, hook in zip(track["segments"], hooks):
        compound = compound_for(data, segment)
        materials = intro_materials(compound)
        if len(materials) != 5:
            raise RuntimeError("A hook does not have five styled layers.")
        first, _ = hook.split("\n", 1)
        expected_ranges = [[0, len(first)], [len(first) + 1, len(hook)]]
        expected_sizes = list(type_sizes(hook))
        for material in materials:
            payload = json.loads(material["content"])
            if payload["text"] != hook:
                raise RuntimeError("Hook order changed while writing.")
            if [style.get("range") for style in payload["styles"]] != expected_ranges:
                raise RuntimeError("A hook has an uncovered default-size range.")
            if [style.get("size") for style in payload["styles"]] != expected_sizes:
                raise RuntimeError("A hook type scale is wrong.")
        if not arrow_is_intact(compound):
            raise RuntimeError("A hook rewrite disturbed arrow timing.")
        observed.append(hook)
    if len(observed) != 30 or len(set(observed)) != 30:
        raise RuntimeError("Hooks are not unique across the 30 videos.")


def main() -> int:
    args = parse_args()
    hooks = [hook for hook, _ in HOOK_SPECS]
    if len(set(hooks)) != len(hooks):
        raise RuntimeError("The hook list contains duplicates.")
    check_manifest(args.manifest.resolve())
    draft_path = args.draft.resolve()
    data = json.loads(draft_path.read_text(encoding="utf-8"))
    track = data["tracks"][args.compound_track]
    if len(track.get("segments", [])) != len(hooks):
        raise RuntimeError("Expected 30 compound placements.")
    for index, (segment, hook) in enumerate(zip(track["segments"], hooks), start=1):
        for material in intro_materials(compound_for(data, segment)):
            rewrite(material, hook)
        print(f"{index:02d}: {hook.replace(chr(10), ' / ')}  sizes={type_sizes(hook)[0]}/{type_sizes(hook)[1]}")
    validate(data, track, hooks)
    if args.dry_run:
        return 0
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = draft_path.with_name(f"draft_content.before_hook_rewrite_{stamp}.json")
    shutil.copy2(draft_path, backup)
    pending = draft_path.with_suffix(".json.hook-rewrite-pending")
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
