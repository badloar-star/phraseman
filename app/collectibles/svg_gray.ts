// «Чисто серые» залоченные карточки (концепция v2: grayscale-арт + замок, НЕ «?»).
// react-native-svg не умеет CSS-фильтры, поэтому перекрашиваем сам SVG-текст:
// каждый цвет заменяется серым той же яркости (luma Rec.601). Результат
// кэшируется по cardId — преобразование выполняется один раз.

function channelToHex(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, '0');
}

function lumaGrayHex(r: number, g: number, b: number): string {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  // Слегка приглушаем к среднему, чтобы серый арт не «вспыхивал» белыми пятнами.
  const soft = y * 0.82 + 38;
  const h = channelToHex(soft);
  return `#${h}${h}${h}`;
}

function hexToGray(hex: string): string {
  const full = hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `#${hex}`;
  return lumaGrayHex((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

const grayCache = new Map<string, string>();

/**
 * Сколько посчитанных серых карточек помним.
 *
 * ⚠️ ВНИМАНИЕ (2026-09-22): на сегодня `grayscaleSvg` НЕ ВЫЗЫВАЕТСЯ НИОТКУДА —
 * проверено поиском по всем .ts/.tsx: единственное вхождение в этом файле.
 * То есть модуль мёртвый, и на лаги приложения он сейчас не влияет НИКАК.
 * Граница поставлена не как починка, а чтобы дефект не ожил вместе с модулем:
 * без неё кэш держал ЦЕЛЫЕ строки SVG-разметки по одной на каждую залоченную
 * карточку и не чистился никогда (табы не размонтируются — react-freeze).
 *
 * Промах ничего не ломает: значение пересчитывается тем же кодом ниже, кэш —
 * только ускорение повторного показа. 64 — с запасом на экран коллекции.
 */
const GRAY_CACHE_LIMIT = 64;

export function grayscaleSvg(cacheKey: string, svg: string): string {
  const hit = grayCache.get(cacheKey);
  if (hit) {
    // Переставляем в конец: вытесняем самое давнее, а не то, что смотрят сейчас.
    grayCache.delete(cacheKey);
    grayCache.set(cacheKey, hit);
    return hit;
  }
  const gray = svg
    .replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (_m, hex: string) => hexToGray(hex))
    .replace(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g,
      (_m, r: string, g: string, b: string, a?: string) => {
        const grayHex = lumaGrayHex(Number(r), Number(g), Number(b));
        const rr = parseInt(grayHex.slice(1, 3), 16);
        // react-native-svg не поддерживает rgba() — используем rgb + opacity атрибут не можем тут,
        // поэтому возвращаем просто rgb (opacity уже была заменена на fill-opacity при build-app).
        return `rgb(${rr},${rr},${rr})`;
      },
    );
  grayCache.set(cacheKey, gray);
  while (grayCache.size > GRAY_CACHE_LIMIT) {
    const oldest = grayCache.keys().next();
    if (oldest.done) break;
    grayCache.delete(oldest.value);
  }
  return gray;
}
