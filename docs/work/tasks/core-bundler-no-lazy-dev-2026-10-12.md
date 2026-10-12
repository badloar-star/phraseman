# Task packet: dev-сборщик отдаёт полный бандл — lazy=true убирается из запросов (инфраструктура съёмки)

Governance-ID: TG-06B972A91BDB
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10, срочно: сборщик дорастает до 6,5 ГБ за 2–3 мин и перезапускается).

## Outcome
В metro_crash/metro_015402.log 147 строк «Android Bundled … (745 modules)»: dev-client запрашивает бандл с
`lazy=true`, и каждый `import()` собирается отдельным бандлом на сотни модулей, а после force-stop — заново. Сборщик
растёт до 6,5 ГБ и падает; робот Сверки ловит timeout. EXPO_NO_METRO_LAZY=1 не помог (параметр ставит сам клиент в
URL). Теперь `server.rewriteRequestUrl` (сцеплённый с правилом Expo) меняет `lazy=true` → `lazy=false` в запросах
бандла — грузится один полный бандл, `import()` внутри него без дозапросов. Только dev-сервер; стор-экспорт не трогается.

## Scope
In: `metro.config.js` (блок server), тест. Out: стор-экспорт, список стор-заглушек (гейт заглушек читает его оттуда).

## Architecture
`rewriteRequestUrl = url => noLazy(expoRewrite(url))`; выключатель `PHRASEMAN_METRO_KEEP_LAZY=1`; при
EXPO_PUBLIC_STORE_RELEASE=1 правило не ставится. Лог одной строкой при загрузке конфига.

## Security and privacy
Без данных.

## Technical debt
Полный бандл дольше первой сборки (один раз), зато без сотни дозапросов.

## Verification
Конфиг грузится в node; гейт заглушек зелёный; тест чистой функции noLazy; координатор перезапускает сборщик.

## Rollback
`git revert` или `PHRASEMAN_METRO_KEEP_LAZY=1`.
