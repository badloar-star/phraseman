# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(__file__).resolve().parent.parent / "app" / "lesson_cards_data.ts"
t = p.read_text(encoding="utf-8")

if re.search(r"\n  31: \{\n    1: \{\n      correctRu:", t):
    print("Top-level lesson 31 already present")
    raise SystemExit(0)

marker = (
    "      secretUk: \"Троянди вирощують уже понад 5000 років. У Стародавньому Римі їхні пелюстки використовували як конфеті на бенкетах, а аромат вважався символом розкоші\"\n"
    "    },\n"
    "  },\n"
    "};"
)
if marker not in t:
    raise SystemExit("marker not found for end of lesson 30")

ins = (Path(__file__).resolve().parent / "_lesson_31_insert.fragment.txt").read_text(
    encoding="utf-8"
).rstrip() + "\n"

prefix = (
    "      secretUk: \"Троянди вирощують уже понад 5000 років. У Стародавньому Римі їхні пелюстки використовували як конфеті на бенкетах, а аромат вважався символом розкоші\"\n"
    "    },\n"
    "  },\n"
)
out = t.replace(marker, prefix + ins + "};", 1)
p.write_text(out, encoding="utf-8")
print("Merged lesson 31, new size", len(out))
