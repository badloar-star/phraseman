import React, { useMemo } from 'react';
import { Platform, Text, type TextProps } from 'react-native';

import { introTargetTextColor } from '../../app/learning_v2_intro_theme';
import { arenaPromptSegments, type ArenaTextRole } from '../../modules/arena/arena_prompt_semantics';
import { useTheme } from '../ThemeContext';
import { useTournamentPalette } from '../ui/v2_theme';

type Props = TextProps & Readonly<{ children: string; role: ArenaTextRole }>;

const targetFontFamily = Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'system-ui' });
const nativeFontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' });

/** Arena caller supplies language role; text characters are never used to infer it. */
export function ArenaBilingualText({ children, role, style, ...props }: Props) {
  const { theme, themeMode } = useTheme();
  const P = useTournamentPalette();
  const targetColor = introTargetTextColor(theme, themeMode);
  const segments = useMemo(() => arenaPromptSegments(children, role), [children, role]);

  return (
    <Text {...props} style={[{ color: P.text }, style]}>
      {segments.map((segment, index) => {
        return (
          <Text
            key={`${index}-${segment.role}-${segment.focus ? 'focus' : 'copy'}`}
            accessibilityLanguage={segment.role === 'target' ? 'en-US' : undefined}
            style={{
              // Focus uses the same theme-safe target ink, plus typography,
              // rather than gold whose contrast varies across user themes.
              color: segment.focus || segment.role === 'target' ? targetColor : P.text,
              fontFamily: segment.role === 'target' ? targetFontFamily : nativeFontFamily,
              fontWeight: segment.focus || segment.role === 'target' ? '800' : '600',
              fontStyle: segment.focus ? 'italic' : segment.role === 'target' ? 'normal' : 'italic',
            }}
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
}
