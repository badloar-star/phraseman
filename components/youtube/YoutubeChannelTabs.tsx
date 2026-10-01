import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

export type YoutubeChannelTab = 'home' | 'playlists';

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
  };
  return (
    <View style={[styles.wrap, { borderBottomColor: g.glassEdge }]}>
      {/* зачем (владелец 01.10): вкладки «Все видео» нет — канал показывает «Главная» и «Плейлисты». */}
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
            // зачем (эмулятор 30.09): в «Акценте/Максимуме» активная черта — цвет темы, как всё
            // выбранное рядом (таб-бар, кнопки); в «Спокойно» — прежняя нейтральная.
            style={[styles.tab, active && { borderBottomWidth: 2, borderBottomColor: g.level === 'accent' || g.level === 'max' ? g.accent : g.text, marginBottom: -1 }]}
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
