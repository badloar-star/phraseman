/**
 * cards-2.0 (E13): точки «силы слова» Weak/Medium/Strong (§2 мастер-плана).
 * 1–3 заполненных точки; цвета из темы: weak → t.wrong, medium → t.gold,
 * strong → t.correct. Чисто презентационный компонент — маппинг в word_strength.ts.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { Theme } from '../../constants/theme';
import { strengthDotCount, type WordStrength } from './word_strength';

const DOT = 5;

export function strengthColor(strength: WordStrength, t: Theme): string {
  if (strength === 'strong') return t.correct;
  if (strength === 'medium') return t.gold;
  return t.wrong;
}

type Props = {
  /** null — «не тренировалась»: ничего не рендерим. */
  strength: WordStrength | null;
  t: Theme;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function WordStrengthDotsImpl({ strength, t, style, testID }: Props) {
  if (!strength) return null;
  const filled = strengthDotCount(strength);
  const color = strengthColor(strength, t);
  return (
    <View
      pointerEvents="none"
      testID={testID}
      accessibilityLabel={testID ? `qa-${testID}` : undefined}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 3 }, style]}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: i < filled ? color : 'transparent',
            borderWidth: i < filled ? 0 : 1,
            borderColor: `${color}66`,
          }}
        />
      ))}
    </View>
  );
}

const WordStrengthDots = React.memo(WordStrengthDotsImpl);
export default WordStrengthDots;
