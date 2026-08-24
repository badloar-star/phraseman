import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import BounceView from '../components/BounceView';
import { useTheme } from '../components/ThemeContext';
import { hapticSuccess } from '../hooks/use-haptics';
import { loadPlanDayComparison, planDayComparisonLine, type PlanDayComparison } from './personal_plan_day_comparison';
import { hasBundledCompatibilityPlanContentDay } from './plan_content_readiness';
import ReportErrorButton from '../components/ReportErrorButton';
import { triLang, type Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import { withPersonalPlanSunsetGuard } from './personal_plan_sunset_guard';

function firstParam(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? '' : v ?? '';
}

const NUMBER_LOCALE_BY_LANG: Record<Lang, string> = {
  ru: 'ru-RU', uk: 'uk-UA', es: 'es-ES', 'pt-BR': 'pt-BR', vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', pl: 'pl-PL',
};

function celebrationLines(lang: Lang): readonly string[] {
  return [
    triLang(lang, { ru: 'Отличная работа! Фразы оседают в памяти.', uk: 'Чудова робота! Фрази осідають у пам’яті.', es: '¡Buen trabajo! Las frases se están fijando en tu memoria.', 'pt-BR': 'Ótimo trabalho! As frases estão se fixando na sua memória.', vi: 'Làm tốt lắm! Các cụm từ đang khắc sâu vào trí nhớ.', id: 'Kerja bagus! Frasa-frasa tertanam di ingatan.', tr: 'Harika iş! Cümleler hafızana yerleşiyor.', pl: 'Świetna robota! Zwroty utrwalają się w pamięci.' }),
    triLang(lang, { ru: 'Ещё один день — ещё один шаг вперёд.', uk: 'Ще один день — ще один крок уперед.', es: 'Un día más, un paso más adelante.', 'pt-BR': 'Mais um dia, mais um passo à frente.', vi: 'Thêm một ngày — thêm một bước tiến.', id: 'Satu hari lagi — satu langkah lagi ke depan.', tr: 'Bir gün daha — bir adım daha ileri.', pl: 'Kolejny dzień — kolejny krok naprzód.' }),
    triLang(lang, { ru: 'Последовательность важнее интенсивности.', uk: 'Послідовність важливіша за інтенсивність.', es: 'La constancia importa más que la intensidad.', 'pt-BR': 'A constância importa mais que a intensidade.', vi: 'Sự đều đặn quan trọng hơn cường độ.', id: 'Konsistensi lebih penting daripada intensitas.', tr: 'Süreklilik yoğunluktan daha önemlidir.', pl: 'Regularność jest ważniejsza niż intensywność.' }),
    triLang(lang, { ru: 'Мозг теперь обрабатывает это в фоне.', uk: 'Мозок тепер обробляє це у фоновому режимі.', es: 'Tu cerebro ahora lo está procesando en segundo plano.', 'pt-BR': 'Seu cérebro agora está processando isso em segundo plano.', vi: 'Não bộ giờ đây đang xử lý nó ở chế độ nền.', id: 'Otak sekarang memprosesnya di latar belakang.', tr: 'Beynin şimdi bunu arka planda işliyor.', pl: 'Twój mózg teraz przetwarza to w tle.' }),
    triLang(lang, { ru: 'Дисциплина сегодня — беглость завтра.', uk: 'Дисципліна сьогодні — вільне володіння завтра.', es: 'Disciplina hoy, fluidez mañana.', 'pt-BR': 'Disciplina hoje, fluência amanhã.', vi: 'Kỷ luật hôm nay — trôi chảy ngày mai.', id: 'Disiplin hari ini — kelancaran esok hari.', tr: 'Bugünün disiplini, yarının akıcılığı.', pl: 'Dyscyplina dziś — płynność jutro.' }),
  ];
}

function PersonalPlanTaskDoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { lang } = useLang();
  const { theme: t, themeMode } = useTheme();
  const insets = useStableSafeAreaInsets();

  const taskTitle = firstParam(params.taskTitle);
  const dayProgress = Number(firstParam(params.dayProgress) || '0');
  const allDone = firstParam(params.allDone) === '1';
  const planId = firstParam(params.planId);
  const dayIndex = Number(firstParam(params.dayIndex) || '1');

  const CELEBRATION_LINES = celebrationLines(lang);
  const celebLine = CELEBRATION_LINES[dayIndex % CELEBRATION_LINES.length];
  const [comparison, setComparison] = useState<PlanDayComparison | null>(null);

  // After finishing the whole day, compare with other learners (reuses the deployed
  // leaderboard percentile pipeline — plan XP already feeds daily7xp).
  useEffect(() => {
    if (!allDone) return;
    let alive = true;
    void loadPlanDayComparison().then((c) => { if (alive) setComparison(c); });
    return () => { alive = false; };
  }, [allDone]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    hapticSuccess();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, tension: 80, friction: 8, delay: 150, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, delay: 100, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim, checkScale, slideAnim]);

  const isGold = themeMode === 'gold';
  const bg = isGold ? '#090704' : t.bgPrimary;
  const accent = t.accent;

  const goBack = () => {
    router.replace('/personal_plan' as any);
  };

  return (
    <View style={[styles.safe, { backgroundColor: bg, paddingTop: insets.top }]}>
      <LinearGradient colors={t.bgGradient} style={styles.fill}>
        <BounceView style={styles.fill}>
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.72}
            onPress={goBack}
            style={[styles.closeBtn, { backgroundColor: t.bgCard }]}
          >
            <Ionicons name="close" size={22} color={t.textMuted} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {hasBundledCompatibilityPlanContentDay(planId, dayIndex) ? (
            <ReportErrorButton
              variant="icon-flag"
              screen="personal_plan_task_done"
              dataId={`${planId}_day_${dayIndex}_done`}
              dataText={triLang(lang, {
                  ru: `День ${dayIndex} закрыт${taskTitle ? ` · ${taskTitle}` : ''}`,
                  uk: `День ${dayIndex} закрито${taskTitle ? ` · ${taskTitle}` : ''}`,
                  es: `Día ${dayIndex} completado${taskTitle ? ` · ${taskTitle}` : ''}`,
                  'pt-BR': `Dia ${dayIndex} concluído${taskTitle ? ` · ${taskTitle}` : ''}`,
                  vi: `Ngày ${dayIndex} đã hoàn thành${taskTitle ? ` · ${taskTitle}` : ''}`,
                  id: `Hari ${dayIndex} selesai${taskTitle ? ` · ${taskTitle}` : ''}`,
                  tr: `${dayIndex}. gün tamamlandı${taskTitle ? ` · ${taskTitle}` : ''}`,
                  pl: `Dzień ${dayIndex} zamknięty${taskTitle ? ` · ${taskTitle}` : ''}`,
              })}
              style={[styles.closeBtn, { backgroundColor: t.bgCard }]}
            />
          ) : null}
        </View>

        <Animated.View
          style={[
            styles.body,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.checkCircle,
              {
                backgroundColor: accent + '20',
                borderColor: accent,
                transform: [{ scale: checkScale }],
              },
            ]}
          >
            <Ionicons
              name={allDone ? 'trophy-outline' : 'checkmark-circle-outline'}
              size={64}
              color={allDone ? accent : '#4ECDC4'}
            />
          </Animated.View>

          <View style={[styles.labelPill, { backgroundColor: accent + '1F' }]}>
            <Text style={[styles.labelText, { color: accent }]}>
              {allDone
                  ? triLang(lang, { ru: 'День завершён!', uk: 'День завершено!', es: '¡Día completado!', 'pt-BR': 'Dia concluído!', vi: 'Đã hoàn thành ngày!', id: 'Hari selesai!', tr: 'Gün tamamlandı!', pl: 'Dzień ukończony!' })
                  : triLang(lang, { ru: 'Задание выполнено!', uk: 'Завдання виконано!', es: '¡Tarea completada!', 'pt-BR': 'Tarefa concluída!', vi: 'Đã hoàn thành nhiệm vụ!', id: 'Tugas selesai!', tr: 'Görev tamamlandı!', pl: 'Zadanie ukończone!' })}
            </Text>
          </View>

          <Text style={[styles.title, { color: t.textPrimary }]}>
            {allDone
                ? triLang(lang, { ru: `День ${dayIndex} закрыт`, uk: `День ${dayIndex} закрито`, es: `Día ${dayIndex} completado`, 'pt-BR': `Dia ${dayIndex} concluído`, vi: `Ngày ${dayIndex} đã hoàn thành`, id: `Hari ${dayIndex} selesai`, tr: `${dayIndex}. gün tamamlandı`, pl: `Dzień ${dayIndex} zamknięty` })
                : taskTitle || triLang(lang, { ru: 'Задание выполнено', uk: 'Завдання виконано', es: 'Tarea completada', 'pt-BR': 'Tarefa concluída', vi: 'Nhiệm vụ đã hoàn thành', id: 'Tugas selesai', tr: 'Görev tamamlandı', pl: 'Zadanie ukończone' })}
          </Text>

          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {allDone ? celebLine : triLang(lang, { ru: 'Так держать! Продолжай план.', uk: 'Так тримати! Продовжуй план.', es: '¡Sigue así! Continúa con el plan.', 'pt-BR': 'Continue assim! Siga com o plano.', vi: 'Cứ tiếp tục như vậy! Hãy tiếp tục kế hoạch.', id: 'Terus semangat! Lanjutkan rencananya.', tr: 'Böyle devam et! Plana devam et.', pl: 'Tak trzymaj! Kontynuuj plan.' })}
          </Text>

          {allDone && comparison ? (
            <View style={[styles.compareCard, { backgroundColor: accent + '1F' }]}>
              <Ionicons name="people-outline" size={20} color={accent} />
              <View style={styles.compareCopy}>
                <Text style={[styles.compareTitle, { color: t.textPrimary }]}>{planDayComparisonLine(comparison)}</Text>
                {comparison.totalUsers > 0 ? (
                  <Text style={[styles.compareSub, { color: t.textMuted }]}>
                    {triLang(lang, {
                        ru: `Среди ${comparison.totalUsers.toLocaleString(NUMBER_LOCALE_BY_LANG[lang])} учеников`,
                        uk: `Серед ${comparison.totalUsers.toLocaleString(NUMBER_LOCALE_BY_LANG[lang])} учнів`,
                        es: `Entre ${comparison.totalUsers.toLocaleString(NUMBER_LOCALE_BY_LANG[lang])} estudiantes`,
                        'pt-BR': `Entre ${comparison.totalUsers.toLocaleString(NUMBER_LOCALE_BY_LANG[lang])} alunos`,
                        vi: `Trong số ${comparison.totalUsers.toLocaleString(NUMBER_LOCALE_BY_LANG[lang])} học viên`,
                        id: `Di antara ${comparison.totalUsers.toLocaleString(NUMBER_LOCALE_BY_LANG[lang])} pelajar`,
                        tr: `${comparison.totalUsers.toLocaleString(NUMBER_LOCALE_BY_LANG[lang])} öğrenci arasında`,
                        pl: `Wśród ${comparison.totalUsers.toLocaleString(NUMBER_LOCALE_BY_LANG[lang])} uczniów`,
                    })}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {dayProgress > 0 ? (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: t.bgCard }]}>
                <Text style={[styles.statValue, { color: accent }]}>{dayProgress}%</Text>
                <Text style={[styles.statLabel, { color: t.textMuted }]}>{triLang(lang, { ru: 'день', uk: 'день', es: 'día', 'pt-BR': 'dia', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dzień' })}</Text>
              </View>
              {allDone ? (
                <View style={[styles.statBox, { backgroundColor: t.bgCard }]}>
                  <Text style={[styles.statValue, { color: '#4ECDC4' }]}>✓</Text>
                  <Text style={[styles.statLabel, { color: t.textMuted }]}>{triLang(lang, { ru: 'все задачи', uk: 'усі завдання', es: 'todas las tareas', 'pt-BR': 'todas as tarefas', vi: 'tất cả nhiệm vụ', id: 'semua tugas', tr: 'tüm görevler', pl: 'wszystkie zadania' })}</Text>
                </View>
              ) : null}
              <View style={[styles.statBox, { backgroundColor: t.bgCard }]}>
                <Text style={[styles.statValue, { color: t.textPrimary }]}>{dayIndex}</Text>
                <Text style={[styles.statLabel, { color: t.textMuted }]}>{triLang(lang, { ru: 'номер дня', uk: 'номер дня', es: 'número de día', 'pt-BR': 'número do dia', vi: 'số ngày', id: 'nomor hari', tr: 'gün numarası', pl: 'numer dnia' })}</Text>
              </View>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={goBack}
            style={styles.primaryWrap}
          >
            <LinearGradient
              colors={[accent + 'CC', accent]}
              style={styles.primaryButton}
            >
              <Text style={[styles.primaryText, { color: t.correctText }]}>
                {allDone
                    ? triLang(lang, { ru: 'Отлично, завтра продолжим', uk: 'Чудово, завтра продовжимо', es: 'Genial, seguimos mañana', 'pt-BR': 'Ótimo, continuamos amanhã', vi: 'Tuyệt vời, mai tiếp tục', id: 'Bagus, kita lanjutkan besok', tr: 'Harika, yarın devam ediyoruz', pl: 'Świetnie, jutro kontynuujemy' })
                    : triLang(lang, { ru: 'К плану дня', uk: 'До плану дня', es: 'Al plan del día', 'pt-BR': 'Para o plano do dia', vi: 'Đến kế hoạch trong ngày', id: 'Ke rencana harian', tr: 'Günlük plana git', pl: 'Do planu dnia' })}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={t.correctText} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        </BounceView>
      </LinearGradient>
    </View>
  );
}

export default withPersonalPlanSunsetGuard(PersonalPlanTaskDoneScreen);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 22,
  },
  checkCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  labelPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  compareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  compareCopy: { flex: 1, minWidth: 0 },
  compareTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  compareSub: { fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    height: 80,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  primaryWrap: { borderRadius: 14 },
  primaryButton: {
    height: 68,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
});
