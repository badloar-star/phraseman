/* lesson-redesign.js — данные и отрисовка макетов экрана «Урок» 2.0 (lesson-screen-redesign.html, lesson-episode-cards.html).
   Данные настоящие (22.10): названия уроков, глав и эпизодов — modules/learning-v2/content/session_titles_v1.generated.ts,
   фразы и число заданий — content/learning-v2-course/release/en/l0N/sNN/learner.json и season_preview_fixtures.ts.
   Короткие названия (≤ 2 слов, правило владельца 22.10) — предложение; исходное название рядом, в таблице. */
(function () {
  'use strict';

  const ICON = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" fill="currentColor" stroke="none"/>',
    words: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    theory: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    exam: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    speak: '<path d="M4 10v4h3l5 4V6L7 10z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  };
  const ic = (name, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const two = (n) => String(n).padStart(2, '0');

  /* ── данные ── */
  const L2 = {
    n: 2,
    title: 'Знакомство с городом',
    topic: 'Present be · вопросы и короткие ответы',
    words: 12,
    chapters: [
      { n: 1, name: 'Утро субботы', full: 'Утро субботы, хостел' },
      { n: 2, name: 'Кафе', full: 'Кафе, разглядываем людей' },
      { n: 3, name: 'Ищем дорогу', full: 'Ищем дорогу' },
      { n: 4, name: 'Меню и вывески', full: 'Меню, ценники, вывески' },
      { n: 5, name: 'Вечеринка', full: 'Вечеринка у соседей' },
      { n: 6, name: 'Воскресное утро', full: 'Воскресное утро, сомнения' },
      { n: 7, name: 'Итог недели', full: 'Воскресный вечер, итог недели' },
    ],
    ch: {
      1: [
        { n: 1, t: 'Ранний вопрос', o: 'Сосед по комнате будит вопросом', p: 'I am not sure.', k: 21 },
        { n: 2, t: 'Шумный завтрак', o: 'Завтрак, спрашиваем всех подряд', p: 'I am not confident.', k: 21 },
        { n: 3, t: 'Короткий ответ', o: 'Как отвечать коротко, а не целой фразой', p: 'He is not aware.', k: 21 },
        { n: 4, t: 'Общая кухня', o: 'Общая кухня хостела, все говорят разом', p: 'It is not visible.', k: 21 },
        { n: 5, t: 'Порядок слов', o: 'Ловушки: You are ready? вместо Are you ready?', p: 'It is not real.', k: 21 },
        { n: 6, t: 'Случайный прохожий', o: 'Спрашиваем прохожего', p: 'They are not fake.', k: 21 },
        { n: 7, t: 'Суббота разгоняется', o: 'Суббота набирает ход', p: 'It is not necessary.', k: 21 },
        { n: 8, t: 'Десять вопросов', o: 'Десять вопросов соседу за завтраком', p: 'She is not interested.', k: 21 },
      ],
      2: [
        { n: 9, t: 'Кто это?', o: 'Спутник кивает на человека за столиком', p: 'Is it possible?', k: 21 },
        { n: 10, t: 'Шумное кафе', o: 'Тут всегда так шумно?', p: 'It is impossible.', k: 21 },
        { n: 11, t: 'Про третьего', o: 'Короткий ответ про третьего', p: 'Is it urgent?', k: 21 },
        { n: 12, t: 'Через столик', o: 'Вопрос через столик, шумно', p: 'It is private.', k: 21 },
        { n: 13, t: 'Ловушка He', o: 'Ловушки: He is tired?', p: 'Is it shady?', k: 21 },
        { n: 14, t: 'Ещё продаётся?', o: 'Это ещё продаётся?', p: 'It is obvious.', k: 21 },
        { n: 15, t: 'Обеденное кафе', o: 'Кафе к обеду', p: 'She is silent.', k: 21 },
        { n: 16, t: 'Угадай кто', o: 'Угадать десять человек по описанию', p: 'Is it possible?', k: 21 },
      ],
    },
  };
  const L1 = {
    n: 1,
    title: 'Первая неделя в Дублине',
    topic: 'Present be · утверждение и not',
    words: 8,
    chapters: [{ n: 1, name: 'Первый рабочий день', full: 'Первый рабочий день' }],
    ch: {
      1: [
        { n: 1, t: 'Первый пропуск', o: 'Вошли в офис', p: 'I am here.', k: 20 },
        { n: 2, t: 'Долгий день', o: 'День продолжается', p: 'I am busy.', k: 21 },
        { n: 3, t: 'Добрый босс', o: 'Заботливый начальник', p: 'I am not sure.', k: 21 },
        { n: 4, t: 'Планёрка вслух', o: 'Утренняя планёрка вслух', p: 'I am early.', k: 21 },
        { n: 5, t: 'Хитрые ловушки', o: 'Типичные ошибки: I fine, I no sure', p: 'I am new.', k: 21 },
        { n: 6, t: 'Звонок другу', o: 'Вечером в квартире, звонок другу', p: 'I am home.', k: 20 },
        { n: 7, t: 'Всё вперемешку', o: 'Конец дня, всё вперемешку', p: 'I am full.', k: 18 },
        { n: 8, t: 'Десять вопросов', o: 'Итог первого дня: ответить на 10 вопросов о себе', p: 'I am excited.', k: 25 },
      ],
    },
  };
  /** Состояние для кадров: глава 1 — пройдено 3, дальше 4-й, остальное закрыто; главы 2–7 закрыты до экзамена главы 1. */
  const DONE = 3;
  const stateOf = (chapter, ep) => (chapter > 1 ? 'locked' : ep.n <= DONE ? 'done' : ep.n === DONE + 1 ? 'next' : 'locked');
  const minutes = (k) => Math.round(k / 3);
  /** «21 задание», «22 задания», «25 заданий». */
  const tasks = (k) => {
    const d = k % 10;
    const h = k % 100;
    const word = d === 1 && h !== 11 ? 'задание' : d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'задания' : 'заданий';
    return `${k} ${word}`;
  };

  /* ── общие куски ── */
  const statusBar = () => `<div class="sb"><span>9:41</span><span class="sbr">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M1.5 4.2a9.5 9.5 0 0 1 13 0"/><path d="M4 7a6 6 0 0 1 8 0"/><circle cx="8" cy="10" r="1" fill="currentColor"/></svg>
    <svg width="26" height="12" viewBox="0 0 26 12" fill="none" aria-hidden="true"><rect x="0.8" y="0.8" width="21.4" height="10.4" rx="3" stroke="currentColor" stroke-opacity=".45"/><rect x="2.5" y="2.5" width="16" height="7" rx="1.6" fill="currentColor"/><rect x="23.4" y="4" width="1.8" height="4" rx=".9" fill="currentColor" fill-opacity=".45"/></svg>
  </span></div>`;
  const phone = (inner, cls = '') => `<div class="dev ${cls}">${statusBar()}<div class="scr">${inner}</div><div class="home"></div></div>`;
  const header = (L) => `<div class="hdr">
    <button class="rb" aria-label="Назад">${ic('back', 22)}</button>
    <button class="lp">Урок ${L.n} ${ic('down', 18)}</button>
    <div class="sp"></div>
    <div class="stat"><span class="en">${ic('bolt', 18)}<b>5</b></span><span class="co"><img src="assets/coin_rank_02.webp" alt="">300</span></div>
  </div>`;
  const titleBlock = (L) => `<div class="lt"><div class="h1">${esc(L.title)}</div><div class="cap">${esc(L.topic)}</div></div>`;
  const stateIcon = (s, n) => (s === 'done' ? ic('check', 18) : s === 'locked' ? ic('lock', 16) : `${n}`);
  const node = (s, n) => `<div class="st ${s}">${stateIcon(s, n)}</div>`;
  const dock = (label, icon = 'play', extra = '') => `<div class="dock">${extra}<button class="btn">${ic(icon, 18)}${esc(label)}</button></div>`;
  const tools = (L, style = '') => `<div class="tools pad" style="${style}"><button class="btn2">${ic('words', 20)}Слова <span class="n">${L.words}</span></button><button class="btn2">${ic('theory', 20)}Теория</button></div>`;
  const progressBar = (done) =>
    `<div style="display:flex;gap:4px;margin-top:12px">${Array.from({ length: 8 }, (_, i) => {
      const bg = i < done ? 'var(--acc)' : i === done ? 'color-mix(in srgb, var(--acc) 32%, var(--ctl))' : 'var(--ctl)';
      return `<span style="flex:1;height:6px;border-radius:3px;background:${bg}"></span>`;
    }).join('')}</div>`;
  const chapterCard = (L, ch, done, style = '') => `<button class="card" style="display:block;width:calc(100% - 32px);margin:14px 16px 0;padding:12px 14px;text-align:left;${style}">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="width:44px;height:44px;border-radius:14px;background:var(--accTile);color:var(--accTx);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800">${ch.n}</span>
        <span style="flex:1;min-width:0"><span class="kick" style="display:block">Глава ${ch.n} из 7</span><span class="t16 ell" style="display:block">${esc(ch.full)}</span></span>
        <span class="t13" style="display:inline-flex;align-items:center;gap:4px">${done} из 8 ${ic('down', 18)}</span>
      </div>${progressBar(done)}</button>`;

  /* ── вариант A «Маршрут»: список-маршрут главы, глава — шторкой ── */
  function routeRow(ch, ep, opts = {}) {
    const s = stateOf(ch, ep);
    const sub = s === 'done' ? 'Пройден' : s === 'locked' ? (ep.n === DONE + 2 ? `После эпизода ${DONE + 1}` : 'Закрыт') : ep.p;
    if (s === 'next' && !opts.plain) {
      return `<div class="card" style="margin:4px 0 6px 40px;padding:12px 14px;display:flex;align-items:center;gap:12px;position:relative">
        <span style="position:absolute;left:-40px;top:50%;margin-top:-16px">${node('next', ep.n)}</span>
        <span style="flex:1;min-width:0"><span class="kick" style="display:block">Дальше · эпизод ${ep.n}</span><span class="t16" style="display:block">${esc(ep.t)}</span>
        <span class="t13" style="display:flex;align-items:center;gap:6px;margin-top:2px">${ic('speak', 16)}${esc(ep.p)}</span></span>
        <span class="t13">${tasks(ep.k)}</span></div>`;
    }
    if (opts.open) {
      return `<div class="card tap" style="margin:4px 0 6px 40px;padding:12px 14px;position:relative">
        <span style="position:absolute;left:-40px;top:14px">${node(s, ep.n)}</span>
        <span class="kick" style="display:block;color:var(--good)">Пройден · эпизод ${ep.n}</span>
        <span class="t16" style="display:block">${esc(ep.t)}</span>
        <span class="t13" style="display:flex;align-items:center;gap:6px;margin-top:2px">${ic('speak', 16)}${esc(ep.p)}</span>
        <div style="display:flex;gap:8px;margin-top:12px"><span class="chip">${tasks(ep.k)}</span><span class="chip">${ic('words', 16)}Слова эпизода</span></div></div>`;
    }
    return `<div style="display:flex;align-items:center;gap:12px;height:56px">
      ${node(s, ep.n)}<span style="flex:1;min-width:0"><span class="t16 ell ${s === 'locked' ? 'mute' : ''}" style="display:block">${esc(ep.t)}</span><span class="t13 ell" style="display:block">${esc(sub)}</span></span>
      <span class="t13">${two(ep.n)}</span></div>`;
  }
  function routeList(L, ch, opts = {}) {
    const eps = L.ch[ch];
    const rows = eps.map((ep) => routeRow(ch, ep, { open: opts.openN === ep.n, plain: opts.openN != null })).join('');
    const exam = `<div style="display:flex;align-items:center;gap:12px;height:56px">${`<div class="st exam">${ic('exam', 16)}</div>`}
      <span style="flex:1"><span class="t16 mute" style="display:block">Экзамен главы</span><span class="t13" style="display:block">После 8 эпизодов</span></span></div>`;
    return `<div class="pad" style="position:relative;margin-top:14px">
      <span style="position:absolute;left:31px;top:14px;bottom:14px;width:2px;border-radius:1px;background:var(--ctl)"></span>
      <span style="position:absolute;left:31px;top:14px;height:${56 * DONE}px;width:2px;border-radius:1px;background:var(--acc)"></span>
      <div style="position:relative">${rows}${exam}</div></div>`;
  }
  function chaptersSheet(L, opts = {}) {
    const rows = L.chapters.map((c) => {
      const cur = c.n === 1;
      const sub = cur ? `${DONE} из 8 · сейчас` : c.n === 2 ? 'Откроется после экзамена главы 1' : `После главы ${c.n - 1}`;
      return `<div style="display:flex;align-items:center;gap:12px;min-height:60px;padding:9px 12px;border-radius:18px;background:${cur ? 'var(--accSoft)' : 'var(--card)'};${cur ? '' : 'box-shadow:var(--sh);'}">
        <span style="width:40px;height:40px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;background:${cur ? 'var(--acc)' : 'var(--ctl)'};color:${cur ? 'var(--accInk)' : 'var(--mut)'}">${c.n}</span>
        <span style="flex:1;min-width:0"><span class="t16 ${cur ? '' : 'mute'}" style="display:block">${esc(c.full)}</span><span class="t13 ${cur ? 'accTx' : ''}" style="display:block">${sub}</span></span>
        <span class="${cur ? '' : 'mute'}">${cur ? ic('right', 20) : ic('lock', 18)}</span></div>`;
    }).join('<div style="height:8px"></div>');
    return `<div class="veil"></div><div class="sheet"><div class="grab"></div>
      <div class="shead"><span class="t">${opts.title || `Главы урока ${L.n}`}</span><button class="xb" aria-label="Закрыть">${ic('x', 18)}</button></div>${rows}</div>`;
  }
  const A = {
    f1: (L) => phone(`${header(L)}${titleBlock(L)}${chapterCard(L, L.chapters[0], DONE)}${tools(L, 'margin-top:12px')}${routeList(L, 1)}${dock('Продолжить эпизод 4')}`),
    f2: (L) => phone(`${header(L)}${titleBlock(L)}${chapterCard(L, L.chapters[0], DONE, 'box-shadow:0 0 0 2px color-mix(in srgb, var(--tx) 55%, transparent), var(--sh)')}${tools(L, 'margin-top:12px')}${routeList(L, 1)}${dock('Продолжить эпизод 4')}${chaptersSheet(L)}`),
    f3: (L) => phone(`${header(L)}${titleBlock(L)}${chapterCard(L, L.chapters[0], DONE)}${tools(L, 'margin-top:12px')}${routeList(L, 1, { openN: 2 })}${dock('Повторить эпизод 2', 'replay')}`),
  };

  /* ── вариант B «Билеты»: широкие полосы-билеты, глава листается ‹ › ── */
  const TICKET_MASK = 'radial-gradient(circle at 62px 0, transparent 8px, #000 8.5px) top / 100% 51% no-repeat, radial-gradient(circle at 62px 100%, transparent 8px, #000 8.5px) bottom / 100% 51% no-repeat';
  function ticket(ch, ep, opts = {}) {
    const s = opts.forceLocked ? 'locked' : stateOf(ch, ep);
    const next = s === 'next';
    const numColor = s === 'done' ? 'var(--good)' : next ? 'var(--accTx)' : 'var(--mut)';
    const right = s === 'done' ? `<span style="color:var(--good)">${ic('check', 20)}</span>` : s === 'locked' ? `<span class="mute">${ic('lock', 18)}</span>` : `<span class="st next" style="width:36px;height:36px;border-radius:18px">${ic('play', 16)}</span>`;
    const bg = next ? 'color-mix(in srgb, var(--acc) 9%, var(--card))' : 'var(--card)';
    // вырезы билета — маской; тень — drop-shadow на обёртке (повторяет форму с вырезами), кольцо выбора — outline обёртки
    const ring = opts.tap ? 'outline:2px solid color-mix(in srgb, var(--tx) 55%, transparent);outline-offset:3px;' : '';
    return `<div style="border-radius:18px;${ring}filter:drop-shadow(0 8px 12px color-mix(in srgb, var(--shTint) 18%, transparent))">
      <div style="position:relative;display:flex;align-items:stretch;min-height:${next ? 84 : 64}px;border-radius:18px;background:${bg};-webkit-mask:${TICKET_MASK};mask:${TICKET_MASK}">
      <span style="width:62px;flex:none;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;color:${numColor}">${two(ep.n)}</span>
      <span style="width:0;border-left:2px dotted var(--line);margin:12px 0"></span>
      <span style="flex:1;min-width:0;padding:10px 12px 10px 14px;display:flex;flex-direction:column;justify-content:center">
        ${next ? '<span class="kick">Дальше</span>' : ''}<span class="t16 ell ${s === 'locked' ? 'mute' : ''}">${esc(ep.t)}</span><span class="t13 ell">${esc(s === 'locked' && !next ? (ep.n === DONE + 2 && ch === 1 ? `После эпизода ${DONE + 1}` : ep.p) : ep.p)}</span></span>
      <span style="display:flex;align-items:center;padding-right:14px">${right}</span></div></div>`;
  }
  const pager = (c, total = 7) => `<div class="card" style="margin:14px 16px 0;padding:10px;display:flex;align-items:center;gap:8px">
      <button class="xb" style="width:40px;height:40px;border-radius:20px" aria-label="Предыдущая глава">${ic('left', 20)}</button>
      <span style="flex:1;min-width:0;text-align:center"><span class="kick" style="display:block">Глава ${c.n} из ${total}</span><span class="t16 ell" style="display:block">${esc(c.full)}</span>
        <span style="display:flex;justify-content:center;gap:5px;margin-top:6px">${Array.from({ length: total }, (_, i) => `<span style="height:6px;width:${i + 1 === c.n ? 18 : 6}px;border-radius:3px;background:${i + 1 === c.n ? 'var(--acc)' : 'var(--ctl)'}"></span>`).join('')}</span></span>
      <button class="xb" style="width:40px;height:40px;border-radius:20px" aria-label="Следующая глава">${ic('right', 20)}</button></div>`;
  const chipsTools = (L, extra = '') => `<div class="pad" style="display:flex;gap:8px;margin-top:12px">${extra}<span class="chip">${ic('words', 16)}Слова ${L.words}</span><span class="chip">${ic('theory', 16)}Теория</span></div>`;
  const ticketList = (L, ch, opts = {}) => `<div class="pad" style="display:flex;flex-direction:column;gap:10px;margin-top:14px">${L.ch[ch].map((ep) => ticket(ch, ep, { tap: opts.tapN === ep.n, forceLocked: ch > 1 })).join('')}</div>`;
  const lockedChapterNote = (c) => `<div class="card" style="margin:14px 16px 0;padding:14px;display:flex;align-items:center;gap:12px">
      <span class="st locked" style="width:40px;height:40px;border-radius:12px">${ic('lock', 18)}</span>
      <span style="flex:1;min-width:0"><span class="t16" style="display:block">Глава ${c.n} пока закрыта</span><span class="t13" style="display:block">Откроется после экзамена главы ${c.n - 1}</span></span>
      <button class="chip">К главе 1</button></div>`;
  function episodeSheet(ep, state) {
    const done = state === 'done';
    return `<div class="veil"></div><div class="sheet"><div class="grab"></div>
      <div class="shead"><span class="t">Эпизод ${ep.n}</span><button class="xb" aria-label="Закрыть">${ic('x', 18)}</button></div>
      <div class="card" style="padding:16px">
        <span class="kick" style="display:block;${done ? 'color:var(--good)' : ''}">${done ? 'Пройден' : 'Дальше'}</span>
        <span style="display:block;font-size:24px;line-height:30px;font-weight:800;letter-spacing:-.3px;margin-top:2px">${esc(ep.t)}</span>
        <span style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:16px;line-height:22px">${ic('speak', 20)}${esc(ep.p)}</span>
        <div style="display:flex;gap:8px;margin-top:14px"><span class="chip">${tasks(ep.k)}</span><span class="chip">≈ ${minutes(ep.k)} мин</span></div></div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
        <button class="btn">${ic(done ? 'replay' : 'play', 18)}${done ? 'Повторить эпизод' : 'Начать эпизод'}</button>
        <button class="btn2">${ic('words', 20)}Слова эпизода</button></div></div>`;
  }
  const B = {
    f1: (L) => phone(`${header(L)}${titleBlock(L)}${pager(L.chapters[0])}${chipsTools(L, `<span class="chip on">${DONE} из 8</span>`)}${ticketList(L, 1)}${dock('Продолжить эпизод 4')}`),
    f2: (L) => phone(`${header(L)}${titleBlock(L)}${pager(L.chapters[1])}${lockedChapterNote(L.chapters[1])}${ticketList(L, 2)}${dock('Продолжить эпизод 4')}`),
    f3: (L) => phone(`${header(L)}${titleBlock(L)}${pager(L.chapters[0])}${chipsTools(L, `<span class="chip on">${DONE} из 8</span>`)}${ticketList(L, 1, { tapN: 2 })}${dock('Продолжить эпизод 4')}${episodeSheet(L.ch[1][1], 'done')}`),
  };

  /* ── вариант C «Станции»: глава — чипы, эпизоды — станции на линии, выбранная станция — карточкой ── */
  const chapterChips = (L, sel) => `<div style="display:flex;gap:8px;padding:0 16px;margin-top:14px;overflow:hidden">${L.chapters.map((c) => {
    const on = c.n === sel;
    const lockedCh = c.n > 1;
    return `<span class="chip ${on ? 'on' : lockedCh ? 'off' : ''}">${lockedCh && !on ? ic('lock', 14) : ''}${c.n} · ${esc(c.name)}</span>`;
  }).join('')}</div>`;
  function stationsLine(L, ch, sel) {
    const eps = L.ch[ch];
    const items = eps.map((ep) => ({ ep, s: stateOf(ch, ep) })).concat([{ exam: true, s: 'exam' }]);
    const stops = items.map((it, i) => {
      const left = `calc(${(i / (items.length - 1)) * 100}%)`;
      const selected = it.ep && it.ep.n === sel;
      let dot;
      if (it.exam) dot = `<span class="st exam" style="width:30px;height:30px">${ic('exam', 15)}</span>`;
      else if (it.s === 'next') dot = `<span class="st next" style="width:40px;height:40px;border-radius:20px;font-size:16px;box-shadow:0 0 0 6px color-mix(in srgb, var(--acc) 20%, transparent)">${it.ep.n}</span>`;
      else if (it.s === 'done') dot = `<span class="st done ${selected ? 'tap' : ''}" style="width:30px;height:30px">${ic('check', 16)}</span>`;
      else dot = `<span class="st locked" style="width:26px;height:26px;font-size:13px">${it.ep.n}</span>`;
      const label = it.exam ? 'Экз.' : String(it.ep.n);
      return `<span style="position:absolute;left:${left};top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;width:40px">
        <span style="height:40px;display:flex;align-items:center">${dot}</span><span class="t13" style="font-weight:700;${it.s === 'next' || selected ? 'color:var(--tx)' : ''}">${label}</span></span>`;
    }).join('');
    const doneShare = ch > 1 ? 0 : (DONE / 8) * 100;
    return `<div class="card" style="margin:12px 16px 0;padding:18px 26px 14px">
      <div style="position:relative;height:66px">
        <span style="position:absolute;left:0;right:0;top:18px;height:4px;border-radius:2px;background:var(--ctl)"></span>
        <span style="position:absolute;left:0;width:${doneShare}%;top:18px;height:4px;border-radius:2px;background:var(--acc)"></span>
        ${stops}</div></div>`;
  }
  function stationCard(ep, s) {
    const kick = s === 'done' ? `<span class="kick" style="color:var(--good)">Эпизод ${ep.n} · пройден</span>` : `<span class="kick">Эпизод ${ep.n} · дальше</span>`;
    return `<div class="card ${s === 'done' ? 'tap' : ''}" style="margin:12px 16px 0;padding:18px">
      ${kick}<div style="font-size:24px;line-height:30px;font-weight:800;letter-spacing:-.3px;margin-top:2px">${esc(ep.t)}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:16px;line-height:22px">${ic('speak', 20)}${esc(ep.p)}</div>
      <div style="display:flex;gap:8px;margin-top:14px"><span class="chip">${tasks(ep.k)}</span><span class="chip">≈ ${minutes(ep.k)} мин</span></div></div>`;
  }
  // «Слова» и «Теория» — внизу над главной кнопкой: зона большого пальца, карточка станции остаётся главной наверху
  const dockTools = (L) => tools(L, 'padding:0');
  const C = {
    f1: (L) => phone(`${header(L)}${titleBlock(L)}${chapterChips(L, 1)}${stationsLine(L, 1, 4)}${stationCard(L.ch[1][3], 'next')}${dock('Начать эпизод 4', 'play', dockTools(L))}`),
    f2: (L) => phone(`${header(L)}${titleBlock(L)}${chapterChips(L, 2)}${stationsLine(L, 2, null)}${lockedChapterNote(L.chapters[1])}${dock('Продолжить эпизод 4', 'play', dockTools(L))}`),
    f3: (L) => phone(`${header(L)}${titleBlock(L)}${chapterChips(L, 1)}${stationsLine(L, 1, 2)}${stationCard(L.ch[1][1], 'done')}${dock('Повторить эпизод 2', 'replay', dockTools(L))}`),
  };

  /* ── вариант D «Плитки»: глава — сегменты 1–7, эпизоды — плоские плитки 2 в ряд ── */
  const segments = (sel) => `<div style="margin:14px 16px 0;height:44px;border-radius:22px;background:var(--ctl);padding:4px;display:flex;gap:2px">${Array.from({ length: 7 }, (_, i) => {
    const n = i + 1;
    const on = n === sel;
    return `<span style="flex:1;border-radius:18px;display:flex;align-items:center;justify-content:center;gap:2px;font-size:16px;font-weight:700;${on ? 'background:var(--card);box-shadow:var(--sh);color:var(--tx)' : n > 1 ? 'color:var(--mut)' : ''}">${n}</span>`;
  }).join('')}</div>`;
  const chapterLine = (L, c, right) => `<div class="pad" style="display:flex;align-items:center;gap:8px;margin-top:12px">
      <span style="flex:1;min-width:0"><span class="kick" style="display:block">Глава ${c.n} из 7</span><span class="t16 ell" style="display:block">${esc(c.full)}</span></span>${right}</div>`;
  function tile(ch, ep, opts = {}) {
    const s = opts.forceLocked ? 'locked' : stateOf(ch, ep);
    const next = s === 'next';
    const bg = next ? 'var(--acc)' : 'var(--card)';
    const fg = next ? 'var(--accInk)' : s === 'locked' ? 'var(--mut)' : 'var(--tx)';
    const icon = s === 'done' ? `<span style="color:var(--good)">${ic('check', 18)}</span>` : s === 'locked' ? ic('lock', 16) : ic('play', 16);
    return `<div class="${opts.tap ? 'tap' : ''}" style="height:92px;border-radius:20px;padding:12px 14px;background:${bg};color:${fg};box-shadow:var(--sh);display:flex;flex-direction:column;justify-content:space-between">
      <span style="display:flex;justify-content:space-between;align-items:center;font-size:13px;line-height:18px;font-weight:800;font-variant-numeric:tabular-nums">${next ? 'Дальше' : two(ep.n)}${icon}</span>
      <span style="font-size:16px;line-height:21px;font-weight:700">${esc(ep.t)}</span></div>`;
  }
  const tilesGrid = (L, ch, opts = {}) => `<div class="pad" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">${L.ch[ch].map((ep) => tile(ch, ep, { tap: opts.tapN === ep.n, forceLocked: ch > 1 })).join('')}
      <div style="grid-column:1 / -1;height:48px;border-radius:18px;background:var(--card);box-shadow:var(--sh);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--mut)">${ic('exam', 18)}<span class="t16" style="flex:1">Экзамен главы</span><span class="t13">после 8 эпизодов</span></div></div>`;
  const toolChips = (L) => `<span class="chip">${ic('words', 16)}${L.words}</span><span class="chip">${ic('theory', 16)}Теория</span>`;
  const D = {
    f1: (L) => phone(`${header(L)}${titleBlock(L)}${segments(1)}${chapterLine(L, L.chapters[0], toolChips(L))}${tilesGrid(L, 1)}${dock('Продолжить эпизод 4')}`),
    f2: (L) => phone(`${header(L)}${titleBlock(L)}${segments(2)}${chapterLine(L, L.chapters[1], `<span class="chip off">${ic('lock', 14)}после главы 1</span>`)}${tilesGrid(L, 2)}${dock('Продолжить эпизод 4')}`),
    f3: (L) => phone(`${header(L)}${titleBlock(L)}${segments(1)}${chapterLine(L, L.chapters[0], toolChips(L))}${tilesGrid(L, 1, { tapN: 2 })}${dock('Повторить · Шумный завтрак', 'replay')}`),
  };

  /* ── страница «форма карточек»: верх Сезона как сейчас, низ «Вся глава · Слова · Теория» ── */
  const seasonTop = (L) => `${header(L)}<div class="lt"><div class="h1">${esc(L.title)}</div><div class="cap">${esc(L.topic)}</div></div>
    <div class="pad" style="display:flex;align-items:center;gap:8px;margin-top:14px">
      <button class="chip on" style="height:40px;border-radius:20px;font-size:16px">Глава 1 ${ic('down', 16)}</button>
      <span class="t16 ell" style="flex:1;min-width:0">${esc(L.chapters[0].full)}</span><span class="t13">${DONE} из 8</span></div>`;
  const seasonBottom = () => `<div class="dock" style="flex-direction:row">
      <button class="btn2" style="flex:1">Вся глава</button><button class="btn2" style="flex:1">${ic('words', 18)}Слова</button><button class="btn2" style="flex:1">${ic('theory', 18)}Теория</button></div>`;
  /** «Станции на пути» — тропа: станции вниз по плавной волне у левого края, подпись справа во всю ширину.
   *  зачем: змейка 3×3 не вмещала подписи (соседние наезжали), зигзаг через центр резал их — у тропы подписи никогда не пересекают путь. */
  function pathStations(L) {
    const items = L.ch[1].map((ep) => ({ ep, s: stateOf(1, ep) })).concat([{ exam: true, s: 'exam' }]);
    const pts = items.map((it, i) => ({ it, x: i % 2 === 0 ? 46 : 94, y: 30 + i * 52 }));
    const seg = (a, b) => `C${a.x},${a.y + 26} ${b.x},${b.y - 26} ${b.x},${b.y}`;
    const track = `M${pts[0].x},${pts[0].y} ${pts.slice(1).map((p, i) => seg(pts[i], p)).join(' ')}`;
    const doneTrack = `M${pts[0].x},${pts[0].y} ${pts.slice(1, DONE + 1).map((p, i) => seg(pts[i], p)).join(' ')}`;
    const stops = pts.map(({ it, x, y }) => {
      const next = it.s === 'next';
      const size = next ? 52 : 40;
      const inner = it.exam ? ic('exam', 17) : stateIcon(it.s, it.ep.n);
      const ring = next ? 'box-shadow:0 0 0 7px color-mix(in srgb, var(--acc) 20%, transparent)' : 'box-shadow:var(--sh)';
      const title = it.exam ? 'Экзамен главы' : it.ep.t;
      const sub = it.exam ? 'после 8 эпизодов' : next ? '<span class="accTx" style="font-weight:700">Дальше</span> · эпизод ' + it.ep.n : it.s === 'done' ? `Пройден · эпизод ${it.ep.n}` : `эпизод ${it.ep.n}`;
      const dim = it.s === 'locked' || it.exam ? 'mute' : '';
      return `<span style="position:absolute;left:${x - size / 2}px;top:${y - size / 2}px"><span class="st ${it.exam ? 'exam' : it.s}" style="width:${size}px;height:${size}px;border-radius:${size / 2}px;font-size:${next ? 18 : 13}px;${ring}">${inner}</span></span>
        <span style="position:absolute;left:140px;right:0;top:${y - 20}px">
          <span class="t16 ell ${dim}" style="display:block">${esc(title)}</span><span class="t13 ell" style="display:block">${sub}</span></span>`;
    }).join('');
    return `<div style="position:relative;margin:16px 16px 0;height:470px">
      <svg width="358" height="470" style="position:absolute;inset:0" aria-hidden="true">
        <path d="${track}" fill="none" stroke="var(--ctl)" stroke-width="5" stroke-linecap="round"/>
        <path d="${doneTrack}" fill="none" stroke="var(--acc)" stroke-width="5" stroke-linecap="round"/></svg>${stops}</div>`;
  }
  const CARDS = {
    ticket: (L) => phone(`${seasonTop(L)}${ticketList(L, 1)}${seasonBottom()}`),
    timeline: (L) => phone(`${seasonTop(L)}${routeList(L, 1)}${seasonBottom()}`),
    path: (L) => phone(`${seasonTop(L)}${pathStations(L)}${seasonBottom()}`),
    tiles: (L) => phone(`${seasonTop(L)}${tilesGrid(L, 1)}${seasonBottom()}`),
  };

  function namesTable(L, chapters) {
    const rows = chapters.flatMap((c) => L.ch[c].map((ep) => `<tr><td>${ep.n}</td><td class="new">${esc(ep.t)}</td><td class="old">${esc(ep.o)}</td><td class="old">${esc(ep.p)}</td></tr>`)).join('');
    return `<div class="tablewrap"><table class="names"><tr><th>№</th><th>Короче (≤ 2 слов)</th><th>Сейчас в курсе</th><th>Фраза эпизода</th></tr>${rows}</table></div>`;
  }

  function wireThemes() {
    const buttons = document.querySelectorAll('.themes button');
    const apply = (t) => {
      document.body.className = t;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === t)));
      try { localStorage.setItem('lesson-redesign-theme', t); } catch (e) { /* ок: без памяти выбора тема остаётся по умолчанию */ }
    };
    buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.t)));
    let saved = null;
    try { saved = localStorage.getItem('lesson-redesign-theme'); } catch (e) { saved = null; }
    const fromHash = location.hash.replace('#', '');
    const wanted = document.querySelector(`.themes button[data-t="${fromHash}"]`) ? fromHash : saved;
    apply(wanted && document.querySelector(`.themes button[data-t="${wanted}"]`) ? wanted : 't-ink');
  }

  window.LR = { L1, L2, A, B, C, D, CARDS, namesTable, wireThemes };
})();
