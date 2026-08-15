import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { YoutubeChannelSnapshot } from '../../shared/youtube_catalog_contract';
import TapScale from '../TapScale';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { getLingmanYoutubeChrome } from '../../app/lingman_youtube_chrome';

export default function YoutubeChannelHeader({ channel, onBack, onOpenChannels, onOpenYoutube }: {
  channel: YoutubeChannelSnapshot;
  onBack: () => void;
  onOpenChannels: () => void;
  onOpenYoutube: () => void;
}) {
  const { lang } = useLang();
  const { theme: t, isDark, themeMode } = useTheme();
  const chrome = getLingmanYoutubeChrome(t, isDark, themeMode);
  const allChannels = triLang(lang, { ru: 'Все наши каналы', uk: 'Усі наші канали', es: 'All our channels', 'pt-BR': 'Todos os nossos canais', vi: 'Tất cả kênh', id: 'Semua kanal kami', tr: 'Tüm kanallarımız', pl: 'Wszystkie nasze kanały' });
  return (
    <View style={styles.topRow}>
        <TapScale accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={[styles.back, { backgroundColor: chrome.quietButtonBg }]}>
          <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
        </TapScale>
        <View style={styles.titleWrap}>
          <Text style={[styles.eyebrow, { color: chrome.accent }]}>YOUTUBE</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>{channel.displayName}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="YouTube" onPress={onOpenYoutube} style={styles.openButton}>
          <Ionicons name="open-outline" size={21} color={t.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity testID="youtube-all-channels" accessibilityRole="button" accessibilityLabel={allChannels} onPress={onOpenChannels} style={[styles.openButton, { backgroundColor: chrome.quietButtonBg, borderRadius: 14 }]}>
          <Ionicons name="people-outline" size={21} color={t.textPrimary} />
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 2, fontSize: 23, fontWeight: '900' },
  openButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
