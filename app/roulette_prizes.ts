/**
 * Призы рулетки Plus для RN-клиента: метаданные + картинки (require из assets).
 *
 * Веса — дефолтные (remote_config/app.numbers.referral_spin_weights может
 * отличаться; точные шансы показывает сервер — клиентский блок «Что можно
 * выиграть» отображает дефолт, TODO: подтянуть live-веса, когда появится
 * публичный getter конфига). Порядок и days СТРОГО совпадают с
 * functions/src/referral_spin_logic.ts (REFERRAL_SPIN_PRIZE_DAYS).
 *
 * Перенос картинок: assets/roulette/card-*.jpg → в проект в assets/roulette/
 * (см. PATCHES.md S9).
 */

export interface RoulettePrize {
  /** Индекс = prizeIndex в ответе referralSpin. */
  index: number;
  /** Дней VIP. */
  days: number;
  /** Крупная цифра на карточке. */
  num: string;
  /** Подпись на карточке. */
  unit: string;
  /** Читаемый приз («1 день»). */
  label: string;
  /** Дефолтный вес, %. */
  weight: number;
  /** Картинка карточки. */
  image: number; // require() asset id
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const ROULETTE_PRIZES: readonly RoulettePrize[] = [
  { index: 0, days: 1, num: '1', unit: 'день', label: '1 день', weight: 55, image: require('../assets/roulette/card-1d.jpg') },
  { index: 1, days: 7, num: '7', unit: 'дней', label: '7 дней', weight: 30, image: require('../assets/roulette/card-7d.jpg') },
  { index: 2, days: 30, num: '1', unit: 'месяц', label: '1 месяц', weight: 11.5, image: require('../assets/roulette/card-1m.jpg') },
  { index: 3, days: 90, num: '3', unit: 'месяца', label: '3 месяца', weight: 2.9, image: require('../assets/roulette/card-3m.jpg') },
  { index: 4, days: 180, num: '6', unit: 'месяцев', label: '6 месяцев', weight: 0.55, image: require('../assets/roulette/card-6m.jpg') },
  { index: 5, days: 365, num: '1', unit: 'год', label: '1 год', weight: 0.05, image: require('../assets/roulette/card-1y.jpg') },
];

/** Фиксированный «перемешанный» порядок одного цикла ленты (seeded, стабилен между запусками). */
export const TAPE_CYCLE: readonly number[] = [3, 0, 4, 1, 5, 2];

/** POSITION_OF_PRIZE[prizeIndex] = позиция приза внутри цикла ленты. */
export const POSITION_OF_PRIZE: readonly number[] = (() => {
  const pos = new Array<number>(ROULETTE_PRIZES.length).fill(0);
  TAPE_CYCLE.forEach((prizeIdx, posInCycle) => {
    pos[prizeIdx] = posInCycle;
  });
  return pos;
})();

/* expo-router route shim */
export default function __RouteShim() { return null; }
