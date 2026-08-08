import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import ProgressProofBlock from '../components/feedback/ProgressProofBlock';
import { buildProgressCompletionModel } from './completion/progress_completion_model';
import {
  getPlanById,
  type PersonalPlanDefinition,
} from './personal_plan_catalog';
import {
  buildPersonalPlanCompletionSummary,
  completePersonalPlan,
  readAnyPersonalPlanState,
  activatePersonalPlan,
  type PersonalPlanCompletionSummary,
} from './personal_plan_state';
import { readCompletedPlanTasks } from './personal_plan_progress';
import { recommendNextPlanAfter, getPlanDefaultMinutes } from './personal_plan_recommendation';
import { markNextNavigationAsReplace } from './navigation_back';
import { glassFill } from '../components/GlassSurface';

type CompleteView = {
  summary: PersonalPlanCompletionSummary;
  nextPlan: PersonalPlanDefinition;
};

/**
 * Финальный экран «маршрут пройден». Показывает итоги (дни, выполненные задания),
 * поздравляет и предлагает ОДИН логичный следующий план (recommendNextPlanAfter)
 * с кнопкой «Начать». Открывается, когда план дошёл до последнего выполненного дня
 * (isPersonalPlanFinished). Сам помечает текущий план completed, чтобы он перестал
 * висеть «активным» на главной, но остался в истории.
 */
export default function PersonalPlanCompleteScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const [view, setView] = useState<CompleteView | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await readAnyPersonalPlanState();
      if (!state) {
        if (!cancelled) {
          markNextNavigationAsReplace();
          router.replace('/(tabs)/home' as any);
        }
        return;
      }
      const plan = getPlanById(state.planId);
      const completedTasks = await readCompletedPlanTasks();
      const summary = buildPersonalPlanCompletionSummary(plan, state, completedTasks);
      const nextPlan = getPlanById(recommendNextPlanAfter(state.planId));
      // Фиксируем завершение один раз: план становится completed (с главной уходит).
      if (state.status === 'active') await completePersonalPlan().catch(() => {});
      if (!cancelled) setView({ summary, nextPlan });
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const startNextPlan = async () => {
    if (!view || starting) return;
    setStarting(true);
    try {
      await activatePersonalPlan({
        planId: view.nextPlan.id,
        minutesPerDay: getPlanDefaultMinutes(view.nextPlan.id),
      });
      // Свапаем экран завершения на новый план. Пометка replace убирает экран
      // завершения из честного стека — иначе «назад» из плана вернул бы на него,
      // а он (план уже не active) снова сделал бы replace на план → петля.
      markNextNavigationAsReplace();
      router.replace('/personal_plan' as any);
    } catch {
      setStarting(false);
    }
  };

  const goHome = () => {
    markNextNavigationAsReplace();
    router.replace('/(tabs)/home' as any);
  };

  if (!view) {
    return (
      <ScreenGradient>
        <View style={[styles.safe, { paddingTop: insets.top, justifyContent: 'center', paddingHorizontal: 24, gap: 16 }]}>
          <View style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <SkeletonBlock width={64} height={64} borderRadius={32} />
            <SkeletonBlock width="62%" height={20} borderRadius={10} />
            <SkeletonBlock width="44%" height={14} borderRadius={7} />
          </View>
          <SkeletonBlock width="100%" height={92} borderRadius={18} />
          <SkeletonBlock width="100%" height={54} borderRadius={16} />
        </View>
      </ScreenGradient>
    );
  }

  const { summary, nextPlan } = view;
  const accent = nextPlan.accent || t.accent;
  const completionModel = buildProgressCompletionModel({
    fact: triLang(lang, {
      ru: `Маршрут «${summary.planName}» пройден`, uk: `Маршрут «${summary.planName}» пройдено`, es: `Ruta «${summary.planName}» completada`, 'pt-BR': `Rota «${summary.planName}» concluída`, vi: `Đã hoàn thành «${summary.planName}»`, id: `Rute «${summary.planName}» selesai`, tr: `«${summary.planName}» rotası tamamlandı`, pl: `Trasa „${summary.planName}” ukończona`,
    }),
    accumulated: triLang(lang, { ru: `${summary.completedTasks} вызовов за ${summary.totalDays} дней`, uk: `${summary.completedTasks} викликів за ${summary.totalDays} днів`, es: `${summary.completedTasks} tareas en ${summary.totalDays} días`, 'pt-BR': `${summary.completedTasks} tarefas em ${summary.totalDays} dias`, vi: `${summary.completedTasks} nhiệm vụ trong ${summary.totalDays} ngày`, id: `${summary.completedTasks} tugas dalam ${summary.totalDays} hari`, tr: `${summary.totalDays} günde ${summary.completedTasks} görev`, pl: `${summary.completedTasks} zadań w ${summary.totalDays} dni` }),
    nextStep: nextPlan.goal,
    primaryAction: { id: 'next-plan', label: triLang(lang, { ru: 'Начать новый маршрут', uk: 'Почати новий маршрут', es: 'Empezar nueva ruta', 'pt-BR': 'Começar nova rota', vi: 'Bắt đầu lộ trình mới', id: 'Mulai rute baru', tr: 'Yeni rotaya başla', pl: 'Zacznij nową trasę' }) },
    confirmed: { routeComplete: true },
  });

  return (
    <ScreenGradient>
      {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
          BounceView даёт «резинку», но НЕ прокрутку — он рассчитан на экраны,
          где контент влезает целиком. На низком экране карточка поздравления с
          кнопками не влезала и обрезалась, а доскроллить было нечем. Скролл с
          flexGrow:1 сохраняет центрирование на больших экранах, bounces
          оставляет то же ощущение резинки. */}
      <ScrollView
        style={styles.safeScroll}
        contentContainerStyle={[styles.safeContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.safeContent}>
          <View style={[styles.card, { backgroundColor: glassFill(t.bgSurface, 0.46) }]}>
            <View style={[styles.iconWrap, { backgroundColor: t.correctBg, borderColor: t.border }]}>
              <Ionicons name="trophy" size={34} color={t.correctText} />
            </View>

            <Text style={[styles.kicker, { color: t.textGhost }]}>
              {triLang(lang, {
                ru: 'МАРШРУТ ПРОЙДЕН',
                uk: 'МАРШРУТ ПРОЙДЕНО',
                es: 'RUTA COMPLETADA',
                'pt-BR': 'ROTA CONCLUÍDA',
                vi: 'ĐÃ HOÀN THÀNH',
                id: 'RUTE SELESAI',
                tr: 'ROTA TAMAMLANDI',
                pl: 'TRASA UKOŃCZONA',
              })}
            </Text>
            <ProgressProofBlock model={completionModel} testID="personal-plan-progress-proof" />

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: glassFill(t.bgCard, 0.32) }]}>
                <Text style={[styles.statValue, { color: t.textPrimary }]}>{summary.totalDays}</Text>
                <Text style={[styles.statLabel, { color: t.textMuted }]}>
                  {triLang(lang, { ru: 'дней', uk: 'днів', es: 'días', 'pt-BR': 'dias', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dni' })}
                </Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: glassFill(t.bgCard, 0.32) }]}>
                <Text style={[styles.statValue, { color: t.textPrimary }]}>{summary.completedTasks}</Text>
                <Text style={[styles.statLabel, { color: t.textMuted }]}>
                  {triLang(lang, { ru: 'вызовов', uk: 'викликів', es: 'tareas', 'pt-BR': 'tarefas', vi: 'nhiệm vụ', id: 'tugas', tr: 'görev', pl: 'zadań' })}
                </Text>
              </View>
            </View>

            <View style={[styles.nextBox, { backgroundColor: glassFill(t.bgCard, 0.32) }]}>
              <Text style={[styles.nextKicker, { color: t.textGhost }]}>
                {triLang(lang, {
                  ru: 'ЧТО ДАЛЬШЕ',
                  uk: 'ЩО ДАЛІ',
                  es: 'QUÉ SIGUE',
                  'pt-BR': 'O QUE VEM A SEGUIR',
                  vi: 'TIẾP THEO',
                  id: 'SELANJUTNYA',
                  tr: 'SIRADA NE VAR',
                  pl: 'CO DALEJ',
                })}
              </Text>
              <View style={styles.nextHeaderRow}>
                <View style={[styles.nextDot, { backgroundColor: accent }]} />
                <Text style={[styles.nextName, { color: t.textPrimary }]}>{nextPlan.name}</Text>
              </View>
              <Text style={[styles.nextGoal, { color: t.textMuted }]}>{nextPlan.goal}</Text>
            </View>

            <TouchableOpacity
              testID="personal-plan-complete-start-next"
              style={[styles.primary, { backgroundColor: accent }]}
              activeOpacity={0.88}
              onPress={startNextPlan}
              disabled={starting}
            >
              {starting ? (
                <ActivityIndicator color={t.correctText} />
              ) : (
                <>
                  <Text style={[styles.primaryText, { color: t.correctText }]}>
                    {triLang(lang, {
                      ru: 'Начать новый маршрут',
                      uk: 'Почати новий маршрут',
                      es: 'Empezar nueva ruta',
                      'pt-BR': 'Começar nova rota',
                      vi: 'Bắt đầu lộ trình mới',
                      id: 'Mulai rute baru',
                      tr: 'Yeni rotaya başla',
                      pl: 'Zacznij nową trasę',
                    })}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={t.correctText} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="personal-plan-complete-later"
              style={styles.secondary}
              activeOpacity={0.72}
              onPress={goHome}
            >
              <Text style={[styles.secondaryText, { color: t.textGhost }]}>
                {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Depois', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  safeScroll: {
    flex: 1,
  },
  safeContent: {
    // flexGrow (а не flex) — в contentContainerStyle это единственный способ
    // сказать «растянись на всю высоту, если контента мало, но дай прокрутку,
    // если много». Центрирование сохранено для больших экранов.
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  card: {
    borderRadius: 14,
    padding: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  nextBox: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  nextKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  nextHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  nextDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nextName: {
    fontSize: 19,
    fontWeight: '900',
  },
  nextGoal: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  primary: {
    width: '100%',
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '900',
  },
  secondary: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
