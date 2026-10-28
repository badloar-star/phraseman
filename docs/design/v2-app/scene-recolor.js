/* scene-recolor.js — перекраска фона «Сцены» на РЕАЛЬНОМ кадре приложения: заменяется только градиент сцены, всё остальное
   (герой, текст, стекло плашек, тени, затемнение низа) остаётся как снято. Работает и в браузере (ImageData), и в node (raw RGBA).
   зачем (владелец 28.10: макеты только на настоящих экранах; «сейчас» — кадр без изменений, новая палитра — перекраска сцены НА кадре):
   модель текущего фона = ровно то, что рисует HomeSceneStage: expo-linear-gradient start(.22,0)→end(.78,1) из sceneTop→sceneBottom,
   свет sceneLight (эллипс в 18 %/0 %, rx 70 %, ry 50 %, альфа линейно до нуля), ореол героя (белый .22, круг 168 dp в x 57 %),
   затемнение низа 300 dp до .40 (только светлые темы). Для каждого пикселя сцены: разница кадра и модели говорит, что это —
   чистый фон (→ новый градиент), белая надпись/стекло (→ та же доля белого над новым градиентом), тень (→ то же затемнение нового),
   цветная деталь (→ без изменений), герой (→ по альфе его же картинки: фон под ним меняется, сам он нет). */
(function (root, factory) { const m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.SceneRecolor = m; })(typeof self !== 'undefined' ? self : this, function () {
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  /** spec: { top, bot (rgb), start, end (доли W/H; по умолчанию .22,0 → .78,1), lights: [{ cx, cy, rx, ry (доли), color, a, fade (доля радиуса, где альфа = 0; 1 = край) }],
   *  scrim: { a, h } (альфа черноты у низа, высота в px), halo: { cx, cy, r (px), a } | null }. Возвращает paint(x, y) → [r, g, b] (не округлено). */
  function painter(spec, W, H) {
    const top = spec.top; const bot = spec.bot; const s = spec.start || [0.22, 0]; const e = spec.end || [0.78, 1];
    const sx = s[0] * W; const sy = s[1] * H; const vx = (e[0] - s[0]) * W; const vy = (e[1] - s[1]) * H; const vv = vx * vx + vy * vy;
    const lights = (spec.lights || []).map((l) => ({ cx: l.cx * W, cy: l.cy * H, rx: l.rx * W, ry: l.ry * H, c: l.color, a: l.a, fade: l.fade || 1 }));
    const scrim = spec.scrim && spec.scrim.a > 0 ? spec.scrim : null; const halo = spec.halo || null;
    return function paint(x, y) {
      let t = ((x - sx) * vx + (y - sy) * vy) / vv; t = t < 0 ? 0 : t > 1 ? 1 : t;
      let r = top[0] + (bot[0] - top[0]) * t; let g = top[1] + (bot[1] - top[1]) * t; let b = top[2] + (bot[2] - top[2]) * t;
      for (let i = 0; i < lights.length; i += 1) {
        const l = lights[i]; const dx = (x - l.cx) / l.rx; const dy = (y - l.cy) / l.ry; const d = Math.sqrt(dx * dx + dy * dy) / l.fade;
        if (d < 1) { const a = l.a * (1 - d); r += (l.c[0] - r) * a; g += (l.c[1] - g) * a; b += (l.c[2] - b) * a; }
      }
      if (halo) { const d = Math.hypot(x - halo.cx, y - halo.cy) / halo.r; if (d < 1) { const a = halo.a * (1 - d); r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; } }
      if (scrim && y > H - scrim.h) { const k = 1 - scrim.a * (y - (H - scrim.h)) / scrim.h; r *= k; g *= k; b *= k; }
      return [r, g, b];
    };
  }
  /** Перекраска на месте. o = { data (RGBA), W, H (высота буфера), sceneH, oldSpec, newSpec, radius (скругление низа сцены, px),
   *  hero: { alpha: Float32Array (w*h, 0..1 с учётом opacity героя), x, y, w, h } | null, stats: {} (счётчики классов — для журнала) } */
  function recolor(o) {
    const data = o.data; const W = o.W; const sceneH = o.sceneH; const paintOld = painter(o.oldSpec, W, sceneH); const paintNew = painter(o.newSpec, W, sceneH);
    const R = o.radius || 0; const hero = o.hero || null; const st = o.stats || {}; st.bg = st.bg || 0; st.white = st.white || 0; st.dark = st.dark || 0; st.keep = st.keep || 0; st.hero = st.hero || 0; st.out = st.out || 0;
    for (let y = 0; y < sceneH; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (R > 0 && y > sceneH - R && (x < R || x >= W - R)) { // снаружи скруглённого угла сцены — фон страницы, не трогаем
          const cx = x < R ? R : W - R; const cy = sceneH - R; if (Math.hypot(x - cx, y - cy) > R) { st.out += 1; continue; }
        }
        const i = (y * W + x) * 4; const pr = data[i]; const pg = data[i + 1]; const pb = data[i + 2];
        const oc = paintOld(x, y); const nc = paintNew(x, y);
        if (hero && x >= hero.x && y >= hero.y && x < hero.x + hero.w && y < hero.y + hero.h) {
          const a = hero.alpha[(y - hero.y) * hero.w + (x - hero.x)];
          if (a > 0.004) { const k = 1 - a; data[i] = clamp(pr + (nc[0] - oc[0]) * k); data[i + 1] = clamp(pg + (nc[1] - oc[1]) * k); data[i + 2] = clamp(pb + (nc[2] - oc[2]) * k); st.hero += 1; continue; }
        }
        const dr = pr - oc[0]; const dg = pg - oc[1]; const db = pb - oc[2]; const md = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db));
        if (md <= 6) { data[i] = clamp(nc[0]); data[i + 1] = clamp(nc[1]); data[i + 2] = clamp(nc[2]); st.bg += 1; continue; }
        if (dr >= -3 && dg >= -3 && db >= -3) { // подъём к белому: надпись, стекло, ореол — та же доля белого над новым фоном
          const as = []; if (255 - oc[0] >= 10) as.push(dr / (255 - oc[0])); if (255 - oc[1] >= 10) as.push(dg / (255 - oc[1])); if (255 - oc[2] >= 10) as.push(db / (255 - oc[2]));
          if (as.length) {
            let mn = 1; let mx = 0; let sum = 0; for (const a of as) { if (a < mn) mn = a; if (a > mx) mx = a; sum += a; }
            if (mx - mn <= 0.10) { const a = Math.min(1, Math.max(0, sum / as.length)); data[i] = clamp(nc[0] * (1 - a) + 255 * a); data[i + 1] = clamp(nc[1] * (1 - a) + 255 * a); data[i + 2] = clamp(nc[2] * (1 - a) + 255 * a); st.white += 1; continue; }
          }
        }
        if (dr <= 3 && dg <= 3 && db <= 3) { // затемнение (тень карточки, тёмная подпись): та же доля яркости от нового фона
          const k = (lum(pr, pg, pb) + 1) / (lum(oc[0], oc[1], oc[2]) + 1); data[i] = clamp(nc[0] * k); data[i + 1] = clamp(nc[1] * k); data[i + 2] = clamp(nc[2] * k); st.dark += 1; continue;
        }
        st.keep += 1; // цветная деталь (значок, монета) — как снято
      }
    }
    return st;
  }
  return { painter, recolor };
});
