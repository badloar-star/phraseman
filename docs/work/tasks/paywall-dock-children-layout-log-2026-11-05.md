# Task packet: журнал геометрии детей нижней панели окна оплаты

Governance-ID: TG-639E88ABFA8F
Status: Planned
Owner: сессия «5 · Вход» по сообщению Сверки 22:30 05.11 (пересъёмка после 406692e88 без изменений)
Related epic/enabler: paywall-dock-flexgrow-2026-11-05.md

## Outcome

По логу видно высоту каждого ребёнка нижней панели (строка автопродления, кнопка, плашки, ссылки), по ним — что раздувает dock (1827 ≈ 2×915) и обновился ли бандл на устройстве (новые имена частей в журнале).

## Scope

In scope: `onLayout`-журнал `[PAYWALL-LAYOUT]` на детях нижней панели в `components/paywall/PaywallPlus.tsx`.
Out of scope: вёрстка и тексты.

## Architecture

No architecture change: только диагностика на уровне разметки.

## Security and privacy

Данных нет; журнал содержит только размеры.

## Technical debt

Contain: журнал остаётся (дешёвый, один вывод на открытие окна).

## Verification

Пересъёмка Сверки: строки `[PAYWALL-LAYOUT] part=dock_*`.

## Rollback

Откат коммита.
