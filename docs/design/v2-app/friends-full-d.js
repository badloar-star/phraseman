/* «Друзья» 2.0 — идея 7 «Общий набор карточек», идея 8 «Фраза дня вдвоём», идея 9 «Подарок энергии»,
   новые значки и кнопки, уведомления, сводка с решениями владельца. В конце — сборка страницы. */
(() => {
  'use strict';
  const { gi, P, AV, PAIR, coinImg, art, PH, tabbar, comTabs, sheet, toast, push, pf, col, group, idea, add, addFirst, frow, mkr, listHead, sect, R, TAB, HOME, brow, bell } = FF;

  /* ═════════════ ИДЕЯ 7 · Общий набор карточек ═════════════ */
  // экран набора = PackHeaderV2: голая стрелка + квадрат «⋮», заголовок 34/40, строка мета, «Практика» 48/r24 + круглая «+» 48; ниже — сетка карточек
  const SET = { t: 'Фразы для офиса', n: 12, w: [['I am here.', 'Я здесь.'], ['I am ready.', 'Я готов / готова.'], ['I am late.', 'Я опоздал.'], ['I am back.', 'Я вернулся / вернулась.'], ['We are together.', 'Мы вместе.'], ['I am fine.', 'У меня всё хорошо.']] };
  const grid = (k) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">${SET.w.slice(0, k).map(([e, r]) => `<div class="cd t" style="padding:14px;min-height:92px;border-radius:16px"><div class="t17">${e}</div><div class="s13" style="margin-top:4px">${r}</div></div>`).join('')}</div>`;
  const setScreen = (o = {}) => PH(`<div class="mh"><span class="mrb bare t">${gi('arrowL')}</span><span class="mrb t" style="width:36px;height:36px;border-radius:12px;background:var(--ctl);box-shadow:none">${gi('dots')}</span></div>
    <div class="st1" style="font-size:34px;line-height:40px;margin-top:6px">${SET.t}</div>
    <div class="crow" style="gap:10px;margin-top:10px;flex-wrap:wrap"><span class="chipx" style="border-radius:8px">A1</span><span class="s16" style="color:var(--tx)">${o.empty ? 3 : SET.n} карточек</span><span class="s14 crow" style="gap:4px">${gi('lockF', 'font-size:14px')}Только ты</span></div>
    <div class="crow" style="gap:10px;margin-top:20px"><span class="pb t" style="height:48px;border-radius:24px;flex:1">${gi('play')}Практика</span><span class="pb ${o.sent ? 'done' : 'soft'} t" style="height:48px;border-radius:24px;flex:1${o.empty ? ';color:var(--mut)' : ''}">${gi(o.sent ? 'check' : 'plane')}${o.sent ? 'Отправлен' : 'Отправить другу'}</span><span class="addc t" style="width:48px;height:48px;border-radius:24px">${gi('add')}</span></div>
    ${o.empty ? '<div class="s13" style="text-align:center;margin-top:8px">Отправить можно набор от 5 карточек</div>' : ''}
    ${o.progress ? `${sect('У друзей', 2)}<div class="cd" style="padding:4px 16px">${[[P.ira, 8, 'выучила 8 из 12'], [P.oleg, 0, 'добавил вчера · ещё не начинал']].map(([p, k, s]) => `<div class="lst">${AV(p, 40)}<div class="cx"><div class="t17">${p.n}</div><div class="s14">${s}</div>${k ? `<div class="trk2" style="margin-top:6px"><i class="fr" style="width:${k / 12 * 100}%"></i></div>` : ''}</div></div>`).join('')}</div>` : ''}
    ${grid(o.empty ? 3 : 6)}<div style="height:40px"></div>`, { time: '18:30', overlay: o.overlay || '' });
  const sendPick = () => setScreen({ overlay: sheet(`<div class="t25" style="margin-top:14px">Отправить набор</div><div class="p">«${SET.t}» придёт другу маркером в «Друзьях». Прогресс у каждого свой.</div>
    <div style="margin-top:10px">${[[P.ira, 'Карточки открыты', 1], [P.oleg, 'Карточки открыты', 1], [P.mark, 'Этот набор у Марка уже есть', -1], [P.lida, 'Карточки открыты', 0]].map(([p, s, on]) => `<div class="lst"${on < 0 ? ' style="opacity:.45"' : ''}>${AV(p, 40)}<div class="cx"><div class="t17">${p.n}</div><div class="s14">${s}</div></div>${on < 0 ? '' : `<span class="sel-dot${on ? ' on' : ''}">${on ? gi('check') : ''}</span>`}</div>`).join('')}</div>
    <div class="sb2 pri t" style="margin-top:16px">${gi('plane')}Отправить двоим</div>`, { st: 'max-height:92%' }) });
  const sentSet = () => setScreen({ sent: true, overlay: toast('plane', 'Набор ушёл Ирине и Олегу', { bottom: 40 }) });
  const setIncoming = (added) => PH(`${comTabs(1)}${listHead('Твои друзья', 3)}${frow(P.me, { flame: 12, sub: added ? 'Оба занимались сегодня' : 'Прислал набор карточек', right: added ? undefined : mkr('albums') })}${frow(P.mark)}<div style="height:120px"></div>`,
    { time: '18:40', fixed: tabbar('community', added ? [] : ['community']), overlay: added ? toast('albums', '«Фразы для офиса» — в «Моих наборах»', { btn: '<span class="pb soft t">Учить</span>' }) : sheet(`<div class="ctr" style="margin-top:16px"><img src="${art('cards')}" alt="" style="width:72px;height:72px;object-fit:contain"></div><div class="t25">${SET.t}</div><div class="p" style="margin-top:6px">${SET.n} карточек · A1 · от Алекса</div>
      <div class="crow" style="gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px">${SET.w.slice(0, 3).map(([e]) => `<span style="height:38px;padding:0 12px;border-radius:9px;background:var(--ctl);display:inline-flex;align-items:center;font-size:13px;font-weight:600">${e}</span>`).join('')}</div>
      <div class="sb2 pri t" style="margin-top:18px">${gi('add')}Добавить в мои наборы</div><div class="sb2 t">Не нужно</div>`) });

  add(() => idea({
    id: 'packs', n: 7, title: 'Общий набор карточек',
    pitch: 'Свой набор можно отправить другу: у него в строке появляется маркер «набор», внутри — первые фразы и «Добавить в мои наборы». У тебя в наборе — блок «У друзей»: кто сколько уже выучил. Набор не копируется, прогресс у каждого свой. Кнопка «Открыть сообществу» (публикация в каталог) остаётся как есть — это другое действие.',
    scores: [['Польза', 'средняя'], ['Цена', 'средняя'], ['Риск', 'низкий'], ['Firebase', '1 вызов на отправку']],
    routes: [['«Карточки» → «Мои наборы» → набор', '«Отправить другу»', 'выбор друзей', 'у друга маркер', '«Добавить в мои наборы»', 'у тебя: «У друзей»']],
    groups: [
      group('Отправить', [col('Свой набор', setScreen(), 'новая кнопка рядом с «Практикой»'), col('Выбор друзей', sendPick(), 'у кого набор уже есть — не выбрать'), col('Отправлено', sentSet(), 'кнопка «Отправлен» сразу')]),
      group('У друга и прогресс', [col('Маркер и предпросмотр', setIncoming(false)), col('Добавил', setIncoming(true), 'тост с «Учить»'), col('Прогресс друзей', setScreen({ progress: true, sent: true }), 'обновляется не чаще раза в 6 часов'), col('Мало карточек', setScreen({ empty: true }), 'кнопка выключена, причина под ней')]),
    ],
    rows: [['Свой набор', '«Отправить другу» → выбор друзей', 'тост, кнопка «Отправлен»'], ['Маркер «набор» у друга', 'предпросмотр', '«Добавить в мои наборы» / «Не нужно» — тихо'], ['Свой набор', 'блок «У друзей»', 'тап по другу → шторка друга']],
    firebase: '<b>Firebase.</b> Отправка — 1 вызов (уведомление другу с id набора). Набор не копируется: при добавлении друг читает тот же документ (1 чтение). Прогресс друга — одна запись в конце его тренировки, не на каждую карточку; блок «У друзей» читает его только при открытии набора и не чаще раза в 6 часов.',
  }));

  /* ═════════════ ИДЕЯ 8 · Фраза дня вдвоём ═════════════ */
  // карточка = DailyPollCard: отступ 12, поля 18, r22; надзаголовок 13/18 с разрядкой 1,7; вопрос 19/24; варианты 58 / r14 / 16/22 по центру
  const OPTS = ['We are together.', 'We is together.', 'We together are.'];
  const pd = (o = {}) => `<div class="cd" style="margin-top:12px;padding:18px;border-radius:22px"><div class="lk" style="letter-spacing:1.7px">Фраза дня вдвоём</div><div class="t19" style="margin-top:8px">Как сказать «Мы вместе.»?</div>
    ${o.state === 'done' || o.state === 'first' ? `<div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">${OPTS.map((t, i) => { const who = o.state === 'first' ? [] : [[P.ira, P.oleg], [P.mark], []][i]; const mine = i === 0; return `<div style="min-height:58px;border-radius:14px;padding:0 14px 0 16px;display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;background:${mine ? 'var(--sel)' : 'var(--ctl)'};box-shadow:var(--nsh)">${mine ? gi('okF', 'font-size:18px;color:var(--good)') : i === 1 && who.length ? gi('closeC', 'font-size:18px;color:var(--sec)') : ''}<span style="flex:1">${t}</span>${who.length ? `<span class="pair">${who.map((p) => AV(p, 26, { noPin: true })).join('')}</span>` : ''}</div>`; }).join('')}</div>
      <div class="s14" style="margin-top:12px">${o.state === 'first' ? 'Ты первый из друзей — их ответы появятся здесь до полуночи.' : 'С we всегда are. Марк ошибся — можно дать пять за попытку.'}</div>`
    : `<div class="crow s13" style="gap:8px;margin-top:8px">${PAIR(P.ira, P.mark, 20)}Ирина и Марк уже ответили · откроется после твоего</div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">${OPTS.map((t, i) => `<div class="t" style="min-height:58px;border-radius:14px;padding:0 22px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;background:${o.state === 'pending' && i === 0 ? 'var(--sel)' : 'var(--ctl)'};box-shadow:var(--nsh);${o.state === 'pending' && i ? 'opacity:.56' : ''}">${t}</div>`).join('')}</div>`}</div>`;
  const pdTab = (state, ov) => PH(`${comTabs(1)}${pd({ state })}${listHead('Твои друзья', 5)}${R.ira()}${R.markCall()}<div style="height:120px"></div>`, { time: '12:20', fixed: tabbar('community'), overlay: ov || '' });
  const pdHome = () => HOME({ time: '12:18', after: `<div class="cd crow t" style="margin:12px 6px 0"><img src="${art('phrase_of_day')}" alt="" style="width:48px;height:48px;object-fit:contain"><div class="cx"><div class="lk">Фраза дня</div><div class="t17" style="margin-top:2px">We are together.</div><div class="s13 crow" style="gap:6px;margin-top:4px">${PAIR(P.ira, P.mark, 20)}2 друга уже ответили</div></div><span class="chev">${gi('fwd')}</span></div>` });

  add(() => idea({
    id: 'phrase', n: 8, title: 'Фраза дня вдвоём',
    pitch: 'Поверх «Опроса дня»: та же карточка первым блоком вкладки «Друзья», только вопрос — перевести фразу дня. Ответы друзей закрыты, пока не ответишь сам, — подсмотреть нельзя. После ответа у каждого варианта видно, кто из друзей его выбрал, и короткое «почему». Пуша нет.',
    scores: [['Польза', 'средняя'], ['Цена', 'низкая'], ['Риск', 'низкий'], ['Firebase', '1 голос в день']],
    routes: [['Вкладка «Друзья»: первая карточка', 'выбор варианта', 'отметка сразу', 'ответы друзей открываются', '«Дать пять»'], ['Главная: «Фраза дня»', '«2 друга уже ответили»', '!ведёт на вкладку «Друзья»']],
    groups: [
      group('Входы', [col('Вкладка «Друзья»', pdTab('ask'), 'на месте «Опроса дня»'), col('Главная', pdHome(), 'строка «2 друга уже ответили»')]),
      group('Ответ', [col('Отправляется', pdTab('pending'), 'выбор отмечен сразу, остальные .56 — как у опроса'), col('Ответы друзей', pdTab('done'), 'кто какой вариант выбрал'), col('Ты первый', pdTab('first')), col('Нет сети', pdTab('ask', toast('offline', 'Нет связи — ответ не отправлен. Попробуй ещё раз.', { icSt: 'color:var(--bad)', btn: '<span class="pb soft t">Повторить</span>' })), 'текст ошибки опроса из кода')]),
    ],
    rows: [['Вкладка «Друзья»', 'карточка → вариант → ответы друзей', '«Дать пять» в шторке друга'], ['Главная', 'строка «Фраза дня»', 'вкладка «Друзья»'], ['Полночь', 'новая фраза', 'вчерашние ответы исчезают']],
    firebase: '<b>Firebase.</b> Голос — как у dailyPollVote: одна транзакция в день (2 чтения, 2 записи). Выбор друзей — поле «ответ фразы дня» в публичном профиле, пишется в той же транзакции и приходит в общем friendsGetProfiles (0 новых чтений; свежесть до 30 мин). Подписок нет.',
  }));

  /* ═════════════ ИДЕЯ 9 · Подарок энергии ═════════════ */
  // энергия = код: запас 5, +1 каждые 10 мин; у Plus не тратится; окно «Энергия закончилась» — тексты кода
  const lidaRows = () => [frow(P.lida, { flame: 3, fst: 'dim', sub: 'Уже занималась · ждёт тебя' }), R.ira(), R.olegOut()];
  const giftSheet = () => TAB({ rows: lidaRows(), time: '17:30', overlay: sheet(`<div class="ctr" style="margin-top:16px">${AV(P.lida, 64)}</div><div class="t25">Поддержать Лидию</div><div class="p">Лидия получит +1 энергию — ещё одно занятие без ожидания. Один подарок в день, только друзьям без Plus.</div>
    <div class="facts"><div><b>+1</b><small>энергия</small></div><div><b>1 в день</b><small>от тебя</small></div><div><b>до 23:59</b><small>забрать</small></div></div>
    <div class="sb2 pri t" style="margin-top:18px">${gi('flash')}Отправить</div><div class="sb2 t">Позже</div>`) });
  const giftSent = () => TAB({ rows: lidaRows(), time: '17:31', overlay: toast('flash', 'Энергия у Лидии · следующий подарок завтра', { icSt: 'color:var(--acct)' }) });
  const lidaSide = (o = {}) => PH(`${comTabs(1)}${listHead('Твои друзья', 3)}${frow(P.me, { flame: 3, fst: 'dim', sub: o.claimed ? 'Поддержал тебя энергией' : 'Прислал энергию', right: o.claimed ? undefined : mkr('flash') })}${frow(P.ira)}<div style="height:120px"></div>`,
    { time: '17:40', fixed: tabbar('community', o.claimed ? [] : ['community']), overlay: o.claimed ? toast('flash', '+1 энергия от Алекса', { icSt: 'color:var(--acct)', btn: `<span class="pb soft t">${gi('hand')}Спасибо</span>` }) : o.full ? toast('info', 'Энергия полная — подарок подождёт до полуночи') : push('Алекс поддерживает тебя', '+1 энергия ждёт во вкладке «Друзья».') });
  const noEnergy = () => HOME({ time: '17:45', overlay: sheet(`<div class="ctr" style="margin-top:18px"><span class="ich big">${gi('flashO')}</span></div><div class="t25">Энергия закончилась</div><div class="p">Одна единица восстановится через <b style="color:var(--tx);font-variant-numeric:tabular-nums">7:42</b></div>
    <div class="cd crow" style="margin-top:16px;background:var(--sel);box-shadow:none">${AV(P.me, 40)}<div class="cx"><div class="t17">Подарок от Алекса</div><div class="s14">+1 энергия · хватит на занятие</div></div></div>
    <div class="sb2 pri t" style="margin-top:16px">Забрать и продолжить</div><div class="sb2 t">${gi('diamond')}Plus — без ограничений</div><div class="s13" style="text-align:center;margin-top:10px">Запас 5, каждые 10 минут +1. Plus занимается без ограничений.</div>`) });

  add(() => idea({
    id: 'energy', n: 9, title: 'Подарок энергии',
    pitch: '«Поддержи друга»: одна энергия в день любому другу без Plus. Подарок не падает на счёт сам — друг забирает его маркером «молния» в строке или прямо в окне «Энергия закончилась». Ответ — «Спасибо» (это «Дать пять»). Энергия и так восстанавливается на 1 каждые 10 минут, так что подарок — «на 10 минут быстрее», мягкая забота. Подарки энергии в коде уже были и выключены.',
    scores: [['Польза', 'средняя'], ['Цена', 'низкая'], ['Риск', 'высокий'], ['Firebase', '2 вызова на подарок']],
    routes: [['Шторка друга → «Поддержать»', 'подтверждение', '«Отправить»', 'пуш', 'у друга маркер «молния»', '+1 и «Спасибо»'], ['«Энергия закончилась» у друга', '«Подарок от Алекса»', '«Забрать и продолжить»']],
    groups: [
      group('Отправить', [col('Подтверждение', giftSheet(), 'из шторки друга'), col('Отправлено', giftSent(), 'плитка «Поддержать» гаснет до завтра')]),
      group('У Лидии', [col('Пуш и маркер', lidaSide()), col('Забрала', lidaSide({ claimed: true }), '«Спасибо» = «Дать пять»'), col('Энергия полная', lidaSide({ full: true }), 'подарок ждёт до полуночи'), col('Энергия закончилась', noEnergy(), 'окно из кода + строка подарка')]),
    ],
    rows: [['Шторка друга → «Поддержать»', 'подтверждение → тост', 'плитка выключена до завтра'], ['Друг с Plus', 'плитка «У Марка Plus»', '—'], ['Маркер «молния» у друга', 'тап', '+1 энергия, тост «Спасибо»'], ['«Энергия закончилась»', 'строка «Подарок от Алекса»', '«Забрать и продолжить»']],
    firebase: '<b>Firebase.</b> Отправка — 1 вызов (лимит 1 в день, запрет для друзей с Plus, уведомление другу). «Забрать» — 1 вызов (сервер добавляет энергию, проверяет запас 5). <b>Нужно D-решение владельца:</b> ECONOMY.md запрещает новые источники энергии, прежние подарки выключены (energy_gift_effects).',
  }));

  /* ═════════════ Новые значки и кнопки ═════════════ */
  const ICONS = [
    ['flame', 'Огонь пары', 'строка друга, шторка, «Сегодня», финал', 'flame'], ['bell', '«Позвать»', 'строка, шторка друга', 'notifications-outline'], ['hand', '«Дать пять» · «Спасибо»', 'шторка, итог недели, подарок', 'hand-left-outline'],
    ['shield', 'Дуэль', 'шторка, визитка, маркер', 'shield-half-outline'], ['book', 'Урок вместе', 'шторка, маркер', 'book-outline'], ['personAdd', 'Позвать на занятие', 'финал занятия', 'person-add-outline'],
    ['chats', 'Диалог по ролям', 'шторка, «Диалоги» → «С другом»', 'chatbubbles-outline'], ['flag', 'Цель недели', 'шторка, плашка, маркер', 'flag-outline'], ['albums', 'Набор карточек', 'шторка, маркер', 'albums-outline'],
    ['plane', 'Отправить другу / позвать', 'набор, выбор друзей', 'paper-plane-outline'], ['flash', 'Поддержать энергией', 'шторка, маркер', 'flash'], ['cal', 'Итоги недели', 'вкладка в понедельник', 'calendar-outline'],
    ['hourglass', 'Ждём ход друга', 'дуэль, диалог', 'hourglass-outline'], ['repeat', 'Реванш', 'итог дуэли', 'repeat'], ['swap', 'Поменяться ролями', 'итог диалога', 'swap-horizontal-outline'],
    ['eye', 'Показывать мою неделю', '«Моя неделя»', 'eye-outline'], ['dots', 'Меню друга', 'шторка друга', 'ellipsis-horizontal'], ['diamond', 'Plus у монеты', 'кольцо и ◆ (эталон)', 'diamond'],
  ];
  const btnStates = () => `<div class="ico-grid pane-th th-${FF.TH}" style="margin-top:14px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${[
    ['<span class="pb">Позвать</span>', 'Позвать', 'обычное'], ['<span class="pb" style="transform:scale(.97);opacity:.86">Позвать</span>', 'Нажатие', 'scale .97 · 160 мс'], [`<span class="pb done">${gi('check')}Позвал</span>`, 'Сразу после тапа', 'до ответа сервера'],
    [`<span class="pb off">${gi('check')}Уже звал</span>`, 'Лимит', 'одному другу раз в день'], [`<span class="pb off">${gi('moon')}Тихие часы</span>`, 'Тихие часы', '22:00–9:00 у друга'], [`<span class="pb done">${gi('time')}В очереди</span>`, 'Нет сети', 'уйдёт при связи'],
    [`${mkr('shield', { bd: 'flash', tm: '18 ч' })}&nbsp;&nbsp;${mkr('book')}&nbsp;&nbsp;${mkr('flash')}`, 'Маркеры событий', 'компонент кода FriendEventMarker'], [`${pf(12)}&nbsp;&nbsp;${pf(7, 'dim')}&nbsp;&nbsp;${pf(0, 'out')}`, 'Огонь пары', 'горит · ждёт · погас'], [`${AV(P.ira, 44)}&nbsp;&nbsp;${AV(P.lida, 44)}`, 'Монета с Plus и без', 'кольцо 2,5 + зазор 2 + ◆'],
  ].map(([h, n, w]) => `<div class="cell"><div class="crow" style="min-height:52px">${h}</div><div class="nm">${n}</div><div class="w">${w}</div></div>`).join('')}</div>`;
  add(() => `<section id="icons"><div class="ihead"><h2>Новые значки и кнопки</h2></div><p class="ipitch">Все значки — Ionicons приложения (тот же шрифт, что в коде), плитка 46 × 46, радиус 12, фон — цвет текста 9 %. Маркеры событий — существующий компонент, новые только значки внутри. Новых картинок не нужно: используются готовые v2art «Продолжить», «Уроки», «Диалоги», «Карточки», «Фраза дня».</p>
    <div class="ico-grid pane-th th-${FF.TH}">${ICONS.map(([k, n, w, code]) => `<div class="cell"><span class="ich">${gi(k)}</span><div class="nm">${n}</div><div class="w">${w}</div><code>${code}</code></div>`).join('')}</div>
    <div class="sub2">Состояния «Позвать», маркеры и огонь пары</div>${btnStates()}</section>`);

  /* ═════════════ Уведомления ═════════════ */
  const lock = (items) => PH(`<div class="lock-time">9:41</div><div class="lock-date">Вторник, 21 октября</div><div class="nlist">${items.map(([t, b, w]) => push(t, b, w)).join('')}</div>`, { time: '9:41', cls: 'lockbg' });
  add(() => idea({
    id: 'push', title: 'Уведомления',
    pitch: 'Пуш — только когда от человека ждут действия, и только через лимиты и тихие часы friendsNudge (22:00–9:00 у получателя) и общий переключатель «Друзья» в настройках уведомлений. Тон — как у существующих: «{имя}: пять минут практики?», «{имя} даёт пять». Фраза дня, итоги недели и прогресс набора — без пуша.',
    groups: [group('Экран блокировки у друга', [
      col('Зовут и вызывают', lock([['Алекс: серия вдвоём ждёт', '7 дней подряд. Одно маленькое занятие — и огонь не погаснет.', 'сейчас'], ['Алекс зовёт на занятие', 'Урок 2 · Are you…? Пройди сегодня — награда «вместе» вам обоим.', '5 мин'], ['Алекс вызывает на дуэль', '5 фраз из уроков 1–2. Ход за тобой, на ответ сутки.', '1 ч'], ['Алекс предлагает цель недели', '10 занятий на двоих до воскресенья.', '2 ч']])),
      col('Ходы, итоги, подарки', lock([['Итог дуэли', 'Ирина ответила: 3 из 5. Ты победил.', 'сейчас'], ['Алекс ответил', '«Закажи кофе» — твой ход.', '20 мин'], ['Алекс прислал набор', '«Фразы для офиса» · 12 карточек.', '1 ч'], ['Ирина даёт пять', 'Пятюня получена.', '3 ч']])),
    ])],
    rows: [['Серия · занятие · дуэль · цель · ход · набор · энергия', 'пуш → маркер в строке или сразу нужный экран', 'лимиты friendsNudge, тихие часы, переключатель «Друзья»'], ['Итог дуэли, «прошёл вместе с тобой»', 'пуш → итог / «Сообщения»', 'одно событие — один пуш'], ['Фраза дня, итоги недели, прогресс набора', 'без пуша', 'видно на вкладке']],
  }));

  /* ═════════════ Сводка — первым блоком ═════════════ */
  const OV = [
    ['streak', 'Серия вдвоём', 'hi', 'hi', 'hi', '0 новых чтений', '1'],
    ['lesson', 'Урок вместе', 'hi', 'hi', 'hi', '1 вызов + 1 пуш', '2'],
    ['duel', 'Дуэль на 5 фраз', 'hi', 'mid', 'mid', '2 записи + 1 чтение', '3'],
    ['goal', 'Цель недели вдвоём', 'hi', 'mid', 'hi', '0 чтений, 2 записи на цель', '4'],
    ['phrase', 'Фраза дня вдвоём', 'mid', 'hi', 'hi', '1 голос в день', '5'],
    ['week', 'Итог недели друга', 'mid', 'hi', 'hi', '0 новых чтений', 'вместе с 4'],
    ['roles', 'Диалог по ролям', 'hi', 'lo', 'mid', '1 запись на ход', '6 · нужны сценки'],
    ['packs', 'Общий набор карточек', 'mid', 'mid', 'hi', '1 вызов на отправку', '7'],
    ['energy', 'Подарок энергии', 'mid', 'hi', 'lo', '2 вызова на подарок', 'D-решение'],
  ];
  const W = { hi: ['lg', 'высокая'], mid: ['lm', 'средняя'], lo: ['lr', 'низкая'] };
  const COST = { hi: ['lg', 'низкая'], mid: ['lm', 'средняя'], lo: ['lr', 'высокая'] };
  const RISK = { hi: ['lg', 'низкий'], mid: ['lm', 'средний'], lo: ['lr', 'высокий'] };
  addFirst(() => `<section id="summary" style="margin-top:34px"><div class="ihead" style="margin-top:20px"><h2>Сводка и порядок</h2></div><p class="ipitch">Порядок — от «почти бесплатно и видно каждый день» к «дороже, но отвечает на запрос поддержки играть и общаться». Цена — работа клиента и сервера; Firebase — новые чтения и записи.</p>
    <div class="tbx" style="margin-top:6px"><table class="ovw"><tr><th>№</th><th>Идея</th><th>Польза</th><th>Цена</th><th>Риск</th><th>Firebase</th><th>Порядок</th></tr>${OV.map(([id, t, a, b, c, f, o], i) => `<tr><td>${i + 1}</td><td><a href="#${id}">${t}</a></td><td><span class="lv ${W[a][0]}">${W[a][1]}</span></td><td><span class="lv ${COST[b][0]}">${COST[b][1]}</span></td><td><span class="lv ${RISK[c][0]}">${RISK[c][1]}</span></td><td>${f}</td><td>${o}</td></tr>`).join('')}</table></div>
    <p class="fb" style="margin-top:16px"><b>Нужны решения владельца до кода.</b> 1) Монеты «вместе» в идеях 2 и 4 — новый источник монет: по ECONOMY.md только D-решением; без него те же экраны работают без монет. 2) Подарок энергии (идея 9) — новый источник энергии, прежние подарки выключены. 3) SOCIAL.md сейчас ограничивает «Друзей» добавлением и «привет» — расширение до занятий вдвоём тоже решение владельца. 4) Дуэль — в коде есть выключенные «живые» дуэли и маркер для них; новая асинхронная занимает тот же маркер.</p></section>`);

  FF.render();
})();
