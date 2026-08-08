import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubePlaylistSnapshot } from '../../shared/youtube_catalog_contract';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';

export default function YoutubePlaylistRow({ playlist, onPress }: { playlist: YoutubePlaylistSnapshot; onPress: () => void }) {
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const countLabel = triLang(lang, { ru: 'видео', uk: 'відео', es: 'videos', 'pt-BR': 'vídeos', vi: 'video', id: 'video', tr: 'video', pl: 'filmów' });
  return (
    <TouchableOpacity testID="youtube-playlist-row" accessibilityRole="button" accessibilityLabel={`${playlist.title}, ${playlist.itemCount} ${countLabel}`} onPress={onPress} activeOpacity={0.86} style={[styles.row, { backgroundColor: t.bgCard }]}>
      <View style={styles.imageWrap}>
        {playlist.thumbnailUrl ? <Image source={{ uri: playlist.thumbnailUrl }} style={styles.image} contentFit="cover" /> : <View style={[styles.image, styles.fallback, { backgroundColor: t.accentBg }]}><Ionicons name="albums-outline" size={25} color={t.accent} /></View>}
        <View style={styles.stackOne} /><View style={styles.stackTwo} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: t.textPrimary }]}>{playlist.title}</Text>
        <Text style={[styles.count, { color: t.textMuted }]}>{playlist.itemCount} {countLabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 92, borderRadius: 19, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  imageWrap: { width: 112, aspectRatio: 16 / 9 },
  image: { ...StyleSheet.absoluteFillObject, borderRadius: 13, zIndex: 3 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  stackOne: { position: 'absolute', left: 8, right: 8, top: -4, height: 8, borderRadius: 7, backgroundColor: 'rgba(120,120,120,0.25)', zIndex: 2 },
  stackTwo: { position: 'absolute', left: 15, right: 15, top: -8, height: 8, borderRadius: 7, backgroundColor: 'rgba(120,120,120,0.14)', zIndex: 1 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, lineHeight: 19, fontWeight: '900' },
  count: { marginTop: 5, fontSize: 12, fontWeight: '700' },
});
