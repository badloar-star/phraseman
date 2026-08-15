import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubeVideoSnapshot } from '../../shared/youtube_catalog_contract';
import { formatLingmanVideoDate } from '../../app/lingman_youtube';
import { getLingmanYoutubeChrome } from '../../app/lingman_youtube_chrome';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';

function formatViews(count?: number): string {
  if (!Number.isFinite(count)) return '';
  const value = Number(count);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

export default function YoutubeVideoCard({ video, onWatch, highlighted = false, inlinePlayer }: {
  video: YoutubeVideoSnapshot;
  onWatch: () => void;
  highlighted?: boolean;
  inlinePlayer?: React.ReactNode;
}) {
  const { lang } = useLang();
  const { theme: t, isDark, themeMode } = useTheme();
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);
  const watch = triLang(lang, { ru: 'Смотреть', uk: 'Дивитися', es: 'Watch', 'pt-BR': 'Assistir', vi: 'Xem', id: 'Tonton', tr: 'İzle', pl: 'Oglądaj' });
  const stateLabel = video.state === 'live'
    ? triLang(lang, { ru: 'Сейчас в эфире', uk: 'Зараз наживо', es: 'Live now', 'pt-BR': 'Ao vivo', vi: 'Đang trực tiếp', id: 'Sedang live', tr: 'Şimdi canlı', pl: 'Na żywo' })
    : video.state === 'upcoming'
      ? triLang(lang, { ru: 'Ожидается премьера', uk: 'Очікується прем’єра', es: 'Premiere upcoming', 'pt-BR': 'Estreia em breve', vi: 'Sắp công chiếu', id: 'Segera tayang perdana', tr: 'Prömiyer yakında', pl: 'Premiera wkrótce' })
      : '';
  const views = formatViews(video.viewCount);
  const content = (
    <>
      <View style={styles.thumbWrap}>
        {inlinePlayer ?? (
          <>
            <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} contentFit="cover" transition={120} />
            <View style={styles.scrim} />
            <View style={[styles.play, { backgroundColor: chrome.accent }]}><Ionicons name="play" size={19} color={chrome.actionText} /></View>
            {!!stateLabel && <View style={[styles.state, { backgroundColor: chrome.cardBg }]}><Ionicons name={video.state === 'live' ? 'radio' : 'time-outline'} size={13} color={chrome.accent} /><Text style={[styles.stateText, { color: chrome.accent }]}>{stateLabel}</Text></View>}
          </>
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: t.textPrimary }]}>{video.title}</Text>
        <Text style={[styles.meta, { color: t.textMuted }]}>{video.publishedAt ? formatLingmanVideoDate(video.publishedAt) : stateLabel}{views ? ` · ${views}` : ''}</Text>
      </View>
    </>
  );

  if (inlinePlayer) {
    return (
      <View testID="lingman-video-card" style={[styles.card, { backgroundColor: chrome.cardBg, borderColor: highlighted ? chrome.accent : chrome.cardBorder }]}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID="lingman-video-card"
      accessibilityRole="button"
      accessibilityLabel={`${watch}: ${video.title}${stateLabel ? `. ${stateLabel}` : ''}`}
      onPress={onWatch}
      activeOpacity={0.86}
      style={[styles.card, { backgroundColor: chrome.cardBg, borderColor: highlighted ? chrome.accent : chrome.cardBorder }]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  thumbWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#050505' },
  thumb: { ...StyleSheet.absoluteFillObject },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.10)' },
  play: { position: 'absolute', left: 13, bottom: 12, width: 44, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  state: { position: 'absolute', right: 11, top: 11, minHeight: 27, borderRadius: 14, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  stateText: { fontSize: 10, fontWeight: '900' },
  body: { padding: 14 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '900' },
  meta: { marginTop: 5, fontSize: 12, fontWeight: '700' },
});
