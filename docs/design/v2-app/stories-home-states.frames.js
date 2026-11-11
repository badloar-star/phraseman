/* ── помощники кадров «состояние Главной» ── */
const icn = (n, d = 120) => `<div class="icn pop" style="--d:${d}ms">${io(n, 58)}</div>`;
const rows = (items, d0 = 240) => `<div class="list rws">${items.map(([t, ic], i) => `<div class="r a" style="--d:${d0 + i * 90}ms"><span class="tx2">${t}</span><span class="ck lk" style="--d:${d0 + 260 + i * 90}ms">${io(ic || 'refresh', 15)}</span></div>`).join('')}</div>`;
const pips = (full, total = 5, d = 500) => `<div class="pips">${Array.from({ length: total }, (_, i) => `<i class="pop ${i < full ? 'on' : i === full ? 'fill' : ''}" style="--d:${160 + i * 70}ms;--fd:${d}ms"></i>`).join('')}</div>`;
const phr = (en, ru, d = 200) => `<div class="phr a" style="--d:${d}ms"><div class="en">${en}</div><div class="ru">${ru}</div></div>`;
const deck = (n) => `<div class="deck"><i style="--rot:-12deg;--tx2:-26px;--d:160ms"></i><i style="--rot:10deg;--tx2:26px;--d:240ms"></i><i style="--rot:0deg;--d:320ms">${n}</i></div>`;

/* ── шаблоны: id · имя · группа · статус · когда · данные · кадр ──
   зачем (владелец 11.11: «история показывает просто букву i и всё» → «Нарисовать макет»): состояния Главной ушли в истории (решение 11.11),
   но рисовались одной заглушкой — значок «i» и заголовок. Здесь у каждого состояния свой кадр: арт по смыслу, заголовок — тот же, что был
   у сцены Главной (home_scene_copy / home_scene_special_copy), и кнопка, которая вела с этой сцены. Числа и имена — пример. */
const TPL = [
  { id: 'day_done', name: 'День засчитан', group: 'День', kind: 'new', ev: 'home_activity · day_done', when: 'взамен заглушки «i» · сегодня уже было занятие', data: 'streak, week[7], nextTitle', motion: 'дни недели встают по одному, сегодняшний отмечается последним',
    cta: { label: 'Ещё эпизод', icon: 'play' },
    render: () => `<div class="cal7" style="margin:0 0 22px">${DAYS.map((d, i) => `<div class="c ${i < 5 ? 'on' : ''} pop" style="--d:${160 + i * 80}ms">${d}${io('check', 16)}</div>`).join('')}</div><div class="ov a" style="--d:760ms">Серия 5 дней</div><div class="h1">${words('День засчитан', 840)}</div><div class="p a" style="--d:1060ms">Дальше: планы на выходные</div>` },

  { id: 'streak_risk', name: 'Серия под угрозой', group: 'День', kind: 'new', ev: 'home_activity · streak_risk', when: 'взамен заглушки «i» · вечер, занятия сегодня не было', data: 'streak, minutesToMidnight', motion: 'пламя появляется и горит, заголовок встаёт по словам',
    cta: { label: 'Начать', icon: 'play' },
    render: () => `<div class="art">${flame(12)}</div><div class="ov a" style="--d:420ms">До полуночи 2 ч 14 мин</div><div class="h1 s">${words('Одно занятие — и серия спасена', 500)}</div>` },

  { id: 'no_energy', name: 'Нет энергии', group: 'День', kind: 'new', ev: 'home_activity · no_energy', when: 'взамен заглушки «i» · энергия закончилась', data: 'energy, energyMax, minutesToNext', motion: 'пять делений встают по одному, первое медленно наполняется',
    cta: { label: 'Повторить карточки', icon: 'layers' },
    render: () => `${pips(0, 5, 620)}<div class="ov a" style="--d:560ms">Энергия 0 из 5</div><div class="h1 s">${words('Энергия вернётся через 18 мин', 640)}</div><div class="p a" style="--d:980ms">Пока можно заниматься без энергии</div>` },

  { id: 'streak_lost', name: 'Серия прервалась', group: 'День', kind: 'new', ev: 'home_activity · streak_lost', when: 'взамен заглушки «i» · вчера занятия не было, серия обнулилась', data: 'lostStreak', motion: 'контур погасшего пламени появляется, заголовок встаёт по словам',
    cta: { label: 'Начать', icon: 'play' },
    render: () => `<div class="art">${flame(0).replace('class="flame pop"', 'class="flame out pop"')}</div><div class="ov a" style="--d:420ms">Было 12 дней</div><div class="h1">${words('Серия прервалась', 500)}</div><div class="p a" style="--d:780ms">Не беда — одно занятие, и начинаем новую</div>` },

  { id: 'exam_ready', name: 'Экзамен готов', group: 'День', kind: 'new', ev: 'home_activity · exam_ready', when: 'взамен заглушки «i» · все уроки главы пройдены', data: 'chapter, questions', motion: 'кольцо замыкается, число вопросов досчитывается',
    cta: { label: 'Сдать экзамен', icon: 'school' },
    render: () => `<div class="art">${ring(1, `${cnt(12, 400, 900)}<span>вопросов</span>`)}</div><div class="h1 s">${words('Экзамен главы на старте', 760)}</div><div class="p a" style="--d:1040ms">Проверим, что осело в голове?</div>` },

  { id: 'all_done', name: 'Всё пройдено', group: 'День', kind: 'new', ev: 'home_activity · all_done', when: 'взамен заглушки «i» · доступные эпизоды закончились', data: 'нет', motion: 'знак появляется, заголовок встаёт по словам',
    cta: { label: 'Повторить карточки', icon: 'layers' },
    render: () => `<div class="art">${icn('rocket')}</div><div class="h1 s">${words('Новые эпизоды уже в пути', 380)}</div><div class="p a" style="--d:700ms">А пока — освежим пройденное?</div>` },

  { id: 'offline', name: 'Нет сети', group: 'День', kind: 'new', ev: 'home_activity · offline', when: 'взамен заглушки «i» · телефон без интернета', data: 'нет', motion: 'знак появляется, две строки отмечаются по очереди',
    render: () => `<div class="art">${icn('earth')}</div><div class="h1 s">${words('Интернет ушёл погулять', 380)}</div><div class="list rws">${[['Занятия'], ['Карточки']].map(([t], i) => `<div class="r a" style="--d:${700 + i * 90}ms"><span class="tx2">${t}</span><span class="ck" style="--d:${960 + i * 90}ms">${io('check', 15)}</span></div>`).join('')}</div><div class="p a" style="--d:1000ms">Работают и без него</div>` },

  { id: 'mistakes_pile', name: 'Накопились ошибки', group: 'Ошибки', kind: 'new', ev: 'home_activity · special:mistakes_pile', when: 'взамен заглушки «i» · в «Моих ошибках» накопились неразобранные', data: 'mistakesOpen, sample[3]', motion: 'три фразы встают по очереди, заголовок по словам',
    cta: { label: 'Разобрать', icon: 'list' },
    render: () => `${rows([['I have went there'], ['She don’t know'], ['He go to work']], 200)}<div class="ov a" style="--d:760ms">Мои ошибки</div><div class="h1 s">${words('Накопилось 7 ошибок', 840)}</div><div class="p a" style="--d:1100ms">Разберём парочку? Это быстрее, чем кажется</div>` },

  { id: 'mistake_poke', name: 'Ошибка повторилась', group: 'Ошибки', kind: 'new', ev: 'home_activity · special:mistake_poke', when: 'взамен заглушки «i» · та же фраза ошибочно два раза и больше', data: 'phrase, wrong, right, times', motion: 'карточка фразы встаёт, неверное слово зачёркнуто, верное рядом',
    cta: { label: 'Исправить', icon: 'refresh' },
    render: () => `${phr('I <s>have went</s> <b>went</b> there yesterday', 'Я ходил туда вчера')}<div class="ov a" style="--d:560ms">Ошибка из твоего списка</div><div class="h1 s">${words('Серьёзно? Снова эта фраза', 640)}</div><div class="chip a" style="--d:980ms">${io('repeat', 15)}3 раза</div>` },

  { id: 'mistake_mastered', name: 'Ошибка выучена', group: 'Ошибки', kind: 'new', ev: 'home_activity · special:mistake_mastered', when: 'взамен заглушки «i» · фраза из «Моих ошибок» отвечена верно нужное число раз', data: 'phrase, translation', motion: 'карточка фразы встаёт, конфетти один раз',
    render: () => `${confetti(16, 620)}${phr('I <b>went</b> there yesterday', 'Я ходил туда вчера')}<div class="ov a" style="--d:560ms">Мои ошибки</div><div class="h1">${words('Выучено!', 640)}</div>` },

  { id: 'words_due', name: 'Пора повторить', group: 'Карточки', kind: 'new', ev: 'home_activity · special:words_due', when: 'взамен заглушки «i» · у карточек подошёл срок повтора', data: 'dueCount', motion: 'три карточки раскрываются веером, на верхней число',
    cta: { label: 'Повторить', icon: 'layers' },
    render: () => `<div class="art">${deck(12)}</div><div class="h1 s">${words('12 слов вот-вот сбегут из памяти', 520)}</div><div class="p a" style="--d:940ms">Две минуты — и поймаем</div>` },

  { id: 'friend_nudge', name: 'Друг уже занимался', group: 'Друзья', kind: 'new', ev: 'home_activity · special:friend_nudge', when: 'взамен заглушки «i» · друг сегодня занимался, ты ещё нет', data: 'friendName, friendRank', motion: 'монета друга появляется с отметкой, твоя рядом приглушена',
    cta: { label: 'Догнать', icon: 'flash' },
    render: () => `<div class="art"><div class="duo"><div class="fr pop" style="--d:120ms">${coin(8, 108)}<span class="bdg pop" style="--d:520ms">${io('check', 16)}</span></div><div class="me pop" style="--d:260ms">${coin(5, 72)}</div></div></div><div class="ov a" style="--d:620ms">Друзья</div><div class="h1 s">${words('Лена сегодня уже в деле', 700)}</div><div class="p a" style="--d:1000ms">Догонишь?</div>` },

  { id: 'personal_best', name: 'Личный рекорд', group: 'Про тебя', kind: 'new', ev: 'home_activity · special:personal_best', when: 'взамен заглушки «i» · серия подошла к личному рекорду', data: 'streak, bestStreak', motion: 'кольцо заполняется до доли рекорда, число досчитывается',
    cta: { label: 'Продолжить', icon: 'play' },
    render: () => `<div class="art">${ring(12 / 15, `${cnt(12, 400, 900)}<span>из 15</span>`)}</div><div class="ov a" style="--d:760ms">Про тебя</div><div class="h1 s">${words('Твой рекорд серии — 15 дней', 840)}</div><div class="p a" style="--d:1180ms">Побьёшь?</div>` },

  { id: 'fun_stats', name: 'Про тебя', group: 'Про тебя', kind: 'new', ev: 'home_activity · special:fun_stats', when: 'взамен заглушки «i» · день засчитан, есть чем похвастаться', data: 'phrasesLearned', motion: 'число досчитывается, заголовок встаёт по словам',
    cta: { label: 'Моя статистика', icon: 'barChart' },
    render: () => `<div class="big m a" style="--d:200ms">${cnt(186, 300, 1100)}</div><div class="ov a" style="--d:620ms">фраз выучено</div><div class="h1 s">${words('Целый разговорник в кармане', 700)}</div>` },

  { id: 'milestone', name: 'Новый рубеж', group: 'Про тебя', kind: 'new', ev: 'home_activity · special:milestone', when: 'взамен заглушки «i» · круглое число фраз или уроков', data: 'kind, value', motion: 'число досчитывается, конфетти один раз',
    cta: { label: 'Посмотреть', icon: 'barChart' },
    render: () => `${confetti(18, 900)}<div class="big a" style="--d:200ms">${cnt(100, 300, 1000)}</div><div class="ov a" style="--d:700ms">Новый рубеж · фразы</div><div class="h1 s">${words('Это уже настоящий разговорник', 780)}</div>` },

  { id: 'holiday', name: 'Праздник', group: 'Праздник', kind: 'new', ev: 'home_activity · special:holiday', when: 'взамен заглушки «i» · в сам день праздника', data: 'holidayId', motion: 'знак появляется, заголовок встаёт по словам',
    cta: { label: 'Начать', icon: 'play' },
    render: () => `<div class="art">${icn('snow')}</div><div class="ov a" style="--d:380ms">Новый год</div><div class="h1 s">${words('Новый год — новые фразы', 460)}</div>` },
];
