import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  colors: [string, string];
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

/** Volumetric gradient card wrapper — use instead of View with backgroundColor: t.bgCard */
export default function GradientCard({ colors, style, children, start, end }: Props) {
  return (
    <LinearGradient
      colors={colors}
      start={start ?? { x: 0, y: 0 }}
      end={end ?? { x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
