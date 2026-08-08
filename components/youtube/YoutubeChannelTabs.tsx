import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';

export type YoutubeChannelTab = 'home' | 'playlists';

export default function YoutubeChannelTabs({ value, onChange }: {
  value: YoutubeChannelTab;
  onChange: (tab: YoutubeChannelTab) => void;
}) {
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const labels = {
    home: triLang(lang, { ru: 'Главная', uk: 'Головна', es: 'Home', 'pt-BR': 'Início', vi: 'Trang chính', id: 'Beranda', tr: 'Ana sayfa', pl: 'Główna' }),
    playlists: triLang(lang, { ru: 'Плейлисты', uk: 'Плейлисти', es: 'Playlists', 'pt-BR': 'Playlists', vi: 'Danh sách', id: 'Playlist', tr: 'Oynatma listeleri', pl: 'Playlisty' }),
    all: triLang(lang, { ru: 'Все видео', uk: 'Усі відео', es: 'All videos', 'pt-BR': 'Todos os vídeos', vi: 'Tất cả video', id: 'Semua video', tr: 'Tüm videolar', pl: 'Wszystkie filmy' }),
  };
  return (
    <View style={[styles.wrap, { backgroundColor: t.bgCard }]}>
      {(['home', 'playlists'] as const).map((tab) => {
        const active = value === tab;
        return (
          <TouchableOpacity
            key={tab}
            testID={`youtube-tab-${tab}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={labels[tab]}
            onPress={() => onChange(tab)}
            style={[styles.tab, active && { backgroundColor: t.accentBg }]}
          >
            <Text style={[styles.label, { color: active ? t.accent : t.textMuted }]}>{labels[tab]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 16, padding: 4, marginBottom: 12 },
  tab: { minHeight: 44, flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  label: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
});
