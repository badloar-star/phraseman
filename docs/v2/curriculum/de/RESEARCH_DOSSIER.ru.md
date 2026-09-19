# German Learning V2 — research dossier

**Статус:** `REVIEWED — SOURCE-BACKED — LINGUISTIC PASS 2026-09-19`  
**Дата среза:** 2026-09-19  
**Цель:** доказательная основа собственного немецкого grammar-first blueprint
`PRE_A1 → functional B1`. Этот документ не является blueprint, owner approval
или разрешением писать learner-facing сессии.

Канонический реестр доказательств:
[`SOURCE_EVIDENCE_LEDGER.md`](./SOURCE_EVIDENCE_LEDGER.md). Каждая ссылка вида
`DE-*` ниже указывает на отдельный typed claim в
`modules/learning-v2/curriculum/de/research_authority_de_v1.ts`.

## 1. Зафиксированная граница курса

- Production baseline: современный надрегиональный Standarddeutsch с нормой
  Германии. Это owner-selected course boundary, совместимая с
  bundesdeutsche Standardvariante конкретной Goethe A2 Wortliste;
  Wortliste не предписывает baseline всего курса
  (`DE-RSCH-GOETHE-003`).
- Старт: настоящий PRE_A1 / zero beginner. Сначала формульные chunks,
  sound→meaning и сильная контекстная опора; раннее требование свободной
  генерации запрещено (`DE-RSCH-CEFR-003`).
- Выход: functional B1, а не обещание экзаменационной сертификации. Доказательство
  выхода должно включать reception, production, interaction и mediation,
  связный перенос в новую знакомую ситуацию, neutral register и repair
  (`DE-RSCH-CEFR-002`, `005`, `008`, `009`).
- Goethe B1 Modellsatz — внешняя выборка уровня и task types, не план курса
  (`DE-RSCH-GOETHE-005`, `006`).
- Английский порядок грамматики, слова, examples и scenes не переводятся.
  Немецкая progression выводится из собственной topology и prerequisites.

## 2. Несущая модель: topology до таблиц

### 2.1 Satzklammer и поля

Общий каркас курса — `Vorfeld | linke Satzklammer | Mittelfeld | rechte
Satzklammer | Nachfeld` (`DE-GRM-SYNTAX-001`). Термины не обязаны появляться в
первом learner-facing объяснении, но exact packets и gates используют одну
структурную модель. Это позволяет связать finite verb, модальные конструкции,
Perfekt, отделяемые глаголы, subordinate clauses и Passiv вместо серии
несвязанных «исключений». В V1/V2 finite form занимает левую
скобку; в введённой Verbletzt-clause слева стоит introducer, а справа
находится весь Verbalkomplex, включая finite verb.

### 2.2 Три ранние топологии

Blueprint разводит три операции, не смешивая их в ложное «в вопросе глагол
первый» (`DE-GRM-SYNTAX-002`):

1. statement V2;
2. yes/no Verberst (V1);
3. W-question: W-element в Vorfeld + finite verb в позиции V2.

Verbletzt с вводящим элементом появляется только после устойчивого V2 и
verbal bracket. Первой productive norm служит conjunction + Mittelfeld + finite
verb в правой скобке; непрототипические V1/V2 subordinate patterns позже и
рецептивно (`DE-GRM-SYNTAX-003`).

### 2.3 Отделяемые глаголы

Отделяемая часть глагола — не список приставок для зубрёжки, а видимое
заполнение правой Satzklammer (`DE-GRM-SYNTAX-004`). Каждый новый separable
verb вводится как lexical sense, но grammar operation проверяет положение обеих
частей в новом контексте.

## 3. Kasus и Nominalgruppe

### 3.1 Порядок падежей

IDS подтверждает четыре падежа и управление со стороны глагола/предлога
(`DE-GRM-CASE-001`), но не назначает CEFR-уровни. Для blueprint применяется
порядок по communicative payoff и prerequisite safety:

1. Nominativ как субъект и базовая именная группа;
2. Akkusativ в частотных transitive frames;
3. Dativ в частотных recipient/location frames и затем в двухобъектных моделях;
4. Genitiv сначала рецептивно и в реально частотных функциях, затем ограниченно
   продуктивно ближе к B1.

Нельзя учить падеж как окончание без управляющей конструкции и ситуации.

### 3.2 Artikel, Genus и прилагательное

Существительное хранится как lexical entry вместе с базовым Artikel/Genus и
Plural; голая форма не считается полноценной карточкой. IDS показывает, что
Artikel, adjective и noun образуют согласованную Nominalgruppe, а артикль часто
несёт видимую флексию (`DE-GRM-NP-001`). Поэтому:

- сначала learner различает и извлекает article+noun chunks;
- затем форма артикля несёт знакомую case/number/gender information;
- attributive adjective morphology вводится после соответствующей article/case
  frame, а не полной таблицей strong/weak/mixed сразу;
- Genus и Plural не выводятся из выдуманного «правила по звучанию»: допускаются
  только подтверждённые продуктивные закономерности, иначе форма учится как
  часть lexical entry.

## 4. Verbalsystem

### 4.1 Настоящее и finite agreement

Начало курса строит productive present forms только в уже объяснённой topology.
Лицо/число и finite position — разные tested dimensions и получают разные
sessions. Новая форма не прячется внутри lexical/voice practice.

### 4.2 Modal, Perfekt, Präteritum и reference-to-future

Порядок должен сохранять Satzklammer и communicative payoff:

- Modalverb сначала как finite operator + знакомый infinitive в правой скобке;
- Perfekt после освоения finite `haben/sein`, Partizip II как цельного слова и
  verbal bracket;
- Präteritum сначала для высокочастотных `sein`, `haben` и Modalverben в тех
  регистрах, где оно реально нужно, а не как массовая таблица всех глаголов;
- future reference сначала через Präsens + temporal expression; `werden +
  Infinitiv` вводится как отдельная meaning/form operation и не объявляется
  обязательным способом говорить о будущем.

Evidence binding: `DE-GRM-MODAL-001`, `002`, `DE-GRM-PERFEKT-001`,
`DE-GRM-PAST-001`, `DE-GRM-MODALPERF-001`, `DE-GRM-FUTURE-001`,
`DE-GRM-FUTURE-002`. Эти источники
не назначают CEFR-точку; точное место определяется prerequisite DAG и can-do.

## 5. Negation и Präpositionen

### 5.1 `nicht`, `kein`, `nein`, `doch`

Немецкое отрицание нельзя свести к переводу русского/украинского «не».
Сначала разводятся `nicht` и склоняемый `kein-`; затем position/focus `nicht`,
response particle `doch` и contrast constructions (`DE-GRM-NEG-001`). Каждая
операция получает собственные диагностические ловушки.

### 5.2 Präposition + Kasus + meaning

Каждая Präposition вводится вместе с governed Kasus и одной конкретной
пространственной, временной или иной relation (`DE-GRM-ADP-001`).
Wechselpräpositionen не подаются двойным списком: contrast строится на значении
и ситуации после знакомства с обеими case frames.

## 6. Pronomen, Reflexiv, Relativ, Passiv

- Personalpronomen учатся через introduction→reference chains и знакомую
  valency; Akkusativ/Dativ forms не появляются до соответствующего case frame
  (`DE-GRM-PRON-001`).
- Reflexiv разделяется на obligatorily lexical reflexive verbs, ordinary
  reflexive relation и reciprocal meaning. Ученик не получает ложной таблицы,
  будто каждое лицо имеет отдельную reflexive form: неформальные
  1/2-е лица совпадают с personal forms, а formal `Sie` и 3-е лицо
  используют `sich` (`DE-GRM-REFL-001`).
- Relativ clause требует известных Genus/Kasus и Verbletzt. Agreement с
  antecedent и clause-internal case — две разные tested dimensions
  (`DE-GRM-REL-001`).
- Passiv идёт после Partizip II и verbal bracket: сначала contrast
  Vorgangspassiv `werden` / Zustandspassiv `sein`, recipient passive позже и с
  register caveat (`DE-GRM-PASS-001`).

## 7. Lexical-sense strategy

Goethe Wortlisten дают внешние receptive references около 650 / 1300 / 2400
единиц для A1/A2/B1, но прямо не являются учебным порядком
(`DE-RSCH-GOETHE-002`–`004`). Поэтому German lexical registry:

- считает sense, а не только spelling;
- разделяет `productive`, `receptive` и `regional_receptive`;
- использует DeReWo/DeReKo только как frequency prior, учитывая письменный
  состав корпуса (`DE-LEX-FREQ-001`);
- проверяет register, современность, can-do utility и совместимость с текущей
  grammar operation;
- требует 1–5 новых полезных senses и новую ситуацию в каждой нумерованной
  сессии, включая checkpoint/voice/recall;
- не позволяет старым словам стать большинством primary targets или всем
  independent probe.

## 8. Pronunciation / произношение для RU- и UK-speaking learners

Нормативная цель — intelligibility, word/phrase stress и полезная prosody, а
не «убрать акцент» (`DE-RSCH-CEFR-007`). Будущий pronunciation registry обязан
разделять:

- phoneme contrasts, которых нет или которые иначе реализуются в русском и
  украинском;
- vowel length/quality и редукцию;
- German word stress, compound stress и sentence focus;
- final devoicing/voicing transfer, aspiration и consonant clusters;
- spelling-to-sound traps;
- perception и production как разные evidence points.

Конкретный список contrasts не утверждается интуицией. Он входит в blueprint
только через отдельные evidence statuses:

- `DIRECT_L2_RU`: vowel length/quality, `ö/ü`, aspiration и польза varied voices
  (`DE-PHON-RU-001`–`004`);
- `DIRECT_L2_UK`: индивидуальная вариативность word stress/focus
  (`DE-PHON-UK-001`);
- `CONTRASTIVE_RISK`, но не заранее поставленный диагноз: length/quality,
  `ö/ü`, aspiration, final devoicing и palatalisation transfer
  (`DE-PHON-UK-002`, `003`, `004`). `DE-PHON-UK-003` фиксирует
  немецкую final-devoicing систему; `DE-PHON-UK-004` отдельно задаёт
  Ukrainian baseline, поэтому перенос palatalisation/final obstruents —
  только диагностическая гипотеза.

Perception и production измеряются отдельно; UK не копирует русский remedial
route, а feedback зависит от фактического ответа ученика.

## 9. Register и DACH boundary

- Production: нейтральный Standarddeutsch Германии.
- `du/Sie` — сквозная sociolinguistic trajectory, а не одно правило формы;
  scenario явно задаёт relation и register (`DE-RSCH-CEFR-008`,
  `DE-REG-DUSIE-001`, `002`).
- Австрийские и швейцарские стандартные варианты допускаются только как
  `regional_receptive`, всегда маркируются `AT`/`CH` и никогда не смешиваются с
  немаркированным production target.
- Диалекты не входят в production targets этого курса.
- Pluricentric status не позволяет называть подтверждённый AT/CH standard
  «ошибкой» или «диалектом» (`DE-REG-VARIETY-001`, `DE-REG-BASELINE-001`).
- Орфография и пунктуация следуют Amtliches Regelwerk 2024; равноправные
  кодифицированные варианты не объявляются ошибкой (`DE-ORTH-AUTH-001`).

Точный minimum set AT/CH variants остаётся owner decision до blueprint freeze.

## 10. Functional B1 exit evidence

Курс заканчивается не утверждением «вся грамматика пройдена», а пакетом
независимых доказательств:

1. понять main points ясной Standard German речи и текста на знакомую тему;
2. справиться с большинством типичных travel/everyday situations;
3. построить связное устное и письменное высказывание;
4. рассказать об опыте, целях и плане и кратко объяснить причину;
5. вступить в знакомый разговор без заранее выученной exact phrase;
6. совместно спланировать простую задачу и передать ясную информацию другому;
7. выбрать уместный neutral register и сохранить понятность при допустимых
   ошибках (`DE-RSCH-CEFR-004`–`009`).

Goethe B1 model используется как внешняя cross-check выборка четырёх
модальностей, но курс не обещает сертификат и не копирует экзаменационные
задания (`DE-RSCH-GOETHE-005`).

## 11. Что evidence не разрешает утверждать

- CEFR не задаёт 32 урока, 1 792 packets или порядок немецких тем.
- IDS grammis не назначает CEFR-уровень конструкции и не утверждает нашу
  session density.
- Wortlisten не дают точный active vocabulary и не разрешают считать spelling
  новым sense.
- Corpus frequency не равна разговорной полезности.
- Ни один прочитанный источник не разрешает автоматически считать learner
  экзаменационно готовым после прохождения приложения.

## 12. Admission result

Research authority может стать `PASS` только после:

- машинного gate на typed ledger ↔ Markdown;
- свежего независимого German-linguistic review по каждому claim;
- фиксации только действительно нерешённых owner decisions.

До этого статус — `HOLD FOR BLUEPRINT FREEZE`; learner-facing authoring остаётся
отдельным более сильным `HOLD` до полного 32×56 blueprint и owner approval его
exact fingerprint.

## Находки и предложения

- Сильнейший немецкий curriculum spine — не список времён и падежей, а единая
  Satzklammer/topology, к которой постепенно подключаются valency и NP marking.
- Goethe counts полезны как внешний coverage alarm, но не как цель плотности.
- B1 gate должен принимать понятную речь с ошибками и одновременно требовать
  connected transfer, interaction и mediation; эти две стороны нельзя
  подменять друг другом.
