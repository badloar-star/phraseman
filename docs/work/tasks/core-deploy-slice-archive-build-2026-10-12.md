# Task packet: утренняя выкладка — срез собирается как «архив выпуска» (PHRASEMAN_SUPPORT_RELEASE_ARCHIVE)

Governance-ID: TG-140D48AC603E
Status: Done — сборка среза rc=0 (35 с)
Owner: сессия «1 · Ядро» (координатор 12.10: «проверку сборки среза делай, только когда будет ≥4 ГБ, и один tsc на ПК»).

## Outcome
Проверка пути выкладки показала: сборка functions в срезе `git archive` падает на первом шаге —
`functions/scripts/build_support_repo_context.js`: «support lifecycle history requires a full Git checkout» (в срезе нет
.git). Скрипт поддерживает ровно этот случай: `PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1` + `PHRASEMAN_SUPPORT_RELEASE_COMMIT=<40
знаков>` (провенанс архива; в обычном checkout отклоняется). Команда утренней выкладки и проверочный скрипт получают эти
переменные; срез строится по полному id того же коммита.

## Scope
In: `docs/phraseman-2.0/DEPLOY_MORNING_2026-10-13.md` (строка команды), проверочный скрипт в scratchpad.
Out: выкладка, правка build-скриптов functions.

## Architecture
`FULL=$(git rev-parse HEAD)`; `git archive $FULL`; переменные окружения только на время `npm run build` / `firebase deploy`
(predeploy запускает ту же сборку и наследует окружение).

## Security and privacy
.env functions в проверке не копируются (сборке не нужны); в утренней команде — копируются без чтения.

## Technical debt
Проверка — только сборка; выкладку и predeploy-гейты (`functions_runtime_parity_gate`, `functions_deploy_warning`) прогонит
firebase при выкладке.

## Verification
Сборка в срезе rc=0 (tsc functions по срезу), результат — строкой «Проверено: …» в документе.

## Rollback
`git revert` документа.
