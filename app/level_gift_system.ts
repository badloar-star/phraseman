/**
 * Level-Up Gift System — подарок при повышении уровня.
 *
 * F2P — энергия до полуночи, подсказки и косметика.
 * Premium — отдельный пул: редкая проба набора 48ч + с низким шансом
 *   постоянное открытие одного из пяти фирменных наборов (Negotiator, Dark Logic, Wild West,
 *   Royal Tea, Peaky Blinders), без повторов того же набора из этой дорожки.
 *
 * Обычный уровень: 60% common / 30% rare / 10% epic.
 * Круг (10,20,30,40,50): только rare/epic 60%/40%.
 * Anti-frustration на круге: не выдать hint_1 третий подряд (см. историю).
 *
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requireGiftAccountStorageKey,
} from './gift_account_storage';
import {
  BONUS_ENERGY_KEY,
  getTomorrowMidnightMs,
  readBonusEnergyForMutation,
  type BonusEnergyState,
} from './bonus_energy_store';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { RUNE_GLYPH_PRIMARY, runeWord } from '../constants/runes';
import { flashcardsOfficialPacksAvailableForTarget } from './flashcards_target_gate';
import { lessonBonusHintsKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { THEME_DISPLAY_NAMES } from './theme_display_names';
// зачем: пул кандидатов общий с прежней системой розыгрыша — иначе
// «какие темы остались» считалось бы в двух местах и разъехалось бы.
import { loadThemeGiftCandidates } from './theme_gift_pool';
import { parseBonusEnergyStorageValue } from './spin_gift_storage_integrity';
import {
  OWNED_THEMES_KEY,
  mergeThemeModeLists,
} from './theme_ownership_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { withStorageLock } from './storage_mutex';
import { emitAppEvent } from './events';
import { prepareVipSnapshotWritesForAccount, readVipSnapshotForAccount } from './premium_vip_storage';
import {
  LEVEL_SPIN_REWARD_CATALOG,
  type LevelSpinRewardCatalogEntry,
  type LevelSpinRewardId,
} from './level_spin_reward_catalog';
import { DebugLogger } from './debug-logger';
import { ENERGY_BONUS_CAPACITY_LIMIT } from './energy_contract';
import { applyEnergyCapacityGift } from './energy_gift_effects';
import { coerceEnergyStateV2, createFullEnergyState } from './energy_state_v2';
import { energyVisualTransactions } from './energy_visual_transactions';

export type GiftRarity = 'common' | 'rare' | 'epic';

export type GiftId = string;

export interface GiftDef {
  id:      GiftId;
  rarity:  GiftRarity;
  icon:    string;
  titleRU: string;
  titleUK: string;
  titleEN?: string;
  /** Если пусто при lang es — показываем titleRU */
  titleES?: string;
  descRU:  string;
  descUK:  string;
  descEN?: string;
  descES?: string;
  weight:  number;
  /** Spin-only presentation tier. Legacy roll rarity remains unchanged. */
  spinTier?: LevelSpinRewardCatalogEntry['tier'];
  /** Choice reward: UI asks the user to pick one of these concrete rewards. */
  choices?: GiftDef[];
  /** Server-owned roll receipt. Persisted with pending inventory for replay. */
  levelGiftReservation?: {
    reservationId: string;
    lane: 'f2p' | 'premium';
    allowedPackId?: string;
  };
  /** Immutable authority for a reward produced by the server level-spin protocol. */
  spinRewardReceipt?: {
    requestId: string;
    lane: 'base' | 'premium';
    giftId: string;
  };
}

type PlannedGiftCopy = Record<PlannedInterfaceLang, string>;

const makeSpinPlannedCopy = (
  ids: readonly string[],
  copy: (id: string) => { title: PlannedGiftCopy; desc: PlannedGiftCopy },
): Partial<Record<GiftId, { title: PlannedGiftCopy; desc: PlannedGiftCopy }>> => Object.fromEntries(
  ids.map((id) => [id, copy(id)]),
);

const SPIN_REWARD_PLANNED_LOCALE: Partial<Record<GiftId, { title: PlannedGiftCopy; desc: PlannedGiftCopy }>> = {
  ...makeSpinPlannedCopy(
    ['pearls_5', 'pearls_10', 'pearls_20', 'pearls_50', 'pearls_100', 'pearls_250', 'pearls_500', 'pearls_1000'],
    (id) => {
      const amount = Number(id.slice('pearls_'.length));
      return {
        title: { 'pt-BR': `+${amount} ${runeWord('pt-BR', amount)}`, vi: `+${amount} ${runeWord('vi', amount)}`, id: `+${amount} ${runeWord('id', amount)}`, tr: `+${amount} ${runeWord('tr', amount)}`, pl: `+${amount} ${runeWord('pl', amount)}` },
        desc: { 'pt-BR': `${amount} ${runeWord('pt-BR', amount)} para o seu saldo`, vi: `${amount} ${runeWord('vi', amount)} vào số dư của bạn`, id: `${amount} ${runeWord('id', amount)} ke saldomu`, tr: `Bakiyene ${amount} ${runeWord('tr', amount)}`, pl: `${amount} ${runeWord('pl', amount)} do twojego salda` },
      };
    },
  ),
  ...makeSpinPlannedCopy(
    ['stars_10', 'stars_20', 'stars_50', 'stars_100', 'stars_250', 'stars_500', 'stars_1000', 'stars_2000'],
    (id) => {
      const amount = Number(id.slice('stars_'.length));
      return {
        title: { 'pt-BR': `+${amount} ${runeWord('pt-BR', amount)}`, vi: `+${amount} ${runeWord('vi', amount)}`, id: `+${amount} ${runeWord('id', amount)}`, tr: `+${amount} ${runeWord('tr', amount)}`, pl: `+${amount} ${runeWord('pl', amount)}` },
        desc: { 'pt-BR': `${amount} ${runeWord('pt-BR', amount)} para o saldo único`, vi: `${amount} ${runeWord('vi', amount)} vào số dư chung`, id: `${amount} ${runeWord('id', amount)} ke saldo terpadu`, tr: `Birleşik bakiyene ${amount} ${runeWord('tr', amount)}`, pl: `${amount} ${runeWord('pl', amount)} do wspólnego salda` },
      };
    },
  ),
  ...makeSpinPlannedCopy(['plus_days_3', 'plus_days_7', 'plus_days_14', 'plus_days_30'], (id) => {
    const days = Number(id.slice('plus_days_'.length));
    return {
      title: { 'pt-BR': `Plus por ${days} dias`, vi: `Plus trong ${days} ngày`, id: `Plus selama ${days} hari`, tr: `${days} günlük Plus`, pl: `Plus na ${days} dni` },
      desc: { 'pt-BR': `Acesso Plus temporário por ${days} dias`, vi: `Quyền truy cập Plus tạm thời trong ${days} ngày`, id: `Akses Plus sementara selama ${days} hari`, tr: `${days} gün geçici Plus erişimi`, pl: `Tymczasowy dostęp Plus przez ${days} dni` },
    };
  }),
  attempt_restore_all: {
    title: {
      'pt-BR': 'Segunda chance',
      vi: 'Cơ hội thứ hai',
      id: 'Kesempatan kedua',
      tr: 'İkinci şans',
      pl: 'Druga szansa',
    },
    desc: {
      'pt-BR': 'Restaura todas as 3 tentativas durante uma sessão',
      vi: 'Khôi phục cả 3 lượt thử trong một phiên',
      id: 'Memulihkan semua 3 percobaan selama sesi',
      tr: 'Oturum sırasında 3 denemenin tümünü yeniler',
      pl: 'Przywraca wszystkie 3 próby podczas sesji',
    },
  },
};

const PACK_FOREVER_DESC: PlannedGiftCopy = {
  'pt-BR': 'O pacote completo foi adicionado aos seus cartões para sempre.',
  vi: 'Toàn bộ gói đã được thêm vào thẻ của bạn vĩnh viễn.',
  id: 'Seluruh paket ditambahkan ke kartumu selamanya.',
  tr: 'Tam paket kartlarına kalıcı olarak eklendi.',
  pl: 'Pełny pakiet dodano do twoich kart na stałe.',
};

const LEVEL_GIFT_PLANNED_LOCALE: Partial<Record<GiftId, { title: PlannedGiftCopy; desc: PlannedGiftCopy }>> = {
  ...SPIN_REWARD_PLANNED_LOCALE,
  energy_full: {
    title: { 'pt-BR': 'Energia cheia', vi: 'Năng lượng đầy', id: 'Energi penuh', tr: 'Tam enerji', pl: 'Pełna energia' },
    desc: { 'pt-BR': 'Restaura a energia até o limite ativo', vi: 'Hồi đầy năng lượng đến giới hạn hiện tại', id: 'Mengisi energi hingga batas aktif', tr: 'Enerjiyi aktif sınıra kadar doldurur', pl: 'Uzupełnia energię do aktywnego limitu' },
  },
  energy_plus1: {
    title: { 'pt-BR': '+20 de energia até meia-noite', vi: '+20 năng lượng đến nửa đêm', id: '+20 energi sampai tengah malam', tr: 'Gece yarısına kadar +20 enerji', pl: '+20 energii do północy' },
    desc: { 'pt-BR': 'Aumenta o limite e enche a energia; o limite extra acumula até +200', vi: 'Tăng giới hạn và nạp đầy; giới hạn thưởng cộng dồn tối đa +200', id: 'Menambah batas dan mengisi energi; batas bonus menumpuk hingga +200', tr: 'Limiti artırır ve doldurur; bonus limiti +200’e kadar birikir', pl: 'Zwiększa limit i uzupełnia energię; dodatkowy limit kumuluje się do +200' },
  },
  hint_1: {
    title: { 'pt-BR': '+1 dica', vi: '+1 gợi ý', id: '+1 petunjuk', tr: '+1 ipucu', pl: '+1 podpowiedź' },
    desc: { 'pt-BR': 'Uma dica extra nas lições de hoje', vi: 'Một gợi ý thêm trong các bài học hôm nay', id: 'Satu petunjuk ekstra di pelajaran hari ini', tr: 'Bugünkü derslerde ekstra bir ipucu', pl: 'Dodatkowa podpowiedź w dzisiejszych lekcjach' },
  },
  energy_plus2: {
    title: { 'pt-BR': '+40 de energia até meia-noite', vi: '+40 năng lượng đến nửa đêm', id: '+40 energi sampai tengah malam', tr: 'Gece yarısına kadar +40 enerji', pl: '+40 energii do północy' },
    desc: { 'pt-BR': 'Aumenta o limite e enche a energia; o limite extra acumula até +200', vi: 'Tăng giới hạn và nạp đầy; giới hạn thưởng cộng dồn tối đa +200', id: 'Menambah batas dan mengisi energi; batas bonus menumpuk hingga +200', tr: 'Limiti artırır ve doldurur; bonus limiti +200’e kadar birikir', pl: 'Zwiększa limit i uzupełnia energię; dodatkowy limit kumuluje się do +200' },
  },
  hint_3: {
    title: { 'pt-BR': '+3 dicas', vi: '+3 gợi ý', id: '+3 petunjuk', tr: '+3 ipucu', pl: '+3 podpowiedzi' },
    desc: { 'pt-BR': 'Três dicas extras nas lições de hoje', vi: 'Ba gợi ý thêm trong các bài học hôm nay', id: 'Tiga petunjuk ekstra di pelajaran hari ini', tr: 'Bugünkü derslerde üç ekstra ipucu', pl: 'Trzy dodatkowe podpowiedzi w dzisiejszych lekcjach' },
  },
  cosmetic_avatar_common: {
    title: { 'pt-BR': 'Avatar grátis', vi: 'Avatar miễn phí', id: 'Avatar gratis', tr: 'Ücretsiz avatar', pl: 'Darmowy awatar' },
    desc: { 'pt-BR': 'Um avatar aleatório com fundo aleatório será desbloqueado grátis', vi: 'Một avatar ngẫu nhiên với nền ngẫu nhiên sẽ được mở khóa miễn phí', id: 'Avatar acak dengan latar acak terbuka gratis', tr: 'Rastgele arka planlı bir avatar ücretsiz açılır', pl: 'Losowy awatar z losowym tłem zostanie odblokowany za darmo' },
  },
  cosmetic_theme: {
    title: { 'pt-BR': 'Tema da interface', vi: 'Giao diện ứng dụng', id: 'Tema antarmuka', tr: 'Arayüz teması', pl: 'Motyw interfejsu' },
    desc: { 'pt-BR': 'Um tema pago aleatório é desbloqueado para sempre. Escolha-o nos ajustes', vi: 'Một giao diện trả phí ngẫu nhiên mở khóa vĩnh viễn. Chọn trong cài đặt', id: 'Tema berbayar acak terbuka selamanya. Pilih di pengaturan', tr: 'Rastgele ücretli bir tema kalıcı olarak açılır. Ayarlardan seç', pl: 'Losowy płatny motyw zostanie odblokowany na zawsze. Wybierz go w ustawieniach' },
  },
  cosmetic_avatar_aura: {
    title: { 'pt-BR': 'Aura de avatar', vi: 'Hào quang avatar', id: 'Aura avatar', tr: 'Avatar aurası', pl: 'Aura awatara' },
    desc: { 'pt-BR': 'Uma aura aleatória será desbloqueada grátis ao redor do avatar', vi: 'Một hào quang ngẫu nhiên sẽ mở khóa miễn phí quanh avatar', id: 'Aura acak terbuka gratis di sekitar avatar', tr: 'Avatarın etrafında rastgele bir aura ücretsiz açılır', pl: 'Losowa aura zostanie odblokowana za darmo wokół awatara' },
  },
  energy_plus3: {
    title: { 'pt-BR': '+60 de energia até meia-noite', vi: '+60 năng lượng đến nửa đêm', id: '+60 energi sampai tengah malam', tr: 'Gece yarısına kadar +60 enerji', pl: '+60 energii do północy' },
    desc: { 'pt-BR': 'Aumenta o limite e enche a energia; o limite extra acumula até +200', vi: 'Tăng giới hạn và nạp đầy; giới hạn thưởng cộng dồn tối đa +200', id: 'Menambah batas dan mengisi energi; batas bonus menumpuk hingga +200', tr: 'Limiti artırır ve doldurur; bonus limiti +200’e kadar birikir', pl: 'Zwiększa limit i uzupełnia energię; dodatkowy limit kumuluje się do +200' },
  },
  wager_discount_25: {
    title: { 'pt-BR': '25% de desconto na aposta', vi: 'Giảm 25% cho cược', id: 'Diskon taruhan 25%', tr: 'Bahiste %25 indirim', pl: '25% zniżki na zakład' },
    desc: { 'pt-BR': 'A próxima aposta custa 25% menos (uma vez; usado ao apostar)', vi: 'Lần cược tiếp theo rẻ hơn 25% (một lần; dùng khi đặt cược)', id: 'Taruhan berikutnya 25% lebih murah (sekali; dipakai saat bertaruh)', tr: 'Sonraki bahis %25 daha ucuz (tek seferlik; bahis yapınca kullanılır)', pl: 'Następny zakład kosztuje 25% mniej (jednorazowo, używa się przy zakładzie)' },
  },
  pack_voucher_48h: {
    title: { 'pt-BR': 'Vale de pacote 48 h', vi: 'Phiếu gói 48 giờ', id: 'Voucher paket 48 jam', tr: '48 saatlik paket kuponu', pl: 'Voucher pakietu 48 godz.' },
    desc: { 'pt-BR': 'Um pacote pago pode ser aberto grátis por 48 horas', vi: 'Một gói trả phí có thể mở miễn phí trong 48 giờ', id: 'Satu paket berbayar bisa dibuka gratis selama 48 jam', tr: 'Bir ücretli paket 48 saat ücretsiz açılabilir', pl: 'Jeden płatny pakiet można otworzyć za darmo na 48 godzin' },
  },
  choice_3_level: {
    title: { 'pt-BR': 'Escolha a recompensa', vi: 'Chọn phần thưởng', id: 'Pilih hadiah', tr: 'Ödül seç', pl: 'Wybierz nagrodę' },
    desc: { 'pt-BR': 'Abra e escolha uma de três recompensas', vi: 'Mở và chọn một trong ba phần thưởng', id: 'Buka dan pilih satu dari tiga hadiah', tr: 'Aç ve üç ödülden birini seç', pl: 'Otwórz i wybierz jedną z trzech nagród' },
  },
  premium_cosmetic_avatar: {
    title: { 'pt-BR': 'Avatar Plus grátis', vi: 'Avatar Plus miễn phí', id: 'Avatar Plus gratis', tr: 'Ücretsiz Plus avatar', pl: 'Darmowy awatar Plus' },
    desc: { 'pt-BR': 'Um avatar aleatório com fundo aleatório será desbloqueado grátis', vi: 'Một avatar ngẫu nhiên với nền ngẫu nhiên sẽ được mở khóa miễn phí', id: 'Avatar acak dengan latar acak terbuka gratis', tr: 'Rastgele arka planlı bir avatar ücretsiz açılır', pl: 'Losowy awatar z losowym tłem zostanie odblokowany za darmo' },
  },
  premium_cosmetic_aura: {
    title: { 'pt-BR': 'Aura Plus grátis', vi: 'Hào quang Plus miễn phí', id: 'Aura Plus gratis', tr: 'Ücretsiz Plus aura', pl: 'Darmowa aura Plus' },
    desc: { 'pt-BR': 'Uma aura de avatar aleatória será desbloqueada grátis', vi: 'Một hào quang avatar ngẫu nhiên sẽ được mở khóa miễn phí', id: 'Aura avatar acak terbuka gratis', tr: 'Rastgele bir avatar aurası ücretsiz açılır', pl: 'Losowa aura awatara zostanie odblokowana za darmo' },
  },
  prem_pack_48h: {
    title: { 'pt-BR': 'Pacote de teste 48 h', vi: 'Gói dùng thử 48 giờ', id: 'Paket uji coba 48 jam', tr: '48 saatlik deneme paketi', pl: 'Pakiet próbny 48 godz.' },
    desc: { 'pt-BR': 'Um pacote pago aleatório com acesso completo por 48 h (timer na loja)', vi: 'Một gói trả phí ngẫu nhiên: xem đầy đủ trong 48 giờ (xem đồng hồ ở cửa hàng)', id: 'Paket berbayar acak: akses penuh 48 jam (lihat timer di toko)', tr: 'Rastgele ücretli paket: 48 saat tam erişim (mağazadaki zamanlayıcıya bak)', pl: 'Losowy płatny pakiet: pełny dostęp przez 48 godz. (timer w sklepie)' },
  },
  prem_level_unlock_negotiator: {
    title: { 'pt-BR': 'Pacote «Negotiator»', vi: 'Gói «Negotiator»', id: 'Paket «Negotiator»', tr: '«Negotiator» paketi', pl: 'Pakiet «Negotiator»' },
    desc: PACK_FOREVER_DESC,
  },
  prem_level_unlock_dark_logic: {
    title: { 'pt-BR': 'Pacote «Dark Logic»', vi: 'Gói «Dark Logic»', id: 'Paket «Dark Logic»', tr: '«Dark Logic» paketi', pl: 'Pakiet «Dark Logic»' },
    desc: PACK_FOREVER_DESC,
  },
  prem_level_unlock_wild_west: {
    title: { 'pt-BR': 'Pacote «Wild West»', vi: 'Gói «Wild West»', id: 'Paket «Wild West»', tr: '«Wild West» paketi', pl: 'Pakiet «Wild West»' },
    desc: PACK_FOREVER_DESC,
  },
  prem_level_unlock_royal_tea: {
    title: { 'pt-BR': 'Pacote «Royal Tea»', vi: 'Gói «Royal Tea»', id: 'Paket «Royal Tea»', tr: '«Royal Tea» paketi', pl: 'Pakiet «Royal Tea»' },
    desc: PACK_FOREVER_DESC,
  },
  prem_level_unlock_peaky_blinders: {
    title: { 'pt-BR': 'Pacote «Peaky Blinders»', vi: 'Gói «Peaky Blinders»', id: 'Paket «Peaky Blinders»', tr: '«Peaky Blinders» paketi', pl: 'Pakiet «Peaky Blinders»' },
    desc: PACK_FOREVER_DESC,
  },
};

export function giftTitleForLang(g: GiftDef, lang: Lang): string {
  const planned = LEVEL_GIFT_PLANNED_LOCALE[g.id]?.title;
  return triLang(lang, {
    ru: g.titleRU,
    uk: g.titleUK,
    en: g.titleEN ?? g.titleRU,
    es: g.titleES ?? g.titleRU,
    'pt-BR': planned?.['pt-BR'] ?? g.titleES ?? g.titleRU,
    vi: planned?.vi ?? g.titleES ?? g.titleRU,
    id: planned?.id ?? g.titleES ?? g.titleRU,
    tr: planned?.tr ?? g.titleES ?? g.titleRU,
    pl: planned?.pl ?? g.titleES ?? g.titleRU,
  });
}

export function giftDescForLang(g: GiftDef, lang: Lang): string {
  const planned = LEVEL_GIFT_PLANNED_LOCALE[g.id]?.desc;
  return triLang(lang, {
    ru: g.descRU,
    uk: g.descUK,
    en: g.descEN ?? g.descRU,
    es: g.descES ?? g.descRU,
    'pt-BR': planned?.['pt-BR'] ?? g.descES ?? g.descRU,
    vi: planned?.vi ?? g.descES ?? g.descRU,
    id: planned?.id ?? g.descES ?? g.descRU,
    tr: planned?.tr ?? g.descES ?? g.descRU,
    pl: planned?.pl ?? g.descES ?? g.descRU,
  });
}

const isPremiumLevelGiftCopy = (id: GiftId): boolean =>
  id.startsWith('prem_') || id.startsWith('premium_');

export function isPremiumLevelGiftId(gid: string | undefined): boolean {
  return !!gid && isPremiumLevelGiftCopy(gid);
}

const stripPremiumGiftMarker = (value: string): string => {
  const stripped = value
    .replace(/\s*\((?:plus|плюс)\)\s*/gi, ' ')
    .replace(/(^|\s)(?:plus|плюс)[-\s]+/gi, '$1')
    .replace(/\s+(?:plus|плюс)\b/gi, ' ')
    .replace(/\s*\((?:premium|премиум|преміум)\)\s*/gi, ' ')
    .replace(/(^|\s)(?:premium|премиум|преміум)[-\s]+/gi, '$1')
    .replace(/\s+(?:premium|премиум|преміум)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return stripped ? stripped.charAt(0).toLocaleUpperCase() + stripped.slice(1) : value;
};

export function giftDisplayTitleForLang(g: GiftDef, lang: Lang): string {
  const title = giftTitleForLang(g, lang);
  return isPremiumLevelGiftCopy(g.id) ? stripPremiumGiftMarker(title) : title;
}

export function giftDisplayDescForLang(g: GiftDef, lang: Lang): string {
  const desc = giftDescForLang(g, lang);
  return isPremiumLevelGiftCopy(g.id) ? stripPremiumGiftMarker(desc) : desc;
}

export function giftLocaleStrings(lang: Lang, g: GiftDef): { title: string; desc: string } {
  return { title: giftTitleForLang(g, lang), desc: giftDescForLang(g, lang) };
}

const GIFT_RARITY_UI_LABEL: Record<GiftRarity, {
  ru: string;
  uk: string;
  en: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}> = {
  common: {
    ru: 'Обычный',
    uk: 'Звичайний',
    en: 'Common',
    es: 'Común',
    'pt-BR': 'Comum',
    vi: 'Thường',
    id: 'Biasa',
    tr: 'Sıradan',
    pl: 'Zwykły',
  },
  rare: {
    ru: 'Редкий',
    uk: 'Рідкісний',
    en: 'Rare',
    es: 'Raro',
    'pt-BR': 'Raro',
    vi: 'Hiếm',
    id: 'Langka',
    tr: 'Nadir',
    pl: 'Rzadki',
  },
  epic: {
    ru: 'Эпический',
    uk: 'Епічний',
    en: 'Epic',
    es: 'Épico',
    'pt-BR': 'Épico',
    vi: 'Sử thi',
    id: 'Epik',
    tr: 'Destansı',
    pl: 'Epicki',
  },
};

export function giftRarityUiLabel(rarity: GiftRarity | string | undefined | null, lang: Lang): string {
  const r = rarity === 'rare' || rarity === 'epic' ? rarity : 'common';
  const label = GIFT_RARITY_UI_LABEL[r];
  return triLang(lang, {
    ru: label.ru,
    uk: label.uk,
    en: label.en,
    es: label.es,
    'pt-BR': label['pt-BR'],
    vi: label.vi,
    id: label.id,
    tr: label.tr,
    pl: label.pl,
  });
}

const SPIN_TIER_UI_LABEL: Record<LevelSpinRewardCatalogEntry['tier'], Record<Lang, string>> = {
  ordinary: { ru: 'Обычный', uk: 'Звичайний', en: 'Common', es: 'Común', 'pt-BR': 'Comum', vi: 'Thường', id: 'Biasa', tr: 'Sıradan', pl: 'Zwykły' },
  rare: { ru: 'Редкий', uk: 'Рідкісний', en: 'Rare', es: 'Raro', 'pt-BR': 'Raro', vi: 'Hiếm', id: 'Langka', tr: 'Nadir', pl: 'Rzadki' },
  ultra: { ru: 'Ультраредкий', uk: 'Ультрарідкісний', en: 'Ultra rare', es: 'Ultrarraro', 'pt-BR': 'Ultrarraro', vi: 'Siêu hiếm', id: 'Ultra langka', tr: 'Ultra nadir', pl: 'Ultrarzadki' },
  exceptional: { ru: 'Исключительный', uk: 'Винятковий', en: 'Exceptional', es: 'Excepcional', 'pt-BR': 'Excepcional', vi: 'Đặc biệt', id: 'Istimewa', tr: 'Olağanüstü', pl: 'Wyjątkowy' },
};

export function giftSpinTier(gift: GiftDef): LevelSpinRewardCatalogEntry['tier'] {
  return gift.spinTier
    ?? LEVEL_SPIN_REWARD_CATALOG.find((entry) => entry.id === gift.id)?.tier
    ?? (gift.rarity === 'epic' ? 'ultra' : gift.rarity === 'rare' ? 'rare' : 'ordinary');
}

export function giftSpinTierUiLabel(gift: GiftDef, lang: Lang): string {
  return SPIN_TIER_UI_LABEL[giftSpinTier(gift)][lang];
}

const GIFT_F2P: GiftDef[] = [
  {
    id: 'energy_full', rarity: 'common', icon: '⚡', weight: 9,
    titleRU: 'Полная энергия', titleUK: 'Повна енергія', titleEN: 'Full energy', titleES: 'Energía al máximo',
    descRU: 'Энергия заполнена до активного лимита',
    descUK: 'Енергію заповнено до активного ліміту',
    descEN: 'Fills energy to the active limit',
    descES: 'La energía se llena hasta el límite activo',
  },
  {
    id: 'energy_plus1', rarity: 'common', icon: '⚡', weight: 8,
    titleRU: '+20 энергии до полуночи', titleUK: '+20 енергії до півночі', titleEN: '+20 energy until midnight', titleES: '+20 de energía hasta medianoche',
    // зачем: владелец 2026-08-23 — описание врало. Оно обещало «заменяет, не
    // суммируется», а applyEnergyBonusN всегда СКЛАДЫВАЛ с уже активным бонусом
    // (existing.amount + n). Владелец подтвердил: правда — код, суммирование
    // выгоднее игроку. Текст приведён к фактическому поведению.
    descRU: 'Повышает лимит и заполняет энергию; бонусный лимит суммируется до +200',
    descUK: 'Підвищує ліміт і заповнює енергію; бонусний ліміт складається до +200',
    descEN: 'Raises the limit and fills energy; the bonus limit stacks up to +200',
    descES: 'Aumenta el límite y llena la energía; el límite extra se acumula hasta +200',
  },
  {
    id: 'hint_1', rarity: 'common', icon: '💡', weight: 8,
    titleRU: '+1 подсказка', titleUK: '+1 підказка', titleES: '+1 pista',
    descRU: 'Дополнительная подсказка в уроках сегодня', descUK: 'Додаткова підказка в уроках сьогодні',
    descES: 'Pista extra en las lecciones de hoy',
  },
  {
    id: 'shards_3', rarity: 'common', icon: '◈', weight: 7,
    titleRU: '+3 монеты', titleUK: '+3 монети', titleEN: '+3 coins', titleES: '+3 monedas',
    descRU: 'Три монеты на баланс', descUK: 'Три монети на баланс', descEN: 'Three coins added to your balance', descES: 'Tres monedas para tu saldo',
  },
  {
    id: 'energy_plus2', rarity: 'rare', icon: '⚡', weight: 7,
    titleRU: '+40 энергии до полуночи', titleUK: '+40 енергії до півночі', titleEN: '+40 energy until midnight', titleES: '+40 de energía hasta medianoche',
    descRU: 'Повышает лимит и заполняет энергию; бонусный лимит суммируется до +200', descUK: 'Підвищує ліміт і заповнює енергію; бонусний ліміт складається до +200',
    descEN: 'Raises the limit and fills energy; the bonus limit stacks up to +200',
    descES: 'Aumenta el límite y llena la energía; el límite extra se acumula hasta +200',
  },
  {
    id: 'hint_3', rarity: 'rare', icon: '💡', weight: 6,
    titleRU: '+3 подсказки', titleUK: '+3 підказки', titleES: '+3 pistas',
    descRU: 'Три доп. подсказки в уроках сегодня', descUK: 'Три дод. підказки в уроках сьогодні',
    descES: 'Tres pistas extra en las lecciones de hoy',
  },
  {
    id: 'shards_6', rarity: 'rare', icon: '◈', weight: 6,
    titleRU: '+6 монет', titleUK: '+6 монет', titleEN: '+6 coins', titleES: '+6 monedas',
    descRU: 'Шесть монет на баланс', descUK: 'Шість монет на баланс', descEN: 'Six coins added to your balance', descES: 'Seis monedas para tu saldo',
  },
  {
    id: 'cosmetic_avatar_common', rarity: 'rare', icon: '🎨', weight: 5,
    titleRU: 'Бесплатный аватар', titleUK: 'Безкоштовний аватар', titleES: 'Avatar gratis',
    descRU: 'Случайный аватар со случайным фоном откроется бесплатно',
    descUK: 'Випадковий аватар із випадковим фоном відкриється безкоштовно',
    descES: 'Un avatar aleatorio con fondo aleatorio se desbloquea gratis',
  },
  {
    id: 'cosmetic_avatar_aura', rarity: 'rare', icon: '✨', weight: 4,
    titleRU: 'Аура аватара', titleUK: 'Аура аватара', titleES: 'Aura de avatar',
    descRU: 'Случайная аура откроется бесплатно и появится вокруг аватара',
    descUK: 'Випадкова аура відкриється безкоштовно й з\'явиться навколо аватара',
    descES: 'Un aura aleatoria se desbloquea gratis alrededor del avatar',
  },
  {
    // зачем (владелец 2026-08-26): тема интерфейса — единственная награда спина,
    // которую иначе можно взять ТОЛЬКО за 200 жемчужин. Вес в общем пуле
    // подарков за уровень нулевой смысл не имеет: сюда она попадает лишь через
    // каталог спина (вес 2 200 ≈ 1%), а не как обычный подарок за уровень.
    id: 'cosmetic_theme', rarity: 'epic', icon: '🎨', weight: 1, spinTier: 'ultra',
    titleRU: 'Тема оформления', titleUK: 'Тема оформлення', titleES: 'Tema de la interfaz',
    descRU: 'Случайная платная тема откроется навсегда. Выбрать её можно в настройках',
    descUK: 'Випадкова платна тема відкриється назавжди. Обрати її можна в налаштуваннях',
    descES: 'Un tema de pago aleatorio se desbloquea para siempre. Elígelo en ajustes',
  },
  {
    id: 'energy_plus3', rarity: 'epic', icon: '⚡', weight: 2,
    titleRU: '+60 энергии до полуночи', titleUK: '+60 енергії до півночі', titleEN: '+60 energy until midnight', titleES: '+60 de energía hasta medianoche',
    descRU: 'Повышает лимит и заполняет энергию; бонусный лимит суммируется до +200', descUK: 'Підвищує ліміт і заповнює енергію; бонусний ліміт складається до +200',
    descEN: 'Raises the limit and fills energy; the bonus limit stacks up to +200',
    descES: 'Aumenta el límite y llena la energía; el límite extra se acumula hasta +200',
  },
  {
    id: 'shards_10', rarity: 'epic', icon: '◈', weight: 2,
    titleRU: '+10 монет', titleUK: '+10 монет', titleEN: '+10 coins', titleES: '+10 monedas',
    descRU: 'Десять монет на баланс', descUK: 'Десять монет на баланс', descEN: 'Ten coins added to your balance', descES: 'Diez monedas para tu saldo',
  },
  {
    id: 'wager_discount_25', rarity: 'epic', icon: '🎲', weight: 2,
    titleRU: 'Скидка на пари −25%', titleUK: 'Знижка на пари −25%', titleES: '−25 % en la apuesta',
    descRU: 'Следующее пари: на 25% дешевле (одно пари, ключ сбрасывается при ставке)',
    descUK: 'Наступне пари: на 25% дешевше (одне пари, знімається при ставці)',
    descES: 'La siguiente apuesta cuesta un 25 % menos (una sola vez; se usa al apostar)',
  },
  {
    id: 'pack_voucher_48h', rarity: 'epic', icon: '📦', weight: 1,
    titleRU: 'Ваучер набора 48 ч', titleUK: 'Ваучер набору 48 год', titleES: 'Vale de pack 48 h',
    descRU: 'Один платный набор можно открыть бесплатно на 48 часов',
    descUK: 'Один платний набір можна відкрити безкоштовно на 48 годин',
    descES: 'Abre gratis un pack de pago durante 48 horas',
  },
  {
    id: 'choice_3_level', rarity: 'epic', icon: '🎁', weight: 2,
    titleRU: 'Выбор награды', titleUK: 'Вибір нагороди', titleES: 'Elige recompensa',
    descRU: 'Открой и выбери одну из трёх наград',
    descUK: 'Відкрий і вибери одну з трьох нагород',
    descES: 'Abre y elige una de tres recompensas',
    choices: [
      {
        id: 'cosmetic_avatar_common', rarity: 'rare', icon: '🎨', weight: 1,
        titleRU: 'Бесплатный аватар', titleUK: 'Безкоштовний аватар', titleES: 'Avatar gratis',
        descRU: 'Случайный аватар со случайным фоном откроется бесплатно',
        descUK: 'Випадковий аватар із випадковим фоном відкриється безкоштовно',
        descES: 'Un avatar aleatorio con fondo aleatorio se desbloquea gratis',
      },
    ],
  },
];

// Legacy definitions remain available only while historical spin receipts can reference them.
// They must never enter a new level-gift roll or milestone.
const RETIRED_LEVEL_GIFT_IDS = new Set([
  'wager_discount_25', 'choice_3_level',
  // PM-088: energy boosters/fulls are legacy receipt IDs only; never roll them.
  'energy_full', 'energy_plus1', 'energy_plus2', 'energy_plus3',
]);
const ACTIVE_LEVEL_GIFTS = GIFT_F2P.filter(gift => !RETIRED_LEVEL_GIFT_IDS.has(gift.id));

/** Premium-only gifts retained while legacy level rewards are being retired. */
const GIFT_PREMIUM: GiftDef[] = [
  {
    id: 'prem_shards_10', rarity: 'common', icon: '◈', weight: 5,
    titleRU: '+10 монет', titleUK: '+10 монет', titleEN: '+10 coins', titleES: '+10 monedas',
    descRU: 'Десять монет на баланс', descUK: 'Десять монет на баланс', descEN: 'Ten coins added to your balance', descES: 'Diez monedas para tu saldo',
  },
  {
    id: 'prem_shards_15', rarity: 'rare', icon: '◈', weight: 4,
    titleRU: '+15 монет', titleUK: '+15 монет', titleEN: '+15 coins', titleES: '+15 monedas',
    descRU: 'Пятнадцать монет на баланс', descUK: "П'ятнадцять монет на баланс", descEN: 'Fifteen coins added to your balance', descES: 'Quince monedas para tu saldo',
  },
  {
    id: 'prem_shards_20', rarity: 'epic', icon: '◈', weight: 4,
    titleRU: '+20 монет', titleUK: '+20 монет', titleEN: '+20 coins', titleES: '+20 monedas',
    descRU: 'Двадцать монет на баланс', descUK: 'Двадцять монет на баланс', descEN: 'Twenty coins added to your balance', descES: 'Veinte monedas para tu saldo',
  },
  {
    id: 'premium_cosmetic_avatar', rarity: 'epic', icon: '🎨', weight: 2,
    titleRU: 'Плюс-аватар бесплатно', titleUK: 'Плюс-аватар безкоштовно', titleES: 'Avatar Plus gratis',
    descRU: 'Случайный аватар со случайным фоном откроется бесплатно',
    descUK: 'Випадковий аватар із випадковим фоном відкриється безкоштовно',
    descES: 'Un avatar aleatorio con fondo aleatorio se desbloquea gratis',
  },
  {
    id: 'premium_cosmetic_aura', rarity: 'epic', icon: '✨', weight: 2,
    titleRU: 'Плюс-аура бесплатно', titleUK: 'Плюс-аура безкоштовно', titleES: 'Aura Plus gratis',
    descRU: 'Случайная аура аватара откроется бесплатно',
    descUK: 'Випадкова аура аватара відкриється безкоштовно',
    descES: 'Un aura de avatar aleatoria se desbloquea gratis',
  },
  {
    id: 'prem_pack_48h', rarity: 'epic', icon: '📦', weight: 1,
    titleRU: '48 ч пробного набора', titleUK: '48 год пробного набору', titleES: 'Pack de prueba 48 h',
    descRU: 'Случайный платный набор — полный просмотр 48 ч (см. таймер в магазине)',
    descUK: 'Випадковий платний набір — повний перегляд 48 год (таймер у магазині)',
    descES: 'Un pack de pago aleatorio — acceso completo 48 h (cuenta atrás en la tienda)',
  },
];

const spinRewardRarity = (entry: LevelSpinRewardCatalogEntry): GiftRarity => (
  entry.tier === 'ordinary' ? 'common' : entry.tier === 'rare' ? 'rare' : 'epic'
);

const spinRewardEntry = (id: LevelSpinRewardId): LevelSpinRewardCatalogEntry => {
  const entry = LEVEL_SPIN_REWARD_CATALOG.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`level_spin_reward_definition_orphan:${id}`);
  return entry;
};

const spinPearlGift = (amount: 5 | 10 | 20 | 50 | 100 | 250 | 500 | 1_000): GiftDef => {
  const entry = spinRewardEntry(`pearls_${amount}`);
  return {
    id: entry.id, rarity: spinRewardRarity(entry), spinTier: entry.tier, icon: '🫧', weight: entry.weight,
    // зачем (PM-008, Q74): жемчуг удалён — единственная валюта монеты, слово берём из общего словаря.
    titleRU: `+${amount} ${runeWord('ru', amount)}`, titleUK: `+${amount} ${runeWord('uk', amount)}`, titleES: `+${amount} ${runeWord('es', amount)}`,
    descRU: `${amount} ${runeWord('ru', amount)} на твой баланс`, descUK: `${amount} ${runeWord('uk', amount)} на твій баланс`,
    descES: `${amount} ${runeWord('es', amount)} para tu saldo`,
  };
};

const spinStarGift = (amount: 10 | 20 | 50 | 100 | 250 | 500 | 1_000 | 2_000): GiftDef => {
  const entry = spinRewardEntry(`stars_${amount}`);
  return {
    // зачем (владелец, 22.08): валюта переименована в руны — иконка стала
    // руническим глифом, эмодзи-звезда ушла вместе со словом.
    id: entry.id, rarity: spinRewardRarity(entry), spinTier: entry.tier, icon: RUNE_GLYPH_PRIMARY, weight: entry.weight,
    titleRU: `+${amount} ${runeWord('ru', amount)}`, titleUK: `+${amount} ${runeWord('uk', amount)}`, titleES: `+${amount} ${runeWord('es', amount)}`,
    descRU: `${amount} ${runeWord('ru', amount)} в единый баланс`, descUK: `${amount} ${runeWord('uk', amount)} у єдиний баланс`,
    descES: `${amount} ${runeWord('es', amount)} para el saldo único`,
  };
};

const spinPlusGift = (days: 3 | 7 | 14 | 30): GiftDef => {
  const entry = spinRewardEntry(`plus_days_${days}`);
  return {
    id: entry.id, rarity: spinRewardRarity(entry), spinTier: entry.tier, icon: '💎', weight: entry.weight,
    titleRU: `Plus на ${days} ${days === 3 ? 'дня' : 'дней'}`,
    titleUK: `Plus на ${days} ${days === 3 ? 'дні' : 'днів'}`,
    titleES: `Plus durante ${days} días`,
    descRU: `Временный доступ Plus на ${days} ${days === 3 ? 'дня' : 'дней'}`,
    descUK: `Тимчасовий доступ Plus на ${days} ${days === 3 ? 'дні' : 'днів'}`,
    descES: `Acceso Plus temporal durante ${days} días`,
  };
};

const spinAttemptRestoreGift = (): GiftDef => {
  const entry = spinRewardEntry('attempt_restore_all');
  return {
    id: entry.id,
    rarity: spinRewardRarity(entry),
    spinTier: entry.tier,
    icon: '❤️',
    weight: entry.weight,
    titleRU: 'Второй шанс',
    titleUK: 'Другий шанс',
    titleES: 'Segunda oportunidad',
    descRU: 'Восстанавливает все 3 попытки во время сессии',
    descUK: 'Відновлює всі 3 спроби під час сесії',
    descES: 'Restaura los 3 intentos durante la sesión',
  };
};

/** Definitions used only by local Spin v2. They are not another level-gift roll pool. */
const SPIN_REWARD_DEFS: GiftDef[] = [
  ...([5, 10, 20, 50, 100, 250, 500, 1_000] as const).map(spinPearlGift),
  ...([10, 20, 50, 100, 250, 500, 1_000, 2_000] as const).map(spinStarGift),
  spinPlusGift(3),
  spinPlusGift(7),
  spinPlusGift(14),
  spinPlusGift(30),
  spinAttemptRestoreGift(),
];

export const PREMIUM_LEVEL_GIFT_UNLOCK_PACK_IDS: readonly string[] = [];
const PREMIUM_LEVEL_GIFT_PACK_UNLOCK_DEFS: GiftDef[] = [];
export const PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE = 0;

const ROUND_LEVELS = new Set([10, 20, 30, 40, 50]);
const PREMIUM_BLOCKED_F2P_IDS = new Set<GiftId>([
  'energy_full',
  'energy_plus1',
  'energy_plus2',
  'energy_plus3',
]);
const FLASHCARD_PACK_LEVEL_GIFT_IDS = new Set<GiftId>([
  'pack_voucher_48h',
  'prem_pack_48h',
]);

export function isFlashcardPackLevelGiftId(gid: string | undefined | null): boolean {
  return !!gid && FLASHCARD_PACK_LEVEL_GIFT_IDS.has(gid);
}

function flashcardPackLevelGiftsAllowed(studyTarget?: RuntimeStudyTarget): boolean {
  return flashcardsOfficialPacksAvailableForTarget(studyTarget);
}

const isTrialPackLevelGiftId = (id: GiftId): boolean => id === 'pack_voucher_48h' || id === 'prem_pack_48h';

const weightedPick = (pool: GiftDef[], level: number): GiftDef => {
  const isRound = ROUND_LEVELS.has(level);
  const rr = Math.random();
  let target: GiftRarity;
  if (isRound) {
    target = rr < 0.6 ? 'rare' : 'epic';
  } else {
    if (rr < 0.6) target = 'common';
    else if (rr < 0.9) target = 'rare';
    else target = 'epic';
  }
  // Если в выбранном тире редкости пусто (напр. удалили последний подарок тира) — берём
  // полный пул, иначе sub[...] = undefined, а `!` маскировал бы это → краш на g.id у вызова.
  const sub = pool.filter(g => g.rarity === target);
  const effective = sub.length > 0 ? sub : pool;
  if (effective.length === 0) {
    throw new Error('weightedPick: пустой пул подарков level-gift');
  }
  const totalWeight = effective.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * totalWeight;
  for (const g of effective) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return effective[effective.length - 1];
};

/**
 * Синхронный ролл (без премиум-ветки и без анти-повторов) — тесты / миграции.
 */
export function rollGift(level: number): GiftDef {
  void level;
  throw new Error('level_gift_retired');
}

const cloneGiftDef = (gift: GiftDef): GiftDef => ({
  ...gift,
  choices: gift.choices?.map(choice => ({ ...choice })),
  levelGiftReservation: gift.levelGiftReservation ? { ...gift.levelGiftReservation } : undefined,
});

/** Replaces an offline/legacy roll with its canonical server-owned receipt before presentation. */
export async function reserveLevelGiftForDisplay(
  level: number,
  lane: 'f2p' | 'premium',
  opts?: { premiumSafe?: boolean; studyTarget?: RuntimeStudyTarget },
): Promise<GiftDef> {
  void level;
  void lane;
  void opts;
  throw new Error('level_gift_retired');
}

function sourceGatedFallbackGiftId(id: GiftId): GiftId {
  return isPremiumLevelGiftCopy(id) ? 'premium_cosmetic_avatar' : 'cosmetic_avatar_common';
}

function sourceGatedFallbackGiftDef(gift: GiftDef): GiftDef {
  const fallbackId = sourceGatedFallbackGiftId(gift.id);
  const fallbackPool = isPremiumLevelGiftCopy(gift.id) ? GIFT_PREMIUM : GIFT_F2P;
  return cloneGiftDef(fallbackPool.find(g => g.id === fallbackId) ?? gift);
}

const usefulFallbackGiftId = (rarity: GiftRarity): GiftId => {
  if (rarity === 'epic') return 'cosmetic_avatar_aura';
  if (rarity === 'rare') return 'hint_3';
  return 'cosmetic_avatar_common';
};

export function sanitizeLevelGiftForPremium(gift: GiftDef): GiftDef {
  if (!PREMIUM_BLOCKED_F2P_IDS.has(gift.id)) {
    return cloneGiftDef(gift);
  }
  const fallbackId = usefulFallbackGiftId(gift.rarity);
  return cloneGiftDef(GIFT_F2P.find(candidate => candidate.id === fallbackId) ?? gift);
}

export function premiumSafeLevelGiftId(giftId: string): string {
  const definition = ALL_LEVEL_GIFT_DEFS.find((gift) => gift.id === giftId);
  return definition ? sanitizeLevelGiftForPremium(definition).id : giftId;
}

function sanitizeRollableLevelGift(gift: GiftDef, premiumSafe: boolean): GiftDef {
  return premiumSafe ? sanitizeLevelGiftForPremium(gift) : cloneGiftDef(gift);
}

export function sanitizeLevelGiftForStudyTarget(gift: GiftDef, studyTarget?: RuntimeStudyTarget): GiftDef {
  if (flashcardPackLevelGiftsAllowed(studyTarget)) return cloneGiftDef(gift);
  if (isFlashcardPackLevelGiftId(gift.id) && !isTrialPackLevelGiftId(gift.id)) return sourceGatedFallbackGiftDef(gift);
  const cloned = cloneGiftDef(gift);
  if (cloned.choices?.length) {
    cloned.choices = cloned.choices.map(choice =>
      isFlashcardPackLevelGiftId(choice.id) && !isTrialPackLevelGiftId(choice.id)
        ? sourceGatedFallbackGiftDef(choice)
        : sanitizeLevelGiftForStudyTarget(choice, studyTarget),
    );
  }
  return cloned;
}

export const LEVEL_GIFT_MILESTONE_LEVELS = [5, 10, 15, 20, 25, 35, 40, 45, 80, 90] as const;

const LEVEL_GIFT_MILESTONE_IDS: Record<number, GiftId> = {
  5: 'hint_3',
  10: 'hint_3',
  15: 'cosmetic_avatar_common',
  20: 'hint_3',
  25: 'pack_voucher_48h',
  35: 'cosmetic_avatar_aura',
  40: 'cosmetic_avatar_aura',
  45: 'cosmetic_avatar_aura',
  80: 'cosmetic_avatar_aura',
  90: 'pack_voucher_48h',
};

export function getMilestoneLevelGift(level: number, opts?: { premiumSafe?: boolean; studyTarget?: RuntimeStudyTarget }): GiftDef | null {
  void level;
  void opts;
  return null;
}

/** F2P-пул: анти-triple-hint_1 на круглых уровнях; premiumSafe исключает бесполезные для премиум награды. */
export async function rollF2pLevelGiftForUser(level: number, opts?: { premiumSafe?: boolean; studyTarget?: RuntimeStudyTarget }): Promise<GiftDef> {
  void level;
  void opts;
  throw new Error('level_gift_retired');
}

/** Второй сундук — GIFT_PREMIUM + с шансом `PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE` навсегда один из пяти наборов (без повтора). */
export async function rollPremiumLevelGiftForUser(level: number, opts?: { studyTarget?: RuntimeStudyTarget }): Promise<GiftDef> {
  void level;
  void opts;
  throw new Error('level_gift_retired');
}

/**
 * Один сундук (тесты / редкие сценарии):
 *  - `false` или `null` → F2P
 *  - `true` → только премиум-пул
 */
export async function rollLevelGiftForUser(
  level: number,
  isPremium: boolean | null = null,
  opts?: { studyTarget?: RuntimeStudyTarget },
): Promise<GiftDef> {
  void level;
  void isPremium;
  void opts;
  throw new Error('level_gift_retired');
}

/** Storage */
export { BONUS_ENERGY_KEY, readBonusEnergy } from './bonus_energy_store';
let localLevelGiftApplyLock: Promise<void> = Promise.resolve();

const withLocalLevelGiftApplyLock = async <T>(work: () => Promise<T>): Promise<T> => {
  const previous = localLevelGiftApplyLock;
  let release!: () => void;
  localLevelGiftApplyLock = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
};

/**
 * Экономика «Монеты и Звёзды» (docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §7):
 * подарки за уровень больше НЕ выдают монеты — выдача обнулена.
 * Выдача подарков за уровень отключена; публичный compatibility API ничего не начисляет.
 * Сохранена как задокументированный §7-рубильник на случай возврата монетных подарков
 * и ради контракта owner_direction_runtime_contract (формат reason у локального фолбэка).
 */
export const grantLevelGiftShards = async (
  amount: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  // Level rewards no longer issue currency. Keep the
  // public compatibility API as an explicit no-op, but retain no dormant
  // projection writer that a future edit could accidentally reactivate.
  void amount;
  void accountToken;
};

/**
 * Компенсация по старой квитанции, когда темы кончились.
 *
 * зачем (владелец 2026-08-26): выплата в цену темы (200 жемчужин) была
 * отвергнута как слишком щедрая — вместо неё тема просто ПЕРЕСТАЁТ выпадать
 * (см. listExhaustedSpinRewardIds). Эта ветка остаётся лишь для квитанции,
 * выданной до открытия последней темы, и даёт столько же, сколько ауры в той
 * же ситуации, — чтобы подарок не оказался пустым.
 */
// зачем: D108 — выдача аур и кастомных аватаров удалена. Виды 'avatar'/'aura'
// остаются в типе ТОЛЬКО для чтения старых квитанций подарков из хранилища.
export type GiftCosmeticUnlock = {
  kind: 'avatar' | 'aura' | 'theme';
  id: string;
  gradientId?: string;
  logoColor?: 'black' | 'white';
  labelRu: string;
  labelUk: string;
  labelEs: string;
  /** True when an idempotent gift retry returned the already-granted avatar. */
  replayed?: boolean;
};

function themeGiftUnlockFor(mode: string): GiftCosmeticUnlock | null {
  const names = THEME_DISPLAY_NAMES[mode];
  if (!names) return null;
  return { kind: 'theme', id: mode, labelRu: names.ru, labelUk: names.uk, labelEs: names.es };
}

/**
 * Открыть случайную тему как подарок.
 *
 * Пишем ТОЛЬКО список купленных тем и НЕ переключаем активную тему: смена
 * оформления всего приложения без спроса — грубость, человек сам выберет её в
 * настройках. Ключ уходит в облачную синхронизацию и мержится объединением,
 * поэтому подарок переживает переустановку.
 */
export const unlockRandomThemeGift = async (): Promise<GiftCosmeticUnlock | null> => {
  try {
    const pool = await loadThemeGiftCandidates();
    if (pool.status === 'unavailable' || pool.candidates.length === 0) return null;
    const mode = pool.candidates[Math.floor(Math.random() * pool.candidates.length)]!;
    await AsyncStorage.setItem(OWNED_THEMES_KEY, JSON.stringify(mergeThemeModeLists(pool.owned, [mode])));
    return themeGiftUnlockFor(mode);
  } catch {
    return null;
  }
};

export const getBonusHintsToday = async (studyTarget?: RuntimeStudyTarget): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    return parseInt((await AsyncStorage.getItem(lessonBonusHintsKey(today, studyTarget))) || '0', 10) || 0;
  } catch { return 0; }
};

export interface ApplyGiftResult {
  success: boolean;
  alreadyClaimed?: boolean;
  energyBoostAlreadyActive?: boolean;
  cosmeticUnlocked?: GiftCosmeticUnlock;
}

const LEVEL_GIFT_EFFECT_RECEIPTS_KEY = 'level_gift_effect_receipts_v1';
const LEVEL_GIFT_EFFECT_RECEIPT_LIMIT = 128;

type LevelGiftEffectReceipt = {
  giftId: GiftId;
  status: 'prepared' | 'applying' | 'applied_unconfirmed' | 'applied';
  hint?: { key: string; target: number };
  energyBonus?: {
    amount: number;
    /** Temporary denominator increase. Optional only for legacy prepared receipts. */
    capacity?: number;
    expiresAt: number;
    energyTarget: number;
    energyBoostAlreadyActive: boolean;
  };
  energyFull?: {
    target: number;
    bonusCapacity?: number;
    bonusExpiresAt?: number;
  };
  singleUse?: {
    kind: 'club_boost' | 'wager_discount';
    target: number;
  };
  aura?: GiftCosmeticUnlock | null;
  customAvatar?: GiftCosmeticUnlock | null;
  theme?: GiftCosmeticUnlock | null;
  plus?: {
    days: 3 | 7 | 14 | 30;
    fromMs: number;
    untilMs: number;
    lifetime?: boolean;
  };
};

const levelGiftEffectOccurrenceKey = (
  id: GiftId,
  opts?: ApplyGiftOptions,
  slot = 'primary',
): string | null => {
  const stableId = opts?.accountToken?.stableId?.trim();
  const occurrenceId = opts?.occurrenceId?.trim();
  if (!stableId || !occurrenceId) return null;
  return `${safeLevelGiftEventPart(stableId, 80)}:${safeLevelGiftEventPart(occurrenceId, 120)}:${safeLevelGiftEventPart(id, 60)}:${safeLevelGiftEventPart(slot, 40)}`;
};

const readLevelGiftEffectReceipts = async (): Promise<Record<string, LevelGiftEffectReceipt>> => {
  const raw = await AsyncStorage.getItem(LEVEL_GIFT_EFFECT_RECEIPTS_KEY);
  if (raw === null) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('level_gift_effect_receipts_corrupt'); }
  if (!isPlainRecord(parsed)
    || Object.entries(parsed).some(([key, receipt]) => !isLevelGiftEffectReceiptForOccurrence(key, receipt))) {
    throw new Error('level_gift_effect_receipts_corrupt');
  }
  return parsed as Record<string, LevelGiftEffectReceipt>;
};

const saveLevelGiftEffectReceipt = async (
  occurrenceKey: string,
  receipt: LevelGiftEffectReceipt,
): Promise<void> => {
  if (!isLevelGiftEffectReceiptForOccurrence(occurrenceKey, receipt)) {
    throw new Error('level_gift_effect_receipt_invalid');
  }
  const current = await readLevelGiftEffectReceipts();
  const otherEntries = Object.entries(current).filter(([key]) => key !== occurrenceKey);
  // A prepared intent is recovery state, so it must never be evicted merely because
  // newer level gifts completed. Only terminal receipts are bounded.
  const preparedEntries = otherEntries.filter(([, value]) => value.status !== 'applied');
  const appliedEntries = otherEntries.filter(([, value]) => value.status === 'applied');
  const appliedBudget = Math.max(0, LEVEL_GIFT_EFFECT_RECEIPT_LIMIT - preparedEntries.length - 1);
  const bounded = Object.fromEntries([
    ...preparedEntries,
    ...(appliedBudget > 0 ? appliedEntries.slice(-appliedBudget) : []),
  ]) as Record<string, LevelGiftEffectReceipt>;
  bounded[occurrenceKey] = receipt;
  await AsyncStorage.setItem(LEVEL_GIFT_EFFECT_RECEIPTS_KEY, JSON.stringify(bounded));
  const verified = (await readLevelGiftEffectReceipts())[occurrenceKey];
  if (!verified || verified.giftId !== receipt.giftId || verified.status !== receipt.status) {
    throw new Error('level_gift_effect_receipt_not_durable');
  }
};

const prepareLevelGiftEffectReceipt = async (
  id: GiftId,
  opts: ApplyGiftOptions | undefined,
  create: () => Promise<LevelGiftEffectReceipt>,
  slot = 'primary',
): Promise<{ occurrenceKey: string; receipt: LevelGiftEffectReceipt } | null> => {
  const occurrenceKey = levelGiftEffectOccurrenceKey(id, opts, slot);
  if (!occurrenceKey) return null;
  if (opts?.accountToken && !isCurrentAccountGeneration(opts.accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  const existing = (await readLevelGiftEffectReceipts())[occurrenceKey];
  if (existing) {
    if (existing.giftId !== id) throw new Error('level_gift_effect_occurrence_mismatch');
    return { occurrenceKey, receipt: existing };
  }
  const receipt = await create();
  if (receipt.giftId !== id || receipt.status !== 'prepared') {
    throw new Error('level_gift_effect_receipt_invalid');
  }
  await saveLevelGiftEffectReceipt(occurrenceKey, receipt);
  return { occurrenceKey, receipt };
};

const markLevelGiftEffectApplied = async (
  staged: { occurrenceKey: string; receipt: LevelGiftEffectReceipt },
  opts?: ApplyGiftOptions,
): Promise<void> => {
  if (opts?.accountToken && !isCurrentAccountGeneration(opts.accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  if (staged.receipt.status !== 'prepared' && staged.receipt.status !== 'applying') return;
  // Remains pinned until the outer claim journal is durably effect_applied or
  // a terminal server receipt is observed.
  staged.receipt = { ...staged.receipt, status: 'applied_unconfirmed' };
  await saveLevelGiftEffectReceipt(staged.occurrenceKey, staged.receipt);
};

const confirmLevelGiftEffectReceipts = async (
  accountToken: AccountGenerationToken,
  occurrenceId: string,
): Promise<void> => {
  if (!accountToken.stableId || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
    throw new Error('level_gift_effect_account_changed');
  }
  const prefix = `${safeLevelGiftEventPart(accountToken.stableId, 80)}:${safeLevelGiftEventPart(occurrenceId, 120)}:`;
  const entries = Object.entries(await readLevelGiftEffectReceipts())
    .filter(([key, receipt]) => key.startsWith(prefix) && receipt.status === 'applied_unconfirmed');
  for (const [key, receipt] of entries) {
    await saveLevelGiftEffectReceipt(key, { ...receipt, status: 'applied' });
  }
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => (
  Object.keys(value).every((key) => allowed.includes(key))
);

type LevelGiftEffectPayloadField = Exclude<keyof LevelGiftEffectReceipt, 'giftId' | 'status'>;

const LEVEL_GIFT_RECEIPT_PAYLOAD_GIFT_IDS = Object.freeze({
  hint: new Set(['hint_1', 'hint_3']),
  energyBonus: new Set(['energy_plus1', 'energy_plus2', 'energy_plus3']),
  energyFull: new Set(['energy_full']),
  singleUse: new Set(['wager_discount_25']),
  aura: new Set([
    'cosmetic_avatar_aura', 'premium_cosmetic_aura',
    // Historical avatar-gift receipts could stage the aura fallback.
    'cosmetic_avatar_common', 'premium_cosmetic_avatar',
  ]),
  customAvatar: new Set(['cosmetic_avatar_common', 'premium_cosmetic_avatar']),
  theme: new Set(['cosmetic_theme']),
  plus: new Set(['plus_days_3', 'plus_days_7', 'plus_days_14', 'plus_days_30']),
} satisfies Record<LevelGiftEffectPayloadField, ReadonlySet<string>>);

const isCosmeticUnlock = (value: unknown, kind: GiftCosmeticUnlock['kind']): boolean => {
  if (value === null) return true;
  if (!isPlainRecord(value) || value.kind !== kind || typeof value.id !== 'string' || !value.id.trim()) return false;
  if (!hasOnlyKeys(value, ['kind', 'id', 'gradientId', 'logoColor', 'labelRu', 'labelUk', 'labelEs', 'replayed'])) return false;
  if (typeof value.labelRu !== 'string' || typeof value.labelUk !== 'string' || typeof value.labelEs !== 'string') return false;
  if (value.replayed !== undefined && typeof value.replayed !== 'boolean') return false;
  // зачем: D108 — каталоги аур/аватаров удалены; старые квитанции проверяем
  // только по форме, иначе история подарков стала бы «битой» и блокировала бы очередь.
  if (kind === 'aura') {
    return value.gradientId === undefined
      && value.logoColor === undefined
      && value.replayed === undefined;
  }
  if (kind === 'theme') {
    return value.gradientId === undefined
      && value.logoColor === undefined
      && value.replayed === undefined
      && Object.prototype.hasOwnProperty.call(THEME_DISPLAY_NAMES, value.id);
  }
  return typeof value.gradientId === 'string'
    && value.gradientId.trim().length > 0
    && (value.logoColor === 'black' || value.logoColor === 'white');
};

const isLevelGiftEffectReceipt = (value: unknown): value is LevelGiftEffectReceipt => {
  if (!isPlainRecord(value)
    || typeof value.giftId !== 'string'
    || !isKnownLevelGiftId(value.giftId)
    || (value.status !== 'prepared' && value.status !== 'applying'
      && value.status !== 'applied_unconfirmed' && value.status !== 'applied')) return false;
  const allowedKeys = new Set([
  'giftId', 'status', 'hint', 'energyBonus', 'energyFull',
    'singleUse', 'aura', 'customAvatar', 'theme', 'plus',
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;
  const payloads = (['hint', 'energyBonus', 'energyFull',
    'singleUse', 'aura', 'customAvatar', 'theme', 'plus'] as const)
    .filter((key): key is LevelGiftEffectPayloadField => Object.prototype.hasOwnProperty.call(value, key));
  if (payloads.length !== 1) return false;
  const payloadField = payloads[0]!;
  if (!LEVEL_GIFT_RECEIPT_PAYLOAD_GIFT_IDS[payloadField].has(value.giftId)) return false;
  if (value.hint !== undefined && (!isPlainRecord(value.hint) || !hasOnlyKeys(value.hint, ['key', 'target'])
    || typeof value.hint.key !== 'string' || !value.hint.key
    || !Number.isSafeInteger(value.hint.target) || Number(value.hint.target) < 0)) return false;
  if (value.energyBonus !== undefined && (!isPlainRecord(value.energyBonus)
    || !hasOnlyKeys(value.energyBonus, ['amount', 'capacity', 'expiresAt', 'energyTarget', 'energyBoostAlreadyActive'])
    || !Number.isSafeInteger(value.energyBonus.amount) || Number(value.energyBonus.amount) < 1
    || (value.energyBonus.capacity !== undefined
      && (!Number.isSafeInteger(value.energyBonus.capacity)
        || Number(value.energyBonus.capacity) < Number(value.energyBonus.amount)))
    || !isFiniteNumber(value.energyBonus.expiresAt) || Number(value.energyBonus.expiresAt) <= 0
    || !isFiniteNumber(value.energyBonus.energyTarget) || Number(value.energyBonus.energyTarget) < 0
    || typeof value.energyBonus.energyBoostAlreadyActive !== 'boolean')) return false;
  if (value.energyFull !== undefined && (!isPlainRecord(value.energyFull)
    || !hasOnlyKeys(value.energyFull, ['target', 'bonusCapacity', 'bonusExpiresAt'])
    || !isFiniteNumber(value.energyFull.target) || Number(value.energyFull.target) < 0
    || (value.energyFull.bonusCapacity !== undefined
      && (!Number.isSafeInteger(value.energyFull.bonusCapacity) || Number(value.energyFull.bonusCapacity) < 0))
    || (value.energyFull.bonusExpiresAt !== undefined
      && (!isFiniteNumber(value.energyFull.bonusExpiresAt) || Number(value.energyFull.bonusExpiresAt) <= 0))
    || ((value.energyFull.bonusCapacity === undefined) !== (value.energyFull.bonusExpiresAt === undefined)))) return false;
  if (value.singleUse !== undefined && (!isPlainRecord(value.singleUse) || !hasOnlyKeys(value.singleUse, ['kind', 'target'])
    || (value.singleUse.kind !== 'club_boost' && value.singleUse.kind !== 'wager_discount')
    || !Number.isSafeInteger(value.singleUse.target) || Number(value.singleUse.target) < 1)) return false;
  if (value.aura !== undefined && !isCosmeticUnlock(value.aura, 'aura')) return false;
  if (value.customAvatar !== undefined && !isCosmeticUnlock(value.customAvatar, 'avatar')) return false;
  if (value.theme !== undefined && !isCosmeticUnlock(value.theme, 'theme')) return false;
  if (value.plus !== undefined && (!isPlainRecord(value.plus) || !hasOnlyKeys(value.plus, ['days', 'fromMs', 'untilMs', 'lifetime'])
    || (value.plus.days !== 3 && value.plus.days !== 7 && value.plus.days !== 14 && value.plus.days !== 30)
    || !isFiniteNumber(value.plus.fromMs) || Number(value.plus.fromMs) < 0
    || !isFiniteNumber(value.plus.untilMs) || Number(value.plus.untilMs) < 0
    || (value.plus.lifetime !== undefined && typeof value.plus.lifetime !== 'boolean')
    || (value.giftId === 'plus_days_3' && value.plus.days !== 3)
    || (value.giftId === 'plus_days_7' && value.plus.days !== 7)
    || (value.giftId === 'plus_days_14' && value.plus.days !== 14)
    || (value.giftId === 'plus_days_30' && value.plus.days !== 30))) return false;
  if (value.status === 'applying'
    && value.aura == null && value.customAvatar == null && value.theme == null) return false;
  return true;
};

const levelGiftEffectReceiptSlot = (value: LevelGiftEffectReceipt): string => {
  // Property presence, not payload truthiness, is authoritative here: a
  // prepared null cosmetic fallback still belongs to its handler's slot.
  if (Object.prototype.hasOwnProperty.call(value, 'aura')) return 'aura';
  if (Object.prototype.hasOwnProperty.call(value, 'theme')) return 'theme';
  if (Object.prototype.hasOwnProperty.call(value, 'customAvatar')) return 'custom_avatar';
  return 'primary';
};

const isLevelGiftEffectReceiptForOccurrence = (
  occurrenceKey: string,
  value: unknown,
): value is LevelGiftEffectReceipt => (
  !!occurrenceKey.trim()
  && isLevelGiftEffectReceipt(value)
  && occurrenceKey.endsWith(
    `:${safeLevelGiftEventPart(value.giftId, 60)}:${levelGiftEffectReceiptSlot(value)}`,
  )
);

/**
 * Finalizes an inner effect receipt only after the caller has durably closed
 * its outer local-spin journal lane. Until then `applied_unconfirmed` receipts
 * stay pinned and cannot be evicted by the bounded terminal-receipt history.
 */
export const confirmDeferredLocalLevelGiftEffectReceipt = async (
  accountToken: AccountGenerationToken,
  occurrenceId: string,
): Promise<boolean> => {
  const normalizedOccurrenceId = occurrenceId.trim();
  if (!accountToken.stableId || !normalizedOccurrenceId) return false;
  try {
    return await withLocalLevelGiftApplyLock(() => withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return false;
      await confirmLevelGiftEffectReceipts(accountToken, normalizedOccurrenceId);
      return isCurrentAccountGeneration(accountToken, accountToken.stableId);
    }));
  } catch {
    return false;
  }
};

const applyHintGiftForOccurrence = async (
  id: GiftId,
  count: number,
  key: string,
  opts?: ApplyGiftOptions,
): Promise<boolean> => {
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    const current = Math.max(0, parseInt((await AsyncStorage.getItem(key)) || '0', 10) || 0);
    return { giftId: id, status: 'prepared', hint: { key, target: current + count } };
  });
  if (!staged) return false;
  const hint = staged.receipt.hint;
  if (!hint || hint.key !== key) throw new Error('level_gift_hint_receipt_invalid');
  if (staged.receipt.status !== 'prepared') return true;
  const current = Math.max(0, parseInt((await AsyncStorage.getItem(key)) || '0', 10) || 0);
  await AsyncStorage.setItem(key, String(Math.max(current, hint.target)));
  await markLevelGiftEffectApplied(staged, opts);
  return true;
};

const applyEnergyBonusForOccurrence = async (
  id: GiftId,
  n: 1 | 2 | 3,
  currentEnergy: number,
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult | null> => {
  const accountToken = opts?.accountToken ?? captureAccountGeneration();
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    if (!isCurrentAccountGeneration(accountToken)) {
      throw new Error('level_gift_effect_account_changed');
    }
    const existing = await readBonusEnergyForMutation(accountToken);
    const energyRaw = await AsyncStorage.getItem('energy_state');
    if (!isCurrentAccountGeneration(accountToken)) {
      throw new Error('level_gift_effect_account_changed');
    }
    const now = Date.now();
    const opening = coerceEnergyStateV2(
      energyRaw ? JSON.parse(energyRaw) : { current: currentEnergy, lastRecoveryTime: now },
      now,
    );
    const gift = applyEnergyCapacityGift({
      base: opening.current,
      bonus: existing?.amount ?? 0,
      capacity: existing?.capacity ?? 0,
      expiresAt: existing?.expiresAt ?? 0,
      maxEnergy,
    }, n * 20, getTomorrowMidnightMs());
    return {
      giftId: id,
      status: 'prepared',
      energyBonus: {
        amount: gift.bonus,
        capacity: gift.capacity,
        expiresAt: gift.expiresAt,
        // Legacy field name retained for replaying already-prepared receipts.
        // It now snapshots the unchanged base pool; the granted N lives only
        // in the account-scoped temporary bonus above.
        energyTarget: gift.base,
        energyBoostAlreadyActive: existing !== null && (existing.capacity ?? 0) > 0,
      },
    };
  });
  if (!staged) return null;
  const planned = staged.receipt.energyBonus;
  if (!planned) throw new Error('level_gift_energy_receipt_invalid');
  if (staged.receipt.status !== 'prepared') {
    return { success: true, energyBoostAlreadyActive: planned.energyBoostAlreadyActive };
  }
  if (!isCurrentAccountGeneration(accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  const existing = await readBonusEnergyForMutation(accountToken);
  // Already-prepared V1 receipts contain slot counts 1..N. Convert those once
  // at replay; new receipts always contain numeric-energy units (20/40/60).
  const plannedAmount = planned.amount < 20 ? planned.amount * 20 : planned.amount;
  const rawPlannedCapacity = planned.capacity ?? planned.amount;
  const plannedCapacity = rawPlannedCapacity < 20 ? rawPlannedCapacity * 20 : rawPlannedCapacity;
  const bonus: BonusEnergyState = {
    schemaVersion: 2,
    amount: Math.min(ENERGY_BONUS_CAPACITY_LIMIT, Math.max(existing?.amount ?? 0, plannedAmount)),
    capacity: Math.min(ENERGY_BONUS_CAPACITY_LIMIT, Math.max(existing?.capacity ?? 0, plannedCapacity)),
    expiresAt: Math.max(existing?.expiresAt ?? 0, planned.expiresAt),
  };
  const now = Date.now();
  const energyRaw = await AsyncStorage.getItem('energy_state');
  const opening = coerceEnergyStateV2(energyRaw ? JSON.parse(energyRaw) : null, now);
  await withStorageLock(async () => {
    await AsyncStorage.multiSet([
      ['energy_state', JSON.stringify(createFullEnergyState(now, maxEnergy))],
      [requireGiftAccountStorageKey(BONUS_ENERGY_KEY, accountToken), JSON.stringify(bonus)],
    ]);
  });
  if (!isCurrentAccountGeneration(accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  // All production callbacks reload EnergyContext. Do not materialize the
  // temporary pool in energy_state as well: that would count the gift twice.
  await setEnergy(maxEnergy);
  energyVisualTransactions.publish({
    operationId: `gift:${staged.occurrenceKey}`,
    from: opening.current + (existing?.amount ?? 0),
    to: maxEnergy + bonus.amount,
    reason: 'gift',
    source: 'gift',
  });
  await markLevelGiftEffectApplied(staged, opts);
  return { success: true, energyBoostAlreadyActive: planned.energyBoostAlreadyActive };
};

const persistEnergyFullProjection = async (
  planned: NonNullable<LevelGiftEffectReceipt['energyFull']>,
  maxEnergy: number,
  accountToken: AccountGenerationToken,
  accountTransitionLockLease?: AccountTransitionLockLease,
  staged?: { occurrenceKey: string; receipt: LevelGiftEffectReceipt },
): Promise<void> => {
  await withAccountTransitionLock(async () => {
    // Complete any legacy account-key materialization before entering the
    // non-reentrant storage lock used by every energy writer.
    await readBonusEnergyForMutation(accountToken);
    const bonusStorageKey = requireGiftAccountStorageKey(BONUS_ENERGY_KEY, accountToken);
    await withStorageLock(async () => {
      if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
        throw new Error('level_gift_effect_account_changed');
      }
      const now = Date.now();
      const [energyRaw, bonusRaw] = await Promise.all([
        AsyncStorage.getItem('energy_state'),
        AsyncStorage.getItem(bonusStorageKey),
      ]);
      if (energyRaw) {
        try { JSON.parse(energyRaw); } catch (e) {
          DebugLogger.error('level_gift_system:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
        }
      }
      const inspectedBonus = parseBonusEnergyStorageValue(bonusRaw, now);
      if (inspectedBonus.status === 'malformed') throw new Error('bonus_energy_storage_corrupt');
      const activeBonus = inspectedBonus.status === 'valid' ? inspectedBonus.value : null;
      const plannedCapacity = planned.bonusCapacity ?? activeBonus?.capacity ?? 0;
      const plannedExpiresAt = planned.bonusExpiresAt ?? activeBonus?.expiresAt ?? 0;
      const canFillPlannedBonus = activeBonus !== null
        && plannedExpiresAt > now
        && activeBonus.expiresAt === plannedExpiresAt;
      const filledBonus = canFillPlannedBonus
        ? {
          ...activeBonus,
          amount: Math.max(activeBonus.amount, Math.min(activeBonus.capacity, plannedCapacity)),
        }
        : activeBonus;
      const writes: [string, string][] = [[
        'energy_state',
        JSON.stringify(createFullEnergyState(now, Math.max(planned.target, maxEnergy))),
      ]];
      if (filledBonus) writes.push([bonusStorageKey, JSON.stringify(filledBonus)]);
      let appliedReceipt: LevelGiftEffectReceipt | null = null;
      if (staged) {
        const receipts = await readLevelGiftEffectReceipts();
        const durable = receipts[staged.occurrenceKey];
        if (!durable || durable.giftId !== staged.receipt.giftId
          || (durable.status !== 'prepared' && durable.status !== 'applying')) {
          throw new Error('level_gift_energy_full_receipt_conflict');
        }
        appliedReceipt = { ...durable, status: 'applied_unconfirmed' };
        writes.push([LEVEL_GIFT_EFFECT_RECEIPTS_KEY, JSON.stringify({
          ...receipts,
          [staged.occurrenceKey]: appliedReceipt,
        })]);
      }
      await AsyncStorage.multiSet(writes);
      if (staged && appliedReceipt) staged.receipt = appliedReceipt;
      if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
        throw new Error('level_gift_effect_account_changed');
      }
    });
  }, accountTransitionLockLease);
};

const applyEnergyFullForOccurrence = async (
  id: 'energy_full',
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<boolean> => {
  const accountToken = opts?.accountToken ?? captureAccountGeneration();
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    const activeBonus = await readBonusEnergyForMutation(accountToken);
    return {
      giftId: id,
      status: 'prepared',
      energyFull: {
        target: maxEnergy,
        ...(activeBonus ? {
          bonusCapacity: activeBonus.capacity,
          bonusExpiresAt: activeBonus.expiresAt,
        } : {}),
      },
    };
  });
  if (!staged) return false;
  const planned = staged.receipt.energyFull;
  if (!planned) throw new Error('level_gift_energy_full_receipt_invalid');
  if (staged.receipt.status !== 'prepared') return true;
  if (!isCurrentAccountGeneration(accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  await persistEnergyFullProjection(
    planned,
    maxEnergy,
    accountToken,
    opts?.accountTransitionLockLease,
    staged,
  );
  if (!isCurrentAccountGeneration(accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  await setEnergy(maxEnergy);
  energyVisualTransactions.publish({
    operationId: `gift:${staged.occurrenceKey}`,
    from: 0,
    to: maxEnergy + (planned.bonusCapacity ?? 0),
    reason: 'refill',
    source: 'gift',
  });
  await markLevelGiftEffectApplied(staged, opts);
  return true;
};

const applySpinPlusForOccurrence = async (
  id: 'plus_days_3' | 'plus_days_7' | 'plus_days_14' | 'plus_days_30',
  days: 3 | 7 | 14 | 30,
  opts?: ApplyGiftOptions,
): Promise<boolean> => {
  const accountToken = opts?.accountToken ?? captureAccountGeneration();
  const stableId = accountToken.stableId;
  if (!stableId || !isCurrentAccountGeneration(accountToken, stableId)) {
    throw new Error('level_spin_plus_identity_not_ready');
  }
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    const nowMs = Date.now();
    const existing = await readVipSnapshotForAccount(stableId);
    if (!isCurrentAccountGeneration(accountToken, stableId)) {
      throw new Error('level_spin_plus_identity_changed');
    }
    const previousUntil = Math.max(0, Number(existing?.vip_until) || 0);
    const previousPlan = String(existing?.vip_plan ?? '').trim().toLowerCase();
    const lifetime = existing?.vip_active === 'true'
      && (previousUntil <= 0 || previousPlan === 'lifetime' || previousPlan === 'pro_lifetime');
    return {
      giftId: id,
      status: 'prepared',
      plus: {
        days,
        fromMs: nowMs,
        untilMs: lifetime ? 0 : Math.max(nowMs, previousUntil) + days * 24 * 60 * 60 * 1_000,
        ...(lifetime ? { lifetime: true } : {}),
      },
    };
  });
  if (!staged) return false;
  const planned = staged.receipt.plus;
  if (!planned || planned.days !== days || (planned.lifetime !== true && planned.untilMs <= planned.fromMs)) {
    throw new Error('level_spin_plus_receipt_invalid');
  }
  if (staged.receipt.status !== 'prepared') return true;
  const existing = await readVipSnapshotForAccount(stableId);
  if (!isCurrentAccountGeneration(accountToken, stableId)) {
    throw new Error('level_spin_plus_identity_changed');
  }
  const currentUntil = Math.max(0, Number(existing?.vip_until) || 0);
  const currentPlan = String(existing?.vip_plan ?? '').trim().toLowerCase();
  const currentLifetime = existing?.vip_active === 'true'
    && (currentUntil <= 0 || currentPlan === 'lifetime' || currentPlan === 'pro_lifetime');
  if (currentLifetime) {
    if (existing && currentUntil > 0) {
      await AsyncStorage.multiSet(prepareVipSnapshotWritesForAccount(stableId, {
        ...existing,
        vip_until: '0',
      }));
    }
  } else if (planned.lifetime !== true) {
    await AsyncStorage.multiSet(prepareVipSnapshotWritesForAccount(stableId, {
      vip_active: 'true',
      vip_plan: 'level_spin',
      vip_from: String(planned.fromMs),
      vip_until: String(Math.max(planned.untilMs, currentUntil)),
      vip_admin_override: 'true',
      vip_admin_grant_at: String(planned.fromMs),
    }));
  } else if (existing && Number(existing.vip_until) > 0) {
    await AsyncStorage.multiSet(prepareVipSnapshotWritesForAccount(stableId, {
      ...existing,
      vip_until: '0',
    }));
  }
  await markLevelGiftEffectApplied(staged, opts);
  emitAppEvent('vip_activated');
  emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
  return true;
};

const persistPreparedCosmeticNull = async (
  staged: { occurrenceKey: string; receipt: LevelGiftEffectReceipt },
  field: 'aura' | 'theme' | 'customAvatar',
): Promise<void> => {
  if (staged.receipt.status !== 'prepared' || staged.receipt[field] === null) return;
  staged.receipt = { ...staged.receipt, [field]: null };
  await saveLevelGiftEffectReceipt(staged.occurrenceKey, staged.receipt);
};

const markLevelGiftCosmeticApplying = async (
  staged: { occurrenceKey: string; receipt: LevelGiftEffectReceipt },
  opts?: ApplyGiftOptions,
): Promise<void> => {
  if (opts?.accountToken && !isCurrentAccountGeneration(opts.accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  if (staged.receipt.status !== 'prepared') return;
  staged.receipt = { ...staged.receipt, status: 'applying' };
  await saveLevelGiftEffectReceipt(staged.occurrenceKey, staged.receipt);
};

const applyThemeGiftForOccurrence = async (
  id: GiftId,
  opts?: ApplyGiftOptions,
): Promise<{ handled: boolean; cosmeticUnlocked: GiftCosmeticUnlock | null }> => {
  // Ровно та же схема, что у ауры: тема ВЫБИРАЕТСЯ в момент подготовки чека и
  // фиксируется в нём. Повтор (ретрай после обрыва, второй тап) вернёт ту же
  // тему, а не разыграет вторую — иначе один спин открывал бы две темы.
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    const pool = await loadThemeGiftCandidates();
    if (pool.status === 'unavailable') {
      if (pool.reason === 'read_failed') throw new Error('theme_gift_ownership_read_failed');
      return { giftId: id, status: 'prepared', theme: null };
    }
    const mode = pool.candidates[Math.floor(Math.random() * pool.candidates.length)];
    return {
      giftId: id,
      status: 'prepared',
      theme: mode ? themeGiftUnlockFor(mode) : null,
    };
  }, 'theme');
  if (!staged) return { handled: false, cosmeticUnlocked: null };
  let result = staged.receipt.theme ?? null;
  if (staged.receipt.status === 'applied' || staged.receipt.status === 'applied_unconfirmed') {
    return { handled: true, cosmeticUnlocked: result };
  }
  const replayingApplying = staged.receipt.status === 'applying';
  if (result) {
    const pool = await loadThemeGiftCandidates();
    if (pool.status === 'unavailable') {
      if (pool.reason === 'read_failed') throw new Error('theme_gift_ownership_read_failed');
      if (replayingApplying) throw new Error('theme_gift_ownership_corrupt');
      await persistPreparedCosmeticNull(staged, 'theme');
      result = null;
    }
    if (!replayingApplying && result && pool.status === 'available' && !pool.candidates.includes(result.id)) {
      await persistPreparedCosmeticNull(staged, 'theme');
      result = null;
    }
    if (result && pool.status === 'available') {
      await markLevelGiftCosmeticApplying(staged, opts);
      await AsyncStorage.setItem(OWNED_THEMES_KEY, JSON.stringify(mergeThemeModeLists(pool.owned, [result.id])));
    }
  }
  await markLevelGiftEffectApplied(staged, opts);
  return { handled: true, cosmeticUnlocked: result };
};

export const acquireLevelGiftDisplay = async (
  level: number,
  gift: GiftDef,
  studyTarget?: RuntimeStudyTarget,
): Promise<'acquired' | 'already_displayed' | 'unavailable'> => {
  void level;
  void gift;
  void studyTarget;
  return 'unavailable';
};

const LEVEL_GIFT_APPLY_JOURNAL_KEY = 'level_gift_apply_journal_v1';
type LevelGiftApplyJournalEntry = {
  reservationId: string;
  giftId: string;
  claimToken: string;
  status: 'prepared' | 'effect_applied';
};

const applyEnergyBonusN = async (
  n: 1 | 2 | 3,
  currentEnergy: number,
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult> => {
  const accountToken = opts?.accountToken ?? captureAccountGeneration();
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return { success: false };
    const existing = await readBonusEnergyForMutation(accountToken);
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return { success: false };
    const energyBoostAlreadyActive = existing !== null && (existing.capacity ?? 0) > 0;
    const added = n * 20;
    const accumulatedCapacity = Math.min(
      ENERGY_BONUS_CAPACITY_LIMIT,
      (existing?.capacity ?? 0) + added,
    );
    const bonus: BonusEnergyState = {
      schemaVersion: 2,
      amount: accumulatedCapacity,
      capacity: accumulatedCapacity,
      expiresAt: getTomorrowMidnightMs(),
    };
    const now = Date.now();
    await withStorageLock(async () => {
      await AsyncStorage.multiSet([
        ['energy_state', JSON.stringify(createFullEnergyState(now, maxEnergy))],
        [requireGiftAccountStorageKey(BONUS_ENERGY_KEY, accountToken), JSON.stringify(bonus)],
      ]);
    });
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return { success: false };
    // The temporary pool is already born full. Refresh consumers without also
    // adding N to persistent base energy (which would duplicate the reward).
    await setEnergy(maxEnergy);
    return { success: true, energyBoostAlreadyActive };
  }, opts?.accountTransitionLockLease);
};

const safeLevelGiftEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

async function activateLevelPackGift(gift: GiftDef, opts?: ApplyGiftOptions): Promise<{
  stableId: string;
  voucherId: string;
  expiresAt: number;
  allowedPackId?: string;
} | null> {
  void gift;
  void opts;
  return null;
}

export interface ApplyGiftOptions {
  isPremium?: boolean;
  studyTarget?: RuntimeStudyTarget;
  accountToken?: AccountGenerationToken;
  occurrenceId?: string;
  preserveGiftId?: boolean;
  spinDeliveryToken?: string;
  /** Apply the already-issued local gift without the server reservation protocol. */
  localOnly?: boolean;
  /** Caller will confirm the inner receipt after its outer local journal is durable. */
  deferEffectReceiptConfirmation?: boolean;
  /** Internal capability propagated only by withAccountTransitionLock. */
  accountTransitionLockLease?: AccountTransitionLockLease;
}

export const applyGift = async (
  gift: GiftDef,
  userName: string,
  currentEnergy: number,
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult> => {
  void gift;
  void userName;
  void currentEnergy;
  void maxEnergy;
  void setEnergy;
  void opts;
  return { success: false };
};

export function isEnergyBonusGiftId(gid: string | undefined): boolean {
  if (!gid) return false;
  return gid === 'energy_plus1' || gid === 'energy_plus2' || gid === 'energy_plus3';
}

/** Amount for the real spin-only pearl rewards. */
export function giftShardAmount(gid: string | undefined): number {
  const match = /^pearls_(5|10|20|50|100|250|500|1000)$/.exec(String(gid ?? ''));
  return match ? Number(match[1]) : 0;
}

export const ALL_LEVEL_GIFT_DEFS: GiftDef[] = [
  ...GIFT_F2P,
  ...GIFT_PREMIUM,
  ...PREMIUM_LEVEL_GIFT_PACK_UNLOCK_DEFS,
  ...SPIN_REWARD_DEFS,
];

export function isKnownLevelGiftId(giftId: string): boolean {
  return ALL_LEVEL_GIFT_DEFS.some((gift) =>
    gift.id === giftId || gift.choices?.some((choice) => choice.id === giftId) === true);
}

export { ACTIVE_LEVEL_GIFTS as GIFT_POOL };
export default {};
