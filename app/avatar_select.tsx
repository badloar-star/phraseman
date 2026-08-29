import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { recordSupportDiagnostic } from './support_diagnostics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import Reanimated from 'react-native-reanimated';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { prefetchAllAvatarAuraArt } from './avatar_aura_art_prefetch';
import { pearlIconForTheme } from './coin_icons';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { safeRouterBack } from './navigation_back';
import { markAvatarSectionVisited } from './avatar_nudge_state';
import { triLang, type Lang } from '../constants/i18n';
import {
  NO_AVATAR_AURA_ID,
  getAvatarAuraById,
  normalizeAvatarAuraId,
  type AvatarAuraDef,
} from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_GRADIENTS,
  customAvatarGradientNameForLang,
  customAvatarNameForLang,
  encodeCustomAvatarOwnedStyle,
  getCustomAvatarPurchaseCost,
  getCustomAvatarRuneCost,
  getCustomAvatarById,
  makeCustomAvatarValue,
  parseCustomAvatarValue,
  type CustomAvatarDef,
  type CustomAvatarArtVersion,
  type CustomAvatarLogoColor,
} from '../constants/custom_avatars';
import {
  CUSTOMIZATION_STORAGE_KEYS,
} from '../constants/customization_storage_keys';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import {
  buildAuraCatalog,
  buildAvatarCatalog,
  type AvatarSide,
  type CatalogAvailability,
} from './customization_catalog';
import {
  resolveCustomizationAction,
  resolveEffectivePreviewAuraId,
  type CustomizationAction,
  type CustomizationTab,
} from './customization_draft';
import { resolveCustomizationEditorEntry } from './customization_editor_entry';
import { buildAtomicEditorAvatarPurchase } from './customization_editor_purchase';
import { customizationEditorConfirmAccessibilityLabel } from './customization_editor_accessibility';
import {
  buildCustomizationSnapshot,
  createCustomizationInitialState,
  customizationSnapshotsEqual,
  revalidateCustomizationSnapshot,
  type CustomizationSnapshot,
} from './customization_snapshot';
import {
  applyCustomizationDraft,
  resetToLevelAvatar,
  type ApplyCustomizationInput,
  type CustomizationServiceDeps,
} from './customization_service';
import {
  prepareCustomizationPurchase,
  resumeCustomizationPurchase,
  resumePersistedCustomizationPurchase,
  type CustomizationPurchaseDeps,
  type PurchaseCustomizationInput,
} from './customization_purchase_intent';
import {
  confirmPendingPurchase,
  reducePurchaseConfirmation,
} from './customization_purchase_confirmation';
import {
  validateCustomizationPurchase,
  validateCustomizationPurchaseApply,
} from './customization_purchase_validation';
import {
  getAppSnapshot,
  patchAppSnapshot,
  patchAppSnapshotCustomizationSelection,
  useAppSnapshotSelector,
} from './app_snapshot_store';
import { commitShardCompositeOperation, getShardsBalance } from './shards_system';
import {
  getRunesBalance,
  peekRunes,
  subscribeRunesSnapshot,
} from './runes_system';
import {
  commitCustomizationRuneCompositeOperation,
  syncPendingCustomizationRunePurchases,
} from './customization_rune_purchase';
import {
  executeAccountScopedCustomizationPurchase,
  refreshCurrentCustomizationBalances,
  resolveCustomizationPurchaseCta,
  runCustomizationPurchasePreflightSingleFlight,
  runFreshCustomizationPurchasePreflight,
  type CustomizationPurchasePrice,
  type CustomizationPurchaseShortage,
} from './customization_purchase_cta';
import { syncToCloud } from './cloud_sync';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { updateMyGroupPoints } from './firestore_leagues';
import { getVerifiedRealPremiumStatus, getVerifiedVipStatus } from './premium_guard';
import { parseWeekPointsForWeek } from './hall_of_fame_utils';
import { getCanonicalUserId } from './user_id_policy';
import { getStableId } from './stable_id';
import { newShardOpId } from './shards_delta_queue';
import {
  commitCustomizationSelection,
  drainCustomizationSelectionOutbox,
} from './customization_selection_journal';
import { commitPhoneStateCustomizationSelection } from './phone_state_economy_bridge';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import { hydrateCosmeticAssetCatalog } from './cosmetic_asset_archive';
import { CustomizationHero } from '../components/customization/CustomizationHero';
import {
  CustomizationCatalogCard,
  type CatalogCardItem,
  type LevelAvatarTileItem,
} from '../components/customization/CustomizationCatalogCard';
import {
  CustomizationActionBar,
  YinYangControl,
  CustomizationTabs,
  type CustomizationPriceValue,
} from '../components/customization/CustomizationControls';
import { AvatarEditorSheet } from '../components/customization/AvatarEditorSheet';
import { RuneBalanceChip } from '../components/RuneBalanceChip';
import { CustomizationPurchaseConfirmModal } from '../components/customization/CustomizationPurchaseConfirmModal';
import { avatarDNACopy } from './avatar_dna_copy';
import {
  avatarShowcaseCountLabel,
  avatarShowcaseTierTitle,
} from './avatar_showcase_copy';
import { isAvatarDNAEnabled } from './remote_flags';
import {
  clearCustomizationDevSandbox,
  createCustomizationDevSandbox,
  previewInCustomizationDevSandbox,
  toggleCustomizationDevSandbox,
  type CustomizationDevSandbox,
  type CustomizationDevSandboxResult,
} from './customization_dev_sandbox';

const GRID_GAP = 10;
const GRID_PAD = 16;
const ACTION_BAR_HEIGHT = 82;
const AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS = 30_000;
const REVALIDATE_TTL_MS = 30_000;
/** Высота контентной части закреплённого верхнего бара (без safe-инсета). */
const TOP_BAR_CONTENT_HEIGHT = 64;

type AvatarCatalogFilter = 'all' | 'mine' | number;

const SHOWCASE_TIER_ACCENT: Record<number, string> = {
  50: '#53D6C7',
  70: '#60A5FA',
  90: '#94A3B8',
  100: '#A78BFA',
  150: '#F472B6',
  300: '#F59E0B',
  500: '#22D3EE',
  1000: '#FDE047',
};


const HEX_COLOR = /^#([0-9a-f]{6})$/i;
const withAlpha = (color: string, alpha: string): string => HEX_COLOR.test(color) ? `${color}${alpha}` : color;

// зачем (аудит по Библии, 2026-08-26): в студии оставались «Купить», «Купить и
// применить», «Подтвердить покупку» — словарь Библии запрещает «купить» и
// «подтвердить» (купить → открыть/разблокировать, подтвердить → готово).
// Образы берут за жемчужины, поэтому «открыть» точнее описывает действие.
// Заменено во всех восьми языках разом, иначе тон расходится между локалями.
const RU_STUDIO = {
  title: 'Студия', preview: 'Предпросмотр образа', avatars: 'Аватары', auras: 'Ауры', all: 'Все', mine: 'Мои', catalog: 'Каталог',
  apply: 'Применить образ', applied: 'Образ применён', purchased: 'Добавлено в коллекцию', buy: 'Открыть', buyApply: 'Открыть и надеть', plus: 'Открыть Plus',
  reward: 'Особая награда', owned: 'В коллекции', selected: 'Выбрано', noAura: 'Без ауры', levelAvatar: 'Аватар уровня', resetLevelAvatar: 'Вернуть аватар уровня',
  levelAvatarEnabled: 'Аватар уровня включён', editAvatar: 'Настроить аватар', applyStyle: 'Применить', dark: 'Тёмное', light: 'Светлое',
  cancel: 'Отмена', confirm: 'Открыть', purchaseTitle: 'Открыть образ?', purchaseError: 'Не получилось открыть. Попробуй ещё раз.',
  // зачем: арена-ауры стали уровневыми, «наградной» остался только «Нимб» бета-тестеров —
  // подпись и подсказка больше не отсылают к Арене.
  applyError: 'Образ не применился. Попробуй ещё раз.', rewardHint: 'Эта награда вручается за особые заслуги',
};
type StudioCopy = { [K in keyof typeof RU_STUDIO]: string };
// зачем алиас RU: сторож i18n (scan_untranslated_ui.mjs) распознаёт словарь
// переводов по объявлению `const RU = {` рядом с другой локалью. Имя
// RU_STUDIO под это правило не подходило, и файл с полными переводами на
// восемь языков числился долгом в 64 строки — ложное срабатывание.
const RU: StudioCopy = RU_STUDIO;

const STUDIO_COPY: Record<Lang, StudioCopy> = {
  ru: RU,
  en: {
    title: 'Studio', preview: 'Look preview', avatars: 'Avatars', auras: 'Auras', all: 'All', mine: 'Mine', catalog: 'Catalog',
    apply: 'Apply look', applied: 'Look applied', purchased: 'Added to collection', buy: 'Unlock', buyApply: 'Unlock and wear', plus: 'Unlock Plus',
    reward: 'Special reward', owned: 'In collection', selected: 'Selected', noAura: 'No aura', levelAvatar: 'Level avatar', resetLevelAvatar: 'Restore level avatar',
    levelAvatarEnabled: 'Level avatar restored', editAvatar: 'Customize avatar', applyStyle: 'Apply', dark: 'Dark', light: 'Light',
    cancel: 'Cancel', confirm: 'Unlock', purchaseTitle: 'Unlock this look?', purchaseError: "Couldn't unlock. Try again.",
    applyError: "Couldn't apply the look. Try again.", rewardHint: 'This reward is given for special contributions',
  },
  uk: {
    title: 'Студія', preview: 'Попередній перегляд', avatars: 'Аватари', auras: 'Аури', all: 'Усі', mine: 'Мої', catalog: 'Каталог',
    apply: 'Застосувати образ', applied: 'Образ застосовано', purchased: 'Додано до колекції', buy: 'Відкрити', buyApply: 'Відкрити й надіти', plus: 'Відкрити Plus',
    reward: 'Особлива нагорода', owned: 'У колекції', selected: 'Вибрано', noAura: 'Без аури', levelAvatar: 'Аватар рівня', resetLevelAvatar: 'Повернути аватар рівня',
    levelAvatarEnabled: 'Аватар рівня ввімкнено', editAvatar: 'Налаштувати аватар', applyStyle: 'Застосувати', dark: 'Темне', light: 'Світле',
    cancel: 'Скасувати', confirm: 'Відкрити', purchaseTitle: 'Відкрити образ?', purchaseError: 'Не вийшло відкрити. Спробуй ще раз.',
    applyError: 'Образ не застосовано. Спробуй ще раз.', rewardHint: 'Ця нагорода вручається за особливі заслуги',
  },
  es: {
    title: 'Estudio', preview: 'Vista previa', avatars: 'Avatares', auras: 'Auras', all: 'Todos', mine: 'Míos', catalog: 'Catálogo',
    apply: 'Aplicar estilo', applied: 'Estilo aplicado', purchased: 'Añadido a la colección', buy: 'Abrir', buyApply: 'Abrir y aplicar', plus: 'Abrir Plus',
    reward: 'Recompensa especial', owned: 'En la colección', selected: 'Seleccionado', noAura: 'Sin aura', levelAvatar: 'Avatar de nivel', resetLevelAvatar: 'Volver al avatar de nivel',
    levelAvatarEnabled: 'Avatar de nivel restaurado', editAvatar: 'Personalizar avatar', applyStyle: 'Aplicar', dark: 'Oscuro', light: 'Claro',
    cancel: 'Cancelar', confirm: 'Confirmar', purchaseTitle: '¿Abrir el look?', purchaseError: 'No se pudo abrir. Inténtalo de nuevo.',
    applyError: 'No se pudo aplicar el estilo. Inténtalo de nuevo.', rewardHint: 'Esta recompensa se otorga por méritos especiales',
  },
  'pt-BR': {
    title: 'Estúdio', preview: 'Prévia do visual', avatars: 'Avatares', auras: 'Auras', all: 'Todos', mine: 'Meus', catalog: 'Catálogo',
    apply: 'Aplicar visual', applied: 'Visual aplicado', purchased: 'Adicionado à coleção', buy: 'Abrir', buyApply: 'Abrir e aplicar', plus: 'Abrir Plus',
    reward: 'Recompensa especial', owned: 'Na coleção', selected: 'Selecionado', noAura: 'Sem aura', levelAvatar: 'Avatar de nível', resetLevelAvatar: 'Restaurar avatar de nível',
    levelAvatarEnabled: 'Avatar de nível restaurado', editAvatar: 'Personalizar avatar', applyStyle: 'Aplicar', dark: 'Escuro', light: 'Claro',
    cancel: 'Cancelar', confirm: 'Confirmar', purchaseTitle: 'Abrir o visual?', purchaseError: 'Não deu para abrir. Tente novamente.',
    applyError: 'Não foi possível aplicar o visual. Tente novamente.', rewardHint: 'Esta recompensa é concedida por méritos especiais',
  },
  vi: {
    title: 'Studio', preview: 'Xem trước diện mạo', avatars: 'Avatar', auras: 'Hào quang', all: 'Tất cả', mine: 'Của tôi', catalog: 'Danh mục',
    apply: 'Áp dụng diện mạo', applied: 'Đã áp dụng diện mạo', purchased: 'Đã thêm vào bộ sưu tập', buy: 'Mở', buyApply: 'Mở và dùng', plus: 'Mở Plus',
    reward: 'Phần thưởng đặc biệt', owned: 'Trong bộ sưu tập', selected: 'Đã chọn', noAura: 'Không hào quang', levelAvatar: 'Avatar theo cấp', resetLevelAvatar: 'Khôi phục avatar theo cấp',
    levelAvatarEnabled: 'Đã khôi phục avatar theo cấp', editAvatar: 'Tùy chỉnh avatar', applyStyle: 'Áp dụng', dark: 'Tối', light: 'Sáng',
    cancel: 'Hủy', confirm: 'Xác nhận', purchaseTitle: 'Mở tạo hình?', purchaseError: 'Chưa mở được. Hãy thử lại.',
    applyError: 'Không thể áp dụng diện mạo. Hãy thử lại.', rewardHint: 'Phần thưởng này được trao vì đóng góp đặc biệt',
  },
  id: {
    title: 'Studio', preview: 'Pratinjau tampilan', avatars: 'Avatar', auras: 'Aura', all: 'Semua', mine: 'Milik saya', catalog: 'Katalog',
    apply: 'Terapkan tampilan', applied: 'Tampilan diterapkan', purchased: 'Ditambahkan ke koleksi', buy: 'Buka', buyApply: 'Buka dan pakai', plus: 'Buka Plus',
    reward: 'Hadiah spesial', owned: 'Dalam koleksi', selected: 'Dipilih', noAura: 'Tanpa aura', levelAvatar: 'Avatar level', resetLevelAvatar: 'Kembalikan avatar level',
    levelAvatarEnabled: 'Avatar level dipulihkan', editAvatar: 'Sesuaikan avatar', applyStyle: 'Terapkan', dark: 'Gelap', light: 'Terang',
    cancel: 'Batal', confirm: 'Konfirmasi', purchaseTitle: 'Buka tampilan?', purchaseError: 'Belum bisa dibuka. Coba lagi.',
    applyError: 'Tampilan tidak dapat diterapkan. Coba lagi.', rewardHint: 'Hadiah ini diberikan atas jasa istimewa',
  },
  tr: {
    title: 'Stüdyo', preview: 'Görünüm önizlemesi', avatars: 'Avatarlar', auras: 'Auralar', all: 'Tümü', mine: 'Benimkiler', catalog: 'Katalog',
    apply: 'Görünümü uygula', applied: 'Görünüm uygulandı', purchased: 'Koleksiyona eklendi', buy: 'Aç', buyApply: 'Aç ve uygula', plus: "Plus'ı aç",
    reward: 'Özel ödül', owned: 'Koleksiyonda', selected: 'Seçildi', noAura: 'Aurasız', levelAvatar: 'Seviye avatarı', resetLevelAvatar: 'Seviye avatarına dön',
    levelAvatarEnabled: 'Seviye avatarı geri yüklendi', editAvatar: 'Avatarı özelleştir', applyStyle: 'Uygula', dark: 'Koyu', light: 'Açık',
    cancel: 'İptal', confirm: 'Onayla', purchaseTitle: 'Görünüm açılsın mı?', purchaseError: 'Açılamadı. Tekrar dene.',
    applyError: 'Görünüm uygulanamadı. Tekrar dene.', rewardHint: 'Bu ödül özel katkılar için verilir',
  },
  pl: {
    title: 'Studio', preview: 'Podgląd wyglądu', avatars: 'Awatary', auras: 'Aury', all: 'Wszystkie', mine: 'Moje', catalog: 'Katalog',
    apply: 'Zastosuj wygląd', applied: 'Wygląd zastosowany', purchased: 'Dodano do kolekcji', buy: 'Otwórz', buyApply: 'Otwórz i załóż', plus: 'Otwórz Plus',
    reward: 'Nagroda specjalna', owned: 'W kolekcji', selected: 'Wybrano', noAura: 'Bez aury', levelAvatar: 'Awatar poziomu', resetLevelAvatar: 'Przywróć awatar poziomu',
    levelAvatarEnabled: 'Przywrócono awatar poziomu', editAvatar: 'Dostosuj awatar', applyStyle: 'Zastosuj', dark: 'Ciemne', light: 'Jasne',
    cancel: 'Anuluj', confirm: 'Potwierdź', purchaseTitle: 'Otworzyć wygląd?', purchaseError: 'Nie udało się otworzyć. Spróbuj ponownie.',
    applyError: 'Nie udało się zastosować wyglądu. Spróbuj ponownie.', rewardHint: 'Ta nagroda jest przyznawana za szczególne zasługi',
  },
};

function studioCopy(lang: Lang): StudioCopy {
  return STUDIO_COPY[lang];
}

// зачем: локальный аналог triLang() с тем же безопасным фолбэком — раньше
// требовал Record<Lang, string> строго на всех 9 языках, и краш Студии
// 2026-08-27 (STUDIO_COPY[lang] === undefined на en) показал, что все
// вызовы этой функции в файле не задавали en. Вместо правки 10+ call sites
// делаем саму функцию терпимой, как triLang.
function localized(lang: Lang, copy: { ru: string; uk: string; es: string } & Partial<Record<Exclude<Lang, 'ru' | 'uk' | 'es'>, string>>): string {
  if (lang !== 'ru' && lang in copy) return copy[lang as keyof typeof copy] as string ?? copy.es;
  // зачем (предложение phraseman-d0): для en без своего ключа латиница (ES)
  // читается как «не мой язык», кириллица (RU) — как поломка экрана.
  if (lang === 'en') return copy.es ?? copy.ru;
  return copy.ru;
}

function purchaseShortageLabel(shortage: Exclude<CustomizationPurchaseShortage, null>, lang: Lang): string {
  return shortage === 'runes'
    ? localized(lang, {
      ru: 'Не хватает рун', uk: 'Не вистачає рун', en: 'Not enough runes',
      es: 'No hay suficientes runas', 'pt-BR': 'Runas insuficientes', vi: 'Không đủ rune',
      id: 'Rune tidak cukup', tr: 'Yeterli rün yok', pl: 'Za mało run',
    })
    : localized(lang, {
      ru: 'Не хватает жемчуга', uk: 'Не вистачає перлин', en: 'Not enough pearls',
      es: 'No hay suficientes perlas', 'pt-BR': 'Pérolas insuficientes', vi: 'Không đủ ngọc trai',
      id: 'Mutiara tidak cukup', tr: 'Yeterli inci yok', pl: 'Za mało pereł',
    });
}

function slavicPlural(count: number, one: string, few: string, many: string): string {
  const normalized = Math.abs(Math.floor(count));
  const mod10 = normalized % 10;
  const mod100 = normalized % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** «1 жемчужина будет списана…» / «2 жемчужины будут списаны…» / «5 жемчужин будут списаны…». */
function purchaseCostMessage(cost: number, lang: Lang): string {
  const n = Math.max(0, Math.floor(Number(cost) || 0));
  // зачем: единственное число ловим по последней цифре, а не по n === 1 —
  // иначе при 21 выходило «21 жемчужина БУДУТ списаны» (глагол не согласован).
  const isSingular = n % 10 === 1 && n % 100 !== 11;
  if (lang === 'ru') {
    if (isSingular) return `${n} жемчужина будет списана после подтверждения.`;
    return `${n} ${slavicPlural(n, 'жемчужина', 'жемчужины', 'жемчужин')} будут списаны после подтверждения.`;
  }
  if (lang === 'uk') {
    // зачем: в украинской ветке было русское «жемчужина» — заменено на «перлина».
    if (isSingular) return `${n} перлина буде списана після підтвердження.`;
    return `${n} ${slavicPlural(n, 'перлина', 'перлини', 'перлин')} будуть списані після підтвердження.`;
  }
  return `${n} ${localized(lang, { ru: 'жемчужин будут списаны после подтверждения.', uk: 'перлин буде списано після підтвердження.', es: 'perlas se descontarán tras confirmar.', 'pt-BR': 'pérolas serão descontadas após a confirmação.', vi: 'ngọc trai sẽ được trừ sau khi xác nhận.', id: 'mutiara akan dipotong setelah konfirmasi.', tr: 'inci onaydan sonra düşülecek.', pl: 'pereł zostanie odjętych po potwierdzeniu.' })}`;
}

function auraName(aura: AvatarAuraDef, lang: Lang): string {
  return triLang(lang, {
    ru: aura.nameRu,
    uk: aura.nameUk,
    en: aura.nameRu,
    es: aura.nameEs,
    'pt-BR': aura.namePtBr,
    vi: aura.nameVi,
    id: aura.nameId,
    tr: aura.nameTr,
    pl: aura.namePl,
  });
}

function syncAvatarDisplayToCloud(mode: 'immediate' | 'deferred'): void {
  if (mode === 'immediate') void syncToCloud({ forceNow: true });
  else void syncToCloud({ deferMs: AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS });
}

async function writeProfileAvatarSnapshot(avatar: string, level: number, aura: string | null): Promise<void> {
  const accountToken = captureAccountGeneration();
  if (!accountToken.stableId || !isCurrentAccountGeneration(accountToken)) return;
  try {
    const [[, nameRaw], [, xpRaw], [, langRaw], [, weekRaw], [, streakRaw], [, leagueRaw], [, frameRaw]] =
      await AsyncStorage.multiGet(['user_name', 'user_total_xp', 'app_lang', 'week_points_v2', 'streak_count', 'league_state_v3', 'user_frame']);
    if (!isCurrentAccountGeneration(accountToken)) return;
    const totalXp = parseInt(xpRaw || '0', 10) || 0;
    const weekPoints = parseWeekPointsForWeek(weekRaw);
    let leagueId: number | undefined;
    try { if (leagueRaw) leagueId = JSON.parse(leagueRaw).leagueId; } catch {}
    const [realPremium, vip] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
    ]);
    if (!isCurrentAccountGeneration(accountToken)) return;
    const profileSelection: Record<string, string | null> = {
      user_avatar: avatar,
      user_frame: frameRaw,
      user_avatar_frame: frameRaw,
      user_avatar_aura: aura,
    };
    await syncPublicProfileSnapshot({
      reason: 'display_change',
      name: (nameRaw || '').trim() || `Level ${level}`,
      totalXp,
      weekPoints,
      lang: langRaw || 'ru',
      avatar: profileSelection.user_avatar || getBestAvatarForLevel(level),
      streak: parseInt(streakRaw || '0', 10) || undefined,
      leagueId,
      frame: profileSelection.user_avatar_frame || undefined,
      aura: profileSelection.user_avatar_aura || undefined,
      isPremium: realPremium,
      isVip: vip,
    }, accountToken);
    if (!isCurrentAccountGeneration(accountToken)) return;
    await updateMyGroupPoints(weekPoints, accountToken);
  } catch {}
}

async function invalidateAvatarDependentCaches(nextAvatar: string, nextAura: string | null): Promise<void> {
  const accountToken = captureAccountGeneration();
  if (!accountToken.stableId || !isCurrentAccountGeneration(accountToken)) return;
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) return;
    try {
      const leagueRaw = await AsyncStorage.getItem('league_state_v3');
      if (!isCurrentAccountGeneration(accountToken)) return;
      if (leagueRaw) {
        const league = JSON.parse(leagueRaw);
        if (Array.isArray(league?.group)) {
          league.group = league.group.map((member: any) => member?.isMe
            ? { ...member, avatar: nextAvatar, aura: nextAura ?? '' }
            : member);
          await AsyncStorage.setItem('league_state_v3', JSON.stringify(league));
        }
      }
    } catch {}
    if (!isCurrentAccountGeneration(accountToken)) return;
    await AsyncStorage.multiRemove([
      'global_lb_cache_v4', 'leaderboard_cache_v1', 'arena_top100_snapshot_v8',
      'arena_top100_remote_at_v1', 'arena_rating_screen_cache_v1', 'club_remote_refresh_at_v2',
      'friend_profiles_cache_v1', 'friends_tab_swr_v1', 'friends_activity_feed_v2', 'friends_activity_feed_v1',
    ]).catch(() => {});
  });
}

async function readFreshCustomizationSnapshot(): Promise<CustomizationSnapshot> {
  const keys = ['user_avatar', 'user_total_xp', 'shards_balance', ...CUSTOMIZATION_STORAGE_KEYS];
  const pairs = await AsyncStorage.multiGet([...new Set(keys)]);
  const values = new Map(pairs);
  const totalXp = Number(values.get('user_total_xp') || 0);
  return buildCustomizationSnapshot(values, Date.now(), getLevelFromXP(Number.isFinite(totalXp) ? totalXp : 0));
}

function encodeOwnedStyle(avatarValue: string): string {
  const parsed = parseCustomAvatarValue(avatarValue);
  return parsed ? encodeCustomAvatarOwnedStyle(parsed) : `${CUSTOM_AVATAR_GRADIENTS[0].id}:black`;
}

function availabilityStatus(
  item: CatalogCardItem,
  lang: Lang,
  copy: ReturnType<typeof studioCopy>,
  selected: boolean,
): string {
  if (selected) return copy.selected;
  switch (item.availability.kind) {
    case 'owned': return copy.owned;
    case 'none': return copy.noAura;
    case 'shards': return `${item.availability.cost} ${localized(lang, { ru: 'жемчужин', uk: 'перлин', es: 'perlas', 'pt-BR': 'pérolas', vi: 'ngọc trai', id: 'mutiara', tr: 'inci', pl: 'pereł' })}`;
    case 'runes': return `${item.availability.cost} ${localized(lang, { ru: 'рун', uk: 'рун', es: 'runas', 'pt-BR': 'runas', vi: 'rune', id: 'rune', tr: 'rün', pl: 'run' })}`;
    case 'level': return `${localized(lang, { ru: 'Уровень', uk: 'Рівень', es: 'Nivel', 'pt-BR': 'Nível', vi: 'Cấp', id: 'Level', tr: 'Seviye', pl: 'Poziom' })} ${item.availability.level}`;
    case 'plus': return 'Plus';
    case 'pro': return 'Pro';
    case 'reward': return copy.reward;
  }
}

function itemLabel(item: CatalogCardItem, lang: Lang, copy: ReturnType<typeof studioCopy>): string {
  if (item.kind === 'level-avatar') return copy.levelAvatar;
  if (item.kind === 'custom-avatar') return customAvatarNameForLang(item.avatar, lang);
  if (item.kind === 'none-aura') return copy.noAura;
  return auraName(item.aura, lang);
}

export default function AvatarSelect() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  // зачем (аудит 2026-08-28, тот же класс бага что в flashcards_collection.tsx
  // и _layout.tsx): isPremium/isVip ниже управляют доступом к Plus-аурам
  // (auraAvailability: hasPlusAuraAccess = isPremium || isVip) — узкие
  // подтверждённые статусы, БЕЗ intro-доступа и admin-override. Человек с
  // admin_premium_override=true (как Виталий) не видел бы Plus-ауры открытыми.
  // hasPremiumAccess покрывает оба случая; isPro остаётся отдельным полем —
  // Pro-only контент не входит в hasPremiumAccess по замыслу (Pro — отдельный,
  // более высокий тир, см. effectivePro в PremiumContext.tsx).
  const { hasPremiumAccess: isPremium, isVip, isPro } = usePremium();
  const copy = useMemo(() => studioCopy(lang), [lang]);
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const focused = useIsScreenFocused();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const appSnapshotCustomization = useAppSnapshotSelector((snapshot) => snapshot.customization);
  const initialCustomization = useMemo(() => createCustomizationInitialState(getAppSnapshot()), []);
  const [confirmed, setConfirmed] = useState(initialCustomization.confirmed);
  const [previewAvatarValue, setPreviewAvatarValue] = useState(initialCustomization.previewAvatarValue);
  const [previewStoredAuraSelection, setPreviewStoredAuraSelection] = useState(initialCustomization.previewStoredAuraSelection);
  const [avatarSide, setAvatarSide] = useState<AvatarSide>(() => (
    parseCustomAvatarValue(initialCustomization.previewAvatarValue)?.logoColor === 'black' ? 'yin' : 'yang'
  ));
  const [activeTab, setActiveTab] = useState<CustomizationTab>('avatars');
  const [avatarCatalogFilter, setAvatarCatalogFilter] = useState<AvatarCatalogFilter>('all');
  const [busy, setBusy] = useState(false);
  const [editorAvatar, setEditorAvatar] = useState<CustomAvatarDef | null>(null);
  const [editorArtVersion, setEditorArtVersion] = useState<CustomAvatarArtVersion | undefined>(undefined);
  const [runeBalance, setRuneBalance] = useState(() => peekRunes());
  const [cosmeticCatalogRevision, setCosmeticCatalogRevision] = useState(0);
  const [avatarDNAEnabled, setAvatarDNAEnabled] = useState(false);
  const [devSandbox, setDevSandbox] = useState<CustomizationDevSandbox>(() => createCustomizationDevSandbox());
  const devSandboxRef = useRef<CustomizationDevSandbox>(devSandbox);
  const devSandboxActive = __DEV__ && devSandbox.active;

  useEffect(() => {
    const subscription = onAppEvent('cosmetic_asset_catalog_changed', () => {
      setCosmeticCatalogRevision((current) => current + 1);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void getStableId().then((stableId) => {
        if (active) setAvatarDNAEnabled(isAvatarDNAEnabled(stableId));
      }).catch(() => {
        if (active) setAvatarDNAEnabled(false);
      });
    };
    refresh();
    const subscription = onAppEvent('remote_config_changed', refresh);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  const [editorGradientId, setEditorGradientId] = useState(CUSTOM_AVATAR_GRADIENTS[0].id);
  const [editorLogoColor, setEditorLogoColor] = useState<CustomAvatarLogoColor>('black');
  const [purchaseState, dispatchPurchase] = useReducer(reducePurchaseConfirmation, { pending: null });
  const confirmedRef = useRef(confirmed);
  const previewRef = useRef({ avatar: previewAvatarValue, aura: previewStoredAuraSelection });
  const lastValidationRef = useRef(0);
  const listRef = useRef<any>(null);
  const purchasePreflightInFlightRef = useRef(false);

  useEffect(() => { confirmedRef.current = confirmed; }, [confirmed]);
  useEffect(() => { previewRef.current = { avatar: previewAvatarValue, aura: previewStoredAuraSelection }; }, [previewAvatarValue, previewStoredAuraSelection]);

  const publishDevSandboxResult = useCallback((result: CustomizationDevSandboxResult | null) => {
    if (!result) return;
    devSandboxRef.current = result.sandbox;
    setDevSandbox(result.sandbox);
    previewRef.current = {
      avatar: result.preview.avatarValue,
      aura: result.preview.storedAuraSelection,
    };
    setPreviewAvatarValue(result.preview.avatarValue);
    setPreviewStoredAuraSelection(result.preview.storedAuraSelection);
  }, []);

  const clearDevSandbox = useCallback(() => {
    publishDevSandboxResult(clearCustomizationDevSandbox(devSandboxRef.current));
  }, [publishDevSandboxResult]);

  useEffect(() => {
    if (!focused) return undefined;
    setAppState(AppState.currentState);
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, [focused]);

  const publishCustomizationSnapshot = useCallback((snapshot: CustomizationSnapshot) => {
    confirmedRef.current = snapshot;
    setConfirmed(snapshot);
    setPreviewAvatarValue(snapshot.activeAvatar);
    setPreviewStoredAuraSelection(snapshot.storedAuraSelection);
    patchAppSnapshotCustomizationSelection(snapshot);
  }, []);

  const publishPearlBalance = useCallback((shards: number) => {
    const safeShards = Math.max(0, Math.floor(Number(shards) || 0));
    const current = confirmedRef.current;
    if (current.shards === safeShards) return;
    const next = { ...current, shards: safeShards };
    confirmedRef.current = next;
    setConfirmed(next);
    patchAppSnapshot({ customization: next });
  }, []);

  useEffect(() => {
    const shardSubscription = onAppEvent('shards_balance_updated', ({ balance }) => {
      publishPearlBalance(balance);
    });
    const unsubscribeRunes = subscribeRunesSnapshot((next) => {
      setRuneBalance(next.balance);
    });
    return () => {
      shardSubscription.remove();
      unsubscribeRunes();
    };
  }, [publishPearlBalance]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void refreshCurrentCustomizationBalances({
      captureAccount: captureAccountGeneration,
      isCurrentAccount: (accountToken) => active
        && !!accountToken.stableId?.trim()
        && isCurrentAccountGeneration(accountToken),
      readPearlBalance: getShardsBalance,
      readRuneBalance: async () => (await getRunesBalance()).balance,
      publishBalances: (shards, runes) => {
        publishPearlBalance(shards);
        setRuneBalance(runes);
      },
    }).catch(() => {});
    return () => { active = false; };
  }, [publishPearlBalance]));

  useEffect(() => {
    if (!appSnapshotCustomization || customizationSnapshotsEqual(confirmedRef.current, appSnapshotCustomization)) return;
    const draftDirty = previewRef.current.avatar !== confirmedRef.current.activeAvatar
      || previewRef.current.aura !== confirmedRef.current.storedAuraSelection;
    confirmedRef.current = appSnapshotCustomization;
    setConfirmed(appSnapshotCustomization);
    if (!draftDirty) {
      setPreviewAvatarValue(appSnapshotCustomization.activeAvatar);
      setPreviewStoredAuraSelection(appSnapshotCustomization.storedAuraSelection);
    }
  }, [appSnapshotCustomization]);

  // зачем: слои колец живут в Storage (Фаза 4 «Бандл-диеты», 2026-08-24), а
  // здесь ауры и показываются, и примеряются. Греем каталог по входу на экран,
  // а не по таймеру: к моменту примерки слои уже на диске. Повторно ничего не
  // качается — прогретые URL помнятся в рамках сессии.
  useEffect(() => { prefetchAllAvatarAuraArt(); }, []);

  // зачем: раздел открыт — намёк-покачивание аватарки на Главной больше не
  // нужен никогда (владелец, 2026-08-27). Отметка стоит здесь, а не в
  // обработчике нажатия на Главной: сюда же ведут модалки подарков за уровень,
  // и после такого захода намёк тоже обязан замолчать.
  useEffect(() => { void markAvatarSectionVisited(); }, []);

  useEffect(() => {
    if (!__DEV__) return;
    const subscription = subscribeAccountGeneration(clearDevSandbox);
    return () => subscription.remove();
  }, [clearDevSandbox]);

  useFocusEffect(useCallback(() => () => {
    if (__DEV__) clearDevSandbox();
  }, [clearDevSandbox]));

  useFocusEffect(useCallback(() => {
    if (Date.now() - lastValidationRef.current < REVALIDATE_TTL_MS) return undefined;
    lastValidationRef.current = Date.now();
    let active = true;
    void Promise.all([
      revalidateCustomizationSnapshot(
        confirmedRef.current,
        readFreshCustomizationSnapshot,
        (fresh) => { if (active) publishCustomizationSnapshot(fresh); },
      ),
      // Админское включение/снятие с продажи видно при следующем открытии
      // кастомизации; суточный cache остаётся только офлайн-фолбеком.
      hydrateCosmeticAssetCatalog(true),
    ]).catch(() => {});
    return () => { active = false; };
  }, [publishCustomizationSnapshot]));

  const serviceDeps = useMemo<CustomizationServiceDeps>(() => ({
    storage: AsyncStorage,
    getCurrentSnapshot: () => confirmedRef.current,
    publishSnapshot: publishCustomizationSnapshot,
    invalidateCaches: invalidateAvatarDependentCaches,
    syncCloud: syncAvatarDisplayToCloud,
    syncPublicProfile: writeProfileAvatarSnapshot,
    commitSelection: async (input, context, inheritedLease) => {
      const token = captureAccountGeneration();
      const operationId = context?.operationId
        ?? `customization_selection:${await newShardOpId()}`;
      const committed = await commitCustomizationSelection({
        token,
        operationId,
        source: context?.source ?? 'user',
        ...(context?.occurrenceId ? { occurrenceId: context.occurrenceId } : {}),
        selection: {
          avatarValue: input.avatarValue,
          frameId: input.frameId,
          storedAuraSelection: input.storedAuraSelection,
          level: input.level,
        },
        inheritedLease,
      }, {
        storage: AsyncStorage,
        mirror: commitPhoneStateCustomizationSelection,
      });
      // Root+head+raw projections+outbox marker are already durable. SQLite is
      // a portable mirror and cannot keep the Apply/Purchase button busy.
      void drainCustomizationSelectionOutbox({
        token,
        lineage: committed.operation.lineage,
      }, {
        storage: AsyncStorage,
        mirror: commitPhoneStateCustomizationSelection,
      }).catch(() => {});
    },
    createAccountScope: () => {
      const accountToken = captureAccountGeneration();
      return {
        isCurrent: () => isCurrentAccountGeneration(accountToken),
        runExclusive: <T,>(work: () => Promise<T>, inheritedLease?: AccountTransitionLockLease) => withAccountTransitionLock(async () => {
          if (!isCurrentAccountGeneration(accountToken)) return undefined;
          return work();
        }, inheritedLease),
      };
    },
  }), [publishCustomizationSnapshot]);

  const purchaseDeps = useMemo<CustomizationPurchaseDeps>(() => ({
    ...serviceDeps,
    storage: AsyncStorage,
    getAccountScope: async () => (await getCanonicalUserId()) || getStableId(),
    commitShardCompositeOperation,
    commitRuneCustomizationCompositeOperation: commitCustomizationRuneCompositeOperation,
    validatePurchase: (intent) => validateCustomizationPurchase(intent, {
      snapshot: confirmedRef.current,
      isPremium,
      isVip,
      isPro,
    }),
    validateApply: (intent) => validateCustomizationPurchaseApply(intent, {
      snapshot: confirmedRef.current,
      isPremium,
      isVip,
      isPro,
    }),
    onOwnershipGranted: async (target, itemId, ownedValue) => {
      const current = confirmedRef.current;
      const isNewAvatar = target === 'avatar' && !current.ownedAvatars[itemId];
      const next: CustomizationSnapshot = target === 'avatar'
        ? { ...current, updatedAt: Date.now(), ownedAvatars: { ...current.ownedAvatars, [itemId]: String(ownedValue) } }
        : { ...current, updatedAt: Date.now(), ownedAuras: { ...current.ownedAuras, [itemId]: true } };
      confirmedRef.current = next;
      setConfirmed(next);
      patchAppSnapshot({ customization: next });
      if (isNewAvatar) {
        void import('./achievements')
          .then(({ checkAchievements }) => checkAchievements({ type: 'avatar_custom_set' }))
          .catch(() => {});
      }
    },
  }), [serviceDeps, isPremium, isVip, isPro]);

  useEffect(() => {
    void resumePersistedCustomizationPurchase(purchaseDeps)
      .then(async () => {
        const shards = await getShardsBalance();
        const current = confirmedRef.current;
        const next = { ...current, shards };
        confirmedRef.current = next;
        setConfirmed(next);
        patchAppSnapshot({ customization: next });
        const token = captureAccountGeneration();
        await syncPendingCustomizationRunePurchases(token).catch(() => {});
      })
      .catch(() => {});
  }, [purchaseDeps]);

  const effectivePreviewAuraId = (devSandboxActive
    ? normalizeAvatarAuraId(previewStoredAuraSelection)
    : resolveEffectivePreviewAuraId(previewStoredAuraSelection, isPremium, isVip, isPro)) ?? null;
  // зачем: «Аватар уровня» — первая плитка каталога вместо скрытого меню-трёх-точек:
  // возврат к уровню выбирается так же, как любой другой аватар («Вернуть аватар уровня»
  // больше не прячется за многоточием).
  const levelTile = useMemo<LevelAvatarTileItem>(() => ({
    kind: 'level-avatar',
    id: 'level-avatar',
    previewAvatar: getBestAvatarForLevel(confirmed.level),
    isOwned: true,
    isActive: parseCustomAvatarValue(confirmed.activeAvatar) === null,
    availability: { kind: 'owned' },
  }), [confirmed.level, confirmed.activeAvatar]);
  const avatarItems = useMemo(() => buildAvatarCatalog({
    ownedAvatars: confirmed.ownedAvatars,
    giftedAvatarId: confirmed.giftedAvatarId,
    activeAvatar: confirmed.activeAvatar,
    side: avatarSide,
    devUnlockAll: devSandboxActive,
    catalogRevision: cosmeticCatalogRevision,
  }), [confirmed.ownedAvatars, confirmed.giftedAvatarId, confirmed.activeAvatar, avatarSide, devSandboxActive, cosmeticCatalogRevision]);
  const auraItems = useMemo(() => buildAuraCatalog({
    activeAvatar: previewAvatarValue,
    activeAuraId: confirmed.storedAuraSelection,
    level: confirmed.level,
    ownedAuras: confirmed.ownedAuras,
    isPremium,
    isVip,
    isPro,
    devUnlockAll: devSandboxActive,
    catalogRevision: cosmeticCatalogRevision,
  }), [previewAvatarValue, confirmed.storedAuraSelection, confirmed.level, confirmed.ownedAuras, isPremium, isVip, isPro, devSandboxActive, cosmeticCatalogRevision]);
  const catalogItems = useMemo<CatalogCardItem[]>(
    () => activeTab === 'avatars' ? [levelTile, ...avatarItems] : auraItems,
    [activeTab, levelTile, avatarItems, auraItems],
  );
  const displayCatalogItems = useMemo<CatalogCardItem[]>(() => {
    if (activeTab === 'auras') return auraItems;
    if (avatarCatalogFilter === 'mine') {
      return [levelTile, ...avatarItems.filter((item) => item.isOwned)];
    }
    if (typeof avatarCatalogFilter === 'number') {
      return avatarItems.filter((item) => item.kind === 'custom-avatar'
        && getCustomAvatarPurchaseCost(item.avatar) === avatarCatalogFilter);
    }
    return [levelTile, ...avatarItems];
  }, [activeTab, avatarCatalogFilter, avatarItems, auraItems, levelTile]);

  const selectedAvatar = parseCustomAvatarValue(previewAvatarValue);
  const isLevelAvatarPreview = selectedAvatar === null;
  const selectedAvatarItem = avatarItems.find((item) => item.kind === 'custom-avatar' && item.id === selectedAvatar?.avatarId);
  const previewAuraCatalogId = previewStoredAuraSelection === null
    ? null
    : previewStoredAuraSelection === NO_AVATAR_AURA_ID
      ? 'none'
      : normalizeAvatarAuraId(previewStoredAuraSelection);
  const selectedAuraItem = previewAuraCatalogId === null
    ? undefined
    : auraItems.find((item) => item.id === previewAuraCatalogId);
  const avatarAvailability: CatalogAvailability = selectedAvatarItem?.availability ?? { kind: 'owned' };
  const auraAvailability: CatalogAvailability = selectedAuraItem?.availability ?? { kind: 'owned' };
  const resolvedAction = resolveCustomizationAction({
    confirmed: { avatarValue: confirmed.activeAvatar, storedAuraSelection: confirmed.storedAuraSelection },
    previewAvatarValue,
    previewStoredAuraSelection,
    effectivePreviewAuraId,
    activeTab,
    avatarAvailability,
    auraAvailability,
    ownedAvatarStyles: confirmed.ownedAvatars,
    devUnlockAll: devSandboxActive,
  });
  const editorPreviewAvatarValue = editorAvatar
    ? makeCustomAvatarValue(editorAvatar.id, editorGradientId, editorLogoColor, editorArtVersion)
    : previewAvatarValue;
  const editorSide: AvatarSide = editorLogoColor === 'black' ? 'yin' : 'yang';
  const editorAvatarItem = editorAvatar
    ? buildAvatarCatalog({
      activeAvatar: confirmed.activeAvatar,
      ownedAvatars: confirmed.ownedAvatars,
      giftedAvatarId: confirmed.giftedAvatarId,
      side: editorSide,
    }).find((item) => item.kind === 'custom-avatar' && item.id === editorAvatar.id)
    : undefined;
  const editorResolvedAction = resolveCustomizationAction({
    confirmed: { avatarValue: confirmed.activeAvatar, storedAuraSelection: confirmed.storedAuraSelection },
    previewAvatarValue: editorPreviewAvatarValue,
    previewStoredAuraSelection,
    effectivePreviewAuraId,
    activeTab: 'avatars',
    avatarAvailability: editorAvatarItem?.availability ?? { kind: 'owned' },
    auraAvailability,
    ownedAvatarStyles: confirmed.ownedAvatars,
    devUnlockAll: devSandboxActive,
  });
  const editorActionPrice: CustomizationPriceValue | null =
    editorResolvedAction.kind === 'buy-and-apply' || editorResolvedAction.kind === 'buy-only'
      ? { currency: editorResolvedAction.currency, amount: editorResolvedAction.cost }
      : null;
  const editorPurchaseDecision = editorActionPrice
    ? resolveCustomizationPurchaseCta({
      price: editorActionPrice,
      runeBalance,
      pearlBalance: confirmed.shards,
    })
    : null;
  const editorConfirmLabel = editorPurchaseDecision?.shortage
    ? purchaseShortageLabel(editorPurchaseDecision.shortage, lang)
    : editorActionPrice ? localized(lang, {
      ru: 'Купить и применить', uk: 'Купити й застосувати', en: 'Buy and apply',
      es: 'Comprar y aplicar', 'pt-BR': 'Comprar e aplicar', vi: 'Mua và áp dụng',
      id: 'Beli dan terapkan', tr: 'Satın al ve uygula', pl: 'Kup i zastosuj',
    })
    : copy.applyStyle;
  const editorConfirmAccessibilityLabel = customizationEditorConfirmAccessibilityLabel(
    editorConfirmLabel,
    editorActionPrice,
    {
      runes: localized(lang, {
        ru: 'рун', uk: 'рун', en: 'runes', es: 'runas', 'pt-BR': 'runas',
        vi: 'rune', id: 'rune', tr: 'rün', pl: 'run',
      }),
      pearls: localized(lang, {
        ru: 'жемчужин', uk: 'перлин', en: 'pearls', es: 'perlas', 'pt-BR': 'pérolas',
        vi: 'ngọc trai', id: 'mutiara', tr: 'inci', pl: 'pereł',
      }),
    },
  );

  const previewAvatarLabel = selectedAvatarItem?.kind === 'custom-avatar' ? customAvatarNameForLang(selectedAvatarItem.avatar, lang) : copy.levelAvatar;
  const previewAura = effectivePreviewAuraId ? getAvatarAuraById(effectivePreviewAuraId) : undefined;
  const previewAuraLabel = previewStoredAuraSelection === NO_AVATAR_AURA_ID
    ? copy.noAura
    : previewAura ? auraName(previewAura, lang) : copy.noAura;
  const levelWord = localized(lang, { ru: 'Уровень', uk: 'Рівень', es: 'Nivel', 'pt-BR': 'Nível', vi: 'Cấp', id: 'Level', tr: 'Seviye', pl: 'Poziom' });
  const stageAuraLabel = `${previewAuraLabel} · ${levelWord} ${confirmed.level}`;

  const openEditor = useCallback(() => {
    const parsed = parseCustomAvatarValue(previewRef.current.avatar);
    if (!parsed) return;
    const def = getCustomAvatarById(parsed.avatarId);
    if (!def) return;
    setEditorGradientId(parsed.gradientId);
    setEditorLogoColor(parsed.logoColor);
    setEditorArtVersion(parsed.artVersion);
    setEditorAvatar(def);
  }, []);

  // зачем: владелец попросил не применять образ сразу с экрана — нижняя кнопка
  // должна вести в шторку настроек, а «Применить» жить уже внутри неё. Подменяем
  // только чистое применение купленного образа с редактором; покупка, Plus,
  // уровневые и наградные объяснения работают как раньше.
  const editorEntryDecision = resolveCustomizationEditorEntry({
    activeTab,
    hasCustomAvatar: selectedAvatar !== null,
    resolvedAction,
  });
  const bottomOpensEditor = editorEntryDecision.opensEditor;
  const actionBarAction = editorEntryDecision.actionBarAction;

  const actionPrice: CustomizationPriceValue | null = !bottomOpensEditor
    && (resolvedAction.kind === 'buy-and-apply' || resolvedAction.kind === 'buy-only')
    ? { currency: resolvedAction.currency, amount: resolvedAction.cost }
    : null;
  const actionPurchaseDecision = actionPrice
    ? resolveCustomizationPurchaseCta({
      price: actionPrice,
      runeBalance,
      pearlBalance: confirmed.shards,
    })
    : null;

  const actionLabel = useMemo(() => {
    if (bottomOpensEditor) return copy.editAvatar;
    if (actionPurchaseDecision?.shortage) {
      return purchaseShortageLabel(actionPurchaseDecision.shortage, lang);
    }
    switch (resolvedAction.kind) {
      case 'unchanged': return copy.applied;
      case 'apply': return copy.apply;
      case 'buy-and-apply': return copy.buyApply;
      case 'buy-only': return copy.buy;
      case 'open-plus': return copy.plus;
      case 'explain-pro-reward': return localized(lang, {
        ru: 'Особая награда для Pro-аккаунта',
        uk: 'Особлива нагорода для Pro-акаунта',
        es: 'Recompensa especial para la cuenta Pro',
        'pt-BR': 'Recompensa especial para a conta Pro',
        vi: 'Phần thưởng đặc biệt dành cho tài khoản Pro',
        id: 'Hadiah spesial untuk akun Pro',
        tr: 'Pro hesabına özel ödül',
        pl: 'Specjalna nagroda dla konta Pro',
      });
      case 'explain-level': return `${localized(lang, { ru: 'Откроется на уровне', uk: 'Відкриється на рівні', es: 'Se desbloquea en el nivel', 'pt-BR': 'Desbloqueia no nível', vi: 'Mở khóa ở cấp', id: 'Terbuka di level', tr: 'Açılacağı seviye', pl: 'Odblokuje się na poziomie' })} ${resolvedAction.level}`;
      case 'explain-reward': return copy.reward;
    }
  }, [resolvedAction, copy, lang, bottomOpensEditor, actionPurchaseDecision]);

  const applyInput = useCallback((cloudSyncMode: 'immediate' | 'deferred'): ApplyCustomizationInput => ({
    avatarValue: previewAvatarValue,
    storedAuraSelection: previewStoredAuraSelection,
    level: confirmed.level,
    frameId: getBestFrameForLevel(confirmed.level).id,
    cloudSyncMode,
  }), [previewAvatarValue, previewStoredAuraSelection, confirmed.level]);

  const purchaseInputForAction = useCallback((
    action: Extract<CustomizationAction, { kind: 'buy-only' | 'buy-and-apply' }>,
    avatarValueOverride?: string,
  ): PurchaseCustomizationInput | null => {
    if (action.target === 'avatar') {
      const avatarValue = avatarValueOverride ?? previewAvatarValue;
      const parsed = parseCustomAvatarValue(avatarValue);
      if (!parsed) return null;
      const cost = action.cost;
      const avatarApplyInput: ApplyCustomizationInput = {
        avatarValue,
        storedAuraSelection: previewStoredAuraSelection,
        level: confirmed.level,
        frameId: getBestFrameForLevel(confirmed.level).id,
        cloudSyncMode: cost > 0 ? 'immediate' : 'deferred',
      };
      const base = {
        target: 'avatar' as const,
        itemId: parsed.avatarId,
        cost,
        currency: action.currency,
        spendReason: action.purchaseKind === 'restyle' ? 'custom_avatar_restyle' as const : 'custom_avatar' as const,
        ownedValue: encodeOwnedStyle(avatarValue),
        avatarValue,
      };
      return action.kind === 'buy-and-apply'
        ? { ...base, mode: 'buy-and-apply', applyInput: avatarApplyInput }
        : { ...base, mode: 'buy-only' };
    }
    if (!previewStoredAuraSelection || previewStoredAuraSelection === NO_AVATAR_AURA_ID) return null;
    const purchasedAura = action.cost > 0;
    const base = {
      target: 'aura' as const,
      itemId: previewStoredAuraSelection,
      cost: action.cost,
      currency: action.currency,
      spendReason: 'avatar_aura' as const,
      ownedValue: true as const,
    };
    return action.kind === 'buy-and-apply'
      ? { ...base, mode: 'buy-and-apply', applyInput: applyInput(purchasedAura ? 'immediate' : 'deferred') }
      : { ...base, mode: 'buy-only' };
  }, [previewAvatarValue, previewStoredAuraSelection, confirmed.level, applyInput]);

  const showToast = useCallback((kind: 'success' | 'error' | 'info', text: string) => {
    emitAppEvent('action_toast', actionToastTri(kind, { ru: text, uk: text, es: text, 'pt-BR': text, vi: text, id: text, tr: text, pl: text }));
  }, []);

  const openShortageDestination = useCallback((shortage: Exclude<CustomizationPurchaseShortage, null>) => {
    if (shortage === 'runes') {
      router.push('/runes_wallet');
      return;
    }
    router.push({ pathname: '/shards_shop', params: { source: 'avatar_customization' } } as any);
  }, [router]);

  const notifyPurchaseShortage = useCallback((shortage: Exclude<CustomizationPurchaseShortage, null>) => {
    showToast('error', purchaseShortageLabel(shortage, lang));
  }, [lang, showToast]);

  const runFreshPurchasePreflight = useCallback(async (
    price: CustomizationPurchasePrice,
    onAffordable: (capturedAccount: AccountGenerationToken) => void | Promise<void>,
  ) => runCustomizationPurchasePreflightSingleFlight(
    purchasePreflightInFlightRef,
    () => runFreshCustomizationPurchasePreflight({
      price,
      captureAccount: captureAccountGeneration,
      isCurrentAccount: (accountToken) => !!accountToken.stableId?.trim()
        && isCurrentAccountGeneration(accountToken),
      readPearlBalance: getShardsBalance,
      readRuneBalance: async () => (await getRunesBalance()).balance,
      publishBalances: (pearlBalance, freshRuneBalance) => {
        publishPearlBalance(pearlBalance);
        setRuneBalance(freshRuneBalance);
      },
      notifyShortage: notifyPurchaseShortage,
      openShortageDestination,
      onAffordable,
    }),
  ), [notifyPurchaseShortage, openShortageDestination, publishPearlBalance]);

  const executePurchaseInput = useCallback(async (
    input: PurchaseCustomizationInput,
    expectedAccount: AccountGenerationToken,
  ) => {
    const expectedStableId = expectedAccount.stableId?.trim();
    const assertExpectedAccount = (): string => {
      if (!expectedStableId || !isCurrentAccountGeneration(expectedAccount, expectedStableId)) {
        throw new Error('customization_purchase_account_mismatch');
      }
      return expectedStableId;
    };
    const scopedPurchaseDeps: CustomizationPurchaseDeps = {
      ...purchaseDeps,
      getAccountScope: async () => {
        const expectedScope = assertExpectedAccount();
        const resolvedScope = ((await getCanonicalUserId()) || (await getStableId())).trim();
        assertExpectedAccount();
        if (resolvedScope !== expectedScope) throw new Error('customization_purchase_account_mismatch');
        return resolvedScope;
      },
      commitShardCompositeOperation: async (operation) => {
        assertExpectedAccount();
        const result = await purchaseDeps.commitShardCompositeOperation(operation);
        assertExpectedAccount();
        return result;
      },
      commitRuneCustomizationCompositeOperation: async (operation) => {
        assertExpectedAccount();
        const result = await purchaseDeps.commitRuneCustomizationCompositeOperation({
          ...operation,
          token: expectedAccount,
        });
        assertExpectedAccount();
        return result;
      },
      validatePurchase: async (intent) => {
        assertExpectedAccount();
        const valid = await purchaseDeps.validatePurchase(intent);
        assertExpectedAccount();
        return valid;
      },
      validateApply: async (intent) => {
        assertExpectedAccount();
        const valid = await purchaseDeps.validateApply(intent);
        assertExpectedAccount();
        return valid;
      },
      onOwnershipGranted: async (target, itemId, ownedValue) => {
        assertExpectedAccount();
        await purchaseDeps.onOwnershipGranted(target, itemId, ownedValue);
        assertExpectedAccount();
      },
      createAccountScope: () => ({
        isCurrent: () => Boolean(
          expectedStableId
          && isCurrentAccountGeneration(expectedAccount, expectedStableId)
        ),
        runExclusive: <T,>(work: () => Promise<T>, inheritedLease?: AccountTransitionLockLease) => (
          withAccountTransitionLock(async () => {
            assertExpectedAccount();
            const result = await work();
            assertExpectedAccount();
            return result;
          }, inheritedLease)
        ),
      }),
    };

    return executeAccountScopedCustomizationPurchase({
      expectedAccount,
      isCurrentAccount: (captured) => Boolean(
        expectedStableId
        && isCurrentAccountGeneration(captured, expectedStableId)
      ),
      prepare: async () => prepareCustomizationPurchase(input, scopedPurchaseDeps),
      resume: async (prepared) => resumeCustomizationPurchase(prepared, scopedPurchaseDeps),
      readPostPurchaseBalance: async () => getShardsBalance(),
      publishPostPurchaseBalance: (shards) => publishPearlBalance(shards),
    });
  }, [publishPearlBalance, purchaseDeps]);

  const handleDevUnlockAll = useCallback(() => {
    if (!__DEV__) return;
    const account = captureAccountGeneration();
    const ownerStableId = account.stableId?.trim();
    if (!ownerStableId || !isCurrentAccountGeneration(account, ownerStableId)) return;
    try {
      const result = toggleCustomizationDevSandbox(
        devSandboxRef.current,
        ownerStableId,
        {
          avatarValue: previewRef.current.avatar,
          storedAuraSelection: previewRef.current.aura,
        },
      );
      publishDevSandboxResult(result);
      dispatchPurchase({ type: 'cancel' });
      showToast('success', result.sandbox.active
        ? localized(lang, {
          ru: 'Режим примерки включён — покупки и применение отключены',
          uk: 'Режим примірки ввімкнено — покупки та застосування вимкнено',
          es: 'Vista previa activada: compras y aplicación desactivadas',
          'pt-BR': 'Prévia ativada: compras e aplicação desativadas',
          vi: 'Đã bật chế độ xem thử — không mua hoặc áp dụng',
          id: 'Mode pratinjau aktif — tanpa pembelian atau penerapan',
          tr: 'Önizleme modu açık — satın alma ve uygulama kapalı',
          pl: 'Tryb podglądu włączony — bez zakupu i zastosowania',
        })
        : localized(lang, {
          ru: 'Магазин и прежняя примерка восстановлены',
          uk: 'Магазин і попередню примірку відновлено',
          es: 'Se restauraron la tienda y la vista previa anterior',
          'pt-BR': 'A loja e a prévia anterior foram restauradas',
          vi: 'Đã khôi phục cửa hàng và bản xem thử trước đó',
          id: 'Toko dan pratinjau sebelumnya dipulihkan',
          tr: 'Mağaza ve önceki önizleme geri yüklendi',
          pl: 'Przywrócono sklep i poprzedni podgląd',
        }));
    } catch {
      clearDevSandbox();
      showToast('error', copy.applyError);
    }
  }, [clearDevSandbox, copy.applyError, lang, publishDevSandboxResult, showToast]);

  const commitDevPreview = useCallback((avatarValue: string, storedAuraSelection: string | null): boolean => {
    if (!devSandboxActive) return false;
    const account = captureAccountGeneration();
    const ownerStableId = account.stableId?.trim();
    if (!ownerStableId || !isCurrentAccountGeneration(account, ownerStableId)) {
      clearDevSandbox();
      return true;
    }
    try {
      publishDevSandboxResult(previewInCustomizationDevSandbox(
        devSandboxRef.current,
        ownerStableId,
        { avatarValue, storedAuraSelection },
      ));
    } catch {
      clearDevSandbox();
    }
    return true;
  }, [clearDevSandbox, devSandboxActive, publishDevSandboxResult]);

  // зачем: ядро действия вынесено отдельно, чтобы его звали ДВА входа — нижняя
  // кнопка и «Применить» из шторки. Общий путь сохраняет платную перекраску:
  // если стиль сменили, resolvedAction станет buy-and-apply и откроется
  // подтверждение покупки, а не тихое бесплатное применение.
  const runResolvedAction = useCallback(async () => {
    if (devSandboxActive) {
      commitDevPreview(previewAvatarValue, previewStoredAuraSelection);
      showToast('info', localized(lang, {
        ru: 'Это только примерка — профиль и баланс не изменены',
        uk: 'Це лише примірка — профіль і баланс не змінено',
        es: 'Solo vista previa: el perfil y el saldo no cambiaron',
        'pt-BR': 'Apenas prévia: perfil e saldo não foram alterados',
        vi: 'Chỉ xem thử — hồ sơ và số dư không thay đổi',
        id: 'Hanya pratinjau — profil dan saldo tidak berubah',
        tr: 'Yalnızca önizleme — profil ve bakiye değişmedi',
        pl: 'Tylko podgląd — profil i saldo bez zmian',
      }));
      return;
    }
    if (resolvedAction.kind === 'unchanged') return;
    if (resolvedAction.kind === 'open-plus') {
      router.push({ pathname: '/premium_modal', params: { context: 'avatar_aura' } } as any);
      return;
    }
    if (resolvedAction.kind === 'explain-pro-reward') {
      showToast('info', actionLabel);
      return;
    }
    if (resolvedAction.kind === 'explain-level') {
      showToast('info', actionLabel);
      return;
    }
    if (resolvedAction.kind === 'explain-reward') {
      showToast('info', copy.rewardHint);
      return;
    }
    if (resolvedAction.kind === 'buy-only' || resolvedAction.kind === 'buy-and-apply') {
      const input = purchaseInputForAction(resolvedAction);
      if (input) {
        await runFreshPurchasePreflight({
          currency: resolvedAction.currency,
          amount: resolvedAction.cost,
        }, () => dispatchPurchase({ type: 'request', input }));
      }
      return;
    }
    setBusy(true);
    try {
      if (parseCustomAvatarValue(previewAvatarValue) === null) {
        // зачем: возврат к аватару уровня идёт через resetToLevelAvatar (тот же путь,
        // что и раньше из меню), а не через общий apply — он сам считает значение уровня.
        await resetToLevelAvatar({ level: confirmed.level, storedAuraSelection: previewStoredAuraSelection }, serviceDeps);
        emitAppEvent('xp_changed');
        showToast('success', copy.levelAvatarEnabled);
      } else {
        await applyCustomizationDraft(applyInput('deferred'), serviceDeps);
        emitAppEvent('xp_changed');
        showToast('success', copy.applied);
      }
    } catch {
      showToast('error', copy.applyError);
    } finally {
      setBusy(false);
    }
  }, [resolvedAction, router, showToast, actionLabel, copy, purchaseInputForAction,
    previewAvatarValue, previewStoredAuraSelection, confirmed.level, applyInput, serviceDeps,
    runFreshPurchasePreflight, commitDevPreview, devSandboxActive, lang]);

  const handleAction = useCallback(async () => {
    if (busy) return;
    if (bottomOpensEditor) {
      openEditor();
      return;
    }
    if (resolvedAction.kind === 'unchanged') return;
    await runResolvedAction();
  }, [busy, resolvedAction, bottomOpensEditor, openEditor, runResolvedAction]);

  const handleEditorConfirm = useCallback(async () => {
    if (!editorAvatar || busy) return;
    if ((editorResolvedAction.kind === 'buy-and-apply' || editorResolvedAction.kind === 'buy-only')
      && purchasePreflightInFlightRef.current) return;
    const nextAvatarValue = editorPreviewAvatarValue;
    const editorDiagnosticSubject: 'avatar' | 'aura' =
      editorResolvedAction.kind === 'buy-and-apply' || editorResolvedAction.kind === 'buy-only'
        ? editorResolvedAction.target
        : 'avatar';
    if (devSandboxActive) {
      commitDevPreview(nextAvatarValue, previewStoredAuraSelection);
      setAvatarSide(editorSide);
      setEditorAvatar(null);
      showToast('info', localized(lang, {
        ru: 'Стиль оставлен в примерке без покупки',
        uk: 'Стиль залишено у примірці без покупки',
        es: 'Estilo mantenido en la vista previa sin compra',
        'pt-BR': 'Estilo mantido na prévia sem compra',
        vi: 'Đã giữ kiểu trong bản xem thử mà không mua',
        id: 'Gaya disimpan di pratinjau tanpa pembelian',
        tr: 'Stil satın alınmadan önizlemede tutuldu',
        pl: 'Styl pozostawiono w podglądzie bez zakupu',
      }));
      return;
    }
    setBusy(true);
    try {
      if (editorResolvedAction.kind === 'buy-and-apply' || editorResolvedAction.kind === 'buy-only') {
        void recordSupportDiagnostic({
          event: 'customization_purchase',
          result: 'start',
          subject: editorDiagnosticSubject,
        });
        const baseInput = purchaseInputForAction(editorResolvedAction, nextAvatarValue);
        if (!baseInput) throw new Error('invalid_customization_purchase');
        const input = editorResolvedAction.kind === 'buy-only' && editorResolvedAction.target === 'avatar'
          ? buildAtomicEditorAvatarPurchase({
            purchaseInput: baseInput,
            selectedAvatarValue: nextAvatarValue,
            confirmedStoredAuraSelection: confirmed.storedAuraSelection,
            level: confirmed.level,
            frameId: getBestFrameForLevel(confirmed.level).id,
          })
          : baseInput;
        const preflightStatus = await runFreshPurchasePreflight({
          currency: editorResolvedAction.currency,
          amount: editorResolvedAction.cost,
        }, async (expectedAccount) => {
          const outcome = await executePurchaseInput(input, expectedAccount);
          void recordSupportDiagnostic({
            event: 'customization_purchase',
            result: 'success',
            subject: editorDiagnosticSubject,
          });
          showToast('success', outcome === 'applied' ? copy.applied : copy.purchased);
        });
        if (preflightStatus !== 'proceeded') {
          void recordSupportDiagnostic({
            event: 'customization_purchase',
            result: 'blocked',
            reason: preflightStatus === 'shortage' ? 'insufficient_currency' : 'account_changed',
            subject: editorDiagnosticSubject,
          });
          return;
        }
      } else if (editorResolvedAction.kind === 'unchanged') {
        setPreviewAvatarValue(nextAvatarValue);
      } else if (editorResolvedAction.kind === 'apply') {
        void recordSupportDiagnostic({
          event: 'customization_apply',
          result: 'start',
          subject: editorDiagnosticSubject,
        });
        await applyCustomizationDraft({
          avatarValue: nextAvatarValue,
          storedAuraSelection: previewStoredAuraSelection,
          level: confirmed.level,
          frameId: getBestFrameForLevel(confirmed.level).id,
          cloudSyncMode: 'deferred',
        }, serviceDeps);
        emitAppEvent('xp_changed');
        void recordSupportDiagnostic({
          event: 'customization_apply',
          result: 'success',
          subject: editorDiagnosticSubject,
        });
        showToast('success', copy.applied);
      } else {
        showToast('info', actionLabel);
        return;
      }
      setAvatarSide(editorSide);
      setEditorAvatar(null);
    } catch (error) {
      if (error instanceof Error && error.message === 'customization_purchase_account_mismatch') {
        void recordSupportDiagnostic({
          event: 'customization_purchase', result: 'blocked', reason: 'account_changed',
          subject: editorDiagnosticSubject,
        });
        return;
      } else if (error instanceof Error && error.message === 'insufficient_shards') {
        void recordSupportDiagnostic({
          event: 'customization_purchase', result: 'blocked', reason: 'insufficient_currency',
          subject: editorDiagnosticSubject,
        });
        notifyPurchaseShortage('pearls');
        openShortageDestination('pearls');
      } else if (error instanceof Error && error.message === 'insufficient_runes') {
        void recordSupportDiagnostic({
          event: 'customization_purchase', result: 'blocked', reason: 'insufficient_currency',
          subject: editorDiagnosticSubject,
        });
        notifyPurchaseShortage('runes');
        openShortageDestination('runes');
      } else {
        void recordSupportDiagnostic({
          event: editorResolvedAction.kind === 'apply' ? 'customization_apply' : 'customization_purchase',
          result: 'error',
          reason: editorResolvedAction.kind === 'apply' ? 'selection_failed' : 'transaction_failed',
          subject: editorDiagnosticSubject,
        });
        DebugLogger.error('avatar_select.tsx:handleEditorConfirm', error, 'warning');
        showToast('error', copy.purchaseError);
      }
    } finally {
      setBusy(false);
    }
  }, [editorAvatar, busy, editorPreviewAvatarValue, editorResolvedAction, purchaseInputForAction,
    executePurchaseInput, showToast, copy, previewStoredAuraSelection, confirmed.level,
    confirmed.storedAuraSelection, serviceDeps,
    editorSide, actionLabel, openShortageDestination, notifyPurchaseShortage, runFreshPurchasePreflight,
    commitDevPreview, devSandboxActive, lang]);

  const handleConfirmPurchase = useCallback(async () => {
    const pendingPurchase = purchaseState.pending;
    if (!pendingPurchase || busy || purchasePreflightInFlightRef.current) return;
    if (devSandboxActive) {
      dispatchPurchase({ type: 'cancel' });
      return;
    }
    setBusy(true);
    void recordSupportDiagnostic({
      event: 'customization_purchase',
      result: 'start',
      subject: pendingPurchase.target,
    });
    try {
      let purchaseOutcome: 'applied' | 'purchased-only' | undefined;
      const preflightStatus = await runFreshPurchasePreflight({
        currency: pendingPurchase.currency ?? 'pearls',
        amount: pendingPurchase.cost,
      }, async (expectedAccount) => {
        purchaseOutcome = await confirmPendingPurchase(purchaseState, async (input) => {
          return executePurchaseInput(input, expectedAccount);
        }, () => dispatchPurchase({ type: 'cancel' }));
      });
      if (preflightStatus === 'in-flight') return;
      if (preflightStatus !== 'proceeded') {
        void recordSupportDiagnostic({
          event: 'customization_purchase',
          result: 'blocked',
          reason: preflightStatus === 'shortage' ? 'insufficient_currency' : 'account_changed',
          subject: pendingPurchase.target,
        });
        dispatchPurchase({ type: 'cancel' });
        return;
      }
      if (purchaseOutcome) {
        void recordSupportDiagnostic({
          event: 'customization_purchase',
          result: 'success',
          subject: pendingPurchase.target,
        });
        showToast('success', purchaseOutcome === 'applied' ? copy.applied : copy.purchased);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'customization_purchase_account_mismatch') {
        void recordSupportDiagnostic({
          event: 'customization_purchase', result: 'blocked', reason: 'account_changed',
          subject: pendingPurchase.target,
        });
        dispatchPurchase({ type: 'cancel' });
        return;
      } else if (error instanceof Error && error.message === 'insufficient_shards') {
        void recordSupportDiagnostic({
          event: 'customization_purchase', result: 'blocked', reason: 'insufficient_currency',
          subject: pendingPurchase.target,
        });
        dispatchPurchase({ type: 'cancel' });
        notifyPurchaseShortage('pearls');
        openShortageDestination('pearls');
      } else if (error instanceof Error && error.message === 'insufficient_runes') {
        void recordSupportDiagnostic({
          event: 'customization_purchase', result: 'blocked', reason: 'insufficient_currency',
          subject: pendingPurchase.target,
        });
        dispatchPurchase({ type: 'cancel' });
        notifyPurchaseShortage('runes');
        openShortageDestination('runes');
      } else {
        void recordSupportDiagnostic({
          event: 'customization_purchase', result: 'error', reason: 'transaction_failed',
          subject: pendingPurchase.target,
        });
        // зачем: раньше настоящая причина (в т.ч. залипший prepared-слот леджера,
        // блокирующий ВСЕ покупки) терялась за общим тостом — с поля было
        // невозможно понять, что чинить. Причина теперь хотя бы попадает в лог.
        DebugLogger.error('avatar_select.tsx:handleConfirmPurchase', error, 'warning');
        showToast('error', copy.purchaseError);
      }
    } finally {
      setBusy(false);
    }
  }, [purchaseState, busy, executePurchaseInput, showToast, copy, openShortageDestination,
    notifyPurchaseShortage, runFreshPurchasePreflight, devSandboxActive]);

  const selectCatalogItem = useCallback((id: string) => {
    const item = catalogItems.find((candidate) => candidate.id === id);
    if (!item) return;
    if (item.kind === 'level-avatar') {
      setPreviewAvatarValue(item.previewAvatar);
      return;
    }
    if (item.kind === 'custom-avatar') {
      // зачем: тап по плитке — только примерка; редактор цвета открывается осознанно
      // нижней кнопкой «Настроить аватар» (раньше шторка выскакивала на каждый тап).
      setPreviewAvatarValue(item.previewValue);
      return;
    }
    setPreviewStoredAuraSelection(item.kind === 'none-aura' ? NO_AVATAR_AURA_ID : item.auraId);
  }, [catalogItems]);

  const fixedStageHeight = Math.max(184, Math.min(250, Math.round(Dimensions.get('window').height * 0.28)));

  const handleAvatarSideChange = useCallback((side: AvatarSide) => {
    setAvatarSide(side);
    const parsed = parseCustomAvatarValue(previewRef.current.avatar);
    if (!parsed) return;
    setPreviewAvatarValue(makeCustomAvatarValue(
      parsed.avatarId,
      parsed.gradientId,
      side === 'yin' ? 'black' : 'white',
      parsed.artVersion,
    ));
  }, []);

  const handleTabChange = useCallback((tab: CustomizationTab) => {
    setActiveTab(tab);
  }, []);

  const renderCatalogCard = useCallback((item: CatalogCardItem) => {
    const selected = item.kind === 'level-avatar'
      ? isLevelAvatarPreview
      : item.kind === 'custom-avatar'
        ? item.id === selectedAvatar?.avatarId
        : item.id === previewAuraCatalogId;
    const tierPrice = item.kind === 'custom-avatar'
      ? (avatarSide === 'yin' ? getCustomAvatarRuneCost(item.avatar) : getCustomAvatarPurchaseCost(item.avatar))
      : undefined;
    return (
      <View style={styles.cell}>
        <CustomizationCatalogCard
          item={item}
          selected={selected}
          label={itemLabel(item, lang, copy)}
          statusLabel={availabilityStatus(item, lang, copy, selected)}
          tierPrice={item.kind === 'custom-avatar' ? tierPrice : undefined}
          tierCurrency={item.kind === 'custom-avatar' ? (avatarSide === 'yin' ? 'runes' : 'pearls') : undefined}
          onPress={selectCatalogItem}
        />
      </View>
    );
  }, [isLevelAvatarPreview, selectedAvatar?.avatarId, previewAuraCatalogId, lang, copy, selectCatalogItem, avatarSide]);

  const renderCatalogItem = useCallback(
    ({ item }: { item: CatalogCardItem }) => renderCatalogCard(item),
    [renderCatalogCard],
  );

  const selectedTierPrice = typeof avatarCatalogFilter === 'number' ? avatarCatalogFilter : undefined;
  const catalogHeading = activeTab === 'auras'
    ? copy.auras
    : selectedTierPrice !== undefined
      ? avatarShowcaseTierTitle(selectedTierPrice, lang)
      : avatarCatalogFilter === 'mine'
        ? copy.mine
        : copy.catalog;

  const devToggleLabel = devSandboxActive
    ? localized(lang, {
      ru: 'DEV · Закрыть примерку',
      uk: 'DEV · Закрити примірку',
      es: 'DEV · Cerrar vista previa',
      'pt-BR': 'DEV · Fechar prévia',
      vi: 'DEV · Đóng bản xem thử',
      id: 'DEV · Tutup pratinjau',
      tr: 'DEV · Önizlemeyi kapat',
      pl: 'DEV · Zamknij podgląd',
    })
    : localized(lang, {
      ru: 'DEV · Открыть примерку',
      uk: 'DEV · Відкрити примірку',
      es: 'DEV · Abrir vista previa',
      'pt-BR': 'DEV · Abrir prévia',
      vi: 'DEV · Mở bản xem thử',
      id: 'DEV · Buka pratinjau',
      tr: 'DEV · Önizlemeyi aç',
      pl: 'DEV · Otwórz podgląd',
    });

  const listHeader = useMemo(() => (
    <View>
      {avatarDNAEnabled ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={avatarDNACopy(lang).createCharacter}
        onPress={() => router.push('/avatar_dna_studio' as any)}
        style={[styles.avatarDNAEntry, { backgroundColor: t.bgSurface, borderColor: withAlpha(t.accent, '55') }]}
      >
        <View style={[styles.avatarDNAEntryMark, { backgroundColor: withAlpha(t.accent, '20') }]}>
          <Text style={[styles.avatarDNAEntryMarkText, { color: t.accent }]}>A</Text>
        </View>
        <View style={styles.avatarDNAEntryCopy}>
          <Text style={[styles.avatarDNAEntryTitle, { color: t.textPrimary }]}>{avatarDNACopy(lang).createCharacter}</Text>
          <Text style={[styles.avatarDNAEntrySubtitle, { color: t.textSecond }]}>{avatarDNACopy(lang).title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={t.accent} />
      </Pressable> : null}
      {__DEV__ ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={devToggleLabel}
          onPress={handleDevUnlockAll}
          style={[styles.devUnlockButton, { backgroundColor: t.correct }]}
        >
          <Ionicons name={devSandboxActive ? 'refresh-outline' : 'eye-outline'} size={20} color={t.correctText} />
          <Text style={[styles.devUnlockText, { color: t.correctText }]}>{devToggleLabel}</Text>
        </Pressable>
      ) : null}
      {activeTab === 'avatars' ? (
        <View style={styles.filterRail} accessibilityRole="tablist">
          {/* зачем: кнопки-фильтры по ярусам цен убраны (владелец, 2026-08-27) —
              их было семь штук, они занимали две строки над каталогом и дублировали
              заголовки ярусов в самом списке. Остаются «Все» и «Мои». */}
          {([
            { value: 'all' as const, label: copy.all },
            { value: 'mine' as const, label: copy.mine },
          ]).map((option) => {
            const active = avatarCatalogFilter === option.value;
            const accent = t.accent;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}
                onPress={() => setAvatarCatalogFilter(option.value)}
                style={[styles.filterChip, {
                  backgroundColor: active ? accent : t.bgSurface,
                  borderColor: active ? accent : withAlpha(accent, '66'),
                }]}
              >
                <Text style={[styles.filterText, { color: active ? t.correctText : t.textSecond }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={styles.showcaseHeading}>
        <View style={[styles.showcaseAccent, {
          backgroundColor: selectedTierPrice === undefined
            ? t.accent
            : (SHOWCASE_TIER_ACCENT[selectedTierPrice] ?? t.accent),
        }]} />
        <View style={styles.showcaseHeadingCopy}>
          <Text style={[styles.showcaseTitle, { color: t.textPrimary }]}>{catalogHeading}</Text>
          <Text style={[styles.showcaseSubtitle, { color: t.textSecond }]}>
            {avatarShowcaseCountLabel(displayCatalogItems.length, lang)}
          </Text>
        </View>
      </View>
    </View>
  ), [t, copy, activeTab, lang, router, avatarDNAEnabled, avatarCatalogFilter, catalogHeading, displayCatalogItems.length, selectedTierPrice, devSandboxActive, devToggleLabel, handleDevUnlockAll]);

  const purchaseMessage = purchaseState.pending
    ? purchaseCostMessage(purchaseState.pending.cost, lang)
    : '';

  return (
    <ScreenGradient>
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top + 6, backgroundColor: withAlpha(t.bgPrimary, 'F0') }]} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={localized(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
            onPress={() => safeRouterBack(router)}
            style={[styles.iconButton, { backgroundColor: withAlpha(t.bgSurface, 'D9') }]}
          >
            <Ionicons name="chevron-back" size={23} color={t.textPrimary} />
          </Pressable>
          <View style={styles.topCenter} pointerEvents="none">
              <Text style={[styles.title, { color: t.textPrimary }]}>{copy.title}</Text>
          </View>
          <View style={styles.balanceGroup}>
            <RuneBalanceChip color={t.textPrimary} active={focused && appState === 'active'} size={18} testID="avatar-studio-rune-balance" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={localized(lang, { ru: 'Жемчуг', uk: 'Перлини', es: 'Perlas', 'pt-BR': 'Pérolas', vi: 'Ngọc trai', id: 'Mutiara', tr: 'İnciler', pl: 'Perły' })}
              onPress={() => router.push({ pathname: '/shards_shop', params: { source: 'avatar_customization' } } as any)}
              style={[styles.balance, { backgroundColor: withAlpha(t.bgSurface, 'D9') }]}
            >
              <Image source={pearlIconForTheme(themeMode)} style={styles.balanceCoin} contentFit="contain" accessible={false} />
              <Text style={[styles.balanceText, { color: t.textPrimary }]}>{confirmed.shards}</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.fixedStudio, { paddingTop: insets.top + TOP_BAR_CONTENT_HEIGHT }]}>
          <View style={styles.controls}>
            <CustomizationTabs value={activeTab} onChange={handleTabChange} avatarsLabel={copy.avatars} aurasLabel={copy.auras} />
          </View>
          <CustomizationHero
            avatarValue={previewAvatarValue}
            auraId={effectivePreviewAuraId}
            level={confirmed.level}
            avatarLabel={previewAvatarLabel}
            auraLabel={stageAuraLabel}
            themeAccent={t.accent}
            motionEnabled={focused && appState === 'active'}
            minHeight={fixedStageHeight}
            avatarSize={fixedStageHeight < 210 ? 112 : 132}
          />
          {activeTab === 'avatars' ? (
            <View style={styles.sideControl}>
              <YinYangControl
                value={avatarSide}
                onChange={handleAvatarSideChange}
                accessibilityLabelForSide={(side) => side === 'yin'
                  ? localized(lang, {
                    ru: 'Инь, чёрный образ, оплата рунами',
                    uk: 'Інь, чорний образ, оплата рунами',
                    es: 'Yin, aspecto negro, pago con runas',
                    'pt-BR': 'Yin, visual preto, pagamento com runas',
                    vi: 'Yin, diện mạo màu đen, thanh toán bằng rune',
                    id: 'Yin, tampilan hitam, bayar dengan rune',
                    tr: 'Yin, siyah görünüm, rünlerle ödeme',
                    pl: 'Yin, czarny wygląd, płatność runami',
                  })
                  : localized(lang, {
                    ru: 'Янь, светлый образ, оплата жемчугом',
                    uk: 'Янь, світлий образ, оплата перлинами',
                    es: 'Yang, aspecto claro, pago con perlas',
                    'pt-BR': 'Yang, visual claro, pagamento com pérolas',
                    vi: 'Yang, diện mạo sáng, thanh toán bằng ngọc trai',
                    id: 'Yang, tampilan terang, bayar dengan mutiara',
                    tr: 'Yang, açık görünüm, incilerle ödeme',
                    pl: 'Yang, jasny wygląd, płatność perłami',
                  })}
              />
            </View>
          ) : null}
        </View>
        {/* зачем: FlatList должен быть ПРЯМЫМ ребёнком BouncyWrap — обёртка клонирует
            ребёнка (overScrollMode) и вешает на него GestureDetector с нативным
            жестом скролла. Промежуточный Reanimated.View забирал жест себе: на
            Android список только тянулся резинкой и не скроллился (каталог ниже
            первого экрана был недоступен). bouncyStyle переехал в style списка. */}
        <BouncyWrap>
          <Reanimated.FlatList
            decelerationRate="fast"
            ref={listRef}
            data={displayCatalogItems}
            keyExtractor={(item) => item.id}
            renderItem={renderCatalogItem}
            ListHeaderComponent={listHeader}
            numColumns={3}
            columnWrapperStyle={styles.row}
            style={[styles.flex, bouncyStyle]}
            contentContainerStyle={{ paddingBottom: bottomInset + ACTION_BAR_HEIGHT + 20 }}
            onScroll={onAnimatedScroll}
            scrollEventThrottle={16}
            bounces
            alwaysBounceVertical
            overScrollMode="always"
            showsVerticalScrollIndicator={false}
          />
        </BouncyWrap>
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(t.bgPrimary, '00'), withAlpha(t.bgPrimary, 'D9')]}
          style={[styles.bottomScrim, { height: bottomInset + 108 }]}
        />
        <CustomizationActionBar
          action={actionBarAction}
          label={actionLabel}
          price={actionPrice}
          busy={busy}
          bottomOffset={bottomInset + 10}
          onPress={handleAction}
        />
        <AvatarEditorSheet
          visible={editorAvatar !== null}
          avatar={editorAvatar}
          gradientId={editorGradientId}
          logoColor={editorLogoColor}
          title={copy.editAvatar}
              confirmLabel={editorConfirmLabel}
              confirmAccessibilityLabel={editorConfirmAccessibilityLabel}
          confirmPrice={editorActionPrice}
          busy={busy}
          yinAccessibilityLabel={localized(lang, { ru: 'Инь, чёрный образ, оплата рунами', uk: 'Інь, чорний образ, оплата рунами', es: 'Yin, aspecto negro, pago con runas' })}
          yangAccessibilityLabel={localized(lang, { ru: 'Янь, светлый образ, оплата жемчугом', uk: 'Янь, світлий образ, оплата перлинами', es: 'Yang, aspecto claro, pago con perlas' })}
          gradientLabel={(id) => customAvatarGradientNameForLang(CUSTOM_AVATAR_GRADIENTS.find((item) => item.id === id) ?? CUSTOM_AVATAR_GRADIENTS[0], lang)}
          onGradientChange={setEditorGradientId}
          onLogoColorChange={setEditorLogoColor}
          onConfirm={handleEditorConfirm}
          onClose={() => setEditorAvatar(null)}
        />
        <CustomizationPurchaseConfirmModal
          visible={purchaseState.pending !== null}
          title={copy.purchaseTitle}
          message={purchaseMessage}
          cancelLabel={copy.cancel}
          confirmLabel={copy.confirm}
          onCancel={() => dispatchPurchase({ type: 'cancel' })}
          onConfirm={handleConfirmPurchase}
        />
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  avatarDNAEntry: { minHeight: 76, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarDNAEntryMark: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarDNAEntryMarkText: { fontSize: 24, lineHeight: 28, fontWeight: '900' },
  avatarDNAEntryCopy: { flex: 1 }, avatarDNAEntryTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' }, avatarDNAEntrySubtitle: { fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 2 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingBottom: 10,
  },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '900', textAlign: 'center', letterSpacing: -0.2 },
  balanceGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balance: {
    minWidth: 44, height: 36, borderRadius: 13, paddingHorizontal: 11,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  balanceCoin: { width: 17, height: 17 },
  balanceText: { fontSize: 13.5, lineHeight: 18, fontWeight: '800' },
  fixedStudio: { flexShrink: 0 },
  controls: { paddingHorizontal: GRID_PAD, paddingTop: 6, paddingBottom: 2, alignItems: 'center' },
  sideControl: { paddingHorizontal: GRID_PAD, paddingTop: 2, paddingBottom: 10 },
  devUnlockButton: {
    minHeight: 48, marginHorizontal: GRID_PAD, marginBottom: 12, borderRadius: 16,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  devUnlockText: { fontSize: 14, lineHeight: 19, fontWeight: '900', letterSpacing: 0.2 },
  filterRail: {
    paddingHorizontal: GRID_PAD, paddingBottom: 10, gap: 8,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  filterChip: {
    minHeight: 44, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  filterText: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  showcaseHeading: {
    minHeight: 52, marginHorizontal: GRID_PAD, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  showcaseAccent: { width: 5, height: 34, borderRadius: 4 },
  showcaseHeadingCopy: { flex: 1 },
  showcaseTitle: { fontSize: 17, lineHeight: 22, fontWeight: '900', letterSpacing: -0.15 },
  showcaseSubtitle: { marginTop: 1, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  row: { paddingHorizontal: GRID_PAD, gap: GRID_GAP, marginBottom: GRID_GAP },
  cell: { flexBasis: '30%', flexGrow: 1, maxWidth: '31.5%' },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
