/* «Друзья» 2.0 — идея 4 «Цель недели вдвоём», идея 5 «Диалог по ролям», идея 6 «Итог недели друга». */
(() => {
  'use strict';
  const { gi, P, AV, PAIR, coinImg, art, PH, tabbar, comTabs, sheet, toast, push, pf, col, group, idea, add, frow, mkr, listHead, sect, goalPlate, R, TAB, HOME, lessonDone, brow, bell } = FF;

  const rows3 = () => [R.ira(), R.markCall(), R.lida()];
  const seg = (items, on) => `<div class="crow" style="gap:6px;padding:4px;border-radius:18px;background:var(--ctl);margin-top:14px">${items.map((t, i) => `<span class="t" style="flex:1;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;${i === on ? 'background:var(--card);box-shadow:var(--nsh)' : 'color:var(--sec)'}">${t}</span>`).join('')}</div>`;

  /* ═════════════ ИДЕЯ 4 · Цель недели вдвоём ═════════════ */
  const gSetup = () => TAB({ rows: rows3(), overlay: sheet(`<div class="ctr" style="margin-top:16px">${PAIR(P.me, P.ira, 56)}</div><div class="t25">Цель недели с Ириной</div><div class="p">Сколько уроков пройдёте вдвоём до воскресенья? Считается каждое занятие любого из вас.</div>
    ${seg(['6 занятий', '10 занятий', '14 занятий'], 1)}
    <div class="facts"><div><b>10</b><small>на двоих</small></div><div><b>5 дн.</b><small>до воскресенья</small></div><div><b>~1</b><small>в день на каждого</small></div></div>
    <div class="sb2 pri t" style="margin-top:18px">${gi('flag')}Предложить Ирине</div><div class="sb2 t">Позже</div>`) });
  const gPending = () => TAB({ top: `<div class="cd crow t" style="padding:14px 16px;margin-top:8px">${PAIR(P.me, P.ira, 32)}<div class="cx"><div class="lk">Цель недели</div><div class="t19" style="margin-top:2px">Ждём Ирину</div><div class="s14">10 занятий на двоих</div></div><span class="pb soft t">Отменить</span></div>`, rows: rows3() });
  const gIncoming = () => PH(`${comTabs(1)}${listHead('Твои друзья', 4)}${frow(P.me, { flame: 12, sub: 'Предложил цель недели', right: mkr('flag') })}${frow(P.mark)}<div style="height:120px"></div>`,
    { time: '9:30', fixed: tabbar('community', ['community']), overlay: sheet(`<div class="ctr" style="margin-top:16px">${PAIR(P.ira, P.me, 56)}</div><div class="t25">Цель недели с Алексом</div><div class="p">10 занятий на двоих до воскресенья 23:59. Получится — награда вам обоим.</div>
      <div class="facts"><div><b>10</b><small>занятий</small></div><div><b>~1</b><small>в день на каждого</small></div><div><b>вс</b><small>итог</small></div></div><div class="sb2 pri t" style="margin-top:18px">${gi('flag')}Принять цель</div><div class="sb2 t">Не на этой неделе</div>`) });
  const gActive = () => TAB({ top: goalPlate(4, 3), rows: rows3() });
  const gDetail = () => TAB({ top: goalPlate(4, 3), rows: rows3(), overlay: sheet(`<div class="lk" style="margin-top:16px;text-align:center">Цель недели · 20–26 октября</div><div class="ctr" style="margin-top:6px"><span style="font-size:46px;line-height:52px;font-weight:800;letter-spacing:-1px">7 из 10</span></div>
    <div class="trk2" style="margin-top:12px;height:12px;border-radius:6px"><i class="me" style="width:40%"></i><i class="fr" style="width:30%"></i></div>
    <div class="crow s14" style="margin-top:10px;gap:16px"><span class="crow" style="gap:6px"><span style="width:10px;height:10px;border-radius:5px;background:var(--acc)"></span>Ты · 4</span><span class="crow" style="gap:6px"><span style="width:10px;height:10px;border-radius:5px;background:color-mix(in srgb,var(--acc) 42%,var(--ctl))"></span>Ирина · 3</span><span style="margin-left:auto">ещё 3</span></div>
    <div style="margin-top:12px">${[['Чт', 'ты 1 · Ирина 1'], ['Ср', 'Ирина 1'], ['Вт', 'ты 2'], ['Пн', 'ты 1 · Ирина 1']].map(([d, t]) => `<div class="lst"><span class="chipx" style="min-width:42px;justify-content:center">${d}</span><div class="cx s15" style="color:var(--tx)">${t}</div></div>`).join('')}</div>
    <div class="btnrow" style="margin-top:14px"><div class="sb2 pri t">Продолжить урок</div><div class="sb2 t" style="flex:0 0 130px">${gi('bell')}Позвать</div></div>`) });
  const gLesson = () => lessonDone(`<div class="cd" style="padding:12px 14px"><div class="crow">${PAIR(P.me, P.ira, 34)}<div class="cx"><div class="t17">Цель недели · 8 из 10</div><div class="s14">+1 от тебя · осталось 2</div></div></div><div class="trk2 t8" style="margin-top:12px"><i class="me" style="width:50%"></i><i class="fr" style="width:30%"></i></div></div>`);
  const gDone = () => TAB({ top: goalPlate(6, 5, { title: '11 из 10 · готово', left: 'вс' }), rows: rows3(), time: '21:40', overlay: sheet(`<div class="ctr" style="margin-top:18px"><span class="ich hero">${gi('flagF')}</span></div><div class="t25">Цель недели выполнена</div><div class="p">11 занятий на двоих: 6 твоих и 5 Ирины.</div><div class="ctr" style="margin-top:14px"><span class="rew">${coinImg(5, 22)}+50 каждому</span></div>
    <div class="sb2 pri t" style="margin-top:18px">Цель на следующую неделю</div><div class="sb2 t">${gi('hand')}Дать пять Ирине</div>`) });
  const gMissed = () => TAB({ time: '9:05', rows: rows3(), top: `<div class="cd" style="padding:14px 16px;margin-top:8px"><div class="crow">${PAIR(P.me, P.ira, 32)}<div class="cx"><div class="lk">Прошлая неделя</div><div class="t19" style="margin-top:2px">8 из 10 — почти</div></div></div><div class="trk2 t8" style="margin-top:12px"><i class="me" style="width:50%"></i><i class="fr" style="width:30%"></i></div><div class="btnrow" style="margin-top:14px"><div class="sb2 pri t">Ещё раз · 10</div><div class="sb2 t">Поменьше · 6</div></div></div>` });
  const gNoAnswer = () => HOME({ time: '9:05', bellDot: 1, overlay: bell(`${brow(AV(P.ira, 38, { off: true }), 'Цель недели не началась', 'Ирина не ответила до понедельника', '', { nd: 1 })}${brow(PAIR(P.me, P.ira, 30), 'Неделя с Ириной закрыта', '8 из 10 — почти', 'пн')}`, 1) });

  add(() => idea({
    id: 'goal', n: 4, title: 'Цель недели вдвоём',
    pitch: 'Десять занятий на двоих за неделю — одна полоса из двух частей: твой вклад и друга. Награда общая. Цель предлагает один, второй принимает; одна цель в неделю, неделя — как у Пика (с понедельника). Плашка живёт вверху вкладки «Друзья», вклад виден в финале занятия.',
    scores: [['Польза', 'высокая'], ['Цена', 'средняя'], ['Риск', 'низкий'], ['Firebase', '0 чтений, 2 записи на цель']],
    routes: [['Шторка друга → «Цель недели»', 'выбор цели', '«Предложить Ирине»', 'пуш', 'маркер «флаг» → «Принять цель»', 'плашка у обоих'], ['Финал занятия', '«Цель недели · 8 из 10»', 'воскресенье: итог у обоих']],
    groups: [
      group('Предложить и принять', [col('Выбор цели', gSetup(), '6 · 10 · 14 занятий'), col('Ждём ответа', gPending()), col('У Ирины', gIncoming(), 'маркер «флаг» в строке')]),
      group('Неделя идёт', [col('Плашка', gActive()), col('По дням', gDetail(), 'тап по плашке'), col('Финал занятия', gLesson(), '+1 к цели')]),
      group('Итог', [col('Выполнено', gDone(), 'монеты — после D-решения'), col('Не дотянули', gMissed(), 'в понедельник, без упрёка'), col('Друг не ответил', gNoAnswer(), 'тихо, в «Сообщениях»')]),
    ],
    rows: [['Шторка друга → «Цель недели»', 'выбор → «Ждём Ирину»', 'плашка на вкладке'], ['Маркер «флаг» у друга', 'шторка цели', '«Принять цель» / «Не на этой неделе»'], ['Плашка', 'шторка по дням', '«Продолжить урок» / «Позвать»'], ['Воскресенье 23:59', 'итог: выполнено или почти', '«Цель на следующую неделю» / «Ещё раз»']],
    firebase: '<b>Firebase.</b> Цель — поле в документе пользователя у обоих (загружается при входе и так): предложить и принять — 1 вызов, 2 записи. Прогресс — счётчик «занятий за неделю» в публичном профиле, пишется в той же записи, что activeDays (0 новых записей), читается общим friendsGetProfiles (0 новых чтений). Итог — плановая функция в понедельник 00:01, как у Пика, пачкой. <b>Общая награда монетами — только D-решением (ECONOMY.md).</b>',
  }));

  /* ═════════════ ИДЕЯ 5 · Диалог по ролям ═════════════ */
  // сессия = DialogueV2Session: «⋯», пузыри ≤78 %, 17/24/500, «Ты»; новое — три готовые реплики вместо поля ввода
  const dHead = (n = 3, sub = 'вдвоём · ты — бариста') => `<div class="mh"><span class="mrb t" style="background:var(--ctl);box-shadow:none">${gi('arrowL')}</span><div class="cx" style="margin-left:4px"><div class="t17">Закажи кофе</div><div class="s13">${sub}</div></div><span class="chipx">${n} / 8</span><span class="mrb t" style="background:var(--ctl);box-shadow:none;width:40px;height:40px">${gi('dots')}</span></div>
    <div class="goalc"><span class="ich s">${gi('flag')}</span><div class="cx"><div class="b13">Цель 2 из 5</div><div class="t17">Выбрать размер</div></div></div>`;
  const them = (who, en, ru) => `<div class="msg"><span style="margin-bottom:2px">${AV(who, 32, { noPin: true })}</span><div class="bw"><div class="who">${who.n} · гость</div><div class="bub">${en}${ru ? `<span class="ru">${ru}</span>` : ''}</div></div></div>`;
  const mine = (en) => `<div class="msg me"><div class="bw"><div class="who">Ты · бариста</div><div class="bub">${en}</div></div></div>`;
  const chat = `${mine("Hi there! Welcome in. What can I get started for you today?")}${them(P.ira, "I'd like a cappuccino, please.", 'Мне капучино, пожалуйста.')}`;
  const opts = (sel, a, b, c) => `<div class="lk" style="margin-bottom:10px">Ответь Ирине</div><div class="opt t${sel === 0 ? ' sel' : ''}">${a}</div><div class="opt t${sel === 1 ? ' sel' : ''}">${b}</div><div class="opt t${sel === 2 ? ' sel' : ''}">${c}</div><div class="crow" style="margin-top:12px"><div class="c1 t" style="flex:1">Ответить</div><span class="micb t">${gi('mic')}</span></div><div class="s13" style="text-align:center;margin-top:8px;font-weight:700">Или зажми и скажи вслух</div>`;
  const dTurn = () => PH(`${dHead()}${chat}<div style="height:330px"></div>`, { time: '20:10', fixed: `<div class="foot">${opts(0, 'Sure! What size would you like?', 'Sure! What size you like?', 'Sure! Which size is like?')}</div>` });
  const dWait = () => PH(`${dHead(4)}${chat}${mine('Sure! What size would you like?')}<div class="msg"><span style="margin-bottom:2px">${AV(P.ira, 32, { noPin: true })}</span><div class="bw"><div class="who">Ирина · её ход</div><span class="typing"><i></i><i></i><i></i></span></div></div><div style="height:220px"></div>`,
    { time: '20:11', fixed: `<div class="foot"><div class="cd tint crow" style="box-shadow:none">${gi('hourglass', 'font-size:22px;color:var(--acct)')}<div class="cx"><div class="t17">Ход Ирины</div><div class="s14">Напишем, когда ответит · до 20:11 завтра</div></div></div><div class="c2 t" style="margin-top:12px">К друзьям</div></div>` });
  const dHub = (ov) => PH(`<div class="mh"><span class="mrb bare t">${gi('arrowL')}</span><span class="encap">${gi('flash')}4</span></div><div class="st1" style="font-size:34px;line-height:40px">Диалоги</div><div class="ss1">Практикуй язык в жизненных ситуациях</div>
    <div class="cd" style="margin-top:16px"><div class="crow"><img src="${art('dialogs')}" alt="" style="width:55px;height:55px;object-fit:contain"><div class="cx"><div class="t19">Закажи кофе</div><div class="s14">Каждый день · A1 · 5 целей</div></div></div><div class="btnrow" style="margin-top:14px"><div class="sb2 pri t">Начать</div><div class="sb2 t">${gi('people')}С другом</div></div></div>
    <div class="cd" style="margin-top:10px"><div class="crow"><img src="${art('dialogs')}" alt="" style="width:55px;height:55px;object-fit:contain"><div class="cx"><div class="t19">Представиться коллеге</div><div class="s14">Дела · A1 · 6 целей</div></div></div></div>`, { time: '20:05', overlay: ov || '' });
  const dPick = () => dHub(sheet(`<div class="t25" style="margin-top:14px">Сыграть с другом</div><div class="p">«Закажи кофе» на двоих: по очереди, реплики — из готовых. На ход — сутки.</div>${seg(['Я бариста', 'Я гость'], 0)}
    <div style="margin-top:10px">${[[P.ira, 'Диалоги открыты', 1], [P.oleg, 'Диалоги открыты', 0], [P.lida, 'Откроются после урока 3', -1]].map(([p, s, on]) => `<div class="lst"${on < 0 ? ' style="opacity:.45"' : ''}>${AV(p, 40)}<div class="cx"><div class="t17">${p.n}</div><div class="s14">${s}</div></div>${on < 0 ? '' : `<span class="sel-dot${on ? ' on' : ''}">${on ? gi('check') : ''}</span>`}</div>`).join('')}</div>
    <div class="sb2 pri t" style="margin-top:16px">${gi('plane')}Позвать Ирину</div>`, { st: 'max-height:90%' }));
  const alex = (en, ru) => `<div class="msg"><span style="margin-bottom:2px">${AV(P.me, 32)}</span><div class="bw"><div class="who">Алекс · бариста</div><div class="bub">${en}${ru ? `<span class="ru">${ru}</span>` : ''}</div></div></div>`;
  const meGuest = (en) => `<div class="msg me"><div class="bw"><div class="who">Ты · гость</div><div class="bub">${en}</div></div></div>`;
  const dFriend = () => PH(`${dHead(4, 'вдвоём · ты — гость')}${alex('Hi there! Welcome in. What can I get started for you today?')}${meGuest("I'd like a cappuccino, please.")}${alex('Sure! What size would you like?', 'Конечно! Какой размер?')}<div style="height:330px"></div>`,
    { time: '20:30', fixed: `<div class="foot">${opts(1, 'Medium please.', "I'd like a medium, please.", 'I want medium size, please.').replace('Ответь Ирине', 'Ответь Алексу')}</div>`, overlay: push('Алекс ответил', '«Закажи кофе» — твой ход. На ответ сутки.', 'сейчас') });
  const dDone = () => PH(`<div class="ldh"><span class="x t">${gi('close')}</span></div><div class="res"><div class="hero2">${AV(P.me, 64)}<span class="br"></span>${AV(P.ira, 64)}</div><div class="rt" style="margin-top:16px">Диалог пройден вдвоём</div><div class="p">8 ходов · все 5 целей</div></div>
    <div class="stp"><div><b>5</b><small>целей</small></div><div><b class="goodx">7</b><small>верно</small></div><div><b style="color:var(--bad)">1</b><small>ошибок</small></div></div>
    <div class="cd" style="margin-top:12px"><div class="b13">Лучше так · реплика Ирины</div><div class="t17" style="margin-top:6px">I'd like a medium, please.</div><div class="s14" style="margin-top:2px">вместо «Medium please.»</div></div>
    <div class="c1 m t" style="margin-top:16px">${gi('swap')}Поменяться ролями</div><div class="c2 t">Готово</div><div style="height:60px"></div>`, { time: '21:02' });
  const dLate = () => PH(`${dHead(5)}${chat}${mine('Sure! What size would you like?')}<div style="height:300px"></div>`,
    { time: '20:40', fixed: `<div class="foot"><div class="cd crow" style="background:var(--amber);box-shadow:none">${gi('time', 'font-size:22px')}<div class="cx"><div class="t17">Ирина не ответила за сутки</div><div class="s14">Доиграй с Мией или напомни</div></div></div><div class="c1 t" style="margin-top:12px">Доиграть с Мией</div><div class="c2 t">${gi('bell')}Напомнить Ирине</div></div>` });

  add(() => idea({
    id: 'roles', n: 5, title: 'Диалог по ролям',
    pitch: 'Ответ на просьбу «общаться с друзьями на английском». Сценка на двоих: ты — бариста, Ирина — гость. Ходы по очереди, реплика выбирается из трёх готовых (одна верная, две с типичными ошибками) или говорится вслух. Свободного текста между людьми нет — модерировать нечего. До 8 ходов, на ход сутки. Сейчас в «Диалогах» ответы свободные (текст или голос) и сценок с готовыми репликами нет — их нужно написать, отсюда высокая цена.',
    scores: [['Польза', 'высокая'], ['Цена', 'высокая'], ['Риск', 'средний'], ['Firebase', '1 запись на ход']],
    routes: [['«Диалоги» → «С другом»', 'роль и друг', '«Позвать Ирину»', 'твой ход', 'ход Ирины (пуш)', '…', 'диалог пройден вдвоём', '«Поменяться ролями»'], ['Шторка друга → «Диалог»', '!тот же выбор, друг уже выбран'], ['Сутки без ответа', '«Доиграть с Мией» или «Напомнить»']],
    groups: [
      group('Вход и твой ход', [col('«Диалоги» → «С другом»', dHub(), 'новая кнопка на карточке сценки'), col('Выбор роли и друга', dPick()), col('Твой ход', dTurn(), 'три реплики, микрофон'), col('Ход отправлен', dWait(), 'ждём без спиннера')]),
      group('У друга, итог, тишина', [col('Ход у Ирины', dFriend(), 'пуш открывает сразу её ход'), col('Диалог пройден', dDone(), 'как итог диалога: цели · верно · ошибок'), col('Сутки без ответа', dLate(), 'бот Мия доигрывает, как обычный диалог')]),
    ],
    rows: [['«Диалоги» → «С другом»', 'роль, друг → «Позвать»', 'первый ход'], ['Шторка друга → «Диалог»', 'выбор сценки и роли', 'то же'], ['Пуш «твой ход»', 'сценка на нужном ходе', 'ответ → «Ход Ирины»'], ['Последний ход', 'итог вдвоём', '«Поменяться ролями» / «Готово»'], ['Сутки без ответа', 'плашка внизу', '«Доиграть с Мией» / «Напомнить» (1 раз)']],
    firebase: '<b>Firebase.</b> Одна сценка — один документ: 1 запись на ход (≤ 8), по сети только номер реплики. Чтение — при открытии пуша о ходе (≤ 8). Подписок нет. Пуш о ходе — через лимиты и тихие часы friendsNudge. Доигрывание с Мией — существующий бот «Диалогов» и его лимиты. Монет нет.',
  }));

  /* ═════════════ ИДЕЯ 6 · Итог недели друга ═════════════ */
  const wcard = (p, a, b, c, o = {}) => `<div class="cd t" style="flex:0 0 236px;padding:14px;${o.dim ? 'opacity:.8' : ''}"><div class="crow">${AV(p, 40)}<div class="cx"><div class="t17">${p.n}</div><div class="s13">${o.sub || '13–19 октября'}</div></div></div>
    ${o.rest ? `<div class="s14" style="margin-top:12px;min-height:58px">${o.rest}</div><span class="pb soft t" style="margin-top:10px">${gi('bell')}Позвать</span>` : `<div class="crow" style="margin-top:12px;gap:14px"><span class="pf">${gi('flame')}${a}</span><span class="pf">${gi('book', 'color:var(--acct)')}${b}</span><span class="pf">${gi('podium', 'color:var(--acct)')}${c}</span></div><div class="s14" style="margin-top:6px">${o.line}</div><span class="pb ${o.done ? 'done' : 'soft'} t" style="margin-top:10px">${gi(o.done ? 'check' : 'hand')}${o.done ? 'Пять отправлено' : 'Дать пять'}</span>`}</div>`;
  const rail = (o = {}) => `${sect('Итоги недели', 3, '<span class="ac">пн · 9:00</span>')}<div class="crow" style="gap:10px;overflow:hidden;margin:0 -20px;padding:2px 20px 14px">${wcard(P.ira, 48, 9, 7, { line: 'Поднялась на 2 этажа Пика', done: o.done })}${wcard(P.mark, 0, 0, 0, { rest: 'Марк отдыхал на этой неделе. Позовёшь?', dim: 1 })}${wcard(P.lida, 3, 4, 2, { line: 'Первая неделя без пропусков' })}</div>`;
  const wTab = (o = {}) => TAB({ top: rail(o), rows: [R.ira(), R.olegOut()], time: '9:05', dot: !o.done, overlay: o.toast || '' });
  const wDetail = () => TAB({ top: rail(), rows: [R.ira()], time: '9:06', overlay: sheet(`<div class="ctr" style="margin-top:16px">${AV(P.ira, 72)}</div><div class="t25">Неделя Ирины</div><div class="p" style="margin-top:4px">13–19 октября</div>
    <div class="facts"><div><b>48</b><small>дней серии</small></div><div><b>9</b><small>занятий</small></div><div><b>7 ↑2</b><small>этаж Пика</small></div></div>
    <div class="cd" style="margin-top:12px;background:var(--ctl);box-shadow:none"><div class="b13">Лучший день</div><div class="t17" style="margin-top:4px">Пятница · 3 занятия и диалог</div></div>
    <div class="sb2 pri t" style="margin-top:16px">${gi('hand')}Дать пять</div><div class="sb2 t">${gi('shield')}Вызвать на дуэль</div>`) });
  const wMine = () => PH(`<div class="mh"><span class="mrb bare t">${gi('arrowL')}</span></div><div class="st1">Моя неделя</div><div class="ss1">Так её видят друзья в понедельник</div>
    <div class="cd" style="margin-top:16px"><div class="crow">${AV(P.me, 48)}<div class="cx"><div class="t19">Алекс</div><div class="s14">13–19 октября</div></div></div><div class="facts"><div><b>5</b><small>дней серии</small></div><div><b>6</b><small>занятий</small></div><div><b>4</b><small>этаж Пика</small></div></div></div>
    <div class="cd crow" style="margin-top:10px">${PAIR(P.ira, P.oleg, 32)}<div class="cx"><div class="t17">Ирина и Олег дали пять</div><div class="s14">сегодня в 9:12 и 9:40</div></div></div>
    <div class="cd crow" style="margin-top:10px"><span class="ich s">${gi('eye')}</span><div class="cx t17">Показывать друзьям мою неделю</div><span style="width:51px;height:31px;border-radius:16px;background:var(--good);position:relative;flex:none"><span style="position:absolute;right:2px;top:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2)"></span></span></div>`,
  { time: '9:20', fixed: tabbar('settings') });
  const wEmpty = () => TAB({ top: `<div class="cd crow" style="margin-top:8px">${FF.icTile ? FF.icTile('cal', 's') : `<span class="ich s">${gi('cal')}</span>`}<div class="cx"><div class="t17">Итоги недели — в понедельник</div><div class="s14">Первый итог — после 7 дней дружбы</div></div></div>`, rows: [frow(P.den, { sub: 'В друзьях · 2 дня' })], n: 1 });

  add(() => idea({
    id: 'week', n: 6, title: 'Итог недели друга',
    pitch: 'Вместо ленты событий — одна карточка в неделю на друга: серия, занятий за неделю, этаж Пика и одна строка «лучшее за неделю». Появляется в понедельник утром наверху вкладки «Друзья», листается вбок. Реакция — существующая «Дать пять». В «Настройках» видно, как друзья видят твою неделю, и её можно скрыть.',
    scores: [['Польза', 'средняя'], ['Цена', 'низкая'], ['Риск', 'низкий'], ['Firebase', '0 новых чтений']],
    routes: [['Понедельник 9:00', '«Итоги недели» на вкладке', 'карточка друга', '«Дать пять»', 'другу: «{имя} даёт пять» (пуш из кода)'], ['Настройки → «Моя неделя»', 'кто дал пять', '«Показывать друзьям»']],
    groups: [
      group('Вкладка и карточка', [col('Понедельник', wTab(), 'карточки листаются вбок'), col('Неделя Ирины', wDetail(), 'тап по карточке'), col('Пять отправлено', wTab({ done: true, toast: toast('hand', 'Пятюня отправлена') }), 'кнопка меняется сразу')]),
      group('Своя неделя и пусто', [col('Моя неделя', wMine(), 'приватность: можно скрыть'), col('Итогов ещё нет', wEmpty(), 'дружба меньше 7 дней')]),
    ],
    rows: [['Вкладка в понедельник', 'карточки → «Неделя Ирины»', '«Дать пять», «Вызвать на дуэль»'], ['Друг отдыхал', 'карточка «отдыхал»', '«Позвать» (friendsNudge)'], ['Настройки → «Моя неделя»', 'своя карточка, пятёрки', 'переключатель «Показывать друзьям»']],
    firebase: '<b>Firebase: 0 новых чтений.</b> Всё из того же friendsGetProfiles: серия и этаж Пика уже в профиле, «занятий за неделю» добавляет идея 4. Ленты нет — прежняя стоила ~9 000 чтений в сутки. «Дать пять» — существующий friendLikeActivity (кулдаун 6 ч). Скрытие недели — поле в публичном профиле.',
  }));
})();
