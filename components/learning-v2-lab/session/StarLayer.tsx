// зачем: RN-порт верхней панели из source/src/session/StarLayer.tsx — крестик
// выхода, точки прогресса по карточкам, счётчик ошибок (коралловый) и счётчик
// звёзд (золотой). Ровно то, что владелец видит на скриншоте раннера.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import TapScale from '../../TapScale';
import { C, RADIUS, SPACE, TEXT, WEIGHT } from '../kimi/tokens';

export interface StarTopBarProps {
  readonly total: number;
  readonly mistakes: number;
  readonly cardIndex: number;
  readonly cardCount: number;
  readonly onClose: () => void;
}

export const StarTopBar = memo(function StarTopBar(props: StarTopBarProps) {
  const { total, mistakes, cardIndex, cardCount, onClose } = props;

  return (
    <View style={s.bar}>
      <TapScale
        onPress={onClose}
        withHaptic
        scaleTo={0.9}
        accessibilityLabel="Выйти из сессии"
        style={s.close}
        testID="sess-close"
      >
        <Text style={s.closeGlyph}>✕</Text>
      </TapScale>

      {/* Точки прогресса: пройденные — золотые, текущая — акцентная. */}
      <View style={s.dots} accessibilityLabel={`Карточка ${cardIndex + 1} из ${cardCount}`}>
        {Array.from({ length: cardCount }, (_, i) => (
          <View
            key={`dot-${i}`}
            style={[s.dot, i < cardIndex ? s.dotDone : null, i === cardIndex ? s.dotCurrent : null]}
          />
        ))}
      </View>

      <View style={s.counters}>
        <View style={[s.counter, s.counterMistake]}>
          <Text style={s.counterGlyphMistake}>!</Text>
          <Text style={s.counterValueMistake}>{mistakes}</Text>
        </View>
        <View style={[s.counter, s.counterStar]}>
          <Text style={s.counterGlyphStar}>★</Text>
          <Text style={s.counterValueStar}>{total}</Text>
        </View>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s3,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontSize: TEXT.lg, color: C.fgSecondary },
  dots: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: RADIUS.pill, backgroundColor: C.bgSubtle },
  dotDone: { backgroundColor: C.gold },
  dotCurrent: { backgroundColor: C.accentPrimary, width: 9, height: 9 },
  counters: { flexDirection: 'row', gap: SPACE.s2 },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s1,
    minHeight: 34,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
  },
  counterMistake: { backgroundColor: '#2A1B2B' },
  counterStar: { backgroundColor: '#2A2418' },
  counterGlyphMistake: { fontSize: TEXT.sm, color: C.wrong, fontWeight: WEIGHT.bold },
  counterValueMistake: { fontSize: TEXT.md, color: C.wrong, fontWeight: WEIGHT.bold },
  counterGlyphStar: { fontSize: TEXT.sm, color: C.gold },
  counterValueStar: { fontSize: TEXT.md, color: C.gold, fontWeight: WEIGHT.bold },
});
