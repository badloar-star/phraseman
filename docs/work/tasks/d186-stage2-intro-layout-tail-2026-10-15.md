# Task packet: D186 этап 2 — убрать хвост окна «72 часа» из app/_layout.tsx (координатор 15.10)

Governance-ID: TG-1C708496A1E0
Status: В работе — коммит в окно кода
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

С 4f6334b20 (D186) окно `<IntroFullAccessModal>` не рисуется, но в `app/_layout.tsx` остались состояние `introFullAccessModal` ('welcome'/'ended'),
проверка `checkIntroFullAccessEndedModal` (+ подписки на событие и возврат из фона), открытие 'welcome' после онбординга и запрос слота
`useOverlayVisible('introFullAccess', …)`. Сейчас ветки недостижимы (`INTRO_FULL_ACCESS_REMOVED = true`), но при возврате флага без окна
слот очереди окон занял бы невидимый держатель и заблокировал остальные окна. Убираем мёртвую разводку целиком.

## Scope

In scope: `app/_layout.tsx` (состояние, проверка «закончилось», открытие «welcome», запрос слота, строка журнала [OVERLAY-QUEUE], два импорта);
сторож `tests/intro_full_access_layout_contract.test.ts` (переписан: окна нет, запуск из онбординга остаётся);
`tests/analytics_funnel_coverage.test.ts` (снято `intro_ended_shown` — его единственный вызов уходит вместе с проверкой).
Out of scope: `app/intro_full_access.ts` (флаг и состояние), онбординг (`handleOnboardingIntroFullAccessStart` остаётся),
ключ `introFullAccess` в общем списке арбитра (без запросчика безвреден), чтения `getIntroFullAccessState` в апселле и winback.

## Architecture

Только удаление кода, который не может выполниться при текущем флаге; поведение приложения не меняется.

## Security and privacy

Не касается. Минус одно событие аналитики, которое и так не отправлялось.

## Technical debt

- Ключ `introFullAccess` в `components/overlay_arbiter_core.ts` и проверки `expiredUnseen` в апселле/winback — убрать вместе с модулем intro (этап 3).

## Verification

intro_full_access_layout_contract, d186_intro_full_access_removed, analytics_funnel_coverage, overlay_arbiter, app_events_overlay_registry — N passed;
babel-парс `app/_layout.tsx`; `git diff --numstat app/_layout.tsx` = только мои строки.

## Rollback

`git revert`.
