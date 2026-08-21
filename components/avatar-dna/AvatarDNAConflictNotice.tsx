import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AvatarDNAConflictNotice as Notice } from '../../modules/avatar-dna/contracts';
import type { AvatarDNACopy } from '../../app/avatar_dna_copy';
import { useTheme } from '../ThemeContext';

export function AvatarDNAConflictNotice({ notice, copy, onUndo, onDismiss }: Readonly<{ notice: Notice | null; copy: AvatarDNACopy; onUndo: () => void; onDismiss: () => void }>) {
  const { theme: t } = useTheme(); if (!notice) return null;
  return <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: '#FFF0E6', borderColor: '#E8A47E' }]}><Text style={[styles.message, { color: t.textPrimary }]}>{copy.hoodNotice}</Text><Pressable accessibilityRole="button" onPress={onUndo} style={styles.action}><Text style={{ color: t.accent, fontWeight: '900' }}>{copy.noticeUndo}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={onDismiss} style={styles.dismiss}><Text style={{ color: t.textSecond }}>×</Text></Pressable></View>;
}
const styles = StyleSheet.create({ notice: { marginHorizontal: 16, marginTop: 12, minHeight: 58, borderWidth: 1, borderRadius: 16, padding: 12, paddingRight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 }, message: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' }, action: { minHeight: 44, justifyContent: 'center' }, dismiss: { position: 'absolute', right: 6, top: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
