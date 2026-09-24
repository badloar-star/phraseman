import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { YoutubeChannelSnapshot } from '../../shared/youtube_catalog_contract';
import TapScale from '../TapScale';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useV2Palette } from '../v2/useV2Palette';

/**
 * Шапка раздела видео в стиле 2.0: крупный заголовок, под ним название канала,
 * справа круглые кнопки. Без onBack — вкладка «Видео» (назад не нужен), с onBack —
 * отдельный экран, круглая стрелка слева.
 */
export default function YoutubeChannelHeader({ channel, title, onBack, onOpenChannels, onOpenYoutube }: {
  channel: YoutubeChannelSnapshot;
  /** Крупный заголовок; по умолчанию — название канала. */
  title?: string;
  onBack?: () => void;
  onOpenChannels: () => void;
  onOpenYoutube: () => void;
}) {
  const { lang } = useLang();
  const p = useV2Palette();
  const allChannels = triLang(lang, { ru: 'Все наши каналы', uk: 'Усі наші канали', en: 'All our channels', es: 'Todos nuestros canales', 'pt-BR': 'Todos os nossos canais', vi: 'Tất cả kênh', id: 'Semua kanal kami', tr: 'Tüm kanallarımız', pl: 'Wszystkie nasze kanały' });
  const back = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  const roundButton = [styles.round, { backgroundColor: p.control }];
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {onBack ? (
          <TapScale accessibilityRole="button" accessibilityLabel={back} onPress={onBack} style={roundButton}>
            <Ionicons name="chevron-back" size={22} color={p.text} />
          </TapScale>
        ) : null}
        <View style={styles.spacer} />
        <TapScale accessibilityRole="button" accessibilityLabel="YouTube" onPress={onOpenYoutube} style={roundButton}>
          <Ionicons name="logo-youtube" size={20} color={p.text} />
        </TapScale>
        <TapScale testID="youtube-all-channels" accessibilityRole="button" accessibilityLabel={allChannels} onPress={onOpenChannels} style={roundButton}>
          <Ionicons name="people-outline" size={20} color={p.text} />
        </TapScale>
      </View>
      <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: p.text }]}>{title ?? channel.displayName}</Text>
      {title ? <Text numberOfLines={1} style={[styles.subtitle, { color: p.textSecondary }]}>{channel.displayName}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: V2.iconButton },
  spacer: { flex: 1 },
  round: { width: V2.iconButton, height: V2.iconButton, borderRadius: V2.iconButton / 2, alignItems: 'center', justifyContent: 'center' },
  title: { ...V2_TYPE.largeTitle, marginTop: 12 },
  subtitle: { ...V2_TYPE.body, marginTop: 4 },
});
