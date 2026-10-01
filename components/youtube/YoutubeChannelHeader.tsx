import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubeChannelSnapshot } from '../../shared/youtube_catalog_contract';
import TapScale from '../TapScale';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { FlowText } from '../text-integrity';

/**
 * Шапка раздела видео в стиле 2.0: крупный заголовок, под ним пилюля канала
 * (аватар/инициалы + название + шеврон), как `.chbtn` макета. HTML-пилюля языка намеренно не перенесена:
 * для неё нет native setter; доступны только реальные действия канала и YouTube.
 */
export default function YoutubeChannelHeader({ channel, title, onBack, onOpenChannels, onOpenYoutube }: {
  channel: YoutubeChannelSnapshot;
  /** Крупный заголовок; по умолчанию — название канала. */
  title?: string;
  onBack?: () => void;
  /** Без обработчика пилюля только показывает канал (канал задаётся языком обучения). */
  onOpenChannels?: () => void;
  onOpenYoutube: () => void;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const allChannels = triLang(lang, { ru: 'Все наши каналы', uk: 'Усі наші канали', en: 'All our channels', es: 'Todos nuestros canales', 'pt-BR': 'Todos os nossos canais', vi: 'Tất cả kênh', id: 'Semua kanal kami', tr: 'Tüm kanallarımız', pl: 'Wszystkie nasze kanały' });
  const channelAccessibilityLabel = `${allChannels}: ${channel.displayName}`;
  const back = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  // зачем: в макете слева в пилюле круглая аватарка канала (`.chav`): картинка, а без неё — инициалы.
  const initials = channel.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('');
  const actionButton = [styles.actionButton, { backgroundColor: g.card, borderColor: g.glassEdge }];
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        {onBack ? (
          <TapScale accessibilityRole="button" accessibilityLabel={back} onPress={onBack} style={actionButton}>
            <Ionicons name="chevron-back" size={22} color={g.text} />
          </TapScale>
        ) : null}
        <FlowText testID="youtube-channel-title" provenance={title ? 'authored' : 'external'} accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title ?? channel.displayName}</FlowText>
        <TapScale accessibilityRole="button" accessibilityLabel="YouTube" onPress={onOpenYoutube} style={actionButton}>
          <Ionicons name="logo-youtube" size={20} color={g.text} />
        </TapScale>
      </View>
      {(() => {
      const pillBody = (
        <View style={styles.channelPillContent}>
          {channel.avatarUrl
            ? <Image testID="youtube-channel-avatar" accessible={false} source={{ uri: channel.avatarUrl }} style={styles.avatar} contentFit="cover" />
            : <View testID="youtube-channel-avatar" style={[styles.avatar, { backgroundColor: g.opaqueControl }]}><Text style={[styles.avatarText, { color: g.text }]}>{initials}</Text></View>}
          <FlowText testID="youtube-channel-name" provenance="external" style={[styles.channelName, { color: g.text }]}>{channel.displayName}</FlowText>
          {onOpenChannels ? <Ionicons name="chevron-down" size={17} color={g.secondary} style={styles.channelChevron} /> : null}
        </View>
      );
      // зачем (владелец 01.10): каждый канал — отдельный контур по языку обучения; выбора каналов нет.
      return onOpenChannels ? (
        <TapScale testID="youtube-all-channels" accessibilityRole="button" accessibilityLabel={channelAccessibilityLabel} onPress={onOpenChannels} style={[styles.channelPill, { backgroundColor: g.card, borderColor: g.glassEdge }]}>
          {pillBody}
        </TapScale>
      ) : (
        <View testID="youtube-channel-pill" accessible accessibilityLabel={channel.displayName} style={[styles.channelPill, { backgroundColor: g.card, borderColor: g.glassEdge }]}>
          {pillBody}
        </View>
      );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: V2.iconButton },
  actionButton: { width: V2.iconButton, height: V2.iconButton, borderRadius: V2.iconButton / 2, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, // guard-ok: D43
  title: { ...V2_TYPE.largeTitle, flex: 1, minWidth: 0 },
  channelPill: { minHeight: 44, alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingLeft: 6, paddingRight: 14, justifyContent: 'center' }, // guard-ok: D43
  channelPillContent: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  avatarText: { fontSize: 13, fontWeight: '800' },
  channelName: { ...V2_TYPE.body, flex: 1, minWidth: 0, flexShrink: 1 },
  channelChevron: { flexShrink: 0 },
});
