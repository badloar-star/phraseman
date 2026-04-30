# -*- coding: utf-8 -*-
"""Merge tools/rt_01_10.json … rt_31_40.json into official_royal_tea_en.json"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent
OUT = APP / "app" / "flashcards" / "bundles" / "official_royal_tea_en.json"

PACK = {
    "id": "official_royal_tea_en",
    "titleRu": "Royal Tea",
    "titleUk": "Royal Tea",
    "descriptionRu": (
        "Тема: «Бриджертоны: флирт и сплетни высшего света». "
        "Веера, балы, тонкие колкости Regency; полная тема в открытой карточке, на плитке витрины — Royal Tea."
    ),
    "descriptionUk": (
        "Тема: «Бріджертони: флірт і плітки вищого світу». "
        "Віяла, бали, витончена Regency-іронія; на плитці — Royal Tea, зміст — в картці."
    ),
    "category": "slang",
    "cardCount": 40,
    "priceShards": 140,
    "authorName": "Phraseman",
    "isOfficial": True,
}

FILES = [
    "rt_01_10.json",
    "rt_11_20.json",
    "rt_21_30.json",
    "rt_31_40.json",
]


def main() -> None:
    cards_raw: list[dict] = []
    for name in FILES:
        p = ROOT / name
        if not p.exists():
            raise SystemExit(f"Missing: {p}")
        chunk = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(chunk, list):
            raise SystemExit(f"{name}: expected JSON array")
        cards_raw.extend(chunk)
    if len(cards_raw) != 40:
        raise SystemExit(f"expected 40 cards, got {len(cards_raw)}")
    cards = []
    for i, c in enumerate(cards_raw, 1):
        cid = f"official_royal_tea_en_{i:02d}"
        cards.append({"id": cid, **c})
    p = {**PACK, "cardCount": 40}
    OUT.write_text(json.dumps({"pack": p, "cards": cards}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", OUT, "cards", len(cards))


if __name__ == "__main__":
    main()
