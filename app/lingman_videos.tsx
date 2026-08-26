import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import HybridRefreshControl from '../components/feedback/HybridRefreshControl';
import YoutubeChannelHeader from '../components/youtube/YoutubeChannelHeader';
import YoutubeChannelPickerSheet from '../components/youtube/YoutubeChannelPickerSheet';
import YoutubeChannelTabs, { type YoutubeChannelTab } from '../components/youtube/YoutubeChannelTabs';
import YoutubeInlinePlayer from '../components/youtube/YoutubeInlinePlayer';
import YoutubePlaylistRow from '../components/youtube/YoutubePlaylistRow';
import YoutubePremiereHero from '../components/youtube/YoutubePremiereHero';
import YoutubeVideoCard from '../components/youtube/YoutubeVideoCard';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import type { YoutubeChannelSnapshot, YoutubeVideoSnapshot } from '../shared/youtube_catalog_contract';
import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { safeRouterBack } from './navigation_back';
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

export default function LingmanVideosScreen() {
  const router = useRouter();
  const { videoId: deepLinkedVideoId, channelId: deepLinkedChannelId } = useLocalSearchParams<{ videoId?: string; channelId?: string }>();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t } = useTheme();
  const screenRuntimeActive = useRuntimeActive(true);
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
    recent: triLang(lang, { ru: 'Новые видео', uk: 'Нові відео', en: 'New videos', es: 'Videos nuevos', 'pt-BR': 'Vídeos novos', vi: 'Video mới', id: 'Video baru', tr: 'Yeni videolar', pl: 'Nowe filmy' }),
    empty: triLang(lang, { ru: 'Здесь пока нет опубликованных видео.', uk: 'Тут поки немає опублікованих відео.', en: 'No published videos here yet.', es: 'Todavía no hay videos publicados aquí.', 'pt-BR': 'Ainda não há vídeos publicados.', vi: 'Chưa có video được đăng.', id: 'Belum ada video.', tr: 'Henüz video yok.', pl: 'Nie ma jeszcze filmów.' }),
    offline: triLang(lang, { ru: 'Показываем сохранённый каталог. Обновим, когда появится связь.', uk: 'Показуємо збережений каталог. Оновимо після відновлення зв’язку.', en: 'Showing the saved catalog. We will refresh when back online.', es: 'Mostramos el catálogo guardado. Lo actualizaremos cuando haya conexión.', 'pt-BR': 'Mostrando o catálogo salvo.', vi: 'Đang hiển thị danh mục đã lưu.', id: 'Menampilkan katalog tersimpan.', tr: 'Kaydedilmiş katalog gösteriliyor.', pl: 'Wyświetlamy zapisany katalog.' }),
    stale: triLang(lang, { ru: 'Каталог давно не обновлялся', uk: 'Каталог давно не оновлювався', en: 'The catalog update is delayed', es: 'La actualización del catálogo está retrasada', 'pt-BR': 'Atualização do catálogo atrasada', vi: 'Danh mục chưa được cập nhật', id: 'Pembaruan katalog tertunda', tr: 'Katalog güncellemesi gecikti', pl: 'Aktualizacja katalogu jest opóźniona' }),
    error: triLang(lang, { ru: 'Не удалось загрузить каталог. Потяни вниз, чтобы повторить.', uk: 'Не вдалося завантажити каталог. Потягни вниз, щоб повторити.', en: 'Could not load the catalog. Pull down to retry.', es: 'No se pudo cargar el catálogo. Desliza hacia abajo para reintentar.', 'pt-BR': 'Não foi possível carregar.', vi: 'Không thể tải danh mục.', id: 'Katalog tidak dapat dimuat.', tr: 'Katalog yüklenemedi.', pl: 'Nie udało się wczytać katalogu.' }),
    retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' }),
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
      const currentPreference = getYoutubeChannelPreference(token);
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
    } catch {
      setIssue(catalogRef.current ? 'offline' : 'error');
      if (!catalogRef.current) await loadLegacyFallback().catch(() => {});
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
  const changeTab = useCallback((nextTab: YoutubeChannelTab) => {
    setActiveVideoId(null);
    setTab(nextTab);
  }, []);

  const openPlaylist = (playlistId: string) => router.push({ pathname: '/lingman_playlist', params: { playlistId, channelId: catalog?.channel.id } } as any);
  const remind = async (video: YoutubeVideoSnapshot) => {
    const result = await requestYoutubePremiereReminderFromTap({ videoId: video.id, channelId: video.channelId, title: video.title, scheduledStartTime: video.scheduledStartTime ?? '' });
    if (result.ok) { Alert.alert(copy.reminderSet); return; }
    if (result.reason === 'permission_blocked') {
      Alert.alert(copy.error, undefined, [{ text: 'OK' }, { text: 'Settings', onPress: () => void openYoutubePremiereNotificationSettings() }]);
    } else if (result.reason === 'master_disabled') {
      Alert.alert(copy.error);
    }
  };

  const activeChannel = catalog
    ? catalog.channel.youtubeChannelId === LINGMAN_CHANNEL_ID
      ? { ...catalog.channel, displayName: LINGMAN_CHANNEL_DISPLAY_NAME }
      : catalog.channel
    : legacyChannelSnapshot();
  const stale = !!catalog && Date.now() - Date.parse(catalog.manifest.sourceRefreshedAt) > 26 * 60 * 60_000;
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

  const videosList = (videos: YoutubeVideoSnapshot[]) => videos.map((video) => (
    <YoutubeVideoCard
      key={video.id}
      video={video}
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
    />
  ));

  return (
    <ScreenGradient artBackdrop="home">
      <SafeAreaView testID="lingman-videos-screen" style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <YoutubeChannelHeader channel={activeChannel} onBack={() => safeRouterBack(router, '/(tabs)/home' as any)} onOpenChannels={() => setPickerVisible(true)} onOpenYoutube={() => openExternalUrl(activeChannel.url)} />
        {(catalog || snapshot) && <YoutubeChannelTabs value={tab} onChange={changeTab} />}
        {stale && <View testID="youtube-catalog-stale" style={[styles.notice, { backgroundColor: t.accentBg }]}><Ionicons name="time-outline" size={17} color={t.accent} /><Text style={[styles.noticeText, { color: t.textSecond }]}>{copy.stale}</Text></View>}
        {issue === 'offline' && <View testID="youtube-catalog-offline" style={[styles.notice, { backgroundColor: t.accentBg }]}><Ionicons name="cloud-offline-outline" size={17} color={t.accent} /><Text style={[styles.noticeText, { color: t.textSecond }]}>{copy.offline}</Text></View>}
        {issue === 'error' && !catalog && !snapshot && <View testID="youtube-catalog-error" style={[styles.notice, styles.errorNotice, { backgroundColor: t.accentBg }]}><View style={styles.errorCopy}><Ionicons name="alert-circle-outline" size={17} color={t.accent} /><Text style={[styles.noticeText, { color: t.textSecond }]}>{copy.error}</Text></View><TouchableOpacity testID="youtube-catalog-retry" accessibilityRole="button" accessibilityLabel={copy.retry} disabled={refreshing} onPress={() => void loadCatalog(undefined, true)} style={[styles.retryButton, { backgroundColor: t.accent }, refreshing && styles.retryButtonDisabled]}><Text style={styles.retryButtonText}>{copy.retry}</Text></TouchableOpacity></View>}
        {issue !== 'none' && snapshot && <View testID="lingman-videos-fallback-notice" />}

        {visibleLoading && !catalog && !snapshot ? (
          <View testID="youtube-catalog-loading" style={styles.skeletons}>
            <SkeletonBlock width="100%" height={250} borderRadius={24} />
            <SkeletonBlock width="100%" height={44} borderRadius={16} />
            {Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} width="100%" height={190} borderRadius={20} />)}
          </View>
        ) : allVideos.length === 0 && (catalog?.playlists.length ?? 0) === 0 ? (
          <ScrollView decelerationRate="fast" testID="youtube-catalog-empty" refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} contentContainerStyle={styles.empty}>
            <Ionicons name="videocam-outline" size={36} color={t.accent} /><Text style={[styles.emptyText, { color: t.textMuted }]}>{copy.empty}</Text>
          </ScrollView>
        ) : tab === 'playlists' ? (
          catalog ? <FlashList decelerationRate="fast" testID="lingman-videos-list" data={catalog.playlists} keyExtractor={(item) => item.id} renderItem={({ item }) => <YoutubePlaylistRow playlist={item} onPress={() => openPlaylist(item.id)} />} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} />
            : <ScrollView decelerationRate="fast" testID="youtube-catalog-playlists-empty" contentContainerStyle={styles.empty}><Ionicons name="albums-outline" size={36} color={t.accent} /><Text style={[styles.emptyText, { color: t.textMuted }]}>{copy.empty}</Text></ScrollView>
        ) : (
          <ScrollView decelerationRate="fast" testID="lingman-videos-list" showsVerticalScrollIndicator={false} refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={() => void loadCatalog(undefined, true)} />} contentContainerStyle={styles.list}>
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
            ) : <YoutubePremiereHero video={hero} onWatch={() => openVideo(hero)} onRemind={() => void remind(hero)} /> : null}
            <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>{copy.recent}</Text>
            {videosList(allVideos.filter((video) => video.id !== hero?.id))}
            {!hero && !allVideos.length && <View testID="lingman-videos-empty" />}
          </ScrollView>
        )}

        <YoutubeChannelPickerSheet visible={pickerVisible} manifest={pickerManifest} preference={preference} onSelect={(value) => void selectPreference(value)} onClose={() => setPickerVisible(false)} />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'transparent' },
  list: { paddingBottom: 32 },
  sectionTitle: { marginTop: 7, marginBottom: 11, fontSize: 18, fontWeight: '900' },
  notice: { minHeight: 44, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  errorNotice: { alignItems: 'stretch', gap: 10 },
  errorCopy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  retryButton: { minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  retryButtonDisabled: { opacity: 0.55 },
  retryButtonText: { color: '#071015', fontSize: 13, fontWeight: '900' },
  skeletons: { gap: 12 },
  empty: { minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '800' },
  heroPlayer: { width: '100%', aspectRatio: 16 / 9, borderRadius: 24, overflow: 'hidden', marginBottom: 14, backgroundColor: '#000000' },
});
