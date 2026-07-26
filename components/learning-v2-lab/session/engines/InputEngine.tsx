// зачем: RN-порт source/src/session/engines/InputEngine.tsx — один движок, три
// уровня ввода: cloze (один пропуск) · full (перевод без банка) · dictation
// (написать услышанное). «Проверить» открывается, когда поле не пустое.
// Ступень «показать ответ» показывает ответ фикстуры, затем очищает поле.
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import TapScale from '../../../TapScale';
import { useAudio } from '../../../../hooks/use-audio';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT } from '../../kimi/tokens';
import type { InputCard } from '../contracts';
import type { EngineProps } from '../engine_common';
import { useShake } from '../FeedbackLayer';

export const InputEngine = memo(function InputEngine(
  props: { card: InputCard; onAnswer: (value: string) => void } & EngineProps,
) {
  const { card, locked, resolved, showAnswer, resetEpoch, shakeEpoch, onReady, onIntent, onAnswer } = props;
  const [value, setValue] = useState('');
  const [playing, setPlaying] = useState<null | 'normal' | 'slow'>(null);
  const shaking = useShake(shakeEpoch);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak } = useAudio();

  useEffect(() => {
    setValue('');
    setPlaying(null);
  }, [resetEpoch, card.id]);

  // зачем: поднимаем И готовность, И сам текст — раннер обязан знать, ЧТО
  // ввели, иначе проверить ответ нечем (был баг: любой ввод = неверно)
  useEffect(() => {
    onReady(value.trim().length > 0);
    onAnswer(value);
  }, [value, onReady, onAnswer]);
  useEffect(
    () => () => {
      if (playTimer.current) clearTimeout(playTimer.current);
    },
    [],
  );

  const play = (slow: boolean) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    setPlaying(slow ? 'slow' : 'normal');
    onIntent('input.play_audio', { cardId: card.id, slow });
    // зачем: диктант без звука бессмыслен — озвучиваем через общий движок
    if (card.audio?.label) speak(card.audio.label, slow ? 0.6 : undefined, { language: 'en-US' });
    playTimer.current = setTimeout(() => setPlaying(null), slow ? 1500 : 950);
  };

  const [beforeGap, afterGap] =
    card.variant === 'cloze' && card.sentence ? card.sentence.split('___') : ['', ''];

  return (
    <View style={s.wrap}>
      {card.variant === 'dictation' && card.audio ? (
        <View style={s.audio}>
          <TapScale
            onPress={() => play(false)}
            disabled={locked}
            withHaptic
            scaleTo={0.94}
            accessibilityLabel={card.audio.playLabel}
            style={[s.audioPlay, playing ? s.audioPlayActive : null]}
          >
            <Text style={s.audioPlayGlyph}>{playing ? '⏸' : '▶'}</Text>
          </TapScale>
          <TapScale
            onPress={() => play(true)}
            disabled={locked}
            withHaptic
            scaleTo={0.96}
            accessibilityLabel={card.audio.slowLabel}
            style={[s.audioSlow, playing === 'slow' ? s.audioSlowActive : null]}
          >
            <Text style={s.audioSlowText}>{card.audio.slowLabel}</Text>
          </TapScale>
        </View>
      ) : null}

      {card.variant === 'full' && card.promptRu ? (
        <Text style={s.prompt}>{card.promptRu}</Text>
      ) : null}

      <View
        style={[
          s.box,
          resolved === 'correct' ? s.boxCorrect : null,
          resolved === 'wrong' ? s.boxWrong : null,
          shaking ? s.boxShake : null,
        ]}
      >
        {card.variant === 'cloze' ? (
          <Text style={s.sentence}>
            {beforeGap}
            <Text style={[s.gap, value.trim().length > 0 || showAnswer ? s.gapFilled : null]}>
              {showAnswer ? card.answer : value.trim().length > 0 ? value : '_____'}
            </Text>
            {afterGap}
          </Text>
        ) : null}
        {showAnswer && card.variant !== 'cloze' ? (
          <Text style={s.revealed}>{card.answer}</Text>
        ) : null}
        <TextInput
          style={s.field}
          value={showAnswer ? '' : value}
          placeholder={card.placeholder}
          placeholderTextColor={C.fgSecondary}
          editable={!locked && !showAnswer}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel={card.instruction}
          onChangeText={setValue}
        />
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s4 },
  audio: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s3 },
  audioPlay: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: C.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayActive: { backgroundColor: C.accentPrimaryActive },
  audioPlayGlyph: { fontSize: 24, color: C.accentOnPrimary },
  audioSlow: {
    minHeight: TOUCH_MIN,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
    justifyContent: 'center',
  },
  audioSlowActive: { backgroundColor: C.accentSoft },
  audioSlowText: { fontSize: TEXT.sm, color: C.fgPrimary, fontWeight: WEIGHT.semibold },
  prompt: {
    fontSize: TEXT.xl,
    fontWeight: WEIGHT.semibold,
    color: C.fgPrimary,
    lineHeight: TEXT.xl * LEADING.snug,
  },
  box: {
    gap: SPACE.s3,
    padding: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  boxCorrect: { backgroundColor: '#182B31' },
  boxWrong: { backgroundColor: '#2A1B2B' },
  boxShake: { transform: [{ translateX: 6 }] },
  sentence: {
    fontSize: TEXT.xxl,
    fontWeight: WEIGHT.bold,
    color: C.fgPrimary,
    lineHeight: TEXT.xxl * LEADING.snug,
  },
  gap: { color: C.accentPrimary },
  gapFilled: { color: C.fgPrimary },
  revealed: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.correct },
  field: {
    minHeight: TOUCH_MIN,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSubtle,
    color: C.fgPrimary,
    fontSize: TEXT.lg,
  },
});
