# Phraseman V2 — пилотный сезон из 32 эпизодов

**Статус:** продуктовая и техническая спецификация утверждена; реализация начата с Phase 00 security inventory, canonical contract work продолжается  
**Дата последней сверки:** 2026-07-15  
**Цель пилота:** проверить учебную последовательность, голосовые режимы, звёздные ворота, удержание и серверный генератор до масштабирования на сотни эпизодов и новые языки.

## Короткое решение

V2 строится не как ещё один изолированный экран уроков и не как полная перепись приложения. Рекомендуемая архитектура — **новый модульный движок активностей поверх существующих проверенных экранов и данных, с адаптерами для legacy**.

Пилот состоит из 32 сценарных эпизодов, объединённых в четыре главы по восемь. Каждый эпизод ведёт ученика по одному педагогическому циклу:

1. понять ситуацию и смысл;
2. услышать и различить новую речь;
3. собрать и вспомнить фразы;
4. произнести их с контролируемой поддержкой;
5. быстро ответить без готового шаблона;
6. применить материал в диалоге или миссии;
7. вернуться к нему позже через персональное повторение.

Это Duolingo-like по ясности пути, Rosetta Stone-like по переходу от контекста к речи, ELSA-like по точечной обратной связи и EWA-like по историям и живому контексту — но с единой моделью прогресса Phraseman и без механического копирования интерфейсов.

## Честное обещание результата

32 мобильных эпизода не могут честно гарантировать достижение B1 или B2. Cambridge оценивает ориентир от нуля до A2 примерно в 180–200 часов управляемого обучения, до B1 — 350–400, до B2 — 500–600 часов. Поэтому пилот не заявляет уровень или сертификат: он проверяет CEFR-informed набор наблюдаемых `can-do` результатов, каждый из которых должен быть связан с конкретной задачей и evidence limitation:

- старт с A0;
- выбранные базовые сценарии, типичные для диапазона A1;
- отдельные более сложные функции, которые могут встречаться в начале A2, без заявления о достижении A2;
- заметно меньший страх перед голосом;
- перенос выученных фраз в короткую неподготовленную беседу.

Источник: [Cambridge English — Guided learning hours](https://support.cambridgeenglish.org/hc/en-gb/articles/202838506-Guided-learning-hours).

## Что зафиксировано

| Область | Решение |
|---|---|
| Сезон | 32 эпизода, 4 главы × 8, контрольные точки после 8/16/24/32 |
| Единица курса | Сценарный эпизод с ясным `can-do`, а не грамматическая тема как заголовок |
| Состав эпизода | 8–9 узлов из модульной библиотеки; не все режимы в каждом эпизоде |
| Учебный цикл | Encounter → Notice → Build → Speak → Transfer → Delayed Review |
| Голос | Единый Voice Activity Shell для разрешений, записи, качества сигнала, оценки и fallback |
| Speaking Club | Финальный transfer/capstone, а не способ впервые познакомить ученика с материалом |
| Personal Plan | Планировщик повторений над тем же движком активностей, а не отдельный контентный мир |
| Диалоги | Скриптовые диалоги раньше, ограниченно-ветвящиеся позже, AI-миссии после подготовки |
| Звёзды | `performance stars` награждают лучший валидный результат и дают earned access; learning mastery вычисляется отдельно из evidence по целям |
| Покупка | За осколки можно купить только Access Boost; нельзя купить learning evidence, checkpoint, произношение или утверждение об уровне |
| Legacy | Сохраняется до функционального паритета и подтверждённой миграции; ничего не удаляется побочно |
| Контент | Версионированные immutable-релизы с hash-проверкой, кэшем, bundled fallback и rollback |
| Админка | Content Studio создаёт versioned шаблоны режимов, упражнения, графы эпизодов и season composition со звёздными воротами, затем проводит preview, валидацию, review и публикацию |
| Граница no-code | Исполняемые механики и политики принадлежат коду; админка создаёт только безопасные шаблоны и экземпляры из зарегистрированных возможностей |
| Масштабирование | Язык, сценарий, активность, оценивание, награда и UI-рендерер разделены контрактами |

## Что означают звёзды

В V2 нельзя смешивать игровую награду, доступ и учебное доказательство: иначе покупка начинает выглядеть как «купленное знание», аналитика становится нечестной, а интерфейс вводит ученика в заблуждение.

| Сущность | Как получается | На что влияет | Можно купить |
|---|---|---|---|
| `performanceStarsEarned` | Лучший валидный результат activity/star slot | Награда, диагностика практики и derived earned access | Нет |
| `accessStarsEarned` | Read-only projection из текущих `bestPerformanceStars` | Открытие следующих эпизодов | Нет |
| `accessStarsPurchased` | Access Boost за осколки | Только временно закрывает дефицит доступа | Да |
| `LearningEvidence` | Только assessed observation по objective/construct с известными phase, support, context, prompt и input route | Independent/durable mastery, review и checkpoint | Нет |
| `LearningNonAssessment` | Отдельная запись accessibility/system/invalid недоступности без учебного pass/fail | Диагностика и честный `not_assessed` state | Нет |
| `voiceBadge` | Derived из assessed spoken evidence с microphone route, calibration и provenance | Честная индикация spoken evidence; не заменяет mastery целиком | Нет |

Покупка доступа не должна изменять учебную статистику. В интерфейсе это нужно объяснять прямо: «Открывает эпизод, но не засчитывает владение материалом».

## Архитектура продукта

```mermaid
flowchart LR
  A["Episode graph"] --> B["Activity registry"]
  B --> C["Shared activity shells"]
  C --> D["Evidence and scoring"]
  D --> E["Performance stars + access projection"]
  D --> Q["Learning evidence by objective"]
  E --> F["Path unlocks"]
  Q --> G["Personal review queue"]
  Q --> H["Speaking Club capstone"]
  I["Code-owned activity catalog"] --> M["Admin Mode Templates"]
  M --> N["Activity Instances + Episode graph"]
  N --> O["Season composition + gate policy"]
  O --> J["Validated immutable release"]
  J --> A
  K["Legacy lessons and screens"] --> L["Compatibility adapters"]
  L --> B
```

## Библиотека режимов

В пилот входит 18 пользовательских учебных поверхностей: 17 runtime activity families и отдельная checkpoint/assessment surface. UI строится на одном общем `ActivityScaffold` и шести переиспользуемых оболочках. Это сохраняет разнообразие обучения без 18 независимых реализаций и не превращает checkpoint в восемнадцатую runtime family.

1. Visual Discovery — смысл по сцене/картинке.
2. Listen & Choose — распознавание фразы на слух.
3. Sound Contrast — минимальные пары и фонемное различение.
4. Sound/Syllable Lab — звук, слог, ударение, артикуляционная подсказка.
5. Scripted Repeat & Compare — прослушать, записать, сравнить, повторить.
6. Phrase Builder — собрать фразу из блоков.
7. Listen & Build / Dictation — восстановить услышанное.
8. Context Gap / Grammar — выбрать форму в живой ситуации.
9. Quick Spoken Response — ответить голосом на короткую реплику.
10. Shadowing / Prosody — повторить за моделью с ритмом и паузами.
11. Describe the Scene — описать изображение с опорами.
12. Microstory / Radio — короткая история с проверкой понимания.
13. Branching Scene / Adventure — выполнить цель в интерактивной сцене.
14. Scripted Dialogue / Milestone — разыграть подготовленный разговор.
15. AI Speaking Club Mission — свободнее решить конкретную коммуникативную задачу.
16. Mistakes / Personalized Review — вернуться к реальным слабым местам.
17. Speed Match — необязательная быстрая автоматизация без голоса.
18. Checkpoint — перенос навыка на новые реплики и ситуации.

## Порог готовности пилота

Пилот считается технически готовым к ограниченному rollout только если одновременно выполнены условия:

- все 32 графа эпизодов проходят schema, content и localization validation;
- ни один обязательный голосовой узел не блокирует пользователя из-за шума, отсутствия разрешения или недоступности STT;
- performance/access stars физически не могут подменить learning evidence, checkpoint, уровень или произносительную аналитику;
- прогресс идемпотентен, account-scoped и переживает offline/restart;
- клиент проверяет `releaseId` и `contentHash`, умеет откатиться к последнему валидному релизу;
- каждый новый тип активности имеет renderer, scoring/evidence policy, progress policy, reward policy и тестовые fixtures;
- legacy остаётся доступным за rollout-флагом до подтверждённого паритета;
- аналитика различает `shown`, `started`, `valid_attempt`, `uncertain`, `completed`, `independent_evidence`, `durable_evidence`, `skipped_accessibility`, `not_assessed_accessibility`, `unavailable`;
- gate-relevant voice scoring имеет свежие calibration/fairness receipts, а network voice — approved privacy/retention policy;
- интерфейсы проверены на маленьком Android, крупном iPhone, large text, screen reader и reduced motion;
- проведён dogfood, затем закрытая когорта, затем A/B только для заранее описанных гипотез.

## Карта документов

| Документ | Что в нём |
|---|---|
| [GENERATOR_DELIVERY_CONTRACT.md](./GENERATOR_DELIVERY_CONTRACT.md) | Обязательный порядок работы и единственный полный Definition of Done генератора: 5–10 экспертных ролей, правильная админка, языки, аудио, UI, тесты и запрет преждевременной готовности |
| [HANDOVER.md](./HANDOVER.md) | Живой статус реализации, точный следующий шаг, ветки, проверки, blockers и обязательный протокол продолжения между сессиями |
| [00-research-and-skill-audit.md](./00-research-and-skill-audit.md) | Какие skills проверены, установлены, отклонены и как они повлияли на решения |
| [01-current-state-audit.md](./01-current-state-audit.md) | Что уже есть в приложении и где реальные ограничения |
| [02-competitor-and-learning-evidence.md](./02-competitor-and-learning-evidence.md) | Rosetta Stone, Duolingo, ELSA, EWA/EULA, научные основания и UI-референсы |
| [03-learning-architecture-and-curriculum.md](./03-learning-architecture-and-curriculum.md) | Педагогический цикл и точные 32 эпизода |
| [04-activity-catalog-and-storyboards.md](./04-activity-catalog-and-storyboards.md) | Каталог режимов, UI shells, состояния, motion и accessibility |
| [05-stars-progress-and-mastery.md](./05-stars-progress-and-mastery.md) | Звёздная экономика, формулы ворот, ledger и защита от pay-to-win |
| [06-runtime-content-admin-and-release.md](./06-runtime-content-admin-and-release.md) | Схемы данных, activity registry, админ-генератор, релизы и offline |
| [07-migration-analytics-testing.md](./07-migration-analytics-testing.md) | Миграция legacy, rollout, аналитика, эксперименты и тестовая матрица |
| [08-admin-content-studio-and-mode-authoring.md](./08-admin-content-studio-and-mode-authoring.md) | Полный authoring-контур: Mode Templates, Activity Instances, Episode Builder, Preview Lab, локализация, approval и release |
| [Master implementation plan](../superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md) | Общая последовательность GSD/TDD-реализации сезона |
| [Content Studio implementation plan](../superpowers/plans/2026-07-14-phraseman-v2-content-studio.md) | Отдельный подробный TDD-план пересоздания генератора и authoring-пути |

## Последовательность реализации

1. Закрыть Phase 00: security boundary, hashable artifact bodies, learning/voice evidence, hypothesis registry, preview/release identity и reference-capture pack; пользовательский путь не менять.
2. Ввести code-owned activity kernel registry и support manifest версий приложения.
3. Зафиксировать `ModeTemplate`, `ActivityInstance`, `EpisodeDraft`, `SeasonRevision` и pure validators до написания редактора.
4. Ввести namespaced V2 progress и раздельный star/access ledger.
5. Собрать Voice Activity Shell и перенести один controlled-repeat режим.
6. Подключить существующие режимы через adapters.
7. Собрать Mode Library, Episode Builder с season workspace/gate preview и Preview Lab на существующем stage/review/release pipeline.
8. Провести один `vertical_slice` только для lab/staging: шаблон режима → упражнение → эпизод 1 → season revision → device preview → release → rollback.
9. Добавить transfer-режимы, Speaking Club и personal review queue.
10. Заполнить и проверить 8 эпизодов главы 1.
11. Закрытый pilot chapter 1; исправить scoring, UX и generator contracts.
12. Расширить на 32 эпизода; checkpoints и миграция.
13. Запустить ограниченную когорту V2, сохраняя legacy fallback.
14. Решать судьбу legacy/Challenges только после паритета, данных и отдельного одобрения.

## Решения, которые можно подтвердить до начала UI-production

Ни один вопрос ниже не блокирует написание contracts: для каждого уже указан безопасный default. Ответ владельца продукта заменит default в decision log.

| Вопрос | Рекомендуемый default | Почему |
|---|---|---|
| Карта вертикальная или горизонтальная? | Вертикальная, 4 явно разделённые главы | Привычная модель пути и удобство одной рукой |
| Видны ли все 32 эпизода сразу? | Названия видны, содержимое дальних эпизодов свернуто | Даёт цель без визуального перегруза |
| Сколько узлов видно внутри эпизода? | 8–9 компактных узлов, один следующий выделен | Ясная последовательность, без «леса кнопок» |
| Можно ли пропустить голос? | Да, при недоступности/доступности; контент завершён, voice evidence не выдан | Не наказывать за среду или особые потребности |
| Tap-to-talk или hold-to-talk? | Tap start/stop по умолчанию; hold — только дополнительная настройка | Один доступный контракт для коротких и длинных ответов; hold не становится обязательным для VoiceOver, TalkBack и моторной доступности |
| Показывать числовой pronunciation score? | Только после task-specific calibration; до этого — качественный verdict и одна actionable cue | Валидная запись ещё не делает vendor scale педагогически валидной |
| Нужна ли красно-жёлто-зелёная раскраска слов? | Только вместе с значком/подписью, не цветом одним | Доступность и меньше ощущения наказания |
| Разрешить Access Boost сразу? | Только после двух честных попыток и объяснения дефицита | Не превращать оплату в первый путь прохождения |
| Повторять предыдущий эпизод дважды? | Первый проход + immediate `near_transfer`, а не идентичный replay; настоящий delayed review назначает scheduler и он не блокирует следующий эпизод | Вариативность проверяет ближний перенос, а durable evidence требует времени |
| Награждать 1 звездой за невалидный звук? | Нет; статус `uncertain/unavailable`, попытка не тратится | Техническая ошибка не является учебным результатом |
| Где показывать Speaking Club? | Последний крупный узел эпизода и отдельная Practice-полка | Сначала подготовка, затем перенос; остаётся возможность перепройти |
| Делать ли AI обязательным? | Нет для core progression в первой версии | Стоимость, сеть, safety и непредсказуемость не должны блокировать путь |
| Оставить ли отдельный Personal Plan? | Да как вход в персональную очередь, но на общем движке | Сохраняет привычный сценарий без дублирования renderer-ов |
| Сохранять ли отдельные Challenges? | В rollout — да; затем side nodes после доказанного паритета | Безопасная миграция и отсутствие скрытого удаления функции |
| Насколько яркими делать анимации? | Сдержанные в упражнениях, редкая выразительная кульминация эпизода | Не мешает частым повторам, сохраняет чувство награды |
| Нужны ли картинки в стиле Rosetta Stone? | Да для смыслового контекста, но только функциональные и локализуемые сцены | Контекст без перевода полезен, декоративный арт не нужен |
| Сколько новых фраз на эпизод? | 6–10 активных chunks + 4–8 узнаваемых слов | Достаточно для сценария, не перегружает рабочую память |
| Когда вводить свободный ответ? | После 2–3 поддержанных производящих заданий | Снижает blank-page anxiety |
| Можно ли открыть эпизод «на будущее»? | Да через access gate, но checkpoint использует только релевантное learning evidence | Свобода без покупки учебного достижения |
| Что является главным KPI? | Доля учеников, успешно применивших фразы в delayed transfer | Не XP и не количество нажатий, а наблюдаемый перенос |
| Что администратор может создать без app release? | Новый versioned шаблон режима, локализацию и упражнения только из зарегистрированных kernels/primitives | Масштабируем контент, не превращая remote config в удалённый код |
| Что всё ещё требует app release? | Совершенно новая механика UI, evidence или scoring policy | Native capabilities, награды и прогресс остаются проверяемым code-owned контрактом |

## GSD-правило для этого проекта

Текущая `.planning` уже относится к другому milestone, поэтому спецификация V2 не перезаписывает её. После закрытия активного milestone V2 следует запускать отдельным milestone `Phraseman V2 Pilot Season` либо отдельным GSD workstream. Implementation plan разбит на вертикальные фазы с собственными acceptance criteria; массовая генерация 32 эпизодов начинается только после работающего episode-1 slice.
