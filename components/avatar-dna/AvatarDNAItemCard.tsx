import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AvatarItemManifest } from '../../modules/avatar-dna/contracts';
import { avatarDNAItemName, type AvatarDNACopy } from '../../app/avatar_dna_copy';
import { useTheme } from '../ThemeContext';

export function AvatarDNAItemCard({ item, selected, copy, reduceMotion, onPress }: Readonly<{ item: AvatarItemManifest; selected: boolean; copy: AvatarDNACopy; reduceMotion: boolean; onPress: (item: AvatarItemManifest) => void }>) {
  const { theme: t } = useTheme();
  const name = avatarDNAItemName(item.id, copy);
  const status = selected ? (item.entitlement.kind === 'reward' ? copy.rewardSelected : copy.selected) : item.entitlement.kind === 'reward' ? copy.rewardLocked : copy.free;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${status}`} accessibilityState={{ selected }} onPress={() => onPress(item)} style={({ pressed }) => [styles.card, { backgroundColor: t.bgSurface, borderColor: selected ? t.accent : t.border, transform: [{ scale: pressed && !reduceMotion ? 0.988 : 1 }] }]}><View style={[styles.preview, { backgroundColor: selected ? '#F9D7C5' : t.bgPrimary }]}><Text style={[styles.monogram, { color: t.accent }]}>{name.slice(0, 1).toUpperCase()}</Text></View><Text style={[styles.name, { color: t.textPrimary }]}>{name}</Text><Text style={[styles.status, { color: selected ? t.accent : t.textSecond }]}>{status}</Text></Pressable>;
}

const styles = StyleSheet.create({ card: { flex: 1, minHeight: 142, borderWidth: 2, borderRadius: 20, padding: 8 }, preview: { height: 72, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, monogram: { fontSize: 30, fontWeight: '900' }, name: { fontSize: 12, lineHeight: 15, fontWeight: '800', marginTop: 7 }, status: { fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 2 } });
