/**
 * Призы рулетки Plus для RN-клиента: метаданные + картинки (require из assets).
 *
 * Веса — дефолтные (remote_config/app.numbers.referral_spin_weights может
 * отличаться; точные шансы показывает сервер — клиентский блок «Что можно
 * выиграть» отображает дефолт, TODO: подтянуть live-веса, когда появится
 * публичный getter конфига). Порядок и days СТРОГО совпадают с
 * functions/src/referral_spin_logic.ts (REFERRAL_SPIN_PRIZE_DAYS).
 *
 * Карточки лежат в assets/roulette/card-*.webp: отдельный премиальный предмет
 * и цвет для каждого уровня награды.
 * (см. PATCHES.md S9).
 */

import { Asset } from 'expo-asset';
import { triLang, type Lang } from '../constants/i18n';

export interface RoulettePrize {
  /** Индекс = prizeIndex в ответе referralSpin. */
  index: number;
  /** Дней VIP. */
  days: number;
  /** Крупная цифра на карточке. */
  num: string;
  /** Подпись на карточке. */
  unit: string;
  /** Читаемый приз («1 день») — ТОЛЬКО RU-легаси; в UI бери roulettePrizeLabel(). */
  label: string;
  /** Дефолтный вес, %. */
  weight: number;
  /** Картинка карточки. */
  image: number; // require() asset id
}

/**
 * зачем: владелец (2026-07-26) — названия призов в данных были только русскими;
 * канон локализованных имён живёт здесь, рядом с данными (модалка выигрыша и
 * будущие поверхности берут отсюда, а не заводят свои карты).
 * Ключ — days, зеркало REFERRAL_SPIN_PRIZE_DAYS на сервере.
 */
export function roulettePrizeLabel(days: number, lang: Lang): string {
  const L = (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  switch (days) {
    case 1: return L('1 день', '1 день', '1 día', '1 dia', '1 ngày', '1 hari', '1 gün', '1 dzień');
    case 7: return L('7 дней', '7 днів', '7 días', '7 dias', '7 ngày', '7 hari', '7 gün', '7 dni');
    case 30: return L('1 месяц', '1 місяць', '1 mes', '1 mês', '1 tháng', '1 bulan', '1 ay', '1 miesiąc');
    case 90: return L('3 месяца', '3 місяці', '3 meses', '3 meses', '3 tháng', '3 bulan', '3 ay', '3 miesiące');
    case 180: return L('6 месяцев', '6 місяців', '6 meses', '6 meses', '6 tháng', '6 bulan', '6 ay', '6 miesięcy');
    case 365: return L('1 год', '1 рік', '1 año', '1 ano', '1 năm', '1 tahun', '1 yıl', '1 rok');
    default: return `${days} ${L('дн.', 'дн.', 'd.', 'd.', 'ngày', 'hari', 'gün', 'dn.')}`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const ROULETTE_PRIZES: readonly RoulettePrize[] = [
  { index: 0, days: 1, num: '1', unit: 'день', label: '1 день', weight: 55, image: require('../assets/roulette/card-1d.webp') },
  { index: 1, days: 7, num: '7', unit: 'дней', label: '7 дней', weight: 30, image: require('../assets/roulette/card-7d.webp') },
  { index: 2, days: 30, num: '1', unit: 'месяц', label: '1 месяц', weight: 11.5, image: require('../assets/roulette/card-1m.webp') },
  { index: 3, days: 90, num: '3', unit: 'месяца', label: '3 месяца', weight: 2.9, image: require('../assets/roulette/card-3m.webp') },
  { index: 4, days: 180, num: '6', unit: 'месяцев', label: '6 месяцев', weight: 0.55, image: require('../assets/roulette/card-6m.webp') },
  { index: 5, days: 365, num: '1', unit: 'год', label: '1 год', weight: 0.05, image: require('../assets/roulette/card-1y.webp') },
];

/**
 * зачем: владелец (2026-07-26) — у Pro (lifetime) вместо дней Plus те же
 * prizeIndex дают жемчужины. Номиналы согласованы владельцем; СТРОГО зеркало
 * functions/src/referral_spin_logic.ts (REFERRAL_SPIN_PRIZE_PEARLS).
 */
export const ROULETTE_PRIZE_PEARLS: readonly number[] = [10, 25, 70, 150, 350, 800];

/** «N жемчужин» на 8 языках (для номиналов лестницы формы совпадают). */
export function roulettePearlsLabel(amount: number, lang: Lang): string {
  const unit = triLang(lang, {
    ru: 'жемчужин', uk: 'перлин', es: 'perlas', 'pt-BR': 'pérolas',
    vi: 'ngọc trai', id: 'mutiara', tr: 'inci', pl: 'pereł',
  });
  return `${Math.max(0, Math.floor(Number(amount) || 0))} ${unit}`;
}

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

/**
 * Показывать ли шансы (%/бары) в пользовательских экранах рулетки.
 * Выключено по решению владельца (шансы — только в админке);
 * включить обратно — одна строка: true. Экраны читают этот флаг.
 */
export const SHOW_SPIN_ODDS = false;

let roulettePrizePreload: Promise<void> | null = null;

/** Бounded preload всех шести статичных карточек; повторные вызовы делят один Promise. */
export async function preloadRoulettePrizeImages(): Promise<void> {
  if (!roulettePrizePreload) {
    roulettePrizePreload = Asset.loadAsync(ROULETTE_PRIZES.map((prize) => prize.image))
      .then(() => undefined)
      .catch((error) => {
        roulettePrizePreload = null;
        throw error;
      });
  }
  return roulettePrizePreload;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
