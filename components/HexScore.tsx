import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';

interface HexScoreProps {
  score: number;
  size?: number;
}

export default function HexScore({ score, size = 48 }: HexScoreProps) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.hex, { width: size, height: size, backgroundColor: t.accent }]}>
      <Text style={[styles.text, { color: t.correctText, fontSize: size * 0.28 }]}>
        {score > 999 ? `${Math.floor(score / 1000)}k` : score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hex: { borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  text: { fontWeight: '800' },
});
