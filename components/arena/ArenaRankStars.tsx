import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTournamentPalette } from '../ui/v2_theme';
import { ARENA_STARS_PER_RANK } from '../../modules/arena/rank_engine';

/**
 * Три звезды текущего ранга — единый пипс-ряд для хаба, экрана рангов и
 * итогов матча.
 *
 * Владелец (2026-08-23): прогресс ранга — это звёзды (победа +1, поражение
 * −1, три звезды = новый ранг), а не очки. Числа «640 RP» больше нет нигде;
 * игрок видит ровно то, чем оперирует правило — три слота.
 *
 * Пустой слот отделяется тоном (приглушённый контур), не обводкой контейнера —
 * запрет владельца на рамки касается блоков, контурная иконка им не является.
 */
export function ArenaRankStars({ filled, size = 16, accessibilityLabel }: Readonly<{
  /** Сколько звёзд горит, 0..3. Значения вне диапазона зажимаются. */
  filled: number;
  size?: number;
  accessibilityLabel?: string;
}>) {
  const P = useTournamentPalette();
  const lit = Math.max(0, Math.min(ARENA_STARS_PER_RANK, Math.trunc(filled)));
  return (
    <View
      style={styles.row}
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined}
    >
      {Array.from({ length: ARENA_STARS_PER_RANK }, (_, index) => (
        <Ionicons
          key={index} // guard-ok: три фиксированных слота, порядок не меняется

          name={index < lit ? 'star' : 'star-outline'}
          size={size}
          color={index < lit ? P.gold : P.muted}
          style={index < lit ? undefined : styles.dim}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  // Пустой слот тише горящего: контур и так серый, полупрозрачность убирает
  // спор за внимание с золотыми звёздами.
  dim: { opacity: 0.45 },
});
