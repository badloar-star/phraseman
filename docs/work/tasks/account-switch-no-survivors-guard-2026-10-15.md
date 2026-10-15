# Сторож «после выхода ничего от аккаунта A не выживает» (ACC-SWITCH, 15.10)

Governance-ID: TG-823F36650FD8

## Outcome
Новый тест `tests/account_switch_no_survivors.test.ts` кладёт в хранилище все ключи из таблицы `docs/phraseman-2.0/handoff/LOGOUT_WIPE_AUDIT_2026-10-15.md` как данные аккаунта A, зовёт настоящее стирание `wipeLocalAccountData()` из `app/cloud_sync.ts` и требует пустой список выживших (кроме KEEP устройства и намеренно сохраняемого). На текущем коде тест красный — до патча Ядра ACC-SWITCH он помечен `it.skip` с причиной и списком выживших; включается переменной `ACC_SWITCH_NO_SURVIVORS=1`.

## Scope
Только новый тест и этот пакет. Файлы Ядра (`cloud_sync.ts`, `auth_provider.ts`, модули кэшей) не трогаю. Модульные кэши в памяти — отдельный блок `it.todo` до согласования имён с Ядром.

## Architecture
Лёгкая обвязка как в `tests/flashcard_pages_fingerprint_wipe.test.ts`: in-memory AsyncStorage, заглушка `user_id_policy`, настоящие `account_generation` и `wipeLocalAccountData`. Выжившие = все ключи после стирания минус KEEP (`app_theme`, `app_font_size`, `haptics_tap`, журналы смены аккаунта), аварийная копия `account_switch_emergency_backup_*` (решение владельца — отдельный вопрос) и `study_target_v1` (вопрос «так задумано?»).

## Security and privacy
Тест защищает приватность: данные аккаунта A (серия, диалоги, бан, заморозки) не должны попасть к B на общем телефоне. В тесте только синтетические значения.

## Technical debt
Push-токен и кэш Firestore SDK (пункт 4 аудита) статически не проверяются; нужен отдельный сторож после патча Ядра.

## Verification
`ACC_SWITCH_NO_SURVIVORS=1 npm run test:one -- tests/account_switch_no_survivors.test.ts` — красный с перечнем выживших до патча, зелёный после.

## Rollback
Удалить тест.
