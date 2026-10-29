/* scene-approved.js — УТВЕРЖДЁННАЯ владельцем 29.10 спецификация «Сцены» для переноса в код 1:1 (сессия Темы).
   Вердикт дословно: «Тёмная тема везде должна стать глубокое небо!!! а светлая — тон темы ярче и глубже! Это всех экранов касается».
   Вход — токены темы уровня «Максимум» (liquidGlassTokens(id, { level: 'max', appearance }): accent, opaqueCard, …), оформление, экран,
   размер области сцены в px. Выход — все цвета (rgb + hex), слои с позициями и радиусами в долях ширины/высоты сцены, альфы, звёзды
   (сид и список), солнце, дымка, виньетка, страж контраста. Чистая математика без DOM; в браузере — window.SceneApproved, в node —
   module.exports. Те же числа, что рисует макет scene-palettes.html (dark-themes.app.js → scene-styles.js «sky» и scenePal «A»);
   равенство проверяется в браузере (dark-themes.app.js, журнал [DT-APPROVED]). Экраны со сценой: Главная, Диалоги, Пик, Сезон.
   Стили сцен (суми-э, маркер…), вечер и карточки владелец не выбирал — их здесь нет. */
(function (root, factory) { const m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.SceneApproved = m; })(typeof self !== 'undefined' ? self : this, function () {
  const VERSION = '2026-10-29';
  const DP = 2.625; // px на dp кадра 1080 × 2400 (эмулятор Сверки); в приложении — PixelRatio
  /* ── цвет: sRGB ↔ OKLCH (Björn Ottosson); выход из охвата — уменьшаем насыщенность шагом .004 при тех же оттенке и светлоте (как oklchToHex приложения) ── */
  const norm = (h) => ((h % 360) + 360) % 360;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hx = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
  const hex = (c) => `#${c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  const toLin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const toSrgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const oklchOf = (c) => { const [r, g, b] = c.map(toLin); const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b); const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b); const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b); const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s; const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s; return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360]; };
  const okLin = (L, C, H) => { const a = C * Math.cos(H * Math.PI / 180); const b = C * Math.sin(H * Math.PI / 180); const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3; const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3; const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]; };
  const inGamut = (c) => c.every((v) => v >= -0.0005 && v <= 1.0005);
  const okRgb = (L, C, H) => { let c = C; let lin = okLin(L, c, H); for (let i = 0; i < 60 && !inGamut(lin); i += 1) { c = Math.max(0, c - 0.004); lin = okLin(L, c, H); } return lin.map((v) => clamp(toSrgb(clamp(v, 0, 1)), 0, 255)); };
  const lumc = (c) => { const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
  const ratioc = (a, b) => { const x = lumc(a); const y = lumc(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const whiteOn = (c) => 1.05 / (lumc(c) + 0.05);
  const col = (c) => ({ rgb: c.map((v) => Math.round(v)), hex: hex(c) });
  /* детерминированный шум xorshift32 — одни и те же звёзды при каждой отрисовке и на каждой платформе */
  const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

  /* ═════ 1. Палитра «А — тон темы ярче и глубже» из токенов темы (та же, что scenePal(id, ap, 'A') макета) ═════
     Оттенок H и насыщенность C — OKLCH акцента темы. Ct = clamp(C × 1,6; .07 … .17), Cb = Ct × .7. Верх: L .50 (светлое .52), опускаем
     шагом .01, пока белый на верхе < 4,6 (не ниже .20). Низ: L .30 (светлое .28) оттенком H − 8°; в тёмном поднимаем шагом .01, пока
     контраст с карточкой (opaqueCard) < 1,34 (не выше .50). Света: lightC = ok(.80, max(.06, Ct × .9), H), light2C = ok(.62, …, H + 18°). */
  function paletteA(t, appearance) {
    const dark = appearance === 'dark'; const [, C, H] = oklchOf(hx(t.accent));
    const Ct = clamp(C * 1.6, 0.07, 0.17); const Cb = Ct * 0.7; const Lt0 = dark ? 0.50 : 0.52;
    let Lt = Lt0; let top = okRgb(Lt, Ct, H); for (let L = Lt; whiteOn(top) < 4.6 && L > 0.2; L -= 0.01) { top = okRgb(L, Ct, H); Lt = L; }
    const Lb0 = dark ? 0.30 : 0.28; let Lb = Lb0; let bot = okRgb(Lb, Cb, norm(H - 8)); const card = hx(t.opaqueCard);
    if (dark) for (let L = Lb; ratioc(bot, card) < 1.34 && L < 0.5; L += 0.01) { bot = okRgb(L, Cb, norm(H - 8)); Lb = L; }
    const Cl = Math.max(0.06, Ct * 0.9); const lightC = okRgb(0.80, Cl, H); const light2C = okRgb(0.62, Cl, norm(H + 18));
    return { H, C, S: Math.round(H), Ct, Cb, Cl, Lt: +Lt.toFixed(2), Lb: +Lb.toFixed(2), top, bot, lightC, light2C, Lh: Math.round(H), Lh2: Math.round(norm(H + 18)), a1: 0.85, a2: 0.55, whiteTop: whiteOn(top), seam: ratioc(bot, card) };
  }

  /* ═════ 2. Сэмплер формульной сцены (ровно painter из scene-recolor.js) — нужен стражу контраста светлого режима ═════
     spec: { top, bot (rgb), start, end (доли W/H), lights: [{ cx, cy, rx, ry (доли), color, a, fade }], scrim: { a, h (px) } | null } */
  function painter(spec, W, H) {
    const top = spec.top; const bot = spec.bot; const s = spec.start || [0.22, 0]; const e = spec.end || [0.78, 1];
    const sx = s[0] * W; const sy = s[1] * H; const vx = (e[0] - s[0]) * W; const vy = (e[1] - s[1]) * H; const vv = vx * vx + vy * vy;
    const lights = (spec.lights || []).map((l) => ({ cx: l.cx * W, cy: l.cy * H, rx: l.rx * W, ry: l.ry * H, c: l.color, a: l.a, fade: l.fade || 1 }));
    const scrim = spec.scrim && spec.scrim.a > 0 ? spec.scrim : null;
    return function paint(x, y) {
      let t = ((x - sx) * vx + (y - sy) * vy) / vv; t = t < 0 ? 0 : t > 1 ? 1 : t;
      let r = top[0] + (bot[0] - top[0]) * t; let g = top[1] + (bot[1] - top[1]) * t; let b = top[2] + (bot[2] - top[2]) * t;
      for (let i = 0; i < lights.length; i += 1) { const l = lights[i]; const dx = (x - l.cx) / l.rx; const dy = (y - l.cy) / l.ry; const d = Math.sqrt(dx * dx + dy * dy) / l.fade; if (d < 1) { const a = l.a * (1 - d); r += (l.c[0] - r) * a; g += (l.c[1] - g) * a; b += (l.c[2] - b) * a; } }
      if (scrim && y > H - scrim.h) { const k = 1 - scrim.a * (y - (H - scrim.h)) / scrim.h; r *= k; g *= k; b *= k; }
      return [r, g, b];
    };
  }
  /* страж контраста формульной сцены (ensureContrast макета): белый ≥ 4,6 в зоне текста (x .06….94 × y .52….92) — затемнение низа
     (scrim) растёт шагом .05 (высота становится .52 H), не выше .80, ≤ 16 шагов; под значками статус-бара (y .01/.04/.07 × x .04/.12/.84/.95)
     белый ≥ 2,8 — иначе верхние света (cy ≤ .1) слабеют на .08 (не ниже .25) и верх темнеет на 5 % к чёрному, ≤ 12 шагов. */
  function ensureContrast(spec, W, H) {
    const s = Object.assign({}, spec, { lights: spec.lights.map((l) => Object.assign({}, l)), scrim: spec.scrim ? Object.assign({}, spec.scrim) : null });
    const minAt = (ys, xs) => { const paint = painter(s, W, H); let mn = 99; for (const fy of ys) for (const fx of xs) { const v = whiteOn(paint(Math.round(fx * W), Math.round(fy * H))); if (v < mn) mn = v; } return mn; };
    const TX = [0.06, 0.2, 0.35, 0.5, 0.65, 0.8, 0.94]; const TY = [0.52, 0.6, 0.68, 0.76, 0.84, 0.92];
    let a = s.scrim ? s.scrim.a : 0; let steps = 0;
    while (minAt(TY, TX) < 4.6 && a < 0.8 && steps < 16) { a += 0.05; s.scrim = { a: +a.toFixed(2), h: Math.round(H * 0.52) }; steps += 1; }
    let topSteps = 0;
    while (minAt([0.01, 0.04, 0.07], [0.04, 0.12, 0.84, 0.95]) < 2.8 && topSteps < 12) { s.lights.forEach((l) => { if (l.cy <= 0.1) l.a = Math.max(0.25, l.a - 0.08); }); s.top = s.top.map((v) => v * 0.95); topSteps += 1; }
    s.guardSteps = { scrim: steps, top: topSteps };
    return s;
  }
  /* затемнение низа «как сейчас» у каждого экрана в светлом оформлении (вход стража): Главная/Пик — чёрный до .40 на 300 dp (HomeSceneStage);
     Диалоги — .34 на 60 % сцены (DialogsSceneBackdrop, тон bgBottom 62 % от 45 %); Сезон — .36 на 320 dp (обложка seasonThemedArt) */
  const OLD_SCRIM = { home: () => ({ a: 0.40, h: 300 * DP }), peak: () => ({ a: 0.40, h: 300 * DP }), dialogs: (H) => ({ a: 0.34, h: H * 0.6 }), season: () => ({ a: 0.36, h: 320 * DP }) };
  const oldScrim = (screen, H, opts) => (opts && opts.premium && screen !== 'dialogs' && screen !== 'season' ? null : (OLD_SCRIM[screen] || OLD_SCRIM.home)(H)); // 6 премиум-тем: Главная/Пик сейчас без затемнения низа (premiumSceneTop)

  /* ═════ 3. Светлое оформление — «А — тон темы ярче и глубже» (ровно stratSpec(id, 'light', 'A') макета) ═════
     Слои: линейный градиент top → bot от (.22, 0) к (.78, 1) (как expo-linear-gradient Главной); свет 1 — эллипс в (18 %, 0 %) радиусами
     70 % W / 50 % H цветом lightC, альфа .85 линейно к 0 на 70 % радиуса (fade .7); свет 2 — эллипс в (86 %, 102 %) радиусами 80 % / 42 %
     цветом light2C, альфа .55 → 0 на 70 % радиуса; затемнение низа экрана «как сейчас» (OLD_SCRIM), затем страж ensureContrast. */
  function lightA(t, screen, W, H, opts) {
    const p = paletteA(t, 'light'); const old = oldScrim(screen, H, opts);
    const raw = { top: p.top, bot: p.bot, start: [0.22, 0], end: [0.78, 1], lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: p.lightC, a: p.a1, fade: 0.7 }, { cx: 0.86, cy: 1.02, rx: 0.8, ry: 0.42, color: p.light2C, a: p.a2, fade: 0.7 }], scrim: old };
    const ev = opts && opts.evening ? warmEdge(t, opts.warm) : null; if (ev) raw.lights.push({ cx: ev.cx, cy: ev.cy, rx: ev.rx, ry: ev.ry, color: ev.color, a: ev.a, fade: ev.fade }); // вечер: тот же тёплый край третьим светом, страж считает его
    const s = ensureContrast(raw, W, H);
    return { version: VERSION, mode: ev ? 'light-A-evening' : 'light-A', name: ev ? 'А + тёплый край' : 'А — тон темы ярче и глубже', screen, size: { W, H }, palette: p, spec: s, warmEdge: ev,
      gradient: { start: [0.22, 0], end: [0.78, 1], top: col(s.top), bottom: col(s.bot) },
      lights: s.lights.map((l) => ({ cx: l.cx, cy: l.cy, rx: l.rx, ry: l.ry, color: col(l.color), a: +l.a.toFixed(2), fade: l.fade })),
      scrim: s.scrim ? { color: '#000000', a: s.scrim.a, h: Math.round(s.scrim.h), note: 'чёрный от 0 на высоте h от низа сцены до a у низа' } : null,
      guard: s.guardSteps, order: ['gradient', 'light1', 'light2', 'scrim'] };
  }

  /* ═════ 4. Тёмное оформление — «Глубокое небо» (ровно STYLES.sky.draw + guard из scene-styles.js, палитра paletteOf макета) ═════
     Все цвета — от оттенка S = round(H) акцента и его сырой насыщенности C (не Ct!). Слои по порядку:
     1) вертикальный градиент: 0 зенит ok(.40, min(.17, C+.03), S) · .42 середина ok(.47, min(.15, C+.01), S+4) · .66 и .74 горизонт
        ok(.60, min(.13, C+.02), S+12) · .80 земля ok(.27, min(.10, C), S−8) · 1 низ ok(.22, min(.08, C), S−10);
     2) солнце: эллиптический свет в (18 %, 2 %) радиусами 62 % W / 46 % H цветом lightC (как в А), альфа .72 линейно к 0 на краю;
     3) дымка горизонта: полоса от .62 H до .76 H цветом ok(.80, .08, round(H)), альфа 0 → .34 (середина) → 0;
     4) звёзды: 70 штук, сид 3, белые; на каждую по порядку x = r()·W, y = r()·H·.4, радиус .8 + r()·1,8 px, альфа .18 + r()·.5;
     5) виньетка: радиальный чёрный от 45 % радиуса (0) до края (.22), эллипс 78 % W × 78 % H от центра;
     6) страж по нарисованным пикселям (guardSky). */
  /* ═════ 4а. Вечер (Главная после 20:00) — «Небо + тёплый край» (слово владельца 29.10 ~08:05 через координатора: небо остаётся, справа
     внизу лёгкий тёплый отсвет как намёк на угрозу серии, БЕЗ красного и без углей; тёплый цвет — от оттенка темы, не отдельный красный).
     Оттенок отсвета — opts.warm: 'warmer' (по умолчанию) — оттенок темы H, сдвинутый на ≤ 35° к янтарю (60°) по короткой дуге;
     'theme' — сам оттенок темы, светлее; 'band' — тёплая полоса 40…80°, точка в ней — от оттенка темы (40 + (H mod 60) / 60 × 40).
     Слой: эллиптический свет в (92 % W, 102 % H) радиусами 55 % W × 42 % H, альфа .5 → 0 на 85 % радиуса; кладётся после дымки, перед звёздами. */
  const WARM = { theme: (H) => H, warmer: (H) => { const d = ((60 - H + 540) % 360) - 180; return norm(H + Math.sign(d) * Math.min(35, Math.abs(d))); }, band: (H) => 40 + ((H % 60) / 60) * 40 };
  function warmEdge(t, mode) { const [, , H] = oklchOf(hx(t.accent)); const m = WARM[mode] ? mode : 'band'; /* по умолчанию «тёплый янтарь» (владелец 29.10 ~10:40: другие трактовки не показывать) */ const hue = WARM[m](H); const L = m === 'band' ? 0.78 : m === 'theme' ? 0.72 : 0.74; const C = m === 'band' ? 0.14 : m === 'theme' ? 0.12 : 0.13; const color = okRgb(L, C, hue); return { mode: m, hue: Math.round(hue * 10) / 10, cx: 0.92, cy: 1.02, rx: 0.55, ry: 0.42, color, hex: hex(color), a: 0.5, fade: 0.85, oklch: [L, C, Math.round(hue)] }; }
  function darkSky(t, screen, W, H, opts) {
    const p = paletteA(t, 'dark'); const S = p.S; const C = p.C;
    const zenC = Math.min(0.17, C + 0.03); const midC = Math.min(0.15, C + 0.01); const horC = Math.min(0.13, C + 0.02); const gndC = Math.min(0.10, C); const botC = Math.min(0.08, C);
    const zen = okRgb(0.40, zenC, S); const mid = okRgb(0.47, midC, norm(S + 4)); const hor = okRgb(0.60, horC, norm(S + 12)); const gnd = okRgb(0.27, gndC, norm(S - 8)); const bottom = okRgb(0.22, botC, norm(S - 10)); const haze = okRgb(0.80, 0.08, p.Lh);
    const r = rng(3); const stars = []; for (let i = 0; i < 70; i += 1) { const x = r(); const y = r() * 0.4; const rad = 0.8 + r() * 1.8; const a = 0.18 + r() * 0.5; stars.push({ x, y, r: rad, a }); }
    const ev = opts && opts.evening ? warmEdge(t, opts.warm) : null;
    return { version: VERSION, mode: ev ? 'dark-sky-evening' : 'dark-sky', name: ev ? 'Глубокое небо + тёплый край' : 'Глубокое небо', screen, size: { W, H }, palette: p, warmEdge: ev,
      gradient: { direction: 'vertical', stops: [{ at: 0, color: col(zen), oklch: [0.40, zenC, S] }, { at: 0.42, color: col(mid), oklch: [0.47, midC, norm(S + 4)] }, { at: 0.66, color: col(hor), oklch: [0.60, horC, norm(S + 12)] }, { at: 0.74, color: col(hor) }, { at: 0.80, color: col(gnd), oklch: [0.27, gndC, norm(S - 8)] }, { at: 1, color: col(bottom), oklch: [0.22, botC, norm(S - 10)] }] },
      sun: { cx: 0.18, cy: 0.02, rx: 0.62, ry: 0.46, color: col(p.lightC), a: 0.72, fade: 1 },
      haze: { y0: 0.62, y1: 0.76, color: col(haze), a: [0, 0.34, 0] },
      stars: { seed: 3, count: 70, yMax: 0.4, color: '#FFFFFF', list: stars },
      vignette: { scale: 0.78, inner: 0.45, a: 0.22 },
      guard: { textZone: [0.5, 0.96], minWhite: 4.6, statusRows: [4, 80], minStatus: 3.5 },
      raw: { zen, mid, hor, gnd, bottom, haze, lightC: p.lightC },
      order: ev ? ['gradient', 'sun', 'haze', 'warmEdge', 'stars', 'vignette', 'guard'] : ['gradient', 'sun', 'haze', 'stars', 'vignette', 'guard'] };
  }
  /* отрисовка «Глубокого неба» на 2D-канве (та же, что scene-styles.js) — для сверки с макетом и как образец для порта */
  const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;
  function drawSky(g, d, W, H) {
    const st = d.gradient.stops; const gr = g.createLinearGradient(0, 0, 0, H); const raw = d.raw; const rawOf = [raw.zen, raw.mid, raw.hor, raw.hor, raw.gnd, raw.bottom];
    st.forEach((s, i) => gr.addColorStop(s.at, rgba(rawOf[i]))); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const l = d.sun; g.save(); g.translate(l.cx * W, l.cy * H); g.scale(l.rx * W, l.ry * H); const lg = g.createRadialGradient(0, 0, 0, 0, 0, 1); lg.addColorStop(0, rgba(raw.lightC, l.a)); lg.addColorStop(1, rgba(raw.lightC, 0)); g.fillStyle = lg; g.fillRect(-1, -1, 2, 2); g.restore();
    const h = d.haze; const bg = g.createLinearGradient(0, H * h.y0, 0, H * h.y1); bg.addColorStop(0, rgba(raw.haze, 0)); bg.addColorStop(0.5, rgba(raw.haze, h.a[1])); bg.addColorStop(1, rgba(raw.haze, 0)); g.fillStyle = bg; g.fillRect(0, H * h.y0, W, H * (h.y1 - h.y0));
    if (d.warmEdge) { const e = d.warmEdge; g.save(); g.translate(e.cx * W, e.cy * H); g.scale(e.rx * W, e.ry * H); const eg = g.createRadialGradient(0, 0, 0, 0, 0, 1); eg.addColorStop(0, rgba(e.color, e.a)); eg.addColorStop(e.fade, rgba(e.color, 0)); eg.addColorStop(1, rgba(e.color, 0)); g.fillStyle = eg; g.fillRect(-1, -1, 2, 2); g.restore(); }
    d.stars.list.forEach((s) => { g.fillStyle = rgba([255, 255, 255], s.a); g.beginPath(); g.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); g.fill(); });
    const v = d.vignette; g.save(); g.translate(W / 2, H / 2); g.scale(W * v.scale, H * v.scale); const vg = g.createRadialGradient(0, 0, v.inner, 0, 0, 1); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${v.a})`); g.fillStyle = vg; g.fillRect(-2, -2, 4, 4); g.restore();
    return guardSky(g, W, H);
  }
  /* страж по пикселям (guard из scene-styles.js): средняя линейная яркость строки (x 40 … W−40 шагом 6); худшая строка в зоне текста
     (y .5 H … .96 H шагом 6) должна давать белому ≥ 4,6, верхние строки 4…80 px — ≥ 3,5; иначе низ темнеет градиентом чёрного от .42 H (0)
     до .62 H (a) и далее постоянно до низа, верх — от a на 0 до 0 на 110 px; a = 1 − (target/Y)^(1/2.2) + .04, не выше .70. */
  function guardSky(g, W, H) {
    const id = g.getImageData(0, 0, W, H); const d = id.data; const lumLin = (r, gg, b) => 0.2126 * toLin(r) + 0.7152 * toLin(gg) + 0.0722 * toLin(b);
    const rowY = (y) => { let s = 0; let n = 0; for (let x = 40; x < W - 40; x += 6) { const i = (y * W + x) * 4; s += lumLin(d[i], d[i + 1], d[i + 2]); n += 1; } return s / n; };
    let worst = 0; for (let y = Math.round(H * 0.5); y < H * 0.96; y += 6) worst = Math.max(worst, rowY(y));
    let top = 0; for (let y = 4; y < 80; y += 6) top = Math.max(top, rowY(y));
    const need = (Y, ratio) => { const target = 1.05 / ratio - 0.05; return Y > target ? 1 - Math.pow(target / Y, 1 / 2.2) : 0; };
    const aBottom = need(worst, 4.6); const aTop = need(top, 3.5);
    if (aBottom > 0) { const gr = g.createLinearGradient(0, H * 0.42, 0, H * 0.62); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${Math.min(0.7, aBottom + 0.04)})`); g.fillStyle = gr; g.fillRect(0, H * 0.42, W, H * 0.58); } // guard-ok: альфа затемнения сцены, не баланс
    if (aTop > 0) { const gr = g.createLinearGradient(0, 0, 0, 110); gr.addColorStop(0, `rgba(0,0,0,${Math.min(0.7, aTop + 0.04)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 110); } // guard-ok: альфа затемнения сцены, не баланс
    return { aBottom, aTop };
  }

  /* ═════ 4б. Герой сцены Главной (владелец 29.10 ~10:40: «иконки книжка и другие … должны быть большие и не под самый верх, а посредине справа») ═════
     Картинка героя (home_scene_continue / streak_risk …) — 144 dp (сейчас 84 dp), правый отступ 20 dp, по вертикали по центру области сцены;
     текст под героя не лезет: ширина блока текста (подпись, заголовок, строка под ним) ≤ 53 % ширины экрана, заголовок до двух строк (как у Диалогов); W − 2·20 dp − 144 dp − 24 dp зазора = 53 %. В px кадра 1080 × 2400:
     размер 378, x = 1080 − 378 − 52 = 650, y = (sceneH − 378) / 2 (сцена 1082 → 352). Непрозрачность героя — как сейчас (.96). */
  const HERO_HOME = { sizeDp: 144, rightDp: 20, vertical: 'center', opacity: 0.96, gapDp: 24, titleMaxWidth: 0.53, titleMaxLines: 2 };
  const heroHome = (W, H, dp) => { const d = dp || DP; const size = Math.round(HERO_HOME.sizeDp * d); return { size, x: W - size - Math.round(HERO_HOME.rightDp * d), y: Math.round((H - size) / 2), opacity: HERO_HOME.opacity }; };
  /* ═════ 5. Точка входа: спецификация утверждённого вида экрана ═════
     screen — 'home' | 'dialogs' | 'peak' | 'season'; W, H — px области сцены (на кадре 1080 × 2400: Главная/Диалоги 1082, Пик 1950, Сезон 1029);
     opts.evening — Главная после 20:00: к небу (и к светлой А) добавляется тёплый край справа внизу, opts.warm — трактовка оттенка (§4а);
     opts.premium — true для шести премиум-тем (их Главная/Пик сейчас без затемнения низа — вход стража другой).
     Область сцены у каждого экрана своя, формула одна. Надписи: в тёмном — белые как сейчас; в светлом сцена становится тёмной, поэтому
     надписи/стекло на ней — белые, как на Главной (у светлых Диалогов сейчас тёмный текст на светлой сцене — Темам перевести в белый). */
  function approved(tokens, appearance, screen, W, H, opts) { return appearance === 'dark' ? darkSky(tokens, screen, W, H, opts || {}) : lightA(tokens, screen, W, H, opts || {}); }
  return { VERSION, DP, paletteA, painter, ensureContrast, lightA, darkSky, drawSky, guardSky, approved, warmEdge, WARM, HERO_HOME, heroHome, OLD_SCRIM, color: { hx, hex, oklchOf, okRgb, whiteOn, ratioc, lumc, norm }, rng };
});
