import React, { useState } from 'react';
import { View } from 'react-native';

/** Measure both absolute faces at their real inner width, including face padding. */
export default function PhraseCardSizer({ front, back, minHeight, paddingHorizontal = 17, paddingVertical = 15 }: {
  front: React.ReactNode;
  back: React.ReactNode;
  minHeight: number;
  /**
   * зачем: отступы граней ужимаются по высоте экрана (PhraseCard.faceBaseStyle),
   * а измеритель раньше держал 17/15 константой — на низких экранах он мерил
   * по более широким полям, чем реальная грань, и карточка выходила выше нужного.
   */
  paddingHorizontal?: number;
  paddingVertical?: number;
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
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal, paddingVertical }}
        onLayout={event => setFrontHeight(Math.ceil(event.nativeEvent.layout.height))}
      >{front}</View>
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal, paddingVertical }}
        onLayout={event => setBackHeight(Math.ceil(event.nativeEvent.layout.height))}
      >{back}</View>
    </View>
  );
}
