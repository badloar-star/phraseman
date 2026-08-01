import React, { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** One geometry on every state: idle, listening, scoring, result, and recovery. */
export const SPEAKING_INLINE_SLOT_HEIGHT = 176;

export interface SpeakingInlineSlotProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function SpeakingInlineSlot({ children, style }: SpeakingInlineSlotProps) {
  return (
    <View
      testID="speaking-inline-slot"
      pointerEvents="box-none"
      style={[styles.slot, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    height: SPEAKING_INLINE_SLOT_HEIGHT,
    flexShrink: 0,
    justifyContent: 'center',
  },
});

export default memo(SpeakingInlineSlot);
