import AsyncStorage from '@react-native-async-storage/async-storage';
import { triLang, type Lang } from '../constants/i18n';
import type { LevelGiftRewardIconId } from '../constants/levelGiftRewardIcons';
import { lessonBonusHintsKey, type RuntimeStudyTarget } from './target_storage_keys';
import { flashcardsOfficialPacksAvailableForTarget } from './flashcards_target_gate';
import { captureAccountGeneration } from './account_generation';
import { readGiftAccountValue } from './gift_account_storage';
import { BONUS_ENERGY_KEY } from './bonus_energy_store';
import { readAttemptRestoreGiftCount } from './session_attempts/session_attempt_restore_inventory';
import { getPackGiftTrial } from './flashcards/pack_trial_gift';
import {
  friendGiftExpiresAtMs,
  loadStoredFriendGiftInventory,
  type StoredFriendGiftInventoryItem,
} from './friend_gift_inventory';
import {
  GIFT_TTL_MS,
  loadGiftFirstSeenMap,
  nextLocalMidnightMs,
  persistGiftFirstSeenMap,
  type GiftFirstSeenKind,
  type GiftFirstSeenMap,
} from './gift_expiry';

export type ActiveLevelGiftLifetime =
  | Readonly<{ kind: 'permanent' }>
  | Readonly<{ kind: 'expires'; expiresAtMs: number }>;

export interface ActiveLevelGiftInventoryItem {
  key: string;
  iconGiftId: LevelGiftRewardIconId;
  title: string;
  desc: string;
  accent: string;
  /**
   * зачем 2026-08-04 (владелец: «убери подписи со всех подарков вообще»):
   * поле hint («Работает автоматически», «Опыт удвоится сам…») удалено —
   * карточка теперь = название + одна строка сути. Куда идти за ручным
   * бонусом, показывает стрелка справа (actionRoute).
   */
  /**
   * Маршрут перехода по тапу (только для бонусов, которые нужно применить вручную:
   * ваучер набора → витрина карточек, буст лиги → лига). Пассивные бонусы route не имеют.
   */
  actionRoute?: string;
  /** Explicit lifetime semantics; permanent consumables never enter the 72h path. */
  lifetime: ActiveLevelGiftLifetime;
  /** Optional stacked quantity displayed as ×N. */
  countBadge?: number;
  /** Tapping opens information only; it is not a proactive apply action. */
  informationKind?: 'attempt_restore_all';
  /**
   * Мс сгорания подарка: у бонусов со своим сроком — их срок, у остальных —
   * 72ч (см. gift_expiry.ts). UI показывает индивидуальный тикающий таймер.
   */
  expiresAtMs?: number;
}

type ActiveLevelGiftInventoryDraft = Omit<ActiveLevelGiftInventoryItem, 'lifetime'> & {
  lifetime?: ActiveLevelGiftLifetime;
};

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

interface ChainShieldStorage {
  daysLeft?: number;
  grantedAt?: string;
}

const GIFT_XP_BANK_KEY = 'gift_xp_bank_v1';
const GIFT_MULTIPLIER_KEY = 'gift_xp_multiplier';
const CHAIN_SHIELD_KEY = 'chain_shield';
const WAGER_DISCOUNT_KEY = 'wager_discount';
const WAGER_DISCOUNT_USES_KEY = 'wager_discount_uses_v1';
const CLUB_GIFT_BOOST_KEY = 'club_gift_free_boost_v1';
/**
 * Ключи СЕЗОННЫХ наград.
 *
 * зачем 2026-08-03 (владелец: «подарки я применил, а они в разделе активные не
 * появились»): сезонные подарки пишут не в канал level-gift, а в собственные
 * ключи (см. season_reward_apply.ts, league_personal_boosts.ts,
 * boon_effects_energy.ts). Раздел их не читал, поэтому применённый буст лиги,
 * золотой урок и второе дыхание были невидимы.
 *
 * Значения продублированы строками намеренно: импорт из league_personal_boosts
 * и boon_effects_energy втянул бы в этот модуль движок лиг и бонусов дня со
 * всеми их зависимостями, а нужны только имена ключей. Расхождение поймает
 * тест, который сверяет эти строки с местами записи.
 */
const LEAGUE_PERSONAL_BOOST_KEY = 'league_personal_boost_v1';
const SEASON_GOLDEN_LESSON_KEY = 'season_golden_lesson_v1';
const BOON_ENERGY_OVERRIDE_KEY = 'boon_energy_override_v1';

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
    en: `${hours}h access`,
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

export const loadActiveLevelGiftInventory = async (
  lang: Lang,
  nowMs: number = Date.now(),
  studyTarget?: RuntimeStudyTarget,
): Promise<ActiveLevelGiftInventoryItem[]> => {
  const accountToken = captureAccountGeneration();
  // The active-gifts screen is allowed to render before account bootstrap has
  // finished. Account-scoped energy is optional here; an unavailable identity
  // must not reject the whole inventory collection.
  const bonusEnergyRead = accountToken.phase === 'active' && accountToken.stableId
    ? readGiftAccountValue(BONUS_ENERGY_KEY, accountToken).catch(() => null)
    : Promise.resolve(null);
  const attemptRestoreCountRead = accountToken.phase === 'active' && accountToken.stableId
    ? readAttemptRestoreGiftCount(accountToken).catch(() => 0)
    : Promise.resolve(0);
  const [
    xpBankRaw,
    giftMultiplierRaw,
    bonusEnergyRaw,
    packTrial,
    hintsRaw,
    chainShieldRaw,
    wagerDiscountRaw,
    clubGiftBoost,
    friendGifts,
    firstSeenLoaded,
    attemptRestoreCount,
  ] = await Promise.all([
    AsyncStorage.getItem(GIFT_XP_BANK_KEY),
    AsyncStorage.getItem(GIFT_MULTIPLIER_KEY),
    bonusEnergyRead,
    getPackGiftTrial(studyTarget).catch(() => null),
    AsyncStorage.getItem(lessonBonusHintsKey(todayIso(nowMs), studyTarget)),
    AsyncStorage.getItem(CHAIN_SHIELD_KEY),
    AsyncStorage.getItem(WAGER_DISCOUNT_KEY),
    AsyncStorage.getItem(CLUB_GIFT_BOOST_KEY),
    loadStoredFriendGiftInventory(nowMs).catch(() => []),
    loadGiftFirstSeenMap(),
    attemptRestoreCountRead,
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

  const active: ActiveLevelGiftInventoryDraft[] = [];
  if (attemptRestoreCount > 0) {
    active.push({
      key: 'attempt_restore_all',
      iconGiftId: 'attempt_restore_all',
      title: triLang(lang, {
        ru: 'Второй шанс', uk: 'Другий шанс', en: 'Second chance', es: 'Segunda oportunidad',
        'pt-BR': 'Segunda chance', vi: 'Cơ hội thứ hai', id: 'Kesempatan kedua',
        tr: 'İkinci şans', pl: 'Druga szansa',
      }),
      desc: triLang(lang, {
        ru: 'Восстанавливает все 3 попытки во время сессии',
        uk: 'Відновлює всі 3 спроби під час сесії',
        en: 'Restores all 3 attempts during a session',
        es: 'Restaura los 3 intentos durante la sesión',
        'pt-BR': 'Restaura todas as 3 tentativas durante uma sessão',
        vi: 'Khôi phục cả 3 lượt thử trong một phiên',
        id: 'Memulihkan semua 3 percobaan selama sesi',
        tr: 'Oturum sırasında 3 denemenin tümünü yeniler',
        pl: 'Przywraca wszystkie 3 próby podczas sesji',
      }),
      accent: '#D96076',
      countBadge: attemptRestoreCount,
      lifetime: { kind: 'permanent' },
      informationKind: 'attempt_restore_all',
    });
  }
  const xpBank = parseJson<GiftXpBankStorage>(xpBankRaw);
  const xpRemaining = parsePositiveInt(xpBank?.remaining);
  const xpBankLifetime = resolveFirstSeenLifetime('xp_bank', xpRemaining > 0, GIFT_XP_BANK_KEY);
  if (xpRemaining > 0 && xpBankLifetime && !xpBankLifetime.expired) {
    active.push({
      key: 'xp_bank',
      expiresAtMs: xpBankLifetime.expiresAtMs,
      iconGiftId: xpBankRewardIconForTotal(parsePositiveInt(xpBank?.grantedTotal) || xpRemaining),
      title: triLang(lang, { ru: 'Бонус ×2', uk: 'Бонус ×2', es: 'Bono ×2',
    en: 'Bonus ×2',
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
    en: `${xpRemaining} XP left`,
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
      expiresAtMs: Number(giftMultiplier?.expiresAt || 0),
      iconGiftId: focusRewardIconForMultiplier(multiplier),
      title: triLang(lang, { ru: 'Фокус', uk: 'Фокус', es: 'Foco',
    en: 'Focus',
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
      expiresAtMs: Number(bonusEnergy?.expiresAt || 0),
      iconGiftId: energyRewardIconForAmount(bonusEnergyAmount),
      title: triLang(lang, { ru: 'Энергия', uk: 'Енергія', en: 'Energy', es: 'Energía',
    'pt-BR': 'Energia',
    vi: 'Năng lượng',
    id: 'Energi',
    tr: 'Enerji',
    pl: 'Energia',
  }),
      desc: triLang(lang, {
        ru: `+${bonusEnergyAmount} до полуночи`,
        uk: `+${bonusEnergyAmount} до опівночі`,
        en: `+${bonusEnergyAmount} until midnight`,
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

  if (flashcardsOfficialPacksAvailableForTarget(studyTarget) && packTrial?.packId && Number(packTrial.expiresAt || 0) > nowMs) {
    active.push({
      key: 'pack_trial',
      expiresAtMs: Number(packTrial.expiresAt || 0),
      iconGiftId: 'pack_voucher_48h',
      title: triLang(lang, { ru: 'Ваучер набора', uk: 'Ваучер набору', en: 'Pack voucher', es: 'Vale de pack',
    'pt-BR': 'Vale de pacote',
    vi: 'Phiếu gói',
    id: 'Voucher paket',
    tr: 'Paket kuponu',
    pl: 'Voucher pakietu',
  }),
      desc: formatPackHoursLeft(Number(packTrial.expiresAt), nowMs, lang),
      accent: '#A78BFA',
      actionRoute: '/flashcards',
    });
  }

  const hintsToday = parsePositiveInt(hintsRaw);
  if (hintsToday > 0) {
    active.push({
      key: 'hints',
      expiresAtMs: nextLocalMidnightMs(nowMs),
      iconGiftId: hintsToday >= 3 ? 'hint_3' : 'hint_1',
      title: triLang(lang, { ru: 'Подсказки', uk: 'Підказки', en: 'Hints', es: 'Pistas',
    'pt-BR': 'Dicas',
    vi: 'Gợi ý',
    id: 'Petunjuk',
    tr: 'İpuçları',
    pl: 'Podpowiedzi',
  }),
      desc: triLang(lang, {
        ru: `${hintsToday} на сегодня`,
        uk: `${hintsToday} на сьогодні`,
        en: `${hintsToday} for today`,
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
  // Authoritative daysLeft counts saves/consumes; elapsed calendar time does not decrement it.
  const remainingShieldDays = parsePositiveInt(chainShield?.daysLeft);
  if (remainingShieldDays > 0) {
    active.push({
      key: 'chain_shield',
      iconGiftId: remainingShieldDays >= 3 ? 'chain_shield_3' : 'chain_shield_1',
      title: triLang(lang, { ru: 'Защита цепочки', uk: 'Захист ланцюжка', en: 'Streak shield', es: 'Protección de racha',
    'pt-BR': 'Proteção de sequência',
    vi: 'Bảo vệ chuỗi',
    id: 'Perlindungan rentetan',
    tr: 'Seri koruması',
    pl: 'Ochrona serii',
  }),
      desc: triLang(lang, {
        ru: `${remainingShieldDays} дн.`,
        uk: `${remainingShieldDays} дн.`,
        en: `${remainingShieldDays} d`,
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
  const wagerLifetime = resolveFirstSeenLifetime('wager_discount', wagerDiscount > 0, WAGER_DISCOUNT_KEY);
  if (wagerLifetime?.expired) burnKeys.push(WAGER_DISCOUNT_USES_KEY);
  if (wagerDiscount > 0 && wagerLifetime && !wagerLifetime.expired) {
    active.push({
      key: 'wager_discount',
      expiresAtMs: wagerLifetime.expiresAtMs,
      iconGiftId: 'wager_discount_25',
      title: triLang(lang, { ru: 'Скидка на пари', uk: 'Знижка на парі', en: 'Bet discount', es: 'Descuento apuesta',
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

  const clubGiftBoostCount = Math.max(0, Number.parseInt(clubGiftBoost ?? '', 10) || 0);
  const clubBoostLifetime = resolveFirstSeenLifetime('club_boost', clubGiftBoostCount > 0, CLUB_GIFT_BOOST_KEY);
  if (clubGiftBoostCount > 0 && clubBoostLifetime && !clubBoostLifetime.expired) {
    active.push({
      key: 'club_boost',
      expiresAtMs: clubBoostLifetime.expiresAtMs,
      iconGiftId: 'club_boost_free',
      title: triLang(lang, {
        ru: 'Буст лиги',
        uk: 'Буст ліги',
        en: 'League boost',
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
        en: '1 free activation',
        es: '1 activación gratis',
    'pt-BR': '1 ativação grátis',
    vi: '1 lần kích hoạt miễn phí',
    id: '1 aktivasi gratis',
    tr: '1 ücretsiz etkinleştirme',
    pl: '1 darmowa aktywacja',
  }),
      accent: '#2DD4BF',
      actionRoute: '/club_screen',
    });
  }

  for (const gift of friendGifts.slice(0, 5)) {
    const fromName = gift.fromName || triLang(lang, {
      ru: 'друга',
      uk: 'друга',
      en: 'a friend',
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
        en: `Gift from ${fromName}`,
        es: `Regalo de ${fromName}`,
        'pt-BR': `Presente de ${fromName}`,
        vi: `Quà từ ${fromName}`,
        id: `Hadiah dari ${fromName}`,
        tr: `${fromName} hediyesi`,
        pl: `Prezent od ${fromName}`,
      }),
      desc: friendGiftLabel(gift, lang),
      accent: '#EAB308',
    });
  }

  /**
   * СЕЗОННЫЕ награды.
   *
   * зачем 2026-08-03 (владелец: «подарки я применил, а они в разделе активные
   * не появились»): раздел читал фиксированный список ключей канала level-gift,
   * а сезонные награды пишут в СВОИ ключи. Совпадали только двое — банк опыта и
   * тотем клуба, и то случайно: они переиспользуют канал уровневых подарков.
   * Буст лиги, золотой урок и второе дыхание были невидимы полностью — игрок
   * применял подарок, эффект работал, но подтверждения этому не было нигде.
   *
   * Читаем те же ключи, куда пишет season_reward_apply.ts, — источник правды
   * один, дублирования состояния нет.
   */
  const [leagueBoostRaw, goldenLessonRaw, turboRegenRaw] = await Promise.all([
    AsyncStorage.getItem(LEAGUE_PERSONAL_BOOST_KEY),
    AsyncStorage.getItem(SEASON_GOLDEN_LESSON_KEY),
    AsyncStorage.getItem(BOON_ENERGY_OVERRIDE_KEY),
  ]);

  // Буст лиги: у него СВОЙ срок (до конца дня либо длительность буста), поэтому
  // 72-часовой TTL к нему не применяем — показываем настоящий expiresAt.
  const leagueBoost = parseJson<{ id?: string; multiplier?: number; expiresAt?: number }>(leagueBoostRaw);
  const leagueBoostExpiresAt = Math.max(0, Math.floor(Number(leagueBoost?.expiresAt) || 0));
  if (leagueBoostExpiresAt > nowMs) {
    const multiplier = Math.max(1, Number(leagueBoost?.multiplier) || 2);
    active.push({
      key: 'league_personal_boost',
      expiresAtMs: leagueBoostExpiresAt,
      iconGiftId: focusRewardIconForMultiplier(multiplier),
      title: triLang(lang, {
        ru: `Буст лиги ×${multiplier}`, uk: `Буст ліги ×${multiplier}`, en: `League boost ×${multiplier}`, es: `Impulso de liga ×${multiplier}`,
        'pt-BR': `Impulso de liga ×${multiplier}`, vi: `Tăng tốc giải ×${multiplier}`,
        id: `Dorongan liga ×${multiplier}`, tr: `Lig desteği ×${multiplier}`, pl: `Boost ligi ×${multiplier}`,
      }),
      desc: triLang(lang, {
        ru: 'очки лиги идут вдвойне', uk: 'очки ліги йдуть удвічі', en: 'league points are doubled', es: 'los puntos de liga se duplican',
        'pt-BR': 'os pontos da liga dobram', vi: 'điểm giải đấu nhân đôi', id: 'poin liga berlipat ganda',
        tr: 'lig puanları iki katı', pl: 'punkty ligi podwójnie',
      }),
      accent: '#38BDF8',
    });
  }

  // Золотой урок: заряд без своего срока — 72ч от первого показа, как у банка XP.
  const goldenCharges = Math.max(0, Math.floor(
    Number((parseJson<{ remaining?: number }>(goldenLessonRaw))?.remaining) || 0,
  ));
  const goldenLifetime = resolveFirstSeenLifetime('golden_lesson', goldenCharges > 0, SEASON_GOLDEN_LESSON_KEY);
  if (goldenCharges > 0 && goldenLifetime && !goldenLifetime.expired) {
    active.push({
      key: 'season_golden_lesson',
      expiresAtMs: goldenLifetime.expiresAtMs,
      // Множитель ×3 — та же иконка усиленного опыта, что у бонуса ×2.
      iconGiftId: focusRewardIconForMultiplier(3),
      title: triLang(lang, {
        ru: 'Золотой урок', uk: 'Золотий урок', en: 'Golden lesson', es: 'Lección dorada', 'pt-BR': 'Lição dourada',
        vi: 'Bài học vàng', id: 'Pelajaran emas', tr: 'Altın ders', pl: 'Złota lekcja',
      }),
      desc: goldenCharges > 1
        ? triLang(lang, {
            ru: `${goldenCharges} урока с ×3 опыта`, uk: `${goldenCharges} уроки з ×3 досвіду`,
            en: `${goldenCharges} lessons with ×3 XP`,
            es: `${goldenCharges} lecciones con ×3 XP`, 'pt-BR': `${goldenCharges} lições com ×3 XP`,
            vi: `${goldenCharges} bài học ×3 XP`, id: `${goldenCharges} pelajaran ×3 XP`,
            tr: `${goldenCharges} ders ×3 XP`, pl: `${goldenCharges} lekcje z ×3 XP`,
          })
        : triLang(lang, {
            ru: 'следующий урок даст ×3 опыта', uk: 'наступний урок дасть ×3 досвіду',
            en: 'the next lesson gives ×3 XP',
            es: 'la próxima lección dará ×3 XP', 'pt-BR': 'a próxima lição dará ×3 XP',
            vi: 'bài học tới nhận ×3 XP', id: 'pelajaran berikutnya ×3 XP',
            tr: 'sonraki ders ×3 XP verir', pl: 'następna lekcja da ×3 XP',
          }),
      accent: '#F59E0B',
    });
  }

  // Второе дыхание: ускоренное восстановление энергии со своим сроком.
  const turboRegen = parseJson<{ expiresAt?: number; intervalMs?: number }>(turboRegenRaw);
  const turboExpiresAt = Math.max(0, Math.floor(Number(turboRegen?.expiresAt) || 0));
  if (turboExpiresAt > nowMs) {
    active.push({
      key: 'turbo_regen',
      expiresAtMs: turboExpiresAt,
      iconGiftId: energyRewardIconForAmount(1),
      title: triLang(lang, {
        ru: 'Второе дыхание', uk: 'Друге дихання', en: 'Second wind', es: 'Segundo aliento', 'pt-BR': 'Segundo fôlego',
        vi: 'Hồi phục nhanh', id: 'Napas kedua', tr: 'İkinci nefes', pl: 'Drugi oddech',
      }),
      desc: triLang(lang, {
        ru: 'энергия восстанавливается быстрее', uk: 'енергія відновлюється швидше',
        en: 'energy recovers faster',
        es: 'la energía se recupera más rápido', 'pt-BR': 'a energia recarrega mais rápido',
        vi: 'năng lượng hồi nhanh hơn', id: 'energi pulih lebih cepat',
        tr: 'enerji daha hızlı doluyor', pl: 'energia regeneruje się szybciej',
      }),
      accent: '#22D3EE',
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

  return active.map((item): ActiveLevelGiftInventoryItem => ({
    ...item,
    lifetime: item.lifetime ?? (typeof item.expiresAtMs === 'number'
      ? { kind: 'expires', expiresAtMs: item.expiresAtMs }
      : { kind: 'permanent' }),
  }));
};
