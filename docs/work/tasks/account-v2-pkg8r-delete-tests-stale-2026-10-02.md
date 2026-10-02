# Task packet: Account V2 — Пакет 8R: два красных теста удаления аккаунта

Governance-ID: TG-E0A31A4A2F66
Status: In progress
Owner: Claude session (Account V2); поручение координатора (после 8O)

## Outcome

1. `tests/post_delete_fresh_identity_integration.test.ts` 3/15 FAIL: все три ждут журнал вызовов без `emit:account_deleted` первым. В `app/account_delete_quarantine.ts` `runPostDeleteFreshIdentityTransition` при возобновлении с фазы ≠ `prepared` НАМЕРЕННО повторно шлёт `emitLocalWipeReady` (комментарий в коде: идемпотентно для корневого навигатора, чтобы маршрут удалённого аккаунта не застрял после краша/перезагрузки; пришло в f5a01076d). Законный сдвиг → обновить ожидания с `// зачем:`, сохранив проверки (нет очистки stable identity при сбое выхода, нет свежей личности при сбое SecureStore, усыновление канонического id).
2. `tests/account_delete_flow_contract.test.ts` 1/22 FAIL: «includes every durable auth merge and account deletion endpoint in deploy:safe» — `deploySafe` = null (скрипт deploy:safe в package.json не найден/переименован?). Выяснить: если скрипт законно переименован/перенесён — обновить сторож под новое место с `// зачем:`; если список функций реально выпал из безопасного деплоя — это регрессия: описать и предложить правку package.json координатору (деплой-скрипты — его зона).

## Scope

Только два теста (и, при регрессии, — отчёт, не правка package.json без согласия координатора).

## Architecture

Без изменений кода.

## Security and privacy

Без изменений.

## Technical debt

Нет новых.

## Verification

Оба теста по одному через `npm run test:one` → PASS; мутация: убрать повторный emit в коде → тест ловит (или явная проверка, что emit идёт первым при возобновлении).

## Rollback

git revert.

## Итог (2026-10-02, сессия Account V2 сама; ревью APPROVE)
- post_delete_fresh_identity_integration: 3 ожидания дополнены первым `emit:account_deleted` (намеренный повторный сигнал при возобновлении, account_delete_quarantine.ts:677) → 15/15. Мутация «убрать повторный сигнал» → 7 FAIL, файл восстановлен (`cmp`).
- account_delete_flow_contract: `deploy:safe` удалён в efe19ae9d (D140); сторож переписан — основной `deploy` = `--only functions` (все экспорты) + шесть функций слияния/удаления экспортированы в index.ts → 22/22. Регрессии нет.
