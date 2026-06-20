import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getTodayTasksSafe,
  loadTodayProgress,
  rerollTodayDailyTaskSet,
  type DailyTask,
  type TaskProgress,
} from '../app/daily_tasks';
import { DAILY_TASK_ACHIEVEMENT_ICONS, DAILY_TASK_ID_ACHIEVEMENT_ICONS } from '../app/daily_task_achievement_icons';
import { navigateDailyTask } from '../app/daily_task_navigation';
import type { RuntimeStudyTarget } from '../app/target_storage_keys';
import { hapticTap } from '../hooks/use-haptics';
import type { ThemeMode } from '../constants/theme';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { LinearGradient } from './SafeLinearGradient';
import {
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

type DailyTasksFirstVisitModalProps = {
  visible: boolean;
  onClose: () => void;
  studyTarget?: RuntimeStudyTarget;
  previewOnly?: boolean;
  initialTasks?: DailyTask[];
};

type ThemeChrome = {
  accent: string;
  accentSoft: string;
  chipBg: string;
  chipText: string;
  taskGlow: string;
  taskBorder: string;
};

const THEME_CHROME: Record<ThemeMode, ThemeChrome> = {
  dark: {
    accent: '#8FE5AD',
    accentSoft: 'rgba(143,229,173,0.16)',
    chipBg: 'rgba(143,229,173,0.13)',
    chipText: '#DFFFE9',
    taskGlow: 'rgba(143,229,173,0.08)',
    taskBorder: 'rgba(143,229,173,0.24)',
  },
  gold: {
    accent: '#F4D889',
    accentSoft: 'rgba(244,216,137,0.18)',
    chipBg: 'rgba(244,216,137,0.16)',
    chipText: '#FFF1C1',
    taskGlow: 'rgba(244,216,137,0.10)',
    taskBorder: 'rgba(244,216,137,0.32)',
  },
  coral: {
    accent: '#FF9D8D',
    accentSoft: 'rgba(255,157,141,0.18)',
    chipBg: 'rgba(255,157,141,0.15)',
    chipText: '#FFE4DD',
    taskGlow: 'rgba(255,157,141,0.10)',
    taskBorder: 'rgba(255,157,141,0.30)',
  },
  minimalDark: {
    accent: '#6EA8FF',
    accentSoft: 'rgba(110,168,255,0.17)',
    chipBg: 'rgba(110,168,255,0.14)',
    chipText: '#D9E9FF',
    taskGlow: 'rgba(110,168,255,0.09)',
    taskBorder: 'rgba(110,168,255,0.28)',
  },
  midnight: {
    accent: '#9BA8FF',
    accentSoft: 'rgba(155,168,255,0.18)',
    chipBg: 'rgba(155,168,255,0.15)',
    chipText: '#E8EAFF',
    taskGlow: 'rgba(155,168,255,0.09)',
    taskBorder: 'rgba(155,168,255,0.28)',
  },
  ember: {
    accent: '#FFB36A',
    accentSoft: 'rgba(255,179,106,0.18)',
    chipBg: 'rgba(255,179,106,0.15)',
    chipText: '#FFE8CE',
    taskGlow: 'rgba(255,179,106,0.10)',
    taskBorder: 'rgba(255,179,106,0.30)',
  },
  aurora: {
    accent: '#7CF4D2',
    accentSoft: 'rgba(124,244,210,0.17)',
    chipBg: 'rgba(124,244,210,0.14)',
    chipText: '#D8FFF6',
    taskGlow: 'rgba(124,244,210,0.09)',
    taskBorder: 'rgba(124,244,210,0.28)',
  },
  volt: {
    accent: '#D7FF45',
    accentSoft: 'rgba(215,255,69,0.17)',
    chipBg: 'rgba(215,255,69,0.14)',
    chipText: '#F4FFC0',
    taskGlow: 'rgba(215,255,69,0.09)',
    taskBorder: 'rgba(215,255,69,0.30)',
  },
};

const TITLE_VARIANTS = [
  'Вот что можно сделать сегодня',
  'Вот твой маленький план на сегодня',
] as const;

const CARD_ANIMATION_MS = 230;

function getDailyTitle(): string {
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  return TITLE_VARIANTS[dayNumber % TITLE_VARIANTS.length];
}

function getTaskIcon(task: DailyTask) {
  return DAILY_TASK_ID_ACHIEVEMENT_ICONS[task.id] ?? DAILY_TASK_ACHIEVEMENT_ICONS[task.type];
}

function taskTitle(task: DailyTask): string {
  return task.titleRU || task.titleUK || 'Задание дня';
}

function taskProgressText(task: DailyTask, progress?: TaskProgress): string {
  const current = Math.max(0, Math.min(task.target, progress?.current ?? 0));
  return `${current}/${task.target}`;
}

export default function DailyTasksFirstVisitModal({
  visible,
  onClose,
  studyTarget,
  previewOnly = false,
  initialTasks,
}: DailyTasksFirstVisitModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, f, ds } = useTheme();
  const { lang } = useLang();
  const chrome = THEME_CHROME[themeMode] ?? THEME_CHROME.minimalDark;
  const cardAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const panelAnim = useRef(new Animated.Value(0)).current;
  const [tasks, setTasks] = useState<DailyTask[]>(initialTasks ?? []);
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [previewShift, setPreviewShift] = useState(0);

  const title = useMemo(getDailyTitle, [visible]);
  const panelColors = rewardModalPanelColors(themeMode, theme);
  const primaryColors = rewardModalPrimaryButtonColors(themeMode);
  const primaryTextColor = rewardModalPrimaryButtonText(themeMode);

  const animateCardsIn = useCallback(() => {
    cardAnims.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      58,
      cardAnims.map((anim) => Animated.timing(anim, {
        toValue: 1,
        duration: CARD_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })),
    ).start();
  }, [cardAnims]);

  const animateCardsOut = useCallback(() => new Promise<void>((resolve) => {
    Animated.parallel(cardAnims.map((anim) => Animated.timing(anim, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }))).start(() => resolve());
  }), [cardAnims]);

  const loadTasks = useCallback(async () => {
    if (initialTasks?.length) {
      setTasks(initialTasks);
      setProgress([]);
      return;
    }
    setLoading(true);
    setErrorText(null);
    try {
      const nextTasks = await getTodayTasksSafe(studyTarget);
      const nextProgress = await loadTodayProgress(nextTasks, studyTarget);
      setTasks(nextTasks);
      setProgress(nextProgress);
    } catch {
      setErrorText('Не получилось открыть задания. Попробуй ещё раз.');
    } finally {
      setLoading(false);
    }
  }, [initialTasks, studyTarget]);

  useEffect(() => {
    if (!visible) {
      panelAnim.stopAnimation();
      panelAnim.setValue(0);
      return;
    }
    panelAnim.setValue(0);
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    void loadTasks();
  }, [loadTasks, panelAnim, visible]);

  useEffect(() => {
    if (visible && tasks.length > 0) animateCardsIn();
  }, [animateCardsIn, tasks, visible]);

  const replaceTasksForPreview = useCallback(async () => {
    if (!initialTasks?.length) return;
    await animateCardsOut();
    const shift = previewShift + 3;
    setPreviewShift(shift);
    setTasks([...initialTasks.slice(shift % initialTasks.length), ...initialTasks.slice(0, shift % initialTasks.length)].slice(0, 3));
  }, [animateCardsOut, initialTasks, previewShift]);

  const handleReplaceAll = useCallback(async () => {
    if (loading || replacing) return;
    hapticTap();
    setReplacing(true);
    setErrorText(null);
    try {
      if (previewOnly && initialTasks?.length) {
        await replaceTasksForPreview();
        return;
      }
      await animateCardsOut();
      const result = await rerollTodayDailyTaskSet(studyTarget);
      if (!result.ok) {
        const message = result.reason === 'limit_reached'
          ? 'Сегодня задания уже заменены.'
          : result.reason === 'task_already_completed'
            ? 'Ты уже начал одно из заданий. Сейчас лучше оставить их как есть.'
            : 'Не получилось заменить задания.';
        setErrorText(message);
        animateCardsIn();
        return;
      }
      const nextProgress = await loadTodayProgress(result.tasks, studyTarget);
      setTasks(result.tasks);
      setProgress(nextProgress);
    } finally {
      setReplacing(false);
    }
  }, [
    animateCardsIn,
    animateCardsOut,
    initialTasks,
    loading,
    previewOnly,
    replaceTasksForPreview,
    replacing,
    studyTarget,
  ]);

  const handleStart = useCallback(() => {
    hapticTap();
    onClose();
  }, [onClose]);

  const handleTaskPress = useCallback((task: DailyTask) => {
    if (loading || replacing) return;
    hapticTap();
    onClose();
    setTimeout(() => {
      void navigateDailyTask({ lang, router, studyTarget, task });
    }, 80);
  }, [lang, loading, onClose, replacing, router, studyTarget]);

  const panelOpacity = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const panelTranslateY = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  // Модалка «задания дня при первом входе» отключена: на входе её заменяет Компас
  // (брифинг дня). Превью в админке (previewOnly) сохраняем — оно нужно тестерам.
  if (!previewOnly) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel="Закрыть задания дня" />
        <Animated.View
          style={[
            styles.panelWrap,
            {
              paddingTop: Math.max(18, insets.top + 10),
              paddingBottom: Math.max(18, insets.bottom + 18),
              opacity: panelOpacity,
              transform: [{ translateY: panelTranslateY }],
            },
          ]}
        >
          <View style={[
            styles.panel,
            ds.shadow.medium,
            { borderColor: rewardModalPanelBorder(themeMode, theme, chrome.taskBorder) },
          ]}>
            <LinearGradient colors={panelColors} style={StyleSheet.absoluteFillObject} />
            <View pointerEvents="none" style={[styles.panelAccentGlow, { backgroundColor: chrome.accentSoft }]} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              onPress={onClose}
              activeOpacity={0.75}
              style={[styles.closeButton, { borderColor: chrome.taskBorder, backgroundColor: rewardModalSoftSurface(themeMode, theme) }]}
            >
              <Ionicons name="close" size={20} color={chrome.chipText} />
            </TouchableOpacity>

            <View style={[styles.chip, { backgroundColor: chrome.chipBg, borderColor: chrome.taskBorder }]}>
              <Ionicons name="calendar-outline" size={15} color={chrome.accent} />
              <Text style={[styles.chipText, { color: chrome.chipText, fontSize: f.caption }]}>Задания дня</Text>
            </View>

            <Text style={[styles.title, { color: theme.textPrimary, fontSize: f.h2 }]}>{title}</Text>

            <View style={styles.taskList}>
              {tasks.slice(0, 3).map((task, index) => {
                const anim = cardAnims[index] ?? cardAnims[0];
                const rowProgress = progress.find((p) => p.taskId === task.id);
                const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
                const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
                const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
                return (
                  <Animated.View
                    key={task.id}
                    style={[
                      styles.taskCard,
                      {
                        opacity,
                        transform: [{ translateY }, { scale }],
                        backgroundColor: rewardModalSoftSurface(themeMode, theme),
                        borderColor: chrome.taskBorder,
                      },
                    ]}
                  >
                    <View pointerEvents="none" style={[styles.taskGlow, { backgroundColor: chrome.taskGlow }]} />
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => handleTaskPress(task)}
                      activeOpacity={0.82}
                      disabled={loading || replacing}
                      style={styles.taskPressable}
                    >
                      <View style={[styles.iconShell, { borderColor: chrome.taskBorder, backgroundColor: chrome.accentSoft }]}>
                        <Image source={getTaskIcon(task)} contentFit="contain" style={styles.taskIcon} />
                      </View>
                      <View style={styles.taskTextBlock}>
                        <Text style={[styles.taskTitle, { color: theme.textPrimary, fontSize: f.body }]} numberOfLines={2}>
                          {taskTitle(task)}
                        </Text>
                        <Text style={[styles.taskMeta, { color: theme.textSecond, fontSize: f.caption }]}>
                          {taskProgressText(task, rowProgress)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
              {loading && (
                <Text style={[styles.loadingText, { color: theme.textSecond, fontSize: f.sub }]}>Открываю задания…</Text>
              )}
            </View>

            {errorText && <Text style={[styles.errorText, { color: chrome.chipText, fontSize: f.sub }]}>{errorText}</Text>}

            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleStart}
              activeOpacity={0.88}
              disabled={loading || tasks.length === 0}
              style={styles.primaryButtonWrap}
            >
              <LinearGradient colors={primaryColors} style={styles.primaryButton}>
                <Text style={[styles.primaryButtonText, { color: primaryTextColor, fontSize: f.bodyLg }]}>Начать</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleReplaceAll}
              activeOpacity={0.78}
              disabled={loading || replacing || tasks.length === 0}
              style={[styles.secondaryButton, { opacity: loading || replacing ? 0.58 : 1 }]}
            >
              <Ionicons name="shuffle-outline" size={18} color={chrome.accent} />
              <Text style={[styles.secondaryButtonText, { color: chrome.chipText, fontSize: f.sub }]}>
                {replacing ? 'Меняю задания…' : 'Заменить задания'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  panelWrap: {
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },
  panelAccentGlow: {
    position: 'absolute',
    left: -44,
    top: -52,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  chip: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
    paddingRight: 42,
  },
  chipText: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  title: {
    fontWeight: '900',
    lineHeight: 31,
    letterSpacing: -0.35,
    marginBottom: 18,
    paddingRight: 12,
  },
  taskList: {
    gap: 10,
    minHeight: 222,
  },
  taskCard: {
    minHeight: 70,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskPressable: {
    minHeight: 70,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  iconShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskIcon: {
    width: 38,
    height: 38,
  },
  taskTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontWeight: '800',
    lineHeight: 20,
  },
  taskMeta: {
    marginTop: 4,
    fontWeight: '800',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 18,
  },
  primaryButtonWrap: {
    minHeight: 54,
    borderRadius: 18,
    marginTop: 18,
    overflow: 'hidden',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  secondaryButtonText: {
    fontWeight: '800',
  },
});
