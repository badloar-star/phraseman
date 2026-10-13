import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { noteHubSubscription, useHubLifecycle } from '../hub_lifecycle_probe';
import { usePerfR1Probe } from '../perf_r1_probe';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import ContentWrap from '../../components/ContentWrap';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import FeatureIntroEntry from '../../components/feature_intro/FeatureIntroEntry';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { usePremium } from '../../components/PremiumContext';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useFlashcardTrainingQuotaPreview } from '../../hooks/useFlashcardTrainingQuotaPreview';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { markNextNavigationAsReplace, safeRouterBack } from '../navigation_back';
import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { loadPublishedCommunityMarketPacks } from '../community_packs/communityFirestore';
import { isLocalAuthorPackId, loadLocalAuthorPacks } from '../community_packs/localAuthorPacks';
import { getCanonicalUserId } from '../user_id_policy';
import { startCommunityPackOpen } from '../community_packs/stage_with_retry';
import {
  loadMarketplacePacks,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './marketplace';
import CardsHubV2 from './CardsHubV2';
import { useFcReduceMotion } from './PhraseCard';
import V2Backdrop from '../../components/v2/V2Backdrop';
import FlashcardsTrainingModeSheet from './FlashcardsTrainingModeSheet';
import { buildCardsTrainingRoute, type CardsTrainingMode } from './training_entry';
import { canStartBlitz } from './blitz_logic';
import { isValidDeckId } from './deck_selection';
import { FC_DEFAULT_SESSION_SIZE, setLastPreset } from './mode_prefs';
import { fcTrainOptionPresetMode } from './tabbar_state';
import { primeFlashcardsCollectionCache } from './useCollectionData';
import { getTranscription } from '../transcription';
import { hydrateFcDeckOptionsSnapshot, loadFcDeckOptions } from './deck_options';
import { loadSelectedSavedContour, peekFirstSavedCardAnyLanguage, peekSelectedSavedContour, peekSelectedSavedContourDiagnostics } from './saved_language_contour';
import { logMemoryOnce } from '../mem_probe';
import { isDevCardsHeld } from '../dev_cards_state';

import { packTileArtRevision } from './packMarketplaceIcons';
import { peekMyPacksCount } from './myPacksCountCache';
import { hydrateLastKnownMyPacksCount, peekLastKnownMyPacksCount, rememberLastKnownMyPacksCount } from './myPacksCountLastKnown';
import { peekStableId } from '../stable_id';
import { subscribeAccountGeneration } from '../account_generation';
import { loadVideoPhraseSetPacks, peekVideoPhraseSetPacks } from '../video_phrase_set_packs';
import { applyCommunityPacksFilter, filterVideoPacks } from '../community_packs/communityCatalogFilter';
import { peekStoredPackLanguage } from './pack_language_preferences';
import { defaultPackLanguageForStudyTarget } from './pack_languages';
import { buildFcCreateRoute } from './tabbar_state';
import { noteSwallowedAs } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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

/** Потолок ожидания квоты после раннего тапа (§90). */
const EARLY_TAP_CEILING_MS = 15_000;

// зачем (координатор 11.10, «сперва логи»): у гостя с 64 сохранёнными стопка показывала заглушку «Boarding pass».
// Итог верхней карточки — в журнал только при смене (компонент рендерится часто), вместе с причиной из контура.
let lastHubTopCardLog = '';
function logHubTopCardOutcome(word: string | null, trainingLocked: boolean, ipaFrom: 'stored' | 'dictionary' | 'none'): void {
  const outcome = trainingLocked ? 'limit_out' : word ? 'word' : 'stub_boarding_pass';
  const key = `${outcome}|${word ?? ''}|${ipaFrom}`;
  if (key === lastHubTopCardLog) return;
  lastHubTopCardLog = key;
  console.log('[HUB-TOPCARD] shown', JSON.stringify({ outcome, word, ipaFrom, contour: peekSelectedSavedContourDiagnostics() }));
}

export default function FlashcardsHubScreen() {
  // зачем (координатор 12.10, утечка памяти в хабе; сперва логи): mount/unmount хаба с размерами кэшей и слушателей — по нему видно, что растёт с каждым заходом.
  useHubLifecycle('FlashcardsHubScreen');
  usePerfR1Probe('cards_hub'); // зачем (координатор 12.10, R1_PERF_FIRST_FRAME): первый кадр и число коммитов корня за 3 с; в релизе — пустая функция
  useFocusEffect(useCallback(() => {
    noteHubSubscription('FlashcardsHubScreen.focus', 'on');
    return () => noteHubSubscription('FlashcardsHubScreen.focus', 'off');
  }, []));
  const { liquidGlassThemeId, statusBarLight } = useTheme(); // зачем (Сверка 18:25, светлая тема): значки строки состояния не белые на светлом
  const g = liquidGlassTokens(liquidGlassThemeId);
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { accessResolved } = usePremium();
  const quotaPreview = useFlashcardTrainingQuotaPreview();
  const insets = useStableSafeAreaInsets();
  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const [catalog, setCatalog] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks(studyTarget) ?? [],
  );
  const [ownedCommunityPackIds, setOwnedCommunityPackIds] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(() => peekSelectedSavedContour(studyTarget)?.length ?? null);
  // My Packs includes unpublished author packs that the Hub catalog does not know.
  // Only its settled account/target snapshot is a truthful count.
  const [myPackCount, setMyPackCount] = useState<number | null>(null);
  // зачем (координатор 11.10, Optimistic UI; лог [HUB-TILES] mine:instant): плитка «Мои наборы» была пустой, пока не догрузится каталог, а после
  // паузы (точный снимок живёт 15 с) — ещё и до следующего полного входа: фокус-эффект ниже сбрасывает myPackCount в null, когда снимка нет, а гейт
  // «тёплого» входа не даёт локальному счёту пересчитаться. Показываем ПОСЛЕДНЕЕ ИЗВЕСТНОЕ число (память + диск, ключ — цель обучения и аккаунт), а
  // точное/локальное значение после загрузки его уточняет. Фокус-эффект (под замком контракта хаба) не тронут; решения («хаб новичка») по этому числу
  // не принимаются — только по подтверждённому myPackCount.
  const mineIdentityRef = useRef<{ target: string; userId: string | null } | null>(null);
  const myPackCountRef = useRef<number | null>(null);
  const [heldMineCount, setHeldMineCount] = useState<number | null>(
    () => peekLastKnownMyPacksCount(studyTarget, CLOUD_SYNC_ENABLED ? peekStableId() : null),
  );
  // Смена аккаунта (вход/выход/смена) — перечитать идентичность и число: чужое число не должно остаться на плитке.
  const [mineIdentityEpoch, setMineIdentityEpoch] = useState(0);
  useEffect(() => {
    const subscription = subscribeAccountGeneration(() => setMineIdentityEpoch((epoch) => epoch + 1));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const userId = await getCanonicalUserId();
      await hydrateLastKnownMyPacksCount();
      if (cancelled) {
        console.log('[HUB-TILES] mine:instant отменено — экран ушёл до чтения идентичности'); // guard-ok: ранний выход логируется
        return;
      }
      const prevIdentity = mineIdentityRef.current;
      const identityChanged = prevIdentity !== null && (prevIdentity.userId !== userId || prevIdentity.target !== String(studyTarget));
      mineIdentityRef.current = { target: String(studyTarget), userId };
      const known = peekLastKnownMyPacksCount(studyTarget, userId);
      // Число другого аккаунта/цели сюда не попадает: ключ включает обоих. При смене аккаунта прежний подтверждённый счёт — чужой: сбрасываем и НЕ запоминаем.
      if (identityChanged) setMyPackCount(null);
      else if (myPackCountRef.current !== null) rememberLastKnownMyPacksCount(studyTarget, userId, myPackCountRef.current);
      setHeldMineCount(known);
      console.log('[HUB-TILES] mine:instant', JSON.stringify({ source: known === null ? 'none' : 'cache', value: known, confirmed: myPackCountRef.current, studyTarget, userId: userId ? 'есть' : 'нет' })); // guard-ok: трассировка
    })().catch((error: unknown) => {
      console.warn('[HUB-TILES] mine:instant FAILED —', error instanceof Error ? error.message : String(error)); // guard-ok: причина в лог
    });
    return () => { cancelled = true; };
  }, [studyTarget, mineIdentityEpoch]);
  useEffect(() => {
    myPackCountRef.current = myPackCount;
    if (myPackCount === null) return;
    const identity = mineIdentityRef.current;
    if (!identity || identity.target !== String(studyTarget)) return; // идентичность ещё не прочитана — запомним в эффекте выше
    const prev = heldMineCount;
    rememberLastKnownMyPacksCount(identity.target, identity.userId, myPackCount);
    if (prev !== myPackCount) {
      console.log('[HUB-TILES] mine:update', JSON.stringify({ from: prev, to: myPackCount, source: prev === null ? 'local' : 'refine' })); // guard-ok: трассировка уточнения
      setHeldMineCount(myPackCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: реагируем только на смену подтверждённого счёта, heldMineCount читаем как есть
  }, [myPackCount, studyTarget]);
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
  // зачем (координатор §90, 02.10): ранний тап, пока квота читается ('waiting' — на слабом устройстве
  // несколько секунд очереди AsyncStorage), открывает окно режимов СРАЗУ; режимы ждут и оживают сами.
  const [earlyTap, setEarlyTap] = useState<'waiting' | 'failed' | null>(null);
  const earlyTapStartedAtRef = useRef<number | null>(null);
  const pendingModeRef = useRef<CardsTrainingMode | null>(null);
  // зачем: набор, с экрана которого нажали «Тренировать» (прямой старт после выбора режима)
  const pendingDeckRef = useRef<{ deckId: string; count: number } | null>(null);
  const trainButtonRef = useRef<View>(null);

  const copy = useMemo(() => ({
    subtitleShort: triLang(lang, {
      ru: 'Слова и фразы', uk: 'Слова й вислови', en: 'Words and phrases', es: 'Palabras y frases',
      'pt-BR': 'Palavras e frases', vi: 'Từ và cụm từ', id: 'Kata dan frasa', tr: 'Kelimeler ve ifadeler', pl: 'Słowa i zwroty',
    }),
    videoShort: triLang(lang, {
      ru: 'Из видео', uk: 'З відео', en: 'From videos', es: 'De vídeos',
      'pt-BR': 'De vídeos', vi: 'Từ video', id: 'Dari video', tr: 'Videolardan', pl: 'Z filmów',
    }),
    title: triLang(lang, {
      ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões',
      vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Karty',
    }),
    subtitle: triLang(lang, {
      ru: 'Учи слова и фразы эффективнее', uk: 'Вивчай слова й вислови ефективніше',
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
      'pt-BR': 'Quantidade ainda indisponível', vi: 'Chưa rõ số lượng', id: 'Jumlah belum tersedia', tr: 'Sayı henüz belli değil', pl: 'Liczba jeszcze nieznana',
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
      ru: 'Твои карточки', uk: 'Твої картки', en: 'Your cards', es: 'Tus tarjetas',
      'pt-BR': 'Seus cartões', vi: 'Thẻ của bạn', id: 'Kartumu', tr: 'Kartların', pl: 'Twoje karty',
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
        // зачем (Сверка: у плитки «Мои наборы» нет числа при 4 наборах в фикстуре): peekMyPacksCount отдаёт число только если экран «Мои наборы»
        // уже один раз прогрузился; на свежем входе там null. Лог показывает значение и откуда оно, ниже загрузчик подставляет локальный счёт.
        const settled = peekMyPacksCount(studyTarget, userId);
        console.log('[HUB-TILES] mine:settled', JSON.stringify({ settled, userId: userId ? 'есть' : 'нет', studyTarget, source: settled === null ? 'нет снимка «Мои наборы» → ждём локальный счёт' : 'снимок «Мои наборы»' })); // guard-ok: единичный лог на вход
        if (!cancelled) setMyPackCount(settled);
      }).catch((error: unknown) => {
        console.warn('[HUB-TILES] mine:settled FAILED —', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
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
          loadMarketplacePacks(studyTarget).catch(noteSwallowedAs('FlashcardsHubScreen:useCallback.loadMarketplacePacks', [])),
          cloudCommunityEnabled
            // Кнопка «Повторить» (revision > 0) — жест человека, идём мимо кэша.
            ? loadPublishedCommunityMarketPacks(studyTarget, { forceRemote: catalogLoadRevision > 0 })
                .catch(noteSwallowedAs('FlashcardsHubScreen:useCallback.loadPublishedCommunityMarketPacks', []))
            : Promise.resolve([] as FlashcardMarketPack[]),
          cloudCommunityEnabled
            ? loadCommunityOwnedPackIds(studyTarget).catch(noteSwallowedAs('FlashcardsHubScreen:useCallback.loadCommunityOwnedPackIds', []))
            : Promise.resolve([] as string[]),
          loadLocalAuthorPacks(studyTarget).catch(noteSwallowedAs('FlashcardsHubScreen:useCallback.loadLocalAuthorPacks', [])),
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
        // зачем: нет снимка «Мои наборы» — берём локальный счёт (свои наборы с устройства + добавленные из сообщества); снимок, когда появится, перекроет его
        setMyPackCount((prev) => {
          const next = prev ?? nextOwned.length;
          console.log('[HUB-TILES] mine:local', JSON.stringify({ prev, local: nextOwned.length, authored: authored.length, ownedCommunity: owned.length, shown: next, source: prev === null ? 'локальный счёт' : 'снимок «Мои наборы»' })); // guard-ok: единичный лог на вход
          return next;
        });
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
    // зачем (packs-simple-004, решено по рекомендации): переход сразу по тапу, карточки догружаются на экране набора
    // (скелет). Повторный тап по строке не запускает вторую загрузку (реестр открытий) и не толкает второй экран.
    if (openingPackRef.current) return;
    openingPackRef.current = pack.id;
    setTimeout(() => { if (openingPackRef.current === pack.id) openingPackRef.current = null; }, 800);
    void startCommunityPackOpen(pack.id, studyTarget, pack, 'hub');
    router.push({
      pathname: '/flashcards_collection',
      params: { pack: pack.id, preview: '1', from: 'hub' },
    } as never);
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
  // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `hold=quota_waiting|quota_failed` держит квоту «не готова» — шторка режимов остаётся на «Готовим тренировку…» / «Не получилось подготовить»; в стор-сборке геттеры выключены.
  const trainingEntryReady = !(isDevCardsHeld('quota_waiting') || isDevCardsHeld('quota_failed')) && (quotaPreview.status === 'allowed'
    || quotaPreview.status === 'unavailable'
    || quotaPreview.status === 'stale_account');
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

  // Ранний тап: квота ответила → режимы оживают сами (никакого автоперехода — поздний ответ после
  // закрытия окна ничего не делает); потолок 15 с → сообщение + «Повторить»; лимит исчерпан → обычная
  // ветка покупки.
  useEffect(() => {
    if (earlyTap === null) return undefined;
    if (trainingLocked || trainingEntryReady) {
      const waitedMs = earlyTapStartedAtRef.current === null ? -1 : Date.now() - earlyTapStartedAtRef.current;
      console.log(`[FC-TRAIN-ENTRY] early_tap:resolved status="${quotaPreview.status}" waitedMs=${waitedMs}`);
      earlyTapStartedAtRef.current = null;
      setEarlyTap(null);
      return undefined;
    }
    if (earlyTap !== 'waiting' || isDevCardsHeld('quota_waiting')) return undefined;
    const timer = setTimeout(() => {
      console.warn(`[FC-TRAIN-ENTRY] early_tap:timeout за ${EARLY_TAP_CEILING_MS}мс — статус квоты="${quotaPreview.status}"`);
      setEarlyTap('failed');
    }, EARLY_TAP_CEILING_MS);
    return () => clearTimeout(timer);
  }, [earlyTap, quotaPreview.status, trainingEntryReady, trainingLocked]);

  const retryEarlyTap = useCallback(() => {
    void hapticTap();
    console.log('[FC-TRAIN-ENTRY] early_tap:retry');
    earlyTapStartedAtRef.current = Date.now();
    setEarlyTap('waiting');
  }, []);

  const closeModeSheet = useCallback(() => {
    if (earlyTap !== null) console.log(`[FC-TRAIN-ENTRY] early_tap:closed state=${earlyTap}`);
    earlyTapStartedAtRef.current = null;
    setEarlyTap(null);
    setModeSheetVisible(false);
  }, [earlyTap]);

  const chooseMode = useCallback((mode: CardsTrainingMode) => {
    if (earlyTap !== null) {
      console.log(`[FC-TRAIN-ENTRY] early_tap:choose_ignored mode=${mode} state=${earlyTap}`);
      return;
    }
    if (trainingLocked) {
      openTrainingPaywall('flashcard_training', 'flashcards_hub_training_mode');
      return;
    }
    if (!trainingEntryReady) return;
    pendingModeRef.current = mode;
    setModeSheetVisible(false);
  }, [earlyTap, openTrainingPaywall, trainingEntryReady, trainingLocked]);

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
    // зачем (владелец 04.10: «Тренировать в наборе — СРАЗУ ЭТОТ НАБОР, без экрана выбора наборов»): если вход пришёл с экрана набора (?deck=pack:…),
    // после выбора режима сразу открываем сессию с этим набором. Блиц с малым числом карточек, неизвестный набор — прежний путь через экран выбора.
    const deck = pendingDeckRef.current;
    pendingDeckRef.current = null;
    console.log('[BLITZ-AUTOOPEN] hub:dismissal-push', JSON.stringify({ mode, deck: deck ? deck.deckId : null, count: deck ? deck.count : null }));
    if (deck && isValidDeckId(deck.deckId)) {
      const route = mode === 'blitz' && !canStartBlitz(deck.count) ? null : buildCardsTrainingRoute(mode, [deck.deckId]);
      console.log(`[FC-TRAIN-ENTRY] прямой старт набора deck=${deck.deckId} режим=${mode} карточек=${deck.count} маршрут=${route ? route.pathname : 'нет → экран выбора'}`);
      if (route) {
        const presetMode = mode === 'blitz' ? fcTrainOptionPresetMode('blitz') : mode === 'speaking' ? fcTrainOptionPresetMode('speak') : fcTrainOptionPresetMode('train');
        void setLastPreset(presetMode, { deckIds: [deck.deckId], size: FC_DEFAULT_SESSION_SIZE }).catch((error: unknown) => {
          console.warn('[FC-TRAIN-ENTRY] прямой старт: пресет не сохранился', error instanceof Error ? error.message : String(error));
        });
        router.push({ pathname: route.pathname, params: route.params } as never);
        return;
      }
    }
    router.push({ pathname: '/flashcards_training_setup', params: { mode } } as never);
  }, [router]);

  const hubParams = useLocalSearchParams<{ train?: string; deck?: string; cnt?: string }>();
  const onTrainPress = () => {
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
          // зачем (§90): кнопка больше не бывает «мёртвой» — окно открывается сразу и ждёт квоту.
          if (modeSheetVisible) {
            console.log('[FC-TRAIN-ENTRY] early_tap:double_tap_ignored');
            return;
          }
          console.log(`[FC-TRAIN-ENTRY] early_tap:waiting статус квоты="${quotaPreview.status}"`);
          pendingModeRef.current = null;
          earlyTapStartedAtRef.current = Date.now();
          setEarlyTap(isDevCardsHeld('quota_failed') ? 'failed' : 'waiting');
          setModeSheetVisible(true);
          return;
        }
        pendingModeRef.current = null;
        setModeSheetVisible(true);
  };

  // зачем (макет «Список»: плавающая «Тренировать» на списке «Сохранённых»): список зовёт хаб с ?train=1 — открываем то же окно выбора режима
  // со всей логикой лимита и пейвола; параметр сбрасываем, чтобы возврат на хаб не открывал окно снова.
  const autoTrainHandledRef = useRef(false);
  useEffect(() => {
    console.log('[BLITZ-AUTOOPEN] hub:autotrain-effect', JSON.stringify({ train: hubParams.train ?? null, deck: hubParams.deck ?? null, handled: autoTrainHandledRef.current }));
    if (hubParams.train !== '1' || autoTrainHandledRef.current) return;
    autoTrainHandledRef.current = true;
    const deckParam = typeof hubParams.deck === 'string' ? hubParams.deck.trim() : '';
    pendingDeckRef.current = deckParam ? { deckId: deckParam, count: Number(hubParams.cnt) || 0 } : null;
    router.setParams({ train: undefined, deck: undefined, cnt: undefined } as never);
    onTrainPress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubParams.train]);
  useFocusEffect(useCallback(() => {
    console.log('[BLITZ-AUTOOPEN] hub:focus — сброс флага автозапуска');
    autoTrainHandledRef.current = false;
  }, []));

  // зачем (владелец 04.10, хаб А утверждён): экран рисует CardsHubV2 1:1 с макетом cards-section.html; вся логика квоты, раннего тапа и окна режимов — выше, без изменений.
  // Запасной язык — тот же, что у loadSelectedSavedContour(studyTarget); в выбранном языке пусто → любая сохранённая.
  const topCard = peekSelectedSavedContour(studyTarget)?.[0] ?? peekFirstSavedCardAnyLanguage();
  // зачем (координатор 11.10): ANR на тапе по «Карточкам» при 1,87 ГБ pss — размер кучи на первом открытии хаба.
  logMemoryOnce('cards_hub_open');
  // зачем (координатор 12.10, cards-v2-001): у верхней карточки стопки не было транскрипции — в сохранённой карточке она появляется только после открытия списка (там дозаполняется),
  // а хаб читал лишь сохранённое поле. Берём сохранённую; нет — словарь (getTranscription отвечает пустой строкой, когда не уверен, — ничего не выдумываем).
  const topStoredIpa = topCard?.transcription?.trim() ?? '';
  // зачем (аудит скорости R1, 12.10): словарная транскрипция считалась на КАЖДЫЙ рендер хаба; слово верхней карточки меняется редко — считаем по слову
  const topCardEn = topCard?.en ?? null;
  const topDictIpa = useMemo(() => (topCardEn && !topStoredIpa ? getTranscription(topCardEn) : ''), [topCardEn, topStoredIpa]);
  const topIpaText = topStoredIpa || topDictIpa;
  logHubTopCardOutcome(topCard?.en ?? null, trainingLocked, topStoredIpa ? 'stored' : topDictIpa ? 'dictionary' : 'none');
  const limitLabel = quotaPreview.status === 'waiting' ? null : `${Math.max(0, quotaPreview.limit - quotaPreview.used)}/${quotaPreview.limit}`;
  // зачем (макет: «Осталось 0 из 30 · до 1 ноября»): дата сброса — первое число следующего месяца на языке интерфейса.
  // зачем (аудит скорости R1, 12.10): toLocaleDateString создаёт Intl-форматтер на каждый вызов (десятки мс на Hermes/Android при первом использовании языка),
  // а хаб рендерится часто (квота, фокус, сеть). Дата сброса зависит только от языка и месяца — считаем один раз на язык.
  const resetDate = useMemo(() => {
    const now = new Date();
    try { return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(lang, { day: 'numeric', month: 'long' }); } catch (error) { console.warn('[FC-HUB] reset date format failed —', error instanceof Error ? error.message : String(error)); return ''; } // guard-ok: лог причины, значение по умолчанию — без даты
  }, [lang]);
  const trainLabel = trainingLocked
    ? triLang(lang, { ru: `Осталось 0 из ${quotaPreview.limit} · до ${resetDate}`, uk: `Залишилось 0 з ${quotaPreview.limit} · до ${resetDate}`, en: `0 of ${quotaPreview.limit} left · until ${resetDate}`, es: `Quedan 0 de ${quotaPreview.limit} · hasta el ${resetDate}`, 'pt-BR': `Restam 0 de ${quotaPreview.limit} · até ${resetDate}`, vi: `Còn 0 trong ${quotaPreview.limit} · đến ${resetDate}`, id: `Sisa 0 dari ${quotaPreview.limit} · sampai ${resetDate}`, tr: `${quotaPreview.limit} çalışmadan 0 kaldı · ${resetDate} tarihine kadar`, pl: `Zostało 0 z ${quotaPreview.limit} · do ${resetDate}` })
    : quotaPreview.status === 'allowed'
      ? triLang(lang, { ru: `Тренироваться · осталось ${trainingRemaining} из ${quotaPreview.limit}`, uk: `Тренуватися · залишилось ${trainingRemaining} з ${quotaPreview.limit}`, en: `Practise · ${trainingRemaining} of ${quotaPreview.limit} left`, es: `Entrenar · quedan ${trainingRemaining} de ${quotaPreview.limit}`, 'pt-BR': `Treinar · restam ${trainingRemaining} de ${quotaPreview.limit}`, vi: `Luyện tập · còn ${trainingRemaining} trong ${quotaPreview.limit}`, id: `Latihan · sisa ${trainingRemaining} dari ${quotaPreview.limit}`, tr: `Çalış · ${quotaPreview.limit} içinden ${trainingRemaining} kaldı`, pl: `Ćwicz · zostało ${trainingRemaining} z ${quotaPreview.limit}` })
      : copy.train;
  // зачем (макет: «64», «4», «3 набора», «1 240»): число целиком с разделителем тысяч, без «1,2K»; у «Из видео» — число со словом «наборов» в нужной форме.
  // зачем (аудит скорости R1, 12.10): `new Intl.NumberFormat(lang)` стоял в КАЖДОМ вызове fmt (четыре плитки + «из видео» на каждый рендер); форматтер один на язык
  const numberFormat = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const fmt = (n: number | null) => (n === null ? '' : numberFormat.format(n));
  const packsWord = (n: number): string => {
    // зачем: Intl.PluralRules в Hermes на Android не даёт русских форм («4 наборов»); считаем вручную по правилам ru/uk/pl, остальные языки — «один / другие».
    const n10 = n % 10;
    const n100 = n % 100;
    const slavic = lang === 'ru' || lang === 'uk';
    const cat = slavic
      ? (n10 === 1 && n100 !== 11 ? 'one' : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 'few' : 'many')
      : lang === 'pl'
        ? (n === 1 ? 'one' : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 'few' : 'many')
        : (n === 1 ? 'one' : 'other');
    const forms: Record<string, [string, string, string]> = {
      ru: ['набор', 'набора', 'наборов'], uk: ['набір', 'набори', 'наборів'], pl: ['zestaw', 'zestawy', 'zestawów'],
      en: ['pack', 'packs', 'packs'], es: ['pack', 'packs', 'packs'], 'pt-BR': ['pacote', 'pacotes', 'pacotes'],
      vi: ['bộ thẻ', 'bộ thẻ', 'bộ thẻ'], id: ['paket', 'paket', 'paket'], tr: ['paket', 'paket', 'paket'],
    };
    const f = forms[lang] ?? forms.en!;
    return cat === 'one' ? f[0] : cat === 'few' ? f[1] : f[2];
  };
  const fmtPacks = (n: number | null) => (n === null ? '' : `${fmt(n)} ${packsWord(n)}`);
  // зачем (аудит скорости R1, C2, координатор 12.10): `tiles` собирался заново на каждый рендер корня (новые объекты и inline-onPress), и memo у CardsHubV2 не срабатывал.
  // Плитки зависят только от подписей, счётчиков, форматтера чисел и языка; `router` стабилен. fmt/packsWord читают лишь numberFormat и lang — они в deps.
  /* eslint-disable react-hooks/exhaustive-deps */
  const tiles = useMemo(() => [
    { id: 'saved' as const, icon: 'bookmark-outline' as const, title: copy.saved, count: fmt(savedCount), onPress: () => router.push({ pathname: '/flashcards_collection', params: { cat: 'saved', from: 'hub' } } as never) },
    { id: 'mine' as const, icon: 'layers-outline' as const, title: copy.mine, count: fmt(myPackCount ?? heldMineCount), onPress: () => router.push('/flashcards_my_packs' as never) },
    { id: 'video' as const, icon: 'play' as const, title: copy.videoShort, count: fmtPacks(videoPackCount), onPress: () => router.push('/flashcards_video_packs' as never) },
    { id: 'community' as const, icon: 'globe-outline' as const, title: copy.communitySegment, count: fmt(communityPackCount), onPress: () => router.push('/flashcards_packs' as never) },
  ], [copy, savedCount, myPackCount, heldMineCount, videoPackCount, communityPackCount, numberFormat, lang, router]);
  /* eslint-enable react-hooks/exhaustive-deps */
  const limitOutTitle = triLang(lang, { ru: 'Лимит на этот месяц исчерпан', uk: 'Ліміт на цей місяць вичерпано', en: 'This month’s limit is used up', es: 'Has agotado el límite de este mes', 'pt-BR': 'O limite deste mês acabou', vi: 'Đã hết lượt của tháng này', id: 'Batas bulan ini sudah habis', tr: 'Bu ayın limiti doldu', pl: 'Limit na ten miesiąc wyczerpany' });
  const limitOutSub = triLang(lang, { ru: `Обновится ${resetDate}`, uk: `Оновиться ${resetDate}`, en: `Resets on ${resetDate}`, es: `Se renueva el ${resetDate}`, 'pt-BR': `Renova em ${resetDate}`, vi: `Làm mới vào ${resetDate}`, id: `Diperbarui ${resetDate}`, tr: `${resetDate} tarihinde yenilenir`, pl: `Odnowi się ${resetDate}` });
  // зачем (C2): dev-подмена «hub_loading» не должна создавать новый массив плиток на каждый рендер
  const hubLoadingHeld = isDevCardsHeld('hub_loading');
  const hubTiles = useMemo(() => (hubLoadingHeld ? tiles.map((tile) => ({ ...tile, count: '' })) : tiles), [hubLoadingHeld, tiles]);
  const reduceMotion = useFcReduceMotion();
  // зачем (аудит скорости R1, C4, координатор 12.10): высоту окна читает сам CardsHubV2, корень не подписан на размеры окна/клавиатуры
  // зачем (Сверка cards-section-003, hubNewS): своих карточек и наборов нет (оба числа уже известны, не «загрузка») —
  // хаб новичка: «Начните с готового» и «Выбрать набор» ведёт в каталог сообщества. Раньше показывалась выдуманная «Boarding pass».
  const showFresh = savedCount === 0 && myPackCount === 0;
  // зачем (C2): объект `fresh` не должен меняться между рендерами без смены языка/показа
  const fresh = useMemo(() => showFresh
    ? {
      title: triLang(lang, { ru: 'Начни с готового', uk: 'Почни з готового', en: 'Start with a ready pack', es: 'Empieza con algo listo', 'pt-BR': 'Comece com algo pronto', vi: 'Bắt đầu với bộ có sẵn', id: 'Mulai dari yang siap pakai', tr: 'Hazır bir setle başla', pl: 'Zacznij od gotowego' }),
      sub: triLang(lang, { ru: 'Добавь набор из сообщества или из видео', uk: 'Додай набір зі спільноти або з відео', en: 'Add a pack from the community or from a video', es: 'Añade un pack de la comunidad o de un vídeo', 'pt-BR': 'Adicione um pacote da comunidade ou de um vídeo', vi: 'Thêm bộ thẻ từ cộng đồng hoặc từ video', id: 'Tambahkan paket dari komunitas atau dari video', tr: 'Topluluktan ya da videodan bir paket ekle', pl: 'Dodaj zestaw od społeczności lub z wideo' }),
      cta: triLang(lang, { ru: 'Выбрать набор', uk: 'Обрати набір', en: 'Choose a pack', es: 'Elegir un pack', 'pt-BR': 'Escolher um pacote', vi: 'Chọn bộ thẻ', id: 'Pilih paket', tr: 'Paket seç', pl: 'Wybierz zestaw' }),
      onPress: () => router.push('/flashcards_packs' as never),
    }
    : undefined, [showFresh, lang, router]);

  // зачем (C2): стабильные подписи и обработчики для memo(CardsHubV2). onTrainPress читает свежую квоту и флаги, поэтому берём её «последнюю» через ref —
  // ссылка на пропс onTrain при этом не меняется.
  const hubLabels = useMemo(() => ({ back: copy.back, create: copy.create, trainA11y: trainAccessibilityLabel }), [copy.back, copy.create, trainAccessibilityLabel]);
  const onTrainPressRef = useRef(onTrainPress);
  onTrainPressRef.current = onTrainPress;
  const handleHubBack = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);
  const handleHubTrain = useCallback(() => { pendingDeckRef.current = null; onTrainPressRef.current(); }, []);

  return (
    <View style={[styles.screen, { backgroundColor: g.bg }]}>
      {/* зачем: фон хаба как в макете — пятна цвета темы (один статичный слой), а не плоская заливка */}
      <V2Backdrop />
      <FeatureIntroEntry id="cards_hub_first_visit" enabled={accessResolved && !modeSheetVisible && openingPackId === null} />
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ContentWrap>
          <CardsHubV2
            g={g}
            title={copy.title}
            subtitle={copy.subtitleShort}
            limitLabel={limitLabel}
            // зачем (Сверка cards-section-004, hubLimitS): лимит исчерпан — верхняя карточка стопки говорит об этом и о дате обновления.
            topWord={trainingLocked ? limitOutTitle : (topCard?.en ?? 'Boarding pass')}
            topIpa={trainingLocked ? limitOutSub : (topCard ? topIpaText : '/ˈbɔːdɪŋ pɑːs/')}
            trainLabel={trainLabel}
            trainLocked={trainingLocked}
            tiles={hubTiles}
            reduceMotion={reduceMotion}
            verticalInsets={insets.top + insets.bottom}
            onBack={handleHubBack}
            onCreate={openCreatePack}
            onTrain={handleHubTrain}
            trainButtonRef={trainButtonRef}
            labels={hubLabels}
            fresh={fresh}
          />
        </ContentWrap>

        <FlashcardsTrainingModeSheet
          limitLabel={limitLabel}
          visible={modeSheetVisible}
          lang={lang}
          onClose={closeModeSheet}
          onDismissed={finishModeSheetDismissal}
          onSelect={chooseMode}
          preparing={earlyTap}
          onRetry={retryEarlyTap}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, minHeight: 0 },
});
