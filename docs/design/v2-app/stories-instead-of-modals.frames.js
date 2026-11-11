/* ── помощники кадров «истории вместо окон» ── */
const icn = (n, d = 120) => `<div class="icn pop" style="--d:${d}ms">${io(n, 58)}</div>`;
const rows = (items, d0 = 760) => `<div class="list rws">${items.map(([t, ic], i) => `<div class="r a" style="--d:${d0 + i * 90}ms"><span class="tx2">${t}</span><span class="ck ${ic === 'lock' ? 'lk' : ''}" style="--d:${d0 + 260 + i * 90}ms">${io(ic || 'check', 15)}</span></div>`).join('')}</div>`;
const coinRain = (n = 9) => `<div class="rain">${Array.from({ length: n }, (_, i) => `<span style="--x:${8 + ((i * 37) % 84)}%;--s:${26 + (i % 3) * 8}px;--t:${1500 + (i % 4) * 260}ms;--d:${200 + i * 110}ms;--r:${(i % 2 ? 1 : -1) * (160 + i * 23)}deg;position:absolute;left:0;top:0;width:100%;height:100%">${coin(5, 26 + (i % 3) * 8, '', `position:absolute;left:var(--x);top:-70px;animation:stRain var(--t) cubic-bezier(.4,0,1,1) both;animation-delay:var(--d)`)}</span>`).join('')}</div>`;
const pbig = (d = 160, cls = '') => `<span class="pmark inl pbig pop ${cls}" style="--d:${d}ms"><i>✦</i></span>`;

/* ── шаблоны: id · имя · группа · статус · когда · данные · кадр ──
   зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»): каждый кадр заменяет одно
   всплывающее окно из аудита. Поле when — какое окно заменено и когда кадр попадает в ленту. Данные — пример. */
const TPL = [
  { id: 'hello_new', name: 'Приветствие новичка', group: 'Запуск', kind: 'new', ev: 'welcome_first_day (новое)', when: 'взамен окна-приветствия после онбординга · первый вход нового аккаунта', data: 'coinRank', motion: 'монета появляется и дышит, заголовок встаёт по словам',
    cta: { label: 'Начать первый урок', icon: 'play' },
    render: () => `<div class="art"><div class="pop" style="--d:120ms">${coin(0, 124, 'breathe')}</div></div><div class="ov a" style="--d:380ms">Первый день</div><div class="h1 s">${words('Добро пожаловать в PhraseMan', 460)}</div><div class="p a" style="--d:760ms">Это твоя монета. За каждое занятие приходят монеты, они открывают новые ранги.</div>` },

  { id: 'welcome_back', name: 'С возвращением', group: 'Запуск', kind: 'new', ev: 'welcome_back (есть сигнал, кадра нет)', when: 'взамен окна «С возвращением» · перерыв 7 дней и больше', data: 'daysAway, dueCards, phrasesLearned', motion: 'монета появляется, числа досчитываются',
    cta: { label: 'Повторить карточки', icon: 'layers' },
    render: () => `<div class="art"><div class="pop" style="--d:120ms">${coin(6, 112, 'breathe')}</div></div><div class="ov a" style="--d:380ms">9 дней перерыва</div><div class="h1">${words('С возвращением', 460)}</div><div class="p a" style="--d:640ms">Серия начнётся заново с сегодняшнего занятия.</div>
      <div class="stats"><div class="stt a" style="--d:800ms">${cnt(24, 900, 800)}<span>карточки на повтор</span></div><div class="stt a" style="--d:880ms">${cnt(186, 980, 800)}<span>фраз выучено</span></div></div>` },

  { id: 'legacy_coins', name: 'Бонусы стали монетами', group: 'Запуск', kind: 'new', ev: 'legacy_bonus_converted (новое)', when: 'взамен окна «Встречайте PhraseMan 2.0» · один раз после пересчёта старых бонусов', data: 'coins, xpBefore, pearlsBefore, spinsBefore', motion: 'монеты падают сверху, сумма досчитывается',
    render: () => `${coinRain(9)}<div class="big m a" style="--d:300ms">${cnt(1240, 500, 1100)}</div><div class="ov a" style="--d:700ms">PhraseMan 2.0</div><div class="h1 s">${words('Бонусы стали монетами', 780)}</div><div class="p a" style="--d:1100ms">Опыт, жемчуг и вращения пересчитаны. Ничего не потеряно.</div>
      <div class="stats"><div class="stt a" style="--d:1250ms"><b>3 100</b><span>опыта было</span></div><div class="stt a" style="--d:1330ms"><b>4</b><span>жемчуга было</span></div></div>` },

  { id: 'rank_enough', name: 'Хватает на ранг', group: 'Монета', kind: 'new', ev: 'coin_rank_enough (новое)', when: 'взамен окна «Хватает на ранг N» · монет стало достаточно для следующего ранга', data: 'rank, nextRank, balance, price', motion: 'монета переворачивается на новый ранг, вокруг расходится свечение',
    cta: { label: 'Улучшить монету', icon: 'trend' },
    render: () => `<div class="art"><div class="flipw"><div class="halo"></div><div class="flip">${coin(4, 120)}${coin(5, 120, 'back')}</div></div></div><div class="ov a" style="--d:500ms">Монета · ранг 4</div><div class="h1">${words('Хватает на ранг 5', 580)}</div><div class="p a" style="--d:800ms">На счёте 2 400 монет. Ранг 5 стоит 2 000.</div><div class="chip a" style="--d:950ms">${io('wallet', 15)}останется 400</div>` },

  { id: 'app_update', name: 'Вышло обновление', group: 'Сообщения', kind: 'new', ev: 'app_update_available (новое)', when: 'взамен окна «Доступно обновление» · в магазине версия новее', data: 'message (текст из настроек, необязателен)', motion: 'знак появляется, заголовок встаёт по словам',
    cta: { label: 'Обновить', icon: 'refresh' },
    render: () => `<div class="art">${icn('rocket')}</div><div class="h1 s">${words('Это Компас. У меня кое-что новое', 380)}</div><div class="p a" style="--d:760ms">Доступна новая версия — быстрее и удобнее.</div>` },

  { id: 'team_msg', name: 'Личное сообщение', group: 'Сообщения', kind: 'new', ev: 'personal_message (новое)', when: 'взамен окна личного сообщения · команда написала этому игроку', data: 'text, sentAt', motion: 'реплика всплывает, как в диалоге',
    cta: { label: 'Ответить', icon: 'chat' },
    render: () => `<div class="bubs"><div class="b a" style="--d:240ms;max-width:100%">Plus на 30 дней уже на аккаунте. Спасибо, что написали про ошибку в уроке 14.</div></div><div class="ov a" style="--d:620ms">Личное сообщение</div><div class="h1">${words('Ответ от команды', 700)}</div><div class="p a" style="--d:940ms">Сегодня, 14:20</div>` },

  { id: 'notif_nudge', name: 'Напоминания выключены', group: 'Сообщения', kind: 'new', ev: 'notif_nudge (новое)', when: 'взамен окна «Включить уведомления» · были пропущенные дни, уведомления выключены', data: 'missedDays, week[7]', motion: 'дни недели встают по одному, пропущенные остаются пустыми',
    cta: { label: 'Включить напоминание', icon: 'time' },
    render: () => `<div class="cal7" style="margin:0 0 22px">${DAYS.map((d, i) => i < 4 ? `<div class="c on pop" style="--d:${160 + i * 80}ms">${d}${io('check', 16)}</div>` : `<div class="c pop" style="--d:${160 + i * 80}ms">${d}${io('check', 16)}</div>`).join('')}</div><div class="ov a" style="--d:760ms">Напоминания выключены</div><div class="h1">${words('3 дня без занятий', 840)}</div><div class="p a" style="--d:1080ms">Одно напоминание в день, в то время, которое выберешь.</div>` },

  { id: 'plus_expired', name: 'Plus закончился', group: 'Plus', kind: 'new', ev: 'plus_expired (новое)', when: 'взамен автоперехода на экран оплаты · подписка истекла', data: 'expiredAt, kind', motion: 'знак Plus гаснет, три возможности закрываются замком',
    cta: { label: 'Вернуть Plus', icon: 'sparkles' },
    render: () => `<div class="art">${pbig(160, 'off')}</div><div class="ov a" style="--d:380ms">До 10 ноября</div><div class="h1">${words('Plus закончился', 460)}</div>${rows([['Защита серии, 3 в месяц', 'lock'], ['Диалоги без счётчика', 'lock'], ['Все уроки курса', 'lock']], 700)}` },

  { id: 'ref_welcome', name: 'Тебя пригласили', group: 'Друзья', kind: 'new', ev: 'referral_welcome (новое)', when: 'взамен реферального окна-приветствия · вход по ссылке друга', data: 'needsCodeEntry', motion: 'знак появляется, заголовок встаёт по словам',
    cta: { label: 'У меня есть код приглашения', icon: 'key' },
    render: () => `<div class="art">${icn('people')}</div><div class="h1">${words('Тебя пригласили', 380)}</div><div class="p a" style="--d:700ms">Тебя позвал друг. Начни учиться — мы рады, что ты с нами.</div>` },

  { id: 'ref_ended', name: 'Доступ можно открыть снова', group: 'Друзья', kind: 'new', ev: 'referral_access_ended (новое)', when: 'взамен окна «Реферальный доступ закончился» на вкладке «Друзья»', data: 'friendName, endedAt', motion: 'знак появляется, текст встаёт по словам',
    cta: { label: 'Пригласить друга', icon: 'personAdd' },
    render: () => `<div class="art">${icn('hourglass')}</div><div class="h1 s">${words('Доступ можно открыть снова', 380)}</div><div class="p a" style="--d:760ms">Всё, что ты открыл — осталось с тобой.</div><div class="p a" style="--d:900ms">Позови ещё друга — и доступ вернётся.</div>` },

  { id: 'perfect_lesson', name: 'Идеальный урок', group: 'Уроки', kind: 'new', ev: 'lesson_perfect (новое)', when: 'взамен окна «Идеальный урок» на итоге · урок пройден без ошибок', data: 'lessonId, total, coins', motion: 'звёзды встают по одной, конфетти один раз',
    render: () => `${confetti(18, 700)}<div class="art"><div class="stars">${[0, 1, 2].map((i) => `<span class="pop" style="--d:${160 + i * 120}ms">${io('star', i === 1 ? 74 : 54, i === 1 ? 'margin-top:-10px' : '')}</span>`).join('')}</div></div><div class="big s a" style="--d:520ms">45<span style="color:var(--sec)">/45</span></div><div class="ov a" style="--d:680ms">Урок 12</div><div class="h1">${words('Без единой ошибки', 760)}</div><div class="chip a" style="--d:1050ms">${coin(5, 20)}+120 монет</div>` },

  { id: 'lesson_open', name: 'Открыт новый урок', group: 'Уроки', kind: 'new', ev: 'lesson_unlocked (новое)', when: 'взамен окна «Новый урок открыт» на итоге · пройден урок, следующий стал доступен', data: 'lessonId, nextLessonId, topic', motion: 'кольцо замыкается, номер урока сменяется',
    cta: { label: 'Начать урок 13', icon: 'play' },
    render: () => `<div class="art">${ring(1, `<div class="lvup"><span class="o">12</span><span class="nw">13</span></div>`)}</div><div class="ov a" style="--d:700ms">Урок 12 пройден</div><div class="h1">${words('Открыт урок 13', 780)}</div><div class="p a" style="--d:1020ms">Тема: планы на выходные.</div>` },

  { id: 'rate_app', name: 'Оценка приложения', group: 'Уроки', kind: 'new', ev: 'review_ask (новое)', when: 'взамен окна «Оцените приложение» на итоге урока · те же условия показа, что сейчас', data: 'context (урок / зачёт / серия), streakDays', motion: 'пять звёзд встают слева направо',
    cta: { label: 'Оценить в Google Play', icon: 'star' },
    render: () => `<div class="art"><div class="stars five">${[0, 1, 2, 3, 4].map((i) => `<span class="pop" style="--d:${160 + i * 90}ms">${io('star', 44)}</span>`).join('')}</div></div><div class="ov a" style="--d:700ms">КСТАТИ, ПРО УРОК</div><div class="h1">${words('100%. Ты вообще оставил уроку шанс?', 780)}</div><div class="p a" style="--d:1060ms">Оставь отзыв о Phraseman в магазине приложений и напиши пару слов. Мы прочитаем всё. Даже если там будет просто «норм».</div>` },

  { id: 'pack_prize', name: 'Приз за набор месяца', group: 'Карточки', kind: 'new', ev: 'community_month_reward (новое)', when: 'взамен окна «Награда сообщества», которое возвращалось при каждом заходе на вкладку', data: 'place, month, coins, top[3]', motion: 'три столбика растут, твой подсвечен',
    cta: { label: 'Забрать 500 монет', icon: 'wallet' },
    render: () => `<div class="art"><div class="podium" style="height:190px">${[[2, 3, 'Ты', 96, true], [1, 8, 'Лена', 130, false], [3, 2, 'Олег', 70, false]].map(([pl, rk, nm, h, me], i) => `<div class="pc ${me ? 'me' : ''}">${coin(rk, 40)}<div class="nm">${nm}</div><div class="bar" style="height:${h}px;--d:${200 + i * 120}ms">${pl}</div></div>`).join('')}</div></div><div class="ov a" style="--d:700ms">Набор месяца за октябрь</div><div class="h1 s">${words('Твой набор на 2-м месте', 780)}</div><div class="p a" style="--d:1100ms">«Фразы для кафе» · сохранений: 214</div>` },

  { id: 'first_dialog', name: 'Первый разговор', group: 'Диалоги', kind: 'new', ev: 'first_dialog_done (новое)', when: 'взамен окна «Первый разговор» в конце первого диалога с ИИ', data: 'studyTarget, turns, goalsDone, goalsTotal', motion: 'знак появляется, заголовок встаёт по словам',
    render: () => `<div class="art">${icn('chats')}</div><div class="ov a" style="--d:380ms">Первый диалог</div><div class="h1 s">${words('Первый разговор по-английски — есть!', 460)}</div><div class="p a" style="--d:900ms">6 реплик · 5 заданий из 5</div>` },

  { id: 'plus_on', name: 'Plus подключён', group: 'Plus', kind: 'new', ev: 'plus_activated (новое)', when: 'взамен праздничного окна после покупки или выдачи Plus', data: 'kind, until', motion: 'знак Plus встаёт, три возможности отмечаются, конфетти один раз',
    render: () => `${confetti(18, 600)}<div class="art">${pbig(160)}</div><div class="ov a" style="--d:380ms">До 11 декабря</div><div class="h1">${words('Plus подключён', 460)}</div>${rows([['Все уроки курса'], ['Диалоги без счётчика'], ['Защита серии, 3 в месяц']], 700)}` },

  { id: 'peak_overtake', name: 'Пик · тебя обошли', group: 'Пик', kind: 'new', ev: 'spire_position_change (новое)', when: 'взамен окон позиции Пика (поднялся, обошли, последний шанс) · до трёх окон подряд', data: 'league, floor, rival, gap, endsAt', motion: 'две полосы растут, полоса соперника длиннее',
    cta: { label: 'Играть на Пике', icon: 'flash' },
    render: () => `<div class="race" style="margin-bottom:24px"><div class="r her"><span class="nm">Марк</span>${coin(8, 36)}<div class="tr"><i style="--p:.86;--d:200ms"></i></div><span class="v">1 240</span></div><div class="r"><span class="nm">Ты</span>${coin(5, 36)}<div class="tr"><i style="--p:.82;--d:320ms"></i></div><span class="v">1 200</span></div></div><div class="ov a" style="--d:900ms">Пик · Гранит</div><div class="h1">${words('Марк обходит тебя', 980)}</div><div class="p a" style="--d:1240ms">Разрыв 40 монет · до конца недели 3 дня</div>` },
];
