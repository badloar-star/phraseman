import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnim,
  AppState,
  BackHandler,
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
import { useTheme, getVolumetricShadow } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useScreen } from '../hooks/use-screen';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { bundleLang, triLang, type Lang } from '../constants/i18n';
import {
  ruKnowledgeShardsAccusativeAfterNumber,
  ukKnowledgeShardsAccusativeAfterNumber,
} from '../constants/shard_plurals';
import { BRAND_SHARDS_ES } from '../constants/terms_es';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import PressableScale from '../components/PressableScale';
import { DebugLogger } from './debug-logger';
import GoldBevel from '../components/GoldBevel';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import { OLIVE_GRADIENTS, OLIVE_RICH, oliveShadow } from '../constants/oliveTheme';
import { commitConfirmedExternalShardEvent, getShardsBalance, loadShardsFromCloud, peekLastKnownShardsBalance } from './shards_system';
import { SHARDS_PACKS, totalShardsFromPack, type ShardsPack } from './shards_shop_catalog';
import { safeRouterBack } from './navigation_back';
// зачем (PM-057): покупок жемчуга за деньги больше нет, но старые оплаченные
// покупки (сделанные в прежних версиях) обязаны дойти — поэтому дотягивание
// pending-начислений остаётся, а запись новых pending-покупок убрана.
import { resumePendingShardGrants } from './shards_pending_grants';
import { logPearlStoreEntryBlocked } from './pearl_store_retired';
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
import {
  getPackGiftTrial,
  getPackTrialHoursLeft,
  hasActiveCommunityPackGiftVoucher,
} from './flashcards/pack_trial_gift';
import { syncFlashcardPackGiftState } from './flashcards/pack_gift_sync';
import { useCardPackShardPaywall } from './flashcards/useCardPackShardPaywall';
import { flashcardsOfficialPacksAvailableForTarget, frenchFlashcardsGateCopy } from './flashcards_target_gate';
import { DEV_IAP_BYPASS, IS_EXPO_GO } from './config';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from './account_generation';
import { trackActivity } from './app_activity';
import BouncyScrollView from '../components/BouncyScrollView';
import { FlashList } from '@shopify/flash-list';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { emitAppEvent, onAppEvent } from './events';
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

/**
 * Дев-сборка: вкладка «Жемчуг» остаётся как ДЕВ-инструмент начисления через
 * сервер (правило владельца 2026-07-27, tests/dev_shards_grant_contract.test.ts).
 * зачем (PM-057): в релизной сборке вкладки «Жемчуг» и покупки за деньги НЕТ —
 * жемчуг удаляется из 2.0 (D28), остаток компенсирует миграция PM-059. Дев-
 * начисление нужно, чтобы проверять эту миграцию и наборы за жемчуг (PM-060).
 */
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
  return mode === 'dark' || mode === 'gold' || mode === 'olive';
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
  iconName?: keyof typeof Ionicons.glyphMap;
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

function ShopNeonCta({ accent, accentSoft, correctText, busy, label, useLockIcon, iconName, shadow, fontSize, dense = false, shimmer = true, active = true }: ShopCtaProps) {
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
        <Ionicons name={iconName ?? (useLockIcon ? 'lock-closed' : 'bag-handle')} size={dense ? 16 : 18} color={correctText} />
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
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }}>
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
                <Ionicons name="gift-outline" size={18} color={t.gold} />
              ) : (
                <Image source={oskolokImageForPackShards(pack.priceShards)} style={{ width: 22, height: 22 }} contentFit="contain" />
              )}
              <Text style={{ color: voucherEligible ? t.gold : t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>
                {voucherEligible
                  ? triLang(lang, {
                    ru: 'беспл.',
                    uk: 'безкошт.',
                    es: 'gratis',
                    en: 'free',
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
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 4 }}>
            {desc}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 6 }}>
            {pack.cardCount} {triLang(lang, {
              ru: 'карточек',
              uk: 'карток',
              es: 'tarjetas',
              en: 'cards',
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
              en: 'Already in Cards',
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
                    ru: 'Использовать подарок',
                    uk: 'Використати подарунок',
                    es: 'Usar regalo',
                    en: 'Use gift',
                    'pt-BR': 'Usar presente',
                    vi: 'Dùng quà tặng',
                    id: 'Gunakan hadiah',
                    tr: 'Hediyeyi kullan',
                    pl: 'Użyj prezentu',
                  })
                  : triLang(lang, {
                    // зачем: цена пака произвольная, а слово было захардкожено во
                    // множественном («за 1 жемчужин»). «за» требует винительного.
                    ru: `Открыть за ${pack.priceShards} ${ruKnowledgeShardsAccusativeAfterNumber(pack.priceShards)}`,
                    uk: `Відкрити за ${pack.priceShards} ${ukKnowledgeShardsAccusativeAfterNumber(pack.priceShards)}`,
                    es: `Comprar por ${pack.priceShards} ${shardsEsLc}`,
                    en: `Unlock for ${pack.priceShards} shards`,
                    'pt-BR': `Comprar por ${pack.priceShards} pérolas`,
                    vi: `Mua với ${pack.priceShards} xu`,
                    id: `Beli dengan ${pack.priceShards} koin`,
                    tr: `${pack.priceShards} jeton ile satın al`,
                    pl: `Kup za ${pack.priceShards} monet`,
                  })
              }
              useLockIcon={false}
              iconName={voucherEligible ? 'gift-outline' : 'bag-handle'}
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
  const isOliveTheme = themeMode === 'olive';
  const shopRadius = 16;
  const shopSmallRadius = 12;
  const shopCardBg = t.bgCard;
  const shopSurfaceBg = t.bgSurface;
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
  }>(() => {
    if (effectiveOs === 'ios') {
      return {
        icon: 'logo-apple-appstore',
        cardPurchase: triLang(lang, {
          ru: 'Оплата — в App Store',
          uk: 'Оплата — в App Store',
          es: 'Compra — App Store',
          en: 'Purchase — App Store',
          'pt-BR': 'Compra — App Store',
          vi: 'Mua hàng — App Store',
          id: 'Pembelian — App Store',
          tr: 'Satın alma — App Store',
          pl: 'Zakup — App Store',
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
          en: 'Purchase — Google Play',
          'pt-BR': 'Compra — Google Play',
          vi: 'Mua hàng — Google Play',
          id: 'Pembelian — Google Play',
          tr: 'Satın alma — Google Play',
          pl: 'Zakup — Google Play',
        }),
      };
    }
    return {
      icon: 'shield-checkmark',
      cardPurchase: triLang(lang, {
        ru: 'Оплата — в магазине приложений',
        uk: 'Оплата — у магазині застосунків',
        es: 'Compra — tienda de apps',
        en: 'Purchase — app store',
        'pt-BR': 'Compra — loja de apps',
        vi: 'Mua hàng — cửa hàng ứng dụng',
        id: 'Pembelian — toko aplikasi',
        tr: 'Satın alma — uygulama mağazası',
        pl: 'Zakup — sklep z aplikacjami',
      }),
    };
  }, [effectiveOs, lang]);
  const params = useLocalSearchParams<{ need?: string; source?: string; tab?: string; returnTo?: string }>();
  const shardsShopRuntimeActive = useRuntimeActive();
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
  // зачем (PM-057): в релизе вкладки «Жемчуг» нет — всегда открываем «Карточки».
  const [shopTab, setShopTab] = useState<ShopTab>(() =>
    !isDevStoreBypass || params.tab === 'paid' || params.tab === 'cards' ? 'paid' : 'catalog',
  );
  const [balance, setBalance] = useState(() => peekLastKnownShardsBalance() ?? 0);
  const [packTrialHours, setPackTrialHours] = useState<number | null>(null);
  const [hasCommunityPackVoucher, setHasCommunityPackVoucher] = useState(false);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);
  useEffect(() => {
    const subscription = subscribeAccountGeneration(() => setProcessingPackId(null));
    return () => subscription.remove();
  }, []);
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

  const cardShadow = useMemo(() => getVolumetricShadow(themeMode, t, 2), [themeMode, t]);
  // зачем: тень кнопки в карточке набора раньше считалась инлайном на каждый рендер —
  // новый объект каждый раз ломал бы memo у MarketPackCard и заставлял перерисовывать
  // весь список при любом обновлении экрана (баланс, таб, загрузка).
  const packCtaShadow = useMemo(() => getVolumetricShadow(themeMode, t, 1), [themeMode, t]);

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
    const [tr, communityVoucher] = await Promise.all([
      getPackGiftTrial(studyTarget),
      hasActiveCommunityPackGiftVoucher(studyTarget),
    ]);
    setPackTrialHours(tr ? getPackTrialHoursLeft(tr.expiresAt) : null);
    setHasCommunityPackVoucher(communityVoucher);
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
    () => ({ ownedPackIds, ownedResolved, buyingShardPackId, hasActiveVoucher, hasCommunityPackVoucher, lang, themeMode, packCardWidth }),
    [ownedPackIds, ownedResolved, buyingShardPackId, hasActiveVoucher, hasCommunityPackVoucher, lang, themeMode, packCardWidth],
  );

  const { openPaywall: openCardPackPaywall, CardPackPaywallModalEl: cardPackPaywallModal } = useCardPackShardPaywall({
    balance,
    hasVoucher: hasActiveVoucher,
    hasCommunityVoucher: hasCommunityPackVoucher,
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
      void syncFlashcardPackGiftState().then(() => refreshPackTrial());
      let cancelled = false;
      void (async () => {
        const next = await getShardsBalance();
        if (cancelled) return;
        setBalance(next);
        if (shopEntryBalanceRef.current === null && needFromRoute > 0) {
          shopEntryBalanceRef.current = next;
        }
        // Дотягиваем pending-начисления из прошлых покупок (если вебхук задержался
        // или покупка сделана в прежней версии — PM-057). resumePendingShardGrants сам
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
    if (!shardsShopRuntimeActive || packTrialHours == null || packTrialHours <= 0) return;
    const id = setInterval(() => { void refreshPackTrial(); }, 60_000);
    return () => clearInterval(id);
  }, [packTrialHours, refreshPackTrial, shardsShopRuntimeActive]);

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
    // зачем (PM-057): вкладку «Жемчуг» по ссылке открываем только в дев-сборке.
    else if (isDevStoreBypass && (params.tab === 'catalog' || params.tab === 'shards')) setShopTab('catalog');
    else if (params.tab === 'catalog' || params.tab === 'shards') {
      logPearlStoreEntryBlocked('card_pack_insufficient', null);
    }
  }, [params.tab]);

  /**
   * Без entrance-анимации при смене вкладок: контент сразу видим (opacity=1, без translateY).
   * Раньше каждый tab-switch сбрасывал opacity всех карточек в 0 → мигание.
   */
  const heroEnt = useRef(new RNAnim.Value(1)).current;
  const shardRowEnt = useRef(SHARDS_PACKS.map(() => new RNAnim.Value(1))).current;
  const paidListEnt = useRef(new RNAnim.Value(1)).current;

  const shardTerm = triLang(lang, {
    ru: 'жемчужин',
    uk: 'перлин',
    en: 'pearls',
    es: shardsEsLc,
    'pt-BR': 'pérolas',
    vi: 'ngọc trai',
    id: 'mutiara',
    tr: 'inci',
    pl: 'pereł',
  });
  const heroTitle = triLang(lang, {
    ru: 'Жемчуг',
    uk: 'Перлини',
    en: 'Pearls',
    es: BRAND_SHARDS_ES,
    'pt-BR': 'Pérolas',
    vi: 'Ngọc trai',
    id: 'Mutiara',
    tr: 'İnciler',
    pl: 'Perły',
  });
  const heroSub = triLang(lang, {
    ru: 'Один пакет — больше действий: бонусы, клуб и быстрые покупки в приложении.',
    uk: 'Один пакет — більше дій: бонуси, клуб і швидкі покупки в застосунку.',
    en: 'One pack, more actions: boosts, club, and quick in-app purchases.',
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
      en: `You need ${remainingNeed} more pearls — pick a pack below.`,
      es: `Te faltan ${remainingNeed} ${shardsEsLc} — elige un paquete abajo.`,
      'pt-BR': `Faltam mais ${remainingNeed} pérolas — escolha um pacote abaixo.`,
      vi: `Bạn còn thiếu ${remainingNeed} viên ngọc trai — hãy chọn một gói bên dưới.`,
      id: `Masih kurang ${remainingNeed} mutiara — pilih paket di bawah.`,
      tr: `${remainingNeed} inci daha gerekiyor — aşağıdan bir paket seç.`,
      pl: `Brakuje jeszcze ${remainingNeed} pereł — wybierz pakiet poniżej.`,
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
          // ЖЕЛЕЗНОЕ ПРАВИЛО ВЛАДЕЛЬЦА (2026-07-27): дев-начисление ВСЕГДА
          // админское и ВСЕГДА идёт на сервер, на ЛЮБОЙ аккаунт. Раньше здесь
          // была только локальная запись — серверный баланс не менялся
          // (shardsApplyDelta отклоняет причину 'shards_store_purchase': её нет
          // в каталоге начислений, он намеренно закрыт от клиентских earn), и
          // турнир, читающий users/{uid}.shards, отвечал «не хватает жемчужин»
          // при «500» на экране. Правило закреплено контрактным тестом
          // tests/dev_shards_grant_contract.test.ts.
          //
          const serverGrant = await grantShardsOnServerForDev(shards);
          if (!serverGrant.ok) {
            // Честно говорим, что на сервере жемчужин НЕ прибавилось: иначе
            // владелец снова упрётся в «не хватает жемчужин» в турнире и будет
            // искать поломку там, где её нет.
            const tail = serverGrant.reason === 'disabled'
              ? 'дев-начисление выключено на сервере'
              : 'сервер не ответил';
            emitAppEvent('action_toast', {
              type: 'error',
              messageRu: `DEV: начисление не подтверждено (${tail}); баланс не менялся.`,
              messageUk: `DEV: нарахування не підтверджено (${tail}); баланс не змінено.`,
              messageEs: `DEV: concesión no confirmada (${tail}); el saldo no cambió.`,
              messagePtBr: `DEV: concessão não confirmada (${tail}); o saldo não mudou.`,
              messageVi: `DEV: khoản cấp chưa được xác nhận (${tail}); số dư không đổi.`,
              messageId: `DEV: pemberian belum dikonfirmasi (${tail}); saldo tidak berubah.`,
              messageTr: `DEV: ödül doğrulanmadı (${tail}); bakiye değişmedi.`,
              messagePl: `DEV: przyznanie niepotwierdzone (${tail}); saldo bez zmian.`,
            });
            return;
          } else {
            // зачем: раньше результат журнала ВЫБРАСЫВАЛСЯ. Сервер подтверждал
            // факт, но локальный баланс применяет именно клиентский журнал —
            // и если он отвечал failed (напр. stale_account_generation), экран
            // всё равно рапортовал «DEV: начислено N жемчужин», а жемчуг не
            // появлялся. Молчаливая ложь: владелец видел успех и пустой кошелёк.
            const applied = await commitConfirmedExternalShardEvent({
              source: 'admin_dev_grant',
              eventId: serverGrant.eventId,
              delta: serverGrant.granted,
              reason: 'dev_grant',
              grant: {
                kind: 'admin_dev_shards',
                subjectId: serverGrant.eventId,
                payload: { amount: serverGrant.granted },
              },
            });
            if (
              applied.status !== 'applied'
              && applied.status !== 'already-applied'
              && applied.status !== 'already-satisfied'
            ) {
              const failTail = applied.status === 'failed' ? applied.reason : applied.status;
              DebugLogger.error(
                'shards_shop.tsx:buyPack(dev)',
                new Error(`dev_grant_local_apply_failed:${failTail}`),
                'critical',
              );
              emitAppEvent('action_toast', {
                type: 'error',
                messageRu: `DEV: сервер подтвердил, но кошелёк не принял (${failTail}).`,
                messageUk: `DEV: сервер підтвердив, але гаманець не прийняв (${failTail}).`,
                messageEs: `DEV: el servidor confirmó, pero el monedero no lo aceptó (${failTail}).`,
                messagePtBr: `DEV: o servidor confirmou, mas a carteira não aceitou (${failTail}).`,
                messageVi: `DEV: máy chủ đã xác nhận nhưng ví không nhận (${failTail}).`,
                messageId: `DEV: server mengonfirmasi, tetapi dompet menolak (${failTail}).`,
                messageTr: `DEV: sunucu onayladı ama cüzdan kabul etmedi (${failTail}).`,
                messagePl: `DEV: serwer potwierdził, ale portfel nie przyjął (${failTail}).`,
              });
              return;
            }
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
        // зачем (PM-057, D28): покупка жемчуга за реальные деньги закрыта. Сюда
        // попадают только из дев-вкладки, её обслуживает ветка выше; если флаг
        // обхода почему-то сброшен — системный диалог магазина НЕ открываем.
        // Товары phraseman_shards_* остаются в сторах, пока их не снимет
        // владелец; старые оплаченные покупки дотягивает resumePendingShardGrants.
        logPearlStoreEntryBlocked('card_pack_insufficient', shards);
        console.warn('[PM-057] shards_shop:buyPack_blocked_release', JSON.stringify({ packId, productId, shards }));
        return;
      } catch (e: any) {
        if (!isOperationCurrent()) return;
        console.warn('[PM-057] shards_shop:buyPack_dev_failed', e instanceof Error ? e.message : String(e));
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
    [processingPackId, refreshBalance, loadCardMarket],
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
    // зачем (PM-057): вкладка живёт только в дев-сборке, цены стора больше не грузим.
    const priceLabel = 'DEV';
    const isPopular = pack.badge === 'popular';
    const isBest = pack.badge === 'best_value';
    const busy = processingPackId === pack.id;
    const anotherBusy = processingPackId != null && processingPackId !== pack.id;
    const canPurchase = isDevStoreBypass;
    const disabled = busy || anotherBusy || !canPurchase;
    const shardsLabel = shardTerm;
    const bonusLabel = triLang(lang, {
      ru: 'бонус',
      uk: 'бонус',
      en: 'bonus',
      es: 'bono',
      'pt-BR': 'bônus',
      vi: 'thưởng',
      id: 'bonus',
      tr: 'bonus',
      pl: 'bonus',
    });
    const paywallMood = isPaywallAtmosphereMode(themeMode);
    const rowHeight = 54;
    const rowRadius = 12;
    const rowBg = isGoldTheme || isOliveTheme
      ? 'transparent'
      : paywallMood
        ? 'rgba(12, 16, 18, 0.78)'
        : t.bgCard;
    const borderColor = isBest
      ? (isGoldTheme ? GOLD_RICH.hairlineStrong : `${t.gold}55`)
      : isPopular
        ? (isGoldTheme ? GOLD_RICH.hairline : `${t.accent}50`)
        : paywallMood
          ? (isGoldTheme ? GOLD_RICH.hairlineQuiet : `${t.accent}22`)
          : t.border;
    const leftColor = isPopular || isBest
      ? (isGoldTheme ? GOLD_RICH.champagne : isOliveTheme ? OLIVE_RICH.champagne : t.textPrimary)
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
            opacity: anotherBusy ? 0.48 : 1,
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
              ...(isGoldTheme ? goldShadow(1) : isOliveTheme ? oliveShadow(1) : cardShadow),
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
            {isOliveTheme && (
              <LinearGradient
                pointerEvents="none"
                colors={isBest || isPopular ? OLIVE_GRADIENTS.selectedPanel : OLIVE_GRADIENTS.raisedPanel}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}
              />
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
      {/* зачем: без edges SafeAreaView держал отступ и снизу — список «Карточек» упирался
          выше физического низа экрана. Экран вне таб-навигатора, снизу ничего не перекрывает,
          поэтому нижний край отдаём контенту; сверху статус-бар обходим как прежде. */}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
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
                  borderRadius: 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: shopSurfaceBg,
                  borderWidth: 0,
                  borderColor: t.border,
                  ...getVolumetricShadow(themeMode, t, 1),
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
                  en: 'Shop',
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
              colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : [`${t.accent}35`, `${t.accent}10`]}
              locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
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
                  backgroundColor: isGoldTheme ? 'transparent' : t.bgCard,
                  borderWidth: 0,
                  borderColor: isGoldTheme ? GOLD_RICH.hairline : `${t.accent}30`,
                  minWidth: 96,
                  justifyContent: 'center',
                }}
              >
                {isGoldTheme && <GoldBevel radius={17} intensity="normal" />}
                <Image source={coinIconForBalance(balance, themeMode)} style={{ width: 24, height: 24 }} contentFit="contain" accessibilityLabel={triLang(lang, { ru: `Баланс: ${balance} жемчужин`, uk: `Баланс: ${balance} перлин`, en: `Balance: ${balance} pearls`, es: `Saldo: ${balance} perlas`, 'pt-BR': `Saldo: ${balance} pérolas`, vi: `Số dư: ${balance} ngọc trai`, id: `Saldo: ${balance} mutiara`, tr: `Bakiye: ${balance} inci`, pl: `Saldo: ${balance} pereł` })} />
                <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }}>{balance}</Text>
                {/* Бейдж активного 48-год подарунка — лише на вкладці «Картки», бо тільки там його можна обміняти. */}
                {hasActiveVoucher && shopTab === 'paid' && (
                  <Text style={{ color: t.gold, fontSize: 11, fontWeight: '800', marginLeft: 6 }} numberOfLines={1}>
                    {triLang(lang, {
                      ru: `🎁 беспл. ⏱${packTrialHours}ч`,
                      uk: `🎁 безкошт. ⏱${packTrialHours}год`,
                      en: `🎁 free ⏱${packTrialHours}h`,
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

          {/* зачем (PM-057): переключатель вкладок только в дев-сборке — в релизе
              вкладки «Жемчуг» нет, остаётся одна «Карточки». */}
          {isDevStoreBypass && (
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
                    en: 'Pearls',
                    es: BRAND_SHARDS_ES,
                    'pt-BR': 'Pérolas',
                    vi: 'Ngọc trai',
                    id: 'Mutiara',
                    tr: 'İnciler',
                    pl: 'Perły',
                  })
                  : triLang(lang, {
                    ru: 'Карточки',
                    uk: 'Картки',
                    en: 'Cards',
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
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? `${t.accent}1C` : t.bgSurface,
                        borderWidth: 0,
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
          )}
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
          <View style={{ flex: 1, display: shopTab === 'paid' ? 'flex' : 'none', backgroundColor: 'transparent' }}>
            <FlashList decelerationRate="fast"
              style={{ flex: 1, backgroundColor: 'transparent' }}
              data={marketPacks}
              keyExtractor={(item) => `mkt_${item.id}`}
              extraData={marketListExtraData}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 + insets.bottom, paddingTop: 2 }}
              ListHeaderComponent={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                  <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {triLang(lang, {
                      ru: 'Наборы за жемчуг',
                      uk: 'Набори за перлини',
                      en: 'Packs for pearls',
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
                          en: 'The pack list is temporarily unavailable.',
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
                /** Активний подарунок позначає кожен ще не отриманий набір. */
                const voucherEligible = hasActiveVoucher && (!pack.isCommunityUgc || hasCommunityPackVoucher) && !owned;
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
          {/* зачем: BouncyScrollView прячет через display:none только ВНУТРЕННИЙ ScrollView, а его
              обёртка GestureWrap рендерится как <Animated.View style={{ flex: 1 }}> и остаётся в
              раскладке даже на скрытой вкладке. Из-за этого на вкладке «Карточки» в колонке было
              ДВА flex:1-сиблинга (список + невидимая обёртка «Жемчуга»), Yoga делила высоту 50/50,
              и нижняя половина экрана была мёртвой белой зоной (замер: список получал 321px вместо
              ~670px). Гасим всю вкладку целиком внешним View — скрытая вкладка выпадает из layout. */}
          {isDevStoreBypass && (
          <View style={{ flex: 1, display: shopTab === 'catalog' ? 'flex' : 'none' }}>
          <BouncyScrollView
            style={{ zIndex: 0 }}
            decelerationRate="fast"
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
                borderRadius: 25,
                borderWidth: isPaywallAtmosphereMode(themeMode) ? 1 : 0,
                borderColor: isPaywallAtmosphereMode(themeMode) ? `${t.accent}28` : 'transparent',
                opacity: heroEnt,
                transform: [{ translateY: heroY }],
              }}
            >
              <View style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', ...cardShadow }}>
                <LinearGradient colors={t.cardGradient as any} locations={undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
                  <View style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: `${t.accent}12` }} />
                  <View style={{ position: 'absolute', bottom: -50, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: `${t.gold}10` }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <PulsingShardFrame width={72} height={72} borderRadius={22} big active={shopTab === 'catalog'}>
                      <View
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 22,
                          backgroundColor: isPaywallAtmosphereMode(themeMode) ? `${SHARD_TEAL}15` : `${t.bgSurface}cc`,
                          borderWidth: 0,
                          borderColor: isPaywallAtmosphereMode(themeMode) ? `${SHARD_TEAL}45` : `${t.accent}40`,
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                {triLang(lang, {
                  ru: 'DEV: начисление жемчуга',
                  uk: 'DEV: нарахування перлин',
                  en: 'DEV: pearl grant',
                  es: 'DEV: pearl grant',
                  'pt-BR': 'DEV: pearl grant',
                  vi: 'DEV: pearl grant',
                  id: 'DEV: pearl grant',
                  tr: 'DEV: pearl grant',
                  pl: 'DEV: pearl grant',
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

              </>
            </View>
          </BouncyScrollView>
          </View>
          )}
        </ContentWrap>
      </SafeAreaView>
      {cardPackPaywallModal}
    </ScreenGradient>
  );
}
