import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AvatarCamera, AvatarDNA } from '../../modules/avatar-dna/contracts';
import type { AvatarDNACopy } from '../../app/avatar_dna_copy';
import { AvatarDNAStage } from './AvatarDNAStage';
import { useTheme } from '../ThemeContext';

export function AvatarDNAHero({ dna, camera, copy, onCameraChange }: Readonly<{ dna: AvatarDNA; camera: AvatarCamera; copy: AvatarDNACopy; onCameraChange: (camera: AvatarCamera) => void }>) {
  const { theme: t } = useTheme();
  return <View style={[styles.card, { backgroundColor: t.bgSurface }]}><AvatarDNAStage dna={dna} camera={camera} size={238} /><View style={[styles.switcher, { backgroundColor: t.bgPrimary }]}>{(['studio', 'portrait'] as const).map((id) => { const selected = camera === id; return <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={copy[id]} onPress={() => onCameraChange(id)} style={[styles.camera, { backgroundColor: selected ? t.bgSurface : 'transparent' }]}><Text style={{ color: t.textPrimary, fontWeight: '800' }}>{copy[id]}</Text></Pressable>; })}</View></View>;
}

const styles = StyleSheet.create({ card: { margin: 16, borderRadius: 28, alignItems: 'center', padding: 14, shadowColor: '#5C2E1B', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, switcher: { flexDirection: 'row', padding: 4, borderRadius: 16, marginTop: 8 }, camera: { minHeight: 44, minWidth: 112, borderRadius: 13, alignItems: 'center', justifyContent: 'center' } });
