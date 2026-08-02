import AsyncStorage from '@react-native-async-storage/async-storage';
import { triLang, type Lang } from '../constants/i18n';
import type { LevelGiftRewardIconId } from '../constants/levelGiftRewardIcons';
import { flashcardsPackTrialGiftKey, lessonBonusHintsKey, type RuntimeStudyTarget } from './target_storage_keys';
import { flashcardsOfficialPacksAvailableForTarget } from './flashcards_target_gate';
import {
  friendGiftExpiresAtMs,
  loadStoredFriendGiftInventory,
  type StoredFriendGiftInventoryItem,
} from './friend_gift_inventory';
import {
  GIFT_TTL_MS,
  loadGiftFirstSeenMap,
  localMidnightAfterDaysMs,
  nextLocalMidnightMs,
  persistGiftFirstSeenMap,
  type GiftFirstSeenKind,
  type GiftFirstSeenMap,
} from './gift_expiry';

export interface ActiveLevelGiftInventoryItem {
  key: string;
  iconGiftId: LevelGiftRewardIconId;
  title: string;
  desc: string;
  accent: string;
  /**
   * Короткая подпись «что это / где применить». Для пассивных бонусов — «работает
   * автоматически», для ваучеров — куда идти, чтобы потратить.
   */
  hint?: string;
  /**
   * Маршрут перехода по тапу (только для бонусов, которые нужно применить вручную:
   * ваучер набора → витрина карточек, буст лиги → лига). Пассивные бонусы route не имеют.
   */
  actionRoute?: string;
  /**
   * Мс сгорания подарка: у бонусов со своим сроком — их срок, у остальных —
   * 72ч (см. gift_expiry.ts). UI показывает индивидуальный тикающий таймер.
   */
  expiresAtMs?: number;
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
const ARENA_GIFT_BONUS_KEY = 'arena_daily_gift_bonus_v1';
const CHAIN_SHIELD_KEY = 'chain_shield';
const WAGER_DISCOUNT_KEY = 'wager_discount';
const CLUB_GIFT_BOOST_KEY = 'club_gift_free_boost_v1';

const todayIso = (nowMs: number): string => new Date(nowMs).toISOString().slice(0, 10);

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

const friendGiftIconForGiftId = (giftId: string): LevelGiftRewardIconId => {
  if (giftId === 'arena_extra_5') return 'arena_extra_5';
  if (giftId === 'chain_shield_1') return 'chain_shield_1';
  if (giftId === 'xp_boost_2x_24h') return 'xp_2x_24h';
  return 'choice_3_level';
};

const friendGiftLabel = (gift: StoredFriendGiftInventoryItem, lang: Lang): string => {
  if (lang === 'uk' && gift.giftLabelUk) return gift.giftLabelUk;
  if (lang === 'es' && gift.giftLabelEs) return gift.giftLabelEs;
  if (lang === 'pt-BR' && gift.giftLabelPtBr) return gift.giftLabelPtBr;
  if (lang === 'vi' && gift.giftLabelVi) return gift.giftLabelVi;
  if (lang === 'id' && gift.giftLabelId) return gift.giftLabelId;
  if (lang === 'tr' && gift.giftLabelTr) return gift.giftLabelTr;
  if (lang === 'pl' && gift.giftLabelPl) return gift.giftLabelPl;
  return gift.giftLabelRu || gift.giftLabel || gift.giftId;
};

/** Подпись для пассивных бонусов: применяются сами, без действий пользователя. */
const hintAutoWorks = (lang: Lang): string => triLang(lang, {
  ru: 'Работает автоматически',
  uk: 'Працює автоматично',
  es: 'Funciona automáticamente',
  'pt-BR': 'Funciona automaticamente',
  vi: 'Tự động áp dụng',
  id: 'Berjalan otomatis',
  tr: 'Otomatik çalışır',
  pl: 'Działa automatycznie',
});

export const loadActiveLevelGiftInventory = async (
  lang: Lang,
  nowMs: number = Date.now(),
  studyTarget?: RuntimeStudyTarget,
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
    friendGifts,
    firstSeenLoaded,
  ] = await Promise.all([
    AsyncStorage.getItem(GIFT_XP_BANK_KEY),
    AsyncStorage.getItem(GIFT_MULTIPLIER_KEY),
    AsyncStorage.getItem(BONUS_ENERGY_KEY),
    AsyncStorage.getItem(flashcardsPackTrialGiftKey(studyTarget)),
    AsyncStorage.getItem(ARENA_GIFT_BONUS_KEY),
    AsyncStorage.getItem(lessonBonusHintsKey(todayIso(nowMs), studyTarget)),
    AsyncStorage.getItem(CHAIN_SHIELD_KEY),
    AsyncStorage.getItem(WAGER_DISCOUNT_KEY),
    AsyncStorage.getItem(CLUB_GIFT_BOOST_KEY),
    loadStoredFriendGiftInventory(nowMs),
    loadGiftFirstSeenMap(),
  ]);

  // зачем (2026-08-02, владелец): у банка XP, пари-скидки и буста лиги нет
  // собственного срока — им отсчитывается 72ч от первого показа здесь; по
  // истечении бонус сгорает по-настоящему (ключ удаляется), не только из списка.
  const firstSeen: GiftFirstSeenMap = { ...firstSeenLoaded };
  let firstSeenChanged = false;
  const burnKeys: string[] = [];
  const resolveFirstSeenLifetime = (
    kind: GiftFirstSeenKind,
    present: boolean,
    storageKey: string,
  ): { expiresAtMs: number; expired: boolean } | null => {
    if (!present) {
      if (firstSeen[kind] != null) {
        // Бонус потрачен/исчез — штамп снимаем, чтобы новая выдача стартовала заново.
        delete firstSeen[kind];
        firstSeenChanged = true;
      }
      return null;
    }
    let seenAt = firstSeen[kind];
    if (!seenAt) {
      seenAt = nowMs;
      firstSeen[kind] = nowMs;
      firstSeenChanged = true;
    }
    const expiresAtMs = seenAt + GIFT_TTL_MS;
    const expired = nowMs >= expiresAtMs;
    if (expired) {
      burnKeys.push(storageKey);
      delete firstSeen[kind];
      firstSeenChanged = true;
    }
    return { expiresAtMs, expired };
  };

  const active: ActiveLevelGiftInventoryItem[] = [];
  const xpBank = parseJson<GiftXpBankStorage>(xpBankRaw);
  const xpRemaining = parsePositiveInt(xpBank?.remaining);
  const xpBankLifetime = resolveFirstSeenLifetime('xp_bank', xpRemaining > 0, GIFT_XP_BANK_KEY);
  if (xpRemaining > 0 && xpBankLifetime && !xpBankLifetime.expired) {
    active.push({
      key: 'xp_bank',
      expiresAtMs: xpBankLifetime.expiresAtMs,
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
      hint: triLang(lang, {
        ru: 'Опыт удвоится сам во время обучения',
        uk: 'Досвід подвоїться сам під час навчання',
        es: 'El XP se duplica solo mientras estudias',
        'pt-BR': 'O XP dobra sozinho enquanto você estuda',
        vi: 'XP tự động nhân đôi khi bạn học',
        id: 'XP otomatis berlipat saat belajar',
        tr: 'Öğrenirken XP kendiliğinden ikiye katlanır',
        pl: 'XP podwaja się sam podczas nauki',
      }),
    });
  }

  const giftMultiplier = parseJson<GiftMultiplierStorage>(giftMultiplierRaw);
  const multiplierMs = Math.max(0, Number(giftMultiplier?.expiresAt || 0) - nowMs);
  const multiplier = Math.max(1, Number(giftMultiplier?.multiplier || 1));
  if (multiplierMs > 0 && multiplier > 1) {
    active.push({
      key: 'gift_focus',
      expiresAtMs: Number(giftMultiplier?.expiresAt || 0),
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
      hint: hintAutoWorks(lang),
    });
  }

  const bonusEnergy = parseJson<BonusEnergyStorage>(bonusEnergyRaw);
  const bonusEnergyAmount = parsePositiveInt(bonusEnergy?.amount);
  if (bonusEnergyAmount > 0 && Number(bonusEnergy?.expiresAt || 0) > nowMs) {
    active.push({
      key: 'bonus_energy',
      expiresAtMs: Number(bonusEnergy?.expiresAt || 0),
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
      hint: triLang(lang, {
        ru: 'Дополнительная энергия уже добавлена',
        uk: 'Додаткова енергія вже додана',
        es: 'La energía extra ya está añadida',
        'pt-BR': 'A energia extra já foi adicionada',
        vi: 'Năng lượng thêm đã được cộng',
        id: 'Energi tambahan sudah ditambahkan',
        tr: 'Ek enerji zaten eklendi',
        pl: 'Dodatkowa energia jest już dodana',
      }),
    });
  }

  const packTrial = parseJson<PackTrialStorage>(packTrialRaw);
  if (flashcardsOfficialPacksAvailableForTarget(studyTarget) && packTrial?.packId && Number(packTrial.expiresAt || 0) > nowMs) {
    active.push({
      key: 'pack_trial',
      expiresAtMs: Number(packTrial.expiresAt || 0),
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
      hint: triLang(lang, {
        ru: 'Заберите набор бесплатно: Карточки → Витрина',
        uk: 'Заберіть набір безкоштовно: Картки → Вітрина',
        es: 'Consigue un pack gratis: Tarjetas → Vitrina',
        'pt-BR': 'Pegue um pacote grátis: Cartões → Vitrine',
        vi: 'Nhận gói miễn phí: Thẻ → Gian hàng',
        id: 'Ambil paket gratis: Kartu → Etalase',
        tr: 'Bir paketi ücretsiz al: Kartlar → Vitrin',
        pl: 'Odbierz pakiet za darmo: Karty → Witryna',
      }),
      actionRoute: '/flashcards',
    });
  }

  const arenaBonus = parseJson<ArenaGiftBonusStorage>(arenaBonusRaw);
  const arenaExtra = arenaBonus?.date === todayIso(nowMs) ? parsePositiveInt(arenaBonus.extra) : 0;
  if (arenaExtra > 0) {
    active.push({
      key: 'arena_extra',
      expiresAtMs: nextLocalMidnightMs(nowMs),
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
      hint: triLang(lang, {
        ru: 'Лишние матчи уже доступны в Арене',
        uk: 'Додаткові матчі вже доступні в Арені',
        es: 'Los duelos extra ya están en la Arena',
        'pt-BR': 'Os duelos extras já estão na Arena',
        vi: 'Trận thêm đã có sẵn trong Đấu trường',
        id: 'Duel ekstra sudah tersedia di Arena',
        tr: 'Ekstra düellolar Arena’da hazır',
        pl: 'Dodatkowe mecze są już w Arenie',
      }),
    });
  }

  const hintsToday = parsePositiveInt(hintsRaw);
  if (hintsToday > 0) {
    active.push({
      key: 'hints',
      expiresAtMs: nextLocalMidnightMs(nowMs),
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
      hint: triLang(lang, {
        ru: 'Подсказки доступны прямо в уроке',
        uk: 'Підказки доступні прямо в уроці',
        es: 'Las pistas están disponibles en la lección',
        'pt-BR': 'As dicas estão disponíveis na lição',
        vi: 'Gợi ý có sẵn ngay trong bài học',
        id: 'Petunjuk tersedia langsung di pelajaran',
        tr: 'İpuçları derste kullanılabilir',
        pl: 'Podpowiedzi są dostępne w lekcji',
      }),
    });
  }

  const chainShield = parseJson<ChainShieldStorage>(chainShieldRaw);
  const totalShieldDays = parsePositiveInt(chainShield?.daysLeft);
  // Считаем дни через дату-строки в локальном времени устройства, а не через мс,
  // чтобы пользователи в UTC-N не теряли день щита из-за смещения UTC vs local.
  const grantedAtStr = chainShield?.grantedAt ?? null;
  // Локальная дата устройства в формате YYYY-MM-DD — без toLocaleDateString (ненадёжен на Hermes без ICU)
  const d = new Date(nowMs);
  const todayLocalStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysPassed = (grantedAtStr && /^\d{4}-\d{2}-\d{2}$/.test(grantedAtStr))
    ? Math.max(0, Math.floor((new Date(todayLocalStr).getTime() - new Date(grantedAtStr).getTime()) / 86400000))
    : 0;
  const remainingShieldDays = Math.max(0, totalShieldDays - daysPassed);
  if (remainingShieldDays > 0) {
    active.push({
      key: 'chain_shield',
      // Щит кончается в полночь последнего покрытого дня (локальные сутки).
      expiresAtMs: localMidnightAfterDaysMs(nowMs, remainingShieldDays),
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
      hint: triLang(lang, {
        ru: 'Пропуск дня не прервёт цепочку',
        uk: 'Пропуск дня не перерве ланцюжок',
        es: 'Saltarte un día no rompe tu racha',
        'pt-BR': 'Pular um dia não quebra sua sequência',
        vi: 'Bỏ lỡ một ngày không làm đứt chuỗi',
        id: 'Melewatkan satu hari tidak memutus rentetan',
        tr: 'Bir günü kaçırmak seriyi bozmaz',
        pl: 'Pominięcie dnia nie przerwie serii',
      }),
    });
  }

  const wagerDiscount = Math.max(0, Number(wagerDiscountRaw) || 0);
  const wagerLifetime = resolveFirstSeenLifetime('wager_discount', wagerDiscount > 0, WAGER_DISCOUNT_KEY);
  if (wagerDiscount > 0 && wagerLifetime && !wagerLifetime.expired) {
    active.push({
      key: 'wager_discount',
      expiresAtMs: wagerLifetime.expiresAtMs,
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
      hint: triLang(lang, {
        ru: 'Скидка применится при следующем пари',
        uk: 'Знижка застосується при наступному парі',
        es: 'El descuento se aplica en tu próxima apuesta',
        'pt-BR': 'O desconto vale na sua próxima aposta',
        vi: 'Giảm giá áp dụng cho lần cược tới',
        id: 'Diskon berlaku pada taruhan berikutnya',
        tr: 'İndirim bir sonraki bahiste geçerli',
        pl: 'Zniżka zadziała przy następnym zakładzie',
      }),
    });
  }

  const clubBoostLifetime = resolveFirstSeenLifetime('club_boost', clubGiftBoost === '1', CLUB_GIFT_BOOST_KEY);
  if (clubGiftBoost === '1' && clubBoostLifetime && !clubBoostLifetime.expired) {
    active.push({
      key: 'club_boost',
      expiresAtMs: clubBoostLifetime.expiresAtMs,
      iconGiftId: 'club_boost_free',
      title: triLang(lang, {
        ru: 'Буст лиги',
        uk: 'Буст ліги',
        es: 'Impulso de liga',
        'pt-BR': 'Boost da liga',
        vi: 'Tăng lực giải đấu',
        id: 'Boost liga',
        tr: 'Lig boostu',
        pl: 'Boost ligi',
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
      hint: triLang(lang, {
        ru: 'Включите бесплатно: Лига → Совместный буст',
        uk: 'Увімкніть безкоштовно: Ліга → Спільний буст',
        es: 'Actívalo gratis: Liga → Boost conjunto',
        'pt-BR': 'Ative grátis: Liga → Boost conjunto',
        vi: 'Bật miễn phí: Giải đấu → Boost chung',
        id: 'Aktifkan gratis: Liga → Boost bersama',
        tr: 'Ücretsiz aç: Lig → Ortak boost',
        pl: 'Włącz za darmo: Liga → Wspólny boost',
      }),
      actionRoute: '/club_screen',
    });
  }

  for (const gift of friendGifts.slice(0, 5)) {
    const fromName = gift.fromName || triLang(lang, {
      ru: 'друга',
      uk: 'друга',
      es: 'un amigo',
      'pt-BR': 'um amigo',
      vi: 'bạn bè',
      id: 'teman',
      tr: 'arkadaş',
      pl: 'znajomy',
    });
    active.push({
      key: `friend_gift_${gift.id}`,
      expiresAtMs: friendGiftExpiresAtMs(gift),
      iconGiftId: friendGiftIconForGiftId(gift.giftId),
      title: triLang(lang, {
        ru: `Подарок от ${fromName}`,
        uk: `Подарунок від ${fromName}`,
        es: `Regalo de ${fromName}`,
        'pt-BR': `Presente de ${fromName}`,
        vi: `Quà từ ${fromName}`,
        id: `Hadiah dari ${fromName}`,
        tr: `${fromName} hediyesi`,
        pl: `Prezent od ${fromName}`,
      }),
      desc: friendGiftLabel(gift, lang),
      accent: '#EAB308',
      hint: hintAutoWorks(lang),
    });
  }

  // Сгорание по-настоящему: просроченные бонусы удаляются из хранилища, чтобы
  // xp_manager/пари/лига не продолжали применять то, чего в разделе уже нет.
  for (const storageKey of burnKeys) {
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {
      // Повторная чистка при следующей загрузке раздела.
    }
  }
  if (firstSeenChanged) await persistGiftFirstSeenMap(firstSeen);

  return active;
};
