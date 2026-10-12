#!/usr/bin/env node
// зачем (координатор 12.10): слой <имя>.accent.webp от Codex НЕ совпадал с деталью основы (лента lessons на ~120 px ниже закладки, кружки dialogs сдвинуты).
// Этот скрипт ВЫРЕЗАЕТ маску детали из самой основы <имя>.webp — пиксели закладки / точек, с мягкой альфой по контуру; альфа слегка падает в тенях детали
// (0,75–1,0), чтобы под tintColor читалась светотень основы. Воспроизводимо: параметры ниже, ничего руками.
//   node scripts/make_accent_from_base.mjs [--src <папка с dark/ и light/>] [--out <папка вывода>] [--only lessons,dialogs]
// По умолчанию: основа из assets/images/v2art, результат в ART_STYLE_FOR_CODEX/trials/S2_clay_accentfix/{dark,light}/<имя>.accent.webp (принимается import_art_style S2_clay_accentfix).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[ACCENT-CUT]';
const opt = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const srcRoot = path.resolve(opt('--src', path.join(root, 'assets', 'images', 'v2art')));
const outRoot = path.resolve(opt('--out', path.join(root, 'ART_STYLE_FOR_CODEX', 'trials', 'S2_clay_accentfix')));
const only = opt('--only', null)?.split(',') ?? null;

// Область поиска и пороги — в координатах кадра 1024×1024 основы. Менять только по результату наложения (scripts/accent_overlay.mjs).
const SPEC = {
  // lessons: закладка — нейтрально-светлая лента на тёмной обложке / кремовых страницах: у ленты почти нет цветности (R≈G≈B), у страниц она тёплая
  lessons: {
    kind: 'ribbon',
    dark: { roi: [560, 380, 760, 700], chromaMax: 6, lumaMin: 214 },
    light: { roi: [740, 360, 900, 600], chromaMax: 7, lumaMin: 230 },
  },
  // dialogs: три выпуклые точки на светлом пузыре — круги; центры и радиус находятся голосованием по краям основы
  dialogs: {
    kind: 'dots',
    dark: { roi: [380, 470, 880, 680], count: 3, rMin: 50, rMax: 74 },
    light: { roi: [340, 470, 840, 680], count: 3, rMin: 50, rMax: 74 },
  },
  // intro_* (кадр 1536×1024, прежний «кожаный» стиль): деталь заметна не яркостью вообще, а отличием от ближайшего фона (локальный контраст)
  // intro_cards_hub: закладка на центральной карточке — светлая на тёмной карточке, тёмная на светлой
  intro_cards_hub: {
    kind: 'contrast',
    dark: { roi: [700, 150, 762, 246], sign: 1, delta: 40, bgSigma: 20, fgSigma: 1.5, closeR: 3 },
    // в светлом кадре композиция другая (закладка левее) и она СВЕТЛЕЕ тёмно-серой карточки
    light: { roi: [640, 148, 690, 236], sign: 1, delta: 25, bgSigma: 30, fgSigma: 1.5, closeR: 3 },
  },
  // intro_cards_swipe: стрелка на верхней карточке стопки — чуть светлее карточки
  intro_cards_swipe: {
    kind: 'contrast',
    dark: { roi: [720, 585, 885, 650], sign: 1, delta: 10, bgSigma: 25, fgSigma: 2, closeR: 4 },
    light: { roi: [720, 585, 885, 650], sign: 1, delta: 10, bgSigma: 25, fgSigma: 2, closeR: 4 },
  },
  // intro_legacy_lessons: тёмная закладка-лента раскрытой книги: на кремовых страницах — по контрасту; где лента лежит на тёмной обложке (контраста нет) — полоса по оси ленты
  intro_legacy_lessons: {
    kind: 'contrast',
    dark: { roi: [700, 470, 920, 925], absMax: 85, fgSigma: 2, closeR: 5, band: { x0: 868, y0: 470, x1: 745, y1: 925, half: 70 }, autoBand: { yFrom: 500, yTo: 820, yEnd: 925, half: 34, fillHalf: 26 }, fillFromY: 845 },
    // светлый кадр: лента тёпло-серая и по яркости сливается с обложкой и тенью страниц — ни порог яркости, ни локальный контраст не отделяют её надёжно;
    // неверная маска хуже отсутствующей, поэтому светлый слой НЕ вырезается (остаётся в долге сторожа до пересдачи Codex по новому правилу)
    light: null,
  },
};

async function loadRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

/** Самая большая связная область маски. */
function largestComponent(mask, w, h) {
  const seen = new Uint8Array(w * h);
  let best = [];
  for (let s = 0; s < w * h; s += 1) {
    if (!mask[s] || seen[s]) continue;
    const comp = [];
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      comp.push(p);
      const x = p % w;
      const y = (p - x) / w;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    if (comp.length > best.length) best = comp;
  }
  const out = new Uint8Array(w * h);
  for (const p of best) out[p] = 1;
  return out;
}

/** Морфологическое закрытие (заполнить мелкие дыры): dilate r, затем erode r — квадратным окном. */
function close(mask, w, h, r) {
  const pass = (src, grow) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let hit = grow ? 0 : 1;
        for (let dy = -r; dy <= r && (grow ? !hit : hit); dy += 1) {
          for (let dx = -r; dx <= r; dx += 1) {
            const xx = x + dx;
            const yy = y + dy;
            const v = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
            if (grow && v) { hit = 1; break; }
            if (!grow && !v) { hit = 0; break; }
          }
        }
        out[y * w + x] = hit;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

/** Размытие одноканальной карты яркости (sharp.blur отдаёт 3 канала — берём один). */
async function blurChan(values, w, h, sigma) {
  return sharp(Buffer.from(values), { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
}

/** Заливка дыр внутри маски: всё, что не достижимо с краёв кадра по «пустым» пикселям, становится маской. */
function fillHoles(mask, w, h) {
  const reach = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x += 1) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y += 1) { stack.push(y * w, y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop();
    if (reach[p] || mask[p]) continue;
    reach[p] = 1;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) out[i] = mask[i] || !reach[i] ? 1 : 0;
  return out;
}

/** Деталь = пиксели, заметно отличающиеся от локального фона (sign +1 — светлее, −1 — темнее), самая большая связная область в ROI (и в полосе вдоль оси ленты). */
async function contrastMask(img, cfg) {
  const { w, h } = img;
  const L = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) L[i] = Math.round(luma(img.data, i * 4));
  const fg = await blurChan(L, w, h, cfg.fgSigma ?? 1.5);
  const bg = await blurChan(L, w, h, cfg.bgSigma ?? 30);
  const [x0, y0, x1, y1] = cfg.roi;
  const inBand = (x, y) => {
    if (!cfg.band) return true;
    const b = cfg.band;
    if (y < b.y0 || y > b.y1) return false;
    const cx = b.x0 + ((y - b.y0) / (b.y1 - b.y0)) * (b.x1 - b.x0);
    return Math.abs(x - cx) <= b.half;
  };
  const m = new Uint8Array(w * h);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = y * w + x;
      if (img.data[i * 4 + 3] < 200 || !inBand(x, y)) continue;
      const hit = cfg.absMax !== undefined ? fg[i] < cfg.absMax : cfg.sign * (fg[i] - bg[i]) > cfg.delta;
      if (hit) m[i] = 1;
    }
  }
  let out = close(largestComponent(m, w, h), w, h, cfg.closeR ?? 3);
  if (cfg.autoBand) {
    // зачем: ось ленты берём ИЗ найденной маски (медиана x по строкам чистого участка → прямая), а не «на глаз»; полоса вдоль оси отсекает обложку, с которой лента сливается
    const a = cfg.autoBand;
    const rows = [];
    for (let y = a.yFrom; y <= a.yTo; y += 1) {
      const xs = [];
      for (let x = x0; x < x1; x += 1) if (out[y * w + x]) xs.push(x);
      if (xs.length >= 20 && xs.length <= 90) rows.push({ y, x: xs[Math.floor(xs.length / 2)] });
    }
    if (rows.length >= 20) {
      const n = rows.length;
      const sy = rows.reduce((q, r) => q + r.y, 0);
      const sx = rows.reduce((q, r) => q + r.x, 0);
      const syy = rows.reduce((q, r) => q + r.y * r.y, 0);
      const sxy = rows.reduce((q, r) => q + r.y * r.x, 0);
      const k = (n * sxy - sy * sx) / (n * syy - sy * sy || 1);
      const b0 = (sx - k * sy) / n;
      cfg = { ...cfg, band: { x0: k * rows[0].y + b0, y0: rows[0].y - 60, x1: k * a.yEnd + b0, y1: a.yEnd, half: a.half }, fillHalf: a.fillHalf };
      console.log(`${LOG} ось ленты: x = ${k.toFixed(3)}·y + ${b0.toFixed(1)} (по ${n} строкам)`);
      const keep = new Uint8Array(w * h);
      const bandB = cfg.band;
      const bandAt = (x, y) => { if (y < bandB.y0 || y > bandB.y1) return false; const cx = bandB.x0 + ((y - bandB.y0) / (bandB.y1 - bandB.y0)) * (bandB.x1 - bandB.x0); return Math.abs(x - cx) <= bandB.half; };
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) if (out[y * w + x] && bandAt(x, y)) keep[y * w + x] = 1;
      out = keep;
    }
  }
  out = fillHoles(out, w, h);
  if (cfg.band && cfg.fillFromY) {
    // зачем: на тёмной обложке лента сливается с фоном (контраста нет) — ниже fillFromY берём полосу целиком по оси ленты
    out = Uint8Array.from(out);
    const fillHalf = cfg.fillHalf ?? cfg.band.half;
    const bnd = cfg.band;
    for (let y = cfg.fillFromY; y <= bnd.y1; y += 1) {
      const cx = bnd.x0 + ((y - bnd.y0) / (bnd.y1 - bnd.y0)) * (bnd.x1 - bnd.x0);
      for (let x = Math.max(x0, Math.round(cx - fillHalf)); x <= Math.min(x1 - 1, Math.round(cx + fillHalf)); x += 1) out[y * w + x] = 1;
    }
  }
  return out;
}

function ribbonMask(img, cfg) {
  const [x0, y0, x1, y1] = cfg.roi;
  const m = new Uint8Array(img.w * img.h);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * img.w + x) * 4;
      if (img.data[i + 3] < 200) continue;
      const mx = Math.max(img.data[i], img.data[i + 1], img.data[i + 2]);
      const mn = Math.min(img.data[i], img.data[i + 1], img.data[i + 2]);
      if (mx - mn <= cfg.chromaMax && luma(img.data, i) >= cfg.lumaMin) m[y * img.w + x] = 1;
    }
  }
  // зачем: верх ленты лежит на кремовой странице с зернистой текстурой — закрытие на 9 px убирает «зубцы» маски
  const comp = close(largestComponent(m, img.w, img.h), img.w, img.h, 9);
  return straightenRibbonTop(comp, img.w, img.h);
}

/** Лента — полоса со срезанным верхом: левый/правый край верхней четверти берём по прямой, проведённой через середину ленты (там маска чистая). */
function straightenRibbonTop(mask, w, h) {
  let top = h;
  let bottom = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (mask[y * w + x]) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  if (bottom <= top) return mask;
  const rows = [];
  for (let y = top + Math.round((bottom - top) * 0.3); y <= top + Math.round((bottom - top) * 0.7); y += 1) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x += 1) if (mask[y * w + x]) { if (l < 0) l = x; r = x; }
    if (l >= 0) rows.push({ y, l, r });
  }
  if (rows.length < 4) return mask;
  const fit = (key) => {
    const n = rows.length;
    const sy = rows.reduce((a, q) => a + q.y, 0);
    const sv = rows.reduce((a, q) => a + q[key], 0);
    const syy = rows.reduce((a, q) => a + q.y * q.y, 0);
    const syv = rows.reduce((a, q) => a + q.y * q[key], 0);
    const k = (n * syv - sy * sv) / (n * syy - sy * sy || 1);
    return { k, b: (sv - k * sy) / n };
  };
  const L = fit('l');
  const R = fit('r');
  const out = Uint8Array.from(mask);
  for (let y = top; y <= top + Math.round((bottom - top) * 0.3); y += 1) {
    const l = Math.round(L.k * y + L.b);
    const r = Math.round(R.k * y + R.b);
    // зачем: объединяем с найденной областью, а не заменяем — у настоящей ленты верх чуть шире прямой, замена оставляла серую «щёку» слева
    for (let x = l; x <= r; x += 1) out[y * w + x] = 1;
  }
  return out;
}

/** Голосование окружностей по градиенту яркости (по направлению градиента, оба знака). */
function dotsMask(img, cfg) {
  const { w, h } = img;
  const [x0, y0, x1, y1] = cfg.roi;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) L[i] = luma(img.data, i * 4);
  const acc = new Float32Array(w * h);
  for (let y = y0 + 2; y < y1 - 2; y += 1) {
    for (let x = x0 + 2; x < x1 - 2; x += 1) {
      const gx = (L[y * w + x + 2] - L[y * w + x - 2]) / 4;
      const gy = (L[(y + 2) * w + x] - L[(y - 2) * w + x]) / 4;
      const mag = Math.hypot(gx, gy);
      if (mag < 1.2) continue;
      const ux = gx / mag;
      const uy = gy / mag;
      for (let r = cfg.rMin; r <= cfg.rMax; r += 2) {
        for (const sgn of [-1, 1]) {
          const cx = Math.round(x + sgn * ux * r);
          const cy = Math.round(y + sgn * uy * r);
          if (cx < x0 || cx >= x1 || cy < y0 || cy >= y1) continue;
          acc[cy * w + cx] += mag;
        }
      }
    }
  }
  // сглаживание аккумулятора и выбор count пиков с разнесением не меньше 2·rMin
  const sm = new Float32Array(w * h);
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
    let s = 0;
    for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) s += acc[(y + dy) * w + x + dx] ?? 0;
    sm[y * w + x] = s;
  }
  const centers = [];
  for (let k = 0; k < cfg.count; k += 1) {
    let best = -1;
    let bp = null;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const v = sm[y * w + x];
      if (v <= best) continue;
      if (centers.some((c) => Math.hypot(c.x - x, c.y - y) < cfg.rMin * 2)) continue;
      best = v; bp = { x, y };
    }
    if (!bp) break;
    // радиус — по лучшему согласию края в окрестности центра
    let bestR = cfg.rMin;
    let bestScore = -1;
    for (let r = cfg.rMin; r <= cfg.rMax; r += 1) {
      let score = 0;
      for (let a = 0; a < 72; a += 1) {
        const t = (a / 72) * Math.PI * 2;
        const px = Math.round(bp.x + Math.cos(t) * r);
        const py = Math.round(bp.y + Math.sin(t) * r);
        const gx = (L[py * w + px + 2] - L[py * w + px - 2]) / 4;
        const gy = (L[(py + 2) * w + px] - L[(py - 2) * w + px]) / 4;
        score += Math.abs(gx * Math.cos(t) + gy * Math.sin(t));
      }
      if (score > bestScore) { bestScore = score; bestR = r; }
    }
    centers.push({ x: bp.x, y: bp.y, r: bestR });
  }
  // зачем: точки одного размера (перспектива почти плоская), а радиус из голосования плавает (51…68) — берём медиану, как у живой выпуклости
  const radii = centers.map((c) => c.r).sort((a, b) => a - b);
  const medianR = radii[Math.floor(radii.length / 2)] ?? cfg.rMin;
  const m = new Uint8Array(w * h);
  for (const c of centers) {
    const rr = medianR * 0.89; // зачем: голосование по краям ловит внешнее кольцо тени (r на 8–14 % больше самой точки); 0,89 даёт радиус самой выпуклости (проверено наложением)
    for (let y = Math.floor(c.y - rr - 1); y <= Math.ceil(c.y + rr + 1); y += 1) for (let x = Math.floor(c.x - rr - 1); x <= Math.ceil(c.x + rr + 1); x += 1) {
      if (Math.hypot(x - c.x, y - c.y) <= rr) m[y * w + x] = 1;
    }
  }
  return { mask: m, centers };
}

/** Мягкая альфа: размытие бинарной маски на 1,2 px и ослабление в тенях детали (0,75–1,0). */
async function toAccentWebp(mask, img, outFile) {
  const { w, h } = img;
  const raw = Buffer.alloc(w * h);
  let sumL = 0;
  let cnt = 0;
  for (let i = 0; i < w * h; i += 1) if (mask[i]) { sumL += luma(img.data, i * 4); cnt += 1; }
  const refL = cnt ? sumL / cnt : 200;
  for (let i = 0; i < w * h; i += 1) raw[i] = mask[i] ? 255 : 0;
  const soft = await sharp(raw, { raw: { width: w, height: h, channels: 1 } }).blur(1.2).extractChannel(0).raw().toBuffer(); // зачем: blur отдаёт 3 канала — берём один, иначе альфа читалась из чужих байтов (все нули)
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i += 1) {
    const shade = Math.max(0.75, Math.min(1, 0.75 + 0.25 * (luma(img.data, i * 4) / Math.max(1, refL))));
    rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = Math.round(soft[i] * (mask[i] || soft[i] > 8 ? shade : 1));
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(outFile);
  return cnt;
}

for (const [name, spec] of Object.entries(SPEC)) {
  if (only && !only.includes(name)) continue;
  for (const mode of ['dark', 'light']) {
    const baseFile = path.join(srcRoot, mode, `${name}.webp`);
    if (!fs.existsSync(baseFile)) { console.warn(`${LOG} пропуск ${mode}/${name}: нет основы ${baseFile}`); continue; }
    const img = await loadRaw(baseFile);
    const cfg = spec[mode];
    if (!cfg) { console.warn(`${LOG} ${mode}/${name}: вырезка не поддерживается (см. SPEC) — слой не создан`); continue; }
    let mask;
    let extra = '';
    if (spec.kind === 'ribbon') mask = ribbonMask(img, cfg);
    else if (spec.kind === 'contrast') mask = await contrastMask(img, cfg);
    else { const r = dotsMask(img, cfg); mask = r.mask; extra = ` круги: ${r.centers.map((c) => `(${c.x},${c.y} r${c.r})`).join(' ')}`; }
    const outFile = path.join(outRoot, mode, `${name}.accent.webp`);
    const px = await toAccentWebp(mask, img, outFile);
    console.log(`${LOG} ${mode}/${name}: ${px} px детали → ${path.relative(root, outFile)} (${Math.round(fs.statSync(outFile).size / 1024)} КБ)${extra}`);
  }
}
