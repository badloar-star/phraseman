import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from '../SafeLinearGradient';

const FADE_HEIGHT = 20;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  edge: { height: FADE_HEIGHT },
  opaque: { flex: 1, backgroundColor: 'black' },
});

const mask = (
  <View style={styles.fill} pointerEvents="none">
    <LinearGradient colors={['transparent', 'black']} style={styles.edge} />
    <View style={styles.opaque} />
  </View>
);

export default function ListTopEdgeFade({ children }: { children: React.ReactNode }) {
  return (
    <MaskedView style={styles.fill} maskElement={mask}>
      {children}
    </MaskedView>
  );
}
