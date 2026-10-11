# Task packet: тёплая ссылка на вкладку (phraseman://settings) — двойная навигация → падение Fabric addViewAt

Governance-ID: TG-98396D85714E
Status: Done (ждёт перепроверки Сверкой)
Owner: сессия «1 · Ядро» (координатор 11.10; воспроизведение — Сверка; падение в выпуске: переход из уведомлений).

## Outcome
Факт ([DEEPLINK-SETTINGS], 84b299248): redirectSystemPath отдал /(tabs)/settings — роутер открывает ссылку сам; через
1,3 с ветка open:tabs_replace сделала ещё router.replace на ту же вкладку (currentPath ещё /flashcards). Вкладка
настроек (заморожена в фоне 270 с) пересоздана дважды: unmount → mount → unmount через 924 мс → красный экран
«addViewAt: The specified child already has a parent». Починка: вкладка открывается так же, как прочие тёплые
ссылки — ждём, открыл ли роутер сам, и только если нет — переключаем вкладку сами (navigate, без пересоздания).

## Scope
In: `app/_layout.tsx`, эффект открытия тёплой ссылки (ветка вкладок). Out: холодная ссылка (root_replace), dev-маршруты.

## Architecture
Ветка вкладок использует общий таймер самопроверки (WARM_DEEP_LINK_SELF_OPEN_WAIT_MS): сравнение пути без групп
`(tabs)`; совпало — пропуск; нет — router.navigate(target). Логи: open:tabs_deferred / tabs_skip / tabs_navigate.

## Security and privacy
Без изменений; в логах значения параметров маскируются.

## Technical debt
- Contain: если роутер перестанет сам открывать тёплые ссылки, сработает самооткрытие через 400 мс (лог видно).

## Verification
Синтаксис, типы, тесты ссылок; воспроизведение Сверкой: тёплая phraseman://settings с /flashcards — один mount.

## Rollback
`git revert`.
