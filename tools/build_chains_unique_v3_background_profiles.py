#!/usr/bin/env python3
"""Create direct visual anchors and search queries for Chains unique v3 rows."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any


PACK = Path("exports/chains/phrase_packs/chains_800_unique_v3_20260604")
ROWS_PATH = PACK / "chains_800_unique_phrases.json"
OUT = PACK / "semantic_backgrounds"
MANIFEST = OUT / "chains_unique_v3_background_profiles.json"
CSV_PATH = OUT / "chains_unique_v3_background_profiles.csv"


BLOCK_DEFAULTS: dict[str, tuple[str, list[str]]] = {
    "Дом и быт": ("home interior, household object, everyday home action", ["home interior everyday life", "household chores close up", "living room kitchen home"]),
    "Утро и вечер": ("morning or evening routine at home", ["morning routine home", "evening routine bedroom", "alarm clock morning"]),
    "Работа": ("office desk, laptop, meeting, work document", ["office laptop work desk", "business meeting office", "checking document report desk"]),
    "Учёба": ("student notebook, book, classroom, studying action", ["student writing notebook", "studying book desk", "classroom lesson notebook"]),
    "Дорога и транспорт": ("transport, route, passenger, city travel", ["bus stop passenger", "train station platform", "taxi city street"]),
    "Покупки": ("store, shopping basket, cashier, receipt", ["shopping store cashier", "grocery shopping basket", "paying at store counter"]),
    "Еда и кафе": ("cafe table, food, drink, restaurant bill", ["cafe table coffee", "restaurant food table", "paying cafe bill"]),
    "Общение": ("people talking, phone call, message chat", ["people talking phone call", "chat message smartphone", "conversation friends cafe"]),
    "Просьбы и помощь": ("helping hands, person assisting, service counter", ["helping hands close up", "person helping another", "customer service counter"]),
    "Планы": ("calendar, planner, notes, schedule", ["calendar planner notes", "planning schedule notebook", "hands writing planner"]),
    "Проблемы и ошибки": ("problem, mistake, broken item, stressed work moment", ["mistake document stress", "broken item repair", "confused person laptop"]),
    "Здоровье": ("doctor, medicine, clinic, health routine", ["doctor clinic appointment", "medicine glass water", "healthcare clinic close up"]),
    "Деньги и документы": ("wallet, cash, card, documents, ATM", ["wallet cash card", "ATM cash withdrawal", "documents passport close up"]),
    "Телефон и технологии": ("smartphone, laptop, charger, technology close up", ["smartphone close up", "charging phone cable", "laptop file work"]),
    "Путешествия": ("travel, suitcase, hotel, airport, map", ["travel suitcase airport", "hotel reception check in", "map travel planning"]),
    "Срочные ситуации": ("urgent call, first aid kit, emergency help", ["urgent phone call", "first aid kit close up", "emergency help phone"]),
}

KEYWORD_RULES: list[tuple[re.Pattern[str], str, list[str]]] = [
    (re.compile(r"\bdishes?\b|\bplate\b", re.I), "washing dishes, kitchen sink, plates", ["washing dishes kitchen sink", "plates kitchen sink"]),
    (re.compile(r"\blights?\b|lamp", re.I), "turning off light switch or lamp", ["turning off light switch", "bedside lamp evening"]),
    (re.compile(r"\bliving room\b|cozy", re.I), "cozy living room interior", ["cozy living room interior", "home sofa living room"]),
    (re.compile(r"\bkitchen\b|cook|dinner", re.I), "kitchen cooking or kitchen counter", ["cooking kitchen counter", "kitchen dinner vegetables"]),
    (re.compile(r"\bemail\b|manager|client", re.I), "email on laptop, office desk", ["sending email laptop office", "email inbox laptop"]),
    (re.compile(r"\breport\b|document", re.I), "report pages on office desk", ["checking report documents desk", "business report papers"]),
    (re.compile(r"\bmeeting\b|schedule|calendar", re.I), "calendar or meeting schedule", ["calendar meeting schedule", "office meeting calendar"]),
    (re.compile(r"\bhomework\b|class|subjects?|studying|reading", re.I), "student studying with notebook and books", ["student studying notebook books", "classroom student notebook"]),
    (re.compile(r"\bnotebook\b|notes?\b", re.I), "hand writing notes in notebook", ["hand writing notes notebook", "notebook pen study close up"]),
    (re.compile(r"\bbus\b|stop\b", re.I), "bus stop with passenger", ["bus stop passenger waiting", "city bus stop"]),
    (re.compile(r"\btrain\b|station|platform", re.I), "train station platform passenger", ["train station platform passenger", "railway station platform"]),
    (re.compile(r"\btaxi\b", re.I), "taxi on city street", ["taxi city street", "taxi stand city"]),
    (re.compile(r"\bairport\b|flight|gate", re.I), "airport terminal travel", ["airport terminal passengers", "airport gate travel"]),
    (re.compile(r"\bstore\b|shop|cashier|receipt|buy|paid|check\b", re.I), "store counter cashier receipt", ["store cashier receipt", "paying card store counter"]),
    (re.compile(r"\bcafe\b|coffee|restaurant|dessert|menu|bill", re.I), "cafe or restaurant table", ["cafe table coffee", "restaurant menu bill"]),
    (re.compile(r"\bphone\b|message|call|Wi-Fi|password", re.I), "smartphone message or phone call close up", ["smartphone message close up", "phone call close up"]),
    (re.compile(r"\bhelp\b|bring|need\b", re.I), "person helping another with object", ["person helping hands", "helping someone close up"]),
    (re.compile(r"\bplan\b|tomorrow|later|review", re.I), "planner calendar notes", ["planner calendar notes", "writing plan notebook"]),
    (re.compile(r"\bmistake\b|problem|wrong|forgot|lost", re.I), "problem solving or stressed person at desk", ["stressed person laptop problem", "mistake document close up"]),
    (re.compile(r"\bdoctor\b|medicine|first aid|sick|pain|clinic", re.I), "medicine, doctor clinic, first aid", ["medicine glass water", "doctor clinic appointment", "first aid kit"]),
    (re.compile(r"\bcash\b|card|wallet|ATM|passport|documents?", re.I), "wallet cash card documents", ["wallet cash card", "ATM cash withdrawal", "passport documents"]),
    (re.compile(r"\blaptop\b|file|charger|battery|inbox", re.I), "laptop or smartphone technology close up", ["laptop desk close up", "charging phone cable", "email inbox laptop"]),
    (re.compile(r"\bhotel\b|suitcase|travel|map|directions?", re.I), "travel suitcase hotel map", ["hotel reception check in", "travel suitcase", "city map directions"]),
]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip())


def profile_for(row: dict[str, Any]) -> dict[str, Any]:
    english = normalize(row["english"])
    block = str(row["block"])
    default_anchor, default_queries = BLOCK_DEFAULTS.get(block, BLOCK_DEFAULTS["Дом и быт"])
    anchor = default_anchor
    queries = list(default_queries)
    for pattern, rule_anchor, rule_queries in KEYWORD_RULES:
        if pattern.search(english):
            anchor = rule_anchor
            queries = [*rule_queries, *queries]
            break
    # The phrase itself is only a fallback; direct visual anchors lead.
    queries.append(english.rstrip(".?!"))
    seen: set[str] = set()
    clean_queries = []
    for query in queries:
        query = normalize(query)
        if query.casefold() in seen:
            continue
        seen.add(query.casefold())
        clean_queries.append(query)
    return {
        "index": int(row["index"]),
        "id": row["id"],
        "block": block,
        "english": english,
        "russian": normalize(row["russian"]),
        "visual_anchor": anchor,
        "direct_association_rule": "Accepted background must visibly show the named object/action/place, not just a vague mood.",
        "search_queries": clean_queries[:6],
    }


def main() -> int:
    rows = load_json(ROWS_PATH)
    profiles = [profile_for(row) for row in rows]
    OUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({"status": "ready", "row_count": len(profiles), "profiles": profiles}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["index", "id", "block", "english", "russian", "visual_anchor", "search_queries"])
        writer.writeheader()
        for item in profiles:
            writer.writerow({**{key: item[key] for key in ["index", "id", "block", "english", "russian", "visual_anchor"]}, "search_queries": " | ".join(item["search_queries"])})
    print(json.dumps({"status": "ready", "row_count": len(profiles), "path": str(MANIFEST)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
