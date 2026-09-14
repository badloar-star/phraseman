import React from 'react';
import { ScrollView, Text } from 'react-native';
import { useSpeakingInlineMetrics } from '../../components/SpeakingInlineSlot';
import { useTheme } from '../../components/ThemeContext';

/** Long translations and enlarged fonts scroll inside the existing slot. */
export default function SpeakingTaskHint({ children }: { children: string }) {
  const { slotHeight } = useSpeakingInlineMetrics();
  const { theme: t, f } = useTheme();
  return <ScrollView nestedScrollEnabled testID="fc-speak-task-hint-scroll" style={{ height: slotHeight, maxHeight: slotHeight, width: '100%' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 8 }}>
    <Text testID="fc-speak-task-hint" style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.5, textAlign: 'center' }}>{children}</Text>
  </ScrollView>;
}
