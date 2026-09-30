/**
 * Cards 2.1 §5.3 — «Мои наборы»: свои и добавленные наборы отдельными разделами.
 *
 * Хаб карточек раскрывает ДВА разных раздела:
 *   • этот экран        — только мои наборы (добавленные + созданные мной);
 *   • /flashcards_packs — каталог наборов сообщества.
 *
 * Экран намеренно тонкий: грузит владение (`loadAccessiblePackIds` +
 * `loadCommunityOwnedPackIds` + локальные авторские) и показывает сетку плиток.
 * Тап по набору синхронно готовит карточки (staging) и уходит в коллекцию с
 * `?pack=…&from=mine` — тот же путь, что и из каталога, поэтому первый кадр уже
 * с карточками, а «назад» из набора возвращает ровно сюда (замечания владельца
 * после теста на iPhone, 2026-08-13).
 *
 * Два раздела (замечание владельца): «Добавленные из сообщества» и «Созданные
 * мной» — это разные вещи, и в одной куче их не различить. Пустой раздел не
 * показывается совсем.
 *
 * Лэйаут стабилен с первого кадра: пока владение читается, показываем тот же
 * каркас (заголовок + сетка-заглушка), а не пустоту, которая потом «прыгает».
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { DebugLogger } from './debug-logger';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { LinearGradient } from '../components/SafeLinearGradient';
import { FlowText } from '../components/text-integrity/FlowText';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { actionToastTri, emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
import { soundDirector } from '../modules/audio/sound_director';
import { loadCommunityOwnedPackIdsResult } from './community_packs/communityOwnedStorage';
import { fetchCommunityPackMeta, loadAuthorCommunityPacksPendingUpdate, invalidateCommunityPackCatalog } from './community_packs/communityFirestore';
import { isLocalAuthorPackId, loadLocalAuthorPacks, loadLocalAuthorPacksResult, localAuthorPackToMarketPack, removeLocalAuthorPack } from './community_packs/localAuthorPacks';
import { withdrawLocalAuthorPack } from './community_packs/publishLocalPack';
import { stageCommunityPackCardsForNavigation } from './community_packs/staging';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import {
  loadAccessiblePackIdsResult,
  loadMarketplacePacksResult,
  packCategoryIonIcon,
  packHubCodeName,
  packTitleForInterface,
  peekAccessiblePackIds,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import {
  bundledPackTilePng,
  packTileArtRevision,
  packTileImageForPack,
} from './flashcards/packMarketplaceIcons';
import { FC_PACKS_ROUTE } from './flashcards/tabbar_state';
import { stageOwnedPackCardsForNavigation } from './flashcards/useCollectionData';
import { getCanonicalUserId } from './user_id_policy';
import { type RuntimeStudyTarget } from './target_storage_keys';
import PackLanguagePicker from './flashcards/PackLanguagePicker';
import { defaultPackLanguageForStudyTarget, NO_PACK_LANGUAGE, noPackLanguageLabel, normalizePackLanguage, PACK_LANGUAGE_META, type PackLanguage } from './flashcards/pack_languages';
import { publishMyPacksCount } from './flashcards/myPacksCountCache';
import { getStoredPackLanguage, setStoredPackLanguage, subscribePackLanguage } from './flashcards/pack_language_preferences';
import { filterPacksByLanguage } from './community_packs/communityCatalogFilter';
import { callCommunityAuthorRemovePack } from './community_packs/functionsClient';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { canCommitAccountScopedResult, classifyMyPacksResolution } from './flashcards/myPacksDataIntegrity';

const COLS = 3;
const GAP = 10;
/**
 * Пропорция PNG-«веера» наборов (329x268). Тот же расчёт, что в
 * `FlashcardsCategoryHub` — иконка должна вписываться по высоте, не по ширине.
 */
const PACK_FAN_ASPECT = 329 / 268;
const H_PAD = 16;
const TILE_RADIUS = 18;

const PACK_FLAG_ART: Partial<Record<PackLanguage, number>> = {
  en: require('../assets/images/language_flags/language_en.webp'),
  fr: require('../assets/images/language_flags/language_fr_dev.webp'),
  es: require('../assets/images/language_flags/language_es_dev.webp'),
};

function MyPacksGlass({ tint, edge }: { tint: string; edge: string }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <BlurView intensity={Platform.OS === 'android' ? 12 : 16} blurReductionFactor={3} experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
    <LinearGradient colors={[tint, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={{ height: 1, backgroundColor: edge }} />
  </View>;
}

/** Два раздела экрана: что добавил себе и что создал сам. */
type MyPacksGroups = {
  added: FlashcardMarketPack[];
  created: FlashcardMarketPack[];
};

type MyPacksLoadResult = {
  groups: MyPacksGroups;
  status: 'ready' | 'stale';
  accountScope: string | null;
};

const EMPTY_GROUPS: MyPacksGroups = { added: [], created: [] };

// PM-096: согласованная сортировка «Мои наборы» — по дате изменения, сохраняется
// локально (без сети, без Firestore-чтений). 'updated' — новые сверху (как уже
// сортирует каталог сообщества в marketplace.ts, sortByFreshness); 'name' — по
// алфавиту текущей локали, стабильно (одинаковые названия не меняют порядок).
type MyPacksSort = 'updated' | 'name';
const MY_PACKS_SORT_KEY = 'fc_my_packs_sort_v1';

function isMyPacksSort(value: unknown): value is MyPacksSort {
  return value === 'updated' || value === 'name';
}

async function getStoredMyPacksSort(): Promise<MyPacksSort> {
  const raw = await AsyncStorage.getItem(MY_PACKS_SORT_KEY).catch(() => null);
  return isMyPacksSort(raw) ? raw : 'updated';
}

async function setStoredMyPacksSort(sort: MyPacksSort): Promise<void> {
  await AsyncStorage.setItem(MY_PACKS_SORT_KEY, sort).catch(() => {});
}

/** Сортировка стабильна: Array.prototype.sort в Hermes/JSC стабилен (ES2019),
 *  равные ключи не меняют относительный порядок — не «прыгает» при повторном выборе. */
function sortMyPacks(packs: FlashcardMarketPack[], sort: MyPacksSort, lang: 'ru' | 'uk' | 'es'): FlashcardMarketPack[] {
  if (sort === 'name') {
    return [...packs].sort((a, b) => {
      const an = (packTitleForInterface(a, lang) || packHubCodeName(a)).trim();
      const bn = (packTitleForInterface(b, lang) || packHubCodeName(b)).trim();
      return an.localeCompare(bn, lang);
    });
  }
  return [...packs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/** PM-095: локальный поиск по названию — без сети, регистр/диакритика игнорируются. */
function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function filterMyPacksByQuery(
  packs: FlashcardMarketPack[],
  query: string,
  lang: 'ru' | 'uk' | 'es',
): FlashcardMarketPack[] {
  const needle = normalizeSearchText(query);
  if (!needle) return packs;
  return packs.filter((pack) => {
    const title = packTitleForInterface(pack, lang) || packHubCodeName(pack);
    return normalizeSearchText(title).includes(needle);
  });
}

/**
 * Разложить наборы по двум разделам. Вынесено из loadMine, чтобы синхронная
 * гидратация первого кадра и асинхронное дочитывание собирали список ОДИНАКОВО:
 * иначе первый кадр и следующий за ним разошлись бы, и это читалось бы как
 * «контент прыгает».
 */
function groupPacks(
  packs: readonly (FlashcardMarketPack | null | undefined)[],
  isMine: (pack: FlashcardMarketPack) => boolean,
): MyPacksGroups {
  const added: FlashcardMarketPack[] = [];
  const created: FlashcardMarketPack[] = [];
  const seen = new Set<string>();
  for (const pack of packs) {
    if (!pack || seen.has(pack.id)) continue;
    seen.add(pack.id);
    (isMine(pack) ? created : added).push(pack);
  }
  return { added, created };
}

/**
 * FIX (владелец, 2026-08-16) «при открытии разделов всё обновляется несколько
 * раз, мелькают промежуточные экраны»: состояние стартовало с EMPTY_GROUPS, и
 * экран ВСЕГДА показывал пустоту, пока не доедет await. Человек видел пустой
 * экран → список, а при возврате — ещё и старое содержимое на кадр.
 *
 * Собираем первый кадр СИНХРОННО из уже прогретых кэшей (owned id + каталог
 * читаются из памяти, без AsyncStorage и без сети). Ничего не прогрето —
 * честно отдаём пусто, как раньше. Сеть/диск лишь дочитывают недостающее.
 */
function peekMyPacksGroups(studyTarget?: RuntimeStudyTarget, packLanguage: PackLanguage = 'en'): MyPacksGroups {
  const catalog = peekWarmMarketplacePacks(studyTarget);
  if (!catalog) return EMPTY_GROUPS;
  const ownedIds = peekAccessiblePackIds(studyTarget);
  if (ownedIds.length === 0) return EMPTY_GROUPS;
  const catalogById = new Map(catalog.map((p) => [p.id, p]));
  // Автора на синхронном пути не знаем (getCanonicalUserId асинхронный), поэтому
  // UGC до дочитывания считаем «добавленным». Раздел «Созданные мной» доедет со
  // следующим кадром и лишь дополнит список — плитки на месте уже сейчас.
  return groupPacks(filterPacksByLanguage(ownedIds.map((id) => catalogById.get(id)).filter(Boolean) as FlashcardMarketPack[], packLanguage), () => false);
}

function sameGroup(a: FlashcardMarketPack[], b: FlashcardMarketPack[]): boolean {
  return a.length === b.length && a.every((p, i) => {
    const next = b[i];
    return !!next && p.id === next.id
      && p.titleRu === next.titleRu && p.titleUk === next.titleUk && p.titleEs === next.titleEs
      && p.titlePtBr === next.titlePtBr && p.titleVi === next.titleVi
      && p.titleId === next.titleId && p.titleTr === next.titleTr && p.titlePl === next.titlePl
      && p.codeName === next.codeName && p.authorName === next.authorName
      && p.cardCount === next.cardCount && p.updatedAt === next.updatedAt
      && p.packLanguage === next.packLanguage && p.listingStatus === next.listingStatus
      && packTileArtRevision(p) === packTileArtRevision(next);
  });
}

export default function FlashcardsMyPacksScreen() {
  const router = useRouter();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Первый кадр — из прогретых кэшей, без ожидания диска и сети (см. peekMyPacksGroups).
  const [packLanguage, setPackLanguage] = useState<PackLanguage>(() => defaultPackLanguageForStudyTarget(studyTarget));
  React.useEffect(() => subscribePackLanguage(setPackLanguage), []);
  const [groups, setGroups] = useState<MyPacksGroups>(() => peekMyPacksGroups(studyTarget, defaultPackLanguageForStudyTarget(studyTarget)));
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'stale' | 'error'>('loading');
  const [reloadTick, setReloadTick] = useState(0);
  const [accountGeneration, setAccountGeneration] = useState(captureAccountGeneration);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [deletePackTarget, setDeletePackTarget] = useState<FlashcardMarketPack | null>(null);
  const [deletePackBusy, setDeletePackBusy] = useState(false);
  const openingPackRef = useRef<string | null>(null);
  const openingRequestGenerationRef = useRef(0);
  useEffect(() => {
    const subscription = subscribeAccountGeneration((next) => {
      // Account-owned tiles must disappear synchronously at the generation
      // boundary; the next active generation repopulates only its own cache.
      setAccountGeneration(next);
      setGroups(EMPTY_GROUPS);
      setLoadStatus('loading');
      setReloadTick((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  // PM-095/PM-096: поиск и сортировка — чисто локальные, без новых Firestore-чтений.
  const [myPacksQuery, setMyPacksQuery] = useState('');
  const [myPacksSort, setMyPacksSort] = useState<MyPacksSort>('updated');
  useEffect(() => {
    let cancelled = false;
    void getStoredMyPacksSort().then((stored) => { if (!cancelled) setMyPacksSort(stored); });
    return () => { cancelled = true; };
  }, []);
  const handleMyPacksSortChange = useCallback((next: MyPacksSort) => {
    setMyPacksSort(next);
    void setStoredMyPacksSort(next);
  }, []);

  const contentLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;

  React.useEffect(() => {
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

  const tileW = Math.floor((Math.min(width, 640) - H_PAD * 2 - GAP * (COLS - 1)) / COLS);
  const packCount = groups.added.length + groups.created.length;

  /** PM-095/PM-096: поиск и сортировка применяются к каждому разделу отдельно,
   *  порядок разделов (добавленные/созданные) не меняется — только порядок ВНУТРИ. */
  const visibleGroups = useMemo<MyPacksGroups>(() => ({
    added: sortMyPacks(filterMyPacksByQuery(groups.added, myPacksQuery, contentLang), myPacksSort, contentLang),
    created: sortMyPacks(filterMyPacksByQuery(groups.created, myPacksQuery, contentLang), myPacksSort, contentLang),
  }), [groups, myPacksQuery, myPacksSort, contentLang]);
  const visiblePackCount = visibleGroups.added.length + visibleGroups.created.length;

  /** Владение читается при каждом фокусе: «Добавить себе» пишет AsyncStorage без событий. */
  const loadMine = useCallback(async (): Promise<MyPacksLoadResult> => {
    const operationAccount = accountGeneration;
    const operationScope = accountScopeKey(operationAccount);
    if (!operationScope || !isCurrentAccountGeneration(operationAccount)) {
      return { groups: EMPTY_GROUPS, status: 'stale', accountScope: null };
    }
    const [ownedResult, localAuthoredResult, communityOwnedResult, identityResult] = await Promise.all([
      loadAccessiblePackIdsResult(studyTarget, operationAccount),
      loadLocalAuthorPacksResult(studyTarget, operationAccount),
      cloudCommunityEnabled
        ? loadCommunityOwnedPackIdsResult(studyTarget, operationAccount)
        : Promise.resolve({ ids: [] as string[], status: 'ready' as const }),
      getCanonicalUserId()
        .then((value) => ({ value, status: 'ready' as const }))
        .catch(() => ({ value: null, status: 'stale' as const })),
    ]);
    if (!isCurrentAccountGeneration(operationAccount)) {
      return { groups: EMPTY_GROUPS, status: 'stale', accountScope: operationScope };
    }
    const ownedIds = ownedResult.ids;
    const localAuthored = localAuthoredResult.packs;
    const communityOwnedIds = communityOwnedResult.ids;
    const myStableId = identityResult.value;
    const catalogResult = await loadMarketplacePacksResult(studyTarget, undefined, operationAccount);
    if (!isCurrentAccountGeneration(operationAccount)) {
      return { groups: EMPTY_GROUPS, status: 'stale', accountScope: operationScope };
    }
    const catalog = catalogResult.packs;
    const catalogById = new Map(catalog.map((p) => [p.id, p]));

    /** Свои наборы с устройства: они мои по определению, ещё до сверки автора. */
    const authoredLocal = localAuthored.map(pack => localAuthorPackToMarketPack(pack, pack.studyTarget));
    const authoredCloud = myStableId && cloudCommunityEnabled ? await loadAuthorCommunityPacksPendingUpdate(myStableId, studyTarget) : [];
    const localCloudIds = new Set(localAuthored.map(pack => pack.cloudPackId).filter(Boolean));
    const authoredLocalIds = new Set(authoredLocal.map((p) => p.id));

    /** Мой набор — созданный на этом аккаунте (локальный черновик или опубликованный мной UGC). */
    const isMine = (pack: FlashcardMarketPack): boolean =>
      authoredLocalIds.has(pack.id) ||
      (!!pack.isCommunityUgc && !!pack.authorStableId && !!myStableId && pack.authorStableId === myStableId);

    /** Порядок тот же, что и был: владение → свои локальные → добавленные из сообщества. */
    const known = new Set([
      ...ownedIds,
      ...authoredLocal.map((p) => p.id),
      ...communityOwnedIds.filter((id) => catalogById.has(id)),
    ]);
    /** Наборы сообщества, добавленные себе: метаданные из каталога, иначе точечно из облака. */
    const missing = communityOwnedIds.filter((id) => !known.has(id) && !catalogById.has(id));
    const metas = missing.length > 0
      ? await Promise.all(missing.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(() => null)))
      : [];
    if (!isCurrentAccountGeneration(operationAccount)) {
      return { groups: EMPTY_GROUPS, status: 'stale', accountScope: operationScope };
    }

    // Один сборщик на оба пути (см. groupPacks) — синхронный первый кадр и это
    // дочитывание раскладывают наборы одинаково, поэтому список не перестраивается.
    const allPacks = [
        ...ownedIds.map((id) => catalogById.get(id)),
        ...authoredLocal,
        ...authoredCloud.filter(pack => !localCloudIds.has(pack.id)),
        ...communityOwnedIds.map((id) => catalogById.get(id)),
        ...metas,
      ];
    const visible = (allPacks.filter(Boolean) as FlashcardMarketPack[])
      .filter(pack => !localCloudIds.has(pack.id))
      .filter(pack => !(isMine(pack) && pack.listingStatus === 'admin_removed'));
    const status = classifyMyPacksResolution({
      sourceStatuses: [
        ownedResult.status,
        localAuthoredResult.status,
        communityOwnedResult.status,
        identityResult.status,
        catalogResult.status,
      ],
      ownedIds: [...new Set([...ownedIds, ...communityOwnedIds])],
      resolvedPackIds: [
        ...catalog.map((pack) => pack.id),
        ...metas.filter((pack): pack is FlashcardMarketPack => Boolean(pack)).map((pack) => pack.id),
      ],
    });
    return {
      groups: groupPacks(filterPacksByLanguage(visible, packLanguage), isMine),
      status,
      accountScope: operationScope,
    };
  }, [accountGeneration, cloudCommunityEnabled, packLanguage, studyTarget]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void reloadTick; // explicit Retry revision re-enters this focus loader
      openingRequestGenerationRef.current += 1;
      openingPackRef.current = null;
      setOpeningPackId(null);
      setLoadStatus('loading');
      void loadMine().then((next) => {
        if (cancelled) return;
        const currentScope = accountScopeKey(captureAccountGeneration());
        if (!canCommitAccountScopedResult(next.accountScope, currentScope)) return;
        if (next.status === 'stale') {
          setGroups((prev) => prev.added.length + prev.created.length > 0 ? prev : next.groups);
          setLoadStatus('stale');
          return;
        }
        setGroups((prev) =>
          sameGroup(prev.added, next.groups.added) && sameGroup(prev.created, next.groups.created)
            ? prev
            : next.groups,
        );
        setLoadStatus('ready');
      }).catch(() => {
        if (!cancelled) {
          setLoadStatus('error');
        }
      });
      return () => {
        cancelled = true;
        openingRequestGenerationRef.current += 1;
        openingPackRef.current = null;
      };
    }, [loadMine, reloadTick]),
  );

  // `/flashcards` теперь единый хаб: из библиотеки возвращаемся в него, а уже
  // стрелка хаба выводит на главную.
  const leave = useCallback(() => {
    safeRouterBack(router, '/flashcards' as any);
  }, [router]);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => sub.remove();
  }, [leave]);

  const openPack = useCallback(
    async (pack: FlashcardMarketPack) => {
      if (openingPackRef.current) return;
      // зачем: тап уже необратимо решён — звук открытия набора играет сразу,
      // не дожидаясь стейджинга карточек/сети (Optimistic UI).
      soundDirector.request('pm.cards.pack_open', { scope: 'cards' });
      const requestToken = ++openingRequestGenerationRef.current;
      openingPackRef.current = pack.id;
      setOpeningPackId(pack.id);
      if (pack.isCommunityUgc) {
        const cards = await stageCommunityPackCardsForNavigation(pack.id, studyTarget, pack);
        if (
          openingRequestGenerationRef.current !== requestToken
          || openingPackRef.current !== pack.id
        ) return;
        if (cards.length === 0) {
          openingPackRef.current = null;
          setOpeningPackId(null);
          emitAppEvent('action_toast', actionToastTri('error', {
            ru: 'Не удалось загрузить набор. Проверьте интернет и попробуйте ещё раз.',
            uk: 'Не вдалося завантажити набір. Перевірте інтернет і спробуйте ще раз.',
            es: 'No se pudo cargar el pack. Comprueba internet e inténtalo de nuevo.',
            'pt-BR': 'Não foi possível carregar o pacote. Verifique a internet e tente novamente.',
            vi: 'Không thể tải bộ thẻ. Hãy kiểm tra mạng và thử lại.',
            id: 'Paket tidak dapat dimuat. Periksa internet lalu coba lagi.',
            tr: 'Paket yüklenemedi. İnternetini kontrol edip tekrar dene.',
            pl: 'Nie udało się wczytać zestawu. Sprawdź internet i spróbuj ponownie.',
          }));
          return;
        }
      } else {
        stageOwnedPackCardsForNavigation(pack.id, studyTarget);
      }
      /** `from=mine` — «назад» из набора возвращает ровно сюда, без промежуточных остановок. */
      router.push({
        pathname: '/flashcards_collection',
        params: { pack: pack.id, from: 'mine' },
      } as any);
    },
    [router, studyTarget],
  );

  const copy = useMemo(
    () => ({
      title: triLang(lang, {
        ru: 'Мои наборы', uk: 'Мої набори', en: 'My packs', es: 'Mis packs',
        'pt-BR': 'Meus pacotes', vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
      }),
      added: triLang(lang, {
        ru: 'Добавленные из сообщества',
        uk: 'Додані зі спільноти',
        en: 'Added from the community',
        es: 'Añadidos de la comunidad',
        'pt-BR': 'Adicionados da comunidade',
        vi: 'Đã thêm từ cộng đồng',
        id: 'Ditambahkan dari komunitas',
        tr: 'Topluluktan eklenenler',
        pl: 'Dodane ze społeczności',
      }),
      created: triLang(lang, {
        ru: 'Созданные мной',
        uk: 'Створені мною',
        en: 'Created by me',
        es: 'Creados por mí',
        'pt-BR': 'Criados por mim',
        vi: 'Do tôi tạo',
        id: 'Dibuat olehku',
        tr: 'Benim oluşturduklarım',
        pl: 'Utworzone przeze mnie',
      }),
      // Только для незрячих: на экране это иконка карандаша, подписи под
      // плиткой нет (запрет владельца на подписи-расшифровки).
      editPack: triLang(lang, {
        ru: 'Редактировать набор',
        uk: 'Редагувати набір',
        en: 'Edit pack',
        es: 'Editar pack',
        'pt-BR': 'Editar pacote',
        vi: 'Chỉnh sửa bộ thẻ',
        id: 'Edit paket',
        tr: 'Paketi düzenle',
        pl: 'Edytuj zestaw',
      }),
      deletePack: triLang(lang, {
        ru: 'Удалить набор', uk: 'Видалити набір', en: 'Delete pack', es: 'Eliminar pack',
        'pt-BR': 'Excluir pacote', vi: 'Xóa bộ thẻ', id: 'Hapus paket', tr: 'Paketi sil', pl: 'Usuń zestaw',
      }),
      empty: triLang(lang, {
        ru: 'Выбери готовый набор из сообщества или создай свой кнопкой «+» внизу.',
        uk: 'Вибери готовий набір зі спільноти або створи свій кнопкою «+» внизу.',
        en: 'Choose a community pack or create your own with the + button below.',
        es: 'Elige un pack de la comunidad o crea el tuyo con el botón + de abajo.',
        'pt-BR': 'Escolha um pacote da comunidade ou crie o seu com o botão + abaixo.',
        vi: 'Chọn bộ thẻ cộng đồng hoặc tạo bộ thẻ riêng bằng nút + bên dưới.',
        id: 'Pilih paket komunitas atau buat sendiri dengan tombol + di bawah.',
        tr: 'Topluluktan bir paket seç veya alttaki + düğmesiyle kendin oluştur.',
        pl: 'Wybierz zestaw społeczności lub stwórz własny przyciskiem + na dole.',
      }),
      browse: triLang(lang, {
        ru: 'Открыть наборы сообщества', uk: 'Відкрити набори спільноти', en: 'Open community packs', es: 'Ver packs de la comunidad',
        'pt-BR': 'Ver pacotes da comunidade', vi: 'Xem bộ thẻ cộng đồng', id: 'Lihat paket komunitas',
        tr: 'Topluluk paketlerini aç', pl: 'Zobacz zestawy społeczności',
      }),
      create: triLang(lang, {
        ru: 'Создать набор', uk: 'Створити набір', en: 'Create a pack', es: 'Crear un pack',
        'pt-BR': 'Criar um pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket',
        tr: 'Paket oluştur', pl: 'Utwórz zestaw',
      }),
      back: triLang(lang, {
        ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás',
        'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
      }),
      cards: triLang(lang, { ru: 'карточек', uk: 'карток', en: 'cards', es: 'tarjetas' }),
      // PM-093/094 (D20, S64 — прямое требование владельца, не общий запрет на
      // подписи): одна короткая полезная строка у раздела «Мои наборы».
      sectionHint: triLang(lang, {
        ru: 'Всё, что ты добавил или создал сам — открой набор и начни тренировку.',
        uk: 'Усе, що ти додав або створив сам — відкрий набір і почни тренування.',
        en: 'Everything you added or created — open a pack to start practicing.',
        es: 'Todo lo que añadiste o creaste — abre un pack y empieza a practicar.',
        'pt-BR': 'Tudo que você adicionou ou criou — abra um pacote e comece a treinar.',
        vi: 'Mọi thứ bạn đã thêm hoặc tự tạo — mở bộ thẻ và bắt đầu luyện tập.',
        id: 'Semua yang kamu tambahkan atau buat — buka paket dan mulai berlatih.',
        tr: 'Eklediğin veya oluşturduğun her şey — bir paketi aç ve çalışmaya başla.',
        pl: 'Wszystko, co dodałeś lub stworzyłeś — otwórz zestaw i zacznij trening.',
      }),
      searchPlaceholder: triLang(lang, {
        ru: 'Поиск по названию', uk: 'Пошук за назвою', en: 'Search by name', es: 'Buscar por nombre',
        'pt-BR': 'Buscar por nome', vi: 'Tìm theo tên', id: 'Cari berdasarkan nama',
        tr: 'İsme göre ara', pl: 'Szukaj po nazwie',
      }),
      sortByUpdated: triLang(lang, {
        ru: 'Сначала новые', uk: 'Спочатку нові', en: 'Newest first', es: 'Más recientes',
        'pt-BR': 'Mais recentes', vi: 'Mới nhất', id: 'Terbaru', tr: 'En yeni', pl: 'Najnowsze',
      }),
      sortByName: triLang(lang, {
        ru: 'По алфавиту', uk: 'За алфавітом', en: 'A–Z', es: 'A–Z',
        'pt-BR': 'A–Z', vi: 'A–Z', id: 'A–Z', tr: 'A–Z', pl: 'A–Z',
      }),
      noSearchResults: triLang(lang, {
        ru: 'Ничего не найдено.', uk: 'Нічого не знайдено.', en: 'Nothing found.', es: 'No se encontró nada.',
        'pt-BR': 'Nada encontrado.', vi: 'Không tìm thấy gì.', id: 'Tidak ada yang ditemukan.',
        tr: 'Bir şey bulunamadı.', pl: 'Nic nie znaleziono.',
      }),
      loadError: triLang(lang, {
        ru: 'Не удалось загрузить наборы. Проверьте подключение и попробуйте ещё раз.',
        uk: 'Не вдалося завантажити набори. Перевірте з’єднання та спробуйте ще раз.',
        en: 'Could not load packs. Check your connection and try again.',
        es: 'No se pudieron cargar los packs. Comprueba la conexión e inténtalo de nuevo.',
      }),
      staleData: triLang(lang, {
        ru: 'Показаны последние сохранённые наборы. Обновить данные не удалось.',
        uk: 'Показано останні збережені набори. Не вдалося оновити дані.',
        en: 'Showing your last saved packs. The latest data could not be loaded.',
        es: 'Se muestran tus últimos packs guardados. No se pudieron actualizar los datos.',
        'pt-BR': 'Mostrando seus últimos pacotes salvos. Não foi possível atualizar os dados.',
        vi: 'Đang hiển thị các bộ thẻ đã lưu gần nhất. Không thể cập nhật dữ liệu.',
        id: 'Menampilkan paket terakhir yang tersimpan. Data terbaru tidak dapat dimuat.',
        tr: 'Son kaydedilen paketlerin gösteriliyor. Güncel veriler yüklenemedi.',
        pl: 'Wyświetlamy ostatnio zapisane zestawy. Nie udało się odświeżyć danych.',
      }),
      retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar' }),
    }),
    [lang],
  );

  /**
   * Единый значок набора без старых изображений рубашек.
   */
  const packIcon = useCallback(
    (pack: FlashcardMarketPack, tile: number) => {
      const png = packTileImageForPack(pack) ?? bundledPackTilePng(pack.id);
      /**
       * Обложка занимает плитку почти целиком (как в хабе), иконка-дефолт — скромнее.
       *
       * зачем: владелец жаловался на крошечные иконки наборов. Размер терялся
       * дважды — `contain` вписывал веер 329x268 в КВАДРАТ по ширине (минус ~20%
       * высоты) плюс прозрачные поля внутри самого webp. Растим бокс по пропорции
       * веера и вписываем по высоте; у плитки `overflow:'hidden'`, края не торчат.
       */
      if (png) {
        const size = Math.max(84, Math.floor(tile * 0.98));
        return (
          <Image
            key={packTileArtRevision(pack)}
            source={png}
            style={{ width: size * PACK_FAN_ASPECT, height: size }}
            contentFit="contain"
          />
        );
      }
      return (
        <Ionicons
          name={(packCategoryIonIcon(pack.category) || 'albums-outline') as never}
          size={Math.round(tile * 0.6)}
          color={pack.isCommunityUgc ? g.lightTint : g.text}
        />
      );
    },
    [g.lightTint, g.text],
  );

  // зачем (репорт #7ea8, 2026-09-04: «чи можна зробити картки мною створені і
  // ще не опубліковані доступними для редагування»): свой набор редактировался
  // ТОЛЬКО из каталога сообщества, где кнопка требует isCommunityUgc — то есть
  // уже опубликованный. Черновик, созданный и ещё не прошедший модерацию, этого
  // флага не имеет, и править его было негде. Раздел «Созданные мной» на этом
  // экране уже содержит и черновики, и опубликованные — кнопка живёт здесь.
  const openPackEditor = useCallback(
    (pack: FlashcardMarketPack) => {
      DebugLogger.info('[MY-PACKS]', `правка набора ${pack.id}: ugc=${pack.isCommunityUgc === true} наПроверке=${pack.isPendingUpdateReview === true}`);
      router.push({ pathname: '/community_pack_create', params: { packId: pack.id } } as never);
    },
    [router],
  );

  const deletePack = useCallback(async () => {
    const pack = deletePackTarget;
    if (!pack || deletePackBusy) return;
    setDeletePackBusy(true);
    try {
      if (isLocalAuthorPackId(pack.id)) {
        await withdrawLocalAuthorPack(pack.id);
        await removeLocalAuthorPack(pack.id, studyTarget);
      } else {
        const authorStableId = await getCanonicalUserId().catch(() => null);
        if (!authorStableId) throw new Error('author_id_missing');
        await callCommunityAuthorRemovePack({ authorStableId, packId: pack.id });
        for (const local of await loadLocalAuthorPacks()) {
          if (local.cloudPackId === pack.id) await removeLocalAuthorPack(local.id, local.studyTarget);
        }
      }
      invalidateCommunityPackCatalog();
      setGroups((prev) => ({
        added: prev.added.filter((item) => item.id !== pack.id),
        created: prev.created.filter((item) => item.id !== pack.id),
      }));
      setDeletePackTarget(null);
      emitAppEvent('action_toast', actionToastTri('success', {
        ru: 'Набор удалён.', uk: 'Набір видалено.', en: 'Pack deleted.', es: 'Pack eliminado.',
        'pt-BR': 'Pacote excluído.', vi: 'Đã xóa bộ thẻ.', id: 'Paket dihapus.', tr: 'Paket silindi.', pl: 'Zestaw usunięty.',
      }));
    } catch (error) {
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось удалить набор.', uk: 'Не вдалося видалити набір.', en: 'Could not delete the pack.', es: 'No se pudo eliminar el pack.',
        'pt-BR': 'Não foi possível excluir o pacote.', vi: 'Không thể xóa bộ thẻ.', id: 'Paket tidak dapat dihapus.', tr: 'Paket silinemedi.', pl: 'Nie udało się usunąć zestawu.',
      }));
      DebugLogger.warn('[MY-PACKS]', `удаление набора не удалось: ${String(error)}`);
    } finally {
      setDeletePackBusy(false);
    }
  }, [deletePackBusy, deletePackTarget, studyTarget]);

  const renderTile = useCallback(
    (pack: FlashcardMarketPack, editable = false) => {
      const displayTitle = packTitleForInterface(pack, contentLang);
      const label =
        pack.isCommunityUgc && displayTitle.trim().length > 0
          ? displayTitle.trim()
          : packHubCodeName(pack);
      const packLang = normalizePackLanguage(pack.packLanguage ?? pack.studyTarget);
      const flagArt = PACK_FLAG_ART[packLang];
      return (
        <View
          key={pack.id}
          style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}
        >
          <View
            style={{
              width: tileW,
              height: tileW,
              position: 'relative',
            }}
          >
            <TouchableOpacity
              testID={`fc-my-packs-pack-${pack.id}`}
              accessibilityLabel={`${label}, ${pack.cardCount} ${copy.cards}`}
              accessibilityRole="button"
              activeOpacity={0.85}
              disabled={openingPackId !== null}
              onPress={() => { void openPack(pack); }}
              style={{
              width: tileW,
              height: tileW,
              borderRadius: TILE_RADIUS,
              borderWidth: 1,
              borderColor: g.glassEdge,
              backgroundColor: g.card,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
              overflow: 'hidden',
            }}
          >
            <MyPacksGlass tint={g.selected} edge={g.glassEdge} />
            {packIcon(pack, tileW)}
            {openingPackId === pack.id ? (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: g.sheet }]}
              >
                <ActivityIndicator color={g.cta} />
              </View>
            ) : null}
            {pack.cardCount > 0 ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  right: 5,
                  bottom: 5,
                  borderRadius: 9,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  backgroundColor: g.sheet,
                  borderWidth: 1,
                  borderColor: g.glassEdge,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: g.text }}>{pack.cardCount}</Text>
              </View>
            ) : null}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', left: 5, bottom: 5,
                borderRadius: 9, paddingHorizontal: 4, paddingVertical: 2,
                backgroundColor: g.sheet, borderWidth: 1, borderColor: g.glassEdge,
              }}
            >
              {/* зачем (D127): набор «без языка» помечаем нейтральным значком и подписью, а не выдуманным флагом. */}
              {packLang === NO_PACK_LANGUAGE ? (
                <View testID={`fc-my-packs-pack-nolang-${pack.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: tileW - 16 }}>
                  <Ionicons name="globe-outline" size={11} color={g.text} />
                  <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 9, lineHeight: 12, fontWeight: '700', color: g.text }}>{noPackLanguageLabel(lang)}</Text>
                </View>
              ) : flagArt ? <Image source={flagArt} style={{ width: 18, height: 12, borderRadius: 2 }} contentFit="cover" /> : <Text style={{ fontSize: 10, lineHeight: 13, fontWeight: '800', color: g.text }}>{PACK_LANGUAGE_META[packLang].shortName}</Text>}
            </View>
            </TouchableOpacity>
            {editable ? (
              <TouchableOpacity
                testID={`fc-my-packs-pack-edit-${pack.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${copy.editPack}: ${label}`}
                disabled={openingPackId !== null}
                onPress={() => openPackEditor(pack)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  zIndex: 8,
                  padding: 7,
                  borderRadius: 12,
                  backgroundColor: g.sheet,
                }}
              >
                <Ionicons name="create-outline" size={17} color={g.text} />
              </TouchableOpacity>
            ) : null}
            {editable ? (
              <TouchableOpacity
                testID={`fc-my-packs-pack-delete-${pack.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${copy.deletePack}: ${label}`}
                disabled={openingPackId !== null}
                onPress={() => setDeletePackTarget(pack)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  zIndex: 8,
                  padding: 7,
                  borderRadius: 12,
                  backgroundColor: g.sheet,
                }}
              >
                <Ionicons name="trash-outline" size={17} color={g.text} />
              </TouchableOpacity>
            ) : null}
          </View>
          <FlowText testID={`fc-my-packs-title-${pack.id}`} provenance="user" style={{ color: g.text, fontSize: 14, lineHeight: 18, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
            {label}
          </FlowText>
        </View>
      );
    },
    [contentLang, copy.cards, copy.deletePack, copy.editPack, openPack, openPackEditor, openingPackId, packIcon, g.card, g.cta, g.glassEdge, g.selected, g.sheet, g.text, tileW],
  );

  /** Раздел с заголовком и счётчиком; пустой раздел не рендерится вообще. */
  const renderSection = useCallback(
    (key: 'added' | 'created', title: string, packs: FlashcardMarketPack[]) => {
      if (packs.length === 0) return null;
      return (
        <View key={key} testID={`fc-my-packs-section-${key}`} style={{ marginTop: 18 }}>
          <View style={styles.sectionHead}>
            <Text
              accessibilityRole="header"
              style={{ color: g.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.2 }}
            >
              {title}
            </Text>
            <View
              style={[styles.sectionCount, { borderColor: g.glassEdge, backgroundColor: g.card, overflow: 'hidden' }]}
              pointerEvents="none"
            >
              <MyPacksGlass tint={g.selected} edge={g.glassEdge} />
              <Text style={{ color: g.secondary, fontSize: 11, fontWeight: '800' }}>{packs.length}</Text>
            </View>
          </View>
          {/* Кнопка правки — только в «Созданных мной»: в «Добавленных» лежат
              чужие наборы, их редактировать нельзя. */}
          <View style={styles.grid}>{packs.map((pack) => renderTile(pack, key === 'created'))}</View>
        </View>
      );
    },
    [renderTile, g.card, g.glassEdge, g.secondary, g.selected, g.text],
  );

  useEffect(() => {
    if (loadStatus !== 'ready') return;
    const publishAccount = accountGeneration;
    const publishScope = accountScopeKey(publishAccount);
    if (!publishScope || !isCurrentAccountGeneration(publishAccount)) return;
    let cancelled = false;
    void getCanonicalUserId().then((userId) => {
      if (
        !cancelled
        && isCurrentAccountGeneration(publishAccount)
        && canCommitAccountScopedResult(publishScope, accountScopeKey(captureAccountGeneration()))
      ) publishMyPacksCount(studyTarget, userId, groups.added.length + groups.created.length);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [accountGeneration, groups, loadStatus, studyTarget]);

  return (
    <View style={{ flex: 1, backgroundColor: g.bg }}>
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={[styles.header, { borderBottomColor: g.line }]}>
          <TouchableOpacity
            testID="fc-my-packs-back"
            accessibilityLabel={copy.back}
            accessibilityRole="button"
            accessible
            onPress={leave}
            style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: g.glassEdge, backgroundColor: g.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MyPacksGlass tint={g.selected} edge={g.glassEdge} />
            <Ionicons name="arrow-back" size={24} color={g.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <PackLanguagePicker lang={lang} t={t} value={packLanguage} onChange={handlePackLanguageChange} liquidGlass />
        </View>

        <ScrollView
          decelerationRate="fast"
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 84 },
          ]}
          showsVerticalScrollIndicator
        >
          <View style={{ paddingHorizontal: H_PAD }}>
            <Text style={{ color: g.text, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: 0.2 }}>
              {copy.title}
            </Text>
            {/* PM-093/094: короткое описание раздела — одна строка, не пересказ кнопок. */}
            <Text style={{ color: g.secondary, fontSize: 15, lineHeight: 21, fontWeight: '600', marginTop: 4 }}>
              {copy.sectionHint}
            </Text>

            {packCount > 0 ? (
              <View style={styles.toolsRow}>
                <View style={[styles.searchField, { borderColor: g.glassEdge, backgroundColor: g.card, overflow: 'hidden' }]}>
                  <MyPacksGlass tint={g.selected} edge={g.glassEdge} />
                  <Ionicons name="search-outline" size={18} color={g.secondary} />
                  <TextInput
                    testID="fc-my-packs-search"
                    accessibilityLabel={copy.searchPlaceholder}
                    value={myPacksQuery}
                    onChangeText={setMyPacksQuery}
                    placeholder={copy.searchPlaceholder}
                    placeholderTextColor={g.secondary}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    maxFontSizeMultiplier={1.2}
                    style={[styles.searchInput, { color: g.text }]}
                  />
                  {myPacksQuery.length > 0 ? (
                    <TouchableOpacity
                      testID="fc-my-packs-search-clear"
                      accessibilityRole="button"
                      accessibilityLabel={copy.searchPlaceholder}
                      onPress={() => setMyPacksQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color={g.secondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity
                  testID="fc-my-packs-sort-toggle"
                  accessibilityRole="button"
                  accessibilityLabel={myPacksSort === 'updated' ? copy.sortByName : copy.sortByUpdated}
                  onPress={() => { void hapticTap(); handleMyPacksSortChange(myPacksSort === 'updated' ? 'name' : 'updated'); }}
                  style={[styles.sortBtn, { borderColor: g.glassEdge, backgroundColor: g.card, overflow: 'hidden' }]}
                >
                  <MyPacksGlass tint={g.selected} edge={g.glassEdge} />
                  <Ionicons name={myPacksSort === 'updated' ? 'time-outline' : 'text-outline'} size={16} color={g.secondary} />
                  <Text style={{ color: g.secondary, fontSize: 12, fontWeight: '700' }}>
                    {myPacksSort === 'updated' ? copy.sortByUpdated : copy.sortByName}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {(loadStatus === 'error' || loadStatus === 'stale') && packCount > 0 ? (
              <View testID="fc-my-packs-error" style={{ marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: g.glassEdge, backgroundColor: g.sheet, overflow: 'hidden' }}>
                <MyPacksGlass tint={g.selected} edge={g.glassEdge} />
                <Text style={{ color: g.secondary, fontSize: 14, lineHeight: 20 }}>{loadStatus === 'stale' ? copy.staleData : copy.loadError}</Text>
                <TouchableOpacity testID="fc-my-packs-retry" accessibilityRole="button" accessibilityLabel={copy.retry} onPress={() => setReloadTick((value) => value + 1)} style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, marginTop: 10, borderRadius: 12, backgroundColor: g.card }}>
                  <Text style={{ color: g.text, fontWeight: '800' }}>{copy.retry}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {renderSection('added', copy.added, visibleGroups.added)}
            {renderSection('created', copy.created, visibleGroups.created)}

            {packCount > 0 && visiblePackCount === 0 ? (
              <Text style={{ color: g.secondary, fontSize: 15, marginTop: 16, textAlign: 'center' }}>
                {copy.noSearchResults}
              </Text>
            ) : null}

            {packCount === 0 ? (
              <View testID={loadStatus === 'error' || loadStatus === 'stale' ? 'fc-my-packs-error' : undefined} style={{ marginTop: 24, alignItems: 'center', gap: 14, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: g.glassEdge, backgroundColor: g.card, overflow: 'hidden' }}>
                <MyPacksGlass tint={g.selected} edge={g.glassEdge} />
                {loadStatus === 'loading' ? (
                  <View testID="fc-my-packs-loading" style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' }}>
                    {[0, 1, 2].map((index) => <View key={index} style={{ width: tileW * 0.78, height: tileW * 0.78, borderRadius: 18, backgroundColor: g.opaqueControl }} />)}
                  </View>
                ) : <Text style={{ color: g.secondary, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                  {loadStatus === 'ready' ? copy.empty : copy.loadError}
                </Text>}
                {loadStatus === 'error' || loadStatus === 'stale' ? <TouchableOpacity testID="fc-my-packs-retry" accessibilityRole="button" onPress={() => setReloadTick((value) => value + 1)} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: g.glassEdge, backgroundColor: g.sheet }}>
                  <Text style={{ color: g.text, fontSize: 14, fontWeight: '800' }}>{copy.retry}</Text>
                </TouchableOpacity> : null}
                {loadStatus === 'ready' ? (
                <TouchableOpacity
                  testID="fc-my-packs-browse-community"
                  accessibilityLabel={copy.browse}
                  accessibilityRole="button"
                  accessible
                  activeOpacity={0.85}
                  onPress={() => router.push(FC_PACKS_ROUTE as never)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: g.glassEdge,
                    backgroundColor: g.sheet,
                  }}
                >
                  <Text style={{ color: g.text, fontSize: 14, fontWeight: '800' }}>{copy.browse}</Text>
                </TouchableOpacity>) : null}
              </View>
            ) : null}

          </View>
        </ScrollView>
        <View pointerEvents="box-none" style={[styles.createFabDock, { bottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            testID="fc-my-packs-create"
            accessibilityLabel={copy.create}
            accessibilityRole="button"
            accessible
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              void hapticTap();
              router.push({ pathname: '/community_pack_create', params: { packLanguage } } as never);
            }}
            style={({ pressed }) => [
              styles.createFab,
              {
                backgroundColor: g.cta,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <Ionicons name="add" size={32} color={g.ctaInk} />
          </Pressable>
        </View>
        <Modal visible={!!deletePackTarget} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!deletePackBusy) setDeletePackTarget(null); }}>
          <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000099' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => { if (!deletePackBusy) setDeletePackTarget(null); }} style={StyleSheet.absoluteFill} />
            <View testID="fc-delete-pack-confirm-modal" style={{ width: '100%', maxWidth: 360, alignSelf: 'center', padding: 22, borderRadius: 26, borderWidth: 1, borderColor: g.glassEdge, backgroundColor: g.sheet, overflow: 'hidden' }}>
              <MyPacksGlass tint={g.selected} edge={g.glassEdge} />
              <Text accessibilityRole="header" style={{ color: g.text, fontSize: 22, fontWeight: '800' }}>{copy.deletePack}</Text>
              <Text style={{ color: g.secondary, fontSize: 15, lineHeight: 22, marginTop: 10 }}>
                {deletePackTarget ? `«${packTitleForInterface(deletePackTarget, lang) || packHubCodeName(deletePackTarget)}» — ${triLang(lang, {
                  ru: 'набор будет убран из твоих наборов.', uk: 'набір буде прибрано з твоїх наборів.', en: 'this pack will be removed from your packs.', es: 'este pack se quitará de tus packs.',
                  'pt-BR': 'este pacote será removido dos seus pacotes.', vi: 'bộ thẻ này sẽ bị xóa khỏi các bộ của bạn.', id: 'paket ini akan dihapus dari paketmu.', tr: 'bu paketlerinden kaldırılacak.', pl: 'ten zestaw zostanie usunięty z Twoich zestawów.',
                })}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
                <TouchableOpacity testID="fc-delete-pack-confirm-cancel" accessibilityRole="button" disabled={deletePackBusy} onPress={() => setDeletePackTarget(null)} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: g.glassEdge, backgroundColor: g.card }}>
                  <Text style={{ color: g.text, fontWeight: '800' }}>{triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'Vazgeç', pl: 'Anuluj' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="fc-delete-pack-confirm-confirm" accessibilityRole="button" disabled={deletePackBusy} onPress={() => { void deletePack(); }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#D9565D' }}>
                  {deletePackBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{copy.deletePack}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // PM-095/PM-096: строка поиска + переключатель сортировки над разделами.
  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, height: 44, paddingVertical: 0, fontSize: 14 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  safe: { flex: 1, flexDirection: 'column', minHeight: 0, backgroundColor: 'transparent' },
  scroll: { flex: 1, minHeight: 0 },
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionCount: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    justifyContent: 'flex-start',
  },
  createFabDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  createFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
  },
});
