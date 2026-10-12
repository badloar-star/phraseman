// зачем (координатор 12.10): слой <имя>.accent.webp красится tintColor и обязан ПИКСЕЛЬНО совпадать с деталью основы <имя>.webp.
// Прежний сторож [THEMED-ART-GUARD] проверял размер и альфу, но не совпадение: у lessons цветная лента стояла отдельным прямоугольником на ~120 px ниже настоящей
// закладки, у dialogs три плоских кружка были сдвинуты от настоящих точек. Здесь два измеримых признака:
//   1) onOpaquePct  — доля альфы .accent на непрозрачных пикселях основы (деталь не может висеть в воздухе);
//   2) edgeAlignedPct — доля пикселей КОНТУРА .accent, лежащих на настоящем краю основы (перепад яркости/альфы: контур закладки, ободок точки, силуэт).
//      Деталь, вырезанная из основы, повторяет её контур; сдвинутая «мимо» — стоит на плоской заливке, где перепадов нет.
// Оба признака не зависят от яркости детали (светлые точки на светлом пузыре отличаются только контуром).
import sharp from 'sharp';

export const ALIGN_SIZE = 512;
export const ALIGN_MIN_ON_OPAQUE_PCT = 90;
export const ALIGN_MIN_EDGE_PCT = 60;
export const ALIGN_MAX_INTERIOR_EDGE_PCT = 12;
const EDGE_GRADIENT = 5; // порог перепада яркости (0–255) на пиксель после лёгкого размытия
const INTERIOR_ERODE = 5; // пикселей: «нутро» детали — без кромки
const EDGE_RADIUS = 3; // пикселей (в кадре 512): край основы должен быть не дальше этого от контура accent
const ALPHA_ON = 128;

async function load(file, smooth = 0) {
  let img = sharp(file).resize(ALIGN_SIZE, ALIGN_SIZE, { fit: 'fill' }).ensureAlpha();
  // зачем: у глиняной основы мелкое зерно/текстура — перепады считаем по слегка размытой основе (1,2 px), иначе зерно похоже на «край»
  if (smooth > 0) img = img.blur(smooth);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Яркость основы с учётом альфы (прозрачное = 0) и отдельно — альфа. */
function lumaAlpha(img) {
  const n = img.w * img.h;
  const luma = new Float32Array(n);
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const a = img.data[i * 4 + 3] / 255;
    luma[i] = (0.2126 * img.data[i * 4] + 0.7152 * img.data[i * 4 + 1] + 0.0722 * img.data[i * 4 + 2]) * a;
    alpha[i] = img.data[i * 4 + 3];
  }
  return { luma, alpha };
}

function gradient(field, w, h) {
  const g = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const gx = field[i + 1] - field[i - 1];
      const gy = field[i + w] - field[i - w];
      g[i] = Math.hypot(gx, gy) / 2;
    }
  }
  return g;
}

/** Контур слоя: пиксели с альфой ≥ порога, у которых есть сосед ниже порога. */
function outline(alpha, w, h) {
  const pts = [];
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      if (alpha[i] < ALPHA_ON) continue;
      if (alpha[i - 1] < ALPHA_ON || alpha[i + 1] < ALPHA_ON || alpha[i - w] < ALPHA_ON || alpha[i + w] < ALPHA_ON) pts.push([x, y]);
    }
  }
  return pts;
}

/**
 * Совпадение слоя accent с основой. Возвращает числа и вердикт; `reason` — строка для [THEMED-ART-GUARD].
 * @param {string} baseFile путь к <имя>.webp   @param {string} accentFile путь к <имя>.accent.webp
 */
export async function accentAlignment(baseFile, accentFile) {
  const base = await load(baseFile, 1.2);
  const acc = await load(accentFile);
  const { luma, alpha: baseAlpha } = lumaAlpha(base);
  const edgeLuma = gradient(luma, base.w, base.h);
  const edgeAlpha = gradient(baseAlpha, base.w, base.h);
  const n = base.w * base.h;
  const edge = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) edge[i] = edgeLuma[i] >= EDGE_GRADIENT || edgeAlpha[i] >= EDGE_GRADIENT * 4 ? 1 : 0;
  let mass = 0;
  let onBase = 0;
  for (let i = 0; i < n; i += 1) {
    const a = acc.data[i * 4 + 3];
    if (a <= 24) continue;
    mass += a;
    if (baseAlpha[i] >= ALPHA_ON) onBase += a;
  }
  const accAlpha = new Float32Array(n);
  for (let i = 0; i < n; i += 1) accAlpha[i] = acc.data[i * 4 + 3];
  const pts = outline(accAlpha, acc.w, acc.h);
  let aligned = 0;
  for (const [x, y] of pts) {
    let hit = false;
    for (let dy = -EDGE_RADIUS; dy <= EDGE_RADIUS && !hit; dy += 1) {
      for (let dx = -EDGE_RADIUS; dx <= EDGE_RADIUS; dx += 1) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= base.w || yy >= base.h) continue;
        if (edge[yy * base.w + xx]) { hit = true; break; }
      }
    }
    if (hit) aligned += 1;
  }
  // нутро детали гладкое (лента, выпуклая точка), а «чужая» деталь, стоящая поперёк страниц и корешков, пересекает много перепадов основы
  let interior = 0;
  let interiorEdges = 0;
  for (let y = INTERIOR_ERODE; y < acc.h - INTERIOR_ERODE; y += 1) {
    for (let x = INTERIOR_ERODE; x < acc.w - INTERIOR_ERODE; x += 1) {
      const i = y * acc.w + x;
      if (accAlpha[i] < 200) continue;
      let inside = true;
      for (let d = 1; d <= INTERIOR_ERODE && inside; d += INTERIOR_ERODE - 1) {
        if (accAlpha[i - d] < ALPHA_ON || accAlpha[i + d] < ALPHA_ON || accAlpha[i - d * acc.w] < ALPHA_ON || accAlpha[i + d * acc.w] < ALPHA_ON) inside = false;
      }
      if (!inside) continue;
      interior += 1;
      if (edge[i]) interiorEdges += 1;
    }
  }
  const interiorEdgePct = interior ? +((interiorEdges / interior) * 100).toFixed(1) : 0;
  const onOpaquePct = mass ? +((onBase / mass) * 100).toFixed(1) : 0;
  const edgeAlignedPct = pts.length ? +((aligned / pts.length) * 100).toFixed(1) : 0;
  const problems = [];
  if (onOpaquePct < ALIGN_MIN_ON_OPAQUE_PCT) problems.push(`на основе лежит только ${onOpaquePct} % слоя (нужно ≥ ${ALIGN_MIN_ON_OPAQUE_PCT} %)`);
  if (edgeAlignedPct < ALIGN_MIN_EDGE_PCT) problems.push(`контур слоя совпал с краем основы лишь на ${edgeAlignedPct} % (нужно ≥ ${ALIGN_MIN_EDGE_PCT} %)`);
  if (interiorEdgePct > ALIGN_MAX_INTERIOR_EDGE_PCT) problems.push(`внутри слоя ${interiorEdgePct} % пикселей лежат на перепадах основы (нужно ≤ ${ALIGN_MAX_INTERIOR_EDGE_PCT} %): деталь стоит поперёк краёв, а не на одной выпуклости`);
  return { ok: problems.length === 0, onOpaquePct, edgeAlignedPct, interiorEdgePct, outlinePts: pts.length, reason: problems.length ? `accent_misaligned: ${problems.join('; ')}` : `accent совпадает с основой (на основе ${onOpaquePct} %, контур по краю ${edgeAlignedPct} %, перепадов внутри ${interiorEdgePct} %)` };
}
