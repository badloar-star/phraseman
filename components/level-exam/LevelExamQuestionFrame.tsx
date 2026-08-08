import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, SlideInRight, SlideOutLeft, useReducedMotion } from 'react-native-reanimated';

import BouncyScrollView from '../BouncyScrollView';
import ScreenGradient from '../ScreenGradient';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';
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
  children,
  onContinue,
  onExit,
}: Props) {
  const { theme: t, f, ds } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = Math.max(0, Math.min(1, progressEnd / total));
  const progressLabel = progressStart === progressEnd
    ? `${progressEnd}/${total}`
    : `${progressStart}–${progressEnd}/${total}`;

  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.topBar, { paddingHorizontal: ds.spacing.lg, gap: ds.spacing.md }]}> 
          <TapScale
            onPress={onExit}
            accessibilityLabel={exitLabel}
            style={[styles.exitButton, { backgroundColor: t.bgSurface }]}
          >
            <Ionicons name="close" size={24} color={t.textPrimary} />
          </TapScale>
          <View style={styles.progressArea}>
            <View style={styles.progressLabels}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '800' }}>
                {formatLabel}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '900' }}>
                {progressLabel}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}> 
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: t.accent }]} />
            </View>
          </View>
          <LevelExamTimer remainingMs={remainingMs} totalMs={totalMs} />
        </View>

        <BouncyScrollView
          decelerationRate="normal"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { padding: ds.spacing.lg, gap: ds.spacing.lg }]}
        >
          <Animated.View
            key={taskId}
            entering={reduceMotion ? undefined : SlideInRight.duration(320).easing(Easing.out(Easing.cubic))}
            exiting={reduceMotion ? undefined : SlideOutLeft.duration(180).easing(Easing.in(Easing.cubic))}
          >
          <Text
            accessibilityRole="header"
            style={{ color: t.textPrimary, fontSize: f.h1, fontFamily: ds.fontFamily, fontWeight: '900', lineHeight: f.h1 * 1.25 }}
          >
            {prompt}
          </Text>
          <TonalSurface tone="card" radius={ds.radius.xl} style={{ padding: ds.spacing.lg }}>
            {children}
          </TonalSurface>
          </Animated.View>
        </BouncyScrollView>

        <View style={[styles.footer, { padding: ds.spacing.lg, backgroundColor: t.bgCard }]}> 
          <TapScale
            onPress={onContinue}
            disabled={!canContinue}
            accessibilityLabel={continueLabel}
            accessibilityState={{ disabled: !canContinue }}
            style={[
              styles.continueButton,
              {
                minHeight: ds.buttonHeight,
                backgroundColor: canContinue ? t.accent : t.bgSurface2,
                paddingHorizontal: ds.spacing.lg,
              },
            ]}
          >
            <Text style={{ color: canContinue ? t.correctText : t.textMuted, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: '900' }}>
              {continueLabel}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={canContinue ? t.correctText : t.textMuted} />
          </TapScale>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: { minHeight: 74, flexDirection: 'row', alignItems: 'center' },
  exitButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  progressArea: { flex: 1, gap: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  content: { flexGrow: 1, paddingBottom: 32 },
  footer: { paddingTop: 12 },
  continueButton: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
