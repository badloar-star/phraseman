import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TapScale from '../components/TapScale';
import {
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SkeletonBlock from '../components/SkeletonShimmer';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import {
  formatLingmanVideoDate,
  getActiveYoutubeChannel,
  getTrustedLingmanYoutubeUrl,
  getLingmanYoutubeSnapshot,
  LingmanYoutubeSnapshot,
  LingmanYoutubeVideo,
  markLingmanYoutubeCatalogSeen,
} from './lingman_youtube';
import { getLingmanYoutubeChrome } from './lingman_youtube_chrome';

function formatViews(count?: number): string {
  if (!Number.isFinite(count)) return '';
  const value = Number(count);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

export default function LingmanVideosScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const [snapshot, setSnapshot] = useState<LingmanYoutubeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Активный канал (дефолт PHRASEMAN или override из «Пульта»). Обновляется при
  // каждой загрузке снапшота — тогда же, когда могла прийти новая конфигурация.
  const [channel, setChannel] = useState(() => getActiveYoutubeChannel());
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);

  const copy = useMemo(() => ({
    title: triLang(lang, {
      ru: 'Видео PHRASEMAN',
      uk: 'Видео PHRASEMAN',
      es: 'PHRASEMAN videos',
      'pt-BR': 'PHRASEMAN videos',
      vi: 'PHRASEMAN videos',
      id: 'PHRASEMAN videos',
      tr: 'PHRASEMAN videos',
      pl: 'PHRASEMAN videos',
    }),
    subtitle: triLang(lang, {
      ru: 'Видео тренажёры для практики фраз на слух',
      uk: 'Видео тренажёры для практики фраз на слух',
      es: 'Video trainers to practice phrases by ear',
      'pt-BR': 'Video trainers to practice phrases by ear',
      vi: 'Video trainers to practice phrases by ear',
      id: 'Video trainers to practice phrases by ear',
      tr: 'Video trainers to practice phrases by ear',
      pl: 'Video trainers to practice phrases by ear',
    }),
    watch: triLang(lang, {
      ru: 'Смотреть',
      uk: 'Смотреть',
      es: 'Watch',
      'pt-BR': 'Watch',
      vi: 'Watch',
      id: 'Watch',
      tr: 'Watch',
      pl: 'Watch',
    }),
    openYoutube: triLang(lang, {
      ru: 'YouTube',
      uk: 'YouTube',
      es: 'YouTube',
      'pt-BR': 'YouTube',
      vi: 'YouTube',
      id: 'YouTube',
      tr: 'YouTube',
      pl: 'YouTube',
    }),
    newVideo: triLang(lang, {
      ru: 'Новое',
      uk: 'Нове',
      es: 'New',
      'pt-BR': 'New',
      vi: 'New',
      id: 'New',
      tr: 'New',
      pl: 'New',
    }),
    empty: triLang(lang, {
      ru: 'Видео пока не загрузились. Потяни вниз, чтобы обновить.',
      uk: 'Видео пока не загрузились. Потяни вниз, чтобы обновить.',
      es: 'Videos are not loaded yet. Pull down to refresh.',
      'pt-BR': 'Videos are not loaded yet. Pull down to refresh.',
      vi: 'Videos are not loaded yet. Pull down to refresh.',
      id: 'Videos are not loaded yet. Pull down to refresh.',
      tr: 'Videos are not loaded yet. Pull down to refresh.',
      pl: 'Videos are not loaded yet. Pull down to refresh.',
    }),
    fallback: triLang(lang, {
      ru: 'Показываю сохраненный список, обновление канала временно недоступно.',
      uk: 'Показываю сохраненный список, обновление канала временно недоступно.',
      es: 'Showing the saved list; channel refresh is temporarily unavailable.',
      'pt-BR': 'Showing the saved list; channel refresh is temporarily unavailable.',
      vi: 'Showing the saved list; channel refresh is temporarily unavailable.',
      id: 'Showing the saved list; channel refresh is temporarily unavailable.',
      tr: 'Showing the saved list; channel refresh is temporarily unavailable.',
      pl: 'Showing the saved list; channel refresh is temporarily unavailable.',
    }),
    views: triLang(lang, {
      ru: 'просмотров',
      uk: 'просмотров',
      es: 'views',
      'pt-BR': 'views',
      vi: 'views',
      id: 'views',
      tr: 'views',
      pl: 'views',
    }),
  }), [lang]);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const next = await getLingmanYoutubeSnapshot();
      setSnapshot(next);
      setChannel(getActiveYoutubeChannel());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const openExternalUrl = (rawUrl: string, fallbackVideoId?: string) => {
    const trustedUrl = getTrustedLingmanYoutubeUrl(rawUrl, fallbackVideoId);
    if (!trustedUrl) return;
    hapticTap();
    void Linking.openURL(trustedUrl);
  };

  const openVideo = (video: LingmanYoutubeVideo) => {
    hapticTap();
    const videoIndex = videos.findIndex((item) => item.id === video.id);
    const unreadCount = snapshot?.unreadCount ?? 0;
    if (videoIndex >= 0 && videoIndex < Math.max(1, unreadCount)) {
      void markLingmanYoutubeCatalogSeen(video.id);
      setSnapshot((current) => current ? { ...current, unreadCount: Math.min(current.unreadCount, videoIndex) } : current);
    }
    router.push({
      pathname: '/lingman_video_player',
      params: {
        id: video.id,
        title: video.title,
        watchUrl: video.watchUrl,
      },
    } as any);
  };

  const renderVideo = ({ item, index }: { item: LingmanYoutubeVideo; index: number }) => {
    const views = formatViews(item.viewCount);
    const isNew = index < (snapshot?.unreadCount ?? 0);
    return (
      <TouchableOpacity
        testID="lingman-video-card"
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel={`${copy.watch}: ${item.title}`}
        onPress={() => openVideo(item)}
        style={[styles.videoRow, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}
      >
        <View style={styles.thumbWrap}>
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} contentFit="cover" transition={120} />
          <View style={styles.thumbScrim} />
          <View style={[styles.thumbPlay, { backgroundColor: chrome.accent, borderColor: chrome.cardBg }]}>
            <Ionicons name="play" size={18} color={chrome.iconOnAccent} />
          </View>
          {isNew && (
            <View style={[styles.latestBadge, { backgroundColor: chrome.chipBg, borderColor: chrome.accent }]}>
              <Text style={[styles.latestBadgeText, { color: chrome.accent }]}>{copy.newVideo}</Text>
            </View>
          )}
        </View>
        <View style={styles.videoBody}>
          <Text style={[styles.videoTitle, { color: t.textPrimary, fontSize: Math.max(15, f.bodyLg) }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.videoMeta, { color: t.textMuted }]} numberOfLines={1}>
            {formatLingmanVideoDate(item.publishedAt)}
            {views ? `  ·  ${views} ${copy.views}` : ''}
          </Text>
          <View style={styles.videoActions}>
            <TouchableOpacity
              testID="lingman-video-watch"
              activeOpacity={0.84}
              onPress={() => openVideo(item)}
              style={[styles.watchButton, { backgroundColor: chrome.accent }]}
            >
              <Ionicons name="play" size={15} color={chrome.actionText} />
              <Text style={[styles.watchButtonText, { color: chrome.actionText }]}>{copy.watch}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="lingman-video-open-youtube"
              activeOpacity={0.78}
              onPress={(event) => {
                event.stopPropagation?.();
                openExternalUrl(item.watchUrl, item.id);
              }}
              style={[styles.youtubeButton, { borderColor: chrome.quietButtonBorder, backgroundColor: chrome.quietButtonBg }]}
            >
              <Ionicons name="open-outline" size={15} color={chrome.accent} />
              <Text style={[styles.youtubeButtonText, { color: t.textPrimary }]}>{copy.openYoutube}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const videos = snapshot?.videos ?? [];

  return (
    <ScreenGradient artBackdrop="home">
      <SafeAreaView testID="lingman-videos-screen" style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TapScale
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              hapticTap();
              safeRouterBack(router, '/(tabs)/home' as any);
            }}
            style={[styles.back, { backgroundColor: chrome.quietButtonBg, borderColor: chrome.quietButtonBorder }]}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </TapScale>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.max(22, f.h1) }]} numberOfLines={1}>
              {channel.isOverride ? `${triLang(lang, { ru: 'Видео', uk: 'Видео', es: 'Videos', 'pt-BR': 'Vídeos', vi: 'Video', id: 'Video', tr: 'Videolar', pl: 'Wideo' })} ${channel.displayName}` : copy.title}
            </Text>
            <Text style={[styles.subtitle, { color: t.textMuted }]} numberOfLines={2}>
              {copy.subtitle}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={[chrome.accentFaint, chrome.cardBg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.channelStrip, { borderColor: chrome.cardBorder }]}
        >
          <View style={[styles.channelIcon, { backgroundColor: chrome.accent }]}>
            <Ionicons name="play" size={26} color={chrome.iconOnAccent} />
          </View>
          <View style={styles.channelText}>
            <Text style={[styles.channelTitle, { color: t.textPrimary }]}>{channel.displayName}</Text>
            <Text style={[styles.channelSub, { color: t.textMuted }]} numberOfLines={1}>{channel.handle}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => {
              hapticTap();
              openExternalUrl(channel.url);
            }}
            style={styles.channelOpen}
          >
            <Ionicons name="open-outline" size={19} color={t.textPrimary} />
          </TouchableOpacity>
        </LinearGradient>

        {snapshot?.error ? (
          <View testID="lingman-videos-fallback-notice" style={[styles.notice, { backgroundColor: chrome.noticeBg, borderColor: chrome.noticeBorder }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={chrome.accent} />
            <Text style={[styles.noticeText, { color: t.textSecond }]}>{copy.fallback}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={{ gap: 14, paddingHorizontal: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={`lingman-video-skeleton-${i}`} width="100%" height={96} borderRadius={18} />
            ))}
          </View>
        ) : (
          <FlashList
            testID="lingman-videos-list"
            data={videos}
            keyExtractor={(item) => item.id}
            renderItem={renderVideo}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListEmptyComponent={(
              <View testID="lingman-videos-empty" style={[styles.empty, { borderColor: chrome.cardBorder, backgroundColor: chrome.cardBg }]}>
                <Ionicons name="play-circle-outline" size={34} color={chrome.accent} />
                <Text style={[styles.emptyText, { color: t.textMuted }]}>{copy.empty}</Text>
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} tintColor={chrome.accent} onRefresh={() => void load('refresh')} />}
          />
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  channelStrip: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelText: {
    flex: 1,
    minWidth: 0,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  channelSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  channelOpen: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    paddingBottom: 28,
    gap: 12,
  },
  videoRow: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#050505',
  },
  thumb: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  thumbPlay: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    width: 42,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  latestBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  videoBody: {
    padding: 14,
  },
  videoTitle: {
    fontWeight: '900',
    lineHeight: 21,
  },
  videoMeta: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '800',
  },
  videoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  watchButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  watchButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  youtubeButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  youtubeButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  empty: {
    minHeight: 180,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});
