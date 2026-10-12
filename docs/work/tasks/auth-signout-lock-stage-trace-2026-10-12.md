# Task packet: выход 9,7 с — разбор замка и «возобновления карантина», этапные логи внутри замка

Governance-ID: TG-B6503B17B8A0
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» по заданию координатора (12.10)
Related epic/enabler: evidence/parity/AUTH_signout_after_fix_2026-10-12.txt, AUTH_signout_stream_2026-10-12.log; feb795abc (вариант Б)

## Outcome

Ответ координатору по строкам: что такое `quarantine_resume` при выходе, кто держит «lock_wait» ~1,5 с, откуда ~1,6 с между `force_sync_done` и `lock_wait_start`; предложения, как дойти до 2–5 с. В код — только этапные строки `[ACC-SIGNOUT] stage …` внутри замка перехода (`lock_acquired`, `shard_queue_read`, `final_snapshot_done`, `marker_done`, `entitlement_transition_done`) и после первой аварийной копии (`emergency_backup_done`), чтобы следующий прогон разложил время без догадок.

## Scope

In scope: `app/auth_provider.ts`, функция `signOutAndWipeForAccountSwitch` — только вызовы `signoutStage`.
Out of scope: изменение порядка выхода, отказ от любой из аварийных копий, перенос создания гостя после перехода — это предложения, ждут решения координатора.

## Architecture

No architecture change: добавляются строки трассировки между существующими шагами.

## Security and privacy

В строки идут только длительности и флаги; без uid, имён и данных.

## Technical debt

Contain: этапные строки остаются (правило «сперва логи» — ранние выходы и этапы держим навсегда).

## Verification

`tests/auth_provider_behavior.test.ts`, `tests/aa_auth_double_tap_contract.test.ts` — точечно со слотом. Прогон Сверки: один выход, строки `[ACC-SIGNOUT]`.

## Rollback

Откат коммита.
