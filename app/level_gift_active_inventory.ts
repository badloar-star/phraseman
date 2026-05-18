import AsyncStorage from '@react-native-async-storage/async-storage';
import { triLang, type Lang } from '../constants/i18n';
import type { LevelGiftRewardIconId } from '../constants/levelGiftRewardIcons';

export interface ActiveLevelGiftInventoryItem {
  key: string;
  iconGiftId: LevelGiftRewardIconId;
  title: string;
  desc: string;
  accent: string;
}

interface GiftXpBankStorage {
  remaining?: number;
  grantedTotal?: number;
}

interface GiftMultiplierStorage {
  multiplier?: number;
  expiresAt?: number;
}

interface BonusEnergyStorage {
  amount?: number;
  expiresAt?: number;
}

interface PackTrialStorage {
  packId?: string;
  expiresAt?: number;
}

interface ArenaGiftBonusStorage {
  date?: string;
  extra?: number;
}

interface ChainShieldStorage {
  daysLeft?: number;
  grantedAt?: string;
}

const GIFT_XP_BANK_KEY = 'gift_xp_bank_v1';
const GIFT_MULTIPLIER_KEY = 'gift_xp_multiplier';
const BONUS_ENERGY_KEY = 'energy_gift_bonus';
const PACK_TRIAL_KEY = 'flashcard_pack_trial_gift_v1';
const ARENA_GIFT_BONUS_KEY = 'arena_daily_gift_bonus_v1';
const CHAIN_SHIELD_KEY = 'chain_shield';
const WAGER_DISCOUNT_KEY = 'wager_discount';
const CLUB_GIFT_BOOST_KEY = 'club_gift_free_boost_v1';

const todayIso = (nowMs: number): string => new Date(nowMs).toISOString().slice(0, 10);
const bonusHintsKey = (nowMs: number): string => `bonus_hints_${todayIso(nowMs)}`;

const parseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const formatMsLeft = (ms: number, lang: Lang): string => {
  const safe = Math.max(0, ms);
  const h = Math.floor(safe / 3600000);
  const m = Math.floor((safe % 3600000) / 60000);
  if (lang === 'ru' || lang === 'uk') return h > 0 ? `${h}ч ${String(m).padStart(2, '0')}м` : `${m}м`;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

const formatPackHoursLeft = (expiresAt: number, nowMs: number, lang: Lang): string => {
  const hours = Math.max(0, Math.ceil((expiresAt - nowMs) / 3600000));
  return triLang(lang, {
    ru: `${hours} ч доступа`,
    uk: `${hours} год доступу`,
    es: `${hours} h de acceso`,
    'pt-BR': `${hours} h de acesso`,
    vi: `${hours} giờ truy cập`,
    id: `${hours} jam akses`,
    tr: `${hours} saat erişim`,
    pl: `${hours} godz. dostępu`,
  });
};

const parsePositiveInt = (value: unknown): number => Math.max(0, Math.floor(Number(value) || 0));

const xpBankRewardIconForTotal = (grantedTotal: number): LevelGiftRewardIconId => {
  if (grantedTotal >= 1000) return 'premium_xp_bank_1000';
  if (grantedTotal >= 600) return 'xp_bank_600';
  if (grantedTotal >= 300) return 'xp_bank_300';
  return 'xp_bank_150';
};

const focusRewardIconForMultiplier = (multiplier: number): LevelGiftRewardIconId => {
  if (multiplier >= 2) return 'xp_2x_24h';
  if (multiplier >= 1.5) return 'focus_15m_50';
  return 'focus_10m_25';
};

const energyRewardIconForAmount = (amount: number): LevelGiftRewardIconId => {
  if (amount >= 3) return 'energy_plus3';
  if (amount >= 2) return 'energy_plus2';
  return 'energy_plus1';
};

export const loadActiveLevelGiftInventory = async (
  lang: Lang,
  nowMs: number = Date.now(),
): Promise<ActiveLevelGiftInventoryItem[]> => {
  const [
    xpBankRaw,
    giftMultiplierRaw,
    bonusEnergyRaw,
    packTrialRaw,
    arenaBonusRaw,
    hintsRaw,
    chainShieldRaw,
    wagerDiscountRaw,
    clubGiftBoost,
  ] = await Promise.all([
    AsyncStorage.getItem(GIFT_XP_BANK_KEY),
    AsyncStorage.getItem(GIFT_MULTIPLIER_KEY),
    AsyncStorage.getItem(BONUS_ENERGY_KEY),
    AsyncStorage.getItem(PACK_TRIAL_KEY),
    AsyncStorage.getItem(ARENA_GIFT_BONUS_KEY),
    AsyncStorage.getItem(bonusHintsKey(nowMs)),
    AsyncStorage.getItem(CHAIN_SHIELD_KEY),
    AsyncStorage.getItem(WAGER_DISCOUNT_KEY),
    AsyncStorage.getItem(CLUB_GIFT_BOOST_KEY),
  ]);

  const active: ActiveLevelGiftInventoryItem[] = [];
  const xpBank = parseJson<GiftXpBankStorage>(xpBankRaw);
  const xpRemaining = parsePositiveInt(xpBank?.remaining);
  if (xpRemaining > 0) {
    active.push({
      key: 'xp_bank',
      iconGiftId: xpBankRewardIconForTotal(parsePositiveInt(xpBank?.grantedTotal) || xpRemaining),
      title: triLang(lang, { ru: 'Бонус ×2', uk: 'Бонус ×2', es: 'Bono ×2',
    'pt-BR': 'Bônus ×2',
    vi: 'Bonus ×2',
    id: 'Bonus ×2',
    tr: 'Bonus ×2',
    pl: 'Bonus ×2',
  }),
      desc: triLang(lang, {
        ru: `ещё на ${xpRemaining} XP`,
        uk: `ще на ${xpRemaining} XP`,
        es: `por ${xpRemaining} XP más`,
    'pt-BR': `por mais ${xpRemaining} XP`,
    vi: `thêm ${xpRemaining} XP`,
    id: `untuk ${xpRemaining} XP lagi`,
    tr: `${xpRemaining} XP daha`,
    pl: `jeszcze na ${xpRemaining} XP`,
  }),
      accent: '#FACC15',
    });
  }

  const giftMultiplier = parseJson<GiftMultiplierStorage>(giftMultiplierRaw);
  const multiplierMs = Math.max(0, Number(giftMultiplier?.expiresAt || 0) - nowMs);
  const multiplier = Math.max(1, Number(giftMultiplier?.multiplier || 1));
  if (multiplierMs > 0 && multiplier > 1) {
    active.push({
      key: 'gift_focus',
      iconGiftId: focusRewardIconForMultiplier(multiplier),
      title: triLang(lang, { ru: 'Фокус', uk: 'Фокус', es: 'Foco',
    'pt-BR': 'Foco',
    vi: 'Tập trung',
    id: 'Fokus',
    tr: 'Odak',
    pl: 'Fokus',
  }),
      desc: `×${multiplier.toFixed(multiplier % 1 === 0 ? 0 : 2)} · ${formatMsLeft(multiplierMs, lang)}`,
      accent: '#60A5FA',
    });
  }

  const bonusEnergy = parseJson<BonusEnergyStorage>(bonusEnergyRaw);
  const bonusEnergyAmount = parsePositiveInt(bonusEnergy?.amount);
  if (bonusEnergyAmount > 0 && Number(bonusEnergy?.expiresAt || 0) > nowMs) {
    active.push({
      key: 'bonus_energy',
      iconGiftId: energyRewardIconForAmount(bonusEnergyAmount),
      title: triLang(lang, { ru: 'Энергия', uk: 'Енергія', es: 'Energía',
    'pt-BR': 'Energia',
    vi: 'Năng lượng',
    id: 'Energi',
    tr: 'Enerji',
    pl: 'Energia',
  }),
      desc: triLang(lang, {
        ru: `+${bonusEnergyAmount} до полуночи`,
        uk: `+${bonusEnergyAmount} до опівночі`,
        es: `+${bonusEnergyAmount} hasta medianoche`,
    'pt-BR': `+${bonusEnergyAmount} até meia-noite`,
    vi: `+${bonusEnergyAmount} đến nửa đêm`,
    id: `+${bonusEnergyAmount} sampai tengah malam`,
    tr: `Gece yarısına kadar +${bonusEnergyAmount}`,
    pl: `+${bonusEnergyAmount} do północy`,
  }),
      accent: '#34D399',
    });
  }

  const packTrial = parseJson<PackTrialStorage>(packTrialRaw);
  if (packTrial?.packId && Number(packTrial.expiresAt || 0) > nowMs) {
    active.push({
      key: 'pack_trial',
      iconGiftId: 'pack_voucher_48h',
      title: triLang(lang, { ru: 'Ваучер набора', uk: 'Ваучер набору', es: 'Vale de pack',
    'pt-BR': 'Vale de pacote',
    vi: 'Phiếu gói',
    id: 'Voucher paket',
    tr: 'Paket kuponu',
    pl: 'Voucher pakietu',
  }),
      desc: formatPackHoursLeft(Number(packTrial.expiresAt), nowMs, lang),
      accent: '#A78BFA',
    });
  }

  const arenaBonus = parseJson<ArenaGiftBonusStorage>(arenaBonusRaw);
  const arenaExtra = arenaBonus?.date === todayIso(nowMs) ? parsePositiveInt(arenaBonus.extra) : 0;
  if (arenaExtra > 0) {
    active.push({
      key: 'arena_extra',
      iconGiftId: 'arena_extra_5',
      title: triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena',
    'pt-BR': 'Arena',
    vi: 'Arena',
    id: 'Arena',
    tr: 'Arena',
    pl: 'Arena',
  }),
      desc: triLang(lang, {
        ru: `+${arenaExtra} матчей сегодня`,
        uk: `+${arenaExtra} матчів сьогодні`,
        es: `+${arenaExtra} duelos hoy`,
    'pt-BR': `+${arenaExtra} duelos hoje`,
    vi: `+${arenaExtra} trận hôm nay`,
    id: `+${arenaExtra} duel hari ini`,
    tr: `Bugün +${arenaExtra} düello`,
    pl: `+${arenaExtra} pojedynków dziś`,
  }),
      accent: '#FB923C',
    });
  }

  const hintsToday = parsePositiveInt(hintsRaw);
  if (hintsToday > 0) {
    active.push({
      key: 'hints',
      iconGiftId: hintsToday >= 3 ? 'hint_3' : 'hint_1',
      title: triLang(lang, { ru: 'Подсказки', uk: 'Підказки', es: 'Pistas',
    'pt-BR': 'Dicas',
    vi: 'Gợi ý',
    id: 'Petunjuk',
    tr: 'İpuçları',
    pl: 'Podpowiedzi',
  }),
      desc: triLang(lang, {
        ru: `${hintsToday} на сегодня`,
        uk: `${hintsToday} на сьогодні`,
        es: `${hintsToday} para hoy`,
    'pt-BR': `${hintsToday} para hoje`,
    vi: `${hintsToday} cho hôm nay`,
    id: `${hintsToday} untuk hari ini`,
    tr: `Bugün için ${hintsToday}`,
    pl: `${hintsToday} na dziś`,
  }),
      accent: '#FDE047',
    });
  }

  const chainShield = parseJson<ChainShieldStorage>(chainShieldRaw);
  const totalShieldDays = parsePositiveInt(chainShield?.daysLeft);
  const grantedAt = chainShield?.grantedAt ? new Date(chainShield.grantedAt) : null;
  const daysPassed = grantedAt ? Math.floor((nowMs - grantedAt.getTime()) / 86400000) : 0;
  const remainingShieldDays = Math.max(0, totalShieldDays - daysPassed);
  if (remainingShieldDays > 0) {
    active.push({
      key: 'chain_shield',
      iconGiftId: remainingShieldDays >= 3 ? 'chain_shield_3' : 'chain_shield_1',
      title: triLang(lang, { ru: 'Защита цепочки', uk: 'Захист ланцюжка', es: 'Protección de racha',
    'pt-BR': 'Proteção de sequência',
    vi: 'Bảo vệ chuỗi',
    id: 'Perlindungan rentetan',
    tr: 'Seri koruması',
    pl: 'Ochrona serii',
  }),
      desc: triLang(lang, {
        ru: `${remainingShieldDays} дн.`,
        uk: `${remainingShieldDays} дн.`,
        es: `${remainingShieldDays} d`,
    'pt-BR': `${remainingShieldDays} d`,
    vi: `${remainingShieldDays} ngày`,
    id: `${remainingShieldDays} hari`,
    tr: `${remainingShieldDays} gün`,
    pl: `${remainingShieldDays} dni`,
  }),
      accent: '#38BDF8',
    });
  }

  const wagerDiscount = Math.max(0, Number(wagerDiscountRaw) || 0);
  if (wagerDiscount > 0) {
    active.push({
      key: 'wager_discount',
      iconGiftId: 'wager_discount_25',
      title: triLang(lang, { ru: 'Скидка на пари', uk: 'Знижка на парі', es: 'Descuento apuesta',
    'pt-BR': 'Desconto na aposta',
    vi: 'Giảm cược',
    id: 'Diskon taruhan',
    tr: 'Bahis indirimi',
    pl: 'Zniżka na zakład',
  }),
      desc: `-${Math.round(wagerDiscount * 100)}%`,
      accent: '#F472B6',
    });
  }

  if (clubGiftBoost === '1') {
    active.push({
      key: 'club_boost',
      iconGiftId: 'club_boost_free',
      title: triLang(lang, { ru: 'Буст клуба', uk: 'Буст клубу', es: 'Impulso de liga',
    'pt-BR': 'Boost do clube',
    vi: 'Tăng lực câu lạc bộ',
    id: 'Boost klub',
    tr: 'Kulüp boostu',
    pl: 'Boost klubu',
  }),
      desc: triLang(lang, {
        ru: '1 бесплатная активация',
        uk: '1 безкоштовна активація',
        es: '1 activación gratis',
    'pt-BR': '1 ativação grátis',
    vi: '1 lần kích hoạt miễn phí',
    id: '1 aktivasi gratis',
    tr: '1 ücretsiz etkinleştirme',
    pl: '1 darmowa aktywacja',
  }),
      accent: '#2DD4BF',
    });
  }

  return active;
};
