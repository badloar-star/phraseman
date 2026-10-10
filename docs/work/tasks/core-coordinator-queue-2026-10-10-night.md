# Task packet: Ядро — очередь координатора 10.10 (ночь): контент урока 9, ворота no_release_surface, ТЗ очистки гостей

Governance-ID: TG-AF94830E945A
Status: In progress
Owner: сессия 1 · ЯДРО

## Outcome

1. «Две поломки контента» (запрос координатора 23:05) разобраны по фактам:
   - lesson_phrases_regression: «?» — не перевод, а плитка знака вопроса в английской сборке, добавленная сознательно
     коммитом 15e14f408 (04.10, «question mark token»). Сторож обновлён под это.
   - lesson_intro_final_check_catalog: сторож «красный по плану» для функции, которой нет (shared/lesson_intro_final_checks.ts
     не существовал ни в одной ветке) — снят в 7c1310250. Это не поломка контента.
2. Статус no_release_surface в scripts/visual_parity_gate.mjs со строгой проверкой доказательства + тест.
3. ТЗ серверной очистки гостей (после релиза) + сверка обещания в политике.
4. Входы в Learning V2 в стор-сборке (запрос 21:05): внешняя ссылка phraseman://learning-v2/... в стор-сборке ведёт
   на обычные уроки, а не на «маршрут не найден» (app/+native-intent.tsx + тест). Красные ворота release_precheck — отчётом.

## Scope

tests/lesson_phrases_regression.test.ts; app/+native-intent.tsx; tests/native_intent_referral.test.ts; scripts/visual_parity_gate.mjs; tests/visual_parity_gate.test.mjs;
docs/work/tasks/guest-retention-cleanup-spec-2026-10-10.md; INBOX_COORDINATOR_FROM_CORE.md (строка).
Реестр docs/phraseman-2.0/evidence/parity/visual_parity.json и статусы строк НЕ трогаю (решение координатора).

## Architecture

Ворота читают app/router.ctx.js (регулярка стор-режима) и проверяют доказательство строки: маршрут вырезан ЛИБО
есть флаг + тест-сторож. Без доказательства строка — нарушение.

## Security and privacy

Ворота — офлайн-скрипт. ТЗ очистки гостей касается удаления данных — только документ, без кода и без прод-записей.

## Technical debt

Доказательство «за выключенным флагом» проверяется по наличию файла теста-сторожа и упоминанию флага в нём —
не исполнением теста; исполнение остаётся за юнит-раннером.

## Verification

node --test tests/visual_parity_gate.test.mjs; прогон lesson_phrases_regression.

## Rollback

git revert коммитов.
