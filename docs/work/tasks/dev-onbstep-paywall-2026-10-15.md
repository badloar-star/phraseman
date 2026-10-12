# Dev: dev_state?onbstep=<шаг онбординга> — дорога к экрану цены для кадров onboarding-025 и onboarding-paywall-001

Governance-ID: TG-1624575231AB
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора, R1_PENDING_COVERAGE группа 2б)

## Outcome
Подмена пейвола `dev_state?paywall=loading|live|reference|failed|off` уже есть (dev_paywall_state.ts, подключена в usePaywallPurchase и dev_state_fixtures). Не хватало дороги до экрана цены в онбординге: добавлен `onbstep=<id шага>` (в dev ставит сохранённый шаг онбординга и перезапускает его), чтобы робот открывал именно шаг `onboardingPaywall`. Вид онбординга не меняется (заморожен).

## Scope
app/dev_state_fixtures.ts (разбор + применение), тест. Шаги ссылок в scripts/dev_links_r1_steps.py не правлю — строки уходят Дизайну.

## Architecture
Параметр `onbstep` из списка id каталога шагов (ONBOARDING_STEP_CATALOG). В dev: multiSet [версия потока, шаг], удаление onboarding_done, событие dev_onboarding_restart; всё внутри ветки `onboarding=pending`. В стор-сборке dev_state закрыт целиком (isDevStateAvailable).

## Security and privacy
Пишутся только локальные ключи прогресса онбординга на устройстве, ничего в сеть/облако; только dev.

## Technical debt
Нет: переключатель использует существующую точку рестарта онбординга.

## Verification
Тест разбора и источника; существующий тест dev_state_fixtures; кадры у Сверки.

## Rollback
git revert коммита.
