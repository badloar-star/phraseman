# Каталог рангов монет — отдельный экран со входом «Все ранги» из «Повысить ранг»

Governance-ID: TG-40FC5C87325B
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (журнал 35, цикл координатора)
Related epic/enabler: OWNER_REQUESTS_LEDGER.md строка 35; макет `docs/design/v2-app/coins.html` (`rankCatalog`)

## Outcome

С экрана «Повысить ранг» (`app/coin_rank.tsx`) видна ссылка «Все ранги» (9 языков), она открывает отдельный экран `app/coin_rank_catalog.tsx` — сетка 4×5 всех 20 рангов (монета 50 + «Ранг N»), текущий ранг подсвечен, шапка и фон как у экрана ранга. Шторка-каталог на экране ранга убрана.

## Scope

In scope: новый маршрут `coin_rank_catalog`, регистрация в `app/_layout.tsx`, ссылка и подпись в `app/coin_rank.tsx`, обновление пинов теста `results_coins_profile_liquid_glass_source_contract`, сторож нового экрана. Out of scope: повышение ранга, цены, церемония (`[RANK-CEREMONY]` не трогаем), строка «Контракт суммы не закрыт» из макета (служебная, пользователю не показывается).

## Architecture

Экран переиспользует `CoinRankCatalog` (сетка из `COIN_RANK_TABLE`) и ранг из `useMyCoinRank`; навигация `router.push('/coin_rank_catalog')`, назад — `safeRouterBack`. Цвета — токены темы.

## Security and privacy

Только отображение таблицы рангов, данные пользователя не передаются.

## Technical debt

Подзаголовок макета «20 готовых ассетов · 0–19» — служебный, не воспроизводится.

## Verification

Синтаксис, контрактные тесты (`results_coins_profile_liquid_glass_source_contract`, новый сторож), полная проверка типов.

## Rollback

`git revert` коммита.
