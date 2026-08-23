import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ArenaStarGlyph } from './ArenaStarGlyph';
import { ARENA_STARS_PER_RANK } from '../../modules/arena/rank_engine';

/**
 * Три звезды текущего ранга — единый пипс-ряд для хаба, экрана рангов и
 * итогов матча.
 *
 * Владелец (2026-08-23): прогресс ранга — это звёзды (победа +1, поражение
 * −1, три звезды = новый ранг), а не очки. Числа «640 RP» больше нет нигде;
 * игрок видит ровно то, чем оперирует правило — три слота.
 *
 * Глиф — золотой градиент из принятого премиум-макета
 * (.motion-mockups/phraseman-arena-stars.html); пустой слот — тихий контур,
 * отделяется тоном, не обводкой контейнера.
 */
export function ArenaRankStars({ filled, size = 16, accessibilityLabel }: Readonly<{
  /** Сколько звёзд горит, 0..3. Значения вне диапазона зажимаются. */
  filled: number;
  size?: number;
  accessibilityLabel?: string;
}>) {
  const lit = Math.max(0, Math.min(ARENA_STARS_PER_RANK, Math.trunc(filled)));
  return (
    <View
      style={styles.row}
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined}
    >
      {Array.from({ length: ARENA_STARS_PER_RANK }, (_, index) => (
        <ArenaStarGlyph key={index} lit={index < lit} size={size} glow={size >= 16} /> // guard-ok: три фиксированных слота
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
