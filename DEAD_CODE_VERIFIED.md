# DEAD_CODE_VERIFIED — финальный вердикт перед удалением

> Каждый кандидат проверен по 8 каналам использования: статический импорт, JSX-тег, динамический import/require, реестр/map по строке-ключу, маршруты expo-router, deeplink/scheme, тесты, транзитивные зависимости. Плюс для пакетов — нативный autolinking.
>
> Источник: глубокая адверсариальная проверка 36 файлов-сирот + 7 npm-пакетов.

---

## 1. ✅ ТОЧНО МЁРТВОЕ — безопасно удалять (verdict=dead, risk none/low)

| path | как проверено | риск |
|------|---------------|------|
| `components/AnimatedFrame.tsx` | 0 импортов; только сам ре-экспортит AnimContext, но его самого никто не тянет | none |
| `components/AnimContext.tsx` | мёртв транзитивно — ре-экспортится только из мёртвого AnimatedFrame | none |
| `components/ArenaConfettiBurst.tsx` | 0 по всем 8 каналам; похожая логика конфетти в pack_opening.tsx, но это её собственный код | none |
| `components/ClubResultModal.tsx` | ре-экспорт `../app/LeagueResultModal`; коммент про settings_testers/pack_opening устарел — grep по ним пуст | low |
| `components/CustomSplash.tsx` | 0 импортов; expo-splash-screen в app.json использует статичную картинку, а не этот компонент | none |
| `components/ExplainButton.tsx` | 0 в production; тест explain_sheet.test.ts ждёт импорт в DailyPhraseCard, но его там нет; упомянут лишь в комментарии ExplainSheet.tsx:100 | low |
| `components/LingmanCertificateTextPanel.tsx` | 0 по всем 8 каналам (только docs/atlas) | high* |
| `components/MasteryReplayModal.tsx` | положительных использований нет; тесты mastery_replay.test.ts:172,175 — ОТРИЦАТЕЛЬНЫЕ (проверяют, что его НЕТ в lesson_menu/lesson_complete) | low |
| `components/MedalIcon.tsx` | только в сгенерированных atlas.viewer.html / atlas.full.json; простой рендер эмодзи | none |
| `components/PersonalPlanCard.tsx` | экспортится, но не импортируется; только в docs/ONBOARDING_* | none |
| `components/paywallGlass.ts` | функции paywallGlassAlpha/Color/withColorAlpha не импортятся; в тестах — отрицательные ассерты (НЕ должны появляться) | none |
| `components/paywallModalPalette.ts` | константа PAYWALL_MODAL нигде не импортится; остаток заброшенного редизайна пейвола | none |
| `components/adaptiveBackgroundAssets.ts` | 3 экспортируемые функции, 0 потребителей; самоссылки внутри файла | low |
| `components/modal_fx/modalAccents.ts` | 0 импортов; не тянется даже из ModalFx.tsx | low |
| `components/modal_fx/ModalFx.tsx` | 0 импортов всех экспортов (FloatingShards, RaysHalo и т.д.); цепочка потребления мертва (modalAccents тоже сирота) | low |
| `components/theory/AccordionTheory.tsx` | 0 импортов; живут соседи LessonIntroScreens/TheoryLessonView, но не этот | low |
| `components/ui/EmptyState.tsx` | 0 JSX `<EmptyState>`; строка 'shouldShowEmptyState' в типах ≠ компонент | low |
| `components/ui/ThemedInput.tsx` | 0 импортов; только тип ThemedInputProps в именах, без реального использования | low |
| `components/HexScore.tsx` | 0 по всем каналам; только в atlas.full.json | none |
| `components/SvgLevelHex.tsx` | 0 по всем каналам; сложный HSL-градиент, но не используется; только atlas.full.json | none |
| `components/ui/collapsible.tsx` | 0 импортов Collapsible; тянет IconSymbol, но сам никем не востребован | low |
| `hooks/use-color-scheme.web.ts` | 0 импортов; родитель use-color-scheme.ts тоже не используется | low |
| `hooks/use-matchmaking.ts` | заменён MatchmakingContext (живёт useMatchmakingContext); 0 импортов; есть в DEAD_CODE_REPORT.md | low |
| `hooks/use-user-profile.ts` | 0 в live-коде; только в docs-примерах ONBOARDING_*; orphan в DEAD_CODE_REPORT.md | low |
| `components/LessonHexProgress.tsx` | 0 импортов; единственная ссылка — комментарий в lesson1.tsx:359 (не код); голова мёртвого hex-кластера | low |

> *По `LingmanCertificateTextPanel.tsx` исходный аудит проставил deleteRisk=high, но usageFound=none и 0 по всем 8 каналам — это **противоречие**. Высокий «риск» здесь, видимо, означал «жалко удалять / сложный компонент», а не «есть использование». Реальный риск удаления — низкий. Перед удалением бегло глянуть глазами на случай отложенной/нативной загрузки (см. раздел 2-bis).

---

## 2. ⚠️ СПОРНОЕ — НЕ удалять без ручной проверки (verdict=uncertain)

| path | что смутило | что посмотреть глазами |
|------|-------------|------------------------|
| `components/MistakeEli5Modal.tsx` | контракт-тест lesson_ai_mistake_card_contract.test.ts:30 требует `toContain('MistakeEli5Modal')` в lesson1.tsx, но компонент там не импортирован; описан в use_mistake_explain.ts:10,47 как часть API | Открыть lesson1.tsx и use_mistake_explain.ts: это недоделанная фича или удалённый по полпути компонент? Если тест зелёный без импорта — он проверяет строку в комменте. Решить судьбу теста ВМЕСТЕ с компонентом. |
| `components/ScreenArtBackdrop.tsx` | строкой упомянут в ScreenGradient.tsx:204 (`EXPLICIT_ART_BACKDROP_COMPONENT_NAMES`) для runtime-детекта по displayName/name; сам в JSX 0 раз | Проверить ScreenGradient.tsx:204: реально ли в детях бывает этот backdrop? Если ни один экран его не рендерит — детект-сет тоже мёртвый, удалять пару (компонент + строку в сете) синхронно. |
| `components/ShardsEarnedModal.tsx` | заменён GlobalShardsEarnedHost (событие 'shards_earned' → ActionToast); контракт-тест modal_opaque_surfaces_contract.test.ts:25 читает исходник файла; упомянут в _admin_settings_testers.tsx:4673 (коммент-дока) | Убедиться, что нет legacy deeplink на этот модал; решить, нужен ли контракт-тест после удаления. Удалять файл + правку теста вместе. |
| `hooks/use-color-scheme.ts` | ре-экспорт useColorScheme из react-native; ни он, ни .web.ts не импортятся; но это compat-слой — бандлер мог ждать пары | Проверить metro/babel-конфиг и tsconfig paths: не ждёт ли кто `@/hooks/use-color-scheme`. Если нет — удалять ПАРУ (.ts + .web.ts) вместе. |
| `components/ui/icon-symbol.tsx` | импортится ТОЛЬКО из collapsible.tsx (мёртвого), НО это platform-stub (Android/web), парный к .ios.tsx; бандлер Expo может грузить по суффиксу | Решать в связке с .ios.tsx и collapsible. Если collapsible удаляем — этот тоже сирота. Но сначала grep IconSymbol по всему репо ещё раз: вдруг используется вне collapsible. |
| `components/ui/icon-symbol.ios.tsx` | platform-specific (.ios.tsx), грузится бандлером по суффиксу; статических импортов 0; expo-symbols (SymbolView) | Та же связка icon-symbol. Удалять icon-symbol.* можно только если удаляется collapsible И больше нигде IconSymbol не нужен. Иначе сломается iOS-сборка. |
| `node_modules/expo-blur` | установлен, но НАМЕРЕННО отключён 3 контракт-тестами (premium UI = статичные градиенты, не real-time blur) | Не «мёртвый», а «запрещённый по контракту». Не трогать как обычную сироту — это осознанное решение по перфомансу. Удаление пакета может потребовать снять контракт-тесты. |

### 2-bis. Контрактные/тестовые «маяки» — отдельная осторожность

Несколько файлов из раздела 1 удерживаются **тестами, читающими исходник** (а не импортирующими модуль). Это «живые контракты на реализацию». При удалении файла надо **в той же правке** удалить/поправить тест, иначе CI покраснеет:

- `MasteryReplayModal.tsx` ← mastery_replay.test.ts (отрицательный контракт) + heisenberg_pipeline.test.ts (локализация)
- `ShardsEarnedModal.tsx` ← modal_opaque_surfaces_contract.test.ts:25 (читает файл)
- `paywallGlass.ts` ← arena_limit_modal_locale_runtime.test.ts (отрицательный ассерт)
- `ExplainButton.tsx` ← explain_sheet.test.ts (ждёт импорт, которого нет)

---

## 3. ❌ ЖИВОЕ — вычеркнуть из списка на удаление (первый аудит/knip ошибся)

| path | где используется |
|------|------------------|
| `components/ActiveBoostBar.tsx` | tests/owner_direction_runtime_contract.test.ts:158, 303-310 — runtime-контракт на setInterval (idle-таймер при отсутствии бустов). Test-only, но контрактный — реализация защищена тестом. **Production-импортов 0** — формально кандидат на удаление, но только синхронно с тестом. См. примечание ниже. |
| `components/HomeTheoAdvisorCard.tsx` | tests/owner_direction_runtime_contract.test.ts:161 — контракт на 1 setInterval (typewriter). Прямого импорта в компонентах не нашли → возможна динамическая загрузка/регистрация. Не удалять до выяснения точки монтирования. |
| `components/adaptiveBackgroundAssets.generated.ts` | adaptiveBackgroundAssets.ts:4 (статический импорт) + tests/adaptive_background_assets.test.ts:17. **НО** родитель adaptiveBackgroundAssets.ts сам мёртв (раздел 1) → живёт только за счёт мёртвого родителя + теста. Удалять ВСЮ связку вместе (см. раздел 5). |
| `components/FlatTopHexFill.tsx` | components/LessonHexProgress.tsx:3 + JSX 63-72. **НО** LessonHexProgress сам мёртв (раздел 1) → живёт только за счёт мёртвого родителя. Часть hex-кластера на удаление (см. раздел 5). |
| `modules/phrase-widget/constants.ts` | транзитивно через index.ts → app/widget_bridge.ts:28 → app/_layout.tsx:125. Критическая точка синхронизации JS↔native (iOS Swift / Android Kotlin Glance widget). **НЕ удалять.** |

> ⚠️ Важная оговорка по «alive» в этом разделе. Тут смешаны два разных «живых»:
> - **По-настоящему живые:** `modules/phrase-widget/constants.ts`, `HomeTheoAdvisorCard.tsx` (вероятно). Вычёркиваем из удаления.
> - **«Живые» только за счёт мёртвого/тестового окружения:** `ActiveBoostBar.tsx` (только контракт-тест), `adaptiveBackgroundAssets.generated.ts` (мёртвый родитель + тест), `FlatTopHexFill.tsx` (мёртвый родитель). Это **псевдо-живые** — реально удаляемы, но только вместе со своим кластером/тестом. Первый аудит верно пометил их alive по факту наличия импорта, но не учёл, что импортёр сам труп.

---

## 4. ПАКЕТЫ (npm) — отдельно, с акцентом на autolink-риск

### 4a. ✅ Точно safe удалять

| пакет | проверено | риск |
|-------|-----------|------|
| `ts-fsrs` | 0 импортов/require по app/components/tests/functions/modules; нет в app.json/babel/metro; нет peer-зависимостей; нет нативного autolinking | none |
| `@gorhom/bottom-sheet` (+ `@gorhom/portal`) | 0 импортов BottomSheet по всему репо; приложение использует свою expo-router таб-навигацию; нет в plugins/babel/metro | none |

### 4b. ❌ Живые через нативный autolinking — НЕ удалять

| пакет | почему живой |
|-------|--------------|
| `lottie-react-native` | нативный autolink: android/build/generated/autolinking/autolinking.json содержит LottieAnimationViewComponentDescriptor. 0 JS-импортов, но нативный слой подключён → удаление сломает Android-сборку. |
| `@react-navigation/bottom-tabs` | транзитивно требуется expo-router@6.0.23 (`^7.4.0`), npm ls: 7.15.5. Удаление сломает дерево зависимостей expo-router. |
| `@react-navigation/elements` | peer для bottom-tabs@7.15.5 и native-stack@7.14.5. Дедуп в одну версию. Транзитивно обязателен. |

### 4c. ⚠️ Проверять пересборкой — НЕ удалять «на глаз»

| пакет | нюанс | что сделать |
|-------|-------|-------------|
| `react-native-view-shot` | нативный autolink (RNViewShotPackage в autolinking.json); 0 JS-импортов; тест stats_premium_blur_performance_contract.test.ts:15 ЗАПРЕЩАЕТ использование | Снять с list-to-delete по умолчанию. Если решат убирать — только через чистую нативную пересборку Android+iOS и прогон контракт-теста. |
| `expo-blur` | установлен, но 3 контракт-теста запрещают импорт (perf-решение: статичные градиенты вместо blur) | Не обычная сирота. Удаление = снять контракт-тесты + пересборка. Лучше оставить как «осознанно отключённый». |

> **Главное правило по пакетам:** пакет без JS-импортов ≠ мёртвый. Сначала проверять `android/build/generated/autolinking/autolinking.json` и `npm ls`. Из 7 пакетов реально safe только 2 (`ts-fsrs`, `@gorhom/bottom-sheet`).

---

## 5. ТРАНЗИТИВНЫЕ КЛАСТЕРЫ — удалять только целиком

Файлы, мёртвые **только вместе**: A импортирует лишь B, оба — сироты. Удалять по одному нельзя (сломается импорт), но и держать незачем.

### Кластер A — анимационная обёртка
```
AnimatedFrame.tsx  ──ре-экспорт──▶  AnimContext.tsx
```
Оба сироты. Удалять парой.

### Кластер B — hex-прогресс урока
```
LessonHexProgress.tsx ──▶ FlatTopHexFill.tsx
        (мёртв)              ("alive", но только из мёртвого родителя)
HexScore.tsx          (сирота)
SvgLevelHex.tsx       (сирота)
```
DEAD_CODE_REPORT.md:62: «весь кластер не используется ни одним экраном». Удалять 4 файла вместе: `LessonHexProgress.tsx + FlatTopHexFill.tsx + HexScore.tsx + SvgLevelHex.tsx`. FlatTopHexFill помечен alive ошибочно — его единственный потребитель сам труп.

### Кластер C — адаптивные фоны
```
adaptiveBackgroundAssets.ts  ──▶  adaptiveBackgroundAssets.generated.ts
        (мёртв)                      ("alive": импорт из мёртвого .ts + тест)
```
+ хвост: tests/adaptive_background_assets.test.ts. Удалять связку (.ts + .generated.ts + поправить/удалить тест). .generated помечен alive ошибочно — живёт за счёт мёртвого родителя.

### Кластер D — modal_fx
```
ModalFx.tsx  ──(должен бы тянуть)──▶  modalAccents.ts
```
Оба сироты, друг друга по факту не потребляют, но логически парные. Удалять папку `components/modal_fx/` целиком.

### Кластер E — icon-symbol / collapsible (СПОРНЫЙ, см. раздел 2)
```
collapsible.tsx ──▶ icon-symbol.tsx  (+ платформенный icon-symbol.ios.tsx)
   (мёртв)            (uncertain)         (uncertain)
```
collapsible мёртв → icon-symbol.* становятся сиротами. НО platform-suffix (.ios/.android) грузится бандлером Expo — перед удалением убедиться, что IconSymbol больше нигде не нужен. Удалять тройкой `collapsible.tsx + icon-symbol.tsx + icon-symbol.ios.tsx` ТОЛЬКО после ручной проверки.

### Кластер F — use-color-scheme (СПОРНЫЙ, см. раздел 2)
```
use-color-scheme.ts  +  use-color-scheme.web.ts
```
Compat-слой над react-native. Удалять пару вместе, предварительно проверив, что metro/babel/tsconfig не ждут этот ре-экспорт.

---

## 6. ИТОГОВЫЕ ЧИСЛА — насколько можно доверять первому аудиту

**Файлы-сироты: 36.**

| категория | кол-во | примечание |
|-----------|--------|------------|
| ✅ Подтверждено DEAD (safe удалять) | **25** | из них 4 удерживаются контракт-тестами → удалять синхронно с тестом |
| ⚠️ UNCERTAIN (ручная проверка) | **6** | MistakeEli5Modal, ScreenArtBackdrop, ShardsEarnedModal, use-color-scheme.ts, icon-symbol.tsx, icon-symbol.ios.tsx |
| ❌ ALIVE — реально живой, вычеркнуть | **2** | modules/phrase-widget/constants.ts, HomeTheoAdvisorCard.tsx |
| ❌ ALIVE — псевдо-живой (живёт за счёт мёртвого родителя/теста) | **3** | ActiveBoostBar.tsx, FlatTopHexFill.tsx, adaptiveBackgroundAssets.generated.ts → удаляемы в составе кластера |
| **Итого** | **36** | |

> Реально удаляемых файлов: **25 (dead) + 3 (псевдо-живые в кластерах) = 28**, при условии синхронного удаления тестов-маяков и кластеров целиком.

**Пакеты: 7.**

| категория | кол-во | пакеты |
|-----------|--------|--------|
| ✅ Подтверждено DEAD (safe) | **2** | ts-fsrs, @gorhom/bottom-sheet (+@gorhom/portal) |
| ❌ ALIVE (нативный autolink/транзитив) | **3** | lottie-react-native, @react-navigation/bottom-tabs, @react-navigation/elements |
| ⚠️ UNCERTAIN (пересборка) | **2** | react-native-view-shot, expo-blur |
| **Итого** | **7** | |

### Доверие первому аудиту (knip / первый проход)

- **Файлы:** из 36 «сирот» подтвердилось мёртвыми по сути 28 (~78%). Из них первый аудит **ошибочно записал в alive** 3 файла (FlatTopHexFill, adaptiveBackgroundAssets.generated, ActiveBoostBar) — на самом деле они удаляемы, просто их импортёр/тест сам труп. И **6 файлов** оказались реально спорными — knip-стиль «нет импорта = мёртв» здесь промахивается (platform-suffix бандлинг, контракт-тесты, runtime-детект по displayName).
- **Пакеты:** из 7 «неиспользуемых» по JS-импортам **реально мёртвы только 2 (29%)**. Остальные 5 живут через нативный autolink / транзитивные peer-зависимости / контракт-тесты — то есть knip по JS-импортам для пакетов почти бесполезен, нужен autolinking.json + npm ls.

**Вывод о доверии:** первому аудиту можно доверять как «фильтру первого приближения», но НЕ как финальному решению — он систематически (а) пропускает нативный autolink у пакетов и (б) путает «нет прямого импорта» с «мёртв» там, где есть бандлер-суффиксы, контракт-тесты и динамическая регистрация. Финальный безопасный список — раздел 1 (с оговоркой про тесты-маяки) и раздел 4a.

---

## Краткий план действий (порядок удаления)

1. Удалить **25 dead-файлов** из раздела 1 + синхронно поправить 4 теста-маяка (раздел 2-bis).
2. Удалить **кластеры целиком**: A (2 файла), B (4 файла), C (.ts+.generated+тест), D (папка modal_fx).
3. Удалить **2 пакета**: `ts-fsrs`, `@gorhom/bottom-sheet` (+ `@gorhom/portal`).
4. **Руками проверить** 6 uncertain-файлов + 2 uncertain-пакета перед любым удалением.
5. **НЕ трогать** живое: phrase-widget/constants.ts, HomeTheoAdvisorCard, lottie-react-native, @react-navigation/*.

---

## Итог простыми словами

- Проверили 36 «лишних» файлов и 7 сторонних библиотек, которые предлагалось выкинуть.
- 25 файлов и 2 библиотеки — точно лишние, удалять можно спокойно (часть — вместе с привязанными к ним проверками).
- 6 файлов и 2 библиотеки — под вопросом: сначала надо глянуть глазами, иначе можно что-то сломать.
- Несколько файлов нельзя удалять по одному — только целыми группами, иначе сломается связка.
- 2 файла и 3 библиотеки на самом деле живые — их вычёркиваем, выкидывать нельзя.
- Главный урок: автоматический поиск «лишнего» часто ошибается на библиотеках (они подключаются через нативный код, а не через обычный импорт) — для них всегда нужна отдельная проверка и пересборка.
