# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(__file__).resolve().parent.parent / "app" / "lesson_cards_data.ts"
t = p.read_text(encoding="utf-8")

if re.search(r"\n  29: \{\n    1: \{\n      correctRu:", t):
    print("Top-level lesson 29 already present")
    raise SystemExit(0)

# Last card of lesson 50 in lesson 28: secret about journey
marker = (
    '      secretUk: "Слово «journey» походить від французького «journée» (день). Спочатку це означало відстань, яку '
    "можна пройти або проїхати рівно за один світловий день.\"\n"
    "    },\n"
    "  },\n"
    "};"
)
if marker not in t:
    raise SystemExit("marker not found for end of lesson 28")

ins = (Path(__file__).resolve().parent / "_lesson_29_insert.fragment.txt").read_text(
    encoding="utf-8"
).rstrip() + "\n"

prefix = (
    '      secretUk: "Слово «journey» походить від французького «journée» (день). Спочатку це означало відстань, яку '
    "можна пройти або проїхати рівно за один світловий день.\"\n"
    "    },\n"
    "  },\n"
)
out = t.replace(marker, prefix + ins + "};", 1)
p.write_text(out, encoding="utf-8")
print("Merged lesson 29, new size", len(out))
