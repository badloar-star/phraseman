# Task packet: сценарный тест «выход → вход другим аккаунтом → вход тем же» на потерю монет и прогресса

Governance-ID: TG-68B63F48AABB
Status: Planned
Owner: сессия «Авторизация», исполнитель Opus
Related: очередь координатора 02:25 п.5; аудит §AA-45a (по коду, без теста)

## Outcome
Один поведенческий тест-сценарий доказывает (или опровергает фактом), что при штатной смене аккаунта с сетью:
- А (с прогрессом: уроки, серия, карточки, «Мои ошибки», имя, Plus, монеты/кошелёк, ранг монеты, визитка «Про», карта Learning V2) → выход → вход Б → у Б нет ничего от А (изоляция);
- → выход → вход А на ТОМ ЖЕ телефоне → у А всё на месте: что из облака (SYNC_KEYS), что из аварийной копии, что из локальных ключей по отпечатку аккаунта.
Каждая потеря — отдельной строкой с ключом и причиной. Известная потеря (`coin_rank_v1:`, `profile_card_pro_v1:` — стираются, в облако не ходят, полоса Ядра) фиксируется как ОЖИДАЕМЫЙ провал с `test.failing`/`it.todo`-пометкой и ссылкой, а не прячется.

## Scope
In: новый `tests/aa_account_switch_roundtrip_scenario.test.ts` (моки облака как в существующих наборах: `account_switch_backup_restore`, `auth_provider_behavior`, `aa_s2c_logout_wipe_trace`). Чтение `app/auth_provider.ts` (`signOutAndWipeForAccountSwitch`), `app/cloud_sync.ts` (SYNC_KEYS, `collectAccountLocalDataKeys`, `forceSyncToCloud`, `restoreFromCloud`), `app/account_switch_backup_restore.ts`, `app/local_account_data.ts`.
Out: правки кода приложения (только тест; находки — описать); сервер; `cloud_sync.ts`/`settings.tsx` (чужие).

## Architecture
Без изменения архитектуры. Тест на моках облака (in-memory Firestore-подобное хранилище по uid), реальный код смены/стирания/восстановления.

## Security and privacy
Нет новых данных. Тест подтверждает, что данные А не видны Б (изоляция между аккаунтами на одном телефоне).

## Technical debt
Contain: известная потеря ранга/визитки закреплена тестом-ожиданием; выход — исправление Ядром (ключи в облако), после чего ожидание переключить на обычную проверку.

## Verification
`npm run test:one -- tests/aa_account_switch_roundtrip_scenario.test.ts` (по одному, со слотом, свободно ≥2 ГБ) + соседние `account_switch_backup_restore`, `aa_s2c_logout_wipe_trace`. Ревью до APPROVE. Итог — таблица «ключ → после Б → после возврата А → источник».

## Rollback
Только тест; `git revert`.
