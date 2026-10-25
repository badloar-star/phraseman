import Ionicons from '@expo/vector-icons/Ionicons';
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
import { SafeTopCloseButton, ScreenBackZone } from '../v2/ScreenBackButton';

export type LevelExamRewardState = 'earned' | 'pending' | 'already_claimed' | 'none';

type Props = {
  lang: Lang;
  attemptId: string;
  result: LevelExamScoreResult;
  rewardState: LevelExamRewardState;
  energyCost: number;
  unlimitedEnergy: boolean;
  onPrimary: () => void;
  /** ✕ слева — выйти к урокам (эталон learn.html K6–K7). Нет — кнопки нет (прежний вид). */
  onClose?: () => void;
};

export default function LevelExamResult({ lang, attemptId, result, rewardState, energyCost, unlimitedEnergy, onPrimary, onClose }: Props) {
  const { theme: t, f, ds } = useTheme();
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const soundedRef = useRef(false);
  const copy = useMemo(() => getLevelExamResultCopy(lang, {
    passed: result.passed,
    neededForPass: result.neededForPass,
    energyCost,
    unlimitedEnergy,
  }), [energyCost, lang, result.neededForPass, result.passed, unlimitedEnergy]);

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
  // зачем (PM-046, владелец): текст награды был только про спин; теперь это
  // просто общее «сдано»/«тренируйся ещё» без спин-состояний pending/claimed.
  const rewardText = result.passed ? copy.rewardEarned : copy.retryCoach;

  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={styles.safeArea}>
        {/* зачем (таблица эталонов «назад» 988d643cd: итог экзамена уровня K6–K7 — ✕ слева): общий ✕ на месте кнопки «назад»; полоса под ним — до прокрутки */}
        {onClose ? <SafeTopCloseButton screen="level_exam_result" testID="level-exam-result-close" onPress={onClose} /> : null}
        {onClose ? <ScreenBackZone /> : null}
        <BouncyScrollView
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { padding: ds.spacing.lg, gap: ds.spacing.lg }]}
        >
          <Animated.View accessibilityLiveRegion="polite" style={[styles.hero, entranceStyle]}>
            <View style={[styles.heroIcon, { backgroundColor: heroBackground }]}> 
              <Ionicons name={result.passed ? 'trophy' : 'refresh'} size={34} color={heroColor} />
            </View>
            <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h1, fontFamily: ds.fontFamily, fontWeight: '700', textAlign: 'center' }}>
              {copy.title}
            </Text>
            <Text style={{ color: heroColor, fontSize: f.numLg * 1.7, fontFamily: ds.fontFamily, fontWeight: '900' }}>
              {result.score}/{result.total}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '700' }}>
              {copy.scoreLabel} · {result.pct}%
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
                    <Text style={{ color: t.accentText, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '700' }}>
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
                  <Ionicons name="book-outline" size={18} color={t.accentText} />
                  <Text style={{ flex: 1, color: t.accentText, fontSize: f.body, fontFamily: ds.fontFamily }}>
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
            <Ionicons name={result.passed ? 'sparkles' : 'bulb-outline'} size={22} color={result.passed ? t.accentText : t.accentText} />
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '800' }}>
              {rewardText}
            </Text>
          </TonalSurface>

          <TapScale
            onPress={onPrimary}
            accessibilityLabel={copy.primaryAction}
            style={[styles.primaryButton, { minHeight: ds.buttonHeight, backgroundColor: t.accent, paddingHorizontal: ds.spacing.lg }]}
          >
            <Text style={{ color: t.textOnGold, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: '900' }}>
              {copy.primaryAction}
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
  // зачем: плитка 61×61 radius 16 из макета results.html (RES-09) вместо круга 64.
  heroIcon: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  skillLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  skillTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  skillFill: { height: '100%', borderRadius: 4 },
  lessonRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // зачем: pill-кнопка макета (.cta radius 24).
  primaryButton: { borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
