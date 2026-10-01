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
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { pluralWord } from '../constants/plural';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { actionToastTri, emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import { DebugLogger } from './debug-logger';
// зачем (владелец 01.10): «Из видео» берёт ГОТОВЫЕ наборы фраз роликов
// (video_phrase_sets) — те же, что открываются по тапу на фразу под роликом.
import {
  isVideoPhraseSetPackId,
  loadVideoPhraseSetPacks,
  peekVideoPhraseSetPacks,
  videoChannelIdOf,
  videoIdFromPackId,
} from './video_phrase_set_packs';
import { stageCommunityPackCardsForNavigation } from './community_packs/staging';
import {
  applyCommunityPacksFilter,
  communitySortIonicon,
  communitySortLabel,
  filterVideoPacks,
  type CommunityPacksSort,
} from './community_packs/communityCatalogFilter';
import type { FlashcardMarketPack } from './flashcards/marketplace';
import VideoPackRow from './flashcards/VideoPackRow';
import PackLanguagePicker from './flashcards/PackLanguagePicker';
import { defaultPackLanguageForStudyTarget, normalizePackLanguage, type PackLanguage } from './flashcards/pack_languages';
import { getStoredPackLanguage, peekStoredPackLanguage, setStoredPackLanguage, subscribePackLanguage } from './flashcards/pack_language_preferences';

function VideoGlass({ tint, edge }: { tint: string; edge: string }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <BlurView intensity={Platform.OS === 'android' ? 12 : 16} blurReductionFactor={3}
      experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
      tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
    <LinearGradient colors={[tint, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={{ height: 1, backgroundColor: edge }} />
  </View>;
}

const LOG = '[VIDEO-PACK]';

/**
 * Предел ожидания карточек при открытии набора.
 *
 * 6 секунд, а не секунда: внутри уже есть свой таймаут на сеть (1,5 с) и
 * офлайн-кэш, поэтому этот потолок — последний предохранитель от «висит
 * навсегда», а не способ обрывать нормальную загрузку.
 */
const OPEN_PACK_TIMEOUT_MS = 6000;

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

export default function FlashcardsVideoPacksScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const cloudEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const targetKey = String(studyTarget ?? 'default');

  /**
   * зачем тёплый снимок синхронно в начальном состоянии (тот же приём, что в хабе):
   * иначе первый кадр рисует спиннер, а следующий — готовый список, и человек
   * видит моргание. Кэш есть — решение известно сразу, ждать нечего.
   */
  const [catalogState, setCatalogState] = useState<VideoCatalogState>(() => {
    const packs = filterVideoPacks(peekVideoPhraseSetPacks() ?? []);
    return { targetKey, packs, loadState: packs.length > 0 ? 'ready' : 'loading' };
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
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const openingRef = useRef<string | null>(null);

  const copy = useMemo(() => ({
    title: triLang(lang, {
      ru: 'Из видео', uk: 'З відео', en: 'From videos', es: 'De los vídeos',
      'pt-BR': 'Dos vídeos', vi: 'Từ video', id: 'Dari video', tr: 'Videolardan', pl: 'Z filmów',
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
      ru: 'Попробуйте другое слово.', uk: 'Спробуйте інше слово.', en: 'Try another word.',
      es: 'Prueba otra palabra.', 'pt-BR': 'Tente outra palavra.', vi: 'Thử từ khác.',
      id: 'Coba kata lain.', tr: 'Başka bir kelime deneyin.', pl: 'Spróbuj innego słowa.',
    }),
    showAll: triLang(lang, {
      ru: 'Показать все', uk: 'Показати всі', en: 'Show all', es: 'Mostrar todos',
      'pt-BR': 'Mostrar todos', vi: 'Hiện tất cả', id: 'Tampilkan semua', tr: 'Tümünü göster', pl: 'Pokaż wszystkie',
    }),
    openFailed: {
      ru: 'Не удалось загрузить набор. Проверьте интернет и попробуйте ещё раз.',
      uk: 'Не вдалося завантажити набір. Перевірте інтернет і спробуйте ще раз.',
      es: 'No se pudo cargar el pack. Comprueba internet e inténtalo de nuevo.',
    },
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

  const retryCatalog = useCallback(() => {
    void hapticTap();
    retryTargetKeyRef.current = targetKey;
    setCatalogState((current) => transitionVideoCatalogState(current, targetKey, 'loading'));
    setReloadTick((n) => n + 1);
  }, [targetKey]);

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
    if (isVideoPhraseSetPackId(pack.id)) {
      const videoId = videoIdFromPackId(pack.id);
      const channelId = videoChannelIdOf(pack);
      DebugLogger.info(LOG, `открываю ролик с фразами: videoId=${videoId} channelId=${channelId || '—'}`);
      router.push({
        pathname: '/lingman_videos',
        params: channelId ? { videoId, channelId } : { videoId },
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
          stageCommunityPackCardsForNavigation(pack.id, studyTarget, pack),
        );
        if (openingRef.current !== pack.id) return;
        openingRef.current = null;
        setOpeningPackId(null);
        if (cards.length === 0) {
          DebugLogger.warn(LOG, `набор "${pack.id}" не открыт: staging вернул 0 карточек`);
          emitAppEvent('action_toast', actionToastTri('error', copy.openFailed));
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
        emitAppEvent('action_toast', actionToastTri('error', copy.openFailed));
      }
    })();
  }, [copy.openFailed, router, studyTarget]);

  const renderRow = useCallback(({ item }: { item: FlashcardMarketPack }) => (
    <VideoPackRow
      pack={item}
      lang={lang}
      t={t}
      opening={openingPackId === item.id}
      disabled={openingPackId !== null && openingPackId !== item.id}
      onOpen={openPack}
    />
  ), [lang, openingPackId, openPack, t]);

  const searching = query.trim().length > 0;
  // зачем (владелец 01.10: «этот экран больше никогда не должен быть пустым»; «ошибок не показываем»):
  // нет данных или сбой — держим места строк и тихо повторяем загрузку в фоне (до 5 раз по 20 с).
  // «Ничего не нашли» остаётся только как ответ на поиск пользователя.
  const waitingForCatalog = !searching && packs.length === 0 && (loadState === 'error' || loadState === 'ready' || loadState === 'loading');
  const silentRetryRef = useRef(0);
  useEffect(() => {
    if (!waitingForCatalog || loadState === 'loading') return undefined;
    if (silentRetryRef.current >= 5) {
      DebugLogger.warn(LOG, `каталог пуст после ${silentRetryRef.current} тихих повторов (loadState=${loadState}) — ждём данных Ядра`);
      return undefined;
    }
    const timer = setTimeout(() => {
      silentRetryRef.current += 1;
      DebugLogger.info(LOG, `тихий повтор каталога #${silentRetryRef.current} (loadState=${loadState})`);
      retryTargetKeyRef.current = targetKey;
      setReloadTick((n) => n + 1);
    }, 20_000);
    return () => clearTimeout(timer);
  }, [loadState, targetKey, waitingForCatalog]);
  const showEmpty = searching && visible.length === 0;
  const phraseTotal = visible.reduce((sum, pack) => sum + (Number(pack.cardCount) || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: g.bg }}>
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ContentWrap>
          <View style={styles.header}>
            <Pressable
              testID="fc-video-packs-back"
              accessibilityRole="button"
              accessibilityLabel={copy.back}
              hitSlop={8}
              onPress={() => safeRouterBack(router, '/flashcards' as never)}
              style={({ pressed }) => [styles.headerBtn, { backgroundColor: g.card, borderColor: g.glassEdge, opacity: pressed ? 0.78 : 1 }]}
            >
              <VideoGlass tint={g.selected} edge={g.glassEdge} />
              <Ionicons name="arrow-back" size={23} color={g.text} />
            </Pressable>
            {/* зачем распорка, а не заголовок рядом (владелец 2026-09-23, со
                скриншотом «Мои наборы»): кнопка языка стоит В ШАПКЕ СПРАВА, на
                одной линии со стрелкой «назад», а название раздела — ниже.
                Здесь повторена ровно та же раскладка, чтобы экраны не спорили. */}
            <View style={{ flex: 1 }} />
            <PackLanguagePicker lang={lang} t={t} value={packLanguage} onChange={handlePackLanguageChange} liquidGlass />
          </View>

          <Text
            accessibilityRole="header"
            style={[styles.screenTitle, { color: g.text }]}
          >
            {copy.title}
          </Text>
          {visible.length > 0 ? (
            <Text testID="fc-video-packs-summary" style={[styles.summary, { color: g.secondary }]}>
              {triLang(lang, {
                ru: `${visible.length} ${pluralWord(lang, visible.length, { one: 'набор', few: 'набора', many: 'наборов' })} · ${phraseTotal} ${pluralWord(lang, phraseTotal, { one: 'фраза', few: 'фразы', many: 'фраз' })}`,
                uk: `${visible.length} ${pluralWord(lang, visible.length, { one: 'набір', few: 'набори', many: 'наборів' })} · ${phraseTotal} ${pluralWord(lang, phraseTotal, { one: 'фраза', few: 'фрази', many: 'фраз' })}`,
                en: `${visible.length} packs · ${phraseTotal} phrases`,
                es: `${visible.length} paquetes · ${phraseTotal} frases`,
                'pt-BR': `${visible.length} pacotes · ${phraseTotal} frases`,
                vi: `${visible.length} bộ · ${phraseTotal} cụm từ`,
                id: `${visible.length} paket · ${phraseTotal} frasa`,
                tr: `${visible.length} paket · ${phraseTotal} ifade`,
                pl: `${visible.length} ${pluralWord(lang, visible.length, { one: 'zestaw', few: 'zestawy', many: 'zestawów' })} · ${phraseTotal} ${pluralWord(lang, phraseTotal, { one: 'fraza', few: 'frazy', many: 'fraz' })}`,
              })}
            </Text>
          ) : null}

          <View style={[styles.searchRow, { backgroundColor: g.card, borderColor: g.glassEdge }]}>
            <VideoGlass tint={g.selected} edge={g.glassEdge} />
            <Ionicons name="search" size={17} color={g.secondary} />
            <TextInput
              testID="fc-video-packs-search"
              value={query}
              onChangeText={setQuery}
              accessibilityLabel={copy.search}
              placeholder={copy.search}
              placeholderTextColor={g.secondary}
              style={[styles.searchInput, { color: g.text, fontSize: 15 }]}
              returnKeyType="search"
            />
          </View>

          <View style={styles.sorts}>
            {(['popular', 'new'] as const).map((option) => {
              const active = sort === option;
              return (
                <Pressable
                  key={option}
                  testID={`fc-video-packs-sort-${option}`}
                  accessibilityRole="button"
                  accessibilityLabel={communitySortLabel(option, lang)}
                  accessibilityState={{ selected: active }}
                  onPress={() => { void hapticTap(); setSort(option); }}
                  style={({ pressed }) => [
                    styles.sortBtn,
                    { backgroundColor: active ? g.selected : g.card, borderColor: g.glassEdge, opacity: pressed ? 0.78 : 1 },
                  ]}
                >
                  <VideoGlass tint={g.selected} edge={g.glassEdge} />
                  <Ionicons
                    name={communitySortIonicon(option, active) as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={active ? g.text : g.secondary}
                  />
                </Pressable>
              );
            })}
          </View>

          {waitingForCatalog ? (
            /**
             * Скелет, а не спиннер по центру: первый кадр обязан совпадать по
             * геометрии с готовым списком, иначе экран «прыгает», когда данные
             * приезжают (инвариант layout-stability проекта).
             */
            <View style={styles.listContent}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <View key={`sk${i}`} style={[styles.skeletonRow, { backgroundColor: g.card, borderColor: g.glassEdge }]}>
                  <VideoGlass tint={g.selected} edge={g.glassEdge} />
                  <View style={[styles.skeletonThumb, { backgroundColor: g.opaqueControl }]} />
                  <View style={styles.skeletonLines}>
                    <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: '82%' }]} />
                    <View style={[styles.skeletonLine, { backgroundColor: g.opaqueControl, width: '46%', marginTop: 9 }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : showEmpty ? (
            <View style={styles.center}>
              <View style={[styles.stateTile, { backgroundColor: g.opaqueControl }]}><Ionicons name={searching ? 'search' : 'play'} size={24} color={g.text} /></View>
              <Text style={[styles.stateTitle, { color: g.text, fontSize: 20 }]}>
                {copy.notFoundTitle}
              </Text>
              <Text style={[styles.stateBody, { color: g.secondary, fontSize: 15 }]}>
                {copy.notFoundBody}
              </Text>
              {searching ? (
                <Pressable
                  testID="fc-video-packs-clear-search"
                  accessibilityRole="button"
                  onPress={() => { void hapticTap(); setQuery(''); }}
                  style={({ pressed }) => [styles.stateAction, { backgroundColor: g.accent, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={{ color: g.accentInk, fontSize: 16, fontWeight: '600' }}>{copy.showAll}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <FlatList
              data={visible}
              keyExtractor={(item) => item.id}
              renderItem={renderRow}
              ItemSeparatorComponent={RowGap}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              /** Превью — картинки из сети; окно держим узким, чтобы список не грел телефон. */
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews
            />
          )}
        </ContentWrap>
      </SafeAreaView>
    </View>
  );
}

function RowGap() {
  return <View style={{ height: 8 }} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: 'transparent' },
  header: { minHeight: 60, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  screenTitle: { paddingHorizontal: 16, marginTop: 4, paddingBottom: 12, fontSize: 34, lineHeight: 40, fontWeight: '800' },
  summary: { paddingHorizontal: 16, marginTop: -4, paddingBottom: 12, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  searchRow: { marginHorizontal: 16, height: 46, borderWidth: 1, overflow: 'hidden', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13 },
  searchInput: { flex: 1, padding: 0, fontWeight: '600' },
  sorts: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  sortBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  /** Геометрия скелета = геометрия строки (87 / превью 112×63) — без прыжка. */
  skeletonRow: { minHeight: 87, borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  skeletonThumb: { width: 112, height: 63, borderRadius: 12 },
  skeletonLines: { flex: 1 },
  skeletonLine: { height: 13, borderRadius: 5 },
  stateTile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  stateTitle: { fontWeight: '700', textAlign: 'center' },
  stateBody: { marginTop: 8, textAlign: 'center', lineHeight: 20 },
  stateAction: { marginTop: 22, minHeight: 44, paddingHorizontal: 22, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
