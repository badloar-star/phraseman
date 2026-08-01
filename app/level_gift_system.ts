/**
 * Level-Up Gift System — подарок при повышении уровня.
 *
 * F2P — расширенный пул: осколки, энергия до полуночи, арена, бесплатный буст лиги, пари-скидка, …
 * Premium — отдельный пул: крупные осколки + редко проба набора 48ч + с низким шансом
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
import { InteractionManager } from 'react-native';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { CUSTOM_AVATAR_GIFT_OWNED_KEY } from '../constants/customization_storage_keys';
import { addEnergy } from './energy_system';
import { grantClubGiftFreeBoostFromLevel } from './club_boosts';
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
} from './community_packs/functionsClient';
import { getCanonicalUserId } from './user_id_policy';
import { flashcardsOfficialPacksAvailableForTarget } from './flashcards_target_gate';
import {
  addShardsRaw,
  getShardsBalance,
  replaceShardsBalanceLocal,
  replaceShardsBalanceLocalWhileAccountTransitionLocked,
} from './shards_system';
import { registerXP } from './xp_manager';
import { getVerifiedPremiumStatus } from './premium_guard';
import {
  CUSTOM_AVATAR_GRADIENTS,
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
} from '../constants/avatar_auras';
import { lessonBonusHintsKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';

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
  /** Choice reward: UI asks the user to pick one of these concrete rewards. */
  choices?: GiftDef[];
  /** Server-owned roll receipt. Persisted with pending inventory for replay. */
  levelGiftReservation?: {
    reservationId: string;
    lane: 'f2p' | 'premium';
    allowedPackId?: string;
  };
}

type PlannedGiftCopy = Record<PlannedInterfaceLang, string>;

const PACK_FOREVER_DESC: PlannedGiftCopy = {
  'pt-BR': 'O pacote completo foi adicionado aos seus cartões para sempre.',
  vi: 'Toàn bộ gói đã được thêm vào thẻ của bạn vĩnh viễn.',
  id: 'Seluruh paket ditambahkan ke kartumu selamanya.',
  tr: 'Tam paket kartlarına kalıcı olarak eklendi.',
  pl: 'Pełny pakiet dodano do twoich kart na stałe.',
};

const LEVEL_GIFT_PLANNED_LOCALE: Partial<Record<GiftId, { title: PlannedGiftCopy; desc: PlannedGiftCopy }>> = {
  energy_full: {
    title: { 'pt-BR': 'Energia cheia', vi: 'Năng lượng đầy', id: 'Energi penuh', tr: 'Tam enerji', pl: 'Pełna energia' },
    desc: { 'pt-BR': 'Todos os espaços de energia foram restaurados agora', vi: 'Tất cả ô năng lượng được hồi phục ngay bây giờ', id: 'Semua slot energi dipulihkan sekarang', tr: 'Tüm enerji yuvaları şimdi yenilendi', pl: 'Wszystkie sloty energii zostały odnowione' },
  },
  energy_plus1: {
    title: { 'pt-BR': '+1 energia até meia-noite', vi: '+1 năng lượng đến nửa đêm', id: '+1 energi sampai tengah malam', tr: 'Gece yarısına kadar +1 enerji', pl: '+1 energia do północy' },
    desc: { 'pt-BR': 'Um espaço extra de energia até meia-noite (substitui o bônus anterior, não acumula)', vi: 'Một ô năng lượng thưởng đến nửa đêm (thay thế bonus trước, không cộng dồn)', id: 'Satu slot energi bonus sampai tengah malam (mengganti bonus sebelumnya, tidak menumpuk)', tr: 'Gece yarısına kadar bir bonus enerji yuvası (önceki bonusun yerine geçer, birikmez)', pl: 'Jeden dodatkowy slot energii do północy (zastępuje poprzedni bonus, nie kumuluje się)' },
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
    title: { 'pt-BR': '+3 pérolas', vi: '+3 xu', id: '+3 koin', tr: '+3 jeton', pl: '+3 monety' },
    desc: { 'pt-BR': 'Três pérolas de conhecimento', vi: 'Ba xu tri thức', id: 'Tiga koin pengetahuan', tr: 'Üç bilgi jetonu', pl: 'Trzy monety wiedzy' },
  },
  xp_bank_150: {
    title: { 'pt-BR': 'Bônus ×2 para 150 XP', vi: 'Thưởng ×2 cho 150 XP', id: 'Bonus ×2 untuk 150 XP', tr: '150 XP için ×2 bonus', pl: 'Bonus ×2 na 150 XP' },
    desc: { 'pt-BR': 'Os próximos 150 XP são dobrados. Só é gasto ao estudar', vi: '150 XP tiếp theo được nhân đôi. Chỉ dùng khi học', id: '150 XP berikutnya digandakan. Hanya terpakai saat belajar', tr: 'Sonraki 150 XP ikiye katlanır. Yalnızca çalışırken harcanır', pl: 'Następne 150 XP zostanie podwojone. Zużywa się tylko podczas nauki' },
  },
  focus_10m_25: {
    title: { 'pt-BR': 'Foco 10 min', vi: 'Tập trung 10 phút', id: 'Fokus 10 menit', tr: '10 dk odak', pl: 'Fokus 10 min' },
    desc: { 'pt-BR': '10 minutos de multiplicador de XP ×1,25', vi: '10 phút nhân XP ×1,25', id: '10 menit pengali XP ×1,25', tr: '10 dakika XP çarpanı ×1,25', pl: '10 minut mnożnika XP ×1,25' },
  },
  arena_extra_5: {
    title: { 'pt-BR': '+5 partidas ranqueadas hoje', vi: '+5 trận xếp hạng hôm nay', id: '+5 game peringkat hari ini', tr: 'Bugün +5 sıralama oyunu', pl: '+5 gier rankingowych dziś' },
    desc: { 'pt-BR': 'Hoje até 10 partidas ranqueadas (em vez de 5). Reinicia à meia-noite', vi: 'Hôm nay tối đa 10 trận xếp hạng (thay vì 5). Đặt lại lúc nửa đêm', id: 'Hari ini hingga 10 match peringkat (bukan 5). Direset tengah malam', tr: 'Bugün 5 yerine en fazla 10 sıralama maçı. Gece yarısı sıfırlanır', pl: 'Dziś do 10 meczów rankingowych zamiast 5. Reset o północy' },
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
    title: { 'pt-BR': '+6 pérolas', vi: '+6 xu', id: '+6 koin', tr: '+6 jeton', pl: '+6 monet' },
    desc: { 'pt-BR': 'Seis pérolas: recompensa rara', vi: 'Sáu xu: phần thưởng hiếm', id: 'Enam koin: hadiah langka', tr: 'Altı jeton: nadir ödül', pl: 'Sześć monet: rzadka nagroda' },
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
    title: { 'pt-BR': '+10 pérolas', vi: '+10 xu', id: '+10 koin', tr: '+10 jeton', pl: '+10 monet' },
    desc: { 'pt-BR': 'Dez pérolas', vi: 'Mười xu', id: 'Sepuluh koin', tr: 'On jeton', pl: 'Dziesięć monet' },
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
    title: { 'pt-BR': '+10 pérolas (Plus)', vi: '+10 xu (Plus)', id: '+10 koin (Plus)', tr: '+10 jeton (Plus)', pl: '+10 monet (Plus)' },
    desc: { 'pt-BR': 'Recompensa generosa para Plus', vi: 'Phần thưởng hào phóng cho Plus', id: 'Hadiah besar untuk Plus', tr: 'Plus için cömert ödül', pl: 'Hojna nagroda dla Plus' },
  },
  prem_shards_15: {
    title: { 'pt-BR': '+15 pérolas (Plus)', vi: '+15 xu (Plus)', id: '+15 koin (Plus)', tr: '+15 jeton (Plus)', pl: '+15 monet (Plus)' },
    desc: { 'pt-BR': 'Recompensa generosa', vi: 'Phần thưởng hào phóng', id: 'Hadiah besar', tr: 'Cömert ödül', pl: 'Hojna nagroda' },
  },
  prem_shards_20: {
    title: { 'pt-BR': '+20 pérolas (Plus)', vi: '+20 xu (Plus)', id: '+20 koin (Plus)', tr: '+20 jeton (Plus)', pl: '+20 monet (Plus)' },
    desc: { 'pt-BR': 'Muitos pérolas por subir de nível', vi: 'Nhiều xu khi lên cấp', id: 'Banyak koin karena naik level', tr: 'Seviye atladığın için bol jeton', pl: 'Dużo monet za poziom' },
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
    descRU: 'Один бонус-слот энергии до полуночи (не суммируется с предыдущим бонусом — заменяет)',
    descUK: 'Один бонус-слот енергії до півночі (не додається до попереднього — замінює)',
    descES: 'Un hueco extra de energía hasta medianoche (no se acumula con el anterior; lo sustituye)',
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
    id: 'shards_3', rarity: 'common', icon: '💎', weight: 7,
    titleRU: '+3 жемчужины', titleUK: '+3 жемчужини', titleES: '+3 perlas',
    descRU: 'Три жемчужины', descUK: 'Три жемчужини', descES: 'Tres perlas',
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
    id: 'arena_extra_5', rarity: 'common', icon: '🎟️', weight: 5,
    titleRU: '+5 рейтинг-игр сегодня', titleUK: '+5 рейтинг-ігор сьогодні', titleES: '+5 partidas Arena hoy',
    descRU: 'Сегодня до 10 рейтинг-матчей (вместо 5). Обновится в полночь',
    descUK: 'Сьогодні до 10 рейтинг-матчів (замість 5). Оновиться о півночі',
    descES: 'Hoy hasta 10 partidas clasificadas (en lugar de 5). Se restablece a medianoche',
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
    id: 'shards_6', rarity: 'rare', icon: '💎', weight: 6,
    titleRU: '+6 жемчужин', titleUK: '+6 жемчужин', titleES: '+6 perlas',
    descRU: 'Шесть жемчужин — редкая награда', descUK: 'Шість жемчужин — рідкісна нагорода',
    descES: 'Seis perlas — premio poco habitual',
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
    id: 'shards_10', rarity: 'epic', icon: '💎', weight: 2,
    titleRU: '+10 жемчужин', titleUK: '+10 жемчужин', titleES: '+10 perlas',
    descRU: 'Десять жемчужин', descUK: 'Десять жемчужин', descES: 'Diez perlas',
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

/** Тільки осколки + рідкісна проба набору — без дод. енергії для преміум (безкоштовна денна арена в нього і так є). */
const GIFT_PREMIUM: GiftDef[] = [
  {
    id: 'prem_shards_10', rarity: 'common', icon: '💎', weight: 5,
    titleRU: '+10 жемчужин (плюс)', titleUK: '+10 жемчужин (плюс)', titleES: '+10 perlas (Plus)',
    descRU: 'Щедрая награда для плюс',
    descUK: 'Щедра нагорода для плюс',
    descES: 'Recompensa generosa para usuarios Plus',
  },
  {
    id: 'prem_shards_15', rarity: 'rare', icon: '💎', weight: 4,
    titleRU: '+15 жемчужин (плюс)', titleUK: '+15 жемчужин (плюс)', titleES: '+15 perlas (Plus)',
    descRU: 'Щедрая награда', descUK: 'Щедра нагорода', descES: 'Recompensa generosa',
  },
  {
    id: 'prem_shards_20', rarity: 'epic', icon: '💎', weight: 4,
    titleRU: '+20 жемчужин (плюс)', titleUK: '+20 жемчужин (плюс)', titleES: '+20 perlas (Plus)',
    descRU: 'Много жемчужин за уровень', descUK: 'Багато жемчужин за рівень',
    descES: 'Muchos perlas por subir de nivel',
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
  'arena_extra_5',
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

function sourceGatedFallbackGiftId(id: GiftId): GiftId {
  return id === 'pack_voucher_48h' ? 'shards_10' : 'prem_shards_20';
}

function sourceGatedFallbackGiftDef(gift: GiftDef): GiftDef {
  const fallbackId = sourceGatedFallbackGiftId(gift.id);
  const fallbackPool = fallbackId === 'shards_10' ? GIFT_F2P : GIFT_PREMIUM;
  return cloneGiftDef(fallbackPool.find(g => g.id === fallbackId) ?? gift);
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
  if (opts?.premiumSafe && id === 'choice_3_level') id = 'xp_bank_600';
  const gift = GIFT_F2P.find(g => g.id === id);
  return gift ? sanitizeLevelGiftForStudyTarget(gift, opts?.studyTarget) : null;
}

/** F2P-пул: анти-triple-hint_1 на круглых уровнях; premiumSafe исключает бесполезные для премиум награды. */
export async function rollF2pLevelGiftForUser(level: number, opts?: { premiumSafe?: boolean; studyTarget?: RuntimeStudyTarget }): Promise<GiftDef> {
  const milestone = getMilestoneLevelGift(level, opts);
  if (milestone && !isFlashcardPackLevelGiftId(milestone.id)) return milestone;
  try {
    return await reserveServerLevelGift(level, 'f2p', opts?.studyTarget);
  } catch (error) {
    if (milestone && isFlashcardPackLevelGiftId(milestone.id)) throw error;
    const safePool = GIFT_F2P.filter((gift) => !isFlashcardPackLevelGiftId(gift.id));
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
export const BONUS_ENERGY_KEY = 'energy_gift_bonus';
export const COSMETIC_GIFT_OWNED_AVATAR_KEY = CUSTOM_AVATAR_GIFT_OWNED_KEY;
const GIFT_XP_BANK_CAP = 1500;

export interface BonusEnergyState { amount: number; expiresAt: number }

function getTomorrowMidnightMs(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const readBonusEnergy = async (): Promise<BonusEnergyState | null> => {
  try {
    const raw = await AsyncStorage.getItem(BONUS_ENERGY_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as BonusEnergyState;
    if (Date.now() >= b.expiresAt) {
      await AsyncStorage.removeItem(BONUS_ENERGY_KEY);
      return null;
    }
    return b;
  } catch { return null; }
};

export interface GiftMultiplierState { multiplier: number; expiresAt: number }
export interface GiftXpBankState { remaining: number; grantedTotal: number; updatedAt: number }

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
    const raw = await AsyncStorage.getItem(GIFT_XP_BANK_KEY);
    if (!raw) return { remaining: 0, grantedTotal: 0, updatedAt: 0 };
    const parsed = JSON.parse(raw) as Partial<GiftXpBankState>;
    const remaining = Math.max(0, Math.floor(Number(parsed.remaining) || 0));
    const rawGrantedTotal = Math.max(0, Math.floor(Number(parsed.grantedTotal) || 0));
    // Целостность: grantedTotal не может быть меньше remaining (remaining — остаток банка)
    const grantedTotal = Math.max(remaining, rawGrantedTotal);
    return { remaining, grantedTotal, updatedAt: Math.max(0, Number(parsed.updatedAt) || 0) };
  } catch {
    return { remaining: 0, grantedTotal: 0, updatedAt: 0 };
  }
};

export const grantGiftXpBank = async (amount: number): Promise<void> => {
  const safe = Math.max(0, Math.floor(amount));
  if (safe <= 0) return;
  const cur = await readGiftXpBank();
  const nextRemaining = Math.min(GIFT_XP_BANK_CAP, cur.remaining + safe);
  // grantedTotal — исторический итог выданных XP (не текущий остаток)
  const nextGrantedTotal = cur.grantedTotal + safe;
  await AsyncStorage.setItem(
    GIFT_XP_BANK_KEY,
    JSON.stringify({ remaining: nextRemaining, grantedTotal: nextGrantedTotal, updatedAt: Date.now() }),
  );
};

export const consumeGiftXpBank = async (baseXp: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(baseXp));
  if (safe <= 0) return 0;
  const cur = await readGiftXpBank();
  const used = Math.min(cur.remaining, safe);
  if (used <= 0) return 0;
  const remaining = cur.remaining - used;
  // Всегда сохраняем — grantedTotal (исторический счётчик) нельзя уничтожать removeItem
  await AsyncStorage.setItem(
    GIFT_XP_BANK_KEY,
    JSON.stringify({ remaining: Math.max(0, remaining), grantedTotal: cur.grantedTotal, updatedAt: Date.now() }),
  );
  return used;
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
 * подарки за уровень больше НЕ выдают монеты — выдача обнулена. Структура подарков,
 * пул, модалки и инвентарь сохранены; вызывающие не меняются (safe<=0 → no-op).
 * ОТКРЫТЫЙ ВОПРОС к владельцу: чем заменить монетные подарки в пуле (звёзды/косметика).
 */
const grantLevelGiftShards = async (
  amount: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  const safe = Math.max(0, Math.floor(amount)) * 0; // §7: выплата жемчужин отключена
  if (safe <= 0) return;
  const before = await getShardsBalance();
  await addShardsRaw(safe, 'level_gift', { skipServerAwait: true });
  const after = await getShardsBalance();
  // Some isolated Jest mocks keep addShardsRaw storage on a separate mock object.
  // In production this branch is a no-op because addShardsRaw already persisted.
  if (after < before + safe) {
    const options = { op: 'earn' as const, reason: 'level_gift_fallback' };
    if (accountToken) {
      await replaceShardsBalanceLocalWhileAccountTransitionLocked(before + safe, accountToken, options);
    } else {
      await replaceShardsBalanceLocal(before + safe, options);
    }
  }
};

export type GiftCosmeticUnlock = {
  kind: 'avatar' | 'aura';
  id: string;
  gradientId?: string;
  logoColor?: CustomAvatarLogoColor;
  labelRu: string;
  labelUk: string;
  labelEs: string;
};

export const unlockRandomCustomAvatarGift = async (
  accountToken?: AccountGenerationToken,
): Promise<GiftCosmeticUnlock | null> => {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY);
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
    await AsyncStorage.multiSet([
      [CUSTOM_AVATAR_OWNED_KEY, JSON.stringify(next)],
      [COSMETIC_GIFT_OWNED_AVATAR_KEY, avatar.id],
    ]);
    return {
      kind: 'avatar',
      id: avatar.id,
      gradientId: gradient.id,
      logoColor,
      labelRu: customAvatarGiftLabelForLang(avatar, gradient, 'ru'),
      labelUk: customAvatarGiftLabelForLang(avatar, gradient, 'uk'),
      labelEs: customAvatarGiftLabelForLang(avatar, gradient, 'es'),
    };
  } catch {
    return null;
  }
};

export const unlockRandomAvatarAuraGift = async (): Promise<GiftCosmeticUnlock | null> => {
  try {
    const raw = await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY);
    const owned: Record<string, true> = raw ? JSON.parse(raw) : {};
    const candidates = AVATAR_AURAS.filter(aura => !aura.premiumOnly && aura.unlockLevel === undefined && !owned[aura.id]);
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

export const getBonusHintsToday = async (studyTarget?: RuntimeStudyTarget): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    return parseInt((await AsyncStorage.getItem(lessonBonusHintsKey(today, studyTarget))) || '0', 10) || 0;
  } catch { return 0; }
};

export interface ApplyGiftResult {
  success: boolean;
  xpBoostAlreadyActive?: boolean;
  energyBoostAlreadyActive?: boolean;
  cosmeticUnlocked?: GiftCosmeticUnlock;
}

const MARKETPLACE_CACHE_PRIME_DELAY_MS = 1400;
const scheduledMarketplaceCachePrimeTargets = new Set<string>();

const scheduleMarketplaceCachePrime = (studyTarget?: RuntimeStudyTarget): void => {
  const target = storageStudyTarget(studyTarget);
  if (scheduledMarketplaceCachePrimeTargets.has(target)) return;
  scheduledMarketplaceCachePrimeTargets.add(target);

  const schedule = () => {
    const timer = setTimeout(() => {
      scheduledMarketplaceCachePrimeTargets.delete(target);
      void primeMarketplaceBuiltCardsCacheFromAccessibleStorage(studyTarget).catch(() => {});
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
): Promise<ApplyGiftResult> => {
  const existing = await readBonusEnergy();
  const energyBoostAlreadyActive = existing !== null && (existing.amount ?? 0) > 0;
  const accumulatedAmount = (existing?.amount ?? 0) + n;
  const bonus: BonusEnergyState = { amount: accumulatedAmount, expiresAt: getTomorrowMidnightMs() };
  await AsyncStorage.setItem(BONUS_ENERGY_KEY, JSON.stringify(bonus));
  // Бонус поднял эффективный потолок энергии (см. energy_system.getEffectiveMaxEnergyValue) —
  // сразу заполняем новые слоты, иначе потолок вырос, а энергия осталась прежней (слоты пустые).
  let nextEnergy = currentEnergy;
  try {
    const state = await addEnergy(n);
    nextEnergy = state.current;
  } catch {
    // addEnergy сам логирует; UI не ломаем — оставляем прежнее значение.
  }
  await setEnergy(nextEnergy);
  return { success: true, energyBoostAlreadyActive };
};

const safeLevelGiftEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

async function activateReservedLevelPackGift(gift: GiftDef, studyTarget?: RuntimeStudyTarget): Promise<{
  stableId: string;
  voucherId: string;
  expiresAt: number;
  allowedPackId?: string;
} | null> {
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
    const isPremium = opts?.isPremium ?? await getVerifiedPremiumStatus();
    const today = new Date().toISOString().split('T')[0];
    let id = gift.id;
    // Safety-net: если старый/ручной подарок всё же попал премиуму, заменяем на осколки.
    if (isPremium && PREMIUM_BLOCKED_F2P_IDS.has(id)) {
      id = 'prem_shards_10';
    }
    if (!flashcardPackLevelGiftsAllowed(opts?.studyTarget) && isFlashcardPackLevelGiftId(id) && !isTrialPackLevelGiftId(id)) {
      id = sourceGatedFallbackGiftId(id);
    }

    switch (id) {
      case 'energy_full': {
        setEnergy(maxEnergy);
        const esRaw = await AsyncStorage.getItem('energy_state');
        const es = esRaw ? (JSON.parse(esRaw) as { current: number; lastRecoveryTime: number }) : { lastRecoveryTime: Date.now() };
        await AsyncStorage.setItem('energy_state', JSON.stringify({ current: maxEnergy, lastRecoveryTime: es.lastRecoveryTime }));
        break;
      }
      case 'xp_50':
        await registerXP(50, 'achievement_reward', userName, 'ru', undefined, {
          eventId: ['achievement', 'level_gift', safeLevelGiftEventPart(opts?.studyTarget), safeLevelGiftEventPart(id), safeLevelGiftEventPart(today, 20)].join(':'),
          payload: { giftId: id, surface: 'level_gift', studyTarget: opts?.studyTarget ?? null },
        });
        break;
      case 'xp_100':
        await registerXP(100, 'achievement_reward', userName, 'ru', undefined, {
          eventId: ['achievement', 'level_gift', safeLevelGiftEventPart(opts?.studyTarget), safeLevelGiftEventPart(id), safeLevelGiftEventPart(today, 20)].join(':'),
          payload: { giftId: id, surface: 'level_gift', studyTarget: opts?.studyTarget ?? null },
        });
        break;
      case 'xp_250':
        await registerXP(250, 'achievement_reward', userName, 'ru', undefined, {
          eventId: ['achievement', 'level_gift', safeLevelGiftEventPart(opts?.studyTarget), safeLevelGiftEventPart(id), safeLevelGiftEventPart(today, 20)].join(':'),
          payload: { giftId: id, surface: 'level_gift', studyTarget: opts?.studyTarget ?? null },
        });
        break;
      case 'hint_1':
      case 'hint_3': {
        const count = id === 'hint_1' ? 1 : 3;
        const key = lessonBonusHintsKey(today, opts?.studyTarget);
        const cur = parseInt((await AsyncStorage.getItem(key)) || '0', 10) || 0;
        await AsyncStorage.setItem(key, String(cur + count));
        break;
      }
      case 'energy_plus1':
        return await applyEnergyBonusN(1, currentEnergy, setEnergy);
      case 'energy_plus2':
        return await applyEnergyBonusN(2, currentEnergy, setEnergy);
      case 'energy_plus3':
        return await applyEnergyBonusN(3, currentEnergy, setEnergy);
      case 'chain_shield_1':
      case 'chain_shield_3': {
        const days = id === 'chain_shield_1' ? 1 : 3;
        const raw = await AsyncStorage.getItem(CHAIN_SHIELD_KEY);
        const ex = raw ? (JSON.parse(raw) as { daysLeft: number }) : null;
        const daysLeft = (ex?.daysLeft ?? 0) + days;
        await AsyncStorage.setItem(CHAIN_SHIELD_KEY, JSON.stringify({ daysLeft, grantedAt: today }));
        break;
      }
      case 'xp_2x_24h':
      case 'xp_2x_48h': {
        const hours = id === 'xp_2x_24h' ? 24 : 48;
        return await setTimedGiftMultiplier(2, hours * 3600000);
      }
      case 'xp_bank_150': {
        await grantGiftXpBank(150);
        break;
      }
      case 'xp_bank_300': {
        await grantGiftXpBank(300);
        break;
      }
      case 'xp_bank_600': {
        await grantGiftXpBank(600);
        break;
      }
      case 'premium_xp_bank_1000': {
        await grantGiftXpBank(1000);
        break;
      }
      case 'focus_10m_25': {
        return await setTimedGiftMultiplier(1.25, 10 * 60 * 1000);
      }
      case 'focus_15m_50': {
        return await setTimedGiftMultiplier(1.5, 15 * 60 * 1000);
      }
      case 'cosmetic_avatar_common':
      case 'premium_cosmetic_avatar': {
        const cosmeticUnlocked = await unlockRandomCustomAvatarGift(opts?.accountToken);
        if (cosmeticUnlocked) return { success: true, cosmeticUnlocked };
        const fallbackAura = await unlockRandomAvatarAuraGift();
        if (fallbackAura) return { success: true, cosmeticUnlocked: fallbackAura };
        await grantLevelGiftShards(6, opts?.accountToken);
        return { success: true };
      }
      case 'cosmetic_avatar_aura':
      case 'premium_cosmetic_aura': {
        const cosmeticUnlocked = await unlockRandomAvatarAuraGift();
        return { success: true, cosmeticUnlocked: cosmeticUnlocked ?? undefined };
      }
      case 'shards_3': {
        await grantLevelGiftShards(3, opts?.accountToken);
        break;
      }
      case 'shards_6': {
        await grantLevelGiftShards(6, opts?.accountToken);
        break;
      }
      case 'shards_10': {
        await grantLevelGiftShards(10, opts?.accountToken);
        break;
      }
      case 'arena_extra_5': {
        // Old inventories remain claimable after the retired mode disappeared.
        await grantLevelGiftShards(5, opts?.accountToken);
        break;
      }
      case 'club_boost_free': {
        await grantClubGiftFreeBoostFromLevel();
        break;
      }
      case 'wager_discount_25': {
        await AsyncStorage.setItem(WAGER_DISCOUNT_KEY, '0.25');
        break;
      }
      case 'prem_shards_10': {
        // §7: премиум-гифт монет обнулён (см. grantLevelGiftShards).
        await addShardsRaw(0, 'level_premium_gift', { skipServerAwait: true });
        break;
      }
      case 'prem_shards_15': {
        // §7: премиум-гифт монет обнулён (см. grantLevelGiftShards).
        await addShardsRaw(0, 'level_premium_gift', { skipServerAwait: true });
        break;
      }
      case 'prem_shards_20': {
        // §7: премиум-гифт монет обнулён (см. grantLevelGiftShards).
        await addShardsRaw(0, 'level_premium_gift', { skipServerAwait: true });
        break;
      }
      case 'prem_pack_48h': {
        const grant = await activateReservedLevelPackGift(gift, opts?.studyTarget);
        if (!grant) return { success: false };
        const trial = await setRandomPackGiftTrial48h(
          opts?.studyTarget,
          grant.voucherId,
          grant.expiresAt,
        );
        if (!trial) return { success: false };
        scheduleMarketplaceCachePrime(opts?.studyTarget);
        break;
      }
      case 'pack_voucher_48h': {
        const grant = await activateReservedLevelPackGift(gift, opts?.studyTarget);
        if (!grant) return { success: false };
        const trial = await setRandomPackGiftTrial48h(
          opts?.studyTarget,
          grant.voucherId,
          grant.expiresAt,
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
        const grant = await activateReservedLevelPackGift(gift, opts?.studyTarget);
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

export const applyGift = async (
  gift: GiftDef,
  userName: string,
  currentEnergy: number,
  maxEnergy: number,
  setEnergy: (n: number) => void,
  opts?: ApplyGiftOptions,
): Promise<ApplyGiftResult> => {
  const accountToken = opts?.accountToken;
  if (!accountToken) {
    return applyGiftUnlocked(gift, userName, currentEnergy, maxEnergy, setEnergy, opts);
  }
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) return { success: false };
    return applyGiftUnlocked(gift, userName, currentEnergy, maxEnergy, setEnergy, opts);
  });
};

export function isEnergyBonusGiftId(gid: string | undefined): boolean {
  if (!gid) return false;
  return gid === 'energy_plus1' || gid === 'energy_plus2' || gid === 'energy_plus3';
}

/**
 * Сколько осколков выдаёт подарок (0 = не осколочный).
 * Единый источник правды для UI: чтобы не рисовать 💎-эмодзи там, где должна быть
 * кучка осколков из `assets/images/shards/*.webp`.
 */
export function giftShardAmount(gid: string | undefined): number {
  if (!gid) return 0;
  switch (gid) {
    case 'shards_3': return 3;
    case 'shards_6': return 6;
    case 'shards_10': return 10;
    case 'prem_shards_10': return 10;
    case 'prem_shards_15': return 15;
    case 'prem_shards_20': return 20;
    default: return 0;
  }
}

export const ALL_LEVEL_GIFT_DEFS: GiftDef[] = [...GIFT_F2P, ...GIFT_PREMIUM, ...PREMIUM_LEVEL_GIFT_PACK_UNLOCK_DEFS];

export { GIFT_F2P as GIFT_POOL, WAGER_DISCOUNT_KEY };
export default {};
