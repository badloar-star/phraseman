/* Страница «Режимы: было → стало» (владелец 11.11: «уроки, словари, блиц, устно и всё в приложении — на новый лад»).
   Правила режимов не меняются — меняется подача. Слева уменьшенный нынешний экран, справа новый, живой. */
(() => {
  const { I, $, $$, log, timers, bump, again, was, top, segs, coins, hearts, tiles, showTiles, mark, swipe, mount } = EL;

  /* ---------- 1 · урок: собери фразу ---------- */
  const BUILD = [{ ru: 'Она пишет сообщения', w: ['She', 'is', 'writing', 'messages'], bank: ['writing', 'She', 'do', 'messages', 'is'] }, { ru: 'Мы ждём здесь', w: ['We', 'are', 'waiting', 'here'], bank: ['here', 'are', 'We', 'at', 'waiting'] }];
  function build(ph, auto) {
    const G = timers(); let r = 0, put = [];
    $(ph, '.lay').innerHTML = `${top({ mid: segs(BUILD.length, 0, 'flex:1;margin:0 6px'), right: EL.I ? `<span class="gpill">${I('boltF', 's16')}<span class="num">4</span></span>` : '' })}
      <div class="stage"><div style="flex:.5"></div><div class="ask">Собери перевод</div><div class="big ruq" style="text-align:center;margin-top:10px;font-size:30px;line-height:36px"></div>
        <div class="cells"></div><div style="flex:1"></div><div class="bank"></div><div style="height:22px"></div><div class="wcta t dis">Проверить</div></div>`;
    const cells = $(ph, '.cells'), bank = $(ph, '.bank'), cta = $(ph, '.wcta');
    const round = () => {
      const q = BUILD[r]; put = []; $(ph, '.ruq').textContent = q.ru; cells.className = 'cells';
      cells.innerHTML = q.w.map((_, i) => `<div class="cell" style="--i:${i}"></div>`).join(''); bank.innerHTML = q.bank.map((w, i) => `<div class="bk t rise" data-w="${w}" style="--dl:${i * 50}ms">${w}</div>`).join('');
      cta.classList.add('dis'); cta.textContent = 'Проверить';
      if (auto) { q.w.forEach((w, i) => G.after(1100 + i * 650, () => add(w))); G.after(1100 + q.w.length * 650 + 500, check); }
    };
    const add = (w) => {
      const q = BUILD[r], chip = $(bank, `.bk[data-w="${w}"]:not(.used)`), i = put.length; if (!chip || i >= q.w.length) return;
      const cell = cells.children[i], a = chip.getBoundingClientRect(); put.push(w); cell.textContent = w; cell.classList.add('full'); chip.classList.add('used');
      const b = cell.getBoundingClientRect(); // зачем: слово «перелетает» из банка в ячейку, а не появляется в ней
      cell.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,1,.3,1)' });
      if (put.length === q.w.length) cta.classList.remove('dis');
    };
    const check = () => {
      const q = BUILD[r]; if (put.length < q.w.length) return; const ok = put.every((w, i) => w === q.w[i]); log('собери фразу:', put.join(' '), ok ? 'верно' : 'ошибка');
      if (!ok) { again(cells, 'bad'); return; }
      cells.classList.add('ok'); cta.textContent = 'Верно'; $$(ph, '.segs i')[r].style.setProperty('--p', 1);
      if (r < BUILD.length - 1) G.after(1700, () => { r += 1; round(); });
    };
    bank.addEventListener('click', (e) => { const b = e.target.closest('.bk'); if (b) add(b.dataset.w); });
    cells.addEventListener('click', (e) => { const c = e.target.closest('.cell.full'); if (!c || cells.classList.contains('ok')) return; const i = [...cells.children].indexOf(c); if (i !== put.length - 1) return; const w = put.pop(); c.textContent = ''; c.classList.remove('full'); $(bank, `.bk.used[data-w="${w}"]`).classList.remove('used'); cta.classList.add('dis'); });
    cta.addEventListener('click', check); round();
    return () => G.clear();
  }

  /* ---------- 2 · слова урока ---------- */
  const WORDS = [['working', 'работаю, работает'], ['reading', 'читаю, читает'], ['cooking', 'готовлю, готовит'], ['dinner', 'ужин'], ['writing', 'пишу, пишет'], ['messages', 'сообщения'], ['waiting', 'жду, ждёт']];
  function words(ph, auto) {
    const G = timers();
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">1. Словарь</div>' })}
      <div class="seg2"><div class="on">Этот урок</div><div>Весь курс</div></div>
      <div class="wl">${WORDS.map(([e, r], i) => `<div class="gl wr rise" style="--dl:${i * 60}ms" data-i="${i}"><div class="wv">${[0, 1, 2, 3].map((k) => `<i style="--k:${k}"></i>`).join('')}</div><div class="tx"><div class="e">${e}</div><div class="r">${r}</div></div><div class="bm t">${I('bookmark', 's20')}</div></div>`).join('')}</div>
      <div class="quietl" style="margin-top:16px">Ещё 5 слов откроются в эпизодах урока</div>`;
    const rows = $$(ph, '.wr'); let tm = 0;
    const say = (i) => { rows.forEach((x) => x.classList.remove('say')); rows[i].classList.add('say'); clearTimeout(tm); tm = setTimeout(() => rows[i].classList.remove('say'), 1500); log('слова: звучит', WORDS[i][0]); };
    $(ph, '.wl').addEventListener('click', (e) => { const b = e.target.closest('.bm'); if (b) { b.classList.toggle('on'); return; } const r = e.target.closest('.wr'); if (r) say(+r.dataset.i); });
    if (auto) { [0, 2, 5].forEach((i, k) => G.after(1400 + k * 1700, () => say(i))); G.after(3600, () => $(rows[2], '.bm').classList.add('on')); }
    return () => { G.clear(); clearTimeout(tm); };
  }

  /* ---------- 3 · блиц (и «гонка с собой» на странице игр) ---------- */
  const BL = [{ q: 'Pitch in', o: ['Скинуться, помочь', 'Бросить дело', 'Опоздать', 'Спорить'], k: 0 }, { q: 'Hire, fire, quit', o: ['Складывать, сгибать', 'Нанимать, увольнять, уйти', 'Обманывать, изменять', 'Иметь склонность'], k: 1 }, { q: 'Call it a day', o: ['Назвать дату', 'Позвонить днём', 'Закончить на сегодня', 'Провести день'], k: 2 }, { q: 'Tend to', o: ['Иметь склонность', 'Ухаживать', 'Тянуться', 'Натягивать'], k: 0 }];
  function blitz(ph, auto, ghost) {
    const G = timers(); let r = 0, n = 0, lives = 3, open = false, sec = 60, tick = 0;
    $(ph, '.lay').innerHTML = `${top({ mid: '<div class="ttl">Блиц</div>', right: `${hearts()}<span class="gpill"><span class="num tm">1:00</span></span>` })}
      <div class="tbar"><i></i></div>
      ${ghost ? `<div class="race"><div class="ln a"></div><div class="ln b"></div><div class="rn me">${K.coinImg(7, 28)}</div><div class="rn gh">${K.coinImg(7, 28)}</div><div class="lb2 a">Сегодня · <span class="mn">0</span></div><div class="lb2 b">Вчера · 19</div></div>` : ''}
      <div class="gl qcard"><div class="k">Выбери перевод</div><div class="q"></div></div>
      <div style="flex:1"></div><div class="ans"></div>`;
    const ans = $(ph, '.ans'), bar = $(ph, '.tbar i'), W = () => $(ph, '.race').clientWidth - 28;
    const round = () => { const q = BL[r % BL.length]; $(ph, '.q').textContent = q.q; again($(ph, '.qcard'), 'swap'); ans.innerHTML = tiles(q.o); showTiles(ans); open = true; if (auto) G.after(1200, () => pick(r === 2 ? (q.k + 1) % 4 : q.k)); };
    const pick = (i) => {
      if (!open) return; open = false; const q = BL[r % BL.length], ok = i === q.k; mark(ans, q.k, i);
      if (ok) { n += 1; if (ghost) { $(ph, '.rn.me').style.transform = `translateX(${Math.min(1, n / 6) * W()}px)`; $(ph, '.mn').textContent = n; } }
      else { lives -= 1; $$(ph, '.hearts svg')[lives]?.classList.add('lost'); }
      log(ghost ? 'гонка:' : 'блиц:', q.q, ok ? 'верно' : 'ошибка', 'сердец', lives);
      if (r < 5 && lives > 0) G.after(ok ? 800 : 1500, () => { r += 1; round(); });
    };
    ans.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(+a.dataset.i); });
    bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 60000, fill: 'forwards', easing: 'linear' });
    tick = setInterval(() => { sec = Math.max(0, sec - 1); $(ph, '.tm').textContent = `0:${String(sec).padStart(2, '0')}`; }, 1000);
    if (ghost) G.after(300, () => { $(ph, '.rn.gh').style.transition = 'transform 14s linear'; $(ph, '.rn.gh').style.transform = `translateX(${W() * .8}px)`; });
    round();
    return () => { G.clear(); clearInterval(tick); bar.getAnimations().forEach((a) => a.cancel()); };
  }

  /* ---------- 4 · устно ---------- */
  const SPK = [{ en: 'We are waiting here', ru: 'Мы ждём здесь', soft: -1 }, { en: 'She is writing messages', ru: 'Она пишет сообщения', soft: 3 }];
  function speak(ph, auto) {
    const G = timers(); let r = 0, live = false;
    $(ph, '.lay').innerHTML = `${top({ mid: segs(SPK.length, 0, 'flex:1;margin:0 6px'), right: `<span class="gpill">${I('boltF', 's16')}<span class="num">4</span></span>` })}
      <div class="stage"><div style="flex:.7"></div><div class="ask">Скажи вслух</div><div class="spk" style="margin-top:14px"></div><div class="ru"></div>
        <div style="flex:1"></div><div class="verd"></div><div style="height:22px"></div><div class="micw"><i></i><i></i><div class="mb t">${I('mic')}</div></div><div class="quietl">Нажми и говори</div></div>`;
    const box = $(ph, '.spk'), mic = $(ph, '.micw'), verd = $(ph, '.verd');
    const round = () => { const q = SPK[r]; box.innerHTML = q.en.split(' ').map((w) => `<span>${w}</span>`).join(''); $(ph, '.ru').textContent = q.ru; verd.textContent = ''; if (auto) G.after(1300, listen); };
    const listen = () => {
      if (live) return; live = true; mic.classList.add('live'); const q = SPK[r], sp = $$(box, 'span'); log('устно: слушаю', q.en);
      sp.forEach((s, i) => G.after(500 + i * 480, () => s.classList.add(i === q.soft ? 'soft' : 'hit')));
      G.after(500 + sp.length * 480 + 300, () => { mic.classList.remove('live'); live = false; verd.textContent = q.soft < 0 ? 'Чисто' : `Повтори слово «${sp[q.soft].textContent}»`; $$(ph, '.segs i')[r].style.setProperty('--p', 1); if (r < SPK.length - 1) G.after(1600, () => { r += 1; round(); }); });
    };
    $(ph, '.mb').addEventListener('click', listen); round();
    return () => { G.clear(); live = false; };
  }

  /* ---------- 5 · правда / ложь → смахивание ---------- */
  const TF = [{ en: 'Pitch in', sub: 'Скинуться, помочь', k: 'r', hint: 'Да, это «помочь общему делу»' }, { en: 'Call it a day', sub: 'Назвать дату', k: 'l', hint: 'Нет: «закончить на сегодня»' }, { en: 'Tend to', sub: 'Иметь склонность', k: 'r', hint: 'Да, перевод точный' }, { en: 'Hire', sub: 'Увольнять', k: 'l', hint: 'Нет: hire — нанимать' }, { en: 'Quit', sub: 'Уйти, бросить', k: 'r', hint: 'Да, перевод точный' }];
  const truth = (ph, auto) => swipe(ph, auto, { name: 'смахни:', cards: TF, ask: 'Перевод верный? Смахни', l: ['Не то', 'перевод другой'], r: ['Верно', 'перевод точный'] });

  /* ---------- 6 · вспомни и напиши ---------- */
  const TYPE = { ru: 'Он готовит ужин', en: 'he is cooking dinner', slip: [10, 'c'] };
  function write(ph, auto) {
    const G = timers(); let pos = 0; const L = TYPE.en.replace(/ /g, '');
    $(ph, '.lay').innerHTML = `${top({ mid: segs(4, 1, 'flex:1;margin:0 6px'), right: `<span class="gpill">${I('boltF', 's16')}<span class="num">4</span></span>` })}
      <div class="stage"><div style="flex:.5"></div><div class="ask">Напиши по-английски</div><div class="big" style="text-align:center;margin-top:10px;font-size:30px;line-height:36px">${TYPE.ru}</div>
        <div class="lets">${TYPE.en.split(' ').map((w) => `<div class="wd">${[...w].map(() => '<div class="lt2"></div>').join('')}</div>`).join('')}</div><div class="verd" style="margin-top:18px"></div>
        <div style="flex:1"></div><div class="kb">${['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r) => `<div class="r">${[...r].map((c) => `<div class="key" data-c="${c}">${c}</div>`).join('')}</div>`).join('')}</div></div>`;
    const cells = $$(ph, '.lt2'), verd = $(ph, '.verd'); const cur = () => cells.forEach((c, i) => c.classList.toggle('cur', i === pos));
    const press = (c) => {
      if (pos >= L.length) return; const key = $(ph, `.key[data-c="${c}"]`), cell = cells[pos]; key.classList.add('hit'); setTimeout(() => key.classList.remove('hit'), 170);
      if (c !== L[pos]) { cell.textContent = c; again(cell, 'bad'); verd.textContent = 'Не та буква — попробуй ещё'; log('напиши: мимо', c, 'нужна', L[pos]); G.after(520, () => { cell.textContent = ''; cell.classList.remove('bad'); }); return; }
      cell.textContent = c; cell.classList.add('in'); verd.textContent = ''; pos += 1; cur(); if (pos === L.length) { verd.textContent = 'Верно, по памяти'; $$(ph, '.segs i')[1].style.setProperty('--p', 1); log('напиши: фраза набрана'); }
    };
    $(ph, '.kb').addEventListener('click', (e) => { const k = e.target.closest('.key'); if (k) press(k.dataset.c); });
    cur();
    if (auto) { let t = 1200; [...L].forEach((c, i) => { if (i === TYPE.slip[0]) { G.after(t, () => press(TYPE.slip[1])); t += 900; } G.after(t, () => press(c)); t += 230; }); }
    return () => G.clear();
  }

  /* ---------- «было» ---------- */
  const hdr = (t, s, right = '') => `<div class="hdr"><div class="rb">${I('back', 's20')}</div><div class="tx"><div class="ti">${t}</div>${s ? `<div class="su">${s}</div>` : ''}</div>${right}</div>`;
  const qc = (k, q) => `<div class="qc" style="margin-top:26px"><div class="k">${k}</div><div class="q">${q}</div></div>`;
  const W = {
    build: was(`${hdr('Урок 1', 'Эпизод 5', K.energy(4))}<div class="trk" style="margin-top:14px"><i style="width:40%"></i></div>${qc('Собери перевод', 'Она пишет сообщения')}<div class="field" style="margin-top:14px"></div><div class="chips">${['writing', 'She', 'do', 'messages', 'is'].map((w) => `<div class="chip">${w}</div>`).join('')}</div><div style="height:150px"></div><div class="cta dis">Проверить</div>`),
    words: was(`${hdr('1. Словарь', '')}<div style="height:18px"></div><div class="stack">${WORDS.slice(0, 7).map(([e, r]) => `<div class="card"><div class="row"><div class="tx"><div class="tt m">${e}</div><div class="st">${r}</div></div><span class="ch">${I('bookmark', 's20')}</span></div></div>`).join('')}</div>`),
    blitz: was(`${hdr('Блиц', 'Набор карточек', K.energy(4))}<div class="trk" style="margin-top:14px"><i style="width:45%"></i></div><div class="center" style="margin-top:14px"><span class="pill s">0:47</span></div>${qc('Выбери перевод', 'Hire, fire, quit')}<div class="stack g13" style="margin-top:22px">${BL[1].o.map((t) => `<div class="opt">${t}</div>`).join('')}</div>`),
    speak: was(`${hdr('Устно', 'Набор карточек', K.energy(4))}<div class="trk" style="margin-top:14px"><i style="width:30%"></i></div>${qc('Скажи вслух', 'We are waiting here')}<div style="height:150px"></div><div class="rb l" style="margin:0 auto;width:84px;height:84px">${I('mic', 's28')}</div><div style="height:26px"></div><div class="cta gh">Пропустить</div>`),
    truth: was(`${hdr('Правда / ложь', 'Набор карточек', K.energy(4))}<div class="trk" style="margin-top:14px"><i style="width:30%"></i></div>${qc('Call it a day', 'Назвать дату')}<div style="height:170px"></div><div class="opt">Правда</div><div class="opt" style="margin-top:13px">Ложь</div>`),
    write: was(`${hdr('Вспомни и напиши', 'Набор карточек', K.energy(4))}<div class="trk" style="margin-top:14px"><i style="width:30%"></i></div>${qc('Напиши по-английски', 'Он готовит ужин')}<div class="field" style="margin-top:14px">Введи фразу</div><div style="height:16px"></div><div class="cta dis">Проверить</div>`),
  };

  window.ELM = { blitz };
  const S = [
    { id: 'modes', title: 'Режимы приложения на новый лад', lead: 'Правила режимов не тронуты: те же фразы, те же сердца и энергия. Меняется подача — сцена вместо графита, слова перелетают, буквы встают в ячейки, время видно полосой.',
      screens: [
        { id: 'm-build', fn: build, cls: 'deep', lbl: 'Урок · собери фразу', was: W.build, note: 'Слово перелетает из банка в ячейку. Ячеек столько, сколько слов, — это уже утверждённый вариант Пика.' },
        { id: 'm-words', fn: words, lbl: 'Слова урока', was: W.words, note: 'Нажатие на строку озвучивает слово и показывает волну, закладка отправляет слово в карточки.' },
        { id: 'm-blitz', fn: (ph, a) => blitz(ph, a, false), cls: 'deep', lbl: 'Карточки · Блиц', was: W.blitz, note: 'Время — светящаяся полоса, сердца гаснут с анимацией. Очков и комбо по-прежнему нет.' },
        { id: 'm-speak', fn: speak, cls: 'deep', lbl: 'Карточки · Устно', was: W.speak, note: 'Слова загораются по мере того, как их распознали; неясное слово подсвечено отдельно.' },
        { id: 'm-truth', fn: truth, cls: 'deep', lbl: 'Карточки · Правда / ложь', was: W.truth, note: 'Те же два ответа, но смахиванием. Карту можно тащить мышью или нажать на корзину.' },
        { id: 'm-write', fn: write, cls: 'deep', lbl: 'Карточки · Вспомни и напиши', was: W.write, note: 'Ячейка на каждую букву. Неверная буква не принимается сразу, а не после кнопки «Проверить».' },
      ] },
  ];
  window.ELS = Object.assign(window.ELS || {}, { modes: S[0] });
  if (document.body.dataset.page === 'modes') document.addEventListener('DOMContentLoaded', () => mount(S));
})();
