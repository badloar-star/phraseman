# Task packet: Apple на Android — без тупиковой кнопки и без текста разработчика на экране

Governance-ID: TG-253F06435A31
Status: В работе (координатор 18.10 05:45)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

1. Без Services ID в сборке кнопки Apple на Android нет (тупиковой кнопки нет); причина — в журнал
   [AUTH-MODAL] apple_hidden reason=missing_service_id один раз за показ окна входа.
2. Если ветку всё же достигли — человеку «Вход через Apple на этом телефоне сейчас недоступен. Войди через Google.»,
   подробности (EXPO_PUBLIC_…, Apple Developer) — только в журнал. Старый текст убран на всех 9 языках.
3. На iOS кнопка Apple не пропадает.

## Факты

- app/auth_provider.ts isAppleSignInAvailable / peekAppleSignInAvailability: на Android уже `!!getAppleAndroidServiceId()` —
  без Services ID кнопка скрыта (RegistrationPromptModal appleAvail === true). На эмуляторе 18.10 кнопка была видна —
  в отладочной сборке Services ID задан.
- Текст разработчика — только RegistrationPromptModal ≈1308 (ветка APPLE_ANDROID_MISSING_SERVICE_ID).

## Scope

- app/auth_provider.ts: export peekAppleUnavailableReason() — 'dev_auth_none' | 'cloud_off' | 'missing_service_id' |
  'ios_unavailable' | null (только чтение, без новых секретов).
- components/RegistrationPromptModal.tsx: лог apple_hidden при показе окна, если Apple скрыт; ветка ошибки — человеческий
  текст (9 языков, на вычитку Переводчику), подробности в [AUTH-MODAL].
- tests: доступность Apple на Android с/без Services ID и на iOS; в окне нет строки EXPO_PUBLIC_ на экране.

## Architecture

Видимость — существующая проверка; новое только журнал и текст ветки.

## Security and privacy

Имя переменной сборки больше не показывается человеку.

## Technical debt

Новая строка — Переводчику до 07:45; до вычитки — мой перевод на 9 языков.

## Verification

tests/apple_android_availability.test.ts (новый), тесты окна входа (registration_*), auth_surfaces_english_contract.

## Rollback

Обратный собственный патч.
