# Task packet: 5 блокирующих строк Авторизации (R1_PENDING_READINESS) + 6 правок шагов Ядра (R1_LINKS_46_CORE)

Governance-ID: TG-90A323694CFA
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (генератор ссылок; координатор и Ядро 13.10)

## Outcome

Блокирующие (5):
- paywall-gap-012 — уже закрыта 3ceef0032 (пейвол «Энергия закончилась»).
- overlays-campaigns-014 — подмена promo=off → promo_disabled в коде верна и логируется (`[DEV-STATE] promo: ответ подменён статусом …`);
  кадр показывал «не найден» — нужна пересъёмка с журналом. Код в шагах — WELCOME30, как в образце.
- auth-gap-013 / auth-gap-016 — образец: окно смены поверх экрана «Аккаунт»; в приложении смена аккаунта живёт только в Настройках
  (account_details её не содержит) — «образец ≠ код», решение Дизайна/Макетов, ссылкой не лечится.
- settings-gap-007 — новая подмена `cache=hold`: «Очистить» держит «чистим…» без настоящей чистки; затем прокрутка к опросу внизу.
Ядро (6): cards-v2-025 (+cards-014, cards-section-022/024, packs-simple-001) `cards=demo&catalog=demo`; cards-v2-026 (+cards-017,
cards-section-023, cards-048) поиск xyzq + hidekb; cards-v2-028 (+cards-section-033) `&quota=reset`; cards-v2-046 Layover + hidekb;
dialogs-gap-016 — реплика без паузы 2,5 с.

## Scope

In scope: scripts/dev_links_r1_steps_chain7.py (переопределения), app/dev_social_state.ts (+заглушка), app/cache_reset.ts, app/dev_state_fixtures.ts,
пересборка DEV_LINKS_R1 (только эти строки).

## Architecture

Флаг в памяти; `cache=hold` проверяется в clearAppCaches до чтения хранилища; в сторе геттер выключен.

## Security and privacy

Подмена не стирает и не пишет ничего; облако не трогается.

## Technical debt

- Contain: нет.

## Verification

Гейт заглушек, prod_write_guard, тесты cache_reset/dev_social_state/ссылок при окне памяти.

## Rollback

Откат коммита.
