import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useGlassAlert } from '../hooks/use-glass-alert'; // зачем: стеклянное окно вместо нативного Alert (overlays-runtime «video reminder»)
import { FlashList } from '@shopify/flash-list';
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
import YoutubeChannelTabs, { type YoutubeChannelTab } from '../components/youtube/YoutubeChannelTabs';
import YoutubeInlinePlayer from '../components/youtube/YoutubeInlinePlayer';
import YoutubePlaylistRow from '../components/youtube/YoutubePlaylistRow';
import YoutubePremiereHero from '../components/youtube/YoutubePremiereHero';
import YoutubeVideoCard from '../components/youtube/YoutubeVideoCard';
import YoutubeVideoPhrases from '../components/youtube/YoutubeVideoPhrases';
import { normalizePackLanguage } from './flashcards/pack_languages';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import type { YoutubeChannelSnapshot, YoutubeVideoSnapshot } from '../shared/youtube_catalog_contract';
import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { safeRouterBack } from './navigation_back';
import { useTabNav } from './TabContext';
import { useTabContentBottomPad } from '../hooks/use-tab-content-bottom-pad';
import { V2 } from '../constants/v2Style';
import { VideoGlassSheen } from '../components/video/VideoGlassKit';
import { DebugLogger } from './debug-logger';
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

// Stable child contract: YoutubeVideoCard renders testID="lingman-video-card".

// зачем: единый стеклянный блик плашек — живёт в components/video/VideoGlassKit (макет video.html).
const VideoScreenGlass = VideoGlassSheen;

function legacyChannelSnapshot(): YoutubeChannelSnapshot {
  const channel = getActiveYoutubeChannel();
  return {
    id: 'legacy', youtubeChannelId: channel.channelId, displayName: channel.displayName,
    handle: channel.handle, url: channel.url, languageTags: ['en'], order: 0,
    recentVideoIds: [], playlistIds: [],
  };
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
  const { videoId: deepLinkedVideoId, channelId: deepLinkedChannelId } = useLocalSearchParams<{ videoId?: string; channelId?: string }>();
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
  const initialCatalog = peekYoutubeCatalogScreenSnapshot(renderToken);
  const [catalog, setCatalog] = useState<YoutubeCatalogScreenSnapshot | null>(initialCatalog);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const [preference, setPreference] = useState<YoutubeChannelPreference>(() => getYoutubeChannelPreference(renderToken));
  const [tab, setTab] = useState<YoutubeChannelTab>('home');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(!initialCatalog);
  const [refreshing, setRefreshing] = useState(false);
  const [issue, setIssue] = useState<'none' | 'offline' | 'error'>('none');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [expandedPhraseVideoId, setExpandedPhraseVideoId] = useState<string | null>(null);
  // зачем (Ядро 01.10): вход из «Из видео» с videoId — ролик сразу открывается и экран
  // прокручивается к нему (раньше только подсвечивался). Один раз на videoId.
  const homeScrollRef = useRef<ScrollView | null>(null);
  const cardYRef = useRef<Map<string, number>>(new Map());
  const deepLinkHandledRef = useRef<string | null>(null);
  const deepLinkScrollPendingRef = useRef<string | null>(null);
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
  const snapshot = loadedKey === currentRenderKey ? cachedSnapshot : null;
  const visibleLoading = loading || loadedKey !== currentRenderKey;

  const copy = useMemo(() => ({
    tabTitle: triLang(lang, { ru: 'Видео', uk: 'Відео', en: 'Videos', es: 'Videos', 'pt-BR': 'Vídeos', vi: 'Video', id: 'Video', tr: 'Videolar', pl: 'Filmy' }),
    videoPacks: triLang(lang, { ru: 'Наборы из видео', uk: 'Набори з відео', en: 'Packs from videos', es: 'Packs de videos', 'pt-BR': 'Pacotes dos vídeos', vi: 'Bộ thẻ từ video', id: 'Paket dari video', tr: 'Videolardan paketler', pl: 'Zestawy z filmów' }),
    videoPacksSub: triLang(lang, { ru: 'Фразы из роликов карточками', uk: 'Фрази з роликів картками', en: 'Phrases from the videos as cards', es: 'Frases de los videos en tarjetas', 'pt-BR': 'Frases dos vídeos em cartões', vi: 'Cụm từ trong video thành thẻ', id: 'Frasa dari video jadi kartu', tr: 'Videolardaki ifadeler kart olarak', pl: 'Zwroty z filmów jako fiszki' }),
    recent: triLang(lang, { ru: 'Новые видео', uk: 'Нові відео', en: 'New videos', es: 'Videos nuevos', 'pt-BR': 'Vídeos novos', vi: 'Video mới', id: 'Video baru', tr: 'Yeni videolar', pl: 'Nowe filmy' }),
    error: triLang(lang, { ru: 'Не удалось поставить напоминание.', uk: 'Не вдалося встановити нагадування.', en: 'Could not set the reminder.', es: 'No se pudo activar el recordatorio.', 'pt-BR': 'Não foi possível definir o lembrete.', vi: 'Không thể đặt lời nhắc.', id: 'Pengingat tidak dapat dibuat.', tr: 'Hatırlatıcı ayarlanamadı.', pl: 'Nie udało się ustawić przypomnienia.' }),
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
    if (!screenRuntimeActiveRef.current) return;
    const token = captureAccountGeneration();
    const tokenScope = accountScopeKey(token);
    if (tokenScope && renderAccountScope && tokenScope !== renderAccountScope) return;
    if (refresh) setRefreshing(true); else if (!catalogRef.current) setLoading(true);
    try {
      const manifest = catalogRef.current?.manifest ?? await fetchYoutubeCatalogManifest();
      // зачем (владелец 01.10): канал = контур языка обучения; ручной выбор канала не применяется.
      const currentPreference: YoutubeChannelPreference = { mode: 'auto' };
      const resolution = resolvePreferredYoutubeChannel(manifest, studyTarget, currentPreference);
      if (resolution.clearedInvalidManual) {
        await setYoutubeChannelPreference({ mode: 'auto' }, token);
        setPreference({ mode: 'auto' });
      }
      const routeChannel = deepLinkedChannelId && manifest.channels.some((item) => item.id === deepLinkedChannelId) ? deepLinkedChannelId : '';
      const channelId = requestedChannelId || routeChannel || resolution.channelId;
      const previous = catalogRef.current?.channel.id === channelId ? catalogRef.current : null;
      const next = await revalidateYoutubeChannelCatalog({ channelId, token, previous, commit: (value) => {
        catalogRef.current = value;
        setCatalog(value);
      } });
      if (next) {
        catalogRef.current = next;
        setCatalog(next);
        setIssue('none');
        void markLingmanYoutubeSectionOpened();
      }
    } catch (error) {
      DebugLogger.error('[VIDEO-TAB]:loadCatalog', error, 'warning');
      setIssue(catalogRef.current ? 'offline' : 'error');
      if (!catalogRef.current) await loadLegacyFallback().catch((fallbackError: unknown) => { DebugLogger.error('[VIDEO-TAB]:legacyFallback', fallbackError, 'warning'); });
    } finally {
      // Скелетоны обязаны сняться и тогда, когда личность активировалась прямо
      // во время загрузки: иначе экран навсегда застывал бы на заглушках.
      const settledScope = accountScopeKey(captureAccountGeneration());
      if (!renderAccountScope || settledScope === renderAccountScope) {
        setLoading(false); setRefreshing(false);
      }
    }
  }, [deepLinkedChannelId, loadLegacyFallback, renderAccountScope, studyTarget]);

  useEffect(() => {
    if (!screenRuntimeActive) return;
    void loadCatalog();
  }, [loadCatalog, screenRuntimeActive]);

  // зачем (владелец 01.10): вместо экрана ошибки — тихий повтор (до 5 раз по 20 с),
  // пока каталога нет совсем; пользователь видит скелетоны.
  const catalogRetryRef = useRef(0);
  useEffect(() => {
    if (issue !== 'error' || catalog || snapshot || !screenRuntimeActive) return;
    if (catalogRetryRef.current >= 5) {
      console.warn('[VIDEO-TAB] тихие повторы каталога исчерпаны (5), остаются скелетоны');
      return;
    }
    const timer = setTimeout(() => {
      catalogRetryRef.current += 1;
      console.warn('[VIDEO-TAB] тихий повтор каталога, попытка', catalogRetryRef.current);
      void loadCatalog();
    }, 20000);
    return () => clearTimeout(timer);
  }, [issue, catalog, snapshot, screenRuntimeActive, loadCatalog]);

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

  const allVideos = catalog?.videos ?? snapshot?.videos.map(legacyVideoSnapshot) ?? [];
  const openVideo = (video: YoutubeVideoSnapshot) => {
    hapticTap();
    if (!catalog && snapshot) {
      const videoIndex = allVideos.findIndex((item) => item.id === video.id);
      const unreadCount = snapshot.unreadCount ?? 0;
      const nextUnread = Math.min(unreadCount, Math.max(0, videoIndex));
      patchLingmanUnread(captureAccountGeneration(), channel.channelId, nextUnread);
      setCachedSnapshot((current) => current ? { ...current, unreadCount: nextUnread } : current);
      void markLingmanYoutubeCatalogSeen(video.id);
    }
    // Ровно один videoId хранится в состоянии: смена id размонтирует прежний
    // WebView до создания следующего, поэтому параллельного воспроизведения нет.
    setActiveVideoId(video.id);
  };

  const closeVideo = useCallback(() => setActiveVideoId(null), []);
  useEffect(() => {
    const target = typeof deepLinkedVideoId === 'string' ? deepLinkedVideoId : null;
    if (!target || deepLinkHandledRef.current === target) return;
    if (!allVideos.some((video) => video.id === target)) {
      console.log('[VIDEO-TAB] deeplink: ролика ещё нет в каталоге — ждём', JSON.stringify({ target, videos: allVideos.length }));
      return;
    }
    deepLinkHandledRef.current = target;
    console.log('[VIDEO-TAB] deeplink: открываю ролик', JSON.stringify({ target }));
    setTab('home');
    setActiveVideoId(target);
    const knownY = cardYRef.current.get(target);
    deepLinkScrollPendingRef.current = target;
    if (knownY !== undefined) scrollToDeepLinked(target, knownY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVideos, deepLinkedVideoId]);
  const changeTab = useCallback((nextTab: YoutubeChannelTab) => {
    setActiveVideoId(null);
    setExpandedPhraseVideoId(null);
    setTab(nextTab);
  }, []);

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
    : legacyChannelSnapshot();
  const hero = catalog?.activeEvent && (catalog.activeEvent.state === 'upcoming' || catalog.activeEvent.state === 'live') ? catalog.activeEvent : null;
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

  const renderVideoCard = (video: YoutubeVideoSnapshot, compact = false) => (
    <YoutubeVideoCard
      video={video}
      compact={compact && video.id !== activeVideoId}
      highlighted={video.id === deepLinkedVideoId || video.id === activeVideoId}
      onWatch={() => openVideo(video)}
      inlinePlayer={video.id === activeVideoId ? (
        <YoutubeInlinePlayer
          videoId={video.id}
          title={video.title}
          active={screenRuntimeActive}
          onClose={closeVideo}
          presentation="preview"
        />
      ) : undefined}
      belowPlayer={!compact || video.id === activeVideoId ? <YoutubeVideoPhrases
        packLanguage={normalizePackLanguage(activeChannel.languageTags[0]?.split('-')[0])}
        sourceTitle={activeChannel.displayName}
        videoId={video.id}
        expanded={expandedPhraseVideoId === video.id}
        onToggle={() => setExpandedPhraseVideoId((current) => current === video.id ? null : video.id)}
        testID={`video-phrases-${video.id}`}
      /> : undefined}
    />
  );
  const scrollToDeepLinked = (videoId: string, y: number) => {
    if (deepLinkScrollPendingRef.current !== videoId) return;
    deepLinkScrollPendingRef.current = null;
    console.log('[VIDEO-TAB] deeplink: прокрутка к ролику', JSON.stringify({ videoId, y }));
    homeScrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };
  const videosList = (videos: YoutubeVideoSnapshot[], compact = false) => videos.map((video) => (
    <View key={video.id} onLayout={(event) => {
      const y = event.nativeEvent.layout.y;
      cardYRef.current.set(video.id, y);
      scrollToDeepLinked(video.id, y);
    }}>{renderVideoCard(video, compact)}</View>
  ));

  const skeletonHeight = Math.round((windowWidth - V2.screenPad * 2) * 9 / 16);
  // зачем: плашка «Наборы из видео» стоит в макете внутри вкладки «Главная» — после премьеры,
  // перед «Новыми видео» (и в пустом состоянии), а не над вкладками.
  const packsRow = inTab ? (
    <TouchableOpacity
      testID="video-tab-packs-row"
      accessibilityRole="button"
      accessibilityLabel={copy.videoPacks}
      activeOpacity={0.8}
      onPressIn={() => hapticTap()}
      onPress={() => router.push('/flashcards_video_packs' as never)}
      style={[styles.packsRow, { backgroundColor: g.card, borderColor: g.glassEdge }]}
    >
      <VideoScreenGlass tint={g.selected} edge={g.glassEdge} />
      <View style={[styles.packsIcon, { backgroundColor: g.opaqueControl }]}><Ionicons name="layers-outline" size={20} color={g.text} /></View>
      <View style={styles.packsCopy}>
        <Text style={[styles.packsTitle, { color: g.text }]}>{copy.videoPacks}</Text>
        <Text style={[styles.packsSub, { color: g.secondary }]}>{copy.videoPacksSub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={g.secondary} />
    </TouchableOpacity>
  ) : null;

  return (
    <ScreenGradient artBackdrop="home">
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      {glassAlertNode}
      <FeatureIntroEntry id="videos_first_visit" enabled={screenRuntimeActive && !pickerVisible && !deepLinkedVideoId && !activeVideoId} />
      <SafeAreaView testID="lingman-videos-screen" style={styles.container} edges={inTab ? ['left', 'right'] : ['top', 'left', 'right', 'bottom']}>
        <YoutubeChannelHeader
          channel={activeChannel}
          title={inTab ? copy.tabTitle : undefined}
          onBack={inTab ? undefined : () => safeRouterBack(router, '/(tabs)/home' as any)}
          onOpenYoutube={() => openExternalUrl(activeChannel.url)}
        />
        <YoutubeChannelTabs value={tab} onChange={changeTab} />
        {/* зачем (владелец 01.10): плашек «устарел/офлайн» и экрана ошибки нет — показываем то, что есть, обновляем тихо. */}
        {issue !== 'none' && snapshot && <View testID="lingman-videos-fallback-notice" />}

        {(visibleLoading || issue === 'error') && !catalog && !snapshot ? (
          <View testID="youtube-catalog-loading" style={styles.skeletons}>
            <SkeletonBlock width="100%" height={skeletonHeight} borderRadius={22} />
            <SkeletonBlock width="100%" height={64} borderRadius={12} />
            {Array.from({ length: 2 }).map((_, index) => <View key={index} style={styles.skeletonCard}><SkeletonBlock width="100%" height={skeletonHeight} borderRadius={16} /><SkeletonBlock width="70%" height={16} borderRadius={8} /></View>)}
          </View>
        ) : allVideos.length === 0 && (catalog?.playlists.length ?? 0) === 0 ? (
          <ScrollView decelerationRate="fast" testID="youtube-catalog-empty" refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} contentContainerStyle={inTab ? { paddingBottom: tabContentBottomPad } : undefined}>
            {packsRow}
            <View style={styles.skeletons}>
              <SkeletonBlock width="100%" height={skeletonHeight} borderRadius={16} />
              <SkeletonBlock width="100%" height={skeletonHeight} borderRadius={16} />
            </View>
          </ScrollView>
        ) : tab === 'playlists' ? (
          catalog ? <FlashList decelerationRate="fast" testID="lingman-videos-list" data={catalog.playlists} keyExtractor={(item) => item.id} renderItem={({ item }) => <YoutubePlaylistRow playlist={item} onPress={() => openPlaylist(item.id)} />} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.list, inTab ? { paddingBottom: tabContentBottomPad } : null]} refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} />
            : <ScrollView decelerationRate="fast" testID="youtube-catalog-playlists-empty" contentContainerStyle={inTab ? { paddingBottom: tabContentBottomPad } : undefined}><View style={styles.skeletons}>
              <SkeletonBlock width="100%" height={skeletonHeight} borderRadius={16} />
              <SkeletonBlock width="100%" height={skeletonHeight} borderRadius={16} />
            </View></ScrollView>
        ) : tab === 'all' ? (
          <FlashList decelerationRate="fast" testID="youtube-catalog-all-videos" data={allVideos} keyExtractor={(item) => item.id} renderItem={({ item }) => renderVideoCard(item, true)} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.list, inTab ? { paddingBottom: tabContentBottomPad } : null]} refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} ListEmptyComponent={<View style={styles.skeletons}>
              <SkeletonBlock width="100%" height={skeletonHeight} borderRadius={16} />
              <SkeletonBlock width="100%" height={skeletonHeight} borderRadius={16} />
            </View>} />
        ) : (
          <ScrollView ref={homeScrollRef} decelerationRate="fast" testID="lingman-videos-list" showsVerticalScrollIndicator={false} refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} contentContainerStyle={[styles.list, inTab ? { paddingBottom: tabContentBottomPad } : null]}>
            {hero ? hero.id === activeVideoId ? (
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
            {hero ? <YoutubeVideoPhrases
              packLanguage={normalizePackLanguage(activeChannel.languageTags[0]?.split('-')[0])}
              sourceTitle={activeChannel.displayName}
              videoId={hero.id}
              expanded={expandedPhraseVideoId === hero.id}
              onToggle={() => setExpandedPhraseVideoId((current) => current === hero.id ? null : hero.id)}
              testID={`video-phrases-${hero.id}`}
            /> : null}
            {packsRow}
            <Text style={[styles.sectionTitle, { color: g.text }]}>{copy.recent}</Text>
            {videosList(allVideos.filter((video) => video.id !== hero?.id))}
            {!hero && !allVideos.length && <View testID="lingman-videos-empty" />}
          </ScrollView>
        )}

        <YoutubeChannelPickerSheet visible={pickerVisible} manifest={pickerManifest} preference={preference} onSelect={(value) => void selectPreference(value)} onClose={() => setPickerVisible(false)} motionVariant="hybrid" />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: V2.screenPad, paddingTop: 12, backgroundColor: 'transparent' },
  list: { paddingBottom: 32 },
  // зачем: `.sec .ti` макета — 20/26, вес 700, отступ сверху 26.
  sectionTitle: { marginTop: 26, marginBottom: 14, marginHorizontal: 2, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  skeletons: { gap: 18, marginTop: 18 },
  skeletonCard: { gap: 10, marginTop: 4 },
  packsRow: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1, // guard-ok: тонкая 1 px полупрозрачная кромка стекла, как `.card` макета
    overflow: 'hidden',
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
  packsSub: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  heroPlayer: { width: '100%', aspectRatio: 16 / 9, borderRadius: 24, overflow: 'hidden', marginTop: 18, marginBottom: 14, backgroundColor: '#000000' },
});
