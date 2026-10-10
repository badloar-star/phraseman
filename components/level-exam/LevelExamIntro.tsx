import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { triLang, type Lang } from '../../constants/i18n';
import { getLevelExamCopy } from '../../app/level_exam_copy';
import type { LevelExamLevel } from '../../app/level_exam_types';
import ScreenGradient from '../ScreenGradient';
import BouncyScrollView from '../BouncyScrollView';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { PracticeCta } from '../practice/PracticeStates';
import { ExamFooter, ExamHeader, ExamHero, ExamKvCard, ExamVerdict } from './ExamGlassParts';
import { AnimatedEnergyNumber } from '../energy/AnimatedEnergyNumber';
import { noteSwallowedAs } from '../../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type Props = {
  lang: Lang;
  level: LevelExamLevel;
  firstLesson: number;
  lastLesson: number;
  durationMinutes: number;
  energyCost: number;
  availableEnergy: number;
  unlimitedEnergy?: boolean;
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
  unlimitedEnergy = false,
  bestScore,
  starting,
  onBack,
  onStart,
}: Props) {
  const { theme: t, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const [launching, setLaunching] = useState(false);
  const launchGuardRef = useRef(false);
  const mountedRef = useRef(true);
  const hasEnergy = unlimitedEnergy || availableEnergy >= energyCost;
  const disabled = starting || launching || !hasEnergy;
  const copy = useMemo(() => getLevelExamCopy(lang, {
    level,
    firstLesson,
    lastLesson,
    durationMinutes,
    energyCost,
    bestScore,
  }), [bestScore, durationMinutes, energyCost, firstLesson, lang, lastLesson, level]);
  // PM-086: кнопка не показывает цену энергии; стоимость остаётся в runtime guard.
  const startAccessibilityLabel = copy.startCta;

  useEffect(() => {
    if (!starting && !launching) launchGuardRef.current = false;
  }, [launching, starting]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleStart = useCallback(() => {
    if (disabled || launchGuardRef.current) return;
    launchGuardRef.current = true;
    setLaunching(true);
    // `onStart` may resolve without leaving the intro (for example, the
    // atomic energy spend lost a race after this frame had shown enough
    // energy). Release the local guard on every settled outcome; on a real
    // start the intro unmounts as the countdown replaces it.
    void Promise.resolve()
      .then(() => onStart())
      // A rejected or synchronously thrown start is an expected UI outcome;
      // the owner screen reports the concrete error and this component only
      // owns releasing its press guard.
      .catch(noteSwallowedAs('LevelExamIntro:useCallback.resolve', undefined))
      .finally(() => {
        launchGuardRef.current = false;
        if (mountedRef.current) setLaunching(false);
      });
  }, [disabled, onStart]);

  return (
    <ScreenGradient artBackdrop="exam">
      <SafeAreaView style={styles.safeArea}>
        <ExamHeader
          glass={glass}
          title={copy.title}
          onBack={onBack}
          backLabel={triLang(lang, {
            ru: 'Вернуться назад', uk: 'Повернутися назад', en: 'Go back', es: 'Volver',
            'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri dön', pl: 'Wróć',
          })}
          right={(
            <View style={[styles.energyPill, { backgroundColor: glass.opaqueControl }]}>
              <Ionicons name="flash-outline" size={20} color={glass.text} importantForAccessibility="no" />
              {unlimitedEnergy ? (
                <Text style={[styles.energyInfinity, { color: glass.text }]} maxFontSizeMultiplier={1.2}>∞</Text>
              ) : (
                <AnimatedEnergyNumber value={availableEnergy} color={glass.text} style={styles.energyValue} />
              )}
            </View>
          )}
        />
        <BouncyScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} decelerationRate="fast">
          {/* K1: герой «Зачёт A1» + диапазон уроков вторым абзацем */}
          <View style={{ marginTop: 12 }}>
            <ExamHero glass={glass} icon="ribbon-outline" title={copy.title} message={copy.lessonRange} />
          </View>
          <ExamKvCard glass={glass} style={{ marginTop: 26 }}>
            <View style={styles.metric}>
              <Ionicons name="checkmark-circle-outline" size={20} color={t.correct} />
              <Text style={[styles.metricText, { color: glass.text }]}>{copy.passGoal}</Text>
            </View>
            <View style={[styles.metric, { marginTop: 14 }]}>
              <Ionicons name="timer-outline" size={20} color={glass.text} />
              <Text style={[styles.metricText, { color: glass.text }]}>{copy.duration}</Text>
            </View>
            {bestScore !== null ? (
              <Text style={[styles.bestResult, { color: glass.secondary }]}>{copy.bestResult}</Text>
            ) : null}
          </ExamKvCard>
          {!unlimitedEnergy && !hasEnergy ? (
            <View accessibilityRole="alert">
              <ExamVerdict icon="flash-outline" text={copy.energyMissing} color={t.wrong} />
            </View>
          ) : null}
        </BouncyScrollView>
        <ExamFooter bottomInset={0}>
          <PracticeCta
            testID="level-exam-start"
            glass={glass}
            label={copy.startCta}
            trailingArrow
            disabled={disabled}
            onPress={handleStart}
            accessibilityLabel={startAccessibilityLabel}
          />
          {/* зачем (PM-086, владелец 2026-09-24): ценник энергии над
              кнопкой убран — расход энергии не меняется. */}
        </ExamFooter>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 24 },
  energyPill: { minHeight: 38, minWidth: 74, borderRadius: 19, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  energyValue: { width: 40, fontSize: 16, lineHeight: 21 },
  energyInfinity: { width: 40, textAlign: 'center', fontSize: 22, lineHeight: 26, fontWeight: '700' },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  metricText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  bestResult: { marginTop: 14, fontSize: 16, lineHeight: 22 },
});
