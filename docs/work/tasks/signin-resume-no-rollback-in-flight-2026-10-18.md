# Task packet: восстановление при запуске не откатывает вход, который идёт в этом же запуске

Governance-ID: TG-E7A6517729BD
Status: В работе (координатор 18.10 10:10, (A) шаг 1 — «сейчас ДА»)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Горячая перезагрузка / перемонтирование корня посреди входа больше не выходят из только что вошедшего аккаунта:
восстановление при загрузке видит, что вход провайдера ещё идёт, и не трогает запись передачи.

## Факты (журнал iPhone 08:45:50–08:46:17)

- Google вошёл (handoff signed_in), в 08:45:53 модуль _layout переоценён (горячая перезагрузка, процесс тот же), загрузочное
  восстановление в 08:45:54 сделало dep:signOut поверх идущего входа → auth_uid_missing → identity_unavailable.
- Модуль входа при горячей перезагрузке может переоцениться — признак «вход идёт» в памяти модуля обнуляется. Поэтому признак
  хранится в globalThis (его видят обе копии) со сроком 2 мин.

## Scope

- account_switch_quarantine.ts: `markProviderSignInInFlight(active)` / `providerSignInInFlightAgeMs()` (globalThis, срок 2 мин);
  в начале ветки записи передачи resumeInternal — если вход идёт: `retryable sign_in_in_flight`, журнал
  [SWITCH-QUARANTINE] resume_deferred reason=sign_in_in_flight ageMs=.
- auth_provider.ts: признак ставится при старте signInWithProvider и снимается в finally.
- Тесты.

## Architecture

Признак только откладывает восстановление; через 2 мин (вход завис) восстановление работает как прежде.

## Security and privacy

Данные не меняются.

## Technical debt

Шаг 2 (довод вперёд при следующем запуске) — следующим коммитом.

## Verification

Адресные тесты через светофор; эмулятор — по координатору.

## Rollback

`git revert <hash>`.
