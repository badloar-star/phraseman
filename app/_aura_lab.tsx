import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AuraRenderer } from '../components/avatar-aura/AuraRenderer';
import { AURA_LAB_PRESETS } from '../components/avatar-aura/presets';
import type { AuraLabId } from '../components/avatar-aura/types';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

export default function AuraLabScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<AuraLabId>(AURA_LAB_PRESETS[0].id);
  const [motion, setMotion] = useState<'ambient' | 'static'>('ambient');
  const selected = AURA_LAB_PRESETS.find((preset) => preset.id === selectedId) ?? AURA_LAB_PRESETS[0];
  const heroSize = Math.min(Math.max(width * 0.62, 232), 360);

  return <View style={styles.root}>
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Назад">
          <Ionicons name="chevron-back" color="#F3F0FF" size={22} />
        </Pressable>
        <View style={styles.devPill}><Text style={styles.devPillText}>DEV AURA LAB</Text></View>
        <View style={styles.backSpacer} />
      </View>
      <Text style={styles.eyebrow}>НАПРАВЛЕНИЯ АУРЫ</Text>
      <Text style={styles.title}>Выберите свет{`\n`}для профиля</Text>
      <Text style={styles.lede}>Пять нативных сцен: один будущий renderer, без картинок и без лишней нагрузки.</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroAura}><AuraRenderer preset={selected} size={heroSize} motion={motion}><AuraCenter size={Math.round(heroSize * 0.35)} label="PM" /></AuraRenderer></View>
        <Text style={styles.heroName}>{selected.nameRu}</Text>
        <Text style={styles.heroDescription}>{selected.descriptionRu}</Text>
      </View>

      <View style={styles.segmented} accessibilityRole="tablist">
        {(['ambient', 'static'] as const).map((option) => {
          const active = motion === option;
          return <Pressable key={option} onPress={() => setMotion(option)} style={[styles.segment, active && styles.segmentActive]} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={option === 'ambient' ? 'Мягкая анимация' : 'Статичный вид'}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option === 'ambient' ? 'Анимация' : 'Статика'}</Text>
          </Pressable>;
        })}
      </View>

      <Text style={styles.selectorLabel}>КОЛЛЕКЦИЯ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
        {AURA_LAB_PRESETS.map((preset) => {
          const active = preset.id === selected.id;
          return <Pressable key={preset.id} onPress={() => setSelectedId(preset.id)} style={[styles.selector, active && styles.selectorActive]} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={preset.nameRu}>
            <AuraRenderer preset={preset} size={76} detail="thumbnail" motion="static" ownerVisible={false}><AuraCenter size={28} label="P" compact /></AuraRenderer>
            <Text numberOfLines={2} style={[styles.selectorText, active && styles.selectorTextActive]}>{preset.nameRu}</Text>
          </Pressable>;
        })}
      </ScrollView>
    </ScrollView>
  </View>;
}

function AuraCenter({ size, label, compact = false }: { size: number; label: string; compact?: boolean }) {
  return <View style={[styles.auraCenter, { width: size, height: size, borderRadius: size / 2 }]}>
    {!compact && <Ionicons name="sparkles" color="#EFE9FF" size={Math.round(size * 0.29)} />}
    <Text style={[styles.auraCenterText, { fontSize: compact ? 11 : Math.round(size * 0.16) }]}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090A14' },
  content: { paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backSpacer: { width: 44 },
  devPill: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(183,156,255,0.14)', borderWidth: 1, borderColor: 'rgba(196,174,255,0.32)' },
  devPillText: { color: '#D9CBFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  eyebrow: { color: '#B9A5FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.35, marginTop: 28 },
  title: { color: '#F7F4FF', fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -0.8, marginTop: 8 },
  lede: { color: '#AAA7BA', fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 500 },
  heroCard: { marginTop: 24, minHeight: 430, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 30, backgroundColor: '#121021', borderWidth: 1, borderColor: 'rgba(212,196,255,0.16)' },
  heroAura: { height: 300, justifyContent: 'center', alignItems: 'center' },
  auraCenter: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#171325', borderWidth: 2, borderColor: 'rgba(255,255,255,0.38)', shadowColor: '#BDA7FF', shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  auraCenterText: { color: '#F7F4FF', fontWeight: '900', letterSpacing: 0.8 },
  heroName: { color: '#F7F4FF', fontSize: 22, fontWeight: '800', textAlign: 'center', paddingHorizontal: 24 },
  heroDescription: { color: '#B5B0C5', fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 28, marginTop: 8 },
  segmented: { flexDirection: 'row', alignSelf: 'center', marginTop: 18, padding: 4, borderRadius: 16, backgroundColor: '#161426' },
  segment: { minHeight: 44, minWidth: 122, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: '#EEE8FF' },
  segmentText: { color: '#B7B1C8', fontSize: 13, fontWeight: '800' },
  segmentTextActive: { color: '#1A1725' },
  selectorLabel: { color: '#8D889D', fontSize: 11, fontWeight: '800', letterSpacing: 1.25, marginTop: 28 },
  selectorRow: { gap: 12, paddingVertical: 14, paddingRight: 20 },
  selector: { width: 128, minHeight: 142, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, backgroundColor: '#12111E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  selectorActive: { backgroundColor: '#1B172B', borderColor: 'rgba(209,190,255,0.7)' },
  selectorText: { color: '#AAA5B6', fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8, marginTop: 2 },
  selectorTextActive: { color: '#F5F0FF' },
});
