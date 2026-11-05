# Task packet: окно оплаты — подзаголовок не повторять в первой выгоде (premium_expired наезжал)

Governance-ID: TG-B8F9B9862CCD
Status: Planned
Owner: сессия «5 · Вход» по вердикту Сверки 05.11 (7d00b981e)
Related epic/enabler: paywall-dock-flexgrow-2026-11-05.md (406692e88 — окна снова с плитками)

## Outcome

В окне оплаты premium_expired первая выгода не дублирует подзаголовок шапки и не лезет под него: пропадает лишняя строка (overflow 55 → около 10), прокрутка к концу не режет верх. Успех: на пересъёмке premium_expired (обе темы) нет наложения.

## Scope

In scope: `components/paywall/PaywallPlusScreen.tsx`, одна строка передачи `leadCaption` (подпись первой выгоды берётся только когда шапка НЕ показывает подзаголовок); тест.
Out of scope: тексты макета, вёрстка нижней панели, прочие окна.

## Architecture

No architecture change: подзаголовок рисуется шапкой (`contextSubtitle`, когда есть заголовок входа); в первую выгоду он дублировался как подпись (`leadCaption`). Теперь — либо в шапке, либо в выгоде.

## Security and privacy

Данных нет.

## Technical debt

Contain: пин в тесте запрещает дубль.

## Verification

Тест; пересъёмка Сверки premium_expired.

## Rollback

Откат строки.
