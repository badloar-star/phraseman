# P0 — выбор языка курса на онбординге не меняет курс: сперва логи [ONBOARD-LANG] (поручение координатора 06.11)

Governance-ID: TG-70A4E2C0BF0A
Status: Причина найдена 06.11 (журнал Сверки 12:44): app/study_target_lang_dev.ts setDevStudyTargetLang подменял es на en при английском интерфейсе; исправлено
Owner: «5 · ВХОД»

## Outcome

Подробная трассировка `[ONBOARD-LANG]` показывает всю цепочку: что нажато на экране языка, что и откуда записано (`study_target_v1`), кто его читает, какой первый язык зафиксирован при завершении онбординга и какое решение дал замок дополнительного языка (пейвол `language_add`). По журналу ставится точный диагноз, только потом правка.

## Scope

`app/study_target.ts` (запись/чтение ключа языка), `app/course_language_access.ts` (решение замка), `components/CleanOnboarding.tsx` (`chooseStudyTarget`, `ensureEnglishStudyTarget` — вход, запись, сверка после записи), тест `tests/onboard_lang_trace_2026_11_06.test.ts`.

## Architecture

Только журнал (console.log/warn), поведение не меняется. Прямое чтение хранилища после записи для сверки. Лишних записей и сетевых вызовов нет.

## Security and privacy

В журнал идут язык, ключ и решение — без идентификаторов аккаунта и почты.

## Technical debt

Фикс — после журнала с Pixel_8_fresh (plus=off, чистый новичок). Временную часть трассировки убрать после починки, логи на ранних выходах и в catch оставить.

## Verification

Тест-страж по тексту, журнал на эмуляторе.

## Rollback

Убрать добавленные console.log.
Governance-ID: TG-6688A3EEB2CE
Governance-ID: TG-C4396CD4463A
Governance-ID: TG-59203EA73920
