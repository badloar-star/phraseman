// ═══════════════════════════════════════════════════════════════════════════
// HomeSceneEnergy.tsx — энергия в плашке монет на «Сцене» Главной: значок молнии и число, у Plus — ∞.
//
// зачем (эталон home-new-concepts.html, раздел A: «монеты | ⚡ энергия» в одной плашке): контекст энергии меняется раз в секунду,
// пока идёт восстановление, — подписан только этот крошечный компонент, а вид запомнен по числу: шапка и Главная от тиков
// не перерисовываются. Пока энергия не прочитана — «—», чтобы не показать выдуманную полную шкалу.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useEnergy } from '../../../EnergyContext';

export default function HomeSceneEnergy() {
  const { energy, isUnlimited, energyReady } = useEnergy();
  const value = isUnlimited ? '∞' : energyReady ? String(Math.max(0, energy)) : '—';
  return <HomeSceneEnergyView value={value} zero={!isUnlimited && energyReady && energy <= 0} />;
}

// зачем (координатор 22.10): dev-вход /dev_home_scene_preview рисует ту же энергию числом из моков, без подписки на настоящую
export const HomeSceneEnergyView = memo(function HomeSceneEnergyView({ value, zero }: Readonly<{ value: string; zero: boolean }>) {
  // зачем (эталон .glass .hm-emb): ноль энергии — тёплый тон, чтобы было видно без слов
  const color = zero ? '#FFB4A3' : '#FFFFFF';
  return (
    <View style={s.row} accessible accessibilityLabel={`⚡ ${value}`}>
      <Ionicons name="flash" size={16} color={color} />
      <Text maxFontSizeMultiplier={1.1} style={[s.value, { color }]}>{value}</Text>
    </View>
  );
});

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
