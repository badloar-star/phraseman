# Task packet: A11 — вход в навсегда удалённый аккаунт заканчивается свежим профилем, а не ошибкой

Governance-ID: TG-5D1446ADBD02
Status: В работе — шаг 1 (логи и диагноз)
Owner: 5 · ВХОД И АККАУНТ (цели правила «только успех», владелец 18.10; матрица 08c1e7cd9 строка A11, раздел D4)

## Outcome

Правило владельца 18.10 дословно: «Любой сценарий с входом или выходом с ошибкой недопустим». Строка A11: вход тем же
Google/Apple в аккаунт, удалённый навсегда (> 14 дней), должен дать чистый новый профиль. Сейчас при
ensureStableAuthLinkForStableIdDetailed → { failure: 'identity_retired', retiredSubject: 'auth' } signInWithProvider может
вернуть `{ result: 'error', error: 'identity_retired' }`; шторка входа уже закрывается тихо ([AUTH-RETIRED]).

## Scope

- Шаг 1: приёмочный тест 9 · САЙТА (tests/auth_only_success_targets_1018.test.ts, блок A11) прогоняется как есть — факт,
  какая ветка app/auth_provider.ts отвечает и почему. Без правок, пока нет диагноза.
- Шаг 2 (после диагноза): ветка identity_retired с subject ≠ stable доводит вход свежим профилем
  (auth_signin_identity_retired_recovered → created_new), журнал [AUTH-RETIRED] на каждой развилке.

## Architecture

Свежий профиль = новый stable id для этого провайдера; старые данные удалённого аккаунта не возвращаются (удаление
окончательное). Ветка subject = stable (удалён сам телефонный профиль) не меняется.

## Security and privacy

Удалённые навсегда данные не восстанавливаются и не читаются. Новых данных не собираем.

## Technical debt

Прогон на эмуляторе невозможен (нужен аккаунт, удалённый > 14 дней назад) — только тесты.

## Verification

Блок A11 приёмочного теста + auth_provider_behavior (ветки identity_retired) через светофор.

## Rollback

`git revert <hash>`.
