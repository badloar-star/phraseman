# Task packet: пачка Ядра 13.10 11:10 — тест слов урока, 3 ошибки типов, строка опроса на uk, 2 красных теста, план Б (скрыть V2)

Governance-ID: TG-5091C6961AB5
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 ~11:10 (п.5, (а), (б), красные от Дизайна, план Б владельца 11:00)

## Outcome

- tests/lesson_words_bank_regression.test.ts снова запускается: заглушка modules/lesson_first_frame (цепочка шлюза урока после d425ffa08).
- Ошибки типов без изменения поведения: app/community_packs/communityFirestore.ts:295 (TS2352), app/daily_phrase_target_gate.ts:221
  (TS7053), app/video_phrase_set_packs.ts:245 (TS18048 — проверить реальный краш при пустом каталоге; если он возможен —
  ранний выход с логом).
- Строка опроса в «Сегодня»: откуда клиент берёт текст (язык интерфейса / запасной ru / кэш опроса и его срок). Сперва логи
  [SURVEY-ROW]; дефект — чинить; нет дефекта — Сверка переснимает на uk.
- Красные manage_subscription_overlays_liquid_glass (3) и flashcards_speaking_liquid_glass — определить владельца, свои починить.
- docs/phraseman-2.0/R1_PLAN_B_HIDE_V2.md — какой флаг прячет вход в V2, как release:precheck считает гейты №3/№4 в этом режиме,
  команды, проверка, откат. НЕ применять.

## Scope

In scope: перечисленные тесты и файлы Ядра/Карточек, клиент строки опроса, документ плана Б.
Out of scope: код Codex (Learning V2), включение плана Б, правка DEV_LINKS руками.

## Architecture

No architecture change.

## Security and privacy

Логи [SURVEY-ROW] — только язык, источник, поле, id опроса; без uid и ответов.

## Technical debt

- Если precheck не умеет «неприменимо» для гейтов — описать в документе, какой флаг ему добавить, и сделать отдельной правкой
  после решения координатора.

## Verification

Точечные тесты через светофор; babel-проверка; точечная проверка типов по файлам при наличии памяти.

## Rollback

Откат коммитов; план Б — только документ.
