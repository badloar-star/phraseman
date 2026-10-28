/* scene-cards.js — новые стили карточек и плашек на РЕАЛЬНОМ кадре Главной: тон, тень, свет — без рамок. Работает по пикселям полосы
   под сценой: внутри найденных прямоугольников карточек (опись scene-frames.json → cards) заливка карточки заменяется новой (тон в оттенке
   темы с лёгким вертикальным градиентом, световая кромка сверху), надписи и значки остаются как сняты (та же классификация, что у сцены);
   снаружи — мягкая тень под карточкой на пикселях фона страницы.
   зачем (владелец 28.10: «новые стили карточек: тон, тень, свет на карточках и плашках, без рамок»): показать на настоящем экране, не
   перерисовывая его. Вход — ImageData полосы [y0, y1) кадра 1080 px. */
window.SceneCards = (() => {
  const LOG = '[SP-CARDS]';
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  /** Расстояние точки до скруглённого прямоугольника (0 внутри). */
  const sdRound = (x, y, c) => { const cx = Math.max(c.x0 + c.r, Math.min(c.x1 - c.r, x)); const cy = Math.max(c.y0 + c.r, Math.min(c.y1 - c.r, y)); const d = Math.hypot(x - cx, y - cy); return Math.max(0, d - c.r); };
  /**
   * restyle(o): { data (RGBA полосы), W, y0 (строка кадра, с которой начинается полоса), cards: [{ x0, y0, x1, y1, r, kind }],
   *   fill: [r,g,b] (цвет заливки карточек на кадре), bgRow: (y) → [r,g,b] (фон страницы в строке), accent: [r,g,b], dark: bool,
   *   v: { tone, shadow, light } — какие приёмы включить, stats: {} }
   */
  function restyle(o) {
    const { data, W, cards, fill, accent, dark, v } = o; const H = data.length / 4 / W; const st = o.stats || {}; st.fill = 0; st.lift = 0; st.dark = 0; st.keep = 0; st.shadow = 0;
    const toneMix = v.tone ? (dark ? 0.09 : 0.06) : 0; // доля акцента темы в заливке
    const baseOf = (f) => f.map((c, i) => c + (accent[i] - c) * toneMix); const BASE = new Map();
    const SH = 44; // глубина тени, px кадра
    for (let y = 0; y < H; y += 1) {
      const fy = o.y0 + y; const bg = o.bgRow(fy);
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4; const pr = data[i]; const pg = data[i + 1]; const pb = data[i + 2];
        let inside = null; let dMin = 1e9;
        for (let k = 0; k < cards.length; k += 1) { const c = cards[k]; if (fy < c.y0 - SH || fy > c.y1 + SH || x < c.x0 - SH || x > c.x1 + SH) continue; const d = sdRound(x, fy, c); if (d === 0) { inside = c; break; } if (d < dMin) dMin = d; }
        if (inside) {
          const cf = inside.fill || fill; if (!BASE.has(inside)) BASE.set(inside, baseOf(cf)); const base = BASE.get(inside); // заливка своя у каждой карточки (панель и плашка «Фраза дня» разного тона)
          const t = (fy - inside.y0) / Math.max(1, inside.y1 - inside.y0); // 0 верх … 1 низ карточки
          let nf = base.map((c) => c + (v.tone ? (dark ? 5 : 2) * (1 - 2 * t) : 0)); // лёгкий вертикальный градиент тона
          if (v.light) { const e = fy - inside.y0; if (e >= 1 && e <= 3) nf = nf.map((c) => c + (dark ? 26 : 14)); else if (e < 70) nf = nf.map((c) => c + (dark ? 9 : 4) * (1 - e / 70)); }
          const dr = pr - cf[0]; const dg = pg - cf[1]; const db = pb - cf[2]; const md = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db));
          if (md <= 6) { data[i] = clamp(nf[0]); data[i + 1] = clamp(nf[1]); data[i + 2] = clamp(nf[2]); st.fill += 1; continue; }
          if (dr >= -3 && dg >= -3 && db >= -3) { // надпись/значок светлее заливки — та же доля подъёма над новой заливкой
            const as = []; if (255 - cf[0] >= 10) as.push(dr / (255 - cf[0])); if (255 - cf[1] >= 10) as.push(dg / (255 - cf[1])); if (255 - cf[2] >= 10) as.push(db / (255 - cf[2]));
            if (as.length) { let mn = 1; let mx = 0; let sum = 0; for (const a of as) { if (a < mn) mn = a; if (a > mx) mx = a; sum += a; } if (mx - mn <= 0.12) { const a = Math.min(1, Math.max(0, sum / as.length)); data[i] = clamp(nf[0] * (1 - a) + 255 * a); data[i + 1] = clamp(nf[1] * (1 - a) + 255 * a); data[i + 2] = clamp(nf[2] * (1 - a) + 255 * a); st.lift += 1; continue; } }
          }
          if (dr <= 3 && dg <= 3 && db <= 3) { const k = (lum(pr, pg, pb) + 1) / (lum(cf[0], cf[1], cf[2]) + 1); data[i] = clamp(nf[0] * k); data[i + 1] = clamp(nf[1] * k); data[i + 2] = clamp(nf[2] * k); st.dark += 1; continue; }
          st.keep += 1; continue;
        }
        if (v.shadow && dMin < SH) { // тень: только на пикселях фона страницы, сильнее снизу, слабее сверху
          if (Math.abs(pr - bg[0]) <= 10 && Math.abs(pg - bg[1]) <= 10 && Math.abs(pb - bg[2]) <= 10) {
            let below = false; for (let k = 0; k < cards.length; k += 1) { const c = cards[k]; if (fy > c.y1 && fy - c.y1 < SH && x >= c.x0 - 6 && x <= c.x1 + 6) { below = true; break; } }
            const f = (1 - dMin / SH); const a = (below ? (dark ? 0.55 : 0.22) : (dark ? 0.28 : 0.1)) * f * f;
            data[i] = clamp(pr * (1 - a)); data[i + 1] = clamp(pg * (1 - a)); data[i + 2] = clamp(pb * (1 - a)); st.shadow += 1;
          }
        }
      }
    }
    return st;
  }
  const VARIANTS = {
    tone: { name: 'Тон', why: 'заливка карточек в оттенке темы с лёгким градиентом сверху вниз, без рамок', v: { tone: true, shadow: false, light: false } },
    shadow: { name: 'Тень', why: 'мягкая тень под карточкой и чуть по бокам — карточка отделяется от фона тоном, не линией', v: { tone: false, shadow: true, light: false } },
    light: { name: 'Свет', why: 'световая кромка сверху и слабый внутренний свет под ней — как у матового стекла', v: { tone: true, shadow: false, light: true } },
    all: { name: 'Тон + тень + свет', why: 'всё вместе: тон в оттенке темы, тень снизу, кромка света сверху', v: { tone: true, shadow: true, light: true } },
  };
  return { restyle, VARIANTS, LOG };
})();
