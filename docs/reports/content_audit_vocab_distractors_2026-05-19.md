# Аудит словаря + дистракторов (2026-05-19)

Запуск: `node scripts/audit_vocab_and_distractors.mjs`

## Сводка по типам

**Всего замечаний:** 0

## Как читать `D_FP_CROSS_CLASS`

Один отпечаток набора distractors встречается у слотов с разными типами правильного слова (предлог vs местоимение, отрицание vs обычное слово и т.д.). Часть строк — следствие того, что в данных один и тот же пул дистракторов намеренно повторяют для разных форм (*are*/*is*). Строки с явным смешением (**prep** + **pronoun**, **prep** + **neg**) стоит проверять в первую очередь.

## Другие аудиты в репозитории

- `npm run audit:pre-release` — TypeScript + строгие lesson-аудиты + POS coverage + переводы.
- `npm run audit:lessons` — актуальная строгая проверка уроков 1-32: фразы, словари, предлоги, drill, intro, correct-options, POS coverage.
- `npm run audit:pos` — strict POS coverage: 0 unresolved/unknown/low-confidence lesson tokens.
- `npm run audit:translations` — эвристики по переводам фраз (`scripts/audit_translations_1_32.mjs`).
- `npm run audit:correct-presence` — слоты фраз vs токены `getPhraseWords`, дубликат correct в distractors (`scripts/audit_correct_word_presence.ts`).
- `node tools/audit/audit_lessons_1_32.mjs` — словарь vs фразы, дубликаты.
- `node scripts/audit_fake_distractors.mjs` — не-словарные англ. distractors (пакет `an-array-of-english-words` в devDependencies).

## Детали (до 400 строк)