# Task packet: метка версии правки и стили детей в журнале геометрии окна оплаты

Governance-ID: TG-17CCE7055123
Status: Planned
Owner: сессия «5 · Вход» по слову координатора 22:40 05.11
Related epic/enabler: paywall-dock-flexgrow-2026-11-05.md, paywall-dock-children-layout-log-2026-11-05.md

## Outcome

Журнал `[PAYWALL-LAYOUT]` каждой строкой несёт метку версии правки (`fix`) и flex/flexGrow/flexShrink/высоту стилей части; по метке видно, обновился ли бандл на устройстве, по стилям — кто раздувает нижнюю панель (dock 1827 ≈ 2×915).

## Scope

In scope: `components/paywall/PaywallPlus.tsx` — только журнал.
Out of scope: вёрстка и тексты окна.

## Architecture

No architecture change: диагностика.

## Security and privacy

Данных нет, только размеры и числа стилей.

## Technical debt

Contain: журнал дешёвый (один вывод на часть при открытии окна); метка меняется при следующей правке вёрстки окна.

## Verification

Пересъёмка Сверки после полной перезагрузки JS: в строках есть `fix:"noFlexGrow-406692e88+children"` и части `dock_*`.

## Rollback

Откат коммита.
