# Task packet: dev-модули R1 физически заменяются заглушками в стор-сборке (metro resolver)

Governance-ID: TG-72E4095B7CB0
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по решению координатора (12.10, по необязательной рекомендации ревью безопасности коммитов 5e5faa331/8ad3d691d)
Related epic/enabler: docs/work/tasks/dev-account-states-2026-10-12.md; store_release_stubs/; metro.config.js `storeReleaseDevModules`

## Outcome

Dev-переключатели для робот-съёмки (аккаунт, VIP/план, социальные, Карточки, Диалоги, пейвол) сейчас импортируются статически из боевого кода, поэтому мёртвый код попадает в стор-бандл. Результат: при `EXPO_PUBLIC_STORE_RELEASE=1` Metro подменяет эти модули пустыми заглушками с теми же runtime-экспортами, которые всегда возвращают «нет подмены» (null / false / исходный вид); в стор-бандле нет ни логики, ни строк `[DEV-STATE]`. Мера успеха: тест проверяет, что у каждой заглушки совпадают экспорты с настоящим модулем и все значения нейтральны, а metro.config.js подключает заглушки только в стор-сборке.

## Scope

In scope: `store_release_stubs/dev_state/*_stub.ts` (по одной на модуль: dev_account_state, dev_vip_override, dev_social_state, dev_cards_state, dev_dialog_state, dev_paywall_state, hub_lifecycle_probe); точечная правка `metro.config.js` (resolveRequest: подмена по имени файла при `EXPO_PUBLIC_STORE_RELEASE === '1'`); тест `tests/store_release_dev_state_stubs.test.ts`.

Out of scope: `app/dev_state_fixtures.ts` и `app/dev_state.tsx` (маршрут вырезан router.ctx.js и в графе стор-сборки отсутствует); любые правки dev-сборки; ограничение воркеров и прочие настройки metro.config.js.

## Architecture

Подмена идёт в `config.resolver.resolveRequest` до `defaultResolveRequest`: относительный импорт, чьё имя файла входит в таблицу, получает заглушку (импорты бывают `./x`, `../x`, `../app/x`, поэтому ключ — basename, а не строка импорта). Заглушки не импортируют ничего. Инвариант: набор runtime-экспортов заглушки равен набору настоящего модуля (тест) — иначе стор-сборка упала бы на недостающем экспорте.

## Security and privacy

Снижает поверхность: в стор-сборке нет кода подмены состояний аккаунта/покупок/входа. Новых данных и разрешений нет.

## Technical debt

Contain: тест паритета экспортов не даёт заглушке разойтись с модулем. Accept temporarily: заглушки живут до конца R1 вместе с модулями (владелец — координатор Сверки).

## Verification

`tests/store_release_dev_state_stubs.test.ts`; существующие тесты dev-модулей; `store_release_learning_v2_bundle_exclusion`; срез проверки metro.config.js синтаксисом (node --check); оценка влияния на сборку — прогон стор-экспорта делает владелец релиза (не запускаю).

## Rollback

Откат коммита: подмена только в стор-сборке, dev-сборка не затронута.
