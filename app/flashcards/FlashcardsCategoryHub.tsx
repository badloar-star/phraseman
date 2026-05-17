import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
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
import { categoriesForFlashcardsHub } from './constants';
import { packHubCodeName, packTitleForInterface, packCategoryIonIcon, type FlashcardMarketPack } from './marketplace';
import { useCardPackShardPaywall } from './useCardPackShardPaywall';

import { oskolokImageForPackShards } from '../oskolok';
import { actionToastTri, emitAppEvent } from '../events';
import { stageOwnedPackCardsForNavigation } from '../flashcards_collection';
import { hasMeaningfulCommunityPackCreateDraft } from '../community_packs/communityPackDraftStorage';
import { stageCommunityPackCardsForNavigation } from '../community_packs/staging';
import { bundledPackTilePng } from './packMarketplaceIcons';
import ReportErrorButton from '../../components/ReportErrorButton';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import ReportPackModal from '../../components/ReportPackModal';
import { hideCommunityPackOnDevice, loadHiddenCommunityPackIds } from '../community_packs/communityPackHiddenStorage';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import { hapticTap } from '../../hooks/use-haptics';

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);

type Props = {
  lang: Lang;
  t: Theme;
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

  useEffect(() => {
    if (reduceMotion) {
      ctaScale.value = 1;
      return;
    }
    ctaScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [reduceMotion, ctaScale]);

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
          borderWidth: 1,
          borderColor: t.border,
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
            borderWidth: 1,
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
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.22)',
              paddingVertical: 5,
              paddingHorizontal: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Image source={oskolokImageForPackShards(pack.priceShards)} style={{ width: 12, height: 12 }} contentFit="contain" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#F1F5F9', letterSpacing: 0.2 }}>
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
  marketPacks,
  ownedPackIds,
  shardBalance,
  onMarketRefresh,
  cloudCommunityEnabled = false,
  communityPacks = [],
  ownedCommunityPackIds = [],
  hubAuthorStableId = null,
  onTrainingPress,
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

  const refreshHiddenCommunityPacks = useCallback(async () => {
    const ids = await loadHiddenCommunityPackIds();
    setHiddenCommunityPackIds(new Set(ids));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const ok = await hasMeaningfulCommunityPackCreateDraft();
        if (!cancelled) setHasUnfinishedPackDraft(ok);
      })();
      void refreshHiddenCommunityPacks();
      return () => {
        cancelled = true;
      };
    }, [refreshHiddenCommunityPacks]),
  );

  const { openPaywall, CardPackPaywallModalEl } = useCardPackShardPaywall({
    balance: shardBalance,
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

  useEffect(() => {
    if (Platform.OS === 'web') {
      setReduceMotion(false);
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const openOwnedPack = async (pack: FlashcardMarketPack) => {
    setUgcReportHintPackId(null);
    if (pack.isCommunityUgc) {
      const ok = await stageCommunityPackCardsForNavigation(pack.id);
      if (!ok) {
        emitAppEvent(
          'action_toast',
          actionToastTri('error', {
            ru: 'Не удалось загрузить карточки набора.',
            uk: 'Не вдалося завантажити картки набору.',
            es: 'No se pudieron cargar las tarjetas del pack.',
          }),
        );
        return;
      }
    } else {
      stageOwnedPackCardsForNavigation(pack.id);
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
          borderWidth: 1,
          borderColor: active ? t.accent : tabOffBorder,
          backgroundColor: active ? tabOnBg : tabOffBg,
        }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
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
      const packTileLabel =
        pack.isCommunityUgc && displayTitle.trim().length > 0 ? displayTitle.trim() : hubCode;
      const ion = packCategoryIonIcon(pack.category) as any;
      const packPng = bundledPackTilePng(pack.id);
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
          {...(!reduceMotion ? { entering: enteringForIndex(i) } : {})}
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
                <View
                  style={[
                    {
                      width: tileW,
                      height: tileW,
                      borderRadius: TILE_RADIUS,
                      borderWidth: 1.5,
                      borderColor: t.accent,
                      backgroundColor: t.bgSurface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                      position: 'relative',
                    },
                    shadowForTile(t, 'owned'),
                  ]}
                >
                  {packPng ? (
                    <Image source={packPng} style={{ width: packTileIconSize, height: packTileIconSize }} contentFit="contain" />
                  ) : (
                    <Ionicons name={ion} size={packTileIconSize} color={t.textPrimary} />
                  )}
                </View>
              ) : (
                <UnownedMarketPackCard
                  t={t}
                  tileW={tileW}
                  pack={pack}
                  iconSize={Math.min(packTileIconSize, Math.floor(tileW * 0.76))}
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
                    await hideCommunityPackOnDevice(pack.id);
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
            <Text style={{ fontSize: 9, color: isGradientSurface ? hubLabelAccent : t.accent, fontWeight: '800', marginTop: 3, textAlign: 'center' }}>
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
          {...(!reduceMotion ? { entering: enteringForIndex(i) } : {})}
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
            <View
              style={[
                {
                  width: tileW,
                  height: tileW,
                  borderRadius: TILE_RADIUS,
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: t.bgSurface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                },
                shadowForTile(t, 'base'),
              ]}
            >
              <Ionicons name={cat.icon as any} size={iconSize} color={t.textPrimary} />
            </View>
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
        {...(!reduceMotion ? { entering: enteringForIndex(i) } : {})}
        style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}
      >
        <HubTileShell
          testID="flashcards-hub-tile-training"
          a11y="qa-flashcards-hub-tile-training"
          width={tileW}
          reduceMotion={reduceMotion}
          onPress={onTrainingPress}
        >
          <View
            style={[
              {
                width: tileW,
                height: tileW,
                borderRadius: TILE_RADIUS,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.bgSurface,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              },
              shadowForTile(t, 'base'),
            ]}
          >
            <Ionicons name="play-circle-outline" size={iconSize} color={t.textPrimary} />
          </View>
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
              <TouchableOpacity
                onPress={() => router.push('/community_pack_create' as any)}
                style={{
                  width: hubBarW,
                  marginBottom: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: t.accent,
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
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => {
                if (hasUnfinishedPackDraft) {
                  setDiscardDraftForNewOpen(true);
                  return;
                }
                router.push('/community_pack_create' as any);
              }}
              style={{
                width: hubBarW,
                marginBottom: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: t.accent,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: t.correctText, fontWeight: '800', fontSize: labelSize + 2 }}>
                {triLang(lang, { ru: '+ Создать набор', uk: '+ Створити набір', es: '+ Crear pack', 'pt-BR': '+ Criar pacote', vi: '+ Tạo bộ thẻ', id: '+ Buat paket', tr: '+ Paket oluştur', pl: '+ Utwórz zestaw' })}
              </Text>
            </TouchableOpacity>
            {visibleCommunityPacks.length === 0 ? (
              communityPacks.length === 0 ? (
                <Text style={{ color: isGradientSurface ? hubLabelMuted : t.textMuted, fontSize: labelSize + 2, marginBottom: 8 }}>
                  {triLang(lang, {
                    ru: 'Здесь появятся наборы после публикации и модерации.',
                    uk: 'Тут з\'являться набори після публікації та модерації.',
                    es: 'Aquí verás packs tras publicarlos y moderarlos.',
                    'pt-BR': 'Os pacotes aparecerão aqui após publicação e moderação.',
                    vi: 'Các bộ thẻ sẽ xuất hiện ở đây sau khi đăng và kiểm duyệt.',
                    id: 'Paket akan muncul di sini setelah dipublikasikan dan dimoderasi.',
                    tr: 'Paketler yayınlanıp incelendikten sonra burada görünür.',
                    pl: 'Zestawy pojawią się tutaj po publikacji i moderacji.',
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
          onClose={() => setReportModalPack(null)}
          onPackHiddenOnDevice={refreshHiddenCommunityPacks}
        />
      ) : null}
      {CardPackPaywallModalEl}
    </View>
  );
}
