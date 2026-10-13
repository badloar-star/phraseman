// зачем (координатор 14.10 → поправка 15.10 по приказу владельца 01.10): «⚡ N» в шапке Шпиля и ступени — ТОЛЬКО значок и число, без фона и тени, в одной высоте с
// пилюлей сердец (37). Сам счётчик — общий EnergyBar (его логика, всплывашка и анимации не тронуты); у Plus счётчика нет, поэтому и обёртки нет.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import EnergyBar from '../EnergyBar';
import { usePremium } from '../PremiumContext';
import { logSpireDock, roundLayout } from './spire_layout_log';

function SpireEnergyPill({ ownerActive }: Readonly<{ ownerActive: boolean }>) {
  const { hasPremiumAccess } = usePremium();
  logSpireDock('energy-pill', { shown: !hasPremiumAccess, reason: hasPremiumAccess ? 'Plus: счётчика энергии нет' : 'игрок без Plus', ownerActive });
  if (hasPremiumAccess) return null;
  return (
    <View
      testID="spire-energy-pill"
      style={s.pill}
      onLayout={(e) => logSpireDock('energy-pill.layout', { w: roundLayout(e.nativeEvent.layout.width), h: roundLayout(e.nativeEvent.layout.height), x: roundLayout(e.nativeEvent.layout.x) })}
    >
      {/* зачем (приказ владельца 01.10, координатор 13.10): капсулу стеклянной шапки (7b252fa06) в Шпиле не рисуем — только значок и число. */}
      <EnergyBar ownerActive={ownerActive} glass noCapsule />
    </View>
  );
}

const s = StyleSheet.create({
  // Высота как у пилюли сердец; счётчик EnergyBar выше (зона касания 44) — центрируется и выступает поровну, раскладку не двигает.
  // зачем (приказ владельца 01.10, подтверждён координатором 15.10): энергия в шапке — только значок и число, БЕЗ фона и тени. Обёртка нужна лишь для высоты 37 как у сердец.
  pill: { height: 37, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});

export default memo(SpireEnergyPill);
