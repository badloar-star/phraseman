import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, InteractionManager, Linking, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { LOAD_GATE_TOTAL_MS, loadGateBackoffMs } from './load_gate_config';
import { useGlassAlert } from '../hooks/use-glass-alert'; // зачем: стеклянное окно вместо нативного Alert (overlays-runtime «video reminder»)
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import FeatureIntroEntry from '../components/feature_intro/FeatureIntroEntry';
import SkeletonBlock from '../components/SkeletonShimmer';
import HybridRefreshControl from '../components/feedback/HybridRefreshControl';
import YoutubeChannelHeader from '../components/youtube/YoutubeChannelHeader';
import YoutubeChannelPickerSheet from '../components/youtube/YoutubeChannelPickerSheet';
import StudyLanguageSheet from '../components/settings/StudyLanguageSheet';
import YoutubeChannelTabs, { type YoutubeChannelTab } from '../components/youtube/YoutubeChannelTabs';
import YoutubeInlinePlayer from '../components/youtube/YoutubeInlinePlayer';
import YoutubePlaylistGridCard from '../components/youtube/YoutubePlaylistGridCard';
import YoutubePremiereHero from '../components/youtube/YoutubePremiereHero';
import YoutubeVideoGridCard from '../components/youtube/YoutubeVideoGridCard';
import YoutubeVideoPhrases from '../components/youtube/YoutubeVideoPhrases';
import { normalizePackLanguage } from './flashcards/pack_languages';
import FlashcardsVideoPacksScreen from './flashcards_video_packs';
import { loadVideoPhraseSetPacks, peekVideoPhraseSetPacks } from './video_phrase_set_packs';
import { ALL_VIDEOS_PAGE_SIZE, useAllChannelVideos, type AllVideosItem } from './all_channel_videos_source';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import type { YoutubeCatalogManifest, YoutubeChannelSnapshot, YoutubePlaylistSnapshot, YoutubeVideoSnapshot } from '../shared/youtube_catalog_contract';
import { rememberYoutubeChannelMemorySnapshot, resolveYoutubeChannelSwitchView } from './youtube_channel_memory_cache';
import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { safeRouterBack } from './navigation_back';
import { useTabNav } from './TabContext';
import { useTabContentBottomPad } from '../hooks/use-tab-content-bottom-pad';
import { V2 } from '../constants/v2Style';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import { DebugLogger } from './debug-logger';
import { useVideoFavorites, useVideoSaveCounts } from '../hooks/use_video_favorites';
import { actionToastTri, emitAppEvent } from './events';
import { pluralWord } from '../constants/plural';
import {
  getActiveYoutubeChannel,
  getLingmanYoutubeSnapshot,
  getTrustedLingmanYoutubeUrl,
  LINGMAN_CHANNEL_DISPLAY_NAME,
  LINGMAN_CHANNEL_ID,
  markLingmanYoutubeCatalogSeen,
  markLingmanYoutubeSectionOpened,
  type LingmanYoutubeSnapshot,
  type LingmanYoutubeVideo,
} from './lingman_youtube';
import {
  beginLingmanSnapshotRequest,
  commitLingmanSnapshot,
  isLingmanSnapshotRequestCurrent,
  lingmanSnapshotCacheKey,
  patchLingmanUnread,
  readLingmanSnapshot,
} from './lingman_youtube_cache';
import {
  fetchYoutubeCatalogManifest,
  peekYoutubeCatalogScreenSnapshot,
  revalidateYoutubeChannelCatalog,
  type YoutubeCatalogScreenSnapshot,
} from './youtube_catalog_client';
import {
  getYoutubeChannelPreference,
  resolvePreferredYoutubeChannel,
  setYoutubeChannelPreference,
  type YoutubeChannelPreference,
} from './youtube_channel_preference';
import {
  openYoutubePremiereNotificationSettings,
  requestYoutubePremiereReminderFromTap,
} from './youtube_premiere_notifications';

// Stable child contract: YoutubeVideoGridCard renders testID="lingman-video-card".

function legacyChannelSnapshot(): YoutubeChannelSnapshot {
  const channel = getActiveYoutubeChannel();
  return {
    id: 'legacy', youtubeChannelId: channel.channelId, displayName: channel.displayName,
    handle: channel.handle, url: channel.url, languageTags: ['en'], order: 0,
    recentVideoIds: [], playlistIds: [],
  };
}

/** Элемент полного списка (без описания, ради компактного кэша) → снимок для карточки сетки. */
function toVideoSnapshot(item: AllVideosItem): YoutubeVideoSnapshot {
  return { ...item, description: '', playlistIds: [...item.playlistIds] };
}

function legacyVideoSnapshot(video: LingmanYoutubeVideo): YoutubeVideoSnapshot {
  return { ...video, channelId: 'legacy', state: 'video', playlistIds: [] };
}

export type LingmanVideosScreenProps = {
  /** 'tab' — центральная вкладка «Видео» (2.0, D39): без «назад», низ под таббаром. */
  presentation?: 'push' | 'tab';
};

export default function LingmanVideosScreen({ presentation = 'push' }: LingmanVideosScreenProps = {}) {
  const inTab = presentation === 'tab';
  const { runtimeOwnerId } = useTabNav();
  const tabContentBottomPad = useTabContentBottomPad();
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const { videoId: deepLinkedVideoId, channelId: deepLinkedChannelId, saved: savedParam } = useLocalSearchParams<{ videoId?: string; channelId?: string; saved?: string }>();
  // зачем (макет video-favorites, вариант A): плашка «Сохранённые видео» открывает этот же экран
  // в режиме списка сохранённых (без вкладок), чтобы не дублировать плеер, фразы и каталог.
  const savedOnly = !inTab && savedParam === '1';
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { liquidGlassThemeId } = useTheme();
  const { showGlassAlert, node: glassAlertNode } = useGlassAlert();
  const g = liquidGlassTokens(liquidGlassThemeId);
  // зачем: вкладка премаунтится в фоне — каталог и плеер живут, только пока «Видео» на экране.
  const screenRuntimeActive = useRuntimeActive(inTab ? runtimeOwnerId === 'video' : true);
  const screenRuntimeActiveRef = useRef(screenRuntimeActive);
  screenRuntimeActiveRef.current = screenRuntimeActive;
  const renderToken = captureAccountGeneration();
  const renderAccountScope = accountScopeKey(renderToken);
  // зачем (ревью TG-3BD963DD05D5, R2): первый кадр — канал ЯЗЫКА ОБУЧЕНИЯ. Сохранённый снимок один на аккаунт и мог
  // остаться от другого языка: тогда берём снимок нужного канала из памяти, а без него — шапку по манифесту и скелетон
  // ленты (геометрия итоговая, без спиннера на весь экран). Чужой канал под пилюлей нового языка не показываем.
  const [initialChannelView] = useState(() => {
    const peeked = peekYoutubeCatalogScreenSnapshot(renderToken);
    if (!peeked) return { catalog: null, pending: null };
    rememberYoutubeChannelMemorySnapshot(renderAccountScope, peeked);
    const routeChannel = deepLinkedChannelId && peeked.manifest.channels.some((item) => item.id === deepLinkedChannelId) ? deepLinkedChannelId : '';
    const targetChannelId = routeChannel || resolvePreferredYoutubeChannel(peeked.manifest, studyTarget, { mode: 'auto' }).channelId;
    const view = resolveYoutubeChannelSwitchView({ shown: peeked, manifest: peeked.manifest, targetChannelId, accountScope: renderAccountScope });
    if (__DEV__) console.log(`[VIDEO-LANG-PILL] first_frame studyTarget=${studyTarget} peeked=${peeked.channel.id} target=${targetChannelId} view=${view.kind}`);
    return view.kind === 'pending' ? { catalog: null, pending: view.channel } : { catalog: view.catalog, pending: null };
  });
  const initialCatalog = initialChannelView.catalog;
  const [catalog, setCatalog] = useState<YoutubeCatalogScreenSnapshot | null>(initialCatalog);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  // Шапка канала, каталог которого ещё не пришёл (смена языка без снимка в памяти); лента в это время — скелетон.
  const [pendingChannel, setPendingChannel] = useState<YoutubeChannelSnapshot | null>(initialChannelView.pending);
  // Последний известный манифест: каталог при смене канала сбрасывается, а манифест нужен для расчёта канала.
  const manifestRef = useRef<YoutubeCatalogManifest | null>(catalog?.manifest ?? null);
  // зачем (ревью R1): номер загрузки — поздний ответ прежнего языка (en→es→en) не затирает новый.
  const loadSeqRef = useRef(0);
  const [preference, setPreference] = useState<YoutubeChannelPreference>(() => getYoutubeChannelPreference(renderToken));
  const [tab, setTab] = useState<YoutubeChannelTab>('home');
  const [pickerVisible, setPickerVisible] = useState(false);
  // зачем (баг владельца 11.10): пилюля языка открывает шторку «Язык изучения» (PRF-23), а не язык интерфейса.
  const [studyLanguageSheetVisible, setStudyLanguageSheetVisible] = useState(false);
  const [loading, setLoading] = useState(!initialCatalog);
  const [refreshing, setRefreshing] = useState(false);
  const [issue, setIssue] = useState<'none' | 'offline' | 'error'>('none');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [expandedPhraseVideoId, setExpandedPhraseVideoId] = useState<string | null>(null);
  // зачем (Ядро 01.10): вход из «Из видео» с videoId — ролик сразу открывается и экран
  // прокручивается к нему (раньше только подсвечивался). Один раз на videoId.
  // зачем (FINAL_PHASE п.4, 61 ролик): список роликов виртуализирован — прокрутка к ролику
  // идёт по индексу в данных списка, а не по замеренному y карточки.
  const homeListRef = useRef<FlashListRef<YoutubeVideoSnapshot> | null>(null);
  const deepLinkHandledRef = useRef<string | null>(null);
  // зачем: «Напомнить» меняется на «Напоминание установлено» мгновенно (оптимистично), система догоняет.
  const [remindedIds, setRemindedIds] = useState<readonly string[]>([]);

  // RSS remains a rollback fallback while the new atomic catalog rolls out.
  const initialChannel = getActiveYoutubeChannel();
  const renderKey = lingmanSnapshotCacheKey(renderToken, initialChannel.channelId);
  const initialWarm = readLingmanSnapshot(renderToken, initialChannel.channelId);
  const [loadedKey, setLoadedKey] = useState<string | null>(() => renderKey);
  const [cachedSnapshot, setCachedSnapshot] = useState<LingmanYoutubeSnapshot | null>(() => initialWarm?.value ?? null);
  const [channel, setChannel] = useState(() => initialChannel);
  const currentRenderKey = lingmanSnapshotCacheKey(renderToken, channel.channelId);
  // зачем (ревью R2): пока грузится канал нового языка, старая RSS-лента (канал по умолчанию) тоже чужая — не показываем.
  const snapshot = !pendingChannel && loadedKey === currentRenderKey ? cachedSnapshot : null;
  const visibleLoading = loading || loadedKey !== currentRenderKey;

  const copy = useMemo(() => ({
    tabTitle: triLang(lang, { ru: 'Видео', uk: 'Відео', en: 'Videos', es: 'Videos', 'pt-BR': 'Vídeos', vi: 'Video', id: 'Video', tr: 'Videolar', pl: 'Filmy' }),
    error: triLang(lang, { ru: 'Не удалось поставить напоминание.', uk: 'Не вдалося встановити нагадування.', en: 'Could not set the reminder.', es: 'No se pudo activar el recordatorio.', 'pt-BR': 'Não foi possível definir o lembrete.', vi: 'Không thể đặt lời nhắc.', id: 'Pengingat tidak dapat dibuat.', tr: 'Hatırlatıcı ayarlanamadı.', pl: 'Nie udało się ustawić przypomnienia.' }),
    savedVideos: triLang(lang, { ru: 'Сохранённые видео', uk: 'Збережені відео', en: 'Saved videos', es: 'Vídeos guardados', 'pt-BR': 'Vídeos salvos', vi: 'Video đã lưu', id: 'Video tersimpan', tr: 'Kaydedilen videolar', pl: 'Zapisane filmy' }),
    // зачем (паритет с макетом video.html «Ошибка»): текст и кнопка как на кадре; «потянуть вниз» повторяет загрузку.
    catalogFailed: triLang(lang, { ru: 'Не удалось загрузить каталог. Потяни вниз, чтобы повторить.', uk: 'Не вдалося завантажити каталог. Потягни вниз, щоб повторити.', en: 'Couldn’t load the catalog. Pull down to retry.', es: 'No se pudo cargar el catálogo. Desliza hacia abajo para reintentar.', 'pt-BR': 'Não foi possível carregar o catálogo. Puxe para baixo para tentar de novo.', vi: 'Không tải được danh mục. Kéo xuống để thử lại.', id: 'Katalog gagal dimuat. Tarik ke bawah untuk mengulang.', tr: 'Katalog yüklenemedi. Tekrar denemek için aşağı çek.', pl: 'Nie udało się wczytać katalogu. Pociągnij w dół, aby ponowić.' }),
    retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Repetir', vi: 'Thử lại', id: 'Ulangi', tr: 'Tekrar dene', pl: 'Ponów' }),
    unavailable: triLang(lang, { ru: 'Сейчас недоступно', uk: 'Зараз недоступно', en: 'Not available right now', es: 'No disponible ahora', 'pt-BR': 'Indisponível agora', vi: 'Hiện chưa khả dụng', id: 'Belum tersedia sekarang', tr: 'Şu anda kullanılamıyor', pl: 'Teraz niedostępne' }),
    tryAgain: triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати ще', en: 'Try again', es: 'Intentar de nuevo', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' }),
    reminderSet: triLang(lang, { ru: 'Напоминание установлено', uk: 'Нагадування встановлено', en: 'Reminder set', es: 'Recordatorio activado', 'pt-BR': 'Lembrete definido', vi: 'Đã đặt lời nhắc', id: 'Pengingat dibuat', tr: 'Hatırlatıcı ayarlandı', pl: 'Ustawiono przypomnienie' }),
  }), [lang]);

  const loadLegacyFallback = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    const token = captureAccountGeneration();
    if (accountScopeKey(token) !== renderAccountScope) return;
    const activeChannel = getActiveYoutubeChannel();
    const requestKey = lingmanSnapshotCacheKey(token, activeChannel.channelId);
    const warm = readLingmanSnapshot(token, activeChannel.channelId);
    const request = beginLingmanSnapshotRequest(token, activeChannel.channelId);
    setChannel(activeChannel);
    if (warm) { setLoadedKey(requestKey); setCachedSnapshot(warm.value); }
    if (warm?.isFresh && mode !== 'refresh' && warm.value.unreadCount > 0) {
      const latestVideoId = warm.value.latestVideoId ?? warm.value.videos[0]?.id ?? null;
      const openedSnapshot = { ...warm.value, unreadCount: 0 };
      if (commitLingmanSnapshot(request, openedSnapshot)) {
        void markLingmanYoutubeCatalogSeen(latestVideoId);
        setCachedSnapshot(openedSnapshot);
      }
      return;
    }
    try {
      const next = await getLingmanYoutubeSnapshot();
      const latestVideoId = next.latestVideoId ?? next.videos[0]?.id ?? null;
      if (next.unreadCount > 0) void markLingmanYoutubeCatalogSeen(latestVideoId);
      const openedSnapshot = { ...next, unreadCount: 0 };
      if (commitLingmanSnapshot(request, openedSnapshot)) {
        const committed = readLingmanSnapshot(token, activeChannel.channelId);
        setLoadedKey(requestKey);
        setCachedSnapshot(committed?.value ?? next);
      }
    } finally {
      if (isLingmanSnapshotRequestCurrent(request)) setLoading(false);
    }
  }, [renderAccountScope]);

  // зачем: каталог YouTube — публичный контент, одинаковый для всех. Он обязан
  // показываться в любом сценарии: и до авторизации, и после. Раньше загрузка
  // отменялась, пока личность не активна, и экран навсегда оставался пустым.
  const loadCatalog = useCallback(async (requestedChannelId?: string, refresh = false) => {
    if (!screenRuntimeActiveRef.current) {
      if (__DEV__) console.log(`[VIDEO-LANG-PILL] channel_load_skipped reason=screen_inactive studyTarget=${studyTarget}`);
      return;
    }
    const token = captureAccountGeneration();
    const tokenScope = accountScopeKey(token);
    if (tokenScope && renderAccountScope && tokenScope !== renderAccountScope) {
      console.warn(`[VIDEO-LANG-PILL] channel_load_skipped reason=account_scope_changed studyTarget=${studyTarget}`);
      return;
    }
    // зачем (ревью TG-3BD963DD05D5, R1): каждая загрузка получает номер; ответ, пришедший после более новой
    // загрузки (смена языка en→es→en), не попадает ни в состояние, ни в кэш — иначе под пилюлей EN рисовался канал ES.
    const seq = ++loadSeqRef.current;
    const isCurrentLoad = () => seq === loadSeqRef.current;
    const logStale = (step: string, channelId: string) => {
      if (__DEV__) console.log(`[VIDEO-LANG-PILL] channel_load_stale seq=${seq} latest=${loadSeqRef.current} step=${step} channelId=${channelId || '-'}`);
    };
    if (refresh) setRefreshing(true); else if (!catalogRef.current) setLoading(true);
    let channelId = '';
    let switchingToUncachedChannel = false;
    try {
      const manifestFrom = catalogRef.current?.manifest ? 'catalog' : manifestRef.current ? 'memory' : 'network';
      const manifest = catalogRef.current?.manifest ?? manifestRef.current ?? await fetchYoutubeCatalogManifest();
      if (!isCurrentLoad()) { logStale('manifest', ''); return; }
      manifestRef.current = manifest;
      // зачем (владелец 01.10): канал = контур языка обучения; ручной выбор канала не применяется.
      const currentPreference: YoutubeChannelPreference = { mode: 'auto' };
      const resolution = resolvePreferredYoutubeChannel(manifest, studyTarget, currentPreference);
      if (__DEV__) console.log(`[VIDEO-LANG-PILL] channel_resolved seq=${seq} studyTarget=${studyTarget} resolution=${JSON.stringify(resolution)} requested=${requestedChannelId ?? '-'} deepLink=${deepLinkedChannelId ?? '-'} manifestFrom=${manifestFrom} refresh=${refresh}`);
      if (resolution.clearedInvalidManual) {
        await setYoutubeChannelPreference({ mode: 'auto' }, token);
        if (!isCurrentLoad()) { logStale('preference', ''); return; }
        setPreference({ mode: 'auto' });
      }
      const routeChannel = deepLinkedChannelId && manifest.channels.some((item) => item.id === deepLinkedChannelId) ? deepLinkedChannelId : '';
      channelId = requestedChannelId || routeChannel || resolution.channelId;
      // зачем (ревью R2): канал сменился — показываем его снимок из памяти сразу; без снимка — шапку по манифесту и
      // скелетон ленты, а не каталог прежнего языка. Снимок из памяти уходит в revalidate как previous: при той же
      // версии каталога это одно чтение манифеста вместо ~154.
      const view = resolveYoutubeChannelSwitchView({ shown: catalogRef.current, manifest, targetChannelId: channelId, accountScope: tokenScope });
      if (view.kind === 'cache') {
        catalogRef.current = view.catalog;
        setCatalog(view.catalog);
        setPendingChannel(null);
        setLoading(false);
      } else if (view.kind === 'pending') {
        switchingToUncachedChannel = true;
        catalogRef.current = null;
        setCatalog(null);
        setPendingChannel(view.channel);
        setLoading(true);
      }
      const previous = view.kind === 'pending' ? null : view.catalog;
      if (__DEV__) console.log(`[VIDEO-LANG-PILL] channel_load seq=${seq} channelId=${channelId} source=${requestedChannelId ? 'requested' : routeChannel ? 'deepLink' : 'resolution'} view=${view.kind} previousVersion=${previous?.version ?? '-'}`);
      const next = await revalidateYoutubeChannelCatalog({ channelId, token, previous, isCurrent: isCurrentLoad, commit: (value) => {
        if (!isCurrentLoad()) { logStale('commit', channelId); return; }
        catalogRef.current = value;
        setCatalog(value);
        setPendingChannel(null);
        rememberYoutubeChannelMemorySnapshot(tokenScope, value);
      } });
      if (!isCurrentLoad()) { logStale('revalidate', channelId); return; }
      if (next) {
        catalogRef.current = next;
        setCatalog(next);
        setPendingChannel(null);
        rememberYoutubeChannelMemorySnapshot(tokenScope, next);
        setIssue('none');
        if (__DEV__) console.log(`[VIDEO-LANG-PILL] channel_shown seq=${seq} channelId=${next.channel.id} version=${next.version} videos=${next.videos.length}`);
        void markLingmanYoutubeSectionOpened();
      } else if (__DEV__) {
        console.log(`[VIDEO-LANG-PILL] channel_load_empty seq=${seq} channelId=${channelId} reason=account_switched_or_dropped`);
      }
    } catch (error) {
      if (!isCurrentLoad()) { logStale('error', channelId); return; }
      DebugLogger.error('[VIDEO-TAB]:loadCatalog', error, 'warning');
      setIssue(catalogRef.current ? 'offline' : 'error');
      if (switchingToUncachedChannel) {
        // зачем (ревью R2): RSS-запасной вариант — лента канала по умолчанию, то есть чужого языка. При смене языка
        // экран остаётся на скелетоне, тихие повторы и «Сейчас недоступно» ведёт обычный цикл (nothingToShow).
        console.warn(`[VIDEO-LANG-PILL] channel_load_failed seq=${seq} channelId=${channelId} → без RSS-ленты чужого канала, тихий повтор`);
        return;
      }
      if (!catalogRef.current) await loadLegacyFallback().catch((fallbackError: unknown) => { DebugLogger.error('[VIDEO-TAB]:legacyFallback', fallbackError, 'warning'); });
    } finally {
      // Скелетоны обязаны сняться и тогда, когда личность активировалась прямо
      // во время загрузки: иначе экран навсегда застывал бы на заглушках.
      // Устаревшая загрузка флаги не трогает — их снимет текущая.
      const settledScope = accountScopeKey(captureAccountGeneration());
      if (isCurrentLoad() && (!renderAccountScope || settledScope === renderAccountScope)) {
        setLoading(false); setRefreshing(false);
      }
    }
  }, [deepLinkedChannelId, loadLegacyFallback, renderAccountScope, studyTarget]);

  useEffect(() => {
    if (!screenRuntimeActive) return;
    void loadCatalog();
  }, [loadCatalog, screenRuntimeActive]);

  // зачем (баг владельца 11.10): язык обучения сменили из шторки пилюли — канал другой, поэтому открытый ролик,
  // раскрытые фразы и вкладка канала прежнего языка сбрасываются (как при смене канала в selectPreference).
  // Сам каталог перезагружает эффект выше: loadCatalog зависит от studyTarget.
  const shownStudyTargetRef = useRef(studyTarget);
  useEffect(() => {
    const previousTarget = shownStudyTargetRef.current;
    if (previousTarget === studyTarget) return;
    shownStudyTargetRef.current = studyTarget;
    if (__DEV__) console.log(`[VIDEO-LANG-PILL] study_target_changed from=${previousTarget} to=${studyTarget} source=StudyTargetContext(STUDY_TARGET_CHANGED→storage) → сброс ролика/вкладки, каталог перезагрузится`);
    setActiveVideoId(null);
    setExpandedPhraseVideoId(null);
    setTab('home');
  }, [studyTarget]);

  // зачем (владелец 01.10): вместо экрана ошибки — тихий повтор, пока каталога нет совсем.
  // D158 / PM-214 (04.10): «тихо» ≠ «бесконечно». Было 5 повторов по 20 с и затем вечные скелетоны,
  // а зависшая загрузка не имела потолка. Теперь потолок 12 с, 3 повтора ~1/3/8 с
  // (app/load_gate_config.ts), затем «Сейчас недоступно» + тихая «Попробовать снова»;
  // при возврате в приложение повтор идёт сам. Кэш/снимок, если есть, показываются как раньше.
  const catalogRetryRef = useRef(0);
  const [catalogExhausted, setCatalogExhausted] = useState(false);
  const nothingToShow = !catalog && !snapshot;
  useEffect(() => {
    if (!nothingToShow) { catalogRetryRef.current = 0; setCatalogExhausted(false); }
  }, [nothingToShow]);
  useEffect(() => {
    if (issue !== 'error' || !nothingToShow || !screenRuntimeActive || catalogExhausted) return;
    const backoffMs = loadGateBackoffMs(catalogRetryRef.current + 1);
    if (backoffMs === null) {
      console.warn('[VIDEO-TAB] тихие повторы каталога исчерпаны → «Сейчас недоступно»', { attempts: catalogRetryRef.current });
      setCatalogExhausted(true);
      return;
    }
    const timer = setTimeout(() => {
      catalogRetryRef.current += 1;
      console.warn('[VIDEO-TAB] тихий повтор каталога', { attempt: catalogRetryRef.current, backoffMs });
      void loadCatalog();
    }, backoffMs);
    return () => clearTimeout(timer);
  }, [issue, nothingToShow, screenRuntimeActive, loadCatalog, catalogExhausted]);
  // D158: загрузка, не ответившая ни каталогом, ни ошибкой, не держит скелетоны вечно.
  useEffect(() => {
    if (!visibleLoading || !nothingToShow || !screenRuntimeActive || catalogExhausted) return;
    const timer = setTimeout(() => {
      console.warn('[VIDEO-TAB] watchdog: каталог не ответил за потолок → цикл тихих повторов', { ceilingMs: LOAD_GATE_TOTAL_MS });
      setIssue('error');
      setLoading(false);
    }, LOAD_GATE_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [visibleLoading, nothingToShow, screenRuntimeActive, catalogExhausted]);
  const retryCatalogAfterUnavailable = useCallback((source: 'tap' | 'foreground') => {
    console.warn('[VIDEO-TAB] повтор после «Сейчас недоступно»', { source });
    if (source === 'tap') hapticTap();
    catalogRetryRef.current = 0;
    setCatalogExhausted(false);
    setIssue('none');
    void loadCatalog();
  }, [loadCatalog]);
  useEffect(() => {
    if (!catalogExhausted) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryCatalogAfterUnavailable('foreground');
    });
    return () => sub.remove();
  }, [catalogExhausted, retryCatalogAfterUnavailable]);

  // зачем: экран мог открыться раньше, чем приложение опознало пользователя.
  // Каталог грузится и без этого, но после активации личности перезапрашиваем —
  // теперь снапшот ляжет в аккаунт-скоупный кэш и переживёт следующий заход.
  useEffect(() => {
    const subscription = subscribeAccountGeneration(() => {
      if (screenRuntimeActiveRef.current) void loadCatalog();
    });
    return () => subscription.remove();
  }, [loadCatalog]);

  const selectPreference = async (nextPreference: YoutubeChannelPreference) => {
    const token = captureAccountGeneration();
    await setYoutubeChannelPreference(nextPreference, token);
    setPreference(nextPreference);
    setPickerVisible(false);
    setActiveVideoId(null);
    setExpandedPhraseVideoId(null);
    const manifest = catalogRef.current?.manifest;
    if (!manifest) return;
    const channelId = resolvePreferredYoutubeChannel(manifest, studyTarget, nextPreference).channelId;
    setTab('home');
    await loadCatalog(channelId, true);
  };

  const openExternalUrl = (rawUrl: string, fallbackVideoId?: string) => {
    const trustedUrl = getTrustedLingmanYoutubeUrl(rawUrl, fallbackVideoId);
    if (!trustedUrl) return;
    hapticTap();
    void Linking.openURL(trustedUrl);
  };

  // зачем (владелец, журнал 14 + макет video-redesign #c1): Главная показывает ВСЕ ролики канала (до 100), а не только последние 20 снимка.
  // Источник — app/all_channel_videos_source.ts (Ядро): первый кадр — снимок экрана, полный список догружается фоном (сеть не чаще раза в 6 ч,
  // почти всегда 0 чтений Firestore). Пока полного списка нет, всё работает на снимке, как раньше.
  const allChannel = useAllChannelVideos(catalog?.channel.id ?? pendingChannel?.id ?? '', undefined, catalog);
  const fullVideos = useMemo(
    () => (allChannel.status === 'ready' ? allChannel.items.map(toVideoSnapshot) : null),
    [allChannel.status, allChannel.items],
  );
  const [pages, setPages] = useState(1);
  useEffect(() => { setPages(1); }, [catalog?.channel.id]);
  const allVideos = fullVideos ?? catalog?.videos ?? snapshot?.videos.map(legacyVideoSnapshot) ?? [];
  const favorites = useVideoFavorites();
  // зачем (Firebase-экономия): счётчики сохранений читаем только для показанных страниц, а не для всех 100 роликов.
  const shownVideoIds = useMemo(() => allVideos.slice(0, pages * ALL_VIDEOS_PAGE_SIZE).map((video) => video.id), [allVideos, pages]);
  const saveCountOf = useVideoSaveCounts(shownVideoIds, favorites.state);
  const savedVideos = useMemo(() => {
    const byId = new Map(allVideos.map((video) => [video.id, video] as const));
    return favorites.savedIds.map((id) => byId.get(id)).filter((video): video is YoutubeVideoSnapshot => !!video);
  }, [allVideos, favorites.savedIds]);
  // Optimistic: вид меняется сразу (стор публикует локально), отказ сети — стор откатывает, тут тост.
  const toggleSave = useCallback((videoId: string) => {
    void favorites.toggle(videoId).then((outcome) => {
      if (outcome === 'ok') return;
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось сохранить, попробуй ещё раз', uk: 'Не вдалося зберегти, спробуй ще раз', en: 'Couldn’t save, please try again',
        es: 'No se pudo guardar, inténtalo de nuevo', 'pt-BR': 'Não foi possível salvar, tente de novo', vi: 'Không lưu được, hãy thử lại',
        id: 'Gagal menyimpan, coba lagi', tr: 'Kaydedilemedi, tekrar dene', pl: 'Nie udało się zapisać, spróbuj ponownie',
      }));
    });
  }, [favorites]);
  const openVideo = (video: YoutubeVideoSnapshot) => {
    // зачем (правило владельца): хаптик только на управляющих кнопках — тап по плитке/строке без вибрации.
    if (!catalog && snapshot) {
      const videoIndex = allVideos.findIndex((item) => item.id === video.id);
      const unreadCount = snapshot.unreadCount ?? 0;
      const nextUnread = Math.min(unreadCount, Math.max(0, videoIndex));
      const seenToken = captureAccountGeneration();
      patchLingmanUnread(seenToken, channel.channelId, nextUnread);
      setCachedSnapshot((current) => current ? { ...current, unreadCount: nextUnread } : current);
      // зачем (аудит Optimistic UI, 04.10): бейдж «новые» гаснет сразу, а запись «просмотрено» могла упасть без следа — тогда экран
      // и хранилище расходились до следующего обновления. Теперь при отказе бейдж возвращается и причина идёт в лог.
      markLingmanYoutubeCatalogSeen(video.id).catch((error: unknown) => {
        DebugLogger.error('[VIDEO-TAB]:markSeen', error, 'warning');
        patchLingmanUnread(seenToken, channel.channelId, unreadCount);
        setCachedSnapshot((current) => current ? { ...current, unreadCount } : current);
      });
    }
    // зачем (владелец 11.10, video-redesign #c1): ролик в сетке открывается экраном ролика (плеер, фразы, «Добавить набор
    // себе»), как из плейлиста. Встроенным плеером остаётся только премьера в шапке вкладки.
    const activeEvent = catalog?.activeEvent;
    const isHeroVideo = !!activeEvent && activeEvent.id === video.id && (activeEvent.state === 'upcoming' || activeEvent.state === 'live');
    if (!isHeroVideo) {
      console.warn('[VIDEO-SCREEN] navigate', JSON.stringify({ source: 'home_grid', videoId: video.id })); // guard-ok: вход на экран ролика логируется
      router.push({ pathname: '/lingman_video_watch', params: { videoId: video.id, channelId: catalog?.channel.id ?? channel.channelId, title: video.title, source: 'home_grid' } } as never);
      return;
    }
    // Ровно один videoId хранится в состоянии: смена id размонтирует прежний
    // WebView до создания следующего, поэтому параллельного воспроизведения нет.
    setActiveVideoId(video.id);
  };

  // зачем: строки сетки мемоизированы и не должны держать устаревший openVideo (он читает каталог/снимок текущего кадра).
  const openVideoRef = useRef(openVideo);
  openVideoRef.current = openVideo;
  const closeVideo = useCallback(() => setActiveVideoId(null), []);
  useEffect(() => {
    const target = typeof deepLinkedVideoId === 'string' ? deepLinkedVideoId : null;
    if (!target || deepLinkHandledRef.current === target) return;
    if (!allVideos.some((video) => video.id === target)) {
      console.log('[VIDEO-TAB] deeplink: ролика ещё нет в каталоге — ждём', JSON.stringify({ target, videos: allVideos.length }));
      return;
    }
    deepLinkHandledRef.current = target;
    // зачем (video-011, координатор 05.10: «старый маршрут lingman_videos?videoId — редирект, ссылки не ломать»): обычный
    // ролик открывается экраном ролика; премьера остаётся встроенной в шапке вкладки. hero здесь не читаем — он объявлен
    // ниже по рендеру, считаем по каталогу.
    const activeEvent = catalog?.activeEvent;
    const isHeroTarget = !!activeEvent && activeEvent.id === target && (activeEvent.state === 'upcoming' || activeEvent.state === 'live');
    if (!isHeroTarget) {
      const video = allVideos.find((item) => item.id === target);
      console.warn('[VIDEO-SCREEN] navigate', JSON.stringify({ source: 'deeplink_redirect', videoId: target })); // guard-ok: редирект логируется
      router.push({ pathname: '/lingman_video_watch', params: { videoId: target, channelId: catalog?.channel.id ?? channel.channelId, title: video?.title ?? '', source: 'deeplink_redirect' } } as never);
      return;
    }
    console.log('[VIDEO-TAB] deeplink: открываю ролик', JSON.stringify({ target }));
    setTab('home');
    setActiveVideoId(target);
    // Список монтируется на следующем кадре после смены вкладки — прокрутка после него.
    requestAnimationFrame(() => scrollToDeepLinked(target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVideos, deepLinkedVideoId]);
  const changeTab = useCallback((nextTab: YoutubeChannelTab) => {
    setActiveVideoId(null);
    setExpandedPhraseVideoId(null);
    setTab(nextTab);
  }, []);

  // зачем (правило владельца «каждый раздел открывается мгновенно», Сверка 11.10: вкладка «Наборы» в первый раз показывала скелетон):
  // после первого кадра тихо греем список «Наборы из видео»; загрузчик сам держит кэш по TTL, холодный вход во вкладку — уже из памяти.
  useEffect(() => {
    if (!inTab || !screenRuntimeActive) return undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      if (peekVideoPhraseSetPacks()) return;
      loadVideoPhraseSetPacks().catch((error: unknown) => {
        DebugLogger.error('[VIDEO-TAB]:warmPacks', error, 'warning');
      });
    });
    return () => task.cancel();
  }, [inTab, screenRuntimeActive]);

  const openPlaylist = (playlistId: string) => router.push({ pathname: '/lingman_playlist', params: { playlistId, channelId: catalog?.channel.id } } as any);
  const remind = async (video: YoutubeVideoSnapshot) => {
    setRemindedIds((current) => current.includes(video.id) ? current : [...current, video.id]);
    const rollback = () => setRemindedIds((current) => current.filter((id) => id !== video.id));
    try {
      const result = await requestYoutubePremiereReminderFromTap({ videoId: video.id, channelId: video.channelId, title: video.title, scheduledStartTime: video.scheduledStartTime ?? '' });
      if (result.ok) return;
      DebugLogger.warn('[VIDEO-TAB]', `напоминание не поставлено: reason=${result.reason}`);
      rollback();
      if (result.reason === 'permission_blocked') {
        showGlassAlert(copy.error, undefined, [{ text: 'OK' }, { text: 'Settings', onPress: () => void openYoutubePremiereNotificationSettings() }]);
      } else if (result.reason === 'master_disabled') {
        showGlassAlert(copy.error);
      }
    } catch (error) {
      DebugLogger.error('[VIDEO-TAB]:remind', error, 'warning');
      rollback();
      showGlassAlert(copy.error);
    }
  };

  const activeChannel = catalog
    ? catalog.channel.youtubeChannelId === LINGMAN_CHANNEL_ID
      ? { ...catalog.channel, displayName: LINGMAN_CHANNEL_DISPLAY_NAME }
      : catalog.channel
    // зачем (ревью R2): канал нового языка грузится — шапка уже его (по манифесту), лента в это время скелетон.
    : pendingChannel ?? legacyChannelSnapshot();
  const hero = catalog?.activeEvent && (catalog.activeEvent.state === 'upcoming' || catalog.activeEvent.state === 'live') ? catalog.activeEvent : null;
  // зачем (chain21 Сверки, video-004: `#youtube-premiere-live` не найден; правило «сперва логи»): «герой» премьеры решается значением каталога — журнал при смене значений, чтобы видеть, дошёл ли каталог и в каком состоянии событие.
  const heroTraceRef = useRef('');
  useEffect(() => {
    const trace = JSON.stringify({
      studyTarget: String(studyTarget), catalogLoaded: catalog != null, channel: catalog?.channel?.id ?? null, videos: catalog?.videos?.length ?? 0,
      activeEvent: catalog?.activeEvent ? { id: catalog.activeEvent.id, state: catalog.activeEvent.state } : null, hero: hero ? hero.state : null, savedOnly, inTab,
    });
    if (heroTraceRef.current === trace) return;
    heroTraceRef.current = trace;
    console.log('[VIDEO-TAB] hero', trace); // guard-ok: журнал решения о премьере при смене значений (не на каждый рендер)
  }, [catalog, hero, inTab, savedOnly, studyTarget]);
  // Данные виртуального списка «Главной» вкладки: сохранённые или все ролики без премьеры (она в шапке).
  const homeListAll = useMemo(() => (savedOnly ? savedVideos : allVideos.filter((video) => video.id !== hero?.id)), [allVideos, hero?.id, savedOnly, savedVideos]);
  // Страницы по 20 (allVideosPage у Ядра = page × 20): список растёт по onEndReached; снимок (20) и «Сохранённые» — целиком.
  const paged = !savedOnly && !!fullVideos;
  const homeListVideos = useMemo(() => (paged ? homeListAll.slice(0, pages * ALL_VIDEOS_PAGE_SIZE) : homeListAll), [homeListAll, pages, paged]);
  const loadMoreVideos = useCallback(() => {
    if (!paged || pages * ALL_VIDEOS_PAGE_SIZE >= homeListAll.length) return;
    console.log('[VIDEO-TAB] догрузка страницы', JSON.stringify({ pages: pages + 1, total: homeListAll.length })); // guard-ok: пагинация логируется
    setPages((current) => current + 1);
  }, [homeListAll.length, pages, paged]);
  // Всё, от чего зависит вид карточки, — иначе FlashList не перерисует видимые строки.
  const homeListExtra = useMemo(() => ({ activeVideoId, expandedPhraseVideoId, saved: favorites.savedIds, remindedIds, screenRuntimeActive }), [activeVideoId, expandedPhraseVideoId, favorites.savedIds, remindedIds, screenRuntimeActive]);
  const pickerManifest = catalog?.manifest ?? {
    schemaVersion: 1 as const,
    activeVersion: 'fallback',
    generatedAt: new Date(0).toISOString(),
    sourceRefreshedAt: new Date(0).toISOString(),
    defaultChannelId: activeChannel.id,
    localeDefaults: {},
    channels: [{
      id: activeChannel.id,
      displayName: activeChannel.displayName,
      avatarUrl: activeChannel.avatarUrl,
      languageTags: activeChannel.languageTags,
      order: activeChannel.order,
    }],
  };

  const scrollToDeepLinked = (videoId: string) => {
    const index = homeListVideos.findIndex((video) => video.id === videoId);
    console.log('[VIDEO-TAB] deeplink: прокрутка к ролику', JSON.stringify({ videoId, index, hasList: !!homeListRef.current }));
    if (index < 0) {
      // Ролик — премьера в шапке списка: она и так сверху.
      homeListRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    homeListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 });
  };
  // зачем (владелец 11.10, video-redesign #c1): ролики в две колонки; промежуток между колонками 12 (по 6 с каждой стороны),
  // между рядами 20. Левая колонка — отступ справа, правая — слева, чтобы внешние края совпали с полями экрана.
  const renderHomeVideo = useCallback(({ item, index }: { item: YoutubeVideoSnapshot; index: number }) => (
    <View style={index % 2 === 0 ? styles.gridCellLeft : styles.gridCellRight}>
      <YoutubeVideoGridCard
        video={item}
        highlighted={item.id === deepLinkedVideoId}
        onWatch={() => openVideoRef.current(item)}
        saved={favorites.isSaved(item.id)}
        saveCount={saveCountOf(item.id)}
        onToggleSave={() => toggleSave(item.id)}
      />
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [deepLinkedVideoId, favorites.savedIds, saveCountOf, lang, catalog]);
  const renderPlaylist = useCallback(({ item, index }: { item: YoutubePlaylistSnapshot; index: number }) => (
    <View style={index % 2 === 0 ? styles.gridCellLeft : styles.gridCellRight}>
      <YoutubePlaylistGridCard playlist={item} onPress={() => openPlaylist(item.id)} />
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [catalog?.channel.id]);

  // зачем: первый кадр = итоговая геометрия сетки (две колонки, промежуток 12) — без прыжка, когда придут данные.
  const gridSkeletonHeight = Math.round(((windowWidth - V2.screenPad * 2 - 12) / 2) * 9 / 16);
  const renderGridSkeleton = (coverHeight: number) => Array.from({ length: 3 }).map((_, row) => (
    <View key={row} style={styles.gridSkeletonRow}>
      {[0, 1].map((col) => (
        <View key={col} style={styles.gridSkeletonCell}>
          <SkeletonBlock width="100%" height={coverHeight} borderRadius={14} />
          <SkeletonBlock width="90%" height={16} borderRadius={8} />
          <SkeletonBlock width="55%" height={13} borderRadius={7} />
        </View>
      ))}
    </View>
  ));
  const savedRow = !savedOnly && savedVideos.length > 0 ? (
    <TouchableOpacity
      testID="video-saved-row"
      accessibilityRole="button"
      accessibilityLabel={copy.savedVideos}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/lingman_videos', params: { saved: '1' } } as never)}
      style={[styles.packsRow, { boxShadow: plateBoxShadow(g) }]}
    >
      {/* зачем (Тень 12.10): строка «Сохранённые» без кромки — заливка PlateFill и тень плашки */}
      <PlateFill g={g} radius={14} />
      <View style={[styles.packsIcon, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}><Ionicons name="bookmark-outline" size={20} color={g.text} /></View>
      <View style={styles.packsCopy}>
        <Text style={[styles.packsTitle, { color: g.text }]}>{copy.savedVideos}</Text>
        <Text style={[styles.packsSub, { color: g.secondary }]}>{triLang(lang, {
          ru: `${savedVideos.length} ${pluralWord(lang, savedVideos.length, { one: 'ролик', few: 'ролика', many: 'роликов' })}`,
          uk: `${savedVideos.length} ${pluralWord(lang, savedVideos.length, { one: 'ролик', few: 'ролики', many: 'роликів' })}`,
          en: `${savedVideos.length} videos`, es: `${savedVideos.length} vídeos`, 'pt-BR': `${savedVideos.length} vídeos`, vi: `${savedVideos.length} video`,
          id: `${savedVideos.length} video`, tr: `${savedVideos.length} video`, pl: `${savedVideos.length} ${pluralWord(lang, savedVideos.length, { one: 'film', few: 'filmy', many: 'filmów' })}`,
        })}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={g.secondary} />
    </TouchableOpacity>
  ) : null;

  return (
    <ScreenGradient artBackdrop="home">
      {/* зачем (Сверка video-007): во вкладке свой сплошной градиент закрывал общий фон под безопасной зоной — пятна света темы оставались только
          под статус-баром («полоса» ~110 px). Во вкладке виден общий фон вкладок, как на Главной; отдельный экран по-прежнему красит свой. */}
      {inTab ? null : <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />}
      {glassAlertNode}
      <FeatureIntroEntry id="videos_first_visit" enabled={screenRuntimeActive && !pickerVisible && !studyLanguageSheetVisible && !deepLinkedVideoId && !activeVideoId} />
      <SafeAreaView testID="lingman-videos-screen" style={styles.container} edges={inTab ? ['left', 'right'] : ['top', 'left', 'right', 'bottom']}>
        <YoutubeChannelHeader
          channel={activeChannel}
          title={inTab ? copy.tabTitle : savedOnly ? copy.savedVideos : undefined}
          onBack={inTab ? undefined : () => safeRouterBack(router, '/(tabs)/home' as any)}
          onOpenYoutube={() => openExternalUrl(activeChannel.url)}
          studyTarget={studyTarget}
          // зачем (решение 5, video.html; баг владельца 11.10): пилюля языка открывает шторку «Язык изучения» (PRF-23) —
          // раньше вела на /settings_language, то есть на язык ИНТЕРФЕЙСА, а канал задаётся языком обучения.
          onOpenLanguage={inTab ? () => {
            if (__DEV__) console.log(`[VIDEO-LANG-PILL] tap → open=study_language_sheet studyTarget=${studyTarget} source=StudyTargetContext uiLang=${lang}`);
            hapticTap();
            setStudyLanguageSheetVisible(true);
          } : undefined}
        />
        {savedOnly ? null : <YoutubeChannelTabs value={tab} onChange={changeTab} />}
        {/* зачем (владелец 01.10): плашек «устарел/офлайн» и экрана ошибки нет — показываем то, что есть, обновляем тихо. */}
        {issue !== 'none' && snapshot && <View testID="lingman-videos-fallback-notice" />}

        {tab === 'packs' && !savedOnly ? (
          // зачем (владелец 11.10, video-redesign #c1): вкладка «Наборы» показывает тот же список «Наборы из видео», что и
          // раздел «Карточки» (один экран данных, режим embedded); грузится только когда вкладку открыли.
          <FlashcardsVideoPacksScreen embedded bottomPad={inTab ? tabContentBottomPad : 24} />
        ) : catalogExhausted && !catalog && !snapshot ? (
          <ScrollView
            testID="youtube-catalog-unavailable"
            decelerationRate="fast"
            refreshControl={<HybridRefreshControl refreshing={false} onRefresh={() => retryCatalogAfterUnavailable('tap')} />}
            contentContainerStyle={styles.unavailable}
          >
            <View style={[styles.unavailableTile, { backgroundColor: g.opaqueControl }]}><Ionicons name="cloud-offline-outline" size={24} color={g.text} /></View>
            <Text accessibilityRole="header" accessibilityLabel={copy.unavailable} style={[styles.unavailableTitle, { color: g.secondary }]}>{copy.catalogFailed}</Text>
            <Pressable
              testID="youtube-catalog-try-again"
              accessibilityRole="button"
              accessibilityLabel={copy.tryAgain}
              onPress={() => retryCatalogAfterUnavailable('tap')}
              style={({ pressed }) => [styles.unavailableAction, { backgroundColor: g.cta, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.unavailableActionLabel, { color: g.ctaInk }]}>{copy.retry}</Text>
            </Pressable>
          </ScrollView>
        ) : (visibleLoading || issue === 'error') && !catalog && !snapshot ? (
          <View testID="youtube-catalog-loading" style={styles.gridSkeleton}>
            {renderGridSkeleton(gridSkeletonHeight)}
          </View>
        ) : allVideos.length === 0 && (catalog?.playlists.length ?? 0) === 0 ? (
          <ScrollView decelerationRate="fast" testID="youtube-catalog-empty" refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} contentContainerStyle={inTab ? { paddingBottom: tabContentBottomPad } : undefined}>
            <View style={styles.gridSkeleton}>{renderGridSkeleton(gridSkeletonHeight)}</View>
          </ScrollView>
        ) : tab === 'playlists' ? (
          catalog ? <FlashList decelerationRate="fast" testID="lingman-videos-list" data={catalog.playlists} numColumns={2} keyExtractor={(item) => item.id} renderItem={renderPlaylist} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.gridList, inTab ? { paddingBottom: tabContentBottomPad } : null]} refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} />
            : <ScrollView decelerationRate="fast" testID="youtube-catalog-playlists-empty" contentContainerStyle={inTab ? { paddingBottom: tabContentBottomPad } : undefined}><View style={styles.gridSkeleton}>
              {renderGridSkeleton(gridSkeletonHeight)}
            </View></ScrollView>
        ) : (
          <FlashList
            ref={homeListRef}
            decelerationRate="fast"
            testID="lingman-videos-list"
            data={homeListVideos}
            keyExtractor={(item) => item.id}
            renderItem={renderHomeVideo}
            numColumns={2}
            onEndReached={loadMoreVideos}
            onEndReachedThreshold={0.6}
            extraData={homeListExtra}
            showsVerticalScrollIndicator={false}
            refreshControl={<HybridRefreshControl refreshing={refreshing || allChannel.refreshing} onRefresh={() => { void loadCatalog(undefined, true); allChannel.refresh(); }} />}
            contentContainerStyle={inTab ? { ...styles.gridList, paddingBottom: tabContentBottomPad } : styles.gridList}
            ListHeaderComponent={<>
            {hero && !savedOnly ? hero.id === activeVideoId ? (
              <View style={styles.heroPlayer}>
                <YoutubeInlinePlayer
                  videoId={hero.id}
                  title={hero.title}
                  active={screenRuntimeActive}
                  onClose={closeVideo}
                  presentation="preview"
                />
              </View>
            ) : <YoutubePremiereHero video={hero} reminded={remindedIds.includes(hero.id)} onWatch={() => openVideo(hero)} onRemind={() => void remind(hero)} /> : null}
            {hero && !savedOnly ? <YoutubeVideoPhrases
              packLanguage={normalizePackLanguage(activeChannel.languageTags[0]?.split('-')[0])}
              sourceTitle={activeChannel.displayName}
              videoId={hero.id}
              expanded={expandedPhraseVideoId === hero.id}
              onToggle={() => setExpandedPhraseVideoId((current) => current === hero.id ? null : hero.id)}
              testID={`video-phrases-${hero.id}`}
            /> : null}
            {savedRow}
            </>}
            ListEmptyComponent={!hero ? <View testID="lingman-videos-empty" /> : null}
          />
        )}

        {inTab ? (
          <StudyLanguageSheet
            visible={studyLanguageSheetVisible}
            onClose={() => {
              if (__DEV__) console.log(`[VIDEO-LANG-PILL] sheet_closed studyTarget=${studyTarget}`);
              setStudyLanguageSheetVisible(false);
            }}
            lang={lang}
            activeTarget={studyTarget}
            logTag="[VIDEO-LANG-PILL]"
          />
        ) : null}
        <YoutubeChannelPickerSheet visible={pickerVisible} manifest={pickerManifest} preference={preference} onSelect={(value) => void selectPreference(value)} onClose={() => setPickerVisible(false)} motionVariant="hybrid" />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  unavailable: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  unavailableTile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  unavailableTitle: { fontSize: 16, lineHeight: 22, fontWeight: '400', textAlign: 'center' },
  unavailableAction: { marginTop: 22, minHeight: 42, paddingHorizontal: 18, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  unavailableActionLabel: { fontSize: 16, fontWeight: '600' },
  container: { flex: 1, paddingHorizontal: V2.screenPad, paddingTop: 12, backgroundColor: 'transparent' },
  // зачем (video-redesign #c1, `.g2`): сетка в две колонки, ряды через 20; верхний отступ 16 под вкладками.
  gridList: { paddingTop: 16, paddingBottom: 32 },
  gridCellLeft: { paddingRight: 6, marginBottom: 20 },
  gridCellRight: { paddingLeft: 6, marginBottom: 20 },
  gridSkeleton: { marginTop: 16 },
  gridSkeletonRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  gridSkeletonCell: { flex: 1, gap: 8 },
  packsRow: {
    minHeight: 64,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 18,
  },
  packsIcon: { width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  packsCopy: { flex: 1, minWidth: 0 },
  packsTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  packsSub: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  heroPlayer: { width: '100%', aspectRatio: 16 / 9, borderRadius: 24, overflow: 'hidden', marginTop: 18, marginBottom: 14, backgroundColor: '#000000' }, // theme-exempt: фон под видео/превью — чёрный в любой теме
});
