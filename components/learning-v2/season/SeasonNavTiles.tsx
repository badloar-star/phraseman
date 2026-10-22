// ═════════════════════════════════════════════════════════════════════════
// SeasonNavTiles.tsx — три явные кнопки под обложкой хаба: «Все главы», «Все уроки», «Классический курс».
//
// зачем (владелец 22.10 через координатора, макет lesson-hub-final.html): веер «Вся глава» и чипы глав убраны; «максимально понятно, где кнопка „Классический курс“,
// где „Все уроки“, где „Все главы“». Три плитки одного стиля (высота 58, значок + подпись, заливка «контрол» темы, без обводок); видны на первом экране, не уходят под таббар.
// Цвета — только токены текущей темы (закон владельца 22.10); нажатие — V2Pressable (kit `.t`).
// 22.10 (владелец: «Показать в плитке»): на плитке «Классический курс» — прогресс классики одной строкой-значением («12 из 50») справа от значка в верхней строке; высота плитки 58 не меняется, шрифт не ужимается.
// ═════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import V2Pressable from '../../v2/V2Pressable';
import { useLv2Glass } from '../LearningV2Glass';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

export type SeasonNavTilesProps = Readonly<{
  allChaptersLabel: string;
  /** Нет ни одной главы (колода пуста): плитка «Все главы» приглушена и не нажимается. */
  allChaptersDisabled?: boolean;
  allLessonsLabel: string;
  classicLabel: string;
  /** Прогресс классического курса готовой строкой («12 из 50»); null — классику не начинали, значения нет. */
  classicValue?: string | null;
  onAllChapters: () => void;
  onAllLessons: () => void;
  onClassic: () => void;
}>;

function SeasonNavTiles(props: SeasonNavTilesProps) {
  return (
    <View style={styles.row} testID="season-nav-tiles">
      <Tile icon="list-outline" label={props.allChaptersLabel} disabled={props.allChaptersDisabled === true} onPress={props.onAllChapters} testID="season-all-chapters" />
      <Tile icon="layers-outline" label={props.allLessonsLabel} onPress={props.onAllLessons} testID="season-all-lessons-button" />
      <Tile icon="school-outline" label={props.classicLabel} value={props.classicValue ?? null} onPress={props.onClassic} testID="season-classic-course" />
    </View>
  );
}

function Tile({ icon, label, value, disabled, onPress, testID }: Readonly<{ icon: IonName; label: string; value?: string | null; disabled?: boolean; onPress: () => void; testID: string }>) {
  const g = useLv2Glass();
  return (
    <V2Pressable
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      outerStyle={styles.outer}
      disabled={disabled}
      style={[styles.tile, { backgroundColor: g.opaqueControl }, disabled ? styles.tileOff : null]}
    >
      <View style={styles.top}>
        <Ionicons name={icon} size={20} color={g.accentGraphic} />
        {value ? <Text testID={`${testID}-value`} style={[styles.value, { color: g.text }]} numberOfLines={1}>{value}</Text> : null}
      </View>
      <Text style={[styles.label, { color: g.text }]} numberOfLines={2}>{label}</Text>
    </V2Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  outer: { flex: 1 },
  // зачем: высота плитки строго 58 (макет): значок 20 + 4 + две строки подписи по 15 = 54; значение — в той же строке, что значок, рост плитки исключён
  tile: { height: 58, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tileOff: { opacity: 0.45 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 20 },
  value: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontSize: 13, lineHeight: 15, fontWeight: '700', textAlign: 'center' },
});

export default memo(SeasonNavTiles);
