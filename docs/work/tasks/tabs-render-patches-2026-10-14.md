# Task packet: заготовка 4 патчей каскада перерисовок вкладок (до прогона №7)

Governance-ID: TG-42749AD123A5
Status: Патчи готовятся в docs/phraseman-2.0/handoff/TABS_RENDER_<n>.patch; в app/ НЕ применяются до подтверждения [TABS-RENDER] changed=… в прогоне №7
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

По карте `docs/work/tasks/tabs-render-cascade-plan.md` — четыре независимых патча, каждый со своим тестом:
1. `navigateTo` читает pathname/segments/router из ref → `handleTabChange`/`handleSwipeComplete` стабильны → `TabContext.value` не меняется на смене маршрута.
2. `focusTick` — в своём контексте (`useTabFocusTick()`), `useTabNav()` его больше не отдаёт → возврат фокуса не будит экраны, которым он не нужен.
3. `ReleasedTabLayout` под `React.memo` (пропсов нет) → перерисовка родителя `TabLayout` по `usePathname` не тянет разметку.
4. `TabPane`/`LessonsPaneBoundary` под `React.memo`, содержимое вкладок — отдельные `useMemo` → смена `physicalPageIdx` не пересоздаёт панели.

## Scope

In scope: `app/(tabs)/_layout.tsx`, `app/TabContext.tsx`, строки `useTabNav()` в `app/(tabs)/{home,lessons,friends,settings}.tsx`, новые тесты.
Out of scope: `components/ThemeContext.tsx` (зона Тем), логика навигации, вид.

## Architecture

Только стабилизация ссылок и мемоизация; поведение навигации и заморозки вкладок не меняется.

## Security and privacy

Не касается данных. Приватность вкладки Уроков (`LessonsPaneBoundary`, эпоха) не меняется — memo пропускает рендер только при равных пропсах, своё состояние и подписка работают как раньше.

## Technical debt

- Поведенческого рендер-теста всего каркаса вкладок нет (тяжёлое дерево) — контракты исходника + рендер-тест TabContext.
- `home.tsx` в рабочей копии правится другой сессией — патч 2 собран против текущей рабочей копии, перед применением `git apply --check`.

## Verification

На копиях (overlay чтения файлов) с каждым патчем отдельно и со всеми четырьмя вместе: новые тесты + perf_freeze_contract, layout_stability_contract,
tab_freeze_handoff_contract и все тесты, читающие `(tabs)/_layout.tsx` или `focusTick`. Требование: N passed, N>0, PASS = числу файлов. babel-парс каждого файла.

## Results (15.10, на копиях, рабочая копия app/ не тронута)

- Патчи: `docs/phraseman-2.0/handoff/TABS_RENDER_{1,2,3,4}.patch`; `git apply --check` каждого против рабочей копии — чисто;
  все четыре подряд на копии = ровно проверенный вариант (diff без учёта концов строк пуст).
- Типы (TS compiler API с подменой 6 файлов): исходные 0 ошибок, все четыре патча 0 ошибок.
- Тесты (подмена чтения файлов через setupFilesAfterEnv, тесты — временные копии tests/zz_tmp_tr_*, удалены):
  - эталон без патчей: 17/17 наборов, 107 passed;
  - все четыре: основной раннер 20/20, 115 passed + RNTL 1/1, 7 passed;
  - отдельно: №1 4/4 (33), №2 17/17 (107) + RNTL 7/7, №3 4/4 (32), №4 4/4 (33) — с perf_freeze, layout_stability, tab_freeze_handoff;
  - контроль: новые тесты на непропатченных файлах краснеют (RNTL 7 failed из 7; контракты 1–3–4 — 7 failed из 8).
- Догнано 15.10 (по слоту GO): `settings_root_liquid_glass_source_contract.test.mjs` (node --test с подменой чтения) — base / №2 / все: 10/10 pass;
  сторож реестра рендер-тестов (копия, видящая файлы патча №2): PASS; контроль «тест есть, регистрации нет» — FAIL с обеими подсказками (сторож не слепой).
- Нарушение светофора: первая проверка типов ушла без слота (цикл ожидания не прерывался на WAIT) — скрипт исправлен, дальше только по GO.

## Rollback

`git apply -R` соответствующего патча.
