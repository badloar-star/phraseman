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
import { useLineScale } from '../../hooks/useLineScale';
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
// зачем: единая валюта — монеты; формы «монета/монеты/монет» берём из
// общего словаря, чтобы склонения не разъезжались между экранами.
import {
  ruKnowledgeShardsAccusativeAfterNumber,
  ruKnowledgeShardsGenitiveAfterNumber,
  ukKnowledgeShardsAccusativeAfterNumber,
  ukKnowledgeShardsGenitiveAfterNumber,
} from '../../constants/shard_plurals';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import {
  packCategoryIonIcon,
  packDescriptionForInterface,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './marketplace';
import { getCardPackPaywallTheme } from './cardPackPaywallTheme';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { packTileImageForPack } from './packMarketplaceIcons';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import DuoPressable from '../../components/DuoPressable';
import { pluralWithCount, pluralWord } from '../../constants/plural'; // зачем (проход по склейке «число + слово», 12.10): число и существительное согласуются через общий помощник
import PressableHybrid from '../../components/PressableHybrid';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0)'; // theme-exempt: прозрачный конец градиента (нулевая альфа) — не цвет
const EXEMPT_COLOR_2 = 'rgba(0,0,0,0)'; // theme-exempt: прозрачный конец градиента (нулевая альфа) — не цвет
const EXEMPT_COLOR_3 = 'rgba(0,0,0,0)'; // theme-exempt: прозрачный конец градиента (нулевая альфа) — не цвет

export type CardPackPaywallMode = 'confirm' | 'insufficient' | 'voucher';

type Props = {
  visible: boolean;
  /**
   * зачем: у этого шита никогда не было «классической» версии — он изначально
   * построен как гибрид «Световод» (Reanimated, settle без отскока, клавиши
   * DuoPressable/PressableHybrid). Проп существует для единообразия контракта
   * движения (tests/motion_hybrid_contract) и всегда 'hybrid'.
   */
  motionVariant?: 'hybrid';
  mode: CardPackPaywallMode;
  pack: FlashcardMarketPack;
  balance: number;
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  purchasing: boolean;
  onClose: () => void;
  onConfirmPurchase: () => void | Promise<void>;
  // зачем (аудит #6, 15.10; запрет владельца 24.08 «магазина монет нет»): «Пополнить» без обработчика вело в никуда — без обработчика кнопки нет, остаётся «Отмена»
  onGoToShards?: () => void;
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

/**
 * Podpisi dlya RUN (vladelets 2026-09-17, ekran 8 maketa docs/design/runes).
 * Naborы soobshchestva prodayutsya za runy, a ne za zhemchug, poetomu chetyre
 * stroki s nazvaniem valyuty podmenyayutsya. Ostal'noe obshchee s zhemchugom.
 */
function triRunesWord(lang: Lang): string {
  const map: Record<string, string> = {
    ru: 'монет', uk: 'монет', en: 'coins', es: 'monedas', 'pt-BR': 'moedas',
    vi: 'xu', id: 'koin', tr: 'jeton', pl: 'monet',
  };
  return map[lang] ?? map.en;
}

function triRunesBuyFor(lang: Lang, n: number): string {
  const map: Record<string, string> = {
    ru: `Открыть за ${pluralWithCount('ru', n, { one: 'монету', few: 'монеты', many: 'монет' })}`,
    uk: `Відкрити за ${pluralWithCount('uk', n, { one: 'монету', few: 'монети', many: 'монет' })}`,
    en: `Unlock for ${n} ${pluralWord('en', n, { one: 'coin', few: 'coins', many: 'coins' })}`,
    es: `Abrir por ${pluralWithCount('es', n, { one: 'moneda', few: 'monedas', many: 'monedas' })}`,
    'pt-BR': `Abrir por ${pluralWithCount('pt-BR', n, { one: 'moeda', few: 'moedas', many: 'moedas' })}`,
    vi: `Mở với ${n} xu`,
    id: `Buka seharga ${n} koin`,
    tr: `${n} jeton karşılığında aç`,
    pl: `Otwórz za ${pluralWithCount('pl', n, { one: 'monetę', few: 'monety', many: 'monet' })}`,
  };
  return map[lang] ?? map.en;
}

function triRunesShort(lang: Lang): string {
  const map: Record<string, string> = {
    ru: 'Не хватает монет', uk: 'Не вистачає монет', en: 'Not enough coins',
    es: 'Faltan monedas', 'pt-BR': 'Faltam moedas', vi: 'Không đủ xu',
    id: 'Koin tidak cukup', tr: 'Jeton yetersiz', pl: 'Za mało monet',
  };
  return map[lang] ?? map.en;
}

/** Runy ne pokupayut za den'gi - ih zarabatyvayut. Poetomu «kak zarabotat'», ne «kupit'». */
function triRunesTopUp(lang: Lang): string {
  const map: Record<string, string> = {
    ru: 'Как заработать монеты', uk: 'Як заробити монети', en: 'How to earn coins',
    es: 'Cómo ganar monedas', 'pt-BR': 'Como ganhar moedas', vi: 'Cách kiếm xu',
    id: 'Cara mendapatkan koin', tr: 'Jeton nasıl kazanılır', pl: 'Jak zdobyć monety',
  };
  return map[lang] ?? map.en;
}

function paywallModalCopy(lang: Lang): PaywallModalCopy {
  // зачем (PM-008, Q74): жемчуг и «подарок» в 2.0 удалены — единственная валюта монеты,
  // а режим voucher описывает «бесплатное открытие», без слова «подарок».
  // зачем (координатор 12.10, подготовка к английскому интерфейсу): без этого блока en падал в русскую ветку ниже.
  if (lang === 'en') {
    return {
      cancel: 'Cancel',
      buy: 'Buy',
      buyShards: 'How to earn coins',
      forShards: (n: number) => `Buy for ${n} ${n === 1 ? 'coin' : 'coins'}`,
      insufficientTitle: 'Not enough coins',
      insufficientIntro: 'Coins are earned in lessons and training — the button below shows how.',
      balanceBlockTitle: 'For this pack',
      ctaSub: 'One-tap purchase',
      shopCtaSub: 'Coins come from lessons and training',
      voucherKicker: 'Free pack',
      voucherTitle: 'Unlock for free?',
      voucherIntro: 'This pack will be added to Cards for good, free — no coins needed.',
      voucherWarn: 'The free unlock is one-time: it is used up right after you confirm.',
      voucherCta: 'Unlock for free',
      voucherCtaBusy: '',
      voucherCtaSub: 'Once — after you confirm',
      packKindLabel: 'Pack',
      metaCards: (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`,
      shortageRemaining: (n: number) => `${n} more ${n === 1 ? 'coin' : 'coins'} needed`,
      needLabel: 'Needed',
      youHaveLabel: 'You have',
      costLabel: 'Cost',
      shardsUnit: 'coins',
      waitBusy: '',
      reportPack: 'Report this pack',
      hidePack: 'Hide from me',
    };
  }
  if (lang === 'uk') {
    return {
      cancel: 'Скасувати',
      buy: 'Купити',
      buyShards: 'Як заробити монети',
      // зачем: «за» тут управляет знахідним відмінком — «за 1 монету», не «за 1 монета».
      forShards: (n: number) => `Купити за ${n} ${ukKnowledgeShardsAccusativeAfterNumber(n)}`,
      insufficientTitle: 'Недостатньо монет',
      insufficientIntro:
        'Монети заробляються в уроках і тренуваннях — кнопка нижче покаже, як.',
      balanceBlockTitle: 'Для цього набору',
      ctaSub: 'Покупка в одне торкання',
      shopCtaSub: 'Монети — за уроки й тренування',
      voucherKicker: 'Безкоштовний набір',
      voucherTitle: 'Відкрити безкоштовно?',
      voucherIntro:
        'Цей набір назавжди додасться у «Картки» безкоштовно — монети витрачати не потрібно.',
      voucherWarn:
        'Безкоштовне відкриття одноразове: одразу після підтвердження воно буде використане.',
      voucherCta: 'Відкрити безкоштовно',
      voucherCtaBusy: '',
      voucherCtaSub: 'Один раз — після підтвердження',
      packKindLabel: 'Набір',
      metaCards: (n: number) => `${pluralWithCount('uk', n, { one: 'картка', few: 'картки', many: 'карток' })}`,
      // зачем: «не вистачає» управляет родовим — «не вистачає ще 1 монети».
      shortageRemaining: (n: number) => `Не вистачає ще ${n} ${ukKnowledgeShardsGenitiveAfterNumber(n)}`,
      needLabel: 'Потрібно',
      youHaveLabel: 'У тебе',
      costLabel: 'Вартість',
      shardsUnit: 'монет',
      waitBusy: '',
      reportPack: 'Поскаржитися на набір',
      hidePack: 'Не показувати мені',
    };
  }
  if (lang === 'es') {
    const S = BRAND_SHARDS_ES.toLowerCase();
    return {
      cancel: 'Cancelar',
      buy: 'Comprar',
      buyShards: 'Cómo ganar monedas',
      forShards: (n: number) => `Comprar por ${n} ${S}`,
      insufficientTitle: `No tienes suficientes ${S}`,
      insufficientIntro:
        'Gana monedas con lecciones y prácticas. El botón de abajo te muestra cómo.',
      balanceBlockTitle: 'Para este paquete',
      ctaSub: 'Compra con un solo toque',
      shopCtaSub: 'Las monedas se ganan con lecciones y prácticas',
      voucherKicker: 'Paquete gratis',
      voucherTitle: '¿Abrir gratis?',
      voucherIntro:
        `Este paquete se añadirá para siempre a «Tarjetas» gratis; no gastarás ${S}.`,
      voucherWarn:
        'La apertura gratis es de un solo uso: se aplicará al confirmar.',
      voucherCta: 'Abrir gratis',
      voucherCtaBusy: '',
      voucherCtaSub: 'Un solo uso, al confirmar',
      packKindLabel: 'Paquete',
      metaCards: (n: number) => `${pluralWithCount('es', n, { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' })}`,
      shortageRemaining: (n: number) => `Te faltan ${n} ${S}`,
      needLabel: 'Necesitas',
      youHaveLabel: 'Tienes',
      costLabel: 'Precio',
      shardsUnit: S,
      waitBusy: '',
      reportPack: 'Reportar este paquete',
      hidePack: 'No mostrarme',
    };
  }
  if (lang === 'pt-BR') {
    return {
      cancel: 'Cancelar', buy: 'Abrir', buyShards: 'Como ganhar moedas',
      forShards: (n: number) => `Abrir por ${pluralWithCount('pt-BR', n, { one: 'moeda', few: 'moedas', many: 'moedas' })}`,
      insufficientTitle: 'Moedas insuficientes',
      insufficientIntro: 'Ganhe moedas com lições e treinos. O botão abaixo mostra como.',
      balanceBlockTitle: 'Para este pacote', ctaSub: 'Compra com um toque',
      shopCtaSub: 'Moedas vêm de lições e treinos', voucherKicker: 'Pacote grátis',
      voucherTitle: 'Abrir de graça?',
      voucherIntro: 'Este pacote será adicionado às suas «Cartas» gratuitamente e para sempre — você não gastará moedas.',
      voucherWarn: 'A abertura gratuita é de uso único: será aplicada logo após a confirmação.',
      voucherCta: 'Abrir de graça', voucherCtaBusy: '',
      voucherCtaSub: 'Uso único, na confirmação', packKindLabel: 'Pacote',
      metaCards: (n: number) => `${pluralWithCount('pt-BR', n, { one: 'cartão', few: 'cartões', many: 'cartões' })}`, shortageRemaining: (n: number) => `${n === 1 ? 'Falta' : 'Faltam'} ${pluralWithCount('pt-BR', n, { one: 'moeda', few: 'moedas', many: 'moedas' })}`,
      needLabel: 'Necessário', youHaveLabel: 'Você tem', costLabel: 'Custo',
      shardsUnit: 'moedas', waitBusy: '', reportPack: 'Denunciar pacote', hidePack: 'Não mostrar novamente',
    };
  }
  if (lang === 'vi') {
    return {
      cancel: 'Hủy', buy: 'Mở', buyShards: 'Cách kiếm xu',
      forShards: (n: number) => `Mở với ${n} xu`,
      insufficientTitle: 'Không đủ xu',
      insufficientIntro: 'Hãy kiếm xu qua bài học và luyện tập. Nút bên dưới sẽ chỉ cách.',
      balanceBlockTitle: 'Cho gói này', ctaSub: 'Mua chỉ với một chạm',
      shopCtaSub: 'Xu có từ bài học và luyện tập', voucherKicker: 'Gói miễn phí',
      voucherTitle: 'Mở miễn phí?',
      voucherIntro: 'Gói này sẽ được thêm miễn phí vĩnh viễn vào «Thẻ» — bạn không cần dùng xu.',
      voucherWarn: 'Lượt mở miễn phí chỉ dùng một lần: sẽ được áp dụng ngay sau khi xác nhận.',
      voucherCta: 'Mở miễn phí', voucherCtaBusy: '', voucherCtaSub: 'Một lần, sau khi xác nhận',
      packKindLabel: 'Gói', metaCards: (n: number) => `${n} thẻ`,
      shortageRemaining: (n: number) => `Còn thiếu ${n} xu`, needLabel: 'Cần',
      youHaveLabel: 'Bạn có', costLabel: 'Giá', shardsUnit: 'xu', waitBusy: '',
      reportPack: 'Báo cáo gói này', hidePack: 'Không hiển thị lại',
    };
  }
  if (lang === 'id') {
    return {
      cancel: 'Batal', buy: 'Buka', buyShards: 'Cara mendapatkan koin',
      forShards: (n: number) => `Buka seharga ${n} koin`,
      insufficientTitle: 'Koin tidak cukup',
      insufficientIntro: 'Dapatkan koin lewat pelajaran dan latihan. Tombol di bawah menunjukkan caranya.',
      balanceBlockTitle: 'Untuk paket ini', ctaSub: 'Beli dalam satu ketukan',
      shopCtaSub: 'Koin didapat dari pelajaran dan latihan', voucherKicker: 'Paket gratis',
      voucherTitle: 'Buka gratis?',
      voucherIntro: 'Paket ini akan ditambahkan ke «Kartu» secara gratis untuk selamanya — kamu tidak perlu memakai koin.',
      voucherWarn: 'Pembukaan gratis hanya berlaku sekali: akan diterapkan segera setelah dikonfirmasi.',
      voucherCta: 'Buka gratis', voucherCtaBusy: '', voucherCtaSub: 'Sekali pakai, setelah konfirmasi',
      packKindLabel: 'Paket', metaCards: (n: number) => `${n} kartu`,
      shortageRemaining: (n: number) => `Kurang ${n} koin`, needLabel: 'Dibutuhkan',
      youHaveLabel: 'Kamu punya', costLabel: 'Harga', shardsUnit: 'koin', waitBusy: '',
      reportPack: 'Laporkan paket ini', hidePack: 'Jangan tampilkan lagi',
    };
  }
  if (lang === 'tr') {
    return {
      cancel: 'İptal', buy: 'Aç', buyShards: 'Jeton nasıl kazanılır',
      forShards: (n: number) => `${n} jeton karşılığında aç`,
      insufficientTitle: 'Yeterli jetonun yok',
      insufficientIntro: 'Derslerden ve alıştırmalardan jeton kazan. Aşağıdaki düğme nasıl yapılacağını gösterir.',
      balanceBlockTitle: 'Bu paket için', ctaSub: 'Tek dokunuşla satın al',
      shopCtaSub: 'Jetonlar ders ve alıştırmalardan gelir', voucherKicker: 'Ücretsiz paket',
      voucherTitle: 'Ücretsiz açılsın mı?',
      voucherIntro: 'Bu paket «Kartlar»ına ücretsiz olarak kalıcı biçimde eklenecek — jeton harcaman gerekmiyor.',
      voucherWarn: 'Ücretsiz açma tek kullanımlıktır: onaydan hemen sonra uygulanır.',
      voucherCta: 'Ücretsiz aç', voucherCtaBusy: '', voucherCtaSub: 'Tek kullanım, onayla birlikte',
      packKindLabel: 'Paket', metaCards: (n: number) => `${n} kart`,
      shortageRemaining: (n: number) => `${n} jeton eksik`, needLabel: 'Gerekli',
      youHaveLabel: 'Sende', costLabel: 'Fiyat', shardsUnit: 'jeton', waitBusy: '',
      reportPack: 'Paketi bildir', hidePack: 'Bir daha gösterme',
    };
  }
  if (lang === 'pl') {
    return {
      cancel: 'Anuluj', buy: 'Otwórz', buyShards: 'Jak zdobyć monety',
      forShards: (n: number) => `Otwórz za ${pluralWithCount('pl', n, { one: 'monetę', few: 'monety', many: 'monet' })}`,
      insufficientTitle: 'Za mało monet',
      insufficientIntro: 'Zdobywaj monety w lekcjach i treningach. Przycisk poniżej pokaże, jak.',
      balanceBlockTitle: 'Dla tego pakietu', ctaSub: 'Kup jednym dotknięciem',
      shopCtaSub: 'Monety zdobywasz w lekcjach i treningach', voucherKicker: 'Darmowy pakiet',
      voucherTitle: 'Otworzyć za darmo?',
      voucherIntro: 'Ten pakiet zostanie na zawsze dodany do «Kart» za darmo — nie wydasz monet.',
      voucherWarn: 'Darmowe otwarcie jest jednorazowe: zostanie użyte zaraz po potwierdzeniu.',
      voucherCta: 'Otwórz za darmo', voucherCtaBusy: '', voucherCtaSub: 'Jednorazowo, po potwierdzeniu',
      packKindLabel: 'Pakiet', metaCards: (n: number) => `${pluralWithCount('pl', n, { one: 'karta', few: 'karty', many: 'kart' })}`,
      shortageRemaining: (n: number) => `Brakuje ${pluralWithCount('pl', n, { one: 'monety', few: 'monet', many: 'monet' })}`, needLabel: 'Potrzebujesz',
      youHaveLabel: 'Masz', costLabel: 'Cena', shardsUnit: 'monet', waitBusy: '',
      reportPack: 'Zgłoś pakiet', hidePack: 'Nie pokazuj ponownie',
    };
  }
  return {
    cancel: 'Отмена',
    buy: 'Открыть',
    buyShards: 'Как заработать монеты',
    // зачем: «за» требует винительного — «Открыть за 1 монету», не «за 1 монета».
    forShards: (n: number) => `Открыть за ${n} ${ruKnowledgeShardsAccusativeAfterNumber(n)}`,
    insufficientTitle: 'Недостаточно монет',
    insufficientIntro:
      'Монеты зарабатываются в уроках и тренировках — кнопка ниже покажет, как.',
    balanceBlockTitle: 'Для этого набора',
    ctaSub: 'Откроется в одно касание',
    shopCtaSub: 'Монеты — за уроки и тренировки',
    voucherKicker: 'Бесплатный набор',
    voucherTitle: 'Открыть бесплатно?',
    voucherIntro:
      'Этот набор навсегда добавится в «Карточки» бесплатно — монеты тратить не нужно.',
    voucherWarn:
      'Бесплатное открытие одноразовое: сразу после подтверждения оно будет использовано.',
    voucherCta: 'Открыть бесплатно',
    voucherCtaBusy: '',
    voucherCtaSub: 'Один раз — после подтверждения',
    packKindLabel: 'Набор',
    metaCards: (n: number) => `${pluralWithCount('ru', n, { one: 'карточка', few: 'карточки', many: 'карточек' })}`,
    // зачем: «не хватает» требует родительного — «не хватает ещё 1 монеты».
    shortageRemaining: (n: number) => `Не хватает ещё ${n} ${ruKnowledgeShardsGenitiveAfterNumber(n)}`,
    needLabel: 'Нужно',
    youHaveLabel: 'У тебя',
    costLabel: 'Нужно монет',
    shardsUnit: 'монет',
    waitBusy: '',
    reportPack: 'Пожаловаться на набор',
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
  // зачем (координатор 05.10, FONTSCALE2): только вёрстка текста — межстрочный растёт с системным шрифтом; логика покупки и цены не тронуты
  const lh = useLineScale();
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  // зачем (координатор 12.10): оболочка окна покупки — токены активной темы Liquid Glass (светлая и любой оттенок ползунка), не таблица по id темы
  const glassTokens = useMemo(() => liquidGlassTokens(liquidGlassThemeId), [liquidGlassThemeId]);
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
  /**
   * Podpisi. Dlya run podmenyaem tol'ko te chetyre stroki, gde nazvana valyuta:
   * ostal'nye devyat' yazykovyh blokov trogat' ne nado, oni pro sam nabor.
   *
   * zachem podmena zdes', a ne v paywallModalCopy: tam devyat' lokaley po
   * ~30 strok kazhdaya, i vetka na valyutu razdula by fayl vdvoe radi chetyreh
   * fraz.
   */
  // зачем (PM-289, D70/D78): жемчужная ветка шита удалена — наборы продаются
  // только за монеты (руны), единственный вызов и так передавал currency="runes".
  const str = useMemo(() => {
    const base = paywallModalCopy(lang);
    const runesWord = triRunesWord(lang);
    return {
      ...base,
      shardsUnit: runesWord,
      buyShards: triRunesTopUp(lang),
      insufficientTitle: triRunesShort(lang),
      forShards: (n: number) => triRunesBuyFor(lang, n),
    };
  }, [lang]);
  const title = packTitleForInterface(pack, lang);
  const desc = packDescriptionForInterface(pack, lang);
  const descLines = useMemo(() => splitDescriptionToLines(desc), [desc]);
  const meta = str.metaCards(pack.cardCount);
  const iconName = packCategoryIonIcon(pack.category) as keyof typeof Ionicons.glyphMap;
  const packPng = packTileImageForPack(pack);
  const paywallVisual = useMemo(
    () => getCardPackPaywallTheme(pack, { tokens: glassTokens }),
    [pack.id, pack.category, glassTokens],
  );
  const cardShadow = useMemo(() => getVolumetricShadow(themeMode, t, 3), [themeMode, t]);
  const [reportVisible, setReportVisible] = useState(false);
  /**
   * Цена покупки в выбранной валюте — ЕДИНСТВЕННЫЙ источник для всех шести
   * мест, где шит показывает число. Раньше каждое читало pack.priceShards
   * напрямую; с двумя валютами это гарантированно разошлось бы.
   */
  const price = Math.max(0, Math.floor(Number(pack.priceRunes ?? 0)));

  /** Знак валюты рядом с ценой: у монет (рун) свой знак ᚱ, рисуется текстом. */
  const CurrencyMark = useCallback(({ size }: { size: number }) => (
    <Text
      style={{ fontSize: Math.round(size * 0.82), fontWeight: '900', color: t.accentText }}
      maxFontSizeMultiplier={1.2}
    >
      ᚱ
    </Text>
  ), [t.gold]);

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
      // зачем (PM-032): разовая реакция на открытие, а не вечная пульсация CTA.
      ctaPulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })),
        2,
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
                      decelerationRate="fast"
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
                                <Ionicons name={iconName} size={42} color={t.accentText} />
                              )}
                            </LinearGradient>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: t.accentText,
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
                              color: t.accentText,
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
                              lineHeight: lh(23),
                              marginTop: 10,
                            }}
                          >
                            {str.insufficientIntro}
                          </Animated.Text>

                          <Animated.View
                            entering={FadeInDown.delay(200).duration(400)}
                            style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                          >
                            <CurrencyMark size={28} />
                            <Text style={{ color: t.accentText, fontSize: f.caption, fontWeight: '700' }}>
                              {str.shortageRemaining(Math.max(0, price - balance))}
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
                                    <CurrencyMark size={28} />
                                    <Text
                                      style={{
                                        color: paywallVisual.priceTextOnCard?.value ?? t.textPrimary,
                                        fontSize: f.numLg,
                                        fontWeight: '900',
                                      }}
                                    >
                                      {price}
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
                                    <CurrencyMark size={28} />
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
                                fontSize: 13,
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
                                <Ionicons name={iconName} size={42} color={t.accentText} />
                              )}
                            </LinearGradient>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: t.accentText,
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
                              lineHeight: lh(23),
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
                              <Ionicons name={iconName} size={22} color={t.accentText} />
                            )}
                            <Text style={{ color: t.accentText, fontSize: f.caption, fontWeight: '700' }}>{meta}</Text>
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
                              <Ionicons name="alert-circle-outline" size={20} color={t.accentText} />
                              <Text style={{ flex: 1, color: t.accentText, fontSize: f.body, fontWeight: '700', lineHeight: lh(22) }}>
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
                                <Ionicons name={iconName} size={42} color={t.accentText} />
                              )}
                            </LinearGradient>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  color: t.accentText,
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
                                  lineHeight: lh(23),
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
                              <Ionicons name={iconName} size={22} color={t.accentText} />
                            )}
                            <Text style={{ color: t.accentText, fontSize: f.caption, fontWeight: '700' }}>{meta}</Text>
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
                                <CurrencyMark size={32} />
                                <Text
                                  style={{
                                    color: paywallVisual.priceTextOnCard?.value ?? t.textPrimary,
                                    fontSize: f.numLg,
                                    fontWeight: '900',
                                  }}
                                >
                                  {price}
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
                                fontSize: 13,
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
                          {onGoToShards ? (
                            <View style={{ position: 'relative', marginBottom: 10 }}>
                              <AnimatedLinearGradient
                                colors={[paywallVisual.ctaGlowTop, EXEMPT_COLOR_1]}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                                style={[
                                  { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16 },
                                  ctaGlowStyle,
                                ]}
                              />
                              <DuoPressable
                                onPress={() => {
                                  if (purchasing) return;
                                  void hapticMediumImpact();
                                  onGoToShards?.();
                                }}
                                disabled={purchasing}
                                withHaptic={false}
                                gradientColors={paywallVisual.goShopCta}
                                style={{ minHeight: undefined, paddingVertical: 16, borderRadius: 16 }}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                  <CurrencyMark size={26} />
                                  <Text style={{ color: paywallVisual.goShopForeground, fontSize: f.bodyLg, fontWeight: '900' }}>
                                    {str.buyShards}
                                  </Text>
                                </View>
                              </DuoPressable>
                            </View>
                          ) : null}
                          <PressableHybrid
                            onPress={handleClose}
                            hitSlop={8}
                            variant="secondary"
                            withHaptic={false}
                            withSound={false}
                            contentStyle={{ marginTop: 8, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{str.cancel}</Text>
                          </PressableHybrid>
                        </>
                      ) : mode === 'voucher' ? (
                        <>
                          <View style={{ position: 'relative' }}>
                            <AnimatedLinearGradient
                              colors={[`${t.gold}55`, EXEMPT_COLOR_2]}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                              style={[
                                { position: 'absolute', left: -1, right: -1, top: -2, height: 28, borderRadius: 12 },
                                ctaGlowStyle,
                              ]}
                            />
                            <DuoPressable
                              onPress={() => {
                                if (purchasing) return;
                                void hapticMediumImpact();
                                void onConfirmPurchase();
                              }}
                              disabled={purchasing}
                              withHaptic={false}
                              gradientColors={paywallVisual.goShopCta} /* зачем (координатор 12.10): кнопка ваучера — та же проверенная по контрасту пара, что у «В магазин»; t.gold + t.bgPrimary на светлых темах давали 4,1–4,3:1 */
                              style={{ minHeight: undefined, paddingVertical: 16, borderRadius: 16, opacity: purchasing ? 0.85 : 1 }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                {purchasing ? (
                                  <ActivityIndicator size="small" color={paywallVisual.goShopForeground} />
                                ) : (
                                  <Ionicons name="gift-outline" size={22} color={paywallVisual.goShopForeground} />
                                )}
                                <Text style={{ color: paywallVisual.goShopForeground, fontSize: f.bodyLg, fontWeight: '900' }}>
                                  {str.voucherCta}
                                </Text>
                              </View>
                            </DuoPressable>
                          </View>
                          <Text
                            style={{
                              color: subLabelColor,
                              fontSize: 13,
                              marginTop: 8,
                              textAlign: 'center',
                              letterSpacing: 0.2,
                            }}
                          >
                            {str.voucherCtaSub}
                          </Text>
                          <PressableHybrid
                            onPress={handleClose}
                            hitSlop={8}
                            variant="secondary"
                            withHaptic={false}
                            withSound={false}
                            contentStyle={{ marginTop: 4, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{str.cancel}</Text>
                          </PressableHybrid>
                        </>
                      ) : (
                        <>
                          <View style={{ position: 'relative' }}>
                            <AnimatedLinearGradient
                              colors={[paywallVisual.ctaGlowTop, EXEMPT_COLOR_3]}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                              style={[
                                { position: 'absolute', left: -1, right: -1, top: -2, height: 28, borderRadius: 12 },
                                ctaGlowStyle,
                              ]}
                            />
                            <DuoPressable
                              onPress={() => {
                                if (purchasing) return;
                                void hapticMediumImpact();
                                void onConfirmPurchase();
                              }}
                              disabled={purchasing}
                              withHaptic={false}
                              gradientColors={paywallVisual.ctaColors}
                              gradientEnd={{ x: 1, y: 0 }}
                              style={{ minHeight: undefined, paddingVertical: 16, borderRadius: 16, opacity: purchasing ? 0.85 : 1 }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                {purchasing ? (
                                  <ActivityIndicator size="small" color={paywallVisual.ctaForeground} />
                                ) : (
                                  <CurrencyMark size={24} />
                                )}
                                <Text style={{ color: paywallVisual.ctaForeground, fontSize: f.bodyLg, fontWeight: '900' }}>
                                  {str.forShards(price)}
                                </Text>
                              </View>
                            </DuoPressable>
                          </View>
                          <PressableHybrid
                            onPress={handleClose}
                            hitSlop={8}
                            variant="secondary"
                            withHaptic={false}
                            withSound={false}
                            contentStyle={{ marginTop: 8, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{str.cancel}</Text>
                          </PressableHybrid>
                        </>
                      )}

                      {/* Apple Guideline 1.2 (UGC): кнопка скарги для community-наборів.
                          зачем (PM-107, владелец): текстовая плашка заменена иконкой флага —
                          доступная подпись для screen reader сохранена через accessibilityLabel
                          (то же значение str.reportPack, без ведущего ⚐, который был декоративным). */}
                      {pack.isCommunityUgc ? (
                        <>
                          <Pressable
                            onPress={() => setReportVisible(true)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={str.reportPack.replace(/^[^\p{L}]*/u, '')}
                            style={{ marginTop: 6, paddingVertical: 6, alignItems: 'center' }}
                          >
                            <Ionicons name="flag-outline" size={16} color={t.textGhost} />
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
                            <Text style={{ color: t.textGhost, fontSize: 13, textDecorationLine: 'underline' }}>
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
