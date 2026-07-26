// зачем: RN-порт source/src/session/engines/ArrangeEngine.tsx — собрать фразу из
// чипов. Тап по чипу банка ставит его в строку ответа, тап по поставленному —
// возвращает. Поддержка тает по фикстуре: distractors добавляет лишние чипы,
// guided заранее ставит часть слов. «Проверить» открывается, когда все слоты полны.
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import TapScale from '../../../TapScale';
import { GraphemeText } from '../../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT } from '../../kimi/tokens';
import type { ArrangeCard } from '../contracts';
import type { EngineProps } from '../engine_common';
import { useShake } from '../FeedbackLayer';

export const ArrangeEngine = memo(function ArrangeEngine(props: { card: ArrangeCard } & EngineProps) {
  const { card, locked, resolved, showAnswer, resetEpoch, shakeEpoch, onReady, onIntent } = props;
  const [placed, setPlaced] = useState<readonly string[]>([]);
  const shaking = useShake(shakeEpoch);

  useEffect(() => {
    setPlaced([]);
  }, [resetEpoch, card.id]);

  const slotsTotal = card.targetTokens.length - card.preplaced.length;
  const complete = placed.length === slotsTotal;

  useEffect(() => onReady(complete), [complete, onReady]);

  // Строка ответа: заранее поставленные слова заперты на своих местах,
  // свободные слоты ученик заполняет в порядке тапов.
  const line = useMemo(() => {
    let freeCursor = 0;
    return card.targetTokens.map((token, position) => {
      // Ключ — позиция в предложении: она стабильна, слова не переставляются.
      const key = `pos-${position}`;
      if (card.preplaced.includes(token)) return { kind: 'preplaced' as const, token, slot: -1, key };
      const mine = freeCursor;
      freeCursor += 1;
      if (showAnswer) return { kind: 'answer' as const, token, slot: mine, key };
      const value = placed[mine];
      return value
        ? { kind: 'filled' as const, token: value, slot: mine, key }
        : { kind: 'empty' as const, token: '', slot: mine, key };
    });
  }, [card.targetTokens, card.preplaced, placed, showAnswer]);

  const place = (chip: string) => {
    if (complete || locked) return;
    // зачем: отклик мгновенный — чип встаёт в строку сразу, без ожиданий
    onIntent('arrange.place', { cardId: card.id, chip, slot: placed.length });
    setPlaced((p) => (p.length < slotsTotal ? [...p, chip] : p));
  };

  const unplace = (index: number) => {
    if (locked) return;
    const chip = placed[index];
    if (chip === undefined) return;
    onIntent('arrange.remove', { cardId: card.id, chip, slot: index });
    setPlaced((p) => p.filter((_, i) => i !== index));
  };

  return (
    <View style={s.wrap}>
      <GraphemeText text={card.promptRu} maxGraphemes={80} style={s.prompt} />

      <ShakeBox shaking={shaking}>
        <View
          style={[
            s.answer,
            complete ? s.answerComplete : null,
            resolved === 'correct' ? s.answerCorrect : null,
            resolved === 'wrong' ? s.answerWrong : null,
          ]}
          accessibilityLabel="Строка ответа"
        >
          {/* зачем: ключ = позиция в предложении (`cell.key`), а не индекс массива —
              позиции в строке ответа фиксированы фикстурой и не переставляются */}
          {line.map((cell) =>
            cell.kind === 'empty' ? (
              <View key={cell.key} style={s.slot} accessibilityLabel="Пустая позиция" />
            ) : cell.kind === 'filled' ? (
              <TapScale
                key={cell.key}
                onPress={() => unplace(cell.slot)}
                disabled={locked}
                withHaptic
                scaleTo={0.94}
                accessibilityLabel={`Убрать ${cell.token}`}
                style={[s.chip, s.chipPlaced]}
              >
                <GraphemeText text={cell.token} maxGraphemes={20} style={s.chipText} />
              </TapScale>
            ) : (
              <View key={cell.key} style={[s.chip, s.chipLocked, cell.kind === 'answer' ? s.chipAnswer : null]}>
                <GraphemeText text={cell.token} maxGraphemes={20} style={s.chipText} />
              </View>
            ),
          )}
        </View>
      </ShakeBox>

      <View style={s.bank} accessibilityLabel="Банк слов">
        {card.bankChips.map((chip, index) => {
          const usedCount = placed.filter((p) => p === chip).length;
          const bankOccurrence = card.bankChips.slice(0, index + 1).filter((c) => c === chip).length;
          const used = bankOccurrence <= usedCount;
          return (
            <TapScale
              key={`${chip}-${index}`}
              onPress={() => place(chip)}
              disabled={locked || used || complete}
              withHaptic
              scaleTo={0.94}
              accessibilityLabel={`Добавить ${chip}`}
              style={[s.chip, s.chipBank, used ? s.chipUsed : null]}
              testID={`sess-bank-${chip}-${index}`}
            >
              <GraphemeText text={chip} maxGraphemes={20} style={s.chipText} />
            </TapScale>
          );
        })}
      </View>
    </View>
  );
});

/** Тряска после неверного ответа — только transform, на нативном потоке. */
const ShakeBox = memo(function ShakeBox(props: { readonly shaking: boolean; readonly children: React.ReactNode }) {
  const shift = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!props.shaking) {
      shift.setValue(0);
      return;
    }
    const seq = Animated.sequence([
      Animated.timing(shift, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shift, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shift, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shift, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shift, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [props.shaking, shift]);

  return (
    <Animated.View
      style={{
        transform: [{ translateX: shift.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }],
      }}
    >
      {props.children}
    </Animated.View>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s4 },
  prompt: {
    fontSize: TEXT.xl,
    fontWeight: WEIGHT.semibold,
    color: C.fgPrimary,
    lineHeight: TEXT.xl * LEADING.snug,
  },
  answer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACE.s2,
    // зачем: высота строки ответа зарезервирована — первый чип не двигает банк
    minHeight: 68,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  answerComplete: { backgroundColor: C.accentSoft },
  answerCorrect: { backgroundColor: '#182B31' },
  answerWrong: { backgroundColor: '#2A1B2B' },
  slot: {
    minWidth: 56,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSubtle,
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  chip: {
    minHeight: TOUCH_MIN,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSubtle,
    justifyContent: 'center',
  },
  chipBank: { backgroundColor: C.bgSurface },
  chipPlaced: { backgroundColor: C.accentSoft },
  chipLocked: { backgroundColor: C.bgSubtle },
  chipAnswer: { backgroundColor: '#182B31' },
  chipUsed: { opacity: 0.3 },
  chipText: { fontSize: TEXT.lg, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
});
