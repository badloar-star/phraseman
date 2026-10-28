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
  const cssBg = (s) => s.lights.map((l) => `radial-gradient(${(l.rx * 100 * (l.fade || 1)).toFixed(1)}% ${(l.ry * 100 * (l.fade || 1)).toFixed(1)}% at ${l.cx * 100}% ${l.cy * 100}%, ${rgba(l.color, l.a)}, transparent 100%)`).concat(`linear-gradient(165deg, ${rgba(s.top, 1)} 0%, ${rgba(s.bot, 1)} 100%)`).join(', ');
  const setPhoneSrc = (ph, url) => ph.querySelectorAll('.rf-status, .rf-slice, .rf-tab').forEach((el) => { el.style.backgroundImage = `url("${url}")`; });
  const willPhones = (row) => [...row.querySelectorAll('.ph[data-ph="sp-rf-will"]')];
  const heroAlpha = async (job) => {
    const h = job.hero; if (!h) return null;
    const src = `assets/v2art/hero512/${job.ap}/${h.art || 'home_scene_continue'}.webp`;
    let im; try { im = await loadAny(src); } catch (e) { console.log(LOG, 'герой не загрузился, под ним — классификатор:', e.message); return null; }
    try {
      const { g } = canvasOf(im, h.size, h.size); const d = g.getImageData(0, 0, h.size, h.size).data; const a = new Float32Array(h.size * h.size); const op = h.opacity == null ? 0.96 : h.opacity;
      for (let i = 0; i < a.length; i += 1) a[i] = (d[i * 4 + 3] / 255) * op;
      return { alpha: a, x: h.x, y: h.y, w: h.size, h: h.size };
    } catch (e) { console.log(LOG, 'альфа героя недоступна (' + e.name + '), под ним — классификатор'); return null; }
  };
  const fallback = (row, job, why) => {
    willPhones(row).forEach((ph) => {
      const s = job.strats.find((x) => x.key === ph.dataset.strat); const body = ph.querySelector('.rf-body');
      if (s && body) body.insertAdjacentHTML('beforeend', `<div class="sp-rf-tint" style="top:${-RF.px(job.status)}px;height:${RF.px(job.sceneH)}px;background:${cssBg(s.spec)}"></div>`);
      const b = ph.querySelector('.sp-rf-badge'); if (b) b.textContent = 'приближённо';
    });
    state.mode[job.file] = 'tint';
    console.log(LOG, 'запасной путь (слой цвета):', job.file, why);
  };
  const build = async (row, job) => {
    const t0 = performance.now(); const phones = willPhones(row);
    let frame; try { frame = await loadAny(job.src); } catch (e) { return fallback(row, job, e.message); }
    const { c, g } = canvasOf(frame, W, H);
    let scene; try { scene = g.getImageData(0, 0, W, job.sceneH); } catch (e) { return fallback(row, job, 'пиксели недоступны: ' + e.name); }
    const hero = await heroAlpha(job);
    for (const s of job.strats) {
      const ph = phones.find((p) => p.dataset.strat === s.key); if (!ph) continue;
      const data = new Uint8ClampedArray(scene.data);
      const st = SR.recolor({ data, W, H: job.sceneH, sceneH: job.sceneH, oldSpec: job.old, newSpec: s.spec, radius: job.radius, hero });
      // страж: если кадр не совпал с моделью сцены (много «цветных» пикселей вне героя — другое состояние или тема), говорим об этом на телефоне
      const total = st.bg + st.white + st.dark + st.keep + st.hero; const keepShare = total ? st.keep / total : 0;
      if (keepShare > 0.12) { row.classList.add('sp-real-unfit'); console.log(LOG, 'кадр не совпал с моделью:', job.file, 'не распознано', (keepShare * 100).toFixed(1) + '%'); }
      g.putImageData(new ImageData(data, W, job.sceneH), 0, 0);
      const url = await new Promise((res, rej) => c.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob пуст'))), 'image/png'));
      ph.dataset.now = job.src; ph.dataset.will = url; setPhoneSrc(ph, url);
      const b = ph.querySelector('.sp-rf-badge'); if (b) { if (keepShare > 0.12) b.textContent = 'кадр не совпал с моделью сцены'; else b.remove(); } ph.classList.add('sp-rf-ready');
      console.log(LOG, 'стратегия', s.key, job.file, 'классы', JSON.stringify(st)); // guard-ok: одна строка на стратегию
      await new Promise((r) => setTimeout(r, 0)); // отдать кадр странице между стратегиями
    }
    state.mode[job.file] = 'pixels';
    console.log(LOG, 'готово', job.file, 'герой', hero ? 'по альфе' : 'классификатор', Math.round(performance.now() - t0), 'мс');
  };
  const buildAll = async (root, jobs) => {
    state.done = false; const rows = [...root.querySelectorAll('.sp-real-row')]; state.rows = rows.length; state.built = 0; state.mode = {};
    for (const row of rows) {
      const job = jobs[row.dataset.frame];
      if (!job) { console.log(LOG, 'нет задания для строки', row.dataset.frame); continue; }
      try { await build(row, job); } catch (e) { console.log(LOG, 'ошибка сборки', row.dataset.frame, e && e.message); fallback(row, job, 'ошибка: ' + (e && e.message)); }
      state.built += 1;
    }
    state.done = true;
    console.log(LOG, 'строк готово', state.built, 'из', state.rows, JSON.stringify(state.mode)); // guard-ok: одна строка на сборку
  };
  // зажать перекрашенный телефон — на его месте «сейчас» (сравнение без перевода взгляда); отпустить или увести палец — обратно
  document.addEventListener('pointerdown', (e) => { const ph = e.target.closest('.ph.sp-rf-ready'); if (!ph) return; ph.classList.add('sp-rf-hold'); setPhoneSrc(ph, ph.dataset.now); });
  const release = () => document.querySelectorAll('.ph.sp-rf-hold').forEach((ph) => { ph.classList.remove('sp-rf-hold'); setPhoneSrc(ph, ph.dataset.will); });
  document.addEventListener('pointerup', release); document.addEventListener('pointercancel', release);
  return { buildAll, state };
})();
