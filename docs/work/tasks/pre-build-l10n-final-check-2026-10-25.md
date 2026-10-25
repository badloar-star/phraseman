# Task packet: последняя проверка переводов перед сборкой 25.10 (Переводчик, координатор, до 09:00)

Governance-ID: TG-33DD70125806
Status: Done — чисто
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

На HEAD: (1) недостающие ключи, пустые строки, расхождение подстановок (`{n}`, `{name}`…) между en и 8 языками; (2) отдельно строки
за последние сутки — тост `coins_saving`, «Нет связи», `busy`, `failedOne`, «Что нового», плашка ранга «Не хватает N монет».
Чинить только явные дыры (пропуск, сломанная подстановка, английский в чужом языке); стиль не трогать; зоны Codex (уроки 23–27,
`content/learning-v2-course/**`, `modules/learning-v2/content/**`) не трогать. Итог — хеш или «чисто».

## Scope

In scope: кортежи 9 языков и объекты {ru, uk, en, es, 'pt-BR', vi, id, tr, pl} в `app`, `components`, `constants`, `hooks`, `modules`
(кроме зон Codex). Out of scope: стиль, длина.

## Architecture

No architecture change. Проверка — одноразовый скрипт в Temp (разбор TypeScript), не новый сторож.

## Security and privacy

Не применимо.

## Technical debt

- Скрипт не превращается в сторож pre-commit — нет времени до сборки; если найдёт дыры, предложу сторожа после релиза.

## Verification

3 сканера локалей (`scan_untranslated_ui`, `scan_missing_en_dictionaries`, `scan_direct_lang_index`) + скрипт подстановок/пустых.

## Rollback

`git revert <коммит>` (если будут правки).

## Итог 25.10 — ЧИСТО, правок нет

- Сканеры: `scan_untranslated_ui` 0 как в базе, `scan_missing_en_dictionaries` 0, `scan_direct_lang_index` OK, `informal_address_ru_uk_guard` 5/5.
- Скрипт по 362 кортежам и 5390 объектам (2735 файлов): пустых строк при непустом эталоне — 0; расхождений подстановок — 1, и оно
  намеренное: `story_strings.rankPaid` tr «{price} jetona satın alındı» без `{pw}` (в турецком после числа единственное число, «jetona» верно
  при любой цене).
- «ru = en»: `phrase_analytics` «There is / There are» — название конструкции, так и задумано; `app/pos_workout_engine.ts` — ru/uk профилей
  тренажёра (Syntax, Modifiers, Determiners, There is/are) английские, НО на экран не попадают: `getPosWorkoutProfile` и соседние
  экспорты не вызывает ни один файл, наружу идёт только `getPosMasterySnapshot` (числа). Не дыра релиза; перевести — после релиза.
- «Нет языков» (200+): давние частичные словари данных (карточки `system-cards`, сообщения админки `app_messages` и т. п.) — не новое, вне задачи.
- Строки суток: `coins_saving` (9cc17d13d), «Нет связи» (a2a3505ef), `busy`/`failedOne` (eed18ada2), «Что нового» C (e3d7630de, ≤ 457/500),
  плашка ранга «Не хватает N монет» (`coin_rank.shortTitle` + `missingCoinsWord` — формы на 9 языках) — все подстановки и формы на месте.
