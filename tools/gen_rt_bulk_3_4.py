# -*- coding: utf-8 -*-
"""Writes tools/rt_bulk_3.json (21–30) and tools/rt_bulk_4.json (31–40)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
KEYS = (
    "en", "transcription", "ru", "uk", "literalRu", "literalUk", "explanationRu", "explanationUk"
)


def dump(path: Path, cards: list[dict]) -> None:
    for c in cards:
        for k in KEYS:
            v = c.get(k)
            assert v is not None and str(v).strip(), f"{path} missing {k}"
    path.write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", path, len(cards))


B3 = [
    {
        "en": "To be compromised",
        "transcription": "/tuː bi ˈkɑːmprəmaɪzd/",
        "ru": "Скомпрометирован(а) в глазах The Ton'а, публичная витрина almanac'а трещит",
        "uk": "Скомпрометовано в очах The Ton, публічна вітрина almanac'а трісає",
        "literalRu": "Поставлен(а) в слабое, публично дискредитированное положение",
        "literalUk": "Поставлено в слабку, публічно дискредитовану позицію",
        "explanationRu": (
            "Whistledown'у важна не сон, а публичная сцена бала: chaperon бессилен, "
            "ледь almanac The Ton'а пишет витринную смерть; письмо пусто, "
            "ледь публичный портрет almanac'а треснул. Смирение, не бальная шутка."
        ),
        "explanationUk": (
            "Whistledown'у важлива не сон, а публічна сцена баву: chaperon безсилий, "
            "ледь almanac The Ton'а пише публічну смерть; лист пусте, "
            "ледь публічний портрет almanac'а тріснув. Смирення, не бальна жарт."
        ),
    },
    {
        "en": "A breach of promise",
        "transcription": "/ə briːtʃ əv ˈprɑːmɪs/",
        "ru": "Срыв помолвки, vellum'ная public строкa almanac'а, публичный удар The Ton'а",
        "uk": "Зрив заручин, vellum'на public строкa almanac'а, публічний удар The Ton'а",
        "literalRu": "Нарушение обещания, разрыв публичного соглашения",
        "literalUk": "Порушення обіцянки, розрив публічної згоди",
        "explanationRu": (
            "В almanac'е бала помолвка — vellum'ная public строкa, a не tайнoe"  # BROKEN
        ),
    },
]

# File intentionally incomplete for edit — will complete in next patch
