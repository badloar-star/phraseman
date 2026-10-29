/* scene-real.js — телефоны «Главная на реальном кадре»: «сейчас» = кадр Сверки как есть (каркас real-frame.js), «А/Б/В/Г» = тот же кадр,
   у которого по пикселям перекрашен только фон сцены (scene-recolor.js) — герой, надписи, стекло плашек, тени, карточка и таббар остаются
   снятыми. Зажатие перекрашенного телефона показывает «сейчас» на том же месте.
   зачем (координатор 28.10 вечер, слово владельца «только настоящие экраны»: «Главная на реальном кадре × 4 стратегии × снятые темы»):
   пиксели считаются в браузере из кадра; если канва «испорчена» (кадр с чужого origin без CORS) — запасной путь: слой цвета поверх кадра
   (mix-blend-mode: color) с пометкой «приближённо», чтобы страница не осталась пустой. Журнал — префикс [SP-REAL]. */
window.SceneReal = (() => {
  const LOG = '[SP-REAL]'; const W = 1080; const H = 2400;
  const RF = window.RF; const SR = window.SceneRecolor;
  const state = { done: false, rows: 0, built: 0, mode: {} };
  const loadImg = (src, cors) => new Promise((res, rej) => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('не загрузилась ' + src)); im.src = src; });
  const loadAny = async (src) => { try { return await loadImg(src, true); } catch (e) { console.log(LOG, 'повтор без crossorigin:', e.message); return loadImg(src, false); } };
  const canvasOf = (im, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h); return { c, g }; };
  const rgba = (c, a) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;
  /* запасной путь: слой цвета в CSS из тех же чисел палитры (как в скрытых разделах страницы) */
  const cssBg = (s) => (s.image || !s.lights ? 'transparent' : s.lights.map((l) => `radial-gradient(${(l.rx * 100 * (l.fade || 1)).toFixed(1)}% ${(l.ry * 100 * (l.fade || 1)).toFixed(1)}% at ${l.cx * 100}% ${l.cy * 100}%, ${rgba(l.color, l.a)}, transparent 100%)`).concat(`linear-gradient(165deg, ${rgba(s.top, 1)} 0%, ${rgba(s.bot, 1)} 100%)`).join(', '));
  const setPhoneSrc = (ph, url) => ph.querySelectorAll('.rf-status, .rf-slice, .rf-tab').forEach((el) => { el.style.backgroundImage = `url("${url}")`; });
  const willPhones = (row) => [...row.querySelectorAll('.ph[data-ph="sp-rf-will"]')];
  /* состояние сборки — в подписи колонки (.sp-rf-state), не в рамке телефона (координатор 29.10); старые разделы без подписи — бейдж на телефоне */
  const stateEl = (ph) => { const c = ph.closest('.col'); return (c && c.querySelector('.sp-rf-state')) || ph.querySelector('.sp-rf-badge'); };
  const heroAlpha = async (job) => {
    const h = job.hero; if (!h) return null;
    const src = h.dir === 'v2art' ? `assets/v2art/${job.ap}/${h.art}.webp` : `assets/v2art/hero512/${job.ap}/${h.art || 'home_scene_continue'}.webp`;
    let im; try { im = await loadAny(src); } catch (e) { console.log(LOG, 'герой не загрузился, под ним — классификатор:', e.message); return null; }
    try {
      const { g } = canvasOf(im, h.size, h.size); const d = g.getImageData(0, 0, h.size, h.size).data; const a = new Float32Array(h.size * h.size); const op = h.opacity == null ? 0.96 : h.opacity;
      for (let i = 0; i < a.length; i += 1) a[i] = (d[i * 4 + 3] / 255) * op;
      return { alpha: a, x: h.x, y: h.y, w: h.size, h: h.size };
    } catch (e) { console.log(LOG, 'альфа героя недоступна (' + e.name + '), под ним — классификатор'); return null; }
  };
  /* светлые Диалоги на тёмной сцене (job.ink + job.cta): кнопки кадра — плашка «Начать» цвета cta (сплошное пятно 80…600 px в нижней
     половине сцены, шире высоты) и круг микрофона справа от неё (пиксели, не совпавшие с моделью фона, в полосе высоты плашки);
     перекраска рисует их как в тёмном оформлении (scene-recolor.js, swap). Нет плашки — список пуст, кнопки идут обычной классификацией */
  const findBlobs = (scene, W, y0, y1, color, tol) => {
    const d = scene.data; const step = 4; const gw = Math.ceil(W / step); const gh = Math.ceil((y1 - y0) / step); const m = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy += 1) for (let gx = 0; gx < gw; gx += 1) { const i = ((y0 + gy * step) * W + gx * step) * 4; if (Math.abs(d[i] - color[0]) <= tol && Math.abs(d[i + 1] - color[1]) <= tol && Math.abs(d[i + 2] - color[2]) <= tol) m[gy * gw + gx] = 1; }
    const seen = new Uint8Array(gw * gh); const out = [];
    for (let s = 0; s < m.length; s += 1) {
      if (!m[s] || seen[s]) continue; const st = [s]; seen[s] = 1; let x0 = gw; let x1 = 0; let yy0 = gh; let yy1 = 0; let n = 0;
      while (st.length) { const k = st.pop(); const kx = k % gw; const ky = (k - kx) / gw; n += 1; if (kx < x0) x0 = kx; if (kx > x1) x1 = kx; if (ky < yy0) yy0 = ky; if (ky > yy1) yy1 = ky; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = kx + dx; const ny = ky + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const q = ny * gw + nx; if (m[q] && !seen[q]) { seen[q] = 1; st.push(q); } } }
      const w = (x1 - x0 + 1) * step; const h = (yy1 - yy0 + 1) * step; if (w < 80 || h < 80 || w > 600 || h > 300 || n * step * step < w * h * 0.6) continue;
      out.push({ x0: x0 * step, y0: y0 + yy0 * step, x1: (x1 + 1) * step, y1: y0 + (yy1 + 1) * step });
    }
    return out;
  };
  const buttonsOf = (scene, W, sceneH, job) => {
    const paintOld = SR.painter(job.old, W, sceneH);
    const pills = findBlobs(scene, W, Math.round(sceneH * 0.4), sceneH, job.cta, 12).filter((r) => r.x1 - r.x0 > r.y1 - r.y0);
    if (!pills.length) { console.log(LOG, 'плашка cta не найдена на', job.file); return []; }
    const p = pills.sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0))[0]; const h = p.y1 - p.y0; const out = [Object.assign({ fill: job.cta, mode: 'cta' }, p)];
    const d = scene.data; let x0 = W; let x1 = 0; let y0 = sceneH; let y1 = 0;
    for (let y = p.y0; y < p.y1; y += 2) for (let x = p.x1 + 8; x < Math.min(W, p.x1 + h + 120); x += 2) { const i = (y * W + x) * 4; const oc = paintOld(x, y); if (Math.max(Math.abs(d[i] - oc[0]), Math.abs(d[i + 1] - oc[1]), Math.abs(d[i + 2] - oc[2])) > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 > x0 && x1 - x0 > h * 0.7 && y1 - y0 > h * 0.7) { const i = (Math.round((y0 + y1) / 2) * W + Math.round(x0 + (x1 - x0) * 0.25)) * 4; out.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, fill: [d[i], d[i + 1], d[i + 2]], mode: 'control' }); }
    console.log(LOG, 'кнопки кадра', job.file, JSON.stringify(out.map((r) => [r.mode, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0]))); // guard-ok: одна строка на кадр
    return out;
  };
  const fallback = (row, job, why) => {
    willPhones(row).forEach((ph) => {
      const s = job.strats.find((x) => x.key === ph.dataset.strat); const body = ph.querySelector('.rf-body');
      if (s && body) body.insertAdjacentHTML('beforeend', `<div class="sp-rf-tint" style="top:${-RF.px(job.status)}px;height:${RF.px(job.sceneH)}px;background:${cssBg(s.spec)}"></div>`);
      const b = stateEl(ph); if (b) { b.textContent = 'приближённо (слой цвета)'; b.classList.add('warn'); }
    });
    state.mode[job.file] = 'tint';
    console.log(LOG, 'запасной путь (слой цвета):', job.file, why);
  };
  const build = async (row, job) => {
    const t0 = performance.now(); const phones = willPhones(row);
    let frame; try { frame = await loadAny(job.src); } catch (e) { return fallback(row, job, e.message); }
    const { c, g } = canvasOf(frame, W, H);
    // область работы: сцена (перекраска фона) или полоса карточек под сценой (job.cards — новые стили карточек, scene-cards.js)
    const ry0 = job.cards ? job.cards.y0 : 0; const ry1 = job.cards ? job.cards.y1 : job.sceneH;
    let scene; try { scene = g.getImageData(0, ry0, W, ry1 - ry0); } catch (e) { return fallback(row, job, 'пиксели недоступны: ' + e.name); }
    const hero = job.cards ? null : await heroAlpha(job); const swap = !job.cards && job.ink && job.cta ? buttonsOf(scene, W, job.sceneH, job) : null;
    const bgRow = job.cards ? ((y) => { const i = ((y - ry0) * W + 8) * 4; return [scene.data[i], scene.data[i + 1], scene.data[i + 2]]; }) : null;
    for (const s of job.strats) {
      const ph = phones.find((p) => p.dataset.strat === s.key); if (!ph) continue;
      const data = new Uint8ClampedArray(scene.data);
      const st = job.cards ? window.SceneCards.restyle({ data, W, y0: ry0, cards: job.cards.rects, fill: job.cards.fill, bgRow, accent: job.cards.accent, dark: job.ap === 'dark', v: s.spec.v }) : SR.recolor({ data, W, H: job.sceneH, sceneH: job.sceneH, oldSpec: job.old, newSpec: s.spec, radius: job.radius, hero, ink: job.ink || null, swap });
      // страж: если кадр не совпал с моделью сцены (много «цветных» пикселей вне героя — другое состояние или тема), говорим об этом на телефоне
      const total = job.cards ? 1 : st.bg + st.white + st.dark + st.keep + st.hero; const keepShare = job.cards ? 0 : (total ? st.keep / total : 0);
      const keepMax = job.keepMax || 0.12;
      if (keepShare > keepMax) { row.classList.add('sp-real-unfit'); console.log(LOG, 'кадр не совпал с моделью:', job.file, 'не распознано', (keepShare * 100).toFixed(1) + '%'); }
      g.putImageData(new ImageData(data, W, ry1 - ry0), 0, ry0);
      const url = await new Promise((res, rej) => c.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob пуст'))), 'image/png'));
      ph.dataset.now = job.src; ph.dataset.will = url; setPhoneSrc(ph, url);
      const b = stateEl(ph); if (b) { if (keepShare > keepMax) { b.textContent = 'кадр не совпал с моделью сцены'; b.classList.add('warn'); } else b.remove(); } ph.classList.add('sp-rf-ready');
      console.log(LOG, 'стратегия', s.key, job.file, 'классы', JSON.stringify(st)); // guard-ok: одна строка на стратегию
      await new Promise((r) => setTimeout(r, 0)); // отдать кадр странице между стратегиями
    }
    state.mode[job.file] = 'pixels';
    console.log(LOG, 'готово', job.file, 'герой', hero ? 'по альфе' : 'классификатор', Math.round(performance.now() - t0), 'мс');
  };
  const buildAll = async (root, jobs) => {
    const gen = (state.gen = (state.gen || 0) + 1); // зачем: смена темы во время сборки — старая сборка на оторванных строках прекращается и не объявляет «готово» за новую
    state.done = false; const rows = [...root.querySelectorAll('.sp-real-row')]; state.rows = rows.length; state.built = 0; state.mode = {};
    for (const row of rows) {
      if (gen !== state.gen) { console.log(LOG, 'сборка', gen, 'прервана: началась новая', state.gen); return; }
      const job = jobs[row.dataset.frame];
      if (!job) { console.log(LOG, 'нет задания для строки', row.dataset.frame); continue; }
      try { await build(row, job); } catch (e) { console.log(LOG, 'ошибка сборки', row.dataset.frame, e && e.message); fallback(row, job, 'ошибка: ' + (e && e.message)); }
      state.built += 1;
    }
    if (gen !== state.gen) return;
    state.done = true;
    console.log(LOG, 'строк готово', state.built, 'из', state.rows, JSON.stringify(state.mode)); // guard-ok: одна строка на сборку
  };
  // зажать перекрашенный телефон — на его месте «сейчас» (сравнение без перевода взгляда); отпустить или увести палец — обратно
  document.addEventListener('pointerdown', (e) => { const ph = e.target.closest('.ph.sp-rf-ready'); if (!ph) return; ph.classList.add('sp-rf-hold'); setPhoneSrc(ph, ph.dataset.now); });
  const release = () => document.querySelectorAll('.ph.sp-rf-hold').forEach((ph) => { ph.classList.remove('sp-rf-hold'); setPhoneSrc(ph, ph.dataset.will); });
  document.addEventListener('pointerup', release); document.addEventListener('pointercancel', release);
  return { buildAll, state };
})();
