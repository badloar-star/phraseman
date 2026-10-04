import React, { createContext, memo, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  speakingInlineMetrics,
  speakingInlineSlotAlign,
  type SpeakingInlineMetrics,
  type SpeakingInlineVariant,
} from '../app/speaking_inline_layout';

/** One geometry on every state: idle, listening, scoring, result, and recovery. */
export const SPEAKING_INLINE_SLOT_HEIGHT = 176;

export interface SpeakingInlineSlotProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: SpeakingInlineVariant;
}

const SpeakingInlineMetricsContext = createContext<SpeakingInlineMetrics>({ scale: 1, slotHeight: SPEAKING_INLINE_SLOT_HEIGHT });

export function useSpeakingInlineMetrics(): SpeakingInlineMetrics {
  return useContext(SpeakingInlineMetricsContext);
}

function SpeakingInlineSlot({ children, style, variant = 'trainer' }: SpeakingInlineSlotProps) {
  const { width, height } = useWindowDimensions();
  const metrics = useMemo(() => speakingInlineMetrics(width, height, variant), [width, height, variant]);
  const align = speakingInlineSlotAlign(height, variant);
  return (
    <SpeakingInlineMetricsContext.Provider value={metrics}>
      <View
        testID="speaking-inline-slot"
        pointerEvents="box-none"
        // зачем (§126, кадр 04.10): прижатая к верху карточка липла к строке над слотом — 8 dp воздуха (запас слота ~21 dp).
        style={[styles.slot, { minHeight: metrics.slotHeight, justifyContent: align, paddingTop: align === 'flex-start' ? 8 : 0 }, style]}
      >
        {children}
      </View>
    </SpeakingInlineMetricsContext.Provider>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    flexShrink: 0,
    justifyContent: 'center',
  },
});

export default memo(SpeakingInlineSlot);
