# Полный аудит промптов Phraseman — 2026-06-21

> Метод: 14 промптов/текстов × 6 осей (простота, библия, юмор, маркетинг, точность, не-читает-мысли), каждая находка прошла adversarial-перепроверку вторым агентом. 25 агентов, ~2M токенов.

Я подготовлю единый отчёт на основе только подтверждённых (confirmed) и частично подтверждённых (partial) находок. Давайте сразу к делу.

# Отчёт-план редактуры промптов Phraseman

## 1. Сводная таблица баллов

Шкала каждой оси 0-10; общий балл (overall) — из аудита. Прочерк означает «ось неприменима / не оценивалась как проблемная».

```
ПРОМПТ (файл)                         | Прост | Библ | Юмор | Маркет | Точн | НеЧитМысл | ОБЩ
--------------------------------------+-------+------+------+--------+------+-----------+----
mistake_full (разбор ошибки)          |   8   |  7   |  9   |   8    |  7   |    10     | 82
mistake_eli5 (объяснить просто)       |   9   |  8   |  9   |   8    |  8   |    10     | 87
explain_phrase (объяснить фразу)      |   8   |  7   |  8   |   7    |  7   |     9     | 79
choice_explain (разбор варианта)      |   8   |  6   |  8   |   7    |  7   |    10     | 78
stats_insights (заметки статистики)   |   8   |  6   |  9   |   6    |  9   |    10     | 74
weekly_review (недельный разбор)      |   8   |  6   |  9   |   6    |  9   |     7     | 68
compass (комментарий дня)             |   8   |  9   |  6   |   9    |  8   |    10     | 86
premium_dialog (AI-диалог)            |   9   |  8   |  8   |   7    |  7   |     9     | 85
dialog_personas (персоны сценариев)   |   8   |  8   |  9   |   7    |  8   |    10     | 86
dialog_greeting (приветствие)         |   —   |  —   |  —   |   —    |  —   |     —     |  —
--------------------------------------+-------+------+------+--------+------+-----------+----
СРЕДНЕЕ ПО ПРОЕКТУ                     |  8.2  | 7.2  | 8.2  |  7.1   | 7.6  |   9.4     | 80.6
```

Худшие промпты по общему баллу: **weekly_review (68)**, **stats_insights (74)**, **choice_explain (78)**, **explain_phrase (79)**. Слабейшая ось проекта в целом — **bible (7.2)** и **marketing (7.1)**.

---

## 2. КРИТИЧНЫЕ проблемы (бьют по юзеру/деньгам)

Беру только confirmed и сильную часть partial.

### КРИТ-A. Слово «ошибка/неправильно» утекает в видимый текст (нарушение словаря Библии)
Прямой удар по тёплому тону для аудитории 50+: вместо «почти/попытка» юзер читает «ты ошибся / это неправильно».

- **choice_explain** (confirmed). Рамка «WRONG» зашита в инструкцию:
  - стр.40: `The WRONG options (distractors) are:`
  - стр.43: `explaining WHY it does not fit here (... why it's wrong in this spot)`
  - Промпт нигде не велит не выводить слово учащемуся → высокий риск «Run неправильно здесь, потому что…».
- **weekly_review** (confirmed). Экран внутренне зовётся «mistake review», смягчения нет:
  - стр.273: `You are writing the learner's mistake review`
  - стр.283: `never shame mistakes` (само слово mistake свободно в обороте)
  - нет ни одной строки словаря замен (ошибка→почти, урок→сессия, статистика→результаты).
- **mistake_full** (confirmed как пробел): нет инструкции смягчать слово «ошибка» в выводе для type A/B; мягкость держится только на образце ветки C, не гарантирована.

### КРИТ-B. Домысливание ПРИЧИНЫ ошибки («читает мысли») в недельном разборе
Обвиняющая галлюцинация мотива — прямо то, что Библия и ранее поправленные промпты запрещают.

- **weekly_review** (confirmed). Существующий запрет узкий — только про эффорт-статы:
  - стр.280: `Do NOT draw causal links between effort stats (streak, time, XP) and language knowledge`
  - нет строки `NEVER speculate WHY the learner made a mistake`, а стр.288 просит свободным текстом описать `where the weak spots are` → открыта дверь для «ты путаешь времена / переводишь дословно».

> Контраст: mistake_full, mistake_eli5, choice_explain, premium_dialog, compass, dialog_personas — здесь этот запрет сделан образцово (см. раздел 5). weekly_review — единственный пробел.

### КРИТ-C. Loss-framing и фальш-срочность по стрику (бьёт по удержанию/деньгам)
Для новичка давление «не потеряй серию / успей сегодня» отталкивает, а Библия разрешает loss-framing только при стрике 7+.

- **stats_insights** (confirmed). Блок «year» даёт модели стрик и % к цели без ограничителя:
  - стр.331: `currentStreak / longestStreak, bestMonth, goalPct% toward the yearly goal`
  - нет правил gain-framing и «loss-framing только при стрике ≥7», нет запрета фальш-срочности → риск «Серия 4 дня — не дай ей оборваться сегодня!».
- **weekly_review** (confirmed, мягче). Эффорт-давление погашено (стр.280), но прямого запрета loss-framing в свободных абзацах нет.

### КРИТ-D. Галлюцинация значений/прогресса (точность → доверие)
- **choice_explain** (confirmed). Модель обязана объяснить значение каждого неверного варианта, но значения ей не передаются:
  - сигнатура: `buildChoicePrompt(correctEn, phraseMeaning, distractors, lang)` — приходят только строки дистракторов
  - стр.43 требует `what it actually means`, а страховки «не уверен — не выдумывай» нет → ложные определения на многозначных словах (классика: «make значит создавать руками»).
- **premium_dialog** (confirmed). Анти-галлюцинация прогресса только текстовая:
  - стр.290: `Use only the memory and data provided; if data is missing, say that briefly`
  - при пустом memory `buildMemoryBlock` (стр.314) вообще не вставляет блок, а companion разрешает обсуждать прогресс → на настойчивый «как мои успехи?» возможны выдуманные цифры.

### КРИТ-E. Точность it/that в полном разборе (асимметрия с ELI5)
- **mistake_full** (confirmed). Worked example путает ось данности с осью дистанции:
  - стр.291: `"that" points at something singled off or further off`
  - ELI5-версия это явно запрещает (стр.363: `Do NOT say "that" means "far away" here`), а в full аналогичного guard нет → риск неточности.

### КРИТ-F. Когнитивная перегрузка (длина предложений) для 50+
Не «деньги», но прямой удар по читаемости целевой аудитории.

- **mistake_full** (confirmed). Нет лимита длины предложения; worked example содержит предложение ~28 слов (стр.290-293), модель его имитирует.
- **choice_explain** (confirmed). Лимит `max ~18 words` (стр.21, 43) — почти вдвое выше библейского ≤10.
- **stats_insights**, **weekly_review** (confirmed как пробел): только «1-2 short sentences», без потолка слов; у stats MAX_NOTE_CHARS=400 (стр.58) великоват.

---

## 3. Сквозные паттерны (повторяются во многих промптах)

1. **Словарь замен Библии не передан модели** — самый массовый пробел. Встречается в: choice_explain, stats_insights, weekly_review, explain_phrase, compass (там, наоборот, сделано хорошо — эталон). Симптом: слова «ошибка», «статистика», «урок», «слово» (вместо «фраза») утекают в вывод.

2. **Нет потолка длины предложения (≤10 слов)** — почти везде, где есть свободный текст: mistake_full, choice_explain, stats_insights, weekly_review, compass, explain_phrase. Везде есть лимит числа предложений, но не слов в предложении.

3. **Нет явного запрета слов-паразитов** («просто/также/кстати/в принципе/на самом деле») — stats_insights, weekly_review, compass, explain_phrase. В explain_phrase усугублено тем, что англ. «simply» зашито прямо в инструкцию (стр.114, 117) и протекает в русское «просто».

4. **Gain-framing не зафиксирован как правило** — stats_insights, weekly_review (и частично compass, где, наоборот, сделано отлично — эталон). Симптом: открытая дверь для loss-framing по стрику.

5. **«ТЫ» — НЕ паттерн-проблема, а наоборот сильная сторона.** Во всех промптах, где применимо, «ты» с запретом «вы/Sie/vous» закреплено явно и образцово (mistake_full стр.276/325, mistake_eli5 стр.399/443, explain_phrase стр.97, choice_explain стр.36, stats_insights стр.324, weekly_review стр.282, compass стр.32). Единственная незакрытая RU-поверхность — premium_dialog companion (стр.292 разрешает ответ по-русски без указания «ты»).

6. **Анти-галлюцинация держится только на тексте промпта, без структурной страховки** — choice_explain (значения не переданы), premium_dialog (пустой memory). Где есть серверный guard (weekly_review parseAndGuardResult, stats_insights guardLearnerFacingNote) — точность высокая.

---

## 4. Приоритизированный список правок

### P0 — критично (тон/деньги/доверие), делать первыми

**P0-1. weekly_review: добавить словарь замен + запрет домысливать причину ошибки.**
Файл `functions/src/weekly_review.ts`, блок ABSOLUTE RULES.
- Добавить: `In the output language, NEVER use the word for "mistake/error/wrong". Frame slips as "почти"/"a near-miss". Use "session/challenge" not "lesson", "your results" not "statistics", "phrase" not "word" where natural.`
- Добавить: `NEVER speculate WHY the learner slipped — do NOT say they confused X, translated literally, rushed, or did not think. You only see counts, not reasons. State which category and which example phrases, plus the path forward — nothing about motive.`
- Эффект: убирает обвиняющий тон и слово «ошибка» в самом массово-читаемом разборе; закрывает КРИТ-A и КРИТ-B.

**P0-2. choice_explain: убрать рамку «wrong» из вывода + страховка от выдумывания значений.**
Файл `functions/src/explain/choice_explain_prompts.ts`.
- Стр.40/43: переписать `WRONG options` → `the OTHER options (these do not fit this meaning)`; добавить `NEVER call the learner's pick "wrong/incorrect/ошибка" in the output`.
- Стр.43: добавить `If you are not certain what an option means, say only that it does not fit here — do NOT invent a definition.` (в идеале расширить сигнатуру, передавая известные значения дистракторов).
- Эффект: закрывает КРИТ-A и КРИТ-D одновременно; снижает ложные определения.

**P0-3. stats_insights: правило gain-framing + ограничение loss-framing стриком ≥7.**
Файл `functions/src/stats_insights.ts`, ABSOLUTE RULES.
- Добавить: `Always frame as what the learner HAS or can gain, never as loss. Loss-framing (e.g. «не потеряй серию») is allowed ONLY in the «year» note AND only when currentStreak >= 7. Never create false urgency («успей сегодня»).`
- Добавить словарь замен: `Never say «статистика» — say «твои результаты». Prefer «фраза» over «слово».`
- Эффект: закрывает КРИТ-C по удержанию; убирает запретное «статистика».

### P1 — важно (точность/читаемость), вторым заходом

**P1-1. mistake_full: добавить guard it/that «не путать с дистанцией» (как в ELI5).**
Файл `functions/src/mistake_explain.ts`, описание type A / worked example.
- Добавить: `For "it"/"that" the axis is givenness (already-in-focus vs set-apart), NOT distance — do not say "that" means "far away"; reserve near/far only for "this"/"that".` И переписать worked example (стр.289-294) без «further off».
- Эффект: закрывает КРИТ-E.

**P1-2. Лимит длины предложения во всех текстовых промптах.**
Файлы: mistake_full, choice_explain, stats_insights, weekly_review.
- choice_explain стр.43: `max ~18 words` → `max ~12 words, ideally under 10; one simple clause`.
- mistake_full FORMAT: `Keep sentences under ~10 words, one idea per sentence` + укоротить worked example.
- stats_insights стр.321 / weekly_review: `each sentence <= 10 words`; stats — снизить MAX_NOTE_CHARS 400→~140.
- Эффект: закрывает КРИТ-F, читаемость для 50+.

**P1-3. premium_dialog: структурно закрыть галлюцинацию прогресса + «ты» для RU-вставок.**
Файл `functions/src/premium_dialog.ts`.
- Рядом со стр.290: `If weakWords/summary are empty, you do NOT know their stats — say you have not tracked enough yet; NEVER invent numbers, streaks, or past lessons.`
- Стр.292: после `answer briefly in Russian` добавить `— always address the learner as «ты», never «вы»; keep it short and jargon-free.`
- Эффект: закрывает КРИТ-D (диалог) и единственную незакрытую RU-поверхность.

**P1-4. mistake_full: смягчить обязанность минимальной пары.**
Файл `functions/src/mistake_explain.ts`, type A (стр.234-237).
- Добавить: `If no honest minimal pair exists for this swap, skip the pair and give the reliable plain rule instead (per TRUTH FLOOR) — never manufacture one.`
- Эффект: снимает напряжение «шаблон vs истина».

### P2 — полировка (паразиты/жаргон/нотка живости)

**P2-1. Запрет слов-паразитов** в stats_insights, weekly_review, compass, explain_phrase: `Never use filler words («просто», «кстати», «также», «в принципе», «на самом деле») or their equivalents.` В explain_phrase дополнительно убрать «simply» из стр.114/117.

**P2-2. Запрет грамматического жаргона** в weekly_review: `No grammar jargon («определённый артикль», «вспомогательный глагол»). Describe weak spots in plain words a 50+ beginner understands instantly.`

**P2-3. Перцентили простыми словами** в stats_insights стр.332: `avoid «percentile», «XP», «daily7»; say e.g. «ты впереди большинства».`

**P2-4. compass: few-shot примеры + лимит ≤10 слов + запрет выдумывать цифры.** Добавить по 1 примеру на dayType, `Each sentence ≤10 words`, `Do NOT invent numbers not in the briefing`. (Юмор compass — partial/ложная тревога, тон «живого человека» уже задан стр.32 — править не обязательно.)

---

## 5. Что УЖЕ хорошо (эталоны для равнения)

- **«Не читать мысли» — эталон: mistake_full (стр.260-264), mistake_eli5 (стр.350-353), choice_explain (стр.37), dialog_personas.** Прямой запрет домысливать мотив + явный учёт «мог промахнуться пальцем». Именно эту формулировку нужно скопировать в weekly_review (P0-1).
- **«ТЫ» — эталон везде:** явное `as "ты" ... NEVER the polite "вы"/Sie/vous`. Лучший образец — explain_phrase стр.97 и compass стр.32.
- **Словарь замен — эталон: compass (стр.37):** `Do NOT use "lesson", "mistake", "statistics", "buy", "price". Speak about a "session", "your phrases", "your path".` Это готовый шаблон для P0-1/P0-3.
- **Gain-framing + запрет фальш-срочности — эталон: compass (стр.36):** `gain-framing (what they gain, never what they lose)... No fake urgency, no scaring.`
- **Юмор — эталон: stats_insights/weekly_review/mistake_eli5:** `LIGHT touch of humor ... one small wink, never forced, never at the learner's expense.`
- **Анти-галлюцинация со структурной страховкой — эталон: weekly_review (parseAndGuardResult, label из брифинга) и stats_insights (guardLearnerFacingNote, sanitizeBriefing).** На это нужно равнять choice_explain (передавать значения дистракторов) и premium_dialog.
- **Простота/CEFR-дисциплина — эталон: premium_dialog (стр.250-252, реинъекция CEFR)** и **mistake_eli5 (ZERO grammar words, contrast bank с верными объяснениями).**

---

Итог простыми словами:
- Проверил девять текстов-подсказок для ИИ по шести меркам и собрал единый список правок; считал проблемой только то, что перепроверка подтвердила.
- Самое срочное и важное: в недельном разборе и в разборе варианта подсказка позволяет назвать ответ человека «ошибкой/неправильно» и даже домыслить, почему он ошибся — это обижает людей постарше и новичков, надо запретить.
- Ещё срочное про деньги: в годовой статистике можно случайно надавить «не потеряй серию, успей сегодня» — это отпугивает, разрешим такое только тем, кто реально давно занимается.
- Важное про доверие: в паре мест ИИ может выдумать значение слова или несуществующий прогресс — добавим правило «не уверен — не выдумывай».
- Менее срочное: сделать предложения короче (для людей 50+), убрать слова-паразиты и заумные термины, добавить живости.
- Хорошая новость: обращение «на ты», нотка юмора и правило «не угадывать чужие мысли» во многих местах сделаны образцово — их и берём за образец для остальных.

---

# Приложение: детальные находки по каждому промпту

## mistake_full  (общий балл: 82)
Файл: 

**Главные проблемы:**
- Когнитивная лёгкость: промпт нигде не ограничивает длину предложения, а worked example (строки 289-294) содержит предложения по 25-28 слов с тире-вставками — модель будет имитировать эту длину, нарушая библейское «≤10 слов / один тезис = одна строка», что критично для целевой аудитории 50+.
- Слово «ошибка/неправильно» в выводе не смягчается явно: промпт не инструктирует модель по словарю библии (ошибка→попытка/почти/давай ещё) для type A/B; мягкость обеспечена только тоном и образцом ветки C, но не гарантирована.
- Точность it/that: формулировка worked example 'that points at something singled out or further off' заигрывает с осью дистанции (further off), тогда как eli5-вариант это явно запрещает (строка 363); в full-промпте такого предохранителя нет — риск смешать ось данности с осью «далеко».
- Жёсткая обязанность выдать минимальную пару для каждого type-A свапа (234-237) при отсутствии явного исключения «если честной пары нет — не выдумывай» создаёт напряжение с TRUTH FLOOR; под давлением шаблона модель может натянуть пару на частичные синонимы/коллокации.

**Конкретные правки:**
- Добавить в блок FORMAT (после строки 272) явный лимит длины по библии: 'Keep sentences short — aim for under ~10 words each, one idea per sentence; break long explanations into separate short sentences.' и переписать worked example (289-294) короткими предложениями без длинных тире-вставок, чтобы образец не провоцировал длинноты.
- В HARD BANS или FORMAT добавить смягчение слова «ошибка» по словарю: 'Never call it a "mistake"/"wrong" in a harsh way in the output language; frame it as a near-miss ("почти", "easy mix-up") — state the fix without a verdict on the learner.'
- В описание type A / worked example добавить тот же предохранитель, что в eli5 (строка 363): 'For "it"/"that" the axis is givenness (already-in-focus vs set-apart), NOT distance — do not say "that" means "far away"; reserve near/far only for "this"/"that".'
- Смягчить обязанность пары в type A (строки 234-237): добавить 'If no honest minimal pair exists for this specific swap, skip the pair and give the reliable plain rule instead (per TRUTH FLOOR) — never manufacture one.' чтобы устранить напряжение шаблон-vs-истина.

**Перепроверка:** bible=partial, accuracy=confirmed

## mistake_eli5  (общий балл: 87)
Файл: 

**Главные проблемы:**
- Персона жёстко инфантилизирует пользователя: 'curious child', 'a five-year-old', 'kneeling next to a small kid you like' (стр.340,348,400). ELI5 заказан намеренно, но для реального взрослого 50+ детский тон может звучать снисходительно — Библия требует человечности, а не разговора как с ребёнком.
- Словарь замен Phraseman не закреплён в инструкции: промпт нигде не велит говорить «попытка/почти» вместо «ошибка», «фраза» вместо «слово». Держится лишь на одном примере 'oops, almost!'. Модель может выдать нейтральные слова вне фирменного словаря.
- Объяснение 'it' vs 'that' в контраст-банке размыто ('a bit set apart — just brought up as a whole, or off on its own', стр.362-363): для новичка опора слабая, на грани понятности (точность не нарушена, но дидактически шатко).
- Нет явного запрета на длину/число абзацев в символах — есть 'three to five short sentences', но при склонной к воде модели и максимуме 320 токенов ограничение мягкое (риск в основном снят max_tokens=320).

**Конкретные правки:**
- Смягчить инфантилизацию: в system (стр.340-344) заменить 'explaining ONE small English word mistake to a curious child. The learner is a beginner' на 'explaining ONE small English word mistake as simply as you would to a curious beginner — warm and plain, but never talking down to an adult'. Убрать/смягчить 'a five-year-old' (стр.348) → 'a complete beginner', и 'kneeling next to a small kid you like' (стр.400) → 'sitting beside a friend who is just starting out'.
- Закрепить словарь Phraseman: в раздел HOW TO SOUND (после стр.407) добавить строку: 'When you react to the slip, use kind words like "почти"/"almost", never "ошибка"/"wrong"/"mistake"/"error"; speak of the English bit as a "фраза/слово", warmly.'
- Уточнить 'it' vs 'that' в банке (стр.362-363): дать более опорную детскую пару, напр.: '"it" — про то, о чём мы только что говорили ("I read it" про книгу из прошлой фразы); "that" — когда показываешь на что-то целиком новое ("What is that?").' Убрать абстрактное 'a bit set apart'.
- Добавить мягкий потолок длины в символах в раздел LENGTH (стр.413): 'Aim for under ~60 words total.' — чтобы 'three to five sentences' не растягивались.

## explain_phrase  (общий балл: 79)
Файл: 

**Главные проблемы:**
- Паразит «просто/simply» зашит в сам промпт (строки 114, 117) и почти наверняка протечёт в русский вывод («"I'm" — это просто короткая форма…»), нарушая прямой запрет Библии Часть V п.4.
- Открытая инструкция «reason to a contrast you are SURE is true» (строка 115) для фраз вне CONTRAST BANK — главный канал галлюцинации: LLM субъективно «уверена» и может выдать ложное правило с уверенным тоном.
- Промпт не велит модели применять Словарь замен Phraseman (Часть I) — если объяснение касается темы учёбы, возможны запрещённые «выучить/изучить» вместо «осваивать», «ошибка» вместо «попытка».
- Жёсткое «pick THE single tricky spot / commit to the ONE» (строки 99-101) на фразе с несколькими равноценными ловушками заставит произвольно выбрать одну и подать как единственную важную.
- Упрощённая категоричная формула «"it" = the thing … in hand» (строка 104) может слегка вводить в заблуждение на абстрактном «it», хотя для ELI5 это приемлемо.
- Нет примера тёплой нотки/мотивационного хука в духе ТРЕНЕРА — на серьёзной grammar-теме модель может выйти суховато (упущенный плюс удержания).

**Конкретные правки:**
- В промпт добавить явный запрет паразитов: после строки 127 вставить строку — «Avoid filler words in the output prose: never use the target-language equivalents of "просто/just", "также/also", "в принципе", "на самом деле", "кстати". State the point directly.» И переписать строки 114 и 117, убрав «simply»: «"I'm" is the short way to say "I am"» / «these words go together as a fixed set phrase».
- Усилить анти-галлюцинацию для случая вне банка (строка 115): «If the phrase's trap is NOT in this bank, teach a contrast ONLY if you are certain it is standard, textbook-true English; if you have ANY doubt, fall back to the NO-TRAP line instead of inventing a contrast.»
- Добавить мостик к Словарю Phraseman: «When you must refer to studying, use "осваивать/прокачивать" not "учить/изучать"; never call a learner's choice an "ошибка" — if you reference getting it wrong, frame it as "легко перепутать".»
- Смягчить моно-ловушку (строки 99-101): «If the phrase has two equally tricky spots, you may briefly name the second in one clause, but still spend almost all words on the first.»
- Смягчить категоричность строки 104: «"it" = the thing already in focus or just mentioned (often, but not always, close or in hand)» — чтобы абстрактное "it" не противоречило картинке.
- Дать один эталон тёплой завершающей нотки в духе ТРЕНЕРА к memory-hook (строка 123): например «so here you want "that", not "it" — и теперь это твоё».

**Перепроверка:** bible=partial, accuracy=partial

## choice_explain  (общий балл: 78)
Файл: 

**Главные проблемы:**
- Лимит «max ~18 words» (стр.43) и «in one breath» (стр.44) почти вдвое выше библейского порога ≤10 слов/тезис — для новичков и 50+ это тяжело.
- Рамка «WRONG / why it's wrong» (стр.40, 43) противоречит словарю Библии (ошибка→попытка/почти) и запрету Части V п.6 — высокий риск, что модель выдаст пользователю «это неправильно».
- Значения дистракторов в промпт не передаются — модель сама придумывает, что значит каждый неверный вариант (стр.43), → риск фактических галлюцинаций на многозначных/синонимичных дистракторах; нет страховки «не уверен — не выдумывай».
- Нет микро-крючка продолжения («и идём дальше») в confirm/разборе — упущенная мотивационная деталь из библейского образца стиля Человек.
- Confirm не обязан начинаться с мягкой библейской формы «Почти!/Верно!» — формулировка отдана на усмотрение модели.

**Конкретные правки:**
- Стр.43: заменить «max ~18 words» на «max ~12 words, ideally under 10» и добавить «keep it to one simple clause»; в стр.44 убрать «in one breath», задать «one short sentence».
- Стр.40 и 43: убрать слово-рамку «wrong» из инструкций вывода — переписать на «the OTHER options (these do not fit this meaning)» и «explain ONLY what each word means and why it does not fit here; NEVER call the learner's pick «wrong/incorrect/ошибка» in the output».
- Стр.43: добавить страховку точности: «If you are not certain what a given option means, say only that it does not fit this meaning — do NOT invent a definition.» И/или расширить сигнатуру, передавая известные значения дистракторов.
- Стр.44: добавить мягкий крючок: «end the confirmation with a tiny forward nudge (e.g. «идём дальше»)», сохранив лимит длины.
- Стр.44: задать тёплый зачин confirm из словаря: «start with a short warm marker like «Верно!/Точно!» in ${target.name}».

**Перепроверка:** bible=confirmed, accuracy=confirmed

## stats_insights  (общий балл: 74)
Файл: 

**Главные проблемы:**
- Словарь замен библии не передан модели: промпт сам оперирует 'stats screen/card' (строки 315,320) и 'words' (строка 333) — на выходе пользователь получит запретные «статистика» и нейтральное «слов» вместо 'твои результаты' и 'фраза/частичка языка'.
- Gain-framing не зафиксирован как правило, а блок 'year' (currentStreak/goalPct, строка 331) открыт для loss-framing и фальш-срочности («не потеряй серию», «успей сегодня») — библия разрешает loss-framing только для стрика 7+, этого условия в промпте нет.
- Нет потолка длины предложения (≤10 слов библии) — только '1-2 short sentences' (строка 321) при MAX_NOTE_CHARS=400 (строка 58); модель может выдать длинное сложное предложение, тяжёлое для 50+.
- Жаргон для percentiles: блок оперирует 'XP%/percentile rank' (строка 332) без указания переводить это в живые слова — риск непонятного новичку/50+ текста ('ты в топ-15% по XP').
- Не передан запрет слов-паразитов библии («просто/кстати/также/в принципе») — часть V библии (строка 489) в промпте никак не отражена.

**Конкретные правки:**
- В строку 325 (или новым пунктом ABSOLUTE RULES) добавить словарь замен: 'Never call it «статистика»/«stats» to the learner — say «твои результаты». Prefer «фраза/частичка языка» over «слово». Use «серия» for streak, never «урок».'
- Добавить правило gain-framing: 'Always frame as what the learner HAS / can gain, never as loss. Loss-framing (e.g. «не потеряй серию») is allowed ONLY in the «year» note AND only when currentStreak >= 7. For shorter streaks use pure encouragement. Never create false urgency («успей сегодня»).'
- Ужесточить длину: заменить в строке 321 '1–2 short sentences' на '1–2 short sentences, each sentence <= 10 words, plain words' и снизить MAX_NOTE_CHARS (строка 58) с 400 до ~140.
- Для блока percentiles (строка 332) добавить: 'Speak in plain human words, not jargon — avoid «percentile», «XP», «daily7»; say e.g. «ты впереди большинства».'
- Добавить в ABSOLUTE RULES запрет паразитов: 'Never use filler words («просто», «кстати», «также», «в принципе», «на самом деле») or their equivalents in ${langName}.'

**Перепроверка:** bible=partial, marketing=confirmed

## weekly_review  (общий балл: 68)
Файл: 

**Главные проблемы:**
- Словарь замен НЕ применён к выводу: промпт нигде не велит избегать слова «ошибка» (экран внутренне = «mistake review») и заменять на «попытка/почти», а также «урок→сессия/вызов», «статистика→твои результаты», «слово→фраза» — модель на русском напишет «твои ошибки / ты ошибся», нарушая ч.I и ч.V п.6.
- Нет прямого запрета домысливать ПРИЧИНУ/МОТИВ ошибки (строка 280 ловит только связь эффорт↔знание): модель может выдать «ты путаешь времена / переводишь дословно» — обвиняющая галлюцинация, которую другие промпты уже закрыли, а этот нет.
- Нет когнитивных лимитов библии: нет потолка «≤10 слов в предложении», нет лимита заголовка ≤5-6 слов (greeting), нет запрета слов-паразитов («просто», «на самом деле», «кстати»).
- Нет запрета грамматического жаргона для аудитории 50+/новичок: при назывании слабых категорий модель может уйти в термины («определённый артикль», «вспомогательный глагол»).
- Маркетинг: нет явной формулировки gain-only / запрета loss-framing в свободных абзацах (хотя контекст не paywall, риск низкий).

**Конкретные правки:**
- В блок ABSOLUTE RULES добавить строку словаря замен для ВЫХОДА: 'In the output language, NEVER use the word for "mistake/error" (ошибка/error/erro...) or "wrong". Frame slips as "почти"/"a near-miss"/"let us try again". Use the word for "session/challenge" instead of "lesson", "your results" instead of "statistics", "phrase" instead of "word" where natural.'
- Добавить явный анти-домысел причины (как в mistake/eli5): 'NEVER speculate WHY the learner slipped — do NOT say they confused X, translated literally, rushed, did not think, or misunderstood. You only see counts, not reasons. State the fact (which category, which example phrases) and the correct path forward, nothing about motive.'
- Добавить когнитивные лимиты библии: 'Sentences max ~10 words. One idea per line. The greeting is max 5-6 words. Avoid filler words (the output-language equivalents of просто/также/кстати/в принципе/на самом деле).'
- Добавить запрет жаргона: 'No grammar jargon (no "auxiliary verb", "definite article", "perfect tense" etc.). Describe weak spots in plain everyday words a 50+ beginner instantly understands.'
- Усилить строку 280 до gain-only: 'Frame everything as what the learner is GAINING or can unlock next — never as loss ("you will forget", "you will lose progress"). Loss-framing is forbidden here.'
- Подстраховать рекомендации: в выводе label берётся из брифинга verbatim — добавить клиентскую проверку/замену слова «урок»→«сессия/вызов» в самих label на стороне клиента, т.к. промпт их не трогает (parseAndGuardResult строка 335 копирует label как есть).

**Перепроверка:** bible=confirmed, marketing=confirmed, noMindReading=confirmed

## compass  (общий балл: 86)
Файл: 

**Главные проблемы:**
- Нет ни одного примера выхода (few-shot) для 4 типов дня — модель сама решает тон/длину, отсюда разброс: возможен пресный «успокаивающий» вывод без живой нотки или, наоборот, слишком общий.
- Правило Библии «≤10 слов в предложении» не сформулировано явно — только мягкое «tiny sentences», что допускает 12-15-словную фразу.
- Нет запрета выдумывать конкретику сверх briefing (числа, «вчера ты учил X») — низкий, но реальный риск галлюцинации фактов в тёплой строке.
- Не упомянут запрет слов-паразитов Библии («просто/кстати/также/в принципе») — на русском модель может вставить «просто повтори».
- Юмор/живая человечность не поощряются вовсе (только warm+calm) — недобор по оси лёгкой нотки, которую ценит Библия (стиль Человек/Тренер).
- writeIn-строки заимствованы из контекста разбора («Пиши объяснение…») — для строки Компаса слово «объяснение» слегка не к месту (косметика, на выбор языка не влияет).

**Конкретные правки:**
- В строку правил (стр.36) добавить: 'Each sentence ≤10 words. One thought per sentence.' — продублировать лимит Библии явным числом.
- Добавить few-shot: по 1 короткому примеру на каждый dayType (easy/deep_dive/repair/comeback) на русском в духе Тренера, например easy: «Сегодня спокойно. Освежи вчерашние фразы — и день твой.»
- Добавить запрет выдумывания фактов: 'Do NOT invent numbers, dates, or specifics not given in the briefing (no "yesterday you learned 12").'
- Добавить в правила запрет паразитов: 'Avoid filler words (просто, кстати, также, в принципе, на самом деле и их аналоги).'
- Поощрить живую нотку: 'Sound like a real person who learns languages too — one light, human touch is welcome; never clownish, never at the learner\'s expense.'
- Косметика: для Компаса лучше не переиспользовать writeIn с словом «объяснение». Либо завести отдельный writeInLine ('Пиши строку ТОЛЬКО на русском языке'), либо в промпте после ${target.writeIn} добавить 'Write the briefing LINE in that language.'

**Перепроверка:** humor=partial

## premium_dialog  (общий балл: 85)
Файл: 

**Главные проблемы:**
- RU-вставка без правила «ты»: companion-режим разрешает краткий ответ по-русски (строка 292 'you may answer briefly in Russian'), но НЕ задаёт обязательное «ты» и не ограничивает простоту/длину русского объяснения — единственная поверхность, где Библия реально применима, и она не закрыта.
- Антигаллюцинация прогресса держится только на тексте: при пустом memory (weakWords/summary undefined) настойчивый вопрос «как мои успехи?» может выманить выдуманные цифры; защита стр.290 не структурная.
- Контроль формата/длины — только промптом: запрет markdown кроме [[...]] (строка 258) и лимит ~25 слов (строка 250) модель может нарушить, проверки на выходе нет.
- Юмор/характер персонажа не имеет явного запрета на подколы в адрес ошибок ученика (покрыто лишь общим NEVER shame, строка 249) — небольшой остаточный риск в scenario с «живым» персонажем.

**Конкретные правки:**
- Строка 292: после 'you may answer briefly in Russian' добавить '— always address the learner informally as «ты», never «вы», keep it short (≤2 sentences) and free of grammar jargon, then give one short English phrase.' — закрыть единственную RU-поверхность по Библии.
- Усилить антигаллюцинацию (рядом со строкой 290): добавить 'If weakWords/summary are empty, you do NOT know their stats — say you have not tracked enough yet and invite a short practice; NEVER invent numbers, streaks, or past lessons.'
- Строка 253: к рекасту добавить явный запрет домысла мотива для надёжности: 'Just model the correct form; never speculate WHY they erred (do not say they "translated literally" or "got confused").' — зафиксировать правило no-mind-reading прямо в инструкции коррекции.
- Строка 250: продублировать лимит длины и для русских вставок, чтобы ~25 слов не обходились через RU-ответ.
- Опционально (scenario, строка 265): добавить 'humour is never at the learner's expense, never mock their mistakes' — снять остаточный риск подколов «живого» персонажа.

**Перепроверка:** accuracy=confirmed

## dialog_personas  (общий балл: 86)
Файл: 

**Главные проблемы:**
- Challenge-goalEn — это многословные абзацы мета-инструкции для модели (поведение оппонента + условие награды на 2-3 предложения); сами по себе не баг (юзер их не видит), но это единственное место, где текст «тяжёлый» — стоит держать их максимально лаконичными, чтобы модель не путалась.
- Граница «ролевой антагонист vs запрет Библии унижать» тонкая: персоны 'smug/condescending/patronising/grumble' оправданы как трудность, НО нет явной защитной инструкции «никогда не оскорбляй личность ученика, дави только на ясность речи» — сейчас это держится только на формулировках 'not aggressive/never hostile'. Один такой явный guard на уровне сервера снизил бы риск, что модель перегнёт.
- Файл смешивает три разные сущности (типы+UI-копия 8 языков+промпт-персоны) на 1641 строку — превышает ориентир Библии/код-стайла на размер; промпт-персоны стоило бы вынести в отдельный модуль, чтобы аудит и правки текста не тонули в данных.
- Нет общего правила диалога В ЭТОМ файле (оно на сервере premiumDialogSend) — значит этот аудит покрывает только характеры; финальное «ты», тон и анти-унижение реально задаются там, и их нужно аудировать отдельно.

**Конкретные правки:**
- В каждую challenge-персону (стр.1247-1609) или в серверный промпт добавить явный guard: 'Stay in character but never insult the learner as a person; push only on the clarity of their language, and ease off the moment they communicate clearly.' — закрепит границу, которую сейчас держат только слова not aggressive/never hostile.
- Сократить challenge-goalEn до 1-2 предложений: убрать дублирование между goalEn и persona (напр. в seat_stolen_cafe условие 'if the learner uses only very short simple phrases…' повторяет смысл persona 'you only back down once the learner explains clearly') — оставить условие в одном месте.
- Вынести массив DIALOG_SCENARIOS (персоны+role+setting+goalEn, стр.877-1616) в отдельный файл ai_dialog_personas.ts, оставив тут типы и UI-копию — файл 1641 стр. длиннее ориентира 800.
- Добавить в комментарий стр.20-24 ссылку на серверный premiumDialogSend и явно указать, что глобальные правила тона/«ты»/анти-унижения живут ТАМ — чтобы будущий аудитор не искал их в этом файле.
- (Опционально) Для A1-сценариев (coffee/grocery/first_meeting) добавить в персону краткую заметку для модели 'keep replies very short and simple (A1 level)', чтобы характерность персон не выливалась в слишком длинные/сложные реплики новичку.

## dialog_greeting  (общий балл: 72)
Файл: 

_LLM-промпт не найден (статичные данные / только модерация)._

## theo_advisor  (общий балл: 45)
Файл: 

**Главные проблемы:**
- КРИТИЧНО (локализация): испанский слот (es) во ВСЕХ ~31 правилах заполнен английской заглушкой — испаноязычные пользователи видят чистый английский вместо испанского (стр.162,178,192 и т.д.).
- Словарь замен библии массово нарушен (53 совпадения): ‘урок’, ‘статистика’, ‘ошибки’, ‘Premium’, ‘VIP’, ‘уровень’, ‘XP’ употреблены напрямую вместо обязательных замен.
- Когнитивная лёгкость провалена: почти каждая реплика длиннее 10 слов и содержит несколько тезисов в одной строке — для новичка/50+ это стена текста, а не лёгкий совет.
- Сырые тех/маркетинговые ярлыки в UI: ‘XP’, ‘XP boost’, ‘Premium-маршрут’, ‘VIP-режим’ — не человеческий язык; ценность Premium не продаётся, подаётся название тарифа.
- Юмора-искры нет: тон ровный, методический; голос человечный (это плюс), но эмоционально не цепляет.

**Конкретные правки:**
- Перевести все испанские (es) строки на реальный испанский. Пример стр.162: вместо «Premium right after onboarding. I would start...» → «Premium justo tras el onboarding. Yo empezaría por un plan personal para que la app te guíe cada día.» И так все ~31 правило (3-й аргумент fallbackCopy).
- Заменить ‘статистику’ → «твои результаты»: стр.175 «Загляни в статистику» → «Загляни в свои результаты»; аналогично стр.359,363,370,373.
- Заменить ‘ошибки’ → «почти/попытки/слабые места»: стр.367 «прирост теперь в ошибках» → «прирост теперь в почти-верных попытках»; стр.356,360,369.
- Заменить ‘урок’ → «сессия/раунд»: стр.190 «Начни с первого урока» → «Начни с первой сессии»; везде по файлу.
- Убрать сырые ярлыки: ‘Premium-маршрут’→«полный доступ к маршруту»; ‘VIP-режим включён’→«Всё открыто для тебя»; ‘усиление XP’→«сейчас очки идут быстрее».
- Сократить реплики до 1 тезиса/строка ≤10 слов. Пример стр.250 → «Можно вернуть ритм. Пройди восстановление — без чувства старта с нуля.»
- Добавить лёгкую человечную нотку в 2-3 ключевых реплики (приветствие, стрик), не за счёт юзера и не вместо смысла.

**Перепроверка:** simplicity=confirmed, bible=confirmed, humor=confirmed, marketing=confirmed, accuracy=confirmed

## re_engage_push  (общий балл: 52)
Файл: 

**Главные проблемы:**
- ИНТИМИДАЦИЯ + LOSS-FRAMING в streak_at_risk: title «🔥 Серия ${s} дней под угрозой!» и body «Не теряй прогресс!» — прямое запугивание («под угрозой» = es «en peligro», pt «em risco», id «dalam bahaya», vi «sắp mất», tr «tehlikede», pl «zagrożona») плюс loss-framing. Библия: loss-framing разрешён ТОЛЬКО при стрике 7+, а порог здесь STREAK_AT_RISK_MIN=3. Для стрика 3-6 это прямое нарушение.
- СЛОВАРЬ ЗАМЕН: «урок» вместо «сессия/раунд/вызов» во всех языках («Один урок сегодня», es «Una lección», pl «Jedna lekcja», pt «Uma lição»); «прогресс» вместо «путь/серия/след» («Не теряй прогресс!»). Запрещённые слова из Части I.
- ВОСКЛИЦАНИЯ-ПУЛЕМЁТ: почти каждый title и многие body заканчиваются «!» (ru: «под угрозой!», «Не теряй прогресс!», «Давно тебя не было!», «помним тебя!»). Библия (маркеры Тренера): «Нет восклицательных знаков через слово». Тон скатывается в крикливый/корпоративный.
- ДЛИННЫЙ ЗАГОЛОВОК с цифрой-переменной: в части языков streak-title > 5-6 слов (es «¡Tu racha de ${s} días está en peligro!» = 8 слов; pt «Sua sequência de ${s} dias está em risco!»). Библия: заголовок максимум 5-6 слов.
- НЕТ GAIN-CTA и streak-ветка давит потерей вместо выгоды: не используется gain-формулировка вроде «Одна сессия — и серия растёт»; «Продолжим?» слабее глагола действия.

**Конкретные правки:**
- Строка 186 (ru streak): title без угрозы и «!»: `🔥 Серия ${s} дней ждёт тебя`; body: `Одна сессия сегодня — и серия растёт.` (убрать «урок»→«сессия», убрать «Не теряй прогресс!»). Так же перевести во всех 8 языках строк 186-193 (en peligro/em risco/tehlikede/zagrożona/dalam bahaya/sắp mất → нейтральное «ждёт тебя»).
- Если loss-framing для стрика всё же нужен — применять ТОЛЬКО при streak>=7 (отдельная ветка copy), а для streak 3-6 чистый gain. Сейчас STREAK_AT_RISK_MIN=3 (строка 27) и текст «под угрозой» уходит всем — развести две формулировки по порогу.
- Строки 197-204 (inactive_return): убрать «!» в title (`👋 Давно тебя не было` без воскл.); ru body упростить «вернут тебя в форму» → «и ты снова в ритме». Аналогично uk/es/pt/vi/id/tr/pl.
- Строки 208-215 (inactive_long): ru body «слова снова начнут оседать» → «слова снова приходят сами»; title без «!»: `💡 Мы всё ещё помним тебя`.
- Везде заменить «урок/lección/lekcja/lição» → нейтральное «сессия/раунд» по словарю; «прогресс/progreso/postęp» в loss-фразах выкинуть совсем.
- Пройти все 24 строки (8 языков × 3 причины) и снять лишние «!»: оставить эмодзи как единственный эмоциональный акцент, без дублирующего восклицания в каждой строке.

**Перепроверка:** bible=confirmed, humor=confirmed, marketing=confirmed

## league_chat  (общий балл: 100)
Файл: 

_LLM-промпт не найден (статичные данные / только модерация)._

## theo_advisor_strings  (общий балл: 42)
Файл: 

**Главные проблемы:**
- КРИТИЧНО: испанский слот (es) во ВСЕХ 33 советах содержит английский текст вместо испанского — испаноязычный пользователь видит советника по-английски (англ.заглушка-мастер не локализована).
- Запрещённое библией слово «урок» используется десятки раз вместо сессия/раунд/вызов (first_visit, finish_near_lesson, continue_lesson, medal_collector, level_early и др.).
- Запрещённое «статистика/статистику» вместо «твои результаты» в vip_welcome, good_streak, lessons_8_done, new_premium.
- Loss-framing «Цепочка под угрозой» (streak_at_risk) применяется без гейта streak>=7 — пугает и новичков, нарушая Правило 2 библии.
- Запрещённые «ошибки/ошибок» и «задание/задачу» вместо попытка/вызов/миссия в нескольких советах.
- Системное превышение лимита «≤10 слов/предложение» — многие советы это длинные двойные предложения, местами с абстрактными метафорами для аудитории 50+.

**Конкретные правки:**
- Заполнить испанский слот РЕАЛЬНЫМ испанским во всех 33 вызовах fallbackCopy. Пример premium_onboarding: 'Premium justo después del onboarding. Empezaría por un plan personal para que la app te guíe día a día.' — и так для каждого совета (сейчас там английский).
- Заменить «урок»→«сессия» (или «раунд»/«вызов») во всех ru-строках. Напр. first_visit: «Начни с первой сессии: 6-8 минут дадут первые сигналы, что советовать дальше».
- Заменить «статистику/статистика»→«твои результаты». Напр. vip_welcome: «Загляни в свои результаты: там видно, где уже сильно, а где добрать повторением».
- Заменить «ошибки/ошибок»→«слабые места/почти-готовые фразы», «задание/задачу»→«вызов/миссию». Напр. daily_tasks_done: «лучше повторить слабые места, а не гнаться за количеством».
- Перефразировать streak_at_risk без запугивания на gain-тон: «Серию легко удержать. Сделай самый короткий шаг сейчас: сессия, тренажёр или дневной вызов» — и/или добавить в matches() условие, чтобы loss-формулировка шла только при ctx.streak>=7.
- Разбить длинные советы на ≤10 слов/предложение и убрать абстрактные метафоры («мозг любит завершённые маленькие циклы»→«короткий шаг лучше запоминается»).

**Перепроверка:** simplicity=confirmed, bible=confirmed, humor=confirmed, marketing=confirmed, accuracy=confirmed

---

# СТАТУС ВНЕДРЕНИЯ (2026-06-21, эта сессия)

Пользователь выбрал «внести всё (P0+P1+P2)». Внесено:

## LLM-промпты
- **weekly_review** (P0): словарь замен (не «ошибка»→«почти», не «урок»→«сессия», не «статистика»→«результаты»), запрет домысливать причину ошибки, gain-only, лимит ≤10 слов, запрет жаргона и паразитов.
- **choice_explain** (P0): убрана рамка «WRONG»→«other options», запрет называть выбор «ошибкой», страховка «не уверен в значении — не выдумывай», лимит ≤12 слов, тёплый маркер + крючок «идём дальше». +«ты» (внесён ранее).
- **stats_insights** (P0): gain-framing, loss-framing только при стрике ≥7 и только в блоке «year», запрет фальш-срочности, «статистика»→«твои результаты», перцентили простыми словами, ≤10 слов, запрет паразитов, MAX_NOTE_CHARS 400→160.
- **mistake_full** (P1): guard it/that (данность, не дистанция), лимит ≤10 слов, смягчение слова «ошибка»→«почти», worked example переписан короткими предложениями. (Запрет домысла причины + ветка антонимов внесены ранее.)
- **premium_dialog** (P1): «ты» для русских вставок, анти-галлюцинация прогресса при пустом memory, запрет домысла причины в recast.
- **explain_phrase** (P2): убран «simply» (протекал в «просто»), запрет паразитов, усилена анти-галлюцинация вне банка, смягчена моно-ловушка, мостик к словарю Phraseman. (+«ты» ранее.)
- **compass** (P2): ≤10 слов, few-shot по dayType, запрет паразитов, запрет выдумывать цифры, поощрение живой нотки.

Бампы версий кэша (чтобы старое перегенерилось): MISTAKE 5→6, CHOICE 2→3, EXPLAIN 5→6, COMPASS 1→2. stats/weekly кэшируются по окну времени — обновятся сами.

## Статичные тексты
- **re_engage_push**: streak-пуш переписан в gain-тон («серия ждёт тебя / серия растёт») во всех 8 языках вместо «под угрозой!/не теряй»; «урок»→«сессия»; сняты лишние «!».
- **home_theo_advisor**: испанский слот во ВСЕХ 33 правилах был английской заглушкой → переведён на реальный испанский; применён словарь замен (урок→раунд/вызов, статистика→результаты, ошибки→слабые места, XP/Premium/VIP→человеческим языком); снято запугивание «Цепочка под угрозой»→gain; укорочены длинные фразы.

## Проверка
tsc functions = 0, сборка lib = 0. Тесты затронутых модулей зелёные (mistake/choice/stats/weekly/compass/premium/explain_cache/explain_judge/explain_budget = 107/107).
2 предсуществующих падения от ДРУГИХ сессий (НЕ связаны с правками): explain_reports (throw в resolvePromptLangKey), re_engage_push parseReEngageUser (поле pushTokenTimezone в HEAD без обновления теста).

НУЖЕН: firebase deploy --only functions (lib трекается) + пересборка приложения (home_theo_advisor — клиентский файл).
