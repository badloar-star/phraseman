#!/usr/bin/env python3
"""Manual editorial fixes for selected Chains unique v3 phrase rows."""

from __future__ import annotations

import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_chains_unique_phrase_pack_openai_v3 import OUT, validate_rows, write_outputs  # noqa: E402


FIXES = {
    94: ("The kitchen is quiet after breakfast.", "На кухне тихо после завтрака."),
    150: ("Can you show me the meeting room?", "Можешь показать мне переговорку?"),
    201: ("Where does this bus stop?", "Где останавливается этот автобус?"),
    220: ("Could you tell me where the bus stop is?", "Не подскажешь, где автобусная остановка?"),
    237: ("The bus ride takes twenty minutes.", "Поездка на автобусе занимает двадцать минут."),
    426: ("What kind of help do you need?", "Какая помощь тебе нужна?"),
    434: ("Could you help me sort these papers?", "Не мог бы ты помочь мне разобрать эти бумаги?"),
    450: ("What exactly should I help with?", "С чем именно мне помочь?"),
    482: ("We moved the meeting to Thursday.", "Мы перенесли встречу на четверг."),
    503: ("Could you check the connection?", "Не могли бы вы проверить подключение?"),
    700: ("What is the Wi-Fi password?", "Какой пароль от Wi-Fi?"),
    732: ("You should check tomorrow's weather.", "Тебе стоит проверить погоду на завтра."),
    738: ("Where is the taxi stand?", "Где стоянка такси?"),
}


def row_type(english: str) -> str:
    if english.endswith("?"):
        return "question"
    if english.startswith(("Please ", "Don't ", "Let’s ", "Let's ", "Can you ", "Could you ")):
        return "request_or_command"
    if english.startswith("I "):
        return "i_statement"
    if english.startswith(("You ", "We ")):
        return "you_we_statement"
    if english.startswith(("There ", "It ", "The ", "This ", "That ")):
        return "situation_statement"
    return "other"


def main() -> int:
    path = OUT / "chains_800_unique_phrases.json"
    rows = json.loads(path.read_text(encoding="utf-8"))
    for index, (english, russian) in FIXES.items():
        row = rows[index - 1]
        row["english"] = english
        row["russian"] = russian
        row["type"] = row_type(english)
    report = validate_rows(rows)
    write_outputs(rows, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
