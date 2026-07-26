// зачем: RN-порт source/src/session/FeedbackLayer.tsx — лестница ошибок как
// явные микро-состояния: 1-я ошибка → «Подсказка», 2-я → «Сравни формы»
// (контраст), 3-я → показ ответа и пересборка. Ученик всегда видит, на какой он
// ступени. Плюс тряска после неверного ответа (~380 мс, только transform).
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GraphemeText } from '../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from '../kimi/tokens';
import type { HintSet } from './contracts';

/** Флаг тряски: true ~380 мс после каждой неверной попытки. */
export function useShake(epoch: number): boolean {
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (epoch === 0) return;
    setShaking(true);
    const timer = setTimeout(() => setShaking(false), 380);
    return () => clearTimeout(timer);
  }, [epoch]);
  return shaking;
}

export interface FeedbackLayerProps {
  readonly hints: HintSet;
  /** 0 — чисто, 1 — первая подсказка, 2 — контраст, 3+ — пересборка. */
  readonly attempt: number;
  readonly showAnswer: boolean;
  /** Карточка решена верно — лестница уходит, работают звёзды. */
  readonly resolved: boolean;
}

export const FeedbackLayer = memo(function FeedbackLayer(props: FeedbackLayerProps) {
  const { hints, attempt, showAnswer, resolved } = props;

  if (resolved) {
    return (
      <View style={[s.lane, s.laneOk]}>
        <Text style={[s.lead, s.leadOk]}>Верно!</Text>
      </View>
    );
  }

  if (showAnswer) {
    return (
      <View style={[s.lane, s.laneShown]}>
        <Text style={s.glyph}>👁</Text>
        <Text style={s.text}>
          <Text style={s.lead}>Запомни</Text>
          <Text style={s.rung}> · ступень 3 из 3 — </Text>
          сейчас соберёшь сам
        </Text>
      </View>
    );
  }

  // зачем: полоса подсказки ЗАРЕЗЕРВИРОВАНА всегда (min-height), иначе появление
  // текста двигало бы кнопку «Проверить» под пальцем.
  if (attempt <= 0) return <View style={s.lane} />;

  if (attempt === 1) {
    return (
      <View style={[s.lane, s.laneHint]}>
        <Text style={s.glyph}>💡</Text>
        <Text style={s.text}>
          <Text style={s.lead}>Подсказка</Text>
          <Text style={s.rung}> · ступень 1 из 3 — </Text>
          <GraphemeText text={hints.first} maxGraphemes={110} />
        </Text>
      </View>
    );
  }

  if (attempt === 2) {
    return (
      <View style={[s.lane, s.laneContrast]}>
        <Text style={s.glyph}>⇄</Text>
        <Text style={s.text}>
          <Text style={s.lead}>Сравни формы</Text>
          <Text style={s.rung}> · ступень 2 из 3 — </Text>
          <GraphemeText text={hints.contrast} maxGraphemes={140} />
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.lane, s.laneContrast]}>
      <Text style={s.glyph}>⇄</Text>
      <Text style={s.text}>
        <Text style={s.lead}>Разбор</Text>
        <Text style={s.rung}> · ступень 3 из 3 — </Text>
        <GraphemeText text={hints.explain} maxGraphemes={140} />
      </Text>
    </View>
  );
});

const s = StyleSheet.create({
  lane: {
    // зачем: стабильная высота полосы — контент не прыгает между ступенями
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    borderRadius: RADIUS.md,
  },
  laneHint: { backgroundColor: '#192040' },
  laneContrast: { backgroundColor: '#2A2729' },
  laneShown: { backgroundColor: C.accentSoft },
  laneOk: { backgroundColor: '#182B31' },
  glyph: { fontSize: TEXT.lg },
  text: { flex: 1, fontSize: TEXT.sm, color: C.fgPrimary, lineHeight: TEXT.sm * LEADING.snug },
  lead: { fontWeight: WEIGHT.bold, color: C.fgPrimary },
  leadOk: { color: C.correct, fontSize: TEXT.md },
  rung: { color: C.fgSecondary },
});
