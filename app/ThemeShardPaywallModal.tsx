// ═══════════════════════════════════════════════════════════════════════════
// ThemeShardPaywallModal — покупка темы оформления за жемчуг.
//
// зачем (владелец 2026-08-24): темы, кроме «Индиго»/«Нефрита» (бесплатные),
// «Оливы» (подписка) и «Золота» (награда лиги), продаются за 200 жемчужин, и
// ПОДПИСКА ИХ НЕ ОТКРЫВАЕТ. Это отдельная валютная покупка, поэтому экран
// построен по образцу CardPackShardPaywallModal (набор карточек за жемчуг), а
// НЕ по образцу подписочных пейволов A–G: там подписка, здесь валюта, у них
// разные юридические требования (у подписки обязателен дисклеймер автопродления,
// у разовой траты валюты его быть не должно).
//
// Отличие от пейвола наборов: превью темы рисуется НАСТОЯЩИМИ токенами палитры
// (как плитки в «Примерочной»), а не картинкой-обложкой — человек видит ровно
// то, что покупает.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../components/SafeLinearGradient';
import DuoPressable from '../components/DuoPressable';
import PressableHybrid from '../components/PressableHybrid';
import { getVolumetricShadow, useTheme } from '../components/ThemeContext';
import { isLightThemeMode, type Theme, type ThemeMode } from '../constants/theme';
import { triLang, type Lang } from '../constants/i18n';
import {
  ruKnowledgeShardsAccusativeAfterNumber,
  ruKnowledgeShardsGenitiveAfterNumber,
  ukKnowledgeShardsAccusativeAfterNumber,
  ukKnowledgeShardsGenitiveAfterNumber,
} from '../constants/shard_plurals';
import { BRAND_SHARDS_ES } from '../constants/terms_es';
import { hapticLightImpact, hapticMediumImpact } from '../hooks/use-haptics';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { oskolokImageForPackShards } from './oskolok';

export type ThemePaywallMode = 'confirm' | 'insufficient';

type Props = {
  visible: boolean;
  /** См. CardPackShardPaywallModal: у шита нет «классической» версии, всегда гибрид. */
  motionVariant?: 'hybrid';
  mode: ThemePaywallMode;
  /** Тема, которую покупают: её палитра рисует превью. */
  themeMode: ThemeMode;
  /** Название темы уже локализовано вызывающим экраном (там живёт словарь имён). */
  themeName: string;
  /** Иконка темы — тот же ассет, что на плитке в «Примерочной». */
  themeIcon: number;
  palette: Theme;
  priceShards: number;
  balance: number;
  lang: Lang;
  purchasing: boolean;
  onClose: () => void;
  onConfirmPurchase: () => void | Promise<void>;
  onGoToShards: () => void;
};

type ThemePaywallCopy = {
  kicker: string;
  intro: string;
  cancel: string;
  forShards: (n: number) => string;
  buying: string;
  ctaSub: string;
  insufficientTitle: string;
  insufficientIntro: string;
  shortageRemaining: (n: number) => string;
  balanceBlockTitle: string;
  needLabel: string;
  youHaveLabel: string;
  costLabel: string;
  buyShards: string;
  shopCtaSub: string;
};

// зачем: копирайт собран triLang-словарями (единый переводчик приложения) —
// так сторож непереведённого UI видит все восемь языков, и строки не разъезжаются
// с остальными экранами. Валютный пейвол не подключён к paywall_copy.ts: та
// система описывает ПОДПИСКУ, а здесь разовая трата внутренней валюты.
export function themePaywallCopy(lang: Lang): ThemePaywallCopy {
  const shardsEs = BRAND_SHARDS_ES;
  return {
    kicker: triLang(lang, {
      ru: 'ТЕМА ОФОРМЛЕНИЯ', uk: 'ТЕМА ОФОРМЛЕННЯ', es: 'TEMA VISUAL', 'pt-BR': 'TEMA VISUAL',
      vi: 'GIAO DIỆN', id: 'TEMA TAMPILAN', tr: 'GÖRÜNÜM TEMASI', pl: 'MOTYW WYGLĄDU',
    }),
    intro: triLang(lang, {
      ru: 'Тема меняет вид всего приложения — и остаётся твоей навсегда.',
      uk: 'Тема змінює вигляд усього застосунку — і залишається твоєю назавжди.',
      es: 'El tema cambia toda la app y se queda contigo para siempre.',
      'pt-BR': 'O tema muda o app inteiro — e fica com você para sempre.',
      vi: 'Giao diện đổi toàn bộ ứng dụng — và thuộc về bạn mãi mãi.',
      id: 'Tema mengubah seluruh aplikasi — dan jadi milikmu selamanya.',
      tr: 'Tema tüm uygulamanın görünümünü değiştirir — ve sonsuza dek senindir.',
      pl: 'Motyw zmienia całą aplikację — i zostaje z tobą na zawsze.',
    }),
    cancel: triLang(lang, {
      ru: 'Не сейчас', uk: 'Не зараз', es: 'Ahora no', 'pt-BR': 'Agora não',
      vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz',
    }),
    forShards: (n: number) => triLang(lang, {
      ru: `Открыть за ${n} ${ruKnowledgeShardsAccusativeAfterNumber(n)}`,
      uk: `Відкрити за ${n} ${ukKnowledgeShardsAccusativeAfterNumber(n)}`,
      es: `Desbloquear por ${n} ${shardsEs}`,
      'pt-BR': `Desbloquear por ${n} pérolas`,
      vi: `Mở khoá với ${n} ngọc trai`,
      id: `Buka seharga ${n} mutiara`,
      tr: `${n} inci ile aç`,
      pl: `Odblokuj za ${n} pereł`,
    }),
    buying: triLang(lang, {
      ru: 'Открываем…', uk: 'Відкриваємо…', es: 'Desbloqueando…', 'pt-BR': 'Desbloqueando…',
      vi: 'Đang mở khoá…', id: 'Membuka…', tr: 'Açılıyor…', pl: 'Odblokowuję…',
    }),
    ctaSub: triLang(lang, {
      ru: 'Разовая покупка — тема останется навсегда',
      uk: 'Разова покупка — тема залишиться назавжди',
      es: 'Compra única: el tema se queda para siempre',
      'pt-BR': 'Compra única: o tema fica para sempre',
      vi: 'Mua một lần — giữ mãi mãi',
      id: 'Pembelian sekali — tema milikmu selamanya',
      tr: 'Tek seferlik alım — tema kalıcı olarak senin',
      pl: 'Jednorazowy zakup — motyw zostaje na zawsze',
    }),
    insufficientTitle: triLang(lang, {
      ru: 'Не хватает жемчуга', uk: 'Не вистачає перлин', es: `No tienes suficientes ${shardsEs}`,
      'pt-BR': 'Pérolas insuficientes', vi: 'Không đủ ngọc trai', id: 'Mutiara tidak cukup',
      tr: 'İnci yetersiz', pl: 'Za mało pereł',
    }),
    insufficientIntro: triLang(lang, {
      ru: 'Эта тема стоит больше, чем есть на балансе. Пополни — и она твоя.',
      uk: 'Ця тема коштує більше, ніж є на балансі. Поповни — і вона твоя.',
      es: 'Este tema cuesta más de lo que tienes. Recarga y será tuyo.',
      'pt-BR': 'Este tema custa mais do que você tem. Recarregue e ele é seu.',
      vi: 'Giao diện này đắt hơn số bạn đang có. Nạp thêm là của bạn.',
      id: 'Tema ini lebih mahal dari saldomu. Isi ulang dan tema jadi milikmu.',
      tr: 'Bu tema bakiyenden pahalı. Yükle, tema senin olsun.',
      pl: 'Ten motyw kosztuje więcej, niż masz. Doładuj i będzie twój.',
    }),
    shortageRemaining: (n: number) => triLang(lang, {
      ru: `Не хватает ещё ${n} ${ruKnowledgeShardsGenitiveAfterNumber(n)}`,
      uk: `Не вистачає ще ${n} ${ukKnowledgeShardsGenitiveAfterNumber(n)}`,
      es: `Te faltan ${n} ${shardsEs}`,
      'pt-BR': `Faltam ${n} pérolas`,
      vi: `Còn thiếu ${n} ngọc trai`,
      id: `Kurang ${n} mutiara lagi`,
      tr: `${n} inci daha gerekiyor`,
      pl: `Brakuje jeszcze ${n} pereł`,
    }),
    balanceBlockTitle: triLang(lang, {
      ru: 'Жемчуг', uk: 'Перлини', es: shardsEs, 'pt-BR': 'Pérolas',
      vi: 'Ngọc trai', id: 'Mutiara', tr: 'İnci', pl: 'Perły',
    }),
    needLabel: triLang(lang, {
      ru: 'Нужно', uk: 'Потрібно', es: 'Necesitas', 'pt-BR': 'Precisa',
      vi: 'Cần', id: 'Butuh', tr: 'Gerekli', pl: 'Potrzeba',
    }),
    youHaveLabel: triLang(lang, {
      ru: 'У тебя', uk: 'У тебе', es: 'Tienes', 'pt-BR': 'Você tem',
      vi: 'Bạn có', id: 'Kamu punya', tr: 'Sende', pl: 'Masz',
    }),
    costLabel: triLang(lang, {
      ru: 'Цена темы', uk: 'Ціна теми', es: 'Precio del tema', 'pt-BR': 'Preço do tema',
      vi: 'Giá giao diện', id: 'Harga tema', tr: 'Tema fiyatı', pl: 'Cena motywu',
    }),
    buyShards: triLang(lang, {
      ru: 'Пополнить жемчуг', uk: 'Поповнити перлини', es: `Conseguir ${shardsEs}`,
      'pt-BR': 'Obter pérolas', vi: 'Nạp ngọc trai', id: 'Dapatkan mutiara',
      tr: 'İnci al', pl: 'Zdobądź perły',
    }),
    shopCtaSub: triLang(lang, {
      ru: 'Откроется магазин жемчуга', uk: 'Відкриється магазин перлин',
      es: `Se abrirá la tienda de ${shardsEs}`, 'pt-BR': 'A loja de pérolas será aberta',
      vi: 'Cửa hàng ngọc trai sẽ mở', id: 'Toko mutiara akan terbuka',
      tr: 'İnci mağazası açılacak', pl: 'Otworzy się sklep z perłami',
    }),
  };
}

export default function ThemeShardPaywallModal({
  visible,
  mode,
  themeMode,
  themeName,
  themeIcon,
  palette,
  priceShards,
  balance,
  lang,
  purchasing,
  onClose,
  onConfirmPurchase,
  onGoToShards,
}: Props) {
  const { theme: t, f, themeMode: appThemeMode } = useTheme();
  const insets = useStableSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const str = useMemo(() => themePaywallCopy(lang), [lang]);
  const shardImg = useMemo(() => oskolokImageForPackShards(priceShards, appThemeMode), [priceShards, appThemeMode]);

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(60);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const ctaPulse = useSharedValue(0);
  const closingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      backdropO.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      sheetOpacity.value = withTiming(1, { duration: 220 });
      dragTranslateY.value = 0;
      // Settle без отскока — контракт «гибридного» движения (tests/motion_hybrid_contract).
      sheetY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 });
      ctaPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      // зачем: бесконечный луп обязан останавливаться при скрытии — иначе он
      // продолжает крутиться в фоне и жжёт кадры (правило перф-библии).
      cancelAnimation(ctaPulse);
      ctaPulse.value = 0;
      backdropO.value = 0;
      sheetOpacity.value = 0;
      sheetY.value = 60;
      dragTranslateY.value = 0;
    }
    return () => {
      cancelAnimation(ctaPulse);
    };
  }, [visible, backdropO, sheetOpacity, sheetY, dragTranslateY, ctaPulse]);

  const handleClose = useCallback(() => {
    if (purchasing) return;
    void hapticLightImpact();
    onClose();
  }, [purchasing, onClose]);

  const panGesture = useMemo(() => Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) dragTranslateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 88 || e.velocityY > 900) {
        runOnJS(handleClose)();
        dragTranslateY.value = withTiming(0, { duration: 180 });
      } else {
        dragTranslateY.value = withSpring(0, { damping: 20, stiffness: 240 });
      }
    }), [dragTranslateY, handleClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * 0.72 * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));
  const ctaGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ctaPulse.value, [0, 1], [0.35, 0.7]),
  }));

  const isLight = isLightThemeMode(appThemeMode);
  const sheetCardBg = t.bgCard;
  const bodyTextColor = t.textMuted;
  // guard-ok: только показ «не хватает N» — баланс здесь не меняется, списание
  // целиком в commitShardCompositeOperation (журнал операций), клиент не считает баланс.
  const shortage = Math.max(0, priceShards - balance);
  const maxSheetH = Math.min(winH * 0.88, winH - insets.top - 8);
  const insufficient = mode === 'insufficient';

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
            accessibilityRole="button"
            accessibilityLabel={str.cancel}
            style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' }}
          >
            <Animated.View
              style={[
                { ...StyleSheet.absoluteFillObject, backgroundColor: isLight ? 'rgba(18,26,20,0.55)' : '#000' },
                backdropStyle,
              ]}
            />
          </Pressable>

          <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View style={[{ maxHeight: maxSheetH, width: '100%' }, sheetStyle]}>
              <View style={{ paddingHorizontal: 12, paddingBottom: Math.max(12, bottomInset) }}>
                <View style={{ position: 'relative' }}>
                  {/* зачем: свечение вокруг листа берётся из палитры ПОКУПАЕМОЙ темы —
                      человек видит её характер ещё до применения. */}
                  <LinearGradient
                    colors={[palette.cardGradient[0], palette.accent, palette.cardGradient[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 26, opacity: 0.5 }}
                  />
                  <View
                    style={[
                      {
                        borderRadius: 24,
                        overflow: 'hidden',
                        backgroundColor: sheetCardBg,
                        // Запрет владельца: контейнеры без обводки — только тон и тень.
                        borderWidth: 0,
                      },
                      getVolumetricShadow(appThemeMode, t, 3),
                    ]}
                  >
                    <GestureDetector gesture={panGesture}>
                      <View style={{ paddingTop: 10, alignItems: 'center' }}>
                        <View
                          style={{
                            width: 44,
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: isLight ? 'rgba(20,30,24,0.18)' : 'rgba(255,255,255,0.22)',
                          }}
                        />
                      </View>
                    </GestureDetector>

                    <ScrollView
                      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}
                      showsVerticalScrollIndicator={false}
                      bounces={false}
                    >
                      <Animated.View
                        entering={FadeInDown.duration(420).easing(Easing.out(Easing.cubic))}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
                      >
                        {/* Превью — настоящая иконка темы на её же градиенте, как плитка «Примерочной». */}
                        <LinearGradient
                          colors={palette.cardGradient}
                          start={{ x: 0.15, y: 0 }}
                          end={{ x: 0.85, y: 1 }}
                          style={{ width: 76, height: 76, borderRadius: 20, overflow: 'hidden' }}
                        >
                          <Image
                            source={themeIcon}
                            style={StyleSheet.absoluteFillObject}
                            contentFit="cover"
                            accessible={false}
                          />
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
                            {str.kicker}
                          </Text>
                          <Text style={{ color: t.textPrimary, fontSize: f.h2 + 1, fontWeight: '900', marginTop: 2 }}>
                            {themeName}
                          </Text>
                        </View>
                      </Animated.View>

                      <Animated.Text
                        entering={FadeInDown.delay(90).duration(420).easing(Easing.out(Easing.cubic))}
                        style={{ color: bodyTextColor, fontSize: f.body, lineHeight: 23, marginTop: 14 }}
                      >
                        {insufficient ? str.insufficientIntro : str.intro}
                      </Animated.Text>

                      {insufficient ? (
                        <Animated.View
                          entering={FadeInDown.delay(160).duration(400)}
                          style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                        >
                          <Image source={shardImg} style={{ width: 28, height: 28 }} contentFit="contain" accessible={false} />
                          <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>
                            {str.shortageRemaining(shortage)}
                          </Text>
                        </Animated.View>
                      ) : null}

                      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={{ marginTop: 18 }}>
                        <LinearGradient
                          colors={[palette.bgSurface, palette.bgSurface2]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, width: '100%', borderWidth: 0 }}
                        >
                          <Text
                            style={{ color: palette.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'center' }}
                          >
                            {insufficient ? str.balanceBlockTitle : str.costLabel}
                          </Text>
                          {insufficient ? (
                            <View
                              style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                              <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ color: palette.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                                  {str.needLabel}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                  <Image source={shardImg} style={{ width: 28, height: 28 }} contentFit="contain" accessible={false} />
                                  <Text style={{ color: palette.textPrimary, fontSize: f.numLg, fontWeight: '900' }}>
                                    {priceShards}
                                  </Text>
                                </View>
                              </View>
                              <View
                                style={{
                                  width: StyleSheet.hairlineWidth,
                                  minHeight: 52,
                                  alignSelf: 'center',
                                  backgroundColor: palette.border,
                                  opacity: 0.85,
                                }}
                              />
                              <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ color: palette.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                                  {str.youHaveLabel}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                  <Image source={shardImg} style={{ width: 28, height: 28 }} contentFit="contain" accessible={false} />
                                  <Text style={{ color: palette.textPrimary, fontSize: f.numLg, fontWeight: '900' }}>
                                    {balance}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ) : (
                            <View
                              style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                            >
                              <Image source={shardImg} style={{ width: 34, height: 34 }} contentFit="contain" accessible={false} />
                              <Text style={{ color: palette.textPrimary, fontSize: f.numLg, fontWeight: '900' }}>
                                {priceShards}
                              </Text>
                            </View>
                          )}
                        </LinearGradient>
                      </Animated.View>

                      <Animated.View entering={FadeInUp.delay(260).duration(400)} style={{ marginTop: 18 }}>
                        <View style={{ position: 'relative' }}>
                          <Animated.View
                            pointerEvents="none"
                            style={[
                              {
                                position: 'absolute',
                                left: 8,
                                right: 8,
                                top: 6,
                                bottom: -2,
                                borderRadius: 18,
                                backgroundColor: palette.accent,
                              },
                              ctaGlowStyle,
                            ]}
                          />
                          <DuoPressable
                            testID="theme-paywall-cta"
                            onPress={() => {
                              if (purchasing) return;
                              void hapticMediumImpact();
                              if (insufficient) { onGoToShards(); return; }
                              void onConfirmPurchase();
                            }}
                            disabled={purchasing}
                            withHaptic={false}
                            gradientColors={[palette.accent, palette.accent]}
                            style={{ minHeight: undefined, paddingVertical: 16, borderRadius: 16 }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                              {insufficient ? (
                                <Ionicons name="add-circle" size={20} color={palette.correctText} />
                              ) : (
                                <Image source={shardImg} style={{ width: 22, height: 22 }} contentFit="contain" accessible={false} />
                              )}
                              <Text style={{ color: palette.correctText, fontSize: f.body, fontWeight: '900' }}>
                                {insufficient
                                  ? str.buyShards
                                  : purchasing
                                    ? str.buying
                                    : str.forShards(priceShards)}
                              </Text>
                            </View>
                          </DuoPressable>
                        </View>
                        <Text
                          style={{
                            color: t.textGhost,
                            fontSize: f.caption,
                            fontWeight: '700',
                            textAlign: 'center',
                            marginTop: 10,
                          }}
                        >
                          {insufficient ? str.shopCtaSub : str.ctaSub}
                        </Text>
                      </Animated.View>

                      <PressableHybrid
                        onPress={handleClose}
                        disabled={purchasing}
                        style={{ marginTop: 12, paddingVertical: 14, alignItems: 'center', borderRadius: 14 }}
                      >
                        <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '800' }}>
                          {str.cancel}
                        </Text>
                      </PressableHybrid>
                    </ScrollView>
                  </View>
                </View>
              </View>
            </Animated.View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
