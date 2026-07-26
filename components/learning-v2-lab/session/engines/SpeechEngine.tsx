// зачем: RN-порт source/src/session/engines/SpeechEngine.tsx — повтори за
// образцом. Тап по большому микрофону → запись (пульсирующее кольцо + волна) →
// короткая проверка → пословный показ распознавания. Честная формулировка:
// «Так услышал микрофон» — никогда не оценка акцента. «Сейчас не могу говорить»
// пропускает без штрафа.
//
// ОТЛИЧИЕ от поставки: микрофон НАСТОЯЩИЙ (решение владельца) — распознавание
// на устройстве через useVoiceCapture; пословная подсветка идёт по реально
// услышанному, а не по запечённому списку.
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import TapScale from '../../../TapScale';
import { useAudio } from '../../../../hooks/use-audio';
import { useRuntimeActive } from '../../../../hooks/use_runtime_active';
import { GraphemeText } from '../../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from '../../kimi/tokens';
import { useVoiceCapture } from '../../kimi/use_voice_capture';
import type { SpeechCard } from '../contracts';
import type { EngineProps } from '../engine_common';

export const SpeechEngine = memo(function SpeechEngine(
  props: { card: SpeechCard; onSkip: () => void; onAnswer: (ok: boolean) => void } & EngineProps,
) {
  const { card, locked, resolved, showAnswer, resetEpoch, onReady, onSkip, onIntent, onAnswer } = props;
  const capture = useVoiceCapture({ targetText: card.phrase.en });
  const { speak } = useAudio();

  useEffect(() => {
    capture.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetEpoch, card.id]);

  const captured = capture.result !== null;
  // зачем: раннер должен знать исход попытки — иначе речь всегда считалась
  // неверной. Засчитываем по словам и порядку (как обещает карточка), с
  // допуском: узнали хотя бы 2/3 слов — попытка принята.
  useEffect(() => {
    onReady(captured);
    if (capture.result) onAnswer(capture.result.allMatched || capture.result.ratio >= 0.67);
  }, [captured, capture.result, onReady, onAnswer]);

  const recording = capture.status === 'listening';
  const evaluating = capture.status === 'evaluating';
  const blocked = capture.status === 'permission_denied' || capture.status === 'unavailable';

  // Пословный показ: слова цели, подсвеченные по фактически услышанному.
  const words = useMemo(
    () =>
      card.wordFeedback.map((entry, index) => ({
        word: entry.word,
        // До попытки показываем нейтрально; после — по реальному распознаванию.
        heard: captured ? (capture.matchedFlags[index] ?? false) : false,
      })),
    [card.wordFeedback, captured, capture.matchedFlags],
  );

  const toggle = () => {
    if (recording) {
      onIntent('speech.mic_stop', { cardId: card.id });
      capture.stop();
      return;
    }
    if (evaluating) return;
    onIntent('speech.mic_start', { cardId: card.id });
    void capture.start();
  };

  const status = recording
    ? 'Слушаю…'
    : evaluating
      ? 'Сверяю с эталоном…'
      : blocked
        ? 'Микрофон недоступен — можно пропустить'
        : captured
          ? card.recognitionNote
          : card.micLabel;

  return (
    <View style={s.wrap}>
      {/* зачем: перед тем как повторять, эталон нужно услышать — тап по фразе
          её проговаривает (озвучка уважает настройки пользователя) */}
      <TapScale
        onPress={() => speak(card.phrase.en, undefined, { language: 'en-US' })}
        withHaptic
        scaleTo={0.98}
        accessibilityLabel={`Прослушать: ${card.phrase.en}`}
        style={s.phraseBlock}
      >
        <GraphemeText text={card.phrase.en} maxGraphemes={80} style={s.phrase} />
        <GraphemeText text={card.phrase.ru} maxGraphemes={80} style={s.phraseRu} />
        <Text style={s.listenHint}>▶ Прослушать</Text>
      </TapScale>

      <View style={s.stage}>
        {recording ? <PulseRing /> : null}
        <TapScale
          onPress={toggle}
          disabled={locked || evaluating || blocked}
          withHaptic
          scaleTo={0.95}
          accessibilityLabel={recording ? 'Остановить' : card.micLabel}
          accessibilityState={{ selected: recording, disabled: locked || blocked }}
          style={[s.mic, recording ? s.micRecording : null, captured ? s.micCaptured : null]}
          testID="sess-speech-mic"
        >
          <Text style={[s.micGlyph, recording ? s.micGlyphRecording : null]}>{recording ? '⏹' : '🎙'}</Text>
        </TapScale>
        {recording ? <Waveform /> : null}
      </View>

      <Text style={s.status}>{status}</Text>

      {/* зачем: живой текст по ходу речи — видно, что микрофон слышит */}
      {recording && capture.partial ? (
        <GraphemeText text={capture.partial} maxGraphemes={120} style={s.partial} />
      ) : null}

      {captured ? (
        <View style={s.words} accessibilityLabel="Распознанные слова">
          {words.map((entry, index) => {
            const good = showAnswer || resolved === 'correct' || entry.heard;
            return (
              <Text key={`${entry.word}-${index}`} style={[s.word, good ? s.wordGood : s.wordWeak]}>
                {entry.word}
              </Text>
            );
          })}
        </View>
      ) : null}

      <TapScale
        onPress={() => {
          onIntent('card.skip_speech', { cardId: card.id });
          onSkip();
        }}
        disabled={locked}
        withHaptic
        scaleTo={0.97}
        accessibilityLabel={card.skipLabel}
        style={s.skip}
      >
        <Text style={s.skipText}>{card.skipLabel}</Text>
      </TapScale>
    </View>
  );
});

/** Пульсирующее кольцо записи — transform-only, глохнет на фоне. */
const PulseRing = memo(function PulseRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const runtimeActive = useRuntimeActive();

  useEffect(() => {
    if (!runtimeActive) {
      scale.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [runtimeActive, scale]);

  return <Animated.View style={[s.ring, { transform: [{ scale }] }]} pointerEvents="none" />;
});

const WAVE_BARS = [
  { id: 'b1', delay: 0 },
  { id: 'b2', delay: 90 },
  { id: 'b3', delay: 180 },
  { id: 'b4', delay: 270 },
  { id: 'b5', delay: 360 },
  { id: 'b6', delay: 450 },
] as const;

const Waveform = memo(function Waveform() {
  return (
    <View style={s.wave} pointerEvents="none">
      {WAVE_BARS.map((bar) => (
        <WaveBar key={bar.id} delay={bar.delay} />
      ))}
    </View>
  );
});

const WaveBar = memo(function WaveBar({ delay }: { readonly delay: number }) {
  const value = useRef(new Animated.Value(0.4)).current;
  const runtimeActive = useRuntimeActive();

  useEffect(() => {
    if (!runtimeActive) {
      value.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.4, duration: 320, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [runtimeActive, value, delay]);

  return <Animated.View style={[s.waveBar, { transform: [{ scaleY: value }] }]} />;
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s4, alignItems: 'center' },
  phraseBlock: { gap: SPACE.s1, alignItems: 'center' },
  phrase: {
    fontSize: TEXT.xxl,
    fontWeight: WEIGHT.bold,
    color: C.fgPrimary,
    textAlign: 'center',
    lineHeight: TEXT.xxl * LEADING.tight,
  },
  phraseRu: { fontSize: TEXT.md, color: C.fgSecondary, textAlign: 'center' },
  listenHint: { fontSize: TEXT.sm, color: C.accentPrimary, marginTop: SPACE.s1 },
  stage: { alignItems: 'center', justifyContent: 'center', height: 120 },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: RADIUS.pill,
    backgroundColor: C.accentSoft,
  },
  mic: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.pill,
    backgroundColor: C.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRecording: { backgroundColor: C.bgSurface },
  micCaptured: { backgroundColor: C.bgSubtle },
  micGlyph: { fontSize: 30 },
  micGlyphRecording: { color: C.wrong },
  wave: { position: 'absolute', bottom: 0, flexDirection: 'row', gap: 4, height: 20, alignItems: 'flex-end' },
  waveBar: { width: 4, height: 20, borderRadius: RADIUS.pill, backgroundColor: C.accentEdge },
  status: { fontSize: TEXT.sm, color: C.fgSecondary, textAlign: 'center' },
  partial: { fontSize: TEXT.md, color: C.fgPrimary, textAlign: 'center' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2, justifyContent: 'center' },
  word: {
    fontSize: TEXT.lg,
    fontWeight: WEIGHT.semibold,
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  wordGood: { color: C.correct, backgroundColor: '#182B31' },
  wordWeak: { color: C.gold, backgroundColor: '#2A2729' },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACE.s3 },
  skipText: { fontSize: TEXT.sm, color: C.fgSecondary, textDecorationLine: 'underline' },
});
