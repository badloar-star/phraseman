/**
 * Cards 2.1 §5.3 — каталог наборов сообщества из хаба карточек.
 *
 * Раньше это был хаб-дашборд раздела на `/flashcards`; после §5.1 вход в раздел ведёт
 * на сохранённые карточки, а бывший хаб стал экраном каталога: только «Мои наборы»
 * и «Наборы сообщества» (бесплатные, с лайками и счётчиком добавлений).
 * Убраны (§1.3/§3/§4): чип баланса осколков в шапке, hero-CTA, секция режимов
 * практики и витрина официальных наборов с ценами.
 *
 * 2026-08-13 (владелец, после теста на iPhone) — шапка экрана:
 *   • единственный заголовок «Наборы сообщества» стоит справа от стрелки «назад»
 *     (раньше на экране было два заголовка: «Наборы» и секция «Наборы сообщества»);
 *   • строки поиска на экране нет — справа круглая лупа, поле раскрывается поверх
 *     шапки (только opacity/transform, деградирует при reduceMotion / lowPower);
 *   • фильтры — две круглые кнопки того же размера: «Популярные» (огонёк) и
 *     «Новые» (спарклы), без подписей, с обязательным accessibilityLabel.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useScaledTextStyles } from '../hooks/useLineScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { KitTouchable } from '../components/KitTouchable';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { actionBoxShadow, plateBoxShadow, raisedBoxShadow } from '../components/v2/ShadowSurface';
import { hapticTap } from '../hooks/use-haptics';
import { AdaptiveLabel } from '../components/text-integrity/AdaptiveLabel';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { safeRouterBack } from './navigation_back';
import { useTabContentBottomPad } from '../hooks/use-tab-content-bottom-pad';
import { useCommunityHeaderSlotSetter } from './community_header_slot';
import { primeFlashcardsCollectionCache } from './flashcards/useCollectionData';
import FlashcardsCategoryHub from './flashcards/FlashcardsCategoryHub';
import { packTileArtRevision } from './flashcards/packMarketplaceIcons';
import {
  fallbackBundledMarketPacks,
  loadMarketplacePacks,
  loadAccessiblePackIds,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import { loadCommunityOwnedPackIds } from './community_packs/communityOwnedStorage';
import { isLocalAuthorPackId, loadLocalAuthorPacks, mergeLocalAuthorPacks } from './community_packs/localAuthorPacks';
import {
  fetchCommunityPackMeta,
  loadAuthorCommunityPacksPendingUpdate,
  loadPublishedCommunityMarketPacks,
  peekPublishedCommunityMarketPacks,
  sortCommunityMarketPacksBySocial,
} from './community_packs/communityFirestore';
import { getCanonicalUserId } from './user_id_policy';
import { isLowPowerEffective } from './flashcards/low_power';
import {
  type CommunityPacksSort,
} from './community_packs/communityCatalogFilter';
import PackLanguagePicker from './flashcards/PackLanguagePicker';
import {
  defaultPackLanguageForStudyTarget,
  type PackLanguage,
} from './flashcards/pack_languages';
import { getStoredPackLanguage, setStoredPackLanguage, subscribePackLanguage } from './flashcards/pack_language_preferences';
import { noteSwallowedAs, noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type FlashcardsPacksScreenProps = {
  /** 'embedded' — раздел «Наборы» во вкладке «Сообщество» (2.0, D39): без «назад», док над таббаром. */
  presentation?: 'push' | 'embedded';
};

// зачем (Тень 12.10): прежний блюр-блик каталога с кромкой-линией убран — кнопки и поле шапки каталога это плашки с тенью темы

export default function FlashcardsPacksScreen({ presentation = 'push' }: FlashcardsPacksScreenProps = {}) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const embedded = presentation === 'embedded';
  const tabContentBottomPad = useTabContentBottomPad();
  const router = useRouter();
  const params = useLocalSearchParams<{ sort?: string }>();
  const { theme: t, f, statusBarLight, themeMode, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  /** В этом проекте градиентных тем (`ocean` / `sakura`) нет — шапка всегда на обычной поверхности. */
  const onColoredGradient = false;
  const gradHeaderInk = 'rgba(255,250,252,0.98)'; // theme-exempt: светлый текст по цветной шапке набора
  const { lang } = useLang();
  // Изоляция целей обучения: каталог читает наборы и кэш текущей цели.
  const { studyTarget } = useStudyTarget();
  const hubCategoryLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const insets = useStableSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  // зачем (владелец 11.10, community-redesign.html #c1: «нижней плавающей плашки больше нет»): док «Новые / + / Топ» над списком
  // убран — переключатель стоит под заголовком, «+» в строке заголовка. Мерить док больше нечего: нижний отступ — по таб-бару.
  /**
   * Заголовок делит шапку с тремя круглыми кнопками, поэтому на узких экранах
   * он аккуратно уменьшается, а не превращается в «Наборы сообщес…».
   */
  const headerTitleSize = useMemo(() => {
    if (screenW <= 320) return Math.max(13, f.h3 - 3);
    if (screenW < 360) return Math.max(14, f.h3 - 2);
    if (screenW < 400) return Math.max(15, f.h3 - 1);
    return f.h3;
  }, [f.h3, screenW]);
  /** Ширина, реально доступная заголовку: экран − паддинги − «назад» − три круглые кнопки. */
  const headerTitleW = useMemo(() => Math.max(72, screenW - 16 * 2 - 36 - 8 - 72 - 8 - 36), [screenW]);

  const [marketPacks, setMarketPacks] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks() ?? fallbackBundledMarketPacks(),
  );
  /**
   * зачем (владелец: «раздел открывается и происходит скачок, моргание»):
   * каталог сообщества стартовал ПУСТЫМ и наполнялся после ответа сети — первый
   * кадр показывал пустоту, следующий список. Тёплый снимок каталога (кэш 6 ч в
   * communityFirestore) даёт готовый первый кадр, сеть догоняет фоном и меняет
   * состояние только при изменившемся отпечатке (commFpRef).
   */
  const [communityPacks, setCommunityPacks] = useState<FlashcardMarketPack[]>(
    /**
     * зачем (владелец: «сначала моргает и затем появляется»): снимок КЛЮЧУЕТСЯ
     * по цели обучения, а здесь его читали без аргумента — ключ 'default' против
     * ключа реальной цели у записи. Посев промахивался ВСЕГДА, и тёплый кадр не
     * работал ни разу. Читаем тем же ключом, которым пишет loadHubMarket.
     */
    () => peekPublishedCommunityMarketPacks(studyTarget) ?? [],
  );
  // зачем (Сверка packs-simple-001): флаг «каталог реально пришёл» — до него вместо пустого состояния рисуется скелетон. Тёплый снимок = уже загружен.
  const [communityLoaded, setCommunityLoaded] = useState<boolean>(() => (peekPublishedCommunityMarketPacks(studyTarget)?.length ?? 0) > 0);
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  const [ownedCommunityPackIds, setOwnedCommunityPackIds] = useState<string[]>([]);
  const [hubAuthorStableId, setHubAuthorStableId] = useState<string | null>(null);
  const [packLanguage, setPackLanguage] = useState<PackLanguage>(() => defaultPackLanguageForStudyTarget(studyTarget));
  useEffect(() => subscribePackLanguage(setPackLanguage), []);

  useEffect(() => {
    let cancelled = false;
    void getStoredPackLanguage().then((stored) => {
      if (!cancelled) setPackLanguage(stored ?? defaultPackLanguageForStudyTarget(studyTarget));
    });
    return () => { cancelled = true; };
  }, [studyTarget]);

  const handlePackLanguageChange = useCallback((next: PackLanguage) => {
    setPackLanguage(next);
    void setStoredPackLanguage(next).catch(noteSwallowedHandler('flashcards_packs:useCallback.setStoredPackLanguage'));
  }, []);

  /**
   * Фильтр каталога живёт В ШАПКЕ экрана (замечание владельца): лупа + две круглые
   * кнопки сортировки. Состояние держим здесь и отдаём в каталог готовым.
   */
  const [communityQuery, setCommunityQuery] = useState('');
  // зачем (cards-section catalogNone «Сбросить фильтры»): мгновенный клиентский сброс строки поиска, без запросов.
  const resetCommunityFilters = useCallback(() => setCommunityQuery(''), []);
  // зачем (решение владельца «все элементы как на макете» через координатора 05.10; макет packs-simple.html кадр 1: `.bar3` — активна «Новые»):
  // каталог открывается на «Новые»; `?sort=popular` по-прежнему ведёт на «Топ». Сортировка клиентская над ОДНИМ загруженным списком —
  // ни нового запроса, ни индекса Firestore смена умолчания не требует (applyCommunityPacksFilter).
  const [communitySort, setCommunitySort] = useState<CommunityPacksSort>(() => params.sort === 'popular' ? 'popular' : 'new');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  /** cards-2.0 (E3): параллакс орбов ScreenGradient от скролла (±20px), за reduceMotion. */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(noteSwallowedHandler('flashcards_packs:useEffect.isReduceMotionEnabled'));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);
  /**
   * Раскрытие поля поиска: ТОЛЬКО opacity + translateX (никакой анимации высоты),
   * поле лежит абсолютным слоем поверх шапки, поэтому геометрия экрана не дёргается.
   * Одиночный `timing` на нажатие — бесконечных циклов нет. При «уменьшить движение»
   * и на слабых устройствах длительность = 0, состояние меняется мгновенно.
   */
  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchTranslateX = useMemo(
    () => searchAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0], extrapolate: 'clamp' }),
    [searchAnim],
  );
  const toggleSearch = useCallback(() => {
    void hapticTap();
    const next = !searchOpen;
    setSearchOpen(next);
    /** Закрыли — фильтр по названию снимаем: невидимое поле не должно молча резать каталог. */
    if (!next) setCommunityQuery('');
    const instant = reduceMotion || isLowPowerEffective();
    Animated.timing(searchAnim, {
      toValue: next ? 1 : 0,
      duration: instant ? 0 : 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    if (next) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      searchInputRef.current?.blur();
    }
  }, [searchOpen, reduceMotion, searchAnim]);

  const searchLabel = triLang(lang, {
    ru: 'Поиск набора', uk: 'Пошук набору', en: 'Search packs', es: 'Buscar pack',
    'pt-BR': 'Buscar pacote', vi: 'Tìm bộ thẻ', id: 'Cari paket', tr: 'Paket ara', pl: 'Szukaj zestawu',
  });
  const closeSearchLabel = triLang(lang, {
    ru: 'Закрыть поиск', uk: 'Закрити пошук', en: 'Close search', es: 'Cerrar la búsqueda',
    'pt-BR': 'Fechar a busca', vi: 'Đóng tìm kiếm', id: 'Tutup pencarian',
    tr: 'Aramayı kapat', pl: 'Zamknij wyszukiwanie',
  });
  const screenTitle = triLang(lang, {
    ru: 'Наборы сообщества', uk: 'Набори спільноти', en: 'Community packs', es: 'Packs de la comunidad',
    'pt-BR': 'Pacotes da comunidade', vi: 'Bộ thẻ cộng đồng', id: 'Paket komunitas',
    tr: 'Topluluk paketleri', pl: 'Zestawy społeczności',
  });
  const createPackLabel = triLang(lang, {
    ru: 'Создать набор', uk: 'Створити набір', en: 'Create a pack', es: 'Crear un pack',
    'pt-BR': 'Criar um pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket', tr: 'Paket oluştur', pl: 'Utwórz zestaw',
  });
  const newPacksLabel = triLang(lang, {
    ru: 'Новые', uk: 'Нові', en: 'New', es: 'Nuevos',
    'pt-BR': 'Novos', vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe',
  });
  const topPacksLabel = triLang(lang, {
    ru: 'Топ', uk: 'Топ', en: 'Top', es: 'Top',
    'pt-BR': 'Top', vi: 'Top', id: 'Teratas', tr: 'En iyi', pl: 'Top',
  });

  const scrollY = useRef(new Animated.Value(0)).current;
  const parallaxY = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [-120, 0, 480],
        outputRange: [12, 0, -20],
        extrapolate: 'clamp',
      }),
    [scrollY],
  );
  const onHubScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: Platform.OS !== 'web',
      }),
    [scrollY],
  );

  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  // `/flashcards` теперь единый хаб: каталог является его дочерним экраном.
  const leavePacks = useCallback(() => {
    safeRouterBack(router, '/flashcards' as any);
  }, [router]);

  /** Throttle Firestore-запросов: повторный focus не должен пересохранять list при беглом переключении. */
  const lastHubLoadAtRef = useRef<number>(0);
  /** Стабильность ссылок: setState только при реальной смене содержимого. */
  const marketFpRef = useRef<string>('');
  const ownedFpRef = useRef<string>('');
  const commFpRef = useRef<string>('');
  const commOwnedFpRef = useRef<string>('');

  const computeMarketFp = (packs: FlashcardMarketPack[]): string =>
    packs
      .map((p) => `${packTileArtRevision(p)}:${p.likesCount ?? 0}:${p.addedCount ?? 0}:${p.commentsCount ?? 0}:${p.cardCount}:${p.updatedAt}:${p.listingStatus ?? ''}`)
      .join('|');

  /**
   * зачем: посев из тёплого снимка наполнил communityPacks ещё до первой
   * загрузки, а отпечаток остался пустым — первый же ответ сети с ТЕМ ЖЕ
   * составом всё равно менял состояние и перерисовывал каталог. Засеваем
   * отпечаток тем, что реально показано на первом кадре.
   */
  const commFpSeededRef = useRef(false);
  if (!commFpSeededRef.current) {
    commFpSeededRef.current = true;
    if (communityPacks.length > 0) commFpRef.current = computeMarketFp(communityPacks);
  }

  const loadHubMarket = useCallback(async (opts?: { force?: boolean }) => {
    const now = Date.now();

    /** Локально доступные наборы перечитываем всегда — добавление пишет AsyncStorage до перезахода. */
    const owned = await loadAccessiblePackIds(studyTarget);
    const nextOwnedFp = [...owned].sort().join('|');
    if (nextOwnedFp !== ownedFpRef.current) {
      ownedFpRef.current = nextOwnedFp;
      setOwnedPackIds(owned);
    }

    /** Свои наборы с устройства («Сохранить» в редакторе) — всегда доступны автору. */
    const localAuthored = await loadLocalAuthorPacks(studyTarget).catch(noteSwallowedAs('flashcards_packs:useCallback.loadLocalAuthorPacks', []));
    let commOwned: string[] = [];
    if (cloudCommunityEnabled) {
      commOwned = await loadCommunityOwnedPackIds(studyTarget).catch(noteSwallowedAs('flashcards_packs:useCallback.loadCommunityOwnedPackIds', []));
    }
    {
      const ownedWithLocal = [...commOwned, ...localAuthored.map((p) => p.id)];
      const nextCommOwnedFp = [...ownedWithLocal].sort().join('|');
      if (nextCommOwnedFp !== commOwnedFpRef.current) {
        commOwnedFpRef.current = nextCommOwnedFp;
        setOwnedCommunityPackIds(ownedWithLocal);
      }
      /**
       * Только что сохранённый набор обязан появиться сразу: 30-секундный троттл ниже
       * относится к Firestore-каталогу и не должен задерживать локальные наборы.
       */
      setCommunityPacks((prev) => {
        const cloudOnly = prev.filter((p) => !isLocalAuthorPackId(p.id));
        const next = [...cloudOnly, ...mergeLocalAuthorPacks(cloudOnly, localAuthored, studyTarget)];
        const fp = computeMarketFp(next);
        if (fp === commFpRef.current) return prev;
        commFpRef.current = fp;
        return next;
      });
    }

    /** 30s throttle только для Firestore/каталога — блокировки снимаются без ожидания окна. */
    if (!opts?.force && now - lastHubLoadAtRef.current < 30_000) return;
    lastHubLoadAtRef.current = now;

    const [packsRes, commPubRes] = await Promise.allSettled([
      loadMarketplacePacks(studyTarget),
      cloudCommunityEnabled ? loadPublishedCommunityMarketPacks(studyTarget, { forceRemote: opts?.force }) : Promise.resolve([] as FlashcardMarketPack[]),
    ]);
    const packsRaw = packsRes.status === 'fulfilled' ? packsRes.value : fallbackBundledMarketPacks();
    const packs = packsRaw.length > 0 ? packsRaw : fallbackBundledMarketPacks();

    const nextMarketFp = computeMarketFp(packs);
    if (nextMarketFp !== marketFpRef.current) {
      marketFpRef.current = nextMarketFp;
      setMarketPacks(packs);
    }

    if (cloudCommunityEnabled) {
      const published = commPubRes.status === 'fulfilled' ? commPubRes.value : [];
      const sid = await getCanonicalUserId().catch(noteSwallowedAs('flashcards_packs:useCallback.getCanonicalUserId', null));
      setHubAuthorStableId((prev) => (prev === sid ? prev : sid));
      const pendingAuthor = sid
        ? await loadAuthorCommunityPacksPendingUpdate(sid, studyTarget).catch((error: unknown): FlashcardMarketPack[] => {
          // зачем (8L): немой catch прятал отказ — причина в лог, без uid; поведение прежнее ([]).
          console.warn(`[MY-PACKS] author_packs caller_failed screen=packs kind=${error instanceof Error ? error.name : typeof error}`);
          return [];
        })
        : [];
      const missingMeta = commOwned.filter((id) => !published.some((p) => p.id === id));
      const extras = await Promise.all(missingMeta.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(noteSwallowedAs('flashcards_packs:useCallback.fetchCommunityPackMeta', null))));
      const localMarket = mergeLocalAuthorPacks([...published, ...pendingAuthor], localAuthored, studyTarget);
      const merged = [...published, ...pendingAuthor, ...(extras.filter(Boolean) as FlashcardMarketPack[]), ...localMarket];
      const seen = new Set<string>();
      const dedup: FlashcardMarketPack[] = [];
      for (const p of merged) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        dedup.push(p);
      }
      dedup.sort((a, b) => {
        /** Cards 2.1 §2.3: лайки ↓ → добавления ↓ → свежесть. */
        if (a.isCommunityUgc && b.isCommunityUgc) return sortCommunityMarketPacksBySocial(a, b);
        return 0;
      });
      const nextCommFp = computeMarketFp(dedup);
      if (nextCommFp !== commFpRef.current) {
        commFpRef.current = nextCommFp;
        setCommunityPacks(dedup);
      }
    } else {
      const localOnly = mergeLocalAuthorPacks([], localAuthored, studyTarget);
      const nextCommFp = computeMarketFp(localOnly);
      if (nextCommFp !== commFpRef.current) {
        commFpRef.current = nextCommFp;
        setCommunityPacks(localOnly);
      }
      setHubAuthorStableId(null);
    }
  }, [cloudCommunityEnabled, studyTarget]);

  /**
   * Обновление после «Добавить себе» с экрана набора (через `onMarketRefresh` в каталоге).
   * зачем (ревью 11.10, 💸 Firebase): раньше здесь был `force: true` — каждое добавление перечитывало весь каталог
   * (до 50 документов + ожидающие наборы автора + мета), 5 «+» ≈ 250 чтений. Владение после добавления — локальная
   * запись (её loadHubMarket перечитывает ВСЕГДА, без сети), поэтому Firestore-часть идёт с обычным 30-секундным троттлом.
   * «+» на самой плашке каталога обновление не зовёт вовсе (FlashcardsCategoryHub, `refresh skipped reason=quick_add`).
   */
  const refreshHubMarketAfterAdd = useCallback(() => {
    void loadHubMarket();
  }, [loadHubMarket]);

  useFocusEffect(
    useCallback(() => {
      primeFlashcardsCollectionCache(studyTarget);
      void loadHubMarket().finally(() => setCommunityLoaded(true));
    }, [loadHubMarket, studyTarget]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // зачем: во вкладке «Сообщество» уходить некуда — «назад» принадлежит таббару,
    // перехватываем его только чтобы закрыть открытый поиск.
    if (embedded && !searchOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      /** Открытый поиск закрываем первым — иначе «назад» уводит с экрана мимо намерения. */
      if (searchOpen) {
        toggleSearch();
        return true;
      }
      leavePacks();
      return true;
    });
    return () => sub.remove();
  }, [embedded, leavePacks, searchOpen, toggleSearch]);

  const headerActions = (
          <View style={styles.headerActions}>
            {/* зачем (владелец 04.10, packs-simple.html кадр 1): в шапке сначала круглая лупа, затем пилюля «EN ▾». */}
            <TouchableOpacity
              testID="flashcards-packs-search-toggle"
              accessibilityRole="button"
              accessibilityLabel={searchOpen ? closeSearchLabel : searchLabel}
              accessibilityState={{ expanded: searchOpen }}
              accessible
              onPress={toggleSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.headerRoundBtn,
                embedded ? styles.headerRoundBtnLarge : null,
                // выбранное (поиск открыт или задан) приподнято, иначе обычная плашка
                searchOpen || communityQuery.trim().length > 0
                  ? { backgroundColor: g.raisedFillFrom, boxShadow: raisedBoxShadow(g) }
                  : { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) },
              ]}
            >
              <Ionicons
                name={searchOpen ? 'search' : 'search-outline'}
                size={18}
                color={searchOpen || communityQuery.trim().length > 0 ? t.accentText : g.secondary}
              />
            </TouchableOpacity>
            <PackLanguagePicker
              pill={embedded}
              lang={lang}
              t={t}
              value={packLanguage}
              onChange={handlePackLanguageChange}
            />

          </View>
  );

  const searchLayer = (
          <Animated.View
            pointerEvents={searchOpen ? 'auto' : 'none'}
            accessibilityElementsHidden={!searchOpen}
            importantForAccessibility={searchOpen ? 'auto' : 'no-hide-descendants'}
            style={[
              styles.headerSearchLayer,
              embedded ? styles.headerSearchLayerEmbedded : null,
              {
                opacity: searchAnim,
                transform: [{ translateX: searchTranslateX }],
              },
            ]}
          >
            {embedded ? (
              // зачем (community-redesign.html #c1 экран 2, `.ib.bare`): слева «назад» 44 БЕЗ подложки — она же закрывает поиск.
              <KitTouchable
                testID="flashcards-packs-search-back"
                accessibilityRole="button"
                accessibilityLabel={closeSearchLabel}
                onPress={toggleSearch}
                style={styles.searchBareBtn}
              >
                <Ionicons name="chevron-back" size={22} color={g.text} />
              </KitTouchable>
            ) : null}
            <View
              style={[
                styles.headerSearchField,
                embedded
                  // `.sf`: поле 52, скругление 26, заливка .08 и тонкая ВНУТРЕННЯЯ кромка (не обводка-контейнер).
                  ? [styles.headerSearchFieldEmbedded, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]
                  : { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }, // зачем (Тень 12.10): поле поиска без кромки
              ]}
            >
              <Ionicons name="search-outline" size={embedded ? 20 : 16} color={embedded ? g.secondary : t.accentText} />
              <TextInput
                ref={searchInputRef}
                testID="flashcards-packs-search"
                accessibilityLabel={searchLabel}
                value={communityQuery}
                onChangeText={setCommunityQuery}
                placeholder={searchLabel}
                placeholderTextColor={t.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                maxFontSizeMultiplier={1.2}
                style={[styles.headerSearchInput, embedded ? styles.headerSearchInputEmbedded : null, { color: g.text }]}
              />
              <TouchableOpacity
                testID="flashcards-packs-search-close"
                accessibilityRole="button"
                accessibilityLabel={closeSearchLabel}
                accessible
                onPress={toggleSearch}
                hitSlop={embedded ? undefined : { top: 8, bottom: 8, left: 8, right: 8 }}
                // зачем (`.sf .ib.bare`): во вкладке «Сообщество» крестик — круг 44 без подложки внутри поля.
                style={embedded ? styles.searchBareBtn : null}
              >
                <Ionicons name={embedded ? 'close' : 'close-circle'} size={18} color={embedded ? g.secondary : t.textMuted} />
              </TouchableOpacity>
            </View>
          </Animated.View>
  );

  // зачем: во вкладке «Сообщество» кнопки раздела живут в общей шапке. Слот пересобирается только при
  // смене того, что в нём видно, — иначе шапка ловила бы новый объект на каждый рендер раздела.
  const setHeaderSlot = useCommunityHeaderSlotSetter();
  const headerSlot = useMemo(
    // зачем: слой отдаётся только при открытом поиске — шапка тогда ставит его ВМЕСТО вкладок (кадр 2).
    () => (embedded ? { right: headerActions, overlay: searchOpen ? searchLayer : null } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- JSX выше выводится ровно из этих значений
    [embedded, searchOpen, communityQuery, packLanguage, lang, liquidGlassThemeId, t, toggleSearch, handlePackLanguageChange, searchLabel, closeSearchLabel],
  );
  useEffect(() => {
    if (!setHeaderSlot) return;
    setHeaderSlot(headerSlot);
  }, [headerSlot, setHeaderSlot]);
  useEffect(() => () => setHeaderSlot?.(null), [setHeaderSlot]);

  return (
    <ScreenGradient entranceOffsetY={reduceMotion || embedded ? undefined : (parallaxY as unknown as Animated.Value)}>
      {/* зачем (эмулятор 30.09): внутри «Сообщества» свой градиент начинался под переключателем
          и давал ступеньку тона; фон рисует вкладка, как у встроенных «Друзей». */}
      {embedded ? null : <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />}
      <SafeAreaView
        style={[styles.safe, { backgroundColor: 'transparent' }]}
        edges={embedded ? ['left', 'right'] : ['top', 'left', 'right']}
      >
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {/* зачем (владелец 04.10, packs-simple.html): во вкладке «Сообщество» своей шапки нет —
            лупа и язык уходят в общую строку вкладок через слот, заголовок — в начало списка. */}
        {embedded ? null : (
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          {embedded ? null : (
          <TouchableOpacity
            testID="flashcards-header-back"
            accessibilityLabel="qa-flashcards-header-back"
            accessible
            onPress={leavePacks}
            style={styles.headerBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={onColoredGradient ? gradHeaderInk : g.text} />
          </TouchableOpacity>
          )}

          {/*
            Единственный заголовок экрана — сразу справа от стрелки «назад».
            AdaptiveLabel вместо сырого numberOfLines: длинные локали (pl/pt-BR)
            ужимаются по размеру шрифта, а не обрезаются многоточием.
          */}
          <AdaptiveLabel
            testID="flashcards-packs-title"
            provenance="authored"
            availableWidth={headerTitleW}
            compactLineLimit={1}
            accessibilityRole="header"
            style={[
              styles.headerTitle,
              { color: onColoredGradient ? gradHeaderInk : g.text, fontSize: headerTitleSize },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {screenTitle}
          </AdaptiveLabel>

          {headerActions}

          {/*
            Раскрывающееся поле поиска. Лежит абсолютным слоем ПОВЕРХ заголовка и
            кнопок — так раскрытие не меняет высоту шапки и обходится анимацией
            только по opacity/transform. Закрытое поле не кликается и скрыто от
            скринридера.
          */}
          {searchLayer}
        </View>
        )}

        <View style={styles.scrollRegion}>
          <Animated.ScrollView decelerationRate="fast"
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              embedded ? styles.scrollContentEmbedded : null,
              { paddingBottom: (embedded ? tabContentBottomPad : Math.max(insets.bottom, 16)) + 24 },
            ]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
            alwaysBounceVertical={false}
            onScroll={reduceMotion ? undefined : onHubScroll}
            scrollEventThrottle={16}
          >
            {searchOpen ? null : (
              // зачем (владелец 11.10, community-redesign.html #c1 экран 1): «Наборы сообщества» 32/38 и справа круглая «+» 44
              // цвета темы — создать набор; ниже переключатель «Новые / Топ» (`.sg`). На экране поиска (экран 2) этого блока нет.
              <View style={styles.listHead}>
                <View style={styles.titleRow}>
                  {embedded ? (
                    <Text accessibilityRole="header" testID="flashcards-packs-title-embedded" style={[styles.embeddedTitle, { color: g.text }]}>
                      {screenTitle}
                    </Text>
                  ) : <View style={styles.titleSpacer} />}
                  <KitTouchable
                    testID="flashcards-packs-create"
                    accessibilityRole="button"
                    accessibilityLabel={createPackLabel}
                    onPress={() => {
                      void hapticTap();
                      router.push({ pathname: '/community_pack_create', params: { origin: 'community', packLanguage } } as never);
                    }}
                    style={[styles.createBtn, { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }]}
                  >
                    <Ionicons name="add" size={22} color={g.accentInk} />
                  </KitTouchable>
                </View>
                <View
                  accessibilityRole="tablist"
                  style={[styles.segment, {
                    backgroundColor: g.plateFillFrom,
                    boxShadow: plateBoxShadow(g),
                  }]}
                >
                  {(['new', 'popular'] as const).map((sort) => {
                    const on = communitySort === sort;
                    const label = sort === 'new' ? newPacksLabel : topPacksLabel;
                    return (
                      <KitTouchable
                        key={sort}
                        testID={sort === 'new' ? 'flashcards-packs-sort-new' : 'flashcards-packs-sort-popular'}
                        accessibilityRole="tab"
                        accessibilityLabel={label}
                        accessibilityState={{ selected: on }}
                        onPress={() => {
                          if (on) return;
                          void hapticTap();
                          setCommunitySort(sort);
                        }}
                        style={[styles.segmentItem, on ? { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) } : null]}
                      >
                        <Text style={[styles.segmentText, { color: on ? g.accentInk : g.secondary }]}>{label}</Text>
                      </KitTouchable>
                    );
                  })}
                </View>
              </View>
            )}
            <FlashcardsCategoryHub
              lang={hubCategoryLang}
              t={t}
              themeMode={themeMode}
              marketPacks={marketPacks}
              ownedPackIds={ownedPackIds}
              onMarketRefresh={refreshHubMarketAfterAdd}
              cloudCommunityEnabled={cloudCommunityEnabled}
              communityPacks={communityPacks}
              communityLoaded={communityLoaded}
              ownedCommunityPackIds={ownedCommunityPackIds}
              hubAuthorStableId={hubAuthorStableId}
              studyTarget={studyTarget}
              communityQuery={communityQuery}
              onResetFilters={resetCommunityFilters}
              communitySort={communitySort}
              packLanguage={packLanguage}
            />
          </Animated.ScrollView>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, flexDirection: 'column', minHeight: 0 },
  scrollRegion: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scrollContent: { paddingTop: 16, paddingBottom: 104 },
  scrollContentEmbedded: { paddingTop: 8 },
  // зачем (community-redesign.html #c1, `.h1c`): заголовок 32/38, 700, -0.6; строка заголовка с «+» — отступ 10 сверху.
  listHead: { paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  titleSpacer: { flex: 1 },
  embeddedTitle: { flex: 1, minWidth: 0, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6 },
  // `.ib.ac`: круг 44 цвета темы, значок цветом «на акценте».
  createBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // `.sg`: капсула 4/18, сегменты 38 r14, текст 15/600 макета → 16 (D145); отступ 14 от заголовка.
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 18, marginTop: 14 },
  segmentItem: { flex: 1, minHeight: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  segmentText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5, // shadow-ok: разделитель-линия под шапкой экрана, не контейнер
  },
  headerBack: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    marginLeft: 2,
    marginRight: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }, // зачем (Тень 12.10): между плашками ≥ 10
  /** Лупа и фильтры — один размер и один стиль (замечание владельца). */
  headerRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * Слой поиска. Yoga кладёт абсолютных детей от ПАДДИНГ-бокса родителя, поэтому
   * координаты здесь — от контентной области шапки: 36 = ширина кнопки «назад»,
   * дальше слой закрывает заголовок и круглые кнопки целиком.
   */
  // зачем: `.rb` packs-simple.html — круглая кнопка 42 в общей шапке «Сообщества».
  headerRoundBtnLarge: { width: 42, height: 42, borderRadius: 21 },
  headerSearchLayer: {
    position: 'absolute',
    left: 36,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 6,
  },
  // зачем (community-redesign.html #c1 экран 2, `.flex` + `.sf`): слой на месте строки вкладок: «назад» 44 без подложки,
  // промежуток 8, поле 52 со скруглением 26, поля 0/6/0/16, внутри промежуток 10, справа крестик 44 без подложки.
  headerSearchLayerEmbedded: { left: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSearchFieldEmbedded: { flex: 1, minHeight: 52, height: 52, borderRadius: 26, paddingLeft: 16, paddingRight: 6, gap: 10 },
  searchBareBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // зачем: макет 17; шкала D145 (решение владельца 04.10) — 16.
  headerSearchInputEmbedded: { height: 44, fontSize: 16 },
  headerSearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  headerSearchInput: {
    flex: 1,
    height: 34,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: 13,
  },
});
