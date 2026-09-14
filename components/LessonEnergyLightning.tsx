import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import EnergyBar from './EnergyBar';

type Props = Readonly<{
  /** Deprecated legacy inputs retained so old callers keep compiling. */
  energyCount?: number;
  maxEnergy?: number;
  shouldShake?: boolean;
}>;

/** All lesson headers now use the same numeric, tappable energy indicator. */
function LessonEnergyLightning(_props: Props) {
  return (
    <View style={styles.container}>
      <EnergyBar compact />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});

export default memo(LessonEnergyLightning);
