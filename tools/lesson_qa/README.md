# Проверка уроков (статика + промпты для LLM)

## Запуск

```bash
npm run lesson:qa
```

Краткая сводка по типам (без тысяч строк):

```bash
npx tsx tools/lesson_qa/run.ts --summary
```

Только **один урок** (например, 1):

```bash
npm run lesson:qa -- --lesson 1
npm run lesson:qa -- --lesson 1 --summary
```

Только просмотр без `exit 1` (пока нет критичных ERR в базе):

```bash
npx tsx tools/lesson_qa/run.ts --warn
```

## Что проверяет код (без ИИ)

| Код | Смысл |
|-----|--------|
| `empty_english`, `translation` | Пустые поля |
| `token_mismatch`, `word_align` | Слоты `words[]` vs токены фразы |
| `distractors` | Пустые/дубли/дистрактор = correct |
| `contraction` | Подозрительные пары сокращение + вспом. (эвристика) |
| `am_e` | Возможные брит. орф. в EN/RU строках (эвристика) |
| `mojibake` | `�`, типичные битые UTF-8 |
| `ru_uk_suspect` | RU ≈ UK на длинных строках |
| `distractor_weak` | Все дистракторы сильно длиннее/короче |
| `card_hole` / `card_extra` | `lessonCards` vs число фраз |
| `card_mojibake` | Битая кодировка в карточках |
| `vocab_coverage` | Леммы из фраз (кроме предлогов/артиклей) vs `lesson_words.tsx` |
| `vocab_repeat` | Повтор `en` в словаре в более позднем уроке (как у тебя в ТЗ) |
| `irreg_repeat` | Повтор **base** непр. глагола в списке урока |
| `vocab_orphan` | Ключ в `LESSON_VOCABULARIES` без урока |
| `theory_ame` | `lesson_help.tsx` — наводка на AmE (эвристика) |

**Не делается автоматически (нужен человек/LLM):** смысл переводов, ложные факты в `secret*`, педагогика дистракторов «грамматически почти ок», AmE в теории пошагово, согласованность сокращений She’s/cleaning с логикой `lesson1.tsx`, полная вычитка theory.

## Агенты (несколько чатов = несколько «ботов»)

- **Сводный порядок** — `prompts/ORCHESTRATOR.md` (как работать вместе, без дублирования).
- **Скрипт как шаг 0** — `prompts/agent_00_static.md`.
- **Новые промпты-агенты:** `agent_english_line.md`, `agent_translation_ru.md`, `agent_translation_uk.md`, `agent_prepositions.md`, `agent_vocab_dictionary.md`, `agent_terminology.md`, `agent_merger.md` плюс уже существовавшие: `cards_and_secrets.md`, `theory_ame_ru_uk.md`, `distractor_pedagogy.md`, `contractions.md`, `irregular_verb_coverage.md`.

Открой нужный `.md` в чате как инструкцию, прикрепи `@` к файлу урока / данные — **это и есть агент с ролью**.

См. каталог `prompts/`.

## Данные

- `app/lesson_data_all.ts` + сегменты `lesson_data_*.ts`
- `app/lesson_cards_data.ts`
- `app/irregular_verbs_data.ts`
- `app/lesson_words.tsx` (парсится **как текст** для `en` — React не тянем)

## Ничего не ломает

Скрипт **не** импортирует экраны, только data-модули. Не влияет на сборку приложения.
