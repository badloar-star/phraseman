# Task packet: красные тесты зоны Авторизации из RED_TESTS_HEAD_2026-10-12.md

Governance-ID: TG-89D13CD74F02
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» (координатор 12.10, отчёт Ядра 392072990)
Related epic/enabler: docs/phraseman-2.0/RED_TESTS_HEAD_2026-10-12.md

## Outcome

Для каждого из 7 красных наборов (account_provision_lock_android_runtime_entrypoint ×5, account_sqlite_lease_patch_activation_v2 ×1, account_sqlite_lease_patch_v2 ×2, account_v2_client_tails_6c_v2 ×1, account_v2_tails_6d_v2 ×1, auth_provider_stable_link ×1, stable_id ×1) — решение: код сломан (чинить код) или тест устарел (править тест с пометкой, какая правка его изменила). Защита данных не ослабляется.

## Scope

In scope: тесты из списка; `app/auth_provider.ts` (только форма записи B3 в блоке свапа — без смены поведения), при необходимости — код в зоне аккаунта.
Out of scope: чужие зоны; нативные сборки.

## Architecture

No architecture change: правки тестов под текущий код либо минимальная правка кода, сохраняющая инварианты.

## Security and privacy

Сторожа защиты данных (нет запасного владельца при свапе, снятие ключа удаления только после успешного ответа, одна личность при гонке) сохраняют смысл; ни одна проверка не убирается без замены равной.

## Technical debt

Pay now: устаревшие ожидания тестов приводятся к коду с пометкой о коммите, который их изменил.

## Verification

Каждый набор точечно (`npm run test:one`, runInBand). Соседи: auth_swap_link_reuse, auth_provider_behavior.

## Rollback

Откат коммита группы.
