import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Lang } from '../../constants/i18n';
import { getLevelExamCopy } from '../../app/level_exam_copy';
import type { LevelExamLevel } from '../../app/level_exam_types';
import BouncyScrollView from '../BouncyScrollView';
import ScreenGradient from '../ScreenGradient';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';

type Props = {
  lang: Lang;
  level: LevelExamLevel;
  firstLesson: number;
  lastLesson: number;
  durationMinutes: number;
  energyCost: number;
  availableEnergy: number;
  bestScore: number | null;
  starting: boolean;
  onBack: () => void;
  onStart: () => void | Promise<void>;
};

export default function LevelExamIntro({
  lang,
  level,
  firstLesson,
  lastLesson,
  durationMinutes,
  energyCost,
  availableEnergy,
  bestScore,
  starting,
  onBack,
  onStart,
}: Props) {
  const { theme: t, f, ds } = useTheme();
  const [launching, setLaunching] = useState(false);
  const launchGuardRef = useRef(false);
  const hasEnergy = availableEnergy >= energyCost;
  const disabled = starting || launching || !hasEnergy;
  const copy = useMemo(() => getLevelExamCopy(lang, {
    level,
    firstLesson,
    lastLesson,
    durationMinutes,
    energyCost,
    bestScore,
  }), [bestScore, durationMinutes, energyCost, firstLesson, lang, lastLesson, level]);

  useEffect(() => {
    if (!starting && !launching) launchGuardRef.current = false;
  }, [launching, starting]);

  const handleStart = useCallback(() => {
    if (disabled || launchGuardRef.current) return;
    launchGuardRef.current = true;
    setLaunching(true);
    Promise.resolve(onStart()).catch(() => {
      launchGuardRef.current = false;
      setLaunching(false);
    });
  }, [disabled, onStart]);

  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingHorizontal: ds.spacing.lg }]}> 
          <TapScale
            onPress={onBack}
            accessibilityLabel={lang === 'ru' ? 'Вернуться назад' : 'Back'}
            style={[styles.backButton, { backgroundColor: t.bgSurface }]}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </TapScale>
          <View style={[styles.energyPill, { backgroundColor: t.bgSurface2 }]}> 
            <Ionicons name="flash" size={16} color={t.accent} />
            <Text style={{ color: t.textPrimary, fontSize: f.caption, fontFamily: ds.fontFamily }}>
              {availableEnergy}
            </Text>
          </View>
        </View>

        <BouncyScrollView
          decelerationRate="normal"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { padding: ds.spacing.lg, gap: ds.spacing.lg }]}
        >
          <View style={{ gap: ds.spacing.sm }}>
            <View style={[styles.eyebrow, { backgroundColor: t.accentBg }]}> 
              <Ionicons name="school-outline" size={16} color={t.accent} />
              <Text style={{ color: t.accent, fontSize: f.label, fontFamily: ds.fontFamily, fontWeight: '800' }}>
                {copy.lessonRange}
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              style={{ color: t.textPrimary, fontSize: f.h1, fontFamily: ds.fontFamily, fontWeight: '900' }}
            >
              {copy.title}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, fontFamily: ds.fontFamily, lineHeight: f.body * 1.45 }}>
              {copy.lead}
            </Text>
          </View>

          <View style={[styles.metrics, { gap: ds.spacing.sm }]}> 
            <TonalSurface tone="raised" radius={ds.radius.lg} style={[styles.metric, { padding: ds.spacing.md }]}> 
              <Ionicons name="checkmark-circle-outline" size={22} color={t.correct} />
              <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '800' }}>
                {copy.passGoal}
              </Text>
            </TonalSurface>
            <TonalSurface tone="raised" radius={ds.radius.lg} style={[styles.metric, { padding: ds.spacing.md }]}> 
              <Ionicons name="timer-outline" size={22} color={t.accent} />
              <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '800' }}>
                {copy.duration}
              </Text>
            </TonalSurface>
          </View>

          {bestScore !== null ? (
            <Text style={[styles.bestResult, { color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily }]}>
              {copy.bestResult}
            </Text>
          ) : null}

          {!hasEnergy ? (
            <Text accessibilityRole="alert" style={[styles.centerText, { color: t.wrong, fontSize: f.caption, fontFamily: ds.fontFamily }]}>
              {copy.energyMissing}
            </Text>
          ) : null}

          <TapScale
            testID="level-exam-start"
            onPress={handleStart}
            disabled={disabled}
            accessibilityLabel={copy.startCta}
            accessibilityHint={copy.lead}
            accessibilityState={{ disabled }}
            style={[
              styles.startButton,
              {
                minHeight: ds.buttonHeight,
                backgroundColor: disabled ? t.bgSurface2 : t.accent,
                paddingHorizontal: ds.spacing.lg,
              },
            ]}
          >
            <View testID="level-exam-start-content" style={styles.startButtonContent}>
              <Text
                numberOfLines={1}
                style={{ color: disabled ? t.textMuted : t.correctText, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: '900', flexShrink: 1 }}
              >
                {copy.startCta}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={disabled ? t.textMuted : t.correctText} />
            </View>
          </TapScale>
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  energyPill: { minHeight: 36, minWidth: 54, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  scrollContent: { paddingBottom: 36 },
  eyebrow: { alignSelf: 'flex-start', minHeight: 32, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap' },
  metric: { minWidth: 140, flex: 1, gap: 8 },
  bestResult: { textAlign: 'center' },
  centerText: { textAlign: 'center' },
  startButton: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
