# Task packet: выход/смена — стереть «поздравление показано», сохранить профили языков, вход со сменой без онбординга

Governance-ID: TG-4A259FAAD5ED
Status: В работе (координатор 18.10 03:42)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

1. Отметки «поздравление Plus/VIP уже показано» (premium_celebration_seen_v1, premium_celebration_admin_seen_v1,
   vip_celebration_seen_v1) — данные аккаунта: стираются при выходе, смене и удалении, но не при перезапуске. Новый
   аккаунт после смены видит своё поздравление даже при более ранней метке выдачи. Тот же владелец получает их назад из
   аварийной копии (повторного поздравления у вернувшегося нет).
2. Профили языков (languageProfileKey × 5) при выходе/смене сохраняются, как выбранные языки.
3. Вход со сменой аккаунта (swap/merge в auth_provider) не повторяет онбординг — тот же режим 'signout'.

## Scope

- app/account_switch_leak_keys.ts: ACCOUNT_SWITCH_CELEBRATION_SEEN_KEYS в ACCOUNT_SWITCH_LEAK_KEYS (стирание + копия
  того же владельца).
- app/cloud_sync.ts: SIGNOUT_DEVICE_KEEP_KEYS += languageProfileKey(…); лог [ACCOUNT-WIPE] + wipedCelebrationSeen
  (имена, что были на диске).
- app/auth_provider.ts: wipeLocalAccountData(transitionLease, { mode: 'signout' }) в ветках swap и merge входа.
- tests/account_switch_no_survivors.test.ts: отметки — из «разрешено выжить» в ключи аккаунта A; профили языков в
  проверке выхода; новый тест «новый аккаунт после смены видит своё поздравление».

## Architecture

Без нового механизма: список утечек уже стирается при выходе/смене и возвращается тому же владельцу из копии.

## Security and privacy

Метки выдачи Plus/VIP прошлого аккаунта больше не влияют на следующего человека на телефоне.

## Technical debt

На ДРУГОМ телефоне (копии нет) вход в VIP-аккаунт поднимет поздравление по старой выдаче — так было и раньше
(отметки не синхронизируются).

## Verification

tests/account_switch_no_survivors.test.ts, tests/account_switch_backup_restore.test.ts, тесты поздравлений
(premium/vip celebration), tests/auth_provider_behavior.test.ts, aa_account_switch_roundtrip_scenario.

## Rollback

Обратный собственный патч.

## Красные тесты полного прогона на HEAD (координатор 03:50) — сначала они

| Тест | Причина | Что делаю |
|---|---|---|
| account_authority_legacy_callsite_guard | мои 077deccd0 (+1 isForceGenerationCurrent — перепроверка поколения перед пропуском записи) и 89da06443 (+1 wipeLocalAccountDataUnsafe — вызов в обёртке режима вместо ссылки) | перепин с причиной |
| cloud_sync_account_race_contract (2) | мои: строка замка стирания (89da06443) и запись снимка через writeLastSyncSnapshot (077deccd0) | обновляю строки, смысл тот же |
| startup_settings_writer_boundaries | мой multiSet снимка+владельца (077deccd0) вне границы finishSettingsMutation | чиню код: remove → set → set без multiSet |
| accounts_v2_legacy_sync_switch | ищет старую запись снимка (077deccd0) | обновляю строку |
| account_details_identity_actions_contract | подпись строки выхода меняется на «Сохраняем прогресс…» (723613818) | обновляю строку |
| auth_provider_stable_link | уточняю прогоном | — |
| source_guard_eol_normalized_contract | НЕ мой: tests/learning_v2_plan_b_gates.test.mjs (05cf3a61b) и tests/lessons_coin_balance_kept_contract.test.mjs (838313d27) | координатору |
