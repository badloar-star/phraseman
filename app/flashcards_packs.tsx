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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { AdaptiveLabel } from '../components/text-integrity/AdaptiveLabel';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { safeRouterBack } from './navigation_back';
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

export default function FlashcardsPacksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sort?: string }>();
  const { theme: t, f, statusBarLight, themeMode } = useTheme();
  /** В этом проекте градиентных тем (`ocean` / `sakura`) нет — шапка всегда на обычной поверхности. */
  const onColoredGradient = false;
  const gradHeaderInk = 'rgba(255,250,252,0.98)';
  const { lang } = useLang();
  // Изоляция целей обучения: каталог читает наборы и кэш текущей цели.
  const { studyTarget } = useStudyTarget();
  const hubCategoryLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const insets = useStableSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
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
    () => peekPublishedCommunityMarketPacks() ?? [],
  );
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
    void setStoredPackLanguage(next).catch(() => {});
  }, []);

  /**
   * Фильтр каталога живёт В ШАПКЕ экрана (замечание владельца): лупа + две круглые
   * кнопки сортировки. Состояние держим здесь и отдаём в каталог готовым.
   */
  const [communityQuery, setCommunityQuery] = useState('');
  const [communitySort, setCommunitySort] = useState<CommunityPacksSort>(() => params.sort === 'new' ? 'new' : 'popular');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  /** cards-2.0 (E3): параллакс орбов ScreenGradient от скролла (±20px), за reduceMotion. */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
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
    const localAuthored = await loadLocalAuthorPacks(studyTarget).catch(() => []);
    let commOwned: string[] = [];
    if (cloudCommunityEnabled) {
      commOwned = await loadCommunityOwnedPackIds(studyTarget).catch(() => [] as string[]);
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
      const sid = await getCanonicalUserId().catch(() => null);
      setHubAuthorStableId((prev) => (prev === sid ? prev : sid));
      const pendingAuthor = sid ? await loadAuthorCommunityPacksPendingUpdate(sid, studyTarget).catch(() => []) : [];
      const missingMeta = commOwned.filter((id) => !published.some((p) => p.id === id));
      const extras = await Promise.all(missingMeta.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(() => null)));
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

  /** Принудительное обновление после «Добавить себе» (через `onMarketRefresh` в каталоге). */
  const refreshHubMarketForce = useCallback(() => {
    void loadHubMarket({ force: true });
  }, [loadHubMarket]);

  useFocusEffect(
    useCallback(() => {
      primeFlashcardsCollectionCache(studyTarget);
      void loadHubMarket();
    }, [loadHubMarket, studyTarget]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
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
  }, [leavePacks, searchOpen, toggleSearch]);

  return (
    <ScreenGradient entranceOffsetY={reduceMotion ? undefined : (parallaxY as unknown as Animated.Value)}>
      <SafeAreaView
        style={[styles.safe, { backgroundColor: 'transparent' }]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <TouchableOpacity
            testID="flashcards-header-back"
            accessibilityLabel="qa-flashcards-header-back"
            accessible
            onPress={leavePacks}
            style={styles.headerBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={onColoredGradient ? gradHeaderInk : t.textPrimary} />
          </TouchableOpacity>

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
              { color: onColoredGradient ? gradHeaderInk : t.textPrimary, fontSize: headerTitleSize },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {screenTitle}
          </AdaptiveLabel>

          <View style={styles.headerActions}>
            <PackLanguagePicker
              lang={lang}
              t={t}
              value={packLanguage}
              onChange={handlePackLanguageChange}
            />
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
                {
                  borderColor: searchOpen || communityQuery.trim().length > 0 ? t.accent : t.border,
                  backgroundColor: searchOpen || communityQuery.trim().length > 0 ? `${t.accent}1F` : t.bgSurface,
                },
              ]}
            >
              <Ionicons
                name={searchOpen ? 'search' : 'search-outline'}
                size={18}
                color={searchOpen || communityQuery.trim().length > 0 ? t.accent : t.textSecond}
              />
            </TouchableOpacity>

          </View>

          {/*
            Раскрывающееся поле поиска. Лежит абсолютным слоем ПОВЕРХ заголовка и
            кнопок — так раскрытие не меняет высоту шапки и обходится анимацией
            только по opacity/transform. Закрытое поле не кликается и скрыто от
            скринридера.
          */}
          <Animated.View
            pointerEvents={searchOpen ? 'auto' : 'none'}
            accessibilityElementsHidden={!searchOpen}
            importantForAccessibility={searchOpen ? 'auto' : 'no-hide-descendants'}
            style={[
              styles.headerSearchLayer,
              {
                opacity: searchAnim,
                transform: [{ translateX: searchTranslateX }],
              },
            ]}
          >
            <View style={[styles.headerSearchField, { borderColor: t.accent, backgroundColor: t.bgSurface }]}>
              <Ionicons name="search-outline" size={16} color={t.accent} />
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
                style={[styles.headerSearchInput, { color: t.textPrimary }]}
              />
              <TouchableOpacity
                testID="flashcards-packs-search-close"
                accessibilityRole="button"
                accessibilityLabel={closeSearchLabel}
                accessible
                onPress={toggleSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={t.textMuted} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        <View style={styles.scrollRegion}>
          <Animated.ScrollView decelerationRate="fast"
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 84 },
            ]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
            alwaysBounceVertical={false}
            onScroll={reduceMotion ? undefined : onHubScroll}
            scrollEventThrottle={16}
          >
            <FlashcardsCategoryHub
              lang={hubCategoryLang}
              t={t}
              themeMode={themeMode}
              marketPacks={marketPacks}
              ownedPackIds={ownedPackIds}
              onMarketRefresh={refreshHubMarketForce}
              cloudCommunityEnabled={cloudCommunityEnabled}
              communityPacks={communityPacks}
              ownedCommunityPackIds={ownedCommunityPackIds}
              hubAuthorStableId={hubAuthorStableId}
              studyTarget={studyTarget}
              communityQuery={communityQuery}
              communitySort={communitySort}
              packLanguage={packLanguage}
            />
          </Animated.ScrollView>
        </View>
        <View style={[styles.bottomTabsDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[styles.bottomTabs, { backgroundColor: t.bgCard }]}>
            <TouchableOpacity
              testID="flashcards-packs-sort-new"
              accessibilityRole="button"
              accessibilityLabel={newPacksLabel}
              accessibilityState={{ selected: communitySort === 'new' }}
              onPress={() => { void hapticTap(); setCommunitySort('new'); }}
              style={[styles.bottomTab, communitySort === 'new' ? { backgroundColor: t.bgSurface } : null]}
            >
              <Ionicons name={communitySort === 'new' ? 'sparkles' : 'sparkles-outline'} size={20} color={communitySort === 'new' ? t.textPrimary : t.textSecond} />
              <Text style={{ color: communitySort === 'new' ? t.textPrimary : t.textSecond, fontSize: 12, fontWeight: '800', marginTop: 3 }}>{newPacksLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="flashcards-packs-create"
              accessibilityRole="button"
              accessibilityLabel={createPackLabel}
              accessible
              onPress={() => {
                void hapticTap();
                router.push({ pathname: '/community_pack_create', params: { origin: 'community', packLanguage } } as never);
              }}
              style={[styles.bottomTab, styles.bottomCreateTab, { backgroundColor: t.accent }]}
            >
              <Ionicons name="add" size={30} color={t.correctText} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="flashcards-packs-sort-popular"
              accessibilityRole="button"
              accessibilityLabel={topPacksLabel}
              accessibilityState={{ selected: communitySort === 'popular' }}
              onPress={() => { void hapticTap(); setCommunitySort('popular'); }}
              style={[styles.bottomTab, communitySort === 'popular' ? { backgroundColor: t.bgSurface } : null]}
            >
              <Ionicons name={communitySort === 'popular' ? 'trophy' : 'trophy-outline'} size={20} color={communitySort === 'popular' ? t.textPrimary : t.textSecond} />
              <Text style={{ color: communitySort === 'popular' ? t.textPrimary : t.textSecond, fontSize: 12, fontWeight: '800', marginTop: 3 }}>{topPacksLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, flexDirection: 'column', minHeight: 0 },
  scrollRegion: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scrollContent: { paddingTop: 16, paddingBottom: 104 },
  bottomTabsDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  bottomTabs: {
    minHeight: 68,
    width: '92%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bottomTab: {
    minWidth: 88,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCreateTab: {
    width: 54,
    minWidth: 54,
    height: 54,
    borderRadius: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  /** Лупа и фильтры — один размер и один стиль (замечание владельца). */
  headerRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  /**
   * Слой поиска. Yoga кладёт абсолютных детей от ПАДДИНГ-бокса родителя, поэтому
   * координаты здесь — от контентной области шапки: 36 = ширина кнопки «назад»,
   * дальше слой закрывает заголовок и круглые кнопки целиком.
   */
  headerSearchLayer: {
    position: 'absolute',
    left: 36,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 6,
  },
  headerSearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  headerSearchInput: {
    flex: 1,
    height: 34,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: 14,
  },
});
