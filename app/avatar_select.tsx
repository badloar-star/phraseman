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
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import Reanimated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import ScreenGradient from '../components/ScreenGradient';
import AvatarView from '../components/AvatarView';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { pearlIconForTheme } from './coin_icons';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { safeRouterBack } from './navigation_back';
import { triLang, type Lang } from '../constants/i18n';
import {
  NO_AVATAR_AURA_ID,
  getAvatarAuraById,
  type AvatarAuraDef,
} from '../constants/avatar_auras';
import {
  CUSTOM_AVATAR_GRADIENTS,
  customAvatarGradientNameForLang,
  customAvatarNameForLang,
  getCustomAvatarById,
  makeCustomAvatarValue,
  parseCustomAvatarValue,
  type CustomAvatarDef,
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
  type CatalogAvailability,
} from './customization_catalog';
import {
  resolveCustomizationAction,
  resolveEffectivePreviewAuraId,
  type CustomizationAction,
  type CustomizationTab,
} from './customization_draft';
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
  useAppSnapshotSelector,
} from './app_snapshot_store';
import { getShardsBalance, spendShardsIdempotent } from './shards_system';
import { syncToCloud } from './cloud_sync';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { updateMyGroupPoints } from './firestore_leagues';
import { getVerifiedRealPremiumStatus, getVerifiedVipStatus } from './premium_guard';
import { parseWeekPointsForWeek } from './hall_of_fame_utils';
import { getCanonicalUserId } from './user_id_policy';
import { getStableId } from './stable_id';
import { actionToastTri, emitAppEvent } from './events';
import { CustomizationHero } from '../components/customization/CustomizationHero';
import {
  CustomizationCatalogCard,
  type CatalogCardItem,
  type LevelAvatarTileItem,
} from '../components/customization/CustomizationCatalogCard';
import {
  CustomizationActionBar,
  CustomizationTabs,
} from '../components/customization/CustomizationControls';
import { AvatarEditorSheet } from '../components/customization/AvatarEditorSheet';
import { CustomizationPurchaseConfirmModal } from '../components/customization/CustomizationPurchaseConfirmModal';

const GRID_GAP = 10;
const GRID_PAD = 16;
const ACTION_BAR_HEIGHT = 82;
const AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS = 30_000;
const REVALIDATE_TTL_MS = 30_000;
/** Фиксированная высота сцены: первый кадр = финальная геометрия (layout stability). */
const STAGE_MIN_HEIGHT = 288;
/** Высота контентной части закреплённого верхнего бара (без safe-инсета). */
const TOP_BAR_CONTENT_HEIGHT = 64;
/** Диапазон скролла, на котором сцена «передаёт» превью в мини-бар. */
const COLLAPSE_START = 120;
const COLLAPSE_END = 210;


const HEX_COLOR = /^#([0-9a-f]{6})$/i;
const withAlpha = (color: string, alpha: string): string => HEX_COLOR.test(color) ? `${color}${alpha}` : color;

const RU_STUDIO_COPY = {
  title: 'Студия', preview: 'Предпросмотр образа', avatars: 'Аватары', auras: 'Ауры', all: 'Все', mine: 'Мои', catalog: 'Каталог',
  apply: 'Применить образ', applied: 'Образ применён', purchased: 'Добавлено в коллекцию', buy: 'Купить', buyApply: 'Купить и применить', plus: 'Открыть Plus',
  reward: 'Особая награда', owned: 'В коллекции', selected: 'Выбрано', noAura: 'Без ауры', levelAvatar: 'Аватар уровня', resetLevelAvatar: 'Вернуть аватар уровня',
  levelAvatarEnabled: 'Аватар уровня включён', editAvatar: 'Настроить аватар', applyStyle: 'Выбрать оформление', dark: 'Тёмное', light: 'Светлое',
  cancel: 'Отмена', confirm: 'Подтвердить', purchaseTitle: 'Подтвердить покупку', purchaseError: 'Не удалось завершить покупку. Попробуй ещё раз.',
  // зачем: арена-ауры стали уровневыми, «наградной» остался только «Нимб» бета-тестеров —
  // подпись и подсказка больше не отсылают к Арене.
  applyError: 'Образ не применился. Попробуй ещё раз.', rewardHint: 'Эта награда вручается за особые заслуги',
};
type StudioCopy = { [K in keyof typeof RU_STUDIO_COPY]: string };

const STUDIO_COPY: Record<Lang, StudioCopy> = {
  ru: RU_STUDIO_COPY,
  uk: {
    title: 'Студія', preview: 'Попередній перегляд', avatars: 'Аватари', auras: 'Аури', all: 'Усі', mine: 'Мої', catalog: 'Каталог',
    apply: 'Застосувати образ', applied: 'Образ застосовано', purchased: 'Додано до колекції', buy: 'Купити', buyApply: 'Купити й застосувати', plus: 'Відкрити Plus',
    reward: 'Особлива нагорода', owned: 'У колекції', selected: 'Вибрано', noAura: 'Без аури', levelAvatar: 'Аватар рівня', resetLevelAvatar: 'Повернути аватар рівня',
    levelAvatarEnabled: 'Аватар рівня ввімкнено', editAvatar: 'Налаштувати аватар', applyStyle: 'Обрати оформлення', dark: 'Темне', light: 'Світле',
    cancel: 'Скасувати', confirm: 'Підтвердити', purchaseTitle: 'Підтвердити покупку', purchaseError: 'Не вдалося завершити покупку. Спробуй ще раз.',
    applyError: 'Образ не застосовано. Спробуй ще раз.', rewardHint: 'Ця нагорода вручається за особливі заслуги',
  },
  es: {
    title: 'Estudio', preview: 'Vista previa', avatars: 'Avatares', auras: 'Auras', all: 'Todos', mine: 'Míos', catalog: 'Catálogo',
    apply: 'Aplicar estilo', applied: 'Estilo aplicado', purchased: 'Añadido a la colección', buy: 'Comprar', buyApply: 'Comprar y aplicar', plus: 'Abrir Plus',
    reward: 'Recompensa especial', owned: 'En la colección', selected: 'Seleccionado', noAura: 'Sin aura', levelAvatar: 'Avatar de nivel', resetLevelAvatar: 'Volver al avatar de nivel',
    levelAvatarEnabled: 'Avatar de nivel restaurado', editAvatar: 'Personalizar avatar', applyStyle: 'Elegir estilo', dark: 'Oscuro', light: 'Claro',
    cancel: 'Cancelar', confirm: 'Confirmar', purchaseTitle: 'Confirmar compra', purchaseError: 'No se pudo completar la compra. Inténtalo de nuevo.',
    applyError: 'No se pudo aplicar el estilo. Inténtalo de nuevo.', rewardHint: 'Esta recompensa se otorga por méritos especiales',
  },
  'pt-BR': {
    title: 'Estúdio', preview: 'Prévia do visual', avatars: 'Avatares', auras: 'Auras', all: 'Todos', mine: 'Meus', catalog: 'Catálogo',
    apply: 'Aplicar visual', applied: 'Visual aplicado', purchased: 'Adicionado à coleção', buy: 'Comprar', buyApply: 'Comprar e aplicar', plus: 'Abrir Plus',
    reward: 'Recompensa especial', owned: 'Na coleção', selected: 'Selecionado', noAura: 'Sem aura', levelAvatar: 'Avatar de nível', resetLevelAvatar: 'Restaurar avatar de nível',
    levelAvatarEnabled: 'Avatar de nível restaurado', editAvatar: 'Personalizar avatar', applyStyle: 'Escolher estilo', dark: 'Escuro', light: 'Claro',
    cancel: 'Cancelar', confirm: 'Confirmar', purchaseTitle: 'Confirmar compra', purchaseError: 'Não foi possível concluir a compra. Tente novamente.',
    applyError: 'Não foi possível aplicar o visual. Tente novamente.', rewardHint: 'Esta recompensa é concedida por méritos especiais',
  },
  vi: {
    title: 'Studio', preview: 'Xem trước diện mạo', avatars: 'Avatar', auras: 'Hào quang', all: 'Tất cả', mine: 'Của tôi', catalog: 'Danh mục',
    apply: 'Áp dụng diện mạo', applied: 'Đã áp dụng diện mạo', purchased: 'Đã thêm vào bộ sưu tập', buy: 'Mua', buyApply: 'Mua và áp dụng', plus: 'Mở Plus',
    reward: 'Phần thưởng đặc biệt', owned: 'Trong bộ sưu tập', selected: 'Đã chọn', noAura: 'Không hào quang', levelAvatar: 'Avatar theo cấp', resetLevelAvatar: 'Khôi phục avatar theo cấp',
    levelAvatarEnabled: 'Đã khôi phục avatar theo cấp', editAvatar: 'Tùy chỉnh avatar', applyStyle: 'Chọn phong cách', dark: 'Tối', light: 'Sáng',
    cancel: 'Hủy', confirm: 'Xác nhận', purchaseTitle: 'Xác nhận mua', purchaseError: 'Không thể hoàn tất giao dịch. Hãy thử lại.',
    applyError: 'Không thể áp dụng diện mạo. Hãy thử lại.', rewardHint: 'Phần thưởng này được trao vì đóng góp đặc biệt',
  },
  id: {
    title: 'Studio', preview: 'Pratinjau tampilan', avatars: 'Avatar', auras: 'Aura', all: 'Semua', mine: 'Milik saya', catalog: 'Katalog',
    apply: 'Terapkan tampilan', applied: 'Tampilan diterapkan', purchased: 'Ditambahkan ke koleksi', buy: 'Beli', buyApply: 'Beli dan terapkan', plus: 'Buka Plus',
    reward: 'Hadiah spesial', owned: 'Dalam koleksi', selected: 'Dipilih', noAura: 'Tanpa aura', levelAvatar: 'Avatar level', resetLevelAvatar: 'Kembalikan avatar level',
    levelAvatarEnabled: 'Avatar level dipulihkan', editAvatar: 'Sesuaikan avatar', applyStyle: 'Pilih gaya', dark: 'Gelap', light: 'Terang',
    cancel: 'Batal', confirm: 'Konfirmasi', purchaseTitle: 'Konfirmasi pembelian', purchaseError: 'Pembelian tidak dapat diselesaikan. Coba lagi.',
    applyError: 'Tampilan tidak dapat diterapkan. Coba lagi.', rewardHint: 'Hadiah ini diberikan atas jasa istimewa',
  },
  tr: {
    title: 'Stüdyo', preview: 'Görünüm önizlemesi', avatars: 'Avatarlar', auras: 'Auralar', all: 'Tümü', mine: 'Benimkiler', catalog: 'Katalog',
    apply: 'Görünümü uygula', applied: 'Görünüm uygulandı', purchased: 'Koleksiyona eklendi', buy: 'Satın al', buyApply: 'Satın al ve uygula', plus: "Plus'ı aç",
    reward: 'Özel ödül', owned: 'Koleksiyonda', selected: 'Seçildi', noAura: 'Aurasız', levelAvatar: 'Seviye avatarı', resetLevelAvatar: 'Seviye avatarına dön',
    levelAvatarEnabled: 'Seviye avatarı geri yüklendi', editAvatar: 'Avatarı özelleştir', applyStyle: 'Stili seç', dark: 'Koyu', light: 'Açık',
    cancel: 'İptal', confirm: 'Onayla', purchaseTitle: 'Satın almayı onayla', purchaseError: 'Satın alma tamamlanamadı. Tekrar dene.',
    applyError: 'Görünüm uygulanamadı. Tekrar dene.', rewardHint: 'Bu ödül özel katkılar için verilir',
  },
  pl: {
    title: 'Studio', preview: 'Podgląd wyglądu', avatars: 'Awatary', auras: 'Aury', all: 'Wszystkie', mine: 'Moje', catalog: 'Katalog',
    apply: 'Zastosuj wygląd', applied: 'Wygląd zastosowany', purchased: 'Dodano do kolekcji', buy: 'Kup', buyApply: 'Kup i zastosuj', plus: 'Otwórz Plus',
    reward: 'Nagroda specjalna', owned: 'W kolekcji', selected: 'Wybrano', noAura: 'Bez aury', levelAvatar: 'Awatar poziomu', resetLevelAvatar: 'Przywróć awatar poziomu',
    levelAvatarEnabled: 'Przywrócono awatar poziomu', editAvatar: 'Dostosuj awatar', applyStyle: 'Wybierz styl', dark: 'Ciemne', light: 'Jasne',
    cancel: 'Anuluj', confirm: 'Potwierdź', purchaseTitle: 'Potwierdź zakup', purchaseError: 'Nie udało się dokończyć zakupu. Spróbuj ponownie.',
    applyError: 'Nie udało się zastosować wyglądu. Spróbuj ponownie.', rewardHint: 'Ta nagroda jest przyznawana za szczególne zasługi',
  },
};

function studioCopy(lang: Lang): StudioCopy {
  return STUDIO_COPY[lang];
}

function localized(lang: Lang, copy: Record<Lang, string>): string {
  return copy[lang];
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
  try {
    const [[, nameRaw], [, xpRaw], [, langRaw], [, weekRaw], [, streakRaw], [, leagueRaw], [, frameRaw]] =
      await AsyncStorage.multiGet(['user_name', 'user_total_xp', 'app_lang', 'week_points_v2', 'streak_count', 'league_state_v3', 'user_frame']);
    const totalXp = parseInt(xpRaw || '0', 10) || 0;
    const weekPoints = parseWeekPointsForWeek(weekRaw);
    let leagueId: number | undefined;
    try { if (leagueRaw) leagueId = JSON.parse(leagueRaw).leagueId; } catch {}
    const [realPremium, vip] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
    ]);
    await syncPublicProfileSnapshot({
      reason: 'display_change',
      name: (nameRaw || '').trim() || `Level ${level}`,
      totalXp,
      weekPoints,
      lang: langRaw || 'ru',
      avatar,
      streak: parseInt(streakRaw || '0', 10) || undefined,
      leagueId,
      frame: frameRaw || undefined,
      aura: aura || undefined,
      isPremium: realPremium,
      isVip: vip,
    });
    await updateMyGroupPoints(weekPoints);
  } catch {}
}

async function invalidateAvatarDependentCaches(nextAvatar: string, nextAura: string | null): Promise<void> {
  try {
    const leagueRaw = await AsyncStorage.getItem('league_state_v3');
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
  await AsyncStorage.multiRemove([
    'global_lb_cache_v4', 'leaderboard_cache_v1', 'arena_top100_snapshot_v8',
    'arena_top100_remote_at_v1', 'arena_rating_screen_cache_v1', 'club_remote_refresh_at_v2',
    'friend_profiles_cache_v1', 'friends_tab_swr_v1', 'friends_activity_feed_v2', 'friends_activity_feed_v1',
  ]).catch(() => {});
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
  return parsed ? `${parsed.gradientId}:${parsed.logoColor}` : `${CUSTOM_AVATAR_GRADIENTS[0].id}:black`;
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
    case 'level': return `${localized(lang, { ru: 'Уровень', uk: 'Рівень', es: 'Nivel', 'pt-BR': 'Nível', vi: 'Cấp', id: 'Level', tr: 'Seviye', pl: 'Poziom' })} ${item.availability.level}`;
    case 'plus': return 'Plus';
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
  const { isPremium, isVip } = usePremium();
  const copy = useMemo(() => studioCopy(lang), [lang]);
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onAnimatedScroll, scrollY } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const focused = useIsScreenFocused();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const appSnapshotCustomization = useAppSnapshotSelector((snapshot) => snapshot.customization);
  const initialCustomization = useMemo(() => createCustomizationInitialState(getAppSnapshot()), []);
  const [confirmed, setConfirmed] = useState(initialCustomization.confirmed);
  const [previewAvatarValue, setPreviewAvatarValue] = useState(initialCustomization.previewAvatarValue);
  const [previewStoredAuraSelection, setPreviewStoredAuraSelection] = useState(initialCustomization.previewStoredAuraSelection);
  const [activeTab, setActiveTab] = useState<CustomizationTab>('avatars');
  const [busy, setBusy] = useState(false);
  const [editorAvatar, setEditorAvatar] = useState<CustomAvatarDef | null>(null);
  const [editorGradientId, setEditorGradientId] = useState(CUSTOM_AVATAR_GRADIENTS[0].id);
  const [editorLogoColor, setEditorLogoColor] = useState<CustomAvatarLogoColor>('black');
  const [purchaseState, dispatchPurchase] = useReducer(reducePurchaseConfirmation, { pending: null });
  const confirmedRef = useRef(confirmed);
  const previewRef = useRef({ avatar: previewAvatarValue, aura: previewStoredAuraSelection });
  const lastValidationRef = useRef(0);
  const listRef = useRef<any>(null);

  useEffect(() => { confirmedRef.current = confirmed; }, [confirmed]);
  useEffect(() => { previewRef.current = { avatar: previewAvatarValue, aura: previewStoredAuraSelection }; }, [previewAvatarValue, previewStoredAuraSelection]);

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
    patchAppSnapshot({ customization: snapshot });
  }, []);

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

  useFocusEffect(useCallback(() => {
    if (Date.now() - lastValidationRef.current < REVALIDATE_TTL_MS) return undefined;
    lastValidationRef.current = Date.now();
    let active = true;
    void revalidateCustomizationSnapshot(
      confirmedRef.current,
      readFreshCustomizationSnapshot,
      (fresh) => { if (active) publishCustomizationSnapshot(fresh); },
    ).catch(() => {});
    return () => { active = false; };
  }, [publishCustomizationSnapshot]));

  const serviceDeps = useMemo<CustomizationServiceDeps>(() => ({
    storage: AsyncStorage,
    getCurrentSnapshot: () => confirmedRef.current,
    publishSnapshot: publishCustomizationSnapshot,
    invalidateCaches: invalidateAvatarDependentCaches,
    syncCloud: syncAvatarDisplayToCloud,
    syncPublicProfile: writeProfileAvatarSnapshot,
  }), [publishCustomizationSnapshot]);

  const purchaseDeps = useMemo<CustomizationPurchaseDeps>(() => ({
    ...serviceDeps,
    storage: AsyncStorage,
    getAccountScope: async () => (await getCanonicalUserId()) || getStableId(),
    spendShardsIdempotent,
    validatePurchase: (intent) => validateCustomizationPurchase(intent, {
      snapshot: confirmedRef.current,
      isPremium,
      isVip,
    }),
    validateApply: (intent) => validateCustomizationPurchaseApply(intent, {
      snapshot: confirmedRef.current,
      isPremium,
      isVip,
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
  }), [serviceDeps, isPremium, isVip]);

  useEffect(() => {
    void resumePersistedCustomizationPurchase(purchaseDeps)
      .then(async () => {
        const shards = await getShardsBalance();
        const current = confirmedRef.current;
        const next = { ...current, shards };
        confirmedRef.current = next;
        setConfirmed(next);
        patchAppSnapshot({ customization: next });
      })
      .catch(() => {});
  }, [purchaseDeps]);

  const effectivePreviewAuraId = resolveEffectivePreviewAuraId(previewStoredAuraSelection, isPremium, isVip);
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
  }), [confirmed.ownedAvatars, confirmed.giftedAvatarId, confirmed.activeAvatar]);
  const auraItems = useMemo(() => buildAuraCatalog({
    activeAvatar: previewAvatarValue,
    activeAuraId: confirmed.storedAuraSelection,
    level: confirmed.level,
    ownedAuras: confirmed.ownedAuras,
    isPremium,
    isVip,
  }), [previewAvatarValue, confirmed.storedAuraSelection, confirmed.level, confirmed.ownedAuras, isPremium, isVip]);
  const catalogItems = useMemo<CatalogCardItem[]>(
    () => activeTab === 'avatars' ? [levelTile, ...avatarItems] : auraItems,
    [activeTab, levelTile, avatarItems, auraItems],
  );

  const selectedAvatar = parseCustomAvatarValue(previewAvatarValue);
  const isLevelAvatarPreview = selectedAvatar === null;
  const selectedAvatarItem = avatarItems.find((item) => item.kind === 'custom-avatar' && item.id === selectedAvatar?.avatarId);
  const selectedAuraItem = previewStoredAuraSelection === null
    ? undefined
    : auraItems.find((item) => item.id === (previewStoredAuraSelection === NO_AVATAR_AURA_ID ? 'none' : previewStoredAuraSelection));
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
  });

  const previewAvatarLabel = selectedAvatarItem?.kind === 'custom-avatar' ? customAvatarNameForLang(selectedAvatarItem.avatar, lang) : copy.levelAvatar;
  const previewAura = effectivePreviewAuraId ? getAvatarAuraById(effectivePreviewAuraId) : undefined;
  const previewAuraLabel = previewStoredAuraSelection === NO_AVATAR_AURA_ID
    ? copy.noAura
    : previewAura ? auraName(previewAura, lang) : copy.noAura;
  const levelWord = localized(lang, { ru: 'Уровень', uk: 'Рівень', es: 'Nivel', 'pt-BR': 'Nível', vi: 'Cấp', id: 'Level', tr: 'Seviye', pl: 'Poziom' });
  const stageAuraLabel = `${previewAuraLabel} · ${levelWord} ${confirmed.level}`;

  const actionLabel = useMemo(() => {
    switch (resolvedAction.kind) {
      case 'unchanged': return copy.applied;
      case 'apply': return copy.apply;
      case 'buy-and-apply': return copy.buyApply;
      case 'buy-only': return copy.buy;
      case 'open-plus': return copy.plus;
      case 'explain-level': return `${localized(lang, { ru: 'Откроется на уровне', uk: 'Відкриється на рівні', es: 'Se desbloquea en el nivel', 'pt-BR': 'Desbloqueia no nível', vi: 'Mở khóa ở cấp', id: 'Terbuka di level', tr: 'Açılacağı seviye', pl: 'Odblokuje się na poziomie' })} ${resolvedAction.level}`;
      case 'explain-reward': return copy.reward;
    }
  }, [resolvedAction, copy, lang]);
  const actionCost = resolvedAction.kind === 'buy-and-apply' || resolvedAction.kind === 'buy-only'
    ? resolvedAction.cost
    : null;

  const applyInput = useCallback((cloudSyncMode: 'immediate' | 'deferred'): ApplyCustomizationInput => ({
    avatarValue: previewAvatarValue,
    storedAuraSelection: previewStoredAuraSelection,
    level: confirmed.level,
    frameId: getBestFrameForLevel(confirmed.level).id,
    cloudSyncMode,
  }), [previewAvatarValue, previewStoredAuraSelection, confirmed.level]);

  const purchaseInputForAction = useCallback((action: Extract<CustomizationAction, { kind: 'buy-only' | 'buy-and-apply' }>): PurchaseCustomizationInput | null => {
    if (action.target === 'avatar') {
      const parsed = parseCustomAvatarValue(previewAvatarValue);
      if (!parsed) return null;
      const cost = action.cost;
      const base = {
        target: 'avatar' as const,
        itemId: parsed.avatarId,
        cost,
        spendReason: action.purchaseKind === 'restyle' ? 'custom_avatar_restyle' as const : 'custom_avatar' as const,
        ownedValue: encodeOwnedStyle(previewAvatarValue),
      };
      return action.kind === 'buy-and-apply'
        ? { ...base, mode: 'buy-and-apply', applyInput: applyInput(cost > 0 ? 'immediate' : 'deferred') }
        : { ...base, mode: 'buy-only' };
    }
    if (!previewStoredAuraSelection || previewStoredAuraSelection === NO_AVATAR_AURA_ID) return null;
    const purchasedAura = action.cost > 0;
    const base = {
      target: 'aura' as const,
      itemId: previewStoredAuraSelection,
      cost: action.cost,
      spendReason: 'avatar_aura' as const,
      ownedValue: true as const,
    };
    return action.kind === 'buy-and-apply'
      ? { ...base, mode: 'buy-and-apply', applyInput: applyInput(purchasedAura ? 'immediate' : 'deferred') }
      : { ...base, mode: 'buy-only' };
  }, [previewAvatarValue, previewStoredAuraSelection, applyInput]);

  const showToast = useCallback((kind: 'success' | 'error' | 'info', text: string) => {
    emitAppEvent('action_toast', actionToastTri(kind, { ru: text, uk: text, es: text, 'pt-BR': text, vi: text, id: text, tr: text, pl: text }));
  }, []);

  const handleAction = useCallback(async () => {
    if (busy) return;
    if (resolvedAction.kind === 'unchanged') return;
    if (resolvedAction.kind === 'open-plus') {
      router.push({ pathname: '/premium_modal', params: { context: 'avatar_aura' } } as any);
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
      if (input) dispatchPurchase({ type: 'request', input });
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
  }, [busy, resolvedAction, router, showToast, actionLabel, copy, purchaseInputForAction, previewAvatarValue, previewStoredAuraSelection, confirmed.level, applyInput, serviceDeps]);

  const handleConfirmPurchase = useCallback(async () => {
    const pendingPurchase = purchaseState.pending;
    if (!pendingPurchase || busy) return;
    setBusy(true);
    try {
      const outcome = await confirmPendingPurchase(purchaseState, async (input) => {
        const prepared = await prepareCustomizationPurchase(input, purchaseDeps);
        return resumeCustomizationPurchase(prepared, purchaseDeps);
      });
      dispatchPurchase({ type: 'cancel' });
      const shards = await getShardsBalance();
      const current = confirmedRef.current;
      const next = { ...current, shards };
      confirmedRef.current = next;
      setConfirmed(next);
      patchAppSnapshot({ customization: next });
      showToast('success', outcome === 'applied' ? copy.applied : copy.purchased);
    } catch (error) {
      if (error instanceof Error && error.message === 'insufficient_shards') {
        router.push({ pathname: '/shards_shop', params: { source: 'avatar_customization' } } as any);
      } else {
        showToast('error', copy.purchaseError);
      }
    } finally {
      setBusy(false);
    }
  }, [purchaseState, busy, purchaseDeps, showToast, copy, router]);

  const openEditor = useCallback(() => {
    const parsed = parseCustomAvatarValue(previewRef.current.avatar);
    if (!parsed) return;
    const def = getCustomAvatarById(parsed.avatarId);
    if (!def) return;
    setEditorGradientId(parsed.gradientId);
    setEditorLogoColor(parsed.logoColor);
    setEditorAvatar(def);
  }, []);

  const selectCatalogItem = useCallback((id: string) => {
    const item = catalogItems.find((candidate) => candidate.id === id);
    if (!item) return;
    if (item.kind === 'level-avatar') {
      setPreviewAvatarValue(item.previewAvatar);
      return;
    }
    if (item.kind === 'custom-avatar') {
      // зачем: тап по плитке — только примерка; редактор цвета открывается осознанно
      // кнопкой «Настроить» на сцене (раньше шторка выскакивала на каждый тап).
      setPreviewAvatarValue(item.previewValue);
      return;
    }
    setPreviewStoredAuraSelection(item.kind === 'none-aura' ? NO_AVATAR_AURA_ID : item.auraId);
  }, [catalogItems]);

  const heroHeight = Math.max(300, Math.min(430, Math.round(Dimensions.get('window').height * 0.52)));
  const scrollToCatalog = useCallback(() => {
    // зачем: раньше вкладки телепортировали список даже с верха экрана; теперь позиция
    // трогается только когда пользователь уже углубился в каталог.
    if (scrollY.value <= heroHeight) return;
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: heroHeight, animated: false }));
  }, [scrollY, heroHeight]);

  const handleTabChange = useCallback((tab: CustomizationTab) => {
    setActiveTab(tab);
    scrollToCatalog();
  }, [scrollToCatalog]);

  const renderCatalogItem = useCallback(({ item }: { item: CatalogCardItem }) => {
    const selected = item.kind === 'level-avatar'
      ? isLevelAvatarPreview
      : item.kind === 'custom-avatar'
        ? item.id === selectedAvatar?.avatarId
        : item.id === (previewStoredAuraSelection === NO_AVATAR_AURA_ID ? 'none' : previewStoredAuraSelection);
    return (
      <View style={styles.cell}>
        <CustomizationCatalogCard
          item={item}
          selected={selected}
          label={itemLabel(item, lang, copy)}
          statusLabel={availabilityStatus(item, lang, copy, selected)}
          onPress={selectCatalogItem}
        />
      </View>
    );
  }, [isLevelAvatarPreview, selectedAvatar?.avatarId, previewStoredAuraSelection, lang, copy, selectCatalogItem]);

  const listHeader = useMemo(() => (
    <View>
      <View style={{ height: insets.top + TOP_BAR_CONTENT_HEIGHT }} />
      <CustomizationHero
        avatarValue={previewAvatarValue}
        auraId={effectivePreviewAuraId}
        level={confirmed.level}
        avatarLabel={previewAvatarLabel}
        auraLabel={stageAuraLabel}
        themeAccent={t.accent}
        motionEnabled={focused && appState === 'active'}
        minHeight={STAGE_MIN_HEIGHT}
        onEdit={selectedAvatar ? openEditor : null}
        editLabel={copy.editAvatar}
      />
      <View style={styles.controls}>
        <CustomizationTabs value={activeTab} onChange={handleTabChange} avatarsLabel={copy.avatars} aurasLabel={copy.auras} />
      </View>
    </View>
  ), [insets.top, t, copy, confirmed.level, previewAvatarValue, effectivePreviewAuraId, previewAvatarLabel, stageAuraLabel, focused, appState, selectedAvatar, openEditor, activeTab, handleTabChange]);

  // зачем: сцена «передаёт» превью в закреплённый бар при скролле — образ всегда на
  // глазах, пока листаешь каталог (главная боль старого экрана). Интерполяции живут на
  // UI-потоке (Reanimated), ре-рендеров при скролле нет.
  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [90, COLLAPSE_START + 40], [1, 0], Extrapolation.CLAMP),
  }));
  const miniPreviewStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [10, 0], Extrapolation.CLAMP) }],
  }));
  const topBarBackdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 110], [0, 1], Extrapolation.CLAMP),
  }));

  const purchaseMessage = purchaseState.pending
    ? purchaseCostMessage(purchaseState.pending.cost, lang)
    : '';

  return (
    <ScreenGradient>
      <View style={styles.flex}>
        <BouncyWrap>
          <Reanimated.View style={[styles.flex, bouncyStyle]}>
            <Reanimated.FlatList
              ref={listRef}
              data={catalogItems}
              keyExtractor={(item) => item.id}
              renderItem={renderCatalogItem}
              numColumns={3}
              ListHeaderComponent={listHeader}
              columnWrapperStyle={styles.row}
              contentContainerStyle={{ paddingBottom: bottomInset + ACTION_BAR_HEIGHT + 20 }}
              onScroll={onAnimatedScroll}
              scrollEventThrottle={16}
              bounces
              alwaysBounceVertical
              overScrollMode="always"
              showsVerticalScrollIndicator={false}
            />
          </Reanimated.View>
        </BouncyWrap>
        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, topBarBackdropStyle]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(t.bgPrimary, 'F0') }]} />
          </Reanimated.View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={localized(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
            onPress={() => safeRouterBack(router)}
            style={[styles.iconButton, { backgroundColor: withAlpha(t.bgSurface, 'D9') }]}
          >
            <Ionicons name="chevron-back" size={23} color={t.textPrimary} />
          </Pressable>
          <View style={styles.topCenter} pointerEvents="none">
            <Reanimated.Text style={[styles.title, { color: t.textPrimary }, largeTitleStyle]} numberOfLines={1}>
              {copy.title}
            </Reanimated.Text>
            <Reanimated.View style={[styles.miniPreview, miniPreviewStyle]}>
              <AvatarView avatar={previewAvatarValue} level={confirmed.level} auraId={effectivePreviewAuraId} size={34} animateAura={false} />
              <Text style={[styles.miniName, { color: t.textPrimary }]} numberOfLines={1}>{previewAvatarLabel}</Text>
            </Reanimated.View>
          </View>
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
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(t.bgPrimary, '00'), withAlpha(t.bgPrimary, 'D9')]}
          style={[styles.bottomScrim, { height: bottomInset + 108 }]}
        />
        <CustomizationActionBar
          action={resolvedAction}
          label={actionLabel}
          cost={actionCost}
          busy={busy}
          bottomOffset={bottomInset + 10}
          onPress={handleAction}
        />
        <AvatarEditorSheet
          visible={editorAvatar !== null}
          avatar={editorAvatar}
          gradientId={editorGradientId}
          logoColor={editorLogoColor}
          owned={editorAvatar ? !!confirmed.ownedAvatars[editorAvatar.id] : false}
          title={copy.editAvatar}
          applyLabel={copy.applyStyle}
          darkLabel={copy.dark}
          lightLabel={copy.light}
          gradientLabel={(id) => customAvatarGradientNameForLang(CUSTOM_AVATAR_GRADIENTS.find((item) => item.id === id) ?? CUSTOM_AVATAR_GRADIENTS[0], lang)}
          onGradientChange={setEditorGradientId}
          onLogoColorChange={setEditorLogoColor}
          onConfirm={() => {
            if (editorAvatar) setPreviewAvatarValue(makeCustomAvatarValue(editorAvatar.id, editorGradientId, editorLogoColor));
            setEditorAvatar(null);
          }}
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
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingBottom: 10,
  },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '900', textAlign: 'center', letterSpacing: -0.2 },
  miniPreview: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 190,
  },
  miniName: { flexShrink: 1, fontSize: 14.5, lineHeight: 19, fontWeight: '800' },
  balance: {
    minWidth: 44, height: 36, borderRadius: 13, paddingHorizontal: 11,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  balanceCoin: { width: 17, height: 17 },
  balanceText: { fontSize: 13.5, lineHeight: 18, fontWeight: '800' },
  controls: { paddingHorizontal: GRID_PAD, paddingTop: 18, paddingBottom: 12 },
  row: { paddingHorizontal: GRID_PAD, gap: GRID_GAP, marginBottom: GRID_GAP },
  cell: { flex: 1, maxWidth: `${100 / 3}%` as any },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
