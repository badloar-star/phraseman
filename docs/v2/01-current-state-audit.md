# Аудит текущего Phraseman перед V2

**Срез репозитория:** 2026-07-14  
**Назначение:** отделить уже работающие возможности от прототипов, разрозненных контрактов и продуктовых предположений. Этот документ описывает состояние, а не обещает, что V2 уже реализован.

## Итог аудита

У приложения уже есть большая часть строительных блоков полноценного курса: 32 legacy-урока, несколько режимов сборки и воспроизведения фраз, личный план, голосовая панель, диалоги, Speaking Club, экзамены, награды и развитая админ-генерация. Главная проблема не в отсутствии режимов, а в том, что они живут в нескольких несогласованных системах прогресса, голоса, контента и наград.

Поэтому V2 должен:

- оркестрировать существующее через contracts/adapters;
- заменить пять разных голосовых state machine одной общей оболочкой;
- отделить распознавание текста от реальной оценки произношения;
- дать админ-артефактам реальный версионированный путь до клиента;
- хранить новый прогресс отдельно от legacy до завершения миграции.

## Карта существующего продукта

| Поверхность | Что уже работает | Что можно переиспользовать | Ограничение для V2 |
|---|---|---|---|
| Legacy Lessons | 32 урока, фразы, интро, теория, vocabulary, irregular verbs, prepositions | Контент и зрелые экраны | Последовательность грамматическая, а не сценарная; разные режимы не имеют общего activity contract |
| Lessons V2 | Визуальная карта из 8 статических узлов | Направление интерфейса и dev entry point | Это прототип: статический `3 / 8`, нет persistence/unlock/resume; почти все узлы ведут в lesson 1 |
| Personal Plan | 7 унифицированных renderer contracts и расписание задач | Отличная основа activity adapters и review queue | Собственная модель контента и прогресса, частично дублирует уроки |
| SpeakingPanel | Permission, запись, STT, transcript scoring, feedback, звёзды | Основа для controlled repeat | Оценка в основном текстовая; сложная локальная state machine; нет общего voice result taxonomy |
| Speaking Club | Сценарии, target phrases/objectives, AI reply, TTS, review, mission stars | Transfer/capstone и Practice shelf | Голос и клавиатура эквивалентны; pronunciation не оценивается; локальные ключи не account-scoped |
| AI Dialog | Свободнее беседа, AI/TTS, quotas | Поздние transfer-сессии | Не является проверкой произношения; сеть и стоимость не подходят для обязательного core gate |
| Exams | Контрольные точки и существующие reward flows | Checkpoint shell и наградная последовательность | Legacy-границы 8/18/28/32 не совпадают с предлагаемыми главами 8/16/24/32 |
| Daily Challenges | Мета-цели поверх разных действий | Будущие optional side nodes | Не являются отдельными педагогическими активностями; удалять до паритета нельзя |
| Admin content generator | Типизированные стадии, preview, approval, immutable artifacts | Основа фабрики эпизодов | Артефакты не имеют полного runtime delivery seam до мобильного клиента |
| Course release factory | Seal/activate/rollback release | Версионирование, catalog и rollback | Параллелен новому generator; приложение сейчас не потребляет опубликованный release |

## 1. Legacy: реальная производственная основа

Канонический набор — 32 урока. `app/lesson_data_all.ts` создаёт `LESSON_IDS` 1…32 и лениво загружает четыре группы по восемь уроков. Это полезная производительная граница, которую можно сохранить и для V2 content chunks.

Ключевые файлы:

- `app/lesson_data_all.ts:26` — 32 канонических lesson id;
- `app/lesson_data_all.ts:30-45` — lazy group loading;
- `app/lesson_data_types.ts` — `LessonPhrase`, intro/theory data contracts;
- `constants/lessons.ts:8-40` — текущие названия и грамматические темы;
- `app/lesson1.tsx` — основной runtime урока;
- `app/(tabs)/lessons.tsx` — карта, прогресс и входы;
- `app/(tabs)/lessons.tsx:790-800` — текущие экзамены после 8/18/28/32.

### Текущая тематика

Legacy идёт от `to be` и Present Simple к более сложным ярлыкам вроде passive, reported speech, conditionals, relative clauses и complex object. Это ценный банк фраз, но его нельзя напрямую переименовать в доказанный путь A1→B2.

`app/lesson_titles_for_study_target.ts:47` визуально распределяет уроки как 1–8 A1, 9–18 A2, 19–28 B1, 29–32 B2. Для V2 это только legacy display label. Уровень владения должен подтверждаться внешними can-do дескрипторами и transfer tasks, а не номером урока.

### Стратегия переиспользования

Первый V2 slice может временно использовать `episodeId === lessonId`, но только через адаптер:

```text
V2 episode node
  → legacy activity adapter
  → existing route + lesson payload
  → normalized V2 ActivityResult
  → V2 progress/evidence store
```

Legacy storage keys и reward events нельзя незаметно переопределять: это нарушит текущий прогресс и аналитику.

## 2. Текущий Lessons V2 — визуальный прототип

`components/LessonsV2TabContent.tsx` уже показывает путь из восьми стадий:

- words;
- theory;
- build;
- listen;
- speak;
- recall;
- mini game;
- exam.

Но код подтверждает, что это пока не движок:

- `components/LessonsV2TabContent.tsx:23` — локальный hardcoded `STAGES`;
- `:108` — selected state существует только в компоненте;
- `:113` — theory открывает V2 theory с `id=1`;
- `:116` — остальные доступные стадии открывают `/lesson1?id=1`;
- `:126` — строка `3 / 8 этапов` статическая;
- `app/(tabs)/lessons.tsx:885-917` — поверхность доступна через dev gate.

Вывод: сохраняем визуальное направление, но меняем источник на `EpisodeGraph` и реальный `ProgressSnapshot`.

## 3. Personal Plan — лучший текущий зачаток activity registry

`app/personal_plan_exercise_renderer_contracts.ts` уже нормализует семь типов:

1. `plan_phrase_build`;
2. `plan_missing_word`;
3. `plan_choose_natural_phrase`;
4. `plan_listen_choose`;
5. `plan_listen_build`;
6. `plan_pronunciation_repeat`;
7. `plan_phrase_recall`.

Это не нужно выбрасывать. V2 должен дать этим режимам canonical `activityType`, schema version и adapters. После этого Personal Plan становится планировщиком:

```text
Learning evidence → review scheduler → ActivityDescriptor[] → shared renderer registry
```

Так исчезает необходимость поддерживать отдельный renderer одной и той же активности в уроке, плане и challenge.

## 4. Что реально измеряет текущее «произношение»

Текущий основной scorer сравнивает **распознанный текст** с целевой фразой:

- `app/personal_plan_pronunciation_scoring_core.ts:338` — edit-distance word accuracy;
- `:339-340` — порядок слов через longest common subsequence;
- `:346-349` — полнота по длине transcript;
- `:350` — итог `0.62 × wordAccuracy + 0.28 × orderAccuracy + 0.10 × completeness`;
- `:354` — pass по общему threshold.

Следовательно:

- высокий score означает «STT уверенно услышал примерно нужные слова»;
- это полезный показатель intelligibility/phrase recall;
- он не доказывает точность отдельных фонем, артикуляции, ударения или интонации;
- derived phoneme diff из текста нельзя называть акустическим phoneme assessment;
- амплитудный energy/prosody feedback нельзя называть измерением pitch/F0.

### Текущие звёзды

`app/speaking_score_stars.ts` выдаёт:

- 1 звезду ниже pass threshold;
- 2 — при pass;
- 3 — при достижении «great» bar, не ниже 90.

`components/SpeakingPanel.tsx:1660` берёт `PLAN_PRONUNCIATION_PASS_THRESHOLD`, а `:1975-1982` озвучивает результат как «N из 3 звёзд». В старых комментариях/текстах остаются следы порога 90, тогда как live pass threshold сейчас ниже. V2 должен иметь один versioned scoring policy и запретить дублировать числа в copy.

### Пять разошедшихся voice flows

Отдельные state machines существуют как минимум в:

1. `components/SpeakingPanel.tsx`;
2. personal plan pronunciation;
3. Speaking Club session;
4. AI Dialog session;
5. onboarding SpeechBeat.

Они по-разному решают permission, start/stop, timeout, navigation cleanup, TTS collision, retry и fallback. Это главный источник будущих расхождений.

V2 обязан вернуть один из четырёх результатов:

```ts
type VoiceAttemptOutcome =
  | 'PASS_CONFIDENT'
  | 'NEEDS_WORK_CONFIDENT'
  | 'UNCERTAIN'
  | 'INVALID_AUDIO_OR_SYSTEM';
```

`UNCERTAIN` и `INVALID_AUDIO_OR_SYSTEM` не должны тратить попытку, ухудшать mastery или выдавать «плохое произношение».

## 5. Speaking Club: что это за режим сейчас

Speaking Club — короткая AI-миссия с заданной ролью, ситуацией, целями и target phrases.

### Текущий цикл

1. пользователь выбирает одну из восьми миссий, сейчас привязанных к ранним урокам;
2. видит роль/ситуацию/цель;
3. говорит или печатает реплику;
4. ввод превращается в текст и отправляется на callable;
5. AI отвечает, ответ воспроизводится TTS;
6. server envelope отмечает objectives/target phrases;
7. после миссии показывается review и сохраняется лучший результат 0–3.

Ключевые файлы:

- `app/speaking_club_home.tsx` — вход и список миссий;
- `app/speaking_club_session.tsx` — session state;
- `app/speaking_club_client.ts` — callable client и local mission progress;
- `functions/src/speaking_club.ts` — server prompt, objectives, quotas и safety;
- `app/speaking_club_client.ts:259-334` — AsyncStorage keys и best-stars save.

### Что означают звёзды Club

Они оценивают выполнение миссии, а не качество звуков:

- базовое завершение;
- использование target phrases;
- выполнение objectives.

Печатный ввод способен получить тот же mission result, что и голос. Поэтому эти звёзды нельзя импортировать как pronunciation mastery без `inputSource` и отдельного voice evidence.

### Несоответствия, которые V2 должен закрыть

- локальные keys включают язык и mission id, но не account id;
- voice и typed input не различаются в learning evidence;
- Club не использует тот же Android audio fallback, что mature pronunciation flow;
- продуктовая спецификация и live-код расходятся по числу turns/rewards;
- core progression не должен зависеть от AI availability, quota или network;
- history/transcript уходит на server/AI path и требует явного privacy copy.

### Роль в V2

Speaking Club лучше Rosetta-like controlled practice не «вместо», а **после** него:

```text
meaning → controlled phrase → voice rehearsal → quick response → Club mission
```

В V2 Club становится последней transfer-задачей эпизода либо optional retry в Practice. Его content objectives должны ссылаться на те же `skillIds` и `phraseIds`, что предшествующие узлы.

## 6. AI Dialog

AI Dialog полезен для свободной беглости и уверенности, но также принимает транскрибированный текст. Он не является независимым pronunciation scorer.

Рекомендуемое разделение:

- **Scripted Dialogue:** deterministic, offline-capable, core;
- **Constrained Branching Dialogue:** небольшой локальный граф, core/optional;
- **Speaking Club Mission:** server AI, episode capstone с fallback;
- **Open AI Dialog:** Practice/Plus, не gate.

## 7. Экзамены, Challenges и награды

Legacy exams и наградные компоненты уже дают зрелый UX завершения. `components/feedback/ResultsSequence.tsx` умеет показывать 0–3 звезды последовательной анимацией. Его можно переиспользовать после нормализации семантики результата.

Daily Challenges сейчас — мета-цели («сделай N действий»), а не собственный учебный renderer. В V2 они естественно превращаются в optional side nodes или ежедневные playlists из activity registry. Но до паритета сохраняется текущий вход и storage.

## 8. Админ-генератор: две параллельные системы

### Новый stage-based generator

`admin/v2/scripts/pages/content-generator.js` поддерживает:

- lessons: outline, phrases, vocabulary, irregular verbs, prepositions, theory;
- quizzes;
- challenges;
- flashcards;
- arena.

Сильные стороны:

- стадии создаются и запускаются отдельно;
- immutable preview;
- ручное approve/reject;
- derived stages из approved prerequisites;
- replacement одного вопроса/карточки;
- quality receipt/fingerprint;
- retry semantics.

Ограничение: approved artifact ещё не является автоматически доступным мобильному runtime release.

### Старый course release factory

Умеет seal, activate и rollback структуры вида:

```text
course-releases/{releaseId}/{surface}/{lessonId}.json
content_factory_catalog/{studyTarget}:{sourceLocale}
```

Есть callable `getPublishedCourseRelease`, но мобильный клиент пока не использует его как source of truth.

### Рекомендуемый шов

```text
approved modular stages
  → stage-to-course-release adapter
  → sealed CourseRelease + index + hashes
  → client content loader
  → activity/legacy adapters
  → renderer
```

Нельзя писать третий release system. Нужно соединить сильные стороны двух существующих.

## 9. Языковое масштабирование: что мешает сейчас

В интерфейсах и registries языков больше, чем в фактически валидируемом pipeline. Отдельные extractor/validator paths всё ещё предполагают `studyTarget=en`; старые factory contracts принимают меньше языков, чем UI обещает.

До «одной кнопки — новый язык» нужны независимые проверки:

- язык изучения и язык объяснений;
- locale-specific normalization/tokenization;
- script/alphabet capabilities;
- TTS/STT provider coverage;
- phoneme inventory и scoring-provider support;
- grammatical feature schema без English-only полей;
- localization completeness;
- content safety и cultural review;
- audio/image asset availability;
- release manifest по паре `studyTarget + sourceLocale`.

Пилот должен пройти end-to-end на `en ← ru`, затем тот же контракт проверяется на одном небольшом non-English slice до массового расширения.

## 10. Риски совместимости

| Риск | Что его вызывает | Защита |
|---|---|---|
| Потеря legacy прогресса | переиспользование старых keys с новой семантикой | namespace `v2:*`, read-only legacy adapter |
| Двойные награды | один completion проходит через legacy и V2 handlers | единый idempotency key с release/activity/attempt |
| «Купленное владение» | одна цифра stars одновременно используется для награды, access и learning evidence | performance stars и derived earned access отделены от objective-level learning evidence; purchased boost хранится отдельным receipt |
| Ложная phoneme точность | transcript/G2P показывается как acoustic result | evidence capability labels и provider-specific UI |
| Блокировка на шуме | любой STT fail считается ошибкой ученика | quality gate + `UNCERTAIN/INVALID` + fallback |
| Горячие скрытые экраны | timers/recorders продолжают работать после blur | focus/AppState gating и central cleanup |
| Тяжёлый bundle | статический import сотен generated episodes | registry/loader seam и release cache |
| Невозможный rollback | progress жёстко привязан к mutable content | immutable releaseId/contentHash + skill-level evidence |
| Несовпадение админки и клиента | generator schema не равна runtime schema | один versioned shared contract package |
| Обход callable-only Content Studio | текущий Firestore catch-all разрешает admin-клиенту прямую запись, а более узкий deny не перекрывает broad allow | до создания authoring namespaces инвентаризировать legacy direct writes, заменить catch-all явными legacy rules и доказать admin-client denial в emulator |

## 11. Решение build / buy / defer

| Компонент | Решение пилота |
|---|---|
| Episode graph, registry, progress, stars ledger | Build |
| Transcript-based intelligibility scorer | Reuse, переименовать честно и обернуть capability contract |
| Настоящий acoustic/phoneme scorer | Provider abstraction; один benchmark spike до обещаний в UI |
| Voice capture lifecycle | Build shared shell из существующих зрелых частей |
| Speaking Club AI | Reuse как optional/capstone, исправить evidence и account scope |
| Scripted dialogue | Build deterministic core на activity engine |
| Content generator | Extend existing stage pipeline |
| Release/rollback | Connect existing factory, не переписывать |
| Legacy migration | Adapter-first, staged rollout |
| Большая licensed media library как EWA | Defer; использовать собственные microstories/scenes |

## Вывод

Проект находится не в точке «нужно придумать все режимы с нуля», а в точке «нужно дать существующим режимам общий язык». Первый инженерный milestone — не рисование 32 карт и не массовая генерация контента, а один вертикальный эпизод, где admin artifact, release, client loader, activity renderer, voice evidence, stars ledger и offline progress проходят весь путь без ручных склеек.
