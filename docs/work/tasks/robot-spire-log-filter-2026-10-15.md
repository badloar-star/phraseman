# Журнал кадра робота: теги Шпиля [SPIRE-*] (spire-010, нет ни одной строки [SPIRE-SCROLL])

Governance-ID: TG-A26B689C538D
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (передача от Макетов/Дизайна по spire-010)

## Outcome
В журнал кадра (`_runs/<метка>/<id>.log`) попадают строки [SPIRE-SCROLL], [SPIRE-DOCK], [SPIRE-LAYOUT], [SPIRE-TARGET]. Отсутствие [SPIRE-SCROLL] в логах spire-010/012 объясняется фильтром (`FRAME_LOG_RX` их не пропускал), а не тем, что прокрутка не вызывается: SpireTower пишет её с 4845ddd8f на каждом пути. Вердикт по spire-010 — по строкам нового прогона.

## Scope
scripts/parity_batch_shoot.mjs — одно регулярное выражение (+SPIRE-*). Дизайн уведомлён. Логика робота и остальные теги не меняются.

## Architecture
FRAME_LOG_RX получает альтернативу SPIRE-[A-Z]+.

## Security and privacy
Не применимо: только dev-журнал эмулятора.

## Technical debt
Если в журнале spire-010 появится `scroll-req#… ready: нет → отложено` без последующего `получено` — тогда причина в SpireTower, и правка пойдёт по строкам, а не по догадке.

## Verification
Тест `parity_batch_shoot_dry_run`, регулярное выражение на примерах строк.

## Rollback
git revert коммита.
