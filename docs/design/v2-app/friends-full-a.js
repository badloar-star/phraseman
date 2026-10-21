/* «Друзья» 2.0 — общие куски экранов (по коду приложения) + вход (вкладка, шторка «Вместе», визитка) + идея 1 «Серия вдвоём».
   зачем (координатор 21.10, «строго как на экране»): строка друга, маркеры событий, шторка, визитка, Главная, финал занятия и «Сообщения»
   повторяют размеры и тексты кода (FriendListRow, FriendEventMarker, FriendTogetherSheet, PlayerProfileModal, HomeV2*, HorizonSessionResult). */
(() => {
  'use strict';
  const { gi, P, AV, PAIR, coinImg, art, PH, tabbar, comTabs, sheet, toast, push, pf, skelRows, col, group, idea, add } = FF;

  /* ═════════════ общие куски ═════════════ */
  // строка друга = FriendListRow; подпись по умолчанию — как сейчас в коде («В друзьях»)
  const frow = (p, o = {}) => `<div class="frw t${o.dim ? ' dimr' : ''}">${AV(p, 44, o.av || {})}<div class="cx"><div class="nm">${p.n}</div><div class="sub">${o.flame != null ? pf(o.flame, o.fst || '') : ''}<span>${o.sub || 'В друзьях'}</span></div></div>${o.right ?? `<span class="chev">${gi('fwd')}</span>`}</div>`;
  // маркер события вместо шеврона = FriendEventMarker (дуэль — щит + янтарная молния + время)
  const mkr = (ic, o = {}) => `<span class="mkr t">${gi(ic)}${o.bd ? `<span class="bd">${gi(o.bd)}</span>` : o.dot === false ? '' : '<i class="am"></i>'}${o.tm ? `<span class="tm">${o.tm}</span>` : ''}</span>`;
  const listHead = (title = 'Твои друзья', n = null) => `<div class="sect"><div class="ti">${title}${n != null ? `<span class="cnt">${n}</span>` : ''}</div><span class="addc t">${gi('add')}</span></div>`;
  const sect = (title, n = null, right = '') => `<div class="sect"><div class="ti">${title}${n != null ? `<span class="cnt">${n}</span>` : ''}</div>${right}</div>`;
  // плашка «Цель недели» (идея 4) — новая, вверху списка
  const goalPlate = (me, fr, o = {}) => {
    const tot = o.total || 10; const f = o.friend || P.ira;
    return `<div class="cd t" style="padding:14px 16px 12px;margin-top:8px"><div class="crow">${PAIR(P.me, f, 32)}<div class="cx"><div class="lk">Цель недели</div><div class="t19" style="margin-top:2px">${o.title || `${me + fr} из ${tot} уроков`}</div></div><span class="chipx">${o.left || 'ещё 3 дня'}</span></div>
      <div class="trk2 t8" style="margin-top:12px"><i class="me" style="width:${Math.min(me / tot, 1) * 100}%"></i><i class="fr" style="width:${Math.min(fr / tot, 1 - Math.min(me / tot, 1)) * 100}%"></i></div>
      <div class="crow s13" style="margin-top:8px;gap:14px"><span>Ты · ${me}</span><span>${f.n} · ${fr}</span><span style="margin-left:auto">${o.reward || 'награда вместе'}</span></div></div>`;
  };
  // типовые строки списка
  const R = {
    iraDuel: () => frow(P.ira, { flame: 12, sub: 'Оба занимались сегодня', right: mkr('shield', { bd: 'flash', tm: '18 ч' }) }),
    ira: () => frow(P.ira, { flame: 12, sub: 'Оба занимались сегодня' }),
    markCall: (btn) => frow(P.mark, { flame: 7, fst: 'dim', sub: 'Ещё не занимался', right: btn ?? '<span class="pb t">Позвать</span>' }),
    lidaInv: () => frow(P.lida, { flame: 3, fst: 'dim', sub: 'Позвала на урок', right: mkr('book') }),
    lida: () => frow(P.lida, { flame: 3, fst: 'dim', sub: 'Уже занималась · ждёт тебя' }),
    olegOut: () => frow(P.oleg, { flame: 0, fst: 'out', sub: 'Серия прервалась' }),
    den: () => frow(P.den),
  };
  const friendsTab = (o = {}) => `${comTabs(1)}${o.top || ''}${listHead(o.title || 'Твои друзья', o.n ?? 5)}${(o.rows || [R.iraDuel(), R.markCall(), R.lidaInv(), R.olegOut(), R.den()]).join('')}<div style="height:130px"></div>`;
  const TAB = (o = {}) => PH(friendsTab(o), { time: o.time || '19:05', fixed: tabbar('community', o.dot ? ['community'] : []), overlay: o.overlay || '' });

  // Главная = HomeV2Header + Continue + плитки + «СЕГОДНЯ»; новое — только строка в «Сегодня»
  const todayRow = (ic, t, s, c, on, st = '') => `<div class="hrow t"${st ? ` style="${st}"` : ''}><span class="ck${on ? ' on' : ''}"></span><span class="it">${gi(ic)}</span><div class="cx"><div class="tt">${t}</div>${s ? `<div class="ss">${s}</div>` : ''}</div><span class="ct">${c}</span></div>`;
  const home = (o = {}) => `<div class="hhd" style="padding:0 4px"><span class="hpl">${gi('flame', 'font-size:20px;color:var(--acc)')}<span><b>5 дней</b><small>Серия</small></span></span><span class="hpl">${coinImg(5, 20)}<b>2 340</b></span><span style="flex:1"></span><span class="hbell t">${gi('bell')}${o.bellDot ? '<i class="d"></i>' : ''}</span>${AV(P.me, 48)}</div>
    <div class="hcont t"><div class="cx"><div class="t17" style="font-size:16px;line-height:20px">Вошли в офис</div><div class="s13" style="margin-top:4px">12 / 56 · Урок 1</div></div><span class="ring"><img src="${art('continue')}" alt=""></span></div>
    <div class="htiles"><div class="t"><img src="${art('lessons')}" alt="">Уроки</div><div class="t"><img src="${art('dialogs')}" alt="">Диалоги</div><div class="t"><img src="${art('cards')}" alt="">Карточки</div></div>
    <div class="htd"><div class="hh">Сегодня</div>${o.todayExtra || ''}${todayRow('book', 'Пройти урок', '', '0/1')}${todayRow('chatDots', 'Потренировать диалог', '', '0/1')}${todayRow('copyO', 'Повторить карточки', 'Не менее 10 слов', '0/10')}</div>${o.after || ''}<div style="height:120px"></div>`;
  const HOME = (o = {}) => PH(home(o), { time: o.time || '18:10', cls: 'home', fixed: tabbar('home'), overlay: o.overlay || '' });

  // финал занятия = HorizonSessionResult; новое — ряды друзей под строкой монет
  const offStar = (s) => s.replace('class="io"', 'class="io off"');
  const lessonDone = (rows = '', o = {}) => PH(`<div class="ldh"><span class="x t">${gi('close')}</span><span class="bal">${coinImg(5, 22)}${o.bal || '2 352'}</span></div>
    <div class="ldt">${o.title || 'Занятие пройдено'}</div><div class="lds">${o.sub || 'Урок 1 · Занятие 3 из 56 · Следующее открыто'}</div>
    <div class="stars">${[0, 1, 2].map((i) => (i < (o.stars ?? 3) ? gi('star') : offStar(gi('star')))).join('')}</div>
    <div class="stp"><div><b class="goodx">11</b><small>верно</small></div><div><b style="color:var(--bad)">1</b><small>ошибок</small></div><div><b>92%</b><small>точность</small></div></div>
    <div class="cr"><img src="${FF.K.coin(5)}" alt=""><b>+${o.coins || 12}</b><span>монет</span></div>
    <div style="margin-top:16px">${rows}</div>
    <div class="c1 m t" style="margin-top:16px">${o.cta || 'Продолжить'}${gi('arrowR', 'font-size:20px')}</div>${o.cta2 || ''}<div style="height:60px"></div>`, { time: o.time || '19:42', overlay: o.overlay || '' });

  // «Сообщения» (колокольчик Главной) — сюда же падают тихие итоги: «не успела», «не приняла», «прошёл вместе с тобой»
  const brow = (av, t, s, w, o = {}) => `<div class="brow t">${av}<div class="cx"><div class="tt">${t}</div><div class="ss">${s}</div></div>${o.nd ? '<i class="nd"></i>' : `<span class="w">${w}</span>`}</div>`;
  const bell = (rows, n) => sheet(`<div class="bellh"><div class="bt">Сообщения</div><span class="xcl t">${gi('close')}</span></div><div class="s14">${n ? `${n} новых` : 'Все прочитаны'}</div><div style="margin-top:14px">${rows}</div>`, { st: 'max-height:76%' });
  // окно приглашения = study invite в коде (монета 68, 22/28, 13/18, кнопки 48)
  const invModal = (o) => `<div class="xdim"></div><div class="mdl"><div class="ctr">${o.top}</div><div class="t22">${o.title}</div><div class="s14" style="margin-top:6px">${o.body}</div>${o.extra || ''}<div class="mb pri t">${o.pri}</div><div class="mb t">${o.sec || 'Не сейчас'}</div></div>`;

  Object.assign(FF, { frow, mkr, listHead, sect, goalPlate, R, friendsTab, TAB, todayRow, home, HOME, lessonDone, brow, bell, invModal });

  /* ═════════════ ВХОД: где живут друзья ═════════════ */
  const hubList = () => TAB({ top: goalPlate(4, 3), dot: 1 });
  const hubEmpty = () => PH(`${comTabs(1)}<div class="empty" style="padding-top:150px"><span class="ich" style="width:61px;height:61px;border-radius:16px;background:var(--ctl);margin:0 auto">${gi('peopleO', 'font-size:26px')}</span><div class="t22" style="margin-top:16px;font-size:20px;line-height:26px">Учиться вместе приятнее</div><div class="s14" style="max-width:280px;margin:6px auto 0">Найди друга по имени или поделись своим кодом.</div><span class="pb t" style="height:44px;border-radius:22px;padding:0 18px;margin-top:20px">${gi('personAdd')}Добавить друга</span></div>`, { time: '19:05', fixed: tabbar('community') });
  const hubLoad = () => PH(`${comTabs(1)}<div class="skel" style="height:112px;margin-top:8px;border-radius:22px"></div>${listHead('Твои друзья')}${skelRows(5)}`, { time: '19:05', fixed: tabbar('community') });
  const hubOffline = () => TAB({ top: `<div class="offl">${gi('offline')}Нет сети · список сохранён в 18:40</div>${goalPlate(4, 3)}`, rows: [R.ira(), R.markCall(`<span class="pb done">${gi('time')}В очереди</span>`), R.lida()], overlay: toast('offline', 'Позовём Марка, как только будет сеть') });

  // шторка «Вместе» = FriendTogetherSheet (имя 18/700 + закрыть 48, серия: пламя 26 + число 32/700, кнопки 52/r16); новое — неделя и шесть занятий
  const together = (p, o = {}) => TAB({ rows: [R.ira(), R.markCall(), R.lida()], overlay: sheet(`
    <div class="shh">${AV(p, 44)}<div class="cx"><div class="t18">${p.n}</div><div class="s13">${o.status || 'Занималась сегодня в 8:40'}</div></div><span class="xcl t">${gi('dots')}</span><span class="xcl t">${gi('close')}</span></div>
    <div class="crow" style="margin-top:16px;gap:8px">${gi(o.fst === 'out' ? 'flameO' : 'flame', `font-size:26px;color:${o.fst ? 'var(--mut)' : 'var(--acc)'}`)}<b style="font-size:32px;line-height:36px">${o.flame ?? 12}</b><div class="cx s14" style="margin-left:4px">${o.line || 'дней подряд вдвоём'}</div><span class="s13">лучшая 21</span></div>
    <div class="wk">${(o.week || ['both', 'both', 'half', 'both', 'both', 'both', 'both today']).map((s, i) => `<div><span class="d ${s}">${s.includes('both') ? gi('check') : ''}</span><small>${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}</small></div>`).join('')}</div>
    ${o.call ? `<div class="sb2 pri t" style="margin-top:16px">${gi('bell')}${o.call}</div>` : ''}
    <div class="acts">${[['shield', 'Дуэль', '5 фраз на точность'], ['book', 'Урок вместе', 'Позвать на занятие'], ['chats', 'Диалог', 'Сценка по ролям'], ['flag', 'Цель недели', '10 уроков на двоих'], ['albums', 'Набор карточек', 'Отправить свой'], ['flash', 'Поддержать', o.giftOff || '1 заряд энергии']].map(([ic, t, s], i) => `<div class="act t${i === 5 && o.giftOff ? ' off' : ''}">${gi(ic, 'font-size:24px')}<b>${t}</b><small>${s}</small></div>`).join('')}</div>
    <div class="sb2 t" style="margin-top:12px">${gi('hand')}Дать пять</div>`, { st: 'max-height:93%' }) });
  const menuSheet = () => TAB({ rows: [R.ira(), R.markCall(), R.lida()], overlay: sheet(`<div class="shh">${AV(P.ira, 44)}<div class="cx"><div class="t18">Ирина</div><div class="s13">Меню «⋯»</div></div><span class="xcl t">${gi('close')}</span></div>
    <div style="margin-top:16px"><div class="sb2 t">${gi('person')}Открыть визитку</div><div class="sb2 bad t">${gi('personRemove')}Удалить из друзей</div><div class="sb2 t" style="background:none;color:var(--bad);font-weight:400">Заблокировать</div></div>`) });

  // визитка = PlayerProfileModal: тёмная карточка в любой теме; кольцо Plus у монеты 150 (эталон: кольцо 6, зазор 5, ◆ 46)
  const bigAv = (p, s = 150) => `<span class="av${p.plus ? ' plus' : ''}" style="${p.plus ? 'padding:6px' : ''}"><img src="${FF.K.coin(p.r)}" width="${s}" height="${s}" style="width:${s}px;height:${s}px;${p.plus ? 'box-shadow:0 0 0 5px #151518' : ''}" alt="">${p.plus ? `<span class="pin" style="width:46px;height:46px;right:4px;bottom:4px;box-shadow:0 0 0 4px #151518"><i class="io" style="font-size:24px">&#x${FF.IC.diamond};</i></span>` : ''}</span>`;
  const ptag = `<span style="display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:11px;background:rgba(142,124,255,.20);color:#C9C0FF;font-size:13px;font-weight:800;vertical-align:8px;margin-left:8px">${gi('diamond', 'font-size:11px')}Plus</span>`;
  const visitka = (o = {}) => TAB({ rows: [R.ira(), R.markCall(), R.lida()], overlay: `<div class="vdim"></div><div class="vcard"><div class="vtop"><span class="vb t">${gi('dots')}</span><span class="vb t">${gi('close')}</span></div>
    <div class="ctr" style="margin-top:4px">${bigAv(P.ira)}</div><div class="vname">Ирина${ptag}</div><div class="ctr" style="margin-top:10px"><span class="vrank">${coinImg(9, 20)}Эрудит · ранг 9</span></div>
    ${o.notFriend ? '' : '<div class="vstat"><div><b>48</b><small>дней серии</small></div><div><b>7</b><small>этаж Пика</small></div><div><b>12</b><small>дней вдвоём</small></div></div>'}
    <div class="vft" style="flex-direction:column">${o.notFriend ? '' : `<div class="vbtn w t">${gi('shield')}Вызвать на дуэль</div>`}<div style="display:flex;gap:10px;margin-top:${o.notFriend ? 0 : 10}px"><div class="vbtn t">${o.notFriend ? gi('add') + 'Добавить в друзья' : gi('check') + 'Вы друзья'}</div><div class="vbtn t" style="flex:0 0 80px">${gi('heartO')}12</div></div></div></div>` });

  add(() => idea({
    id: 'hub', title: 'Где живут друзья: входы',
    pitch: 'Всё строится на том, что уже есть в коде. Вкладка «Сообщество» → «Друзья»: в строке друга появляются огонь пары и кнопка «Позвать», а входящие события показывает уже существующий маркер вместо шеврона (дуэль — щит с молнией и временем, приглашение — книга с янтарной точкой). Шторка друга (сейчас: «Дать пять», «Удалить», «Заблокировать»; «Вместе» выключено флагом) становится входом во все занятия вдвоём. На визитке появляется «Вызвать на дуэль». Тихие итоги («не успела», «прошёл вместе с тобой») падают в «Сообщения» на Главной.',
    routes: [['«Сообщество» → «Друзья»', 'тап по строке', 'шторка друга', 'дуэль · урок · диалог · цель · набор · энергия'], ['тап по монете', 'визитка', '«Вызвать на дуэль»'], ['маркер в строке', '!открывает событие: вызов, приглашение, ход, подарок']],
    groups: [
      group('Вкладка «Друзья»', [col('Обычный день', hubList(), 'цель недели сверху, огонь пары, «Позвать», маркеры'), col('Нет друзей', hubEmpty(), 'как в коде сейчас'), col('Первая загрузка', hubLoad(), 'новое: скелет той же высоты вместо пустоты'), col('Нет сети', hubOffline(), 'новое: список из кэша, «Позвать» в очередь')]),
      group('Шторка друга и визитка', [col('Шторка · Ирина', together(P.ira), 'неделя пары и шесть занятий'), col('Шторка · Марк ещё не занимался', together(P.mark, { status: 'Plus · сегодня ещё не занимался', flame: 7, fst: 'dim', line: 'дней подряд · ждём Марка', week: ['both', 'both', 'both', 'half', 'both', 'both', 'half today'], call: 'Позвать Марка', giftOff: 'У Марка Plus' }), '«Позвать» сверху'), col('Меню «⋯»', menuSheet(), '«Удалить» и «Заблокировать» — сюда'), col('Визитка друга', visitka(), 'тап по монете'), col('Визитка · не друг', visitka({ notFriend: true }), 'как сейчас')]),
    ],
    rows: [['«Сообщество» → «Друзья»', 'список, цель недели, маркеры', 'шторка друга, визитка, экраны идей'], ['Тап по строке', 'шторка друга', 'шесть занятий, «Дать пять», «⋯»'], ['Тап по монете', 'визитка', '«Вызвать на дуэль», «Вы друзья», «♡»'], ['Маркер в строке', 'событие друга', 'вызов дуэли, приглашение, ход, набор, подарок'], ['Нет друзей', 'пустое состояние', '«Добавить друга»']],
    firebase: '<b>Firebase.</b> Вкладка читает то же, что сейчас: друзья и заявки одним .get() за заход, профили одним friendsGetProfiles (до 100 друзей, кэш 30 мин). Маркеры — из уже загружаемых уведомлений (страница 20). Новых подписок нет; огонь пары и цель считаются на телефоне.',
  }));

  /* ═════════════ ИДЕЯ 1 · Серия вдвоём ═════════════ */
  const legend = `<div class="cd r18" style="margin-top:14px;padding:12px 14px"><div class="b13">Как горит огонь пары</div><div class="s14" style="margin-top:6px;line-height:22px">${pf(12)}&nbsp; оба занимались сегодня<br>${pf(7, 'dim')}&nbsp; один ещё нет · ждёт до полуночи<br>${pf(0, 'out')}&nbsp; день пропущен · серия с нуля</div></div>`;
  const rowsAll = () => PH(`${comTabs(1)}${listHead('Твои друзья', 5)}${R.ira()}${R.markCall()}${R.lida()}${R.olegOut()}${frow(P.den, { sub: 'В друзьях · серии вдвоём ещё нет' })}${legend}<div style="height:120px"></div>`, { time: '19:05', fixed: tabbar('community') });
  const homeRow = () => HOME({ todayExtra: FF.todayRow('flame', 'Серия вдвоём с Лидией', 'Лидия уже занималась · 3 дня', '0/1', false, 'margin-bottom:10px') });
  const doneStreak = () => lessonDone(`<div class="cd crow" style="padding:12px 14px">${PAIR(P.me, P.ira, 36)}<div class="cx"><div class="t17">Серия вдвоём · 13 дней</div><div class="s14">Ирина тоже сегодня занималась</div></div>${pf(13)}</div>
    <div class="cd crow" style="padding:12px 14px">${AV(P.mark, 36)}<div class="cx"><div class="t17">Марк ещё не занимался</div><div class="s14">Серия вдвоём · 7 дней</div></div><span class="pb t">Позвать</span></div>`);
  const list3 = (btn, ov) => PH(`${comTabs(1)}${listHead('Твои друзья', 5)}${R.ira()}${R.markCall(btn)}${R.lida()}<div style="height:120px"></div>`, { time: '19:08', fixed: tabbar('community'), overlay: ov });
  const nudged = () => list3(`<span class="pb done">${gi('check')}Позвал</span>`, toast('bell', 'Позвал Марка', { icSt: 'color:var(--good)' }));
  const nudgeFail = () => list3(undefined, toast('alert', 'Нет сети — попробуй ещё раз', { icSt: 'color:var(--bad)', btn: '<span class="pb soft t">Повторить</span>' }));
  const nudgeLimit = () => list3(`<span class="pb off">${gi('check')}Уже звал</span>`, toast('info', 'Сегодня уже звал'));
  const nudgeQuiet = () => list3(`<span class="pb off">${gi('moon')}Тихие часы</span>`, toast('moon', 'У Марка тихие часы — позови после 9:00'));
  const friendPush = () => HOME({ time: '19:09', overlay: push('Алекс: серия вдвоём ждёт', '7 дней подряд. Одно маленькое занятие — и огонь не погаснет.') });
  const friendSide = () => PH(`${comTabs(1)}${listHead('Твои друзья', 3)}${frow(P.me, { flame: 7, fst: 'dim', sub: 'Позвал заниматься', right: FF.mkr('book') })}${frow(P.ira, { flame: 2, sub: 'Оба занимались сегодня' })}${frow(P.oleg)}<div style="height:120px"></div>`,
    { time: '19:12', fixed: tabbar('community', ['community']), overlay: invModal({ top: AV(P.me, 68), title: 'Пять минут на практику?', body: 'Друг зовёт тебя заниматься сегодня. Серия вдвоём с Алексом · 7 дней.', pri: 'Начать занятие' }) });
  const broken = () => together(P.oleg, { status: 'Был 3 дня назад', flame: 0, fst: 'out', line: 'серия вдвоём прервалась', week: ['both', 'both', 'half', '', '', '', 'today'], call: 'Позвать Олега · начать заново' });
  const milestone = () => TAB({ rows: [R.ira(), R.markCall(), R.lida()], time: '19:44', overlay: sheet(`<div class="hero2">${AV(P.me, 64)}<span class="br"></span>${AV(P.ira, 64)}</div><div class="t25" style="text-align:center">Серия вдвоём — 30 дней</div><div class="p">Вы с Ириной месяц занимаетесь каждый день. Огонь пары стал голубым.</div>
    <div class="sb2 pri t" style="margin-top:18px">${gi('hand')}Дать пять Ирине</div><div class="sb2 t">Отлично</div>`) });

  add(() => idea({
    id: 'streak', n: 1, title: 'Серия вдвоём',
    pitch: 'Огонь пары растёт, если сегодня занимались оба. Пропустил один — пламя тускнеет до полуночи, и прямо в строке появляется «Позвать» (существующий friendsNudge). Один пропущенный день — серия с нуля. Видна в строке друга, в шторке (неделя по дням), строкой в «Сегодня» на Главной и в финале занятия. Вехи 7 · 30 · 100 — как у личной серии, цвет огня по тем же стадиям.',
    scores: [['Польза', 'высокая'], ['Цена', 'низкая'], ['Риск', 'низкий'], ['Firebase', '0 новых чтений']],
    routes: [['«Друзья»: тусклый огонь', '«Позвать»', 'тост «Позвал Марка»', 'пуш другу', 'друг: «Начать занятие»', 'огонь +1 у обоих'], ['Главная: «Серия вдвоём с Лидией»', 'урок', 'финал: «Серия вдвоём · 13»']],
    groups: [
      group('Входы', [col('Строки: все состояния', rowsAll()), col('Главная · «Сегодня»', homeRow(), 'одна строка, только когда друг уже занимался'), col('Финал занятия', doneStreak(), 'ряды под монетами')]),
      group('«Позвать» — отклик сразу, тексты кода', [col('Позвал', nudged(), 'кнопка меняется до ответа сервера'), col('Нет сети', nudgeFail(), 'откат кнопки + «Повторить»'), col('Уже звал', nudgeLimit(), '1 раз в день одному другу'), col('Тихие часы', nudgeQuiet(), '22:00–9:00 по времени друга')]),
      group('У друга', [col('Пуш', friendPush(), 'вариант зова для серии вдвоём'), col('Маркер и окно', friendSide(), 'окно приглашения из кода + строка серии')]),
      group('Прервалась и веха', [col('Серия прервалась', broken()), col('30 дней', milestone(), 'без монет: награда — общий огонь')]),
    ],
    rows: [['«Друзья»', 'строка → «Позвать» (или шторка)', '«Позвал», друг получает пуш'], ['Главная', 'строка «Серия вдвоём с Лидией» в «Сегодня»', 'урок → финал занятия'], ['Финал занятия', 'ряд «Серия вдвоём · 13»', '«Продолжить» или «Позвать»'], ['Пуш у друга', 'маркер → окно «Пять минут на практику?»', '«Начать занятие»'], ['Пропуск дня', 'серый огонь, шторка «прервалась»', '«Позвать · начать заново»']],
    firebase: '<b>Firebase: 0 новых чтений и записей.</b> Огонь пары считается на телефоне из activeDays (окно 120 дней), которые friendsGetProfiles уже отдаёт с кэшем 30 мин. «Позвать» — существующий friendsNudge (1 другу в день, до 5 в день, тихие часы, идемпотентно). Монет за вехи нет — по ECONOMY.md новые источники монет только решением владельца.',
  }));
})();
