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
import { safeRouterBack } from './navigation_back';
import { DebugLogger } from './debug-logger';
import { getTrustedLingmanYoutubeUrl } from './lingman_youtube';
import { peekYoutubeCatalogScreenSnapshot, revalidateYoutubeChannelCatalog, type YoutubeCatalogScreenSnapshot } from './youtube_catalog_client';

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
  const playlist = catalog?.playlists.find((item) => item.id === playlistId);
  const videos = useMemo(() => catalog?.videos.filter((video) => video.playlistIds.includes(playlistId)) ?? [], [catalog, playlistId]);
  const copy = {
    playAll: triLang(lang, { ru: 'Воспроизвести всё', uk: 'Відтворити все', en: 'Play all', es: 'Reproducir todo', 'pt-BR': 'Reproduzir tudo', vi: 'Phát tất cả', id: 'Putar semua', tr: 'Tümünü oynat', pl: 'Odtwórz wszystko' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    videos: triLang(lang, { ru: 'видео', uk: 'відео', en: 'videos', es: 'videos', 'pt-BR': 'vídeos', vi: 'video', id: 'video', tr: 'video', pl: 'filmów' }),
  };

  useEffect(() => {
    if (!channelId) { console.warn('[VIDEO-PLAYLIST] нет channelId, каталог не запрашиваем'); setLoading(false); return; }
    let cancelled = false;
    // зачем (владелец 01.10): нет экрана «видео недоступны» — при пустом результате
    // тихо повторяем до 5 раз с паузой 20 с, пока показан скелетон.
    const hasPlaylist = () => !!catalogRef.current?.playlists.some((item) => item.id === playlistId);
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

  const subtitle = playlist ? `${playlist.itemCount} ${copy.videos}${catalog?.channel.displayName ? ` · ${catalog.channel.displayName}` : ''}` : '';

  return (
    <ScreenGradient artBackdrop="home">
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView testID="youtube-playlist-detail" style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topbar}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => safeRouterBack(router, '/lingman_videos' as any)} style={[styles.back, { backgroundColor: g.card, borderColor: g.glassEdge }]}><Ionicons name="arrow-back" size={20} color={g.text} /></TouchableOpacity>
        </View>
        {!playlist ? <View testID="youtube-playlist-skeleton" style={styles.loading}><SkeletonBlock width="70%" height={32} borderRadius={10} /><SkeletonBlock width="40%" height={18} borderRadius={8} /><SkeletonBlock width="100%" height={48} borderRadius={24} /><SkeletonBlock width="100%" height={180} borderRadius={16} /><SkeletonBlock width="100%" height={180} borderRadius={16} /></View> : (
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
            )) : <View style={styles.loading}><SkeletonBlock width="100%" height={180} borderRadius={16} /><SkeletonBlock width="100%" height={180} borderRadius={16} /></View>}</View>
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
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, // guard-ok: тонкая 1 px кромка круглой кнопки, как `.rb` макета
  loading: { gap: 14, marginTop: 14 },
  content: { paddingBottom: 32 },
  title: { marginTop: 14, fontSize: 30, lineHeight: 36, fontWeight: '700' },
  subtitle: { marginTop: 4, fontSize: 16, lineHeight: 21, fontWeight: '400' },
  playAll: { minHeight: 48, marginTop: 18, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  playAllText: { fontSize: 16, fontWeight: '700' },
  videoList: { marginTop: 20 },
});
