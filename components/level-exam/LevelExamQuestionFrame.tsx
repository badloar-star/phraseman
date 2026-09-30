import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, SlideInRight, SlideOutLeft, useReducedMotion } from 'react-native-reanimated';

import BouncyScrollView from '../BouncyScrollView';
import ScreenGradient from '../ScreenGradient';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { PracticeCta } from '../practice/PracticeStates';
import { ExamFooter, ExamHeader, ExamTrack, examCardStyle } from './ExamGlassParts';
import LevelExamTimer from './LevelExamTimer';

type Props = {
  taskId: string;
  formatLabel: string;
  prompt: string;
  progressStart: number;
  progressEnd: number;
  total: number;
  remainingMs: number;
  totalMs: number;
  canContinue: boolean;
  continueLabel: string;
  exitLabel: string;
  /** Название в шапке («Зачёт A1»); без него — подпись формата. */
  title?: string;
  children: React.ReactNode;
  onContinue: () => void;
  onExit: () => void;
};

export default function LevelExamQuestionFrame({
  taskId,
  formatLabel,
  prompt,
  progressStart,
  progressEnd,
  total,
  remainingMs,
  totalMs,
  canContinue,
  continueLabel,
  exitLabel,
  title,
  children,
  onContinue,
  onExit,
}: Props) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReducedMotion();
  const progress = Math.max(0, Math.min(1, progressEnd / total));
  const progressLabel = progressStart === progressEnd
    ? `${progressEnd} / ${total}`
    : `${progressStart}–${progressEnd} / ${total}`;

  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={styles.safeArea}>
        {/* K4: шапка «‹ · название · n / 30 · таймер» по макету; «‹» открывает то же подтверждение выхода */}
        <ExamHeader
          glass={glass}
          title={title ?? formatLabel}
          subtitle={progressLabel}
          onBack={onExit}
          backLabel={exitLabel}
          right={<LevelExamTimer remainingMs={remainingMs} totalMs={totalMs} />}
        />
        <View style={styles.trackWrap} accessibilityLabel={`${formatLabel}, ${progressLabel}`}>
          <ExamTrack glass={glass} ratio={progress} />
        </View>

        <BouncyScrollView
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Animated.View
            key={taskId}
            entering={reduceMotion ? undefined : SlideInRight.duration(320).easing(Easing.out(Easing.cubic))}
            exiting={reduceMotion ? undefined : SlideOutLeft.duration(180).easing(Easing.in(Easing.cubic))}
          >
            <Text style={[styles.format, { color: glass.secondary }]}>{formatLabel}</Text>
            <View style={[examCardStyle(glass), styles.promptCard]}>
              <Text accessibilityRole="header" style={[styles.prompt, { color: glass.text }]}>
                {prompt}
              </Text>
            </View>
            <View style={styles.answers}>
              {children}
            </View>
          </Animated.View>
        </BouncyScrollView>

        <ExamFooter bottomInset={0}>
          <PracticeCta
            glass={glass}
            label={continueLabel}
            trailingArrow
            disabled={!canContinue}
            onPress={onContinue}
            accessibilityLabel={continueLabel}
          />
        </ExamFooter>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  trackWrap: { paddingHorizontal: 16, marginTop: 14 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 24 },
  format: { fontSize: 15, lineHeight: 20, fontWeight: '600', marginBottom: 12 },
  promptCard: { paddingVertical: 22, paddingHorizontal: 22, minHeight: 96, justifyContent: 'center' },
  prompt: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  answers: { marginTop: 18, gap: 10 },
});
