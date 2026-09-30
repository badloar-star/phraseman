import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubeVideoSnapshot } from '../../shared/youtube_catalog_contract';
import { formatLingmanVideoDate } from '../../app/lingman_youtube';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { VideoPlayBadge } from '../video/VideoGlassKit';
import { formatViewCount } from '../video/formatViewCount';

export default function YoutubeVideoCard({ video, onWatch, highlighted = false, inlinePlayer, belowPlayer, compact = false }: {
  video: YoutubeVideoSnapshot;
  onWatch: () => void;
  highlighted?: boolean;
  inlinePlayer?: React.ReactNode;
  belowPlayer?: React.ReactNode;
  compact?: boolean;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const compactLayout = compact && !inlinePlayer;
  const watch = triLang(lang, { ru: 'Смотреть', uk: 'Дивитися', en: 'Watch', es: 'Ver', 'pt-BR': 'Assistir', vi: 'Xem', id: 'Tonton', tr: 'İzle', pl: 'Oglądaj' });
  const stateLabel = video.state === 'live'
    ? triLang(lang, { ru: 'Сейчас в эфире', uk: 'Зараз наживо', en: 'Live now', es: 'En directo ahora', 'pt-BR': 'Ao vivo', vi: 'Đang trực tiếp', id: 'Sedang live', tr: 'Şimdi canlı', pl: 'Na żywo' })
    : video.state === 'upcoming'
      ? triLang(lang, { ru: 'Ожидается премьера', uk: 'Очікується прем’єра', en: 'Premiere upcoming', es: 'Próximo estreno', 'pt-BR': 'Estreia em breve', vi: 'Sắp công chiếu', id: 'Segera tayang perdana', tr: 'Prömiyer yakında', pl: 'Premiera wkrótce' })
      : '';
  const views = formatViewCount(video.viewCount, lang);
  const content = (
    <>
      <View style={[styles.thumbWrap, compactLayout && styles.thumbCompact, { borderColor: g.glassEdge }]}>
        {inlinePlayer ?? (
          <>
            <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} contentFit="cover" transition={120} />
            <View style={styles.scrim} />
            {/* зачем: `.thumb .pl` макета — круглая «play» слева-снизу кадра; кадр целиком и есть кнопка «Смотреть». */}
            <VideoPlayBadge small={compactLayout} />
          </>
        )}
      </View>
      <View style={[styles.body, compactLayout && styles.bodyCompact, inlinePlayer && styles.bodyPlaying]}>
        {!!stateLabel && <View style={[styles.state, { backgroundColor: g.selected }]}><Ionicons name={video.state === 'live' ? 'radio' : 'time-outline'} size={13} color={g.text} /><Text style={[styles.stateText, { color: g.text }]}>{stateLabel}</Text></View>}
        <Text style={[styles.title, compactLayout && styles.titleCompact, { color: g.text }]}>{video.title}</Text>
        {!!(video.publishedAt || views) && <Text style={[styles.meta, { color: g.secondary }]}>{video.publishedAt ? formatLingmanVideoDate(video.publishedAt) : ''}{views ? `${video.publishedAt ? ' · ' : ''}${views}` : ''}</Text>}
      </View>
    </>
  );

  const card = inlinePlayer ? (
    <View testID="lingman-video-card" style={[styles.card, styles.playingCard, { backgroundColor: g.card, borderColor: highlighted ? g.cta : g.glassEdge }]}>
      {content}
    </View>
  ) : (
    <TouchableOpacity
      testID="lingman-video-card"
      accessibilityRole="button"
      accessibilityLabel={`${watch}: ${video.title}${stateLabel ? `. ${stateLabel}` : ''}`}
      onPress={onWatch}
      activeOpacity={0.86}
      /* зачем не функция: TouchableOpacity не передаёт `pressed` — ветка
         нажатия была мёртвой. Отклик даёт activeOpacity. */
      style={[styles.card, compactLayout ? styles.compactCard : styles.gridCard, { borderColor: highlighted ? g.cta : 'transparent' }]}
    >
      {content}
    </TouchableOpacity>
  );

  return <>{card}{belowPlayer}</>;
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  gridCard: { borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  compactCard: { borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  playingCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  thumbWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#050505', borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  thumbCompact: { width: 150, aspectRatio: 16 / 9, borderRadius: 12 },
  thumb: { ...StyleSheet.absoluteFillObject },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.10)' },
  state: { alignSelf: 'flex-start', minHeight: 27, borderRadius: 14, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 9 },
  stateText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  body: { paddingTop: 10, paddingBottom: 2 },
  bodyCompact: { flex: 1, minWidth: 0, paddingTop: 0, paddingBottom: 0 },
  bodyPlaying: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  titleCompact: { fontSize: 16, lineHeight: 21 },
  meta: { marginTop: 4, fontSize: 14, fontWeight: '600' },
});
