/* scene-styles.js — процедурные фоны «Сцены» для макета «Тёмные темы 2.0»: новое освещение (те же цвета темы, другой свет) и разные
   художественные стили (суми-э, маркер, аврора, витраж, бумажный коллаж). Каждый стиль рисует фон сцены на канве W × H и отдаёт ImageData;
   scene-recolor.js кладёт его под настоящие надписи, героя и карточки реального кадра.
   зачем (владелец 28.10, дословно: «собери несколько разных стилей, даже разнообразных… вообще другие стили сцен, например японские, или
   рисованные маркерами»; «новое освещение: источники света, отсветы, глубина неба»): всё считается из цветов выбранной темы (оттенок,
   насыщенность, свет), поэтому один стиль переносится на все 27 тёмных тем. Страж: в зоне текста (низ сцены) белый ≥ 4,6:1, под значками
   статус-бара ≥ 3,5:1 — иначе стиль затемняется снизу/сверху. Без ctx.filter (его нет в старых Safari): мягкость — градиентами и shadowBlur. */
window.SceneStyles = (() => {
  const LOG = '[SP-STYLES]';
  /* ── цвет: OKLCH ↔ sRGB (те же формулы, что в scene-palettes.app.js) ── */
  const toLin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const toSrgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const okLin = (L, C, H) => { const a = C * Math.cos(H * Math.PI / 180); const b = C * Math.sin(H * Math.PI / 180); const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3; const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3; const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]; };
  const inGamut = (c) => c.every((v) => v >= -0.0005 && v <= 1.0005);
  const ok = (L, C, H) => { let c = C; let lin = okLin(L, c, H); for (let i = 0; i < 60 && !inGamut(lin); i += 1) { c = Math.max(0, c - 0.004); lin = okLin(L, c, H); } return lin.map((v) => Math.max(0, Math.min(255, toSrgb(Math.max(0, Math.min(1, v)))))); };
  const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;
  const norm = (h) => ((h % 360) + 360) % 360;
  const lumLin = (r, g, b) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  /* детерминированный шум (одна и та же картинка при каждой сборке — владелец сравнивает кадры) */
  const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

  /* ── общие кисти ── */
  const base = (g, W, H, top, bot, angle = 165) => { // линейный градиент под углом (как CSS 165deg)
    const rad = angle * Math.PI / 180; const len = Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad)); const cx = W / 2; const cy = H / 2;
    const dx = Math.sin(rad) * len / 2; const dy = -Math.cos(rad) * len / 2;
    const gr = g.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy); gr.addColorStop(0, rgba(top)); gr.addColorStop(1, rgba(bot)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  };
  const light = (g, W, H, cx, cy, rx, ry, color, a, fade = 1) => { // эллиптический свет, альфа линейно до 0 (как sceneLight)
    g.save(); g.translate(cx * W, cy * H); g.scale(rx * W, ry * H);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, rgba(color, a)); gr.addColorStop(Math.min(1, fade), rgba(color, 0)); if (fade < 1) gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
  };
  const band = (g, W, y0, y1, color, a0, a1, aMid = null) => { // горизонтальная полоса с мягкими краями
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, rgba(color, a0)); if (aMid !== null) gr.addColorStop(0.5, rgba(color, aMid)); gr.addColorStop(1, rgba(color, a1)); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0);
  };
  const vignette = (g, W, H, a) => { g.save(); g.translate(W / 2, H / 2); g.scale(W * 0.78, H * 0.78); const gr = g.createRadialGradient(0, 0, 0.45, 0, 0, 1); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(-2, -2, 4, 4); g.restore(); };
  const grain = (g, W, H, amount, seed = 7) => { // бумажное зерно: ±amount уровней, крупинки 2 px
    const id = g.getImageData(0, 0, W, H); const d = id.data; const r = rng(seed); const w2 = Math.ceil(W / 2);
    for (let y = 0; y < H; y += 2) { for (let x = 0; x < W; x += 2) { const n = (r() - 0.5) * 2 * amount; for (let yy = 0; yy < 2 && y + yy < H; yy += 1) for (let xx = 0; xx < 2 && x + xx < W; xx += 1) { const i = ((y + yy) * W + x + xx) * 4; d[i] += n; d[i + 1] += n; d[i + 2] += n; } } }
    void w2; g.putImageData(id, 0, 0);
  };
  const stars = (g, W, H, n, seed, color = [255, 255, 255], yMax = 0.5) => { const r = rng(seed); for (let i = 0; i < n; i += 1) { const x = r() * W; const y = r() * H * yMax; const s = 0.8 + r() * 1.8; g.fillStyle = rgba(color, 0.18 + r() * 0.5); g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); } };
  /* гряда холмов: плавная линия по синусам, залитая вниз */
  const ridge = (g, W, H, yBase, amp, freq, phase, fill, shadow) => {
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) { const t = x / W; const y = yBase + Math.sin(t * freq * Math.PI * 2 + phase) * amp + Math.sin(t * freq * 5.3 + phase * 1.7) * amp * 0.25; g.lineTo(x, y); }
    g.lineTo(W, H); g.closePath();
    if (shadow) { g.save(); g.shadowColor = shadow.color; g.shadowBlur = shadow.blur; g.shadowOffsetY = shadow.dy; g.fillStyle = fill; g.fill(); g.restore(); } else { g.fillStyle = fill; g.fill(); }
  };
  /* страж контраста: белый на зоне текста ≥ 4,6 (строки 50–96 % высоты), под статус-баром ≥ 3,5 (верхние 80 px) — иначе затемняем плавно */
  const guard = (g, W, H, tag) => {
    const id = g.getImageData(0, 0, W, H); const d = id.data;
    const rowY = (y) => { let s = 0; let n = 0; for (let x = 40; x < W - 40; x += 6) { const i = (y * W + x) * 4; s += lumLin(d[i], d[i + 1], d[i + 2]); n += 1; } return s / n; };
    let worst = 0; for (let y = Math.round(H * 0.5); y < H * 0.96; y += 6) worst = Math.max(worst, rowY(y));
    let top = 0; for (let y = 4; y < 80; y += 6) top = Math.max(top, rowY(y));
    const need = (Y, ratio) => { const target = 1.05 / ratio - 0.05; return Y > target ? 1 - Math.pow(target / Y, 1 / 2.2) : 0; };
    const aBottom = need(worst, 4.6); const aTop = need(top, 3.5);
    if (aBottom > 0) { const gr = g.createLinearGradient(0, H * 0.42, 0, H * 0.62); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${Math.min(0.7, aBottom + 0.04)})`); g.fillStyle = gr; g.fillRect(0, H * 0.42, W, H * 0.58); }
    if (aTop > 0) { const gr = g.createLinearGradient(0, 0, 0, 110); gr.addColorStop(0, `rgba(0,0,0,${Math.min(0.7, aTop + 0.04)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 110); }
    if (aBottom > 0 || aTop > 0) console.log(LOG, tag, 'страж затемнил: низ', aBottom.toFixed(2), 'верх', aTop.toFixed(2)); // guard-ok: одна строка на стиль
  };

  /* ═════ стили. Вход p: { S (оттенок сцены), C (насыщенность), top, bot, lightC, light2C, Lh (оттенок света), Lh2, lightA, light2A, scrim } ═════ */
  const STYLES = {
    /* ── освещение (цвета темы те же, другой свет) ── */
    dialogs: { name: 'Как в Диалогах', group: 'light', why: 'два света по верхним углам в цветах фона темы — то, что владельцу «прикольно» в Диалогах',
      draw(g, W, H, p) { base(g, W, H, p.dlgTop || p.top, p.dlgBot || p.bot, 174); light(g, W, H, 0.84, 0.14, 0.7, 0.46, p.glowR || p.lightC, p.glowRA || 0.7); light(g, W, H, 0.08, 0, 0.6, 0.42, p.glowL || p.light2C, p.glowLA || 0.55); } },
    sky: { name: 'Глубокое небо', group: 'light', why: 'зенит глубже, у горизонта светлая дымка, земля темнее; солнце слева, редкие звёзды в зените',
      draw(g, W, H, p) {
        const zen = ok(0.40, Math.min(0.17, p.C + 0.03), p.S); const mid = ok(0.47, Math.min(0.15, p.C + 0.01), norm(p.S + 4)); const hor = ok(0.60, Math.min(0.13, p.C + 0.02), norm(p.S + 12)); const gnd = ok(0.27, Math.min(0.10, p.C), norm(p.S - 8));
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, rgba(zen)); gr.addColorStop(0.42, rgba(mid)); gr.addColorStop(0.66, rgba(hor)); gr.addColorStop(0.74, rgba(hor)); gr.addColorStop(0.80, rgba(gnd)); gr.addColorStop(1, rgba(ok(0.22, Math.min(0.08, p.C), norm(p.S - 10)))); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        light(g, W, H, 0.18, 0.02, 0.62, 0.46, p.lightC, 0.72); band(g, W, H * 0.62, H * 0.76, ok(0.80, 0.08, p.Lh), 0, 0, 0.34); stars(g, W, H, 70, 3, [255, 255, 255], 0.4); vignette(g, W, H, 0.22);
      } },
    split: { name: 'Два света', group: 'light', why: 'ключевой свет слева сверху и заполняющий снизу справа другого оттенка — объём без смены цвета сцены',
      draw(g, W, H, p) { base(g, W, H, ok(0.46, p.C, p.S), ok(0.28, p.C * 0.75, norm(p.S - 6)), 160); light(g, W, H, 0.14, 0, 0.66, 0.5, p.lightC, 0.85); light(g, W, H, 0.92, 1.0, 0.75, 0.48, p.light2C, 0.6); light(g, W, H, 1.02, 0.36, 0.22, 0.34, ok(0.84, 0.06, p.Lh), 0.32); vignette(g, W, H, 0.14); } },
    dawn: { name: 'Рассвет', group: 'light', why: 'тёплый свет идёт от горизонта снизу, небо остаётся в тоне темы и темнеет кверху — глубина по вертикали',
      draw(g, W, H, p) {
        const warmH = 42; // тёплый свет зари — янтарь, а не оттенок темы: сама сцена остаётся в цвете темы (владелец: «цвета сцены не те» — другой цвет только как свет)
        base(g, W, H, ok(0.30, Math.min(0.12, p.C), norm(p.S - 14)), ok(0.44, Math.min(0.14, p.C), p.S), 180);
        light(g, W, H, 0.5, 0.98, 0.95, 0.6, ok(0.74, 0.13, warmH), 0.7); light(g, W, H, 0.5, 0.78, 0.5, 0.12, ok(0.9, 0.1, warmH), 0.42);
        band(g, W, H * 0.80, H, ok(0.22, 0.08, norm(p.S - 8)), 0, 0.85); light(g, W, H, 0.2, 0.0, 0.5, 0.35, p.lightC, 0.3); stars(g, W, H, 40, 11, [255, 255, 255], 0.3);
      } },
    /* ── художественные стили ── */
    sumi: { name: 'Суми-э', group: 'art', why: 'тушь на тёмной бумаге: три гряды гор размывом, луна, туман между грядами, зерно бумаги',
      draw(g, W, H, p) {
        const paper = ok(0.26, Math.min(0.04, p.C * 0.4), p.S); const paper2 = ok(0.30, Math.min(0.04, p.C * 0.4), p.S); base(g, W, H, paper2, paper, 180);
        light(g, W, H, 0.7, 0.16, 0.3, 0.2, ok(0.92, 0.03, p.Lh), 0.9, 0.28); // луна с ореолом
        g.fillStyle = rgba(ok(0.93, 0.03, p.Lh), 0.96); g.beginPath(); g.arc(W * 0.7, H * 0.16, W * 0.045, 0, Math.PI * 2); g.fill();
        const ink = (L, a) => rgba(ok(L, Math.min(0.06, p.C * 0.6), p.S), a);
        ridge(g, W, H, H * 0.50, H * 0.07, 1.1, 0.4, ink(0.36, 0.55), { color: 'rgba(0,0,0,0.35)', blur: 28, dy: 0 }); band(g, W, H * 0.50, H * 0.62, ok(0.78, 0.03, p.Lh), 0, 0, 0.22);
        ridge(g, W, H, H * 0.62, H * 0.06, 0.8, 2.1, ink(0.30, 0.75), { color: 'rgba(0,0,0,0.4)', blur: 22, dy: 0 }); band(g, W, H * 0.63, H * 0.74, ok(0.78, 0.03, p.Lh), 0, 0, 0.16);
        ridge(g, W, H, H * 0.76, H * 0.045, 0.6, 4.0, ink(0.20, 0.95), { color: 'rgba(0,0,0,0.45)', blur: 18, dy: 0 });
        // мазки кисти по гребням — сухая кисть
        g.save(); g.lineCap = 'round'; const r = rng(21); for (let i = 0; i < 26; i += 1) { const x0 = r() * W; const y0 = H * (0.47 + r() * 0.3); g.strokeStyle = ink(0.16 + r() * 0.1, 0.35 + r() * 0.3); g.lineWidth = 2 + r() * 5; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 40 + r() * 60, y0 - 10 + r() * 20, x0 + 90 + r() * 120, y0 + 4 + r() * 14); g.stroke(); } g.restore();
        grain(g, W, H, 7, 5);
      } },
    marker: { name: 'Маркер', group: 'art', why: 'пастельные маркеры на тёмной бумаге: широкие косые штрихи трёх тонов, штриховка, зерно',
      draw(g, W, H, p) {
        base(g, W, H, ok(0.27, Math.min(0.05, p.C * 0.5), p.S), ok(0.23, Math.min(0.05, p.C * 0.5), p.S), 180); grain(g, W, H, 6, 9);
        // три маркера: тон темы, сосед теплее, сосед холоднее — насыщенные, чтобы читались как цвет, а не серые пятна
        const tones = [ok(0.46, Math.max(0.12, Math.min(0.17, p.C + 0.06)), p.S), ok(0.56, Math.max(0.12, Math.min(0.17, p.C + 0.06)), norm(p.S + 28)), ok(0.62, Math.max(0.11, Math.min(0.16, p.C + 0.05)), norm(p.S - 26))];
        g.save(); g.globalCompositeOperation = 'screen'; g.lineCap = 'round'; const r = rng(33);
        for (let i = 0; i < 22; i += 1) { const t = tones[i % 3]; const y0 = 40 + r() * H * 0.72; const x0 = -40 + r() * W * 0.85; const len = 260 + r() * 380; const ang = -0.5 + (r() - 0.5) * 0.12; g.lineWidth = 44 + r() * 40; g.strokeStyle = rgba(t, 0.5 + r() * 0.2); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len); g.stroke(); }
        g.restore();
        g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = rgba(ok(0.72, 0.08, p.Lh), 0.22); g.lineWidth = 3; for (let x = -H; x < W; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H * 0.7, H * 0.62); g.stroke(); } g.restore();
        g.save(); g.globalCompositeOperation = 'screen'; g.lineCap = 'round'; g.lineWidth = 14; g.strokeStyle = rgba(ok(0.9, 0.05, p.Lh), 0.3); const r2 = rng(44); for (let i = 0; i < 6; i += 1) { const x0 = 40 + r2() * W * 0.5; const y0 = 40 + r2() * H * 0.3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 120 + r2() * 160, y0 - 70 - r2() * 60); g.stroke(); } g.restore();
        band(g, W, H * 0.58, H, [0, 0, 0], 0, 0.42);
      } },
    aurora: { name: 'Аврора', group: 'art', why: 'северное сияние: ленты света над тёмными холмами, звёзды',
      draw(g, W, H, p) {
        base(g, W, H, ok(0.20, Math.min(0.08, p.C), norm(p.S - 10)), ok(0.26, Math.min(0.09, p.C), p.S), 175); stars(g, W, H, 140, 17, [255, 255, 255], 0.62);
        const cols = [ok(0.78, 0.16, norm(p.S + 60)), ok(0.74, 0.17, p.S), ok(0.70, 0.15, norm(p.S - 50)), ok(0.80, 0.12, norm(p.S + 110))];
        g.save(); g.globalCompositeOperation = 'screen';
        for (let k = 0; k < 4; k += 1) { const yc = H * (0.22 + k * 0.1); const amp = H * (0.05 + k * 0.012); const th = H * (0.16 - k * 0.02); g.beginPath(); g.moveTo(0, yc);
          for (let x = 0; x <= W; x += 10) { const t = x / W; g.lineTo(x, yc + Math.sin(t * 2.2 * Math.PI + k * 1.3) * amp + Math.sin(t * 5.1 + k) * amp * 0.3); }
          for (let x = W; x >= 0; x -= 10) { const t = x / W; g.lineTo(x, yc + th + Math.sin(t * 2.2 * Math.PI + k * 1.3) * amp + Math.sin(t * 5.1 + k) * amp * 0.3); }
          g.closePath(); const gr = g.createLinearGradient(0, yc - amp, 0, yc + th + amp); gr.addColorStop(0, rgba(cols[k], 0)); gr.addColorStop(0.75, rgba(cols[k], 0.55)); gr.addColorStop(1, rgba(cols[k], 0.05)); g.save(); g.shadowColor = rgba(cols[k], 0.6); g.shadowBlur = 40; g.fillStyle = gr; g.fill(); g.restore(); }
        g.restore();
        ridge(g, W, H, H * 0.74, H * 0.05, 0.9, 1.2, rgba(ok(0.16, 0.05, p.S), 1), { color: 'rgba(0,0,0,0.5)', blur: 20, dy: -6 }); ridge(g, W, H, H * 0.84, H * 0.035, 0.7, 3.4, rgba(ok(0.12, 0.04, p.S), 1), null);
      } },
    facet: { name: 'Витраж', group: 'art', why: 'грани: плоскость из треугольников с лёгким разбросом тона и тёмными свинцовыми швами, свет слева сверху',
      draw(g, W, H, p) {
        const cols = 8; const rows = 7; const r = rng(55); const pts = [];
        for (let j = 0; j <= rows; j += 1) { const row = []; for (let i = 0; i <= cols; i += 1) { const jx = (i === 0 || i === cols) ? 0 : (r() - 0.5) * (W / cols) * 0.6; const jy = (j === 0 || j === rows) ? 0 : (r() - 0.5) * (H / rows) * 0.6; row.push([i * W / cols + jx, j * H / rows + jy]); } pts.push(row); }
        const col = (x, y, k) => { const t = y / H; const L = 0.50 - 0.22 * t + k * 0.06 - 0.10 * (x / W) * t; return ok(Math.max(0.2, L), Math.min(0.15, p.C + 0.02), norm(p.S + (k - 0.5) * 10)); };
        const tri = (a, b, c) => { const cx = (a[0] + b[0] + c[0]) / 3; const cy = (a[1] + b[1] + c[1]) / 3; g.fillStyle = rgba(col(cx, cy, r())); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = 2.2; g.stroke(); };
        for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) { const a = pts[j][i]; const b = pts[j][i + 1]; const c = pts[j + 1][i]; const d = pts[j + 1][i + 1]; if ((i + j) % 2) { tri(a, b, c); tri(b, d, c); } else { tri(a, b, d); tri(a, d, c); } }
        light(g, W, H, 0.15, 0, 0.6, 0.45, p.lightC, 0.5); band(g, W, H * 0.6, H, [0, 0, 0], 0, 0.5);
      } },
    paper: { name: 'Бумажный коллаж', group: 'art', why: 'вырезанные из бумаги холмы слоями с тенью под каждым краем, бумажное солнце и зерно',
      draw(g, W, H, p) {
        base(g, W, H, ok(0.52, Math.min(0.12, p.C), p.S), ok(0.44, Math.min(0.12, p.C), p.S), 180);
        g.fillStyle = rgba(ok(0.86, 0.07, p.Lh), 0.95); g.beginPath(); g.arc(W * 0.64, H * 0.15, W * 0.075, 0, Math.PI * 2); g.fill(); // солнце между плашками шапки и колокольчиком, не под текстом
        const layers = [[0.42, 0.42], [0.55, 0.36], [0.67, 0.30], [0.79, 0.24]];
        layers.forEach(([y, L], i) => ridge(g, W, H, H * y, H * 0.05, 0.9 + i * 0.3, i * 1.9, rgba(ok(L, Math.min(0.13, p.C + 0.02), norm(p.S + i * 5)), 1), { color: 'rgba(0,0,0,0.5)', blur: 16, dy: 10 }));
        grain(g, W, H, 5, 13); band(g, W, H * 0.6, H, [0, 0, 0], 0, 0.32);
      } },
  };

  /** Рисует стиль key для сцены W × H по палитре p (см. выше); возвращает { image: ImageData, key } для spec.image перекраски. */
  const render = (key, W, H, p) => {
    const st = STYLES[key]; if (!st) throw new Error(`${LOG} нет стиля ${key}`);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
    const t0 = performance.now(); st.draw(g, W, H, p); guard(g, W, H, key);
    const image = g.getImageData(0, 0, W, H);
    console.log(LOG, 'стиль', key, W + '×' + H, Math.round(performance.now() - t0), 'мс'); // guard-ok: одна строка на стиль
    return { image, key };
  };
  return { STYLES, render, ok, rgba };
})();
