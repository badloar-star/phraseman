# Task packet: заставка Plus — вставить правки «Переводчика» в тексты и довести коммиты после перезапуска

Governance-ID: TG-8E939AB67B27
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: основной пакет `plus-launch-splash-2026-10-21.md` (TG-80529DEFA507), сверка текстов «Переводчика» `plus-splash-copy-review-2026-10-21.md`, перезапуск сессий после падения ПК (координатор 21.10)

## Outcome

В `components/plus-splash/plus_splash_copy.ts` вставлены правки «Переводчика»: «стоп» и «счётчик» заменены естественными формулировками (en/es/pt/vi/id/tr/pl), русский и украинский не тронуты. Затем после проверок коммитятся заставка Plus, превью Пика и общая шапка V2 (по очереди слота).

## Scope

In scope: только строки текстов в `components/plus-splash/plus_splash_copy.ts` и коммиты ранее написанного кода заставки Plus, превью Пика (`step_build_filled`, `step_build_wrong`) и общей шапки V2.

Out of scope: логика заставки, вёрстка, подключение шапки в плеер (ждёт коммита Learning V2), остальные поручения очереди.

## Architecture

No architecture change: меняются только значения строк в таблице текстов; структура ключей и порядок языков (ru, uk, en, es, pt-BR, vi, id, tr, pl) прежние.

## Security and privacy

Только тексты, данные не затрагиваются. Privacy Policy не затрагивается.

## Technical debt

Pay now: тесты полноты (9 языков, не пустые) уже есть в `plus_splash_state_offer.test.ts` и ловят пропуск строки. Остальных долгов нет.

## Verification

`tests/plus_splash_state_offer.test.ts` (полнота 9 языков), общий прогон `tsc` и наборов под светофором, проверка синтаксиса файла.

## Rollback

Откат коммита возвращает прежние строки; данные пользователя не затрагиваются.
