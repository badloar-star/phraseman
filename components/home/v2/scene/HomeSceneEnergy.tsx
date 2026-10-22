// ═══════════════════════════════════════════════════════════════════════════
// HomeSceneEnergy.tsx — энергия в плашке монет на «Сцене» Главной: значок молнии и число, у Plus — ∞.
//
// зачем (эталон home-new-concepts.html, раздел A: «монеты | ⚡ энергия» в одной плашке): контекст энергии меняется раз в секунду,
// пока идёт восстановление, — подписан только этот крошечный компонент, а вид запомнен по числу: шапка и Главная от тиков
// не перерисовываются. Пока энергия не прочитана — «—», чтобы не показать выдуманную полную шкалу.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { peekEnergy } from '../../../../app/energy_peek_cache';
import { useEnergy } from '../../../EnergyContext';

export default function HomeSceneEnergy() {
  const { energy, isUnlimited, energyReady } = useEnergy();
  const value = isUnlimited ? '∞' : energyReady ? String(Math.max(0, energy)) : '—';
  // зачем (координатор 22.10, Сверка «чип энергии на старте "—"», «сперва логи»): на каждую смену показанного
  // значения — что показали, почему «—» и был ли в этот момент заряд в быстром кэше. Тики таймера сюда не попадают.
  const mountedAtRef = useRef(Date.now());
  useEffect(() => {
    const peek = peekEnergy();
    console.warn('[ENERGY-CHIP] shown', JSON.stringify({ // guard-ok: только на смену показанного значения
      value,
      why: isUnlimited ? 'unlimited' : energyReady ? 'provider_ready' : 'provider_not_ready',
      providerEnergy: energy,
      peek: peek ? peek.energy : null,
      msSinceMount: Date.now() - mountedAtRef.current,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- лог по смене показанного значения, а не энергии
  }, [value]);
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
