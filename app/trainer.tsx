import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { getTrainerCounts, devSeedTrainer, clearTrainerStore, type TrainerQueue } from './trainer_store';
import { DEV_MODE } from './config';

interface SectionInfo {
  queue: TrainerQueue;
  emoji: string;
  title: { ru: string; uk: string; es: string };
  sub:   { ru: string; uk: string; es: string };
  accent: string;
  route: string;
}

const SECTIONS: SectionInfo[] = [
  {
    queue: 'words',
    emoji: '📚',
    title: { ru: 'Слова',     uk: 'Слова',     es: 'Palabras' },
    sub:   { ru: 'Слова и глаголы где были ошибки', uk: 'Слова і дієслова де були помилки', es: 'Palabras y verbos con errores' },
    accent: '#4A9EFF',
    route: '/trainer_words_session',
  },
  {
    queue: 'phrases',
    emoji: '💬',
    title: { ru: 'Фразы',     uk: 'Фрази',     es: 'Frases' },
    sub:   { ru: 'Фразы из уроков где ошибался', uk: 'Фрази з уроків де помилявся', es: 'Frases de lecciones con errores' },
    accent: '#40C080',
    route: '/trainer_phrases_session',
  },
  {
    queue: 'arena',
    emoji: '⚔️',
    title: { ru: 'Арена',     uk: 'Арена',     es: 'Arena' },
    sub:   { ru: 'Вопросы арены где ошибался', uk: 'Питання арени де помилявся', es: 'Preguntas de arena con errores' },
    accent: '#E05050',
    route: '/trainer_arena_session',
  },
];

export default function TrainerScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [counts, setCounts] = useState<Record<TrainerQueue, number>>({ words: 0, phrases: 0, arena: 0 });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadCounts = useCallback(async () => {
    const c = await getTrainerCounts();
    setCounts(c);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { void loadCounts(); }, [loadCounts]));

  const total = counts.words + counts.phrases + counts.arena;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
                {triLang(lang, { ru: '🧠 Тренер', uk: '🧠 Тренер', es: '🧠 Entrenador' })}
              </Text>
              <Text style={[styles.headerSub, { color: t.textMuted, fontSize: f.caption }]}>
                {triLang(lang, { ru: 'Повторение ошибок', uk: 'Повторення помилок', es: 'Repaso de errores' })}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>

            {/* Общий счётчик */}
            {!loading && (
              <View style={[styles.totalBanner, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.totalNum, { color: total > 0 ? '#4A9EFF' : t.textMuted, fontSize: f.numLg }]}>
                  {total}
                </Text>
                <Text style={[styles.totalLabel, { color: t.textMuted, fontSize: f.caption }]}>
                  {triLang(lang, { ru: 'ждут сегодня', uk: 'чекають сьогодні', es: 'esperan hoy' })}
                </Text>
              </View>
            )}

            {/* Разделы */}
            {SECTIONS.map(s => {
              const count = counts[s.queue];
              const empty = count === 0;
              return (
                <TouchableOpacity
                  key={s.queue}
                  onPress={() => {
                    hapticTap();
                    if (!empty) router.push(s.route as any);
                  }}
                  activeOpacity={empty ? 1 : 0.82}
                  style={[
                    styles.card,
                    {
                      backgroundColor: t.bgCard,
                      borderColor: empty ? t.border : s.accent + '44',
                      borderWidth: empty ? StyleSheet.hairlineWidth : 1.5,
                      opacity: empty ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.cardEmoji, { opacity: empty ? 0.5 : 1 }]}>{s.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                      {triLang(lang, s.title)}
                    </Text>
                    <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                      {triLang(lang, s.sub)}
                    </Text>
                  </View>
                  <View style={[styles.countBadge, {
                    backgroundColor: empty ? t.bgSurface : s.accent + '22',
                    borderColor: empty ? t.border : s.accent + '55',
                  }]}>
                    <Text style={[styles.countNum, { color: empty ? t.textMuted : s.accent, fontSize: f.numMd }]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Подсказка когда всё отработано */}
            {!loading && total === 0 && (
              <View style={[styles.emptyHint, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang, { ru: 'Всё отработано!', uk: 'Всі завдання виконано!', es: '¡Todo listo!' })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginTop: 4 }}>
                  {triLang(lang, {
                    ru: 'Новые задания появятся когда ты допустишь ошибки в уроках',
                    uk: 'Нові завдання зʼявляться коли ти допустиш помилки в уроках',
                    es: 'Aparecerán nuevas tareas cuando cometas errores en las lecciones',
                  })}
                </Text>
              </View>
            )}

            {/* DEV — seed панель */}
            {(__DEV__ || DEV_MODE) && (
              <View style={[styles.devPanel, { backgroundColor: '#1a1a2e', borderColor: '#4A9EFF44' }]}>
                <Text style={{ color: '#4A9EFF', fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1 }}>
                  DEV TOOLS
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      setSeeding(true);
                      await devSeedTrainer();
                      await loadCounts();
                      setSeeding(false);
                    }}
                    style={[styles.devBtn, { backgroundColor: '#4A9EFF22', borderColor: '#4A9EFF66', flex: 1 }]}
                  >
                    <Text style={{ color: '#4A9EFF', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                      {seeding ? '⏳ …' : '🎲 Рандомный сид'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      await clearTrainerStore();
                      await loadCounts();
                    }}
                    style={[styles.devBtn, { backgroundColor: '#E0505022', borderColor: '#E0505066' }]}
                  >
                    <Text style={{ color: '#E05050', fontSize: 12, fontWeight: '700' }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontWeight: '800' },
  headerSub: { marginTop: 1 },
  totalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 4,
  },
  totalNum: { fontWeight: '900' },
  totalLabel: { fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  cardEmoji: { fontSize: 30, width: 36, textAlign: 'center' },
  cardTitle: { fontWeight: '800', marginBottom: 2 },
  cardSub: { lineHeight: 18 },
  countBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNum: { fontWeight: '900' },
  emptyHint: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    marginTop: 8,
  },
  devPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  devBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
