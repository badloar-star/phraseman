import React from 'react';
import { Image } from 'react-native';

/** Approved violet crown. Keep its transparent silhouette at every badge size. */
export function PlusMark({ width = 30, testID = 'plus-crown', decorative = false }: {
  width?: number;
  testID?: string;
  decorative?: boolean;
}) {
  return (
    <Image
      source={require('../../assets/images/plus/plus-crown.webp')}
      testID={testID}
      resizeMode="contain"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : 'Plus'}
      style={{ width, height: width * 0.68 }}
    />
  );
}
