import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
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

import {
  getTodayTasksSafe,
  loadTodayProgress,
  rerollTodayDailyTaskSet,
  type DailyTask,
  type TaskProgress,
} from '../app/daily_tasks';
import { getDailyTaskAchievementIcon } from '../app/daily_task_achievement_icons';
import { navigateDailyTask } from '../app/daily_task_navigation';
import { localizedDailyTaskStrings } from '../app/daily_tasks_es_locale';
import type { RuntimeStudyTarget } from '../app/target_storage_keys';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import type { ThemeMode } from '../constants/theme';
import { triLang, type Lang } from '../constants/i18n';
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
  business: {
    accent: '#0095F6',
    accentSoft: 'rgba(0,149,246,0.14)',
    chipBg: 'rgba(0,149,246,0.12)',
    chipText: '#E6E6E6',
    taskGlow: 'rgba(0,149,246,0.06)',
    taskBorder: 'rgba(255,255,255,0.12)',
  },
  businessLight: {
    accent: '#0095F6',
    accentSoft: 'rgba(0,149,246,0.12)',
    chipBg: 'rgba(0,149,246,0.12)',
    chipText: '#0095F6',
    taskGlow: 'rgba(0,149,246,0.06)',
    taskBorder: 'rgba(0,0,0,0.10)',
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
  {
    ru: 'Вот что можно сделать сегодня',
    uk: 'Ось що можна зробити сьогодні',
    es: 'Esto puedes hacer hoy',
    'pt-BR': 'Veja o que dá para fazer hoje',
    vi: 'Hôm nay bạn có thể làm thế này',
    id: 'Ini yang bisa kamu lakukan hari ini',
    tr: 'Bugün yapabileceklerin',
    pl: 'Co możesz zrobić dzisiaj',
  },
  {
    ru: 'Вот твой маленький план на сегодня',
    uk: 'Ось твій маленький план на сьогодні',
    es: 'Tu pequeño plan para hoy',
    'pt-BR': 'Seu pequeno plano para hoje',
    vi: 'Kế hoạch nhỏ của bạn cho hôm nay',
    id: 'Rencana kecilmu untuk hari ini',
    tr: 'Bugünkü küçük planın',
    pl: 'Twój mały plan na dziś',
  },
] as const;

const CARD_ANIMATION_MS = 230;

function getDailyTitle(lang: Lang): string {
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  return triLang(lang, TITLE_VARIANTS[dayNumber % TITLE_VARIANTS.length]);
}

function getTaskIcon(task: DailyTask) {
  return getDailyTaskAchievementIcon(task.type, task.id);
}

function taskTitle(task: DailyTask, lang: Lang): string {
  const titleEs = lang === 'es' ? task.titleES : undefined;
  const localized = localizedDailyTaskStrings(lang, task).title;
  return localized || titleEs || task.titleRU || task.titleUK || triLang(lang, {
    ru: 'Вызов дня',
    uk: 'Завдання дня',
    es: 'Tarea del día',
    'pt-BR': 'Tarefa do dia',
    vi: 'Nhiệm vụ trong ngày',
    id: 'Tugas hari ini',
    tr: 'Günün görevi',
    pl: 'Zadanie dnia',
  });
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
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
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

  const title = useMemo(() => getDailyTitle(lang), [lang, visible]);
  const copy = useMemo(() => ({
    closeA11y: triLang(lang, {
      ru: 'Закрыть вызовы дня',
      uk: 'Закрити завдання дня',
      es: 'Cerrar tareas del día',
      'pt-BR': 'Fechar tarefas do dia',
      vi: 'Đóng nhiệm vụ hôm nay',
      id: 'Tutup tugas hari ini',
      tr: 'Günün görevlerini kapat',
      pl: 'Zamknij zadania dnia',
    }),
    close: triLang(lang, {
      ru: 'Закрыть',
      uk: 'Закрити',
      es: 'Cerrar',
      'pt-BR': 'Fechar',
      vi: 'Đóng',
      id: 'Tutup',
      tr: 'Kapat',
      pl: 'Zamknij',
    }),
    chip: triLang(lang, {
      ru: 'Вызовы дня',
      uk: 'Виклики дня',
      es: 'Tareas del día',
      'pt-BR': 'Tarefas do dia',
      vi: 'Nhiệm vụ hôm nay',
      id: 'Tugas hari ini',
      tr: 'Günün görevleri',
      pl: 'Zadania dnia',
    }),
    loadError: triLang(lang, {
      ru: 'Не получилось открыть вызовы. Попробуй ещё раз.',
      uk: 'Не вдалося відкрити завдання. Спробуй ще раз.',
      es: 'No se pudieron abrir las tareas. Inténtalo de nuevo.',
      'pt-BR': 'Não foi possível abrir as tarefas. Tente de novo.',
      vi: 'Không mở được nhiệm vụ. Hãy thử lại.',
      id: 'Tugas tidak bisa dibuka. Coba lagi.',
      tr: 'Görevler açılamadı. Tekrar dene.',
      pl: 'Nie udało się otworzyć zadań. Spróbuj ponownie.',
    }),
    replaceLimit: triLang(lang, {
      ru: 'Сегодня вызовы уже заменены.',
      uk: 'Сьогодні завдання вже замінені.',
      es: 'Hoy las tareas ya fueron reemplazadas.',
      'pt-BR': 'As tarefas de hoje já foram trocadas.',
      vi: 'Hôm nay nhiệm vụ đã được đổi rồi.',
      id: 'Tugas hari ini sudah diganti.',
      tr: 'Bugünün görevleri zaten değiştirildi.',
      pl: 'Dzisiejsze zadania już wymieniono.',
    }),
    taskStarted: triLang(lang, {
      ru: 'Ты уже начал один из вызовов. Сейчас лучше оставить их как есть.',
      uk: 'Ти вже почав одне із завдань. Зараз краще залишити їх як є.',
      es: 'Ya empezaste una de las tareas. Ahora es mejor dejarlas como están.',
      'pt-BR': 'Você já começou uma das tarefas. Agora é melhor deixá-las como estão.',
      vi: 'Bạn đã bắt đầu một nhiệm vụ. Lúc này nên giữ nguyên.',
      id: 'Kamu sudah memulai salah satu tugas. Sebaiknya biarkan apa adanya.',
      tr: 'Görevlerden birine zaten başladın. Şimdilik oldukları gibi kalsınlar.',
      pl: 'Jedno z zadań już rozpoczęto. Teraz lepiej zostawić je bez zmian.',
    }),
    replaceError: triLang(lang, {
      ru: 'Не получилось заменить вызовы.',
      uk: 'Не вдалося замінити завдання.',
      es: 'No se pudieron reemplazar las tareas.',
      'pt-BR': 'Não foi possível trocar as tarefas.',
      vi: 'Không đổi được nhiệm vụ.',
      id: 'Tugas tidak bisa diganti.',
      tr: 'Görevler değiştirilemedi.',
      pl: 'Nie udało się wymienić zadań.',
    }),
    loading: triLang(lang, {
      ru: 'Открываю вызовы…',
      uk: 'Відкриваю завдання…',
      es: 'Abriendo tareas…',
      'pt-BR': 'Abrindo tarefas…',
      vi: 'Đang mở nhiệm vụ…',
      id: 'Membuka tugas…',
      tr: 'Görevler açılıyor…',
      pl: 'Otwieram zadania…',
    }),
    start: triLang(lang, {
      ru: 'Начать',
      uk: 'Почати',
      es: 'Empezar',
      'pt-BR': 'Começar',
      vi: 'Bắt đầu',
      id: 'Mulai',
      tr: 'Başla',
      pl: 'Zacznij',
    }),
    replacing: triLang(lang, {
      ru: 'Меняю вызовы…',
      uk: 'Міняю завдання…',
      es: 'Cambiando tareas…',
      'pt-BR': 'Trocando tarefas…',
      vi: 'Đang đổi nhiệm vụ…',
      id: 'Mengganti tugas…',
      tr: 'Görevler değiştiriliyor…',
      pl: 'Zmieniam zadania…',
    }),
    replace: triLang(lang, {
      ru: 'Заменить вызовы',
      uk: 'Замінити завдання',
      es: 'Reemplazar tareas',
      'pt-BR': 'Trocar tarefas',
      vi: 'Đổi nhiệm vụ',
      id: 'Ganti tugas',
      tr: 'Görevleri değiştir',
      pl: 'Wymień zadania',
    }),
  }), [lang]);
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
      setErrorText(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, initialTasks, studyTarget]);

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
          ? copy.replaceLimit
          : result.reason === 'task_already_completed'
            ? copy.taskStarted
            : copy.replaceError;
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
    copy.replaceError,
    copy.replaceLimit,
    copy.taskStarted,
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
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel={copy.closeA11y} />
        <Animated.View
          style={[
            styles.panelWrap,
            {
              paddingTop: Math.max(18, insets.top + 10),
              paddingBottom: Math.max(18, bottomInset + 18),
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
              accessibilityLabel={copy.close}
              onPress={onClose}
              activeOpacity={0.75}
              style={[styles.closeButton, { borderColor: chrome.taskBorder, backgroundColor: rewardModalSoftSurface(themeMode, theme) }]}
            >
              <Ionicons name="close" size={20} color={chrome.chipText} />
            </TouchableOpacity>

            <View style={[styles.chip, { backgroundColor: chrome.chipBg, borderColor: chrome.taskBorder }]}>
              <Ionicons name="calendar-outline" size={15} color={chrome.accent} />
              <Text style={[styles.chipText, { color: chrome.chipText, fontSize: f.caption }]}>{copy.chip}</Text>
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
                        <Text style={[styles.taskTitle, { color: theme.textPrimary, fontSize: f.body }]}>
                          {taskTitle(task, lang)}
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
                <Text style={[styles.loadingText, { color: theme.textSecond, fontSize: f.sub }]}>{copy.loading}</Text>
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
                <Text style={[styles.primaryButtonText, { color: primaryTextColor, fontSize: f.bodyLg }]}>{copy.start}</Text>
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
                {replacing ? copy.replacing : copy.replace}
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
    borderWidth: 0,
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
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  chip: {
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 0,
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
    borderWidth: 0,
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
    borderWidth: 0,
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
