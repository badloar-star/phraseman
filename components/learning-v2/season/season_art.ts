// ════════════════════════════════════════════════════════════════════════════
// season_art.ts — цвета обложек глав «Сезона»: перевод OKLCH эталона в hex для градиентов React Native.
//
// зачем (владелец 21.10, эталон docs/design/v2-app/course-hybrid-1-4.html, функция `art`): обложка главы и карты эпизодов — глубокий градиент её
// оттенка (без жёлтого), текст на нём белый в обеих темах. В макете цвета заданы в OKLCH (CSS), а React Native OKLCH не понимает, поэтому
// значения переводятся в sRGB здесь, один раз на (оттенок, сдвиг, тема). Если цвет не помещается в sRGB, насыщенность уменьшается при том же
// оттенке и светлоте (как делает CSS gamut mapping), а не обрезается по каналам.
// ════════════════════════════════════════════════════════════════════════════

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

type Rgb = readonly [number, number, number];

function oklchToLinear(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: Rgb): boolean => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
const encode = (v: number): number => {
  const x = clamp01(v);
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};
const hex2 = (v: number): string => Math.round(encode(v) * 255).toString(16).padStart(2, '0');

/** OKLCH → '#RRGGBB'. Вне gamut — уменьшаем насыщенность при том же оттенке и светлоте. */
export function oklchToHex(l: number, c: number, hDeg: number): string {
  let chroma = c;
  let rgb = oklchToLinear(l, chroma, hDeg);
  for (let i = 0; i < 40 && !inGamut(rgb); i += 1) {
    chroma = Math.max(0, chroma - 0.005);
    rgb = oklchToLinear(l, chroma, hDeg);
  }
  return `#${hex2(rgb[0])}${hex2(rgb[1])}${hex2(rgb[2])}`.toUpperCase();
}

/** Оттенок цвета '#RRGGBB' в OKLCH, градусы 0…360 (обратный перевод к oklchToHex). */
export function hexHue(hex: string): number {
  const lin = (i: number): number => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(0);
  const g = lin(1);
  const b = lin(2);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

export type SeasonTheme = 'light' | 'dark';

export type SeasonArt = Readonly<{
  /** Начало линейного градиента 160° (верх-лево). */
  from: string;
  /** Конец линейного градиента (низ-право). */
  to: string;
  /** Тон светового пятна в правом верхнем углу (радиальный градиент 120%×90% в точке 88% 0%). */
  glow: string;
}>;

const norm = (h: number): number => ((h % 360) + 360) % 360;

/**
 * `art(h, k)` эталона. «light» — тема «Сумерки» (ink), «dark» — «Океан» (marine). Все значения — прямо из функции эталона:
 *   ink:    glow oklch(.70 .13 h+28), градиент oklch(.53 .15 h+k) → oklch(.33 .13 h+18+k)
 *   marine: glow oklch(.56 .12 h+28), градиент oklch(.40 .11 h+k) → oklch(.20 .07 h+18+k)
 */
export function seasonArt(hue: number, shift: number, theme: SeasonTheme, darker = 0, chromaMul = 1, spread = 1): SeasonArt {
  if (theme === 'light') {
    return {
      glow: oklchToHex(0.7, 0.13, norm(hue + 28 * spread)),
      from: oklchToHex(0.53 - darker, 0.15 * chromaMul, norm(hue + shift)),
      to: oklchToHex(0.33 - darker, 0.13 * chromaMul, norm(hue + 18 * spread + shift)),
    };
  }
  return {
    glow: oklchToHex(0.56, 0.12, norm(hue + 28 * spread)),
    from: oklchToHex(0.4 - darker, 0.11 * chromaMul, norm(hue + shift)),
    to: oklchToHex(0.2 - darker / 2, 0.07 * chromaMul, norm(hue + 18 * spread + shift)),
  };
}

/** Оттенки глав урока 1 из эталона (CH[].h): глава 1…7. */
export const SEASON_CHAPTER_HUES_LESSON_1: readonly number[] = [258, 200, 304, 168, 340, 228, 282];

/**
 * Шаг сдвига оттенков глав на каждый следующий урок, градусов.
 * зачем (координатор 21.10, решение принято, владелец может поправить): эталон задаёт оттенки глав только для урока 1, а уроков в курсе 32 —
 * без сдвига все уроки выглядели бы одинаково. 37° не делит 360 нацело, поэтому оттенки соседних уроков не совпадают, а главы внутри урока остаются различимыми.
 */
export const SEASON_LESSON_HUE_STEP_DEG = 37;

/** Оттенок главы: для урока 1 — таблица эталона; для остальных — та же таблица, сдвинутая на SEASON_LESSON_HUE_STEP_DEG за урок. */
export function seasonChapterHue(lessonOrdinal: number, chapterOrdinal: number): number {
  const base = SEASON_CHAPTER_HUES_LESSON_1[(Math.max(1, chapterOrdinal) - 1) % SEASON_CHAPTER_HUES_LESSON_1.length];
  return norm(base + (Math.max(1, lessonOrdinal) - 1) * SEASON_LESSON_HUE_STEP_DEG);
}

/** Сдвиг оттенка карты внутри главы: `(эпизод % 8) * 4` эталона — соседние карты чуть различаются. */
export function seasonCardShift(sessionOrdinal: number): number {
  return (sessionOrdinal % 8) * 4;
}

const cache = new Map<string, SeasonArt>();
/** Мемо по (оттенок, сдвиг, тема): перерасчёт OKLCH на каждый кадр не нужен. */
export function seasonArtCached(hue: number, shift: number, theme: SeasonTheme): SeasonArt {
  const key = `${hue}:${shift}:${theme}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const next = seasonArt(hue, shift, theme);
  cache.set(key, next);
  return next;
}

// зачем (закон владельца 22.10: «ЦВЕТА СТРОГО ОТТЕНКИ ТЕКУЩЕЙ ТЕМЫ»; координатор: «сдвиг тона НЕ делай, hue = hue темы»): оттенок ВСЕГДА равен оттенку акцента выбранной темы.
// Главы и эпизоды различаются только светлотой (темнее — белый текст держит контраст) и насыщенностью внутри палитры этой темы. Карта экзамена — самый тёмный оттенок темы.
// Общая функция для всех экранов урока (в том числе нового экрана по новым макетам): seasonThemedArt(hexHue(g.accent), глава, эпизод, тема).
const CHAPTER_CHROMA_MUL: readonly number[] = [1, 0.88, 0.76, 1, 0.88, 0.76, 1];
/**
 * Шаги эпизода (светлота «темнее на», насыщенность ×): соседние карточки заметно различаются (шаг светлоты ≥ 0,05 между соседними номерами, насыщенность тоже чередуется),
 * оттенок один — тема. Светлота только падает → белый текст держит ≥ 4,5. Период 6 эпизодов, номер берётся по модулю — детерминированно.
 * зачем (владелец 22.10: «КАРТОЧКИ ДОЛЖНЫ БЫТЬ РАЗНЫХ ОТТЕНКОВ ТЕМЫ»): раньше шаг по эпизоду был 0,004 — карточки сливались.
 */
export const SEASON_EPISODE_STEPS: readonly Readonly<{ darker: number; chroma: number }>[] = [
  { darker: 0, chroma: 1 }, { darker: 0.05, chroma: 0.82 }, { darker: 0.1, chroma: 1 },
  { darker: 0.03, chroma: 0.68 }, { darker: 0.08, chroma: 0.92 }, { darker: 0.13, chroma: 0.76 },
];
const themedCache = new Map<string, SeasonArt>();
/**
 * Цвета карточки эпизода/обложки/экзамена: оттенок = оттенок темы (themeHue = hexHue(g.accent)), глава и номер эпизода задают светлоту и насыщенность.
 * Пример: `seasonThemedArt(hexHue(g.accent), card.chapterOrdinal, card.sessionOrdinal, g.isLight ? 'light' : 'dark')` → { from, to, glow } для LinearGradient.
 */
export function seasonThemedArt(themeHue: number, chapterOrdinal: number, sessionOrdinal: number, theme: SeasonTheme, exam = false): SeasonArt {
  const chapter = Math.max(1, chapterOrdinal) - 1;
  const step = SEASON_EPISODE_STEPS[Math.abs(Math.round(sessionOrdinal)) % SEASON_EPISODE_STEPS.length]!;
  const key = `${Math.round(themeHue)}:${chapter}:${exam ? 'x' : Math.abs(Math.round(sessionOrdinal)) % SEASON_EPISODE_STEPS.length}:${theme}`;
  const hit = themedCache.get(key);
  if (hit) return hit;
  const darker = exam ? 0.12 : 0.01 * (chapter % 3) + step.darker;
  const chroma = exam ? 0.8 : CHAPTER_CHROMA_MUL[chapter % CHAPTER_CHROMA_MUL.length]! * step.chroma;
  const next = seasonArt(norm(themeHue), 0, theme, darker, chroma, 0); // spread 0: и конец градиента, и свет — тот же оттенок темы
  themedCache.set(key, next);
  return next;
}
