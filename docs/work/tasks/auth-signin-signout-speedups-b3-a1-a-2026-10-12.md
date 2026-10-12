# Task packet: ускорения входа/выхода B3 → A1 → (а) и этапный индикатор «Выходим из аккаунта»

Governance-ID: TG-324C17B907FB
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ»; решение — советник координатора (Opus), реестр п.73 (93b812b85), разбор §AUTH-0070
Related epic/enabler: evidence/parity/AUTH_signout_stream_2026-10-12.log; feb795abc (вариант Б)

## Outcome

1. **B3** — при входе в существующий аккаунт свап не перечитывает привязку вторым callable (−~3,7 с), ТОЛЬКО если одновременно: слияние не вызывалось; `ensure_link remote` этого входа вернул ok; источник `callable`; `stableUid === remoteStableId`; текущий uid Firebase === `authUid` ответа. Иначе — перечтение как сейчас. Строка `swap stage authoritative_link_reused {source, ageMs}`, при отказе — `swap authoritative_link_reread {reason}`.
2. **A1** — при выходе с `allowWipeWithoutSync=true` и `synced=false` первая аварийная копия не делается (−~1,6 с); вторая копия под замком обязательна, её сбой → `ok:false` без стирания и без маркера. Путь `allowPendingShardSpendDiscard` не трогается. Строка `emergency_backup_skipped {reason:'final_snapshot_under_lock'}`.
3. **(а)** — смена аккаунта из онбординга: потолок синхронизации 3 с ВМЕСТЕ с `allowWipeWithoutSync: true` (`app/onboarding_account_switch_confirm.ts`).
4. Этапный индикатор «Выходим из аккаунта», если укладывается в файлы Авторизации.

Каждое — отдельный коммит, затем повтор Сверки (вход в №2 выбором аккаунта, выход).

## Scope

In scope: `app/auth_provider.ts`, новый чистый модуль `app/auth_swap_link_reuse.ts`, `app/onboarding_account_switch_confirm.ts`, `components/account/AccountLogoutFlow.tsx` (индикатор), тесты `tests/auth_swap_link_reuse.test.ts`, `tests/auth_provider_behavior.test.ts`, `tests/account_modals_liquid_glass_source_contract.test.mjs`.
Out of scope (НЕТ до выпуска): B2, A3, A2. B1 — сессия «4 · Темы», `app/(tabs)/_layout.tsx` не трогать.

## Architecture

Без смены границ. B3 — решение вынесено в чистую функцию (вход: факты ответа и текущий uid; выход: reuse/причина). A1 — условие вокруг существующей первой копии; вторая копия под замком и её отказ уже существуют. (а) — те же опции, что у выхода.

## Security and privacy

B3 ослабляет повторную проверку только при пяти условиях, гарантирующих, что привязка получена этим же входом от сервера (не кэш) для того же Firebase-пользователя — защита от записи в чужой аккаунт сохраняется. A1: аварийная копия всё равно пишется под замком; без неё стирания нет. (а): аварийная копия на телефоне пишется до стирания. В логах — только метки (`identityTag`) и длительности.

## Technical debt

Contain: строки reuse/reread и skipped остаются навсегда (ранние выходы). Тесты фиксируют условия.

## Verification

`tests/auth_swap_link_reuse.test.ts` (слияние было → перечтение; кэш → перечтение; свежий callable → без перечтения; несовпадение uid/stable → перечтение), `tests/auth_provider_behavior.test.ts` (A1: вторая копия обязательна, её сбой → без стирания и маркера; путь discard не тронут), `tests/aa_auth_double_tap_contract.test.ts`, onboarding switch тесты. Сверка: вход в №2 и выход — строки `[AUTH-LINK-GOOGLE] swap …`, `[ACC-SIGNOUT] …`.

## Rollback

Каждое ускорение — отдельный коммит, откат по одному без потери данных (поведение возвращается к прежнему, более медленному).
