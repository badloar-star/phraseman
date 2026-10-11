import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubePlaylistSnapshot } from '../../shared/youtube_catalog_contract';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useScaledTextStyles } from '../../hooks/useLineScale';

/**
 * Плейлист в сетке «2 колонки» — вариант 1 «Сетка» макета video-redesign.html (#c1, экран «Плейлисты», владелец 11.10).
 *
 * зачем: обложка «стопкой» (две полоски над кадром), под ней название целиком и «N видео». Данные прежние: обложка и счётчик
 * из каталога, тап открывает экран плейлиста.
 */
function YoutubePlaylistGridCardBase({ playlist, onPress }: { playlist: YoutubePlaylistSnapshot; onPress: () => void }) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const styles = useScaledTextStyles(baseStyles);
  const countLabel = triLang(lang, { ru: 'видео', uk: 'відео', en: 'videos', es: 'videos', 'pt-BR': 'vídeos', vi: 'video', id: 'video', tr: 'video', pl: 'filmów' });
  return (
    <TouchableOpacity
      testID="youtube-playlist-row"
      accessibilityRole="button"
      accessibilityLabel={`${playlist.title}, ${playlist.itemCount} ${countLabel}`}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={styles.stack}>
        <View style={[styles.stackTwo, { backgroundColor: g.opaqueCard }]} />
        <View style={[styles.stackOne, { backgroundColor: g.opaqueControl }]} />
        <View style={[styles.cover, { backgroundColor: g.opaqueControl, borderColor: g.glassEdge }]}>{/* guard-ok: тонкая кромка обложки 2.0, как `.th` макета */}
          {playlist.thumbnailUrl
            ? <Image accessible={false} source={{ uri: playlist.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={playlist.id} />
            : <Ionicons name="albums-outline" size={24} color={g.secondary} />}
        </View>
      </View>
      <Text style={[styles.title, { color: g.text }]}>{playlist.title}</Text>
      <Text style={[styles.count, { color: g.secondary }]}>{playlist.itemCount} {countLabel}</Text>
    </TouchableOpacity>
  );
}

export default React.memo(YoutubePlaylistGridCardBase, (prev, next) => prev.playlist === next.playlist && prev.onPress === next.onPress);

const baseStyles = StyleSheet.create({
  // `.stk`: отступ сверху 10 под полоски, они выходят за кадр на 6 и 11.
  stack: { marginTop: 10 },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' }, // guard-ok: тонкая 1 px кромка обложки, как `.th` макета
  stackOne: { position: 'absolute', top: -6, left: 12, right: 12, height: 14, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  stackTwo: { position: 'absolute', top: -11, left: 24, right: 24, height: 14, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  title: { marginTop: 8, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  count: { marginTop: 3, fontSize: 13, lineHeight: 17, fontWeight: '400' },
});
