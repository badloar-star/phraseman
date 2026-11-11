/* Страница «Пик: все задания» (владелец 11.11: «все задания Пика, все режимы сделай такими»).
   Рамка одна на все задания: ступень, десять заданий, три сердца, общий таймер на ступень (правила modules/spire/step_machine.ts).
   Внутри — пять базовых режимов пула и двенадцать форматов modules/expanded-formats; имена форматов подписаны под телефонами. */
(() => {
  const { I, $, $$, log, timers, again, top, hearts, tiles, showTiles, mark, swipe, mount } = EL;
  const head = (tag, n) => `<div class="pkhd"><div><div class="l1">Ступень 4</div><div class="l2">${tag}</div></div><div class="rt">${hearts()}<span class="gpill"><span class="num">2:14</span></span></div></div>
    <div class="pkdots">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'd' : i === n ? 'c' : ''}"></i>`).join('')}</div>`;
  const frame = (ph, tag, n, body) => { const lay = $(ph, '.lay'); lay.classList.add('pk'); lay.innerHTML = `${top()}${head(tag, n)}${body}`; };
  // зачем: готовые игры с других страниц встают в ту же рамку ступени — их собственные счётчики прячет .pk
  const dress = (fn, tag, n) => (ph, auto) => { const stop = fn(ph, auto), lay = $(ph, '.lay'); lay.classList.add('pk'); $(ph, '.top').insertAdjacentHTML('afterend', head(tag, n)); return stop; };
  const adv = (ph, ok) => { const c = $(ph, '.pkdots .c'); if (c) { c.classList.remove('c'); c.classList.add(ok ? 'd' : 'm'); } if (!ok) $$(ph, '.pkhd .hearts svg')[2]?.classList.add('lost'); log('пик: задание', ok ? 'верно' : 'ошибка, минус сердце'); };
  const stage = (inner, ask, answers, cls = '') => `<div class="stage"><div style="flex:.5"></div>${inner}<div class="ru fade hid"></div><div style="flex:1"></div><div class="ask">${ask}</div><div class="ans ${cls}" style="margin-top:16px">${answers}</div></div>`;

  const choice = (tag, n, o) => (ph, auto) => {
    const G = timers(); let open = true; frame(ph, tag, n, stage(o.html, o.ask, tiles(o.o), o.cls)); const ans = $(ph, '.ans'); showTiles(ans);
    const pick = (i) => { if (!open) return; open = false; mark(ans, o.k, i); if (o.ru) { $(ph, '.ru').textContent = o.ru; $(ph, '.ru').classList.remove('hid'); } if (o.done) o.done(ph, i === o.k); adv(ph, i === o.k); };
    ans.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(+a.dataset.i); });
    if (auto) G.after(1900, () => pick(o.miss ? (o.k + 1) % o.o.length : o.k));
    return () => G.clear();
  };
  const fillHole = (ph, ok) => { const h = $(ph, '.hole'); h.classList.add(ok ? 'ok' : 'no'); };

  const multi = (tag, n, o) => (ph, auto) => {
    const G = timers(); let open = true; frame(ph, tag, n, stage(`<div class="big rise" style="text-align:center;font-size:28px;line-height:34px">${o.q}</div>`, `Выбери ${o.k.length === 2 ? 'два ответа' : 'ответы'}`, tiles(o.o))); const ans = $(ph, '.ans'); showTiles(ans);
    const tap = (a) => { if (!open) return; a.classList.toggle('sel'); const sel = $$(ans, '.at.sel'); if (sel.length < o.k.length) return; open = false; const got = sel.map((x) => +x.dataset.i), ok = got.every((i) => o.k.includes(i));
      G.after(350, () => { $$(ans, '.at').forEach((x, i) => { x.classList.remove('sel'); x.classList.add(o.k.includes(i) ? 'ok' : got.includes(i) ? 'no' : 'off'); }); adv(ph, ok); }); };
    ans.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) tap(a); });
    if (auto) o.k.forEach((i, j) => G.after(1700 + j * 700, () => tap($(ans, `.at[data-i="${i}"]`))));
    return () => G.clear();
  };

  const linked = (tag, n, o) => (ph, auto) => {
    const G = timers(); const got = [null, null];
    frame(ph, tag, n, `<div class="stage"><div style="flex:.5"></div><div class="gap rise">${o.s[0]}<span class="hole h0">${o.slots[0][o.k[0]]}</span> ${o.s[1]} <span class="hole h1">${o.slots[1][o.k[1]]}</span> ${o.s[2]}</div><div class="ru fade hid">${o.ru}</div><div style="flex:1"></div>
      <div class="ask">Пропуски зависят друг от друга</div><div class="lg">${o.slots.map((sl, s) => `<div class="lgr"><span>Пропуск ${s + 1}</span>${sl.map((t, i) => `<div class="at t" data-s="${s}" data-i="${i}">${t}</div>`).join('')}</div>`).join('')}</div></div>`);
    const tap = (a) => { const s = +a.dataset.s, i = +a.dataset.i; got[s] = i; $$(ph, `.lgr .at[data-s="${s}"]`).forEach((x) => x.classList.toggle('sel', x === a)); const h = $(ph, `.h${s}`); h.textContent = o.slots[s][i]; h.classList.add('set'); again(h, 'rise');
      if (got[0] === null || got[1] === null) return; const ok = got[0] === o.k[0] && got[1] === o.k[1];
      G.after(450, () => { [0, 1].forEach((k) => $(ph, `.h${k}`).classList.add(got[k] === o.k[k] ? 'ok' : 'no')); $(ph, '.ru').classList.remove('hid'); adv(ph, ok); }); };
    $(ph, '.lg').addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) tap(a); });
    if (auto) [[0, o.k[0]], [1, o.k[1]]].forEach(([s, i], j) => G.after(1700 + j * 900, () => tap($(ph, `.lgr .at[data-s="${s}"][data-i="${i}"]`))));
    return () => G.clear();
  };

  const KB = `<div class="kb">${['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r) => `<div class="r">${[...r].map((c) => `<div class="key" data-c="${c}">${c}</div>`).join('')}</div>`).join('')}</div>`;
  const hit = (ph, c) => { const k = $(ph, `.key[data-c="${c.toLowerCase()}"]`); if (k) { k.classList.add('hit'); setTimeout(() => k.classList.remove('hit'), 170); } };
  const typed = (tag, n, o) => (ph, auto) => {
    const G = timers(); let pos = 0;
    frame(ph, tag, n, `<div class="stage"><div style="flex:.5"></div><div class="ask">${o.ask}</div><div class="gap rise" style="margin-top:10px">${o.html}</div>
      <div class="lets" style="margin-top:20px"><div class="wd">${[...o.word].map(() => '<div class="lt2"></div>').join('')}</div></div><div style="flex:1"></div>${KB}</div>`);
    const cells = $$(ph, '.lt2'); const press = (c) => { if (pos >= o.word.length) return; hit(ph, c); if (c !== o.word[pos]) { again(cells[pos], 'bad'); G.after(450, () => cells[pos].classList.remove('bad')); return; } cells[pos].textContent = c; cells[pos].classList.add('in'); pos += 1; if (pos === o.word.length) adv(ph, true); };
    $(ph, '.kb').addEventListener('click', (e) => { const k = e.target.closest('.key'); if (k) press(k.dataset.c); });
    if (auto) [...o.word].forEach((c, i) => G.after(1500 + i * 260, () => press(c)));
    return () => G.clear();
  };
  const transform = (tag, n, o) => (ph, auto) => {
    const G = timers(); let txt = '';
    frame(ph, tag, n, `<div class="stage"><div style="flex:.5"></div><div class="ask">${o.ask}</div><div class="big rise" style="text-align:center;margin-top:10px;font-size:28px;line-height:34px">${o.src}</div>
      <div class="tline"><span class="tx2"></span><i class="caret"></i></div><div class="ru fade hid">${o.ru}</div><div style="flex:1"></div>${KB}</div>`);
    const put = (c) => { if (txt.length >= o.ans.length) return; hit(ph, c); txt = o.ans.slice(0, txt.length + 1); $(ph, '.tx2').textContent = txt; if (txt === o.ans) { $(ph, '.tline').classList.add('ok'); $(ph, '.caret').remove(); $(ph, '.ru').classList.remove('hid'); adv(ph, true); } };
    $(ph, '.kb').addEventListener('click', (e) => { const k = e.target.closest('.key'); if (k) put(k.dataset.c); }); // зачем: в макете любая клавиша набирает следующий верный знак — показываем подачу, а не проверку
    if (auto) [...o.ans].forEach((c, i) => G.after(1500 + i * 110, () => put(c)));
    return () => G.clear();
  };

  const pairs = (tag, n, o) => (ph, auto) => {
    const G = timers(); let sel = null, done = 0; const ord = o.ord;
    frame(ph, tag, n, `<div style="flex:.5"></div><div class="ask">${o.ask}</div><div class="prs ${o.cls || ''}"><div class="pc l">${o.l.map((t, i) => `<div class="at t rise" style="--dl:${i * 60}ms" data-s="l" data-i="${i}"><span class="bd"></span>${t}</div>`).join('')}</div><div class="pc r">${ord.map((j, i) => `<div class="at t rise" style="--dl:${i * 60 + 120}ms" data-s="r" data-i="${j}"><span class="bd"></span>${o.r[j]}</div>`).join('')}</div></div><div style="flex:1"></div>`);
    const tap = (a) => {
      if (a.classList.contains('ok')) return; if (a.dataset.s === 'l') { $$(ph, '.prs .at').forEach((x) => x.classList.remove('sel')); a.classList.add('sel'); sel = a; return; }
      if (!sel) return; const l = sel; sel = null; l.classList.remove('sel');
      if (l.dataset.i !== a.dataset.i) { [l, a].forEach((x) => { again(x, 'no'); G.after(500, () => x.classList.remove('no')); }); log('пары: не та пара'); return; }
      done += 1; [l, a].forEach((x) => { x.classList.add('ok'); $(x, '.bd').textContent = done; }); if (done === o.l.length) adv(ph, true);
    };
    $(ph, '.prs').addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) tap(a); });
    const at = (s, i) => $(ph, `.prs .at[data-s="${s}"][data-i="${i}"]`);
    if (auto) { let t = 1600; G.after(t, () => tap(at('l', 0))); G.after(t += 600, () => tap(at('r', 1))); o.l.forEach((_, i) => { G.after(t += 700, () => tap(at('l', i))); G.after(t += 550, () => tap(at('r', i))); }); }
    return () => G.clear();
  };

  const bub = (t, r) => `<div class="chat rise"><div class="bub${r ? ' r' : ''}">${t}</div></div>`;
  const gapS = (a, w, b) => `<div class="gap rise">${a} <span class="hole">${w}</span> ${b}</div>`;
  const T = [
    { id: 'pk-guess', f: 'guess_phrase', fn: choice('Угадай фразу', 0, { html: '<div class="big rise" style="text-align:center">Он готовит ужин</div>', ask: 'Как это по-английски?', o: ['He is cooking dinner', 'He cooks the dinner', 'She is cooking dinner'], k: 0 }) },
    { id: 'pk-gap', f: 'fill_gap', fn: choice('Вставь слово', 1, { html: gapS('She', 'is', 'writing messages'), ask: 'Какое слово пропущено?', o: ['is', 'are', 'am', 'be'], k: 0, cls: 'grid2', ru: 'Она пишет сообщения', done: fillHole }) },
    { id: 'pk-context', f: 'context_choice', fn: choice('Ответ в диалоге', 2, { html: bub('Are you waiting here?'), ask: 'Что ответить?', o: ['Yes, I am waiting for my friend.', 'Yes, I wait my friend.', 'No, I am not wait.'], k: 0 }) },
    { id: 'pk-evidence', f: 'evidence_choice', fn: choice('Найди доказательство', 3, { html: '<div class="gl pass rise">Tom is at home. He is cooking dinner. His phone is ringing, but he is not answering.</div>', ask: 'Откуда видно, что Том занят?', o: ['«He is cooking dinner»', '«Tom is at home»', '«His phone is ringing»'], k: 0, miss: true }) },
    { id: 'pk-multi', f: 'multi_select', fn: multi('Выбери несколько', 4, { q: 'Какие фразы про «прямо сейчас»?', o: ['I am working now', 'He cooks every day', 'They are watching TV', 'We usually wait here'], k: [0, 2] }) },
    { id: 'pk-linked', f: 'linked_gaps', fn: linked('Связанные пропуски', 5, { s: ['', 'she', 'here?'], slots: [['Do', 'Does'], ['work', 'works']], k: [1, 0], ru: 'Она здесь работает?' }) },
    { id: 'pk-typed', f: 'typed_word', fn: typed('Впиши слово', 6, { ask: 'Допиши слово', html: 'She is <span class="hole set" style="color:var(--ink2)">писать</span> messages', word: 'writing' }) },
    { id: 'pk-transform', f: 'sentence_transform', fn: transform('Переделай фразу', 7, { ask: 'Сделай вопрос', src: 'She works here.', ans: 'Does she work here?', ru: 'Она здесь работает?' }) },
    { id: 'pk-classify', f: 'classify_function', fn: dress((ph, a) => swipe(ph, a, { name: 'пик · функция:', ask: 'Что делает фраза? Смахни', l: ['Просьба', 'просит о чём-то'], r: ['Отказ', 'вежливо отказывает'], cards: [{ en: 'Could you help me?', k: 'l', hint: 'could you — это просьба' }, { en: 'I am afraid I can not', k: 'r', hint: 'I am afraid — мягкий отказ' }, { en: 'Can I have a coffee?', k: 'l', hint: 'can I have — просьба' }, { en: 'Sorry, not today', k: 'r', hint: 'sorry, not — отказ' }] }), 'Определи функцию', 8) },
    { id: 'pk-reply', f: 'reply_pairs', fn: pairs('Вопрос — ответ', 9, { ask: 'Соедини вопрос с ответом', l: ['Are you waiting?', 'Is he cooking?', 'Do they work here?'], r: ['Yes, I am.', 'Yes, he is.', 'Yes, they do.'], ord: [1, 2, 0] }) },
    { id: 'pk-match', f: 'speed_match', fn: pairs('Найди пары', 3, { cls: 'nw', ask: 'Слово и перевод', l: ['hire', 'quit', 'tend to', 'pitch in'], r: ['нанимать на работу', 'уйти, бросить', 'иметь склонность', 'скинуться, помочь общему делу'], ord: [2, 0, 3, 1] }) },
    { id: 'pk-order', f: 'dialogue_order', fn: dress((ph, a) => window.ELG.order(ph, a), 'Расставь реплики', 5) },
    { id: 'pk-repair', f: 'word_repair', fn: dress((ph, a) => window.ELG.hunt(ph, a), 'Почини слово', 6) },
    { id: 'pk-build', f: 'translate_build · sentence_build_noise', fn: dress((ph, a) => window.ELM.build(ph, a), 'Собери перевод', 7) },
    { id: 'pk-intruder', f: 'find_oddity · remove_intruder', fn: dress((ph, a) => window.ELP1.find((x) => x.id === 'cut').fn(ph, a), 'Убери лишнее', 8) },
    { id: 'pk-listen', f: 'на слух · диктант', fn: dress((ph, a) => window.ELG.listen(ph, a), 'На слух', 2) },
    { id: 'pk-voice', f: 'голосовое задание', fn: dress((ph, a) => window.ELM.speak(ph, a), 'Скажи вслух', 4) },
  ];
  const S = [{ id: 'peak', title: 'Пик: все задания в одной рамке ступени', lead: 'Рамка общая: ступень, десять заданий, три сердца, один таймер на всю ступень — как в правилах Пика сейчас. Под каждым телефоном подписан формат задания. Башня и вход в Пик утверждены раньше и здесь не трогаются.',
    screens: T.map((t) => ({ id: t.id, fn: t.fn, cls: 'deep', lbl: `${$title(t)}`, note: `Формат: ${t.f}` })) }];
  function $title(t) { return ({ 'pk-guess': 'Угадай фразу', 'pk-gap': 'Вставь слово', 'pk-context': 'Ответ в диалоге', 'pk-evidence': 'Найди доказательство', 'pk-multi': 'Выбери несколько', 'pk-linked': 'Связанные пропуски', 'pk-typed': 'Впиши слово', 'pk-transform': 'Переделай фразу', 'pk-classify': 'Определи функцию', 'pk-reply': 'Вопрос — ответ', 'pk-match': 'Найди пары', 'pk-order': 'Расставь реплики', 'pk-repair': 'Почини слово', 'pk-build': 'Собери перевод', 'pk-intruder': 'Убери лишнее', 'pk-listen': 'На слух', 'pk-voice': 'Скажи вслух' })[t.id]; }
  window.ELS = Object.assign(window.ELS || {}, { peak: S[0] });
  if (document.body.dataset.page === 'peak') document.addEventListener('DOMContentLoaded', () => mount(S));
})();
