/* «Друзья» 2.0 — идея 2 «Урок вместе» и идея 3 «Дуэль на 5 фраз». Тексты занятий и фраз — из курса (Урок 1–2). */
(() => {
  'use strict';
  const { gi, P, AV, PAIR, coinImg, art, PH, tabbar, comTabs, sheet, toast, push, col, group, idea, add, frow, mkr, listHead, R, TAB, HOME, lessonDone, brow, bell, invModal } = FF;

  /* курс: занятие для «Урок вместе» и пять фраз дуэли (release/en/l01, l02) */
  const L = { tag: 'Урок 2 · Занятие 3', t: 'Are you…?', ic: 'help' };
  const PHR = [['I am ready.', 'Я готов / готова.'], ['I am not cold.', 'Мне не холодно.'], ['We are together.', 'Мы вместе.'], ['I am back.', 'Я вернулся / вернулась.'], ['Where is he?', 'Где он?']];

  /* ═════════════ ИДЕЯ 2 · Урок вместе ═════════════ */
  const DONE = { sub: 'Урок 2 · Занятие 3 из 56 · Следующее открыто' };
  const doneInvite = () => lessonDone('', { ...DONE, cta2: `<div class="c2 t" style="margin-top:12px">${gi('personAdd')}Позвать друга на это занятие</div>` });
  const pick = (who, status, on, o = {}) => `<div class="lst"${o.off ? ' style="opacity:.45"' : ''}>${AV(who, 40)}<div class="cx"><div class="t17">${who.n}</div><div class="s14">${status}</div></div>${o.off ? '' : `<span class="sel-dot${on ? ' on' : ''}">${on ? gi('check') : ''}</span>`}</div>`;
  const picker = (o = {}) => lessonDone('', { ...DONE, overlay: sheet(`<div class="t25" style="margin-top:14px">Позвать на занятие</div><div class="p">${L.tag} · ${L.t}. Кто пройдёт его сегодня — получит награду «вместе», и ты тоже.</div>
    <div style="margin-top:12px">${pick(P.ira, 'Урок 2 открыт', 1)}${pick(P.oleg, 'Урок 2 открыт', 1)}${pick(P.mark, 'Уже прошёл · позовём повторить', o.full ? 1 : 0)}${pick(P.lida, 'Урок 2 у Лидии ещё закрыт', 0, { off: true })}</div>
    <div class="sb2 pri t" style="margin-top:16px">${gi('plane')}${o.full ? 'Позвать троих' : 'Позвать двоих'}</div><div class="free">${o.full ? 'Трое — максимум за занятие; остальные строки неактивны' : 'До трёх друзей за занятие'}</div>`, { st: 'max-height:94%' }) });
  const sent = () => lessonDone('', { ...DONE, cta2: `<div class="c2" style="margin-top:12px;color:var(--good)">${gi('check')}Позвал Ирину и Олега</div>`, overlay: toast('plane', 'Приглашения ушли. Напишем, когда пройдут', { bottom: 60 }) });
  const pickEmpty = () => lessonDone('', { ...DONE, overlay: sheet(`<div class="ctr" style="margin-top:20px"><span class="ich" style="width:61px;height:61px;border-radius:16px;background:var(--ctl)">${gi('peopleO', 'font-size:26px')}</span></div><div class="t25">Пока некого позвать</div><div class="p">Добавь друга — и проходите занятия вместе.</div><div class="sb2 pri t" style="margin-top:18px">${gi('personAdd')}Добавить друга</div><div class="sb2 t">Не сейчас</div>`) });
  const invPush = () => HOME({ time: '19:50', overlay: push('Алекс зовёт на занятие', `${L.tag} · ${L.t}. Пройди сегодня — и награда «вместе» вам обоим.`) });
  const invOpen = () => PH(`${comTabs(1)}${listHead('Твои друзья', 3)}${frow(P.me, { flame: 2, fst: 'dim', sub: 'Позвал на занятие', right: mkr('book') })}${frow(P.ira)}${frow(P.den)}<div style="height:120px"></div>`,
    { time: '19:51', fixed: tabbar('community', ['community']), overlay: invModal({ top: AV(P.me, 68), title: 'Алекс зовёт на занятие', body: `${L.tag} · ${L.t}. Пройди сегодня до 23:59.`,
      extra: `<div class="facts" style="margin-top:14px"><div><b style="font-size:18px">6 мин</b><small>у Алекса</small></div><div><b style="font-size:18px">3 ★</b><small>его итог</small></div><div><b style="font-size:18px">+20</b><small>каждому</small></div></div>`,
      pri: `Начать занятие<span class="chipx" style="background:color-mix(in srgb,var(--card) 18%,transparent);color:inherit">${gi('flashO')}1</span>` }) });
  const friendDone = () => lessonDone(`<div class="cd crow" style="padding:12px 14px">${PAIR(P.oleg, P.me, 36)}<div class="cx"><div class="t17">Занятие вместе с Алексом</div><div class="s14">Награда «вместе» вам обоим</div></div><span class="chipx good">+20</span></div>`, { ...DONE, coins: 32, time: '20:14', bal: '640' });
  const yourBell = () => HOME({ time: '9:10', bellDot: 1, overlay: bell(`${brow(PAIR(P.me, P.oleg, 30), 'Олег прошёл занятие вместе с тобой', `${L.t} · +20 монет`, '', { nd: 1 })}${brow(AV(P.ira, 38), 'Ирина не успела на занятие', 'Приглашение закончилось в полночь', '9:00')}${brow(AV(P.mark, 38), 'Марк даёт пять', 'Пятюня получена.', 'вчера')}`, 2) });

  add(() => idea({
    id: 'lesson', n: 2, title: 'Урок вместе',
    pitch: 'После занятия — «Позвать друга на это занятие». Друг проходит его сегодня до полуночи — оба получают награду «вместе». Приглашение не требует ответа: «Не сейчас» ничего не сообщает пригласившему, а в полночь приглашение тихо закрывается строкой в «Сообщениях». Маркер «книга» и окно «Пять минут на практику?» в коде уже есть — не хватает только серверного создания приглашения.',
    scores: [['Польза', 'высокая'], ['Цена', 'низкая'], ['Риск', 'низкий'], ['Firebase', '1 вызов + 1 пуш']],
    routes: [['Финал занятия', '«Позвать друга на это занятие»', 'выбор друзей', 'пуш', 'друг: маркер → «Начать занятие»', 'финал у друга', 'у тебя: «Олег прошёл вместе с тобой»'], ['Шторка друга', '«Урок вместе»', '!тот же выбор, занятие — текущее']],
    groups: [
      group('Вход и выбор', [col('Финал занятия', doneInvite(), 'новая вторичная кнопка под «Продолжить»'), col('Выбор друзей', picker(), 'кому открыт, кто прошёл, у кого закрыт'), col('Выбраны трое', picker({ full: true }), 'предел виден до нажатия'), col('Отправлено', sent(), 'кнопка «Позвал…» сразу'), col('Нет друзей', pickEmpty())]),
      group('У друга', [col('Пуш', invPush()), col('Маркер и окно', invOpen(), 'окно из кода + занятие и награда; энергия как у обычного занятия'), col('Друг прошёл', friendDone(), 'ряд «Занятие вместе» в финале')]),
      group('У тебя', [col('«Сообщения» утром', yourBell(), 'прошёл вместе с тобой · не успела — тихо')]),
    ],
    rows: [['Финал занятия', 'выбор друзей → «Позвал…»', '«Продолжить» — как сейчас'], ['Шторка друга → «Урок вместе»', 'выбор для текущего занятия', 'тост «Приглашения ушли»'], ['Пуш у друга', 'маркер «книга» → окно приглашения', '«Начать занятие» → финал с наградой; «Не сейчас» — тихо'], ['Полночь', 'строка в «Сообщениях»', '—']],
    firebase: '<b>Firebase.</b> Приглашение — 1 вызов функции (уведомление другу, лимит «до трёх за занятие») и 1 пуш. Отдельной коллекции и подписок нет: маркер берётся из уже загружаемых уведомлений. Награда — в том же вызове, что засчитывает занятие у друга. <b>Монеты «вместе» по ECONOMY.md — только после D-решения владельца;</b> без него — та же механика без монет.',
  }));

  /* ═════════════ ИДЕЯ 3 · Дуэль на 5 фраз ═════════════ */
  const vs = (a, b, o = {}) => `<div class="vs"><div class="side">${AV(a, o.s || 56)}<div class="num${o.qa ? ' q' : ''}">${o.a ?? ''}</div>${o.ta ? `<div class="s13">${o.ta}</div>` : ''}</div><div class="mid">${o.mid || 'против'}</div><div class="side">${AV(b, o.s || 56)}<div class="num${o.qb ? ' q' : ''}">${o.b ?? ''}</div>${o.tb ? `<div class="s13">${o.tb}</div>` : ''}</div></div>`;
  const listD = () => [R.ira(), R.markCall(), R.lida()];
  const challenge = (o = {}) => TAB({ rows: listD(), time: '19:20', overlay: sheet(`<div style="margin-top:16px">${vs(P.me, o.friend || P.ira, { s: 60 })}</div><div class="t25">Дуэль с ${o.with || 'Ириной'}</div>
    <div class="facts"><div><b>5</b><small>фраз</small></div><div><b>${o.lessons || '1–2'}</b><small>общие уроки</small></div><div><b>24 ч</b><small>на ответ</small></div></div>
    <div class="p">${o.p || 'Собери пять фраз точнее и быстрее. Ты ходишь первым, Ирина — когда откроет вызов.'}</div>
    ${o.off ? `<div class="sb2 off" style="margin-top:18px">Пока нет общих занятий</div><div class="sb2 t">${gi('book')}Позвать Лидию на занятие</div>` : `<div class="sb2 pri t" style="margin-top:18px">${gi('shield')}Начать дуэль</div><div class="free">Без энергии · три вызова в день</div><div class="sb2 t" style="margin-top:12px">Позже</div>`}`) });
  const dTop = (n, t = '0:14') => `<div class="tvtop"><span class="mrb t" style="background:var(--ctl);box-shadow:none">${gi('close')}</span><div class="tvp"><div class="trk2"><i class="me" style="width:${n / 5 * 100}%"></i></div><div class="tvn">Дуэль с Ириной · ${n} из 5</div></div><span class="timer">${gi('timer')}${t}</span></div>`;
  const chips = (arr, o = {}) => arr.map(([w, g]) => `<span class="chip${g ? ' gh' : ''}"${o.ok ? ' style="background:color-mix(in srgb,var(--good) 14%,var(--ctl));color:var(--good)"' : ''}>${w}</span>`).join('');
  const duelQ = () => PH(`${dTop(2)}<div class="todo"><span class="ti">${gi('puzzle')}</span><div class="tt">Собери фразу</div></div><div class="sit"><div class="k">${gi('chatDots', 'font-size:15px')}Ситуация</div><div class="v">Коллега предлагает тебе свой свитер.</div></div>
    <div class="goal"><div class="k">Скажи по-английски</div><div class="v">${PHR[1][1]}</div></div><div class="ans">${chips([['I'], ['am']])}</div><div class="bank">${chips([['I', 1], ['am', 1], ['not'], ['cold'], ['is'], ['hot']])}</div><div style="height:140px"></div>`,
  { time: '19:21', fixed: '<div class="foot"><div class="c1 off">Проверить</div></div>' });
  const duelOk = () => PH(`${dTop(2, '0:07')}<div class="todo"><span class="ti">${gi('puzzle')}</span><div class="tt">Собери фразу</div></div><div class="goal"><div class="k">Скажи по-английски</div><div class="v">${PHR[1][1]}</div></div><div class="ans">${chips([['I'], ['am'], ['not'], ['cold']], { ok: 1 })}</div>
    <div class="lane ok"><b>Верно · 7 секунд</b><p>not стоит сразу после am: I am not cold.</p></div><div style="height:140px"></div>`, { time: '19:21', fixed: '<div class="foot"><div class="c1 t">Дальше</div></div>' });
  const marks = (arr) => arr.map((m) => `<span class="mk ${m === 1 ? 'ok' : m === 0 ? 'no' : 'wait'}">${gi(m === 1 ? 'check' : m === 0 ? 'close' : 'hourglass')}</span>`).join('');
  const qTable = (a, b) => `<div class="cd" style="margin-top:16px;padding:12px 16px 4px"><div class="colh"><span>Фраза</span><span>Ты</span><span>Ир.</span></div>${PHR.map((p, i) => `<div class="qr"><div><div class="en">${p[0]}</div><div class="ru">${p[1]}</div></div>${marks([a[i], b[i]])}</div>`).join('')}</div>`;
  const resHead = (body, o = {}) => `<div class="ldh"><span class="x t">${gi('close')}</span>${o.right || ''}</div><div class="res" style="padding-top:4px">${body}</div>`;
  const waiting = (o = {}) => PH(`${resHead(`${vs(P.me, P.ira, { a: 4, b: '?', qb: 1, ta: '0:48', tb: 'ходит', mid: 'ход отправлен' })}<div class="rt" style="margin-top:12px">${o.offline ? 'Ход готов' : 'Ждём Ирину'}</div><div class="p">${o.offline ? 'Как только телефон выйдет в сеть, Ирина получит вызов.' : 'У Ирины сутки. Напишем, когда будет итог.'}</div>`)}
    ${o.offline ? `<div class="offl">${gi('offline')}Ход сохранён на телефоне</div>` : ''}${qTable([1, 1, 0, 1, 1], [2, 2, 2, 2, 2])}<div class="c1 m t" style="margin-top:16px">К друзьям</div><div style="height:60px"></div>`, { time: '19:23' });
  const incoming = () => PH(`${comTabs(1)}${listHead('Твои друзья', 4)}${frow(P.me, { flame: 12, sub: 'Вызвал на дуэль', right: mkr('shield', { bd: 'flash', tm: '23 ч' }) })}${frow(P.mark)}<div style="height:120px"></div>`,
    { time: '19:40', fixed: tabbar('community', ['community']), overlay: sheet(`<div style="margin-top:16px">${vs(P.me, P.ira, { s: 60, a: '?', qa: 1 })}</div><div class="t25">Алекс вызывает на дуэль</div><div class="p">Пять фраз из уроков 1–2, которые вы оба прошли. Счёт Алекса откроется после твоего хода.</div>
      <div class="facts"><div><b>5</b><small>фраз</small></div><div><b>23 ч</b><small>осталось</small></div><div><b>0</b><small>энергии</small></div></div>
      <div class="sb2 pri t" style="margin-top:18px">${gi('shield')}Принять</div><div class="sb2 t">Отказаться</div>`) });
  const result = (win) => PH(`${resHead(`${vs(P.me, P.ira, win ? { a: 4, b: 3, ta: '0:48', tb: '1:05', mid: 'итог' } : { a: 3, b: 4, ta: '1:10', tb: '0:52', mid: 'итог' })}<div class="rt" style="margin-top:10px">${win ? 'Победа' : 'Ирина взяла эту дуэль'}</div><div class="p" style="margin-top:6px">${win ? 'Точность решила: 4 из 5 против 3.' : '3 из 5 — две фразы разберём и возьмём реванш.'}</div>`, { right: `<span class="x t">${gi('shareO')}</span>` })}
    ${qTable(win ? [1, 1, 0, 1, 1] : [1, 0, 1, 0, 1], win ? [1, 0, 1, 1, 0] : [1, 1, 1, 0, 1])}<div class="c1 m t" style="margin-top:16px">${gi('repeat')}Реванш</div><div class="c2 t">Разобрать ${win ? 'ошибку' : 'ошибки'}</div><div style="height:60px"></div>`, { time: '20:02' });
  const quietEnds = () => HOME({ time: '19:52', bellDot: 1, overlay: bell(`${brow(AV(P.ira, 38, { off: true }), 'Ирина не приняла дуэль', 'Можно вызвать снова завтра', '', { nd: 1 })}${brow(AV(P.mark, 38, { off: true }), 'Марк не ответил за сутки', 'Дуэль закрыта · твои 4 из 5 сохранены', '9:00')}${brow(AV(P.oleg, 38), 'Итог дуэли с Олегом', 'Ты победил: 5 из 5 против 4', 'вчера')}`, 1) });

  add(() => idea({
    id: 'duel', n: 3, title: 'Дуэль на 5 фраз',
    pitch: 'Ответ на просьбу «играть с друзьями». Асинхронно: ты собираешь 5 фраз из уроков, которые прошли оба, друг — те же 5, когда откроет вызов. Побеждает точность, при равенстве — время. Реванш в одно касание. Без энергии, три вызова в день. Значок — щит с молнией, как у маркера дуэли в коде (старые «живые» дуэли выключены, маркер остался).',
    scores: [['Польза', 'высокая'], ['Цена', 'средняя'], ['Риск', 'средний'], ['Firebase', '2 записи + 1 чтение']],
    routes: [['Шторка друга или визитка', '«Дуэль»', 'вызов', '5 фраз', '«Ждём Ирину»', 'пуш другу', 'маркер → «Принять»', '5 фраз', 'итог у обоих', '«Реванш»'], ['Отказ или сутки', '!строка в «Сообщениях»', '«Вызвать снова»']],
    groups: [
      group('Вызов и ход', [col('Вызов', challenge(), 'из шторки друга или визитки'), col('Фраза 2 из 5', duelQ(), 'задание «Собери фразу» из уроков'), col('Верно', duelOk()), col('Ход отправлен', waiting(), 'свои отметки видны, чужие ждут')]),
      group('У друга и итог', [col('Вызов у Ирины', incoming(), 'маркер «щит» с временем'), col('Победа', result(true)), col('Поражение', result(false), 'без упрёка, с разбором')]),
      group('Отказ, срок, нет занятий, нет сети', [col('«Сообщения»', quietEnds(), 'отказ и сутки — тихой строкой'), col('Нет общих занятий', challenge({ friend: P.lida, with: 'Лидией', lessons: '—', off: true, p: 'Лидия только начала: у вас пока нет общих пройденных занятий. Позови её на занятие — и дуэль откроется.' })), col('Ход без сети', waiting({ offline: true }), 'ход хранится на телефоне')]),
    ],
    rows: [['Шторка друга → «Дуэль»', 'вызов → 5 фраз → «Ждём Ирину»', '«К друзьям»; у друга маркер «щит»'], ['Визитка → «Вызвать на дуэль»', 'то же', 'то же'], ['Маркер «щит» у друга', 'шторка вызова → 5 фраз', 'итог у обоих'], ['Итог', 'счёт, фразы', '«Реванш» (первым ходит друг) или «Разобрать ошибки» → повторение'], ['Отказ / сутки', 'строка в «Сообщениях»', 'вызвать снова']],
    firebase: '<b>Firebase.</b> Одна дуэль — один документ: создание с id пяти фраз (1 запись), ход друга (1 запись), итог читается один раз при открытии пуша (1 чтение). Тексты фраз — из курса на телефоне, по сети только id. Подписок нет. Лимит «3 в день» и закрытие по сроку — в функции, срок закрывает плановая функция раз в час пачкой. Монет за победу нет (ECONOMY.md); добавить можно только D-решением.',
  }));
})();
