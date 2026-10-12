# Task packet: dev_state?signin=hold|offline|generic — подмена результата входа для кадров онбординга

Governance-ID: TG-D8EE1F90FA15
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10 вечер, п.2 «ДА, после п.1»; спецификация Ядра)
Related epic/enabler: съёмка R1: onboarding-003 (вход висит), onboarding-004 (нет связи), onboarding-008 (общая ошибка) — сейчас только через авиарежим

## Outcome

`signin=hold` — вход ждёт 60 с и возвращает «отменено» (кадр «Вход всё ещё выполняется…» после 8 с); `offline` — ошибка
`dev_stub:network-request-failed` («Связь пропала»); `generic` — `dev_stub:generic`. Всё до замков и сети, лог на каждой ветке.
В dev-тексте ошибки онбординга код `dev_stub:` не дописывается (кадр совпадает с макетом). Выход/стирание при флаге отказывают.

## Scope

In scope: app/dev_account_state.ts (+ заглушка стора), app/auth_provider.ts (ветка сразу после getDevSignInError),
components/CleanOnboarding.tsx (условие дописывания кода), app/dev_state_fixtures.ts (параметр), тест, шаги.
Out of scope: настоящий вход, сервер.

## Architecture

Как restore=/switch=: флаг в памяти dev_account_state, хук первым в signInWithProvider, стор — заглушка «нет подмены».

## Security and privacy

Вход при флаге не начинается (ни Google, ни Firebase, ни замков); выход/смена при флаге отказывают (общее охранное условие).

## Technical debt

- Contain: dev-инструмент съёмки.

## Verification

Тест: три режима → нужный результат, без сети; охрана выхода; заглушка; CleanOnboarding не дописывает dev_stub-код.
Точечно: dev_account_state, stubs, aa_auth_double_tap_contract, aa_release_floor_auth_ui.

## Rollback

Откат коммита.
