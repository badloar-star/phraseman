import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess } from '../hooks/use-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { getVerifiedPremiumStatus } from './premium_guard';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { localizedDailyTaskStrings } from './daily_tasks_es_locale';
import PremiumCard from '../components/PremiumCard';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { checkAchievements } from './achievements';
import {
  claimTaskWithReward,
  countClaimedForTaskList,
  DailyTask,
  getTodayTasks,
  getTodayKey,
  getTodayTasksSafe, loadTodayProgress,
  TaskProgress,
} from './daily_tasks';
import { LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';
import { getCurrentMultiplier, registerXP } from './xp_manager';
import { claimDailyTasksAllShardsReward } from './shards_system';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { emitAppEvent, onAppEvent } from './events';

const PREMIUM_TASK_TYPES = new Set([
  'quiz_hard', 'quiz_medium', 'quiz_perfect', 'quiz_hard_perfect',
]);
const FALLBACK_DAILY_TASKS = getTodayTasks();
const FALLBACK_DAILY_PROGRESS = FALLBACK_DAILY_TASKS.map((t) => ({
  taskId: t.id,
  current: 0,
  completed: false,
  claimed: false,
}));

export default function DailyTasksScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  // Instant first paint: show deterministic local fallback tasks immediately.
  const [tasks, setTasks] = useState<DailyTask[]>(FALLBACK_DAILY_TASKS);
  const [progress, setProgress] = useState<TaskProgress[]>(FALLBACK_DAILY_PROGRESS);
  const [userName, setUserName] = useState('');
  const [claimedXP, setClaimedXP] = useState<number | null>(null);
  const [xpMultiplier, setXpMultiplier] = useState(1);
  const [hasPremium, setHasPremium] = useState(false);
  const xpAnim = useRef(new Animated.Value(0)).current;
  const claimAnims = useRef<Record<string, Animated.Value>>({});

  // Анимации для премиум-плашки
  const premiumPulse    = useRef(new Animated.Value(1)).current;
  const premiumSparkle  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(premiumPulse,   { toValue: 1.08, duration: 700, useNativeDriver: true }),
      Animated.timing(premiumPulse,   { toValue: 1.0,  duration: 700, useNativeDriver: true }),
    ]));
    const sparkle = Animated.loop(Animated.sequence([
      Animated.timing(premiumSparkle, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(premiumSparkle, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    pulse.start();
    sparkle.start();
    return () => { pulse.stop(); sparkle.stop(); };
  }, [premiumPulse, premiumSparkle]);

  // Инициализируем анимации при изменении tasks (useEffect, не в теле рендера)
  useEffect(() => {
    (tasks ?? []).forEach(task => {
      if (!claimAnims.current[task.id]) {
        claimAnims.current[task.id] = new Animated.Value(1);
      }
    });
  }, [tasks]);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    getCurrentMultiplier().then(setXpMultiplier).catch(() => {});
    getVerifiedPremiumStatus().then(setHasPremium).catch(() => {});
  }, []);

  // Список заданий и прогресс с экрана должны ссылаться на один и тот же набор task id
  // (после смены уровня/премиума/подмен заданий), и прогресс в storage — быть с ним согласован.
  const refreshGen = useRef(0);
  const refreshTasksAndProgress = useCallback(() => {
    const gen = ++refreshGen.current;
    (async () => {
      const list = await getTodayTasksSafe();
      if (gen !== refreshGen.current) return;
      setTasks(list);
      const p = await loadTodayProgress(list);
      if (gen !== refreshGen.current) return;
      setProgress(p);
    })();
  }, []);

  useFocusEffect(useCallback(() => { refreshTasksAndProgress(); }, [refreshTasksAndProgress]));

  useEffect(() => {
    const sub = onAppEvent('daily_task_reward_claimed', () => { refreshTasksAndProgress(); });
    return () => sub.remove();
  }, [refreshTasksAndProgress]);

  const handleClaim = async (taskId: string, xpBase: number) => {
    try {
      const { claimed, awardedXp } = await claimTaskWithReward(taskId, async () => {
        if (!userName) {
          return xpBase;
        }
        try {
          const result = await registerXP(xpBase, 'daily_task_reward', userName, lang);
          return Math.max(0, Math.round(result.finalDelta || xpBase));
        } catch {
          // Не блокируем выдачу награды из-за transient-сбоя XP-пайплайна.
          return xpBase;
        }
      });
      if (!claimed) {
        refreshTasksAndProgress();
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Награда уже получена или данные обновились. Проверьте список задач.',
          messageUk: 'Нагороду вже отримано або дані оновилися. Перевірте список завдань.',
          messageEs: 'La recompensa ya está reclamada o los datos cambiaron. Revisa la lista de tareas.',
        });
        return;
      }
      const t = await getTodayTasksSafe();
      setTasks(t);
      const newProgress = await loadTodayProgress(t);
      setProgress(newProgress);

      const allDone = newProgress.length > 0 && newProgress.every(p => p.claimed);
      checkAchievements({ type: 'daily_task', allDone }).catch(() => {});
      if (allDone) {
        const today = getTodayKey();
        await claimDailyTasksAllShardsReward(today);
      }
      void hapticSuccess();
      const anim = claimAnims.current[taskId];
      if (anim) {
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
      }
      setClaimedXP(awardedXp);
      xpAnim.setValue(0);
      Animated.sequence([
        Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(xpAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setClaimedXP(null));
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось забрать награду. Попробуйте снова.',
        messageUk: 'Не вдалося забрати нагороду. Спробуйте ще раз.',
        messageEs: 'No se pudo reclamar la recompensa. Inténtalo de nuevo.',
      });
    }
  };

  const claimedCount = countClaimedForTaskList(tasks, progress);

  const handleTaskNav = async (task: DailyTask) => {
    if (PREMIUM_TASK_TYPES.has(task.type) && !hasPremium) {
      const paywallContext =
        task.type === 'quiz_hard'
          ? 'quiz_hard'
          : task.type === 'quiz_medium'
            ? 'quiz_medium'
            : 'quiz_level';
      router.push({ pathname: '/premium_modal', params: { context: paywallContext } } as any);
      return;
    }
    const lastLesson = await AsyncStorage.getItem('last_opened_lesson');
    const lessonId = parseInt(lastLesson || '1', 10);
    switch (task.type) {
      case 'total_answers':
      case 'correct_streak':
      case 'lesson_no_mistakes':
      case 'daily_active':
      case 'lesson_complete':
      case 'different_lessons':
      case 'morning_session':
      case 'evening_session':
      case 'energy_spend':
        await primeLessonScreenFromStorage(lessonId);
        router.push({ pathname: '/lesson1', params: { id: lessonId } });
        break;
      case 'verb_learned': {
        let verbLessonId = lessonId;
        if (!LESSONS_WITH_IRREGULAR_VERBS.has(verbLessonId)) {
          const sorted = [...LESSONS_WITH_IRREGULAR_VERBS].sort((a, b) => a - b);
          verbLessonId = sorted[0] ?? 1;
        }
        router.push({ pathname: '/lesson_irregular_verbs', params: { id: verbLessonId } });
        break;
      }
      case 'words_learned':
        router.push({ pathname: '/lesson_words', params: { id: lessonId } });
        break;
      case 'quiz_hard':
        await AsyncStorage.setItem('quiz_nav_level', 'hard');
        router.replace('/(tabs)/quizzes');
        break;
      case 'quiz_score':
      case 'quiz_perfect':
        await AsyncStorage.setItem('quiz_nav_level', 'easy');
        router.replace('/(tabs)/quizzes');
        break;
      case 'quiz_easy':
        await AsyncStorage.setItem('quiz_nav_level', 'easy');
        router.replace('/(tabs)/quizzes');
        break;
      case 'quiz_medium':
        await AsyncStorage.setItem('quiz_nav_level', 'medium');
        router.replace('/(tabs)/quizzes');
        break;
      case 'quiz_hard_perfect':
        await AsyncStorage.setItem('quiz_nav_level', 'hard');
        router.replace('/(tabs)/quizzes');
        break;
      case 'open_theory':
        router.push({ pathname: '/lesson_help', params: { id: lessonId } });
        break;
      case 'flashcard_view':
      case 'flashcard_save':
      case 'flashcard_flip':
        router.push('/flashcards');
        break;
      case 'recall_session':
      case 'recall_answers':
      case 'recall_perfect':
        router.push('/review');
        break;
      case 'daily_phrase_read':
      case 'daily_phrase_save':
        router.replace('/(tabs)/home');
        break;
      case 'diagnostic_complete':
        router.push('/diagnostic_test');
        break;
      case 'arena_play':
      case 'arena_win':
        router.replace('/(tabs)/arena' as any);
        break;
      default:
        await primeLessonScreenFromStorage(lessonId);
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
            {triLang(lang, { ru: 'Задания дня', uk: 'Завдання дня', es: 'Tareas del día' })}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>{claimedCount}/{tasks.length}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.label }}>
            {triLang(lang, { ru: 'получено', uk: 'виконано', es: 'reclamadas' })}
          </Text>
        </View>
      </View>

      {claimedXP !== null && (
        <Animated.View style={{
          position: 'absolute', top: 80, alignSelf: 'center', zIndex: 100,
          backgroundColor: t.correct, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
          opacity: xpAnim,
          transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        }}>
          <XpGainBadge amount={claimedXP} visible={claimedXP !== null} style={{ color: t.correctText, fontSize: f.h1, fontWeight: '800' }} />
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>

        {/* Прогресс */}
        <PremiumCard level={2} style={{ marginBottom: 4 }} innerStyle={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
              {triLang(lang, { ru: 'Прогресс дня', uk: 'Прогрес дня', es: 'Progreso del día' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub }}>{claimedCount}/{tasks.length || 0}</Text>
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
          const { title: taskTitle, desc: taskDesc } = localizedDailyTaskStrings(lang, task);

          const isPremiumTask = PREMIUM_TASK_TYPES.has(task.type);

          return (
            <Animated.View key={task.id} style={{ transform: [{ scale: anim }] }}>
            <PremiumCard
              level={2}
              active={completed && !claimed}
              disabled={claimed}
              // For claimable tasks, the card itself must not steal touch events from the claim button.
              onPress={completed && !claimed ? undefined : (claimed ? undefined : () => handleTaskNav(task))}
              innerStyle={{ padding: 16 }}
            >
                {/* Плашка Premium */}
                {isPremiumTask && (
                  <Animated.View style={{
                    position: 'absolute', bottom: -1, right: -1, zIndex: 10,
                    transform: [{ scale: premiumPulse }],
                    borderBottomRightRadius: 14, borderTopLeftRadius: 10,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: '#B8860B',
                      borderWidth: 1, borderColor: '#FFD700',
                      borderBottomRightRadius: 14, borderTopLeftRadius: 10,
                      paddingHorizontal: 10, paddingVertical: 5,
                    }}>
                      <Animated.Text style={{ fontSize: 11, opacity: premiumSparkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }}>✨</Animated.Text>
                      <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>PREMIUM</Text>
                      <Animated.Text style={{ fontSize: 11, opacity: premiumSparkle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }}>✨</Animated.Text>
                    </View>
                  </Animated.View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: f.numLg }}>{task.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', marginBottom: 3 }}>
                      {taskTitle}
                    </Text>
                    <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: f.sub * 1.5 }}>
                      {taskDesc}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: claimed ? t.bgSurface : t.correctBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', borderWidth: claimed ? 0 : 1, borderColor: t.correct + '55' }}>
                    <Text style={{ color: claimed ? t.textMuted : t.textSecond, fontSize: f.body, fontWeight: '700' }}>+{Math.round(task.xp * xpMultiplier)}</Text>
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
                        {triLang(lang, { ru: '🎁 Забрать', uk: '🎁 Забрати', es: '🎁 Reclamar' })}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {claimed && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-circle" size={16} color={t.textMuted} />
                      <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                        {triLang(lang, { ru: 'Получено', uk: 'Отримано', es: 'Reclamado' })}
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
              {triLang(lang, {
                ru: 'Все задания выполнены!',
                uk: 'Всі завдання виконано!',
                es: '¡Has completado todas las tareas!',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Новые задания появятся завтра в 00:00',
                uk: "Нові завдання з'являться завтра о 00:00",
                es: 'Las nuevas tareas aparecerán mañana a las 00:00',
              })}
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
