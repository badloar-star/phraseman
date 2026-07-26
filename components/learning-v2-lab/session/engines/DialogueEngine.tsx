// зачем: RN-порт source/src/session/engines/DialogueEngine.tsx — сценарный диалог
// на 3–5 реплик, капстоун сессии. Реплики партнёра приходят с субтитрами и чипами
// «Повторить / Медленнее»; на своих ходах ученик выбирает ответ. Неверный ответ
// трясёт и попадает в лестницу подсказок раннера; верный двигает сценарий дальше.
// Движок самозавершающийся: сценарий дошёл до конца → раннер закрывает карточку.
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import TapScale from '../../../TapScale';
import { GraphemeText } from '../../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from '../../kimi/tokens';
import type { DialogueCard, DialogueTurnYou } from '../contracts';
import type { EngineProps } from '../engine_common';
import { useShake } from '../FeedbackLayer';

export const DialogueEngine = memo(function DialogueEngine(props: { card: DialogueCard } & EngineProps) {
  const { card, locked, showAnswer, resetEpoch, shakeEpoch, onWrong, onAutoComplete, onIntent } = props;
  const [turnIndex, setTurnIndex] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const shaking = useShake(shakeEpoch);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTurnIndex(0);
    setPickedId(null);
  }, [resetEpoch, card.id]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const visibleTurns = card.turns.slice(0, turnIndex + 1);
  const current = card.turns[turnIndex];
  const yourTurn: DialogueTurnYou | null = current?.speaker === 'you' ? current : null;
  const finished = pickedId === '__done__';

  // Завершающая реплика партнёра закрывает сценарий через паузу.
  useEffect(() => {
    if (current?.speaker === 'partner' && turnIndex === card.turns.length - 1 && !finished) {
      const timer = setTimeout(() => setPickedId('__done__'), 1100);
      timers.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [current, turnIndex, card.turns.length, finished]);

  useEffect(() => {
    if (finished) onAutoComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const advance = () => {
    if (turnIndex >= card.turns.length - 1) {
      setPickedId('__done__');
      return;
    }
    setPickedId(null);
    setTurnIndex((i) => i + 1);
  };

  const pickReply = (optionId: string) => {
    if (!yourTurn) return;
    onIntent('dialogue.reply', { cardId: card.id, turn: turnIndex, optionId });
    if (optionId === yourTurn.correctOptionId) {
      // зачем: свой пузырь появляется мгновенно, сценарий двигается следом
      setPickedId(optionId);
      timers.current.push(setTimeout(advance, 520));
    } else {
      onWrong();
    }
  };

  return (
    <View style={s.wrap}>
      {card.scene ? (
        <View style={s.scene}>
          <Text style={s.sceneEmoji}>{card.scene.emoji}</Text>
          <GraphemeText text={card.scene.caption} maxGraphemes={60} style={s.sceneCaption} />
        </View>
      ) : null}

      <View style={[s.dialogue, shaking ? s.dialogueShake : null]}>
        {visibleTurns.map((turn, index) => {
          if (turn.speaker === 'partner') {
            return (
              <View key={`turn-${index}`} style={s.turnPartner}>
                <View style={s.bubble}>
                  <GraphemeText text={turn.en} maxGraphemes={90} style={s.line} />
                  <GraphemeText text={turn.ru} maxGraphemes={90} style={s.captions} />
                  <View style={s.audioChips}>
                    <TapScale
                      onPress={() => onIntent('dialogue.replay', { cardId: card.id, turn: index, slow: false })}
                      withHaptic
                      scaleTo={0.96}
                      accessibilityLabel={card.replayLabel}
                      style={s.chip}
                    >
                      <Text style={s.chipText}>{card.replayLabel}</Text>
                    </TapScale>
                    <TapScale
                      onPress={() => {
                        setSlow((v) => !v);
                        onIntent('dialogue.replay', { cardId: card.id, turn: index, slow: !slow });
                      }}
                      withHaptic
                      scaleTo={0.96}
                      accessibilityLabel={card.slowLabel}
                      accessibilityState={{ selected: slow }}
                      style={[s.chip, slow ? s.chipActive : null]}
                    >
                      <Text style={s.chipText}>{card.slowLabel}</Text>
                    </TapScale>
                  </View>
                </View>
              </View>
            );
          }

          const answered = pickedId !== null && pickedId !== '__done__' && index === turnIndex;
          const passed = index < turnIndex || pickedId === '__done__';
          return (
            <View key={`turn-${index}`} style={s.turnYou}>
              {passed || answered ? (
                <View style={[s.bubble, s.bubbleYou]}>
                  <GraphemeText
                    text={turn.options.find((o) => o.id === turn.correctOptionId)?.label ?? ''}
                    maxGraphemes={90}
                    style={s.line}
                  />
                  <GraphemeText text={turn.ru} maxGraphemes={90} style={s.captions} />
                </View>
              ) : (
                <View style={s.options} accessibilityLabel="Твой ответ">
                  {turn.options.map((option) => (
                    <TapScale
                      key={option.id}
                      onPress={() => pickReply(option.id)}
                      disabled={locked}
                      withHaptic
                      scaleTo={0.98}
                      accessibilityLabel={option.label}
                      style={[
                        s.option,
                        showAnswer && option.id === turn.correctOptionId ? s.optionAnswer : null,
                      ]}
                    >
                      <GraphemeText text={option.label} maxGraphemes={60} style={s.optionText} />
                    </TapScale>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {finished ? <GraphemeText text={card.summary} maxGraphemes={90} style={s.summary} /> : null}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s4 },
  scene: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  sceneEmoji: { fontSize: 28 },
  sceneCaption: { flex: 1, fontSize: TEXT.sm, color: C.fgSecondary },
  dialogue: { gap: SPACE.s3 },
  dialogueShake: { transform: [{ translateX: 6 }] },
  turnPartner: { alignItems: 'flex-start' },
  turnYou: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    gap: SPACE.s1,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  bubbleYou: { backgroundColor: C.accentSoft },
  line: { fontSize: TEXT.md, fontWeight: WEIGHT.semibold, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  captions: { fontSize: TEXT.sm, color: C.fgSecondary },
  audioChips: { flexDirection: 'row', gap: SPACE.s2, marginTop: SPACE.s1 },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
  },
  chipActive: { backgroundColor: C.accentSoft },
  chipText: { fontSize: TEXT.xs, color: C.fgSecondary },
  options: { width: '100%', gap: SPACE.s2 },
  option: {
    minHeight: 56,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
    justifyContent: 'center',
  },
  optionAnswer: { backgroundColor: '#182B31' },
  optionText: { fontSize: TEXT.md, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  summary: { fontSize: TEXT.sm, color: C.correct, textAlign: 'center', marginTop: SPACE.s2 },
});
