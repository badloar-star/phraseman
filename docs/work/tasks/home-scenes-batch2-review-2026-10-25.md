# Task packet: вычитка строк сцен Главной, пачка 2 (3a42a7e8f) — 9 языков (Переводчик, координатор 25.10)

Governance-ID: TG-56E4DAB56968
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`components/home/v2/scene/home_scene_special_copy.ts` (Моменты, пачки 1–2) вычитан на 9 языков; правка только явного:
- названия разделов как в остальном приложении: «Фраза дня» (uk «Вислів дня», vi «Cụm từ hôm nay», pl «Fraza dnia» — как
  карточка фразы дня), «Карточки» (vi «Thẻ học», pl «Karty»), Пик (es «Pico», кнопка en «To Peak», uk «До Піку», pl «Do Szczytu»);
- pl «Przerób/przerobić» → «Przejrzyj/przejrzeć» (разбор ошибок, а не «переделка»); pt-BR «Passaram você» → «Passaram na sua frente»;
  tr «bugün çoktan çalıştı» → «bugün zaten çalıştı»;
- новогодний заголовок обрывался («Один урок в честь») — заменён на утверждённые строки `home-new-states-copy-2026-10-25.md`
  (968be05e6): «Новый год — новые фразы» ×9;
- кавычки вокруг фразы из журнала ошибок — по языку: «…» ru/uk/es, „…“ pl, “…” остальные (раньше «…» во всех).

## Scope

In scope: тексты одного файла и функция кавычек в нём. Out of scope: логика выбора сцен, строки логов.

## Architecture

No architecture change: локальный помощник `quoted(l, s)` в том же файле вместо литерала шаблона.

## Security and privacy

Не применимо.

## Technical debt

- Файл ведут Моменты; если появятся их незакоммиченные правки — коммит только своими хунками через `--patch`.

## Verification

Разбор файла babel; `tests/home_scene_special.test.ts`, `tests/home_scene_special_wiring.test.ts` через слот; `scan_untranslated_ui`.

## Rollback

`git revert <коммит>`.
