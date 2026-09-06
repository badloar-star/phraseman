/* ============================================================
   Данные курса для макетов — из content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md
   (утверждён владельцем 2026-09-03). 32 урока × 7 глав × 8 сессий.
   Роли сессий — modules/learning-v2/content/course_topology_v1.ts:
   8/16/24/32/40/48 — проверка главы, 49–55 — перенос, 56 — итоговый экзамен.
   ============================================================ */
(function () {
  const LESSONS = [
    ["Present be: I am, you are, he is", "Первая неделя в Дублине"],
    ["Present be: вопросы и короткие ответы", "Знакомство с городом"],
    ["a / an / the, this / that", "Обустраиваем квартиру"],
    ["There is / there are, some / any", "Ищем всё в новом районе"],
    ["Have / has, чьё это", "Семья, вещи, коллеги"],
    ["Present Simple: утверждение", "Будни: как живут люди вокруг"],
    ["Present Simple: do / does, don't", "Расспрашиваем соседей и друзей"],
    ["Can / can't, просьбы", "Просим, объясняем, учим готовить"],
    ["Present Continuous", "Что происходит прямо сейчас"],
    ["Simple vs Continuous", "Обычно и сейчас: отпуск, ремонт, дедлайн"],
    ["Was / were, there was", "Вчерашний день, детство"],
    ["Past Simple: неправильные глаголы", "Как прошли выходные"],
    ["Past Simple: did, didn't", "Разбираем, что случилось"],
    ["Past Continuous, when / while", "Что вы делали, когда…"],
    ["Going to, планы", "Планируем поездку и переезд"],
    ["Will: решения и обещания", "Обещания, прогнозы, споры"],
    ["Much / many, few / little", "Рецепт, вечеринка, покупки"],
    ["Сравнение, too / enough", "Выбираем квартиру, телефон, ресторан"],
    ["Could, may, be able to", "Что можно, что нельзя"],
    ["Must, have to, should", "Советы и обязанности"],
    ["Глагол + gerund / infinitive", "Что вы любите, хотите, боитесь"],
    ["Предлоги и фразовые глаголы", "Ориентируемся в городе и расписании"],
    ["Present Perfect: опыт", "Что вы уже пробовали"],
    ["Present Perfect: for / since", "Сколько вы уже…"],
    ["Used to, past perfect", "Как всё было раньше"],
    ["Zero и First Conditional", "Если…, то…"],
    ["Second Conditional, wishes", "Если бы… мечты"],
    ["Passive", "Новости и инструкции"],
    ["Определительные придаточные", "Тот человек, который…"],
    ["Косвенная речь", "Передаём чужие слова"],
    ["Непрямые вопросы, tags", "Вежливо и связно"],
    ["Must / might / can't для вывода", "Детектив: что здесь произошло?"],
  ].map((row, i) => ({ n: i + 1, system: row[0], arc: row[1] }));

  /* Урок 1: главы = шаги системы be + сцены арки. */
  const CHAPTERS = [
    { n: 1, title: "I am", scene: "Утро в офисе", moment: "Первый рабочий день", shape: "stairs" },
    { n: 2, title: "You are", scene: "Кофе с коллегой", moment: "Коллега приносит кофе", shape: "ring" },
    { n: 3, title: "He is, she is", scene: "Знакомство с командой", moment: "Начальник представляет людей", shape: "rows" },
    { n: 4, title: "It is", scene: "Квартира и погода", moment: "Первый вечер в квартире", shape: "rain" },
    { n: 5, title: "We are, they are", scene: "Обед с командой", moment: "Идём обедать всей командой", shape: "track" },
    { n: 6, title: "I'm, you're, isn't", scene: "Пятница, паб", moment: "Так говорят на самом деле", shape: "zigzag" },
    { n: 7, title: "Вся система be", scene: "Воскресный звонок домой", moment: "Рассказываем о неделе", shape: "spiral" },
  ];

  /* 56 сессий урока 1: [тип, грамматика, слова, момент сцены] */
  const S = [
    ["новая", "I am + слово", "here, ready, fine, happy", "Вошли в офис, все смотрят"],
    ["применение", "I am + состояние", "tired, busy, late, sorry", "День продолжается"],
    ["новая", "I am not", "hungry, cold, sure, alone", "Заботливый начальник"],
    ["голос", "I am / I am not", "early, right, wrong, free", "Утренняя планёрка вслух"],
    ["контраст", "am не выбрасывать", "hot, sick, lost, new", "Типичные ошибки: I fine, I no sure"],
    ["перенос", "I am (not) вне офиса", "home, back, done, ok", "Вечером в квартире, звонок другу"],
    ["слова", "Все 24 слова главы", "scared, glad, bored, full", "Конец дня, всё вперемешку"],
    ["проверка", "Итог первого дня", "", "Ответить на 10 вопросов о себе"],
    ["новая", "You are + слово", "welcome, right, kind, funny", "Коллега приносит кофе"],
    ["применение", "You are + оценка", "early, late, fast, quiet", "Говорим о собеседнике"],
    ["новая", "You are not", "crazy, alone, wrong, lazy", "Успокаиваем коллегу"],
    ["голос", "I am / you are", "brave, calm, honest, smart", "Комплименты вслух"],
    ["контраст", "am vs are", "young, old, strong, tall", "Ловушки: you am, I are"],
    ["перенос", "you в другой сцене", "safe, warm, dry, ready", "Помогаем туристу под дождём"],
    ["слова", "24 слова + возврат главы 1", "polite, serious, lucky, sad", "Вечер, разбор дня"],
    ["проверка", "Кофе с коллегой", "", "Скажи коллеге пять вещей о нём"],
    ["новая", "He is / she is", "nice, new, tall, friendly", "Начальник представляет людей"],
    ["применение", "He / she is + характер", "shy, loud, clever, bossy", "Обсуждаем коллег шёпотом"],
    ["новая", "He / she is not", "angry, mean, slow, rude", "Разубеждаем: он не злой"],
    ["голос", "is после he / she", "married, single, famous, rich", "Сплетни у кулера"],
    ["контраст", "am / are / is", "short, thin, blond, young", "Ловушки: she are, he am"],
    ["перенос", "he / she вне офиса", "asleep, awake, away, ill", "Сосед, друг, ребёнок"],
    ["слова", "24 + возврат глав 1–2", "patient, proud, grumpy, gentle", "Вечер, характеристики"],
    ["проверка", "Знакомство с командой", "", "Опиши трёх коллег"],
    ["новая", "It is + признак", "cold, small, dark, expensive", "Первый вечер в квартире"],
    ["применение", "It is + погода и время", "rainy, windy, late, early", "Утро, окно, часы"],
    ["новая", "It is not", "easy, hard, far, cheap", "Спорим с агентом по аренде"],
    ["голос", "it's про предметы", "broken, open, closed, empty", "Что-то сломалось"],
    ["контраст", "it в начале фразы", "heavy, light, clean, dirty", "Ловушки: пропуск it"],
    ["перенос", "it вне дома", "busy, quiet, loud, free", "Кафе, улица, транспорт"],
    ["слова", "24 + возврат", "wet, dry, hot, warm", "Погода за неделю"],
    ["проверка", "Квартира и погода", "", "Опиши квартиру и погоду"],
    ["новая", "We are + слово", "together, hungry, ready, late", "Идём обедать всей командой"],
    ["применение", "They are + слово", "busy, nice, loud, funny", "О другом отделе"],
    ["новая", "We / they are not", "alone, wrong, sure, free", "Мы не опаздываем"],
    ["голос", "we / they вслух", "colleagues, friends, neighbours, guests", "Кто эти люди"],
    ["контраст", "Все пять скрепок", "tired, happy, cold, hot", "Ловушки: we is, they am"],
    ["перенос", "we / they вне офиса", "lost, safe, home, back", "Прогулка, заблудились"],
    ["слова", "24 + возврат", "early, right, fine, sorry", "Отчёт о дне"],
    ["проверка", "Обед с командой", "", "Расскажи о своей команде"],
    ["новая", "I'm / you're", "fine, late, sure, sorry", "Так говорят на самом деле"],
    ["применение", "he's / she's / it's", "great, awful, gone, here", "Быстрые реплики"],
    ["новая", "we're / they're, isn't / aren't", "bad, ok, real, true", "Отрицание на скорости"],
    ["голос", "Слышать сокращения", "tired, cold, wrong, free", "Шум паба"],
    ["контраст", "I'm not vs isn't", "ready, busy, done, full", "Ловушки: I amn't, he'sn't"],
    ["перенос", "Сокращения в переписке", "fun, boring, cool, weird", "Чат с друзьями"],
    ["слова", "24 + возврат", "drunk, sober, sleepy, awake", "Конец вечера"],
    ["проверка", "Пятница, паб", "", "Пересказать вечер быстро"],
    ["применение", "am / is / are по подлежащему", "everyone, nobody, people, family", "Рассказываем о неделе"],
    ["применение", "Полные и короткие формы", "job, boss, flat, city", "Описываем всё сразу"],
    ["тонкость", "be с местом", "there, upstairs, outside, inside", "Где кто"],
    ["голос", "Длинный монолог о неделе", "week, day, night, morning", "Звонок маме"],
    ["контраст", "Все ловушки урока", "", "Ремонт ошибок недели"],
    ["перенос", "Собеседование по телефону", "confident, nervous, fluent, honest", "О себе кратко"],
    ["слова", "Возврат всех 7 глав", "", "Большой Speed-марафон"],
    ["экзамен", "Финал арки", "", "Неделя прошла"],
  ];
  const SESSIONS = S.map((row, i) => {
    const n = i + 1;
    const ch = Math.ceil(n / 8);
    const pos = ((n - 1) % 8) + 1;
    const role = n === 56 ? "final_exam" : pos === 8 ? "chapter_checkpoint" : n >= 49 ? "transfer_practice" : "guided_learning";
    return { n, ch, pos, role, type: row[0], grammar: row[1], words: row[2] ? row[2].split(", ") : [], moment: row[3] };
  });

  const TYPE_LABEL = {
    "новая": "Новое правило",
    "применение": "Применение",
    "голос": "Голос и слух",
    "контраст": "Контраст и ремонт",
    "перенос": "Перенос в другую сцену",
    "слова": "Закрепление словами",
    "тонкость": "Тонкость",
    "проверка": "Проверка главы",
    "экзамен": "Итоговый экзамен",
  };

  window.COURSE = { LESSONS, CHAPTERS, SESSIONS, TYPE_LABEL };
})();
