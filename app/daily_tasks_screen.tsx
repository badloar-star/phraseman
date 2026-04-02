import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import PremiumCard from '../components/PremiumCard';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { checkAchievements } from './achievements';
import {
  claimTask,
  DailyTask,
  getTodayTasks, loadTodayProgress,
  TaskProgress,
} from './daily_tasks';
import { registerXP } from './xp_manager';

export default function DailyTasksScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const [tasks] = useState<DailyTask[]>(getTodayTasks());
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  const [userName, setUserName] = useState('');
  const [claimedXP, setClaimedXP] = useState<number | null>(null);
  const xpAnim = useRef(new Animated.Value(0)).current;
  const claimAnims = useRef<Record<string, Animated.Value>>({});

  // Инициализируем анимации при изменении tasks (useEffect, не в теле рендера)
  useEffect(() => {
    tasks.forEach(task => {
      if (!claimAnims.current[task.id]) {
        claimAnims.current[task.id] = new Animated.Value(1);
      }
    });
  }, [tasks]);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
  }, []);

  // Обновляем прогресс при каждом возвращении на экран
  useFocusEffect(useCallback(() => {
    loadTodayProgress().then(setProgress);
  }, []));

  const handleClaim = async (taskId: string, xp: number) => {
    await claimTask(taskId);
    const updated = await loadTodayProgress();
    setProgress(updated);

    if (userName) await registerXP(xp, 'daily_task_reward', userName, lang); // [ACHIEVEMENT] Проверяем ачивки за задания
    checkAchievements({ type: 'daily_task', allDone }).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const anim = claimAnims.current[taskId];
    if (anim) {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
    setClaimedXP(xp);
    xpAnim.setValue(0);
    Animated.sequence([
      Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(xpAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setClaimedXP(null));
  };

  const claimedCount = progress.filter(p => p.claimed).length;

  const handleTaskNav = async (task: DailyTask) => {
    const lastLesson = await AsyncStorage.getItem('last_opened_lesson');
    const lessonId = parseInt(lastLesson || '1', 10);
    switch (task.type) {
      case 'total_answers':
      case 'correct_streak':
      case 'lesson_no_mistakes':
      case 'daily_active':
        router.push({ pathname: '/lesson1', params: { id: lessonId } });
        break;
      case 'verb_learned':
        router.push({ pathname: '/lesson_words', params: { id: lessonId } });
        break;
      case 'words_learned':
        router.push({ pathname: '/lesson_words', params: { id: lessonId } });
        break;
      case 'quiz_hard':
        await AsyncStorage.setItem('quiz_nav_level', 'hard');
        router.push('/(tabs)/quizzes');
        break;
      case 'quiz_score':
        await AsyncStorage.removeItem('quiz_nav_level');
        router.push('/(tabs)/quizzes');
        break;
      case 'open_theory':
        router.push({ pathname: '/lesson1', params: { id: lessonId } });
        break;
      default:
        router.push({ pathname: '/lesson1', params: { id: lessonId } });
        break;
    }
  };

  // Сортировка: готово к получению → в процессе → уже получено
  const sortedTasks = [...tasks].sort((a, b) => {
    const pa = progress.find(p => p.taskId === a.id);
    const pb = progress.find(p => p.taskId === b.id);
    const aScore = pa?.claimed ? 2 : pa?.completed ? 0 : 1;
    const bScore = pb?.claimed ? 2 : pb?.completed ? 0 : 1;
    return aScore - bScore;
  });

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
            {isUK ? 'Завдання дня' : 'Задания дня'}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>{claimedCount}/{tasks.length}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.label }}>{isUK ? 'виконано' : 'выполнено'}</Text>
        </View>
      </View>

      {claimedXP !== null && (
        <Animated.View style={{
          position: 'absolute', top: 80, alignSelf: 'center', zIndex: 100,
          backgroundColor: t.correct, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
          opacity: xpAnim,
          transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        }}>
          <Text style={{ color: t.correctText, fontSize: f.h1, fontWeight: '800' }}>+{claimedXP} XP 🎉</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>

        {/* Прогресс */}
        <PremiumCard level={2} style={{ marginBottom: 4 }} innerStyle={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
              {isUK ? 'Прогрес дня' : 'Прогресс дня'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub }}>{claimedCount}/3</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tasks.map((_, i) => (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < claimedCount ? t.correct : t.border }} />
            ))}
          </View>
        </PremiumCard>

        {sortedTasks.map((task) => {
          const p = progress.find(pr => pr.taskId === task.id);
          const current = p?.current ?? 0;
          const completed = p?.completed ?? false;
          const claimed = p?.claimed ?? false;
          const pct = Math.min((current / task.target) * 100, 100);
          const anim = claimAnims.current[task.id] ?? new Animated.Value(1);

          return (
            <Animated.View key={task.id} style={{ transform: [{ scale: anim }] }}>
            <PremiumCard level={2} active={completed && !claimed} disabled={claimed} onPress={claimed ? undefined : () => handleTaskNav(task)} innerStyle={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: f.numLg }}>{task.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', marginBottom: 3 }}>
                      {isUK ? task.titleUK : task.titleRU}
                    </Text>
                    <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: f.sub * 1.5 }}>
                      {isUK ? task.descUK : task.descRU}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: claimed ? t.bgSurface : t.correctBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', borderWidth: claimed ? 0 : 1, borderColor: t.correct + '55' }}>
                    <Text style={{ color: claimed ? t.textMuted : t.textSecond, fontSize: f.body, fontWeight: '700' }}>+{task.xp}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.label }}>XP</Text>
                  </View>
                </View>

                <View style={{ height: 5, backgroundColor: t.bgSurface, borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: completed ? t.correct : t.textSecond, borderRadius: 3 }} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: t.textMuted, fontSize: f.caption }}>{current} / {task.target}</Text>
                  {completed && !claimed && (
                    <TouchableOpacity
                      onPress={() => handleClaim(task.id, task.xp)}
                      style={{ backgroundColor: t.correct, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}
                    >
                      <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                        {isUK ? '🎁 Забрати' : '🎁 Забрать'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {claimed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={16} color={t.textMuted} />
                      <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                        {isUK ? 'Отримано' : 'Получено'}
                      </Text>
                    </View>
                  )}
                </View>
            </PremiumCard>
            </Animated.View>
          );
        })}

        {claimedCount === tasks.length && tasks.length > 0 && (
          <View style={{ alignItems: 'center', padding: 24, gap: 8 }}>
            <Text style={{ fontSize: f.numLg + 12 }}>🎉</Text>
            <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '700' }}>
              {isUK ? 'Всі завдання виконано!' : 'Все задания выполнены!'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center' }}>
              {isUK ? "Нові завдання з'являться завтра о 00:00" : 'Новые задания появятся завтра в 00:00'}
            </Text>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
