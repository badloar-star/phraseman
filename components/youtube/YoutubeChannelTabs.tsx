import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

export type YoutubeChannelTab = 'home' | 'all' | 'playlists';

export default function YoutubeChannelTabs({ value, onChange }: {
  value: YoutubeChannelTab;
  onChange: (tab: YoutubeChannelTab) => void;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const labels = {
    home: triLang(lang, { ru: 'Главная', uk: 'Головна', en: 'Home', es: 'Inicio', 'pt-BR': 'Início', vi: 'Trang chính', id: 'Beranda', tr: 'Ana sayfa', pl: 'Główna' }),
    playlists: triLang(lang, { ru: 'Плейлисты', uk: 'Плейлисти', en: 'Playlists', es: 'Listas de reproducción', 'pt-BR': 'Playlists', vi: 'Danh sách', id: 'Playlist', tr: 'Oynatma listeleri', pl: 'Playlisty' }),
    all: triLang(lang, { ru: 'Все видео', uk: 'Усі відео', en: 'All videos', es: 'Todos los vídeos', 'pt-BR': 'Todos os vídeos', vi: 'Tất cả video', id: 'Semua video', tr: 'Tüm videolar', pl: 'Wszystkie filmy' }),
  };
  return (
    <View style={[styles.wrap, { borderBottomColor: g.glassEdge }]}>
      {(['home', 'all', 'playlists'] as const).map((tab) => {
        const active = value === tab;
        return (
          <TouchableOpacity
            key={tab}
            testID={`youtube-tab-${tab}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={labels[tab]}
            onPress={() => onChange(tab)}
            style={[styles.tab, active && { borderBottomWidth: 2, borderBottomColor: g.text, marginBottom: -1 }]}
          >
            <Text style={[styles.label, { color: active ? g.text : g.secondary }]}>{labels[tab]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderBottomWidth: 1, marginTop: 18, marginBottom: 4 }, // guard-ok: тонкая линия под вкладками, как `.tabs3` макета
  tab: { flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
