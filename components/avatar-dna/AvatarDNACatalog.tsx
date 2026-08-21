import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { avatarCatalog } from '../../modules/avatar-dna/catalog';
import type { AvatarCategory, AvatarDNA, AvatarItemManifest } from '../../modules/avatar-dna/contracts';
import type { AvatarDNACopy } from '../../app/avatar_dna_copy';
import { AvatarDNAItemCard } from './AvatarDNAItemCard';
import { useTheme } from '../ThemeContext';

const isSelected = (dna: AvatarDNA, id: string): boolean => JSON.stringify(dna).includes(`"${id}"`);

export function AvatarDNACatalog({ category, dna, copy, reduceMotion, onSelect }: Readonly<{ category: AvatarCategory; dna: AvatarDNA; copy: AvatarDNACopy; reduceMotion: boolean; onSelect: (item: AvatarItemManifest) => void }>) {
  const { theme: t } = useTheme();
  const data = avatarCatalog.items.filter((item) => item.category === category);
  return <View style={styles.wrap}><Text style={[styles.heading, { color: t.textPrimary }]}>{copy.variants}</Text><FlatList data={data} keyExtractor={(item) => item.id} numColumns={3} scrollEnabled={false} columnWrapperStyle={styles.row} renderItem={({ item }) => <View style={styles.cell}><AvatarDNAItemCard item={item} selected={isSelected(dna, item.id)} copy={copy} reduceMotion={reduceMotion} onPress={onSelect} /></View>} /></View>;
}

const styles = StyleSheet.create({ wrap: { paddingHorizontal: 16, paddingTop: 16 }, heading: { fontSize: 18, fontWeight: '900', marginBottom: 10 }, row: { gap: 10, marginBottom: 10 }, cell: { flex: 1, maxWidth: '32%' } });
