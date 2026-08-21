import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AvatarCategory } from '../../modules/avatar-dna/contracts';
import type { AvatarDNACopy } from '../../app/avatar_dna_copy';
import { useTheme } from '../ThemeContext';

const CATEGORIES: readonly AvatarCategory[] = ['base', 'face', 'hair', 'look', 'scene'];

export function AvatarDNATabs({ value, copy, onChange }: Readonly<{ value: AvatarCategory; copy: AvatarDNACopy; onChange: (category: AvatarCategory) => void }>) {
  const { theme: t } = useTheme();
  return <View accessibilityRole="tablist" style={styles.row}>{CATEGORIES.map((category) => {
    const selected = value === category;
    return <Pressable key={category} accessibilityRole="tab" accessibilityLabel={copy[category]} accessibilityState={{ selected }} onPress={() => onChange(category)} style={[styles.tab, { backgroundColor: selected ? t.accent : t.bgSurface, borderColor: selected ? t.accent : t.border }]}><Text style={[styles.label, { color: selected ? '#FFFFFF' : t.textPrimary }]}>{copy[category]}</Text></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 }, tab: { minHeight: 44, flex: 1, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, label: { fontSize: 12, fontWeight: '800' } });
