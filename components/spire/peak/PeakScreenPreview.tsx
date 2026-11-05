// PeakScreenPreview — DEV-кадры экрана Пика, вариант B, на моках (?state=peak_screen[&mode=steps] в dev_spire_preview). В бою не монтируется.
// зачем (координатор 04.11): Сверка снимает «до/после» без живой комнаты и без флага; режимы монеты/ступени — тот же компонент, что в бою.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import type { SpireMemberRow } from '../spire_room_types';
import PeakScreenV2 from './PeakScreenV2';

const NAMES = ['Anna', 'Max', 'Léa', 'Tomás', 'Mia', 'Ivan', 'Sofia', 'Noah', 'Zoe', 'Liam', 'Eva', 'Leo'];
const MEMBERS: readonly SpireMemberRow[] = NAMES.map((name, i) => ({
  uid: 'p' + i, name, steps: i === 8 ? 135 : 120 - i * 7, isMe: i === 6, weekCoins: (NAMES.length - i) * 130, coinRank: i % 20,
}));

// зачем (тур Пика, координатор 04.11): tourPage 0…2 — сразу показать тур с этой страницы (для Сверки); без него тура в превью нет, флаг «показан» не трогаем
export default function PeakScreenPreview({ lang, rankBy, tourPage }: Readonly<{ lang: Lang; rankBy: 'steps' | 'coins'; tourPage?: number }>) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const [floor, setFloor] = useState(7);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: p.bg }]} testID="peak-screen-preview">
      <ScrollView decelerationRate="fast" contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 80 }}>
        <PeakScreenV2
          lang={lang}
          members={MEMBERS}
          rankBy={rankBy}
          floor={floor}
          onSelectFloor={setFloor}
          pillText="Granite · 3d 4h"
          towerProps={{ myFloor: 7, myCoinRank: 6, tier: 3 }}
          onOpenAll={() => undefined}
          records={{ '7:2': { uid: 'p1', name: 'Max', durationMs: 18_340 } }}
          tour={tourPage === undefined ? 'off' : { page: tourPage }}
        />
      </ScrollView>
    </View>
  );
}
