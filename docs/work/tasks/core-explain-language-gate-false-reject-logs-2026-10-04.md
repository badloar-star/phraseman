# Task packet: explainMistake — проверка языка бракует правильные русские объяснения (503) — сперва логи

Governance-ID: TG-94EA8E61CB15
Status: Logs (шаг 1) — выкладку explainMistake делает координатор
Owner: Ядро; найдено по логам [EXPLAIN-MISTAKE] после выкладки 649b06e2d

## Outcome
08:20–09:30Z: 10 вызовов, 4×200, 6×503. Все 503 — три отказа валидатора подряд с `mistake_explain_wrong_language` при interfaceLang=ru, а ответы модели по REST-журналу — нормальный русский («Ты перепутал "jury" и "judge"…»). Значит, `rejectGeneratedLanguageText` даёт ложный отказ, но причина (mojibake / доля чужого алфавита / английские стоп-слова), раздел (full/eli5) и слова, которые её решили, не логируются: `assertAiOutputLanguage` выбрасывает только общий код. Без этого чинить правило вслепую.

## Scope
functions/src/mistake_explain.ts — `assertMistakeGeneratedText` перед броском пишет [EXPLAIN-LANG] reject: section, reason гейта, доля чужого алфавита, число латинских слов вне кавычек и до 12 таких слов (без остального текста ответа).
functions/src/ai_language_gate.ts — экспорт функции диагностики (без изменения правил).

## Architecture
Поведение не меняется. Правило гейта поменяем по фактам из лога (вероятно: английские примеры без кавычек / в «ёлочках» с кириллицей, или *курсив*).

## Security and privacy
В лог попадают только латинские слова-примеры из объяснения (учебный контент), без ответа ученика и без идентификаторов.

## Technical debt
После диагноза — правка правила гейта и тест на реальные русские объяснения.

## Verification
tsc functions; тесты mistake_explain и ai_language_gate.

## Rollback
Откат коммита.
