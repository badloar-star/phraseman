# Task packet: откат активной вкладки (сперва логи) + сторож JS-STALL без фона + dev-переключатель authFetch

Governance-ID: TG-22C218C3BE77
Governance-ID: TG-7E9855736D15
Governance-ID: TG-C04A72BCCA62
Status: В работе — коммит в окно 08:00
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

1) Сверка (tabs_tap_r7c): на один тап по вкладке 3–4 перерисовки с ОТКАТОМ активной вкладки к прежней через 100–400 мс после смены
   pathname (напр. «Обучение»: activeIdx 0→1 → pathname → 1→0 → 0→1). Источник неизвестен: TabSlider зовёт обработчики только на жесте.
   Сперва логи: [TABS-IDX] на КАЖДОЕ место, где меняется activeIdx/visualIdx (тап/goToTab — с верхом стека вызова в dev, свайп-старт,
   свайп-конец, эффект по маршруту — какая ветка и какое значение решило). Правка — только по фактам повтора Сверки.
2) Сторож [JS-STALL] (app/_layout.tsx, только dev): время в фоне (AppState ≠ active — окно выбора Google) не считается простоем;
   лог [JS-STALL] skipped_background ms=…
3) dev-переключатель флага auth_callables_fetch_v1 без перезапуска Metro: dev-ссылка `authFetch=on|off` (только память, только __DEV__),
   для замера входа (ensure_link/stamp) Сверкой. Прод-Remote Config не трогаем.

## Scope

In scope: `app/(tabs)/_layout.tsx` (трасса), `app/_layout.tsx` (сторож), `app/auth_callable_fetch.ts` + `app/dev_state_fixtures.ts` (dev-флаг).
Out of scope: логика переключения вкладок (до логов), прод-флаги.

## Architecture

Трасса — console.log с префиксом [TABS-IDX], без влияния на поведение; в проде молчит (флаг трассировки / __DEV__).

## Security and privacy

Не касается данных.

## Technical debt

- [TABS-IDX] временная — убрать после диагноза отката.

## Verification

Парс; сторожа вкладок (perf_freeze, tab_freeze_handoff, tabs_navigate_to_stable_contract, tabs_render_cascade_measure); типы затронутых файлов.

## Rollback

`git revert`.

## Итоги r7f (Сверка, 08:29) и шаг 2 — номер экземпляра

Каждый тап: тап → navigate → render (новая) → pathname → route_effect с pending=тап (no-op «1→1») → render со СТАРЫМИ
active/visual/page БЕЗ единой записи индекса → route_effect с pending=null, ставит обратно. Гипотеза: два экземпляра
ReleasedTabLayout (у второго своё состояние, тап он не получает, догоняет по pathname; общий журнал перемешивает их рендеры),
либо выброшенный рендер (ссылки active/visual/page присваиваются в фазе рендера). Шаг 2 (только логи, окно 09:00): `inst=` в
[TABS-RENDER]/[TABS-IDX] (prev для «changed» — свой на экземпляр), [TABS-INST] mount/unmount, [TABS-COMMIT] — что реально
показано (useLayoutEffect без зависимостей, тот же флаг трассировки). Починка — по фактам повтора.

