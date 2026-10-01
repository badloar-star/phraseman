import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubePlaylistSnapshot } from '../../shared/youtube_catalog_contract';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { VideoPlayBadge } from '../video/VideoGlassKit';

/** Строка плейлиста по макету `.plrow`: стопка-обложка слева, название и «N видео», шеврон; без карточки — только тонкая линия снизу. */
export default function YoutubePlaylistRow({ playlist, onPress }: { playlist: YoutubePlaylistSnapshot; onPress: () => void }) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const countLabel = triLang(lang, { ru: 'видео', uk: 'відео', en: 'videos', es: 'videos', 'pt-BR': 'vídeos', vi: 'video', id: 'video', tr: 'video', pl: 'filmów' });
  return (
    <TouchableOpacity testID="youtube-playlist-row" accessibilityRole="button" accessibilityLabel={`${playlist.title}, ${playlist.itemCount} ${countLabel}`} onPress={onPress} activeOpacity={0.86} style={[styles.row, { borderBottomColor: g.line }]}>
      <View style={styles.stack}>
        <View style={[styles.imageWrap, { backgroundColor: g.opaqueControl, borderColor: g.glassEdge }]}>
          {playlist.thumbnailUrl
            ? <Image accessible={false} source={{ uri: playlist.thumbnailUrl }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" recyclingKey={playlist.id} />
            : <Ionicons name="albums-outline" size={24} color={g.secondary} />}
          <VideoPlayBadge small />
        </View>
        <View style={[styles.stackOne, { backgroundColor: g.opaqueControl }]} /><View style={[styles.stackTwo, { backgroundColor: g.opaqueCard }]} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: g.text }]}>{playlist.title}</Text>
        <Text style={[styles.count, { color: g.secondary }]}>{playlist.itemCount} {countLabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={g.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1 }, // guard-ok: тонкая разделительная линия строки, как `.plrow` макета
  stack: { width: 128, aspectRatio: 16 / 9, marginTop: 8 },
  imageWrap: { ...StyleSheet.absoluteFillObject, borderRadius: 12, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', zIndex: 3 }, // guard-ok: тонкая 1 px кромка кадра, как `.thumb` макета
  image: { ...StyleSheet.absoluteFillObject },
  stackOne: { position: 'absolute', left: 8, right: 8, top: -6, height: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, zIndex: 2 },
  stackTwo: { position: 'absolute', left: 16, right: 16, top: -11, height: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, zIndex: 1 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  count: { marginTop: 4, fontSize: 13, fontWeight: '700' },
});
