# Task packet: контраст экранов входа и аккаунта во всех 138 сочетаниях тем

Governance-ID: TG-B92AFDA89A20
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: координатор 18.10 — все ресурсы на авторизацию; правило «кнопки нигде не сливаются»

## Outcome

Экран входа (Google/Apple, гость), согласия, «Аккаунт» в Настройках, выход и удаление, шторка гостя, индикатор входа на кнопке — кнопки не сливаются (заливка ≥ 3 / тон ≥ 1,5), текст ≥ 4,5, значки ≥ 3 во всех 23 темах × оформление × насыщенность.

## Scope

In scope: замер tests/blend_auth_1018.test.ts; правки токенов в components/AuthProviderButtons, RegistrationPromptModal, CleanOnboarding (только цвет), app/account_details, components/account/AccountLogoutFlow, components/DeleteAccountConfirmModal — только где нет чужих правок.

Out of scope: app/auth_provider.ts, account_switch_* (Авторизация), app/privacy_settings.tsx (чужие правки), GuestSwitchWarningSheet (Дизайн, рекомендация передана), логика входа.

## Architecture

No architecture change: замена токенов цвета на гарантированные пары (ctaFill/ctaFillInk, buttonFill, bad и т. п.); вариант кнопки Google — по яркости поверхности.

## Security and privacy

Не затрагивает данные; только цвета.

## Technical debt

- Pay now: сырой accent на кнопках и opaqueControl на шторках экранов входа.

## Verification

Замер по 138 сочетаниям до/после; тесты затронутых экранов.

## Rollback

`git revert`.
