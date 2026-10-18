/**
 * Раздел «Из видео» — наборы карточек, собранные из фраз роликов YouTube.
 *
 * зачем этот экран (владелец 2026-09-23): в разделе «Карточки» появилась
 * четвёртая строка библиотеки, и она ведёт сюда. Список — строками с кадром
 * ролика слева (владелец: «НАБОРЫ ИЗ ВИДЕО ХОЧУ ВИДЕТЬ СПИСКОМ С ПРЕВЬЮ СЛЕВА»,
 * затем «ПРЕВЬЮ НЕ КВАДРАТНОЕ И СПИСКИ НЕ ТАКИЕ ВЫСОКИЕ … КНОПКА ДОБАВИТЬ»).
 *
 * ДАННЫЕ И ОБЩИЕ МЕХАНИЗМЫ:
 *   • наборы читает `loadVideoMarketPacks`: у раздела отдельный запрос и кэш,
 *     чтобы видео-наборы не конкурировали за лимит общей витрины сообщества;
 *     отказ запроса без пригодного кэша доходит сюда как ошибка, а не как
 *     ложное «пока пусто»;
 *   • лайки и «Добавить себе» — `CommunityPackSocialBar`, с его оптимистичностью
 *     и защитой от гонок, написанной после бага «лайк не ставится»;
 *   • сортировка «Популярные/Новые» — `applyCommunityPacksFilter`;
 *   • открытие набора БЕЗ добавления себе — `?preview=1`, тот же путь, что у
 *     витрины хаба.
 *
 * Firestore читается при холодном входе в этот раздел; затем отдельный снимок
 * живёт по TTL загрузчика. Кнопки повтора нет: сеть обновляет данные молча.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LOAD_GATE_TOTAL_MS, loadGateBackoffMs } from './load_gate_config';
import {
  AppState,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useEffectiveStudyTarget } from './section_language';
import { videoIdFromOwnedCommunityId } from './flashcards/my_packs_video_meta';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { DebugLogger } from './debug-logger';
import { logNoErrorScreen } from './no_error_screen_log';
import { isDevCardsFail } from './dev_cards_state';
import { initialVideoCatalogLoadState, videoCatalogBranch, videoCatalogWaiting } from './video_packs_catalog_branch';
// зачем (владелец 01.10): «Из видео» берёт ГОТОВЫЕ наборы фраз роликов
// (video_phrase_sets) — те же, что открываются по тапу на фразу под роликом.
import {
  isVideoPhraseSetPackId,
  loadVideoPhraseSetPacks,
  peekVideoPhraseSetPacks,
  videoChannelIdOf,
  videoIdFromPackId,
} from './video_phrase_set_packs';
import { emitPackNotDownloadedToast, stageCommunityPackCardsWithSilentRetry } from './community_packs/stage_with_retry';
import {
  applyCommunityPacksFilter,
  communitySortIonicon,
  communitySortLabel,
  filterVideoPacks,
  type CommunityPacksSort,
} from './community_packs/communityCatalogFilter';
import type { FlashcardMarketPack } from './flashcards/marketplace';
import VideoPackRow from './flashcards/VideoPackRow';
import { KitEmpty, KitFound, KitSearchField } from '../components/cards-grid/CardsKit';
import { PackBackBare, PackScreenTitle, PackSquareButton, PackTopBarRow } from '../components/packs/PackScreenKit';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import { SheetRow } from '../components/mistakes-panel/PanelKit';
import { PanelSheet } from '../components/mistakes-panel/PanelSheet';
import PackLanguagePicker from './flashcards/PackLanguagePicker';
import { defaultPackLanguageForStudyTarget, normalizePackLanguage, type PackLanguage } from './flashcards/pack_languages';
import { getStoredPackLanguage, peekStoredPackLanguage, setStoredPackLanguage, subscribePackLanguage } from './flashcards/pack_language_preferences';

function VideoGlass({ tint, edge }: { tint: string; edge: string }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {/* зачем: владелец 18.10 — ореол текста от BlurView без blurTarget (на Android dimezis снимает экран вместе с текстом плашки
        и кладёт размытую копию под него). На Android живой блюр выключен, тон, градиент и кромка остаются; iOS как было. */}
    {Platform.OS !== 'android' ? (
      <BlurView intensity={16} blurReductionFactor={3} experimentalBlurMethod="none"
        tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
    ) : null}
    <LinearGradient colors={[tint, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={{ height: 1, backgroundColor: edge }} />
  </View>;
}

const LOG = '[VIDEO-PACK]';
/** зачем (журнал п.85(2)): одна цепочка «какая ветка экрана и почему» — пусто / загрузка / ошибка — одним поиском. */
const VIDEO_EMPTY_LOG = '[VIDEO-EMPTY]';

/**
 * Предел ожидания карточек при открытии набора.
 *
 * 6 секунд, а не секунда: внутри уже есть свой таймаут на сеть (1,5 с) и
 * офлайн-кэш, поэтому этот потолок — последний предохранитель от «висит
 * навсегда», а не способ обрывать нормальную загрузку.
 */
// зачем: внутри идут тихие повторы (до 3 попыток), потолку нужен запас.
const OPEN_PACK_TIMEOUT_MS = 12000;

export type VideoCatalogLoadState = 'loading' | 'ready' | 'error';

export type VideoCatalogState = {
  targetKey: string;
  packs: FlashcardMarketPack[];
  loadState: VideoCatalogLoadState;
};

type VideoCatalogTransition = 'target' | 'loading' | 'success' | 'error';

/**
 * Один снимок каталога всегда принадлежит ровно одному study target.
 * При переключении target старые строки скрываются уже на текущем рендере,
 * до запуска нового focus-effect и независимо от исхода нового запроса.
 */
export function transitionVideoCatalogState(
  current: VideoCatalogState,
  targetKey: string,
  transition: VideoCatalogTransition,
  nextPacks: FlashcardMarketPack[] = [],
): VideoCatalogState {
  if (transition === 'success') {
    return { targetKey, packs: nextPacks, loadState: 'ready' };
  }

  const packs = current.targetKey === targetKey ? current.packs : [];
  if (transition === 'target') {
    return current.targetKey === targetKey
      ? current
      : { targetKey, packs: [], loadState: 'loading' };
  }
  if (transition === 'loading') {
    return { targetKey, packs, loadState: 'loading' };
  }
  return packs.length > 0
    ? { targetKey, packs, loadState: 'ready' }
    : { targetKey, packs: [], loadState: 'error' };
}

/** Явный retry относится только к target, на котором человек нажал кнопку. */
export function consumeVideoCatalogRetryTarget(
  pendingTargetKey: string | null,
  activeTargetKey: string,
): { forceRemote: boolean; pendingTargetKey: null } {
  return {
    forceRemote: pendingTargetKey === activeTargetKey,
    pendingTargetKey: null,
  };
}

function withOpenTimeout<T extends unknown[]>(promise: Promise<T>): Promise<T | []> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      DebugLogger.warn(LOG, `открытие набора прервано по таймеру ${OPEN_PACK_TIMEOUT_MS} мс`);
      resolve([] as []);
    }, OPEN_PACK_TIMEOUT_MS);
    promise
      .then((value) => { clearTimeout(timer); resolve(value); })
      .catch((error: unknown) => {
        clearTimeout(timer);
        // Немой catch запрещён: отказ обязан оставить причину.
        DebugLogger.error(`${LOG}:stageCards`, error, 'warning');
        resolve([] as []);
      });
  });
}

export default function FlashcardsVideoPacksScreen({ embedded = false, bottomPad = 32 }: {
  /** зачем (владелец 11.10, video-redesign #c1): вкладка «Наборы» в «Видео» встраивает этот же список без шапки и поиска. */
  embedded?: boolean;
  /** Нижний отступ списка во встроенном режиме (под таб-бар). */
  bottomPad?: number;
} = {}) {
  const router = useRouter();
  // зачем (аудит Карточек 🟡, 15.10): нижний край отдельного экрана «Видео» не учитывал жестовую полосу — последняя карточка садилась под неё
  const standaloneInsets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { studyTarget: globalStudyTarget } = useStudyTarget();
  // зачем (владелец 15.10, Ревизор a9486a249): внутри раздела «Видео»/«Карточки» язык — локальный выбор раздела, иначе набор из ролика на es лёг бы в чужой язык
  const studyTarget = useEffectiveStudyTarget(globalStudyTarget);
  const { theme: t, liquidGlassThemeId, statusBarLight } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const cloudEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const targetKey = String(studyTarget ?? 'default');

  /**
   * зачем тёплый снимок синхронно в начальном состоянии (тот же приём, что в хабе):
   * иначе первый кадр рисует спиннер, а следующий — готовый список, и человек
   * видит моргание. Кэш есть — решение известно сразу, ждать нечего.
   */
  // зачем (владелец, журнал п.85(2)): память модуля знает ответ — в том числе ПУСТОЙ — значит «Пока пусто» показываем в первом же кадре, без скелета и без сети;
  // скелет — только когда ответа ещё не было вовсе (первая загрузка без кэша).
  const [catalogState, setCatalogState] = useState<VideoCatalogState>(() => {
    const peeked = peekVideoPhraseSetPacks();
    const packs = filterVideoPacks(peeked ?? []);
    const initial = initialVideoCatalogLoadState(peeked);
    DebugLogger.info(VIDEO_EMPTY_LOG, `старт: ответ в памяти=${peeked === null ? 'нет' : `да, наборов ${peeked.length}, из видео ${packs.length}`} → loadState=${initial.loadState} (источник=${initial.source})`);
    return { targetKey, packs, loadState: initial.loadState };
  });
  const activeCatalogState = transitionVideoCatalogState(catalogState, targetKey, 'target');
  const { packs, loadState } = activeCatalogState;
  const [reloadTick, setReloadTick] = useState(0);
  const retryTargetKeyRef = useRef<string | null>(null);
  /**
   * Языковой контур наборов — владелец просил его с первой постановки
   * («сразу можно выбрать языковой контур и он покажет наборы соответствующего
   * канала»). Это НЕ цель обучения: человек может учить испанский, но смотреть
   * наборы с английского канала.
   *
   * Берём синхронно из памяти модуля — иначе первый кадр показал бы наборы
   * одного языка, а следующий другого (моргание).
   */
  const [packLanguage, setPackLanguage] = useState<PackLanguage>(
    () => peekStoredPackLanguage() ?? defaultPackLanguageForStudyTarget(studyTarget),
  );
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CommunityPacksSort>('popular');
  const [menuOpen, setMenuOpen] = useState(false);
  // зачем (cards-v2 videoAll()): в макете только «назад» и заголовок — поиск открывается из меню «⋮», как у «Моих наборов».
  const [searchOpen, setSearchOpen] = useState(false);
  // зачем: части экрана рисуются токенами 2.0 (макет cards-section «Из видео»)
  const kg = useLv2Glass();
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const openingRef = useRef<string | null>(null);

  const copy = useMemo(() => ({
    // зачем (Сверка d1cdb9ac5, координатор 18.10): заголовок экрана — слово в слово как плитка хаба «Из видео»
    // (FlashcardsHubScreen.tsx tiles.video): в es/pt-BR было «De los vídeos»/«Dos vídeos» при плитке «De vídeos».
    title: triLang(lang, {
      ru: 'Из видео', uk: 'З відео', en: 'From videos', es: 'De vídeos',
      'pt-BR': 'De vídeos', vi: 'Từ video', id: 'Dari video', tr: 'Videolardan', pl: 'Z filmów',
    }),
    back: triLang(lang, {
      ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
      vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
    }),
    search: triLang(lang, {
      ru: 'Поиск по наборам', uk: 'Пошук наборів', en: 'Search packs', es: 'Buscar packs',
      'pt-BR': 'Buscar pacotes', vi: 'Tìm bộ thẻ', id: 'Cari paket', tr: 'Paket ara', pl: 'Szukaj zestawów',
    }),
    emptyTitle: triLang(lang, {
      ru: 'Пока пусто', uk: 'Поки порожньо', en: 'Nothing here yet', es: 'Aún no hay nada',
      'pt-BR': 'Ainda vazio', vi: 'Chưa có gì', id: 'Belum ada', tr: 'Henüz boş', pl: 'Na razie pusto',
    }),
    emptyBody: triLang(lang, {
      ru: 'Наборы из роликов появятся здесь, как только выйдут.',
      uk: 'Набори з роликів з’являться тут, щойно вийдуть.',
      en: 'Packs made from videos will show up here.',
      es: 'Los packs de los vídeos aparecerán aquí.',
      'pt-BR': 'Os pacotes dos vídeos aparecerão aqui.',
      vi: 'Các bộ thẻ từ video sẽ xuất hiện ở đây.',
      id: 'Paket dari video akan muncul di sini.',
      tr: 'Videolardan paketler burada görünecek.',
      pl: 'Zestawy z filmów pojawią się tutaj.',
    }),
    notFoundTitle: triLang(lang, {
      ru: 'Ничего не нашли', uk: 'Нічого не знайшли', en: 'Nothing found', es: 'No encontramos nada',
      'pt-BR': 'Nada encontrado', vi: 'Không tìm thấy', id: 'Tidak ditemukan', tr: 'Bulunamadı', pl: 'Nic nie znaleziono',
    }),
    notFoundBody: triLang(lang, {
      ru: 'Попробуй другое слово.', uk: 'Спробуй інше слово.', en: 'Try another word.',
      es: 'Prueba otra palabra.', 'pt-BR': 'Tente outra palavra.', vi: 'Thử từ khác.',
      id: 'Coba kata lain.', tr: 'Başka bir kelime deneyin.', pl: 'Spróbuj innego słowa.',
    }),
    showAll: triLang(lang, {
      ru: 'Показать все', uk: 'Показати всі', en: 'Show all', es: 'Mostrar todos',
      'pt-BR': 'Mostrar todos', vi: 'Hiện tất cả', id: 'Tampilkan semua', tr: 'Tümünü göster', pl: 'Pokaż wszystkie',
    }),
    searchOpenLabel: triLang(lang, {
      ru: 'Поиск', uk: 'Пошук', en: 'Search', es: 'Buscar', 'pt-BR': 'Buscar', vi: 'Tìm', id: 'Cari', tr: 'Ara', pl: 'Szukaj',
    }),
    language: triLang(lang, {
      ru: 'Язык наборов', uk: 'Мова наборів', en: 'Pack language', es: 'Idioma de los packs', 'pt-BR': 'Idioma dos pacotes', vi: 'Ngôn ngữ bộ thẻ', id: 'Bahasa paket', tr: 'Paket dili', pl: 'Język zestawów',
    }),
    menu: triLang(lang, {
      ru: 'Меню', uk: 'Меню', en: 'Menu', es: 'Menú', 'pt-BR': 'Menu', vi: 'Menu', id: 'Menu', tr: 'Menü', pl: 'Menu',
    }),
    found: triLang(lang, {
      ru: 'Найдено', uk: 'Знайдено', en: 'Found', es: 'Encontrado', 'pt-BR': 'Encontrado', vi: 'Tìm thấy', id: 'Ditemukan', tr: 'Bulundu', pl: 'Znaleziono',
    }),
    clear: triLang(lang, {
      ru: 'Очистить', uk: 'Очистити', en: 'Clear', es: 'Borrar', 'pt-BR': 'Limpar', vi: 'Xóa', id: 'Hapus', tr: 'Temizle', pl: 'Wyczyść',
    }),
  }), [lang]);

  /**
   * Выбор языка общий со всем разделом «Карточки»: подписываемся на него, чтобы
   * человек, переключивший язык в каталоге наборов, не переключал его тут снова.
   */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await getStoredPackLanguage().catch((error: unknown) => {
        // Немой catch запрещён: молча съеденный отказ = «язык не запоминается».
        DebugLogger.error(`${LOG}:getStoredPackLanguage`, error, 'warning');
        return null;
      });
      if (alive && stored) setPackLanguage(stored);
    })();
    const unsubscribe = subscribePackLanguage((next) => {
      if (alive) setPackLanguage(normalizePackLanguage(next));
    });
    return () => { alive = false; unsubscribe(); };
  }, []);

  /** Смена языка: экран реагирует мгновенно, запись на диск догоняет фоном. */
  const handlePackLanguageChange = useCallback((next: PackLanguage) => {
    setPackLanguage(next);
    void setStoredPackLanguage(next).catch((error: unknown) => {
      // Выбор уже применён на экране, но при следующем заходе сбросится —
      // причина обязана быть видна (немой catch запрещён).
      DebugLogger.error(`${LOG}:setStoredPackLanguage`, error, 'warning');
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void reloadTick;
      // зачем (Авторизация 12.10, съёмка R1 cards-030): «Сейчас недоступно» без отключения сети — dev `fail=video_list`, каталог не читается.
      // Пустой список: при кэше экран показал бы строки, а кадр — про отказ без кэша. В сторе isDevCardsFail всегда false.
      if (isDevCardsFail('video_list')) {
        DebugLogger.warn(LOG, '[DEV-STATE] каталог «Из видео»: подменённый отказ (fail=video_list), сеть не вызывалась');
        setCatalogState({ targetKey, packs: [], loadState: 'error' });
        return () => { cancelled = true; };
      }
      if (!cloudEnabled) {
        // зачем лог: без облака список пуст ВСЕГДА, и это надо отличать от
        // «сеть отвалилась» — иначе диагноз ищут не там.
        DebugLogger.warn(LOG, 'каталог не читается: облако выключено (Expo Go или CLOUD_SYNC_ENABLED=false)');
        setCatalogState((current) => ({
          ...transitionVideoCatalogState(current, targetKey, 'target'),
          loadState: 'ready',
        }));
        return () => { cancelled = true; };
      }
      const retry = consumeVideoCatalogRetryTarget(retryTargetKeyRef.current, targetKey);
      retryTargetKeyRef.current = retry.pendingTargetKey;
      const { forceRemote } = retry;
      void (async () => {
        const startedAt = Date.now();
        try {
          const catalog = await loadVideoPhraseSetPacks({ forceRemote });
          if (cancelled) return;
          const video = filterVideoPacks(catalog);
          DebugLogger.info(LOG, `каталог получен за ${Date.now() - startedAt} мс: документов ${catalog.length}, из видео ${video.length}`);
          setCatalogState((current) => transitionVideoCatalogState(current, targetKey, 'success', video));
        } catch (error) {
          if (cancelled) return;
          // зачем не немой catch: пустой экран без причины — это как раз тот
          // случай, когда баг живёт месяцами (правило «сперва логи»).
          DebugLogger.error(`${LOG}:loadCatalog`, error, 'warning');
          setCatalogState((current) => transitionVideoCatalogState(current, targetKey, 'error'));
        }
      })();
      return () => { cancelled = true; };
    }, [cloudEnabled, reloadTick, studyTarget, targetKey]),
  );

  /** Четвёртым аргументом идёт язык — тот же отбор, что в каталоге наборов. */
  const visible = useMemo(
    () => applyCommunityPacksFilter(packs, query, sort, packLanguage),
    [packs, query, sort, packLanguage],
  );

  const openPack = useCallback((pack: FlashcardMarketPack) => {
    // зачем защита от двойного тапа: без неё второй тап по соседнему набору
    // подменял бы staging первого, и открылся бы ЧУЖОЙ набор.
    if (openingRef.current) {
      DebugLogger.warn(LOG, `тап проигнорирован: уже открывается "${openingRef.current}"`);
      return;
    }
    // зачем: набор фраз ролика открывается так же, как по тапу на фразу —
    // экраном ролика с его фразами (lingman_videos по videoId), без staging.
    // зачем (Макеты 15.10: «Видео → Наборы», тап по строке ничего не открывал): набор ролика из каталога сообщества имеет id `video_<id>` (не `video:<id>`) и шёл в загрузку карточек документа —
    // документа нет, загрузка молча кончалась тостом. Любой набор ролика (оба вида id или поле videoId) открывается экраном ролика.
    const openAsVideoId = isVideoPhraseSetPackId(pack.id) ? videoIdFromPackId(pack.id) : (videoIdFromOwnedCommunityId(pack.id) ?? (typeof pack.videoId === 'string' && pack.videoId ? pack.videoId : null));
    if (openAsVideoId !== null) {
      const videoId = openAsVideoId;
      const channelId = videoChannelIdOf(pack);
      DebugLogger.info(LOG, `открываю ролик с фразами: videoId=${videoId} channelId=${channelId || '—'}`);
      // зачем (video-011, координатор 05.10): набор «Из видео» ведёт на экран ролика (плеер, набор, фразы), а не на ленту.
      router.push({
        pathname: '/lingman_video_watch',
        params: { videoId, ...(channelId ? { channelId } : {}), title: pack.videoTitle ?? '', source: 'video_packs' },
      } as never);
      return;
    }
    openingRef.current = pack.id;
    setOpeningPackId(pack.id);
    void (async () => {
      try {
        /**
         * Потолок ожидания обязателен (правило владельца: «любому await нужен
         * таймаут»). Без него зависший запрос оставил бы строку навсегда в
         * состоянии «открывается», и раздел выглядел бы сломанным — ровно так
         * уже вёл себя замок без предохранителя в Диалогах.
         */
        const cards = await withOpenTimeout(
          stageCommunityPackCardsWithSilentRetry(pack.id, studyTarget, pack, { isStillWanted: () => openingRef.current === pack.id, tag: 'video-packs' }),
        );
        if (openingRef.current !== pack.id) return;
        openingRef.current = null;
        setOpeningPackId(null);
        if (cards.length === 0) {
          DebugLogger.warn(LOG, `набор "${pack.id}" не открыт: staging вернул 0 карточек`);
          emitPackNotDownloadedToast();
          return;
        }
        /** `preview: '1'` — открыть БЕЗ добавления себе (решение владельца: тренировка без добавления). */
        router.push({
          pathname: '/flashcards_collection',
          params: { pack: pack.id, preview: '1', from: 'video' },
        } as never);
      } catch (error) {
        openingRef.current = null;
        setOpeningPackId(null);
        DebugLogger.error(`${LOG}:openPack:${pack.id}`, error, 'warning');
        emitPackNotDownloadedToast();
      }
    })();
  }, [router, studyTarget]);

  const renderRow = useCallback(({ item }: { item: FlashcardMarketPack }) => (
    <VideoPackRow
      pack={item}
      lang={lang}
      t={t}
      opening={openingPackId === item.id}
      disabled={openingPackId !== null && openingPackId !== item.id}
      onOpen={openPack}
      variant={embedded ? 'plain' : 'card'}
    />
  ), [embedded, lang, openingPackId, openPack, t]);

  const searching = query.trim().length > 0;
  // зачем (владелец 01.10: «этот экран больше никогда не должен быть пустым»; «ошибок не показываем»):
  // нет данных или сбой — держим места строк и тихо повторяем загрузку в фоне.
  // D158 / PM-214 (04.10): «тихо» ≠ «бесконечно». Было 5 повторов по 20 с, а зависшая загрузка
  // (loadState='loading') не имела потолка вовсе — скелет висел вечно. Теперь 3 повтора ~1/3/8 с
  // и потолок одной загрузки 12 с (app/load_gate_config.ts), затем спокойное «Сейчас недоступно» +
  // тихая «Попробовать снова»; при возврате в приложение повтор идёт сам.
  // «Ничего не нашли» остаётся только как ответ на поиск пользователя.
  // зачем (журнал п.85(2)): тихие повторы нужны ТОЛЬКО пока идёт загрузка или после сбоя. Пустой ответ (loadState='ready') — это ответ, а не ожидание:
  // раньше он гонял до трёх принудительных чтений Firestore и заканчивался «Сейчас недоступно».
  const waitingForCatalog = videoCatalogWaiting(loadState, packs.length, searching);
  const silentRetryRef = useRef(0);
  const [catalogExhausted, setCatalogExhausted] = useState(false);
  useEffect(() => {
    if (!waitingForCatalog) {
      silentRetryRef.current = 0;
      setCatalogExhausted(false);
      return undefined;
    }
    if (catalogExhausted) return undefined;
    const nextAttempt = silentRetryRef.current + 1;
    const backoffMs = loadGateBackoffMs(nextAttempt);
    if (loadState !== 'loading' && backoffMs === null) {
      DebugLogger.warn(LOG, `каталог пуст после ${silentRetryRef.current} тихих повторов (loadState=${loadState}) → тихое пустое состояние`);
      setCatalogExhausted(true);
      return undefined;
    }
    // Идёт загрузка — ждём потолок; сбой или пусто — ждём паузу бэкоффа.
    const delayMs = loadState === 'loading' ? LOAD_GATE_TOTAL_MS : (backoffMs as number);
    const timer = setTimeout(() => {
      if (backoffMs === null) {
        DebugLogger.warn(LOG, `загрузка каталога не ответила за ${LOAD_GATE_TOTAL_MS} мс после ${silentRetryRef.current} повторов → тихое пустое состояние`);
        setCatalogExhausted(true);
        return;
      }
      silentRetryRef.current = nextAttempt;
      DebugLogger.info(LOG, `тихий повтор каталога #${nextAttempt} (loadState=${loadState}, ждали ${delayMs} мс)`);
      retryTargetKeyRef.current = targetKey;
      // Повтор переводит экран в 'loading' — следующая пауза начнётся только после ответа (или потолка).
      setCatalogState((current) => transitionVideoCatalogState(current, targetKey, 'loading'));
      setReloadTick((n) => n + 1);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [catalogExhausted, loadState, targetKey, waitingForCatalog]);

  const retryCatalog = useCallback((source: 'tap' | 'foreground') => {
    DebugLogger.info(LOG, `повтор каталога после исчерпания ворот (${source})`);
    if (source === 'tap') void hapticTap();
    silentRetryRef.current = 0;
    setCatalogExhausted(false);
    retryTargetKeyRef.current = targetKey;
    setCatalogState((current) => transitionVideoCatalogState(current, targetKey, 'loading'));
    setReloadTick((n) => n + 1);
  }, [targetKey]);

  // D158: автоповтор при возврате в приложение, если повторы исчерпаны.
  useEffect(() => {
    if (!catalogExhausted) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryCatalog('foreground');
    });
    return () => sub.remove();
  }, [catalogExhausted, retryCatalog]);
  const { branch, reason: branchReason } = videoCatalogBranch({
    loadState,
    packsCount: packs.length,
    visibleCount: visible.length,
    searching,
    exhausted: catalogExhausted,
  });
  const showSearch = searchOpen || searching;
  // зачем (сперва логи): каждый переход ветки называет значения, которые её решили, — чтобы «пусто вместо списка» или «скелет вместо пусто» читались из журнала
  const lastBranchRef = useRef<string>('');
  useEffect(() => {
    const signature = `${branch}|${branchReason}|${loadState}|${packs.length}|${visible.length}|${packLanguage}`;
    if (lastBranchRef.current === signature) return;
    lastBranchRef.current = signature;
    DebugLogger.info(VIDEO_EMPTY_LOG, `ветка=${branch} причина=${branchReason} loadState=${loadState} наборов=${packs.length} видимых=${visible.length} поиск=${searching ? 'да' : 'нет'} язык=${packLanguage} исчерпано=${catalogExhausted ? 'да' : 'нет'} embedded=${embedded ? 'да' : 'нет'}`);
  }, [branch, branchReason, catalogExhausted, embedded, loadState, packLanguage, packs.length, searching, visible.length]);

  useEffect(() => {
    if (branch === 'error') logNoErrorScreen('flashcards_video_packs', branchReason, 'quiet_empty', { loadState });
  }, [branch, branchReason, loadState]);

  // зачем (video-redesign #c1, `.row + .row`): во вкладке строки разделяет тонкая линия, без карточек и зазоров.
  const rowSeparator = useMemo(
    () => (embedded ? function HairlineGap() { return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: g.line }} />; } : RowGap),
    [embedded, g.line],
  );
  const content = (
    <>
      {/* зачем (правило владельца 01.10 и 18.10, координатор 08:00: «экранов-ошибок нигде»): ветка 'error' («Сейчас недоступно / Проверь интернет / Попробовать снова») больше не рисуется — при сбое каталога показываем то же спокойное «Пока пусто», что и при пустом списке (ниже);
          повтор идёт сам (ворота каталога, при возврате в приложение), причина — [NO-ERROR-SCREEN] flashcards_video_packs. */}
      {branch === 'loading' ? (
                /**
                 * Скелет, а не спиннер по центру: первый кадр обязан совпадать по
                 * геометрии с готовым списком, иначе экран «прыгает», когда данные
                 * приезжают (инвариант layout-stability проекта).
                 */
                <View style={embedded ? [styles.listContent, styles.listContentEmbedded] : styles.listContent}>
                  {[0, 1, 2].map((i) => (
                    <View key={`sk${i}`} style={[styles.skeletonRow, { backgroundColor: g.hairlineSoft }]}>
                      <View style={[styles.skeletonThumb, { backgroundColor: g.opaqueControl }]} />
                      <View style={styles.skeletonLines}>
                        <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: '80%' }]} />
                        <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: '40%', marginTop: 10 }]} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : branch === 'empty' || branch === 'error' ? (
                // зачем (владелец, журнал п.85(2); макет cards-states «Наборы из видео — Пока пусто»): наборов из видео нет — спокойное «Пока пусто» вместо скелета и «Сейчас недоступно»; кнопки в макете нет
                <KitEmpty
                  g={kg}
                  testID="fc-video-packs-nothing-yet"
                  icon="play"
                  title={copy.emptyTitle}
                  detail={copy.emptyBody}
                  action=""
                  onAction={noop}
                  hideAction
                />
              ) : branch === 'not_found' ? (
                <KitEmpty
                  g={kg}
                  testID="fc-video-packs-empty"
                  icon="search"
                  title={copy.notFoundTitle}
                  detail={copy.notFoundBody}
                  action={copy.showAll}
                  onAction={() => { void hapticTap(); setQuery(''); }}
                  actionTestID="fc-video-packs-clear-search"
                />
              ) : (
                <FlatList
                  data={visible}
                  keyExtractor={(item) => item.id}
                  renderItem={renderRow}
                  ItemSeparatorComponent={rowSeparator}
                  contentContainerStyle={embedded ? [styles.listContent, styles.listContentEmbedded, { paddingBottom: bottomPad }] : [styles.listContent, { paddingBottom: 32 + standaloneInsets.bottom }]}
                  showsVerticalScrollIndicator={false}
                  /** Превью — картинки из сети; окно держим узким, чтобы список не грел телефон. */
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  windowSize={7}
                  removeClippedSubviews={false} decelerationRate="fast"
                />
              )}
    </>
  );
  // зачем: во вкладке «Наборы» видео нет своей шапки, поиска и «Назад» — только список (макет video-redesign #c1, экран 4).
  if (embedded) {
    return <View testID="video-packs-embedded" style={styles.embedded}>{content}</View>;
  }
  return (
    <View style={{ flex: 1, backgroundColor: g.bg }}>
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ContentWrap>
          <View style={styles.top}>
            <PackTopBarRow
              left={<PackBackBare g={kg} testID="mp-back" label={copy.back} onPress={() => safeRouterBack(router, '/flashcards' as never)} />}
              right={<PackSquareButton g={kg} testID="fc-video-packs-menu" label={copy.menu} onPress={() => setMenuOpen(true)} />}
            />
          </View>
          <View style={styles.headBlock}>
            {/* cards-v2 videoAll(): «Из видео 12» — заголовок 34/40 и приглушённое число роликов. */}
            <PackScreenTitle g={kg} title={copy.title} count={packs.length > 0 ? packs.length : null} testID="fc-video-packs-title" />
            {showSearch ? (
              <View style={styles.searchWrap}>
                <KitSearchField g={kg} value={query} onChangeText={setQuery} placeholder={copy.search} clearLabel={copy.clear} testID="fc-video-packs-search" />
              </View>
            ) : null}
            {searching && visible.length > 0 ? <KitFound g={kg} label={`${copy.found} · ${visible.length}`} /> : null}
          </View>

          {content}
        </ContentWrap>
        {/* зачем: сортировка «Популярные / Новые» в макете не нарисована, но нужна — живёт в меню «⋮» */}
        <PanelSheet visible={menuOpen} onClose={() => setMenuOpen(false)} testID="fc-video-packs-menu-sheet">
          <SheetRow g={kg} testID="fc-video-packs-menu-search" icon="search-outline" title={copy.searchOpenLabel} onPress={() => { void hapticTap(); setMenuOpen(false); setSearchOpen(true); }} />
          {(['popular', 'new'] as const).map((option) => (
            <SheetRow
              key={option}
              g={kg}
              testID={`fc-video-packs-sort-${option}`}
              icon={communitySortIonicon(option, sort === option) as keyof typeof Ionicons.glyphMap}
              title={`${communitySortLabel(option, lang)}${sort === option ? ' ✓' : ''}`}
              onPress={() => { void hapticTap(); setSort(option); setMenuOpen(false); }}
            />
          ))}
          <View style={styles.langRow}>
            <Text style={{ color: kg.secondary, fontSize: 16, lineHeight: 20 }}>{copy.language}</Text>
            <PackLanguagePicker lang={lang} t={t} value={packLanguage} onChange={handlePackLanguageChange} liquidGlass />
          </View>
        </PanelSheet>
      </SafeAreaView>
    </View>
  );
}

function noop() {}

function RowGap() {
  // зачем: зазор между карточками задаёт contentContainerStyle.gap (макет cards-section «Из видео»).
  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: 'transparent' },
  top: { marginTop: 6, paddingHorizontal: 20 },
  headBlock: { paddingHorizontal: 20 },
  langRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  searchWrap: { marginTop: 16 },
  // зачем (cards-v2 videoAll()): `margin-bottom: 22` между карточками роликов, 20 от заголовка.
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 22 },
  // зачем (video-redesign #c1, экран 4): во вкладке поля задаёт сам экран «Видео», строки без карточек — без зазора, разделяет линия.
  embedded: { flex: 1, minHeight: 0 },
  listContentEmbedded: { paddingHorizontal: 0, paddingTop: 4, gap: 0 },
  /** Геометрия скелета = геометрия строки (карточка 87, кадр 112×63) — без прыжка. */
  skeletonRow: { height: 87, borderRadius: 14, paddingVertical: 12, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonThumb: { width: 112, height: 63, borderRadius: 12 },
  skeletonLines: { flex: 1, paddingRight: 14 },
  skeletonLine: { height: 14, borderRadius: 5 },
});
