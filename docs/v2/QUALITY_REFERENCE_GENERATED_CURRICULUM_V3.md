# PHRASEMAN LEARNING V2 — QUALITY REFERENCE FOR GENERATED CURRICULUM

**Version:** `learning-quality-reference.v3`  
**Purpose:** единый эталон, по которому Codex и QA-agents оценивают качество сгенерированного учебного материала.

> Перед авторством или оценкой интро, фраз, локализаций и дистракторов обязательно
> прочитать [`LEARNING_CONTENT_STYLE_BIBLE.ru.md`](./LEARNING_CONTENT_STYLE_BIBLE.ru.md).
> Quality Reference оценивает педагогический результат, а Style Bible задаёт
> неизменный голос, locale-native авторство и известные классы регрессий.
> Также обязателен
> [`MODE_NATIVE_AUTHORING_CONTRACT.ru.md`](./MODE_NATIVE_AUTHORING_CONTRACT.ru.md):
> качество задания оценивается только внутри реальной approved mechanic и её
> exact owner-макета, а не по строке `family`.

## 1. Роль этого документа

Этот документ является **quality reference**, а не продуктовой спецификацией курса.

Актуальная спецификация Learning V2 определяет структуру продукта: количество уроков и сессий, activity types, генерационный pipeline, персональные планы, форматы данных, sequencing rules и остальные продуктовые решения. Quality Reference получает эту структуру и созданный по ней материал как контекст и отвечает на другой вопрос:

> **Насколько хорошо конкретный сгенерированный материал реализует заявленную учебную цель, соответствует CEFR и языковой норме, образует логичную прогрессию и действительно способен обучать?**

Поэтому проверяется не само число уроков или сессий, а качество их содержания и взаимосвязи.

Например, актуальная спецификация описывает урок с 56 сессиями. Quality Reference оценивает:

- правильно ли выбрана и сформулирована цель урока;
- соответствует ли она заявленному CEFR-контексту;
- имеет ли каждая из 56 сессий осмысленную учебную функцию;
- составляют ли все сессии вместе полноценный путь к общей цели;
- соответствуют ли фразы, теория, аудио и задания цели конкретной сессии;
- растёт ли самостоятельность пользователя логично;
- проверяет ли итоговая практика реальное умение, а не запоминание интерфейса или конкретного примера.

---

# 2. Единица качества: OBJECTIVE → CONTENT → PRACTICE → EVIDENCE

Каждый учебный фрагмент оценивается как цепочка:

```text
COMMUNICATIVE OBJECTIVE
        ↓
LANGUAGE CONTENT
        ↓
GUIDED PRACTICE
        ↓
RETRIEVAL / APPLICATION
        ↓
EVIDENCE OF LEARNING
```

Высококачественный материал сохраняет эту связь на всех уровнях:

```text
Course intent
  → Lesson objective
      → Session objective
          → Phrase / rule / listening target
              → Activity
                  → Feedback
                      → Assessment evidence
```

Если любой элемент существует сам по себе и не помогает достижению родительской цели, это сигнал качества.

---

# 3. CEFR ALIGNMENT

CEFR используется как рамка для проверки **коммуникативной сложности и способности пользователя что-то делать на языке**, а не как список обязательных фраз.

## 3.1. Что проверять

### CEFR-Q1 — Communicative outcome

У урока должна быть наблюдаемая коммуникативная цель.

Сильная цель описывает действие пользователя, например способность понять, спросить, ответить, описать, договориться, объяснить, сравнить или поддержать взаимодействие в определённом контексте.

Слабая цель описывает только содержимое:

- «изучить 50 слов»;
- «изучить Present Simple»;
- «тема: ресторан».

Само знание категории ещё не является communicative outcome.

### CEFR-Q2 — Level plausibility

Фактическая сложность материала должна быть согласована с заявленным уровнем или progression point.

Оценивается совместно:

- vocabulary frequency и concreteness;
- grammatical complexity;
- sentence length и syntactic embedding;
- amount of inference;
- discourse length;
- pragmatic/social complexity;
- listening difficulty;
- speed и reduction речи;
- объём информации, которую пользователь должен удерживать;
- уровень самостоятельности ответа.

Один отдельный показатель не определяет CEFR level.

### CEFR-Q3 — Descriptor traceability

Для level-sensitive решений должна существовать понятная связь с:

1. CEFR / CEFR Companion Volume;
2. language-specific Reference Level Description;
3. авторитетным корпусом или языковым reference source, когда проверяется конкретная форма.

### CEFR-Q4 — Functional relevance

Лексика и грамматика вводятся ради выполнения communicative function, а не просто потому, что относятся к общей теме.

### CEFR-Q5 — Increasing independence

По мере прохождения материала пользователь должен всё меньше зависеть от подсказок и всё больше:

- извлекать форму из памяти;
- понимать вариативный input;
- выбирать форму самостоятельно;
- использовать изученное в новом контексте.

---

# 4. КАЧЕСТВО УРОКА

Урок оценивается как единая педагогическая система.

## LESSON-Q1 — Ясность результата

После чтения lesson objective должно быть понятно, какое новое действие пользователь сможет выполнять лучше после урока.

## LESSON-Q2 — Coherent scope

Содержание урока достаточно широкое для достижения цели, но не содержит большого количества материала, который не помогает этой цели.

## LESSON-Q3 — Coverage completeness

Все необходимые компоненты заявленного результата реально:

- представлены;
- объяснены или показаны;
- отработаны;
- извлечены из памяти;
- проверены в подходящей форме.

## LESSON-Q4 — Internal progression

Последовательность материала образует понятный путь от доступного к менее поддержанному.

Проверить:

- prerequisite knowledge;
- порядок появления новых конструкций;
- постепенное увеличение task demand;
- наличие возврата к ранее изученному;
- переход от узнавания к воспроизведению и применению, когда этого требует цель.

## LESSON-Q5 — No hidden prerequisites

Успех не должен зависеть от языкового элемента, который пользователь ещё не знает и который не является текущим target или явно поддерживаемым элементом.

## LESSON-Q6 — Transfer readiness

Урок считается педагогически сильнее, если пользователь учится работать не только с точными тренировочными фразами, но и с разумными вариациями того же communicative pattern.

---

# 5. КАЧЕСТВО РАЗБИЕНИЯ УРОКА НА СЕССИИ

Quality layer оценивает фактическое session plan, созданное генератором согласно текущей спецификации.

## SESSION-Q1 — Distinct learning purpose

У каждой сессии должна быть понятная учебная подцель.

Вопрос квалификатора:

> Если убрать эту сессию, какой конкретный компонент lesson outcome станет заметно слабее?

Если убедительного ответа нет, требуется проверить полезность или дублирование сессии.

## SESSION-Q2 — Parent alignment

Подцель сессии должна непосредственно поддерживать lesson objective.

Тематического сходства недостаточно.

## SESSION-Q3 — Appropriate scope

Материал внутри одной сессии должен быть достаточно связан, чтобы пользователь мог понять, что именно сейчас осваивается.

## SESSION-Q4 — Prerequisite continuity

Каждая сессия должна опираться на уже доступные знания или корректно вводить необходимые новые элементы.

## SESSION-Q5 — Meaningful progression

При сравнении соседних сессий должен быть виден педагогический переход, например:

- расширение функции;
- contrast;
- новое условие употребления;
- повышение самостоятельности;
- retrieval;
- listening variation;
- transfer;
- consolidation.

Это не шаблон назначения ролей сессиям, а критерий осмысленности фактической последовательности.

## SESSION-Q6 — Coverage matrix

Строить матрицу:

```text
lesson objective component × session
```

Она должна показывать:

- где компонент вводится;
- где практикуется;
- где извлекается из памяти;
- где проверяется;
- где переносится в новый контекст, если это требуется учебной целью.

Матрица используется для выявления пробелов и чрезмерного дублирования.

## SESSION-Q7 — Session integrity

Фразы, теория, listening и activities одной сессии должны проверять и развивать один согласованный набор targets.

---

# 6. КАЧЕСТВО ФРАЗ И ЯЗЫКОВОГО МАТЕРИАЛА

Каждая фраза оценивается не как отдельная строка текста, а как обучающий объект.

## PHRASE-Q1 — Naturalness

Фраза должна звучать естественно для носителя соответствующего варианта языка в заявленном контексте.

Проверять:

- idiomaticity;
- collocations;
- word order;
- register;
- politeness;
- частотность именно данного значения/употребления;
- региональную уместность.

Формально грамматическая, но неестественная калька считается проблемой качества.

## PHRASE-Q2 — Usefulness

Фраза должна приносить реальную ценность для session objective.

Фраза не становится полезной автоматически только потому, что относится к теме урока.

## PHRASE-Q3 — Learnability

Фраза должна быть посильна на текущем progression point с учётом уже доступной лексики и грамматики.

## PHRASE-Q4 — Meaning precision

Для фразы должно быть ясно:

- какое значение изучается;
- какая communicative function;
- какой контекст;
- какой register;
- какие варианты эквивалентны;
- какие похожие ответы меняют значение.

## PHRASE-Q5 — Translation equivalence

Перевод должен сохранять:

- communicative intent;
- polarity;
- modality;
- tense/aspect;
- participants;
- quantity;
- register;
- pragmatic force.

Калька не считается преимуществом, если естественный перевод точнее передаёт функцию.

## PHRASE-Q6 — No fake diversity

Несколько почти одинаковых фраз должны иметь дополнительную учебную функцию: contrast, variation, register, grammar, lexical substitution или retrieval.

Перефразировки только ради наполнения количества снижают quality score.

## PHRASE-Q7 — Reusability

Предпочтительны формы и chunks, которые пользователь сможет комбинировать в новых ситуациях, а не только запомнить как одну фиксированную реплику.

---

# 7. THEORY / EXPLANATION QUALITY

## THEORY-Q1 — Immediate usefulness

Теория объясняет именно то, что нужно для текущих языковых действий.

## THEORY-Q2 — Accuracy

Объяснение не должно создавать ложных универсальных правил.

Упрощение допустимо, если оно остаётся практически корректным в диапазоне материала пользователя.

## THEORY-Q3 — Minimal sufficient explanation

Предпочтение отдаётся минимальному объяснению, достаточному для правильного понимания и применения материала.

## THEORY-Q4 — Examples align

Все примеры должны соответствовать самому объясняемому правилу и текущему уровню сложности.

## THEORY-Q5 — Contrast where useful

Если типичная ошибка возникает из-за сходства двух форм, короткое contrastive explanation обычно полезнее дополнительного общего текста.

---

# 8. ACTIVITY QUALITY

Activity mechanics определяются продуктовой системой; Quality Reference оценивает качество конкретного наполнения.

## TASK-Q0 — Mode-native integrity и mockup parity

Каждое задание должно иметь versioned family-native payload выбранного из семи
approved режимов и материализоваться в learner bundle без generic-подмены.
Интерфейс, состояния, gestures, audio, feedback и motion должны совпадать с
каноническим owner HTML 1:1. BLOCKER независимо от среднего score:
отсутствующий payload/audio, single-choice вместо pair grid, три произвольных
варианта вместо A/B sound contrast, hold-to-talk/binary substitute вместо
repeat-and-compare, WIP renderer или красивый demo, собранный не из настоящего
source.

## TASK-Q1 — Construct alignment

Задание должно проверять то языковое умение, ради которого создано.

Например, результат не должен в основном зависеть от:

- памяти позиции ответа;
- визуальной подсказки;
- общей эрудиции;
- скорости нажатия;
- угадывания по длине слова.

## TASK-Q2 — Clear instruction

Пользователю понятно, что требуется сделать.

## TASK-Q3 — Correct answer integrity

Correct key соответствует prompt, context, audio и target meaning.

## TASK-Q4 — Accepted answer completeness

Естественные эквиваленты, допустимые текущей answer policy, должны корректно распознаваться.

## TASK-Q5 — Distractor quality

Хороший distractor:

- правдоподобен;
- связан с типичной ошибкой;
- однозначно неверен в данном контексте;
- не выдаёт ответ визуально;
- соответствует общей сложности задания.

Каждый distractor имеет диагностическую связь с construct: `trapType`,
конкретную ошибочную модель и собственное объяснение. Типология включает
грамматическую, смысловую, сочетаемостную/прагматическую, звуковую, графическую,
L1-transfer и ошибку сборки; полный контракт находится в
[`СТАРТ В2`](<./СТАРТ В2.md>) §7.

BLOCKER независимо от среднего score: случайный или очевидно чужой вариант;
недоказанная механическая `s/ed/ing`-мутация; несколько distractors с одной
скопированной причиной; объяснение без выбранного варианта и конкретной
ловушки; естественно допустимая альтернатива; звуковая ловушка без достаточного
audio evidence; механический перевод L1-transfer между локалями.

## TASK-Q6 — No clue leakage

Правильный ответ нельзя устойчиво вычислить по formatting, capitalization, punctuation, option length, repeated position или другим нелингвистическим подсказкам.

## TASK-Q7 — Feedback quality

Feedback показывает, в чём именно была ошибка и что отличает правильный вариант.
Он называет выбранный distractor, объясняет, почему ловушка правдоподобна,
показывает точную поломку в данном контексте и даёт переносимый признак для
распознавания этой ошибки в новой фразе.

---

# 9. LISTENING И AUDIO QUALITY

## AUDIO-Q1 — Text/audio identity

Аудио семантически и текстово соответствует target item и заданному accepted pronunciation variant.

## AUDIO-Q2 — Pronunciation quality

Проверяются:

- segmental accuracy;
- word stress;
- sentence stress;
- rhythm;
- intonation;
- linking/reduction там, где они уместны;
- отсутствие артефактов TTS.

## AUDIO-Q3 — Level-appropriate comprehensibility

Сложность восприятия должна соответствовать цели текущего activity.

## AUDIO-Q4 — Useful variability

Если материал предполагает развитие понимания речи, полезна контролируемая вариативность голоса, темпа и prosody без изменения target difficulty случайным образом.

## AUDIO-Q5 — Listening construct validity

Listening task должен проверять понимание речи, а не возможность восстановить ответ по текстовой подсказке.

---

# 10. RETRIEVAL, REPETITION И MEMORY QUALITY

## MEMORY-Q1 — Retrieval rather than exposure only

Ключевой материал должен не только повторно показываться пользователю, но и периодически требовать самостоятельного извлечения.

## MEMORY-Q2 — Spacing quality

Повторение полезнее, когда оно распределено во времени/по учебному пути, а не сведено к серии практически идентичных попыток подряд.

## MEMORY-Q3 — Interleaving where meaningful

Когда несколько похожих форм уже доступны пользователю, смешанная практика может проверять выбор между ними лучше, чем полностью блочная практика.

## MEMORY-Q4 — Error-sensitive review

Повторение должно учитывать фактические ошибки пользователя там, где это поддерживается Learning V2.

## MEMORY-Q5 — Variation without target drift

Повтор может менять context или surface form, сохраняя тот же underlying target.

---

# 11. ASSESSMENT QUALITY

## ASSESS-Q1 — Measures the declared outcome

Assessment должен давать доказательство именно того умения, которое заявлено lesson/session objective.

## ASSESS-Q2 — Reduced training leakage

Итоговая проверка сильнее, если не является точной копией тренировочного экрана.

## ASSESS-Q3 — Representative coverage

Проверка должна репрезентативно покрывать ключевые компоненты outcome, а не случайный удобный поднабор.

## ASSESS-Q4 — Independent application

Когда цель предполагает продуктивное использование, assessment должен содержать элемент самостоятельного выбора или построения ответа.

## ASSESS-Q5 — Scoring fairness

Оценка не должна штрафовать естественные языковые варианты, которые сохраняют требуемый смысл и разрешены answer policy.

---

# 12. ПЕРСОНАЛИЗИРОВАННЫЕ ПЛАНЫ

Для персонализированного варианта проверяются два слоя одновременно:

1. качество конкретного адаптированного материала;
2. сохранение заявленного learning outcome соответствующего curriculum unit.

## PLAN-Q1 — Goal relevance

Адаптация действительно повышает релевантность материалу цели пользователя.

## PLAN-Q2 — Equivalent learning value

Персонализированный контент должен тренировать тот же underlying skill/competence, если curriculum contract не задаёт другое.

## PLAN-Q3 — Difficulty stability

Персонализация не должна случайно превращать доступный материал в заметно более сложный только из-за профессиональной или тематической лексики.

## PLAN-Q4 — Natural personalization

Фразы должны оставаться естественным языком, а не механической заменой существительных на слова из выбранной профессии/интереса.

---

# 13. CROSS-ARTIFACT CONSISTENCY

Проверка должна сопоставлять связанные artifacts между собой.

## CONS-Q1

Lesson objective ↔ session objectives.

## CONS-Q2

Session objective ↔ phrases/theory.

## CONS-Q3

Phrase ↔ translation ↔ audio.

## CONS-Q4

Target meaning ↔ accepted answers.

## CONS-Q5

Target ↔ distractors.

## CONS-Q6

Theory ↔ examples ↔ activities.

## CONS-Q7

Practice ↔ assessment.

## CONS-Q8

Generated content ↔ actual bundle presented to learner.

Локально корректные элементы могут образовывать плохой урок, если между ними есть semantic drift.

---

# 14. QUALITY AGENTS

Рекомендуемая проверка может быть разделена между независимыми qualifier roles.

### Q1 — CEFR / communicative alignment

Проверяет objectives, level plausibility и descriptor alignment.

### Q2 — Native-language quality

Проверяет grammar, idiomaticity, register, contemporary usage и regional consistency.

### Q3 — Meaning / translation integrity

Проверяет semantic equivalence, translations, variants и context.

### Q4 — Progression / prerequisite coherence

Проверяет lesson/session sequence, hidden prerequisites, complexity jumps и coverage.

### Q5 — Activity validity

Проверяет task construct, prompts, correct keys, accepted answers, distractors и clue leakage.

### Q6 — Audio / listening quality

Проверяет pronunciation, text/audio consistency и listening validity.

### Q7 — Memory / practice quality

Проверяет retrieval, spacing, variation и review value.

### Q8 — Assessment validity

Проверяет независимость assessment и соответствие learning outcome.

### Q9 — Cross-artifact consistency

Ищет semantic drift между всеми связанными сущностями.

### Q10 — Adversarial final judge

Пытается доказать, что материал выглядит хорошим только поверхностно: ищет естественные альтернативные ответы, скрытые prerequisites, неестественные фразы, fake difficulty, answer leakage и недоказанные learning claims.

Разделение на agents является способом проверки, а не частью curriculum structure.

---

# 15. QUALITY FINDING FORMAT

Каждая обнаруженная проблема должна быть **локализованной и исправимой**.

```json
{
  "criterionId": "PHRASE-Q1",
  "scope": "phrase",
  "location": "lesson/.../session/.../item/...",
  "severity": "ERROR",
  "confidence": 0.96,
  "observed": "Формулировка грамматически возможна, но неестественна в данном контексте.",
  "whyItMatters": "Пользователь запоминает форму, которую носитель обычно не использует.",
  "evidence": ["language reference / corpus / expert evidence"],
  "suggestedRepair": "Заменить target form на естественный эквивалент с сохранением communicative intent."
}
```

Полезные severity levels:

- `BLOCKER` — материал нельзя считать качественно проверенным без исправления;
- `ERROR` — существенная педагогическая/языковая проблема;
- `WARNING` — материал допустим, но заметно слабее возможного варианта;
- `INFO` — улучшение или observation без существенного риска.

---

# 16. QUALITY SCORECARD

Итоговый dashboard должен показывать не только единое число, но профиль качества.

Рекомендуемые dimensions:

```text
CEFR / objective alignment
Lesson coherence
Session progression
Language naturalness
Meaning / translation integrity
Level & prerequisite fit
Phrase usefulness
Theory quality
Activity validity
Accepted answers & distractors
Listening / audio quality
Retrieval & memory design
Assessment validity
Personalization quality
Cross-artifact consistency
```

Для каждого dimension отображать:

- score;
- confidence;
- число blocker/error/warning findings;
- наиболее критичные findings;
- evidence coverage;
- объекты, которые требуют повторной проверки после regeneration.

Итоговое число используется только как навигационный indicator. Серьёзная локальная ошибка не должна исчезать внутри высокого среднего score.

---

# 17. QUALITY GATES

Материал считается прошедшим конкретный quality dimension, когда:

1. отсутствуют критические нарушения данного dimension;
2. необходимые объекты действительно были проверены;
3. evidence достаточен для уверенного решения;
4. нет unresolved contradictions между qualifier agents;
5. исправления не создали regression в связанных artifacts.

Если evidence неоднозначен, результат должен отражать uncertainty вместо искусственной уверенности.

---

# 18. REGENERATION / REPAIR VALIDATION

После изменения материала повторно проверяются:

- сам изменённый объект;
- его родительская session objective;
- связанные answers/distractors;
- translations;
- audio;
- activities, использующие объект;
- assessment, если target участвует в нём;
- coverage/progression, если изменилась учебная роль.

Цель проверки — убедиться, что локальное исправление не ухудшило другой слой урока.

---

# 19. ОСНОВНЫЕ ВОПРОСЫ, КОТОРЫЕ ДОЛЖЕН ЗАДАВАТЬ QUALIFIER

Для любого generated lesson/session/content bundle:

1. **Чему конкретно здесь учится пользователь?**
2. **Соответствует ли это заявленному communicative outcome?**
3. **Правдоподобна ли сложность для текущей точки обучения?**
4. **Достаточно ли prerequisites?**
5. **Естественный ли это язык?**
6. **Именно ли так носитель обычно выражает этот смысл в данном контексте?**
7. **Правильно ли передан смысл в переводе?**
8. **Каждый ли item имеет учебную функцию?**
9. **Подготавливает ли практика к требуемому самостоятельному действию?**
10. **Может ли пользователь угадать ответ без языкового знания?**
11. **Принимаются ли все естественные допустимые ответы?**
12. **Доказывает ли assessment learning outcome?**
13. **Есть ли пробел между тем, чему учили, и тем, что проверяют?**
14. **Есть ли скрытый скачок сложности?**
15. **Согласованы ли между собой objective, theory, phrases, audio, activities и assessment?**
16. **Сможет ли пользователь применить изученное вне точной тренировочной формулировки?**

---

# 20. SOURCE PRINCIPLE

Для проверки использовать наиболее подходящий тип evidence:

- **CEFR / CEFR Companion Volume** — communicative competence, descriptors и level framework;
- **language-specific RLD / English Profile / эквивалент для выбранного языка** — level-sensitive language content;
- **авторитетные dictionaries/grammars** — форма, значение, grammar, register;
- **корпуса живого языка** — naturalness, collocation, usage frequency/context;
- **phonetic references + native review** — pronunciation;
- **peer-reviewed learning research** — retrieval, spacing, feedback, practice design;
- **данные Phraseman** — реальные ошибки, completion, retention и transfer после появления достаточной статистики.

Источник должен соответствовать типу утверждения. Например, CEFR descriptor не является доказательством того, что конкретная фраза идиоматична, а corpus frequency сама по себе не доказывает CEFR level.

---

# 21. DEFINITION OF HIGH-QUALITY GENERATED MATERIAL

Высококачественный материал Phraseman — это материал, в котором:

- цель понятна и коммуникативна;
- сложность соответствует текущей точке обучения;
- урок и его сессии образуют логичную прогрессию;
- язык естественный и современный;
- фразы полезны, а не просто тематически связаны;
- перевод сохраняет реальный смысл;
- теория короткая и точная;
- задания измеряют нужное языковое умение;
- ответы и distractors однозначны;
- аудио соответствует тексту и учебной задаче;
- повторение требует retrieval, а не только повторного просмотра;
- assessment показывает способность применить изученное;
- персонализация сохраняет learning value;
- все artifacts согласованы друг с другом;
- проблемы QA конкретны, доказуемы и пригодны для адресной regeneration.

Именно эта совокупность, а не количество контента само по себе, является основным критерием качества генератора Learning V2.
