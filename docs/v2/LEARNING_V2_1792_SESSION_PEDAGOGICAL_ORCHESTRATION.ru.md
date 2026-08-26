# Learning V2 — педагогическая оркестрация 1 792 сессий

**Статус:** `NORMATIVE`, утверждённый owner contract.  
**Решение владельца:** 2026-08-25.  
**Область:** все 32 урока × 56 сессий, все target languages и восемь
source-locales Learning V2.  
**Короткое решение:** жёсткий учебный каркас + ограниченная адаптация.

Этот документ определяет, как из семи mode-native механик строится связный
курс, а не случайная карусель упражнений. Он дополняет, но не ослабляет:

- [`СТАРТ В2.md`](<./СТАРТ В2.md>);
- [`MODE_NATIVE_AUTHORING_CONTRACT.ru.md`](./MODE_NATIVE_AUTHORING_CONTRACT.ru.md);
- [`LESSON_DESIGN_RULES.ru.md`](./LESSON_DESIGN_RULES.ru.md);
- [`LEARNING_CONTENT_STYLE_BIBLE.ru.md`](./LEARNING_CONTENT_STYLE_BIBLE.ru.md).

При конфликте действует более новое прямое решение владельца. Ни этот документ,
ни научный источник не разрешают обходить gates, менять grammar boundary,
генерировать интро шаблоном или пакетно писать будущий learner-facing контент.

---

## 1. Решение владельца

Фиксированы:

- порядок тем, уроков, глав и сессий;
- `can-do`, grammar boundary и prerequisite graph;
- обязательные evidence states и независимые проверки;
- три интро `concept → formula → trap`;
- word-first до первого обязательного употребления;
- все шесть активных mode-native families в каждой сессии;
- отсутствие соседних одинаковых families;
- запрет повтора `exact target + family` внутри сессии;
- восемь самостоятельных source-locales;
- диагностические дистракторы и ручной feedback;
- последовательное authoring одной текущей сессии.

Адаптироваться под ученика могут только:

- интервалы возврата знакомого материала;
- уровень и скорость снятия подсказок;
- сложность внутри уже разрешённой grammar/can-do boundary;
- набор знакомых элементов, возвращаемых на повторение;
- recovery route после ошибки или технической недоступности.

Адаптация не может:

- перепрыгнуть prerequisite;
- скрыть обязательный construct;
- заменить production одним recognition;
- вводить неутверждённую лексику или грамматику;
- превращать speed/engagement в mastery;
- менять checkpoint после просмотра ответа;
- выдавать accessibility fallback за evidence недоступного construct.

---

## 2. Evidence boundaries

| Решение | Claim label | Основание и граница |
|---|---|---|
| Outcome формулируется как наблюдаемое `can-do` | `OFFICIAL_STANDARD` | [CEFR descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors); descriptor не задаёт число уроков или автоматическую сертификацию |
| Повторение требует извлечения, а не перечитывания | `PRIMARY_EVIDENCE` | [Karpicke & Roediger, 2008](https://doi.org/10.1126/science.1152408); эксперимент с иностранной лексикой не определяет универсальную частоту повторений |
| Новичку сначала даётся связное начальное освоение, затем interleaving | `PRIMARY_EVIDENCE` + `SYNTHESIS` | [Hwang, 2025](https://onlinelibrary.wiley.com/doi/full/10.1111/lang.12659); выборка ограничена низкоуспевающими корейскими подростками |
| Повторения распределяются во времени | `PRIMARY_EVIDENCE` | [Bahrick et al., 1993](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.1993.tb00571.x/), [Cepeda et al., 2008](https://pubmed.ncbi.nlm.nih.gov/19076480/); универсального интервала нет |
| Comprehension и production требуют собственного practice/evidence | `PRIMARY_EVIDENCE` | [DeKeyser & Sokalski, 1996](https://doi.org/10.1111/j.1467-1770.1996.tb01354.x); эффект зависит от конструкции и задержки теста |
| Output используется после понятной модели, а не вместо неё | `PRIMARY_EVIDENCE` | [Izumi, 2002](https://doi.org/10.1017/S0272263102004023); исследовалась конкретная английская конструкция |
| Ошибочный вариант сопровождается конкретным feedback | `PRIMARY_EVIDENCE` | [Butler & Roediger, 2008](https://doi.org/10.3758/MC.36.3.604), [Lyster & Saito, 2010](https://doi.org/10.1017/S0272263109990520); wrong lure нельзя оставлять без коррекции |
| Первые четыре контакта со словом не считаются mastery | `PRIMARY_EVIDENCE` + `SYNTHESIS` | [Webb, 2007](https://doi.org/10.1093/applin/aml048); разные аспекты слова развиваются с разным числом встреч |
| Perception и production произношения тренируются раздельно и вместе | `PRIMARY_EVIDENCE` | [Alshangiti & Evans, 2024](https://pubmed.ncbi.nlm.nih.gov/38984810/); результат зависит от proficiency и training mode |
| Точные interaction counts, session weights и cadence ниже | `PRODUCT_HYPOTHESIS` | Начальная конфигурация Phraseman; обязательна калибровка delayed-пилотом |

Требование использовать все шесть активных modes в каждой сессии — owner product
contract, а не универсальный научный закон. Оно педагогически допустимо только
при условии, что все шесть действий служат одному `can-do`, интерфейс режима уже
понятен ученику, а ни один контакт не является filler.

---

## 3. Многоуровневый учебный каркас

```text
Course: 32 lessons
└── Lesson: одна grammar/can-do boundary, 56 sessions
    └── Chapter: одна микропрогрессия, 8 sessions
        └── Session: один primary can-do step
            └── Interaction: одна учебная операция в одном native mode
```

### 3.1 Урок

Каждый урок имеет:

- одно основное коммуникативное действие;
- одну ограниченную grammar boundary;
- список prerequisites из предыдущих уроков;
- семь chapter outcomes;
- lesson-level final transfer в сессии 56;
- запланированные ссылки возврата материала в будущих уроках.

Количество тем не растягивается искусственно. Глубина создаётся через лица,
формы, вопросы, отрицания, смысловые слоты, живые контексты, понимание на слух,
скорость извлечения, произношение и перенос — всё внутри границы урока.

Для каждого урока перечисление выше применяется только в той части, которую
разрешает его собственная строка `Грамматика` в документе 03. Оно не является
универсальной лицензией добавлять лица, вопросы или отрицания. В частности,
решение владельца 2026-08-25 фиксирует для урока 1 только утвердительные модели
`I am / you are` и `I'm`; полной таблицей, вопросом и отрицанием владеет урок 2.
Локальные карты и планы не могут расширять эту boundary.

### 3.2 Глава из восьми сессий

| Позиция | Роль | Новое | Поддержка | Основное evidence |
|---|---|---|---|---|
| 1 | Encounter и лексический seed | Да | Максимальная | supported recognition |
| 2 | Notice и точное различие | Да | Высокая | discrimination + supported form |
| 3 | Guided application | Да | Средняя | controlled retrieval/application |
| 4 | Retrieval | Только допустимая лексика | Средняя → низкая | lower-support retrieval |
| 5 | Variation | Только допустимая лексика | Низкая | changed-slot application |
| 6 | Near transfer и repair | Только допустимая лексика | Низкая | changed-context response |
| 7 | Voice | Нет | Фраза → cue → none | spoken production знакомого |
| 8 | Checkpoint | Нет | Минимальная | independent evidence |

Сессии 8/16/24/32/40/48 проверяют главы. Сессия 56 соединяет все chapter
outcomes урока и не вводит новый материал.

### 3.3 Сессия

Каждая сессия следует порядку:

```text
3 intro pages
→ encounter/word-first
→ guided practice
→ retrieval/application
→ transfer or independent check
```

Поддержка убывает внутри сессии. Первое правильное действие с полной моделью не
может быть единственным доказательством. Последний assessable contact использует
новый prompt/context и не повторяет тренировочный экран.

---

## 4. Шесть активных режимов и их учебные функции

| Mode | Основные функции | Не доказывает самостоятельно |
|---|---|---|
| `listen_choose` | encounter, aural comprehension, meaning recognition | production или точную форму |
| `phrase_builder` | controlled assembly, order, form recall | свободную речь |
| `listen_build_dictation` | aural decoding, form retrieval, chunk boundaries | spontaneous production |
| `context_gap_grammar` | form-function choice, grammar discrimination in context | automatic speaking |
| `speed_match` | fluency и скорость извлечения знакомого | initial learning или mastery |
| `scripted_repeat_compare` | model imitation, spoken retrieval, self-comparison | acoustic correctness без принятой calibration |

Размер словарной сетки фиксирован владельцем 2026-08-26: первая сессия курса
использует четыре разные уже введённые word-first пары; начиная со второй —
восемь разных ранее изученных слов, включая допустимый delayed return из
предыдущих сессий. Незнакомый target или повтор пары ради заполнения сетки
считается curriculum leakage.

Mode выбирается после определения учебной операции. Запрещено сначала написать
универсальное задание, а затем присвоить ему family.
`sound_contrast` снят владельцем с активного authoring 2026-08-25; исторические
payloads читаются только для совместимости и не назначаются новым заданиям.

### 4.1 Ведущий и вспомогательные modes

Все шесть присутствуют в каждой сессии, но равный вес запрещён как механический
default. У сессии есть один-два ведущих construct и соответствующие ведущие
modes. Остальные режимы должны:

- подготовить ведущий construct;
- проверить его с другой стороны;
- снять опору;
- вернуть prerequisite;
- дать transfer/recovery;
- собрать независимое evidence.

Если для режима нельзя назвать такую функцию одним предложением, interaction
удаляется или перепроектируется: наличие mode ради количества даёт `HOLD`.

---

## 5. Стартовые interaction profiles

Точные веса — `PRODUCT_HYPOTHESIS`; они соблюдают действующие budgets и
калибруются по delayed retention, а не по completion.

| Профиль | LC | PB | LB | CG | SM | SRC | Всего |
|---|---:|---:|---:|---:|---:|---:|---:|
| `rapid words_then_phrases` | 5 | 4 | 3 | 3 | 2 | 3 | 20 |
| `standard development` | 3 | 3 | 3 | 3 | 2 | 2 | 16 |
| `recall/near-transfer` | 2 | 3 | 3 | 3 | 3 | 2 | 16 |
| `voice-heavy` | 1 | 1 | 2 | 1 | 1 | 6 | 12 |
| `checkpoint` | 3 | 2 | 3 | 3 | 2 | 3 | 16 |

Сокращения: LC=`listen_choose`, PB=`phrase_builder`,
LB=`listen_build_dictation`, CG=`context_gap_grammar`, SM=`speed_match`,
SRC=`scripted_repeat_compare`.

Профиль не задаёт фиксированную последовательность. Реальный порядок строится
по prerequisites и support gradient. Валидатор проверяет counts и ограничения,
но не превращает таблицу в один повторяющийся сценарий для 1 792 сессий.

---

## 6. Обязательный choreography contract

До написания learner-facing текста author фиксирует для каждого interaction:

1. `objectiveId` и проверяемый construct;
2. exact target и его prior state;
3. learning function:
   `encounter | recognize | discriminate | retrieve_meaning | build_form |
   assemble | comprehend | pronounce | apply | transfer | independent_check`;
4. выбранную family и объяснение, почему её действие подходит;
5. support level до и после interaction;
6. mode-native payload, audio и visible/hidden states;
7. distractor trap model и feedback route;
8. evidence, которое interaction вправе и не вправе создать.

Сборка блокируется, если:

- нет всех шести активных families;
- соседние practice interactions имеют одну family;
- повторяется `exact target + family`;
- support возрастает без recovery-причины;
- один и тот же prompt используется для training и independent evidence;
- режим измеряет другой construct;
- ответ раскрыт до попытки;
- Speed Match содержит незнакомый материал;
- audio/voice mode не имеет честного audio/unavailable route;
- interaction существует только ради budget.

### 6.1 One-time mode onboarding

Абсолютный новичок не обязан заранее знать шесть интерфейсов. При первом
появлении каждого режима показывается короткий zero-stakes coach layer:

- он объясняет только действие пальцем/голосом;
- не содержит нового языкового правила;
- не считается interaction или evidence;
- после успешного действия больше не появляется без запроса;
- имеет screen-reader и reduced-motion варианты.

Так все шесть modes остаются в первой сессии, но знание интерфейса не путается со
знанием языка.

---

## 7. Word-first и переход от blocked к interleaved practice

До первого обязательного употребления exact нового слова появляется штатная
blocking-карточка. Затем слово проходит четыре разные функции:

```text
card encounter
→ recognize
→ retrieve meaning
→ build form
→ apply in phrase
```

При нескольких словах сохраняется owner-order:

1. карточка появляется just-in-time перед первым interaction exact token;
2. стадия recognize проходит по всему малому когерентному набору;
3. стадия retrieve meaning проходит по тому же набору;
4. стадия build form проходит по тому же набору;
5. затем слова interleave-ятся во фразах и ситуациях.

Это не хаотическое interleaving: блокируется одна учебная функция и одна
семантически связная микротема, а targets чередуются, чтобы ученик не отвечал по
позиции. После первичного освоения материал смешивается с близкими знакомыми
элементами для discrimination и retrieval.

Voice, recall и checkpoint не вводят новые слова.

---

## 8. Support fading

Каждый target движется по состояниям:

```text
unseen
→ encountered
→ recognized
→ meaning_retrieved
→ form_built
→ context_applied
→ spoken_or_written_produced
→ independently_retrieved
→ delayed_retained
```

Поддержка движется:

```text
model + exact meaning
→ full text
→ partial cue
→ visual/context cue
→ no critical cue
```

Ошибка может временно поднять support на один уровень, но следующий assessable
contact снова проверяет lower-support retrieval. Две обязательные learning
retries — максимум; затем предлагается supported continue или alternate route.

---

## 9. Повторение во времени

Статическая curriculum map гарантирует возврат, adaptive scheduler уточняет
момент и материал.

| Момент | Функция | Evidence status |
|---|---|---|
| Та же сессия | near transfer с новым slot/context | не delayed mastery |
| Следующая сессия | короткое извлечение prerequisite | recent retrieval |
| Через 2–4 сессии | другой mode и новая ловушка | interleaved retrieval |
| Конец главы | независимый changed-context probe | independent evidence |
| Следующая глава | перенос в другую микротему | cross-context evidence |
| Сессия 56 | итоговая интеграция урока | lesson-level evidence |
| Реальная задержка D+3…D+7 | pinned delayed probe | durable evidence при валидном окне |
| Будущий урок | prerequisite recycling | cross-lesson retention |

Точные интервалы внутри разрешённых окон зависят от prior performance, времени
ответа, support use и повторяемости trapType. Completion, streak и XP не
определяют расписание mastery.

Один target не возвращается тем же prompt и тем же family. Повторение меняет
как минимум одну учебную ось: context, semantic slot, input direction, mode,
support или required output.

---

## 10. Curriculum graph до learner-facing authoring

Пакетно разрешено проектировать только метаданные учебного каркаса:

1. 32 lesson outcomes и grammar boundaries;
2. prerequisite DAG между уроками;
3. 224 chapter outcomes;
4. 1 792 session packets;
5. planned review edges и assessment probes;
6. coverage matrix constructs × sessions;
7. lexical introduction ledger;
8. sound-focus profiles по source-locale.

Session packet до authoring содержит:

- lesson/chapter/session ordinal;
- primary `can-do` step;
- grammar boundary;
- prerequisite objective states;
- новые слова и редакторскую причину их выбора/отсутствия;
- знакомые targets для retrieval;
- SessionKind и interaction profile;
- ведущие learning functions/modes;
- independent и delayed probe refs;
- prohibited future material.

Learner-facing интро, фразы, задания, distractors, feedback и локали пишутся
только для одной текущей разрешённой сессии после preflight. Будущие session
packets не дают права создавать их контент заранее.

---

## 11. Quality gates

Сессия не переходит в `AUTO_PASS`, пока одновременно не пройдены:

1. **Curriculum gate:** outcome, boundary, prerequisites, chapter role.
2. **Lexicon gate:** word-first, introduction ledger, no unknown leakage.
3. **Mode-function gate:** операция соответствует family и payload.
4. **Choreography gate:** все шесть, no adjacency, no target+family duplicate,
   support fading, independent prompt.
5. **Language gate:** natural target, восемь locale-native версий, exact meaning.
6. **Distractor gate:** минимум применимых диагностических ловушек и отдельный
   feedback по каждой.
7. **Evidence gate:** recognition/production/listening/speaking не смешаны.
8. **Runtime parity gate:** реальный source → shard → package → phone runtime,
   owner mock parity, audio, motion, offline и accessibility.
9. **Zero-beginner audit:** человек не встречает скрытого prerequisite и
   понимает, что делать без знания внутренних терминов.
10. **Adversarial audit:** нельзя системно угадать по длине, позиции, цвету,
    повтору или очевидно чужим distractors.
11. **Delayed-design gate:** важные targets имеют distinct pinned future probe.
12. **Human owner review:** красивый structural PASS не заменяет редактуру.

Любой новый класс ошибки исправляется в материале, нормативном правиле,
измеримом RED-гейте и milestone handover.

---

## 12. Масштабирование производства

### Phase A — общий mode-native seam

- Шесть активных payloads проходят source → shard → package → runtime без потери данных.
- Все native modes воспроизводят owner mock на телефоне.
- Есть state, motion, audio, accessibility и unavailable receipts.

### Phase B — полный curriculum skeleton

- Утверждены 32 lesson outcomes/boundaries.
- Утверждены 224 chapter outcomes.
- Все 1 792 session packets проходят DAG/coverage/load review.
- Learner-facing content будущих сессий ещё не создаётся.

### Phase C — Lesson 1 vertical pilot

- Все 56 сессий пишутся последовательно.
- Каждая проходит gates и реальный phone preview.
- После урока выполняется whole-lesson novice/progression/adversarial audit.

### Phase D — learning pilot

- Измеряются immediate independent и D+3…D+7 outcomes.
- Проверяются interaction profiles, режимные веса и support fading.
- Сравниваются recognition, production, listening и speaking отдельно.
- Любое числовое правило сохраняется, меняется или отклоняется по данным.

### Phase E — authoring waves

- Следующие уроки планируются волнами по 2–4 для curriculum review.
- Learner-facing сессии внутри волны всё равно закрываются последовательно.
- После каждой волны выполняется cross-lesson retention и prerequisite audit.
- Массовый выпуск не начинается, пока предыдущая волна не доказала отсутствие
  системного drift.

### Phase F — full course validation

- 32 lesson finals и cross-lesson review edges полны.
- Нет orphan objectives, скрытых prerequisites или forgotten core targets.
- Все обязательные phone previews доступны владельцу.
- Отдельно подтверждены content access и learning mastery; одно не изменяет
  другое.

---

## 13. Метрики, которые доказывают обучение

Основные learning metrics:

- independent accuracy без critical hint;
- D+3…D+7 delayed retention;
- успешность changed-context transfer;
- разница recognition ↔ recall ↔ production;
- listening и spoken evidence раздельно;
- trapType recurrence после feedback;
- время до самостоятельного ответа;
- support/hint dependence;
- repair success после первой ошибки;
- сохранение результата на untrained prompt/voice/context.

Product metrics используются как guardrails, а не mastery:

- completion;
- exits и rage taps;
- retry count;
- time-on-task;
- audio/mic failure rate;
- accessibility alternate-route use;
- voluntary review return.

Главный KPI курса: доля учеников, которые после задержки выполняют заявленный
`can-do` в новом контексте с меньшей поддержкой. Количество написанных сессий,
тапов, XP или streak не является доказательством качества.

---

## 14. Антипаттерны, дающие HOLD

- один фиксированный порядок семи modes для всего курса;
- случайная ротация ради визуального разнообразия;
- одинаковые counts без связи с SessionKind;
- шесть unrelated constructs в одной сессии;
- новое слово сразу внутри фразы;
- три одинаковых задания для одного target;
- Speed Match как первое знакомство или mastery gate;
- listening без аудио или с раскрытым target;
- recognition вместо speaking evidence;
- один success feedback для всех distractors;
- повтор тренировочного prompt в checkpoint;
- новые слова в voice/recall/checkpoint;
- пакетная генерация learner-facing будущих сессий;
- высокий средний QA score при локальном blocker;
- автоматическое заявление CEFR level по completion.

## Находки и предложения

1. Требование всех семи modes в каждой сессии создаёт риск интерфейсной нагрузки
   для абсолютного новичка. Нормативное решение — one-time zero-stakes coach
   layer, а не удаление режимов или упрощение их native механики.
2. Четыре word-first контакта являются admission в phrase practice, но не
   доказательством полного знания слова. Поэтому lexical ledger обязан планировать
   будущие retrieval/production/delayed contacts.
3. Масштабировать нужно curriculum metadata, validators и reusable native UI,
   но не шаблонный ученический текст. Редакторское качество не заменяется
   количеством генераций.
4. Любой универсальный review interval будет научно слабее адаптивной модели;
   начальная cadence остаётся `PRODUCT_HYPOTHESIS` до пилота Phraseman.
