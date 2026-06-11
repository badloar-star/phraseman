// ─── «ЧЁРНОЕ КИНО» ───────────────────────────────────────────────────────────
// Семейство из 4 тем: чистый чёрный + кинематографичный двухцветный блум снизу
// (белое ядро → bloomA → bloomB ореолом) + звёздная пыль. Референс: tools/
// docs/design/black_cinema_themes_2026-06-10.html (макеты, утверждены 2026-06-11).
//
// Один движок — четыре спектра:
//   midnight — белый → электрик-синий → фиолетовый (флагман, референс юзера)
//   ember    — белый → янтарь → малиновый (закат)
//   aurora   — белый → мята → лазурь (северное сияние)
//   volt     — белый → лайм → изумруд (кислота, наследник «Неона»)

export type CinemaMode = 'midnight' | 'ember' | 'aurora' | 'volt';

export const CINEMA_MODES: readonly CinemaMode[] = ['midnight', 'ember', 'aurora', 'volt'] as const;

export function isCinemaMode(mode: string): mode is CinemaMode {
  return (CINEMA_MODES as readonly string[]).includes(mode);
}

/** rgba(...) из 6-значного hex; для производных подсветок/ободков. */
export function cinemaAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export type CinemaQuizLevel = { gradA: string; gradB: string; accent: string };

export type CinemaPalette = {
  /** Основной акцент (CTA, активные элементы). Всегда чистый hex — код делает `${accent}18`. */
  accent: string;
  /** Вторичный голос (textSecond): подписи-фразы, иконки второго плана. */
  second: string;
  /** Тёмный текст на залитых акцентом поверхностях. */
  onAccent: string;
  /** Градиент главной кнопки: светлый → акцент → глубокий. */
  cta: [string, string, string];
  /** Главный цвет блума (ближе к ядру). */
  bloomA: string;
  /** Цвет внешнего ореола блума. */
  bloomB: string;
  correct: string;
  onCorrect: string;
  wrong: string;
  gold: string;
  onGold: string;
  /** Непрозрачные поверхности (чёрный + 4–8% света с подтоном спектра). */
  card: string;
  surface: string;
  surface2: string;
  borderLight: string;
  textMuted: string;
  textGhost: string;
  btnShadow: string;
  cardGradient: [string, string];
  /** Вертикальный градиент фона экрана (блум добавляется поверх отдельным слоем). */
  bgGradient3: [string, string, string];
  quiz: { easy: CinemaQuizLevel; medium: CinemaQuizLevel; hard: CinemaQuizLevel };
};

export const CINEMA: Record<CinemaMode, CinemaPalette> = {
  midnight: {
    accent: '#8FA0FF', second: '#B79CFF', onAccent: '#0D1030',
    cta: ['#C9D2FF', '#8FA0FF', '#6E7FF5'],
    bloomA: '#5B7CFF', bloomB: '#A95BFF',
    correct: '#5FE0B0', onCorrect: '#062619', wrong: '#FF6E8A',
    gold: '#FFD27A', onGold: '#1F1604',
    card: '#13151F', surface: '#181B29', surface2: '#1E2233', borderLight: '#232639',
    textMuted: '#A9AECB', textGhost: '#6E7390', btnShadow: '#39448F',
    cardGradient: ['#1A1D2C', '#0D0E16'],
    bgGradient3: ['#0B0D18', '#050609', '#010102'],
    quiz: {
      easy: { gradA: '#08221A', gradB: '#020D0A', accent: '#5FE0B0' },
      medium: { gradA: '#0E1430', gradB: '#040714', accent: '#8FA0FF' },
      hard: { gradA: '#1C0E30', gradB: '#0A0414', accent: '#B070FF' },
    },
  },
  ember: {
    accent: '#FFA245', second: '#FFC894', onAccent: '#2A1502',
    cta: ['#FFD9A8', '#FFA245', '#F5801E'],
    bloomA: '#FF8A2A', bloomB: '#FF3D6E',
    correct: '#5FE8A8', onCorrect: '#06281A', wrong: '#FF5C6E',
    gold: '#FFCB5C', onGold: '#241302',
    card: '#1A1410', surface: '#211A14', surface2: '#2A211A', borderLight: '#2E241B',
    textMuted: '#C9B4A4', textGhost: '#8A7464', btnShadow: '#9A4E0E',
    cardGradient: ['#231A12', '#0F0B07'],
    bgGradient3: ['#140C08', '#0A0604', '#010101'],
    quiz: {
      easy: { gradA: '#082218', gradB: '#020D09', accent: '#5FE8A8' },
      medium: { gradA: '#2A1606', gradB: '#100802', accent: '#FFA245' },
      hard: { gradA: '#2A0814', gradB: '#10030A', accent: '#FF4D6E' },
    },
  },
  aurora: {
    accent: '#3DE8A6', second: '#9FF2D4', onAccent: '#052A1C',
    cta: ['#9FF2CF', '#3DE8A6', '#1FC487'],
    bloomA: '#2EE6A0', bloomB: '#2E9DFF',
    correct: '#3DE8A6', onCorrect: '#052A1C', wrong: '#FF6470',
    gold: '#F2D27A', onGold: '#221A04',
    card: '#0F1915', surface: '#142019', surface2: '#1A2821', borderLight: '#1F2E26',
    textMuted: '#A7C0B5', textGhost: '#6F837A', btnShadow: '#0E7A57',
    cardGradient: ['#15211B', '#090F0C'],
    bgGradient3: ['#081310', '#040A08', '#010201'],
    quiz: {
      easy: { gradA: '#08241B', gradB: '#02100B', accent: '#3DE8A6' },
      medium: { gradA: '#08182B', gradB: '#020A12', accent: '#3FA9FF' },
      hard: { gradA: '#260C10', gradB: '#100406', accent: '#FF6470' },
    },
  },
  volt: {
    accent: '#D6FF3D', second: '#EAFF8C', onAccent: '#1A2002',
    cta: ['#EFFF9E', '#D6FF3D', '#A8D414'],
    bloomA: '#B8F222', bloomB: '#2EE08C',
    correct: '#4FE8AC', onCorrect: '#06281A', wrong: '#FF5C5C',
    gold: '#FFE85C', onGold: '#221C02',
    card: '#15170C', surface: '#1B1E10', surface2: '#232714', borderLight: '#282C16',
    textMuted: '#BFC6A3', textGhost: '#7E8563', btnShadow: '#5F7A0A',
    cardGradient: ['#1C2010', '#0C0E06'],
    bgGradient3: ['#0F1207', '#070A04', '#010200'],
    quiz: {
      easy: { gradA: '#08241B', gradB: '#02100B', accent: '#4FE8AC' },
      medium: { gradA: '#1C2406', gradB: '#0B0F02', accent: '#D6FF3D' },
      hard: { gradA: '#2A1606', gradB: '#100802', accent: '#FF8A3D' },
    },
  },
};

/** Звёздная пыль (доли ширины/высоты, радиус, прозрачность) — верхние ⅔ экрана. */
export const CINEMA_STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.12, 0.10, 1.2, 0.7], [0.27, 0.06, 0.9, 0.4], [0.44, 0.09, 1.2, 0.55], [0.63, 0.05, 0.9, 0.35],
  [0.79, 0.10, 1.5, 0.8], [0.89, 0.17, 0.9, 0.4], [0.16, 0.19, 0.9, 0.5], [0.70, 0.22, 1.2, 0.6],
  [0.36, 0.15, 0.9, 0.35], [0.55, 0.20, 0.9, 0.45], [0.08, 0.28, 1.2, 0.5], [0.92, 0.29, 0.9, 0.35],
  [0.48, 0.27, 0.9, 0.4], [0.24, 0.33, 1.2, 0.45], [0.82, 0.36, 0.9, 0.3], [0.60, 0.32, 0.9, 0.3],
];

/** Тень кнопок/карточек «кино»-семейства (мягче компасной, глубже дефолтной). */
export function cinemaShadow(level: 1 | 2 | 3 = 2) {
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: level === 1 ? 2 : level === 2 ? 4 : 6 },
    shadowOpacity: level === 1 ? 0.30 : level === 2 ? 0.38 : 0.46,
    shadowRadius: level === 1 ? 6 : level === 2 ? 10 : 16,
    elevation: level === 1 ? 3 : level === 2 ? 5 : 8,
  };
}
