// зачем: RN-порт source/src/session/engines/MatchEngine.tsx — разминка на пары.
// Две колонки, соединение тап-тап. Тап слева подсвечивает, тап справа либо
// убирает ОБА чипа (доска буквально расчищается), либо трясёт ТОЛЬКО правый чип
// (прогресс сохраняется). Движок самозавершающийся: все пары убраны → раннер
// закрывает карточку сам, без кнопки «Проверить».
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import TapScale from '../../../TapScale';
import { GraphemeText } from '../../kimi/primitives';
import { C, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT } from '../../kimi/tokens';
import type { MatchCard } from '../contracts';
import type { EngineProps } from '../engine_common';

export const MatchEngine = memo(function MatchEngine(props: { card: MatchCard } & EngineProps) {
  const { card, locked, showAnswer, resetEpoch, onWrong, onAutoComplete, onIntent } = props;
  const [pickedEn, setPickedEn] = useState<string | null>(null);
  const [gone, setGone] = useState<readonly string[]>([]);
  const [wrongRuId, setWrongRuId] = useState<string | null>(null);
  const [noTimer, setNoTimer] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPickedEn(null);
    setGone([]);
    setWrongRuId(null);
  }, [resetEpoch, card.id]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const done = gone.length === card.pairs.length;
  useEffect(() => {
    if (done) onAutoComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Правая колонка в обратном порядке фикстуры — детерминированная раскладка.
  const ruColumn = useMemo(() => [...card.pairs].reverse(), [card.pairs]);

  const pickEn = (id: string) => {
    if (gone.includes(id)) return;
    // зачем: отклик мгновенный — подсветка сразу по тапу
    setPickedEn(id);
    onIntent('match.pick', { cardId: card.id, pairId: id, side: 'en' });
  };

  const pickRu = (id: string) => {
    if (gone.includes(id)) return;
    onIntent('match.pick', { cardId: card.id, pairId: id, side: 'ru' });
    if (!pickedEn) return;
    if (pickedEn === id) {
      setPickedEn(null);
      onIntent('match.pair', { cardId: card.id, pairId: id, matchedCount: gone.length + 1 });
      setGone((g) => [...g, id]);
    } else {
      // Неверная пара: трясём только правый чип, прогресс не теряем.
      setPickedEn(null);
      setWrongRuId(id);
      timers.current.push(setTimeout(() => setWrongRuId(null), 420));
      onWrong();
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.meta}>
        {noTimer ? null : (
          <View style={s.timer}>
            <Text style={s.timerText}>⏱ {card.timerDisplay}</Text>
          </View>
        )}
        <TapScale
          onPress={() => {
            setNoTimer((v) => !v);
            onIntent('match.no_timer', { cardId: card.id, noTimer: !noTimer });
          }}
          withHaptic
          scaleTo={0.96}
          accessibilityLabel={card.noTimerLabel}
          accessibilityState={{ selected: noTimer }}
          style={[s.noTimer, noTimer ? s.noTimerActive : null]}
        >
          <Text style={s.noTimerText}>{card.noTimerLabel}</Text>
        </TapScale>
      </View>

      <View style={s.columns}>
        <View style={s.col} accessibilityLabel="Английские слова">
          {card.pairs.map((pair) => {
            const isGone = gone.includes(pair.id);
            return (
              <TapScale
                key={pair.id}
                onPress={() => pickEn(pair.id)}
                disabled={locked || isGone}
                withHaptic
                scaleTo={0.96}
                accessibilityLabel={pair.en}
                accessibilityState={{ selected: pickedEn === pair.id, disabled: isGone }}
                // зачем: убранная пара гаснет, но ОСТАЁТСЯ в потоке — колонки
                // не прыгают вверх посреди упражнения
                style={[
                  s.chip,
                  pickedEn === pair.id ? s.chipPicked : null,
                  isGone ? s.chipGone : null,
                  showAnswer && !isGone ? s.chipAnswer : null,
                ]}
              >
                <GraphemeText text={pair.en} maxGraphemes={24} style={s.chipText} />
              </TapScale>
            );
          })}
        </View>
        <View style={s.col} accessibilityLabel="Русские слова">
          {ruColumn.map((pair) => {
            const isGone = gone.includes(pair.id);
            return (
              <TapScale
                key={pair.id}
                onPress={() => pickRu(pair.id)}
                disabled={locked || isGone}
                withHaptic
                scaleTo={0.96}
                accessibilityLabel={pair.ru}
                accessibilityState={{ disabled: isGone }}
                style={[
                  s.chip,
                  wrongRuId === pair.id ? s.chipWrong : null,
                  isGone ? s.chipGone : null,
                  showAnswer && !isGone ? s.chipAnswer : null,
                ]}
              >
                <GraphemeText text={pair.ru} maxGraphemes={24} style={s.chipText} />
              </TapScale>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s2 },
  timer: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
  },
  timerText: { fontSize: TEXT.sm, color: C.fgPrimary, fontWeight: WEIGHT.semibold },
  noTimer: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
  },
  noTimerActive: { backgroundColor: C.accentSoft },
  noTimerText: { fontSize: TEXT.sm, color: C.fgSecondary },
  columns: { flexDirection: 'row', gap: SPACE.s3 },
  col: { flex: 1, gap: SPACE.s2 },
  chip: {
    minHeight: TOUCH_MIN + 8,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSurface,
    justifyContent: 'center',
  },
  chipPicked: { backgroundColor: C.accentSoft },
  chipWrong: { backgroundColor: '#2A1B2B' },
  chipAnswer: { backgroundColor: '#182B31' },
  chipGone: { opacity: 0 },
  chipText: { fontSize: TEXT.md, color: C.fgPrimary, fontWeight: WEIGHT.semibold },
});
