# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(__file__).resolve().parent.parent / "app" / "lesson_cards_data.ts"
t = p.read_text(encoding="utf-8")

if re.search(r"\n  30: \{\n    1: \{\n      correctRu:", t):
    print("Top-level lesson 30 already present")
    raise SystemExit(0)

marker = (
    "      secretUk: \"Слово victory походить від латинського vincere (перемагати). Цікаво, що ім'я Віктор з'явилося як символ тріумфу християнства.\"\n"
    "    },\n"
    "  },\n"
    "};"
)
if marker not in t:
    raise SystemExit("marker not found for end of lesson 29")

ins = (Path(__file__).resolve().parent / "_lesson_30_insert.fragment.txt").read_text(
    encoding="utf-8"
).rstrip() + "\n"

prefix = (
    "      secretUk: \"Слово victory походить від латинського vincere (перемагати). Цікаво, що ім'я Віктор з'явилося як символ тріумфу християнства.\"\n"
    "    },\n"
    "  },\n"
)
out = t.replace(marker, prefix + ins + "};", 1)
p.write_text(out, encoding="utf-8")
print("Merged lesson 30, new size", len(out))
