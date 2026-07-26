// зачем: RN-порт source/src/session/engines/ChoiceEngine.tsx — один вопрос,
// 2–4 БОЛЬШИЕ карточки. Варианты: context (сцена) · meaning (фраза → RU) ·
// audio (большой play, транскрипт скрыт до попытки) · contrast (выбор формы) ·
// transfer (та же семья фраз в новой сцене). Выбор — локальное состояние,
// вердикт приходит от раннера, подсветка — по correctOptionId фикстуры.
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import TapScale from '../../../TapScale';
import { GraphemeText } from '../../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT } from '../../kimi/tokens';
import type { ChoiceCard } from '../contracts';
import type { EngineProps } from '../engine_common';

export const ChoiceEngine = memo(function ChoiceEngine(props: { card: ChoiceCard } & EngineProps) {
  const { card, locked, resolved, showAnswer, resetEpoch, shakeEpoch, onReady, onIntent } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<null | 'normal' | 'slow'>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelectedId(null);
    setPlaying(null);
  }, [resetEpoch, card.id]);

  useEffect(() => onReady(selectedId !== null), [selectedId, onReady]);
  useEffect(
    () => () => {
      if (playTimer.current) clearTimeout(playTimer.current);
    },
    [],
  );

  const attempted = resolved !== null || resetEpoch > 0 || shakeEpoch > 0;
  const showTranscript = card.variant === 'audio' && attempted;

  const play = (slow: boolean) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    setPlaying(slow ? 'slow' : 'normal');
    onIntent('choice.play_audio', { cardId: card.id, slow });
    playTimer.current = setTimeout(() => setPlaying(null), slow ? 1500 : 950);
  };

  return (
    <View style={s.wrap}>
      {card.scene ? (
        <View style={s.scene}>
          <Text style={s.sceneEmoji}>{card.scene.emoji}</Text>
          <GraphemeText text={card.scene.caption} maxGraphemes={60} style={s.sceneCaption} />
        </View>
      ) : null}

      {card.variant === 'audio' && card.audio ? (
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

      {card.phrase ? (
        <View style={s.phraseBlock}>
          <GraphemeText text={card.phrase.en} maxGraphemes={80} style={s.phrase} />
          {card.phrase.ru ? (
            <GraphemeText text={card.phrase.ru} maxGraphemes={80} style={s.phraseRu} />
          ) : null}
        </View>
      ) : null}

      {card.variant === 'audio' && card.audio && showTranscript ? (
        <GraphemeText text={`${card.audio.label}.`} maxGraphemes={80} style={s.transcript} />
      ) : null}

      <View style={s.options} accessibilityLabel={card.instruction}>
        {card.options.map((option) => {
          const isSelected = selectedId === option.id;
          const isCorrect = option.id === card.correctOptionId;
          const reveal =
            resolved === 'correct' && isCorrect
              ? 'correct'
              : resolved === 'wrong' && isSelected && !isCorrect
                ? 'wrong'
                : showAnswer && isCorrect
                  ? 'answer'
                  : null;
          const dim = resolved !== null && !isCorrect && !isSelected;
          return (
            <TapScale
              key={option.id}
              onPress={() => {
                setSelectedId(option.id);
                onIntent('choice.select', { cardId: card.id, optionId: option.id });
              }}
              disabled={locked}
              // зачем: плитка ответа — вибрация, а не клик-звук (правило владельца)
              withHaptic
              scaleTo={0.98}
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected, disabled: locked }}
              style={[
                s.option,
                isSelected ? s.optionSelected : null,
                reveal === 'correct' || reveal === 'answer' ? s.optionCorrect : null,
                reveal === 'wrong' ? s.optionWrong : null,
                dim ? s.optionDim : null,
              ]}
              testID={`sess-option-${option.id}`}
            >
              <View style={s.optionRow}>
                {option.icon ? <Text style={s.optionIcon}>{option.icon}</Text> : null}
                <View style={s.optionTexts}>
                  <GraphemeText text={option.label} maxGraphemes={60} style={s.optionText} />
                  {option.sub ? (
                    <GraphemeText text={option.sub} maxGraphemes={50} style={s.optionSub} />
                  ) : null}
                </View>
                {reveal === 'correct' || reveal === 'answer' ? (
                  <Text style={s.optionMark}>✓</Text>
                ) : reveal === 'wrong' ? (
                  <Text style={[s.optionMark, s.optionMarkWrong]}>✕</Text>
                ) : null}
              </View>
            </TapScale>
          );
        })}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s4 },
  scene: {
    alignItems: 'center',
    gap: SPACE.s2,
    paddingVertical: SPACE.s4,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  sceneEmoji: { fontSize: 44 },
  sceneCaption: { fontSize: TEXT.sm, color: C.fgSecondary, textAlign: 'center' },
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
  phraseBlock: { gap: SPACE.s1 },
  phrase: {
    fontSize: TEXT.xxl,
    fontWeight: WEIGHT.bold,
    color: C.fgPrimary,
    lineHeight: TEXT.xxl * LEADING.tight,
  },
  phraseRu: { fontSize: TEXT.md, color: C.fgSecondary },
  transcript: { fontSize: TEXT.md, color: C.fgSecondary, fontStyle: 'italic' },
  options: { gap: SPACE.s3 },
  option: {
    minHeight: 68,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
    justifyContent: 'center',
  },
  optionSelected: { backgroundColor: C.accentSoft },
  optionCorrect: { backgroundColor: '#182B31' },
  optionWrong: { backgroundColor: '#2A1B2B' },
  optionDim: { opacity: 0.45 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s3 },
  optionIcon: { fontSize: 26 },
  optionTexts: { flex: 1, gap: 2 },
  optionText: { fontSize: TEXT.lg, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  optionSub: { fontSize: TEXT.sm, color: C.fgSecondary },
  optionMark: { fontSize: TEXT.lg, fontWeight: WEIGHT.bold, color: C.correct },
  optionMarkWrong: { color: C.wrong },
});
