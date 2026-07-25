import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  Platform,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { triLang } from '../../constants/i18n';
import type { Lang } from '../../constants/i18n';
import type { Theme, ThemeMode } from '../../constants/theme';
import { monoIcon } from '../../constants/monoIcon';
import { categoriesForFlashcardsHub } from './constants';
import { packHubCodeName, packHubLabelForInterface, packTitleForInterface, packCategoryIonIcon, type FlashcardMarketPack } from './marketplace';
import { useCardPackShardPaywall } from './useCardPackShardPaywall';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';

import { oskolokImageForPackShards } from '../oskolok';
import { actionToastTri, emitAppEvent, onAppEvent } from '../events';
import { stageOwnedPackCardsForNavigation } from '../flashcards_collection';
import { hasMeaningfulCommunityPackCreateDraft } from '../community_packs/communityPackDraftStorage';
import { stageCommunityPackCardsForNavigation } from '../community_packs/staging';
import { packTileImageForPack } from './packMarketplaceIcons';
import { hasActivePackGiftVoucher } from './pack_trial_gift';
import DuoPressable from '../../components/DuoPressable';
import FlashcardsHubHeader from '../../components/flashcards/FlashcardsHubHeader';
import FlashcardsShelves, { type ShelfPack } from '../../components/flashcards/FlashcardsShelves';
import { packCoverGradient } from './marketplace';
import GlassSurface, { glassFill } from '../../components/GlassSurface';
import PlusBadge from '../../components/PlusBadge';
import ReportErrorButton from '../../components/ReportErrorButton';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import ReportPackModal from '../../components/ReportPackModal';
import { hideCommunityPackOnDevice, loadHiddenCommunityPackIds } from '../community_packs/communityPackHiddenStorage';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import { hapticTap } from '../../hooks/use-haptics';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { frenchFlashcardsGateCopy } from '../flashcards_target_gate';
import { isCollectiblesEnabled } from '../remote_flags';
import { getCollectiblesOwnedMap } from '../collectibles/storage';

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);

type Props = {
  lang: Lang;
  t: Theme;
  studyTarget?: RuntimeStudyTarget;
  marketPacks: FlashcardMarketPack[];
  ownedPackIds: string[];
  shardBalance: number;
  onMarketRefresh: () => void | Promise<void>;
  /** Вкладки «Мої / Вітрина / Спільнота» + UGC-каталог (без Expo Go, з cloud). */
  cloudCommunityEnabled?: boolean;
  communityPacks?: FlashcardMarketPack[];
  ownedCommunityPackIds?: string[];
  /** Stable id автора — кнопка «редагувати» на своїх UGC. */
  hubAuthorStableId?: string | null;
  onTrainingPress: () => void;
  onAudioPress: () => void;
  /** Третий режим отработки — арена-квиз (макет C4). */
  onArenaPress: () => void;
  hasFlashcardsPlus?: boolean;
  /** Для контрасту підписей / сегментів на `ScreenGradient` (Океан / Сакура). */
  themeMode: ThemeMode;
};

const COLS = 3;
const GAP = 10;
const H_PAD = 16;
const TILE_RADIUS = 18;
const STAGGER_MS = 42;
const STAGGER_CAP = 14;
const ENTRANCE_DURATION = 400;
const FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED = false;
const FLASHCARD_HUB_REPEATING_MOTION_ENABLED = false;

const HUB_CATEGORY_PLANNED_LABELS: Record<string, { ptBR: string; vi: string; id: string; tr: string; pl: string }> = {
  saved: { ptBR: 'Salvos', vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane' },
  custom: { ptBR: 'Criar', vi: 'Tạo', id: 'Buat', tr: 'Oluştur', pl: 'Utwórz' },
};

const enteringForIndex = (i: number) =>
  FadeInDown.duration(ENTRANCE_DURATION)
    .delay(Math.min(i, STAGGER_CAP) * STAGGER_MS)
    .easing(Easing.out(Easing.cubic));

const SPRING_CFG = { damping: 16, stiffness: 420, mass: 0.35 } as const;

function shadowForTile(t: Theme, kind: 'base' | 'owned' | 'shop'): ViewStyle {
  const os = getEffectivePlatformOS();
  if (os === 'web') {
    return {};
  }
  if (os === 'android') {
    return { elevation: kind === 'base' ? 3 : 4 };
  }
  if (kind === 'shop') {
    return {
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.14,
      shadowRadius: 10,
    };
  }
  if (kind === 'owned') {
    return {
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    };
  }
  return {
    shadowColor: t.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  };
}

function PlusCornerBadge({ themeMode }: { themeMode: ThemeMode }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 7,
        top: 7,
      }}
    >
      <PlusBadge themeMode={themeMode} size="xs" showIcon={false} />
    </View>
  );
}

type HubTileShellProps = {
  testID: string;
  a11y: string;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  reduceMotion: boolean;
  width: number;
  children: React.ReactNode;
};

/** Пружина на нажатии — як у в polished apps (scale ~0,96). */
function HubTileShell({ testID, a11y, onPress, onLongPress, disabled, reduceMotion, width, children }: HubTileShellProps) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <ReanimatedPressable
      testID={testID}
      accessibilityLabel={a11y}
      accessible
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={onLongPress ? 420 : undefined}
      disabled={disabled}
      onPressIn={() => {
        if (reduceMotion) {
          s.value = withTiming(0.99, { duration: 50 });
        } else {
          s.value = withSpring(0.96, SPRING_CFG);
        }
      }}
      onPressOut={() => {
        s.value = reduceMotion ? withTiming(1, { duration: 90 }) : withSpring(1, SPRING_CFG);
      }}
      style={[{ width, alignItems: 'center' }, aStyle]}
    >
      {children}
    </ReanimatedPressable>
  );
}

type UnownedCardProps = {
  t: Theme;
  themeMode: ThemeMode;
  tileW: number;
  pack: FlashcardMarketPack;
  ion: string;
  /** Вбудована PNG-іконка набору; інакше `ion` (Ionicons). */
  packPng?: ImageSourcePropType;
  iconSize: number;
  cardShadow: ViewStyle;
  reduceMotion: boolean;
};

/** Картка магазину: глянець, м\'якший CTA, «живі» деталі. */
function UnownedMarketPackCard({
  t,
  themeMode,
  tileW,
  pack,
  ion,
  packPng,
  iconSize,
  cardShadow,
  reduceMotion,
}: UnownedCardProps) {
  const pfOs = getEffectivePlatformOS();
  const ctaScale = useSharedValue(1);
  const isFocused = useIsScreenFocused();

  // Пульс CTA живёт только на видимом экране и активном приложении:
  // freezeOnBlur:false держит ушедшие экраны живыми, без гарда луп грел бы
  // телефон в фоне (паттерн components/AvatarAura.tsx).
  useEffect(() => {
    if (reduceMotion || !FLASHCARD_HUB_REPEATING_MOTION_ENABLED || !isFocused) {
      cancelAnimation(ctaScale);
      ctaScale.value = 1;
      return;
    }

    const start = () => {
      cancelAnimation(ctaScale);
      ctaScale.value = 1;
      ctaScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    };
    const stop = () => {
      cancelAnimation(ctaScale);
      ctaScale.value = 1;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(ctaScale);
    };
  }, [reduceMotion, ctaScale, isFocused]);

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const glimmerH = Math.max(32, Math.floor(tileW * 0.42));

  return (
    <View
      style={[
        {
          width: tileW,
          height: tileW,
          borderRadius: TILE_RADIUS,
          overflow: 'hidden',
        },
        cardShadow,
      ]}
    >
      <LinearGradient
        colors={t.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: tileW, height: tileW, flexDirection: 'column' }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: glimmerH,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: t.bgCard,
            borderWidth: 0,
            borderColor: t.border,
            alignItems: 'center',
            justifyContent: 'center',
            ...(pfOs === 'ios'
              ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.35,
                  shadowRadius: 2,
                }
              : pfOs === 'android'
                ? { elevation: 2 }
                : {}),
          }}
        >
          <Ionicons name="lock-closed" size={12} color={t.textSecond} style={{ opacity: 0.9 }} />
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 10,
            paddingHorizontal: 2,
          }}
        >
          {packPng ? (
            <Image source={packPng} style={{ width: iconSize, height: iconSize }} contentFit="contain" />
          ) : (
            <Ionicons name={ion as any} size={iconSize} color={t.textPrimary} />
          )}
        </View>
        <Reanimated.View
          style={[
            ctaStyle,
            {
              position: 'absolute',
              right: 8,
              bottom: 8,
              zIndex: 10,
              ...pfOs === 'ios'
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.45,
                    shadowRadius: 4,
                  }
                : pfOs === 'android'
                  ? { elevation: 8 }
                  : {},
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(24,34,58,0.98)', 'rgba(33,48,80,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 12,
              borderWidth: 0,
              borderColor: 'rgba(255,255,255,0.22)',
              paddingVertical: 5,
              paddingHorizontal: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Image source={oskolokImageForPackShards(pack.priceShards)} style={{ width: 12, height: 12 }} contentFit="contain" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: monoIcon(themeMode, '#F1F5F9'), letterSpacing: 0.2 }}>
                {pack.priceShards}
              </Text>
            </View>
          </LinearGradient>
        </Reanimated.View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingBottom: 8,
            paddingTop: 2,
          }}
        />
      </LinearGradient>
    </View>
  );
}

/** Сетка 3 в ряд; вертикальна прокрутка — на екрані-хабі (`flashcards.tsx`). */
export default function FlashcardsCategoryHub({
  lang,
  t,
  studyTarget,
  marketPacks,
  ownedPackIds,
  shardBalance,
  onMarketRefresh,
  cloudCommunityEnabled = false,
  communityPacks = [],
  ownedCommunityPackIds = [],
  hubAuthorStableId = null,
  onTrainingPress,
  onAudioPress,
  onArenaPress,
  hasFlashcardsPlus = false,
  themeMode,
}: Props) {
  const router = useRouter();
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hubPackSegment, setHubPackSegment] = useState<'mine' | 'showcase' | 'community'>('mine');
  const [hasUnfinishedPackDraft, setHasUnfinishedPackDraft] = useState(false);
  const [discardDraftForNewOpen, setDiscardDraftForNewOpen] = useState(false);
  const [hiddenCommunityPackIds, setHiddenCommunityPackIds] = useState<Set<string>>(() => new Set());
  const [ugcReportHintPackId, setUgcReportHintPackId] = useState<string | null>(null);
  const [reportModalPack, setReportModalPack] = useState<FlashcardMarketPack | null>(null);
  // Подарок-ваучер на бесплатный официальный набор (48 ч). Без этого флага пейвол
  // никогда не откроется в режиме 'voucher' и подарок нельзя забрать с этого экрана.
  const [hasPackVoucher, setHasPackVoucher] = useState(false);

  const refreshHiddenCommunityPacks = useCallback(async (optimisticPackId?: string | null) => {
    if (optimisticPackId) {
      setHiddenCommunityPackIds(prev => {
        const next = new Set(prev);
        next.add(optimisticPackId);
        return next;
      });
      return;
    }
    const ids = await loadHiddenCommunityPackIds(studyTarget);
    setHiddenCommunityPackIds(new Set(ids));
  }, [studyTarget]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const ok = await hasMeaningfulCommunityPackCreateDraft(studyTarget, lang);
        if (!cancelled) setHasUnfinishedPackDraft(ok);
      })();
      void (async () => {
        const voucher = await hasActivePackGiftVoucher(studyTarget);
        if (!cancelled) setHasPackVoucher(voucher);
      })();
      void refreshHiddenCommunityPacks();
      return () => {
        cancelled = true;
      };
    }, [lang, refreshHiddenCommunityPacks, studyTarget]),
  );

  // Ваучер выдаётся/сгорает вне фокуса этого экрана (подарок за уровень, redeem
  // в пейволе) — держим флаг в актуальном состоянии по событиям, а не только на фокус.
  useEffect(() => {
    let cancelled = false;
    const refreshVoucher = () => {
      void (async () => {
        const voucher = await hasActivePackGiftVoucher(studyTarget);
        if (!cancelled) setHasPackVoucher(voucher);
      })();
    };
    const subSet = onAppEvent('pack_trial_gift_set', refreshVoucher);
    const subConsumed = onAppEvent('pack_trial_gift_consumed', refreshVoucher);
    return () => {
      cancelled = true;
      subSet.remove();
      subConsumed.remove();
    };
  }, [studyTarget]);

  const { openPaywall, CardPackPaywallModalEl } = useCardPackShardPaywall({
    balance: shardBalance,
    hasVoucher: hasPackVoucher,
    studyTarget,
    lang,
    router,
    onAfterPurchase: onMarketRefresh,
    onPurchaseStart: (id) => setBuyingPackId(id),
    onPurchaseEnd: () => setBuyingPackId(null),
    onCommunityPackHiddenOnDevice: refreshHiddenCommunityPacks,
  });
  const { width: winW } = useWindowDimensions();
  const tileW = useMemo(() => {
    const inner = winW - H_PAD * 2 - GAP * (COLS - 1);
    return Math.max(96, Math.floor(inner / COLS));
  }, [winW]);

  /** Категорії хабу — компактні Ionicons. */
  const iconSize = Math.min(32, Math.floor(tileW * 0.38));
  /** Платні набори: PNG/лінія — більший центр, щоб читалось як на скріні. */
  const packTileIconSize = Math.max(72, Math.floor(tileW * 0.86));
  const labelSize = Math.max(9, Math.min(11, Math.floor(tileW * 0.11)));

  const hubCategories = useMemo(() => categoriesForFlashcardsHub(), []);

  const isGradientSurface = false;
  const hubLabelPrimary = t.textPrimary;
  const hubLabelMuted = t.textMuted;
  const hubLabelAccent = t.accent;
  const tabOnBg = `${t.accent}22`;
  const tabOnText = t.accent;
  const tabOffBg = t.bgSurface;
  const tabOffText = t.textSecond;
  const tabOffBorder = t.border;

  /**
   * Куплений UGC, авторський набір, або UGC id у спільному `ownedPackIds` (легасі/гілка без isCommunityUgc).
   */
  const isCommunityPackMine = useCallback(
    (p: FlashcardMarketPack) =>
      ownedCommunityPackIds.includes(p.id) ||
      (!!hubAuthorStableId && !!p.authorStableId && p.authorStableId === hubAuthorStableId) ||
      (!!p.isCommunityUgc && ownedPackIds.includes(p.id)),
    [ownedCommunityPackIds, hubAuthorStableId, ownedPackIds],
  );

  const mineOwnedPacks = useMemo(
    () => [...marketPacks.filter((p) => ownedPackIds.includes(p.id)), ...communityPacks.filter(isCommunityPackMine)],
    [marketPacks, communityPacks, ownedPackIds, isCommunityPackMine],
  );

  /**
   * Вкладка «Мои»: без витрины платных официальных наборов — только то, что уже в «Моїх» (`ownedPackIds`).
   * Подари: ваучер активується в paywall → `redeemPackGiftVoucher` додає id в owned — тоді плитка з\'являється тут.
   */
  const mineTabPacksOnlyOwned = useMemo(() => {
    const catalogOwnedOrdered = marketPacks.filter((p) => ownedPackIds.includes(p.id));
    const catalogIds = new Set(marketPacks.map((p) => p.id));
    const extraOwnedCommunity = communityPacks.filter(
      (p) => isCommunityPackMine(p) && !catalogIds.has(p.id),
    );
    return [...catalogOwnedOrdered, ...extraOwnedCommunity];
  }, [marketPacks, communityPacks, ownedPackIds, isCommunityPackMine]);

  const showcaseTabPacks = useMemo(
    () => marketPacks.filter((p) => !ownedPackIds.includes(p.id)),
    [marketPacks, ownedPackIds],
  );

  const visibleCommunityPacks = useMemo(
    () => communityPacks.filter((p) => !hiddenCommunityPackIds.has(p.id)),
    [communityPacks, hiddenCommunityPackIds],
  );

  const isPackInMineOwned = useCallback((p: FlashcardMarketPack) => mineOwnedPacks.some((m) => m.id === p.id), [mineOwnedPacks]);

  // ── Данные полок хаба (макет A1) ───────────────────────────────────────────
  // зачем: полки строятся из УЖЕ загруженных паков — ни одного нового запроса.
  const packToShelf = useCallback(
    (pack: FlashcardMarketPack, owned: boolean): ShelfPack => ({
      id: pack.id,
      title: packTitleForInterface(pack, lang),
      mono: packHubCodeName(pack).slice(0, 2).toUpperCase(),
      cover: packCoverGradient(pack.category),
      owned,
      price: owned ? undefined : pack.priceShards,
    }),
    [lang],
  );

  /** «Продолжи» — купленные паки, к которым уже есть доступ. */
  const continueShelfPacks = useMemo(
    () => mineOwnedPacks.slice(0, 2).map((p) => packToShelf(p, true)),
    [mineOwnedPacks, packToShelf],
  );

  /** Полка обложек: сначала некупленные (витрина), потом остальные. */
  const cinemaShelfPacks = useMemo(
    () =>
      marketPacks
        .filter((p) => !p.isCommunityUgc)
        .map((p) => packToShelf(p, ownedPackIds.includes(p.id))),
    [marketPacks, ownedPackIds, packToShelf],
  );

  /** Чипы тем — категории, которые реально представлены в каталоге. */
  const themeShelfChips = useMemo(() => {
    const emoji: Record<string, string> = {
      daily: '☀️', business: '💼', slang: '🔥', travel: '✈️', exam: '🎓', verbs: '⚡',
    };
    const present = Array.from(new Set(marketPacks.map((p) => p.category))).slice(0, 3);
    return present.map((cat) => ({ id: cat, emoji: emoji[cat] ?? '📘', label: cat }));
  }, [marketPacks]);

  const shelfLabels = useMemo(
    () => ({
      continue: triLang(lang, {
        ru: 'Продолжи', uk: 'Продовжи', es: 'Continúa', 'pt-BR': 'Continue',
        vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj',
      }),
      cinema: triLang(lang, {
        ru: 'Наборы', uk: 'Набори', es: 'Packs', 'pt-BR': 'Pacotes',
        vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy',
      }),
      themes: triLang(lang, {
        ru: 'Темы', uk: 'Теми', es: 'Temas', 'pt-BR': 'Temas',
        vi: 'Chủ đề', id: 'Tema', tr: 'Temalar', pl: 'Tematy',
      }),
      opened: triLang(lang, {
        ru: 'открыт', uk: 'відкритий', es: 'abierto', 'pt-BR': 'aberto',
        vi: 'đã mở', id: 'terbuka', tr: 'açık', pl: 'otwarty',
      }),
    }),
    [lang],
  );

  /** Тап по теме — переключаем на витрину, где список фильтруется. */
  const openThemeById = useCallback(() => {
    setHubPackSegment('showcase');
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setReduceMotion(false);
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Прогрев кэша инвентаря «Сокровищницы»: отсюда открывается экран коллекции,
  // и к моменту тапа карта уже в памяти → коллекция откроется сразу, без лага.
  useEffect(() => {
    if (isCollectiblesEnabled()) void getCollectiblesOwnedMap();
  }, []);

  const openOwnedPack = async (pack: FlashcardMarketPack) => {
    setUgcReportHintPackId(null);
    if (pack.isCommunityUgc) {
      const ok = await stageCommunityPackCardsForNavigation(pack.id, studyTarget);
      if (!ok) {
        emitAppEvent(
          'action_toast',
          actionToastTri('error', {
            ru: 'Карточки набора не загрузились.',
            uk: 'Не вдалося завантажити картки набору.',
            es: 'No se pudieron cargar las tarjetas del pack.',
            'pt-BR': 'Não foi possível carregar os cartões do pack.',
            vi: 'Không thể tải thẻ của pack.',
            id: 'Gagal memuat kartu dari pack.',
            tr: 'Paket kartları yüklenemedi.',
            pl: 'Nie udało się załadować kart pakietu.',
          }),
        );
        return;
      }
    } else {
      const staged = stageOwnedPackCardsForNavigation(pack.id, studyTarget);
      if (!staged) {
        emitAppEvent(
          'action_toast',
          actionToastTri('info', {
            ru: frenchFlashcardsGateCopy('ru').body,
            uk: frenchFlashcardsGateCopy('uk').body,
            es: frenchFlashcardsGateCopy('ru').body,
            'pt-BR': frenchFlashcardsGateCopy('ru').body,
            vi: frenchFlashcardsGateCopy('ru').body,
            id: frenchFlashcardsGateCopy('ru').body,
            tr: frenchFlashcardsGateCopy('ru').body,
            pl: frenchFlashcardsGateCopy('ru').body,
          }),
        );
        return;
      }
    }
    router.push({ pathname: '/flashcards_collection', params: { pack: pack.id } } as any);
  };

  const onLockedPackPress = useCallback(
    (pack: FlashcardMarketPack) => {
      if (buyingPackId) return;
      setUgcReportHintPackId(null);
      openPaywall(pack);
    },
    [buyingPackId, openPaywall],
  );

  /**
   * Тап по обложке на полке: купленный пак открываем, чужой — ведём в пейвол.
   * Тот же путь, что у плиток ниже, — чтобы полка и сетка вели себя одинаково.
   */
  const openPackById = useCallback(
    (id: string) => {
      const pack = [...marketPacks, ...communityPacks].find((p) => p.id === id);
      if (!pack) return;
      if (ownedPackIds.includes(pack.id) || isPackInMineOwned(pack)) {
        void openOwnedPack(pack);
      } else {
        onLockedPackPress(pack);
      }
    },
    // openOwnedPack — обычная функция, не мемо: в зависимости не берём, иначе
    // колбэк пересоздавался бы на каждый рендер хаба.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marketPacks, communityPacks, ownedPackIds, isPackInMineOwned, onLockedPackPress],
  );

  let tileAnimIndex = 0;
  const labelStyle = (owned: boolean) => ({
    marginTop: 8,
    fontSize: labelSize,
    fontWeight: '600' as const,
    letterSpacing: 0.15,
    color: owned ? hubLabelMuted : hubLabelPrimary,
    textAlign: 'center' as const,
    lineHeight: labelSize + 2,
  });

  const packCodeLabelStyle = (owned: boolean) => ({
    marginTop: 8,
    fontSize: labelSize,
    fontWeight: '600' as const,
    letterSpacing: 0.15,
    color: owned ? hubLabelAccent : hubLabelPrimary,
    textAlign: 'center' as const,
    lineHeight: labelSize + 2,
  });

  const hubBarW = winW - H_PAD * 2;

  const renderHubSegmentTab = (id: 'mine' | 'showcase' | 'community', label: string) => {
    const active = hubPackSegment === id;
    return (
      <TouchableOpacity
        onPress={() => {
          setUgcReportHintPackId(null);
          setHubPackSegment(id);
        }}
        style={{
          flex: 1,
          minWidth: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          paddingHorizontal: 8,
          borderRadius: 12,
          borderWidth: 0,
          borderColor: 'transparent',
          backgroundColor: active ? tabOnBg : tabOffBg,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: active ? tabOnText : tabOffText,
            fontWeight: '800',
            fontSize: labelSize + 1,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPackTiles = (
    packList: FlashcardMarketPack[],
    ownedFn: (pack: FlashcardMarketPack) => boolean,
    ugcCommunityCatalog = false,
  ) =>
    packList.map((pack) => {
      const owned = ownedFn(pack);
      const showUgcReportShortcut = ugcCommunityCatalog && !!pack.isCommunityUgc && !owned;
      const displayTitle = packTitleForInterface(pack, lang);
      const hubCode = packHubCodeName(pack);
      /** UGC: під плиткою показуємо назву набору, а не id / похідний codeName. */
      const packTileLabel = packHubLabelForInterface(pack, lang);
      const ion = packCategoryIonIcon(pack.category) as any;
      const packPng = packTileImageForPack(pack);
      const dimWhileOtherBuying = !owned && buyingPackId && buyingPackId !== pack.id;
      const i = tileAnimIndex++;
      const cardShadow: ViewStyle = !owned ? shadowForTile(t, 'shop') : {};
      const showAuthorEdit =
        !!hubAuthorStableId &&
        !!pack.isCommunityUgc &&
        !!pack.authorStableId &&
        pack.authorStableId === hubAuthorStableId;
      return (
        <Reanimated.View
          key={`mkt_${pack.id}`}
          {...(!reduceMotion && FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED ? { entering: enteringForIndex(i) } : {})}
          style={{ width: tileW, alignItems: 'center', paddingBottom: 6, position: 'relative' }}
        >
          <HubTileShell
            testID={`flashcards-hub-pack-${pack.id}`}
            a11y={pack.isCommunityUgc ? `${pack.titleRu}. ${pack.titleUk}` : `${hubCode}. ${displayTitle}`}
            width={tileW}
            reduceMotion={reduceMotion}
            disabled={!owned && !!buyingPackId}
            onPress={() => (owned ? void openOwnedPack(pack) : onLockedPackPress(pack))}
            onLongPress={
              showUgcReportShortcut
                ? () => {
                    void hapticTap();
                    setUgcReportHintPackId((cur) => (cur === pack.id ? null : pack.id));
                  }
                : undefined
            }
          >
            <View style={{ width: tileW, position: 'relative', opacity: dimWhileOtherBuying ? 0.55 : 1 }}>
              {owned ? (
                <GlassSurface
                  tone="raised"
                  radius={TILE_RADIUS}
                  highlight
                  style={{
                    width: tileW,
                    height: tileW,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                    position: 'relative',
                  }}
                >
                  {packPng ? (
                    <Image source={packPng} style={{ width: packTileIconSize, height: packTileIconSize }} contentFit="contain" />
                  ) : (
                    <Ionicons name={ion} size={packTileIconSize} color={t.textPrimary} />
                  )}
                </GlassSurface>
              ) : (
                <UnownedMarketPackCard
                  t={t}
                  themeMode={themeMode}
                  tileW={tileW}
                  pack={pack}
                  iconSize={packTileIconSize}
                  ion={ion}
                  packPng={packPng}
                  cardShadow={cardShadow}
                  reduceMotion={reduceMotion}
                />
              )}
            </View>
          </HubTileShell>
          {showUgcReportShortcut && ugcReportHintPackId === pack.id ? (
            <View style={{ marginTop: 4, width: '100%' }}>
              <TouchableOpacity
                onPress={() => {
                  void hapticTap();
                  setReportModalPack(pack);
                  setUgcReportHintPackId(null);
                }}
                style={{ paddingVertical: 4, width: '100%' }}
                hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              >
                <Text
                  style={{
                    color: t.wrong,
                    fontSize: Math.max(9, labelSize),
                    fontWeight: '800',
                    textAlign: 'center',
                    textDecorationLine: 'underline',
                  }}
                >
                  {triLang(lang, {
                    ru: 'Пожаловаться на набор',
                    uk: 'Поскаржитися на набір',
                    es: 'Reportar el pack',
                    'pt-BR': 'Reportar o pacote',
                    vi: 'Báo cáo bộ thẻ',
                    id: 'Laporkan paket',
                    tr: 'Paketi bildir',
                    pl: 'Zgłoś zestaw',
                  })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  void hapticTap();
                  setUgcReportHintPackId(null);
                  try {
                    await hideCommunityPackOnDevice(pack.id, studyTarget);
                    await refreshHiddenCommunityPacks();
                  } catch {
                    // no-op: AsyncStorage unavailable
                  }
                }}
                style={{ paddingVertical: 4, width: '100%' }}
                hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              >
                <Text
                  style={{
                    color: isGradientSurface ? hubLabelMuted : t.textMuted,
                    fontSize: Math.max(9, labelSize),
                    fontWeight: '800',
                    textAlign: 'center',
                    textDecorationLine: 'underline',
                  }}
                >
                  {triLang(lang, {
                    ru: 'Не показывать мне',
                    uk: 'Не показувати мені',
                    es: 'No mostrarme',
                    'pt-BR': 'Não mostrar para mim',
                    vi: 'Đừng hiển thị cho tôi',
                    id: 'Jangan tampilkan untuk saya',
                    tr: 'Bana gösterme',
                    pl: 'Nie pokazuj mi',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {showAuthorEdit ? (
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: '/community_pack_create', params: { packId: pack.id } } as any)
              }
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                zIndex: 8,
                padding: 7,
                borderRadius: 12,
                backgroundColor: 'rgba(0,0,0,0.55)',
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="create-outline" size={17} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <Text style={packCodeLabelStyle(owned)} numberOfLines={2}>
            {packTileLabel}
          </Text>
          {pack.isPendingUpdateReview ? (
            <Text style={{ fontSize: 10, color: isGradientSurface ? hubLabelAccent : t.accent, fontWeight: '800', marginTop: 3, textAlign: 'center' }}>
              {triLang(lang, { ru: 'На модерации', uk: 'На модерації', es: 'En moderación', 'pt-BR': 'Em moderação', vi: 'Đang kiểm duyệt', id: 'Dalam moderasi', tr: 'İncelemede', pl: 'W moderacji' })}
            </Text>
          ) : null}
        </Reanimated.View>
      );
    });

  const renderHubCategoryTiles = () =>
    hubCategories.map((cat) => {
      const plannedLabel = HUB_CATEGORY_PLANNED_LABELS[cat.id];
      const label = triLang(lang, { ru: cat.labelRU, uk: cat.labelUK, es: cat.labelES, 'pt-BR': plannedLabel.ptBR, vi: plannedLabel.vi, id: plannedLabel.id, tr: plannedLabel.tr, pl: plannedLabel.pl });
      const i = tileAnimIndex++;
      return (
        <Reanimated.View
          key={cat.id}
          {...(!reduceMotion && FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED ? { entering: enteringForIndex(i) } : {})}
          style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}
        >
          <HubTileShell
            testID={`flashcards-hub-tile-${cat.id}`}
            a11y={`qa-flashcards-hub-tile-${cat.id}`}
            width={tileW}
            reduceMotion={reduceMotion}
            onPress={() =>
              router.push({
                pathname: '/flashcards_collection',
                params: cat.id === 'custom' ? { cat: cat.id, create: '1' } : { cat: cat.id },
              } as any)
            }
          >
            <GlassSurface
              radius={TILE_RADIUS}
              highlight
              style={{
                width: tileW,
                height: tileW,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Ionicons name={cat.icon as any} size={iconSize} color={t.textPrimary} />
            </GlassSurface>
          </HubTileShell>
          <Text style={labelStyle(true)} numberOfLines={2}>
            {label}
          </Text>
        </Reanimated.View>
      );
    });

  const renderTrainingTile = () => {
    const i = tileAnimIndex++;
    const label = triLang(lang, {
      ru: 'Тренировка',
      uk: 'Тренування',
      es: 'Práctica',
      'pt-BR': 'Praticar',
      vi: 'Luyện tập',
      id: 'Latihan',
      tr: 'Pratik',
      pl: 'Trening',
    });

    return (
      <Reanimated.View
        key="training"
        {...(!reduceMotion && FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED ? { entering: enteringForIndex(i) } : {})}
        style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}
      >
        <HubTileShell
          testID="flashcards-hub-tile-training"
          a11y="qa-flashcards-hub-tile-training"
          width={tileW}
          reduceMotion={reduceMotion}
          onPress={onTrainingPress}
        >
          <GlassSurface
            radius={TILE_RADIUS}
            highlight
            style={{
              width: tileW,
              height: tileW,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Ionicons name="play-circle-outline" size={iconSize} color={t.textPrimary} />
            {!hasFlashcardsPlus && <PlusCornerBadge themeMode={themeMode} />}
          </GlassSurface>
        </HubTileShell>
        <Text style={labelStyle(true)} numberOfLines={2}>
          {label}
        </Text>
      </Reanimated.View>
    );
  };

  const renderAudioTile = () => {
    const i = tileAnimIndex++;
    const label = triLang(lang, {
      ru: 'Слушать',
      uk: 'Слухати',
      es: 'Escuchar',
      'pt-BR': 'Ouvir',
      vi: 'Nghe',
      id: 'Dengar',
      tr: 'Dinle',
      pl: 'Słuchaj',
    });

    return (
      <Reanimated.View
        key="audio"
        {...(!reduceMotion && FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED ? { entering: enteringForIndex(i) } : {})}
        style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}
      >
        <HubTileShell
          testID="flashcards-hub-tile-audio"
          a11y="qa-flashcards-hub-tile-audio"
          width={tileW}
          reduceMotion={reduceMotion}
          onPress={onAudioPress}
        >
          <GlassSurface
            radius={TILE_RADIUS}
            highlight
            style={{
              width: tileW,
              height: tileW,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Ionicons name="headset-outline" size={iconSize} color={t.textPrimary} />
            {!hasFlashcardsPlus && <PlusCornerBadge themeMode={themeMode} />}
          </GlassSurface>
        </HubTileShell>
        <Text style={labelStyle(true)} numberOfLines={2}>
          {label}
        </Text>
      </Reanimated.View>
    );
  };

  /**
   * зачем: третий режим отработки из макета (C4 «Арена»). Раньше в разделе было
   * два режима, и оба — самооценка: в свайпе можно честно жать «знаю» и не
   * выучить ничего, в аудио проверки нет вовсе. Арена даёт объективный
   * результат — 4 варианта, таймер, счёт и список слов, которые не даются.
   */
  const renderArenaTile = () => {
    const i = tileAnimIndex++;
    const label = triLang(lang, {
      ru: 'Арена',
      uk: 'Арена',
      es: 'Arena',
      'pt-BR': 'Arena',
      vi: 'Đấu trường',
      id: 'Arena',
      tr: 'Arena',
      pl: 'Arena',
    });

    return (
      <Reanimated.View
        key="arena"
        {...(!reduceMotion && FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED ? { entering: enteringForIndex(i) } : {})}
        style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}
      >
        <HubTileShell
          testID="flashcards-hub-tile-arena"
          a11y="qa-flashcards-hub-tile-arena"
          width={tileW}
          reduceMotion={reduceMotion}
          onPress={onArenaPress}
        >
          <GlassSurface
            radius={TILE_RADIUS}
            highlight
            style={{
              width: tileW,
              height: tileW,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Ionicons name="flash-outline" size={iconSize} color={t.textPrimary} />
            {!hasFlashcardsPlus && <PlusCornerBadge themeMode={themeMode} />}
          </GlassSurface>
        </HubTileShell>
        <Text style={labelStyle(true)} numberOfLines={2}>
          {label}
        </Text>
      </Reanimated.View>
    );
  };

  const renderCollectionTile = () => {
    const i = tileAnimIndex++;
    const label = triLang(lang, {
      ru: 'Коллекция',
      uk: 'Колекція',
      es: 'Colección',
      'pt-BR': 'Coleção',
      vi: 'Bộ sưu tập',
      id: 'Koleksi',
      tr: 'Koleksiyon',
      pl: 'Kolekcja',
    });

    return (
      <Reanimated.View
        key="collection"
        {...(!reduceMotion && FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED ? { entering: enteringForIndex(i) } : {})}
        style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}
      >
        <HubTileShell
          testID="flashcards-hub-tile-collection"
          a11y="qa-flashcards-hub-tile-collection"
          width={tileW}
          reduceMotion={reduceMotion}
          onPress={() => router.push('/collectibles_screen' as any)}
        >
          <GlassSurface
            radius={TILE_RADIUS}
            highlight
            style={{
              width: tileW,
              height: tileW,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Ionicons name="albums-outline" size={iconSize} color={t.textPrimary} />
          </GlassSurface>
        </HubTileShell>
        <Text style={labelStyle(true)} numberOfLines={2}>
          {label}
        </Text>
      </Reanimated.View>
    );
  };

  const hubSegmentTabs = cloudCommunityEnabled ? (
    <View
      style={{
        width: hubBarW,
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
      }}
    >
      {renderHubSegmentTab('mine', triLang(lang, { ru: 'Мои', uk: 'Мої', es: 'Mis', 'pt-BR': 'Meus', vi: 'Của tôi', id: 'Milik saya', tr: 'Benim', pl: 'Moje' }))}
      {renderHubSegmentTab('showcase', triLang(lang, { ru: 'Витрина', uk: 'Вітрина', es: 'Vitrina', 'pt-BR': 'Vitrine', vi: 'Gian hàng', id: 'Etalase', tr: 'Vitrin', pl: 'Witryna' }))}
      {renderHubSegmentTab('community', triLang(lang, { ru: 'Сообщество', uk: 'Спільнота', es: 'Comunidad', 'pt-BR': 'Comunidade', vi: 'Cộng đồng', id: 'Komunitas', tr: 'Topluluk', pl: 'Społeczność' }))}
    </View>
  ) : null;

  return (
    <View style={{ paddingHorizontal: H_PAD }}>
      {/* зачем: макет A1 `.hub-top` — заголовок раздела + баланс монет. Раньше
          баланса на экране не было вообще: юзер узнавал, что монет не хватает,
          только упёршись в пейвол. Теперь решение принимается до тапа. */}
      <FlashcardsHubHeader
        title={triLang(lang, {
          ru: 'Карточки',
          uk: 'Картки',
          es: 'Tarjetas',
          'pt-BR': 'Cartões',
          vi: 'Thẻ',
          id: 'Kartu',
          tr: 'Kartlar',
          pl: 'Karty',
        })}
        balance={shardBalance}
        t={t}
      />

      {/* зачем (макет A1): экран был сеткой одинаковых круглых значков — по ней
          нельзя понять ни что начато, ни насколько продвинулся, ни что вообще
          есть в разделе. Полки превращают его в витрину: «Продолжи» с обложками
          и процентом, ряд обложек по темам, чипы категорий. Показываем только
          на вкладке «Мои» — на «Витрине» и «Сообществе» свои списки. */}
      {hubPackSegment === 'mine' && (
        <FlashcardsShelves
          continuePacks={continueShelfPacks}
          cinemaPacks={cinemaShelfPacks}
          themes={themeShelfChips}
          labels={shelfLabels}
          onPackPress={openPackById}
          onThemePress={openThemeById}
          t={t}
        />
      )}

      {hubSegmentTabs}

      {cloudCommunityEnabled ? (
        hubPackSegment === 'mine' ? (
          <View
            style={{
              width: hubBarW,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: GAP,
              justifyContent: 'flex-start',
            }}
          >
            {renderHubCategoryTiles()}
            {renderTrainingTile()}
            {renderAudioTile()}
            {renderArenaTile()}
            {isCollectiblesEnabled() && renderCollectionTile()}
            {renderPackTiles(mineTabPacksOnlyOwned, isPackInMineOwned, false)}
          </View>
        ) : hubPackSegment === 'showcase' ? (
          <View
            style={{
              width: hubBarW,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: GAP,
              justifyContent: 'flex-start',
            }}
          >
            {renderPackTiles(showcaseTabPacks, (p) => ownedPackIds.includes(p.id), false)}
          </View>
        ) : (
          <View style={{ width: hubBarW }}>
            {hasUnfinishedPackDraft ? (
              <DuoPressable
                onPress={() => router.push('/community_pack_create' as any)}
                edgeColor={t.accent}
                wrapStyle={{ width: hubBarW, marginBottom: 10 }}
                style={{
                  width: hubBarW,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 0,
                  borderColor: 'transparent',
                  backgroundColor: isGradientSurface ? t.bgCard : `${t.accent}1A`,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="document-text-outline" size={20} color={t.accent} />
                <Text style={{ color: isGradientSurface ? t.textPrimary : t.accent, fontWeight: '800', fontSize: labelSize + 2 }}>
                  {triLang(lang, {
                    ru: 'Продолжить создание набора',
                    uk: 'Продовжити створення набору',
                    es: 'Seguir creando el pack',
                    'pt-BR': 'Continuar criando o pacote',
                    vi: 'Tiếp tục tạo bộ thẻ',
                    id: 'Lanjut membuat paket',
                    tr: 'Paketi oluşturmaya devam et',
                    pl: 'Kontynuuj tworzenie zestawu',
                  })}
                </Text>
              </DuoPressable>
            ) : null}
            <DuoPressable
              onPress={() => {
                if (hasUnfinishedPackDraft) {
                  setDiscardDraftForNewOpen(true);
                  return;
                }
                router.push('/community_pack_create' as any);
              }}
              edgeColor={t.accent}
              wrapStyle={{ width: hubBarW, marginBottom: 12 }}
              style={{
                width: hubBarW,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: t.accent,
              }}
            >
              <Text style={{ color: t.correctText, fontWeight: '800', fontSize: labelSize + 2 }}>
                {triLang(lang, { ru: '+ Создать набор', uk: '+ Створити набір', es: '+ Crear pack', 'pt-BR': '+ Criar pacote', vi: '+ Tạo bộ thẻ', id: '+ Buat paket', tr: '+ Paket oluştur', pl: '+ Utwórz zestaw' })}
              </Text>
            </DuoPressable>
            {visibleCommunityPacks.length === 0 ? (
              communityPacks.length === 0 ? (
                <Text style={{ width: hubBarW, color: isGradientSurface ? hubLabelMuted : t.textMuted, fontSize: labelSize + 2, textAlign: 'center', marginBottom: 8 }}>
                  {triLang(lang, {
                    ru: 'Создай свой набор и опубликуй его для других пользователей. После модерации его увидят все.',
                    uk: 'Ви можете створити власний набір і опублікувати його для інших користувачів. Після модерації його зможуть побачити всі користувачі.',
                    es: 'Puedes crear tu propio pack y publicarlo para otros usuarios. Tras la moderación, todos los usuarios podrán verlo.',
                    'pt-BR': 'Você pode criar seu próprio pacote e publicá-lo para outros usuários. Após a moderação, todos os usuários poderão vê-lo.',
                    vi: 'Bạn có thể tạo bộ thẻ riêng và đăng cho người dùng khác. Sau khi kiểm duyệt, mọi người dùng đều có thể thấy bộ thẻ đó.',
                    id: 'Kamu bisa membuat paket sendiri dan menerbitkannya untuk pengguna lain. Setelah moderasi, semua pengguna dapat melihatnya.',
                    tr: 'Kendi paketini oluşturup diğer kullanıcılar için yayımlayabilirsin. Moderasyondan sonra tüm kullanıcılar görebilir.',
                    pl: 'Możesz utworzyć własny zestaw i opublikować go dla innych użytkowników. Po moderacji zobaczą go wszyscy użytkownicy.',
                  })}
                </Text>
              ) : null
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                {renderPackTiles(visibleCommunityPacks, isCommunityPackMine, true)}
              </View>
            )}
          </View>
        )
      ) : (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: GAP,
            justifyContent: 'flex-start',
          }}
        >
          {renderHubCategoryTiles()}
          {renderTrainingTile()}
          {renderAudioTile()}
          {isCollectiblesEnabled() && renderCollectionTile()}
          {renderPackTiles(marketPacks, (p) => ownedPackIds.includes(p.id), false)}
        </View>
      )}
      <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 8, width: '100%' }}>
        <ReportErrorButton
          screen="flashcards_hub"
          dataId="flashcards_hub_main"
          dataText={triLang(lang, {
            ru: 'Карточки: категории и пакеты',
            uk: 'Картки: категорії та пакети',
            es: 'Tarjetas: categorías y packs',
            'pt-BR': 'Cartões: categorias e pacotes',
            vi: 'Thẻ: danh mục và bộ thẻ',
            id: 'Kartu: kategori dan paket',
            tr: 'Kartlar: kategoriler ve paketler',
            pl: 'Karty: kategorie i zestawy',
          })}
        />
      </View>
      <ThemedConfirmModal
        visible={discardDraftForNewOpen}
        title={triLang(lang, { ru: 'Новый набор', uk: 'Новий набір', es: 'Nuevo pack', 'pt-BR': 'Novo pacote', vi: 'Bộ thẻ mới', id: 'Paket baru', tr: 'Yeni paket', pl: 'Nowy zestaw' })}
        message={triLang(lang, {
          ru: 'Черновик на устройстве будет удалён. Продолжить?',
          uk: 'Чернетку на пристрої буде видалено. Продовжити?',
          es: 'Se borrará el borrador en el dispositivo. ¿Continuar?',
          'pt-BR': 'O rascunho no dispositivo será excluído. Continuar?',
          vi: 'Bản nháp trên thiết bị sẽ bị xóa. Tiếp tục?',
          id: 'Draf di perangkat akan dihapus. Lanjutkan?',
          tr: 'Cihazdaki taslak silinecek. Devam edilsin mi?',
          pl: 'Szkic na urządzeniu zostanie usunięty. Kontynuować?',
        })}
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
        confirmLabel={triLang(lang, {
          ru: 'Удалить и создать новый',
          uk: 'Видалити й створити новий',
          es: 'Eliminar y crear otro',
          'pt-BR': 'Excluir e criar novo',
          vi: 'Xóa và tạo mới',
          id: 'Hapus dan buat baru',
          tr: 'Sil ve yenisini oluştur',
          pl: 'Usuń i utwórz nowy',
        })}
        confirmVariant="default"
        onCancel={() => setDiscardDraftForNewOpen(false)}
        onConfirm={() => {
          setDiscardDraftForNewOpen(false);
          router.push({ pathname: '/community_pack_create', params: { fresh: '1' } } as any);
        }}
      />
      {reportModalPack ? (
        <ReportPackModal
          visible
          packId={reportModalPack.id}
          packTitle={packTitleForInterface(reportModalPack, lang)}
          authorStableId={reportModalPack.authorStableId ?? null}
          lang={lang}
          studyTarget={studyTarget}
          onClose={() => setReportModalPack(null)}
          onPackHiddenOnDevice={refreshHiddenCommunityPacks}
        />
      ) : null}
      {CardPackPaywallModalEl}
    </View>
  );
}
