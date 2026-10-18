# Task packet: выход не переносит данные A в облако B — синхронизируемые ключи стираются, онбординг держат метки устройства

Governance-ID: TG-4A259FAAD5ED
Status: В работе (координатор 04:16, 🔴 Ревизор 3.76 / 596051245; дедлайн 07:30, иначе откат keep целиком)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Ни один ключ из SYNC_KEYS не переживает выход/смену (onboarding_done, app_lang, lang, study_languages_started_v1,
language_profile_v1::*) — у входящего B ровно его облачные языки и профиль, от A в облако B ничего не уходит. Чтобы после
выхода не показывать онбординг заново, перед стиранием пишутся НЕсинхронизируемые метки устройства
(device_onboarding_done_v1, device_ui_lang_v1): шлюз онбординга при пустом onboarding_done смотрит на метку и ставит новому
гостю его собственную отметку; язык интерфейса берётся из метки, пока облако не пришло. Удаление аккаунта метки сбрасывает.

## Факты (Ревизор 3.76)

89da06443/35714164b держали при выходе SYNC-ключи; при входе B они сливались (union) или прилипали к облаку B. Режим
'signout' стоял и на входе со сменой (auth_provider swap/merge).

## Scope

- app/device_onboarding_marks.ts (новый): ключи меток, writeDeviceMarksBeforeSignoutWipe (читает onboarding_done/app_lang
  ДО стирания), resolveBootOnboardingDone (чистая функция шлюза), readDeviceUiLang.
- app/cloud_sync.ts: SIGNOUT_DEVICE_KEEP_KEYS только НЕ-синхронизируемые ключи (и так не стирались); в режиме 'signout' —
  запись меток, лог [ACCOUNT-WIPE] deviceMarks. Сторож теста: ни один ключ KEEP не входит в SYNC_KEYS.
- app/auth_provider.ts: вход со сменой (swap/merge) — снова 'full'.
- app/_layout.tsx: шлюз онбординга через resolveBootOnboardingDone; при источнике device — запись onboarding_done='1'
  новому гостю (как делает завершение онбординга) + лог.
- components/LangContext.tsx: нет app_lang → язык из метки устройства (только память), лог.
- app/account_deleted_notice.ts: метки в ONBOARDING_RESET_KEYS_ON_ACCOUNT_DELETE.
- config/phone-state-legacy-inventory.v1.json: строки меток (device_only).
- tests: no_survivors — после выхода все SYNC_KEYS A стёрты, метки записаны, KEEP ∩ SYNC_KEYS = ∅; восстановление B
  после выхода A даёт ровно облачные языки B; resolveBootOnboardingDone — «A вышел → онбординг не показан».

## Architecture

Метки — отдельные ключи вне SYNC_KEYS и вне описи аккаунта (не попадают ни в облако, ни в копию A).

## Security and privacy

Устраняет перенос данных A (языки, профиль, флаги) в облако B. Метки хранят только «онбординг пройден на этом устройстве»
и код языка интерфейса.

## Technical debt

Согласие на аналитику (analytics_consent_v1) — по-прежнему устройство (не в SYNC_KEYS, не стирается); спросить ли заново у
нового владельца — вопрос владельцу утром.

## Verification

tests/account_switch_no_survivors.test.ts, tests/device_onboarding_marks.test.ts, tests/auth_provider_stable_link.test.ts,
tests/account_delete_flow_contract.test.ts, тесты LangContext, phone_state_legacy_inventory, сводный набор выхода.

## Rollback

Если не готово к 07:30 — откат keep-части 89da06443 и 35714164b целиком (решение координатора).
