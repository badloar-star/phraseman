# Task packet: «без системных текстов» во входе и аккаунте

Governance-ID: TG-55492CAD741D
Status: В работе (координатор 18.10 06:12, срок 07:45)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Каждый код ошибки входа (Firebase Auth, Google, Apple, RevenueCat) даёт человеку фразу из словаря — без кода,
без «Firebase», без английского текста исключения. Код остаётся в журнале с префиксом [AUTH-…].

## Факты (аудит по коду 18.10 06:15)

| Место | Что видит человек | Вердикт |
|---|---|---|
| RegistrationPromptModal — ошибки входа (`result.error`) | только словарные фразы; код в журнал шёл лишь под `__DEV__` | 🟡 в релизе код не доходил до журнала |
| RegistrationPromptModal — отмена (`cancelled`) в отладочной сборке | «DEBUG: cancelled / Native sign-in вернул `cancelled`… webClientId / SHA-1…» | 🔴 системный текст на экране (эмулятор, сверка с макетом) |
| RegistrationPromptModal — сеть / «слишком много попыток» | общее «Не получилось войти. Попробуй позже.» | 🟡 нет своей фразы |
| CleanOnboarding `describeAuthError` | словарная фраза, но в сборках с инструментами разработчика (в т. ч. TestFlight) под ней дописывался сырой код `firebase_auth_…` | 🔴 код на экране |
| CleanOnboarding — `too-many-requests` | общая фраза | 🟡 нет своей фразы |
| DeleteAccountConfirmModal, account_details, NicknameEditModal, referral_code_sheet, DailyPollCard | словарь; текст исключения только в журнале | ✅ |
| paywall_purchase / manage_subscription (RevenueCat) | словарь (`cancel` / `pending` / тосты), код в [PAYWALL] / DebugLogger | ✅ |
| auth_provider | наружу отдаёт только машинные коды (`native_<code>`, `firebase_<code>`), текст исключения не читается | ✅ |
| ErrorBoundary | `name: message` только под `__DEV__`, вне зоны входа | ✅ (не трогаю) |

## Scope

- app/auth_error_copy.ts (новый): `authErrorKind(code)` → 'network' | 'too_many' | 'other'; `authErrorLogCode(code)` —
  безопасный код для журнала; словарные фразы для «связь пропала» и «слишком много попыток» на 9 языках.
- components/RegistrationPromptModal.tsx: код ошибки всегда в журнал `[AUTH-MODAL] sign_in error`; сеть и
  «слишком много попыток» — свои фразы; отладочный текст отмены — только в журнал, на экране словарная фраза.
- components/CleanOnboarding.tsx: код больше не дописывается к тексту; код и вид — в журнал `[AUTH-ONB]`;
  ветка «слишком много попыток».
- tests: новый сторож + правка `aa_dev_robot_no_cloud_and_restore` (ждал хвост с кодом).

## Architecture

Один маленький модуль словаря кодов, общий для окна входа и онбординга, — чтобы два экрана не разошлись в фразах.
Решение «показывать ли повтор» и прочие ветки не меняются.

## Security and privacy

В журнал идёт только машинный код, проходящий фильтр `[A-Za-z0-9_./:-]{1,80}`, иначе `other` — почта/токены
из текста исключения не попадают. Данные не собираются, политика не затронута.

## Technical debt

Остальные экраны вне зоны входа (ErrorBoundary в dev) не трогаю.

## Verification

Точечно через светофор: новый сторож, aa_dev_robot_no_cloud_and_restore, onboarding_auth_error_i18n_contract,
aa_s2d_local_progress_not_uploaded_copy, registration_prompt_modal_lifecycle, aa_auth_double_tap_contract,
apple_android_no_dead_button_contract.

## Rollback

`git revert <hash>` — модуль новый, правки локальные.

## Ход работы

- 06:3x Правки: app/auth_error_copy.ts (новый), components/RegistrationPromptModal.tsx, components/CleanOnboarding.tsx;
  тесты: новый tests/auth_no_system_texts_contract.test.ts, правки aa_dev_robot_no_cloud_and_restore и
  onboarding_auth_error_i18n_contract (хвост с кодом и счётчик веток triLang).
- Новая строка «Слишком много попыток подряд…» (9 языков) отправлена Переводчику.

- 06:5x Правки Переводчика: account_switch_required без «локального/безопасную» (8 языков, en без изменений), id operation-not-allowed «sedang tidak tersedia», pt-BR «Muitas tentativas seguidas.»
