import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';

export default function WebScreen() {
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  if (!url) {
    return (
      <View style={[styles.center, { backgroundColor: t.bgPrimary }]}>
        <Text style={{ color: t.textPrimary }}>
          {triLang(lang, { ru: 'Ссылка не указана', uk: 'Посилання не вказано', es: 'No hay URL' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bgPrimary }]}>
      <View style={[styles.header, { backgroundColor: t.bgCard, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
        </TouchableOpacity>
        {title ? (
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={styles.center}>
        <Text style={{ color: t.textMuted, marginBottom: 16, fontSize: f.body }}>{url}</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL(url)}
          style={{ backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>
            {triLang(lang, {
              ru: 'Открыть в браузере',
              uk: 'Відкрити в браузері',
              es: 'Abrir en el navegador',
            })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  back: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontWeight: '600' },
});
