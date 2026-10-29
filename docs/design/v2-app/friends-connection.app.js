/* friends-connection.app.js — «Друзья: связь по всем разделам» на РЕАЛЬНЫХ кадрах приложения (каркас real-frame.js): пять блоков поверх
   настоящих экранов — «друг сделал» на сценах, приглашение с наградой, команда, «друзья смотрят», «Избранное» видео.
   зачем (координатор 28.10–29.10, слово владельца): «только экраны, как они ДЕЙСТВИТЕЛЬНО выглядят в приложении» — основа каждого
   телефона = кадр Сверки без изменений, новое рисуется поверх или вставляется ломтём (низ кадра сдвигается, как при настоящей вставке);
   решения владельца: награда за друга — 500 монет обоим после его первого урока; «друзья смотрят» — только подтверждённым друзьям,
   с выключателем. Первая версия — «Затмение» тёмное (кадры graphite); другие темы — по кадрам Сверки. Журнал — [FR]. */
(() => {
const LOG = '[FR]'; const RF = window.RF; const THEMES = window.__THEMES || {}; const T = (THEMES.graphite || {}).dark;
if (!RF || !T) { console.log(LOG, 'нет каркаса или токенов темы', JSON.stringify({ rf: !!RF, theme: !!T })); return; }
const FRAMES = new Set(window.__FRAMES || []); const DIR = 'assets/real/';
const F = { friends: 'now_friends_top_graphite_dark.png', video: 'now_video_graphite_dark.png', cards: 'now_cards_graphite_dark.png', season: 'scene_season_graphite_dark.png', peak: 'scene_peak_graphite_dark.png' };
const have = (k) => FRAMES.has(F[k]);
const CODE = Object.assign({ people: 'f49f', 'people-outline': 'f4a3', 'chevron-forward': 'f23b', 'chevron-back': 'f229', checkmark: 'f21d', 'checkmark-circle': 'f21e', play: 'f4c6', bookmark: 'f1a8', 'bookmark-outline': 'f1a9', 'hand-left': 'f35b', 'share-outline': 'f572', 'person-add': 'f4a6', gift: 'f337', 'eye-outline': 'f2ea', 'shield-checkmark': 'f578', flag: 'f310', 'link-outline': 'f3b9', 'rocket-outline': 'f548', medal: 'f445', 'film-outline': 'f2ff', 'trophy-outline': 'f602', 'paper-plane-outline': 'f48e', 'time-outline': 'f5de', close: 'f24a', flame: 'f313', 'add-circle-outline': 'f105', 'copy-outline': 'f290', 'search-outline': 'f55b', sparkles: 'f58c', 'eye-off-outline': 'f2e9' }, window.__ICODE || {});
const io = (n, st = '') => { const c = CODE[n]; if (!c) throw new Error(`${LOG} нет значка ${n}`); return `<i class="io" aria-hidden="true"${st ? ` style="${st}"` : ''}>&#x${c};</i>`; };
const coin = (r) => `assets/coin_rank_${String(r).padStart(2, '0')}.webp`;
const ci = (r, s) => `<img class="fr-coin" src="${coin(r)}" alt="" style="width:${s}px;height:${s}px">`;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const after = (ms, f) => setTimeout(f, RM() ? 0 : ms);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const once = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); node.addEventListener('animationend', () => node.classList.remove(cls), { once: true }); };
const VARS = `--card:${T.opaqueCard};--ctl:${T.opaqueControl};--tx:${T.text};--sec:${T.secondary};--acc:${T.accentText};--solid:${T.cta};--on-solid:${T.ctaInk};--bg:${T.bg}`;
const STATUS = 100; const TAB = 2140;
/* телефон на кадре; вставка ломтём: insOn — новый блок на фоне того же кадра (полоса кадра под ним), чтобы сцена не рвалась */
const phone = (key, o = {}) => RF.phone(Object.assign({ src: DIR + F[key], exists: have(key), cls: 'fr-ph', status: STATUS, tab: TAB }, o)).replace('<div class="ph rf', `<div style="${VARS}" class="ph rf`).replace('кадр не снят', 'кадр снимается');
/* вставка ломтём: фон блока — растянутая ЧИСТАЯ полоска кадра (4 px над местом вставки), а не кусок кадра с его содержимым (иначе под блоком
   повторяются вкладки/подписи); поверх сцены (Сезон, Пик) блок не вставляем, а кладём сверху (overlay), чтобы башня и обложка не рвались */
const insOn = (key, y, h, html, strip = y - 6) => { const sliceH = Math.max(1, RF.px(4)); return { y, html: `<div class="fr-ins" style="position:relative;height:${RF.px(h)}px;overflow:hidden"><div style="transform:scaleY(${(RF.px(h) / sliceH).toFixed(2)});transform-origin:top">${RF.slice(DIR + F[key], strip, strip + 4)}</div><div class="fr-ins-over">${html}</div></div>` }; };
// top — от верха тела телефона: его верхний отступ равен ломтю статус-бара, поэтому координата кадра переводится напрямую (px(y)), без вычета
const over = (y, h, html, x = 20, w = 430 - 40) => `<div class="fr-ins-over" style="top:${RF.px(y)}px;height:${RF.px(h)}px;left:${x}px;width:${w}px;padding:0">${html}</div>`;
const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;

/* ═════ общие детали в стиле приложения ═════ */
const evRow = (who, rank, did, mine) => `<div class="fr-ev t" data-act="friend:${who}">${ci(rank, 30)}<span class="tx"><b>${who} ${did}</b><small>${mine}</small></span>${io('chevron-forward')}</div>`;
const panel = (title, right, inner) => `<div class="fr-panel"><div class="hd"><b>${title}</b><span>${right}</span></div>${inner}</div>`;
const row = (ic, title, sub, right, act = '') => `<div class="fr-row t"${act ? ` data-act="${act}"` : ''}><span class="ic">${ic}</span><span class="tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="rt">${right}</span></div>`;
const btn = (label, cls = 'solid', act = '', ic = '') => `<span class="fr-btn ${cls} t"${act ? ` data-act="${act}"` : ''}>${ic ? io(ic) : ''}${label}</span>`;
const sheet = (title, inner) => `<div class="fr-sheet"><div class="grab"></div><div class="hd"><b>${title}</b><span class="x t" data-act="close">${io('close')}</span></div>${inner}</div>`;

/* ═════ 1 · «Друг сделал» — та же стеклянная строка, что на Главной, на сцене каждого раздела ═════ */
const EV = { season: ['Аня', 12, 'прошла урок 2', 'Твой ход: урок 2 · 15 мин'], peak: ['Марк', 9, 'на этаже 2', 'Догони: 3 ступени'], video: ['Аня', 12, 'посмотрела «Дело в контексте»', 'Посмотри и обсуди — 12 фраз'], cards: ['Лидия', 1, 'повторила 30 карточек', 'Повтори свои — 6 ждут'] };
const evInsert = (key, y, strip) => { const [who, rank, did, mine] = EV[key]; return insOn(key, y, 150, evRow(who, rank, did, mine), strip); };
const evOver = (key, y, x, w) => { const [who, rank, did, mine] = EV[key]; return over(y, 150, evRow(who, rank, did, mine), x, w); };
const friendSheet = (who) => sheet(`${who}`, `<div class="fr-person">${ci(who === 'Марк' ? 9 : who === 'Лидия' ? 1 : 12, 56)}<div><b>${who}</b><small>Серия 7 дней · этаж 2 · сегодня онлайн</small></div></div><div class="fr-acts"><span class="fr-btn tonal t" data-act="five">${io('hand-left')}Дать пять</span><span class="fr-btn tonal t" data-act="call">${io('rocket-outline')}Позвать</span><span class="fr-btn solid t" data-act="duo">${io('people')}Вдвоём</span></div><p class="fr-note">Что видит друг: твою серию, этаж и что ты прошёл сегодня. Личные ответы — нет.</p>`);
const s1 = () => [
  col('Уроки · обложка', phone('season', { overlays: evOver('season', 950, 20, 390) })), // под строкой «Фотовыставка», внутри обложки
  col('Пик', phone('peak', { overlays: evOver('peak', 1440, 16, 218) })), // левая колонка под «Все участники», башня справа не тронута
  col('Видео', phone('video', { inserts: [evInsert('video', 470, 464)] })), // между «Professor Lingman» и вкладками
  col('Карточки', phone('cards', { inserts: [evInsert('cards', 500, 560)] })), // под подзаголовком «Слова и фразы», над большой карточкой
];

/* ═════ 2 · Пригласить друга — на пустой вкладке «Друзья», награда очевидна ═════ */
const CODE_TXT = 'PHRASE-7K2Q';
const inviteBlock = () => `<div class="fr-empty"><span class="fr-empty-ic">${io('people-outline')}</span><b>Учиться вместе приятнее</b><p>Пригласи друга — <b>500 монет</b> вам обоим, как только он пройдёт первый урок.</p><div class="fr-code t" data-act="copy"><span>${CODE_TXT}</span>${io('copy-outline')}</div>${btn('Поделиться кодом', 'solid', 'open:share', 'share-outline')}${btn('Найти по имени', 'tonal', 'toast:Поиск по имени — как сейчас', 'search-outline')}</div>`;
const shareSheet = () => sheet('Приглашение', `<div class="fr-gift">${row(io('gift'), 'Тебе — 500 монет', 'Когда друг пройдёт первый урок', '')}${row(io('gift'), 'Другу — 500 монет', 'И первый урок без замков', '')}${row(io('time-outline'), 'Код действует 30 дней', 'Можно звать нескольких друзей', '')}</div><div class="fr-code big t" data-act="copy"><span>${CODE_TXT}</span>${io('copy-outline')}</div>${btn('Поделиться', 'solid', 'share', 'paper-plane-outline')}`);
const FRIENDS_CUT = [930, 1540]; // пустое состояние на кадре: значок, заголовок, подпись, кнопка «Добавить друга»
const s2 = () => [
  col('Сейчас · вкладка «Друзья»', phone('friends')),
  col('Как будет · награда и код на месте пустого состояния', phone('friends', { cut: FRIENDS_CUT, inserts: [{ y: FRIENDS_CUT[0], html: inviteBlock() }] })),
  col('Шторка «Приглашение» · открывается по «Поделиться кодом»', phone('friends', { cut: FRIENDS_CUT, inserts: [{ y: FRIENDS_CUT[0], html: inviteBlock() }] }).replace('data-ph="fr-ph"', 'data-ph="fr-ph" data-open="share"')),
];

/* ═════ 3 · Команда — собрать, создать, цель недели, рейтинг ═════ */
const teamCard = () => `<div class="fr-team-cta t" data-act="open:team">${io('trophy-outline')}<span class="tx"><b>Собери команду</b><small>Цель недели вместе · рейтинг команд</small></span>${io('chevron-forward')}</div>`;
const EMB = ['rocket-outline', 'flame', 'flag', 'sparkles'];
const teamSheet = () => sheet('Новая команда', `<div class="fr-field"><small>Название</small><b>Утренние</b></div><div class="fr-emb">${EMB.map((e, i) => `<span class="t${i === 0 ? ' on' : ''}" data-act="emb">${io(e)}</span>`).join('')}</div><p class="fr-note">До 10 человек. Очки недели складываются; цель — 500.</p>${btn('Создать', 'solid', 'go:team', 'checkmark')}`);
const MEMBERS = [['Ты', 5, 180], ['Аня', 12, 120], ['Марк', 9, 60]];
const RANK = [['Полиглоты', 1240], ['Утренние', 360], ['Кофе и фразы', 300]];
const teamScreen = () => `<div class="fr-screen"><div class="fr-top"><span class="fr-back t" data-act="back">${io('chevron-back')}</span><b>Команда</b></div><div class="fr-team-hd">${io('rocket-outline', 'font-size:34px')}<div><b>Утренние</b><small>3 из 10 · неделя 2</small></div></div>${panel('Цель недели', '<span data-count="360">0</span> из 500', `<div class="fr-goal"><i style="width:72%"></i></div><small class="fr-sub">Осталось 140 очков · 3 дня</small>`)}${panel('Участники', '3', MEMBERS.map(([n, r, p]) => row(ci(r, 34), n, '', `${p}`)).join(''))}${panel('Рейтинг команд', 'неделя', RANK.map(([n, p], i) => row(`<b class="pl">${i + 1}</b>`, n, '', `${p}`)).join(''))}${btn('Позвать в команду', 'solid', 'toast:Приглашение в команду отправлено', 'person-add')}</div>`;
const s3 = () => [
  col('Собрать · карточка под приглашением', phone('friends', { cut: FRIENDS_CUT, inserts: [{ y: FRIENDS_CUT[0], html: inviteBlock() + teamCard() }] })),
  col('Создать · шторка', phone('friends', { cut: FRIENDS_CUT, inserts: [{ y: FRIENDS_CUT[0], html: inviteBlock() + teamCard() }] }).replace('data-ph="fr-ph"', 'data-ph="fr-ph" data-open="team"')),
  col('Экран команды · после «Создать»', phone('friends', { cut: [STATUS, TAB], inserts: [{ y: STATUS, html: teamScreen() }] })),
];

/* ═════ 4 · «Друзья смотрят» — в Видео; только подтверждённым друзьям, с выключателем ═════ */
const WATCH = [['Аня', 12, '«Дело в контексте»', '12 мин сегодня'], ['Марк', 9, '«Твоя или моя?»', '40 мин за неделю'], ['Лидия', 1, '«Говори целыми фразами»', '8 мин сегодня']];
const watchPanel = () => panel('Друзья смотрят', `<span class="t" data-act="open:watch">Все ${io('chevron-forward')}</span>`, WATCH.slice(0, 2).map(([n, r, v, m]) => row(ci(r, 34), `${n} · ${v}`, m, io('play', 'color:var(--sec)'))).join(''));
const watchSheet = () => sheet('Друзья смотрят', `<div class="fr-toggle-row"><span class="tx"><b>Друзья видят мои просмотры</b><small>Только подтверждённые друзья. Выключишь — не увидишь и их.</small></span><span class="fr-toggle on t" data-act="toggle"><i></i></span></div>${WATCH.map(([n, r, v, m]) => row(ci(r, 34), `${n} · ${v}`, m, io('play', 'color:var(--sec)'))).join('')}<p class="fr-note">Минуты считаются по всем роликам, названия — только последних.</p>`);
const s4 = () => [
  col('Сейчас · вкладка «Видео»', phone('video')),
  col('Как будет · панель под вкладками', phone('video', { inserts: [insOn('video', 640, 470, watchPanel(), 634)] })),
  col('Шторка «Друзья смотрят» · с выключателем', phone('video', { inserts: [insOn('video', 640, 470, watchPanel(), 634)] }).replace('data-ph="fr-ph"', 'data-ph="fr-ph" data-open="watch"')),
];

/* ═════ 5 · «Избранное» для видео — свой вход и экран ═════ */
const VIDS = [['«Я видел этот фильм» — почему здесь ДВА английских', '53:09', 12], ['Что нужно понять в английском, чтобы не…', '1:08:41', 8], ['Самый простой путь понять английский', '2:16:02', 20], ['С нуля до ПЕРВОГО разговора', '47:52', 14], ['Методика изучения английского, которую у…', '2:30:10', 11], ['Я бы только эти фразы и учил', '4:56:16', 9], ['Говори целыми фразами', '1:11:40', 10]];
const favEntry = () => `<div class="fr-fav-entry t" data-act="go:fav">${io('bookmark')}<span class="tx"><b>Избранное</b><small>7 роликов · 84 фразы</small></span>${io('chevron-forward')}</div>`;
const favScreen = () => `<div class="fr-screen"><div class="fr-top"><span class="fr-back t" data-act="back">${io('chevron-back')}</span><b>Избранное</b></div><div class="fr-fav-hd"><b>7 роликов</b><small>84 фразы сохранены</small>${btn('Смотреть подряд', 'solid', 'toast:Открыли плеер · 7 роликов', 'play')}</div>${VIDS.map(([t, d, n], i) => `<div class="fr-vid t"><span class="th">${d}</span><span class="tx"><b>${t}</b><small>${n} фраз${i === 0 ? ` · ${ci(12, 14)} Аня тоже` : ''}</small></span><span class="bm on t" data-act="save">${io('bookmark')}</span></div>`).join('')}</div>`;
const s5 = () => [
  col('Как будет · вход с вкладки «Видео»', phone('video', { inserts: [insOn('video', 470, 150, favEntry(), 464)] })),
  col('Экран «Избранное»', phone('video', { cut: [STATUS, TAB], inserts: [{ y: STATUS, html: favScreen() }] })),
];

/* ═════ разделы и стоимость Firebase (для координатора) ═════ */
const cost = (rows) => `<div class="fr-cost">${rows.map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('')}</div>`;
const SECTIONS = [
  ['s1', '1 · «Друг сделал» — на сцене каждого раздела', 'Та же стеклянная строка, что уже есть на Главной: монета друга, что сделал, что делать мне. Тап — шторка друга: дать пять, позвать, вдвоём. Вставлена ломтём на настоящий кадр — всё ниже сдвинулось, как при настоящей вставке.', s1,
    [['Чтения', '0 новых — события друзей уже приходят в снимке «Вместе» при входе и пушем; строка берёт последнее событие раздела из кэша'], ['Записи', 'нет — события пишет тот, кто их совершил (как сейчас high_five / lesson_invite)'], ['Обновление', 'при входе и по пушу; опроса нет']]],
  ['s2', '2 · Пригласить друга — очевидно, с наградой 500 монет обоим', 'На месте пустого состояния вкладки «Друзья»: награда словами, код, одна главная кнопка. Шторка — три строки: что получит каждый и когда. «Поделиться» открывает системный лист.', s2,
    [['Чтения', '0 — код уже в кэше (referral_system), состояние награды — в снимке профиля при входе'], ['Записи', '0 с телефона; 500 монет обоим начисляет серверная функция по событию первого урока друга (как реферальные ключи)'], ['Решение владельца', '500 монет обоим — после первого урока друга']]],
  ['s3', '3 · Команда — собрать, создать, цель недели, рейтинг', 'Карточка «Собери команду» под приглашением → шторка с названием и эмблемой → экран команды: цель недели заполняется, участники и рейтинг команд ниже.', s3,
    [['Чтения', '1 документ teams/{teamId} при входе + 1 документ team_rank/{неделя} с топ-100 и местом команды — раз в 6 ч, не чаще'], ['Записи', 'очки — батчем раз в день в teams/{teamId}.members.{uid}; рейтинг считает функция по расписанию раз в час'], ['Контракт', 'новая коллекция — на утверждение; без подписок и чтения по участнику']]],
  ['s4', '4 · «Друзья смотрят» — в Видео, только подтверждённым друзьям, с выключателем', 'Панель под вкладками: кто из друзей что смотрит и сколько. Шторка со всеми и выключатель «Друзья видят мои просмотры» — выключил себе, не видишь и других.', s4,
    [['Чтения', '1 документ watch_feed/{uid} при входе — агрегат по друзьям (последний ролик, минуты сегодня и за неделю; ≤ 20 друзей)'], ['Записи', 'минуты просмотра телефон уже копит (premium_theme_video_watch) — одна запись в день, функция раз в час собирает агрегаты'], ['Приватность', 'видно только подтверждённым друзьям; выключатель — в шторке и в настройках (решение владельца)']]],
  ['s5', '5 · «Избранное» для видео', 'Отдельный вход с вкладки «Видео» и свой экран: сохранённые ролики, фразы из них, «Смотреть подряд». Закладка на карточке — как сейчас, мгновенно.', s5,
    [['Чтения', '0 — список закладок уже в локальном сторе (use_video_favorites), счётчики — как сейчас'], ['Записи', 'как сейчас: закладка едет в профиль батчем'], ['Нового в базе', 'нет']]],
];
const section = ([id, title, lead, fn, costs]) => `<section class="block" id="${id}"><h2>${title}</h2><p>${lead}</p>${cost(costs)}<div class="phones">${fn().join('')}</div></section>`;

/* ═════ действия: мгновенный отклик (Optimistic UI), сеть догоняет ═════ */
const SHEETS = { share: shareSheet, team: teamSheet, watch: watchSheet };
const openSheet = (ph, key) => { const old = ph.querySelector('.fr-ov'); if (old) old.remove(); const ov = el(`<div class="fr-ov"><div class="dim" data-act="close"></div>${SHEETS[key]()}</div>`); ph.appendChild(ov); requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('on'))); };
const closeSheet = (ph) => { const ov = ph.querySelector('.fr-ov'); if (!ov || ov.classList.contains('off')) return; ov.classList.remove('on'); ov.classList.add('off'); after(340, () => ov.remove()); };
const toast = (ph, text, icon = 'checkmark-circle') => { const t = el(`<div class="fr-toast"><span class="tile">${io(icon)}</span>${text}</div>`); ph.appendChild(t); after(2200, () => { t.classList.add('off'); after(300, () => t.remove()); }); };
const countUp = (node) => { const to = Number(node.dataset.count); if (RM()) { node.textContent = to; return; } const t0 = performance.now(); const tick = (now) => { const p = Math.min(1, (now - t0) / 800); node.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
const SCREENS = { team: teamScreen, fav: favScreen };
// push/pop: содержимое прокрутки телефона подменяется новым экраном (статус-бар и таббар — те же ломти кадра), прежнее хранится в стопке
const push = (ph, key) => { const body = ph.querySelector('.rf-body'); const scr = ph.querySelector('.rf-scr'); ph.__stack = ph.__stack || []; ph.__stack.push(body.innerHTML); body.classList.add('fr-slide-out'); after(200, () => { body.innerHTML = SCREENS[key](); body.classList.remove('fr-slide-out'); body.classList.add('fr-slide-in'); scr.scrollTop = 0; after(360, () => { body.classList.remove('fr-slide-in'); const g = body.querySelector('.fr-goal'); if (g) g.classList.add('on'); body.querySelectorAll('[data-count]').forEach(countUp); }); }); };
const pop = (ph) => { const body = ph.querySelector('.rf-body'); const prev = ph.__stack && ph.__stack.pop(); if (!prev) return; body.classList.add('fr-slide-back'); after(200, () => { body.innerHTML = prev; body.classList.remove('fr-slide-back'); }); };
const act = (ph, node) => {
  const [name, arg] = node.dataset.act.split(':');
  console.log(LOG, 'act', name, arg || ''); // guard-ok: одна строка на тап
  if (name === 'open') { openSheet(ph, arg); return; }
  if (name === 'close') { closeSheet(ph); return; }
  if (name === 'friend') { openSheet(ph, 'friend'); return; }
  if (name === 'copy') { once(node, 'pop'); toast(ph, 'Код скопирован', 'link-outline'); return; }
  if (name === 'share') { closeSheet(ph); after(380, () => toast(ph, 'Приглашение отправлено', 'paper-plane-outline')); return; }
  if (name === 'five' || name === 'call' || name === 'duo') { closeSheet(ph); after(380, () => toast(ph, name === 'five' ? 'Дал пять' : name === 'call' ? 'Позвал' : 'Предложил заниматься вдвоём', name === 'five' ? 'hand-left' : name === 'call' ? 'rocket-outline' : 'people')); return; }
  if (name === 'emb') { node.parentElement.querySelectorAll('span').forEach((s) => s.classList.toggle('on', s === node)); once(node, 'pop'); return; }
  if (name === 'go') { closeSheet(ph); after(260, () => push(ph, arg)); return; }
  if (name === 'back') { pop(ph); return; }
  if (name === 'toggle') { const on = node.classList.toggle('on'); const sub = node.parentElement.querySelector('small'); if (sub) sub.textContent = on ? 'Только подтверждённые друзья. Выключишь — не увидишь и их.' : 'Выключено: друзья не видят твои просмотры, и ты не видишь их.'; return; }
  if (name === 'save') { const on = node.classList.toggle('on'); node.innerHTML = io(on ? 'bookmark' : 'bookmark-outline'); once(node, 'pop'); return; }
  if (name === 'toast') { toast(ph, arg, 'checkmark-circle'); return; }
  return undefined;
};
SHEETS.friend = () => friendSheet('Аня');
document.body.addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); const ph = a && a.closest('.ph'); if (a && ph) act(ph, a); });
const render = () => {
  const root = document.getElementById('root'); root.innerHTML = SECTIONS.map(section).join('');
  document.querySelectorAll('.ph[data-open]').forEach((ph) => after(700, () => openSheet(ph, ph.dataset.open)));
  console.log(LOG, 'render', JSON.stringify({ frames: Object.fromEntries(Object.keys(F).map((k) => [k, have(k)])), phones: document.querySelectorAll('.ph').length })); // guard-ok: одна строка на отрисовку
};
render();
window.__fr = { render, F, have };
})();
