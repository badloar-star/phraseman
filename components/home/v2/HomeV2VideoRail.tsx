import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLang } from '../../LangContext';
import { useV2Palette } from '../../v2/useV2Palette';
import type { LingmanYoutubeVideo } from '../../../app/lingman_youtube';
import { triLang } from '../../../constants/i18n';
import { V2 } from '../../../constants/v2Style';
import { colorWithAlpha } from '../../v2/plateAlpha';
import { HOME_PLATE_ALPHA } from './homePlate';
import { thumbTrace, traceThumbMissing } from '../../../app/thumb_trace';

type Props = {
  videos: readonly LingmanYoutubeVideo[];
  status: 'loading' | 'ready' | 'error';
  ownerActive: boolean;
  onSeeAll: () => void;
};

/** The Home snapshot is already loaded for the unread count; no second feed request. */
export default function HomeV2VideoRail({ videos, status, ownerActive, onSeeAll }: Props) {
  const { lang } = useLang();
  const p = useV2Palette();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const selectedVideo = videos.find((video) => video.id === activeVideoId) ?? null;
  // The WebView module is evaluated only after a deliberate tap, never on Home's first frame.
  const VideoPlayerModal = selectedVideo && ownerActive
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- keep the WebView off Home's first frame
    ? (require('./HomeV2VideoPlayerModal').default as typeof import('./HomeV2VideoPlayerModal').default)
    : null;

  useEffect(() => {
    if (!ownerActive) setActiveVideoId(null);
  }, [ownerActive]);

  const title = triLang(lang, { ru: 'Видео', uk: 'Відео', en: 'Videos', es: 'Vídeos', 'pt-BR': 'Vídeos', vi: 'Video', id: 'Video', tr: 'Videolar', pl: 'Wideo' });
  const seeAll = triLang(lang, { ru: 'Смотреть все', uk: 'Дивитися всі', en: 'See all', es: 'Ver todos', 'pt-BR': 'Ver todos', vi: 'Xem tất cả', id: 'Lihat semua', tr: 'Tümünü gör', pl: 'Zobacz wszystkie' });

  return (
    <View testID="home-v2-video-rail" style={s.section}>
      <View style={s.heading}>
        <Text style={[s.headingText, { color: p.text }]}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={seeAll} onPress={onSeeAll} hitSlop={8} style={s.seeAll}>
          <Text style={[s.seeAllText, { color: p.link }]}>{seeAll}</Text>
          <Ionicons name="chevron-forward" size={15} color={p.link} />
        </Pressable>
      </View>
      {videos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={s.rail} decelerationRate="fast">
          {videos.slice(0, 8).map((video) => (
            <Pressable
              key={video.id}
              testID={`home-v2-video-${video.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${title}: ${video.title}`}
              onPress={() => setActiveVideoId(video.id)}
              style={[s.card, { backgroundColor: colorWithAlpha(p.glassRaised, HOME_PLATE_ALPHA) }]}
            >
              {/* зачем (координатор 12.10, [THUMB]): пустые плитки на кадре home-001 — журнал показывает адрес, источник (кэш/сеть), время и код ответа при ошибке */}
              {video.thumbnailUrl ? null : traceThumbMissing('home_video_rail', video.id, 'thumbnailUrl пуст в данных ленты')}
              <Image source={{ uri: video.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={100} accessible={false} {...thumbTrace('home_video_rail', video.id, video.thumbnailUrl)} />
              <View style={s.cardContent}>
                <Ionicons name="play-circle" size={26} color="#FFFFFF" />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        // зачем (владелец 01.10): рейка не прячется и не пишет «недоступны/нет видео» —
        // при любом статусе без данных те же скелетоны резервной геометрии 246x138.
        // status оставлен в Props для совместимости с Home; повтор загрузки — на стороне Home.
        <View testID="home-v2-video-loading" style={s.placeholderRow} accessibilityLabel={title}>
          <View style={[s.placeholderCard, { backgroundColor: colorWithAlpha(p.glassRaised, HOME_PLATE_ALPHA) }]} />
          <View style={[s.placeholderCard, { backgroundColor: colorWithAlpha(p.glassRaised, HOME_PLATE_ALPHA) }]} />
        </View>
      )}
      {VideoPlayerModal && selectedVideo ? <VideoPlayerModal video={selectedVideo} onClose={() => setActiveVideoId(null)} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 0 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 26, marginBottom: 2 },
  headingText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  seeAll: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  seeAllText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  rail: { gap: 9, paddingRight: V2.screenPad, paddingBottom: 2 },
  card: { width: 246, height: 138, borderRadius: 0, overflow: 'hidden' },
  cardContent: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-start', padding: 8 },
  placeholderRow: { height: 138, flexDirection: 'row', gap: 9, overflow: 'hidden' },
  placeholderCard: { width: 246, height: 138, borderRadius: 0 },
});
