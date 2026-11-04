// PeakKitPreview — DEV-витрина каркаса экрана Пика (?state=peak_kit в dev_spire_preview). В бою не монтируется.
// зачем (координатор 04.11): пока владелец выбирает вариант A/B, показать общие под-компоненты на моках; сборка выбранного экрана — из этих же деталей.
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { buildPeakModel, peakStepRecord } from '../../../modules/spire/peak_model';
import type { SpireRoomRow } from '../../../modules/spire/room_rows';
import { useSpirePalette } from '../useSpirePalette';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import PeakMyCounter from './PeakMyCounter';
import PeakTopRow from './PeakTopRow';
import PeakAllList from './PeakAllList';
import PeakFloorStepper from './PeakFloorStepper';
import PeakStepSheet from './PeakStepSheet';

const NAMES = ['Anna', 'Max', 'Léa', 'Tomás', 'Mia', 'Ivan', 'Sofia', 'Noah', 'Zoe', 'Liam', 'Eva', 'Leo'];
const ROWS: readonly SpireRoomRow[] = NAMES.map((name, i) => ({
  uid: 'p' + i, name, steps: i === 8 ? 135 : 120 - i * 7, reachedAtMs: 1, isMe: i === 6, weekCoins: (NAMES.length - i) * 130, coinRank: i % 20,
}));
const RECORDS = { '3:2': { uid: 'p1', name: 'Max', durationMs: 18_340 } } as const;

export default function PeakKitPreview({ lang }: Readonly<{ lang: Lang }>) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const model = useMemo(() => buildPeakModel(ROWS), []);
  const [floor, setFloor] = useState(3);
  const [open, setOpen] = useState(false);
  const record = peakStepRecord(RECORDS, floor, 2);
  const stepper = (
    <PeakFloorStepper label={`${floor}`} canDown={floor > 1} canUp={floor < 15} onDown={() => setFloor((f) => Math.max(1, f - 1))} onUp={() => setFloor((f) => Math.min(15, f + 1))} downLabel="-" upLabel="+" />
  );
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: p.bg }]} testID="peak-kit-preview">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 60, gap: 16 }}>
        <PeakMyCounter lang={lang} me={model.me} />
        <View>{model.top.map((row) => <PeakTopRow key={row.uid} lang={lang} row={row} onPress={() => setOpen(true)} />)}</View>
        <PeakAllList lang={lang} rows={model.all} />
        <Text style={{ color: p.textSecondary, fontSize: 15 }}>{`summiters: ${model.summiters.length}`}</Text>
      </ScrollView>
      <PeakStepSheet lang={lang} visible={open} title={`${floor}:2`} record={record} onClose={() => setOpen(false)} stepper={stepper} />
    </View>
  );
}
