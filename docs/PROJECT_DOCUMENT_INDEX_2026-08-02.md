# Phraseman — навигатор по документации

**Срез:** 2 августа 2026. В проекте около 6 146 Markdown-файлов в `docs/`; среди них есть отчёты, архивы, результаты запусков и исторические версии. Этот индекс отделяет документы, которыми надо руководствоваться, от справочного архива.

## 1. Learning V2 — читать в первую очередь

| Документ | Для чего нужен |
|---|---|
| [Полный хендовер решений владельца](v2/LEARNING_V2_FULL_OWNER_HANDOVER_2026-08-02.md) | Главный вход: что строим, что запрещено, все существенные принятые ответы, порядок реализации |
| [Статус фактической готовности](v2/LEARNING_V2_READINESS_STATUS_2026-08-02.md) | Честно отделяет готовый код от плана |
| [Аудит и журнал исполнения](v2/LEARNING_V2_AUDIT_AND_EXECUTION_RECORD_2026-07-28.md) | Кодовая карта, подробный реестр решений, пакеты и порядок координации нескольких ИИ |
| [Точный RN-контракт карты урока](v2/LEARNING_V2_LESSON_MAP_RN_SPEC_2026-08-02.md) | Измеримые состояния, геометрия, motion и кадр-за-кадром критерии переноса исходного макета карты урока |
| [Мастер-план](v2/LEARNING_V2_MASTER_WORK_PLAN.md) | Читаемый план для владельца: продукт, генератор и этапы |
| [Полный предыдущий перенос](v2/HANDOVER_V2_FULL_TRANSFER.md) | Макеты, движения, конкуренты, старый аудит, перечень файлов |
| [Предыдущий Ground Up handover](v2/HANDOVER_LEARNING_V2_GROUND_UP.md) | История решений, использовать только если не противоречит новому хендоверу |
| [V2 README](v2/README.md) | Карта старого набора V2-документации |
| [Research and skill audit](v2/00-research-and-skill-audit.md) | Исходная исследовательская база |
| [Current state audit](v2/01-current-state-audit.md) | Снимок раннего состояния |
| [Competitor & learning evidence](v2/02-competitor-and-learning-evidence.md) | Исследования конкурентов и обучения |
| [Learning architecture](v2/03-learning-architecture-and-curriculum.md) | Архитектура курса |
| [Activity catalog](v2/04-activity-catalog-and-storyboards.md) | Каталог учебных активностей и storyboard |
| [Stars, progress & mastery](v2/05-stars-progress-and-mastery.md) | Историческая спецификация экономики; новые решения владельца имеют приоритет |
| [Runtime, content, admin & release](v2/06-runtime-content-admin-and-release.md) | Исторический runtime/release контекст |
| [Migration, analytics & testing](v2/07-migration-analytics-testing.md) | Миграции и тестовые требования |
| [Admin studio & mode authoring](v2/08-admin-content-studio-and-mode-authoring.md) | Старый контекст админской content studio |
| [Evidence ledger](v2/REFERENCE_EVIDENCE_LEDGER.md) | Реестр источников research |

## 2. Обязательные правила проекта

| Документ | Для чего нужен |
|---|---|
| [Правила репозитория](../AGENTS.md) | Граница ветки, доступов, админки, тестов и безопасности |
| [Карта проекта](../MAP.md) | Крупные части приложения |
| [Архитектура](ARCHITECTURE.md) | Техническая архитектура |
| [Библия продукта](../PHRASEMAN_BIBLE.md) | Продуктовые инварианты |
| [Описание продукта](../PRODUCT.md) | Цель и поверхность продукта |
| [Дизайн-система](../DESIGN.md) | Общие дизайн-правила |
| [UI Standard V5 Canonical](../UI_STANDARD_V5_CANONICAL.md) | Базовый UI-стандарт |
| [Performance master plan](../PERF_MASTER_PLAN.md) | Неподвижный фон, мгновенный первый кадр, стабильность layout |
| [Optimistic UI/offline mutations](OPTIMISTIC_UI_AND_OFFLINE_MUTATIONS.md) | Local-first и безопасные операции без сети |
| [Performance testing](PERFORMANCE_TESTING.md) | Как проверять производительность |

## 3. Админка и генератор

| Документ | Для чего нужен |
|---|---|
| [Admin UI Bible](design/ADMIN_UI_BIBLE.md) | Обязателен перед изменением `admin/v2/legacy.html` |
| [Language factory master plan](superpowers/plans/2026-07-10-admin-control-plane-language-factory-master-plan.md) | Исторический большой план фабрики языков |
| [Language factory design](superpowers/specs/2026-07-10-admin-control-plane-language-factory-design.md) | Дизайн фабрики |
| [Admin content-factory canary rollout](runbooks/admin-content-factory-canary-rollout.md) | Безопасный выпуск content factory |
| [Admin foundation transfer manifest](v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md) | База переноса admin/V2 |

## 4. Теория и контент

| Документ | Для чего нужен |
|---|---|
| [Theory audit](../THEORY_AUDIT_2026-06-21.md) | Аудит теории |
| [Content audit](../CONTENT_AUDIT_2026-06-08.md) | Общий аудит контента |

## 5. Дизайн, звук и motion

| Документ | Для чего нужен |
|---|---|
| [Exercise UI masterplan](../EXERCISE_UI_MASTERPLAN.md) | Исторический план экранов упражнений |
| [Sound design audit](SOUND_DESIGN_AUDIT_2026-05-18.md) | Аудит звуковой системы |
| [Sound-motion README](sound-motion/README.md) | Материалы звука и motion |
| [UI states audit](../UI_STATES_AUDIT_2026-07-27.md) | Состояния интерфейса |
| [UX problems audit](../UX_PROBLEMS_AUDIT_2026-07-04.md) | Выявленные UX-проблемы |
| [Design audit](../DESIGN_AUDIT_2026-06-08.md) | Общий аудит дизайна |

## 6. Отдельные системы

| Документ | Для чего нужен |
|---|---|
| [Tournaments audit](../TOURNAMENTS_AUDIT_2026-07-27.md) | Турниры; Learning V2 не должен менять их пул/генератор |
| [Tournaments golden plan](../TOURNAMENTS_GOLDEN_PLAN.md) | План турниров |
| [Tournament handover](tournaments/HANDOVER-2026-07-26.md) | Передача контекста турниров |
| [Paywall audit](paywall-audit/README.md) | Материалы paywall |
| [Paywall redesign](paywall-redesign-plan.md) | План paywall |
| [Onboarding Aha design](ONBOARDING_AHA_DESIGN_2026-07-02.md) | Онбординг |
| [Security audit](../SECURITY_AUDIT_2026-06-07.md) | Безопасность |
| [Business logic audit](../BUSINESS_LOGIC_AUDIT_2026-06-08.md) | Бизнес-логика |

## 7. Контентные pipeline

| Документ | Для чего нужен |
|---|---|
| [Content README](../content/README.md) | Карта контентных процессов |
| [MASON](../content/MASON.md) | Сценарии роликов; читать только при запуске MASON |
| [MAYMAY](../content/MAYMAY.md) | CapCut/TTS pipeline; читать только при запуске MAYMAY |
| [Lingman](../content/lingman/README.md) | Lingman pipeline |

## Архив и как искать остальное

В `docs/` есть тысячи документов: исторические планы, спеки, отчёты запусков и артефакты. Они не становятся действующим требованием автоматически. Для Learning V2 выше приоритет имеют разделы 1–3; в случае конфликта действует самый новый явный ответ владельца из полного хендовера.

Быстрый поиск по документации из корня проекта:

```powershell
rg -n -i "нужная фраза" docs --glob "*.md"
```
