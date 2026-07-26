// зачем: RN-порт source/src/surfaces/modes2/VoiceActivityShell.tsx (541 строка) —
// единый слой захвата/восстановления для всех речевых режимов (SB-05…SB-08).
// Визуальная машина состояний и все тексты — дословно из Kimi. ОТЛИЧИЕ от поставки:
// у Kimi микрофон симулирован (simulated: true), а владелец выбрал НАСТОЯЩИЙ —
// поэтому состояния recording/evaluating/вердикт питает useVoiceCapture
// (распознавание на устройстве). Вердикт честный: слова и их порядок, не акцент.
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import TapScale from '../../TapScale';
import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import { Chip } from './components';
import { useLab, type LabIntentEvent } from './LabState';
import { GraphemeText, IntentButton } from './primitives';
import {
  C,
  LEADING,
  RADIUS,
  SPACE,
  STATE_COLORS,
  STATE_META,
  TEXT,
  WEIGHT,
  withAlpha,
  type CanonicalState,
} from './tokens';
import type { VoiceCaptureStatus } from './use_voice_capture';

/** Машина речевых состояний (docs/v2/04 §Unified Voice Activity Shell). */
export type VoiceMachineState =
  | 'idle'
  | 'permission_explanation'
  | 'ready'
  | 'reference_playing'
  | 'recording'
  | 'evaluating'
  | 'PASS_CONFIDENT'
  | 'NEEDS_WORK_CONFIDENT'
  | 'UNCERTAIN'
  | 'INVALID_AUDIO_OR_SYSTEM'
  | 'offline';

export interface VoiceConditions {
  readonly online: boolean;
  readonly permission: 'granted' | 'denied' | 'undetermined';
  readonly signal: 'playing' | 'paused' | 'none';
  readonly result: 'none' | 'correct' | 'incorrect';
}

/**
 * Отображение шести канонических состояний + условий на речевую машину.
 * Дословно из resolveVoiceState() Kimi, плюс живой статус захвата: пока идёт
 * реальная запись/оценка, они имеют приоритет над лабораторным состоянием.
 */
export function resolveVoiceState(
  state: CanonicalState,
  c: VoiceConditions,
  capture?: VoiceCaptureStatus,
): VoiceMachineState {
  if (capture === 'permission_denied') return 'permission_explanation';
  if (capture === 'listening') return 'recording';
  if (capture === 'evaluating') return 'evaluating';
  if (state === 'prompt') return c.permission === 'denied' ? 'permission_explanation' : 'ready';
  if (state === 'active') return c.signal === 'playing' ? 'reference_playing' : 'recording';
  if (state === 'processing') return 'evaluating';
  if (state === 'success') return 'PASS_CONFIDENT';
  if (state === 'needs_work') return 'NEEDS_WORK_CONFIDENT';
  if (!c.online) return 'offline';
  if (c.permission === 'denied') return 'permission_explanation';
  return c.result === 'incorrect' ? 'INVALID_AUDIO_OR_SYSTEM' : 'UNCERTAIN';
}

/** Канонические тексты оболочки (docs/v2/04, обращение на «ты»). */
export const VOICE_COPY = {
  ready: 'Когда будешь готов, начни',
  micStart: 'Начать запись',
  micStop: 'Остановить запись',
  recording: 'Слушаю…',
  processing: 'Проверяем попытку…',
  qualityCheck: 'Проверяем качество записи…',
  uncertain: 'Мы не уверены из-за шума. Эта попытка не повлияет на звёзды',
  invalid: 'Запись не получилась. Проверь микрофон или выбери другой способ',
  offline: 'Сейчас нет сети. Можно продолжить локальное задание или вернуться позже',
  referencePlaying: 'Слушай эталон — запись начнётся после',
  freeRetry: 'Повтор бесплатный',
  supportRoute: 'Продолжить с поддержкой',
  offlineLocal: 'Продолжить локальное задание',
  offlineLater: 'Вернуться позже',
  micUnavailable: 'Микрофон недоступен на этом устройстве',
  amplitudeOnly: 'Индикатор показывает только громкость записи, не правильность',
} as const;

export interface VoiceCopyBlock {
  readonly instructionLabel: string;
  readonly timerDisplay: string;
  readonly routeLabel: string;
  readonly evidenceLabel: string;
  readonly passTitle: string;
  readonly passNote: string;
  readonly needsWorkHint: string;
  readonly retryScopeLabel: string;
  readonly attemptsDisplay: string;
  readonly uncertainNote: string;
  readonly invalidNote: string;
  readonly offlineNote: string;
}

export interface VoicePermissionCopy {
  readonly title: string;
  readonly body: string;
  readonly settingsLabel: string;
  readonly noMicLabel: string;
  readonly backLabel: string;
}

export interface VoiceConsentCopy {
  readonly title: string;
  readonly body: string;
  readonly acceptLabel: string;
  readonly declineLabel: string;
}

export interface VoiceShellVM {
  readonly surfaceId: string;
  readonly title: string;
  readonly goalLabel: string;
  readonly copy: { primaryActions: Record<string, string>; statusMessages: Record<string, string> };
  readonly voice: VoiceCopyBlock;
  readonly permission: VoicePermissionCopy;
}

export interface VoiceActivityShellProps {
  readonly surfaceId: string;
  readonly vm: VoiceShellVM;
  readonly state: CanonicalState;
  readonly conditions: VoiceConditions;
  readonly onIntent: (event: LabIntentEvent) => void;
  /** ReferenceCard — слово/фраза/цель/сцена, даёт режим. */
  readonly reference?: React.ReactNode;
  /** Зона ответа — подтверждение транскрипта, строки сравнения, панель ввода. */
  readonly children?: React.ReactNode;
  readonly consent?: VoiceConsentCopy;
  readonly typedFallbackLabel?: string;
  /* --- живой захват (наше отличие от симуляции Kimi) --- */
  readonly captureStatus?: VoiceCaptureStatus;
  /** Живой текст по ходу речи — мгновенная обратная связь до вердикта. */
  readonly capturePartial?: string;
  readonly onMicStart?: () => void;
  readonly onMicStop?: () => void;
}

export const VoiceActivityShell = memo(function VoiceActivityShell(props: VoiceActivityShellProps) {
  const {
    surfaceId,
    vm,
    state,
    conditions,
    onIntent,
    reference,
    children,
    consent,
    typedFallbackLabel,
    captureStatus,
    capturePartial,
    onMicStart,
    onMicStop,
  } = props;

  const meta = STATE_META[state];
  const voice = resolveVoiceState(state, conditions, captureStatus);
  const stateColor = STATE_COLORS[state];

  const isCapture =
    voice === 'ready' || voice === 'recording' || voice === 'reference_playing' || voice === 'evaluating';
  const recording = voice === 'recording';
  const referencePlaying = voice === 'reference_playing';
  const micUnavailable = captureStatus === 'unavailable';
  const micDisabled = (voice !== 'ready' && voice !== 'recording') || micUnavailable;

  const statusMessage =
    micUnavailable
      ? VOICE_COPY.micUnavailable
      : voice === 'offline'
        ? VOICE_COPY.offline
        : voice === 'permission_explanation'
          ? vm.permission.title
          : voice === 'UNCERTAIN'
            ? VOICE_COPY.uncertain
            : voice === 'INVALID_AUDIO_OR_SYSTEM'
              ? VOICE_COPY.invalid
              : (vm.copy.statusMessages[state] ?? '');

  const emitMic = useCallback(() => {
    onIntent({ surfaceId, intent: recording ? 'voice.mic.stop' : 'voice.mic.start', payload: { state, voice } });
    // зачем: отклик мгновенный — запись стартует/стопается локально, без ожиданий
    if (recording) onMicStop?.();
    else onMicStart?.();
  }, [onIntent, surfaceId, recording, state, voice, onMicStart, onMicStop]);

  return (
    <View style={s.shell}>
      <View style={s.header}>
        <View style={[s.badge, { backgroundColor: stateColor.bg, borderColor: stateColor.border }]}>{/* guard-ok: state-бейдж Kimi */}
          <Text style={[s.badgeText, { color: stateColor.fg }]}>{meta.label.toUpperCase()}</Text>
        </View>
        <View style={s.headings}>
          <GraphemeText text={vm.title} maxGraphemes={60} style={s.title} />
          <GraphemeText text={vm.goalLabel} maxGraphemes={80} style={s.goal} />
        </View>
      </View>

      {reference ? <View style={s.referenceLane}>{reference}</View> : null}

      <ScrollView
        // guard-ok: короткая фиксированная зона одной попытки, виртуализация избыточна
        style={s.contentScroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.capture}>
          <Waveform active={recording} />
          <View style={s.captureMeta}>
            <Text style={s.timer}>{vm.voice.timerDisplay}</Text>
            <GraphemeText text={vm.voice.routeLabel} maxGraphemes={40} style={s.route} />
          </View>
          <Text style={s.captureHint}>
            {recording
              ? VOICE_COPY.recording
              : referencePlaying
                ? VOICE_COPY.referencePlaying
                : voice === 'evaluating'
                  ? VOICE_COPY.qualityCheck
                  : VOICE_COPY.ready}
          </Text>
          {/* зачем: живой текст по ходу речи — ученик сразу видит, что его слышат */}
          {recording && capturePartial ? (
            <GraphemeText text={capturePartial} maxGraphemes={120} style={s.partial} />
          ) : null}
          {!conditions.online ? <Chip text="Нет сети" tone="warn" /> : null}
        </View>

        {consent && voice === 'ready' ? (
          <View style={s.consent} accessibilityLabel={consent.title}>
            <GraphemeText text={consent.title} maxGraphemes={60} style={s.consentTitle} />
            <GraphemeText text={consent.body} maxGraphemes={260} style={s.consentBody} />
            <View style={s.consentActions}>
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.consent.accept"
                payload={{}}
                onIntent={onIntent}
                variant="secondary"
                accessibilityLabel={consent.acceptLabel}
              >
                {consent.acceptLabel}
              </IntentButton>
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.consent.decline"
                payload={{}}
                onIntent={onIntent}
                variant="ghost"
                accessibilityLabel={consent.declineLabel}
              >
                {consent.declineLabel}
              </IntentButton>
            </View>
          </View>
        ) : null}

        {children}
      </ScrollView>

      <View style={[s.statusLane, { backgroundColor: stateColor.bg }]}>
        <View style={s.statusRow}>
          <View style={[s.statusDot, { backgroundColor: stateColor.fg }]} />
          <GraphemeText
            text={statusMessage}
            maxGraphemes={160}
            style={[s.statusMessage, { color: stateColor.fg }]}
          />
        </View>
        {state === 'processing' || voice === 'evaluating' ? <InlineProgress color={stateColor.fg} /> : null}

        {voice === 'PASS_CONFIDENT' ? (
          <View style={s.verdict}>
            <GraphemeText text={`✓ ${vm.voice.passTitle}`} maxGraphemes={80} style={s.verdictTitle} />
            <GraphemeText text={vm.voice.passNote} maxGraphemes={180} style={s.verdictNote} />
            <Chip text={vm.voice.evidenceLabel} tone="ok" />
          </View>
        ) : null}

        {voice === 'NEEDS_WORK_CONFIDENT' ? (
          <View style={s.verdict}>
            <GraphemeText text={`↺ ${vm.voice.needsWorkHint}`} maxGraphemes={140} style={s.verdictTitle} />
            <View style={s.chipsRow}>
              <Chip text={vm.voice.retryScopeLabel} tone="info" />
              <Chip text={vm.voice.attemptsDisplay} tone="muted" />
            </View>
          </View>
        ) : null}

        {voice === 'UNCERTAIN' ? (
          <View style={s.verdict}>
            <GraphemeText text={vm.voice.uncertainNote} maxGraphemes={120} style={s.verdictNote} />
            <Chip text={VOICE_COPY.freeRetry} tone="info" />
          </View>
        ) : null}

        {voice === 'INVALID_AUDIO_OR_SYSTEM' ? (
          <View style={s.verdict}>
            <GraphemeText text={vm.voice.invalidNote} maxGraphemes={140} style={s.verdictNote} />
            <Chip text={VOICE_COPY.freeRetry} tone="info" />
          </View>
        ) : null}

        {voice === 'offline' ? (
          <View style={s.verdict}>
            <GraphemeText text={vm.voice.offlineNote} maxGraphemes={140} style={s.verdictNote} />
          </View>
        ) : null}

        {voice === 'permission_explanation' ? (
          <View style={s.permPanel} accessibilityRole="alert">
            <GraphemeText text={vm.permission.title} maxGraphemes={60} style={s.permTitle} />
            <GraphemeText text={vm.permission.body} maxGraphemes={220} style={s.permBody} />
            <View style={s.permActions}>
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.permission.open_settings"
                payload={{}}
                onIntent={onIntent}
                variant="secondary"
                accessibilityLabel={vm.permission.settingsLabel}
              >
                {vm.permission.settingsLabel}
              </IntentButton>
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.permission.continue_without_mic"
                payload={{}}
                onIntent={onIntent}
                variant="ghost"
                accessibilityLabel={vm.permission.noMicLabel}
              >
                {vm.permission.noMicLabel}
              </IntentButton>
            </View>
          </View>
        ) : null}
      </View>

      <View style={s.dock}>
        {isCapture ? (
          <>
            <TapScale
              onPress={emitMic}
              disabled={micDisabled}
              withHaptic
              scaleTo={0.97}
              accessibilityLabel={recording ? VOICE_COPY.micStop : VOICE_COPY.micStart}
              accessibilityState={{ disabled: micDisabled, selected: recording }}
              style={[s.mic, recording ? s.micRecording : null, micDisabled ? s.micDisabled : null]}
              testID={`kimi-mic-${surfaceId}`}
            >
              {recording ? <StopGlyph /> : <MicGlyph />}
              <Text style={[s.micLabel, recording ? s.micLabelRecording : null]}>
                {recording ? VOICE_COPY.recording : VOICE_COPY.micStart}
              </Text>
            </TapScale>
            {typedFallbackLabel && voice === 'ready' ? (
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.typed.open"
                payload={{}}
                onIntent={onIntent}
                variant="ghost"
                accessibilityLabel={typedFallbackLabel}
              >
                {typedFallbackLabel}
              </IntentButton>
            ) : null}
          </>
        ) : null}

        {voice === 'PASS_CONFIDENT' ? (
          <IntentButton
            surfaceId={surfaceId}
            intent="activity.continue"
            payload={{ state }}
            onIntent={onIntent}
            variant="primary"
            style={s.dockPrimary}
            accessibilityLabel={vm.copy.primaryActions.success}
          >
            {vm.copy.primaryActions.success}
          </IntentButton>
        ) : null}

        {voice === 'NEEDS_WORK_CONFIDENT' ? (
          <>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.retry.focused"
              payload={{ scope: vm.voice.retryScopeLabel }}
              onIntent={onIntent}
              onPress={onMicStart}
              variant="primary"
              style={s.dockPrimary}
              accessibilityLabel={vm.copy.primaryActions.needs_work}
            >
              {vm.copy.primaryActions.needs_work}
            </IntentButton>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.retry.support"
              payload={{}}
              onIntent={onIntent}
              variant="ghost"
              accessibilityLabel={VOICE_COPY.supportRoute}
            >
              {VOICE_COPY.supportRoute}
            </IntentButton>
          </>
        ) : null}

        {voice === 'UNCERTAIN' || voice === 'INVALID_AUDIO_OR_SYSTEM' ? (
          <>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.retry.free"
              payload={{ voice }}
              onIntent={onIntent}
              onPress={onMicStart}
              variant="primary"
              style={s.dockPrimary}
              accessibilityLabel={vm.copy.primaryActions.recovery}
            >
              {vm.copy.primaryActions.recovery}
            </IntentButton>
            {typedFallbackLabel ? (
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.typed.open"
                payload={{}}
                onIntent={onIntent}
                variant="ghost"
                accessibilityLabel={typedFallbackLabel}
              >
                {typedFallbackLabel}
              </IntentButton>
            ) : null}
          </>
        ) : null}

        {voice === 'offline' ? (
          <>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.offline.continue_local"
              payload={{}}
              onIntent={onIntent}
              variant="primary"
              style={s.dockPrimary}
              accessibilityLabel={VOICE_COPY.offlineLocal}
            >
              {VOICE_COPY.offlineLocal}
            </IntentButton>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.offline.later"
              payload={{}}
              onIntent={onIntent}
              variant="ghost"
              accessibilityLabel={VOICE_COPY.offlineLater}
            >
              {VOICE_COPY.offlineLater}
            </IntentButton>
          </>
        ) : null}

        {voice === 'permission_explanation' ? (
          <View style={[s.mic, s.micDisabled]} accessibilityLabel={`${VOICE_COPY.micStart} — недоступно без разрешения`}>
            <MicGlyph />
            <Text style={s.micLabel}>{VOICE_COPY.micStart}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

/** Волна амплитуды. Показывает ТОЛЬКО громкость, никогда не правильность. */
const Waveform = memo(function Waveform({ active }: { readonly active: boolean }) {
  return (
    <View style={s.wave} accessibilityLabel={VOICE_COPY.amplitudeOnly}>
      {WAVE_BARS.map((bar) => (
        <WaveBar key={bar.id} active={active} height={bar.height} delay={bar.delay} />
      ))}
    </View>
  );
});

const WAVE_BARS = [
  { id: 'w1', height: 9, delay: 0 },
  { id: 'w2', height: 18, delay: 120 },
  { id: 'w3', height: 28, delay: 240 },
  { id: 'w4', height: 15, delay: 360 },
  { id: 'w5', height: 10, delay: 480 },
] as const;

const WaveBar = memo(function WaveBar(props: {
  readonly active: boolean;
  readonly height: number;
  readonly delay: number;
}) {
  const { active, height, delay } = props;
  const value = useRef(new Animated.Value(1)).current;
  // зачем: perf-контракт репо — бесконечная анимация обязана глохнуть на фоне
  const runtimeActive = useRuntimeActive();

  useEffect(() => {
    if (!active || !runtimeActive) {
      value.stopAnimation();
      value.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: 450, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.55, duration: 450, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      ]),
    );
    value.setValue(0.55);
    loop.start();
    return () => loop.stop();
  }, [active, runtimeActive, value, delay]);

  return (
    <Animated.View
      style={[
        s.waveBar,
        {
          height,
          backgroundColor: active ? C.accentEdge : C.fgSecondary,
          transform: [{ scaleY: value }],
        },
      ]}
    />
  );
});

const InlineProgress = memo(function InlineProgress({ color }: { readonly color: string }) {
  const slide = useRef(new Animated.Value(0)).current;
  const runtimeActive = useRuntimeActive();

  useEffect(() => {
    if (!runtimeActive) {
      slide.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(slide, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [runtimeActive, slide]);

  return (
    <View style={[s.progressTrack, { backgroundColor: withAlpha('#FFFFFF', 0.18) }]}>
      <Animated.View
        style={[
          s.progressFill,
          {
            backgroundColor: color,
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-110%', '280%'] as unknown as number[],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
});

/** Иконки — векторные, никогда эмодзи-как-кнопка (правило Kimi). */
const MicGlyph = memo(function MicGlyph() {
  return (
    <Svg viewBox="0 0 24 24" width={28} height={28}>
      <Rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" color={C.accentOnPrimary} />
      <Path
        d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"
        stroke={C.accentOnPrimary}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
});

const StopGlyph = memo(function StopGlyph() {
  return (
    <Svg viewBox="0 0 24 24" width={26} height={26}>
      <Rect x="6" y="6" width="12" height="12" rx="2.5" fill={C.wrong} />
    </Svg>
  );
});

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.bgCanvas },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.s3,
    paddingTop: SPACE.s4,
    paddingBottom: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    // guard-ok: односторонний разделитель полос каркаса Kimi
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderDefault,
  },
  badge: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5, // guard-ok: state-бейдж дизайн-системы Kimi
  },
  badgeText: { fontSize: TEXT.xs, fontWeight: WEIGHT.bold, letterSpacing: 0.6 },
  headings: { flex: 1, minWidth: 0 },
  title: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.fgPrimary, lineHeight: TEXT.xl * LEADING.tight },
  goal: { fontSize: TEXT.sm, color: C.fgSecondary, marginTop: SPACE.s1 },
  referenceLane: { paddingVertical: SPACE.s2, paddingHorizontal: SPACE.s4 },
  contentScroll: { flex: 1 },
  content: { paddingVertical: SPACE.s4, paddingHorizontal: SPACE.s4, gap: SPACE.s3 },
  capture: {
    alignItems: 'center',
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  wave: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 40 },
  waveBar: { width: 6, borderRadius: RADIUS.pill },
  captureMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s3, flexWrap: 'wrap', justifyContent: 'center' },
  timer: { fontSize: TEXT.sm, color: C.fgPrimary, letterSpacing: 0.5 },
  route: { fontSize: TEXT.xs, color: C.fgSecondary },
  captureHint: { fontSize: TEXT.sm, color: C.fgSecondary, textAlign: 'center' },
  partial: { fontSize: TEXT.md, color: C.fgPrimary, textAlign: 'center', lineHeight: TEXT.md * LEADING.snug },
  consent: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSubtle,
  },
  consentTitle: { fontSize: TEXT.md, fontWeight: WEIGHT.bold, color: C.fgPrimary },
  consentBody: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  consentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  statusLane: {
    minHeight: 96,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    // guard-ok: односторонний разделитель полосы feedback
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderDefault,
    gap: SPACE.s2,
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s2 },
  statusDot: { width: 8, height: 8, marginTop: 6, borderRadius: RADIUS.pill },
  statusMessage: { flex: 1, fontSize: TEXT.md, lineHeight: TEXT.md * LEADING.snug },
  progressTrack: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' },
  progressFill: { height: '100%', width: '40%', borderRadius: RADIUS.pill },
  verdict: { alignItems: 'flex-start', gap: SPACE.s1 },
  verdictTitle: { fontWeight: WEIGHT.bold, fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  verdictNote: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  permPanel: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: '#2A1B2B',
    alignItems: 'flex-start',
  },
  permTitle: { fontWeight: WEIGHT.bold, fontSize: TEXT.md, color: C.wrong },
  permBody: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  permActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  dock: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    // guard-ok: односторонний разделитель футера
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderDefault,
    backgroundColor: C.bgSurface,
  },
  mic: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.pill,
    backgroundColor: C.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  micRecording: { backgroundColor: C.bgSurface },
  micDisabled: { opacity: 0.55 },
  micLabel: { fontSize: TEXT.xs, fontWeight: WEIGHT.semibold, color: C.accentOnPrimary, lineHeight: TEXT.xs * 1.1 },
  micLabelRecording: { color: C.wrong },
  dockPrimary: { flex: 1 },
});
