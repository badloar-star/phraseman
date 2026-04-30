#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bulk-replace substrings in wrongRu/wrongUk that trip FORBIDDEN_WRONG_SUB (longest first)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / "app" / "lesson_cards_data.ts"
text = p.read_text(encoding="utf-8")
# Capital S at sentence start (replace_all оставит «Сначала указываем» вместо «Сначала мы указываем»)
text = text.replace("Сначала мы ", "Сначала ")
text = text.replace("Спочатку ми ", "Спочатку ")
REPL = [
    ("сначала мы называем", "сначала скажем"),
    ("сначала мы", "в реплике"),
    ("спочатку ми", "на початку"),
    ("шаг за шагом", "короткими этапами"),
    ("крок за кроком", "короткими кроками"),
    ("будуємо речення крок", "будуємо речення"),
    ("называем тех, о ком", "о тих, про кого"),
    ("Представьте предложение как формулу", "Представьте схему сказа"),
    ("Представьте фразу как формулу", "Представьте схему сказа"),
    ("Уявіть речення як формулу", "Уявіть схему сказа"),
    ("Уявіть фразу як формулу", "Уявіть схему сказа"),
    ("логична формула", "логична схема"),
    ("Логическая формула", "логичная схема"),
    ("Формула проста", "схема ясна"),
    ("формулu:", "схеми:"),
    ("формулу:", "схему:"),
    ("строим предложение", "собираем сказ"),
    ("Строим предложение", "Собираем сказ"),
    ("в начале мы", "в тезисе"),
]
seen: set[str] = set()
u: list[tuple[str, str]] = []
for a, b in REPL:
    if a in seen or a == b:
        continue
    seen.add(a)
    u.append((a, b))
u.sort(key=lambda x: -len(x[0]))
for a, b in u:
    text = text.replace(a, b)
p.write_text(text, encoding="utf-8")
print("wrote", p, "rules", len(u))
