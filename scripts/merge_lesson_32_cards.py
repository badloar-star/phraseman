# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(__file__).resolve().parent.parent / "app" / "lesson_cards_data.ts"
t = p.read_text(encoding="utf-8")

if re.search(r"\n  32: \{\n    1: \{\n      correctRu:", t):
    print("Top-level lesson 32 already present")
    raise SystemExit(0)

marker = (
    "      secretUk: \"Найстаріші системи зрошення у світі були знайдені в Месопотамії та Єгипті, їм понад 5000 років. Без них сільське господарство в цих регіонах було б неможливим\"\n"
    "    },\n"
    "  },\n"
    "};"
)
if marker not in t:
    raise SystemExit("marker not found for end of lesson 31")

ins = (Path(__file__).resolve().parent / "_lesson_32_insert.fragment.txt").read_text(
    encoding="utf-8"
).rstrip() + "\n"

prefix = (
    "      secretUk: \"Найстаріші системи зрошення у світі були знайдені в Месопотамії та Єгипті, їм понад 5000 років. Без них сільське господарство в цих регіонах було б неможливим\"\n"
    "    },\n"
    "  },\n"
)
out = t.replace(marker, prefix + ins + "};", 1)
p.write_text(out, encoding="utf-8")
print("Merged lesson 32, new size", len(out))
