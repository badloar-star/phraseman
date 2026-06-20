import React, { useEffect, useMemo, useRef, useState } from 'react';
import TapScale from '../components/TapScale';
import BouncyScrollView from '../components/BouncyScrollView';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { getPlanById, type PersonalPlanId, type PlanMinutesChoice } from './personal_plan_catalog';
import { activatePersonalPlan } from './personal_plan_state';
import { getPersonalPlanArt } from './personal_plan_art';
import { safeRouterBack } from './navigation_back';
import { usePremium } from '../components/PremiumContext';
import { canActivatePlan } from './compass/compass_access';
import {
  PERSONAL_PLAN_SETUP_GOALS,
  PERSONAL_PLAN_SETUP_LEVELS,
  recommendPersonalPlan,
  type PersonalPlanSetupChoice,
  type PersonalPlanSetupGoal,
  type PersonalPlanSetupLevel,
} from './personal_plan_recommendation';

type Step = 'goal' | 'level' | 'minutes' | 'result' | 'all';

const PLAN_IDS: PersonalPlanId[] = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'];
const TOTAL_STEPS = 4;

function stepIndex(step: Step): number {
  if (step === 'goal') return 1;
  if (step === 'level') return 2;
  if (step === 'minutes') return 3;
  return 4;
}

type PersonalPlanSetupMinuteChoice = {
  id: PlanMinutesChoice;
  title: string;
  subtitle: string;
  icon: PersonalPlanSetupChoice['icon'];
  emoji: string;
};

const PERSONAL_PLAN_SETUP_MINUTES: PersonalPlanSetupMinuteChoice[] = [
  {
    id: 5,
    title: '5 минут в день',
    subtitle: '2–4 задания. Лёгкий старт, без давления. Хорошо, если часто пропускаешь.',
    icon: 'flash-outline',
    emoji: '⚡',
  },
  {
    id: 10,
    title: '10 минут в день',
    subtitle: '3–5 заданий. Баланс между прогрессом и нагрузкой. Хороший выбор на старте.',
    icon: 'book-outline',
    emoji: '📖',
  },
  {
    id: 15,
    title: '15 минут в день',
    subtitle: '4–5 заданий. Плотная ежедневная тренировка с ощутимым прогрессом.',
    icon: 'mic-outline',
    emoji: '🎯',
  },
  {
    id: 20,
    title: '20 минут в день',
    subtitle: '5–6 заданий. Полный дневной блок для тех, кто хочет расти быстро.',
    icon: 'map-outline',
    emoji: '🚀',
  },
];

function planReason(planId: PersonalPlanId): string {
  switch (planId) {
    case 'voyazh': return 'Каждый день — живой диалог поездки: услышал, понял, ответил вслух.';
    case 'mitap': return 'Спокойный микс для себя: слова, слух и речь — понемногу каждый день.';
    case 'gavan': return 'Нужные слова на каждый день — и каждое сразу звучит вслух.';
    case 'impuls': return 'Понимаешь, но зависаешь перед ответом? Здесь тренируется речь вслух.';
    case 'echo': return 'Понимать живую речь с первого раза — и отвечать без долгой паузы.';
    default: return 'Подходит под выбранный старт и ближайшую цель.';
  }
}

function planTagline(planId: PersonalPlanId): string {
  switch (planId) {
    case 'voyazh': return '🗺️ Путешествия и дорога';
    case 'mitap': return '🧠 Язык для ума';
    case 'gavan': return '📦 Запас нужных слов';
    case 'impuls': return '💬 Живое общение';
    case 'echo': return '🎬 Кино и сериалы';
    default: return '📚 Общее развитие';
  }
}

// ─── Step progress bar ─────────────────────────────────────────────────────
function StepProgress({ current, total, accent, trackBg }: {
  current: number;
  total: number;
  accent: string;
  trackBg: string;
}) {
  const progress = useRef(new Animated.Value(current / total)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: current / total,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [current, total, progress]);

  return (
    <View style={[progressStyles.track, { backgroundColor: trackBg }]}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            backgroundColor: accent,
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Choice card ───────────────────────────────────────────────────────────
function ChoiceCard<T extends string | number>({
  item,
  selected,
  accent,
  onAccent,
  cardBg,
  softBg,
  border,
  borderHighlight,
  text,
  muted,
  onPress,
}: {
  item: { id: T; title: string; subtitle: string; icon: PersonalPlanSetupChoice['icon'] };
  selected: boolean;
  accent: string;
  onAccent: string;
  cardBg: string;
  softBg: string;
  border: string;
  borderHighlight: string;
  text: string;
  muted: string;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[
          styles.choice,
          { backgroundColor: selected ? accent + '14' : cardBg, borderColor: selected ? accent : border },
        ]}
      >
        <View style={[styles.choiceIcon, { backgroundColor: selected ? accent : softBg, borderColor: selected ? accent : borderHighlight }]}>
          <Ionicons name={item.icon} size={22} color={selected ? onAccent : accent} />
        </View>
        <View style={styles.choiceCopy}>
          <Text style={[styles.choiceTitle, { color: text }]}>{item.title}</Text>
          <Text style={[styles.choiceSub, { color: muted }]}>{item.subtitle}</Text>
        </View>
        {selected ? (
          <View style={[styles.checkDot, { backgroundColor: accent }]}>
            <Ionicons name="checkmark" size={14} color={onAccent} />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={muted} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Plan card (for "all plans" view) ─────────────────────────────────────
function PlanCard({
  planId,
  recommended,
  accent,
  softBg,
  cardBg,
  border,
  borderHighlight,
  text,
  muted,
  onPress,
}: {
  planId: PersonalPlanId;
  recommended: boolean;
  accent: string;
  softBg: string;
  cardBg: string;
  border: string;
  borderHighlight: string;
  text: string;
  muted: string;
  onPress: () => void;
}) {
  const plan = getPlanById(planId);
  const art = getPersonalPlanArt(planId);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.planCard, { backgroundColor: recommended ? accent + '10' : cardBg, borderColor: recommended ? accent : border }]}
    >
      <View style={[styles.planCardIcon, { backgroundColor: softBg, borderColor: borderHighlight }]}>
        <Ionicons name={art.heroIcon} size={24} color={accent} />
      </View>
      <View style={styles.planCardCopy}>
        <Text style={[styles.planCardName, { color: text }]}>{plan.name}</Text>
        <Text style={[styles.planCardTagline, { color: accent }]}>{planTagline(planId)}</Text>
        <Text style={[styles.planCardSub, { color: muted }]}>{plan.shortFocus}</Text>
        <Text style={[styles.planCardMeta, { color: muted }]}>{plan.horizonWeeks} нед · {plan.recommendedLevel}</Text>
      </View>
      {recommended ? (
        <View style={[styles.recommendedBadge, { backgroundColor: accent }]}>
          <Text style={[styles.recommendedText, { color: '#fff' }]}>✓</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={muted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function PersonalPlanSetupScreen() {
  const router = useRouter();
  const { hasPremiumAccess } = usePremium();
  const { theme: t } = useTheme();
  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<PersonalPlanSetupGoal>('words');
  const [level, setLevel] = useState<PersonalPlanSetupLevel>('a1');
  const [selectedMinutes, setSelectedMinutes] = useState<PlanMinutesChoice>(15);
  const [selectedPlanId, setSelectedPlanId] = useState<PersonalPlanId | null>(null);

  const slideFade = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  const recommendedPlanId = useMemo(() => recommendPersonalPlan({ goal, level }), [goal, level]);
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

  const animateStep = (fn: () => void) => {
    Animated.parallel([
      Animated.timing(slideFade, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideX, { toValue: -30, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      fn();
      slideX.setValue(30);
      Animated.parallel([
        Animated.timing(slideFade, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideX, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    });
  };

  const activate = async (planId: PersonalPlanId) => {
    hapticTap();
    // Премиум-гейт (чинит дыру): план — Premium-фича. Без доступа ведём на пейвол,
    // а не активируем план бесплатно. Раньше прямой вход с главной активировал
    // план без оплаты — гейт был только в онбординге.
    if (!canActivatePlan({ hasPremiumAccess })) {
      router.push({ pathname: '/premium_modal', params: { context: 'personal_plan' } } as any);
      return;
    }
    await activatePersonalPlan({
      planId,
      minutesPerDay: selectedMinutes,
      startDayIndex: 1,
    });
    router.replace('/personal_plan' as any);
  };

  const renderQuestion = (
    title: string,
    subtitle: string,
    body: React.ReactNode,
  ) => (
    <Animated.View style={{ opacity: slideFade, transform: [{ translateX: slideX }] }}>
      <Text style={[styles.stepKicker, { color: accent }]}>Шаг {stepIndex(step)} из {TOTAL_STEPS}</Text>
      <Text style={[styles.stepTitle, { color: text }]}>{title}</Text>
      <Text style={[styles.stepSubtitle, { color: muted }]}>{subtitle}</Text>
      <View style={styles.stack}>{body}</View>
    </Animated.View>
  );

  const content = (() => {
    if (step === 'goal') {
      return renderQuestion(
        'Зачем тебе английский?',
        'Это определяет ситуации и фразы, которые пригодятся первыми.',
        PERSONAL_PLAN_SETUP_GOALS.map((item) => (
          <ChoiceCard
            key={item.id}
            item={item}
            selected={goal === item.id}
            accent={accent}
            onAccent={onAccent}
            cardBg={cardBg}
            softBg={softBg}
            border={border}
            borderHighlight={t.borderHighlight}
            text={text}
            muted={muted}
            onPress={() => {
              hapticTap();
              animateStep(() => {
                setGoal(item.id);
                setStep('level');
              });
            }}
          />
        )),
      );
    }

    if (step === 'level') {
      return renderQuestion(
        'С чего удобнее начать?',
        'Не идеальный уровень, а тот, с которого комфортно стартовать сегодня.',
        PERSONAL_PLAN_SETUP_LEVELS.map((item) => (
          <ChoiceCard
            key={item.id}
            item={item}
            selected={level === item.id}
            accent={accent}
            onAccent={onAccent}
            cardBg={cardBg}
            softBg={softBg}
            border={border}
            borderHighlight={t.borderHighlight}
            text={text}
            muted={muted}
            onPress={() => {
              hapticTap();
              animateStep(() => {
                setLevel(item.id);
                setSelectedPlanId(null);
                setStep('minutes');
              });
            }}
          />
        )),
      );
    }

    if (step === 'minutes') {
      return renderQuestion(
        'Сколько времени в день?',
        'Это не меняет план — только сколько заданий открыть сразу.',
        PERSONAL_PLAN_SETUP_MINUTES.map((item) => (
          <ChoiceCard
            key={item.id}
            item={item}
            selected={selectedMinutes === item.id}
            accent={accent}
            onAccent={onAccent}
            cardBg={cardBg}
            softBg={softBg}
            border={border}
            borderHighlight={t.borderHighlight}
            text={text}
            muted={muted}
            onPress={() => {
              hapticTap();
              animateStep(() => {
                setSelectedMinutes(item.id);
                setStep('result');
              });
            }}
          />
        )),
      );
    }

    if (step === 'all') {
      return (
        <Animated.View style={{ opacity: slideFade, transform: [{ translateX: slideX }] }}>
          <Text style={[styles.stepKicker, { color: accent }]}>Все маршруты</Text>
          <Text style={[styles.stepTitle, { color: text }]}>Выбери свой план</Text>
          <Text style={[styles.stepSubtitle, { color: muted }]}>
            Рекомендуется {PLAN_IDS.indexOf(recommendedPlanId) + 1}-й вариант, но можно выбрать любой.
          </Text>
          <View style={styles.stack}>
            {PLAN_IDS.map((planId) => (
              <PlanCard
                key={planId}
                planId={planId}
                recommended={planId === recommendedPlanId}
                accent={accent}
                softBg={softBg}
                cardBg={cardBg}
                border={border}
                borderHighlight={t.borderHighlight}
                text={text}
                muted={muted}
                onPress={() => {
                  hapticTap();
                  setSelectedPlanId(planId);
                  setStep('minutes');
                }}
              />
            ))}
          </View>
        </Animated.View>
      );
    }

    // Result step
    return (
      <Animated.View style={{ opacity: slideFade, transform: [{ translateX: slideX }] }}>
        <Text style={[styles.stepKicker, { color: accent }]}>Для тебя подходит</Text>
        <Text style={[styles.stepTitle, { color: text }]}>Твой план</Text>

        <LinearGradient
          colors={t.cardGradient}
          style={[styles.resultCard, { borderColor: border }]}
        >
          <View style={[styles.resultIconWrap, { backgroundColor: accent + '18', borderColor: accent + '33' }]}>
            <Ionicons name={planArt.heroIcon} size={52} color={accent} />
          </View>
          <View style={[styles.resultTagPill, { backgroundColor: accent + '14', borderColor: accent + '33' }]}>
            <Text style={[styles.resultTagText, { color: accent }]}>{planTagline(visiblePlanId)}</Text>
          </View>
          <Text style={[styles.resultName, { color: text }]}>{visiblePlan.name}</Text>
          <Text style={[styles.resultReason, { color: muted }]}>{planReason(visiblePlanId)}</Text>

          <View style={styles.resultFacts}>
            <View style={[styles.resultFact, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.resultFactValue, { color: accent }]}>{visiblePlan.horizonWeeks}</Text>
              <Text style={[styles.resultFactLabel, { color: muted }]}>недель</Text>
            </View>
            <View style={[styles.resultFact, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.resultFactValue, { color: accent }]}>{visiblePlan.recommendedLevel}</Text>
              <Text style={[styles.resultFactLabel, { color: muted }]}>уровень</Text>
            </View>
            <View style={[styles.resultFact, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.resultFactValue, { color: accent }]}>{selectedMinutes}</Text>
              <Text style={[styles.resultFactLabel, { color: muted }]}>мин/день</Text>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity
          testID="personal-plan-setup-choose-plan"
          activeOpacity={0.88}
          onPress={() => void activate(visiblePlanId)}
          style={[styles.primaryBtn, { backgroundColor: accent }]}
        >
          <Text style={[styles.primaryBtnText, { color: onAccent }]}>Начать этот план</Text>
          <Ionicons name="arrow-forward" size={20} color={onAccent} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="personal-plan-setup-view-all"
          activeOpacity={0.82}
          onPress={() => {
            hapticTap();
            animateStep(() => setStep('all'));
          }}
          style={[styles.secondaryBtn, { borderColor: border, backgroundColor: cardBg }]}
        >
          <Text style={[styles.secondaryBtnText, { color: text }]}>Посмотреть все планы</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  })();

  const canGoBack = step !== 'goal';
  const handleBack = () => {
    hapticTap();
    animateStep(() => {
      if (step === 'level') setStep('goal');
      else if (step === 'minutes') setStep('level');
      else if (step === 'result') setStep('minutes');
      else if (step === 'all') setStep('result');
      else safeRouterBack(router, '/personal_plan');
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: screenBg }]}>
      <LinearGradient colors={t.bgGradient} style={styles.safe}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TapScale
            onPress={canGoBack ? handleBack : () => safeRouterBack(router, '/personal_plan')}
            style={[styles.topBarBtn, { backgroundColor: t.bgCard, borderColor: border }]}
          >
            <Ionicons name="chevron-back" size={22} color={accent} />
          </TapScale>

          <StepProgress
            current={stepIndex(step)}
            total={TOTAL_STEPS}
            accent={accent}
            trackBg={inactiveProgressBg}
          />

          <View style={[styles.topBarStepPill, { backgroundColor: t.accentBg, borderColor: border }]}>
            <Text style={[styles.topBarStepText, { color: accent }]}>{stepIndex(step)}/{TOTAL_STEPS}</Text>
          </View>
        </View>

        <BouncyScrollView decelerationRate="normal" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
          {content}
        </BouncyScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarBtn: {
    width: 44, height: 44, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  topBarStepPill: {
    height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  topBarStepText: { fontSize: 13, fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  stepKicker: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  stepTitle: { fontSize: 36, lineHeight: 42, fontWeight: '900' },
  stepSubtitle: { marginTop: 10, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 4 },
  stack: { marginTop: 22, gap: 10 },

  choice: {
    minHeight: 80, borderRadius: 18, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  choiceIcon: {
    width: 50, height: 50, borderRadius: 15, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
  choiceSub: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  checkDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  planCard: {
    minHeight: 100, borderRadius: 18, borderWidth: 1,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  planCardIcon: {
    width: 50, height: 50, borderRadius: 15, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  planCardCopy: { flex: 1, minWidth: 0 },
  planCardName: { fontSize: 17, lineHeight: 21, fontWeight: '900' },
  planCardTagline: { marginTop: 2, fontSize: 12, lineHeight: 15, fontWeight: '900' },
  planCardSub: { marginTop: 3, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  planCardMeta: { marginTop: 4, fontSize: 11, lineHeight: 14, fontWeight: '800' },
  recommendedBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  recommendedText: { fontSize: 14, fontWeight: '900' },

  resultCard: {
    marginTop: 20, borderRadius: 24, borderWidth: 1,
    padding: 22, alignItems: 'center', overflow: 'hidden',
  },
  resultIconWrap: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  resultTagPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginBottom: 12,
  },
  resultTagText: { fontSize: 13, fontWeight: '900' },
  resultName: { fontSize: 34, lineHeight: 40, fontWeight: '900', textAlign: 'center' },
  resultReason: { marginTop: 12, fontSize: 15, lineHeight: 23, fontWeight: '700', textAlign: 'center' },
  resultFacts: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  resultFact: {
    flex: 1, height: 72, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  resultFactValue: { fontSize: 20, lineHeight: 24, fontWeight: '900' },
  resultFactLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800' },

  primaryBtn: {
    minHeight: 60, marginTop: 20, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 10,
  },
  primaryBtnText: { fontSize: 18, fontWeight: '900' },
  secondaryBtn: {
    minHeight: 56, marginTop: 12, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '900' },
});
