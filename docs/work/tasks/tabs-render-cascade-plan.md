# План: каскад перерисовок разметки вкладок (layout:tabs 13–14×/переход) — карта причин до прогона №7

Status: Подготовка, только чтение (координатор 14.10). Код не правился.
Owner: 5 · АВТОРИЗАЦИЯ
Цель починки: 1–2 рендера разметки на переход, < 200 мс (сейчас 13–14 × 575–665 мс, 4,3–6,3 с суммарно после крестика пейвола).

Файл: `app/(tabs)/_layout.tsx` — `TabLayout` → `TabBarVisibilityProvider` → `TabRenderProbe "layout:tabs"` → `ReleasedTabLayout`
→ `TabProvider` → `TopFadeScrollProvider` → `TabScaffold` → `TabSlider` (`app/TabSlider.tsx`) → `tabScreens` (TabPane ×5).

## 0. Сначала разделить ДВА счётчика — иначе починка будет вслепую

`TabRenderProbe id="layout:tabs"` — это React `Profiler` вокруг ВСЕГО поддерева `ReleasedTabLayout`, включая `TabScaffold`,
`TabSlider`, таббар и сами панели. Его `onRender` срабатывает на ЛЮБОЙ коммит внутри, даже если сам `ReleasedTabLayout` не вызывался.
`[TABS-RENDER] #N` печатается ТОЛЬКО при вызове функции `ReleasedTabLayout`.

| Наблюдение в прогоне №7 | Вывод |
|---|---|
| `[TABS-RENDER]` ≈ 13–14 строк на переход | каскад в самом `ReleasedTabLayout` → разделы 1–4 |
| `[TABS-RENDER]` 1–3, а `layout:tabs` 13–14 | рендерится НИЖЕ: `TabScaffold` / `TabSlider` / панели по своим подпискам → раздел 5 |
| `layout:tabs` actualDuration большой, а `tab:*` дешёвые | тяжёлое — сам каркас (`TabScaffold`/`TabSlider`/таббар), не экраны |

Как считать: `grep -c "\[TABS-RENDER\]"` и число `[TAP-LAT] … layout:tabs` между `[PAYWALL-CLOSE] via=` и следующим `tab_tap`/простоем.

⚠️ Ограничение трассы: `traceTabsRenderWhy` НЕ печатает `height`, safe-area insets, `lang`, контексты `TabBarVisibility`/`TopFadeScroll`
и состояние внутри хуков. Строка `changed=none (parent/context)` поэтому значит одно из:
(а) перерисовался родитель `TabLayout` (п. 1.1); (б) сработал контекст/хук, который в трассе не виден (п. 1.2–1.4).
Если таких строк много — первым шагом (до починки) добавить в трассу `height` и `insets.top/bottom` из тех же хуков.

## 1. Что перерисовывает `ReleasedTabLayout` снаружи

### 1.1 Родитель `TabLayout` подписан на `usePathname()`
`TabLayout` читает `pathname` только ради редиректа турниров, но перерисовывается на КАЖДУЮ смену маршрута
(открыть пейвол, закрыть пейвол, любой push поверх вкладок). Каждый раз создаётся новый элемент `<ReleasedTabLayout />`,
а он не `memo` → полный рендер, даже если для вкладок ничего не поменялось.
- Как проверить: строка `[TABS-RENDER]` с `changed=pathname:…` (сам `ReleasedTabLayout` тоже подписан на `usePathname`) —
  значит одна; но если рядом стоят строки `changed=none (parent/context)` в тот же `t=` — это дубль от родителя.
- Что сделать: `const ReleasedTabLayoutMemo = React.memo(ReleasedTabLayout)` (пропсов нет → родитель больше не тянет).
  Риск минимальный: собственные подписки (`usePathname`, контексты) продолжают работать.

### 1.2 `usePathname()` / `useSegments()` (expo-router) в самом `ReleasedTabLayout`
Нужны (вкладка по URL). Но `useSegments()` отдаёт НОВЫЙ массив при каждом обновлении состояния навигации, а `segments`
стоит в зависимостях `useLayoutEffect` (строка ~1027) и `navigateTo` (~1136).
- Как проверить: в трассе печатается `segments.join('/')` — тождество массива не видно. Если `changed=none` идёт пачкой во время
  анимации модалки — подозревать обновления state навигатора (transitionStart/End, `__unsafe_action__`), а не маршрут.
  Сверить с `[PERF-R1-NAV]` (`useNavActionTrace`) по `t=`.
- Что сделать: держать стабильный ключ `const segKey = segments.join('/')` и зависеть от него (сегменты читать из ref);
  `navigateTo` перевести на `pathnameRef/segmentsRef` (см. п. 3.1).

### 1.3 `useScreen()` (`hooks/use-screen.ts`) = `useWindowDimensions()` + `useStableSafeAreaInsets()`
Ресайз окна/клавиатура/статус-бар при модалке дают новый `height` или `insets` → рендер. В трассе только `width`.
- Как проверить: `changed=width:…` — видно; `changed=none` при открытии/закрытии модалки — кандидат на `height`/insets.
- Что сделать: `ReleasedTabLayout` нужен только `width` → заменить `useScreen()` на точечный селектор ширины
  (например, `useWindowDimensions().width` всё равно перерисует на height — нужен свой хук-подписчик `Dimensions.addEventListener`,
  который делает setState только при смене width).

### 1.4 `useTheme()` и `useStudyTarget()`
- Как проверить: `changed=theme:#a→#b` (печатается тождество объекта) — значит провайдер темы пересоздаёт `theme` без смены темы;
  `changed=studyTarget:…` — смена языка (ожидаемо, редко).
- Что сделать (если theme скачет): в `ReleasedTabLayout` использовать только `t.bgPrimary` (он и так единственный в `tabScreens`) —
  чинить в `components/ThemeContext.tsx` мемоизацию `theme` (это чужая зона — Темы, через координатора).

### 1.5 `useRouter()`
- Как проверить: `changed=router:#a→#b`. Если меняется — каждое изменение пересоздаёт `navigateTo` → п. 3.1 каскадом.
- Что сделать: `router` уже лежит в `routerRef` — в `navigateTo` читать `routerRef.current`, из зависимостей убрать.

## 2. Собственный state `ReleasedTabLayout` (setState в эффектах и обработчиках)

| State | Кто ставит | Сколько рендеров на переход | Как увидеть в трассе | Что сделать, если лишнее |
|---|---|---|---|---|
| `focusTick` | `useFocusEffect` (каждый возврат фокуса группе вкладок — в т.ч. закрытие пейвола) | +1 у себя и +N у всех потребителей `useTabNav` (п. 3) | `changed=focusTick:k→k+1` | `focusTick` читают `home.tsx`, `lessons.tsx`, `friends.tsx`, `settings.tsx` (+ `home_video_load_pipeline.ts`); `community.tsx`, `lingman_videos.tsx`, `SpireHomeScreen.tsx` — нет, но будятся; если — отдельный контекст/подписка, а не поле общего `TabContext` |
| `activeIdx` / `visualIdx` / `physicalPageIdx` | тап (`handleTabChange` — три setState подряд), свайп (`handleSwipeStart` + `handleSwipeComplete`), `useLayoutEffect` по URL | в обработчике React батчит → 1; но `useLayoutEffect` ПОСЛЕ смены `pathname` может поставить их ещё раз → +1 синхронный перерендер до paint | `changed=visualIdx:… activeIdx:…` в соседних `#N` с одинаковым `t=` | эффект уже сравнивает с ref и не ставит равное; лишний рендер будет только если URL отстаёт от тапа — смотреть `pendingTabIdxRef` |
| `visitedTabs` / `mountedTabs` | `mountNow` (visited сразу, mounted через 2 rAF), `scheduleMount` (премаунт цепочкой 4 шага), `useLayoutEffect` | `mountNow` = 2 отдельных рендера (кадр shell + кадр экрана) — по задумке; премаунт = до 4 рендеров после старта | `changed=visited:a→b`, `mounted:a→b` | `addVisitedTab` возвращает прежний Set, если индекс уже есть, — равные setState не рендерят. Если на ПЕРЕХОДЕ (не на старте) видны `mounted:` — премаунт совпал с закрытием пейвола: отложить шаг цепочки при активной навигации (условие «тихого окна» дополнить флагом перехода) |
| `devHubVisible` | только Dev Hub | 0 | `changed=devHubVisible` | — |

## 3. Что `ReleasedTabLayout` отдаёт вниз нестабильным

### 3.1 🔥 Главный подозреваемый: `navigateTo` → `handleTabChange`/`handleSwipeComplete` → `TabContext` целиком
`navigateTo = useCallback(…, [pathname, segments, router])`. Значит при КАЖДОЙ смене маршрута (открыть пейвол, закрыть пейвол)
пересоздаются `handleTabChange` и `handleSwipeComplete` → в `TabProvider` меняются `goToTab`, `goHome`, `onSwipeComplete` →
новый `value` контекста → перерисовываются ВСЕ потребители `useTabNav()` в незамороженных панелях:
`app/(tabs)/home.tsx`, `lessons.tsx`, `community.tsx`, `friends.tsx`, `settings.tsx`, `app/lingman_videos.tsx`,
`components/spire/SpireHomeScreen.tsx`, сам `TabScaffold` (+ `TabSlider` получает новый `onTabChange`).
Это даёт рендер панелей БЕЗ строк `[TABS-RENDER]` — классический каскад «дешёвый каркас, дорогие дети».
- Как проверить: в прогоне №7 после `[PAYWALL-CLOSE]` — `[TABS-RENDER] changed=pathname:/premium_modal→/home …` и сразу за ним
  `[TAP-LAT] tab:home / tab:lessons …` коммиты в тот же `t=`. Плюс `changed=segments:…` в паре с ним.
- Что сделать (одно окно, без изменения поведения): `navigateTo` читает `pathname/segments/router` из ref
  (`pathnameRef.current = pathname` на рендере, как уже сделано для `routerRef`), зависимости `[]`. Тогда
  `handleTabChange`/`handleSwipeComplete` стабильны навсегда, `TabContext.value` меняется только от `activeIdx`/`focusTick`/`runtimeOwnerId`.
  Защита от гонки уже есть: `routerShowsTab(pathname…)` будет читать актуальный ref на момент вызова — так даже точнее, чем замыкание.
- Сторож после починки: тест «`navigateTo` объявлен с пустыми зависимостями» + тест, что `TabProvider` value не меняется при смене только `pathname`.

### 3.2 `focusTick` в том же `TabContext`
См. п. 2: каждый возврат фокуса будит всех потребителей контекста, даже тех, кому он не нужен.
- Как проверить: `changed=focusTick` + коммиты `tab:*` в тот же `t=`.
- Что сделать: вынести `focusTick` в отдельный маленький контекст (`TabFocusTickContext`) — потребители `useTabNav` без него не будят.

### 3.3 `tabScreens` (`useMemo`)
Зависимости: `activeIdx, mountedTabs, openDevHub, pageLayout, physicalPageIdx, t.bgPrimary, tabPaneWidth, visitedTabs`.
`pageLayout` — константа из `tabPageLayoutFor` (FULL / LESSONS_HIDDEN), `openDevHub` стабилен. Пересоздаётся только от
реальных изменений; но `physicalPageIdx` в зависимостях — на каждом переходе новые элементы ВСЕХ пяти `TabPane`
(внутри `freezeWanted` считается от него). `TabPane` не `memo` → каждая панель получает рендер обёртки (дети с тем же
тождеством React пропускает, но `TabPane` + `Freeze` + `Profiler` вызываются).
- Как проверить: `changed=physicalPageIdx:…` и `[TAP-LAT] tab:*` коммиты с малым actualDuration на всех вкладках.
- Что сделать: `TabPane = React.memo(TabPane)` (пропсы: `freezeWanted` boolean + стабильный `children`); детей вынести в
  отдельный `useMemo` на вкладку, чтобы `children` был стабилен при смене только `physicalPageIdx`.

### 3.4 `TabScaffold` не `memo`, `TabSlider` не `memo`
Каждый рендер `ReleasedTabLayout` → `TabScaffold` (свои 9 хуков: `useLang`, `useScreen`, `useStableSafeAreaInsets`, `useTabNav`,
`useTopFadeScroll`, `useReduceMotion`, `useTabBarVisibility`, `useCommunityTabDot`) → `TabSlider` → `V2TabBar`.
Пропсы `TabScaffold`: `tabScreens` (п. 3.3), `currentRouteIsTab` (boolean, меняется при пейволе: true→false→true — это 2 рендера по делу),
`visualIdx`, `physicalPageIdx`, `pageLayout`, `devHubVisible`, `onCloseDevHub`, `onOpenDevHub` — все стабильны.
- Как проверить: если [TABS-RENDER] мало, а `layout:tabs` много — рендерится `TabScaffold` по своим подпискам.
  Временно (до починки) добавить `traceTabsRenderWhy`-аналог в `TabScaffold` под тем же флагом: `lang, insets.top, PB, activeIdx, tabBarHidden, communityDot, reduceMotion`.
- Что сделать: `React.memo(TabScaffold)`; подписки, которые меняются во время модалки (`useTabBarVisibility`, insets), — смотреть по трассе.

## 4. Порядок починки после прогона №7 (одно окно)

1. Посчитать по разделу 0: где каскад — в `ReleasedTabLayout` или ниже.
2. Если есть `changed=pathname`/`segments`/`router` + коммиты `tab:*` в тот же `t=` → п. 3.1 (ref вместо зависимостей). Ожидание: −N рендеров панелей на каждую смену маршрута.
3. Если есть `changed=focusTick` + коммиты `tab:*` → п. 3.2.
4. Если много `changed=none (parent/context)` → п. 1.1 (`memo` на `ReleasedTabLayout`), затем добавить в трассу `height`/insets (п. 1.3).
5. Если `layout:tabs` ≫ `[TABS-RENDER]` → п. 3.4 (трасса в `TabScaffold`, затем `memo`).
6. `physicalPageIdx` → п. 3.3 (`memo` на `TabPane`).

После починки: прогон тот же (`EXPO_PUBLIC_TAP_LATENCY_TRACE=1`, закрыть пейвол крестиком ×3), цель — `layout:tabs` 1–2 коммита
на переход и суммарно < 200 мс. Временную трассу `[TABS-RENDER]` убрать, `[TAP-LAT]`-профайлеры оставить под флагом.

## 5. Риски починки

- `memo` и ref вместо зависимостей не меняют поведение навигации, но `routerShowsTab` начнёт читать маршрут на момент тапа, а не
  на момент последнего рендера — это исправляет, а не ломает (поздний рендер больше не держит устаревший `pathname`).
- Сторожа, которые могут сработать: `tests/perf_freeze_contract.test.ts` (заморозка вкладок), `tests/layout_stability_contract.test.ts`,
  тесты TabContext/навигации вкладок (`grep -l "TabProvider\|useTabNav" tests/`). Прогнать до коммита.
- `ThemeContext` (п. 1.4) — зона «4 · ТЕМЫ», только через координатора.
