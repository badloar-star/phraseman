import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { getPlanById, type PersonalPlanId, type PlanMinutesChoice } from './personal_plan_catalog';
import { activatePersonalPlan } from './personal_plan_state';
import { getPersonalPlanArt } from './personal_plan_art';
import {
  PERSONAL_PLAN_SETUP_FOCUS,
  PERSONAL_PLAN_SETUP_GOALS,
  PERSONAL_PLAN_SETUP_LEVELS,
  recommendPersonalPlan,
  type PersonalPlanSetupChoice,
  type PersonalPlanSetupFocus,
  type PersonalPlanSetupGoal,
  type PersonalPlanSetupLevel,
} from './personal_plan_recommendation';

type Step = 'goal' | 'level' | 'focus' | 'minutes' | 'result' | 'all';

const PLAN_IDS: PersonalPlanId[] = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'];

function stepIndex(step: Step): number {
  if (step === 'goal') return 1;
  if (step === 'level') return 2;
  if (step === 'focus') return 3;
  if (step === 'minutes') return 4;
  return 5;
}

type PersonalPlanSetupMinuteChoice = {
  id: PlanMinutesChoice;
  title: string;
  subtitle: string;
  icon: PersonalPlanSetupChoice['icon'];
};

const PERSONAL_PLAN_SETUP_MINUTES: PersonalPlanSetupMinuteChoice[] = [
  { id: 5, title: '5 минут в день', subtitle: 'Стартует с 2-4 заданий. Остальное можно добавить после выполнения.', icon: 'flash-outline' },
  { id: 10, title: '10 минут в день', subtitle: 'Стартует с 3-5 заданий и сохраняет запас на кнопку еще.', icon: 'book-outline' },
  { id: 15, title: '15 минут в день', subtitle: 'Стартует с 4-5 заданий для плотной ежедневной тренировки.', icon: 'mic-outline' },
  { id: 20, title: '20 минут в день', subtitle: 'Стартует с 5-6 заданий и дает самый полный дневной блок.', icon: 'map-outline' },
];

function planReason(planId: PersonalPlanId): string {
  switch (planId) {
    case 'voyazh':
      return 'Подходит, если ближайшая цель - поездки, кафе, отель и быстрые вопросы на месте.';
    case 'mitap':
      return 'Подходит, если важны рабочие созвоны, переписка и короткие объяснения без паники.';
    case 'gavan':
      return 'Подходит, если нужно увереннее решать бытовые вопросы после переезда.';
    case 'impuls':
      return 'Подходит, если ты понимаешь мысль, но хочешь быстрее отвечать вслух.';
    case 'echo':
      return 'Подходит, если хочется спокойнее слышать диалоги, переспрашивать и поддерживать разговор.';
    default:
      return 'Подходит под выбранный старт и ближайшую цель.';
  }
}

export default function PersonalPlanSetupScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<PersonalPlanSetupGoal>('move');
  const [level, setLevel] = useState<PersonalPlanSetupLevel>('a1');
  const [focus, setFocus] = useState<PersonalPlanSetupFocus>('guided');
  const [selectedMinutes, setSelectedMinutes] = useState<PlanMinutesChoice>(15);
  const [selectedPlanId, setSelectedPlanId] = useState<PersonalPlanId | null>(null);

  const recommendedPlanId = useMemo(() => recommendPersonalPlan({ goal, level, focus }), [focus, goal, level]);
  const visiblePlanId = selectedPlanId ?? recommendedPlanId;
  const visiblePlan = getPlanById(visiblePlanId);
  const planArt = getPersonalPlanArt(visiblePlanId);
  const accent = t.accent;
  const onAccent = t.correctText;
  const screenBg = t.bgPrimary;
  const cardBg = t.bgCard;
  const softBg = t.accentBg;
  const inactiveProgressBg = t.bgSurface;
  const border = t.border;
  const text = t.textPrimary;
  const muted = t.textMuted;

  const activate = async (planId: PersonalPlanId) => {
    hapticTap();
    await activatePersonalPlan({
      planId,
      minutesPerDay: selectedMinutes,
      startDayIndex: 1,
    });
    router.replace('/personal_plan' as any);
  };

  const renderProgress = () => (
    <View style={styles.progressRow}>
      {[1, 2, 3, 4, 5].map((index) => (
        <View
          key={index}
          style={[
            styles.progressPill,
            { backgroundColor: index <= stepIndex(step) ? accent : inactiveProgressBg },
          ]}
        />
      ))}
    </View>
  );

  const renderChoice = <T extends string | number>(
    item: {
      id: T;
      title: string;
      subtitle: string;
      icon: PersonalPlanSetupChoice['icon'];
    },
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.84}
      onPress={() => {
        hapticTap();
        onPress();
      }}
      style={[styles.choice, { backgroundColor: cardBg, borderColor: selected ? accent : border }]}
    >
      <View style={[styles.choiceIcon, { backgroundColor: selected ? accent : softBg, borderColor: selected ? accent : t.borderHighlight }]}>
        <Ionicons name={item.icon} size={24} color={selected ? onAccent : accent} />
      </View>
      <View style={styles.choiceCopy}>
        <Text style={[styles.choiceTitle, { color: text }]}>{item.title}</Text>
        <Text style={[styles.choiceSub, { color: muted }]}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={selected ? accent : muted} />
    </TouchableOpacity>
  );

  const renderQuestion = (
    title: string,
    subtitle: string,
    body: React.ReactNode,
  ) => (
    <View style={styles.body}>
      {renderProgress()}
      <Text style={[styles.kicker, { color: accent }]}>Выбор плана</Text>
      <Text style={[styles.title, { color: text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text>
      <View style={styles.stack}>{body}</View>
    </View>
  );

  const renderPlanCard = (planId: PersonalPlanId, recommended = false) => {
    const plan = getPlanById(planId);
    const art = getPersonalPlanArt(planId);
    return (
      <TouchableOpacity
        key={planId}
        activeOpacity={0.86}
        onPress={() => {
          hapticTap();
          setSelectedPlanId(planId);
          setStep('minutes');
        }}
        style={[styles.planCard, { backgroundColor: cardBg, borderColor: recommended ? accent : border }]}
      >
        <View style={[styles.choiceIcon, { backgroundColor: softBg, borderColor: t.borderHighlight }]}>
          <Ionicons name={art.heroIcon} size={25} color={accent} />
        </View>
        <View style={styles.choiceCopy}>
          <Text style={[styles.choiceTitle, { color: text }]}>{plan.name}</Text>
          <Text style={[styles.choiceSub, { color: muted }]}>{plan.shortFocus}</Text>
          <Text style={[styles.planMeta, { color: accent }]}>
            {plan.horizonWeeks} недель · старт {plan.recommendedLevel}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const content = (() => {
    if (step === 'goal') {
      return renderQuestion(
        'Зачем тебе английский?',
        'План подстроится под ситуации и фразы, которые пригодятся первыми.',
        PERSONAL_PLAN_SETUP_GOALS.map((item) => renderChoice(item, goal === item.id, () => {
          setGoal(item.id);
          setStep('level');
        })),
      );
    }
    if (step === 'level') {
      return renderQuestion(
        'Какой старт ближе?',
        'Выбери не идеальный уровень, а тот, с которого комфортно начать сегодня.',
        PERSONAL_PLAN_SETUP_LEVELS.map((item) => renderChoice(item, level === item.id, () => {
          setLevel(item.id);
          setStep('focus');
        })),
      );
    }
    if (step === 'focus') {
      return renderQuestion(
        'Что важнее в ближайшие недели?',
        'Без выбора времени и лишнего упражнения: сразу подберем маршрут.',
        PERSONAL_PLAN_SETUP_FOCUS.map((item) => renderChoice(item, focus === item.id, () => {
          setFocus(item.id);
          setSelectedPlanId(null);
          setStep('minutes');
        })),
      );
    }
    if (step === 'minutes') {
      return renderQuestion(
        'Сколько времени в день?',
        'Это не меняет сам план: каждый день создается полный набор заданий. Время выбирает, сколько открыть сразу.',
        PERSONAL_PLAN_SETUP_MINUTES.map((item) => renderChoice(item, selectedMinutes === item.id, () => {
          setSelectedMinutes(item.id);
          setStep('result');
        })),
      );
    }
    if (step === 'all') {
      return renderQuestion(
        'Все планы',
        'Можно оставить рекомендацию или выбрать другой сценарий под ближайшую цель.',
        PLAN_IDS.map((planId) => renderPlanCard(planId, planId === recommendedPlanId)),
      );
    }
    return (
      <View style={styles.body}>
        {renderProgress()}
        <Text style={[styles.kicker, { color: accent }]}>Подходит тебе</Text>
        <LinearGradient
          colors={t.cardGradient}
          style={[styles.resultCard, { borderColor: border, backgroundColor: cardBg }]}
        >
          <Ionicons name={planArt.heroIcon} size={72} color={accent} style={styles.resultIcon} />
          <Text style={[styles.resultName, { color: text }]}>{visiblePlan.name}</Text>
          <Text style={[styles.resultReason, { color: muted }]}>{planReason(visiblePlanId)}</Text>
          <View style={styles.resultFacts}>
            <Text style={[styles.resultFact, { color: accent }]}>{visiblePlan.horizonWeeks} недель</Text>
            <Text style={[styles.resultFact, { color: accent }]}>{visiblePlan.recommendedLevel}</Text>
            <Text style={[styles.resultFact, { color: accent }]}>{selectedMinutes} мин/день</Text>
          </View>
        </LinearGradient>
        <TouchableOpacity
          testID="personal-plan-setup-choose-plan"
          activeOpacity={0.88}
          onPress={() => activate(visiblePlanId)}
          style={[styles.primary, { backgroundColor: accent }]}
        >
          <Text style={[styles.primaryText, { color: onAccent }]}>Выбрать этот план</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="personal-plan-setup-view-all"
          activeOpacity={0.82}
          onPress={() => {
            hapticTap();
            setStep('all');
          }}
          style={[styles.secondary, { borderColor: border, backgroundColor: cardBg }]}
        >
          <Text style={[styles.secondaryText, { color: text }]}>Посмотреть все планы</Text>
        </TouchableOpacity>
      </View>
    );
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={t.bgGradient} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={accent} />
            </TouchableOpacity>
            <Text style={[styles.brand, { color: accent }]}>PHRASEMAN</Text>
            <View style={styles.backButton} />
          </View>
          {content}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  topBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 13, fontWeight: '900', letterSpacing: 0 },
  body: { paddingTop: 8 },
  progressRow: { flexDirection: 'row', gap: 10, marginBottom: 26, paddingHorizontal: 44 },
  progressPill: { flex: 1, height: 7, borderRadius: 4 },
  kicker: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 8 },
  title: { fontSize: 34, lineHeight: 39, fontWeight: '900' },
  subtitle: { marginTop: 10, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  stack: { marginTop: 26, gap: 12 },
  choice: {
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  choiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { fontSize: 17, lineHeight: 21, fontWeight: '900' },
  choiceSub: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  planCard: {
    minHeight: 106,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  planMeta: { marginTop: 6, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  resultCard: { marginTop: 20, borderRadius: 18, borderWidth: 1, padding: 22, overflow: 'hidden' },
  resultIcon: { marginBottom: 14 },
  resultName: { fontSize: 36, lineHeight: 40, fontWeight: '900' },
  resultReason: { marginTop: 12, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  resultFacts: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultFact: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', fontSize: 12, fontWeight: '900' },
  primary: { minHeight: 58, marginTop: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 17, fontWeight: '900' },
  secondary: { minHeight: 56, marginTop: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '900' },
});
