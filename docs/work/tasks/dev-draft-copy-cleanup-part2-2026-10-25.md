# Task packet: «черновик разработчика», часть 2 — пункты 6–9, утверждены владельцем кнопками (Переводчик, координатор 25.10)

Governance-ID: TG-6C8D9E963063
Governance-ID: TG-1EFF5ECC1B6C
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Добавка к первой части (тот же сторож «нет механики/времени/жаргона»), все 9 языков, только тексты, свои хунки:
6. `app/mistake_practice_session.tsx` ~1609: «Повторим эту фразу завтра: три попытки подряд утомляют, а не учат.» → «Вернёмся к этой фразе завтра.» ×9.
7. `components/DialogVerdictScreen.tsx` ~148: «Твоих реплик: N. Ориентир: около M, но завершать можно вручную» → «Твоих реплик: N» ×9
   (файл правится другой сессией — коммит только своего хунка через `--patch`).
8. Экзамен главы: на фишках только «N вопросов» — «M минут» и «K чтобы сдать / от K верных» убраны в шторке экзамена
   (`components/learning-v2/LearningV2ChapterExamSheet.tsx`) и в карточке «Сезона» (`components/learning-v2/season/SeasonCourseConnected.tsx`,
   файл правится другой сессией — `--patch`); из `learning_v2_chapter_exam_copy.ts` убраны неиспользуемые ключи `toPass`, `minutes`.
   `tests/season_wire_contract.test.ts` — ожидание `LEARNING_V2_CHAPTER_EXAM_MINUTES_V1` в карточке заменено запретом минут на фишках.
9. `components/spire/SpireHomeTitle.tsx`: плашка «бета» снята совсем (решение D77 истекло) — показ, строка и стили.
Сторож `tests/no_dev_jargon_visible_copy_2026_10_25.test.mjs` дополнен этими файлами и проверками.

## Scope

In scope: перечисленные строки и показ. Out of scope: логика попыток практики, подсчёт реплик, время экзамена в журнале (`LEARNING_V2_CHAPTER_EXAM_MINUTES_V1`
остаётся константой для логов шторки), `SPIRE_BETA_LANGS` (константа может читаться в других местах — проверено ниже).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- `learningV2ChapterExamPassFrom` остаётся экспортом без вызовов — убрать при следующей правке файла, если никто не вернёт порог.
- Если `SPIRE_BETA_LANGS` больше нигде не читается — удалить константу в `spire_home_week.ts` отдельной правкой владельца Пика.

## Verification

Сторож (node --test), `tests/season_wire_contract.test.ts` и тесты шторки экзамена/Пика — через слот; разбор babel; `scan_untranslated_ui`.

## Rollback

`git revert <коммит>`.
