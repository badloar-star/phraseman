# -*- coding: utf-8 -*-
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = (
    Path(__file__).resolve().parent.parent
    / "app"
    / "flashcards"
    / "bundles"
    / "official_royal_tea_en.json"
)

PACK = {
    "id": "official_royal_tea_en",
    "titleRu": "Royal Tea",
    "titleUk": "Royal Tea",
    "descriptionRu": (
        "Тема: «Бриджертоны: флирт и сплетни высшего света». The Ton, chaperon, публичные визитки, Lady Whistledown, "
        "сатира витринной репутации, ball, линия этикета."
    ),
    "descriptionUk": (
        "Тема: «Бріджертони: флірт і плітки вищого світу». The Ton, chaperon, Whistledown, публічна вітрина, "
        "ball, лінія етикету, не тільки приватна сцена."
    ),
    "category": "slang",
    "cardCount": 40,
    "priceShards": 140,
    "authorName": "Phraseman",
    "isOfficial": True,
}

KEYS = (
    "en",
    "transcription",
    "ru",
    "uk",
    "literalRu",
    "literalUk",
    "explanationRu",
    "explanationUk",
)


def main() -> None:
    all_rows: list[dict] = []
    for n in (1, 2, 3, 4):
        p = ROOT / f"rt_bulk_{n}.json"
        chunk = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(chunk, list) or len(chunk) != 10:
            raise SystemExit(f"{p}: need array of 10, got {chunk!r}")
        for c in chunk:
            for k in KEYS:
                v = c.get(k)
                if v is None or (isinstance(v, str) and not v.strip()):
                    raise SystemExit(f"{p} missing/empty: {k}")
        all_rows.extend(chunk)
    if len(all_rows) != 40:
        raise SystemExit("need 40 cards")
    cards = []
    for i, c in enumerate(all_rows, 1):
        body = {k: c[k] for k in KEYS}
        cards.append({"id": f"official_royal_tea_en_{i:02d}", **body})
    p = {**PACK, "cardCount": 40}
    OUT.write_text(json.dumps({"pack": p, "cards": cards}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", OUT, len(cards))


if __name__ == "__main__":
    main()
