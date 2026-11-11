/* Механики Elevate — общая основа трёх страниц (вход и итоги, режимы, новые игры).
   зачем: сцена, таймеры, общий итог и «смахивание» нужны всем страницам — один источник, чтобы экраны не разъезжались.
   Журнал — префикс [ELEVATE]. */
window.EL = (() => {
  const I = K.icon;
  const log = (...a) => console.log('[ELEVATE]', ...a);
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const SB = `<div class="sb"><span>9:41</span><span class="sys"><svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><span class="bat"></span></span></div>`;
  const sky = (id, cls = '') => `<div class="ph sky ${cls}" data-ph="${id}">${SB}<div class="sun"></div><div class="haze"></div><div class="stars"></div><div class="vig"></div><div class="lay"></div><div class="hi"></div></div>`;
  const was = (body) => `<div class="was"><div class="tagw">Было</div><div class="wasbox"><div class="ph">${SB}<div class="scr"><div class="in">${body}</div></div><div class="hi"></div></div></div></div>`;
  const timers = () => { let ids = []; return { after(ms, fn) { const id = setTimeout(fn, ms); ids.push(id); return id; }, clear() { ids.forEach(clearTimeout); ids = []; } }; };
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
  function count(el, from, to, ms, suffix = '') {
    const t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e) + suffix; if (p < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const bump = (el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
  const again = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  function stars(ph) { // зачем: те же звёзды на любой платформе — xorshift32 с сидом 3, как в scene-approved.js
    let s = 3; const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    $(ph, '.stars').innerHTML = Array.from({ length: 46 }, () => { const x = r() * 100, y = r() * 100, d = .8 + r() * 1.8, a = .18 + r() * .5; return `<i style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;--a:${a.toFixed(2)};animation-delay:${(-r() * 3.6).toFixed(2)}s"></i>`; }).join('');
  }
  const coins = (n = '1 240') => `<span class="gpill">${K.coinImg(7, 20)}<span class="num cn">${n}</span></span>`;
  const top = (o = {}) => `<div class="top"><div class="gbtn t">${I(o.back ? 'back' : 'close')}</div>${o.mid || '<div style="flex:1"></div>'}${o.right || ''}</div>`;
  const segs = (n, done = 0, style = 'margin-top:14px') => `<div class="segs" style="${style}${/flex:1/.test(style) ? '' : ';flex:none'}">${Array.from({ length: n }, (_, i) => `<i${i < done ? ' style="--p:1"' : ''}></i>`).join('')}</div>`;
  const tiles = (arr) => arr.map((t, i) => `<div class="at t hid" data-i="${i}">${t}</div>`).join('');
  const showTiles = (box) => $$(box, '.at').forEach((a, i) => { a.classList.remove('hid'); a.classList.add('rise'); a.style.setProperty('--dl', i * 70 + 'ms'); });
  const mark = (box, key, picked) => $$(box, '.at').forEach((a, k) => a.classList.add(k === key ? 'ok' : k === picked ? 'no' : 'off'));
  const hearts = (n = 3) => `<span class="gpill"><span class="hearts">${Array.from({ length: n }, () => I('heartF')).join('')}</span></span>`;

  /* ---------- общий итог: один экран на все режимы ---------- */
  const P = {
    growth: (nm, from, to, max = 500) => `<div class="gl panel2"><div class="kv"><div class="tx">${nm}</div><span class="dl">${I('up', 's16')}${to - from}</span><span class="val cnt" data-from="${from}" data-to="${to}">${from}</span></div><div class="bar"><i class="was" style="--p:${from / max}"></i><i class="now" style="--p:${from / max}" data-p="${to / max}"></i></div></div>`,
    mistakes: (title, rows) => `<div class="gl panel2"><div class="kv"><div class="tx" style="font-size:17px;font-weight:700">${title}</div><span class="gpill" style="height:26px;padding:0 10px;font-size:14px">${rows.length}</span></div>${rows.map(([a, b]) => `<div class="mist t"><div class="tl">${I('close', 's18')}</div><div class="tx">${a}<span>${b}</span></div>${I('fwd', 's18')}</div>`).join('')}</div>`,
    record: (title, rows) => `<div class="gl panel2"><div class="h">${title}</div>${rows.map(([l, v, p, dim]) => `<div class="rec${dim ? ' old' : ''}"><span>${l}</span><div class="bar"><i class="now" data-p="${p}"></i></div><b>${v}</b></div>`).join('')}</div>`,
    chips: (title, arr) => `<div class="gl panel2"><div class="h">${title}</div><div class="chipsr">${arr.map((c) => `<span class="chipr">${c}</span>`).join('')}</div></div>`,
    diff: (title, html, sub) => `<div class="gl panel2"><div class="h">${title}</div><div class="diff">${html}</div><div class="sub">${sub}</div></div>`,
    note: (title, sub) => `<div class="gl panel2"><div class="h">${title}</div><div class="sub" style="margin-top:4px">${sub}</div></div>`,
    rate: () => `<div class="gl panel2"><div class="h">Как тебе занятие?</div><div class="rate" style="gap:12px"><div class="gbtn t on">${I('thumb', 's20')}</div><div class="gbtn t" style="transform:scaleY(-1)">${I('thumb', 's20')}</div><div class="fld">Что улучшить</div></div></div>`,
  };
  const result = (c) => (ph) => {
    const G = timers(), two = !!c.cta2;
    $(ph, '.lay').innerHTML = `${top({ mid: `<div class="ttl" style="text-align:center">${c.title}</div>`, right: coins() })}
      <div class="scrollin${two ? ' tall' : ''}"><div style="height:16px"></div>
        <div class="ringw sm"><svg viewBox="0 0 208 208"><circle class="bg" cx="104" cy="104" r="90"/><circle class="fg" cx="104" cy="104" r="90"/></svg><div class="mid"><div class="v${c.ring.of ? ' frc' : ''}">0</div><div class="l">${c.ring.label}</div></div></div>
        <div class="hero2"><div class="t1">${c.h1}</div><div class="t2">${c.h2}</div></div>
        ${c.panels.join('')}</div>
      <div class="dock"><div class="wcta t">${I('play')}${c.cta}</div>${two ? `<div class="cta2 t">${c.cta2}</div>` : ''}</div>`;
    const v = $(ph, '.ringw .v'), r = c.ring;
    G.after(350, () => { $(ph, '.fg').style.strokeDashoffset = 565.5 * (1 - r.p); const t0 = performance.now(); const f = (now) => { const p = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - p, 3), n = Math.round(r.v * e); v.textContent = r.of ? `${n} / ${r.of}` : n + (r.suffix || ''); if (p < 1 && v.isConnected) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    let stopStar = () => {}; G.after(900, () => { stopStar = starGrow(ph, G); });
    G.after(900, () => { $$(ph, '.now[data-p]').forEach((b) => b.style.setProperty('--p', b.dataset.p)); $$(ph, '.cnt').forEach((n) => count(n, +n.dataset.from, +n.dataset.to, 1100)); });
    G.after(1900, () => { const cn = $(ph, '.cn'); count(cn, 1240, 1240 + (c.coins || 10), 650); bump(cn); });
    log('итог показан:', c.title);
    return () => { G.clear(); stopStar(); };
  };
  const wasResult = (o) => was(`<div style="height:120px"></div><div class="tile t61" style="margin:0 auto">${I('check', 's28')}</div><div class="wt center" style="margin-top:22px;font-size:30px">${o.title}</div><div class="ws center">${o.sub || ''}</div>
    <div class="st3">${o.stats.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div><div style="height:34px"></div>${(o.btns || ['Готово']).map((b, i, a) => `<div class="cta${i < a.length - 1 ? ' gh' : ''}" style="margin-top:12px">${b}</div>`).join('')}`);

  /* ---------- навыки: шесть концов звезды, 30 уровней (решения владельца из опроса 11.11) ---------- */
  // зачем: звезда, строки уровней и итоги обязаны показывать одни и те же числа — данные макета лежат в одном месте
  const LVMAX = 30;
  const SK = [['Слух', 9, .45], ['Речь', 6, .7], ['Словарь', 12, .3], ['Грамматика', 8, .86], ['Скорость', 10, .5], ['Общение', 3, .2]].map(([nm, lv, p]) => ({ nm, lv, p }));
  const need = (lv) => 60 + lv * 10; // очков до следующего уровня: чем выше, тем дольше
  const axis = (lv, p = 0) => Math.sqrt((lv + p) / LVMAX); // зачем: корень — чтобы первые уровни уже давали заметный луч
  const skAxes = (list = SK) => list.map((s) => axis(s.lv, s.p));
  const geo = (size, N) => { const c = size / 2, R = size * .36, pt = (i, k) => [c + Math.cos(-Math.PI / 2 + i * 2 * Math.PI / N) * R * k, c + Math.sin(-Math.PI / 2 + i * 2 * Math.PI / N) * R * k]; return { c, pt, poly: (ks) => ks.map((k, i) => pt(i, k).map((n) => n.toFixed(1)).join(',')).join(' ') }; };
  const starSvg = (size, ks, o = {}) => { const g = geo(size, ks.length); return `<svg class="starsvg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${[.34, .67, 1].map((k) => `<polygon class="grid" points="${g.poly(ks.map(() => k))}"/>`).join('')}${ks.map((_, i) => { const [x, y] = g.pt(i, 1); return `<line class="ax" x1="${g.c}" y1="${g.c}" x2="${x}" y2="${y}"/>`; }).join('')}${o.other ? `<polygon class="shape2" points="${g.poly(o.other)}"/>` : ''}<polygon class="shape" points="${g.poly(o.from || ks)}"/></svg>`; };
  const starLabels = (size, names) => { const g = geo(size, names.length); return names.map((n, i) => { const [x, y] = g.pt(i, 1.28); return `<div class="lb" data-i="${i}" style="left:${x}px;top:${y}px">${n}</div>`; }).join(''); };
  function starTween(svg, from, to, ms = 1300, delay = 0) {
    const g = geo(+svg.getAttribute('width'), to.length), sh = svg.querySelector('.shape'); let raf = 0; const t0 = performance.now() + delay;
    const f = (now) => { const p = Math.min(1, Math.max(0, (now - t0) / ms)), e = 1 - Math.pow(1 - p, 3); sh.setAttribute('points', g.poly(to.map((v, i) => from[i] + (v - from[i]) * e))); if (p < 1 && svg.isConnected) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf);
  }
  // Панель «Навыки растут» на любом итоге: gains = [['Грамматика', доля уровня], …]
  P.star = (gains) => `<div class="gl panel2 starp"><div class="h">Навыки растут</div><div class="starrow"><div class="starbox">${starSvg(128, skAxes())}</div><div class="sgl">${gains.map(([nm, add]) => { const s = SK.find((x) => x.nm === nm); return `<div class="sgr" data-nm="${nm}" data-add="${add}"><div class="kv"><div class="tx">${nm}</div><span class="lvb">уровень <b class="lvn">${s.lv}</b></span></div><div class="bar"><i class="was" style="--p:${s.p}"></i><i class="nowb" style="--p:${s.p}"></i></div><div class="upt">Новый уровень</div></div>`; }).join('')}</div></div></div>`;
  function starGrow(ph, G) {
    const box = $(ph, '.starp'); if (!box) return () => {}; const after = SK.map((s) => ({ ...s }));
    $$(box, '.sgr').forEach((row) => {
      const s = after.find((x) => x.nm === row.dataset.nm), bar = $(row, '.nowb'), sum = s.p + +row.dataset.add;
      if (sum < 1) { s.p = sum; bar.style.setProperty('--p', sum); return; }
      s.lv += 1; s.p = sum - 1; bar.style.setProperty('--p', 1); // зачем: полоса сначала доходит до конца, и только потом уровень щёлкает
      G.after(1200, () => { row.classList.add('up'); const n = $(row, '.lvn'); n.textContent = s.lv; bump(n); bar.style.transition = 'none'; bar.style.setProperty('--p', 0); void bar.offsetWidth; bar.style.transition = ''; bar.style.setProperty('--p', s.p); $(row, '.was').style.setProperty('--p', 0); log('навык поднялся:', s.nm, '→ уровень', s.lv); });
    });
    return starTween($(box, '.starsvg'), skAxes(), after.map((s) => axis(s.lv, s.p)), 1500, 200);
  }

  /* ---------- смахивание в одну из двух сторон (сортировка, правда/ложь) ---------- */
  function swipe(ph, auto, o) {
    const G = timers(); let cur = 0, n = { l: 0, r: 0 }, miss = 0, raf = 0; const D = o.cards;
    $(ph, '.lay').innerHTML = `${top({ mid: segs(D.length, 0, 'flex:1;margin:0 6px'), right: o.right || '<span class="gpill"><span class="num">0:45</span></span>' })}
      <div class="ask" style="margin-top:26px">${o.ask}</div>
      <div class="pile">${D.map((c, i) => `<div class="sc" data-i="${i}" data-d="${Math.min(3, i)}"><div class="en">${c.en}</div>${c.sub ? `<div class="sub" style="color:#5A5C74;margin-top:8px;font-size:17px">${c.sub}</div>` : ''}<div class="hint">${c.hint}</div></div>`).reverse().join('')}
        <div class="gl fin hid" style="position:absolute;left:24px;right:24px;top:34%;padding:24px;text-align:center"><div class="big" style="font-size:30px;line-height:36px"></div><div class="sub" style="margin-top:6px"></div></div></div>
      <div class="bins"><div class="gl bin l t" data-k="l"><div><div class="nm">${o.l[0]}</div><div class="ex">${o.l[1]}</div></div><div class="ct">0</div></div>
        <div class="gl bin r t" data-k="r"><div><div class="nm">${o.r[0]}</div><div class="ex">${o.r[1]}</div></div><div class="ct">0</div></div></div>`;
    const bins = { l: $(ph, '.bin.l'), r: $(ph, '.bin.r') }, card = (i) => $(ph, `.sc[data-i="${i}"]`), pile = $(ph, '.pile');
    const hot = (dx) => { bins.l.classList.toggle('hot', dx < -70); bins.r.classList.toggle('hot', dx > 70); };
    const pose = (el, dx, dy = 0) => { el.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 14}deg)`; hot(dx); };
    const drop = (k) => {
      const c = D[cur], el = card(cur); if (!el || el.dataset.gone) return; hot(0); el.classList.remove('drag');
      if (k !== c.k) { el.style.transform = ''; again(el, 'miss'); again(bins[k], 'nope'); miss += 1; log(o.name, 'мимо', c.en); return; }
      el.dataset.gone = '1'; el.style.transform = `translate(${k === 'l' ? -150 : 150}px,330px) rotate(${k === 'l' ? -18 : 18}deg) scale(.3)`; el.style.opacity = 0;
      again(bins[k], 'yes'); n[k] += 1; const ct = $(bins[k], '.ct'); ct.textContent = n[k]; bump(ct);
      $$(ph, '.segs i')[cur].style.setProperty('--p', 1); log(o.name, 'верно', c.en);
      cur += 1; D.forEach((_, i) => { const e = card(i); if (e && i >= cur) e.dataset.d = Math.min(3, i - cur); });
      G.after(420, () => el.remove()); // guard-ok: удаляется узел макета, данных пользователя здесь нет
      if (cur === D.length) G.after(500, () => { const f = $(ph, '.fin'); $(f, '.big').textContent = `${D.length} из ${D.length}`; $(f, '.sub').textContent = miss ? `С подсказкой: ${miss}` : 'Без единой подсказки'; f.classList.remove('hid'); f.classList.add('rise'); });
      else if (auto) G.after(900, play);
    };
    let sx = 0, sy = 0, el = null;
    pile.addEventListener('pointerdown', (e) => { const c = e.target.closest('.sc'); if (!c || +c.dataset.i !== cur) return; el = c; sx = e.clientX; sy = e.clientY; el.classList.add('drag'); el.classList.remove('miss'); el.setPointerCapture(e.pointerId); });
    pile.addEventListener('pointermove', (e) => { if (el) pose(el, e.clientX - sx, (e.clientY - sy) * .3); });
    const up = (e) => { if (!el) return; const dx = e.clientX - sx, c = el; el = null; c.classList.remove('drag'); if (Math.abs(dx) > 90) drop(dx < 0 ? 'l' : 'r'); else { c.style.transform = ''; hot(0); } };
    pile.addEventListener('pointerup', up); pile.addEventListener('pointercancel', up);
    Object.values(bins).forEach((b) => b.addEventListener('click', () => drop(b.dataset.k)));
    function sw(k, done) { const c = card(cur); if (!c) return; c.classList.add('drag'); const t0 = performance.now(), to = k === 'l' ? -128 : 128; const f = (now) => { const p = Math.min(1, (now - t0) / 460), e = 1 - Math.pow(1 - p, 2); pose(c, to * e, 18 * e); if (p < 1) raf = requestAnimationFrame(f); else done(); }; raf = requestAnimationFrame(f); }
    function play() { const c = D[cur]; if (!c) return; if (cur === 1 && !miss) { const w = c.k === 'l' ? 'r' : 'l'; sw(w, () => { drop(w); G.after(1500, play); }); } else sw(c.k, () => drop(c.k)); }
    if (auto) G.after(1200, play);
    return () => { G.clear(); cancelAnimationFrame(raf); };
  }

  /* ---------- вопрос с вариантами по кругу (на слух, память, точное слово, глаголы) ---------- */
  function quiz(ph, auto, o) {
    const G = timers(); let r = 0, open = false;
    $(ph, '.lay').innerHTML = `${top({ mid: o.mid || '', right: `<span class="gpill rn"></span>` })}${segs(o.rounds.length)}
      <div class="stage"><div style="flex:.7"></div><div class="reader" style="height:auto;min-height:190px"></div><div class="ru fade hid"></div>
        <div style="flex:1"></div><div class="ask"></div><div class="ans${o.two ? ' two' : ''}" style="margin-top:16px${o.two ? ';flex-direction:row' : ''}"></div></div>`;
    const box = $(ph, '.reader'), ans = $(ph, '.ans'), ask = $(ph, '.ask'), ru = $(ph, '.ru');
    const round = () => {
      const q = o.rounds[r]; open = false; $(ph, '.rn').textContent = `${r + 1} / ${o.rounds.length}`; ru.classList.add('hid'); ask.textContent = '';
      ans.innerHTML = tiles(q.o); const wait = o.show(q, box, G, r);
      G.after(wait, () => { open = true; ask.textContent = q.ask || o.ask; showTiles(ans); if (auto) G.after(1100, () => pick(o.missAt === r ? (q.k + 1) % q.o.length : q.k)); });
      log(o.name, 'вопрос', r + 1);
    };
    const pick = (i) => {
      if (!open) return; open = false; const q = o.rounds[r], ok = i === q.k; mark(ans, q.k, i);
      ru.innerHTML = q.ru || ''; if (q.ru) ru.classList.remove('hid'); ask.textContent = ok ? (o.okText || 'Верно') : (o.noText || 'Мимо — уйдёт в «Ошибки»');
      $$(ph, '.segs i')[r].style.setProperty('--p', 1); if (o.done) o.done(q, box, ok, i); log(o.name, ok ? 'верно' : 'ошибка');
      if (r < o.rounds.length - 1) G.after(ok ? 1700 : 2400, () => { r += 1; round(); });
    };
    ans.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(+a.dataset.i); });
    round();
    return () => G.clear();
  }

  /* ---------- сборка страницы ---------- */
  const NAV = [['elevate-all.html', 'Всё вместе'], ['elevate-mechanics.html', 'Шесть механик'], ['elevate-flow.html', 'Вход, итоги, статистика'], ['elevate-modes.html', 'Режимы: было → стало'], ['elevate-games.html', 'Новые игры'], ['elevate-skills.html', 'Навыки и уровни'], ['elevate-peak.html', 'Пик'], ['elevate-learn.html', 'Уроки, ошибки, экзамены'], ['elevate-social.html', 'Диалоги, наборы, друзья']];
  const nav = (cur) => `<div class="elnav">${NAV.map(([h, t]) => `<a href="${h}"${h === cur ? ' class="on"' : ''}>${t}</a>`).join('')}</div>`;
  function mount(sections) {
    const all = sections.flatMap((s) => s.screens), stop = {};
    const run = (id, auto = true) => { const s = all.find((x) => x.id === id), ph = document.querySelector(`[data-ph="${id}"]`); if (!s) return; /* зачем: уменьшенные телефоны «было» в стиле сцены — статичные, показа у них нет */ if (stop[id]) stop[id](); stop[id] = s.fn(ph, auto) || null; log('запуск экрана', id); };
    const colOf = (s) => `<div class="col"><div class="lbl">${s.lbl}</div><div class="pairw">${s.was ? `${s.was}<div class="arrow">${I('arrowR', 's24')}</div>` : ''}<div class="now">${s.was ? '<div class="tagw">Стало</div>' : ''}${sky(s.id, s.cls || '')}</div></div><button class="replay" data-run="${s.id}">${I('play', 's16')}Показать ещё раз</button>${s.note ? `<div class="cap2"${s.was ? ' style="max-width:640px"' : ''}>${s.note}</div>` : ''}</div>`;
    document.getElementById('root').innerHTML = sections.map((s) => `<section class="block" id="${s.id}"><h2>${s.title}</h2><p>${s.lead}</p>${s.html || ''}<div class="phones">${s.screens.map(colOf).join('')}</div></section>`).join('');
    document.querySelectorAll('.ph.sky').forEach(stars);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-run]'); if (b) run(b.dataset.run);
      const th = e.target.closest('[data-theme-set]'); if (th) { document.body.dataset.theme = th.dataset.themeSet; document.querySelectorAll('[data-theme-set]').forEach((x) => x.classList.toggle('on', x === th)); }
    });
    // зачем: показ стартует, когда телефон попал в окно — владелец видит анимацию с начала
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); run(en.target.dataset.ph); } }), { threshold: .35 });
    document.querySelectorAll('.ph.sky').forEach((p) => io.observe(p));
    K.init(); window.__elevate = { run, all };
  }
  return { I, log, $, $$, sky, was, timers, fmt, count, bump, again, coins, top, segs, tiles, showTiles, mark, hearts, P, result, wasResult, swipe, quiz, nav, mount, SK, LVMAX, need, axis, skAxes, starSvg, starLabels, starTween };
})();
