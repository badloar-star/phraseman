// PeakTopSkeleton — каркас топ-5 на время загрузки комнаты: пять плашек высотой строки, один общий пульс (opacity), Reduce Motion — статично.
// зачем (координатор 05.11, аудит Пика B): при members === null панель была пустой; теперь первый кадр = финальная раскладка (те же 56 dp на строку), без новых View в самих строках.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonPulse } from '../../feedback/SkeletonPulse';
import { useSpirePalette } from '../useSpirePalette';
import { PEAK_TOP_COUNT } from '../../../modules/spire/peak_model';

export const PEAK_SKELETON_ROW_HEIGHT = 56;

function PeakTopSkeleton() {
  const p = useSpirePalette();
  return (
    <SkeletonPulse testID="peak-top-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: PEAK_TOP_COUNT }, (_, i) => <View key={i} /* guard-ok: статичные плашки скелета */ style={[s.row, { backgroundColor: p.cardRaised }]} />)}
    </SkeletonPulse>
  );
}

const s = StyleSheet.create({
  row: { height: PEAK_SKELETON_ROW_HEIGHT, borderRadius: 14, marginBottom: 4 },
});

export default memo(PeakTopSkeleton);
