# Task packet: чек-лист «15.10 12:00» — точная правка eas.json для плана Б и проверка [V2-ROUTE] только на release-сборке

Governance-ID: TG-E4E70F69FEAC
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 ~12:25 (репетиция Авторизации: в eas.json нет PHRASEMAN_R1_HIDE_V2 → EAS упадёт на post-install)

## Outcome

docs/phraseman-2.0/R1_RUNBOOK_13_16_OCT.md § 7: шаг «при плане Б добавить PHRASEMAN_R1_HIDE_V2=1 в build.production.env eas.json» —
точный было/стало, команда проверки, откат; проверка [V2-ROUTE] — только на release-сборке (на dev-эмуляторе V2 открывается
из-за ENABLE_DEV_TOOLS). eas.json сейчас НЕ меняется.

## Scope

In scope: только раздел 7 ранбука. Out of scope: eas.json, код.

## Architecture

No architecture change.

## Security and privacy

Нет.

## Technical debt

- Переменная окружения EAS в профиле production видна и в хуке eas-build-post-install — проверить на первой сборке по журналу
  [V2-PLAN-B] в логе EAS.

## Verification

Текст правки совпадает с текущим блоком build.production.env в eas.json (прочитан 13.10 ~12:25).

## Rollback

Откат коммита документа.
