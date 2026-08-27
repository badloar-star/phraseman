/**
 * dev_practice_runes_seed.ts — общий помощник «Проверки рун» из DEV-хаба.
 *
 * зачем (владелец, 2026-08-27): «новый раздел в дев хабе, в нём каждая кнопка
 * вызывает соответствующий экран из соответствующего раздела с рандомными
 * цифрами». Семь экранов рун открываются НАСТОЯЩИМИ, со случайным стартовым
 * числом сразу во всех видимых счётчиках (руны, XP, счёт, оценка) — не
 * отдельный макет-клон, тот же самый компонент, что видят игроки.
 *
 * Единственный канал передачи — query-параметр `devRunesSeed` (route params
 * expo-router сериализуются в строки). DevHubSheet генерирует число один раз
 * на тап и кладёт его в params; экраны читают тот же параметр и разворачивают
 * из него весь набор случайных стартовых значений детерминированно — так один
 * и тот же seed даёт один и тот же набор чисел, если экран перемонтируется
 * (двойной рендер разработки, HMR).
 */

const DEV_RUNES_SEED_PARAM = 'devRunesSeed';

/** Генерирует новый seed для одного тапа по кнопке DEV-хаба. */
export function makeDevRunesSeed(): string {
  return String(Math.floor(Date.now() % 100000) + Math.floor(Math.random() * 100000));
}

/** Простой детерминированный PRNG (mulberry32) — без внешних зависимостей. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedToInt(raw: string): number {
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export type DevPracticeRunesFakeState = Readonly<{
  /** Руны — общий диапазон на все семь экранов (владелец, 2026-08-27). */
  runes: number;
  /** Второе число на экране (XP / очки), диапазон широкий для заметности. */
  secondary: number;
  /** Третье число, если у экрана их больше двух (напр. счёт + оценка). */
  tertiary: number;
}>;

/**
 * Разворачивает query-параметр в набор случайных чисел. `null`, если параметр
 * отсутствует — экран в этом случае живёт обычной боевой логикой.
 *
 * Диапазоны — широкие «для заметности» (решение владельца, 2026-08-27):
 * руны 1-300, XP/очки 1-2000, третье число 0-10 (годится и для оценки в
 * звёздах, и для маленького счётчика вроде «ошибок»).
 */
export function readDevPracticeRunesFakeState(
  param: string | string[] | undefined,
): DevPracticeRunesFakeState | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw) return null;
  const rand = mulberry32(seedToInt(raw));
  return Object.freeze({
    runes: 1 + Math.floor(rand() * 300),
    secondary: 1 + Math.floor(rand() * 2000),
    tertiary: Math.floor(rand() * 11),
  });
}

export { DEV_RUNES_SEED_PARAM };
