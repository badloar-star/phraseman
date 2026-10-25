# Task packet: вычитка — тосты золота Пика, 12 сцен Главной, строки Learning V2 48db88405 (Переводчик, координатор 25.10)

Governance-ID: TG-A4EF96656C7F
Governance-ID: TG-2C689EF6EB0C
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Координатор 25.10, три вычитки (правка только явного, свои хунки):
1. `app/spire/spire_gold_copy.ts` (ccd507589, черновик 8 · МОМЕНТЫ): `SPIRE_GOLD_TOAST_DAILY_CAP`, `SPIRE_GOLD_TOAST_NOT_COUNTED`.
   id «langkah» → «anak tangga» — так ступень названа во всём Пике (`spire_game_strings.step` «Anak tangga»). Остальное верно.
2. `components/home/v2/scene/home_scene_special_copy.ts` (черновик 8 · МОМЕНТЫ) — 12 сцен Главной; сверка с
   `docs/work/tasks/home-new-states-copy-2026-10-25.md` (968be05e6): род, склонение имён, формы числа, названия разделов. Файл в незакоммиченной работе у Моментов — НЕ правлю, список правок отправлен координатору/Моментам.
3. Строки Learning V2 48db88405 (examWinPassed/examWinScore/examWinAttempt, «Начнём с…», «знаешь», «Чему научишься») — 8 языков. «Попытка: …» оставлена — дословно макет exam-window-real.html. Правка: tr examWinPassed «Sınav geçildi» → «Sınavı geçtin» (на «ты», как остальной интерфейс).
Подробности правок — в отчёте координатору и в комментариях рядом со строками.

## Scope

In scope: тексты трёх файлов/коммитов. Out of scope: логика тостов, сцен и экрана экзамена.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Если Моменты держат файлы в работе — правки только своими хунками через `--patch`.

## Verification

Разбор файлов babel; `scan_untranslated_ui`; `informal_address_ru_uk_guard`; `no_dev_jargon_visible_copy_2026_10_25`.

## Rollback

`git revert <коммит>`.
