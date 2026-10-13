# Task packet: бэклог №18 — состояния, до которых робот не доходит (dev-ссылки и шаги, 13.10)

Governance-ID: TG-E418CCCD0C0A
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~13:40)

## Outcome

Для строк, у которых в вердиктах Макетов стоит «[состояние] не достигнуто», появляется рабочая dev-ссылка и шаги робота. Порядок: Пэйволы → Настройки → Карточки → Сообщество → Диалоги.

Строки:
- paywall-gap-011/012/013;
- paywall-gap-001;
- settings-gap-028;
- cards-054/056;
- community-011/018/019;
- dialogs-gap-011;
- learn-003/004.

Каждая готовая строка сразу уходит Сверке, сводка — координатору.

### Пэйволы 011–013 (тосты): причина по журналу

Журнал `_runs/2026-10-13T10-50-12-792Z/paywall-gap-011.log`:
- тост испускается через 900 мс после шага `toast` (11:50:23.64) и живёт до 11:50:27.89;
- пэйвол открывается только после перечитывания энергии — `replace` в 11:50:26.72, NAV-PAINT 11:50:26.95;
- робот снимает уже после ухода тоста.

Починка: тост ставится в очередь «после перехода», и `dev_state.tsx` выполняет её через 900 мс после `router.replace` (либо сразу, если `next` не задан).

## Scope

In scope:
- `app/dev_state_fixtures.ts` и `app/dev_state.tsx` (очередь действий после перехода; только dev, маршрут dev_state вырезан из стор-сборки);
- модуль шагов Авторизации `scripts/dev_links_r1_steps_auth.py`;
- testID там, где их нет (только testID, без вида; чужие файлы — `--patch` своих хунков, владельцу строкой).

Out of scope: вид экранов, реестр.

## Architecture

`queueAfterDevStateRoute(label, fn)` и `runAfterDevStateRouteActions(reason)` в `dev_state_fixtures.ts` (память процесса). `dev_state.tsx` зовёт run после replace. Журнал `[DEV-STATE] after_route`.

## Security and privacy

Только dev, без записи в Firestore.

## Technical debt

- Очередь живёт в памяти процесса; если переход не случился (ошибка), действия выполняются с причиной `no_next` / `route_error`, чтобы не копиться.

## Verification

- журнал кадра Сверки показывает тост после NAV-PAINT пэйвола;
- dev-сторожа (store_release_stubs, store_route_reachability) зелёные.

## Rollback

`git revert` коммитов.
