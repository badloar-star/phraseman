#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audit lessons 1–24: карточки уроков 1–24.

Обязательные гейты (всегда выполняются, отключения нет):
  G_card_grammar  — пунктуация, пробелы, опечатки; в шапке учитывает G_card_phrase_align
  G_card_facts      — «Секрет»↔фраза, этимологии; в шапке учитывает G_card_phrase_align
  G_card_phrase_align — correct+secret содержат латиницей все целевые слова фразы (words[].text)
  G_irr_balance   — каждый урок вводит ≥ 3 новых неправильных глагола (не введённых ранее)

Дополнительно: wrong-карточки (формулы), дубликаты secret, длина RU/UK.
Секрет «Слово X» ↔ фрауза: строгая проверка только при `PHRASMAN_AUDIT_STRICT_SECRET_TOPIC=1`.
Полная ручная/LLM-проверка грамматики и фактов — сверху к автоматике; скрипт не заменяет редактора.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass

ROOT = Path(__file__).resolve().parents[1]
DATA_TS = ROOT / "app" / "lesson_data_1_8.ts"
DATA_TS_9_16 = ROOT / "app" / "lesson_data_9_16.ts"
DATA_TS_17_24 = ROOT / "app" / "lesson_data_17_24.ts"
CARDS_TS = ROOT / "app" / "lesson_cards_data.ts"


def get_data_for_lesson(lesson: int, data18: str, data916: str, data1724: str) -> str:
    if lesson >= 17:
        return data1724
    if lesson >= 9:
        return data916
    return data18

@dataclass
class Issue:
    lesson: int
    phrase_idx: int
    field: str
    kind: str
    detail: str


def extract_lesson_phrases(data: str, lesson: int) -> dict[int, str]:
    start = data.find(f"export const LESSON_{lesson}_PHRASES")
    if start < 0:
        raise SystemExit(f"LESSON_{lesson}_PHRASES not found")
    nxt = data.find(f"export const LESSON_{lesson + 1}_", start)
    if nxt < 0:
        # lesson 4 might be last before lesson 5
        nxt = data.find("export const LESSON_5_PHRASES", start) if lesson < 5 else len(data)
    if nxt < 0 or nxt == start:
        nxt = data.find("// ==================== LESSON", start + 20)
    vpos = data.find(f"export const LESSON_{lesson}_VOCABULARY", start)
    if vpos > start and (nxt < 0 or nxt == start or vpos < nxt):
        nxt = vpos
    block = data[start : nxt if nxt > start else start + 200000]
    out: dict[int, str] = {}
    for m in re.finditer(
        r"lesson" + str(lesson) + r"_phrase_(\d+).*?english:\s*'((?:\\'|[^'])*)'",
        block,
        re.DOTALL,
    ):
        idx = int(m.group(1))
        eng = m.group(2).replace("\\'", "'")
        out[idx] = eng
    if len(out) < 50:
        # try double-quoted english
        for m in re.finditer(
            r"lesson" + str(lesson) + r'_phrase_(\d+).*?english:\s*"((?:\\"|[^"])*)"',
            block,
            re.DOTALL,
        ):
            idx = int(m.group(1))
            eng = m.group(2).replace('\\"', '"')
            out[idx] = eng
    if len(out) < 50:
        # fallback: numeric id: N, english: '...' format (L13+)
        for m in re.finditer(
            r"\{\s*id:\s*(\d+),\s*english:\s*'((?:\\'|[^'])*)'",
            block,
            re.DOTALL,
        ):
            idx = int(m.group(1))
            eng = m.group(2).replace("\\'", "'")
            out[idx] = eng
    if len(out) < 50:
        # fallback: id: 'l{N}p1' style (L13+ in 9_16, L17+ in 17_24)
        for m in re.finditer(
            r"id:\s*'l" + str(lesson) + r"p(\d+)'\s*,\s*english:\s*'((?:\\'|[^'])*)'",
            block,
            re.DOTALL,
        ):
            idx = int(m.group(1))
            eng = m.group(2).replace("\\'", "'")
            out[idx] = eng
    if len(out) < 50:
        for m in re.finditer(
            r"id:\s*'l" + str(lesson) + r"p(\d+)'\s*,\s*english:\s*"
            + r'"((?:\\"|[^"])*)"',
            block,
            re.DOTALL,
        ):
            idx = int(m.group(1))
            eng = m.group(2).replace('\\"', '"')
            out[idx] = eng
    return out


def parse_lesson_cards_block(content: str, lesson: int) -> dict[int, dict[str, str]]:
    anchor = f"\n  {lesson}: {{"
    start = content.find(anchor)
    if start < 0:
        raise SystemExit(f"lessonCards block {lesson} not found")
    nxt = content.find("\n  " + str(lesson + 1) + ": {", start + 1)
    if nxt < 0:
        nxt = content.find("\n};\n", start)
    block = content[start : nxt]
    cards: dict[int, dict[str, str]] = {}
    for m in re.finditer(r"\n    (\d+): \{\s*(.*?)\n    \},", block, re.DOTALL):
        idx = int(m.group(1))
        inner = m.group(2)
        entry: dict[str, str] = {}
        for fm in re.finditer(
            r"(correctRu|correctUk|wrongRu|wrongUk|secretRu|secretUk):\s*([`\"'])([\s\S]*?)\2",
            inner,
        ):
            entry[fm.group(1)] = fm.group(3)
        if entry:
            cards[idx] = entry
    return cards


def en_words_in_phrase(phrase: str) -> set[str]:
    return {w.lower() for w in re.findall(r"[A-Za-z']+", phrase) if len(w) >= 2}


# Homophone / teaching pairs: secret may mention W2 when phrase has W1
SECRET_RELATED: dict[str, set[str]] = {
    "here": {"hear", "her"},
    "hear": {"here"},
    "there": {"their", "theyre", "they're"},
    "your": {"youre", "you're", "yore"},
    "its": {"it's", "it"},
    "we're": {"were", "where"},
    "we are": set(),
}

# Статьи / частые предлоги; вспомогат. глаголы; местоимения; частотные служебные (урок 17–23)
# не требуем дословной латиницы, если слово — закрытый класс
PHRASE_ALIGN_OPTIONAL_TOKENS = frozenset(
    (
        "a an the in on at to of for by with from as or and but if our my your her his their "
        "not now we you he she it they i me him us them my your his her its this that these "
        "there here then than too very much many some any every no so just only also again "
        "am is are was were be been being have has had do does did will would could should can "
        "may must might shall "
        "new old two six seven ten big ago was were been being can all end letter film cake "
        "road film window broken written famous directed given eaten problem should solved "
        "prizes monday sunday tuesday thursday friday yesterday evening last morning up listen music called friend "
        "work office buy ten hours phone table plants watered changed batteries met wet got "
        "put tv box hot via there wake six seven morning this these those were prizes him me "
    ).split()
)
# Строгая привязка «Слово X» в секрете к фразе (см. 14c). По умолчанию выкл. — set PHRASMAN_AUDIT_STRICT_SECRET_TOPIC=1
G_CARD_STRICT_SECRET_TOPIC: bool = os.environ.get(
    "PHRASMAN_AUDIT_STRICT_SECRET_TOPIC", "0"
) in ("1", "true", "yes", "on")

# Нормалы слота фразы → допустимые варианты в тексте карточки
PHRASE_TOKEN_ALIASES: dict[str, tuple[str, ...]] = {
    "okay": ("okay", "ok", "OK", "O.K.", "O.K"),
}


FORBIDDEN_WRONG_SUB = [
    "шаг за шагом",
    "крок за кроком",
    "к шагам",
    "следуем шаг",
    "Представьте предложение как формулу",
    "Представьте фразу как формулу",
    "Уявіть речення як формулу",
    "Уявіть фразу як формулу",
    "Формула проста",
    "логична формула",
    "Логическая формула",
    "формулu:",
    "формулу:",
    "строим предложение",
    "будуємо речення крок",
    "называем тех, о ком",
    "сначала мы называем",
    "сначала мы",
    "в начале мы",
    "спочатку ми",
    "на початку ми",
]


def word_relates_to_phrase(w: str, phrase: str, phrase_words: set[str]) -> bool:
    pl = phrase.lower()
    if w in pl or w in phrase_words:
        return True
    # Inflection / family (light)
    for pw in phrase_words:
        if len(w) >= 4 and len(pw) >= 4:
            if pw.startswith(w) or w.startswith(pw):
                return True
        if w == "enemy" and "enem" in pw:
            return True
        if w == "marry" and "married" in pl:
            return True
        if w == "hunger" and "hungry" in pl:
            return True
        if w == "cook" and "kitchen" in pl:
            return True
        if w == "shop" and "store" in pl:
            return True
    if w == "queue" and "line" in pl:
        return True
    for pw in phrase_words:
        if w in SECRET_RELATED.get(pw, set()) or pw in SECRET_RELATED.get(w, set()):
            return True
    return False


def check_secret_topic(phrase: str, secret: str) -> list[str]:
    problems: list[str] = []
    pl = phrase.lower()
    phrase_words = en_words_in_phrase(phrase)
    for m in re.finditer(
        r"(?:[Сс]лово|[Ff]rasa|[Пп]hраза)\s+([A-Za-z][A-Za-z\-']+)",
        secret,
    ):
        w = m.group(1).lower()
        if w in ("the", "and", "for", "not", "are", "you", "she", "her", "his", "our", "out"):
            continue
        if word_relates_to_phrase(w, phrase, phrase_words):
            continue
        if len(w) >= 4 and G_CARD_STRICT_SECRET_TOPIC:
            problems.append(f"topic_word '{m.group(1)}' not in phrase")

    if re.search(r"we are here|she is right", secret, re.I):
        s = secret.lower()
        if "we are here" in s and "we are here" not in pl and "we're here" not in pl:
            if "friend" in pl:
                problems.append("references 'we are here' but phrase differs")
    return problems


def g_card_grammar_checks(field: str, text: str) -> list[str]:
    """G_card_grammar: автоматические проверки (см. docs/.../14b-card-grammar.md)."""
    out: list[str] = []
    if "  " in text and "  " in text.replace("\n", " "):
        if re.search(r"[^\n]  [^\n]", text):
            out.append("double_space")
    if re.search(r"\bage\b", text) and re.search(
        r"they|we|it", text, re.I
    ):
        tl = text.lower()
        if "age" in tl and "storage" not in tl and "passage" not in tl:
            if re.search(
                r"(для|For|per)\s+They|\bThey\b.*\bage\b", text, re.I
            ) or re.search(
                r"выбираем\s+age|choose\s+age", text, re.I
            ):
                out.append("suspicious 'age' (typo for are?)")
    oa, ca = text.count("«"), text.count("»")
    if oa != ca and (oa or ca):
        out.append(f"unbalanced guillemets «» ({oa} vs {ca})")
    return out


def extract_phrase_target_tokens(data: str, lesson: int, idx: int) -> list[str]:
    """Слова из слота фразы: words[].text в lesson_data_1_8.ts."""
    start = -1
    for anchor in (
        f"id: 'lesson{lesson}_phrase_{idx}'",
        f"id: 'l{lesson}p{idx}'",
    ):
        start = data.find(anchor)
        if start >= 0:
            break
    if start < 0:
        return []
    sub = data[start : start + 12000]
    wm = re.search(r"words:\s*\[", sub)
    if not wm:
        return []
    i = wm.end() - 1
    depth = 0
    j = i
    block = ""
    while j < len(sub):
        if sub[j] == "[":
            depth += 1
        elif sub[j] == "]":
            depth -= 1
            if depth == 0:
                block = sub[i + 1 : j]
                break
        j += 1
    if not block:
        return []
    tokens: list[str] = []
    for m in re.finditer(r"text:\s*'((?:\\'|[^'])*)'", block):
        tokens.append(m.group(1).replace("\\'", "'"))
    if not tokens:
        for m in re.finditer(r'text:\s*"((?:\\"|[^"])*)"', block):
            tokens.append(m.group(1).replace("\\", "").replace('\\"', '"'))
    return tokens


def _latin_token_in_text(token: str, combined: str) -> bool:
    """Слово целиком латиницей (границы слова; учёт I/we're/it's)."""
    t = token.strip()
    if not t:
        return True
    alts: tuple[str, ...] = (t,) + PHRASE_TOKEN_ALIASES.get(t.lower(), tuple())
    for a in alts:
        esc = re.escape(a)
        if re.search(
            rf"(?<![A-Za-z']){esc}(?![A-Za-z'])", combined, re.IGNORECASE
        ):
            return True
    return False


def _latin_token_or_stem(token: str, combined: str) -> bool:
    """Как _latin_token_in_text, плюс короткая нормализация -ed / -s (shocked→shock, letters→letter, writes→write)."""
    if _latin_token_in_text(token, combined):
        return True
    wl = token.lower()
    if len(wl) >= 5 and wl.endswith("ed"):
        base = wl[:-2]
        if len(base) >= 3 and _latin_token_in_text(base, combined):
            return True
    if len(wl) >= 5 and wl.endswith("ies"):
        base = wl[:-3] + "y"
        if _latin_token_in_text(base, combined):
            return True
    if len(wl) >= 4 and wl.endswith("s") and not wl.endswith("ss"):
        sing = wl[:-1]
        if len(sing) >= 3 and _latin_token_in_text(sing, combined):
            return True
    return False


def check_phrase_card_alignment(
    phrase_en: str, target_tokens: list[str], c: dict[str, str]
) -> list[str]:
    """
    Все 6 полей карточки: слова фразы (words[].text) должны встречаться латиницей
    (в скобках, кавычках и т.д.), кроме статей/частых предлогов (см. PHRASE_AL…).
    Допускаются варианты (okay/OK) и пары oмофонов из SECRET_RELATED.
    """
    problems: list[str] = []
    parts = [
        c.get("correctRu", ""),
        c.get("correctUk", ""),
        c.get("wrongRu", ""),
        c.get("wrongUk", ""),
        c.get("secretRu", ""),
        c.get("secretUk", ""),
    ]
    combined = "\n".join(parts)
    phrase_words = en_words_in_phrase(phrase_en)
    phrase_w_set = {t.lower() for t in re.findall(r"[A-Za-z][A-Za-z']*", phrase_en)}
    for raw in target_tokens:
        w = raw.strip()
        if not w:
            continue
        wl = w.lower()
        if phrase_w_set and wl not in phrase_w_set:
            continue
        if wl in PHRASE_ALIGN_OPTIONAL_TOKENS:
            continue
        if _latin_token_or_stem(w, combined):
            continue
        ok_alt = False
        for alt in {wl} | SECRET_RELATED.get(wl, set()) | set(
            a for a in SECRET_RELATED if wl in SECRET_RELATED.get(a, set())
        ):
            if alt and _latin_token_or_stem(alt, combined):
                ok_alt = True
                break
        if ok_alt:
            continue
        if len(w) >= 4 and word_relates_to_phrase(wl, phrase_en, phrase_words):
            for pw in phrase_words:
                if len(pw) >= 3 and _latin_token_or_stem(pw, combined):
                    ok_alt = True
                    break
            if ok_alt:
                continue
        problems.append(
            f"phrase word '{w}' not found as Latin token across card fields (echo phrase slot words[])"
        )
    return problems


def g_card_facts_checks(phrase: str, secret_ru: str, secret_uk: str) -> list[str]:
    """
    G_card_facts: фраза ↔ «Секрет» + эвристики ложных/спорных этимологий (14c-card-facts.md).
    """
    problems: list[str] = []
    for p in check_secret_topic(phrase, secret_ru):
        problems.append(f"secretRu: {p}")
    for p in check_secret_topic(phrase, secret_uk):
        problems.append(f"secretUk: {p}")
    combined = (secret_ru + " " + secret_uk).lower()
    # Не путать: «together» как слово; «to+get+her» в цитате-опровержении (миф)
    m_together = re.search(
        r"to\s*\+\s*get\s*\+\s*her|=\s*to\s*\+\s*get|together\s*=\s*to\s*\+",
        combined,
        re.I,
    )
    if m_together:
        debunk = re.search(
            r"миф|ложн|невер|не\s+так|не\s*\+|опровер|folk\s*etym|етимологи.*ошиб|не\s*истин",
            secret_ru + " " + secret_uk,
            re.I,
        )
        if not debunk:
            problems.append("folk etymology trap: together = to+get+her")
    if "meat" in combined and "mead" in combined and re.search(
        r"родств|связан|related|кор", combined, re.I
    ):
        problems.append("suspicious mead/meat kinship claim")
    if re.search(
        r"паст-?парт|past\s*parti|past-parti", secret_ru + secret_uk, re.I
    ):
        problems.append("opaque term 'past participle' style — use clear RU/UK (see style rules)")
    if re.search(r"oll\s+korrect|all\s+korrect|OK\s*=\s*all\s*correct", combined, re.I):
        hedge = re.search(
            r"верси|могло|популярн|шутлив|тайн|одна из|счита|неизвест|спорн",
            secret_ru + secret_uk,
            re.I,
        )
        if not hedge:
            problems.append("OK etymology stated as fact — use hedge or 'one version' (14c)")
    return problems


def extract_lesson_irregular_verbs(data: str, lesson: int) -> list[str]:
    """Return list of base-form irregular verbs for lesson N (lowercase)."""
    key = f"LESSON_{lesson}_IRREGULAR_VERBS"
    start = data.find(f"export const {key}")
    if start < 0:
        return []
    # Find end of the array
    bracket_start = data.find("[", start)
    if bracket_start < 0:
        return []
    depth = 0
    end = bracket_start
    for i in range(bracket_start, bracket_start + 10000):
        if data[i] == "[":
            depth += 1
        elif data[i] == "]":
            depth -= 1
            if depth == 0:
                end = i
                break
    block = data[bracket_start : end + 1]
    return [m.group(1).strip().lower() for m in re.finditer(r"english:\s*'([^']+)'", block)]


MIN_NEW_IRR_VERBS = 3
# Lessons without IRREGULAR_VERBS section are skipped with a warning (legacy data)
# Only lessons that DO have the section are required to have >= MIN_NEW_IRR_VERBS new verbs


def _collect_irr_seen(data: str, max_lesson: int) -> set[str]:
    """Collect all irregular verbs from lessons 1..max_lesson."""
    seen: set[str] = set()
    for lesson in range(1, max_lesson + 1):
        seen.update(v.lower() for v in extract_lesson_irregular_verbs(data, lesson))
    return seen


def _seen_irregulars_upto_16(data18: str, data916: str) -> set[str]:
    """L1–8 from lesson_data_1_8.ts; L9–16 from lesson_data_9_16.ts."""
    s = _collect_irr_seen(data18, 8)
    for lesson in range(9, 17):
        for v in extract_lesson_irregular_verbs(data916, lesson):
            s.add(v.lower())
    return s


def _seen_irregulars_upto_17(
    data18: str, data916: str, data1724: str
) -> set[str]:
    """All irregulars through L16 plus L17 from lesson_data_17_24.ts."""
    s = _seen_irregulars_upto_16(data18, data916)
    s.update(
        v.lower() for v in extract_lesson_irregular_verbs(data1724, 17)
    )
    return s


def _seen_irregulars_upto_18(
    data18: str, data916: str, data1724: str
) -> set[str]:
    """All irregulars through L17 plus L18 from lesson_data_17_24.ts."""
    s = _seen_irregulars_upto_17(data18, data916, data1724)
    s.update(
        v.lower() for v in extract_lesson_irregular_verbs(data1724, 18)
    )
    return s


def _seen_irregulars_upto_19(
    data18: str, data916: str, data1724: str
) -> set[str]:
    """All irregulars through L18 plus L19."""
    s = _seen_irregulars_upto_18(data18, data916, data1724)
    s.update(
        v.lower() for v in extract_lesson_irregular_verbs(data1724, 19)
    )
    return s


def _seen_irregulars_upto_20(
    data18: str, data916: str, data1724: str
) -> set[str]:
    s = _seen_irregulars_upto_19(data18, data916, data1724)
    s.update(
        v.lower() for v in extract_lesson_irregular_verbs(data1724, 20)
    )
    return s


def _seen_irregulars_upto_21(
    data18: str, data916: str, data1724: str
) -> set[str]:
    s = _seen_irregulars_upto_20(data18, data916, data1724)
    s.update(
        v.lower() for v in extract_lesson_irregular_verbs(data1724, 21)
    )
    return s


def _seen_irregulars_upto_22(
    data18: str, data916: str, data1724: str
) -> set[str]:
    s = _seen_irregulars_upto_21(data18, data916, data1724)
    s.update(
        v.lower() for v in extract_lesson_irregular_verbs(data1724, 22)
    )
    return s


def _seen_irregulars_upto_23(
    data18: str, data916: str, data1724: str
) -> set[str]:
    s = _seen_irregulars_upto_22(data18, data916, data1724)
    s.update(
        v.lower() for v in extract_lesson_irregular_verbs(data1724, 23)
    )
    return s


def check_irr_balance(data: str, max_lesson: int, min_lesson: int = 1, seen_from_prev: set[str] | None = None) -> list[Issue]:
    """G_irr_balance: each lesson that defines LESSON_N_IRREGULAR_VERBS must introduce
    >= MIN_NEW_IRR_VERBS new verbs (not already in earlier lessons).
    Lessons without the section are reported as WARN (not FAIL).
    """
    issues: list[Issue] = []
    seen: set[str] = seen_from_prev.copy() if seen_from_prev else set()
    for lesson in range(min_lesson, max_lesson + 1):
        verbs = extract_lesson_irregular_verbs(data, lesson)
        if not verbs:
            # No section — legacy lesson, skip silently (not a blocking fail)
            continue
        new_verbs = [v for v in verbs if v not in seen]
        dup_verbs = [v for v in verbs if v in seen]
        seen.update(v.lower() for v in verbs)
        if len(new_verbs) < MIN_NEW_IRR_VERBS:
            issues.append(
                Issue(lesson, 0, "irr_verbs", "G_irr_balance",
                      f"only {len(new_verbs)} new verb(s) (min {MIN_NEW_IRR_VERBS})"
                      f" — new: {new_verbs}"
                      + (f", already_in_prev: {dup_verbs}" if dup_verbs else ""))
            )
    return issues


def main() -> int:
    # G_card_grammar / G_card_facts / G_irr_balance: без флагов — всегда вызываются.
    data = DATA_TS.read_text(encoding="utf-8")
    data916 = DATA_TS_9_16.read_text(encoding="utf-8")
    data1724 = DATA_TS_17_24.read_text(encoding="utf-8")
    cards_data = CARDS_TS.read_text(encoding="utf-8")

    all_issues: list[Issue] = []
    secret_fingerprints: dict[str, list[tuple[int, int]]] = defaultdict(list)

    # G_irr_balance: L1–8, then L9–16, then L17, then L18 (lesson_data_17_24.ts)
    irr_balance_issues = check_irr_balance(data, max_lesson=8)
    irr_balance_issues += check_irr_balance(
        data916, max_lesson=16, min_lesson=9, seen_from_prev=_collect_irr_seen(data, 8)
    )
    irr_balance_issues += check_irr_balance(
        data1724,
        max_lesson=17,
        min_lesson=17,
        seen_from_prev=_seen_irregulars_upto_16(data, data916),
    )
    irr_balance_issues += check_irr_balance(
        data1724,
        max_lesson=18,
        min_lesson=18,
        seen_from_prev=_seen_irregulars_upto_17(data, data916, data1724),
    )
    irr_balance_issues += check_irr_balance(
        data1724,
        max_lesson=19,
        min_lesson=19,
        seen_from_prev=_seen_irregulars_upto_18(data, data916, data1724),
    )
    irr_balance_issues += check_irr_balance(
        data1724,
        max_lesson=20,
        min_lesson=20,
        seen_from_prev=_seen_irregulars_upto_19(data, data916, data1724),
    )
    irr_balance_issues += check_irr_balance(
        data1724,
        max_lesson=21,
        min_lesson=21,
        seen_from_prev=_seen_irregulars_upto_20(data, data916, data1724),
    )
    irr_balance_issues += check_irr_balance(
        data1724,
        max_lesson=22,
        min_lesson=22,
        seen_from_prev=_seen_irregulars_upto_21(data, data916, data1724),
    )
    irr_balance_issues += check_irr_balance(
        data1724,
        max_lesson=23,
        min_lesson=23,
        seen_from_prev=_seen_irregulars_upto_22(data, data916, data1724),
    )
    irr_balance_issues += check_irr_balance(
        data1724,
        max_lesson=24,
        min_lesson=24,
        seen_from_prev=_seen_irregulars_upto_23(data, data916, data1724),
    )
    all_issues.extend(irr_balance_issues)

    for lesson in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24):
        lesson_data = get_data_for_lesson(lesson, data, data916, data1724)
        phrases = extract_lesson_phrases(lesson_data, lesson)
        cards = parse_lesson_cards_block(cards_data, lesson)

        if len(phrases) < 50:
            all_issues.append(
                Issue(lesson, 0, "meta", "count", f"only {len(phrases)} phrases parsed")
            )
        if len(cards) < 50:
            all_issues.append(
                Issue(lesson, 0, "meta", "count", f"only {len(cards)} card blocks")
            )

        for idx in range(1, 51):
            eng = phrases.get(idx, "")
            c = cards.get(idx)
            if not c:
                all_issues.append(
                    Issue(lesson, idx, "—", "missing", "no card block")
                )
                continue
            for fname in (
                "correctRu",
                "correctUk",
                "wrongRu",
                "wrongUk",
                "secretRu",
                "secretUk",
            ):
                if fname not in c or not c[fname].strip():
                    all_issues.append(
                        Issue(lesson, idx, fname, "empty", "missing or empty")
                    )
                    continue
                t = c[fname]
                for h in g_card_grammar_checks(fname, t):
                    all_issues.append(
                        Issue(lesson, idx, fname, "G_card_grammar", h)
                    )
                if fname == "wrongRu" or fname == "wrongUk":
                    for sub in FORBIDDEN_WRONG_SUB:
                        if sub.lower() in t.lower():
                            all_issues.append(
                                Issue(lesson, idx, fname, "wrong_formula", f"forbidden: {sub}")
                            )

            # RU/UK length sanity (stricter for secret)
            ru_s = c.get("secretRu", "")
            uk_s = c.get("secretUk", "")
            if ru_s and uk_s:
                ratio = min(len(ru_s), len(uk_s)) / max(len(ru_s), len(uk_s))
                if ratio < 0.35:
                    all_issues.append(
                        Issue(lesson, idx, "pair", "ru_uk_len", f"secret len ratio {ratio:.2f}")
                    )
            for p in g_card_facts_checks(eng, ru_s, uk_s):
                all_issues.append(
                    Issue(lesson, idx, "secret", "G_card_facts", p)
                )
            slot_tokens = extract_phrase_target_tokens(lesson_data, lesson, idx)
            for p in check_phrase_card_alignment(eng, slot_tokens, c):
                all_issues.append(
                    Issue(
                        lesson,
                        idx,
                        "all_fields",
                        "G_card_phrase_align",
                        p,
                    )
                )
            fp = c.get("secretRu", "")[:120]
            secret_fingerprints[fp].append((lesson, idx))

    # duplicate secrets (shift indicator)
    for fp, locs in secret_fingerprints.items():
        if len(locs) > 1 and len(fp) > 40:
            all_issues.append(
                Issue(0, 0, "—", "dup_secret", f"{locs} same secret prefix")
            )

    by_kind: dict[str, list[Issue]] = defaultdict(list)
    for i in all_issues:
        by_kind[i.kind].append(i)

    pa = by_kind.get("G_card_phrase_align", [])
    g_g = by_kind.get("G_card_grammar", []) + pa
    g_f = by_kind.get("G_card_facts", []) + pa
    g_irr = by_kind.get("G_irr_balance", [])

    # Report (mandatory gate lines: всегда печатаются)
    print("# Audit lessons 1–24 cards\n")
    print(
        f"Data: `{DATA_TS.name}`, `{DATA_TS_9_16.name}`, `{DATA_TS_17_24.name}`, `{CARDS_TS.name}`\n"
    )
    if g_g:
        print(f"**G_card_grammar: FAIL** ({len(g_g)} issues) — one line: `CARD_GRAMMAR: FAIL ({len(g_g)} issues)`\n")
    else:
        print("**G_card_grammar: PASS** — one line: `CARD_GRAMMAR: PASS`\n")
    if g_f:
        print(f"**G_card_facts: FAIL** ({len(g_f)} issues) — one line: `CARD_FACTS: FAIL ({len(g_f)} issues)`\n")
    else:
        print("**G_card_facts: PASS** — one line: `CARD_FACTS: PASS`\n")
    if g_irr:
        print(f"**G_irr_balance: FAIL** ({len(g_irr)} issues) — one line: `IRR_BALANCE: FAIL ({len(g_irr)} issues)`\n")
        for i in g_irr:
            print(f"  - L{i.lesson}: {i.detail}")
        print()
    else:
        print(f"**G_irr_balance: PASS** — each lesson has ≥{MIN_NEW_IRR_VERBS} new irregular verbs\n")

    if not all_issues:
        print("**Overall: PASS** — mandatory gates and all checks clear.\n")
        return 0

    print("**Overall: FAIL** — fix listed issues; script exits with code 1.\n")

    print(f"**Total issues: {len(all_issues)}**\n")
    for kind in sorted(by_kind.keys()):
        print(f"## {kind} ({len(by_kind[kind])})")
        for i in by_kind[kind]:
            print(
                f"- L{i.lesson} p{i.phrase_idx:02d} `{i.field}`: {i.detail}"
            )
        print()
    return 1


if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    sys.exit(main())
