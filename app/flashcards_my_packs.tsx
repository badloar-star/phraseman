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
import { DebugLogger } from './debug-logger';
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
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { actionToastTri, emitAppEvent } from './events';
import { MyPacksV2 } from './flashcards/MyPacksV2';
import { runPublishPackFlow } from './flashcards/publish_pack_flow';
import { safeRouterBack } from './navigation_back';
import { useLoadGate } from './use_load_gate';
import { hapticTap } from '../hooks/use-haptics';
import { soundDirector } from '../modules/audio/sound_director';
import { loadCommunityOwnedPackIdsResult } from './community_packs/communityOwnedStorage';
import { fetchCommunityPackMetaResult, loadAuthorCommunityPacksPendingUpdateResult } from './community_packs/communityFirestore';
import { isLocalAuthorPackId, loadLocalAuthorPacks, loadLocalAuthorPacksResult, localAuthorPackToMarketPack, removeLocalAuthorPack } from './community_packs/localAuthorPacks';
import { deleteOwnPackEverywhere, pendingPackDeletes } from './community_packs/deleteOwnPack';
import { emitPackNotDownloadedToast, stageCommunityPackCardsWithSilentRetry } from './community_packs/stage_with_retry';
import {
  loadAccessiblePackIdsResult,
  loadMarketplacePacksResult,
  packHubCodeName,
  packTitleForInterface,
  peekAccessiblePackIds,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import { packTileArtRevision } from './flashcards/packMarketplaceIcons';
import { stageOwnedPackCardsForNavigation } from './flashcards/useCollectionData';
import { getCanonicalUserId } from './user_id_policy';
import { type RuntimeStudyTarget } from './target_storage_keys';
import { defaultPackLanguageForStudyTarget, type PackLanguage } from './flashcards/pack_languages';
import { publishMyPacksCount } from './flashcards/myPacksCountCache';
import { getStoredPackLanguage, setStoredPackLanguage, subscribePackLanguage } from './flashcards/pack_language_preferences';
import { filterPacksByLanguage } from './community_packs/communityCatalogFilter';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import {
  canCommitAccountScopedResult,
  classifyMyPacksResolution,
  MissingPackCache,
  MY_PACKS_MISSING_TTL_MS,
} from './flashcards/myPacksDataIntegrity';

const EXEMPT_COLOR_1 = '#D9565D'; // theme-exempt: белый текст на красной кнопке «Удалить набор»
const EXEMPT_COLOR_2 = '#FFFFFF'; // theme-exempt: белый текст на красной кнопке «Удалить набор»
import { noteSwallowedAs, noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

// зачем (Тень 12.10): MyPacksGlass (блюр + блик + кромка-линия) убран — окно удаления это плашка PlateFill с тенью

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

// зачем (Account V2, 8C): «набора нет» запоминается на 30 мин на процесс — фокусы экрана и
// тихие повторы не читают заново из Firestore документы, которых нет.
const missingPackCache = new MissingPackCache(200, MY_PACKS_MISSING_TTL_MS);

// PM-096: согласованная сортировка «Мои наборы» — по дате изменения, сохраняется
// локально (без сети, без Firestore-чтений). 'updated' — новые сверху (как уже
// сортирует каталог сообщества в marketplace.ts, sortByFreshness); 'name' — по
// алфавиту текущей локали, стабильно (одинаковые названия не меняют порядок).
type MyPacksSort = 'updated' | 'name';
const MY_PACKS_SORT_KEY = 'fc_my_packs_sort_v1';

function isMyPacksSort(value: unknown): value is MyPacksSort {
  return value === 'updated' || value === 'name';
}

// зачем (PM-096-A3): без памяти процесса каждый заход рисовал список «по дате», а через
// чтение диска перетасовывал его «по имени» на глазах. После первого чтения выбор живёт
// здесь, и повторный заход сразу рисует сохранённый порядок.
let myPacksSortMemo: MyPacksSort | null = null;

async function getStoredMyPacksSort(): Promise<MyPacksSort> {
  const raw = await AsyncStorage.getItem(MY_PACKS_SORT_KEY).catch(noteSwallowedAs('flashcards_my_packs:getStoredMyPacksSort.getItem', null));
  const sort = isMyPacksSort(raw) ? raw : 'updated';
  myPacksSortMemo = sort;
  return sort;
}

async function setStoredMyPacksSort(sort: MyPacksSort): Promise<void> {
  myPacksSortMemo = sort;
  await AsyncStorage.setItem(MY_PACKS_SORT_KEY, sort).catch(noteSwallowedHandler('flashcards_my_packs:setStoredMyPacksSort.setItem'));
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
  const { theme: t, liquidGlassThemeId, statusBarLight } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  // Первый кадр — из прогретых кэшей, без ожидания диска и сети (см. peekMyPacksGroups).
  const [packLanguage, setPackLanguage] = useState<PackLanguage>(() => defaultPackLanguageForStudyTarget(studyTarget));
  React.useEffect(() => subscribePackLanguage(setPackLanguage), []);
  const [groups, setGroups] = useState<MyPacksGroups>(() => peekMyPacksGroups(studyTarget, defaultPackLanguageForStudyTarget(studyTarget)));
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'stale' | 'error'>('loading');
  const [reloadTick, setReloadTick] = useState(0);
  const [accountGeneration, setAccountGeneration] = useState(captureAccountGeneration);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [deletePackTarget, setDeletePackTarget] = useState<FlashcardMarketPack | null>(null);
  // зачем (бета-тест 15.10, Б19): «идёт удаление» — у каждого набора своё. Общий флаг без сети не снимался, и окно СЛЕДУЮЩЕГО
  // набора открывалось с выключенными «Отмена»/фоном/назад и вечным индикатором — человек застревал в окне.
  const [deletingPackIds, setDeletingPackIds] = useState<ReadonlySet<string>>(() => new Set());
  const deletePackBusy = !!deletePackTarget && deletingPackIds.has(deletePackTarget.id);
  const setDeletePackBusy = useCallback((packId: string, busy: boolean) => {
    setDeletingPackIds((prev) => {
      if (prev.has(packId) === busy) return prev;
      const next = new Set(prev);
      if (busy) next.add(packId); else next.delete(packId);
      return next;
    });
  }, []);
  // зачем (FINAL_PHASE п.7, Optimistic UI): удаление убирает набор из списка сразу; пока сервер
  // не ответил, фоновая перезагрузка «Моих наборов» не должна вернуть его обратно.
  const pendingDeletePackIdsRef = useRef<Set<string>>(pendingPackDeletes); // общий с экраном набора (deleteOwnPack.ts)
  const withoutPendingDeletes = useCallback((value: MyPacksGroups): MyPacksGroups => {
    const pending = pendingDeletePackIdsRef.current;
    if (pending.size === 0) return value;
    return {
      added: value.added.filter((item) => !pending.has(item.id)),
      created: value.created.filter((item) => !pending.has(item.id)),
    };
  }, []);
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
  // зачем (PM-096-A3, координатор 03.10): сортировку читает загрузчик фокуса ВМЕСТЕ с наборами
  // и применяет одним обновлением — список никогда не появляется в чужом порядке.
  const [myPacksSort, setMyPacksSort] = useState<MyPacksSort>(() => myPacksSortMemo ?? 'updated');
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
    void setStoredPackLanguage(next).catch(noteSwallowedHandler('flashcards_my_packs:useCallback.setStoredPackLanguage'));
  }, []);

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
        .catch((error: unknown) => {
          console.warn('[MY-PACKS] canonical user id FAILED —', error instanceof Error ? error.message : String(error)); // guard-ok: причина отказа в catch (бета-тест А4)
          return { value: null, status: 'stale' as const };
        }),
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
    // зачем (8C-2): ошибка чтения своих опубликованных наборов — не «их нет». Статус идёт в
    // сверку: error → весь результат stale, экран сохраняет уже показанные наборы и тихо повторяет.
    const authoredCloudResult = myStableId && cloudCommunityEnabled
      ? await loadAuthorCommunityPacksPendingUpdateResult(myStableId, studyTarget)
          .catch((e: unknown) => {
            console.warn(`[MY-PACKS] author_packs result=error code=threw_${e instanceof Error ? e.name : typeof e}`);
            return { status: 'error' as const, packs: [] as FlashcardMarketPack[] };
          })
      : { status: 'ok' as const, packs: [] as FlashcardMarketPack[] };
    if (!isCurrentAccountGeneration(operationAccount)) {
      console.log('[MY-PACKS] author_packs skip reason=account_changed');
      return { groups: EMPTY_GROUPS, status: 'stale', accountScope: operationScope };
    }
    const authoredCloud = authoredCloudResult.packs;
    const authoredCloudStatus: 'ready' | 'stale' = authoredCloudResult.status === 'ok' ? 'ready' : 'stale';
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
    // зачем (8C): у загрузки есть конец. Набор, которого ТОЧНО нет (документа нет — удалён,
    // тестовый id; облако выключено), больше не держит экран на скелетоне: остальные
    // показываются, отсутствующий тихо не показывается. Сбой сети — повтор, как раньше.
    const nowMs = Date.now();
    const cachedMissing = missing.filter((id) => missingPackCache.isMissing(`${studyTarget}:${id}`, nowMs));
    const toFetch = missing.filter((id) => !cachedMissing.includes(id));
    const fetched = toFetch.length > 0
      ? await Promise.all(toFetch.map((id) => fetchCommunityPackMetaResult(id, studyTarget)
        .catch((error: unknown) => {
          console.warn(`[MY-PACKS] pack meta FAILED id=${id} —`, error instanceof Error ? error.message : String(error)); // guard-ok: причина отказа в catch (бета-тест А4)
          return { status: 'error' as const };
        })))
      : [];
    if (!isCurrentAccountGeneration(operationAccount)) {
      console.log('[MY-PACKS] resolve skip reason=account_changed');
      return { groups: EMPTY_GROUPS, status: 'stale', accountScope: operationScope };
    }
    const metas: FlashcardMarketPack[] = [];
    const fetchedMissing: string[] = [];
    let fetchErrors = 0;
    fetched.forEach((result, index) => {
      if (result.status === 'found') metas.push(result.pack);
      else if (result.status === 'missing') {
        fetchedMissing.push(toFetch[index]);
        missingPackCache.markMissing(`${studyTarget}:${toFetch[index]}`, nowMs);
      } else fetchErrors += 1;
    });
    // Купленные/официальные id, которых нет в ПОЛНОСТЬЮ прочитанном каталоге (снят, скрыт): тоже не ждём.
    const ownedOutsideCatalog = catalogResult.status === 'ready'
      ? ownedIds.filter((id) => !catalogById.has(id) && !authoredLocalIds.has(id) && !communityOwnedIds.includes(id))
      : [];
    const definitelyMissing = [...cachedMissing, ...fetchedMissing, ...ownedOutsideCatalog];

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
        authoredCloudStatus,
      ],
      ownedIds: [...new Set([...ownedIds, ...communityOwnedIds])],
      resolvedPackIds: [
        ...catalog.map((pack) => pack.id),
        ...metas.map((pack) => pack.id),
      ],
      missingPackIds: definitelyMissing,
    });
    // Лог решения: только числа (без uid и id наборов).
    console.log(`[MY-PACKS] resolve owned=${ownedIds.length} community=${communityOwnedIds.length} catalog=${catalog.length}`
      + ` catalog_status=${catalogResult.status} author_status=${authoredCloudResult.status} fetched=${toFetch.length} found=${metas.length}`
      + ` missing_fetched=${fetchedMissing.length} missing_cached=${cachedMissing.length}`
      + ` missing_outside_catalog=${ownedOutsideCatalog.length} fetch_errors=${fetchErrors} status=${status}`);
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
      const sortRead: Promise<MyPacksSort> = myPacksSortMemo !== null ? Promise.resolve(myPacksSortMemo) : getStoredMyPacksSort();
      void Promise.all([loadMine(), sortRead]).then(([next, storedSort]) => {
        if (cancelled) { console.log('[MY-PACKS] commit skip reason=cancelled'); return; }
        setMyPacksSort(storedSort);
        const currentScope = accountScopeKey(captureAccountGeneration());
        if (!canCommitAccountScopedResult(next.accountScope, currentScope)) {
          console.log('[MY-PACKS] commit skip reason=account_scope_changed');
          return;
        }
        console.log(`[MY-PACKS] commit status=${next.status} added=${next.groups.added.length} created=${next.groups.created.length}`);
        if (next.status === 'stale') {
          setGroups((prev) => prev.added.length + prev.created.length > 0 ? prev : withoutPendingDeletes(next.groups));
          setLoadStatus('stale');
          return;
        }
        const nextGroups = withoutPendingDeletes(next.groups);
        setGroups((prev) =>
          sameGroup(prev.added, nextGroups.added) && sameGroup(prev.created, nextGroups.created)
            ? prev
            : nextGroups,
        );
        setLoadStatus('ready');
      }).catch((error) => {
        console.warn('[FC-DECKS] my packs: загрузка отклонена', { cancelled, error: String(error) });
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

  // зачем (владелец 01.10 + D158 / PM-214): экрана ошибки нет — пока кэш/снимок показывает наборы, а сеть
  // не ответила, молча перезапрашиваем. Но не бесконечно: общий useLoadGate (потолок 12 с, паузы 1/3/8 с);
  // если показать нечего — «Сейчас недоступно» + «Попробовать снова». Повтор → loading (фокус-загрузчик).
  const retryMyPacks = useCallback(() => {
    console.warn('[FC-DECKS] my packs: тихий повтор', { loadStatus });
    setReloadTick((value) => value + 1);
  }, [loadStatus]);
  const myPacksGate = useLoadGate({
    id: 'fc-my-packs',
    status: loadStatus === 'ready' ? 'ready' : loadStatus === 'loading' ? 'loading' : 'error',
    retry: retryMyPacks,
  });

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
        const cards = await stageCommunityPackCardsWithSilentRetry(pack.id, studyTarget, pack, { isStillWanted: () => openingPackRef.current === pack.id, tag: 'my-packs' });
        if (
          openingRequestGenerationRef.current !== requestToken
          || openingPackRef.current !== pack.id
        ) return;
        if (cards.length === 0) {
          openingPackRef.current = null;
          setOpeningPackId(null);
          emitPackNotDownloadedToast();
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
      // зачем (REVIEW_UI_11, PM-094): на pt-BR/vi/id/tr/pl диктор читал русское «карточек» в подписи набора.
      cards: triLang(lang, { ru: 'карточек', uk: 'карток', en: 'cards', es: 'tarjetas', 'pt-BR': 'cartões', vi: 'thẻ', id: 'kartu', tr: 'kart', pl: 'kart' }),
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
    }),
    [lang],
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
    if (!pack || deletePackBusy || pendingDeletePackIdsRef.current.has(pack.id)) {
      console.warn('[MY-PACKS] удаление пропущено', { packId: pack?.id ?? null, busy: deletePackBusy });
      return;
    }
    // зачем (FINAL_PHASE п.7, Optimistic UI): набор исчезает из списка и окно закрывается сразу,
    // сервер догоняет фоном; при ошибке набор возвращается на прежнее место.
    let removedFrom: { group: 'added' | 'created'; index: number } | null = null;
    pendingDeletePackIdsRef.current.add(pack.id);
    setDeletePackBusy(pack.id, true);
    setGroups((prev) => {
      const addedIdx = prev.added.findIndex((item) => item.id === pack.id);
      const createdIdx = prev.created.findIndex((item) => item.id === pack.id);
      removedFrom = addedIdx >= 0 ? { group: 'added', index: addedIdx } : createdIdx >= 0 ? { group: 'created', index: createdIdx } : null;
      return {
        added: prev.added.filter((item) => item.id !== pack.id),
        created: prev.created.filter((item) => item.id !== pack.id),
      };
    });
    setDeletePackTarget(null);
    DebugLogger.info('[MY-PACKS]', `удаление набора ${pack.id}: убран из списка сразу, local=${isLocalAuthorPackId(pack.id)}`);
    try {
      // зачем (координатор 12.10): ввод-вывод удаления общий с шторкой «Удалить набор» на экране набора — app/community_packs/deleteOwnPack.ts
      await deleteOwnPackEverywhere(pack, studyTarget);
      DebugLogger.info('[MY-PACKS]', `удаление набора ${pack.id}: сервер подтвердил`);
      emitAppEvent('action_toast', actionToastTri('success', {
        ru: 'Набор удалён.', uk: 'Набір видалено.', en: 'Pack deleted.', es: 'Pack eliminado.',
        'pt-BR': 'Pacote excluído.', vi: 'Đã xóa bộ thẻ.', id: 'Paket dihapus.', tr: 'Paket silindi.', pl: 'Zestaw usunięty.',
      }));
    } catch (error) {
      const at = removedFrom as { group: 'added' | 'created'; index: number } | null;
      DebugLogger.warn('[MY-PACKS]', `удаление набора ${pack.id} не удалось — откат в ${at?.group ?? 'нет позиции'}: ${String(error)}`);
      if (at) {
        setGroups((prev) => {
          if (prev.added.some((item) => item.id === pack.id) || prev.created.some((item) => item.id === pack.id)) return prev;
          const list = [...prev[at.group]];
          list.splice(Math.min(at.index, list.length), 0, pack);
          return { ...prev, [at.group]: list };
        });
      }
      // зачем (бета-тест 15.10, Б19): без сети — человеческое «нет интернета, набор на месте», а не общее «не удалось»
      const code = String((error as { code?: unknown } | null)?.code ?? '');
      const offline = /unavailable|deadline-exceeded|network/i.test(code) || /network|internet|offline|timed? ?out/i.test(String(error));
      DebugLogger.warn('[MY-PACKS]', `удаление набора ${pack.id}: тост=${offline ? 'offline' : 'generic'} code=${code || '-'}`);
      emitAppEvent('action_toast', actionToastTri('error', offline ? {
        ru: 'Нет интернета. Набор на месте.', uk: 'Немає інтернету. Набір на місці.', en: 'No internet. The pack is still here.', es: 'Sin internet. El pack sigue aquí.',
        'pt-BR': 'Sem internet. O pacote continua aqui.', vi: 'Không có mạng. Bộ thẻ vẫn còn.', id: 'Tidak ada internet. Paket masih ada.', tr: 'İnternet yok. Paket yerinde.', pl: 'Brak internetu. Zestaw został.',
      } : {
        ru: 'Не удалось удалить набор.', uk: 'Не вдалося видалити набір.', en: 'Could not delete the pack.', es: 'No se pudo eliminar el pack.',
        'pt-BR': 'Não foi possível excluir o pacote.', vi: 'Không thể xóa bộ thẻ.', id: 'Paket tidak dapat dihapus.', tr: 'Paket silinemedi.', pl: 'Nie udało się usunąć zestawu.',
      }));
    } finally {
      pendingDeletePackIdsRef.current.delete(pack.id);
      setDeletePackBusy(pack.id, false);
    }
  }, [deletePackBusy, deletePackTarget, setDeletePackBusy, studyTarget]);

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
    }).catch((error: unknown) => {
      // зачем (8L): немой catch прятал отказ публикации счётчика — причина в лог, без uid.
      console.warn(`[MY-PACKS] count_publish failed kind=${error instanceof Error ? error.name : typeof error}`);
    });
    return () => { cancelled = true; };
  }, [accountGeneration, groups, loadStatus, studyTarget]);

  // зачем (владелец: «в приложении запрещены любые различия с макетом», cards-section «Мои наборы»): разметка списка вынесена
  // в MyPacksV2 (строки-карточки, разделы, «Создать набор», шторка действий); здесь остаётся только логика экрана.
  const listStatus: 'list' | 'loading' | 'unavailable' | 'empty' = packCount > 0
    ? 'list'
    : loadStatus !== 'ready' && myPacksGate.exhausted
      ? 'unavailable'
      : loadStatus !== 'ready'
        ? 'loading'
        : 'empty';
  const labelFor = useCallback((pack: FlashcardMarketPack): string => {
    const displayTitle = packTitleForInterface(pack, contentLang);
    return pack.isCommunityUgc && displayTitle.trim().length > 0 ? displayTitle.trim() : packHubCodeName(pack);
  }, [contentLang]);
  const trainFromPack = useCallback((pack: FlashcardMarketPack) => {
    // зачем (cards-v2, круглая «играть» стопки): тренировка стартует именно с ЭТИМ набором — тот же вход, что у «Тренировать» внутри набора
    // (хаб откроет окно режимов и после выбора запустит сессию с набором, flashcards_collection.onTrainThisPack).
    DebugLogger.info('[MY-PACKS]', `стопка: «Тренировать» pack=${pack.id} cnt=${pack.cardCount}`);
    router.navigate({ pathname: '/flashcards', params: { train: '1', deck: `pack:${pack.id}`, cnt: String(pack.cardCount) } } as never);
  }, [router]);
  const publishPackFromList = useCallback((pack: FlashcardMarketPack) => {
    DebugLogger.info('[MY-PACKS]', `шторка набора: «Открыть сообществу» ${pack.id}`);
    void runPublishPackFlow(pack.id, lang, studyTarget).then((result) => {
      if (result === 'submitted') setReloadTick((value) => value + 1);
    });
  }, [lang, studyTarget]);

  return (
    <View style={{ flex: 1, backgroundColor: g.bg }}>
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <MyPacksV2
          lang={lang}
          created={visibleGroups.created}
          added={visibleGroups.added}
          totalCount={packCount}
          status={listStatus}
          labelFor={labelFor}
          openingPackId={openingPackId}
          query={myPacksQuery}
          onQueryChange={setMyPacksQuery}
          sort={myPacksSort}
          onSortChange={(next) => { void hapticTap(); handleMyPacksSortChange(next); }}
          packLanguage={packLanguage}
          onPackLanguageChange={handlePackLanguageChange}
          onBack={leave}
          onCreate={() => {
            void hapticTap();
            router.push({ pathname: '/community_pack_create', params: { packLanguage } } as never);
          }}
          onOpen={(pack) => { void openPack(pack); }}
          onTrain={trainFromPack}
          onEdit={openPackEditor}
          onPublish={publishPackFromList}
          onDelete={setDeletePackTarget}
          onRetry={() => { void hapticTap(); myPacksGate.retryNow('tap'); }}
        />
        <Modal visible={!!deletePackTarget} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!deletePackBusy) setDeletePackTarget(null); }}>
          <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000099' /* theme-exempt: затемнение под окном удаления — тёмный скрим в любой теме */ }}>
            <Pressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => { if (!deletePackBusy) setDeletePackTarget(null); }} style={StyleSheet.absoluteFill} />
            <View testID="fc-delete-pack-confirm-modal" style={{ width: '100%', maxWidth: 360, alignSelf: 'center', padding: 22, borderRadius: 26, backgroundColor: g.sheet, boxShadow: plateBoxShadow(g) }}>
              <PlateFill g={g} radius={26} />
              <Text accessibilityRole="header" style={{ color: g.text, fontSize: 22, fontWeight: '800' }}>{copy.deletePack}</Text>
              <Text style={{ color: g.secondary, fontSize: 16, lineHeight: 22, marginTop: 10 }}>
                {deletePackTarget ? `«${packTitleForInterface(deletePackTarget, lang) || packHubCodeName(deletePackTarget)}» — ${triLang(lang, {
                  ru: 'набор будет убран из твоих наборов.', uk: 'набір буде прибрано з твоїх наборів.', en: 'this pack will be removed from your packs.', es: 'este pack se quitará de tus packs.',
                  'pt-BR': 'este pacote será removido dos seus pacotes.', vi: 'bộ thẻ này sẽ bị xóa khỏi các bộ của bạn.', id: 'paket ini akan dihapus dari paketmu.', tr: 'bu paketlerinden kaldırılacak.', pl: 'ten zestaw zostanie usunięty z Twoich zestawów.',
                })}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity testID="fc-delete-pack-confirm-cancel" accessibilityRole="button" disabled={deletePackBusy} onPress={() => setDeletePackTarget(null)} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }}>
                  <Text style={{ color: g.text, fontWeight: '800' }}>{triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'Vazgeç', pl: 'Anuluj' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="fc-delete-pack-confirm-confirm" accessibilityRole="button" disabled={deletePackBusy} onPress={() => { void deletePack(); }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: EXEMPT_COLOR_1 }}>
                  {deletePackBusy ? <ActivityIndicator color={EXEMPT_COLOR_2} /> : <Text style={{ color: g.mediaInk, fontWeight: '800' }}>{copy.deletePack}</Text>}
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
  safe: { flex: 1, flexDirection: 'column', minHeight: 0, backgroundColor: 'transparent' },
});
