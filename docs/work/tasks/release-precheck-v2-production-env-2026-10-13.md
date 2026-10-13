# Task packet: репетиция release:precheck — гейт Learning V2 видит production-переменные eas.json, как сервер сборки

Governance-ID: TG-BC1735156105
Status: In progress
Owner: Ядро (сессия 1)
Related: генеральная репетиция release:precheck (координатор 13.10, к 16.10 зелёный); план Б R1 (R1_PLAN_B_HIDE_V2.md,
R1_RUNBOOK_13_16_OCT.md §7)

## Outcome

- scripts/release_precheck.mjs: гейт «Learning V2 … (или НЕПРИМЕНИМО при плане Б)» запускался с env {} — то есть без
  `build.production.env` из eas.json. На сервере EAS `eas-build-post-install` идёт С этими переменными. Значит, когда план Б
  включат в eas.json (`PHRASEMAN_R1_HIDE_V2=1`), локальная репетиция всё равно оставалась бы красной, а сервер — зелёным:
  репетиция не повторяла сервер. Теперь гейту передаются те же production-переменные, что и гейту версий.
- .easignore: обёртка `scripts/learning_v2_plan_b_gates.mjs` (7747a43d8) не была разрешена — `scripts/*` закрыт, на сервере EAS
  `eas-build-post-install` упал бы «модуль не найден» ещё до гейтов. Добавлено `!scripts/learning_v2_plan_b_gates.mjs`.
- Сторожа цепочки сборки (learning_v2_release_parity_route, release_precheck_learning_v2_failure_classification,
  store_release_gate_levers) ждали прямой вызов гейтов №3/№4; теперь проверяют вызов обёртки и то, что обёртка без плана Б
  зовёт те же гейты. Временная копия репозитория в тесте получает и обёртку.
- Итог репетиции 13.10 — в отчёте координатору (красные пункты, зоны, оценка).

## Scope

In scope: env гейта V2 в release_precheck.mjs, .easignore, сторожа цепочки сборки. Out of scope: включение плана Б в eas.json (решение
координатора/владельца, шаг §7 ранбука), гейт визуальной сверки (зоны Сверки/Макетов/исполнителей).

## Architecture

No architecture change.

## Security and privacy

Читается только блок `build.production.env` eas.json (уже читается для гейта версий); секретов там нет.

## Technical debt

- Остальные гейты тоже запускаются без production-env; им он не нужен, поэтому не трогаем.

## Verification

node scripts/release_precheck.mjs — шапка гейта V2 печатает значение PHRASEMAN_R1_HIDE_V2 из eas.json; с временной
переменной окружения план Б даёт «НЕПРИМЕНИМО» (exit 0).

## Rollback

Откат коммита.
