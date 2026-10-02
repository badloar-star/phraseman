import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import {
  AccessibilityInfo,
  findNodeHandle,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import ContentWrap from '../../components/ContentWrap';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import FeatureIntroEntry from '../../components/feature_intro/FeatureIntroEntry';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { usePremium } from '../../components/PremiumContext';
import MonthlyTrainingSessionIndicator from '../../components/MonthlyTrainingSessionIndicator';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useScreen } from '../../hooks/use-screen';
import { useFlashcardTrainingQuotaPreview } from '../../hooks/useFlashcardTrainingQuotaPreview';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { markNextNavigationAsReplace, safeRouterBack } from '../navigation_back';
import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { loadPublishedCommunityMarketPacks } from '../community_packs/communityFirestore';
import { isLocalAuthorPackId, loadLocalAuthorPacks } from '../community_packs/localAuthorPacks';
import { getCanonicalUserId } from '../user_id_policy';
import { emitPackNotDownloadedToast, stageCommunityPackCardsWithSilentRetry } from '../community_packs/stage_with_retry';
import {
  loadMarketplacePacks,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './marketplace';
import SavedTopCommunityPacks from './SavedTopCommunityPacks';
import FlashcardsTrainingModeSheet from './FlashcardsTrainingModeSheet';
import type { CardsTrainingMode } from './training_entry';
import { primeFlashcardsCollectionCache } from './useCollectionData';
import { hydrateFcDeckOptionsSnapshot, loadFcDeckOptions } from './deck_options';
import { loadSelectedSavedContour, peekSelectedSavedContour } from './saved_language_contour';
import { packTileArtRevision } from './packMarketplaceIcons';
import { peekMyPacksCount } from './myPacksCountCache';
import { loadVideoPhraseSetPacks, peekVideoPhraseSetPacks } from '../video_phrase_set_packs';
import { applyCommunityPacksFilter, filterVideoPacks } from '../community_packs/communityCatalogFilter';
import { peekStoredPackLanguage } from './pack_language_preferences';
import { defaultPackLanguageForStudyTarget } from './pack_languages';
import { buildFcCreateRoute } from './tabbar_state';

type LibraryRowProps = {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  savedArt?: boolean;
  title: string;
  subtitle: string;
  count: number | null;
  countPendingLabel: string;
  lang: string;
  onPress: () => void;
};

/** Low-intensity native diffusion is bounded to the visible Hub surfaces. */
function HeaderGlassSheen({ edge, tint, wash }: { edge: string; tint: string; wash: string }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <BlurView intensity={Platform.OS === 'android' ? 12 : 16} blurReductionFactor={3}
      experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
      tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
    <View style={[StyleSheet.absoluteFill, { backgroundColor: `${wash}A6` }]} />
    <LinearGradient colors={[tint, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={[styles.rowSheen, { backgroundColor: edge }]} />
  </View>;
}

const LIBRARY_ROW_GRADIENT_FALLBACK = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

function libraryRowGradientForSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return LIBRARY_ROW_GRADIENT_FALLBACK;
  }
  // CSS 110deg is 20deg from the physical x-axis. Expo multiplies normalized
  // coordinates by the rendered size, so compensate for each row aspect ratio.
  const radians = 20 * Math.PI / 180;
  const direction = { x: Math.cos(radians), y: Math.sin(radians) };
  const length = Math.abs(width * direction.x) + Math.abs(height * direction.y);
  return {
    start: {
      x: 0.5 - direction.x * length / (2 * width),
      y: 0.5 - direction.y * length / (2 * height),
    },
    end: {
      x: 0.5 + direction.x * length / (2 * width),
      y: 0.5 + direction.y * length / (2 * height),
    },
  };
}

function LibraryRowSheen({ testID }: Readonly<{ testID: string }>) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const gradient = useMemo(
    () => libraryRowGradientForSize(layout.width, layout.height),
    [layout.height, layout.width],
  );
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    setLayout(current => current.width === width && current.height === height
      ? current
      : { width, height });
  }, []);
  return (
    <LinearGradient
      pointerEvents="none"
      testID={testID}
      colors={['rgba(239,241,255,0.09)', 'rgba(239,241,255,0)']}
      locations={[0, 0.58]}
      start={gradient.start}
      end={gradient.end}
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, { opacity: layout.width > 0 && layout.height > 0 ? 1 : 0 }]}
    />
  );
}

/**
 * Совпадают ли каталоги по составу (id и социальные счётчики, которые видно на
 * плитке). Полное глубокое сравнение на каждый фокус дороже самой перерисовки.
 */
/**
 * Сколько держать прогрев хаба без повторной сборки при возврате на вкладку.
 *
 * зачем (владелец 2026-09-21): это про «мазнул по вкладкам и вернулся», а не
 * кэш данных. Настоящие TTL живут внутри самих загрузчиков
 * (MARKETPLACE_REMOTE_REFRESH_TTL_MS, COMMUNITY_CATALOG_TTL_MS) и здесь не
 * меняются — отсекается только повторная СБОРКА цепочки на свежих данных.
 *
 * Почему именно 3 секунды, а не 20-30, как просится по цене запросов: хаб
 * узнаёт о покупке набора ТОЛЬКО из этого фокус-эффекта. События вроде
 * «набор куплен», на которое можно подписаться, в проекте нет (проверял
 * grep'ом), а кнопка «Повторить» — жест человека, на неё рассчитывать нельзя.
 * Поставь больше — и купленный в соседнем разделе набор не появился бы при
 * возврате. Три секунды закрывают дребезг переключения вкладок и физически не
 * могут пережить поход за покупкой.
 */
const HUB_FOCUS_WARM_TTL_MS = 3_000;

function sameCatalog(a: readonly FlashcardMarketPack[], b: readonly FlashcardMarketPack[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) return false;
    if ((a[i].likesCount ?? 0) !== (b[i].likesCount ?? 0)) return false;
    if ((a[i].addedCount ?? 0) !== (b[i].addedCount ?? 0)) return false;
    // зачем: без этой строки список НЕ перерисуется при новом отклике — счётчик
    // «💬» отставал бы до полного перезахода в раздел (та же жалоба была на лайк).
    if ((a[i].commentsCount ?? 0) !== (b[i].commentsCount ?? 0)) return false;
    if (a[i].titleRu !== b[i].titleRu || a[i].titleUk !== b[i].titleUk || a[i].titleEs !== b[i].titleEs) return false;
    if (a[i].titlePtBr !== b[i].titlePtBr || a[i].titleVi !== b[i].titleVi || a[i].titleId !== b[i].titleId || a[i].titleTr !== b[i].titleTr || a[i].titlePl !== b[i].titlePl) return false;
    if (a[i].codeName !== b[i].codeName || a[i].authorName !== b[i].authorName || a[i].cardCount !== b[i].cardCount) return false;
    if (a[i].isCommunityUgc !== b[i].isCommunityUgc || a[i].listingStatus !== b[i].listingStatus || a[i].packLanguage !== b[i].packLanguage) return false;
    if (a[i].priceRunes !== b[i].priceRunes || a[i].ugcCardThemeKey !== b[i].ugcCardThemeKey || a[i].videoId !== b[i].videoId) return false;
    if (packTileArtRevision(a[i]) !== packTileArtRevision(b[i])) return false;
  }
  return true;
}

/** Тот же список id — прежняя ссылка, чтобы владение не перерисовывало витрину. */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function mergeCatalogs(...catalogs: readonly FlashcardMarketPack[][]): FlashcardMarketPack[] {
  const merged: FlashcardMarketPack[] = [];
  const seen = new Set<string>();
  for (const catalog of catalogs) {
    for (const pack of catalog) {
      if (!pack?.id || seen.has(pack.id)) continue;
      seen.add(pack.id);
      merged.push(pack);
    }
  }
  return merged;
}

function LibraryRow({ testID, icon, savedArt = false, title, subtitle, count, countPendingLabel, lang, onPress }: LibraryRowProps) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={count === null ? `${title}. ${subtitle}` : `${title}. ${subtitle}. ${new Intl.NumberFormat(lang).format(count)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.libraryRow, { backgroundColor: g.opaqueCard }, pressed && styles.pressed]}
    >
      <LibraryRowSheen testID={`${testID}-sheen`} />
      <View style={[styles.libraryIcon, { backgroundColor: g.opaqueControl }]}>
        {savedArt
          ? <Image source={require('../../assets/images/v2/cards_hub_saved.webp')} style={styles.savedArt} contentFit="contain" accessible={false} />
          : <Ionicons name={icon} size={20} color={g.lightTint} />}
      </View>
      <View style={styles.libraryCopy}>
        <Text style={[styles.libraryTitle, { color: g.text }]}>{title}</Text>
        <Text style={[styles.librarySubtitle, { color: g.secondary }]}>{subtitle}</Text>
      </View>
      {/* зачем (владелец 01.10: «никаких загружается/прочерков»): число неизвестно — пустое
          зарезервированное место той же ширины, а не «—»; появится, как только станет известно. */}
      <Text accessibilityElementsHidden={count === null} importantForAccessibility={count === null ? 'no-hide-descendants' : 'auto'} style={[styles.libraryCount, { color: g.secondary }]}>
        {count === null ? '' : new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(count)}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={g.secondary} />
    </Pressable>
  );
}

export default function FlashcardsHubScreen() {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { accessResolved } = usePremium();
  const quotaPreview = useFlashcardTrainingQuotaPreview();
  const { contentMaxW } = useScreen();
  const { width } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const [catalog, setCatalog] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks(studyTarget) ?? [],
  );
  const [ownedCommunityPackIds, setOwnedCommunityPackIds] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(() => peekSelectedSavedContour()?.length ?? null);
  // My Packs includes unpublished author packs that the Hub catalog does not know.
  // Only its settled account/target snapshot is a truthful count.
  const [myPackCount, setMyPackCount] = useState<number | null>(null);
  // зачем (владелец 01.10): у «Из видео» всегда стоял прочерк. Считаем по сохранённому каталогу
  // (тот же, что открывает раздел; кэш 6 ч — без лишних запросов) и тем же фильтром языка наборов.
  const countVideoPacks = useCallback((packs: readonly FlashcardMarketPack[] | null): number | null => {
    if (!packs) return null;
    const packLanguage = peekStoredPackLanguage() ?? defaultPackLanguageForStudyTarget(studyTarget);
    return applyCommunityPacksFilter(filterVideoPacks(packs), '', 'new', packLanguage).length;
  }, [studyTarget]);
  const [videoPackCount, setVideoPackCount] = useState<number | null>(() => countVideoPacks(peekVideoPhraseSetPacks()));
  useEffect(() => {
    let cancelled = false;
    void loadVideoPhraseSetPacks().then((packs) => {
      if (!cancelled) setVideoPackCount(countVideoPacks(packs));
    }).catch((error: unknown) => {
      console.warn('[FC-DECKS] hub:video count FAILED —', error instanceof Error ? error.message : String(error)); // guard-ok
    });
    return () => { cancelled = true; };
  }, [countVideoPacks]);
  /**
   * зачем (владелец: «раздел открывается и происходит скачок, моргание»):
   * состояние стартовало в 'loading' ВСЕГДА, даже когда тёплый каталог уже лежал
   * в памяти и был отдан синхронно строкой выше. Из-за этого первый кадр рисовал
   * скелетон, а следующий — готовый список: ровно то моргание, о котором речь.
   * Кэш есть — решение известно синхронно, ждать нечего (тот же приём уже принят
   * в useCollectionData: collectionDataReady по прогретому кэшу).
   */
  const [catalogLoadState, setCatalogLoadState] = useState<'loading' | 'ready'>(
    () => (catalog.length > 0 ? 'ready' : 'loading'),
  );
  const communityPackCount = useMemo(() => {
    if (catalogLoadState !== 'ready') return null;
    return catalog.filter((pack) => pack.isCommunityUgc && !isLocalAuthorPackId(pack.id)).length;
  }, [catalog, catalogLoadState]);
  const [catalogLoadRevision, setCatalogLoadRevision] = useState(0);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const openingPackRef = useRef<string | null>(null);
  /** Зеркало длины каталога: фокус-эффект решает по нему, нужен ли спиннер. */
  const catalogLenRef = useRef(0);
  catalogLenRef.current = catalog.length;
  /**
   * Когда прогрев хаба выполнялся последний раз и для какого сочетания
   * язык+цель+ревизия. Живёт в памяти экрана: пережить перезапуск он не должен,
   * после холодного старта данные обязаны подняться заново.
   */
  const hubWarmRef = useRef<{ key: string; atMs: number }>({ key: '', atMs: 0 });
  const [modeSheetVisible, setModeSheetVisible] = useState(false);
  const pendingModeRef = useRef<CardsTrainingMode | null>(null);
  const trainButtonRef = useRef<View>(null);

  const copy = useMemo(() => ({
    title: triLang(lang, {
      ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões',
      vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Karty',
    }),
    subtitle: triLang(lang, {
      ru: 'Учите слова и фразы эффективнее', uk: 'Вивчайте слова й фрази ефективніше',
      en: 'Learn words and phrases more effectively', es: 'Aprende palabras y frases de forma más eficaz',
      'pt-BR': 'Aprenda palavras e frases com mais eficiência', vi: 'Học từ và cụm từ hiệu quả hơn',
      id: 'Pelajari kata dan frasa dengan lebih efektif', tr: 'Kelimeleri ve ifadeleri daha etkili öğren',
      pl: 'Ucz się słów i zwrotów skuteczniej',
    }),
    brand: 'PhraseMan 2.0',
    countPending: triLang(lang, {
      ru: 'Количество пока загружается', uk: 'Кількість ще завантажується', en: 'Count loading',
      es: 'Cargando cantidad', 'pt-BR': 'Carregando total', vi: 'Đang tải số lượng',
      id: 'Jumlah sedang dimuat', tr: 'Sayı yükleniyor', pl: 'Ładowanie liczby',
    }),
    countUnavailable: triLang(lang, {
      ru: 'Количество ещё не известно', uk: 'Кількість ще невідома', en: 'Count not yet available',
      es: 'Cantidad aún no disponible',
    }),
    bestSegment: triLang(lang, {
      ru: 'Лучшее', uk: 'Найкраще', en: 'Best', es: 'Mejor', 'pt-BR': 'Melhores',
      vi: 'Nổi bật', id: 'Terbaik', tr: 'En iyiler', pl: 'Najlepsze',
    }),
    communitySegment: triLang(lang, {
      ru: 'Сообщество', uk: 'Спільнота', en: 'Community', es: 'Comunidad',
      'pt-BR': 'Comunidade', vi: 'Cộng đồng', id: 'Komunitas', tr: 'Topluluk', pl: 'Społeczność',
    }),
    library: triLang(lang, {
      ru: 'Ваши карточки', uk: 'Ваші картки', en: 'Your cards', es: 'Tus tarjetas',
      'pt-BR': 'Seus cartões', vi: 'Thẻ của bạn', id: 'Kartu Anda', tr: 'Kartların', pl: 'Twoje karty',
    }),
    saved: triLang(lang, {
      ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardadas', 'pt-BR': 'Salvos',
      vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane',
    }),
    savedSub: triLang(lang, {
      ru: 'Личная коллекция', uk: 'Особиста колекція', en: 'Personal collection', es: 'Colección personal',
      'pt-BR': 'Coleção pessoal', vi: 'Bộ sưu tập cá nhân', id: 'Koleksi pribadi',
      tr: 'Kişisel koleksiyon', pl: 'Osobista kolekcja',
    }),
    video: triLang(lang, {
      ru: 'Наборы из видео', uk: 'Набори з відео', en: 'Packs from videos', es: 'Packs de vídeos',
      'pt-BR': 'Pacotes de vídeos', vi: 'Bộ thẻ từ video', id: 'Paket dari video', tr: 'Video paketleri', pl: 'Zestawy z filmów',
    }),
    videoSub: triLang(lang, {
      ru: 'Карточки по видео', uk: 'Картки за відео', en: 'Cards from videos',
      es: 'Tarjetas de vídeos', 'pt-BR': 'Cartões de vídeos', vi: 'Thẻ từ video',
      id: 'Kartu dari video', tr: 'Videolardan kartlar', pl: 'Karty z filmów',
    }),
    mine: triLang(lang, {
      ru: 'Мои наборы', uk: 'Мої набори', en: 'My packs', es: 'Mis packs', 'pt-BR': 'Meus pacotes',
      vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
    }),
    mineSub: triLang(lang, {
      ru: 'Созданные и добавленные', uk: 'Створені й додані', en: 'Created and added',
      es: 'Creados y añadidos', 'pt-BR': 'Criados e adicionados', vi: 'Đã tạo và thêm',
      id: 'Dibuat dan ditambahkan', tr: 'Oluşturulan ve eklenen', pl: 'Utworzone i dodane',
    }),
    community: triLang(lang, {
      ru: 'Наборы пользователей', uk: 'Набори користувачів', en: 'Community packs',
      es: 'Packs de usuarios', 'pt-BR': 'Pacotes da comunidade', vi: 'Bộ thẻ cộng đồng',
      id: 'Paket komunitas', tr: 'Topluluk paketleri', pl: 'Zestawy społeczności',
    }),
    communitySub: triLang(lang, {
      ru: 'Открыть каталог', uk: 'Відкрити каталог', en: 'Open catalog', es: 'Abrir catálogo',
      'pt-BR': 'Abrir catálogo', vi: 'Mở danh mục', id: 'Buka katalog', tr: 'Kataloğu aç',
      pl: 'Otwórz katalog',
    }),
    train: triLang(lang, {
      ru: 'Тренироваться с карточками', uk: 'Тренуватися з картками', en: 'Practise with cards',
      es: 'Entrenar con tarjetas', 'pt-BR': 'Treinar com cartões', vi: 'Luyện tập với thẻ',
      id: 'Latihan dengan kartu', tr: 'Kartlarla çalış', pl: 'Ćwicz z kartami',
    }),
    create: triLang(lang, {
      ru: 'Создать набор', uk: 'Створити набір', en: 'Create a pack', es: 'Crear pack',
      'pt-BR': 'Criar pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket', tr: 'Paket oluştur',
      pl: 'Utwórz zestaw',
    }),
    trainA11yLeft: (left: number, total: number) => triLang(lang, {
      ru: `Осталось ${left} из ${total} тренировок в этом месяце`,
      uk: `Залишилось ${left} з ${total} тренувань цього місяця`,
      en: `${left} of ${total} sessions left this month`,
      es: `Quedan ${left} de ${total} sesiones este mes`,
      'pt-BR': `Restam ${left} de ${total} sessões neste mês`,
      vi: `Còn ${left} trong ${total} lượt luyện tập tháng này`,
      id: `Sisa ${left} dari ${total} sesi bulan ini`,
      tr: `Bu ay ${total} çalışmadan ${left} tanesi kaldı`,
      pl: `Zostało ${left} z ${total} treningów w tym miesiącu`,
    }),
    trainA11yExhausted: triLang(lang, {
      ru: 'Все 30 тренировок на этот месяц использованы',
      uk: 'Усі 30 тренувань на цей місяць використано',
      en: 'All 30 training sessions for this month have been used',
      es: 'Ya usaste las 30 sesiones de este mes',
      'pt-BR': 'As 30 sessões deste mês foram usadas',
      vi: 'Bạn đã dùng hết 30 lượt luyện tập tháng này',
      id: '30 sesi bulan ini sudah digunakan',
      tr: 'Bu ayın 30 çalışmasının tamamı kullanıldı',
      pl: 'Wykorzystano wszystkie 30 treningów w tym miesiącu',
    }),
    back: triLang(lang, {
      ru: 'На главную', uk: 'На головну', en: 'Back to home', es: 'Volver al inicio',
      'pt-BR': 'Voltar ao início', vi: 'Về trang chính', id: 'Kembali ke beranda',
      tr: 'Ana sayfaya dön', pl: 'Wróć na stronę główną',
    }),
  }), [lang]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // Revision is an explicit retry signal: changing it restarts this focused load.
      void catalogLoadRevision;
      // Local settled count refreshes even on a warm Hub return from My Packs.
      void getCanonicalUserId().then((userId) => {
        if (!cancelled) setMyPackCount(peekMyPacksCount(studyTarget, userId));
      }).catch(() => {
        if (!cancelled) setMyPackCount(null);
      });
      /**
       * зачем (владелец 2026-09-21, «всё лагает, причём везде», TestFlight):
       * этот обработчик зовётся при КАЖДОМ открытии вкладки и собирал полную
       * цепочку — семь источников наборов, прогрев коллекции и четыре запроса,
       * из них до шести в облако. У самих запросов внутри есть кэши с TTL, но
       * СБОРКА цепочки, слияние и пересчёт шли всё равно, даже на свежих данных.
       * Теперь короткий TTL на сам вход: человек, листающий вкладки туда-сюда,
       * не платит за это ничего.
       * Гейт СОЗНАТЕЛЬНО обходят: кнопка «Повторить» (catalogLoadRevision — жест
       * человека, он ждёт свежих данных) и смена языка/цели обучения (ключ
       * ниже), иначе витрина показывала бы чужой язык.
       */
      const warmKey = `${lang}:${studyTarget}:${catalogLoadRevision}`;
      const warmedAt = hubWarmRef.current;
      if (warmedAt.key === warmKey && Date.now() - warmedAt.atMs < HUB_FOCUS_WARM_TTL_MS) {
        return () => { cancelled = true; };
      }
      hubWarmRef.current = { key: warmKey, atMs: Date.now() };
      /**
       * зачем (владелец 2026-09-13, «должно открываться молниеносно»): снимок
       * списка наборов поднимается с диска ЗДЕСЬ, пока человек смотрит на хаб.
       * К моменту тапа по «Тренировке» он уже в памяти, и экран выбора наборов
       * отрисовывает список первым кадром вместо спиннера на семь чтений.
       */
      void hydrateFcDeckOptionsSnapshot();
      /**
       * зачем (владелец 2026-09-14, «должно быть загружено ещё до того, как
       * раздел карточек открыт»): список наборов собирается здесь, в хабе,
       * пока человек ещё не нажал «Тренировка». Все режимы делят один снимок,
       * поэтому одного прогрева хватает на блиц, «Вспомни», свайп и «Устно».
       * Результат сразу уходит в память и на диск; экран выбора наборов берёт
       * его первым кадром.
       */
      void loadFcDeckOptions('trainer', lang, studyTarget).catch((error: unknown) => {
        console.warn('[FC-DECKS] hub:warm FAILED —', error instanceof Error ? error.message : String(error)); // guard-ok: лог отказа в catch, не на кадр
      });
      primeFlashcardsCollectionCache(studyTarget);
      void loadSelectedSavedContour(studyTarget).then((cards) => {
        if (!cancelled) setSavedCount(cards.length);
      }).catch(() => {
        if (!cancelled) setSavedCount(null);
      });
      /**
       * зачем: возврат на экран перечитывает каталог фоном, но НЕ стирает уже
       * показанный список. Скелетон уместен только когда показывать нечего.
       * Иначе каждый вход давал кадр «загрузка» поверх готовых данных.
       */
      if (catalogLenRef.current === 0) setCatalogLoadState('loading');
      openingPackRef.current = null;
      setOpeningPackId(null);
      void (async () => {
        const [official, published, owned, authored] = await Promise.all([
          loadMarketplacePacks(studyTarget).catch(() => [] as FlashcardMarketPack[]),
          cloudCommunityEnabled
            // Кнопка «Повторить» (revision > 0) — жест человека, идём мимо кэша.
            ? loadPublishedCommunityMarketPacks(studyTarget, { forceRemote: catalogLoadRevision > 0 })
                .catch(() => [] as FlashcardMarketPack[])
            : Promise.resolve([] as FlashcardMarketPack[]),
          cloudCommunityEnabled
            ? loadCommunityOwnedPackIds(studyTarget).catch(() => [] as string[])
            : Promise.resolve([] as string[]),
          loadLocalAuthorPacks(studyTarget).catch(() => []),
        ]);
        if (cancelled) {
          // Ранний выход обязан объясняться: экран потерял фокус до ответа.
          if (__DEV__) console.log('[FC-HUB] catalog load dropped: screen left focus');
          return;
        }
        /**
         * зачем (владелец: «раздел открывается и происходит скачок»): фокус
         * зовётся при КАЖДОМ входе и раздавал НОВЫЙ массив даже при том же
         * составе — новая ссылка перерисовывала всю витрину. Тот же приём уже
         * принят в useCollectionData (setCardsIfChanged): состав не изменился —
         * держим ПРЕЖНЮЮ ссылку, и повторный вход не даёт ни одной перерисовки.
         */
        const merged = mergeCatalogs(official, published);
        setCatalog((prev) => (sameCatalog(prev, merged) ? prev : merged));
        const nextOwned = [...new Set([...owned, ...authored.map((pack) => pack.id)])];
        setOwnedCommunityPackIds((prev) => (sameIds(prev, nextOwned) ? prev : nextOwned));
        setCatalogLoadState('ready');
      })();
      return () => {
        cancelled = true;
        openingPackRef.current = null;
      };
    }, [catalogLoadRevision, cloudCommunityEnabled, lang, studyTarget]),
  );

  const reloadCatalog = useCallback(() => {
    setCatalogLoadRevision((current) => current + 1);
  }, []);

  const openTopPack = useCallback((pack: FlashcardMarketPack) => {
    if (openingPackRef.current) return;
    openingPackRef.current = pack.id;
    setOpeningPackId(pack.id);
    void (async () => {
      const cards = await stageCommunityPackCardsWithSilentRetry(pack.id, studyTarget, pack, { isStillWanted: () => openingPackRef.current === pack.id, tag: 'hub' });
      if (openingPackRef.current !== pack.id) return;
      openingPackRef.current = null;
      setOpeningPackId(null);
      if (cards.length === 0) {
        emitPackNotDownloadedToast();
        return;
      }
      router.push({
        pathname: '/flashcards_collection',
        params: { pack: pack.id, preview: '1', from: 'hub' },
      } as never);
    })();
  }, [router, studyTarget]);

  const openCreatePack = useCallback(() => {
    void hapticTap();
    const target = buildFcCreateRoute('pack');
    router.push({ pathname: target.pathname, params: target.params } as never);
  }, [router]);

  const trainingLocked = quotaPreview.status === 'exhausted';
  /**
   * зачем (владелец 2026-09-13: «кнопка нажимается, но ничего не происходит»):
   * раньше пускал ТОЛЬКО статус 'allowed', поэтому при любой поломке на нашей
   * стороне тап гас молча. Решение владельца: человека нельзя наказывать за
   * нашу аварию — когда квоту прочитать НЕВОЗМОЖНО ('unavailable' — база
   * phone-state не открылась, 'stale_account' — токен разъехался), пускаем
   * так, будто лимит не исчерпан. Ждём мы только 'waiting' — это нормальная
   * загрузка, которая вот-вот закончится сама.
   */
  const trainingEntryReady = quotaPreview.status === 'allowed'
    || quotaPreview.status === 'unavailable'
    || quotaPreview.status === 'stale_account';
  const trainingRemaining = Math.max(0, quotaPreview.limit - quotaPreview.used);
  const trainAccessibilityLabel = trainingLocked
    ? `${copy.train}. ${copy.trainA11yExhausted}`
    : quotaPreview.status === 'allowed'
      ? `${copy.train}. ${copy.trainA11yLeft(trainingRemaining, quotaPreview.limit)}`
      : copy.train;

  // зачем (D152, координатор 01.10): при исчерпанном лимите тап ведёт в покупку, а не гаснет;
  // двойной тап не должен открыть окно дважды — защёлка снимается, когда хаб снова в фокусе.
  const paywallOpeningRef = useRef(false);
  useFocusEffect(useCallback(() => { paywallOpeningRef.current = false; }, []));
  const openTrainingPaywall = useCallback((context: 'flashcard_training', source: string) => {
    if (paywallOpeningRef.current) {
      console.log('[FC-TRAIN-ENTRY] paywall: повторный тап проглочен — окно уже открывается', JSON.stringify({ source }));
      return;
    }
    paywallOpeningRef.current = true;
    markNextNavigationAsReplace();
    router.replace({ pathname: '/premium_modal', params: { context, source } } as never);
  }, [router]);

  const chooseMode = useCallback((mode: CardsTrainingMode) => {
    if (trainingLocked) {
      openTrainingPaywall('flashcard_training', 'flashcards_hub_training_mode');
      return;
    }
    if (!trainingEntryReady) return;
    pendingModeRef.current = mode;
    setModeSheetVisible(false);
  }, [openTrainingPaywall, trainingEntryReady, trainingLocked]);

  const finishModeSheetDismissal = useCallback(() => {
    const mode = pendingModeRef.current;
    pendingModeRef.current = null;
    if (!mode) {
      requestAnimationFrame(() => {
        const node = findNodeHandle(trainButtonRef.current);
        if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
      });
      return;
    }
    router.push({ pathname: '/flashcards_training_setup', params: { mode } } as never);
  }, [router]);

  const contentWidth = Math.max(0, Math.min(contentMaxW, width) - 40);

  return (
    <View style={[styles.screen, { backgroundColor: g.bg }]}>
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFill} />
      <FeatureIntroEntry id="cards_hub_first_visit" enabled={accessResolved && !modeSheetVisible && openingPackId === null} />
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ContentWrap>
          <View style={styles.header}>
            <Pressable
                testID="fc-cards-hub-back"
                accessibilityRole="button"
                accessibilityLabel={copy.back}
                onPress={() => safeRouterBack(router, '/(tabs)/home' as never)}
                hitSlop={8}
                style={({ pressed }) => [styles.backButton, { backgroundColor: g.sheet }, pressed && styles.pressed]}
              >
                <HeaderGlassSheen edge={g.glassEdge} tint={g.selected} wash={g.opaqueSheet} />
                <Ionicons name="arrow-back" size={20} color={g.text} />
              </Pressable>
            <Text accessibilityRole="header" style={[styles.headerTitle, { color: g.text }]}>{copy.title}</Text>
            <Pressable
              testID="fc-cards-hub-create-pack"
              accessibilityRole="button"
              accessibilityLabel={copy.create}
              onPress={openCreatePack}
              hitSlop={8}
              style={({ pressed }) => [styles.headerTrailing, { backgroundColor: g.sheet }, pressed && styles.pressed]}
            >
              <HeaderGlassSheen edge={g.glassEdge} tint={g.selected} wash={g.opaqueSheet} />
              <Ionicons name="add" size={22} color={g.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.segments} accessibilityRole="tablist">
              <View testID="fc-cards-hub-segment-best" accessibilityRole="tab" accessibilityState={{ selected: true }} style={[styles.segment, { backgroundColor: g.selected }]}>
                <Text style={[styles.segmentText, { color: g.text }]}>{copy.bestSegment}</Text>
              </View>
              <Pressable testID="fc-cards-hub-segment-mine" accessibilityRole="tab" onPress={() => router.push('/flashcards_my_packs' as never)} style={({ pressed }) => [styles.segment, { backgroundColor: g.card }, pressed && styles.pressed]}>
                <Text style={[styles.segmentText, { color: g.secondary }]}>{copy.mine}</Text>
              </Pressable>
              <Pressable testID="fc-cards-hub-segment-community" accessibilityRole="tab" onPress={() => router.push('/flashcards_packs' as never)} style={({ pressed }) => [styles.segment, { backgroundColor: g.card }, pressed && styles.pressed]}>
                <Text style={[styles.segmentText, { color: g.secondary }]}>{copy.communitySegment}</Text>
              </Pressable>
            </View>
            <View style={styles.libraryList}>
              <LibraryRow
                testID="fc-cards-hub-library-saved"
                icon="bookmark-outline"
                savedArt={true}
                title={copy.saved}
                subtitle={copy.savedSub}
                count={savedCount}
                countPendingLabel={copy.countPending}
                lang={lang}
                onPress={() => router.push({ pathname: '/flashcards_collection', params: { cat: 'saved', from: 'hub' } } as never)}
              />
              <LibraryRow
                testID="fc-cards-hub-library-mine"
                icon="albums-outline"
                title={copy.mine}
                subtitle={copy.mineSub}
                count={myPackCount}
                countPendingLabel={copy.countUnavailable}
                lang={lang}
                onPress={() => router.push('/flashcards_my_packs' as never)}
              />
              <LibraryRow
                testID="fc-cards-hub-library-community"
                icon="people-outline"
                title={copy.community}
                subtitle={copy.communitySub}
                count={communityPackCount}
                countPendingLabel={copy.countPending}
                lang={lang}
                onPress={() => router.push('/flashcards_packs' as never)}
              />
              <LibraryRow
                testID="fc-cards-hub-library-video"
                icon="play-circle-outline"
                title={copy.video}
                subtitle={copy.videoSub}
                count={videoPackCount}
                countPendingLabel={copy.countUnavailable}
                lang={lang}
                onPress={() => router.push('/flashcards_video_packs' as never)}
              />
            </View>

            <SavedTopCommunityPacks
              catalog={catalog}
              ownedCommunityPackIds={ownedCommunityPackIds}
              lang={lang}
              contentWidth={contentWidth}
              openingPackId={openingPackId}
              onOpenPreview={openTopPack}
              onSeeAll={() => router.push('/flashcards_packs' as never)}
              loading={catalogLoadState === 'loading'}
              onRetry={reloadCatalog}
            />

          </ScrollView>
          <View style={[styles.trainDock, { backgroundColor: g.bgBottom }]}>
            <Pressable
              ref={trainButtonRef}
              testID="fc-cards-hub-train"
              accessibilityRole="button"
              accessibilityState={{ disabled: !trainingLocked && !trainingEntryReady }}
              accessibilityLabel={trainAccessibilityLabel}
              disabled={!trainingLocked && !trainingEntryReady}
              onPress={() => {
                void hapticTap();
                console.log('[FC-TRAIN-ENTRY] tap:train', JSON.stringify({
                  quotaStatus: quotaPreview.status, used: quotaPreview.used, limit: quotaPreview.limit,
                  bypass: quotaPreview.bypass, trainingLocked, trainingEntryReady, accessResolved,
                }));
                if (trainingLocked) {
                  openTrainingPaywall('flashcard_training', 'flashcards_hub_train');
                  return;
                }
                // зачем: этот выход был НЕМЫМ — на статусе waiting/unavailable/stale_account
                // тап не делал ничего и не оставлял следа. Причина обязана попасть в лог.
                if (!trainingEntryReady) {
                  console.warn(`[FC-TRAIN-ENTRY] tap:train → МЁРТВЫЙ ТАП, статус квоты="${quotaPreview.status}" (нужен "allowed")`);
                  return;
                }
                pendingModeRef.current = null;
                setModeSheetVisible(true);
              }}
              style={({ pressed }) => [styles.trainButton, { backgroundColor: g.accent }, pressed && styles.pressed, (!trainingLocked && !trainingEntryReady) && styles.trainDisabled]}
            >
              <View style={styles.trainButtonContent}>
                <Text style={[styles.trainText, { color: g.accentInk }]}>{copy.train}</Text>
                {/* зачем (D152): лимит исчерпан — видно по замку, но кнопка нажимается и ведёт в покупку. */}
                <Ionicons name={trainingLocked ? 'lock-closed' : 'arrow-forward'} size={20} color={g.ctaInk} />
              </View>
            </Pressable>
            <MonthlyTrainingSessionIndicator
              testID="fc-cards-hub-train-monthly-limit"
              quota={quotaPreview}
              textColor={g.text}
              mutedColor={g.mutedText}
              style={styles.trainDots}
            />
          </View>
        </ContentWrap>

        <FlashcardsTrainingModeSheet
          visible={modeSheetVisible}
          lang={lang}
          onClose={() => setModeSheetVisible(false)}
          onDismissed={finishModeSheetDismissal}
          onSelect={chooseMode}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, minHeight: 0 },
  header: { height: 48, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headerTitle: { flex: 1, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  headerTrailing: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pressed: { opacity: 0.82 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 22 },
  segments: { flexDirection: 'row', gap: 5, marginTop: 7, marginBottom: 16 },
  segment: { flex: 1, minHeight: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  segmentText: { fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  libraryList: { gap: 8 },
  libraryRow: { minHeight: 58, borderRadius: 13, paddingLeft: 11, paddingRight: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  rowSheen: { position: 'absolute', top: 0, left: 1, right: 1, height: 1 },
  libraryIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  savedArt: { width: 36, height: 36 },
  libraryCopy: { flex: 1, minWidth: 0 },
  libraryTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  librarySubtitle: { fontSize: 13, lineHeight: 18, marginTop: 1 },
  libraryCount: { minWidth: 24, fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'right' },
  trainDock: { paddingHorizontal: 20, paddingTop: 9 },
  trainButton: { minHeight: 52, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  trainDisabled: { opacity: 0.55 },
  trainButtonContent: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  trainDots: { marginTop: 10, alignSelf: 'center' },
  trainText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
});
