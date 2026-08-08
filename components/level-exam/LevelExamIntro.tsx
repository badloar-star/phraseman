import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Lang } from '../../constants/i18n';
import { getLevelExamCopy } from '../../app/level_exam_copy';
import type { LevelExamLevel } from '../../app/level_exam_types';
import ScreenGradient from '../ScreenGradient';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';
import EnergyIcon from '../EnergyIcon';

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
  const { theme: t, f, ds, themeMode } = useTheme();
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
            <EnergyIcon filled={availableEnergy > 0} themeColor={t.accent} themeMode={themeMode} size={20} animateChange={false} />
            <Text style={{ color: t.textPrimary, fontSize: f.caption, fontFamily: ds.fontFamily }}>
              {availableEnergy}
            </Text>
          </View>
        </View>

        <View style={styles.sheetWrap}>
          <View style={[styles.sheet, { backgroundColor: t.bgCard, padding: ds.spacing.lg, gap: ds.spacing.md }]}> 
            <View style={[styles.sheetHandle, { backgroundColor: t.bgSurface2 }]} />
            <View style={styles.sheetTitleRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: t.accent, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '800' }}>
                  {copy.lessonRange}
                </Text>
                <Text
                  accessibilityRole="header"
                  style={{ color: t.textPrimary, fontSize: f.h1, fontFamily: ds.fontFamily, fontWeight: '900' }}
                >
                  {copy.title}
                </Text>
              </View>
              <Ionicons name="school-outline" size={28} color={t.accent} />
            </View>

            <TonalSurface tone="raised" radius={ds.radius.lg} style={[styles.metrics, { padding: ds.spacing.md }]}> 
            <View style={styles.metric}>
              <Ionicons name="checkmark-circle-outline" size={20} color={t.correct} />
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                {copy.passGoal}
              </Text>
            </View>
            <View style={[styles.metric, styles.metricSecondary]}>
              <Ionicons name="timer-outline" size={20} color={t.accent} />
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                {copy.duration}
              </Text>
            </View>
            </TonalSurface>

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
              accessibilityHint={copy.lessonRange}
              accessibilityState={{ disabled }}
              style={[styles.startButton, { minHeight: ds.buttonHeight, backgroundColor: disabled ? t.bgSurface2 : t.accent, paddingHorizontal: ds.spacing.lg }]}
            >
              <View testID="level-exam-start-content" style={styles.startButtonContent}>
                <Text style={{ color: disabled ? t.textMuted : t.correctText, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: '900' }}>
                  {copy.startCta}
                </Text>
                <View style={styles.costBadge}>
                  <EnergyIcon filled={true} themeColor={disabled ? t.textMuted : t.correctText} themeMode={themeMode} size={18} animateChange={false} />
                  <Text style={{ color: disabled ? t.textMuted : t.correctText, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '900' }}>
                    {energyCost}
                  </Text>
                </View>
              </View>
            </TapScale>
          </View>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  energyPill: { minHeight: 36, minWidth: 54, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  metricSecondary: { paddingLeft: 12 },
  bestResult: { textAlign: 'center' },
  centerText: { textAlign: 'center' },
  startButton: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  costBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
