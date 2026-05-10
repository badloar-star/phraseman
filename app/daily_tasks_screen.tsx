import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess } from '../hooks/use-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { getVerifiedPremiumStatus } from './premium_guard';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { localizedDailyTaskStrings } from './daily_tasks_es_locale';
import ReportErrorButton from '../components/ReportErrorButton';
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
  getArenaComboRequirement,
  getTodayTasksSafe, loadTodayProgress,
  TaskProgress,
  rerollDailyTask,
  getDailyRerollsLeftToday,
  DAILY_TASK_REROLL_COST_SHARDS,
} from './daily_tasks';
import { LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';
import { getCurrentMultiplier, registerXP } from './xp_manager';
import {
  claimDailyTasksAllShardsReward,
  isDailyTasksAllShardsRewardClaimedForDay,
  SHARD_REWARDS,
  getShardsBalance,
} from './shards_system';
import { Image } from 'expo-image';
import { hapticTap } from '../hooks/use-haptics';
import { oskolokImageForPackShards } from './oskolok';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { emitAppEvent, onAppEvent } from './events';

const PREMIUM_TASK_TYPES = new Set([
  'quiz_hard', 'quiz_medium', 'quiz_perfect', 'quiz_hard_perfect',
]);

export default function DailyTasksScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  // Не подставляем getTodayTasks() (всегда тир уровня 1) — иначе после обновления/холодного старта
  // карточки не совпадают с AsyncStorage и «Забрать» не срабатывает, пока не перезагрузишь экран.
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  /** Первый успешный refresh завершён — можно рисовать список и клеймить тем же набором id, что на экране. */
  const [screenReady, setScreenReady] = useState(false);
  const [userName, setUserName] = useState('');
  const [claimedXP, setClaimedXP] = useState<number | null>(null);
  const [xpMultiplier, setXpMultiplier] = useState(1);
  const [hasPremium, setHasPremium] = useState(false);
  /** Награда «3 осколка за тройку дня» уже забрана сегодня (AsyncStorage / облако). */
  const [trioShardsClaimed, setTrioShardsClaimed] = useState(false);
  /** Сколько замен ещё доступно сегодня (max DAILY_TASK_REROLL_MAX_PER_DAY). */
  const [rerollsLeft, setRerollsLeft] = useState(0);
  /** Подтверждение замены: если null — модалка скрыта. */
  const [rerollConfirm, setRerollConfirm] = useState<{ task: DailyTask } | null>(null);
  /** taskId, для которого сейчас идёт сетевой запрос замены (одна за раз). */
  const [rerollBusyId, setRerollBusyId] = useState<string | null>(null);
  /** Антидребезг клейма: свежий getTodayTasksSafe + registerXP не дают второго тапа «в никуда». */
  const [claimBusyId, setClaimBusyId] = useState<string | null>(null);
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
      try {
        const list = await getTodayTasksSafe();
        if (gen !== refreshGen.current) return;
        setTasks(list);
        const p = await loadTodayProgress(list);
        if (gen !== refreshGen.current) return;
        setProgress(p);
        const trio = await isDailyTasksAllShardsRewardClaimedForDay(getTodayKey());
        if (gen !== refreshGen.current) return;
        setTrioShardsClaimed(trio);
        const left = await getDailyRerollsLeftToday();
        if (gen !== refreshGen.current) return;
        setRerollsLeft(left);
      } catch {
        if (gen !== refreshGen.current) return;
        const fallback = getTodayTasks();
        setTasks(fallback);
        setProgress(fallback.map((x) => ({ taskId: x.id, current: 0, completed: false, claimed: false })));
        setRerollsLeft(0);
      } finally {
        if (gen === refreshGen.current) setScreenReady(true);
      }
    })();
  }, []);

  const handleRerollConfirm = useCallback(async () => {
    const target = rerollConfirm?.task;
    if (!target || rerollBusyId) return;
    setRerollBusyId(target.id);
    try {
      const balance = await getShardsBalance();
      if (balance < DAILY_TASK_REROLL_COST_SHARDS) {
        const need = Math.max(0, DAILY_TASK_REROLL_COST_SHARDS - balance);
        setRerollConfirm(null);
        router.push({
          pathname: '/shards_shop',
          params: { need: String(need), source: 'daily_task_reroll' },
        } as any);
        return;
      }
      const r = await rerollDailyTask(target.id);
      if (r.ok) {
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: `🔄 Задание заменено · −${r.cost} 💎`,
          messageUk: `🔄 Завдання замінено · −${r.cost} 💎`,
          messageEs: `🔄 Tarea reemplazada · −${r.cost} 💎`,
        });
        setRerollConfirm(null);
        refreshTasksAndProgress();
        return;
      }
      if (r.reason === 'insufficient_shards') {
        const balance2 = await getShardsBalance();
        const need = Math.max(0, DAILY_TASK_REROLL_COST_SHARDS - balance2);
        setRerollConfirm(null);
        router.push({
          pathname: '/shards_shop',
          params: { need: String(need), source: 'daily_task_reroll' },
        } as any);
        return;
      }
      const reasonMsg: Record<string, { ru: string; uk: string; es: string }> = {
        limit_reached: {
          ru: 'Сегодня ты уже использовал замену. Завтра будет новая попытка.',
          uk: 'Сьогодні ти вже використав заміну. Завтра буде нова спроба.',
          es: 'Ya usaste tu reemplazo de hoy. Mañana podrás reemplazar otra tarea.',
        },
        task_already_completed: {
          ru: 'Это задание уже выполнено — заменять нечего.',
          uk: 'Це завдання вже виконане — замінювати нема чого.',
          es: 'Esta tarea ya está completada, no hay nada que reemplazar.',
        },
        no_candidates: {
          ru: 'Не нашлось подходящей замены — попробуй другое задание.',
          uk: 'Не знайшлось гідної заміни — спробуй інше завдання.',
          es: 'No hay reemplazo disponible. Prueba con otra tarea.',
        },
      };
      const msg = reasonMsg[r.reason] ?? {
        ru: 'Не удалось заменить задание. Попробуй ещё раз.',
        uk: 'Не вдалося замінити завдання. Спробуй ще раз.',
        es: 'No se pudo reemplazar la tarea. Inténtalo de nuevo.',
      };
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: msg.ru,
        messageUk: msg.uk,
        messageEs: msg.es,
      });
      setRerollConfirm(null);
    } finally {
      setRerollBusyId(null);
    }
  }, [rerollConfirm, rerollBusyId, refreshTasksAndProgress, router]);

  useFocusEffect(useCallback(() => { refreshTasksAndProgress(); }, [refreshTasksAndProgress]));

  useEffect(() => {
    const sub = onAppEvent('daily_task_reward_claimed', () => { refreshTasksAndProgress(); });
    return () => sub.remove();
  }, [refreshTasksAndProgress]);

  const handleClaim = async (taskId: string, xpBase: number) => {
    if (claimBusyId) return;
    setClaimBusyId(taskId);
    try {
      const freshList = await getTodayTasksSafe();
      const tasksForClaim = freshList.length > 0 ? freshList : tasks;
      const { claimed, awardedXp } = await claimTaskWithReward(taskId, async () => {
        // registerXP сам резолвит имя из canonical UID + уровня, если userName пустой.
        // Раньше тут был ранний return при !userName — это и был баг "опыт не начислен"
        // когда пользователь жмёт Забрать до того, как AsyncStorage.getItem('user_name') резолвится.
        try {
          const result = await registerXP(xpBase, 'daily_task_reward', userName || '', lang);
          return Math.max(0, Math.round(result.finalDelta || xpBase));
        } catch {
          // Не блокируем выдачу награды из-за transient-сбоя XP-пайплайна.
          return xpBase;
        }
      }, { tasksForClaim });
      // Снимаем спиннер сразу после клейма: дальше могут быть медленные getTodayTasksSafe/loadTodayProgress.
      setClaimBusyId(null);
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
    } finally {
      setClaimBusyId(null);
    }
  };

  const handleClaimTrioShards = useCallback(async () => {
    if (tasks.length === 0) return;
    const done = tasks.every((task) => {
      const p = progress.find((pr) => pr.taskId === task.id);
      return p?.completed === true;
    });
    if (!done || trioShardsClaimed) return;
    try {
      const ok = await claimDailyTasksAllShardsReward(getTodayKey());
      if (ok) {
        setTrioShardsClaimed(true);
        void hapticSuccess();
        refreshTasksAndProgress();
        return;
      }
      const synced = await isDailyTasksAllShardsRewardClaimedForDay(getTodayKey());
      setTrioShardsClaimed(synced);
      if (!synced) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Не удалось получить осколки. Попробуйте снова.',
          messageUk: 'Не вдалося отримати уламки. Спробуйте ще раз.',
          messageEs: 'No se pudieron obtener fragmentos. Inténtalo de nuevo.',
        });
      }
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Ошибка при получении осколков.',
        messageUk: 'Помилка під час отримання уламків.',
        messageEs: 'Error al obtener fragmentos.',
      });
    }
  }, [tasks, progress, trioShardsClaimed, refreshTasksAndProgress]);

  const claimedCount = countClaimedForTaskList(tasks, progress);
  const allTasksObjectivesDone =
    tasks.length > 0 &&
    tasks.every((task) => {
      const p = progress.find((pr) => pr.taskId === task.id);
      return p?.completed === true;
    });
  const trioRewardCount = SHARD_REWARDS.daily_tasks_all;
  const trioClaimButtonEnabled = allTasksObjectivesDone && !trioShardsClaimed;

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
      case 'different_lessons':
        // "Заниматься в N разных уроках" — отправляем в список, чтобы пользователь мог выбрать другой урок.
        router.replace('/(tabs)/lessons' as any);
        break;
      case 'total_answers':
      case 'correct_streak':
      case 'lesson_no_mistakes':
      case 'daily_active':
      case 'lesson_complete':
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
        router.push('/trainer');
        break;
      case 'daily_phrase_read':
      case 'daily_phrase_save':
        router.replace('/(tabs)/home');
        break;
      case 'diagnostic_complete':
        router.push('/diagnostic_test');
        break;
      case 'invite_friend':
        // На iPhone экран с приглашением по ссылке скрыт — ведём во «Друзья» (код).
        if (Platform.OS === 'ios') {
          router.push('/(tabs)/friends' as any);
        } else {
          router.push('/settings_invite_friend' as any);
        }
        break;
      case 'arena_play':
      case 'arena_win':
      case 'arena_rank_promoted':
      case 'arena_plays_wins_combo':
        router.replace({
          pathname: '/(tabs)/arena' as any,
          params: { autoSearch: '1', playAgainTs: String(Date.now()) },
        });
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

  if (!screenReady) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <ActivityIndicator size="large" color={t.accent} />
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flex: 1 }}>
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >

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

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 14,
              paddingTop: 12,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: t.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image
                source={oskolokImageForPackShards(trioRewardCount)}
                style={{
                  width: 26,
                  height: 26,
                  opacity: trioShardsClaimed ? 0.55 : trioClaimButtonEnabled ? 1 : 0.38,
                }}
                contentFit="contain"
              />
              <Text
                style={{
                  fontSize: f.numMd,
                  fontWeight: '800',
                  color: trioShardsClaimed ? t.textMuted : trioClaimButtonEnabled ? t.textPrimary : t.textMuted,
                  opacity: trioClaimButtonEnabled || trioShardsClaimed ? 1 : 0.5,
                }}
              >
                {trioRewardCount}
              </Text>
            </View>
            {trioShardsClaimed ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={18} color={t.textMuted} />
                <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '600' }}>
                  {triLang(lang, { ru: 'Получено', uk: 'Отримано', es: 'Listo' })}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleClaimTrioShards}
                disabled={!trioClaimButtonEnabled}
                activeOpacity={trioClaimButtonEnabled ? 0.85 : 1}
                style={{
                  backgroundColor: trioClaimButtonEnabled ? t.correct : t.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  opacity: trioClaimButtonEnabled ? 1 : 0.55,
                }}
              >
                <Text
                  style={{
                    color: trioClaimButtonEnabled ? t.correctText : t.textMuted,
                    fontSize: f.body,
                    fontWeight: '700',
                  }}
                >
                  {triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Reclamar' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </PremiumCard>

        {sortedTasks.map((task) => {
          const p = progress.find(pr => pr.taskId === task.id);
          const current = p?.current ?? 0;
          const completed = p?.completed ?? false;
          const claimed = p?.claimed ?? false;
          const isArenaCombo = task.type === 'arena_plays_wins_combo';
          const comboReq = isArenaCombo ? getArenaComboRequirement(task) : null;
          const comboPlaysDisp = isArenaCombo && comboReq
            ? Math.min(comboReq.minPlays, p?.comboPlays ?? current)
            : 0;
          const comboWinsDisp = isArenaCombo && comboReq ? (p?.comboWins ?? 0) : 0;
          const pct = isArenaCombo && comboReq
            ? Math.min(
                100,
                (comboPlaysDisp / comboReq.minPlays) * 50 + (comboWinsDisp >= comboReq.minWins ? 50 : 0),
              )
            : Math.min((current / task.target) * 100, 100);
          const progressLine = isArenaCombo && comboReq
            ? triLang(lang, {
                ru: `Матчи ${comboPlaysDisp}/${comboReq.minPlays} · побед ${comboWinsDisp}/${comboReq.minWins}`,
                uk: `Матчі ${comboPlaysDisp}/${comboReq.minPlays} · перемог ${comboWinsDisp}/${comboReq.minWins}`,
                es: `Partidas ${comboPlaysDisp}/${comboReq.minPlays} · victorias ${comboWinsDisp}/${comboReq.minWins}`,
              })
            : `${current} / ${task.target}`;
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
                  <Animated.View
                    pointerEvents="box-none"
                    style={{
                    position: 'absolute', bottom: -1, right: -1, zIndex: 10,
                    transform: [{ scale: premiumPulse }],
                    borderBottomRightRadius: 14, borderTopLeftRadius: 10,
                    overflow: 'hidden',
                  }}
                  >
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
                  <Text style={{ color: t.textMuted, fontSize: f.caption }}>{progressLine}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {!completed && !claimed && rerollsLeft > 0 && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          hapticTap();
                          setRerollConfirm({ task });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={triLang(lang, {
                          ru: 'Заменить задание за осколки',
                          uk: 'Замінити завдання за осколки',
                          es: 'Reemplazar tarea por fragmentos',
                        })}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: t.bgSurface,
                          borderWidth: 1,
                          borderColor: t.border,
                        }}
                      >
                        <Ionicons name="refresh" size={18} color={t.textPrimary} />
                      </TouchableOpacity>
                    )}
                    {completed && !claimed && (
                      <TouchableOpacity
                        onPress={() => { void handleClaim(task.id, task.xp); }}
                        disabled={claimBusyId === task.id}
                        activeOpacity={0.85}
                        style={{ backgroundColor: t.correct, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 120, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {claimBusyId === task.id ? (
                          <ActivityIndicator color={t.correctText} size="small" />
                        ) : (
                          <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                            {triLang(lang, { ru: '🎁 Забрать', uk: '🎁 Забрати', es: '🎁 Reclamar' })}
                          </Text>
                        )}
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

        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <ReportErrorButton
            screen="daily_tasks"
            dataId="daily_tasks_main"
            dataText={triLang(lang, {
              ru: 'Ежедневные задания',
              uk: 'Щоденні завдання',
              es: 'Tareas diarias',
            })}
          />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
      </View>
      </ContentWrap>

      {/* Confirm — заменить задание за осколки */}
      <Modal
        visible={rerollConfirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (rerollBusyId) return;
          setRerollConfirm(null);
        }}
      >
        <View style={rerollStyles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (rerollBusyId) return;
              hapticTap();
              setRerollConfirm(null);
            }}
          />
          <View style={[rerollStyles.card, { backgroundColor: t.bgCard }]}>
            <Text style={rerollStyles.emoji}>🔄</Text>
            <Text style={[rerollStyles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
              {triLang(lang, {
                ru: 'Заменить задание?',
                uk: 'Замінити завдання?',
                es: '¿Reemplazar la tarea?',
              })}
            </Text>
            {rerollConfirm?.task && (
              <Text style={[rerollStyles.subtitle, { color: t.textSecond, fontSize: f.body }]}>
                «{localizedDailyTaskStrings(lang, rerollConfirm.task).title}»
                {' — '}
                {triLang(lang, {
                  ru: 'будет заменено на случайное задание из той же категории.',
                  uk: 'буде замінено на випадкове завдання з тієї ж категорії.',
                  es: 'se reemplazará por una tarea aleatoria de la misma categoría.',
                })}
              </Text>
            )}

            <View style={rerollStyles.priceRow}>
              <Image
                source={oskolokImageForPackShards(DAILY_TASK_REROLL_COST_SHARDS)}
                style={{ width: 32, height: 32 }}
                contentFit="contain"
              />
              <Text style={[rerollStyles.priceNum, { color: t.textPrimary }]}>{DAILY_TASK_REROLL_COST_SHARDS}</Text>
            </View>

            <Text style={[rerollStyles.hint, { color: t.textMuted }]}>
              {triLang(lang, {
                ru: 'Лимит — 1 замена в сутки. Прогресс старого задания не сохранится.',
                uk: 'Ліміт — 1 заміна на добу. Прогрес старого завдання не збережеться.',
                es: 'Límite: 1 reemplazo por día. El progreso de la tarea anterior se perderá.',
              })}
            </Text>

            <TouchableOpacity
              onPress={() => {
                hapticTap();
                void handleRerollConfirm();
              }}
              disabled={!!rerollBusyId}
              style={[
                rerollStyles.btnPrimary,
                { backgroundColor: t.accent, opacity: rerollBusyId ? 0.6 : 1 },
              ]}
            >
              {rerollBusyId ? (
                <ActivityIndicator color={t.correctText} />
              ) : (
                <Text style={[rerollStyles.btnPrimaryText, { color: t.correctText, fontSize: f.body }]}>
                  {triLang(lang, {
                    ru: `Заменить · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
                    uk: `Замінити · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
                    es: `Reemplazar · ${DAILY_TASK_REROLL_COST_SHARDS} 💎`,
                  })}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (rerollBusyId) return;
                hapticTap();
                setRerollConfirm(null);
              }}
              style={[rerollStyles.btnGhost, { borderColor: t.border }]}
              disabled={!!rerollBusyId}
            >
              <Text style={[rerollStyles.btnGhostText, { color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </ScreenGradient>
  );
}

const rerollStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  emoji: { fontSize: 44 },
  title: { fontWeight: '900', textAlign: 'center' },
  subtitle: { lineHeight: 21, textAlign: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  priceNum: { fontSize: 24, fontWeight: '900' },
  hint: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  btnPrimary: {
    alignSelf: 'stretch',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 4,
  },
  btnPrimaryText: { fontWeight: '800' },
  btnGhost: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnGhostText: { fontWeight: '700' },
});
