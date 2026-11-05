import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import type { SpirePackSetClient } from '../../modules/spire/pack_plan';
import { recordAnswerCorrect, recordTime, FLOOR_RECORD_MAX_MS, type RecordAnswer } from '../../shared/spire_floor_records';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import SpireTaskView from './SpireTaskView';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { recordCopy } from './spire_record_copy';

export type RecordAttempt = Readonly<{ token: string; packHash: string; saltId: string; set: SpirePackSetClient; floor: number; step: number }>;
type Props = Readonly<{ lang: Lang; studyTarget: string; attempt: RecordAttempt;
  onFinish: (answers: readonly RecordAnswer[], durationMs: number) => void; onClose: () => void }>;

// Updating the stopwatch must not rerender the task or rebuild its answer controls.
function RecordStopwatch({ started, active, finalMs, color }: Readonly<{
  started: React.MutableRefObject<number | null>; active: boolean; finalMs: number; color: string;
}>) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setMs(started.current === null ? 0 : Date.now() - started.current), 100);
    return () => clearInterval(timer);
  }, [active, started]);
  return <Text style={{ color }}>{recordTime(active ? ms : finalMs)}</Text>;
}

/** Deliberately independent of the normal runner: no energy, progress, gold or rewards. */
export default function SpireRecordAttempt({ lang, studyTarget, attempt, onFinish, onClose }: Props) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const answers = useRef<RecordAnswer[]>([]);
  const started = useRef<number | null>(null);
  const locked = useRef(false);
  const done = useRef(false);
  // Server clock already runs: show the first task immediately after delivery.
  const countdown = 0;
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (countdown !== 0 || failed || !foreground) return;
    // Start at the first visible task; background time after this point still counts.
    if (started.current === null) started.current = Date.now();
    const timer = setTimeout(() => {
      done.current = true; setFailed(true); setElapsed(FLOOR_RECORD_MAX_MS);
    }, Math.max(0, FLOOR_RECORD_MAX_MS - (Date.now() - started.current)));
    return () => clearTimeout(timer);
  }, [countdown, failed, foreground]);
  useEffect(() => { locked.current = false; }, [index]);
  const submit = useCallback((answer: RecordAnswer) => {
    if (locked.current || done.current || countdown || !foreground || started.current === null) return;
    locked.current = true;
    const ms = Date.now() - started.current;
    if (ms >= FLOOR_RECORD_MAX_MS || !recordAnswerCorrect(attempt.saltId, attempt.set.tasks[index], attempt.set.answerFingerprints[index], answer)) {
      done.current = true; setFailed(true); setElapsed(ms); return;
    }
    answers.current.push(answer);
    if (answers.current.length === 10) { done.current = true; onFinish(answers.current, Math.max(1, ms)); }
    else setIndex((n) => n + 1);
  }, [attempt, index, countdown, foreground, onFinish]);
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={[s.root, { backgroundColor: p.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <V2Pressable accessibilityRole="button" onPress={onClose} style={s.close}><Text style={{ color: p.text }}>{recordCopy(lang, 'leave')}</Text></V2Pressable>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{recordCopy(lang, 'attemptTitle')}</Text>
        <RecordStopwatch started={started} active={foreground && countdown === 0 && !failed} finalMs={elapsed} color={p.text} />
      </View>
      {countdown > 0 ? <View style={s.center}><Text style={[s.count, { color: p.text }]}>{countdown}</Text></View> : failed ?
        <View style={s.center}>
          <Text style={[s.title, { color: p.text }]}>{recordCopy(lang, 'failTitle')}</Text>
          <Text style={[s.copy, { color: p.textSecondary }]}>{recordCopy(lang, 'failBody')}</Text>
          <V2Pressable onPress={onClose} accessibilityRole="button" style={[s.button, { backgroundColor: p.cta }]}><Text style={{ color: p.ctaText }}>{recordCopy(lang, 'backToRecord')}</Text></V2Pressable>
        </View> : <>
          <ScrollView contentContainerStyle={s.tasks}>
            {foreground ? <SpireTaskView key={index} lang={lang} studyTarget={studyTarget} task={attempt.set.tasks[index]} feedback={null}
              disabled={done.current} onChoice={(selectedIndex) => submit({ selectedIndex })}
              onTokens={(tokens) => submit({ tokens })} onItems={(selectedIndexes) => submit({ selectedIndexes })} /> : null}
          </ScrollView>
          <Text style={[s.counter, { color: p.text }]}>{index + 1} / 10</Text>
        </>}
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  close: { minWidth: 44, minHeight: 48, justifyContent: 'center' }, title: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 }, count: { fontSize: 64 },
  tasks: { padding: 20 }, counter: { padding: 16, textAlign: 'center', fontSize: 16 }, copy: { fontSize: 16, textAlign: 'center' },
  button: { minHeight: 52, paddingHorizontal: 30, borderRadius: 26, justifyContent: 'center' },
});
