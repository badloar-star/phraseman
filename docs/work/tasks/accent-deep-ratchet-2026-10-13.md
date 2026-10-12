# Храповик на сырые accentBorder/accentText в app/ и components/

Governance-ID: TG-47ADA5DF65BC
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора: новые `.accentBorder`/`.accentText` для графики/текста запрещены, только accentGraphic/accentTextSafe)

## Outcome
Сканер считает обращения `.accentBorder`/`.accentText` в app/ и components/ (вне определений палитр) по файлам; тест не даёт им расти. Число уменьшается по мере перевода на accentGraphic/accentTextSafe.

## Scope
`scripts/light_accent_graphics_scan.mjs`, `tests/light_accent_graphics_ratchet.test.ts`, `config/light-accent-graphics-baseline.json` (поля deepTotal/deepCounts).

## Architecture
Построчный regex; пропускаются комментарии, строки с `light-accent-ok`, файлы определений палитр и Codex-области. Учёт отдельный от основного счёта.

## Security and privacy
Только сторож.

## Technical debt
Часть обращений легитимна (тёмная ветка); их снимают пометкой `light-accent-ok`.

## Verification
Запуск сканера; тест храповика при свободной памяти.

## Rollback
git revert.
