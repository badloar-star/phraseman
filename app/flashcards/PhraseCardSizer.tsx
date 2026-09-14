import React, { useState } from 'react';
import { View } from 'react-native';

/** Measure both absolute faces at their real inner width, including face padding. */
export default function PhraseCardSizer({ front, back, minHeight }: {
  front: React.ReactNode;
  back: React.ReactNode;
  minHeight: number;
}) {
  const [frontHeight, setFrontHeight] = useState(0);
  const [backHeight, setBackHeight] = useState(0);
  return (
    <View
      testID="phrase-card-size"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: Math.max(minHeight, frontHeight, backHeight), opacity: 0, width: '100%' }}
    >
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 17, paddingVertical: 15 }}
        onLayout={event => setFrontHeight(Math.ceil(event.nativeEvent.layout.height))}
      >{front}</View>
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 17, paddingVertical: 15 }}
        onLayout={event => setBackHeight(Math.ceil(event.nativeEvent.layout.height))}
      >{back}</View>
    </View>
  );
}
