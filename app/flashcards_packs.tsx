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
  Platform,
  StatusBar,
  StyleSheet,
  Text,
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
import { actionBoxShadow } from '../components/v2/ShadowSurface';
import { KitSearchField } from '../components/cards-grid/CardsKit';
import { PackChips, PackRoundButton } from '../components/packs/PackScreenKit';
import { packDeckLevel } from '../components/packs/packDeckModel';
import { hapticTap } from '../hooks/use-haptics';
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
import {
  communitySortLabel,
  type CommunityPacksSort,
} from './community_packs/communityCatalogFilter';
import PackLanguagePicker from './flashcards/PackLanguagePicker';
import {
  defaultPackLanguageForStudyTarget,
  isStudyPackLanguage,
  normalizePackLanguage,
  PACK_LANGUAGES,
  type PackLanguage,
  type StudyPackLanguage,
} from './flashcards/pack_languages';
import { getStoredPackLanguage, setStoredPackLanguage, subscribePackLanguage } from './flashcards/pack_language_preferences';
import { useCatalogOffline } from './flashcards/useCatalogOffline';
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
  const { theme: t, statusBarLight, themeMode, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  /** В этом проекте градиентных тем (`ocean` / `sakura`) нет — шапка всегда на обычной поверхности. */
  const onColoredGradient = false;
  const gradHeaderInk = 'rgba(255,250,252,0.98)'; // theme-exempt: светлый текст по цветной шапке набора
  const { lang } = useLang();
  // Изоляция целей обучения: каталог читает наборы и кэш текущей цели.
  const { studyTarget } = useStudyTarget();
  const hubCategoryLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const insets = useStableSafeAreaInsets();
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
  // зачем (cards-v2 commHead()): чипы «Популярные / Новые / A1…B2» — один выбранный; уровень — клиентский фильтр поверх сортировки «Популярные».
  // Чипы уровней рисуются, только если у каких-то наборов каталога есть уровень (поля пока нет — данные ждём от Ядра).
  const [communityLevel, setCommunityLevel] = useState<string | null>(null);

  /** cards-2.0 (E3): параллакс орбов ScreenGradient от скролла (±20px), за reduceMotion. */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(noteSwallowedHandler('flashcards_packs:useEffect.isReduceMotionEnabled'));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);
  // зачем (cards-v2 catalog(): капсула поиска «Наборы и авторы»): один постоянный ввод под заголовком вместо лупы, раскрывающей поле в шапке.
  const searchLabel = triLang(lang, {
    ru: 'Наборы и авторы', uk: 'Набори й автори', en: 'Packs and authors', es: 'Packs y autores',
    'pt-BR': 'Pacotes e autores', vi: 'Bộ thẻ và tác giả', id: 'Paket dan penulis', tr: 'Paketler ve yazarlar', pl: 'Zestawy i autorzy',
  });
  const clearSearchLabel = triLang(lang, {
    ru: 'Очистить поиск', uk: 'Очистити пошук', en: 'Clear search', es: 'Borrar la búsqueda',
    'pt-BR': 'Limpar a busca', vi: 'Xóa tìm kiếm', id: 'Hapus pencarian',
    tr: 'Aramayı temizle', pl: 'Wyczyść wyszukiwanie',
  });
  const screenTitle = triLang(lang, {
    ru: 'Сообщество', uk: 'Спільнота', en: 'Community', es: 'Comunidad',
    'pt-BR': 'Comunidade', vi: 'Cộng đồng', id: 'Komunitas',
    tr: 'Topluluk', pl: 'Społeczność',
  });
  const createPackLabel = triLang(lang, {
    ru: 'Создать набор', uk: 'Створити набір', en: 'Create a pack', es: 'Crear un pack',
    'pt-BR': 'Criar um pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket', tr: 'Paket oluştur', pl: 'Utwórz zestaw',
  });
  const newPacksLabel = communitySortLabel('new', lang);
  const topPacksLabel = communitySortLabel('popular', lang);
  /** Уровни, которые реально встречаются в каталоге (A1…C2 по порядку); нет данных — пусто, чипы уровней скрыты. */
  const availableLevels = useMemo(() => {
    const present = new Set<string>();
    for (const pack of communityPacks) {
      const level = packDeckLevel(pack);
      if (level) present.add(level);
    }
    return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].filter((level) => present.has(level));
  }, [communityPacks]);
  const filterChips = useMemo(() => [
    { id: 'popular', label: topPacksLabel },
    { id: 'new', label: newPacksLabel },
    ...availableLevels.map((level) => ({ id: level, label: level })),
  ], [availableLevels, newPacksLabel, topPacksLabel]);
  const activeChip = communityLevel ?? communitySort;
  const onChip = useCallback((id: string) => {
    void hapticTap();
    if (id === 'popular' || id === 'new') {
      setCommunityLevel(null);
      setCommunitySort(id);
      return;
    }
    // уровень — фильтр поверх «Популярных»
    setCommunitySort('popular');
    setCommunityLevel(id);
  }, []);

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
  // зачем (сверка Макетов e4e4149d0): пустой каталог без сети — отдельное состояние «Нет сети» + «Повторить» (лог [CATALOG-OFFLINE]).
  const communityOffline = useCatalogOffline({
    enabled: cloudCommunityEnabled,
    loaded: communityLoaded,
    hasCloudPacks: communityPacks.some((p) => !isLocalAuthorPackId(p.id)),
  });
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

  /** «Повторить» в состоянии «Нет сети»: скелетон на время запроса и один принудительный запрос каталога по тапу. */
  const retryCatalog = useCallback(() => {
    console.log('[CATALOG-OFFLINE] retry → force reload');
    setCommunityLoaded(false);
    void loadHubMarket({ force: true })
      .catch((error: unknown) => console.warn(`[CATALOG-OFFLINE] retry failed reason=${error instanceof Error ? error.name : typeof error}`))
      .finally(() => setCommunityLoaded(true));
  }, [loadHubMarket]);

  useFocusEffect(
    useCallback(() => {
      primeFlashcardsCollectionCache(studyTarget);
      void loadHubMarket().finally(() => setCommunityLoaded(true));
    }, [loadHubMarket, studyTarget]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // зачем: во вкладке «Сообщество» уходить некуда — «назад» принадлежит таббару, его не перехватываем.
    if (embedded) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leavePacks();
      return true;
    });
    return () => sub.remove();
  }, [embedded, leavePacks]);

  // зачем (cards-v2 catalog()): лупа в шапке больше не нужна — поиск стоит капсулой под заголовком; в шапке остаётся выбор языка наборов.
  // зачем (координатор 13.10, cards-section-022/023, cards-gap-034; то же правило, что в настройке тренировки): чип «EN ⌄» нужен, только когда в каталоге наборы больше чем на одном языке.
  // Считаем языки загруженных облачных наборов плюс текущий выбор: если выбран язык без наборов, чип остаётся, иначе человека не вернуть к языку, где наборы есть. «Без языка» не считается.
  const catalogLanguages = useMemo(() => {
    const present = new Set<StudyPackLanguage>();
    if (isStudyPackLanguage(packLanguage)) present.add(packLanguage);
    for (const pack of communityPacks) {
      if (isLocalAuthorPackId(pack.id)) continue;
      const code = normalizePackLanguage(pack.packLanguage);
      if (isStudyPackLanguage(code)) present.add(code);
    }
    return PACK_LANGUAGES.filter((code) => present.has(code));
  }, [communityPacks, packLanguage]);
  const languageChipVisible = catalogLanguages.length >= 2;
  const headerActions = languageChipVisible ? (
          <View style={styles.headerActions}>
            <PackLanguagePicker
              pill={embedded}
              lang={lang}
              t={t}
              value={packLanguage}
              languages={catalogLanguages}
              onChange={handlePackLanguageChange}
            />
          </View>
  ) : null;

  // зачем: во вкладке «Сообщество» кнопки раздела живут в общей шапке. Слот пересобирается только при
  // смене того, что в нём видно, — иначе шапка ловила бы новый объект на каждый рендер раздела.
  const setHeaderSlot = useCommunityHeaderSlotSetter();
  const headerSlot = useMemo(
    () => (embedded ? { right: headerActions, overlay: null } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- JSX выше выводится ровно из этих значений
    [embedded, packLanguage, lang, liquidGlassThemeId, t, handlePackLanguageChange, languageChipVisible, catalogLanguages],
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
          // зачем (cards-v2 `.rb`, cards-section-022/023, cards-v2-025/026): «назад» — на круглой плашке 42, как у соседних экранов набора; голая стрелка расходилась с макетом
          <PackRoundButton
            g={g}
            icon="arrow-back"
            testID="flashcards-header-back"
            label="qa-flashcards-header-back"
            onPress={leavePacks}
          />
          )}

          {/* зачем (cards-v2 catalog()): заголовок 34/40 стоит в списке под панелью, как на макете; шапка — «назад» и язык наборов. */}
          <View style={{ flex: 1 }} />

          {headerActions}
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
            {/* зачем (cards-v2 catalog() / commHead()): заголовок «Сообщество» 34/40 (+ круглая «создать набор» — функция приложения, в макете её нет),
                капсула поиска «Наборы и авторы», чипы «Популярные / Новые / A1…B2» (чипы уровней — только когда в каталоге есть уровни). */}
            <View style={styles.listHead}>
              <View style={styles.titleRow}>
                <Text accessibilityRole="header" testID={embedded ? 'flashcards-packs-title-embedded' : 'flashcards-packs-title'} style={[styles.embeddedTitle, { color: g.text }]}>
                  {screenTitle}
                </Text>
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
              <View style={styles.searchWrap}>
                <KitSearchField g={g} value={communityQuery} onChangeText={setCommunityQuery} placeholder={searchLabel} clearLabel={clearSearchLabel} testID="flashcards-packs-search" />
              </View>
              {communityQuery.trim().length === 0 ? (
                <View style={styles.chipsWrap}>
                  <PackChips g={g} chips={filterChips} activeId={activeChip} onChange={onChip} testIDPrefix="flashcards-packs-chip" />
                </View>
              ) : null}
            </View>
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
              communityOffline={communityOffline}
              onRetryCatalog={retryCatalog}
              ownedCommunityPackIds={ownedCommunityPackIds}
              hubAuthorStableId={hubAuthorStableId}
              studyTarget={studyTarget}
              communityQuery={communityQuery}
              onResetFilters={resetCommunityFilters}
              communitySort={communitySort}
              communityLevel={communityLevel}
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
  embeddedTitle: { flex: 1, minWidth: 0, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  searchWrap: { marginTop: 16 },
  chipsWrap: { marginTop: 6 },
  // `.ib.ac`: круг 44 цвета темы, значок цветом «на акценте».
  createBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // `.sg`: капсула 4/18, сегменты 38 r14, текст 15/600 макета → 16 (D145); отступ 14 от заголовка.
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }, // зачем (Тень 12.10): между плашками ≥ 10
});
