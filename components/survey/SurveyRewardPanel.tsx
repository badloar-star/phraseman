import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { oskolokImageForPackShards } from '../../app/oskolok';
import { SHARD_REWARDS } from '../../app/shards_system';
import { LUM } from '../../constants/motionHybrid';
import { isLightThemeMode } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';
import PressableHybrid from '../PressableHybrid';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';
import { FlowText } from '../text-integrity/FlowText';
import { useSurveyRewardImpact } from './useSurveyRewardImpact';

export const SURVEY_PURPLE_TONE = {
  accentDark: '#B98CFF',
  accentLight: '#6D28D9',
  surfaceOverlay: 'rgba(139, 92, 246, 0.16)',
} as const;

export type SurveyRewardPanelPhase = 'optimistic-reward' | 'reconciled' | 'retryable-error';

export interface SurveyRewardPanelProps {
  phase: SurveyRewardPanelPhase;
  reward: number;
  title: string;
  subtitle: string;
  error: string;
  onDone: () => void;
  onRetry: () => void;
  retryDisabled?: boolean;
  onBack?: () => void;
}

const ACTION_LABELS = {
  ru: { done: 'Готово', retry: 'Повторить', back: 'Назад' },
  uk: { done: 'Готово', retry: 'Спробувати ще раз', back: 'Назад' },
  es: { done: 'Listo', retry: 'Intentar de nuevo', back: 'Atrás' },
  'pt-BR': { done: 'Concluído', retry: 'Tentar novamente', back: 'Voltar' },
  vi: { done: 'Xong', retry: 'Thử lại', back: 'Quay lại' },
  id: { done: 'Selesai', retry: 'Coba lagi', back: 'Kembali' },
  tr: { done: 'Bitti', retry: 'Tekrar dene', back: 'Geri' },
  pl: { done: 'Gotowe', retry: 'Spróbuj ponownie', back: 'Wstecz' },
} as const;

const REWARD_LABELS = {
  ru: `+${SHARD_REWARDS.survey_completed} жемчужина`,
  uk: `+${SHARD_REWARDS.survey_completed} перлина`,
  es: `+${SHARD_REWARDS.survey_completed} perla`,
  'pt-BR': `+${SHARD_REWARDS.survey_completed} pérola`,
  vi: `+${SHARD_REWARDS.survey_completed} ngọc trai`,
  id: `+${SHARD_REWARDS.survey_completed} mutiara`,
  tr: `+${SHARD_REWARDS.survey_completed} inci`,
  pl: `+${SHARD_REWARDS.survey_completed} perła`,
} as const;

export default function SurveyRewardPanel({
  phase,
  reward,
  title,
  subtitle,
  error,
  onDone,
  onRetry,
  retryDisabled = false,
  onBack,
}: SurveyRewardPanelProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const isError = phase === 'retryable-error';
  const showGrantedReward = phase === 'reconciled'
    && reward === SHARD_REWARDS.survey_completed;
  const labels = ACTION_LABELS[lang as keyof typeof ACTION_LABELS] ?? ACTION_LABELS.ru;
  const rewardLabel = REWARD_LABELS[lang as keyof typeof REWARD_LABELS] ?? REWARD_LABELS.ru;
  const purpleAccent = isLightThemeMode(themeMode)
    ? SURVEY_PURPLE_TONE.accentLight
    : SURVEY_PURPLE_TONE.accentDark;
  const heroMotionStyle = useSurveyRewardImpact(showGrantedReward);
  const supportingMotionStyle = useSupportingEntrance(reduceMotion);

  return (
    <TonalSurface
      testID="survey-reward-panel"
      accessibilityLiveRegion={isError ? undefined : 'polite'}
      radius={24}
      tone={isError ? 'subtle' : 'raised'}
      style={styles.panel}
    >
      {showGrantedReward ? (
        <Reanimated.View testID="survey-reward-motion" style={[styles.hero, heroMotionStyle]}>
          <View style={[styles.iconHalo, { backgroundColor: SURVEY_PURPLE_TONE.surfaceOverlay }]}>
            <Ionicons name="checkmark-circle" size={32} color={purpleAccent} accessibilityElementsHidden />
            <Image
              testID="survey-reward-shard-asset"
              source={oskolokImageForPackShards(SHARD_REWARDS.survey_completed, themeMode)}
              style={styles.shardImage}
              contentFit="contain"
              accessible={false}
              importantForAccessibility="no"
            />
          </View>
          <FlowText
            testID="survey-reward-amount"
            provenance="authored"
            accessibilityLabel={rewardLabel}
            style={[styles.rewardAmount, { color: t.textPrimary, fontSize: f.body }]}
          >
            {rewardLabel}
          </FlowText>
        </Reanimated.View>
      ) : null}

      <Reanimated.View testID="survey-reward-supporting-motion" style={supportingMotionStyle}>
        <View testID="survey-reward-supporting" style={styles.supporting}>
          {isError ? (
            <View style={[styles.iconHalo, { backgroundColor: t.wrongBg }]}>
              <Ionicons name="alert-circle" size={56} color={t.wrong} accessibilityElementsHidden />
            </View>
          ) : phase === 'reconciled' && !showGrantedReward ? (
            <View testID="survey-completion-check" style={[styles.iconHalo, { backgroundColor: SURVEY_PURPLE_TONE.surfaceOverlay }]}>
              <Ionicons name="checkmark-circle" size={56} color={purpleAccent} accessibilityElementsHidden />
            </View>
          ) : null}
          <FlowText testID="survey-reward-title" provenance="authored" accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {title}
          </FlowText>
          <FlowText testID="survey-reward-subtitle" provenance="authored" style={[styles.subtitle, { color: t.textMuted, fontSize: f.body }]}>
            {subtitle}
          </FlowText>

          {isError ? (
            <>
              <FlowText testID="survey-reward-error" provenance="authored" accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, { color: t.wrong, backgroundColor: t.wrongBg, fontSize: f.body }]}>
                {error}
              </FlowText>
              <PressableHybrid testID="survey-retry" accessibilityLabel={labels.retry} onPress={onRetry} withHaptic={false} disabled={retryDisabled} accessibilityState={{ disabled: retryDisabled }} variant="secondary" style={[styles.action, styles.retry, { borderColor: t.wrong, opacity: retryDisabled ? 0.45 : 1 }]} contentStyle={styles.actionContent}>
                <Ionicons name="refresh" size={20} color={t.textPrimary} accessibilityElementsHidden />
                <FlowText testID="survey-retry-label" provenance="authored" style={[styles.actionLabel, { color: t.textPrimary, fontSize: f.body }]}>{labels.retry}</FlowText>
              </PressableHybrid>
              {!!onBack && (
                <PressableHybrid testID="survey-back" accessibilityLabel={labels.back} onPress={onBack} withHaptic={false} variant="secondary" style={styles.action} contentStyle={styles.actionContent}>
                  <Ionicons name="arrow-back" size={20} color={t.textPrimary} accessibilityElementsHidden />
                  <FlowText testID="survey-back-label" provenance="authored" style={[styles.actionLabel, { color: t.textPrimary, fontSize: f.body }]}>{labels.back}</FlowText>
                </PressableHybrid>
              )}
            </>
          ) : (
            <PressableHybrid testID="survey-done" accessibilityLabel={labels.done} onPress={onDone} withHaptic={false} variant="primary" style={[styles.action, { backgroundColor: t.accent }]} contentStyle={styles.actionContent}>
              <FlowText testID="survey-done-label" provenance="authored" style={[styles.actionLabel, { color: t.correctText, fontSize: f.body }]}>{labels.done}</FlowText>
            </PressableHybrid>
          )}
        </View>
      </Reanimated.View>
    </TonalSurface>
  );
}

function useSupportingEntrance(reduceMotion: boolean) {
  const playedRef = useRef(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (playedRef.current) {
      opacity.value = 1;
      return () => cancelAnimation(opacity);
    }
    playedRef.current = true;
    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: reduceMotion ? LUM.heroFadeMs : LUM.contentMs,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

const styles = StyleSheet.create({
  panel: { alignSelf: 'stretch', borderRadius: 24, borderWidth: 0, padding: 24, gap: 12 },
  hero: { alignItems: 'center', gap: 8 },
  supporting: { alignItems: 'center', gap: 12 },
  iconHalo: { width: 108, minHeight: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center' },
  shardImage: { width: 68, height: 68, marginTop: -12 },
  rewardAmount: { fontWeight: '700', lineHeight: 24, textAlign: 'center' },
  title: { fontWeight: '900', lineHeight: 28, textAlign: 'center' },
  subtitle: { fontWeight: '600', lineHeight: 24, textAlign: 'center' },
  error: { alignSelf: 'stretch', borderRadius: 14, padding: 14, fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  action: { alignSelf: 'stretch', minHeight: 48, borderRadius: 14, overflow: 'hidden' },
  actionContent: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  retry: { borderWidth: 0 },
  actionLabel: { fontWeight: '900', textAlign: 'center' },
});
