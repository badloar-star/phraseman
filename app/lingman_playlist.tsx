import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import YoutubeVideoCard from '../components/youtube/YoutubeVideoCard';
import YoutubeInlinePlayer from '../components/youtube/YoutubeInlinePlayer';
import { ExpandableText } from '../components/text-integrity';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { captureAccountGeneration } from './account_generation';
import { safeRouterBack } from './navigation_back';
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
  const { theme: t } = useTheme();
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
    playAll: triLang(lang, { ru: 'Воспроизвести всё', uk: 'Відтворити все', es: 'Play all', 'pt-BR': 'Reproduzir tudo', vi: 'Phát tất cả', id: 'Putar semua', tr: 'Tümünü oynat', pl: 'Odtwórz wszystko' }),
    empty: triLang(lang, { ru: 'Видео этого плейлиста пока недоступны.', uk: 'Відео цього плейлиста поки недоступні.', es: 'Playlist videos are not available yet.', 'pt-BR': 'Os vídeos ainda não estão disponíveis.', vi: 'Video chưa khả dụng.', id: 'Video belum tersedia.', tr: 'Videolar henüz kullanılamıyor.', pl: 'Filmy nie są jeszcze dostępne.' }),
  };

  useEffect(() => {
    if (!channelId) { setLoading(false); return; }
    void revalidateYoutubeChannelCatalog({ channelId, token, previous: catalogRef.current, commit: (next) => { catalogRef.current = next; setCatalog(next); } })
      .then((next) => { if (next) { catalogRef.current = next; setCatalog(next); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channelId, token]);

  const openVideo = (video: (typeof videos)[number]) => setActiveVideoId(video.id);
  const closeVideo = useCallback(() => setActiveVideoId(null), []);
  const playAll = () => {
    if (!playlist) return;
    const url = trustedPlaylistUrl(playlist.url, playlist.id);
    if (url) void Linking.openURL(url);
  };

  return (
    <ScreenGradient artBackdrop="home">
      <SafeAreaView testID="youtube-playlist-detail" style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeRouterBack(router, '/lingman_videos' as any)} style={[styles.back, { backgroundColor: t.bgCard }]}><Ionicons name="chevron-back" size={24} color={t.textPrimary} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: t.textPrimary }]}>{playlist?.title ?? 'YouTube'}</Text>
        </View>
        {loading && !playlist ? <View style={styles.loading}><SkeletonBlock width="100%" height={210} borderRadius={22} /><SkeletonBlock width="70%" height={24} borderRadius={10} /></View> : playlist ? (
          <ScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={[styles.cover, { backgroundColor: t.bgCard }]}>
              {playlist.thumbnailUrl ? <Image source={{ uri: playlist.thumbnailUrl }} style={styles.coverImage} contentFit="cover" /> : <View style={[styles.coverImage, styles.coverFallback]}><Ionicons name="albums-outline" size={42} color={t.accent} /></View>}
            </View>
            <Text style={[styles.title, { color: t.textPrimary }]}>{playlist.title}</Text>
            {!!playlist.description && <ExpandableText testID="youtube-playlist-description" provenance="external" text={playlist.description} previewCharacterBudget={260} style={[styles.description, { color: t.textMuted }]} />}
            <TouchableOpacity testID="youtube-playlist-play-all" accessibilityRole="button" accessibilityLabel={copy.playAll} onPress={playAll} style={[styles.playAll, { backgroundColor: t.accent }]}><Ionicons name="play" size={18} color="#071015" /><Text style={styles.playAllText}>{copy.playAll}</Text></TouchableOpacity>
            <View style={styles.videoList}>{videos.length ? videos.map((video) => (
              <YoutubeVideoCard
                key={video.id}
                video={video}
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
            )) : <Text style={[styles.empty, { color: t.textMuted }]}>{copy.empty}</Text>}</View>
          </ScrollView>
        ) : <Text style={[styles.empty, { color: t.textMuted }]}>{copy.empty}</Text>}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '900' },
  loading: { gap: 14 },
  content: { paddingBottom: 32 },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: 22, overflow: 'hidden' },
  coverImage: { ...StyleSheet.absoluteFillObject },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 17, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  description: { marginTop: 8, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  playAll: { minHeight: 48, marginTop: 16, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  playAllText: { color: '#071015', fontSize: 14, fontWeight: '900' },
  videoList: { marginTop: 18 },
  empty: { paddingVertical: 40, textAlign: 'center', fontSize: 14, fontWeight: '800' },
});
