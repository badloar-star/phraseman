# Task packet: выход и смена аккаунта не стирают онбординг и выбранные языки (решение Ядра 15.10, координатор 03:08)

Governance-ID: TG-8E6CE5A3A7B4
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

После «Выйти» / «Сменить аккаунт» человек при следующем запуске НЕ проходит онбординг заново: онбординг, согласия и выбор
языков — настройки устройства. Удаление аккаунта по-прежнему сбрасывает онбординг (account_deleted_notice — не трогаю).
Тест account_switch_no_survivors строгий: после выхода эти ключи ОБЯЗАНЫ остаться, после полного стирания (удаление) —
исчезнуть. Лог [ACCOUNT-WIPE] keep=[ключи] без значений.

## Факты

- onboarding_done в SYNC_KEYS (cloud_sync.ts:545) → accountLocalDataKeysForToday → wipeLocalAccountDataUnsafeBody стирает;
  KEEP его не содержит. Заново ставит только вход (markOnboardedAfterSignIn, при user_name). Так получился R132.
- account_switch_no_survivors.test.ts:83 лишь РАЗРЕШАЛ ему выжить («ответ Ядра 15.10»), не проверял.

## Scope

- app/cloud_sync.ts: SIGNOUT_DEVICE_KEEP_KEYS = onboarding_done, onboarding_completed_at_ms_v1, onboarding_step,
  onboarding_flow_version_v1, onboarding_terms_privacy_accepted_v1, analytics_consent_v1, app_lang, lang,
  study_target_v1, study_languages_started_v1. wipeLocalAccountData(lease?, { mode: 'full' | 'signout' }) — по умолчанию
  'full' (удаление, вход со сменой — как было); 'signout' добавляет эти ключи в KEEP. Лог [ACCOUNT-WIPE] mode, keep.
- app/auth_provider.ts deps выхода/смены (wipeLocalData) и app/account_switch_quarantine.ts deps восстановления
  смены — mode 'signout'. Пути удаления (completePreparedAccountDeleteLocalExit, executePostDeleteLocalWipe) и входа со
  сменой (swap/merge) — без изменений.
- tests/account_switch_no_survivors.test.ts: строгие проверки.

## Architecture

Один параметр режима; единый KEEP на все фильтры стирания (removeExactly, финальный скан) — сохранённые ключи не считаются
«выжившими».

## Security and privacy

Сохраняются флаги онбординга/согласий и выбор языков интерфейса и изучения — без персональных данных аккаунта.
Согласие с Условиями и на аналитику остаётся за устройством, как решило Ядро 15.10. Профили языков
(languageProfileKey) НЕ сохраняются — вопрос координатору.

## Technical debt

Вход со сменой (swap/merge в auth_provider) по-прежнему стирает онбординг; там флаг сразу возвращает
markOnboardedAfterSignIn при наличии имени — вопрос координатору, менять ли.

## Verification

tests/account_switch_no_survivors.test.ts, tests/account_delete_flow_contract.test.ts, tests/local_account_data.test.ts,
tests/aa_account_switch_roundtrip_scenario.test.ts, tests/auth_provider_behavior.test.ts.

## Rollback

Обратный собственный патч.
