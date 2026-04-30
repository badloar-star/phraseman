// ════════════════════════════════════════════════════════════════════════════
// ForceUpdateScreen.tsx — Полноэкранный блок при обязательном обновлении.
// Показывается поверх всего приложения, нельзя закрыть.
// Кнопка "Обновить" открывает App Store / Google Play.
//
// ВАЖНО: компонент рендерится ДО `LangProvider` (в `_layout.tsx` блокирует
// все дерево). Поэтому `useLang()` тут недоступен — читаем мову напряму
// з AsyncStorage один раз при mount.
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Pressable,
  BackHandler,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ForceUpdateScreenProps {
  storeUrl: string;
  message?: string;
}

const TEXTS = {
  ru: {
    title: 'Требуется обновление',
    body: 'Эта версия больше не поддерживается. Пожалуйста, обновите приложение чтобы продолжить.',
    button: 'Обновить приложение',
  },
  uk: {
    title: 'Потрібне оновлення',
    body: 'Ця версія більше не підтримується. Будь ласка, онови застосунок, щоб продовжити.',
    button: 'Оновити застосунок',
  },
} as const;

export default function ForceUpdateScreen({ storeUrl, message }: ForceUpdateScreenProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK : LIGHT;
  const [lang, setLang] = useState<'ru' | 'uk'>('ru');

  // Блокируем кнопку "Назад" на Android + читаем мову інтерфейсу.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    AsyncStorage.getItem('app_lang').then(v => {
      if (v === 'uk') setLang('uk');
    }).catch(() => {});
    return () => sub.remove();
  }, []);

  const tx = TEXTS[lang];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={styles.emoji}>🔄</Text>

      <Text style={[styles.title, { color: colors.text }]}>
        {tx.title}
      </Text>

      <Text style={[styles.body, { color: colors.sub }]}>
        {message ? message : tx.body}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={() => Linking.openURL(storeUrl)}
      >
        <Text style={styles.buttonText}>{tx.button}</Text>
      </Pressable>
    </View>
  );
}

const LIGHT = { bg: '#F5F5F5', text: '#1A1A1A', sub: '#555555' };
const DARK  = { bg: '#121212', text: '#F0F0F0', sub: '#AAAAAA' };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#4F8EF7',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
