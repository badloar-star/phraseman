import React from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useSoftAppear } from '../hooks/use_soft_appear';

/** Обёртка мягкого появления для пустых состояний экранов (Волна 2, пункт 8): opacity+сдвиг, нативный драйвер, reduce-motion — сразу. */
export function SoftAppear({ children, style, testID }: Readonly<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }>) {
  const appear = useSoftAppear(true);
  return <Animated.View testID={testID} style={[style, { opacity: appear.opacity, transform: appear.transform }]}>{children}</Animated.View>;
}
export default SoftAppear;
