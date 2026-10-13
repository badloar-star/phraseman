# Task packet: включённый переключатель в Уведомлениях / Обучении / Приватности — токен switchOnTone (Темы 4801981d8)

Governance-ID: TG-C7085794B351
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~05:45)

## Outcome

Три копии `LocalSwitch` (app/settings_notifications.tsx, app/settings_edu.tsx, app/privacy_settings.tsx) во включённом состоянии
рисовали тёмную дорожку `glass.selected` и светлый бегунок `glass.lightTint`. Образец (settings-gap-013/014/015/034, kit `.gs-sw.on`) —
дорожка цвета акцента темы и «чернильный» бегунок. Теперь включённое состояние берётся из общего токена
`switchOnTone(glass)` (components/settings/switch_chrome.ts, Темы 4801981d8): track = accentGraphic, knob = accentInk.
Выключенное — прежний `switchOffTrackTone`. Попутно в окно 06:00 — убрать дубль `emitAppEvent('dev_onboarding_done')` в
app/dev_state_fixtures.ts (общий коммит 4ca9997fd унёс вставку, f9f6b9171 добавил второй раз).

## Scope

In scope: цвет включённой дорожки/бегунка в трёх файлах, тесты-контракты; дубль строки. Out of scope: размеры, анимация, логика переключателей.

## Architecture

Общий токен Тем вместо локальных литералов токенов; одинаково во всех трёх экранах.

## Security and privacy

Только вид.

## Technical debt

- Contain: три копии LocalSwitch остаются отдельными (вынос в общий компонент — отдельная задача Дизайна).

## Verification

Контракт: каждая копия берёт switchOnTone для включённого состояния, glass.selected/lightTint во включённом не используются;
тесты экранов; переснять settings-gap-013/014/015/034 и profile-006.

## Rollback

git revert коммита.
