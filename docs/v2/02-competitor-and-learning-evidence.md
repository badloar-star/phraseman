# Конкуренты и доказательная база V2

**Проверено:** 2026-07-14  
**Правило интерпретации:** маркетинговые заявления конкурента подтверждают наличие и заявленное назначение функции, но не её независимую эффективность. Там, где UI или формула не опубликованы, документ помечает вывод как гипотезу, а не факт.

## Главный вывод

Вопрос «что лучше: Rosetta Stone или Speaking Club?» поставлен слишком широко: они решают разные этапы.

- **Rosetta-like цикл** лучше для первого знакомства, распознавания смысла, контролируемого повторения и постепенного снятия опор.
- **Speaking Club** лучше для переноса уже подготовленного материала в цельную коммуникативную задачу.
- Использовать только Rosetta-like подход — значит недодать свободного взаимодействия.
- Использовать только Speaking Club — значит бросить новичка в разговор до формирования доступных фраз и фонетических опор.

Правильная связка:

```text
Rosetta-like context and controlled practice
  → ELSA-like targeted feedback
  → Duolingo-like varied path and retrieval
  → EWA-like story/context
  → Speaking Club transfer mission
```

## Быстрое сравнение

| Подход | Сильнее всего | Слабее всего | Роль в Phraseman | Сложность интеграции |
|---|---|---|---|---|
| Rosetta Stone | визуальный контекст, постепенное повторение, speaking from start | мало явных объяснений; возможна угадайка по картинке | foundation внутри каждого эпизода | Средняя |
| Speaking Club | цельная миссия, импровизация, мотивация говорить | новичок может не знать, что сказать; AI/network; текущее voice≠pronunciation | transfer/capstone | Средняя–высокая |
| Duolingo | ясный путь, короткие узлы, вариативность, повторение | отдельные задания могут стать механическими; продуктовые rules часто меняются | карта, pacing, activity mix | Средняя |
| ELSA | детальная voice feedback, sound/word drill, roleplay review | proprietary scoring; высокая цена качественного acoustic pipeline | voice lab и feedback UX | Высокая |
| EWA | истории, медиа, чтение+аудио, contextual vocabulary | licensed media плохо масштабируется; pronunciation feedback не главный дифференциатор | microstories, radio, save-to-review | Средняя без licensed media |
| EULA | небольшой vocabulary app, недостаточно релевантных данных | почти нет доказанной широкой методики | Не включать как источник режима | Низкая/не нужна |

## 1. Rosetta Stone

### Важно: Classic и новый интерфейс — не одно и то же

Официальные материалы одновременно описывают зрелую Classic Course-структуру и более новый Learning Path/Sapphire UX. Нельзя сводить их к одному точному каталогу экранов.

#### Classic Course

Классическая модель:

- level → units → lessons;
- Core Lesson вводит язык;
- Focused Activities укрепляют отдельный навык;
- Review возвращает ранее освоенное;
- Unit Milestone завершает блок разговорной задачей.

Официальный перечень Focused Activities:

- Core Lesson;
- Pronunciation;
- Vocabulary;
- Grammar;
- Listening;
- Listening & Reading;
- Reading;
- Writing;
- Speaking;
- Review.

Источники:

- [Rosetta Course overview](https://resources.rosettastone.com/totalehelp/en-US/Content/RSV4Help/RosettaCourse.htm)
- [Focused Activities](https://resources.rosettastone.com/V4/help/en-US/Content/RSV4Help/FocusedActivities.htm)

#### Типичный педагогический цикл Rosetta

1. услышать слово/фразу и связать с изображением;
2. выбрать сцену по аудио или тексту;
3. повторить модель;
4. увидеть вариации знакомой конструкции;
5. произнести целую фразу по контексту;
6. вернуть материал в focused activity/review;
7. применить в milestone conversation.

Сильная сторона — **смысл раньше перевода и минимальный интерфейсный шум**. Слабая — пользователь иногда решает визуальную головоломку, не формируя продуктивную речь; неоднозначные изображения особенно опасны для абстрактных значений.

### Произношение и TruAccent

Rosetta Stone заявляет собственное распознавание, сравнение речи и немедленную обратную связь. Но публичная продуктовая документация не даёт достаточно данных, чтобы воспроизвести формулу, fairness по акцентам или достоверность phoneme-level результата. Для Phraseman это UI/interaction reference, не готовая научная спецификация.

Что перенять:

- короткий model audio перед записью;
- видимая готовность микрофона;
- мгновенный понятный feedback;
- настраиваемая строгость только после calibration;
- переход звук/слог → слово → фраза;
- возможность прослушать модель и себя.

Что не заявлять без собственного benchmark:

- «сравниваем с носителями»;
- «исправляем каждый звук»;
- «объективный акцент score»;
- CEFR mastery по одному voice score.

### Offline bundles

Classic mobile позволяет скачивать units: официальный support указывает около 70–80 MB на unit, срок доступности 30 дней и синхронизацию прогресса после возврата сети. Это подтверждает bundle-модель, но Phraseman не должен копировать 30-дневное истечение: immutable manifest + cache eviction по объёму/последнему использованию понятнее пользователю.

Источник: [Rosetta Stone Classic Offline Mode](https://support.rosettastone.com/Offline-Mode-for-Learn-Languages-Mobile-App/).

### UI-референсы Rosetta Stone

Официальные product GIFs полезны как референс композиции и состояний, но не как лицензия на pixel-copy:

- [Listening / image choice](https://www.rosettastone.com/_next/static/media/listening-image-full.0zyxc2j942tjl.gif)
- [Speaking / record](https://www.rosettastone.com/_next/static/media/speaking-image-full.0wjw_9dwuhuu9.gif)
- [Reading / writing](https://www.rosettastone.com/_next/static/media/reading-image-full.0owc.o01vzhfk.gif)
- [Vocabulary / grammar](https://www.rosettastone.com/_next/static/media/vocab-image-full.0t7gsav5-4ztd.gif)
- [Conversation](https://www.rosettastone.com/_next/static/media/conversation-image-full.0e1v-ir85~6.9.gif)

### Вердикт для V2

Берём структуру `context → discrimination → controlled production → review → milestone`. Не берём immersion-only как догму, неоднозначную картинку как единственное объяснение и opaque score как истину.

## 2. Speaking Club Phraseman

### Метод

Speaking Club выдаёт цельную социальную задачу: роль, setting, objective и target phrases. Ученик должен поддержать обмен репликами и выполнить цели.

### Сильные стороны

- появляется причина говорить, а не просто повторять;
- одна миссия связывает лексику, грамматику, понимание и реакцию;
- AI может принять несколько естественных формулировок;
- review способен показать более естественный вариант;
- миссия эмоционально сильнее очередного micro-drill.

### Ограничения текущей реализации

- голос после STT превращается в текст; acoustic pronunciation отдельно не оценивается;
- клавиатура может получить тот же mission completion;
- open response повышает cognitive load новичка;
- AI, moderation, TTS и quota создают сетевые/стоимостные failure states;
- target phrase coverage можно «оптимизировать», не ведя естественный разговор;
- нельзя делать такой режим первым контактом с новой фразой.

### Вердикт

Speaking Club — не конкурент всему Rosetta Stone, а аналог позднего Milestone/Roleplay. В каждом V2 эпизоде он получает материал из того же episode graph и появляется после поддержанных упражнений.

## 3. Duolingo

### Что делает путь сильным

Duolingo показывает понятную линейную следующую цель, но чередует типы узлов. Новые intermediate mini-units вводят немного новой лексики и быстро применяют её в Stories, DuoRadio и Video Call; сама компания объясняет сокращение units желанием быстрее перейти от абстрактного повторения к реалистичному использованию.

Источник: [Duolingo — Intermediate mini-units](https://blog.duolingo.com/intermediate-mini-units/).

### Подтверждённые семейства активностей

- picture/meaning recognition;
- word bank, reorder, fill gap;
- typing, translation, dictation;
- listening with slower/replay options;
- repeat/speaking response;
- writing-system/sound exercises в поддерживаемых курсах;
- Stories;
- DuoRadio;
- Adventures;
- Roleplay;
- Video Call;
- Practice: Speak, Listen, Mistakes, Words и повтор immersive content;
- personalized practice;
- Side Quests, Match Madness и другие timed extras.

Источники:

- [Practice tab](https://blog.duolingo.com/guide-to-duolingo-practice-hub/)
- [Ways to practice](https://blog.duolingo.com/ways-to-practice-in-duolingo/)
- [Adventures](https://blog.duolingo.com/adventures/)
- [Video Call](https://blog.duolingo.com/video-call/)
- [Beginner Video Call with Falstaff](https://blog.duolingo.com/beginner-video-call-with-falstaff/)

### Что особенно полезно для голоса

- early call ≈ 1 minute, later до нескольких минут;
- возможность «не могу говорить сейчас» и возврат позже;
- push-to-talk предотвращает перебивание;
- beginner version даёт подсказки/переводы;
- free-flow call не наказывает за каждую ошибку;
- conversation имеет opener, first question, bounded middle и closer, а не бесконечный prompt.

Официальное объяснение blueprint: [How Duolingo designs AI Video Call](https://blog.duolingo.com/ai-and-video-call/).

### Что не копировать

- timed speech как обязательный gate;
- нестабильные Hearts/Energy rules в core curriculum;
- XP как главный proxy обучения;
- одинаковые translation drills без сценарного переноса;
- продуктовый паттерн только потому, что он узнаваем, без проверки на Phraseman cohort.

### Вердикт для V2

Берём path clarity, короткие varied nodes, Mistakes practice, immediate application и optional challenges. Делаем более разговорные фразы и выше долю meaningful spoken output.

## 4. ELSA Speak

### Почему ELSA важна

ELSA разделяет pronunciation practice, conversation, grammar, vocabulary, listening и word stress. Learning Path собирается по уровню, целям и интересам; внутри unit используются разные game types.

Официальный перечень и level suitability: [ELSA Learning Path](https://elsanow.freshdesk.com/en/support/solutions/articles/31000176391-learning-path).

### Сильные mode patterns

- Repeat After Me;
- sound/word/phrase practice;
- tap word → detailed feedback;
- phoneme/word color states;
- model audio и replay user audio;
- word stress;
- scripted conversation;
- roleplay/open-ended conversation;
- grammar: learn, test, roleplay, story, error hunt, speed quiz;
- listening choice;
- vocabulary в тематическом контексте.

### Advanced feedback

Текущая документация различает phoneme-level и word-level feedback в Repeat After Me и Scripted Conversation, с red/yellow/green состояниями. Для V2 полезна глубина drill-down, но цвет обязательно дублируется значком, текстом и screen-reader label.

Источники:

- [Regular vs Advanced pronunciation feedback](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177728-regular-vs-advanced-mode-in-pronunciation-lessons)
- [ELSA navigation and coaches](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177846-navigation-guide-for-elsa)
- [Real-time feedback for AI conversations](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177727-real-time-feedback-for-ai-conversations)

### Communication feedback

Для standalone roleplays ELSA описывает relevance, register, politeness и confidence, но отделяет их от pronunciation/grammar и показывает только B1+ после достаточного объёма речи. Это хороший принцип: не выдавать сложные социально-речевые метрики новичку и не смешивать разные constructs в один score.

Источник: [Communication skills feedback](https://elsanow.freshdesk.com/en/support/solutions/articles/31000177729-communication-skills-feedback-for-standalone-roleplays).

### Вердикт для V2

Берём layered feedback и micro-drill path. Не копируем proprietary «accuracy» как недоказанную истину; сначала benchmark на разных устройствах, шумах, L1-акцентах, возрасте и speech differences.

## 5. EWA

### Метод

EWA сильна не отдельным quiz, а связкой контента:

- короткие курсы и сцены;
- фильмы/сериалы как эмоциональный контекст;
- 10 000+ книг/аудиокниг;
- синхронный текст и аудио;
- tap-to-translate;
- save word → personalized list;
- flashcards и spaced repetition;
- Speaking Topics/бытовые диалоги;
- games/leaderboards.

Источники:

- [EWA product site](https://appewa.com/?language=en)
- [EWA App Store listing](https://apps.apple.com/us/app/ewa-learn-languages/id1200778841)
- [EWA book learning flow](https://blog.appewa.com/how-to-learn-a-language-with-books/)
- [EWA method/about](https://appewa.com/about/)

### Что брать

- microstory или radio внутри episode, а не отдельная библиотека без связи с курсом;
- синхронное выделение текста по аудио;
- tap word/phrase → значение → сохранить в review;
- повтор знакомого chunk в новом контексте;
- эмоционально узнаваемые, но собственные Phraseman-сцены.

### Что не брать в пилот

- дорогое лицензирование массового каталога фильмов;
- зависимость core curriculum от внешнего media right;
- обещание, что простое shadowing по клипу равно проверенному произношению;
- тысячи единиц контента до доказательства одного end-to-end generator/release flow.

## 6. Что такое EULA в этом сравнении

По указанному написанию находится небольшой Android vocabulary-продукт `Eula: Learn Words`, без сопоставимого набора режимов и подтверждённой методики. Он не должен искусственно влиять на архитектуру. Для полноты исследованы два вероятных продукта, которые имелись в виду: ELSA и EWA.

Источник: [Google Play — Eula: Learn Words](https://play.google.com/store/apps/details?id=com.CallyE.Eula).

## 7. Учебные принципы, на которых стоит V2

### 7.1 Сценарный can-do, а не список грамматики

CEFR Companion Volume рассматривает язык как действие и добавляет дескрипторы взаимодействия/медиации. Поэтому эпизод формулируется как «могу представиться и задать два вопроса», а грамматика становится инструментом внутри сценария.

Источник: [Council of Europe — CEFR Companion Volume](https://book.coe.int/en/education-and-modern-languages/8150-common-european-framework-of-reference-for-languages-learning-teaching-assessment-companion-volume.html).

### 7.2 Восприятие перед точным производством

Фонетическая тренировка и auditory discrimination могут улучшать L2 speech, но эффекты зависят от метода и outcome measure. Отсюда отдельный Sound Contrast перед некоторыми production tasks, а не бесконечное повторение непонятого различия.

Источники:

- [Meta-analysis of L2 phonetic training, 2025](https://pubs.asha.org/doi/10.1044/2024_JSLHR-24-00432)
- [Perception training and production meta-analysis](https://www.cambridge.org/core/journals/applied-psycholinguistics/article/abs/can-perception-training-improve-the-production-of-second-language-phonemes-a-metaanalytic-review-of-25-years-of-perception-training-research/57401D28450902EE96659AD10AA11488)

### 7.3 Разделять контролируемую и спонтанную речь

Исследования pronunciation instruction показывают, что результат зависит от того, измеряется ли specific/global feature, human/acoustic score и controlled/spontaneous production. Поэтому 95 за повтор целевой фразы не переносится автоматически в Speaking Club mastery.

Источник: [Saito, 2019 — measurement framework and meta-analysis](https://doi.org/10.1111/lang.12345).

### 7.4 Повторять с вариативностью и интервалом

Повтор эпизода — не идентичный replay. Один и тот же chunk возвращается через listening, reconstruction, speaking, microstory и delayed transfer. Это снижает возможность запомнить расположение кнопок вместо языка.

### 7.5 Feedback должен указывать следующее действие

Каждый результат отвечает на три вопроса:

1. что система уверенно услышала/увидела;
2. что уже получилось;
3. что сделать в следующей попытке.

«62/100» без объяснения не является учебной обратной связью.

### 7.6 Intelligibility важнее имитации «идеального носителя»

Пилот оптимизирует понятность, стабильное воспроизведение chunks, word stress/critical contrasts и коммуникативный успех. Акцент сам по себе не ошибка.

## 8. Отобранный порядок внутри эпизода

| Фаза | Основной вопрос ученика | Подходы-источники | Тип результата |
|---|---|---|---|
| Encounter | «Что здесь происходит?» | Rosetta, EWA | понимание смысла |
| Notice | «Что я должен услышать?» | Rosetta, ELSA | discrimination/recognition |
| Build | «Как устроена полезная фраза?» | Duolingo, ELSA grammar | reconstruction/recall |
| Speak | «Могу ли я это произнести?» | Rosetta, ELSA | controlled voice evidence |
| Respond | «Могу ли я быстро ответить?» | Duolingo/Falstaff | constrained production |
| Transfer | «Могу ли я решить задачу?» | Rosetta Milestone, Adventures, Speaking Club | communicative outcome |
| Review | «Смогу ли я снова, позже и в иной форме?» | Duolingo Mistakes, EWA SRS | delayed learning evidence; durable mastery только после отдельного policy decision |

## 9. Приоритет реализации режимов

### P0 — нужен для первого вертикального эпизода

- Visual Discovery;
- Listen & Choose;
- Phrase Builder;
- Scripted Repeat & Compare;
- Quick Spoken Response;
- Scripted Dialogue;
- delayed Mistakes Review.

### P1 — делает 8 эпизодов полноценной главой

- Sound Contrast;
- Listen & Build;
- Context Gap;
- Shadowing;
- Microstory/Radio;
- Speaking Club mission;
- checkpoint.

### P2 — добавляет масштаб и разнообразие после проверки P0/P1

- Sound/Syllable Lab с настоящим provider capability;
- Describe Scene;
- Branching Adventure;
- speed modes;
- open AI dialog;
- advanced prosody/communication metrics.

## 10. UI-reference protocol

Для каждого нового mode storyboard должен хранить:

- URL и дату доступа;
- приложение/версию, если видна;
- какой interaction pattern изучается;
- какие детали нельзя копировать буквально;
- 4–6 собственных кадров Phraseman;
- loading, offline, permission denied, uncertain и accessibility states;
- motion notes и reduced-motion substitute.

Референс нужен для решения проблемы пользователя, а не для клонирования визуальной идентичности конкурента.
