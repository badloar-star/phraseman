// Видимая dev-поверхность Learning V2 больше не является тупиковой заглушкой:
// она открывает проверяемый локальный вертикальный срез Lesson 1. Старый
// забракованный Kimi/session-прототип не возвращается — рабочие карта и раннер
// живут в app/learning-v2 и остаются отделены от этой точки входа.
import React, { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';

interface LearningV2ModesLabProps {
  readonly bottomPadding?: number;
  readonly onOpenLesson1: () => void;
}

const LearningV2ModesLab = memo(function LearningV2ModesLab({
  bottomPadding = 0,
  onOpenLesson1,
}: LearningV2ModesLabProps) {
  const { theme, f } = useTheme();
  const { lang } = useLang();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        s.root,
        { backgroundColor: theme.bgPrimary, paddingBottom: bottomPadding + 24 },
      ]}
    >
      <Text style={[s.eyebrow, { color: theme.textMuted }]}>LEARNING V2 · A1</Text>
      <Text style={[s.title, { color: theme.textPrimary, fontSize: f.h1 }]}>
        {triLang(lang, {
          ru: 'Первый урок готов к проверке', uk: 'Перший урок готовий до перевірки',
          es: 'La primera lección está lista', 'pt-BR': 'A primeira lição está pronta',
          vi: 'Bài học đầu tiên đã sẵn sàng', id: 'Pelajaran pertama siap diuji',
          tr: 'İlk ders test edilmeye hazır', pl: 'Pierwsza lekcja jest gotowa',
        })}
      </Text>
      <Text style={[s.body, { color: theme.textSecond, fontSize: f.bodyLg }]}>
        {triLang(lang, {
          ru: 'Рабочая карта, 12 локальных сессий, подсказки, пропуск и встроенное аудио.',
          uk: 'Робоча карта, 12 локальних сесій, підказки, пропуск і вбудоване аудіо.',
          es: 'Mapa funcional, 12 sesiones locales, pistas, omisión y audio integrado.',
          'pt-BR': 'Mapa funcional, 12 sessões locais, dicas, pular e áudio integrado.',
          vi: 'Bản đồ hoạt động, 12 phiên cục bộ, gợi ý, bỏ qua và âm thanh tích hợp.',
          id: 'Peta aktif, 12 sesi lokal, petunjuk, lewati, dan audio bawaan.',
          tr: 'Çalışan harita, 12 yerel oturum, ipuçları, atlama ve yerleşik ses.',
          pl: 'Działająca mapa, 12 lokalnych sesji, podpowiedzi, pomijanie i wbudowane audio.',
        })}
      </Text>

      <View style={[s.card, { backgroundColor: theme.bgCard }]}>
        <View style={[s.icon, { backgroundColor: theme.accentBg }]}>
          <Ionicons name="sparkles" size={28} color={theme.accent} />
        </View>
        <View style={s.cardText}>
          <Text style={[s.cardTitle, { color: theme.textPrimary }]}>
            {triLang(lang, {
              ru: 'Урок 1 · Знакомство', uk: 'Урок 1 · Знайомство', es: 'Lección 1 · Presentarse',
              'pt-BR': 'Lição 1 · Apresentações', vi: 'Bài 1 · Làm quen', id: 'Pelajaran 1 · Perkenalan',
              tr: 'Ders 1 · Tanışma', pl: 'Lekcja 1 · Poznawanie się',
            })}
          </Text>
          <Text style={[s.cardMeta, { color: theme.textMuted }]}>
            {triLang(lang, {
              ru: '12 сессий · работает офлайн', uk: '12 сесій · працює офлайн',
              es: '12 sesiones · funciona sin conexión', 'pt-BR': '12 sessões · funciona offline',
              vi: '12 phiên · hoạt động ngoại tuyến', id: '12 sesi · bekerja offline',
              tr: '12 oturum · çevrimdışı çalışır', pl: '12 sesji · działa offline',
            })}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, {
          ru: 'Открыть первый урок Learning V2', uk: 'Відкрити перший урок Learning V2',
          es: 'Abrir la primera lección de Learning V2', 'pt-BR': 'Abrir a primeira lição do Learning V2',
          vi: 'Mở bài học Learning V2 đầu tiên', id: 'Buka pelajaran Learning V2 pertama',
          tr: 'İlk Learning V2 dersini aç', pl: 'Otwórz pierwszą lekcję Learning V2',
        })}
        onPress={onOpenLesson1}
        style={({ pressed }) => [
          s.cta,
          { backgroundColor: theme.correct },
          pressed && s.ctaPressed,
        ]}
      >
        <Text style={[s.ctaText, { color: theme.correctText }]}>
          {triLang(lang, {
            ru: 'Открыть Урок 1', uk: 'Відкрити Урок 1', es: 'Abrir la lección 1',
            'pt-BR': 'Abrir a lição 1', vi: 'Mở Bài 1', id: 'Buka Pelajaran 1',
            tr: 'Ders 1’i aç', pl: 'Otwórz Lekcję 1',
          })}
        </Text>
        <Ionicons name="arrow-forward" size={20} color={theme.correctText} />
      </Pressable>

      <View style={s.noteRow}>
        <Ionicons name="shield-checkmark-outline" size={18} color={theme.textMuted} />
        <Text style={[s.note, { color: theme.textMuted }]}>
          {triLang(lang, {
            ru: 'Результат сохраняется на устройстве и не зависит от сети.',
            uk: 'Результат зберігається на пристрої та не залежить від мережі.',
            es: 'El resultado se guarda en el dispositivo y no depende de la red.',
            'pt-BR': 'O resultado é salvo no dispositivo e não depende da rede.',
            vi: 'Kết quả được lưu trên thiết bị và không phụ thuộc vào mạng.',
            id: 'Hasil disimpan di perangkat dan tidak bergantung pada jaringan.',
            tr: 'Sonuç cihazda saklanır ve ağa bağlı değildir.',
            pl: 'Wynik jest zapisywany na urządzeniu i nie zależy od sieci.',
          })}
        </Text>
      </View>
    </ScrollView>
  );
});

const s = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    fontWeight: '800',
    marginTop: 8,
  },
  body: {
    lineHeight: 26,
    marginTop: 12,
  },
  card: {
    minHeight: 104,
    marginTop: 24,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  cardMeta: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  cta: {
    minHeight: 54,
    marginTop: 16,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPressed: {
    opacity: 0.84,
  },
  ctaText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  noteRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  note: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});

export default LearningV2ModesLab;
