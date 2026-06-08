import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TapScale from '../components/TapScale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';

export default function WebScreen() {
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  if (!url) {
    return (
      <ScreenGradient artBackdrop="settings">
        <View style={styles.container}>
          {/* Хедер с кнопкой «Назад» — иначе на iOS (свайп-назад выключен
              глобально) пользователь застревает в этом error-состоянии. */}
          <View style={[styles.header, { backgroundColor: t.bgCard, borderBottomColor: t.border }]}>
            <TapScale
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              style={styles.back}
              accessibilityLabel={triLang(lang, {
                ru: 'Назад',
                uk: 'Назад',
                es: 'Atrás',
                'pt-BR': 'Voltar',
                vi: 'Quay lại',
                id: 'Kembali',
                tr: 'Geri',
                pl: 'Wstecz',
              })}
            >
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TapScale>
          </View>
          <View style={styles.center}>
            <Text style={{ color: t.textPrimary }}>
              {triLang(lang, {
                ru: 'Ссылка не указана',
                uk: 'Посилання не вказано',
                es: 'No hay URL',
                'pt-BR': 'URL não informado',
                vi: 'Chưa có URL',
                id: 'URL belum diisi',
                tr: 'URL belirtilmedi',
                pl: 'Nie podano URL',
              })}
            </Text>
          </View>
        </View>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient artBackdrop="settings">
      <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.bgCard, borderBottomColor: t.border }]}>
        <TapScale onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
        </TapScale>
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
              'pt-BR': 'Abrir no navegador',
              vi: 'Mở trong trình duyệt',
              id: 'Buka di browser',
              tr: 'Tarayıcıda aç',
              pl: 'Otwórz w przeglądarce',
            })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    </ScreenGradient>
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
