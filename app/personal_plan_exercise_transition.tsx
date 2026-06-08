import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeRouterBack } from './navigation_back';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticSuccess } from '../hooks/use-haptics';

function firstParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? '' : v ?? '';
}

const EXERCISE_META: Record<string, { icon: string; color: string; what: string; why: string }> = {
  plan_phrase_build: {
    icon: 'construct-outline',
    color: '#4ECDC4',
    what: 'Составь фразы из слов',
    why: 'Сборка закрепляет порядок слов и словосочетания лучше, чем чтение.',
  },
  plan_missing_word: {
    icon: 'text-outline',
    color: '#FF9F43',
    what: 'Вставь правильное слово',
    why: 'Точные пропуски тренируют выбор нужного слова в живой речи.',
  },
  plan_choose_natural_phrase: {
    icon: 'sparkles-outline',
    color: '#A29BFE',
    what: 'Выбери живую фразу',
    why: 'Учишься отличать корректное от звучащего как носитель.',
  },
  plan_listen_choose: {
    icon: 'headset-outline',
    color: '#00CEC9',
    what: 'Слушай и выбирай смысл',
    why: 'Тренирует распознавание речи на слух без опоры на текст.',
  },
  plan_listen_build: {
    icon: 'ear-outline',
    color: '#74B9FF',
    what: 'Собери фразу по звуку',
    why: 'Восприятие + порядок слов — двойная прокачка за один подход.',
  },
  plan_pronunciation_repeat: {
    icon: 'mic-outline',
    color: '#FD79A8',
    what: 'Повтори вслух',
    why: 'Голосовая запись помогает слышать себя и корректировать речь.',
  },
  plan_phrase_recall: {
    icon: 'bulb-outline',
    color: '#FDCB6E',
    what: 'Вспомни фразу по смыслу',
    why: 'Активное воспроизведение — самый мощный способ запомнить.',
  },
};

export default function PersonalPlanExerciseTransitionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme: t, themeMode } = useTheme();

  const nextType = firstParam(params.nextRendererType);
  const nextParams = firstParam(params.nextParams);
  const taskTitle = firstParam(params.taskTitle);
  const taskSubtitle = firstParam(params.taskSubtitle);
  const completedCount = Number(firstParam(params.completedCount) || '0');
  const totalCount = Number(firstParam(params.totalCount) || '1');

  const meta = EXERCISE_META[nextType] ?? {
    icon: 'play-outline',
    color: t.accent,
    what: taskTitle || 'Следующее задание',
    why: taskSubtitle || 'Продолжай, ты делаешь отличную работу!',
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
    Animated.timing(progressAnim, {
      toValue: completedCount / Math.max(1, totalCount),
      duration: 600,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim, slideAnim, scaleAnim, progressAnim, completedCount, totalCount]);

  const proceed = () => {
    hapticSuccess();
    if (nextParams) {
      try {
        const parsed = JSON.parse(nextParams);
        router.replace({ pathname: '/personal_plan_exercise', params: parsed } as any);
        return;
      } catch {
        // fallthrough
      }
    }
    safeRouterBack(router, '/personal_plan');
  };

  const isGold = themeMode === 'gold';
  const bg = isGold ? '#090704' : t.bgPrimary;
  // Эталон урока использует единый акцент темы, а не отдельный цвет на каждый режим.
  const accentColor = isGold ? '#FFE8A8' : t.accent;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <LinearGradient colors={t.bgGradient} style={styles.fill}>
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.72}
            onPress={() => safeRouterBack(router, '/personal_plan')}
            style={[styles.closeBtn, { borderColor: t.border, backgroundColor: t.bgCard }]}
          >
            <Ionicons name="close" size={22} color={t.textMuted} />
          </TouchableOpacity>
          <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: accentColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={[styles.countPill, { backgroundColor: t.accentBg, borderColor: t.border }]}>
            <Text style={[styles.countText, { color: t.accent }]}>{completedCount}/{totalCount}</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.body,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.iconRing, { backgroundColor: accentColor + '18', borderColor: accentColor + '44' }]}>
            <Ionicons name={meta.icon as any} size={52} color={accentColor} />
          </View>

          <View style={[styles.labelPill, { backgroundColor: accentColor + '14', borderColor: accentColor + '33' }]}>
            <Text style={[styles.labelText, { color: accentColor }]}>Следующее задание</Text>
          </View>

          <Text style={[styles.whatTitle, { color: t.textPrimary }]}>{meta.what}</Text>
          <Text style={[styles.whyText, { color: t.textMuted }]}>{meta.why}</Text>

          {taskSubtitle ? (
            <View style={[styles.focusPill, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <Ionicons name="bookmark-outline" size={16} color={t.textMuted} />
              <Text style={[styles.focusText, { color: t.textMuted }]}>{taskSubtitle}</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={proceed}
            style={styles.startWrap}
          >
            <LinearGradient
              colors={[accentColor + 'CC', accentColor]}
              style={styles.startButton}
            >
              <Ionicons name="play" size={22} color={t.correctText} />
              <Text style={[styles.startText, { color: t.correctText }]}>Начать</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  countPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 20,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  labelPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  whatTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    textAlign: 'center',
  },
  whyText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  focusText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  startWrap: { borderRadius: 14 },
  startButton: {
    height: 68,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
  },
});
