// ═════════════════════════════════════════════════════════════════════════
// SeasonNavTiles.tsx — три явные кнопки под обложкой хаба: «Все главы», «Все уроки», «Классический курс».
//
// зачем (владелец 22.10 через координатора, макет lesson-hub-final.html): веер «Вся глава» и чипы глав убраны; «максимально понятно, где кнопка „Классический курс“,
// где „Все уроки“, где „Все главы“». Три плитки одного стиля (высота 58, значок + подпись, заливка «контрол» темы, без обводок); видны на первом экране, не уходят под таббар.
// Цвета — только токены текущей темы (закон владельца 22.10); нажатие — V2Pressable (kit `.t`).
// ═════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import V2Pressable from '../../v2/V2Pressable';
import { useLv2Glass } from '../LearningV2Glass';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

export type SeasonNavTilesProps = Readonly<{
  allChaptersLabel: string;
  allLessonsLabel: string;
  classicLabel: string;
  onAllChapters: () => void;
  onAllLessons: () => void;
  onClassic: () => void;
}>;

function SeasonNavTiles(props: SeasonNavTilesProps) {
  return (
    <View style={styles.row} testID="season-nav-tiles">
      <Tile icon="list-outline" label={props.allChaptersLabel} onPress={props.onAllChapters} testID="season-all-chapters" />
      <Tile icon="layers-outline" label={props.allLessonsLabel} onPress={props.onAllLessons} testID="season-all-lessons-button" />
      <Tile icon="school-outline" label={props.classicLabel} onPress={props.onClassic} testID="season-classic-course" />
    </View>
  );
}

function Tile({ icon, label, onPress, testID }: Readonly<{ icon: IonName; label: string; onPress: () => void; testID: string }>) {
  const g = useLv2Glass();
  return (
    <V2Pressable
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      outerStyle={styles.outer}
      style={[styles.tile, { backgroundColor: g.opaqueControl }]}
    >
      <Ionicons name={icon} size={20} color={g.accentGraphic} />
      <Text style={[styles.label, { color: g.text }]}>{label}</Text>
    </V2Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  outer: { flex: 1 },
  tile: { minHeight: 58, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 13, lineHeight: 15, fontWeight: '700', textAlign: 'center' },
});

export default memo(SeasonNavTiles);
