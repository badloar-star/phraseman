# Заставка Plus — сверка текстов на 9 языках (Переводчик → 2 · ДИЗАЙН)

Governance-ID: TG-28A4FF0AE9DC
Status: Ready for 2 · ДИЗАЙН
Owner: «10 · ПЕРЕВОДЧИК» (тексты); вставка — 2 · ДИЗАЙН (файл `components/plus-splash/plus_splash_copy.ts` у Дизайна, не закоммичен)

## Outcome

Тон — «премиально, без давления»: коротко, уверенно, без канцелярита и буквальных калек. Русский — из эталона,
не трогаю. Ниже — только строки, которые надо заменить; всё остальное верно.

## Главное

Слово «стоп» в нескольких языках переведено буквально и звучит странно:
- tr «durak yok» — так говорят про автобусные остановки;
- es/pt «sin paradas / sem paradas» — тоже про остановки транспорта;
- en «no stops», «Dialogues without a counter» — калька, носитель так не скажет.

## Замены (ключ → язык: было → стало)

**title**
- en: More practice — no stops → **More practice, no interruptions**
- es: Más práctica, sin paradas → **Más práctica, sin pausas**
- pt-BR: Mais prática, sem paradas → **Mais prática, sem pausas**
- vi: Luyện nhiều hơn — không bị dừng → **Luyện nhiều hơn — không gián đoạn**
- id: Lebih banyak latihan — tanpa henti → **Lebih banyak latihan, tanpa jeda**
- tr: Daha çok pratik — durak yok → **Daha çok pratik, kesintisiz**

**subtitle**
- en: …live dialogues, your voice and review of weak spots. → **Everything that gets you talking: real dialogues, voice practice and work on weak spots.**
- id: Semua yang membantu berbicara: … → **Semua yang membantumu mulai bicara: dialog nyata, latihan suara, dan mengulang bagian yang lemah.**

**b1Title** (смысл — «без лимита», не «без прибора-счётчика»)
- en: Dialogues without a counter → **Unlimited dialogues**
- es: Diálogos sin contador → **Diálogos sin límite**
- pt-BR: Diálogos sem contador → **Diálogos sem limite**
- vi: Hội thoại không đếm lượt → **Hội thoại không giới hạn**
- id: Dialog tanpa penghitung → **Dialog tanpa batas**
- tr: Sayaçsız diyaloglar → **Sınırsız diyalog**
- pl: Dialogi bez licznika → **Dialogi bez limitu**

**b1Text** — чтобы не повторять «без лимита» сразу после заголовка:
- en: … — no daily limit → **Work and everyday situations, whenever you want**
- es → **Situaciones de trabajo y del día a día, cuando quieras**
- pt-BR → **Situações de trabalho e do dia a dia, quando quiser**
- vi → **Tình huống công việc và đời thường, lúc nào cũng được**
- id → **Situasi kerja dan sehari-hari, kapan pun kamu mau**
- tr → **İş ve günlük durumlar, istediğin zaman**
- pl → **Sytuacje w pracy i na co dzień — kiedy chcesz**
- (ru/uk остаются как есть: в эталоне так.)

**b2Title** (одна форма во всех языках — «ты говоришь», как в ru)
- pt-BR: Fale em voz alta → **Você fala em voz alta**
- id: Berbicara dengan suara → **Bicara dengan lantang**

**b2Text**
- en: Phraseman rates how accurately it was said → **Phraseman checks how accurately you said it**
- es: Phraseman valora qué tan bien se dijo → **Phraseman evalúa la precisión de lo que dices**
- pl: Phraseman ocenia, jak dokładnie to zabrzmiało → **Phraseman ocenia, jak dokładnie mówisz**

**b4Title** (смысл — не ждать до завтра, а не «остановки»)
- en: No daily stops → **No waiting for tomorrow**
- es: Sin paradas diarias → **Sin esperar a mañana**
- pt-BR: Sem paradas diárias → **Sem esperar até amanhã**
- vi: Không dừng giữa chừng → **Không phải chờ đến mai**
- id: Tanpa henti harian → **Tak perlu menunggu besok**
- tr: Günlük duraklar yok → **Yarını beklemek yok**
- pl: Bez dziennych przerw → **Bez czekania do jutra**

**b4Text**
- id: Energi tidak terpakai — belajar selama yang diinginkan → **Energi tidak terpakai — belajarlah sepuasnya**

## Верно без правок

Все строки uk; ru (эталон); b3Title/b3Text на всех языках; vi/tr/pl subtitle; en/es/vi/tr b2Title.

## Scope / Architecture / Security and privacy

Только тексты. Без логики. Данные не затрагиваются.

## Technical debt

- Переводы не проверены носителями.

## Verification

Дизайн после вставки: `babel.parseSync` файла и тесты заставки (после «142 tsc готов»).

## Rollback

Удалить файл.
