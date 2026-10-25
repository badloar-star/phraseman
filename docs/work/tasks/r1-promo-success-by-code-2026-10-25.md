# Task packet: R1 (б) промокод 007/008 — образец «Промокод применён» по коду

Governance-ID: TG-1CBA349F80EA
Status: In progress
Owner: 3 · МАКЕТЫ (координатор 25.10: остаток R1 по разбору d8eab23c4)

## Outcome

Разбор R1 (d8eab23c4), строки (б) overlays-campaigns-007/008: образец рисовал окно ввода с плашкой «Готово!», а приложение
сразу открывает полноэкранный итог «Промокод применён» (PremiumCelebrationModal, фаза promo). Владелец 15.10 решил срок
по-человечески: «Plus на 30 дней» / «Plus навсегда» (promoDurationText) вместо строки «по действующей записи аккаунта».
Образцы 007/008 привести к этому экрану (один экран, меняется только строка срока) и показать на настоящем кадре.

## Scope

In scope: docs/design/v2-app/promo-code-states.html (состояния 007 и 008 — новый экран; раздел «на настоящем кадре»), этот пакет.
Out of scope: код промокода и праздничного окна; порядок и число состояний на странице (по номерам блоков работает съёмка Сверки).

## Architecture

No architecture change. Тексты — из components/premium_celebration/celebrationLiquidCopy.ts (promoTitle, promoSub, promoCardTitle,
kicker, toLessons, close) и promoDurationText.

## Security and privacy

Макет, данных нет.

## Technical debt

- Accept temporarily: настоящий кадр от 12.10 со старой строкой срока; в «как будет» строка заменена по коду 15.10. Нужен свежий кадр Сверки.

## Verification

Страница открывается без ошибок консоли; блоки 007/008 на прежних местах; кадры real_compose: код и срок читаются, следов старой строки нет.

## Rollback

Вернуть страницу из git — приложение не меняется.
