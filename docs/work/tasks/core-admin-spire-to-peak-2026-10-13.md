# Task packet: «Шпиль»/«Spire» → «Пик» в админке и подсказке ИИ жалоб; награда за жалобу в подсказке — монеты (R1 §3а шаг 5а)

Governance-ID: TG-1B096875E4BF
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: E25 Пик (аудит Тем 5680a4608); координатор 13.10 «ДА, вместе с шагом 5а»; D70/D104 (монеты)

## Outcome

Владелец в админке видит «Пик» вместо «Шпиль»/«Spire» во всех видимых подписях, кнопках, подтверждениях и тостах; подсказка ИИ
для разбора жалоб называет награду монетами (300/600/1000, как `REPORT_REWARD_TIERS` v2) и «Пик». Выкладка — hosting:admin и
functions 17.10.

## Scope

In scope: `admin/v2/legacy.html` — 40 строк видимого текста (скрипт по словам, строки-комментарии и идентификаторы
`spire*`/`Spire*` в коде, id, классы, имена функций и коллекций не трогаются); `functions/src/admin_reports_center.ts`
(`reportExportInstructions`) и его тест. Out of scope: вход в админку, логика, данные.

## Architecture

No architecture change: только тексты.

## Security and privacy

Вход в админку не затронут (`scripts/guard_admin_login.mjs` — код 0). Личных данных нет.

## Technical debt

Accept: 3 упоминания «Шпиль» остались в комментариях кода админки — их владелец не видит.

## Verification

Предпросмотр всех 40 замен с падежами («Пика» после существительного); `guard_admin_login` 0; `admin_reports_center.test.ts` 18/18
(в т.ч. «нет спин/рун/жемчуг» и «нет Spire/Шпил» в подсказке).

## Rollback

`git revert` коммитов; только тексты.
