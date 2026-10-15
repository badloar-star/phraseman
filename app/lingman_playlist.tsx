import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import YoutubeVideoCard from '../components/youtube/YoutubeVideoCard';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { captureAccountGeneration } from './account_generation';
import { plateBoxShadow } from '../components/v2/ShadowSurface';
import { LINGMAN_BACK_FALLBACK, safeRouterBack } from './navigation_back';
import { DebugLogger } from './debug-logger';
import { getTrustedLingmanYoutubeUrl } from './lingman_youtube';
import { peekYoutubeCatalogScreenSnapshot, revalidateYoutubeChannelCatalog, type YoutubeCatalogScreenSnapshot } from './youtube_catalog_client';
import { allVideosItemToSnapshot, allVideosPlaylistToSnapshot, useAllChannelVideos } from './all_channel_videos_source';
import { PLAYLIST_SLOW_MS, playlistViewKind } from './lingman_playlist_view_state';

function trustedPlaylistUrl(rawUrl: string, playlistId: string): string | null {
  const trusted = getTrustedLingmanYoutubeUrl(rawUrl);
  if (!trusted) return null;
  try {
    const url = new URL(trusted);
    return url.pathname === '/playlist' && url.searchParams.get('list') === playlistId ? trusted : null;
  } catch {
    return null;
  }
}

export default function LingmanPlaylistScreen() {
  const router = useRouter();
  const { playlistId = '', channelId = '' } = useLocalSearchParams<{ playlistId?: string; channelId?: string }>();
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const token = useMemo(() => captureAccountGeneration(), []);
  const initial = peekYoutubeCatalogScreenSnapshot(token);
  const [catalog, setCatalog] = useState<YoutubeCatalogScreenSnapshot | null>(initial?.channel.id === channelId ? initial : null);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const [loading, setLoading] = useState(!catalog);
  // зачем (аудит #23, 15.10): снимок экрана видео держит ≤ 20 роликов и ≤ 8 плейлистов — плейлист из «хвоста» каталога выходил пустым с вечным скелетоном. Ролики и плейлисты берём из полного списка
  // канала («Все видео», тот же кэш: память → диск, сеть не чаще раза в 6 ч); снимок остаётся первым кадром.
  const allChannel = useAllChannelVideos(channelId, { playlistId, sort: 'newest' }, catalog);
  const allChannelRef = useRef(allChannel);
  allChannelRef.current = allChannel;
  const playlist = useMemo(() => {
    const fromCatalog = catalog?.playlists.find((item) => item.id === playlistId);
    if (fromCatalog) return fromCatalog;
    const fromAll = allChannel.playlists.find((item) => item.id === playlistId);
    return fromAll ? allVideosPlaylistToSnapshot(fromAll) : undefined;
  }, [allChannel.playlists, catalog, playlistId]);
  const videos = useMemo(() => allChannel.items.map(allVideosItemToSnapshot), [allChannel.items]);
  // зачем (аудит #23): полный список пришёл и в плейлисте нет роликов (или сети и кэша нет) — честная пустота вместо вечного скелетона
  const videosSettledEmpty = videos.length === 0 && (allChannel.status === 'ready' || allChannel.status === 'unavailable');
  // зачем (R57 #23, координатор 15.10: плейлист из «хвоста» на медленной сети): ответа нет дольше PLAYLIST_SLOW_MS — вместо вечного скелета «грузится дольше обычного» с «Повторить»; ответ придёт позже — экран сам станет обычным.
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const awaiting = !playlist || videos.length === 0;
  const settledNow = allChannel.status === 'ready' || allChannel.status === 'unavailable';
  useEffect(() => {
    if (!awaiting || settledNow) { setWaitedTooLong(false); return undefined; }
    const startedAt = Date.now();
    console.log('[VIDEO-PLAYLIST] ждём полный список', JSON.stringify({ playlistId, channelId, status: allChannel.status, hasPlaylist: !!playlist, slowAfterMs: PLAYLIST_SLOW_MS }));
    const timer = setTimeout(() => {
      console.warn('[VIDEO-PLAYLIST] медленно: полный список не пришёл', JSON.stringify({ playlistId, channelId, waitedMs: Date.now() - startedAt, status: allChannel.status }));
      setWaitedTooLong(true);
    }, PLAYLIST_SLOW_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaiting, settledNow, playlistId, channelId]);
  const view = playlistViewKind({ hasPlaylist: !!playlist, videosCount: videos.length, status: allChannel.status, waitedTooLong });
  useEffect(() => { console.log('[VIDEO-PLAYLIST] вид', JSON.stringify({ view, playlistId, status: allChannel.status, videos: videos.length, waitedTooLong })); }, [view]); // guard-ok: одна строка на смену вида — что увидел человек
  const retry = () => { setWaitedTooLong(false); allChannel.refresh(); };
  const copy = {
    playAll: triLang(lang, { ru: 'Воспроизвести всё', uk: 'Відтворити все', en: 'Play all', es: 'Reproducir todo', 'pt-BR': 'Reproduzir tudo', vi: 'Phát tất cả', id: 'Putar semua', tr: 'Tümünü oynat', pl: 'Odtwórz wszystko' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    videos: triLang(lang, { ru: 'видео', uk: 'відео', en: 'videos', es: 'videos', 'pt-BR': 'vídeos', vi: 'video', id: 'video', tr: 'video', pl: 'filmów' }),
    emptyPlaylist: triLang(lang, {
      ru: 'В этом плейлисте пока нет роликов', uk: 'У цьому плейлисті поки немає відео', en: 'No videos in this playlist yet', es: 'Aún no hay vídeos en esta lista',
      'pt-BR': 'Ainda não há vídeos nesta playlist', vi: 'Danh sách phát này chưa có video', id: 'Belum ada video di playlist ini', tr: 'Bu oynatma listesinde henüz video yok', pl: 'W tej playliście nie ma jeszcze filmów',
    }),
    slow: triLang(lang, {
      ru: 'Плейлист грузится дольше обычного', uk: 'Плейлист завантажується довше, ніж зазвичай', en: 'The playlist is taking longer than usual', es: 'La lista tarda más de lo normal',
      'pt-BR': 'A playlist está demorando mais que o normal', vi: 'Danh sách phát đang tải lâu hơn bình thường', id: 'Playlist memuat lebih lama dari biasanya', tr: 'Oynatma listesi normalden uzun sürüyor', pl: 'Playlista ładuje się dłużej niż zwykle',
    }),
    retry: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Repetir', vi: 'Thử lại', id: 'Ulangi', tr: 'Tekrar dene', pl: 'Ponów' }),
  };

  useEffect(() => {
    if (!channelId) { console.warn('[VIDEO-PLAYLIST] нет channelId, каталог не запрашиваем'); setLoading(false); return; }
    let cancelled = false;
    // зачем (владелец 01.10): нет экрана «видео недоступны» — при пустом результате
    // тихо повторяем до 5 раз с паузой 20 с, пока показан скелетон.
    const hasPlaylist = () => !!catalogRef.current?.playlists.some((item) => item.id === playlistId) || allChannelRef.current.playlists.some((item) => item.id === playlistId); // зачем (аудит #23): плейлист из полного списка тоже считается найденным — лишних сетевых повторов нет
    const run = async () => {
      for (let attempt = 1; attempt <= 5 && !cancelled; attempt += 1) {
        try {
          const next = await revalidateYoutubeChannelCatalog({ channelId, token, previous: catalogRef.current, commit: (n) => { catalogRef.current = n; if (!cancelled) setCatalog(n); } });
          if (next && !cancelled) { catalogRef.current = next; setCatalog(next); }
        } catch (error: unknown) {
          DebugLogger.error('[VIDEO-PLAYLIST]:revalidate', error, 'warning');
        }
        if (hasPlaylist()) break;
        console.warn('[VIDEO-PLAYLIST] плейлист пока не найден, попытка', attempt, 'из 5, playlistId=', playlistId);
        if (attempt < 5) await new Promise<void>((resolve) => setTimeout(resolve, 20000));
      }
      if (!cancelled) setLoading(false);
    };
    void run();
    return () => { cancelled = true; };
  }, [channelId, playlistId, token]);

  // зачем (Сверка video-011 🔴, координатор 05.10): ролик открывается отдельным экраном (плеер, набор, фразы по
  // таймкодам), а не встроенным плеером внутри списка. Название передаём — экран рисует его с первого кадра.
  const openVideo = (video: (typeof videos)[number]) => {
    console.warn('[VIDEO-SCREEN] navigate', JSON.stringify({ source: 'playlist', videoId: video.id, playlistId })); // guard-ok: вход на экран ролика
    router.push({ pathname: '/lingman_video_watch', params: { videoId: video.id, channelId, title: video.title, source: 'playlist' } } as never);
  };
  const playAll = () => {
    if (!playlist) return;
    const url = trustedPlaylistUrl(playlist.url, playlist.id);
    if (url) void Linking.openURL(url);
  };

  // зачем (Макеты R57, 15.10): число в подзаголовке — из реально загруженного списка плейлиста, когда он готов (раньше «6 видео», а в списке 2)
  const shownCount = allChannel.status === 'ready' ? videos.length : playlist?.itemCount ?? 0;
  const subtitle = playlist ? `${shownCount} ${copy.videos}${catalog?.channel.displayName ? ` · ${catalog.channel.displayName}` : ''}` : '';

  return (
    <ScreenGradient artBackdrop="home">
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView testID="youtube-playlist-detail" style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topbar}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => safeRouterBack(router, LINGMAN_BACK_FALLBACK as any)} style={[styles.back, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}><Ionicons name="arrow-back" size={20} color={g.text} /></TouchableOpacity>
        </View>
        {view === 'slow' ? (
          <View testID="youtube-playlist-slow" style={styles.empty}>
            <Text style={[styles.emptyText, { color: g.secondary }]}>{copy.slow}</Text>
            <TouchableOpacity testID="youtube-playlist-retry" accessibilityRole="button" accessibilityLabel={copy.retry} onPress={retry} activeOpacity={0.85} style={[styles.retryBtn, { backgroundColor: g.cta }]}>
              <Text style={[styles.retryText, { color: g.ctaInk }]}>{copy.retry}</Text>
            </TouchableOpacity>
          </View>
        ) : !playlist && videosSettledEmpty ? (
          <View testID="youtube-playlist-empty" style={styles.empty}>
            <Text style={[styles.emptyText, { color: g.secondary }]}>{copy.emptyPlaylist}</Text>
            <TouchableOpacity testID="youtube-playlist-retry" accessibilityRole="button" accessibilityLabel={copy.retry} onPress={retry} activeOpacity={0.85} style={[styles.retryBtn, { backgroundColor: g.cta }]}>
              <Text style={[styles.retryText, { color: g.ctaInk }]}>{copy.retry}</Text>
            </TouchableOpacity>
          </View>
        ) : !playlist ? <View testID="youtube-playlist-skeleton" style={styles.loading}><SkeletonBlock width="70%" height={32} borderRadius={10} /><SkeletonBlock width="40%" height={18} borderRadius={8} /><SkeletonBlock width="100%" height={48} borderRadius={24} /><SkeletonBlock width="100%" height={180} borderRadius={16} /><SkeletonBlock width="100%" height={180} borderRadius={16} /></View> : (
          <ScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{playlist.title}</Text>
            <Text style={[styles.subtitle, { color: g.secondary }]}>{subtitle}</Text>
            {/* зачем (Сверка video-009, координатор 05.10): в макете под заголовком сразу «Воспроизвести всё» — блока описания нет. */}
            {videos.length ? <TouchableOpacity testID="youtube-playlist-play-all" accessibilityRole="button" accessibilityLabel={copy.playAll} onPress={playAll} activeOpacity={0.85} style={[styles.playAll, { backgroundColor: g.cta }]}><Ionicons name="play" size={20} color={g.ctaInk} /><Text style={[styles.playAllText, { color: g.ctaInk }]}>{copy.playAll}</Text></TouchableOpacity> : null}
            <View style={styles.videoList}>{videos.length ? videos.map((video) => (
              <YoutubeVideoCard
                key={video.id}
                video={video}
                compact
                onWatch={() => openVideo(video)}
              />
            )) : view === 'content_slow' ? (
              <View testID="youtube-playlist-slow" style={styles.empty}>
                <Text style={[styles.emptyText, { color: g.secondary }]}>{copy.slow}</Text>
                <TouchableOpacity testID="youtube-playlist-retry" accessibilityRole="button" accessibilityLabel={copy.retry} onPress={retry} activeOpacity={0.85} style={[styles.retryBtn, { backgroundColor: g.cta }]}>
                  <Text style={[styles.retryText, { color: g.ctaInk }]}>{copy.retry}</Text>
                </TouchableOpacity>
              </View>
            ) : videosSettledEmpty ? (
              <View testID="youtube-playlist-empty" style={styles.empty}>
                <Text style={[styles.emptyText, { color: g.secondary }]}>{copy.emptyPlaylist}</Text>
                <TouchableOpacity testID="youtube-playlist-retry" accessibilityRole="button" accessibilityLabel={copy.retry} onPress={retry} activeOpacity={0.85} style={[styles.retryBtn, { backgroundColor: g.cta }]}>
                  <Text style={[styles.retryText, { color: g.ctaInk }]}>{copy.retry}</Text>
                </TouchableOpacity>
              </View>
            ) : <View style={styles.loading}><SkeletonBlock width="100%" height={180} borderRadius={16} /><SkeletonBlock width="100%" height={180} borderRadius={16} /></View>}</View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  // зачем: паритет с макетом video.html — поля экрана 20 (`--pad`), как у вкладки «Видео».
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center' },
  // зачем (Сверка video-009, video.html topbar .rb + arrowL): стрелка «←» в круге 42.
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, // зачем (Тень 12.10): кнопка без кромки — плашка с тенью
  loading: { gap: 14, marginTop: 14 },
  content: { paddingBottom: 32 },
  title: { marginTop: 14, fontSize: 30, lineHeight: 36, fontWeight: '700' },
  subtitle: { marginTop: 4, fontSize: 16, lineHeight: 21, fontWeight: '400' },
  playAll: { minHeight: 48, marginTop: 18, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  playAllText: { fontSize: 16, fontWeight: '700' },
  videoList: { marginTop: 20 },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 32 },
  emptyText: { fontSize: 16, lineHeight: 22, fontWeight: '500', textAlign: 'center' },
  retryBtn: { minHeight: 48, borderRadius: 24, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 16, fontWeight: '700' },
});
