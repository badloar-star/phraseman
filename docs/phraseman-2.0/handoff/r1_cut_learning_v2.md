# Заготовка: R1 без Learning V2 (патч `r1_cut_learning_v2.patch`)

Статус: **заготовка, НЕ наложена.** Накладывать только по решению владельца «вырезать Learning V2 из R1».
Подготовил: 5 · АВТОРИЗАЦИЯ, 12.10.2026, по поручению координатора. Файлы Codex (modules/learning-v2/**,
content/learning-v2-course/**, плеер V2) патч НЕ трогает.

## 1. Где Learning V2 доступен пользователю в R1 → как скрыть

| Место | Файл | Как закрыто патчем |
|---|---|---|
| Чип «V2» в шапке «Уроков» | `app/(tabs)/lessons.tsx:5258` | флаг `LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY` = false в стор-сборке |
| Кнопка «V2» в переключателе страниц | `app/(tabs)/lessons.tsx:5595–5621` | тот же флаг (кнопка не рисуется) |
| Переход на страницу V2 по коду | `app/(tabs)/lessons.tsx:4307` | тот же флаг (ранний выход) |
| Запуск занятия со страницы V2 | `app/(tabs)/lessons.tsx:~3627` → `/learning-v2/session/[id]` | маршрут вырезан; страница недостижима (флаг); исключение в стороже переходов с причиной |
| Все экраны V2 (17 маршрутов `*learning[_-]v2*`) | `router.ctx.js`, стор-ветка | вырез `(?!(?:.*learning[_-]v2.*)\.tsx?$)` — в стор-сборку не попадают |

Сам флаг: `(LEARNING_V2_HAS_RELEASED_SESSIONS_V1 || ENABLE_DEV_TOOLS) && !IS_STORE_RELEASE`
(`app/(tabs)/lessons.tsx:1347`; `IS_STORE_RELEASE` из `app/config.ts:57`). Дев-сборки работают как раньше.

Проверено, что других входов нет: задания «Сегодня» в V2 не ведут (`app/today_task_surface_filter.ts`), пушей V2 нет.
Сегодня `LEARNING_V2_HAS_RELEASED_SESSIONS_V1 = false` (потолок сессий 0) — вход в стор-сборке и так скрыт;
патч делает это независимым от потолка и вырезает сами экраны.

**Опция, в патч не входит:** фоновые задачи V2 в `app/_layout.tsx` — посев аудио-кэша
(`seedLearningV2BootstrapAudioCacheV1`, ~2888) и планировщик завершений (`learning_v2_completion_background_scheduler`, ~1044).
Без экранов вреда нет (модули не маршруты, в бандле остаются), но если нужен ноль работы V2 на старте — обернуть
оба вызова в `if (!IS_STORE_RELEASE)`. Это код вне зоны Codex, но затрагивает старт — отдельным решением.

**Заглушку наград сессии из `caafa92ab^` не возвращаем:** у неё 4 экспорта, у живого модуля
`modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts` ~20 — заглушка сломала бы импортёров.
Модуль не маршрут, вырез регулярки его не задевает.

## 2. Два V2-гейта precheck: исключение законное, не отключение

Гейты: «исходник = выпуск = копия приложения Learning V2» (`scripts/learning_v2_release_parity_gate.mjs`) и
«озвучка встроенных занятий Learning V2» (`scripts/learning_v2_audio_coverage_gate.mjs`), `scripts/release_precheck.mjs:120,123`.

Патч НЕ удаляет их и НЕ ставит обход владельца. Он передаёт им `EXPO_PUBLIC_STORE_RELEASE=1` (precheck и так проверяет
стор-сборку). Оба гейта уже умеют доказательный пропуск — `learningV2StoreSkipDecision` в
`scripts/store_release_surface.mjs`:
- пропуск ТОЛЬКО если регулярка стор-ветки `router.ctx.js` вырезает **каждый** маршрут `learning[_-]v2` (их 11 в
  выборке гейта); пропуск громко объявляется (`announceLearningV2StoreSkip`);
- хоть один маршрут V2 достижим → `learning_v2_route_reachable_in_store`, гейты строгие, как прежде;
- без стор-режима → `not_store_release`, строгие.

То есть без выреза (сегодняшнее состояние) патчевая строка env ничего не ослабляет.

**Что проверяется вместо них:**
1. вырезаны все маршруты V2 — тот же `learningV2StoreSkipDecision` (иначе гейты падают как прежде);
2. «нет ссылок на вырезанные маршруты» (`scripts/store_route_reachability.mjs`) — 0 дыр; единственная найденная
   (`lessons.tsx` → `/learning-v2/session/`) закрыта исключением `ALLOWED` с причиной (возвращено из `caafa92ab^`);
3. стор-заглушки dev-модулей совпадают по экспортам (`store_release_stubs_gate.mjs`) — без изменений;
4. тесты (см. ниже) фиксируют и вырез, и закрытый вход.

## 3. Содержимое патча (10 файлов)

- `router.ctx.js` — вырез V2 в стор-ветке (перед дев-клаузой; дев-ветка не тронута);
- `app/(tabs)/lessons.tsx` — импорт `IS_STORE_RELEASE`, флаг `&& !IS_STORE_RELEASE`;
- `scripts/release_precheck.mjs` — оба V2-гейта в стор-режиме;
- `scripts/store_route_reachability.mjs` — исключение для запуска занятия со страницы V2;
- тесты: `learning_v2_release_access_contract`, `learning_v2_show_only_released_contract`,
  `lessons_entry_opens_legacy_guard` — новая формула флага; `store_release_learning_v2_bundle_exclusion` — стор-ветка
  режет V2, боевые маршруты V2 НЕ в стор-сборке; `store_route_reachability.test.mjs` — занятие V2 вырезано;
  `store_release_gate_levers.test.mjs` — «настоящий проект»: в стор-режиме пропуск `learning_v2_excluded_from_store`,
  вне стор-режима — строго.

## 4. Проверено (12.10, выгрузка HEAD во временной папке + патч)

- `git apply --check` на текущем дереве — ОК.
- Пропуск: стор-режим → `skip:true, learning_v2_excluded_from_store, routes 11`; без стор-режима → `skip:false`.
- Вырезано 17 маршрутов, занятие V2 среди них; сторож переходов: **0 дыр**.
- node-тесты (3 файла): 19 pass / 2 fail — **те же 2 падают и у выгрузки без патча** (неполная копия: нет курса и
  ассетов); в настоящем репозитории эти файлы 16/0.
- Регулярки jest-тестов сверены с пропатченными файлами скриптом: флаг, импорт, вырез в стор-ветке — совпадают.
  Сами jest-тесты не гонялись (выгрузка без node_modules) — прогнать при наложении.

## 5. Порядок наложения (когда владелец решит)

```bash
git apply docs/phraseman-2.0/handoff/r1_cut_learning_v2.patch
```

Затем точечно (со слотом светофора): `npm run test:one -- tests/store_release_learning_v2_bundle_exclusion.test.ts`,
`tests/learning_v2_release_access_contract.test.ts`, `tests/lessons_entry_opens_legacy_guard.test.ts`;
`node --test tests/store_route_reachability.test.mjs tests/store_release_gate_levers.test.mjs tests/learning_v2_show_only_released_contract.test.mjs`;
`node scripts/release_precheck.mjs` — V2-гейты должны объявить пропуск, остальное без изменений.
Если до наложения кто-то правил `lessons.tsx`/`router.ctx.js` — пересобрать патч, а не накладывать с `--3way` вслепую.

## 6. Откат

`git apply -R docs/phraseman-2.0/handoff/r1_cut_learning_v2.patch` (или revert коммита наложения). Данных не трогает.
