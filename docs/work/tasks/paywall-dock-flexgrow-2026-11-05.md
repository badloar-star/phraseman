# Task packet: окна оплаты — нижняя панель раздувалась и вытесняла плитки (Сверка, 10 кадров)

Governance-ID: TG-35AA29142AEC
Status: Planned
Owner: сессия «5 · Вход» по сообщению Сверки/координатора 05.11
Related epic/enabler: SUBSCRIPTION_DISCLOSURE_CHECK_2026-11-05 (риск отказа на ревью), a1aec863f (окна оплаты variant-3)

## Outcome

В окнах оплаты снова видны выгоды, плитки «Год/Месяц» с ценами, «Ввести промокод», «Восстановить покупки», «Условия/Конфиденциальность». Успех: на повторных кадрах Сверки журнал `[PAYWALL-LAYOUT]` даёт dock h ≈ 300–450 (не 1827), scroll h > 0.

## Scope

In scope: `components/paywall/PaywallPlus.tsx` (стили плашек нижней панели), пины в `tests/`.
Out of scope: тексты и состав одобренного макета, логика покупки, плитки/цены.

## Architecture

No architecture change: убирается `flexGrow: 1` у плашек `secondaryAction` в колонке `secondaryActions`. Данные журнала Сверки: sheet h=856, header 163, scroll 0, dock 1827 (= 2 × окно 915) — каждая из двух плашек раздувалась на всё окно при замере AtMost.

## Security and privacy

Данных, сервисов и разрешений нет; чисто вёрстка.

## Technical debt

Contain: пин запрещает `flexGrow` у плашек нижней панели; журнал геометрии остаётся для следующих регрессий.

## Verification

Тесты paywall_dock_*; повторный прогон Сверки (premium_modal, 5 контекстов, 2 темы) с `[PAYWALL-LAYOUT]`; склейка с «Все окна Plus».

## Rollback

Откат коммита (одна строка стиля).
