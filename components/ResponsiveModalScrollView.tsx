import React from 'react';
import { ScrollView, type ScrollViewProps, StyleSheet } from 'react-native';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';

/** Full-card overflow for modals without their own list or keyboard viewport. */
export default function ResponsiveModalScrollView({ style, contentContainerStyle, ...props }: ScrollViewProps) {
  const insets = useStableSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      {...props}
      style={[styles.viewport, style]}
      contentContainerStyle={[
        styles.content,
        contentContainerStyle,
        {
          paddingTop: Math.max(24, insets.top),
          paddingBottom: Math.max(24, insets.bottom),
          paddingLeft: Math.max(24, insets.left),
          paddingRight: Math.max(24, insets.right),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
});
