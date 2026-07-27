import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnim,
  AppState,
  BackHandler,
  InteractionManager,
  LayoutChangeEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Crypto from 'expo-crypto';
import { LinearGradient } from '../components/SafeLinearGradient';
import Animated, {
  cancelAnimation,
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
import { useTheme, getVolumetricShadow } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useScreen } from '../hooks/use-screen';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { bundleLang, triLang, type Lang } from '../constants/i18n';
import {
  ruKnowledgeShardsAccusativeAfterNumber,
  ukKnowledgeShardsAccusativeAfterNumber,
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
} from '../constants/shard_plurals';
import { BRAND_SHARDS_ES } from '../constants/terms_es';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import PressableScale from '../components/PressableScale';
import { ENABLE_DEV_TOOLS } from './config';
import GoldBevel from '../components/GoldBevel';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import CompassBevel from '../components/CompassBevel';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../constants/compassTheme';
import { addShardsRaw, getShardAchievementEligibleBalance, getShardsBalance, loadShardsFromCloud, peekLastKnownShardsBalance } from './shards_system';
import { SHARDS_PACKS, totalShardsFromPack, type ShardsPack } from './shards_shop_catalog';
import { safeRouterBack } from './navigation_back';
import {
  clearPendingShardGrant,
  clearPendingShardRecoveryNeeded,
  markPendingShardRecoveryNeeded,
  recordPendingShardGrant,
  resumePendingShardGrants,
} from './shards_pending_grants';
import {
  getWarmShardsPackagesMap,
  isCompleteShardsPackageMap,
  loadShardsPriceCache,
  loadShardsShopPackagesMap,
  peekShardsPriceCacheSync,
  type ShardsPriceCache,
} from './shards_shop_cache';
import {
  reserveBundledMarketPacks,
  loadAccessiblePackIds,
  loadMarketplacePacks,
  packCategoryIonIcon,
  packDescriptionForInterface,
  packTitleForInterface,
  peekWarmMarketplacePacks,
  peekWarmOwnedPackIds,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import { packTileImageForPack } from './flashcards/packMarketplaceIcons';
import { getPackGiftTrial, getPackTrialHoursLeft } from './flashcards/pack_trial_gift';
import { useCardPackShardPaywall } from './flashcards/useCardPackShardPaywall';
import { flashcardsOfficialPacksAvailableForTarget, frenchFlashcardsGateCopy } from './flashcards_target_gate';
import { DEV_IAP_BYPASS, IS_EXPO_GO } from './config';
import { initRevenueCat, syncRevenueCatIdentity } from './revenuecat_init';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from './account_generation';
import { runRevenueCatOperationForGeneration } from './revenuecat_account_identity';
import { trackActivity } from './app_activity';
import BouncyScrollView from '../components/BouncyScrollView';
import { FlashList } from '@shopify/flash-list';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { emitAppEvent, onAppEvent } from './events';
import { logShardsPurchased } from './firebase';
import { oskolokImageForPackShards, oskolokImageForShardIapRow } from './oskolok';
import { coinIconForBalance } from './coin_icons';
// зачем: дев-начисление обязано доезжать до сервера — иначе турнир и другие
// серверные проверки баланса не видят жемчужины (см. dev_shards_grant.ts).
import { grantShardsOnServerForDev } from './dev_shards_grant';
import {
  trackCardPackClick,
  trackShardPackClick,
  trackShardPackPurchase,
  trackShardsShopOpen,
} from './user_stats';

/** Реліз-збірка: false → Purchases.purchasePackage і системний діалог магазину (App Store / Google Play), без миттєвого DEV-нарахування. */
const isDevStoreBypass = __DEV__ || DEV_IAP_BYPASS || IS_EXPO_GO;

/** Teal / cyan в стилі «осколків» на paywall-референсі */
const SHARD_TEAL = '#2EC4B6';
const SHARD_TEAL_DIM = 'rgba(46,196,182,0.35)';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function ShopIconImageWithFallback({
  source,
  size,
  fallbackName,
  fallbackColor,
  recyclingKey,
}: {
  source?: any;
  size: number;
  fallbackName: keyof typeof Ionicons.glyphMap;
  fallbackColor: string;
  recyclingKey?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [source, recyclingKey]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!loaded || !source ? (
        <Ionicons
          name={fallbackName}
          size={Math.max(15, Math.round(size * 0.62))}
          color={fallbackColor}
          style={{ position: 'absolute', opacity: 0.9 }}
        />
      ) : null}
      {source ? (
        <Image
          recyclingKey={recyclingKey}
          source={source}
          style={{ width: size, height: size }}
          contentFit="contain"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      ) : null}
    </View>
  );
}

function isPaywallAtmosphereMode(mode: ThemeMode): boolean {
  return mode === 'dark' || false || mode === 'gold';
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// зачем: владелец попросил убрать декоративные плавающие "блобы"-подложку за
// контентом магазина (ShopParallaxBlobs) — чисто орнамент, не влияет на функциональность.
// Компонент и его рендер убраны; isPaywallAtmosphereMode оставлен — используется ниже
// для расчёта цветов карточек паков.

function PulsingShardFrame({
  width: fw,
  height: fh,
  big,
  active = true,
  children,
}: {
  width: number;
  height: number;
  borderRadius: number;
  big?: boolean;
  /**
   * Вкладка, на которой живёт этот пульс, сейчас видна.
   * зачем: обе вкладки магазина смонтированы всегда (display:none сохраняет состояние),
   * поэтому без этого флага скрытая половина продолжала крутить свои лупы вхолостую.
   */
  active?: boolean;
  children: React.ReactNode;
}) {
  const p = useSharedValue(0);
  const isFocusedScreen = useIsScreenFocused();
  const isFocused = isFocusedScreen && active;
  // Пульс живёт только на видимом экране и активном приложении: freezeOnBlur:false
  // держит ушедшие экраны живыми, без гарда луп грел бы телефон в фоне
  // (паттерн components/AvatarAura.tsx).
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(p);
      p.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(p);
      p.value = 0;
      p.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    };
    const stop = () => {
      cancelAnimation(p);
      p.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(p);
    };
  }, [p, isFocused]);
  const childScale = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(p.value, [0, 1], [1, big ? 1.05 : 1.06]) }],
  }));
  return (
    <View style={{ width: fw, height: fh, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={childScale}>{children}</Animated.View>
    </View>
  );
}

function HitBadgeShell({ children, style, active = true }: { children: React.ReactNode; style?: object; active?: boolean }) {
  const hb = useSharedValue(0);
  const isFocusedScreen = useIsScreenFocused();
  // active — та же логика, что у PulsingShardFrame: скрытая вкладка не крутит луп.
  const isFocused = isFocusedScreen && active;
  // Гард как у PulsingShardFrame выше — луп только на видимом экране/активном приложении.
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(hb);
      hb.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(hb);
      hb.value = 0;
      hb.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    };
    const stop = () => {
      cancelAnimation(hb);
      hb.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(hb);
    };
  }, [hb, isFocused]);
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
  /** Узкая кнопка в карточках паков осколков */
  dense?: boolean;
  /**
   * Бегущий блик по кнопке. По умолчанию включён (крупные одиночные CTA).
   * зачем: в длинном списке наборов карточек каждая кнопка держала свой
   * бесконечный withRepeat + отдельный AnimatedLinearGradient — при 20-30 паках
   * это десятки параллельных лупов и слоёв, из-за чего скролл магазина тормозил.
   * Там передаём shimmer={false}: анимация и слой блика не создаются вовсе.
   */
  shimmer?: boolean;
  /** Вкладка с этой кнопкой видна — иначе блик замирает (см. PulsingShardFrame.active). */
  active?: boolean;
};

function ShopNeonCta({ accent, accentSoft, correctText, busy, label, useLockIcon, shadow, fontSize, dense = false, shimmer = true, active = true }: ShopCtaProps) {
  const ctaW = useSharedValue(0);
  const sh = useSharedValue(0);
  const [boxW, setBoxW] = useState(0);
  const isFocusedScreen = useIsScreenFocused();
  const isFocused = isFocusedScreen && shimmer && active;

  // Дрожание ширины на 1px гасится в setBoxW (onLayout ниже), поэтому эффект
  // перезапускается только при реальной смене ширины или фокуса. Луп только на
  // видимом экране/активном приложении (паттерн components/AvatarAura.tsx).
  useEffect(() => {
    if (boxW < 8 || !isFocused) {
      cancelAnimation(sh);
      sh.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(sh);
      sh.value = 0;
      sh.value = withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.linear }),
        -1,
        false,
      );
    };
    const stop = () => {
      cancelAnimation(sh);
      sh.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(sh);
    };
  }, [boxW, sh, isFocused]);

  // зачем: без блика ширина кнопки никому не нужна — не измеряем и не держим
  // setState на каждый layout строки списка (лишний ре-рендер при скролле).
  const onLayoutCta = shimmer
    ? (e: LayoutChangeEvent) => {
      const w = Math.round(e.nativeEvent.layout.width);
      // Игнорируем дрожание ширины на 1px при скролле/layout — иначе сбрасывается блик кнопки
      setBoxW((prev) => (prev > 0 && Math.abs(prev - w) < 2 ? prev : w));
      ctaW.value = w;
    }
    : undefined;

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
        borderRadius: dense ? 12 : 14,
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
        paddingVertical: dense ? 10 : 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: dense ? 6 : 8,
        opacity: busy ? 0.88 : 1,
      }}
    >
        {useLockIcon ? (
          <Ionicons name="lock-closed" size={dense ? 16 : 18} color={correctText} />
        ) : (
          <Ionicons name="bag-handle" size={dense ? 16 : 18} color={correctText} />
        )}
        <Text style={{ color: correctText, fontSize, fontWeight: '900' }}>{label}</Text>
      </LinearGradient>
      {shimmer && !busy && boxW > 0 ? (
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

type MarketPackCardProps = {
  pack: FlashcardMarketPack;
  lang: Lang;
  owned: boolean;
  busy: boolean;
  voucherEligible: boolean;
  width: number;
  radius: number;
  smallRadius: number;
  cardBg: string;
  surfaceBg: string;
  cardShadow: object;
  ctaShadow: object;
  themeMode: ThemeMode;
  t: any;
  f: any;
  shardsEsLc: string;
  onPress: (pack: FlashcardMarketPack) => void;
};

/**
 * Одна карточка набора карточек в списке магазина.
 *
 * зачем: раньше вся разметка жила инлайном в marketPacks.map() внутри экрана —
 * любое изменение баланса/таба/загрузки перерисовывало ВСЕ карточки разом, а
 * список не был виртуализован. Вынесено в memo-компонент верхнего уровня, чтобы
 * FlatList ниже мог реально переиспользовать строки, а не пересобирать дерево.
 */
const MarketPackCard = React.memo(function MarketPackCard({
  pack,
  lang,
  owned,
  busy,
  voucherEligible,
  width,
  radius,
  smallRadius,
  cardBg,
  surfaceBg,
  cardShadow,
  ctaShadow,
  themeMode,
  t,
  f,
  shardsEsLc,
  onPress,
}: MarketPackCardProps) {
  const title = packTitleForInterface(pack, lang);
  const desc = packDescriptionForInterface(pack, lang);
  const packArt = packTileImageForPack(pack);
  const packIon = packCategoryIonIcon(pack.category) as keyof typeof Ionicons.glyphMap;

  return (
    <View
      style={{
        width,
        alignSelf: 'center',
        marginBottom: 12,
        borderRadius: radius,
        borderWidth: 0,
        backgroundColor: cardBg,
        padding: 14,
        overflow: 'hidden',
        ...cardShadow,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            borderWidth: 0,
            backgroundColor: surfaceBg,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <ShopIconImageWithFallback
            source={packArt}
            size={50}
            fallbackName={packIon}
            fallbackColor={t.textPrimary}
            recyclingKey={pack.id}
          />
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
                borderWidth: 0,
              }}
            >
              {voucherEligible ? (
                <Text style={{ color: t.gold, fontSize: f.caption, fontWeight: '900' }}>🎁</Text>
              ) : (
                <Image source={oskolokImageForPackShards(pack.priceShards)} style={{ width: 22, height: 22 }} contentFit="contain" />
              )}
              <Text style={{ color: voucherEligible ? t.gold : t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>
                {voucherEligible
                  ? triLang(lang, {
                    ru: 'беспл.',
                    uk: 'безкошт.',
                    es: 'gratis',
                    'pt-BR': 'grátis',
                    vi: 'miễn phí',
                    id: 'gratis',
                    tr: 'ücretsiz',
                    pl: 'gratis',
                  })
                  : pack.priceShards}
              </Text>
            </View>
          </View>
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 4 }} numberOfLines={3}>
            {desc}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 6 }}>
            {pack.cardCount} {triLang(lang, {
              ru: 'карточек',
              uk: 'карток',
              es: 'tarjetas',
              'pt-BR': 'cartões',
              vi: 'thẻ',
              id: 'kartu',
              tr: 'kart',
              pl: 'fiszek',
            })}
          </Text>
        </View>
      </View>
      {owned ? (
        <View
          style={{
            marginTop: 12,
            borderRadius: smallRadius,
            paddingVertical: 12,
            alignItems: 'center',
            backgroundColor: `${t.correct}22`,
            opacity: 0.9,
          }}
        >
          <Text style={{ color: t.correct, fontSize: f.body, fontWeight: '800' }}>
            {triLang(lang, {
              ru: 'Уже в карточках',
              uk: 'Уже в картках',
              es: 'Ya en Tarjetas',
              'pt-BR': 'Já nos cartões',
              vi: 'Đã có trong thẻ',
              id: 'Sudah ada di Kartu',
              tr: 'Zaten Kartlarda',
              pl: 'Już w fiszkach',
            })}
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 12, alignSelf: 'stretch', opacity: busy ? 0.75 : 1 }}>
          <PressableScale disabled={busy} onPress={() => onPress(pack)} scaleTo={0.97}>
            <ShopNeonCta
              accent={voucherEligible ? t.gold : t.accent}
              accentSoft={
                voucherEligible
                  ? `${t.gold}EB`
                  : themeMode === 'dark'
                  ? '#5DDC80'
                  : `${t.accent}EB`
              }
              correctText={voucherEligible ? t.bgPrimary : t.correctText}
              busy={busy}
              label={
                voucherEligible
                  ? triLang(lang, {
                    ru: '🎁 Использовать подарок',
                    uk: '🎁 Використати подарунок',
                    es: '🎁 Usar regalo',
                    'pt-BR': '🎁 Usar presente',
                    vi: '🎁 Dùng quà tặng',
                    id: '🎁 Gunakan hadiah',
                    tr: '🎁 Hediyeyi kullan',
                    pl: '🎁 Użyj prezentu',
                  })
                  : triLang(lang, {
                    // зачем: цена пака произвольная, а слово было захардкожено во
                    // множественном («за 1 жемчужин»). «за» требует винительного.
                    ru: `Открыть за ${pack.priceShards} ${ruKnowledgeShardsAccusativeAfterNumber(pack.priceShards)}`,
                    uk: `Відкрити за ${pack.priceShards} ${ukKnowledgeShardsAccusativeAfterNumber(pack.priceShards)}`,
                    es: `Comprar por ${pack.priceShards} ${shardsEsLc}`,
                    'pt-BR': `Comprar por ${pack.priceShards} pérolas`,
                    vi: `Mua với ${pack.priceShards} xu`,
                    id: `Beli dengan ${pack.priceShards} koin`,
                    tr: `${pack.priceShards} jeton ile satın al`,
                    pl: `Kup za ${pack.priceShards} monet`,
                  })
              }
              useLockIcon={false}
              shadow={ctaShadow}
              fontSize={f.body}
              /* зачем: в списке блик отключён — см. комментарий у ShopCtaProps.shimmer */
              shimmer={false}
            />
          </PressableScale>
        </View>
      )}
    </View>
  );
});

export default function ShardsShopScreen() {
  const router = useRouter();
  const { theme: t, f, isDark, themeMode, statusBarLight } = useTheme();
  const isGoldTheme = themeMode === 'gold';
  const isCompassTheme = false;
  const shopRadius = isCompassTheme ? 10 : 16;
  const shopSmallRadius = isCompassTheme ? 7 : 12;
  const shopIconRadius = isCompassTheme ? 9 : 14;
  const shopAccent = isCompassTheme ? COMPASS_RICH.champagne : t.accent;
  const shopAccentSoft = isCompassTheme ? COMPASS_RICH.cream : t.accent;
  const shopAccentBorder = isCompassTheme ? COMPASS_RICH.hairlineStrong : `${t.accent}40`;
  const shopCardBg = isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard;
  const shopSurfaceBg = isCompassTheme ? COMPASS_RICH.charcoalSoft : t.bgSurface;
  const { width: winW, contentMaxW, insets } = useScreen();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const lb = bundleLang(lang);
  const officialCardPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget, lang);
  const frenchCardPacksGateCopy = frenchFlashcardsGateCopy(lang);
  const effectiveOs = useEffectivePlatformOS();
  const shardsEsLc = BRAND_SHARDS_ES.toLowerCase();
  const storePaymentCopy = useMemo<{
    icon: IoniconName;
    cardPurchase: string;
    footerPayment: string;
    notReady: string;
  }>(() => {
    if (effectiveOs === 'ios') {
      return {
        icon: 'logo-apple-appstore',
        cardPurchase: triLang(lang, {
          ru: 'Оплата — в App Store',
          uk: 'Оплата — в App Store',
          es: 'Compra — App Store',
          'pt-BR': 'Compra — App Store',
          vi: 'Mua hàng — App Store',
          id: 'Pembelian — App Store',
          tr: 'Satın alma — App Store',
          pl: 'Zakup — App Store',
        }),
        footerPayment: triLang(lang, {
          ru: 'Оплата в App Store',
          uk: 'Оплата в App Store',
          es: 'Pago en App Store',
          'pt-BR': 'Pagamento na App Store',
          vi: 'Thanh toán trong App Store',
          id: 'Pembayaran di App Store',
          tr: 'App Store üzerinden ödeme',
          pl: 'Płatność w App Store',
        }),
        notReady: triLang(lang, {
          ru: 'Магазин временно недоступен. Попробуй позже.',
          uk: 'Магазин ще не готовий: перевір Offering «shards» у RevenueCat і активні товари в App Store Connect.',
          es: 'La tienda aún no está lista: revisa la oferta «shards» en RevenueCat y los productos activos en App Store Connect.',
          'pt-BR': 'A loja ainda não está pronta: verifique o Offering «shards» no RevenueCat e os produtos ativos no App Store Connect.',
          vi: 'Cửa hàng chưa sẵn sàng: kiểm tra Offering «shards» trong RevenueCat và các sản phẩm đang hoạt động trong App Store Connect.',
          id: 'Toko belum siap: periksa Offering «koin» di RevenueCat dan produk aktif di App Store Connect.',
          tr: 'Mağaza henüz hazır değil: RevenueCat içindeki «shards» Offering ve App Store Connect aktif ürünlerini kontrol et.',
          pl: 'Sklep nie jest jeszcze gotowy: sprawdź Offering «shards» w RevenueCat oraz aktywne produkty w App Store Connect.',
        }),
      };
    }
    if (effectiveOs === 'android') {
      return {
        icon: 'logo-google-playstore',
        cardPurchase: triLang(lang, {
          ru: 'Оплата — в Google Play',
          uk: 'Оплата — у Google Play',
          es: 'Compra — Google Play',
          'pt-BR': 'Compra — Google Play',
          vi: 'Mua hàng — Google Play',
          id: 'Pembelian — Google Play',
          tr: 'Satın alma — Google Play',
          pl: 'Zakup — Google Play',
        }),
        footerPayment: triLang(lang, {
          ru: 'Оплата в Google Play',
          uk: 'Оплата в Google Play',
          es: 'Pago en Google Play',
          'pt-BR': 'Pagamento no Google Play',
          vi: 'Thanh toán trong Google Play',
          id: 'Pembayaran di Google Play',
          tr: 'Google Play üzerinden ödeme',
          pl: 'Płatność w Google Play',
        }),
        notReady: triLang(lang, {
          ru: 'Магазин временно недоступен. Попробуй позже.',
          uk: 'Магазин ще не готовий: перевір Offering «shards» у RevenueCat і активні товари в Google Play.',
          es: 'La tienda aún no está lista: revisa la oferta «shards» en RevenueCat y los productos activos en Google Play.',
          'pt-BR': 'A loja ainda não está pronta: verifique o Offering «shards» no RevenueCat e os produtos ativos no Google Play.',
          vi: 'Cửa hàng chưa sẵn sàng: kiểm tra Offering «shards» trong RevenueCat và các sản phẩm đang hoạt động trong Google Play.',
          id: 'Toko belum siap: periksa Offering «koin» di RevenueCat dan produk aktif di Google Play.',
          tr: 'Mağaza henüz hazır değil: RevenueCat içindeki «shards» Offering ve Google Play aktif ürünlerini kontrol et.',
          pl: 'Sklep nie jest jeszcze gotowy: sprawdź Offering «shards» w RevenueCat oraz aktywne produkty w Google Play.',
        }),
      };
    }
    return {
      icon: 'shield-checkmark',
      cardPurchase: triLang(lang, {
        ru: 'Оплата — в магазине приложений',
        uk: 'Оплата — у магазині застосунків',
        es: 'Compra — tienda de apps',
        'pt-BR': 'Compra — loja de apps',
        vi: 'Mua hàng — cửa hàng ứng dụng',
        id: 'Pembelian — toko aplikasi',
        tr: 'Satın alma — uygulama mağazası',
        pl: 'Zakup — sklep z aplikacjami',
      }),
      footerPayment: triLang(lang, {
        ru: 'Оплата в магазине приложений',
        uk: 'Оплата в магазині застосунків',
        es: 'Pago en la tienda de apps',
        'pt-BR': 'Pagamento na loja de apps',
        vi: 'Thanh toán trong cửa hàng ứng dụng',
        id: 'Pembayaran di toko aplikasi',
        tr: 'Uygulama mağazası üzerinden ödeme',
        pl: 'Płatność w sklepie z aplikacjami',
      }),
      notReady: triLang(lang, {
        ru: 'Магазин временно недоступен. Попробуй позже.',
        uk: 'Магазин ще не готовий: перевір Offering «shards» у RevenueCat і активні товари в магазині застосунків.',
        es: 'La tienda aún no está lista: revisa la oferta «shards» en RevenueCat y los productos activos en la tienda de apps.',
        'pt-BR': 'A loja ainda não está pronta: verifique o Offering «shards» no RevenueCat e os produtos ativos na loja de apps.',
        vi: 'Cửa hàng chưa sẵn sàng: kiểm tra Offering «shards» trong RevenueCat và các sản phẩm đang hoạt động trong cửa hàng ứng dụng.',
        id: 'Toko belum siap: periksa Offering «koin» di RevenueCat dan produk aktif di toko aplikasi.',
        tr: 'Mağaza henüz hazır değil: RevenueCat içindeki «shards» Offering ve uygulama mağazası aktif ürünlerini kontrol et.',
        pl: 'Sklep nie jest jeszcze gotowy: sprawdź Offering «shards» w RevenueCat oraz aktywne produkty w sklepie z aplikacjami.',
      }),
    };
  }, [effectiveOs, lang]);
  const params = useLocalSearchParams<{ need?: string; source?: string; tab?: string; returnTo?: string }>();
  /** Снимок нехватки из маршрута; сам по себе не обновляется после покупки. */
  const needFromRoute = useMemo(() => {
    const n = Number(params.need || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [params.need]);
  const lastNeedParamKeyRef = useRef<string | null>(null);
  /** Баланс при первом зчитуванні після відкриття з цим `need` — щоб показати залишок після покупки. */
  const shopEntryBalanceRef = useRef<number | null>(null);
  type ShopTab = 'catalog' | 'paid';
  const firestoreOpenTabsRef = useRef<Set<ShopTab>>(new Set());
  const [shopTab, setShopTab] = useState<ShopTab>(() =>
    params.tab === 'paid' || params.tab === 'cards' ? 'paid' : 'catalog',
  );
  const [balance, setBalance] = useState(() => peekLastKnownShardsBalance() ?? 0);
  const [packTrialHours, setPackTrialHours] = useState<number | null>(null);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  useEffect(() => {
    const subscription = subscribeAccountGeneration(() => setProcessingPackId(null));
    return () => subscription.remove();
  }, []);
  const [packagesByProductId, setPackagesByProductId] = useState<Record<string, PurchasesPackage>>(() => getWarmShardsPackagesMap() ?? {});
  /** Завершён getOfferings (успех или нет) — кнопки/подсказки, не мешаем с кэшем с диска. */
  const [storeChecked, setStoreChecked] = useState(
    () => isDevStoreBypass || isCompleteShardsPackageMap(getWarmShardsPackagesMap() ?? undefined),
  );
  const [pricesFromDisk, setPricesFromDisk] = useState<ShardsPriceCache>(() => peekShardsPriceCacheSync());
  const [marketPacks, setMarketPacks] = useState<FlashcardMarketPack[]>(() =>
    officialCardPacksEnabled ? peekWarmMarketplacePacks(studyTarget, lang) ?? reserveBundledMarketPacks(studyTarget, lang) : [],
  );
  // зачем: раньше ownedPackIds стартовал с [] и все карточки паков на вкладке «Карточки»
  // мигали «не куплено», пока не приходил ответ loadAccessiblePackIds — теперь сеем
  // синхронно из peekWarmOwnedPackIds (in-memory зеркало последнего чтения AsyncStorage
  // в этой сессии приложения), а ownedResolved держит true/false: знаем ли мы уже
  // достоверный owned-статус (иначе рендер паков дальше держится за cardMarketLoading).
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>(() => peekWarmOwnedPackIds(studyTarget) ?? []);
  const ownedResolvedRef = useRef(peekWarmOwnedPackIds(studyTarget) != null);
  const [ownedResolved, setOwnedResolved] = useState<boolean>(() => ownedResolvedRef.current);
  /** true только при первом запросе списка наборов (вкладка «Карточки»); вкладка «Осколки» не ждёт этот сетевой round-trip. */
  const [cardMarketLoading, setCardMarketLoading] = useState(false);
  const [buyingShardPackId, setBuyingShardPackId] = useState<string | null>(null);
  const cardMarketFetchedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Честный «назад»: магазин осколков открывается из 8+ мест (аватар, друзья,
        // серия, задания, набор-paywall, профиль-карточка, тап по балансу). Хардкод
        // replace на home возвращал в неожиданное место мимо точки входа.
        safeRouterBack(router, '/(tabs)/home' as any);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [router]),
  );

  const cardShadow = useMemo(() => isCompassTheme ? compassShadow(2) : getVolumetricShadow(themeMode, t, 2), [isCompassTheme, themeMode, t]);
  // зачем: тень кнопки в карточке набора раньше считалась инлайном на каждый рендер —
  // новый объект каждый раз ломал бы memo у MarketPackCard и заставлял перерисовывать
  // весь список при любом обновлении экрана (баланс, таб, загрузка).
  const packCtaShadow = useMemo(() => isCompassTheme ? compassShadow(1) : getVolumetricShadow(themeMode, t, 1), [isCompassTheme, themeMode, t]);

  /**
   * Сигнал перерисовки строк списка наборов.
   * зачем: MarketPackCard обёрнут в memo — без этого FlashList не обновит уже
   * отрисованные карточки после покупки (owned), во время покупки (busy),
   * при появлении подарка или смене языка/темы. Держим только то, что реально
   * влияет на вид строки, иначе теряется весь смысл мемоизации.
   */
  /** Явная ширина: в ScrollView на Android «100%»/stretch иногда даёт разную ширину строк по контенту. */
  const packCardWidth = useMemo(() => {
    const safeInner = winW - insets.left - insets.right;
    const column = Math.min(safeInner, contentMaxW);
    const scrollPad = 32; // contentContainerStyle paddingHorizontal 16+16
    return Math.max(280, Math.floor(column - scrollPad));
  }, [winW, contentMaxW, insets.left, insets.right]);


  const refreshBalance = useCallback(async (isCurrent: () => boolean = () => true) => {
    const next = await getShardsBalance();
    if (!isCurrent()) return;
    setBalance(next);
  }, []);

  const refreshPackTrial = useCallback(async () => {
    const tr = await getPackGiftTrial(studyTarget);
    setPackTrialHours(tr ? getPackTrialHoursLeft(tr.expiresAt) : null);
  }, [studyTarget]);

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
  // зачем: сид тем же значением, что и initial state ownedPackIds (peekWarmOwnedPackIds) —
  // если warm-кэш уже содержал owned-список, первый успешный fetch с тем же результатом
  // не должен триггерить лишний setOwnedPackIds (fingerprint совпадёт).
  const ownedFingerprintRef = useRef<string>([...(peekWarmOwnedPackIds(studyTarget) ?? [])].sort().join('|'));
  /** 30s throttle на Firestore-обновления (force=true для after-purchase refresh). */
  const lastCardMarketFetchRef = useRef<number>(0);

  const loadCardMarket = useCallback(async (opts?: { background?: boolean; force?: boolean }) => {
    if (!officialCardPacksEnabled) {
      setMarketPacks([]);
      setOwnedPackIds([]);
      marketPacksFingerprintRef.current = '';
      ownedFingerprintRef.current = '';
      cardMarketFetchedOnce.current = true;
      setCardMarketLoading(false);
      setOwnedResolved(true);
      return;
    }
    const now = Date.now();
    if (!opts?.force && now - lastCardMarketFetchRef.current < 30_000 && cardMarketFetchedOnce.current) return;
    lastCardMarketFetchRef.current = now;

    const hasBundledCatalog = reserveBundledMarketPacks(studyTarget, lang).length > 0;
    /** Якщо в бандлі вже є каталог — не ховаємо список за спінером під час Firestore. */
    const background = opts?.background === true || hasBundledCatalog;
    if (!background) setCardMarketLoading(true);
    try {
      const [packsRes, ownedRes] = await Promise.allSettled([loadMarketplacePacks(studyTarget, lang), loadAccessiblePackIds(studyTarget)]);
      const packsRaw = packsRes.status === 'fulfilled' ? packsRes.value : reserveBundledMarketPacks(studyTarget, lang);
      const packs = packsRaw.length > 0 ? packsRaw : reserveBundledMarketPacks(studyTarget, lang);
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
      // зачем: помечаем owned-статус достоверным ТОЛЬКО после успешного разрешения
      // loadAccessiblePackIds — иначе (allSettled rejected) держим прежний рендер-гейт,
      // чтобы не мигнуть "не куплено" по неудачному запросу.
      if (ownedRes.status === 'fulfilled') setOwnedResolved(true);
      cardMarketFetchedOnce.current = true;
    } catch {
      const reserve = reserveBundledMarketPacks(studyTarget, lang);
      const nextFp = computeMarketFingerprint(reserve);
      if (nextFp !== marketPacksFingerprintRef.current) {
        marketPacksFingerprintRef.current = nextFp;
        setMarketPacks(reserve);
      }
    } finally {
      if (!background) setCardMarketLoading(false);
    }
  }, [officialCardPacksEnabled, studyTarget]);

  const syncAfterStoreAction = useCallback(async (isCurrent: () => boolean = () => true) => {
    await loadShardsFromCloud(isCurrent);
    if (!isCurrent()) return;
    await refreshBalance(isCurrent);
    if (!isCurrent()) return;
    /** Не блокує UI paywall — оновлення каталогу асинхронно (Firestore інколи не відповідає). */
    if (shopTab === 'paid' || cardMarketFetchedOnce.current) {
      void loadCardMarket({ background: true, force: true });
    }
  }, [refreshBalance, loadCardMarket, shopTab]);

  const waitForServerShardGrant = useCallback(async (
    startingBalance: number,
    expectedShards: number,
    isCurrent: () => boolean = () => true,
  ): Promise<number> => {
    const expectedBalance = startingBalance + expectedShards;
    for (let i = 0; i < 8; i += 1) {
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 1200 : 2500));
      if (!isCurrent()) return startingBalance;
      await loadShardsFromCloud(isCurrent);
      if (!isCurrent()) return startingBalance;
      const next = await getShardsBalance();
      if (!isCurrent()) return startingBalance;
      setBalance(next);
      if (next >= expectedBalance) return next;
    }
    const finalBalance = await getShardsBalance();
    return isCurrent() ? finalBalance : startingBalance;
  }, []);

  /** Активний 48-год ваучер: на вкладці «Картки» ціни замінюються іконкою подарка, paywall відкривається в voucher-режимі. */
  const hasActiveVoucher = packTrialHours != null && packTrialHours > 0;

  /**
   * Сигнал перерисовки строк списка наборов.
   * зачем: MarketPackCard обёрнут в memo — без этого FlashList не обновит уже
   * отрисованные карточки после покупки (owned), во время покупки (busy),
   * при появлении подарка или смене языка/темы/ширины. Держим только то, что
   * реально влияет на вид строки, иначе теряется весь смысл мемоизации.
   */
  const marketListExtraData = useMemo(
    () => ({ ownedPackIds, ownedResolved, buyingShardPackId, hasActiveVoucher, lang, themeMode, packCardWidth }),
    [ownedPackIds, ownedResolved, buyingShardPackId, hasActiveVoucher, lang, themeMode, packCardWidth],
  );

  const { openPaywall: openCardPackPaywall, CardPackPaywallModalEl: cardPackPaywallModal } = useCardPackShardPaywall({
    balance,
    hasVoucher: hasActiveVoucher,
    studyTarget,
    lang: lb,
    router,
    onAfterPurchase: syncAfterStoreAction,
    onPurchaseStart: (id) => setBuyingShardPackId(id),
    onPurchaseEnd: () => setBuyingShardPackId(null),
  });

  useFocusEffect(
    useCallback(() => {
      void trackShardsShopOpen().catch(() => {});
      const shouldWriteOpenToFirestore = !firestoreOpenTabsRef.current.has(shopTab);
      if (shouldWriteOpenToFirestore) firestoreOpenTabsRef.current.add(shopTab);
      void trackActivity('shards_shop:open', {
        feature: 'revenue',
        screen: 'shards_shop',
        result: 'info',
        writeToFirestore: shouldWriteOpenToFirestore,
        tags: { tab: shopTab },
      }).catch(() => {});
      void refreshPackTrial();
      let cancelled = false;
      void (async () => {
        const next = await getShardsBalance();
        if (cancelled) return;
        setBalance(next);
        if (shopEntryBalanceRef.current === null && needFromRoute > 0) {
          shopEntryBalanceRef.current = next;
        }
        // Дотягиваем pending-начисления из прошлых покупок (если вебхук задержался
        // дольше окна waitForServerShardGrant ~18с). resumePendingShardGrants сам
        // обновит баланс и покажет toast «+N осколков», когда облако подтвердит.
        const resumeAccount = captureAccountGeneration();
        void resumePendingShardGrants(resumeAccount).catch(() => {});
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
    const task = InteractionManager.runAfterInteractions(() => {
      void loadShardsPriceCache().then((c) => {
        if (!m) return;
        // setState только если реально что-то изменилось (избегаем ре-рендера всего экрана).
        const sameKeys =
          Object.keys(c).length === Object.keys(pricesFromDisk).length &&
          Object.keys(c).every((k) => pricesFromDisk[k]?.priceString === c[k]?.priceString);
        if (!sameKeys) setPricesFromDisk(c);
      });
    });
    return () => { m = false; task.cancel(); };
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

  const shardTerm = triLang(lang, {
    ru: 'жемчужин',
    uk: 'перлин',
    es: shardsEsLc,
    'pt-BR': 'pérolas',
    vi: 'xu',
    id: 'koin',
    tr: 'jeton',
    pl: 'monet',
  });
  const heroTitle = triLang(lang, {
    ru: 'Жемчуг',
    uk: 'Перлини',
    es: `${BRAND_SHARDS_ES} de conocimiento`,
    'pt-BR': 'Pérolas de conhecimento',
    vi: 'Xu kiến thức',
    id: 'Koin pengetahuan',
    tr: 'Bilgi jetonları',
    pl: 'Monety wiedzy',
  });
  const heroSub = triLang(lang, {
    ru: 'Трать жемчуг на вызовы, клуб и всё, что нужно прямо сейчас.',
    uk: 'Один пакет — більше дій: бонуси, клуб і швидкі покупки в застосунку.',
    es: 'Un paquete, más acciones: bonificaciones, club y compras rápidas en la app.',
    'pt-BR': 'Um pacote, mais ações: bônus, clube e compras rápidas no app.',
    vi: 'Một gói, thêm nhiều hành động: thưởng, câu lạc bộ và mua nhanh trong ứng dụng.',
    id: 'Satu paket, lebih banyak aksi: bonus, klub, dan pembelian cepat di aplikasi.',
    tr: 'Tek paket, daha fazla aksiyon: bonuslar, kulüp ve uygulamada hızlı satın almalar.',
    pl: 'Jeden pakiet, więcej akcji: bonusy, klub i szybkie zakupy w aplikacji.',
  });

  const remainingNeed = useMemo(() => {
    if (needFromRoute <= 0) return 0;
    const entry = shopEntryBalanceRef.current;
    const gainedSinceOpen = entry != null ? Math.max(0, balance - entry) : 0;
    return Math.max(0, needFromRoute - gainedSinceOpen);
  }, [needFromRoute, balance]);

  const returnedToReviveRef = useRef(false);
  useEffect(() => {
    if (params.source !== 'streak_revive') return;
    if (needFromRoute <= 0 || remainingNeed > 0) return;
    if (shopEntryBalanceRef.current === null || returnedToReviveRef.current) return;
    returnedToReviveRef.current = true;
    router.replace((params.returnTo === 'streak_stats' ? '/streak_stats' : '/(tabs)/home') as any);
  }, [needFromRoute, params.returnTo, params.source, remainingNeed, router]);

  const needLine = useMemo(() => {
    if (remainingNeed <= 0) return null;
    return triLang(lang, {
      ru: `Нужно ещё ${remainingNeed} жемчужин — выбери пакет ниже.`,
      uk: `Не вистачає ще ${remainingNeed} перлин — обери пакет нижче.`,
      es: `Te faltan ${remainingNeed} ${shardsEsLc} — elige un paquete abajo.`,
      'pt-BR': `Faltam mais ${remainingNeed} pérolas — escolha um pacote abaixo.`,
      vi: `Bạn còn thiếu ${remainingNeed} xu — hãy chọn một gói bên dưới.`,
      id: `Masih kurang ${remainingNeed} koin — pilih paket di bawah.`,
      tr: `${remainingNeed} jeton daha gerekiyor — aşağıdan bir paket seç.`,
      pl: `Brakuje jeszcze ${remainingNeed} monet — wybierz pakiet poniżej.`,
    });
  }, [lang, remainingNeed, shardsEsLc]);

  const heroY = useMemo(
    () => heroEnt.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
    [heroEnt],
  );

  const buyPack = useCallback(
    async (packId: string, productId: string, shards: number) => {
      if (processingPackId) return;
      const operationAccount = captureAccountGeneration();
      const isOperationCurrent = () => (
        !!operationAccount.stableId
        && isCurrentAccountGeneration(operationAccount, operationAccount.stableId)
      );
      if (!isOperationCurrent()) return;
      setProcessingPackId(packId);
      try {
        if (isDevStoreBypass) {
          // зачем 2026-07-27 (владелец: «я в дев добавил 500, они ОБЯЗАНЫ быть
          // валидны»): раньше здесь была только локальная запись, и серверный
          // баланс не менялся — shardsApplyDelta отклоняет причину
          // 'shards_store_purchase' (её нет в каталоге начислений, он намеренно
          // закрыт от клиентских earn). Из-за этого турнир, читающий
          // users/{uid}.shards, видел старый баланс и отвечал «не хватает
          // жемчужин». Теперь начисляем ещё и на сервер, админской функцией.
          //
          // Порядок важен: локальная запись идёт ПЕРВОЙ и мгновенно двигает
          // баланс на экране (Optimistic UI), сервер догоняет следом.
          await addShardsRaw(shards, 'shards_store_purchase', { skipServerAwait: true });
          const serverGrant = await grantShardsOnServerForDev(shards);
          if (!serverGrant.ok && serverGrant.reason === 'not_admin') {
            // Честно говорим, что на сервере жемчужин НЕ прибавилось: иначе
            // владелец снова упрётся в «не хватает жемчужин» в турнире и будет
            // искать поломку там, где её нет.
            emitAppEvent('action_toast', {
              type: 'error',
              messageRu: `DEV: локально +${shards}, но на сервере НЕТ — нужен админ-доступ. Турнир не увидит эти жемчужины.`,
              messageUk: `DEV: локально +${shards}, але на сервері НЕМАЄ — потрібен адмін-доступ.`,
              messageEs: `DEV: +${shards} local, pero no en el servidor — se requiere acceso de admin.`,
              messagePtBr: `DEV: +${shards} local, mas não no servidor — precisa de acesso admin.`,
              messageVi: `DEV: +${shards} cục bộ, nhưng không có trên máy chủ — cần quyền admin.`,
              messageId: `DEV: +${shards} lokal, tetapi tidak di server — perlu akses admin.`,
              messageTr: `DEV: yerel +${shards}, ancak sunucuda yok — yönetici erişimi gerekiyor.`,
              messagePl: `DEV: lokalnie +${shards}, ale nie na serwerze — wymagany dostęp administratora.`,
            });
          }
          void trackShardPackPurchase(packId).catch(() => {});
          void trackActivity('shards_shop:purchase_success', {
            feature: 'revenue',
            screen: 'shards_shop',
            result: 'success',
            writeToFirestore: true,
            tags: { packId, productId, shards, devBypass: true },
          }).catch(() => {});
          await refreshBalance();
          void loadCardMarket({ background: true, force: true }).catch(() => {});
          emitAppEvent('action_toast', {
            type: 'success',
            messageRu: `DEV: начислено ${shards} жемчужин.`,
            messageUk: `DEV: нараховано ${shards} перлин.`,
            messageEs: `DEV: se añadieron ${shards} ${BRAND_SHARDS_ES.toLowerCase()}.`,
            messagePtBr: `DEV: ${shards} perlas adicionados.`,
            messageVi: `DEV: đã cộng ${shards} mảnh.`,
            messageId: `DEV: ${shards} shard ditambahkan.`,
            messageTr: `DEV: ${shards} parça eklendi.`,
            messagePl: `DEV: dodano ${shards} monet.`,
          });
          return;
        }
        await initRevenueCat(isOperationCurrent);
        if (!isOperationCurrent()) return;
        if (!(await syncRevenueCatIdentity(isOperationCurrent))) return;
        if (!isOperationCurrent()) return;
        const purchasesConfigured = await Purchases.isConfigured();
        if (!isOperationCurrent()) return;
        if (!purchasesConfigured) {
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Платежи временно недоступны. Подожди несколько секунд и попробуй снова.',
            messageUk: 'Платежі тимчасово недоступні. Зачекайте кілька секунд і спробуйте знову.',
            messageEs: 'Pagos no disponibles. Espera unos segundos e inténtalo de nuevo.',
            messagePtBr: 'Pagamentos temporariamente indisponíveis. Aguarde alguns segundos e tente novamente.',
            messageVi: 'Thanh toán tạm thời không khả dụng. Hãy chờ vài giây rồi thử lại.',
            messageId: 'Pembayaran sementara tidak tersedia. Tunggu beberapa detik lalu coba lagi.',
            messageTr: 'Ödemeler geçici olarak kullanılamıyor. Birkaç saniye bekleyip tekrar dene.',
            messagePl: 'Płatności są tymczasowo niedostępne. Poczekaj kilka sekund i spróbuj ponownie.',
          });
          return;
        }
        const pkg = packagesByProductId[productId];
        if (!pkg) {
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Магазин временно недоступен. Попробуй позже.',
            messageUk: 'Магазин недоступний. Перевірте Offering «shards» у RevenueCat.',
            messageEs:
              'Tienda no disponible. Revisa la oferta «shards» en RevenueCat.',
            messagePtBr: 'Loja indisponível. Verifique o Offering «shards» no RevenueCat.',
            messageVi: 'Cửa hàng không khả dụng. Hãy kiểm tra Offering «shards» trong RevenueCat.',
            messageId: 'Toko tidak tersedia. Periksa Offering «shards» di RevenueCat.',
            messageTr: 'Mağaza kullanılamıyor. RevenueCat içindeki «shards» Offering kontrol et.',
            messagePl: 'Sklep niedostępny. Sprawdź Offering «shards» w RevenueCat.',
          });
          return;
        }
        const beforePurchaseBalance = await getShardsBalance();
        if (!isOperationCurrent()) return;
        const purchaseOperation = await runRevenueCatOperationForGeneration(
          operationAccount,
          () => Purchases.purchasePackage(pkg),
        );
        if (purchaseOperation.status !== 'ok') return;
        const purchaseResult = purchaseOperation.value;
        // СРАЗУ записываем pending — даже если вебхук задержится или упадёт,
        // `resumePendingShardGrants` при следующем заходе в магазин/на главную
        // дотянет осколки. Без этого деньги списывались, а осколки молча терялись.
        const storeTransactionId = (purchaseResult as { transaction?: { transactionIdentifier?: string } } | undefined)
          ?.transaction?.transactionIdentifier?.trim() || null;
        const journalResult = await recordPendingShardGrant(operationAccount, {
          journalId: Crypto.randomUUID(),
          storeTransactionId: storeTransactionId,
          productId,
          expectedShards: shards,
          beforeBalance: beforePurchaseBalance,
          createdAtMs: Date.now(),
        }).catch(() => ({ status: 'storage_unavailable' as const }));
        if (!isOperationCurrent() || journalResult.status === 'stale') return;
        if (journalResult.status !== 'recorded') {
          await markPendingShardRecoveryNeeded(operationAccount).catch(() => false);
          if (!isOperationCurrent()) return;
          emitAppEvent('action_toast', {
            type: 'error',
            messageRu: 'Оплата прошла, автоматическое восстановление не сохранено; не повторяйте покупку, обновим баланс автоматически.',
            messageUk: 'Оплата пройшла, автоматичне відновлення не збережено; не повторюйте покупку, баланс оновимо автоматично.',
            messageEs: 'El pago se completó, pero no se guardó la recuperación automática. No repitas la compra; actualizaremos el saldo automáticamente.',
            messagePtBr: 'O pagamento foi concluído, mas a recuperação automática não foi salva. Não repita a compra; atualizaremos o saldo automaticamente.',
            messageVi: 'Thanh toán đã hoàn tất nhưng chưa lưu được khôi phục tự động. Đừng mua lại; số dư sẽ tự cập nhật.',
            messageId: 'Pembayaran berhasil, tetapi pemulihan otomatis tidak tersimpan. Jangan ulangi pembelian; saldo akan diperbarui otomatis.',
            messageTr: 'Ödeme tamamlandı ancak otomatik kurtarma kaydedilemedi. Satın almayı tekrarlamayın; bakiye otomatik güncellenecek.',
            messagePl: 'Płatność zakończona, ale automatyczne odzyskiwanie nie zostało zapisane. Nie kupuj ponownie; saldo zaktualizujemy automatycznie.',
          });
          const recoveredBalance = await waitForServerShardGrant(beforePurchaseBalance, shards, isOperationCurrent);
          if (!isOperationCurrent()) return;
          await syncAfterStoreAction(isOperationCurrent);
          if (!isOperationCurrent()) return;
          if (recoveredBalance >= beforePurchaseBalance + shards) {
            const eligibleAchievementBalance = await getShardAchievementEligibleBalance(recoveredBalance);
            if (!isOperationCurrent()) return;
            emitAppEvent('shards_balance_updated', {
              balance: recoveredBalance,
              op: 'earn',
              reason: 'shards_store_purchase',
              eligibleAchievementBalance,
            });
            await clearPendingShardRecoveryNeeded(operationAccount).catch(() => false);
            if (!isOperationCurrent()) return;
            emitAppEvent('action_toast', {
              type: 'success',
              // зачем: склонение по числу — «+1 жемчужина», а не «+1 жемчужин».
              messageRu: `Готово: +${shards} ${ruKnowledgeShardsAfterNumber(shards)}`,
              messageUk: `Готово: +${shards} ${ukKnowledgeShardsAfterNumber(shards)}`,
              messageEs: `Listo: +${shards} ${BRAND_SHARDS_ES.toLowerCase()}`,
              messagePtBr: `Pronto: +${shards} perlas`,
              messageVi: `Xong: +${shards} mảnh`,
              messageId: `Selesai: +${shards} shard`,
              messageTr: `Tamam: +${shards} parça`,
              messagePl: `Gotowe: +${shards} monet`,
            });
          }
          return;
        }
        logShardsPurchased(productId, shards);
        void trackShardPackPurchase(packId).catch(() => {});
        void trackActivity('shards_shop:purchase_success', {
          feature: 'revenue',
          screen: 'shards_shop',
          result: 'success',
          writeToFirestore: true,
          tags: { packId, productId, shards, devBypass: false },
        }).catch(() => {});
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Оплата подтверждена.',
          messageUk: 'Оплату підтверджено.',
          messageEs: 'Compra confirmada.',
          messagePtBr: 'Compra confirmada.',
          messageVi: 'Đã xác nhận giao dịch mua.',
          messageId: 'Pembelian dikonfirmasi.',
          messageTr: 'Satın alma onaylandı.',
          messagePl: 'Zakup potwierdzony.',
        });
        const nextBalance = await waitForServerShardGrant(beforePurchaseBalance, shards, isOperationCurrent);
        if (!isOperationCurrent()) return;
        await syncAfterStoreAction(isOperationCurrent);
        if (!isOperationCurrent()) return;
        const eligibleAchievementBalance = await getShardAchievementEligibleBalance(nextBalance);
        if (!isOperationCurrent()) return;
        emitAppEvent('shards_balance_updated', {
          balance: nextBalance,
          op: 'earn',
          reason: 'shards_store_purchase',
          eligibleAchievementBalance,
        });
        if (nextBalance >= beforePurchaseBalance + shards) {
          // Дошёл — закрываем pending запись.
          const cleared = await clearPendingShardGrant(operationAccount, journalResult.journalId).catch(() => false);
          if (!cleared || !isOperationCurrent()) return;
          emitAppEvent('action_toast', {
            type: 'success',
            // зачем: склонение по числу — «+1 жемчужина», а не «+1 жемчужин».
            messageRu: `Готово: +${shards} ${ruKnowledgeShardsAfterNumber(shards)}`,
            messageUk: `Готово: +${shards} ${ukKnowledgeShardsAfterNumber(shards)}`,
            messageEs: `Listo: +${shards} ${BRAND_SHARDS_ES.toLowerCase()}`,
            messagePtBr: `Pronto: +${shards} perlas`,
            messageVi: `Xong: +${shards} mảnh`,
            messageId: `Selesai: +${shards} shard`,
            messageTr: `Tamam: +${shards} parça`,
            messagePl: `Gotowe: +${shards} odłamków`,
          });
        } else {
          emitAppEvent('action_toast', {
            type: 'info',
            messageRu: 'Оплата принята. Жемчуг появится через пару минут.',
            messageUk: 'Оплату прийнято. Перлини з\'являться за пару хвилин.',
            messageEs: 'Pago recibido. Los perlas aparecerán en un par de minutos.',
            messagePtBr: 'Pagamento recebido. Os perlas aparecerão em alguns minutos.',
            messageVi: 'Đã nhận thanh toán. Mảnh sẽ xuất hiện sau vài phút.',
            messageId: 'Pembayaran diterima. Shard akan muncul dalam beberapa menit.',
            messageTr: 'Ödeme alındı. Parçalar birkaç dakika içinde görünecek.',
            messagePl: 'Płatność przyjęta. Odłamki pojawią się za kilka minut.',
          });
        }
      } catch (e: any) {
        if (!isOperationCurrent()) return;
        if (e?.userCancelled) return;
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не получилось оформить. Давай ещё раз.',
          messageUk: 'Не вдалося оформити. Спробуй ще раз.',
          messageEs: 'Error en la compra. Inténtalo de nuevo.',
          messagePtBr: 'Erro na compra. Tente novamente.',
          messageVi: 'Lỗi khi mua. Hãy thử lại.',
          messageId: 'Terjadi kesalahan pembelian. Coba lagi.',
          messageTr: 'Satın alma hatası. Tekrar dene.',
          messagePl: 'Błąd zakupu. Spróbuj ponownie.',
        });
      } finally {
        if (isOperationCurrent()) setProcessingPackId(null);
      }
    },
    [syncAfterStoreAction, packagesByProductId, processingPackId, refreshBalance, loadCardMarket, waitForServerShardGrant],
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
    // зачем: витрина обещала «35 осколков +5 бонус», хотя 35 — это УЖЕ база 30 + бонус 5
    // (см. shards_shop_catalog.ts и сервер SHARD_PACKS_BY_PRODUCT_ID: начисляется ровно 35).
    // Бонус считался дважды в подаче, человек ждал 40 и получал 35 — обман в витрине.
    // Теперь слева база (pack.shards), справа бонус (pack.bonusShards), сумма = totalShards
    // = ровно то, что зачислит сервер. totalShards остаётся для самой покупки и аналитики.
    const totalShards = totalShardsFromPack(pack);
    const pkg = packagesByProductId[pack.productId];
    const priceHint = pricesFromDisk[pack.productId];
    const priceLabel =
      pkg?.product.priceString ??
      priceHint?.priceString ??
      '--';
    const isPopular = pack.badge === 'popular';
    const isBest = pack.badge === 'best_value';
    const busy = processingPackId === pack.id;
    const anotherBusy = processingPackId != null && processingPackId !== pack.id;
    const canPurchase = isDevStoreBypass || !!pkg;
    const disabled = busy || anotherBusy || !canPurchase;
    const shardsLabel = shardTerm;
    const bonusLabel = triLang(lang, {
      ru: 'бонус',
      uk: 'бонус',
      es: 'bono',
      'pt-BR': 'bônus',
      vi: 'thưởng',
      id: 'bonus',
      tr: 'bonus',
      pl: 'bonus',
    });
    const paywallMood = isPaywallAtmosphereMode(themeMode);
    const rowHeight = 54;
    const rowRadius = isCompassTheme ? 8 : 12;
    const rowBg = isGoldTheme || isCompassTheme
      ? 'transparent'
      : paywallMood
        ? 'rgba(12, 16, 18, 0.78)'
        : t.bgCard;
    const borderColor = isBest
      ? (isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? COMPASS_RICH.hairlineStrong : `${t.gold}55`)
      : isPopular
        ? (isGoldTheme ? GOLD_RICH.hairline : isCompassTheme ? COMPASS_RICH.hairline : `${t.accent}50`)
        : paywallMood
          ? (isGoldTheme ? GOLD_RICH.hairlineQuiet : `${t.accent}22`)
          : isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border;
    const leftColor = isPopular || isBest
      ? (isCompassTheme ? COMPASS_RICH.champagne : isGoldTheme ? GOLD_RICH.champagne : t.textPrimary)
      : t.textPrimary;
    const rightColor = canPurchase ? t.textPrimary : t.textMuted;
    const rowIconSize = pack.id === 'starter' ? 30 : pack.id === 'pro' ? 38 : 34;

    return (
      <PressableScale
        style={{ width: cardW }}
        disabled={disabled}
        scaleTo={0.985}
        onPress={() => {
          void trackShardPackClick(pack.id).catch(() => {});
          void trackActivity('shards_shop:pack_click', {
            feature: 'revenue',
            screen: 'shards_shop',
            result: 'info',
            writeToFirestore: true,
            tags: { packId: pack.id, productId: pack.productId, shards: totalShards },
          }).catch(() => {});
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
              minHeight: rowHeight,
              borderRadius: rowRadius,
              borderWidth: 0,
              borderColor,
              overflow: 'hidden',
              backgroundColor: rowBg,
              ...(isGoldTheme ? goldShadow(1) : cardShadow),
            }}
          >
            {isGoldTheme && (
              <>
                <LinearGradient
                  pointerEvents="none"
                  colors={isBest || isPopular ? GOLD_GRADIENTS.selectedTile : GOLD_GRADIENTS.raisedTile}
                  locations={GOLD_SURFACE_LOCATIONS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <GoldBevel radius={rowRadius} intensity={isBest || isPopular ? 'strong' : 'normal'} />
              </>
            )}
            {isCompassTheme && (
              <>
                <LinearGradient
                  pointerEvents="none"
                  colors={isBest || isPopular ? COMPASS_GRADIENTS.selectedTile : COMPASS_GRADIENTS.raisedTile}
                  locations={COMPASS_SURFACE_LOCATIONS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <CompassBevel radius={rowRadius} intensity={isBest || isPopular ? 'strong' : 'normal'} />
              </>
            )}
            <View
              style={{
                minHeight: rowHeight,
                width: '100%',
                paddingHorizontal: 16,
                paddingVertical: 9,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View style={{ width: 42, height: 34, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Image
                    source={oskolokImageForShardIapRow(pack, themeMode)}
                    style={{ width: rowIconSize, height: rowIconSize }}
                    contentFit="contain"
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text
                    style={{
                      color: leftColor,
                      fontSize: f.body,
                      fontWeight: '900',
                      flexShrink: 1,
                      minWidth: 0,
                    }}
                    numberOfLines={2}
                  >
                    {pack.shards} {shardsLabel}
                  </Text>
                  {pack.bonusShards > 0 ? (
                    <View
                      style={{
                        flexShrink: 0,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 8,
                        backgroundColor: isGoldTheme
                          ? `${t.gold}26`
                          : isCompassTheme
                            ? `${t.accent}22`
                            : `${t.accent}1f`,
                        borderWidth: 0,
                        borderColor: isGoldTheme ? `${t.gold}66` : `${t.accent}55`,
                      }}
                    >
                      <Text
                        style={{
                          color: isGoldTheme ? t.gold : t.accent,
                          fontSize: Math.max(10, Math.round(f.caption ?? 11)),
                          fontWeight: '900',
                          letterSpacing: 0.2,
                        }}
                        numberOfLines={1}
                      >
                        +{pack.bonusShards} {bonusLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text
                style={{
                  color: rightColor,
                  fontSize: f.body,
                  fontWeight: canPurchase ? '900' : '800',
                  textAlign: 'right',
                  flexShrink: 0,
                  maxWidth: Math.max(96, Math.round(cardW * 0.38)),
                }}
                numberOfLines={1}
              >
                {busy ? '...' : priceLabel}
              </Text>
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
            <PressableScale onPress={() => safeRouterBack(router, '/(tabs)/home' as any)} scaleTo={0.92} withHaptic>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: isCompassTheme ? 9 : 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: shopSurfaceBg,
                  borderWidth: 0,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                  ...(isCompassTheme ? compassShadow(1) : getVolumetricShadow(themeMode, t, 1)),
                }}
              >
                <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
              </View>
            </PressableScale>
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '900', letterSpacing: 0.3 }} numberOfLines={1}>
                {triLang(lang, {
                  ru: 'Магазин',
                  uk: 'Магазин',
                  es: 'Tienda',
                  'pt-BR': 'Loja',
                  vi: 'Cửa hàng',
                  id: 'Toko',
                  tr: 'Mağaza',
                  pl: 'Sklep',
                })}
              </Text>
            </View>
            <LinearGradient
              colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : isCompassTheme ? COMPASS_GRADIENTS.raisedTile : [`${t.accent}35`, `${t.accent}10`]}
              locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: isCompassTheme ? 10 : 18, padding: 1 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: isCompassTheme ? 9 : 17,
                  backgroundColor: isGoldTheme || isCompassTheme ? 'transparent' : t.bgCard,
                  borderWidth: 0,
                  borderColor: isGoldTheme ? GOLD_RICH.hairline : isCompassTheme ? COMPASS_RICH.hairlineQuiet : `${t.accent}30`,
                  minWidth: 96,
                  justifyContent: 'center',
                }}
              >
                {isGoldTheme && <GoldBevel radius={17} intensity="normal" />}
                {isCompassTheme && <CompassBevel radius={9} intensity="normal" />}
                <Image source={coinIconForBalance(balance, themeMode)} style={{ width: 24, height: 24 }} contentFit="contain" accessibilityLabel={triLang(lang, { ru: `Баланс: ${balance} жемчужин`, uk: `Баланс: ${balance} перлин`, es: `Saldo: ${balance} perlas`, 'pt-BR': `Saldo: ${balance} pérolas`, vi: `Số dư: ${balance} ngọc trai`, id: `Saldo: ${balance} mutiara`, tr: `Bakiye: ${balance} inci`, pl: `Saldo: ${balance} pereł` })} />
                <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }}>{balance}</Text>
                {/* Бейдж активного 48-год подарунка — лише на вкладці «Картки», бо тільки там його можна обміняти. */}
                {hasActiveVoucher && shopTab === 'paid' && (
                  <Text style={{ color: t.gold, fontSize: 11, fontWeight: '800', marginLeft: 6 }} numberOfLines={1}>
                    {triLang(lang, {
                      ru: `🎁 беспл. ⏱${packTrialHours}ч`,
                      uk: `🎁 безкошт. ⏱${packTrialHours}год`,
                      es: `🎁 gratis ⏱${packTrialHours}h`,
                      'pt-BR': `🎁 grátis ⏱${packTrialHours}h`,
                      vi: `🎁 miễn phí ⏱${packTrialHours}g`,
                      id: `🎁 gratis ⏱${packTrialHours}j`,
                      tr: `🎁 ücretsiz ⏱${packTrialHours}sa`,
                      pl: `🎁 gratis ⏱${packTrialHours}godz.`,
                    })}
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
                  ? triLang(lang, {
                    ru: 'Жемчуг',
                    uk: 'Перлини',
                    es: BRAND_SHARDS_ES,
                    'pt-BR': 'Pérolas',
                    vi: 'Xu',
                    id: 'Koin',
                    tr: 'Jetonlar',
                    pl: 'Monety',
                  })
                  : triLang(lang, {
                    ru: 'Карточки',
                    uk: 'Картки',
                    es: 'Tarjetas',
                    'pt-BR': 'Cartões',
                    vi: 'Thẻ',
                    id: 'Kartu',
                    tr: 'Kartlar',
                    pl: 'Fiszki',
                  });
              return (
                <View key={key} style={{ flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' }}>
                  {/** Не flex:1 на Pressable — на Android ряд + stretch давали висоту ~0; ширина через батька flex:1 */}
                  <PressableScale onPress={() => setShopTab(key)} scaleTo={0.97} withHaptic style={{ width: '100%' }}>
                    <View
                      style={{
                        minHeight: 46,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: isCompassTheme ? 9 : 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isCompassTheme
                          ? active ? COMPASS_RICH.washStrong : COMPASS_RICH.charcoalRaised
                          : active ? `${t.accent}1C` : t.bgSurface,
                        borderWidth: 0,
                        borderColor: isCompassTheme ? (active ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : active ? `${t.accent}55` : t.border,
                        ...(active ? (isCompassTheme ? compassShadow(1) : getVolumetricShadow(themeMode, t, 1)) : {}),
                      }}
                    >
                      {isCompassTheme ? <CompassBevel radius={9} intensity={active ? 'strong' : 'normal'} /> : null}
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
            {/* Вход на «Биржу» — обмен монет на звёзды (спека §6).
                зачем: фича скрыта из публичной сборки по решению владельца, но код/маршрут
                остаются рабочими для dev/QA — тот же флаг, что и остальные dev-only входы. */}
            {false && ENABLE_DEV_TOOLS && (
            <View style={{ minWidth: 0, minHeight: 48, justifyContent: 'center' }}>
              <PressableScale
                onPress={() => router.push('/coin_exchange' as any)}
                scaleTo={0.97}
                withHaptic
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                  ru: 'Биржа: обмен жемчуга на звёзды',
                  uk: 'Біржа: обмін перлин на зірки',
                  es: 'Intercambio: cambia perlas por estrellas',
                  'pt-BR': 'Câmbio: troque pérolas por estrelas',
                  vi: 'Sàn giao dịch: đổi xu lấy sao',
                  id: 'Bursa: tukar koin dengan bintang',
                  tr: 'Borsa: jetonları yıldızla değiştir',
                  pl: 'Giełda: wymień monety na gwiazdki',
                })}
                style={{ width: '100%' }}
              >
                <View
                  style={{
                    minHeight: 46,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: isCompassTheme ? 9 : 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgSurface,
                    borderWidth: 0,
                    borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                  }}
                >
                  <Ionicons name="swap-horizontal" size={16} color={isCompassTheme ? COMPASS_RICH.champagne : t.accent} accessibilityElementsHidden importantForAccessibility="no" />
                  <Text style={{ fontSize: typeof f.caption === 'number' && f.caption > 0 ? f.caption : 13, lineHeight: 18, fontWeight: '800', color: t.textPrimary, letterSpacing: 0.2 }} numberOfLines={1}>
                    {triLang(lang, {
                      ru: 'Биржа',
                      uk: 'Біржа',
                      es: 'Cambio',
                      'pt-BR': 'Câmbio',
                      vi: 'Sàn',
                      id: 'Bursa',
                      tr: 'Borsa',
                      pl: 'Giełda',
                    })}
                  </Text>
                </View>
              </PressableScale>
            </View>
            )}
          </View>
          </View>

          {/**
            * Вкладка «Карточки» — собственный виртуализованный список (FlashList).
            * зачем: раньше обе вкладки жили внутри одного ScrollView и все наборы
            * рендерились разом — при 20-30 паках скролл ощутимо лагал. Теперь в памяти
            * только видимые карточки. Вкладка «Жемчуг» осталась в ScrollView ниже:
            * там короткий статичный контент, виртуализация не нужна.
            * Обе вкладки по-прежнему смонтированы всегда (display:none) — это сохраняет
            * состояние картинок и убирает «моргание» при переключении.
            */}
          <View style={{ flex: 1, display: shopTab === 'paid' ? 'flex' : 'none' }}>
            <FlashList
              data={marketPacks}
              keyExtractor={(item) => `mkt_${item.id}`}
              extraData={marketListExtraData}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 2 }}
              ListHeaderComponent={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {triLang(lang, {
                      ru: 'Наборы за жемчуг',
                      uk: 'Набори за перлини',
                      es: `Paquetes por ${shardsEsLc}`,
                      'pt-BR': 'Pacotes por pérolas',
                      vi: 'Gói đổi bằng xu',
                      id: 'Paket dengan koin',
                      tr: 'Jetonlarla paketler',
                      pl: 'Pakiety za monety',
                    })}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                </View>

              }
              ListEmptyComponent={
                  <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginBottom: 16 }}>
                    {!officialCardPacksEnabled
                      ? frenchCardPacksGateCopy.body
                        : triLang(lang, {
                          ru: 'Список наборов временно недоступен.',
                          uk: 'Список наборів тимчасово недоступний.',
                          es: 'La lista de paquetes no está disponible.',
                          'pt-BR': 'A lista de pacotes está temporariamente indisponível.',
                          vi: 'Danh sách gói tạm thời không khả dụng.',
                          id: 'Daftar paket sementara tidak tersedia.',
                          tr: 'Paket listesi geçici olarak kullanılamıyor.',
                          pl: 'Lista pakietów jest tymczasowo niedostępna.',
                        })}
                  </Text>
              }
              ListFooterComponent={
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                  }}
                >
                  <Ionicons name={storePaymentCopy.icon} size={16} color={t.textMuted} />
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                    {storePaymentCopy.cardPurchase}
                  </Text>
                </View>
              }
              renderItem={({ item: pack }) => {
                // зачем: пока owned-статус не подтверждён (ownedResolved=false — ни warm-кэш,
                // ни fetch ещё не отдали ответ), НЕ считаем пак «не куплен» — иначе все
                // карточки на миг показывают «не куплено» и через доли секунды перекрашиваются.
                const owned = ownedResolved && ownedPackIds.includes(pack.id);
                /** Цей пак можна забрати безкоштовно за активним 48-год подарунком (лише офіційні, не community). */
                const voucherEligible = hasActiveVoucher && !pack.isCommunityUgc && !owned;
                return (
                  <MarketPackCard
                    pack={pack}
                    lang={lang}
                    owned={owned}
                    busy={buyingShardPackId === pack.id}
                    voucherEligible={voucherEligible}
                    width={packCardWidth}
                    radius={shopRadius}
                    smallRadius={shopSmallRadius}
                    cardBg={shopCardBg}
                    surfaceBg={shopSurfaceBg}
                    cardShadow={cardShadow}
                    ctaShadow={packCtaShadow}
                    themeMode={themeMode}
                    t={t}
                    f={f}
                    shardsEsLc={shardsEsLc}
                    onPress={promptBuyCardPack}
                  />
                );
              }}
            />
          </View>

          {/**
            * Вкладка «Жемчуг». Дерево остаётся смонтированным при переключении
            * (display:none, а не размонтирование) — сохраняются картинки и анимации,
            * нет «моргания». На скрытой вкладке лупы стоят: см. active-пропсы ниже.
            */}
          <BouncyScrollView
            style={{ zIndex: 0, display: shopTab === 'catalog' ? 'flex' : 'none' }}
            decelerationRate="normal"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 40,
              paddingTop: 2,
              alignItems: 'stretch',
              flexGrow: 1,
              width: '100%',
            }}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            <View style={{ display: shopTab === 'catalog' ? 'flex' : 'none' }}>
              <>
            <RNAnim.View
              style={{
                marginBottom: 16,
                borderRadius: isCompassTheme ? 11 : 25,
                borderWidth: isPaywallAtmosphereMode(themeMode) || isCompassTheme ? 1 : 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : isPaywallAtmosphereMode(themeMode) ? `${t.accent}28` : 'transparent',
                opacity: heroEnt,
                transform: [{ translateY: heroY }],
              }}
            >
              <View style={{ position: 'relative', borderRadius: isCompassTheme ? 10 : 24, overflow: 'hidden', ...cardShadow }}>
                <LinearGradient colors={(isCompassTheme ? COMPASS_GRADIENTS.premiumPanel : t.cardGradient) as any} locations={isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
                  {isCompassTheme ? <CompassBevel radius={10} intensity="strong" /> : null}
                  <View style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: isCompassTheme ? COMPASS_RICH.wash : `${t.accent}12` }} />
                  <View style={{ position: 'absolute', bottom: -50, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: isCompassTheme ? COMPASS_RICH.copperWash : `${t.gold}10` }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <PulsingShardFrame width={72} height={72} borderRadius={22} big active={shopTab === 'catalog'}>
                      <View
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: isCompassTheme ? 10 : 22,
                          backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : isPaywallAtmosphereMode(themeMode) ? `${SHARD_TEAL}15` : `${t.bgSurface}cc`,
                          borderWidth: 0,
                          borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : isPaywallAtmosphereMode(themeMode) ? `${SHARD_TEAL}45` : `${t.accent}40`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Image source={coinIconForBalance(balance, themeMode)} style={{ width: 52, height: 52 }} contentFit="contain" />
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

            {!allPacksHavePackages && storeChecked && !isDevStoreBypass && (
              <View
                style={{
                  backgroundColor: t.wrongBg,
                  borderWidth: 0,
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
                  {storePaymentCopy.notReady}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                {triLang(lang, {
                  ru: 'Жемчуг за деньги',
                  uk: 'Перлини за гроші',
                  es: `${BRAND_SHARDS_ES} (pago)`,
                  'pt-BR': 'Pérolas (pagamento)',
                  vi: 'Xu (thanh toán)',
                  id: 'Koin (pembayaran)',
                  tr: 'Jetonlar (ödeme)',
                  pl: 'Monety (płatność)',
                })}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
            </View>

            {SHARDS_PACKS.map((pack, packIdx) => (
              <RNAnim.View
                key={pack.id}
                style={{
                  width: packCardWidth,
                  alignSelf: 'center',
                  marginBottom: 10,
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
                {storePaymentCopy.footerPayment}
              </Text>
            </View>

              </>
            </View>
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>
      {cardPackPaywallModal}
    </ScreenGradient>
  );
}
