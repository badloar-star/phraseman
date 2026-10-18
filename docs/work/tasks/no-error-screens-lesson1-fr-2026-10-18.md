# Task packet: без экранов-ошибок — французский урок 1 (lesson1.tsx 4096/4128)

Governance-ID: TG-FBBFCF82C310
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: правило владельца «экранов-ошибок нигде» (18.10 07:45); координатор 08:11 — «lesson1 fr (4096/4128) — тоже твои»; продолжение docs/work/tasks/no-error-screens-learning-2026-10-18.md.

## Outcome

Ученик французского урока 1 не видит «Не удалось загрузить французский урок» и «Французский пакет не загружен».

Вместо этого — тихий уход к списку уроков и строка журнала `[NO-ERROR-SCREEN] screen=lesson1 reason=french_remote_failed|french_pack_blocked`.

## Scope

В работе:
- app/lesson1.tsx — две ветки рендера и один вызов useSilentLeave.

Вне работы:
- загрузка французского урока (скелетон пока `pending` не меняется);
- английский урок;
- замки.

## Architecture

Архитектура не меняется. Решение «урок не пришёл / пакет закрыт» остаётся прежним (`frenchLessonRemoteFailed`, `frenchLessonSourceGateBlocked`). Меняется только то, что рисуется: пустой фон урока и однократный `safeRouterBack` к `/lessons_list` после первого кадра.

## Security and privacy

Не затрагивает. В журнал идёт только номер урока и код причины.

## Technical debt

Pay now: два экрана-ошибки убраны. Тексты остаются в коде, пока их ждут тесты; ущерб нулевой.

## Verification

- Babel-парс app/lesson1.tsx.
- Адресный тест, через slot.sh run: сторожа lesson1 fr, если есть.

## Rollback

Ревертнуть коммит задачи.
