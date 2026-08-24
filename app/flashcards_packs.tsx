/**
 * Cards 2.1 §5.3 — каталог наборов сообщества (правая позиция таббара «Наборы»).
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
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
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
import FlashcardsTabBar, { FC_TABBAR_HEIGHT, useFcTabBarScroll } from './flashcards/FlashcardsTabBar';
import {
  fallbackBundledMarketPacks,
  loadMarketplacePacks,
  loadAccessiblePackIds,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import { loadCommunityOwnedPackIds } from './community_packs/communityOwnedStorage';
import { loadLocalAuthorPacks, mergeLocalAuthorPacks } from './community_packs/localAuthorPacks';
import {
  fetchCommunityPackMeta,
  loadAuthorCommunityPacksPendingUpdate,
  loadPublishedCommunityMarketPacks,
  sortCommunityMarketPacksBySocial,
} from './community_packs/communityFirestore';
import { getCanonicalUserId } from './user_id_policy';
import { isLowPowerEffective } from './flashcards/low_power';
import {
  COMMUNITY_SORTS,
  communitySortIonicon,
  communitySortLabel,
  type CommunityPacksSort,
} from './community_packs/communityCatalogFilter';

export default function FlashcardsPacksScreen() {
  const router = useRouter();
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
  const headerTitleW = useMemo(() => Math.max(72, screenW - 16 * 2 - 36 - 10 - (36 * 3 + 8 * 2)), [screenW]);

  const [marketPacks, setMarketPacks] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks() ?? fallbackBundledMarketPacks(),
  );
  const [communityPacks, setCommunityPacks] = useState<FlashcardMarketPack[]>([]);
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  const [ownedCommunityPackIds, setOwnedCommunityPackIds] = useState<string[]>([]);
  const [hubAuthorStableId, setHubAuthorStableId] = useState<string | null>(null);

  /**
   * Фильтр каталога живёт В ШАПКЕ экрана (замечание владельца): лупа + две круглые
   * кнопки сортировки. Состояние держим здесь и отдаём в каталог готовым.
   */
  const [communityQuery, setCommunityQuery] = useState('');
  const [communitySort, setCommunitySort] = useState<CommunityPacksSort>('popular');
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
    ru: 'Поиск набора', uk: 'Пошук набору', es: 'Buscar pack',
    'pt-BR': 'Buscar pacote', vi: 'Tìm bộ thẻ', id: 'Cari paket', tr: 'Paket ara', pl: 'Szukaj zestawu',
  });
  const closeSearchLabel = triLang(lang, {
    ru: 'Закрыть поиск', uk: 'Закрити пошук', es: 'Cerrar la búsqueda',
    'pt-BR': 'Fechar a busca', vi: 'Đóng tìm kiếm', id: 'Tutup pencarian',
    tr: 'Aramayı kapat', pl: 'Zamknij wyszukiwanie',
  });
  const screenTitle = triLang(lang, {
    ru: 'Наборы сообщества', uk: 'Набори спільноти', es: 'Packs de la comunidad',
    'pt-BR': 'Pacotes da comunidade', vi: 'Bộ thẻ cộng đồng', id: 'Paket komunitas',
    tr: 'Topluluk paketleri', pl: 'Zestawy społeczności',
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
  /**
   * §5.2: капсула таббара сжимается при скролле — как на главной.
   * Скролл этого экрана уже занят нативным параллаксом орбов, поэтому таббар
   * подключён `listener`-ом того же `Animated.event`: покадрово это пара
   * арифметических операций и запись shared value, без `setState` и без
   * повторного onScroll-моста (сама анимация капсулы идёт на UI-потоке).
   */
  const tabScroll = useFcTabBarScroll();
  const onHubScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: Platform.OS !== 'web',
        listener: tabScroll.onScroll,
      }),
    [scrollY, tabScroll],
  );

  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  // зачем (владелец, 2026-08-16): фолбек '/flashcards' уводил в СОСЕДНЮЮ позицию
  // того же таббара карточек, а не наружу — раздел замыкался сам на себя.
  const leavePacks = useCallback(() => {
    safeRouterBack(router, '/(tabs)/home' as any);
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
      .map((p) => `${packTileArtRevision(p)}:${p.likesCount ?? 0}:${p.addedCount ?? 0}:${p.cardCount}:${p.updatedAt}:${p.listingStatus ?? ''}`)
      .join('|');

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
        const cloudOnly = prev.filter((p) => p.listingStatus !== 'local_only');
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
      cloudCommunityEnabled ? loadPublishedCommunityMarketPacks(studyTarget) : Promise.resolve([] as FlashcardMarketPack[]),
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

            {/* Фильтры: те же круглые кнопки, только иконки — подпись живёт в accessibilityLabel. */}
            {COMMUNITY_SORTS.map((key) => {
              const active = communitySort === key;
              return (
                <TouchableOpacity
                  key={key}
                  testID={`flashcards-packs-sort-${key}`}
                  accessibilityRole="button"
                  accessibilityLabel={communitySortLabel(key, lang)}
                  accessibilityState={{ selected: active }}
                  accessible
                  onPress={() => {
                    void hapticTap();
                    setCommunitySort(key);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  style={[
                    styles.headerRoundBtn,
                    {
                      borderColor: active ? t.accent : t.border,
                      backgroundColor: active ? `${t.accent}1F` : t.bgSurface,
                    },
                  ]}
                >
                  <Ionicons
                    name={communitySortIonicon(key, active) as any}
                    size={18}
                    color={active ? t.accent : t.textSecond}
                  />
                </TouchableOpacity>
              );
            })}
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
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 + FC_TABBAR_HEIGHT },
            ]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
            alwaysBounceVertical={false}
            onScroll={reduceMotion ? tabScroll.onScroll : onHubScroll}
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
            />
          </Animated.ScrollView>
        </View>

        {/* Cards 2.1 §5.2: тот же таббар раздела, правая позиция активна */}
        <FlashcardsTabBar lang={lang} t={t} active="packs" bottomInset={insets.bottom} scroll={tabScroll} />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, flexDirection: 'column', minHeight: 0 },
  scrollRegion: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scrollContent: { paddingTop: 16 },
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
