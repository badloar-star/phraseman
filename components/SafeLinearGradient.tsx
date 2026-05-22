import React from 'react';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

type ExpoLinearGradientProps = React.ComponentProps<typeof ExpoLinearGradient>;

export function LinearGradient(props: ExpoLinearGradientProps) {
  return <ExpoLinearGradient {...props} />;
}

export default LinearGradient;
