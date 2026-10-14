import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { SurveyFollowUp } from '../../app/survey_followups';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { LUM } from '../../constants/motionHybrid';
import { isLightThemeMode } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';
import PressableHybrid from '../PressableHybrid';
import { useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity/FlowText';

export const SURVEY_PURPLE_TONE = {
  accentDark: '#B98CFF', // theme-exempt: палитра панели награды опроса — пары светлая/тёмная заданы по режиму темы
  accentLight: '#6D28D9', // theme-exempt: палитра панели награды опроса — пары светлая/тёмная заданы по режиму темы
  /** Текст на залитой акцентом плашке «+1»: тёмный на лаванде, белый на фиолетовом. */
  onAccentDark: '#17162B', // theme-exempt: палитра панели награды опроса — пары светлая/тёмная заданы по режиму темы
  onAccentLight: '#FFFFFF', // theme-exempt: палитра панели награды опроса — пары светлая/тёмная заданы по режиму темы
  surfaceOverlay: 'rgba(139, 92, 246, 0.16)', // theme-exempt: палитра панели награды опроса — пары светлая/тёмная заданы по режиму темы
} as const;

export type SurveyRewardPanelPhase = 'optimistic-reward' | 'reconciled' | 'retryable-error';

export interface SurveyRewardPanelProps {
  phase: SurveyRewardPanelPhase;
  title: string;
  subtitle: string;
  error: string;
  onDone: () => void;
  onRetry: () => void;
  retryDisabled?: boolean;
  onBack?: () => void;
  /**
   * зачем (владелец, 2026-09-22): действия выбранных вариантов («открыть видео»,
   * «посмотреть темы», «оценить в сторе») живут ТОЛЬКО здесь — после отправки.
   * Во время опроса их нет, чтобы человек не улетал с полпути в другой экран.
   */
  followUps?: readonly SurveyFollowUp[];
  onFollowUp?: (followUp: SurveyFollowUp) => void;
}

const ACTION_LABELS = {
  ru: { done: 'Готово', retry: 'Повторить', back: 'Назад' },
  uk: { done: 'Готово', retry: 'Спробувати ще раз', back: 'Назад' },
  es: { done: 'Listo', retry: 'Intentar de nuevo', back: 'Atrás' }, en: { done: 'Done', retry: 'Try again', back: 'Back' },
  'pt-BR': { done: 'Concluído', retry: 'Tentar novamente', back: 'Voltar' },
  vi: { done: 'Xong', retry: 'Thử lại', back: 'Quay lại' },
  id: { done: 'Selesai', retry: 'Coba lagi', back: 'Kembali' },
  tr: { done: 'Bitti', retry: 'Tekrar dene', back: 'Geri' },
  pl: { done: 'Gotowe', retry: 'Spróbuj ponownie', back: 'Wstecz' },
} as const;

// зачем (решение владельца 2026-09-30): жемчуг удалён из приложения полностью —
// строка «+N жемчужина уже на счету», ассет жемчужины и её «удар» на панели убраны.
// Финал опроса = фиолетовая галочка «принято» + заголовок + кнопки.

export default function SurveyRewardPanel({
  phase,
  title,
  subtitle,
  error,
  onDone,
  onRetry,
  retryDisabled = false,
  onBack,
  followUps,
  onFollowUp,
}: SurveyRewardPanelProps) {
  // зачем: владелец 2026-09-29 — Liquid Glass «1 в 1 с макета» (overlays-specialist.html
  // OS-SURVEY-SUCCESS/-ALREADY-COMPLETED/-RETRYABLE-ERROR): кнопки и плитки — нейтральные токены
  // активной темы (13 тем), без зелёного/акцентного; семантика награды (фиолетовая галочка) и ошибки
  // (t.wrong) остаются как были.
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const isError = phase === 'retryable-error';
  const labels = ACTION_LABELS[lang as keyof typeof ACTION_LABELS] ?? ACTION_LABELS.ru;
  const purpleAccent = isLightThemeMode(themeMode)
    ? SURVEY_PURPLE_TONE.accentLight
    : SURVEY_PURPLE_TONE.accentDark;
  const supportingMotionStyle = useSupportingEntrance(reduceMotion);

  return (
    <View
      testID="survey-reward-panel"
      accessibilityLiveRegion={isError ? undefined : 'polite'}
      style={styles.panel}
    >
      <Reanimated.View testID="survey-reward-supporting-motion" style={supportingMotionStyle}>
        <View testID="survey-reward-supporting" style={styles.supporting}>
          {isError ? (
            <View style={[styles.iconHalo, { backgroundColor: t.wrongBg }]}>
              <Ionicons name="alert-circle" size={56} color={t.wrong} accessibilityElementsHidden />
            </View>
          ) : (phase === 'optimistic-reward' || phase === 'reconciled') ? (
            <View testID={phase === 'optimistic-reward' ? 'survey-pending-accepted' : 'survey-completion-check'} style={[styles.iconHalo, { backgroundColor: SURVEY_PURPLE_TONE.surfaceOverlay }]}>
              <Ionicons name="checkmark-circle" size={56} color={purpleAccent} accessibilityElementsHidden />
            </View>
          ) : null}
          <FlowText testID="survey-reward-title" provenance="authored" accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>
            {title}
          </FlowText>
          <FlowText testID="survey-reward-subtitle" provenance="authored" style={[styles.subtitle, { color: glass.secondary, fontSize: f.body }]}>
            {subtitle}
          </FlowText>

          {isError ? (
            <>
              <FlowText testID="survey-reward-error" provenance="authored" accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, { color: t.wrong, backgroundColor: t.wrongBg, fontSize: f.body }]}>
                {error}
              </FlowText>
              <PressableHybrid testID="survey-retry" accessibilityLabel={labels.retry} onPress={onRetry} withHaptic={false} disabled={retryDisabled} accessibilityState={{ disabled: retryDisabled }} variant="secondary" style={[styles.action, { backgroundColor: glass.accent, opacity: retryDisabled ? 0.45 : 1 }]} contentStyle={styles.actionContent}>
                <Ionicons name="refresh" size={20} color={glass.ctaInk} accessibilityElementsHidden />
                <FlowText testID="survey-retry-label" provenance="authored" style={[styles.actionLabel, { color: glass.accentInk, fontSize: f.body }]}>{labels.retry}</FlowText>
              </PressableHybrid>
              {!!onBack && (
                <PressableHybrid testID="survey-back" accessibilityLabel={labels.back} onPress={onBack} withHaptic={false} variant="secondary" style={[styles.action, { backgroundColor: glass.buttonFill }]} contentStyle={styles.actionContent}>
                  <Ionicons name="arrow-back" size={20} color={glass.text} accessibilityElementsHidden />
                  <FlowText testID="survey-back-label" provenance="authored" style={[styles.actionLabel, { color: glass.text, fontSize: f.body }]}>{labels.back}</FlowText>
                </PressableHybrid>
              )}
            </>
          ) : (
            <>
              {/* зачем (владелец, 2026-09-22): обещанные переходы идут ПЕРЕД
                  «Готово» — сначала то, ради чего человек выбрал вариант,
                  потом выход. Тоном, без обводок: действие читается акцентом,
                  «Готово» остаётся единственной залитой кнопкой. */}
              {followUps?.map((followUp) => (
                <PressableHybrid
                  key={followUp.key}
                  testID={`survey-followup-${followUp.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={followUp.cta}
                  onPress={() => onFollowUp?.(followUp)}
                  withHaptic={false}
                  variant="secondary"
                  style={[styles.action, { backgroundColor: glass.buttonFill }]}
                  contentStyle={styles.actionContent}
                >
                  <FlowText
                    testID={`survey-followup-${followUp.key}-label`}
                    provenance="authored"
                    style={[styles.actionLabel, { color: glass.text, fontSize: f.body }]}
                  >
                    {followUp.cta}
                  </FlowText>
                  <Ionicons
                    name={followUp.kind === 'store_review' ? 'star' : 'arrow-forward'}
                    size={20}
                    color={glass.text}
                    accessibilityElementsHidden
                  />
                </PressableHybrid>
              ))}
              <PressableHybrid testID="survey-done" accessibilityLabel={labels.done} onPress={onDone} withHaptic={false} variant="primary" style={[styles.action, { backgroundColor: glass.accent }]} contentStyle={styles.actionContent}>
                <FlowText testID="survey-done-label" provenance="authored" style={[styles.actionLabel, { color: glass.accentInk, fontSize: f.body }]}>{labels.done}</FlowText>
              </PressableHybrid>
            </>
          )}
        </View>
      </Reanimated.View>
    </View>
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
  panel: { alignSelf: 'stretch', paddingVertical: 8, gap: 12 },
  supporting: { alignItems: 'center', gap: 12 },
  iconHalo: { width: 120, minHeight: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '900', lineHeight: 28, textAlign: 'center' },
  subtitle: { fontWeight: '600', lineHeight: 24, textAlign: 'center' },
  error: { alignSelf: 'stretch', borderRadius: 14, padding: 14, fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  action: { alignSelf: 'stretch', minHeight: 48, borderRadius: 16, overflow: 'hidden' },
  actionContent: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionLabel: { fontWeight: '900', textAlign: 'center' },
});
