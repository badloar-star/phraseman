import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubeCatalogManifest } from '../../shared/youtube_catalog_contract';
import type { YoutubeChannelPreference } from '../../app/youtube_channel_preference';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';

export default function YoutubeChannelPickerSheet({ visible, manifest, preference, onSelect, onClose }: {
  visible: boolean;
  manifest: YoutubeCatalogManifest;
  preference: YoutubeChannelPreference;
  onSelect: (preference: YoutubeChannelPreference) => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const title = triLang(lang, { ru: 'Наши каналы', uk: 'Наші канали', es: 'Our channels', 'pt-BR': 'Nossos canais', vi: 'Kênh của chúng tôi', id: 'Kanal kami', tr: 'Kanallarımız', pl: 'Nasze kanały' });
  const auto = triLang(lang, { ru: 'Автоматически по языку', uk: 'Автоматично за мовою', es: 'Automatic by language', 'pt-BR': 'Automático pelo idioma', vi: 'Tự động theo ngôn ngữ', id: 'Otomatis sesuai bahasa', tr: 'Dile göre otomatik', pl: 'Automatycznie wg języka' });
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close channel picker" />
      <View style={[styles.sheet, { backgroundColor: t.bgSurface }]}>
        <View style={styles.handle} />
        <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          <TouchableOpacity testID="youtube-channel-auto" accessibilityRole="radio" accessibilityState={{ checked: preference.mode === 'auto' }} onPress={() => onSelect({ mode: 'auto' })} style={[styles.row, { backgroundColor: t.bgCard }]}>
            <View style={[styles.icon, { backgroundColor: t.accentBg }]}><Ionicons name="language" size={21} color={t.accent} /></View>
            <Text style={[styles.rowText, { color: t.textPrimary }]}>{auto}</Text>
            {preference.mode === 'auto' && <Ionicons name="checkmark-circle" size={23} color={t.accent} />}
          </TouchableOpacity>
          {manifest.channels.slice().sort((a, b) => a.order - b.order).map((channel) => {
            const checked = preference.mode === 'manual' && preference.channelId === channel.id;
            return (
              <TouchableOpacity key={channel.id} testID={`youtube-channel-${channel.id}`} accessibilityRole="radio" accessibilityState={{ checked }} onPress={() => onSelect({ mode: 'manual', channelId: channel.id })} style={[styles.row, { backgroundColor: t.bgCard }]}>
                {channel.avatarUrl ? <Image source={{ uri: channel.avatarUrl }} style={styles.icon} /> : <View style={[styles.icon, { backgroundColor: t.accentBg }]}><Ionicons name="logo-youtube" size={21} color={t.accent} /></View>}
                <View style={styles.rowBody}><Text style={[styles.rowText, { color: t.textPrimary }]}>{channel.displayName}</Text><Text style={[styles.languages, { color: t.textMuted }]}>{channel.languageTags.join(' · ')}</Text></View>
                {checked && <Ionicons name="checkmark-circle" size={23} color={t.accent} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.56)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '78%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, paddingBottom: 32 },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.45)', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 14 },
  list: { gap: 9 },
  row: { minHeight: 60, borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowText: { flex: 1, fontSize: 14, fontWeight: '900' },
  languages: { marginTop: 2, fontSize: 11, fontWeight: '700' },
});
