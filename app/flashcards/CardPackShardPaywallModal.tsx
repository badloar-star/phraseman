// зачем: isLightThemeMode использовался ниже (строка 232) без импорта — правка
// осталась недописанной и валила сборку, блокируя push всей ветки.
import { isLightThemeMode } from '../../constants/theme';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { hapticLightImpact, hapticMediumImpact } from '../../hooks/use-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from '../../components/SafeLinearGradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReportPackModal from '../../components/ReportPackModal';
import { hideCommunityPackOnDevice } from '../community_packs/communityPackHiddenStorage';
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
      cancelAnimation,
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
import { getVolumetricShadow, useTheme } from '../../components/ThemeContext';
import type { Lang } from '../../constants/i18n';
import { BRAND_SHARDS_ES } from '../../constants/terms_es';
// зачем: единая валюта — жемчуг; формы «жемчужина/жемчужины/жемчужин» берём из
// общего словаря, чтобы склонения не разъезжались между экранами.
import {
  ruKnowledgeShardsAccusativeAfterNumber,
  ruKnowledgeShardsGenitiveAfterNumber,
  ukKnowledgeShardsAccusativeAfterNumber,
  ukKnowledgeShardsGenitiveAfterNumber,
} from '../../constants/shard_plurals';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { oskolokImageForPackShards } from '../oskolok';
import {
  packCategoryIonIcon,
  packDescriptionForInterface,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './marketplace';
import { getCardPackPaywallTheme } from './cardPackPaywallTheme';
import { packTileImageForPack } from './packMarketplaceIcons';
import type { RuntimeStudyTarget } from '../target_storage_keys';

export type CardPackPaywallMode = 'confirm' | 'insufficient' | 'voucher';

type Props = {
  visible: boolean;
  mode: CardPackPaywallMode;
  pack: FlashcardMarketPack;
  balance: number;
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  purchasing: boolean;
  onClose: () => void;
  onConfirmPurchase: () => void | Promise<void>;
  onGoToShards: () => void;
  /** Після «Не показывать» у ReportPackModal — оновити каталог на хабі. */
  onCommunityPackHiddenOnDevice?: (optimisticPackId?: string | null) => void | Promise<void>;
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
  hidePack: string;
};

function paywallModalCopy(lang: Lang): PaywallModalCopy {
  if (lang === 'uk') {
    return {
      cancel: 'Скасувати',
      buy: 'Купити',
      buyShards: 'Купити перлини',
      // зачем: «за» тут управляет знахідним відмінком — «за 1 перлину», не «за 1 перлина».
      forShards: (n: number) => `Купити за ${n} ${ukKnowledgeShardsAccusativeAfterNumber(n)}`,
      insufficientTitle: 'Недостатньо перлин',
      insufficientIntro:
        'Поповніть баланс у магазині — кнопка нижче відкриє вкладку з пакетами.',
      balanceBlockTitle: 'Для цього набору',
      ctaSub: 'Покупка в одне торкання',
      shopCtaSub: 'Пакети перлин у магазині',
      voucherKicker: 'Безкоштовний набір',
      voucherTitle: 'Використати подарунок?',
      voucherIntro:
        'Цей набір назавжди додасться у «Картки» безкоштовно — перлини витрачати не потрібно.',
      voucherWarn:
        'Подарунок одноразовий: одразу після підтвердження він зникне і вже не повернеться.',
      voucherCta: 'Використати подарунок',
      voucherCtaBusy: '',
      voucherCtaSub: 'Подарунок «згорить» одразу після цього',
      packKindLabel: 'Набір',
      metaCards: (n: number) => `${n} карток`,
      // зачем: было русское «жемчужин» в украинском блоке + именительный падеж;
      // «не вистачає» управляет родовим — «не вистачає ще 1 перлини».
      shortageRemaining: (n: number) => `Не вистачає ще ${n} ${ukKnowledgeShardsGenitiveAfterNumber(n)}`,
      needLabel: 'Потрібно',
      youHaveLabel: 'У вас',
      costLabel: 'Вартість',
      shardsUnit: 'жемчужин',
      waitBusy: '',
      reportPack: '⚐ Поскаржитися на набір',
      hidePack: 'Не показувати мені',
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
      voucherKicker: 'Paquete gratis',
      voucherTitle: '¿Usar el regalo?',
      voucherIntro:
        `Este paquete se añadirá para siempre a «Tarjetas» gratis; no gastarás ${S}.`,
      voucherWarn:
        'El regalo es de un solo uso: al confirmar, desaparecerá y no podrás recuperarlo.',
      voucherCta: 'Usar regalo',
      voucherCtaBusy: '',
      voucherCtaSub: 'El regalo se consumirá al confirmar',
      packKindLabel: 'Paquete',
      metaCards: (n: number) => `${n} tarjetas`,
      shortageRemaining: (n: number) => `Te faltan ${n} ${S}`,
      needLabel: 'Necesitas',
      youHaveLabel: 'Tienes',
      costLabel: 'Precio',
      shardsUnit: S,
      waitBusy: '',
      reportPack: '⚐ Reportar este paquete',
      hidePack: 'No mostrarme',
    };
  }
  if (lang === 'pt-BR') {
    return {
      cancel: 'Cancelar', buy: 'Abrir', buyShards: 'Comprar pérolas',
      forShards: (n: number) => `Abrir por ${n} pérolas`,
      insufficientTitle: 'Pérolas insuficientes',
      insufficientIntro: 'Recarregue o saldo na loja. O botão abaixo abre os pacotes.',
      balanceBlockTitle: 'Para este pacote', ctaSub: 'Compra com um toque',
      shopCtaSub: 'Pacotes de pérolas na loja', voucherKicker: 'Pacote grátis',
      voucherTitle: 'Usar o presente?',
      voucherIntro: 'Este pacote será adicionado às suas «Cartas» gratuitamente e para sempre — você não gastará pérolas.',
      voucherWarn: 'O presente é de uso único: ele desaparecerá logo após a confirmação e não poderá ser recuperado.',
      voucherCta: 'Usar presente', voucherCtaBusy: '',
      voucherCtaSub: 'O presente será usado na confirmação', packKindLabel: 'Pacote',
      metaCards: (n: number) => `${n} cartões`, shortageRemaining: (n: number) => `Faltam ${n} pérolas`,
      needLabel: 'Necessário', youHaveLabel: 'Você tem', costLabel: 'Custo',
      shardsUnit: 'pérolas', waitBusy: '', reportPack: '⚐ Denunciar pacote', hidePack: 'Não mostrar novamente',
    };
  }
  if (lang === 'vi') {
    return {
      cancel: 'Hủy', buy: 'Mở', buyShards: 'Mua ngọc trai',
      forShards: (n: number) => `Mở với ${n} ngọc trai`,
      insufficientTitle: 'Không đủ ngọc trai',
      insufficientIntro: 'Hãy nạp thêm trong cửa hàng. Nút bên dưới sẽ mở các gói.',
      balanceBlockTitle: 'Cho gói này', ctaSub: 'Mua chỉ với một chạm',
      shopCtaSub: 'Gói ngọc trai trong cửa hàng', voucherKicker: 'Gói miễn phí',
      voucherTitle: 'Dùng quà tặng?',
      voucherIntro: 'Gói này sẽ được thêm miễn phí vĩnh viễn vào «Thẻ» — bạn không cần dùng ngọc trai.',
      voucherWarn: 'Quà chỉ dùng một lần: sau khi xác nhận, quà sẽ biến mất và không thể lấy lại.',
      voucherCta: 'Dùng quà', voucherCtaBusy: '', voucherCtaSub: 'Quà sẽ được dùng sau khi xác nhận',
      packKindLabel: 'Gói', metaCards: (n: number) => `${n} thẻ`,
      shortageRemaining: (n: number) => `Còn thiếu ${n} ngọc trai`, needLabel: 'Cần',
      youHaveLabel: 'Bạn có', costLabel: 'Giá', shardsUnit: 'ngọc trai', waitBusy: '',
      reportPack: '⚐ Báo cáo gói này', hidePack: 'Không hiển thị lại',
    };
  }
  if (lang === 'id') {
    return {
      cancel: 'Batal', buy: 'Buka', buyShards: 'Beli mutiara',
      forShards: (n: number) => `Buka seharga ${n} mutiara`,
      insufficientTitle: 'Mutiara tidak cukup',
      insufficientIntro: 'Isi saldo di toko. Tombol di bawah akan membuka paket.',
      balanceBlockTitle: 'Untuk paket ini', ctaSub: 'Beli dalam satu ketukan',
      shopCtaSub: 'Paket mutiara di toko', voucherKicker: 'Paket gratis',
      voucherTitle: 'Gunakan hadiah?',
      voucherIntro: 'Paket ini akan ditambahkan ke «Kartu» secara gratis untuk selamanya — kamu tidak perlu memakai mutiara.',
      voucherWarn: 'Hadiah hanya dapat digunakan sekali: setelah dikonfirmasi, hadiah akan hilang dan tidak bisa dikembalikan.',
      voucherCta: 'Gunakan hadiah', voucherCtaBusy: '', voucherCtaSub: 'Hadiah akan digunakan setelah konfirmasi',
      packKindLabel: 'Paket', metaCards: (n: number) => `${n} kartu`,
      shortageRemaining: (n: number) => `Kurang ${n} mutiara`, needLabel: 'Dibutuhkan',
      youHaveLabel: 'Kamu punya', costLabel: 'Harga', shardsUnit: 'mutiara', waitBusy: '',
      reportPack: '⚐ Laporkan paket ini', hidePack: 'Jangan tampilkan lagi',
    };
  }
  if (lang === 'tr') {
    return {
      cancel: 'İptal', buy: 'Aç', buyShards: 'İnci satın al',
      forShards: (n: number) => `${n} inci karşılığında aç`,
      insufficientTitle: 'Yeterli incin yok',
      insufficientIntro: 'Mağazadan bakiyeni doldur. Aşağıdaki düğme paketleri açar.',
      balanceBlockTitle: 'Bu paket için', ctaSub: 'Tek dokunuşla satın al',
      shopCtaSub: 'Mağazada inci paketleri', voucherKicker: 'Ücretsiz paket',
      voucherTitle: 'Hediyeyi kullan?',
      voucherIntro: 'Bu paket «Kartlar»ına ücretsiz olarak kalıcı biçimde eklenecek — inci harcaman gerekmiyor.',
      voucherWarn: 'Hediye tek kullanımlıktır: onaydan hemen sonra kaybolur ve geri alınamaz.',
      voucherCta: 'Hediyeyi kullan', voucherCtaBusy: '', voucherCtaSub: 'Hediye onayla birlikte kullanılır',
      packKindLabel: 'Paket', metaCards: (n: number) => `${n} kart`,
      shortageRemaining: (n: number) => `${n} inci eksik`, needLabel: 'Gerekli',
      youHaveLabel: 'Sende', costLabel: 'Fiyat', shardsUnit: 'inci', waitBusy: '',
      reportPack: '⚐ Paketi bildir', hidePack: 'Bir daha gösterme',
    };
  }
  if (lang === 'pl') {
    return {
      cancel: 'Anuluj', buy: 'Otwórz', buyShards: 'Kup perły',
      forShards: (n: number) => `Otwórz za ${n} pereł`,
      insufficientTitle: 'Za mało pereł',
      insufficientIntro: 'Doładuj saldo w sklepie. Przycisk poniżej otworzy pakiety.',
      balanceBlockTitle: 'Dla tego pakietu', ctaSub: 'Kup jednym dotknięciem',
      shopCtaSub: 'Pakiety pereł w sklepie', voucherKicker: 'Darmowy pakiet',
      voucherTitle: 'Użyć prezentu?',
      voucherIntro: 'Ten pakiet zostanie na zawsze dodany do «Kart» za darmo — nie wydasz pereł.',
      voucherWarn: 'Prezent jest jednorazowy: zaraz po potwierdzeniu zniknie i nie będzie można go odzyskać.',
      voucherCta: 'Użyj prezentu', voucherCtaBusy: '', voucherCtaSub: 'Prezent zostanie użyty po potwierdzeniu',
      packKindLabel: 'Pakiet', metaCards: (n: number) => `${n} kart`,
      shortageRemaining: (n: number) => `Brakuje ${n} pereł`, needLabel: 'Potrzebujesz',
      youHaveLabel: 'Masz', costLabel: 'Cena', shardsUnit: 'pereł', waitBusy: '',
      reportPack: '⚐ Zgłoś pakiet', hidePack: 'Nie pokazuj ponownie',
    };
  }
  return {
    cancel: 'Отмена',
    buy: 'Открыть',
    buyShards: 'Пополнить жемчуг',
    // зачем: «за» требует винительного — «Открыть за 1 жемчужину», не «за 1 жемчужина».
    forShards: (n: number) => `Открыть за ${n} ${ruKnowledgeShardsAccusativeAfterNumber(n)}`,
    insufficientTitle: 'Недостаточно жемчуга',
    insufficientIntro:
      'Пополни баланс в магазине — кнопка ниже откроет вкладку с пакетами.',
    balanceBlockTitle: 'Для этого набора',
    ctaSub: 'Откроется в одно касание',
    shopCtaSub: 'Пакеты жемчуга в магазине',
    voucherKicker: 'Набор в подарок',
    voucherTitle: 'Использовать подарок?',
    voucherIntro:
      'Этот набор навсегда добавится в «Карточки» бесплатно — жемчуг тратить не нужно.',
    voucherWarn:
      'Подарок одноразовый: сразу после подтверждения он исчезнет и больше не вернётся.',
    voucherCta: 'Использовать подарок',
    voucherCtaBusy: '',
    voucherCtaSub: 'Подарок «сгорит» сразу после этого',
    packKindLabel: 'Набор',
    metaCards: (n: number) => `${n} карточек`,
    // зачем: «не хватает» требует родительного — «не хватает ещё 1 жемчужины».
    shortageRemaining: (n: number) => `Не хватает ещё ${n} ${ruKnowledgeShardsGenitiveAfterNumber(n)}`,
    needLabel: 'Нужно',
    youHaveLabel: 'У тебя',
    costLabel: 'Нужно жемчуга',
    shardsUnit: 'жемчужин',
    waitBusy: '',
    reportPack: '⚐ Пожаловаться на набор',
    hidePack: 'Не показывать мне',
  };
}

export default function CardPackShardPaywallModal({
  visible,
  mode,
  pack,
  balance,
  lang,
  studyTarget,
  purchasing,
  onClose,
  onConfirmPurchase,
  onGoToShards,
  onCommunityPackHiddenOnDevice,
}: Props) {
  const { theme: t, f, themeMode } = useTheme();
  // зачем: стаб false отдавал sagePorcelain тёмную ручку шторки (#3C5A50)
  // вместо светлой #D1D9D1 на фарфоровой панели.
  const isLightTheme = isLightThemeMode(themeMode);
  const sheetCardBg = t.bgCard;
  const sheetSurfaceBg = t.bgSurface;
  const sheetPrimaryBg = t.bgPrimary;
  const bodyTextColor = t.textMuted;
  const subLabelColor = t.textMuted;
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: winH } = useWindowDimensions();
  const str = useMemo(() => paywallModalCopy(lang), [lang]);
  const title = packTitleForInterface(pack, lang);
  const desc = packDescriptionForInterface(pack, lang);
  const descLines = useMemo(() => splitDescriptionToLines(desc), [desc]);
  const meta = str.metaCards(pack.cardCount);
  const iconName = packCategoryIonIcon(pack.category) as keyof typeof Ionicons.glyphMap;
  const packPng = packTileImageForPack(pack);
  const paywallVisual = useMemo(
    () => getCardPackPaywallTheme(pack, { themeMode, isLight: isLightTheme }),
    [pack.id, pack.category, themeMode, isLightTheme],
  );
  const cardShadow = useMemo(() => getVolumetricShadow(themeMode, t, 3), [themeMode, t]);
  const [reportVisible, setReportVisible] = useState(false);
  const shardPriceImg = useMemo(() => oskolokImageForPackShards(pack.priceShards, themeMode), [pack.priceShards, themeMode]);

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(80);
  const sheetOpacity = useSharedValue(0);
  const ctaPulse = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const purchasingSV = useSharedValue(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeAfterSwipe = useCallback(() => {
    void hapticLightImpact();
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
      backdropO.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
      sheetY.value = withSpring(0, { damping: 18, stiffness: 90, mass: 0.9 });
      sheetOpacity.value = withTiming(1, { duration: 240 });
      ctaPulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })),
        -1,
        true,
      );
    } else {
      cancelAnimation(ctaPulse);
      ctaPulse.value = 0;
      dragTranslateY.value = 0;
      backdropO.value = withTiming(0, { duration: 200 });
      sheetY.value = withTiming(40, { duration: 200 });
      sheetOpacity.value = withTiming(0, { duration: 180 });
    }
    return () => cancelAnimation(ctaPulse);
  }, [visible, backdropO, sheetY, sheetOpacity, ctaPulse, dragTranslateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    // Подложка слабеет при оттягивании листа вниз (как в RegistrationPromptModal).
    opacity: backdropO.value * 0.72 * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
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
    void hapticLightImpact();
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
            <View style={{ paddingHorizontal: 12, paddingBottom: Math.max(12, bottomInset) }}>
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
                      backgroundColor: sheetCardBg,
                      borderWidth: 0,
                      borderColor: paywallVisual.borderAccent,
                    },
                    cardShadow,
                  ]}
                >
                  <LinearGradient
                    colors={[sheetSurfaceBg, sheetPrimaryBg]}
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
                      decelerationRate="normal"
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
                                borderWidth: 0,
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
                                borderWidth: 0,
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
                                      source={shardPriceImg}
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
                                      source={shardPriceImg}
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
                                borderWidth: 0,
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
                              borderWidth: 0,
                              borderColor: `${t.gold}55`,
                              backgroundColor: `${t.gold}14`,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                              <Ionicons name="alert-circle-outline" size={20} color={t.gold} />
                              <Text style={{ flex: 1, color: t.gold, fontSize: f.body, fontWeight: '700', lineHeight: 22 }}>
                                {str.voucherWarn}
                              </Text>
                            </View>
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
                                borderWidth: 0,
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
                                borderWidth: 0,
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
                                void hapticMediumImpact();
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
                                  source={shardPriceImg}
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
                                void hapticMediumImpact();
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
                                  <ActivityIndicator size="small" color={t.bgPrimary} />
                                ) : (
                                  <Ionicons name="gift-outline" size={22} color={t.bgPrimary} />
                                )}
                                <Text style={{ color: t.bgPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
                                  {str.voucherCta}
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
                                void hapticMediumImpact();
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
                                  <ActivityIndicator size="small" color={paywallVisual.ctaForeground} />
                                ) : (
                                  <Image source={shardPriceImg} style={{ width: 24, height: 24 }} contentFit="contain" />
                                )}
                                <Text style={{ color: paywallVisual.ctaForeground, fontSize: f.bodyLg, fontWeight: '900' }}>
                                  {str.forShards(pack.priceShards)}
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
                        <>
                          <Pressable
                            onPress={() => setReportVisible(true)}
                            hitSlop={8}
                            style={{ marginTop: 6, paddingVertical: 6, alignItems: 'center' }}
                          >
                            <Text style={{ color: t.textGhost, fontSize: 12, textDecorationLine: 'underline' }}>
                              {str.reportPack}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={async () => {
                              try {
                                void onCommunityPackHiddenOnDevice?.(pack.id);
                                handleClose();
                                await hideCommunityPackOnDevice(pack.id, studyTarget);
                                await onCommunityPackHiddenOnDevice?.(null);
                              } catch {
                                await onCommunityPackHiddenOnDevice?.(null);
                              }
                            }}
                            hitSlop={8}
                            style={{ marginTop: 2, paddingVertical: 6, alignItems: 'center' }}
                          >
                            <Text style={{ color: t.textGhost, fontSize: 12, textDecorationLine: 'underline' }}>
                              {str.hidePack}
                            </Text>
                          </Pressable>
                        </>
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
          studyTarget={studyTarget}
          onClose={() => setReportVisible(false)}
          onPackHiddenOnDevice={onCommunityPackHiddenOnDevice}
        />
      ) : null}
    </Modal>
  );
}
