// зачем: владелец тестирует каждый режим Learning V2 руками до прод-контента.
// Плеер гоняет раунд режима через шесть состояний из принятых макетов Kimi V5:
// prompt → active → processing → success | needs_work → recovery. Речевые режимы —
// честная СИМУЛЯЦИЯ распознавания (бейдж в шапке), реальный STT придёт в пакете 3.
// Всё локально и мгновенно: ни одного сетевого вызова, ни одного спиннера на экран.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import type { LabModeEntry } from './mode_catalog';
import { buildDemoRound, isAssembledCorrect, type LabDemoRound } from './demo_content';

type PlayerPhase = 'prompt' | 'active' | 'processing' | 'success' | 'needs_work' | 'recovery';

interface ModeDemoPlayerProps {
  readonly mode: LabModeEntry;
  readonly onClose: () => void;
}

const PROCESSING_MS = 700;
const SPEECH_LISTEN_MS = 2200;
const SPEED_MATCH_SECONDS = 7;

export const ModeDemoPlayer = memo(function ModeDemoPlayer({ mode, onClose }: ModeDemoPlayerProps) {
  const { theme: t, f, ds } = useTheme();
  const runtimeActive = useRuntimeActive();
  const round: LabDemoRound = useMemo(() => buildDemoRound(mode.family, mode.interaction), [mode]);

  const [phase, setPhase] = useState<PlayerPhase>('prompt');
  const [picked, setPicked] = useState<string | null>(null);
  const [assembled, setAssembled] = useState<readonly string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SPEED_MATCH_SECONDS);
  // зачем: защита от гонок — поздний таймер/анимация не должны затирать свежую фазу.
  const phaseRef = useRef<PlayerPhase>('prompt');
  phaseRef.current = phase;

  const pulse = useRef(new Animated.Value(1)).current;

  const goto = useCallback((next: PlayerPhase) => {
    setPhase(next);
  }, []);

  // Пульс микрофона — ТОЛЬКО в состоянии active и только при активном рантайме
  // (Библия производительности: никаких вечных циклов в фоне).
  useEffect(() => {
    if (phase !== 'active' || !runtimeActive) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.18, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); pulse.setValue(1); };
  }, [phase, runtimeActive, pulse]);

  // Речевые режимы: «слушаем» → «обрабатываем» → детерминированный вердикт
  // (первая попытка — needs_work, вторая — success: владелец видит ОБА состояния).
  useEffect(() => {
    if (phase !== 'active' || mode.interaction !== 'speak') return;
    const listen = setTimeout(() => {
      if (phaseRef.current !== 'active') return;
      goto('processing');
    }, SPEECH_LISTEN_MS);
    return () => clearTimeout(listen);
  }, [phase, mode.interaction, goto]);

  useEffect(() => {
    if (phase !== 'processing') return;
    const verdict = setTimeout(() => {
      if (phaseRef.current !== 'processing') return;
      if (mode.interaction === 'speak') {
        goto(attempt === 0 ? 'needs_work' : 'success');
        return;
      }
      const correct = mode.interaction === 'assemble'
        ? isAssembledCorrect(assembled, round.answer)
        : picked !== null && round.options.find((option) => option.value === picked)?.correct === true;
      goto(correct ? 'success' : 'needs_work');
    }, PROCESSING_MS);
    return () => clearTimeout(verdict);
  }, [phase, mode.interaction, attempt, assembled, picked, round, goto]);

  // Таймер speed_match: тикает только в active; истёк — честный needs_work.
  useEffect(() => {
    if (phase !== 'active' || mode.family !== 'speed_match') return;
    if (secondsLeft <= 0) {
      goto('processing');
      return;
    }
    const tick = setTimeout(() => {
      if (phaseRef.current !== 'active') return;
      setSecondsLeft((value) => value - 1);
    }, 1000);
    return () => clearTimeout(tick);
  }, [phase, mode.family, secondsLeft, goto]);

  const start = useCallback(() => {
    setPicked(null);
    setAssembled([]);
    setSecondsLeft(SPEED_MATCH_SECONDS);
    goto('active');
  }, [goto]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
    start();
  }, [start]);

  const pickOption = useCallback((value: string) => {
    if (phaseRef.current !== 'active') return; // защита от двойного тапа
    setPicked(value);
    goto('processing');
  }, [goto]);

  const pickTile = useCallback((word: string, index: number) => {
    if (phaseRef.current !== 'active') return;
    setAssembled((current) => [...current, word]);
    void index;
  }, []);

  const zoneTone = mode.group === 'understand' ? t.accent : mode.group === 'sound' ? t.gold : mode.group === 'build' ? t.correct : t.accent;

  const usedTileCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const word of assembled) counts.set(word, (counts.get(word) ?? 0) + 1);
    return counts;
  }, [assembled]);

  const remainingTiles = useMemo(() => {
    const counts = new Map(usedTileCounts);
    return round.tiles.filter((word) => {
      const left = counts.get(word) ?? 0;
      if (left > 0) { counts.set(word, left - 1); return false; }
      return true;
    });
  }, [round.tiles, usedTileCounts]);

  const assembleReady = mode.interaction === 'assemble' && remainingTiles.length === 0 && assembled.length > 0;

  const failedOption = picked !== null ? round.options.find((option) => option.value === picked && !option.correct) : undefined;

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary }]} testID={`v2-lab-player-${mode.family}`}>
      <View style={styles.topBar}>
        <TapScale onPress={onClose} accessibilityLabel="Назад к режимам" scaleTo={0.9} hitSlop={12} testID="v2-lab-player-back">
          <View style={[styles.backChip, { backgroundColor: t.bgSurface }]}>
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </View>
        </TapScale>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={1}>{mode.title}</Text>
        {mode.interaction === 'speak' ? (
          <View style={[styles.simChip, { backgroundColor: t.accentBg }]}>
            <Text style={[styles.simChipText, { color: t.accent }]}>СИМУЛЯЦИЯ</Text>
          </View>
        ) : <View style={styles.simSpacer} />}
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingHorizontal: ds.spacing.lg }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.instruction, { color: t.textSecond, fontSize: f.body }]}>{round.instruction}</Text>

        {phase === 'prompt' ? (
          <View style={[styles.stageCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
            <Text style={[styles.phrase, { color: t.textPrimary, fontSize: f.h2 }]}>{round.meaning}</Text>
            <TapScale onPress={start} accessibilityLabel="Начать" withHaptic testID="v2-lab-player-start">
              <View style={[styles.primaryBtn, { backgroundColor: zoneTone, borderRadius: ds.radius.lg }]}>
                <Text style={[styles.primaryBtnText, { fontSize: f.body }]}>Начать</Text>
              </View>
            </TapScale>
          </View>
        ) : null}

        {phase === 'active' && mode.interaction === 'speak' ? (
          <View style={[styles.stageCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
            <Text style={[styles.phrase, { color: t.textPrimary, fontSize: f.h2 }]}>{round.phrase}</Text>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <View style={[styles.micCircle, { backgroundColor: zoneTone }]}>
                <Ionicons name="mic" size={34} color={t.textOnCard} />
              </View>
            </Animated.View>
            <Text style={[styles.stateHint, { color: t.textMuted, fontSize: f.sub }]}>Слушаю…</Text>
          </View>
        ) : null}

        {phase === 'active' && (mode.interaction === 'choice' || mode.interaction === 'listen') ? (
          <View style={styles.stack}>
            {mode.interaction === 'listen' ? (
              <View style={[styles.audioCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
                <Ionicons name="volume-high" size={26} color={zoneTone} />
                <Text style={[styles.audioHint, { color: t.textSecond, fontSize: f.sub }]}>{round.phrase}</Text>
              </View>
            ) : (
              <View style={[styles.audioCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
                <Text style={[styles.phrase, { color: t.textPrimary, fontSize: f.h3 }]}>{round.meaning}</Text>
              </View>
            )}
            {mode.family === 'speed_match' ? (
              <Text style={[styles.timer, { color: secondsLeft <= 2 ? t.wrong : t.textPrimary, fontSize: f.h2 }]}>{secondsLeft}</Text>
            ) : null}
            {round.options.map((option) => (
              // Плитки-варианты: вибрация TapScale, БЕЗ клик-звука (правило владельца).
              <TapScale key={option.value} onPress={() => pickOption(option.value)} scaleTo={0.97} testID={`v2-lab-option-${option.value}`}>
                <View style={[styles.option, { backgroundColor: t.bgSurface, borderRadius: ds.radius.lg }]}>
                  <Text style={[styles.optionText, { color: t.textPrimary, fontSize: f.body }]}>{option.value}</Text>
                </View>
              </TapScale>
            ))}
          </View>
        ) : null}

        {phase === 'active' && mode.interaction === 'assemble' ? (
          <View style={styles.stack}>
            <View style={[styles.audioCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
              {mode.family === 'listen_build_dictation'
                ? <Ionicons name="volume-high" size={26} color={zoneTone} />
                : <Text style={[styles.phrase, { color: t.textPrimary, fontSize: f.h3 }]}>{round.meaning}</Text>}
            </View>
            <View style={[styles.assembleLine, { backgroundColor: t.bgSurface2, borderRadius: ds.radius.lg }]}>
              <Text style={[styles.assembleText, { color: t.textPrimary, fontSize: f.body }]}>
                {assembled.length > 0 ? assembled.join(' ') : ' '}
              </Text>
            </View>
            <View style={styles.tileWrap}>
              {remainingTiles.map((word, index) => (
                <TapScale key={`${word}-${index}`} onPress={() => pickTile(word, index)} scaleTo={0.94} testID={`v2-lab-tile-${word}-${index}`}>
                  <View style={[styles.tile, { backgroundColor: t.bgSurface, borderRadius: ds.radius.md }]}>
                    <Text style={[styles.optionText, { color: t.textPrimary, fontSize: f.body }]}>{word}</Text>
                  </View>
                </TapScale>
              ))}
            </View>
            <View style={styles.rowButtons}>
              <TapScale onPress={() => setAssembled([])} accessibilityLabel="Сбросить" withHaptic testID="v2-lab-assemble-reset">
                <View style={[styles.ghostBtn, { backgroundColor: t.bgSurface, borderRadius: ds.radius.lg }]}>
                  <Text style={[styles.ghostBtnText, { color: t.textSecond, fontSize: f.body }]}>Сбросить</Text>
                </View>
              </TapScale>
              <TapScale onPress={() => goto('processing')} disabled={!assembleReady} accessibilityLabel="Проверить" withHaptic testID="v2-lab-assemble-check">
                <View style={[styles.primaryBtn, { backgroundColor: assembleReady ? zoneTone : t.bgSurface2, borderRadius: ds.radius.lg }]}>
                  <Text style={[styles.primaryBtnText, { fontSize: f.body, opacity: assembleReady ? 1 : 0.5 }]}>Проверить</Text>
                </View>
              </TapScale>
            </View>
          </View>
        ) : null}

        {phase === 'processing' ? (
          <View style={[styles.stageCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
            <Ionicons name="sync" size={28} color={zoneTone} />
            <Text style={[styles.stateHint, { color: t.textMuted, fontSize: f.sub }]}>Разбираю ответ…</Text>
          </View>
        ) : null}

        {phase === 'success' ? (
          <View style={[styles.stageCard, { backgroundColor: t.correctBg, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
            <Ionicons name="checkmark-circle" size={34} color={t.correct} />
            <Text style={[styles.phrase, { color: t.textPrimary, fontSize: f.h3 }]}>{round.answer}</Text>
            <View style={styles.rowButtons}>
              <TapScale onPress={retry} accessibilityLabel="Ещё раз" withHaptic testID="v2-lab-again">
                <View style={[styles.ghostBtn, { backgroundColor: t.bgSurface, borderRadius: ds.radius.lg }]}>
                  <Text style={[styles.ghostBtnText, { color: t.textSecond, fontSize: f.body }]}>Ещё раз</Text>
                </View>
              </TapScale>
              <TapScale onPress={onClose} accessibilityLabel="К режимам" withHaptic testID="v2-lab-done">
                <View style={[styles.primaryBtn, { backgroundColor: t.correct, borderRadius: ds.radius.lg }]}>
                  <Text style={[styles.primaryBtnText, { fontSize: f.body }]}>К режимам</Text>
                </View>
              </TapScale>
            </View>
          </View>
        ) : null}

        {phase === 'needs_work' ? (
          <View style={[styles.stageCard, { backgroundColor: t.wrongBg, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
            <Ionicons name="alert-circle" size={34} color={t.wrong} />
            <Text style={[styles.phrase, { color: t.textPrimary, fontSize: f.h3 }]}>{round.answer}</Text>
            <TapScale onPress={() => goto('recovery')} accessibilityLabel="Разобрать ошибку" withHaptic testID="v2-lab-recover">
              <View style={[styles.primaryBtn, { backgroundColor: t.wrong, borderRadius: ds.radius.lg }]}>
                <Text style={[styles.primaryBtnText, { fontSize: f.body }]}>Разобрать ошибку</Text>
              </View>
            </TapScale>
          </View>
        ) : null}

        {phase === 'recovery' ? (
          <View style={[styles.stageCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
            <Text style={[styles.phrase, { color: t.textPrimary, fontSize: f.h3 }]}>{round.answer}</Text>
            <Text style={[styles.recoveryText, { color: t.textSecond, fontSize: f.body }]}>
              {failedOption?.reasonCode === 'copula_missing'
                ? 'В английском связка am/is/are обязательна: без неё фраза ломается.'
                : failedOption?.reasonCode === 'modal_missing'
                  ? 'Для вежливой просьбы нужен модальный глагол can.'
                  : mode.interaction === 'speak'
                    ? 'Сравни свой темп с образцом и повтори ещё раз.'
                    : 'Сравни свой вариант с образцом и повтори.'}
            </Text>
            <TapScale onPress={retry} accessibilityLabel="Попробовать снова" withHaptic testID="v2-lab-retry">
              <View style={[styles.primaryBtn, { backgroundColor: zoneTone, borderRadius: ds.radius.lg }]}>
                <Text style={[styles.primaryBtnText, { fontSize: f.body }]}>Попробовать снова</Text>
              </View>
            </TapScale>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '800' },
  simChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  simChipText: { fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  simSpacer: { width: 36 },
  body: { paddingBottom: 48, gap: 16 },
  instruction: { fontWeight: '600' },
  stageCard: { padding: 24, alignItems: 'center', gap: 18 },
  phrase: { fontWeight: '800', textAlign: 'center' },
  primaryBtn: { paddingHorizontal: 26, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800' },
  ghostBtn: { paddingHorizontal: 22, paddingVertical: 13, alignItems: 'center' },
  ghostBtnText: { fontWeight: '700' },
  micCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  stateHint: { fontWeight: '600' },
  stack: { gap: 10 },
  audioCard: { padding: 20, alignItems: 'center', gap: 8 },
  audioHint: { fontWeight: '600', textAlign: 'center' },
  timer: { fontWeight: '900', textAlign: 'center' },
  option: { paddingHorizontal: 18, paddingVertical: 14 },
  optionText: { fontWeight: '700' },
  assembleLine: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
  assembleText: { fontWeight: '700' },
  tileWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { paddingHorizontal: 14, paddingVertical: 10 },
  rowButtons: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  recoveryText: { textAlign: 'center', lineHeight: 22 },
});
