import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ClampedText } from '../text-integrity/ClampedText';
import type { Lang } from '../../constants/i18n';
import type { SpireConfigDoc } from '../../modules/spire/config_contract';
import type { SpireRoomSnapshot } from '../../modules/spire/room_rows';
import { spireOpenLiveGate } from '../../app/spire/spire_live_gate';
import { spireCall } from '../../app/spire/spire_net';
import { recordTime, stepRecordKey, type FloorRecordSnapshot, type RecordAnswer, type StepRecordReceipt } from '../../shared/spire_floor_records';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import V2Pressable from '../v2/V2Pressable';
import SpireRankCoin from './SpireRankCoin';
import SpireRecordAttempt, { type RecordAttempt } from './SpireRecordAttempt';
import { useSpirePalette } from './useSpirePalette';
import { recordCopy } from './spire_record_copy';
import { SPIRE_SCENE_INK } from './scene/spire_scene_palette';
import { colorWithAlpha } from '../v2/plateAlpha';

type Props = Readonly<{ lang: Lang; floor: number; stableId: string | null; room: SpireRoomSnapshot | null;
  config: SpireConfigDoc | null; active: boolean; compact?: boolean }>;
type Pending = Readonly<{ attempt: RecordAttempt; answers: readonly RecordAnswer[]; durationMs: number }>;

/** Mounted with the account/room key by Home: old requests cannot populate another owner. */
export default function SpireFloorRecord({ lang, floor, stableId, room, config, active, compact }: Props) {
  const p = useSpirePalette();
  const [open, setOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(1);
  const stepCount = floor <= 5 ? floor + 4 : 10;
  const step = Math.min(selectedStep, stepCount);
  const recordKey = stepRecordKey(floor, step);
  const [data, setData] = useState<FloorRecordSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<RecordAttempt | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const alive = useRef(true);
  const activeRef = useRef(active); activeRef.current = active;
  const lock = useRef(false);
  const lastRead = useRef(0);
  const revision = useRef(0);
  const gate = useMemo(() => spireOpenLiveGate(config, 'floor_records'), [config]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const call = useCallback(<T,>(extra: Readonly<Record<string, unknown>>): Promise<T> => {
    if (!gate || !room || !stableId) return Promise.reject(new Error('record_not_ready'));
    return spireCall(gate, 'spireFloorRecords', { stableId, groupId: room.groupId, weekId: room.weekId, lang: room.lang, ...extra });
  }, [gate, room, stableId]);
  const refresh = useCallback(async () => {
    if (!gate || !room || !stableId || Date.now() - lastRead.current < 30 * 60_000) return;
    lastRead.current = Date.now();
    const before = revision.current;
    try {
      const result = await call<FloorRecordSnapshot>({ action: 'read' });
      if (alive.current && before === revision.current) { setData(result); setStatus('ready'); }
    } catch (error) {
      console.warn('[SPIRE-RECORD] read_failed', String(error));
      if (alive.current && before === revision.current) { setStatus('unavailable'); lastRead.current = 0; }
    }
  }, [call, gate, room, stableId]);
  useEffect(() => { if (active) void refresh(); }, [active, refresh]);
  useEffect(() => { if (!active) { setOpen(false); setAttempt(null); } }, [active]);
  const record = recordKey ? data?.records[recordKey] ?? null : null;
  const personal = recordKey ? data?.personal[recordKey] ?? null : null;
  const holder = room?.members.find((member) => member.uid === record?.uid);
  const title = `${recordCopy(lang, 'title')} · ${step}`;
  const loading = status === 'loading' || !room || !stableId;
  const summary = loading ? (recordCopy(lang, 'loading')) : status === 'unavailable' ?
    (recordCopy(lang, 'unavailable')) : record ?
      `${record.uid === stableId ? (recordCopy(lang, 'yours')) : holder?.name ?? (recordCopy(lang, 'participant'))} · ${recordTime(record.durationMs)}` :
      (recordCopy(lang, 'first'));
  const save = async (value: Pending) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setPending(value); setMessage(null);
    try {
      const result = await call<StepRecordReceipt>({ action: 'finish', floor: value.attempt.floor, step: value.attempt.step, token: value.attempt.token,
        answers: value.answers, durationMs: value.durationMs });
      if (!alive.current) return;
      revision.current += 1;
      setStatus('ready'); setPending(null);
      setMessage(result.recordSet ?
        (recordCopy(lang, 'recordMine')) :
        (recordCopy(lang, 'recordNot')));
      lastRead.current = 0;
      void refresh();
    } catch (error) {
      console.warn('[SPIRE-RECORD] submit_failed', String(error));
      if (alive.current) {
        const code = String((error as { code?: unknown } | null)?.code ?? '');
        const expired = /failed-precondition|invalid-argument|permission-denied|unauthenticated/.test(code);
        if (expired) setPending(null);
        setMessage(expired ? (recordCopy(lang, 'attemptInvalid')) :
          (recordCopy(lang, 'notConfirmed')));
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const start = async () => {
    if (lock.current || pending) return;
    lock.current = true; setBusy(true); setMessage(null);
    try {
      const result = await call<Omit<RecordAttempt, 'floor' | 'step'>>({ action: 'start', floor, step });
      if (alive.current && activeRef.current) { setOpen(false); setAttempt({ ...result, floor, step }); }
    } catch (error) {
      console.warn('[SPIRE-RECORD] start_failed', String(error));
      if (alive.current) setMessage(recordCopy(lang, 'startUnavailable'));
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  return <>
    <V2Pressable testID="spire-floor-record" accessibilityRole="button" accessibilityLabel={`${title}. ${summary}`}
      onPress={() => { setOpen(true); void refresh(); }} style={[s.card, compact ? { height: 52 } : null]}>
      {record ? <SpireRankCoin rank={holder?.coinRank ?? null} size={32} plus={false} /> :
        <Ionicons name="trophy-outline" size={28} color={SPIRE_SCENE_INK.text} />}
      {/* Owner 28.10: keep the old row height; full text remains in the sheet and accessibility label. */}
      <View style={s.grow}><ClampedText style={s.label} maxFontSizeMultiplier={1.3} maxLines={1}>{title}</ClampedText>
        {record && status === 'ready' ? <View style={s.resultRow}>
          <ClampedText style={[s.summary, s.grow]} maxFontSizeMultiplier={1.3} maxLines={1}>{record.uid === stableId ? (recordCopy(lang, 'yours')) : holder?.name ?? '—'}</ClampedText>
          <Text style={s.summary} maxFontSizeMultiplier={1.3}>{recordTime(record.durationMs)}</Text>
        </View> : <ClampedText style={s.summary} maxFontSizeMultiplier={1.3} maxLines={1}>{summary}</ClampedText>}
      </View>
    </V2Pressable>
    <HybridSheetShell visible={open} onClose={() => setOpen(false)} closeLabel={recordCopy(lang, 'close')} material="liquid-glass-opaque" testID="spire-record-sheet">
      <View style={s.body}>
        <Text accessibilityRole="header" style={[s.heading, { color: p.text }]}>{title}</Text>
        <View style={s.stepControls}>
          {Array.from({ length: stepCount }, (_, i) => i + 1).map(n => <V2Pressable key={n}
            testID={`spire-record-step-${n}`} accessibilityRole="button" accessibilityLabel={`${recordCopy(lang, 'title')} ${n}`}
            accessibilityState={{ selected: n === step, disabled: busy || !!pending }} disabled={busy || !!pending}
            onPress={() => { setSelectedStep(n); setMessage(null); }}
            style={[s.stepButton, { backgroundColor: n === step ? p.cta : p.bg }]}>
            <Text style={{ color: n === step ? p.ctaText : p.text }}>{n}</Text>
          </V2Pressable>)}
        </View>
        <Text style={[s.copy, { color: p.text }]}>{summary}</Text>
        {record ? <Text style={[s.copy, { color: p.text }]}>{recordCopy(lang, 'tenOfTen')}</Text> : null}
        <Text style={[s.copy, { color: p.textSecondary }]}>{recordCopy(lang, 'yourBest') + ' '}{personal ? recordTime(personal.durationMs) : '—'}</Text>
        <Text style={[s.copy, { color: p.textSecondary }]}>{recordCopy(lang, 'rules')}</Text>
        <Text style={[s.copy, { color: p.textSecondary }]}>{recordCopy(lang, 'timerNote')}</Text>
        {message ? <Text accessibilityLiveRegion="polite" style={[s.copy, { color: p.text }]}>{message}</Text> : null}
        <V2Pressable testID="spire-record-start" accessibilityRole="button" disabled={busy || loading || status !== 'ready'}
          onPress={() => { if (pending) void save(pending); else void start(); }} style={[s.button, { backgroundColor: p.cta, opacity: busy || loading || status !== 'ready' ? 0.5 : 1 }]}>
          <Text style={{ color: p.ctaText, fontWeight: '700' }}>{busy ? '…' : pending ? (recordCopy(lang, 'save')) : (recordCopy(lang, 'try'))}</Text>
        </V2Pressable>
        {status === 'unavailable' ? <V2Pressable accessibilityRole="button" onPress={() => void refresh()} style={s.button}><Text style={{ color: p.text }}>{recordCopy(lang, 'refresh')}</Text></V2Pressable> : null}
      </View>
    </HybridSheetShell>
    {attempt && room ? <SpireRecordAttempt lang={lang} studyTarget={room.lang} attempt={attempt}
      onClose={() => { setAttempt(null); setOpen(true); }} onFinish={(answers, durationMs) => {
        const value = { attempt, answers, durationMs }; setAttempt(null); setOpen(true); void save(value);
      }} /> : null}
  </>;
}
const s = StyleSheet.create({
  stepControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepButton: { minWidth: 48, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  card: { height: 58, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 18, backgroundColor: colorWithAlpha(SPIRE_SCENE_INK.text, 0.06) },
  grow: { flex: 1, minWidth: 0 }, resultRow: { flexDirection: 'row', gap: 4 }, label: { color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  summary: { color: SPIRE_SCENE_INK.text, fontSize: 12, lineHeight: 18 }, body: { gap: 12, paddingVertical: 12 },
  heading: { fontSize: 22, fontWeight: '700' }, copy: { fontSize: 16, lineHeight: 22 },
  button: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
