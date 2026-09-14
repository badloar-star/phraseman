import React, { createContext, useContext, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

const PracticeCompactContext = createContext<boolean | null>(null);

/** Only the direct player opts in; embedded previews keep their own geometry. */
export function useLearningV2CompactPractice(): boolean {
  return useContext(PracticeCompactContext) ?? false;
}

export function useLearningV2PracticeViewportHost(): boolean {
  return useContext(PracticeCompactContext) !== null;
}

export default function LearningV2PracticeViewport({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [height, setHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  // Native measurement includes translated text and the system font size.
  // Compact spacing comes first; unusually large text must remain reachable.
  const compact = height === 0 || height < 620;
  const overflowing = height > 0 && contentHeight > height + 1;

  return (
    <View
      testID="learning-v2-practice-viewport"
      style={styles.viewport}
      onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
    >
      <PracticeCompactContext.Provider value={compact}>
        <ScrollView
          testID="learning-v2-practice-content"
          style={styles.viewport}
          contentContainerStyle={styles.content}
          scrollEnabled={overflowing}
          showsVerticalScrollIndicator={overflowing}
          onContentSizeChange={(_, measuredHeight) => setContentHeight(measuredHeight)}
        >
          {children}
        </ScrollView>
      </PracticeCompactContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 44 },
});
