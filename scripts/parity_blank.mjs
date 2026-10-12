/**
 * Проверка «пустого кадра» для робота съёмки (scripts/parity_batch_shoot.mjs).
 *
 * зачем (координатор 12.10, разбор Макетов b94db931f): 6 кадров (cards-062, cards-gap-026, onboarding-019/021, dialogs-031/034) были пустыми — светлыми или
 * чёрными — сразу после перехода или модалки; такие кадры съедали круги сверки. Кадр считается пустым, если ≥95 % выбранных пикселей одного цвета
 * ИЛИ в нём почти нет уникальных цветов. Декодер — pngjs (есть в node_modules); если его нет — проверка отключается с предупреждением, а не молча.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let PNG = null;
let loadError = null;
try {
  ({ PNG } = require('pngjs'));
} catch (error) {
  loadError = String(error?.message ?? error);
}

export const BLANK_DOMINANT_RATIO = 0.95;
export const BLANK_MIN_UNIQUE_COLORS = 8;

export function blankCheckAvailable() {
  return PNG !== null;
}

export function blankCheckUnavailableReason() {
  return loadError;
}

/**
 * @returns {{ blank: boolean, dominantRatio: number, uniqueColors: number, width: number, height: number } | null}  null — декодер недоступен или PNG не читается
 */
export function analyzeFrame(buffer) {
  if (!PNG) return null;
  let image;
  try {
    image = PNG.sync.read(buffer);
  } catch (error) {
    console.warn('[BATCH-SHOOT] blank: PNG не декодируется, проверка пропущена:', String(error?.message ?? error).slice(0, 160)); // guard-ok: причина пропуска проверки
    return null;
  }
  const { width, height, data } = image;
  // шаг выборки ~ каждые 6 пикселей по обеим осям (на 1080×2400 это ~72 тыс. точек); цвет квантуем до 5 бит на канал — шум сжатия не считается отличием
  const step = 6;
  const counts = new Map();
  let total = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      total += 1;
    }
  }
  let top = 0;
  for (const c of counts.values()) if (c > top) top = c;
  const dominantRatio = total > 0 ? top / total : 1;
  const uniqueColors = counts.size;
  return { blank: dominantRatio > BLANK_DOMINANT_RATIO || uniqueColors < BLANK_MIN_UNIQUE_COLORS, dominantRatio, uniqueColors, width, height };
}
