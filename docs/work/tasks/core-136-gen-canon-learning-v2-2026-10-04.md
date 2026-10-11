# Task packet: §136 — .gen единственный источник уроков 1–16; Learning V2 читает .gen; генераторы заблокированы

Governance-ID: TG-94EA8E61CB15
Status: Done
Owner: Ядро

## Outcome
По решению §136 (вариант Б): .gen — единственный источник правды уроков, правки контента прямо в .gen. Learning V2 (legacy_lesson_payload) больше не читает устаревший lesson_data_1_8_phrases_source.ts: фразы урока 1 берутся из .gen, а английские токены — из wordsEn (в .gen поле words — испанские токены L2). Генераторы tools/prompt006 и prompt007 без явного флага не запускаются (иначе затрут .gen устаревшим _source).

## Scope
modules/learning-v2/content/legacy_lesson_payload.ts, tools/prompt006_es_phrase_words.ts, tools/prompt007_es_phrase_words.ts, тест-сторож.

## Architecture
LESSON_1_PHRASES из .gen → map к английскому виду {...p, words: p.wordsEn ?? p.words}. Генератор: проверка PHRASEMAN_ALLOW_GEN_OVERWRITE=1 в начале, иначе выход с объяснением.

## Security and privacy
Без данных.

## Technical debt
_source остаётся в репозитории как исторический вход генератора (не используется приложением).

## Verification
Новый сторож (Learning V2 не импортирует _source; lesson1_phrase_15 = текст .gen; англ. токены; генераторы заблокированы), тесты learning_v2 legacy slice / smoke / runtime contract, проверка типов.

## Rollback
Откат коммита.
