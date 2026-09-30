import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { VideoStateBlock } from '../components/video/VideoGlassKit';
import SkeletonBlock from '../components/SkeletonShimmer';
import YoutubeVideoCard from '../components/youtube/YoutubeVideoCard';
import YoutubeInlinePlayer from '../components/youtube/YoutubeInlinePlayer';
import { ExpandableText } from '../components/text-integrity';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useRuntimeActive } from '../hooks/use_runtime_active';
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
  const screenRuntimeActive = useRuntimeActive(true);
  const token = useMemo(() => captureAccountGeneration(), []);
  const initial = peekYoutubeCatalogScreenSnapshot(token);
  const [catalog, setCatalog] = useState<YoutubeCatalogScreenSnapshot | null>(initial?.channel.id === channelId ? initial : null);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const [loading, setLoading] = useState(!catalog);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const playlist = catalog?.playlists.find((item) => item.id === playlistId);
  const videos = useMemo(() => catalog?.videos.filter((video) => video.playlistIds.includes(playlistId)) ?? [], [catalog, playlistId]);
  const copy = {
    playAll: triLang(lang, { ru: 'Воспроизвести всё', uk: 'Відтворити все', en: 'Play all', es: 'Reproducir todo', 'pt-BR': 'Reproduzir tudo', vi: 'Phát tất cả', id: 'Putar semua', tr: 'Tümünü oynat', pl: 'Odtwórz wszystko' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    videos: triLang(lang, { ru: 'видео', uk: 'відео', en: 'videos', es: 'videos', 'pt-BR': 'vídeos', vi: 'video', id: 'video', tr: 'video', pl: 'filmów' }),
    empty: triLang(lang, { ru: 'Видео этого плейлиста пока недоступны.', uk: 'Відео цього плейлиста поки недоступні.', en: 'Playlist videos are not available yet.', es: 'Los vídeos de esta lista aún no están disponibles.', 'pt-BR': 'Os vídeos ainda não estão disponíveis.', vi: 'Video chưa khả dụng.', id: 'Video belum tersedia.', tr: 'Videolar henüz kullanılamıyor.', pl: 'Filmy nie są jeszcze dostępne.' }),
  };

  useEffect(() => {
    if (!channelId) { setLoading(false); return; }
    void revalidateYoutubeChannelCatalog({ channelId, token, previous: catalogRef.current, commit: (next) => { catalogRef.current = next; setCatalog(next); } })
      .then((next) => { if (next) { catalogRef.current = next; setCatalog(next); } })
      .catch((error: unknown) => { DebugLogger.error('[VIDEO-PLAYLIST]:revalidate', error, 'warning'); })
      .finally(() => setLoading(false));
  }, [channelId, token]);

  const openVideo = (video: (typeof videos)[number]) => setActiveVideoId(video.id);
  const closeVideo = useCallback(() => setActiveVideoId(null), []);
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => safeRouterBack(router, '/lingman_videos' as any)} style={[styles.back, { backgroundColor: g.card, borderColor: g.glassEdge }]}><Ionicons name="chevron-back" size={22} color={g.text} /></TouchableOpacity>
        </View>
        {loading && !playlist ? <View style={styles.loading}><SkeletonBlock width="70%" height={32} borderRadius={10} /><SkeletonBlock width="40%" height={18} borderRadius={8} /><SkeletonBlock width="100%" height={48} borderRadius={24} /></View> : playlist ? (
          <ScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{playlist.title}</Text>
            <Text style={[styles.subtitle, { color: g.secondary }]}>{subtitle}</Text>
            {!!playlist.description && <ExpandableText testID="youtube-playlist-description" provenance="external" text={playlist.description} previewCharacterBudget={260} style={[styles.description, { color: g.secondary }]} />}
            {videos.length ? <TouchableOpacity testID="youtube-playlist-play-all" accessibilityRole="button" accessibilityLabel={copy.playAll} onPress={playAll} activeOpacity={0.85} style={[styles.playAll, { backgroundColor: g.accent }]}><Ionicons name="play" size={20} color={g.ctaInk} /><Text style={[styles.playAllText, { color: g.accentInk }]}>{copy.playAll}</Text></TouchableOpacity> : null}
            <View style={styles.videoList}>{videos.length ? videos.map((video) => (
              <YoutubeVideoCard
                key={video.id}
                video={video}
                compact
                highlighted={video.id === activeVideoId}
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
            )) : <VideoStateBlock g={g} icon="play" text={copy.empty} style={styles.emptyState} />}</View>
          </ScrollView>
        ) : <VideoStateBlock g={g} icon="play" text={copy.empty} style={styles.emptyState} />}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center' },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, // guard-ok: тонкая 1 px кромка круглой кнопки, как `.rb` макета
  loading: { gap: 14, marginTop: 14 },
  content: { paddingBottom: 32 },
  title: { marginTop: 14, fontSize: 30, lineHeight: 36, fontWeight: '700' },
  subtitle: { marginTop: 4, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  description: { marginTop: 10, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  playAll: { minHeight: 48, marginTop: 18, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  playAllText: { fontSize: 17, fontWeight: '700' },
  videoList: { marginTop: 20 },
  emptyState: { paddingTop: 96 },
});
