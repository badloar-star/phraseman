/**
 * TutorHubPoster — афиша урока с Максом на входе в раздел «Диалоги».
 *
 * зачем (владелец 2026-09-14, утверждённый хаб, вариант Б): «афиша ведёт сразу
 * в урок с Максом… пусть его зовут Макс». Раньше вверху раздела стояла
 * следующая сцена-ролёвка; теперь первое, что видит человек, — предложение
 * поучиться, а сцены живут ниже списком.
 *
 * Звание вынесено сюда же маленьким кольцом в правом верхнем углу с
 * пульсирующей прозрачностью — тоже прямое решение владельца. Кольцо считает
 * пройденные диалоги, а не реплики: фармить его бессмысленно.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import EnergyCostBadge from '../EnergyCostBadge';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang, type Lang } from '../../constants/i18n';
import { rankForCompleted } from '../../app/dialogs_rank';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

interface TutorHubPosterProps {
  lang: Lang;
  /** Сколько диалогов раздела пройдено — по ним считается звание. */
  completedCount: number;
  /** Что Макс помнит с прошлого урока; пусто — первый урок. */
  memoryHint: string;
  /** Видна ли сейчас вкладка «Диалоги» (владелец цикла анимации). */
  tabVisible: boolean;
  onStart: () => void;
  testID?: string;
}

function rankLabel(key: string, lang: Lang): string {
  switch (key) {
    case 'speaker':
      return triLang(lang, {
        ru: 'Собеседник', uk: 'Співрозмовник', en: 'Speaker', es: 'Interlocutor',
        'pt-BR': 'Interlocutor', vi: 'Người đối thoại', id: 'Lawan bicara', tr: 'Sohbetçi', pl: 'Rozmówca',
      });
    case 'orator':
      return triLang(lang, {
        ru: 'Оратор', uk: 'Оратор', en: 'Orator', es: 'Orador', 'pt-BR': 'Orador',
        vi: 'Diễn giả', id: 'Orator', tr: 'Hatip', pl: 'Mówca',
      });
    case 'diplomat':
      return triLang(lang, {
        ru: 'Дипломат', uk: 'Дипломат', en: 'Diplomat', es: 'Diplomático',
        'pt-BR': 'Diplomata', vi: 'Nhà ngoại giao', id: 'Diplomat', tr: 'Diplomat', pl: 'Dyplomata',
      });
    case 'legend':
      return triLang(lang, {
        ru: 'Легенда', uk: 'Легенда', en: 'Legend', es: 'Leyenda', 'pt-BR': 'Lenda',
        vi: 'Huyền thoại', id: 'Legenda', tr: 'Efsane', pl: 'Legenda',
      });
    default:
      return triLang(lang, {
        ru: 'Новичок', uk: 'Новачок', en: 'Newcomer', es: 'Principiante',
        'pt-BR': 'Iniciante', vi: 'Người mới', id: 'Pemula', tr: 'Yeni', pl: 'Nowicjusz',
      });
  }
}

export default function TutorHubPoster({
  lang,
  completedCount,
  memoryHint,
  tabVisible,
  onStart,
  testID,
}: TutorHubPosterProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReducedMotion();
  // зачем гард: «Диалоги» — вкладка, она НЕ размонтируется при уходе. Без
  // владельца бесконечный цикл продолжал бы крутиться на чужой вкладке и в
  // свёрнутом приложении, съедая кадры впустую (сторож perf_freeze_contract).
  const runtimeActive = useRuntimeActive(tabVisible);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || !runtimeActive) {
      // Останавливаем на непрозрачном кадре: возврат на вкладку не должен
      // заставать звание полупрозрачным.
      pulse.value = withTiming(1, { duration: 160 });
      return;
    }
    // Пульс прозрачности кольца звания — прямое решение владельца.
    pulse.value = withRepeat(
      withTiming(0.55, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      pulse.value = 1;
    };
  }, [pulse, reduceMotion, runtimeActive]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const rank = rankForCompleted(completedCount);
  const label = rankLabel(rank.key, lang);

  return (
    <View style={[styles.wrap, { backgroundColor: t.bgCard }]} testID={testID}>
      {/* Звание: маленькое кольцо в правом верхнем углу. */}
      <Animated.View
        style={[styles.rank, { backgroundColor: t.goldBg }, ringStyle]}
        accessibilityRole="text"
        accessibilityLabel={`${triLang(lang, {
          ru: 'Звание', uk: 'Звання', en: 'Rank', es: 'Rango', 'pt-BR': 'Patente',
          vi: 'Cấp bậc', id: 'Peringkat', tr: 'Rütbe', pl: 'Ranga',
        })}: ${label}`}
      >
        <Ionicons name="medal" size={15} color={t.gold} />
        <Text style={{ color: t.gold, fontSize: f.caption, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      </Animated.View>

      <View style={[styles.orb, { backgroundColor: t.accentBg }]}>
        <Ionicons name="school" size={34} color={t.accent} />
      </View>

      <Text
        style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700', textAlign: 'center' }}
        maxFontSizeMultiplier={1.2}
      >
        {triLang(lang, {
          ru: 'Начать урок', uk: 'Почати урок', en: 'Start a lesson', es: 'Empezar la lección',
          'pt-BR': 'Começar a lição', vi: 'Bắt đầu bài học', id: 'Mulai pelajaran',
          tr: 'Derse başla', pl: 'Zacznij lekcję',
        })}
      </Text>

      <Text
        style={{
          color: t.textSecond,
          fontSize: f.body,
          textAlign: 'center',
          lineHeight: Math.round(f.body * 1.4),
        }}
        maxFontSizeMultiplier={1.2}
      >
        {memoryHint
          ? memoryHint
          : triLang(lang, {
              ru: 'Макс сам предложит тему и будет учить шаг за шагом.',
              uk: 'Макс сам запропонує тему й навчатиме крок за кроком.',
              en: 'Max will pick a topic himself and teach you step by step.',
              es: 'Max propondrá un tema y te enseñará paso a paso.',
              'pt-BR': 'Max vai propor um tema e ensinar passo a passo.',
              vi: 'Max sẽ tự chọn chủ đề và dạy từng bước.',
              id: 'Max akan memilih topik dan mengajari langkah demi langkah.',
              tr: 'Max konuyu kendisi seçip adım adım öğretecek.',
              pl: 'Max sam zaproponuje temat i nauczy krok po kroku.',
            })}
      </Text>

      <Pressable
        onPress={() => {
          hapticTap();
          onStart();
        }}
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, {
          ru: 'Начать урок с Максом', uk: 'Почати урок з Максом', en: 'Start a lesson with Max',
          es: 'Empezar la lección con Max', 'pt-BR': 'Começar a lição com Max',
          vi: 'Bắt đầu bài học với Max', id: 'Mulai pelajaran dengan Max',
          tr: 'Max ile derse başla', pl: 'Zacznij lekcję z Maxem',
        })}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: t.accent, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        testID={testID ? `${testID}-start` : undefined}
      >
        <Ionicons name="play" size={20} color={t.correctText} />
        <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
          {triLang(lang, {
            ru: 'Начать урок', uk: 'Почати урок', en: 'Start a lesson', es: 'Empezar',
            'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij',
          })}
        </Text>
      </Pressable>

      {/* Цена урока живёт в общем контракте энергии: экран не владеет числом. */}
      <EnergyCostBadge activity="ai_dialog" corner="topLeft" micro />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    marginBottom: 12,
    alignItems: 'center',
    gap: 10,
  },
  rank: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 28,
  },
  orb: {
    width: 74,
    height: 74,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 18,
    minHeight: 54,
    alignSelf: 'stretch',
    marginTop: 4,
  },
});
