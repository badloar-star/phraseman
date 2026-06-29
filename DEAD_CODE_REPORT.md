# DEAD_CODE_REPORT — Аудит мёртвого кода (Phraseman RN)

Дата: 2026-06-28. Метод: статический анализатор **knip** (`npx knip`) + **ручная верификация каждого пункта** grep'ом (static/dynamic import, expo-router роуты, реестры по строковым ключам, конфиги). Правок в код НЕ делалось — это реестр для одобрения.

Контекст: проект ~4200 ts/tsx файлов, AI-сгенерированный, накоплен мусор. Ранее уже удалено: Skia (~45 МБ), `card_images.generated.ts` (~71.6 МБ).

> Caveat expo-router: файлы в `app/` — это роуты, «используются» по имени файла даже без импортёра. Поэтому экраны не помечаются мёртвыми по признаку «нет импорта» — только если на них реально нет навигации.

---

## 1. Резюме

| Класс | Найдено | Объём | Вердикт |
|---|---|---|---|
| Неиспользуемые npm-пакеты (prod) | 7 | ~11 МБ в node_modules | безопасно удалить (проверено) |
| Корневой мусор разработки (tmp/check/validate) | 21 файл | мелкий | безопасно удалить |
| Файлы-сироты в src (components/hooks) | 36 (27 прямо + 9 кластерами) | ~средне | безопасно после быстрой проверки |
| Мёртвые экраны-роуты | ≥1 (`lesson_theory_v2`) + dev-лаборатории | мелкий | needs-check / dev-only |
| Неиспользуемые экспорты | 734 в 196 файлах | косметика | низкорисковая чистка отдельно |
| devDependencies (remotion и пр.) | 4 | — | needs-check (могут жить в skills/scripts) |

Главный вывод: основной «жир» — **7 лишних библиотек (~11 МБ)** и **36 файлов-сирот**. Удаление безопасно при условии прогона `tsc` + тестов + сборки после.

---

## 2. БЕЗОПАСНО УДАЛИТЬ (проверено вручную, использований ноль)

### 2a. Неиспользуемые npm-зависимости (prod `dependencies`)
Проверено: 0 импортов в `app/ components/ hooks/ contexts/ modules/ constants/` И 0 упоминаний в `app.json`/`babel.config.js`/`metro.config.js`.

| Пакет | Размер | Почему мёртв |
|---|---|---|
| `lottie-react-native` | 3.4 МБ | 0 импортов |
| `@gorhom/bottom-sheet` | 2.9 МБ | 0 импортов |
| `react-native-view-shot` | 2.8 МБ | 0 импортов (остаток старого StatsPremiumBlur — view-capture убран) |
| `ts-fsrs` | 716 КБ | 0 импортов (SRS-движок, не подключён) |
| `@react-navigation/elements` | 713 КБ | 0 импортов |
| `@react-navigation/bottom-tabs` | 656 КБ | 0 импортов (табы реализованы через expo-router, не этот пакет) |
| `expo-blur` | 225 КБ | 0 импортов (остаток StatsPremiumBlur — blur заменён на статику) |

**Итого ~11.4 МБ.** Удалять по одному, после каждого — `tsc --noEmit` + сборка, т.к. autolinking Expo иногда подтягивает нативные модули неявно.

### 2b. Корневой мусор разработки (21 файл)
Временные скрипты, забытые после отладки контента. Не входят в app-бандл, но засоряют репозиторий:
```
analyze_impact.js, check_article_rule.js, check_runtime_combination.js,
check_d50.js, check_d84.mjs, check_d111.js, check_d119.js, check_d126.js,
tmp_audit_d118.js, tmp_audit_d118b.js, tmp_check.mjs, tmp_check_d19.js,
tmp_check_d74.js, tmp_d80_check.js, tmp_d125_check.js, tmp_distractor_check.js,
tmp_draft75_check.js, validate_d31.js, validate_d52_deep.js, validate_d69.js,
validate_d71.js, validate_d81.js, validate_d88.js, validate_d121.js
```
(точный список — `git ls-files` по маскам `tmp_* check_d* validate_d*`). **safe** — это разовые проверки, не часть приложения.

### 2c. Файлы-сироты в src — 36 шт. (knip + ручная проверка: 0 живых ссылок)
27 имеют 0 ссылок напрямую; ещё 9 ссылаются только друг на друга (мёртвые кластеры):

**Прямые сироты (0 ссылок):**
`components/ActiveBoostBar.tsx`, `AnimatedFrame.tsx`, `ArenaConfettiBurst.tsx`, `ClubResultModal.tsx`, `CustomSplash.tsx`, `ExplainButton.tsx`, `HomeTheoAdvisorCard.tsx`, `LingmanCertificateTextPanel.tsx`, `MasteryReplayModal.tsx`, `MedalIcon.tsx`, `MistakeEli5Modal.tsx` (только в комментарии), `PersonalPlanCard.tsx`, `ScreenArtBackdrop.tsx`, `ShardsEarnedModal.tsx`, `paywallGlass.ts`, `paywallModalPalette.ts`, `adaptiveBackgroundAssets.ts` + `.generated.ts`, `modal_fx/modalAccents.ts`, `modal_fx/ModalFx.tsx`, `theory/AccordionTheory.tsx`, `ui/EmptyState.tsx`, `ui/ThemedInput.tsx`, `hooks/use-color-scheme.ts` + `.web.ts`, `hooks/use-matchmaking.ts` (legacy, заменён `MatchmakingContext`), `hooks/use-user-profile.ts`, `modules/phrase-widget/constants.ts`

**Мёртвые кластеры (ссылаются только внутри себя):**
- Hex-прогресс: `LessonHexProgress.tsx` → `FlatTopHexFill.tsx`, `HexScore.tsx`, `SvgLevelHex.tsx` (весь кластер не используется ни одним экраном)
- UI-примитивы: `ui/collapsible.tsx` → `ui/icon-symbol.tsx` + `.ios.tsx` (collapsible нигде не рендерится)
- Anim: `AnimatedFrame.tsx` → `AnimContext.tsx` (AnimatedFrame сирота → AnimContext тоже мёртв)

> ⚠️ Перед удалением каждого — финальный `grep` по имени во всём репозитории (вкл. tests/, на случай контракт-теста) и прогон тестов. Несколько имён (`ModalFx`, `HomeTheoAdvisorCard`, `ActiveBoostBar`) фигурировали в старом `CLASS_REGISTRY_PERFORMANCE.md`, но это были упоминания, не живые импорты — текущий код их не подключает.

---

## 3. NEEDS-CHECK (вероятно мёртвое, нужно подтверждение)

| Пункт | Сомнение |
|---|---|
| `expo-status-bar` (пакет) | Код использует `StatusBar` из **react-native**, не из пакета. Пакет, возможно, не нужен, но Expo может требовать транзитивно — проверить сборкой. |
| devDeps: `remotion`, `@remotion/cli`, `@remotion/media-utils` | Видео-генерация. Не в app, но могут использоваться в `skills/` (есть skill `remotion`) или CI. Проверить перед удалением. |
| devDep: `an-array-of-english-words` | Словарь — мог использоваться скриптами генерации контента (`scripts/`). |
| `lesson_theory_v2` (роут) | Реальный экран теории = `LessonTheoryNew` (в `hint.tsx`), `lesson_theory_v2` — старая версия. Зарегистрирован в `_layout.tsx:2378` как Stack.Screen, но навигации на него, вероятно, нет. Подтвердить, что ни один переход/deeplink на него не ведёт. |
| 930 «other» файлов от knip | `functions/` (Firebase Cloud Functions — отдельный деплой, НЕ мобильный бандл), `scripts/`, `tools/`, `.codex-tmp/`. Чистить отдельно и осторожно — это рабочий backend. |

---

## 4. KEEP / ложные срабатывания knip (НЕ удалять — живые)

| Пункт | Где используется |
|---|---|
| `expo-symbols` | knip пометил unused — ЛОЖНО, 2 реальных импорта в коде |
| Все `app/*.tsx` экраны | роуты expo-router, живые по имени файла |
| Компоненты через реестры (`appArtBackdropRegistry`, overlay keys) | рендерятся по строковому ключу, не прямым импортом |
| `functions/*` «unlisted» firebase-functions | отдельная среда Cloud Functions со своим package.json |

---

## 5. Неиспользуемые экспорты (отдельная низкорисковая задача)

knip: **734 неиспользуемых именованных экспорта в 196 файлах**. Это не мёртвые файлы, а мёртвые `export` внутри живых файлов (забытые хелперы, старые форматтеры). Полный список — в `knip.json`. Чистить отдельным проходом: удаление `export`-ключевого слова безопаснее удаления файлов, но объёмно. Рекомендую **после** удаления файлов-сирот (часть экспортов исчезнет вместе с файлами).

---

## 6. Рекомендованный порядок удаления + верификация

От самого безопасного к рискованному, с проверкой после каждого шага:

1. **Корневой мусор (2b)** — нулевой риск, не в бандле. → `git rm`, прогнать тесты.
2. **7 npm-пакетов (2a)** — по одному: `npm uninstall X` → `npx tsc --noEmit` → сборка Metro. Если autolink-модуль ругнётся — вернуть.
3. **Файлы-сироты (2c)** — кластерами: сначала листья, потом корни. После каждого кластера: `grep` имени по всему репо (вкл. tests) → `npx tsc --noEmit` → `npm test`.
4. **NEEDS-CHECK (3)** — только после твоего решения по каждому.
5. **Мёртвые экспорты (5)** — последним, отдельным проходом.

**Финальная проверка после всего:** `npx tsc --noEmit`, `npm test`, успешная dev-сборка Metro, прогон критических путей (T0: вход, прогресс, оплата, уроки).

---

## 7. Статус

- Правок в код **не вносилось** — это реестр на одобрение (стоп-точка конституции).
- knip-сводка с цифрами: `scratchpad/knip_summary.md`.
- Данные верифицированы вручную grep'ом; ложные срабатывания knip (expo-symbols, expo-router экраны) отфильтрованы.

### Итог простыми словами

- Мёртвого кода реально много: **7 лишних библиотек (~11 МБ)**, **21 черновой файл** в корне и **36 неиспользуемых файлов** в коде.
- Всё это проверено двумя способами и **безопасно к удалению** при аккуратном порядке и прогоне проверок после каждого шага.
- Пара вещей помечена «спросить»: видео-библиотеки (могут жить в инструментах), старый экран теории, статус-бар.
- Несколько «лишних» по мнению робота вещей на деле живые — их трогать нельзя, я их пометил.
- Самое крупное отдельно — сотни мелких неиспользуемых кусочков внутри живых файлов; их чистить последними.
- Ничего пока не удалял — жду твоего «да» и порядок.
