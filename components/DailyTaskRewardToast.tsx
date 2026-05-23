import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { useStudyTarget } from './StudyTargetContext';
import { useOverlayVisible } from './OverlayArbiter';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING } from '../constants/motion';
import { triLang } from '../constants/i18n';
import { onAppEvent, emitAppEvent } from '../app/events';
import { checkAchievements } from '../app/achievements';
import { registerXP } from '../app/xp_manager';
import {
  DAILY_TASK_REROLL_MAX_PER_DAY,
  claimTaskWithReward,
  getDailyRerollsLeftToday,
  getTodayTasksSafe,
  loadTodayProgress,
  type DailyTask,
} from '../app/daily_tasks';
import { localizedDailyTaskStrings } from '../app/daily_tasks_es_locale';
import { storageStudyTarget, type RuntimeStudyTarget } from '../app/target_storage_keys';
import type { ThemeMode } from '../constants/theme';

const AUTO_DISMISS_MS = 12_000;
const CLAIM_DISMISS_MS = 360;
const MAX_QUEUE = 3;

type DailyTaskRewardToastItem = {
  taskId: string;
  taskTitle: string;
  xpBase: number;
  studyTarget?: RuntimeStudyTarget;
  tasksSnapshot: DailyTask[];
  previewOnly?: boolean;
  previewThemeMode?: ThemeMode;
};

type GradientColors = React.ComponentProps<typeof LinearGradient>['colors'];
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type DailyTaskRewardToastThemeStyle = {
  cardColors: GradientColors;
  sheenColors: GradientColors;
  accentRailColor: string;
  auraColor: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  shadowColor: string;
  iconName: IoniconName;
  iconBg: string;
  iconBorderColor: string;
  iconColor: string;
  titleColor: string;
  taskColor: string;
  xpColor: string;
  claimBg: string;
  claimText: string;
  claimBorderColor: string;
  claimingBg: string;
  claimingText: string;
  buttonIconName: IoniconName;
};

export const DAILY_TASK_REWARD_TOAST_THEME_STYLES: Record<ThemeMode, DailyTaskRewardToastThemeStyle> = {
  dark: {
    cardColors: ['#1D3224', '#08120B'],
    sheenColors: ['rgba(97,255,142,0.22)', 'rgba(97,255,142,0.05)', 'rgba(97,255,142,0)'],
    accentRailColor: '#47C870',
    auraColor: 'rgba(71,200,112,0.22)',
    borderColor: 'rgba(118,255,158,0.42)',
    borderWidth: 1,
    radius: 18,
    shadowColor: 'rgba(4,30,14,0.86)',
    iconName: 'leaf-outline',
    iconBg: 'rgba(71,200,112,0.18)',
    iconBorderColor: 'rgba(116,255,155,0.44)',
    iconColor: '#77F59D',
    titleColor: '#F1FFF3',
    taskColor: '#A9D9B7',
    xpColor: '#FFE17A',
    claimBg: '#47C870',
    claimText: '#042010',
    claimBorderColor: 'rgba(213,255,219,0.52)',
    claimingBg: '#203429',
    claimingText: '#A9D9B7',
    buttonIconName: 'gift-outline',
  },
  neon: {
    cardColors: ['#2A2E18', '#070807'],
    sheenColors: ['rgba(200,255,0,0.30)', 'rgba(200,255,0,0.08)', 'rgba(200,255,0,0)'],
    accentRailColor: '#C8FF00',
    auraColor: 'rgba(200,255,0,0.30)',
    borderColor: 'rgba(200,255,0,0.72)',
    borderWidth: 2,
    radius: 10,
    shadowColor: 'rgba(200,255,0,0.42)',
    iconName: 'flash-outline',
    iconBg: 'rgba(200,255,0,0.16)',
    iconBorderColor: 'rgba(200,255,0,0.72)',
    iconColor: '#C8FF00',
    titleColor: '#F8FFE4',
    taskColor: '#C9D79A',
    xpColor: '#C8FF00',
    claimBg: '#C8FF00',
    claimText: '#162000',
    claimBorderColor: '#F1FFC1',
    claimingBg: '#2C321F',
    claimingText: '#C9D79A',
    buttonIconName: 'flash-outline',
  },
  gold: {
    cardColors: ['#2A210F', '#090704'],
    sheenColors: ['rgba(255,220,139,0.34)', 'rgba(176,122,35,0.10)', 'rgba(176,122,35,0)'],
    accentRailColor: '#D8B45F',
    auraColor: 'rgba(214,179,90,0.30)',
    borderColor: 'rgba(255,218,137,0.58)',
    borderWidth: 1,
    radius: 20,
    shadowColor: 'rgba(0,0,0,0.90)',
    iconName: 'trophy-outline',
    iconBg: 'rgba(214,179,90,0.18)',
    iconBorderColor: 'rgba(255,226,150,0.56)',
    iconColor: '#F4D37A',
    titleColor: '#FFF7DE',
    taskColor: '#DCC895',
    xpColor: '#F4D37A',
    claimBg: '#D8B45F',
    claimText: '#0A0702',
    claimBorderColor: '#FFE8A6',
    claimingBg: '#302715',
    claimingText: '#DCC895',
    buttonIconName: 'diamond-outline',
  },
  coral: {
    cardColors: ['#3B2024', '#100809'],
    sheenColors: ['rgba(255,112,104,0.28)', 'rgba(255,190,122,0.08)', 'rgba(255,112,104,0)'],
    accentRailColor: '#FF6464',
    auraColor: 'rgba(255,100,100,0.26)',
    borderColor: 'rgba(255,124,116,0.52)',
    borderWidth: 1,
    radius: 18,
    shadowColor: 'rgba(60,8,14,0.82)',
    iconName: 'flame-outline',
    iconBg: 'rgba(255,100,100,0.18)',
    iconBorderColor: 'rgba(255,136,128,0.55)',
    iconColor: '#FF8A80',
    titleColor: '#FFF7F5',
    taskColor: '#E0BBC1',
    xpColor: '#FFD060',
    claimBg: '#FF6464',
    claimText: '#FFFFFF',
    claimBorderColor: 'rgba(255,218,210,0.62)',
    claimingBg: '#38262A',
    claimingText: '#E0BBC1',
    buttonIconName: 'flame-outline',
  },
  minimalLight: {
    cardColors: ['#FFFDF6', '#ECE1CF'],
    sheenColors: ['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.20)', 'rgba(255,255,255,0)'],
    accentRailColor: '#343842',
    auraColor: 'rgba(34,28,18,0.14)',
    borderColor: 'rgba(45,39,30,0.26)',
    borderWidth: 1,
    radius: 12,
    shadowColor: 'rgba(34,28,18,0.24)',
    iconName: 'ribbon-outline',
    iconBg: 'rgba(52,56,66,0.10)',
    iconBorderColor: 'rgba(52,56,66,0.26)',
    iconColor: '#273044',
    titleColor: '#171615',
    taskColor: '#48443C',
    xpColor: '#76531F',
    claimBg: '#343842',
    claimText: '#FFFFFF',
    claimBorderColor: '#565C6B',
    claimingBg: '#DED4C0',
    claimingText: '#48443C',
    buttonIconName: 'arrow-down-circle-outline',
  },
  minimalDark: {
    cardColors: ['#333840', '#181A1F'],
    sheenColors: ['rgba(130,178,255,0.24)', 'rgba(130,178,255,0.06)', 'rgba(130,178,255,0)'],
    accentRailColor: '#6EA8FF',
    auraColor: 'rgba(110,168,255,0.22)',
    borderColor: 'rgba(132,183,255,0.42)',
    borderWidth: 1,
    radius: 14,
    shadowColor: 'rgba(0,0,0,0.74)',
    iconName: 'diamond-outline',
    iconBg: 'rgba(110,168,255,0.15)',
    iconBorderColor: 'rgba(132,183,255,0.44)',
    iconColor: '#89BAFF',
    titleColor: '#F6F8FB',
    taskColor: '#B5BBC6',
    xpColor: '#E9B949',
    claimBg: '#6EA8FF',
    claimText: '#0E1A2F',
    claimBorderColor: '#BBD5FF',
    claimingBg: '#2D2F34',
    claimingText: '#B5BBC6',
    buttonIconName: 'sparkles-outline',
  },
};

function sameStorageTarget(a?: RuntimeStudyTarget, b?: RuntimeStudyTarget): boolean {
  return storageStudyTarget(a) === storageStudyTarget(b);
}

function itemKey(item: DailyTaskRewardToastItem): string {
  return `${storageStudyTarget(item.studyTarget)}:${item.taskId}`;
}

function matchesTask(
  item: DailyTaskRewardToastItem,
  taskId: string,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  if (item.taskId !== taskId) return false;
  if (studyTarget == null) return true;
  return sameStorageTarget(item.studyTarget, studyTarget);
}

async function refreshDailyTaskAchievements(
  tasksForClaim: DailyTask[],
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const progress = await loadTodayProgress(tasksForClaim, studyTarget);
  const allDone = progress.length > 0 && progress.every((p) => p.claimed);
  const noReroll = allDone
    ? (await getDailyRerollsLeftToday(studyTarget).catch(() => 0)) >= DAILY_TASK_REROLL_MAX_PER_DAY
    : false;
  await checkAchievements({ type: 'daily_task', allDone, noReroll, studyTarget }).catch(() => {});
}

export default function DailyTaskRewardToast() {
  const { f, ds, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const bottomOffset = useGlobalBottomOverlayOffset();

  const [toast, setToast] = useState<DailyTaskRewardToastItem | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [overlayWanted, setOverlayWanted] = useState(false);
  const overlayVisible = useOverlayVisible('dailyTaskRewardToast', overlayWanted);

  const translateY = useRef(new Animated.Value(150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const claimDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef<DailyTaskRewardToastItem | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const queueRef = useRef<DailyTaskRewardToastItem[]>([]);
  const claimingRef = useRef(false);

  const finishCurrent = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    claimingRef.current = false;
    setClaiming(false);

    if (next) {
      activeRef.current = next;
      activeKeyRef.current = itemKey(next);
      setToast(next);
      setOverlayWanted(true);
      return;
    }

    activeRef.current = null;
    activeKeyRef.current = null;
    setToast(null);
    setOverlayWanted(false);
  }, []);

  const dismissCurrent = useCallback((animated = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (claimDismissTimerRef.current) {
      clearTimeout(claimDismissTimerRef.current);
      claimDismissTimerRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!activeRef.current || !toast || !animated) {
      finishCurrent();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 150,
        duration: MOTION_DURATION.normal,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: MOTION_DURATION.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: MOTION_DURATION.fast,
        useNativeDriver: true,
      }),
    ]).start(finishCurrent);
  }, [finishCurrent, opacity, scale, toast, translateY]);

  const enqueue = useCallback((item: DailyTaskRewardToastItem) => {
    const key = itemKey(item);
    if (activeKeyRef.current === key) return;
    if (queueRef.current.some((queued) => itemKey(queued) === key)) return;

    if (activeRef.current) {
      if (queueRef.current.length >= MAX_QUEUE) queueRef.current.shift();
      queueRef.current.push(item);
      return;
    }

    activeRef.current = item;
    activeKeyRef.current = key;
    setClaiming(false);
    setToast(item);
    setOverlayWanted(true);
  }, []);

  const showPreview = useCallback((item: DailyTaskRewardToastItem) => {
    queueRef.current = queueRef.current.filter((queued) => !queued.previewOnly);

    if (activeRef.current?.previewOnly || !activeRef.current) {
      activeRef.current = item;
      activeKeyRef.current = itemKey(item);
      claimingRef.current = false;
      setClaiming(false);
      setToast(item);
      setOverlayWanted(true);
      return;
    }

    enqueue(item);
  }, [enqueue]);

  const showForCompletedTask = useCallback(async (
    taskId: string,
    eventStudyTarget?: RuntimeStudyTarget,
  ) => {
    const target = eventStudyTarget ?? studyTarget;
    if (eventStudyTarget != null && !sameStorageTarget(eventStudyTarget, studyTarget)) {
      return;
    }

    const tasks = await getTodayTasksSafe(target);
    if (tasks.length === 0) return;

    const progress = await loadTodayProgress(tasks, target);
    const row = progress.find((p) => p.taskId === taskId);
    if (!row?.completed || row.claimed) return;

    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const localized = localizedDailyTaskStrings(lang, task);
    enqueue({
      taskId: task.id,
      taskTitle: localized.title || task.titleRU,
      xpBase: task.xp,
      studyTarget: target,
      tasksSnapshot: tasks,
    });
  }, [enqueue, lang, studyTarget]);

  useEffect(() => {
    const completedSub = onAppEvent('daily_task_completed', (payload) => {
      void showForCompletedTask(payload.taskId, payload.studyTarget);
    });
    const previewSub = onAppEvent('daily_task_reward_toast_preview', (payload) => {
      showPreview({
        taskId: `admin-preview-${payload.themeMode}-${Date.now()}`,
        taskTitle: payload.taskTitle ?? `Admin preview: ${payload.themeMode}`,
        xpBase: payload.xpBase ?? 50,
        studyTarget,
        tasksSnapshot: [],
        previewOnly: true,
        previewThemeMode: payload.themeMode,
      });
    });
    const claimedSub = onAppEvent('daily_task_reward_claimed', (payload) => {
      queueRef.current = queueRef.current.filter(
        (queued) => !matchesTask(queued, payload.taskId, payload.studyTarget),
      );
      const current = activeRef.current;
      if (current && matchesTask(current, payload.taskId, payload.studyTarget)) {
        if (claimingRef.current) return;
        dismissCurrent();
      }
    });

    return () => {
      completedSub.remove();
      previewSub.remove();
      claimedSub.remove();
    };
  }, [dismissCurrent, showForCompletedTask, showPreview, studyTarget]);

  useEffect(() => {
    if (!toast || !overlayVisible) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    translateY.setValue(150);
    opacity.setValue(0);
    scale.setValue(0.96);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: MOTION_SPRING.toast.tension,
          friction: MOTION_SPRING.toast.friction,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: MOTION_DURATION.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: MOTION_SPRING.toast.tension,
          friction: MOTION_SPRING.toast.friction,
        }),
      ]).start();
    });

    hapticSuccess();
    timerRef.current = setTimeout(() => dismissCurrent(), AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [dismissCurrent, opacity, overlayVisible, scale, toast, translateY]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (claimDismissTimerRef.current) clearTimeout(claimDismissTimerRef.current);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const handleClaim = useCallback(async () => {
    const current = activeRef.current;
    if (!current || claiming) return;

    hapticTap();
    claimingRef.current = true;
    setClaiming(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      if (current.previewOnly) {
        hapticSuccess();
        claimDismissTimerRef.current = setTimeout(() => dismissCurrent(), CLAIM_DISMISS_MS);
        return;
      }

      const freshTasks = await getTodayTasksSafe(current.studyTarget);
      const tasksForClaim = freshTasks.length > 0 ? freshTasks : current.tasksSnapshot;
      const taskForXp = tasksForClaim.find((task) => task.id === current.taskId)
        ?? current.tasksSnapshot.find((task) => task.id === current.taskId);

      if (!taskForXp) {
        throw new Error('Daily task disappeared before claim.');
      }

      const { claimed, awardedXp } = await claimTaskWithReward(current.taskId, async () => {
        const result = await registerXP(taskForXp.xp, 'daily_task_reward', '', lang);
        return Math.max(0, Math.round(result.finalDelta || taskForXp.xp));
      }, { tasksForClaim, studyTarget: current.studyTarget });

      if (!claimed) {
        claimingRef.current = false;
        setClaiming(false);
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Награда уже получена или задание обновилось.',
          messageUk: 'Нагороду вже отримано або завдання оновилося.',
          messageEs: 'La recompensa ya está reclamada o la tarea cambió.',
        });
        dismissCurrent();
        return;
      }

      await refreshDailyTaskAchievements(tasksForClaim, current.studyTarget);
      hapticSuccess();
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: `+${awardedXp} XP получено`,
        messageUk: `+${awardedXp} XP отримано`,
        messageEs: `+${awardedXp} XP recibido`,
      });
      claimDismissTimerRef.current = setTimeout(() => dismissCurrent(), CLAIM_DISMISS_MS);
    } catch {
      hapticError();
      claimingRef.current = false;
      setClaiming(false);
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось забрать награду. Попробуйте ещё раз.',
        messageUk: 'Не вдалося забрати нагороду. Спробуйте ще раз.',
        messageEs: 'No se pudo reclamar la recompensa. Inténtalo de nuevo.',
      });
      timerRef.current = setTimeout(() => dismissCurrent(), AUTO_DISMISS_MS);
    }
  }, [claiming, dismissCurrent, lang]);

  if (!toast || !overlayVisible) return null;

  const claimLabel = triLang(lang, {
    ru: 'Забрать',
    uk: 'Забрати',
    es: 'Reclamar',
    'pt-BR': 'Resgatar',
    vi: 'Nhận',
    id: 'Ambil',
    tr: 'Al',
    pl: 'Odbierz',
  });
  const claimingLabel = triLang(lang, {
    ru: 'Забираем',
    uk: 'Забираємо',
    es: 'Reclamando',
    'pt-BR': 'Resgatando',
    vi: 'Đang nhận',
    id: 'Mengambil',
    tr: 'Alınıyor',
    pl: 'Odbieranie',
  });
  const title = triLang(lang, {
    ru: 'Задание дня выполнено',
    uk: 'Завдання дня виконано',
    es: 'Tarea diaria completada',
    'pt-BR': 'Tarefa diária concluída',
    vi: 'Đã hoàn thành nhiệm vụ ngày',
    id: 'Tugas harian selesai',
    tr: 'Günlük görev tamamlandı',
    pl: 'Zadanie dnia ukończone',
  });
  const xpText = triLang(lang, {
    ru: `Награда: +${toast.xpBase} XP`,
    uk: `Нагорода: +${toast.xpBase} XP`,
    es: `Recompensa: +${toast.xpBase} XP`,
    'pt-BR': `Recompensa: +${toast.xpBase} XP`,
    vi: `Phần thưởng: +${toast.xpBase} XP`,
    id: `Hadiah: +${toast.xpBase} XP`,
    tr: `Ödül: +${toast.xpBase} XP`,
    pl: `Nagroda: +${toast.xpBase} XP`,
  });
  const visualThemeMode = toast.previewThemeMode ?? themeMode;
  const themeStyle = DAILY_TASK_REWARD_TOAST_THEME_STYLES[visualThemeMode];
  const claimBg = claiming ? themeStyle.claimingBg : themeStyle.claimBg;
  const claimFg = claiming ? themeStyle.claimingText : themeStyle.claimText;
  const claimIcon = claiming ? 'hourglass-outline' : themeStyle.buttonIconName;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          bottom: bottomOffset,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.aura,
          {
            backgroundColor: themeStyle.auraColor,
            borderRadius: themeStyle.radius + 12,
          },
        ]}
      />
      <LinearGradient
        colors={themeStyle.cardColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: themeStyle.borderColor,
            borderRadius: themeStyle.radius,
            borderWidth: themeStyle.borderWidth,
            shadowColor: themeStyle.shadowColor,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.accentRail,
            {
              backgroundColor: themeStyle.accentRailColor,
              width: Math.max(5, themeStyle.borderWidth + 4),
            },
          ]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={themeStyle.sheenColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.sheen}
        />
        <View style={[
          styles.iconWrap,
          {
            backgroundColor: themeStyle.iconBg,
            borderColor: themeStyle.iconBorderColor,
          },
        ]}>
          <Ionicons name={themeStyle.iconName} size={22} color={themeStyle.iconColor} />
        </View>

        <View style={styles.copy}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={[styles.title, { color: themeStyle.titleColor, fontSize: f.body }]}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={[styles.task, { color: themeStyle.taskColor, fontSize: f.sub }]}
          >
            {toast.taskTitle}
          </Text>
          <Text style={[styles.xp, { color: themeStyle.xpColor, fontSize: f.caption }]}>
            {xpText}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.86}
          disabled={claiming}
          onPress={handleClaim}
          style={[
            styles.claimButton,
            {
              backgroundColor: claimBg,
              borderColor: themeStyle.claimBorderColor,
              minHeight: Math.max(44, ds.buttonHeight - 8),
            },
          ]}
        >
          <Ionicons
            name={claimIcon}
            size={16}
            color={claimFg}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={[
              styles.claimText,
              { color: claimFg, fontSize: f.caption },
            ]}
          >
            {claiming ? claimingLabel : claimLabel}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9998,
    elevation: 9998,
  },
  aura: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 9,
    bottom: -6,
  },
  card: {
    minHeight: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 54,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontWeight: '900',
    letterSpacing: 0,
  },
  task: {
    fontWeight: '700',
    letterSpacing: 0,
  },
  xp: {
    marginTop: 2,
    fontWeight: '900',
    letterSpacing: 0,
  },
  claimButton: {
    width: 104,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  claimText: {
    flexShrink: 1,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
