import React, { type ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { avatarCatalog } from '../../modules/avatar-dna/catalog';
import type { AvatarCategory, AvatarDNA, AvatarItemManifest } from '../../modules/avatar-dna/contracts';
import type { AvatarDNACopy } from '../../app/avatar_dna_copy';
import { AvatarDNAItemCard } from './AvatarDNAItemCard';
import { useTheme } from '../ThemeContext';

const isSelected = (dna: AvatarDNA, id: string): boolean => JSON.stringify(dna).includes(`"${id}"`);

export function AvatarDNACatalog({ category, dna, copy, reduceMotion, header, onSelect }: Readonly<{ category: AvatarCategory; dna: AvatarDNA; copy: AvatarDNACopy; reduceMotion: boolean; header?: ReactNode; onSelect: (item: AvatarItemManifest) => void }>) {
  const { theme: t } = useTheme();
  const data = avatarCatalog.items.filter((item) => item.category === category);
  return <FlatList style={styles.list} contentContainerStyle={styles.content} data={data} keyExtractor={(item) => item.id} numColumns={3} showsVerticalScrollIndicator={false} ListHeaderComponent={<>{header}<Text style={[styles.heading, { color: t.textPrimary }]}>{copy.variants}</Text></>} columnWrapperStyle={styles.row} renderItem={({ item }) => <View style={styles.cell}><AvatarDNAItemCard item={item} selected={isSelected(dna, item.id)} copy={copy} reduceMotion={reduceMotion} onPress={onSelect} /></View>} />;
}

const styles = StyleSheet.create({ list: { flex: 1 }, content: { paddingBottom: 116 }, heading: { fontSize: 18, fontWeight: '900', marginTop: 16, marginBottom: 10, marginHorizontal: 16 }, row: { gap: 10, marginBottom: 10, paddingHorizontal: 16 }, cell: { flex: 1, maxWidth: '32%' } });
