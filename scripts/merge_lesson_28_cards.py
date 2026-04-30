# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(__file__).resolve().parent.parent / "app" / "lesson_cards_data.ts"
t = p.read_text(encoding="utf-8")

if re.search(r"\n  28: \{\n    1: \{\n      correctRu:", t):
    print("Top-level lesson 28 already present")
    raise SystemExit(0)

marker = (
    '      secretUk: "Слово «urgent» (терміновий) походить від латинського «urgere» — «гнати» або «тиснути». Термінове повідомлення — це те, яке буквально «підганяє» вас до дії."\n'
    "    },\n"
    "  },\n"
    "};"
)
if marker not in t:
    raise SystemExit("marker not found for end of lesson 27")

ins = (Path(__file__).resolve().parent.parent / "app" / "_lesson_28_insert.ts").read_text(
    encoding="utf-8"
).rstrip() + "\n"

out = t.replace(
    marker,
    (
        '      secretUk: "Слово «urgent» (терміновий) походить від латинського «urgere» — «гнати» або «тиснути». Термінове повідомлення — це те, яке буквально «підганяє» вас до дії."\n'
        "    },\n"
        "  },\n"
    )
    + ins
    + "};",
    1,
)
p.write_text(out, encoding="utf-8")
print("Merged lesson 28, new size", len(out))
