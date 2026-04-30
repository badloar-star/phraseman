import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReportPackModal from '../../components/ReportPackModal';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getVolumetricShadow, useTheme } from '../../components/ThemeContext';
import type { Lang } from '../../constants/i18n';
import { BRAND_SHARDS_ES } from '../../constants/terms_es';
import { oskolokImageForPackShards } from '../oskolok';
import {
  packCategoryIonIcon,
  packDescriptionForInterface,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './marketplace';
import { getCardPackPaywallTheme } from './cardPackPaywallTheme';
import { bundledPackTilePng } from './packMarketplaceIcons';

export type CardPackPaywallMode = 'confirm' | 'insufficient' | 'voucher';

type Props = {
  visible: boolean;
  mode: CardPackPaywallMode;
  pack: FlashcardMarketPack;
  balance: number;
  lang: Lang;
  purchasing: boolean;
  onClose: () => void;
  onConfirmPurchase: () => void | Promise<void>;
  onGoToShards: () => void;
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function splitDescriptionToLines(desc: string): string[] {
  const parts = desc.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.length > 0 ? parts : [desc];
}

type PaywallModalCopy = {
  cancel: string;
  buy: string;
  buyShards: string;
  forShards: (n: number) => string;
  insufficientTitle: string;
  insufficientIntro: string;
  balanceBlockTitle: string;
  ctaSub: string;
  shopCtaSub: string;
  voucherKicker: string;
  voucherTitle: string;
  voucherIntro: string;
  voucherWarn: string;
  voucherCta: string;
  voucherCtaBusy: string;
  voucherCtaSub: string;
  packKindLabel: string;
  metaCards: (n: number) => string;
  shortageRemaining: (n: number) => string;
  needLabel: string;
  youHaveLabel: string;
  costLabel: string;
  shardsUnit: string;
  waitBusy: string;
  reportPack: string;
};

function paywallModalCopy(lang: Lang): PaywallModalCopy {
  if (lang === 'uk') {
    return {
      cancel: 'Скасувати',
      buy: 'Купити',
      buyShards: 'Купити осколки',
      forShards: (n: number) => `Купити за ${n} осколків`,
      insufficientTitle: 'Недостатньо осколків',
      insufficientIntro:
        'Поповніть баланс у магазині осколків — кнопка нижче відкриє вкладку з пакетами.',
      balanceBlockTitle: 'Для цього набору',
      ctaSub: 'Покупка в одне торкання',
      shopCtaSub: 'Пакети осколків у магазині',
      voucherKicker: '🎁 Безкоштовний набір',
      voucherTitle: 'Використати подарунок?',
      voucherIntro:
        'Цей набір додасться у «Картки» безкоштовно — ціну осколків можна не платити.',
      voucherWarn:
        '⚠️ Подарунок одноразовий: одразу після підтвердження він зникне і вже не повернеться.',
      voucherCta: '🎁 Використати подарунок',
      voucherCtaBusy: 'Активуємо…',
      voucherCtaSub: 'Подарунок «згорить» одразу після цього',
      packKindLabel: 'Набір',
      metaCards: (n: number) => `${n} карток`,
      shortageRemaining: (n: number) => `Не вистачає ще ${n} осколків`,
      needLabel: 'Потрібно',
      youHaveLabel: 'У вас',
      costLabel: 'Вартість',
      shardsUnit: 'осколків',
      waitBusy: 'Зачекайте…',
      reportPack: '⚐ Поскаржитися на набір',
    };
  }
  if (lang === 'es') {
    const S = BRAND_SHARDS_ES;
    return {
      cancel: 'Cancelar',
      buy: 'Comprar',
      buyShards: `Comprar ${S}`,
      forShards: (n: number) => `Comprar por ${n} ${S}`,
      insufficientTitle: `No tienes suficientes ${S}`,
      insufficientIntro:
        `Recarga saldo en la tienda de ${S}. El botón de abajo te lleva a los paquetes.`,
      balanceBlockTitle: 'Para este paquete',
      ctaSub: 'Compra con un solo toque',
      shopCtaSub: `Paquetes de ${S} en la tienda`,
      voucherKicker: '🎁 Paquete gratis',
      voucherTitle: '¿Usar el regalo?',
      voucherIntro:
        `Este paquete se añadirá a «Tarjetas» gratis; no gastarás ${S}.`,
      voucherWarn:
        '⚠️ El regalo es de un solo uso: al confirmar, desaparecerá y no podrás recuperarlo.',
      voucherCta: '🎁 Usar regalo',
      voucherCtaBusy: 'Activando…',
      voucherCtaSub: 'El regalo se consumirá al confirmar',
      packKindLabel: 'Paquete',
      metaCards: (n: number) => `${n} tarjetas`,
      shortageRemaining: (n: number) => `Te faltan ${n} ${S}`,
      needLabel: 'Necesitas',
      youHaveLabel: 'Tienes',
      costLabel: 'Precio',
      shardsUnit: S,
      waitBusy: 'Espera…',
      reportPack: '⚐ Reportar este paquete',
    };
  }
  return {
    cancel: 'Отмена',
    buy: 'Купить',
    buyShards: 'Купить осколки',
    forShards: (n: number) => `Купить за ${n} осколков`,
    insufficientTitle: 'Недостаточно осколков',
    insufficientIntro:
      'Пополните баланс в магазине осколков — кнопка ниже откроет вкладку с пакетами.',
    balanceBlockTitle: 'Для этого набора',
    ctaSub: 'Покупка в одно касание',
    shopCtaSub: 'Пакеты осколков в магазине',
    voucherKicker: '🎁 Бесплатный набор',
    voucherTitle: 'Использовать подарок?',
    voucherIntro:
      'Этот набор добавится в «Карточки» бесплатно — цену осколков платить не нужно.',
    voucherWarn:
      '⚠️ Подарок одноразовый: сразу после подтверждения он исчезнет и больше не вернётся.',
    voucherCta: '🎁 Использовать подарок',
    voucherCtaBusy: 'Активируем…',
    voucherCtaSub: 'Подарок «сгорит» сразу после этого',
    packKindLabel: 'Набор',
    metaCards: (n: number) => `${n} карточек`,
    shortageRemaining: (n: number) => `Не хватает ещё ${n} осколков`,
    needLabel: 'Нужно',
    youHaveLabel: 'У вас',
    costLabel: 'Стоимость',
    shardsUnit: 'осколков',
    waitBusy: 'Подождите…',
    reportPack: '⚐ Пожаловаться на набор',
  };
}

export default function CardPackShardPaywallModal({
  visible,
  mode,
  pack,
  balance,
  lang,
  purchasing,
  onClose,
  onConfirmPurchase,
  onGoToShards,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  /** Під світлішими схемами `textMuted` інколи “засмоктує” в фоні картки */
  const bodyTextColor = isLightTheme ? t.textSecond : t.textMuted;
  const subLabelColor = isLightTheme ? t.textSecond : t.textMuted;
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const str = useMemo(() => paywallModalCopy(lang), [lang]);
  const title = packTitleForInterface(pack, lang);
  const desc = packDescriptionForInterface(pack, lang);
  const descLines = useMemo(() => splitDescriptionToLines(desc), [desc]);
  const meta = str.metaCards(pack.cardCount);
  const iconName = packCategoryIonIcon(pack.category) as keyof typeof Ionicons.glyphMap;
  const packPng = bundledPackTilePng(pack.id);
  const paywallVisual = useMemo(
    () => getCardPackPaywallTheme(pack, { themeMode, isLight: isLightTheme }),
    [pack.id, pack.category, themeMode, isLightTheme],
  );
  const cardShadow = useMemo(() => getVolumetricShadow(themeMode, t, 3), [themeMode, t]);
  const [reportVisible, setReportVisible] = useState(false);
  const shardPriceImg = useMemo(() => oskolokImageForPackShards(pack.priceShards), [pack.priceShards]);

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(48);
  const sheetOpacity = useSharedValue(0);
  const ctaPulse = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const purchasingSV = useSharedValue(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeAfterSwipe = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCloseRef.current();
  }, []);

  useEffect(() => {
    purchasingSV.value = purchasing;
  }, [purchasing, purchasingSV]);

  const swipeOffDistance = useMemo(() => Math.max(420, winH * 0.55), [winH]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          if (purchasingSV.value) return;
          const t = e.translationY;
          dragTranslateY.value = t < 0 ? t * 0.12 : t;
        })
        .onEnd((e) => {
          'worklet';
          if (purchasingSV.value) {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
            return;
          }
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
              if (finished) {
                runOnJS(closeAfterSwipe)();
              }
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, purchasingSV, swipeOffDistance],
  );

  useEffect(() => {
    if (visible) {
      dragTranslateY.value = 0;
      backdropO.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      sheetY.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
      sheetOpacity.value = withTiming(1, { duration: 300 });
      ctaPulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })),
        -1,
        true,
      );
    } else {
      dragTranslateY.value = 0;
      backdropO.value = withTiming(0, { duration: 200 });
      sheetY.value = withTiming(40, { duration: 200 });
      sheetOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible, backdropO, sheetY, sheetOpacity, ctaPulse, dragTranslateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * 0.72,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  const ctaGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ctaPulse.value, [0, 1], [0.35, 0.7]),
  }));

  const handleClose = () => {
    if (purchasing) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const maxSheetH = Math.min(winH * 0.88, winH - insets.top - 8);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={handleClose}
          style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' }}
        >
          <Animated.View
            style={[
              { ...StyleSheet.absoluteFillObject, backgroundColor: paywallVisual.backdropBase },
              backdropStyle,
            ]}
          />
        </Pressable>

        <View
          style={{ flex: 1, justifyContent: 'flex-end' }}
          pointerEvents="box-none"
        >
          <Animated.View style={[{ maxHeight: maxSheetH, width: '100%' }, sheetStyle]}>
            <View style={{ paddingHorizontal: 12, paddingBottom: Math.max(12, insets.bottom) }}>
              <View style={{ position: 'relative' }}>
                <LinearGradient
                  colors={[...paywallVisual.outerGlow]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    borderRadius: 26,
                  }}
                />
                <View
                  style={[
                    {
                      borderRadius: 24,
                      overflow: 'hidden',
                      backgroundColor: t.bgCard,
                      borderWidth: 1,
                      borderColor: paywallVisual.borderAccent,
                    },
                    cardShadow,
                  ]}
                >
                  <LinearGradient
                    colors={[`${t.bgSurface}F2`, t.bgPrimary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ paddingBottom: 4 }}
                  >
                    <GestureDetector gesture={panGesture}>
                      <View
                        style={{
                          minHeight: 44,
                          paddingTop: 4,
                          paddingBottom: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <View
                          style={{
                            height: 4,
                            alignSelf: 'center',
                            width: 40,
                            borderRadius: 2,
                            backgroundColor: isLightTheme ? paywallVisual.handleColorLight : paywallVisual.handleColorDark,
                          }}
                        />
                      </View>
                    </GestureDetector>

                    <ScrollView
                      style={{ maxHeight: maxSheetH - 120 }}
                      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}
                      showsVerticalScrollIndicator
                      bounces
                    >
                      {mode === 'insufficient' ? (
                        <>
                          <Animated.View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
                            entering={FadeInDown.duration(400)}
                          >
                            <LinearGradient
                              colors={[...paywallVisual.iconBg]}
                              style={{
                                width: 84,
                                height: 84,
                                borderRadius: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: paywallVisual.iconBorder,
                              }}
                            >
                              {packPng ? (
                                <Image source={packPng} style={{ width: 64, height: 64 }} contentFit="contain" />
                              ) : (
                                <Ionicons name={iconName} size={42} color={t.accent} />
                              )}
                            </LinearGradient>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: t.textSecond,
                                  fontSize: f.label,
                                  fontWeight: '800',
                                  letterSpacing: 1.2,
                                  textTransform: 'uppercase',
                                }}
                                numberOfLines={1}
                              >
                                {str.packKindLabel}
                              </Text>
                              <Text
                                style={{ color: t.textPrimary, fontSize: f.h2 + 1, fontWeight: '900', marginTop: 2 }}
                                numberOfLines={3}
                              >
                                {title}
                              </Text>
                            </View>
                          </Animated.View>

                          <Animated.Text
                            entering={FadeInDown.delay(80).duration(420).easing(Easing.out(Easing.cubic))}
                            style={{
                              color: t.textSecond,
                              fontSize: f.sub,
                              fontWeight: '800',
                              marginTop: 14,
                              letterSpacing: 0.3,
                            }}
                          >
                            {str.insufficientTitle}
                          </Animated.Text>
                          <Animated.Text
                            entering={FadeInDown.delay(140).duration(420).easing(Easing.out(Easing.cubic))}
                            style={{
                              color: bodyTextColor,
                              fontSize: f.body,
                              lineHeight: 23,
                              marginTop: 10,
                            }}
                          >
                            {str.insufficientIntro}
                          </Animated.Text>

                          <Animated.View
                            entering={FadeInDown.delay(200).duration(400)}
                            style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                          >
                            <Image source={shardPriceImg} style={{ width: 28, height: 28 }} contentFit="contain" />
                            <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>
                              {str.shortageRemaining(Math.max(0, pack.priceShards - balance))}
                            </Text>
                          </Animated.View>

                          <Animated.View
                            entering={FadeInUp.delay(220).duration(400)}
                            style={{ marginTop: 18, alignItems: 'center' }}
                          >
                            <LinearGradient
                              colors={[...paywallVisual.priceGradient]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                borderRadius: 20,
                                paddingVertical: 16,
                                paddingHorizontal: 20,
                                width: '100%',
                                borderWidth: 1,
                                borderColor: paywallVisual.priceBorder,
                              }}
                            >
                              <Text
                                style={{
                                  color: paywallVisual.priceTextOnCard?.label ?? subLabelColor,
                                  fontSize: f.caption,
                                  fontWeight: '700',
                                  textAlign: 'center',
                                }}
                              >
                                {str.balanceBlockTitle}
                              </Text>
                              <View
                                style={{
                                  marginTop: 12,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                  <Text
                                    style={{
                                      color: paywallVisual.priceTextOnCard?.label ?? subLabelColor,
                                      fontSize: f.caption,
                                      fontWeight: '700',
                                    }}
                                  >
                                    {str.needLabel}
                                  </Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <Image
                                      source={oskolokImageForPackShards(pack.priceShards)}
                                      style={{ width: 28, height: 28 }}
                                      contentFit="contain"
                                    />
                                    <Text
                                      style={{
                                        color: paywallVisual.priceTextOnCard?.value ?? t.textPrimary,
                                        fontSize: f.numLg,
                                        fontWeight: '900',
                                      }}
                                    >
                                      {pack.priceShards}
                                    </Text>
                                  </View>
                                </View>
                                <View
                                  style={{
                                    width: StyleSheet.hairlineWidth,
                                    minHeight: 52,
                                    alignSelf: 'center',
                                    backgroundColor: paywallVisual.priceBorder,
                                    opacity: 0.85,
                                  }}
                                />
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                  <Text
                                    style={{
                                      color: paywallVisual.priceTextOnCard?.label ?? subLabelColor,
                                      fontSize: f.caption,
                                      fontWeight: '700',
                                    }}
                                  >
                                    {str.youHaveLabel}
                                  </Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <Image
                                      source={oskolokImageForPackShards(balance)}
                                      style={{ width: 28, height: 28 }}
                                      contentFit="contain"
                                    />
                                    <Text
                                      style={{
                                        color: paywallVisual.priceTextOnCard?.value ?? t.textPrimary,
                                        fontSize: f.numLg,
                                        fontWeight: '900',
                                      }}
                                    >
                                      {balance}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </LinearGradient>
                            <Text
                              style={{
                                color: subLabelColor,
                                fontSize: 11,
                                marginTop: 8,
                                textAlign: 'center',
                                letterSpacing: 0.2,
                              }}
                            >
                              {str.shopCtaSub}
                            </Text>
                          </Animated.View>
                        </>
                      ) : mode === 'voucher' ? (
                        <>
                          <Animated.View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
                            entering={FadeInDown.duration(400)}
                          >
                            <LinearGradient
                              colors={[...paywallVisual.iconBg]}
                              style={{
                                width: 84,
                                height: 84,
                                borderRadius: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: paywallVisual.iconBorder,
                              }}
                            >
                              {packPng ? (
                                <Image source={packPng} style={{ width: 64, height: 64 }} contentFit="contain" />
                              ) : (
                                <Ionicons name={iconName} size={42} color={t.accent} />
                              )}
                            </LinearGradient>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: t.gold,
                                  fontSize: f.label,
                                  fontWeight: '800',
                                  letterSpacing: 1.2,
                                  textTransform: 'uppercase',
                                }}
                                numberOfLines={1}
                              >
                                {str.voucherKicker}
                              </Text>
                              <Text
                                style={{ color: t.textPrimary, fontSize: f.h2 + 1, fontWeight: '900', marginTop: 2 }}
                                numberOfLines={3}
                              >
                                {title}
                              </Text>
                            </View>
                          </Animated.View>

                          <Animated.Text
                            entering={FadeInDown.delay(60).duration(420).easing(Easing.out(Easing.cubic))}
                            style={{
                              color: t.textPrimary,
                              fontSize: f.h3,
                              fontWeight: '800',
                              marginTop: 16,
                            }}
                          >
                            {str.voucherTitle}
                          </Animated.Text>
                          <Animated.Text
                            entering={FadeInDown.delay(120).duration(420).easing(Easing.out(Easing.cubic))}
                            style={{
                              color: bodyTextColor,
                              fontSize: f.body,
                              lineHeight: 23,
                              marginTop: 8,
                            }}
                          >
                            {str.voucherIntro}
                          </Animated.Text>

                          <Animated.View
                            entering={FadeInDown.delay(180).duration(400)}
                            style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                          >
                            {packPng ? (
                              <Image source={packPng} style={{ width: 28, height: 28 }} contentFit="contain" />
                            ) : (
                              <Ionicons name={iconName} size={22} color={t.textSecond} />
                            )}
                            <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>{meta}</Text>
                          </Animated.View>

                          <Animated.View
                            entering={FadeInDown.delay(240).duration(400)}
                            style={{
                              marginTop: 16,
                              borderRadius: 14,
                              padding: 14,
                              borderWidth: 1,
                              borderColor: `${t.gold}55`,
                              backgroundColor: `${t.gold}14`,
                            }}
                          >
                            <Text style={{ color: t.gold, fontSize: f.body, fontWeight: '700', lineHeight: 22 }}>
                              {str.voucherWarn}
                            </Text>
                          </Animated.View>
                        </>
                      ) : (
                        <>
                          <Animated.View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
                            entering={FadeInDown.duration(400)}
                          >
                            <LinearGradient
                              colors={[...paywallVisual.iconBg]}
                              style={{
                                width: 84,
                                height: 84,
                                borderRadius: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: paywallVisual.iconBorder,
                              }}
                            >
                              {packPng ? (
                                <Image source={packPng} style={{ width: 64, height: 64 }} contentFit="contain" />
                              ) : (
                                <Ionicons name={iconName} size={42} color={t.accent} />
                              )}
                            </LinearGradient>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: t.textSecond,
                                  fontSize: f.label,
                                  fontWeight: '800',
                                  letterSpacing: 1.2,
                                  textTransform: 'uppercase',
                                }}
                                numberOfLines={1}
                              >
                                {str.packKindLabel}
                              </Text>
                              <Text
                                style={{ color: t.textPrimary, fontSize: f.h2 + 1, fontWeight: '900', marginTop: 2 }}
                                numberOfLines={3}
                              >
                                {title}
                              </Text>
                            </View>
                          </Animated.View>

                          {descLines.map((line, i) => (
                              <Animated.Text
                                key={`d_${i}`}
                                entering={FadeInDown.delay(60 + i * 70).duration(450).easing(Easing.out(Easing.cubic))}
                                style={{
                                  color: bodyTextColor,
                                  fontSize: f.body,
                                  lineHeight: 23,
                                  marginTop: i === 0 ? 16 : 8,
                                }}
                              >
                                {line}
                              </Animated.Text>
                            ))}

                          <Animated.View
                            entering={FadeInDown.delay(120 + descLines.length * 40).duration(400)}
                            style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                          >
                            {packPng ? (
                              <Image source={packPng} style={{ width: 28, height: 28 }} contentFit="contain" />
                            ) : (
                              <Ionicons name={iconName} size={22} color={t.textSecond} />
                            )}
                            <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>{meta}</Text>
                          </Animated.View>

                          <Animated.View
                            entering={FadeInUp.delay(180 + descLines.length * 40).duration(400)}
                            style={{ marginTop: 18, alignItems: 'center' }}
                          >
                            <LinearGradient
                              colors={[...paywallVisual.priceGradient]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                borderRadius: 20,
                                paddingVertical: 14,
                                paddingHorizontal: 24,
                                width: '100%',
                                borderWidth: 1,
                                borderColor: paywallVisual.priceBorder,
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  color: paywallVisual.priceTextOnCard?.label ?? subLabelColor,
                                  fontSize: f.caption,
                                  fontWeight: '700',
                                }}
                              >
                                {str.costLabel}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                                <Image source={shardPriceImg} style={{ width: 32, height: 32 }} contentFit="contain" />
                                <Text
                                  style={{
                                    color: paywallVisual.priceTextOnCard?.value ?? t.textPrimary,
                                    fontSize: f.numLg,
                                    fontWeight: '900',
                                  }}
                                >
                                  {pack.priceShards}
                                </Text>
                                <Text
                                  style={{
                                    color: paywallVisual.priceTextOnCard?.unit ?? t.textMuted,
                                    fontSize: f.sub,
                                    fontWeight: '700',
                                  }}
                                >
                                  {str.shardsUnit}
                                </Text>
                              </View>
                            </LinearGradient>
                            <Text
                              style={{
                                color: subLabelColor,
                                fontSize: 11,
                                marginTop: 8,
                                textAlign: 'center',
                                letterSpacing: 0.2,
                              }}
                            >
                              {str.ctaSub}
                            </Text>
                          </Animated.View>
                        </>
                      )}
                    </ScrollView>

                    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 }}>
                      {mode === 'insufficient' ? (
                        <>
                          <View style={{ position: 'relative', marginBottom: 10 }}>
                            <AnimatedLinearGradient
                              colors={[paywallVisual.ctaGlowTop, 'rgba(0,0,0,0)']}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                              style={[
                                { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16 },
                                ctaGlowStyle,
                              ]}
                            />
                            <Pressable
                              onPress={() => {
                                if (purchasing) return;
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onGoToShards();
                              }}
                              disabled={purchasing}
                              style={({ pressed }) => ({
                                borderRadius: 16,
                                overflow: 'hidden',
                                opacity: pressed ? 0.92 : 1,
                                transform: pressed ? [{ scale: 0.99 }] : [],
                              })}
                            >
                              <LinearGradient
                                colors={[...paywallVisual.goShopCta]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                  paddingVertical: 16,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexDirection: 'row',
                                  gap: 10,
                                }}
                              >
                                <Image
                                  source={oskolokImageForPackShards(180)}
                                  style={{ width: 26, height: 26 }}
                                  contentFit="contain"
                                />
                                <Text style={{ color: paywallVisual.goShopForeground, fontSize: f.bodyLg, fontWeight: '900' }}>
                                  {str.buyShards}
                                </Text>
                              </LinearGradient>
                            </Pressable>
                          </View>
                          <Pressable onPress={handleClose} hitSlop={8} style={{ marginTop: 8, paddingVertical: 8, alignItems: 'center' }}>
                            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{str.cancel}</Text>
                          </Pressable>
                        </>
                      ) : mode === 'voucher' ? (
                        <>
                          <View style={{ position: 'relative' }}>
                            <AnimatedLinearGradient
                              colors={[`${t.gold}55`, 'rgba(0,0,0,0)']}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                              style={[
                                { position: 'absolute', left: -1, right: -1, top: -2, height: 28, borderRadius: 12 },
                                ctaGlowStyle,
                              ]}
                            />
                            <Pressable
                              onPress={() => {
                                if (purchasing) return;
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                void onConfirmPurchase();
                              }}
                              disabled={purchasing}
                              style={({ pressed }) => ({
                                borderRadius: 16,
                                overflow: 'hidden',
                                opacity: purchasing ? 0.85 : pressed ? 0.94 : 1,
                                transform: pressed ? [{ scale: 0.99 }] : [],
                              })}
                            >
                              <LinearGradient
                                colors={[t.gold, `${t.gold}DD`]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{
                                  paddingVertical: 16,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 10,
                                }}
                              >
                                {purchasing ? (
                                  <ActivityIndicator color={t.bgPrimary} size="small" />
                                ) : null}
                                <Text style={{ color: t.bgPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
                                  {purchasing ? str.voucherCtaBusy : str.voucherCta}
                                </Text>
                              </LinearGradient>
                            </Pressable>
                          </View>
                          <Text
                            style={{
                              color: subLabelColor,
                              fontSize: 11,
                              marginTop: 8,
                              textAlign: 'center',
                              letterSpacing: 0.2,
                            }}
                          >
                            {str.voucherCtaSub}
                          </Text>
                          <Pressable onPress={handleClose} hitSlop={8} style={{ marginTop: 4, paddingVertical: 8, alignItems: 'center' }}>
                            <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{str.cancel}</Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <View style={{ position: 'relative' }}>
                            <AnimatedLinearGradient
                              colors={[paywallVisual.ctaGlowTop, 'rgba(0,0,0,0)']}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                              style={[
                                { position: 'absolute', left: -1, right: -1, top: -2, height: 28, borderRadius: 12 },
                                ctaGlowStyle,
                              ]}
                            />
                            <Pressable
                              onPress={() => {
                                if (purchasing) return;
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                void onConfirmPurchase();
                              }}
                              disabled={purchasing}
                              style={({ pressed }) => ({
                                borderRadius: 16,
                                overflow: 'hidden',
                                opacity: purchasing ? 0.85 : pressed ? 0.94 : 1,
                                transform: pressed ? [{ scale: 0.99 }] : [],
                              })}
                            >
                              <LinearGradient
                                colors={[...paywallVisual.ctaColors]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{
                                  paddingVertical: 16,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 10,
                                }}
                              >
                                {purchasing ? (
                                  <ActivityIndicator color={paywallVisual.ctaForeground} size="small" />
                                ) : (
                                  <Image source={shardPriceImg} style={{ width: 24, height: 24 }} contentFit="contain" />
                                )}
                                <Text style={{ color: paywallVisual.ctaForeground, fontSize: f.bodyLg, fontWeight: '900' }}>
                                  {purchasing ? str.waitBusy : str.forShards(pack.priceShards)}
                                </Text>
                              </LinearGradient>
                            </Pressable>
                          </View>
                          <Pressable onPress={handleClose} hitSlop={8} style={{ marginTop: 8, paddingVertical: 8, alignItems: 'center' }}>
                            <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{str.cancel}</Text>
                          </Pressable>
                        </>
                      )}

                      {/* Apple Guideline 1.2 (UGC): кнопка скарги для community-наборів */}
                      {pack.isCommunityUgc ? (
                        <Pressable
                          onPress={() => setReportVisible(true)}
                          hitSlop={8}
                          style={{ marginTop: 6, paddingVertical: 6, alignItems: 'center' }}
                        >
                          <Text style={{ color: t.textGhost, fontSize: 12, textDecorationLine: 'underline' }}>
                            {str.reportPack}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </LinearGradient>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
      </GestureHandlerRootView>

      {pack.isCommunityUgc ? (
        <ReportPackModal
          visible={reportVisible}
          packId={pack.id}
          packTitle={title}
          authorStableId={pack.authorStableId ?? null}
          lang={lang}
          onClose={() => setReportVisible(false)}
        />
      ) : null}
    </Modal>
  );
}
