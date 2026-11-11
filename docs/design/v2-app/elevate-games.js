/* Страница «Новые игры» (владелец 11.11: «там ещё много классных механик… с нашими материалами: уроки, словари, глаголы, Пик и наборы»).
   Каждая игра помечена материалом, на котором работает. Новых текстов не требуется. */
(() => {
  const { I, $, $$, log, timers, bump, again, top, segs, coins, quiz, mount } = EL;
  const pill = (t) => `<div style="flex:1;display:flex;justify-content:center"><span class="gpill">${t}</span></div>`;

  /* 1 · На слух — уроки */
  const listen = (ph, auto) => quiz(ph, auto, { name: 'на слух:', ask: 'Что прозвучало?', missAt: 1, mid: pill('Скорость ×<span class="num sp">1,0</span>'),
    rounds: [{ o: ['We are waiting here', 'We were waiting here', 'We are waiting there'], k: 0, ru: 'Мы ждём здесь' }, { o: ['He is cooking dinner', 'She is cooking dinner', 'He is cooking a dinner'], k: 0, ru: 'Он готовит ужин' }, { o: ['I listen to music', 'I am listening to music', 'I am listening music'], k: 1, ru: 'Я слушаю музыку' }],
    show: (q, box, G, r) => { const sp = ['1,0', '1,25', '1,5'][r]; $(ph, '.sp').textContent = sp; bump($(ph, '.sp'));
      box.innerHTML = `<div class="wave live" style="--d:${[520, 420, 340][r]}ms">${Array.from({ length: 22 }, (_, k) => `<i style="--k:${k};--h:${24 + ((k * 37) % 70)}px"></i>`).join('')}</div>`;
      G.after(2200, () => $(box, '.wave').classList.remove('live')); return 2400; } });

  /* 2 · Память — наборы карточек */
  const MEM = [['Pitch in', 'Скинуться, помочь'], ['Call it a day', 'Закончить на сегодня'], ['Tend to', 'Иметь склонность'], ['Quit', 'Уйти, бросить']];
  const memory = (ph, auto) => quiz(ph, auto, { name: 'память:', missAt: 9, mid: pill('Запомни пары'),
    rounds: [{ i: 1, ask: 'Что значит «Call it a day»?', o: ['Назвать дату', 'Закончить на сегодня', 'Позвонить днём'], k: 1 }, { i: 2, ask: 'Что значит «Tend to»?', o: ['Иметь склонность', 'Ухаживать', 'Тянуться'], k: 0 }],
    show: (q, box, G) => { box.innerHTML = `<div class="mem">${MEM.map(([a, b], i) => `<div class="gl mc rise" style="--dl:${i * 70}ms"><b>${a}</b><span>${b}</span></div>`).join('')}</div>`;
      G.after(3200, () => { $(box, '.mem').classList.add('hide'); $$(box, '.mc')[q.i].classList.add('ask'); }); return 3600; },
    done: (q, box) => $(box, '.mem').classList.remove('hide') });

  /* 3 · Гонка с собой — наборы */
  const race = (ph, auto) => ELM.blitz(ph, auto, true);

  /* 4 · Точное слово — словарь уроков */
  const exact = (ph, auto) => quiz(ph, auto, { name: 'точное слово:', two: true, ask: 'Какое слово сюда?', missAt: 1, mid: pill('Точное слово'),
    rounds: [{ s: ['I', 'to music every day'], o: ['listen', 'hear'], k: 0, ru: 'Listen — слушаю намеренно. Hear — просто слышу.' }, { s: ['She is', 'messages now'], o: ['write', 'writing'], k: 1, ru: 'После is идёт форма на -ing.' }, { s: ['We are waiting', ''], o: ['here', 'at here'], k: 0, ru: 'Here не требует предлога.' }],
    show: (q, box) => { box.innerHTML = `<div class="gap rise">${q.s[0]} <span class="hole">${q.o[q.k]}</span> ${q.s[1]}</div>`; return 700; },
    done: (q, box, ok, i) => { const h = $(box, '.hole'); h.textContent = q.o[q.k]; h.classList.add(ok ? 'ok' : 'no'); } });

  /* 5 · Три формы — неправильные глаголы */
  const forms = (ph, auto) => quiz(ph, auto, { name: 'три формы:', ask: 'Третья форма?', missAt: 2, mid: pill('Неправильные глаголы'),
    rounds: [{ v: ['go', 'went'], o: ['goed', 'gone', 'went'], k: 1, ru: 'идти — шёл — ушедший' }, { v: ['write', 'wrote'], o: ['written', 'writed', 'wrote'], k: 0, ru: 'писать — писал — написанный' }, { v: ['take', 'took'], o: ['took', 'taked', 'taken'], k: 2, ru: 'брать — брал — взятый' }],
    show: (q, box) => { box.innerHTML = `<div class="cells" style="margin-top:0">${q.v.map((w, i) => `<div class="cell full rise" style="--dl:${i * 120}ms;height:60px;font-size:24px">${w}</div>`).join('')}<div class="cell hole3 rise" style="--dl:240ms;height:60px;font-size:24px;min-width:96px"></div></div>`; return 900; },
    done: (q, box, ok) => { const h = $(box, '.hole3'); h.textContent = q.o[q.k]; h.classList.add('full'); h.style.background = 'var(--ok-bg)'; h.style.color = 'var(--ok)'; /* зачем: в ячейку всегда встаёт верная форма — её и красим как верную */ } });

  /* 6 · Охота на ошибку — задания Пика «почини слово» */
  const HUNT = [['Does she work here?', 0, []], ['Yes, she <x>work</x> here every day.', 1, ['works', 'В настоящем после she глагол получает -s.']], ['Great, I am <y>waiting</y> for her.', 0, []]];
  function hunt(ph, auto) {
    const G = timers(); let open = true;
    $(ph, '.lay').innerHTML = `${top({ mid: pill('Охота на ошибку'), right: '<span class="gpill"><span class="num">0:30</span></span>' })}
      <div class="ask" style="margin-top:22px">В диалоге одно слово неверное. Найди его</div>
      <div class="chat" style="margin-top:22px;position:relative"><div class="scan"></div>${HUNT.map(([t, r], i) => `<div class="bub${r ? ' r' : ''} rise" style="--dl:${i * 140}ms">${t.replace(/<x>(.*?)<\/x>/, '<span class="x bad1">$1</span>').replace(/<y>(.*?)<\/y>/, '<span class="x">$1</span>')}</div>`).join('')}</div>
      <div class="gl why hid" style="margin-top:20px"><div class="tl">${I('check', 's20')}</div><div class="tx"></div></div>`;
    const scan = $(ph, '.scan'), chat = $(ph, '.chat');
    const run = scan.animate([{ transform: 'translateY(-70px)', opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { transform: `translateY(${chat.offsetHeight}px)`, opacity: 0 }], { duration: 2600, iterations: Infinity, easing: 'linear' });
    const tap = (el) => {
      if (!open) return; if (!el.classList.contains('bad1')) { again(el, 'no'); log('охота: мимо', el.textContent); G.after(700, () => el.classList.remove('no')); return; }
      open = false; run.cancel(); el.textContent = HUNT[1][2][0]; el.classList.add('fix'); again(el, 'rise'); $(ph, '.why .tx').innerHTML = `<b>work → works</b>${HUNT[1][2][1]}`; $(ph, '.why').classList.remove('hid'); log('охота: найдено и исправлено');
    };
    chat.addEventListener('click', (e) => { const x = e.target.closest('.x'); if (x) tap(x); });
    if (auto) { G.after(2300, () => tap($$(ph, '.x')[1])); G.after(3700, () => tap($(ph, '.bad1'))); }
    return () => { G.clear(); run.cancel(); };
  }

  /* 7 · Собери диалог — задания Пика «порядок реплик» */
  const DLG = ['Hi! Are you waiting here?', 'Yes, I am waiting for my friend.', 'Is he coming now?', 'He is parking the car.'];
  function order(ph, auto) {
    const G = timers(); let n = 0; const mix = [2, 0, 3, 1];
    $(ph, '.lay').innerHTML = `${top({ mid: pill('Собери диалог'), right: '<span class="gpill rn">0 / 4</span>' })}
      <div class="ask" style="margin-top:22px">Нажимай реплики по порядку</div>
      <div class="chat" style="margin-top:20px;min-height:262px">${DLG.map(() => '<div class="slot"></div>').join('')}</div>
      <div style="flex:1"></div><div class="ans">${mix.map((i) => `<div class="at t" data-i="${i}" style="font-size:16px;min-height:54px">${DLG[i]}</div>`).join('')}</div>`;
    const chat = $(ph, '.chat');
    const tap = (el) => {
      const i = +el.dataset.i; if (el.classList.contains('hid')) return; if (i !== n) { again(el, 'no'); G.after(500, () => el.classList.remove('no')); log('диалог: не та реплика'); return; }
      const a = el.getBoundingClientRect(), b = document.createElement('div'); b.className = `bub${i % 2 ? ' r' : ''}`; b.textContent = DLG[i]; chat.children[i].replaceWith(b);
      const c = b.getBoundingClientRect(); b.animate([{ transform: `translate(${a.left - c.left}px,${a.top - c.top}px)`, opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,1,.3,1)' });
      el.classList.add('hid'); n += 1; $(ph, '.rn').textContent = `${n} / 4`; bump($(ph, '.rn')); log('диалог: реплика', n);
    };
    $(ph, '.ans').addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) tap(a); });
    if (auto) { G.after(1300, () => tap($(ph, '.at[data-i="2"]'))); [0, 1, 2, 3].forEach((i, k) => G.after(2300 + k * 1000, () => tap($(ph, `.at[data-i="${i}"]`)))); }
    return () => G.clear();
  }

  /* 8 · Минута знаний — теория уроков, после ошибки */
  function minute(ph) {
    const G = timers();
    $(ph, '.lay').innerHTML = `${top({ mid: pill('Минута знаний'), right: coins() })}
      <div class="ask" style="margin-top:22px">Ты ошибся здесь. Вот правило в двух строках</div>
      <div class="gl theory rise" style="margin-top:18px"><div class="q">She <em>is</em> writing <em>-ing</em></div>
        <div class="p">Действие идёт прямо сейчас — ставим am, is или are и добавляем к глаголу -ing.</div>
        ${[['I am working now', 'Я работаю сейчас'], ['They are watching TV', 'Они смотрят телевизор']].map(([a, b], i) => `<div class="exm rise" style="--dl:${500 + i * 250}ms">${I('vol', 's20')}<div>${a}<span>${b}</span></div></div>`).join('')}</div>
      <div style="flex:1"></div><div class="tbar" style="margin-bottom:18px"><i></i></div><div class="wcta t">Понятно</div>`;
    const bar = $(ph, '.tbar i'); bar.style.transform = 'scaleX(0)';
    const a = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 20000, fill: 'forwards', easing: 'linear' });
    log('минута знаний показана');
    return () => { G.clear(); a.cancel(); };
  }

  /* 9 · Уровни игры — сложность растёт сама */
  const LV = [['4 варианта · 60 секунд', 'Старт'], ['5 вариантов', 'Больше похожих ответов'], ['Без перевода на карточке', 'Только на слух'], ['45 секунд', 'То же, но быстрее'], ['Свои наборы вперемешку', 'Всё сразу']];
  function levels(ph, auto) {
    const G = timers(); let cur = 2, pip = 1;
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Блиц · уровни</div>' })}
      <div class="hero3" style="margin-top:20px"><div class="over">Сложность меняется сама</div><div class="big lvn" style="margin-top:6px"></div><div class="sub" style="margin-top:8px">Три хороших захода подряд — уровень вверх. Два слабых — вниз.</div><div class="pips" style="margin-top:14px"><i></i><i></i><i></i></div></div>
      <div style="flex:1"></div><div class="lad">${LV.map(([a, b], i) => `<div class="gl lv" data-i="${i}"><div class="n">${i + 1}</div><div class="tx">${a}<span>${b}</span></div><div class="cn">${K.coinImg(7, 34)}</div></div>`).join('')}</div><div style="height:8px"></div>`;
    const draw = () => { $$(ph, '.lv').forEach((l, i) => { l.classList.toggle('done', i < cur); l.classList.toggle('cur', i === cur); }); $(ph, '.lvn').textContent = `Уровень ${cur + 1}`; $$(ph, '.pips i').forEach((p, i) => p.classList.toggle('on', i < pip)); };
    const good = () => { pip += 1; if (pip > 3) { pip = 0; cur = Math.min(LV.length - 1, cur + 1); bump($(ph, '.lvn')); log('уровни: вверх →', cur + 1); } draw(); };
    $(ph, '.lad').addEventListener('click', good); draw();
    if (auto) [1400, 2400, 3400, 4600].forEach((t) => G.after(t, good));
    return () => G.clear();
  }

  window.ELG = { listen, memory, exact, forms, hunt, order, minute, levels }; // зачем: Пик и уроки ставят эти же игры в свои рамки
  const S = [
    { id: 'games', title: 'Девять новых игр на наших материалах', lead: 'Ни одна не требует новых текстов. Над каждым телефоном написано, из какого раздела берётся материал. В разминке и в карточках они встают в очередь сами — выбирать их не нужно.',
      screens: [
        { id: 'g-listen', fn: listen, cls: 'deep', lbl: 'На слух · материал: уроки', note: 'Фраза звучит всё быстрее. Вторая фраза в показе — с ошибкой.' },
        { id: 'g-memory', fn: memory, cls: 'deep', lbl: 'Память · материал: наборы карточек', note: 'Пары видны три секунды, потом перевод расплывается.' },
        { id: 'g-race', fn: race, cls: 'deep', lbl: 'Гонка с собой · материал: наборы', note: 'Нижняя монета — твой вчерашний заход, она идёт по времени. Очков нет, сравнивается число верных.' },
        { id: 'g-exact', fn: exact, cls: 'deep', lbl: 'Точное слово · материал: словарь уроков', note: 'Два похожих слова, объяснение — из заметок к словам.' },
        { id: 'g-forms', fn: forms, cls: 'deep', lbl: 'Три формы · материал: неправильные глаголы', note: 'Третья форма встаёт в пустую ячейку.' },
        { id: 'g-hunt', fn: hunt, cls: 'deep', lbl: 'Охота на ошибку · материал: задания Пика', note: 'По диалогу идёт луч. Неверное слово после нажатия заменяется верным.' },
        { id: 'g-order', fn: order, cls: 'deep', lbl: 'Собери диалог · материал: задания Пика', note: 'Реплика улетает в переписку на своё место.' },
        { id: 'g-minute', fn: minute, lbl: 'Минута знаний · материал: теория уроков', note: 'Показывается после игры, только если была ошибка. Через двадцать секунд уходит сама.' },
        { id: 'g-levels', fn: levels, lbl: 'Уровни игры · на примере «Блица»', note: 'Нажатие на лестницу добавляет хороший заход. Уровень человек не выбирает.' },
      ] },
  ];
  window.ELS = Object.assign(window.ELS || {}, { games: S[0] });
  if (document.body.dataset.page === 'games') document.addEventListener('DOMContentLoaded', () => mount(S));
})();
