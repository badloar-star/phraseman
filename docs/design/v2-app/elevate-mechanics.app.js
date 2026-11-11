/* Механики Elevate на материалах PhraseMan — живые макеты (владелец 11.11).
   зачем: каждая игра — обёртка «с ощущением» над тем, что в приложении уже есть (фразы уроков, заметки к словам,
   двенадцать механик modules/expanded-formats). Данные в макете — настоящие фразы уроков 1–8.
   Журнал — префикс [ELEVATE]: что запущено и чем закончился каждый ход (для сверки с записью экрана). */
(() => {
  const I = K.icon;
  const log = (...a) => console.log('[ELEVATE]', ...a);
  const $ = (root, sel) => root.querySelector(sel);
  const $$ = (root, sel) => [...root.querySelectorAll(sel)];
  const SB = `<div class="sb"><span>9:41</span><span class="sys">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <span class="bat"></span></span></div>`;
  const sky = (id, inner, o = {}) => `<div class="ph sky ${o.cls || ''}" data-ph="${id}">${SB}<div class="sun"></div><div class="haze"></div><div class="stars"></div><div class="vig"></div><div class="lay">${inner}</div>${o.extra || ''}<div class="hi"></div></div>`;
  const timers = () => { let ids = []; return { after(ms, fn) { const id = setTimeout(fn, ms); ids.push(id); return id; }, clear() { ids.forEach(clearTimeout); ids = []; } }; };
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
  function count(el, from, to, ms, suffix = '') {
    const t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / ms); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e) + suffix; if (p < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const bump = (el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
  function stars(ph) { // зачем: те же звёзды на любой платформе — xorshift32 с сидом 3, как в scene-approved.js
    let s = 3; const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    $(ph, '.stars').innerHTML = Array.from({ length: 46 }, () => { const x = r() * 100, y = r() * 100, d = .8 + r() * 1.8, a = .18 + r() * .5; return `<i style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;--a:${a.toFixed(2)};animation-delay:${(-r() * 3.6).toFixed(2)}s"></i>`; }).join('');
  }

  /* ================= 1 · Разминка: три игры дня ================= */
  const GAMES = [
    { cls: 'g1', skill: 'Скорость', ic: 'boltF', nm: 'Поток', ds: 'Фраза мелькает — успей понять смысл', art: `<div class="art a-flow">${[[38, 150, 2.6, 0], [74, 96, 1.9, -.7], [108, 190, 3.1, -1.6], [142, 120, 2.2, -.3], [176, 164, 2.8, -2.1]].map(([t, w, d, dl]) => `<i style="top:${t}px;width:${w}px;--d:${d}s;--dl:${dl}s"></i>`).join('')}</div>` },
    { cls: 'g2', skill: 'Точность', ic: 'check', nm: 'Лишнее слово', ds: 'Убери слово, которое ломает фразу', art: `<div class="art a-cut"><i style="width:52px"></i><i class="x" style="width:44px"></i><i style="width:70px"></i></div>` },
    { cls: 'g3', skill: 'Грамматика', ic: 'layers', nm: 'Сортировка', ds: 'Разложи фразы: сейчас или обычно', art: `<div class="art a-sort"><div class="bk l"></div><div class="bk r"></div><div class="cd"></div></div>` },
  ];
  function workout(ph, auto) {
    const G = timers(); let idx = 0; const played = new Set();
    $(ph, '.lay').innerHTML = `
      <div class="top"><div class="gbtn t">${I('back')}</div><div class="ttl">Разминка</div><span class="gpill">${K.coinImg(7, 20)}<span class="num">1 240</span></span></div>
      <div style="margin-top:22px"><div class="over">Среда, 11 ноября</div><div class="big" style="margin-top:6px">3 игры<br>на 4 минуты</div><div class="sub" style="margin-top:8px">Собраны из твоих ошибок за неделю</div></div>
      <div class="deck">${GAMES.map((g, i) => `<div class="gc ${g.cls} deal" data-i="${i}"><div class="tags"><span class="tag">${I(g.ic)}${g.skill}</span><span class="tag res hid"></span></div>${g.art}<div class="cap"><div class="nm">${g.nm}</div><div class="ds">${g.ds}</div></div></div>`).join('')}</div>
      <div class="dots">${GAMES.map(() => '<i></i>').join('')}</div>
      <div class="segs" style="margin-bottom:16px">${GAMES.map(() => '<i></i>').join('')}</div>
      <div class="wcta t">${I('play')}<span class="lb"></span></div>`;
    const cards = $$(ph, '.gc'), dots = $$(ph, '.dots i'), segs = $$(ph, '.segs i'), cta = $(ph, '.wcta'), lb = $(ph, '.wcta .lb');
    const place = () => {
      cards.forEach((c, i) => { const d = (i - idx + 3) % 3; c.dataset.pos = d === 2 ? -1 : d; });
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
      lb.textContent = played.size === 3 ? 'Разминка пройдена' : (played.has(idx) ? 'Сыграть ещё раз · ' : 'Начать · ') + GAMES[idx].nm;
    };
    const go = (d) => { idx = (idx + d + 3) % 3; place(); log('разминка: карта', GAMES[idx].nm); };
    const start = () => {
      if (ph.dataset.busy) return; ph.dataset.busy = '1'; const i = idx; log('разминка: старт игры', GAMES[i].nm);
      cards.forEach((c, k) => c.classList.add(k === i ? 'zoom' : 'away'));
      G.after(1250, () => {
        cards.forEach((c) => c.classList.remove('zoom', 'away')); played.add(i);
        const res = $(cards[i], '.res'); res.innerHTML = I('check') + ['92%', '4 из 4', '6 из 6'][i]; res.classList.remove('hid');
        segs[i].style.setProperty('--p', 1); delete ph.dataset.busy;
        if (played.size < 3) { let n = idx; while (played.has(n)) n = (n + 1) % 3; idx = n; } place();
      });
    };
    cards.forEach((c, i) => c.addEventListener('click', () => { if (i !== idx) { idx = i; place(); } else start(); }));
    cta.addEventListener('click', start);
    let sx = null; const deck = $(ph, '.deck');
    deck.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    deck.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); });
    place();
    cards.forEach((c, i) => G.after(120 + i * 110, () => c.classList.remove('deal'))); // раздача снизу, по одной
    if (auto) { G.after(1700, () => go(1)); G.after(2700, () => go(1)); G.after(3700, () => go(1)); G.after(4700, start); }
    return () => { G.clear(); delete ph.dataset.busy; };
  }

  /* ================= 2 · Поток (Elevate «Processing») ================= */
  const FLOW = [
    { en: 'He is cooking dinner', ru: 'Он готовит ужин', o: ['Он готовит ужин', 'Он готовил ужин', 'Она готовит ужин'], k: 0 },
    { en: 'We are waiting here', ru: 'Мы ждём здесь', o: ['Мы ждали здесь', 'Мы ждём здесь', 'Они ждут здесь'], k: 1 },
    { en: 'I am listening to music', ru: 'Я слушаю музыку', o: ['Я слушал музыку', 'Ты слушаешь музыку', 'Я слушаю музыку'], k: 2 },
  ];
  const TEMPO = [{ ms: 520, x: '1,0', on: 4 }, { ms: 400, x: '1,3', on: 6 }, { ms: 300, x: '1,6', on: 8 }, { ms: 240, x: '1,9', on: 10 }];
  function flow(ph, auto) {
    const G = timers(); let r = 0, lv = 0, open = false;
    $(ph, '.lay').innerHTML = `
      <div class="top"><div class="gbtn t">${I('close')}</div>
        <div style="display:flex;align-items:center;gap:12px"><div class="tempo">${Array.from({ length: 10 }, (_, i) => `<i style="--n:${i}"></i>`).join('')}</div><span class="gpill"><span>Темп ×<span class="num tx"></span></span></span></div>
        <span class="gpill rn"></span></div>
      <div class="segs" style="margin-top:14px">${FLOW.map(() => '<i></i>').join('')}</div>
      <div class="stage"><div style="flex:.8"></div>
        <div class="reader"><div class="line"></div><div class="beam"><i></i></div><div class="ru fade hid"></div></div>
        <div style="flex:1"></div><div class="ask"></div>
        <div class="ans" style="margin-top:16px"></div></div>`;
    const line = $(ph, '.line'), ans = $(ph, '.ans'), ask = $(ph, '.ask'), ru = $(ph, '.ru'), beam = $(ph, '.beam i'), sun = $(ph, '.sun');
    const tempo = () => { $$(ph, '.tempo i').forEach((b, i) => b.classList.toggle('on', i < TEMPO[lv].on)); $(ph, '.tx').textContent = TEMPO[lv].x; sun.style.transform = `scale(${1 + lv * .12})`; };
    const round = () => {
      const q = FLOW[r], ms = TEMPO[lv].ms, ws = q.en.split(' '); open = false;
      $(ph, '.rn').textContent = `${r + 1} / ${FLOW.length}`; tempo();
      beam.parentNode.classList.remove('hid'); line.classList.remove('still'); line.style.setProperty('--t', Math.round(ms * .55) + 'ms');
      line.innerHTML = ws.map((w) => `<span>${w}</span>`).join(''); ru.classList.add('hid'); ask.textContent = '';
      ans.innerHTML = q.o.map((t, i) => `<div class="at t hid" data-i="${i}">${t}</div>`).join('');
      const sp = $$(line, 'span'), total = ws.length * ms + ms * 1.4;
      sp.forEach((s, i) => { G.after(350 + i * ms, () => s.classList.add('in')); G.after(350 + i * ms + ms * 1.5, () => s.classList.add('out')); });
      beam.getAnimations().forEach((a) => a.cancel());
      beam.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: total, delay: 350, fill: 'forwards', easing: 'linear' });
      G.after(350 + total + 150, () => {
        open = true; ask.textContent = 'Что было сказано?'; beam.parentNode.classList.add('hid');
        $$(ans, '.at').forEach((a, i) => { a.classList.remove('hid'); a.classList.add('rise'); a.style.setProperty('--dl', i * 70 + 'ms'); });
        if (auto) G.after(1000, () => pick(r === 1 ? 0 : q.k)); // показываем и промах: на второй фразе
      });
      log('поток: фраза', r + 1, q.en, 'мс на слово', ms);
    };
    const pick = (i) => {
      if (!open) return; open = false; const q = FLOW[r], ok = i === q.k, tiles = $$(ans, '.at');
      tiles.forEach((a, k) => { if (k === q.k) a.classList.add('ok'); else if (k === i) a.classList.add('no'); else a.classList.add('off'); });
      line.classList.add('still'); $$(line, 'span').forEach((s) => s.classList.remove('out')); ru.textContent = q.ru; ru.classList.remove('hid');
      ask.textContent = ok ? 'Верно — темп растёт' : 'Мимо — темп ниже, фраза уйдёт в «Ошибки»';
      lv = Math.max(0, Math.min(TEMPO.length - 1, lv + (ok ? 1 : -1))); tempo(); bump($(ph, '.tx'));
      $$(ph, '.segs i')[r].style.setProperty('--p', 1); log('поток: ответ', ok ? 'верно' : 'ошибка', 'темп →', TEMPO[lv].x);
      if (r < FLOW.length - 1) G.after(ok ? 1500 : 2300, () => { r += 1; ready(round, true); });
    };
    ans.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(+a.dataset.i); });
    // зачем (владелец 11.11: «не было ничего, что предупредит… не понял, когда фразы начали появляться»):
    // сначала правило и кнопка «Начать», потом отсчёт «3-2-1» на месте фразы, и только потом слова; перед каждой следующей фразой — короткий сигнал
    const ready = (next, short) => {
      line.classList.add('still'); ru.classList.add('hid'); ans.innerHTML = ''; beam.parentNode.classList.add('hid'); ask.textContent = 'Смотри сюда — фраза появится здесь';
      if (short) { line.innerHTML = '<span class="in" style="font-size:24px;opacity:.7">Следующая фраза</span>'; G.after(1100, next); return; }
      [3, 2, 1].forEach((k, j) => G.after(j * 800, () => { line.innerHTML = `<span class="in">${k}</span>`; })); G.after(2400, next);
    };
    line.classList.add('still'); line.innerHTML = '<span class="in">Поток</span>'; beam.parentNode.classList.add('hid'); ask.textContent = '';
    ru.textContent = 'Фраза появится по одному слову и исчезнет. Потом выбери, что было сказано. За верный ответ темп растёт.'; ru.classList.remove('hid');
    ans.innerHTML = `<div class="wcta t go">${I('play')}Начать</div>`; $(ph, '.rn').textContent = `0 / ${FLOW.length}`; tempo();
    const go = () => { if (ph.dataset.started) return; ph.dataset.started = '1'; log('поток: игрок нажал «Начать» — отсчёт'); ready(round, false); };
    $(ans, '.go').addEventListener('click', go);
    if (auto) G.after(1800, go);
    return () => { G.clear(); beam.getAnimations().forEach((a) => a.cancel()); delete ph.dataset.started; };
  }

  /* ================= 3 · Лишнее слово (Elevate «Brevity») ================= */
  const CUT = [
    { w: ['They', 'are', 'do', 'watching', 'TV'], x: 2, ru: 'Они смотрят телевизор', why: ['«do» здесь лишнее', 'В «are watching» помощник уже есть — это are.'] },
    { w: ['She', 'is', 'writing', 'to', 'messages'], x: 3, ru: 'Она пишет сообщения', why: ['«to» здесь лишнее', 'Write messages — без предлога.'] },
    { w: ['I', 'am', 'be', 'working', 'now'], x: 2, ru: 'Я работаю сейчас', why: ['«be» здесь лишнее', 'Am — это уже форма be.'] },
    { w: ['We', 'are', 'waiting', 'at', 'here'], x: 3, ru: 'Мы ждём здесь', why: ['«at» здесь лишнее', 'Here не требует предлога.'] },
  ];
  const PATH = 'M36 70 C 92 20, 138 96, 200 54 S 312 12, 372 44';
  function cut(ph, auto) {
    const G = timers(); let r = 0, streak = 0, sec = 60, open = false, tick = 0;
    $(ph, '.lay').innerHTML = `
      <div class="top"><div class="gbtn t">${I('close')}</div><div style="flex:1"></div><span class="gpill">${I('flame', 's18')}<span class="num sr">0</span></span><span class="gpill"><span class="num tm">1:00</span></span></div>
      <div class="trail"><svg viewBox="0 0 400 96"><path d="${PATH}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 9"/><path class="done" d="${PATH}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><g class="nodes"></g></svg><div class="mk">${K.coinImg(7, 44)}</div></div>
      <div class="stage"><div style="flex:.5"></div><div class="ask">Убери лишнее слово</div>
        <div class="sent" style="margin-top:8px"></div><div class="ru fade hid"></div>
        <div class="gl why hid"><div class="tl">${I('check', 's20')}</div><div class="tx"></div></div><div style="flex:1"></div></div>`;
    const sent = $(ph, '.sent'), ru = $(ph, '.ru'), why = $(ph, '.why'), mk = $(ph, '.mk'), path = $(ph, 'path.done'), len = path.getTotalLength(), box = $(ph, '.trail');
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len; // зачем: на старте тропа пустая сразу, без «сматывания» белой линии
    const at = (k) => path.getPointAtLength(len * k / CUT.length);
    $(ph, '.nodes').innerHTML = CUT.map((_, k) => { const p = at(k + 1); return `<circle cx="${p.x}" cy="${p.y}" r="${k === CUT.length - 1 ? 7 : 4.5}" fill="${k === CUT.length - 1 ? '#fff' : 'rgba(255,255,255,.5)'}"/>`; }).join('');
    const move = (k, hop) => { const p = at(k), sx = box.clientWidth / 400; mk.style.transform = `translate(${p.x * sx}px,${p.y}px)`; path.style.strokeDashoffset = len * (1 - k / CUT.length); if (hop) { mk.classList.remove('hop'); void mk.offsetWidth; mk.classList.add('hop'); } };
    const round = () => {
      const q = CUT[r]; open = true; sent.classList.remove('done'); ru.classList.add('hid'); why.classList.add('hid');
      sent.innerHTML = q.w.map((w, i) => `<span class="w rise" data-i="${i}" style="--i:${i};--dl:${i * 60}ms">${w}</span>`).join('');
      log('лишнее слово: фраза', r + 1, q.w.join(' '));
      if (auto) { if (r === 0) G.after(1300, () => tap(3)); G.after(r === 0 ? 2300 : 1400, () => tap(q.x)); }
    };
    const tap = (i) => {
      if (!open) return; const q = CUT[r], el = $(sent, `.w[data-i="${i}"]`); if (!el) return;
      if (i !== q.x) { el.classList.remove('rise', 'no'); void el.offsetWidth; el.classList.add('no'); streak = 0; $(ph, '.sr').textContent = 0; log('лишнее слово: мимо', q.w[i]); return; }
      open = false; $$(sent, '.w').forEach((w) => w.classList.remove('no')); const rest = $$(sent, '.w').filter((w) => w !== el), first = rest.map((w) => w.getBoundingClientRect());
      // зачем: соседи должны «съехаться», а не прыгнуть — слово вынимаем из потока и доигрываем разницу позиций (FLIP)
      const pr = sent.getBoundingClientRect(), er = el.getBoundingClientRect();
      sent.style.position = 'relative'; Object.assign(el.style, { position: 'absolute', left: er.left - pr.left + 'px', top: er.top - pr.top + 'px', margin: 0 });
      el.classList.remove('rise'); el.classList.add('drop');
      rest.forEach((w, k) => { w.classList.remove('rise'); const b = w.getBoundingClientRect(); w.animate([{ transform: `translate(${first[k].left - b.left}px,${first[k].top - b.top}px)` }, { transform: 'none' }], { duration: 520, delay: 180, fill: 'backwards', easing: 'cubic-bezier(.2,1,.3,1)' } /* зачем: сосед не въезжает под ещё не упавшее слово */); });
      streak += 1; $(ph, '.sr').textContent = streak; bump($(ph, '.sr'));
      G.after(480, () => { sent.classList.add('done'); ru.textContent = q.ru; ru.classList.remove('hid'); $(why, '.tx').innerHTML = `<b>${q.why[0]}</b>${q.why[1]}`; why.classList.remove('hid'); move(r + 1, true); });
      log('лишнее слово: убрано', q.w[i], 'серия', streak);
      if (r < CUT.length - 1) G.after(2900, () => { r += 1; round(); });
    };
    sent.addEventListener('click', (e) => { const w = e.target.closest('.w'); if (w) tap(+w.dataset.i); });
    tick = setInterval(() => { sec = Math.max(0, sec - 1); $(ph, '.tm').textContent = `0:${String(sec).padStart(2, '0')}`; }, 1000);
    mk.style.transition = 'none'; move(0); void mk.offsetWidth; mk.style.transition = ''; path.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.2,.9,.2,1)'; round();
    return () => { G.clear(); clearInterval(tick); };
  }

  /* ================= 4 · Сортировка (Elevate «Agility») ================= */
  const SORT = [
    { en: 'I am working now', k: 'l', hint: 'now — действие идёт прямо сейчас' },
    { en: 'He cooks dinner every day', k: 'r', hint: 'every day — это привычка' },
    { en: 'She is writing messages', k: 'l', hint: 'is writing — она в процессе' },
    { en: 'We usually wait here', k: 'r', hint: 'usually — так бывает обычно' },
    { en: 'They are watching TV', k: 'l', hint: 'are watching — они в процессе' },
    { en: 'I listen to music on Fridays', k: 'r', hint: 'on Fridays — повторяется' },
  ];
  function sort(ph, auto) {
    const G = timers(); let cur = 0, n = { l: 0, r: 0 }, miss = 0, raf = 0;
    $(ph, '.lay').innerHTML = `
      <div class="top"><div class="gbtn t">${I('close')}</div><div class="segs" style="flex:1;margin:0 6px">${SORT.map(() => '<i></i>').join('')}</div><span class="gpill"><span class="num">0:45</span></span></div>
      <div class="ask" style="margin-top:26px">Смахни фразу в свою сторону</div>
      <div class="pile">${SORT.map((c, i) => `<div class="sc" data-i="${i}" data-d="${Math.min(3, i)}"><div class="en">${c.en}</div><div class="hint">${c.hint}</div></div>`).reverse().join('')}
        <div class="gl fin hid" style="position:absolute;left:24px;right:24px;top:34%;padding:24px;text-align:center"><div class="big" style="font-size:30px;line-height:36px"></div><div class="sub" style="margin-top:6px"></div></div></div>
      <div class="bins"><div class="gl bin l t" data-k="l"><div><div class="nm">Прямо сейчас</div><div class="ex">am / is / are + -ing</div></div><div class="ct">0</div></div>
        <div class="gl bin r t" data-k="r"><div><div class="nm">Обычно</div><div class="ex">каждый день, всегда</div></div><div class="ct">0</div></div></div>`;
    const bins = { l: $(ph, '.bin.l'), r: $(ph, '.bin.r') }, card = (i) => $(ph, `.sc[data-i="${i}"]`);
    const hot = (dx) => { bins.l.classList.toggle('hot', dx < -70); bins.r.classList.toggle('hot', dx > 70); };
    const pose = (el, dx, dy = 0) => { el.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 14}deg)`; hot(dx); };
    const drop = (k) => {
      const c = SORT[cur], el = card(cur); if (!el || el.dataset.gone) return; hot(0); el.classList.remove('drag');
      if (k !== c.k) { el.style.transform = ''; el.classList.remove('miss'); void el.offsetWidth; el.classList.add('miss'); bins[k].classList.remove('nope'); void bins[k].offsetWidth; bins[k].classList.add('nope'); miss += 1; log('сортировка: мимо', c.en); return; }
      el.dataset.gone = '1'; el.style.transform = `translate(${k === 'l' ? -150 : 150}px,330px) rotate(${k === 'l' ? -18 : 18}deg) scale(.3)`; el.style.opacity = 0;
      const b = bins[k]; b.classList.remove('yes'); void b.offsetWidth; b.classList.add('yes'); n[k] += 1; const ct = $(b, '.ct'); ct.textContent = n[k]; bump(ct);
      $$(ph, '.segs i')[cur].style.setProperty('--p', 1); log('сортировка: верно', c.en, '→', k === 'l' ? 'сейчас' : 'обычно');
      cur += 1; SORT.forEach((_, i) => { const e = card(i); if (e && i >= cur) e.dataset.d = Math.min(3, i - cur); });
      G.after(420, () => el.remove());
      if (cur === SORT.length) G.after(500, () => { const f = $(ph, '.fin'); $(f, '.big').textContent = `${SORT.length} из ${SORT.length}`; $(f, '.sub').textContent = miss ? `С подсказкой: ${miss}` : 'Без единой подсказки'; f.classList.remove('hid'); f.classList.add('rise'); });
      else if (auto) G.after(900, play);
    };
    // живое перетаскивание верхней карты
    let sx = 0, sy = 0, el = null;
    $(ph, '.pile').addEventListener('pointerdown', (e) => { const c = e.target.closest('.sc'); if (!c || +c.dataset.i !== cur) return; el = c; sx = e.clientX; sy = e.clientY; el.classList.add('drag'); el.classList.remove('miss'); el.setPointerCapture(e.pointerId); });
    $(ph, '.pile').addEventListener('pointermove', (e) => { if (el) pose(el, e.clientX - sx, (e.clientY - sy) * .3); });
    const up = (e) => { if (!el) return; const dx = e.clientX - sx, c = el; el = null; c.classList.remove('drag'); if (Math.abs(dx) > 90) drop(dx < 0 ? 'l' : 'r'); else { c.style.transform = ''; hot(0); } };
    $(ph, '.pile').addEventListener('pointerup', up); $(ph, '.pile').addEventListener('pointercancel', up);
    Object.values(bins).forEach((b) => b.addEventListener('click', () => drop(b.dataset.k)));
    // показ: «палец» ведёт карту; на второй фразе сначала не туда
    function swipe(k, done) { const c = card(cur); if (!c) return; c.classList.add('drag'); const t0 = performance.now(), to = k === 'l' ? -128 : 128; const f = (now) => { const p = Math.min(1, (now - t0) / 460), e = 1 - Math.pow(1 - p, 2); pose(c, to * e, 18 * e); if (p < 1) raf = requestAnimationFrame(f); else done(); }; raf = requestAnimationFrame(f); }
    function play() { const c = SORT[cur]; if (!c) return; if (cur === 1 && !miss) swipe('l', () => { drop('l'); G.after(1500, play); }); else swipe(c.k, () => drop(c.k)); }
    if (auto) G.after(1200, play);
    return () => { G.clear(); cancelAnimationFrame(raf); };
  }

  /* ================= 5 · Итог игры ================= */
  function result(ph) {
    const G = timers();
    const bell = Array.from({ length: 60 }, (_, i) => { const x = i / 59; return `${(x * 354).toFixed(1)},${(58 - 52 * Math.exp(-Math.pow(x - .46, 2) / .052)).toFixed(1)}`; }).join(' L');
    $(ph, '.lay').innerHTML = `
      <div class="top"><div class="gbtn t">${I('close')}</div><div class="ttl" style="text-align:center">Поток</div><span class="gpill">${K.coinImg(7, 20)}<span class="num cn">1 240</span></span></div>
      <div class="segs" style="margin-top:14px;flex:none"><i style="--p:1"></i><i></i><i></i></div>
      <div class="scrollin"><div style="height:18px"></div>
        <div class="ringw"><svg viewBox="0 0 208 208"><circle class="bg" cx="104" cy="104" r="90"/><circle class="fg" cx="104" cy="104" r="90"/></svg><div class="mid"><div class="v">0%</div><div class="l">точность</div></div></div>
        <div style="display:flex;justify-content:center;gap:12px;margin:16px 0 20px"><span class="gpill">Темп ×1,6</span><span class="gpill">7 из 8 фраз</span></div>
        <div class="gl panel2"><div class="h">Быстрее, чем <b class="pc">0%</b> учеников уровня A2</div>
          <div class="curve"><svg viewBox="0 0 354 62" preserveAspectRatio="none"><defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.34)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></linearGradient></defs><path d="M0,62 L${bell} L354,62 Z" fill="url(#bg1)"/><path d="M${bell}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-linecap="round"/></svg><div class="pin"></div></div></div>
        <div class="gl panel2"><div class="kv"><div class="tx">Скорость чтения</div><span class="dl">${I('up', 's16')}26</span><span class="val sv">412</span></div><div class="bar"><i class="was" style="--p:.58"></i><i class="now" style="--p:.58"></i></div></div>
        <div class="gl panel2"><div class="kv"><div class="tx" style="font-size:17px;font-weight:700">Разбор ошибок</div><span class="gpill" style="height:26px;padding:0 10px;font-size:14px">1</span></div>
          <div class="mist t"><div class="tl">${I('close', 's18')}</div><div class="tx">We are waiting here<span>Мы ждём здесь · ты выбрал <s>ждали</s></span></div>${I('fwd', 's18')}</div></div>
        <div class="gl panel2"><div class="h">Как тебе игра?</div><div class="rate"><div class="gbtn t on">${I('thumb', 's20')}</div><div class="gbtn t" style="transform:scaleY(-1)">${I('thumb', 's20')}</div><div class="fld">Что улучшить</div></div></div>
      </div>
      <div class="dock"><div class="wcta t">${I('play')}Дальше · Лишнее слово</div></div>`;
    G.after(350, () => {
      $(ph, '.fg').style.strokeDashoffset = 565.5 * (1 - .92); count($(ph, '.ringw .v'), 0, 92, 1400, '%');
      $(ph, '.pin').style.transform = `translateX(${$(ph, '.curve').clientWidth * .72}px)`; count($(ph, '.pc'), 0, 72, 1400, '%');
    });
    G.after(900, () => { $(ph, '.bar .now').style.setProperty('--p', .64); count($(ph, '.sv'), 412, 438, 1100); });
    G.after(1900, () => { const c = $(ph, '.cn'); count(c, 1240, 1252, 650); bump(c); });
    log('итог: показан — точность 92, процентиль 72, скорость 412 → 438, монеты +12');
    return () => G.clear();
  }

  /* ================= 6 · Навыки (Elevate «EPQ») ================= */
  const SK = [
    { nm: 'Слух', v: 310, d: 12, src: 'Растёт от видео и диалогов' },
    { nm: 'Скорость', v: 340, d: 26, src: 'Растёт от игр «Поток» и «Блиц»' },
    { nm: 'Словарь', v: 370, d: 8, src: 'Растёт от карточек и «Найди пары»' },
    { nm: 'Грамматика', v: 275, d: 5, src: 'Растёт от уроков и «Сортировки»' },
    { nm: 'Речь', v: 240, d: 0, src: 'Растёт от диалогов с голосом' },
  ];
  function skills(ph, auto) {
    const G = timers(); let raf = 0, sel = -1; const cx = 165, cy = 140, R = 96, N = SK.length;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / N, pt = (i, k) => [cx + Math.cos(ang(i)) * R * k, cy + Math.sin(ang(i)) * R * k];
    const poly = (k) => SK.map((_, i) => pt(i, typeof k === 'function' ? k(i) : k).map((n) => n.toFixed(1)).join(',')).join(' ');
    const weak = SK.reduce((a, b) => (b.v < a.v ? b : a));
    $(ph, '.lay').innerHTML = `
      <div class="top"><div class="gbtn t">${I('back')}</div><div class="ttl">Навыки</div><span class="gpill">${I('trend', 's18')}за неделю</span></div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:20px;flex:none"><div><div class="over">Индекс речи</div><div class="big idx" style="margin-top:4px;font-variant-numeric:tabular-nums">0</div></div><span class="gpill" style="margin-bottom:4px">Уверенный · A2</span></div>
      <div class="radar"><svg viewBox="0 0 330 272">${[.34, .67, 1].map((k) => `<polygon class="grid" points="${poly(k)}"/>`).join('')}${SK.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="ax" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`; }).join('')}<polygon class="shape" points="${poly(0)}"/>${SK.map(() => '<circle class="pt" r="4.5"/>').join('')}</svg>
        ${SK.map((s, i) => { const [x, y] = pt(i, 1.24); return `<div class="lb" style="left:${x}px;top:${y}px">${s.nm}</div>`; }).join('')}</div>
      <div class="over src" style="text-align:center;margin-top:8px;min-height:18px">Нажми на навык — покажу, от чего он растёт</div>
      <div class="gl skl">${SK.map((s, i) => `<div class="sk" data-i="${i}"><div class="nm">${s.nm}</div><div class="bar"><i></i></div><div class="val">${s.v}</div><div class="dl${s.d ? '' : ' z'}">${s.d ? '+' + s.d : '—'}</div></div>`).join('')}</div>
      <div style="flex:1"></div><div class="wcta t">${I('play')}Подтянуть · ${weak.nm}</div>`;
    const shape = $(ph, '.shape'), pts = $$(ph, '.pt');
    const draw = (p) => { const k = (i) => (SK[i].v / 500) * Math.min(1, Math.max(0, p * 1.5 - i * .1)); shape.setAttribute('points', poly(k)); pts.forEach((c, i) => { const [x, y] = pt(i, k(i)); c.setAttribute('cx', x); c.setAttribute('cy', y); }); };
    const pick = (i) => { sel = i; $$(ph, '.sk').forEach((r, k) => r.classList.toggle('on', k === i)); $$(ph, '.lb').forEach((r, k) => r.classList.toggle('on', k === i)); pts.forEach((r, k) => r.classList.toggle('on', k === i)); $(ph, '.src').textContent = SK[i].src; log('навыки: выбран', SK[i].nm); };
    $(ph, '.skl').addEventListener('click', (e) => { const r = e.target.closest('.sk'); if (r) pick(+r.dataset.i); });
    draw(0);
    G.after(350, () => {
      const t0 = performance.now(); const f = (now) => { const p = Math.min(1, (now - t0) / 1300), e = 1 - Math.pow(1 - p, 3); draw(e); if (p < 1) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f);
      count($(ph, '.idx'), 0, SK.reduce((a, s) => a + s.v, 0), 1300);
      $$(ph, '.sk .bar i').forEach((b, i) => G.after(i * 80, () => b.style.setProperty('--p', SK[i].v / 500)));
    });
    if (auto) [1, 4, 2].forEach((i, k) => G.after(2300 + k * 1300, () => pick(i)));
    return () => { G.clear(); cancelAnimationFrame(raf); };
  }

  /* ================= сборка страницы ================= */
  const SCREENS = [
    { id: 'workout', fn: workout, lbl: '1 · Разминка: три игры на сегодня', note: 'Карты листаются смахиванием. «Начать» раскрывает карту в игру, после игры на ней остаётся результат.' },
    { id: 'flow', fn: flow, cls: 'deep', lbl: '2 · «Поток»: фраза мелькает, темп растёт', note: 'Верный ответ ускоряет показ, ошибка замедляет. Вторая фраза в показе — с ошибкой.' },
    { id: 'cut', fn: cut, cls: 'deep', lbl: '3 · «Лишнее слово»: монета идёт по тропе', note: 'Слово падает, фраза съезжается, монета перепрыгивает на следующую точку.' },
    { id: 'sort', fn: sort, cls: 'deep', lbl: '4 · «Сортировка»: смахни в свою сторону', note: 'Карту можно тащить мышью или нажать на корзину. При ошибке карта возвращается с подсказкой.' },
    { id: 'result', fn: result, lbl: '5 · Итог игры: точность, сравнение, разбор', note: 'Список прокручивается. Сравнение с другими — единственное, чего в приложении сейчас нет совсем.' },
    { id: 'skills', fn: skills, lbl: '6 · Навыки: пять осей вместо одной цифры', note: 'Нажатие на строку подсвечивает ось и объясняет, какие разделы её растят.' },
  ];
  const stop = {};
  function run(id, auto = true) { const s = SCREENS.find((x) => x.id === id), ph = document.querySelector(`[data-ph="${id}"]`); if (stop[id]) stop[id](); stop[id] = s.fn(ph, auto); log('запуск экрана', id, auto ? '(показ)' : ''); }
  function build() {
    const half = (from, to, id, title, lead) => `<section class="block" id="${id}"><h2>${title}</h2><p>${lead}</p><div class="phones">${SCREENS.slice(from, to).map((s) => `<div class="col"><div class="lbl">${s.lbl}</div>${sky(s.id, '', { cls: s.cls })}<button class="replay" data-run="${s.id}">${I('play', 's16')}Показать ещё раз</button><div class="cap2">${s.note}</div></div>`).join('')}</div></section>`;
    document.getElementById('root').innerHTML =
      half(0, 1, 'day', 'Вход', 'Elevate каждый день даёт три игры, подобранные под слабые места. У нас это ложится на «Задания дня» и раздел ошибок.') +
      half(1, 4, 'games', 'Игры', 'Три игры — три разных движения: читать на скорость, убирать, раскладывать. Задания внутри — те же, что уже есть в уроках и в двенадцати новых механиках.') +
      half(4, 6, 'after', 'После игры', 'То, ради чего в Elevate возвращаются: видно, насколько ты вырос и где слабое место.');
    document.querySelectorAll('.ph.sky').forEach(stars);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-run]'); if (b) run(b.dataset.run);
      const th = e.target.closest('[data-theme-set]'); if (th) { document.body.dataset.theme = th.dataset.themeSet; document.querySelectorAll('[data-theme-set]').forEach((x) => x.classList.toggle('on', x === th)); log('тема', th.dataset.themeSet); }
    });
    // зачем: показ стартует, когда телефон попал в окно — владелец видит анимацию с начала, а не её хвост
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); run(en.target.dataset.ph); } }), { threshold: .35 });
    document.querySelectorAll('.ph.sky').forEach((p) => io.observe(p));
    K.init();
  }
  window.ELP1 = SCREENS; // зачем: общий макет берёт эти же экраны, не копируя их
  if (!document.body.dataset.page) { /* зачем: страница собирает себя сама только когда она первая; на остальных её экраны берут через ELP1 */ window.__elevate = { run, SCREENS }; document.addEventListener('DOMContentLoaded', build); }
})();
