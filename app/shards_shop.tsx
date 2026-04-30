import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnim,
  BackHandler,
  type DimensionValue,
  LayoutChangeEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { ThemeMode } from '../constants/theme';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, getVolumetricShadow } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useScreen } from '../hooks/use-screen';
import { bundleLang } from '../constants/i18n';
import { BRAND_SHARDS_ES } from '../constants/terms_es';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import PressableScale from '../components/PressableScale';
import { addShardsRaw, getShardsBalance, peekLastKnownShardsBalance } from './shards_system';
import { SHARDS_PACKS, totalShardsFromPack, type ShardsPack } from './shards_shop_catalog';
import {
  getWarmShardsPackagesMap,
  isCompleteShardsPackageMap,
  loadShardsPriceCache,
  loadShardsShopPackagesMap,
  peekShardsPriceCacheSync,
  type ShardsPriceCache,
} from './shards_shop_cache';
import {
  fallbackBundledMarketPacks,
  loadAccessiblePackIds,
  loadMarketplacePacks,
  packCategoryIonIcon,
  packDescriptionForInterface,
  packTitleForInterface,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import { bundledPackTilePng } from './flashcards/packMarketplaceIcons';
import { getPackGiftTrial, getPackTrialHoursLeft } from './flashcards/pack_trial_gift';
import { useCardPackShardPaywall } from './flashcards/useCardPackShardPaywall';
import { DEV_IAP_BYPASS, IS_EXPO_GO } from './config';
import { emitAppEvent, onAppEvent } from './events';
import { logShardsPurchased } from './firebase';
import { oskolokImageForPackShards, oskolokImageForShardIapRow } from './oskolok';
import {
  trackCardPackClick,
  trackShardPackClick,
  trackShardPackPurchase,
  trackShardsShopOpen,
} from './user_stats';

/** Реліз-збірка: false → Purchases.purchasePackage і системний діалог Google Play, без миттєвого DEV-нарахування. */
const isDevStoreBypass = __DEV__ || DEV_IAP_BYPASS || IS_EXPO_GO;

/** Teal / cyan в стилі «осколків» на paywall-референсі */
const SHARD_TEAL = '#2EC4B6';
const SHARD_TEAL_DIM = 'rgba(46,196,182,0.35)';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function isPaywallAtmosphereMode(mode: ThemeMode): boolean {
  return mode === 'dark' || mode === 'neon' || mode === 'gold';
}

type Blob = {
  w: number;
  h: number;
  r: number;
  color: string;
  top?: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
  bottom?: DimensionValue;
};

function ShopParallaxBlobs({ themeMode }: { themeMode: ThemeMode }) {
  const p0 = useRef(new RNAnim.Value(0)).current;
  const p1 = useRef(new RNAnim.Value(0)).current;
  const p2 = useRef(new RNAnim.Value(0)).current;

  useEffect(() => {
    const m = (v: RNAnim.Value, d: number) =>
      RNAnim.loop(
        RNAnim.sequence([RNAnim.timing(v, { toValue: 1, duration: d, useNativeDriver: true }), RNAnim.timing(v, { toValue: 0, duration: d, useNativeDriver: true })]),
      );
    const a0 = m(p0, 10000);
    const a1 = m(p1, 13500);
    const a2 = m(p2, 11800);
    a0.start();
    a1.start();
    a2.start();
    return () => {
      a0.stop();
      a1.stop();
      a2.stop();
    };
  }, [p0, p1, p2]);

  const isDark = isPaywallAtmosphereMode(themeMode);
  const B: Blob[] = isDark
    ? [
        { w: 200, h: 200, r: 100, top: '4%' as const, left: '-10%' as const, color: 'rgba(75, 95, 55,0.32)' },
        { w: 170, h: 170, r: 85, top: '32%' as const, right: '-6%' as const, color: 'rgba(55, 70, 48,0.3)' },
        { w: 150, h: 150, r: 75, bottom: '6%' as const, left: '14%' as const, color: 'rgba(60, 78, 52,0.28)' },
      ]
    : [
        { w: 200, h: 200, r: 100, top: '4%' as const, left: '-10%' as const, color: 'rgba(0,118,192,0.12)' },
        { w: 170, h: 170, r: 85, top: '32%' as const, right: '-6%' as const, color: 'rgba(255,150,200,0.1)' },
        { w: 150, h: 150, r: 75, bottom: '6%' as const, left: '14%' as const, color: 'rgba(0,118,192,0.1)' },
      ];

  const s0 = p0.interpolate({ inputRange: [0, 1], outputRange: [-12, 22] });
  const s0y = p0.interpolate({ inputRange: [0, 1], outputRange: [6, -14] });
  const s1 = p1.interpolate({ inputRange: [0, 1], outputRange: [16, -18] });
  const s1y = p1.interpolate({ inputRange: [0, 1], outputRange: [-8, 14] });
  const s2 = p2.interpolate({ inputRange: [0, 1], outputRange: [-9, 14] });
  const s2y = p2.interpolate({ inputRange: [0, 1], outputRange: [8, -10] });

  const tr = [
    [{ translateX: s0 }, { translateY: s0y }],
    [{ translateX: s1 }, { translateY: s1y }],
    [{ translateX: s2 }, { translateY: s2y }],
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} collapsable={false}>
      {B.map((b, i) => (
        <RNAnim.View
          key={`blob_${i}`}
          style={[
            {
              position: 'absolute',
              top: b.top,
              left: b.left,
              right: b.right,
              bottom: b.bottom,
              width: b.w,
              height: b.h,
              borderRadius: b.r,
              backgroundColor: b.color,
            },
            { transform: tr[i]! },
          ]}
        />
      ))}
    </View>
  );
}

function PulsingShardFrame({
  width: fw,
  height: fh,
  big,
  children,
}: {
  width: number;
  height: number;
  borderRadius: number;
  big?: boolean;
  children: React.ReactNode;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [p]);
  const childScale = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(p.value, [0, 1], [1, big ? 1.05 : 1.06]) }],
  }));
  return (
    <View style={{ width: fw, height: fh, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={childScale}>{children}</Animated.View>
    </View>
  );
}

function HitBadgeShell({ children, style }: { children: React.ReactNode; style?: object }) {
  const hb = useSharedValue(0);
  useEffect(() => {
    hb.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [hb]);
  const beat = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(hb.value, [0, 1], [1, 1.08]) }],
  }));
  return (
    <Animated.View style={beat}>
      <View style={style}>{children}</View>
    </Animated.View>
  );
}

type ShopCtaProps = {
  accent: string;
  accentSoft: string;
  correctText: string;
  busy: boolean;
  label: string;
  useLockIcon: boolean;
  shadow: object;
  fontSize: number;
};

function ShopNeonCta({ accent, accentSoft, correctText, busy, label, useLockIcon, shadow, fontSize }: ShopCtaProps) {
  const ctaW = useSharedValue(0);
  const sh = useSharedValue(0);
  const [boxW, setBoxW] = useState(0);

  const lastShBoxW = useRef(0);
  useEffect(() => {
    if (boxW < 8) return;
    if (Math.abs(lastShBoxW.current - boxW) < 2 && lastShBoxW.current > 0) return;
    lastShBoxW.current = boxW;
    sh.value = 0;
    sh.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [boxW, sh]);

  const onLayoutCta = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    // Игнорируем дрожание ширины на 1px при скролле/layout — иначе сбрасывается блик кнопки
    setBoxW((prev) => (prev > 0 && Math.abs(prev - w) < 2 ? prev : w));
    ctaW.value = w;
  };

  const stripStyle = useAnimatedStyle(() => {
    const wv = ctaW.value;
    if (wv < 1) return { transform: [{ translateX: 0 }], opacity: 0 };
    return {
      transform: [{ translateX: interpolate(sh.value, [0, 1], [-wv * 0.5, wv * 1.2]) }],
      opacity: interpolate(sh.value, [0, 0.1, 0.9, 1], [0, 0.78, 0.72, 0]),
    };
  });

  return (
    <View
      onLayout={onLayoutCta}
      style={{
        alignSelf: 'stretch',
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: accent,
        ...shadow,
      }}
    >
      <LinearGradient
        colors={[accentSoft, accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
        paddingVertical: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        opacity: busy ? 0.88 : 1,
      }}
    >
        {busy ? (
          <>
            <ActivityIndicator color={correctText} size="small" />
            {label ? <Text style={{ color: correctText, fontSize, fontWeight: '900' }}>{label}</Text> : null}
          </>
        ) : (
          <>
            {useLockIcon ? (
              <Ionicons name="lock-closed" size={18} color={correctText} />
            ) : (
              <Ionicons name="bag-handle" size={18} color={correctText} />
            )}
            <Text style={{ color: correctText, fontSize, fontWeight: '900' }}>{label}</Text>
          </>
        )}
      </LinearGradient>
      {!busy && boxW > 0 ? (
        <View
          style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
          pointerEvents="none"
        >
          <AnimatedLinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: Math.max(72, boxW * 0.35),
                left: 0,
              },
              stripStyle,
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

function savingsVsStarterFromStore(
  pack: ShardsPack,
  map: Record<string, PurchasesPackage>,
): number | null {
  const starter = SHARDS_PACKS[0];
  if (pack.productId === starter.productId) return null;
  const baseP = map[starter.productId]?.product;
  const curP = map[pack.productId]?.product;
  const basePrice = baseP?.price;
  const curPrice = curP?.price;
  if (
    basePrice == null ||
    curPrice == null ||
    !Number.isFinite(basePrice) ||
    !Number.isFinite(curPrice) ||
    basePrice <= 0
  ) {
    return null;
  }
  const basePerShard = basePrice / totalShardsFromPack(starter);
  const curPerShard = curPrice / totalShardsFromPack(pack);
  if (!Number.isFinite(basePerShard) || !Number.isFinite(curPerShard) || curPerShard <= 0) return null;
  return Math.max(0, Math.round((1 - curPerShard / basePerShard) * 100));
}

export default function ShardsShopScreen() {
  const router = useRouter();
  const { theme: t, f, isDark, themeMode, statusBarLight } = useTheme();
  const { width: winW, contentMaxW, insets } = useScreen();
  const { lang } = useLang();
  const lb = bundleLang(lang);
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const shardsEsLc = BRAND_SHARDS_ES.toLowerCase();
  const params = useLocalSearchParams<{ need?: string; source?: string; tab?: string }>();
  /** Снимок нехватки из маршрута; сам по себе не обновляется после покупки. */
  const needFromRoute = useMemo(() => {
    const n = Number(params.need || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [params.need]);
  const lastNeedParamKeyRef = useRef<string | null>(null);
  /** Баланс при первом зчитуванні після відкриття з цим `need` — щоб показати залишок після покупки. */
  const shopEntryBalanceRef = useRef<number | null>(null);
  type ShopTab = 'catalog' | 'paid';
  const [shopTab, setShopTab] = useState<ShopTab>(() =>
    params.tab === 'paid' || params.tab === 'cards' ? 'paid' : 'catalog',
  );
  const [balance, setBalance] = useState(() => peekLastKnownShardsBalance() ?? 0);
  const [packTrialHours, setPackTrialHours] = useState<number | null>(null);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  const [packagesByProductId, setPackagesByProductId] = useState<Record<string, PurchasesPackage>>(() => getWarmShardsPackagesMap() ?? {});
  /** Завершён getOfferings (успех или нет) — кнопки/подсказки, не мешаем с кэшем с диска. */
  const [storeChecked, setStoreChecked] = useState(
    () => isDevStoreBypass || isCompleteShardsPackageMap(getWarmShardsPackagesMap() ?? undefined),
  );
  const [pricesFromDisk, setPricesFromDisk] = useState<ShardsPriceCache>(() => peekShardsPriceCacheSync());
  const [marketPacks, setMarketPacks] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks() ?? fallbackBundledMarketPacks(),
  );
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  /** true только при первом запросе списка наборов (вкладка «Карточки»); вкладка «Осколки» не ждёт этот сетевой round-trip. */
  const [cardMarketLoading, setCardMarketLoading] = useState(false);
  const [buyingShardPackId, setBuyingShardPackId] = useState<string | null>(null);
  const cardMarketFetchedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace('/(tabs)/home' as any);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [router]),
  );

  const cardShadow = useMemo(() => getVolumetricShadow(themeMode, t, 2), [themeMode, t]);

  /** Явная ширина: в ScrollView на Android «100%»/stretch иногда даёт разную ширину строк по контенту. */
  const packCardWidth = useMemo(() => {
    const safeInner = winW - insets.left - insets.right;
    const column = Math.min(safeInner, contentMaxW);
    const scrollPad = 32; // contentContainerStyle paddingHorizontal 16+16
    return Math.max(280, Math.floor(column - scrollPad));
  }, [winW, contentMaxW, insets.left, insets.right]);

  const refreshBalance = useCallback(async () => {
    const next = await getShardsBalance();
    setBalance(next);
  }, []);

  const refreshPackTrial = useCallback(async () => {
    const tr = await getPackGiftTrial();
    setPackTrialHours(tr ? getPackTrialHoursLeft(tr.expiresAt) : null);
  }, []);

  useEffect(() => {
    const key = params.need == null || params.need === '' ? '' : String(params.need);
    if (lastNeedParamKeyRef.current !== key) {
      lastNeedParamKeyRef.current = key;
      shopEntryBalanceRef.current = null;
    }
  }, [params.need]);

  /** Стабильный отпечаток списка наборов: setState только при реальной смене содержимого. */
  const computeMarketFingerprint = (packs: FlashcardMarketPack[]): string =>
    packs
      .map((p) => `${p.id}:${p.priceShards}:${p.cardCount}:${p.updatedAt}:${p.listingStatus ?? ''}`)
      .join('|');
  const marketPacksFingerprintRef = useRef<string>(computeMarketFingerprint(marketPacks));
  const ownedFingerprintRef = useRef<string>('');
  /** 30s throttle на Firestore-обновления (force=true для after-purchase refresh). */
  const lastCardMarketFetchRef = useRef<number>(0);

  const loadCardMarket = useCallback(async (opts?: { background?: boolean; force?: boolean }) => {
    const now = Date.now();
    if (!opts?.force && now - lastCardMarketFetchRef.current < 30_000 && cardMarketFetchedOnce.current) return;
    lastCardMarketFetchRef.current = now;

    const hasBundledCatalog = fallbackBundledMarketPacks().length > 0;
    /** Якщо в бандлі вже є каталог — не ховаємо список за спінером під час Firestore. */
    const background = opts?.background === true || hasBundledCatalog;
    if (!background) setCardMarketLoading(true);
    try {
      const [packsRes, ownedRes] = await Promise.allSettled([loadMarketplacePacks(), loadAccessiblePackIds()]);
      const packsRaw = packsRes.status === 'fulfilled' ? packsRes.value : fallbackBundledMarketPacks();
      const packs = packsRaw.length > 0 ? packsRaw : fallbackBundledMarketPacks();
      const owned = ownedRes.status === 'fulfilled' ? ownedRes.value : [];

      const nextFp = computeMarketFingerprint(packs);
      if (nextFp !== marketPacksFingerprintRef.current) {
        marketPacksFingerprintRef.current = nextFp;
        setMarketPacks(packs);
      }
      const nextOwnedFp = [...owned].sort().join('|');
      if (nextOwnedFp !== ownedFingerprintRef.current) {
        ownedFingerprintRef.current = nextOwnedFp;
        setOwnedPackIds(owned);
      }
      cardMarketFetchedOnce.current = true;
    } catch {
      const fb = fallbackBundledMarketPacks();
      const nextFp = computeMarketFingerprint(fb);
      if (nextFp !== marketPacksFingerprintRef.current) {
        marketPacksFingerprintRef.current = nextFp;
        setMarketPacks(fb);
      }
    } finally {
      if (!background) setCardMarketLoading(false);
    }
  }, []);

  const syncAfterStoreAction = useCallback(async () => {
    await refreshBalance();
    if (shopTab === 'paid' || cardMarketFetchedOnce.current) {
      await loadCardMarket({ background: true, force: true });
    }
  }, [refreshBalance, loadCardMarket, shopTab]);

  /** Активний 48-год ваучер: на вкладці «Картки» ціни замінюються іконкою подарка, paywall відкривається в voucher-режимі. */
  const hasActiveVoucher = packTrialHours != null && packTrialHours > 0;

  const { openPaywall: openCardPackPaywall, CardPackPaywallModalEl: cardPackPaywallModal } = useCardPackShardPaywall({
    balance,
    hasVoucher: hasActiveVoucher,
    lang: lb,
    router,
    onAfterPurchase: syncAfterStoreAction,
    onPurchaseStart: (id) => setBuyingShardPackId(id),
    onPurchaseEnd: () => setBuyingShardPackId(null),
  });

  useFocusEffect(
    useCallback(() => {
      void trackShardsShopOpen().catch(() => {});
      void refreshPackTrial();
      let cancelled = false;
      void (async () => {
        const next = await getShardsBalance();
        if (cancelled) return;
        setBalance(next);
        if (shopEntryBalanceRef.current === null && needFromRoute > 0) {
          shopEntryBalanceRef.current = next;
        }
      })();
      // Повторный визит на экран: тихо обновляем список наборов; первый fetch только из useEffect ниже.
      if (shopTab === 'paid' && cardMarketFetchedOnce.current) {
        void loadCardMarket({ background: true });
      }
      return () => {
        cancelled = true;
      };
    }, [loadCardMarket, shopTab, needFromRoute, refreshPackTrial]),
  );

  useEffect(() => {
    if (packTrialHours == null || packTrialHours <= 0) return;
    const id = setInterval(() => { void refreshPackTrial(); }, 60_000);
    return () => clearInterval(id);
  }, [packTrialHours, refreshPackTrial]);

  useEffect(() => {
    const sub = onAppEvent('pack_trial_gift_set', () => { void refreshPackTrial(); });
    return () => sub.remove();
  }, [refreshPackTrial]);

  useEffect(() => {
    // Ваучер «згорів» (його використали для покупки набору) — миттєво оновити UI:
    // ціни на вкладці «Картки» повертаються з gift-іконки на осколки.
    const sub = onAppEvent('pack_trial_gift_consumed', () => { void refreshPackTrial(); });
    return () => sub.remove();
  }, [refreshPackTrial]);

  useEffect(() => {
    if (shopTab === 'paid') {
      void loadCardMarket({ background: cardMarketFetchedOnce.current });
    }
  }, [shopTab, loadCardMarket]);

  useEffect(() => {
    if (params.tab === 'paid' || params.tab === 'cards') setShopTab('paid');
    else if (params.tab === 'catalog' || params.tab === 'shards') setShopTab('catalog');
  }, [params.tab]);

  /**
   * Без entrance-анимации при смене вкладок: контент сразу видим (opacity=1, без translateY).
   * Раньше каждый tab-switch сбрасывал opacity всех карточек в 0 → мигание.
   */
  const heroEnt = useRef(new RNAnim.Value(1)).current;
  const shardRowEnt = useRef(SHARDS_PACKS.map(() => new RNAnim.Value(1))).current;
  const paidListEnt = useRef(new RNAnim.Value(1)).current;

  useEffect(() => {
    if (isDevStoreBypass) return;
    // initial state уже взят из peekShardsPriceCacheSync — обновляемся в фоне без флэша.
    let m = true;
    void loadShardsPriceCache().then((c) => {
      if (!m) return;
      // setState только если реально что-то изменилось (избегаем ре-рендера всего экрана).
      const sameKeys =
        Object.keys(c).length === Object.keys(pricesFromDisk).length &&
        Object.keys(c).every((k) => pricesFromDisk[k]?.priceString === c[k]?.priceString);
      if (!sameKeys) setPricesFromDisk(c);
    });
    return () => { m = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAnyPriceFromDisk = useMemo(
    () => SHARDS_PACKS.some((p) => !!pricesFromDisk[p.productId]?.priceString),
    [pricesFromDisk],
  );

  const allPacksHavePackages = useMemo(
    () => isDevStoreBypass || SHARDS_PACKS.every((pack) => !!packagesByProductId[pack.productId]),
    [isDevStoreBypass, packagesByProductId],
  );

  useEffect(() => {
    let mounted = true;
    const loadStoreProducts = async () => {
      if (isDevStoreBypass) {
        if (mounted) {
          setPackagesByProductId({});
          setStoreChecked(true);
        }
        return;
      }
      const map = await loadShardsShopPackagesMap();
      if (mounted) {
        setPackagesByProductId(map);
        setStoreChecked(true);
      }
    };
    void loadStoreProducts();
    return () => {
      mounted = false;
    };
  }, []);

  const heroTitle = isUK ? 'Осколки знань' : isES ? `${BRAND_SHARDS_ES} de conocimiento` : 'Осколки знаний';
  const heroSub = isUK
    ? 'Один пакет — більше дій: енергія, бонуси, клуб і швидкі покупки в застосунку.'
    : isES
      ? 'Un paquete, más acciones: energía, bonificaciones, club y compras rápidas en la app.'
      : 'Один пакет — больше действий: энергия, бонусы, клуб и быстрые покупки в приложении.';

  const remainingNeed = useMemo(() => {
    if (needFromRoute <= 0) return 0;
    const entry = shopEntryBalanceRef.current;
    const gainedSinceOpen = entry != null ? Math.max(0, balance - entry) : 0;
    return Math.max(0, needFromRoute - gainedSinceOpen);
  }, [needFromRoute, balance]);

  const needLine = useMemo(() => {
    if (remainingNeed <= 0) return null;
    return isUK
      ? `Не вистачає ще ${remainingNeed} осколків — обери пакет нижче.`
      : isES
        ? `Te faltan ${remainingNeed} ${shardsEsLc} — elige un paquete abajo.`
        : `Не хватает ещё ${remainingNeed} осколков — выбери пакет ниже.`;
  }, [isUK, isES, remainingNeed]);

  const paidListY = useMemo(
    () => paidListEnt.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
    [paidListEnt],
  );
  const heroY = useMemo(
    () => heroEnt.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
    [heroEnt],
  );

  const resolveTransactionKey = useCallback((customerInfo: any, productId: string): string | null => {
    const list = Array.isArray(customerInfo?.nonSubscriptionTransactions)
      ? customerInfo.nonSubscriptionTransactions
      : [];
    const matched = list
      .filter((tx: any) => tx?.productIdentifier === productId)
      .sort((a: any, b: any) => {
        const ta = Date.parse(a?.purchaseDate || '') || 0;
        const tb = Date.parse(b?.purchaseDate || '') || 0;
        return tb - ta;
      });
    const latest = matched[0];
    if (!latest) return null;
    return String(latest.transactionIdentifier || `${latest.productIdentifier}:${latest.purchaseDate || 'unknown'}`);
  }, []);

  const grantPurchasedShardsOnce = useCallback(async (productId: string, shards: number, customerInfo?: any): Promise<boolean> => {
    const txKey = resolveTransactionKey(customerInfo, productId) ?? `${productId}:fallback`;
    const storageKey = `shards_purchase_granted:${txKey}`;
    const already = await AsyncStorage.getItem(storageKey);
    if (already === '1') return false;
    await addShardsRaw(shards, 'shards_store_purchase');
    await AsyncStorage.setItem(storageKey, '1');
    return true;
  }, [resolveTransactionKey]);

  const buyPack = useCallback(
    async (packId: string, productId: string, shards: number) => {
      if (processingPackId) return;
      setProcessingPackId(packId);
      try {
        if (isDevStoreBypass) {
          await addShardsRaw(shards, 'shards_store_purchase');
          void trackShardPackPurchase(packId).catch(() => {});
          await syncAfterStoreAction();
          emitAppEvent('shards_balance_updated', { balance: await getShardsBalance() });
          emitAppEvent('action_toast', {
            type: 'success',
            messageRu: `DEV: начислено ${shards} осколков.`,
            messageUk: `DEV: нараховано ${shards} осколків.`,
            messageEs: `DEV: se añadieron ${shards} ${BRAND_SHARDS_ES.toLowerCase()}.`,
          });
          return;
        }
        const pkg = packagesByProductId[productId];
        if (!pkg) {
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Магазин недоступен. Проверьте Offering «shards» в RevenueCat.',
            messageUk: 'Магазин недоступний. Перевірте Offering «shards» у RevenueCat.',
            messageEs:
              'Tienda no disponible. Revisa la oferta «shards» en RevenueCat.',
          });
          return;
        }
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const granted = await grantPurchasedShardsOnce(productId, shards, customerInfo);
        await syncAfterStoreAction();
        emitAppEvent('shards_balance_updated', { balance: await getShardsBalance() });
        if (granted) {
          logShardsPurchased(productId, shards);
          void trackShardPackPurchase(packId).catch(() => {});
          emitAppEvent('action_toast', {
            type: 'success',
            messageRu: `Готово: +${shards} осколков`,
            messageUk: `Готово: +${shards} осколків`,
            messageEs: `Listo: +${shards} ${BRAND_SHARDS_ES.toLowerCase()}`,
          });
        } else {
          emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Покупка уже обработана.',
            messageUk: 'Покупку вже оброблено.',
            messageEs: 'La compra ya se procesó.',
          });
        }
      } catch (e: any) {
        if (e?.userCancelled) return;
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: e?.message || 'Ошибка покупки. Попробуйте еще раз.',
          messageUk: e?.message || 'Помилка покупки. Спробуйте ще раз.',
          messageEs: e?.message || 'Error en la compra. Inténtalo de nuevo.',
        });
      } finally {
        setProcessingPackId(null);
      }
    },
    [grantPurchasedShardsOnce, syncAfterStoreAction, packagesByProductId, processingPackId],
  );

  const promptBuyCardPack = useCallback(
    (pack: FlashcardMarketPack) => {
      if (buyingShardPackId || ownedPackIds.includes(pack.id)) return;
      void trackCardPackClick(pack.id).catch(() => {});
      openCardPackPaywall(pack);
    },
    [buyingShardPackId, ownedPackIds, openCardPackPaywall],
  );

  const renderPackCard = (pack: ShardsPack, cardW: number) => {
    const totalShards = totalShardsFromPack(pack);
    const packShardImg = oskolokImageForShardIapRow(pack);
    const packPileDisplay = pack.shards >= 180 ? 40 : pack.shards >= 80 ? 38 : 34;
    const pkg = packagesByProductId[pack.productId];
    const priceHint = pricesFromDisk[pack.productId];
    const loadingPrices = !isDevStoreBypass && !pkg && !priceHint?.priceString && !storeChecked;
    const priceLabel =
      pkg?.product.priceString ??
      priceHint?.priceString ??
      (loadingPrices
        ? isUK
          ? 'Завантаження…'
          : isES
            ? 'Cargando…'
            : 'Загрузка…'
        : '—');
    const savings = savingsVsStarterFromStore(pack, packagesByProductId);
    const isPopular = pack.badge === 'popular';
    const isBest = pack.badge === 'best_value';
    const busy = processingPackId === pack.id;
    const anotherBusy = processingPackId != null && processingPackId !== pack.id;
    const canPurchase = isDevStoreBypass || !!pkg;
    const disabled = busy || anotherBusy || !canPurchase;

    const shardsLabel = isUK ? 'осколків' : isES ? shardsEsLc : 'осколков';
    /** Короткие строки + фиксированная высота блока — без «прыгающих» карточек из‑за переносов. */
    const subtitle =
      pack.id === 'starter'
        ? isUK
          ? 'Стартовий набір'
          : isES
            ? 'Paquete inicial'
            : 'Стартовый набор'
        : savings != null
          ? isUK
            ? `Вигідніше ${totalShardsFromPack(SHARDS_PACKS[0])} шт. на ${savings}%`
            : isES
              ? `-${savings}% frente al pack de ${totalShardsFromPack(SHARDS_PACKS[0])} uds.`
              : `Выгоднее ${totalShardsFromPack(SHARDS_PACKS[0])} шт. на ${savings}%`
          : loadingPrices
            ? isUK
              ? 'Завантаження цін…'
              : isES
                ? 'Cargando precios…'
                : 'Загрузка цен…'
            : isUK
              ? 'Ціну покаже Google Play'
              : isES
                ? 'El precio lo muestra Google Play'
                : 'Цену покажет Google Play';

    const paywallMood = isPaywallAtmosphereMode(themeMode);
    const borderColor = isBest
      ? `${t.gold}55`
      : isPopular
        ? `${t.accent}50`
        : paywallMood
          ? `${t.accent}22`
          : t.border;

    const hasRevenuePackage = !!pkg;
    const hasStorePrice = !!(pkg?.product?.priceString || priceHint?.priceString);
    const ctaLabel = busy
      ? isES
        ? 'Pago…'
        : 'Оплата…'
      : isDevStoreBypass
        ? isUK
          ? 'Купити (DEV)'
          : isES
            ? 'Comprar (DEV)'
            : 'Купить (DEV)'
        : hasRevenuePackage || hasStorePrice
          ? isUK
            ? `Купити за ${priceLabel}`
            : isES
              ? `Comprar por ${priceLabel}`
              : `Купить за ${priceLabel}`
          : isUK
            ? 'Недоступно'
            : isES
              ? 'No disponible'
              : 'Недоступно';

    const ctaOnAccent = t.correctText;
    const accentSoft =
      themeMode === 'neon' ? '#DFFF4A' : themeMode === 'dark' ? '#5DDC80' : `${t.accent}EB`;
    const useLockIcon = isDevStoreBypass && !hasStorePrice;

    return (
      <PressableScale
        style={{ width: cardW }}
        disabled={disabled}
        onPress={() => {
          void trackShardPackClick(pack.id).catch(() => {});
          void buyPack(pack.id, pack.productId, totalShards);
        }}
      >
        <View
          style={{
            width: cardW,
            opacity: anotherBusy ? 0.48 : !isDevStoreBypass && !pkg && storeChecked ? 0.55 : 1,
          }}
        >
          <View
            style={{
              width: cardW,
              borderRadius: 18,
              borderWidth: 1,
              borderColor,
              overflow: 'hidden',
              backgroundColor: t.bgCard,
              ...cardShadow,
            }}
          >
            {(isPopular || isBest) && (
              <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                <HitBadgeShell
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    backgroundColor: isBest ? t.gold : t.accent,
                  }}
                >
                  <Text style={{ color: isBest ? '#1a1208' : ctaOnAccent, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 }}>
                    {isBest ? (isUK ? 'ВИГІДНО' : isES ? 'OFERTA' : 'ВЫГОДНО') : isUK ? 'ХІТ' : isES ? 'TOP' : 'ХИТ'}
                  </Text>
                </HitBadgeShell>
              </View>
            )}

            {/* Симметричный padding 16 — иначе большой paddingRight под бейдж сужал всю колонку и кнопку. */}
            <View style={{ width: '100%', padding: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 14,
                  paddingRight: isPopular || isBest ? 76 : 0,
                }}
              >
                <PulsingShardFrame width={52} height={52} borderRadius={16}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: paywallMood ? `${SHARD_TEAL}18` : `${t.accent}14`,
                      borderWidth: 1,
                      borderColor: paywallMood ? `${SHARD_TEAL}40` : `${t.accent}35`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Image
                      recyclingKey={pack.productId}
                      source={packShardImg}
                      style={{ width: packPileDisplay, height: packPileDisplay }}
                      contentFit="contain"
                    />
                  </View>
                </PulsingShardFrame>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900', lineHeight: Math.round((f.numMd || 22) * 1.12) }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {pack.shards} {shardsLabel}
                  </Text>
                  {pack.bonusShards > 0 ? (
                    <Text
                      style={{
                        color: paywallMood ? SHARD_TEAL : t.accent,
                        fontSize: f.caption,
                        fontWeight: '800',
                        marginTop: 4,
                      }}
                      numberOfLines={1}
                    >
                      {isUK ? `+${pack.bonusShards} у подарунок` : isES ? `+${pack.bonusShards} de regalo` : `+${pack.bonusShards} в подарок`}
                    </Text>
                  ) : null}
                  <View style={{ height: 40, marginTop: 6, justifyContent: 'flex-start' }}>
                    <Text
                      style={{
                        color: loadingPrices && pack.id !== 'starter' ? t.textMuted : t.textSecond,
                        fontSize: f.caption,
                        lineHeight: 20,
                      }}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {subtitle}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10 }}>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>{isUK ? 'У магазині' : isES ? 'En la tienda' : 'В магазине'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.h2, fontWeight: '500', letterSpacing: 1 }}>—</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>{priceLabel}</Text>
                </View>
              </View>

              <View style={{ marginTop: 12, alignSelf: 'stretch', width: '100%' }}>
                <ShopNeonCta
                  accent={t.accent}
                  accentSoft={accentSoft}
                  correctText={ctaOnAccent}
                  busy={busy}
                  label={ctaLabel}
                  useLockIcon={useLockIcon}
                  shadow={getVolumetricShadow(themeMode, t, 1)}
                  fontSize={f.bodyLg}
                />
              </View>
            </View>
          </View>
        </View>
      </PressableScale>
    );
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} />
        <ShopParallaxBlobs themeMode={themeMode} />
        <ContentWrap>
          {/** width: 100% — инакше на Android з zIndex/elevation ряд табів міг зхлопуватись по висоті */}
          <View style={{ zIndex: 2, elevation: 4, width: '100%' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 6,
              paddingTop: 4,
              paddingBottom: 12,
            }}
          >
            <PressableScale onPress={() => router.replace('/(tabs)/home' as any)} scaleTo={0.92} withHaptic>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.bgSurface,
                  borderWidth: 1,
                  borderColor: t.border,
                  ...getVolumetricShadow(themeMode, t, 1),
                }}
              >
                <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
              </View>
            </PressableScale>
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '900', letterSpacing: 0.3 }} numberOfLines={1}>
                {isUK ? 'Магазин' : isES ? 'Tienda' : 'Магазин'}
              </Text>
            </View>
            <LinearGradient
              colors={[`${t.accent}35`, `${t.accent}10`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 18, padding: 1 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 17,
                  backgroundColor: t.bgCard,
                  borderWidth: 1,
                  borderColor: `${t.accent}30`,
                  minWidth: 96,
                  justifyContent: 'center',
                }}
              >
                <Image source={oskolokImageForPackShards(balance)} style={{ width: 24, height: 24 }} contentFit="contain" />
                <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }}>{balance}</Text>
                {/* Бейдж активного 48-год подарунка — лише на вкладці «Картки», бо тільки там його можна обміняти. */}
                {hasActiveVoucher && shopTab === 'paid' && (
                  <Text style={{ color: t.gold, fontSize: 11, fontWeight: '800', marginLeft: 6 }} numberOfLines={1}>
                    {lang === 'uk' ? `🎁 безкошт. ⏱${packTrialHours}год` : lang === 'es' ? `🎁 gratis ⏱${packTrialHours}h` : `🎁 беспл. ⏱${packTrialHours}ч`}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginHorizontal: 16,
              marginBottom: 14,
            }}
          >
            {(['catalog', 'paid'] as const).map((key) => {
              const active = shopTab === key;
              const label =
                key === 'catalog'
                  ? isES
                    ? BRAND_SHARDS_ES
                    : 'Осколки'
                  : isUK
                    ? 'Картки'
                    : isES
                      ? 'Tarjetas'
                      : 'Карточки';
              return (
                <View key={key} style={{ flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' }}>
                  {/** Не flex:1 на Pressable — на Android ряд + stretch давали висоту ~0; ширина через батька flex:1 */}
                  <PressableScale onPress={() => setShopTab(key)} scaleTo={0.97} withHaptic style={{ width: '100%' }}>
                    <View
                      style={{
                        minHeight: 46,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? `${t.accent}1C` : t.bgSurface,
                        borderWidth: 1,
                        borderColor: active ? `${t.accent}55` : t.border,
                        ...(active ? getVolumetricShadow(themeMode, t, 1) : {}),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: typeof f.caption === 'number' && f.caption > 0 ? f.caption : 13,
                          lineHeight: 18,
                          fontWeight: active ? '800' : '600',
                          color: active ? t.textPrimary : t.textMuted,
                          letterSpacing: 0.2,
                        }}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </View>
                  </PressableScale>
                </View>
              );
            })}
          </View>
          </View>

          <ScrollView
            style={{ zIndex: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 40,
              paddingTop: 2,
              alignItems: 'stretch',
              flexGrow: 1,
              width: '100%',
            }}
            showsVerticalScrollIndicator={false}
          >
            {/**
             * Обе вкладки рендерятся всегда — переключение через display:none.
             * Это сохраняет состояние Image / Animated values / shimmer и убирает «моргание»
             * при ре-маунте дерева, который происходил при условном рендере.
             */}
            <View style={{ display: shopTab === 'paid' ? 'flex' : 'none' }}>
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {isUK ? 'Набори за осколки' : isES ? `Paquetes por ${shardsEsLc}` : 'Наборы за осколки'}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                </View>

                {cardMarketLoading && marketPacks.length > 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <ActivityIndicator color={t.accent} size="small" />
                  </View>
                ) : null}

                {marketPacks.length === 0 ? (
                  cardMarketLoading ? (
                    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                      <ActivityIndicator color={t.accent} />
                    </View>
                  ) : (
                  <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginBottom: 16 }}>
                    {isUK ? 'Список наборів тимчасово недоступний.' : isES ? 'La lista de paquetes no está disponible.' : 'Список наборов временно недоступен.'}
                  </Text>
                  )
                ) : (
                  <RNAnim.View
                    style={{
                      opacity: paidListEnt,
                      transform: [{ translateY: paidListY }],
                    }}
                  >
                  {marketPacks.map((pack) => {
                    const owned = ownedPackIds.includes(pack.id);
                    const busy = buyingShardPackId === pack.id;
                    const title = packTitleForInterface(pack, lang);
                    const desc = packDescriptionForInterface(pack, lang);
                    const packArt = bundledPackTilePng(pack.id);
                    const packIon = packCategoryIonIcon(pack.category) as keyof typeof Ionicons.glyphMap;
                    /** Цей пак можна забрати безкоштовно за активним 48-год подарунком (лише офіційні, не community). */
                    const voucherEligible = hasActiveVoucher && !pack.isCommunityUgc && !owned;
                    return (
                      <View
                        key={`mkt_${pack.id}`}
                        style={{
                          width: packCardWidth,
                          alignSelf: 'center',
                          marginBottom: 12,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: owned ? `${t.correct}55` : isPaywallAtmosphereMode(themeMode) ? `${t.accent}1F` : t.border,
                          backgroundColor: t.bgCard,
                          padding: 14,
                          ...cardShadow,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                          <View
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: t.border,
                              backgroundColor: t.bgSurface,
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {packArt ? (
                              <Image source={packArt} style={{ width: 50, height: 50 }} contentFit="contain" />
                            ) : (
                              <Ionicons name={packIon} size={30} color={t.textPrimary} />
                            )}
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }} numberOfLines={2}>
                                {title}
                              </Text>
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                  borderRadius: 10,
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  backgroundColor: voucherEligible ? `${t.gold}22` : `${t.accent}22`,
                                  borderWidth: 1,
                                  borderColor: voucherEligible ? `${t.gold}66` : `${t.accent}44`,
                                }}
                              >
                                {voucherEligible ? (
                                  <Text style={{ color: t.gold, fontSize: f.caption, fontWeight: '900' }}>🎁</Text>
                                ) : (
                                  <Image source={oskolokImageForPackShards(pack.priceShards)} style={{ width: 22, height: 22 }} contentFit="contain" />
                                )}
                                <Text style={{ color: voucherEligible ? t.gold : t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>
                                  {voucherEligible ? (isUK ? 'безкошт.' : isES ? 'gratis' : 'беспл.') : pack.priceShards}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 4 }} numberOfLines={3}>
                              {desc}
                            </Text>
                            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 6 }}>
                              {pack.cardCount} {isUK ? 'карток' : isES ? 'tarjetas' : 'карточек'}
                            </Text>
                          </View>
                        </View>
                        {owned ? (
                          <View
                            style={{
                              marginTop: 12,
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: 'center',
                              backgroundColor: `${t.correct}22`,
                              opacity: 0.9,
                            }}
                          >
                            <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '800' }}>
                              {isUK ? 'Уже в картках' : isES ? 'Ya en Tarjetas' : 'Уже в карточках'}
                            </Text>
                          </View>
                        ) : (
                          <View style={{ marginTop: 12, alignSelf: 'stretch', opacity: busy ? 0.75 : 1 }}>
                            <PressableScale
                              disabled={busy}
                              onPress={() => promptBuyCardPack(pack)}
                              scaleTo={0.97}
                            >
                              <ShopNeonCta
                                accent={voucherEligible ? t.gold : t.accent}
                                accentSoft={
                                  voucherEligible
                                    ? `${t.gold}EB`
                                    : themeMode === 'neon'
                                    ? '#DFFF4A'
                                    : themeMode === 'dark'
                                    ? '#5DDC80'
                                    : `${t.accent}EB`
                                }
                                correctText={voucherEligible ? t.bgPrimary : t.correctText}
                                busy={busy}
                                label={
                                  voucherEligible
                                    ? isUK
                                      ? '🎁 Використати подарунок'
                                      : isES
                                        ? '🎁 Usar regalo'
                                        : '🎁 Использовать подарок'
                                    : isUK
                                      ? `Купити за ${pack.priceShards} осколків`
                                      : isES
                                        ? `Comprar por ${pack.priceShards} ${shardsEsLc}`
                                        : `Купить за ${pack.priceShards} осколков`
                                }
                                useLockIcon={false}
                                shadow={getVolumetricShadow(themeMode, t, 1)}
                                fontSize={f.body}
                              />
                            </PressableScale>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  </RNAnim.View>
                )}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                  }}
                >
                  <Ionicons name="logo-google-playstore" size={16} color={t.textMuted} />
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                    {isUK ? 'Покупка — у Google Play' : isES ? 'Compra — Google Play' : 'Покупка — в Google Play'}
                  </Text>
                </View>
              </>
            </View>
            <View style={{ display: shopTab === 'catalog' ? 'flex' : 'none' }}>
              <>
            <RNAnim.View
              style={{
                marginBottom: 16,
                borderRadius: 25,
                borderWidth: isPaywallAtmosphereMode(themeMode) ? 1 : 0,
                borderColor: isPaywallAtmosphereMode(themeMode) ? `${t.accent}28` : 'transparent',
                opacity: heroEnt,
                transform: [{ translateY: heroY }],
              }}
            >
              <View style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', ...cardShadow }}>
                <LinearGradient colors={t.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
                  <View style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: `${t.accent}12` }} />
                  <View style={{ position: 'absolute', bottom: -50, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: `${t.gold}10` }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <PulsingShardFrame width={72} height={72} borderRadius={22} big>
                      <View
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 22,
                          backgroundColor: isPaywallAtmosphereMode(themeMode) ? `${SHARD_TEAL}15` : `${t.bgSurface}cc`,
                          borderWidth: 1,
                          borderColor: isPaywallAtmosphereMode(themeMode) ? `${SHARD_TEAL}45` : `${t.accent}40`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Image source={oskolokImageForPackShards(balance)} style={{ width: 52, height: 52 }} contentFit="contain" />
                      </View>
                    </PulsingShardFrame>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.h1 + 2, fontWeight: '900' }}>{heroTitle}</Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 8, lineHeight: 21 }}>{heroSub}</Text>
                    </View>
                  </View>
                  {needLine && (
                    <View
                      style={{
                        marginTop: 16,
                        paddingTop: 14,
                        borderTopWidth: 1,
                        borderTopColor: t.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Ionicons name="information-circle" size={22} color={t.accent} style={{ marginTop: 1 }} />
                        <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600', flex: 1, lineHeight: 22 }}>{needLine}</Text>
                      </View>
                    </View>
                  )}
                </LinearGradient>
              </View>
            </RNAnim.View>

            {!storeChecked && !isDevStoreBypass && !hasAnyPriceFromDisk && (
              <View style={{ alignItems: 'center', paddingVertical: 8, marginBottom: 8 }}>
                <ActivityIndicator color={t.accent} />
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8 }}>
                  {isUK ? 'Завантажуємо ціни…' : isES ? 'Cargando precios…' : 'Загружаем цены…'}
                </Text>
              </View>
            )}

            {!allPacksHavePackages && storeChecked && !isDevStoreBypass && (
              <View
                style={{
                  backgroundColor: t.wrongBg,
                  borderWidth: 1,
                  borderColor: `${t.wrong}55`,
                  borderRadius: 18,
                  padding: 16,
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="warning" size={22} color={t.wrong} style={{ marginTop: 2 }} />
                <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '600', flex: 1, lineHeight: 20 }}>
                  {isUK
                    ? 'Магазин ще не готовий: перевір Offering «shards» у RevenueCat і активні товари в Google Play.'
                    : isES
                      ? 'La tienda aún no está lista: revisa la oferta «shards» en RevenueCat y los productos activos en Google Play.'
                      : 'Магазин ещё не готов: проверь Offering «shards» в RevenueCat и активные товары в Google Play.'}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                {isUK ? 'Осколки (оплата)' : isES ? `${BRAND_SHARDS_ES} (pago)` : 'Осколки (оплата)'}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
            </View>

            {SHARDS_PACKS.map((pack, packIdx) => (
              <RNAnim.View
                key={pack.id}
                style={{
                  width: packCardWidth,
                  alignSelf: 'center',
                  marginBottom: 12,
                  opacity: shardRowEnt[packIdx]!,
                  transform: [
                    {
                      translateY: shardRowEnt[packIdx]!.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                {renderPackCard(pack, packCardWidth)}
              </RNAnim.View>
            ))}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 10,
              }}
            >
              <Ionicons name="shield-checkmark" size={16} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                {isUK ? 'Оплата в Google Play' : isES ? 'Pago en Google Play' : 'Оплата в Google Play'}
              </Text>
            </View>
              </>
            </View>
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
      {cardPackPaywallModal}
    </ScreenGradient>
  );
}
