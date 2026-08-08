import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Lang } from '../../constants/i18n';
import { getLevelExamResultCopy } from '../../app/level_exam_result_copy';
import type { LevelExamScoreResult } from '../../app/level_exam_scoring';
import { soundDirector } from '../../modules/audio/sound_director';
import BouncyScrollView from '../BouncyScrollView';
import ScreenGradient from '../ScreenGradient';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';

export type LevelExamRewardState = 'earned' | 'pending' | 'already_claimed' | 'none';

type Props = {
  lang: Lang;
  attemptId: string;
  result: LevelExamScoreResult;
  rewardState: LevelExamRewardState;
  energyCost: number;
  onPrimary: () => void;
  onReview: () => void;
};

export default function LevelExamResult({ lang, attemptId, result, rewardState, energyCost, onPrimary, onReview }: Props) {
  const { theme: t, f, ds } = useTheme();
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const soundedRef = useRef(false);
  const copy = useMemo(() => getLevelExamResultCopy(lang, {
    passed: result.passed,
    neededForPass: result.neededForPass,
    energyCost,
  }), [energyCost, lang, result.neededForPass, result.passed]);

  useEffect(() => {
    if (!soundedRef.current) {
      soundedRef.current = true;
      soundDirector.request(result.passed ? 'pm.complete.exam_pass' : 'pm.complete.exam_retry', {
        scope: 'level-exam',
        dedupeKey: attemptId,
      });
    }
    entrance.value = withTiming(1, {
      duration: reducedMotion ? 140 : 520,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(entrance);
  }, [attemptId, entrance, reducedMotion, result.passed]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: reducedMotion ? 0 : (1 - entrance.value) * 18 }],
  }));
  const heroColor = result.passed ? t.correct : t.wrong;
  const heroBackground = result.passed ? t.correctBg : t.wrongBg;
  const rewardText = rewardState === 'earned' ? copy.rewardEarned
    : rewardState === 'pending' ? copy.rewardPending
      : rewardState === 'already_claimed' ? copy.rewardAlreadyClaimed
        : copy.retryCoach;

  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={styles.safeArea}>
        <BouncyScrollView
          decelerationRate="normal"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { padding: ds.spacing.lg, gap: ds.spacing.lg }]}
        >
          <Animated.View accessibilityLiveRegion="polite" style={[styles.hero, entranceStyle]}>
            <View style={[styles.heroIcon, { backgroundColor: heroBackground }]}> 
              <Ionicons name={result.passed ? 'trophy' : 'refresh'} size={34} color={heroColor} />
            </View>
            <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h1, fontFamily: ds.fontFamily, fontWeight: '900', textAlign: 'center' }}>
              {copy.title}
            </Text>
            <Text style={{ color: heroColor, fontSize: f.numLg * 1.7, fontFamily: ds.fontFamily, fontWeight: '900' }}>
              {result.score}/{result.total}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '700' }}>
              {copy.scoreLabel} · {result.pct}% · +{result.baseXp} XP
            </Text>
          </Animated.View>

          <TonalSurface tone="card" radius={ds.radius.xl} style={{ padding: ds.spacing.lg, gap: ds.spacing.md }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '900' }}>
              {copy.skillsLabel}
            </Text>
            {Object.entries(result.byFormat).map(([format, score]) => {
              const ratio = score.total === 0 ? 0 : score.correct / score.total;
              return (
                <View key={format} style={{ gap: ds.spacing.xs }}>
                  <View style={styles.skillLabel}>
                    <Text style={{ color: t.textSecond, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                      {copy.formatLabels[format as keyof typeof copy.formatLabels]}
                    </Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '900' }}>
                      {score.correct}/{score.total}
                    </Text>
                  </View>
                  <View style={[styles.skillTrack, { backgroundColor: t.bgSurface2 }]}> 
                    <View style={[styles.skillFill, { width: `${ratio * 100}%`, backgroundColor: ratio >= 0.7 ? t.correct : t.wrong }]} />
                  </View>
                </View>
              );
            })}
          </TonalSurface>

          {result.weakLessons.length > 0 ? (
            <TonalSurface tone="subtle" radius={ds.radius.lg} style={{ padding: ds.spacing.lg, gap: ds.spacing.sm }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '900' }}>
                {copy.weakLessonsLabel}
              </Text>
              {result.weakLessons.map((lesson) => (
                <View key={lesson.lessonId} style={styles.lessonRow}>
                  <Ionicons name="book-outline" size={18} color={t.accent} />
                  <Text style={{ flex: 1, color: t.textSecond, fontSize: f.body, fontFamily: ds.fontFamily }}>
                    {lesson.title}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '800' }}>
                    {lesson.correct}/{lesson.total}
                  </Text>
                </View>
              ))}
            </TonalSurface>
          ) : null}

          <TonalSurface tone="raised" radius={ds.radius.lg} style={[styles.reward, { padding: ds.spacing.md }]}> 
            <Ionicons name={result.passed ? 'sparkles' : 'bulb-outline'} size={22} color={result.passed ? t.gold : t.accent} />
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '800' }}>
              {rewardText}
            </Text>
          </TonalSurface>

          <TapScale
            onPress={onPrimary}
            accessibilityLabel={copy.primaryAction}
            style={[styles.primaryButton, { minHeight: ds.buttonHeight, backgroundColor: t.accent, paddingHorizontal: ds.spacing.lg }]}
          >
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: '900' }}>
              {copy.primaryAction}
            </Text>
          </TapScale>
          <TapScale
            onPress={onReview}
            accessibilityLabel={copy.reviewAction}
            style={[styles.reviewButton, { minHeight: ds.buttonHeight, backgroundColor: t.bgSurface2, paddingHorizontal: ds.spacing.lg }]}
          >
            <Text style={{ color: t.textSecond, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '800' }}>
              {copy.reviewAction}
            </Text>
          </TapScale>
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingBottom: 36 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  skillLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  skillTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  skillFill: { height: '100%', borderRadius: 4 },
  lessonRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryButton: { borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reviewButton: { borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
