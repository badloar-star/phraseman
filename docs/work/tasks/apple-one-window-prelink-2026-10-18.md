# Task packet: Apple на iPhone — одно окно Apple (серверная привязка ДО привязки к гостю)

Governance-ID: TG-10BB3D66E72B
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ (клиент); сервер Ядра authAppleLinkByVerifiedEmail — без изменений

## Outcome

Журнал iPhone владельца 18.10 13:59 (координатор): Apple вошёл, но человек увидел ВТОРОЕ окно Apple. Цепочка:
привязка к гостю → auth/email-already-in-use (токен потрачен) → сервер привязал Apple к аккаунту с этой почтой → повтор тем же
токеном → auth/unknown → второе окно Apple. Цель: окно Apple одно во всех сценариях (новый вход, правило 2, правило 3).

## Scope

- app/auth_provider.ts (runSignInWithProviderWhileOwningHandoffLease):
  - сразу после окна Apple, параллельно с подготовкой гостя, — requestAppleLinkByVerifiedEmail (журнал `[AUTH-APPLE-LINK] prelink`);
  - сервер ответил «Apple у существующего аккаунта» → linkWithCredential к гостю НЕ зовём (он бы потратил токен), а входим в тот же
    охраняемый путь конфликта (credential-already-in-use) нетронутым токеном;
  - шторка правила 2 получает этот нетронутый токен (`unconsumed`) — «Войти» без второго окна;
  - прежний путь после конфликта остаётся запасным; повторный вызов сервера не делается, если он уже ответил до привязки.
- tests/signin_apple_handoff_unlock_contract.test.ts — контракт порядка.

## Architecture

Сервер проверяет Apple ID token сам (подпись по ключам Apple, aud, срок, nonce, email_verified) и Firebase его не показывает —
поэтому токен после серверного вызова цел. Custom token не вводится (замечание Ревизора про classifySignInProvider снимается само:
вход остаётся `apple.com`). Повтор входа — только внутри охраняемого пути (условие Ревизора 3.139): запись передачи → замок →
перепроверка чистоты гостя → шторка правила 2 → credential_ready → signInWithCredential → swap без слияния.

## Security and privacy

Серверная привязка по проверенной почте уже одобрена (решение владельца «Входить само», Ядро 76dace644); меняется только момент
вызова — до решения правила 2. Отмена в шторке оставляет Apple привязанным к аккаунту человека с той же проверенной почтой —
это его собственный аккаунт, данные не переносятся. В журнал не пишутся токен и почта.

## Technical debt

Один лишний серверный вызов на каждый вход Apple гостем (≈0,5–1,7 с), скрыт параллельно с подготовкой гостя. Дальнейшее
ускорение (правило 3: запуск привязки ещё во время стирания A) — отдельным шагом после замера.

## Verification

Точечные тесты через светофор: signin_apple_handoff_unlock_contract, auth_provider_behavior, account_authority_legacy_callsite_guard.
Живой прогон на iPhone владельца: в журнале `prelink outcome=apple_owned_by_existing_account next=skip_guest_link`, нет
`same_credential_rejected` и `second_apple_window`.

## Rollback

`git revert <hash>` — возвращается прежний путь (второе окно Apple как запасной).
