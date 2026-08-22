import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Text, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../components/ThemeContext';
import { FlowText } from '../components/text-integrity/FlowText';
import type { Lang } from '../constants/i18n';

type Props = {
  visibleAssistantText: string;
  completedAssistantText: string;
  lang: Lang;
};

/** Живая лента держит только последнее читаемое окно; полный текст — в шите. */
export function captionRailTail(text: string, wordLimit = 10): string {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (words.length <= wordLimit) return text.trim();
  return `… ${words.slice(-wordLimit).join(' ')}`;
}

export function MaxCallLiveCaptionView({
  visibleAssistantText,
  completedAssistantText,
}: Props) {
  const { theme: t, f } = useTheme();
  const { fontScale } = useWindowDimensions();
  const wordLimit = fontScale >= 1.6 ? 6 : fontScale >= 1.3 ? 8 : 10;
  const visibleTail = captionRailTail(visibleAssistantText, wordLimit);
  const announcedRef = useRef('');

  useEffect(() => {
    const value = completedAssistantText.trim();
    if (!value || announcedRef.current === value) return;
    announcedRef.current = value;
    void AccessibilityInfo.announceForAccessibility(`MAX: ${value}`);
  }, [completedAssistantText]);

  return (
    <>
      <View
        testID="max-call-live-caption"
        accessible={false}
        style={{ minHeight: 132, marginHorizontal: 22, marginBottom: 8, justifyContent: 'center' }}
      >
        {visibleTail !== '' ? (
          <>
          <Text
            style={{ color: t.accent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8 }}
            maxFontSizeMultiplier={2}
          >
            MAX
          </Text>
          <FlowText
            testID="max-call-live-caption-text"
            provenance="external"
            integrityText={visibleTail}
            maxFontSizeMultiplier={2}
            style={{
              color: t.textPrimary,
              fontSize: f.bodyLg,
              fontWeight: '800',
              lineHeight: Math.round(f.bodyLg * 1.35),
              marginTop: 6,
            }}
          >
            {visibleTail}
          </FlowText>
          </>
        ) : null}
      </View>
    </>
  );
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function MaxCallLiveCaptionRouteShim() { return null; }
