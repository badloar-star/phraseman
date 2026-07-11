import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { oskolokImageForPackShards } from '../../app/oskolok';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity/FlowText';

export type SurveyRewardPanelPhase = 'optimistic-reward' | 'reconciled' | 'retryable-error';

export interface SurveyRewardPanelProps {
  phase: SurveyRewardPanelPhase;
  reward: number;
  title: string;
  subtitle: string;
  error: string;
  onDone: () => void;
  onRetry: () => void;
}

const ACTION_LABELS = {
  ru: { done: 'Готово', retry: 'Повторить' },
  uk: { done: 'Готово', retry: 'Спробувати ще раз' },
  es: { done: 'Listo', retry: 'Intentar de nuevo' },
  'pt-BR': { done: 'Concluído', retry: 'Tentar novamente' },
  vi: { done: 'Xong', retry: 'Thử lại' },
  id: { done: 'Selesai', retry: 'Coba lagi' },
  tr: { done: 'Bitti', retry: 'Tekrar dene' },
  pl: { done: 'Gotowe', retry: 'Spróbuj ponownie' },
} as const;

export default function SurveyRewardPanel({
  phase,
  reward,
  title,
  subtitle,
  error,
  onDone,
  onRetry,
}: SurveyRewardPanelProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const isError = phase === 'retryable-error';
  const labels = ACTION_LABELS[lang as keyof typeof ACTION_LABELS] ?? ACTION_LABELS.ru;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [phase, progress, reduceMotion]);

  const motionStyle = reduceMotion
    ? styles.motionRest
    : {
        opacity: progress,
        transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
      };

  return (
    <View
      testID="survey-reward-panel"
      accessibilityLiveRegion="polite"
      style={[styles.panel, { backgroundColor: t.bgCard, borderColor: isError ? t.wrong : '#B98CFF' }]}
    >
      <Animated.View testID="survey-reward-motion" style={[styles.motion, motionStyle]}>
        <View style={[styles.iconHalo, { backgroundColor: isError ? t.wrongBg : '#493466' }]}>
          {isError ? (
            <Ionicons name="alert-circle" size={56} color={t.wrong} accessibilityElementsHidden />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={32} color="#B98CFF" accessibilityElementsHidden />
              <Image
                testID="survey-reward-shard-asset"
                source={oskolokImageForPackShards(Math.max(1, reward), themeMode)}
                style={styles.shardImage}
                contentFit="contain"
                accessibilityLabel={subtitle}
              />
            </>
          )}
        </View>

        <FlowText
          testID="survey-reward-title"
          provenance="authored"
          accessibilityRole="header"
          style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}
        >
          {title}
        </FlowText>
        <FlowText
          testID="survey-reward-subtitle"
          provenance="authored"
          style={[styles.subtitle, { color: t.textMuted, fontSize: f.body }]}
        >
          {subtitle}
        </FlowText>

        {isError ? (
          <>
            <FlowText
              testID="survey-reward-error"
              provenance="authored"
              accessibilityRole="alert"
              style={[styles.error, { color: t.wrong, backgroundColor: t.wrongBg, fontSize: f.body }]}
            >
              {error}
            </FlowText>
            <Pressable
              testID="survey-retry"
              accessibilityRole="button"
              accessibilityLabel={labels.retry}
              onPress={onRetry}
              android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
              style={({ pressed }) => [styles.action, styles.retry, { borderColor: t.wrong, opacity: pressed ? 0.78 : 1 }]}
            >
              <Ionicons name="refresh" size={20} color={t.textPrimary} accessibilityElementsHidden />
              <FlowText provenance="authored" style={[styles.actionLabel, { color: t.textPrimary, fontSize: f.body }]}>
                {labels.retry}
              </FlowText>
            </Pressable>
          </>
        ) : (
          <Pressable
            testID="survey-done"
            accessibilityRole="button"
            accessibilityLabel={labels.done}
            onPress={onDone}
            android_ripple={{ color: 'rgba(7,17,10,0.16)' }}
            style={({ pressed }) => [styles.action, { backgroundColor: t.accent, opacity: pressed ? 0.82 : 1 }]}
          >
            <FlowText provenance="authored" style={[styles.actionLabel, { color: t.correctText, fontSize: f.body }]}>
              {labels.done}
            </FlowText>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  motion: { alignItems: 'center', gap: 12 },
  motionRest: { opacity: 1, transform: [{ scale: 1 }] },
  iconHalo: {
    width: 108,
    minHeight: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shardImage: { width: 68, height: 68, marginTop: -12 },
  title: { fontWeight: '900', lineHeight: 28, textAlign: 'center' },
  subtitle: { fontWeight: '600', lineHeight: 24, textAlign: 'center' },
  error: {
    alignSelf: 'stretch',
    borderRadius: 14,
    padding: 14,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
  },
  retry: { borderWidth: 1.5 },
  actionLabel: { fontWeight: '900', textAlign: 'center' },
});
