import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { RowDivider } from '../v2/RowDivider';

// зачем (владелец 11.10, макет video-redesign #c1): третья вкладка «Наборы» заменила плашку «Наборы из видео» сверху.
export type YoutubeChannelTab = 'home' | 'playlists' | 'packs';

export default function YoutubeChannelTabs({ value, onChange }: {
  value: YoutubeChannelTab;
  onChange: (tab: YoutubeChannelTab) => void;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const labels = {
    // зачем (координатор 18.10, Сверка 6/11, предложение Переводчика 98a1f2cf6): «Главная» внутри «Видео» путалась с главной вкладкой приложения — внутренняя вкладка зовётся «Новое» (свежие ролики и премьера); слова той же длины, что «Плейлисты»/«Наборы».
    home: triLang(lang, { ru: 'Новое', uk: 'Нове', en: 'New', es: 'Nuevo', 'pt-BR': 'Novidades', vi: 'Mới', id: 'Terbaru', tr: 'Yeni', pl: 'Nowe' }),
    playlists: triLang(lang, { ru: 'Плейлисты', uk: 'Плейлисти', en: 'Playlists', es: 'Listas de reproducción', 'pt-BR': 'Playlists', vi: 'Danh sách', id: 'Playlist', tr: 'Oynatma listeleri', pl: 'Playlisty' }),
    packs: triLang(lang, { ru: 'Наборы', uk: 'Набори', en: 'Packs', es: 'Packs', 'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy' }),
  };
  return (
    <View style={styles.wrap}>
      <RowDivider edge="bottom" color={g.line} />
      {/* зачем (владелец 01.10): вкладки «Все видео» нет. Владелец 11.10 (video-redesign #c1): третья вкладка — «Наборы». */}
      {(['home', 'playlists', 'packs'] as const).map((tab) => {
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
            style={[styles.tab, active && { borderBottomWidth: 2 /* shadow-ok: подчёркивание активной вкладки — индикатор выбора, не контейнер */, borderBottomColor: g.level === 'accent' || g.level === 'max' ? g.accentGraphic : g.text, marginBottom: -1 }]}
          >
            <Text style={[styles.label, { color: active ? g.text : g.secondary }]}>{labels[tab]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// зачем (Сверка video-001/008, video.html .tabs3): вкладки слева через 22, по ширине текста, подчёркивание 2 px
// под самим словом, линия --line (было: две вкладки растянуты на всю ширину с длинной чертой).
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 22, marginTop: 18, marginBottom: 4 }, // зачем (владелец 12.10, стиль «Тень»): линия под вкладками — RowDivider (линия-View), не borderBottom
  // длинная подпись (es «Listas de reproducción», крупный шрифт) сжимается и переносится, а не уходит за экран
  tab: { flexShrink: 1, minWidth: 0, minHeight: 44, paddingVertical: 12, justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
});
