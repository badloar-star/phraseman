# Learning V2 English — Research Dossier

**Статус:** `REBUILD V2 / OWNER-APPROVED SCOPE`, prerequisite для полного English blueprint.
**Target language:** English.  
**Interface locales:** `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`.  
**Evidence ledger:** [`SOURCE_EVIDENCE_LEDGER.md`](./SOURCE_EVIDENCE_LEDGER.md).  
**Запрет:** этот dossier не разрешает authoring сам по себе; нужны полный
blueprint, gates, owner map и owner-approved fingerprint.

---

## 1. Честная граница курса

Курс начинает с нулевой опоры (`A0/PRE_A1`) и последовательно закрывает
грамматические системы до границы **функционального B1**. Каждый из 32 уроков
вводит новый крупный грамматический контур; контрольными бывают только сессии
внутри урока, но не урок целиком. Курс не обещает CEFR-сертификат и не
гарантирует достижение B1 каждому ученику: итог зависит от прохождения,
удержания и переноса навыка. `[EV-CEFR-01, EV-CEFR-02,
EV-CAM-B1-GRAMMAR-01, OC-FULL-B1-SCOPE-01]`

Нормативный результат — не «знать список правил», а применять изученные системы
в наблюдаемых действиях уровня до B1: описывать настоящее, прошлое и планы;
уточнять информацию; выражать условия, обязанность и вероятность; связывать
мысли; передавать сообщение; объяснять опыт и причину решения.
`[EV-CEFR-01, EV-CEFR-02, EV-CAM-B1-GRAMMAR-01,
OC-FULL-B1-SCOPE-01]`

Около 209 запланированных часов — ёмкость продукта, а не доказательство уровня.
Продолжительность используется только для sanity-check и требует реального
измерения удержания и переноса. `[EV-CAM-01, OC-TOPOLOGY-01]`

---

## 2. Target learner

- взрослый или подросток без надёжной английской базы;
- интерфейс на одной из восьми локалей;
- короткие ежедневные занятия и возможные перерывы;
- нужен понятный разговорный результат, но письмо/чтение и точность формы также
  поддерживают речь;
- нельзя предполагать знание лингвистических терминов;
- нельзя использовать ещё не введённое английское слово для объяснения нового.

Объяснения называют действие простыми словами: «поставь `am` после `I`», а не
проверяют знание термина «форма первого лица единственного числа».

---

## 3. Единица планирования

### 3.1 Grammar operation

Минимальная операция, которую ученик может выполнить и проверить в английской
форме. Например, не вся тема «to be», а одна операция: соединить `I` с `am` в
утвердительной фразе о себе.

Каждая operation имеет:

- стабильный ID;
- communicative function;
- meaning boundary;
- form boundary;
- prerequisites;
- близкие контрасты;
- prohibited extensions;
- introduction packet;
- practice и retrieval stages;
- independent probe.

Новая operation получает полную session. Review session не маскирует новую
грамматику. `[OC-AUTHORING-01, PH-GRAMMAR-01]`

### 3.2 Lexical sense

Единица лексики — конкретное значение слова/выражения, а не строка spelling.
`light` «свет» и `light` «лёгкий» — разные sense IDs. Новое значение получает
одно first-introduction место и затем возвращается как retrieval, но не снова
как «новое слово». `[EV-EP-01, EV-EP-02]`

### 3.3 Can-do step

Каждая session развивает один наблюдаемый шаг внутри lesson outcome. Он должен
быть проверяемым действием, а не названием темы: «сказать, где я нахожусь» лучше
чем «изучить наречия места». `[EV-CEFR-01]`

---

## 4. English structural inventory внутри границы курса

Это исследовательский inventory, а не окончательный порядок. Точное размещение
фиксируется только в 32 lesson blueprints и 1 792 packets.

### 4.1 Базовая клаузальная рамка

- английский порядок `subject → verb/link → complement`;
- `I am`, `you are`, затем остальные личные субъекты отдельными operations;
- утвердительная, отрицательная и вопросительная форма вводятся раздельно;
- короткие ответы и сокращения не считаются автоматически известными;
- императив и `let's` как отдельные действия;
- `there is/are` как отдельная existential frame.

### 4.2 Указание и именная группа

- `this/that/these/those` по числу и дистанции;
- `a/an`, zero/plural и определённость `the` только в пределах нужных функций;
- singular/plural noun, регулярное множественное и ограниченные частотные
  irregular plurals;
- subject/object pronouns;
- possessive determiners и possessive `'s` отдельными operations;
- count/non-count distinction там, где оно нужно shopping/food;
- `some/any`, `much/many`, количества и контейнеры;
- adjective position и базовый порядок без преждевременной полной системы.

### 4.3 Present-time действия

- Present Simple statements для routines/preferences;
- third-person `-s` только после появления `he/she/it`;
- `do/does` questions и negatives отдельными operations;
- adverbs/frequency expressions и их позиция;
- Present Continuous для происходящего сейчас;
- contrast Simple vs Continuous после отдельного освоения обеих форм.

### 4.4 Past-time действия

- `was/were` до сложных past constructions;
- Past Simple regular/selected irregular forms;
- `did` questions/negatives отдельно от affirmative past;
- time anchors (`yesterday`, `last…`, `ago`) как лексико-грамматические рамки;
- Past Continuous только после Past Simple и continuous frame;
- `when/while` contrast после обеих past frames.

### 4.5 Future, plans and conditions

- `be going to` для планов/намерений;
- Present Continuous arrangements только после present continuous;
- `will` для ограниченных функций, не как универсальный «future tense»;
- `if + present, will/can/imperative` как отдельные conditional operations;
- future time clauses не используют необъяснённый future marker внутри `if`.

### 4.6 Ability, request, rules and permission

- `can/can't` ability;
- `Can you…?` request;
- permission patterns;
- `must/mustn't`, `have to/don't have to`, `should/shouldn't` вводятся как
  разные meanings, а не как взаимозаменяемые переводы;
- polite request softeners только после базовой request frame.

### 4.7 Description and comparison

- adjective predicates after `be`;
- comparative forms и `than`;
- `more` vs `-er` как ограниченная система;
- superlative только после comparative prerequisites;
- базовые `too` / `enough` как отдельные meaning operations, если остаются в
  owner-approved scope.

### 4.8 Experience and completion

- Present Perfect experience (`Have you ever…?`) только после have/participles
  prerequisites;
- `ever/never`, `already/yet` не объединяются в одну неразличимую тему;
- contrast life experience vs finished past получает отдельную review/contrast
  session;
- производственные формы participles ограничиваются нужным частотным набором.

### 4.9 Reference, connection and reported meaning

- basic connectors `and/but/because/so` по одной communicative operation;
- wh-questions отдельными semantic families;
- относительные `who/that/where` после уверенной clause рамки;
- базовая reported meaning/message frame только в ограниченном сценарном
  объёме урока 30, без скрытого переноса полной reported-speech системы;
- discourse repair: просьба повторить, уточнение, перефразирование, поддержание
  разговора — полноценные can-do, а не filler.

### 4.10 Ограничения

В основной обязательный план входят ограниченные B1-контуры Passive Voice,
Zero/First/Second Conditional, defining relative clauses и Reported Speech.
Они получают собственные уроки и не могут быть скрыты внутри лексической темы.

Без отдельного owner decision за границей остаются:

- Third и Mixed Conditionals;
- полный reported-speech backshift со всеми исключениями;
- reporting passive, reduced relatives и сложные non-finite clauses;
- академическая письменная грамматика;
- редкие tense/aspect комбинации и perfect modal deduction;
- исчерпывающая система артиклей, determiner-ов и фразовых глаголов.

Если сценарий будто требует исключённую конструкцию, меняется формулировка
сценария либо владелец явно расширяет scope; скрытое введение запрещено.

---

## 5. Prerequisite principles

### 5.1 Жёсткие зависимости

- subject form before subject–verb agreement contrast;
- affirmative frame before its negative/question transformation;
- base verb recognition before `do/does/did` support;
- singular noun before plural/count contrasts;
- lexical verb meaning before tense/aspect manipulation;
- present continuous form before simple/continuous contrast;
- Past Simple and continuous prerequisites before `when/while` contrast;
- `have` and selected participles before Present Perfect;
- two simple clauses before connectors/relative/reporting operations;
- familiar grammar and lexicon inside scored independent voice/checkpoint
  transfer probes; a session may separately ground useful new words without
  making first exposure part of the mastery decision.

### 5.2 Запрещённые ложные зависимости

- русский или другая interface-locale грамматический термин;
- знание перевода дистрактора, если его смысл ещё не введён;
- догадка по картинке вместо знания target form;
- незнакомая будущая конструкция внутри инструкции, примера или feedback;
- spelling-letter puzzle как подмена grammar/meaning practice.

### 5.3 DAG rule

Каждая edge объясняет, какая конкретная earlier operation нужна и зачем.
«Полезно знать прошлые уроки» не является валидной edge. Future refs, cycles и
hidden prerequisites дают `HOLD`.

---

## 6. Lexical research policy

### 6.1 Selection

Лексика выбирается по пересечению:

- необходимости для 32 scenario can-do;
- частотности/полезности в заявленном уровне;
- продуктивности в нескольких знакомых frames;
- возможности дать точное beginner-safe значение;
- отсутствия зависимости от ещё не введённой грамматики.

Случайные «интересные слова» не добавляются ради количества. Обычная
teaching/application session по умолчанию сочетает полезные новые lexical
senses с повторением уже знакомых, а не бесконечно перекладывает
`ready/happy/sad`. Но механической квоты «новое слово в каждой сессии» нет:
checkpoint, voice, delayed retrieval, targeted repair или сложный transfer
могут быть `retrieval-only`, если packet называет причину и точные повторяемые
sense IDs. Новая лексика должна регулярно продвигаться по каждой главе, а
важные слова — возвращаться в последующих sessions и lessons для закрепления.

### 6.2 First introduction

- одно sense ID — одна blocking word-first карточка;
- слово показывается отдельно до первого обязательного phrase use;
- карточка имеет ручную точную дефиницию во всех восьми локалях;
- описание не использует будущую английскую лексику;
- повторная session retrieves, но не показывает карточку как новую.

### 6.3 Retrieval stages

Для core sense планируются:

1. meaning recognition;
2. form retrieval;
3. controlled phrase use;
4. spoken or constructed production;
5. later-session retrieval;
6. later-lesson retrieval;
7. delayed checkpoint probe.

Интервалы — продуктовая гипотеза, подлежащая telemetry calibration.
`[EV-DIST-01, EV-RET-01, PH-SPACING-01]`

### 6.4 Полезность review

Повторение засчитывается только при измеримом learning delta:

- меньше подсказок;
- извлечение после задержки;
- другой реалистичный контекст;
- различение близких уже изученных форм;
- переход от recognition к controlled/spoken production;
- адресный repair ранее зарегистрированной ошибки;
- перенос в новый can-do step.

Идентичный prompt с теми же вариантами не является новой практикой. Новые слова
сами по себе тоже не делают отработку полезной: они должны служить can-do, а
grammar/review focus сохраняется.

---

## 7. Intro, practice and feedback research rules

### 7.1 Intro

Три экрана `concept → formula → trap` объясняют одну и ту же English operation.
Каждая embedded check проверяет английскую форму/значение операции, а не русский
язык и не общую эрудицию. Текст короткий, живой и следует отдельной Библии.

### 7.2 Practice

Сначала возможна узкая guided/blocked работа, затем смешение с близкими уже
известными alternatives и перенос. Немедленное максимальное interleaving для
нулевого новичка не считается автоматически лучшим. `[EV-INT-01]`

### 7.3 Distractors and corrective feedback

Дистрактор обязан быть:

- один атомарный вариант;
- правдоподобная ошибка именно текущей operation;
- грамматически/семантически неверным только по одной диагностируемой причине;
- уникальным среди вариантов;
- никогда вторым правильным ответом;
- снабжён собственным locale-native объяснением при single choice.

Feedback называет выбранную уловку и показывает точный repair. Общий fallback
не заменяет ручной разбор. `[EV-FB-01, OC-AUTHORING-01]`

---

## 8. Cross-locale transfer research

Ниже не готовые универсальные объяснения, а обязательные направления анализа.
Каждую конкретную формулировку подтверждает locale-native reviewer.

- `ru/uk/pl`: возможны zero-copula transfer, свободнее word order, aspect и
  case-based relations; нельзя объяснять английский дословным калькированием.
- `es/pt-BR`: pro-drop, richer agreement, adjective placement, copular and
  tense contrasts; нельзя считать одинаково выглядящие cognates безопасными.
- `vi/id`: limited inflection and different tense/aspect marking; английские
  agreement/articles нельзя объяснять как очевидные equivalents.
- `tr`: agglutination, case/postpositions, SOV tendencies and evidential/tense
  organization; English fixed SVO and auxiliary behavior need explicit care.

Gate требует отдельного анализа каждой locale, но не разрешает стереотипный
шаблон «в вашем языке этого нет». Объяснение должно быть locale-native и
проверять английский construct.

---

## 9. Pronunciation and voice boundary

- pronunciation focus служит intelligibility и discrimination текущего слова
  или frame;
- незнакомые comparison words не вводятся внутри pronunciation guidance;
- production probe следует после понятного аудио-образца;
- voice session не является местом first introduction грамматики или лексики;
- ASR/recording failure не должен превращаться в ложную языковую ошибку;
- точные фонетические claims и locale-specific ловушки требуют отдельного
  speech review.

---

## 10. Curriculum consequences

### 10.1 Phrase planning versus learner-facing authoring

Каждый из 1 792 packets до authoring содержит разрешённые phrase frames,
lexical slot sense IDs, forbidden surface forms и 2–4 естественные canonical
English examples. Это позволяет проверить grammar order, usefulness и leakage
заранее.

Canonical examples не являются финальным exercise bank. Полные prompts,
practice variants, distractors, response-specific feedback, определения,
audio scripts и восемь locale-native версий пишутся только последовательно для
одной exact session. Массовая генерация этих текстов на curriculum-stage
запрещена: она скрывает повторы и будущую грамматику за большим объёмом.

### 10.2 Required course artifacts

Полный English blueprint обязан материализовать:

- 32 hard lesson boundaries;
- 224 chapter outcomes;
- 1 792 exact session packets;
- grammar operation registry;
- lexical sense ledger;
- prerequisite DAG;
- retrieval graph;
- can-do coverage matrix;
- source evidence refs и owner-approved fingerprint.

Существующая локальная карта первого урока — входной материал для аудита, а не
authority всего курса. Повтор одной и той же конструкции или слова как «нового»
в разных sessions является ошибкой blueprint, а не допустимой вариативностью.

---

## 11. Uncertainty ledger

До финального PASS требуют отдельного решения:

1. точное число новых lexical senses по обычному session role;
2. spacing intervals для разных типов grammar/lexicon;
3. точная глубина отдельных A2+/B1 extensions внутри уже утверждённых границ;
4. какие irregular forms являются core productive, а какие recognition-only;
5. pronunciation inventory и порядок sound contrasts;
6. допустимый объём bounded backshift в уроке 30;
7. место и глубина `too/enough`, superlatives и Present Perfect contrasts;
8. locale-native transfer review для всех восьми интерфейсных языков.

Каждый пункт до owner decision остаётся явно помеченной гипотезой и не может
быть молча превращён в learner-facing контент.

---

## 12. Research PASS criteria

Research dossier получает PASS только когда:

- все inventory items имеют source/owner refs;
- scope и exclusions не конфликтуют с 32 lesson outcomes;
- prerequisite graph материализован и ацикличен;
- каждая locale получила отдельный transfer review receipt;
- lexical selection policy проверена на реальном 32-lesson ledger;
- product hypotheses явно отделены от evidence;
- independent linguistic review не нашёл hidden prerequisites;
- владелец утвердил dossier fingerprint.

Текущий статус: `SCOPE PASS / HOLD FOR OPERATION REGISTRY, DAG AND 1,792 PACKETS`.
