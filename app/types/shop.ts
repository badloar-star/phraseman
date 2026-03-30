// ════════════════════════════════════════════════════════════════════════════
// shop.ts — Интерфейсы для магазина фразменов
// ════════════════════════════════════════════════════════════════════════════

export type ShopItemCategory = 'energy' | 'booster' | 'cosmetic' | 'premium';

export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  titleRU: string;
  titleUK: string;
  descriptionRU: string;
  descriptionUK: string;
  icon: string;
  price: number; // Цена в фразменах
  effect?: {
    type: 'energy' | 'xp_multiplier' | 'unlock';
    value: number;
    duration?: number; // в миллисекундах для временных эффектов
  };
}

// Предопределённые товары в магазине
export const SHOP_ITEMS: ShopItem[] = [
  // ── Энергия ────────────────────────────────────────────────────────────────
  {
    id: 'energy_small',
    category: 'energy',
    titleRU: 'Малая энергия',
    titleUK: 'Мала енергія',
    descriptionRU: '+5 энергии',
    descriptionUK: '+5 енергії',
    icon: '⚡',
    price: 10,
    effect: { type: 'energy', value: 5 },
  },
  {
    id: 'energy_medium',
    category: 'energy',
    titleRU: 'Средняя энергия',
    titleUK: 'Середня енергія',
    descriptionRU: '+15 энергии',
    descriptionUK: '+15 енергії',
    icon: '⚡⚡',
    price: 25,
    effect: { type: 'energy', value: 15 },
  },
  {
    id: 'energy_large',
    category: 'energy',
    titleRU: 'Большая энергия',
    titleUK: 'Велика енергія',
    descriptionRU: '+30 энергии',
    descriptionUK: '+30 енергії',
    icon: '⚡⚡⚡',
    price: 50,
    effect: { type: 'energy', value: 30 },
  },

  // ── Бустеры XP ────────────────────────────────────────────────────────────
  {
    id: 'xp_booster_short',
    category: 'booster',
    titleRU: 'Бустер x2 XP (30 мин)',
    titleUK: 'Бустер x2 XP (30 хв)',
    descriptionRU: '+100% XP на 30 минут',
    descriptionUK: '+100% XP на 30 хвилин',
    icon: '🚀',
    price: 15,
    effect: { type: 'xp_multiplier', value: 2, duration: 30 * 60 * 1000 },
  },
  {
    id: 'xp_booster_medium',
    category: 'booster',
    titleRU: 'Бустер x2 XP (1 час)',
    titleUK: 'Бустер x2 XP (1 година)',
    descriptionRU: '+100% XP на 1 час',
    descriptionUK: '+100% XP на 1 годину',
    icon: '🚀🚀',
    price: 25,
    effect: { type: 'xp_multiplier', value: 2, duration: 60 * 60 * 1000 },
  },
  {
    id: 'xp_booster_long',
    category: 'booster',
    titleRU: 'Бустер x2 XP (1 день)',
    titleUK: 'Бустер x2 XP (1 день)',
    descriptionRU: '+100% XP на 24 часа',
    descriptionUK: '+100% XP на 24 години',
    icon: '🚀🚀🚀',
    price: 50,
    effect: { type: 'xp_multiplier', value: 2, duration: 24 * 60 * 60 * 1000 },
  },

  // ── Косметические предметы (рамки профиля) ────────────────────────────────
  {
    id: 'frame_gold',
    category: 'cosmetic',
    titleRU: 'Золотая рамка профиля',
    titleUK: 'Золота рамка профілю',
    descriptionRU: 'Украсьте свой профиль золотой рамкой',
    descriptionUK: 'Прикрасьте свій профіль золотою рамкою',
    icon: '🟨',
    price: 50,
    effect: { type: 'unlock', value: 1 },
  },
  {
    id: 'frame_diamond',
    category: 'cosmetic',
    titleRU: 'Алмазная рамка профиля',
    titleUK: 'Діамантова рамка профілю',
    descriptionRU: 'Украсьте свой профиль алмазной рамкой',
    descriptionUK: 'Прикрасьте свій профіль діамантовою рамкою',
    icon: '💎',
    price: 100,
    effect: { type: 'unlock', value: 1 },
  },
  {
    id: 'frame_platinum',
    category: 'cosmetic',
    titleRU: 'Платиновая рамка профиля',
    titleUK: 'Платинова рамка профілю',
    descriptionRU: 'Украсьте свой профиль платиновой рамкой',
    descriptionUK: 'Прикрасьте свій профіль платиновою рамкою',
    icon: '✨',
    price: 150,
    effect: { type: 'unlock', value: 1 },
  },

  // ── Премиум подписка ───────────────────────────────────────────────────────
  {
    id: 'premium_monthly',
    category: 'premium',
    titleRU: 'Премиум на 30 дней',
    titleUK: 'Преміум на 30 днів',
    descriptionRU: 'Премиум преимущества на месяц',
    descriptionUK: 'Преміум переваги на місяць',
    icon: '👑',
    price: 99,
    effect: { type: 'unlock', value: 1, duration: 30 * 24 * 60 * 60 * 1000 },
  },
];

export const getShopItemById = (id: string): ShopItem | undefined => {
  return SHOP_ITEMS.find(item => item.id === id);
};

export const getShopItemsByCategory = (category: ShopItemCategory): ShopItem[] => {
  return SHOP_ITEMS.filter(item => item.category === category);
};
