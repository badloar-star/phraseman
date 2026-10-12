# Task packet: подмены съёмки coins-001/003/004, system-010 (экран ошибки), system-012 (окно «сообщение команды»)

Governance-ID: TG-5B9C64AE9389
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

- `coins=N` — баланс монет для ПОКАЗА на экранах «Монеты» (runes_wallet) и «Повысить ранг» (coin_rank); вместе с coinRank=5 даёт кадры макета
  (12 480, Лектор → Эксперт за 6 000). При подменённом балансе настоящее повышение ОТКАЗЫВАЕТ до сервера (память проекта: тап «Повысить ранг»
  однажды списал 6 000 монет).
- `coinupgrade=hold` — тап «Повысить» держит «Проверяем повышение…» (upgrading=true), сервер не вызывается (coins-004).
- `errorscreen=on` — корневой ErrorBoundary показывает свой экран из памяти: без исключения, без recordError и без logAppCritical (запись в прод);
  «Повторить» снимает флаг (system-010).
- `appmessage=announcement` — в очередь окна объявления кладётся демо-сообщение из памяти (без сети, без проверки «новичок < суток») (system-012).

## Scope

In scope: app/dev_coin_rank.ts (+заглушка, список сборщика, тест заглушек), app/dev_social_state.ts (+заглушка), app/coin_rank.tsx, app/runes_wallet.tsx,
hooks/use_coin_rank_upgrade.ts, components/ErrorBoundary.tsx, app/_layout.tsx (одна dev-ветка эффекта очереди), app/app_messages.ts (сборка демо-сообщения),
app/dev_state_fixtures.ts (разбор), шаги ссылок, тесты.
Out of scope: серверные функции, кошелёк и ранг в хранилище (не пишутся).

## Architecture

Флаги в памяти, геттеры `__DEV__ && !IS_STORE_RELEASE`; стор-сборка — заглушки (metro), гейт store_release_stubs_gate.

## Security and privacy

Никаких записей в Firestore/хранилище; повышение ранга при подмене не доходит до upgradeCoinRank. Кнопки окна объявления не жать (подтверждение пишет отметку).

## Technical debt

- Contain: нет.

## Verification

Поведенческие тесты геттеров и отказа повышения; контракт мест внедрения; store_release_dev_state_stubs; гейт заглушек; dev_links guards.

## Rollback

Откат коммита.
