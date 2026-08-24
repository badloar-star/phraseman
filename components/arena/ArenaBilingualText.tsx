import React, { useMemo } from 'react';
import { Text, type TextProps } from 'react-native';

import { segmentBilingual } from '../../app/bilingual_segments';
import { introTargetTextColor } from '../../app/learning_v2_intro_theme';
import { useTheme } from '../ThemeContext';
import { useTournamentPalette } from '../ui/v2_theme';

type Props = TextProps & Readonly<{ children: string }>;

/** Learning V2 language contract: target English uses the theme-safe accent. */
export function ArenaBilingualText({ children, style, ...props }: Props) {
  const { theme, themeMode } = useTheme();
  const P = useTournamentPalette();
  const targetColor = introTargetTextColor(theme, themeMode);
  const segments = useMemo(() => segmentBilingual(children), [children]);

  return (
    <Text {...props} style={[{ color: P.text }, style]}>
      {segments.map((segment, index) => (
        <Text
          key={`${index}-${segment.english ? 'target' : 'native'}`}
          style={{
            color: segment.english ? targetColor : P.text,
            fontWeight: segment.english ? '800' : undefined,
          }}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

