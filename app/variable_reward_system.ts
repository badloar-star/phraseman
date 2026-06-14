/**
 * Variable Reward System — XP-бонус с вероятностными тиерами поверх базовой награды.
 *
 * Используется как «бонус-сундук» в конце урока (lesson_complete) и квиза (quizzes):
 * к базовому XP добавляется случайный бонус. Раньше бонус в 82% случаев был 0 —
 * это воспринималось как «ничего не дали». Теперь гарантирован небольшой минимум,
 * а крупные тиеры остаются редкими (переменная награда → дофамин без «пустых» открытий).
 *
 * Тиеры (на 100):
 *  - 60%: small   → +1–5
 *  - 27%: (нет крупного) → +1–3 (базовый минимум, чтобы не было нуля)
 *  - 10%: medium  → +10–20
 *  -  3%: large   → +20–30
 * Минимум всегда ≥ 1 (никаких «0 XP» в анимации сундука).
 */

export interface XPRewardResult {
  baseXP: number;
  bonusXP: number;
  totalXP: number;
  hasBonusWon: boolean;
  bonusInfo?: {
    tier: 'small' | 'medium' | 'large';
    percentage: number;
    range: string;
  };
}

/**
 * Вычисляет случайный XP-бонус по вероятностным тиерам.
 * Всегда возвращает ≥ 1 — «пустых» сундуков больше нет.
 */
export function calculateRandomBonus(): number {
  const rand = Math.random() * 100;

  // 3% шанс: +20–30 (large)
  if (rand < 3) {
    return 20 + Math.floor(Math.random() * 11); // 20–30 включительно
  }

  // 10% шанс: +10–20 (medium)
  if (rand < 13) {
    return 10 + Math.floor(Math.random() * 11); // 10–20 включительно
  }

  // 27% шанс: +1–3 (базовый минимум вместо прежнего нуля)
  if (rand < 40) {
    return 1 + Math.floor(Math.random() * 3); // 1–3 включительно
  }

  // 60% шанс: +1–5 (small)
  return 1 + Math.floor(Math.random() * 5); // 1–5 включительно
}

/**
 * Информация о тиере бонуса для отображения.
 */
function getBonusTierInfo(bonusXP: number): XPRewardResult['bonusInfo'] {
  if (bonusXP === 0) return undefined;

  if (bonusXP <= 5) {
    return {
      tier: 'small',
      percentage: 87, // small + базовый минимум
      range: '1-5',
    };
  }

  if (bonusXP <= 20) {
    return {
      tier: 'medium',
      percentage: 10,
      range: '10-20',
    };
  }

  return {
    tier: 'large',
    percentage: 3,
    range: '20-30',
  };
}

/**
 * Основная функция расчёта XP с переменной наградой.
 * Вызывается после завершения урока/квиза.
 */
export function calculateRewardWithBonus(baseXP: number): XPRewardResult {
  const bonusXP = calculateRandomBonus();
  const totalXP = baseXP + bonusXP;
  const hasBonusWon = bonusXP > 0;

  return {
    baseXP,
    bonusXP,
    totalXP,
    hasBonusWon,
    bonusInfo: getBonusTierInfo(bonusXP),
  };
}

/**
 * Текстовый тиер для UI-уведомлений и аналитики.
 */
export function getTierLabel(
  bonusXP: number,
): 'small' | 'medium' | 'large' | 'none' {
  if (bonusXP === 0) return 'none';
  if (bonusXP <= 5) return 'small';
  if (bonusXP <= 20) return 'medium';
  return 'large';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
