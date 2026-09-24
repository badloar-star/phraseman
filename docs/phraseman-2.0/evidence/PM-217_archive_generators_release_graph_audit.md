# PM-217 — Архивные генераторы и release graph: аудит (разведка, read-only)

Дата: 2026-09-24. Автор: Claude (разведка), read-only, код не менялся.

Задача: убедиться, что генераторы контента (authoring/content-factory tooling)
физически не попадают в мобильный клиент — недостаточно одного feature flag,
нужно проверить router auto-discovery, static imports, build manifests, native
inclusion. "Архивы Макса" — вне скоупа (см. корневой `CLAUDE.md`, раздел MAX
законсервирован отдельным решением владельца).

## Найденные генераторы

| # | Путь | Что делает |
|---|------|------------|
| 1 | `functions/src/content_factory/**` (421 файл) | Серверный пайплайн Cloud Functions: генерация/валидация/публикация учебного контента (диалоги, курс, артефакты, дедупликация и т.д.). Callable-функции, вызываются владельцем из админки. |
| 2 | `functions/src/content_studio/**` | Серверные репозитории для episode/season draft-жизненного цикла (черновики, ревью, ревизии, локализация). |
| 3 | `modules/learning-v2/authoring/**` (5 файлов: `episode_draft.ts`, `episode_graph.ts`, `season_approval_receipt.ts`, `season_draft.ts`, `season_revision.ts`) | Типы/модели для authoring-жизненного цикла эпизодов и сезонов курса. |
| 4 | `modules/learning-v2/content/generator_course_contract.ts`, `generator_course_contract_v2.ts`, `generator_course_batch_plan.ts`, `generator_course_manifest.ts`, `generator_session_contract.ts`, `generator_session_shard.ts` | Контракты/типы схемы генерируемого контента (константы локалей, форма сессии и т.п.) — НЕ сама логика генерации. |
| 5 | `modules/learning-v2/content/factory_native/factory_native_catalog_v1.ts` + `.generated.ts`, `factory_native_course_v1.ts`, `factory_native_manifest_v1.generated.ts` | Не генератор, а **проекция уже одобренного релиза** в нативный формат приложения (см. README модуля). Строится скриптом `scripts/build_learning_v2_factory_native_manifest.mjs`, копирующим только admitted release JSON. |
| 6 | `modules/learning-v2/content/factory_native/generated_release/**` (541 файл, ~12 МБ JSON: intro/learner/answers по сессиям l01/s01…) | Готовый опубликованный контент английского курса — фактические учебные данные, не инструмент авторства. |
| 7 | `app/_learning_v2_authoring_preview.tsx` | Экран предпросмотра авторского контента, живёт в `app/` (Expo Router auto-discovery). Читает `factoryNativeLearningV2AvailabilityV1()` и позволяет открыть любую сессию курса в режиме `previewMode: "authoring_v1"`. |
| 8 | `app/lesson_prepositions_es_factory.ts`, `app/personal_plan_runtime_block_factory.ts`, `app/ai_consent_factory.ts`, `app/learning_v2_factory_lesson_audio_index_v1.generated.ts`, `app/learning_v2_factory_production_audio_entries_v1.generated.ts`, `app/learning_v2_factory_production_audio_v1.ts` | Название содержит "factory", но по факту это runtime-код приложения (генерация UI-блоков/аудио-индексов на лету, а не authoring tooling). Не являются кандидатами — исключены из дальнейшего анализа как false positives по имени. |

## Классификация

| # | Кандидат | Client bundle risk | Обоснование |
|---|----------|--------------------|--------------|
| 1 | `functions/src/content_factory/**` | **Нет — server-only** | Живёт только в `functions/`, деплоится как Cloud Functions, не участвует в Metro-бандле мобильного приложения. Активно экспортируется из `functions/src/index.ts` (не закомментировано, в отличие от MAX) — это ДЕЙСТВУЮЩИЙ пайплайн, не мёртвый код. Все проверенные callable (`adminCreateContentGenerationJob`, `adminListContentFactoryJobs` и т.д.) защищены `request.auth?.token?.admin` — только владелец. |
| 2 | `functions/src/content_studio/**` | **Нет — server-only** | Аналогично п.1: серверные репозитории, деплоятся с функциями (`admin_content_studio_callables.ts` экспортируется из `index.ts`), не импортируются из `app/`/`modules`(client)/`components`. |
| 3 | `modules/learning-v2/authoring/**` | **Нет** | Проверено `grep` по `app`, `modules`, `components`: НИ ОДНОГО импорта из клиентского кода. Импортируется исключительно из `functions/src/content_studio/**` (7+ файлов). Статический импорт есть, но только внутри server-side графа — Metro (клиентский бандлер) эти файлы не видит, потому что до них нет пути от `app/` entry points. |
| 4 | `generator_course_contract.ts` / `generator_session_contract.ts` и т.п. | **Да, но не проблема** | Статически импортируются из МНОГИХ живых prod-экранов (`app/learning_v2_active_course_catalog_client_v1.ts`, `app/learning_v2_session_intro_check.tsx` и др.) — это ОЖИДАЕМО: это общая схема/константы контента (список локалей интерфейса, типы уровня и т.п.), которые рантайм обязан знать, чтобы читать уже сгенерированный контент. Проверено — файл не содержит логики генерации, только типы/константы/чистые функции хэширования. Не является "генератором" в смысле authoring tooling. |
| 5 | `factory_native_catalog_v1.ts` (+ `.generated.ts`), `factory_native_course_v1.ts`, `factory_native_manifest_v1.generated.ts` | **Да, ожидаемо — не архив** | Статически импортируются из живых prod-экранов: `app/(tabs)/lessons.tsx`, `app/learning_v2_active_course_catalog_client_v1.ts`, `app/learning_v2_course_released_session_client_v3.ts`, `app/learning_v2_direct_session_player_v1.tsx`, `modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts`. Это не генератор, а рантайм-проекция уже одобренного контента — согласно памяти `project_learning_v2_only_english_shipped_2026-09-24`, английский курс — единственный реально отгруженный, поэтому этот код и должен быть в бандле. Вне скоупа задачи (это не "архивный генератор", это боевой контент-путь). |
| 6 | `generated_release/**` JSON (12 МБ) | **Да, ожидаемо** | Втягивается статическими `require()` из `factory_native_manifest_v1.generated.ts` построчно на каждую сессию (`require("./generated_release/en/l01/s01/intro.json")` и т.д.) — это данные боевого курса, не архив. Размер (12 МБ) стоит иметь в виду отдельно для ⚡-оптимизации бандла, но это не предмет PM-217. |
| 7 | `app/_learning_v2_authoring_preview.tsx` | **ДА — реальный риск, частично закрыт** | Файл лежит в `app/` → Expo Router **автоматически** регистрирует его как маршрут `LEARNING_V2_AUTHORING_PREVIEW_ROUTE_NAME` (`learning_v2_authoring_preview`). Паттерна `export default function __RouteShim() { return null; }` в нём НЕТ — это полноценный работающий экран (`export default function LearningV2AuthoringPreviewScreen()`), не заглушка. Он ЗАРЕГИСТРИРОВАН в `DEV_UTILITY_ROUTE_NAMES` (`constants/devRoutes.ts`), что по комментарию в коде "регистрируется как плоский Stack.Screen по имени файла **и в релизе не рендерится вовсе**" — НО: 1) это защищает от deep-link входа (`isDevUtilityRoutePath` в `_layout.tsx`) и, судя по комментарию, от попадания в дерево `<Stack.Screen>`, но **не мешает Metro включить сам JS-код файла в бандл** (Expo Router file-based routing генерирует route table из файловой системы на этапе сборки независимо от рантайм-фильтрации); 2) в самом файле НЕТ `ENABLE_DEV_TOOLS`/`__DEV__`/`IS_STORE_RELEASE` guard — защита полностью снаружи (только регистр в `devRoutes.ts` + рантайм-проверка в `_layout.tsx`), в отличие от соседних `course.tsx`/`intro-reader-fixture.tsx`, у которых, по тому же комментарию, есть прямой `ENABLE_DEV_TOOLS` guard в файле. Файл статически импортирует `factoryNativeLearningV2AvailabilityV1` из `factory_native_catalog_v1.ts` — но этот модуль и так уже в бандле (см. п.5), так что маржинальный вклад именно этого экрана в размер бандла невелик; риск скорее в том, что owner-only preview-экран технически достижим (роут существует), а не в весе. |

## Действие

| # | Кандидат | Действие |
|---|----------|----------|
| 1 | `functions/src/content_factory/**` | Оставить как есть — активный server-side pipeline, вне скоупа мобильного client bundle. Не архив. |
| 2 | `functions/src/content_studio/**` | Оставить как есть — активный server-side pipeline. |
| 3 | `modules/learning-v2/authoring/**` | Оставить как есть — нулевой client bundle risk, импортируется только сервером. |
| 4 | `generator_course_contract*.ts`, `generator_session_contract.ts` и др. контракты | Оставить как есть — легитимные типы, не генератор. |
| 5 | `factory_native_*` (catalog/course/manifest) + `generated_release/**` | Оставить как есть — боевой контент-путь, не архив, вне скоупа PM-217. Отдельно стоит завести задачу на ⚡-оптимизацию 12 МБ JSON в бандле (не блокирует PM-217). |
| 6 | `app/_learning_v2_authoring_preview.tsx` | **Изолировать.** Рекомендация родительской сессии: либо (а) добавить прямой `ENABLE_DEV_TOOLS`/`IS_STORE_RELEASE`-guard ВНУТРИ файла (как у `course.tsx`/`intro-reader-fixture.tsx` — early-return/redirect в релизной сборке), либо (б) подтвердить, что механизм `DEV_UTILITY_ROUTE_NAMES` в `_layout.tsx` действительно исключает Stack.Screen регистрацию в релизе (прочитать точную реализацию `isDevUtilityRoutePath`/рендер-условие вокруг строки 3190 `app/_layout.tsx` — "дерево из ~80 Stack.Screen зависит ТОЛЬКО от темы + onboardingPaywallActive") и явно задокументировать, что это достаточно. Разведка не может дать однозначный вердикт "исключён из бандла" только по наличию в списке `DEV_UTILITY_ROUTE_NAMES` — нужна точная проверка условного рендера/маршрутизации, которую следующий шаг должен сделать перед тем как считать риск закрытым. |
| 7 | `app/lesson_prepositions_es_factory.ts` и другие "*_factory.ts" в `app/` | Вне скоупа — это runtime-код приложения (генерация контента на лету для пользователя), не authoring tooling. Ложное срабатывание по имени, не требует действий. |

## Метод проверки

- `grep -rln` по `app`, `modules`, `components` на предмет статических импортов каждого кандидата.
- Проверка `functions/src/index.ts` на предмет активного/закомментированного экспорта (по аналогии с уже задокументированным паттерном MAX).
- Проверка паттерна `export default function __RouteShim() { return null; }` как признака "не роут" у файлов в `app/`.
- Проверка `constants/devRoutes.ts` и `app/_layout.tsx` (`isDevUtilityRoutePath`, `DEV_UTILITY_ROUTE_NAMES`) на предмет реального механизма исключения dev-only маршрутов.
- Проверка admin-claim гейтинга серверных callable-функций (`request.auth?.token?.admin`).

Код не менялся, коммитов не создавалось — это разведка. Изоляция `app/_learning_v2_authoring_preview.tsx` (пункт 6) — следующий шаг для родительской сессии.
