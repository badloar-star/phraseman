// зачем (поправка приоритета координатора 14.10, снимки Макетов spire-004/007/008/011/013/014/017: «⚡ N» в шапке стоял без пилюли, в шапке ступени его не было в превью):
// энергия в шапке Шпиля — пилюля с фоном и малой тенью, в одной высоте с пилюлей сердец (37). Сам счётчик — общий EnergyBar (его логика, всплывашка и анимации не тронуты);
// у Plus счётчика нет, поэтому и пилюли нет.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import EnergyBar from '../EnergyBar';
import { usePremium } from '../PremiumContext';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';

function SpireEnergyPill({ ownerActive }: Readonly<{ ownerActive: boolean }>) {
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const { hasPremiumAccess } = usePremium();
  if (hasPremiumAccess) return null;
  return (
    <View testID="spire-energy-pill" style={[s.pill, { backgroundColor: p.control }, sh.nested]}>
      <EnergyBar ownerActive={ownerActive} glass />
    </View>
  );
}

const s = StyleSheet.create({
  // Высота как у пилюли сердец; счётчик EnergyBar выше (зона касания 44) — центрируется и выступает поровну, раскладку не двигает.
  pill: { height: 37, borderRadius: 19, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});

export default memo(SpireEnergyPill);
