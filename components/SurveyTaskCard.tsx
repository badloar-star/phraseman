import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getHomeSupportingArt } from '../app/home_supporting_art';
import { oskolokImageForPackShards } from '../app/oskolok';
import { SHARD_REWARDS } from '../app/shards_system';
import type { SurveyOfferSnapshot } from '../app/survey_offer_model';
import { triLang } from '../constants/i18n';
import { SURVEY_HYBRID } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useLang } from './LangContext';
import PressableHybrid from './PressableHybrid';
import { useTheme } from './ThemeContext';

export type SurveyTaskCardProps = {
  challenge: SurveyOfferSnapshot;
  onOpen: (challenge: SurveyOfferSnapshot) => void;
};

/**
 * Пульс плашки опроса (владелец, 2026-09-13: «дай плашке опроса анимацию пульса»).
 *
 * Мягкое дыхание масштаба 1 → 1.025 → 1, ~2.2 с на цикл, только пока опрос
 * активен. Вечный цикл ОБЯЗАН быть под гардом фокуса/AppState (Performance
 * Bible, tests/perf_freeze_contract): useRuntimeActive гасит пульс, когда
 * Главная ушла с экрана или приложение свернулось; Reduce Motion — статика.
 */
const PULSE_SCALE = 1.025;
const PULSE_HALF_MS = 1100;
const PULSE_STOP_MS = 200;

function useSurveyCardPulse(enabled: boolean) {
  const runtimeActive = useRuntimeActive(enabled);
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!runtimeActive || reduceMotion) {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: PULSE_STOP_MS });
      return undefined;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(PULSE_SCALE, { duration: PULSE_HALF_MS, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: PULSE_HALF_MS, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
  }, [reduceMotion, runtimeActive, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

export default function SurveyTaskCard({ challenge, onOpen }: SurveyTaskCardProps) {
  const { lang } = useLang();
  const { theme: t, themeMode } = useTheme();
  const completed = challenge.phase === 'completed';
  const active = challenge.phase === 'active' && challenge.survey !== null;
  const pulseStyle = useSurveyCardPulse(active);
  const rewardAmount = SHARD_REWARDS.survey_completed;
  const rewardLabel = triLang(lang, {
    ru: `+${rewardAmount} жемчужина`,
    uk: `+${rewardAmount} перлина`,
    en: `+${rewardAmount} pearl`,
    es: `+${rewardAmount} perla`,
    'pt-BR': `+${rewardAmount} pérola`,
    vi: `+${rewardAmount} ngọc trai`,
    id: `+${rewardAmount} mutiara`,
    tr: `+${rewardAmount} inci`,
    pl: `+${rewardAmount} perła`,
  });
  const completedLabel = triLang(lang, {
    ru: 'Опрос пройден',
    uk: 'Опитування пройдено',
    en: 'Survey completed',
    es: 'Encuesta completada',
    'pt-BR': 'Pesquisa concluída',
    vi: 'Đã hoàn thành khảo sát',
    id: 'Survei selesai',
    tr: 'Anket tamamlandı',
    pl: 'Ankieta ukończona',
  });

  const content = (
    <>
      <View
        testID="survey-offer-icon-well"
        style={[styles.iconCircle, { backgroundColor: t.bgSurface }]}
      >
        <Image
          testID="survey-offer-theme-art"
          source={getHomeSupportingArt(themeMode).survey}
          contentFit="contain"
          style={styles.surveyArt}
          accessible={false}
        />
      </View>
      <View style={styles.copy}>
        {/* зачем (владелец, 2026-09-13): заголовок опроса обрезался в «…», потому
            что не влезал. Теперь текст на 20% мельче (17 → 14) и переносится
            целиком, а плашка растёт по высоте под объём текста. */}
        <Text testID="survey-offer-title" style={[styles.title, { color: t.textOnCard }]}>
          {challenge.title}
        </Text>
      </View>
      {active ? (
        <View style={styles.reward}>
          <Image
            testID="survey-offer-reward-art"
            source={oskolokImageForPackShards(rewardAmount, themeMode)}
            contentFit="contain"
            style={styles.rewardArt}
            accessible={false}
          />
          <Text testID="survey-offer-reward-label" style={[styles.rewardLabel, { color: t.textPrimary }]}>
            {`+${rewardAmount}`}
          </Text>
        </View>
      ) : null}
      {completed ? (
        <Ionicons
          testID="survey-offer-claimed"
          name="checkmark-circle"
          size={24}
          color={t.accent}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
    </>
  );

  if (!active) {
    return (
      <View
        testID="survey-offer-card"
        accessible
        accessibilityState={{ disabled: true }}
        accessibilityLabel={completed ? `${challenge.title}. ${completedLabel}` : challenge.title}
        style={[styles.card, { backgroundColor: t.bgCard }]}
      >
        {content}
      </View>
    );
  }

  return (
    <Reanimated.View testID="survey-offer-pulse" style={pulseStyle}>
      <PressableHybrid
        testID="survey-offer-card"
        variant="card"
        pressScaleTo={1.02}
        onPress={() => onOpen(challenge)}
        accessibilityLabel={`${challenge.title}. ${rewardLabel}`}
        contentStyle={[styles.card, { backgroundColor: t.bgCard }]}
      >
        {content}
      </PressableHybrid>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 70, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: SURVEY_HYBRID.taskIconSize,
    height: SURVEY_HYBRID.taskIconSize,
    borderRadius: SURVEY_HYBRID.taskIconSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  surveyArt: {
    width: SURVEY_HYBRID.taskIconSize,
    height: SURVEY_HYBRID.taskIconSize,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  rewardArt: { width: SURVEY_HYBRID.taskRewardIconSize, height: SURVEY_HYBRID.taskRewardIconSize },
  rewardLabel: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
});
