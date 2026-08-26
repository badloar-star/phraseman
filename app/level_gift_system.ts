/**
 * Level-Up Gift System — подарок при повышении уровня.
 *
 * F2P — расширенный пул: мгновенный XP, энергия до полуночи, буст лиги, пари-скидка, …
 * Premium — отдельный пул: крупный мгновенный XP + редко проба набора 48ч + с низким шансом
 *   постоянное открытие одного из пяти фирменных наборов (Negotiator, Dark Logic, Wild West,
 *   Royal Tea, Peaky Blinders), без повторов того же набора из этой дорожки.
 *
 * Обычный уровень: 60% common / 30% rare / 10% epic.
 * Круг (10,20,30,40,50): только rare/epic 60%/40%.
 * Anti-frustration на круге: не выдать hint_1 третий подряд (см. историю).
 *
 * Множитель XP: 'gift_xp_multiplier' → { multiplier, expiresAt }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  writeGiftAccountValue,
} from './gift_account_storage';
import {
  BONUS_ENERGY_KEY,
  getTomorrowMidnightMs,
  readBonusEnergyForMutation,
  type BonusEnergyState,
} from './bonus_energy_store';
import { InteractionManager } from 'react-native';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { RUNE_GLYPH_PRIMARY, runeWord } from '../constants/runes';
import {
  CUSTOM_AVATAR_GIFT_OWNED_KEY,
  CUSTOM_AVATAR_GIFT_REPLAY_KEY,
} from '../constants/customization_storage_keys';
import {
  setClubGiftFreeBoostCountFromAuthority,
} from './club_boosts';
import {
  OFFICIAL_DARK_LOGIC_EN_ID,
  OFFICIAL_NEGOTIATOR_EN_ID,
  OFFICIAL_PEAKY_BLINDERS_EN_ID,
  OFFICIAL_ROYAL_TEA_EN_ID,
  OFFICIAL_WILD_WEST_EN_ID,
} from './flashcards/bundles/packIds';
import { addOwnedPackId, primeMarketplaceBuiltCardsCacheFromAccessibleStorage } from './flashcards/marketplace';
import { setRandomPackGiftTrial48h } from './flashcards/pack_trial_gift';
import {
  callFlashcardPackGiftRedeem,
  callLevelGiftActivatePackGift,
  callLevelGiftReserve,
  callLevelGiftReservationAction,
  callLevelSpinActivatePackGift,
  callLevelSpinDeliveryAction,
} from './community_packs/functionsClient';
import { getCanonicalUserId } from './user_id_policy';
import { flashcardsOfficialPacksAvailableForTarget } from './flashcards_target_gate';
import {
  registerXP,
  withXpAccountOperationQueue,
  type XpOperationLease,
} from './xp_manager';
import { getVerifiedPremiumStatus } from './premium_guard';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATARS,
  CUSTOM_AVATAR_GIFT_POOL,
  CUSTOM_AVATAR_OWNED_KEY,
  customAvatarGiftLabelForLang,
  getCustomAvatarGiftWeight,
  type CustomAvatarLogoColor,
} from '../constants/custom_avatars';
import {
  AVATAR_AURA_GIFT_OWNED_KEY,
  AVATAR_AURA_OWNED_KEY,
  AVATAR_AURAS,
  USER_AVATAR_AURA_KEY,
  type AvatarAuraDef,
} from '../constants/avatar_auras';
import { lessonBonusHintsKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { THEME_DISPLAY_NAMES } from './theme_display_names';
// зачем: пул кандидатов общий с розыгрышем (local_level_spins) — иначе
// «какие темы остались» считалось бы в двух местах и разъехалось бы.
import { loadThemeGiftCandidates } from './theme_gift_pool';
import {
  getSpinCustomAvatarGiftWeight,
  listSpinCustomAvatarGiftCandidates,
} from './spin_avatar_gift_pool';
import { parseStrictOwnedIdMap } from './spin_gift_storage_integrity';
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
import { commitShardCreditOperation } from './shards_system';
import { emitAppEvent } from './events';
import { prepareVipSnapshotWritesForAccount, readVipSnapshotForAccount } from './premium_vip_storage';
import { enqueueLevelSpinStarGrant } from './level_spin_star_grants';
import {
  LEVEL_SPIN_REWARD_CATALOG,
  type LevelSpinRewardCatalogEntry,
  type LevelSpinRewardId,
} from './level_spin_reward_catalog';
import { creditAttemptRestoreGiftFromSpin } from './session_attempts/session_attempt_restore_inventory';

export type GiftRarity = 'common' | 'rare' | 'epic';

export type GiftId = string;

export interface GiftDef {
  id:      GiftId;
  rarity:  GiftRarity;
  icon:    string;
  titleRU: string;
  titleUK: string;
  /** Если пусто при lang es — показываем titleRU */
  titleES?: string;
  descRU:  string;
  descUK:  string;
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
    ['xp_500', 'xp_1000', 'xp_3000', 'xp_5000', 'xp_10000', 'xp_25000', 'xp_50000'],
    (id) => {
      const amount = Number(id.slice(3));
      return {
        title: { 'pt-BR': `+${amount} XP`, vi: `+${amount} XP`, id: `+${amount} XP`, tr: `+${amount} XP`, pl: `+${amount} XP` },
        desc: { 'pt-BR': `+${amount} XP instantâneos`, vi: `Nhận ngay ${amount} XP`, id: `${amount} XP instan`, tr: `Anında ${amount} XP`, pl: `Natychmiast ${amount} XP` },
      };
    },
  ),
  ...makeSpinPlannedCopy(
    ['pearls_5', 'pearls_10', 'pearls_20', 'pearls_50', 'pearls_100', 'pearls_250', 'pearls_500'],
    (id) => {
      const amount = Number(id.slice('pearls_'.length));
      return {
        title: { 'pt-BR': `+${amount} pérolas`, vi: `+${amount} ngọc trai`, id: `+${amount} mutiara`, tr: `+${amount} inci`, pl: `+${amount} pereł` },
        desc: { 'pt-BR': `${amount} pérolas para o seu saldo`, vi: `${amount} ngọc trai vào số dư của bạn`, id: `${amount} mutiara ke saldomu`, tr: `Bakiyene ${amount} inci`, pl: `${amount} pereł do twojego salda` },
      };
    },
  ),
  ...makeSpinPlannedCopy(
    ['stars_10', 'stars_20', 'stars_50', 'stars_100', 'stars_250', 'stars_500', 'stars_1000'],
    (id) => {
      const amount = Number(id.slice('stars_'.length));
      return {
        title: { 'pt-BR': `+${amount} estrelas`, vi: `+${amount} sao`, id: `+${amount} bintang`, tr: `+${amount} yıldız`, pl: `+${amount} gwiazdek` },
        desc: { 'pt-BR': `${amount} estrelas para o saldo único`, vi: `${amount} sao vào số dư chung`, id: `${amount} bintang ke saldo terpadu`, tr: `Birleşik bakiyene ${amount} yıldız`, pl: `${amount} gwiazdek do wspólnego salda` },
      };
    },
  ),
  ...makeSpinPlannedCopy(['plus_days_3', 'plus_days_7'], (id) => {
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
    desc: { 'pt-BR': 'Todos os espaços de energia foram restaurados agora', vi: 'Tất cả ô năng lượng được hồi phục ngay bây giờ', id: 'Semua slot energi dipulihkan sekarang', tr: 'Tüm enerji yuvaları şimdi yenilendi', pl: 'Wszystkie sloty energii zostały odnowione' },
  },
  energy_plus1: {
    title: { 'pt-BR': '+1 energia até meia-noite', vi: '+1 năng lượng đến nửa đêm', id: '+1 energi sampai tengah malam', tr: 'Gece yarısına kadar +1 enerji', pl: '+1 energia do północy' },
    desc: { 'pt-BR': 'Um espaço extra de energia até meia-noite (acumula com outros bônus)', vi: 'Một ô năng lượng thưởng đến nửa đêm (cộng dồn với các bonus khác)', id: 'Satu slot energi bonus sampai tengah malam (menumpuk dengan bonus lain)', tr: 'Gece yarısına kadar bir bonus enerji yuvası (diğer bonuslarla birikir)', pl: 'Jeden dodatkowy slot energii do północy (kumuluje się z innymi bonusami)' },
  },
  xp_50: {
    title: { 'pt-BR': '+50 XP', vi: '+50 XP', id: '+50 XP', tr: '+50 XP', pl: '+50 XP' },
    desc: { 'pt-BR': '+50 XP instantâneos', vi: '+50 XP ngay lập tức', id: '+50 XP instan', tr: 'Anında +50 XP', pl: 'Natychmiastowe +50 XP' },
  },
  xp_100: {
    title: { 'pt-BR': '+100 XP', vi: '+100 XP', id: '+100 XP', tr: '+100 XP', pl: '+100 XP' },
    desc: { 'pt-BR': '+100 XP instantâneos', vi: '+100 XP ngay lập tức', id: '+100 XP instan', tr: 'Anında +100 XP', pl: 'Natychmiastowe +100 XP' },
  },
  xp_250: {
    title: { 'pt-BR': '+250 XP', vi: '+250 XP', id: '+250 XP', tr: '+250 XP', pl: '+250 XP' },
    desc: { 'pt-BR': '+250 XP instantâneos', vi: '+250 XP ngay lập tức', id: '+250 XP instan', tr: 'Anında +250 XP', pl: 'Natychmiastowe +250 XP' },
  },
  hint_1: {
    title: { 'pt-BR': '+1 dica', vi: '+1 gợi ý', id: '+1 petunjuk', tr: '+1 ipucu', pl: '+1 podpowiedź' },
    desc: { 'pt-BR': 'Uma dica extra nas lições de hoje', vi: 'Một gợi ý thêm trong các bài học hôm nay', id: 'Satu petunjuk ekstra di pelajaran hari ini', tr: 'Bugünkü derslerde ekstra bir ipucu', pl: 'Dodatkowa podpowiedź w dzisiejszych lekcjach' },
  },
  shards_3: {
    title: { 'pt-BR': '+150 XP', vi: '+150 XP', id: '+150 XP', tr: '+150 XP', pl: '+150 XP' },
    desc: { 'pt-BR': '+150 XP instantâneos', vi: '+150 XP ngay lập tức', id: '+150 XP instan', tr: 'Anında +150 XP', pl: 'Natychmiastowe +150 XP' },
  },
  xp_bank_150: {
    title: { 'pt-BR': 'Bônus ×2 para 150 XP', vi: 'Thưởng ×2 cho 150 XP', id: 'Bonus ×2 untuk 150 XP', tr: '150 XP için ×2 bonus', pl: 'Bonus ×2 na 150 XP' },
    desc: { 'pt-BR': 'Os próximos 150 XP são dobrados. Só é gasto ao estudar', vi: '150 XP tiếp theo được nhân đôi. Chỉ dùng khi học', id: '150 XP berikutnya digandakan. Hanya terpakai saat belajar', tr: 'Sonraki 150 XP ikiye katlanır. Yalnızca çalışırken harcanır', pl: 'Następne 150 XP zostanie podwojone. Zużywa się tylko podczas nauki' },
  },
  focus_10m_25: {
    title: { 'pt-BR': 'Foco 10 min', vi: 'Tập trung 10 phút', id: 'Fokus 10 menit', tr: '10 dk odak', pl: 'Fokus 10 min' },
    desc: { 'pt-BR': '10 minutos de multiplicador de XP ×1,25', vi: '10 phút nhân XP ×1,25', id: '10 menit pengali XP ×1,25', tr: '10 dakika XP çarpanı ×1,25', pl: '10 minut mnożnika XP ×1,25' },
  },
  xp_2x_24h: {
    title: { 'pt-BR': '+100% XP por 24 horas', vi: '+100% XP trong 24 giờ', id: '+100% XP selama 24 jam', tr: '24 saat +%100 XP', pl: '+100% XP przez 24 godz.' },
    desc: { 'pt-BR': 'Todas as atividades dão +100% XP por um dia', vi: 'Mọi hoạt động cho thêm +100% XP trong 1 ngày', id: 'Semua aktivitas memberi +100% XP selama satu hari', tr: 'Tüm çalışmalar 1 gün boyunca +%100 XP verir', pl: 'Wszystkie aktywności dają +100% XP przez 1 dzień' },
  },
  energy_plus2: {
    title: { 'pt-BR': '+2 energia até meia-noite', vi: '+2 năng lượng đến nửa đêm', id: '+2 energi sampai tengah malam', tr: 'Gece yarısına kadar +2 enerji', pl: '+2 energia do północy' },
    desc: { 'pt-BR': 'Dois espaços extras de energia até meia-noite', vi: 'Hai ô năng lượng thưởng đến nửa đêm', id: 'Dua slot energi bonus sampai tengah malam', tr: 'Gece yarısına kadar iki bonus enerji yuvası', pl: 'Dwa dodatkowe sloty energii do północy' },
  },
  chain_shield_1: {
    title: { 'pt-BR': 'Escudo de sequência', vi: 'Khiên chuỗi ngày', id: 'Perisai rentetan', tr: 'Seri kalkanı', pl: 'Tarcza serii' },
    desc: { 'pt-BR': 'Um dia sem estudar não quebra sua sequência', vi: 'Một ngày không học sẽ không làm đứt chuỗi của bạn', id: 'Satu hari tanpa belajar tidak memutus rentetanmu', tr: 'Bir gün çalışmamak serini bozmaz', pl: 'Jeden dzień bez nauki nie przerwie twojej serii' },
  },
  hint_3: {
    title: { 'pt-BR': '+3 dicas', vi: '+3 gợi ý', id: '+3 petunjuk', tr: '+3 ipucu', pl: '+3 podpowiedzi' },
    desc: { 'pt-BR': 'Três dicas extras nas lições de hoje', vi: 'Ba gợi ý thêm trong các bài học hôm nay', id: 'Tiga petunjuk ekstra di pelajaran hari ini', tr: 'Bugünkü derslerde üç ekstra ipucu', pl: 'Trzy dodatkowe podpowiedzi w dzisiejszych lekcjach' },
  },
  shards_6: {
    title: { 'pt-BR': '+350 XP', vi: '+350 XP', id: '+350 XP', tr: '+350 XP', pl: '+350 XP' },
    desc: { 'pt-BR': '+350 XP instantâneos: recompensa rara', vi: '+350 XP ngay lập tức: phần thưởng hiếm', id: '+350 XP instan: hadiah langka', tr: 'Anında +350 XP: nadir ödül', pl: 'Natychmiastowe +350 XP: rzadka nagroda' },
  },
  xp_bank_300: {
    title: { 'pt-BR': 'Bônus ×2 para 300 XP', vi: 'Thưởng ×2 cho 300 XP', id: 'Bonus ×2 untuk 300 XP', tr: '300 XP için ×2 bonus', pl: 'Bonus ×2 na 300 XP' },
    desc: { 'pt-BR': 'Os próximos 300 XP são dobrados. Só é gasto ao estudar', vi: '300 XP tiếp theo được nhân đôi. Chỉ dùng khi học', id: '300 XP berikutnya digandakan. Hanya terpakai saat belajar', tr: 'Sonraki 300 XP ikiye katlanır. Yalnızca çalışırken harcanır', pl: 'Następne 300 XP zostanie podwojone. Zużywa się tylko podczas nauki' },
  },
  focus_15m_50: {
    title: { 'pt-BR': 'Foco 15 min', vi: 'Tập trung 15 phút', id: 'Fokus 15 menit', tr: '15 dk odak', pl: 'Fokus 15 min' },
    desc: { 'pt-BR': '15 minutos de multiplicador de XP ×1,5', vi: '15 phút nhân XP ×1,5', id: '15 menit pengali XP ×1,5', tr: '15 dakika XP çarpanı ×1,5', pl: '15 minut mnożnika XP ×1,5' },
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
  club_boost_free: {
    title: { 'pt-BR': 'Boost de liga grátis', vi: 'Tăng lực giải đấu miễn phí', id: 'Boost liga gratis', tr: 'Ücretsiz lig boostu', pl: 'Darmowy boost ligi' },
    desc: { 'pt-BR': 'A próxima ativação do boost da liga não custa pérolas', vi: 'Lần kích hoạt tăng lực giải đấu tiếp theo không tốn xu', id: 'Aktivasi boost liga berikutnya tidak membutuhkan koin', tr: 'Bir sonraki lig boostu etkinleştirmesi jeton harcamaz', pl: 'Następna aktywacja boostu ligi nie kosztuje monet' },
  },
  xp_2x_48h: {
    title: { 'pt-BR': '+100% XP por 48 horas', vi: '+100% XP trong 48 giờ', id: '+100% XP selama 48 jam', tr: '48 saat +%100 XP', pl: '+100% XP przez 48 godz.' },
    desc: { 'pt-BR': 'Todas as atividades dão +100% XP por dois dias', vi: 'Mọi hoạt động cho thêm +100% XP trong 2 ngày', id: 'Semua aktivitas memberi +100% XP selama dua hari', tr: 'Tüm çalışmalar 2 gün boyunca +%100 XP verir', pl: 'Wszystkie aktywności dają +100% XP przez 2 dni' },
  },
  energy_plus3: {
    title: { 'pt-BR': '+3 energia até meia-noite', vi: '+3 năng lượng đến nửa đêm', id: '+3 energi sampai tengah malam', tr: 'Gece yarısına kadar +3 enerji', pl: '+3 energia do północy' },
    desc: { 'pt-BR': 'Três espaços extras de energia até meia-noite', vi: 'Ba ô năng lượng thưởng đến nửa đêm', id: 'Tiga slot energi bonus sampai tengah malam', tr: 'Gece yarısına kadar üç bonus enerji yuvası', pl: 'Trzy dodatkowe sloty energii do północy' },
  },
  chain_shield_3: {
    title: { 'pt-BR': 'Escudo por 3 dias', vi: 'Khiên 3 ngày', id: 'Perisai 3 hari', tr: '3 günlük kalkan', pl: 'Tarcza na 3 dni' },
    desc: { 'pt-BR': 'Três dias de proteção para sua sequência', vi: 'Ba ngày bảo vệ chuỗi của bạn', id: 'Tiga hari perlindungan untuk rentetanmu', tr: 'Serin için üç gün koruma', pl: 'Trzy dni ochrony serii' },
  },
  wager_discount_25: {
    title: { 'pt-BR': '25% de desconto na aposta', vi: 'Giảm 25% cho cược', id: 'Diskon taruhan 25%', tr: 'Bahiste %25 indirim', pl: '25% zniżki na zakład' },
    desc: { 'pt-BR': 'A próxima aposta custa 25% menos (uma vez; usado ao apostar)', vi: 'Lần cược tiếp theo rẻ hơn 25% (một lần; dùng khi đặt cược)', id: 'Taruhan berikutnya 25% lebih murah (sekali; dipakai saat bertaruh)', tr: 'Sonraki bahis %25 daha ucuz (tek seferlik; bahis yapınca kullanılır)', pl: 'Następny zakład kosztuje 25% mniej (jednorazowo, używa się przy zakładzie)' },
  },
  shards_10: {
    title: { 'pt-BR': '+700 XP', vi: '+700 XP', id: '+700 XP', tr: '+700 XP', pl: '+700 XP' },
    desc: { 'pt-BR': '+700 XP instantâneos', vi: '+700 XP ngay lập tức', id: '+700 XP instan', tr: 'Anında +700 XP', pl: 'Natychmiastowe +700 XP' },
  },
  xp_bank_600: {
    title: { 'pt-BR': 'Bônus ×2 para 600 XP', vi: 'Thưởng ×2 cho 600 XP', id: 'Bonus ×2 untuk 600 XP', tr: '600 XP için ×2 bonus', pl: 'Bonus ×2 na 600 XP' },
    desc: { 'pt-BR': 'Os próximos 600 XP são dobrados. Só é gasto ao estudar', vi: '600 XP tiếp theo được nhân đôi. Chỉ dùng khi học', id: '600 XP berikutnya digandakan. Hanya terpakai saat belajar', tr: 'Sonraki 600 XP ikiye katlanır. Yalnızca çalışırken harcanır', pl: 'Następne 600 XP zostanie podwojone. Zużywa się tylko podczas nauki' },
  },
  pack_voucher_48h: {
    title: { 'pt-BR': 'Vale de pacote 48 h', vi: 'Phiếu gói 48 giờ', id: 'Voucher paket 48 jam', tr: '48 saatlik paket kuponu', pl: 'Voucher pakietu 48 godz.' },
    desc: { 'pt-BR': 'Um pacote pago pode ser aberto grátis por 48 horas', vi: 'Một gói trả phí có thể mở miễn phí trong 48 giờ', id: 'Satu paket berbayar bisa dibuka gratis selama 48 jam', tr: 'Bir ücretli paket 48 saat ücretsiz açılabilir', pl: 'Jeden płatny pakiet można otworzyć za darmo na 48 godzin' },
  },
  choice_3_level: {
    title: { 'pt-BR': 'Escolha a recompensa', vi: 'Chọn phần thưởng', id: 'Pilih hadiah', tr: 'Ödül seç', pl: 'Wybierz nagrodę' },
    desc: { 'pt-BR': 'Abra e escolha uma de três recompensas', vi: 'Mở và chọn một trong ba phần thưởng', id: 'Buka dan pilih satu dari tiga hadiah', tr: 'Aç ve üç ödülden birini seç', pl: 'Otwórz i wybierz jedną z trzech nagród' },
  },
  prem_shards_10: {
    title: { 'pt-BR': '+400 XP (Plus)', vi: '+400 XP (Plus)', id: '+400 XP (Plus)', tr: '+400 XP (Plus)', pl: '+400 XP (Plus)' },
    desc: { 'pt-BR': '+400 XP instantâneos', vi: '+400 XP ngay lập tức', id: '+400 XP instan', tr: 'Anında +400 XP', pl: 'Natychmiastowe +400 XP' },
  },
  prem_shards_15: {
    title: { 'pt-BR': '+800 XP (Plus)', vi: '+800 XP (Plus)', id: '+800 XP (Plus)', tr: '+800 XP (Plus)', pl: '+800 XP (Plus)' },
    desc: { 'pt-BR': '+800 XP instantâneos', vi: '+800 XP ngay lập tức', id: '+800 XP instan', tr: 'Anında +800 XP', pl: 'Natychmiastowe +800 XP' },
  },
  prem_shards_20: {
    title: { 'pt-BR': '+1200 XP (Plus)', vi: '+1200 XP (Plus)', id: '+1200 XP (Plus)', tr: '+1200 XP (Plus)', pl: '+1200 XP (Plus)' },
    desc: { 'pt-BR': '+1200 XP instantâneos por subir de nível', vi: '+1200 XP ngay lập tức khi lên cấp', id: '+1200 XP instan karena naik level', tr: 'Seviye atladığın için anında +1200 XP', pl: 'Natychmiastowe +1200 XP za poziom' },
  },
  premium_xp_bank_1000: {
    title: { 'pt-BR': 'Bônus ×2 para 1000 XP (Plus)', vi: 'Thưởng ×2 cho 1000 XP (Plus)', id: 'Bonus ×2 untuk 1000 XP (Plus)', tr: '1000 XP için ×2 bonus (Plus)', pl: 'Bonus ×2 na 1000 XP (Plus)' },
    desc: { 'pt-BR': 'Os próximos 1000 XP são dobrados. Só é gasto ao estudar', vi: '1000 XP tiếp theo được nhân đôi. Chỉ dùng khi học', id: '1000 XP berikutnya digandakan. Hanya terpakai saat belajar', tr: 'Sonraki 1000 XP ikiye katlanır. Yalnızca çalışırken harcanır', pl: 'Następne 1000 XP zostanie podwojone. Zużywa się tylko podczas nauki' },
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
    es: g.descES ?? g.descRU,
    'pt-BR': planned?.['pt-BR'] ?? g.descES ?? g.descRU,
    vi: planned?.vi ?? g.descES ?? g.descRU,
    id: planned?.id ?? g.descES ?? g.descRU,
    tr: planned?.tr ?? g.descES ?? g.descRU,
    pl: planned?.pl ?? g.descES ?? g.descRU,
  });
}

const PREMIUM_GIFT_GENERIC_DESC_IDS = new Set<GiftId>([
  'prem_shards_10',
  'prem_shards_15',
  'prem_shards_20',
]);

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
  if (PREMIUM_GIFT_GENERIC_DESC_IDS.has(g.id)) return '';
  const desc = giftDescForLang(g, lang);
  return isPremiumLevelGiftCopy(g.id) ? stripPremiumGiftMarker(desc) : desc;
}

export function giftLocaleStrings(lang: Lang, g: GiftDef): { title: string; desc: string } {
  return { title: giftTitleForLang(g, lang), desc: giftDescForLang(g, lang) };
}

const GIFT_RARITY_UI_LABEL: Record<GiftRarity, {
  ru: string;
  uk: string;
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
    es: 'Raro',
    'pt-BR': 'Raro',
    vi: 'Hiếm',
    id: 'Langka',
    tr: 'Nadir',
    pl: 'Rzadki',
  },
  epic: {
    ru: '✨ Эпический',
    uk: '✨ Епічний',
    es: '✨ Épico',
    'pt-BR': '✨ Épico',
    vi: '✨ Sử thi',
    id: '✨ Epik',
    tr: '✨ Destansı',
    pl: '✨ Epicki',
  },
};

export function giftRarityUiLabel(rarity: GiftRarity | string | undefined | null, lang: Lang): string {
  const r = rarity === 'rare' || rarity === 'epic' ? rarity : 'common';
  const label = GIFT_RARITY_UI_LABEL[r];
  return triLang(lang, {
    ru: label.ru,
    uk: label.uk,
    es: label.es,
    'pt-BR': label['pt-BR'],
    vi: label.vi,
    id: label.id,
    tr: label.tr,
    pl: label.pl,
  });
}

const SPIN_TIER_UI_LABEL: Record<LevelSpinRewardCatalogEntry['tier'], Record<Lang, string>> = {
  ordinary: { ru: 'Обычный', uk: 'Звичайний', es: 'Común', 'pt-BR': 'Comum', vi: 'Thường', id: 'Biasa', tr: 'Sıradan', pl: 'Zwykły' },
  rare: { ru: 'Редкий', uk: 'Рідкісний', es: 'Raro', 'pt-BR': 'Raro', vi: 'Hiếm', id: 'Langka', tr: 'Nadir', pl: 'Rzadki' },
  ultra: { ru: 'Ультраредкий', uk: 'Ультрарідкісний', es: 'Ultrarraro', 'pt-BR': 'Ultrarraro', vi: 'Siêu hiếm', id: 'Ultra langka', tr: 'Ultra nadir', pl: 'Ultrarzadki' },
  exceptional: { ru: 'Исключительный', uk: 'Винятковий', es: 'Excepcional', 'pt-BR': 'Excepcional', vi: 'Đặc biệt', id: 'Istimewa', tr: 'Olağanüstü', pl: 'Wyjątkowy' },
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
    titleRU: 'Полная энергия', titleUK: 'Повна енергія', titleES: 'Energía al máximo',
    descRU: 'Все слоты энергии восстановлены прямо сейчас',
    descUK: 'Всі слоти енергії відновлено прямо зараз',
    descES: 'Todas las ranuras de energía recuperadas al instante',
  },
  {
    id: 'energy_plus1', rarity: 'common', icon: '⚡', weight: 8,
    titleRU: '+1 к энергии до полуночи', titleUK: '+1 до енергії до півночі', titleES: '+1 energía hasta medianoche',
    // зачем: владелец 2026-08-23 — описание врало. Оно обещало «заменяет, не
    // суммируется», а applyEnergyBonusN всегда СКЛАДЫВАЛ с уже активным бонусом
    // (existing.amount + n). Владелец подтвердил: правда — код, суммирование
    // выгоднее игроку. Текст приведён к фактическому поведению.
    descRU: 'Один бонус-слот энергии до полуночи (суммируется с другими бонусами)',
    descUK: 'Один бонус-слот енергії до півночі (додається до інших бонусів)',
    descES: 'Un hueco extra de energía hasta medianoche (se acumula con otros bonos)',
  },
  {
    id: 'xp_50', rarity: 'common', icon: '✨', weight: 7,
    titleRU: '+50 XP', titleUK: '+50 XP', titleES: '+50 XP',
    descRU: 'Мгновенные 50 опыта', descUK: 'Миттєвих 50 досвіду', descES: 'Al instante +50 XP',
  },
  {
    id: 'xp_100', rarity: 'common', icon: '✨', weight: 7,
    titleRU: '+100 XP', titleUK: '+100 XP', titleES: '+100 XP',
    descRU: 'Мгновенные 100 опыта', descUK: 'Миттєвих 100 досвіду', descES: 'Al instante +100 XP',
  },
  {
    id: 'xp_250', rarity: 'common', icon: '✨', weight: 6,
    titleRU: '+250 XP', titleUK: '+250 XP', titleES: '+250 XP',
    descRU: 'Мгновенные 250 опыта', descUK: 'Миттєвих 250 досвіду', descES: 'Al instante +250 XP',
  },
  {
    id: 'hint_1', rarity: 'common', icon: '💡', weight: 8,
    titleRU: '+1 подсказка', titleUK: '+1 підказка', titleES: '+1 pista',
    descRU: 'Дополнительная подсказка в уроках сегодня', descUK: 'Додаткова підказка в уроках сьогодні',
    descES: 'Pista extra en las lecciones de hoy',
  },
  {
    // зачем (2026-08-02, владелец): жемчужные подарки платили 0 (§7 экономики) и обманывали
    // игрока. Те же id переделаны в честный мгновенный XP — id сохранены, потому что за них
    // держатся серверный каталог роллов (functions/src/community_packs.ts) и старые инвентари.
    id: 'shards_3', rarity: 'common', icon: '✨', weight: 7,
    titleRU: '+150 XP', titleUK: '+150 XP', titleES: '+150 XP',
    descRU: 'Мгновенные 150 опыта', descUK: 'Миттєвих 150 досвіду', descES: 'Al instante +150 XP',
  },
  {
    id: 'xp_bank_150', rarity: 'common', icon: '⚡', weight: 6,
    titleRU: 'Бонус ×2 на 150 XP', titleUK: 'Бонус ×2 на 150 XP', titleES: 'Bono ×2 para 150 XP',
    descRU: 'Следующие 150 XP удваиваются. Расходуется только во время обучения',
    descUK: 'Наступні 150 XP подвоюються. Витрачається лише під час навчання',
    descES: 'Duplica los siguientes 150 XP. Solo se consume al estudiar',
  },
  {
    id: 'focus_10m_25', rarity: 'common', icon: '⏱️', weight: 4,
    titleRU: 'Фокус 10 минут', titleUK: 'Фокус 10 хвилин', titleES: 'Foco 10 min',
    descRU: '10 минут подарочного множителя XP ×1.25',
    descUK: '10 хвилин подарункового множника XP ×1.25',
    descES: '10 minutos con multiplicador de XP ×1.25',
  },
  {
    id: 'xp_2x_24h', rarity: 'rare', icon: '🔥', weight: 9,
    titleRU: '+100% опыта на 24 часа', titleUK: '+100% досвіду на 24 години', titleES: '+100 % XP en 24 h',
    descRU: 'Все занятия приносят +100% опыта 1 день',
    descUK: 'Всі заняття приносять +100% досвіду 1 день',
    descES: 'Todas las actividades dan +100 % de XP durante un día',
  },
  {
    id: 'energy_plus2', rarity: 'rare', icon: '⚡', weight: 7,
    titleRU: '+2 к энергии до полуночи', titleUK: '+2 до енергії до півночі', titleES: '+2 energía hasta medianoche',
    descRU: 'Два бонус-слота энергии до полуночи', descUK: 'Два бонус-слоти енергії до півночі',
    descES: 'Dos huecos extra de energía hasta medianoche',
  },
  {
    id: 'chain_shield_1', rarity: 'rare', icon: '🛡️', weight: 8,
    titleRU: 'Заморозка цепочки', titleUK: 'Заморожування ланцюжка', titleES: 'Congelación de racha',
    descRU: 'Один день без занятий не прервёт твою цепочку',
    descUK: 'Один день без занять не перерве твій ланцюжок',
    descES: 'Un día sin practicar no romperá tu racha',
  },
  {
    id: 'hint_3', rarity: 'rare', icon: '💡', weight: 6,
    titleRU: '+3 подсказки', titleUK: '+3 підказки', titleES: '+3 pistas',
    descRU: 'Три доп. подсказки в уроках сегодня', descUK: 'Три дод. підказки в уроках сьогодні',
    descES: 'Tres pistas extra en las lecciones de hoy',
  },
  {
    id: 'shards_6', rarity: 'rare', icon: '✨', weight: 6,
    titleRU: '+350 XP', titleUK: '+350 XP', titleES: '+350 XP',
    descRU: 'Мгновенные 350 опыта — редкая награда', descUK: 'Миттєвих 350 досвіду — рідкісна нагорода',
    descES: 'Al instante +350 XP: premio poco habitual',
  },
  {
    id: 'xp_bank_300', rarity: 'rare', icon: '⚡', weight: 6,
    titleRU: 'Бонус ×2 на 300 XP', titleUK: 'Бонус ×2 на 300 XP', titleES: 'Bono ×2 para 300 XP',
    descRU: 'Следующие 300 XP удваиваются. Расходуется только во время обучения',
    descUK: 'Наступні 300 XP подвоюються. Витрачається лише під час навчання',
    descES: 'Duplica los siguientes 300 XP. Solo se consume al estudiar',
  },
  {
    id: 'focus_15m_50', rarity: 'rare', icon: '⏱️', weight: 5,
    titleRU: 'Фокус 15 минут', titleUK: 'Фокус 15 хвилин', titleES: 'Foco 15 min',
    descRU: '15 минут подарочного множителя XP ×1.5',
    descUK: '15 хвилин подарункового множника XP ×1.5',
    descES: '15 minutos con multiplicador de XP ×1.5',
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
    id: 'club_boost_free', rarity: 'rare', icon: '👥', weight: 6,
    titleRU: 'Буст лиги бесплатно', titleUK: 'Буст ліги безкоштовно', titleES: 'Impulso de liga gratis',
    descRU: 'Следующая активация буста лиги без жемчужин',
    descUK: 'Наступна активація буста ліги без жемчужин',
    descES: 'La próxima activación del impulso en la liga no cuesta perlas',
  },
  {
    id: 'xp_2x_48h', rarity: 'epic', icon: '🚀', weight: 3,
    titleRU: '+100% опыта на 48 часов', titleUK: '+100% досвіду на 48 годин', titleES: '+100 % XP en 48 h',
    descRU: 'Все занятия приносят +100% опыта 2 дня', descUK: 'Всі заняття +100% досвіду 2 дні',
    descES: 'Todas las actividades dan +100 % de XP durante dos días',
  },
  {
    id: 'energy_plus3', rarity: 'epic', icon: '⚡', weight: 2,
    titleRU: '+3 к энергии до полуночи', titleUK: '+3 до енергії до півночі', titleES: '+3 energía hasta medianoche',
    descRU: 'Три бонус-слота энергии до полуночи', descUK: 'Три бонус-слоти енергії до півночі',
    descES: 'Tres huecos extra de energía hasta medianoche',
  },
  {
    id: 'chain_shield_3', rarity: 'epic', icon: '🛡️', weight: 2,
    titleRU: 'Заморозка на 3 дня', titleUK: 'Заморожування на 3 дні', titleES: 'Congelación 3 días',
    descRU: 'Три дня защиты цепочки', descUK: 'Три дні захисту ланцюжка', descES: 'Tres días de protección para la racha',
  },
  {
    id: 'wager_discount_25', rarity: 'epic', icon: '🎲', weight: 2,
    titleRU: 'Скидка на пари −25%', titleUK: 'Знижка на пари −25%', titleES: '−25 % en la apuesta',
    descRU: 'Следующее пари: на 25% дешевле (одно пари, ключ сбрасывается при ставке)',
    descUK: 'Наступне пари: на 25% дешевше (одне пари, знімається при ставці)',
    descES: 'La siguiente apuesta cuesta un 25 % menos (una sola vez; se usa al apostar)',
  },
  {
    id: 'shards_10', rarity: 'epic', icon: '✨', weight: 2,
    titleRU: '+700 XP', titleUK: '+700 XP', titleES: '+700 XP',
    descRU: 'Мгновенные 700 опыта', descUK: 'Миттєвих 700 досвіду', descES: 'Al instante +700 XP',
  },
  {
    id: 'xp_bank_600', rarity: 'epic', icon: '⚡', weight: 2,
    titleRU: 'Бонус ×2 на 600 XP', titleUK: 'Бонус ×2 на 600 XP', titleES: 'Bono ×2 para 600 XP',
    descRU: 'Следующие 600 XP удваиваются. Расходуется только во время обучения',
    descUK: 'Наступні 600 XP подвоюються. Витрачається лише під час навчання',
    descES: 'Duplica los siguientes 600 XP. Solo se consume al estudiar',
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
        id: 'xp_bank_300', rarity: 'rare', icon: '⚡', weight: 1,
        titleRU: 'Бонус ×2 на 300 XP', titleUK: 'Бонус ×2 на 300 XP', titleES: 'Bono ×2 para 300 XP',
        descRU: 'Следующие 300 XP удваиваются. Расходуется только во время обучения',
        descUK: 'Наступні 300 XP подвоюються. Витрачається лише під час навчання',
        descES: 'Duplica los siguientes 300 XP. Solo se consume al estudiar',
      },
      {
        id: 'focus_15m_50', rarity: 'rare', icon: '⏱️', weight: 1,
        titleRU: 'Фокус 15 минут', titleUK: 'Фокус 15 хвилин', titleES: 'Foco 15 min',
        descRU: '15 минут подарочного множителя XP ×1.5',
        descUK: '15 хвилин подарункового множника XP ×1.5',
        descES: '15 minutos con multiplicador de XP ×1.5',
      },
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

/** Крупный мгновенный XP + редкая проба набора — без доп. энергии для премиум (бесплатная дневная арена у него и так есть). */
const GIFT_PREMIUM: GiftDef[] = [
  {
    id: 'prem_shards_10', rarity: 'common', icon: '✨', weight: 5,
    titleRU: '+400 XP (плюс)', titleUK: '+400 XP (плюс)', titleES: '+400 XP (Plus)',
    descRU: 'Мгновенные 400 опыта',
    descUK: 'Миттєвих 400 досвіду',
    descES: 'Al instante +400 XP',
  },
  {
    id: 'prem_shards_15', rarity: 'rare', icon: '✨', weight: 4,
    titleRU: '+800 XP (плюс)', titleUK: '+800 XP (плюс)', titleES: '+800 XP (Plus)',
    descRU: 'Мгновенные 800 опыта', descUK: 'Миттєвих 800 досвіду', descES: 'Al instante +800 XP',
  },
  {
    id: 'prem_shards_20', rarity: 'epic', icon: '✨', weight: 4,
    titleRU: '+1200 XP (плюс)', titleUK: '+1200 XP (плюс)', titleES: '+1200 XP (Plus)',
    descRU: 'Мгновенные 1200 опыта за уровень', descUK: 'Миттєвих 1200 досвіду за рівень',
    descES: 'Al instante +1200 XP por subir de nivel',
  },
  {
    id: 'premium_xp_bank_1000', rarity: 'epic', icon: '⚡', weight: 2,
    titleRU: 'Бонус ×2 на 1000 XP (плюс)', titleUK: 'Бонус ×2 на 1000 XP (плюс)', titleES: 'Bono ×2 para 1000 XP (Plus)',
    descRU: 'Следующие 1000 XP удваиваются. Расходуется только во время обучения',
    descUK: 'Наступні 1000 XP подвоюються. Витрачається лише під час навчання',
    descES: 'Duplica los siguientes 1000 XP. Solo se consume al estudiar',
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

const spinXpGift = (amount: 250 | 500 | 1_000 | 3_000 | 5_000 | 10_000 | 25_000 | 50_000): GiftDef => {
  const entry = spinRewardEntry(`xp_${amount}`);
  return {
    id: entry.id, rarity: spinRewardRarity(entry), spinTier: entry.tier, icon: '✨', weight: entry.weight,
    titleRU: `+${amount} XP`, titleUK: `+${amount} XP`, titleES: `+${amount} XP`,
    descRU: `Мгновенные ${amount} опыта`, descUK: `Миттєвих ${amount} досвіду`,
    descES: `${amount} XP al instante`,
  };
};

const spinPearlGift = (amount: 5 | 10 | 20 | 50 | 100 | 250 | 500): GiftDef => {
  const entry = spinRewardEntry(`pearls_${amount}`);
  return {
    id: entry.id, rarity: spinRewardRarity(entry), spinTier: entry.tier, icon: '🫧', weight: entry.weight,
    titleRU: `+${amount} жемчужин`, titleUK: `+${amount} перлин`, titleES: `+${amount} perlas`,
    descRU: `${amount} жемчужин в твой баланс`, descUK: `${amount} перлин на твій баланс`,
    descES: `${amount} perlas para tu saldo`,
  };
};

const spinStarGift = (amount: 10 | 20 | 50 | 100 | 250 | 500 | 1_000): GiftDef => {
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

const spinPlusGift = (days: 3 | 7): GiftDef => {
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
  ...([500, 1_000, 3_000, 5_000, 10_000, 25_000, 50_000] as const).map(spinXpGift),
  ...([5, 10, 20, 50, 100, 250, 500] as const).map(spinPearlGift),
  ...([10, 20, 50, 100, 250, 500, 1_000] as const).map(spinStarGift),
  spinPlusGift(3),
  spinPlusGift(7),
  spinAttemptRestoreGift(),
];

/**
 * Премиум-подарки уровня: навсегда открыть один из пяти встроенных наборов.
 * В бою `rollPremiumLevelGiftForUser` — только низкая вероятность + без повтора того же набора.
 */
export const PREMIUM_LEVEL_GIFT_UNLOCK_PACK_IDS: readonly string[] = [
  OFFICIAL_NEGOTIATOR_EN_ID,
  OFFICIAL_DARK_LOGIC_EN_ID,
  OFFICIAL_WILD_WEST_EN_ID,
  OFFICIAL_ROYAL_TEA_EN_ID,
  OFFICIAL_PEAKY_BLINDERS_EN_ID,
];

const PREMIUM_LEVEL_GIFT_PACK_UNLOCK_DEFS: GiftDef[] = [
  {
    id: 'prem_level_unlock_negotiator',
    rarity: 'epic',
    icon: '🎁',
    weight: 1,
    titleRU: 'Набор «Negotiator»',
    titleUK: 'Набір «Negotiator»',
    titleES: 'Pack «Negotiator»',
    descRU: 'Полный набор добавлен к твоим карточкам — навсегда.',
    descUK: 'Повний набір додано до твоїх карток — назавжди.',
    descES: 'Todo el contenido ya está entre tus mazos, para siempre.',
  },
  {
    id: 'prem_level_unlock_dark_logic',
    rarity: 'epic',
    icon: '🎁',
    weight: 1,
    titleRU: 'Набор «Dark Logic»',
    titleUK: 'Набір «Dark Logic»',
    titleES: 'Pack «Dark Logic»',
    descRU: 'Полный набор добавлен к твоим карточкам — навсегда.',
    descUK: 'Повний набір додано до твоїх карток — назавжди.',
    descES: 'Todo el contenido ya está entre tus mazos, para siempre.',
  },
  {
    id: 'prem_level_unlock_wild_west',
    rarity: 'epic',
    icon: '🎁',
    weight: 1,
    titleRU: 'Набор «Wild West»',
    titleUK: 'Набір «Wild West»',
    titleES: 'Pack «Wild West»',
    descRU: 'Полный набор добавлен к твоим карточкам — навсегда.',
    descUK: 'Повний набір додано до твоїх карток — назавжди.',
    descES: 'Todo el contenido ya está entre tus mazos, para siempre.',
  },
  {
    id: 'prem_level_unlock_royal_tea',
    rarity: 'epic',
    icon: '🎁',
    weight: 1,
    titleRU: 'Набор «Royal Tea»',
    titleUK: 'Набір «Royal Tea»',
    titleES: 'Pack «Royal Tea»',
    descRU: 'Полный набор добавлен к твоим карточкам — навсегда.',
    descUK: 'Повний набір додано до твоїх карток — назавжди.',
    descES: 'Todo el contenido ya está entre tus mazos, para siempre.',
  },
  {
    id: 'prem_level_unlock_peaky_blinders',
    rarity: 'epic',
    icon: '🎁',
    weight: 1,
    titleRU: 'Набор «Peaky Blinders»',
    titleUK: 'Набір «Peaky Blinders»',
    titleES: 'Pack «Peaky Blinders»',
    descRU: 'Полный набор добавлен к твоим карточкам — навсегда.',
    descUK: 'Повний набір додано до твоїх карток — назавжди.',
    descES: 'Todo el contenido ya está entre tus mazos, para siempre.',
  },
];

/** gift id → официальный id набора во встроенном магазине */
const PREMIUM_LEVEL_GIFT_ID_TO_PACK: Record<string, string> = {
  prem_level_unlock_negotiator: OFFICIAL_NEGOTIATOR_EN_ID,
  prem_level_unlock_dark_logic: OFFICIAL_DARK_LOGIC_EN_ID,
  prem_level_unlock_wild_west: OFFICIAL_WILD_WEST_EN_ID,
  prem_level_unlock_royal_tea: OFFICIAL_ROYAL_TEA_EN_ID,
  prem_level_unlock_peaky_blinders: OFFICIAL_PEAKY_BLINDERS_EN_ID,
};

/** Вероятность премиум-сундука уровня отдать один из редких подарков-наборов (если ещё есть подходящие). */
export const PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE = 0.08;

const PREMIUM_PACK_UNLOCK_GIFT_RECEIVED_KEY = 'level_premium_pack_unlock_gifts_v1';

async function loadPremiumPackUnlockGiftReceivedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(PREMIUM_PACK_UNLOCK_GIFT_RECEIVED_KEY);
    if (!raw) return new Set();
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a)) return new Set();
    return new Set(a.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function pushPremiumPackUnlockGiftReceivedPackId(packId: string): Promise<void> {
  const cur = await loadPremiumPackUnlockGiftReceivedIds();
  cur.add(packId);
  await AsyncStorage.setItem(PREMIUM_PACK_UNLOCK_GIFT_RECEIVED_KEY, JSON.stringify([...cur]));
}

const ROUND_LEVELS = new Set([10, 20, 30, 40, 50]);
const WAGER_DISCOUNT_KEY = 'wager_discount';
const PREMIUM_BLOCKED_F2P_IDS = new Set<GiftId>([
  'energy_full',
  'energy_plus1',
  'energy_plus2',
  'energy_plus3',
  'choice_3_level',
]);
const FLASHCARD_PACK_LEVEL_GIFT_IDS = new Set<GiftId>([
  'pack_voucher_48h',
  'prem_pack_48h',
  ...Object.keys(PREMIUM_LEVEL_GIFT_ID_TO_PACK),
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
  return weightedPick(GIFT_F2P, level);
}

const cloneGiftDef = (gift: GiftDef): GiftDef => ({
  ...gift,
  choices: gift.choices?.map(choice => ({ ...choice })),
  levelGiftReservation: gift.levelGiftReservation ? { ...gift.levelGiftReservation } : undefined,
});

async function reserveServerLevelGift(
  level: number,
  lane: 'f2p' | 'premium',
  studyTarget?: RuntimeStudyTarget,
): Promise<GiftDef> {
  const stableId = await getCanonicalUserId();
  if (!stableId) throw new Error('level_gift_identity_unavailable');
  const receipt = await callLevelGiftReserve({
    stableId,
    level,
    lane,
    studyTarget: storageStudyTarget(studyTarget),
  });
  const definition = [...GIFT_F2P, ...GIFT_PREMIUM, ...PREMIUM_LEVEL_GIFT_PACK_UNLOCK_DEFS]
    .find((gift) => gift.id === receipt.giftId);
  if (!definition) throw new Error('level_gift_catalog_mismatch');
  return {
    ...cloneGiftDef(definition),
    levelGiftReservation: {
      reservationId: receipt.reservationId,
      lane,
      ...(receipt.allowedPackId ? { allowedPackId: receipt.allowedPackId } : {}),
    },
  };
}

/** Replaces an offline/legacy roll with its canonical server-owned receipt before presentation. */
export async function reserveLevelGiftForDisplay(
  level: number,
  lane: 'f2p' | 'premium',
  opts?: { premiumSafe?: boolean; studyTarget?: RuntimeStudyTarget },
): Promise<GiftDef> {
  const reserved = await reserveServerLevelGift(level, lane, opts?.studyTarget);
  return lane === 'f2p'
    ? sanitizeRollableLevelGift(reserved, opts?.premiumSafe === true)
    : sanitizeLevelGiftForStudyTarget(reserved, opts?.studyTarget);
}

function sourceGatedFallbackGiftId(id: GiftId): GiftId {
  return id === 'pack_voucher_48h' ? 'shards_10' : 'prem_shards_20';
}

function sourceGatedFallbackGiftDef(gift: GiftDef): GiftDef {
  const fallbackId = sourceGatedFallbackGiftId(gift.id);
  const fallbackPool = fallbackId === 'shards_10' ? GIFT_F2P : GIFT_PREMIUM;
  return cloneGiftDef(fallbackPool.find(g => g.id === fallbackId) ?? gift);
}

const usefulFallbackGiftId = (rarity: GiftRarity): GiftId => {
  if (rarity === 'epic') return 'xp_bank_600';
  if (rarity === 'rare') return 'xp_bank_300';
  return 'xp_250';
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

export const LEVEL_GIFT_MILESTONE_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100] as const;

const LEVEL_GIFT_MILESTONE_IDS: Record<number, GiftId> = {
  5: 'xp_bank_150',
  10: 'xp_bank_300',
  15: 'cosmetic_avatar_common',
  20: 'focus_15m_50',
  25: 'pack_voucher_48h',
  30: 'choice_3_level',
  35: 'cosmetic_avatar_aura',
  40: 'xp_bank_600',
  45: 'cosmetic_avatar_aura',
  50: 'choice_3_level',
  // Вехи после 50: раньше дальше шёл только рандом и игрок терял «гарантированные» подарки.
  55: 'chain_shield_3',
  60: 'choice_3_level',
  70: 'xp_2x_48h',
  80: 'cosmetic_avatar_aura',
  90: 'pack_voucher_48h',
  100: 'choice_3_level',
};

export function getMilestoneLevelGift(level: number, opts?: { premiumSafe?: boolean; studyTarget?: RuntimeStudyTarget }): GiftDef | null {
  let id = LEVEL_GIFT_MILESTONE_IDS[level];
  if (!id) return null;
  const gift = GIFT_F2P.find(g => g.id === id);
  if (!gift) return null;
  const premiumSafeGift = opts?.premiumSafe ? sanitizeLevelGiftForPremium(gift) : gift;
  return sanitizeLevelGiftForStudyTarget(premiumSafeGift, opts?.studyTarget);
}

/** F2P-пул: анти-triple-hint_1 на круглых уровнях; premiumSafe исключает бесполезные для премиум награды. */
export async function rollF2pLevelGiftForUser(level: number, opts?: { premiumSafe?: boolean; studyTarget?: RuntimeStudyTarget }): Promise<GiftDef> {
  const milestone = getMilestoneLevelGift(level, opts);
  try {
    const reserved = await reserveServerLevelGift(level, 'f2p', opts?.studyTarget);
    return sanitizeRollableLevelGift(reserved, opts?.premiumSafe === true);
  } catch (error) {
    if (milestone && isFlashcardPackLevelGiftId(milestone.id)) throw error;
    if (milestone) return milestone;
    const safePool = GIFT_F2P.filter((gift) =>
      !isFlashcardPackLevelGiftId(gift.id)
      && (!opts?.premiumSafe || !PREMIUM_BLOCKED_F2P_IDS.has(gift.id))
    );
    return sanitizeLevelGiftForStudyTarget(weightedPick(safePool, level), opts?.studyTarget);
  }
}

/** Второй сундук — GIFT_PREMIUM + с шансом `PREMIUM_LEVEL_PACK_GIFT_DROP_CHANCE` навсегда один из пяти наборов (без повтора). */
export async function rollPremiumLevelGiftForUser(level: number, opts?: { studyTarget?: RuntimeStudyTarget }): Promise<GiftDef> {
  try {
    return await reserveServerLevelGift(level, 'premium', opts?.studyTarget);
  } catch {
    const safePool = GIFT_PREMIUM.filter((gift) => !isFlashcardPackLevelGiftId(gift.id));
    return sanitizeLevelGiftForStudyTarget(weightedPick(safePool, level), opts?.studyTarget);
  }
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
  if (isPremium === true) return rollPremiumLevelGiftForUser(level, opts);
  return rollF2pLevelGiftForUser(level, opts);
}

/** Storage */
const GIFT_MULT_KEY = 'gift_xp_multiplier';
const GIFT_XP_BANK_KEY = 'gift_xp_bank_v1';
const CHAIN_SHIELD_KEY = 'chain_shield';
export { BONUS_ENERGY_KEY, readBonusEnergy } from './bonus_energy_store';
export const COSMETIC_GIFT_OWNED_AVATAR_KEY = CUSTOM_AVATAR_GIFT_OWNED_KEY;
const GIFT_XP_BANK_CAP = 1500;

export interface GiftMultiplierState { multiplier: number; expiresAt: number }
export interface GiftXpBankState { remaining: number; grantedTotal: number; updatedAt: number }

type GiftXpBankOccurrence = {
  amount: number;
  overflow: number;
  status: 'overflow_pending' | 'applied';
};

type GiftXpBankStoredState = GiftXpBankState & {
  appliedOccurrences?: Record<string, GiftXpBankOccurrence>;
};

let giftXpBankMutationLock: Promise<void> = Promise.resolve();
let localLevelGiftApplyLock: Promise<void> = Promise.resolve();

const withGiftXpBankMutationLock = async <T>(work: () => Promise<T>): Promise<T> => {
  const previous = giftXpBankMutationLock;
  let release!: () => void;
  giftXpBankMutationLock = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
};

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

const readGiftXpBankStoredState = async (): Promise<GiftXpBankStoredState> => {
  const raw = await AsyncStorage.getItem(GIFT_XP_BANK_KEY);
  if (!raw) return { remaining: 0, grantedTotal: 0, updatedAt: 0 };
  const parsed = JSON.parse(raw) as Partial<GiftXpBankStoredState>;
  const remaining = Math.max(0, Math.floor(Number(parsed.remaining) || 0));
  const rawGrantedTotal = Math.max(0, Math.floor(Number(parsed.grantedTotal) || 0));
  const appliedOccurrences = parsed.appliedOccurrences && typeof parsed.appliedOccurrences === 'object'
    ? parsed.appliedOccurrences
    : undefined;
  return {
    remaining,
    grantedTotal: Math.max(remaining, rawGrantedTotal),
    updatedAt: Math.max(0, Number(parsed.updatedAt) || 0),
    ...(appliedOccurrences ? { appliedOccurrences } : {}),
  };
};

export const readGiftMultiplier = async (): Promise<number> => {
  try {
    const bank = await readGiftXpBank();
    const raw = await AsyncStorage.getItem(GIFT_MULT_KEY);
    if (!raw) return bank.remaining > 0 ? 2 : 1;
    const state: GiftMultiplierState = JSON.parse(raw);
    if (Date.now() > state.expiresAt) {
      await AsyncStorage.removeItem(GIFT_MULT_KEY);
      return bank.remaining > 0 ? 2 : 1;
    }
    return Math.max(state.multiplier, bank.remaining > 0 ? 2 : 1);
  } catch { return 1; }
};

export const readGiftXpBank = async (): Promise<GiftXpBankState> => {
  try {
    const { remaining, grantedTotal, updatedAt } = await readGiftXpBankStoredState();
    return { remaining, grantedTotal, updatedAt };
  } catch {
    return { remaining: 0, grantedTotal: 0, updatedAt: 0 };
  }
};

export const grantGiftXpBank = async (amount: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(amount));
  if (safe <= 0) return 0;
  return withGiftXpBankMutationLock(async () => {
    const cur = await readGiftXpBankStoredState();
    const nextRemaining = Math.min(GIFT_XP_BANK_CAP, cur.remaining + safe);
    const accepted = Math.max(0, nextRemaining - cur.remaining);
    const overflow = Math.max(0, safe - accepted);
    await AsyncStorage.setItem(GIFT_XP_BANK_KEY, JSON.stringify({
      ...cur,
      remaining: nextRemaining,
      grantedTotal: cur.grantedTotal + accepted,
      updatedAt: Date.now(),
    }));
    return overflow;
  });
};

const grantGiftXpBankForOccurrence = async (
  amount: number,
  accountId: string,
  occurrenceId: string,
  grantOverflow: (overflow: number) => Promise<void>,
): Promise<void> => withGiftXpBankMutationLock(async () => {
  const safe = Math.max(0, Math.floor(amount));
  if (safe <= 0) return;
  const occurrenceKey = `${safeLevelGiftEventPart(accountId, 80)}:${safeLevelGiftEventPart(occurrenceId, 120)}`;
  const current = await readGiftXpBankStoredState();
  const prior = current.appliedOccurrences?.[occurrenceKey];
  if (prior?.status === 'applied') return;
  if (prior?.status === 'overflow_pending') {
    await grantOverflow(prior.overflow);
    await AsyncStorage.setItem(GIFT_XP_BANK_KEY, JSON.stringify({
      ...current,
      updatedAt: Date.now(),
      appliedOccurrences: {
        ...(current.appliedOccurrences ?? {}),
        [occurrenceKey]: { ...prior, status: 'applied' },
      },
    }));
    return;
  }

  const nextRemaining = Math.min(GIFT_XP_BANK_CAP, current.remaining + safe);
  const accepted = Math.max(0, nextRemaining - current.remaining);
  const overflow = Math.max(0, safe - accepted);
  const occurrence: GiftXpBankOccurrence = {
    amount: safe,
    overflow,
    status: overflow > 0 ? 'overflow_pending' : 'applied',
  };
  const staged: GiftXpBankStoredState = {
    ...current,
    remaining: nextRemaining,
    grantedTotal: current.grantedTotal + accepted,
    updatedAt: Date.now(),
    appliedOccurrences: { ...(current.appliedOccurrences ?? {}), [occurrenceKey]: occurrence },
  };
  // Bank mutation and its occurrence journal share one durable value.
  await AsyncStorage.setItem(GIFT_XP_BANK_KEY, JSON.stringify(staged));
  if (overflow <= 0) return;
  await grantOverflow(overflow);
  await AsyncStorage.setItem(GIFT_XP_BANK_KEY, JSON.stringify({
    ...staged,
    updatedAt: Date.now(),
    appliedOccurrences: {
      ...(staged.appliedOccurrences ?? {}),
      [occurrenceKey]: { ...occurrence, status: 'applied' },
    },
  }));
});

export const consumeGiftXpBank = async (baseXp: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(baseXp));
  if (safe <= 0) return 0;
  return withGiftXpBankMutationLock(async () => {
    const cur = await readGiftXpBankStoredState();
    const used = Math.min(cur.remaining, safe);
    if (used <= 0) return 0;
    await AsyncStorage.setItem(GIFT_XP_BANK_KEY, JSON.stringify({
      ...cur,
      remaining: Math.max(0, cur.remaining - used),
      updatedAt: Date.now(),
    }));
    return used;
  });
};

export const readGiftMultiplierForBaseXp = async (baseXp: number): Promise<{ multiplier: number; consumeBank: boolean }> => {
  const amount = Math.max(0, Math.floor(baseXp));
  let timedM = 1;
  try {
    const raw = await AsyncStorage.getItem(GIFT_MULT_KEY);
    if (raw) {
      const state: GiftMultiplierState = JSON.parse(raw);
      if (Date.now() > state.expiresAt) {
        await AsyncStorage.removeItem(GIFT_MULT_KEY);
      } else {
        timedM = Math.max(1, Number(state.multiplier) || 1);
      }
    }
  } catch {}
  const bank = await readGiftXpBank();
  if (amount <= 0 || bank.remaining <= 0) return { multiplier: timedM, consumeBank: false };
  const bankM = 1 + Math.min(bank.remaining, amount) / amount;
  if (bankM > timedM) return { multiplier: bankM, consumeBank: true };
  return { multiplier: timedM, consumeBank: false };
};

const setTimedGiftMultiplier = async (multiplier: number, durationMs: number): Promise<ApplyGiftResult> => {
  const safeM = Math.max(1, Number(multiplier) || 1);
  const now = Date.now();
  let xpBoostAlreadyActive = false;
  try {
    const existingRaw = await AsyncStorage.getItem(GIFT_MULT_KEY);
    if (existingRaw) {
      const existing: GiftMultiplierState = JSON.parse(existingRaw);
      xpBoostAlreadyActive = now < existing.expiresAt && existing.multiplier > 1;
      if (xpBoostAlreadyActive && existing.multiplier >= safeM) {
        await AsyncStorage.setItem(GIFT_MULT_KEY, JSON.stringify({
          multiplier: existing.multiplier,
          expiresAt: Math.max(existing.expiresAt, now + durationMs),
        }));
        return { success: true, xpBoostAlreadyActive };
      }
    }
  } catch {}
  await AsyncStorage.setItem(GIFT_MULT_KEY, JSON.stringify({ multiplier: safeM, expiresAt: now + durationMs }));
  return { success: true, xpBoostAlreadyActive };
};

const encodeOwnedStyle = (gradientId: string, logoColor: CustomAvatarLogoColor) => `${gradientId}:${logoColor}`;

/**
 * Экономика «Монеты и Звёзды» (docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §7):
 * подарки за уровень больше НЕ выдают монеты — выдача обнулена.
 * Решение владельца 2026-08-02: жемчужные подарки в пулах заменены на мгновенный XP
 * (см. grantInstantGiftXp в applyGiftUnlocked), поэтому активных вызовов у функции нет.
 * Сохранена как задокументированный §7-рубильник на случай возврата монетных подарков
 * и ради контракта owner_direction_runtime_contract (формат reason у локального фолбэка).
 */
export const grantLevelGiftShards = async (
  amount: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  // The owner retired pearl level gifts in favour of instant XP. Keep the
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
const THEME_GIFT_FALLBACK_XP = 350;

export type GiftCosmeticUnlock = {
  kind: 'avatar' | 'aura' | 'theme';
  id: string;
  gradientId?: string;
  logoColor?: CustomAvatarLogoColor;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  /** True when an idempotent gift retry returned the already-granted avatar. */
  replayed?: boolean;
};

const CUSTOM_AVATAR_GIFT_REPLAY_LIMIT = 64;

type CustomAvatarGiftIdempotencyOptions = Readonly<{
  idempotencyKey: string;
  /** Optional additive counter object persisted in the same multiSet as ownership. */
  counterStorageKey?: string;
  /** The level-claim flow already holds the non-reentrant account transition lock. */
  accountTransitionLocked?: boolean;
}>;

const parseCustomAvatarGiftReplays = (raw: string | null): Record<string, GiftCosmeticUnlock> => {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => (
      key.trim().length > 0
      && value !== null
      && typeof value === 'object'
      && (value as Partial<GiftCosmeticUnlock>).kind === 'avatar'
      && typeof (value as Partial<GiftCosmeticUnlock>).id === 'string'
    ))) as Record<string, GiftCosmeticUnlock>;
  } catch {
    return {};
  }
};

export const unlockRandomCustomAvatarGift = async (
  accountToken?: AccountGenerationToken,
  idempotency?: CustomAvatarGiftIdempotencyOptions,
): Promise<GiftCosmeticUnlock | null> => {
  const normalizedIdempotencyKey = idempotency?.idempotencyKey.trim() || null;
  const scopedIdempotencyKey = normalizedIdempotencyKey
    ? `${accountToken?.stableId?.trim() || ''}:${normalizedIdempotencyKey}`
    : null;
  const apply = async (): Promise<GiftCosmeticUnlock | null> => {
    if (normalizedIdempotencyKey && !accountToken?.stableId) {
      throw new Error('custom_avatar_gift_missing_account');
    }
    if (accountToken && !isCurrentAccountGeneration(accountToken)) {
      throw new Error('custom_avatar_gift_account_changed');
    }
    const readKeys = [
      CUSTOM_AVATAR_OWNED_KEY,
      CUSTOM_AVATAR_GIFT_REPLAY_KEY,
      ...(idempotency?.counterStorageKey ? [idempotency.counterStorageKey] : []),
    ];
    const rows = await AsyncStorage.multiGet(readKeys);
    if (accountToken && !isCurrentAccountGeneration(accountToken)) {
      throw new Error('custom_avatar_gift_account_changed');
    }
    const raw = rows[0]?.[1] ?? null;
    const replayMap = parseCustomAvatarGiftReplays(rows[1]?.[1] ?? null);
    if (scopedIdempotencyKey && replayMap[scopedIdempotencyKey]) {
      return { ...replayMap[scopedIdempotencyKey], replayed: true };
    }
    const owned: Record<string, string> = raw ? JSON.parse(raw) : {};
    const candidates = CUSTOM_AVATAR_GIFT_POOL.filter(a => !owned[a.id]);
    if (candidates.length === 0) return null;
    const totalWeight = candidates.reduce((sum, candidate) => sum + getCustomAvatarGiftWeight(candidate.id), 0);
    let roll = Math.random() * (totalWeight || 1);
    const avatar = candidates.find((candidate) => {
      roll -= getCustomAvatarGiftWeight(candidate.id);
      return roll <= 0;
    }) ?? candidates[candidates.length - 1]!;
    const gradient = CUSTOM_AVATAR_GRADIENTS[Math.floor(Math.random() * CUSTOM_AVATAR_GRADIENTS.length)]!;
    const logoColor: CustomAvatarLogoColor = Math.random() < 0.5 ? 'black' : 'white';
    const next = { ...owned, [avatar.id]: encodeOwnedStyle(gradient.id, logoColor) };
    const result: GiftCosmeticUnlock = {
      kind: 'avatar',
      id: avatar.id,
      gradientId: gradient.id,
      logoColor,
      labelRu: customAvatarGiftLabelForLang(avatar, gradient, 'ru'),
      labelUk: customAvatarGiftLabelForLang(avatar, gradient, 'uk'),
      labelEs: customAvatarGiftLabelForLang(avatar, gradient, 'es'),
      replayed: false,
    };
    const pairs: [string, string][] = [
      [CUSTOM_AVATAR_OWNED_KEY, JSON.stringify(next)],
      [COSMETIC_GIFT_OWNED_AVATAR_KEY, avatar.id],
    ];
    if (scopedIdempotencyKey) {
      const boundedEntries = Object.entries(replayMap).slice(-(CUSTOM_AVATAR_GIFT_REPLAY_LIMIT - 1));
      pairs.push([CUSTOM_AVATAR_GIFT_REPLAY_KEY, JSON.stringify({
        ...Object.fromEntries(boundedEntries),
        [scopedIdempotencyKey]: result,
      })]);
    }
    if (idempotency?.counterStorageKey) {
      let counterState: Record<string, unknown> = {};
      const counterRaw = rows[2]?.[1] ?? null;
      try {
        const parsed: unknown = counterRaw ? JSON.parse(counterRaw) : {};
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          counterState = parsed as Record<string, unknown>;
        }
      } catch {
        counterState = {};
      }
      const currentCount = Math.max(0, Math.floor(Number(counterState.customAvatarGrants) || 0));
      pairs.push([idempotency.counterStorageKey, JSON.stringify({
        ...counterState,
        customAvatarGrants: currentCount + 1,
      })]);
    }
    if (accountToken && !isCurrentAccountGeneration(accountToken)) {
      throw new Error('custom_avatar_gift_account_changed');
    }
    await AsyncStorage.multiSet(pairs);
    if (accountToken && !isCurrentAccountGeneration(accountToken)) {
      throw new Error('custom_avatar_gift_account_changed');
    }
    return result;
  };

  if (normalizedIdempotencyKey) {
    return idempotency?.accountTransitionLocked
      ? withStorageLock(apply)
      : withAccountTransitionLock(() => withStorageLock(apply));
  }
  try { return await apply(); } catch { return null; }
};

export function isRandomAvatarAuraGiftCandidate(
  aura: AvatarAuraDef,
  owned: Readonly<Record<string, true | undefined>>,
): boolean {
  return !aura.premiumOnly
    && !aura.proOnly
    && !aura.rewardOnly
    && !aura.retiredFromShop
    && aura.unlockLevel === undefined
    && !owned[aura.id];
}

export const unlockRandomAvatarAuraGift = async (): Promise<GiftCosmeticUnlock | null> => {
  try {
    const raw = await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY);
    const owned: Record<string, true> = raw ? JSON.parse(raw) : {};
    const candidates = AVATAR_AURAS.filter((aura) => isRandomAvatarAuraGiftCandidate(aura, owned));
    if (candidates.length === 0) return null;
    const aura = candidates[Math.floor(Math.random() * candidates.length)]!;
    const next = { ...owned, [aura.id]: true };
    await AsyncStorage.multiSet([
      [AVATAR_AURA_OWNED_KEY, JSON.stringify(next)],
      [AVATAR_AURA_GIFT_OWNED_KEY, aura.id],
      [USER_AVATAR_AURA_KEY, aura.id],
    ]);
    return { kind: 'aura', id: aura.id, labelRu: aura.nameRu, labelUk: aura.nameUk, labelEs: aura.nameEs };
  } catch {
    return null;
  }
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
  xpBoostAlreadyActive?: boolean;
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
    expiresAt: number;
    energyTarget: number;
    energyBoostAlreadyActive: boolean;
  };
  energyFull?: {
    target: number;
  };
  multiplier?: {
    multiplier: number;
    expiresAt: number;
    xpBoostAlreadyActive: boolean;
  };
  chainShield?: {
    daysLeft: number;
    grantedAt: string;
  };
  singleUse?: {
    kind: 'club_boost' | 'wager_discount';
    target: number;
  };
  aura?: GiftCosmeticUnlock | null;
  customAvatar?: GiftCosmeticUnlock | null;
  theme?: GiftCosmeticUnlock | null;
  plus?: {
    days: 3 | 7;
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
  multiplier: new Set(['xp_2x_24h', 'xp_2x_48h', 'focus_10m_25', 'focus_15m_50']),
  chainShield: new Set(['chain_shield_1', 'chain_shield_3']),
  singleUse: new Set(['wager_discount_25']),
  aura: new Set([
    'cosmetic_avatar_aura', 'premium_cosmetic_aura',
    // Historical avatar-gift receipts could stage the aura fallback.
    'cosmetic_avatar_common', 'premium_cosmetic_avatar',
  ]),
  customAvatar: new Set(['cosmetic_avatar_common', 'premium_cosmetic_avatar']),
  theme: new Set(['cosmetic_theme']),
  plus: new Set(['plus_days_3', 'plus_days_7']),
} satisfies Record<LevelGiftEffectPayloadField, ReadonlySet<string>>);

const isCosmeticUnlock = (value: unknown, kind: GiftCosmeticUnlock['kind']): boolean => {
  if (value === null) return true;
  if (!isPlainRecord(value) || value.kind !== kind || typeof value.id !== 'string' || !value.id.trim()) return false;
  if (!hasOnlyKeys(value, ['kind', 'id', 'gradientId', 'logoColor', 'labelRu', 'labelUk', 'labelEs', 'replayed'])) return false;
  if (typeof value.labelRu !== 'string' || typeof value.labelUk !== 'string' || typeof value.labelEs !== 'string') return false;
  if (value.replayed !== undefined && typeof value.replayed !== 'boolean') return false;
  if (kind === 'aura') {
    return value.gradientId === undefined
      && value.logoColor === undefined
      && value.replayed === undefined
      && AVATAR_AURAS.some((aura) => aura.id === value.id);
  }
  if (kind === 'theme') {
    return value.gradientId === undefined
      && value.logoColor === undefined
      && value.replayed === undefined
      && Object.prototype.hasOwnProperty.call(THEME_DISPLAY_NAMES, value.id);
  }
  return typeof value.gradientId === 'string'
    && CUSTOM_AVATAR_GRADIENTS.some((gradient) => gradient.id === value.gradientId)
    && (value.logoColor === 'black' || value.logoColor === 'white')
    && CUSTOM_AVATARS.some((avatar) => avatar.id === value.id);
};

const isLevelGiftEffectReceipt = (value: unknown): value is LevelGiftEffectReceipt => {
  if (!isPlainRecord(value)
    || typeof value.giftId !== 'string'
    || !levelGiftDefinitionById(value.giftId)
    || (value.status !== 'prepared' && value.status !== 'applying'
      && value.status !== 'applied_unconfirmed' && value.status !== 'applied')) return false;
  const allowedKeys = new Set([
    'giftId', 'status', 'hint', 'energyBonus', 'energyFull', 'multiplier', 'chainShield',
    'singleUse', 'aura', 'customAvatar', 'theme', 'plus',
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;
  const payloads = (['hint', 'energyBonus', 'energyFull', 'multiplier', 'chainShield',
    'singleUse', 'aura', 'customAvatar', 'theme', 'plus'] as const)
    .filter((key): key is LevelGiftEffectPayloadField => Object.prototype.hasOwnProperty.call(value, key));
  if (payloads.length !== 1) return false;
  const payloadField = payloads[0]!;
  if (!LEVEL_GIFT_RECEIPT_PAYLOAD_GIFT_IDS[payloadField].has(value.giftId)) return false;
  if (value.hint !== undefined && (!isPlainRecord(value.hint) || !hasOnlyKeys(value.hint, ['key', 'target'])
    || typeof value.hint.key !== 'string' || !value.hint.key
    || !Number.isSafeInteger(value.hint.target) || Number(value.hint.target) < 0)) return false;
  if (value.energyBonus !== undefined && (!isPlainRecord(value.energyBonus)
    || !hasOnlyKeys(value.energyBonus, ['amount', 'expiresAt', 'energyTarget', 'energyBoostAlreadyActive'])
    || !Number.isSafeInteger(value.energyBonus.amount) || Number(value.energyBonus.amount) < 1
    || !isFiniteNumber(value.energyBonus.expiresAt) || Number(value.energyBonus.expiresAt) <= 0
    || !isFiniteNumber(value.energyBonus.energyTarget) || Number(value.energyBonus.energyTarget) < 0
    || typeof value.energyBonus.energyBoostAlreadyActive !== 'boolean')) return false;
  if (value.energyFull !== undefined && (!isPlainRecord(value.energyFull) || !hasOnlyKeys(value.energyFull, ['target'])
    || !isFiniteNumber(value.energyFull.target) || Number(value.energyFull.target) < 0)) return false;
  if (value.multiplier !== undefined && (!isPlainRecord(value.multiplier)
    || !hasOnlyKeys(value.multiplier, ['multiplier', 'expiresAt', 'xpBoostAlreadyActive'])
    || !isFiniteNumber(value.multiplier.multiplier) || Number(value.multiplier.multiplier) < 1
    || !isFiniteNumber(value.multiplier.expiresAt) || Number(value.multiplier.expiresAt) <= 0
    || typeof value.multiplier.xpBoostAlreadyActive !== 'boolean')) return false;
  if (value.chainShield !== undefined && (!isPlainRecord(value.chainShield) || !hasOnlyKeys(value.chainShield, ['daysLeft', 'grantedAt'])
    || !Number.isSafeInteger(value.chainShield.daysLeft) || Number(value.chainShield.daysLeft) < 0
    || typeof value.chainShield.grantedAt !== 'string')) return false;
  if (value.singleUse !== undefined && (!isPlainRecord(value.singleUse) || !hasOnlyKeys(value.singleUse, ['kind', 'target'])
    || (value.singleUse.kind !== 'club_boost' && value.singleUse.kind !== 'wager_discount')
    || !Number.isSafeInteger(value.singleUse.target) || Number(value.singleUse.target) < 1)) return false;
  if (value.aura !== undefined && !isCosmeticUnlock(value.aura, 'aura')) return false;
  if (value.customAvatar !== undefined && !isCosmeticUnlock(value.customAvatar, 'avatar')) return false;
  if (value.theme !== undefined && !isCosmeticUnlock(value.theme, 'theme')) return false;
  if (value.plus !== undefined && (!isPlainRecord(value.plus) || !hasOnlyKeys(value.plus, ['days', 'fromMs', 'untilMs', 'lifetime'])
    || (value.plus.days !== 3 && value.plus.days !== 7)
    || !isFiniteNumber(value.plus.fromMs) || Number(value.plus.fromMs) < 0
    || !isFiniteNumber(value.plus.untilMs) || Number(value.plus.untilMs) < 0
    || (value.plus.lifetime !== undefined && typeof value.plus.lifetime !== 'boolean')
    || (value.giftId === 'plus_days_3' && value.plus.days !== 3)
    || (value.giftId === 'plus_days_7' && value.plus.days !== 7))) return false;
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
    const energyState = energyRaw
      ? JSON.parse(energyRaw) as { current?: number }
      : {};
    const persistedEnergy = Number(energyState.current);
    const energyBase = Number.isFinite(persistedEnergy)
      ? Math.max(0, persistedEnergy)
      : Math.max(0, currentEnergy);
    return {
      giftId: id,
      status: 'prepared',
      energyBonus: {
        amount: (existing?.amount ?? 0) + n,
        expiresAt: getTomorrowMidnightMs(),
        // Legacy field name retained for replaying already-prepared receipts.
        // It now snapshots the unchanged base pool; the granted N lives only
        // in the account-scoped temporary bonus above.
        energyTarget: energyBase,
        energyBoostAlreadyActive: existing !== null && (existing.amount ?? 0) > 0,
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
  const bonus: BonusEnergyState = {
    amount: Math.max(existing?.amount ?? 0, planned.amount),
    expiresAt: Math.max(existing?.expiresAt ?? 0, planned.expiresAt),
  };
  await writeGiftAccountValue(BONUS_ENERGY_KEY, JSON.stringify(bonus), accountToken);
  if (!isCurrentAccountGeneration(accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  // All production callbacks reload EnergyContext. Do not materialize the
  // temporary pool in energy_state as well: that would count the gift twice.
  await setEnergy(planned.energyTarget);
  await markLevelGiftEffectApplied(staged, opts);
  return { success: true, energyBoostAlreadyActive: planned.energyBoostAlreadyActive };
};

const applyEnergyFullForOccurrence = async (
  id: 'energy_full',
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<boolean> => {
  const accountToken = opts?.accountToken ?? captureAccountGeneration();
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => ({
    giftId: id,
    status: 'prepared',
    energyFull: { target: Math.max(0, maxEnergy) },
  }));
  if (!staged) return false;
  const planned = staged.receipt.energyFull;
  if (!planned) throw new Error('level_gift_energy_full_receipt_invalid');
  if (staged.receipt.status !== 'prepared') return true;
  if (!isCurrentAccountGeneration(accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  // зачем (аудит 2026-08-24): read-modify-write energy_state шёл БЕЗ замка, тогда
  // как EnergyContext все свои записи держит под withStorageLock. Подарок «полная
  // энергия», пришедший одновременно с тратой, читал старое состояние и перетирал
  // свежее. Теперь чтение и запись — под тем же замком, что у остальных писателей.
  await withStorageLock(async () => {
    const energyRaw = await AsyncStorage.getItem('energy_state');
    if (!isCurrentAccountGeneration(accountToken)) {
      throw new Error('level_gift_effect_account_changed');
    }
    const energyState = energyRaw
      ? JSON.parse(energyRaw) as { lastRecoveryTime?: number }
      : {};
    await AsyncStorage.setItem('energy_state', JSON.stringify({
      current: planned.target,
      lastRecoveryTime: Math.max(0, Number(energyState.lastRecoveryTime) || Date.now()),
    }));
  });
  if (!isCurrentAccountGeneration(accountToken)) {
    throw new Error('level_gift_effect_account_changed');
  }
  await setEnergy(planned.target);
  await markLevelGiftEffectApplied(staged, opts);
  return true;
};

const WAGER_DISCOUNT_USES_KEY = 'wager_discount_uses_v1';

const parseSingleUseCount = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const applySingleUseGiftForOccurrence = async (
  id: 'wager_discount_25',
  opts?: ApplyGiftOptions,
): Promise<boolean> => {
  const kind = 'wager_discount';
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    const [discountRaw, usesRaw] = await AsyncStorage.multiGet([WAGER_DISCOUNT_KEY, WAGER_DISCOUNT_USES_KEY]);
    const current = Math.max(
      parseSingleUseCount(usesRaw?.[1] ?? null),
      discountRaw?.[1] === '0.25' ? 1 : 0,
    );
    return { giftId: id, status: 'prepared', singleUse: { kind, target: current + 1 } };
  });
  if (!staged) return false;
  const planned = staged.receipt.singleUse;
  if (!planned || planned.kind !== kind || planned.target < 1) {
    throw new Error('level_gift_single_use_receipt_invalid');
  }
  if (staged.receipt.status !== 'prepared') return true;
  const [discountRaw, usesRaw] = await AsyncStorage.multiGet([WAGER_DISCOUNT_KEY, WAGER_DISCOUNT_USES_KEY]);
  const current = Math.max(
    parseSingleUseCount(usesRaw?.[1] ?? null),
    discountRaw?.[1] === '0.25' ? 1 : 0,
  );
  await AsyncStorage.multiSet([
    [WAGER_DISCOUNT_KEY, '0.25'],
    [WAGER_DISCOUNT_USES_KEY, String(Math.max(current, planned.target))],
  ]);
  await markLevelGiftEffectApplied(staged, opts);
  return true;
};

const applyTimedGiftMultiplierForOccurrence = async (
  id: GiftId,
  multiplier: number,
  durationMs: number,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult | null> => {
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    const now = Date.now();
    let existing: GiftMultiplierState | null = null;
    try {
      const raw = await AsyncStorage.getItem(GIFT_MULT_KEY);
      existing = raw ? JSON.parse(raw) as GiftMultiplierState : null;
    } catch {}
    const active = !!existing && now < existing.expiresAt && existing.multiplier > 1;
    const safeMultiplier = Math.max(1, Number(multiplier) || 1);
    return {
      giftId: id,
      status: 'prepared',
      multiplier: {
        multiplier: active && existing!.multiplier >= safeMultiplier ? existing!.multiplier : safeMultiplier,
        expiresAt: active && existing!.multiplier >= safeMultiplier
          ? Math.max(existing!.expiresAt, now + durationMs)
          : now + durationMs,
        xpBoostAlreadyActive: active,
      },
    };
  });
  if (!staged) return null;
  const planned = staged.receipt.multiplier;
  if (!planned) throw new Error('level_gift_multiplier_receipt_invalid');
  if (staged.receipt.status !== 'prepared') {
    return { success: true, xpBoostAlreadyActive: planned.xpBoostAlreadyActive };
  }
  let existing: GiftMultiplierState | null = null;
  try {
    const raw = await AsyncStorage.getItem(GIFT_MULT_KEY);
    existing = raw ? JSON.parse(raw) as GiftMultiplierState : null;
  } catch {}
  const projected = existing && existing.multiplier > planned.multiplier
    ? existing
    : {
      multiplier: planned.multiplier,
      expiresAt: existing?.multiplier === planned.multiplier
        ? Math.max(existing.expiresAt, planned.expiresAt)
        : planned.expiresAt,
    };
  await AsyncStorage.setItem(GIFT_MULT_KEY, JSON.stringify(projected));
  await markLevelGiftEffectApplied(staged, opts);
  return { success: true, xpBoostAlreadyActive: planned.xpBoostAlreadyActive };
};

const applyChainShieldForOccurrence = async (
  id: 'chain_shield_1' | 'chain_shield_3',
  days: 1 | 3,
  grantedAt: string,
  opts?: ApplyGiftOptions,
): Promise<boolean | null> => {
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    let currentDays = 0;
    try {
      const raw = await AsyncStorage.getItem(CHAIN_SHIELD_KEY);
      const parsed = raw ? JSON.parse(raw) as { daysLeft?: unknown } : null;
      currentDays = Math.max(0, Math.floor(Number(parsed?.daysLeft) || 0));
    } catch {}
    return {
      giftId: id,
      status: 'prepared',
      chainShield: { daysLeft: currentDays + days, grantedAt },
    };
  });
  if (!staged) return null;
  const planned = staged.receipt.chainShield;
  if (!planned || planned.daysLeft < days) throw new Error('level_gift_chain_shield_receipt_invalid');
  if (staged.receipt.status !== 'prepared') return true;
  let currentDays = 0;
  try {
    const raw = await AsyncStorage.getItem(CHAIN_SHIELD_KEY);
    const parsed = raw ? JSON.parse(raw) as { daysLeft?: unknown } : null;
    currentDays = Math.max(0, Math.floor(Number(parsed?.daysLeft) || 0));
  } catch {}
  await AsyncStorage.setItem(CHAIN_SHIELD_KEY, JSON.stringify({
    daysLeft: Math.max(currentDays, planned.daysLeft),
    grantedAt: planned.grantedAt,
  }));
  await markLevelGiftEffectApplied(staged, opts);
  return true;
};

const applySpinPlusForOccurrence = async (
  id: 'plus_days_3' | 'plus_days_7',
  days: 3 | 7,
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

type CosmeticOwnershipRead<T> =
  | Readonly<{ status: 'available'; value: Record<string, T> }>
  | Readonly<{ status: 'unavailable'; reason: 'read_failed' | 'malformed' }>;

const readCosmeticOwnership = async <T>(
  key: string,
  isAllowedValue: (value: unknown) => value is T,
): Promise<CosmeticOwnershipRead<T>> => {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return { status: 'unavailable', reason: 'read_failed' };
  }
  const parsed = parseStrictOwnedIdMap(raw, isAllowedValue);
  return parsed.status === 'malformed'
    ? { status: 'unavailable', reason: 'malformed' }
    : { status: 'available', value: parsed.value };
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

const applyAuraGiftForOccurrence = async (
  id: GiftId,
  opts?: ApplyGiftOptions,
): Promise<{ handled: boolean; cosmeticUnlocked: GiftCosmeticUnlock | null }> => {
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    const ownership = await readCosmeticOwnership(AVATAR_AURA_OWNED_KEY, (value): value is true => value === true);
    if (ownership.status === 'unavailable') {
      if (ownership.reason === 'read_failed') throw new Error('aura_gift_ownership_read_failed');
      return { giftId: id, status: 'prepared', aura: null };
    }
    const owned = ownership.value;
    const candidates = AVATAR_AURAS.filter((aura) => isRandomAvatarAuraGiftCandidate(aura, owned));
    const aura = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      giftId: id,
      status: 'prepared',
      aura: aura ? {
        kind: 'aura',
        id: aura.id,
        labelRu: aura.nameRu,
        labelUk: aura.nameUk,
        labelEs: aura.nameEs,
      } : null,
    };
  }, 'aura');
  if (!staged) return { handled: false, cosmeticUnlocked: null };
  let result = staged.receipt.aura ?? null;
  if (staged.receipt.status === 'applied' || staged.receipt.status === 'applied_unconfirmed') {
    return { handled: true, cosmeticUnlocked: result };
  }
  const replayingApplying = staged.receipt.status === 'applying';
  if (result) {
    const ownership = await readCosmeticOwnership(AVATAR_AURA_OWNED_KEY, (value): value is true => value === true);
    if (ownership.status === 'unavailable') {
      if (ownership.reason === 'read_failed') throw new Error('aura_gift_ownership_read_failed');
      if (replayingApplying) throw new Error('aura_gift_ownership_corrupt');
      await persistPreparedCosmeticNull(staged, 'aura');
      result = null;
    }
    const owned = ownership.status === 'available' ? ownership.value : null;
    if (!replayingApplying && owned && owned[result?.id ?? '']) {
      await persistPreparedCosmeticNull(staged, 'aura');
      result = null;
    }
    if (owned && result) {
      await markLevelGiftCosmeticApplying(staged, opts);
      await AsyncStorage.multiSet([
        [AVATAR_AURA_OWNED_KEY, JSON.stringify({ ...owned, [result.id]: true })],
        [AVATAR_AURA_GIFT_OWNED_KEY, result.id],
        [USER_AVATAR_AURA_KEY, result.id],
      ]);
    }
  }
  await markLevelGiftEffectApplied(staged, opts);
  return { handled: true, cosmeticUnlocked: result };
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

const applyCustomAvatarGiftForOccurrence = async (
  id: GiftId,
  opts?: ApplyGiftOptions,
): Promise<{ handled: boolean; cosmeticUnlocked: GiftCosmeticUnlock | null }> => {
  const staged = await prepareLevelGiftEffectReceipt(id, opts, async () => {
    const ownership = await readCosmeticOwnership(
      CUSTOM_AVATAR_OWNED_KEY,
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    if (ownership.status === 'unavailable') {
      if (ownership.reason === 'read_failed') throw new Error('custom_avatar_gift_ownership_read_failed');
      return { giftId: id, status: 'prepared', customAvatar: null };
    }
    const owned = ownership.value;
    // The level-milestone gift keeps its historical 01..40 pool. Only a spin
    // occurrence uses the owner-approved complete generated shelf 01..125.
    const spinSpecific = id === 'cosmetic_avatar_common'
      && /^level-spin:[A-Za-z0-9_-]{8,}:(?:base|premium)$/.test(opts?.occurrenceId ?? '');
    const candidates = spinSpecific
      ? listSpinCustomAvatarGiftCandidates(owned)
      : CUSTOM_AVATAR_GIFT_POOL.filter((avatar) => !owned[avatar.id]);
    if (candidates.length === 0) {
      return { giftId: id, status: 'prepared', customAvatar: null };
    }
    const avatarWeight = spinSpecific
      ? getSpinCustomAvatarGiftWeight
      : (candidate: typeof candidates[number]) => getCustomAvatarGiftWeight(candidate.id);
    const totalWeight = candidates.reduce((sum, candidate) => sum + avatarWeight(candidate), 0);
    let roll = Math.random() * (totalWeight || 1);
    const avatar = candidates.find((candidate) => {
      roll -= avatarWeight(candidate);
      return roll <= 0;
    }) ?? candidates[candidates.length - 1]!;
    const gradient = CUSTOM_AVATAR_GRADIENTS[Math.floor(Math.random() * CUSTOM_AVATAR_GRADIENTS.length)]!;
    const logoColor: CustomAvatarLogoColor = Math.random() < 0.5 ? 'black' : 'white';
    return {
      giftId: id,
      status: 'prepared',
      customAvatar: {
        kind: 'avatar',
        id: avatar.id,
        gradientId: gradient.id,
        logoColor,
        labelRu: customAvatarGiftLabelForLang(avatar, gradient, 'ru'),
        labelUk: customAvatarGiftLabelForLang(avatar, gradient, 'uk'),
        labelEs: customAvatarGiftLabelForLang(avatar, gradient, 'es'),
      },
    };
  }, 'custom_avatar');
  if (!staged) return { handled: false, cosmeticUnlocked: null };
  let result = staged.receipt.customAvatar ?? null;
  if (staged.receipt.status === 'applied' || staged.receipt.status === 'applied_unconfirmed') {
    return { handled: true, cosmeticUnlocked: result };
  }
  const replayingApplying = staged.receipt.status === 'applying';
  if (result) {
    const ownership = await readCosmeticOwnership(
      CUSTOM_AVATAR_OWNED_KEY,
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    if (ownership.status === 'unavailable') {
      if (ownership.reason === 'read_failed') throw new Error('custom_avatar_gift_ownership_read_failed');
      if (replayingApplying) throw new Error('custom_avatar_gift_ownership_corrupt');
      await persistPreparedCosmeticNull(staged, 'customAvatar');
      result = null;
    }
    const owned = ownership.status === 'available' ? ownership.value : null;
    if (!replayingApplying && owned && owned[result?.id ?? '']) {
      await persistPreparedCosmeticNull(staged, 'customAvatar');
      result = null;
    }
    if (owned && result) {
      await markLevelGiftCosmeticApplying(staged, opts);
      await AsyncStorage.multiSet([
        [CUSTOM_AVATAR_OWNED_KEY, JSON.stringify({
          ...owned,
          [result.id]: encodeOwnedStyle(result.gradientId!, result.logoColor!),
        })],
        [COSMETIC_GIFT_OWNED_AVATAR_KEY, result.id],
      ]);
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
  try {
    const stableId = await getCanonicalUserId();
    const reservation = gift.levelGiftReservation;
    if (!stableId || !reservation || reservation.lane !== 'f2p') return 'unavailable';
    const result = await callLevelGiftReservationAction({
      stableId,
      level,
      lane: 'f2p',
      studyTarget: storageStudyTarget(studyTarget),
      reservationId: reservation.reservationId,
      action: 'display',
    });
    return result.status === 'acquired' || result.status === 'already_displayed'
      ? result.status
      : 'unavailable';
  } catch {
    return 'unavailable';
  }
};

const LEVEL_GIFT_APPLY_JOURNAL_KEY = 'level_gift_apply_journal_v1';
type LevelGiftApplyJournalEntry = {
  reservationId: string;
  giftId: string;
  claimToken: string;
  status: 'prepared' | 'effect_applied';
};

const readLevelGiftApplyJournal = async (): Promise<Record<string, LevelGiftApplyJournalEntry>> => {
  const raw = await AsyncStorage.getItem(LEVEL_GIFT_APPLY_JOURNAL_KEY);
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, LevelGiftApplyJournalEntry>
    : {};
};

const saveVerifiedLevelGiftApplyJournal = async (
  journal: Record<string, LevelGiftApplyJournalEntry>,
  occurrenceKey: string,
): Promise<boolean> => {
  await AsyncStorage.setItem(LEVEL_GIFT_APPLY_JOURNAL_KEY, JSON.stringify(journal));
  const verified = await readLevelGiftApplyJournal();
  const expected = journal[occurrenceKey];
  const actual = verified[occurrenceKey];
  return !!expected && actual?.reservationId === expected.reservationId
    && actual.giftId === expected.giftId
    && actual.claimToken === expected.claimToken
    && actual.status === expected.status;
};

const removeLevelGiftApplyJournalEntry = async (occurrenceKey: string): Promise<void> => {
  const journal = await readLevelGiftApplyJournal();
  delete journal[occurrenceKey];
  await AsyncStorage.setItem(LEVEL_GIFT_APPLY_JOURNAL_KEY, JSON.stringify(journal));
};

const MARKETPLACE_CACHE_PRIME_DELAY_MS = 1400;
const scheduledMarketplaceCachePrimeTargets = new Set<string>();

const scheduleMarketplaceCachePrime = (studyTarget?: RuntimeStudyTarget): void => {
  const target = storageStudyTarget(studyTarget);
  if (scheduledMarketplaceCachePrimeTargets.has(target)) return;
  scheduledMarketplaceCachePrimeTargets.add(target);

  const schedule = () => {
    const timer = setTimeout(() => {
      scheduledMarketplaceCachePrimeTargets.delete(target);
      try {
        void Promise.resolve(primeMarketplaceBuiltCardsCacheFromAccessibleStorage(studyTarget)).catch(() => {});
      } catch {}
    }, MARKETPLACE_CACHE_PRIME_DELAY_MS);
    (timer as any)?.unref?.();
  };

  try {
    InteractionManager.runAfterInteractions(schedule);
  } catch {
    schedule();
  }
};

const applyEnergyBonusN = async (
  n: 1 | 2 | 3,
  currentEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult> => {
  const accountToken = opts?.accountToken ?? captureAccountGeneration();
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return { success: false };
    const existing = await readBonusEnergyForMutation(accountToken);
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return { success: false };
    const energyBoostAlreadyActive = existing !== null && (existing.amount ?? 0) > 0;
    const accumulatedAmount = (existing?.amount ?? 0) + n;
    const bonus: BonusEnergyState = { amount: accumulatedAmount, expiresAt: getTomorrowMidnightMs() };
    await writeGiftAccountValue(BONUS_ENERGY_KEY, JSON.stringify(bonus), accountToken);
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return { success: false };
    // The temporary pool is already born full. Refresh consumers without also
    // adding N to persistent base energy (which would duplicate the reward).
    await setEnergy(currentEnergy);
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
  const spinReceipt = gift.spinRewardReceipt;
  if (spinReceipt) {
    const accountToken = opts?.accountToken;
    const stableId = accountToken?.stableId;
    const deliveryToken = opts?.spinDeliveryToken;
    if (!stableId || !deliveryToken || !isCurrentAccountGeneration(accountToken, stableId)) return null;
    const grant = await callLevelSpinActivatePackGift({
      stableId,
      requestId: spinReceipt.requestId,
      lane: spinReceipt.lane,
      deliveryToken,
    });
    if (!isCurrentAccountGeneration(accountToken, stableId)
      || !grant.voucherId
      || !Number.isFinite(grant.expiresAt)
      || grant.expiresAt <= Date.now()) return null;
    return {
      stableId,
      voucherId: grant.voucherId,
      expiresAt: grant.expiresAt,
      ...(grant.allowedPackId ? { allowedPackId: grant.allowedPackId } : {}),
    };
  }
  const reservationId = gift.levelGiftReservation?.reservationId;
  if (!reservationId) return null;
  const stableId = await getCanonicalUserId();
  if (!stableId) return null;
  const grant = await callLevelGiftActivatePackGift({ stableId, reservationId });
  if (!grant.voucherId || !Number.isFinite(grant.expiresAt) || grant.expiresAt <= Date.now()) return null;
  return {
    stableId,
    voucherId: grant.voucherId,
    expiresAt: grant.expiresAt,
    ...(grant.allowedPackId ? { allowedPackId: grant.allowedPackId } : {}),
  };
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
  /** Internal capability propagated only by withXpAccountOperationQueue. */
  xpOperationLease?: XpOperationLease;
}

const applyGiftUnlocked = async (
  gift: GiftDef,
  userName: string,
  currentEnergy: number,
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult> => {
  try {
    const preserveGiftId = opts?.preserveGiftId === true;
    const isPremium = preserveGiftId ? false : opts?.isPremium ?? await getVerifiedPremiumStatus();
    const today = new Date().toISOString().split('T')[0];
    let id = gift.id;
    // Safety-net: если старый/ручной подарок всё же попал премиуму, заменяем на осколки.
    if (!preserveGiftId && isPremium && PREMIUM_BLOCKED_F2P_IDS.has(id)) {
      id = 'prem_shards_10';
    }
    if (!preserveGiftId
      && !flashcardPackLevelGiftsAllowed(opts?.studyTarget)
      && isFlashcardPackLevelGiftId(id)
      && !isTrialPackLevelGiftId(id)) {
      id = sourceGatedFallbackGiftId(id);
    }

    // зачем (2026-08-02, владелец): «подарок обещает награду, а платит 0» — обман игрока.
    // Все мгновенные XP-подарки (включая бывшие жемчужные) идут одним каналом с дневной
    // идемпотентностью — как это всегда делали xp_50/100/250.
    const grantInstantGiftXp = async (amount: number): Promise<void> => {
      const occurrence = opts?.occurrenceId
        ? safeLevelGiftEventPart(opts.occurrenceId)
        : safeLevelGiftEventPart(today, 20);
      await registerXP(amount, 'achievement_reward', userName, 'ru', undefined, {
        eventId: ['achievement', 'level_gift', safeLevelGiftEventPart(opts?.studyTarget), occurrence, safeLevelGiftEventPart(id)].join(':'),
        payload: { giftId: id, surface: 'level_gift', studyTarget: opts?.studyTarget ?? null, occurrenceId: opts?.occurrenceId ?? null },
        accountToken: opts?.accountToken,
        accountTransitionLockLease: opts?.accountTransitionLockLease,
        xpOperationLease: opts?.xpOperationLease,
      });
    };
    const grantXpBankWithoutLoss = async (amount: number): Promise<void> => {
      const owner = opts?.accountToken?.stableId ?? await getCanonicalUserId() ?? 'unscoped';
      const occurrence = opts?.occurrenceId ?? `${today}:${id}`;
      await grantGiftXpBankForOccurrence(amount, owner, occurrence, grantInstantGiftXp);
    };
    const grantSpinPearls = async (amount: number): Promise<void> => {
      const accountToken = opts?.accountToken;
      const stableId = accountToken?.stableId?.trim();
      const occurrenceId = opts?.occurrenceId?.trim();
      if (!accountToken || !stableId || !occurrenceId || !isCurrentAccountGeneration(accountToken, stableId)) {
        throw new Error('level_spin_pearls_identity_not_ready');
      }
      const eventHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `level-spin-pearl:${stableId}:${occurrenceId}:${id}`,
      );
      const result = await commitShardCreditOperation({
        operationId: `level-spin-pearl:${eventHash.slice(0, 40)}`,
        amount,
        reason: 'level_spin_pearls',
        grant: {
          kind: 'level_spin_reward',
          subjectId: eventHash.slice(0, 40),
          payload: { giftId: id, amount, occurrenceId },
        },
        accountToken,
        accountTransitionLockLease: opts?.accountTransitionLockLease,
      });
      if (result.status !== 'applied' && result.status !== 'already-applied') {
        throw new Error('level_spin_pearls_commit_failed');
      }
    };
    const grantSpinStars = async (): Promise<void> => {
      const accountToken = opts?.accountToken;
      const stableId = accountToken?.stableId?.trim();
      const occurrenceId = opts?.occurrenceId?.trim() ?? '';
      const occurrenceMatch = /^level-spin:([A-Za-z0-9_-]{16,96}):(base|premium)$/.exec(occurrenceId);
      const requestId = gift.spinRewardReceipt?.requestId ?? occurrenceMatch?.[1] ?? '';
      const lane = gift.spinRewardReceipt?.lane ?? occurrenceMatch?.[2] as 'base' | 'premium' | undefined;
      if (!accountToken || !stableId || !requestId || !lane || !isCurrentAccountGeneration(accountToken, stableId)) {
        throw new Error('level_spin_star_identity_not_ready');
      }
      await enqueueLevelSpinStarGrant({
        token: accountToken,
        requestId,
        lane,
        ...(opts?.spinDeliveryToken ? { deliveryToken: opts.spinDeliveryToken } : {}),
        giftId: id,
      }, {
        accountTransitionLockLease: opts?.accountTransitionLockLease,
      });
    };

    switch (id) {
      case 'energy_full': {
        if (await applyEnergyFullForOccurrence(id, maxEnergy, setEnergy, opts)) break;
        const accountToken = opts?.accountToken ?? captureAccountGeneration();
        if (!isCurrentAccountGeneration(accountToken)) {
          throw new Error('level_gift_effect_account_changed');
        }
        // зачем (аудит 2026-08-24): тот же класс гонки, что в applyEnergyFullForOccurrence —
        // read-modify-write energy_state мимо withStorageLock перетирал свежую трату.
        await withStorageLock(async () => {
          const esRaw = await AsyncStorage.getItem('energy_state');
          if (!isCurrentAccountGeneration(accountToken)) {
            throw new Error('level_gift_effect_account_changed');
          }
          const es = esRaw
            ? (JSON.parse(esRaw) as { current?: number; lastRecoveryTime?: number })
            : {};
          const lastRecoveryTime = Math.max(0, Number(es.lastRecoveryTime) || Date.now());
          await AsyncStorage.setItem('energy_state', JSON.stringify({ current: maxEnergy, lastRecoveryTime }));
        });
        if (!isCurrentAccountGeneration(accountToken)) {
          throw new Error('level_gift_effect_account_changed');
        }
        await setEnergy(maxEnergy);
        break;
      }
      case 'xp_50':
      case 'xp_100':
      case 'xp_250':
      case 'xp_500':
      case 'xp_1000':
      case 'xp_3000':
      case 'xp_5000':
      case 'xp_10000':
      case 'xp_25000':
      case 'xp_50000':
        await grantInstantGiftXp(Number(id.slice(3)));
        break;
      case 'pearls_5':
      case 'pearls_10':
      case 'pearls_20':
      case 'pearls_50':
      case 'pearls_100':
      case 'pearls_250':
      case 'pearls_500':
        await grantSpinPearls(Number(id.slice('pearls_'.length)));
        break;
      case 'stars_10':
      case 'stars_20':
      case 'stars_50':
      case 'stars_100':
      case 'stars_250':
      case 'stars_500':
      case 'stars_1000':
        await grantSpinStars();
        break;
      case 'plus_days_3':
      case 'plus_days_7': {
        const days = id === 'plus_days_3' ? 3 : 7;
        if (!await applySpinPlusForOccurrence(id, days, opts)) return { success: false };
        break;
      }
      case 'hint_1':
      case 'hint_3': {
        const count = id === 'hint_1' ? 1 : 3;
        const key = lessonBonusHintsKey(today, opts?.studyTarget);
        if (await applyHintGiftForOccurrence(id, count, key, opts)) break;
        const cur = parseInt((await AsyncStorage.getItem(key)) || '0', 10) || 0;
        await AsyncStorage.setItem(key, String(cur + count));
        break;
      }
      case 'energy_plus1': {
        const applied = await applyEnergyBonusForOccurrence(id, 1, currentEnergy, setEnergy, opts);
        return applied ?? await applyEnergyBonusN(1, currentEnergy, setEnergy, opts);
      }
      case 'energy_plus2': {
        const applied = await applyEnergyBonusForOccurrence(id, 2, currentEnergy, setEnergy, opts);
        return applied ?? await applyEnergyBonusN(2, currentEnergy, setEnergy, opts);
      }
      case 'energy_plus3': {
        const applied = await applyEnergyBonusForOccurrence(id, 3, currentEnergy, setEnergy, opts);
        return applied ?? await applyEnergyBonusN(3, currentEnergy, setEnergy, opts);
      }
      case 'chain_shield_1':
      case 'chain_shield_3': {
        const days = id === 'chain_shield_1' ? 1 : 3;
        const applied = await applyChainShieldForOccurrence(id, days, today, opts);
        if (applied !== null) break;
        const raw = await AsyncStorage.getItem(CHAIN_SHIELD_KEY);
        const ex = raw ? (JSON.parse(raw) as { daysLeft: number }) : null;
        const daysLeft = (ex?.daysLeft ?? 0) + days;
        await AsyncStorage.setItem(CHAIN_SHIELD_KEY, JSON.stringify({ daysLeft, grantedAt: today }));
        break;
      }
      case 'attempt_restore_all': {
        const localOccurrence = /^level-spin:([A-Za-z0-9_-]{8,}):(base|premium)$/
          .exec(opts?.occurrenceId ?? '');
        const authority = gift.spinRewardReceipt
          ? { requestId: gift.spinRewardReceipt.requestId, lane: gift.spinRewardReceipt.lane }
          : localOccurrence
            ? { requestId: localOccurrence[1]!, lane: localOccurrence[2] as 'base' | 'premium' }
            : null;
        if (!authority || !opts?.accountToken) return { success: false };
        await creditAttemptRestoreGiftFromSpin({
          token: opts.accountToken,
          spinRequestId: authority.requestId,
          lane: authority.lane,
          accountTransitionLockLease: opts.accountTransitionLockLease,
        });
        break;
      }
      case 'xp_2x_24h':
      case 'xp_2x_48h': {
        const hours = id === 'xp_2x_24h' ? 24 : 48;
        const applied = await applyTimedGiftMultiplierForOccurrence(id, 2, hours * 3600000, opts);
        return applied ?? await setTimedGiftMultiplier(2, hours * 3600000);
      }
      case 'xp_bank_150': {
        await grantXpBankWithoutLoss(150);
        break;
      }
      case 'xp_bank_300': {
        await grantXpBankWithoutLoss(300);
        break;
      }
      case 'xp_bank_600': {
        await grantXpBankWithoutLoss(600);
        break;
      }
      case 'premium_xp_bank_1000': {
        await grantXpBankWithoutLoss(1000);
        break;
      }
      case 'focus_10m_25': {
        const applied = await applyTimedGiftMultiplierForOccurrence(id, 1.25, 10 * 60 * 1000, opts);
        return applied ?? await setTimedGiftMultiplier(1.25, 10 * 60 * 1000);
      }
      case 'focus_15m_50': {
        const applied = await applyTimedGiftMultiplierForOccurrence(id, 1.5, 15 * 60 * 1000, opts);
        return applied ?? await setTimedGiftMultiplier(1.5, 15 * 60 * 1000);
      }
      case 'cosmetic_avatar_common':
      case 'premium_cosmetic_avatar': {
        const spinSpecific = id === 'cosmetic_avatar_common'
          && /^level-spin:[A-Za-z0-9_-]{8,}:(?:base|premium)$/.test(opts?.occurrenceId ?? '');
        const occurrenceAvatar = await applyCustomAvatarGiftForOccurrence(id, opts);
        if (occurrenceAvatar.handled && occurrenceAvatar.cosmeticUnlocked) {
          return { success: true, cosmeticUnlocked: occurrenceAvatar.cosmeticUnlocked };
        }
        const cosmeticUnlocked = occurrenceAvatar.handled
          ? null
          : await unlockRandomCustomAvatarGift(opts?.accountToken);
        if (cosmeticUnlocked) return { success: true, cosmeticUnlocked };
        // New rolls exclude an exhausted avatar prize before the ticket is
        // drawn. This is only a stale-receipt fallback (last avatar bought in
        // between), and must not alter milestone 01..40 aura fallback rules.
        if (spinSpecific) {
          await grantInstantGiftXp(350);
          return { success: true };
        }
        const occurrenceAura = await applyAuraGiftForOccurrence(id, opts);
        if (occurrenceAura.handled) {
          if (occurrenceAura.cosmeticUnlocked) return { success: true, cosmeticUnlocked: occurrenceAura.cosmeticUnlocked };
          await grantInstantGiftXp(350);
          return { success: true };
        }
        const fallbackAura = await unlockRandomAvatarAuraGift();
        if (fallbackAura) return { success: true, cosmeticUnlocked: fallbackAura };
        // Вся косметика уже открыта — честная XP-компенсация вместо прежнего нулевого жемчуга.
        await grantInstantGiftXp(350);
        return { success: true };
      }
      case 'cosmetic_theme': {
        const occurrenceTheme = await applyThemeGiftForOccurrence(id, opts);
        if (occurrenceTheme.handled) {
          if (occurrenceTheme.cosmeticUnlocked) {
            return { success: true, cosmeticUnlocked: occurrenceTheme.cosmeticUnlocked };
          }
          // Сюда попадает только квитанция, выданная ДО того, как человек
          // открыл последнюю тему: розыгрыш такую награду больше не выбирает
          // (см. listExhaustedSpinRewardIds). Компенсация намеренно скромная —
          // владелец отверг выплату в цену темы как слишком щедрую. Но не
          // ноль: подарок обязан хоть что-то дать, иначе это класс бага
          // «награду показали, но не начислили».
          await grantInstantGiftXp(THEME_GIFT_FALLBACK_XP);
          return { success: true };
        }
        const cosmeticUnlocked = await unlockRandomThemeGift();
        if (cosmeticUnlocked) return { success: true, cosmeticUnlocked };
        await grantInstantGiftXp(THEME_GIFT_FALLBACK_XP);
        return { success: true };
      }
      case 'cosmetic_avatar_aura':
      case 'premium_cosmetic_aura': {
        const occurrenceAura = await applyAuraGiftForOccurrence(id, opts);
        if (occurrenceAura.handled) {
          if (occurrenceAura.cosmeticUnlocked) return { success: true, cosmeticUnlocked: occurrenceAura.cosmeticUnlocked };
          await grantInstantGiftXp(350);
          return { success: true };
        }
        const cosmeticUnlocked = await unlockRandomAvatarAuraGift();
        if (cosmeticUnlocked) return { success: true, cosmeticUnlocked };
        await grantInstantGiftXp(350);
        return { success: true };
      }
      // зачем (2026-08-02, владелец): бывшие жемчужные подарки — теперь честный мгновенный XP
      // (карточки в пулах переименованы; выплата жемчуга была занулена §7 и обманывала игрока).
      case 'shards_3': {
        await grantInstantGiftXp(150);
        break;
      }
      case 'shards_6': {
        await grantInstantGiftXp(350);
        break;
      }
      case 'shards_10': {
        await grantInstantGiftXp(700);
        break;
      }
      case 'club_boost_free': {
        // Canonical count is granted only by levelGiftReserve complete_claim.
        return { success: false };
      }
      case 'wager_discount_25': {
        if (await applySingleUseGiftForOccurrence(id, opts)) break;
        await AsyncStorage.setItem(WAGER_DISCOUNT_KEY, '0.25');
        break;
      }
      case 'prem_shards_10': {
        await grantInstantGiftXp(400);
        break;
      }
      case 'prem_shards_15': {
        await grantInstantGiftXp(800);
        break;
      }
      case 'prem_shards_20': {
        await grantInstantGiftXp(1200);
        break;
      }
      case 'prem_pack_48h': {
        const grant = await activateLevelPackGift(gift, opts);
        if (!grant) return { success: false };
        const trial = await setRandomPackGiftTrial48h(
          opts?.studyTarget,
          grant.voucherId,
          grant.expiresAt,
          opts?.occurrenceId,
          'level_gift',
        );
        if (!trial) return { success: false };
        scheduleMarketplaceCachePrime(opts?.studyTarget);
        break;
      }
      case 'pack_voucher_48h': {
        const grant = await activateLevelPackGift(gift, opts);
        if (!grant) return { success: false };
        const trial = await setRandomPackGiftTrial48h(
          opts?.studyTarget,
          grant.voucherId,
          grant.expiresAt,
          opts?.occurrenceId,
          'level_gift',
        );
        if (!trial) return { success: false };
        scheduleMarketplaceCachePrime(opts?.studyTarget);
        break;
      }
      case 'prem_level_unlock_negotiator':
      case 'prem_level_unlock_dark_logic':
      case 'prem_level_unlock_wild_west':
      case 'prem_level_unlock_royal_tea':
      case 'prem_level_unlock_peaky_blinders': {
        const packIdGift = PREMIUM_LEVEL_GIFT_ID_TO_PACK[id];
        if (!packIdGift) break;
        const grant = await activateLevelPackGift(gift, opts);
        if (!grant || grant.allowedPackId !== packIdGift) return { success: false };
        const redemption = await callFlashcardPackGiftRedeem({
          buyerStableId: grant.stableId,
          packId: packIdGift,
          packType: 'official',
          studyTarget: storageStudyTarget(opts?.studyTarget),
          voucherId: grant.voucherId,
        });
        if (!redemption.gifted && !redemption.alreadyOwned) return { success: false };
        await addOwnedPackId(packIdGift, opts?.studyTarget);
        await pushPremiumPackUnlockGiftReceivedPackId(packIdGift);
        scheduleMarketplaceCachePrime(opts?.studyTarget);
        break;
      }
      default:
        return { success: false };
    }
    return { success: true };
  } catch { return { success: false }; }
};

function levelGiftDefinitionById(giftId: string): GiftDef | null {
  for (const gift of [...GIFT_F2P, ...GIFT_PREMIUM, ...PREMIUM_LEVEL_GIFT_PACK_UNLOCK_DEFS, ...SPIN_REWARD_DEFS]) {
    if (gift.id === giftId) return cloneGiftDef(gift);
    const choice = gift.choices?.find((candidate) => candidate.id === giftId);
    if (choice) return cloneGiftDef(choice);
  }
  return null;
}

async function applySpinRewardGift(
  gift: GiftDef,
  userName: string,
  currentEnergy: number,
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult> {
  const authority = gift.spinRewardReceipt;
  const accountToken = opts?.accountToken;
  if (!authority || !accountToken?.stableId || !isCurrentAccountGeneration(accountToken)) {
    return { success: false };
  }
  const stableId: string = accountToken.stableId;
  const occurrenceId = `level-spin:${authority.requestId}:${authority.lane}`;
  const occurrenceKey = `${safeLevelGiftEventPart(stableId, 80)}:${safeLevelGiftEventPart(occurrenceId, 120)}`;
  const reservationId = occurrenceId;
  try {
    const entry = await withAccountTransitionLock(async (): Promise<LevelGiftApplyJournalEntry | null> => {
      if (!isCurrentAccountGeneration(accountToken, stableId)) return null;
      const journal = await readLevelGiftApplyJournal();
      if (!isCurrentAccountGeneration(accountToken, stableId)) return null;
      const prior = journal[occurrenceKey];
      const prepared: LevelGiftApplyJournalEntry = prior?.reservationId === reservationId
        ? prior
        : {
          reservationId,
          giftId: gift.id,
          claimToken: Crypto.randomUUID(),
          status: 'prepared',
        };
      journal[occurrenceKey] = prepared;
      if (!await saveVerifiedLevelGiftApplyJournal(journal, occurrenceKey)) return null;
      return isCurrentAccountGeneration(accountToken, stableId) ? prepared : null;
    });
    if (!entry) return { success: false };
    const actionBase = {
      stableId,
      requestId: authority.requestId,
      lane: authority.lane,
      deliveryToken: entry.claimToken,
      selectedGiftId: authority.giftId,
    } as const;
    const begun = await callLevelSpinDeliveryAction({ ...actionBase, action: 'begin_delivery' });
    if (!isCurrentAccountGeneration(accountToken, stableId)) return { success: false };
    if (begun.status === 'already_claimed') {
      await withAccountTransitionLock(async () => {
        if (!isCurrentAccountGeneration(accountToken, stableId)) return;
        await removeLevelGiftApplyJournalEntry(occurrenceKey);
      }).catch(() => {});
      return { success: false, alreadyClaimed: true };
    }
    if (begun.status !== 'acquired' || !begun.giftId) return { success: false };
    const serverDefinition = levelGiftDefinitionById(begun.giftId);
    if (!serverDefinition) {
      await callLevelSpinDeliveryAction({ ...actionBase, action: 'release_delivery' }).catch(() => null);
      return { success: false };
    }
    const definition = serverDefinition;
    const effectiveGift: GiftDef = {
      ...definition,
      // Keep the immutable raw receipt as authority; begun.giftId is the server's
      // current-entitlement canonical gift used only for this delivery's effect.
      spinRewardReceipt: { ...authority, giftId: authority.giftId },
    };
    const result = await withXpAccountOperationQueue(accountToken, (xpLease) => (
      withAccountTransitionLock(async (lease): Promise<ApplyGiftResult> => {
        if (!isCurrentAccountGeneration(accountToken, stableId)) return { success: false };
        const journal = await readLevelGiftApplyJournal();
        const activeEntry = journal[occurrenceKey];
        if (!isCurrentAccountGeneration(accountToken, stableId)
          || activeEntry?.reservationId !== reservationId
          || activeEntry.claimToken !== entry.claimToken
          || activeEntry.giftId !== gift.id) {
          return { success: false };
        }
        let applied: ApplyGiftResult = { success: true };
        if (activeEntry.status !== 'effect_applied') {
          applied = await applyGiftUnlocked(effectiveGift, userName, currentEnergy, maxEnergy, setEnergy, {
            ...opts,
            occurrenceId,
            preserveGiftId: true,
            spinDeliveryToken: activeEntry.claimToken,
            accountTransitionLockLease: lease,
            xpOperationLease: xpLease,
          });
          if (!applied.success || !isCurrentAccountGeneration(accountToken, stableId)) {
            return applied.success ? { success: false } : applied;
          }
          activeEntry.status = 'effect_applied';
          journal[occurrenceKey] = activeEntry;
          const persisted = await saveVerifiedLevelGiftApplyJournal(journal, occurrenceKey).catch(() => false);
          if (!persisted || !isCurrentAccountGeneration(accountToken, stableId)) return { success: false };
        }
        await confirmLevelGiftEffectReceipts(accountToken, occurrenceId);
        return applied;
      })
    ), { success: false });
    if (!result.success || !isCurrentAccountGeneration(accountToken, stableId)) {
      // Once local application has started, failure is ambiguous: an inner
      // exactly-once receipt may already be applied_unconfirmed even if the
      // outer journal write crashed. Keep the same delivery token pinned so a
      // retry completes this receipt; releasing here could let another device
      // acquire and materialize the same reward again.
      return result.success ? { success: false } : result;
    }
    const completed = await callLevelSpinDeliveryAction({ ...actionBase, action: 'complete_delivery' });
    if (!isCurrentAccountGeneration(accountToken, stableId)) return { success: false };
    if (completed.status !== 'claimed' && completed.status !== 'already_claimed') return { success: false };
    await withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(accountToken, stableId)) return;
      await removeLevelGiftApplyJournalEntry(occurrenceKey);
    }).catch(() => {});
    return result;
  } catch {
    return { success: false };
  }
}

export const applyGift = async (
  gift: GiftDef,
  userName: string,
  currentEnergy: number,
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult> => {
  // Gifts kept in the device inventory must remain usable offline. Their
  // occurrence receipt below is the local exactly-once boundary; do not turn a
  // transient reservation outage into a permanently unusable present.
  if (opts?.localOnly) {
    const accountToken = opts.accountToken;
    const occurrenceId = opts.occurrenceId?.trim();
    if (!accountToken?.stableId || !occurrenceId) return { success: false };
    return withLocalLevelGiftApplyLock(() => withXpAccountOperationQueue(
      accountToken,
      (xpLease) => withAccountTransitionLock(async (lease) => {
        try {
          if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return { success: false };
          const result = await applyGiftUnlocked(gift, userName, currentEnergy, maxEnergy, setEnergy, {
            ...opts,
            preserveGiftId: true,
            accountTransitionLockLease: lease,
            xpOperationLease: xpLease,
          });
          if (!result.success || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) return result.success
            ? { success: false }
            : result;
          if (!opts.deferEffectReceiptConfirmation) {
            await confirmLevelGiftEffectReceipts(accountToken, occurrenceId);
          }
          return result;
        } catch {
          return { success: false };
        }
      }),
      { success: false },
    ));
  }
  const accountToken = opts?.accountToken;
  if (gift.spinRewardReceipt) {
    return applySpinRewardGift(gift, userName, currentEnergy, maxEnergy, setEnergy, opts);
  }
  if (!accountToken) {
    return applyGiftUnlocked(gift, userName, currentEnergy, maxEnergy, setEnergy, opts);
  }
  return withAccountTransitionLock(async (lease) => {
    if (!isCurrentAccountGeneration(accountToken)) return { success: false };
    const occurrenceId = opts?.occurrenceId ?? '';
    if (!occurrenceId) {
      return applyGiftUnlocked(gift, userName, currentEnergy, maxEnergy, setEnergy, {
        ...opts,
        accountTransitionLockLease: lease,
      });
    }
    const occurrenceMatch = /^level:(\d+):(f2p|premium)$/.exec(occurrenceId);
    if (!occurrenceMatch || !accountToken.stableId) return { success: false };
    const level = Number(occurrenceMatch[1]);
    const lane = occurrenceMatch[2] as 'f2p' | 'premium';
    let effectiveGift: GiftDef;
    try {
      const refreshed = await reserveLevelGiftForDisplay(level, lane, {
        premiumSafe: lane === 'f2p' && opts?.isPremium === true,
        studyTarget: opts?.studyTarget,
      });
      effectiveGift = refreshed.id === 'choice_3_level'
        && refreshed.choices?.some((choice) => choice.id === gift.id)
        ? { ...gift, levelGiftReservation: refreshed.levelGiftReservation }
        : refreshed;
    } catch {
      return { success: false };
    }
    const reservation = effectiveGift.levelGiftReservation;
    if (!reservation) return { success: false };
    if (reservation.lane !== lane) return { success: false };
    const occurrenceKey = `${safeLevelGiftEventPart(accountToken.stableId, 80)}:${safeLevelGiftEventPart(occurrenceId, 120)}`;
    try {
      const journal = await readLevelGiftApplyJournal();
      const prior = journal[occurrenceKey];
      const entry: LevelGiftApplyJournalEntry = prior
        && prior.reservationId === reservation.reservationId
        && prior.giftId === effectiveGift.id
        ? prior
        : {
          reservationId: reservation.reservationId,
          giftId: effectiveGift.id,
          claimToken: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`,
          status: 'prepared',
        };
      journal[occurrenceKey] = entry;
      if (!await saveVerifiedLevelGiftApplyJournal(journal, occurrenceKey)) return { success: false };
      if (!isCurrentAccountGeneration(accountToken)) return { success: false };
      const actionBase = {
        stableId: accountToken.stableId,
        level,
        lane,
        studyTarget: storageStudyTarget(opts?.studyTarget),
        reservationId: reservation.reservationId,
        giftId: effectiveGift.id,
        claimToken: entry.claimToken,
      } as const;
      const begun = await callLevelGiftReservationAction({ ...actionBase, action: 'begin_claim' });
      if (begun.status === 'already_claimed') {
        if (begun.chainShield) {
          await AsyncStorage.setItem(CHAIN_SHIELD_KEY, begun.chainShield);
        }
        if (begun.giftXpMultiplier) {
          await AsyncStorage.setItem(GIFT_MULT_KEY, begun.giftXpMultiplier);
        }
        if (Number.isFinite(begun.clubGiftFreeBoostCount)) {
          await setClubGiftFreeBoostCountFromAuthority(Number(begun.clubGiftFreeBoostCount));
        }
        await confirmLevelGiftEffectReceipts(accountToken, occurrenceId).catch(() => {});
        await removeLevelGiftApplyJournalEntry(occurrenceKey).catch(() => {});
        return { success: false, alreadyClaimed: true };
      }
      if (begun.status !== 'acquired') return { success: false };
      let result: ApplyGiftResult = { success: true };
      if (entry.status !== 'effect_applied') {
        const serverOwnedPerk = effectiveGift.id === 'chain_shield_1'
          || effectiveGift.id === 'chain_shield_3'
          || effectiveGift.id === 'xp_2x_24h'
          || effectiveGift.id === 'xp_2x_48h'
          || effectiveGift.id === 'focus_10m_25'
          || effectiveGift.id === 'focus_15m_50'
          || effectiveGift.id === 'club_boost_free';
        // These mirrors are materialized only from the terminal server receipt.
        // Other level gifts retain their existing local application behavior.
        result = serverOwnedPerk
          ? { success: true }
          : await applyGiftUnlocked(effectiveGift, userName, currentEnergy, maxEnergy, setEnergy, opts);
        if (!result.success) {
          await callLevelGiftReservationAction({ ...actionBase, action: 'release_claim' }).catch(() => null);
          return result;
        }
        entry.status = 'effect_applied';
        journal[occurrenceKey] = entry;
        // If this write fails, completion still makes the server terminal, preventing re-claim.
        const effectStatusDurable = await saveVerifiedLevelGiftApplyJournal(journal, occurrenceKey).catch(() => false);
        if (effectStatusDurable) {
          await confirmLevelGiftEffectReceipts(accountToken, occurrenceId).catch(() => {});
        }
      } else {
        // A journal entry read back as effect_applied is already a durable outer boundary.
        await confirmLevelGiftEffectReceipts(accountToken, occurrenceId).catch(() => {});
      }
      const completed = await callLevelGiftReservationAction({ ...actionBase, action: 'complete_claim' });
      if (completed.status !== 'claimed' && completed.status !== 'already_claimed') return { success: false };
      if (completed.chainShield) {
        await AsyncStorage.setItem(CHAIN_SHIELD_KEY, completed.chainShield);
      }
      if (completed.giftXpMultiplier) {
        await AsyncStorage.setItem(GIFT_MULT_KEY, completed.giftXpMultiplier);
      }
      if (Number.isFinite(completed.clubGiftFreeBoostCount)) {
        await setClubGiftFreeBoostCountFromAuthority(Number(completed.clubGiftFreeBoostCount));
      }
      await confirmLevelGiftEffectReceipts(accountToken, occurrenceId).catch(() => {});
      await removeLevelGiftApplyJournalEntry(occurrenceKey).catch(() => {});
      return result;
    } catch {
      return { success: false };
    }
  });
};

export function isEnergyBonusGiftId(gid: string | undefined): boolean {
  if (!gid) return false;
  return gid === 'energy_plus1' || gid === 'energy_plus2' || gid === 'energy_plus3';
}

/** Amount for the real spin-only pearl rewards. Historical `shards_*` remain XP. */
export function giftShardAmount(gid: string | undefined): number {
  const match = /^pearls_(5|10|20|50|100|250|500)$/.exec(String(gid ?? ''));
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

export { GIFT_F2P as GIFT_POOL, WAGER_DISCOUNT_KEY };
export default {};
