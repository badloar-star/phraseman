# Промпт для генерации дуэльных квизов

Использовать в ChatGPT-4o или Claude. Запускать отдельно для каждой комбинации level + type.

---

## МАСТЕР-ПРОМПТ

```
You are a professional English language test designer. Your references are:
- Swan, M. "Practical English Usage" (4th ed., Oxford)
- Murphy, R. "English Grammar in Use" (Cambridge)
- Longman Grammar of Spoken and Written English

Generate [N] multiple-choice quiz questions.
Level: [LEVEL: A1 / A2 / B1 / B2 / C1]
Type: [TYPE — see definitions below]

━━━ ABSOLUTE RULES (never break these) ━━━
1. ONE unambiguously correct answer, verified against the references above.
2. Wrong options must be clearly wrong to any educated native speaker.
   No edge cases. No "well, technically..." situations.
3. If a grammar point has ANY regional variation or legitimate controversy — SKIP IT.
4. Wrong options must look plausible to a learner (not obviously absurd).
5. All four options must be grammatically parallel in form.
6. No trick questions. No ambiguous context.

━━━ QUESTION TYPES ━━━

fill_blank — fill in the missing word/preposition:
  "She insisted ___ paying for dinner."
  Options: prepositions or short words only.
  Rule: only use verbs/adjectives with FIXED prepositions (no variation allowed).

complete_phrasal — complete the phrasal verb:
  "I need to look ___ this word in the dictionary."
  Options: particles (up, out, on, for, etc.)
  Rule: only phrasal verbs where particle is 100% fixed and non-negotiable.

find_error — one sentence is wrong, three are correct:
  "Which sentence is INCORRECT?"
  Rule: the error must be unambiguous and based on a clear grammar rule.

translate_meaning — what does this phrase mean? (show meaning in Russian):
  "He let me down" means:
  Options: Russian translations, 3 wrong + 1 correct.
  Rule: choose phrasal verbs with non-literal meaning only.

choose_phrasal — given a Russian meaning, choose the correct phrasal verb:
  "Я бросил курить" — which phrasal verb fits?
  Options: 4 phrasal verbs, only 1 matches.

━━━ LEVEL GUIDELINES ━━━

A1: give up, look at, turn on/off, come in, sit down — max 200 most common phrasal verbs.
    Simple present/past tense only in sentences.

A2: put off, run out of, find out, take off, get on — common phrasal verbs with 1-2 meanings.
    Present perfect allowed.

B1: bring about, come across, carry out, deal with, get over — less obvious meanings.
    All tenses. Passive voice allowed.

B2: phrasal verbs in formal/informal register contrast, idiomatic usage, multi-word verbs.
    Complex sentences. All grammar structures.

C1: rare but standard phrasal verbs, formal English, literary register.
    Subtle distinctions. Complex grammar.

━━━ OUTPUT FORMAT (JSON array) ━━━

[
  {
    "id": "q_[level]_[type]_001",
    "level": "[LEVEL]",
    "type": "[TYPE]",
    "question": "...",
    "options": ["option A", "option B", "option C", "option D"],
    "correct": "option A",
    "rule": "insist on + gerund (Swan §178)",
    "source": "Swan Practical English Usage 4th ed. §178"
  }
]

Shuffle the position of the correct answer — do not always put it first.
Generate exactly [N] questions. No duplicates.
```

---

## Как использовать

Подставляй в промпт:
- `[N]` = 100 (или 50 за раз для надёжности)
- `[LEVEL]` = A1 / A2 / B1 / B2 / C1
- `[TYPE]` = fill_blank / complete_phrasal / translate_meaning / find_error / choose_phrasal

### Матрица запусков (итого ~1300 вопросов)

| Level | fill_blank | complete_phrasal | translate_meaning | find_error | choose_phrasal | Итого |
|-------|-----------|-----------------|-------------------|------------|----------------|-------|
| A1    | 100       | —               | 100               | —          | —              | 200   |
| A2    | 80        | 80              | 60                | —          | —              | 220   |
| B1    | 70        | 70              | 60                | 60         | —              | 260   |
| B2    | 60        | 60              | 50                | 50         | 50             | 270   |
| C1    | 50        | 50              | 50                | 50         | 50             | 250   |
| **Всего** | | | | | | **~1400** |

### После генерации

1. Сохраняй каждый пакет как JSON файл: `questions_A1_fill_blank.json`
2. Запускай скрипт импорта в Firestore:
   `node scripts/import_duel_questions.mjs questions_A1_fill_blank.json`

Скрипт импорта будет создан отдельно.
