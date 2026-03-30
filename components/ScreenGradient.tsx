import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: any;
}

export default function ScreenGradient({ children, style }: Props) {
  const { theme: t } = useTheme();
  return (
    <LinearGradient
      colors={t.bgGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
