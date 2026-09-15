/**
 * TutorTopicPicker — выбор темы при входе в урок с Максом.
 *
 * зачем (владелец 2026-09-15): «открываем Макс, и он всё равно прогревается —
 * сразу должно появиться на экране сообщение (не ИИ) "выбери тему, которую
 * хочешь разобрать" и там например три подходящие темы». Раньше человек входил
 * и смотрел в пустоту, пока модель сочиняла приветствие.
 *
 * Важно: приветствие здесь — НЕ реплика ИИ, а собственный текст интерфейса.
 * Он появляется мгновенно и не стоит ни копейки. Темы приезжают отдельным
 * дешёвым вызовом без модели (tutorTextTopics).
 *
 * Геометрия — из макета (экран 6 «Урок с Максом: начало»): широкие карточки
 * `.sug.wide` с медальоном слева, названием и уровнем справа.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang, type Lang } from '../../constants/i18n';
import { tutorTopicTitle, type TutorTopic } from '../../app/ai_dialog_tutor_client';

interface TutorTopicPickerProps {
  lang: Lang;
  topics: TutorTopic[];
  /** Имя ученика для приветствия; пусто — обратимся без имени. */
  learnerName: string;
  /** Сколько уроков уже было: меняет «начнём» на «продолжим». */
  lessonsDone: number;
  /** Темы ещё грузятся: показываем скелет вместо прыжка вёрстки. */
  loading: boolean;
  onPick: (topic: TutorTopic) => void;
  /** Начать без выбора — Макс решит сам (он и так это умеет). */
  onLetMaxDecide: () => void;
  testID?: string;
}

/** Иконка по уровню темы: повтор отличается от новой цели. */
function topicIcon(topic: TutorTopic): keyof typeof Ionicons.glyphMap {
  if (topic.review) return 'refresh';
  if (topic.mastery > 0) return 'flame';
  return 'sparkles';
}

export default function TutorTopicPicker({
  lang,
  topics,
  learnerName,
  lessonsDone,
  loading,
  onPick,
  onLetMaxDecide,
  testID,
}: TutorTopicPickerProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReducedMotion();

  const greeting = learnerName
    ? triLang(lang, {
        ru: `Привет, ${learnerName}!`,
        uk: `Привіт, ${learnerName}!`,
        en: `Hi, ${learnerName}!`,
        es: `¡Hola, ${learnerName}!`,
        'pt-BR': `Oi, ${learnerName}!`,
        vi: `Chào ${learnerName}!`,
        id: `Hai, ${learnerName}!`,
        tr: `Merhaba ${learnerName}!`,
        pl: `Cześć, ${learnerName}!`,
      })
    : triLang(lang, {
        ru: 'Привет!', uk: 'Привіт!', en: 'Hi!', es: '¡Hola!', 'pt-BR': 'Oi!',
        vi: 'Chào bạn!', id: 'Hai!', tr: 'Merhaba!', pl: 'Cześć!',
      });

  const lead = lessonsDone > 0
    ? triLang(lang, {
        ru: 'Продолжим. Выбери, что разберём сегодня:',
        uk: 'Продовжимо. Обери, що розберемо сьогодні:',
        en: "Let's continue. Pick what we'll work on today:",
        es: 'Seguimos. Elige qué vemos hoy:',
        'pt-BR': 'Vamos continuar. Escolha o que veremos hoje:',
        vi: 'Tiếp tục nhé. Chọn chủ đề hôm nay:',
        id: 'Lanjut, ya. Pilih yang kita bahas hari ini:',
        tr: 'Devam edelim. Bugün neyi çalışalım:',
        pl: 'Kontynuujmy. Wybierz, co dziś przerobimy:',
      })
    : triLang(lang, {
        ru: 'Выбери тему, которую хочешь разобрать:',
        uk: 'Обери тему, яку хочеш розібрати:',
        en: 'Pick a topic you want to work on:',
        es: 'Elige el tema que quieres trabajar:',
        'pt-BR': 'Escolha o tema que você quer trabalhar:',
        vi: 'Chọn chủ đề bạn muốn học:',
        id: 'Pilih topik yang ingin kamu pelajari:',
        tr: 'Çalışmak istediğin konuyu seç:',
        pl: 'Wybierz temat, który chcesz przerobić:',
      });

  return (
    <View style={styles.wrap} testID={testID}>
      <Text
        style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}
        maxFontSizeMultiplier={1.2}
      >
        {greeting}
      </Text>
      <Text
        style={{
          color: t.textSecond,
          fontSize: f.body,
          lineHeight: Math.round(f.body * 1.4),
          marginBottom: 4,
        }}
        maxFontSizeMultiplier={1.2}
      >
        {lead}
      </Text>

      {loading
        ? // Скелет держит ту же высоту, что и готовые карточки: первый кадр
          // равен финальному, вёрстка не прыгает при подстановке тем.
          [0, 1, 2].map((i) => (
            <View key={`skeleton-${i}`} style={[styles.card, { backgroundColor: t.bgCard, opacity: 0.5 }]} />
          ))
        : topics.map((topic, index) => {
            const title = tutorTopicTitle(topic, lang);
            const meta = topic.review
              ? triLang(lang, {
                  ru: 'из памяти', uk: 'з памʼяті', en: 'from memory', es: 'de memoria',
                  'pt-BR': 'da memória', vi: 'từ trí nhớ', id: 'dari ingatan', tr: 'hafızadan', pl: 'z pamięci',
                })
              : topic.level;
            return (
              <Animated.View
                key={topic.goalId}
                entering={reduceMotion ? undefined : FadeInDown.delay(60 * index).duration(220)}
              >
                <Pressable
                  onPress={() => {
                    hapticTap();
                    onPick(topic);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${title}. ${meta}`}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: t.bgCard, transform: [{ scale: pressed ? 0.98 : 1 }] },
                  ]}
                  testID={testID ? `${testID}-topic-${topic.goalId}` : undefined}
                >
                  <View style={[styles.medal, { backgroundColor: t.accentBg }]}>
                    <Ionicons name={topicIcon(topic)} size={19} color={t.accent} />
                  </View>
                  <Text
                    style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', flex: 1 }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {title}
                  </Text>
                  <Text
                    style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {meta}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}

      {/* Выход для того, кто не хочет выбирать: Макс решит сам — он это умеет
          по своей же роли («сам решает, что сегодня учить»). */}
      {!loading ? (
        <Pressable
          onPress={() => {
            hapticTap();
            onLetMaxDecide();
          }}
          accessibilityRole="button"
          style={styles.skip}
          testID={testID ? `${testID}-skip` : undefined}
        >
          <Text
            style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}
            maxFontSizeMultiplier={1.2}
          >
            {triLang(lang, {
              ru: 'Пусть Макс выберет сам',
              uk: 'Хай Макс обере сам',
              en: 'Let Max choose',
              es: 'Que Max elija',
              'pt-BR': 'Deixe o Max escolher',
              vi: 'Để Max chọn',
              id: 'Biar Max yang pilih',
              tr: 'Max seçsin',
              pl: 'Niech Max wybierze',
            })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 8, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    minHeight: 64,
  },
  medal: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
});
