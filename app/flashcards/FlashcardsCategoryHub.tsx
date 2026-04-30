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
import type { Theme } from '../../constants/theme';
import { categoriesForFlashcardsHub } from './constants';
import { packHubCodeName, packTitleForInterface, packCategoryIonIcon, type FlashcardMarketPack } from './marketplace';
import { useCardPackShardPaywall } from './useCardPackShardPaywall';

import { oskolokImageForPackShards } from '../oskolok';
import { actionToastTri, emitAppEvent } from '../events';
import { stageOwnedPackCardsForNavigation } from '../flashcards_collection';
import { hasMeaningfulCommunityPackCreateDraft } from '../community_packs/communityPackDraftStorage';
import { stageCommunityPackCardsForNavigation } from '../community_packs/staging';
import { bundledPackTilePng } from './packMarketplaceIcons';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);

type Props = {
  lang: Lang;
  t: Theme;
  marketPacks: FlashcardMarketPack[];
  ownedPackIds: string[];
  shardBalance: number;
  onMarketRefresh: () => void | Promise<void>;
  /** Вкладки «Мої / Спільнота» + UGC-каталог (без Expo Go, з cloud). */
  cloudCommunityEnabled?: boolean;
  communityPacks?: FlashcardMarketPack[];
  ownedCommunityPackIds?: string[];
  /** Stable id автора — кнопка «редагувати» на своїх UGC. */
  hubAuthorStableId?: string | null;
};

const COLS = 3;
const GAP = 10;
const H_PAD = 16;
const TILE_RADIUS = 18;
const STAGGER_MS = 42;
const STAGGER_CAP = 14;
const ENTRANCE_DURATION = 400;

const enteringForIndex = (i: number) =>
  FadeInDown.duration(ENTRANCE_DURATION)
    .delay(Math.min(i, STAGGER_CAP) * STAGGER_MS)
    .easing(Easing.out(Easing.cubic));

const SPRING_CFG = { damping: 16, stiffness: 420, mass: 0.35 } as const;

function shadowForTile(t: Theme, kind: 'base' | 'owned' | 'shop'): ViewStyle {
  if (Platform.OS === 'web') {
    return {};
  }
  if (Platform.OS === 'android') {
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
  disabled?: boolean;
  reduceMotion: boolean;
  width: number;
  children: React.ReactNode;
};

/** Пружина на нажатии — як у в polished apps (scale ~0,96). */
function HubTileShell({ testID, a11y, onPress, disabled, reduceMotion, width, children }: HubTileShellProps) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <ReanimatedPressable
      testID={testID}
      accessibilityLabel={a11y}
      accessible
      onPress={onPress}
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

/** Картка магазину: глянець, м’якший CTA, «живі» деталі. */
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
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.35,
                shadowRadius: 2,
              },
              android: { elevation: 2 },
            }),
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
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(24,34,58,0.95)', 'rgba(33,48,80,0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: `${t.accent}55`,
              paddingVertical: 5,
              paddingHorizontal: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Image source={oskolokImageForPackShards(pack.priceShards)} style={{ width: 12, height: 12 }} contentFit="contain" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: t.textSecond, letterSpacing: 0.2 }}>
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
}: Props) {
  const router = useRouter();
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hubPackSegment, setHubPackSegment] = useState<'mine' | 'community'>('mine');
  const [hasUnfinishedPackDraft, setHasUnfinishedPackDraft] = useState(false);
  const [discardDraftForNewOpen, setDiscardDraftForNewOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const ok = await hasMeaningfulCommunityPackCreateDraft();
        if (!cancelled) setHasUnfinishedPackDraft(ok);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const { openPaywall, CardPackPaywallModalEl } = useCardPackShardPaywall({
    balance: shardBalance,
    lang,
    router,
    onAfterPurchase: onMarketRefresh,
    onPurchaseStart: (id) => setBuyingPackId(id),
    onPurchaseEnd: () => setBuyingPackId(null),
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

  /** Вкладка «Мои»: сохраняем порядок каталога, после покупки меняется только статус плитки. */
  const mineMergedPacks = useMemo(() => {
    const catalogOrdered = [...marketPacks];
    const catalogIds = new Set(catalogOrdered.map((p) => p.id));
    const extraOwnedCommunity = communityPacks.filter(
      (p) => isCommunityPackMine(p) && !catalogIds.has(p.id),
    );
    return [...catalogOrdered, ...extraOwnedCommunity];
  }, [marketPacks, communityPacks, isCommunityPackMine]);

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
    color: owned ? t.textMuted : t.textPrimary,
    textAlign: 'center' as const,
    lineHeight: labelSize + 2,
  });

  const packCodeLabelStyle = (owned: boolean) => ({
    marginTop: 8,
    fontSize: labelSize,
    fontWeight: '600' as const,
    letterSpacing: 0.15,
    color: owned ? t.accent : t.textPrimary,
    textAlign: 'center' as const,
    lineHeight: labelSize + 2,
  });

  const hubBarW = winW - H_PAD * 2;

  const renderPackTiles = (packList: FlashcardMarketPack[], ownedFn: (pack: FlashcardMarketPack) => boolean) =>
    packList.map((pack) => {
      const owned = ownedFn(pack);
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
                  iconSize={packTileIconSize}
                  ion={ion}
                  packPng={packPng}
                  cardShadow={cardShadow}
                  reduceMotion={reduceMotion}
                />
              )}
            </View>
          </HubTileShell>
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
            <Text style={{ fontSize: 9, color: t.accent, fontWeight: '800', marginTop: 3, textAlign: 'center' }}>
              {triLang(lang, { ru: 'На модерации', uk: 'На модерації', es: 'En moderación' })}
            </Text>
          ) : null}
          {pack.isCommunityUgc && pack.ratingCount > 0 ? (
            <Text style={{ fontSize: 9, color: t.textMuted, marginTop: 2, textAlign: 'center', fontWeight: '700' }}>
              ★ {pack.ratingAvg.toFixed(1)} ({pack.ratingCount})
            </Text>
          ) : null}
        </Reanimated.View>
      );
    });

  const renderHubCategoryTiles = () =>
    hubCategories.map((cat) => {
      const label = triLang(lang, { ru: cat.labelRU, uk: cat.labelUK, es: cat.labelES });
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

  const hubSegmentTabs = cloudCommunityEnabled ? (
    <View
      style={{
        width: hubBarW,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 14,
      }}
    >
      <TouchableOpacity
        onPress={() => setHubPackSegment('mine')}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: hubPackSegment === 'mine' ? t.accent : t.border,
          backgroundColor: hubPackSegment === 'mine' ? `${t.accent}22` : t.bgSurface,
        }}
      >
        <Text style={{ color: hubPackSegment === 'mine' ? t.accent : t.textSecond, fontWeight: '800', fontSize: labelSize + 1 }}>
          {triLang(lang, { ru: 'Мои', uk: 'Мої', es: 'Mis' })}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setHubPackSegment('community')}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: hubPackSegment === 'community' ? t.accent : t.border,
          backgroundColor: hubPackSegment === 'community' ? `${t.accent}22` : t.bgSurface,
        }}
      >
        <Text
          style={{
            color: hubPackSegment === 'community' ? t.accent : t.textSecond,
            fontWeight: '800',
            fontSize: labelSize + 1,
          }}
        >
          {triLang(lang, { ru: 'Сообщество', uk: 'Спільнота', es: 'Comunidad' })}
        </Text>
      </TouchableOpacity>
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
            {renderPackTiles(mineMergedPacks, isPackInMineOwned)}
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
                  backgroundColor: `${t.accent}1A`,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="document-text-outline" size={20} color={t.accent} />
                <Text style={{ color: t.accent, fontWeight: '800', fontSize: labelSize + 2 }}>
                  {triLang(lang, {
                    ru: 'Продолжить создание набора',
                    uk: 'Продовжити створення набору',
                    es: 'Seguir creando el pack',
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
                {triLang(lang, { ru: '+ Создать набор', uk: '+ Створити набір', es: '+ Crear pack' })}
              </Text>
            </TouchableOpacity>
            {communityPacks.length === 0 ? (
              <Text style={{ color: t.textMuted, fontSize: labelSize + 2, marginBottom: 8 }}>
                {triLang(lang, {
                  ru: 'Здесь появятся наборы после публикации и модерации.',
                  uk: 'Тут з\'являться набори після публікації та модерації.',
                  es: 'Aquí verás packs tras publicarlos y moderarlos.',
                })}
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                {renderPackTiles(communityPacks, isCommunityPackMine)}
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
          {renderPackTiles(marketPacks, (p) => ownedPackIds.includes(p.id))}
        </View>
      )}
      <ThemedConfirmModal
        visible={discardDraftForNewOpen}
        title={triLang(lang, { ru: 'Новый набор', uk: 'Новий набір', es: 'Nuevo pack' })}
        message={triLang(lang, {
          ru: 'Черновик на устройстве будет удалён. Продолжить?',
          uk: 'Чернетку на пристрої буде видалено. Продовжити?',
          es: 'Se borrará el borrador en el dispositivo. ¿Continuar?',
        })}
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={triLang(lang, {
          ru: 'Удалить и создать новый',
          uk: 'Видалити й створити новий',
          es: 'Eliminar y crear otro',
        })}
        confirmVariant="default"
        onCancel={() => setDiscardDraftForNewOpen(false)}
        onConfirm={() => {
          setDiscardDraftForNewOpen(false);
          router.push({ pathname: '/community_pack_create', params: { fresh: '1' } } as any);
        }}
      />
      {CardPackPaywallModalEl}
    </View>
  );
}
