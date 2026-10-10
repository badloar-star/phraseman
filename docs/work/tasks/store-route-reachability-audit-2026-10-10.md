# Task packet: аудит достижимости маршрутов, вырезанных из стор-сборки

Governance-ID: TG-EA06A558690D
Status: Done (аудит); сторож — в общем прогоне .mjs-тестов
Owner: 1 · ЯДРО
Related epic/enabler: релизный пол Learning V2 (26e6d909d, 52d420253), координатор 23:30

## Outcome

Ни один экран магазинной сборки не ведёт в маршрут, физически вырезанный из неё регуляркой стор-режима
`router.ctx.js` (тупик «неизвестный маршрут» — класс дефекта кнопки «V2», 52d420253). Результат: список «дыра:
файл:строка → маршрут», исправление очевидных дыр по образцу 52d420253, спорные — в INBOX, и сторож-скрипт,
который падает при новой ссылке на вырезанный маршрут без условия стор-режима/DEV.

## Scope

In scope:
- `scripts/store_route_reachability.mjs` — статический аудит: вырезанные маршруты из `storeRouteRegex`
  (`scripts/visual_parity_gate.mjs`), ссылки на них в `app/ components/ hooks/ modules/ constants/ lib/`
  (router.push/replace/navigate, href, Redirect, pathname, строки маршрутов, setPage("v2")), условие рядом;
- тест-сторож `tests/store_route_reachability.test.mjs` с явным списком осознанных исключений;
- точечные правки очевидных дыр (обёртка условием, как 52d420253);
- результаты аудита — в этом файле (раздел «Результаты»).

Out of scope: удаление вырезанных экранов, изменение регулярки стор-режима, серверные push-шаблоны (только
отмечаются, если найдены пути).

## Architecture

No architecture change: аудит и сторож читают исходники; правки — условия видимости/навигации той же
константой стор-режима. Инвариант: из кода, достижимого в стор-сборке, нет безусловной навигации на маршрут,
который регулярка стор-режима не берёт.

## Security and privacy

Нет данных пользователей. Плюс: закрывает доступ к дев/админ-экранам из магазинной сборки, если такой найдётся.

## Technical debt

Contain: статический анализ эвристический (условие ищется в окне строк вокруг ссылки, имена флагов списком).
Спорные места фиксируются явным списком исключений с причиной; сторож падает на новой ссылке. Выход — при переносе
навигации в типизированную таблицу маршрутов заменить эвристику точной проверкой.

## Verification

`node scripts/store_route_reachability.mjs` (отчёт), `node --test tests/store_route_reachability.test.mjs`,
babel/точечные типы по исправленным файлам, сторожа исправленных экранов.

## Rollback

`git revert` правок условий (вернутся дыры) или сторожа; данных не касается.

## Результаты (2026-10-11)

**Вырезано регуляркой стор-режима — 15 файлов app/**: `learning-v2/course`, `learning-v2/intro-reader-fixture`,
`learning-v2/session/[id]`, `learning_v2_authoring_preview`, `learning_v2_direct_session_player_v1`,
`learning_v2_modes_showcase`, `learning_v2_modes_showcase_run/[family]`, `learning_v2_session_intro`,
`learning_v2_session_intro_check`, `pos_analytics_audit` и 5 приватных `_…` (в expo-router это не маршруты).
Имена `settings_testers`, `admin_*`, `vip_survey_dev_auth`, `flashcards_market_dev` есть в регулярке, но файлов уже нет.

**Дыры:**
- `app/(tabs)/lessons.tsx` — кнопка «V2» в переключателе страниц → карта V2 → занятие → `/learning-v2/session/[id]`.
  **Исправлено 52d420253.** Повтор аудита на версии до правки показывает ровно эту дыру
  (`lessons.tsx:5253 setPage("v2")`) — сторож её ловит.
- Других безусловных переходов на вырезанные маршруты нет.

**Закрыто условием (не дыры):**
- `lessons.tsx` openNewLessons `setPage("v2")` — `if (!LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY) return`.
- Дев-панель `components/dev/DevHubSheet.tsx` (`router.push(LEARNING_V2_MODES_SHOWCASE_ROUTE …)`) — `DevHubSheetGate`:
  `!ENABLE_DEV_TOOLS || IS_STORE_RELEASE → null`, и монтируется под `ENABLE_DEV_TOOLS` в `app/(tabs)/_layout.tsx`.
- Витрина движения — вход `app/motion_showcase.tsx` пускает только при `__DEV__ && !IS_STORE_RELEASE`.

**Осознанные исключения (в `ALLOWED` сторожа, с причиной):**
- `components/dev/` — реестр дев-витрины, рисуется только вырезанным `_motion_showcase.tsx`.
- `lessons.tsx` запуск занятия `pathname: "/learning-v2/session/[id]"` — живёт на странице V2, оба входа на неё закрыты.

**Не переходы (сравнения пути / классификаторы) — в сторе ничего не открывают:** `native_runtime_capability.ts`,
`navigation_back.ts`, `session_attempts/session_attempts_registry.ts`, `components/appArtBackdropRegistry.ts`.

**Внешние источники маршрутов:**
- push-уведомления: `serverPushTapRoute` — закрытый список по `data.type` (подписка, Шпиль); произвольный путь
  сервер подставить не может;
- опрос: `SURVEY_APP_ROUTES` + `isSurveyAppRoute` (чужой маршрут отбрасывается с логом `[SURVEY-FOLLOWUP]`);
  все 10 экранов списка существуют, вырезанных среди них нет;
- диплинки: `app/+native-intent.tsx` в стор-режиме переписывает LV2-ссылки на `/(tabs)/lessons` (5208af074).

**Сторож:** `scripts/store_route_reachability.mjs` (отчёт, код 1 при дыре) + `tests/store_route_reachability.test.mjs`
(5/5, входит в общий прогон `.mjs`-тестов `tests/*.test.mjs`): боевой код без дыр; синтетическая безусловная
ссылка — дыра; с `IS_STORE_RELEASE` — нет; лог-блок `if (__DEV__) {` условием не считается; сравнение пути
переходом не считается.

**Ограничения эвристики (Contain):** условие ищется в окне 40 строк выше перехода; маршрут из переменной,
собранный не из строки-префикса (как `constants/devRoutes.ts` — `routeName('learning','v2',…)`), сторож не видит —
такие места проверены вручную выше (только дев-панель за двойными воротами).
